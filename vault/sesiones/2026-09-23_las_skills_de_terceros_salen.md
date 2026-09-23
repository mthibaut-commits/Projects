---
type: sesion
title: "Sesión 2026-09-23 (herramental) — Las skills de terceros y los servidores MCP salen del repo"
description: "El usuario miró el historial de main y decidió que la rama de herramental no aporta al proyecto: 45 skills de terceros, siete servidores MCP, su auditor, su gate y el descargador de DESIGN.md salen del repo (ADR-0022). Se quedan la skill propia datamart-ui y la regla 63 con su gate de paleta. Se hace con un commit de limpieza encima de main y merge --no-ff, sin revertir merges ni reescribir historia"
tags: [sesion, herramental, skills, mcp]
timestamp: 2026-09-23T20:30:00Z
feature: null
---

# Las skills de terceros y los servidores MCP salen del repo (ADR-0022)

**Qué pidió el usuario.** Mirando el grafo de `main` —los commits `c3db8d3` (13 skills de taste-skill), `a0eb572`
(playwright-mcp), `e78a66b` (graphify), `fcf64bd` (26 skills más), `9651f67` (OmniRoute) y la mezcla `337ccdb` que
los trajo—: «Todas estas ramas no aportan nada al proyecto ya que instalan librerías, ¿puedes descartarlas?».

**Qué había, medido antes de tocar** (`git diff 337ccdb^1 337ccdb` y `git diff a48a7fa^1 a48a7fa`):
- 45 carpetas de skills en `.claude/skills/`; antes de la mezcla sólo existía `datamart-ui`, la del usuario.
- `.mcp.json` con siete servidores (context7, chrome-devtools, supabase, vercel, playwright, graphify, OmniRoute),
  sus lanzadores en `.mcp-servers/`, `.graphifyignore` y dos entradas de `.gitignore`.
- `skills-lock.json`, `auditar_skills.mjs`, `tests/contract/skills.test.mjs`, `Skills/design-md/` (descargador de
  `DESIGN.md` y una referencia ajena), la regla núcleo 13 del `CLAUDE.md` y su fila en «Otros comandos».
- La regla 63 con `regla_63.test.mjs`, que NO depende de las skills: su gate es una línea base de la paleta del
  fuente y la raíz sin `DESIGN.md`.
- Ningún uso desde el fuente, el build, la suite, la capa e2e, el CI ni `.claude/settings.json`.

**Qué se hizo.**
1. La rama de la sesión estaba 31 commits detrás de `main`, con un solo commit sin equivalente exacto (`25e9526`, el
   rótulo, ya aplicado a mano en `main` como `5c76a47`). Se mezcló `main` tomando su árbol entero
   (`merge -s ours --no-commit` + `read-tree -u --reset origin/main`): reaplicar los cambios de la rama sobre las
   reglas renumeradas los habría duplicado. Es un merge, no un reset: nada se reescribe.
2. Un commit de limpieza: 62 archivos fuera (`git rm`), `.gitignore`, `CLAUDE.md` (fila y regla núcleo 13), la regla
   63 (sale la parte de las skills; se queda la de la paleta, que vale para cualquier referencia externa), su fila
   en `invariantes.md`, la fila del gate `skills.test.mjs`, el comentario del gate de la 63, ADR-0022 y su índice,
   la cifra de gates (66 → 65) y el tablero.
3. Integración con `merge --no-ff` a `main`, verificada sobre el árbol mezclado.

**Por qué no `git revert -m 1`.** Los mismos merges trajeron cosas que se quedan —`prettier` fijado al del CI
(`3b7e7bd`), la regla 63, los logs—, y un revert de merge además impide volver a mezclar esa rama más adelante sin
revertir el revert. Un commit de limpieza dice exactamente qué sale.

**Lo que no se pudo.** Las ramas de origen (`claude/vibrant-hopper-33tg8j`) siguen en el remoto: el relay bloquea el
borrado con HTTP 403 (bloqueo del tablero). Su contenido ya no está en `main`.
