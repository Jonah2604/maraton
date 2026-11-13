
const fs = require('fs');
global.window = global; global.localStorage = { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]} };
global.document = { querySelector:()=>null, querySelectorAll:()=>[] };
eval(fs.readFileSync('agente.js','utf8'));
const exp = JSON.parse(fs.readFileSync(process.env.EXP,'utf8'));
const sem = exp.semanas;
const est = { perfiles:{ jonah:{nombre:'Jonah',fcmax:178}, yuli:{nombre:'Yuli',fcmax:181} },
  planes:{ jonah:{ inicio:'2026-11-09', semanas: sem }, yuli:{ inicio:'2026-11-09', semanas: sem },
           ana:{ inicio:'2026-11-09', semanas: sem } },
  registro:{ jonah:[], yuli:[], ana:[] }, ajustes:{}, pendientes:[] };
localStorage.setItem('maraton.v1', JSON.stringify(est));
const r = Agente.corredores().corredores;
console.log('chips:', r.map(a=>a.nombre+' FC '+a.fcmax+' ('+(a.base?'plantilla':'propio')+')').join(' | '));
console.log('duplicados:', r.length - new Set(r.map(a=>a.id)).size);
