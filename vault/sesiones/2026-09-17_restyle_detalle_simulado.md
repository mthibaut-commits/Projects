---
type: sesion
title: "Sesión 2026-09-17 — El detalle simulado según el mockup del usuario"
description: "Seis cambios visuales en la fila del deudor y en las dos secciones de documentos: giro sin badge, línea sin badge puntual, chip naranjo de solicitud para todo deudor que va a comité, montos en pesos, títulos en tinta con panel lila, Giro Express en azul. Medidos en el DOM (15/15)"
tags: [sesion, detalle, ui, mockup]
timestamp: 2026-09-17T17:57:26Z
feature: null
---

# Sesión 2026-09-17: el detalle simulado según el mockup

## Hecho

- **Regla 29, viñeta nueva** (`ui_detalle_y_tubo.md`) y **regla 22, viñeta nueva** (`oferta_pricing_y_giro.md`):
  el chip de giro de la fila va `soloTipo`; el chip de línea pierde el badge «puntual»; el chip **naranjo
  «Solicitud línea $X»** aparece en todo deudor que va a comité (parcial incluido), con la cifra que entra a
  la solicitud (`monto − ev.asignado`) y borde sólido (`borde`, prop nueva de `ChipFila`); el estado sigue diciendo «Requiere comité» —el usuario
  lo prefirió sobre el «Sin línea» del mockup—; títulos de sección en `C.ink` y conteos en `C.indigo`; la oferta dentro del
  mismo panel `C.lilac` que los disponibles; los montos de la fila y sus tooltips en pesos; **Giro Express en
  azul** (`#2563EB`/`#EFF6FF`) en `ChipGiro`, o sea en los tres sitios.
- Las dos capturas del pedido original se **recuperaron del transcript** (base64 en el `.jsonl`) y se midieron
  píxel a píxel con un decodificador PNG propio (no hay PIL): así salieron los colores en vez de estimarlos.
- Verificación: `tsc` sin TS1 · 0 duplicados · build 40,7 MB · gates 29/29 · **116/116 PASA** ·
  `auditar_unidades` 0 · **sonda del detalle 15/15** (títulos, panel, 20 filas sin `M$`, 20 giros sin badge,
  0 badges «puntual», 20/20 deudores pendientes con chip naranjo, 5 parciales con los dos chips, RESUMEN con su
  badge y la píldora de sección en `M$`) · 0 errores de página · capturas regeneradas.

## Decisiones tomadas con el usuario

- «Revisa que el detalle de oportunidad cuando simula quede así …» (pedido con mockup, 17-09) y «AVANZA».
  «Prefiero que diga «Requiere comité», ya que es la acción que conlleva el no tener línea suficiente» (17-09):
  el rótulo «Sin línea» del mockup se había aplicado y se revirtió el mismo día. Un mockup dice cómo se ve;
  cuando un rótulo se aparta de una decisión escrita, se pregunta antes de tomarlo.

## Errores encontrados y su solución (regla 11)

1. **El chip naranjo sólo salía con el cupo en CERO**: un deudor parcial no decía en ninguna parte cuánto iba
   a pedir. Se separó en dos chips (lo que hay / lo que se pide) en vez de hacer que uno mutara.
2. `#EDECF3` sobre `C.lilac` no se distingue: el vacío de la oferta tomó el tono de una tarjeta de fila.
3. Ningún deudor de la operación de prueba calificó para Giro Express (verificado Y sin marcas): el azul se
   comprobó en el fuente construido, y se dice así en vez de fingir que se vio.

## Pendiente / siguiente paso

- **Merge `--no-ff` a `main`** de la rama `claude/migrate-project-session-vui9dl` (dos commits: regla 32 +
  ADR-0003, y este restyle). Ver el tablero.

## Sorpresas y aprendizajes

- Las capturas que el usuario adjunta viven en el transcript y se pueden recuperar tras una compactación:
  buscarlas ahí es más barato —y más exacto— que reconstruir el pedido de memoria.
