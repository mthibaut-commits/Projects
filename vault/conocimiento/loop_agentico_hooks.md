---
type: conocimiento
title: "Loop agéntico — los hooks, qué bloquean y cómo convivir con ellos"
description: "Los tres hooks deterministas del repo (protect_paths, gitflow_guard, worktree_guard), el health check para cuando parecen mudos, por qué son Node y no bash, por qué no hay formateador ni tdd-guard, y el registro de fricciones"
tags: [conocimiento, hooks, agentes]
timestamp: 2026-09-18T04:20:00Z
---

# Loop agéntico: los hooks

Las instrucciones se ignoran bajo presión de contexto; los hooks no. Por eso las reglas objetivas del repo
están cableadas en `.claude/settings.json` + `.claude/hooks/` (**versionados**: un hook que no viaja con el
repo es configuración personal, no una garantía) y `CLAUDE.md` se reserva para lo que exige criterio.
**Si un hook te bloquea, la respuesta es hacer lo que pide, no rodearlo.**

## Los tres hooks

| Hook | Evento | Bloquea | Escape |
|---|---|---|---|
| `protect_paths.mjs` | PreToolUse · Edit/Write/MultiEdit | ADR aceptados (crear uno nuevo sí), `vendor/`, `fuentes/`, los vendorizados sueltos (`babel.min.js.descarga`, `saved_resource`), los **generados** (`datos_inyectados.js`, `atribuciones_otorgamiento.json`, `Capturas_UI/*.html`, `Variantes_UI/*.html`, `Integraciones_APIs_y_S3.md`, `*.pdf`, `pipeline_comercial.html`), el feed externo `proveedores_clientes.json`, `Legado/`, `.env*`, lockfiles | ninguno: se corrige el generador o el `.md` y se regenera |
| `gitflow_guard.mjs` | PreToolUse · Bash | push con refspec cruzado a `main`; `merge` sin `--no-ff` y `commit` estando en `main` | `GITFLOW_ALLOW=1` delante del comando, sólo para una T3 acordada |
| `worktree_guard.mjs` | PreToolUse · EnterWorktree | nada: devuelve `permissionDecision: ask` | el usuario lo aprueba en el diálogo, que es la prueba de que se discutió |

Cada motivo de bloqueo dice **qué hacer en su lugar**. La lógica de los tres es una función exportada
(`decidir`) probada en `tests/contract/hooks.test.mjs`, más una corrida de punta a punta por stdin.

## Health check — cuando los hooks parecen mudos

Los hooks de script mueren **en silencio** si el shell o el runtime están rotos, y entonces protegen nada
mientras todo parece normal. Al arrancar una sesión en una máquina nueva, o si un hook «no saltó» cuando
debía:

```bash
node verificar_hooks.mjs     # sale 0 si todo está bien; 1 y dice qué falta si no
```

Mide cuatro cosas, en este orden: (1) que `settings.json` declare los tres hooks **con su matcher** —uno bien
escrito y colgado del evento equivocado no se dispara nunca y se ve igual que uno que funciona— y que cada
comando apunte a un archivo que existe; (2) que `bash` responda, porque en Windows Claude Code corre los
hooks por Git Bash y sin él no corre **ninguno**; (3) la **cadena completa**, ejecutando por el shell el
comando tal como está escrito en `settings.json` con `CLAUDE_PROJECT_DIR` puesto — es la única forma de
comprobar que la variable se expande en esa máquina—; y (4) cada hook con sus **dos** direcciones, bloqueando
y dejando pasar: uno que bloquea todo es tan inútil como uno mudo.

Hasta el 18-09-2026 esto eran cuatro líneas de bash para copiar de esta página, y por eso quedaba sin correr
justo donde más falta hace: la máquina Windows del usuario, la única que el contenedor no puede atestiguar.
El CI lo corre entero en cada rama (`hooks.test.mjs`), así que un hook movido o con el matcher cambiado
rompe ahí; lo que el CI **no** puede decir es si los hooks corren en Windows. Eso se corre a mano la primera
vez, y `Iniciar_NEX_Factoring.bat` no lo hace por usted.

Y una edición de prueba sobre un ADR existente tiene que rebotar.

## Por qué son Node y no bash

Node ya es requisito del repo (`build_app.mjs`, la suite, los auditores) y el usuario trabaja en **Windows**,
donde `python3` —lo que usan los hooks de referencia del skill para leer el JSON— no está garantizado. El
único punto que sigue dependiendo de un shell es la expansión de `$CLAUDE_PROJECT_DIR` en
`.claude/settings.json`: Claude Code en Windows corre los hooks por Git Bash, que la expande. Si en una
máquina los hooks no responden, el health check de arriba lo dice en diez segundos.

## Lo que NO hay, a propósito

- **Formateador por hook.** No hay prettier ni eslint en el stack, y un formateador sobre un fuente único
  de 26.000 líneas es una reescritura masiva que destruye las ediciones quirúrgicas con anclas únicas que
  este archivo exige. La autoridad de estilo es `.claude/rules/code_style.md` y la revisión.
- **tdd-guard.** Exige un reporter por unidad (vitest/jest) y la suite de NEX es de integración en
  Chromium: sin reporter, el guard no ve evidencia y bloquea toda implementación. El ciclo TDD es
  disciplina escrita en `.claude/rules/testing.md`.

## Fricciones conocidas

- **El guard de git mira el TEXTO del comando.** Un heredoc que escriba documentación citando la forma
  prohibida del push la dispara aunque sea prosa. Escribir el patrón con marcadores (`<rama>:<integración>`)
  o usar la herramienta de archivos, que no pasa por el hook de Bash. Es la lección 33 del skill: el guard
  se probó a sí mismo mientras se escribía. **18-09-2026: volvió a pasar**, escribiendo `verificar_hooks.mjs`
  por heredoc — el archivo lleva el comando prohibido como DATO de su propia sonda, y el guard lo leyó como
  si fuera el comando. Ese archivo se edita con la herramienta de archivos, y lleva la advertencia escrita.
- **Los hooks se cargan al arrancar la sesión.** Crear o cambiar `.claude/settings.json` no los activa en la
  sesión en curso: la verificación de un hook nuevo es el health check, no «probar a violarlo».
- **`protect_paths` protege las ediciones del agente, no las herramientas que corren por bash.** Un script
  que escriba en `vendor/` desde Node no pasa por el hook; esa protección es el SBOM y el build.

## Registro de fricciones nuevas

Añade acá, con fecha, cada fricción nueva que un agente descubra. Pasar esta página en el briefing es más
barato que dejar que la redescubra.
