# Revisor SECOP — guía del proyecto

App web (PWA) de uso personal para un abogado de contratación estatal en Colombia. El brief original está en `docs/BRIEF.md` y los esquemas reales de los conjuntos están en `docs/esquemas.md`. Lee ambos antes de cambiar consultas.

## Reglas que no se negocian
- **La app nunca inventa datos.** Si la API no trae un campo, se muestra "No reportado en SECOP" con el enlace a la fuente. Usa `valor()` / `fmt*()` de `js/util.js`; no escribas valores por defecto.
- Cada sección de datos muestra su fuente: el conjunto, la URL exacta de la consulta y la fecha y hora de consulta (`fuenteChip()`).
- Cada alerta y cada texto de ayuda cita la norma. Las reglas están en `js/reglas.js` y su ficha jurídica en `js/normas.js`. Toda regla queda "pendiente de validación" hasta que el abogado la marque como validada en la pestaña Reglas.

## Estructura
- `index.html`: shell y pestañas. `js/app.js`: router por hash (`#/buscar`, `#/contrato/<id>`, `#/proceso/<id>`, `#/secop1/<uid>`, `#/casos`, `#/ayudas`, `#/reglas`, `#/ajustes`).
- `js/api.js`: cliente Socrata, caché en localStorage (TTL 6 h) y token opcional `X-App-Token`.
- `js/reglas.js`: funciones puras sin DOM. Cada una tiene su prueba en `tests/reglas.test.js`.
- `js/festivos.js` (festivos de Colombia, Ley 51/1983) y `js/smmlv.js` (tabla de SMMLV).
- `js/vistas/*.js`: buscar, ficha, analisis, ayudas, reglas (incluye Ajustes y la copia de seguridad), veeduria y casos.
- `js/vistas/casos.js`: casos guardados con notas (`localStorage`, clave `casos`). El botón "Guardar en mis casos" está en las fichas y en la veeduría. Si agregas otra clave de datos del abogado, inclúyela en `CLAVES_RESPALDO` de `js/vistas/reglas.js`.
- Exportar a Excel: `aCsv()` y `descargar()` de `js/util.js`. Las celdas vacías son datos no reportados; no escribas valores por defecto en el CSV.
- Diseño: lee `DESIGN.md` antes de tocar la interfaz. Cada vista abre con `banda()` (franja azul), las fichas y veedurías llevan `ruta()` y `tablero()`, y todo bloque de datos va en `seccion()` para que quede numerado. Las alertas se pintan solo con `alertaHtml()`. Todos están en `js/vistas/comun.js`.
- Letras: Hanken Grotesk y Source Serif 4, servidas desde `fonts/` (licencia SIL OFL, textos en la misma carpeta). No enlaces fuentes externas; si agregas un archivo de letra, inclúyelo en `ARCHIVOS` de `sw.js`.
- Íconos de la app: `icons/icono.svg` y `tools/iconos.ps1` dibujan lo mismo; cambia los dos y vuelve a correr el script.
- Clases CSS: `.barra` es la barra superior. No la reutilices.
- `js/vistas/veeduria.js`: veeduría de una entidad (`#/entidad/<nit>?desde=&hasta=`) o de un proveedor (`#/proveedor/<doc>`), y su buscador (`#/veeduria`). Los totales se calculan en el navegador tras quitar duplicados; no uses `$group` de la API para sumar valores (ver docs/esquemas.md, hallazgo 13).
- Publicación: GitHub Pages, desde la rama `main` de `juanjosehuerfano-lawyer/revisor-secop`. Al cambiar archivos de la interfaz, sube `VERSION` en `sw.js`.
- `sw.js` y `manifest.webmanifest`: PWA.

## Correr
- Servidor local: `powershell -ExecutionPolicy Bypass -File tools/servidor.ps1` y luego abrir http://localhost:5173. Los módulos ES no cargan desde `file://`.
- Pruebas: abrir http://localhost:5173/tests/ (también corren con `node --test tests/` si hay Node).

## Datos clave
- Adiciones SECOP II (`cb9c-h8sn`) **no trae valor**. El valor de cada adición lo digita el abogado y se guarda por contrato en localStorage. SECOP I (`f789-7hwg`) sí trae `valor_total_de_adiciones`.
- `xvdy-vvsk` (SECOP I del brief) responde 403. Por eso se usa `f789-7hwg`.
- `jbjy-vk9h` ya expone todos los contratos (5,7 M el 2026-11-12; en octubre solo 1.000). La búsqueda va contra `rpmr-utcd` (SECOP Integrado), que cubre SECOP I y II, y la ficha lo usa como respaldo. SECOP Integrado repite filas: hay que quitar los duplicados antes de contar.
- Reglas de ejecución (inicio antes de la firma, prórrogas, liquidación, pagos en exceso): los campos y sus límites están en docs/esquemas.md, hallazgo 17. No hay regla de anticipo ni de mora en facturas porque los datos no la sostienen.
- Un proceso de SECOP II tiene una fila por fase en `p6dx-8zbt` (mismo `id_del_portafolio`). Los plazos se calculan con la primera publicación de todas las fases.
- Evita `like '%…%'` sobre URL (13–55 s). Usa igualdades o `like 'prefijo%'`. Ver docs/esquemas.md, hallazgo 12.
- Cuando cambie el SMMLV, actualiza `js/smmlv.js`.
