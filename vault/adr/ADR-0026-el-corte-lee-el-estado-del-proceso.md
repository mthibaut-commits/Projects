---
type: adr
title: "ADR-0026 · El corte del día lee el estado del PROCESO, no sólo la copia de la pestaña del tubo"
description: "La simulación ocurre en la pestaña del detalle y llega al tubo por postMessage; si el corte del día pasa antes, elimina la copia del tubo, el aviso se descarta y la operación renace con otro id mientras el detalle, la solicitud y el hilo siguen hablando de la anterior. Desde hoy la versión emitida y la pre-evaluación pedida —repositorios— cuentan como gestión al corte"
tags: [adr, corte-del-dia, inbound, tubo, detalle, repositorios]
estado: aceptada
fecha: 2026-09-24
reemplaza: []
relacionada: [ADR-0019, ADR-0013]
timestamp: 2026-09-24T08:30:00Z
---

# ADR-0026 · El corte lee el estado del proceso

## Contexto

Con la sesión en **Subgerente de Riesgo (N5)** el detalle de `OP-D32455` decía «Tienes 17 criterio(s) por
excepcionar · Ir a aprobar» y la mesa de Otorgamientos «OPERACIONES EN OTORGAMIENTO (0)» en sus cuatro pestañas, con
el hilo «Aprobación de excepciones · OP-D32455» a la vista en el Centro de mensajería.

Se midió: reconstruida desde el libro del cliente, la operación tiene 23 documentos, 49 criterios, 17 con la atribución
de Paula, **cero rechazos firmes** y fase «preevaluacion» con la pre-evaluación puesta — la mesa la habría listado si
la tuviera en `deals`. No la tenía. La secuencia: el ejecutivo abre el detalle (pestaña propia) con la fila del tubo en
«Sin gestión»; simula allá; el tubo se entera por `nex-simulado`. Pero el **corte del día** corre cada ~60 s reales en la
demo (`cronMs` 3500 × 17 horas) y, si pasa antes del aviso, ve la copia del tubo en Prospección sin `simulado`, la
**elimina** (regla 68), el aviso llega y se descarta —«la pestaña del detalle apunta a una operación que este tubo ya no
tiene»— y al reinicio la operación renace como `OP-D32455-R1`. El detalle, las solicitudes, la pre-evaluación y el hilo
siguen hablando de `OP-D32455`, que en el tubo no existe.

`deals` no se persiste (regla 15-bis-ter: el tubo es el dueño de la vida útil y arranca en limpio); lo que sí se
persiste y cruza pestañas son los repositorios: la versión de la simulación (regla 72, releída con el evento `storage`),
la pre-evaluación, las solicitudes, el visado y los hilos.

## Decisión

1. **La versión emitida es la oferta.** `tieneOferta(d)` mira, además de la copia (`simulado`, etapa), la versión en
   `SIM_VERSIONS` (`tieneVersion(d.id)`): la simulación deja una versión en el repositorio y el tubo la relee, así que
   el corte sabe que hay oferta aunque el aviso no haya llegado.
2. **Gestionada es con oferta o con pre-evaluación pedida.** `tieneGestion(d) = tieneOferta(d) || tienePreEval(d.id)`;
   `corteDelDia` decide con eso. Pedir la aprobación de una excepción pone la operación en la bandeja (`setPreEval`) sin
   que haga falta simular, y eliminarla dejaría a los apoderados visando lo que el tubo no lista.
3. Nada más cambia: el corte sigue eliminando lo del inbound sin gestión, el reinicio sigue re-originando con `-R<n>`
   y la regla 68 sigue entera; lo que se precisa es de dónde sale «tiene oferta».

Gates: caso **181** (con versión no se corta; con pre-evaluación no se corta; sin nada sí; y limpiando los repositorios
vuelve a cortar) y `regla_85.test.mjs` (la versión en `tieneOferta`, la pre-evaluación en `tieneGestion`, el corte con
`tieneGestion`; tres sondas).

## Alternativas descartadas

- **Persistir `deals`.** Cambia el contrato del tubo (regla 15-bis-ter: recargar la demo parte de cero) y mete ~100
  operaciones con sus facturas en `localStorage`; el síntoma se corrige con dos hechos que ya están persistidos.
- **Que el ticket abierto sea un cerrojo.** El tubo no sabe si la pestaña del detalle sigue viva, y un ticket vencido
  dejaría operaciones eternas.
- **Que el detalle se re-ate a la `-R1`.** El detalle no conoce el reinicio, y las solicitudes, la pre-evaluación y el
  hilo ya llevan el id anterior: habría que migrarlos todos.

## Consecuencias

- Una operación simulada o con pre-evaluación en el detalle sobrevive al corte aunque su fila del tubo siga en «Sin
  gestión» hasta que llegue el aviso; la mesa la lista y el hilo apunta a una operación que existe.
- Queda pendiente, y se dice: si el aviso `nex-simulado` se pierde (pestaña del tubo cerrada), la fila del tubo no
  cambia de etapa hasta el siguiente aviso; re-hidratar la etapa desde la versión es otro cambio (regla 12-bis, el dual).
