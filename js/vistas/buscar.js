// Módulo 1: búsqueda de contratos y procesos, y acceso directo por número.

import { consultar, lit, patronLike, whereAviso } from '../api.js';
import { esc, valor, fmtCOP, fmtFecha, urlDe, fuenteChip, NR } from '../util.js';
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
};

// Fila de SECOP I (f789-7hwg) con la forma de un resultado de búsqueda.
const filaSecop1 = r => ({
  titulo: r.detalle_del_objeto_a_contratar, entidad: r.nombre_entidad,
  proveedor: r.nom_razon_social_contratista, doc: r.identificacion_del_contratista,
  valor: r.cuantia_contrato, valorEtiqueta: 'Cuantía del contrato',
  fecha: r.fecha_de_firma_del_contrato, fechaEtiqueta: 'Firma',
  inicio: r.fecha_ini_ejec_contrato, fin: r.fecha_fin_ejec_contrato,
  modalidad: r.modalidad_de_contratacion, estado: r.estado_del_proceso,
  origen: 'SECOP I', numero: r.numero_de_constancia, referencia: r.numero_de_contrato,
  ficha: `#/secop1/${encodeURIComponent(r.uid)}`,
  url: urlDe(r.ruta_proceso_en_secop_i),
});

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
  if (p.modalidad && PATRON_MODALIDAD[p.modalidad]) {
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
  ${banda({ titulo: 'Buscar en SECOP', meta: 'Contratos de SECOP I y II y procesos de SECOP II, con los datos abiertos de datos.gov.co.', extra: `<form id="ir-numero" class="ir-numero no-imprimir">
    <label for="numero">Revisar un proceso o contrato por su número</label>
    <div class="fila-input">
      <input id="numero" name="numero" placeholder="Número, referencia o enlace de SECOP (CO1.PCCNTR.…, constancia 20-21-…)" value="${val('numero')}" autocomplete="off">
      <button type="submit">Revisar</button>
    </div>
  </form>` })}
  <form id="form-buscar" class="tarjeta">
    <h3>Buscar con filtros</h3>
    <div class="grilla-form">
      <label class="ancho">Texto libre<input name="texto" value="${val('texto')}" placeholder="Objeto, proveedor, palabra clave…"></label>
      <label>Buscar en<select name="fuente">${opt(Object.entries(FUENTES).map(([k, v]) => [k, v.etiqueta]), p.fuente || 'integrado')}</select></label>
      <label>Sistema<select name="origen">${opt([['', 'SECOP I y II'], ['SECOPII', 'Solo SECOP II'], ['SECOPI', 'Solo SECOP I']], p.origen || '')}</select></label>
      <label>Entidad<input name="entidad" value="${val('entidad')}" placeholder="Ej.: Alcaldía de Yopal"></label>
      <label>NIT o documento del proveedor<input name="nit" value="${val('nit')}" inputmode="numeric" placeholder="Sin dígito de verificación"></label>
      <label>Modalidad<select name="modalidad">${opt(MODALIDADES, p.modalidad || '')}</select></label>
      <label>Departamento<input name="depto" value="${val('depto')}" placeholder="Ej.: Casanare"></label>
      <label>Valor desde (COP)<input name="vmin" type="number" min="0" step="1" value="${val('vmin')}"></label>
      <label>Valor hasta (COP)<input name="vmax" type="number" min="0" step="1" value="${val('vmax')}"></label>
      <label>Fecha desde<input name="desde" type="date" value="${val('desde')}"></label>
      <label>Fecha hasta<input name="hasta" type="date" value="${val('hasta')}"></label>
    </div>
    <p class="ayuda-campo">La fecha es la de firma en contratos y la de publicación en procesos. Puedes escribir sin tildes.</p>
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
      <h3><a href="${x.ficha}">${esc(valor(x.titulo))}</a></h3>
      <p class="res-entidad">${esc(valor(x.entidad))}</p>
      <div class="res-meta"><code>${esc(valor(x.numero))}</code>${x.referencia ? `<span>${esc(x.referencia)}</span>` : ''}</div>
      ${miniRuta(x.inicio, x.fin, x.textosRuta)}
    </div>
    <div class="res-prov">${esc(valor(x.proveedor))}${x.doc ? `<small>${esc(x.doc)}</small>` : ''}</div>
    <div class="res-valor"><b>${esc(fmtCOP(x.valor))}</b><small>${esc(x.valorEtiqueta)} · ${esc(x.fechaEtiqueta)}: ${esc(fmtFecha(x.fecha))}</small>
      ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">Ver en SECOP</a>` : `<small>Enlace: ${NR}</small>`}</div>
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
    if (p.texto) params.$q = p.texto;
    const r = await consultar(f.conjunto, params);
    const hayMas = r.filas.length > POR_PAGINA;
    // SECOP Integrado repite filas idénticas del mismo contrato; se muestran una vez.
    const vistos = new Set();
    const filas = r.filas.slice(0, POR_PAGINA).map(f.fila)
      .filter(x => { const k = `${x.numero}|${x.doc}|${x.valor}`; return !vistos.has(k) && vistos.add(k); });
    const nav = `<nav class="paginacion">
      ${pagina > 0 ? `<a class="boton secundario" href="${hashBusqueda({ ...p, pagina: pagina - 1 })}">Anterior</a>` : '<span></span>'}
      <span>Página ${pagina + 1}</span>
      ${hayMas ? `<a class="boton secundario" href="${hashBusqueda({ ...p, pagina: pagina + 1 })}">Siguiente</a>` : '<span></span>'}
    </nav>`;
    cont.innerHTML = filas.length
      ? `${listaResultados(filas)}${nav}${fuenteChip(r)}`
      : `<div class="tarjeta"><p>No hay resultados con esos filtros.</p>${fuenteChip(r)}</div>`;
  } catch (e) {
    cont.innerHTML = errorHtml(e);
  }
}

// Busca un número que no tiene prefijo conocido: aviso CO1.NTC, referencia de proceso o número de contrato.
async function buscarNumero(cont, numero) {
  cont.innerHTML = cargando('Buscando el número en SECOP I y II…');
  const n = numero.trim();
  const ntc = n.match(/^CO1\.NTC\.\d+$/i);
  try {
    // Un aviso se busca solo en Procesos: buscarlo dentro de las URL de SECOP Integrado tarda casi un minuto.
    if (ntc) cont.innerHTML = cargando('Buscando el aviso en SECOP II. Esta búsqueda puede tardar unos 15 segundos…');
    const consultas = ntc
      ? [{ filas: [] }, consultar('procesos', { $where: whereAviso('urlproceso.url', n.toUpperCase()), $limit: 50 })]
      : [
        consultar('integrado', { $where: `numero_de_proceso = ${lit(n)} OR numero_del_contrato = ${lit(n)}`, $limit: 50 }),
        consultar('procesos', { $where: `referencia_del_proceso = ${lit(n)}`, $limit: 50 }),
        // SECOP Integrado guarda la constancia como "número de contrato": el número real del contrato solo está aquí.
        consultar('secop1', { $where: `numero_de_contrato = ${lit(n)} OR numero_de_proceso = ${lit(n)}`, $limit: 50 }),
      ];
    const res = await Promise.all(consultas);
    const integrado = res[0].filas.map(FUENTES.integrado.fila);
    const constancias = new Set(integrado.map(x => x.numero));
    const filas = [
      ...integrado,
      ...(res[1] ? res[1].filas.map(FUENTES.procesos.fila) : []),
      ...(res[2] ? res[2].filas.map(filaSecop1).filter(x => !constancias.has(x.numero)) : []),
    ];
    cont.innerHTML = `<div class="tarjeta"><h2>Resultados para <code>${esc(n)}</code></h2>
      ${filas.length ? '' : '<p>No se encontró ese número como referencia de proceso, número de contrato ni aviso. Prueba con el ID del contrato (CO1.PCCNTR.…) o búscalo en el SECOP.</p>'}</div>
      ${filas.length ? listaResultados(filas) : ''}
      ${res.map(fuenteChip).join('')}`;
  } catch (e) {
    cont.innerHTML = errorHtml(e);
  }
}

function hashBusqueda(p) {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));
  return `#/buscar?${q.toString()}`;
}

export function vistaBuscar(raiz, params) {
  const p = Object.fromEntries(params.entries());
  raiz.innerHTML = formulario(p);
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
