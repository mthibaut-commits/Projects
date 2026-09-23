---
type: adr
title: "ADR-0017 · El resultado de líneas entra al criterio del giro: si la oferta pide comité, el giro es Normal"
description: "El modelo de giro toma cuatro hechos y ninguno es de líneas; el usuario decide que la línea sí afecta el tipo de giro: una oferta que requiere comité no puede girar Express"
tags: [adr, giro, lineas, curse]
estado: aceptado
timestamp: 2026-09-22T22:30:00Z
---

# ADR-0017 · El resultado de líneas entra al criterio del giro: si la oferta pide comité, el giro es Normal

## Contexto

`spec-modelo-giro.md` y la regla 22 fijan que el tipo de giro (Express / Normal) sale de cuatro hechos:
primera operación del cliente, resultado del otorgamiento, resultado de la verificación y las marcas de
excepción. El resultado de **líneas** no entra: queda como control LIN-01 en la integración al core. El
modelo del usuario (M-33) dice que la agrupación depende también «del motor de asignación de línea», y al
revisar la diferencia decidió (22-09-2026):

> «El resultado de la línea sí afecta el tipo de giro; si hay que pedir comité el giro debe ser Giro
> Normal.»

## Decisión

- `asignarGiros` recibe un quinto hecho por deudor: **si sus facturas requieren comité** (la asignación
  de líneas no las cubrió completas).
- Un deudor con facturas a comité califica **Giro Normal**, aunque cumpla las condiciones de Express.
- La regla de oro se conserva: la suma por tipo sigue siendo el monto a girar.

## Alternativas descartadas

- **Dejar las líneas fuera del giro** y confiar en LIN-01 (estado actual). Descartada por el usuario: el
  tipo de giro tiene que reflejar que la operación depende de una línea que todavía no existe.
- **Bloquear el giro** de esas facturas hasta que el comité responda. No es lo que se pidió: el tipo
  cambia, no la elegibilidad.

## Consecuencias

- Es un **T1**: cambia un motor (`asignarGiros`) y la regla 22. Regla nueva con gate y caso en la suite
  en las dos direcciones (con comité → Normal; sin comité → lo que ya decidían los cuatro hechos).
- Cambian `spec-modelo-giro.md` §2 y el adaptador `giroResumenDeal`, que tiene que pasar el hecho.
