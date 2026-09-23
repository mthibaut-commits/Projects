#!/usr/bin/env node
/* Audita las skills de terceros de `.claude/skills/` contra las decisiones ya tomadas de este repo.
   NO busca malas prácticas: busca instrucciones que CONTRADIGAN una regla escrita acá, que es otra
   cosa. Una skill de terceros es buen consejo genérico; una regla del vault está ganada con un
   incidente medido en ESTE repo. Cuando chocan, la skill se CORRIGE (regla 63) — no se la deja
   diciendo lo contrario confiando en que el agente recuerde cuál manda.

   Un token foráneo no falla el día que entra: aparece un color que no está en `C` y la pantalla deja
   de ser Datamart en un rincón. Es el agujero de `t14` otra vez —no falla, sale distinto, nadie lo
   ve—, y por eso esto se mide en vez de confiarse.

   El bloque de AJUSTE LOCAL se RECORTA antes de escanear: el cuerpo de la skill sigue diciendo lo
   suyo (no se reescribe una skill ajena entera), así que el choque se sigue reportando; lo que el
   gate comprueba es que el ajuste esté puesto. Sin recortarlo, el propio ajuste se contaría como
   choque y el auditor se mediría a sí mismo.

   Salida: inventario y exit 0. El gate es la línea base de `tests/contract/skills.test.mjs`.
   `--csv` para el inventario en crudo. */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), ".claude", "skills");

/** La skill de la casa: su paleta ES la referencia, no un choque. */
export const PROPIAS = new Set(["datamart-ui"]);

export const MARCA_INICIO = "<!-- AJUSTE-LOCAL-NEX:inicio -->";
export const MARCA_FIN = "<!-- AJUSTE-LOCAL-NEX:fin -->";

export const CHOQUES = [
  {
    id: "unidad",
    regla: "`.claude/rules/testing.md` — acá no hay capa unitaria: el fuente es un solo archivo y la suite prueba las funciones puras inyectándoles el estado",
    pat: /\b(unit tests?|jest|vitest|mocha|testing library|coverage (threshold|target|hasn't decreased)|--coverage|code coverage)\b/gi,
  },
  {
    id: "git",
    // `style:` salió: en `brandkit` es la etiqueta de una plantilla de prompt, no un prefijo de commit,
    // y `:\s` con `\s` casando el salto de línea la daba por buena. El tipo va seguido de un ESPACIO y algo.
    regla: "reglas núcleo 5 y 6 + `flujo_git.md` — commits en español con el estilo del `git log` de la casa, integración con `merge --no-ff`",
    pat: /(\bconventional commits?\b|\bsquash( and)? merge\b|\bsemantic-release\b|\bcommitlint\b|^\s*(feat|fix|chore|docs|refactor|perf)(\([a-z-]+\))?: \S)/gim,
  },
  {
    id: "token",
    regla: "regla 63 — el color, la tipografía y los radios salen del objeto `C`; una referencia externa aporta COMPOSICIÓN",
    pat: /(#[0-9a-fA-F]{6}\b|font-family\s*:|border-radius\s*:\s*\d)/g,
  },
  {
    id: "designmd",
    regla: "regla 63 — ningún `DESIGN.md` en la raíz del repo",
    pat: /\bDESIGN\.md\b/g,
  },
];

/** Recorta el bloque de ajuste local: lo que se audita es el cuerpo ajeno, no la nota de la casa. */
export function sinAjuste(texto) {
  const i = texto.indexOf(MARCA_INICIO);
  if (i === -1) return texto;
  const j = texto.indexOf(MARCA_FIN, i);
  return j === -1 ? texto.slice(0, i) : texto.slice(0, i) + texto.slice(j + MARCA_FIN.length);
}

export function tieneAjuste(texto) {
  return texto.includes(MARCA_INICIO) && texto.includes(MARCA_FIN);
}

/** Todos los .md de una skill, concatenados. */
export function textoDe(dir) {
  const archivos = [];
  const recorrer = (d) => {
    for (const e of readdirSync(d)) {
      const f = join(d, e);
      if (statSync(f).isDirectory()) recorrer(f);
      else if (/\.(md|markdown)$/i.test(e)) archivos.push(f);
    }
  };
  recorrer(dir);
  return archivos.map((f) => readFileSync(f, "utf8")).join("\n");
}

/** `[{ skill, choques: [{id, n}], ajustada }]`, sólo las que chocan. Ordenado por nombre. */
export function auditar(raiz = RAIZ) {
  if (!existsSync(raiz)) return [];
  const salida = [];
  for (const s of readdirSync(raiz).sort()) {
    if (PROPIAS.has(s) || !statSync(join(raiz, s)).isDirectory()) continue;
    const bruto = textoDe(join(raiz, s));
    const cuerpo = sinAjuste(bruto);
    const choques = [];
    for (const c of CHOQUES) {
      const m = cuerpo.match(c.pat);
      if (m) choques.push({ id: c.id, n: m.length });
    }
    if (choques.length) salida.push({ skill: s, choques, ajustada: tieneAjuste(bruto) });
  }
  return salida;
}

function main() {
  const filas = auditar();
  if (process.argv.includes("--csv")) {
    console.log("skill,choque,ocurrencias,ajustada");
    for (const f of filas) for (const c of f.choques) console.log(`${f.skill},${c.id},${c.n},${f.ajustada}`);
    return;
  }
  const total = readdirSync(RAIZ).filter((d) => !PROPIAS.has(d) && statSync(join(RAIZ, d)).isDirectory()).length;
  for (const c of CHOQUES) {
    const fs = filas.filter((f) => f.choques.some((x) => x.id === c.id));
    console.log(`\n### ${c.id.toUpperCase()} — ${fs.length} skill(s)`);
    console.log(`    choca con ${c.regla}`);
    for (const f of fs) {
      const n = f.choques.find((x) => x.id === c.id).n;
      console.log(`    ${String(n).padStart(4)}  ${f.skill.padEnd(32)} ${f.ajustada ? "ajustada" : "SIN AJUSTE"}`);
    }
  }
  const sin = filas.filter((f) => !f.ajustada);
  console.log(`\n${total} skills de terceros · ${filas.length} chocan · ${filas.length - sin.length} ajustadas · ${sin.length} sin ajustar`);
  if (sin.length) console.log(`SIN AJUSTAR: ${sin.map((f) => f.skill).join(" ")}`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
