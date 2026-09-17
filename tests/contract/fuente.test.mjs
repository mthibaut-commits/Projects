/* Gates de ARQUITECTURA sobre el fuente único: los invariantes de `.claude/rules/code_style.md` que se
   pueden comprobar por introspección del texto, en milisegundos y sin navegador. Cada uno nació de un
   incidente real: el montaje raíz agregado al fuente rompe el build; una clase `tN` usada y no declarada
   (el caso t14) deja quince elementos de un tamaño distinto en cada pantalla, sin error; `stageName` local
   crashea toda pérdida del Kanban; y dos builds con distinto `vendorOrden` producen dos HTML distintos
   del mismo fuente. `tsc` y el build pasan con todos ellos rotos. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* 1 · Paso 2 de la verificación, en JS: la misma expresión que el grep de CLAUDE.md. */
export function duplicadosNivelModulo(src) {
  const vistos = new Map();
  for (const l of src.split("\n")) {
    const m = l.match(/^(?:function|const|let|var) ([A-Za-z0-9_]+)/);
    if (m) vistos.set(m[1], (vistos.get(m[1]) || 0) + 1);
  }
  return [...vistos].filter(([, n]) => n > 1).map(([s]) => s);
}

/* 2 · El .jsx no monta la app: el build APPENDEA definirWebComponent(React, ReactDOM, PipelineComercial). */
export function montajeRaiz(src) {
  const fallos = [];
  if (/^definirWebComponent\(/m.test(src)) fallos.push("hay una llamada a `definirWebComponent(` a columna 0: el montaje raíz lo appendea el build, nunca va en el fuente");
  if (!/^export default function PipelineComercial\(/m.test(src)) fallos.push("falta `export default function PipelineComercial(` a columna 0");
  const ultima = src.replace(/\s+$/, "").split("\n").pop();
  if (ultima !== "}") fallos.push(`la última línea del fuente es «${ultima.slice(0, 50)}» y tiene que ser el \`}\` que cierra PipelineComercial`);
  return fallos;
}

/* 3 · Clases propias del <style>, en los dos sentidos. Espejo de la sección D de auditar_muerto.mjs:
   las reglas `.clase{` se buscan en todo el fuente (hay varios bloques <style>), las usadas salen de los
   className, y el filtro nombra las clases PROPIAS para no contar utilidades de Tailwind. */
export const ESPERADAS = /^(t\d+|ovl|skel|minw5|btn-cta|pl-row|pl-sim|pl-spin|nex-)/;
export function clasesPropias(src) {
  const declaradas = new Set([...src.matchAll(/\.([a-zA-Z][\w-]*)\s*\{/g)].map((m) => m[1]));
  const usadas = new Set();
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g))
    for (const c of (m[1] || m[2] || m[3] || "").split(/\s+/)) if (c && !c.includes("$")) usadas.add(c.replace(/^.*:/, ""));
  const propias = [...declaradas].filter((c) => ESPERADAS.test(c));
  return {
    declaradas: propias.sort(),
    sinUso: propias.filter((c) => !usadas.has(c)).sort(),
    sinDeclarar: [...usadas].filter((c) => ESPERADAS.test(c) && !declaradas.has(c)).sort(),
  };
}

/* 5 · Los dos builds cumplen el MISMO contrato: el orden del vendor es idéntico en el .mjs y el .ps1. */
export function vendorOrdenDe(mjs, ps1) {
  const lista = (s) => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const a = mjs.match(/const vendorOrden = \[([\s\S]*?)\];/);
  const b = ps1.match(/\$vendorOrden = @\(([\s\S]*?)\)/);
  return { mjs: a ? lista(a[1]) : null, ps1: b ? lista(b[1]) : null };
}

test("no hay símbolos de nivel módulo duplicados (paso 2 de la verificación)", () => {
  assert.deepEqual(duplicadosNivelModulo(jsx), [], "una clave repetida en un objeto literal es JS válido y silencioso; un símbolo repetido a nivel módulo también hasta que Babel lo transpila");
});

test("el fuente no monta la app: termina en el `}` de PipelineComercial y no llama a definirWebComponent", () => {
  assert.deepEqual(montajeRaiz(jsx), []);
});

test("toda clase propia del <style> que se usa está declarada, y toda declarada se usa (el caso t14)", () => {
  const c = clasesPropias(jsx);
  assert.ok(c.declaradas.length >= 9, `se esperaban al menos t7…t15 declaradas; hay ${c.declaradas.length}`);
  assert.deepEqual(c.sinDeclarar, [], "una clase usada y no declarada no falla: el elemento hereda el tamaño del padre y sale distinto en cada pantalla");
  assert.deepEqual(c.sinUso, [], "una clase declarada y sin uso es CSS muerto; bórrala o úsala");
});

test("`stageName` es de nivel módulo (si se vuelve local, toda pérdida del Kanban crashea la app)", () => {
  assert.match(jsx, /^(?:const|function) stageName\b/m);
});

test("build_app.mjs y build_app.ps1 declaran el mismo vendorOrden, y cada archivo existe en vendor/", () => {
  const { mjs, ps1 } = vendorOrdenDe(leer("build_app.mjs"), leer("build_app.ps1"));
  assert.ok(mjs && ps1, "no se encontró vendorOrden en uno de los dos builds");
  assert.deepEqual(mjs, ps1, "los dos builds son el MISMO contrato: si cambia uno, cambia el otro");
  assert.deepEqual(mjs.filter((f) => !existsSync(join(RAIZ, "vendor", f))), [], "archivo del vendorOrden que no existe en vendor/");
});

test("sonda negativa: un duplicado, un montaje raíz, una t16 y un vendor distinto plantados se detectan", () => {
  assert.deepEqual(duplicadosNivelModulo("const a = 1;\nfunction a() {}\nconst b = 2;"), ["a"]);
  assert.ok(montajeRaiz(jsx + "\ndefinirWebComponent(React, ReactDOM, PipelineComercial);\n").some((f) => f.includes("columna 0")));
  const c = clasesPropias(jsx + '\n<div className="t16 mt-2"/>');
  assert.deepEqual(c.sinDeclarar, ["t16"]);
  assert.deepEqual(vendorOrdenDe('const vendorOrden = ["a.js", "b.js"];', '$vendorOrden = @("a.js")'), { mjs: ["a.js", "b.js"], ps1: ["a.js"] });
});
