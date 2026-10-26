# Revisor SECOP

App web instalable (PWA) para revisar procesos y contratos de entidades públicas de Colombia con los datos abiertos del SECOP (datos.gov.co).

- Busca contratos de SECOP I y II y procesos de SECOP II, o abre uno por su número.
- La ficha muestra datos clave, línea de tiempo, modificaciones, facturas, ejecución y el proveedor. Cada dato indica su fuente y la hora de consulta.
- Incluye alertas con la norma citada: adiciones de más del 50 % (Ley 80/1993, art. 40), plazo corto de ofertas, proponente único y contratación directa repetida. También trae un checklist precontractual guiado.
- Incluye ayudas en lenguaje sencillo y permite exportar a PDF.

La app nunca inventa datos: si SECOP no reporta un campo, lo dice. Es una herramienta de apoyo y no reemplaza la revisión del expediente completo en SECOP. Las reglas quedan pendientes de validación jurídica.

## Uso
Abre la página publicada. En el celular, usa "Agregar a pantalla de inicio" o "Instalar app".

## Desarrollo
- Servidor local: `powershell -ExecutionPolicy Bypass -File tools/servidor.ps1` → http://localhost:5173
- Pruebas de reglas: http://localhost:5173/tests/
- Esquemas reales de la API y hallazgos: `docs/esquemas.md`. Guía del proyecto: `CLAUDE.md`.
