"""Lo que dice el coach cuando hay nota: no plantilla, razonamiento.

El corredor escribe en la app («no dormí bien, me desperté temprano, pero corrí
tranquilo»). Un coach de verdad contesta tres cosas, en este orden:

  1. qué de eso explica lo que salió en la sesión (o qué no explica nada),
  2. qué significa para el entrenamiento que viene,
  3. qué hacer, concreto.

Se le pasa al modelo la nota y los números de las sesiones cercanas, y se le
prohibe inventar cifras. Lo que regresa se filtra: números que no estén en los
datos, promesas de tiempo y frases de relleno se tiran; si no queda nada, no hay
lectura y la tarjeta sigue con la del cálculo.

Sin llave de modelo, esto simplemente no corre: la app se queda con el análisis
de siempre. Nunca se rompe el análisis por falta de cuota.
"""
import json
from datetime import date
import os
import re
import time
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# El .env de Hermes vive en %LOCALAPPDATA%\hermes; el repo no guarda llaves.
ORDEN = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"),
                     "hermes", ".env")
CACHE = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "cache", "maraton")

# El modelo que contesta; se puede cambiar sin tocar código.
try:
    from analizar import INICIO, parse_fecha, semana_de
except Exception:      # corrido desde tools/
    from .analizar import INICIO, parse_fecha, semana_de

MODELO = os.environ.get("MARATON_COACH_MODELO") or "deepseek-chat"
URL = os.environ.get("MARATON_COACH_URL") or "https://api.deepseek.com/v1/chat/completions"
ESPERA = 25          # s; si tarda más, la app se queda con el análisis de cálculo
TOPE = 3             # frases: más que eso el corredor no lo lee

REGLAS = """
Eres coach de corredores con 25 años de experiencia: trail de montaña y asfalto, desde quien
empieza hasta quien busca marca. Sabes de fisiología del esfuerzo, de zonas y pulso, de
nutrición e hidratación en carrera, de sueño y recuperación, de fuerza complementaria y de
las lesiones típicas del corredor (rodilla, fascia, tendón de Aquiles, tibial). Das
indicaciones como las daría un entrenador de verdad en la pista: por qué las cosas pasan y
qué se hace con eso.

Le hablas de tú, en español de México, sin adornos. Nada de «como modelo de lenguaje»:
aquí eres su coach. La persona puede ser nueva o llevar años: no supongas nivel, míralo en
los datos que trae.
Te doy lo que escribió hoy y lo que marcó el reloj en sus últimas sesiones.

Tu trabajo NO es repetir lo que ya ve en la app ni copiar su nota. Es razonar como coach:
1) Toma lo que escribió (sueño, molestia, clima, agenda, ánimo) y di qué parte de lo que
   salió en la sesión explica eso, y qué parte no explica nada. Si dice «no me sentí
   fatigado», dilo: entonces la nota pesa para la recuperación, no para esa corrida.
2) Di qué significa para lo que viene (la siguiente calidad, la larga, la semana).
3) Cierra con qué hacer, concreto y en una frase, como lo diría en la pista.

Cuando venga al caso, explica el mecanismo con lo que sabes de fisiología o de nutrición
(por qué el pulso sube con la deuda de sueño, por qué la larga en el techo de Z2 quema
glucógeno, por qué conviene comer antes de los 90 minutos), pero sólo si eso ayuda a
entender su caso. Nunca sueltes teoría general que no venga de sus datos.

Prohibido: inventar números que no estén en los datos; prometer tiempos o posiciones;
frases de relleno («es importante», «recuerda que», «escucha a tu cuerpo»); regañar;
pedirle que consulte a un médico si no hay molestia. Máximo %d frases. Cada frase en una
línea, sin viñetas ni numeración. Si los datos no alcanzan para algo, cállate eso.

Empieza por lo que la nota NO explica si no explica nada; el corredor ya sabe lo que
escribió. Escribe el mecanismo en presente y aplicado a SUS números, no en abstracto.

La ÚLTIMA línea es la orden: un verbo en imperativo con lo que tiene que hacer y cuándo
(«Baja la próxima larga a 9:30/km y duerme dos noches seguidas antes de la calidad»).
Sin la orden la frase no sirve. Exactamente %d frases, y la de la orden es la %dª.

Datos:
""" % (TOPE, TOPE, TOPE)


def llave():
    for nombre in ("MARATON_COACH_LLAVE", "DEEPSEEK_API_KEY"):
        v = os.environ.get(nombre)
        if v:
            return v.strip()
    try:
        with open(ORDEN, encoding="utf-8") as f:
            for linea in f:
                if linea.startswith("DEEPSEEK_API_KEY"):
                    return linea.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return None


def _numeros(texto):
    """Cifras que el texto menciona, para comprobar que salieron de los datos."""
    return set(re.findall(r"\d+(?:[.,]\d+)?", texto))


def _limpia(frase):
    f = re.sub(r"^\s*[-*•\d.)]+\s*", "", frase.strip())
    f = f.replace("**", "").strip()
    return f


def permitido(frases, datos):
    """Tira lo que no se puede sostener: cifras ajenas, promesas, relleno."""
    buenas, vistas = [], set()
    cifras = _numeros(json.dumps(datos, ensure_ascii=False, default=str))
    for f in frases:
        f = _limpia(f)
        if len(f) < 25 or f.lower() in vistas:
            continue
        vistas.add(f.lower())
        if re.search(r"\b(vas a (bajar|ganar|romper)|tiempo de \d|podio|próximo récord)\b", f, re.I):
            continue          # promesas que nadie puede sostener
        if re.search(r"\b(es importante|recuerda que|escucha a tu cuerpo|la constancia es)\b", f, re.I):
            continue          # relleno
        # Toda cifra tiene que venir de los datos (o ser 1-2, de uso común: 2 noches, 1 km).
        # Un rango se escribe con guion y cada extremo se revisa por separado.
        fuera = [n for n in _numeros(f) if n not in cifras and float(n.replace(",", ".")) > 2]
        if fuera:
            continue
        buenas.append(f)
    return buenas[:TOPE]


def _recorte(datos, hoy=None):
    """Lo que el modelo ve: ni nombre ni historial completo."""
    ses = []
    if not isinstance(datos, dict):
        datos = {}
    for s in (datos.get("hecho") or datos.get("registro") or datos.get("sesiones") or [])[-6:]:
        if not isinstance(s, dict):
            continue
        fc = s.get("fc") if isinstance(s.get("fc"), dict) else {}
        ses.append({"fecha": s.get("fecha"), "tipo": s.get("tipo"), "km": s.get("km"),
                    "min": s.get("min") or s.get("minutos"),
                    "fc_media": s.get("fc_media") or fc.get("prom") or fc.get("avg"),
                    "fc_max": s.get("fc_max") or fc.get("max"),
                    "molestia": s.get("molestia")})
    notas = []
    for n in (datos.get("notas") or [])[-4:]:
        if isinstance(n, dict) and n.get("texto"):
            notas.append({"fecha": n.get("fecha"), "tipo": n.get("tipo"), "texto": n.get("texto")})
    return {"sesiones": ses, "notas": notas, "semana": datos.get("semana"),
            "plan_semana": (datos.get("plan") or {}).get("km"),
            "larga": (datos.get("plan") or {}).get("larga"),
            "fcmax": datos.get("fcmax"), "techo_z2": datos.get("techo_z2"),
            "siguiente": datos.get("siguiente")}


def pide(prompt):
    k = llave()
    if not k:
        return None
    cuerpo = {"model": MODELO, "temperature": 0.4, "max_tokens": 400,
              "messages": [{"role": "user", "content": prompt}]}
    req = urllib.request.Request(URL, data=json.dumps(cuerpo).encode("utf-8"),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + k})
    try:
        with urllib.request.urlopen(req, timeout=ESPERA) as r:
            j = json.loads(r.read().decode("utf-8"))
        return (j["choices"][0]["message"]["content"] or "").strip() or None
    except (urllib.error.HTTPError, urllib.error.URLError, KeyError, ValueError, TimeoutError,
            OSError) as fallo:
        print("coach sin modelo:", type(fallo).__name__, flush=True)
        return None


def coach(datos, ahora=None):
    """Devuelve (lectura, toca). Vacío si no hay nota o no hay con qué contestar."""
    if not (datos.get("notas") or []):
        return [], ""
    if not isinstance(datos, dict):
        return [], ""
    datos = _recorte(datos)
    if not datos["notas"]:
        return [], ""
    txt = pide(REGLAS + json.dumps(datos, ensure_ascii=False, default=str))
    if not txt:
        return [], ""
    lineas = [l for l in txt.splitlines() if l.strip()]
    frases = permitido(lineas, datos)
    if not frases:
        return [], ""
    # La acción es la frase que manda hacer algo; las demás son lectura. El verbo va conjugado
    # o en imperativo: «dormiste mal» no es una orden.
    ACCION = re.compile(r"(duerme|duermas|duerman|corre|corras|corran|cambia|cambies|baja|bajes|"
                        r"recorta|recortes|descansa|descansen|come|comas|bebe|bebas|arranca|arranques|"
                        r"cuida|cuides|evita|evites|mant[eé]n|mantengas|empieza|empieces|prueba|"
                        r"revisa|deja|dejes|haz|sube|subas|controla|sost[eé]n)", re.I)
    # El consejo va al final: si la última frase manda algo, ésa es la acción; si no, la
    # penúltima. No se paga una segunda llamada al modelo por una frase de orden.
    toca, lectura = "", list(frases)
    for k in range(len(lectura) - 1, -1, -1):
        if ACCION.search(lectura[k]):
            toca = lectura.pop(k)
            break
    return lectura[:TOPE - 1] if toca else lectura[:TOPE], toca


REGLAS_SEMANA = """
Eres coach de corredores con 25 años de experiencia: trail de montaña y asfalto, fisiología
del esfuerzo, zonas y pulso, nutrición e hidratación, sueño y recuperación, fuerza
complementaria y lesiones típicas del corredor. Le hablas de tú, en español de México.

Cierra la semana con el corredor: ya corrieron lo que corrieron y ahora toca decidir si la
semana que viene se toca o no. Te doy el plan de la semana (km y larga), lo que de verdad
hizo (km, sesiones, pulso medio y máximo, molestias) y lo que escribió en sus notas.

Contesta exactamente así, cuatro líneas, cada una empezando con el rótulo:

SEMANA: si la semana se cumplió o no, con los km reales contra los del plan.
PULSO: qué dice el pulso de la semana (si la calidad o la larga se le fueron de zona, si el
  pulso subió para el mismo ritmo) y si eso fue carga o fue cansancio. Si faltan números,
  dilo en vez de suponer.
AJUSTE: qué se cambia la semana que viene y por qué. Puede ser «nada» si la semana salió
  bien: es una respuesta válida y muchas veces la correcta.
ORDEN: una frase en imperativo con lo que tiene que hacer en las próximas sesiones.

Reglas que no puedes romper: no subir el volumen más del 20 % de una semana a otra; si la
semana pasó del 90 % del pulso máximo, la siguiente no sube; con molestia, se iguala o se
baja y no se busca calidad; nunca pasar el tope de la larga; la semana de la carrera no se
toca. No reescribas el plan entero ni cambies fechas. No inventes números que no estén en
los datos. Nada de «es importante», «recuerda que» ni sermones.

Datos:
"""


def _semana(datos, hoy=None):
    """Lo que ve el modelo para cerrar la semana: la semana, lo hecho y las notas."""
    hoy = hoy or date.today()
    semanas = {s.get("n"): s for s in (datos.get("semanas") or []) if isinstance(s, dict)}
    ini = parse_fecha(datos.get("inicio")) or INICIO
    tope = max(semanas) if semanas else 21
    n = semana_de(hoy, ini, tope)
    sem = semanas.get(n) or {}
    filas = [r for r in (datos.get("registro") or []) if isinstance(r, dict)
             and parse_fecha(r.get("fecha")) and semana_de(parse_fecha(r["fecha"]), ini, tope) == n]
    hecho = []
    for r in filas:
        fc = r.get("fc") if isinstance(r.get("fc"), dict) else {}
        hecho.append({"fecha": r.get("fecha"), "tipo": r.get("tipo"), "km": r.get("km"),
                      "min": r.get("min") or r.get("minutos"),
                      "fc_media": r.get("fc_media") or fc.get("prom") or fc.get("avg"),
                      "fc_max": r.get("fc_max") or fc.get("max"),
                      "molestia": r.get("molestia")})
    nxt = semanas.get(n + 1) or {}
    return {"semana": n, "fechas": sem.get("fechas"),
            "plan": {"km": sem.get("km"), "larga": sem.get("larga"),
                     "calidades": sem.get("calidades") or sem.get("calidad")},
            "hecho": hecho,
            "km_real": round(sum(float(r.get("km") or 0) for r in hecho), 1),
            "siguiente_semana": {"km": nxt.get("km"), "larga": nxt.get("larga")},
            "fcmax": datos.get("fcmax"), "techo_z2": datos.get("techo_z2"),
            "notas": [{"fecha": x.get("fecha"), "texto": x.get("texto")}
                      for x in (datos.get("notas") or [])[-4:] if isinstance(x, dict) and x.get("texto")]}


def cierra_semana(datos, hoy=None):
    """Cierre de semana: (lectura, toca). Vacío si no hay con qué contestar."""
    if not isinstance(datos, dict) or not datos.get("registro"):
        return [], ""
    rec = _semana(datos, hoy)
    if not rec["hecho"]:
        return [], ""
    txt = pide(REGLAS_SEMANA + json.dumps(rec, ensure_ascii=False, default=str))
    if not txt:
        return [], ""
    dichos, orden = [], ""
    for linea in txt.splitlines():
        linea = linea.strip()
        if not linea:
            continue
        m = re.match(r"(SEMANA|PULSO|AJUSTE|ORDEN)\s*:\s*(.+)", linea, re.I)
        etiqueta, cuerpo = (m.group(1).upper(), m.group(2)) if m else ("", linea)
        ok = permitido([cuerpo], rec)
        if not ok:
            continue
        if etiqueta == "ORDEN":
            orden = ok[0]
        else:
            dichos.append(ok[0])
    return dichos[:3], orden


if __name__ == "__main__":
    import sys
    with open(sys.argv[1], encoding="utf-8") as f:
        d = json.load(f)
    lec, toc = coach(d)
    for x in lec:
        print("•", x)
    print("TOCA:", toc)
    print("t:", round(time.time()))
