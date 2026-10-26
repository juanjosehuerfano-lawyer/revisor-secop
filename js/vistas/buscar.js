// Módulo 1: búsqueda de contratos y procesos, y acceso directo por número.

import { consultar, lit, patronLike, whereAviso } from '../api.js';
import { esc, valor, fmtCOP, fmtFecha, urlDe, fuenteChip, NR } from '../util.js';
import { cargando, errorHtml } from './comun.js';
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
      modalidad: r.modalidad_de_contratacion, estado: r.estado_del_procedimiento,
      origen: 'SECOP II', numero: r.id_del_proceso, referencia: r.referencia_del_proceso,
      ficha: `#/proceso/${encodeURIComponent(r.id_del_proceso)}`,
      url: urlDe(r.urlproceso),
    }),
  },
};

export function destinoNumero(texto) {
  const t = texto.trim();
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
  <form id="ir-numero" class="tarjeta ir-numero">
    <label for="numero">Revisar un proceso o contrato por su número</label>
    <div class="fila-input">
      <input id="numero" name="numero" placeholder="CO1.PCCNTR.…, CO1.REQ.…, CO1.BDOS.…, CO1.NTC.…, constancia SECOP I o referencia" value="${val('numero')}" autocomplete="off">
      <button type="submit">Revisar</button>
    </div>
  </form>
  <form id="form-buscar" class="tarjeta">
    <h2>Buscar</h2>
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

function tarjetaResultado(x) {
  return `<article class="resultado">
    <div class="res-meta"><span class="etiqueta">${esc(x.origen)}</span><span>${esc(valor(x.modalidad))}</span><span>${esc(valor(x.estado))}</span></div>
    <h3><a href="${x.ficha}">${esc(valor(x.titulo))}</a></h3>
    <p class="res-entidad">${esc(valor(x.entidad))}</p>
    <dl class="res-datos">
      <div><dt>Proveedor</dt><dd>${esc(valor(x.proveedor))}${x.doc ? ` · ${esc(x.doc)}` : ''}</dd></div>
      <div><dt>${esc(x.valorEtiqueta)}</dt><dd>${esc(fmtCOP(x.valor))}</dd></div>
      <div><dt>${esc(x.fechaEtiqueta)}</dt><dd>${esc(fmtFecha(x.fecha))}</dd></div>
      <div><dt>Número</dt><dd><code>${esc(valor(x.numero))}</code>${x.referencia ? ` · ${esc(x.referencia)}` : ''}</dd></div>
    </dl>
    <div class="acciones"><a class="boton" href="${x.ficha}">Ver ficha</a>${x.url ? `<a class="boton secundario" href="${esc(x.url)}" target="_blank" rel="noopener">Ver en SECOP</a>` : `<span class="nr">Enlace: ${NR}</span>`}</div>
  </article>`;
}

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
      ${pagina > 0 ? `<a class="boton secundario" href="${hashBusqueda({ ...p, pagina: pagina - 1 })}">← Anterior</a>` : '<span></span>'}
      <span>Página ${pagina + 1}</span>
      ${hayMas ? `<a class="boton secundario" href="${hashBusqueda({ ...p, pagina: pagina + 1 })}">Siguiente →</a>` : '<span></span>'}
    </nav>`;
    cont.innerHTML = filas.length
      ? `<div class="lista-resultados">${filas.map(tarjetaResultado).join('')}</div>${nav}${fuenteChip(r)}`
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
      ];
    const res = await Promise.all(consultas);
    const filas = [
      ...res[0].filas.map(FUENTES.integrado.fila),
      ...(res[1] ? res[1].filas.map(FUENTES.procesos.fila) : []),
    ];
    cont.innerHTML = `<div class="tarjeta"><h2>Resultados para <code>${esc(n)}</code></h2>
      ${filas.length ? '' : '<p>No se encontró ese número como referencia de proceso, número de contrato ni aviso. Prueba con el ID del contrato (CO1.PCCNTR.…) o búscalo en el SECOP.</p>'}</div>
      <div class="lista-resultados">${filas.map(tarjetaResultado).join('')}</div>
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
