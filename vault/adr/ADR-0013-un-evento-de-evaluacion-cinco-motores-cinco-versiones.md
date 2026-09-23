---
type: adr
title: "ADR-0013 · Un evento de evaluación corre los cinco motores y cada uno emite versión, con el mismo número de ejecuciones"
description: "Simular o re-evaluar es UN evento que gatilla otorgamiento, verificación, líneas, giro y pricing en paralelo; cada motor emite su versión y las cinco cuentan igual. Reemplaza los tres gestos de evaluación y la v1 retroactiva; conserva la regla 14 (el gesto es explícito)"
tags: [adr, evaluacion, versionado, motores, curse]
estado: aceptado
timestamp: 2026-09-22T22:30:00Z
---

# ADR-0013 · Un evento de evaluación corre los cinco motores y cada uno emite versión, con el mismo número de ejecuciones

## Contexto

El spec del proceso de curse (`Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md`, cláusulas M-13,
M-24, M-26 y M-36) midió que la «evaluación» del modelo no existe como un solo evento: hay **tres gestos**
—pre-evaluación, «Re-evaluar operación» y «Re-evaluación de la simulación»— que corren cosas distintas;
la verificación y las líneas se calculan al **dibujar el detalle** y sólo se congelan al emitir versión;
el pricing corre en el render; y la simulación inicial **no emite versión**: la v1 aparece retroactiva en
la primera re-evaluación. Al revisar las diferencias, el usuario decidió (22-09-2026):

> «Al presionar simular se debe generar un evento que gatille todas las evaluaciones de los motores de
> manera asíncrona pero paralela. Cada vez que el cliente simula y/o el ejecutivo simula y/o re-evalúa se
> debe volver a correr los motores. Cada motor debiera tener una versión como el motor de otorgamiento y
> siempre debieran haber la misma cantidad de ejecuciones en todos los motores.»

Y sobre el gatillo (M-12): «hoy, cuando se cambia la selección de facturas, el ejecutivo debe presionar
simular para volver a reevaluar las condiciones de la operación y todos los motores».

## Decisión

1. **Simular y re-evaluar son el mismo evento**: una evaluación. La dispara un gesto explícito del
   ejecutivo (o del cliente, por el canal que corresponda), nunca un cambio de selección por sí solo. La
   regla 14 se conserva en eso.
2. El evento corre **los cinco motores** —otorgamiento, verificación, líneas, giro y pricing— de forma
   asíncrona y en paralelo, sobre el mismo paquete de facturas.
3. **Cada motor emite una versión** por evento, y el número de versiones es **el mismo en los cinco**: la
   versión N de la operación es la tupla de las cinco versiones N. Una evaluación que no complete los
   cinco no es una versión.
4. La **primera simulación emite la v1**; no hay v1 retroactiva.
5. La versión de pricing guarda **el modo de tasa** con que se simuló (tasa ponderada o última
   operación) y **las condiciones asignadas** (descuento y comisiones), no sólo el monto (M-36).

## Alternativas descartadas

- **Re-evaluar en cada clic de selección** (lectura literal de M-12). Descartada por el usuario: el
  gesto es explícito. Cada clic emitiría versión y consultaría la API de líneas.
- **Mantener los tres gestos** y documentarlos. Descartada: tres caminos con tres resultados distintos
  es lo que impide que «la versión N» signifique algo.
- **Versionar sólo el otorgamiento** y derivar el resto en pantalla (estado actual). Descartada: la
  verificación y las líneas quedan sin evidencia cuando el detalle no está abierto.

## Consecuencias

- Es un **T1**: un invariante nuevo («cinco motores, cinco versiones, un mismo número»), con regla en el
  vault, gate y caso en la suite que emita una evaluación y cuente las versiones de los cinco motores.
- Cambian: `simularOferta` (pasa a emitir el evento y la v1), los llamadores de `reevaluarCliente`, el
  snapshot de versión (`snapVersionCli`) que hoy no contiene tasa, comisión ni anticipo, y los specs
  `spec-otorgamiento.md` §2 y `spec-gestion-excepciones.md` §4.1, que describen los tres gestos.
- Queda por confirmar qué significa «el cliente simula»: el portal de curse o el Agente IA por WhatsApp.
