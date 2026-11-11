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
  var PLANES_BASE = {"api":"plan-maraton/v1","generado":"2026-11-11","origen":"Obsidian: 02 - Proyectos/Maraton - plan*.md","atletas":{"jonah":{"edad":42,"fcmax":178,"fc_reposo":null,"nombre":"Jonah","zonas":{"Z1":[107,116],"Z2":[116,134],"Z3":[134,146],"Z4":[148,157],"Z5":[158,166]},"carrera":"2027-04-04","meta":"A 4:45 / B 5:00","semanas":[{"n":1,"fechas":"9 al 15 Nov","km":16.0,"larga":8.0,"calidad":"4x(1' fuerte / 2' suave)","nota":"Arranque suave: solo trotar y caminar si hace falta"},{"n":2,"fechas":"16 al 22 Nov","km":18.0,"larga":9.0,"calidad":"5x(1' / 2')","nota":"Volumen +10%, nada mas"},{"n":3,"fechas":"23 al 29 Nov","km":20.0,"larga":10.0,"calidad":"6x(1' / 2')","nota":"Ultima semana antes de descarga"},{"n":4,"fechas":"30 al 6 Dec","km":15.0,"larga":8.0,"calidad":"sin calidad","nota":"DESCARGA: baja 30%"},{"n":5,"fechas":"7 al 13 Dec","km":22.0,"larga":11.0,"calidad":"2x8' tempo a 6:10/km","nota":"Primer tempo, solo si la semana previa salio limpia"},{"n":6,"fechas":"14 al 20 Dec","km":24.0,"larga":12.0,"calidad":"3x8' tempo","nota":"Fuerza obligatoria, 2 dias"},{"n":7,"fechas":"21 al 27 Dec","km":26.0,"larga":13.0,"calidad":"5x1000 a 5:40/km","nota":"Semana mas larga de la fase"},{"n":8,"fechas":"28 al 3 Jan","km":20.0,"larga":10.0,"calidad":"sin calidad","nota":"DESCARGA"},{"n":9,"fechas":"4 al 10 Jan","km":28.0,"larga":14.0,"calidad":"4x10' tempo","nota":"Comer antes de las largas de mas de 90 min"},{"n":10,"fechas":"11 al 17 Jan","km":30.0,"larga":15.0,"calidad":"6x1000","nota":"Cadencia: meta 165 pasos/min"},{"n":11,"fechas":"18 al 24 Jan","km":32.0,"larga":16.0,"calidad":"2x15' tempo","nota":"Larga con ultimos 3 km a ritmo meta"},{"n":12,"fechas":"25 al 31 Jan","km":25.0,"larga":12.0,"calidad":"sin calidad","nota":"DESCARGA"},{"n":13,"fechas":"1 al 7 Feb","km":34.0,"larga":17.0,"calidad":"8x1000 a 5:35/km","nota":"TEST de 10 km el sabado"},{"n":14,"fechas":"8 al 14 Feb","km":36.0,"larga":18.0,"calidad":"3x15' tempo","nota":"Con el test se decide meta A o B"},{"n":15,"fechas":"15 al 21 Feb","km":38.0,"larga":20.0,"calidad":"10x1000","nota":"Larga con 5 km finales a ritmo meta"},{"n":16,"fechas":"22 al 28 Feb","km":30.0,"larga":15.0,"calidad":"sin calidad","nota":"DESCARGA"},{"n":17,"fechas":"1 al 7 Mar","km":40.0,"larga":22.0,"calidad":"2x20' tempo","nota":"Pico de volumen (no mas con este peso)"},{"n":18,"fechas":"8 al 14 Mar","km":42.0,"larga":24.0,"calidad":"12x1000","nota":"Ultima larga grande. Si hay molestia, 20 km"},{"n":19,"fechas":"15 al 21 Mar","km":34.0,"larga":18.0,"calidad":"6x1000 suave","nota":"DESCARGA y bajar carga"},{"n":20,"fechas":"22 al 28 Mar","km":26.0,"larga":12.0,"calidad":"4x(1' / 2') suave","nota":"TAPER: nada nuevo"},{"n":21,"fechas":"29 al 4 Apr","km":42.2,"larga":42.2,"calidad":"--","nota":"CARRERA 42.2 km"}],"km_declarado":556},"yuli":{"edad":39,"fcmax":181,"fc_reposo":null,"nombre":"Yuli","zonas":{"Z1":[109,118],"Z2":[118,136],"Z3":[136,148],"Z4":[150,159],"Z5":[161,168]},"carrera":"2027-04-04","meta":"A 5:15 / B 5:35 / C terminar","semanas":[{"n":1,"fechas":"9 - 15 nov","km":18.0,"larga":7.0,"calidad":"Intervalos 6x1' fuerte / 2' suave","nota":"Arranque recortado por anemia y fatiga: 18 km, no 20."},{"n":2,"fechas":"16 - 22 nov","km":22.0,"larga":8.0,"calidad":"Tempo 10' comodo-incomodo","nota":"Primer tempo; se corta si el esfuerzo pasa de 7."},{"n":3,"fechas":"23 - 29 nov","km":24.0,"larga":9.0,"calidad":"Intervalos 7x1' / 2' suave","nota":"Fuerza ya en dos sesiones completas."},{"n":4,"fechas":"30 nov - 6 dic","km":17.0,"larga":7.0,"calidad":"Sin calidad","nota":"Descarga: cae ~30 %. Aqui se absorbe el trabajo."},{"n":5,"fechas":"7 - 13 dic","km":26.0,"larga":10.0,"calidad":"Tempo 12'","nota":"Vuelve la carga; revisar sueno y hambre."},{"n":6,"fechas":"14 - 20 dic","km":28.0,"larga":11.0,"calidad":"Intervalos 8x1' / 90 s","nota":"Cadencia alta, zancada corta: no alargar el paso."},{"n":7,"fechas":"21 - 27 dic","km":30.0,"larga":13.0,"calidad":"Tempo 15'","nota":"Primera larga de 90 min; llevar agua."},{"n":8,"fechas":"28 dic - 3 ene","km":21.0,"larga":9.0,"calidad":"Sin calidad","nota":"Descarga."},{"n":9,"fechas":"4 - 10 ene","km":32.0,"larga":14.0,"calidad":"Intervalos 5x3' / 2' suave","nota":"Bloques mas largos, ritmo controlado."},{"n":10,"fechas":"11 - 17 ene","km":33.0,"larga":15.0,"calidad":"Tempo 18'","nota":"Ultimos 10 min de la larga a ritmo de maraton."},{"n":11,"fechas":"18 - 24 ene","km":35.0,"larga":17.0,"calidad":"Intervalos 4x5' / 2' suave","nota":"Semana fuerte: nada de peso extra ni otra actividad dura."},{"n":12,"fechas":"25 - 31 ene","km":24.0,"larga":11.0,"calidad":"Sin calidad","nota":"Descarga."},{"n":13,"fechas":"1 - 7 feb","km":37.0,"larga":18.0,"calidad":"Tempo 20'","nota":"Simulacro: ropa y desayuno del dia de carrera."},{"n":14,"fechas":"8 - 14 feb","km":38.0,"larga":19.0,"calidad":"Test 10 km a tope controlado","nota":"Con el test se fijan las metas A y B."},{"n":15,"fechas":"15 - 21 feb","km":40.0,"larga":22.0,"calidad":"Intervalos 3x8' / 2' suave","nota":"Pico de volumen; vigilar planta del pie y rodilla."},{"n":16,"fechas":"22 - 28 feb","km":28.0,"larga":15.0,"calidad":"Sin calidad","nota":"Descarga antes del pico final."},{"n":17,"fechas":"1 - 7 mar","km":42.0,"larga":24.0,"calidad":"Tempo 25'","nota":"Larga mas larga del plan hasta ahora; nada nuevo."},{"n":18,"fechas":"8 - 14 mar","km":43.0,"larga":28.0,"calidad":"Intervalos 5x2' / 1' suave","nota":"Pico absoluto. Ultima subida de volumen."},{"n":19,"fechas":"15 - 21 mar","km":32.0,"larga":16.0,"calidad":"Sin calidad","nota":"Descarga; el cuerpo empieza a guardar."},{"n":20,"fechas":"22 - 28 mar","km":24.0,"larga":11.0,"calidad":"Tempo 10' suave","nota":"Taper; una sola sesion de fuerza."},{"n":21,"fechas":"29 mar - 4 abr","km":10.0,"larga":null,"calidad":"Sin calidad","nota":"2-3 salidas de 20-25 min y **maraton el domingo**."}],"km_declarado":604}}};       // generado desde el vault

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
             perfiles: {}, webhook: null };
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
    ['jonah', 'yuli'].forEach(function (id) {
      var r = e.registro && e.registro[id];
      if (Array.isArray(r)) base.registro[id] = r.filter(function (x) { return x && typeof x === 'object' && x.fecha; });
      var a = e.ajustes && e.ajustes[id];
      if (Array.isArray(a)) base.ajustes[id] = a.filter(function (x) { return x && typeof x === 'object'; });
    });
    if (typeof e.webhook === 'string' && /^https?:\/\//.test(e.webhook)) base.webhook = e.webhook;
    if (e.perfiles && typeof e.perfiles === 'object') {
      ['jonah', 'yuli'].forEach(function (id) {
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

  function zonasDe(id) {
    var p = cargar().perfiles[id];
    if (p && num(p.fcmax)) return zonasPorPct(p.fcmax);
    return PLANES_BASE.atletas[id].zonas;
  }

  function idValido(id) {
    return typeof id === 'string' && PLANES_BASE.atletas.hasOwnProperty(id);
  }

  // Semana del plan que corresponde a una fecha. La semana 1 arranca el 9 nov 2026.
  var INICIO = Date.UTC(2026, 10, 9);
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
    var b = PLANES_BASE.atletas[id], p = cargar().perfiles[id];
    if (!p) return b;
    var o = {}, k;
    for (k in b) if (b.hasOwnProperty(k)) o[k] = b[k];
    ['nombre', 'edad', 'fcmax', 'fc_reposo', 'meta', 'carrera'].forEach(function (c) {
      if (p[c] !== undefined && p[c] !== null && p[c] !== '') o[c] = p[c];
    });
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
      return { ok: true, fcmax: a.fcmax, fc_reposo: a.fc_reposo, zonas: a.zonas };
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
        if (campos.fc_reposo === '' || campos.fc_reposo === null) delete p.fc_reposo;
        else {
          var fr = Number(campos.fc_reposo);
          if (!isFinite(fr) || fr < 30 || fr > 110) return { ok: false, error: 'FC de reposo fuera de rango (30-110)' };
          p.fc_reposo = Math.round(fr);
        }
      }
      if (campos.meta !== undefined) p.meta = String(campos.meta).slice(0, 80);
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

    contrato: function () {
      return {
        api: VERSION,
        almacen: CLAVE,
        funciones: ['atletas', 'leer', 'zonas', 'sesionDeHoy', 'registrar', 'borrar',
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
        '  Agente.leer("jonah")              -> { ok, atleta, semanas[21], registro[], ajustes[] }',
        '  Agente.zonas("jonah")             -> { ok, fcmax, zonas:{Z1:[lo,hi],...} }',
        '  Agente.sesionDeHoy("jonah")       -> { ok, semana, fila, pendientes[], sugerida }',
        '',
        'ESCRITURA',
        '  Agente.registrar("jonah", {fecha:"2026-11-11", tipo:"facil", km:4, min:32,',
        '                            fc_media:128, fc_max:140, esf:4, molestia:""})',
        '  Agente.borrar("jonah","2026-11-11","facil")',
        '  Agente.ajustarSemana("jonah", 5, {km:24}, "se subio por semana limpia")',
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
    }
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
