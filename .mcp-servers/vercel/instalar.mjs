#!/usr/bin/env node
/* Deja usable el servidor MCP de Vercel de Quegenx, que NO compila ni corre tal como está
   publicado. Clona el upstream en `upstream/` (ignorado por git), le aplica el parche y
   construye. Es idempotente: se puede volver a correr para actualizar.

   Qué arregla, medido sobre el HEAD del 24-02-2025 (commit ef8c6f2):
     · 18 × TS2307 — el repo no incluye `src/config/`, así que el `constants.ts` que su
       propio README manda a editar no existe y los 21 componentes lo importan.
     ·  7 × TS2554 — `z.record(x)` de UN argumento: firma de Zod 3. Con `"zod": "latest"`
       npm baja Zod 4, donde `z.record` exige clave Y valor.
     ·  5 × TS2591 — `process` sin declarar: `"typescript": "latest"` baja TS 7, que ya no
       toma `@types/node` por resolución implícita con este tsconfig.
   Los últimos dos se arreglan FIJANDO las versiones, sin tocar el código del autor: el
   `package.json` del upstream pide "latest" en las cuatro deps, así que el build se rompe
   solo con el paso del tiempo.

   Uso:  node .mcp-servers/vercel/instalar.mjs
*/
import { spawnSync } from "node:child_process";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const UPSTREAM = join(AQUI, "upstream");
const REPO = "https://github.com/Quegenx/vercel-mcp-server.git";

/* Versiones contemporáneas al repo (02-2025). "latest" es lo que lo rompió. */
const FIJADAS = {
  dependencies: { "@modelcontextprotocol/sdk": "^1.30.0", zod: "^3.24.1" },
  devDependencies: { typescript: "^5.7.3", "@types/node": "^22.13.0" },
};

const win = process.platform === "win32";
function correr(cmd, args, cwd, etiqueta) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win });
  if (r.status !== 0) {
    console.error(`\n✗ falló: ${etiqueta} (${cmd} ${args.join(" ")})`);
    process.exit(1);
  }
}

// 1 · Clonar o actualizar el upstream.
if (existsSync(join(UPSTREAM, ".git"))) {
  console.log("· upstream ya clonado, actualizando");
  correr("git", ["fetch", "--depth", "1", "origin"], UPSTREAM, "git fetch");
  correr("git", ["reset", "--hard", "origin/HEAD"], UPSTREAM, "git reset");
} else {
  console.log("· clonando upstream");
  rmSync(UPSTREAM, { recursive: true, force: true });
  correr("git", ["clone", "--depth", "1", REPO, UPSTREAM], AQUI, "git clone");
}

// 2 · El archivo que falta.
const destino = join(UPSTREAM, "src", "config", "constants.ts");
spawnSync(process.execPath, ["-e", `require('fs').mkdirSync(${JSON.stringify(dirname(destino))},{recursive:true})`]);
copyFileSync(join(AQUI, "constants.ts"), destino);
console.log("· src/config/constants.ts puesto (token desde VERCEL_ACCESS_TOKEN)");

// 3 · index.ts duplicaba las dos constantes, con el token hardcodeado. Que reexporte.
const idx = join(UPSTREAM, "src", "index.ts");
let fuente = readFileSync(idx, "utf8");
const duplicado =
  /export const BASE_URL = "https:\/\/api\.vercel\.com";\s*\r?\nexport const DEFAULT_ACCESS_TOKEN = "[^"]*";[^\n]*\r?\n/;
if (duplicado.test(fuente)) {
  fuente = fuente.replace(duplicado, 'export { BASE_URL, DEFAULT_ACCESS_TOKEN } from "./config/constants.js";\n');
  writeFileSync(idx, fuente);
  console.log("· src/index.ts: token hardcodeado reemplazado por un reexport");
} else if (fuente.includes('from "./config/constants.js"')) {
  console.log("· src/index.ts ya parchado");
} else {
  console.error("✗ src/index.ts cambió upstream: revisa el parche a mano antes de seguir");
  process.exit(1);
}

// 3-bis · tool-manager.ts logueaba en STDOUT, que en stdio-MCP transporta SÓLO el protocolo:
//         cada "Loaded tool group: …" es una línea que el cliente intenta parsear como JSON-RPC.
const tm = join(UPSTREAM, "src", "tool-manager.ts");
let gestor = readFileSync(tm, "utf8");
const ruido = (gestor.match(/console\.log\(/g) || []).length;
if (ruido) {
  writeFileSync(tm, gestor.replace(/console\.log\(/g, "console.error("));
  console.log(`· src/tool-manager.ts: ${ruido} console.log movidos a stderr (stdout es del protocolo)`);
}

// 4 · Fijar las versiones que el upstream dejó en "latest".
const pkgRuta = join(UPSTREAM, "package.json");
const pkg = JSON.parse(readFileSync(pkgRuta, "utf8"));
for (const [bloque, deps] of Object.entries(FIJADAS)) Object.assign((pkg[bloque] ??= {}), deps);
writeFileSync(pkgRuta, JSON.stringify(pkg, null, 2) + "\n");
console.log("· package.json: versiones fijadas (zod 3, TypeScript 5, @types/node 22)");

// 5 · Instalar y construir.
correr("npm", ["install", "--no-audit", "--no-fund"], UPSTREAM, "npm install");
correr("npm", ["run", "build"], UPSTREAM, "npm run build");

// 6 · Prueba de humo: que hable MCP de verdad, no que exista el dist.
const salida = join(UPSTREAM, "dist", "index.js");
if (!existsSync(salida)) {
  console.error("✗ no se generó dist/index.js");
  process.exit(1);
}
const hijo = spawn(process.execPath, [salida], { stdio: ["pipe", "pipe", "pipe"] });
let stdout = "";
let stderr = "";
hijo.stdout.on("data", (d) => (stdout += d));
hijo.stderr.on("data", (d) => (stderr += d));
hijo.stdin.write(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "instalar", version: "1" } },
  }) + "\n"
);
const veredicto = await new Promise((res) => {
  const t = setTimeout(() => res("timeout"), 30_000);
  const mirar = () => {
    if (stdout.includes('"serverInfo"')) { clearTimeout(t); res("ok"); }
    if (/ERR_MODULE_NOT_FOUND|Failed to load tool group/.test(stderr)) { clearTimeout(t); res("carga"); }
  };
  hijo.stdout.on("data", mirar);
  hijo.stderr.on("data", mirar);
  hijo.on("exit", () => { clearTimeout(t); res(stdout.includes('"serverInfo"') ? "ok" : "murio"); });
});
hijo.kill();

if (veredicto !== "ok") {
  console.error(`\n✗ el servidor no respondió al initialize (${veredicto}).\n${stderr.slice(0, 800)}`);
  process.exit(1);
}
const nombre = JSON.parse(stdout.split("\n").find((l) => l.includes('"serverInfo"'))).result.serverInfo.name;
console.log(`\n✓ listo: responde initialize como "${nombre}" → ${salida}`);
if (!process.env.VERCEL_ACCESS_TOKEN) console.log("  (falta VERCEL_ACCESS_TOKEN: levanta igual, pero las herramientas darán 403)");
