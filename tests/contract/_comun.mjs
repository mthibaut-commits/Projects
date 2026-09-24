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

/* FORMA CANÓNICA del fuente, para los gates que se fijan sobre su TEXTO.

   El 18-09-2026 el `.jsx` pasó por prettier (ADR-0006) y 59 gates se cayeron de una vez: ninguno estaba
   equivocado, todos asumían la forma que el fuente tenía escrita a mano. Prettier hace tres cosas que rompen
   un patrón sin cambiar el significado —abre una llamada en varias líneas, agrega la coma final, y aprieta o
   suelta los espacios dentro de los paréntesis—, así que un gate que compara contra el texto crudo mide
   FORMATO además de comportamiento, y vuelve a caerse con el próximo reformat.

   `canonico` quita esas tres: colapsa todo espacio en uno, borra la coma antes de un cierre y pega los
   paréntesis a su contenido. `recortarAsignacion(\n  lineaPrev,\n  ids,\n)` y `recortarAsignacion(lineaPrev, ids)`
   quedan idénticos. Lo que NO toca es el contenido de los strings ni el orden: un gate sigue midiendo lo que medía.

   Cuándo NO usarla: cuando lo que el gate fija ES la forma de las líneas —una declaración a columna 0, una
   función de una sola línea, el `}` final del fuente—. Ahí el salto de línea es el dato. */
export const canonico = (texto) =>
  String(texto)
    .replace(/\s+/g, " ")
    .replace(/,\s*([)\]}])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1");

/* El TRAMO de una declaración de nivel módulo: desde su firma (`function X(`, `const X = (() => {`) hasta la siguiente
   declaración a columna 0. Es la misma guarda que hizo segura la poda (`.claude/rules/code_style.md`): el final de una
   declaración lo marca la ESTRUCTURA del archivo, no el primer `}` que aparezca. Devuelve "" si la firma no está. */
export function tramo(src, firma) {
  const i = src.indexOf(firma);
  if (i < 0) return "";
  const resto = src.slice(i + firma.length);
  const m = /\n(?:export default )?(?:async )?(?:function|const|let|var|class) /.exec(resto);
  return src.slice(i, m ? i + firma.length + m.index : src.length);
}
