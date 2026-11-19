// Reglas del plan por meta: que suba sin saltos y que la larga tenga sentido.
const fs = require('fs');
const store = {};
const g = { document: { dispatchEvent() {} }, location: { href: 'https://x/' }, history: { replaceState() {} },
  addEventListener() {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  setTimeout, clearTimeout, console, JSON, Math, Date, Error, String, Object };
g.window = g;
const src = fs.readFileSync('C:/Users/chris/Apps/Maraton/agente.js', 'utf8');
new Function('window', 'document', 'location', 'history', 'localStorage', 'fetch', 'CustomEvent', 'console', 'setTimeout', 'clearTimeout', src)(
  g, g.document, g.location, g.history, g.localStorage, () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('ok') }),
  function () {}, console, setTimeout, clearTimeout);
const A = g.Agente;

let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA: ' + m); } };

const objs = A.objetivos();
ok(objs.ok && objs.metas.length === 5, 'deben ser 5 metas');
console.log('metas:', objs.metas.map(m => m.clave + '/' + m.km + 'km/' + m.semanas + 'sem').join('  '));

const base = { nombre: 'Prueba ' + Date.now(), inicio: '2026-11-16', edad: 38, kg: 70, cm: 168,
  fcmax: 185, fc_reposo: 58, historial: 'poco', corre20: true, conversacion: true, dias: 4, min: 45 };

for (const m of objs.metas) {
  if (m.clave === 'base') continue;
  const r = A.semilla({ ...base, objetivo: m.clave });
  if (!r.ok) { fallos++; console.log('FALLA ' + m.clave + ': ' + r.error + ' faltan ' + (r.faltan || []).join(',')); continue; }
  const kms = r.semanas.map(s => Number(s.km));
  for (let i = 1; i < kms.length; i++) {
    // la ultima semana trae la carrera, asi que ahi el salto es el de la prueba y no cuenta como subida
    if (i === kms.length - 1) continue;
    if (kms[i] / kms[i - 1] > 1.3) { fallos++; console.log('FALLA subida ' + m.clave + ' sem ' + (i + 1) + ': ' + kms[i - 1] + ' -> ' + kms[i]); }
  }
  // la semana antes de la carrera tiene que bajar, no subir
  if (kms[kms.length - 2] > kms[kms.length - 3]) { fallos++; console.log('FALLA ' + m.clave + ': la semana previa ala carrera sube'); }
  const largas = r.semanas.map(s => Number(s.larga || s.larga_km || 0));
  const maxLarga = Math.max(...largas);
  // la larga del entrenamiento no pasa del tope; la carrera es aparte
  const largaEntreno = Math.max(...r.semanas.slice(0, -1).map(s => Number(s.larga || 0)));
  if (m.largaMax) ok(largaEntreno <= m.largaMax, m.clave + ': larga de entreno ' + largaEntreno + ' pasa el tope ' + m.largaMax);
  console.log(m.clave.padEnd(4), String(r.semanas.length).padStart(2), 'sem | km', kms.join(' '),
              '| larga max', maxLarga, '| semana1', JSON.stringify(r.semanas[0].filas ? r.semanas[0].filas.map(f => f.tipo || f.que) : 'sin filas'));
}

ok(!A.semilla({ nombre: 'x', objetivo: '3k' }).ok, 'una meta inventada debe rechazarse');
ok(!A.semilla({ objetivo: '10k' }).ok, 'sin nombre debe rechazarse');

console.log(fallos === 0 ? 'TODO OK' : 'FALLOS: ' + fallos);
process.exit(fallos ? 1 : 0);
