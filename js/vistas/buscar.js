// Módulo 1: búsqueda de contratos y procesos, y acceso directo por número.

import { consultar, consultarSeguro, lit, patronLike, whereAviso } from '../api.js';
import { esc, valor, fmtCOP, fmtFecha, urlDe, fuenteChip, normalizar, NR } from '../util.js';
import { cargando, errorHtml, banda, miniRuta } from './comun.js';
import { ENLACES } from '../normas.js';

const POR_PAGINA = 20;

const MODALIDADES = [
  ['', 'Todas'],
  ['licitacion', 'Licitación pública'],
  ['seleccion_abreviada', 'Selección abreviada'],
  ['concurso', 'Concurso de méritos'],
  ['minima', 'Mínima cuantía'],
  ['directa', 'Contratación directa'],
  ['especial', 'Régimen especial'],
];

const PATRON_MODALIDAD = {
  licitacion: ["'%LICITACI%'"],
  seleccion_abreviada: ["'%SELECCI_N ABREVIADA%'", "'%SUBASTA%'"],
  concurso: ["'%CONCURSO%'"],
  minima: ["'%M_NIMA CUANT%'"],
  directa: ["'%DIRECTA%'"],
  especial: ["'%ESPECIAL%'"],
};

const FUENTES = {
  integrado: {
    etiqueta: 'Contratos (SECOP I y II)',
    conjunto: 'integrado',
    campos: { entidad: 'nombre_de_la_entidad', nit: 'documento_proveedor', modalidad: 'modalidad_de_contrataci_n', depto: 'departamento_entidad', valor: 'valor_contrato', fecha: 'fecha_de_firma_del_contrato' },
    fila: r => ({
      titulo: r.objeto_del_proceso || r.objeto_a_contratar,
      entidad: r.nombre_de_la_entidad,
      proveedor: r.nom_raz_social_contratista, doc: r.documento_proveedor,
      valor: r.valor_contrato, valorEtiqueta: 'Valor del contrato',
      fecha: r.fecha_de_firma_del_contrato, fechaEtiqueta: 'Firma',
      inicio: r.fecha_inicio_ejecuci_n, fin: r.fecha_fin_ejecuci_n,
      modalidad: r.modalidad_de_contrataci_n, estado: r.estado_del_proceso,
      origen: r.origen === 'SECOPI' ? 'SECOP I' : 'SECOP II',
      numero: r.numero_del_contrato, referencia: r.numero_de_proceso,
      ficha: r.origen === 'SECOPI' ? `#/secop1/${encodeURIComponent(r.numero_del_contrato)}` : `#/contrato/${encodeURIComponent(r.numero_del_contrato)}`,
      url: urlDe(r.url_contrato),
    }),
  },
  procesos: {
    etiqueta: 'Procesos (SECOP II)',
    conjunto: 'procesos',
    campos: { entidad: 'entidad', nit: 'nit_del_proveedor_adjudicado', modalidad: 'modalidad_de_contratacion', depto: 'departamento_entidad', valor: 'precio_base', fecha: 'fecha_de_publicacion_del' },
    fila: r => ({
      titulo: r.nombre_del_procedimiento || r.descripci_n_del_procedimiento,
      entidad: r.entidad,
      proveedor: r.nombre_del_proveedor, doc: r.nit_del_proveedor_adjudicado,
      valor: r.precio_base, valorEtiqueta: 'Precio base',
      fecha: r.fecha_de_publicacion_del, fechaEtiqueta: 'Publicación',
      inicio: r.fecha_de_publicacion_del, fin: r.fecha_de_recepcion_de,
      textosRuta: { antes: 'Se publica el', durante: 'Recibe ofertas hasta el', despues: 'Cierre de ofertas el' },
      modalidad: r.modalidad_de_contratacion, estado: r.estado_del_procedimiento,
      origen: 'SECOP II', numero: r.id_del_proceso, referencia: r.referencia_del_proceso,
      ficha: `#/proceso/${encodeURIComponent(r.id_del_proceso)}`,
      url: urlDe(r.urlproceso),
    }),
  },
  // Incluye los procesos de SECOP I que no llegaron a contrato (convocados, desiertos, sin adjudicar).
  secop1: {
    etiqueta: 'Procesos y contratos (SECOP I)',
    conjunto: 'secop1',
    campos: { entidad: 'nombre_entidad', nit: 'identificacion_del_contratista', modalidad: 'modalidad_de_contratacion', depto: 'departamento_entidad', valor: 'cuantia_proceso', fecha: 'fecha_de_cargue_en_el_secop' },
    fila: r => filaSecop1(r),
  },
  // Órdenes de compra por acuerdos marco y grandes superficies. No tienen ficha: el título abre la orden en la Tienda Virtual.
  tienda: {
    etiqueta: 'Órdenes de compra (Tienda Virtual)',
    conjunto: 'tienda',
    campos: { entidad: 'entidad', nit: 'nit_proveedor', depto: 'departamento', valor: 'total', fecha: 'fecha' },
    fila: r => ({
      titulo: r.items, entidad: r.entidad,
      proveedor: r.proveedor, doc: r.nit_proveedor,
      valor: r.total, valorEtiqueta: 'Total de la orden',
      fecha: r.fecha, fechaEtiqueta: 'Fecha',
      modalidad: r.agregacion, estado: r.estado,
      origen: 'Tienda Virtual', numero: r.identificador_de_la_orden,
      url: r.identificador_de_la_orden ? `https://operaciones.colombiacompra.gov.co/tienda-virtual-del-estado-colombiano/ordenes-compra/${encodeURIComponent(r.identificador_de_la_orden)}` : null,
      rotuloUrl: 'Ver la orden',
    }),
  },
};

// Fila de SECOP I (f789-7hwg) con la forma de un resultado de búsqueda.
const filaSecop1 = r => ({
  titulo: r.detalle_del_objeto_a_contratar, entidad: r.nombre_entidad,
  proveedor: r.nom_razon_social_contratista, doc: r.identificacion_del_contratista,
  valor: r.cuantia_proceso, valorEtiqueta: 'Cuantía del proceso',
  fecha: r.fecha_de_cargue_en_el_secop, fechaEtiqueta: 'Cargue en SECOP',
  inicio: r.fecha_ini_ejec_contrato, fin: r.fecha_fin_ejec_contrato,
  modalidad: r.modalidad_de_contratacion, estado: r.estado_del_proceso,
  origen: 'SECOP I', numero: r.numero_de_constancia, referencia: r.numero_de_proceso, contrato: r.numero_de_contrato,
  // Por constancia: si tiene varios contratos, la ficha deja elegir.
  ficha: `#/secop1/${encodeURIComponent(r.numero_de_constancia)}`,
  url: urlDe(r.ruta_proceso_en_secop_i),
});

/** Clave para comparar números sin importar mayúsculas, tildes, espacios, guiones ni ceros a la izquierda. */
export function claveNumero(texto) {
  return normalizar(texto).replace(/\d+/g, d => d.replace(/^0+(?=\d)/, '')).replace(/[^a-z0-9]/g, '');
}

// Palabras de un nombre que sirven para comparar (sin "de", "la", "y"…).
const palabras = texto => normalizar(texto).split(/[^a-z0-9]+/).filter(w => w.length > 2);

export function destinoNumero(texto) {
  const pegado = texto.trim();
  // Si pegan el enlace de SECOP, se usa el número que trae adentro.
  const t = (pegado.match(/numConstancia=(\d[\d-]+)/i) || [])[1] || (pegado.match(/CO1\.(PCCNTR|REQ|BDOS|NTC)\.\d+/i) || [])[0] || pegado;
  if (/^CO1\.PCCNTR\.\d+$/i.test(t)) return `#/contrato/${t.toUpperCase()}`;
  if (/^CO1\.(REQ|BDOS)\.\d+$/i.test(t)) return `#/proceso/${t.toUpperCase()}`;
  if (/^\d{2}-\d{1,2}-\d+(-\d+)?$/.test(t)) return `#/secop1/${t}`;
  return `#/buscar?numero=${encodeURIComponent(t)}`;
}

function construirWhere(f, p) {
  const c = f.campos;
  const w = [];
  if (p.entidad) w.push(`upper(${c.entidad}) like ${patronLike(p.entidad)}`);
  if (p.nit) w.push(`${c.nit} = ${lit(p.nit.replace(/[.\s]/g, '').replace(/-\d$/, ''))}`);
  if (p.modalidad && c.modalidad && PATRON_MODALIDAD[p.modalidad]) {
    w.push('(' + PATRON_MODALIDAD[p.modalidad].map(x => `upper(${c.modalidad}) like ${x}`).join(' OR ') + ')');
  }
  if (p.depto) w.push(`upper(${c.depto}) like ${patronLike(p.depto)}`);
  if (p.vmin) w.push(`${c.valor} >= ${Number(p.vmin)}`);
  if (p.vmax) w.push(`${c.valor} <= ${Number(p.vmax)}`);
  if (p.desde) w.push(`${c.fecha} >= ${lit(p.desde)}`);
  if (p.hasta) w.push(`${c.fecha} <= ${lit(p.hasta + 'T23:59:59')}`);
  if (p.fuente === 'integrado' && p.origen) w.push(`origen = ${lit(p.origen)}`);
  w.push(`${c.fecha} IS NOT NULL`);
  return w.join(' AND ');
}

function formulario(p) {
  const opt = (lista, sel) => lista.map(([v, t]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const val = k => esc(p[k] || '');
  return `
  ${banda({ titulo: 'Buscar en SECOP', meta: 'Contratos y procesos de SECOP I y II y órdenes de compra de la Tienda Virtual, con los datos abiertos de datos.gov.co.', extra: `<form id="ir-numero" class="ir-numero no-imprimir">
    <label for="numero">Revisar un proceso o contrato por su número</label>
    <div class="fila-input">
      <input id="numero" name="numero" placeholder="Número, referencia o enlace de SECOP (CO1.PCCNTR.…, constancia 20-21-…)" value="${val('numero')}" autocomplete="off">
      <button type="submit">Revisar</button>
    </div>
  </form>` })}
  <form id="form-buscar" class="tarjeta">
    <h3>Buscar con filtros</h3>
    <div class="grilla-form">
      <label>Número del contrato o proceso<input name="num" value="${val('num')}" placeholder="Ej.: 001-2021, LP-005-2020" autocomplete="off"></label>
      <label>Texto libre<input name="texto" value="${val('texto')}" placeholder="Objeto, proveedor, palabra clave…"></label>
      <label>Buscar en<select name="fuente">${opt(Object.entries(FUENTES).map(([k, v]) => [k, v.etiqueta]), p.fuente || 'integrado')}</select></label>
      <label>Sistema<select name="origen">${opt([['', 'SECOP I y II'], ['SECOPII', 'Solo SECOP II'], ['SECOPI', 'Solo SECOP I']], p.origen || '')}</select></label>
      <label>Entidad<input name="entidad" value="${val('entidad')}" placeholder="Ej.: Alcaldía de Yopal"></label>
      <label>Nombre del contratista<input name="proveedor" value="${val('proveedor')}" placeholder="Ej.: Consorcio Sopcar"></label>
      <label>NIT o documento del proveedor<input name="nit" value="${val('nit')}" inputmode="numeric" placeholder="Sin dígito de verificación"></label>
      <label>Modalidad<select name="modalidad">${opt(MODALIDADES, p.modalidad || '')}</select></label>
      <label>Departamento<input name="depto" value="${val('depto')}" placeholder="Ej.: Casanare"></label>
      <label>Valor desde (COP)<input name="vmin" type="number" min="0" step="1" value="${val('vmin')}"></label>
      <label>Valor hasta (COP)<input name="vmax" type="number" min="0" step="1" value="${val('vmax')}"></label>
      <label>Fecha desde<input name="desde" type="date" value="${val('desde')}"></label>
      <label>Fecha hasta<input name="hasta" type="date" value="${val('hasta')}"></label>
    </div>
    <p class="ayuda-campo">El número se puede combinar con la entidad, el departamento o las fechas para descartar números repetidos de otras entidades. La fecha es la de firma en contratos y la de publicación en procesos. Puedes escribir sin tildes. "Sistema" solo aplica a los contratos; la modalidad no aplica a la Tienda Virtual. Si la búsqueda se demora, agrega el contratista, el NIT o un rango de fechas.</p>
    <div class="acciones"><button type="submit">Buscar</button><button type="reset" class="secundario">Limpiar</button></div>
  </form>
  <div id="resultados"></div>
  <aside class="tarjeta enlaces-verificacion"><h3>Verificación manual</h3><ul>${ENLACES.map(e => `<li><a href="${e.url}" target="_blank" rel="noopener">${esc(e.texto)}</a></li>`).join('')}</ul></aside>`;
}

// Fila de resultado con columnas fijas: contrato o proceso, proveedor y valor.
function tarjetaResultado(x) {
  return `<article class="resultado">
    <div>
      <div class="res-meta"><span class="etiqueta">${esc(x.origen)}</span><span>${esc(valor(x.modalidad))}</span><span>${esc(valor(x.estado))}</span></div>
      <h3>${x.ficha ? `<a href="${x.ficha}">${esc(valor(x.titulo))}</a>` : x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(valor(x.titulo))}</a>` : esc(valor(x.titulo))}</h3>
      <p class="res-entidad">${esc(valor(x.entidad))}</p>
      <div class="res-meta"><code>${esc(valor(x.numero))}</code>${x.referencia ? `<span>${esc(x.referencia)}</span>` : ''}</div>
      ${miniRuta(x.inicio, x.fin, x.textosRuta)}
    </div>
    <div class="res-prov">${esc(valor(x.proveedor))}${x.doc ? `<small>${esc(x.doc)}</small>` : ''}</div>
    <div class="res-valor"><b>${esc(fmtCOP(x.valor))}</b><small>${esc(x.valorEtiqueta)} · ${esc(x.fechaEtiqueta)}: ${esc(fmtFecha(x.fecha))}</small>
      ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${x.rotuloUrl || 'Ver en SECOP'}</a>` : `<small>Enlace: ${NR}</small>`}</div>
  </article>`;
}

const listaResultados = filas => `<div class="lista-resultados">
  <div class="res-cab" aria-hidden="true"><span>Contrato o proceso</span><span>Proveedor</span><span>Valor</span></div>
  ${filas.map(tarjetaResultado).join('')}</div>`;

async function ejecutarBusqueda(cont, p) {
  const f = FUENTES[p.fuente] || FUENTES.integrado;
  const pagina = Math.max(0, Number(p.pagina) || 0);
  cont.innerHTML = cargando();
  try {
    const params = {
      $where: construirWhere(f, p),
      $order: `${f.campos.fecha} DESC`,
      $limit: POR_PAGINA + 1,
      $offset: pagina * POR_PAGINA,
    };
    // El nombre del contratista va al buscador de texto de datos.gov.co: un "like" sobre el nombre no responde en conjuntos de millones de filas.
    // El número va sin signos: en el buscador de texto un guion delante de una palabra la excluye.
    const q = [p.num && p.num.replace(/[^\p{L}\p{N}]+/gu, ' ').trim(), p.texto, p.proveedor].filter(Boolean).join(' ');
    if (q) params.$q = q;
    const r = await consultar(f.conjunto, params);
    const hayMas = r.filas.length > POR_PAGINA;
    // SECOP Integrado repite filas idénticas del mismo contrato; se muestran una vez.
    const vistos = new Set();
    const pagina0 = r.filas.slice(0, POR_PAGINA).map(f.fila)
      .filter(x => { const k = `${x.numero}|${x.doc}|${x.valor}`; return !vistos.has(k) && vistos.add(k); });
    // El buscador de texto encuentra las palabras en cualquier campo, y el "like" de la entidad cambia las vocales por comodines
    // ("SOPO" también trae "COMPUTADORES PARA…"): aquí se dejan solo las filas cuyo contratista y entidad traen las palabras pedidas.
    const trae = (campo, pedido) => { const nombre = normalizar(campo); return palabras(pedido || '').every(w => nombre.includes(w)); };
    const filas = pagina0.filter(x => trae(x.proveedor, p.proveedor) && trae(x.entidad, p.entidad));
    const ocultas = pagina0.length - filas.length;
    // Con número: primero los que lo tienen idéntico; los demás solo lo mencionan en otro campo.
    // shortcut: ordena dentro de la página, no entre páginas; basta mientras el número y los filtros dejen pocos resultados.
    const clave = p.num ? claveNumero(p.num) : '';
    const igual = x => [x.numero, x.referencia, x.contrato].some(v => v && claveNumero(v) === clave);
    if (clave) filas.sort((a, b) => igual(b) - igual(a));
    const sinExactas = clave && filas.length && !filas.some(igual);
    // El número real del contrato de SECOP I solo está en esa lista (docs/esquemas.md, hallazgo 19).
    const otraLista = clave && p.fuente !== 'secop1' && !filas.some(igual)
      ? `<p class="ayuda-campo">Si es un contrato de SECOP I, su número (por ejemplo "1504 DE 2021") solo está en otra lista: <a href="${hashBusqueda({ ...p, fuente: 'secop1', origen: '', pagina: '' })}">buscar el mismo número en Procesos y contratos (SECOP I)</a>.</p>` : '';
    const aviso = (ocultas ? `<p class="ayuda-campo">En esta página se ocultaron ${ocultas} resultado(s) que no traen esas palabras en el nombre del contratista o de la entidad.</p>` : '')
      + (sinExactas ? `<p class="ayuda-campo">Ningún resultado de esta página tiene el número escrito igual a "${esc(p.num)}": lo traen con otra escritura (por ejemplo "N° 001 DE 2021") o en el objeto. Revisa la referencia de cada uno.</p>` : '') + otraLista;
    const nav = `<nav class="paginacion">
      ${pagina > 0 ? `<a class="boton secundario" href="${hashBusqueda({ ...p, pagina: pagina - 1 })}">Anterior</a>` : '<span></span>'}
      <span>Página ${pagina + 1}</span>
      ${hayMas ? `<a class="boton secundario" href="${hashBusqueda({ ...p, pagina: pagina + 1 })}">Siguiente</a>` : '<span></span>'}
    </nav>`;
    cont.innerHTML = filas.length
      ? `${listaResultados(filas)}${aviso}${nav}${fuenteChip(r)}`
      : `<div class="tarjeta"><p>No hay resultados con esos filtros${hayMas ? ' en esta página' : ''}.</p>${aviso}${AYUDA_SIN_RESULTADOS}${fuenteChip(r)}</div>${hayMas ? nav : ''}`;
  } catch (e) {
    cont.innerHTML = errorHtml(e);
  }
}

const AYUDA_SIN_RESULTADOS = `<ul>
  <li>Prueba con menos datos: solo el número sin letras ni año, o una sola palabra poco común del objeto.</li>
  <li>Busca con los filtros: nombre del contratista, entidad y un rango de fechas.</li>
  <li>Cambia "Buscar en": los procesos de SECOP I sin contrato y las órdenes de compra de la Tienda Virtual están en listas aparte.</li>
  <li>Si la entidad es de régimen especial o no publicó el proceso, no está en los datos abiertos. Revisa los enlaces de verificación manual de abajo.</li>
</ul>`;

// Busca un número que no tiene prefijo conocido: aviso CO1.NTC, referencia de proceso, número de contrato u orden de compra.
async function buscarNumero(cont, numero) {
  const n = numero.trim();
  if (/CO1\.PPI\.\d+/i.test(n)) {
    cont.innerHTML = `<div class="tarjeta"><h2>Ese enlace no trae un número que se pueda buscar</h2>
      <p>El código <code>CO1.PPI</code> es interno del SECOP II y los datos abiertos no lo publican. Abre el enlace, copia la referencia del proceso o el número del contrato y búscalo aquí, o usa los filtros con la entidad y el contratista.</p></div>`;
    return;
  }
  cont.innerHTML = cargando('Buscando el número en SECOP I y II…');
  const ntc = n.match(/^CO1\.NTC\.\d+$/i);
  // Un aviso se busca solo en Procesos: buscarlo dentro de las URL de SECOP Integrado tarda casi un minuto.
  if (ntc) cont.innerHTML = cargando('Buscando el aviso en SECOP II. Esta búsqueda puede tardar unos 15 segundos…');
  const l = lit(n);
  // Sin signos: en el buscador de texto un guion delante de una palabra la excluye.
  const q = n.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // Cada conjunto se consulta dos veces: por el número idéntico y con el buscador de texto ($q), que no distingue mayúsculas ni separadores.
  const pedidos = ntc
    ? [['procesos', { $where: whereAviso('urlproceso.url', n.toUpperCase()), $limit: 50 }, FUENTES.procesos.fila]]
    : [
      ['integrado', { $where: `numero_de_proceso = ${l} OR numero_del_contrato = ${l}`, $limit: 50 }, FUENTES.integrado.fila],
      ['procesos', { $where: `referencia_del_proceso = ${l}`, $limit: 50 }, FUENTES.procesos.fila],
      // SECOP Integrado guarda la constancia como "número de contrato": el número real del contrato solo está aquí.
      ['secop1', { $where: `numero_de_contrato = ${l} OR numero_de_proceso = ${l}`, $limit: 50 }, filaSecop1],
      ['integrado', { $q: q, $limit: 30 }, FUENTES.integrado.fila],
      ['procesos', { $q: q, $limit: 30 }, FUENTES.procesos.fila],
      ['secop1', { $q: q, $limit: 30 }, filaSecop1],
      ...(/^\d+$/.test(n) ? [['tienda', { identificador_de_la_orden: n, $limit: 5 }, FUENTES.tienda.fila]] : []),
    ];
  const res = await Promise.all(pedidos.map(([conjunto, params]) => consultarSeguro(conjunto, params)));
  const fallidas = res.filter(r => r.error);
  if (fallidas.length === res.length) { cont.innerHTML = errorHtml(fallidas[0].error); return; }

  const vistos = new Set();
  const filas = res.flatMap((r, i) => r.filas.map(pedidos[i][2]))
    .filter(x => { const k = x.ficha || x.url || x.numero; return !vistos.has(k) && vistos.add(k); });
  const clave = claveNumero(n);
  const igual = x => ntc || [x.numero, x.referencia, x.contrato].some(v => v && claveNumero(v) === clave);
  const exactas = filas.filter(igual);
  const parecidas = filas.filter(x => !igual(x)).slice(0, 20);
  cont.innerHTML = `<div class="tarjeta"><h2>Resultados para <code>${esc(n)}</code></h2>
    ${exactas.length ? '' : `<p>No hay un proceso, contrato ni orden de compra con ese número exacto.${parecidas.length ? ' Abajo están los registros que lo mencionan.' : ''}</p>${parecidas.length ? '' : AYUDA_SIN_RESULTADOS}`}
    ${fallidas.length ? `<p class="ayuda-campo">${fallidas.length} de ${res.length} consultas no respondieron (${esc([...new Set(fallidas.map(r => r.conjunto.nombre))].join(', '))}): puede faltar algún resultado. Intenta de nuevo en un momento.</p>` : ''}</div>
    ${exactas.length ? listaResultados(exactas) : ''}
    ${parecidas.length ? `<h3>${exactas.length ? 'Otros registros que mencionan ese número' : 'Registros parecidos'}</h3>${listaResultados(parecidas)}` : ''}
    ${res.filter(r => !r.error).map(fuenteChip).join('')}`;
}

function hashBusqueda(p) {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));
  return `#/buscar?${q.toString()}`;
}

export function vistaBuscar(raiz, params) {
  const p = Object.fromEntries(params.entries());
  // Tras "Revisar" por número, el formulario queda con ese número para acotarlo con filtros.
  raiz.innerHTML = formulario({ num: p.numero, ...p });
  const cont = raiz.querySelector('#resultados');

  raiz.querySelector('#ir-numero').addEventListener('submit', ev => {
    ev.preventDefault();
    const n = ev.target.numero.value.trim();
    if (n) location.hash = destinoNumero(n);
  });
  const form = raiz.querySelector('#form-buscar');
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    location.hash = hashBusqueda({ ...Object.fromEntries(new FormData(form).entries()), buscar: 1 });
  });
  form.addEventListener('reset', () => setTimeout(() => { location.hash = '#/buscar'; }, 0));

  if (p.numero) buscarNumero(cont, p.numero);
  else if (p.buscar) ejecutarBusqueda(cont, p);
}
