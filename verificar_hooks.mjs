#!/usr/bin/env node
/* Health check de los hooks, en UN comando y en Node puro: `node verificar_hooks.mjs`.
   Antes era un bloque de cuatro líneas de bash copiadas a mano desde vault/conocimiento/loop_agentico_hooks.md,
   y eso lo dejaba sin correr justo donde más falta hace — la máquina Windows del usuario, que es la única que
   este contenedor no puede atestiguar—.

   Qué mide, y por qué cada cosa: un hook de script muere EN SILENCIO si el shell o el runtime están rotos, y
   entonces no protege nada mientras todo parece normal. Así que no basta con que la lógica esté bien (eso ya lo
   prueba tests/contract/hooks.test.mjs): hay que ejecutar la CADENA COMPLETA tal como la invoca Claude Code —el
   shell expande $CLAUDE_PROJECT_DIR, node corre el archivo, el hook lee el JSON por stdin y devuelve su código—.
   En Windows esa cadena pasa por Git Bash; si `bash` no está, ningún hook corre.

   Ojo al editarlo: las sondas de gitflow_guard llevan el comando prohibido como DATO, así que este archivo se
   edita con la herramienta de archivos y no con un heredoc de bash — el guard mira el texto del comando y se
   dispara con su propia sonda (fricción anotada en loop_agentico_hooks.md). */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)));

/* Lo que settings.json tiene que declarar. El matcher es parte del contrato: un hook bien escrito colgado del
   evento equivocado no se dispara nunca, y se ve igual que uno que funciona. */
export const ESPERADOS = [
  { matcher: "Edit|Write|MultiEdit", archivo: "protect_paths.mjs" },
  { matcher: "Bash", archivo: "gitflow_guard.mjs" },
  { matcher: "EnterWorktree", archivo: "worktree_guard.mjs" },
];

/* Las sondas de punta a punta: payload plantado → código de salida esperado. El `exit 2` es el único que
   BLOQUEA, así que las dos direcciones importan: un hook que bloquea todo es tan inútil como uno mudo. */
const REFSPEC_CRUZADO = ["git push origin feature/x", "main"].join(":");   // partido a propósito: ver la cabecera
export const SONDAS = [
  { archivo: "protect_paths.mjs", que: "un .env se bloquea", entrada: { tool_input: { file_path: "x.env" } }, codigo: 2 },
  { archivo: "protect_paths.mjs", que: "un archivo normal pasa", entrada: { tool_input: { file_path: "README.md" } }, codigo: 0 },
  { archivo: "gitflow_guard.mjs", que: "un refspec cruzado a la rama de integración se bloquea", entrada: { tool_input: { command: REFSPEC_CRUZADO } }, codigo: 2 },
  { archivo: "gitflow_guard.mjs", que: "un git status pasa", entrada: { tool_input: { command: "git status" } }, codigo: 0 },
  { archivo: "worktree_guard.mjs", que: "responde «ask»", entrada: {}, codigo: 0, stdout: /"permissionDecision":\s*"ask"/ },
];

/* Revisión ESTÁTICA de settings.json: se prueba con un objeto plantado, así que la sonda negativa no necesita
   romper el archivo del repo. `existe` se inyecta por la misma razón. */
export function revisarSettings(cfg, existe = (f) => existsSync(resolve(RAIZ, ".claude/hooks", f))) {
  const fallos = [];
  const bloques = cfg?.hooks?.PreToolUse;
  if (!Array.isArray(bloques)) return ["settings.json no declara hooks.PreToolUse como lista: ningún hook está cableado"];
  for (const e of ESPERADOS) {
    const b = bloques.find((x) => x?.matcher === e.matcher);
    if (!b) { fallos.push(`falta el bloque con matcher «${e.matcher}» (${e.archivo}): un hook colgado del evento equivocado no se dispara nunca`); continue; }
    const cmd = (b.hooks || []).map((h) => h?.command || "").join(" ");
    if (!cmd.includes(e.archivo)) fallos.push(`el bloque «${e.matcher}» no invoca ${e.archivo}`);
    if (!existe(e.archivo)) fallos.push(`settings.json invoca ${e.archivo} y el archivo no existe en .claude/hooks/`);
  }
  return fallos;
}

/* El comando tal como está escrito en settings.json, para correrlo por el shell con la variable puesta: es la
   ÚNICA forma de comprobar que $CLAUDE_PROJECT_DIR se expande en esta máquina. */
export function comandoDe(cfg, archivo) {
  for (const b of cfg?.hooks?.PreToolUse || [])
    for (const h of b.hooks || []) if ((h?.command || "").includes(archivo)) return h.command;
  return null;
}

const ok = (t) => `  ✓ ${t}`;
const mal = (t) => `  ✗ ${t}`;

export function correr(linea = (s) => process.stdout.write(s + "\n")) {
  const fallos = [];
  linea("Health check de los hooks — " + RAIZ);

  // 1 · settings.json
  linea("\n1 · .claude/settings.json");
  let cfg = null;
  try { cfg = JSON.parse(readFileSync(resolve(RAIZ, ".claude/settings.json"), "utf8")); }
  catch (e) { fallos.push("settings.json no se puede leer ni parsear: " + e.message); linea(mal("no se puede leer ni parsear")); }
  if (cfg) {
    const f = revisarSettings(cfg);
    f.forEach((x) => { fallos.push(x); linea(mal(x)); });
    if (!f.length) linea(ok(`los ${ESPERADOS.length} hooks declarados, con su matcher y su archivo`));
  }

  // 2 · el shell. En Windows Claude Code corre los hooks por Git Bash; sin bash no corre NINGUNO.
  linea("\n2 · el shell que corre los hooks");
  const sh = spawnSync("bash", ["-c", "echo ok"], { encoding: "utf8" });
  if (sh.status === 0 && /ok/.test(sh.stdout || "")) linea(ok("bash responde"));
  else { fallos.push("`bash -c 'echo ok'` falla: en Windows los hooks corren por Git Bash, y sin él NINGÚN hook está corriendo aunque el trabajo parezca normal"); linea(mal("bash no responde — ningún hook está corriendo")); }

  // 3 · la cadena completa: shell + expansión de $CLAUDE_PROJECT_DIR + node + el hook por stdin.
  linea("\n3 · la cadena completa, como la invoca Claude Code");
  if (cfg && sh.status === 0) {
    const cmd = comandoDe(cfg, "protect_paths.mjs");
    const env = { ...process.env, CLAUDE_PROJECT_DIR: RAIZ.replace(/\\/g, "/") };
    const r = cmd ? spawnSync("bash", ["-c", cmd], { input: JSON.stringify({ tool_input: { file_path: "x.env" } }), encoding: "utf8", env }) : null;
    if (r && r.status === 2) linea(ok("$CLAUDE_PROJECT_DIR se expande y el hook bloquea el .env plantado"));
    else { fallos.push(`la cadena completa no bloqueó el .env plantado (salida ${r ? r.status : "sin comando"}): revisa que $CLAUDE_PROJECT_DIR se expanda en este shell`); linea(mal("el comando de settings.json no bloqueó el .env plantado")); }
  } else linea(mal("no se pudo probar: falla settings.json o el shell"));

  // 4 · cada hook con sus dos direcciones
  linea("\n4 · cada hook, bloqueando y dejando pasar");
  for (const s of SONDAS) {
    const r = spawnSync(process.execPath, [resolve(RAIZ, ".claude/hooks", s.archivo)], { input: JSON.stringify(s.entrada), encoding: "utf8", cwd: RAIZ });
    const bien = r.status === s.codigo && (!s.stdout || s.stdout.test(r.stdout || ""));
    if (bien) linea(ok(`${s.archivo}: ${s.que}`));
    else { fallos.push(`${s.archivo}: ${s.que} — se esperaba salida ${s.codigo} y dio ${r.status}`); linea(mal(`${s.archivo}: ${s.que} (salida ${r.status}, se esperaba ${s.codigo})`)); }
  }

  linea("");
  if (!fallos.length) linea("TODO OK: los hooks están cableados y corriendo en esta máquina.");
  else {
    linea(`${fallos.length} problema(s). Mientras alguno siga, los hooks NO están protegiendo lo que dicen proteger:`);
    fallos.forEach((f) => linea("  · " + f));
    linea("\nQué hacer: los hooks se cargan al ARRANCAR la sesión, así que un settings.json recién cambiado no está");
    linea("activo todavía — reinicia la sesión y vuelve a correr esto. Detalle: vault/conocimiento/loop_agentico_hooks.md");
  }
  return fallos;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exit(correr().length ? 1 : 0);
