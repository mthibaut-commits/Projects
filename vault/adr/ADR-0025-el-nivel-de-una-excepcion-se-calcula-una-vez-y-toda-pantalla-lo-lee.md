---
type: adr
title: "ADR-0025 · El nivel de una excepción se calcula UNA vez, con el monto de la operación, y toda pantalla lo lee"
description: "La versión guardaba el nivel del tramo y la evaluación viva el escalado por monto; la tarjeta del detalle leía una y la solicitud, los mensajes y la bandeja la otra. Medido con la sesión en Jefe de Operaciones: la tarjeta lo nombraba a él y la solicitud le escribió a otro. Desde hoy `snapVersionCli` guarda el nivel exigido, conserva el del tramo aparte, y el respaldo del nivel ausente es uno solo"
tags: [adr, otorgamiento, atribucion, versiones, mensajeria]
estado: aceptada
fecha: 2026-09-24
reemplaza: []
relacionada: [ADR-0013, ADR-0018]
timestamp: 2026-09-24T06:00:00Z
---

# ADR-0025 · El nivel de una excepción se calcula una vez, y toda pantalla lo lee

## Contexto

El 24-09-2026 el usuario, con la sesión en **Jefe de Operaciones** (Operaciones N3), reportó tres cosas sobre la misma
operación: la tarjeta del tab Otorgamiento decía «En espera del visto bueno de **Jefe de Operaciones (N1)**» y
«**(N3)**»; la bandeja de Otorgamientos decía «48 excepciones pendientes, **ninguna requiere tu atribución** · 3 en
Operaciones **N4**»; y «tampoco se enviaron los mensajes».

Se midió en el detalle real (Directorio, fila 0, «Marcar sin comentarios y solicitar (58)»): las 58 solicitudes se
guardaron con **N4 / N5 / N3** (operaciones / riesgo / comercial: el piso *crítico*, porque la operación pasa de
M$120) y el hilo «Aprobación de excepciones» quedó con participantes **CR, OP, SR, GG** — `hilosDeUsuario("JO") = 0`.
Y las tarjetas del mismo tab decían **N1 / N3 / N2 / N4 / N5**: los niveles del **tramo** de cada regla, sin escalar.

La causa es una **ausencia**: `evaluarOtorgItems` escala el nivel por el monto (`conPiso` → `nivelExigido`, INC-05) y
`snapVersionCli` —que emite la versión que las tarjetas leen (`ver.res`)— guardaba `nivel: e.nivel`, el del tramo.
Dos evaluaciones del mismo catálogo con dos niveles distintos, y cada pantalla leía una: la tarjeta la versión; la
solicitud, `codigosAprobadoresDe`, la tarea del panel y «Sólo mis pendientes» de la bandeja, la evaluación viva.
Encima, para un nivel **ausente** había 36 sitios con `|| 4` y 4 con `|| 1`: el mismo ítem sin nivel se llamaba
«Operaciones (N4)» en una pantalla y «Jefe de Operaciones (N1)» en otra.

## Decisión

1. **La versión guarda el nivel EXIGIDO.** `snapVersionCli` aplica `nivelExigido(r.area, e.nivel, monto)` a cada
   excepción, con `monto = deal.monto` —el mismo que usa `evaluarOtorgItems`—, y conserva el del tramo en
   `nivelTramo`, como hace `conPiso`. Misma función, mismo monto, mismo nivel: la tarjeta, la solicitud, el hilo, la
   tarea y la bandeja nombran al mismo aprobador.
2. **Un solo respaldo para el nivel ausente**: `nivelDe(x) = x.nivel || 4`, y ningún `|| 1` ni `|| 4` suelto. Un ítem
   sin nivel es un defecto —las dos funciones que arman ítems lo ponen siempre—; el respaldo existe para que la
   pantalla no se caiga, no para decidir.
3. **El monto que escala es `deal.monto`**, que ya es «la oferta si existe, si no la oportunidad» (el patch
   `nex-simulado` lo deja en Σ `facturasOp`). No se inventa otro.

Gates: caso **179** (mismo nivel en la versión y en vivo, regla por regla, en el tramo crítico y en el leve; el crítico
escala y el leve no; el tramo viaja; el respaldo es único; y los destinatarios calculados con el nivel de la tarjeta
son los de la evaluación viva) y `regla_83.test.mjs` (la escalada en el snapshot, la misma en vivo, `nivelDe` y ningún
respaldo suelto; cuatro sondas).

## Alternativas descartadas

- **Escalar al leer, en cada pantalla.** Es lo que había de hecho —y lo que produjo 40 respaldos y dos verdades—: cada
  lector que se olvide de escalar muestra un aprobador que no es. El comentario de `evaluarOtorgItems` ya lo decía:
  «aplicarlo en cada consumidor garantizaba que alguno quedara sin aplicarlo».
- **Que la versión NO lleve nivel y las tarjetas lean la evaluación viva.** Rompe la regla 72: la versión es la foto
  de lo que se evaluó, con su política; si el piso por monto cambia en Mantenedores, la v1 tiene que seguir diciendo
  con qué nivel se pidió. Por eso el nivel exigido va DENTRO de la versión.
- **Dejar el piso crítico de Operaciones en N3** para que el Jefe de Operaciones «vea sus excepciones». Es una decisión
  de política (`PISO_ATRIB_MONTO`, editable en Mantenedores), no de código: hoy la política dice N4 para operaciones
  sobre M$120, y con este ADR todas las pantallas lo dicen igual. Si la política cambia, cambia en la tabla.

## Consecuencias

- Para una operación sobre M$120, la tarjeta dice ahora «Operaciones (N4)» / «Subgerente de Riesgo (N5)» / «Gerente
  General (N3)», igual que la bandeja y el hilo: el Jefe de Operaciones (N3) **no** es el aprobador, y la pantalla ya no
  le dice lo contrario.
- Las versiones emitidas ANTES de este cambio conservan el nivel del tramo en `nivel` (no se reescriben: regla 72). Al
  re-evaluar, la versión nueva sale con el exigido.
- Lo que este ADR **no** decide: si publicar la oferta debe avisar a los aprobadores (hoy avisan la solicitud del
  ejecutivo, regla 66, y la firma del cliente, regla 50). Queda como pregunta al usuario.
