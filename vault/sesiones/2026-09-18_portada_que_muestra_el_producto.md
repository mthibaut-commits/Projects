---
type: sesion
title: "18-09-2026 — la portada muestra el producto"
description: "Rediseño completo de la portada de ingreso tras cuatro rondas con el usuario: se descartaron tres direcciones por planas, la cuarta muestra el producto con profundidad real y capturas de Capturas_UI, el acento de marca se unifica en #703EFF, el arte pasa a ser un activo generado que embeben los dos builds, y al autenticarse el panel del dashboard crece hasta ser el sistema"
tags: [sesion, portada, marca, activos, animacion]
timestamp: 2026-09-18T18:40:00Z
---

# 18-09-2026 — la portada muestra el producto

## Qué se hizo

Rediseño completo de `LoginScreen` (104 líneas de render → 270) más la cadena de arte que lo alimenta.
La decisión y sus alternativas descartadas están en
[ADR-0005](../adr/ADR-0005-portada-que-muestra-el-producto.md); lo que queda fijado, en las **reglas
36, 37 y 38** ([`portada_y_sesion.md`](../conocimiento/reglas/portada_y_sesion.md)), con un gate de
contrato cada una.

## Cómo llegó acá (cuatro rondas)

1. Se propusieron tres direcciones —«Cesión» (una factura electrónica sangrando por el borde),
   «Columna» (una sola columna con una hairline en la línea base del titular) y «Marca» (color a
   sangre con el formulario como tarjeta)—. **El usuario las rechazó las tres.** El diagnóstico
   propio: había optimizado para «que no parezca plantilla» en vez de para lo que pidió, y las tres
   eran **más planas que lo que ya había**.
2. Preguntado qué faltaba, respondió **las cuatro opciones a la vez**: profundidad real, mostrar el
   producto, imagen, y acabado. Eso obligó a empezar de nuevo apuntando mucho más alto.
3. La cuarta dirección usa `Capturas_UI/` como imagen —son el DOM real, no maquetas—, aurora de tres
   radiales con grano, tarjeta de vidrio y profundidad de campo entre los dos paneles.
4. Después pidió animación, quitar los efectos de mouse, y **menos zoom** en el dashboard.

## Lo que se aprendió (y no hay que redescubrir)

- **Ocho scripts esperan la palabra «Bienvenido»** para saber que el HTML de 41 MB terminó de
  transpilar. Borrarla no rompe nada al instante: cuelga los 300 s del timeout y falla sin decir por
  qué. Se conservó como **título de la tarjeta** (regla 37, con gate).
- **El «zoom» del dashboard no era el encuadre sino la resolución de origen**: las capturas estaban
  tomadas a 1440 px y estiradas a 1600, o sea todo salía un 11 % más grande que su tamaño real.
  El contenedor de la app topa en **1600 px** (medido), así que se captura ahí: 1:1 y sin margen
  muerto. Capturar a 1920 fue peor —sobran 320 px de blanco a la derecha—.
- **Un fundido cruzado entre el panel y una capa nueva muestra DOS dashboards** de distinto tamaño, y
  ningún desenfoque lo tapa. La solución es que crezca el panel mismo: se mide su caja sin rotación,
  la capa se pone exactamente encima y el panel se oculta en el mismo cuadro.
- **El suelo oscuro tiene que ser del contenedor, no de la escena que se va.** En la maqueta el `body`
  era oscuro; en la app, al empujar la escena hacia el fondo aparecía el blanco de la app y la
  pantalla se blanqueaba a mitad del zoom. Sólo se vio **abriendo la pantalla del build real**, no en
  los siete pasos. Se agregó `marcaFondo`.
- **`scrollWidth` sobre-reporta con `overflow` oculto**: el chequeo de desborde mentía. Lo que hay que
  medir es si el usuario *puede* scrollear, no el ancho declarado.
- **`getAnimations()` con `fill: "forwards"` pisa el estilo en línea.** Una segunda pasada de la
  transición quedaba en negro hasta que se cancelan las animaciones de la pasada anterior.
- Al medir cuadros de una animación con Playwright, **cada `screenshot()` corre el reloj**: el
  filmstrip miente. Hay que pausar las animaciones y fijar `currentTime`.
- **La portada le salió «mucho más clara» al usuario que las muestras, y no era render.** Su navegador
  tenía la configuración del tenant de antes de ADR-0005, y `cargarCfgOper` hace
  `{ ...CFG_OPER_BASE, ...guardado }`: **lo guardado gana**. Así que seguía pintando el degradado lineal
  anterior y el CTA `#4F46E5 → #6D5BFF` aunque el fuente ya tenía los nuevos. **Los siete pasos no lo
  veían**: todos corren sobre un `localStorage` vacío, donde el default siempre gana. Se reprodujo
  inyectando la configuración v1 con `addInitScript` antes de cargar la página — y esa es la forma de
  probar cualquier cosa que dependa de datos guardados. Arreglado subiendo `SCHEMA_VERSION.cfgOper` a 2
  con una migración que retira **sólo** las tres claves de marca y conserva el resto (regla 39).
- **El zoom terminaba más grande que la app y el traspaso saltaba.** La capa estiraba la captura de
  1600 px a todo el ancho con `object-fit:cover`; la app centra su contenido con `mx-auto` y
  `max-width:1600`. En una pantalla de 2000 px el último cuadro quedaba ~25 % más grande y sin
  márgenes. Se partió la capa en blanco de página + **banda con el mismo tope**, y la geometría pasó a
  medirse contra la banda en reposo y no contra el viewport: **0 px de desfase** en posición y ancho
  (regla 38 (c)). **Sólo se ve en pantalla ancha**: a 1600 px las dos geometrías coinciden por
  casualidad, que es por qué no salió antes.
- **Un backtick en un comentario del `<style>` cierra el template literal.** Pasó al escribir la CSS de
  la banda: `tsc` lo cazó con TS1005/TS1381 y **el build no dijo nada**. Es la trampa que ya documenta
  `code_style.md`, y el paso 1 existe exactamente para eso.

## Estado de la verificación

Los siete pasos, corridos **dos veces** (la segunda tras corregir el suelo de la portada):
`tsc` limpio · 0 duplicados · build 41,0 MB · **167 gates de contrato** (151 + 16 de los tres nuevos) ·
**140/140** la suite · **29/29** e2e · capturas regeneradas. Además se abrió la pantalla del build real
y se caminó credenciales → OTP → dashboard, sin errores de página.

## Lo que queda anotado

- **`build_app.ps1` no se pudo ejecutar** (es de Windows). La simetría con `build_app.mjs` está
  **gateada** por `regla_36.test.mjs`, no probada. Conviene que el usuario corra el `.bat` una vez.
- `marcaFondo` no está en el selector de colores de Configuración, que sólo edita `marcaPrimario`.
- Sigue abierto de la ronda anterior: el copy legal lleva em-dash y `marcaBajada` también.
