/* Regla 62 · LA CARTERA COMERCIAL SE LEE, NO SE INVENTA.
   `PC_CLIENTES` sorteaba con `pcRng` el volumen del cliente, su competidor y sus «malos deudores», y el
   volumen salía además en una escala que nadie declaraba: cuatro KPI de Reportes lo pasan por `fmtMMc`
   —que divide por un millón— y mostraban del orden de M$5 donde va la cartera entera.

   Este gate lee el fuente como TEXTO, sobre la forma canónica (ADR-0006), y mira tres cosas dentro del
   catálogo: que no vuelva a sortear, que lea el A11, y que el fallback sintético no vuelva. La tercera es
   la que más fácil se deshace: basta que alguien «rescate la demo sin datos» y vuelvan 80 empresas
   inventadas a mezclarse con las reales. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";
import { canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El cuerpo del catálogo: desde `const PC_CLIENTES = (() => {` hasta su `})();`. Se recorta sobre el
   texto canónico para que el patrón no dependa de dónde parta las líneas Prettier. */
export function cuerpoCatalogo(src) {
  const c = canonico(src);
  const i = c.indexOf("const PC_CLIENTES = (() => {");
  if (i < 0) return "";
  const j = c.indexOf("})();", i);
  return j < 0 ? "" : c.slice(i, j);
}

export function fallos(src) {
  const cuerpo = cuerpoCatalogo(src);
  const out = [];
  if (!cuerpo) return ["no se encontró el catálogo `PC_CLIENTES` en el fuente"];
  if (/pcRng\(/.test(cuerpo)) out.push("`PC_CLIENTES` volvió a sortear con `pcRng`: la cartera se lee de los activos");
  if (/PC_COMPET_NAMES/.test(cuerpo)) out.push("el competidor vuelve a salir de una lista de nombres, no del mix del A11");
  if (!/P360\.ix\.COLOC_PROM_12M/.test(cuerpo)) out.push("el volumen ya no se lee del `COLOC_PROM_12M` del A11");
  if (!/mixSowDe\(/.test(cuerpo)) out.push("el competidor ya no sale del mix por cesionario del A11");
  if (!/NOTA_PRIORITARIA/.test(cuerpo)) out.push("los «malos deudores» ya no salen de la nota de corte");
  if (/Fallback sintético|universo determinista de 80 empresas/.test(cuerpo))
    out.push("volvió el fallback sintético: sin activo la cartera es vacía, no inventada");
  return out;
}

test("la cartera comercial se lee de los activos y no se sortea (regla 62)", () => {
  assert.deepEqual(fallos(jsx), []);
});

test("sonda negativa: un sorteo, una lista de competidores o el fallback plantados se cazan", () => {
  const base = `const PC_CLIENTES = (() => { const f360 = P360.porRut[rut]; const vol = +f360[P360.ix.COLOC_PROM_12M]; for (const p of mixSowDe(rut) || []) {} const n = NOTA_PRIORITARIA; return out; })();`;
  assert.deepEqual(fallos(base), [], "el catálogo bien formado tiene que pasar");
  assert.ok(fallos(base.replace("const vol =", "const r = pcRng(hashStr(rut)); const vol ="))[0].includes("pcRng"));
  assert.ok(fallos(base.replace("mixSowDe(rut)", "PC_COMPET_NAMES"))[0].includes("lista de nombres"));
  assert.ok(fallos(base.replace("P360.ix.COLOC_PROM_12M", "0"))[0].includes("COLOC_PROM_12M"));
  assert.ok(fallos(base.replace("NOTA_PRIORITARIA", "0.5"))[0].includes("nota de corte"));
  assert.ok(fallos(base.replace("return out;", "// Fallback sintético\nreturn out;"))[0].includes("fallback sintético"));
  assert.equal(fallos("const OTRA_COSA = 1;")[0], "no se encontró el catálogo `PC_CLIENTES` en el fuente");
});
