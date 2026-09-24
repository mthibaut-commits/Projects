/* La suite de 140 casos (`tests_asignacion_lineas.js`) corre en Chromium y tarda ~2 min: es el paso 5 de
   la verificación, no este test. Lo que se fija ACÁ, en milisegundos, es la forma de la suite: cada número
   de caso tiene UN solo título (dos títulos bajo el mismo número son dos casos pisándose en la salida
   `PASA N`; dos ok() con el mismo número y el mismo título son una rama de guarda del mismo caso, y eso
   pasa en el 30, el 45 y el 52), van consecutivos desde 1 (un hueco es un caso borrado sin decidirlo), y el
   conteo es un SNAPSHOT: subirlo es la decisión de haber agregado un caso, no un trámite. Un caso asíncrono
   declara su título en `const TIT = "N …"` (131, 132 y 137) y cuenta igual: lo reconoce `numerosDeCasos`. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, numerosDeCasos, casosDeSuite } from "./_comun.mjs";

export const CASOS_ESPERADOS = 180;   // snapshot: cambia sólo cuando se agrega o retira un caso a propósito
export function verificarNumeracion(casos) {
  const fallos = [];
  const titulos = new Map();   // n → Set de títulos distintos
  for (const { n, titulo } of casos) titulos.set(n, (titulos.get(n) || new Set()).add(titulo));
  for (const [n, t] of titulos) if (t.size > 1) fallos.push(`caso ${n} con ${t.size} títulos distintos: dos casos pisándose bajo el mismo número`);
  const max = Math.max(0, ...titulos.keys());
  for (let k = 1; k <= max; k++) if (!titulos.has(k)) fallos.push(`falta el caso ${k} (hueco: los casos van consecutivos desde 1)`);
  return { fallos, total: titulos.size };
}

const suite = leer("tests_asignacion_lineas.js");

test("cada caso de la suite tiene un solo título y van consecutivos desde 1", () => {
  const { fallos } = verificarNumeracion(casosDeSuite(suite));
  assert.deepEqual(fallos, []);
});

test(`la suite declara exactamente ${CASOS_ESPERADOS} casos (snapshot)`, () => {
  const { total } = verificarNumeracion(casosDeSuite(suite));
  assert.equal(total, CASOS_ESPERADOS, `la suite tiene ${total} casos y el snapshot dice ${CASOS_ESPERADOS}: si agregaste o retiraste un caso a propósito, actualiza CASOS_ESPERADOS en este archivo y menciónalo en el commit`);
});

test("sonda negativa: dos títulos bajo un número y un hueco plantados se detectan; la rama de guarda no", () => {
  const c = (n, titulo) => ({ n, titulo });
  assert.deepEqual(verificarNumeracion([c(1, "a"), c(2, "b"), c(2, "otro b"), c(4, "d")]).fallos,
    ["caso 2 con 2 títulos distintos: dos casos pisándose bajo el mismo número", "falta el caso 3 (hueco: los casos van consecutivos desde 1)"]);
  assert.deepEqual(verificarNumeracion([c(1, "a"), c(1, "a")]).fallos, [], "mismo número y mismo título = una rama de guarda del mismo caso");
  assert.equal(numerosDeCasos('ok("7 algo"); ok(`8 otro`)').join(","), "7,8");
  assert.deepEqual(casosDeSuite('ok("7 algo", x)'), [{ n: 7, titulo: "algo" }]);
  assert.equal(numerosDeCasos('const TIT = "9 asíncrono";\n    ok(TIT, true, "");').join(","), "9", "el título en una constante cuenta como caso");
  assert.deepEqual(casosDeSuite('const TIT = "9 asíncrono"; ok(TIT, x)'), [{ n: 9, titulo: "asíncrono" }]);
});
