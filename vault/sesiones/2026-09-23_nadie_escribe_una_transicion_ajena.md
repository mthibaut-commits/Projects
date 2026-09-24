---
type: sesion
title: "Nadie escribe una transición ajena: tres puertas de atrás a la misma máquina de estados"
description: "G-24, G-25 y G-26 no eran tres defectos sino uno visto tres veces — la decisión estaba extraída y pura, y el escritor volvía a decidir por su cuenta. Y la primera versión de la guarda bloqueó el avance normal, porque cesión y otorgamiento no están en fila"
tags: [sesion, etapas, transiciones, curse, gates]
timestamp: 2026-09-23T23:30:00Z
---

# Nadie escribe una transición ajena · regla 80, ADR-0024

## Qué pidió el usuario

Tres instrucciones, sobre tres gaps que la matriz del proceso de curse ya tenía medidos:

> «G-24 · Tienes que hacer que se cumplan las reglas del flujo, modifícalo.»
>
> «G-25 · Debes hacer que esas transiciones sí se guarden. **Siempre que haya una pérdida se debe almacenar la
> causa que la originó, no sólo la transición a pérdida.**»
>
> «G-26 · La respuesta de WhatsApp no vale como una firma. WhatsApp lo que hace es enviar un link para que el
> usuario ingrese a la plataforma y firme la operación **tal cual como si el cierre se hubiera hecho a través
> de email**.»

Y a mitad de la implementación, la que cambió el diseño:

> «La cesión y otorgamiento no son lineales, son **atributos que ocurren en instancias desacopladas por
> naturaleza**.»

## El defecto era UNO, visto tres veces

Las reglas 1, 5 y 26 estaban escritas, numeradas y **con gate**. Los tres defectos existían igual, y el patrón
es idéntico en los tres: **la decisión estaba extraída en una función pura, y el escritor volvía a decidir por
su cuenta.** El gate miraba el camino que el defecto no usaba.

| | Escribía | Se saltaba |
|---|---|---|
| G-24 · el `useEffect` de avance | `stage: "giro"`, `giroPendiente: false` | `controlesIntegracion` entero: VER-01, LIN-01, GIR-02 y la atribución N3 |
| G-25 · `moverEtapa` | `perdida` sin causa, `cesion` sin `integracion` | la regla 5 y la regla 26 |
| G-26 · el intent `cursar` de WhatsApp | `clienteAcepto: true` en etapa `oferta` | la regla 1: la firma es del portal |

Lo de G-24 tiene además una vuelta cruel: **la función que hacía bien el recorrido existía y estaba muerta.**
`avanzarPipeline` tiene la rama correcta —a `cesion`, con `integracion: "pendiente"`— y no tiene llamador:
`avanzarRef` la guarda y nadie la lee. Y su rama y la del `useEffect` **ya se habían desfasado**:
`otorgPorExcepcion` salía de `!otorgAuto` en una y del visado en la otra.

## La corrección del usuario que cambió el diseño, medida por un caso

La primera versión de la guarda de «no retroceder» era una lista lineal:

```js
const ORDEN_ETAPA = ["prospeccion", "oferta", "aceptadas", "cesion", "otorgamiento", "giro"];
```

El **caso 172 la tumbó al primer intento**: con `cesion` antes que `otorgamiento`, el avance normal a Pendiente
Integración quedaba clasificado como **retroceso y bloqueado**. La puse en empate numérico —los dos en rango 3—
y pasó. El usuario, sin ver el código, dijo por qué: no es que empaten, es que **no están en una fila**.

Quedaron **dos tramos**: el **comercial** (`prospeccion` → `oferta`), ordenado porque una oportunidad progresa,
y el **posterior a la firma** (`aceptadas`, `cesion`, `otorgamiento`, `giro`), **sin orden interno**. La guarda
se aplica ENTRE tramos —del posterior al comercial: eso es «Reabrir»— y DENTRO del comercial.

**Y el empate numérico se descartó a propósito, aunque pasaba los casos:** esconde en un `3` repetido lo que el
negocio dice con palabras. Dos tramos con nombre se leen; el siguiente que ordene la tabla habría deshecho el
empate sin saber qué estaba deshaciendo.

## Lo que quedó

- `avanceTrasOtorgamiento(deal, estado)` y `transicionManual(deal, stageId, opts)`, **puras y de nivel módulo**,
  junto a `etapaTrasFirma`, que ya lo era. Los dos avances del otorgamiento —el del efecto y el de
  `avanzarPipeline`— llaman a la misma.
- **`stage: "giro"` tiene UN escritor**, `aprobarIntegracion`, y ahí se suma el acumulado del día: contarlo al
  completar el otorgamiento era la misma mentira por el lado del KPI.
- **La pérdida se DELEGA en `reject`**, que ya registra causa, etapa de origen, actor y fecha. Sin
  `closeReason` la transición se rechaza con código `REGLA-5`, se loguea y se audita.
- **`stage: "aceptadas"` no tiene NINGÚN escritor** en todo el fuente. Medido. Ofrecerla como destino manual
  era ofrecer un estado que el proceso no produce.
- El intent `cursar` manda el enlace y la clave. **`telValidado` se quedó**: el gap lo listaba junto a
  `clienteAcepto`, pero medido no es parte de la cadena de la firma —lo leen `contactoOk` y el badge de
  contacto— y quitarlo habría roto la contactabilidad por una razón que no es de esta regla.

## La segunda puerta, que casi se me pasa

Con `moverEtapa` ya arreglado fui a mirar si la UI podía darle el motivo de cierre, y ahí apareció: **`moveTo`,
el arrastre del Kanban, escribía `stage` DIRECTO**, con su propia copia de las guardas. O sea que G-25 no
estaba cerrado: arrastrar la tarjeta a la columna Perdida seguía perdiendo **sin causa, sin actor y sin etapa
de origen**. Es la misma lección de la regla, aplicada a mí mismo: arreglé el escritor que el gap nombraba y el
otro seguía abierto.

Ahora las dos puertas preguntan al mismo catálogo, y como **arrastrar no puede aportar un motivo de cierre**,
la pérdida deja de ser un destino manual: su gesto es «Rechazar», que lo pide y lo guarda. El menú de acciones
ya la excluía —desde antes—; el `<select>` de «Avanzar a» la ofrecía. Esa asimetría entre dos menús de la
misma pantalla era el síntoma a la vista.

## Tres cosas que aprendieron los gates

**1 · Un gate de texto tiene que mirar el CÓDIGO, no el texto.** `regla_80` prohibía el identificador
`clienteAcepto` dentro del intent y se puso rojo **con el arreglo ya hecho**: lo nombraba el COMENTARIO que
explica por qué ya no se escribe. Es la trampa del `replace` que pega en un comentario, esta vez del lado del
gate. Se quitan las líneas que son sólo comentario **antes** de canonizar —después no se puede, porque
`canonico` colapsa los saltos y un `//` se come el resto— y sólo las que **empiezan** por `//`: un `//` a media
línea puede ser el de `https://fonts.googleapis.com` del `<style>`.

**2 · Una sonda no verificó un gate: lo mejoró.** Al re-anclar `regla_5`, arrancar la guarda de terminalidad
dejaba el gate en VERDE. Causa: aceptaba cualquier `if` que nombrara «perdida» y mencionara `.stage` en
cualquier parte, y el `if (stageId !== "perdida" && … deal.stage …)` del tramo se lo regalaba. Ahora exige la
comparación misma, `origen === "perdida"`. **El gate llevaba vigilando de menos desde antes de esta sesión**, y
sólo se vio porque la sonda plantó la violación y el gate no se movió.

**3 · Re-anclar no es aflojar, y a veces es apretar.** Cuatro gates se cayeron porque el código que medían se
mudó: `regla_48` (las dos compuertas), `regla_transiciones` (la cabeza de `moverEtapa` y el rechazo del giro),
`regla_5` (la guarda de origen) y `cifras` (doce números). Ninguno bajó su exigencia: `regla_48` ahora pide
además que **los dos** avances pregunten a la función pura, y `regla_transiciones` busca el rechazo del giro en
el handler **y** en el catálogo, porque mirar sólo el handler dejaba abierta la puerta nueva — y eso también lo
demostró una sonda.

## Una decisión ajena que casi piso

El gate de transiciones defiende una corrección del usuario del 19-09: sobre «giro» **no se rechaza ni se
audita nada**, porque el control es del otro sistema. Mi `moverEtapa` nuevo auditaba todos los rechazos, GIR-01
incluido. El gate lo cazó y se respetó la decisión: `GIR-01` es el único código que calla.

## Verificación

Los ocho pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **575 gates de contrato**
(66 archivos, +8 del gate nuevo, 6 de ellos sondas) · **173/173** la suite (+2) · **37/37 e2e**.
`CASOS_ESPERADOS` sube de 171 a 173: es la decisión de haber agregado los casos 172 y 173.

**El paso 7 no aplica:** `capturar_pantallas.mjs` retrata el estado por defecto y ninguna de las tres
transiciones se ve ahí. Lo que sí queda a la vista es la **deuda 1 del tablero**: `moverEtapa` ahora exige el
motivo de cierre para perder, y las dos pantallas que la llaman todavía no lo ofrecen — el rechazo se registra
y se audita, así que no es silencioso, pero arrastrar a Perdida no hace nada hasta que esa UI exista.
