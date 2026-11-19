// Prueba del plan con modelo en la nube: nada del modelo entra sin filtrarse.
// No llama a ningun servicio: se le dan respuestas crudas y se revisa que la app las acepte o las tire.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, 'agente.js'), 'utf8');
const memoria = {};
const ctx = {
  console, JSON, Math, Date, Promise, String, Number, Object, Array, isNaN, parseFloat, parseInt,
  setTimeout, clearTimeout, fetch: () => Promise.reject(new Error('no red en la prueba')),
  localStorage: { getItem: k => (k in memoria ? memoria[k] : null), setItem: (k, v) => { memoria[k] = String(v); },
                  removeItem: k => { delete memoria[k]; } },
  document: { createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }), addEventListener() {} },
  location: { href: 'http://x/', hash: '' }, history: { replaceState() {} },
  CustomEvent: function () {}, navigator: {}, alert() {}, prompt() {}
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const A = ctx.window.Agente;

let fallos = 0;
function ok(cond, nombre) { if (cond) console.log('ok   ' + nombre); else { console.log('FALLA ' + nombre); fallos++; } }

const c = A.crearCorredor({ nombre: 'Prueba IA', edad: 34, kg: 70, cm: 172, fcmax: 185, fc_reposo: 56,
  historial: 'poco', corre20: true, conversacion: true, dias: 4, min: 40, objetivo: '10k', inicio: '2026-11-16' });
ok(c && c.ok, 'se crea el corredor de prueba');
const id = c.atleta || c.id;

const carga = A.pedirPlanIA.length ? A._carga(id, 2) : null;
ok(carga && carga.semana === 2 && carga.plan_km > 0, 'la carga para el modelo trae la semana y su km');
ok(carga && JSON.stringify(carga).indexOf('Prueba IA') < 0, 'la carga no lleva el nombre del corredor');

const kmPlan = carga.plan_km;
const buena = { semana: 2, filas: [
  { tipo: 'facil', km: Math.round(kmPlan * 0.3 * 10) / 10, min: 40 },
  { tipo: 'calidad', km: Math.round(kmPlan * 0.25 * 10) / 10, min: 30 },
  { tipo: 'larga', km: Math.round(kmPlan * 0.4 * 10) / 10, min: 70 }
], nota: 'Semana corta, sin prisa.' };

const f1 = A.filtrarPlanIA(buena, id, 2);
ok(f1.ok === true, 'acepta una semana razonable');
ok(f1.ok && f1.larga > 0, 'conserva la larga');

ok(A.filtrarPlanIA({ filas: [{ tipo: 'facil', km: kmPlan, min: 60 }, { tipo: 'larga', km: kmPlan, min: 90 }] }, id, 2).ok === false,
  'rechaza subir mas del 20 % del volumen');
ok(A.filtrarPlanIA({ filas: [{ tipo: 'facil', km: 400, min: 40 }] }, id, 2).ok === false, 'rechaza km imposibles');
ok(A.filtrarPlanIA({ filas: [{ tipo: 'larga', km: 5, min: 30 }, { tipo: 'larga', km: 6, min: 35 }] }, id, 2).ok === false,
  'rechaza dos tiradas largas');
ok(A.filtrarPlanIA('mañana corres 8 km tranquilo', id, 2).ok === false, 'rechaza texto que no es JSON');
ok(A.filtrarPlanIA('```json\n' + JSON.stringify(buena) + '\n```', id, 2).ok === true, 'acepta JSON envuelto en cercas');
ok(A.filtrarPlanIA(buena, id, 99).ok === false, 'rechaza una semana que no esta en el plan');

const antes = JSON.stringify(A.leer(id));
A.filtrarPlanIA(buena, id, 2);
ok(JSON.stringify(A.leer(id)) === antes, 'preguntar no toca el plan guardado');

A.iaLlave('sk-prueba-123');
ok(A.iaLlave() === 'sk-prueba-123', 'la llave se guarda');
A.iaLlave('');
ok(A.iaLlave() === '', 'la llave se borra');

A.iaProveedor('gemini');
ok(A.iaProveedor() === 'gemini', 'se elige Gemini como proveedor');
A.iaProveedor('groq');
ok(A.iaProveedor() === 'groq', 'se elige Groq como proveedor');
ok(A.iaProveedor('inventado') === false, 'no acepta un proveedor inventado');
A.iaProveedor('');

A.pedirPlanIA(id, 2).then(r => {
  ok(r.ok === false && /llave/.test(r.error || ''), 'sin llave no llama al modelo');
  return null;
});

// --- proveedores: Gemini tiene formato propio; los dos se filtran igual
(function () {
  const respuestas = {
    gemini: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ filas: [
      { tipo: 'facil', km: Math.round(kmPlan * 0.4 * 10) / 10, min: 40 },
      { tipo: 'larga', km: Math.round(kmPlan * 0.5 * 10) / 10, min: 70 }] }) }] } }] }),
    openai: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ filas: [
      { tipo: 'facil', km: Math.round(kmPlan * 0.4 * 10) / 10, min: 40 },
      { tipo: 'larga', km: Math.round(kmPlan * 0.5 * 10) / 10, min: 70 }] }) } }] })
  };
  let ultima = '';
  global.fetch = (u, o) => { ultima = String(u); const esG = ultima.indexOf('generativelanguage') >= 0;
    const cuerpo = esG ? respuestas.gemini : respuestas.openai;
    return Promise.resolve({ ok: true, status: 200,
      json: () => Promise.resolve(typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo) }); };
  ctx.fetch = global.fetch;
  A.iaLlave('AIza-prueba'); A.iaProveedor('gemini');
  A.pedirPlanIA(id, 2).then(r => {
    ok(ultima.indexOf(':generateContent') > 0, 'Gemini usa su propio endpoint');
    ok(r.ok === true && r.filas.length === 2, 'la respuesta de Gemini se filtra y se usa');
    if (!r.ok) console.log('     error:', r.error);
    A.iaLlave('gsk_prueba'); A.iaProveedor('groq');
    return A.pedirPlanIA(id, 2);
  }).then(r => {
    ok(ultima.indexOf('api.groq.com/openai/v1') >= 0, 'Groq usa el formato compatible con OpenAI');
    ok(r.ok === true && r.filas.length === 2, 'la respuesta de Groq se filtra y se usa');
    if (!r.ok) console.log('     error:', r.error);
    A.iaLlave(''); A.iaProveedor('');
    console.log(fallos ? 'FALLOS: ' + fallos : 'TODO BIEN');
    process.exit(fallos ? 1 : 0);
  });
})();

