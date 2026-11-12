# Manual: usar la app del plan con tu propio agente Hermes

Para el agente Hermes que acompaña a un corredor nuevo (no Jonah ni Yuli).
Sigue los pasos en orden. No improvises: cada paso está probado.

---

## 0. Qué es esto

Una app web (PWA) que guarda el plan de entrenamiento **en el teléfono del corredor**, sin cuentas ni
servidor. El plan lo arma la app a partir de los datos del corredor y la meta que elija.

- URL: https://jonah2604.github.io/maraton/
- Repo: https://github.com/Jonah2604/maraton
- Tu trabajo como agente: cargar el skill de coach, pedirle los datos a la persona, y armarle el plan.

---

## 1. Carga los skills (obligatorio)

En tu Hermes:

```
skill_view(name='running-coach')
skill_view(name='maraton-app')
```

`running-coach` trae las reglas de entrenamiento (zonas, rampas, descargas, cuándo cortar).
`maraton-app` trae cómo está construida la app, el contrato de datos y las trampas ya conocidas.

Si no existen en tu instalación, pídelas así:

```
Copia estos dos skills del repo https://github.com/Jonah2604/hermes-skills
a mi carpeta de skills y recárgalos.
```

Si tampoco están ahí, dilo y se los paso por archivo. **No sigas sin ellos**: sin las reglas de
`running-coach` vas a inventar un plan que puede lastimar a la persona.

---

## 2. Pide los datos (una sola vez, conversando)

Pregunta de a poco, en este orden. Si la persona no sabe algo, anótalo como `null` y sigue: el plan
se puede armar sin todo, pero hay tres datos que sí o sí hacen falta.

**Obligatorios:**

| Dato | Campo | Por qué |
|---|---|---|
| Nombre | `nombre` | Es el id del corredor |
| Meta | `objetivo` | `5k`, `10k`, `21k`, `42k` o `base` |
| Edad o FC máxima | `edad` / `fcmax` | Sin esto no hay zonas de pulso |
| Cuántos días puede entrenar | `dias` (2 a 6) | El plan se arma alrededor de la vida real |
| ¿Aguanta 20 minutos corriendo seguido? | `conversacion` (`true`/`false`) | Decide si empieza en base o directo a la meta |
| Historial | `historial` | `ninguno`, `algo` o `constante` |

**Recomendados (mejoran el plan):**

| Dato | Campo | Qué cambia |
|---|---|---|
| Peso y altura | `kg`, `cm` | IMC: recorta el paso (caminata intercalada), no el volumen |
| Minutos disponibles por sesión | `min` | Tope de duración; por defecto 40 |
| FC en reposo (al despertar) | `fc_reposo` | Zonas por reserva (Karvonen), más precisas |
| Molestias o lesiones previas | `molestias` | Frena el aumento de volumen |
| Fecha de inicio | `inicio` | Por defecto el lunes de esta semana |

**Cómo preguntar** (no lo hagas como formulario, hazlo como entrenador):

> «¿Cuál es tu meta: 5k, 10k, medio maratón o maratón completo?»
> «¿Cuántos días a la semana puedes salir a entrenar, y cuánto tiempo tienes por sesión?»
> «¿Ya puedes trotar 20 minutos seguidos sin parar, o todavía no?»
> «¿Has corrido de forma constante en el último año, algo suelto, o nada?»
> «¿Cuántos años tienes? ¿Sabes tu pulso máximo? Si no, lo estimo con tu edad.»
> «¿Peso y estatura? Sirve para ajustar el paso, no para juzgar.»
> «¿Alguna lesión, molestia de rodilla, espalda, tobillo?»
> «¿Tienes reloj que mida pulso? ¿Sabes cuánto marcas en reposo al despertar?»

---

## 3. Arma el plan

Con los datos, llama:

```js
Agente.semilla({
  nombre: "María López",
  objetivo: "21k",
  edad: 38, kg: 82, cm: 175,
  fcmax: null,            // si no la sabe, pon null y usa edad
  fc_reposo: 62,
  dias: 3, min: 50,
  conversacion: true,     // ¿aguanta 20 min corriendo?
  historial: "poco",      // ninguno | poco | algo | constante
  molestias: "",
  inicio: "2026-11-16"
})
```

Devuelve:

```js
{ ok: true, id: "maria-lopez", objetivo: "21k", inicio: "2026-11-16",
  semanas_total: 16, km_declarado: 24.1, imc: 26.8, nivel: "algo",
  fcmax: 181, base: false, semanas: [ {n:1, km:17.3, larga:4.5, filas:[...]}, ... ] }
```

Si devuelve `{ok:false, faltan:["fcmax","nivel"]}`, **pregunta exactamente esos datos** y vuelve a
llamar. No los rellenes tú.

### Qué hace el generador (para que sepas qué esperar)

- **Semanas por meta:** base 6, 5k 10, 10k 12, medio 16, maratón 20.
- Volumen sube ~10 % por semana, con **descarga cada 4 semanas** y **bajada antes de la carrera**.
- **La carrera final es la sesión larga** de esa semana.
- La larga no pasa del 32 % del volumen semanal.
- Sesiones prescritas **por zona de pulso y tiempo**, nunca por ritmo inventado.
- Si no aguanta 20 minutos seguidos → 6 semanas de **trote-caminata** antes de la meta.
- IMC alto o molestias → misma duración, con pausas de caminata.

---

## 4. Cómo llegar a la app

Tres caminos. Elige según lo que puedas hacer:

**A. La persona lo hace en su teléfono (lo más simple).** Abre la URL, toca **⚙ Ajustes → Agregar otro
corredor**, llena el formulario con los datos del paso 2 y toca **Crear**. La app arma el plan sola con
la misma lógica. Después: menú de Chrome → «Instalar app».

**B. Tú armas el JSON y se lo mandas por WhatsApp.** Aquí el paquete tiene que entrar a la app:

```python
import json, base64
paquete = {"api": "plan-maraton/v1", "atleta": {...}, "plan": {...}, "registro": []}
b = base64.urlsafe_b64encode(json.dumps(paquete).encode()).decode().rstrip("=")
print("https://jonah2604.github.io/maraton/#agent=" + b)
```

Le mandas ese link y lo abre. La app importa y limpia el hash.

**C. Controlas el navegador de la persona.** Abre la app y llama `Agente.semilla(...)`,
`Agente.crearCorredor(...)`, `Agente.registrar(...)` desde la consola o con computer use.

---

## 5. Contrato de datos (lo que puedes leer y escribir)

Todo vive en `window.Agente`. Cada función devuelve `{ok, ...}`.

**Leer:**
```
Agente.objetivos()                  -> metas disponibles con semanas y km
Agente.corredores()                 -> todos los corredores con su plan
Agente.leer(id)                     -> { atleta, semanas, registro, ajustes }
Agente.zonas(id)                    -> { fcmax, fc_reposo, zonas:{Z1:[lo,hi],...}, __modo }
Agente.sesionDeHoy(id)              -> qué toca hoy
Agente.ficha(id, tipo, fecha)       -> ficha completa de una sesión
Agente.balance(id)                  -> km hechos, % del plan, pendientes
```

**Escribir:**
```
Agente.semilla(o)                   -> arma el plan SIN guardarlo (vista previa)
Agente.crearCorredor(o)             -> arma y guarda
Agente.registrar(id, sesion)        -> anota una sesión hecha
Agente.borrar(id, fecha, tipo)      -> borra una sesión
Agente.ajustarSemana(id, n, {...}, "razón")  -> edita una semana, con motivo
Agente.perfil(id, {nombre, edad, fcmax, fc_reposo, meta})  -> perfil y zonas
Agente.guardarPlan(id, semanas)     -> reemplaza el plan completo
Agente.exportar(id) / Agente.importar(json)
```

**Sesión válida:**
```js
{fecha:"2026-11-12", tipo:"facil", km:5, min:38,
 fc_media:140, fc_max:150, esf:5, molestia:""}
```
`tipo`: `calidad | facil | larga | fuerza | carrera | otro`. Límites: FC 30-230, km 0-120, min 1-1440, esf 1-10.
Dos sesiones del mismo tipo el mismo día se rechazan.

---

## 6. Cómo dar seguimiento (esto es lo que hace que el plan sirva)

Cada vez que hablen:

1. `Agente.sesionDeHoy(id)` → qué le tocaba.
2. Pregunta cómo le fue: km, minutos, pulso medio, esfuerzo del 1 al 10, molestias.
3. `Agente.registrar(id, {...})` con lo que te diga.
4. `Agente.balance(id)` → compara con el plan y dile en una frase cómo va.

**Antes de tocar la semana, lee el campo libre del corredor:**

```js
Agente.leerNotas(id)
// { ok:true, notas:[{fecha:"2026-11-12", semana:1, texto:"El jueves juego fútbol...",
//   tipo:"evento", dias_bloqueados:[4], quiere_mas_dias:null}] }
```

Ahí escribe lo que la app no sabe: que el jueves juega fútbol, que va a llover, que quiere un día más.
`dias_bloqueados` son días que **no** se programan (se mueve la sesión, no se borra).
`quiere_mas_dias` viene con `sugerencia` ya calculada. Si el corredor te lo cuenta en el chat, guárdalo
tú con `Agente.nota(id, "texto", "evento")` para que no se pierda.

**Reglas de ajuste (de `running-coach`, consúltalas antes de cambiar nada):**

- Semana al ≥95 % sin molestias → sube como estaba previsto.
- Semana al 70-95 % → repite el volumen, no subas.
- Semana <70 % o faltó la larga → baja 10 % y sin calidad nueva.
- Se pasó >115 % → no sube, y recorta 10 %.
- Molestia seria → **congela** el volumen y manda a revisión médica. No negocies eso.

---

## 6.1 Temperatura: no culpes al corredor del calor

El CSV por actividad de Garmin trae la columna **`Temperatura media`** (la lista resumida de Progreso **no** la trae).
La app la guarda en `temp` al importar y la muestra en la ficha. Antes de calificar una sesión de rápida:

- **A partir de 27 grados el pulso sube solo.** Sube el techo de Z2 un grado por grado arriba de 22 (máximo +8).
  A 31 grados un techo de 134 pasa a 142: ese pulso alto no es falta de control.
- **Si no hay temperatura, no la inventes.** Se dice «sin dato de temperatura» y se califica con lo que hay.
- **El pronóstico no se consulta para armar la semana.** El clima entra por el campo libre del corredor
  (`Agente.leerNotas`), no por una API.

## 7. Trampas conocidas (no las repitas)

- **`cargar()` exige al menos 4 semanas.** Un plan de 16 funciona; uno inventado de 2 se descarta.
- **El service worker sirve copia vieja.** Si un cambio no aparece: cerrar la app del todo y abrirla, o
  desregistrar el SW. No reescribas código que ya está bien.
- **`localStorage` es por navegador y por teléfono.** Si el corredor cambia de celular, exporta antes.
- **Ignorar las notas del corredor es el error más caro.** Si programaste el jueves y él juega fútbol,
  el plan queda mal y la confianza también.
- **No inventes ritmos.** El plan prescribe pulso y tiempo. Un ritmo en min/km solo sale de un registro
  real del corredor.
- **No copies el plan de otro corredor.** `semilla()` existe justo para eso.
- **El `confirm()` de borrar corredor cuelga la automatización** por CDP. Acepta el diálogo con
  `Page.handleJavaScriptDialog` o verifica por `localStorage`, no por la pantalla.

---

## 8. Prueba rápida (hazla antes de decir que quedó)

```js
Agente.objetivos()                       // 5 metas
Agente.semilla({nombre:"Prueba", objetivo:"10k", edad:40, dias:3, min:40,
                conversacion:true, historial:"algo"})     // ok:true, ~12 semanas
Agente.semilla({objetivo:"10k"})         // ok:false con faltan:[...]
```

Si la primera devuelve `ok:true` y la segunda dice qué falta, el puente está sano.

---

## 9. Si algo falla

Dile a la persona: *«abre https://jonah2604.github.io/maraton/ y dime qué ves en pantalla»*.
Con eso y `Agente.corredores()` sabes si es la app o los datos. Reporta el error tal cual, sin
inventar la causa.
