// Secciones que se llenan después de pintar la ficha, para no demorarla: proponentes y ofertas del proceso,
// y documentos del expediente (SECOP I y II). Cada una muestra sus propias fuentes.

import { consultarSeguro, conjuntosOfertas, conjuntosArchivos } from '../api.js';
import { esc, valor, fmtCOP, fmtFecha, fmtNum, num, urlDe, fuenteChip, normalizar, NR } from '../util.js';
import { cargando, errorHtml, tabla } from './comun.js';
import { documentoBase, VALOR_MINIMO_REAL } from './veeduria.js';
import { claseDocumento, CLASES_DOCUMENTO } from '../reglas.js';

export const pendiente = texto => `<div class="asinc">${cargando(texto)}</div>`;

async function llenar(raiz, id, cargar) {
  const caja = raiz.querySelector(`#${id} .asinc`);
  if (!caja) return;
  try { caja.innerHTML = await cargar(); } catch (e) { caja.innerHTML = errorHtml(e); }
}

// Fuentes de un grupo de consultas; las que fallaron se nombran para que se sepa que la lista puede estar incompleta.
function fuentes(consultas) {
  const fallas = consultas.filter(c => c.error);
  return consultas.filter(c => !c.error && c.filas.length).map(fuenteChip).join('')
    + (fallas.length ? `<p class="aviso">No se pudo consultar: ${fallas.map(c => esc(c.conjunto.nombre)).join('; ')}. La lista puede estar incompleta.</p>` : '');
}

const enlaceProveedor = doc => { const d = documentoBase(doc); return d ? `<a href="#/proveedor/${d}"><code>${esc(doc)}</code></a>` : esc(valor(doc)); };
const destacar = (doc, destacado, rotulo) => destacado && documentoBase(doc) === documentoBase(destacado) ? ` <span class="etiqueta">${esc(rotulo)}</span>` : '';

/**
 * Proponentes y ofertas de SECOP II. idProceso: CO1.REQ de la fase de ofertas (une con Proponentes por Proceso).
 * portafolio: CO1.BDOS (une con Ofertas por Proceso). docDestacado: documento del contratista o adjudicado.
 */
export function cargarOfertas(raiz, { idProceso, portafolio, anio, docDestacado, rotuloDestacado }) {
  return llenar(raiz, 'ofertas', async () => {
    if (!idProceso && !portafolio) return `<p class="nr">${NR}: la ficha no trae el identificador del proceso de selección.</p>`;
    const consultas = (await Promise.all([
      idProceso && consultarSeguro('proponentes', { id_procedimiento: idProceso, $select: 'proveedor,nit_proveedor', $limit: 500 }),
      ...(portafolio ? conjuntosOfertas(anio).map(n => consultarSeguro(n, {
        id_del_proceso_de_compra: portafolio, $select: 'nombre_proveedor,nit_del_proveedor,valor_de_la_oferta,fecha_de_registro,referencia_de_la_oferta', $limit: 1000,
      })) : []),
    ])).filter(Boolean);
    const [proponentes, ...ofertas] = idProceso ? consultas : [{ filas: [] }, ...consultas];

    // Ofertas por Proceso repite filas idénticas (una por lote o línea): se muestran una vez.
    const filas = new Map();
    for (const o of ofertas.flatMap(c => c.filas)) {
      const k = `${o.nit_del_proveedor}|${o.nombre_proveedor}|${o.valor_de_la_oferta}|${o.referencia_de_la_oferta}`;
      if (!filas.has(k)) filas.set(k, { nombre: o.nombre_proveedor, doc: o.nit_del_proveedor, valor: num(o.valor_de_la_oferta), fecha: o.fecha_de_registro, ref: o.referencia_de_la_oferta });
    }
    const conOferta = new Set([...filas.values()].map(x => normalizar(x.nombre)));
    for (const p of proponentes.filas) {
      if (!conOferta.has(normalizar(p.proveedor))) filas.set(`sin|${p.nit_proveedor}|${p.proveedor}`, { nombre: p.proveedor, doc: p.nit_proveedor, valor: null });
    }
    const lista = [...filas.values()].sort((a, b) => (a.valor ?? Infinity) - (b.valor ?? Infinity));
    if (!lista.length) return `<p class="nr">SECOP no reporta proponentes ni ofertas para este proceso.</p>${fuentes(consultas)}`;

    const distintos = new Set(lista.map(x => normalizar(x.nombre))).size;
    const reales = lista.filter(x => x.valor >= VALOR_MINIMO_REAL).length;
    return `<p>${fmtNum(distintos)} proponente(s) y ${fmtNum(reales)} oferta(s) con valor real. El precio no es el único criterio de selección: compara las ofertas con el informe de evaluación del expediente.</p>
      ${tabla(['Proponente', 'Documento', 'Valor de la oferta', 'Registro', 'Referencia de la oferta'], lista.map(x => [
        esc(valor(x.nombre)) + destacar(x.doc, docDestacado, rotuloDestacado), enlaceProveedor(x.doc),
        x.valor === null ? `<span class="nr">${NR}</span>` : fmtCOP(x.valor) + (x.valor < VALOR_MINIMO_REAL ? ' <span class="nr">(valor simbólico)</span>' : ''),
        fmtFecha(x.fecha), esc(valor(x.ref)),
      ]))}${fuentes(consultas)}`;
  });
}

// Proponentes de SECOP I: se unen por el número de constancia. No traen el valor de la oferta.
export function cargarProponentesSecop1(raiz, constancia, docDestacado) {
  return llenar(raiz, 'ofertas', async () => {
    const c = await consultarSeguro('secop1Proponentes', { id_proceso: constancia, $select: 'proponente,num_doc_proponente,calificacion,adjudicado,numero_contrato', $limit: 500 });
    if (c.error) return errorHtml(c.error);
    if (!c.filas.length) return `<p class="nr">SECOP I no reporta proponentes para este proceso.</p>${fuenteChip(c)}`;
    return `<p>${fmtNum(c.filas.length)} proponente(s). SECOP I no publica el valor de cada oferta.</p>
      ${tabla(['Proponente', 'Documento', 'Calificación', 'Adjudicado', 'Contrato'], c.filas.map(p => [
        esc(valor(p.proponente)) + destacar(p.num_doc_proponente, docDestacado, 'contratista'), enlaceProveedor(p.num_doc_proponente),
        esc(valor(p.calificacion)), esc(valor(p.adjudicado)), esc(valor(p.numero_contrato)),
      ]))}${fuenteChip(c)}`;
  });
}

const tamano = b => { const n = num(b); return n === null ? NR : n < 1048576 ? `${fmtNum(Math.max(1, Math.round(n / 1024)))} KB` : `${fmtNum(Math.round(n / 104857.6) / 10)} MB`; };

// Lista de documentos agrupada por clase. docs: [{ fecha, nombre, url, ext, bytes, clase, extra }]; `extra` es la celda
// de la columna opcional (origen o contrato) ya en HTML.
function listaDocumentos(docs, columnaExtra) {
  const columnas = ['Cargado', 'Documento', ...(columnaExtra ? [columnaExtra] : []), 'Tipo', 'Tamaño'];
  const fila = d => [fmtFecha(d.fecha), d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(valor(d.nombre))}</a>` : esc(valor(d.nombre)),
    ...(columnaExtra ? [d.extra] : []), esc(valor(d.ext)).replace(/^\./, '').toUpperCase(), tamano(d.bytes)];
  return Object.entries(CLASES_DOCUMENTO).map(([clave, titulo]) => {
    const lista = docs.filter(d => d.clase === clave);
    return lista.length ? `<details class="check-item"${lista.length <= 12 ? ' open' : ''}>
      <summary>${esc(titulo)} · ${fmtNum(lista.length)}</summary>${tabla(columnas, lista.map(fila))}</details>` : '';
  }).join('') + `<p class="ayuda-campo">Los documentos se agrupan por clase según su nombre. Es una ayuda para ordenar el expediente: revisa también "Otros documentos", donde queda lo que la app no reconoce.</p>`;
}

/**
 * Documentos publicados en SECOP II. Se unen por el proceso de compra (CO1.BDOS). Con `contrato`, se muestran los del
 * proceso y los de ese contrato; sin él (ficha del proceso), todos.
 */
export function cargarDocumentos(raiz, { portafolio, contrato, anio }) {
  return llenar(raiz, 'documentos', async () => {
    if (!portafolio) return `<p class="nr">${NR}: la ficha no trae el proceso de compra (CO1.BDOS), que es el que une los documentos.</p>`;
    const LIMITE = 2000;
    const consultas = await Promise.all(conjuntosArchivos(anio).map(n => consultarSeguro(n, {
      proceso: portafolio, $select: 'id_documento,n_mero_de_contrato,nombre_archivo,extensi_n,tamanno_archivo,fecha_carga,url_descarga_documento', $order: 'fecha_carga', $limit: LIMITE,
    })));
    const vistos = new Set();
    const todos = consultas.flatMap(c => c.filas).filter(d => !vistos.has(d.id_documento) && vistos.add(d.id_documento))
      .sort((a, b) => String(a.fecha_carga).localeCompare(String(b.fecha_carga)));
    const propios = contrato ? todos.filter(d => !d.n_mero_de_contrato || d.n_mero_de_contrato === contrato) : todos;
    if (!propios.length) return `<p class="nr">SECOP no reporta documentos para este proceso en los conjuntos de archivos consultados.</p>${fuentes(consultas)}`;

    const docs = propios.map(d => ({
      fecha: d.fecha_carga, nombre: d.nombre_archivo, url: urlDe(d.url_descarga_documento), ext: d.extensi_n, bytes: d.tamanno_archivo,
      clase: claseDocumento(d.nombre_archivo),
      extra: contrato ? (d.n_mero_de_contrato ? 'Contrato' : 'Proceso')
        : d.n_mero_de_contrato ? `<a href="#/contrato/${encodeURIComponent(d.n_mero_de_contrato)}"><code>${esc(d.n_mero_de_contrato)}</code></a>` : 'Proceso',
    }));
    const otros = todos.length - propios.length;
    return `<p>${fmtNum(docs.length)} documento(s) publicados en SECOP II. Cada enlace abre el archivo en el SECOP.</p>
      ${listaDocumentos(docs, contrato ? 'Origen' : 'Contrato')}
      ${otros ? `<p class="ayuda-campo">El proceso tiene además ${fmtNum(otros)} documento(s) de otros contratos. <a href="#/proceso/${encodeURIComponent(portafolio)}">Ver todos en la ficha del proceso</a>.</p>` : ''}
      ${consultas.some(c => c.filas.length === LIMITE) ? `<p class="aviso">Hay más de ${fmtNum(LIMITE)} documentos en un mismo año; solo se muestran los primeros.</p>` : ''}
      ${fuentes(consultas)}`;
  });
}

// Documentos de SECOP I: se unen por el número de constancia. La descripción dice qué es cada archivo.
export function cargarDocumentosSecop1(raiz, constancia) {
  return llenar(raiz, 'documentos', async () => {
    const consultas = await Promise.all(['secop1Archivos', 'secop1ArchivosHist'].map(n => consultarSeguro(n, {
      numero_de_constancia: constancia, $select: 'identificador,nombrearchivo,descripcion,extension,tama_o,fecha_creacion,ruta_descarga', $order: 'fecha_creacion', $limit: 2000,
    })));
    const vistos = new Set();
    const docs = consultas.flatMap(c => c.filas).filter(d => !vistos.has(d.identificador) && vistos.add(d.identificador))
      .sort((a, b) => String(a.fecha_creacion).localeCompare(String(b.fecha_creacion)))
      .map(d => ({
        fecha: d.fecha_creacion, nombre: d.descripcion || d.nombrearchivo, url: urlDe(d.ruta_descarga), ext: d.extension, bytes: d.tama_o,
        clase: claseDocumento(d.descripcion || d.nombrearchivo),
      }));
    if (!docs.length) return `<p class="nr">SECOP I no reporta documentos para este proceso.</p>${fuentes(consultas)}`;
    return `<p>${fmtNum(docs.length)} documento(s) publicados en SECOP I. Los enlaces llevan al servidor de descargas de SECOP I, tal como lo publica Colombia Compra Eficiente.</p>
      ${listaDocumentos(docs)}${fuentes(consultas)}`;
  });
}
