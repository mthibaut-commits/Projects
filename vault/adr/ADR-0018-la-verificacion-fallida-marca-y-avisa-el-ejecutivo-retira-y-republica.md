---
type: adr
title: "ADR-0018 · La verificación fallida marca la operación y avisa; el ejecutivo retira, re-simula y vuelve a publicar para una nueva firma"
description: "Cuando el ejecutivo de verificación no logra verificar una factura, el sistema NO la retira solo: deja la operación con un issue, notifica al ejecutivo comercial que no se podrá cursar, y es él quien saca las facturas de ese deudor, re-simula y vuelve a publicar la oferta para que el cliente firme la nueva operación. Reemplaza el retiro automático con firma vigente de la regla 13"
tags: [adr, verificacion, firma, curse, mesa]
estado: aceptado
timestamp: 2026-09-23T00:30:00Z
---

# ADR-0018 · La verificación fallida marca y avisa; el ejecutivo retira, re-simula y vuelve a publicar

## Contexto

Hoy, cuando el ejecutivo de verificación marca una factura como **no verificada**, el sistema la
**retira solo** de la oferta y la veta para esa operación; la operación **encoge** y sigue adelante con
la firma que el cliente ya dio (regla 13: «después de aceptar la operación sólo ENCOGE»; regla 24: el
recorte no re-asigna). El spec del proceso de curse (M-18) preguntó si ese camino debía comportarse como
el rechazo del comité (ADR-0015: retiro y nueva firma) o seguir como hoy. El usuario respondió
(23-09-2026):

> «Si el verificador no verifica una factura, la operación debe quedar marcada con un issue, se debe
> notificar al ejecutivo con un mensaje de que no se podrá cursar porque la oferta tiene facturas que no
> pudieron ser verificadas y el ejecutivo deberá abrir la operación y sacar esas facturas de ese deudor
> no verificado, volver a simular, y volver a ejecutar el proceso de publicar la oferta para que el
> cliente firme la nueva operación.»

## Decisión

1. Marcar una factura «no verificada» **no la retira** de la oferta. Deja la operación con un **issue**
   visible —«facturas no verificadas: no se puede cursar»— que bloquea el curse (VER-01 sigue mandando)
   y queda en la bitácora con actor y hora.
2. El sistema **notifica al ejecutivo comercial** de la operación por el centro de mensajería: cuáles
   facturas, de qué deudor, y que la operación no se cursará mientras sigan en la oferta.
3. **El ejecutivo** abre la operación, **retira las facturas del deudor no verificado**, **re-simula**
   (el evento de evaluación de ADR-0013, que emite versión) y **vuelve a publicar** la oferta. Publicar
   de nuevo revoca la firma anterior (regla 1): el cliente firma la nueva operación.
4. Las facturas retiradas por este motivo quedan **vetadas** para la operación, como hoy: no se pueden
   volver a incorporar.
5. Este camino y el del comité (ADR-0015) terminan igual —nueva firma— pero difieren en quién retira:
   el comité rechaza y el sistema retira; la verificación falla y retira el ejecutivo, porque puede
   decidir sacar más de lo estrictamente no verificado o perder la operación.

## Alternativas descartadas

- **Retiro automático y la operación sigue con la firma vigente** (estado actual, regla 13). Descartada
  por el usuario: el cliente firmó un paquete que ya no es el que se va a cursar.
- **Retiro automático y reapertura** (aplicar ADR-0015 tal cual). Descartada: la decisión de qué sacar
  y si vale la pena seguir es del ejecutivo, y el aviso es lo que la gatilla.

## Consecuencias

- Es un **T1**: cambia la máquina de estados después de la firma y reemplaza la mitad de la regla 13
  que hablaba de la verificación; la regla nueva lleva gate y caso en la suite: marcar «no verificada»
  deja el issue y el aviso, no retira; retirar y volver a publicar revoca la firma y emite versión.
- Cambian: el botón «No verificar» de la mesa y del detalle (`marcarFactura`, `verificarDeudor`,
  `noConfirmoDeudor` dejan de llamar al retiro), `verifResumenDeal` (el issue), el centro de mensajería
  (el aviso al ejecutivo), y `spec-verificacion-facturas.md` §9 y `spec-ciclo-factura.md` §14.
