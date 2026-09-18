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
34, 35 y 36** ([`portada_y_sesion.md`](../conocimiento/reglas/portada_y_sesion.md)), con un gate de
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
  qué. Se conservó como **título de la tarjeta** (regla 35, con gate).
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

## Estado de la verificación

Los siete pasos, corridos **dos veces** (la segunda tras corregir el suelo de la portada):
`tsc` limpio · 0 duplicados · build 41,0 MB · **167 gates de contrato** (151 + 16 de los tres nuevos) ·
**140/140** la suite · **29/29** e2e · capturas regeneradas. Además se abrió la pantalla del build real
y se caminó credenciales → OTP → dashboard, sin errores de página.

## Lo que queda anotado

- **`build_app.ps1` no se pudo ejecutar** (es de Windows). La simetría con `build_app.mjs` está
  **gateada** por `regla_34.test.mjs`, no probada. Conviene que el usuario corra el `.bat` una vez.
- `marcaFondo` no está en el selector de colores de Configuración, que sólo edita `marcaPrimario`.
- Sigue abierto de la ronda anterior: el copy legal lleva em-dash y `marcaBajada` también.
