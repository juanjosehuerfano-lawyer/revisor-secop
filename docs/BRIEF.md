# Brief: App de revisión de contratación estatal (Colombia) — v1 uso personal

Pega este archivo en Claude Code como contexto inicial (o guárdalo como CLAUDE.md en la carpeta del proyecto).

## Objetivo
App web responsive (computador y celular, instalable como PWA) para que un abogado especialista en contratación estatal:
1. Busque procesos y contratos de entidades públicas en Colombia.
2. Revise un proceso concreto por su número.
3. Analice la etapa precontractual, el contrato y su ejecución (adiciones, prórrogas, pagos).
4. Vea cada dato con su fuente oficial, enlace directo y fecha de consulta.
5. Lea ayudas y requisitos explicados en lenguaje sencillo, con la norma citada.

Regla de oro: la app nunca inventa datos. Si la API no devuelve un campo, muestra "No reportado en SECOP" y el enlace a la fuente.

## Fuentes (API Socrata de datos.gov.co, sin clave; token opcional para más cuota)
Base: `https://www.datos.gov.co/resource/<ID>.json`

| Conjunto | ID |
|---|---|
| SECOP II – Contratos electrónicos | `jbjy-vk9h` |
| SECOP II – Procesos de contratación | `p6dx-8zbt` |
| SECOP II – Ejecución de contratos | `mfmm-jqmq` |
| SECOP II – Adiciones | `cb9c-h8sn` |
| SECOP II – Facturas | `ibyt-yi2f` |
| SECOP II – Proveedores registrados | `qmzu-gj57` |
| SECOP II – Plan Anual de Adquisiciones | `b6m4-qgqv` |
| SECOP I | `xvdy-vvsk` |

Campos ya conocidos en contratos (`jbjy-vk9h`): `id_contrato`, `nombre_entidad`, `departamento`, `modalidad_de_contratacion`, `estado_contrato`, `valor_del_contrato`, `fecha_de_firma`, `proveedor_adjudicado`, `documento_proveedor`, `proceso_de_compra`, `descripcion_del_proceso`, `objeto_del_contrato`, `urlproceso` (objeto con clave `url` → enlace directo al SECOP).
Campos conocidos en procesos (`p6dx-8zbt`): `entidad`, `fase`, `modalidad_de_contratacion`, `estado_del_procedimiento`.

PRIMER PASO OBLIGATORIO: consultar `?$limit=1` de cada conjunto y guardar el esquema real de campos en `docs/esquemas.md` antes de programar. Los nombres de los demás conjuntos no están verificados.
Para adiciones, ejecución y facturas, la unión se hace por `id_contrato` (usar filtro exacto si el campo existe; si no, `$q=<id_contrato>`).

Enlaces de verificación manual que la app debe mostrar:
- Búsqueda pública SECOP II: https://community.secop.gov.co/Public/Tendering/ContractNoticeManagement/Index
- SECOP I: https://www.contratos.gov.co/consultas/inicioConsulta.do
- Datos abiertos CCE: https://www.colombiacompra.gov.co/transparencia/datos-abiertos/conjuntos-de-datos-abiertos

## Módulos v1
1. **Buscar**: texto libre, entidad, NIT del proveedor, modalidad, departamento, rango de valor y fechas. Resultados paginados con enlace al SECOP.
2. **Ficha del proceso/contrato**: datos clave, línea de tiempo, enlace a la fuente y fecha de consulta.
3. **Análisis de ejecución**: suma de adiciones vs. valor inicial, prórrogas, facturas y pagos.
   Alerta si las adiciones superan el 50 % del valor inicial (Ley 80 de 1993, art. 40, parágrafo), expresado en SMMLV cuando aplique.
4. **Análisis precontractual (checklist guiado)**: estudios previos, análisis del sector, justificación de la modalidad, plazos del cronograma, requisitos habilitantes, adendas. Alertas: plazos muy cortos, proponente único, contratación directa repetida con el mismo proveedor.
5. **Ayudas**: etapas de la contratación y modalidades (licitación, selección abreviada, concurso de méritos, mínima cuantía, contratación directa) explicadas en sencillo, citando Ley 80/1993, Ley 1150/2007, Decreto 1082/2015 y Ley 2195/2022.
6. **Exportar** ficha y análisis a PDF con fuentes citadas.

## Técnica sugerida (mínimo que funcione)
- HTML + JS sin framework (o Vite), una sola página, diseño responsive, manifest para instalar en el celular.
- `fetch` directo a la API Socrata (permite CORS). Caché local de consultas.
- Sin backend en v1. Sin cuentas de usuario.
- Pruebas: una prueba por regla de alerta (p. ej., cálculo del 50 % de adiciones).

## Revisión jurídica
Cada alerta y cada texto de ayuda debe citar la norma. El abogado valida las reglas antes de darlas por buenas. La app es apoyo de revisión y no reemplaza el análisis del expediente completo en SECOP.
