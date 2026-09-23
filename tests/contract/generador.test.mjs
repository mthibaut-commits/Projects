/* El generador tiene PUNTO FIJO: `datos_inyectados.js` commiteado es lo que una corrida completa produce,
   byte a byte. Hasta el 17-09-2026 no lo era: AECSYNC tomaba la intención de participación de los campos
   que SHARE_OF_WALLET MIDE sobre él, y cada corrida movía ~150 cesiones de cesionario sin que nada hubiera
   cambiado (153, luego 67, luego 33: convergía y no llegaba). Lo que un derivado necesita y no se mide vive
   declarado (`GeneradorDatos/lib/intencion_sow.js`). Dos reglas, que no se actualizan nunca:

     · la cadena entera, corrida EN PROCESO sobre el archivo commiteado, reproduce cada bloque derivado.
       Basta UNA corrida: si f(x) = x entonces f(f(x)) = x — el archivo es punto fijo, no sólo determinista.
       Rompe si alguien cambió un módulo sin regenerar, o si un módulo volvió a leer su propia salida;
     · AECSYNC se genera sólo del A1 y de la intención declarada: quitarle el A2 y el A5 de la entrada
       no cambia una cesión. Es el bucle A2 → A5 → A2, vigilado por su nombre.

   Cuesta ~3 s: leer los 34 MB (~2 s) y correr los ocho derivados (~0,5 s). */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { RAIZ } from "./_comun.mjs";

const require = createRequire(import.meta.url);
const { leer, serializar } = require(join(RAIZ, "GeneradorDatos/lib/archivo.js"));
const { derivar, DERIVADOS } = require(join(RAIZ, "GeneradorDatos/generar.js"));
const cesiones = require(join(RAIZ, "GeneradorDatos/datasets/cesiones.js"));

/* Qué bloques derivados difieren entre lo commiteado (`bloques`: nombre → texto `window.X=…`) y lo recién
   generado (`derivados`: nombre → valor). Trae la posición del primer byte distinto, que es por dónde mirar. */
export function bloquesQueDifieren(bloques, derivados) {
  const out = [];
  for (const [nombre, valor] of Object.entries(derivados)) {
    const nuevo = serializar(nombre, valor), viejo = bloques[nombre] || "";
    if (nuevo === viejo) continue;
    let i = 0;
    while (i < nuevo.length && i < viejo.length && nuevo[i] === viejo[i]) i++;
    out.push({ nombre, posicion: i, largoNuevo: nuevo.length, largoViejo: viejo.length });
  }
  return out;
}

/* Si `generar` cambia su salida cuando se le quitan de la entrada los bloques `nombres`, depende de ellos. */
export function dependeDe(generar, datos, nombres) {
  const con = JSON.stringify(generar(datos));
  const sin = { ...datos };
  for (const n of nombres) delete sin[n];
  return con !== JSON.stringify(generar(sin));
}

let cache = null;
const cargar = () => cache || (cache = leer(join(RAIZ, "datos_inyectados.js")));

test("el archivo commiteado es un punto fijo del generador: una corrida completa reproduce cada bloque derivado", () => {
  const { bloques, datos } = cargar();
  const derivados = derivar({ ...datos });
  assert.deepEqual(Object.keys(derivados), DERIVADOS.map(([n]) => n), "corrieron los ocho derivados, en orden");
  const dif = bloquesQueDifieren(bloques, derivados);
  assert.deepEqual(dif, [], "una corrida cambia estos bloques (regenerar y commitear, o un módulo lee su propia salida): " + JSON.stringify(dif));
});

test("AECSYNC se genera sólo del A1 y de la intención declarada: sin el A2 ni el A5 en la entrada no cambia una cesión", () => {
  const { datos } = cargar();
  const entrada = { DTESYNC: datos.DTESYNC, AECSYNC: datos.AECSYNC, SHARE_OF_WALLET: datos.SHARE_OF_WALLET };
  assert.ok(!dependeDe(cesiones.generar, entrada, ["AECSYNC", "SHARE_OF_WALLET"]), "cesiones.js lee el A2 anterior o el A5: es el bucle A2 → A5 → A2 otra vez");
});

/* Regla 48: ningún activo lleva sufijo de escala. Los bloques DERIVADOS se arreglan en su generador,
   pero los BASE se copian tal cual desde el activo de entrada y ninguna corrida los alcanza — por eso
   existe `sanear_campos_muertos.js` y por eso esto se mira sobre el ARCHIVO y no sobre el código. Se
   miden los NOMBRES de campo del activo, que es donde el sufijo sobrevive sin que nadie lo note: al
   escribirse este gate quedaban dos, `LineaSugeridaMM` (599 filas, base) y `RequeridoParaTargetMM`
   (233, derivado), ninguno con lectores y el segundo guardando PESOS bajo un nombre que dice millones. */
export const ESCALA = /(?:MM|_M)$|miles|millones/i;
export const camposConEscala = (texto) =>
  [...new Set([...texto.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)":/g)].map((m) => m[1]))].filter((c) => ESCALA.test(c)).sort();

test("ningún campo del activo nombra una escala: todo monto va en pesos (regla 48)", () => {
  const txt = readFileSync(join(RAIZ, "datos_inyectados.js"), "utf8");
  assert.deepEqual(camposConEscala(txt), [],
    "un campo del activo nombra miles o millones. Si es de un bloque derivado, arréglalo en su generador; si es BASE, va en `sanear_campos_muertos.js`");
});

test("sonda negativa: un campo con sufijo de escala plantado en el activo se caza", () => {
  assert.deepEqual(camposConEscala('X=[{"RUT":"1-9","LineaSugeridaMM":126,"Monto":5}]'), ["LineaSugeridaMM"]);
  assert.deepEqual(camposConEscala('X=[{"MontoEnMiles":3,"Deuda_M":7,"Ok":1}]'), ["Deuda_M", "MontoEnMiles"]);
  // Un nombre que sólo CONTIENE «M» no es un sufijo de escala: `COLOC_PROM_12M` es un plazo.
  assert.deepEqual(camposConEscala('X=[{"COLOC_PROM_12M":3,"V03_MNT_COMPRA_3M":7}]'), []);
});

test("sonda negativa: un bloque que la corrida cambia se reporta con nombre y posición", () => {
  const bloques = { A: serializar("A", [1, 2, 3]), B: serializar("B", { x: 1 }) };
  assert.deepEqual(bloquesQueDifieren(bloques, { A: [1, 2, 3], B: { x: 1 } }), []);
  const dif = bloquesQueDifieren(bloques, { A: [1, 2, 4], B: { x: 1 } });
  assert.deepEqual(dif.map((d) => d.nombre), ["A"]);
  assert.equal(dif[0].posicion, serializar("A", [1, 2, 3]).indexOf("3"));
  assert.deepEqual(bloquesQueDifieren(bloques, { C: [] }).map((d) => d.nombre), ["C"], "un bloque que no estaba también difiere");
});

test("sonda negativa: un generador que lee su propia salida anterior se detecta", () => {
  // Como hacía cesiones.js: completar los cedentes con los de la entrega anterior.
  const lee = ({ DTESYNC, AECSYNC }) => [...new Set([...DTESYNC.map((d) => d.rut), ...(AECSYNC || []).map((c) => c.rut)])].sort().map((rut) => ({ rut }));
  const noLee = ({ DTESYNC }) => [...new Set(DTESYNC.map((d) => d.rut))].sort().map((rut) => ({ rut }));
  const datos = { DTESYNC: [{ rut: "1-9" }], AECSYNC: [{ rut: "1-9" }, { rut: "2-7" }] };
  assert.ok(dependeDe(lee, datos, ["AECSYNC"]), "no cazó al generador que lee su salida");
  assert.ok(!dependeDe(noLee, datos, ["AECSYNC"]), "acusó a un generador que no la lee");
});
