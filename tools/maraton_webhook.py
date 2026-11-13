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
import shutil
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PUERTO = int(os.environ.get("MARATON_PUERTO", "8787"))
SECRETO = os.environ.get("MARATON_SECRETO", "").strip()
VIGILAR = [a.strip().lower() for a in os.environ.get("MARATON_ATLETAS", "jonah").split(",") if a.strip()]
DESTINO = os.environ.get("MARATON_DESTINO", "telegram")
CACHE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "hermes" / "cache" / "maraton"
LOG = CACHE / "avisos.jsonl"


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


class Manejador(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):  # silencio: el log util es el jsonl
        pass

    def _responder(self, codigo: int, obj: dict):
        cuerpo = json.dumps(obj).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_OPTIONS(self):
        # La app manda mode:'no-cors', pero un navegador de prueba si pide preflight.
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        ruta = self.path.split("?")[0].rstrip("/")
        partes = [p for p in ruta.split("/") if p]
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
            (CACHE / "ultimo.json").write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")

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
            avisar_al_agente(texto[:900])
        return self._responder(200, {"ok": True, "atleta": atleta})


def main():
    if "--prueba" in sys.argv:
        print(avisar_al_agente("[maraton] prueba del receptor"))
        return
    print(f"escuchando en 127.0.0.1:{PUERTO}/hook/… · atletas: {', '.join(VIGILAR) or '(ninguno)'}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador).serve_forever()


if __name__ == "__main__":
    main()
