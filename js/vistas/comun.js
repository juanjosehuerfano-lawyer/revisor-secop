// Piezas de interfaz compartidas por las vistas.

import { esc, almacen, fmtFecha } from '../util.js';
import { REGLAS } from '../normas.js';

const ETIQUETAS = {
  alta: 'Alerta', media: 'Revisar', ok: 'Sin alerta', info: 'Información', sin_datos: 'Sin datos suficientes',
};

export function cargando(texto = 'Consultando datos.gov.co…') {
  return `<div class="cargando" role="status"><span class="spinner" aria-hidden="true"></span>${esc(texto)}</div>`;
}

export function errorHtml(e) {
  const enlace = e?.url ? ` <a href="${esc(e.url)}" target="_blank" rel="noopener">Abrir la consulta</a>` : '';
  return `<div class="aviso aviso-error" role="alert"><strong>No se pudo consultar.</strong> ${esc(e?.message || e)}${enlace}</div>`;
}

export function estadoValidacion(idRegla) {
  const v = almacen.leer('validaciones', {})[idRegla];
  return v ? `Validada por el abogado el ${fmtFecha(v.fecha)}` : 'Pendiente de validación jurídica';
}

export function insignia(nivel) {
  return `<span class="insignia n-${nivel}">${ETIQUETAS[nivel] || nivel}</span>`;
}

// Tarjeta de alerta: resultado de la regla, explicación y norma citada.
export function alertaHtml(idRegla, resultado, detalle) {
  const r = REGLAS.find(x => x.id === idRegla);
  return `<article class="alerta n-${resultado.nivel}">
    <header>${insignia(resultado.nivel)}<h4>${esc(r.titulo)}</h4></header>
    <p>${detalle}</p>
    <p class="norma">Norma: ${esc(r.norma)} · <span class="validacion">${esc(estadoValidacion(idRegla))}</span></p>
  </article>`;
}

export function seccion(id, titulo, cuerpo, fuentes = '') {
  return `<section class="tarjeta" id="${id}"><h3>${esc(titulo)}</h3>${cuerpo}${fuentes}</section>`;
}

export function tabla(columnas, filas) {
  if (!filas.length) return '<p class="nr">SECOP no reporta registros.</p>';
  return `<div class="tabla-scroll"><table><thead><tr>${columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${filas.map(f => `<tr>${f.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
