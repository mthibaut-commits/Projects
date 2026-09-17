---
type: adr
title: "ADR-0003 — La intención de participación es un insumo declarado del generador, no una lectura de su salida"
description: "Por qué el bucle A2 → A5 → A2 del generador se cerró congelando la trayectoria de participación en un archivo propio (GeneradorDatos/lib/intencion_sow.js) y no re-sorteándola por semilla, ni guardándola como columna del A5, ni iterando hasta converger, ni congelando la medición vigente"
tags: [adr, generador, datos, punto-fijo]
timestamp: 2026-09-17T19:45:00Z
estado: aceptada
reemplaza: null
---

# ADR-0003: La intención de participación es un insumo declarado del generador

## Contexto

Desde el 15-09-2026 el A5 (share of wallet) **se mide** sobre el A2 (cesiones): la participación se cuenta una
sola vez (regla 13-undecies, decisión del usuario). Para que la participación no cambiara con esa derivación,
`cesiones.js` tomó como *intención* de generación la trayectoria semanal que el A5 ya declaraba: con qué
probabilidad cada cesión de un cliente va a Security. Pero la leyó de los campos que el A5 **mide**
(`SOWActualPct`, `HistoricoSemanal[].SOWPct`), y completó el conjunto de cedentes con el A2 anterior.

Medido el 17-09-2026 sobre `datos_inyectados.js` commiteado: una corrida completa cambia el cesionario de
**153 de 7.480** cesiones sin que nada haya cambiado; la siguiente, 67; la siguiente, 33. Un sorteo por documento
no reproduce su propio umbral, así que la cadena converge y no llega. A5 y A11 se mueven con las cesiones, el
encabezado del generador decía «determinista» y no lo era, y ese mismo día se había agregado `--solo` como
rodeo para regenerar un bloque sin arrastrar la deriva. El usuario pidió cerrar el bucle.

## Decisión

La intención de participación es un **insumo declarado** del generador y vive en
`GeneradorDatos/lib/intencion_sow.js`, al lado del padrón de cesionarios: 233 clientes con su participación
del período y la de cada semana en que cedieron algo (en %, como el A5 las publica), más 25 cedentes que el A5
no sigue y ceden con un perfil estable por RUT. `cesiones.js` lee **sólo** el A1 y ese archivo; el A5 mide lo
escrito; ningún derivado vuelve a leer lo que él mismo midió.

Los números se **congelaron** con la trayectoria que produjo las cesiones vigentes —el A5 tal como iba en la
entrada de la última regeneración del A2 (`fd70d76`)—, comprobado antes de tocar el código: con esa intención
el `cesiones.js` de entonces reproduce el A2 commiteado byte a byte, y A5 y A11 son idempotentes sobre él. Por
eso cerrar el bucle **no movió una sola cesión**.

Un gate de contrato (`tests/contract/generador.test.mjs`) corre la cadena entera en proceso y exige que cada
bloque derivado salga igual al commiteado, y que `cesiones.generar` dé lo mismo con y sin A2/A5 en la entrada.
Queda como regla 32.

## Alternativas consideradas

- **Re-sortear la trayectoria por semilla** (`sowperfil|<rut>` para todos) — descartada: descarta la
  participación que el usuario decidió conservar el 15-09 (quién es buen cliente y quién se está yendo),
  mueve las 7.480 cesiones, el descuento por SOW del pricing y el segmento de churn. Cerrar un bucle no
  autoriza a reescribir la cartera.
- **Guardar la intención como columna del A5** — descartada: el A5 es un activo de negocio con layout
  documentado en `Integraciones/`; una «intención de generación» no existe en la entrega real, y el pipeline
  —que lee el A5 entero— la tendría a la vista.
- **Iterar la cadena hasta converger dentro del generador** — descartada: la deriva decae (153 → 67 → 33) pero
  no se demostró que llegue a cero ni que no cicle, y el resultado seguiría dependiendo de la salida anterior y
  del número de vueltas, no de los datos base. Un punto fijo que hay que perseguir no es un punto fijo.
- **Congelar la medición vigente** (el A5 de `HEAD`) — descartada: habría movido 153 cesiones en el commit que
  cierra el bucle. La trayectoria de `fd70d76` es la que produjo el A2 vigente y reproduce el archivo sin mover
  ninguna; la diferencia entre ambas es el ruido de un sorteo, y está dicha en el archivo.

## Consecuencias

**Positivas**
- El generador tiene punto fijo y un gate que lo sostiene: `datos_inyectados.js` commiteado **es** lo que el
  código produce. Cambiar un módulo sin regenerar rompe el build.
- Cambiar la historia de un cliente (que se esté yendo, que entre uno nuevo) es editar un archivo legible y
  regenerar, no correr el generador hasta que salga lo que uno quiere.
- `--solo` deja de ser un rodeo: sirve para probar un módulo en aislamiento.

**Negativas / deuda asumida**
- Un archivo de 247 líneas y 35 KB más en el generador, que se edita a mano.
- La intención no se mide en ninguna parte: es declarada, y así hay que leerla. Sus números vienen de una
  medición intermedia (`fd70d76`), no de la entrega original del A5; la diferencia es ruido de sorteo.
- El gate lee los 34 MB del archivo de datos: ~2 s más en cada verificación.

**Eje del trade-off.** Compra **reproducibilidad** —el archivo commiteado es función del código y de insumos
declarados— a cambio de **un insumo declarado más** que hay que mantener a mano.
