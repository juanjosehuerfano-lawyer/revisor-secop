// Router por hash y arranque de la PWA.

import { vistaBuscar } from './vistas/buscar.js';
import { vistaContrato, vistaProceso, vistaSecop1 } from './vistas/ficha.js';
import { vistaAyudas } from './vistas/ayudas.js';
import { vistaReglas, vistaAjustes } from './vistas/reglas.js';

const RUTAS = [
  [/^\/contrato\/(.+)$/, (r, m) => vistaContrato(r, decodeURIComponent(m[1])), 'buscar'],
  [/^\/proceso\/(.+)$/, (r, m) => vistaProceso(r, decodeURIComponent(m[1])), 'buscar'],
  [/^\/secop1\/(.+)$/, (r, m) => vistaSecop1(r, decodeURIComponent(m[1])), 'buscar'],
  [/^\/ayudas$/, r => vistaAyudas(r), 'ayudas'],
  [/^\/reglas$/, r => vistaReglas(r), 'reglas'],
  [/^\/ajustes$/, r => vistaAjustes(r), 'ajustes'],
  [/^\/buscar$/, (r, m, q) => vistaBuscar(r, q), 'buscar'],
];

function navegar() {
  const [ruta, query = ''] = (location.hash.slice(1) || '/buscar').split('?');
  const params = new URLSearchParams(query);
  // Cada vista recibe un contenedor nuevo para no acumular listeners.
  const viejo = document.getElementById('vista');
  const raiz = viejo.cloneNode(false);
  viejo.replaceWith(raiz);
  for (const [re, fn, tab] of RUTAS) {
    const m = ruta.match(re);
    if (m) {
      document.querySelectorAll('[data-tab]').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
      fn(raiz, m, params);
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = '#/buscar';
}

window.addEventListener('hashchange', navegar);
navegar();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* la app funciona sin service worker */ });
}
