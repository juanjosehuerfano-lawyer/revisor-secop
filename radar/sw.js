// Service worker de Lupa Contractual Ciudadana. Comparte el código con Radar Contractual (../js) pero guarda su propia caché:
// cada app borra solo las cachés con su prefijo.
const VERSION = 'radar-publico-v6';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icono.svg', 'icons/icono-192.png', '../css/app.css',
  '../js/radar.js', '../js/api.js', '../js/util.js', '../js/reglas.js', '../js/normas.js', '../js/festivos.js', '../js/smmlv.js',
  '../js/vistas/comun.js', '../js/vistas/veeduria.js', '../js/vistas/casos.js', '../js/vistas/radar.js',
  '../fonts/inter-latin.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('radar-publico-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Red primero (los cambios llegan enseguida); caché si no hay conexión.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))),
  );
});
