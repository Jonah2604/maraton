"""Prueba del camino completo que usa el teléfono: HTTPS del tailnet -> proxy /maraton -> receptor.

Conecta a la IP del tailnet pero manda el nombre SNI/Host correcto (desde esta PC el nombre
no resuelve por MagicDNS). Silencioso si todo contesta 200/204; imprime si algo falla.
"""
import re
import socket
import ssl
import sys
from pathlib import Path

SECRETO_BAT = Path(r"C:/Users/chris/AppData/Local/hermes/scripts/maraton_receptor.bat")
CERT = Path(r"C:/Users/chris/AppData/Local/hermes/cache/scratch/c.pem")
HOST = "desktop-td96g5o.tail90ea86.ts.net"
IP = "100.69.153.74"


def secreto():
    m = re.search(r"MARATON_SECRETO=(\S+)", SECRETO_BAT.read_text(errors="ignore"))
    return m.group(1).strip() if m else ""


def pedir(path, method="GET", body=None, timeout=15):
    ctx = ssl.create_default_context(cafile=str(CERT) if CERT.exists() else None)
    raw = socket.create_connection((IP, 443), timeout=timeout)
    tls = ctx.wrap_socket(raw, server_hostname=HOST)
    req = (f"{method} {path} HTTP/1.1\r\nHost: {HOST}\r\n"
           + ("Content-Type: application/json\r\n" if body else "")
           + (f"Content-Length: {len(body)}\r\n" if body else "")
           + "Connection: close\r\n\r\n")
    tls.sendall(req.encode() + (body or b""))
    datos = b""
    while True:
        trozo = tls.recv(65536)
        if not trozo:
            break
        datos += trozo
    tls.close()
    estado = int(datos.split(b"\r\n")[0].split(b" ")[1])
    return estado, datos.partition(b"\r\n\r\n")[2][:120]


if __name__ == "__main__":
    s = secreto()
    fallos = []
    for path, metodo, cuerpo in (
        (f"/maraton/feedback/{s}/jonah", "GET", None),
        (f"/maraton/hook/{s}", "POST", b'{"atleta":"prueba","sesiones":[]}'),
        (f"/maraton/hook/{s}", "OPTIONS", None),
    ):
        try:
            estado, _ = pedir(path, metodo, cuerpo)
            if estado not in (200, 204):
                fallos.append(f"{metodo} {path[:24]} -> {estado}")
        except Exception as e:
            fallos.append(f"{metodo} {path[:24]} -> {type(e).__name__}")
    if fallos:
        print("FALLA el camino del celular:", "; ".join(fallos))
        sys.exit(1)
