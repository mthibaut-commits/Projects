#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════════════════════════
   SINCRONIZAR CON MAIN ANTES DE MODIFICAR — lo que corre la skill `sincronizar-main`

     node sincronizar_main.mjs      trae origin/main, mide la rama contra él y dice qué hacer y con qué comandos

   Pedido del usuario (23-09-2026): «antes de partir con una modificación de la rama main debes integrar los
   cambios para que tu base sea lo más actualizada». El costo de no hacerlo está medido: ese mismo día un bloque
   de reglas se renumeró DOS veces (60–71 → 63–74 → 64–75) porque otra sesión publicó en `main` mientras ésta
   trabajaba sobre una base vieja, y una corrección de rótulo hubo que re-aplicarla a mano sobre el árbol
   renumerado (vault/sesiones/2026-09-23_mezclar_todo_lo_pendiente.md).

   El script NO toca la rama ni el árbol: hace `git fetch`, mide y propone. Los comandos que integran los corre
   quien trabaja, UNO POR UNO, para que el hook `gitflow_guard` los vea y el mensaje del commit lo escriba quien
   lo firma. Nunca propone empujar, reescribir historia ni trabajar sobre `main`.

   Dice además los SIGUIENTES ENTEROS LIBRES —regla, caso de la suite, ADR y archivo e2e— medidos sobre la UNIÓN
   de la rama y `origin/main`: un número tomado sobre una base vieja es exactamente el que choca.

   Sale con 0 si la rama está al día, 3 si hay que integrar, 1 si hay que detenerse (estás en `main`, el árbol
   tiene cambios sin commitear o HEAD está desacoplado) y 2 si no se pudo traer `origin/main`.
   ════════════════════════════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RAIZ = dirname(fileURLToPath(import.meta.url));
export const INTEGRACION = "main";
export const REMOTO = "origin/" + INTEGRACION;

/* ── La decisión, pura: de la medición a una acción con su porqué ────────────────────────────── */
export function planDeSincronizacion({ rama, sucio, detras, adelante, propios }) {
  if (!rama || rama === "HEAD") return { accion: "detener", motivo: "HEAD está desacoplado: cámbiate a la rama de trabajo antes de integrar." };
  if (rama === INTEGRACION)
    return { accion: "detener", motivo: `estás en ${INTEGRACION}: no se modifica ${INTEGRACION} directo. Cámbiate a la rama de la sesión (o crea feature/<slug> desde ${REMOTO}) y vuelve a correr esto.` };
  // Al día no hay nada que integrar, así que un árbol con cambios no estorba: es el trabajo en curso.
  if (!(detras > 0)) return { accion: "al_dia", motivo: `la rama ya contiene todo ${REMOTO}.` };
  if (sucio) return { accion: "detener", motivo: "hay cambios sin commitear: commitéalos o guárdalos (git stash) antes de integrar; mezclar sobre un árbol sucio mezcla trabajo a medias." };
  if (!(adelante > 0)) return { accion: "avanzar", motivo: `la rama no tiene nada propio: avanza hasta ${REMOTO} sin merge commit.` };
  if (!(propios > 0))
    return {
      accion: "tomar_main",
      motivo: `todo lo propio de la rama ya está en ${REMOTO} con un commit equivalente (git cherry): se toma el árbol de ${REMOTO} entero en un merge, para no re-aplicar cambios que ya entraron.`,
    };
  return { accion: "mezclar", motivo: `la rama tiene ${propios} commit(s) sin equivalente en ${REMOTO}: se mezcla ${REMOTO} en la rama con --no-ff y se resuelven los conflictos.` };
}

/* Los comandos de cada acción, en el orden en que se corren. Ninguno empuja ni reescribe historia. */
export function comandosDelPlan(accion) {
  switch (accion) {
    case "avanzar":
      return [`git merge --ff-only ${REMOTO}`];
    case "tomar_main":
      return [`git merge -s ours --no-ff --no-commit ${REMOTO}`, `git read-tree -u --reset ${REMOTO}`, "git commit -F <mensaje>"];
    case "mezclar":
      return [`git merge --no-ff --no-commit ${REMOTO}`, "git diff --name-only --diff-filter=U", "git add -A", "git commit -F <mensaje>"];
    default:
      return [];
  }
}

/* ── Los siguientes enteros libres, puros ─────────────────────────────────────────────────────────
   `reglas`: los textos de los archivos de reglas (una regla empieza a columna 0 con su número y un punto:
   «63. **…», «13-ter. …»); `casosEsperados`: el snapshot de la suite; `adrs` y `e2e`: nombres de archivo. */
export function siguientesLibres({ reglas = [], casosEsperados = 0, adrs = [], e2e = [] }) {
  let maxRegla = 0;
  for (const t of reglas) for (const m of String(t).matchAll(/^(\d+)(?:-[a-z]+)*\. \S/gm)) maxRegla = Math.max(maxRegla, +m[1]);
  let maxAdr = 0;
  for (const f of adrs) {
    const m = /^ADR-(\d{4})-/.exec(f);
    if (m) maxAdr = Math.max(maxAdr, +m[1]);
  }
  let maxE2e = 0;
  for (const f of e2e) {
    const m = /^(\d+)_.*\.e2e\.mjs$/.exec(f);
    if (m) maxE2e = Math.max(maxE2e, +m[1]);
  }
  return {
    regla: maxRegla + 1,
    caso: (+casosEsperados || 0) + 1,
    adr: "ADR-" + String(maxAdr + 1).padStart(4, "0"),
    e2e: String(maxE2e + 1).padStart(2, "0"),
  };
}

/* La unión de dos juegos de insumos: lo que tomó la rama Y lo que tomó main. */
export const unirInsumos = (a, b) => ({
  reglas: [...a.reglas, ...b.reglas],
  casosEsperados: Math.max(+a.casosEsperados || 0, +b.casosEsperados || 0),
  adrs: [...new Set([...a.adrs, ...b.adrs])],
  e2e: [...new Set([...a.e2e, ...b.e2e])],
});

const CASOS = /CASOS_ESPERADOS = (\d+)/;
const RUTA_REGLAS = "vault/conocimiento/reglas";
const RUTA_CONTRATO = "vault/conocimiento/contrato_servidor_y_auditoria.md";

/* ── Lo impuro: git y el disco ──────────────────────────────────────────────────────────────── */
const git = (args) => execFileSync("git", args, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function insumosDelArbol() {
  const dir = join(RAIZ, RUTA_REGLAS);
  const reglas = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => readFileSync(join(dir, f), "utf8"));
  if (existsSync(join(RAIZ, RUTA_CONTRATO))) reglas.push(readFileSync(join(RAIZ, RUTA_CONTRATO), "utf8"));
  const suite = join(RAIZ, "tests/contract/suite.test.mjs");
  const m = existsSync(suite) ? CASOS.exec(readFileSync(suite, "utf8")) : null;
  return { reglas, casosEsperados: m ? +m[1] : 0, adrs: readdirSync(join(RAIZ, "vault/adr")), e2e: readdirSync(join(RAIZ, "tests/e2e")) };
}

function insumosDe(ref) {
  const ls = (dir) => git(["ls-tree", "--name-only", `${ref}:${dir}`]).split("\n").filter(Boolean);
  const show = (p) => {
    try {
      return git(["show", `${ref}:${p}`]);
    } catch {
      return "";
    }
  };
  const reglas = ls(RUTA_REGLAS).filter((f) => f.endsWith(".md")).map((f) => show(`${RUTA_REGLAS}/${f}`));
  reglas.push(show(RUTA_CONTRATO));
  const m = CASOS.exec(show("tests/contract/suite.test.mjs"));
  return { reglas, casosEsperados: m ? +m[1] : 0, adrs: ls("vault/adr"), e2e: ls("tests/e2e") };
}

export function medir() {
  let fetchOk = true;
  try {
    git(["fetch", "--prune", "origin", INTEGRACION]);
  } catch {
    fetchOk = false;
  }
  const rama = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const sucio = git(["status", "--porcelain"]).length > 0;
  const detras = +git(["rev-list", "--count", `HEAD..${REMOTO}`]);
  const adelante = +git(["rev-list", "--count", `${REMOTO}..HEAD`]);
  const propios = git(["cherry", REMOTO, "HEAD"]).split("\n").filter((l) => l.startsWith("+")).length;
  const cabeza = git(["log", "-1", "--format=%h · %ad · %s", "--date=format:%d-%m %H:%M", REMOTO]);
  return { fetchOk, rama, sucio, detras, adelante, propios, cabeza };
}

function main() {
  let m;
  try {
    m = medir();
  } catch (e) {
    console.error("No se pudo medir la rama contra " + REMOTO + ": " + String((e && e.message) || e).split("\n")[0]);
    process.exit(2);
  }
  const plan = planDeSincronizacion(m);
  console.log(`Sincronizar con ${INTEGRACION} · rama ${m.rama} · ${REMOTO} ${m.cabeza}`);
  if (!m.fetchOk) console.log(`  ⚠ No se pudo traer ${REMOTO}: lo que sigue está medido contra la copia local, que puede estar vieja.`);
  console.log(`  detrás de ${REMOTO}: ${m.detras} commit(s) · adelante: ${m.adelante} · propios sin equivalente: ${m.propios}${m.sucio ? " · árbol con cambios sin commitear" : ""}`);
  const ROTULO = { detener: "detener", al_dia: "al día", avanzar: "avanzar", tomar_main: "tomar main", mezclar: "mezclar" };
  console.log(`  Acción: ${ROTULO[plan.accion] || plan.accion} — ${plan.motivo}`);
  const cmds = comandosDelPlan(plan.accion);
  if (cmds.length) {
    console.log("  Comandos, UNO POR UNO (si el hook bloquea un compuesto, no corre ninguna parte):");
    for (const c of cmds) console.log("    " + c);
    console.log("  Después: re-leer el tablero, correr los gates de contrato sobre el árbol integrado y volver a correr esto.");
  }
  try {
    const libres = siguientesLibres(unirInsumos(insumosDelArbol(), insumosDe(REMOTO)));
    console.log(`Siguientes enteros libres (unión de la rama y ${REMOTO}): regla ${libres.regla} · caso ${libres.caso} · ${libres.adr} · e2e ${libres.e2e}`);
  } catch (e) {
    console.log("No se pudieron calcular los siguientes enteros libres: " + String((e && e.message) || e).split("\n")[0]);
  }
  process.exit(plan.accion === "detener" ? 1 : !m.fetchOk ? 2 : plan.accion === "al_dia" ? 0 : 3);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
