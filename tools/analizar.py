"""Analiza los entrenamientos reales contra el plan y propone el ajuste de la semana.

Entrada: el JSON que exporta la app (Agente -> Exportar), completo o de un atleta.
  python analizar.py <export.json> [--atleta jonah] [--aplicar]

Sin --aplicar solo informa (reporte en pantalla + tools/ultimo_analisis.md).
Con --aplicar escribe el cambio en la tabla del vault y regenera la app.

Reglas (conservadoras a proposito: hay ciatica, tobillo y rodilla en el historial):
  cumplio >=95% y sin molestias      -> la siguiente sigue como esta
  cumplio 70-95%                     -> la siguiente repite el km, no sube
  <70% o falto la larga              -> la siguiente baja 10% y sin calidad nueva
  excede 115% del plan               -> la siguiente no sube y se recorta 10%
  molestia seria o dolor que irradia -> congela: sin subir volumen, a valoracion
  FC media de las faciles sobre Z2   -> no sube volumen aunque haya cumplido
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP / "tools"))

INICIO = date(2026, 11, 9)
VAULT = Path(r"C:\Users\chris\Documents\Obsidian\Jonah\02 - Proyectos")
NOTAS = {"jonah": VAULT / "Maraton - plan 21 semanas.md",
         "yuli": VAULT / "Maraton - plan de Yuli.md"}
# Techo de Z2 segun la nota de zonas (Karvonen con la FC de reposo vigente).
# jonah: 47 de reposo y 178 de max -> Z2 132-145. yuli: Z2 118-136.
# Si cambia la FC de reposo hay que recalcular las dos, no ajustar a ojo.
TECHOS = {"jonah": 145, "yuli": 136}
DURAS = {"calidad", "larga", "carrera"}
PALABRA_RIESGO = ("irradia", "hacia la pierna", "hormigueo", "adormec", "punzada",
                  "no puedo apoyar", "hinchado", "clavada")


def semana_de(f, ini=None, tope=21):
    """Semana del plan a la que cae una fecha. El inicio y el tope salen del plan exportado:
    si la carrera se movio, el plan puede tener mas de 21 semanas."""
    ini = ini or INICIO
    return max(1, min(tope, (f - ini).days // 7 + 1))


def parse_fecha(s):
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def ritmo(min_, km):
    if km and min_:
        s = min_ * 60 / km
        return f"{int(s // 60)}:{int(s % 60):02d}"
    return "—"


def carga_export(ruta):
    d = json.loads(Path(ruta).read_text(encoding="utf-8-sig"))
    if "atletas" in d:                       # paquete completo
        # las notas del corredor viajan pegadas a su plan: el analisis las tiene que leer
        notas = d.get("notas") or {}
        return ({k: {**v, "notas": notas.get(k) or []} for k, v in d["atletas"].items()},
                d.get("registro", {}))
    if "atleta" in d:                        # export de un atleta
        aid = d["atleta"].get("id")
        return ({aid: {**d["atleta"], "semanas": d.get("semanas", []),
                       "notas": d["notas"] if isinstance(d.get("notas"), list) else []}},
                {aid: d.get("registro", [])})
    raise SystemExit("no reconozco el JSON: falta 'atletas' o 'atleta'")


def analiza(aid, plan, registro, hoy, forzar_semana=None):
    semanas = {s["n"]: s for s in plan.get("semanas", [])}
    # FC maxima: la del perfil del atleta. Sin ella las frases de pulso se callan en vez de suponer.
    try:
        fcmax = float(plan.get("fcmax") or 0) or None
    except (TypeError, ValueError):
        fcmax = None
    tope = max(semanas) if semanas else 21
    try:
        ini = date.fromisoformat(str(plan.get("inicio") or ""))
    except ValueError:
        ini = INICIO
    sem_de = lambda f: semana_de(f, ini, tope)
    n = forzar_semana or sem_de(hoy)
    sem = semanas.get(n, {})
    filas = []
    for r in registro:
        f = parse_fecha(r.get("fecha", ""))
        if not f:
            continue
        filas.append({**r, "_f": f, "_sem": sem_de(f)})
    filas.sort(key=lambda r: r["_f"])

    esta = [r for r in filas if r["_sem"] == n]
    prev = [r for r in filas if r["_sem"] == n - 1]
    km = round(sum(float(r.get("km") or 0) for r in esta), 1)
    km_prev = round(sum(float(r.get("km") or 0) for r in prev), 1)
    plan_km = float(sem.get("km") or 0) or None
    pct = round(km / plan_km * 100) if plan_km else None
    # Una sesion cuenta para su tipo solo si el ritmo es creible: 4 km en 44 min a FC 90
    # es una caminata, aunque venga marcada como "calidad".
    LIM = {"calidad": 8.5, "facil": 9.5, "larga": 10.5}      # min/km maximos

    def ritmo_min(r):
        k = float(r.get("km") or 0)
        return float(r.get("min") or 0) / k if k else None

    # Caminar tambien cubre el dia: el plan mismo manda caminar cuando no se puede correr.
    # Por eso la sesion cuenta para su tipo y solo se deja dicho que no dio el estimulo.
    dudosas = [r for r in esta
               if LIM.get(r.get("tipo")) and ritmo_min(r) and ritmo_min(r) > LIM[r.get("tipo")]]
    tipos = {r.get("tipo") for r in esta}
    faltan = [t for t in ("calidad", "larga") if t not in tipos]
    techo = TECHOS.get(aid, 140)

    faciles = [r for r in esta if r.get("tipo") == "facil" and r.get("fc_media")]

    # Con calor el pulso sube sin que el corredor vaya mas rapido: se sube el techo 1 ppm por
    # grado arriba de 22, hasta +8. Sin ese ajuste el coach regana a quien corrio a 30 grados.
    def techo_de(r):
        try:
            t = float(r.get("temp"))
        except (TypeError, ValueError):
            return techo
        return techo + int(max(0, min(8, round(t - 22))))

    fc_alta = [r for r in faciles if float(r["fc_media"]) > techo_de(r)]
    calurosas = [r for r in esta if r.get("temp") is not None and float(r["temp"] or 0) >= 27]
    molestias = [r for r in esta if (r.get("molestia") or "").strip()]
    graves = [r for r in molestias
              if any(p in (r.get("molestia") or "").lower() for p in PALABRA_RIESGO)]
    esf_max = max([int(float(r.get("esf") or 0)) for r in esta], default=0)

    fin_semana = ini + timedelta(days=n * 7 - 1)      # domingo de esa semana
    cerrada = hoy >= fin_semana      # el domingo por la noche ya se revisa la semana
    banderas, decision, cambios = [], "seguir", {}

    if graves:
        decision = "congelar"
        banderas.append("molestia con palabras de riesgo: " + graves[0]["molestia"][:120])
    elif pct is None:
        decision = "seguir"
    elif pct > 115:
        decision = "recortar"
        banderas.append(f"{km} km contra {plan_km} del plan ({pct}%): te pasaste de carga")
    elif pct < 70 or (faltan and "larga" in faltan and n == sem_de(hoy)):
        decision = "bajar"
        banderas.append(f"cumpliste {km} de {plan_km} km ({pct}%)" +
                        (f"; falto {', '.join(faltan)}" if faltan else ""))
    elif pct < 95:
        decision = "repetir"
        banderas.append(f"cumpliste {pct}% del plan")
    if calurosas:
        banderas.append("sesion(es) con calor ("
                        + ", ".join(f"{r['fecha']} {int(float(r['temp']))} grados" for r in calurosas[:4])
                        + "): el pulso alto ahi no cuenta como ir rapido")
    if fc_alta:
        # se dice el techo que se uso en cada una: con calor sube, y el corredor tiene que verlo
        det = []
        for r in fc_alta:
            t = techo_de(r)
            extra = f" a {int(float(r['temp']))} C" if t > techo else ""
            det.append(f"{r['fecha']} {int(r['fc_media'])} (techo {t}{extra})")
        banderas.append(f"{len(fc_alta)} facil(es) con FC media sobre el techo de Z2: " + ", ".join(det))
        if decision == "seguir":
            decision = "repetir"
    for r in dudosas:
        banderas.append(f"la del {r.get('fecha')} ({r.get('tipo')}) fue caminando "
                        f"({ritmo(float(r.get('min') or 0), float(r.get('km') or 0))}/km, "
                        f"FC {r.get('fc_media') or '—'}): cubre el dia, pero no dio el estimulo — "
                        f"cuando puedas, trota los minutos fuertes")
    if esf_max >= 9:
        banderas.append(f"esfuerzo {esf_max}/10 reportado")

    if not cerrada and decision != "congelar":
        # la semana sigue abierta: se informa, no se toca el plan
        if decision != "seguir":
            banderas.append(f"semana abierta (cierra el {fin_semana.isoformat()}): con esto iria '{decision}', "
                            "pero no se ajusta hasta el domingo")
        decision = "abierta"

    sig = semanas.get(n + 1)
    if sig and decision not in ("seguir", "abierta"):
        base_km = float(sig.get("km") or 0)
        base_larga = float(sig.get("larga") or 0)
        if decision == "congelar":
            cambios = {"km": base_km, "larga": base_larga, "calidad": "sin calidad",
                       "nota": f"CONGELADA por molestia ({hoy.isoformat()}): no sube volumen hasta valoracion"}
        elif decision == "recortar":
            cambios = {"km": round(base_km * 0.9, 1), "larga": round(base_larga * 0.9, 1),
                       "calidad": sig.get("calidad"),
                       "nota": f"Recortada 10% ({hoy.isoformat()}): la semana previa paso de 115%"}
        elif decision == "bajar":
            cambios = {"km": round(base_km * 0.9, 1), "larga": round(base_larga * 0.9, 1),
                       "calidad": "sin calidad",
                       "nota": f"Baja 10% y sin calidad nueva ({hoy.isoformat()}): la previa quedo corta"}
        elif decision == "repetir":
            cambios = {"km": base_km, "larga": base_larga, "calidad": sig.get("calidad"),
                       "nota": f"Repite volumen ({hoy.isoformat()}): no se sube hasta cerrar una semana limpia"}

    salida = {"atleta": aid, "fcmax": fcmax, "semana": n, "fechas": sem.get("fechas"), "plan": sem,
            "hecho": esta,
            "km": km, "km_prev": km_prev, "pct": pct, "faltan": faltan,
            "fc_alta": [r["fecha"] for r in fc_alta],
            "calurosas": [{"fecha": r["fecha"], "temp": r["temp"]} for r in calurosas],
            "molestias": [r.get("molestia") for r in molestias],
            "banderas": banderas, "decision": decision, "cambios": cambios,
            "siguiente": sig.get("n") if sig else None,
            "notas": plan["notas"] if isinstance(plan.get("notas"), list) else []}
    salida["lectura"] = lectura(salida, fcmax)
    salida["toca"] = toca(salida, fcmax)
    return salida



# --- Lectura del desempeño -------------------------------------------------------------------
# Lo que el corredor pide al pulsar «Pedir analisis» no es el conteo de km (eso ya lo ve en la app):
# quiere saber COMO le fue. Estas frases salen de los numeros de sus sesiones, sin inventar nada:
# si un dato falta, se calla; no se supone.
DERIVA = 8          # ppm de mas entre la primera y la segunda mitad = el dia se cobro cansancio
FC_TOPE_ESFUERZO = 0.86   # % de la FC maxima a partir del cual ya no es conversacion


def ritmo_seg(min_, km):
    try:
        km = float(km or 0)
        return (float(min_ or 0) * 60.0 / km) if km > 0 else None
    except (TypeError, ValueError):
        return None


def _reloj(s):
    rit = ritmo_seg(s.get("min"), s.get("km"))
    if rit is None:
        return "%s min" % s.get("min")
    m, seg = divmod(int(round(rit)), 60)
    return "%s min · %d:%02d/km" % (s.get("min"), m, seg)


def desempeno(r, fcmax=None):
    """Frases sobre como salio cada sesion y que conviene hacer, en lenguaje de coach."""
    ses = [s for s in (r.get("hecho") or []) if s.get("tipo") != "fuerza"]
    if not ses:
        return []
    out = []
    km_sem = round(sum(float(s.get("km") or 0) for s in r.get("hecho") or []), 1)
    # 1) cada corrida, en una linea: ritmo, pulso y si aguanto
    for s in ses:
        linea = "- **%s %s** (%s): %s" % (s.get("fecha", "")[5:], s.get("tipo", ""), _reloj(s),
                                          ("FC %s/%s" % (s.get("fc_media") or "—", s.get("fc_max") or "—")))
        f1, f2 = s.get("fc_1a"), s.get("fc_2a")
        try:
            deriva = float(f2) - float(f1)
        except (TypeError, ValueError):
            deriva = None
        if deriva is not None and deriva >= DERIVA:
            linea += "; **se te fue el pulso en la segunda mitad** (+%d ppm): el ritmo te gano al final, " \
                     "arranca 10 s/km mas lento y acaba igual de rapido" % int(deriva)
        elif deriva is not None and deriva <= -DERIVA // 2:
            linea += "; aguantaste mejor de lo que empezaste (-%d ppm en la segunda mitad), " \
                     "senal de que la salida fue conservadora" % int(-deriva)
        # sin las dos mitades del reloj no se afirma estabilidad: el dato no existe
        out.append(linea)

    # 3) ritmo del facil contra su ritmo historico de la tabla (si el plan lo trae)
    fac = [s for s in ses if s.get("tipo") == "facil"]
    ref = (r.get("plan") or {}).get("ritmo_facil") or r.get("ritmo_facil")
    if fac and ref:
        rit = ritmo_seg(fac[-1].get("min"), fac[-1].get("km"))
        rref = ritmo_seg(1, ref) if rit and str(ref).count(":") == 1 else None
        if rit and rref and abs(rit - rref) > 15:
            out.append("- El facil te salio a %s/km contra %s/km de referencia: %s" %
                       ("%d:%02d" % divmod(int(rit), 60), ref,
                        "vas mas rapido de lo que toca en un facil" if rit < rref else
                        "mas lento; revisa calor y descanso antes de apretar"))

    # 4) a que pulso pide el cuerpo trabajar, y si eso invita a apretar o a frenar
    if fcmax and fac:
        fc = float(fac[-1].get("fc_media") or 0)
        if fc:
            pct = int(round(fc / float(fcmax) * 100))
            if pct >= int(FC_TOPE_ESFUERZO * 100):
                out.append("- El facil a %d ppm es %d%% de tu maximo: ya no es conversacion, entras en "
                           "territorio de tempo. Si no puedes hablar en frases seguidas, baja el ritmo."
                           % (int(fc), pct))
            else:
                out.append("- El facil a %d ppm (%d%% de tu maximo) dejo margen para hablar: ese es el "
                           "pulso donde el cuerpo construye base." % (int(fc), pct))

    # 5) calidad: lo que importa es cuanto mas alto llega que en un facil suyo, no una tabla
    cal = [s for s in ses if s.get("tipo") == "calidad"]
    facs = [s for s in ses if s.get("tipo") == "facil"]
    for s in cal:
        try:
            mx = float(s.get("fc_max") or 0)
        except (TypeError, ValueError):
            mx = 0
        ref_fac = 0
        for f in facs:
            try:
                ref_fac = max(ref_fac, float(f.get("fc_max") or 0))
            except (TypeError, ValueError):
                pass
        if mx and ref_fac and mx - ref_fac < 8:
            out.append("- La calidad del %s llego a %d ppm, casi la misma altura que tu facil (%d ppm): "
                       "los minutos fuertes no se distinguieron. En las series aprieta de verdad y "
                       "recupera caminando o trotando suave."
                       % (s.get("fecha", "")[5:], int(mx), int(ref_fac)))
        elif mx:
            # donde queda el pico: se dice con la FC maxima del perfil, que si es un dato suyo
            pct = int(round(mx / float(fcmax) * 100)) if fcmax else None
            out.append("- La calidad del %s subio hasta %d ppm%s: el estimulo de las series si llego."
                       % (s.get("fecha", "")[5:], int(mx),
                          (" (%d%% de tu maximo)" % pct) if pct else ""))
    return out



# Lo que el corredor escribe en las notas cambia la lectura: una molestia o un dia que no
# pudo salir explica el numero mejor que el numero solo. Se busca por tema, sin acentos ni
# mayusculas, y cada tema tiene su propia frase; si no hay nota del tema, no se escribe nada.
TEMAS_NOTA = (
    ("molestia", ("molestia", "dolor", "duele", "ciatica", "rodilla", "tobillo", "planta", "aquiles",
                  "espalda", "tirón", "tiron", "calambre", "inflamad")),
    ("clima", ("lluvia", "llovio", "llovió", "calor", "viento", "frio", "frío", "humedad", "sol fuerte")),
    ("agenda", ("trabajo", "turno", "viaje", "familia", "reunion", "reunión", "cita", "no pude",
                "no sali", "no salí", "se me hizo tarde", "ocupado")),
    ("fatiga", ("cansad", "fatiga", "agotad", "sin fuerzas", "desvelad", "mal dorm",
                "no dormi", "no dormí", "no dorm", "dormi mal", "dormí mal", "dormir mal",
                "poco sueño", "sueño atrasado", "desperte", "desperté", "insomnio")),
    ("animo", ("desanimad", "flojera", "estres", "estrés", "ansiedad", "motivacion", "motivación")),
    ("futbol", ("futbol", "fútbol", "fut", "partido")),
    ("fuerza", ("pesas", "gym", "gimnasio", "fuerza", "crossfit")),
    ("alimentacion", ("ayuno", "no comi", "no comí", "desayun", "comida", "hidrat", "agua", "sal", "gel")),
)
CONSEJO_NOTA = {
    "molestia": ("Si la molestia sigue el día de la sesión, no se corre: se cambia por bici o elíptica "
                 "y se revisa. Dolor que irradia corta la sesión, no se aguanta."),
    "clima": ("El clima no se pelea: esa sesión se mueve de día o se acorta; se pierde el estímulo, "
              "no la semana."),
    "agenda": ("Si un día no se pudo salir, no se recupera al doble: se corre lo que toca y se cierra "
               "la semana sin deuda."),
    "fatiga": ("Con esa fatiga encima, la sesión fuerte se cambia por trote suave o se recorta: "
               "entrenar cansado no suma, sólo arrastra la siguiente semana."),
    "animo": ("Los días flojos cuentan igual si sales a trotar: bajar la exigencia, no el hábito."),
    "futbol": ("El fútbol cuenta como calidad: si lo juegas, la calidad de la semana ya está hecha y "
               "no se suma otra."),
    "fuerza": ("La fuerza va después del trote o en día aparte: antes de una calidad te quita las "
               "piernas que necesitas."),
    "alimentacion": ("En las largas de más de 90 minutos come antes de salir y lleva agua: sin eso el "
                     "pulso sube solo al final y parece falta de forma."),
}


def leer_notas(r):
    """Devuelve (textos, temas) de las notas del corredor; la más reciente al final."""
    notas = r.get("notas") or []
    if not isinstance(notas, list):
        return [], []
    textos, temas = [], []
    for n in notas[-12:]:
        if not isinstance(n, dict):
            continue
        t = str(n.get("texto") or "").strip()
        if not t:
            continue
        textos.append((n.get("fecha") or "", t))
        plano = t.lower()
        for normal, palabras in ((("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n"))):
            plano = plano.replace(normal, palabras)
        for clave, palabras_tema in TEMAS_NOTA:
            if clave in temas:
                continue
            for w in palabras_tema:
                wl = w.lower()
                for normal, simple in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
                    wl = wl.replace(normal, simple)
                if wl in plano:
                    temas.append(clave)
                    break
    return textos, temas


def lectura_notas(r):
    """Las frases que sólo se pueden decir leyendo lo que el corredor escribió."""
    textos, temas = leer_notas(r)
    out = []
    for clave in temas:
        palabras = dict(TEMAS_NOTA).get(clave, ())
        ejemplo = ""
        for _, t in reversed(textos):
            plano = t.lower()
            for normal, simple in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
                plano = plano.replace(normal, simple)
            if any(w.lower() in plano for w in palabras):
                ejemplo = t
                break
        dicho = ('Dijiste «%s»: ' % ejemplo[:110]) if ejemplo else ""
        if clave == "molestia":
            out.append(dicho + "eso cambia la sesión, no la semana. Lo que duele no se entrena: "
                               "se cambia por bici o elíptica y, si irradia, se corta.")
        elif clave == "clima":
            out.append(dicho + "con eso la sesión se mueve de día o se acorta; el plan se cumple "
                               "cuando se puede, no a fuerza.")
        elif clave == "agenda":
            out.append(dicho + "los días que no salen no se pagan al doble: se cierra la semana "
                               "con lo que toca y se sigue.")
        elif clave == "fatiga":
            out.append(dicho + "entrenar con eso encima no suma: la sesión fuerte se cambia por "
                               "trote suave y se llega entero a la siguiente.")
        elif clave == "animo":
            out.append(dicho + "ese día cuenta igual si sales a trotar; baja la exigencia, no el hábito.")
        elif clave == "futbol":
            out.append(dicho + "el fútbol cuenta como calidad: con eso la calidad de la semana ya "
                               "está hecha, no se suma otra.")
        elif clave == "fuerza":
            out.append(dicho + "la fuerza va después del trote o en día aparte: antes de una calidad "
                               "te quita las piernas.")
        elif clave == "alimentacion":
            out.append(dicho + "en las largas pasa de 90 minutos eso se nota al final: come antes y "
                               "lleva agua, o el pulso sube solo y parece falta de forma.")
    # Una sola frase de la nota: la segunda ya es relleno y el corredor la lee como sermón.
    return out[:1]


def consejo_nota(r):
    """Un solo consejo, el del tema más importante que haya escrito el corredor."""
    _, temas = leer_notas(r)
    for clave in temas:
        if clave in CONSEJO_NOTA:
            return CONSEJO_NOTA[clave]
    return ""


def lectura(r, fcmax=None):
    """Lo que la app pinta como «lo que dice el coach»: comparaciones reales, no el conteo de km.

    Cada frase sale de numeros que el export trae de verdad (ritmo, FC media/max de cada sesion,
    el techo de Z2 del atleta y, si existe, la FC por mitades). Si falta el dato, la frase no se
    escribe: nunca se supone estabilidad ni cansancio.
    """
    ses = [x for x in (r.get("hecho") or []) if x.get("tipo") != "fuerza"]
    if not ses:
        return lectura_notas(r)

    def rt(x):
        return ritmo_seg(x.get("min"), x.get("km"))

    def h(x, k="fc_media"):
        try:
            return float(x.get(k) or 0) or None
        except (TypeError, ValueError):
            return None

    def mm(seg):
        m, s2 = divmod(int(round(seg)), 60)
        return "%d:%02d" % (m, s2)

    fcmax = fcmax or r.get("fcmax")
    techo = TECHOS.get(r.get("atleta"))
    fac = [x for x in ses if x.get("tipo") == "facil"]
    lar = [x for x in ses if x.get("tipo") == "larga"]
    cal = [x for x in ses if x.get("tipo") == "calidad"]

    out = lectura_notas(r)

    # A) la larga contra el facil de la misma semana: mismo pulso, mas reloj
    if lar and fac and rt(lar[-1]) and rt(fac[-1]) and h(lar[-1]) and h(fac[-1]):
        L, F = lar[-1], fac[-1]
        d, dh = rt(L) - rt(F), int(h(L) - h(F))
        if d >= 25:
            out.append("La larga salió a %s/km contra %s/km del fácil, con solo %+d ppm de pulso: %s "
                       "más por kilómetro para la misma exigencia. El desgaste vino de la distancia, "
                       "no del ritmo; si se repite, recorta 1 km y sostén el ritmo en vez de alargar "
                       "caminando." % (mm(rt(L)), mm(rt(F)), dh, mm(d)))
        elif d <= -25:
            out.append("Corriste la larga más rápido que el fácil (%s/km contra %s/km): en la larga el "
                       "ritmo no es el objetivo, sostener el pulso si." % (mm(rt(L)), mm(rt(F))))

    # B) la larga contra el techo de Z2
    if lar and h(lar[-1]) and techo:
        hh = h(lar[-1])
        if hh >= techo - 1:
            out.append("La larga se fue entera al techo de Z2 (%d de %d ppm): ahí el cuerpo tira de "
                       "glucógeno y no construye base. Arranca 10-15 s/km más lento y déjalo 8 o 10 "
                       "ppm abajo." % (int(hh), techo))
        elif hh <= techo - 18:
            out.append("La larga quedó cómoda (%d ppm con techo de %d): sobra margen, la puedes llevar "
                       "un poco más firme sin salir de Z2." % (int(hh), techo))

    # C) el facil: donde se construye y si se esta pasando
    if fac and h(fac[-1]):
        hh = h(fac[-1])
        pct = int(round(hh / fcmax * 100)) if fcmax else None
        if techo and hh > techo:
            out.append("El fácil salió a %d ppm, arriba del techo de Z2 (%d): ese día fue tempo "
                       "disfrazado de fácil." % (int(hh), techo))
        elif pct and pct >= 78:
            out.append("El fácil a %d ppm es %d%% de tu máxima: justo en el borde de poder hablar. "
                       "Esa es la vara: si no sale una frase completa, vas fuerte."
                       % (int(hh), pct))
        elif pct:
            out.append("El fácil a %d ppm (%d%% de tu máxima) dejó margen para hablar: ese es el pulso "
                       "donde se construye la base." % (int(hh), pct))

    # D) calidad: cuenta el pico contra el pico del facil, no la media
    pico_fac = max([h(x, "fc_max") or 0 for x in fac], default=0)
    for x in cal:
        mx = h(x, "fc_max")
        if not mx:
            continue
        if pico_fac and mx - pico_fac < 8:
            out.append("La calidad del %s llegó a %d ppm, casi el mismo pico que tu fácil (%d): los "
                       "minutos fuertes no se distinguieron del trote. En las series aprieta de "
                       "verdad; la recuperación es la que va suave."
                       % (x.get("fecha", "")[5:], int(mx), int(pico_fac)))
        elif fcmax and mx / fcmax >= 0.90:
            out.append("La calidad del %s tocó %d ppm (%d%% de tu máxima): el estímulo llegó. Si al día "
                       "siguiente amaneces con las piernas pesadas, la próxima calidad va más suave."
                       % (x.get("fecha", "")[5:], int(mx), int(round(mx / fcmax * 100))))

    # E) deriva: solo si el reloj trae las dos mitades
    for x in ses:
        try:
            d = float(x.get("fc_2a")) - float(x.get("fc_1a"))
        except (TypeError, ValueError):
            continue
        if d >= DERIVA:
            out.append("En la del %s el pulso subió %d ppm en la segunda mitad: el ritmo te ganó al "
                       "final. Arranca 10 s/km más lento y acaba igual de rápido."
                       % (x.get("fecha", "")[5:], int(d)))
    return out[:4]


def toca(r, fcmax=None):
    """El consejo en texto plano, para pintarlo dentro de la app.

    Si el corredor escribio algo (molestia, clima, agenda, fatiga), eso manda sobre la
    recomendacion que sale solo de los numeros.
    """
    ajeno = consejo_nota(r)
    if ajeno:
        return ajeno
    return consejo(r, fcmax).replace("- **Lo que toca:** ", "")


def consejo(r, fcmax=None):
    """Una sola cosa que hacer, la mas importante de la semana."""
    faltan = r.get("faltan") or []
    if "larga" in faltan:
        larga = (r.get("plan") or {}).get("larga")
        return ("- **Lo que toca:** la larga de %s km, a ritmo en el que puedas hablar. Si el pulso se "
                "te sube al final, camina un minuto y sigue: la distancia del dia manda mas que el ritmo."
                % (larga if larga else ""))
    pct = r.get("pct")
    if pct and pct > 105 and r.get("decision") in ("seguir", "abierta"):
        return ("- **Lo que toca:** no sumar km de más: el plan ya sube solo y el extra solo deja la "
                "larga pegada al techo. Cumple el km de la semana y listo.")
    if r.get("decision") == "recortar":
        return "- **Lo que toca:** la proxima semana baja 10% y sin calidad nueva; la carga subio de mas."
    if r.get("decision") == "congelar":
        return "- **Lo que toca:** nada de volumen esta semana; primero valora la molestia."
    if r.get("decision") == "repetir":
        return "- **Lo que toca:** repetir el volumen de la semana, sin subir, hasta cerrar una limpia."
    return "- **Lo que toca:** seguir el plan como esta; la semana salio limpia."


def texto(r):
    L = [f"## {r['atleta'].title()} — semana {r['semana']} ({r['fechas']})", ""]
    p = r["plan"]
    L.append(f"Plan: {p.get('km')} km, larga {p.get('larga')} km, calidad: {p.get('calidad')}")
    L.append(f"Hecho: {r['km']} km ({r['pct']}% del plan)" +
             (f", semana previa {r['km_prev']} km" if r["km_prev"] else ""))
    L.append("")
    if r["hecho"]:
        L.append("| Fecha | Tipo | Km | Min | Ritmo | FC media/max | Zona | Temp | Esf | Molestia |")
        L.append("|---|---|---|---|---|---|---|---|---|---|")
        for s in r["hecho"]:
            temp = s.get("temp")
            temp = f"{int(float(temp))} C" if temp not in (None, "") else "—"
            L.append(f"| {s['fecha']} | {s.get('tipo')} | {s.get('km')} | {s.get('min')} | "
                     f"{ritmo(float(s.get('min') or 0), float(s.get('km') or 0))} | "
                     f"{s.get('fc_media') or '—'}/{s.get('fc_max') or '—'} | {s.get('zona') or '—'} | "
                     f"{temp} | {s.get('esf') or '—'} | {(s.get('molestia') or '').strip() or '—'} |")
    else:
        L.append("Sin sesiones registradas esta semana.")
    leidas = r.get("lectura") or lectura(r, r.get("fcmax"))
    if leidas:
        L += ["", "**Como te fue:**"] + ["- " + x for x in leidas]
    L.append("- **Lo que toca:** " + (r.get("toca") or toca(r, r.get("fcmax"))))
    L += ["", f"**Decision: {r['decision']}**"]
    if r["banderas"]:
        L += [f"- {b}" for b in r["banderas"]]
    if r["cambios"]:
        c = r["cambios"]
        L.append(f"- Semana {r['siguiente']}: {c['km']} km, larga {c['larga']} km, {c['calidad']}")
    L.append("")
    return "\n".join(L)


def aplicar(aid, r):
    import re
    nota = NOTAS[aid]
    txt = nota.read_text(encoding="utf-8")
    n = r["siguiente"]
    c = r["cambios"]
    pat = re.compile(rf"^\|\s*{n}\s*\|[^\n]*$", re.M)
    m = pat.search(txt)
    if not m:
        print(f"AVISO: no encontre la fila de la semana {n} en {nota.name}")
        return False
    copia = nota.with_suffix(nota.suffix + ".bak")
    copia.write_text(txt, encoding="utf-8")          # copia antes de tocar el vault
    celdas = [x.strip() for x in m.group(0).strip().strip("|").split("|")]
    celdas[2] = f"{c['km']:g}"
    celdas[3] = f"{c['larga']:g}"
    celdas[4] = c["calidad"]
    celdas[5] = c["nota"]
    nueva = "| " + " | ".join(celdas) + " |"
    nota.write_text(txt[:m.start()] + nueva + txt[m.end():], encoding="utf-8")
    print(f"vault: semana {n} de {aid} -> {nueva}")
    return True


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    planes, registro = carga_export(sys.argv[1])
    solo = None
    if "--atleta" in sys.argv:
        solo = sys.argv[sys.argv.index("--atleta") + 1]
    hoy = date.today()
    if "--hoy" in sys.argv:
        hoy = date.fromisoformat(sys.argv[sys.argv.index("--hoy") + 1])
    forzar = None
    if "--semana" in sys.argv:
        forzar = int(sys.argv[sys.argv.index("--semana") + 1])
    outs, salida = [], ["# Analisis de entrenamientos", f"Fecha: {hoy.isoformat()}", ""]
    for aid, plan in planes.items():
        if solo and aid != solo:
            continue
        if not plan.get("semanas"):
            continue
        r = analiza(aid, plan, registro.get(aid, []), hoy, forzar)
        outs.append(r)
        salida.append(texto(r))
    reporte = "\n".join(salida)
    destino = APP / "tools" / "ultimo_analisis.md"
    destino.write_text(reporte, encoding="utf-8")
    if "--json" in sys.argv:
        # La app pinta esto dentro de su pantalla: datos, no prosa de consola.
        dato = outs[0] if len(outs) == 1 else outs
        for r in (outs if isinstance(dato, list) else [dato]):
            r.pop("_filas", None)
            r["texto"] = texto(r).strip()
        print(json.dumps(dato, ensure_ascii=False, default=str))
        return
    print(reporte)
    print(f"(reporte en {destino})")
    if "--aplicar" in sys.argv:
        for r in outs:
            if r["cambios"]:
                aplicar(r["atleta"], r)
        import subprocess
        subprocess.run([sys.executable, str(APP / "tools" / "generar_plan.py")], check=False)


if __name__ == "__main__":
    main()
