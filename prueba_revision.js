// Revision semanal del plan: que decida con lo que de verdad se corrio, sin castigar ni inventar.
const fs = require('fs');
const store = {};
const g = { document: { dispatchEvent() {} }, location: { href: 'https://x/' }, history: { replaceState() {} },
  addEventListener() {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  setTimeout, clearTimeout, console, JSON, Math, Date, Error, String, Object };
g.window = g;
const src = fs.readFileSync('C:/Users/chris/Apps/Maraton/agente.js', 'utf8');
new Function('window','document','location','history','localStorage','fetch','CustomEvent','console','setTimeout','clearTimeout',src)(
  g, g.document, g.location, g.history, g.localStorage, () => Promise.resolve({ok:true,status:200,text:()=>Promise.resolve('ok')}),
  function(){}, console, setTimeout, clearTimeout);
const A = g.Agente;
let f = 0; const ok = (c, m) => { if (!c) { f++; console.log('FALLA: ' + m); } };

// jonah, semana 1 cumplida (88 %) y semana 2 casi vacia
A.registrar('jonah', { fecha:'2026-11-11', tipo:'facil', km:6.03, min:54, fc_media:129 });
A.registrar('jonah', { fecha:'2026-11-13', tipo:'larga', km:8.02, min:62, fc_media:139 });
A.registrar('jonah', { fecha:'2026-11-18', tipo:'calidad', km:3.7, min:24, fc_media:150 });

const s1 = A.revisarSemana('jonah', 1);
ok(s1.ok && s1.cambios.includes('subir'), 'semana cumplida debe subir: ' + JSON.stringify(s1.cambios));
const s2 = A.revisarSemana('jonah', 2);
ok(s2.cambios.includes('repetir'), 'semana corta no debe subir: ' + JSON.stringify(s2.cambios));
const s5 = A.revisarSemana('jonah', 5);
ok(s5.cambios.includes('esperar'), 'semana sin sesiones debe esperar');
ok(!A.revisarSemana('jonah', 99).ok, 'semana fuera del plan debe fallar');
ok(!A.revisarSemana('nadie', 1).ok, 'corredor inexistente debe fallar');

// una molestia anotada quita la calidad
const n2 = A.crearCorredor({ nombre: 'Pm ' + Date.now(), inicio:'2026-11-16', edad:40, kg:68, cm:170, fcmax:180, fc_reposo:60,
  historial:'poco', corre20:true, conversacion:true, dias:4, min:40, objetivo:'5k' }).id;
A.registrar(n2, { fecha:'2026-11-17', tipo:'facil', km:3, min:30, fc_media:150, molestia:'rodilla' });
const con = A.revisarSemana(n2, 1);
ok(con.cambios.includes('quitar_calidad'), 'con molestia debe quitar la calidad: ' + JSON.stringify(con.cambios));
ok(con.cambios.includes('bajar_volumen'), 'con molestia debe bajar volumen');

// repartir devuelve las mismas sesiones y no toca el plan guardado
const antes = JSON.stringify(A.leer(n2).semanas[0].filas);
const rep = A.repartirSemana(n2, 1);
ok(rep.ok && rep.filas.length === A.leer(n2).semanas[0].filas.length, 'repartir conserva las sesiones');
ok(JSON.stringify(A.leer(n2).semanas[0].filas) === antes, 'revisar no debe modificar el plan guardado');
ok(rep.km <= A.leer(n2).semanas[0].km, 'repartir no debe inflar la semana');

// el pulso alto fuera de rango pide quitar la calidad
const n3 = A.crearCorredor({ nombre: 'Pf ' + Date.now(), inicio:'2026-11-16', edad:34, kg:72, cm:175, fcmax:180, fc_reposo:60,
  historial:'poco', corre20:true, conversacion:true, dias:4, min:40, objetivo:'10k' }).id;
A.registrar(n3, { fecha:'2026-11-18', tipo:'facil', km:6, min:40, fc_media:172 });
const fc = A.revisarSemana(n3, 1);
ok(fc.cambios.includes('quitar_calidad'), 'pulso alto debe pedir quitar la calidad: ' + JSON.stringify(fc.cambios));

console.log('semana cumplida ->', s1.cambios.join('+'), '|', s1.pct + '%');
console.log('semana corta    ->', s2.cambios.join('+'), '|', s2.pct + '%');
console.log('con molestia    ->', con.cambios.join('+'));
console.log('pulso alto      ->', fc.cambios.join('+'));
console.log(f === 0 ? 'TODO OK' : 'FALLOS: ' + f);
process.exit(f ? 1 : 0);
