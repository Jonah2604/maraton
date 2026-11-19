
const fs = require('fs');
global.window = global;
global.localStorage = { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]} };
global.document = { querySelector:()=>null, querySelectorAll:()=>[] };
global.navigator = { onLine:true };
eval(fs.readFileSync('agente.js','utf8'));
const A = global.Agente;
let fallos = 0;
const ok = (n, c) => { console.log((c?'ok   ':'MAL  ') + n); if (!c) fallos++; };

// arranque virgen: la plantilla esta, pero nadie ha registrado nada
let c0 = A.corredores().corredores;
ok('arranque trae la plantilla', c0.some(a => a.id === 'jonah' && a.plantilla));
ok('arranque no tiene sesiones', c0.every(a => (a.registros||0) === 0));

// el primero que pone sus datos
const r = A.crearCorredor({ nombre:'Pruébalo', objetivo:'10k', kg:70, cm:170, edad:35, dias:3, min:40, historial:'algo', conversacion:'si' });
ok('el alta devuelve ok', r.ok === true);
if (!r.ok) console.log('   motivo: ' + r.error + ' faltan=' + JSON.stringify(r.faltan || []));
let c1 = A.corredores().corredores;
ok('solo queda su lugar', c1.length === 1 && c1[0].id === 'pruebalo');
{ const l = A.leer('pruebalo'); ok('la plantilla no se borro del plan', !!(l && l.semanas && l.semanas.length)); }
ok('la plantilla quedo apagada', A.salida('jonah').visible === false);

// al recargar no reaparece
let c2 = A.corredores().corredores;
ok('recarga: la plantilla sigue apagada', c2.length === 1 && c2[0].id === 'pruebalo');

// se puede volver a encender sin perder nada
A.mostrar('jonah', true);
ok('se puede volver a encender', A.corredores().corredores.length === 2);
console.log(fallos ? ('FALLAN ' + fallos) : 'TODO BIEN');
process.exit(fallos ? 1 : 0);
