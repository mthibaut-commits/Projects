---
type: sesion
title: "Cinco de UI, y un colapsable que se llevó el botón: el e2e pasó sin hacer lo que dice"
description: "Los cinco cambios de pantalla que el usuario pidió el 24-09, y el hallazgo de método: al colapsar el panel de evaluación, «Re-evaluar simulación» salió del DOM y e2e-72-d se fue en silencio por su rama de respaldo — agregó una factura y le cambió el paquete al caso siguiente"
tags: [sesion, ui, e2e, otorgamiento, verificacion]
timestamp: 2026-09-24T04:30:00Z
---

# Cinco de UI, y un colapsable que se llevó el botón

## Qué pidió el usuario

Cinco cambios de pantalla, todos T2, mirando el detalle de una operación:

1. **Quitar la píldora** «Sujeto a excepción · N1 · Jefe de Operaciones (Operaciones)» de la tarjeta de un
   criterio de otorgamiento: «es redundante». Lo era: dos líneas más abajo la misma tarjeta dice «Requiere
   visto bueno de **Jefe de Operaciones (N1)**».
2. **Agrupar esas tarjetas por área** (ej. Operaciones).
3. Dejar «Re-evaluación de la simulación» **colapsada**, con el encabezado «Evaluación de la simulación ·
   V1 · 5 motores» y **un icono de actualizar que gatille la re-evaluación**.
4. En la tabla del tab Verificación, el orden del encabezado es **razón social + chip Nota Deudor + chip
   Prime** (venía Prime · «Nota Deudor» · 4,2 · razón social).
5. Los criterios V00–V10 **todos en una columna**, y la tarjeta del protocolo telefónico **dentro de «V01 ·
   Protocolo de verificación del deudor»**.

## Cómo quedó cada uno

- **La píldora** no se dibuja cuando la disposición es `excepcion`; las otras tres —Aprobado, Rechazado, No
  ejecutada— la conservan, porque ahí la píldora ES el veredicto y no hay otra línea que lo diga. El área,
  que era lo único que la píldora decía y el cuerpo no, pasó a ser **el encabezado del grupo**.
- **El agrupado** ordena por `AREA_LBL` y no por aparición —así el bloque de un área no salta de lugar
  entre dos operaciones— y con UNA sola área no dibuja encabezado: rotular un grupo que es todo el
  conjunto no agrupa nada.
- **El colapsable** cubre sólo lo de la re-evaluación: la explicación, los re-evaluables, el botón y el
  selector de versión. **Las reglas de otorgamiento quedan fuera** — y eso no fue la primera versión (ver
  abajo). El chip pasó de «1 versión · 5 motores» a **«V1 · 5 motores»**; el gate `regla_72` que lo
  fijaba se re-ancló al texto nuevo con la misma exigencia (que lea `MOTORES_VERSION`, no un número
  cableado) y con la del «versiónes» apretada: antes vivía implícita en el literal, ahora se busca en
  todo el fuente. El icono del encabezado hace **lo mismo** que el botón de adentro, con la misma
  condición, y no lo reemplaza: adentro sigue el botón rotulado, que es el que uno encuentra leyendo.
- **El encabezado de Verificación** empieza por la razón social, y la nota pasó a ser un **chip con su
  rótulo adentro** («Nota Deudor 4,2»): dos calificaciones del mismo deudor se leen como dos etiquetas, no
  como una etiqueta y un número suelto.
- **Los once criterios en una columna**, y el veredicto vive dentro de la tarjeta de V01: «el deudor tiene
  protocolo de confirmación propio (PROT-8080)» es exactamente lo que V01 evalúa, y V01 es COMPUERTA
  (regla 6) — cuando aplica no se evaluó ningún otro criterio, así que el veredicto es su consecuencia.
  Separados, había que mirar dos sitios para entender una decisión.

## El hallazgo de método: el colapsable se llevó el botón, y el e2e pasó igual

La primera versión colapsó el panel **entero**, reglas incluidas. Lo cazó `e2e-15-bis-bis-a` al primer
intento: «el tab Otorgamiento no ofrece “Marcar sin comentarios…”». Además contradecía el pedido 2 de la
misma tanda — agrupar unas tarjetas por área no sirve de nada si están escondidas. Se acotó.

Lo interesante vino después. Con el colapsable ya acotado, **`e2e-73-a` cayó** («la oferta tiene 3
factura(s) y 2 chip(s) de acuse») y **`e2e-72-d`, que corre antes, pasó**. Un A/B con el fuente sin
cambios dio 5/5; con `panelAbierto` en `true`, 5/5; con `false`, 4/5. El colapsable era la causa, pero
¿de qué?

`e2e-72-d` dice: «un detalle nuevo re-evalúa: “Re-evaluar simulación” **o, si no hay re-evaluables
pendientes, una factura más y “Re-evaluar operación”**». Con el panel colapsado el botón rotulado **no
está en el DOM** —`{panelAbierto && …}` no lo oculta, lo quita—, así que `btn.count()` dio 0 y el caso
**se fue por su rama de respaldo**: agregó una factura y re-evaluó. Pasó, porque su aserción es «quedó
la versión N+1», y quedó. Pero dejó **3 folios donde había 2**, y el caso siguiente leyó la última
versión y se encontró un folio que ninguna fila mostraba.

Es la misma familia del 22-09 (el e2e que afirmaba «no aparece el botón» con una sesión que no podía
firmar nunca): **un verde que no dice por cuál camino pasó no es evidencia.** Acá el caso tenía dos
caminos legítimos y el cambio de UI le cerró el primero sin que nada lo dijera. La corrección: el caso
prueba **primero el icono del encabezado** —que es el mismo gesto— y recién después el botón; la rama de
respaldo sigue, pero ya no se entra por accidente. Y el diagnóstico del caso ahora nombra el gesto que
usó, para que la próxima vez se vea en la salida y no haya que bisecar.

## Verificación

Los ocho pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **599/599** gates de
contrato · **177/177** la suite · **39/39** e2e. El paso 7 no aplica por lo de siempre: las capturas
retratan el estado por defecto y ninguno de los cinco cambios se ve ahí; lo que sí los abre es el paso 6.
