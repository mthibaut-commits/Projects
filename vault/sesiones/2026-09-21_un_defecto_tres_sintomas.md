---
type: sesion
title: "Un defecto, tres síntomas: el estado del otorgamiento no salía de su pestaña"
description: "El Gerente Comercial veía la bandeja en cero con criterios suyos en el detalle, no llegaba ningún mensaje al Centro de mensajería y el Ejecutivo de verificación no podía accionar. Eran lo mismo: `PRE_EVAL` y `HILOS` eran `let` de módulo y el detalle es pestaña propia"
tags: [sesion, otorgamiento, pestanas, mensajeria]
timestamp: 2026-09-21T22:30:00Z
---

# Un defecto, tres síntomas · regla 49 · ADR-0012

## Lo que reportó el usuario, en tres mensajes distintos

> «El ejecutivo de verificación no puede accionar las acciones desde el menú verificación de las
> operaciones que fueron enviadas al comité y/o con solicitud de pre-evaluación.»
>
> «Cuando el Gerente Comercial ingresa al otorgamiento no le aparece ninguna línea pendiente siendo que
> en el detalle de otorgamiento sí se requieren de su aprobación.»
>
> «Tampoco se gatilló el mensaje en esta operación a los involucrados.»

**Era uno solo.**

## Una corrección que hay que dejar escrita

Cuando llegó el primero de esos reportes yo medí la mesa de Otorgamientos y contesté que ver cero era
**correcto**: 180 excepciones pendientes que sólo alcanzan tres cargos, porque `ROL_ATRIB` da un área y un
nivel por rol y la escalada no cruza áreas (INC-03). Eso era cierto **de esa medición**, y falso como
explicación de lo que el usuario estaba viendo. Su captura lo dejó sin discusión: el detalle listaba
`#137 · C37 · N2 · Gerente Comercial` y varios N1 que su nivel cubre, con su nombre, y la bandeja decía
cero. La lección es de método: **medí el estado de MI pestaña y lo presenté como el estado del sistema.**

## La causa

`PRE_EVAL` era un `let {}` de módulo y `HILOS` un `let []`. El detalle de la oportunidad es **pestaña
propia** desde el 02-09 (regla 15-bis-bis), y un `let` de módulo es memoria de **cada documento**.

`solicitarAprobacionExc` —el camino que el ejecutivo usa de verdad— escribe los dos:

- `setPreEval(deal.id, …)`, que es lo que habilita la bandeja (`excEnBandeja` consulta `tienePreEval`);
- `hiloEnviar(...)`, que es el mensaje al aprobador.

Los dos quedaban en el documento del detalle. La pestaña del tubo —donde se pintan **la mesa de
Otorgamientos** y **el Centro de mensajería**— no se enteraba nunca. Tres síntomas, una línea.

**Y el botón «Pre-evaluación» sí avisaba.** Tenía su `postMessage` escrito a mano junto al `onClick`; el
otro camino no. Es el mismo modo de falla que la regla 48 documentó ayer en el cierre de la oferta:
**cuando el aviso vive en el call site, el call site que se escribe después se olvida.** Por eso ahora
difunde `setPreEval`, que es el punto único por donde pasa el estado.

## Lo que se hizo (regla 49, ADR-0012)

`repoPreEval` y `repoHilos`, con la misma forma que el visado y las solicitudes de excepción, que ya eran
repositorio. Y **las dos cosas, no una**: el storage hace que sobreviva a cerrar la pestaña; el
`postMessage` hace que la pestaña que ya está abierta se entere. `BroadcastChannel` y el evento `storage`
no son opción: el entregable se abre como `file://` y cada página es un **origen único**.

Faltaba un tercer pedazo: **`repo.recargar()`**. `crearRepo` lee el storage **una sola vez** al montar el
módulo, así que una pestaña ya abierta no veía lo que otra escribía ni siquiera en los repositorios que ya
existían. `refrescarEstadoOtorgamiento()` lo corre sobre los seis del otorgamiento al recibir un aviso.

## El fallo inesperado, con causa y solución (regla núcleo 11)

**Mi primera versión de `recargar()` estaba mal, y la cazó el caso 153 antes de llegar a la pantalla.**
Vaciaba `datos` y lo rellenaba, con lo que `datos[tenant]` pasaba a ser un objeto **nuevo**… y los alias
—`PRE_EVAL`, `VISADO_STATE`, `SOLICITUD_EXC`— apuntan a ESE objeto, no a `datos`. Resultado: escribir por
el repositorio dejaba ciego al alias y al revés.

El síntoma en la suite fue precioso y engañoso: fallaron **dos** aserciones, y la segunda —«solicitar una
excepción habilita la bandeja»— no tenía nada que ver con la causa; simplemente arrastraba el estado
partido de la primera. *Solución:* `recargar` vacía y rellena **la tabla de cada tenant**, no `datos`.

Es la misma familia del `_cacheCli` del 20-09: **un lector memoizado que se queda con la referencia vieja
no falla, miente.** Por eso el caso 153 exige explícitamente que el repositorio y el alias sean la MISMA
tabla; sin esa aserción el defecto habría pasado los dos y aparecido en pantalla dentro de una semana.

## Verificación

Los seis pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **311 gates de contrato**
(+15 del gate nuevo, 14 de ellos sondas) · **153/153** la suite · **29/29 e2e**.
