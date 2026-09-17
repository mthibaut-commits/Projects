---
type: indice
title: "Vault de NEX Factoring — mapa"
description: "Qué hay en cada carpeta del vault, cómo se edita, y dónde vive cada clase de conocimiento. El estado del proyecto NO está acá: está en el tablero"
tags: [indice, vault]
timestamp: 2026-09-17T15:29:14Z
---

# Vault de NEX Factoring

Memoria del proyecto: markdown plano con frontmatter, versionado con el código, legible por personas
(Obsidian o cualquier editor) y grepeable por agentes. **No afirma la fase del proyecto**: eso vive
sólo en [`sesiones/estado_actual.md`](./sesiones/estado_actual.md), que toda sesión lee al abrir y
sobrescribe al cerrar.

Se abrió el 17-09-2026 al partir `CLAUDE.md` (425 líneas / 229 KB, cargado entero en cada sesión) por
vida útil de su contenido: lo que toda sesión necesita se quedó en `CLAUDE.md` (98 líneas); las reglas
de dominio, la arquitectura, el mapa de documentos y el contrato con el servidor se movieron acá
**verbatim** —398 de 398 líneas, comprobado con una sonda— y sin renumerar nada. Por qué así y no de
otra forma: [`adr/ADR-0001-partir-claude-md-y-abrir-el-vault.md`](./adr/ADR-0001-partir-claude-md-y-abrir-el-vault.md).

## Carpetas

| Carpeta | Qué contiene | Índice |
|---|---|---|
| `conocimiento/` | Lo que sigue siendo cierto: reglas de dominio por tema, arquitectura, verificación, contrato con el servidor, mapa de documentos | [`conocimiento/index.md`](./conocimiento/index.md) |
| `conocimiento/invariantes.md` | **El índice de las reglas**: cada una con dónde vive y qué caso de la suite la verifica | — |
| `adr/` | Decisiones con alternativas descartadas. Inmutables una vez aceptadas; para cambiar de rumbo, ADR nuevo que reemplaza | [`adr/index.md`](./adr/index.md) |
| `sesiones/` | El **tablero** (`estado_actual.md`, ≤80 líneas) y un log por sesión | [`sesiones/index.md`](./sesiones/index.md) |

**Este vault está gateado, no confiado**: `tests/contract/vault.test.mjs` valida el frontmatter de todo documento, el
tablero ≤80 líneas y `CLAUDE.md` ≤150 en cada corrida de `node --test "tests/contract/*.test.mjs"` y en el CI; e
`invariantes.test.mjs` exige que el índice de reglas calce con los archivos, la suite y el fuente. Pendientes de esta
estructura, si el proyecto decide completar el bootstrap (auditoría §8): `roadmap/`, `features/`, `specs/`, `plantillas/`.

## Cómo se edita

- Todo documento lleva frontmatter con `type`, `title`, `description`, `tags`, `timestamp` (ISO 8601).
  `type` ∈ {`indice`, `conocimiento`, `adr`, `sesion`, `roadmap`, `feature`, `spec`, `plan`, `tareas`}.
  Títulos y descripciones con `:` o `—` van entre comillas.
- Las **reglas de dominio no se resumen ni se renumeran**. Se citan por número (`regla 24`, `regla 13-ter`);
  una regla nueva toma el **siguiente entero libre** y va al final del tema que le corresponde, con su fila
  en `invariantes.md` (con el caso de la suite que la verifica, o *sin gate* escrito).
- Un ADR aceptado no se edita. Una decisión que cambia = ADR nuevo con `reemplaza:`.
- El tablero se **sobrescribe** (no crece); la historia va a los logs; lo que en 3 meses seguirá importando
  sube a `conocimiento/`.
- Lo específico de una máquina o de cómo trabajar con el usuario va a la memoria del agente, no al vault.

## Precedencia

`conocimiento/invariantes.md` y las reglas que indexa mandan sobre cualquier otro documento del repo en lo
que describen; los `Specs_Procesos/*.md` describen **cómo es el proceso hoy** y no llevan historial; la
historia vive en los logs de `sesiones/` y en las auditorías (`Auditoria_*.md`, `Inconsistencias_*.md`).
