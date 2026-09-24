---
type: sesion
title: "El encabezado del detalle no salta entre tabs, y la tabla de Verificación dice sólo lo suyo"
description: "Al cambiar de Negocio a Otorgamiento la página daba un salto: la fila de tabs medía 48 px con el botón «Pre-evaluación» y 31 px sin él, y la barra de scroll aparecía o no según el largo del tab. Alto mínimo fijo y scrollbar-gutter stable; e2e-82-a lo mide"
tags: [sesion, ui, detalle, verificacion, regla-82]
timestamp: 2026-09-24T05:00:00Z
---

# El encabezado del detalle no salta entre tabs · regla 82

## Qué vio el usuario

> «Hay unas diferencias en los bloques de datos sobre el tab, cuando te cambias de tab Negocio, Otorgamiento se
> producen unos saltos en la estructura de la página.»

Tres capturas del mismo detalle (Otorgamiento, Negocio, Verificación) con el encabezado a alturas distintas.

## Medido, no supuesto

Con Playwright sobre el detalle real (1.600 px de ancho, fila 0 del Directorio):

| tab | fila de tabs | encabezado pegajoso | cuerpo empieza en |
|---|---|---|---|
| Negocio | **48 px** (el botón «Pre-evaluación» mide 39) | 216 px | y = 216 |
| Otorgamiento | **31 px** (sin botón) | 199 px | y = 199 |

**17 px de salto vertical** en cada cambio: el botón sólo existe en Negocio —en Otorgamiento y Verificación el slot
devuelve `null` a propósito— y la fila, con `items-end`, mide lo que mida su hijo más alto. El segundo salto es
horizontal y no se puede medir en headless (las barras son overlay): en Chrome sobre Windows la barra de scroll
ocupa ~17 px y aparece sólo cuando el tab no cabe, así que todo el ancho se corre al pasar de un tab corto a uno largo.

## Lo que quedó

- La fila de tabs lleva `minHeight: 48` —el alto de la fila con el botón— y los tabs siguen alineados abajo, sobre la
  divisoria. Medido después: fila 48 · encabezado 216 · cuerpo en 216, en Negocio y en Otorgamiento.
- `html:has(.dp-detalle){scrollbar-gutter:stable}` en el `<style>`: sólo la pestaña del detalle reserva el canal. El
  tubo siempre tiene scroll y la portada es `position: fixed`, así que no se tocan.
- Por qué no esconder el botón con `visibility: hidden`: seguiría en el orden del teclado y el lector de pantalla lo
  anunciaría. Un alto fijo no tiene esa deuda y aguanta otro botón de la misma altura (el menú «Acciones», 39 px).
- Gate `e2e-82-a` (`tests/e2e/30_82.e2e.mjs`): recorre los tabs de la tira y exige el mismo alto de encabezado y el
  mismo `top` del cuerpo en todos, y `scrollbar-gutter` calculado en `stable`. Se escribió con la medición en rojo
  (48 vs 31) antes del arreglo.

## Y cuatro más en el tab Verificación, en la misma tarde

El usuario siguió mirando la pantalla y pidió, en cuatro mensajes, lo que la tabla «Resultado por factura» y el panel
de la API tenían de más:

1. **El chip de la cabecera del deudor** («⚠ Req. verif.» / «✓ Verificada») **se repetía en cada factura** y las
   filas están siempre a la vista. Queda sólo cuando dice algo que ninguna fila sola puede decir: el deudor partido
   por una confirmación parcial —«3 de 6 por verificar»—.
2. **La columna Tasa** se fue: «no es relevante para la verificación». La tasa es del pricing; al deudor se le
   confirma que el documento existe, se recibió y cuándo se paga, no un precio. Con ella se fue el parámetro `tasaDe`
   de `VerificacionTab` (existía para no recalcularla con el spread sugerido), y el gate
   `regla_verif_informativa` se **re-ancló** a la firma nueva —no se aflojó (ADR-0006)—.
3. **El panel «Verificación del modelo · API de riesgo»** quedó en UNA fila: título, los tres contadores
   (● consultados · ✓ por el modelo · ⚠ telefónica), el chip «Actualizado …» y el botón. Se fueron el párrafo
   explicativo —vive ahora en el `title` del botón— y la caja «Consulta a la API de riesgo · fecha», que repetía la
   fecha del chip con otras palabras.
4. **Orden y estado, por definición del usuario**: «siempre que hayan facturas la tabla se ordena por Tipo
   Documento, Folio, Fecha Emisión, Fecha Vencimiento y Monto. Estado = Req. Verificación / Verificada / No
   Verificada». Las filas de cada deudor van ordenadas por esas cinco claves, en ese orden, y las columnas van en el
   mismo orden —tipo · folio · emisión · vencimiento · monto · estado— para que la tabla se lea como se ordena. El
   estado tiene tres valores: la tercera, **No Verificada**, es la marca de la regla 71 (el deudor no la confirmó o el
   SII la inhabilitó), que antes esta tabla mostraba como «Req. verif.», igual que una factura que nadie había llamado.
   `tipoDocCodigo(f)` —el código SII del tipo— se declaró una vez para el orden y para el rótulo.

Ninguno de los cuatro cambia lo que el sistema decide; son T2 y no llevan regla nueva. Lo que sí quedó fijado por
gate es lo que ya lo estaba: `regla_verif_informativa` (re-anclado) y `e2e-59` siguen verdes sobre la tabla nueva.
