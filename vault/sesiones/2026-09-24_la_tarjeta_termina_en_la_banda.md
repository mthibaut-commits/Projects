---
type: sesion
title: "La tarjeta de otorgamiento termina en la banda, y modificar la solicitud abre un panel lateral"
description: "Pedido del usuario con un mockup: «En espera del visto bueno de …» arriba a la derecha, «Modificar solicitud» en la banda de la solicitud, y la ampliación en un panel lateral. La tarjeta pierde la cuarta línea"
tags: [sesion, ui, detalle, otorgamiento]
timestamp: 2026-09-24T09:30:00Z
---

# La tarjeta termina en la banda

## Qué pidió el usuario

> «Puedes dejar la card del tab otorgamiento así, achícala verticalmente ya que se redistribuyó el contenido de la
> última línea.» (mockup: el título a la izquierda y «En espera del visto bueno de Operaciones (N4).» a la derecha; la
> banda «📨 Aprobación solicitada por Carla Rivas · fecha» con «Modificar solicitud» a su derecha; sin cuarta línea)
>
> «La opción modificar debe abrir el panel lateral para poder adjuntar más información.»

## Lo que quedó

- **Cabecera:** el lado derecho —donde estuvo la píldora «Sujeto a excepción · N · cargo», retirada el 24-09— lleva
  «En espera del visto bueno de **cargo (N)**.» cuando hay solicitud vigente, nadie la visó y quien mira no puede
  visarla (`enEspera`, la condición de la rama del ejecutivo). Las otras disposiciones siguen con su píldora.
- **Banda de la solicitud:** «📨 Aprobación solicitada por … · fecha» a la izquierda y **Modificar solicitud** a la
  derecha, sólo para quien pidió (`!estado && !puedeVisar`): el apoderado resuelve, no modifica.
- **Panel lateral** (`<aside>` fijo a la derecha, mismo molde que el editor de reglas y la mesa de la regla 53): título
  «Modificar solicitud», a quién va, la solicitud original como contexto, el comentario, los respaldos (`archChips`,
  `adjuntarLabel`) y Cancelar / Enviar; se cierra con la X, con Cancelar o con clic afuera. La mutación es la misma
  de antes (`ampliarSolicitudExc`): se SUMA a lo enviado, no reemplaza (regla 66).
- La cuarta línea de la tarjeta («En espera … · 📎 Agregar información») desapareció: la tarjeta termina en la banda.

Es un T2 de pantalla: no cambia quién aprueba ni qué se guarda. Verificado abriendo la pantalla (paso 6) y con las
capturas (paso 7).
