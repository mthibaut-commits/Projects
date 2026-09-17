/* Corre los casos e2e (`tests/e2e/*.e2e.mjs`) con UNA sesión iniciada, en orden, y sale con 1 si alguno
   falla o si alguna pestaña reportó un error de página. Cada archivo exporta `casos`: [{ id, titulo,
   correr: async (h) => detalle }], donde h = { pagina, ctx, abrirDetalle, encenderDirectorio, irA, texto }.
   Un caso que lanza es FALLA con el mensaje. Salida con la forma de la suite: «PASA  id título · det».
     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/e2e/correr.mjs [archivo.e2e.mjs …]   (sin args: todos) */
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { abrirApp, irA, encenderDirectorio, abrirDetalle, texto } from "./_harness.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const archivos = process.argv.slice(2).length ? process.argv.slice(2).map((a) => resolve(a))
  : readdirSync(aqui).filter((f) => f.endsWith(".e2e.mjs")).sort().map((f) => join(aqui, f));
const casos = [];
for (const a of archivos) { const m = await import(pathToFileURL(a).href); for (const c of m.casos || []) casos.push({ ...c, archivo: a }); }
if (!casos.length) { console.error("no hay casos e2e"); process.exit(2); }

const app = await abrirApp();
const h = { pagina: app.pagina, ctx: app.ctx, abrirDetalle: (n) => abrirDetalle(app.ctx, app.pagina, n), encenderDirectorio: () => encenderDirectorio(app.pagina), irA: (e) => irA(app.pagina, e), texto };
const out = [];
for (const c of casos) {
  let linea;
  try { const det = await c.correr(h); linea = `PASA  ${c.id} ${c.titulo}` + (det ? `  · ${det}` : ""); }
  catch (e) { linea = `FALLA ${c.id} ${c.titulo}  · ${String(e && e.message || e).slice(0, 300)}`; }
  console.log(linea); out.push(linea);
  for (const p of app.ctx.pages()) if (p !== app.pagina) { if (p._erroresE2E?.length) app.errores.push(...p._erroresE2E); await p.close().catch(() => {}); }
}
const fallan = out.filter((l) => l.startsWith("FALLA")).length;
console.log(`\n${out.length - fallan}/${out.length} PASA`);
if (app.errores.length) console.log("ERRORES DE PAGINA:\n  " + app.errores.slice(0, 5).join("\n  "));
await app.cerrar();
process.exit(fallan || app.errores.length ? 1 : 0);
