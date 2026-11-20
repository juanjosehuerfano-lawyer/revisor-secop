// Arranque de Lupa Contractual Ciudadana: veeduría para la ciudadanía. Las fichas de contratos y procesos se abren en Radar Contractual.

import { vistaVeeduria, vistaEntidad, vistaProveedor } from './vistas/veeduria.js';
import { vistaComoLeer } from './vistas/radar.js';
import { arrancar } from './vistas/comun.js';

// En su subdominio, Lupa Contractual Ciudadana está en la raíz: '../' ya no llega a Radar Contractual.
const CONTRACTUAL = location.hostname.startsWith('lupa.') ? 'https://contractual.juanjosehuerfanocorredor.com/' : '../';
if (CONTRACTUAL !== '../') document.querySelectorAll('a[href^="../"]').forEach(a => { a.href = CONTRACTUAL + a.getAttribute('href').slice(3); });

arrancar([
  [/^\/veeduria$/, (r, m, q) => vistaVeeduria(r, q), 'veeduria'],
  [/^\/entidad\/(.+)$/, (r, m, q) => vistaEntidad(r, decodeURIComponent(m[1]), q), 'veeduria'],
  [/^\/proveedor\/(.+)$/, (r, m, q) => vistaProveedor(r, decodeURIComponent(m[1]), q), 'veeduria'],
  [/^\/como$/, r => vistaComoLeer(r), 'como'],
  [/^\/(contrato|proceso|secop1)\/.+$/, () => location.assign(CONTRACTUAL + location.hash), 'veeduria'],
], '/veeduria');
