# Maratón · plan de entrenamiento

App de bolsillo (PWA) para seguir un plan de maratón por **frecuencia cardíaca**.
Funciona sin cuenta y sin servidor: todo vive en el teléfono.

## Instalar en el celular

1. Abre la URL en Chrome (Android) o Safari (iPhone).
2. Android: menú ⋮ → **Instalar aplicación** / **Agregar a la pantalla principal**.
   iPhone: botón Compartir → **Añadir a pantalla de inicio**.
3. Ábrela desde el icono: arranca sin barra del navegador y **sin señal**.

## Qué trae

- **Hoy**: la semana en curso, las tres sesiones que tocan y las zonas de FC.
- **Plan**: las 21 semanas (km, tirada larga, trabajo de calidad).
- **Registro**: cada sesión con km, minutos, FC media y máxima; la app deduce la zona.
- **Agente**: el contrato para que cualquier IA lea y escriba el plan.

## Módulo para un agente de IA (desacoplado)

`agente.js` no toca el DOM: es la única puerta de datos. La interfaz es un cliente más.

```js
Agente.docs()                       // contrato completo en texto
Agente.atletas()                    // quién está en este teléfono
Agente.leer('jonah')                // plan, registro, ajustes, zonas
Agente.sesionDeHoy('jonah')         // qué toca hoy
Agente.registrar('jonah', {fecha:'2026-11-11', tipo:'facil', km:6, min:45,
                          fc_media:130, fc_max:142, esf:4})
Agente.zonas('jonah')               // FCmáx y las cinco zonas
Agente.perfil('jonah', {nombre:'Ana', edad:35, fcmax:190})   // otra persona, mismo plan
Agente.ajustarSemana('jonah', 7, {motivo:'gripe'})           // baja la carga
Agente.exportar('jonah')            // paquete JSON
Agente.importar(paquete)            // cargar de otro teléfono
Agente.webhook('https://mi-agente/maraton')                  // cada cambio se POSTea
```

Cuatro puertas, sin instalar nada:

1. **Consola del navegador** — `window.Agente`.
2. **URL** — `.../index.html#agent=<base64url(JSON exportado)>` carga el perfil y el registro y limpia el hash.
3. **Webhook** — la app manda el estado completo en cada cambio (`POST`, JSON).
4. **Importar/exportar** — archivo JSON de ida y vuelta.

Clave de almacenamiento: `maraton.v1` en `localStorage`.
Estado: `{api, registro:{jonah,yuli}, ajustes:{jonah,yuli}, perfiles:{}, webhook}`.

### Ejemplo que ya corre

`ejemplos/puente-hermes.js` carga el módulo en Node con un `window` mínimo y hace el recorrido
completo: leer a los atletas, ver qué toca hoy, anotar una sesión, escribir mal a propósito para
ver cómo rechaza, y ajustar una semana con su motivo.

```
node ejemplos/puente-hermes.js
```

Ese archivo es la plantilla: se cambia la ruta de `require('../agente.js')` por donde viva el
módulo y el agente ya tiene el plan en la mano.

### Pasarle la app a otra persona

Se cambia el nombre y la FC máxima: las cinco zonas se recalculan solas.
`Reiniciar` deja el lugar en blanco para que otro empiece de cero.

## Zonas (manda el pulso, el ritmo es referencia)

| Zona | % FC máx | Para qué |
|---|---|---|
| Z1 | 60–65 % | calentar, recuperar |
| Z2 | 65–75 % | fácil y tirada larga: se puede hablar en frases |
| Z3 | 75–82 % | tempo suave |
| Z4 | 83–88 % | tempo fuerte |
| Z5 | 89–93 % | intervalos, no se puede hablar |

En cuesta sube el pulso con el mismo esfuerzo (6–8 % de pendiente: +15–25 ppm):
si te pasas del techo, **se camina**. El ritmo solo sirve de referencia.

## Archivos

- `index.html` — interfaz (mobile-first, tema oscuro).
- `agente.js` — módulo de datos, sin dependencias. Aquí se incrusta el plan.
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — lo que la hace instalable y offline.
- `ejemplos/puente-hermes.js` — ejemplo ejecutable de un agente leyendo y escribiendo el plan.
