---
type: sesion
title: "La tasa simulada se valida contra el mínimo del deudor: la regla 8 deja de ser proxy"
description: "El usuario contestó cuándo se valida la tasa —al simular— y eso destapó que la escalera de atribución sólo miraba un umbral global. Los 12 pisos por deudor están todos sobre él: el piso de riesgo era techo del Agente IA y no del ejecutivo"
tags: [sesion, regla-8, pricing, atribucion, adr-0006]
timestamp: 2026-09-19T23:30:00Z
---

# El piso de riesgo era techo del Agente, no del ejecutivo

## Lo que desbloqueó la respuesta del usuario

La regla 8 llevaba meses con su tercera cláusula sin predicado —*«fuera de atribución si el cliente pide
tasa bajo el mínimo del deudor»*—, y yo la traía en el tablero como **imposible de implementar**: *«el
evento que lo dispararía no existe; nadie registra que el cliente pidió tasa bajo el mínimo (1.889 de 5.520
contactos la piden, 0 marcados)»*. Esa medición era correcta y la conclusión estaba equivocada.

El usuario: **«la validación de la tasa se hace al momento de simular»**. El evento no es un contacto que
alguien registre: la petición del cliente **llega a la pantalla como la tasa que el ejecutivo simula**. Yo
había ido a buscar el disparador al generador de contactabilidad —donde efectivamente `fueraAtribucion`
está cableado en `false`— en vez de al panel donde se edita la tasa.

Vale anotar el modo de falla, porque es barato de repetir: **medí el lugar equivocado con mucha precisión**
y la precisión de la medición le dio autoridad a la conclusión. 1.889 de 5.520 es un número verdadero sobre
una pregunta que no era la que había que hacer.

## El hueco, medido sobre la tabla real

`evalAtribucion` tenía un solo piso: `tasaMinAbsoluta`, **un umbral global** (0,78 %). El mínimo del deudor
—`tasaMinIA` = `spreadMinDeudor` + costo de fondo— existía y **lo respetaba sólo el Agente IA**, que ante
una tasa bajo el mínimo responde *«está bajo mi mínimo autorizado … derivo tu caso a un ejecutivo»*. El
ejecutivo no tenía ese techo.

Los 23 deudores dan **12 pisos distintos, de 0,88 % a 1,18 %, y los 12 están por encima de la absoluta**.
De 79.487 pares (tasa original, tasa simulada) bajo el piso del deudor:

| veredicto de hoy | pares | qué significa |
|---|---:|---|
| `ok` | **5.154** | **el hueco**: el ejecutivo cierra solo bajo el piso de riesgo |
| `requiereJefe` | 3.514 | escala, pero por el % de descuento, no por el piso |
| `requiereGerente` | 70.819 | idem |

La primera medición que hice de esto dio 1.940 y estaba mal: había **inventado** los valores de varios
deudores en el script en vez de leer la tabla. El caso en rojo lo delató al primer intento (el piso salió
0,98 y yo esperaba 0,90). La segunda versión lee `SPREAD_MIN_DEUDOR` del fuente.

## La decisión que las reglas no contestaban sola → ADR-0006

¿Perforar el piso **veta** (como `tasaMinAbsoluta`) o **escala**? La regla 8 dice «fuera de atribución»
—que acá es la escalera— y la regla 9 dice «piso de riesgo, que no se negocia» —que suena a veto—.

Escala. El argumento decisivo no es textual: **como veto, `tasaMinAbsoluta` quedaría inalcanzable**, porque
todos los pisos por deudor están sobre ella. Ninguna tasa podría llegar nunca hasta el umbral absoluto y
esa perilla —que el tenant edita en pantalla— pasaría a ser configuración muerta. Lo confirma que el Agente
IA ya resuelve la misma cláusula **derivando hacia arriba**, no negándose.

## El cambio

- `evalAtribucion(orig, nueva, banda, esTasa, **pisoDeudor**)` — quinto parámetro **opcional**: sin él la
  conducta es exactamente la anterior, y el caso lo exige explícitamente.
- Orden fijado: **primero** el mínimo absoluto (veto), **después** el piso del deudor (escalón).
- `pisoTasaOperacion(deal, facturas)` — el piso de una operación es el de su deudor **más exigente**, no el
  promedio: una oferta cubre varias facturas y una tasa que perfora el piso de uno ya está bajo el mínimo
  de ese deudor. Promediar dejaría pasar justo ese caso.
- El veredicto viaja con `bajoPisoDeudor` y `pisoDeudor`, y la pantalla **dice por qué** (regla 24): con un
  descuento de 7 % a la vista, el rótulo «descuento sobre el máximo de jefatura» sería falso.

## Un defecto encontrado de paso, en el mismo texto

El panel imprimía **`CFG_ATRIB_DESCUENTO.tasaMinAbsoluta`**, y ese objeto **no tiene** ese campo: el umbral
se había mudado a política del tenant (`pol(...)`) y el comentario del fuente lo dice. Los **dos** sitios
mostraban «tasa mínima absoluta&nbsp;%.» con el número en blanco — justo el texto que le explica el piso al
ejecutivo. No lo cazaba nada: no es un símbolo (así que `auditar_muerto` no lo ve), no es una variable no
declarada (así que `eslint` tampoco), y `tsc` corre sin tipos. Lo caza mirar la pantalla.

## Dos referencias que mandaban a leer algo que no existe

El caso 119 citaba una `sonda_clausula_cliente.js` *«que queda en FALLA a propósito»*: **nunca se
commiteó**, vivía en el scratchpad de aquella sesión. Y afirmaba que la cláusula «NO tiene predicado en el
fuente», que dejó de ser cierto con este cambio. Las dos corregidas.

## Lo que NO se cerró, y por qué está escrito

El **motor O01** (`varsOperacion`) conserva una versión más débil del mismo hueco: su `tasaRef` es el
promedio ponderado de `spreadSugerido(deudor) + costoFondo` —y `spreadSugerido` sí trunca en el piso de cada
deudor— pero llama a `evalAtribucion` **sin** el piso, así que una tasa bajo el piso de UN deudor pero dentro
de la banda del promedio no levanta la excepción.

No se cerró acá por tres razones, y ninguna es que se me haya pasado: el usuario definió el momento de la
validación como **la simulación**, y O01 es la evaluación de **otorgamiento**; el mecanismo es otro (una
excepción, no un escalón de atribución); y el radio es otro — pasarle el piso crea excepciones en
operaciones que hoy pasan, que es una decisión de negocio, no una corrección. Cerrarlo es **una línea** y
necesita su propio caso. Queda en la regla 8 como punto abierto, con el diagnóstico completo.

## Verificación

0 prettier · 0-bis eslint 0 · 1 tsc sin TS1 · 2 sin duplicados · 3 build · 4 **208/208** contrato ·
5 **147/147** la suite · 6 e2e. `CASOS_ESPERADOS` sube de 146 a 147.

**El paso 7 no corresponde**: `SimResumen` se monta sólo dentro de `DealDrawer` —el detalle, en su propia
pestaña— y `capturar_pantallas.mjs` retrata las 9 vistas del menú más el login. Lo que cambia en el detalle
lo verifica el paso 6 (regla núcleo 4), y regenerar 23 capturas no deterministas no mostraría nada de esto.
