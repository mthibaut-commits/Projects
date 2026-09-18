---
type: sesion
title: "Sesión 2026-09-17 — El generador tiene punto fijo: la intención de participación se declara, no se lee del A5"
description: "El usuario pidió arreglar el bucle A2 → A5 → A2 del generador; se midió la deriva (153 → 67 → 33 cesiones por corrida), se encontró por arqueología en git la trayectoria exacta que produjo el A2 vigente, se congeló como insumo declarado (lib/intencion_sow.js) y cesiones.js dejó de leer el A5 y su propia salida: una corrida completa reproduce datos_inyectados.js byte a byte sin mover una cesión, con gate de contrato, regla 32 y ADR-0003"
tags: [sesion, generador, datos, punto-fijo]
timestamp: 2026-09-17T19:45:00Z
feature: null
---

# Sesión 2026-09-17: el generador tiene punto fijo

## Hecho

- **La deriva, medida en proceso antes de tocar nada.** Sobre `datos_inyectados.js` commiteado, una corrida
  completa cambia el cesionario de **153 de 7.480** cesiones; la siguiente, **67**; la siguiente, **33** (59, 27
  clientes del A5 con `SOWActualPct` distinto, hasta 21 pto). Convergía y no llegaba. Los otros cinco derivados
  (líneas, otorgamiento, verificación, riesgo, cartera) ya eran byte a byte estables. La cadena entera corre en
  **~0,5 s** en proceso, así que cabía como gate.
- **La causa, en dos lecturas.** `cesiones.js` tomaba la intención de participación de los campos MEDIDOS del
  A5 (`SOWActualPct`, `HistoricoSemanal[].SOWPct`) y completaba los cedentes con el A2 anterior (**25 de 258**
  cedentes existen sólo por eso: el A5 no los sigue); `share_of_wallet.js` medía sobre el A2 recién escrito.
- **Arqueología en git para no mover nada.** Hash de los bloques A2/A5/A11 en cada commit de
  `datos_inyectados.js`: el A2 vigente se generó por última vez en `dd1469b` con el A5 de `fd70d76` (la primera
  medición sobre el registro). Comprobado: `f(A1, A5@fd70d76, A2@fd70d76) == A2@HEAD` (0 cesiones distintas),
  y A5 y A11 son idempotentes sobre `HEAD`. Con el A5 **original** (`83dea60`) no: 497 cesiones distintas.
- **El arreglo.** `GeneradorDatos/lib/intencion_sow.js` (247 líneas, 35 KB): 233 clientes con `actual` y
  `semanas` en % —sólo las semanas con cesiones, 1.111 pares— y 25 `cedentesSinFicha`. `cesiones.js` pasa a
  `generar({ DTESYNC })` y lee sólo el A1 y ese archivo; `generar.js` exporta `derivar` y corre `main()` sólo
  como CLI; encabezados de los tres módulos y del README reescritos (la sección «Regenerar un solo derivado»
  pasó a «La intención de participación, y por qué el generador tiene punto fijo»; `--solo` queda para probar
  un módulo en aislamiento).
- **Resultado:** `node GeneradorDatos/generar.js` sobre el archivo commiteado lo reproduce **byte a byte**
  (`git status` limpio) en 1,5 s. **Gate `tests/contract/generador.test.mjs`** (4 tests, 1,6 s): la cadena
  entera en proceso reproduce cada bloque; `cesiones.generar` da lo mismo con y sin A2/A5; dos sondas negativas.
- Verificación: `tsc` 0 TS1, 0 duplicados, build 40,7 MB, gates de contrato, **115/115 PASA**. Sin capturas: ni
  el `.jsx` ni los datos cambiaron. Docs: regla **32** en `datos_y_activos.md` + fila en `invariantes.md` (62
  reglas, 1 con gate de contrato) + fila del gate; **ADR-0003** con las cuatro alternativas descartadas;
  `CLAUDE.md` (fila de regenerar), `.claude/rules/testing.md`, tablero (deuda 9 cerrada).

## Decisiones tomadas con el usuario

- «Arregla el bucle A2 → A5 → A2 del generador» (17-09). El **mecanismo** —intención congelada en un archivo
  propio, con los números de `fd70d76`— lo eligió la sesión; las alternativas y su razón están en ADR-0003.
  Lo que conviene que el usuario sepa: los números congelados son una medición intermedia (la primera sobre
  el registro), no la entrega original del A5; la diferencia es ruido de sorteo y está dicha en el archivo.
- «ratifica V10 a nivel deudor» (17-09, después del merge): **V10 queda del DEUDOR**, como lo modeló la sesión
  anterior siguiendo el texto de la política. Cerrada en `adr/index.md` y en la regla 9-ter; no se re-litiga.

## Errores encontrados y su solución (regla 11)

1. **Congelar «la trayectoria original» habría movido 497 cesiones.** El A2 vigente no salió del A5 original
   sino del A5 ya medido una vez (`fd70d76`): el padrón de cesionarios cambió en `dd1469b` y el A2 se regeneró
   ahí. Se encontró hasheando los bloques por commit y probando la reproducción con cada candidato **antes**
   de editar `cesiones.js`. Un punto fijo se elige midiendo con qué entrada se generó lo que hay, no suponiéndolo.
2. **`derivar` muta la entrada a propósito** (cada derivado queda visible para el siguiente): el gate le pasa
   una copia superficial para que el segundo test vea el archivo tal como se leyó.
3. **`Edit` exige haber leído el archivo con `Read`**: los módulos se habían leído con `cat`, así que las
   ediciones fueron scripts con anclas contadas (`k !== 1` aborta), la misma guarda que salvó la sesión
   anterior del `RANGO` a medias.

## Pendiente / siguiente paso

- Ver el tablero. Del usuario sigue sólo pushear el tag `v0.1.0` desde Windows: reintentado desde esta sesión
  (tag creado local sobre `bd14091`) y el proxy volvió a responder HTTP 403 sobre `refs/tags/*`.

## Sorpresas y aprendizajes

- **El punto fijo salió gratis porque (cedente, folio, fecha, monto) es invariante entre corridas**: el pool
  cedible y las fechas dependen sólo del A1 y de semillas por RUT y folio; el bucle sólo movía el cesionario.
  Por eso la intención basta con las semanas en que hubo cesiones, y `actual` es sólo un respaldo.
- **Basta UNA corrida para probar el punto fijo:** si f(x) = x, f(f(x)) = x. Un gate que corriera dos veces
  y comparara entre sí dejaría pasar un archivo commiteado que no es lo que el código produce.
- **«Determinista» no es «tiene punto fijo».** Cada corrida era determinista (misma entrada, misma salida) y
  aun así el archivo se movía, porque la entrada era la salida anterior. La afirmación que vale es la segunda,
  y ahora tiene gate.
