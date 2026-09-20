// ════════════════════════════════════════════════════════════════════════════════════════════════
// GATE · EL PADRÓN DE IDENTIDADES (ADR-0009)
//
// Desde el 20-09-2026 las identidades del sistema son PARES REALES extraídos del AEC de BICE Factoring,
// no cadenas inventadas. Este gate vigila las cuatro cosas que hacen que eso siga siendo cierto y no
// se degrade de a poco. Ninguna es un snapshot: son REGLAS, no se actualizan nunca.
//
//   1. Ningún RUT del padrón es de una PERSONA NATURAL. Es el control que más importa: el AEC trae
//      empresarios individuales cediendo sus facturas con nombre y apellidos, y eso es dato de una
//      persona identificable. Se excluyen por RUT (< 50.000.000), y este gate lo comprueba.
//   2. Todo RUT tiene dígito verificador VÁLIDO. Un RUT real cuadra; uno inventado casi nunca. Es la
//      señal barata de que alguien no agregó una fila a mano.
//   3. Las cuatro listas son DISJUNTAS. Si una identidad aparece como deudor y como cliente, los joins
//      del activo dejan de significar lo que dicen.
//   4. El activo no usa NINGUNA identidad que el padrón no declare. El padrón es la única fuente.
// ════════════════════════════════════════════════════════════════════════════════════════════════
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { createRequire } from "node:module";
import { RAIZ, leer } from "./_comun.mjs";

const require_ = createRequire(import.meta.url);
const PADRON = require_(join(RAIZ, "GeneradorDatos/lib/padron.js"));
export const LISTAS = ["DEUDORES", "CLIENTES", "STREAM", "PROVEEDORES"];
// Bajo este número el RUT es de una persona natural. Medido sobre el AEC: de los 93 cedentes bajo 30M,
// CERO llevan marca societaria; los 9 del tramo 50–60M son el 100 % sociedades. El corte va en 50M.
export const RUT_MIN_EMPRESA = 50000000;

export function dvDe(numero) {
  let M = 0, S = 1;
  for (let t = numero; t; t = Math.floor(t / 10)) S = (S + (t % 10) * (9 - (M++ % 6))) % 11;
  return S ? String(S - 1) : "K";
}

export function personasNaturales(padron) {
  const malos = [];
  for (const lista of LISTAS) for (const x of padron[lista] || []) {
    if (parseInt(String(x.rut).replace(/\./g, ""), 10) < RUT_MIN_EMPRESA) malos.push(`${lista}: ${x.rut} ${x.razonSocial}`);
  }
  return malos;
}

export function dvInvalidos(padron) {
  const malos = [];
  for (const lista of LISTAS) for (const x of padron[lista] || []) {
    const [n, d] = String(x.rut).replace(/\./g, "").split("-");
    if (!n || !d || dvDe(parseInt(n, 10)) !== d.toUpperCase()) malos.push(`${lista}: ${x.rut} ${x.razonSocial}`);
  }
  return malos;
}

export function solapamientos(padron) {
  const visto = new Map(), malos = [];
  for (const lista of LISTAS) for (const x of padron[lista] || []) {
    const r = String(x.rut).replace(/\./g, "").toUpperCase();
    if (visto.has(r)) malos.push(`${r} está en ${visto.get(r)} y en ${lista}`);
    else visto.set(r, lista);
  }
  return malos;
}

// Identidades del activo que el padrón no declara. Se lee el texto: el activo son 33 MB y parsearlo
// entero para esto sería más lento y no más exacto — los campos viajan siempre en el mismo par.
export function identidadesHuerfanas(activo, padron) {
  const declarados = new Set();
  for (const lista of LISTAS) for (const x of padron[lista] || []) declarados.add(String(x.rut).replace(/\./g, "").toUpperCase());
  const huerfanas = new Set();
  for (const campo of ["RUTEmisor", "RUTRecep"]) {
    for (const m of activo.matchAll(new RegExp(`"${campo}":"([^"]+)"`, "g"))) {
      const r = m[1].replace(/\./g, "").toUpperCase();
      if (!declarados.has(r)) huerfanas.add(r);
    }
  }
  return [...huerfanas];
}

test("padrón: ninguna identidad es una PERSONA NATURAL", () => {
  assert.deepEqual(personasNaturales(PADRON), [], "el padrón sólo lleva empresas: un RUT bajo 50M es de una persona");
});

test("sonda negativa: una persona natural plantada en el padrón la caza el gate", () => {
  const plantado = { ...PADRON, DEUDORES: [...PADRON.DEUDORES, { rut: "12928664-4", razonSocial: "NOMBRE APELLIDO APELLIDO" }] };
  assert.equal(personasNaturales(plantado).length, 1);
});

test("padrón: todo RUT tiene dígito verificador válido", () => {
  assert.deepEqual(dvInvalidos(PADRON), [], "un RUT que no cuadra no salió del AEC: lo escribió alguien");
});

test("sonda negativa: un RUT con el dígito cambiado lo caza el gate", () => {
  const real = PADRON.DEUDORES[0];
  const otro = real.rut.endsWith("-0") ? real.rut.slice(0, -1) + "1" : real.rut.slice(0, -1) + "0";
  assert.equal(dvInvalidos({ ...PADRON, DEUDORES: [{ ...real, rut: otro }] }).length, 1);
});

test("padrón: las cuatro listas son disjuntas", () => {
  assert.deepEqual(solapamientos(PADRON), [], "una identidad en dos listas rompe lo que los joins del activo afirman");
});

test("sonda negativa: la misma identidad en dos listas la caza el gate", () => {
  const plantado = { ...PADRON, STREAM: [...PADRON.STREAM, PADRON.DEUDORES[0]] };
  assert.equal(solapamientos(plantado).length, 1);
});

test("padrón: el activo no usa ninguna identidad que el padrón no declare", () => {
  const activo = leer("datos_inyectados.js");
  assert.deepEqual(identidadesHuerfanas(activo, PADRON), [], "el padrón es la ÚNICA fuente de identidades del activo");
});

test("sonda negativa: una identidad del activo fuera del padrón la caza el gate", () => {
  const plantado = `[{"RUTEmisor":"41604007-5","RznSoc":"Constructora RM SA"}]`;
  assert.deepEqual(identidadesHuerfanas(plantado, PADRON), ["41604007-5"]);
});

test("padrón: las cuatro listas tienen el tamaño que el activo necesita", () => {
  const tam = Object.fromEntries(LISTAS.map((l) => [l, (PADRON[l] || []).length]));
  assert.deepEqual(tam, { DEUDORES: 741, CLIENTES: 500, STREAM: 45, PROVEEDORES: 697 },
    "snapshot: cambia sólo cuando el activo cambia de tamaño, y eso se dice en el commit");
});
