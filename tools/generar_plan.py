"""Regenera las 21 semanas de la app desde el vault (fuente de verdad).

Uso:
  python generar_plan.py --check     # compara vault contra agente.js, no escribe
  python generar_plan.py             # escribe agente.js + sube version del service worker

Lee las tablas "## Las 21 semanas" de:
  Obsidian/02 - Proyectos/Maraton - plan 21 semanas.md   (jonah)
  Obsidian/02 - Proyectos/Maraton - plan de Yuli.md      (yuli)
y las inyecta en `var PLANES_BASE = {...};` de agente.js, conservando el resto
(edad, fcmax, zonas, meta, carrera) tal como esta en la app.
"""
import json
import re
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
AGENTE = APP / "agente.js"
SW = APP / "sw.js"
VAULT = Path(r"C:\Users\chris\Documents\Obsidian\Jonah\02 - Proyectos")

NOTAS = {
    "jonah": VAULT / "Maraton - plan 21 semanas.md",
    "yuli": VAULT / "Maraton - plan de Yuli.md",
}

FILA = re.compile(r"^\|\s*(\d{1,2})\s*\|")


def semanas_de(nota: Path):
    """Devuelve la lista de semanas de la tabla del plan, o lanza ValueError."""
    texto = nota.read_text(encoding="utf-8")
    m = re.search(r"^## Las 21 semanas\s*$(.*?)(?=^## )", texto, re.M | re.S)
    if not m:
        raise ValueError(f"sin seccion 'Las 21 semanas' en {nota.name}")
    semanas = []
    for linea in m.group(1).splitlines():
        if not FILA.match(linea):
            continue
        celdas = [c.strip() for c in linea.strip().strip("|").split("|")]
        if len(celdas) < 6:
            raise ValueError(f"fila con {len(celdas)} columnas: {linea}")
        n, fechas, km, larga, calidad, nota_sem = celdas[:6]
        semanas.append({
            "n": int(n),
            "fechas": fechas,
            "km": float(km.replace(",", ".")) if re.match(r"^[\d.,]+$", km) else None,
            "larga": float(larga.replace(",", ".")) if re.match(r"^[\d.,]+$", larga) else None,
            "calidad": calidad,
            "nota": nota_sem,
        })
    if len(semanas) != 21 or [s["n"] for s in semanas] != list(range(1, 22)):
        raise ValueError(f"{nota.name}: {len(semanas)} semanas, se esperan 21 en orden")
    return semanas


def cargar_planes():
    texto = AGENTE.read_text(encoding="utf-8")
    m = re.search(r"var PLANES_BASE = (\{.*?\});\s*// generado", texto, re.S)
    if not m:
        raise ValueError("no encontre 'var PLANES_BASE = {...};' en agente.js")
    return texto, m, json.loads(m.group(1))


def main():
    check = "--check" in sys.argv
    texto, m, planes = cargar_planes()
    cambios = []
    for atleta, nota in NOTAS.items():
        if atleta not in planes.get("atletas", {}):
            print(f"AVISO: {atleta} no esta en PLANES_BASE")
            continue
        nuevas = semanas_de(nota)
        previas = planes["atletas"][atleta].get("semanas", [])
        for p, n in zip(previas, nuevas):
            if p != n:
                cambios.append((atleta, n["n"], p, n))
        planes["atletas"][atleta]["semanas"] = nuevas
        planes["atletas"][atleta]["km_declarado"] = round(
            sum(s["km"] for s in nuevas if s["n"] <= 20), 1)
        planes["generado"] = planes.get("generado")

    if not cambios:
        print("sin diferencias: la app ya refleja el vault")
        return 0

    print(f"{len(cambios)} semana(s) distintas:")
    for atleta, n, p, nn in cambios:
        print(f"\n{atleta} sem {n}")
        for campo in ("fechas", "km", "larga", "calidad", "nota"):
            if p.get(campo) != nn.get(campo):
                print(f"  {campo}: {p.get(campo)!r} -> {nn.get(campo)!r}")

    if check:
        print("\n(--check: no se escribio nada)")
        return 0

    nuevo = json.dumps(planes, ensure_ascii=False, separators=(",", ":"))
    AGENTE.write_text(texto[:m.start(1)] + nuevo + texto[m.end(1):], encoding="utf-8")

    # sube la version del service worker para que el telefono baje el plan nuevo
    sw = SW.read_text(encoding="utf-8")
    vm = re.search(r"maraton-v(\d+)", sw)
    if vm:
        v = int(vm.group(1)) + 1
        SW.write_text(re.sub(r"maraton-v\d+", f"maraton-v{v}", sw), encoding="utf-8")
        print(f"\nescrito agente.js y sw.js -> maraton-v{v}")
    else:
        print("\nescrito agente.js (sw.js sin VERSION reconocible)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
