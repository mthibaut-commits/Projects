---
type: indice
title: "Sesiones — el tablero y los logs"
description: "estado_actual.md es el tablero (≤80 líneas, se sobrescribe); cada sesión deja un log con lo hecho, los errores y su solución, lo pendiente y las sorpresas"
tags: [indice, sesiones]
timestamp: 2026-09-17T15:29:14Z
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
| 17-09-2026 | [`2026-09-17_cerrar_invariantes.md`](./2026-09-17_cerrar_invariantes.md) | Se cierra la tabla de invariantes: un gate por cada una de las 30 filas que iban sólo por revisión (30 agentes escriben, 30 refutan, se repara lo refutado). La suite pasa de 115 a 139 casos, `tests/e2e/` de 1 a 16 archivos y `tests/contract/` de 6 a 24. Los gates destaparon siete defectos de producto, corregidos en el mismo commit, y 20 desfases regla↔código que quedan como decisión |
| 17-09-2026 | [`2026-09-17_merge_a_main.md`](./2026-09-17_merge_a_main.md) | `main` mezclado en la rama (cuatro commits paralelos, conflicto en `CLAUDE.md` portado al vault), `--no-ff` a `main` y `v0.1.0` |

La historia anterior al vault (02-09 → 16-09-2026) no tiene logs propios: vive dentro de las reglas de
dominio (cada una trae fecha y qué la motivó) y en `Auditoria_*.md` e `Inconsistencias_*.md`.
