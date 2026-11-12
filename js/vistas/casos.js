// Casos: contratos, procesos, entidades y proveedores que el abogado sigue, con sus notas.
// Se guardan solo en este navegador (clave "casos"); la copia de seguridad está en Ajustes.

import { esc, almacen, fmtFecha } from '../util.js';

const CLAVE = 'casos';
const leer = () => { const l = almacen.leer(CLAVE, []); return Array.isArray(l) ? l : []; };
// La ruta viene del almacenamiento o de una copia restaurada: solo se enlazan rutas internas de la app.
const rutaSegura = c => String(c.ruta || '').startsWith('#/') ? c.ruta : '#/casos';
const textoBoton = guardado => guardado ? '★ En mis casos' : '☆ Guardar en mis casos';

function guardar(lista) {
  const ok = almacen.guardar(CLAVE, lista);
  if (!ok) alert('No se pudo guardar: el navegador no permite almacenar datos (modo privado o espacio lleno).');
  return ok;
}

// caso: { ruta: '#/contrato/…', tipo: 'Contrato · SECOP II', titulo, detalle }
export function botonSeguir(caso) {
  const guardado = leer().some(c => c.ruta === caso.ruta);
  return `<button type="button" class="secundario seguir" aria-pressed="${guardado}" data-caso="${esc(JSON.stringify(caso))}">${textoBoton(guardado)}</button>`;
}

export function activarSeguir(raiz) {
  raiz.querySelectorAll('.seguir').forEach(b => b.addEventListener('click', () => {
    const caso = JSON.parse(b.dataset.caso);
    const lista = leer();
    const i = lista.findIndex(c => c.ruta === caso.ruta);
    if (i >= 0) {
      if (lista[i].nota && !confirm('Este caso tiene notas. ¿Quitarlo de Mis casos y borrar las notas?')) return;
      lista.splice(i, 1);
    } else {
      lista.unshift({ ...caso, nota: '', creado: new Date().toISOString().slice(0, 10) });
    }
    if (!guardar(lista)) return;
    b.setAttribute('aria-pressed', String(i < 0));
    b.textContent = textoBoton(i < 0);
  }));
}

export function vistaCasos(raiz) {
  const pintar = () => {
    const lista = leer();
    raiz.innerHTML = `
      <section class="tarjeta"><h2>Mis casos</h2>
        <p>Contratos, procesos, entidades y proveedores que guardaste para hacerles seguimiento. Los casos y sus notas se guardan solo en este navegador:
          haz una copia de seguridad en <a href="#/ajustes">Ajustes</a>.</p></section>
      ${lista.length ? `<div class="lista-resultados">${lista.map((c, i) => `<article class="resultado caso">
        <div class="res-meta"><span class="etiqueta">${esc(c.tipo)}</span><span>Guardado el ${fmtFecha(c.creado)}</span></div>
        <h3><a href="${esc(rutaSegura(c))}">${esc(c.titulo)}</a></h3>
        <p class="res-entidad">${esc(c.detalle)}</p>
        <label>Notas<textarea rows="3" data-nota="${i}">${esc(c.nota)}</textarea></label>
        <div class="acciones no-imprimir"><a class="boton" href="${esc(rutaSegura(c))}">Abrir</a><button type="button" class="secundario" data-quitar="${i}">Quitar</button></div>
      </article>`).join('')}</div>`
        : `<div class="tarjeta"><p>Aún no has guardado casos. Abre un contrato, un proceso o una veeduría y usa el botón <strong>☆ Guardar en mis casos</strong>.</p></div>`}`;
  };
  pintar();
  raiz.addEventListener('input', ev => {
    const i = ev.target.dataset.nota;
    if (i === undefined) return;
    const lista = leer();
    if (lista[i]) { lista[i].nota = ev.target.value; guardar(lista); }
  });
  raiz.addEventListener('click', ev => {
    const i = ev.target.dataset.quitar;
    if (i === undefined) return;
    const lista = leer();
    if (lista[i]?.nota && !confirm('Este caso tiene notas. ¿Quitarlo y borrar las notas?')) return;
    lista.splice(i, 1);
    if (guardar(lista)) pintar();
  });
}
