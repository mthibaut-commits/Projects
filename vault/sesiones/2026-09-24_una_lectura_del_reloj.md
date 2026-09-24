---
type: sesion
title: "Una lectura del reloj: el caso 138 cazó un flaky del FUENTE en emitirOtp"
description: "Sobre main en b4a5b17, sin tocar el .jsx, la suite dio 177/178: el caso 138 (CRY-01) falló en «exp = emitido + TTL». emitirOtp leía Date.now() dos veces y el milisegundo cambió entre las dos. Una sola lectura del reloj; el gate regla_cry_01 sigue verde. T2, tres líneas"
tags: [sesion, cry-01, otp, flaky, verificacion]
timestamp: 2026-09-24T06:50:00Z
---

# Una lectura del reloj · caso 138 · CRY-01

## Qué vio el usuario

> Sobre `main` en `b4a5b17`, sin tocar el `.jsx`, la suite dio **177/178**: falla el caso 138 «CRY-01 · el OTP se guarda
> como SHA-256 con sal por emisión…» en UNA sub-aserción: «emisión: … exp = emitido + TTL **false**». El resto del caso pasa.

## Causa, medida en el fuente

`async function emitirOtp(neg)` (`pipeline_comercial.jsx`, ~6798) armaba el registro así:

```js
OTP_STORE[neg] = { alg: HASH_ALG, sal, hash: await otpHash(neg, sal, code), exp: Date.now() + OTP_TTL_MS, usado: false, emitido: Date.now() };
```

`exp` y `emitido` llaman a `Date.now()` **por separado**, y entre las dos lecturas hay un `await`: si el milisegundo
cambia —cosa que depende de la carga de la máquina, no del código—, `reg.exp - reg.emitido` da `OTP_TTL_MS + 1` (o más)
y el caso 138 (`tests_asignacion_lineas.js`, bloque `(a) emisión`) exige la igualdad exacta. **Es un flaky con causa en el
fuente, no en el test**: el test dice lo correcto —un registro con dos marcas de tiempo derivadas una de la otra tiene
que salir de UNA lectura del reloj—, y el fuente no lo cumplía. `.claude/rules/testing.md`: un flaky se arregla o se
borra en la misma sesión; acá se arregla.

## Solución (T2: se ve igual, decide igual)

```js
const ahora = Date.now();
OTP_STORE[neg] = { alg: HASH_ALG, sal, hash: await otpHash(neg, sal, code), exp: ahora + OTP_TTL_MS, usado: false, emitido: ahora };
```

Un comentario encima dice por qué existe `ahora`. La conducta no cambia: `emitido` sigue siendo el momento en que se
emitió y `exp` sigue siendo `emitido + TTL`; lo único que cambia es que ahora lo es **siempre**.

**El gate `regla_cry_01.test.mjs` no se toca.** Lee `emitirOtp` como texto y exige que el registro lleve `sal`,
`hash: await otpHash(neg, sal, code)` y ningún `code` suelto, y que exista `const sal = salAleatoria()`. Una variable
`ahora` dentro del objeto no altera nada de eso, y la sonda negativa que planta `code,` tras `sal,` sigue anclando.

## Verificación (los seis pasos de `CLAUDE.md`, en orden, sobre la rama al día con `origin/main` en `ea547ea`)

| Paso | Resultado |
|---|---|
| 0 · `prettier@3.6.2 --check` | limpio |
| 0-bis · `eslint` | 0 hallazgos |
| 1 · `tsc` | 0 errores |
| 2 · duplicados | vacío |
| 3 · `build_app.mjs` | OK, hashes del vendor calzan |
| 4 · gates de contrato | **614/614** (incluye `regla_cry_01`) |
| 5 · suite | **179/179 PASA** (el 138 incluido) |
| 6 · e2e | **40/40 PASA** (~9 min, en paralelo con la escritura del log) |

No toca la UI: el paso 7 (capturas) no corre.

## Lo que quedó medido y NO se tocó

`grep -nE 'Date\.now\(\).*Date\.now\(\)'` encuentra **dos sitios más** con dos lecturas del reloj en un mismo registro:

- `PANEL_TAREAS.unshift({ … ts: Date.now(), venceTs: Date.now() + dias * 86400000 … })` (~29888): el mismo patrón —una
  marca derivada de la otra—, pero **ningún caso asevera `venceTs - ts`**, así que hoy no es flaky. Cuando alguien lo
  gatee, va con `ahora` primero.
- `{ …r, tUltClienteResp: Date.now(), …(tOferta: Date.now()) }` (~49772): dos hechos distintos con dos marcas; no hay
  relación que mantener. Se deja.

Se anotan para no ampliar un T2 de una línea; no van al tablero porque no bloquean ni deciden.

## Aprendizaje (lo que en tres meses sigue importando)

Un registro con dos marcas de tiempo **relacionadas** (`emitido`/`exp`, `ts`/`venceTs`) toma el reloj UNA vez y deriva
la segunda. Dos `Date.now()` en una misma expresión, con o sin `await` en medio, son dos relojes: pasan `tsc`, el linter,
el build y casi siempre la suite, y fallan una vez cada tantas corridas con la máquina cargada. Cuando un caso falla
«a veces» en una igualdad de tiempos, mirar primero cuántas veces se lee el reloj.
