"""Prueba de regresion del coach: los fallos que ya nos costaron una tarde no vuelven.

Cubre lo que se rompio de verdad:
  1. Un telefono que manda el aviso sin sesiones (su historial vive en la PC) debe recibir
     analisis nuevo, no el de ayer.
  2. Un aviso sin notas no puede borrar las notas guardadas del export.
  3. Los mismos datos dos veces no vuelven a pagar el modelo: la segunda sale con
     `sin_cambios` y la tarjeta lo dice.
  4. Sin llave, sin cuota o con la nube caida, el analisis sale igual (por calculo) y la
     tarjeta dice por que, en vez de quedarse muda.

Se corre sin tocar nada real: cache temporal y MARATON_COACH=0 para el flujo de datos.
Uso:  python tools/prueba_coach.py        (exit 0 = todo bien)
"""
import json
import os
import pathlib
import shutil
import sys
import tempfile

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
os.environ["MARATON_COACH"] = "0"

import maraton_webhook as w                                    # noqa: E402
import coach_ia                                                # noqa: E402

REAL = pathlib.Path(os.environ.get("LOCALAPPDATA", "")) / "hermes" / "cache" / "maraton"
fallos = []


def revisar(nombre, condicion, detalle=""):
    print(("  ok   " if condicion else "  FALLA") + "  " + nombre + ("  " + detalle if detalle else ""))
    if not condicion:
        fallos.append(nombre)


def cache_nueva():
    """Cache temporal con los datos reales de yuli como punto de partida."""
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="prueba_coach_"))
    for nombre in ("respaldo_yuli.json", "export_yuli.json"):
        origen = REAL / nombre
        if origen.exists():
            shutil.copy(origen, tmp / nombre)
    w.CACHE = tmp
    (tmp / "feedback_yuli.json").unlink(missing_ok=True)
    return tmp


def aviso_vacio(tmp):
    """Lo que manda un telefono sin sesiones propias: atleta, sin sesiones y sin plan."""
    return w.analizar("yuli", {"perfil": {}, "plan": {}, "sesiones": [], "notas": []})


def principal():
    print("1) aviso vacio: se completa con el respaldo y da analisis nuevo")
    tmp = cache_nueva()
    revisar("el analisis corre", aviso_vacio(tmp) is True)
    fb = json.loads((tmp / "feedback_yuli.json").read_text(encoding="utf-8"))
    revisar("hay lectura", bool(fb.get("lectura")), "%d frases" % len(fb.get("lectura") or []))
    revisar("hay preguntas", bool(fb.get("preguntas")), str(fb.get("preguntas"))[:60])
    revisar("guarda huella", bool(fb.get("huella")))

    print("2) aviso sin notas no borra las notas del export")
    export = json.loads((tmp / "export_yuli.json").read_text(encoding="utf-8"))
    export["notas"] = [{"fecha": "2026-11-21", "texto": "dormi poco y tome vino"}]
    (tmp / "export_yuli.json").write_text(json.dumps(export, ensure_ascii=False), encoding="utf-8")
    aviso_vacio(tmp)
    export = json.loads((tmp / "export_yuli.json").read_text(encoding="utf-8"))
    revisar("las notas siguen ahi", len(export.get("notas") or []) == 1,
            str(len(export.get("notas") or [])))
    respaldo = json.loads((tmp / "respaldo_yuli.json").read_text(encoding="utf-8"))
    revisar("las sesiones siguen ahi", len(export.get("registro") or []) == len(respaldo["sesiones"]),
            "%d de %d" % (len(export.get("registro") or []), len(respaldo["sesiones"])))

    print("3) mismos datos dos veces no pagan el modelo otra vez")
    import contextlib
    import io
    fb1 = json.loads((tmp / "feedback_yuli.json").read_text(encoding="utf-8"))
    dicho = io.StringIO()
    with contextlib.redirect_stdout(dicho):
        aviso_vacio(tmp)
    fb2 = json.loads((tmp / "feedback_yuli.json").read_text(encoding="utf-8"))
    revisar("no se volvio a analizar", "feedback listo" not in dicho.getvalue(),
            dicho.getvalue().strip()[:70])
    revisar("la segunda dice sin_cambios", fb2.get("sin_cambios") is True,
            str(fb2.get("sin_cambios")))
    revisar("conserva la lectura", fb2.get("lectura") == fb1.get("lectura"))
    revisar("conserva las preguntas", fb2.get("preguntas") == fb1.get("preguntas"))
    revisar("la marca de tiempo no retrocede", fb2.get("t", 0) >= fb1.get("t", 0))

    print("4) la nube falla: el analisis sale y la tarjeta dice por que")
    datos = {"notas": [{"fecha": "2026-11-22", "texto": "dormi 5 horas"}], "hecho": [], "km": 0}
    original = coach_ia.urllib.request.urlopen

    def cae(codigo):
        def f(*a, **k):
            if codigo == "net":
                raise coach_ia.urllib.error.URLError("sin red")
            raise coach_ia.urllib.error.HTTPError("u", codigo, "x", None, None)
        return f

    casos = [("sin llave", None, None, "sin llave de modelo"),
             ("sin cuota", 402, "x", "sin cuota"),
             ("cuota agotada", 429, "x", "cuota agotada o demasiadas peticiones"),
             ("caida de red", "net", "x", "no hubo respuesta a tiempo")]
    for nombre, codigo, llave, esperado in casos:
        coach_ia.llave = lambda llave=llave: llave
        coach_ia.urllib.request.urlopen = cae(codigo) if codigo is not None else original
        lec, toc, pre = coach_ia.coach(datos)
        revisar("%s: no inventa lectura" % nombre, not lec and not toc)
        revisar("%s: motivo '%s'" % (nombre, esperado), coach_ia.motivo() == esperado,
                "dijo '%s'" % coach_ia.motivo())
    coach_ia.urllib.request.urlopen = original

    print("5) respuesta rara del modelo: se descarta y se explica")

    class Falsa:
        def __init__(self, texto):
            self.texto = texto

        def read(self):
            return json.dumps({"choices": [{"message": {"content": self.texto}}]}).encode()

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    coach_ia.llave = lambda: "x"
    coach_ia.urllib.request.urlopen = lambda *a, **k: Falsa(
        "PREGUNTA: ¿dormiste bien?" + chr(10) +
        "Corriste 999 km a 3:10 y rompiste el record mundial.")
    lec, toc, pre = coach_ia.coach(datos)
    coach_ia.urllib.request.urlopen = original
    revisar("no se cuela la cifra inventada", not any("999" in x for x in lec), str(lec)[:80])
    revisar("la pregunta si viaja", bool(pre), str(pre)[:60])
    revisar("dice por que no hay lectura",
            coach_ia.motivo() == "la respuesta no se pudo sostener con los datos", coach_ia.motivo())


if __name__ == "__main__":
    try:
        principal()
    except Exception as fallo:
        import traceback
        traceback.print_exc()
        fallos.append("excepcion: %s" % type(fallo).__name__)
    print()
    if fallos:
        print("FALLARON %d revisiones: %s" % (len(fallos), ", ".join(fallos)))
        sys.exit(1)
    print("todo bien")
