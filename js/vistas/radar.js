// Radar Público: página "Cómo leerlo", con las alertas explicadas en lenguaje sencillo para la ciudadanía.
// Las normas se toman de js/normas.js para que las dos apps citen lo mismo.

import { esc } from '../util.js';
import { banda, seccion, senal } from './comun.js';
import { REGLAS } from '../normas.js';

const ALERTAS = [
  ['directaEntidad', 'La entidad le hizo 3 o más contratos directos (sin competencia) al mismo contratista en un periodo de 12 meses.',
    'La ley prefiere que los contratistas compitan. La contratación directa solo procede en los casos que la ley enumera, y la entidad debe justificarla por escrito.',
    'Abra cada contrato en SECOP y busque el "acto administrativo de justificación de la contratación directa". Revise si la causal que invoca corresponde al objeto del contrato.'],
  ['fraccionamiento', 'Varios contratos con el mismo contratista, cada uno por debajo del tope de mínima cuantía de la entidad, firmados en pocos días, que juntos lo superan.',
    'Partir una misma necesidad en contratos pequeños puede servir para evitar una modalidad con más competencia y controles.',
    'Compare los objetos: ¿era en realidad una sola compra? Revise el Plan Anual de Adquisiciones de la entidad y los estudios previos de cada contrato. El tope de cuantía se puede ajustar en la página.'],
  ['proponenteUnico', 'En procesos que debían tener competencia (licitación, selección abreviada, concurso, mínima cuantía) se presentó un solo oferente.',
    'Un solo oferente puede ser normal en mercados pequeños, pero también puede indicar requisitos hechos a la medida de alguien.',
    'En el proceso en SECOP revise los requisitos habilitantes (experiencia, indicadores financieros), las observaciones de otros interesados y las adendas.'],
  ['inicioAntesFirma', 'SECOP reporta que el contrato empezó a ejecutarse antes del día en que se firmó.',
    'Un contrato no se puede ejecutar antes de perfeccionarse y de cumplir los requisitos de ejecución. Muchas veces es solo un error al registrar las fechas.',
    'Abra el contrato en SECOP y compare la fecha de firma con el acta de inicio.'],
];

export function vistaComoLeer(raiz) {
  const tarjetas = ALERTAS.map(([id, que, porque, verificar]) => {
    const r = REGLAS.find(x => x.id === id);
    return `<article class="alerta n-media">${senal('media')}
      <div><h4>${esc(r.titulo)}</h4>
        <p><b>Qué muestra:</b> ${esc(que)}</p>
        <p><b>Por qué importa:</b> ${esc(porque)}</p>
        <p><b>Cómo verificarla:</b> ${esc(verificar)}</p></div>
      <aside class="nota"><b>Norma</b>${esc(r.norma)}</aside>
    </article>`;
  }).join('');

  raiz.innerHTML = `
    ${banda({ titulo: 'Cómo leer el Radar', meta: 'Qué significa cada alerta, por qué importa y cómo verificarla usted mismo en SECOP.' })}
    ${seccion('c-que', 'Qué es una alerta', `<p>Radar Público es un mecanismo informativo. Una alerta señala un dato del SECOP que <strong>puede</strong> indicar una irregularidad o una mala práctica de contratación.
      <strong>No es un hallazgo, ni un juicio, ni afirma que alguien violó la ley.</strong> Los datos pueden estar mal registrados, y casi todo tiene explicaciones posibles.
      Por eso cada alerta trae la norma relacionada y el enlace para verificar en el expediente del SECOP.</p>
      <p>Los niveles se distinguen por la forma de la señal: <span class="nivel-ej">${senal('media')} Revisar</span> <span class="nivel-ej">${senal('ok')} Sin alerta</span> <span class="nivel-ej">${senal('sin_datos')} Sin datos suficientes</span></p>`)}
    ${seccion('c-alertas', 'Las alertas', tarjetas + `<p class="norma">Además, la página muestra cifras sin calificar: contratación por modalidad, concentración en pocos contratistas y contratos que SECOP publica con valores distintos.
      La licitación pública es la regla general (Ley 1150 de 2007, art. 2): una proporción alta de contratación directa no es ilegal por sí misma, pero orienta la revisión.</p>`)}
    ${seccion('c-hacer', 'Si encuentra algo que le preocupa', `<ol>
      <li>Verifique el contrato en SECOP: el enlace "Ver en SECOP" de cada contrato abre el expediente. El número del contrato abre su ficha detallada en Radar Contractual.</li>
      <li>Pida información a la entidad con un derecho de petición (Ley 1755 de 2015). La información de la contratación pública es pública (Ley 1712 de 2014).</li>
      <li>Si quiere hacer seguimiento organizado, puede conformar una veeduría ciudadana (Ley 850 de 2003).</li>
      <li>Si después de verificar persiste la duda, puede ponerla en conocimiento de la Personería, la Contraloría o la Procuraduría.</li>
    </ol>`)}
    ${seccion('c-datos', 'De dónde salen los datos', `<p>De los datos abiertos de Colombia Compra Eficiente en <a href="https://www.datos.gov.co" target="_blank" rel="noopener">datos.gov.co</a>: SECOP Integrado (SECOP I y II) y SECOP II.
      Cada página dice qué conjunto consultó, la consulta exacta y la hora. Las entidades de régimen especial o que no publicaron en SECOP no aparecen. Radar Público no es asesoría legal.</p>`)}`;
}
