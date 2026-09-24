/* REGLA 83 · EL NIVEL DE UNA EXCEPCIÓN SE CALCULA UNA VEZ Y TODA PANTALLA LO LEE (ADR-0025).
 *
 * Reportado por el usuario el 24-09-2026 con la sesión en Jefe de Operaciones: la tarjeta del detalle decía «En espera
 * del visto bueno de Jefe de Operaciones (N1)», la bandeja de Otorgamientos «48 excepciones pendientes, ninguna
 * requiere tu atribución · 3 en Operaciones N4», y los mensajes de la solicitud le llegaron a otro. Medido en el detalle
 * real: `snapVersionCli` guardaba en la versión `nivel: e.nivel` —el nivel del TRAMO de la regla— y las tarjetas leen
 * `ver.res`; `evaluarOtorgItems` escala el nivel por el monto (`conPiso`, INC-05) y de ahí leen la solicitud, los
 * destinatarios (`codigosAprobadoresDe`) y la bandeja. Dos evaluaciones, dos verdades. Y para el nivel AUSENTE había
 * 36 sitios con `|| 4` y 4 con `|| 1`: el mismo ítem se llamaba «Operaciones (N4)» y «Jefe de Operaciones (N1)».
 *
 * Los patrones se aplican sobre `canonico(src)` (ADR-0006) y las sondas se plantan sobre el fuente crudo.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const SRC = leer("pipeline_comercial.jsx");

export const sinComentarios = (texto) =>
  String(texto)
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");

/* Cuerpo desde el ancla hasta la llave que lo cierra (la del cuerpo es la primera a profundidad de paréntesis 0). */
export function cuerpoDe(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return "";
  let par = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "(") par++;
    else if (c === ")") par--;
    else if (c === "{" && par === 0) {
      let d = 0;
      for (let k = j; k < src.length; k++) {
        if (src[k] === "{") d++;
        else if (src[k] === "}" && --d === 0) return src.slice(j, k + 1);
      }
      return "";
    }
  }
  return "";
}

const DEF_NIVEL_DE = 'const nivelDe = (x) => (x && x.nivel) || 4;';

export function auditarRegla83(fuente) {
  const src = canonico(sinComentarios(fuente));
  const f = [];

  // 1 · La versión guarda el nivel EXIGIDO —el del tramo escalado por el monto— y conserva el del tramo aparte.
  const snap = cuerpoDe(src, "function snapVersionCli(");
  if (!snap) f.push("no existe `snapVersionCli`");
  else {
    if (!/const monto = \(deal && deal\.monto\) \|\| 0;/.test(snap)) f.push("`snapVersionCli` no toma el monto de la operación: no puede escalar el nivel");
    if (!/nivel: e\.disp === "excepcion" \? nivelExigido\(r\.area, e\.nivel, monto\) : e\.nivel/.test(snap))
      f.push("`snapVersionCli` guarda el nivel del TRAMO (`nivel: e.nivel`) y no el exigido: la tarjeta del tab vuelve a decir un aprobador distinto del que reciben la solicitud y la bandeja");
    if (!/nivelTramo: e\.nivel/.test(snap)) f.push("`snapVersionCli` no conserva el nivel del tramo (`nivelTramo`): el diff de versiones pierde de dónde subió");
  }
  // 2 · La evaluación viva escala con la MISMA función y el MISMO monto.
  const ev = cuerpoDe(src, "function evaluarOtorgItems(");
  if (!ev) f.push("no existe `evaluarOtorgItems`");
  else {
    if (!/const monto = \(deal && deal\.monto\) \|\| 0;/.test(ev)) f.push("`evaluarOtorgItems` no toma el monto de `deal.monto`: el snapshot y la evaluación viva escalan con montos distintos");
    if (!/nivelExigido\(r\.area, ev\.nivel, monto\)/.test(ev)) f.push("`evaluarOtorgItems` no escala el nivel con `nivelExigido`");
  }
  // 3 · Un solo respaldo para el nivel ausente: `nivelDe`, y ningún `|| 1` / `|| 4` suelto.
  if (!src.includes(DEF_NIVEL_DE)) f.push("no existe `nivelDe(x)` como único respaldo del nivel ausente");
  const sueltos = src.replace(DEF_NIVEL_DE, "").match(/\.nivel\)? \|\| [14]\b/g) || [];
  if (sueltos.length) f.push(`hay ${sueltos.length} respaldo(s) del nivel fuera de \`nivelDe\` (\`${sueltos[0].trim()}\`): el mismo ítem sin nivel se nombra con dos cargos distintos`);

  return f;
}

test("regla 83 · el fuente cumple", () => {
  const fallas = auditarRegla83(SRC);
  assert.deepEqual(fallas, [], "FALLA:\n  - " + fallas.join("\n  - "));
});

test("sonda negativa: la versión que vuelve a guardar el nivel del tramo se caza", () => {
  const plantado = SRC.replace('nivel: e.disp === "excepcion" ? nivelExigido(r.area, e.nivel, monto) : e.nivel,', "nivel: e.nivel,");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla83(plantado).some((x) => /guarda el nivel del TRAMO/.test(x)));
});

test("sonda negativa: un `|| 1` suelto se caza", () => {
  const i = SRC.indexOf("nivelDe(x)", SRC.indexOf(DEF_NIVEL_DE) + DEF_NIVEL_DE.length);
  assert.ok(i > 0, "no encuentro un uso de `nivelDe(x)` después de su definición");
  const plantado = SRC.slice(0, i) + "x.nivel || 1" + SRC.slice(i + "nivelDe(x)".length);
  assert.ok(auditarRegla83(plantado).some((x) => /respaldo\(s\) del nivel fuera de `nivelDe`/.test(x)));
});

test("sonda negativa: un `|| 4` suelto se caza igual", () => {
  const i = SRC.lastIndexOf("nivelDe(x)");
  assert.ok(i > SRC.indexOf(DEF_NIVEL_DE), "no encuentro un uso de `nivelDe(x)`");
  const plantado = SRC.slice(0, i) + "(x && x.nivel) || 4" + SRC.slice(i + "nivelDe(x)".length);
  assert.ok(auditarRegla83(plantado).some((x) => /respaldo\(s\) del nivel fuera de `nivelDe`/.test(x)));
});

test("sonda negativa: la evaluación viva sin escalada se caza", () => {
  const plantado = SRC.replace("nivelExigido(r.area, ev.nivel, monto)", "ev.nivel");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla83(plantado).some((x) => /no escala el nivel con `nivelExigido`/.test(x)));
});

test("`cuerpoDe` corta en la llave que cierra", () => {
  const txt = "function f({ a, b }) { if (x) { g(); } return 1; } function otra() { h(); }";
  assert.equal(cuerpoDe(txt, "function f("), "{ if (x) { g(); } return 1; }");
  assert.equal(cuerpoDe(txt, "function noExiste("), "");
});
