/* ============================================================================================
   CORRE tests_asignacion_lineas.js CONTRA EL HTML CONSTRUIDO, SIN NAVEGADOR A MANO.

       node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_tests.mjs

   Alternativa de siempre: abrir pipeline_comercial.html en Chrome y pegar el test en la consola.

   DOS TRAMPAS, por si hay que tocar esto:
   - `nex-pipeline` renderiza en LIGHT DOM. No tiene `shadowRoot`, asi que esperar por
     `shadowRoot.childElementCount` se cuelga para siempre aunque la app este montada. La senal
     de montaje es el texto del login.
   - `page.waitForFunction(fn, arg, opciones)`: las opciones van TERCERAS. Pasarlas segundas las
     toma como argumento de la funcion y aplica el timeout por defecto de 30 s, que no alcanza:
     el HTML son 31 MB y Babel transpila las ~21.000 lineas en el navegador (~1 min aca).
   ============================================================================================ */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const html = join(aqui, "pipeline_comercial.html");
const test = join(aqui, "tests_asignacion_lineas.js");

// NODE_PATH no aplica a `import` de ESM, asi que playwright se resuelve a mano: primero el
// node_modules del proyecto y despues el global del contenedor (/opt/node22/...), que es donde
// esta instalado aca. PLAYWRIGHT_MODULE permite apuntar a otra ruta sin tocar el archivo.
const require = createRequire(import.meta.url);
const candidatos = [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean);
let chromium = null;
for (const c of candidatos) {
  try { ({ chromium } = require(c)); break; } catch { /* siguiente */ }
}
if (!chromium) {
  console.error("No encuentro playwright. Instalalo (npm i -D playwright) o exporta PLAYWRIGHT_MODULE=/ruta/a/playwright.");
  process.exit(2);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
const errores = [];
pagina.on("pageerror", (e) => errores.push(String(e).slice(0, 400)));

await pagina.goto("file://" + html, { waitUntil: "load", timeout: 300000 });
await pagina.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 300000 });

const salida = await pagina.evaluate(readFileSync(test, "utf8"));
const lineas = Array.isArray(salida) ? salida : [String(salida)];
for (const l of lineas) console.log(l);

const fallan = lineas.filter((l) => String(l).startsWith("FALLA")).length;
console.log(`\n${lineas.length - fallan}/${lineas.length} PASA`);
if (errores.length) console.log("ERRORES DE PAGINA:\n  " + errores.slice(0, 5).join("\n  "));

await navegador.close();
process.exit(fallan ? 1 : 0);
