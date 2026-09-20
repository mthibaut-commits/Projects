---
type: sesion
title: "Las líneas dejan de fabricarse en el pipeline: el activo A23 y el bucle del comité"
description: "El usuario pidió revisar que las líneas no las genere el pipeline. Las generaba: 466 filas de activo contra 3.636 objetos de línea. La estructura pasa a ser insumo (A23), el comité vuelve a cerrar el bucle y dos perillas quedan declarativas"
tags: [sesion, lineas, activos, comite, arquitectura]
timestamp: 2026-09-20T22:10:00Z
---

# Las líneas son un insumo · regla 44 · ADR-0010

## Qué pidió el usuario

> «Revisa que las lineas no sean generadas por el pipeline sino por una app externa independiente. Para
> que el pipeline no tenga esa responsabilidad.»

Y antes, en la misma sesión, las dos frases que este cambio termina de atender:

> «Las lineas no pueden quedar en negativo. Por eso se incluyo la regla de que todas las facturas de una
> oportunidad deben tener linea asignada antes del curse.»
>
> «Si al momento de ir al comite un deudor sin linea lf2-lf3 .. el comite le asigna una lf3 ahora al
> momento de ejecutar el proceso de asignacion se le asignara esa lf3 y no la lf4 porque ahora ya esta
> reconocido como un relacion con linea asignada en el sistema de lineas; aunque la linea sea puntual.»

## Lo que la medición encontró

| | filas |
|---|---|
| Activo A7/A8 (`LINEA_DISPONIBLE`) | **466** — 233 clientes × 2 `TipoLinea`, **sin RUT de deudor y sin nivel LF** |
| Lo que el motor consumía | **3.636** — 267 LF1 · 2.515 LF2 · 428 LF3 · 426 LF4, sobre 500 clientes |

Las 3.170 de diferencia las fabricaba `lineasDeCliente()` con `pcRng(hashStr("lpar" + rut))`, y el nivel 3
(`lineasDeudor()`) se construía **encima** sorteando otra holgura. Partía de `LINEAS_DATA`, que es A7+A8
— exactamente lo que `Levantamiento_Activos_Informacion.md` §5.4 prohíbe en una línea: *«A7 y A16 nunca
alimentan el motor de líneas; A23 nunca alimenta la vista Líneas»*. **A23 no tenía activo**, y esa ausencia
era la causa raíz de que `constituirLinea` descartara `sol.detalle`: las líneas por par no vivían en
ningún almacén, así que no había dónde escribir lo que el comité aprueba.

## Lo que se hizo

1. `GeneradorDatos/datasets/lineas_par.js` produce **`LINEA_CUPO`** (4.136 filas: 500 cabeceras `CLIENTE`
   + 3.636 objetos de línea) y **`LINEA_DEUDOR`** (741). El generador es la app externa.
2. `lineasDeCliente` y `lineasDeudor` pasan a lectores. Se fueron del fuente `repartirConPiso`,
   `lf4MetaPorCliente`, `clienteEnMaestroLineas`, `lineaMin`, `TRAMO_LINEA` y `LF1_PESOS`.
3. `constituirLineasDeDetalle` escribe las líneas que el comité aprueba en `repoLineaComite`, que se
   superpone al activo al leer. Al par que ya tiene línea se le **aumenta**; al que no, se le **crea**.
4. `lineaMinima` y `otrosDeudoresPct` quedan declarativas, con su `hint` diciéndolo.

## El método, que es lo que hay que repetir si esto se vuelve a tocar

**Primero el snapshot, después el port.** Se capturaron en Chromium las 3.636 líneas y los 741 deudores
que el pipeline fabricaba (`sha256 7ab44ebf…`, 892 KB) y recién entonces se portó el algoritmo. El port se
validó **en Node contra ese archivo, sin navegador**: segundos por iteración en vez de dos minutos.
Reprodujo el snapshot **exacto a la primera**, y por eso los 149 casos de la suite y los 29 e2e no se
movieron. Sin el snapshot previo no había forma de distinguir «migré bien» de «migré y cambié algo».

Importa porque **el stream del RNG se consume condicionalmente**: `rnd() < 0.18 && techoLF3 >= TRAMO_LINEA`
cortocircuita, `quemada` sólo se sortea si hubo LF3, y un cupo 0 no consume nada. Reordenar una condición
corre la estructura entera del cliente.

## El fallo inesperado, con causa y solución (regla núcleo 11)

**Cuatro casos de la suite en rojo (90, 97, 102, 122) por un solo motivo, y ninguno lo decía.** El síntoma
era «0 clientes en estado B»; la app abierta a mano mostraba los 224 correctamente.

*Causa:* `_cacheCli` era un `const … = new Map()` y dos casos de la suite lo invalidaban con
`_cacheCli.clear()`. Al volverlo un `let` que arranca en `null`, ese `.clear()` dejaba un Map **vacío y
verdadero**, así que `if (_cacheCli) return _cacheCli` lo daba por construido: todo cliente pasaba a
leerse como estado A y **nadie tenía cupo, sin un solo error en pantalla**.

*Solución:* el testigo va **aparte** del mapa (`_cupoListo`), y la suite invalida por `invalidarCupo()`,
que es el punto público. «Índice vacío» e «índice sin construir» son estados distintos; confundirlos en un
lector memoizado es silencioso y caro. El gate `regla_lineas_activo.test.mjs` lo vigila con sonda.

*De paso:* mi primera sonda negativa («el lector deja de leer el activo») **no plantaba nada** — hacía
`replace("window.LINEA_CUPO", …)` y la primera aparición del nombre está en un comentario. La cazó su
propia aserción de que la sonda tiene que cambiar el fuente. Una sonda que no planta pasa sola.

## Lo que cambió de significado, y por qué se dice

Los casos **90 (b)** y **102 (e)** probaban que mover la perilla **sí** re-dimensionaba y que el cache no
servía lo viejo. Hoy prueban lo contrario, y exigen además que la LF4 exista para que «no se movió» no se
cumpla sola con dos ceros. El tramo (c) del 102, que probaba `repartirConPiso`, se mudó al gate de
contrato donde ahora vive la función. Está en el ADR-0010 como consecuencia aceptada, no como trámite.

## Verificación

Los seis pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **265 gates de contrato** ·
**150/150** la suite · **28/29** e2e. El único rojo es `e2e-29-b`, que **ya estaba rojo antes** de este
cambio (tablero, punto 1). El paso 7 no aplica: las capturas cubren las 9 vistas de la navbar y
Configuración no está entre ellas, y la estructura quedó idéntica peso a peso, así que nada de lo que
retratan cambió.

## Lo que queda, y ahora tiene dónde apoyarse

`e2e-29-b` pide un deudor de **cupo cero** fuera de la oferta, y con el padrón real no queda ninguno. Es
el mismo hueco que el usuario nombró antes: *«debes forzar que en pool de datos existan rut deudores sin
linea (fuera del directorio), otras con un mix de deudores con linea, y con linea parcial; asi estan los 3
casos»*. Hasta hoy eso era imposible de garantizar, porque la estructura se sorteaba al leer. Ahora la
produce el generador, así que las tres casuísticas se pueden **fijar como propiedad del activo** y
gatearse. Es el siguiente paso.
