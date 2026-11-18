// Router por hash y arranque de Radar Contractual. Radar Público arranca en js/radar.js.

import { vistaBuscar } from './vistas/buscar.js';
import { vistaContrato, vistaProceso, vistaSecop1 } from './vistas/ficha.js';
import { vistaAyudas } from './vistas/ayudas.js';
import { vistaReglas, vistaAjustes } from './vistas/reglas.js';
import { vistaVeeduria, vistaEntidad, vistaProveedor } from './vistas/veeduria.js';
import { vistaCasos } from './vistas/casos.js';
import { arrancar } from './vistas/comun.js';

arrancar([
  [/^\/veeduria$/, (r, m, q) => vistaVeeduria(r, q), 'veeduria'],
  [/^\/entidad\/(.+)$/, (r, m, q) => vistaEntidad(r, decodeURIComponent(m[1]), q), 'veeduria'],
  [/^\/proveedor\/(.+)$/, (r, m, q) => vistaProveedor(r, decodeURIComponent(m[1]), q), 'veeduria'],
  [/^\/contrato\/(.+)$/, (r, m) => vistaContrato(r, decodeURIComponent(m[1])), 'buscar'],
  [/^\/proceso\/(.+)$/, (r, m) => vistaProceso(r, decodeURIComponent(m[1])), 'buscar'],
  [/^\/secop1\/(.+)$/, (r, m) => vistaSecop1(r, decodeURIComponent(m[1])), 'buscar'],
  [/^\/casos$/, r => vistaCasos(r), 'casos'],
  [/^\/ayudas$/, r => vistaAyudas(r), 'ayudas'],
  [/^\/reglas$/, r => vistaReglas(r), 'reglas'],
  [/^\/ajustes$/, r => vistaAjustes(r), 'ajustes'],
  [/^\/buscar$/, (r, m, q) => vistaBuscar(r, q), 'buscar'],
], '/buscar');
