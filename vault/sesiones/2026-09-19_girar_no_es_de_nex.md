---
type: sesion
title: "Girar no es una acción de NEX: el sistema termina en la inyección a Tesorería"
description: "Corrección de alcance del usuario. El giro lo autoriza Operaciones al verificar cuatro cosas y aprobar la integración; eso inyecta en Tesorería, que gira. moverEtapa deja de tratar «giro» como transición manual —sin guardas ni rechazos, el control es del otro sistema— y queda anotado que no sabemos cómo nos enteraremos del giro"
tags: [sesion, alcance, giro, tesoreria, regla-37, regla-24]
timestamp: 2026-09-19T00:30:00Z
---

# Girar no es de NEX

## La corrección, y cómo llegó

Venía a cerrar cuatro pendientes y el usuario paró la sesión con una corrección de **alcance**, no de
detalle: *«se gira cuando el área de operaciones autoriza la operación y eso ocurre en otro sistema»*. El
pipeline comercial llega hasta que **Operaciones** verifica cuatro cosas —adjuntos de las excepciones
verídicos, facturas verificadas, excepciones hechas, líneas que cubren los requisitos—, aprieta el botón de
operación verificada, y eso **inyecta en el sistema de Tesorería**. Tesorería gira.

Lo primero que hice fue leerlo de vuelta contra el código, y me equivoqué en la primera lectura: sospeché
que la etapa `giro` era NEX arrogándose el desembolso. No lo es. `stage: "giro"` con `giroPendiente: true`
da «**Pendiente de Giro · integrada al core**» y sin él, «Girada»: la etapa modela la **entrega** y la
noticia, no el desembolso. El comentario de GIR-02 ya lo decía con esas palabras — *«Girar es entregarle la
operación a Tesorería»*. Conviene recordarlo: el código tenía razón y yo leí mal.

Las cuatro verificaciones de Operaciones mapean casi uno a uno con invariantes que ya existen: O05/GIR-02
(los adjuntos), VER-01 (las facturas), OTG-02 (las excepciones) y LIN-01 (la línea). Y el botón existe:
«Aprobar integración al core», Operaciones N3+, con **tres guardas antes de escribir**. Ese camino estaba
bien construido.

## El defecto

Había un **segundo** camino a `stage: "giro"`: el «Avanzar a» del menú y el arrastre del Kanban, que entran
por `moverEtapa`. Ese camino pedía sólo firma del cliente y huella — **no** que Operaciones hubiera
aprobado la integración, **ni** atribución de Operaciones. Un comercial dejaba la operación en «Pendiente
de Giro» sin que Operaciones verificara nada, y sin inyectar nada a Tesorería.

## El arreglo, y por qué el primero era el equivocado

El primer intento fue **guardar** esa transición: exigir `integracion === "aprobada"` y Operaciones N3, con
su rechazo auditado. El usuario lo corrigió: *«elimina los fallos en el giro, eso se controlará desde otro
sistema»*. Y tiene razón — guardar una transición que no debería existir es resolver el problema
equivocado. Si el control es del otro sistema, NEX no rechaza: **la acción simplemente no existe**.

La función ya tenía el precedente exacto, dos líneas más arriba: «Aceptada» la fija el cliente al firmar, y
por eso `moverEtapa` la corta de plano —`if (stageId === "aceptadas") return;`— sin guarda, sin auditoría y
sin motivo. «Giro» recibe el mismo tratamiento. Se retiraron las dos guardas que había puesto y también el
bloque GIR-02 de `moverEtapa`, que quedó sin alcanzar.

**GIR-02 no se pierde**: sigue en `aprobarIntegracion`, que es el último punto ANTES de inyectar — y ése sí
es un acto de NEX. La regla 24, que citaba `moverEtapa` como el sitio de esa comprobación, se corrigió para
decir `aprobarIntegracion`: su sustancia —*la huella se compara en el último punto útil*— no sólo sobrevive,
queda más exacta.

**El menú no lo esconde en silencio.** La regla 24 dice, verbatim, que el destino «Girar» *no desaparece:
se muestra apagado con el motivo, porque desaparecer sin explicación deja al ejecutivo sin dónde enterarse
de por qué*. Así que el destino sale de la lista de clickeables pero el bloque de explicación gana una
tercera forma, `lo_autoriza_operaciones`, que dice de quién es la acción y dónde ocurre el desembolso.

## `aplicado: "externo"`, un valor nuevo y por qué hacía falta

GIR-01 —«no gira sin pasar por Cesión»— ya no se consulta en ninguna parte de NEX, y eso ahora es
**correcto**: el contrato lo declara para que el resolver lo implemente, y NEX no lo anticipa porque la
acción no es suya. Decir `funcion` sería afirmar una guarda que no existe; decir `ui` sería peor, y además
el gate de `aplicado` —escrito ayer— lo habría rechazado. Se amplió el vocabulario con `externo`, que es la
única etiqueta honesta. Es el primer invariante que la usa.

## Lo que queda anotado y es del usuario

**No sabemos cómo nos enteraremos del giro.** Hoy nada escribe `giroPendiente: false` desde afuera: no hay
callback de Tesorería, ni consulta, ni archivo. La operación queda en «Pendiente de Giro» y el paso a
«Girada» **no está modelado como noticia que llega**, que es lo que es. Decidirlo —¿push?, ¿pull como el de
estados de línea de la regla 15?, ¿batch diario?— define quién escribe ese campo y quién lo audita. Queda
en la regla 37 y en el tablero.

## Verificación

0 `prettier --check` limpio · 1 `tsc` sin TS1 · 2 sin duplicados · 3 build · 4 **208/208** contrato ·
5 **144/144** la suite · 6 e2e. La regla 37 toma el siguiente entero libre y va al final de su tema, con su
fila en `invariantes.md` y su gate (regla núcleo 3 y 8).
