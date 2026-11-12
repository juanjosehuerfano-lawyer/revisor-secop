# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Un abogado de contratación estatal en Colombia, que también hace veeduría a la contratación de entidades públicas. No es programador. Usa la app por igual en el celular (consultas rápidas en reuniones y fuera de la oficina) y en el computador (análisis largo de un contrato o de una entidad).

Lo que la app produce (pantalla, PDF y Excel) también lo ven sus clientes, los entes de control y los jueces (los PDF acompañan denuncias, derechos de petición, conceptos y demandas), y veedurías, periodistas y ciudadanos.

## Product Purpose
Revisar procesos y contratos públicos con los datos abiertos del SECOP (datos.gov.co): buscar, abrir un contrato por su número, analizar la etapa precontractual y la ejecución, y hacer veeduría de una entidad o de un proveedor en su conjunto. El éxito es que el abogado encuentre en minutos los indicios que merecen revisión y pueda sustentarlos con la fuente oficial y la norma.

## Positioning
Cada dato muestra su fuente oficial, la consulta exacta y la hora en que se hizo; cada alerta cita la norma y queda "pendiente de validación" hasta que el abogado la valida. La app nunca inventa un dato: si SECOP no lo trae, dice "No reportado en SECOP".

## Operating Context
- Fuente: API de datos abiertos del SECOP I, SECOP II y SECOP Integrado. Sin servidor propio ni cuentas.
- Flujos: búsqueda → ficha del contrato o proceso (datos, línea de tiempo, alertas, checklist, modificaciones, facturas) → PDF; veeduría de entidad o proveedor (modalidades, concentración, directa repetida, fraccionamiento, competencia) → Excel; casos guardados con notas.
- Documentos del oficio: expediente del SECOP, estudios previos, pliegos, actas, otrosíes, conceptos jurídicos, denuncias y derechos de petición.
- Los datos del abogado (casos, notas, checklists, validaciones) viven solo en su navegador.

## Capabilities and Constraints
- PWA instalable, HTML/CSS/JS sin dependencias ni compilación, publicada en GitHub Pages. Debe abrir sin conexión (la interfaz) y cargar rápido en datos móviles.
- Exporta a PDF por impresión del navegador y a CSV para Excel.
- Niveles de alerta: alta (supera un límite legal), media (indicio para revisar), sin alerta, información, sin datos suficientes.
- Idioma: español de Colombia, lenguaje sencillo.

## Brand Commitments
- Nada del aspecto actual es obligatorio: nombre, ícono, color y pestañas pueden cambiar (confirmado por el usuario el 2026-11-12). Se conservan los datos y las funciones.
- Debe verse profesional pero innovador.
- No debe parecer un portal del Estado, ni poco serio frente a un juez o un cliente, ni una plantilla genérica.

## Evidence on Hand
- Datos reales de la API (por ejemplo, Alcaldía de Yopal 2025: 2.857 contratos). No hay logotipo profesional, fotografías, testimonios ni marca registrada: no se deben inventar.
- `docs/BRIEF.md` (encargo original) y `docs/esquemas.md` (campos reales y hallazgos).

## Product Principles
1. La fuente antes que la conclusión: todo dato lleva su origen y su hora de consulta.
2. Indicio, no veredicto: las alertas orientan la revisión del expediente y citan la norma.
3. Lo no reportado se dice, no se rellena.
4. Lo que sale de la app (PDF, Excel) debe poder ponerse frente a un juez.
5. Igual de útil en el celular que en el escritorio.

## Accessibility & Inclusion
Contraste WCAG AA en modo claro y oscuro, campos de 16 px en celular, navegación por teclado y lectores de pantalla. El nivel de una alerta nunca depende solo del color.
