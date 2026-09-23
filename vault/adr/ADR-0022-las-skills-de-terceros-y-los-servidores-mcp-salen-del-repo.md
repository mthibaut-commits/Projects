---
type: adr
title: "ADR-0022 · Las skills de terceros y los servidores MCP salen del repo: no aportan al producto; la regla 63 se queda con su gate de paleta"
description: "Decisión del usuario del 23-09-2026 sobre lo que trajo la rama de herramental mezclada ese día: 45 skills de terceros, siete servidores MCP, su auditor, su gate y el descargador de referencias DESIGN.md salen del repo. Se conserva la skill propia datamart-ui y la regla 63 (el lenguaje visual es Datamart), que no instala nada y protege la paleta del fuente"
tags: [adr, herramental, skills, mcp]
estado: aceptado
timestamp: 2026-09-23T20:30:00Z
---

# ADR-0022 · Las skills de terceros y los servidores MCP salen del repo

## Contexto

Entre el 18 y el 23-09-2026 una rama de herramental instaló en el repo lo que un agente de código puede usar,
y el 23-09 se mezcló a `main`:

- **45 skills de terceros** en `.claude/skills/` (`Leonxlnx/taste-skill`, `addyosmani/agent-skills`,
  `DietrichGebert/ponytail`), fijadas por `skills-lock.json`, con un bloque `AJUSTE-LOCAL-NEX` antepuesto a
  las 12 que contradecían una regla del repo, un auditor (`auditar_skills.mjs`) y un gate (`skills.test.mjs`)
  que sostenía esos bloques. La regla núcleo 13 del `CLAUDE.md` lo explicaba.
- **Siete servidores MCP** de alcance proyecto en `.mcp.json` (context7, chrome-devtools, supabase, vercel,
  playwright, graphify y OmniRoute), con sus lanzadores y parches en `.mcp-servers/` y un `.graphifyignore`.
- **Un descargador de referencias `DESIGN.md`** (`Skills/design-md/`) y una referencia ajena guardada ahí.
- **La regla 63** (el lenguaje visual es Datamart: una referencia externa aporta composición, nunca tokens),
  con su gate `regla_63.test.mjs`: una línea base de la paleta del fuente y ninguna `DESIGN.md` en la raíz.

Nada de eso lo usa la aplicación, el build, la suite ni la capa e2e. El 23-09-2026 el usuario lo miró en el
historial de `main` y decidió:

> «Todas estas ramas no aportan nada al proyecto ya que instalan librerías, ¿puedes descartarlas?»

## Decisión

1. **Salen del repo** las 45 skills de terceros, `skills-lock.json`, `auditar_skills.mjs`, `skills.test.mjs`,
   `.mcp.json`, `.mcp-servers/`, `.graphifyignore` con sus dos entradas de `.gitignore`, y `Skills/design-md/`.
   Sale también la regla núcleo 13 del `CLAUDE.md` y su fila en «Otros comandos».
2. **Se queda la skill propia `datamart-ui`** (`.claude/skills/datamart-ui` y los archivos de `Skills/`): es la
   del usuario, anterior a la rama, y la que manda sobre el lenguaje visual.
3. **Se queda la regla 63 con su gate.** No instala nada: protege la paleta del fuente contra tokens ajenos y la
   raíz contra un `DESIGN.md`, y eso vale para CUALQUIER referencia externa, no sólo para las skills que
   motivaron la regla. Se retira la parte de la regla que hablaba de corregir las skills.
4. **Se descarta por contenido, no reescribiendo historia**: un commit de limpieza encima de `main`, integrado
   con `merge --no-ff`. Las ramas de origen siguen en el remoto porque el relay bloquea el borrado (HTTP 403);
   su contenido ya no está en `main`, y todo sigue recuperable desde la historia.

## Alternativas descartadas

- **Conservar las skills corregidas** (lo que dejó la integración del 23-09, «las skills se CORRIGEN, no se
  descartan»): el costo era sostener 12 bloques de ajuste, un auditor y un gate para herramental que el producto
  no usa. El usuario lo descartó.
- **Revertir los merges** (`git revert -m 1`): los mismos merges trajeron cosas que se quedan —el `prettier`
  fijado al del CI, la regla 63, los logs—, y un revert de merge además impide volver a mezclar esa rama.
- **Retirar también la regla 63**: su gate vigila el fuente, no las skills; sin ella, un color ajeno vuelve a
  entrar sin que nada lo diga.
- **Borrar sólo las ramas del remoto**: no cambia nada del proyecto, porque su contenido ya estaba en `main`.

## Consecuencias

- Es herramental: el producto decide igual. No cambian el fuente, la suite ni la capa e2e; los gates de
  contrato pasan de 66 a 65 archivos.
- Una sesión nueva ya no carga esas skills ni esos servidores MCP desde el repo. Si alguna hace falta, se
  instala fuera del repo (en el `~/.claude/` de quien la use), y reinstalarla dentro exige un ADR que
  reemplace a éste.
- La historia de cómo se corrigieron las skills mientras estuvieron (12 de 39 chocaban) queda en el log
  `vault/sesiones/2026-09-23_la_skill_se_corrige.md`, que no se toca.
