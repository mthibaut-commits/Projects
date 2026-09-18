/* Test de contrato del vault (port del `test_vault_frontmatter.py` del skill agentic-repo-bootstrap-v2).

   El vault sólo sirve como memoria si su frontmatter es consistente: un agente responde «¿qué hay en
   vuelo?» con un grep sobre `estado:`, y eso sólo funciona si los campos existen y se llaman igual en
   todos lados. Este test convierte esa disciplina en un gate. Corre en CI con `node --test tests/contract/`. */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { RAIZ, leer, lineasDe, caminar, frontmatter, rel } from "./_comun.mjs";

const REQUERIDAS = ["type", "title", "description", "timestamp"];
const TIPOS = new Set(["indice", "roadmap", "feature", "spec", "plan", "tareas", "adr", "sesion", "conocimiento"]);
export const MAX_LINEAS_CLAUDE_MD = 150;   // se carga en CADA sesión; el bloat degrada la precisión
export const MAX_LINEAS_TABLERO = 80;       // es un tablero, no un historial

const VAULT = join(RAIZ, "vault");
const docs = caminar(VAULT);
const parsear = (abs) => frontmatter(leer(rel(abs)));

test("el vault tiene documentos (un vault vacío pasaría todo lo demás por vacuidad)", () => {
  assert.ok(docs.length > 0, "vault/ no tiene documentos .md");
});

test("todo documento declara las cuatro claves OKF", () => {
  const fallos = [];
  for (const d of docs) {
    const { campos, error } = parsear(d);
    if (error) { fallos.push(`${rel(d)}: ${error}`); continue; }
    const faltan = REQUERIDAS.filter((k) => !(k in campos));
    if (faltan.length) fallos.push(`${rel(d)}: faltan ${faltan.join(", ")}`);
  }
  assert.deepEqual(fallos, []);
});

test("`type` viene del vocabulario cerrado del vault", () => {
  const fallos = [];
  for (const d of docs) {
    const { campos } = parsear(d);
    if (campos?.type && !TIPOS.has(campos.type)) fallos.push(`${rel(d)}: type '${campos.type}' no está en ${[...TIPOS].sort().join(", ")}`);
  }
  assert.deepEqual(fallos, []);
});

test("`timestamp` es ISO 8601 parseable", () => {
  const fallos = [];
  for (const d of docs) {
    const { campos } = parsear(d);
    if (campos?.timestamp && Number.isNaN(Date.parse(campos.timestamp))) fallos.push(`${rel(d)}: timestamp '${campos.timestamp}'`);
  }
  assert.deepEqual(fallos, []);
});

test(`el tablero existe y mide ≤${MAX_LINEAS_TABLERO} líneas`, () => {
  const n = lineasDe(leer("vault/sesiones/estado_actual.md")).length;
  assert.ok(n <= MAX_LINEAS_TABLERO, `estado_actual.md tiene ${n} líneas (máx ${MAX_LINEAS_TABLERO}): es un tablero, no un historial — la historia va al log de sesión y lo durable a conocimiento/`);
});

test(`CLAUDE.md mide ≤${MAX_LINEAS_CLAUDE_MD} líneas`, () => {
  const n = lineasDe(leer("CLAUDE.md")).length;
  assert.ok(n <= MAX_LINEAS_CLAUDE_MD, `CLAUDE.md tiene ${n} líneas (máx ${MAX_LINEAS_CLAUDE_MD}): mueve el detalle a .claude/rules/ o al vault`);
});

test("el tablero manda: ningún otro documento afirma la fase del proyecto", () => {
  const ajenos = docs.filter((d) => !d.endsWith("estado_actual.md") && /^## Fase del proyecto/m.test(leer(rel(d))));
  assert.deepEqual(ajenos.map(rel), [], "sólo vault/sesiones/estado_actual.md puede tener la sección «Fase del proyecto»");
});

/* El bloque invariante del despacho de agentes. Vivía en el scratchpad de la sesión y se perdió con ella —más
   de noventa agentes lo obedecieron y no quedó nada—, así que ahora vive en el vault. Cada cláusula está
   porque algo se rompió sin ella, y la forma de perderlas de nuevo no es borrar el archivo: es «resumir» el
   bloque hasta que deje de decir lo que dice. Esto exige que las ocho sigan ahí. */
export const CLAUSULAS = [
  { que: "no editar el repositorio", re: /No edites el repositorio/ },
  { que: "no construir", re: /No construyas/ },
  { que: "tope de corridas", re: /Máximo \d+ corridas/ },
  { que: "las dos direcciones cuando la regla bloquea", re: /prueba las dos direcciones/i },
  { que: "la sonda cuando es una propiedad", re: /planta la sonda/i },
  { que: "no dejar estado", re: /No dejes estado/ },
  { que: "fallar sin reventar", re: /Falla, no revientes/ },
  { que: "citar la evidencia medida", re: /Cita la evidencia que mediste/ },
];
export const faltantes = (texto) => CLAUSULAS.filter((c) => !c.re.test(texto)).map((c) => c.que);

test("el bloque invariante del despacho de agentes conserva sus ocho cláusulas", () => {
  const doc = leer("vault/conocimiento/despacho_agentes.md");
  assert.deepEqual(faltantes(doc), [], "una cláusula del brief desapareció: cada una está por un incidente, y resumirlas es cómo se pierden");
  assert.match(doc, /demostrar que el gate NO fija la regla/, "falta la consigna del refutador, que es la mitad del método");
});

test("sonda negativa: un brief al que le quitaron cláusulas se caza", () => {
  assert.deepEqual(faltantes("No edites el repositorio. No construyas."), CLAUSULAS.slice(2).map((c) => c.que));
  assert.deepEqual(faltantes(""), CLAUSULAS.map((c) => c.que));
});

test("sonda negativa: un documento plantado sin `description` es cazado por el parser", () => {
  const { campos } = frontmatter("---\ntype: sesion\ntitle: x\ntimestamp: 2026-01-01T00:00:00Z\n---\n");
  assert.deepEqual(REQUERIDAS.filter((k) => !(k in campos)), ["description"]);
  assert.ok(frontmatter("sin frontmatter\n").error, "un documento sin '---' inicial tiene que dar error");
});
