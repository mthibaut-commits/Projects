#!/usr/bin/env node
/* PreToolUse (Bash): refuerza el flujo git del repo (vault/conocimiento/flujo_git.md).
   Bloquea (1) un push con refspec cruzado hacia una rama de integración —integra por fast-forward y
   borra la feature de la historia—, (2) `git merge` sin --no-ff estando en una rama de integración y
   (3) `git commit` directo sobre ella. Escape consciente para una edición T3 acordada: GITFLOW_ALLOW=1.
   La lógica se exporta (`decidir`) para probarla desde tests/contract/hooks.test.mjs. */
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const INTEGRACION = ["main"];   // preset A (GitHub Flow). Con develop/main sería ["develop", "main"].

export function decidir(command, rama) {
  const c = String(command || "");
  if (!c.trim() || /GITFLOW_ALLOW=1/.test(c) || !/\bgit\b/.test(c)) return { bloquear: false };
  const alt = INTEGRACION.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const push = c.match(new RegExp(`\\bgit\\s+push\\s+(?:\\S+\\s+)*?([^\\s:]+):(${alt})(?![\\w-])`));
  if (push && !/--delete/.test(c) && push[1] !== push[2]) {
    return { bloquear: true, motivo: `jamás se empuja una rama ajena sobre ${push[2]} por refspec: eso integra por fast-forward y borra la feature de la historia. Flujo: git checkout ${push[2]} && git merge --no-ff <rama> && git push origin ${push[2]}` };
  }
  if (INTEGRACION.includes(rama)) {
    if (/\bgit\s+merge\b/.test(c) && !/--no-ff/.test(c)) return { bloquear: true, motivo: `un merge a ${rama} va SIEMPRE con --no-ff: el merge commit es lo que deja visible la feature en la historia` };
    if (/\bgit\s+commit\b/.test(c)) return { bloquear: true, motivo: `no se committea directo sobre ${rama}. Crea la rama (git checkout -b feature/<slug>); si es una edición T3 acordada con el usuario, prefija el comando con GITFLOW_ALLOW=1` };
  }
  return { bloquear: false };
}

export function ramaActual(cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd()) {
  try { return execSync("git branch --show-current", { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return ""; }
}

async function main() {
  let entrada = "";
  for await (const trozo of process.stdin) entrada += trozo;
  let cmd = "";
  try { cmd = JSON.parse(entrada)?.tool_input?.command ?? ""; } catch { process.exit(0); }
  const d = decidir(cmd, ramaActual());
  if (d.bloquear) { process.stderr.write(`BLOQUEADO (gitflow): ${d.motivo}.\n`); process.exit(2); }
  process.exit(0);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
