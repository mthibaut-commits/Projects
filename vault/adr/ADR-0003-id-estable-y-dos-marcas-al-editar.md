---
type: adr
title: "ADR-0003 — El id de la operación es estable, y editar una oferta cerrada usa dos marcas"
description: "Dos decisiones del 17-09-2026 con alternativa descartada: el cierre del día deja de renombrar la operación (se descartó resolver el id viejo por la cadena reabiertaDe), y «Editar la oferta» marca la edición aparte de la revocación de la firma (se descartó reusar reabierta y se descartó derivar «cerrada» sólo de ofertaCerrada)"
tags: [adr, detalle, tubo, identidad, firma]
timestamp: 2026-09-17T16:31:37Z
estado: aceptada
reemplaza: null
---

# ADR-0003: el id es estable, y editar usa dos marcas

## Contexto

El usuario reportó que «cuando se simula no se está actualizando el tubo», con dos capturas de la misma
operación: `OP-R2`8488 en el detalle y `OP-R4`8488 en el tubo. `rolloverDia` (el cierre del día) reescribía
`d.id` como `OP-R<día><últimos 4 dígitos>` en las oportunidades no gestionadas; el detalle es pestaña
propia (regla de `.claude/rules/code_style.md`) y el aviso `nex-simulado` viaja por id, así que el tubo lo
descartaba en silencio. En la misma sesión el usuario pidió que, cerrada la oferta, el CTA se reemplace por
un chip «Operación creada» y una acción **Editar** que reabra el paquete y re-evalúe todo (regla 32).

## Decisión

1. **El id de una operación no cambia nunca.** El cierre del día re-origina el PAQUETE (facturas, deudores,
   montos, sin simular) y cuenta la reapertura en `reabiertaDia`/`reaperturas`, pero conserva la clave. Todo
   lo que cuelga de la operación —ticket del detalle, repositorios por operación (visado, verificaciones,
   versiones, giro), índice de folios comprometidos, bitácora— está indexado por ese id.
2. **Editar una oferta cerrada pone `enEdicion`; la revocación de la firma sigue siendo `reabierta`.**
   Son hechos distintos con vida útil distinta: `enEdicion` la limpia `cerrarOferta` (volver a cerrar es lo
   que devuelve el cierre), `reabierta` la limpia sólo una firma nueva del cliente (regla 1). `reabierta` se
   pone únicamente cuando había firma que revocar.
3. **El predicado del cierre es `ofertaCerradaVigente(deal)`** —`(ofertaCerrada || negocioNum) && !enEdicion`—
   y `ofertaPublicada` **no** mira `enEdicion`: publicar es un hecho que ya ocurrió (el correo salió).

## Alternativas consideradas

- **Resolver el id viejo por la cadena `reabiertaDe`** en el receptor del aviso — descartada: `reabiertaDe`
  guardaba sólo el id inmediatamente anterior, así que dos cierres de día rompían la cadena; no arreglaba a
  los repositorios ni al ticket, que seguían apuntando a un id muerto; y el esquema `OP-R<día><4 dígitos>`
  colisionaba entre operaciones con los mismos 4 dígitos finales el mismo día. Nadie leía `reabiertaDe`.
- **Reusar `reabierta` como marca de edición** — descartada: `cerrarOferta` tendría que limpiarla para que
  la oferta vuelva a estar cerrada, y con eso `aprobacionFormalCliente` volvería a `true` sobre una firma que
  el cliente revocó: **la firma reaparecería sin que nadie haya firmado**. El caso 116 lo fija.
- **Derivar «cerrada» sólo de `ofertaCerrada`** (ignorando `negocioNum`) — descartada: el Agente IA publica
  por WhatsApp sin pasar por `ofertaCerrada` y deja `negocioNum`; `ofertaPublicada` depende de las dos
  banderas y cambiar su base habría movido el tab de Verificación (que aparece con la oferta publicada).
- **Dejar el paquete editable mientras está cerrado** (lo que había) — descartada: la selección cerrada es
  la que se le comunicó al cliente, con su código de negocio; cambiarla por debajo contradice al cliente sin
  que nada lo diga, y es exactamente lo que O05 custodia con la huella (regla 23).

## Consecuencias

- Un aviso `nex-simulado` para una operación que el tubo no tiene ya no se descarta en silencio: queda en el
  log del sistema. El silencio fue lo que escondió el defecto durante días.
- Los repositorios por operación sobreviven al cierre del día. Para una oportunidad en prospección están
  vacíos; si tuviera una pre-evaluación, el visado por criterio se conserva —que es la misma semántica que
  «lo ya excepcionado y vigente conserva su estado» de la regla 32—.
- `cerrarOferta` y `reabrirOperacion` avisan al tubo por `avisarTubo`, que fusiona los patches por operación.
- Deuda: la guarda contra una segunda solicitud al comité idéntica compara contra las solicitudes de la
  pestaña que cierra; con la pestaña cerrada en medio entra una segunda (regla 32).

**Eje del trade-off.** Se compra **identidad estable** —y con ella que todo lo indexado por id siga
apuntando a algo— a cambio de que el rótulo de la operación ya no diga en cuántos días se reabrió (lo dice
el `status`, con palabras).
