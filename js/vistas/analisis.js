// Componentes de análisis reutilizados por las fichas: regla del 50 %, checklist precontractual y línea de tiempo.

import { esc, valor, fmtCOP, fmtNum, fmtFecha, fechaISO, num, almacen, NR } from '../util.js';
import { evaluarAdiciones, evaluarPlazoOfertas, evaluarProponenteUnico, evaluarDirectaRepetida } from '../reglas.js';
import { CHECKLIST } from '../normas.js';
import { alertaHtml, tabla } from './comun.js';

// ---------- Línea de tiempo ----------

export function lineaDeTiempo(eventos) {
  const conFecha = eventos.filter(e => fechaISO(e.fecha)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  if (!conFecha.length) return '<p class="nr">SECOP no reporta fechas para construir la línea de tiempo.</p>';
  return `<ol class="linea-tiempo">${conFecha.map(e => `
    <li class="lt-${e.tipo || 'contrato'}"><time datetime="${fechaISO(e.fecha)}">${fmtFecha(e.fecha)}</time>
      <div><strong>${esc(e.titulo)}</strong>${e.detalle ? `<span>${esc(e.detalle)}</span>` : ''}<small>Fuente: ${esc(e.fuente)}</small></div></li>`).join('')}</ol>`;
}

// ---------- Regla del 50 % de adiciones ----------

/**
 * Editor de adiciones. El conjunto de Adiciones de SECOP II no publica valores, así que el abogado los digita.
 * opciones: { clave, fechaInicial, candidatosInicial: [{etiqueta, valor}], valorInicialPorDefecto, adicionesPorDefecto }
 */
export function editorAdiciones(op) {
  const guardado = almacen.leer(op.clave);
  const estado = guardado || {
    valorInicial: op.valorInicialPorDefecto?.valor ?? '',
    origenInicial: op.valorInicialPorDefecto?.etiqueta ?? '',
    fechaInicial: fechaISO(op.fechaInicial) || '',
    adiciones: op.adicionesPorDefecto || [],
  };
  const html = `<div class="editor-adiciones" data-clave="${esc(op.clave)}">
    <p class="ayuda-campo">${esc(op.nota)}</p>
    <div class="grilla-form">
      <label>Valor inicial del contrato (COP)<input name="valorInicial" type="number" min="0" step="1" value="${esc(estado.valorInicial)}"></label>
      <label>Fecha de firma (año del SMMLV inicial)<input name="fechaInicial" type="date" value="${esc(estado.fechaInicial)}"></label>
    </div>
    <p class="origen-inicial ayuda-campo">${estado.origenInicial ? 'Origen del valor inicial: ' + esc(estado.origenInicial) : 'Digita el valor inicial del contrato firmado.'}</p>
    ${op.candidatosInicial?.length ? `<div class="candidatos">Valores reportados que puedes usar como referencia: ${op.candidatosInicial.map(c =>
      `<button type="button" class="chip" data-valor="${esc(c.valor)}" data-etiqueta="${esc(c.etiqueta)}">${esc(c.etiqueta)}: ${esc(fmtCOP(c.valor))}</button>`).join(' ')}</div>` : ''}
    <div class="tabla-scroll"><table class="tabla-adiciones"><thead><tr><th>Fecha</th><th>Valor de la adición (COP)</th><th>Descripción</th><th><span class="sr">Quitar</span></th></tr></thead>
      <tbody>${estado.adiciones.map(filaAdicion).join('')}</tbody></table></div>
    <button type="button" class="secundario agregar">+ Agregar adición</button>
    <div class="resultado-adiciones" aria-live="polite"></div>
  </div>`;
  return html;
}

function filaAdicion(a = {}) {
  return `<tr><td><input type="date" name="fecha" value="${esc(fechaISO(a.fecha) || '')}"></td>
    <td><input type="number" name="valor" min="0" step="1" value="${esc(a.valor ?? '')}" placeholder="Tomar del documento"></td>
    <td><input type="text" name="descripcion" value="${esc(a.descripcion || '')}"></td>
    <td><button type="button" class="quitar secundario" aria-label="Quitar adición">×</button></td></tr>`;
}

export function activarEditorAdiciones(raiz) {
  const ed = raiz.querySelector('.editor-adiciones');
  if (!ed) return;
  const clave = ed.dataset.clave;
  const tbody = ed.querySelector('tbody');
  let origenInicial = almacen.leer(clave)?.origenInicial || ed.querySelector('.origen-inicial').textContent.replace('Origen del valor inicial: ', '');

  const leer = () => ({
    valorInicial: ed.querySelector('[name=valorInicial]').value,
    origenInicial,
    fechaInicial: ed.querySelector('[name=fechaInicial]').value,
    adiciones: [...tbody.querySelectorAll('tr')].map(tr => ({
      fecha: tr.querySelector('[name=fecha]').value,
      valor: tr.querySelector('[name=valor]').value,
      descripcion: tr.querySelector('[name=descripcion]').value,
    })),
  });

  const recalcular = (guardar = true) => {
    const e = leer();
    if (guardar) almacen.guardar(clave, e);
    const r = evaluarAdiciones({
      valorInicial: num(e.valorInicial), fechaInicial: e.fechaInicial,
      adiciones: e.adiciones.map(a => ({ valor: num(a.valor), fecha: a.fecha })),
    });
    ed.querySelector('.resultado-adiciones').innerHTML = alertaHtml('adiciones50', r, detalleAdiciones(r));
    ed.querySelector('.origen-inicial').textContent = origenInicial ? 'Origen del valor inicial: ' + origenInicial : 'Digita el valor inicial del contrato firmado.';
  };

  ed.addEventListener('input', ev => {
    if (ev.target.name === 'valorInicial') origenInicial = 'digitado por el abogado';
    recalcular();
  });
  ed.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.classList.contains('agregar')) { tbody.insertAdjacentHTML('beforeend', filaAdicion()); recalcular(); }
    if (b.classList.contains('quitar')) { b.closest('tr').remove(); recalcular(); }
    if (b.classList.contains('chip')) {
      ed.querySelector('[name=valorInicial]').value = b.dataset.valor;
      origenInicial = b.dataset.etiqueta;
      recalcular();
    }
  });
  recalcular(false);
}

export function detalleAdiciones(r) {
  if (r.nivel === 'sin_datos') return esc(r.motivo);
  const partes = [];
  if (r.numeroAdiciones === 0) partes.push('No hay adiciones con valor digitado. Si SECOP muestra adiciones en valor, toma el monto de cada documento de modificación.');
  partes.push(`Total adiciones: <strong>${fmtCOP(r.totalPesos)}</strong>, que equivale al <strong>${fmtNum(r.pctPesos, ' %')}</strong> del valor inicial en pesos.`);
  if (r.enSmmlv) {
    partes.push(`En SMMLV: valor inicial ${fmtNum(r.inicialSmmlv)} SMMLV; adiciones ${fmtNum(r.totalSmmlv)} SMMLV, es decir, el <strong>${fmtNum(r.pctSmmlv, ' %')}</strong>. Este es el cálculo que exige la norma.`);
  } else {
    partes.push(`No se pudo expresar en SMMLV porque falta: ${esc(r.faltantes.join(', '))}. Se usa el porcentaje en pesos.`);
  }
  if (r.nivel === 'alta') partes.push('<strong>Las adiciones superan el 50 % del valor inicial.</strong>');
  if (r.nivel === 'media') partes.push('Las adiciones están cerca del tope del 50 %.');
  return partes.join(' ');
}

// ---------- Análisis precontractual ----------

export function evaluarPrecontractual({ modalidad, fechaPublicacion, fechaCierre, numeroOferentes, campoOferentes, historial, fechaFirma }) {
  const res = {};
  const plazo = evaluarPlazoOfertas({ modalidad, fechaPublicacion: fechaISO(fechaPublicacion), fechaCierre: fechaISO(fechaCierre) });
  res.plazoOfertas = {
    r: plazo,
    detalle: plazo.habiles !== undefined
      ? `Entre la publicación (${fmtFecha(fechaPublicacion)}) y el cierre de ofertas (${fmtFecha(fechaCierre)}) hay <strong>${plazo.habiles} días hábiles</strong>. El mínimo para esta modalidad es ${plazo.minimo}.`
      : esc(plazo.motivo || ''),
  };
  if (historial !== undefined) {
    const d = evaluarDirectaRepetida(historial, { fechaReferencia: fechaISO(fechaFirma) });
    res.directaRepetida = {
      r: d,
      detalle: d.cantidad !== undefined
        ? `La entidad firmó <strong>${d.cantidad}</strong> contrato(s) por contratación directa con este proveedor en los ${d.ventanaMeses} meses anteriores a la firma (umbral: ${d.umbral}).`
        : esc(d.motivo),
    };
  }
  const p = evaluarProponenteUnico({ modalidad, numeroOferentes });
  res.proponenteUnico = {
    r: p,
    detalle: p.numeroOferentes !== undefined
      ? `SECOP reporta <strong>${p.numeroOferentes}</strong> oferente(s) (campo: ${esc(campoOferentes)}).${p.motivo ? ' ' + esc(p.motivo) : ''}`
      : p.nivel === 'sin_datos' ? 'SECOP no reporta el número de oferentes.' : esc(p.motivo),
  };
  return res;
}

const ESTADOS_CHECK = [['', 'Pendiente'], ['cumple', 'Cumple'], ['no_cumple', 'No cumple / observación'], ['no_aplica', 'No aplica']];

export function checklist(clave, auto, { urlExpediente, justificacion } = {}) {
  const guardado = almacen.leer(clave, {});
  return `<div class="checklist" data-clave="${esc(clave)}">
    ${CHECKLIST.map(item => {
      const g = guardado[item.id] || {};
      const a = item.auto && auto[item.auto];
      return `<details class="check-item" ${a && ['alta', 'media'].includes(a.r.nivel) ? 'open' : ''}>
        <summary><span class="check-estado e-${g.estado || 'pendiente'}">${esc(ESTADOS_CHECK.find(e => e[0] === (g.estado || ''))[1])}</span> ${esc(item.titulo)}</summary>
        <p>${esc(item.ayuda)}</p>
        <p class="norma">Norma: ${esc(item.norma)}</p>
        ${item.campo ? `<p>Justificación de la modalidad según SECOP: <strong>${esc(valor(justificacion))}</strong></p>` : ''}
        ${a ? alertaHtml(item.auto, a.r, a.detalle) : ''}
        ${urlExpediente ? `<p><a href="${esc(urlExpediente)}" target="_blank" rel="noopener">Revisar en el expediente SECOP</a></p>` : ''}
        <div class="grilla-form">
          <label>Resultado de la revisión<select name="estado" data-item="${item.id}">${ESTADOS_CHECK.map(([v, t]) => `<option value="${v}"${v === (g.estado || '') ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="ancho">Notas<textarea name="nota" data-item="${item.id}" rows="2">${esc(g.nota || '')}</textarea></label>
        </div>
      </details>`;
    }).join('')}
  </div>`;
}

export function activarChecklist(raiz) {
  const cl = raiz.querySelector('.checklist');
  if (!cl) return;
  const clave = cl.dataset.clave;
  cl.addEventListener('input', ev => {
    const id = ev.target.dataset.item;
    if (!id) return;
    const g = almacen.leer(clave, {});
    g[id] = { ...(g[id] || {}), [ev.target.name]: ev.target.value };
    almacen.guardar(clave, g);
    if (ev.target.name === 'estado') {
      const chip = ev.target.closest('details').querySelector('.check-estado');
      chip.className = `check-estado e-${ev.target.value || 'pendiente'}`;
      chip.textContent = ESTADOS_CHECK.find(e => e[0] === ev.target.value)[1];
    }
  });
}

export function resumenAlertas(items) {
  const relevantes = items.filter(x => x && ['alta', 'media'].includes(x.r.nivel));
  if (!relevantes.length) return '<p class="sin-alertas">Las reglas automáticas no encontraron alertas con los datos disponibles. Revisa el checklist: varias verificaciones requieren el expediente.</p>';
  return relevantes.map(x => alertaHtml(x.id, x.r, x.detalle)).join('');
}

// ---------- Tablas de ejecución ----------

export function tablaFacturas(filas) {
  const total = filas.reduce((s, f) => s + (num(f.valor_total) || 0), 0);
  const pagadas = filas.filter(f => f.pago_confirmado === true || /pagad/i.test(f.estado || ''));
  const totalPagado = pagadas.reduce((s, f) => s + (num(f.valor_total) || 0), 0);
  const resumen = filas.length
    ? `<p>${filas.length} factura(s) por <strong>${fmtCOP(total)}</strong>. Pagadas o con pago confirmado: ${pagadas.length}, por <strong>${fmtCOP(totalPagado)}</strong>.</p>`
    : '';
  return resumen + tabla(['N.º', 'Fecha', 'Valor total', 'Valor a pagar', 'Estado', 'Pago confirmado'],
    filas.map(f => [esc(valor(f.numero_de_factura)), fmtFecha(f.fecha_factura), fmtCOP(f.valor_total), fmtCOP(f.valor_a_pagar), esc(valor(f.estado)), f.pago_confirmado === undefined ? NR : (f.pago_confirmado ? 'Sí' : 'No')]));
}

export function tablaModificaciones(filas) {
  const conteo = {};
  filas.forEach(f => { conteo[f.tipo || NR] = (conteo[f.tipo || NR] || 0) + 1; });
  const resumen = filas.length ? `<p class="conteo-mods">${Object.entries(conteo).map(([t, n]) => `<span class="etiqueta">${esc(t)}: ${n}</span>`).join(' ')}</p>` : '';
  return resumen + tabla(['Fecha de registro', 'Tipo', 'Descripción', 'Identificador'],
    filas.map(f => [fmtFecha(f.fecharegistro), esc(valor(f.tipo)), esc(valor(f.descripcion)), `<code>${esc(valor(f.identificador))}</code>`]));
}

export function tablaEjecucion(filas) {
  return tabla(['Plan / entrega', 'Tipo', 'Entrega esperada', 'Entrega real', '% esperado', '% real', 'Estado'],
    filas.map(f => [esc(valor(f.nombreplan)), esc(valor(f.tipoejecucion)), fmtFecha(f.fechadeentregaesperada), fmtFecha(f.fechadeentregareal),
      fmtNum(f.porcentajedeavanceesperado, ' %'), fmtNum(f.porcentaje_de_avance_real, ' %'), esc(valor(f.estado_del_contrato))]));
}
