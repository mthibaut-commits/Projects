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

test("sonda negativa: un documento plantado sin `description` es cazado por el parser", () => {
  const { campos } = frontmatter("---\ntype: sesion\ntitle: x\ntimestamp: 2026-01-01T00:00:00Z\n---\n");
  assert.deepEqual(REQUERIDAS.filter((k) => !(k in campos)), ["description"]);
  assert.ok(frontmatter("sin frontmatter\n").error, "un documento sin '---' inicial tiene que dar error");
});
