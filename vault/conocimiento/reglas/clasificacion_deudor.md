---
type: conocimiento
title: "Reglas — Clasificación del deudor: Nota y CAT"
description: "La Nota Deudor 1–5 y la CAT 1–5 por nota ponderada por monto: qué clasifican, sus cortes y por qué una oferta vacía no tiene CAT"
tags: [conocimiento, reglas, dominio]
timestamp: 2026-09-17T22:12:32Z
---

# Clasificación del deudor: Nota y CAT

> Reglas de dominio de NEX, **verbatim** desde el `CLAUDE.md` anterior al 17-09-2026, agrupadas por tema. Se citan por su número (`regla 2`) y **no se renumeran**: el fuente y otros documentos las referencian así. Índice de todas, con qué caso de la suite verifica cada una: [`invariantes.md`](../invariantes.md).
>
> Reglas en este archivo: **2** · **3**.

2. **Nota Deudor 1–5** (5 = mejor pagador) reemplazó al score 0–99 en la UI (`notaDeudor` lee la nota del A11; `NOTA_COLOR` la colorea. *Corregido el 17-09-2026 por el caso 116: `notaFromScore` nunca existió en el fuente y el score 0–99 ya no es un dato; lo que hay es la inversa, nota → score, en `verifPar`, y el veredicto no la usa*). Política de compra: nota ≥ 3,7. `NOTA_PRIORITARIA = 4,2` es el corte que abre el protocolo recortado de verificación.

3. **CAT 1–5 por nota ponderada por monto** (`catShares`/`catDeal`/`catDisp`): CAT-1 sA≥80%, CAT-2 sA≥50%, CAT-3 sA+sB≥80%, CAT-4 resto, CAT-5 si sD>5% (tolerancia) con subtipos 5A–5D. Tramos por nota (`tramoNota`): A >4,6 · B ≥3,7 · C ≥3,2 · D resto/sin nota. Se recalcula en vivo al cambiar folios. No afecta reglas de búsqueda.
    - **La CAT clasifica el paquete que se COMPRA, y por eso con la oferta VACÍA no hay CAT** (15-09-2026, pregunta del usuario: «si aún no se ha simulado, ¿no se debería poder determinar si es CAT-1, CAT-2 u otra?»). Matiz que importa: **no depende de simular** —es aritmética sobre notas y montos, sin motor, y por eso se recalcula en vivo al cambiar folios— sino de que haya facturas elegidas. `catDeal` mira `facturasOp` y un **array vacío es una respuesta**, no ausencia de dato: la misma distinción que ya hacía `itemizarFacturas`, y no hacerla acá era lo que dejaba a una oportunidad recién detectada mostrando una CAT como si describiera su oferta.
    - **Lo que se muestra mientras la oferta está vacía es la CAT de lo DISPONIBLE** (`catPotencial`, sobre los deudores que trajo el inbound) y se dice con esa palabra: píldora sin relleno y, en la tarjeta del tubo, chip sin relleno con el porqué en el tooltip. No son el mismo número — medido en pantalla, **CAT-1 lo disponible contra CAT-3 lo que terminó entrando a la oferta**— así que mostrarlas idénticas era afirmar de la operación algo que sólo valía para el pool.
    - **Un conjunto vacío NO es «CAT-1».** `catShares([])` devolvía la MEJOR categoría y `catDisp` la rotulaba «100% muy buenos»: una afirmación sacada de cero datos, el mismo error que devolver cuatro ceros donde no hay medición (regla 13-nonies). Ahora es `null`. Y `catMeta` de un CAT desconocido caía a los colores de CAT-1 —verde—, así que lo no clasificado se veía como la mejor cartera posible; hay un `CAT_NEUTRA` gris para eso. Caso **104**.
