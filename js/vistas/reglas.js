// Pestaña Reglas (validación jurídica de cada regla) y Ajustes (token y caché).

import { esc, almacen, fmtCOP, fmtFecha } from '../util.js';
import { REGLAS } from '../normas.js';
import { SMMLV } from '../smmlv.js';
import { limpiarCache } from '../api.js';
import { estadoValidacion } from './comun.js';

export function vistaReglas(raiz) {
  const pintar = () => {
    const val = almacen.leer('validaciones', {});
    raiz.innerHTML = `
      <section class="tarjeta"><h2>Reglas de alerta</h2>
        <p>Cada regla queda pendiente hasta que la valides. Al validarla, la fecha aparece en todas las alertas de esa regla. La validación se guarda solo en este navegador.</p></section>
      ${REGLAS.map(r => `<section class="tarjeta regla">
        <h3>${esc(r.titulo)}</h3>
        <p>${esc(r.texto)}</p>
        <dl class="grilla-datos">
          <div class="campo"><dt>Norma</dt><dd>${esc(r.norma)}</dd></div>
          <div class="campo"><dt>Cuándo se activa</dt><dd>${esc(r.umbral)}</dd></div>
          <div class="campo"><dt>Límites</dt><dd>${esc(r.limites)}</dd></div>
          <div class="campo"><dt>Estado</dt><dd>${esc(estadoValidacion(r.id))}</dd></div>
        </dl>
        <label class="ancho">Observación del abogado<textarea data-obs="${r.id}" rows="2">${esc(val[r.id]?.obs || '')}</textarea></label>
        <div class="acciones">${val[r.id]
          ? `<button type="button" class="secundario" data-quitar="${r.id}">Quitar validación</button>`
          : `<button type="button" data-validar="${r.id}">Marcar como validada</button>`}</div>
      </section>`).join('')}
      <section class="tarjeta"><h3>Tabla de SMMLV usada</h3>
        <p>Valores en pesos por año. Verifícalos contra los decretos del Gobierno. Para cambiarlos, edita <code>js/smmlv.js</code>.</p>
        <div class="tabla-scroll"><table><thead><tr><th>Año</th><th>SMMLV</th></tr></thead><tbody>
          ${Object.entries(SMMLV).reverse().map(([a, v]) => `<tr><td>${a}</td><td>${fmtCOP(v)}</td></tr>`).join('')}
        </tbody></table></div></section>`;
  };
  pintar();
  raiz.addEventListener('click', ev => {
    const val = almacen.leer('validaciones', {});
    const v = ev.target.dataset.validar, q = ev.target.dataset.quitar;
    if (v) { val[v] = { fecha: new Date().toISOString().slice(0, 10), obs: raiz.querySelector(`[data-obs="${v}"]`).value }; almacen.guardar('validaciones', val); pintar(); }
    if (q) { delete val[q]; almacen.guardar('validaciones', val); pintar(); }
  });
  raiz.addEventListener('input', ev => {
    const id = ev.target.dataset.obs;
    if (!id) return;
    const val = almacen.leer('validaciones', {});
    if (val[id]) { val[id].obs = ev.target.value; almacen.guardar('validaciones', val); }
  });
}

export function vistaAjustes(raiz) {
  const aj = almacen.leer('ajustes', {});
  raiz.innerHTML = `
    <section class="tarjeta"><h2>Ajustes</h2>
      <form id="form-ajustes">
        <label class="ancho">Token de aplicación de datos.gov.co (opcional)
          <input name="token" value="${esc(aj.token || '')}" autocomplete="off" spellcheck="false"></label>
        <p class="ayuda-campo">Sin token, la API funciona con una cuota menor. Puedes crear uno gratis en tu perfil de datos.gov.co, en Developer Settings. Se guarda solo en este navegador.</p>
        <div class="acciones"><button type="submit">Guardar</button></div>
      </form>
    </section>
    <section class="tarjeta"><h3>Caché de consultas</h3>
      <p>Las consultas se guardan 6 horas para ahorrar cuota. Cada dato muestra la hora real en que se consultó.</p>
      <div class="acciones"><button type="button" class="secundario" id="limpiar">Vaciar caché</button></div>
      <p id="msg-cache" class="ayuda-campo" aria-live="polite"></p>
    </section>
    <section class="tarjeta"><h3>Datos guardados en este navegador</h3>
      <p>Las validaciones de reglas, los checklists y los valores de adiciones que digitas se guardan solo aquí. No salen de tu equipo.</p>
      <p class="ayuda-campo">Última revisión de esquemas de la API: ${fmtFecha('2026-10-25')}.</p>
    </section>`;
  raiz.querySelector('#form-ajustes').addEventListener('submit', ev => {
    ev.preventDefault();
    almacen.guardar('ajustes', { ...aj, token: ev.target.token.value.trim() });
    ev.target.querySelector('button').textContent = 'Guardado';
  });
  raiz.querySelector('#limpiar').addEventListener('click', () => {
    limpiarCache();
    raiz.querySelector('#msg-cache').textContent = 'Caché vaciada.';
  });
}
