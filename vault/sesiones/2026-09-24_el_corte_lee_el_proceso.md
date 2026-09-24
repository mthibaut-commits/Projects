---
type: sesion
title: "El corte del día lee el proceso: la operación que el detalle trabaja no se elimina"
description: "Paula Reyes (N5) podía visar en el detalle y la mesa de Otorgamientos decía 0. La operación no estaba en el tubo: el corte del día la eliminó mientras el ejecutivo la simulaba en su pestaña, el aviso llegó a nadie y al reinicio renació con otro id. tieneOferta mira la versión y corteDelDia decide con tieneGestion. Regla 85, ADR-0026, caso 181"
tags: [sesion, corte-del-dia, tubo, detalle, otorgamiento, regla-85]
timestamp: 2026-09-24T08:30:00Z
---

# El corte lee el proceso · regla 85 · ADR-0026

## Qué vio el usuario

> «En el detalle de la oportunidad el Subgerente de Riesgo N5 puede aprobar la excepción, pero en el menú Otorgamiento
> general (menú superior) ese usuario no ve nada. Revísalo.»

Detalle de `OP-D32455` como Paula: «Tienes 17 criterio(s) por excepcionar · Ir a aprobar», «Tu atribución permite visar»
en C07. Mesa de Otorgamientos como Paula: «OPERACIONES EN OTORGAMIENTO (0)» en las cuatro pestañas. Y el hilo
«Aprobación de excepciones · OP-D32455» en el Centro de mensajería.

## Lo que se descartó, midiendo

1. **El rol.** Reproducido el flujo completo en una sola pestaña del tubo (Directorio, OP-DIR3, «Marcar sin comentarios y
   solicitar (N)» como Carla, sesión a Paula): la mesa lista **1 · Pre-evaluación 1** y el badge del menú dice
   «Otorgamientos 1». Paula ve lo suyo cuando la operación está.
2. **El rechazo firme.** La mesa saca de la bandeja toda operación con `estado === "rechazada"` (rechazo firme o excepción
   rechazada); reconstruida `OP-D32455` desde el libro de su cliente (76568408-0): **23 documentos, 49 criterios, 17 con
   la atribución de Paula, cero rechazos firmes**, fase «preevaluacion» con la pre-evaluación puesta. La habría listado.

## La causa

La operación **no estaba en `deals`** del tubo. La fila del tubo de la mañana decía «Sin gestión»; el detalle, «Oferta y
Negociación». El corte del día (regla 68) corre cada ~60 s reales en la demo (`cronMs` 3500 por hora, 17 horas de
06:00 a 23:00): vio la copia del tubo en Prospección sin `simulado`, la eliminó, el `nex-simulado` del detalle llegó
después y se descartó —el receptor lo dice en el log: «la pestaña del detalle apunta a una operación que este tubo ya no
tiene»— y al reinicio renació como `OP-D32455-R1`. Solicitudes, pre-evaluación e hilo quedaron colgando de `OP-D32455`.

`deals` no se persiste (regla 15-bis-ter, el tubo es el dueño de la vida útil); lo que sí cruza pestañas y sobrevive
son los repositorios: la versión (regla 72), la pre-evaluación, las solicitudes, el visado, los hilos.

## Lo que quedó

- `tieneVersion(id)` lee `SIM_VERSIONS`; `tieneOferta(d)` la suma a `simulado`/etapa: la versión emitida ES la oferta,
  esté o no en la copia de la pestaña.
- `tieneGestion(d) = tieneOferta(d) || tienePreEval(d.id)`; `corteDelDia` decide con eso. La regla 68 sigue entera.
- Caso **181**, `regla_85.test.mjs` (tres sondas), ADR-0026 con las alternativas (persistir `deals`, el ticket como
  cerrojo, re-atar el detalle a la `-R1`).
- **Lo que no arregla:** si el aviso se pierde del todo, la fila sobrevive pero sigue en «Sin gestión» hasta el próximo
  aviso; re-hidratar la etapa desde la versión toca el dual de la regla 12-bis y queda dicho en el tablero.

## Verificación

Prettier y ESLint limpios · `tsc` sin TS1 · 0 duplicados · build OK · **619/619** gates (los 5 de `regla_85` con tres
sondas) · suite **181/181** (`CASOS_ESPERADOS` 180 → 181) · e2e **41/41**. Sin capturas: el cambio no toca la pantalla.
