/* ============================================================================================
   REGENERA atribuciones_otorgamiento.json DESDE LA APP CONSTRUIDA, SIN NAVEGADOR A MANO.

       node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node regenerar_atribuciones.mjs

   Es el mismo JSON que descarga Configuración › Otorgamiento › Atribuciones de aprobación, pero
   sin depender de que alguien apriete el botón: el archivo del repo se desfasó del catálogo durante
   dos meses y nadie lo notó porque regenerarlo era un gesto manual.

   Mismas dos trampas que run_tests.mjs: `nex-pipeline` renderiza en LIGHT DOM (la señal de montaje
   es el texto del login, no `shadowRoot`) y las opciones de `waitForFunction` van TERCERAS.
   ============================================================================================ */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const html = join(aqui, "pipeline_comercial.html");
const destino = join(aqui, "atribuciones_otorgamiento.json");

const require = createRequire(import.meta.url);
const candidatos = [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean);
let chromium = null;
for (const c of candidatos) { try { ({ chromium } = require(c)); break; } catch { /* siguiente */ } }
if (!chromium) { console.error("No encuentro playwright. Instalalo (npm i -D playwright) o exporta PLAYWRIGHT_MODULE=/ruta/a/playwright."); process.exit(2); }

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.goto("file://" + html, { waitUntil: "load", timeout: 300000 });
await pagina.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 300000 });

const json = await pagina.evaluate(() => JSON.stringify(buildAtribucionesJSON(), null, 2));
writeFileSync(destino, json + "\n", "utf8");

const o = JSON.parse(json);
const tramos = o.criterios.reduce((a, c) => a + (c.tramos || []).filter((t) => t.disposicion === "excepcion").length, 0);
const huerfanos = o.criterios.flatMap((c) => (c.tramos || []).filter((t) => t.disposicion === "excepcion" && (!t.aprobadores || !t.aprobadores.length)).map((t) => c.n + " N" + t.nivel_requerido));
console.log(`${o.total_criterios} criterios · ${tramos} tramos de excepción · generado ${o.generado}`);
console.log(huerfanos.length ? `SIN APROBADOR: ${huerfanos.join(", ")}` : "todos los tramos tienen aprobador");

await navegador.close();
