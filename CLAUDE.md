# Radar Contractual: Búsqueda en SECOP (antes Revisor SECOP) — guía del proyecto

App web (PWA) de uso personal para un abogado de contratación estatal en Colombia. El brief original está en `docs/BRIEF.md` y los esquemas reales de los conjuntos están en `docs/esquemas.md`. Lee ambos antes de cambiar consultas.

## Reglas que no se negocian
- **La app nunca inventa datos.** Si la API no trae un campo, se muestra "No reportado en SECOP" con el enlace a la fuente. Usa `valor()` / `fmt*()` de `js/util.js`; no escribas valores por defecto.
- Cada sección de datos muestra su fuente: el conjunto, la URL exacta de la consulta y la fecha y hora de consulta (`fuenteChip()`).
- Cada alerta y cada texto de ayuda cita la norma. Las reglas están en `js/reglas.js` y su ficha jurídica en `js/normas.js`. Las alertas son una guía básica de posibles hallazgos, no conclusiones: cada una se presenta como informativa para verificar en SECOP. La pestaña Reglas solo explica cada regla (sin estado ni observaciones).

## Estructura
- `index.html`: shell y pestañas. `js/app.js`: router por hash (`#/buscar`, `#/contrato/<id>`, `#/proceso/<id>`, `#/secop1/<uid>`, `#/casos`, `#/ayudas`, `#/reglas`, `#/ajustes`).
- `js/api.js`: cliente Socrata, caché en localStorage (TTL 6 h) y token opcional `X-App-Token`.
- `js/reglas.js`: funciones puras sin DOM. Cada una tiene su prueba en `tests/reglas.test.js`.
- `js/festivos.js` (festivos de Colombia, Ley 51/1983) y `js/smmlv.js` (tabla de SMMLV).
- `js/vistas/*.js`: buscar, ficha, analisis, ayudas, reglas (incluye Ajustes y la copia de seguridad), veeduria y casos.
- `js/vistas/casos.js`: casos guardados con notas (`localStorage`, clave `casos`). El botón "Guardar en mis casos" está en las fichas y en la veeduría. Si agregas otra clave de datos del abogado, inclúyela en `CLAVES_RESPALDO` de `js/vistas/reglas.js`.
- Exportar a Excel: `aCsv()` y `descargar()` de `js/util.js`. Las celdas vacías son datos no reportados; no escribas valores por defecto en el CSV.
- Diseño: lee `DESIGN.md` antes de tocar la interfaz. Cada vista abre con `banda()` (franja azul), las fichas y veedurías llevan `ruta()` y `tablero()`, y todo bloque de datos va en `seccion()` para que quede numerado. Las alertas se pintan solo con `alertaHtml()`. Todos están en `js/vistas/comun.js`.
- Letras: Inter, servida desde `fonts/` (licencia SIL OFL, textos en la misma carpeta). No enlaces fuentes externas; si agregas un archivo de letra, inclúyelo en `ARCHIVOS` de `sw.js`.
- Íconos: `icons/icono.svg` (Radar Contractual) y `radar/icons/icono.svg` (Radar Público) son los logos. `tools/iconos.ps1` hace los PNG desde esos SVG con Edge: cambia el SVG y vuelve a correr el script. El mismo script hace `vista-previa.png` (1200×630), la imagen que sale al compartir el enlace.
- Buscadores: cada `index.html` lleva descripción, Open Graph y ficha JSON-LD con los nombres completos de las dos apps; `sitemap.xml` lista las dos URL. Si cambia un nombre, cámbialo ahí también.
- Clases CSS: `.barra` es la barra superior. No la reutilices.
- `js/vistas/veeduria.js`: veeduría de una entidad (`#/entidad/<nit>?desde=&hasta=`) o de un proveedor (`#/proveedor/<doc>`), y su buscador (`#/veeduria`). Los totales se calculan en el navegador tras quitar duplicados; no uses `$group` de la API para sumar valores (ver docs/esquemas.md, hallazgo 13).
- Publicación: GitHub Pages, desde la rama `main` de `juanjosehuerfano-lawyer/revisor-secop`. Al cambiar archivos de la interfaz, sube `VERSION` en `sw.js`.
- `sw.js` y `manifest.webmanifest`: PWA.
- **Radar Público: Veeduría SECOP** (`radar/`): segunda app, para la ciudadanía, con su propio `index.html`, manifiesto, `sw.js` e íconos (`radar/icons/`, también en `tools/iconos.ps1`). Comparte `js/` y `css/` con Revisor: arranca en `js/radar.js` y su página "Cómo leerlo" está en `js/vistas/radar.js`. Solo trae la veeduría; las fichas de contratos se abren en Revisor (`../#/contrato/…`), y Revisor enlaza a Radar desde cada veeduría. `EN_RADAR` (`js/vistas/comun.js`) cambia los textos: en Radar las alertas son "informativas, no hallazgos ni juicios" y no hay casos. Si un cambio toca archivos que usa Radar, sube también `VERSION` en `radar/sw.js`; cada service worker borra solo las cachés con su prefijo.

## Correr
- Servidor local: `powershell -ExecutionPolicy Bypass -File tools/servidor.ps1` y luego abrir http://localhost:5173. Los módulos ES no cargan desde `file://`.
- Pruebas: abrir http://localhost:5173/tests/ (también corren con `node --test tests/` si hay Node).

## Datos clave
- Adiciones SECOP II (`cb9c-h8sn`) **no trae valor**. La app lo calcula con Modificaciones a contratos (`u8cx-r425`), cuyo `valor_modificacion` es el **valor total del contrato después de cada modificación**: la adición es la diferencia con el valor anterior (`adicionesDesdeModificaciones`). El abogado la verifica y puede corregirla; lo que digita se guarda por contrato en localStorage y manda sobre el cálculo. SECOP I (`f789-7hwg`) sí trae `valor_total_de_adiciones`.
- `js/vistas/expediente.js`: proponentes, ofertas y documentos. Cargan después de pintar la ficha (`pendiente()` + `cargarOfertas()` / `cargarDocumentos()`) para no demorarla. Ofertas y Archivos vienen partidos por años: `conjuntosOfertas()` y `conjuntosArchivos()` en `js/api.js`. **Cada enero, agrega a `CONJUNTOS` el conjunto de archivos del año nuevo.** Ver docs/esquemas.md, hallazgo 18. SECOP I usa `cargarProponentesSecop1()` y `cargarDocumentosSecop1()`, unidos por el número de constancia. Los documentos se agrupan con `claseDocumento()` de `js/reglas.js` (aproximado, por nombre).
- `xvdy-vvsk` (SECOP I del brief) responde 403. Por eso se usa `f789-7hwg`.
- `jbjy-vk9h` ya expone todos los contratos (5,7 M el 2026-11-12; en octubre solo 1.000). La búsqueda va contra `rpmr-utcd` (SECOP Integrado), que cubre SECOP I y II, y la ficha lo usa como respaldo. SECOP Integrado repite filas: hay que quitar los duplicados antes de contar.
- Reglas de ejecución (inicio antes de la firma, prórrogas, liquidación, pagos en exceso): los campos y sus límites están en docs/esquemas.md, hallazgo 17. No hay regla de anticipo ni de mora en facturas porque los datos no la sostienen.
- Un proceso de SECOP II tiene una fila por fase en `p6dx-8zbt` (mismo `id_del_portafolio`). Los plazos se calculan con la primera publicación de todas las fases.
- Evita `like '%…%'` sobre URL (13–55 s). Usa igualdades o `like 'prefijo%'`. Ver docs/esquemas.md, hallazgo 12.
- Cuando cambie el SMMLV, actualiza `js/smmlv.js`.
- Búsqueda (`js/vistas/buscar.js`): cuatro fuentes en `FUENTES` (contratos, procesos SECOP II, SECOP I con procesos sin contrato, Tienda Virtual `rgxm-mmea`). El número se busca idéntico y además con `$q`, y se ordena con `claveNumero()`. El nombre del contratista va por `$q` y se filtra en el navegador. Antes de cambiar una consulta de búsqueda lee docs/esquemas.md, hallazgo 19: el mismo filtro responde en 1 s o nunca según qué tan común sea la palabra.
