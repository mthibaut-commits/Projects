---
type: conocimiento
title: "Flujo git — main estable, ramas cortas, merge --no-ff, tags"
description: "El preset elegido (GitHub Flow: sólo main + ramas cortas), qué bloquea el hook gitflow_guard y cómo se escapa a propósito, el versionado por tags y por qué no hay worktrees salvo a pedido"
tags: [conocimiento, git, flujo]
timestamp: 2026-09-17T15:29:14Z
---

# Flujo git

**Preset A — GitHub Flow.** Elegido el 17-09-2026 por evidencia y no por preferencia: el repo tiene una sola
rama de integración (`main`), ninguna `develop` y ningún pipeline que despliegue ramas a ambientes. Si eso
cambia —un pipeline de la casa que lleve `develop → dev` y `main → prod`—, el cambio es **una línea**:
`INTEGRACION` en `.claude/hooks/gitflow_guard.mjs` pasa a `["develop", "main"]`, y este documento se
reescribe con el preset B. Está registrado como supuesto en ADR-0002.

## Reglas

- **`main` es siempre estable.** Todo commit en `main` pasa los cinco pasos de verificación (CI corre los
  mismos en toda rama: si dos ramas tuvieran gates distintos, la de gate más débil sería la puerta de atrás).
- **El trabajo va en ramas cortas**: `feature/<slug>`, `fix/<slug>`, o la **rama designada de la sesión**
  cuando el trabajo lo hace Claude Code (`claude/<nombre>`), que es lo que ha pasado hasta hoy. Días, no
  semanas; un cambio grande se parte en varias.
- **Integración: siempre `git merge --no-ff`** desde `main`. El merge commit es lo que deja la feature
  visible y revertible como unidad. **Nunca** un push con refspec cruzado (`git push origin <rama>:<integración>`):
  integra por fast-forward y reescribe la historia como si la feature se hubiera hecho en `main`.
- **Sin commits directos sobre `main`**, salvo una edición T3 acordada con el usuario (un typo, el tablero):
  ésas se prefijan con `GITFLOW_ALLOW=1` para pasar el guard **a propósito**, que es distinto de rodearlo.
- **Mensajes en español, descriptivos**, que digan qué y por qué: el estilo del `git log` de la casa
  («Parte CLAUDE.md por vida útil: …», «Otorgamiento: el contrato físico se carga en la tarjeta de O05…»).
  El método de una tarea de datos va en el mensaje, no en un documento.
- **Worktrees sólo si el usuario los pide** con esa palabra. El hook `worktree_guard` convierte el intento en
  un diálogo de permiso, y `bgIsolation: none` evita que una sesión en background los fuerce.
- La rama se borra después del merge.

## Lo que impone el hook (`.claude/hooks/gitflow_guard.mjs`)

| Comando | Estando en | Resultado |
|---|---|---|
| `git push … <rama>:<integración>` | cualquiera | **bloqueado** (refspec cruzado) |
| `git merge <rama>` sin `--no-ff` | `main` | **bloqueado** |
| `git commit …` | `main` | **bloqueado**; `GITFLOW_ALLOW=1 git commit …` pasa |
| todo lo demás | — | pasa |

Sólo gobierna las sesiones de Claude Code: un `git push` a mano desde Windows no pasa por ningún hook. La
lógica está probada en `tests/contract/hooks.test.mjs` con sus catorce casos.

## Versionado

Releases = tags anotados en `main`, `vX.Y.Z`: `Z` sólo hotfixes, `Y` releases normales, `X` hitos. Hoy no
hay ningún tag (108 commits); el primero corresponde cuando `main` reciba el vault y los gates. Un hotfix
sale de `main` en `hotfix/<slug>`, con el test de regresión primero, y vuelve con `--no-ff` y un tag que sube `Z`.
