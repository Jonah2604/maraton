// Reproduce el estado exacto del telefono (respaldo_jonah.json, carrera ya cambiada a 2027-05-17)
// y comprueba que al abrir la app el plan se reacomode solo.
const fs = require('fs');
const respaldo = JSON.parse(fs.readFileSync('C:/Users/chris/AppData/Local/hermes/cache/maraton/respaldo_jonah.json', 'utf8'));
const estado = {
  perfiles: { jonah: Object.assign({}, respaldo.perfil) },
  registro: { jonah: respaldo.sesiones },
  ajustes: { jonah: [] }, planes: {}, pendientes: [], ultimoAviso: null
};
const store = { 'maraton.v1': JSON.stringify(estado) };
const g = { document: { dispatchEvent() {} }, location: { href: 'https://x/' }, history: { replaceState() {} },
  addEventListener() {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  setTimeout, clearTimeout, console, JSON, Math, Date, Error, String, Object };
g.window = g;
new Function('window', 'document', 'location', 'history', 'localStorage', 'fetch', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout',
  fs.readFileSync('C:/Users/chris/Apps/Maraton/agente.js', 'utf8'))(
  g, g.document, g.location, g.history, g.localStorage, () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') }),
  function () {}, console, setTimeout, clearTimeout);
const A = g.Agente;

console.log('perfil.carrera:', A.leer('jonah').atleta.carrera);
const d = A.leer('jonah');
console.log('semanas tras abrir:', d.semanas.length);
console.log('semana de hoy (13 nov):', A.semanaDe('2026-11-13', 'jonah'));
console.log('semana de la carrera:', A.semanaDe('2027-05-17', 'jonah'), '|', d.semanas[d.semanas.length - 1].fechas, '|', d.semanas[d.semanas.length - 1].nota);
console.log('primera:', d.semanas[0].fechas, '| ultima:', d.semanas[d.semanas.length - 1].fechas);
console.log('sesiones:', d.registro.length, '| balance semana 1:', JSON.stringify(A.balance('jonah', '2026-11-13').fila));
// idempotente: abrir otra vez no debe duplicar mantenimientos
const antes = A.leer('jonah').semanas.length;
A.leer('jonah'); A.leer('jonah');
console.log('idempotente:', antes, '->', A.leer('jonah').semanas.length);
// guardado sobrevive: el estado en localStorage trae el plan
const g2 = JSON.parse(store['maraton.v1']);
console.log('plan guardado:', !!g2.planes.jonah, '| semanas guardadas:', (g2.planes.jonah || {}).semanas ? g2.planes.jonah.semanas.length : 0);
