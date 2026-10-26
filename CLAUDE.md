# Revisor SECOP — guía del proyecto

App web (PWA) de uso personal para un abogado de contratación estatal en Colombia. El brief original está en `docs/BRIEF.md` y los esquemas reales de los conjuntos están en `docs/esquemas.md`. Lee ambos antes de cambiar consultas.

## Reglas que no se negocian
- **La app nunca inventa datos.** Si la API no trae un campo, se muestra "No reportado en SECOP" con el enlace a la fuente. Usa `valor()` / `fmt*()` de `js/util.js`; no escribas valores por defecto.
- Cada sección de datos muestra su fuente: el conjunto, la URL exacta de la consulta y la fecha y hora de consulta (`fuenteChip()`).
- Cada alerta y cada texto de ayuda cita la norma. Las reglas están en `js/reglas.js` y su ficha jurídica en `js/normas.js`. Toda regla queda "pendiente de validación" hasta que el abogado la marque como validada en la pestaña Reglas.

## Estructura
- `index.html`: shell y pestañas. `js/app.js`: router por hash (`#/buscar`, `#/contrato/<id>`, `#/proceso/<id>`, `#/secop1/<uid>`, `#/ayudas`, `#/reglas`).
- `js/api.js`: cliente Socrata, caché en localStorage (TTL 6 h) y token opcional `X-App-Token`.
- `js/reglas.js`: funciones puras sin DOM. Cada una tiene su prueba en `tests/reglas.test.js`.
- `js/festivos.js` (festivos de Colombia, Ley 51/1983) y `js/smmlv.js` (tabla de SMMLV).
- `js/vistas/*.js`: buscar, ficha, ayudas, reglas.
- `sw.js` y `manifest.webmanifest`: PWA.

## Correr
- Servidor local: `powershell -ExecutionPolicy Bypass -File tools/servidor.ps1` y luego abrir http://localhost:5173. Los módulos ES no cargan desde `file://`.
- Pruebas: abrir http://localhost:5173/tests/ (también corren con `node --test tests/` si hay Node).

## Datos clave
- Adiciones SECOP II (`cb9c-h8sn`) **no trae valor**. El valor de cada adición lo digita el abogado y se guarda por contrato en localStorage. SECOP I (`f789-7hwg`) sí trae `valor_total_de_adiciones`.
- `xvdy-vvsk` (SECOP I del brief) responde 403. Por eso se usa `f789-7hwg`.
- `jbjy-vk9h` solo expone 1.000 filas. La búsqueda va contra `rpmr-utcd` (SECOP Integrado) y la ficha usa ese conjunto como respaldo. SECOP Integrado repite filas: hay que quitar los duplicados antes de contar.
- Un proceso de SECOP II tiene una fila por fase en `p6dx-8zbt` (mismo `id_del_portafolio`). Los plazos se calculan con la primera publicación de todas las fases.
- Evita `like '%…%'` sobre URL (13–55 s). Usa igualdades o `like 'prefijo%'`. Ver docs/esquemas.md, hallazgo 12.
- Cuando cambie el SMMLV, actualiza `js/smmlv.js`.
