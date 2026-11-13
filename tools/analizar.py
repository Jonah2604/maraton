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
TECHOS = {"jonah": 134, "yuli": 136}          # techo de Z2, de las notas de zonas
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
        return {k: v for k, v in d["atletas"].items()}, d.get("registro", {})
    if "atleta" in d:                        # export de un atleta
        aid = d["atleta"].get("id")
        return {aid: {**d["atleta"], "semanas": d.get("semanas", [])}}, {aid: d.get("registro", [])}
    raise SystemExit("no reconozco el JSON: falta 'atletas' o 'atleta'")


def analiza(aid, plan, registro, hoy, forzar_semana=None):
    semanas = {s["n"]: s for s in plan.get("semanas", [])}
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

    return {"atleta": aid, "semana": n, "fechas": sem.get("fechas"), "plan": sem, "hecho": esta,
            "km": km, "km_prev": km_prev, "pct": pct, "faltan": faltan,
            "fc_alta": [r["fecha"] for r in fc_alta],
            "calurosas": [{"fecha": r["fecha"], "temp": r["temp"]} for r in calurosas],
            "molestias": [r.get("molestia") for r in molestias],
            "banderas": banderas, "decision": decision, "cambios": cambios,
            "siguiente": sig.get("n") if sig else None}


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
