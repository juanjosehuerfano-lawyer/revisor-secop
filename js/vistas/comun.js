// Piezas de interfaz compartidas por las vistas: franja del título, ruta, tablero de cifras, señales y alertas anotadas.

import { esc, almacen, fmtFecha, fechaISO, NR } from '../util.js';
import { REGLAS } from '../normas.js';

// Lupa Contractual Ciudadana (radar/) es la app para la ciudadanía: comparte estas vistas con Radar Contractual.
// lupa.juanjosehuerfanocorredor.com sirve radar/ en la raíz (ver worker.js).
export const EN_RADAR = location.pathname.includes('/radar/') || location.hostname.startsWith('lupa.');

/** Router por hash de las dos apps. rutas: [[regex, (raiz, match, params) => void, pestaña]]. */
export function arrancar(rutas, porDefecto) {
  function navegar() {
    const [ruta, query = ''] = (location.hash.slice(1) || porDefecto).split('?');
    const params = new URLSearchParams(query);
    // Cada vista recibe un contenedor nuevo para no acumular listeners.
    const viejo = document.getElementById('vista');
    const raiz = viejo.cloneNode(false);
    viejo.replaceWith(raiz);
    for (const [re, fn, tab] of rutas) {
      const m = ruta.match(re);
      if (m) {
        document.querySelectorAll('[data-tab]').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
        fn(raiz, m, params);
        window.scrollTo(0, 0);
        return;
      }
    }
    location.hash = '#' + porDefecto;
  }
  window.addEventListener('hashchange', navegar);
  navegar();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* la app funciona sin service worker */ });
  }
}

const ETIQUETAS = {
  alta: 'Alerta', media: 'Revisar', ok: 'Sin alerta', info: 'Información', sin_datos: 'Sin datos suficientes',
};

export function cargando(texto = 'Consultando datos.gov.co…') {
  return `<div class="cargando" role="status"><p>${esc(texto)}</p><span class="hueso"></span><span class="hueso"></span><span class="hueso corto"></span></div>`;
}

export function errorHtml(e) {
  const enlace = e?.url ? ` <a href="${esc(e.url)}" target="_blank" rel="noopener">Abrir la consulta</a>` : '';
  return `<div class="aviso aviso-error" role="alert"><strong>No se pudo consultar.</strong> ${esc(e?.message || e)}${enlace}</div>`;
}

// Franja azul con el título de la vista. `titulo`, `meta`, `acciones` y `extra` son HTML: quien llama escapa los datos.
export function banda({ titulo, meta = '', acciones = '', extra = '' }) {
  return `<header class="cielo"><div class="cielo-cab"><div><h2>${titulo}</h2>${meta ? `<p class="cielo-meta">${meta}</p>` : ''}</div>
    ${acciones ? `<div class="acciones no-imprimir">${acciones}</div>` : ''}</div>${extra}</header>`;
}

// Señales por forma: el nivel se distingue sin depender del color (octágono, rombo, círculo, cuadrado, círculo punteado).
const FORMA = {
  alta: '<path class="s-forma" d="M8 1.5h8L22.5 8v8L16 22.5H8L1.5 16V8z"/>',
  media: '<path class="s-forma" d="M12 1.4 22.6 12 12 22.6 1.4 12z"/>',
  ok: '<circle class="s-forma" cx="12" cy="12" r="10.6"/>',
  info: '<rect class="s-forma" x="1.8" y="1.8" width="20.4" height="20.4" rx="2"/>',
  sin_datos: '<circle class="s-forma" cx="12" cy="12" r="10.2"/>',
};
const SIMBOLO = {
  alta: '<path class="s-simbolo" d="M12 6.6v7M12 17.1v.2"/>',
  media: '<path class="s-simbolo" d="M9.7 9.7a2.4 2.4 0 1 1 3.5 2.1c-.8.5-1.2 1-1.2 1.9M12 16.9v.2"/>',
  ok: '<path class="s-simbolo" d="m7.6 12.4 3 3 5.8-6.2"/>',
  info: '<path class="s-simbolo" d="M12 11v6.2M12 7.3v.2"/>',
  sin_datos: '<path class="s-simbolo" d="M8.4 12h7.2"/>',
};

export function senal(nivel) {
  const n = FORMA[nivel] ? nivel : 'info';
  return `<svg class="senal s-${n}" viewBox="0 0 24 24" aria-hidden="true">${FORMA[n]}${SIMBOLO[n]}</svg>`;
}

// Alerta anotada: señal, resultado de la regla y, al margen, el nivel, la norma y el aviso de que es informativa.
export function alertaHtml(idRegla, resultado, detalle) {
  const r = REGLAS.find(x => x.id === idRegla);
  const nivel = ETIQUETAS[resultado.nivel] || resultado.nivel;
  return `<article class="alerta n-${resultado.nivel}">${senal(resultado.nivel)}
    <div><h4><span class="sr">${nivel}: </span>${esc(r.titulo)}</h4><p>${detalle}</p></div>
    <aside class="nota"><b>${nivel}</b>${esc(r.norma)}<span class="validacion">${'Alerta informativa: no es un hallazgo ni un juicio. Verifíquela en SECOP.'}</span></aside>
  </article>`;
}

// Sección numerada (§ 1, § 2…); la numeración la pone la hoja de estilos.
export function seccion(id, titulo, cuerpo, fuentes = '') {
  return `<section class="seccion" id="${id}"><h3>${esc(titulo)}</h3>${cuerpo}${fuentes}</section>`;
}

export function tabla(columnas, filas) {
  if (!filas.length) return '<p class="nr">SECOP no reporta registros.</p>';
  return `<div class="tabla-scroll"><table><thead><tr>${columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${filas.map(f => `<tr>${f.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Tablero de cifras. celdas: [{ etiqueta, valor, nota }], con `valor` ya formateado (fmtCOP, valor…).
export function tablero(celdas) {
  return `<dl class="tablero">${celdas.map(c => `<div><dt>${esc(c.etiqueta)}</dt>
    <dd${c.valor === NR ? ' class="nr"' : ''}>${esc(c.valor)}${c.nota ? ` <small>${esc(c.nota)}</small>` : ''}</dd></div>`).join('')}</dl>`;
}

// Estación con fecha: si SECOP no la reporta, queda punteada y lo dice.
export function estacion(titulo, fecha, extra = {}) {
  return { titulo, detalle: fmtFecha(fecha), estado: fechaISO(fecha) ? '' : 'pend', ...extra };
}

/**
 * Ruta: estaciones en orden. Cada una: { titulo, detalle, etapa, tramo, estado, ir }.
 * etapa: rótulo en la primera estación de cada etapa. tramo: color del tramo que sale de ella (pre, eje, alta, media, ok, neutra).
 * estado: '', alta, media, ok, pico, pend o menor. ir: id de la sección que la explica.
 */
export function ruta(estaciones, etiqueta) {
  return `<ol class="ruta" aria-label="${esc(etiqueta)}">${estaciones.map(e => {
    const texto = `<b>${esc(e.titulo)}</b>${e.detalle ? `<small>${esc(e.detalle)}</small>` : ''}`;
    return `<li class="estacion t-${e.tramo || 'neutra'}${e.estado ? ' e-' + e.estado : ''}"><span class="ruta-etapa">${esc(e.etapa || '')}</span><span class="punto" aria-hidden="true"></span>
      ${e.ir ? `<button type="button" class="est-texto" data-ir="${esc(e.ir)}">${texto}</button>` : `<div class="est-texto">${texto}</div>`}</li>`;
  }).join('')}</ol>`;
}

// Tocar una estación lleva a su sección y la resalta un momento.
export function activarRuta(raiz) {
  raiz.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => {
    const destino = raiz.querySelector('#' + CSS.escape(b.dataset.ir));
    if (!destino) return;
    destino.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    destino.classList.remove('destello');
    void destino.offsetWidth; // reinicia la animación si se toca dos veces
    destino.classList.add('destello');
  }));
}

// Ruta pequeña de una fila de resultados: de `inicio` a `fin`, con el avance a hoy. Sin las dos fechas no se dibuja.
export function miniRuta(inicio, fin, textos = { antes: 'Inicia el', durante: 'En plazo hasta el', despues: 'Plazo terminado el' }) {
  const i = fechaISO(inicio), f = fechaISO(fin);
  if (!i || !f || f < i) return '';
  const hoy = new Date().toISOString().slice(0, 10);
  const dia = iso => Date.parse(iso + 'T00:00:00Z');
  const avance = hoy <= i ? 0 : hoy >= f ? 100 : Math.round(((dia(hoy) - dia(i)) / (dia(f) - dia(i))) * 100);
  const texto = hoy < i ? `${textos.antes} ${fmtFecha(i)}` : hoy > f ? `${textos.despues} ${fmtFecha(f)}` : `${textos.durante} ${fmtFecha(f)}`;
  return `<p class="mini-ruta"><span class="mini-pista${avance === 100 ? ' fin' : ''}" aria-hidden="true"><i style="width:${avance}%"></i></span>${esc(texto)}</p>`;
}

export const ICONO_GUARDAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
