---
description: Cómo se prueba NEX — las dos capas, cómo se agrega un caso o un gate, y qué es una línea base
globs: ["tests/**", "tests_asignacion_lineas.js", "run_tests.mjs", "auditar_*.mjs"]
---

# Testing

## Dos capas, y por qué no hay una tercera

| Capa | Qué es | Cuánto tarda | Corre |
|---|---|---|---|
| `tests/contract/` | Gates de **contrato**: el vault, el índice de reglas, la forma del fuente, la forma de la suite, las líneas base de los auditores y los hooks | milisegundos (los auditores, ~8 s) | `node --test "tests/contract/*.test.mjs"` — sin dependencias: es el runner de Node |
| `tests_asignacion_lineas.js` | **La suite**: 116 casos que prueban los motores y las reglas de dominio contra el HTML construido, en Chromium real | ~2 min | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_tests.mjs` (necesita `node build_app.mjs` antes) |

No hay capa `unit` aparte: el fuente es un solo archivo y la suite ya prueba las funciones puras por su
nombre (`asignarLineas`, `verifDecision`, `prorratearOperacion`…) inyectándoles el estado. **Tampoco hay
`tdd-guard`**: exige un reporter por unidad (vitest/jest) y esta suite es de integración en navegador. El
ciclo TDD queda como disciplina —un caso en rojo antes de la implementación, mínimo para verde,
refactor en verde— y no como hook; se dice acá para que nadie lo busque.

## Cómo se agrega un caso a la suite

1. `ok("N título", …)` con **N = el siguiente entero** (los casos van únicos y consecutivos desde 1; el
   gate `suite.test.mjs` lo comprueba) y un título que diga el comportamiento, no la implementación.
2. Subir `CASOS_ESPERADOS` en `tests/contract/suite.test.mjs`: es un **snapshot**, y actualizarlo es la
   decisión de haber agregado un caso, no un trámite. Se dice en el commit.
3. Citar el número en la regla del vault que fija (`vault/conocimiento/reglas/<tema>.md`) y en su fila de
   `vault/conocimiento/invariantes.md`: el gate `invariantes.test.mjs` exige que cada caso citado exista.
4. Si el caso puede fallar en las dos direcciones (un control que bloquea), probar **las dos**: VER-01
   falló en ambas durante semanas porque sólo se miraba una.

## Cómo se agrega un gate de contrato

- Un archivo `tests/contract/<tema>.test.mjs`, con la lógica en **funciones exportadas** que reciben
  texto o datos —así se prueban sobre un caso plantado— y los tests encima.
- **Todo gate lleva sonda negativa**: un test `sonda negativa: …` que planta la violación y comprueba que
  el gate la caza. Un gate que compara un documento consigo mismo pasa siempre y no vigila nada.
- Dos clases, y conviene escribir las dos: **snapshot** (un literal: `CASOS_ESPERADOS`, `BASE_MUERTOS`,
  `BASE_PURAS`; actualizarlo es una decisión que va al commit) y **regla** (nunca se actualiza: una clase
  `tN` usada tiene que estar declarada, una regla del índice tiene que existir en su archivo).
- Los tests **no montan la app**: lo que cambia en el detalle, el wizard o la bandeja se verifica
  abriendo la pantalla (regla núcleo 4 de `CLAUDE.md`).

## Líneas base de los auditores

`auditar_muerto.mjs` y `auditar_aislamiento.mjs` producen un inventario y salen con 0; el gate es la
**línea base** en `tests/contract/auditores.test.mjs`. Un hallazgo nuevo rompe —código muerto que alguien
dejó, o un falso positivo nuevo; en los dos casos se mira—. Uno que desaparece también rompe, a propósito:
encoger la línea base queda en el commit. Y una función que era pura y vuelve a leer un global rompe
siempre: **lo que se desacopló no se vuelve a acoplar**. `regresion_diferencial.mjs` no está cableado:
compara dos builds y el CI no tiene el «anterior»; se corre a mano cuando se quiere probar que una
refactorización no cambió la lógica.

## Datos

**Nunca datos reales en fixtures.** Los RUT del sistema son sintéticos; las razones sociales de los
deudores son reales y eso es una decisión pendiente del usuario (tablero), no un gate: mientras no se
decida, ningún test la afirma ni la niega.

## Higiene

- Exit codes **condicionados** (`&&`, `$?`): un pipe con `tail` se come el código de salida.
- Un test flaky se arregla o se borra en la misma sesión.
- Antes de commitear: los cinco pasos de `CLAUDE.md` en orden. Ninguno subsume a otro.
