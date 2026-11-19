"""Levanta el receptor de la app si el puerto 8788 esta vacio. Pensado para un cron.

Silencioso cuando todo esta bien; imprime solo cuando arranca algo o falla.
"""
import subprocess
import sys

PUERTO = "8788"
TAREA = "Maraton_Receptor"


def escuchando():
    r = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, errors="ignore")
    return any(f"127.0.0.1:{PUERTO}" in l and "LISTENING" in l for l in r.stdout.splitlines())


if escuchando():
    sys.exit(0)

subprocess.run(["schtasks", "/run", "/tn", TAREA], capture_output=True, text=True)
print("receptor estaba apagado: se lanzo la tarea", TAREA)
