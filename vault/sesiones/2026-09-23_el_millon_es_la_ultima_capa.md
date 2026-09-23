---
type: sesion
title: "Sesión 2026-09-23 — El millón es la última capa (regla 47)"
description: "El usuario pidió que las comparaciones fueran siempre en pesos. Medido: ninguna comparación de la lógica estaba en millones —eso lo cerraron el 14-09 y el 17-09—, pero quedaban cuatro puertas abiertas: un mensaje al cliente que multiplicaba por un millón, tres layouts que declaraban campos en MM$ (uno de ellos contradiciendo a su propio generador por mil), y una notación fuera de la escala única. Regla 47, con auditar_unidades cableado y su patrón (d)"
tags: [sesion, unidades, contrato, regla-47]
timestamp: 2026-09-23T14:00:00Z
feature: null
---

# Sesión 2026-09-23: el millón es la última capa

## Hecho

- **Primero medir.** La instrucción era «los M$ son siempre visuales, corrige para que las comparaciones
  sean siempre en $». Lo primero fue comprobar si alguna **comparación** de la lógica estaba en millones:
  no. Ni un identificador `*MM` en una comparación, ni un `fmtMM(...)` dentro de una, ni un umbral en
  millones contra un monto en pesos. Eso lo cerraron la migración del 14-09 y el arreglo de V03/V04/V09 del
  17-09. Lo que quedaba abierto eran **las otras puertas por las que el millón volvía a entrar**.
- **El defecto real: un mensaje al CLIENTE.** `fmtCLP((f.monto || 0) * 1e6)` en el texto que se le manda
  para pedirle los XML que faltan. El monto ya venía en pesos, así que el mensaje le mostraba **su factura
  un millón de veces más grande**. Es el resto del patrón `amountMM * 1e6` que el 14-09 retiró de todas
  partes menos de un template literal, donde nada lo buscaba.
- **Tres layouts declaraban campos en millones**, que es justo lo que la regla núcleo 9 prohíbe:
  - **A16** — `LINEA_APROBADA_MM`, y una línea de unidades que **autorizaba explícitamente** el sufijo
    `_MM` (millones). Renombrado a `LINEA_APROBADA` en pesos; la línea de unidades ahora dice que ningún
    campo va en millones. El generador y el activo regenerados, el CSV de ejemplo migrado a pesos.
  - **A3/A4** — `CUPO_SUGERIDO_MM` en MM$. A `CUPO_SUGERIDO` en pesos enteros, con su CSV.
  - **A11** — **el peor de los tres**: tres filas declaraban `number (M$)` —millones— cuando el generador
    las produce en **miles** y el lector las multiplica por mil. Quien implementara la entrega leyendo el
    layout habría enviado cifras **mil veces mayores**, y nada lo habría dicho.
- **La notación**: el explicador de criterios rendía los umbrales como `$20M`, que es exactamente la forma
  en que se veía la unidad rota del 14-09 («M$100» salía como «$100M»). Ahora rinde `M$20`.
- **Regla 47** en `reglas/datos_y_activos.md`, con su fila en `invariantes.md`. Los tres specs suben a
  **3.0.0** —es un cambio de contrato: quien implementó contra la versión anterior queda equivocado—, que
  es la primera vez que el versionado del 21-09 se usa para lo que existe.

## Decisiones tomadas con el usuario

- **El sufijo `_M` (MILES) se queda.** La regla prohíbe los millones, no los miles, y los miles están
  declarados y son consistentes de punta a punta: el generador los produce, el layout lo dice y el lector
  los pasa a pesos. Convertirlos a pesos habría tocado el generador, el activo de 34 MB, el lector y tres
  specs para contradecir una convención documentada. Lo que no puede pasar —y pasaba en A11— es que el
  layout lo llame de una forma y el sistema lo use de otra.
- **Cero es una regla, no un snapshot.** La línea base de `auditar_unidades` en el gate es 0 y se queda en
  0: el sistema no tiene ningún campo en millones, así que **ningún candidato es legítimo**. No es como
  `BASE_MUERTOS`, que se negocia.

## Errores encontrados y su solución (regla 11)

- **El auditor de unidades sólo buscaba DIVISIONES.** `DIV = /\/\s*(1e6|1000000|1e3|1000)\b/` — nunca una
  multiplicación. Por eso no vio el defecto en todo el tiempo que lleva existiendo. Entra el patrón **(d)**:
  el argumento de un formateador **multiplicado por un millón**. Verificado en las dos direcciones: sobre el
  fuente de `HEAD` reporta exactamente 1 candidato (la línea 13816) y sobre el corregido, 0.
- **(d) acotado al MILLÓN, no al mil.** La primera versión buscaba `* 1e6` y `* 1000`, y devolvió **10
  candidatos**, los diez legítimos: `fmtMM(ventasSII[i] * 1000)` y compañía, que pasan un campo en miles a
  pesos antes de formatear. Un auditor que grita diez veces por nada se apaga. El corte es principista y no
  cosmético: campos en **miles** existen y están declarados; campos en **millones** no existen, y ésa es la
  regla.
- **Y el auditor NO estaba cableado**: era un comando de mano listado en «Otros comandos». Ésa es la otra
  mitad de por qué el defecto sobrevivió. Ahora corre en `auditores.test.mjs`, con sonda negativa que planta
  las dos formas y comprueba que multiplicar por mil **no** se reporta.
- **Dos falsos positivos que conviene no volver a perseguir.** `cond: "Risk Tier $MntACHEFMorosa>180"` —el
  180 son **días**, y el `$` es de la notación de la política— y `v.ventaCruzada <= 30` —es un **porcentaje**,
  lo dice el `%` de su propio `cond`—. Los dos parecen umbrales en millones y no lo son.

## Pendiente / siguiente paso

- Subir a `main` con `merge --no-ff`, confirmando con el usuario. La rama acumula tres commits.
- `DEUDORES_AUTORIZADOS.LineaSugeridaMM` (599 filas del activo) **sigue ahí**: es un bloque BASE que ningún
  dataset regenera, nadie lo lee y no está documentado. Sacarlo es tocar un bloque base a mano, que es otra
  conversación. Queda como la deuda 1 del tablero, ahora con su regla (47) para justificarla.

## Sorpresas y aprendizajes

- **«Corrige las comparaciones» no era un pedido sobre comparaciones.** Las comparaciones estaban bien. Lo
  que estaba mal eran el **nombre** de tres campos, la **declaración** de un layout y el **texto** de un
  mensaje — todas formas de que el millón cruce que no son una comparación. Medir primero evitó pasar la
  tarde tocando lógica sana.
- **El peor de los defectos era el que nadie podía ver corriendo la app.** El de A11 sólo aparece cuando
  alguien implementa la entrega del otro lado, y se manifiesta como cifras mil veces mayores que igual se
  ven plausibles. Un spec equivocado es un defecto con un plazo de detección larguísimo.
- **El versionado del 21-09 se ganó su costo en dos días.** Tres specs que suben a 3.0.0 con la fila que
  dice qué hacer si ya lo implementaste —«multiplicar por un millón»— es exactamente para lo que existe el
  campo «Qué cambió».
