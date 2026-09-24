---
type: adr
title: "ADR-0023 · La pérdida por cesión a la competencia es un hecho del A2: la oferta se pierde entera sólo si otro factoring se llevó todas sus facturas, y una parte se anota"
description: "Retira el sorteo del 12% con que el cron perdía oportunidades de cedentes que alguna vez cedieron afuera; la decisión pura perdidaPorCesion mira las facturas de la oferta contra el A2. avanzarPipeline —el motor muerto donde vivía la versión correcta— no se retira en este cambio: el gate de la regla 48 vigila su texto y la rama viva que lo reemplazaría gira sin VER-01"
tags: [adr, perdida, aecsync, pipeline]
estado: aceptado
timestamp: 2026-09-23T23:30:00Z
---

# ADR-0023 · La pérdida por cesión a la competencia es un hecho del A2

## Contexto

La revisión de Reportes del 23-09-2026 (hallazgo 8) encontró la pérdida por cesión en dos sitios que decían cosas
distintas:

- **`evaluarPerdidas`** —lo único que el cron corre para detectar pérdidas— tomaba el competidor del historial del
  cedente (`aecCompetidorDe`) o de una lista por hash (`competidorDe`) y perdía la oportunidad con
  `rndDetBool(aec|id, 0.12)`: el 12 % de las oportunidades de un cedente que ALGUNA VEZ cedió afuera se perdía por
  sorteo, sin que ninguna de sus facturas estuviera cedida. La causa quedaba escrita como un hecho —«AECSync: las
  facturas fueron financiadas por X»— y alimentaba el Kanban, el Sankey y el benchmark de deudores.
- **`avanzarPipeline`** sí miraba las facturas de la oferta contra el A2 (`cesionesAjenasDeDeal`) y perdía la oferta
  entera sólo si otro factoring se las había llevado TODAS; con una parte, anotaba `cedidasOtro` y seguía. Pero es un
  motor por timer que nadie invoca: `avanzarRef` lo guarda y ningún sitio lo llama, porque el avance es por eventos
  desde hace semanas.

## Decisión

1. **La pérdida por cesión la decide el A2**, con la función pura de nivel módulo `perdidaPorCesion(deal, ced)`: la
   oferta se pierde **entera** sólo si otro factoring ya se llevó **todas** sus facturas —no queda nada que comprar—,
   con ese factoring y sus folios en la traza. Si se llevó una parte, **no** se pierde: se anota cuántas
   (`cedidasOtro`) y a quién, y la oferta sigue con el resto. Lo cedido a Security es cartera propia y no cuenta. Sin
   facturas en la oferta no se pronuncia.
2. **`evaluarPerdidas` la usa** en lugar del sorteo. Sigue evaluando una sola vez por oportunidad (`cesionEval`) y en
   las mismas etapas (Prospección, Oferta, Aceptada).
3. **`avanzarPipeline` NO se retira en este cambio.** Al retirarlo en la misma sesión se cayó el gate de la regla 48:
   la rama «otorgamiento → Pendiente Integración» (`otorgamientoCompleto(d) && verifResumenDeal(d).pend === 0`) sólo
   existe en ese código muerto. Lo que corre es un efecto del componente raíz que, con `otorgamientoCompleto`, manda
   la operación directo a «Girada» sin mirar la verificación (VER-01) y sin pasar por «Pendiente Integración»
   (reglas 26 y 43). Llevar la rama correcta al efecto vivo es un cambio T1 sobre el flujo del giro, fuera del
   alcance de la revisión de Reportes: queda en el tablero como decisión del usuario.

## Alternativas descartadas

- **Conservar el sorteo**: inventa un hecho del registro y lo escribe como causa de la pérdida (regla 5 pide causa
  específica; una causa sorteada no es específica, es falsa).
- **Perder la oferta si CUALQUIER factura está cedida a otro**: el resto del paquete sigue siendo comprable. Es lo
  mismo que ADR-0021 descartó para la oferta cerrada: se inhabilita el documento, no la oportunidad.
- **Volver a cablear `avanzarPipeline`**: el avance es por eventos, y ese motor trae otros dos sorteos (el avance de
  etapa del 18 % y una «cesión externa» del 15 %).
- **Retirar `avanzarPipeline` en el mismo cambio**: ver la decisión 3; se probó y se revirtió en la sesión.

## Consecuencias

- Es un **T1**: cambia qué oportunidades el sistema da por perdidas. Regla 78 (`reglas/curse_firma_y_etapas.md`),
  caso 174, `regla_78.test.mjs`; la regla 5 anota la ampliación.
- En la demo, el inbound ya excluye la factura cedida a un factoring ajeno (regla 64), así que una oferta del inbound
  casi nunca lleva facturas cedidas: las pérdidas por cesión dejan de aparecer por sorteo y la columna «Perdida» se
  alimenta de lo que de verdad pasa (el cliente que no acepta, el rechazo manual con su competidor y su tasa de
  cierre, el bloqueo firme). Es el resultado correcto: no hay cesión que el registro no traiga.
- Pendiente (tablero): retirar `avanzarPipeline` llevando al efecto vivo la rama de la regla 48, con su caso en rojo.
