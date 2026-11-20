# Radar Contractual

App web instalable (PWA) para revisar procesos y contratos de entidades públicas de Colombia con los datos abiertos del SECOP (datos.gov.co).

- Busca contratos de SECOP I y II y procesos de SECOP II, o abre uno por su número.
- La ficha muestra datos clave, línea de tiempo, modificaciones, facturas, ejecución y el proveedor. Cada dato indica su fuente y la hora de consulta.
- Incluye alertas con la norma citada: adiciones de más del 50 % (Ley 80/1993, art. 40), plazo corto de ofertas, proponente único y contratación directa repetida. También trae un checklist precontractual guiado.
- **Veeduría:** analiza en su conjunto la contratación de una entidad o de un proveedor en un periodo. Muestra la contratación por modalidad y por mes, la concentración en proveedores, la contratación directa repetida, posibles fraccionamientos frente al tope del PAA, procesos con un solo oferente y contratos con valores distintos.
- **Alertas de ejecución:** inicio de ejecución antes de la firma, prórrogas de la mitad o más del plazo, contratos terminados sin liquidación reportada y pagos por encima del valor del contrato.
- **Adiciones calculadas:** la app obtiene el valor de cada adición de SECOP II comparando el valor del contrato antes y después de cada modificación publicada.
- **Proponentes, ofertas y documentos:** cada ficha lista quién ofertó y por cuánto, y los documentos del expediente con su enlace al SECOP.
- **Casos:** guarda contratos, procesos, entidades y proveedores con tus notas, y descarga una copia de seguridad desde Ajustes.
- Incluye ayudas en lenguaje sencillo, exporta a PDF y descarga los contratos de una veeduría en un archivo para Excel (CSV).

La app nunca inventa datos: si SECOP no reporta un campo, lo dice. Es una herramienta de apoyo y no reemplaza la revisión del expediente completo en SECOP. Las alertas son una guía básica de posibles hallazgos: quien consulta debe verificarlas en el expediente del SECOP.

## Uso
Abre la página publicada. En el celular, usa "Agregar a pantalla de inicio" o "Instalar app".

## Desarrollo
- Servidor local: `powershell -ExecutionPolicy Bypass -File tools/servidor.ps1` → http://localhost:5173
- Pruebas de reglas: http://localhost:5173/tests/
- Esquemas reales de la API y hallazgos: `docs/esquemas.md`. Guía del proyecto: `CLAUDE.md`. Diseño: `DESIGN.md`.
- Letra Inter, en `fonts/`, con licencia SIL Open Font License.
