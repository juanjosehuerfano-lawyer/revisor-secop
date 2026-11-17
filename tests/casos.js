// Una prueba (o más) por regla de alerta. Corren en el navegador (tests/index.html) y en Node (tests/reglas.test.js).

import {
  evaluarAdiciones, evaluarPlazoOfertas, evaluarProponenteUnico, evaluarDirectaRepetida, claseModalidad, maxDirectasEnVentana, evaluarFraccionamiento,
  evaluarInicioAntesDeFirma, evaluarProrrogas, evaluarLiquidacion, evaluarPagos, adicionesDesdeModificaciones, claseDocumento,
} from '../js/reglas.js';
import { festivos, diasHabilesEntre } from '../js/festivos.js';
import { aCsv } from '../js/util.js';
import { destinoNumero, claveNumero } from '../js/vistas/buscar.js';

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

  // ----- Inicio de ejecución antes de la firma (Ley 80/1993, art. 41)
  ['Inicio antes de la firma: 3 días antes → revisar; el mismo día (con horas distintas) → sin alerta', () => {
    const r = evaluarInicioAntesDeFirma({ fechaFirma: '2025-03-10', fechaInicio: '2025-03-07' });
    iguales(r.nivel, 'media'); iguales(r.dias, 3);
    iguales(evaluarInicioAntesDeFirma({ fechaFirma: '2025-09-01T10:23:45.493', fechaInicio: '2025-09-01T08:00:00.000' }).nivel, 'ok');
    iguales(evaluarInicioAntesDeFirma({ fechaFirma: '2025-09-01', fechaInicio: '' }).nivel, 'sin_datos');
  }],

  // ----- Prórrogas frente al plazo inicial
  ['Prórrogas: 60 días sobre un plazo inicial de 120 (50 %) → revisar; 30 días (25 %) → sin alerta', () => {
    const r = evaluarProrrogas({ fechaInicio: '2025-01-01', fechaFin: '2025-06-30', diasAdicionados: 60 });
    iguales(r.plazoInicial, 120); cerca(r.pct, 50); iguales(r.nivel, 'media');
    iguales(evaluarProrrogas({ fechaInicio: '2025-01-01', fechaFin: '2025-05-31', diasAdicionados: '30' }).nivel, 'ok');
  }],
  ['Prórrogas: sin días adicionados → información; campo ausente o fechas incoherentes → sin datos', () => {
    iguales(evaluarProrrogas({ fechaInicio: '2025-01-01', fechaFin: '2025-06-30', diasAdicionados: '0' }).nivel, 'info');
    iguales(evaluarProrrogas({ fechaInicio: '2025-01-01', fechaFin: '2025-06-30' }).nivel, 'sin_datos');
    iguales(evaluarProrrogas({ fechaInicio: '2025-01-01', fechaFin: '2025-01-10', diasAdicionados: 30 }).nivel, 'sin_datos');
  }],

  // ----- Liquidación (Ley 1150/2007, art. 11)
  ['Liquidación: dentro de los 4 meses → sin alerta; después → revisar; pasados 4 + 2 meses y 2 años → alerta alta', () => {
    const base = { requiere: true, estado: 'terminado', fechaFin: '2023-12-31' };
    iguales(evaluarLiquidacion({ ...base, hoy: '2024-03-15' }).nivel, 'ok');
    const m = evaluarLiquidacion({ ...base, hoy: '2024-06-01' });
    iguales(m.nivel, 'media'); iguales(m.limiteBilateral, '2024-05-01'); iguales(m.limiteFinal, '2026-07-01');
    iguales(evaluarLiquidacion({ ...base, hoy: '2026-07-02' }).nivel, 'alta');
  }],
  ['Liquidación: se usa el plazo pactado si es mayor que los 4 meses', () => {
    const r = evaluarLiquidacion({ requiere: true, estado: 'En ejecución', fechaFin: '2023-12-31', fechaLimitePactada: '2024-09-30', hoy: '2024-08-01' });
    iguales(r.nivel, 'ok'); iguales(r.limiteBilateral, '2024-09-30');
  }],
  ['Liquidación: cerrado, liquidado, no requiere, en ejecución y sin datos no generan alerta', () => {
    iguales(evaluarLiquidacion({ requiere: true, estado: 'Cerrado', fechaFin: '2020-01-01', hoy: '2026-01-01' }).nivel, 'ok');
    iguales(evaluarLiquidacion({ estado: 'Liquidado', fechaFin: '2020-01-01', hoy: '2026-01-01' }).nivel, 'ok');
    iguales(evaluarLiquidacion({ requiere: false, estado: 'terminado', fechaFin: '2020-01-01', hoy: '2026-01-01' }).nivel, 'info');
    iguales(evaluarLiquidacion({ requiere: true, estado: 'En ejecución', fechaFin: '2026-12-31', hoy: '2026-01-01' }).nivel, 'info');
    iguales(evaluarLiquidacion({ estado: 'Celebrado', fechaFin: '2020-01-01', hoy: '2026-01-01' }).nivel, 'sin_datos');
  }],
  ['Liquidación: en SECOP I, "Terminado sin Liquidar" se evalúa aunque no diga si requiere liquidación', () => {
    iguales(evaluarLiquidacion({ estado: 'Terminado sin Liquidar', fechaFin: '2020-01-01', hoy: '2026-01-01' }).nivel, 'alta');
  }],

  // ----- Pagos por encima del valor del contrato
  ['Pagos: pagado mayor que el valor → alerta alta; igual o menor → sin alerta; sin dato → sin datos', () => {
    const r = evaluarPagos({ valorContrato: '100000000', valorPagado: '120000000' });
    iguales(r.nivel, 'alta'); iguales(r.exceso, 20e6);
    iguales(evaluarPagos({ valorContrato: 100e6, valorPagado: 100e6 }).nivel, 'ok');
    iguales(evaluarPagos({ valorContrato: 100e6, valorPagado: 0 }).nivel, 'ok');
    iguales(evaluarPagos({ valorContrato: 100e6 }).nivel, 'sin_datos');
  }],

  // ----- Adiciones calculadas con "Modificaciones a contratos" (caso real CO1.PCCNTR.8934192)
  ['Modificaciones: la adición es la diferencia con el valor anterior; las canceladas no cuentan', () => {
    const r = adicionesDesdeModificaciones([
      { id: 'CO1.CTRMOD.24462141', fecha: '2026-09-15T21:41:21', valor: 65984344, estado: 'Cancelado' },
      { id: 'CO1.CTRMOD.24462155', fecha: '2026-09-16T21:13:15', valor: 94027690, estado: 'Publicado', proposito: 'PRORROGA Y ADICION No. 1' },
    ], 65984344);
    iguales(r.adiciones.length, 1); iguales(r.adiciones[0].valor, 28043346); iguales(r.adiciones[0].fecha, '2026-09-16');
    iguales(r.adiciones[0].valorTras, 94027690); iguales(r.sinBase, false);
  }],
  ['Modificaciones: una prórroga o un cierre repiten el valor y no son adición; una reducción baja la base', () => {
    const r = adicionesDesdeModificaciones([
      { id: 'a', fecha: '2026-03-01', valor: 22e6, estado: 'Publicado' },
      { id: 'b', fecha: '2026-05-01', valor: 20e6, estado: 'Publicado' },
      { id: 'c', fecha: '2026-07-01', valor: 25e6, estado: 'Publicado' },
      { id: 'd', fecha: '2026-08-01', valor: 1, estado: 'Publicado' },
    ], 22e6);
    iguales(r.adiciones.map(a => [a.id, a.valor]), [['c', 5e6]]);
  }],
  ['Modificaciones: sin valor inicial no se inventa la primera adición y se avisa', () => {
    const r = adicionesDesdeModificaciones([
      { id: 'a', fecha: '2026-03-01', valor: 30e6, estado: 'Publicado' },
      { id: 'b', fecha: '2026-06-01', valor: 40e6, estado: 'Publicado' },
    ], null);
    iguales(r.sinBase, true); iguales(r.adiciones.map(a => a.valor), [10e6]);
    iguales(adicionesDesdeModificaciones([], null), { adiciones: [], sinBase: false });
  }],

  // ----- Clase de los documentos del expediente (nombres reales de SECOP I y II)
  ['Documentos: se agrupan por clase según el nombre; "contrato" no gana a una clase más precisa', () => {
    const casos = {
      'ESTUDIOS PREVIOS CONTRATO 076-2020': 'planeacion', 'SOLICITUD Y CDP.pdf': 'planeacion', 'ANALISIS DEL SECTOR.pdf': 'planeacion',
      'CARTA DE INVITACION.pdf': 'pliegos', 'AVISO DE CONVOCATORIA VERSION FINAL FIRMADO.pdf': 'pliegos',
      '3. OFRECIMIENTO ECONOMICO.pdf': 'ofertas', 'EVALUACIÒN.pdf': 'ofertas', 'ACTA DE CIERRE': 'ofertas',
      'CONTRATO 076-2020': 'contrato', 'CO1_PCCNTR_9041177_Firmado.pdf': 'contrato', 'ANEXO DE CONDICIONES CONTRACTUALES PS AG.pdf': 'contrato',
      'Poliza de cumplimiento - Sop.pdf': 'garantias', 'RP CONTRATO 076-2020': 'garantias', 'RP2026000068.pdf': 'garantias',
      'ACTA DE INICIO CTTO CDIH061-2026.pdf': 'supervision', 'INFORME DE SUPERVISION Y CERT CUMPLIMIENTO 01.pdf': 'supervision',
      'cuenta de cobro no. 01 CDIH061-2026.pdf': 'pagos', 'SEGURIDAD SOCIAL - HOLMES ARTEAGA.pdf': 'pagos',
      'ACTA JUSTIFICACION 1 ADICIONAL Y PRORROGA CDIH061-2026.pdf': 'modificaciones',
      'ACTA TERMINACION CONTRATO 076-2020': 'liquidacion', 'ACTA DE LIQUIDACION': 'liquidacion',
      '2026000186.pdf': 'otros', 'REQUISITOS MINIMOS DE CONTRATACION DIRECTA.pdf': 'otros', '': 'otros',
    };
    for (const [nombre, clase] of Object.entries(casos)) iguales(claseDocumento(nombre), clase, nombre + ':');
  }],

  ['Buscar por número: acepta el número o el enlace pegado de SECOP I y II', () => {
    iguales(destinoNumero(' 20-21-20447 '), '#/secop1/20-21-20447');
    iguales(destinoNumero('https://www.contratos.gov.co/consultas/detalleProceso.do?numConstancia=20-21-20447'), '#/secop1/20-21-20447');
    iguales(destinoNumero('https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.123&isFromPublicArea=True'), '#/buscar?numero=CO1.NTC.123');
    iguales(destinoNumero('co1.pccntr.8934192'), '#/contrato/CO1.PCCNTR.8934192');
    iguales(destinoNumero('1504 DE 2021'), '#/buscar?numero=1504%20DE%202021');
  }],

  ['Buscar por número: compara sin mayúsculas, separadores, tildes ni ceros a la izquierda', () => {
    iguales(claveNumero('Licitacionpublica_21_2020'), claveNumero('LICITACIONPUBLICA 21-2020'));
    iguales(claveNumero('LP-001-2020'), claveNumero('lp 1 2020'));
    iguales(claveNumero('1504 DE 2021'), '1504de2021');
    iguales(claveNumero('CPS-010') === claveNumero('CPS-100'), false);
    iguales(claveNumero('000'), '0');
  }],

  // ----- Exportación a CSV
  ['CSV: separador ;, comillas escapadas, decimales con coma, vacíos y fórmulas neutralizadas', () => {
    const csv = aCsv(['A', 'B'], [['x;y', 'dijo "hola"'], [1.5, null], ['=SUMA(A1)', '-5']]);
    iguales(csv, '﻿A;B\r\n"x;y";"dijo ""hola"""\r\n1,5;\r\n\'=SUMA(A1);\'-5');
  }],
];
