const fs = require('fs');
global.window = global;
global.localStorage = { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]} };
global.document = { querySelector:()=>null, querySelectorAll:()=>[] };
global.navigator = { onLine:true };
eval(fs.readFileSync('agente.js','utf8'));
const A = global.Agente;
let fallos = 0;
const ok = (n, c) => { console.log((c?'ok   ':'MAL  ') + n); if (!c) fallos++; };

// La copia de Yuli se quedo con una FC calculada (Karvonen) y su techo salio en 150.
console.log('   plan base:   Z2 ' + A.zonas('yuli').zonas.Z2.join('-'));
A.perfil('yuli', { fc_reposo: 57, fcmax: 181 });
console.log('   con reposo:  Z2 ' + A.zonas('yuli').zonas.Z2.join('-'));

// El enlace del coach con &z=1 regresa a las zonas del plan.
const r = A.zonasPlan('yuli');
ok('el arreglo corre', r.ok === true);
ok('Z2 vuelve a 118-136', r.zonas.Z2[0] === 118 && r.zonas.Z2[1] === 136);
ok('la FC de reposo ya no manda', r.fc_reposo === null || r.fc_reposo === undefined);
ok('el plan de 21 semanas sigue', A.leer('yuli').semanas.length === 21);

// No borra sesiones
const ses = { fecha:'2026-11-18', tipo:'facil', km:7.25, min:50, fc_max:150 };
const reg0 = A.registrar('yuli', ses);
ok('registrar funciona', reg0.ok === true);
A.zonasPlan('yuli');
ok('la sesion sigue ahi', A.leer('yuli').registro.length >= 1);

console.log(fallos ? ('FALLOS: ' + fallos) : 'TODO BIEN');
process.exit(fallos ? 1 : 0);
