// Pestaña Reglas (validación jurídica de cada regla) y Ajustes (token y caché).

import { esc, almacen, fmtCOP, fmtFecha, descargar } from '../util.js';
import { REGLAS } from '../normas.js';
import { SMMLV } from '../smmlv.js';
import { limpiarCache } from '../api.js';
import { estadoValidacion, banda } from './comun.js';

export function vistaReglas(raiz) {
  const pintar = () => {
    const val = almacen.leer('validaciones', {});
    raiz.innerHTML = `
      ${banda({ titulo: 'Reglas de alerta', meta: 'Cada regla queda pendiente hasta que la valides. Al validarla, la fecha aparece en todas las alertas de esa regla. La validación se guarda solo en este navegador.' })}
      ${REGLAS.map(r => `<section class="seccion regla">
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
      <section class="seccion"><h3>Tabla de SMMLV usada</h3>
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

// Lo que el abogado escribe en la app. El token y la caché no entran en la copia de seguridad.
const CLAVES_RESPALDO = /^(casos$|validaciones$|checklist:|adiciones:|fracc:)/;

function crearRespaldo() {
  const datos = {};
  try {
    Object.keys(localStorage).filter(k => CLAVES_RESPALDO.test(k)).forEach(k => { datos[k] = almacen.leer(k); });
  } catch { /* sin almacenamiento: la copia sale vacía */ }
  return { app: 'revisor-secop', version: 1, fecha: new Date().toISOString(), datos };
}

// Restaura solo claves conocidas de un archivo creado por esta app. Devuelve cuántas guardó.
function restaurarRespaldo(texto) {
  let r;
  try { r = JSON.parse(texto); } catch { throw new Error('El archivo no es una copia de seguridad válida.'); }
  if (r?.app !== 'revisor-secop' || typeof r.datos !== 'object' || r.datos === null) throw new Error('El archivo no es una copia de seguridad de Revisor SECOP.');
  const claves = Object.keys(r.datos).filter(k => CLAVES_RESPALDO.test(k));
  if (!claves.length) throw new Error('La copia de seguridad está vacía.');
  if (!confirm(`Se restaurarán ${claves.length} elemento(s). Reemplazan los datos guardados con el mismo nombre (por ejemplo, tu lista de casos). ¿Continuar?`)) return 0;
  return claves.filter(k => almacen.guardar(k, r.datos[k])).length;
}

export function vistaAjustes(raiz) {
  const aj = almacen.leer('ajustes', {});
  raiz.innerHTML = `
    ${banda({ titulo: 'Ajustes', meta: 'Token de datos.gov.co, caché de consultas y copia de seguridad de tus datos.' })}
    <section class="tarjeta">
      <form id="form-ajustes">
        <label class="ancho">Token de aplicación de datos.gov.co (opcional)
          <input name="token" value="${esc(aj.token || '')}" autocomplete="off" spellcheck="false"></label>
        <p class="ayuda-campo">Sin token, la API funciona con una cuota menor. Puedes crear uno gratis en tu perfil de datos.gov.co, en Developer Settings. Se guarda solo en este navegador.</p>
        <div class="acciones"><button type="submit">Guardar</button></div>
      </form>
    </section>
    <section class="seccion"><h3>Caché de consultas</h3>
      <p>Las consultas se guardan 6 horas para ahorrar cuota. Cada dato muestra la hora real en que se consultó.</p>
      <div class="acciones"><button type="button" class="secundario" id="limpiar">Vaciar caché</button></div>
      <p id="msg-cache" class="ayuda-campo" aria-live="polite"></p>
    </section>
    <section class="seccion"><h3>Datos guardados en este navegador</h3>
      <p>Tus casos y notas, las validaciones de reglas, los checklists, los valores de adiciones y los topes de fraccionamiento se guardan solo aquí. No salen de tu equipo.
        Si borras los datos del navegador o cambias de dispositivo, se pierden: descarga una copia de seguridad y restáurala cuando la necesites.</p>
      <div class="acciones">
        <button type="button" id="respaldar">Descargar copia de seguridad</button>
        <label class="boton secundario">Restaurar una copia<input type="file" id="restaurar" accept="application/json,.json" class="sr"></label>
      </div>
      <p id="msg-respaldo" class="ayuda-campo" aria-live="polite">La copia no incluye el token ni la caché de consultas.</p>
      <p class="ayuda-campo">Última revisión de esquemas de la API: ${fmtFecha('2026-10-25')}.</p>
    </section>`;
  raiz.querySelector('#form-ajustes').addEventListener('submit', ev => {
    ev.preventDefault();
    almacen.guardar('ajustes', { ...aj, token: ev.target.token.value.trim() });
    ev.target.querySelector('button').textContent = 'Guardado';
  });
  const msg = raiz.querySelector('#msg-respaldo');
  raiz.querySelector('#respaldar').addEventListener('click', () => {
    const r = crearRespaldo();
    descargar(`revisor-secop-copia-${r.fecha.slice(0, 10)}.json`, JSON.stringify(r, null, 1), 'application/json');
    msg.textContent = `Copia descargada con ${Object.keys(r.datos).length} elemento(s).`;
  });
  raiz.querySelector('#restaurar').addEventListener('change', async ev => {
    const archivo = ev.target.files[0];
    if (!archivo) return;
    try {
      const n = restaurarRespaldo(await archivo.text());
      msg.textContent = n ? `Se restauraron ${n} elemento(s).` : 'No se restauró nada.';
    } catch (e) {
      msg.textContent = e.message;
    }
    ev.target.value = '';
  });
  raiz.querySelector('#limpiar').addEventListener('click', () => {
    limpiarCache();
    raiz.querySelector('#msg-cache').textContent = 'Caché vaciada.';
  });
}
