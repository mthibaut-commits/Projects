/* Variantes del DETALLE DE LA OPERACION, capturadas del DOM real igual que capturar_pantallas.mjs.
   Reutiliza SU serializador (se extrae del archivo) para no tener dos definiciones que se desfasen. */
import { createRequire } from "module";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(aqui, "Variantes_UI");
const ANCHO = 1600, ALTO = 1200;
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const fuente = readFileSync(join(aqui, "capturar_pantallas.mjs"), "utf8");
const SER = fuente.slice(fuente.indexOf("const serializar = () => {"), fuente.indexOf("const envolver =")).trim().replace(/;$/, "");
const EXPR = `(() => { ${SER}; return serializar(); })()`;

const commit = execSync("git rev-parse --short HEAD", { cwd: aqui }).toString().trim();
const rama = "main";
const sello = new Date().toISOString().slice(0, 16).replace("T", " ");
const envolver = (titulo, cap) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<!-- CAPTURA AUTOMATICA de pipeline_comercial.html · rama ${rama} · commit ${commit} · ${sello}
     Variante del detalle generada por capturar_variantes.mjs. NO EDITAR A MANO: se regenera. -->
<style>
${cap.css}
</style>
<style>
  html, body { margin: 0; padding: 0; background: #FFFFFF; }
  body { width: ${ANCHO}px; }
</style>
</head>
<body>
${cap.html}
</body>
</html>
`;

mkdirSync(SALIDA, { recursive: true });
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto("file://" + join(aqui, "pipeline_comercial.html"), { waitUntil: "load", timeout: 300000 });
await p.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 300000 });
await p.getByRole("button", { name: "Ingresar", exact: true }).click();
await p.waitForFunction(() => /el código enviado es/.test(document.body.innerText || ""), null, { timeout: 60000 });
const cod = await p.evaluate(() => (document.body.innerText.match(/el código enviado es\s*(\d{4,8})/) || [])[1] || "");
const cas = p.locator('input[aria-label^="Dígito"]');
for (let i = 0; i < cod.length; i++) await cas.nth(i).fill(cod[i]);
await p.getByRole("button", { name: "Verificar y entrar" }).click();
await p.waitForFunction(() => /Tubo diario/.test(document.body.innerText || ""), null, { timeout: 60000 });
await p.locator("header nav button", { hasText: /^Tubo diario$/ }).first().click();
await p.waitForTimeout(1200);
await p.locator('button[title*="iniciar la simulación"]').first().click();
const t0 = Date.now(); let ult = 0;
while (Date.now() - t0 < 180000) {
  await p.waitForTimeout(3000);
  const n = await p.evaluate(() => { const m = (document.body.innerText || "").match(/(\d+)\s+de\s+(\d+)\s+negocios/); return m ? +m[2] : 0; });
  if (n !== ult) ult = n;
  if (n >= 20) break;
}
await p.locator('button[title*="pausar la simulación"]').first().click();
await p.waitForTimeout(1500);
console.log(`inbound pausado con ${ult} negocios`);

const [d] = await Promise.all([ctx.waitForEvent("page", { timeout: 60000 }), p.locator("tr.pl-row").first().click()]);
await d.waitForLoadState("load", { timeout: 300000 });
await d.waitForFunction(() => /Monto|Facturas|Oferta/.test(document.body.innerText || ""), null, { timeout: 300000 });
await d.waitForTimeout(2500);

let n = 0;
const guardar = async (slug, titulo) => {
  n++;
  const cap = await d.evaluate(EXPR);
  if (cap.error) { console.log(`  ! ${slug}: ${cap.error}`); return; }
  const nombre = "detalle-" + String(n).padStart(2, "0") + "-" + slug;
  writeFileSync(join(SALIDA, nombre + ".html"), envolver(titulo, cap), "utf8");
  await d.screenshot({ path: join(SALIDA, nombre + ".png"), fullPage: true });
  console.log(`  ${nombre}  ${cap.podadas} reglas · ${cap.clases} clases · ${cap.alto}px`);
};
const clic = async (loc, etq, espera = 2500) => {
  const l = typeof loc === "string" ? d.locator("button").filter({ hasText: new RegExp(loc) }).first() : loc;
  if (!(await l.count())) { console.log(`  ! no encontre: ${etq}`); return false; }
  await l.click().catch((e) => console.log(`  ! clic falló en ${etq}: ${e.message.slice(0, 60)}`));
  await d.waitForTimeout(espera);
  return true;
};

// 1 · oferta vacía, con el modal de selección de facturas
await guardar("oferta-vacia", "NEX Factoring · Detalle — oferta vacía");

// 2 · oferta armada y simulada
await clic("Todo lo disponible|Todas las Prime", "opción del modal", 3500);
await guardar("oferta-armada", "NEX Factoring · Detalle — oferta armada y simulada");

// 3 · acordeones de deudores abiertos
const cabs = d.locator("button").filter({ hasText: /Nota \d[.,]\d/ });
const cuantos = await cabs.count();
for (let i = 0; i < Math.min(cuantos, 4); i++) await cabs.nth(i).click().catch(() => {});
await d.waitForTimeout(2000);
console.log(`  (${cuantos} cabeceras de deudor)`);
await guardar("deudores-abiertos", "NEX Factoring · Detalle — deudores desplegados");

// colapsar de nuevo: cada variante debe aislar SU estado, no arrastrar el anterior
for (let i = 0; i < Math.min(cuantos, 4); i++) await cabs.nth(i).click().catch(() => {});
await d.waitForTimeout(1500);

// 4 · cambio de condiciones comerciales
await clic("^\\s*Modificar\\s*$", "Modificar condiciones");
await guardar("condiciones", "NEX Factoring · Detalle — cambio de condiciones");

// cerrar el panel lateral de condiciones antes de seguir (bloquea los clics)
const cerrar = d.locator('[title="Cerrar"]').last();
if (await cerrar.count()) await cerrar.click().catch(() => {});
else await d.keyboard.press("Escape");
await d.waitForTimeout(1500);

// 5 · pre-evaluación: abre un ConfirmDialog con las excepciones sin comentario
await clic("Pre-evaluación", "Pre-evaluación", 3000);
await guardar("pre-evaluacion-aviso", "NEX Factoring · Detalle — aviso de excepciones sin comentario");

// 6 · confirmada: habilita el tab Verificación (mostrarVerif)
await clic("Enviar de todos modos", "confirmar pre-evaluación", 4000);
await guardar("pre-evaluada", "NEX Factoring · Detalle — pre-evaluada");

// 7 · tab Otorgamiento
await clic("^\\s*Otorgamiento", "tab Otorgamiento", 3000);
await guardar("otorgamiento", "NEX Factoring · Detalle — tab Otorgamiento");

// 8 · tab Verificación
await clic("^\\s*Verificación", "tab Verificación", 3000);
await guardar("verificacion", "NEX Factoring · Detalle — tab Verificación");

// 9 · cerrar oferta y publicar
await clic("^\\s*Negocio\\s*$", "volver a Negocio", 2000);
await clic("Cerrar oferta", "Cerrar oferta y publicar", 3000);
await guardar("cerrar-oferta", "NEX Factoring · Detalle — cerrar oferta y publicar");

console.log("\nlisto en " + SALIDA);
await nav.close();
