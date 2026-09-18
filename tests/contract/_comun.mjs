/* Utilidades compartidas por los tests de contrato. No es un test: `node --test` sólo corre `*.test.mjs`. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const leer = (rel) => readFileSync(join(RAIZ, rel), "utf8");
export const lineasDe = (texto) => texto.replace(/\n$/, "").split("\n");
export const rel = (abs) => abs.startsWith(RAIZ) ? abs.slice(RAIZ.length + 1) : abs;

export const caminar = (dir, ext = ".md") =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? caminar(p, ext) : p.endsWith(ext) ? [p] : [];
  });

/* Frontmatter OKF: las claves de primer nivel entre los dos `---`. No pretende ser un parser de YAML. */
export function frontmatter(texto) {
  const L = texto.split("\n");
  if ((L[0] || "").trim() !== "---") return { error: "no empieza con frontmatter '---'" };
  const fin = L.indexOf("---", 1);
  if (fin < 0) return { error: "el frontmatter no está cerrado con '---'" };
  const campos = {};
  for (const l of L.slice(1, fin)) {
    if (!l.trim() || /^[\s#]/.test(l)) continue;
    const i = l.indexOf(":");
    if (i > 0) campos[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { campos };
}

/* Los casos de la suite se declaran como ok("N título", …); N es lo único que identifica el caso en la
   salida `PASA N`. Compartido por suite.test y invariantes.test (importar un .test desde otro .test
   registra sus tests dos veces). */
/* Un caso ASÍNCRONO (promesas del repositorio, SHA-256: RAT-01, IDM-01, CRY-01) declara su título en `const TIT = "N …"`,
   emite `ok(TIT, …)` en el acto y vuelve a emitirlo cuando resuelve: el título cuenta igual, una sola vez. */
const CASO = /\b(?:ok\(\s*|const TIT = )["'`](\d+) /g;
export const numerosDeCasos = (texto) => [...texto.matchAll(CASO)].map((m) => +m[1]);
/* Número y título de cada ok(): un caso puede tener DOS ok() con el mismo número y el mismo título (una rama
   de guarda que lo reporta fallido cuando no hay con qué probarlo); dos títulos distintos bajo un número sí
   son dos casos pisándose. */
export const casosDeSuite = (texto) => [...texto.matchAll(/\b(?:ok\(\s*|const TIT = )["'`](\d+) ([^"'`]*)/g)].map((m) => ({ n: +m[1], titulo: m[2].trim() }));
