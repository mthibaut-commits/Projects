---
type: adr
title: "ADR-0002 — Cablear los gates: tests de contrato, hooks deterministas y CI"
description: "Qué se cableó para que la disciplina del repo deje de depender de que alguien se acuerde, qué se descartó a propósito (tdd-guard, formateador, vitest, gate de cero muertos), y en qué se aparta de los defaults del skill"
tags: [adr, gates, hooks, ci, tests]
timestamp: 2026-09-17T15:29:14Z
estado: aceptada
reemplaza: null
---

# ADR-0002: Cablear los gates

## Contexto

La auditoría del 17-09-2026 (hallazgo 4) midió que el repo tenía **48 KB de auditores propios, una suite de
114 casos y cuatro pasos de verificación «obligatorios» — y nada que los ejecutara**: cero hooks, cero CI,
cero tags en 108 commits. `CLAUDE.md` ya documentaba cuatro clases de defecto que ninguno de los cuatro pasos
detecta (la colisión parámetro/variable local, el bloque antes de su dependencia, el componente no importado,
la poda que se llevó `CUENTAS_DEMO`), y cada vez la conclusión escrita quedó como instrucción. Tras partir
`CLAUDE.md` (ADR-0001), el usuario pidió «cablea los gates».

## Decisión

1. **Una capa `tests/contract/`** con el runner de Node (`node --test "tests/contract/*.test.mjs"`), sin
   dependencias: seis archivos, cada uno con su lógica exportada y una **sonda negativa**. Lo que fija cada
   uno está en `vault/conocimiento/invariantes.md` § Gates. Es el paso 4 de la verificación; el CI lo corre.
2. **Los dos auditores entran como gates por LÍNEA BASE**, no por cero: `auditar_muerto` tiene hoy 7
   hallazgos que él mismo marca «revisar a mano» y 7 `useState` sin uso; un gate «cero muertos» nacería en
   rojo y se apagaría el primer día. La línea base es un literal; un hallazgo nuevo rompe, y uno que
   desaparece también —encogerla es una decisión que se dice en el commit—. `auditar_aislamiento` fija que
   las 39 funciones puras **sigan** puras: lo que se desacopló no se vuelve a acoplar.
3. **Tres hooks deterministas en Node** (`protect_paths`, `gitflow_guard`, `worktree_guard`) en
   `.claude/settings.json`, versionados. Cada motivo de bloqueo dice qué hacer en su lugar.
4. **Un solo job de CI** (GitHub Actions) con los cinco pasos en el mismo orden que `CLAUDE.md`, idéntico
   para toda rama y todo PR. TypeScript y Playwright se instalan globales y fijados a propósito: el repo no
   tiene `package.json` y `npx tsc` sin TypeScript instalado baja un paquete llamado `tsc` que no lo es.
5. **Preset A de git** (GitHub Flow: `main` + ramas cortas) como **supuesto con evidencia**: no hay `develop`
   ni pipeline que despliegue ramas. Cambiarlo es una línea (`INTEGRACION` en el guard) y reescribir
   `flujo_git.md`.

## Alternativas consideradas

- **vitest / jest** — descartadas: traen `package.json`, `node_modules` y un lockfile a un repo cuya
  arquitectura es «sin bundler, dependencias vendorizadas y fijadas por hash». `node --test` cubre lo que
  estos gates necesitan.
- **Hooks en bash con `python3`** (el default del skill) — descartados: el usuario trabaja en Windows y
  `python3` no está garantizado; Node sí, porque el build lo exige. La lógica exportada además se prueba.
- **tdd-guard** — descartado: exige un reporter por unidad y la suite es de integración en Chromium; sin
  reporter bloquea toda implementación. El ciclo TDD queda como disciplina en `.claude/rules/testing.md`.
- **Formateador por hook** — descartado: no hay prettier ni eslint en el stack, y un formateador sobre un
  fuente único de 26.000 líneas es una reescritura masiva que rompe las ediciones quirúrgicas con anclas.
- **Gate «cero código muerto»** — descartado por nacer en rojo (ver decisión 2).
- **Gate «sin datos reales»** — **pospuesto**: las razones sociales reales son una decisión del usuario
  (tablero, paso 3); un test que la afirmara o la negara la estaría tomando por él.
- **Cablear `regresion_diferencial.mjs`** — descartado: compara dos builds y el CI no tiene «el anterior»;
  se corre a mano cuando se quiere probar que una refactorización no cambió la lógica.
- **Preset B (develop/main)** — descartado por evidencia, no por preferencia.
- **Tag `v0.1.0` ahora** — pospuesto: el tag va en `main` cuando reciba el vault y los gates.

## Desviaciones respecto del skill `agentic-repo-bootstrap-v2` (con su razón)

| Default del skill | Acá | Por qué |
|---|---|---|
| hooks en bash + `python3` | Node (`.mjs`) | Windows; Node ya es requisito |
| `tdd-guard` | no | sin reporter por unidad |
| `format_and_lint.sh` | no | sin formateador en el stack; reescritura masiva |
| pytest / vitest | `node --test` | sin dependencias, como el resto del repo |
| preset de git preguntado | A, asumido con evidencia | no hay `develop` ni pipeline; una línea para cambiar |
| tag al cerrar el bootstrap | no | la rama no está mergeada a `main` |
| «unset cloud credentials» en CI | no aplica | el repo no toca ningún servicio externo |
| `tests/unit/` + `e2e/` | sólo `contract/` + la suite | el fuente es un solo archivo y la suite ya prueba las puras por nombre |

## Consecuencias

**Positivas**
- La verificación deja de depender de la memoria: el CI corre los cinco pasos en cada push; los hooks
  bloquean lo que antes era una instrucción.
- El vault y el índice de reglas están **gateados**: un cambio que los desfase rompe el build.
- **El primer gate encontró algo en su primera corrida**: los casos 30, 45 y 52 tienen dos `ok()` con el mismo
  número (ramas de guarda del mismo caso). Legítimo, y la regla quedó escrita para distinguirlo de dos casos
  pisándose.

**Negativas / deuda asumida**
- ~8 s más por verificación (los auditores se lanzan una vez cada uno).
- Las líneas base son deuda **visible, no cerrada**: 7 hallazgos del auditor, 7 `useState`, 8 invariantes del
  contrato sin gate (tablero, paso 2).
- Los hooks gobiernan sólo las sesiones de Claude Code, no un `git push` a mano; y en Windows dependen de
  Git Bash para expandir `$CLAUDE_PROJECT_DIR` (health check en `loop_agentico_hooks.md`).
- Lo que sólo el CI puede probar se mira en su primer log, no antes.

**Eje del trade-off (Ley III).** Esta decisión compra **determinismo** —los gates se ejecutan solos, en toda
rama— a cambio de **mantener líneas base** y de unos segundos más por corrida.
