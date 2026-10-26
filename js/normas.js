// Fichas jurídicas de las reglas y textos de ayuda. Todo texto cita su norma.
// Lo marcado con `verificar` es una cita que el abogado debe confirmar antes de darla por buena.

export const REGLAS = [
  {
    id: 'adiciones50',
    titulo: 'Adiciones de más del 50 % del valor inicial',
    norma: 'Ley 80 de 1993, art. 40, parágrafo',
    texto: 'Los contratos no pueden adicionarse en más del 50 % de su valor inicial, expresado en salarios mínimos legales mensuales (SMMLV).',
    umbral: 'Alerta alta si las adiciones superan el 50 % del valor inicial. Aviso si están entre 40 % y 50 %. El valor inicial se convierte con el SMMLV del año de firma y cada adición con el SMMLV del año en que se hizo.',
    limites: 'Aplica a entidades sometidas al Estatuto General de Contratación. No aplica a entidades de régimen especial (por ejemplo, empresas de servicios públicos o universidades públicas, según su régimen). En SECOP II, el conjunto de Adiciones no publica el valor de cada adición: hay que tomarlo del documento de modificación.',
  },
  {
    id: 'plazoOfertas',
    titulo: 'Plazo muy corto entre la publicación y el cierre de ofertas',
    norma: 'Ley 1150 de 2007, art. 8; Decreto 1082 de 2015, art. 2.2.1.1.2.1.4 y art. 2.2.1.2.1.5.2 (verificar numeración)',
    texto: 'El proyecto de pliego se publica con anticipación: al menos 10 días hábiles en licitación pública y 5 días hábiles en selección abreviada y concurso de méritos. En mínima cuantía, la invitación da al menos 1 día hábil para presentar ofertas.',
    umbral: 'Alerta alta si, entre la primera publicación del proceso y el cierre de ofertas, hay menos días hábiles que ese mínimo (10 / 5 / 5 / 1). Se toma la primera publicación de todas las fases del portafolio en SECOP II, incluida la fase de observaciones (prepublicación). Se descuentan los fines de semana y los festivos de Colombia (Ley 51 de 1983).',
    limites: 'Es un piso aproximado: SECOP reporta una fecha de publicación por fase, no la de cada acto (proyecto de pliego, apertura, pliego definitivo). Si la fase de prepublicación no está en datos abiertos, la alerta puede ser un falso positivo. Una alerta indica que hay que revisar el cronograma completo en el expediente.',
  },
  {
    id: 'proponenteUnico',
    titulo: 'Proponente único en un proceso competitivo',
    norma: 'Ley 1150 de 2007, art. 5 (selección objetiva); Decreto 1082 de 2015, art. 2.2.1.1.2.2.6 (verificar)',
    texto: 'Adjudicar con una sola oferta es legal si la oferta cumple los requisitos y es favorable. Sin embargo, que un proceso abierto reciba una sola oferta es un indicio de requisitos restrictivos o de poca publicidad.',
    umbral: 'Aviso (no alerta) si un proceso de licitación, selección abreviada, concurso o mínima cuantía reporta exactamente 1 oferente. Se usa "proveedores únicos con respuestas" y, si viene en 0, "respuestas al procedimiento".',
    limites: 'Si SECOP reporta 0 oferentes, puede ser un campo sin diligenciar. Revisa el acta de cierre.',
  },
  {
    id: 'directaRepetida',
    titulo: 'Contratación directa repetida con el mismo proveedor',
    norma: 'Ley 1150 de 2007, art. 2, num. 4 (causales taxativas); Decreto 1082 de 2015, art. 2.2.1.2.1.4.1 (acto de justificación)',
    texto: 'La contratación directa solo procede por las causales que señala la ley y exige un acto administrativo de justificación. Varios contratos directos seguidos con el mismo proveedor pueden indicar un fraccionamiento o una necesidad permanente que debería tramitarse con otra modalidad.',
    umbral: 'Aviso si la misma entidad firmó 3 o más contratos por contratación directa con el mismo proveedor en los 12 meses anteriores a la firma del contrato revisado (incluido este).',
    limites: 'En prestación de servicios profesionales y de apoyo a la gestión es frecuente y puede ser legal. El aviso pide revisar el objeto y la justificación de cada contrato.',
  },
];

export const ETAPAS = [
  {
    titulo: '1. Planeación y etapa precontractual',
    texto: 'La entidad identifica la necesidad, la incluye en el Plan Anual de Adquisiciones, elabora los estudios y documentos previos, analiza el sector, define la modalidad de selección y adelanta el proceso hasta la adjudicación.',
    normas: ['Ley 80 de 1993, art. 25, num. 7 y 12 (planeación y estudios previos)', 'Decreto 1082 de 2015, art. 2.2.1.1.1.4.1 (Plan Anual de Adquisiciones)', 'Decreto 1082 de 2015, art. 2.2.1.1.1.6.1 (análisis del sector)', 'Decreto 1082 de 2015, art. 2.2.1.1.2.1.1 (estudios y documentos previos)'],
  },
  {
    titulo: '2. Etapa contractual (ejecución)',
    texto: 'Va desde la firma y el cumplimiento de los requisitos de perfeccionamiento y ejecución (registro presupuestal y garantía aprobada) hasta el vencimiento del plazo. Incluye la supervisión o interventoría, los pagos y las modificaciones (adiciones, prórrogas, suspensiones, cesiones).',
    normas: ['Ley 80 de 1993, art. 41 (perfeccionamiento y requisitos de ejecución)', 'Ley 80 de 1993, art. 40, parágrafo (límite de adiciones)', 'Ley 1474 de 2011, arts. 83 y 84 (supervisión e interventoría)'],
  },
  {
    titulo: '3. Etapa poscontractual (liquidación)',
    texto: 'Las partes hacen un balance final de lo ejecutado y pagado. La liquidación de común acuerdo se hace en el plazo pactado o, si no se pactó, dentro de los 4 meses siguientes a la terminación. Si no hay acuerdo, la entidad puede liquidar de forma unilateral dentro de los 2 meses siguientes. Después de ese plazo, la liquidación aún puede hacerse dentro de los 2 años siguientes.',
    normas: ['Ley 80 de 1993, art. 60', 'Ley 1150 de 2007, art. 11', 'Ley 1437 de 2011 (CPACA), art. 164, num. 2, lit. j (caducidad)'],
  },
];

export const MODALIDADES = [
  {
    id: 'licitacion',
    titulo: 'Licitación pública',
    cuando: 'Es la regla general. Se usa cuando el contrato no encaja en ninguna de las otras modalidades. Para obra pública de mayor cuantía es la modalidad por excelencia.',
    pasos: 'Aviso de convocatoria → proyecto de pliego (al menos 10 días hábiles) → observaciones → apertura y pliego definitivo → audiencia de riesgos y aclaraciones → adendas (no en los 3 días anteriores al cierre) → cierre y evaluación → audiencia de adjudicación.',
    normas: ['Ley 80 de 1993, art. 30', 'Ley 1150 de 2007, art. 2, num. 1', 'Ley 1882 de 2018, art. 1 (adendas y pliego tipo)', 'Decreto 1082 de 2015, art. 2.2.1.2.1.1.1 y ss.'],
  },
  {
    id: 'seleccion_abreviada',
    titulo: 'Selección abreviada',
    cuando: 'Para bienes y servicios de características técnicas uniformes (subasta inversa, acuerdo marco o bolsa de productos), contratos de menor cuantía y otras causales de la ley, como la enajenación de bienes del Estado o la declaratoria de desierta de una licitación.',
    pasos: 'Proyecto de pliego (al menos 5 días hábiles) → apertura → en menor cuantía, manifestaciones de interés y posible sorteo → ofertas → evaluación → adjudicación. En subasta inversa se adjudica por menor precio.',
    normas: ['Ley 1150 de 2007, art. 2, num. 2', 'Decreto 1082 de 2015, art. 2.2.1.2.1.2.1 y ss.'],
  },
  {
    id: 'concurso',
    titulo: 'Concurso de méritos',
    cuando: 'Para servicios de consultoría (estudios, diseños, interventorías, asesorías técnicas) y proyectos de arquitectura. Se selecciona por calidad y experiencia, no por precio.',
    pasos: 'Proyecto de pliego (al menos 5 días hábiles) → apertura → ofertas → evaluación de calidad → revisión de la oferta económica del primero en el orden de elegibilidad.',
    normas: ['Ley 80 de 1993, art. 32, num. 2 (contrato de consultoría)', 'Ley 1150 de 2007, art. 2, num. 3', 'Decreto 1082 de 2015, art. 2.2.1.2.1.3.1 y ss.'],
  },
  {
    id: 'minima',
    titulo: 'Mínima cuantía',
    cuando: 'Para contratos cuyo valor no supera el 10 % de la menor cuantía de la entidad, sin importar el objeto.',
    pasos: 'Invitación pública (al menos 1 día hábil para ofertas) → se verifica que la oferta de menor precio cumpla → comunicación de aceptación, que junto con la oferta es el contrato.',
    normas: ['Ley 1150 de 2007, art. 2, num. 5 (adicionado por Ley 1474 de 2011, art. 94)', 'Decreto 1082 de 2015, art. 2.2.1.2.1.5.1 y ss.'],
  },
  {
    id: 'directa',
    titulo: 'Contratación directa',
    cuando: 'Solo en las causales de la ley, entre ellas: urgencia manifiesta, contratos interadministrativos, prestación de servicios profesionales y de apoyo a la gestión, cuando no hay pluralidad de oferentes, arrendamiento o adquisición de inmuebles, y actividades científicas y tecnológicas.',
    pasos: 'Estudios previos → acto administrativo de justificación (salvo las excepciones de la norma) → verificación de idoneidad y experiencia → contrato.',
    normas: ['Ley 1150 de 2007, art. 2, num. 4', 'Decreto 1082 de 2015, art. 2.2.1.2.1.4.1 y ss.', 'Ley 2195 de 2022 (medidas de transparencia en la contratación; verificar el artículo aplicable al caso)'],
  },
];

export const TRANSVERSALES = [
  {
    titulo: 'Ley 2195 de 2022 (transparencia y lucha contra la corrupción)',
    texto: 'Endurece las medidas de transparencia en la contratación, fortalece el SECOP como fuente de publicidad y fija responsabilidades para las personas jurídicas involucradas en actos de corrupción. Úsala como marco al revisar la publicidad del expediente y las inhabilidades.',
    normas: ['Ley 2195 de 2022 (verificar los artículos que modifican la Ley 80, la Ley 1150 y la Ley 1474)'],
  },
  {
    titulo: 'Requisitos habilitantes',
    texto: 'Son la capacidad jurídica, la experiencia y la capacidad financiera y organizacional. No dan puntaje: el proponente cumple o no cumple. Deben ser adecuados y proporcionales al objeto y al valor del contrato.',
    normas: ['Ley 1150 de 2007, art. 5, num. 1', 'Decreto 1082 de 2015, art. 2.2.1.1.1.6.2 (determinación de requisitos habilitantes)'],
  },
];

// Checklist precontractual. Las entradas con `auto` las evalúa la app con datos de SECOP. Las demás se revisan en el expediente.
export const CHECKLIST = [
  { id: 'estudios', titulo: 'Estudios y documentos previos', norma: 'Ley 80 de 1993, art. 25, num. 12; Decreto 1082 de 2015, art. 2.2.1.1.2.1.1', ayuda: 'Revisa que describan la necesidad, el objeto, la modalidad y su justificación, el valor estimado y cómo se calculó, los criterios de selección, los riesgos y las garantías.' },
  { id: 'sector', titulo: 'Análisis del sector', norma: 'Decreto 1082 de 2015, art. 2.2.1.1.1.6.1', ayuda: 'Debe cubrir la perspectiva legal, comercial, financiera, organizacional, técnica y de riesgos. Compara los precios con contratos similares; puedes usar la pestaña Buscar.' },
  { id: 'modalidad', titulo: 'Justificación de la modalidad', norma: 'Ley 1150 de 2007, art. 2; Decreto 1082 de 2015, art. 2.2.1.2.1.4.1 (directa)', ayuda: 'La modalidad debe corresponder al objeto y a la cuantía. En contratación directa, verifica la causal y el acto de justificación.', campo: true },
  { id: 'cronograma', titulo: 'Plazos del cronograma', norma: 'Ley 1150 de 2007, art. 8; Decreto 1082 de 2015 (ver regla de plazos)', ayuda: 'Revisa la prepublicación del proyecto de pliego, el plazo de observaciones, la apertura, el cierre y la evaluación.', auto: 'plazoOfertas' },
  { id: 'habilitantes', titulo: 'Requisitos habilitantes', norma: 'Ley 1150 de 2007, art. 5; Decreto 1082 de 2015, art. 2.2.1.1.1.6.2', ayuda: 'Deben ser proporcionales al valor y al objeto. Un requisito de experiencia excesivo puede explicar que haya un solo proponente.', auto: 'proponenteUnico' },
  { id: 'adendas', titulo: 'Adendas', norma: 'Ley 80 de 1993, art. 30, num. 5 (modificado por Ley 1882 de 2018, art. 1); Decreto 1082 de 2015, art. 2.2.1.1.2.2.1', ayuda: 'En licitación no se pueden expedir adendas en los 3 días anteriores al cierre (verificar si la norma los cuenta como hábiles). En las demás modalidades, a más tardar el día hábil anterior al vencimiento del plazo para presentar ofertas. Verifica que no cambien de forma sustancial las condiciones.' },
  { id: 'directa', titulo: 'Historial de contratación directa con el proveedor', norma: 'Ley 1150 de 2007, art. 2, num. 4', ayuda: 'Contratos directos repetidos con el mismo proveedor y la misma entidad.', auto: 'directaRepetida' },
];

export const ENLACES = [
  { texto: 'Búsqueda pública SECOP II', url: 'https://community.secop.gov.co/Public/Tendering/ContractNoticeManagement/Index' },
  { texto: 'Consulta SECOP I', url: 'https://www.contratos.gov.co/consultas/inicioConsulta.do' },
  { texto: 'Datos abiertos de Colombia Compra Eficiente', url: 'https://www.colombiacompra.gov.co/transparencia/datos-abiertos/conjuntos-de-datos-abiertos' },
];
