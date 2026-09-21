/* Los hooks son deterministas y no negocian; por eso su lógica vive en funciones exportadas y se prueba
   acá, sin depender del harness. Y una vez de punta a punta por stdin, que es como los invoca Claude Code:
   exit 2 = bloquear, exit 0 = seguir, y el guard de worktrees responde con un JSON de «ask». */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { RAIZ } from "./_comun.mjs";
import { decidir as proteger, PROTEGIDAS } from "../../.claude/hooks/protect_paths.mjs";
import { decidir as gitflow, INTEGRACION } from "../../.claude/hooks/gitflow_guard.mjs";
import { DECISION } from "../../.claude/hooks/worktree_guard.mjs";
import { revisarSettings, comandoDe, ESPERADOS } from "../../verificar_hooks.mjs";

const HOOK = (n) => join(RAIZ, ".claude/hooks", n);
const stdin = (script, input) => spawnSync(process.execPath, [script], { cwd: RAIZ, input, encoding: "utf8" });

test("protect_paths bloquea lo protegido y deja pasar el trabajo normal", () => {
  const bloquea = (p, existe) => proteger(p, existe ?? (() => true)).bloquear;
  for (const p of [".env", "/repo/.env.local", "vendor/react.js", "/x/vendor/SBOM.json", "C:\\repo\\vendor\\xlsx.js", "datos_inyectados.js",
    "proveedores_clientes.json", "atribuciones_otorgamiento.json", "Capturas_UI/01-dashboard.html", "Variantes_UI/tubo-tabla-simulada.html",
    "Integraciones/Integraciones_APIs_y_S3.md", "Specs_Procesos/Otorgamiento/spec-otorgamiento.pdf", "pipeline_comercial.html", "Legado/README.md",
    "package-lock.json", "babel.min.js.descarga", "saved_resource", "fuentes/Geist-latin.woff2", "vault/adr/ADR-0001-partir-claude-md-y-abrir-el-vault.md"])
    assert.ok(bloquea(p), `debería bloquear ${p}`);
  for (const p of ["pipeline_comercial.jsx", "CLAUDE.md", "README.md", "vault/conocimiento/reglas/lineas_y_solicitud_comite.md", "vault/sesiones/estado_actual.md",
    "Specs_Procesos/Otorgamiento/spec-otorgamiento.md", "Integraciones/spec_aecsync.md", "Capturas_UI/README.md", "GeneradorDatos/generar.js", "build_app.ps1",
    "tests/contract/nuevo.test.mjs", ".claude/hooks/protect_paths.mjs", ""])
    assert.ok(!bloquea(p), `no debería bloquear ${p}`);
  assert.ok(!bloquea("vault/adr/ADR-0009-nuevo.md", () => false), "crear un ADR nuevo se permite");
  assert.ok(bloquea("vault/adr/ADR-0009-nuevo.md", () => true), "editar un ADR existente se bloquea");
  assert.ok(PROTEGIDAS.every((r) => r.motivo.length > 20), "cada regla trae su motivo");
});

test("gitflow_guard (preset A: integración = main) bloquea las tres formas y deja pasar el resto", () => {
  assert.deepEqual(INTEGRACION, ["main"]);
  const b = (c, rama) => gitflow(c, rama).bloquear;
  assert.ok(b("git push origin feature/x:main", "feature/x"), "refspec cruzado a main");
  assert.ok(b("git push -f origin HEAD:main", "feature/x"), "refspec cruzado con flags");
  assert.ok(!b("git push origin main:main", "main"), "main:main no es cruzado");
  assert.ok(!b("git push -u origin claude/x", "claude/x"), "push de la propia rama");
  assert.ok(!b("git push origin :main", "feature/x"), "borrar por refspec vacío no es integrar");
  assert.ok(!b("git push origin --delete feature/x:main", "feature/x"), "--delete pasa");
  assert.ok(b("git commit -m x", "main"), "commit directo sobre main");
  assert.ok(!b("git commit -m x", "feature/x"), "commit en una feature");
  assert.ok(!b("GITFLOW_ALLOW=1 git commit -m 'typo'", "main"), "escape T3 consciente");
  assert.ok(b("git merge feature/x", "main"), "merge sin --no-ff en main");
  assert.ok(!b("git merge --no-ff feature/x", "main"), "merge --no-ff en main");
  assert.ok(!b("git merge feature/x", "develop"), "develop no es de integración en el preset A");
  assert.ok(!b("ls -la && echo git", "main"), "un comando que no es git pasa");
  assert.ok(!b("", "main"), "vacío pasa");
  assert.ok(gitflow("git commit -m x", "main").motivo.includes("GITFLOW_ALLOW=1"), "el motivo enseña el escape");
});

test("worktree_guard responde «ask»: el diálogo es la prueba de que el worktree se discutió", () => {
  assert.equal(DECISION.hookSpecificOutput.permissionDecision, "ask");
  assert.equal(DECISION.hookSpecificOutput.hookEventName, "PreToolUse");
});

test("de punta a punta por stdin, como los invoca Claude Code", () => {
  const env = stdin(HOOK("protect_paths.mjs"), JSON.stringify({ tool_input: { file_path: "x.env" } }));
  assert.equal(env.status, 2); assert.match(env.stderr, /BLOQUEADO \(protect_paths\)/);
  assert.equal(stdin(HOOK("protect_paths.mjs"), JSON.stringify({ tool_input: { file_path: "README.md" } })).status, 0);
  assert.equal(stdin(HOOK("protect_paths.mjs"), "esto no es json").status, 0, "un input ilegible no bloquea el trabajo");
  const push = stdin(HOOK("gitflow_guard.mjs"), JSON.stringify({ tool_input: { command: "git push origin feature/x:main" } }));
  assert.equal(push.status, 2); assert.match(push.stderr, /BLOQUEADO \(gitflow\)/);
  assert.equal(stdin(HOOK("gitflow_guard.mjs"), JSON.stringify({ tool_input: { command: "git status" } })).status, 0);
  const wt = stdin(HOOK("worktree_guard.mjs"), "{}");
  assert.equal(wt.status, 0); assert.equal(JSON.parse(wt.stdout).hookSpecificOutput.permissionDecision, "ask");
});

/* El health check es lo único que puede decir si los hooks están CORRIENDO en una máquina concreta —la
   lógica correcta y el cableado roto se ven igual—. Acá se corre entero en cada CI para que no se pueda
   desfasar de settings.json: si alguien mueve un hook, le cambia el matcher o le cambia el comando, esto
   rompe antes de que nadie lo descubra bloqueando nada. Lo que NO puede atestiguar es la máquina Windows
   del usuario: ahí el mismo comando se corre a mano la primera vez. */
test("el health check de los hooks pasa entero (node verificar_hooks.mjs)", () => {
  const r = spawnSync(process.execPath, [join(RAIZ, "verificar_hooks.mjs")], { cwd: RAIZ, encoding: "utf8" });
  assert.equal(r.status, 0, `el health check falló:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /TODO OK/);
});

test("sonda negativa del health check: un settings.json roto se caza en sus cuatro formas", () => {
  const bueno = { hooks: { PreToolUse: ESPERADOS.map((e) => ({ matcher: e.matcher, hooks: [{ type: "command", command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${e.archivo}"` }] })) } };
  assert.deepEqual(revisarSettings(bueno, () => true), [], "el cableado bueno no tiene que dar fallos");
  assert.match(revisarSettings({}, () => true)[0], /no declara hooks\.PreToolUse/);
  const sinBloque = { hooks: { PreToolUse: bueno.hooks.PreToolUse.slice(1) } };
  assert.match(revisarSettings(sinBloque, () => true).join(" "), /falta el bloque con matcher/, "un hook sin su bloque no se dispara nunca");
  const matcherMalo = JSON.parse(JSON.stringify(bueno)); matcherMalo.hooks.PreToolUse[0].matcher = "Bash";
  assert.ok(revisarSettings(matcherMalo, () => true).length, "un hook colgado del evento equivocado tiene que caer");
  assert.match(revisarSettings(bueno, () => false).join(" "), /y el archivo no existe/, "un comando que apunta a un archivo movido tiene que caer");
  assert.ok(comandoDe(bueno, "protect_paths.mjs").includes("CLAUDE_PROJECT_DIR"), "el comando se extrae para probar la expansión en el shell");
  assert.equal(comandoDe(bueno, "no_existe.mjs"), null);
});

test("sonda negativa: una ruta nueva no protegida pasa y una regla plantada la bloquearía", () => {
  assert.ok(!proteger("docs/nuevo.md").bloquear);
  PROTEGIDAS.push({ re: /(^|\/)docs\//, motivo: "plantada para la sonda" });
  try { assert.ok(proteger("docs/nuevo.md").bloquear, "la regla plantada tiene que bloquear"); }
  finally { PROTEGIDAS.pop(); }
  assert.ok(!proteger("docs/nuevo.md").bloquear, "y al retirarla vuelve a pasar");
});
