// Ejemplo de puente entre la app de maratón y un agente de IA (por ejemplo, un Hermes).
//
// La app guarda todo en el navegador, pero la lógica de datos vive en `agente.js`, que no toca
// el DOM. Ese módulo se puede cargar en Node con un `window` mínimo, como se hace aquí: así un
// agente puede leer el plan, anotar una sesión o ajustar una semana sin abrir el navegador.
//
// Uso:
//     node ejemplos/puente-hermes.js
//
// Para un agente real: se importa `agente.js` de la misma forma y se llaman sus métodos. Si el
// agente corre fuera del teléfono, el intercambio es el JSON de `Agente.exportar()` /
// `Agente.importar()`, o el webhook que la app manda en cada cambio.

// --- 1. Entorno mínimo para cargar el módulo fuera del navegador ---
// `agente.js` pregunta por `window.location.hash` al arrancar. Si no existe `localStorage`,
// el módulo trabaja en memoria: por eso este script se puede correr sin navegador.
global.window = { location: { hash: '' } };
require('../agente.js');
const A = global.window.Agente;

const mostrar = (etiqueta, valor) => console.log(etiqueta.padEnd(24), JSON.stringify(valor));
const HOY = '2026-11-11';

// --- 2. Leer: quién está y qué toca ---
mostrar('atletas', A.atletas());                    // Jonah y Yuli, con su FC máxima
mostrar('semanas de jonah', A.leer('jonah').semanas.length);
mostrar('semana de hoy', A.semanaDe(HOY));
mostrar('sesion de hoy', A.sesionDeHoy('jonah', HOY));
mostrar('zonas', A.zonas('jonah'));

// --- 3. Escribir: anotar una sesión hecha ---
mostrar('registrar', A.registrar('jonah', {
  fecha: HOY, tipo: 'facil', km: 4, min: 32, fc_media: 128, fc_max: 140, esf: 4,
}));

// El módulo rechaza lo que no cuadra, y dice por qué: aquí un pulso imposible y un día repetido.
mostrar('fc fuera de rango', A.registrar('jonah', { fecha: HOY, tipo: 'larga', fc_media: 400 }));
mostrar('duplicado', A.registrar('jonah', { fecha: HOY, tipo: 'facil', km: 3 }));

// --- 4. Cada atleta tiene su propio registro ---
mostrar('registro de yuli', A.leer('yuli').registro.length);

// --- 5. Ajustar el plan exige un motivo: así queda escrito por qué se bajó la carga ---
mostrar('ajuste sin razon', A.ajustarSemana('jonah', 5, { km: 24 }));
mostrar('ajuste con razon', A.ajustarSemana('jonah', 5, { km: 24 }, 'semana limpia'));

// --- 6. El contrato completo, en texto, para dárselo a otro agente ---
mostrar('lineas del contrato', A.docs().split('\n').length);
