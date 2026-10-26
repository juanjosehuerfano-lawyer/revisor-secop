// Cliente de la API Socrata de datos.gov.co. Sin backend: fetch directo (la API permite CORS).

import { almacen } from './util.js';

export const CONJUNTOS = {
  contratos:   { id: 'jbjy-vk9h', nombre: 'SECOP II – Contratos Electrónicos' },
  procesos:    { id: 'p6dx-8zbt', nombre: 'SECOP II – Procesos de Contratación' },
  ejecucion:   { id: 'mfmm-jqmq', nombre: 'SECOP II – Ejecución de contratos' },
  adiciones:   { id: 'cb9c-h8sn', nombre: 'SECOP II – Adiciones' },
  facturas:    { id: 'ibyt-yi2f', nombre: 'SECOP II – Facturas' },
  proveedores: { id: 'qmzu-gj57', nombre: 'SECOP II – Proveedores registrados' },
  paa:         { id: 'b6m4-qgqv', nombre: 'SECOP II – Plan Anual de Adquisiciones (encabezado)' },
  secop1:      { id: 'f789-7hwg', nombre: 'SECOP I – Procesos de Compra Pública' },
  // jbjy-vk9h solo expone 1.000 filas por la API (verificado el 2026-10-25). SECOP Integrado cubre SECOP I y II con campos reducidos.
  integrado:   { id: 'rpmr-utcd', nombre: 'SECOP Integrado (SECOP I y II)' },
};

// Filtro por aviso CO1.NTC.… dentro de una URL del SECOP (termina en el número o sigue con '&').
export function whereAviso(campo, ntc) {
  return `${campo} like ${lit('%=' + ntc)} OR ${campo} like ${lit('%=' + ntc + '&%')}`;
}

// Patrón LIKE tolerante a tildes: mayúsculas sin tildes y vocales como comodín de un carácter.
export function patronLike(texto) {
  const base = String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
    .replace(/'/g, "''").replace(/[%_]/g, '');
  return `'%${base.replace(/[AEIOU]/g, '_')}%'`;
}

const BASE = 'https://www.datos.gov.co/resource/';
const TTL_MS = 6 * 60 * 60 * 1000;
const PREFIJO_CACHE = 'cache:';

// Comillas simples escapadas para literales SoQL.
export function lit(s) { return `'${String(s).replace(/'/g, "''")}'`; }

export function construirUrl(conjunto, params) {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return `${BASE}${conjunto.id}.json${partes.length ? '?' + partes.join('&') : ''}`;
}

export function obtenerToken() { return almacen.leer('ajustes', {}).token || ''; }

function leerCache(url) {
  const e = almacen.leer(PREFIJO_CACHE + url);
  if (!e || Date.now() - e.t > TTL_MS) return null;
  return e;
}

function guardarCache(url, filas, t) {
  if (almacen.guardar(PREFIJO_CACHE + url, { t, filas })) return;
  limpiarCache(); // cuota llena: se vacía la caché y se intenta una vez más
  almacen.guardar(PREFIJO_CACHE + url, { t, filas });
}

export function limpiarCache() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIJO_CACHE)).forEach(k => localStorage.removeItem(k));
  } catch { /* sin almacenamiento */ }
}

/**
 * Consulta un conjunto. Devuelve { filas, url, conjunto, consultadoEn, desdeCache }.
 * consultadoEn es la hora real en que se trajo el dato de la API (si viene de caché, la hora original).
 */
export async function consultar(nombre, params = {}, { sinCache = false } = {}) {
  const conjunto = CONJUNTOS[nombre];
  const url = construirUrl(conjunto, params);
  if (!sinCache) {
    const c = leerCache(url);
    if (c) return { filas: c.filas, url, conjunto, consultadoEn: new Date(c.t), desdeCache: true };
  }
  const headers = { Accept: 'application/json' };
  const token = obtenerToken();
  if (token) headers['X-App-Token'] = token;
  let resp;
  try {
    resp = await fetch(url, { headers });
  } catch {
    throw new ErrorConsulta('No hay conexión con datos.gov.co.', url, conjunto);
  }
  if (!resp.ok) {
    let detalle = '';
    try { detalle = (await resp.json()).message || ''; } catch { /* sin cuerpo JSON */ }
    const msg = resp.status === 429 ? 'Se superó la cuota de consultas. Agrega un token de aplicación en Ajustes o espera un momento.'
      : `datos.gov.co respondió ${resp.status}${detalle ? ': ' + detalle : ''}.`;
    throw new ErrorConsulta(msg, url, conjunto);
  }
  const filas = await resp.json();
  const t = Date.now();
  guardarCache(url, filas, t);
  return { filas, url, conjunto, consultadoEn: new Date(t), desdeCache: false };
}

export class ErrorConsulta extends Error {
  constructor(mensaje, url, conjunto) {
    super(mensaje);
    this.url = url;
    this.conjunto = conjunto;
  }
}

// Variante que no rompe una ficha completa si falla un conjunto secundario.
export async function consultarSeguro(nombre, params) {
  try { return await consultar(nombre, params); } catch (e) { return { error: e, filas: [], conjunto: CONJUNTOS[nombre], url: e.url }; }
}
