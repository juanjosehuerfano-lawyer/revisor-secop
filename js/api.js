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
  tienda:      { id: 'rgxm-mmea', nombre: 'Tienda Virtual del Estado Colombiano – Consolidado' },
  // Trae el valor total del contrato después de cada modificación (no el valor de la adición). Ver docs/esquemas.md, hallazgo 18.
  modificaciones: { id: 'u8cx-r425', nombre: 'SECOP II – Modificaciones a contratos' },
  proponentes: { id: 'hgi6-6wh3', nombre: 'SECOP II – Proponentes por Proceso' },
  // Ofertas y archivos vienen partidos por años: ver conjuntosOfertas() y conjuntosArchivos().
  ofertas2022: { id: 'bpan-xvj3', nombre: 'SECOP II – Ofertas por Proceso (hasta 2022)' },
  ofertas2023: { id: 'b28v-edj8', nombre: 'SECOP II – Ofertas por Proceso (2023 y 2024)' },
  ofertas2025: { id: 'wi7w-2nvm', nombre: 'SECOP II – Ofertas por Proceso (2025 y 2026)' },
  archivos2021: { id: 'f8va-cf4m', nombre: 'SECOP II – Archivos Descarga (hasta 2021)' },
  archivos2022: { id: 'kgcd-kt7i', nombre: 'SECOP II – Archivos Descarga (2022)' },
  archivos2023: { id: '3skv-9na7', nombre: 'SECOP II – Archivos Descarga (2023)' },
  archivos2024: { id: 'nbae-kzan', nombre: 'SECOP II – Archivos Descarga (2024)' },
  archivos2025: { id: 'h4m3-b4e2', nombre: 'SECOP II – Archivos Descarga (2025)' },
  archivos2026: { id: 'dmgg-8hin', nombre: 'SECOP II – Archivos Descarga (2026)' },
  // SECOP I: proponentes y archivos se unen por el número de constancia.
  secop1Proponentes: { id: 'tauh-5jvn', nombre: 'SECOP I – Proponentes' },
  secop1Archivos: { id: 'ps88-5e3v', nombre: 'SECOP I – Archivos Descarga' },
  secop1ArchivosHist: { id: '8kpz-m6cc', nombre: 'SECOP I – Archivos Descarga Histórico' },
  // SECOP Integrado cubre SECOP I y II con campos reducidos: es la fuente de la búsqueda y de la veeduría, y el respaldo de la ficha.
  integrado:   { id: 'rpmr-utcd', nombre: 'SECOP Integrado (SECOP I y II)' },
};

// Conjuntos de ofertas que pueden tener las de un proceso publicado en `anio`. Las ofertas se registran al cierre,
// que puede caer en el periodo siguiente; sin año se consultan todos.
export function conjuntosOfertas(anio) {
  if (!anio) return ['ofertas2022', 'ofertas2023', 'ofertas2025'];
  if (anio >= 2025) return ['ofertas2025'];
  return anio >= 2023 ? ['ofertas2023', 'ofertas2025'] : ['ofertas2022', 'ofertas2023'];
}

// Conjuntos de archivos desde el año `anio` (los documentos se cargan durante toda la vida del contrato).
// Cuando Colombia Compra publique el conjunto de un año nuevo, agrégalo a CONJUNTOS: aquí se toma solo.
export function conjuntosArchivos(anio) {
  return Object.keys(CONJUNTOS).filter(k => k.startsWith('archivos') && (!anio || Number(k.slice(8)) >= Math.max(anio, 2021)));
}

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
  // Hay consultas que datos.gov.co nunca termina: se cortan a los 3 minutos para no dejar la pantalla esperando
  // (un nombre de entidad poco común tardó 54 s el 2026-11-17).
  const pedir = () => fetch(url, { headers, signal: AbortSignal.timeout(180000) });
  try {
    resp = await pedir();
    // datos.gov.co responde a veces 503 en conjuntos grandes y al momento ya contesta: un solo reintento.
    if (resp.status >= 500) {
      await new Promise(r => setTimeout(r, 1500));
      resp = await pedir();
    }
  } catch (e) {
    throw new ErrorConsulta(e.name === 'TimeoutError'
      ? 'datos.gov.co tardó más de tres minutos y la consulta se canceló. Intenta de nuevo o acota la búsqueda: menos palabras, un rango de fechas o el NIT.'
      : 'No hay conexión con datos.gov.co.', url, conjunto);
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
