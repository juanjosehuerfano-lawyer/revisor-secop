// Reglas de alerta. Funciones puras, sin DOM ni red. Cada una tiene su prueba en tests/casos.js
// y su ficha jurídica (norma, umbral, estado de validación) en js/normas.js → REGLAS.
// Niveles: 'alta' (supera un límite legal), 'media' (indicio para revisar), 'ok', 'info', 'sin_datos'.

import { SMMLV } from './smmlv.js';
import { diasHabilesEntre } from './festivos.js';
import { normalizar } from './util.js';

export function claseModalidad(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  if (t.includes('regimen especial')) return 'especial';
  if (t.includes('directa')) return 'directa';
  if (t.includes('minima cuantia')) return 'minima';
  if (t.includes('licitacion')) return 'licitacion';
  if (t.includes('seleccion abreviada') || t.includes('subasta') || t.includes('acuerdo marco') || t.includes('menor cuantia')) return 'seleccion_abreviada';
  if (t.includes('concurso')) return 'concurso';
  return 'otra';
}

const COMPETITIVAS = new Set(['licitacion', 'seleccion_abreviada', 'concurso', 'minima']);

function anio(iso) { return iso ? Number(String(iso).slice(0, 4)) : null; }

/**
 * Ley 80 de 1993, art. 40, parágrafo: los contratos no pueden adicionarse en más del 50 % de su valor inicial,
 * expresado en SMMLV. El valor inicial se lleva a SMMLV del año de firma y cada adición a SMMLV del año en que se hizo.
 * Si falta una fecha o un año en la tabla, el cálculo en SMMLV no se hace y se usa el de pesos, avisándolo.
 */
export function evaluarAdiciones({ valorInicial, fechaInicial, adiciones = [] }, tabla = SMMLV) {
  const inicial = Number(valorInicial);
  if (!Number.isFinite(inicial) || inicial <= 0) {
    return { nivel: 'sin_datos', motivo: 'Falta el valor inicial del contrato.' };
  }
  const validas = adiciones.filter(a => Number.isFinite(Number(a.valor)) && Number(a.valor) > 0);
  const totalPesos = validas.reduce((s, a) => s + Number(a.valor), 0);
  const pctPesos = (totalPesos / inicial) * 100;

  const faltantes = [];
  const smmlvInicial = tabla[anio(fechaInicial)];
  if (!smmlvInicial) faltantes.push(fechaInicial ? `SMMLV de ${anio(fechaInicial)}` : 'fecha de firma');
  let totalSmmlv = 0;
  for (const a of validas) {
    const s = tabla[anio(a.fecha)];
    if (!s) faltantes.push(a.fecha ? `SMMLV de ${anio(a.fecha)}` : 'fecha de una adición');
    else totalSmmlv += Number(a.valor) / s;
  }

  const enSmmlv = faltantes.length === 0;
  const inicialSmmlv = smmlvInicial ? inicial / smmlvInicial : null;
  const pctSmmlv = enSmmlv ? (totalSmmlv / inicialSmmlv) * 100 : null;
  const pct = enSmmlv ? pctSmmlv : pctPesos;

  let nivel = 'ok';
  if (pct > 50) nivel = 'alta';
  else if (pct >= 40) nivel = 'media';
  if (validas.length === 0) nivel = 'info';

  return {
    nivel, totalPesos, pctPesos, enSmmlv, inicialSmmlv,
    totalSmmlv: enSmmlv ? totalSmmlv : null, pctSmmlv, pct,
    faltantes: [...new Set(faltantes)], numeroAdiciones: validas.length,
  };
}

// Días hábiles mínimos entre la primera publicación del proceso y el cierre de ofertas.
// Es un piso: la sola prepublicación del proyecto de pliegos ya exige estos días (ver normas.js).
export const PLAZO_MINIMO_HABILES = { licitacion: 10, seleccion_abreviada: 5, concurso: 5, minima: 1 };

export function evaluarPlazoOfertas({ modalidad, fechaPublicacion, fechaCierre }) {
  const clase = claseModalidad(modalidad);
  const minimo = PLAZO_MINIMO_HABILES[clase];
  if (!minimo) return { nivel: 'info', clase, motivo: 'La modalidad no tiene un plazo mínimo de publicación en esta regla.' };
  if (!fechaPublicacion || !fechaCierre) return { nivel: 'sin_datos', clase, minimo, motivo: 'SECOP no reporta la fecha de publicación o la de cierre de ofertas.' };
  const habiles = diasHabilesEntre(fechaPublicacion, fechaCierre);
  return { nivel: habiles < minimo ? 'alta' : 'ok', clase, minimo, habiles };
}

export function evaluarProponenteUnico({ modalidad, numeroOferentes }) {
  const clase = claseModalidad(modalidad);
  if (!COMPETITIVAS.has(clase)) return { nivel: 'info', clase, motivo: 'La modalidad no es competitiva.' };
  const n = Number(numeroOferentes);
  if (numeroOferentes === null || numeroOferentes === undefined || numeroOferentes === '' || !Number.isFinite(n)) {
    return { nivel: 'sin_datos', clase };
  }
  if (n === 0) return { nivel: 'info', clase, numeroOferentes: 0, motivo: 'SECOP reporta 0 oferentes. Puede ser un dato no diligenciado.' };
  return { nivel: n === 1 ? 'media' : 'ok', clase, numeroOferentes: n };
}

/**
 * Contratación directa repetida entre la misma entidad y el mismo proveedor.
 * contratos: [{ fecha: 'YYYY-MM-DD', modalidad }]. Cuenta las directas firmadas en los `ventanaMeses`
 * anteriores a la fecha de referencia (incluida esa fecha).
 */
export function evaluarDirectaRepetida(contratos, { fechaReferencia, ventanaMeses = 12, umbral = 3 } = {}) {
  if (!fechaReferencia) return { nivel: 'sin_datos', motivo: 'Falta la fecha de firma de referencia.' };
  const fin = new Date(fechaReferencia + 'T00:00:00Z');
  const inicio = new Date(fin);
  inicio.setUTCMonth(inicio.getUTCMonth() - ventanaMeses);
  const enVentana = contratos.filter(c => {
    if (!c.fecha || claseModalidad(c.modalidad) !== 'directa') return false;
    const f = new Date(c.fecha + 'T00:00:00Z');
    return f > inicio && f <= fin;
  });
  return {
    nivel: enVentana.length >= umbral ? 'media' : 'ok',
    cantidad: enVentana.length, umbral, ventanaMeses, contratos: enVentana,
  };
}

// Mayor número de directas en cualquier ventana de `ventanaMeses` (para la veeduría de una entidad o un proveedor).
export function maxDirectasEnVentana(contratos, { ventanaMeses = 12, umbral = 3 } = {}) {
  let mejor = { nivel: 'ok', cantidad: 0, umbral, ventanaMeses, contratos: [] };
  const fechas = [...new Set(contratos.filter(c => c.fecha && claseModalidad(c.modalidad) === 'directa').map(c => c.fecha))];
  for (const f of fechas) {
    const r = evaluarDirectaRepetida(contratos, { fechaReferencia: f, ventanaMeses, umbral });
    if (r.cantidad > mejor.cantidad) mejor = { ...r, hasta: f };
  }
  return mejor;
}

/**
 * Indicio de fraccionamiento: contratos con el mismo proveedor, firmados dentro de `ventanaDias`,
 * cada uno por debajo del tope (p. ej. la mínima cuantía de la entidad), cuya suma supera ese tope.
 * contratos: [{ id, fecha: 'YYYY-MM-DD', valor, proveedor }]. Devuelve los grupos encontrados (sin solaparse).
 */
export function evaluarFraccionamiento(contratos, { tope, ventanaDias = 30 } = {}) {
  const t = Number(tope);
  if (!Number.isFinite(t) || t <= 0) return { nivel: 'sin_datos', motivo: 'Falta el tope de cuantía.', grupos: [] };
  const porProveedor = new Map();
  for (const c of contratos) {
    const v = Number(c.valor);
    if (!c.proveedor || !c.fecha || !Number.isFinite(v) || v <= 0 || v > t) continue;
    if (!porProveedor.has(c.proveedor)) porProveedor.set(c.proveedor, []);
    porProveedor.get(c.proveedor).push({ ...c, valor: v });
  }
  const dia = f => Date.parse(f + 'T00:00:00Z') / 86400000;
  const grupos = [];
  for (const [proveedor, lista] of porProveedor) {
    lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
    let i = 0;
    while (i < lista.length) {
      let j = i;
      while (j + 1 < lista.length && dia(lista[j + 1].fecha) - dia(lista[i].fecha) <= ventanaDias) j++;
      const grupo = lista.slice(i, j + 1);
      const suma = grupo.reduce((s, c) => s + c.valor, 0);
      if (grupo.length >= 2 && suma > t) { grupos.push({ proveedor, contratos: grupo, suma }); i = j + 1; }
      else i++;
    }
  }
  grupos.sort((a, b) => b.suma - a.suma);
  return { nivel: grupos.length ? 'media' : 'ok', grupos, tope: t, ventanaDias };
}
