---
type: sesion
title: "Sesión 2026-09-23 (skills) — Una skill que está mal se corrige, y el paso 0 se corre con la versión del CI"
description: "Entran las 39 skills de terceros. El usuario pidió que, si una está mal, se actualice la skill en vez de anotar en el CLAUDE.md quién manda: se mide cuáles chocan (12 de 39), se les antepone un bloque de ajuste local con la regla citada y un gate lo sostiene. Y se encuentra por qué mis tres commits salieron con el CI en rojo: no era falta de correr Prettier, era que el CI fija 3.6.2 y este contenedor trae 3.8.1"
tags: [sesion, skills, ci, herramental]
timestamp: 2026-09-23T18:00:00Z
feature: null
---

# Sesión 2026-09-23 (skills): la skill se corrige, no se la deja diciendo lo contrario

## Hecho

- **Revisión de las seis ramas sin mezclar**, contra `main` de hoy y no contra la base común: dos
  (`bandeja-solicitudes-tabla`, `unidades-peso-verificacion`) ya estaban integradas por contenido —lo dice
  `git cherry`—, dos apuntan al mismo fósil del 10-09 (un `.jsx` de 20.430 líneas contra 51.951) y dos traían
  trabajo real.
- **`blissful-brown-oocq4f` integrada**: 39 skills de terceros, 4 MCP de alcance proyecto y su regla de
  precedencia, renumerada de **34 a 63** —en `main` la 34 es «el tubo abre en Todos»— con su gate a
  `regla_63.test.mjs`.
- **Las 12 skills que contradicen una regla, CORREGIDAS** (instrucción del usuario: «si el skill está mal,
  actualiza el skill»). Cada una lleva un bloque `AJUSTE-LOCAL-NEX` antes del cuerpo, con la regla citada. El
  cuerpo ajeno no se reescribe: sigue sirviendo para lo que sí aporta.
- **`auditar_skills.mjs`** (auditor nuevo) y **`skills.test.mjs`** (gate, snapshot + regla, dos sondas).
- **`prettier@3.6.2` fijado** en los cuatro sitios que escriben el paso 0, con gate de coherencia contra lo
  que `gates.yml` instala.
- Verificación completa **sobre el árbol mezclado**: 451/451 gates · 158/158 · 32/32.

## Decisiones tomadas con el usuario

- **«Si el skill está mal, actualiza el skill»** — reemplaza el enfoque que traía la rama, que declaraba en el
  `CLAUDE.md` que las skills ACONSEJAN y las reglas DECIDEN. No alcanzaba: **el agente lee la skill, no la
  nota**. La regla 13 del `CLAUDE.md` y la 63 del vault quedan reescritas alrededor de eso.

## Errores encontrados y su solución (regla 11)

- **Mis tres commits sobre `main` (`376cb20`, `dadecb7`, `b10fb5e`) salieron con el CI en ROJO**, y no lo
  miré: reporté «verde entera» con la medición local. Verificado contra los runs de `gates.yml`: failure los
  tres. Como el paso 0 es el primero del workflow y el job sale con 1 ahí, **no corrió nada más** — ni linter,
  ni tsc, ni build, ni gates, ni suite, ni e2e.
- **Pero la causa no era la que parecía.** La otra sesión lo atribuyó a verificar en la rama y no sobre el
  árbol mezclado. Medido: el fuente de `376cb20` **pasa `prettier --check` en este contenedor**. Lo que pasa es
  que `npx prettier` acá resuelve a **3.8.1** y `gates.yml` instala **3.6.2**, y las dos no formatean igual el
  ternario de `estPill` — 3.8.1 lo quiere en un renglón de 158 columnas, 3.6.2 partido en dos. Comprobado en
  **las dos direcciones**: cada versión rechaza lo que produce la otra. Eso explica lo que quedó sin explicar
  —que era la **tercera vez** con la misma línea—: no es olvido repetido, es una línea que **oscila**, y
  volvería a caer en cuanto un contenedor con 3.8.x la tocara. Arreglo: fijar la versión en los cuatro sitios,
  con gate de coherencia.
- **El auditor se equivocó dos veces mientras se escribía, las dos declarando un choque que no existe**:
  `feat\(` con paréntesis no cazaba `feat:` sin él, y `style:` con `\s` casando el salto de línea daba por
  prefijo de commit la etiqueta `Style:` de una plantilla de prompt de `brandkit`. Es la misma historia de
  `auditar_muerto`, que se equivocó cuatro veces — con la diferencia de que allá el error iba en la dirección
  peligrosa (declarar borrable algo vivo) y acá en la de afirmar un choque inexistente, que cuesta lo mismo:
  las dos veces se deja de mirar.

## Pendiente / siguiente paso

- El backlog decidido de `Regresiones/Gaps_Proceso_Curse_2026-09-22.md` §2.2 (19 T1, cada uno con su caso en
  rojo escrito). · `migrate-project-session-vui9dl` sigue viva y usa 60–62 y **63**, que ahora también está
  tomada: al integrar, esas cuatro bajan.

## Sorpresas y aprendizajes

- **Un diagnóstico correcto en los hechos puede ser incorrecto en la causa, y eso importa.** Los runs rojos
  eran reales y la lección «verifica sobre el árbol mezclado» es buena; pero de haberla adoptado sola, la línea
  habría vuelto a oscilar en la siguiente sesión con otra versión de Prettier. Un incidente que ocurre **tres
  veces con el mismo símbolo** casi nunca es olvido: es un mecanismo.
- **Tres de las cinco colisiones que la rama afirmaba no existen.** `documentation-and-adrs` dice
  `PROPOSED → ACCEPTED → SUPERSEDED`, que es exactamente la regla 7; `code-review-and-quality` argumenta
  CONTRA el «LGTM sin evidencia», que es la 8. Afirmar un choque que no está cuesta lo mismo que no ver uno
  que sí: las dos veces se deja de mirar. Por eso la regla ahora cita la medición y no la impresión.
- **`git diff origin/main...rama` compara contra la BASE COMÚN, no contra `main`.** Con eso di por
  no-integrada una rama cuyo cambio ya estaba en `main` desde hacía días. Para «¿esto ya entró?» va
  `git cherry`, que compara por patch-id, o buscar el texto en el fuente de hoy.
- **Un `npx <herramienta>` sin versión es una dependencia flotante.** El repo ya fijaba los bytes del vendor
  con un SBOM y las versiones de las herramientas en el CI; lo que faltaba era que el comando que uno escribe a
  mano fijara la misma. Un gate de coherencia entre los sitios que escriben un comando ya existía para el paso
  2: era cuestión de aplicarlo al 0.
