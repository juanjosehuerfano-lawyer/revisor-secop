// Módulos 2, 3 y 4: ficha del contrato o proceso, análisis de ejecución y análisis precontractual.

import { consultar, consultarSeguro, lit, whereAviso } from '../api.js';
import { esc, valor, fmtCOP, fmtFecha, fmtFechaHora, fmtNum, fechaISO, urlDe, campo, fuenteChip, num, NR } from '../util.js';
import { cargando, errorHtml, seccion, tabla, banda, tablero, ruta, estacion, activarRuta } from './comun.js';
import {
  lineaDeTiempo, editorAdiciones, activarEditorAdiciones, evaluarPrecontractual,
  checklist, activarChecklist, resumenAlertas, tablaFacturas, tablaModificaciones, tablaEjecucion, detalleAdiciones,
  evaluarEjecucion, alertasHtml, estacionLiquidacion,
} from './analisis.js';
import { botonSeguir, activarSeguir } from './casos.js';
import { evaluarAdiciones, adicionesDesdeModificaciones, claseModalidad } from '../reglas.js';
import { pendiente, cargarOfertas, cargarDocumentos, cargarProponentesSecop1, cargarDocumentosSecop1 } from './expediente.js';
import { documentoBase } from './veeduria.js';

const AVISO_LEGAL = `<p class="aviso-legal">Herramienta de apoyo a la revisión. No reemplaza el análisis del expediente completo en SECOP.
  Los datos provienen de datos.gov.co tal como los publica Colombia Compra Eficiente; cuando un campo no viene, se indica "${NR}".
  Las reglas de alerta están pendientes de validación jurídica hasta que se marquen como validadas en la pestaña Reglas.</p>`;

function noticeUID(url) {
  const m = String(url || '').match(/noticeUID=(CO1\.NTC\.\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

function entidadFiltro(nit, codigo) {
  const n = String(nit ?? '').replace(/\D/g, '');
  if (n) return `nit_de_la_entidad = ${lit(n)}`;
  if (codigo) return `codigo_entidad_en_secop = ${lit(codigo)}`;
  return null;
}

// Historial de contratos entre la misma entidad y el mismo proveedor (SECOP Integrado cubre I y II).
async function historialProveedor({ nitEntidad, codigoEntidad, docProveedor }) {
  const fEnt = entidadFiltro(nitEntidad, codigoEntidad);
  if (!fEnt || !docProveedor) return null;
  const r = await consultarSeguro('integrado', {
    $select: 'numero_del_contrato,fecha_de_firma_del_contrato,modalidad_de_contrataci_n,valor_contrato,objeto_del_proceso,origen',
    $where: `${fEnt} AND documento_proveedor = ${lit(docProveedor)}`,
    $order: 'fecha_de_firma_del_contrato DESC',
    $limit: 500,
  });
  // SECOP Integrado repite filas del mismo contrato; sin quitarlas, la regla de directa repetida contaría de más.
  const vistos = new Set();
  r.filas = r.filas.filter(f => !vistos.has(f.numero_del_contrato) && vistos.add(f.numero_del_contrato));
  return r;
}

function tablaHistorial(h, idActual) {
  if (!h) return '<p class="nr">No se pudo armar el historial: falta el NIT de la entidad o el documento del proveedor.</p>';
  if (h.error) return errorHtml(h.error);
  return tabla(['Contrato', 'Firma', 'Modalidad', 'Valor', 'Objeto'],
    h.filas.map(r => {
      const href = r.origen === 'SECOPI' ? `#/secop1/${encodeURIComponent(r.numero_del_contrato)}` : `#/contrato/${encodeURIComponent(r.numero_del_contrato)}`;
      const actual = r.numero_del_contrato === idActual ? ' <span class="etiqueta">este contrato</span>' : '';
      return [`<a href="${href}"><code>${esc(valor(r.numero_del_contrato))}</code></a>${actual}`, fmtFecha(r.fecha_de_firma_del_contrato),
        esc(valor(r.modalidad_de_contrataci_n)), fmtCOP(r.valor_contrato), esc(valor(r.objeto_del_proceso))];
    })) + fuenteChip(h);
}

function historialParaRegla(h) {
  return h && !h.error ? h.filas.map(r => ({ fecha: String(r.fecha_de_firma_del_contrato || '').slice(0, 10), modalidad: r.modalidad_de_contrataci_n })) : undefined;
}

// Franja del título con los datos de identificación, las acciones y la ruta; debajo, el tablero de cifras.
function encabezado({ etiqueta, numero, titulo, entidad, proveedor, url, extra = '', hash, estaciones, nombreRuta, celdas }) {
  const meta = [esc(etiqueta), numero && `<code>${esc(numero)}</code>`, esc(valor(entidad)),
    proveedor !== undefined && `Proveedor: ${esc(valor(proveedor))}`].filter(Boolean).join(' · ');
  return banda({
    titulo: esc(valor(titulo)),
    meta: meta + extra,
    acciones: `${url ? `<a class="boton" href="${esc(url)}" target="_blank" rel="noopener">Ver en SECOP</a>` : ''}
      <button type="button" class="secundario" data-accion="imprimir">Exportar a PDF</button>
      ${botonSeguir({ ruta: hash, tipo: etiqueta, titulo: valor(titulo).slice(0, 200), detalle: [entidad, proveedor].filter(Boolean).join(' · ') })}`,
    extra: ruta(estaciones, nombreRuta),
  }) + tablero(celdas)
    + (url ? '' : `<p class="nr">Enlace al SECOP: ${NR}</p>`)
    + `<p class="solo-imprimir">Ficha generada el ${esc(fmtFechaHora(new Date()))} con Radar Contractual. Las fuentes y las horas de consulta están al final del documento.</p>`;
}

function enlacesVeeduria(nitEntidad, docProveedor) {
  const ent = documentoBase(nitEntidad).slice(0, 9), prov = documentoBase(docProveedor);
  const l = [ent && `<a href="#/entidad/${ent}">Veeduría de la entidad</a>`, prov && `<a href="#/proveedor/${prov}">Veeduría del proveedor</a>`].filter(Boolean);
  return l.length ? `<br><span class="no-imprimir">${l.join(' · ')}</span>` : '';
}

function seccionFuentes(consultas) {
  const lista = consultas.filter(Boolean);
  return seccion('fuentes', 'Fuentes consultadas', lista.map(c => c.error
    ? `<p class="fuente">${esc(c.conjunto.nombre)} (${c.conjunto.id}): error en la consulta: ${esc(c.error.message)}</p>`
    : fuenteChip(c)).join(''));
}

function activarComunes(raiz) {
  activarSeguir(raiz);
  activarRuta(raiz);
  raiz.querySelectorAll('[data-accion=imprimir]').forEach(b => b.addEventListener('click', () => {
    raiz.querySelectorAll('details').forEach(d => { d.dataset.abierto = d.open; d.open = true; });
    window.print();
  }));
  window.addEventListener('afterprint', () => raiz.querySelectorAll('details').forEach(d => { d.open = d.dataset.abierto === 'true'; }), { once: true });
}

// ================= Contrato SECOP II =================

function desdeContratos(r) {
  return {
    id: r.id_contrato, referencia: r.referencia_del_contrato, entidad: r.nombre_entidad, nitEntidad: r.nit_entidad, codigoEntidad: r.codigo_entidad,
    departamento: r.departamento, ciudad: r.ciudad, objeto: r.objeto_del_contrato || r.descripcion_del_proceso,
    modalidad: r.modalidad_de_contratacion, justificacion: r.justificacion_modalidad_de, tipo: r.tipo_de_contrato, estado: r.estado_contrato,
    valor: r.valor_del_contrato, fechaFirma: r.fecha_de_firma, fechaInicio: r.fecha_de_inicio_del_contrato, fechaFin: r.fecha_de_fin_del_contrato,
    duracion: r.duraci_n_del_contrato, diasAdicionados: r.dias_adicionados, puedeProrrogar: r.el_contrato_puede_ser_prorrogado,
    fechaProrroga: r.fecha_de_notificaci_n_de_prorrogaci_n, proveedor: r.proveedor_adjudicado, docProveedor: r.documento_proveedor,
    tipoDocProveedor: r.tipodocproveedor, supervisor: r.nombre_supervisor, ordenador: r.nombre_ordenador_del_gasto,
    origenRecursos: r.origen_de_los_recursos, destinoGasto: r.destino_gasto, valorFacturado: r.valor_facturado, valorPagado: r.valor_pagado,
    valorPendientePago: r.valor_pendiente_de_pago, valorPendienteEjecucion: r.valor_pendiente_de_ejecucion, pagoAdelantado: r.valor_de_pago_adelantado,
    liquidacion: r.liquidaci_n, fechaLiquidacion: r.fecha_inicio_liquidacion, fechaLimiteLiquidacion: r.fecha_fin_liquidacion,
    url: urlDe(r.urlproceso), procesoCompra: r.proceso_de_compra,
    ultimaActualizacion: r.ultima_actualizacion,
  };
}

function desdeIntegrado(r) {
  return {
    id: r.numero_del_contrato, referenciaProceso: r.numero_de_proceso, entidad: r.nombre_de_la_entidad, nitEntidad: r.nit_de_la_entidad,
    codigoEntidad: r.codigo_entidad_en_secop, departamento: r.departamento_entidad, ciudad: r.municipio_entidad,
    objeto: r.objeto_del_proceso || r.objeto_a_contratar, modalidad: r.modalidad_de_contrataci_n, tipo: r.tipo_de_contrato, estado: r.estado_del_proceso,
    valor: r.valor_contrato, fechaFirma: r.fecha_de_firma_del_contrato, fechaInicio: r.fecha_inicio_ejecuci_n, fechaFin: r.fecha_fin_ejecuci_n,
    proveedor: r.nom_raz_social_contratista, docProveedor: r.documento_proveedor, tipoDocProveedor: r.tipo_documento_proveedor, url: urlDe(r.url_contrato),
  };
}

// En SECOP II un mismo portafolio (CO1.BDOS) tiene una fila por fase: la prepublicación ("Presentación de observaciones")
// y la de ofertas son procedimientos distintos (CO1.REQ). Para los plazos hay que mirar todas las fases.
function elegirPrincipal(filas) {
  return filas.find(f => f.adjudicado === 'Si') || filas.find(f => /oferta/i.test(f.fase || '')) || filas[0];
}

async function completarFases(consulta, fila) {
  if (!fila?.id_del_portafolio) return { fases: fila ? [fila] : [], consultaFases: null };
  if (consulta?.filas.length && consulta.filas.every(f => f.id_del_portafolio === fila.id_del_portafolio) && /id_del_portafolio=/.test(consulta.url)) {
    return { fases: consulta.filas, consultaFases: null };
  }
  const cf = await consultarSeguro('procesos', { id_del_portafolio: fila.id_del_portafolio, $limit: 50 });
  return { fases: cf.filas.length ? cf.filas : [fila], consultaFases: cf };
}

function fechasDelProceso(fases, principal) {
  const pubs = fases.map(f => fechaISO(f.fecha_de_publicacion_del)).filter(Boolean).sort();
  return { publicacion: pubs[0], cierre: principal?.fecha_de_recepcion_de };
}

function eventosFases(fases) {
  return fases.flatMap(f => [
    { fecha: f.fecha_de_publicacion_del, titulo: `Publicación de la fase "${valor(f.fase)}"`, detalle: `${f.id_del_proceso} · ${valor(f.referencia_del_proceso)}`, fuente: 'p6dx-8zbt', tipo: 'pre' },
  ]);
}

function tablaFases(fases) {
  if (fases.length < 2) return '';
  return `<p>Este proceso tiene ${fases.length} fases en SECOP II:</p>` + tabla(['Procedimiento', 'Fase', 'Publicación', 'Cierre de respuestas', 'Estado'],
    fases.map(f => [`<a href="#/proceso/${encodeURIComponent(f.id_del_proceso)}"><code>${esc(f.id_del_proceso)}</code></a>`, esc(valor(f.fase)),
      fmtFecha(f.fecha_de_publicacion_del), fmtFecha(f.fecha_de_recepcion_de), esc(valor(f.estado_del_procedimiento))]));
}

async function buscarProceso(c) {
  let consulta = null, fila;
  if (c.procesoCompra) {
    consulta = await consultarSeguro('procesos', { id_del_portafolio: c.procesoCompra, $limit: 50 });
    fila = elegirPrincipal(consulta.filas);
  }
  // Sin portafolio: se une por el aviso (noticeUID) del enlace al SECOP, que es el mismo en contrato y proceso.
  // Primero por referencia + NIT (rápido) y se confirma con el aviso; si no, se busca el aviso dentro de la URL (lento, ~15 s).
  const ntc = noticeUID(c.url);
  const nit = String(c.nitEntidad ?? '').replace(/\D/g, '');
  if (!fila && c.referenciaProceso && nit) {
    const r = await consultarSeguro('procesos', { $where: `nit_entidad = ${lit(nit)} AND referencia_del_proceso like ${lit(c.referenciaProceso.replace(/[%_]/g, '') + '%')}`, $limit: 50 });
    const porAviso = r.filas.filter(f => ntc && noticeUID(urlDe(f.urlproceso)) === ntc);
    const candidatos = porAviso.length ? porAviso : (r.filas.length === 1 ? r.filas : []);
    if (candidatos.length) { consulta = r; fila = elegirPrincipal(candidatos); }
  }
  if (!fila && ntc) {
    consulta = await consultarSeguro('procesos', { $where: whereAviso('urlproceso.url', ntc), $limit: 10 });
    fila = elegirPrincipal(consulta.filas);
  }
  const { fases, consultaFases } = await completarFases(consulta, fila);
  const principal = fases.length ? elegirPrincipal(fases) : fila;
  return { consulta, consultaFases, fila: principal, fases };
}

export async function vistaContrato(raiz, id) {
  raiz.innerHTML = cargando('Consultando el contrato en SECOP II…');
  let base, c, deIntegrado = false;
  try {
    base = await consultar('contratos', { id_contrato: id, $limit: 1 });
    if (base.filas.length) c = desdeContratos(base.filas[0]);
    else {
      base = await consultar('integrado', { numero_del_contrato: id, $limit: 1 });
      if (base.filas.length) { c = desdeIntegrado(base.filas[0]); deIntegrado = true; }
    }
  } catch (e) {
    raiz.innerHTML = errorHtml(e);
    return;
  }
  if (!c) {
    raiz.innerHTML = `<div class="tarjeta"><h2>No se encontró el contrato <code>${esc(id)}</code></h2>
      <p>No está en ${esc(base.conjunto.nombre)}. Verifica el número o búscalo directamente en el SECOP.</p>${fuenteChip(base)}</div>`;
    return;
  }

  raiz.innerHTML = cargando('Consultando proceso, modificaciones, facturas y ejecución…');
  const [proc, adic, modi, fact, ejec, prov, hist] = await Promise.all([
    buscarProceso(c),
    consultarSeguro('adiciones', { id_contrato: c.id, $order: 'fecharegistro ASC', $limit: 500 }),
    consultarSeguro('modificaciones', {
      id_contrato: c.id, $select: 'identificador_modificacion,proposito_modificacion,valor_modificacion,dias_extendidos,fecha_de_aprobacion,fecha_creacion,estado_modificacion',
      $order: 'fecha_creacion ASC', $limit: 500,
    }),
    consultarSeguro('facturas', { id_contrato: c.id, $limit: 500 }),
    consultarSeguro('ejecucion', { identificadorcontrato: c.id, $limit: 500 }),
    c.docProveedor ? consultarSeguro('proveedores', { nit: c.docProveedor, $limit: 3 }) : null,
    historialProveedor(c),
  ]);
  const p = proc.fila;

  // Precontractual
  const oferentesUnicos = num(p?.proveedores_unicos_con);
  const usarUnicos = oferentesUnicos !== null && oferentesUnicos > 0;
  const fechasProc = fechasDelProceso(proc.fases, p);
  const pre = evaluarPrecontractual({
    modalidad: p?.modalidad_de_contratacion || c.modalidad,
    fechaPublicacion: fechasProc.publicacion, fechaCierre: fechasProc.cierre,
    numeroOferentes: p ? (usarUnicos ? oferentesUnicos : num(p.respuestas_al_procedimiento)) : undefined,
    campoOferentes: usarUnicos ? 'proveedores únicos con respuestas' : 'respuestas al procedimiento',
    historial: historialParaRegla(hist), fechaFirma: c.fechaFirma,
  });

  // Ejecución: regla del 50 %
  // "Modificaciones a contratos" trae el valor total del contrato después de cada modificación publicada: la adición es
  // la diferencia con el valor anterior. Si ese conjunto no muestra cambios de valor, quedan las filas de "Adiciones"
  // (sin valor) para que el abogado las digite. Muchas se registran como "Modificacion General" y solo la descripción dice "se adiciona".
  const claveAdic = `adiciones:${c.id}`;
  const candidatos = [];
  if (num(p?.valor_total_adjudicacion) > 0) candidatos.push({ etiqueta: 'Valor adjudicado en el proceso (p6dx-8zbt)', valor: num(p.valor_total_adjudicacion) });
  if (num(p?.precio_base) > 0) candidatos.push({ etiqueta: 'Precio base del proceso (p6dx-8zbt)', valor: num(p.precio_base) });
  if (num(c.valor) > 0) candidatos.push({ etiqueta: `Valor del contrato reportado hoy (${base.conjunto.id})`, valor: num(c.valor) });
  // Valor inicial por defecto: el adjudicado. En contratación directa no hay puja que baje el precio, así que sirve el precio base.
  const directa = claseModalidad(p?.modalidad_de_contratacion || c.modalidad) === 'directa';
  const inicial = candidatos.find(x => x.etiqueta.startsWith('Valor adjudicado')) || (directa && candidatos.find(x => x.etiqueta.startsWith('Precio base'))) || null;
  const calculo = adicionesDesdeModificaciones(modi.filas.map(m => ({
    id: m.identificador_modificacion, fecha: m.fecha_de_aprobacion || m.fecha_creacion, valor: num(m.valor_modificacion),
    estado: m.estado_modificacion, proposito: m.proposito_modificacion,
  })), inicial?.valor);
  const porTipo = adic.filas.filter(f => /adici/i.test(f.tipo || ''));
  const porDescripcion = adic.filas.filter(f => !/adici|reducc/i.test(f.tipo || '') && /adici/i.test(f.descripcion || ''));
  const sinValor = [...porTipo, ...porDescripcion].sort((a, b) => String(a.fecharegistro).localeCompare(String(b.fecharegistro)));
  const editor = editorAdiciones({
    clave: claveAdic, fechaInicial: c.fechaFirma, candidatosInicial: candidatos, valorInicialPorDefecto: inicial,
    adicionesPorDefecto: calculo.adiciones.length
      ? calculo.adiciones.map(a => ({ fecha: a.fecha, valor: a.valor, descripcion: `${a.id || ''} · ${String(a.proposito || '').slice(0, 160)} · Valor del contrato tras la modificación: ${fmtCOP(a.valorTras)}` }))
      : sinValor.map(f => ({ fecha: f.fecharegistro, valor: '', descripcion: `${f.identificador || ''} · ${f.descripcion || ''}` })),
    nota: modi.error
      ? `No se pudo consultar el conjunto de modificaciones (u8cx-r425), con el que la app calcula las adiciones: ${modi.error.message} Recarga la página para intentarlo de nuevo. Mientras tanto, SECOP registra ${porTipo.length} modificación(es) de tipo "Adición en el valor" y ${porDescripcion.length} cuya descripción menciona una adición: puedes digitar su valor tomándolo de cada documento.`
      : calculo.adiciones.length
      ? `SECOP no publica el valor de cada adición, sino el valor total del contrato después de cada modificación publicada (conjunto u8cx-r425). La app calculó ${calculo.adiciones.length} adición(es) restando el valor anterior${inicial ? `, a partir de: ${inicial.etiqueta}` : ''}.${calculo.sinBase ? ' No encontró un valor inicial confiable: elige o digita el valor inicial y agrega la primera adición, que no se pudo calcular.' : ''} Verifica cada valor contra el documento de la modificación; si cambias el valor inicial, corrige la primera fila. Lo que digites se guarda solo en este navegador.`
      : `SECOP no publica el valor de cada adición, y el conjunto de modificaciones (u8cx-r425) no muestra aumentos en el valor de este contrato${calculo.sinBase ? ' que se puedan calcular sin un valor inicial' : ''}. SECOP registra ${porTipo.length} modificación(es) de tipo "Adición en el valor" y ${porDescripcion.length} cuya descripción menciona una adición. Abre cada documento en el SECOP, digita su valor y borra las filas que no sean adiciones en valor. Lo que digites se guarda solo en este navegador.`,
  });
  const datosClave = `<dl class="grilla-datos">
    <div class="campo ancho"><dt>Objeto</dt><dd>${esc(valor(c.objeto))}</dd></div>
    ${campo('ID del contrato', c.id)}${campo('Referencia del contrato', c.referencia)}
    ${deIntegrado ? campo('Número de proceso (SECOP Integrado)', c.referenciaProceso) : campo('Proceso de compra', c.procesoCompra)}
    ${campo('Proceso de selección', p?.id_del_proceso)}${campo('Referencia del proceso', p?.referencia_del_proceso)}
    ${campo('Entidad', c.entidad)}${campo('NIT de la entidad', c.nitEntidad)}${campo('Ubicación', [c.ciudad, c.departamento].filter(Boolean).join(', ') || undefined)}
    ${campo('Proveedor', c.proveedor)}${campo('Documento del proveedor', c.docProveedor ? `${c.tipoDocProveedor ? c.tipoDocProveedor + ' ' : ''}${c.docProveedor}` : undefined)}
    ${campo('Modalidad', c.modalidad)}${campo('Justificación de la modalidad', c.justificacion)}${campo('Tipo de contrato', c.tipo)}
    ${campo('Estado', c.estado)}${campo('Valor del contrato', c.valor, fmtCOP)}${campo('Fecha de firma', c.fechaFirma, fmtFecha)}
    ${campo('Inicio', c.fechaInicio, fmtFecha)}${campo('Fin', c.fechaFin, fmtFecha)}${campo('Duración', c.duracion)}
    ${campo('Supervisor', c.supervisor)}${campo('Ordenador del gasto', c.ordenador)}${campo('Origen de los recursos', c.origenRecursos)}
    ${campo('Destino del gasto', c.destinoGasto)}${campo('¿Requiere liquidación?', c.liquidacion)}${campo('Periodo de liquidación hasta', c.fechaLimiteLiquidacion, fmtFecha)}
    ${campo('Última actualización en SECOP', c.ultimaActualizacion, fmtFecha)}
  </dl>`;

  const eventos = [
    ...eventosFases(proc.fases),
    p && { fecha: p.fecha_de_recepcion_de, titulo: 'Cierre / recepción de ofertas', fuente: 'p6dx-8zbt', tipo: 'pre' },
    p && { fecha: p.fecha_de_apertura_efectiva, titulo: 'Apertura efectiva de ofertas', fuente: 'p6dx-8zbt', tipo: 'pre' },
    p && { fecha: p.fecha_adjudicacion, titulo: 'Adjudicación', detalle: num(p.valor_total_adjudicacion) ? fmtCOP(p.valor_total_adjudicacion) : '', fuente: 'p6dx-8zbt', tipo: 'pre' },
    { fecha: c.fechaFirma, titulo: 'Firma del contrato', detalle: fmtCOP(c.valor), fuente: base.conjunto.id },
    { fecha: c.fechaInicio, titulo: 'Inicio de ejecución', fuente: base.conjunto.id },
    { fecha: c.fechaFin, titulo: 'Fin de ejecución previsto', fuente: base.conjunto.id },
    { fecha: c.fechaProrroga, titulo: 'Notificación de prórroga', fuente: base.conjunto.id, tipo: 'mod' },
    { fecha: c.fechaLiquidacion, titulo: 'Inicio de liquidación', fuente: base.conjunto.id, tipo: 'post' },
    ...adic.filas.map(f => ({ fecha: f.fecharegistro, titulo: `Modificación: ${valor(f.tipo)}`, detalle: f.descripcion, fuente: 'cb9c-h8sn', tipo: 'mod' })),
    ...fact.filas.slice(0, 60).map(f => ({ fecha: f.fecha_factura, titulo: `Factura ${valor(f.numero_de_factura)}`, detalle: `${fmtCOP(f.valor_total)} · ${valor(f.estado)}`, fuente: 'ibyt-yi2f', tipo: 'pago' })),
  ].filter(Boolean);

  const financiero = `<dl class="grilla-datos">
    ${campo('Valor del contrato', c.valor, fmtCOP)}${campo('Valor facturado', c.valorFacturado, fmtCOP)}${campo('Valor pagado', c.valorPagado, fmtCOP)}
    ${campo('Pendiente de pago', c.valorPendientePago, fmtCOP)}${campo('Pendiente de ejecución', c.valorPendienteEjecucion, fmtCOP)}${campo('Pago anticipado', c.pagoAdelantado, fmtCOP)}
    ${campo('Días adicionados (prórrogas)', c.diasAdicionados, v => fmtNum(v, ' días'))}${campo('¿Puede prorrogarse?', c.puedeProrrogar)}${campo('Notificación de prórroga', c.fechaProrroga, fmtFecha)}
  </dl>${num(c.valor) && num(p?.valor_total_adjudicacion) && num(c.valor) !== num(p.valor_total_adjudicacion)
    ? `<p class="indicio">Indicio: el valor del contrato que reporta SECOP hoy (${fmtCOP(c.valor)}) difiere del valor adjudicado en el proceso (${fmtCOP(p.valor_total_adjudicacion)}). La diferencia es de ${fmtCOP(num(c.valor) - num(p.valor_total_adjudicacion))}. Puede deberse a adiciones, a lotes o a un error de registro: verifícalo en el expediente.</p>` : ''}`;

  const datosProceso = p ? `<dl class="grilla-datos">
      ${campo('ID del proceso', p.id_del_proceso)}${campo('Referencia', p.referencia_del_proceso)}${campo('Nombre', p.nombre_del_procedimiento)}
      ${campo('Modalidad', p.modalidad_de_contratacion)}${campo('Justificación', p.justificaci_n_modalidad_de)}${campo('Precio base', p.precio_base, fmtCOP)}
      ${campo('Proveedores invitados', p.proveedores_invitados)}${campo('Manifestaciones de interés', p.proveedores_que_manifestaron)}
      ${campo('Respuestas al procedimiento', p.respuestas_al_procedimiento)}${campo('Proveedores únicos con respuestas', p.proveedores_unicos_con)}
      ${campo('Estado', p.estado_del_procedimiento)}${campo('Fase', p.fase)}
    </dl>${tablaFases(proc.fases)}<p><a href="#/proceso/${encodeURIComponent(p.id_del_proceso)}">Abrir la ficha del proceso</a></p>`
    : `<p class="nr">No se encontró el proceso en ${esc('SECOP II – Procesos')}${proc.consulta ? '' : ': el contrato no trae el identificador del proceso ni la referencia con NIT'}.</p>`;

  // fechaLiquidacion del contrato es el inicio previsto del periodo de liquidación, no la liquidación: no se pasa a la regla.
  const ejecucion = evaluarEjecucion({
    fechaFirma: c.fechaFirma, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, diasAdicionados: c.diasAdicionados,
    valor: c.valor, valorPagado: c.valorPagado, estado: c.estado, fechaLimiteLiquidacion: c.fechaLimiteLiquidacion,
    requiereLiquidacion: c.liquidacion === undefined ? undefined : /^s/i.test(c.liquidacion),
  });
  const autoItems = [
    { id: 'plazoOfertas', ...pre.plazoOfertas }, { id: 'proponenteUnico', ...pre.proponenteUnico },
    pre.directaRepetida && { id: 'directaRepetida', ...pre.directaRepetida }, ...ejecucion,
  ];

  // Ruta del contrato: las estaciones toman el nivel de la alerta que les corresponde.
  const nivelDe = regla => autoItems.find(x => x && x.id === regla)?.r.nivel;
  const estadoCierre = nivelDe('plazoOfertas') === 'alta' ? 'alta' : nivelDe('proponenteUnico') === 'media' ? 'media' : null;
  const liq = estacionLiquidacion(ejecucion.find(x => x.id === 'liquidacion').r);
  const estaciones = [
    p && estacion('Publicación', fechasProc.publicacion, { etapa: 'Precontractual', tramo: 'pre', ir: 'precontractual' }),
    p && estacion('Cierre de ofertas', fechasProc.cierre, { tramo: 'pre', ir: 'precontractual', ...(estadoCierre && { estado: estadoCierre }) }),
    estacion('Firma', c.fechaFirma, { etapa: 'Ejecución', tramo: 'eje', ir: 'datos' }),
    estacion('Inicio', c.fechaInicio, { tramo: 'eje', ir: 'ejecucion', ...(nivelDe('inicioAntesFirma') === 'media' && { estado: 'media' }) }),
    adic.filas.length && { titulo: `${adic.filas.length} modificación(es)`, detalle: `Última: ${fmtFecha(adic.filas.at(-1).fecharegistro)}`, tramo: 'eje', estado: 'menor', ir: 'ejecucion' },
    estacion('Fin del plazo', c.fechaFin, { tramo: liq.tramo, ir: 'ejecucion' }),
    liq.estacion,
  ].filter(Boolean);
  const celdas = [
    { etiqueta: 'Valor del contrato', valor: fmtCOP(c.valor) },
    { etiqueta: 'Pagado', valor: fmtCOP(c.valorPagado), nota: num(c.valor) > 0 && num(c.valorPagado) !== null ? fmtNum((num(c.valorPagado) / num(c.valor)) * 100, ' %') : '' },
    { etiqueta: 'Plazo', valor: valor(c.duracion) },
    { etiqueta: 'Estado en SECOP', valor: valor(c.estado) },
  ];

  raiz.innerHTML = `
    ${encabezado({ etiqueta: 'Contrato · SECOP II', titulo: c.objeto, entidad: c.entidad, proveedor: c.proveedor, url: c.url, extra: enlacesVeeduria(c.nitEntidad, c.docProveedor), hash: `#/contrato/${encodeURIComponent(c.id)}`, numero: c.id, estaciones, nombreRuta: 'Ruta del contrato', celdas })}
    ${deIntegrado ? `<div class="aviso">El conjunto <em>SECOP II – Contratos Electrónicos</em> (jbjy-vk9h) no devolvió este contrato. Los datos básicos vienen de <em>SECOP Integrado</em> (rpmr-utcd), que no publica supervisor, pagos, liquidación ni días adicionados: esos campos aparecen como "${NR}" y sus alertas quedan sin datos.</div>` : ''}
    ${seccion('alertas', 'Resumen de alertas', `<div id="resumen-alertas">${resumenAlertas(autoItems)}</div>`)}
    ${seccion('datos', 'Datos clave del contrato', datosClave, fuenteChip(base))}
    ${seccion('tiempo', 'Línea de tiempo', lineaDeTiempo(eventos))}
    ${seccion('ejecucion', 'Análisis de ejecución', `
      <h4>Alertas de ejecución</h4>${alertasHtml(ejecucion)}
      <h4>Valores y plazos reportados</h4>${financiero}
      <h4>Adiciones frente al valor inicial (tope del 50 %)</h4>${editor}
      <h4>Modificaciones registradas</h4>${adic.error ? errorHtml(adic.error) : tablaModificaciones(adic.filas, modi.filas)}${fuenteChip(adic)}${modi.error ? errorHtml(modi.error) : fuenteChip(modi)}
      <h4>Facturas y pagos</h4>${fact.error ? errorHtml(fact.error) : tablaFacturas(fact.filas)}${fuenteChip(fact)}
      <h4>Plan de ejecución y entregas</h4>${ejec.error ? errorHtml(ejec.error) : tablaEjecucion(ejec.filas)}${fuenteChip(ejec)}`)}
    ${seccion('precontractual', 'Análisis precontractual', `
      <h4>Proceso de selección</h4>${datosProceso}${proc.consulta ? fuenteChip(proc.consulta) : ''}${proc.consultaFases ? fuenteChip(proc.consultaFases) : ''}
      <h4>Checklist guiado</h4>
      ${checklist(`checklist:${c.id}`, pre, { urlExpediente: c.url, justificacion: c.justificacion || p?.justificaci_n_modalidad_de })}
      <h4>Contratos entre la entidad y el proveedor</h4>${tablaHistorial(hist, c.id)}`)}
    ${seccion('ofertas', 'Proponentes y ofertas', pendiente('Consultando proponentes y ofertas…'))}
    ${seccion('documentos', 'Documentos del expediente', pendiente('Consultando los documentos publicados en SECOP II…'))}
    ${seccion('proveedor', 'Proveedor', datosProveedor(prov))}
    ${seccionFuentes([base, proc.consulta, proc.consultaFases, adic, modi, fact, ejec, prov, hist])}
    ${AVISO_LEGAL}`;

  activarEditorAdiciones(raiz);
  activarChecklist(raiz);
  activarComunes(raiz);
  sincronizarResumenAdiciones(raiz, autoItems);
  // Proponentes, ofertas y documentos cargan después, para no demorar la ficha.
  const portafolio = c.procesoCompra || p?.id_del_portafolio;
  const anio = Number((fechasProc.publicacion || fechaISO(c.fechaFirma) || '').slice(0, 4)) || undefined;
  cargarOfertas(raiz, { idProceso: p?.id_del_proceso, portafolio, anio, docDestacado: c.docProveedor, rotuloDestacado: 'contratista' });
  cargarDocumentos(raiz, { portafolio, contrato: c.id, anio });
}

// El resumen de alertas incluye la regla del 50 % y se actualiza cuando el abogado digita valores.
function sincronizarResumenAdiciones(raiz, autoItems) {
  const ed = raiz.querySelector('.editor-adiciones');
  const resumen = raiz.querySelector('#resumen-alertas');
  if (!ed || !resumen) return;
  const pintar = () => {
    const leerNum = sel => num(ed.querySelector(sel)?.value);
    const r = evaluarAdiciones({
      valorInicial: leerNum('[name=valorInicial]'),
      fechaInicial: ed.querySelector('[name=fechaInicial]').value,
      adiciones: [...ed.querySelectorAll('tbody tr')].map(tr => ({ valor: num(tr.querySelector('[name=valor]').value), fecha: tr.querySelector('[name=fecha]').value })),
    });
    resumen.innerHTML = resumenAlertas([...autoItems, { id: 'adiciones50', r, detalle: detalleAdiciones(r) }]);
  };
  ed.addEventListener('input', pintar);
  ed.addEventListener('click', () => setTimeout(pintar, 0));
  pintar();
}

function datosProveedor(prov) {
  if (!prov) return `<p class="nr">${NR}: el contrato no trae documento del proveedor.</p>`;
  if (prov.error) return errorHtml(prov.error);
  const r = prov.filas[0];
  if (!r) return `<p class="nr">El proveedor no aparece en el registro de proveedores de SECOP II.</p>${fuenteChip(prov)}`;
  return `<dl class="grilla-datos">
    ${campo('Nombre', r.nombre)}${campo('NIT / documento', r.nit)}${campo('Tipo de empresa', r.tipo_empresa)}
    ${campo('Activo en SECOP', r.esta_activa)}${campo('Registrado desde', r.fecha_creacion, fmtFecha)}${campo('Es PYME', r.espyme)}
    ${campo('Representante legal', r.nombre_representante_legal)}${campo('Ubicación', [r.municipio, r.departamento].filter(Boolean).join(', ') || undefined)}
    ${campo('Actividad principal', r.descripcion_categoria_principal)}
  </dl>${fuenteChip(prov)}`;
}

// ================= Proceso SECOP II =================

export async function vistaProceso(raiz, id) {
  raiz.innerHTML = cargando('Consultando el proceso en SECOP II…');
  let base;
  try {
    const campoId = /BDOS/i.test(id) ? 'id_del_portafolio' : 'id_del_proceso';
    base = await consultar('procesos', { [campoId]: id, $limit: 10 });
  } catch (e) {
    raiz.innerHTML = errorHtml(e);
    return;
  }
  const p = elegirPrincipal(base.filas);
  if (!p) {
    raiz.innerHTML = `<div class="tarjeta"><h2>No se encontró el proceso <code>${esc(id)}</code></h2>${fuenteChip(base)}</div>`;
    return;
  }
  const nit = String(p.nit_entidad ?? '').replace(/\D/g, '');
  const { fases, consultaFases } = await completarFases(base, p);
  const principal = elegirPrincipal(fases);
  const fechasProc = fechasDelProceso(fases, principal);
  // Contratos derivados: por portafolio en jbjy-vk9h y, en SECOP Integrado, por referencia + NIT.
  // SECOP II agrega a la referencia el nombre de la fase ("… (Presentación de oferta)"), que se quita para comparar.
  const avisos = new Set(fases.map(f => noticeUID(urlDe(f.urlproceso))).filter(Boolean));
  const refBase = String(p.referencia_del_proceso || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/[%_]/g, '');
  const [derivJ, derivI] = await Promise.all([
    p.id_del_portafolio ? consultarSeguro('contratos', { proceso_de_compra: p.id_del_portafolio, $limit: 50 }) : null,
    refBase && nit ? consultarSeguro('integrado', { $where: `nit_de_la_entidad = ${lit(nit)} AND numero_de_proceso like ${lit(refBase + '%')}`, $limit: 100 }) : null,
  ]);
  if (derivI?.filas.length) {
    const porAviso = derivI.filas.filter(r => avisos.has(noticeUID(r.url_contrato)));
    if (porAviso.length) derivI.filas = porAviso;
  }
  const contratos = new Map();
  derivJ?.filas.forEach(r => contratos.set(r.id_contrato, { id: r.id_contrato, proveedor: r.proveedor_adjudicado, valor: r.valor_del_contrato, firma: r.fecha_de_firma, estado: r.estado_contrato }));
  derivI?.filas.filter(r => r.origen === 'SECOPII').forEach(r => contratos.has(r.numero_del_contrato) || contratos.set(r.numero_del_contrato,
    { id: r.numero_del_contrato, proveedor: r.nom_raz_social_contratista, valor: r.valor_contrato, firma: r.fecha_de_firma_del_contrato, estado: r.estado_del_proceso }));

  const oferentesUnicos = num(principal.proveedores_unicos_con);
  const usarUnicos = oferentesUnicos !== null && oferentesUnicos > 0;
  const pre = evaluarPrecontractual({
    modalidad: principal.modalidad_de_contratacion, fechaPublicacion: fechasProc.publicacion, fechaCierre: fechasProc.cierre,
    numeroOferentes: usarUnicos ? oferentesUnicos : num(principal.respuestas_al_procedimiento),
    campoOferentes: `${usarUnicos ? 'proveedores únicos con respuestas' : 'respuestas al procedimiento'}, fase "${valor(principal.fase)}"`,
  });
  const url = urlDe(p.urlproceso);
  const estadoCierre = pre.plazoOfertas.r.nivel === 'alta' ? 'alta' : pre.proponenteUnico.r.nivel === 'media' ? 'media' : null;
  const primerContrato = [...contratos.values()].filter(x => fechaISO(x.firma)).sort((a, b) => String(a.firma).localeCompare(String(b.firma)))[0];
  const estaciones = [
    estacion('Publicación', fechasProc.publicacion, { etapa: 'Selección', tramo: 'pre', ir: 'datos' }),
    estacion('Cierre de ofertas', fechasProc.cierre, { tramo: 'pre', ir: 'alertas', ...(estadoCierre && { estado: estadoCierre }) }),
    estacion('Apertura de ofertas', principal.fecha_de_apertura_efectiva, { tramo: 'pre', ir: 'tiempo' }),
    estacion('Adjudicación', principal.fecha_adjudicacion, { tramo: 'eje', ir: 'datos' }),
    primerContrato
      ? estacion('Firma del contrato', primerContrato.firma, { etapa: 'Contrato', ir: 'contratos' })
      : { etapa: 'Contrato', titulo: 'Contrato', detalle: 'SECOP no reporta contratos derivados', estado: 'pend', ir: 'contratos' },
  ];
  const celdas = [
    { etiqueta: 'Precio base', valor: fmtCOP(p.precio_base) },
    { etiqueta: 'Valor adjudicado', valor: fmtCOP(p.valor_total_adjudicacion) },
    { etiqueta: 'Oferentes', valor: valor(usarUnicos ? oferentesUnicos : principal.respuestas_al_procedimiento) },
    { etiqueta: 'Estado en SECOP', valor: valor(p.estado_del_procedimiento) },
  ];
  const lotes = base.filas.length > 1 && !/BDOS/i.test(id) ? `<p class="aviso">SECOP devuelve ${base.filas.length} registros para este identificador (por ejemplo, por lotes). Se muestra ${p.adjudicado === 'Si' ? 'el adjudicado' : 'el primero'}.</p>` : '';

  raiz.innerHTML = `
    ${encabezado({ etiqueta: 'Proceso · SECOP II', titulo: p.nombre_del_procedimiento, entidad: p.entidad, url, extra: enlacesVeeduria(p.nit_entidad, p.nit_del_proveedor_adjudicado), hash: `#/proceso/${encodeURIComponent(p.id_del_proceso)}`, numero: p.id_del_proceso, estaciones, nombreRuta: 'Ruta del proceso', celdas })}
    ${lotes}
    ${seccion('alertas', 'Resumen de alertas', resumenAlertas([{ id: 'plazoOfertas', ...pre.plazoOfertas }, { id: 'proponenteUnico', ...pre.proponenteUnico }]))}
    ${seccion('datos', 'Datos clave del proceso', `<dl class="grilla-datos">
      ${campo('ID del proceso', p.id_del_proceso)}${campo('Portafolio', p.id_del_portafolio)}${campo('Referencia', p.referencia_del_proceso)}
      ${campo('Entidad', p.entidad)}${campo('NIT de la entidad', p.nit_entidad)}${campo('Unidad de contratación', p.nombre_de_la_unidad_de)}
      ${campo('Descripción', p.descripci_n_del_procedimiento)}${campo('Modalidad', p.modalidad_de_contratacion)}${campo('Justificación de la modalidad', p.justificaci_n_modalidad_de)}
      ${campo('Tipo de contrato', p.tipo_de_contrato)}${campo('Precio base', p.precio_base, fmtCOP)}${campo('Duración', p.duracion ? `${p.duracion} ${p.unidad_de_duracion || ''}` : undefined)}
      ${campo('Fase', p.fase)}${campo('Estado', p.estado_del_procedimiento)}${campo('Adjudicado', p.adjudicado)}
      ${campo('Valor adjudicado', p.valor_total_adjudicacion, fmtCOP)}${campo('Proveedor adjudicado', p.nombre_del_proveedor)}${campo('NIT del adjudicado', p.nit_del_proveedor_adjudicado)}
      ${campo('Proveedores invitados', p.proveedores_invitados)}${campo('Manifestaciones de interés', p.proveedores_que_manifestaron)}${campo('Respuestas al procedimiento', p.respuestas_al_procedimiento)}
      ${campo('Proveedores únicos con respuestas', p.proveedores_unicos_con)}${campo('Visualizaciones', p.visualizaciones_del)}${campo('Número de lotes', p.numero_de_lotes)}
    </dl>${tablaFases(fases)}`, fuenteChip(base) + (consultaFases ? fuenteChip(consultaFases) : ''))}
    ${seccion('tiempo', 'Línea de tiempo', lineaDeTiempo([
      ...eventosFases(fases),
      { fecha: principal.fecha_de_recepcion_de, titulo: 'Cierre / recepción de ofertas', fuente: 'p6dx-8zbt', tipo: 'pre' },
      { fecha: principal.fecha_de_apertura_efectiva, titulo: 'Apertura efectiva de ofertas', fuente: 'p6dx-8zbt', tipo: 'pre' },
      { fecha: principal.fecha_adjudicacion, titulo: 'Adjudicación', fuente: 'p6dx-8zbt', tipo: 'pre' },
      ...[...contratos.values()].map(x => ({ fecha: x.firma, titulo: `Firma del contrato ${x.id}`, detalle: fmtCOP(x.valor), fuente: 'jbjy-vk9h / rpmr-utcd' })),
    ]))}
    ${seccion('precontractual', 'Análisis precontractual', checklist(`checklist:${p.id_del_proceso}`, pre, { urlExpediente: url, justificacion: p.justificaci_n_modalidad_de }))}
    ${seccion('ofertas', 'Proponentes y ofertas', pendiente('Consultando proponentes y ofertas…'))}
    ${seccion('documentos', 'Documentos del expediente', pendiente('Consultando los documentos publicados en SECOP II…'))}
    ${seccion('contratos', 'Contratos derivados', tabla(['Contrato', 'Proveedor', 'Valor', 'Firma', 'Estado'],
      [...contratos.values()].map(x => [`<a href="#/contrato/${encodeURIComponent(x.id)}"><code>${esc(x.id)}</code></a>`, esc(valor(x.proveedor)), fmtCOP(x.valor), fmtFecha(x.firma), esc(valor(x.estado))])))}
    ${seccionFuentes([base, consultaFases, derivJ, derivI])}
    ${AVISO_LEGAL}`;
  activarChecklist(raiz);
  activarComunes(raiz);
  const anio = Number((fechasProc.publicacion || '').slice(0, 4)) || undefined;
  cargarOfertas(raiz, { idProceso: principal.id_del_proceso, portafolio: p.id_del_portafolio, anio, docDestacado: p.nit_del_proveedor_adjudicado, rotuloDestacado: 'adjudicado' });
  cargarDocumentos(raiz, { portafolio: p.id_del_portafolio, anio });
}

// ================= SECOP I =================

export async function vistaSecop1(raiz, id) {
  raiz.innerHTML = cargando('Consultando SECOP I…');
  let base;
  try {
    base = await consultar('secop1', { uid: id, $limit: 1 });
    if (!base.filas.length) base = await consultar('secop1', { numero_de_constancia: id, $limit: 50 });
  } catch (e) {
    raiz.innerHTML = errorHtml(e);
    return;
  }
  if (!base.filas.length) {
    raiz.innerHTML = `<div class="tarjeta"><h2>No se encontró <code>${esc(id)}</code> en SECOP I</h2>${fuenteChip(base)}</div>`;
    return;
  }
  if (base.filas.length > 1 && new Set(base.filas.map(f => f.uid)).size > 1) {
    raiz.innerHTML = `<div class="tarjeta"><h2>La constancia ${esc(id)} tiene ${base.filas.length} registros</h2>
      <p>Elige el contrato que quieres revisar:</p>${tabla(['Registro', 'Contrato', 'Contratista', 'Cuantía', 'Rubro'],
      base.filas.map(f => [`<a href="#/secop1/${encodeURIComponent(f.uid)}"><code>${esc(f.uid)}</code></a>`, esc(valor(f.numero_de_contrato)),
        esc(valor(f.nom_razon_social_contratista)), fmtCOP(f.cuantia_contrato), esc(valor(f.nombre_rubro))]))}${fuenteChip(base)}</div>`;
    return;
  }
  const r = base.filas[0];
  const url = urlDe(r.ruta_proceso_en_secop_i);
  const hist = await historialProveedor({ nitEntidad: r.nit_de_la_entidad, codigoEntidad: r.c_digo_de_la_entidad, docProveedor: r.identificacion_del_contratista });
  const pre = evaluarPrecontractual({
    modalidad: r.modalidad_de_contratacion, numeroOferentes: undefined, historial: historialParaRegla(hist), fechaFirma: r.fecha_de_firma_del_contrato,
  });
  // SECOP I no publica pagos ni días adicionados comparables: esas dos reglas se omiten.
  const ejecucion = evaluarEjecucion({
    fechaFirma: r.fecha_de_firma_del_contrato, fechaInicio: r.fecha_ini_ejec_contrato, fechaFin: r.fecha_fin_ejec_contrato,
    estado: r.estado_del_proceso, fechaLiquidacion: r.fecha_liquidacion,
  }, { omitir: ['prorrogas', 'pagosExceso'] });
  const liq = estacionLiquidacion(ejecucion.find(x => x.id === 'liquidacion').r, r.fecha_liquidacion);
  const estaciones = [
    estacion('Cargue en SECOP I', r.fecha_de_cargue_en_el_secop, { etapa: 'Precontractual', tramo: 'pre', ir: 'datos' }),
    estacion('Firma', r.fecha_de_firma_del_contrato, { etapa: 'Ejecución', tramo: 'eje', ir: 'datos' }),
    estacion('Inicio', r.fecha_ini_ejec_contrato, { tramo: 'eje', ir: 'ejecucion', ...(ejecucion.find(x => x.id === 'inicioAntesFirma').r.nivel === 'media' && { estado: 'media' }) }),
    estacion('Fin del plazo', r.fecha_fin_ejec_contrato, { tramo: liq.tramo, ir: 'ejecucion' }),
    liq.estacion,
  ];
  const celdas = [
    { etiqueta: 'Cuantía del contrato', valor: fmtCOP(r.cuantia_contrato) },
    { etiqueta: 'Valor con adiciones', valor: fmtCOP(r.valor_contrato_con_adiciones) },
    { etiqueta: 'Plazo', valor: valor(r.plazo_de_ejec_del_contrato ? `${r.plazo_de_ejec_del_contrato} ${r.rango_de_ejec_del_contrato || ''}`.trim() : undefined) },
    { etiqueta: 'Estado en SECOP', valor: valor(r.estado_del_proceso) },
  ];
  const totalAdic = num(r.valor_total_de_adiciones);
  const editor = editorAdiciones({
    clave: `adiciones:${r.uid}`, fechaInicial: r.fecha_de_firma_del_contrato,
    candidatosInicial: num(r.cuantia_contrato) > 0 ? [{ etiqueta: 'Cuantía del contrato en SECOP I (f789-7hwg)', valor: num(r.cuantia_contrato) }] : [],
    valorInicialPorDefecto: num(r.cuantia_contrato) > 0 ? { etiqueta: 'Cuantía del contrato en SECOP I (f789-7hwg)', valor: num(r.cuantia_contrato) } : null,
    adicionesPorDefecto: totalAdic > 0 ? [{ fecha: '', valor: totalAdic, descripcion: 'Valor total de adiciones reportado en SECOP I' }] : [],
    nota: 'SECOP I reporta el valor total de las adiciones sin su fecha. Para expresarlas en SMMLV, como exige la norma, digita la fecha de cada adición (puedes dividir el total en filas).',
  });

  raiz.innerHTML = `
    ${encabezado({ etiqueta: 'Contrato · SECOP I', titulo: r.objeto_del_contrato_a_la || r.detalle_del_objeto_a_contratar, entidad: r.nombre_entidad, proveedor: r.nom_razon_social_contratista, url, extra: enlacesVeeduria(r.nit_de_la_entidad, r.identificacion_del_contratista), hash: `#/secop1/${encodeURIComponent(r.uid)}`, numero: r.numero_de_constancia, estaciones, nombreRuta: 'Ruta del contrato', celdas })}
    ${seccion('alertas', 'Resumen de alertas', '<div id="resumen-alertas"></div>')}
    ${seccion('datos', 'Datos clave del contrato', `<dl class="grilla-datos">
      <div class="campo ancho"><dt>Objeto</dt><dd>${esc(valor(r.objeto_del_contrato_a_la || r.detalle_del_objeto_a_contratar))}</dd></div>
      ${campo('Constancia', r.numero_de_constancia)}${campo('Número de proceso', r.numero_de_proceso)}${campo('Número de contrato', r.numero_de_contrato)}
      ${campo('Entidad', r.nombre_entidad)}${campo('NIT de la entidad', r.nit_de_la_entidad)}${campo('Orden / nivel', [r.orden_entidad, r.nivel_entidad].filter(Boolean).join(' · ') || undefined)}
      ${campo('Régimen de contratación', r.nombre_regimen_de_contratacion)}${campo('Modalidad', r.modalidad_de_contratacion)}${campo('Causal (otras formas)', r.causal_de_otras_formas_de)}
      ${campo('Tipo de contrato', r.tipo_de_contrato)}${campo('Estado', r.estado_del_proceso)}${campo('Contratista', r.nom_razon_social_contratista)}
      ${campo('Identificación del contratista', r.identificacion_del_contratista)}${campo('Cuantía del proceso', r.cuantia_proceso, fmtCOP)}${campo('Cuantía del contrato', r.cuantia_contrato, fmtCOP)}
      ${campo('Valor total de adiciones', r.valor_total_de_adiciones, fmtCOP)}${campo('Valor con adiciones', r.valor_contrato_con_adiciones, fmtCOP)}${campo('Proponentes seleccionados', r.proponentes_seleccionados)}
      ${campo('Firma', r.fecha_de_firma_del_contrato, fmtFecha)}${campo('Inicio de ejecución', r.fecha_ini_ejec_contrato, fmtFecha)}${campo('Fin de ejecución', r.fecha_fin_ejec_contrato, fmtFecha)}
      ${campo('Plazo', r.plazo_de_ejec_del_contrato ? `${r.plazo_de_ejec_del_contrato} ${r.rango_de_ejec_del_contrato || ''}` : undefined)}
      ${campo('Adiciones en tiempo (días)', r.tiempo_adiciones_en_dias)}${campo('Adiciones en tiempo (meses)', r.tiempo_adiciones_en_meses)}
      ${campo('Liquidación', r.fecha_liquidacion, fmtFecha)}${campo('Rubro', r.nombre_rubro)}${campo('Código BPIN', r.codigo_bpin)}
    </dl>`, fuenteChip(base))}
    ${seccion('tiempo', 'Línea de tiempo', lineaDeTiempo([
      { fecha: r.fecha_de_cargue_en_el_secop, titulo: 'Cargue en SECOP I', fuente: 'f789-7hwg', tipo: 'pre' },
      { fecha: r.fecha_de_firma_del_contrato, titulo: 'Firma del contrato', detalle: fmtCOP(r.cuantia_contrato), fuente: 'f789-7hwg' },
      { fecha: r.fecha_ini_ejec_contrato, titulo: 'Inicio de ejecución', fuente: 'f789-7hwg' },
      { fecha: r.fecha_fin_ejec_contrato, titulo: 'Fin de ejecución', fuente: 'f789-7hwg' },
      { fecha: r.fecha_liquidacion, titulo: 'Liquidación', fuente: 'f789-7hwg', tipo: 'post' },
    ]))}
    ${seccion('ejecucion', 'Análisis de ejecución', `<h4>Alertas de ejecución</h4>${alertasHtml(ejecucion)}
      <h4>Adiciones frente al valor inicial (tope del 50 %)</h4>${editor}`)}
    ${seccion('precontractual', 'Análisis precontractual', `
      ${checklist(`checklist:${r.uid}`, pre, { urlExpediente: url, justificacion: r.causal_de_otras_formas_de })}
      <h4>Contratos entre la entidad y el proveedor</h4>${tablaHistorial(hist, r.numero_de_constancia)}`)}
    ${seccion('ofertas', 'Proponentes', pendiente('Consultando los proponentes en SECOP I…'))}
    ${seccion('documentos', 'Documentos del expediente', pendiente('Consultando los documentos publicados en SECOP I…'))}
    ${seccionFuentes([base, hist])}
    ${AVISO_LEGAL}`;
  activarEditorAdiciones(raiz);
  activarChecklist(raiz);
  activarComunes(raiz);
  sincronizarResumenAdiciones(raiz, [{ id: 'plazoOfertas', ...pre.plazoOfertas }, pre.directaRepetida && { id: 'directaRepetida', ...pre.directaRepetida }, ...ejecucion]);
  if (r.numero_de_constancia) {
    cargarProponentesSecop1(raiz, r.numero_de_constancia, r.identificacion_del_contratista);
    cargarDocumentosSecop1(raiz, r.numero_de_constancia);
  }
}
