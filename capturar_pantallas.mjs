/* ============================================================================================
   CAPTURA LAS PANTALLAS REALES DE LA APP A HTML, PARA EXPORTAR A FIGMA DESDE ESTE MAIN.

       node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_pantallas.mjs

   POR QUE EXISTE: los HTML de `Figma_Export/` estan ESCRITOS A MANO. Se desfasan del codigo en
   cuanto alguien toca la UI y no hay forma de saber de que version salieron — por eso llegaron a
   dibujar el detalle como drawer sobre overlay dos semanas despues de que dejara de serlo. Esto
   captura el DOM que el navegador de verdad pinta sobre un build de ESTA rama, con el CSS que de
   verdad le aplica, y estampa commit y fecha en cada archivo. Se REGENERA; no se edita a mano.

   COMO CONSERVA LA FIDELIDAD: en vez de reescribir los estilos a mano, se lleva el CSS real de la
   pagina y se poda a las clases que esa pantalla usa (Tailwind entero son 390 KB y sobra casi
   todo). Los `style` inline del componente ya viajan en el DOM, y el logo ya es un data URI.

   SALIDA: `Capturas_UI/NN-vista.html` (listo para html.to.design) + su PNG de referencia.

   Las dos trampas de Playwright con esta app estan explicadas en `run_tests.mjs`: `nex-pipeline`
   renderiza en LIGHT DOM y las opciones de `waitForFunction` van terceras. Aca se suman dos mas:
   - **El tubo arranca VACIO.** En modo demo las oportunidades las genera el stream del inbound, que
     no corre hasta apretar «Start» (ver `iniciadoRef`). Capturar recien entrado deja las nueve
     pantallas en cero — «0 de 0 negocios», $0M en todos los KPI— y ninguna sirve de referencia.
     Por eso se arranca, se espera a que se pueble y se PAUSA: con el stream corriendo las cifras
     cambian entre el screenshot y la serializacion, y el PNG no calza con el HTML.
   - **El detalle se abre en PESTANA NUEVA** (ticket opaco en la URL), asi que hay que esperar el
     evento `page` del contexto; capturar la pagina original devuelve el tubo por segunda vez.
   ============================================================================================ */
import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const HTML = join(aqui, "pipeline_comercial.html");
const SALIDA = process.argv[2] ? join(aqui, process.argv[2]) : join(aqui, "Capturas_UI");
const ANCHO = 1600, ALTO = 1200;

// playwright se resuelve a mano: NODE_PATH no aplica a `import` de ESM. Ver run_tests.mjs.
const require = createRequire(import.meta.url);
let chromium = null;
for (const c of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
  try { ({ chromium } = require(c)); break; } catch { /* siguiente */ }
}
if (!chromium) {
  console.error("No encuentro playwright. Instalalo (npm i -D playwright) o exporta PLAYWRIGHT_MODULE=/ruta/a/playwright.");
  process.exit(2);
}

const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: aqui }).toString().trim(); } catch { return "?"; } })();
const rama = (() => { try { return execSync("git rev-parse --abbrev-ref HEAD", { cwd: aqui }).toString().trim(); } catch { return "?"; } })();
const sello = new Date().toISOString().slice(0, 16).replace("T", " ");

/* --------------------------------------------------------------------------------------------
   SERIALIZADOR — corre DENTRO de la pagina. Devuelve { css, html, alto }.
   -------------------------------------------------------------------------------------------- */
const serializar = () => {
  const host = document.querySelector("nex-pipeline") || document.getElementById("root");
  if (!host) return { error: "no encuentro la raiz de la app" };

  // Clases que esta pantalla usa de verdad: con eso se poda Tailwind.
  const usadas = new Set();
  const anota = (el) => { if (el.classList) for (const c of el.classList) usadas.add(c); };
  anota(host); host.querySelectorAll("*").forEach(anota);

  const clasesDe = (sel) => {
    const out = []; const re = /\.((?:[\w-]|\\.)+)/g; let m;
    while ((m = re.exec(sel))) out.push(m[1].replace(/\\(.)/g, "$1"));
    return out;
  };
  // Se conserva la regla si ALGUNA de sus clases se usa, o si no menciona clases (`*`, `body`,
  // `::selection`). Podar de mas rompe la pantalla en silencio; conservar de mas solo pesa.
  const sirve = (sel) => { const cs = clasesDe(sel || ""); return !cs.length || cs.some((c) => usadas.has(c)); };

  const imports = [], reglas = [];
  const recorrer = (lista) => {
    for (const r of lista) {
      if (r.type === CSSRule.IMPORT_RULE) { imports.push(r.cssText); continue; }
      if (r.type === CSSRule.STYLE_RULE) { if (sirve(r.selectorText)) reglas.push(r.cssText); continue; }
      if (r.type === CSSRule.MEDIA_RULE || r.type === CSSRule.SUPPORTS_RULE) {
        const dentro = [];
        for (const s of r.cssRules) {
          if (s.type === CSSRule.STYLE_RULE) { if (sirve(s.selectorText)) dentro.push(s.cssText); }
          else dentro.push(s.cssText);
        }
        if (!dentro.length) continue;
        const cond = r.type === CSSRule.MEDIA_RULE ? "@media " + r.media.mediaText : "@supports " + r.conditionText;
        reglas.push(cond + "{" + dentro.join("") + "}");
        continue;
      }
      if (r.cssText) reglas.push(r.cssText); // @font-face, @keyframes, @layer…
    }
  };
  for (const hoja of document.styleSheets) { try { recorrer(hoja.cssRules); } catch { /* hoja inaccesible */ } }

  // `nex-pipeline` es un custom element: fuera de la app seria un `display:inline` desconocido, asi
  // que sus hijos se cuelgan de un div normal que hereda su class y su style.
  const caja = document.createElement("div");
  if (host.className) caja.className = host.className;
  if (host.getAttribute && host.getAttribute("style")) caja.setAttribute("style", host.getAttribute("style"));
  for (const hijo of host.childNodes) caja.appendChild(hijo.cloneNode(true));
  caja.querySelectorAll("script,style,template").forEach((n) => n.remove());

  // `cloneNode` no copia el valor VIVO de los controles: sin esto los inputs salen vacios.
  const vivos = host.querySelectorAll("input,textarea,select");
  const copias = caja.querySelectorAll("input,textarea,select");
  if (vivos.length === copias.length) {
    vivos.forEach((v, i) => {
      const c = copias[i];
      if (v.tagName === "TEXTAREA") c.textContent = v.value;
      else if (v.tagName === "SELECT") { const o = c.options[v.selectedIndex]; if (o) o.setAttribute("selected", ""); }
      else {
        if (v.type === "checkbox" || v.type === "radio") { if (v.checked) c.setAttribute("checked", ""); else c.removeAttribute("checked"); }
        else c.setAttribute("value", v.value);
      }
    });
  }

  return {
    css: imports.join("\n") + "\n" + reglas.join("\n"),
    html: caja.outerHTML,
    alto: Math.ceil(Math.max(document.documentElement.scrollHeight, host.scrollHeight)),
    clases: usadas.size,
    podadas: reglas.length,
  };
};

const envolver = (titulo, cap) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<!-- CAPTURA AUTOMATICA de pipeline_comercial.html · rama ${rama} · commit ${commit} · ${sello}
     Generado por capturar_pantallas.mjs. NO EDITAR A MANO: se regenera. -->
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

/* -------------------------------------------------------------------------------------------- */
const VISTAS = [
  ["dashboard", "Dashboard"], ["pipeline", "Tubo diario"], ["tareas", "Tareas"],
  ["clientes", "Clientes"], ["gestion", "Gestión"], ["operaciones", "Operaciones"],
  ["lineas", "Líneas"], ["otorgamientos", "Otorgamientos"], ["verificacion", "Verificación"],
];

mkdirSync(SALIDA, { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 1 });
const pagina = await ctx.newPage();
const fallos = [];
pagina.on("pageerror", (e) => fallos.push(String(e).slice(0, 200)));

console.log(`Construido de ${rama} @ ${commit}. Abriendo ${HTML} …`);
await pagina.goto("file://" + HTML, { waitUntil: "load", timeout: 300000 });
await pagina.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 300000 });

// Login: usuario y clave vienen precargados para la demo; el OTP se emite de verdad y se muestra
// en pantalla como ayuda, asi que se lee de ahi en vez de hardcodearlo.
await pagina.getByRole("button", { name: "Ingresar", exact: true }).click();
await pagina.waitForFunction(() => /el código enviado es/.test(document.body.innerText || ""), null, { timeout: 60000 });
const codigo = await pagina.evaluate(() => (document.body.innerText.match(/el código enviado es\s*(\d{4,8})/) || [])[1] || "");
if (!/^\d+$/.test(codigo)) throw new Error("no pude leer el codigo 2FA de la pantalla");
const casillas = pagina.locator('input[aria-label^="Dígito"]');
for (let i = 0; i < codigo.length; i++) await casillas.nth(i).fill(codigo[i]);
await pagina.getByRole("button", { name: "Verificar y entrar" }).click();
await pagina.waitForFunction(() => /Tubo diario/.test(document.body.innerText || ""), null, { timeout: 60000 });
console.log("Sesion iniciada.");

// El tubo arranca vacio: hay que correr el stream del inbound y esperar a que entren negocios.
// Los controles del motor de simulacion viven en la cabecera del TUBO, no en el dashboard con el
// que arranca la sesion, y se ubican por `title` (el texto lleva un icono al lado).
const NEGOCIOS_MIN = 20, ESPERA_MAX = 180000;
await pagina.locator("header nav button", { hasText: /^Tubo diario$/ }).first().click();
await pagina.waitForTimeout(1200);
await pagina.locator('button[title*="iniciar la simulación"]').first().click();
console.log("Inbound corriendo; esperando a que se pueble el tubo…");
const t0 = Date.now();
let ultimo = 0;
while (Date.now() - t0 < ESPERA_MAX) {
  await pagina.waitForTimeout(3000);
  const n = await pagina.evaluate(() => { const m = (document.body.innerText || "").match(/(\d+)\s+de\s+(\d+)\s+negocios/); return m ? +m[2] : 0; });
  if (n !== ultimo) { ultimo = n; console.log(`  ${n} negocios…`); }
  if (n >= NEGOCIOS_MIN) break;
}
// Pausar: con el stream vivo las cifras cambian entre el PNG y la serializacion del DOM.
await pagina.locator('button[title*="pausar la simulación"]').first().click();
await pagina.waitForTimeout(1500);
console.log(`Inbound pausado con ${ultimo} negocios.`);

const guardar = async (pag, n, slug, titulo) => {
  const cap = await pag.evaluate(serializar);
  if (cap.error) { console.log(`  ! ${slug}: ${cap.error}`); return; }
  const nombre = String(n).padStart(2, "0") + "-" + slug;
  writeFileSync(join(SALIDA, nombre + ".html"), envolver(titulo, cap), "utf8");
  await pag.screenshot({ path: join(SALIDA, nombre + ".png"), fullPage: true });
  console.log(`  ${nombre}  ${cap.podadas} reglas · ${cap.clases} clases · ${cap.alto}px`);
};

let n = 0;
for (const [slug, etiqueta] of VISTAS) {
  n++;
  await pagina.locator("header nav button", { hasText: new RegExp("^" + etiqueta + "$") }).first().click();
  await pagina.waitForTimeout(2500); // que asienten los graficos de recharts y los skeletons
  await guardar(pagina, n, slug, `NEX Factoring · ${etiqueta}`);
}

// El tubo carga por defecto en TABLA (`vista` = "tabla"); el Kanban es la otra mitad de esa
// pantalla y se llega por el desplegable de vista, asi que se captura tambien.
await pagina.locator("header nav button", { hasText: /^Tubo diario$/ }).first().click();
await pagina.waitForTimeout(1200);
n++;
await pagina.locator('button[title^="Cambiar la vista del tubo"]').first().click();
await pagina.waitForTimeout(400);
await pagina.locator("button").filter({ hasText: /^\s*Kanban\s*$/ }).first().click();
await pagina.waitForTimeout(2500);
await guardar(pagina, n, "tubo-kanban", "NEX Factoring · Tubo diario (Kanban)");
await pagina.locator('button[title^="Cambiar la vista del tubo"]').first().click();
await pagina.waitForTimeout(400);
await pagina.locator("button").filter({ hasText: /^\s*Tabla\s*$/ }).first().click();
await pagina.waitForTimeout(1500);

// El detalle se abre en PESTANA NUEVA (ticket opaco en la URL), no en un drawer: hay que esperar
// el evento `page` del contexto o se captura el tubo otra vez.
n++;
const fila = pagina.locator("tr.pl-row").first();
const tarjeta = pagina.locator("[draggable='true']").first();
const gatillo = (await fila.count()) ? fila : tarjeta;
if (await gatillo.count()) {
  const [detalle] = await Promise.all([ctx.waitForEvent("page", { timeout: 60000 }), gatillo.click()]);
  await detalle.waitForLoadState("load", { timeout: 300000 });
  await detalle.waitForFunction(() => /Monto|Facturas|Oferta/.test(document.body.innerText || ""), null, { timeout: 300000 });
  await detalle.waitForTimeout(2500);
  await guardar(detalle, n, "detalle-operacion", "NEX Factoring · Detalle de la operación");
  await detalle.close();
} else {
  console.log("  ! no encontre una operacion que abrir en el tubo");
}

if (fallos.length) console.log("ERRORES DE PAGINA:\n  " + fallos.slice(0, 5).join("\n  "));
console.log(`\nListo en ${SALIDA}`);
await navegador.close();
