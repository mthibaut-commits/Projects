---
type: adr
title: "ADR-0010 · La estructura de líneas es un insumo del pipeline, no un producto suyo"
description: "Los tres niveles del modelo de líneas pasan a llegar por el activo A23, producidos por el generador. El pipeline sólo los lee, y dos perillas del tenant quedan declarativas"
tags: [adr, lineas, activos, comite, arquitectura]
estado: aceptado
timestamp: 2026-09-20T21:30:00Z
---

# ADR-0010 · La estructura de líneas es un insumo del pipeline, no un producto suyo

## Contexto

El usuario pidió revisar «que las líneas no sean generadas por el pipeline sino por una app externa
independiente, para que el pipeline no tenga esa responsabilidad». La revisión encontró que **las
generaba**, y en una proporción que no era un detalle:

| | filas |
|---|---|
| Lo que el activo A7/A8 (`LINEA_DISPONIBLE`) trae | **466** — 233 clientes × 2 `TipoLinea`, **sin RUT de deudor y sin nivel LF** |
| Lo que el motor consumía | **3.636** — 267 LF1 · 2.515 LF2 · 428 LF3 · 426 LF4, sobre 500 clientes |

Las 3.170 de diferencia las fabricaba `lineasDeCliente()` con `pcRng(hashStr("lpar" + rut))`, y el nivel 3
(`lineasDeudor()`) se construía encima sorteando otra holgura. Eso contradice la regla núcleo 9 (*«el
pipeline **lee** los activos, no los genera»*) y, peor, parte del activo que el levantamiento prohíbe
conectar al motor: *«A7 y A16 nunca alimentan el motor de líneas; A23 nunca alimenta la vista Líneas.
Mezclarlas da el error más caro de todos —cursar contra cupo que ya está tomado— y no avisa»* (§5.4).

La arquitectura documentada ya era la correcta: **A23 es la API que devuelve los tres niveles**. Lo que
faltaba era su activo. Y la ausencia tenía una consecuencia que veníamos persiguiendo por separado: como
las líneas por par no existían en ningún almacén —se re-sorteaban en cada lectura—, `constituirLinea()`
**descartaba `sol.detalle` entero**, o sea lo que el comité aprueba línea a línea. Al deudor que iba al
comité *justamente por no tener LF2/LF3* se le aprobaba una puntual y la asignación siguiente lo mandaba
igual al comodín, como si nada hubiera pasado.

## Decisión

1. **Dos bloques nuevos en el activo**, producidos por `GeneradorDatos/datasets/lineas_par.js`:
   `LINEA_CUPO` (niveles 1 y 2: la cabecera del cliente y una fila por objeto de línea LF1/LF2/LF3/LF4) y
   `LINEA_DEUDOR` (nivel 3). El generador ES la app externa: su encabezado ya decía «el pipeline NO genera
   datos: los lee y los procesa».
2. **`lineasDeCliente` y `lineasDeudor` pasan a ser lectores**: indexan el activo y nada más. Se van del
   fuente `repartirConPiso`, `lf4MetaPorCliente`, `clienteEnMaestroLineas`, `lineaMin`, `TRAMO_LINEA` y
   `LF1_PESOS` — 295 líneas netas.
3. **La migración conserva el resultado peso a peso.** Se capturaron en Chromium las 3.636 líneas y los
   741 deudores que el pipeline fabricaba, se portó el algoritmo verbatim (mismo `hashStr` + mulberry32) y
   el generador los reprodujo idénticos. Es el gate más fuerte disponible para un cambio así: si la
   estructura no se mueve, los 149 casos de la suite y los 29 e2e no se mueven tampoco.
4. **El bucle del comité se cierra**: `constituirLineasDeDetalle` escribe las líneas aprobadas en
   `repoLineaComite`, que se superpone al activo al leerlo. Al par que ya tiene línea se le **aumenta** el
   monto; al que no, se le **crea**. Caso 150, en las dos direcciones.
5. **`lineaMinima` y `otrosDeudoresPct` quedan declarativas** y su `hint` lo dice.

## Alternativas descartadas

- **Dejarlo como estaba y cerrar sólo el bucle del comité.** Era lo que yo tenía planificado antes de
  medir: un repositorio de líneas por par, y `constituirLinea` escribiendo ahí. Habría funcionado, y
  habría dejado dos fuentes de verdad para el mismo objeto —una sorteada y otra otorgada— conviviendo en
  `lineasDeCliente`. La pregunta «¿de dónde salió esta LF2?» no tendría una respuesta.
- **Extender A7/A8 con el nivel de deudor** en vez de crear el A23. Más barato en apariencia, pero A7 es
  la *fotografía de cartera* que alimenta la vista Líneas y A23 es lo que alimenta la *decisión de
  cursar*: sólo A23 está neta de reservas. Fundirlas es exactamente la mezcla que el levantamiento llama
  «el error más caro de todos». Se descartó por eso, no por costo.
- **Mantener `lineaMinima` y `otrosDeudoresPct` vivas re-dimensionando al leer.** Habría conservado una
  capacidad visible de la demo —mover la perilla y ver cambiar las líneas— a cambio de que el pipeline
  siguiera decidiendo el tamaño de un cupo que otro sistema aprueba. La regla 9-bis ya tiene la categoría
  para esto (`concentracionDeudorPct`, `frecuenciaMin`: declarativas, y el `hint` lo dice), así que no se
  inventa nada. **Costo aceptado y explícito:** en la demo, cambiar esos dos umbrales ahora exige
  regenerar los activos (`node GeneradorDatos/generar.js`) — que es justo lo que en producción sería un
  cambio de política aguas arriba, visible en la entrega siguiente.
- **Mutar `window.LINEA_CUPO` cuando el comité aprueba**, en vez de superponer un repositorio. Es una
  línea menos de código y una mentira: el batch del sistema externo no dice eso, y la regeneración
  siguiente lo desmentiría sin avisar.

## Consecuencias

- El fuente deja de tener una responsabilidad que no le corresponde, y el contrato con el sistema externo
  queda escrito y gateado en vez de implícito.
- **Dos casos de la suite cambian de significado, y se dice acá porque no es un detalle:** el 102 (e) y el
  90 (b) probaban que mover la perilla **sí** re-dimensionaba y que el cache no servía lo viejo; ahora
  prueban lo contrario —que no mueve nada— más la exigencia de que la LF4 exista, para que «no se movió»
  no se cumpla sola con dos ceros. El tramo (c) del 102, que probaba `repartirConPiso`, se mudó a
  `tests/contract/regla_lineas_activo.test.mjs`, donde ahora vive la función.
- `DEUDORES_AUTORIZADOS.LineaSugeridaMM` (600 filas) queda como lo que era: un campo heredado, sin uso, no
  documentado y nombrado en millones. No lo toca este ADR; queda anotado para que nadie lo confunda con
  una señal de línea por deudor.
- El activo pasa de ~34 a **35,1 MB**. El punto fijo del generador se mantiene y ningún bloque anterior
  cambió un byte.
