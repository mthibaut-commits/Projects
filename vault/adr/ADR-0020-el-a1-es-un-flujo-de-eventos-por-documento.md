---
type: adr
title: "ADR-0020 · El A1 es un flujo de eventos por documento: la creación, la nota de crédito y el acuse llegan por separado, y el documento se pliega en un solo sitio"
description: "Cierra el modelo del activo DTESync que el usuario definió el 23-09-2026: una fila por notificación (creación y después cada cambio de estado), el pliegue a documento en un solo sitio por lado (generador y fuente, gateados iguales), el inbound aplicando las actualizaciones donde el documento vive, la migración del activo una sola vez, y la decisión que queda abierta: qué hacer con una NC o un reclamo que llega sobre una oferta publicada o firmada"
tags: [adr, inbound, dtesync, activos, eventos]
estado: aceptado
timestamp: 2026-09-23T14:00:00Z
---

# ADR-0020 · El A1 es un flujo de eventos por documento

## Contexto

El activo A1 (`DTESYNC`, 30.000 filas) traía **una fila por documento con su estado final**: el acuse, el
reclamo o la nota de crédito venían en `EstadoDTE` desde la primera y única aparición del documento. El
stream del inbound lo reproducía tal cual, así que cada factura «llegaba» una sola vez y ya decidida: una
con nota de crédito nunca había sido candidata, un acuse nunca «llegaba después», y ninguna oportunidad
recibía jamás una novedad sobre un documento que ya tenía en su pool. Dos señales de que el dato era un
marcador y no una historia, medidas el 23-09-2026: el campo `Notificacion` (22.630 `DTE_SINCRONIZADO` y
7.370 `DTE_ACTUALIZADO`) no tenía relación con las banderas —se repartía igual entre aceptadas, reclamadas
y con NC—, y las fechas de las banderas eran **tres constantes posteriores al corte** (todos los acuses el
23-06, todas las NC el 24-06, todos los reclamos el 25-06, con las emisiones terminando el 22-06).

El usuario definió el modelo el 23-09-2026:

> «Considera que los eventos de dtesync llegan varias veces para la misma factura una vez se crea (notifica
> nueva factura), después puede llegar nota de crédito, después aceptación. Considera eso para modelar el
> archivo de dtesync.»

Es lo que el servicio hace: empuja una notificación por cambio, con el envoltorio `Servicio` /
`Notificacion` / `Extras` que `spec_aecsync.md` §1.3 describe para el A2. La documentación de DTE-Sync no
fue alcanzable desde el contenedor (egreso bloqueado), así que el contenido de la notificación de
actualización se modeló con lo que el archivo ya traía.

## Decisión

1. **El A1 es un LOG de notificaciones**, en orden de llegada: una fila por evento, con `Secuencia`
   (1..n por documento) y `FchNotificacion`. La **creación** (`DTE_SINCRONIZADO`, secuencia 1) trae el
   documento entero y `EstadoDTE` sin banderas. Cada **actualización** (`DTE_ACTUALIZADO`) trae la
   identidad (`RUTEmisor`, `TipoDTE`, `Folio`), el envoltorio y el `EstadoDTE` **acumulado** a esa fecha;
   no repite el documento. El contrato de datos lo declara con esquema 2 y los tres campos del envoltorio.
2. **El documento es el pliegue de sus eventos, y el pliegue vive en un solo sitio por lado**: `plegar` en
   `GeneradorDatos/lib/dtesync.js` y `plegarDTE` en el fuente, con un gate que las corre sobre el mismo log y
   exige el mismo resultado. El evento más nuevo manda cualquiera sea el orden de llegada; los documentos
   salen por folio, el orden que el activo plano traía. `documentosDTE()` es la única lectura del log fuera
   del stream; el generador pliega una vez en `derivar` antes de entregar `DTESYNC` a los módulos.
3. **El stream recorre el log y el inbound aplica las actualizaciones donde el documento vive**: la creación
   entra como factura sin banderas; la actualización entra como evento aparte, no se clasifica ni cuenta
   como factura recibida, y parcha el documento en el acumulado, la bandeja y las oportunidades (en los
   disponibles siempre; en la oferta mientras el paquete sea del ejecutivo), sólo si es más nueva que lo que
   el documento sabe. La NC y el reclamo dejan traza en la bitácora; el acuse se anota sin traza.
4. **Sobre una oferta cerrada o publicada, o después de la firma, la NC o el reclamo no tocan el documento**:
   la bitácora deja el aviso, el documento queda marcado para no repetirlo, y la corrida cuenta los avisos.
   Lo que se cursa no cambia solo (regla 14). Qué hacer con esa operación queda abierto (Consecuencias).
5. **La migración corre una sola vez** (`migrar_dtesync_eventos.js`, commiteada como `migrar_padron.js`):
   cada documento se expande en su creación y una actualización por bandera, fechada de forma determinista
   dentro de la ventana del negocio (acuse y reclamo hasta 8 días desde la emisión, NC hasta 30) y nunca
   después de la recepción del batch. El pliegue reproduce cada documento salvo el envoltorio y esas
   fechas; los derivados salen byte a byte iguales, así que el punto fijo del generador se conserva.

## Alternativas descartadas

- **Dejar una fila por documento con el estado final** (lo de hoy): contradice el modelo del usuario y
  hace imposible que una oportunidad reciba una novedad sobre un documento que ya tiene.
- **Repetir el documento entero en cada actualización**: 19 MB más (54 MB de archivo) para no decir nada
  nuevo; con el pliegue, la creación es el maestro y la actualización trae sólo lo que cambió.
- **Conservar el orden del archivo (por folio) e intercalar las actualizaciones**: ni cronológico ni por
  folio. El log en orden de llegada es el honesto; la demo paga unos 12 segundos de documentos de mayo al
  inicio del stream, que la antigüedad (regla 65) excluye a la vista.
- **Conservar las fechas de las banderas tal como venían**: todas posteriores al corte, así que todas las
  actualizaciones llegarían después de todas las creaciones, y un batch recibido el 23-06 no puede traer
  un reclamo del 25-06.
- **Plegar en cada lector** (nueve bucles): nueve oportunidades de contar eventos como documentos. Un solo
  sitio, con gate.
- **Volver a clasificar el documento que recibe una NC mientras espera la corrida**: el análisis de origen
  de la corrida ya reporta las captadas que no califican («No califican: n con nota de crédito»), así que
  el documento parchado toma ese camino sin una segunda clasificación.

## Consecuencias

- Es un **T1**: cambia qué decide el inbound. Un documento puede ser candidato primero y quedar bloqueado
  después; el pool lo muestra bloqueado cuando llega la NC. Regla 74, caso 170, `regla_74.test.mjs` y
  `dtesync.test.mjs` (el bloque commiteado valida como log; `plegar`, `expandir`, `migrar` y `validarLog`
  sobre logs plantados).
- El archivo pasa de 35 a 46 MB; el stream tiene 55.549 eventos; «facturas recibidas» cuenta documentos,
  la Bandeja dice cuántas actualizaciones aplicó y la cola es de eventos. El panel de diagnóstico cuenta
  el A1 en documentos y dice cuántos eventos los trajeron.
- **Decisión pendiente del usuario**: qué hacer cuando una NC o un reclamo llega sobre un documento de una
  oferta **publicada o firmada**. Hoy el documento no se toca, la bitácora avisa y el sistema cuenta el
  aviso: la decisión es del ejecutivo. La regla candidata es la de ADR-0018 —marcar la operación con un
  issue, avisar, y que el ejecutivo retire, re-simule y vuelva a publicar—, pero no se decide acá.
- Los casos de la suite que muestrean el A1 leen documentos (`documentosDTE()`), así que sus mediciones
  no cambian; el orden del stream sí cambió (de mayo a junio en vez de por folio).
- `Notificacion` del archivo plano no tenía relación con las banderas; el log lo normaliza. `FchRecepcion`
  queda como venía (2026-06-23 en todas las filas): es un campo del proveedor y este ADR no lo reinterpreta.
