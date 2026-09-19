---
type: sesion
title: "Sesión 2026-09-18 — El orden de la tabla y la Bandeja Inbound"
description: "El orden pasa a ser prioridad de gestión (oferta → publicada → prospección → …) con las que tienen línea global disponible primero; la tabla deja de re-ordenarse en cada lote; y la bandeja deja de botar facturas de la cartera en silencio (reglas 30-bis y 36)"
tags: [sesion, tubo, orden, inbound]
timestamp: 2026-09-18T21:00:00Z
feature: null
---

# Sesión 2026-09-18: el orden de la tabla y la Bandeja Inbound

Tres preguntas del usuario sobre la misma pantalla. Las tres se contestaron **midiendo en el navegador**,
no leyendo el código, y las tres destaparon algo que el código no decía.

## 1 · «¿Por qué el contador de Otras Empresas sube y baja?» → regla 36

Porque la bandeja es una **ventana deslizante**. Medido con el stream corriendo 70 s: osciló entre **1 y 13**
y **bajó en 18 de 45 mediciones**, quieto sólo al drenarse el stream.

El defecto de fondo era **el nombre de la perilla**. `topeDocsCorrida` estaba documentada como «tope de
documentos procesados por corrida (control de carga)» y era, en su **único** uso, el **tamaño de la bandeja**.
En 60 contra `loteStream: 250` no alcanzaba a guardar **ni un lote**. Un nombre que miente sobre lo que hace
una perilla es lo que deja pasar un default absurdo durante meses: nadie compara «60» contra «250» si cree
que son cosas distintas. Quedó `topeBandeja` en 500 y `SCHEMA_VERSION.cfgOper` en 2.

Pero el stream trae **30.000 documentos**: recortar es inevitable, así que lo que se decide es **a quién se
le bota el trabajo**. `recortarBandeja` saca primero las facturas **sin dueño**; una de la cartera sale sólo
cuando no queda otra cosa, y entonces se cuenta aparte y el aviso se pone rojo. Medido (caso 142): con el
criterio viejo, de 40 facturas de cartera en un lote de 250 sobrevivían **cero**; con el nuevo, **las 40**.

## 2 · «¿Cómo se ordenan? Salta mucho al cargar» → regla 30-bis

El orden pasa a ser **prioridad de gestión** y no avance: `oferta → publicada → prospección → otorgamiento →
aceptada → cesión`, y dentro de cada etapa **primero las que tienen línea global disponible**, cada grupo por
plata. Responde «¿qué tengo que hacer hoy?». Por eso el símbolo se llama ahora `prioridadDeDeal`: con el
orden nuevo, «avance» era un nombre que mentía.

Los saltos **no eran un defecto del orden**: en producción el libro se consulta una vez por hora
(`frecuenciaMin: 60`) y la demo comprime esa hora en `cronMs` (3,5 s), o sea **~1.000×**. La tabla se
re-ordenaba en **cada lote** (350 ms). `ordenEstable` aplica el orden nuevo **una vez por corrida** —la
cadencia real— y dentro de la ventana conserva el que el ejecutivo está mirando; las filas nuevas entran
igual, al final, porque retenerlas sería esconder trabajo.

## 3 · Lo que salió al medir, y que nadie preguntó

El tab decía **«Todos 262» sobre una tabla de 307 filas**. «Todos» apilaba una fila **por factura** mientras
la pestaña «Otras Empresas» las agrupaba **por cliente**, y el contador contaba facturas. Ahora las dos salen
de `agruparInboundPorCliente`, pura y de nivel módulo: medido después, **196 = 196**.

## Errores propios, anotados para no repetirlos

- **Una sonda mal escrita da un número bonito y falso.** Reporté «los saltos bajaron de 23/45 a 3/42»: el
  3/42 era un artefacto —las filas del inbound no tenían id `OP-…`, la sonda leía «?» en todas y concluía
  «no se movió nada»—. El número real es **15/43**, consistente con una ventana de 3,5 s muestreada cada
  1,5 s. Una medición que mejora *demasiado* hay que dudarla antes de celebrarla.
- **Un caso puede probar el camino equivocado.** El 142 comparaba contra la lista **sin invertir**, y el
  flujo real antepone el lote **invertido**: daba 40 supervivientes donde el código real deja 0. Lo cazó el
  propio caso al ponerse en rojo.
- **`_lineaIdx` está memoizado**: plantar en `LINEAS_DATA` sin invalidarlo no se ve, y `lineaCreditoDe` se
  cae al uso sintético por hash. Es la misma invalidación que hace el fuente al constituir una línea.
- **Al mezclar un reformateo total, `--ours` sobre el archivo entero descarta trabajo ajeno.** Prettier tocó
  41.835 líneas; tomé mi versión y la re-formateé, que es correcto **sólo** si el otro lado no cambió nada
  más. Cambió: `estadoCliente` pasó a leer `CLIENTE_ESTADOS` en vez de repetir los literales. Lo cazó la
  línea base de `auditar_muerto` —el símbolo volvió a aparecer como muerto—, no yo. **La comparación buena
  es formatear las dos versiones con la misma config y diferenciar**: 33 líneas, no 41.835.
