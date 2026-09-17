/* auditar_unidades.mjs — magnitudes en MILLONES donde el código espera un PESO.
 *
 * Regla que vigila: TODO MONTO ES UN PESO ENTERO. `M$` es una abreviatura de PANTALLA y el único
 * sitio que la aplica es el formateador. Un monto que llega a `fmtMM` ya dividido se divide dos
 * veces —«M$1.234» sale como «$1.234»— y un umbral escrito en millones contra un monto en pesos
 * INVIERTE el criterio en vez de sesgarlo: no lo cumple nadie.
 *
 * Mide tres cosas, ninguna de las cuales ve `tsc`, el chequeo de duplicados ni el build:
 *   (a) el argumento de un formateador viene dividido por 1e6 o por 1.000, en la misma línea;
 *   (b) una variable se declara dividida y se formatea más abajo (el caso que se escapa a la vista);
 *   (c) un campo de dato declara «millones» en su propio comentario.
 *
 * Los hallazgos son CANDIDATOS: dividir es legítimo cuando lo que se formatea no es un monto. Cada
 * uno va verificado a mano, como en `auditar_muerto.mjs`.
 *
 *   node auditar_unidades.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const FUENTE = process.argv[2] || join(aqui, "pipeline_comercial.jsx");
const L = readFileSync(FUENTE, "utf8").split("\n");
const FMT = /\b(fmtMM|fmtMMc|fmtCLP)\(/g;
const DIV = /\/\s*(1e6|1000000|1e3|1000)\b/;
let n = 0;

// (a) — recorta el argumento equilibrando paréntesis desde el "(" del formateador, que es lo único
//       que distingue `fmtMM(a / 1e6)` de `fmtMM(a) + " de " + (b / 1e6)`.
const a = [];
L.forEach((ln, i) => {
  FMT.lastIndex = 0;
  let m;
  while ((m = FMT.exec(ln))) {
    let d = 1, j = m.index + m[0].length, arg = "";
    while (j < ln.length && d > 0) { const c = ln[j]; if (c === "(") d++; else if (c === ")") d--; if (d > 0) arg += c; j++; }
    if (DIV.test(arg)) a.push(`  L${i + 1}  ${m[1]}(${arg.trim().slice(0, 100)})`);
  }
});
console.log(`(a) FORMATEADOR CON EL ARGUMENTO YA DIVIDIDO — ${a.length}`);
a.forEach((x) => console.log(x)); n += a.length;

// (b) — la división y el formateo en líneas distintas. Se cruza por nombre, así que una propiedad
//       homónima (`x.patrimonio` frente a un `const patrimonio`) aparece y hay que descartarla a mano.
const decl = new Map();
L.forEach((ln, i) => {
  const m = ln.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*.*\/\s*(?:1e6|1000000|1e3|1000)\b/);
  if (m) decl.set(m[1], i + 1);
});
const b = [];
decl.forEach((ln, v) => {
  const usos = [];
  L.forEach((l2, j) => { if (j + 1 !== ln && new RegExp(`\\b(?:fmtMM|fmtMMc|fmtCLP)\\([^)]*\\b${v}\\b`).test(l2)) usos.push(j + 1); });
  if (usos.length) b.push(`  ${v}  declarada L${ln}  ·  formateada en L${usos.join(", L")}`);
});
console.log(`\n(b) VARIABLE DIVIDIDA Y LUEGO FORMATEADA COMO PESO — ${b.length}`);
b.forEach((x) => console.log(x)); n += b.length;

// (c) — el comentario del propio campo declara la unidad equivocada.
const c = [];
L.forEach((ln, i) => { if (/acá millones|en millones/i.test(ln) && !/^\s*\/\//.test(ln)) c.push(`  L${i + 1}  ${ln.trim().slice(0, 130)}`); });
console.log(`\n(c) CAMPO DE DATO QUE DECLARA MILLONES — ${c.length}`);
c.forEach((x) => console.log(x)); n += c.length;

console.log(`\n${n} candidato(s). Cada uno va verificado a mano: dividir es legítimo cuando lo que se`);
console.log("formatea no es un monto (un plazo en días, un porcentaje, un conteo).");
process.exit(n ? 1 : 0);
