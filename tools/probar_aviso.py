# Prueba del POST tal como lo manda el telefono: TLS al tailnet con SNI/Host del nombre,
# cabeceras CORS de origen github.io, y se mide cuanto tarda en volver la respuesta.
import socket, ssl, time, json, re, pathlib

HOST = "desktop-td96g5o.tail90ae86.ts.net"
IP = "100.69.153.74"
ORIGEN = "https://jonah2604.github.io"

bat = pathlib.Path(r"C:/Users/chris/AppData/Local/hermes/scripts/maraton_receptor.bat")
sec = ""
m = re.search(r"MARATON_SECRETO=([^\r\n\"]+)", bat.read_text(encoding="utf-8", errors="ignore"))
if m:
    sec = m.group(1).strip()

# Con el cert del nodo en cafile y verificacion normal el handshake si entra; con
# CERT_NONE el proxy de tailscale contesta TLSV1_ALERT_INTERNAL_ERROR (falso negativo).
CA = pathlib.Path(r"C:/Users/chris/AppData/Local/hermes/cache/scratch/t.crt")
ctx = ssl.create_default_context(cafile=str(CA))
ctx.set_alpn_protocols(["h2", "http/1.1"])


def peticion(metodo, ruta, cuerpo=None):
    t0 = time.time()
    s = socket.create_connection((IP, 443), timeout=20)
    ss = ctx.wrap_socket(s, server_hostname=HOST)
    cab = [f"{metodo} {ruta} HTTP/1.1", f"Host: {HOST}", f"Origin: {ORIGEN}",
           "Accept: */*", "Connection: close"]
    datos = b""
    if cuerpo is not None:
        datos = json.dumps(cuerpo).encode()
        cab += ["Content-Type: application/json", f"Content-Length: {len(datos)}"]
    ss.sendall(("\r\n".join(cab) + "\r\n\r\n").encode() + datos)
    trozos = []
    while True:
        b = ss.recv(4096)
        if not b:
            break
        trozos.append(b)
    ss.close()
    crudo = b"".join(trozos).decode("utf-8", "replace")
    dt = time.time() - t0
    estado = crudo.split("\r\n", 1)[0]
    cabeceras = crudo.split("\r\n\r\n", 1)[0]
    acao = [l for l in cabeceras.split("\r\n") if l.lower().startswith("access-control")]
    print(f"{metodo} {ruta} -> {estado} | {dt*1000:.0f} ms | {acao}")
    return dt


if not sec:
    raise SystemExit("no encontre el secreto")

peticion("OPTIONS", f"/maraton/hook/{sec}")
peticion("POST", f"/maraton/hook/{sec}", {"api": "prueba", "atleta": "jonah", "sesiones": []})
