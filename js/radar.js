// Arranque de Radar Público: veeduría para la ciudadanía. Las fichas de contratos y procesos se abren en Revisor SECOP.

import { vistaVeeduria, vistaEntidad, vistaProveedor } from './vistas/veeduria.js';
import { vistaComoLeer } from './vistas/radar.js';
import { arrancar } from './vistas/comun.js';

arrancar([
  [/^\/veeduria$/, (r, m, q) => vistaVeeduria(r, q), 'veeduria'],
  [/^\/entidad\/(.+)$/, (r, m, q) => vistaEntidad(r, decodeURIComponent(m[1]), q), 'veeduria'],
  [/^\/proveedor\/(.+)$/, (r, m, q) => vistaProveedor(r, decodeURIComponent(m[1]), q), 'veeduria'],
  [/^\/como$/, r => vistaComoLeer(r), 'como'],
  [/^\/(contrato|proceso|secop1)\/.+$/, () => location.assign('../' + location.hash), 'veeduria'],
], '/veeduria');
