---
type: sesion
title: "Sesión 2026-09-17 — «Operación creada» + Acciones › Editar, y el id que cambiaba con el cierre del día"
description: "Cerrada la oferta, el CTA se reemplaza por el chip «Operación creada» y un menú Acciones con «Editar la oferta», que reabre el paquete y re-evalúa todo conservando lo ya excepcionado; y el defecto reportado «cuando se simula no se está actualizando el tubo»: el cierre del día le cambiaba el id a la operación"
tags: [sesion, detalle, tubo, editar, rollover]
timestamp: 2026-09-17T16:32:52Z
feature: null
---

# Sesión 2026-09-17: «Operación creada» + Editar, y el id que cambiaba

## Hecho

- **Regla 33** (`curse_firma_y_etapas.md`): cerrada la oferta, el CTA «Enviar a Comité y Publicar» se va y
  queda el chip **«Operación creada»** + botón **Acciones** (`panelAcciones(false)`) con **Editar la oferta**.
  El paquete cerrado queda de **sólo lectura** (`soloLectura = bloqueado || paqueteCerrado`, separado de
  `bloqueado` para no afirmar una firma que no existe) y la guarda está en las mutaciones
  (`incorporarFacturasOferta`, `retirarFacturaOferta` salvo `noConfirmada`). Tres marcas para tres hechos:
  `enEdicion` (cerrada, lo que Editar deshace), publicada (no se deshace), `reabierta` (la firma, sólo si la
  había). Funciones puras nuevas: `ofertaCerradaVigente`, `edicionOperacion`, `mismaSolicitudComite`.
- **Re-cerrar re-evalúa todo y conserva lo excepcionado vigente**: no hubo que programarlo (visado por
  `stKey`, `visadoKey` con la huella); sí hubo que evitar que la solicitud al comité se **duplique** al
  re-cerrar con el mismo detalle (NEX no puede retirar la anterior, regla 15).
- **Defecto reportado por el usuario** («cuando se simula no se está actualizando el tubo»): `rolloverDia`
  reescribía `d.id` como `OP-R<día><últimos4>`; el detalle (pestaña propia) mandaba `nex-simulado` con el id
  viejo y el tubo lo descartaba en silencio. **El id ya no cambia** (ADR-0004); el receptor loguea lo que no
  encuentra. Añadido a la regla 22.
- `cerrarOferta` y `reabrirOperacion` **avisan al tubo** (`avisarTubo`, cola fusionada por operación).
- Caso **116** en la suite (`CASOS_ESPERADOS` 115 → 116); regla 33 con su fila en `invariantes.md`
  (63 reglas tras mezclar `main`); capturas regeneradas; vault, `README.md`, `testing.md` y `CLAUDE.md` con el conteo nuevo.
- Verificación: `tsc` sin TS1 · 0 duplicados · build 40,7 MB · `auditar_unidades` 0 · gates de contrato ·
  **116/116 PASA** · sonda del detalle **19/19** (cerrar → chip → Editar → retirar → Re-evaluar → re-cerrar
  con el mismo N°) · sonda del cierre de día **6/6** (día 1 → 3, 21/21 ids intactos, el tubo se entera) ·
  0 errores de página.

## Decisiones tomadas con el usuario

- «Cuando la operación ya esté cerrada puede ocultar el botón … reemplazarlo por chip "Operación creada" más
  un dropdown "Acciones" con la acción Editar … al eliminar o agregar se re-evalúa todo; si ya hay
  excepciones que se excepcionaron y siguen vigentes se mantiene su estado» (17-09). Regla 33 y ADR-0004.

## Errores encontrados y su solución (regla 11)

1. **El patch del cierre se armaba dentro del updater de `setDeals` y se leía después para mandarlo al
   tubo: todavía era `null`** — la misma trampa que dejó mudo a `nex-simulado` el 12-09 (regla 22). La sonda
   lo mostró (el tubo recibía la simulación y no el cierre); el patch se arma ahora ANTES, desde el negocio
   previo a la actualización.
2. **El aviso de la simulación salía duplicado** al convertir el slot en cola: el updater corre dos veces
   (`setDeals` y `setSelected`). La cola fusiona por operación: colapsa el duplicado y suma los distintos.
3. **Un `replace` de línea completa renombró la PROP `bloqueado={bloqueado}` a `soloLectura={soloLectura}`**
   (`SimResumen` declara `bloqueado`). Cambiar el VALOR, no el nombre; se vio en el diff, no en `tsc`.
4. Sondas de Playwright: los botones con ícono llevan un espacio inicial en `textContent` (`^Enviar` no
   calza), el selector de vista es un **dropdown con backdrop** (dejarlo abierto intercepta todos los clics) y
   el contador «Día N · hora H/8» vive en Kanban › Bandeja Inbound, no en la tabla.
5. `main` avanzó durante la sesión con la partición de `CLAUDE.md` y el vault: las notas se re-alojaron
   (regla 33 en vez de «30-quater», siguiente entero libre; nació como 32 y se renumeró al mezclar `main`) y la rama se rehízo desde `origin/main`.
6. Un f-string de Python con llaves dentro de la prosa (`{bloqueado}`) reventó el script que escribía el
   vault a medio camino: los bloques largos van como cadenas planas con un marcador para la fecha.

## Pendiente / siguiente paso

- **Merge `--no-ff` a `main`** cuando el usuario lo diga (la rama está pusheada y el CI corre en ella).
- Sigue **sin tocar** el restyle del detalle que el usuario pidió antes: chips de Giro sin badge de monto,
  «Línea disponible» sin el badge de puntual, chip naranja con la solicitud de línea, montos en `$`, Express
  en azul. Ver el tablero.

## Sorpresas y aprendizajes

- Un `return` silencioso en un receptor de `postMessage` se ve **exactamente igual** que un aviso que nunca
  se envió: la primera versión de cada canal entre pestañas tiene que loguear lo que descarta.
- «Cerrada», «publicada» y «reabierta» parecían una sola bandera y son tres hechos con tres vidas útiles;
  la que se reusa de más devuelve una firma que nadie dio.
- **Dos sesiones paralelas tomaron el mismo «siguiente entero libre»**: `main` recibió primero una regla 32 y un
  ADR-0003 (punto fijo del generador) mientras esta rama tenía los suyos. El número se confirma al MEZCLAR, no al
  escribir: se renumeró lo de esta rama (33 / ADR-0004) porque `main` ya estaba integrado y verde.
