---
type: sesion
title: "La oportunidad es una sola lista: la fila del tubo y el detalle cuentan lo mismo"
description: "El tubo decía 3 deudores · 3 facturas y el detalle ofrecía 23: la fila juntaba la oferta y facturasDisponibles, el detalle le sumaba el libro del cliente en ventana. poolOportunidad es la única lista y las dos pantallas la leen. Regla 84, caso 180, e2e-84-a"
tags: [sesion, tubo, detalle, oportunidad, regla-84]
timestamp: 2026-09-24T07:30:00Z
---

# La oportunidad es una sola lista · regla 84

## Qué vio el usuario

> «En la lista de oportunidades aparecen 3 deudores · 3 facturas, pero al entrar al detalle aparecen muchas más. ¿No
> deberían coincidir si sumo todos los ítems de la tabla?» · «Al menos coincidir el número de buenas facturas.» · «No
> puede ser otra fuente si la pantalla de detalle es el detalle de la línea de la tabla.»

`TECNOLOGIA Y SERVICIOS DE GESTION HOTELERA SPA · OP-D32455`: la fila decía **3 deudores · 3 facturas · M$259,6** y el
arranque del detalle **Todo lo disponible · 23 fact. · M$1.216,1**.

## De dónde salían las otras veinte

- La fila (`analisisDeudoresDeDeal`) juntaba `facturasOp` y `facturasDisponibles`: lo que el inbound trajo, lo que no
  cupo en la línea (`corte.fuera`) y los deudores «Otro» del cedente. Para este cliente, tres documentos.
- El detalle (`candidatasLibro`) parte de esas mismas candidatas y les suma **el libro de ventas del cliente en la
  ventana del tenant** (`ventanaLibroDias`, 60 días), leído del A1 — que es, desde que dejó de sintetizarse, la fuente
  de «Deudores disponibles». Veinte documentos más.
- Y el chip «Todo lo disponible» filtraba por `estadoCandidata(...).agregable`: sólo las buenas.

Dos cuentas del mismo hecho, y el usuario las sumó.

## Lo que quedó

- `poolOportunidad(deal)`, de nivel módulo y pura: la oferta más las candidatas —pool de la operación y libro en
  ventana— sin repetir folios y sólo las agregables. Sin RUT no hay libro; queda el pool de la operación.
- La fila del tubo la analiza (`analisisDeudoresDeDeal`) y el arranque del detalle la parte en sus tres chips. La
  igualdad es estructural: no hay dos construcciones que puedan separarse.
- `deal.facturas` y `deal.monto` no cambian (lo que el inbound trajo, o la oferta): los siguen leyendo el embudo y los
  KPI. Si el KPI del tubo debe sumar la oportunidad completa, es una decisión aparte y quedó dicha en la regla.
- Caso **180** sobre un emisor real del libro y `e2e-84-a` sobre la fila 0 del Directorio contra su detalle.
- **Costo, medido:** recorrer el libro de cada cliente costaba ~0,5 ms por fila (47 ms por 100 filas del tubo). La lista
  se recuerda por objeto de operación (`WeakMap`) con el índice de folios en otra operación (`FOLIOS_VER`) y la ventana
  del libro en la clave: el objeto cambia con cada patch y lo de afuera que decide invalida.

## Verificación

Prettier y ESLint limpios · `tsc` sin TS1 · 0 duplicados · build OK · 614/614 gates · suite **180/180** · e2e **41/41**
(`e2e-84-a`: OP-DIR3, tubo 69 facturas · M$4.593,7 = detalle «Todo lo disponible · 69 fact. · M$4.593,7») · capturas.
