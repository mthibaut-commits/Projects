---
type: sesion
title: "Sesión 2026-09-17 — Cablear los gates"
description: "Se creó la capa tests/contract/ (29 tests en seis archivos, sin dependencias, con sonda negativa), tres hooks deterministas en Node y un CI de un solo job; el primer gate encontró algo real en su primera corrida"
tags: [sesion, gates, hooks, ci]
timestamp: 2026-09-17T15:29:14Z
feature: null
---

# Sesión 2026-09-17: cablear los gates

## Hecho

- **`tests/contract/`** con `node --test "tests/contract/*.test.mjs"` (paso 4 de la verificación, ~8 s): `vault`
  (frontmatter OKF, ≤80, ≤150, «sólo el tablero afirma la fase»), `invariantes` (índice ↔ archivos ↔ suite ↔
  `INVARIANTES` del fuente ↔ `regla N` citadas en el `.jsx`), `fuente` (duplicados, montaje raíz ausente, clases
  `tN` en los dos sentidos, `stageName` de módulo, `vendorOrden` igual en los dos builds), `suite` (un número → un
  título, consecutivos, snapshot 114), `auditores` (líneas base de `auditar_muerto` y regla de «las puras siguen
  puras» de `auditar_aislamiento`), `hooks` (la lógica de los tres y una corrida por stdin). **29/29 en 7,6 s.**
- **Hooks en Node**, versionados en `.claude/settings.json` + `.claude/hooks/`: `protect_paths` (ADR aceptados,
  vendor, generados, feed externo, Legado, `.env`, lockfiles), `gitflow_guard` (preset A: `main`), `worktree_guard`
  (`ask`). Health check de punta a punta: 8 de 8 como se esperaba.
- **CI** `.github/workflows/gates.yml`: un job, toda rama y todo PR, los cinco pasos en el orden de `CLAUDE.md`,
  TypeScript y Playwright fijados a propósito.
- **Docs**: `.claude/rules/testing.md`, `vault/conocimiento/flujo_git.md`, `loop_agentico_hooks.md`,
  `invariantes.md` § Gates, ADR-0002, índices; `CLAUDE.md` con el paso 4 y los hooks en las reglas 6 y 10 (105
  líneas); README con el paso de contrato; `.gitignore` con `settings.local.json`, `node_modules/`, `.worktrees/`.
- Verificación completa sobre el fuente, que no se tocó (y eso se prueba, no se afirma): `tsc` limpio, 0 duplicados,
  build 40,6 MB, **114/114 PASA**.

## Decisiones tomadas con el usuario

- «ahora cablea los gates» → el paso 1 del tablero anterior, entero: tests de contrato, hooks y CI (17-09).
- Registradas en ADR-0002: `node --test` sin dependencias, hooks en Node, sin tdd-guard ni formateador, líneas base
  en vez de «cero muertos», preset A como supuesto con evidencia, `regresion_diferencial` manual, sin tag hasta el
  merge, gate de datos pospuesto a la decisión del usuario.

## Errores encontrados y su solución (regla 11)

1. **`node --test tests/contract/` no corre nada.** Node 22 toma el argumento como archivo (`MODULE_NOT_FOUND`); mi
   sonda previa en el scratchpad había salido 0 con «tests 0» y no la miré. Solución: el glob **entre comillas**,
   `node --test "tests/contract/*.test.mjs"`, que expande Node y funciona igual en Windows.
2. **Importar un `.test.mjs` desde otro registra sus tests dos veces** (32 en vez de 29, y el fallo aparecía
   duplicado). El helper compartido (`numerosDeCasos`) vive en `_comun.mjs`, que no es un test.
3. **La regex de `.env` sólo aceptaba el nombre exacto** (`.env`, `.env.*`) y el health check del skill usa `x.env`:
   la corrida por stdin devolvió 0. Se amplió a `*.env` y `.env.*`, como el glob de referencia.
4. **El gate de numeración cazó tres casos con `ok()` doble** (30, 45, 52). Eran ramas de guarda legítimas —el
   mismo caso, el mismo título, reportado fallido cuando no hay deudor de prueba—. La regla pasó de «número único»
   a **«un número → un solo título»**, que es lo que de verdad distingue dos casos pisándose.
5. **`/usr/bin/time` no existe en el contenedor**, y con `2>&1 | grep` el error desapareció y los filtros salieron
   vacíos dos veces. Medir con `date +%s%N`, y no filtrar la salida de un comando que puede no existir.

## Pendiente / siguiente paso

- Mirar el **primer run del CI** tras el push: lo que sólo el CI puede probar (la instalación de Chromium en el
  runner, el tiempo de la suite) se mira en su primer log. Después, merge y tag: ver el tablero.

## Sorpresas y aprendizajes

- **El primer gate encontró algo real en su primera corrida** (los tres `ok()` dobles). No era un defecto, pero
  nadie lo sabía: 117 llamadas para 114 casos. Un gate que nace verde sin haber encontrado nada no ha demostrado
  que mire.
- **`npx tsc` sin TypeScript instalado no falla: instala «tsc», otro paquete.** Acá funcionaba porque el contenedor
  trae TypeScript global. Por eso el CI instala `typescript@6.0.2` y `playwright@1.56.1` a propósito, y por eso el
  comando de `CLAUDE.md` es el correcto sólo donde TypeScript existe.
- **Un gate «cero hallazgos» habría nacido en rojo**: el auditor de código muerto tiene 7 hallazgos que él mismo
  pide revisar a mano. La línea base como literal es lo que convierte un inventario en un gate sin apagarlo el
  primer día — y encogerla queda en el commit.
- **Las líneas base son deuda visible.** 7 + 7 + 8 sin gate quedaron escritos en el tablero, no escondidos en el
  literal.
