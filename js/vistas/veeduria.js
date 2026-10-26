// Veeduría: análisis de la contratación de una entidad o de un proveedor en su conjunto.
// Los totales se calculan en el navegador porque SECOP Integrado repite filas del mismo contrato
// (y a veces con valores distintos); sumar con $group en la API inflaría los resultados.

import { consultar, consultarSeguro, lit } from '../api.js';
import { esc, valor, fmtCOP, fmtNum, fmtFecha, fechaISO, num, campo, fuenteChip, almacen, NR } from '../util.js';
import { cargando, errorHtml, seccion, tabla, alertaHtml } from './comun.js';
import { claseModalidad, maxDirectasEnVentana, evaluarFraccionamiento } from '../reglas.js';

const POR_PAGINA_API = 50000;
const MAX_FILAS = 150000;
// Valores por debajo de esto (p. ej. $1) son registros de prueba o sin diligenciar: no sirven para comparar.
const VALOR_MINIMO_REAL = 10000;
const CAMPOS = 'numero_del_contrato,origen,fecha_de_firma_del_contrato,modalidad_de_contrataci_n,valor_contrato,documento_proveedor,nom_raz_social_contratista,objeto_del_proceso,objeto_a_contratar,nombre_de_la_entidad,nit_de_la_entidad,codigo_entidad_en_secop,estado_del_proceso,tipo_de_contrato';

const ETIQUETA_CLASE = {
  licitacion: 'Licitación pública', seleccion_abreviada: 'Selección abreviada', concurso: 'Concurso de méritos',
  minima: 'Mínima cuantía', directa: 'Contratación directa', especial: 'Régimen especial', otra: 'Otras / no definida',
};

const AVISO = `<p class="aviso-legal">Ejercicio de veeduría con datos abiertos de SECOP Integrado (rpmr-utcd) y SECOP II. Los indicadores son señales para revisar,
  no conclusiones: cada caso debe verificarse en el expediente del SECOP. Las reglas están pendientes de validación jurídica hasta que se marquen en la pestaña Reglas.</p>`;

// NIT con o sin dígito de verificación: SECOP lo escribe de varias formas ("844004799-6", "8440041972").
// El dígito pegado sin guion solo se acepta para entidades (NIT de 9 dígitos): en cédulas de proveedores
// "1234567" + un dígito sería otra persona.
export function filtroNit(campoNit, nit, { dvPegado = false } = {}) {
  const n = String(nit).replace(/\D/g, '').slice(0, 15);
  const variantes = [`${campoNit} = ${lit(n)}`, `${campoNit} like ${lit(n + '-_')}`];
  if (dvPegado && n.length === 9) variantes.push(`${campoNit} like ${lit(n + '_')}`);
  return `(${variantes.join(' OR ')})`;
}

// Documento base para enlazar: quita el dígito de verificación escrito con guion.
export function documentoBase(doc) {
  return String(doc ?? '').trim().replace(/-\d$/, '').replace(/\D/g, '');
}

const corto = (texto, n) => esc(valor(texto).slice(0, n));

function periodoDefecto(p) {
  const hoy = new Date().toISOString().slice(0, 10);
  return { desde: p.get('desde') || `${hoy.slice(0, 4)}-01-01`, hasta: p.get('hasta') || hoy };
}

// Trae todas las filas (paginando) y devuelve contratos únicos con el valor mayor y menor reportados.
async function cargarContratos(where) {
  let filas = [], offset = 0, consultas = [];
  while (offset < MAX_FILAS) {
    const r = await consultar('integrado', { $select: CAMPOS, $where: where, $order: 'numero_del_contrato', $limit: POR_PAGINA_API, $offset: offset });
    consultas.push(r);
    filas = filas.concat(r.filas);
    if (r.filas.length < POR_PAGINA_API) break;
    offset += POR_PAGINA_API;
  }
  const mapa = new Map();
  for (const f of filas) {
    const k = `${f.origen}|${f.numero_del_contrato}`;
    const v = num(f.valor_contrato);
    const e = mapa.get(k);
    if (!e) {
      mapa.set(k, {
        id: f.numero_del_contrato, origen: f.origen, fecha: fechaISO(f.fecha_de_firma_del_contrato), modalidad: f.modalidad_de_contrataci_n,
        clase: claseModalidad(f.modalidad_de_contrataci_n) || 'otra', valor: v, valorMin: v, filas: 1,
        proveedor: documentoBase(f.documento_proveedor) || null, nombreProveedor: f.nom_raz_social_contratista, objeto: f.objeto_del_proceso || f.objeto_a_contratar,
        entidad: f.nombre_de_la_entidad, nitEntidad: f.nit_de_la_entidad, codigoEntidad: f.codigo_entidad_en_secop, estado: f.estado_del_proceso,
      });
    } else {
      e.filas++;
      if (v !== null && (e.valor === null || v > e.valor)) e.valor = v;
      if (v !== null && (e.valorMin === null || v < e.valorMin)) e.valorMin = v;
    }
  }
  return { contratos: [...mapa.values()], totalFilas: filas.length, consultas, truncado: offset >= MAX_FILAS };
}

const href = c => c.origen === 'SECOPI' ? `#/secop1/${encodeURIComponent(c.id)}` : `#/contrato/${encodeURIComponent(c.id)}`;
const pct = (a, b) => b ? (a / b) * 100 : 0;
const enlaceContrato = c => `<a href="${href(c)}"><code>${esc(c.id)}</code></a>`;

function agrupar(lista, clave) {
  const m = new Map();
  for (const c of lista) {
    const k = clave(c);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  }
  return m;
}
const suma = lista => lista.reduce((s, c) => s + (c.valor || 0), 0);

function formularioPeriodo(base, p) {
  return `<form class="periodo no-imprimir" data-base="${esc(base)}">
    <div class="grilla-form">
      <label>Desde<input type="date" name="desde" value="${esc(p.desde)}"></label>
      <label>Hasta<input type="date" name="hasta" value="${esc(p.hasta)}"></label>
    </div>
    <div class="acciones"><button type="submit">Actualizar</button>
      <button type="button" class="secundario" data-accion="imprimir">Exportar a PDF</button></div>
    <p class="ayuda-campo">El periodo usa la fecha de firma. Periodos largos en entidades grandes pueden tardar: la app descarga cada contrato para quitar duplicados.</p>
  </form>`;
}

function activar(raiz) {
  raiz.querySelector('form.periodo')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target;
    location.hash = `${f.dataset.base}?desde=${f.desde.value}&hasta=${f.hasta.value}`;
  });
  raiz.querySelectorAll('[data-accion=imprimir]').forEach(b => b.addEventListener('click', () => window.print()));
}

// Barras horizontales simples, sin librerías. filas: [{ etiqueta, valor, texto }]
function barras(filas) {
  const max = Math.max(...filas.map(f => f.valor), 1);
  return `<div class="barras">${filas.map(f => `<div class="barra-fila"><span class="barra-etq">${esc(f.etiqueta)}</span>
    <span class="barra-pista"><span class="barra" style="width:${Math.max(1, (f.valor / max) * 100).toFixed(1)}%"></span></span>
    <span class="barra-val">${esc(f.texto)}</span></div>`).join('')}</div>`;
}

function resumen(contratos, totalFilas, contraparte = { etiqueta: 'Proveedores distintos', clave: c => c.proveedor }) {
  const total = suma(contratos);
  const directas = contratos.filter(c => c.clase === 'directa');
  const contrapartes = new Set(contratos.map(contraparte.clave).filter(Boolean));
  const distintos = contratos.filter(c => c.filas > 1 && c.valorMin !== null && c.valor !== c.valorMin);
  return `<dl class="grilla-datos kpis">
    ${campo('Contratos únicos', contratos.length, v => fmtNum(v))}
    ${campo('Valor total', total, fmtCOP)}
    ${campo('Contratación directa (número)', `${fmtNum(directas.length)} · ${fmtNum(pct(directas.length, contratos.length))} %`)}
    ${campo('Contratación directa (valor)', `${fmtCOP(suma(directas))} · ${fmtNum(pct(suma(directas), total))} %`)}
    ${campo(contraparte.etiqueta, contrapartes.size, v => fmtNum(v))}
    ${campo('Contratos de SECOP I / SECOP II', `${contratos.filter(c => c.origen === 'SECOPI').length} / ${contratos.filter(c => c.origen === 'SECOPII').length}`)}
  </dl>
  <p class="ayuda-campo">SECOP Integrado devolvió ${fmtNum(totalFilas)} filas para ${fmtNum(contratos.length)} contratos: se quitaron las repetidas.
    En ${fmtNum(distintos.length)} contratos las filas traen valores distintos; para los totales se usa el mayor valor reportado.</p>`;
}

function porModalidad(contratos) {
  const total = suma(contratos);
  const g = [...agrupar(contratos, c => c.clase)].map(([k, l]) => ({ k, n: l.length, v: suma(l) })).sort((a, b) => b.v - a.v);
  return tabla(['Modalidad', 'Contratos', '% contratos', 'Valor', '% valor'],
    g.map(x => [esc(ETIQUETA_CLASE[x.k] || x.k), fmtNum(x.n), fmtNum(pct(x.n, contratos.length), ' %'), fmtCOP(x.v), fmtNum(pct(x.v, total), ' %')]))
    + `<p class="norma">La licitación pública es la regla general; las demás modalidades proceden solo en los casos que fija la ley (Ley 1150 de 2007, art. 2). Una proporción alta de contratación directa no es ilegal por sí misma, pero orienta la revisión.</p>`;
}

function porMes(contratos) {
  const g = [...agrupar(contratos.filter(c => c.fecha), c => c.fecha.slice(0, 7))].sort((a, b) => a[0].localeCompare(b[0]));
  if (!g.length) return `<p class="nr">${NR}</p>`;
  return barras(g.map(([mes, l]) => ({ etiqueta: mes, valor: suma(l), texto: `${l.length} · ${fmtCOP(suma(l))}` })));
}

function concentracion(contratos, { titulo = 'Proveedor', clave = c => c.proveedor, nombre = c => c.nombreProveedor, enlace } = {}) {
  const total = suma(contratos);
  const g = [...agrupar(contratos.filter(c => clave(c)), clave)].map(([k, l]) => ({
    k, nombre: nombre(l[0]), n: l.length, v: suma(l), directas: l.filter(c => c.clase === 'directa').length,
  })).sort((a, b) => b.v - a.v);
  const top5 = g.slice(0, 5).reduce((s, x) => s + x.v, 0);
  return `<p>Los 5 primeros concentran el <strong>${fmtNum(pct(top5, total))} %</strong> del valor contratado (${fmtCOP(top5)} de ${fmtCOP(total)}).</p>`
    + tabla([titulo, 'Documento', 'Contratos', 'Directas', 'Valor', '% del total'],
      g.slice(0, 20).map(x => [esc(valor(x.nombre)), enlace ? enlace(x.k) : esc(x.k), fmtNum(x.n), fmtNum(x.directas), fmtCOP(x.v), fmtNum(pct(x.v, total), ' %')]))
    + (g.length > 20 ? `<p class="ayuda-campo">Se muestran 20 de ${g.length}.</p>` : '');
}

function directaRepetida(contratos, clave, nombre, enlace) {
  const filas = [...agrupar(contratos.filter(c => clave(c)), clave)]
    .map(([k, l]) => ({ k, nombre: nombre(l[0]), r: maxDirectasEnVentana(l.map(c => ({ fecha: c.fecha, modalidad: c.modalidad }))), l }))
    .filter(x => x.r.nivel === 'media').sort((a, b) => b.r.cantidad - a.r.cantidad);
  const r = { nivel: filas.length ? 'media' : 'ok' };
  const detalle = filas.length
    ? `${filas.length} caso(s) con 3 o más contratos directos en una misma ventana de 12 meses.`
    : 'No hay casos con 3 o más contratos directos en una misma ventana de 12 meses.';
  return alertaHtml('directaEntidad', r, detalle) + (filas.length ? tabla(['Nombre', 'Documento', 'Máx. directas en 12 meses', 'Ventana hasta', 'Valor de sus contratos'],
    filas.slice(0, 30).map(x => [esc(valor(x.nombre)), enlace(x.k), fmtNum(x.r.cantidad), fmtFecha(x.r.hasta), fmtCOP(suma(x.l))])) : '');
}

function valoresDistintos(contratos) {
  const l = contratos.filter(c => c.filas > 1 && c.valorMin >= VALOR_MINIMO_REAL && c.valor > c.valorMin)
    .map(c => ({ ...c, razon: c.valor / c.valorMin })).sort((a, b) => b.razon - a.razon).slice(0, 25);
  if (!l.length) return '<p>No hay contratos con valores distintos entre sus filas.</p>';
  return `<p>SECOP Integrado publica varias filas para estos contratos, con valores distintos. La diferencia puede deberse a adiciones, pero también a errores de registro: es un <strong>indicio para revisar</strong> en la ficha y en el expediente. Si el valor mayor supera en más de 50 % al menor, revisa el tope del art. 40 de la Ley 80 de 1993. Se omiten valores menores de $10.000, que suelen ser registros sin diligenciar.</p>`
    + tabla(['Contrato', 'Valor menor', 'Valor mayor', 'Aumento', 'Objeto'],
      l.map(c => [enlaceContrato(c), fmtCOP(c.valorMin), fmtCOP(c.valor), `<strong${c.razon > 1.5 ? ' class="texto-alta"' : ''}>${fmtNum((c.razon - 1) * 100, ' %')}</strong>`, corto(c.objeto, 160)]));
}

function mayores(contratos, columnaExtra) {
  const l = [...contratos].sort((a, b) => (b.valor || 0) - (a.valor || 0)).slice(0, 25);
  return tabla(['Contrato', 'Firma', 'Modalidad', columnaExtra.titulo, 'Valor', 'Objeto'],
    l.map(c => [enlaceContrato(c), fmtFecha(c.fecha), esc(valor(c.modalidad)), columnaExtra.valor(c), fmtCOP(c.valor), corto(c.objeto, 140)]));
}

// ---------- Fraccionamiento (con tope editable) ----------

function bloqueFraccionamiento(clave, topes) {
  const g = almacen.leer(clave, {});
  const tope = g.tope ?? topes.minima ?? '';
  return `<div class="fraccionamiento" data-clave="${esc(clave)}">
    <div class="grilla-form">
      <label>Tope de cuantía (COP)<input type="number" name="tope" min="0" step="1" value="${esc(tope)}"></label>
      <label>Ventana (días)<input type="number" name="ventana" min="1" step="1" value="${esc(g.ventana ?? 30)}"></label>
    </div>
    <p class="ayuda-campo">${topes.minima ? `Según el Plan Anual de Adquisiciones ${esc(topes.anio)} de la entidad en SECOP II: mínima cuantía ${fmtCOP(topes.minima)}, menor cuantía ${fmtCOP(topes.menor)}. Verifica estos topes: el PAA puede estar mal diligenciado.` : 'No se encontró el Plan Anual de Adquisiciones de la entidad para ese año. Digita el tope de mínima cuantía de la entidad.'}
      ${topes.menor ? `<button type="button" class="chip" data-tope="${topes.minima}">Usar mínima cuantía</button> <button type="button" class="chip" data-tope="${topes.menor}">Usar menor cuantía</button>` : ''}</p>
    <div class="resultado-fracc" aria-live="polite"></div>
  </div>`;
}

function activarFraccionamiento(raiz, contratos) {
  const b = raiz.querySelector('.fraccionamiento');
  if (!b) return;
  const pintar = () => {
    const tope = num(b.querySelector('[name=tope]').value), ventana = num(b.querySelector('[name=ventana]').value) || 30;
    almacen.guardar(b.dataset.clave, { tope, ventana });
    const r = evaluarFraccionamiento(contratos.map(c => ({ ...c, valor: c.valor })), { tope, ventanaDias: ventana });
    const detalle = r.nivel === 'sin_datos' ? esc(r.motivo)
      : r.grupos.length ? `${r.grupos.length} grupo(s) de contratos con el mismo proveedor, cada uno por debajo de ${fmtCOP(r.tope)}, firmados dentro de ${r.ventanaDias} días y que juntos superan el tope.`
        : `No se encontraron grupos que superen ${fmtCOP(r.tope)} dentro de ${r.ventanaDias} días.`;
    b.querySelector('.resultado-fracc').innerHTML = alertaHtml('fraccionamiento', r, detalle) + (r.grupos?.length
      ? r.grupos.slice(0, 20).map(gr => `<details class="check-item"><summary>${esc(valor(gr.contratos[0].nombreProveedor))} · ${gr.contratos.length} contratos · ${fmtCOP(gr.suma)}</summary>
          ${tabla(['Contrato', 'Firma', 'Modalidad', 'Valor', 'Objeto'], gr.contratos.map(c => [enlaceContrato(c), fmtFecha(c.fecha), esc(valor(c.modalidad)), fmtCOP(c.valor), corto(c.objeto, 160)]))}</details>`).join('')
        + (r.grupos.length > 20 ? `<p class="ayuda-campo">Se muestran 20 de ${r.grupos.length} grupos.</p>` : '')
      : '');
  };
  b.addEventListener('input', pintar);
  b.addEventListener('click', ev => {
    const t = ev.target.closest('[data-tope]');
    if (t) { b.querySelector('[name=tope]').value = t.dataset.tope; pintar(); }
  });
  pintar();
}

// ---------- Competencia en procesos (SECOP II) ----------

async function competencia(nit, p) {
  const r = await consultarSeguro('procesos', {
    $select: 'modalidad_de_contratacion,proveedores_unicos_con,respuestas_al_procedimiento,id_del_proceso,referencia_del_proceso,nombre_del_procedimiento,valor_total_adjudicacion,fecha_de_publicacion_del',
    $where: `${filtroNit('nit_entidad', nit, { dvPegado: true })} AND adjudicado = 'Si' AND fecha_de_publicacion_del between ${lit(p.desde)} and ${lit(p.hasta + 'T23:59:59')}`,
    $limit: 20000,
  });
  if (r.error) return { html: errorHtml(r.error), consulta: r };
  const competitivos = r.filas.filter(f => ['licitacion', 'seleccion_abreviada', 'concurso', 'minima'].includes(claseModalidad(f.modalidad_de_contratacion)));
  const oferentes = f => { const u = num(f.proveedores_unicos_con); return u > 0 ? u : num(f.respuestas_al_procedimiento); };
  const unico = competitivos.filter(f => oferentes(f) === 1);
  const porClase = [...agrupar(competitivos, f => claseModalidad(f.modalidad_de_contratacion))];
  const res = { nivel: competitivos.length && unico.length ? 'media' : 'ok' };
  const html = (competitivos.length
    ? alertaHtml('proponenteUnico', res, `${unico.length} de ${competitivos.length} procesos competitivos adjudicados (${fmtNum(pct(unico.length, competitivos.length))} %) reportan un solo oferente.`)
    : `<p class="nr">SECOP II no reporta procesos competitivos adjudicados en el periodo.</p>`)
    + tabla(['Modalidad', 'Procesos adjudicados', 'Con un solo oferente', '%'],
      porClase.map(([k, l]) => { const u = l.filter(f => oferentes(f) === 1).length; return [esc(ETIQUETA_CLASE[k]), fmtNum(l.length), fmtNum(u), fmtNum(pct(u, l.length), ' %')]; }))
    + (unico.length ? `<h4>Procesos con un solo oferente</h4>` + tabla(['Proceso', 'Referencia', 'Nombre', 'Valor adjudicado'],
      unico.sort((a, b) => num(b.valor_total_adjudicacion) - num(a.valor_total_adjudicacion)).slice(0, 25)
        .map(f => [`<a href="#/proceso/${encodeURIComponent(f.id_del_proceso)}"><code>${esc(f.id_del_proceso)}</code></a>`, esc(valor(f.referencia_del_proceso)), corto(f.nombre_del_procedimiento, 140), fmtCOP(f.valor_total_adjudicacion)])) : '');
  return { html, consulta: r };
}

// Topes del PAA: por código de entidad y año.
async function topesPaa(codigo, anio) {
  if (!codigo) return { topes: {}, consulta: null };
  const r = await consultarSeguro('paa', { $select: 'anno,presupuesto_minima_cuantia,presupuesto_menor_cuantia,version', $where: `codigo_entidad = ${Number(codigo)} AND anno = ${Number(anio)}`, $order: 'version DESC', $limit: 1 });
  const f = r.filas[0];
  return { topes: f ? { anio: f.anno, minima: num(f.presupuesto_minima_cuantia), menor: num(f.presupuesto_menor_cuantia) } : {}, consulta: r };
}

function masFrecuente(lista) {
  const m = new Map();
  lista.filter(Boolean).forEach(x => m.set(x, (m.get(x) || 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function fuentes(consultas) {
  return seccion('fuentes', 'Fuentes consultadas', consultas.filter(Boolean).map(c => c.error
    ? `<p class="fuente">${esc(c.conjunto.nombre)}: error en la consulta: ${esc(c.error.message)}</p>` : fuenteChip(c)).join(''));
}

// ================= Entidad =================

export async function vistaEntidad(raiz, nit, params) {
  const p = periodoDefecto(params);
  raiz.innerHTML = cargando('Descargando los contratos de la entidad y quitando duplicados…');
  let datos;
  const where = `${filtroNit('nit_de_la_entidad', nit, { dvPegado: true })} AND fecha_de_firma_del_contrato between ${lit(p.desde)} and ${lit(p.hasta + 'T23:59:59')}`;
  try { datos = await cargarContratos(where); } catch (e) { raiz.innerHTML = errorHtml(e); return; }
  const { contratos } = datos;
  const nombres = [...agrupar(contratos, c => `${c.entidad}|${c.nitEntidad}`)].map(([k, l]) => [...k.split('|'), l.length]).sort((a, b) => b[2] - a[2]);
  const nombre = nombres[0]?.[0] || `NIT ${nit}`;
  const [comp, paa] = await Promise.all([competencia(nit, p), topesPaa(masFrecuente(contratos.map(c => c.codigoEntidad)), p.desde.slice(0, 4))]);
  const base = `#/entidad/${encodeURIComponent(nit)}`;
  const enlaceProv = doc => `<a href="#/proveedor/${encodeURIComponent(doc)}?desde=${p.desde}&hasta=${p.hasta}"><code>${esc(doc)}</code></a>`;

  raiz.innerHTML = `
    <header class="tarjeta ficha-encabezado"><p class="migas"><a href="#/veeduria">← Veeduría</a></p>
      <p class="etiqueta">Veeduría · Entidad</p><h2>${esc(nombre)}</h2>
      <p class="res-entidad">NIT ${esc(nit)} · Periodo: ${fmtFecha(p.desde)} a ${fmtFecha(p.hasta)}</p>
      ${formularioPeriodo(base, p)}
      ${datos.truncado ? `<div class="aviso">El periodo tiene más de ${fmtNum(MAX_FILAS)} filas; solo se analizaron las primeras. Acorta el periodo para un análisis completo.</div>` : ''}
    </header>
    ${contratos.length ? `
    ${seccion('v-resumen', 'Resumen', resumen(contratos, datos.totalFilas))}
    ${seccion('v-modalidad', 'Contratación por modalidad', porModalidad(contratos))}
    ${seccion('v-mes', 'Contratos firmados por mes', porMes(contratos))}
    ${seccion('v-proveedores', 'Concentración en proveedores', concentracion(contratos, { enlace: enlaceProv }))}
    ${seccion('v-directa', 'Contratación directa repetida', directaRepetida(contratos, c => c.proveedor, c => c.nombreProveedor, enlaceProv))}
    ${seccion('v-fracc', 'Posible fraccionamiento', bloqueFraccionamiento(`fracc:${nit}`, paa.topes), paa.consulta ? fuenteChip(paa.consulta) : '')}
    ${seccion('v-competencia', 'Competencia en procesos (SECOP II)', comp.html, fuenteChip(comp.consulta))}
    ${seccion('v-valores', 'Contratos con valores distintos', valoresDistintos(contratos))}
    ${seccion('v-mayores', 'Contratos de mayor valor', mayores(contratos, { titulo: 'Proveedor', valor: c => c.proveedor ? `${esc(valor(c.nombreProveedor))}<br>${enlaceProv(c.proveedor)}` : NR }))}
    ${nombres.length > 1 ? seccion('v-nombres', 'Nombres con que aparece la entidad', tabla(['Nombre', 'NIT', 'Contratos'], nombres.map(n => [esc(n[0]), esc(n[1]), fmtNum(n[2])]))) : ''}
    ` : `<div class="tarjeta"><p>SECOP no reporta contratos de esta entidad en el periodo.</p></div>`}
    ${fuentes([...datos.consultas, paa.consulta, comp.consulta])}
    ${AVISO}`;
  activar(raiz);
  activarFraccionamiento(raiz, contratos);
}

// ================= Proveedor =================

export async function vistaProveedor(raiz, doc, params) {
  const p = periodoDefecto(params);
  raiz.innerHTML = cargando('Descargando los contratos del proveedor…');
  let datos;
  const where = `${filtroNit('documento_proveedor', doc)} AND fecha_de_firma_del_contrato between ${lit(p.desde)} and ${lit(p.hasta + 'T23:59:59')}`;
  try { datos = await cargarContratos(where); } catch (e) { raiz.innerHTML = errorHtml(e); return; }
  const { contratos } = datos;
  const reg = await consultarSeguro('proveedores', { nit: String(doc).replace(/\D/g, ''), $limit: 1 });
  const r = reg.filas[0];
  const nombre = r?.nombre || masFrecuente(contratos.map(c => c.nombreProveedor)) || `Documento ${doc}`;
  const base = `#/proveedor/${encodeURIComponent(doc)}`;
  const nitEnt = c => documentoBase(c.nitEntidad).slice(0, 9) || c.codigoEntidad;
  const enlaceEnt = n => `<a href="#/entidad/${encodeURIComponent(n)}?desde=${p.desde}&hasta=${p.hasta}"><code>${esc(n)}</code></a>`;
  const porAnio = [...agrupar(contratos.filter(c => c.fecha), c => c.fecha.slice(0, 4))].sort((a, b) => a[0].localeCompare(b[0]));

  raiz.innerHTML = `
    <header class="tarjeta ficha-encabezado"><p class="migas"><a href="#/veeduria">← Veeduría</a></p>
      <p class="etiqueta">Veeduría · Proveedor</p><h2>${esc(nombre)}</h2>
      <p class="res-entidad">Documento ${esc(doc)} · Periodo: ${fmtFecha(p.desde)} a ${fmtFecha(p.hasta)}</p>
      ${formularioPeriodo(base, p)}
    </header>
    ${seccion('v-registro', 'Registro en SECOP II', r ? `<dl class="grilla-datos">
      ${campo('Nombre', r.nombre)}${campo('NIT / documento', r.nit)}${campo('Tipo de empresa', r.tipo_empresa)}
      ${campo('Activo', r.esta_activa)}${campo('Registrado desde', r.fecha_creacion, fmtFecha)}${campo('Es PYME', r.espyme)}
      ${campo('Representante legal', r.nombre_representante_legal)}${campo('Ubicación', [r.municipio, r.departamento].filter(Boolean).join(', ') || undefined)}
      ${campo('Actividad principal', r.descripcion_categoria_principal)}</dl>` : `<p class="nr">El documento no aparece en el registro de proveedores de SECOP II.</p>`, fuenteChip(reg))}
    ${contratos.length ? `
    ${seccion('v-resumen', 'Resumen', resumen(contratos, datos.totalFilas, { etiqueta: 'Entidades distintas', clave: nitEnt }))}
    ${seccion('v-modalidad', 'Contratación por modalidad', porModalidad(contratos))}
    ${seccion('v-anio', 'Contratos por año', barras(porAnio.map(([a, l]) => ({ etiqueta: a, valor: suma(l), texto: `${l.length} · ${fmtCOP(suma(l))}` }))))}
    ${seccion('v-entidades', 'Entidades que le contratan', concentracion(contratos, { titulo: 'Entidad', clave: nitEnt, nombre: c => c.entidad, enlace: enlaceEnt }))}
    ${seccion('v-directa', 'Contratación directa repetida por entidad', directaRepetida(contratos, nitEnt, c => c.entidad, enlaceEnt))}
    ${seccion('v-valores', 'Contratos con valores distintos', valoresDistintos(contratos))}
    ${seccion('v-mayores', 'Contratos de mayor valor', mayores(contratos, { titulo: 'Entidad', valor: c => esc(valor(c.entidad)) }))}
    ` : `<div class="tarjeta"><p>SECOP no reporta contratos de este proveedor en el periodo.</p></div>`}
    ${fuentes([...datos.consultas, reg])}
    ${AVISO}`;
  activar(raiz);
}

// ================= Buscador de veeduría =================

export function vistaVeeduria(raiz, params) {
  const tipo = params.get('tipo') || 'entidad';
  const q = params.get('q') || '';
  raiz.innerHTML = `
    <section class="tarjeta"><h2>Veeduría</h2>
      <p>Analiza en su conjunto la contratación de una entidad o de un proveedor: modalidades, concentración, contratación directa repetida, posible fraccionamiento, competencia y contratos con valores distintos.</p>
      <form id="form-veeduria">
        <div class="grilla-form">
          <label>Analizar<select name="tipo"><option value="entidad"${tipo === 'entidad' ? ' selected' : ''}>Una entidad</option><option value="proveedor"${tipo === 'proveedor' ? ' selected' : ''}>Un proveedor</option></select></label>
          <label class="ancho">Nombre o NIT / documento<input name="q" value="${esc(q)}" placeholder="Ej.: Yopal, 891855017, Info Comunicaciones" required></label>
        </div>
        <div class="acciones"><button type="submit">Buscar</button></div>
      </form>
    </section>
    <div id="res-veeduria"></div>`;
  raiz.querySelector('#form-veeduria').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target;
    const texto = f.q.value.trim();
    const soloDigitos = texto.replace(/[.\s-]/g, '');
    if (/^\d{5,15}$/.test(soloDigitos)) {
      location.hash = `#/${f.tipo.value}/${soloDigitos.length === 10 && f.tipo.value === 'entidad' ? soloDigitos.slice(0, 9) : soloDigitos}`;
    } else {
      location.hash = `#/veeduria?tipo=${f.tipo.value}&q=${encodeURIComponent(texto)}`;
    }
  });
  if (q) buscarNombres(raiz.querySelector('#res-veeduria'), tipo, q);
}

async function buscarNombres(cont, tipo, q) {
  cont.innerHTML = cargando('Buscando nombres en SECOP…');
  const [cNombre, cDoc] = tipo === 'entidad' ? ['nombre_de_la_entidad', 'nit_de_la_entidad'] : ['nom_raz_social_contratista', 'documento_proveedor'];
  try {
    const r = await consultar('integrado', { $select: `${cNombre} as nombre,${cDoc} as doc,count(*) as n`, $q: q, $group: `${cNombre},${cDoc}`, $order: 'n DESC', $limit: 40 });
    const filas = r.filas.filter(f => f.doc && !/no definido/i.test(f.doc));
    cont.innerHTML = `<section class="tarjeta"><h3>Resultados</h3>
      <p class="ayuda-campo">Elige el ${tipo === 'entidad' ? 'NIT de la entidad' : 'documento del proveedor'}. El número de filas es aproximado: SECOP Integrado repite contratos.</p>
      ${tabla(['Nombre', tipo === 'entidad' ? 'NIT' : 'Documento', 'Filas en SECOP'], filas.map(f => {
        const d = tipo === 'entidad' ? documentoBase(f.doc).slice(0, 9) : documentoBase(f.doc);
        return [`<a href="#/${tipo}/${encodeURIComponent(d)}">${esc(f.nombre)}</a>`, esc(f.doc), fmtNum(f.n)];
      }))}${fuenteChip(r)}</section>`;
  } catch (e) {
    cont.innerHTML = errorHtml(e);
  }
}
