#!/usr/bin/env python3
"""Recibe los avisos de la app Maraton y despierta al agente.

La app (pestana Agente -> Webhook) hace POST del estado en cada cambio.
Este receptor no decide nada: guarda el aviso y, si el cambio es de Jonah,
manda un mensaje corto por el gateway de Hermes para que el coach lo lea
con las herramientas de verdad (analizar.py, el vault, el plan).

Correr:  python maraton_webhook.py
Prueba:  curl -X POST http://127.0.0.1:8787/hook/<SECRETO> -d '{"atleta":"jonah"}'
"""
import json
import os
import re
import shutil
import subprocess
from datetime import date
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PUERTO = int(os.environ.get("MARATON_PUERTO", "8787"))
SECRETO = os.environ.get("MARATON_SECRETO", "").strip()
VIGILAR = [a.strip().lower() for a in os.environ.get("MARATON_ATLETAS", "jonah").split(",") if a.strip()]
DESTINO = os.environ.get("MARATON_DESTINO", "telegram")
CACHE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "hermes" / "cache" / "maraton"
LOG = CACHE / "avisos.jsonl"
APP = Path(__file__).resolve().parent.parent          # carpeta de la app (donde vive tools/analizar.py)
# Se sube cuando cambia el motor de analisis: fuerza a recalcular aunque los datos no cambien.
SELLO = "v73b"


def huella(datos):
    """Identifica los datos con los que se hizo el analisis: sesiones, notas y el motor."""
    import hashlib
    base = {"s": datos.get("sesiones") or [], "n": datos.get("notas") or [], "m": SELLO}
    return hashlib.sha1(json.dumps(base, sort_keys=True, default=str).encode("utf-8")).hexdigest()
PY = os.environ.get("MARATON_PYTHON") or sys.executable


def _hermes() -> str | None:
    return shutil.which("hermes")


def avisar_al_agente(texto: str) -> bool:
    """Despierta al agente con `hermes send`. Si falla, se registra y se sigue."""
    exe = _hermes()
    if not exe:
        print("no encontre el comando hermes", flush=True)
        return False
    try:
        r = subprocess.run([exe, "send", "--to", DESTINO, texto],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            print(f"hermes send fallo ({r.returncode})", flush=True)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        print(f"sin aviso: {type(e).__name__}", flush=True)
        return False


# Bitacora de peticiones: sirve para saber si el telefono de verdad llego al receptor,
# distinguiendo el aparato por el User-Agent y sin apuntar el secreto.
def _anotar(metodo, camino, cabeceras):
    try:
        ua = (cabeceras.get("User-Agent") or "")[:90]
        limpio = re.sub(r"/(hook|feedback)/[^/]+", r"/\1/[oculto]", camino)
        linea = "%s %s %s | %s\n" % (time.strftime("%Y-%m-%d %H:%M:%S"), metodo, limpio, ua)
        CACHE.mkdir(parents=True, exist_ok=True)
        with open(CACHE / "peticiones.log", "a", encoding="utf-8") as f:
            f.write(linea)
    except Exception:
        pass

class Manejador(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):  # silencio: el log util es el jsonl
        pass

    def _responder(self, codigo: int, obj: dict):
        cuerpo = json.dumps(obj).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Access-Control-Allow-Origin", "*")   # la app es otro origen (github.io)
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_OPTIONS(self):
        _anotar('OPTIONS', self.path, self.headers)
        # La app manda mode:'cors' para poder ver si el aviso entro (y si no, el motivo).
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        _anotar('GET', self.path, self.headers)
        # La app pregunta por su feedback: GET /feedback/<secreto>/<atleta>
        ruta = self.path.split("?")[0].rstrip("/")
        partes = [p for p in ruta.split("/") if p]
        if len(partes) >= 4 and partes[0] == "maraton":
            partes = partes[1:]
        if len(partes) < 3 or partes[0] != "feedback":
            return self._responder(404, {"ok": False, "error": "ruta desconocida"})
        if SECRETO and partes[1] != SECRETO:
            return self._responder(403, {"ok": False, "error": "secreto invalido"})
        atleta = partes[2].lower()
        archivo = CACHE / f"feedback_{atleta}.json"
        if not archivo.exists():
            return self._responder(200, {"ok": False, "pendiente": True,
                                         "error": "todavia no hay analisis para " + atleta})
        try:
            salida = json.loads(archivo.read_text(encoding="utf-8"))
        except Exception:
            return self._responder(500, {"ok": False, "error": "feedback ilegible"})
        # Cuando entro el ultimo aviso de la app. Sirve para que el telefono pueda comprobar
        # que su envio llego aunque el navegador no lo deje leer la respuesta del POST.
        try:
            ultimo = json.loads((CACHE / "ultimo.json").read_text(encoding="utf-8"))
            salida["recibido"] = ultimo.get("cuando") or None
            salida["recibido_sesiones"] = len(ultimo.get("sesiones") or [])
        except Exception:
            salida["recibido"] = None
        # Los analisis viejos no traen 't': se deriva de 'cuando', que esta en hora local.
        if not salida.get("t") and salida.get("cuando"):
            try:
                salida["t"] = int(time.mktime(time.strptime(salida["cuando"], "%Y-%m-%dT%H:%M:%S")) * 1000)
            except Exception:
                pass
        return self._responder(200, salida)

    def do_POST(self):
        _anotar('POST', self.path, self.headers)
        # Detras de tailscale serve el prefijo /maraton se conserva: se acepta con o sin el.
        ruta = self.path.split("?")[0].rstrip("/")
        partes = [p for p in ruta.split("/") if p]
        if len(partes) >= 3 and partes[0] == "maraton":
            partes = partes[1:]
        if len(partes) < 2 or partes[0] != "hook":
            return self._responder(404, {"ok": False, "error": "ruta desconocida"})
        if SECRETO and partes[1] != SECRETO:
            return self._responder(403, {"ok": False, "error": "secreto invalido"})
        largo = int(self.headers.get("Content-Length") or 0)
        if largo <= 0 or largo > 2_000_000:
            return self._responder(400, {"ok": False, "error": "cuerpo vacio o enorme"})
        try:
            datos = json.loads(self.rfile.read(largo).decode("utf-8"))
        except Exception:
            return self._responder(400, {"ok": False, "error": "json invalido"})

        atleta = str(datos.get("atleta") or "").lower()
        sesiones = datos.get("sesiones") or []
        CACHE.mkdir(parents=True, exist_ok=True)
        with LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps({"recibido": time.strftime("%Y-%m-%dT%H:%M:%S"),
                                "atleta": atleta, "sesiones": len(sesiones)}) + "\n")
        if atleta in VIGILAR:
            if sesiones:      # sin sesiones no se toca el respaldo: se perderia el historial
                (CACHE / "ultimo.json").write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
                try:
                    print("respaldo", atleta, guardar_respaldo(atleta, datos), "sesiones", flush=True)
                except Exception as fallo:
                    print("respaldo fallo:", fallo, flush=True)

        if atleta in VIGILAR:
            partes_txt = []
            for s in sesiones[-3:]:
                partes_txt.append(
                    f"{s.get('fecha')} {s.get('tipo')} {s.get('km') or '?'} km {s.get('min') or '?'} min"
                    + (f" FC {s.get('fc_media')}/{s.get('fc_max')}" if s.get('fc_media') else ""))
            nota = (datos.get("nota") or "").strip() if isinstance(datos.get("nota"), str) else ""
            texto = ("[maraton] " + atleta + " registro en la app. "
                     + ("Ultimas: " + " | ".join(partes_txt) if partes_txt else "Sin sesiones en el aviso.")
                     + (" Nota del corredor: " + nota if nota else "")
                     + " Revisa con tools/analizar.py y da feedback.")
            # El aviso al agente puede tardar (hermes send tarda hasta 2 min): va aparte
            # para contestarle a la app de inmediato. Si no, el celular se queda esperando
            # y termina marcando "no llego" aunque si entro.
            # El feedback se calcula aqui, no esperando al agente: la app tiene que
            # contestar en segundos aunque el modelo este ocupado o sin saldo.
            threading.Thread(target=analizar, args=(atleta, datos), daemon=True).start()
            hilo = threading.Thread(target=avisar_al_agente, args=(texto[:900],), daemon=True)
            hilo.start()
        return self._responder(200, {"ok": True, "atleta": atleta})


sys.path.insert(0, str(APP / "tools"))


def analizar(atleta: str, datos: dict) -> bool:
    """Corre tools/analizar.py con lo que mando la app y deja el resultado en feedback_<atleta>.json."""
    # Un aviso sin sesiones es la app abriendose o un guardado a medias: no trae con que
    # analizar y, si se corre, borra el feedback bueno con una tarjeta vacia. Se conserva el
    # anterior y se le dice a la app que no hay nada nuevo.
    if not (datos.get("sesiones") or []):
        # Un telefono que no guarda sesiones propias (el historial vive en la PC) manda avisos
        # vacios: el corredor pide analisis y le vuelve el de ayer. Se completa con el respaldo
        # y con el export previo antes de darlo por vacio.
        falta = {}
        try:
            falta = json.loads((CACHE / f"respaldo_{atleta}.json").read_text(encoding="utf-8"))
        except Exception:
            falta = {}
        if not (datos.get("notas") or []):
            try:
                previo = json.loads((CACHE / f"export_{atleta}.json").read_text(encoding="utf-8"))
                falta["notas"] = previo.get("notas") or []
            except Exception:
                pass
        datos = dict(datos, sesiones=falta.get("sesiones") or [],
                     notas=datos.get("notas") or falta.get("notas") or [])
        print("aviso sin sesiones: se completa con el respaldo de", atleta,
              len(datos["sesiones"]), "sesiones", flush=True)
        if not datos["sesiones"]:
            print("aviso sin sesiones ni respaldo: se conserva el feedback anterior de", atleta, flush=True)
            return False
    perfil = datos.get("perfil") or {}
    plan = datos.get("plan") or {}
    semanas = plan.get("semanas") or []
    if not semanas:
        # Igual con el plan: si el aviso no lo trae, se usa el del export anterior.
        try:
            previo = json.loads((CACHE / f"export_{atleta}.json").read_text(encoding="utf-8"))
            semanas = previo.get("semanas") or []
            plan = {"inicio": plan.get("inicio") or previo.get("inicio"), "semanas": semanas}
            perfil = perfil or (previo.get("atleta") or {})
        except Exception:
            semanas = []
        if not semanas:
            print("aviso sin plan ni export previo:", atleta, flush=True)
            return False
    export = {"api": "plan-maraton/v1", "exportado": time.strftime("%Y-%m-%dT%H:%M:%S"),
              "atleta": {"id": atleta, "nombre": perfil.get("nombre") or atleta,
                         "fcmax": perfil.get("fcmax"), "fc_reposo": perfil.get("fc_reposo"),
                         "carrera": perfil.get("carrera"), "meta": perfil.get("meta"),
                         "zonas": perfil.get("zonas"), "inicio": plan.get("inicio")},
              "inicio": plan.get("inicio"), "semanas": semanas,
              "registro": datos.get("sesiones") or [],
              # lo que el corredor escribio en la app; sin esto el analisis contesta a ciegas
              "notas": datos.get("notas") or []}
    fuente = CACHE / f"export_{atleta}.json"
    if not export["notas"]:
        # Un aviso sin notas no borra las que ya estaban: son el unico lugar donde viven
        # las respuestas del corredor y perderlas deja al coach hablando a ciegas.
        try:
            export["notas"] = json.loads(fuente.read_text(encoding="utf-8")).get("notas") or []
        except Exception:
            pass
    # Si nada cambio desde el ultimo analisis, no se vuelve a pagar el modelo: la tarjeta
    # avisa que no hay datos nuevos en vez de repetir lo mismo como si fuera de hoy.
    try:
        previo_fb = json.loads((CACHE / f"feedback_{atleta}.json").read_text(encoding="utf-8"))
    except Exception:
        previo_fb = {}
    marca = huella({"sesiones": export["registro"], "notas": export["notas"]})
    if previo_fb.get("ok") and previo_fb.get("huella") == marca:
        # Aunque no se vuelva a pagar el modelo, las preguntas que el corredor ya contesto
        # no se le pueden volver a mostrar: se filtran con sus notas y, si no queda nada
        # que preguntar, se pide el hueco que de verdad falta (esto no cuesta nada).
        try:
            import coach_ia
            quedan = coach_ia.preguntas_validas(previo_fb.get("preguntas") or [], export)
            if not quedan:
                import analizar as _a
                quedan = coach_ia.preguntas_validas(
                    _a.preguntas({"hecho": export.get("registro") or [], "notas": export.get("notas") or []}),
                    export)
            previo_fb["preguntas"] = quedan
            if previo_fb.get("cierre"):
                previo_fb["cierre"]["preguntas"] = coach_ia.preguntas_validas(
                    previo_fb["cierre"].get("preguntas") or [], export)
        except Exception as fallo:
            print("no pude filtrar las preguntas:", type(fallo).__name__, flush=True)
        previo_fb["cuando"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        previo_fb["t"] = int(time.time() * 1000)
        previo_fb["sin_cambios"] = True
        (CACHE / f"feedback_{atleta}.json").write_text(
            json.dumps(previo_fb, ensure_ascii=False, indent=1), encoding="utf-8")
        print("sin datos nuevos:", atleta, flush=True)
        return True
    fuente.write_text(json.dumps(export, ensure_ascii=False), encoding="utf-8")
    try:
        r = subprocess.run([PY, str(APP / "tools" / "analizar.py"), str(fuente),
                            "--atleta", atleta, "--json"],
                           capture_output=True, text=True, timeout=120)
    except Exception as fallo:
        print("analisis fallo:", fallo, flush=True)
        return False
    if r.returncode != 0:
        print("analisis fallo:", (r.stderr or "")[-300:], flush=True)
        return False
    try:
        dato = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception as fallo:
        print("analisis sin json:", fallo, flush=True)
        return False
    if isinstance(dato, list):
        dato = dato[0] if dato else {}
    # Cierre de semana: el domingo (o el primer dia de la semana siguiente) el coach revisa
    # los entrenamientos completos y decide si la semana que viene se toca. Mismo rol que
    # el analisis de la nota; si no hay modelo, no estorba.
    semana = {}
    try:
        import coach_ia
        r = list(coach_ia.cierra_semana(export, date.today()))
        lec, toc, pre = (r + [[], "", []])[:3]
        pre = coach_ia.preguntas_validas(pre, export, ya=dato.get("preguntas") or [])
        if lec or toc:
            semana = {"lectura": lec, "toca": toc, "cuando": time.strftime("%Y-%m-%dT%H:%M:%S"),
                      "semana": coach_ia._semana(export)["semana"], "preguntas": pre}
    except Exception as fallo:
        print("cierre de semana no corrio:", type(fallo).__name__, flush=True)
    salida = {"ok": True, "cuando": time.strftime("%Y-%m-%dT%H:%M:%S"),
              "t": int(time.time() * 1000),   # ms epoch: para comparar sin lios de zona
              "atleta": atleta,
              "semana": dato.get("semana"), "fechas": dato.get("fechas"),
              "plan": dato.get("plan"), "km": dato.get("km"), "pct": dato.get("pct"),
              "faltan": dato.get("faltan"), "banderas": dato.get("banderas"),
              "decision": dato.get("decision"), "siguiente": dato.get("siguiente"),
              "cambios": dato.get("cambios"),
              "lectura": dato.get("lectura") or [], "toca": dato.get("toca") or "",
              "texto": dato.get("texto"), "coach": dato.get("coach"), "cierre": semana,
              "preguntas": dato.get("preguntas") or [],
              # cuantas notas del corredor entraron al analisis: la tarjeta lo muestra
              "notas": dato.get("notas") or [],
              "huella": marca, "sin_cambios": False,
              # por que la tarjeta habla con numeros y no con el coach (sin llave, sin cuota…)
              "ia_motivo": dato.get("ia_motivo") or ""}
    (CACHE / f"feedback_{atleta}.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1),
                                                   encoding="utf-8")
    print("feedback listo:", atleta, "semana", salida.get("semana"), flush=True)
    return True


def guardar_respaldo(atleta, datos):
    """Copia por atleta: si el telefono pierde la memoria de la app, aqui queda el historial."""
    archivo = CACHE / f"respaldo_{atleta}.json"
    previo = {}
    if archivo.exists():
        try:
            previo = json.loads(archivo.read_text(encoding="utf-8"))
        except Exception:
            previo = {}
    sesiones = list(previo.get("sesiones") or [])
    vistas = {(str(s.get("fecha")), str(s.get("tipo"))): i for i, s in enumerate(sesiones)}
    for s in datos.get("sesiones") or []:
        if not isinstance(s, dict):
            continue
        clave = (str(s.get("fecha")), str(s.get("tipo")))
        if clave in vistas:
            sesiones[vistas[clave]] = s
        else:
            vistas[clave] = len(sesiones)
            sesiones.append(s)
    sesiones.sort(key=lambda s: str(s.get("fecha") or ""))
    salida = {"atleta": atleta,
              "actualizado": time.strftime("%Y-%m-%dT%H:%M:%S"),
              "perfil": datos.get("perfil") or previo.get("perfil"),
              "sesiones": sesiones}
    archivo.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    return len(sesiones)


def main():
    if "--prueba" in sys.argv:
        print(avisar_al_agente("[maraton] prueba del receptor"))
        return
    print(f"escuchando en 127.0.0.1:{PUERTO}/hook/… · atletas: {', '.join(VIGILAR) or '(ninguno)'}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador).serve_forever()


if __name__ == "__main__":
    main()
