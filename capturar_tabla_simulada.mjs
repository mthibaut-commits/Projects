/* Tubo diario en vista TABLA con UNA operación ya simulada.
   El tubo arranca todo en «Sin simular»: la simulación se hace en la PESTAÑA DEL DETALLE, que es
   otro documento, y vuelve al tubo por el mensaje `nex-simulado` (ver el emisor en simularOferta y
   el receptor en el onMsg del panel). Así que se arma la oferta en el detalle, se cierra esa
   pestaña y se captura el tubo, que ya recibió el patch.
   Reutiliza el serializador de capturar_pantallas.mjs, como capturar_variantes.mjs. */
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
const sello = new Date().toISOString().slice(0, 16).replace("T", " ");
const envolver = (titulo, cap) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<!-- CAPTURA AUTOMATICA de pipeline_comercial.html · rama main · commit ${commit} · ${sello}
     Generado por capturar_tabla_simulada.mjs. NO EDITAR A MANO: se regenera. -->
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

const cuentaSinSimular = (pag) => pag.evaluate(() => ((document.body.innerText || "").match(/Sin simular/g) || []).length);

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
console.log(`inbound pausado con ${ult} negocios · "Sin simular" x${await cuentaSinSimular(p)}`);

// Simular la primera fila DESDE SU PESTAÑA DE DETALLE; el tubo se entera por `nex-simulado`.
const antes = await cuentaSinSimular(p);
const [d] = await Promise.all([ctx.waitForEvent("page", { timeout: 60000 }), p.locator("tr.pl-row").first().click()]);
await d.waitForLoadState("load", { timeout: 300000 });
await d.waitForFunction(() => /Monto|Facturas|Oferta/.test(document.body.innerText || ""), null, { timeout: 300000 });
await d.waitForTimeout(2500);
const opcion = d.locator("button").filter({ hasText: /Todo lo disponible|Todas las Prime/ }).first();
if (!(await opcion.count())) { console.log("! no encontré la opción del modal de facturas"); process.exit(1); }
await opcion.click();
// Elegir la opción define la oferta y simula EN EL MISMO GESTO, pero tras una latencia simulada de
// hasta 6 s (CFG_ACTIVA.latenciaBaseMs + latenciaPorDocMs x documento). Cerrar antes mata el
// postMessage: la simulación —y con ella el aviso al tubo— todavía no ha ocurrido.
// OJO: innerText devuelve el texto RENDERIZADO y esa cabecera lleva `uppercase`, así que la
// búsqueda va sin distinguir mayúsculas o no calza nunca.
await d.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 })
  .catch(() => console.log("! no aparecieron las condiciones comerciales"));
await d.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
await d.waitForTimeout(3000);
console.log("oferta armada en el detalle: " + (await d.evaluate(() => ((document.body.innerText || "").match(/Se puede cursar[^\n]*/) || [])[0] || "(sin resumen)")));
await d.close();

// El patch viaja por postMessage: esperar a que el tubo lo aplique (una fila menos en «Sin simular»).
await p.bringToFront();
await p.waitForFunction((n) => ((document.body.innerText || "").match(/Sin simular/g) || []).length < n, antes, { timeout: 30000 })
  .catch(() => console.log("! el tubo no aplicó el patch dentro del timeout"));
await p.waitForTimeout(2500);
console.log(`tubo tras simular: "Sin simular" x${await cuentaSinSimular(p)} (antes x${antes})`);

// Al simularse la operación cambia de estado y SALE del filtro en que estaba. Se busca en qué
// pestaña quedó y se elige la más corta que la contenga: «Todos» son 65 filas y la card se pierde.
const tabs = await p.evaluate(() => [...document.querySelectorAll('button[title="Filtrar oportunidades"]')].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
let mejor = null;
for (const t of tabs) {
  const etq = t.replace(/\s*\d+\s*$/, "").trim();
  await p.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + etq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click().catch(() => {});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const fs = [...document.querySelectorAll("tr.pl-row")]; const sim = fs.filter((x) => !/Sin simular/.test(x.innerText || "")).length; return { filas: fs.length, sim }; });
  console.log(`  ${etq.padEnd(20)} filas=${r.filas} simuladas=${r.sim}`);
  if (r.sim > 0 && (!mejor || r.filas < mejor.filas)) mejor = { etq, ...r };
}
if (!mejor) { console.log("! ninguna pestaña muestra la operación simulada"); process.exit(1); }
console.log(`captura en «${mejor.etq}» (${mejor.filas} filas, ${mejor.sim} simulada(s))`);
await p.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + mejor.etq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
await p.waitForTimeout(2500);

const cap = await p.evaluate(EXPR);
if (cap.error) { console.log("! " + cap.error); process.exit(1); }
const nombre = "tubo-tabla-simulada";
writeFileSync(join(SALIDA, nombre + ".html"), envolver("NEX Factoring · Tubo diario (Tabla) — con una operación simulada", cap), "utf8");
await p.screenshot({ path: join(SALIDA, nombre + ".png"), fullPage: true });
console.log(`${nombre}  ${cap.podadas} reglas · ${cap.clases} clases · ${cap.alto}px`);
await nav.close();
