---
type: sesion
title: "Sesión 2026-09-23 (rutina) — Antes de modificar se integra main: la skill sincronizar-main"
description: "El usuario pidió que antes de partir con una modificación se integre main para trabajar sobre la base más actualizada, y que quede en una skill para que sea rutina. Skill propia sincronizar-main, script sincronizar_main.mjs que mide y propone sin tocar nada, gate de contrato con sondas, y el paso 0 del ciclo de una tarea. De paso, las ramas integradas que el usuario borró salen del tablero"
tags: [sesion, git, rutina, skills]
timestamp: 2026-09-23T22:00:00Z
feature: null
---

# Antes de modificar se integra main: la skill `sincronizar-main`

**Qué pidió el usuario.** «Antes de partir con una modificación de la rama main debes integrar los cambios para que
tu base sea lo más actualizada. Agrega esto en un skill para que sea rutinario.»

**Por qué importa, medido.** El mismo 23-09 un bloque de reglas se renumeró dos veces (60–71 → 63–74 → 64–75) porque
otra sesión publicó en `main` mientras ésta trabajaba sobre una base vieja, y una corrección de rótulo tuvo que
re-aplicarse a mano sobre el árbol renumerado ([log](./2026-09-23_mezclar_todo_lo_pendiente.md)).

**Qué se hizo.** Primero se aplicó la rutina a esta misma tarea: la rama estaba al día con `main` (`4cb789f`).
- **La skill** `.claude/skills/sincronizar-main/SKILL.md` (propia, como `datamart-ui`: ADR-0022 sacó las de TERCEROS).
  Cuándo corre —al empezar toda tarea que cambie archivos, antes de tomar un número, y justo antes de mezclar a
  `main`—, cómo, qué hacer con cada acción, cómo se resuelven los conflictos con la doctrina ya escrita, y las
  trampas medidas en este repo.
- **El script** `sincronizar_main.mjs`: `git fetch`, mide `detrás`/`adelante` con `rev-list` y lo propio con
  `git cherry`, decide (detener · al día · avanzar · tomar main · mezclar) y propone los comandos **sin correrlos**,
  para que el hook `gitflow_guard` los vea y el mensaje del commit lo escriba quien lo firma. Da además los
  siguientes enteros libres —regla, caso, ADR, e2e— sobre la **unión** de la rama y `origin/main`. Hoy: regla 76 ·
  caso 172 · ADR-0023 · e2e 29.
- **El gate** `tests/contract/sincronizar.test.mjs` (17 tests): la decisión sobre nueve mediciones plantadas, que
  ningún comando empuje, fuerce, rebase o reescriba, los enteros libres, la skill y sus tres referencias; diez sondas.
- **Las referencias**: paso 0 del ciclo de una tarea (`.claude/rules/workflow.md`), `flujo_git.md`, la regla núcleo 6
  y «Otros comandos» del `CLAUDE.md`, la fila del gate en `invariantes.md`.

**Una decisión de diseño.** El script no integra solo. Si lo hiciera, el hook no vería los `git merge` (el hook mira
el texto del comando de Bash, y `node sincronizar_main.mjs` no dice nada) y el merge commit saldría sin el mensaje
ni la atribución de quien lo firma. Mide, decide y propone; integrar son dos o tres comandos a mano.

**Otra, sobre el árbol sucio.** Con la rama al día, un árbol con cambios no detiene nada: es el trabajo en curso y no
hay nada que integrar. Sólo detiene cuando hay algo que traer.

**El tablero, de paso** (regla núcleo 2): el bloqueo decía que quedaban por borrar «todas las ramas integradas». El
usuario las borró desde Windows; quedan `main`, la de la sesión, el respaldo y `claude/local-mauricio-20260910`,
única copia del estado local del 10-09.
