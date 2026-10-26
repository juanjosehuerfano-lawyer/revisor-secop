// Utilidades de presentación. Regla de oro: si el dato no viene, se dice "No reportado en SECOP".

export const NR = 'No reportado en SECOP';
const INDEFINIDO = /^(no definido|no definida|sin descripcion|sin descripción|no provisto|no adjudicado)$/i;

export function esVacio(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Texto tal como lo reporta SECOP. Los "No definido" se muestran como lo que son: un valor reportado sin definir.
export function valor(v) {
  if (esVacio(v)) return NR;
  if (typeof v === 'string' && INDEFINIDO.test(v.trim())) return `${v.trim()} (según SECOP)`;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}

export function num(v) {
  if (esVacio(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function fmtCOP(v) {
  const n = num(v);
  return n === null ? NR : COP.format(n);
}

const NUM = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
export function fmtNum(v, sufijo = '') {
  const n = num(v);
  return n === null ? NR : NUM.format(n) + sufijo;
}

// SECOP mezcla "2025-10-21T21:46:50.443" y "2024-06-28 23:00:00.0000000". Ambos son hora local de Colombia.
export function fechaISO(v) {
  if (esVacio(v)) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function fmtFecha(v) {
  if (esVacio(v)) return NR;
  const iso = fechaISO(v);
  if (!iso) return String(v);
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function fmtFechaHora(fecha) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha);
}

export function urlDe(v) {
  if (v && typeof v === 'object' && v.url) return v.url;
  if (typeof v === 'string' && /^https?:\/\//.test(v)) return v;
  return null;
}

// Par etiqueta/valor para las grillas de datos. fmt recibe el valor crudo.
export function campo(etiqueta, v, fmt = valor) {
  const texto = fmt(v);
  const clase = texto === NR ? ' class="nr"' : '';
  return `<div class="campo"><dt>${esc(etiqueta)}</dt><dd${clase}>${esc(texto)}</dd></div>`;
}

export function fuenteChip(consulta) {
  if (!consulta?.conjunto || !consulta.url) return '';
  const { conjunto, url, consultadoEn, desdeCache } = consulta;
  return `<p class="fuente">Fuente: <a href="https://www.datos.gov.co/d/${conjunto.id}" target="_blank" rel="noopener">${esc(conjunto.nombre)} (${conjunto.id})</a>
    · <a href="${esc(url)}" target="_blank" rel="noopener">ver consulta</a>
    · consultado ${esc(fmtFechaHora(consultadoEn))}${desdeCache ? ' (guardado en caché)' : ''}</p>`;
}

export function enlaceExterno(url, texto) {
  if (!url) return `<span class="nr">${NR}</span>`;
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>`;
}

// Persistencia local con try/catch: el navegador puede negar el almacenamiento.
export const almacen = {
  leer(clave, porDefecto = null) {
    try {
      const v = localStorage.getItem(clave);
      return v === null ? porDefecto : JSON.parse(v);
    } catch { return porDefecto; }
  },
  guardar(clave, v) {
    try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch { return false; }
  },
  borrar(clave) {
    try { localStorage.removeItem(clave); } catch { /* sin almacenamiento */ }
  },
};

export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
