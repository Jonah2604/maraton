/* Service worker: la app abre sin señal.
   - Navegacion y HTML: red primero (asi una actualizacion entra sola), cache si no hay red.
   - Resto de archivos propios: red primero (asi un cambio de agente.js entra solo); cache si no hay red.
   Al cambiar de version sube VERSION: el cache viejo se borra solo. */
var VERSION = 'maraton-v16';
var PROPIOS = [
  './',
  './index.html',
  './agente.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-mask.png',
  './logo-cabeza.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(PROPIOS.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () { /* si falta uno, no tumba la instalacion */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { if (k !== VERSION) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // el webhook del agente va a la red, no al cache

  // Red primero para todo lo propio: si publicas un cambio, entra en la siguiente apertura.
  // Sin red, se sirve la copia guardada. Por eso no hace falta subir VERSION al editar archivos.
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copia = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
