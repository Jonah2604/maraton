// Saca el export real (mismo estado del telefono) para que tools/analizar.py lo lea.
const fs = require('fs');
const respaldo = JSON.parse(fs.readFileSync('C:/Users/chris/AppData/Local/hermes/cache/maraton/respaldo_jonah.json', 'utf8'));
const store = { 'maraton.v1': JSON.stringify({ perfiles: { jonah: Object.assign({}, respaldo.perfil) },
  registro: { jonah: respaldo.sesiones }, ajustes: { jonah: [] }, planes: {}, pendientes: [], ultimoAviso: null }) };
const g = { document: { dispatchEvent() {} }, location: { href: 'https://x/' }, history: { replaceState() {} },
  addEventListener() {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  setTimeout, clearTimeout, console, JSON, Math, Date, Error, String, Object };
g.window = g;
new Function('window', 'document', 'location', 'history', 'localStorage', 'fetch', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout',
  fs.readFileSync('C:/Users/chris/Apps/Maraton/agente.js', 'utf8'))(
  g, g.document, g.location, g.history, g.localStorage, () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') }),
  function () {}, console, setTimeout, clearTimeout);
const A = g.Agente;
A.leer('jonah');                          // fuerza la reconciliacion de la carrera
const ex = JSON.parse(A.exportar('jonah').json);
fs.writeFileSync('C:/Users/chris/AppData/Local/hermes/cache/scratch/export_jonah.json', JSON.stringify(ex, null, 1));
console.log('claves:', Object.keys(ex).join(', '));
console.log('atleta:', JSON.stringify(ex.atleta));
console.log('semanas:', (ex.semanas || []).length, '| registro:', (ex.registro || []).length);
