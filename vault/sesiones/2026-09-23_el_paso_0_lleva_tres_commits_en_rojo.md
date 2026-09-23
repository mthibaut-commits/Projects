---
type: sesion
title: "El paso 0 llevaba tres commits en rojo sobre `main`, y ahí el CI se moría"
description: "Un ternario pegado en una línea que Prettier parte. Lo caro no es el formato: el CI de `main` falla EN el paso 0 y sale con 1, así que desde el 23-09 a las 15:41 nadie estaba corriendo los otros seis pasos sobre `main`"
tags: [sesion, ci, formato, mezclas]
timestamp: 2026-09-23T17:30:00Z
---

# El paso 0 llevaba tres commits en rojo · T3 sobre `main`

## Qué se encontró

Terminada la mezcla de la regla 59 y ya sincronizado con `origin/main`, corrí el paso 0 sobre `main`
por costumbre y salió **rojo**. Una sola línea, en `VerificacionTab`:

```js
const estPill = v.est === "ok" ? { … } : { … };   // pegada: 158 columnas
```

Prettier la parte en dos. El arreglo es `npx prettier --write` y no cambia una coma de semántica.

## Lo caro no es el formato

Medido contra los runs de `gates.yml` sobre `main`:

| commit | fecha | CI |
|---|---|---|
| `005f0b6` (la regla 59) | 23-09 03:46 | ✅ success |
| `a0f3f17` (el proceso de curse) | 23-09 04:34 | ✅ success |
| **`376cb20`** (mezcla de `vibrant-hopper`) | 23-09 15:41 | ❌ **failure** |
| `dadecb7` (tablero y log) | 23-09 15:47 | ❌ failure |
| `b10fb5e` (ramas borrables) | 23-09 15:59 | ❌ failure |

Y el log del job dice exactamente dónde muere:

```
Run npx prettier --check pipeline_comercial.jsx
[warn] pipeline_comercial.jsx
##[error]Process completed with exit code 1.
Post job cleanup.
```

**El paso 0 es el PRIMERO del workflow y el job sale con 1 ahí mismo.** O sea que desde las 15:41
del 23-09 no corrió sobre `main` ni el linter, ni `tsc`, ni el chequeo de duplicados, ni el build,
ni los 440 gates, ni la suite, ni los 32 casos e2e. Tres commits de `main` sin verificar nada, y el
tablero mientras tanto afirmaba «440/440 gates» — cierto en la rama donde se midió, no en `main`.

## Por qué vuelve a pasar, y es la tercera vez

Esa misma línea entró pegada a `main` el 21-09, la mezcla del 22-09 la dejó canónica, y la mezcla
`376cb20` la volvió a pegar. Su commit dice «Verde entera: prettier - eslint - tsc…» y es verdad: se
verificó **en la rama**. Lo que no se verificó es el **árbol mezclado**, que es justo donde git
rehace la línea — la resolución junta dos lados y el resultado no es ninguno de los dos.

`CLAUDE.md` ya lo advierte («un commit que deshaga el formato los vuelve a tumbar de a uno, en
sesiones distintas»), y `.claude/rules/testing.md` ya dice que los seis pasos van **antes de
commitear**. No falta regla: falta correrla **después de resolver conflictos**, no sólo antes.

**Y el log de la sesión que mezcló lo había visto**: anota entre sus errores «el prettier en rojo
que no era mío». Verlo y no arreglarlo deja el CI de `main` apagado para todos — lo que uno hereda
al mezclar es de uno desde que mezcla.

## Lo que se hizo

`npx prettier --write pipeline_comercial.jsx`, los seis pasos completos sobre `main` —prettier ·
eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **440/440** gates · **158/158** la suite ·
**32/32** e2e— y commit directo sobre `main` con `GITFLOW_ALLOW=1`, acordado con el usuario (T3).

## Lo que hay que recordar

**Un paso de verificación que corre PRIMERO y corta la cadena no es un paso más: es el interruptor
de todos los demás.** Mientras el paso 0 esté rojo, el CI no está diciendo que lo demás pase — está
diciendo que no lo miró. Un tablero que cita «440/440» junto a un `main` con el CI rojo es la misma
familia del defecto del 21-09: **una medición cierta presentada como el estado del sistema.**
