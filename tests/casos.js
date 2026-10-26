// Una prueba (o más) por regla de alerta. Corren en el navegador (tests/index.html) y en Node (tests/reglas.test.js).

import { evaluarAdiciones, evaluarPlazoOfertas, evaluarProponenteUnico, evaluarDirectaRepetida, claseModalidad, maxDirectasEnVentana, evaluarFraccionamiento } from '../js/reglas.js';
import { festivos, diasHabilesEntre } from '../js/festivos.js';

function iguales(real, esperado, msg = '') {
  if (JSON.stringify(real) !== JSON.stringify(esperado)) throw new Error(`${msg} esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(real)}`);
}
function cerca(real, esperado, tol = 0.01, msg = '') {
  if (Math.abs(real - esperado) > tol) throw new Error(`${msg} esperado ≈${esperado}, obtenido ${real}`);
}

const TABLA = { 2022: 1000000, 2024: 1300000 };

export const CASOS = [
  // ----- Adiciones 50 % (Ley 80/1993, art. 40, parágrafo)
  ['Adiciones: 60 % del valor inicial en el mismo año → alerta alta', () => {
    const r = evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2024-02-01', adiciones: [{ valor: 60e6, fecha: '2024-08-01' }] }, TABLA);
    iguales(r.nivel, 'alta'); cerca(r.pctSmmlv, 60); iguales(r.enSmmlv, true);
  }],
  ['Adiciones: el cálculo en SMMLV puede bajar el porcentaje (55 % en pesos → 42,3 % en SMMLV)', () => {
    const r = evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2022-03-01', adiciones: [{ valor: 55e6, fecha: '2024-05-01' }] }, TABLA);
    cerca(r.pctPesos, 55); cerca(r.inicialSmmlv, 100); cerca(r.totalSmmlv, 42.3077); cerca(r.pctSmmlv, 42.31);
    iguales(r.nivel, 'media');
  }],
  ['Adiciones: exactamente 50 % no supera el tope → revisar', () => {
    const r = evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2024-01-10', adiciones: [{ valor: 30e6, fecha: '2024-03-01' }, { valor: 20e6, fecha: '2024-06-01' }] }, TABLA);
    cerca(r.pct, 50); iguales(r.nivel, 'media'); iguales(r.numeroAdiciones, 2);
  }],
  ['Adiciones: 20 % → sin alerta', () => {
    iguales(evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2024-01-10', adiciones: [{ valor: 20e6, fecha: '2024-03-01' }] }, TABLA).nivel, 'ok');
  }],
  ['Adiciones: sin fecha de la adición no se inventa el SMMLV y se usa el porcentaje en pesos', () => {
    const r = evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2024-01-10', adiciones: [{ valor: 70e6, fecha: '' }] }, TABLA);
    iguales(r.enSmmlv, false); iguales(r.pctSmmlv, null); cerca(r.pct, 70); iguales(r.nivel, 'alta');
    iguales(r.faltantes, ['fecha de una adición']);
  }],
  ['Adiciones: año sin SMMLV en la tabla se reporta como faltante', () => {
    const r = evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2019-01-10', adiciones: [{ valor: 10e6, fecha: '2024-03-01' }] }, TABLA);
    iguales(r.faltantes, ['SMMLV de 2019']); iguales(r.enSmmlv, false);
  }],
  ['Adiciones: sin valor inicial → sin datos', () => {
    iguales(evaluarAdiciones({ valorInicial: null, adiciones: [{ valor: 1, fecha: '2024-01-01' }] }).nivel, 'sin_datos');
  }],
  ['Adiciones: filas vacías no cuentan y sin adiciones queda como información', () => {
    const r = evaluarAdiciones({ valorInicial: 100e6, fechaInicial: '2024-01-10', adiciones: [{ valor: null, fecha: '2024-03-01' }] }, TABLA);
    iguales(r.nivel, 'info'); iguales(r.numeroAdiciones, 0);
  }],

  // ----- Festivos y días hábiles (Ley 51/1983)
  ['Festivos de Colombia 2025', () => {
    const esperado = ['2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18', '2025-05-01', '2025-06-02', '2025-06-23',
      '2025-06-30', '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17', '2025-12-08', '2025-12-25'];
    iguales([...festivos(2025)].sort(), esperado);
  }],
  ['Días hábiles entre el 19/12/2025 y el 02/01/2026 descuentan Navidad y Año Nuevo', () => {
    iguales(diasHabilesEntre('2025-12-19', '2026-01-02'), 8);
  }],

  // ----- Plazo de ofertas
  ['Plazo: licitación con 5 días hábiles → alerta alta', () => {
    const r = evaluarPlazoOfertas({ modalidad: 'Licitación pública', fechaPublicacion: '2025-03-03', fechaCierre: '2025-03-10' });
    iguales(r.habiles, 5); iguales(r.minimo, 10); iguales(r.nivel, 'alta');
  }],
  ['Plazo: licitación con 11 días hábiles → sin alerta', () => {
    const r = evaluarPlazoOfertas({ modalidad: 'Licitación pública Obra Publica', fechaPublicacion: '2025-03-03', fechaCierre: '2025-03-18' });
    iguales(r.habiles, 11); iguales(r.nivel, 'ok');
  }],
  ['Plazo: mínima cuantía con cierre el mismo día → alerta alta', () => {
    iguales(evaluarPlazoOfertas({ modalidad: 'Mínima cuantía', fechaPublicacion: '2025-05-05', fechaCierre: '2025-05-05' }).nivel, 'alta');
  }],
  ['Plazo: selección abreviada con un festivo en medio (24/03/2025)', () => {
    const r = evaluarPlazoOfertas({ modalidad: 'Selección abreviada subasta inversa', fechaPublicacion: '2025-03-18', fechaCierre: '2025-03-25' });
    iguales(r.habiles, 4); iguales(r.nivel, 'alta');
  }],
  ['Plazo: contratación directa no aplica; sin fechas → sin datos', () => {
    iguales(evaluarPlazoOfertas({ modalidad: 'Contratación directa', fechaPublicacion: '2025-01-01', fechaCierre: '2025-01-02' }).nivel, 'info');
    iguales(evaluarPlazoOfertas({ modalidad: 'Concurso de méritos abierto', fechaPublicacion: null, fechaCierre: '2025-01-02' }).nivel, 'sin_datos');
  }],

  // ----- Proponente único
  ['Proponente único: licitación con 1 oferente → revisar', () => {
    iguales(evaluarProponenteUnico({ modalidad: 'Licitación pública', numeroOferentes: 1 }).nivel, 'media');
  }],
  ['Proponente único: 3 oferentes → sin alerta; directa → no aplica; 0 → información; sin dato → sin datos', () => {
    iguales(evaluarProponenteUnico({ modalidad: 'Selección Abreviada de Menor Cuantía', numeroOferentes: 3 }).nivel, 'ok');
    iguales(evaluarProponenteUnico({ modalidad: 'Contratación directa', numeroOferentes: 1 }).nivel, 'info');
    iguales(evaluarProponenteUnico({ modalidad: 'Mínima cuantía', numeroOferentes: 0 }).nivel, 'info');
    iguales(evaluarProponenteUnico({ modalidad: 'Mínima cuantía', numeroOferentes: undefined }).nivel, 'sin_datos');
  }],

  // ----- Contratación directa repetida
  ['Directa repetida: 3 directas en 12 meses → revisar; excluye antiguas y otras modalidades', () => {
    const contratos = [
      { fecha: '2025-09-01', modalidad: 'Contratación directa' },
      { fecha: '2025-03-15', modalidad: 'Contratación Directa (con ofertas)' },
      { fecha: '2024-11-20', modalidad: 'Contratación Directa (Ley 1150 de 2007)' },
      { fecha: '2024-08-01', modalidad: 'Contratación directa' }, // fuera de la ventana
      { fecha: '2025-05-01', modalidad: 'Mínima cuantía' }, // otra modalidad
      { fecha: '2025-12-01', modalidad: 'Contratación directa' }, // posterior a la referencia
    ];
    const r = evaluarDirectaRepetida(contratos, { fechaReferencia: '2025-09-01' });
    iguales(r.cantidad, 3); iguales(r.nivel, 'media');
  }],
  ['Directa repetida: 2 directas → sin alerta; sin fecha de referencia → sin datos', () => {
    iguales(evaluarDirectaRepetida([{ fecha: '2025-09-01', modalidad: 'Contratación directa' }, { fecha: '2025-01-01', modalidad: 'Contratación directa' }], { fechaReferencia: '2025-09-01' }).nivel, 'ok');
    iguales(evaluarDirectaRepetida([], {}).nivel, 'sin_datos');
  }],

  ['Directa por ventana: encuentra la ventana de 12 meses con más directas', () => {
    const c = ['2023-01-10', '2023-03-01', '2024-06-01', '2024-07-01', '2024-09-01', '2025-05-01'].map(f => ({ fecha: f, modalidad: 'Contratación directa' }));
    const r = maxDirectasEnVentana(c);
    iguales(r.cantidad, 4); iguales(r.hasta, '2025-05-01'); iguales(r.nivel, 'media');
  }],

  // ----- Fraccionamiento
  ['Fraccionamiento: 3 contratos bajo el tope en 30 días que suman más → aviso', () => {
    const r = evaluarFraccionamiento([
      { id: 'a', fecha: '2025-03-01', valor: 40e6, proveedor: 'P1' },
      { id: 'b', fecha: '2025-03-10', valor: 45e6, proveedor: 'P1' },
      { id: 'c', fecha: '2025-03-25', valor: 30e6, proveedor: 'P1' },
      { id: 'd', fecha: '2025-03-05', valor: 40e6, proveedor: 'P2' }, // otro proveedor, solo uno
    ], { tope: 50e6 });
    iguales(r.nivel, 'media'); iguales(r.grupos.length, 1); iguales(r.grupos[0].contratos.map(x => x.id), ['a', 'b', 'c']); iguales(r.grupos[0].suma, 115e6);
  }],
  ['Fraccionamiento: contratos separados más de 30 días o por encima del tope no cuentan', () => {
    const r = evaluarFraccionamiento([
      { id: 'a', fecha: '2025-01-01', valor: 40e6, proveedor: 'P1' },
      { id: 'b', fecha: '2025-02-15', valor: 40e6, proveedor: 'P1' },
      { id: 'c', fecha: '2025-02-20', valor: 90e6, proveedor: 'P1' },
    ], { tope: 50e6 });
    iguales(r.nivel, 'ok');
  }],
  ['Fraccionamiento: sin tope → sin datos', () => {
    iguales(evaluarFraccionamiento([], {}).nivel, 'sin_datos');
  }],

  // ----- Clasificación de modalidades (SECOP I y II escriben distinto)
  ['Clasificación de modalidades de SECOP I y II', () => {
    iguales(claseModalidad('Contratación Mínima Cuantía'), 'minima');
    iguales(claseModalidad('Selección Abreviada de Menor Cuantía (Ley 1150 de 2007)'), 'seleccion_abreviada');
    iguales(claseModalidad('Contratación régimen especial (con ofertas)'), 'especial');
    iguales(claseModalidad('Concurso de méritos abierto'), 'concurso');
    iguales(claseModalidad('Contratación Directa (con ofertas)'), 'directa');
    iguales(claseModalidad(''), null);
  }],
];
