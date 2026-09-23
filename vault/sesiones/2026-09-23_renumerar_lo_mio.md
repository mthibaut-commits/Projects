---
type: sesion
title: "Sesión 2026-09-23 (integración) — Renumerar lo mío: 47–49 pasan a 60–62"
description: "Dos sesiones paralelas tomaron el mismo «siguiente entero libre» y las reglas 47, 48 y 49 quedaron con dos contenidos distintos. La deuda 3 del tablero dice quién renumera: el que mezcla después. Se renumeran las tres reglas con todas sus citas, se repara lo que la mezcla del otro lado dejó roto —un paso entero de la verificación canónica perdido, una fila de tabla pegada a la anterior, dos citas corridas y un entregable nuevo sin versionar— y la rama sube a main"
tags: [sesion, git, vault, integracion]
timestamp: 2026-09-23T17:30:00Z
feature: null
---

# Sesión 2026-09-23 (integración): renumerar lo mío

## Hecho

- **Mezcla de `main` (`a0f3f17`) en la rama.** Trajo el proceso de curse documentado de punta a punta,
  ADR-0012 … ADR-0019 y las reglas hasta la **59**. Cinco conflictos: `CLAUDE.md`, `.claude/rules/testing.md`,
  `vault/conocimiento/invariantes.md`, `vault/conocimiento/verificacion.md` y el tablero.
- **Renumeración 47 → 60, 48 → 61, 49 → 62**, con todas sus citas: el cuerpo de las tres reglas en
  `reglas/datos_y_activos.md` (incluida la referencia cruzada «reemplaza el punto de la regla 60»), las tres
  filas de `invariantes.md`, `regla_49.test.mjs` → **`regla_62.test.mjs`**, tres comentarios del `.jsx`, el
  caso 115 de la suite, `generador.test.mjs`, `sanear_campos_muertos.js`, `code_style.md`, dos líneas de los
  casos de prueba, los tres logs del 23-09 (texto **y** el tag del frontmatter) y el índice de sesiones.
- **Cuatro reparaciones de lo que vino de `main`**, todas encontradas por los gates o al leer el conflicto:
  1. `verificacion.md` había perdido el **paso 6 entero** (los e2e): la verificación canónica mostraba ocho
     pasos y no nueve, y el `6.` saltaba directo al `7.`.
  2. `.claude/rules/testing.md` traía la fila de `tests/e2e/` **pegada** al final de la fila de la suite.
  3. Dos **citas corridas** por la renumeración del otro lado: los casos 157 y 158 de `verificacion.md`
     citaban «regla 49» y «regla 50» donde van la **53** y la **54**.
  4. `Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md` nació en una carpeta de entregables **sin** el
     versionado que el gate exige desde el 21-09: declara `1.1.0` y cierra con su anexo.
- **El fuente venía en rojo de formato** (una línea partida a mano en `VerificacionTab`, del otro lado):
  `prettier --write`.
- **Cinco cifras re-medidas** por `cifras.test.mjs`: 91 reglas de dominio, 53 archivos de gate, 42
  `regla_<slug>`, 158 casos de suite, 32 e2e.
- **Rama a `main`** con `merge --no-ff` (`376cb20`) y empujada. Los dos árboles quedan idénticos.

## Decisiones tomadas con el usuario

- Ninguna nueva. El usuario pidió «hace el commit y cuéntame qué falta»; la renumeración la manda la deuda 3
  del tablero y no re-litiga nada.

## Errores encontrados y su solución (regla 11)

- **El paso 6 perdido es la TERCERA vez** que un salto de línea se come un paso en un bloque de comandos
  (21-09: `CLAUDE.md`, `README.md` y `testing.md`; hoy: `verificacion.md` y otra vez `testing.md`). El patrón
  es siempre el mismo: una tabla o una lista numerada cuyas filas son larguísimas, y al resolver un conflicto
  se pierde el `\n` entre dos. **Se detecta leyendo la numeración, no el contenido**: si un `5.` es seguido de
  un `7.`, falta uno. Ningún gate lo caza hoy — la verificación canónica está gateada en `fuente.test.mjs`
  sólo para el **paso 2**.
- **`prettier --check` en rojo sobre `main` sin que nadie lo tocara**, otra vez. Se prueba que es anterior
  copiando el `.jsx` de `main` encima y chequeando: si también falla, no es de la mezcla. **La copia va al
  árbol de trabajo, no al scratchpad**: `.prettierrc` no viaja y fuera del repo el diff sale entero.

- **`git branch -r --merged` sin `git fetch --prune` antes MIENTE, y miente en la dirección peligrosa.** El
  usuario corrió el listado desde Windows con refs viejas y `migrate-project-session-vui9dl` salía como
  integrada: lo estaba en `a0f3f17`, pero desde entonces la rama siguió viva y lleva **13 commits sin
  mezclar** (reglas 63–70, ADR-0020, dos archivos e2e). Borrarla con ese listado en la mano habría tirado
  trabajo terminado. El orden es **siempre** `git fetch --prune origin` y después el listado.
- **La inversa también existe**: `unidades-peso-verificacion` (17-09) **no** aparece en `--merged` porque no
  es ancestro de `main`, y sin embargo es borrable — su contenido entró por otro commit. «No integrada» por
  ancestro no es lo mismo que «tiene trabajo sin mezclar»: lo que decide es el `git log main..<rama>`.

## Pendiente / siguiente paso

- El **backlog decidido** de `Regresiones/Gaps_Proceso_Curse_2026-09-22.md` §2.2: diecinueve T1 abiertos —ocho
  sin decisión previa (G-05, G-18, G-23 … G-28) y once ya decididos por ADR-0013 … ADR-0019—, cada uno con su
  caso en rojo ya escrito en la tabla y la regla que lo recibiría.
- Lo del usuario desde Windows: el tag `v0.1.0` y borrar las **cinco** ramas ya integradas (el relay devuelve
  403 acá). `Capturas_UI/` sigue sin regenerarse (deuda 2: no es determinista).

## Sorpresas y aprendizajes

- **La colisión de enteros no se ve al mezclar: se ve al mirar el índice.** Git fusionó `datos_y_activos.md`
  sin conflicto —las tres reglas mías están al final del archivo y las del otro lado viven en otros temas—, así
  que el único aviso fue el bloque en conflicto de `invariantes.md`, donde las filas 47, 48 y 49 aparecían dos
  veces con contenidos distintos. Si las dos sesiones hubieran escrito en el MISMO archivo de tema, git habría
  marcado el choque; escribiendo en archivos distintos, **el índice es el único sitio donde el choque existe**.
- **Renumerar es barato; encontrar las citas, no.** Las doce citas del texto las da un `grep`, pero hay que
  clasificarlas una por una: `pipeline_comercial.jsx` citaba «regla 48» **dos veces del otro lado** (el atajo
  del otorgamiento) y una vez de la mía (las series de mercado en pesos). Un `sed` global habría renumerado las
  tres y roto el gate de invariantes por el otro extremo.
- **Un gate ajeno cazó un entregable ajeno.** `versiones.test.mjs`, escrito el 21-09 para mis 23 documentos,
  falló al mezclar porque la otra sesión dejó un spec nuevo en `Specs_Procesos/`. Es exactamente lo que un gate
  de *regla* —no de snapshot— tiene que hacer: la carpeta es el contrato, no la lista de archivos de ese día.
