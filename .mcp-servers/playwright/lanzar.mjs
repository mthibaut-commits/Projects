#!/usr/bin/env node
/* Lanza @playwright/mcp con los flags que cada máquina necesita, porque NO son los mismos.
 *
 * En Windows —el flujo real del usuario— el servidor encuentra Chrome solo y no hay nada que hacer.
 * En un contenedor de sesión web falla dos veces seguidas, y las dos son invisibles hasta que se USA
 * una herramienta: el servidor arranca, responde `initialize` y expone sus 25 herramientas igual
 * (22-09-2026, medido):
 *   1 · Busca Chrome en /opt/google/chrome/chrome, que no existe: el contenedor trae el Chromium de
 *       Playwright en /opt/pw-browsers. Y `--browser chromium` tampoco sirve, porque @playwright/mcp
 *       trae un Playwright más nuevo y pide la revisión 1246 cuando la instalada es la 1194.
 *   2 · Con el binario correcto, Chromium se niega igual: «Running as root without --no-sandbox is
 *       not supported» (crbug.com/638180). El contenedor corre como root.
 *
 * Por eso los flags no pueden ir fijos en `.mcp.json`, que se commitea y viaja a Windows: la ruta de
 * Linux lo rompería allá. Se deciden acá, mirando si el binario existe.
 *
 * chrome-devtools-mcp tiene el MISMO problema y NO se puede arreglar así: no expone `--no-sandbox`.
 * Su escape es `--browserUrl` contra un Chrome ya corriendo. Anda bien en Windows; en sesión web, no.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const CHROMIUM_CONTENEDOR = "/opt/pw-browsers/chromium";

/* La decisión, como función pura para poder probarla sin lanzar un navegador
   (convención de `.claude/rules/testing.md`: la lógica se exporta y recibe sus datos). */
export function argumentos(hayChromiumDeContenedor) {
  const args = ["-y", "@playwright/mcp@latest", "--isolated"];
  if (hayChromiumDeContenedor) args.push("--no-sandbox", "--executable-path", CHROMIUM_CONTENEDOR);
  return args;
}

function main() {
  const enContenedor = existsSync(CHROMIUM_CONTENEDOR);
  if (enContenedor) process.stderr.write(`[playwright-mcp] contenedor: ${CHROMIUM_CONTENEDOR}, sin sandbox\n`);
  /* stdio heredado: stdin/stdout son el canal MCP y no se tocan. En Windows `npx` es `npx.cmd`. */
  const hijo = spawn("npx", argumentos(enContenedor), { stdio: "inherit", shell: process.platform === "win32" });
  hijo.on("exit", (codigo, senal) => process.exit(senal ? 1 : codigo ?? 0));
  for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => hijo.kill(s));
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
