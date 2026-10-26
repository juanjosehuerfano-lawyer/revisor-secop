// Módulo 5: ayudas en lenguaje sencillo, con la norma citada.

import { esc } from '../util.js';
import { ETAPAS, MODALIDADES, TRANSVERSALES, ENLACES } from '../normas.js';

const normas = lista => `<p class="norma">Norma: ${lista.map(esc).join(' · ')}</p>`;

export function vistaAyudas(raiz) {
  raiz.innerHTML = `
    <section class="tarjeta"><h2>Ayudas</h2>
      <p>Explicaciones breves para orientar la revisión. Cada texto cita su norma. Las citas marcadas "verificar" deben confirmarse con el texto vigente antes de usarse en un concepto.</p>
      <nav class="indice"><a href="#ay-etapas">Etapas</a> · <a href="#ay-modalidades">Modalidades</a> · <a href="#ay-otros">Otros temas</a> · <a href="#ay-ids">Números en SECOP</a> · <a href="#ay-enlaces">Enlaces</a></nav>
    </section>
    <section class="tarjeta" id="ay-etapas"><h3>Etapas de la contratación</h3>
      ${ETAPAS.map(e => `<article class="ayuda"><h4>${esc(e.titulo)}</h4><p>${esc(e.texto)}</p>${normas(e.normas)}</article>`).join('')}
    </section>
    <section class="tarjeta" id="ay-modalidades"><h3>Modalidades de selección</h3>
      ${MODALIDADES.map(m => `<details class="ayuda"><summary>${esc(m.titulo)}</summary>
        <p><strong>Cuándo se usa:</strong> ${esc(m.cuando)}</p><p><strong>Pasos clave:</strong> ${esc(m.pasos)}</p>${normas(m.normas)}</details>`).join('')}
    </section>
    <section class="tarjeta" id="ay-otros"><h3>Otros temas</h3>
      ${TRANSVERSALES.map(t => `<article class="ayuda"><h4>${esc(t.titulo)}</h4><p>${esc(t.texto)}</p>${normas(t.normas)}</article>`).join('')}
    </section>
    <section class="tarjeta" id="ay-ids"><h3>Cómo leer los números de SECOP II</h3>
      <dl class="grilla-datos">
        <div class="campo"><dt>CO1.PCCNTR.…</dt><dd>Contrato. Con este número se consultan las modificaciones, las facturas y la ejecución.</dd></div>
        <div class="campo"><dt>CO1.BDOS.…</dt><dd>Proceso de compra (portafolio). Une el contrato con su proceso.</dd></div>
        <div class="campo"><dt>CO1.REQ.…</dt><dd>Procedimiento de selección.</dd></div>
        <div class="campo"><dt>CO1.NTC.…</dt><dd>Aviso público. Es el número que aparece en el enlace del SECOP (noticeUID).</dd></div>
        <div class="campo"><dt>26-12-1234567</dt><dd>Número de constancia de SECOP I.</dd></div>
      </dl>
    </section>
    <section class="tarjeta" id="ay-enlaces"><h3>Verificación manual</h3>
      <ul>${ENLACES.map(e => `<li><a href="${e.url}" target="_blank" rel="noopener">${esc(e.texto)}</a></li>`).join('')}</ul>
    </section>`;
  // El índice desplaza la página sin cambiar el hash, que usa el router.
  raiz.querySelector('.indice').addEventListener('click', ev => {
    const a = ev.target.closest('a');
    if (!a) return;
    ev.preventDefault();
    raiz.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
  });
}
