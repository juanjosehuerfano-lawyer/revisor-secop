// Service worker: guarda la interfaz para abrirla sin conexión. Los datos de la API no pasan por aquí
// (tienen su propia caché con hora de consulta en js/api.js).
const VERSION = 'revisor-secop-v1';
const ARCHIVOS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icono.svg', 'icons/icono-192.png',
  'js/app.js', 'js/api.js', 'js/util.js', 'js/reglas.js', 'js/normas.js', 'js/festivos.js', 'js/smmlv.js',
  'js/vistas/buscar.js', 'js/vistas/ficha.js', 'js/vistas/analisis.js', 'js/vistas/ayudas.js', 'js/vistas/reglas.js', 'js/vistas/comun.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Red primero para la interfaz (así los cambios llegan enseguida); caché si no hay conexión.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))),
  );
});
