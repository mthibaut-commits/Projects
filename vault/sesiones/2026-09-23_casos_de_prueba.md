---
type: sesion
title: "Sesión 2026-09-23 — Casos de prueba de las cinco pantallas"
description: "96 casos de prueba sobre el tubo de Gestión diaria, el detalle de la oportunidad, Líneas, Verificación y Otorgamiento, cada uno con la regla que lo fija y su cobertura automática medida (79 automatizados, 17 manuales). Nace Casos_de_Prueba/ y entra al gate de versiones. De paso, dos cifras de code_style.md estaban desfasadas contra el fuente"
tags: [sesion, documentacion, pruebas, qa]
timestamp: 2026-09-23T02:00:00Z
feature: null
---

# Sesión 2026-09-23: los casos de prueba de las pantallas

## Hecho

- **`Casos_de_Prueba/casos-de-prueba-pantallas.md` (+ `.pdf`, 19 páginas)**: **96 casos** sobre las cinco
  pantallas del ciclo de una operación — tubo de Gestión diaria (20), detalle de la oportunidad (28),
  Líneas (16), Verificación (14) y Otorgamiento (18). Cada caso: qué se hace, qué tiene que pasar, **qué
  regla lo fija** y **si ya está automatizado**.
- **Carpeta nueva `Casos_de_Prueba/`** con su `README.md`, por el mismo criterio del 21-09: un documento
  se archiva por lo que **es**. Un plan de pruebas no es un spec (cómo funciona el negocio) ni una
  auditoría (qué se midió): es lo que alguien **ejecuta mirando la pantalla**.
- **Entra al gate de versiones.** `versiones.test.mjs` pasa a recorrer tres carpetas y a exigir **24**
  entregables; el documento declara `Versión 1.0.0` y su anexo como los demás.

## Decisiones tomadas con el usuario

- El documento cubre **las cinco pantallas que el usuario nombró**, no el producto entero. Dashboard,
  Tareas, Clientes, Reportes, Operaciones y Configuración quedan fuera y el documento lo dice.
- **Los ids llevan `CP-` adelante** (`CP-OTG-15`) para que no se confundan con los invariantes del
  contrato (`OTG-01`). No es una precaución teórica: el verificador que escribí para comprobar las citas
  **confundió las 73 ids con invariantes inexistentes** en la primera pasada, que es exactamente el error
  que un lector cometería.

## Errores encontrados y su solución (regla 11)

- **Las capturas de `Capturas_UI/` están desfasadas y no sirven como fuente de verdad.** Son del 18-09
  (commit `daf3493`) y muestran «Se puede cursar M$29,6 de M$1.094,6» cuando la regla 29 ya pasó los
  montos de documento a **pesos**. Se usaron para **descubrir** controles —son el DOM real y enumeran la
  pantalla en segundos— y cada cadena citada se **cotejó contra el `.jsx`** antes de escribirla. Ése es
  el reparto correcto: la captura descubre, el fuente decide.
- **Dos cifras de `.claude/rules/code_style.md` estaban desfasadas** y se corrigieron contra la medición
  (regla núcleo 2): `LineasView` tiene sub-tabs **Vigentes/Solicitudes** (decía «En proceso», que es sólo
  la clave interna `enproceso`) y `PresentacionComite` es un wizard de **3 pasos** —Deudores · Bienes y
  garantías · Documento— y no de 6.
- **Las cifras del propio documento salieron mal a la primera.** El §9 decía «95 casos, 59 automáticos,
  36 manuales» escrito de memoria mientras redactaba; medido da **96 · 79 · 17**. Se corrigió antes de
  generar el PDF. Un documento que cuenta algo cuenta **después** de escribirlo, no mientras.

## Pendiente / siguiente paso

- Subir a `main` con `merge --no-ff`, confirmando con el usuario.
- **Los 17 casos manuales son la deuda que este documento deja medida**, y 7 de ellos están en la **Mesa
  de verificación**: es la pantalla menos cubierta del producto. Automatizar esos siete en `tests/e2e/`
  es el trabajo que más cobertura compra por caso escrito.
- `padron.test.mjs` sigue sin fila en la tabla *Gates de contrato* de `invariantes.md` (heredado del 21).

## Sorpresas y aprendizajes

- **El vault convierte un plan de pruebas en otra cosa.** La columna «Fija» no es decoración: como cada
  regla está escrita verbatim y ganada con un incidente, un caso que falla lleva en un salto a **qué se
  esperaba y por qué**. Sin esa columna, un plan de pruebas es una lista de clics.
- **La columna «Automatizado» es el hallazgo, no el adorno.** Al llenarla honestamente —`manual` cuando no
  hay prueba— el documento terminó midiendo la cobertura real por pantalla, y lo que salió es que la Mesa
  de verificación tiene 7 de los 17 huecos. Eso no se sabía antes de escribirlo.
- **Un verificador de citas paga su costo en la primera corrida.** Comprobar que cada `e2e-…`, cada `suite
  N`, cada `regla_….test.mjs` y cada regla citada **existen de verdad** tomó veinte líneas de Python y
  habría cazado cualquier número inventado. Es el mismo patrón del cotejo de cadenas de UI: no confiar en
  lo que uno recuerda de un archivo de 50.000 líneas.
