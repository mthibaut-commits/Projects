---
type: sesion
title: "Sesión 2026-09-23 (tarde) — Todo generador produce en pesos (regla 48)"
description: "El usuario reemplazó la decisión de la mañana: el sufijo _M (miles) no se queda. Veinte campos de cuatro activos viajaban en miles, cuantizados de a $1.000, y dos de ellos entran en criterios que deciden (C02 y el predictor de verificación). Los cuatro generadores pasan a pesos, veinte multiplicaciones por mil desaparecen del fuente, tres specs suben de versión mayor y el caso 115 se re-ancla a una exigencia más fuerte"
tags: [sesion, unidades, generador, regla-48]
timestamp: 2026-09-23T15:00:00Z
feature: null
---

# Sesión 2026-09-23 (tarde): todo generador produce en pesos

## Hecho

- **Veinte campos de cuatro activos dejan de viajar en miles.** `verificacion.js` (V03/V04/V10),
  `plataforma360.js` (ocho montos), `riesgo_bice.js` (cuatro) y `otorgamiento.js` (el pagaré). Los campos
  pierden el sufijo `_M` y el generador emite **pesos enteros**.
- **Los acumuladores internos también.** `verificacion.js` y `plataforma360.js` acumulaban en millones
  (`p.mm += MntTotal / 1e6`) y después multiplicaban por mil para emitir. Ahora acumulan en pesos
  (`p.pesos`), que es una conversión menos y una fuente de error menos.
- **Los rangos de `riesgo_bice.js` se declaran en pesos**, no en M$: la cartera ACHEF vigente pasa de
  `[[8000, 260000], …]` a `[[8e6, 260e6], …]`, con lo que el sorteo produce cualquier peso y no sólo
  múltiplos de mil.
- **Veinte multiplicaciones por mil desaparecen del fuente**: diez en los lectores (`N("…") * 1000`) y diez
  en los sitios que formateaban (`fmtMM(x * 1000)`).
- **Tres specs suben de versión MAYOR** —A10 a 3.0.0, A11 y A16 a 4.0.0— con la fila del anexo diciendo qué
  hacer si ya se implementó: multiplicar por mil. Los tres CSV de ejemplo migrados.
- **Regla 48** en `reglas/datos_y_activos.md`, con su fila en `invariantes.md`.
- **Y los dos campos que quedaban en el activo, fuera** (instrucción del usuario a mitad de camino: «si
  nadie lo ocupa, elimínalo»). Medido sobre las **119 claves distintas** del activo quedaban dos con
  nombre de escala y **ninguna con lectores**: `DEUDORES_AUTORIZADOS.LineaSugeridaMM` (599 filas, bloque
  **BASE**) y `RequeridoParaTargetMM` del A5 (233, derivado). La derivada salió en su generador; la base
  necesitó `GeneradorDatos/sanear_campos_muertos.js`, porque **un bloque base no lo alcanza ninguna
  corrida**: se copia tal cual desde el activo de entrada. Quedan 117 claves y **cero** con escala.

## Decisiones tomadas con el usuario

- **El sufijo `_M` no se queda.** Ayer por la mañana lo dejé vivir con el argumento de que era consistente
  de punta a punta. El usuario lo reemplazó: consistente sí, pero **consistentemente cuantizado de a
  $1.000**. Tenía razón, y el argumento que faltaba es el de abajo.
- **La regla 47 no se reescribe: se marca el punto reemplazado** y se conserva el texto original tachado,
  porque explica **el criterio con el que se decidió**, que es justo lo que la 48 corrige. Es el mismo
  tratamiento que un ADR reemplazado.

## Errores encontrados y su solución (regla 11)

- **El argumento que me faltó ayer: no era sólo presentación.** `MNT_PAGARES` entra en la comparación de
  **C02** —«Pagaré con Monto Suficiente para Cartera»— contra el uso exacto de la cartera más el monto de
  la simulación: una cifra cuantizada contra un peso exacto. Y `V03`/`V04` son **denominadores de una razón
  que decide** en el predictor de verificación. Al evaluar «los miles son inofensivos» miré dónde se
  MUESTRAN los campos y no dónde se COMPARAN. La pregunta correcta ante una unidad no es «¿se ve bien?»
  sino «¿entra en una decisión?».
- **El caso 115 falló, y está bien que fallara.** Comparaba el valor leído contra `celda × 1000`, o sea
  **afirmaba el contrato viejo**. Se **re-ancló** a comparar contra la celda tal cual, que es una exigencia
  **más fuerte**: antes un ÷1.000 rompía y un ×1.000 pasaba; ahora rompe cualquier factor. No se aflojó
  nada — se quitó una conversión que el activo ya no necesita.
- **Dos sitios del fuente convertían con el comentario puesto** (`// MILES → PESOS`, líneas 41099 y 41101)
  y no aparecían en el barrido de `N("…_M")` porque leían una variable ya resuelta. Los cazó el barrido de
  `* 1000` sobre todo el archivo, que es el que hay que correr: buscar por **nombre de campo** deja fuera a
  quien ya lo guardó en una variable.

## Pendiente / siguiente paso

- Subir a `main` con `merge --no-ff`, confirmando con el usuario. La rama acumula cuatro commits.
- **Quedan dos generadores DENTRO de la app** que producen un `vol` en una escala sin declarar y lo dibujan
  como `$X MM` (`pipeline_comercial.jsx` 31429 y 31498, eje en 31357). No se tocaron acá: son parte de la
  deuda que `Auditoria/Auditoria_Generadores_En_App.md` ya levantó —la app **no debería** fabricar activos—
  y el arreglo correcto es que salgan de un activo, no reescalarlos.

## Sorpresas y aprendizajes

- **El peor de los dos campos muertos no era el inútil: era el que mentía.** `RequeridoParaTargetMM`
  guardaba **pesos** (202.175.551) bajo un nombre que dice millones. Nadie lo leía, pero el día que
  alguien lo leyera le creería al nombre y multiplicaría por un millón — que es literalmente el defecto
  que la regla 47 acababa de cerrar. Un campo que nadie usa y que miente sobre su unidad no es ruido
  inofensivo: es una mina con el seguro puesto.
- **Un bloque BASE es un punto ciego del generador.** El punto fijo garantiza que los DERIVADOS se
  reproducen; los base se copian y nadie los mira. Por eso el gate nuevo se mide sobre el **archivo** y no
  sobre el código: es el único sitio donde el defecto es observable.

- **«Consistente» no es «correcto».** El `_M` estaba declarado, el generador lo producía y el lector lo
  convertía: tres piezas de acuerdo. Y aun así perdía plata en cada valor. Una convención puede estar
  perfectamente sincronizada y ser perfectamente equivocada.
- **Quitar una unidad quita código.** Veinte campos sin sufijo se llevaron veinte multiplicaciones y dos
  acumuladores en otra escala. Cada conversión que no existe es un sitio donde nadie puede equivocarse de
  dirección — que es exactamente lo que había pasado el 17-09 (÷ en vez de ×).
- **Un test que falla al cambiar un contrato es el test haciendo su trabajo.** El 115 estaba afirmando el
  contrato viejo con su `× 1000`. La tentación es tocarlo para que pase; lo correcto era mirar si la
  exigencia nueva es **más fuerte o más débil** que la vieja. Era más fuerte, y por eso el cambio es seguro.
