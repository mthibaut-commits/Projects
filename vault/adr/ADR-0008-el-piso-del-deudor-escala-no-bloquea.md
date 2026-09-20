---
type: adr
title: "ADR-0008 · Perforar el piso de riesgo del deudor ESCALA, no bloquea"
description: "La tercera cláusula de la regla 8 se implementa como escalón de atribución (requiereGerente) y no como bloqueo duro. Alternativa descartada, con el argumento estructural que la descarta"
tags: [adr, regla-8, pricing, atribucion]
estado: aceptado
timestamp: 2026-09-19T23:10:00Z
---

# ADR-0008 · Perforar el piso de riesgo del deudor ESCALA, no bloquea

## Contexto

La regla 8 dice: *«Fuera de atribución si el cliente pide tasa bajo el mínimo del deudor»*. Llevaba desde
siempre sin predicado en el fuente; el caso 119 la declaraba «proxy» y fijaba sólo sus insumos. El usuario
cerró la pregunta que faltaba —**cuándo** se valida— el 19-09-2026: *«la validación de la tasa se hace al
momento de simular»*.

Al implementarla aparece una segunda pregunta que las reglas no contestan sola: **qué pasa** cuando la tasa
simulada queda bajo el piso. Hay dos lecturas, y mueven plata en direcciones distintas.

## Decisión

Perforar el piso del deudor deja la operación **fuera de la atribución del ejecutivo y de la jefatura**
(`requiereGerente`): escala, y el Gerente Comercial puede autorizarla. **No** es bloqueo duro.

## Alternativa descartada

Tratarlo como `bajoMinimo` —no ofertable nunca, el mismo trato que `tasaMinAbsoluta`—, apoyándose en que la
regla 9 llama al piso *«piso de riesgo, que no se negocia»*.

Se descarta por tres razones, la tercera decisiva:

1. **La regla 8 dice «fuera de atribución»**, y en el vocabulario de este sistema eso es la escalera
   (`ok → requiereJefe → requiereGerente`), no el veto. El veto tiene su propio nombre y su propio umbral.
2. **El Agente IA ya resuelve esta misma situación escalando.** Ante una tasa bajo el mínimo del deudor
   responde *«está bajo mi mínimo autorizado … derivo tu caso a un ejecutivo para negociarla»*. Es la misma
   cláusula un nivel más abajo: quien no tiene la atribución la pasa hacia arriba, no la niega.
3. **Como bloqueo duro, `tasaMinAbsoluta` quedaría inalcanzable.** Los 12 pisos por deudor van de 0,88 % a
   1,18 % y el mínimo absoluto es 0,78 %: **todos** están por encima. Si el piso del deudor vetara, ninguna
   tasa podría llegar nunca hasta el umbral absoluto, que pasaría a ser configuración muerta — y el tenant
   la edita en pantalla. Una decisión que deja muerta una perilla que alguien puede mover es la decisión
   equivocada.

La regla 9 se sostiene igual: el piso no se negocia **en la sugerencia** —`spreadSugerido` lo trunca
siempre, y ahí no hay escalera— y no lo negocia quien está pricing a ese nivel. Lo que este ADR fija es
quién tiene la atribución cuando alguien pide perforarlo, no que sea gratis.

## Consecuencias

- `evalAtribucion` gana un quinto parámetro, `pisoDeudor`, **opcional**: sin él la conducta es exactamente
  la anterior. Los call sites que no lo pasan no cambian de veredicto.
- El orden importa y queda fijado: **primero** el mínimo absoluto (veto), **después** el piso del deudor
  (escalón). Bajo los dos, gana el veto.
- El veredicto viaja con `bajoPisoDeudor` y `pisoDeudor` para que la pantalla diga **por qué** escaló: con
  un descuento de 7 % a la vista, el rótulo «descuento sobre el máximo de jefatura» sería falso (regla 24).
- Si el negocio decide después que el piso **sí** veta, este ADR se reemplaza por uno nuevo (no se edita) y
  el cambio es de una línea: devolver `bajoMinimo` en vez de `requiereGerente`. El caso 147 lo detecta.

## Gate

Caso **149** de la suite, citado en la fila de la regla 8 de `invariantes.md`.
