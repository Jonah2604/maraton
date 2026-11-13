const fs = require('fs');
const store = {};
const g = { document: { dispatchEvent() {} }, location: { href: 'https://x/' }, history: { replaceState() {} },
  addEventListener() {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  setTimeout, clearTimeout, console, JSON, Math, Date, Error, String, Object };
g.window = g;
function cargar() {
  const src = fs.readFileSync('C:/Users/chris/Apps/Maraton/agente.js', 'utf8');
  new Function('window', 'document', 'location', 'history', 'localStorage', 'fetch', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout', src)(
    g, g.document, g.location, g.history, g.localStorage, () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') }),
    function () {}, console, setTimeout, clearTimeout);
  return g.Agente;
}
const A = cargar();

// estado como el del telefono: tres sesiones reales y la carrera vieja
A.registrar({ fecha: '2026-11-11', tipo: 'calidad', km: 4.22, min: 44, fc_media: 90, fc_max: 106 }, 'jonah');
A.registrar({ fecha: '2026-11-11', tipo: 'facil', km: 6.03, min: 54, fc_media: 129, fc_max: 140 }, 'jonah');
A.registrar({ fecha: '2026-11-13', tipo: 'larga', km: 8.02, min: 62, fc_media: 139, fc_max: 152 }, 'jonah');

console.log('--- antes ---');
console.log('carrera:', A.leer('jonah').atleta.carrera, '| semanas:', A.leer('jonah').semanas.length,
            '| semana de hoy:', A.semanaDe(A.hoy(), 'jonah'));
console.log('sem21:', JSON.stringify(A.leer('jonah').semanas[20]));

// el usuario cambia la fecha en Ajustes -> 17 may 2027 (lunes)
const r = A.perfil('jonah', { carrera: '2027-05-17' });
console.log('--- reajuste ---');
console.log(JSON.stringify(r.reajuste));

const ss = A.leer('jonah').semanas;
console.log('--- despues ---');
console.log('semanas:', ss.length, '| semana de hoy:', A.semanaDe(A.hoy(), 'jonah'),
            '| semana de la carrera:', A.semanaDe('2027-05-17', 'jonah'));
ss.forEach(s => console.log(String(s.n).padStart(2), s.fechas.padEnd(18), String(s.km).padStart(5), (s.nota || '').slice(0, 46)));
const hoy = A.sesionDeHoy('jonah', '2026-11-13');
console.log('sesionDeHoy 13 nov -> semana', hoy.semana, '| fila:', JSON.stringify(hoy.fila && hoy.fila.fechas));
const dia = A.sesionDeHoy('jonah', '2027-05-17');
console.log('sesionDeHoy carrera -> semana', dia.semana, '| fila:', JSON.stringify(dia.fila && dia.fila.nota));
console.log('balance:', JSON.stringify(A.balance('jonah', '2026-11-13')).slice(0, 220));

// volver a una fecha mas corta que el plan: debe recortar, no romper
const r2 = A.reajustarCarrera('jonah', '2027-01-31');
console.log('--- recorte ---');
console.log(JSON.stringify(r2));
const s2 = A.leer('jonah').semanas;
console.log('semanas:', s2.length, '| ultima:', JSON.stringify(s2[s2.length - 1]));
console.log('hoy sigue en semana', A.semanaDe(A.hoy(), 'jonah'));

// fecha imposible: carrera el mes que viene
const r3 = A.reajustarCarrera('jonah', '2026-12-06');
console.log('--- imposible ---');
console.log(JSON.stringify(r3));
