---
type: adr
title: "ADR-0021 · La NC, el reclamo o la cesión a otro sobre un documento de una oferta cerrada, publicada o firmada lo inhabilitan y dejan la operación no cursable: el ejecutivo retira, re-evalúa y vuelve a firmar"
description: "Cierra la decisión #7 que ADR-0020 dejó abierta. El documento queda con su estado nuevo y marcado inhabilitado; el veto es el de la regla 67, escrito por el SII por el único escritor; cuenta como pendiente aunque la verificación telefónica esté en verde, así que VER-01 no deja cursar; el issue, el aviso, la tarjeta y la fila lo dicen; el camino de salida es el de ADR-0018"
tags: [adr, inbound, dtesync, verificacion, curse]
estado: aceptado
timestamp: 2026-09-23T16:30:00Z
---

# ADR-0021 · Sobre la oferta cerrada, publicada o firmada, la NC, el reclamo o la cesión a otro inhabilitan el documento

## Contexto

ADR-0020 modeló el A1 como flujo de eventos y aplicó cada actualización donde el documento vive, pero dejó
abierta la decisión #7 de `spec-inbound-facturas.md` §12: qué hacer cuando la nota de crédito o el reclamo
llegan sobre un documento de una oferta **publicada o firmada**. Provisoriamente el documento no se tocaba,
la bitácora avisaba y la corrida contaba el aviso. El usuario respondió el 23-09-2026:

> «Se debe dejar la oferta como no cursable, el documento debe quedar inhabilitado, el ejecutivo debería
> retirar la factura, re-evaluar, volver a firmar. Cuando una factura está reclamada, anulada y/o cedida a
> otro, quiere decir que el deudor no va a pagar esa factura (no la reconoce; por lo que es como que esté no
> verificada, al margen que la verificación telefónica haya dado por verificada), si está cedida a un
> tercero, al momento de intentar cederla el SII va a rechazar la cesión de esa factura.»

El sistema ya tenía el ciclo completo para «el deudor no reconoce el documento»: ADR-0018 (regla 67). La
mesa escribe un veto por documento y operación (`marcarNoVerificada`, único escritor), el veto cuenta como
pendiente en `verifResumenDeal` y VER-01 no deja cursar, `issueVerificacion` lo nombra en la cabecera, el
tab y el control, el sistema avisa al ejecutivo por mensajería, y es el ejecutivo quien reabre («Editar la
oferta» revoca la firma), retira, re-simula y publica de nuevo para que el cliente firme la nueva operación.

## Decisión

1. **El documento queda con su estado nuevo y marcado `inhabilitada`.** `aplicarActualizacionDTE` lo parcha
   también en la oferta cerrada, publicada o firmada; cuando lo que llega es la NC, el reclamo o la cesión a
   otro, además lo marca (motivo, glosa, secuencia, fecha) y deja la traza en rojo. La fila de la oferta lo
   rotula «Inhabilitada por el SII · <motivo>». El acuse se anota y no inhabilita.
2. **El veto es el de la regla 67, escrito por el SII.** No hay un segundo mecanismo: el tick del inbound
   decide las inhabilitaciones sobre la foto vigente del tubo, fuera de todo updater, y las escribe por
   `marcarNoVerificada` con origen «sii» (`por` = `SII · DTESync`, la entrada anota el origen y el cambio; la
   bitácora de otorgamiento dice que el SII inhabilitó; el aviso al ejecutivo sale con su propio asunto y
   dice por qué). La re-entrega no repite nada.
3. **Cuenta como pendiente aunque la verificación telefónica esté en verde.** `verifResumenDeal` cuenta todo
   documento vetado como `tel` y `pend` antes de mirar la llamada: el deudor no va a pagar, y una llamada
   más no lo destraba. VER-01 sigue mandando y lo dice; el issue titula «Documentos inhabilitados por el
   SII: no se puede cursar» (o las dos cosas, si hay vetos de la llamada); la tarjeta del tubo suma «· N por
   el SII»; `estadoCandidata` etiqueta «Inhabilitada por el SII» con la instrucción.
4. **La salida es la de ADR-0018**: el ejecutivo abre la operación, «Editar la oferta» (reabre y revoca la
   firma), retira el documento, vuelve a simular y publica de nuevo; el cliente firma la nueva operación.
   El veto impide volver a agregarlo.
5. **La cesión a otro es de la misma familia.** `bloquea` incluye `cedida`. Hoy la cesión ajena la trae el
   join con el A2 al incorporar (regla 60) y la pérdida de la oportunidad por cesión sigue en
   `evaluarPerdidas`; cuando exista el evento del A2 sobre un documento ya en una oferta cerrada, entra por
   este mismo camino.
6. **El detalle abierto ve el veto que escribió el tubo**: un oyente del evento `storage` relee el
   repositorio del veto, como el de las versiones (regla 68).

## Alternativas descartadas

- **Sólo avisar** (lo provisorio de ADR-0020): la operación seguía cursable con un documento que el deudor no
  va a pagar; el usuario lo descartó.
- **Retirar solo**: ADR-0018 ya lo descartó para la llamada fallida —qué retirar y qué más quitar es decisión
  del ejecutivo, y el cliente tiene que firmar la nueva operación—; acá vale lo mismo.
- **Perder la operación entera** (como hace `evaluarPerdidas` con la cesión a la competencia): el resto del
  paquete sigue siendo bueno; se inhabilita el documento, no la oportunidad.
- **Un veto nuevo, aparte del de la verificación**: dos mecanismos para la misma consecuencia. El usuario lo
  dijo con las palabras del que ya existe: «es como que esté no verificada».
- **Dejar que la verificación telefónica en verde lo cubra**: la señal del SII es posterior y más fuerte que
  la llamada; el usuario lo dijo explícitamente.

## Consecuencias

- Es un **T1**: cambia qué operaciones se pueden cursar. Regla 71 (`reglas/verificacion.md`, al lado de la
  67), caso 171, `regla_71.test.mjs`; el caso 170 (d) y el gate `regla_70` pasan a fijar la inhabilitación en
  vez del aviso; la viñeta de la regla 70 que decía «sólo avisan» se reescribe en el mismo commit.
- `verifResumenDeal` cuenta como pendiente TODO documento vetado, también el de la llamada fallida: es lo
  que la regla 67 quería decir con «cuentan también en `pend`», ahora sin depender de que no haya llamada.
- La pantalla (la fila «Inhabilitada por el SII», la tarjeta «· N por el SII», el hilo) queda por e2e cuando
  el stream sea determinista (CP-145); hoy la fija la suite por nombre.
- `spec-inbound-facturas.md` §12 cierra la decisión #7; §6, `spec-proceso-curse.md` §5 y M-18, el
  Levantamiento (A1), HU-01 CA-5 y CP-144/145 quedan alineados.
