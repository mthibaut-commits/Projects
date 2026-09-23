---
type: sesion
title: "«Mezcla todo»: cuatro ramas que no había que mezclar, y un bloque de reglas renumerado DOS veces"
description: "De siete ramas con trabajo, `git cherry` descartó cuatro. Las dos que quedaban chocaban en la numeración, y entre medir el siguiente entero libre y empujar, la otra sesión lo tomó — otra vez"
tags: [sesion, mezclas, numeracion, git]
timestamp: 2026-09-23T18:30:00Z
---

# «Mezcla todo» · lo que la medición cambió

## Lo primero fue no mezclar

`git branch -r` daba **siete** ramas con commits que `main` no tenía. Mezclarlas todas habría sido un error, y
lo dijo la medición, no el criterio:

| Rama | `git cherry` | Qué era |
|---|---|---|
| `bandeja-solicitudes-tabla` | `-` | su cambio **ya estaba en `main`** por otro commit |
| `unidades-peso-verificacion` | `-` | ídem: la regla 9-ter y el `v <= 300e6` ya vivían en `main` |
| `local-mauricio-20260910` | `+` | el **mismo commit** que la de abajo |
| `prueba-permiso-rama` | `+` | volcado del ZIP local del **10-09**, «montado sobre main **para poder compararlo**» |

Las dos primeras son `-` en `git cherry`: hay un commit equivalente aguas arriba. Mezclarlas no habría
agregado nada y sí habría arrastrado versiones de hace seis días de `pipeline_comercial.jsx` encima de las de
hoy. Las dos últimas son el mismo volcado de 4.667 inserciones y 1.133 borrados, hecho **para comparar**, no
para integrar: pisaría trece días de trabajo.

**`git cherry` es la herramienta correcta y `--merged` no lo es.** `--merged` responde «¿es ancestro?», que es
otra pregunta: una rama puede no ser ancestro y no tener nada propio, que es justo el caso de
`unidades-peso-verificacion`.

## Lo segundo fue renumerar. Dos veces.

Quedaban dos ramas con trabajo real, y las dos estaban **vivas** —una había commiteado cuatro minutos antes—.
El usuario pidió mezclar las dos igual.

`migrate-project-session` traía doce reglas numeradas **60–71**, y `main` ya tenía otras tres con los números
60, 61 y 62. Renumera quien mezcla después: corrieron a **63–74**, en un commit aparte y **antes** de mezclar,
para que la renumeración fuera revisable y no quedara enterrada en la resolución de conflictos.

Y mientras esa mezcla se verificaba —los seis pasos, ocho minutos de e2e— **`vibrant-hopper` publicó en `main`
su propia regla 63**. Así que el mismo bloque se corrió otra vez, a **64–75**, dejando el 63 libre.

**Dos renumeraciones del mismo bloque en una sola integración.** No es torpeza: es el costo medible de mezclar
ramas vivas. Entre medir el siguiente entero libre y empujar pasan los minutos que tarda la verificación, y en
esos minutos otra sesión publica. La deuda del tablero decía «renumera quien mezcla después»; lo que faltaba
decir es que **el turno se pierde mientras uno verifica**.

## El procedimiento, que sobrevive a repetirse

Un script anclado sobre **las ocho formas** en que este repo escribe el número de una regla —la declaración
`^NN. **`, la fila `| NN |` del índice, `regla/Regla/REGLA NN`, `regla_NN.test.mjs`, `auditarReglaNN` y
`e2e-NN`—, aplicado en orden **descendente** para que ningún destino pise un origen sin mover, más `git mv`
para los gates. 722 reemplazos la primera vez, 719 la segunda, y ninguno tocó un número de caso, un año ni un
monto porque los patrones están anclados a lo que precede al número.

**La comprobación es el hueco.** Tras la segunda corrida las reglas quedaron 58–62 · *nada en el 63* · 64–75:
ese hueco es la prueba de que el corrimiento está bien hecho, y lo llena la mezcla siguiente.

## Un error mío, con causa y solución (regla núcleo 11)

**El primer merge commit se cerró sin la mitad de su contenido.** `git add -A && git commit` fue bloqueado por
`gitflow_guard`, y el segundo intento —ya con `GITFLOW_ALLOW=1`— llevaba sólo el `git commit`. Resultado: se
commiteó lo que había quedado staged **antes** de corregir las doce cifras y de pasar Prettier.

*Causa:* el hook bloquea el comando **entero**, así que de `A && B` no corre ni `A`. Es fácil de leer al revés
—«falló el commit, el add ya está hecho»— y no lo está.

*Solución:* se enmendó ese merge commit, que no estaba empujado, y quedó la regla: **cuando el hook bloquea un
compuesto, nada de lo que va antes del `&&` se ejecutó**.

## Y el paso 0 volvió a caer, cuarta vez

La misma línea de `VerificacionTab`. La rama la traía arreglada en un commit propio (`d2027a1`, «la línea que
llegó a `main` sin pasar por Prettier») y **aun así el árbol mezclado la dejó pegada**: git junta los dos lados
y produce texto que no está en ninguno. Es exactamente lo que `flujo_git.md` documentó esta misma mañana, ahora
con una cuarta evidencia.

## Verificación

Dos mezclas, cada una con los seis pasos completos sobre el árbol MEZCLADO: prettier · eslint 0 · `tsc` sin
TS1 · 0 duplicados · build · **572 gates de contrato** · **171/171** la suite · **37/37 e2e**.
