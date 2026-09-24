---
type: sesion
title: "Un nivel por excepción: la versión guardaba el del tramo y la solicitud usaba el escalado"
description: "Con la sesión en Jefe de Operaciones, la tarjeta lo nombraba a él (N1/N3), la bandeja decía «ninguna requiere tu atribución · 3 en Operaciones N4» y los mensajes le llegaron a otro. Medido en el detalle real: snapVersionCli no escalaba el nivel por monto. Regla 83, ADR-0025, caso 179, regla_83"
tags: [sesion, otorgamiento, atribucion, mensajeria, regla-83]
timestamp: 2026-09-24T06:30:00Z
---

# Un nivel por excepción · regla 83 · ADR-0025

## Qué vio el usuario

> «Estoy logueado como el jefe de operaciones y no aparece mis excepciones en el menú Otorgamiento.» · «Tampoco se
> enviaron los mensajes.» · «¿Revisaste por qué no se gatillaban los mensajes del otorgamiento (centro de mensajes) al
> publicarse la oferta?»

## Lo que se midió, en orden

1. **Quién escribe un hilo de otorgamiento.** Tres sitios crean o alimentan «Aprobación de excepciones · OP»: el
   formulario por excepción del tab, el botón «Marcar sin comentarios y solicitar (N)» y la Pre-evaluación
   (`avisarPreEval`). Y uno más al **firmar el cliente** (`avisarCierreNegocio`, regla 50). **Publicar la oferta no
   escribe ninguno**: `cerrarOferta` exige que cada excepción ya tenga su solicitud justificada (regla 66), crea el
   negocio, inyecta la solicitud al comité y manda el correo al cliente — a los aprobadores no les dice nada, porque
   la solicitud ya les llegó antes. O sea: el disparo existía; lo que había que mirar era a QUIÉN llegó.
2. **A quién llegó.** Directorio, fila 0 (OP-DIR5, M$1.739,9), sesión CR, «Marcar sin comentarios y solicitar (58)»:
   un hilo con 58 mensajes y participantes **CR, OP, SR, GG**. `hilosDeUsuario("JO") = 0`, `("RG") = 0`. Las 58
   solicitudes se guardaron con **operaciones N4 · riesgo N5 · comercial N3** — el piso *crítico* (la operación pasa de
   M$120)— y con ese nivel `codigosAprobadoresDe` resuelve OP (N5), SR (N5), GG (N3): el Jefe de Operaciones (N3) y la
   Jefe de Riesgo (N4) quedan fuera, **como dice la política**.
3. **Lo que decía la tarjeta, en el mismo tab, en el mismo momento:** «En espera del visto bueno de Jefe de Operaciones
   (N1)», «(N3)», «Jefe de Riesgo (N2)», «(N4)», «Subgerente de Riesgo (N5)». Son los niveles del **tramo** de cada
   regla, sin escalar. La tarjeta lee `ver.res` —la versión— y `snapVersionCli` guardaba `nivel: e.nivel`, el del tramo;
   `evaluarOtorgItems`, de donde leen la solicitud, el hilo, la tarea y la bandeja, aplica `conPiso` → `nivelExigido`.
   El comentario de `evaluarOtorgItems` ya advertía que escalar en cada consumidor «garantizaba que alguno quedara sin
   aplicarlo»: el que quedó fue el snapshot.
4. **Y el respaldo del nivel ausente:** 36 sitios con `|| 4` y 4 con `|| 1`. El mismo ítem sin nivel se llamaba
   «Operaciones (N4)» en una pantalla y «Jefe de Operaciones (N1)» en otra.

## Lo que quedó

- `snapVersionCli` guarda `nivel: nivelExigido(r.area, e.nivel, monto)` con `monto = deal.monto` —el mismo que usa
  `evaluarOtorgItems`— y conserva el del tramo en `nivelTramo`. `deal.monto` ya es «la oferta si existe, si no la
  oportunidad»: el patch `nex-simulado` lo deja en Σ `facturasOp`.
- `nivelDe(x)` es el único respaldo; los 40 sitios pasan por él.
- Caso **179**, gate `regla_83.test.mjs` (cuatro sondas), regla 83, ADR-0025.

## Medido después, en la misma pantalla

Mismo flujo (OP-DIR5, CR, «Marcar sin comentarios y solicitar (58)»): las tarjetas dicen ahora «En espera del visto
bueno de **Operaciones (N4)**» y «**Subgerente de Riesgo (N5)**», que es exactamente el nivel con el que se calcularon
los destinatarios del hilo (**CR, OP, SR, GG**). El caso 179 lo fija: 5 excepciones del cliente, mismo nivel en la
versión y en vivo, el crítico escala (#101 y #102 de operaciones: tramo 1 → N4) y el leve no.

## Lo que NO cambió, y por qué se dice

La política. Sobre M$120 el piso de Operaciones es **N4** (`PISO_ATRIB_MONTO`, editable en Mantenedores): el Jefe de
Operaciones no es el aprobador de esa operación, y ahora la tarjeta lo dice igual que la bandeja y que el hilo. Si el
Jefe de Operaciones debe poder aprobar operaciones críticas, se cambia el piso en la tabla — no se toca el código.

Y la pregunta abierta al usuario: si además de la solicitud (regla 66) y la firma (regla 50) quiere un aviso a los
aprobadores **al publicar** la oferta. Hoy no existe por diseño; agregarlo es un T2 (`cerrarOferta` → un
`avisarOfertaPublicada` con los tramos, como el del cierre).

## Verificación

Prettier y ESLint limpios · `tsc` sin TS1 · 0 duplicados · build OK · **614/614** gates (los 6 de `regla_83` con sus
cuatro sondas; `regla_aviso_cierre` re-anclado a `nivelDe`, no aflojado) · suite **179/179** (`CASOS_ESPERADOS`
178 → 179) · e2e 40/40 · capturas regeneradas.
