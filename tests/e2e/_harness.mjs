/* Harness e2e: abre la app construida en Chromium real, inicia sesión como lo hace capturar_pantallas.mjs
   (usuario y clave precargados; el OTP se lee de la pantalla), y da las maniobras que las reglas de UI
   necesitan: ir a una vista, encender el Modo Directorio (cinco operaciones reales sin esperar al stream)
   y abrir el detalle, que es PESTAÑA PROPIA (ticket en la URL) y no un drawer. No es un test: los casos
   viven en *.e2e.mjs y los corre correr.mjs. */
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const HTML = join(RAIZ, "pipeline_comercial.html");

export function cargarChromium() {
  const require = createRequire(import.meta.url);
  for (const c of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
    try { return require(c).chromium; } catch { /* siguiente */ }
  }
  throw new Error("No encuentro playwright. Instálalo (npm i -D playwright) o exporta PLAYWRIGHT_MODULE=/ruta/a/playwright.");
}

export const texto = (pagina) => pagina.evaluate(() => document.body.innerText || "");

/* Abre la app y deja la sesión iniciada en «Gestión diaria». Devuelve lo necesario para cerrar. */
export async function abrirApp({ headless = true } = {}) {
  const navegador = await cargarChromium().launch({ headless });
  const ctx = await navegador.newContext({ viewport: { width: 1600, height: 1000 } });
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(String(e).slice(0, 300)));
  await pagina.goto("file://" + HTML, { waitUntil: "load", timeout: 300000 });
  await pagina.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 300000 });
  await pagina.getByRole("button", { name: "Ingresar", exact: true }).click();
  await pagina.waitForFunction(() => /el código enviado es/.test(document.body.innerText || ""), null, { timeout: 60000 });
  const codigo = await pagina.evaluate(() => (document.body.innerText.match(/el código enviado es\s*(\d{4,8})/) || [])[1] || "");
  if (!/^\d+$/.test(codigo)) throw new Error("no pude leer el código 2FA de la pantalla");
  const casillas = pagina.locator('input[aria-label^="Dígito"]');
  for (let i = 0; i < codigo.length; i++) await casillas.nth(i).fill(codigo[i]);
  await pagina.getByRole("button", { name: "Verificar y entrar" }).click();
  await pagina.waitForFunction(() => /Gestión diaria/.test(document.body.innerText || ""), null, { timeout: 60000 });
  return { navegador, ctx, pagina, errores, cerrar: () => navegador.close() };
}

/* Clic en una vista de la navbar por su rótulo exacto. */
export async function irA(pagina, etiqueta) {
  await pagina.locator("header nav button", { hasText: new RegExp("^" + etiqueta + "$") }).first().click();
  await pagina.waitForTimeout(800);
}

/* El toggle «Directorio» de la barra del tubo: apagado dice «Directorio», encendido «Directorio · N». */
const toggleDirectorio = (pagina) => pagina.locator("button", { hasText: /^\s*Directorio(\s*·\s*\d+)?\s*$/ }).first();
export async function directorioEncendido(pagina) {
  const t = toggleDirectorio(pagina);
  if (!(await t.count())) return false;
  return /·\s*\d+/.test((await t.innerText()) || "");
}

/* Enciende el Modo Directorio en el tubo: cinco operaciones con facturas reales, sin arrancar el stream.
   Idempotente: si ya está encendido, no lo toca. */
export async function encenderDirectorio(pagina) {
  await irA(pagina, "Gestión diaria");
  const toggle = toggleDirectorio(pagina);
  if (!(await toggle.count())) throw new Error("no encuentro el toggle «Directorio» en la barra del tubo");
  if (!(await directorioEncendido(pagina))) await toggle.click();
  await pagina.waitForFunction(() => document.querySelectorAll("tr.pl-row").length > 0, null, { timeout: 60000 });
  await pagina.waitForTimeout(500);
}

/* Apaga el Modo Directorio si está encendido (las cinco operaciones se retiran del tubo). */
export async function apagarDirectorio(pagina) {
  await irA(pagina, "Gestión diaria");
  if (!(await directorioEncendido(pagina))) return;
  await toggleDirectorio(pagina).click();
  await pagina.waitForFunction(() => !/Directorio\s*·\s*\d+/.test(document.body.innerText || ""), null, { timeout: 60000 });
  await pagina.waitForTimeout(300);
}

/* Estado conocido para empezar un archivo de casos: sin modal abierto, en «Gestión diaria», el filtro rápido
   en «Con línea» y Directorio apagado. Ese filtro es la LÍNEA BASE de esta capa, no el arranque de la app
   —desde la regla 34 el tubo abre en «Todos»—: los casos abren las filas 0–2 de «Con línea», que con el
   Directorio encendido son 3 de sus 5. Por eso se fija acá y no se hereda. No recarga la página: lo que un
   caso persistió (auditoría, repos) queda. */
export async function reiniciar(pagina) {
  await pagina.keyboard.press("Escape").catch(() => {});
  await irA(pagina, "Gestión diaria");
  const conLinea = pagina.locator('button[title="Filtrar oportunidades"]', { hasText: /^\s*Con línea/ }).first();
  if (await conLinea.count()) await conLinea.click().catch(() => {});
  await apagarDirectorio(pagina);
}

/* Abre el detalle de la fila n (0 = primera) del tubo en Tabla: llega como PESTAÑA nueva del contexto. */
export async function abrirDetalle(ctx, pagina, n = 0) {
  const fila = pagina.locator("tr.pl-row").nth(n);
  if (!(await fila.count())) throw new Error(`no hay fila ${n} en el tubo (¿Directorio encendido? ¿vista Tabla?)`);
  const [detalle] = await Promise.all([ctx.waitForEvent("page", { timeout: 60000 }), fila.click()]);
  await detalle.waitForLoadState("load", { timeout: 300000 });
  await detalle.waitForFunction(() => /DETALLE DE OPORTUNIDAD/i.test(document.body.innerText || ""), null, { timeout: 300000 });
  await detalle.waitForTimeout(800);
  detalle.on("pageerror", (e) => (detalle._erroresE2E = detalle._erroresE2E || []).push(String(e).slice(0, 300)));
  return detalle;
}
