/* ============================================================================
   plan-maraton/v1 — puente de datos del plan de entrenamiento
   ----------------------------------------------------------------------------
   Modulo desacoplado a proposito:
     - NO toca el DOM.
     - NO tiene dependencias.
     - NO sabe nada de la pantalla: la UI es un cliente mas, igual que un agente.

   Cualquier agente (otro Hermes, un GPT con navegador, un cron, n8n) puede:
     1. llamar estas funciones desde la consola de la pagina,
     2. exportar/importar el JSON que produce `exportar()`,
     3. abrir la app con  #agent=<base64url(json)>  para inyectar un plan,
     4. registrar un webhook y recibir el estado en cada cambio.

   Contrato completo: Agente.docs()
   ========================================================================= */
(function (global) {
  'use strict';

  var VERSION = 'plan-maraton/v1';
  var CLAVE = 'maraton.v1';           // sufijo de version: permite migrar sin romper
  var PLANES_BASE = {"api":"plan-maraton/v1","generado":"2026-11-11","origen":"Obsidian: 02 - Proyectos/Maraton - plan*.md","atletas":{"jonah":{"edad":42,"fcmax":178,"fc_reposo":54,"nombre":"Jonah","zonas":{"Z1":[128,135],"Z2":[135,147],"Z3":[147,156],"Z4":[157,163],"Z5":[164,169]},"carrera":"2027-04-04","meta":"A 4:45 / B 5:00","semanas":[{"n":1,"fechas":"9 al 15 Nov","km":16.0,"larga":8.0,"calidad":"4x(1' fuerte / 2' suave)","nota":"Arranque suave: solo trotar y caminar si hace falta"},{"n":2,"fechas":"16 al 22 Nov","km":18.0,"larga":9.0,"calidad":"5x(1' / 2')","nota":"Volumen +10%, nada mas"},{"n":3,"fechas":"23 al 29 Nov","km":20.0,"larga":10.0,"calidad":"6x(1' / 2')","nota":"Ultima semana antes de descarga"},{"n":4,"fechas":"30 al 6 Dec","km":15.0,"larga":8.0,"calidad":"sin calidad","nota":"DESCARGA: baja 30%"},{"n":5,"fechas":"7 al 13 Dec","km":22.0,"larga":11.0,"calidad":"2x8' tempo a 6:10/km","nota":"Primer tempo, solo si la semana previa salio limpia"},{"n":6,"fechas":"14 al 20 Dec","km":24.0,"larga":12.0,"calidad":"3x8' tempo","nota":"Fuerza obligatoria, 2 dias"},{"n":7,"fechas":"21 al 27 Dec","km":26.0,"larga":13.0,"calidad":"5x1000 a 5:40/km","nota":"Semana mas larga de la fase"},{"n":8,"fechas":"28 al 3 Jan","km":20.0,"larga":10.0,"calidad":"sin calidad","nota":"DESCARGA"},{"n":9,"fechas":"4 al 10 Jan","km":28.0,"larga":14.0,"calidad":"4x10' tempo","nota":"Comer antes de las largas de mas de 90 min"},{"n":10,"fechas":"11 al 17 Jan","km":30.0,"larga":15.0,"calidad":"6x1000","nota":"Cadencia: meta 165 pasos/min"},{"n":11,"fechas":"18 al 24 Jan","km":32.0,"larga":16.0,"calidad":"2x15' tempo","nota":"Larga con ultimos 3 km a ritmo meta"},{"n":12,"fechas":"25 al 31 Jan","km":25.0,"larga":12.0,"calidad":"sin calidad","nota":"DESCARGA"},{"n":13,"fechas":"1 al 7 Feb","km":34.0,"larga":17.0,"calidad":"8x1000 a 5:35/km","nota":"TEST de 10 km el sabado"},{"n":14,"fechas":"8 al 14 Feb","km":36.0,"larga":18.0,"calidad":"3x15' tempo","nota":"Con el test se decide meta A o B"},{"n":15,"fechas":"15 al 21 Feb","km":38.0,"larga":20.0,"calidad":"10x1000","nota":"Larga con 5 km finales a ritmo meta"},{"n":16,"fechas":"22 al 28 Feb","km":30.0,"larga":15.0,"calidad":"sin calidad","nota":"DESCARGA"},{"n":17,"fechas":"1 al 7 Mar","km":40.0,"larga":22.0,"calidad":"2x20' tempo","nota":"Pico de volumen (no mas con este peso)"},{"n":18,"fechas":"8 al 14 Mar","km":42.0,"larga":24.0,"calidad":"12x1000","nota":"Ultima larga grande. Si hay molestia, 20 km"},{"n":19,"fechas":"15 al 21 Mar","km":34.0,"larga":18.0,"calidad":"6x1000 suave","nota":"DESCARGA y bajar carga"},{"n":20,"fechas":"22 al 28 Mar","km":26.0,"larga":12.0,"calidad":"4x(1' / 2') suave","nota":"TAPER: nada nuevo"},{"n":21,"fechas":"29 al 4 Apr","km":42.2,"larga":42.2,"calidad":"--","nota":"CARRERA 42.2 km"}],"km_declarado":556.0,"notas":"Ciática, rodilla y tobillo con historial: dolor que irradia = se corta la sesión. El fútbol cuenta como calidad. Se entrena por pulso y conversación, no por ritmo."},"yuli":{"edad":39,"fcmax":181,"fc_reposo":null,"nombre":"Yuli","zonas":{"Z1":[109,118],"Z2":[118,136],"Z3":[136,148],"Z4":[150,159],"Z5":[161,168]},"carrera":"2027-04-04","meta":"A 5:15 / B 5:35 / C terminar","semanas":[{"n":1,"fechas":"9 - 15 nov","km":18.0,"larga":7.0,"calidad":"Intervalos 6x1' fuerte / 2' suave","nota":"Arranque recortado por anemia y fatiga: 18 km, no 20."},{"n":2,"fechas":"16 - 22 nov","km":22.0,"larga":8.0,"calidad":"Tempo 10' comodo-incomodo","nota":"Primer tempo; se corta si el esfuerzo pasa de 7."},{"n":3,"fechas":"23 - 29 nov","km":24.0,"larga":9.0,"calidad":"Intervalos 7x1' / 2' suave","nota":"Fuerza ya en dos sesiones completas."},{"n":4,"fechas":"30 nov - 6 dic","km":17.0,"larga":7.0,"calidad":"Sin calidad","nota":"Descarga: cae ~30 %. Aqui se absorbe el trabajo."},{"n":5,"fechas":"7 - 13 dic","km":26.0,"larga":10.0,"calidad":"Tempo 12'","nota":"Vuelve la carga; revisar sueno y hambre."},{"n":6,"fechas":"14 - 20 dic","km":28.0,"larga":11.0,"calidad":"Intervalos 8x1' / 90 s","nota":"Cadencia alta, zancada corta: no alargar el paso."},{"n":7,"fechas":"21 - 27 dic","km":30.0,"larga":13.0,"calidad":"Tempo 15'","nota":"Primera larga de 90 min; llevar agua."},{"n":8,"fechas":"28 dic - 3 ene","km":21.0,"larga":9.0,"calidad":"Sin calidad","nota":"Descarga."},{"n":9,"fechas":"4 - 10 ene","km":32.0,"larga":14.0,"calidad":"Intervalos 5x3' / 2' suave","nota":"Bloques mas largos, ritmo controlado."},{"n":10,"fechas":"11 - 17 ene","km":33.0,"larga":15.0,"calidad":"Tempo 18'","nota":"Ultimos 10 min de la larga a ritmo de maraton."},{"n":11,"fechas":"18 - 24 ene","km":35.0,"larga":17.0,"calidad":"Intervalos 4x5' / 2' suave","nota":"Semana fuerte: nada de peso extra ni otra actividad dura."},{"n":12,"fechas":"25 - 31 ene","km":24.0,"larga":11.0,"calidad":"Sin calidad","nota":"Descarga."},{"n":13,"fechas":"1 - 7 feb","km":37.0,"larga":18.0,"calidad":"Tempo 20'","nota":"Simulacro: ropa y desayuno del dia de carrera."},{"n":14,"fechas":"8 - 14 feb","km":38.0,"larga":19.0,"calidad":"Test 10 km a tope controlado","nota":"Con el test se fijan las metas A y B."},{"n":15,"fechas":"15 - 21 feb","km":40.0,"larga":22.0,"calidad":"Intervalos 3x8' / 2' suave","nota":"Pico de volumen; vigilar planta del pie y rodilla."},{"n":16,"fechas":"22 - 28 feb","km":28.0,"larga":15.0,"calidad":"Sin calidad","nota":"Descarga antes del pico final."},{"n":17,"fechas":"1 - 7 mar","km":42.0,"larga":24.0,"calidad":"Tempo 25'","nota":"Larga mas larga del plan hasta ahora; nada nuevo."},{"n":18,"fechas":"8 - 14 mar","km":43.0,"larga":28.0,"calidad":"Intervalos 5x2' / 1' suave","nota":"Pico absoluto. Ultima subida de volumen."},{"n":19,"fechas":"15 - 21 mar","km":32.0,"larga":16.0,"calidad":"Sin calidad","nota":"Descarga; el cuerpo empieza a guardar."},{"n":20,"fechas":"22 - 28 mar","km":24.0,"larga":11.0,"calidad":"Tempo 10' suave","nota":"Taper; una sola sesion de fuerza."},{"n":21,"fechas":"29 mar - 4 abr","km":10.0,"larga":null,"calidad":"Sin calidad","nota":"2-3 salidas de 20-25 min y **maraton el domingo**."}],"km_declarado":604.0,"notas":"Anemia crónica en tratamiento (Autrin diario, Fisiofer en días de periodo). Se entrena por sensación, no por ritmo: fatiga que no cuadra = se repite la semana."}}};       // generado desde el vault

  /* ---------------------------------------------------------------- almacen */
  var memoria = null;                 // respaldo si no hay localStorage (pruebas)
  var _almacen = null;

  function almacen() {
    if (_almacen) return _almacen;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) { _almacen = localStorage; return _almacen; }
    } catch (e) { /* modo privado o bloqueado */ }
    if (!memoria) {
      var datos = {};
      memoria = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
        setItem: function (k, v) { datos[k] = String(v); },
        removeItem: function (k) { delete datos[k]; }
      };
    }
    return memoria;
  }

  function vacio() {
    return { api: VERSION, registro: { jonah: [], yuli: [] }, ajustes: { jonah: [], yuli: [] },
             perfiles: {}, planes: {}, notas: {}, webhook: null, salida: null };   // salida=null -> lo de abajo no se toco nunca
  }

  // Lee el estado y descarta lo que no tenga forma valida: una fila mala no tumba la app.
  function cargar() {
    var crudo = null;
    try { crudo = almacen().getItem(CLAVE); } catch (e) { crudo = null; }
    if (!crudo) return vacio();
    var e;
    try { e = JSON.parse(crudo); } catch (err) { return vacio(); }
    if (!e || typeof e !== 'object') return vacio();
    var base = vacio();
    var ids = ['jonah', 'yuli'];
    if (e.planes && typeof e.planes === 'object') {
      for (var c in e.planes) if (e.planes.hasOwnProperty(c) && ids.indexOf(c) < 0) ids.push(c);
    }
    ids.forEach(function (id) {
      var r = e.registro && e.registro[id];
      if (Array.isArray(r)) base.registro[id] = r.filter(function (x) { return x && typeof x === 'object' && x.fecha; });
      var a = e.ajustes && e.ajustes[id];
      if (Array.isArray(a)) base.ajustes[id] = a.filter(function (x) { return x && typeof x === 'object'; });
    });
    if (typeof e.webhook === 'string' && /^https?:\/\//.test(e.webhook)) base.webhook = e.webhook;
    // Salida del registro: si se guardo (aunque sea con los dos apagados) mandan los dos campos.
    if (e.salida && typeof e.salida === 'object') {
      base.salida = { jonah: e.salida.jonah !== false, yuli: e.salida.yuli !== false };
    }
    if (e.planes && typeof e.planes === 'object') {
      for (var c in e.planes) if (e.planes.hasOwnProperty(c) && e.planes[c] &&
          Array.isArray(e.planes[c].semanas) && e.planes[c].semanas.length >= 4) {
        base.planes[c] = e.planes[c];
        if (!base.registro[c]) base.registro[c] = [];
        if (!base.ajustes[c]) base.ajustes[c] = [];
      }
    }
    if (e.notas && typeof e.notas === 'object') {
      for (var nn in e.notas) if (e.notas.hasOwnProperty(nn) && Array.isArray(e.notas[nn])) {
        base.notas[nn] = e.notas[nn].filter(function (x) { return x && typeof x === 'object' && typeof x.texto === 'string'; }).slice(-60);
      }
    }
    if (e.perfiles && typeof e.perfiles === 'object') {
      ids.forEach(function (id) {
        var p = e.perfiles[id];
        if (p && typeof p === 'object') base.perfiles[id] = p;
      });
    }
    return base;
  }

  function guardar(estado) {
    try { almacen().setItem(CLAVE, JSON.stringify(estado)); return true; }
    catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ utils */
  function esFecha(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  function hoyISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1), dia = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dia.length < 2 ? '0' + dia : dia);
  }

  function zonaDe(id, fc) {
    var z = zonasDe(id), k;
    if (num(fc) === null) return null;
    for (k in z) { if (z.hasOwnProperty(k) && fc >= z[k][0] && fc <= z[k][1]) return k; }
    return fc < z.Z1[0] ? 'bajo Z1' : 'sobre Z5';
  }

  // Zonas por % de FC maxima. Si la persona cambio su FC maxima, se recalculan aqui
  // y la app no queda con las zonas de otra persona.
  var PCT = { Z1: [0.60, 0.65], Z2: [0.65, 0.75], Z3: [0.75, 0.82], Z4: [0.83, 0.88], Z5: [0.89, 0.93] };
  function zonasPorPct(fcmax) {
    var z = {}, k;
    for (k in PCT) z[k] = [Math.round(fcmax * PCT[k][0]), Math.round(fcmax * PCT[k][1])];
    return z;
  }

  // Karvonen: con FC de reposo medida, la zona se calcula sobre la reserva y no sobre el maximo.
  // Con 178 de maxima y 54 de reposo, el mismo esfuerzo cae ~13 ppm mas arriba que por % de FCmax.
  function zonasPorReserva(fcmax, freposo) {
    var r = fcmax - freposo, z = {}, k;
    if (!(r > 20)) return null;
    for (k in PCT) z[k] = [Math.round(freposo + r * PCT[k][0]), Math.round(freposo + r * PCT[k][1])];
    return z;
  }

  // Zonas del perfil efectivo: % de FCmax, o reserva (Karvonen) si hay FC de reposo valida.
  function zonasCalc(fcmax, freposo) {
    if (num(fcmax)) {
      if (num(freposo) && freposo >= 30 && freposo <= 110) {
        var k = zonasPorReserva(fcmax, freposo);
        if (k) { k.__modo = 'reserva'; return k; }
      }
      var p = zonasPorPct(fcmax);
      p.__modo = 'pct';
      return p;
    }
    return null;
  }

  function zonasDe(id) {
    var e = cargar();
    var b = PLANES_BASE.atletas[id] || e.planes[id] || PLANES_BASE.atletas.jonah;
    var p = e.perfiles[id] || {};
    var f = num(p.fcmax) ? p.fcmax : b.fcmax;
    var fr = num(p.fc_reposo) ? p.fc_reposo
      : (p.fc_reposo === null ? null : (num(b.fc_reposo) ? b.fc_reposo : null));
    var z = zonasCalc(f, fr);
    return z || b.zonas;
  }

  function idValido(id) {
    if (typeof id !== 'string') return false;
    if (PLANES_BASE.atletas.hasOwnProperty(id)) return true;
    var e = cargar();
    return !!(e.planes && e.planes.hasOwnProperty(id));
  }

/* ------------------------------------------------------------------ meta puesta por el corredor
   Base sacada de running-coach/references/planes-otras-distancias.md. Duraciones historicas,
   no promesas: el plan pone la distancia y el tiempo de cada sesion, el reloj pone el ritmo. */
var METAS = {
  base: { clave: 'base', nombre: 'Base: correr 20 minutos seguidos', km: 0, semanas: 6, dias: 3 },
  '5k':  { clave: '5k',  nombre: '5 km',           km: 5,    semanas: 10, dias: 3, largaMax: 7 },
  '10k': { clave: '10k', nombre: '10 km',          km: 10,   semanas: 12, dias: 4, largaMax: 12 },
  '21k': { clave: '21k', nombre: 'medio maraton',  km: 21.1, semanas: 16, dias: 4, largaMax: 20 },
  '42k': { clave: '42k', nombre: 'maraton',        km: 42.2, semanas: 20, dias: 5, largaMax: 34 }
};

// Cuanto aguanta de entrada. Lo que no se sabe se pregunta; no se inventa.
// El techo real lo pone el IMC y la experiencia, no la meta que eligio.
function perfilDe(o) {
  o = o || {};
  var p = { faltan: [], estimado: false };
  var kg = num(o.kg), cm = num(o.cm), fcmax = num(o.fcmax), reposo = num(o.fc_reposo);
  p.kg = kg; p.cm = cm;
  p.imc = (kg && cm) ? Math.round(kg / ((cm / 100) * (cm / 100)) * 10) / 10 : null;
  if (fcmax) { p.fcmax = Math.round(fcmax); }
  else {
    var edad = num(o.edad);
    if (edad) { p.fcmax = Math.round(208 - 0.7 * edad); p.estimado = true; }
    else { p.fcmax = null; p.faltan.push('fcmax'); }
  }
  // el reposo mejora las zonas (Karvonen) pero no es requisito para armar un plan;
  // sin el se prescribe por % de FCmax, que es lo que ya hace la ficha
  if (reposo >= 30 && reposo <= 110) p.fc_reposo = Math.round(reposo);
  else p.fc_reposo = null;
  p.hist = String(o.historial || '').trim().toLowerCase();   // ninguno | algo | constante
  if (['ninguno', 'algo', 'constante', 'nada', 'poco', 'seguido'].indexOf(p.hist) < 0) {
    p.hist = null; p.faltan.push('historial');
  } else if (p.hist === 'nada') p.hist = 'ninguno';
  else if (p.hist === 'poco') p.hist = 'algo';
  else if (p.hist === 'seguido') p.hist = 'constante';
  // conversacion: true -> aguanta 20 min corriendo; false -> no; null -> no se sabe
  var c = o.conversacion;
  if (c === true || c === 'si' || c === 1) p.corrio20 = true;
  else if (c === false || c === 'no' || c === 0) p.corrio20 = false;
  else { p.corrio20 = null; p.faltan.push('nivel'); }
  var d = num(o.dias);
  if (d >= 2 && d <= 6) p.dias = Math.round(d); else { p.dias = null; p.faltan.push('dias'); }
  p.min = num(o.min) || 40;
  p.molestias = String(o.molestias || '').trim();
  p.caminata = !!(p.imc && p.imc >= 30) || p.hist === 'ninguno' || !!p.molestias;
  p.notas = [];
  if (p.imc && p.imc >= 30) p.notas.push('IMC ' + p.imc + ': misma duracion, con pausas de caminata; nada de series');
  if (p.molestias) p.notas.push('molestias previas: se sube volumen solo si la semana queda limpia');
  return p;
}

// Techo de volumen semanal y km de arranque (historial x IMC x molestias).
// Sin historial no hay plan magico: el techo baja y el plan se arma con tiempo, no con km.
function techoDe(p, meta) {
  var k = { ninguno: 0.6, algo: 1, constante: 1.25 }[p.hist] || 0.6;

  if (p.molestias) k *= 0.85;
  // el IMC no recorta volumen: recorta el paso (mas caminata, menos km por sesion)
  var punta = { '5k': 20, '10k': 32, '21k': 48, '42k': 62 }[meta.clave] || 10;
  var ini = { '5k': 8, '10k': 12, '21k': 18, '42k': 24 }[meta.clave] || 6;
  var techo = Math.round(punta * k * 10) / 10;
  // km de la PRIMERA semana: el techo de la semana punta, con lo que se aguanta de entrada.
  var arranque = Math.round(Math.max(10, ini * Math.min(1, k + 0.15)) * 10) / 10;
  if (techo < arranque) techo = arranque;
  return { techo: techo, arranque: arranque };
}

function planPorMeta(clave) {
  var c = String(clave || '').trim().toLowerCase().replace(/km$/, 'k');
  if (c === '21.1k' || c === '21.1') c = '21k';
  if (c === '42.2k' || c === '42.2') c = '42k';
  if (c === 'medio' || c === 'medio maraton' || c === 'media') c = '21k';
  if (c === 'maraton') c = '42k';
  if (c === '5' || c === '5km') c = '5k';
  if (c === '10' || c === '10km') c = '10k';
  return METAS[c] || null;
}

// Plan completo: perfil -> techo -> semanas con rampa, descarga, una calidad y la larga.
// Se pide lo minimo para prescribir con criterio; lo que falte se dice, no se adivina.
// Campo libre: el corredor cuenta lo que la app no sabe (futbol el jueves, lluvia, quiere un dia mas).
// Se guarda por semana y el coach lo tiene que leer antes de decidir la siguiente.
  var TIPOS_NOTA = ['evento', 'faltante', 'sobrecarga', 'otro'];

  function notaValida(t) {
    t = String(t == null ? '' : t).trim();
    if (!t) return { ok: false, error: 'la nota esta vacia' };
    return { ok: true, texto: t.slice(0, 500) };
  }

  // Interpreta el texto libre: que dia/semana y que implica, para no pedirle eso al coach por su cuenta.
  function interpretarNota(texto) {
    var t = ' ' + String(texto || '').toLowerCase() + ' ', out = { dias_bloqueados: [], quiere_mas_dias: null, motivo: '' };
    var dias = { lunes: 1, martes: 2, miercoles: 3, 'miércoles': 3, jueves: 4, viernes: 5, sabado: 6, 'sábado': 6, domingo: 7 };
    for (var k in dias) {
      if (dias.hasOwnProperty(k) && t.indexOf(k) >= 0) out.dias_bloqueados.push(dias[k]);
    }
    if (/\b(lluvia|llover|tormenta|calor|frio|frío|nieve|aire|humo)\b/.test(t)) out.motivo = 'clima';
    if (/\b(viaje|viajo|fuera|trabajo|turno|escuela)\b/.test(t)) out.motivo = out.motivo || 'agenda';
    if (/\b(futbol|fútbol|tenis|basquet|basket|voleibol|natacion|natación|ciclismo|bici)\b/.test(t)) out.motivo = out.motivo || 'otro deporte';
    if (/\b(enferm|gripe|fiebre|gastritis|dolor|lesion|lesión|molestia)\b/.test(t)) out.motivo = out.motivo || 'salud';
    var mas = t.match(/\b(un|1)\s+(dia|día)\s+mas\b|\bcuarto dia\b|\botro dia\b|\bdia extra\b/);
    if (mas) out.quiere_mas_dias = 1;
    // si el motivo es clima o agenda, el dia nombrado es contexto: no se bloquea solo por nombrarlo
    if (out.motivo === 'clima' || out.motivo === 'agenda') out.dias_contexto = out.dias_bloqueados.slice();
    return out;
  }

  function notasDe(id) {
    var e = cargar();
    var arr = (e.notas && e.notas[id]) || [];
    return arr.slice(-30).map(function (x) { return {
      fecha: x.fecha, semana: x.semana, texto: x.texto, tipo: x.tipo,
      dias_bloqueados: x.dias_bloqueados || [], quiere_mas_dias: x.quiere_mas_dias || null
    }; });
  }

function preparar(clave, o) {
  var meta = planPorMeta(clave);
  if (!meta) return { ok: false, error: 'meta invalida: usa 5k, 10k, 21k, 42k o base', faltan: [], base: false };
  var p = perfilDe(o);
  p.metaClave = meta.clave;
  var faltan = p.faltan.slice();
  if (p.corrio20 === false || p.hist === 'ninguno') {
    // no aguanta 20 minutos seguidos: primero base, despues la meta elegida
    var b = JSON.parse(JSON.stringify(METAS.base));
    b.elegida = meta.clave;
    return { ok: true, meta: b, perfil: p, base: true,
             plan: armarBase(p, techoDe(p, b)) };
  }
  if (faltan.length) return { ok: false, error: 'faltan datos', faltan: faltan, perfil: p };
  return { ok: true, meta: meta, perfil: p, base: false, plan: armar(meta, p, techoDe(p, meta)) };
}

// Semanas de puro trote-caminata, sin km prescritos.
function armarBase(p, t) {
  var dias = Math.max(2, Math.min(3, p.dias || 3));
  var semanas = [], n, i, j;
  // 6 semanas de trote-caminata: el tiempo total sube, el km no se prescribe.
  // Escalones de trote / caminata por semana; el ultimo todavia lleva caminata a proposito.
  var esc = { 1: [1, 2, 6], 2: [2, 2, 6], 3: [3, 2, 6], 4: [5, 2, 6], 5: [6, 2, 5], 6: [8, 2, 5] };
  for (n = 1; n <= 6; n++) {
    var e = esc[n], filas = [], totalMin = 0;
    for (i = 1; i <= dias; i++) {
      var esLarga = (i === dias);
      var bloques = e[2] + (esLarga ? 2 : 0);
      var minT = e[0] * bloques, minC = e[1] * bloques;
      if (minT > (p.min || 40) && !esLarga) {   // respeta el tiempo que la persona tiene al dia
        bloques = Math.max(3, Math.floor((p.min || 40) / (e[0] + e[1])));
        minT = e[0] * bloques; minC = e[1] * bloques;
      }
      filas.push({ i: i, tipo: esLarga ? 'larga' : 'facil', min: minT + minC, km: null,
                   nota: 'trote ' + e[0] + ' min / caminata ' + e[1] + ' min x ' + bloques +
                         ' (' + minT + ' min trotando)' });
      totalMin += minT + minC;
    }
    semanas.push({ n: n, km: null, totalMin: totalMin, filas: filas });
  }
  return { semanas: semanas, total: null, base: true, techo: t.techo };
}

// Peso de cada tipo de sesion dentro de la semana: la larga manda, la calidad no se pasa de 15 %.
var PESO = { larga: 0.30, calidad: 0.18, facil: 0.26, regenerativo: 0.22 };

function armar(meta, p, t) {
  var n = meta.semanas, dias = Math.max(2, Math.min(5, p.dias || meta.dias));
  var arranque = t.arranque, techo = t.techo, tope = p.min || 40;
  var semanas = [], w, j;
  // 1) volumen de cada semana: arranca en lo que aguanta, +10 % si la anterior fue normal,
  //    descarga cada 4 a ~70 %, la semana previa a la carrera baja y la de la carrera es minima.
  var vol = [], previo = arranque;
  var descLen = 0.45 + 0.20 * Math.min(1, n / 16);   // mas largo el plan, mas suave la bajada
  for (w = 1; w <= n; w++) {
    var km;
    if (w === 1) km = arranque;
    else if (w === n) km = previo * 0.55;
    else if (w === n - 1) km = previo * 0.55;
    else if (w % 4 === 0) km = previo * descLen;
    else km = previo * 1.10;
    km = Math.round(Math.min(techo, Math.max(arranque * 0.85, km)) * 10) / 10;
    vol.push(km); previo = km;
  }
  // 2) sesiones: el tiempo manda. La larga no pasa del 30 % de la semana (ni de su tope por meta);
  //    las cortas se reparten lo que queda y nunca comen mas minutos que la larga.
  for (w = 1; w <= n; w++) {
    var paso = Math.min(9, Math.floor((w - 1) * 9 / Math.max(1, n - 1)));
    var esCarrera = (w === n);
    var hayCalidad = (dias >= 3 && w > 2 && !esCarrera && w !== n - 1);
    var volKm = vol[w - 1];
    // 1) que sesiones lleva la semana. La larga siempre va al final; la calidad, 48 h antes.
    var fila0 = [];
    for (j = 1; j <= dias; j++) {
      if (j === dias) fila0.push('larga');
      else if (hayCalidad && j === dias - 1) fila0.push('calidad');
      else fila0.push((w % 4 === 0 || w === n - 1) ? 'regenerativo' : 'facil');
    }
    // 2) minutos de cada sesion: manda el tiempo que la persona tiene al dia y el paso de la semana
    var cortas = [];
    for (j = 0; j < fila0.length; j++) {
      var tipo = fila0[j];
      var min = minDeSesion(tipo, paso);
      if (p.caminata) min = Math.round(min * 0.9);   // mismo rato, con pausas
      if (tipo !== 'larga' && min > tope) min = Math.max(20, tope);
      cortas.push({ tipo: tipo, min: Math.max(15, min) });
    }
    // 3) km: la larga es el 27 % del volumen (o la carrera el dia que toca); el resto se reparte
    //    sobre lo que queda, sin romper el ritmo de cada tipo de sesion.
    var esSemanaDescarga = (w % 4 === 0) || w === n - 1;
    // la ultima semana normal no trae la larga mas larga del plan: 20 % por debajo del pico
    var picoLarga = 0;
    semanas.forEach(function (sw) { if (sw.larga > picoLarga) picoLarga = sw.larga; });
    var kmLarga;
    if (esCarrera) {
      kmLarga = meta.km;
      cortas.forEach(function (c) { if (c.tipo !== 'larga') c.min = Math.max(10, Math.round(minDeSesion('regenerativo', 0) * 0.5)); });
    } else {
      // la larga crece con la semana y no se estira para cuadrar numeros: el 32 % es su techo
      var fracLarga = 0.22 + 0.06 * Math.min(1, w / Math.max(2, n - 2));
      if (esSemanaDescarga) fracLarga = 0.22;
      // la larga se mueve entre su minimo semanal y su techo del 32 % (36 % con el volumen bajo)
      var techoLarga = volKm * (w <= 2 ? 0.36 : 0.32);
      var pisoLarga = Math.min(techoLarga, volKm * 0.24 * (1 + 0.25 * Math.min(1, w / 6)));
      kmLarga = Math.round(Math.min(meta.largaMax, techoLarga, Math.max(pisoLarga, volKm * fracLarga)) * 10) / 10;
      if (w === n - 2 && picoLarga > 0) kmLarga = Math.min(kmLarga, Math.round(picoLarga * 0.85 * 10) / 10);
      if (kmLarga < 2) kmLarga = 2;
    }
    var minLarga = Math.round(kmLarga * ritmoDe(p, 'larga'));
    if (tipo === 'larga') { }   // la larga no la topa el minuto diario
    var minCortas = 0;
    cortas.forEach(function (c) { if (c.tipo !== 'larga') minCortas += c.min; });
    // el volumen lo manda la semana: la larga se lleva su parte y las cortas el resto.
    // El tiempo se recalcula despues con el ritmo de cada tipo; si sale fuera de rango,
    // se ajusta el km, no se inventa un ritmo.
    var presupuesto = Math.round((volKm - kmLarga) * 10) / 10;
    cortas.forEach(function (c) {
      if (c.tipo === 'larga') { c.km = kmLarga; c.min = minLarga; return; }
      var r = ritmoDe(p, c.tipo);
      if (esCarrera) {   // calentamiento suelto antes de la carrera
        c.km = Math.max(1.5, Math.round(c.min / r * 10) / 10);
        return;
      }
      var parte = (minCortas > 0) ? presupuesto * (c.min / minCortas) : presupuesto / Math.max(1, dias - 1);
      // el tiempo manda: el km sale de los minutos que la persona tiene ese dia
      // el km del reparto manda; los minutos salen de ese km y se topan al tiempo del dia
      var mn = Math.min(tope, Math.max(15, Math.round(Math.max(1.5, Math.round(parte * 10) / 10) * r)));
      c.min = mn;
      c.km = Math.max(1.5, Math.round(mn / r * 10) / 10);
      // y si de ahi sale mas km del que toca, se queda el del reparto
      var kmParte = Math.max(1.5, Math.round(parte * 10) / 10);
      if (c.km > kmParte * 1.8) { c.km = Math.round(kmParte * 1.8 * 10) / 10; c.min = Math.max(15, Math.round(c.km * r)); }
    });
    var sumKm = 0, sumMin = 0;
    cortas.forEach(function (c) { if (c.tipo !== 'larga') { sumKm += c.km; sumMin += c.min; } });
    var totalKm;
    if (esCarrera) {
      // la semana de la carrera no suma entrenamiento: el km de la semana es la carrera
      // el km de la semana es la distancia de la carrera; las cortas son trote aparte
      totalKm = meta.km + Math.round(sumKm * 10) / 10;
    } else {
      sumKm += kmLarga;
      totalKm = Math.round(sumKm * 10) / 10;
    }
    var filas = cortas.map(function (c, ix) { return { i: ix + 1, tipo: c.tipo, km: c.km, min: c.min }; });
    var largoKm = kmLarga;
    // la semana de la carrera se cuenta como SU distancia mas los trotes de calentamiento
    semanas.push({ n: w, km: totalKm, larga: largoKm, filas: filas, descarga: (w % 4 === 0),
                   carrera: esCarrera ? meta.km : null });
  }
  var pico = 0;
  semanas.forEach(function (s) { if (s.km > pico) pico = s.km; });
  return { semanas: semanas, total: Math.round(pico * 10) / 10, techo: techo };
}

function diaTotal(tipos) { return tipos; }

// Minutos por km de referencia solo para prescribir tiempo; el ritmo real lo manda la FC.
// Se parte de un ritmo conservador por meta y se ajusta por nivel y por meta.
// El entrenamiento se prescribe en TIEMPO. Los minutos se eligen para que el km que salga de ahi
// no rebase lo que su cuerpo aguanta; nunca al reves.
function minDeSesion(tipo, largo) {
  var t = { larga: [30, 40, 50, 60, 75, 90, 105, 120, 135, 150],
            facil: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65],
            regenerativo: [20, 25, 30, 30, 35, 35, 40, 40, 45, 45],
            calidad: [25, 28, 30, 32, 34, 36, 38, 40, 42, 45] }[tipo];
  return t[Math.max(0, Math.min(t.length - 1, largo))];
}

// Minutos por km de referencia: solo para saber si el tiempo propuesto es realista. El ritmo de la
// calle manda la FC (zona), no este numero.
function ritmoDe(p, tipo) {
  var base = { '5k': 7.4, '10k': 7.7, '21k': 8.1, '42k': 8.5 }[p.metaClave || '10k'] || 7.7;
  if (p.hist === 'constante') base -= 0.9;
  else if (p.hist === 'algo') base -= 0.3;
  if (p.imc && p.imc >= 30) base += 1.0;
  else if (p.imc && p.imc >= 27) base += 0.5;
  // la calidad se prescribe por FC y tiempo (series con trote entre medias): el ritmo
  // medio de esa sesion es el del rodaje, no el de una carrera
  if (tipo === 'larga') base += 0.4;
  else if (tipo === 'calidad') base -= 0.2;
  else if (tipo === 'regenerativo') base += 0.6;
  return Math.max(3.5, Math.round(base * 10) / 10);
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  var x = parseFloat(String(v).replace(',', '.'));
  return isFinite(x) ? x : null;
}

function lunesDe(fecha) {
  var d = fecha instanceof Date ? fecha : desFecha(fecha);
  if (!d) d = new Date();
  var dow = d.getUTCDay();                 // 0 dom .. 6 sab
  var back = (dow + 6) % 7;                // dias desde el lunes
  return isoFecha(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)));
}

function esFecha(f) { return /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')); }
function desFecha(f) {
  if (!esFecha(f)) return null;
  var q = String(f).split('-').map(Number);
  return new Date(Date.UTC(q[0], q[1] - 1, q[2]));
}
function isoFecha(d) { return d.toISOString().slice(0, 10); }
function hoyISO() {
  var d = new Date();
  return isoFecha(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

// Pone fecha a cada semana y a cada sesion (la larga cae en el ultimo dia de la semana).
function rellenar(plan, inicio) {
  var base = desFecha(inicio), out = [], w;
  for (w = 0; w < plan.semanas.length; w++) {
    var s = plan.semanas[w], o = {};
    for (var kk in s) if (s.hasOwnProperty(kk)) o[kk] = s[kk];
    o.fin = isoFecha(new Date(base.getTime() + (w * 7 + 6) * 86400000));
    o.filas = s.filas.map(function (f, idx) {
      var oo = {};
      for (var k2 in f) if (f.hasOwnProperty(k2)) oo[k2] = f[k2];
      oo.fecha = isoFecha(new Date(base.getTime() + (w * 7 + (idx === f.i - 1 ? f.i - 1 : idx)) * 86400000));
      return oo;
    });
    out.push(o);
  }
  return out;
}

  // Semana del plan que corresponde a una fecha. La semana 1 arranca el 9 nov 2026 (el plan del dueno);
  // un corredor creado despues arranca el lunes de la semana en que se dio de alta.
  var INICIO = Date.UTC(2026, 10, 9);
  function inicioDe(id) {
    var e = cargar(), pl = e.planes[id];
    if (pl && pl.inicio && esFecha(pl.inicio)) {
      var q = pl.inicio.split('-').map(Number);
      return Date.UTC(q[0], q[1] - 1, q[2]);
    }
    return INICIO;
  }
  function semanaDe(fecha) {
    if (!esFecha(fecha)) return null;
    var p = fecha.split('-').map(Number);
    var dias = Math.floor((Date.UTC(p[0], p[1] - 1, p[2]) - INICIO) / 86400000);
    var n = Math.floor(dias / 7) + 1;
    return n < 1 ? 1 : (n > 21 ? 21 : n);
  }

  // Perfil efectivo: lo del vault, con encima lo que la persona haya ajustado en su telefono.
  // Asi la app se puede pasar a otra persona sin heredar el nombre ni la FC de quien la copio.
  function atleta(id) {
    var e = cargar();
    var b = PLANES_BASE.atletas[id] || e.planes[id], p = e.perfiles[id];
    if (!b) return null;
    var o = {}, k;
    for (k in b) if (b.hasOwnProperty(k)) o[k] = b[k];
    if (p) {
      ['nombre', 'edad', 'fcmax', 'fc_reposo', 'meta', 'carrera', 'notas'].forEach(function (c) {
        if (p[c] !== undefined && p[c] !== null && p[c] !== '') o[c] = p[c];
      });
      // Vaciado a proposito: carrera, meta y notas se pueden dejar en blanco y no deben volver al plan base.
      ['carrera', 'meta', 'notas', 'fc_reposo'].forEach(function (c) {
        if (p[c] === null || p[c] === '') o[c] = null;
      });
    }
    o.zonas = zonasDe(id);
    return o;
  }

  function filaSemana(id, n) {
    var ss = atleta(id).semanas, i;
    for (i = 0; i < ss.length; i++) if (ss[i].n === n) return ss[i];
    return null;
  }

  /* -------------------------------------------------------------- arranque */
  // Puerta 3: #agent=<base64url del JSON exportado>
  function leerHash() {
    try {
      var h = (global.location && global.location.hash) || '';
      var m = /(?:^#|[#&])agent=([A-Za-z0-9\-_]+)/.exec(h);
      if (!m) return null;
      var b = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var txt = decodeURIComponent(escape(atob(b)));
      var obj = JSON.parse(txt);
      return obj;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------- API */
  var Agente = {

    version: VERSION,

    /* ---------------------------------------------------------------- corredores
       El plan es de cada quien. `PLANES_BASE` es la plantilla que genera el vault
       (jonah, yuli) y encima viven los corredores creados aqui, cada uno con sus
       21 semanas, su registro y su perfil. Un lugar puede estar vacio («Atleta»). */
    corredores: function () {
      var e = cargar(), out = [], k;
      for (k in PLANES_BASE.atletas) if (PLANES_BASE.atletas.hasOwnProperty(k)) {
        if (e.salida && e.salida[k] === false) continue;   // se quito de la barra a proposito
        var a = atleta(k);
        out.push({ id: k, nombre: a.nombre, fcmax: a.fcmax, fc_reposo: a.fc_reposo, zonas: a.zonas,
                   carrera: a.carrera, meta: a.meta, base: true, registros: e.registro[k].length,
                   semanas: a.semanas.length, oculto: false });
      }
      for (k in e.planes) if (e.planes.hasOwnProperty(k)) {
        var b = atleta(k);
        out.push({ id: k, nombre: b.nombre, fcmax: b.fcmax, fc_reposo: b.fc_reposo, zonas: b.zonas,
                   carrera: b.carrera, meta: b.meta, base: false, registros: e.registro[k].length,
                   semanas: b.semanas.length, oculto: false });
      }
      return { ok: true, corredores: out, salida: e.salida };
    },

    // ¿Este lugar sale en la barra? Sirve para poder elegir a los dos aunque uno este oculto.
    salida: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar();
      return { ok: true, id: id, visible: !(e.salida && e.salida[id] === false), salida: e.salida };
    },

    // Muestra u oculta un lugar en la barra sin borrarle nada: el plan, el perfil y el registro siguen.
    // Se guarda explicito porque si el dueño apaga los dos para prestar el telefono, la plantilla no
    // debe reaparecer sola al recargar.
    mostrar: function (id, visible) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar();
      var s = e.salida || { jonah: true, yuli: true };
      s[id] = !(visible === false || visible === 0 || visible === 'no');
      e.salida = s;
      if (!guardar(e)) return { ok: false, error: 'no se pudo guardar' };
      avisar();
      return { ok: true, id: id, visible: s[id], salida: s };
    },

    // Alta de un corredor propio. Sin `id` se arma con el nombre; sin plan copia el de `copiarDe`.
    // Alta de corredor. Dos caminos:
    //   - con objetivo: el plan se ARMA con sus datos (semilla), no se copia el del dueno;
    //   - sin objetivo: se copia un plan de 21 semanas existente (compatibilidad con lo de antes).
    crearCorredor: function (o) {
      o = o || {};
      var nombre = String(o.nombre || '').trim();
      if (nombre.length < 2) return { ok: false, error: 'el nombre necesita al menos 2 letras' };
      var id = (o.id || nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                 .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
      if (!id) return { ok: false, error: 'no se pudo armar el id con ese nombre' };
      var e = cargar();
      if (idValido(id)) return { ok: false, error: 'ya existe el corredor ' + id };
      var plan, semanas, total, objetivo = null, base = false;
      if (o.objetivo) {
        var sem = Agente.semilla({
          id: id, nombre: nombre, objetivo: o.objetivo, inicio: o.inicio,
          kg: o.kg, cm: o.cm, edad: o.edad, fcmax: o.fcmax, fc_reposo: o.fc_reposo,
          historial: o.historial, conversacion: o.conversacion, dias: o.dias, min: o.min,
          molestias: o.molestias
        });
        if (!sem.ok) return { ok: false, error: sem.error, faltan: sem.faltan || [] };
        semanas = sem.semanas; total = sem.km_declarado; objetivo = sem.objetivo;
        base = !!sem.base;
      } else {
        var origen = null;
        if (o.copiarDe) {
          origen = e.planes[o.copiarDe] || PLANES_BASE.atletas[o.copiarDe];
          if (!origen) return { ok: false, error: 'no existe el plan a copiar: ' + o.copiarDe };
        } else origen = PLANES_BASE.atletas.jonah;
        semanas = JSON.parse(JSON.stringify(origen.semanas || []));
        if (semanas.length !== 21) return { ok: false, error: 'el plan a copiar no tiene 21 semanas' };
        total = origen.km_declarado || null;
      }
      plan = {
        nombre: nombre, edad: num(o.edad) ? Math.round(o.edad) : null,
        fcmax: num(o.fcmax) ? Math.round(o.fcmax) : (num(o.edad) ? Math.round(208 - 0.7 * num(o.edad)) : null),
        fc_reposo: num(o.fc_reposo) ? Math.round(o.fc_reposo) : null,
        kg: num(o.kg), cm: num(o.cm),
        carrera: o.carrera || null, meta: o.meta || null, notas: o.notas || /^\s*$/.test(String(o.molestias || '')) === false ? o.molestias : (o.notas || null),
        objetivo: objetivo, base: base,
        dias: num(o.dias) ? Math.round(o.dias) : null, min: num(o.min) ? Math.round(o.min) : null,
        inicio: o.inicio || semanas[0] && semanas[0].fin ? (semanas[0].fecha || null) : null,
        semanas_total: semanas.length,
        semanas: semanas, km_declarado: total
      };
      if (!plan.inicio) {
        // el plan trae fecha en las filas; si no, arranca el lunes de esta semana
        var primera = semanas[0] && semanas[0].filas && semanas[0].filas[0];
        plan.inicio = (primera && primera.fecha) || lunesDe(hoyISO());
      }
      e.planes[id] = plan;
      e.registro[id] = []; e.ajustes[id] = [];
      if (o.perfil !== false) e.perfiles[id] = { nombre: nombre };
      if (!guardar(e)) return { ok: false, error: 'no se pudo guardar' };
      avisar();
      return { ok: true, id: id, nombre: nombre, objetivo: objetivo, base: base,
               inicio: plan.inicio, semanas_total: semanas.length, km_declarado: total,
               corredor: Agente.leer(id).atleta };
    },

    // Guarda el plan de un corredor (las 21 semanas) para que no se pierda al recargar.
    // El vault sigue siendo la fuente de verdad del plan de Jonah y de Yuli.
    guardarPlan: function (id, semanas) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      if (!Array.isArray(semanas) || semanas.length !== 21) return { ok: false, error: 'faltan semanas: se esperan 21' };
      var e = cargar();
      if (!e.planes[id]) return { ok: false, error: 'ese corredor no tiene plan propio (es plantilla del vault)' };
      e.planes[id].semanas = semanas.slice();
      guardar(e); avisar();
      return { ok: true, semanas: e.planes[id].semanas.length };
    },

    borrarCorredor: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar();
      if (!e.planes[id]) return { ok: false, error: 'ese corredor es plantilla del vault: no se borra desde la app' };
      delete e.planes[id]; delete e.perfiles[id];
      e.registro[id] = []; e.ajustes[id] = [];
      guardar(e); avisar();
      return { ok: true, borrado: id };
    },

    atletas: function () {
      var out = [], k;
      for (k in PLANES_BASE.atletas) if (PLANES_BASE.atletas.hasOwnProperty(k)) {
        var a = atleta(k);
        out.push({ id: k, nombre: a.nombre, fcmax: a.fcmax, edad: a.edad, meta: a.meta });
      }
      return { ok: true, atletas: out };
    },

    // Estado completo de un atleta: lo que un agente necesita para decidir.
    leer: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var a = atleta(id), e = cargar();
      return {
        ok: true,
        atleta: { id: id, nombre: a.nombre, edad: a.edad, fcmax: a.fcmax, fc_reposo: a.fc_reposo,
                  zonas: a.zonas, carrera: a.carrera, meta: a.meta },
        semanas: a.semanas,
        registro: e.registro[id].slice().sort(function (x, y) { return x.fecha < y.fecha ? -1 : 1; }),
        ajustes: e.ajustes[id].slice(),
        km_declarado: a.km_declarado
      };
    },

    zonas: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var a = atleta(id);
      return { ok: true, fcmax: a.fcmax, fc_reposo: a.fc_reposo, modo: a.zonas.__modo || 'pct', zonas: a.zonas };
    },

    // Personaliza el lugar 1 o 2 para otra persona (el caso "le paso la app a mi hermano").
    // Cambiar la FC maxima recalcula las cinco zonas; cambiar el nombre no toca nada mas.
    perfil: function (id, campos) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      if (!campos || typeof campos !== 'object') return { ok: false, error: 'falta el perfil' };
      var e = cargar();
      var p = e.perfiles[id] || {};
      if (campos.nombre !== undefined) {
        var n = String(campos.nombre).trim().slice(0, 40);
        if (n.length < 2) return { ok: false, error: 'el nombre necesita al menos 2 letras' };
        p.nombre = n;
      }
      if (campos.edad !== undefined && campos.edad !== '') {
        var ed = Number(campos.edad);
        if (!isFinite(ed) || ed < 10 || ed > 100) return { ok: false, error: 'edad fuera de rango (10-100)' };
        p.edad = Math.round(ed);
      }
      if (campos.fcmax !== undefined && campos.fcmax !== '') {
        var f = Number(campos.fcmax);
        if (!isFinite(f) || f < 120 || f > 220) return { ok: false, error: 'FC máxima fuera de rango (120-220)' };
        p.fcmax = Math.round(f);
      }
      if (campos.fc_reposo !== undefined) {
        if (campos.fc_reposo === '' || campos.fc_reposo === null) p.fc_reposo = null;  // vaciado explicito
        else {
          var fr = Number(campos.fc_reposo);
          if (!isFinite(fr) || fr < 30 || fr > 110) return { ok: false, error: 'FC de reposo fuera de rango (30-110)' };
          p.fc_reposo = Math.round(fr);
        }
      }
      if (campos.meta !== undefined) p.meta = String(campos.meta).slice(0, 80);
      // "Tu caso": lesiones, condiciones o medicamentos que deben salir en la ficha de cada sesion.
      if (campos.notas !== undefined) {
        var nt = String(campos.notas).replace(/\s+/g, ' ').trim().slice(0, 300);
        p.notas = nt || null;
      }
      if (campos.carrera !== undefined) {
        if (campos.carrera && !esFecha(campos.carrera)) return { ok: false, error: 'fecha de carrera invalida' };
        p.carrera = campos.carrera || null;
      }
      e.perfiles[id] = p;
      if (!guardar(e)) return { ok: false, error: 'no se pudo guardar' };
      avisar();
      var a = atleta(id);
      return { ok: true, perfil: p, zonas: a.zonas, fcmax: a.fcmax };
    },

    // Deja el lugar en blanco para entregarlo a otra persona: borra registro, ajustes y perfil.
    reiniciar: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar();
      e.registro[id] = []; e.ajustes[id] = []; delete e.perfiles[id];
      guardar(e);
      return { ok: true, atleta: id };
    },

    // Que toca hoy: la semana del plan, sus tres sesiones y cuales ya estan registradas.
    sesionDeHoy: function (id, fecha) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      fecha = fecha || hoyISO();
      if (!esFecha(fecha)) return { ok: false, error: 'fecha invalida: ' + fecha };
      var n = semanaDe(fecha), f = filaSemana(id, n);
      var e = cargar();
      var yaEnSemana = e.registro[id].filter(function (r) { return semanaDe(r.fecha) === n; });
      var hechas = {};
      yaEnSemana.forEach(function (r) { hechas[r.tipo] = true; });
      var pendientes = ['calidad', 'facil', 'larga'].filter(function (t) { return !hechas[t]; });
      return {
        ok: true, fecha: fecha, semana: n, fila: f,
        pendientes: pendientes,
        sugerida: pendientes.length ? pendientes[0] : null,
        registradas: yaEnSemana
      };
    },

    // Lectura del registro para el feedback: ritmo, comparacion con la semana previa
    // y si la sesion cabe en el plan (km de la semana, techo de pulso).
    balance: function (id, fecha) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      fecha = fecha || hoyISO();
      if (!esFecha(fecha)) return { ok: false, error: 'fecha invalida: ' + fecha };
      var a = atleta(id), e = cargar(), n = semanaDe(fecha), f = filaSemana(id, n);
      var reg = e.registro[id];
      function norm(r) {
        var k = Number(r.km) || 0, m = Number(r.min) || 0;
        return { fecha: r.fecha, tipo: r.tipo, km: k, min: m, ritmo: k > 0 && m > 0 ? m / k : null,
                 fc_media: r.fc_media == null ? null : Number(r.fc_media),
                 fc_max: r.fc_max == null ? null : Number(r.fc_max), zona: r.zona || '' };
      }
      var esta = reg.filter(function (r) { return semanaDe(r.fecha) === n; }).map(norm);
      var prev = reg.filter(function (r) { return semanaDe(r.fecha) === n - 1; }).map(norm);
      function suma(xs, k) { return xs.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0); }
      function ritmoMed(xs) {
        var k = suma(xs, 'km'), m = suma(xs, 'min');
        return k > 0 && m > 0 ? m / k : null;
      }
      var hechas = {}; esta.forEach(function (r) { hechas[r.tipo] = r; });
      var pendientes = ['calidad', 'facil', 'larga'].filter(function (t) { return !hechas[t]; });
      var techo = a.zonas && a.zonas.Z2 ? a.zonas.Z2[1] : null;
      var kmHechos = suma(esta, 'km'), pct = f && f.km ? Math.round(kmHechos / f.km * 100) : null;
      var avisos = [];
      if (f) {
        if (kmHechos > f.km * 1.15) avisos.push('la semana va por ' + kmHechos.toFixed(1) + ' km contra ' + f.km + ' del plan: si te sientes cargado, baja la siguiente');
        else if (pct != null && esta.length >= 2 && pct < 50 && pendientes.length === 0) avisos.push('quedaste corto: ' + kmHechos.toFixed(1) + ' de ' + f.km + ' km, la siguiente no se sube');
        if (pendientes.length) avisos.push('faltan: ' + pendientes.join(', ') + ' (si el dia ya paso, se camina o se mueve, no se pega al siguiente)');
      }
      var altas = esta.filter(function (r) { return techo && r.fc_max && r.fc_max > techo; });
      if (altas.length) avisos.push(altas.length + ' sesion(es) pasaron el techo de Z2 (' + techo + '): esas son las que piden mas recuperacion');
      var rEsta = ritmoMed(esta), rPrev = ritmoMed(prev);
      var delta = rEsta && rPrev ? Math.round((rEsta - rPrev) * 60) : null;   // seg/km, negativo = mas rapido
      if (delta != null && delta <= -15 && esta.length >= 2) avisos.push('vas ' + Math.abs(delta) + ' s/km mas rapido que la semana pasada con ' + esta.length + ' sesiones: bien, pero sin subir km a la vez');
      return { ok: true, semana: n, fila: f, esta: esta, previa: prev, kmHechos: kmHechos, kmPrevios: suma(prev, 'km'),
        horasHechas: Math.round(suma(esta, 'min') / 6) / 10, horasPrevias: Math.round(suma(prev, 'min') / 6) / 10,
        pct: pct, ritmo: rEsta, ritmoPrev: rPrev, deltaSeg: delta, pendientes: pendientes, avisos: avisos,
        proxima: filaSemana(id, Math.min(21, n + 1)) };
    },

    // Guarda una sesion hecha. Valida todo antes de escribir: si algo no cuadra, no entra nada.
    registrar: function (id, s) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      if (!s || typeof s !== 'object') return { ok: false, error: 'falta la sesion' };
      var fecha = s.fecha || hoyISO();
      if (!esFecha(fecha)) return { ok: false, error: 'fecha invalida (usa AAAA-MM-DD)' };
      var tipo = String(s.tipo || '').toLowerCase();
      if (['calidad', 'facil', 'larga', 'fuerza', 'carrera', 'otro'].indexOf(tipo) < 0) {
        return { ok: false, error: 'tipo invalido: usa calidad, facil, larga, fuerza, carrera u otro' };
      }
      var km = s.km === undefined || s.km === null || s.km === '' ? null : Number(s.km);
      var min = s.min === undefined || s.min === null || s.min === '' ? null : Number(s.min);
      var fcm = s.fc_media === undefined || s.fc_media === '' ? null : Number(s.fc_media);
      var fcx = s.fc_max === undefined || s.fc_max === '' ? null : Number(s.fc_max);
      var esf = s.esf === undefined || s.esf === '' ? null : Number(s.esf);
      if (km !== null && (!isFinite(km) || km < 0 || km > 120)) return { ok: false, error: 'km fuera de rango (0-120)' };
      if (min !== null && (!isFinite(min) || min <= 0 || min > 1440)) return { ok: false, error: 'min fuera de rango (1-1440)' };
      if (fcm !== null && (!isFinite(fcm) || fcm < 30 || fcm > 230)) return { ok: false, error: 'fc_media fuera de rango (30-230)' };
      if (fcx !== null && (!isFinite(fcx) || fcx < 30 || fcx > 230)) return { ok: false, error: 'fc_max fuera de rango (30-230)' };
      if (fcm !== null && fcx !== null && fcx < fcm) return { ok: false, error: 'fc_max no puede ser menor que fc_media' };
      if (esf !== null && (!isFinite(esf) || esf < 1 || esf > 10)) return { ok: false, error: 'esfuerzo fuera de rango (1-10)' };

      var e = cargar();
      var dup = e.registro[id].some(function (r) { return r.fecha === fecha && r.tipo === tipo; });
      if (dup) return { ok: false, error: 'ya hay una sesion de ' + tipo + ' el ' + fecha };

      var fila = {
        fecha: fecha, tipo: tipo, km: km, min: min,
        fc_media: fcm, fc_max: fcx,
        zona: s.zona || zonaDe(id, fcm),
        esf: esf, molestia: String(s.molestia || '').slice(0, 300),
        nota: String(s.nota || '').slice(0, 500),
        semana: semanaDe(fecha),
        creado: new Date().toISOString()
      };
      e.registro[id].push(fila);
      if (!guardar(e)) return { ok: false, error: 'no se pudo guardar (almacen lleno o bloqueado)' };
      avisar();
      return { ok: true, sesion: fila, total: e.registro[id].length };
    },

    // Borra una sesion por fecha y tipo (para corregir un error de dedo).
    borrar: function (id, fecha, tipo) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar(), antes = e.registro[id].length;
      e.registro[id] = e.registro[id].filter(function (r) { return !(r.fecha === fecha && r.tipo === tipo); });
      if (e.registro[id].length === antes) return { ok: false, error: 'no existe esa sesion' };
      guardar(e); avisar();
      return { ok: true, quedan: e.registro[id].length };
    },

    // Ajusta una fila del plan y deja la razon escrita: el plan cambia, el historial no se pierde.
    // Campo libre del corredor: futbol el jueves, lluvia, quiere un dia mas.
    nota: function (id, texto, tipo, semana) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var v = notaValida(texto);
      if (!v.ok) return v;
      var e = cargar();
      if (!e.notas) e.notas = {};
      if (!e.notas[id]) e.notas[id] = [];
      var inf = interpretarNota(v.texto);
      var reg = {
        fecha: hoyISO(), semana: Number(semana) || semanaDe(hoyISO()),
        texto: v.texto, tipo: (tipo && TIPOS_NOTA.indexOf(tipo) >= 0) ? tipo : 'otro',
        dias_bloqueados: inf.dias_bloqueados, quiere_mas_dias: inf.quiere_mas_dias,
        motivo: inf.motivo, creado: new Date().toISOString()
      };
      e.notas[id].push(reg);
      if (e.notas[id].length > 60) e.notas[id] = e.notas[id].slice(-60);
      guardar(e); avisar();
      // lo que la app deduce sola, para que el coach no tenga que adivinarlo
      var r = { ok: true, nota: reg, leida: inf };
      if (reg.quiere_mas_dias) {
        var a = atleta(id), d = Number(a.dias) || 0;
        if (d >= 6) {
          r.sugerencia = 'ya entrena 6 dias: no se sube mas; si pide otra sesion, se cambia calidad por volumen suave';
        } else if (!d) {
          r.sugerencia = 'no consta cuantos dias entrena: preguntale antes de sumar uno';
        } else {
          var n2 = d + 1;
          r.sugerencia = 'la siguiente semana con ' + n2 + ' ' + (n2 === 1 ? 'dia' : 'dias') +
            ' (traia ' + d + '): rearma con Agente.semilla({dias:' + n2 + '}) o reparte el volumen en ' + n2 + ' sesiones con Agente.guardarPlan';
        }
      }
      if (reg.dias_bloqueados.length) {
        r.sugerencia_dias = 'esos dias no se programan: mueve la sesion, no la borres';
      }
      return r;
    },

    leerNotas: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      return { ok: true, notas: notasDe(id) };
    },

    borrarNota: function (id, fecha) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar();
      if (!e.notas || !e.notas[id]) return { ok: false, error: 'sin notas' };
      var n0 = e.notas[id].length;
      e.notas[id] = e.notas[id].filter(function (x) { return x.fecha !== fecha; });
      guardar(e); avisar();
      return { ok: n0 !== e.notas[id].length, quedan: e.notas[id].length };
    },

    ajustarSemana: function (id, n, campos, razon) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      n = Number(n);
      if (!(n >= 1 && n <= 21)) return { ok: false, error: 'semana fuera de rango (1-21)' };
      if (!razon || String(razon).length < 3) return { ok: false, error: 'falta la razon del ajuste' };
      var e = cargar();
      var cambio = { semana: n, razon: String(razon).slice(0, 300), cuando: new Date().toISOString(), campos: {} };
      ['km', 'larga', 'calidad', 'nota'].forEach(function (k) {
        if (campos && campos[k] !== undefined) {
          if (k === 'km' || k === 'larga') {
            var v = Number(campos[k]);
            if (!isFinite(v) || v < 0) return;
            PLANES_BASE.atletas[id].semanas.forEach(function (s) { if (s.n === n) s[k] = v; });
            cambio.campos[k] = v;
          } else {
            PLANES_BASE.atletas[id].semanas.forEach(function (s) { if (s.n === n) s[k] = String(campos[k]); });
            cambio.campos[k] = String(campos[k]);
          }
        }
      });
      e.ajustes[id].push(cambio);
      guardar(e); avisar();
      return { ok: true, ajuste: cambio, fila: filaSemana(id, n) };
    },

    exportar: function (id) {
      var e = cargar();
      if (id) {
        if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
        var a = atleta(id);
        return { ok: true, json: JSON.stringify({
          api: VERSION, exportado: new Date().toISOString(),
          atleta: { id: id, nombre: a.nombre, edad: a.edad, fcmax: a.fcmax, fc_reposo: a.fc_reposo, zonas: a.zonas },
          semanas: a.semanas, registro: e.registro[id], ajustes: e.ajustes[id]
        }) };
      }
      return { ok: true, json: JSON.stringify({ api: VERSION, exportado: new Date().toISOString(),
        atletas: PLANES_BASE.atletas, perfiles: e.perfiles, registro: e.registro, ajustes: e.ajustes }) };
    },

    // Importa un JSON exportado. Sin id, importa todo el paquete (un atleta por bloque).
    importar: function (texto) {
      var obj = typeof texto === 'string' ? JSON.parse(texto) : texto;
      var entraron = 0, k;
      if (obj && obj.atletas) {
        for (k in obj.atletas) {
          if (!idValido(k)) continue;
          if (obj.perfiles && obj.perfiles[k]) Agente.perfil(k, obj.perfiles[k]);
          var r = Array.isArray(obj.registro) ? obj.registro : (obj.registro && obj.registro[k]);
          if (Array.isArray(r)) {
            r.forEach(function (s) { if (Agente.registrar(k, s).ok) entraron++; });
          }
        }
      } else if (obj && obj.atleta && idValido(obj.atleta.id) && Array.isArray(obj.registro)) {
        var id = obj.atleta.id;
        var per = {};
        ['nombre', 'edad', 'fcmax', 'fc_reposo', 'meta', 'carrera'].forEach(function (c) {
          if (obj.atleta[c] !== undefined && obj.atleta[c] !== null) per[c] = obj.atleta[c];
        });
        if (per.nombre || per.fcmax) Agente.perfil(id, per);
        obj.registro.forEach(function (s) { if (Agente.registrar(id, s).ok) entraron++; });
      } else {
        return { ok: false, error: 'el JSON no tiene la forma plan-maraton/v1' };
      }
      return { ok: true, importadas: entraron };
    },

    webhook: function (url) {
      var e = cargar();
      if (url === null || url === '') { e.webhook = null; guardar(e); return { ok: true, webhook: null }; }
      if (!/^https:\/\/[^\s]+$/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) {
        return { ok: false, error: 'la URL debe empezar con https:// (o http://127.0.0.1 para pruebas)' };
      }
      e.webhook = url; guardar(e);
      return { ok: true, webhook: e.webhook };
    },

    // Aviso al agente externo. Nunca bloquea ni rompe: si el endpoint esta caido, la app sigue.
    avisar: function () { avisar(); return { ok: true }; },

    // Aplica un #agent=<json> si viene en la URL. Devuelve que hizo, para poder probarlo.
    aplicarHash: function () {
      var obj = leerHash();
      if (!obj) return { ok: false, error: 'sin #agent valido' };
      var r = Agente.importar(obj);
      try { global.history.replaceState(null, '', (global.location.pathname || '') + (global.location.search || '')); } catch (x) {}
      return r;
    },

    limpiar: function (id) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      var e = cargar(); e.registro[id] = []; guardar(e);
      return { ok: true };
    },

    hoy: hoyISO,
    semanaDe: semanaDe,
    hoy: hoyISO,
    iso: function (d) {
      var m = d.getMonth() + 1, dd = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
    },
    fechasDeSemana: function (n) {
      var ini = new Date(INICIO + (n - 1) * 7 * 86400000);
      var fin = new Date(ini.getTime() + 6 * 86400000);
      function f(x) { var y = x.getDate(); return (y < 10 ? '0' : '') + y; }
      return f(ini) + '-' + f(fin);
    },

    // Ficha de una sesion: que se hace, en que pulso, cuando se corta y que se anota.
    // Es dato puro, sin pantalla: la app y el agente leen lo mismo.
    ficha: function (id, tipo, fecha) {
      if (!idValido(id)) return { ok: false, error: 'atleta desconocido: ' + id };
      fecha = fecha || hoyISO();
      if (!esFecha(fecha)) return { ok: false, error: 'fecha invalida: ' + fecha };
      tipo = String(tipo || '').toLowerCase();
      if (['calidad', 'facil', 'larga'].indexOf(tipo) < 0) {
        return { ok: false, error: 'tipo invalido: usa calidad, facil o larga' };
      }
      var a = atleta(id), n = semanaDe(fecha), f = filaSemana(id, n);
      if (!f) return { ok: false, error: 'semana fuera del plan' };
      var z = a.zonas, z2 = z.Z2, z5 = z.Z5;
      var etq = z.__modo === 'reserva' ? 'reserva' : '% FC máx';
      var e = cargar();
      var hecha = e.registro[id].filter(function (r) {
        return semanaDe(r.fecha) === n && r.tipo === tipo;
      })[0] || null;
      var quedan = Math.round((f.km - f.larga) * 10) / 10;   // km fuera de la larga
      var pasos = [];

      if (tipo === 'calidad') {
        var trabajo = String(f.calidad || '');
        pasos = [
          ['Objetivo', 'ganar velocidad sin sumar volumen: es la sesión que más se nota y la que más se paga si se hace de más.'],
          ['Calentamiento', '10-15 min en Z2 (' + z2[0] + '-' + z2[1] + ') y 4 rectas de 20 s con 40 s de pausa.'],
          ['Trabajo', trabajo.charAt(0).toUpperCase() + trabajo.slice(1) + '.'],
          ['Pulso', 'los tramos fuertes hasta ' + z5[1] + ' (Z5); la recuperación suave, hasta bajar de ' + z2[1] + '.'],
          ['Fuerza', '15-20 min al final: sentadilla, puente de glúteo, plancha lateral y elevación de talones. Sin peso nuevo.'],
          ['Después', '5-10 min muy suave. Nada de calidad en las 48 h siguientes ni el día antes de la larga.'],
          ['Se corta si', 'duele la rodilla o el tobillo, o aparece el dolor que irradia: se suspende la sesión, no se aguanta.']
        ];
      } else if (tipo === 'facil') {
        pasos = [
          ['Objetivo', 'sumar kilómetros sin quitarte las piernas para la larga ni para la calidad.'],
          ['Duración', '45-60 min; si el día viene cargado, 30 min ya cuentan.'],
          ['Pulso', 'Z2: ' + z2[0] + '-' + z2[1] + ' por ' + etq + ', techo ' + z2[1] + '. Si se pasa por calor o por la cuesta, se baja el ritmo antes que la duración.'],
          ['Ritmo', 'da igual. Tiene que salir la conversación en frases completas; si no sale, vas fuerte.'],
          ['Cuándo', 'el día que quede libre, nunca el día antes de la larga ni pegado a la calidad.'],
          ['Cuenta como', 'de los ' + f.km + ' km de la semana, ' + f.larga + ' son la larga: el resto' +
            (quedan > 0 ? ' (unos ' + quedan + ' km)' : '') + ' se reparte entre este fácil y la calidad.'],
          ['Se corta si', 'molestia que va a más: se cambia por caminata y se anota la molestia.']
        ];
      } else {
        pasos = [
          ['Objetivo', 'acostumbrar músculo, tendón y cabeza al tiempo encima, no a la velocidad.'],
          ['Distancia', f.larga + ' km, en una sola salida.'],
          ['Pulso', 'Z2: ' + z2[0] + '-' + z2[1] + ' por ' + etq + ', techo ' + z2[1] + '. En subida manda el pulso: si se pasa del techo, se camina.'],
          ['Ritmo', 'sin objetivo. Se corre a conversación y el último km puede salir algo más vivo, nunca al revés.'],
          ['Antes / después', 'el día anterior, descanso o fácil corto; al día siguiente, nada de calidad.'],
          ['Agua y comida', 'si pasa de 75 min, agua cada 20 min; la comida se prueba en las largas largas, no el día de la carrera.'],
          ['Se corta si', 'dolor que irradia o pinchazo en la rodilla o el tobillo: se camina de vuelta y se anota dónde y en qué minuto.']
        ];
      }

      // Lo que es de esta semana y de este corredor, no del plan generico.
      if (f.nota) pasos.push(['Esta semana', String(f.nota)]);
      if (a.notas) pasos.push(['Tu caso', String(a.notas)]);
      if (!num(a.fc_reposo)) {
        pasos.push(['Para afinar', 'falta tu FC en reposo: 3 mañanas tumbado al despertar, sin moverte. Mientras tanto las zonas van por % de FC máxima.']);
      }

      var avisos = [];
      if (hecha) {
        var kmH = Number(hecha.km) || 0, minH = Number(hecha.min) || 0;
        avisos.push('Ya registrada el ' + hecha.fecha + ': ' + (kmH ? kmH + ' km' : '') +
          (minH ? (kmH ? ' en ' : '') + minH + ' min' : '') +
          (hecha.fc_media ? ' · FC media ' + hecha.fc_media : '') + '.');
        if (tipo === 'larga' && kmH && Math.abs(kmH - f.larga) >= 0.5) {
          avisos.push(kmH > f.larga ? 'Salieron ' + (Math.round((kmH - f.larga) * 10) / 10) +
            ' km de más: la siguiente no sube.' : 'Faltaron ' + (Math.round((f.larga - kmH) * 10) / 10) +
            ' km de la larga: se repite la distancia antes de subir.');
        }
        if (hecha.molestia) avisos.push('Anotaste molestia: «' + hecha.molestia + '» — si repite, se baja la semana.');
      } else {
        avisos.push('Sin registrar en la semana ' + n + '. Al guardarla se compara sola con lo pedido.');
      }

      return {
        ok: true, semana: n, tipo: tipo, fecha: fecha, fila: f, hecha: hecha,
        titulo: tipo === 'calidad' ? 'Calidad' : tipo === 'facil' ? 'Fácil' : 'Larga · ' + f.larga + ' km',
        resumen: tipo === 'calidad' ? String(f.calidad) + ' · con fuerza 15-20 min al final'
          : tipo === 'facil' ? '45-60 min en Z2 · suma volumen'
          : f.larga + ' km en Z2 · cuestas caminando',
        pasos: pasos.map(function (p) { return { k: p[0], v: p[1] }; }),
        avisos: avisos
      };
    },

    contrato: function () {
      return {
        api: VERSION,
        almacen: CLAVE,
        funciones: ['atletas', 'corredores', 'crearCorredor', 'guardarPlan', 'borrarCorredor',
                    'leer', 'zonas', 'sesionDeHoy', 'ficha', 'balance', 'registrar', 'borrar',
                    'ajustarSemana', 'perfil', 'reiniciar', 'exportar', 'importar',
                    'webhook', 'docs', 'aplicarHash'],
        sesion: ['fecha AAAA-MM-DD', 'tipo: calidad|facil|larga|fuerza|carrera|otro', 'km', 'min',
                 'fc_media', 'fc_max', 'zona (se calcula)', 'esf 1-10', 'molestia', 'nota'],
        limites: { fc: '30-230', km: '0-120', min: '1-1440', esf: '1-10' }
      };
    },

    docs: function () {
      return [
        'CONTRATO ' + VERSION,
        '',
        'La app es local-first: el estado vive en localStorage del telefono, clave "' + CLAVE + '".',
        'Todo pasa por window.Agente, que no depende de la pantalla.',
        '',
        'LECTURA',
        '  Agente.atletas()                  -> { ok, atletas:[{id,nombre,fcmax}] }',
        '  Agente.leer("jonah")              -> { ok, atleta, semanas[N], registro[], ajustes[] }',
        '  Agente.zonas("jonah")             -> { ok, fcmax, zonas:{Z1:[lo,hi],...} }',
        '  Agente.sesionDeHoy("jonah")       -> { ok, semana, fila, pendientes[], sugerida }',
        '  Agente.ficha("jonah","larga")     -> { ok, titulo, resumen, pasos:[{k,v}], hecha, avisos[] }',
        '  Agente.balance("jonah")           -> { ok, kmHechos, pct, ritmo, deltaSeg, pendientes[], avisos[] }',
        '  Agente.leerNotas("jonah")         -> { ok, notas:[{fecha,semana,texto,tipo,dias_bloqueados[],quiere_mas_dias}] }',
        '',
        'ESCRITURA',
        '  Agente.registrar("jonah", {fecha:"2026-11-11", tipo:"facil", km:4, min:32,',
        '                            fc_media:128, fc_max:140, esf:4, molestia:""})',
        '  Agente.borrar("jonah","2026-11-11","facil")',
        '  Agente.ajustarSemana("jonah", 5, {km:24}, "se subio por semana limpia")',
        '  Agente.nota("jonah","El jueves juego futbol y el sabado llueve","evento")',
        '     -> guarda lo que la app no sabe; devuelve { nota, leida:{dias_bloqueados,quiere_mas_dias,motivo}, sugerencia }',
        '        OBLIGATORIO antes de mover una semana: leer notas() y respetar dias_bloqueados.',
        '  Agente.borrarNota("jonah","2026-11-12")',
        '',
        'CORREDORES (cada quien con su plan)',
        '  Agente.corredores()               -> { ok, corredores:[{id,nombre,base,semanas,registros}] }',
        '  Agente.semilla(o)                 -> arma un plan NUEVO desde los datos, sin copiar a nadie:',
        '    o = {nombre, objetivo:"5k|10k|21k|42k|base", inicio:"AAAA-MM-DD", edad, kg, cm, fcmax,',
        '         fc_reposo, dias:3, min:45, corre20:true, historial:"algo|poco|ninguno", molestias:""}',
        '    -> { ok, id, objetivo, inicio, semanas_total, km_declarado, imc, nivel, plan }',
        '       o { ok:false, error, faltan:[...] }  (lo que falta se dice, no se adivina)',
        '  Agente.crearCorredor({...o})      -> lo mismo que semilla, ya guardado en localStorage',
        '  Agente.objetivos()                -> { ok, metas:[{clave,km,semanas,dias,largaMax,nota}] }',
        '  Agente.guardarPlan("ana", semanas)  -> reemplaza el plan completo de un corredor propio',
        '  Agente.borrarCorredor("ana")        -> solo para corredores propios, no la plantilla',
        '',
        'PERFIL (para usar la app con otra persona)',
        '  Agente.perfil("jonah", {nombre:"Ana", edad:35, fcmax:190, meta:"terminar"})',
        '    -> recalcula las 5 zonas por % de FC maxima; no toca el plan ni el registro',
        '  Agente.reiniciar("jonah")   -> deja el lugar en blanco (borra registro, ajustes y perfil)',
        '',
        'DATOS',
        '  Agente.exportar()        -> { ok, json }     (paquete completo)',
        '  Agente.exportar("jonah") -> { ok, json }     (un atleta)',
        '  Agente.importar(json)    -> { ok, importadas }',
        '',
        'PUERTAS PARA OTRO AGENTE',
        '  1. JS:      llamar las funciones de arriba (consola del navegador o computer use).',
        '  2. Archivo: boton Exportar/Importar; el JSON viaja por WhatsApp o correo.',
        '  3. URL:     abrir  https://.../maraton/#agent=<base64url(JSON exportado)>',
        '              El base64url se arma asi en Python:',
        '                base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")',
        '  4. Webhook: Agente.webhook("https://mi-agente/maraton") recibe un POST con',
        '              {api, atleta, registro, ajustes} en cada cambio. No espera respuesta.',
        ''
      ].join('\n');
    },
    // ------------------------------------------------------------- el plan vive aqui
    // Un corredor nuevo no hereda las 21 semanas de otro: se arma desde sus datos y su meta.
    // Reglas (running-coach + references/planes-otras-distancias.md):
    //   - rampa +10 % por semana y solo si la anterior quedo limpia, descarga ~30 % cada 4;
    //   - una sola calidad por semana, 48 h antes de la larga;
    //   - la larga nunca pasa de 30 % del volumen semanal;
    //   - el techo lo pone el punto de partida (IMC, historial, nivel de partida), no la meta que elige;
    //   - sin historial: no se le manda a la calle sin antes poder correr 20 min seguido.
    // Nada de esto adivina un ritmo: se prescribe por zona de FC + tiempo.
    // Que metas ofrece la app, para que un agente ajeno sepa que puede pedirle al corredor.
    objetivos: function () {
      return { ok: true, metas: Object.keys(METAS).map(function (k) {
        var m = METAS[k];
        return { clave: m.clave, nombre: m.nombre, km: m.km, semanas: m.semanas,
                 dias: m.dias, largaMax: m.largaMax || null };
      }) };
    },

    semilla: function (o) {
      o = o || {};
      var meta = String(o.objetivo || o.meta || '').trim();
      var r = preparar(meta, o);
      if (!r.ok) return r;
      var id = String(o.id || o.nombre || 'corredor').toLowerCase().normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '').slice(0, 24);
      var inicio = o.inicio || lunesDe(hoyISO());
      if (!esFecha(inicio)) return { ok: false, error: 'fecha de inicio invalida' };
      var semanas = rellenar(r.plan, inicio);
      return { ok: true, id: id, objetivo: r.meta.clave, inicio: inicio,
               semanas_total: semanas.length, km_declarado: r.plan.total,
               imc: r.perfil.imc, nivel: r.perfil.hist, fcmax: r.perfil.fcmax,
               faltan: r.perfil.faltan, base: r.base, caminata: r.perfil.caminata, notas: r.perfil.notas, semanas: semanas };
    },

    // Siguiente paso cuando faltan datos: pocos y en orden. No se pide todo de golpe.
    semillaPasos: function (faltan, base) {
      var f = faltan || [];
      if (base) {
        return ['Primero las 4-6 semanas para poder correr 20 minutos seguidos (3 salidas: trote-caminata, ' +
                'la mas larga 30 min). Despues de esa base se arma el plan de la meta que elijas.'];
      }
      var pasos = [];
      if (f.indexOf('fc_reposo') >= 0) {
        pasos.push('FC en reposo: 3 mananas seguidas, tumbado al despertar, antes de levantarte y sin hablar.');
      }
      if (f.indexOf('fcmax') >= 0) {
        pasos.push('FC maxima: la del reloj en los ultimos 30 s de una salida fuerte; si no la hay, se estima ' +
                   '(Tanaka, marcada como estimacion) y las zonas se usan como techo.');
      }
      if (f.indexOf('historial') >= 0) {
        pasos.push('Si hay reloj, 2-3 capturas de Garmin (Informes -> Progreso, filtrado a Carrera): ' +
                   'salidas y km de los ultimos 2 anos, la salida mas larga y el ritmo medio. Cambian el techo.');
      }
      if (f.indexOf('nivel') >= 0) {
        pasos.push('Prueba de conversacion: correr 20 minutos y decir una frase completa. Si se puede, el plan ' +
                   'arranca corriendo; si no, trote-caminata.');
      }
      if (f.indexOf('dias') >= 0) pasos.push('Dias reales por semana y minutos por sesion.');
      if (f.indexOf('molestias') >= 0) pasos.push('Molestias o lesiones previas (rodilla, planta del pie, espalda, cadera).');
      if (f.indexOf('tenis') >= 0) pasos.push('Tenis de correr (no de gimnasio) y por donde va a correr.');
      return pasos;
    },
  };

  function avisar() {
    var e = cargar();
    if (!e.webhook) return;
    try {
      var cuerpo = JSON.stringify({ api: VERSION, cuando: new Date().toISOString(),
        registro: e.registro, ajustes: e.ajustes });
      if (typeof fetch === 'function') {
        fetch(e.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                           body: cuerpo, mode: 'no-cors', keepalive: true })
          .catch(function () { /* si el agente esta caido, la app sigue igual */ });
      }
    } catch (x) {}
  }

  // Recoge un #agent=... al cargar, sin depender de que la UI exista.
  function arrancar() {
    try {
      var r = Agente.aplicarHash();
      if (r && r.ok) { Agente._hashAplicado = r; }
    } catch (e) {}
    // Si la interfaz ya esta montada, que se repinte con lo que acaba de entrar.
    if (typeof global.__refrescar === 'function') { try { global.__refrescar(); } catch (e) {} }
    try {
      global.addEventListener('hashchange', function () {
        try {
          var r2 = Agente.aplicarHash();
          if (r2 && r2.ok && global.document && typeof CustomEvent === 'function') {
            global.document.dispatchEvent(new CustomEvent('agente:cambio'));
          }
        } catch (x) {}
      });
    } catch (e) {}
    if (global.document && global.document.dispatchEvent && typeof CustomEvent === 'function') {
      try { global.document.dispatchEvent(new CustomEvent('agente:listo')); } catch (x) {}
    }
  }

  global.Agente = Agente;
  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', arrancar);
    } else { arrancar(); }
  }
})(typeof window !== 'undefined' ? window : this);
