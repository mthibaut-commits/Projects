---
type: adr
title: "ADR-0011 · La línea del RUT cliente es el consolidado de sus líneas, no un tope aparte"
description: "Reemplaza la primera viñeta de la regla 7: el nivel 1 deja de ser un campo asignado independiente y pasa a ser, por construcción, la suma de las líneas por par y del comodín"
tags: [adr, lineas, comite, activos]
estado: aceptado
timestamp: 2026-09-20T23:30:00Z
---

# ADR-0011 · La línea del RUT cliente es el consolidado de sus líneas

## Contexto

El usuario definió el modelo al revisar el proceso de solicitud de línea:

> «El sistema debiera trabajar con lineas al rut cliente (que es un monto global de la suma de las
> lineas asignadas al cliente ya sea por par (puntual o normal) o al rut cliente con los otros
> deudores (comodin)). **Si los datos no vienen asi estamos mal.**»

Estaban mal. Medido sobre el activo A23 recién creado, en los clientes con comité:

| | clientes en estado B |
|---|---|
| Cabecera **igual** a la suma de sus líneas | **7** |
| Cabecera **mayor** que la suma | **217** |
| Cabecera menor | 0 |

Brecha **mediana 13,7 %**, **p90 19,7 %**, **$36.024.682.300** acumulados. El origen: el
dimensionamiento tomaba `aprobada × (0,78 + rnd()×0,14)` como presupuesto a repartir, o sea le
restaba una holgura sorteada entre el 8 % y el 22 %. Esa holgura era coherente con la regla 7, que
definía el nivel 1 como *«campo ASIGNADO al cliente (no un consolidado), típicamente mayor o igual
que la suma de sus LF1..LF4, así que en la práctica casi nunca es el nivel que bloquea»*.

Son dos modelos distintos y sólo uno puede estar en los datos.

## Decisión

**El nivel 1 es el consolidado.** `MontoAprobado` de la fila `CLIENTE` es, por construcción, la suma
de lo aprobado en sus líneas; `MontoUtilizado`, la suma de lo vigente. Vale en los tres estados: en A
es la LF1, en B es LF2+LF3+LF4, en S es 0.

Esto **reemplaza la primera viñeta de la regla 7**. El resto de la regla 7 —los cinco tipos de línea,
la regla de los tres niveles a la vez, el recálculo completo— sigue vigente, y la regla 45 lo dice
explícitamente en vez de dejar dos textos contradictorios en el vault.

Consecuencias inmediatas: se reparte **todo** lo aprobado (el residuo que el piso deja sin colocar se
le entrega a la línea mayor), el excedente que el comité aprueba por sobre el detalle por par va al
**comodín** —que es el nivel que financia a los otros deudores—, y la cabecera **no copia**
`aprobadaCliente` al constituir: se recalcula como suma.

## Alternativas descartadas

- **Dejar el nivel 1 como campo independiente y sólo documentar la brecha.** Es lo que la regla 7
  decía y lo que el código hacía. Se descarta porque el usuario, que es quien define el negocio, dijo
  lo contrario en términos que no admiten lectura doble («si los datos no vienen así estamos mal»), y
  porque un tercer número que no corresponde a ninguna línea es exactamente lo que hace difícil
  responder «¿por qué esta factura no cabe?».
- **Subir las líneas hasta alcanzar la cabecera, en vez de bajar la cabecera hasta la suma.** Da el
  mismo invariante y **13,7 % más de capacidad de crédito** repartida sin que nadie la aprobara. Es
  la dirección peligrosa: inventar cupo es peor que reconocer que sobraba un número.
  *(En la práctica el efecto neto fue el contrario y hay que decirlo: al dejar de restar la holgura,
  el presupuesto a repartir pasó a ser el aprobado completo, así que las líneas SÍ crecieron —de
  3.636 objetos a 3.667— hasta consumir exactamente el aprobado del A7/A8. La diferencia con esta
  alternativa es cuál es el ancla: acá el ancla sigue siendo el cupo que el maestro aprobó, no una
  cabecera que se inventaba una holgura.)*
- **Mantener las dos cifras y mostrar la brecha en pantalla.** Traslada el problema al ejecutivo:
  tendría que entender por qué su cliente tiene M$885 aprobados y M$761 utilizables. No hay una
  explicación de negocio para esa diferencia — era un artefacto del generador.
- **Repartir el excedente del comité entre las dos categorías de comodín** (Lista Blanca y Deudores
  Autorizados) en vez de dárselo al mayor. Exigiría una decisión de riesgo —cuánta exposición a cada
  clase— que el comité no tomó al aprobar el detalle. Va al mayor, que es el que ya existe y cuya
  categoría ya fue decidida.

## Consecuencias

- La estructura se movió: **3.636 → 3.667** objetos de línea (LF2 2.515→2.526, LF3 428→445, LF4
  426→429, LF1 sin cambio). Es la consecuencia directa de repartir el aprobado completo, y por eso
  esta decisión va en un ADR y no en un refactor.
- `asignadaCliente` deja de poder bloquear por su cuenta. No es una pérdida de control: el tope real
  siempre fue el par y el deudor, y la regla de los tres niveles sigue intacta.
- El total aprobado del sistema queda en **$269.800.885.228**, que es exactamente lo que el maestro
  A7/A8 declara. Antes, esa cifra y la suma de las líneas no coincidían.
