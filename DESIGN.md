---
name: Radar Contractual
description: Un contrato público como recorrido con estaciones, tablero de cifras y texto anotado con su norma.
colors:
  azul-marino: "#0b192c"
  cian-contractual: "#00e5ff"
  cian-activo: "#00b8cc"
  verde-publico: "#00a86b"
  verde-boton-publico: "#008553"
  verde-activo-publico: "#006e45"
  amarillo-semaforo-revisar: "#ffcd00"
  suelo: "#f8fafc"
  papel: "#ffffff"
  panel: "#f1f5f9"
  titulos: "#1e293b"
  texto-suave: "#64748b"
  regla-fina: "#e2e8f0"
  borde-campo: "#94a3b8"
  enlace-contractual: "#007a99"
  enlace-publico: "#007a4d"
  rubrica: "#b3261e"
  alerta: "#c4261b"
  revisar: "#7a5200"
  sin-alerta: "#0e7a4a"
  linea-precontractual: "#1e6bff"
  linea-ejecucion: "#1fa05a"
  linea-alerta: "#e4002b"
  linea-revisar: "#f5a300"
  linea-neutra: "#8e9bbf"
  franja-texto-suave: "#b9c3de"
  franja-regla: "#2a3a66"
  franja-oscura: "#060b1c"
  etapa-precontractual: "#7fb0ff"
  etapa-ejecucion: "#6fd69f"
  estacion-alerta-texto: "#ff9aa8"
  estacion-alerta-detalle: "#ffc2cb"
  senal-alerta: "#d92d20"
  boton-activo: "#1d2f63"
  amarillo-activo: "#ffdc4d"
  alerta-fondo: "#fdecea"
  revisar-fondo: "#fff4cc"
  sin-alerta-fondo: "#e4f4eb"
  informacion-fondo: "#e7edfc"
  sin-datos: "#5b6782"
  impresion-tinta: "#000"
  impresion-suave: "#333"
typography:
  titulo-franja:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.18
  cifra-tablero:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 800
    lineHeight: 1.1
  seccion:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.25
  alerta-titulo:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 600
    lineHeight: 1.3
  cuerpo:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  subtitulo:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
  dato:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 400
    lineHeight: 1.5
  nota:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.84rem"
    fontWeight: 400
    lineHeight: 1.45
  rotulo:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  fina: "2px"
  etiqueta: "3px"
  aviso: "4px"
  linea: "5px"
  campo: "6px"
  pildora: "99px"
spacing:
  campo: "10px 12px"
  entre-secciones: "40px"
  margen-pagina: "20px"
components:
  boton-principal:
    backgroundColor: "{colors.azul-medianoche}"
    textColor: "{colors.papel}"
    rounded: "{rounded.pildora}"
    padding: "8px 18px"
    height: "44px"
  boton-principal-franja:
    backgroundColor: "{colors.amarillo-vial}"
    textColor: "{colors.azul-medianoche}"
    rounded: "{rounded.pildora}"
  boton-secundario:
    backgroundColor: "transparent"
    textColor: "{colors.azul-medianoche}"
    rounded: "{rounded.pildora}"
  campo:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.azul-medianoche}"
    rounded: "{rounded.campo}"
    padding: "{spacing.campo}"
  celda-tablero:
    backgroundColor: "{colors.amarillo-vial}"
    textColor: "{colors.azul-medianoche}"
    padding: "12px 18px 14px"
---

# Design System: Radar Contractual

> **Paletas (2026-11-18, pedidas por el abogado):** las dos apps comparten azul marino `#0b192c`, fondo `#f8fafc`, tarjetas blancas con borde `#e2e8f0`, títulos `#1e293b` y texto secundario `#64748b`. Radar Contractual usa acento cian `#00e5ff` (texto `#0b192c`, hover `#00b8cc`); Radar Público, verde `#00a86b` (botón sólido `#008553` con texto blanco por contraste, hover `#006e45`), secciones en tarjetas y alertas en semáforo. El amarillo `#ffcd00` queda solo para la señal "Revisar". El tablero de cifras son tarjetas blancas con franja del acento. Pie con la firma "© 2026 • Desarrollado por Juan José Huérfano Corredor". Lo que diga abajo sobre el amarillo vial o "sin tarjetas" quedó reemplazado. Fuente: Inter en todo (`fonts/inter-latin.woff2`); lo que diga abajo sobre Hanken Grotesk y Source Serif 4 quedó reemplazado.

## Overview

Revisor SECOP muestra un contrato público como tres cosas que el abogado ya conoce: un **recorrido con estaciones** (la ruta del contrato, tomada de los mapas de metro), un **tablero de cifras** (la valla informativa de toda obra pública) y un **texto anotado** (los códigos de hojas sustituibles, con la norma al margen). El usuario pidió esa mezcla el 2026-11-12. La app no usa tarjetas, sombras ni píldoras decorativas: la jerarquía la llevan el tamaño de la letra, las reglas y tres campos de color.

Todo vive en `css/app.css` (tokens en `:root`) y las piezas se arman con los ayudantes de `js/vistas/comun.js`: `banda()`, `ruta()`, `tablero()`, `senal()`, `alertaHtml()` y `seccion()`.

## Colors

### Primary
- **Azul medianoche** `#0e1b3d`: barra, franja del título, texto, reglas gruesas y botón principal sobre el suelo. En tema oscuro la franja baja a `#060b1c`.

### Secondary
- **Amarillo vial** `#ffcd00`, siempre con tinta azul medianoche. Solo en tres sitios: el tablero de cifras, la acción principal dentro de la franja y la señal de "revisar". También marca la pestaña activa en celular y la selección de texto.

### Tertiary
- **Líneas de la ruta**: azul `#1e6bff` (precontractual), verde `#1fa05a` (ejecución), rojo `#e4002b` y ámbar `#f5a300` para el tramo que llega a una estación en alerta o por revisar.
- **Rúbrica** `#b3261e`: la numeración de secciones y alertas (§ 1, 1.2), como en los códigos.

### Neutral
- **Suelo frío** `#f3f5fa`, sin tarjetas encima. Campos en blanco `#ffffff` con borde `#8e9bbf`. Reglas finas `#c9d1e4`. Texto secundario `#46557a`.
- Tema oscuro: suelo `#0a1024`, campos `#121b38`, texto `#e8ecf7`, texto secundario `#a7b3d3`.

### Named Rules
- **El nivel no depende del color.** Cada nivel de alerta tiene forma propia: octágono (alerta), rombo (revisar), círculo (sin alerta), cuadrado (información), círculo punteado (sin datos). Además se escribe en la nota del margen.
- **El amarillo no decora.** Si aparece fuera de sus tres sitios, sobra.
- **Lo no reportado se ve.** Una estación sin fecha va punteada y dice "No reportado en SECOP".

## Typography

Dos familias, servidas desde `fonts/` (licencia SIL OFL): **Hanken Grotesk** para interfaz, datos y cifras; **Source Serif 4** para títulos de sección, alertas y textos de norma y de ayuda.

### Hierarchy
- Título de la franja: Hanken Grotesk 800, 1.625rem (1.3rem en celular), hasta 4 líneas.
- Cifra del tablero: Hanken Grotesk 800, 1.9rem, cifras tabulares.
- Sección: Source Serif 4 700, 1.4rem, con regla superior de 2px y número en rúbrica.
- Alerta: título Source Serif 4 600 a 1.12rem; cuerpo Source Serif 4 400 a 0.97rem, máximo 68 caracteres por línea.
- Rótulos (encabezados de tabla, subtítulos, etapas de la ruta): Hanken Grotesk 700, 0.72rem, mayúsculas, 0.1em de espaciado.
- Escala única de tamaños: 0.72, 0.84, 0.94, 1, 1.12, 1.25, 1.4, 1.625 y 1.9rem. No agregues tamaños intermedios.
- Campos de formulario: siempre 1rem (16px) para que iOS no amplíe la página.

### Named Rules
- **Sin rótulo encima del título.** Los datos de identificación (tipo, número, entidad) van en una línea debajo del título de la franja, nunca arriba.

## Layout

Columna de 1120px con 20px de margen (16px en celular). Cada vista abre con la franja azul (`.cielo`), que se extiende de borde a borde con una sombra y no saca el contenido de la columna. Debajo, el tablero; luego las secciones numeradas, separadas 40px. Una alerta es una rejilla de tres columnas: señal, texto y nota al margen (200–300px). En celular (hasta 760px, solo en pantalla) la ruta pasa a vertical, el tablero a una columna con rótulo a la izquierda y cifra a la derecha, y la nota baja debajo de la alerta. Los resultados de búsqueda son filas con tres columnas fijas: contrato, proveedor y valor.

## Elevation & Depth

No hay sombras de elevación. La profundidad es de dos planos: franja azul y suelo frío. La única sombra del sistema es técnica: la que extiende la franja a todo el ancho.

## Shapes

Botones y pestañas en píldora (99px). Campos con 6px. Etiquetas rectangulares con 3px. El tablero no tiene radios: celdas con borde de 3px en azul medianoche, como una lámina. Estaciones circulares de 38px con anillo.

## Components

### Buttons
Píldora de 44px de alto, peso 700. Principal: fondo azul medianoche sobre el suelo, amarillo dentro de la franja. Secundario: transparente con borde de 2px. Estados: hover (más claro), active (baja 1px), disabled (50 %), foco con contorno de 2px (amarillo dentro de la franja).

### Chips
`.chip`: píldora baja con borde fino, para valores de referencia. `.etiqueta`: rectángulo pequeño en mayúsculas, para SECOP I / SECOP II y estados.

### Cards / Containers
No hay tarjetas. `.seccion` es un bloque con regla superior y título numerado; `.tarjeta` es un bloque sin número (formularios y mensajes).

### Inputs / Fields
Blanco, borde `#8e9bbf`, radio 6px, 1rem. Rótulo encima en 0.9rem y peso 600.

### Navigation
Barra azul fija arriba: marca a la izquierda, pestañas en píldora (blanca la activa) y Ajustes como ícono. En celular las pestañas bajan a una barra azul inferior con íconos y una marca amarilla sobre la activa.

### Ruta (firma del sistema)
`ruta(estaciones, etiqueta)`: lista ordenada dentro de la franja. Las estaciones van en orden, no a escala. Cada tramo toma el color de su etapa o del nivel de la estación a la que llega. Estados de estación: normal (blanca), alerta (roja y más grande), revisar (ámbar), cerrada (verde), pico (amarilla), pendiente o no reportada (punteada), menor (pequeña, para modificaciones). Tocar una estación lleva a la sección que la explica y la resalta un momento (`activarRuta`).

### Tablero
`tablero(celdas)`: celdas amarillas con rótulo en mayúsculas y cifra grande. Se usa una vez por vista, justo debajo de la franja.

### Alerta anotada
`alertaHtml(regla, resultado, detalle)`: señal por forma, título numerado y cuerpo en serif; al margen, el nivel, la norma y el aviso de que es informativa.

## Do's and Don'ts

### Do:
- Abrir cada vista con `banda()` y poner los datos de identificación debajo del título.
- Usar `seccion()` para todo bloque de datos, de modo que quede numerado y se pueda citar.
- Mostrar la fuente al final de cada sección con `fuenteChip()`.
- Revisar el contraste en claro y oscuro después de cambiar un color.

### Don't:
- No usar tarjetas blancas con sombra, píldoras de color ni franjas laterales de color.
- No usar el amarillo como adorno ni el rojo fuera de alertas y rúbrica.
- No reutilizar la clase `.barra` (es la barra superior).
- No poner glifos como ✓ o ★ en lugar de íconos: los íconos son SVG propios.
- No enlazar hojas de fuentes externas: las letras se sirven desde `fonts/`.
