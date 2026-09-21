---
type: sesion
title: "GIR-01 y OTG-02 en moverEtapa: se cierran los dos invariantes que sólo los sostenía el menú"
description: "El «Avanzar a» manual y el arrastre del Kanban entran por moverEtapa, que comprobaba GIR-02 y nada más. Se añade invarianteCumple —evaluar UN invariante por su código, sin copiar el predicado— y las dos guardas. Ningún invariante queda ya en aplicado: ui. Con el gate vacío que cazaron las sondas"
tags: [sesion, contrato, gir-01, otg-02, regla-24, transiciones]
timestamp: 2026-09-18T22:30:00Z
---

# Las dos transiciones que nadie comprobaba

## Qué estaba mal

`etapaTrasFirma` rutea la operación **después de que el cliente firma**, y ahí sí miran las tres compuertas:
OTG-02 (visado pendiente), VER-01 (verificación) y GIR-02 (la huella del paquete). Pero el **«Avanzar a» del
menú** y el **arrastre del Kanban** no pasan por ahí: entran por `moverEtapa`, que comprobaba GIR-02 y nada
más. O sea:

- **GIR-01** —«no gira sin pasar por Cesión»— tenía su evaluador escrito y probado (caso 136, las siete
  etapas) y **no se consultaba en ninguna parte del handler**. El menú filtra los destinos, y eso era todo.
- **OTG-02** —«no avanza a Cesión con excepciones pendientes»— igual, en el camino manual.

Los dos eran la regla 24 otra vez, y los dos estaban declarados `aplicado: "ui"`, que ahora es una afirmación
gateada: *el único control es que la pantalla esconda la acción*.

## `invarianteCumple`, y por qué no bastaba `validarMutacion`

`validarMutacion(tipo, payload)` corre **todos** los invariantes que cubren esa mutación. `oportunidad.girar`
la cubren dos —GIR-01 (la etapa de origen) y GIR-02 (la huella)— y GIR-02 ya tiene su bloque en `moverEtapa`,
que audita **las dos huellas**: lo firmado y lo actual, que es exactamente lo que se revisa después. Un
rechazo genérico habría perdido ese detalle y contado el rechazo dos veces.

Así que `invarianteCumple(codigo, mutacion, payload)`: saca el invariante de `INVARIANTES` **por su código**,
corre su `evaluar`, registra el rechazo con el mismo camino que `validarMutacion` y no bloquea si el
evaluador revienta. Lo importante es de dónde sale el predicado: **de la tabla**. Escribir
`["cesion","giro"].includes(d.stage)` a mano en el handler habría sido una segunda copia de GIR-01, y dos
copias de la misma regla se desfasan sin que nadie lo note — el gate lo prohíbe explícitamente.

Cada guarda lleva su **código literal**, no una variable. El primer intento las unificó en un solo bloque con
`const cod = esGiro ? "GIR-01" : "OTG-02"`, y el gate lo rechazó con razón: con una variable no se puede fijar
QUÉ invariante cubre QUÉ transición, que es justo lo que hay que poder leer.

## El gate vacío que cazaron las sondas

El auditor recorta el cuerpo de `invarianteCumple` con un helper `entre(src, desde, hasta)`, y el cierre era
`"function "`. Como `desde` **empieza** con `"function "`, `indexOf(hasta, i)` calzaba en el propio `desde` y
devolvía **cadena vacía**: las dos comprobaciones sobre ese cuerpo pasaban por vacuidad, y el test principal
salía verde sin vigilar nada. Lo encontraron las dos sondas que plantan la violación ahí adentro, que es
literalmente para lo que están (`.claude/rules/testing.md`: un gate que se compara consigo mismo pasa siempre).
El cierre se busca desde `i + desde.length`.

## Ya no queda ningún `aplicado: "ui"`

Los cuatro que lo decían el 18-09 por la mañana estaban **atrasados** (tenían guarda y el campo no se había
movido); los dos que lo decían de verdad se cablearon acá. La sonda del gate cambió de dirección en
consecuencia: antes exigía que quedara al menos uno en `ui` —para probar esa rama contra el fuente real—, y
ahora exige que no quede **ninguno**. La dirección «`ui` con guarda en el código» la sigue probando la
violación **plantada**, que no depende de cómo esté el fuente hoy y por eso no se apaga sola.

`validarMutacion` pasa de **un** call site a **uno más dos** consultas por código: el ítem del tablero que
decía «LIN-01, GIR-01 y ATR-01 declarados y nunca invocados» queda con LIN-01 solo, que se aplica en el motor.

## Verificación

0 `prettier --check` limpio · 1 `tsc` sin TS1 · 2 sin duplicados · 3 build · 4 **208/208** contrato ·
5 **143/143** la suite · 6 e2e · 7 capturas. `node --check tests_asignacion_lineas.js` antes de la suite, por
lo de la mezcla anterior.
