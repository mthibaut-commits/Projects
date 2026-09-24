/* REGLA 85 · EL CORTE DEL DÍA LEE EL ESTADO DEL PROCESO, NO SÓLO LA COPIA DE LA PESTAÑA (ADR-0026).
 *
 * Reportado por el usuario el 24-09-2026: con la sesión en Subgerente de Riesgo (N5) el detalle de OP-D32455 decía
 * «Tienes 17 criterio(s) por excepcionar · Ir a aprobar» y la mesa de Otorgamientos «OPERACIONES EN OTORGAMIENTO (0)».
 * Medido: reconstruida desde el libro del cliente, la operación tenía 23 documentos, 49 criterios y 17 con su
 * atribución, cero rechazos firmes y fase «preevaluacion» — la mesa la habría listado si el tubo la tuviera. No la
 * tenía: la simulación se hace en la pestaña del detalle y llega por `nex-simulado`; el corte del día (cada ~60 s
 * reales: `cronMs` 3500 × 17 horas) pasó antes, vio la copia del tubo en Prospección sin `simulado`, la eliminó, el
 * aviso se descartó («operación que este tubo ya no tiene») y al reinicio renació como `-R1`.
 *
 * Desde hoy `tieneOferta` mira también la VERSIÓN emitida (repositorio, regla 72) y el corte decide con
 * `tieneGestion`, que suma la pre-evaluación pedida (repositorio). Los patrones se aplican sobre `canonico(src)`.
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

export function auditarRegla85(fuente) {
  const src = canonico(sinComentarios(fuente));
  const f = [];
  // 1 · La versión emitida es la oferta.
  const mTO = src.match(/const tieneOferta = \(d\) => ([^\n]*);/);
  if (!mTO) f.push("no existe `tieneOferta` de nivel módulo");
  else if (!/tieneVersion\(d\.id\)/.test(mTO[1])) f.push("`tieneOferta` no mira la versión emitida (`tieneVersion(d.id)`): la copia del tubo sin `simulado` vuelve a contar como sin oferta y el corte la elimina mientras el detalle la trabaja");
  if (!/const tieneVersion = \(id\) => /.test(src)) f.push("no existe `tieneVersion(id)`");
  else if (!/SIM_VERSIONS/.test((src.match(/const tieneVersion = \(id\) => ([^\n]*);/) || ["", ""])[1])) f.push("`tieneVersion` no lee `SIM_VERSIONS`: la versión es el hecho del proceso y vive ahí");
  // 2 · Gestionada = oferta o pre-evaluación pedida.
  const mTG = src.match(/const tieneGestion = \(d\) => ([^\n]*);/);
  if (!mTG) f.push("no existe `tieneGestion(d)`");
  else {
    if (!/tieneOferta\(d\)/.test(mTG[1])) f.push("`tieneGestion` no parte de `tieneOferta`");
    if (!/tienePreEval\(d\.id\)/.test(mTG[1])) f.push("`tieneGestion` no mira la pre-evaluación pedida (`tienePreEval(d.id)`): la operación que ya está en la bandeja se eliminaría al corte");
  }
  // 3 · El corte decide con `tieneGestion`.
  const corte = cuerpoDe(src, "function corteDelDia(");
  if (!corte) f.push("no existe `corteDelDia`");
  else if (!/d\._inbound && !tieneGestion\(d\)/.test(corte)) f.push("`corteDelDia` no decide con `tieneGestion(d)`: elimina por la copia de la pestaña y no por el estado del proceso");
  return f;
}

test("regla 85 · el fuente cumple", () => {
  const fallas = auditarRegla85(SRC);
  assert.deepEqual(fallas, [], "FALLA:\n  - " + fallas.join("\n  - "));
});

test("sonda negativa: `tieneOferta` sin la versión se caza", () => {
  const plantado = SRC.replace(' || tieneVersion(d.id));', ");");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla85(plantado).some((x) => /no mira la versión emitida/.test(x)));
});

test("sonda negativa: `tieneGestion` sin la pre-evaluación se caza", () => {
  const plantado = SRC.replace('const tieneGestion = (d) => tieneOferta(d) || (!!d && typeof tienePreEval === "function" && tienePreEval(d.id));', "const tieneGestion = (d) => tieneOferta(d);");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla85(plantado).some((x) => /no mira la pre-evaluación pedida/.test(x)));
});

test("sonda negativa: el corte que vuelve a decidir por `tieneOferta` se caza", () => {
  const plantado = SRC.replace("if (d._inbound && !tieneGestion(d)) eliminadas.push(d);", "if (d._inbound && !tieneOferta(d)) eliminadas.push(d);");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla85(plantado).some((x) => /no decide con `tieneGestion\(d\)`/.test(x)));
});

test("`cuerpoDe` corta en la llave que cierra", () => {
  const txt = "function f({ a, b }) { if (x) { g(); } return 1; } function otra() { h(); }";
  assert.equal(cuerpoDe(txt, "function f("), "{ if (x) { g(); } return 1; }");
  assert.equal(cuerpoDe(txt, "function noExiste("), "");
});
