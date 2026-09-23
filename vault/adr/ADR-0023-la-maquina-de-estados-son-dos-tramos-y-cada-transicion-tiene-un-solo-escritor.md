---
type: adr
title: "ADR-0023 · La máquina de estados son DOS TRAMOS, y cada transición tiene un solo escritor"
description: "Cesión y otorgamiento no son lineales: son atributos desacoplados. Y las tres transiciones que se escribían por fuera —girar sin la compuerta de Operaciones, perder sin causa, aceptar por WhatsApp— pasan a decidirse en funciones puras de nivel módulo"
tags: [adr, etapas, transiciones, curse]
estado: aceptada
fecha: 2026-09-23
reemplaza: []
relacionada: [ADR-0015, ADR-0017, ADR-0018]
timestamp: 2026-09-23T22:00:00Z
---

# ADR-0023 · Dos tramos, y un solo escritor por transición

## Contexto

La matriz de gaps del proceso de curse (`Regresiones/Gaps_Proceso_Curse_2026-09-22.md`) dejó abiertos tres
que son el mismo defecto visto tres veces, y el propio documento lo dice en **G-30**: *«G-24, G-25 y G-26 son
síntomas de G-30 — los tres son transiciones que nadie validó porque no hay contra qué validarlas»*.

Medido sobre el fuente:

| | Qué escribía | Qué se saltaba |
|---|---|---|
| **G-24** | el `useEffect` de avance escribía `stage: "giro"` y `giroPendiente: false` | `controlesIntegracion` entero: VER-01, LIN-01, GIR-02 y la atribución de Operaciones N3 |
| **G-25** | `moverEtapa` escribía `perdida` sin causa y `cesion` sin `integracion` | la regla 5 (causa específica siempre) y la regla 26 (Pendiente Integración) |
| **G-26** | el intent `cursar` de WhatsApp escribía `clienteAcepto: true` | la regla 1: la firma es del portal |

Las tres reglas estaban escritas, numeradas y **con gate**. El gate miraba el camino que el defecto no usaba.

## Decisión

**1 · Las etapas son DOS TRAMOS, no una secuencia.** Definición del usuario, 23-09-2026: *«la cesión y
otorgamiento no son lineales, son atributos que ocurren en instancias desacopladas por naturaleza»*.

- **Tramo comercial** — `prospeccion` → `oferta`: ordenado, porque una oportunidad progresa.
- **Tramo posterior a la firma** — `aceptadas`, `cesion`, `otorgamiento`, `giro`: **sin orden interno**.
- `perdida` no está en ningún tramo: se alcanza desde cualquiera y no se sale.

La guarda de «no retroceder» se aplica **entre** tramos (del posterior a la firma al comercial: eso es
«Reabrir») y **dentro** del comercial. Dentro del posterior a la firma no hay nada que guardar.

**2 · Cada transición se decide en una función PURA de nivel módulo, y el handler sólo escribe.**
`avanceTrasOtorgamiento(deal, estado)` y `transicionManual(deal, stageId, opts)`, junto a `etapaTrasFirma`,
que ya lo era. Es lo que en producción resuelve el servidor.

**3 · `stage: "giro"` tiene UN escritor: `aprobarIntegracion`.** Es donde viven la atribución N3 y los
cuatro controles. El acumulado del día se suma ahí y no antes.

**4 · Las DOS puertas —`moverEtapa` y `moveTo`— preguntan al mismo catálogo**, y **perder deja de ser un
destino manual**: arrastrar no puede aportar un motivo de cierre, así que el gesto de perder es «Rechazar»,
que lo pide y lo guarda.

**5 · La pérdida se DELEGA en `reject`.** `transicionManual` exige `closeReason` y devuelve una delegación,
no un patch: un segundo escritor de la pérdida es el defecto, no la solución.

**6 · WhatsApp manda el enlace, no la firma.** Definición del usuario: *«WhatsApp lo que hace es enviar un
link para que el usuario ingrese a la plataforma y firme la operación tal cual como si el cierre se hubiera
hecho a través de email»*.

## Alternativas descartadas

- **Revivir `avanzarPipeline` con un timer.** La función correcta existía y estaba muerta: `avanzarRef` la
  guarda y nadie la lee. Reengancharla habría resuelto G-24 en una línea. **Descartada:** el avance es
  **event-driven a propósito** —el comentario del fuente lo dice desde que se cambió— y un timer
  reintroduce exactamente lo que se sacó. Lo que se rescató de ella es la RAMA correcta, y ahora las dos
  puertas llaman a la misma función pura.
- **Ordenar las etapas en una lista y comparar índices.** Se escribió, y el caso 172 la tumbó al primer
  intento: con `cesion` antes que `otorgamiento`, el avance normal a Pendiente Integración quedaba
  clasificado como retroceso y **bloqueado**. Descartada por el modelo del negocio, no por conveniencia.
- **Darles el mismo rango numérico a `cesion` y `otorgamiento`.** Funciona y pasa los casos. **Descartada**
  igual: esconde en un empate de enteros lo que el negocio dice con palabras. Dos tramos con nombre se leen;
  un `3` repetido hay que descifrarlo, y el siguiente que ordene la tabla lo va a deshacer sin saber.
- **Dejar que `moverEtapa` escriba la pérdida con la causa.** Más corto. **Descartada:** deja dos escritores
  de la pérdida, y mantener los dos sincronizados es el patrón de VER-01 — dos cómputos del mismo hecho que
  se separan sin que nada lo diga.
- **Quitar también `telValidado` del intent `cursar`.** El gap lo listaba junto a `clienteAcepto`. Medido, no
  es parte de la cadena de la firma: lo leen `contactoOk`, el badge de contacto y el filtro de
  contactabilidad, y significa que el teléfono es un canal válido. Quitarlo habría roto la contactabilidad
  por una razón que no es de esta regla.
- **Auditar el rechazo de una transición a «giro».** El handler audita todos los demás. **Descartada** por la
  decisión del 19-09-2026: girar no es un acto de NEX, así que acá no hay nada que rechazar ni que auditar;
  auditarlo sería NEX adjudicando algo que no le toca.

## Consecuencias

- **G-30 queda cerrado de hecho**: `TRAMO_COMERCIAL`, `TRAMO_POSFIRMA` y `transicionManual` son el catálogo
  normativo que el spec decía validar y no definía en ninguna parte. Es normativo y no medido: el código lo
  obedece porque le pregunta, no al revés.
- Agregar un destino manual es agregar una rama al catálogo, con su código de rechazo y su caso.
- `moverEtapa` pasa a tener tres parámetros (`opts`), y el `closeReason` es obligatorio para perder. Las dos
  pantallas que la llaman tienen que ofrecer el motivo de cierre como ya lo hace el menú «Rechazar».
- La regla 26 no se reemplaza: se cumple. Esta ADR no cambia el destino de ninguna transición legítima —
  cambia quién lo decide y qué se registra cuando no lo es.

**Reglas:** 76 (con 1, 5 y 26). **Casos:** 172, 173. **Gates:** `regla_76.test.mjs`, y re-anclados
`regla_5`, `regla_48` y `regla_transiciones`.
