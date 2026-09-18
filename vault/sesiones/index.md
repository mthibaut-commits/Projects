---
type: indice
title: "Sesiones — el tablero y los logs"
description: "estado_actual.md es el tablero (≤80 líneas, se sobrescribe); cada sesión deja un log con lo hecho, los errores y su solución, lo pendiente y las sorpresas"
tags: [indice, sesiones]
timestamp: 2026-09-18T03:25:00Z
---

# Sesiones

- [`estado_actual.md`](./estado_actual.md) — **el tablero**. Es el primer archivo que lee toda sesión y el
  último que actualiza. ≤80 líneas; se sobrescribe, no crece. La única casa de la fase y del siguiente paso.
- Un log por sesión, `YYYY-MM-DD_<tema>.md`, con *Hecho · Decisiones tomadas con el usuario · Errores
  encontrados y su solución · Pendiente · Sorpresas y aprendizajes*. Lo que en 3 meses siga importando sube a
  `../conocimiento/`.

| Fecha | Log | Qué pasó |
|---|---|---|
| 17-09-2026 | [`2026-09-17_partir_claude_md.md`](./2026-09-17_partir_claude_md.md) | Auditoría de bootstrap agéntico y partición de `CLAUDE.md`; se abre el vault |
| 17-09-2026 | [`2026-09-17_cablear_gates.md`](./2026-09-17_cablear_gates.md) | Tests de contrato, hooks deterministas y CI; primer hallazgo del gate de la suite |
| 17-09-2026 | [`2026-09-17_merge_a_main.md`](./2026-09-17_merge_a_main.md) | `main` mezclado en la rama (cuatro commits paralelos, conflicto en `CLAUDE.md` portado al vault), `--no-ff` a `main` y `v0.1.0` |
| 17-09-2026 | [`2026-09-17_generador_v04_v10.md`](./2026-09-17_generador_v04_v10.md) | El A10 modela la relación por perfil y V10 pasa a ser del deudor: «verificados por modelo» 5% → 50%; se descubre que la cadena A2 → A5 → A2 del generador no tiene punto fijo y se regenera por bloque (`--solo`) |
| 18-09-2026 | [`2026-09-18_spec_gestion_excepciones.md`](./2026-09-18_spec_gestion_excepciones.md) | Spec del proceso operativo de una excepción de otorgamiento (`spec-gestion-excepciones.md` + PDF), verificado contra el fuente; Context7 no disponible ni aplicable; se corrigen dos viñetas del layout A16 (D02–D13 son excepciones, no bloqueos firmes) y los conteos del catálogo en `spec-otorgamiento.md` |
| 17-09-2026 | [`2026-09-17_punto_fijo_generador.md`](./2026-09-17_punto_fijo_generador.md) | Se cierra el bucle A2 → A5 → A2 del generador: la intención de participación pasa a ser un insumo declarado (`lib/intencion_sow.js`, congelado con la trayectoria que produjo el A2 vigente, hallada por arqueología en git), una corrida completa reproduce `datos_inyectados.js` byte a byte sin mover una cesión; gate `generador.test.mjs`, regla 32, ADR-0003 |
| 17-09-2026 | [`2026-09-17_unidades_v04.md`](./2026-09-17_unidades_v04.md) | El desfase de unidades de V03/V04/V09 se corrigió igual en dos sesiones; se reintegró desde `main` con lo adicional: V04 y V10 siguen mandando al teléfono a casi todos (dato y política), el layout del A10 en miles, el script de regresión en pesos |

La historia anterior al vault (02-09 → 16-09-2026) no tiene logs propios: vive dentro de las reglas de
dominio (cada una trae fecha y qué la motivó) y en `Auditoria_*.md` e `Inconsistencias_*.md`.
