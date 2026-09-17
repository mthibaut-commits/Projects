---
type: sesion
title: "Sesión 2026-09-17 — Merge a main y tag v0.1.0"
description: "main tenía cuatro commits paralelos de otra sesión que chocaban con la partición de CLAUDE.md; se mezcló main en la rama, se portaron sus adiciones al vault sin perder una línea, se verificó todo y se integró con --no-ff; el tag quedó local porque el entorno deniega pushear tags"
tags: [sesion, git, merge, release]
timestamp: 2026-09-17T15:29:14Z
feature: null
---

# Sesión 2026-09-17: merge a `main` y `v0.1.0`

## Hecho

- `origin/main` traía **cuatro commits de otra sesión** desde la base de la rama (el predictor de verificación
  comparando pesos contra pesos + caso 115, el ciclo de la factura con su PDF, la tabla de Solicitudes igual a
  Vigentes, y una copia idéntica de la auditoría). Tocaban el `.jsx`, la suite, un auditor nuevo
  (`auditar_unidades.mjs`) y `CLAUDE.md` — y esto último **chocaba** con la partición.
- **Se mezcló `main` en la rama primero** (no al revés): `CLAUDE.md` se resolvió con la versión partida y las
  tres adiciones de `main` se portaron **verbatim** al vault: la regla `9-ter` a `reglas/verificacion.md` (con su
  fila en el índice, caso 115 citado), la viñeta de la bandeja bajo `15-quater` en su sitio original, la línea del
  paso 4 con 115 casos a `verificacion.md`, y el bullet de `spec-ciclo-factura` a `mapa_documentos.md`.
  **Sonda con el `CLAUDE.md` de `main` como referencia: 412 de 412 líneas, una vez cada una.**
- `CASOS_ESPERADOS` pasó a **115**: el snapshot funcionó como se diseñó —un caso nuevo llegó por `main` y el gate
  obligó a decirlo—. `auditar_unidades.mjs` entró a «Otros comandos» de `CLAUDE.md` (106 líneas).
- Verificación completa sobre el árbol mezclado: `tsc` limpio, 0 duplicados, build 40,6 MB, **115/115 PASA**; gates
  29/29 (las líneas base de los auditores aguantaron el `.jsx` nuevo).
- Merge `--no-ff` a `main` (`bd14091`): el momento en que `main` recibe el vault, los gates y los hooks. El tag
  anotado **`v0.1.0`** se creó sobre ese commit pero **no llegó al remoto** (ver errores): queda para el usuario.

## Decisiones tomadas con el usuario

- «mergea a main y pone el tag» (17-09). `v0.1.0` según el versionado de `flujo_git.md`.

## Errores encontrados y su solución (regla 11)

1. **`git rev-parse --short main origin/main` en una cadena con `&&`** cortó la inspección y escondió el resto.
   Las comprobaciones independientes van con `;`, no encadenadas.
2. **`git push origin v0.1.0` devolvió HTTP 403 del proxy git del entorno** —«Everything up-to-date» con exit 1, que
   es contradictorio y por eso se verificó con `ls-remote`: ningún tag remoto—. El README del proxy dice que los 403
   son denegaciones de política de la organización y se reportan, no se rodean: las credenciales de la sesión
   pushean ramas, no `refs/tags/*`. El tag queda local y el comando para ponerlo desde Windows está en el tablero.
3. **La viñeta de la bandeja no estaba dentro de `9-ter`** aunque el diff la mostrara pegada a él: el diff lista
   líneas cambiadas, no dónde están. Se ubicó por su regla madre real (`15-quater`) antes de portarla.

## Pendiente / siguiente paso

- Ver el tablero. El run del CI sobre `main` se mira tras el push.

## Sorpresas y aprendizajes

- **Otra sesión estaba committeando directo sobre `main`** mientras esta rama avanzaba. Desde `v0.1.0`, `main`
  lleva `gitflow_guard`: la próxima sesión que intente `git commit` sobre `main` rebota y abre rama. Es exactamente
  el caso para el que existe, y hay que contarlo al usuario para que no lo lea como una falla.
- La regla nueva llegó como **`9-ter`**: la otra sesión seguía la numeración vieja porque trabajaba sobre el
  `CLAUDE.md` viejo. Se conserva tal cual (no se renumera); la convención del siguiente entero rige desde ahora.
- **La sonda de «nada perdido» sirve también para un merge**: con el `CLAUDE.md` del otro lado como referencia
  demuestra que el porteo es completo, y es más barato que revisar el diff a ojo.
