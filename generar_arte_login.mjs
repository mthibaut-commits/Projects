#!/usr/bin/env node
// -------------------------------------------------------------------------------------------------
// generar_arte_login.mjs — produce `arte_login.js`, el arte de la portada de ingreso.
//
// La portada muestra DOS pantallas reales del producto en perspectiva. No son maquetas: salen de
// `Capturas_UI/`, que es el DOM real con el CSS real (ver `vault/conocimiento/mapa_documentos.md`).
// Por eso el arte se GENERA y no se escribe a mano: si la UI cambia y se regeneran las capturas,
// se vuelve a correr esto y la portada deja de mostrar una versión que ya no existe.
//
// Por qué un archivo aparte y no data URIs dentro del `.jsx`: son bytes generados, y el fuente se
// edita a mano (regla 10 de CLAUDE.md). Sigue el mismo patrón que `datos_inyectados.js`: un activo
// generado que el build embebe. Si falta, el build no rompe y la portada cae a su fondo sin paneles.
//
// Por qué WebP y no PNG: la app corre sólo en Chrome (Iniciar_NEX_Factoring.bat), y sobre una
// captura de interfaz WebP pesa ~3,6 veces menos que PNG sin diferencia visible a este tamaño.
// Medido el 18-09-2026: 726 KB en PNG contra 201 KB en WebP q0.86.
//
//   node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node generar_arte_login.mjs
// -------------------------------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// NODE_PATH no aplica a `import` de ESM: playwright se resuelve a mano, igual que en run_tests.mjs.
let chromium = null;
for (const c of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
  try { ({ chromium } = require(c)); break; } catch { /* siguiente */ }
}
if (!chromium) {
  console.error("No encuentro playwright. Instalalo (npm i -D playwright) o exporta PLAYWRIGHT_MODULE=/ruta/a/playwright.");
  process.exit(2);
}

// El contenedor de la app topa en 1600px (`max-width` del layout). Capturar más ancho no muestra
// más producto: agrega margen blanco muerto. Capturar más angosto y estirar agranda todo, que es
// lo que hacía que el dashboard se viera con demasiado zoom.
const VIEWPORT = { width: 1600, height: 1000 };

// Cada panel se dibuja a un ancho CSS distinto; el doble alcanza para pantalla de alta densidad.
const PANELES = [
  { clave: "dashboard", archivo: "01-dashboard.html", ancho: 1760 },
  { clave: "tubo", archivo: "10-tubo-kanban.html", ancho: 1520 },
];
const CALIDAD = 0.86;

const faltan = PANELES.filter((p) => !existsSync(join(root, "Capturas_UI", p.archivo)));
if (faltan.length) {
  console.error("Faltan capturas: " + faltan.map((p) => p.archivo).join(", ") +
    "\nRegeneralas con: node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_pantallas.mjs");
  process.exit(2);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();

const arte = {};
for (const panel of PANELES) {
  const ruta = join(root, "Capturas_UI", panel.archivo);
  await pagina.goto("file://" + ruta, { waitUntil: "load", timeout: 120000 });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(800);
  const png = await pagina.screenshot({ type: "png" });

  // La conversión la hace el propio Chromium: no hace falta ninguna herramienta extra en la máquina.
  arte[panel.clave] = await pagina.evaluate(async ([src, ancho, calidad]) => {
    const img = new Image();
    await new Promise((listo, falla) => { img.onload = listo; img.onerror = falla; img.src = src; });
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = Math.round(ancho * img.height / img.width);
    lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL("image/webp", calidad);
  }, ["data:image/png;base64," + png.toString("base64"), panel.ancho, CALIDAD]);

  console.log(`  ${panel.clave.padEnd(10)} ${panel.archivo.padEnd(24)} ${panel.ancho} px  ${Math.round(arte[panel.clave].length * 0.75 / 1024)} KB`);
}
await navegador.close();

// El estampado dice de qué build salió el arte, igual que las capturas: si algún día la portada
// muestra una UI que ya no existe, acá está el commit del que salió.
const sello = (() => {
  try {
    const cap = readFileSync(join(root, "Capturas_UI", PANELES[0].archivo), "utf8").slice(0, 400);
    const m = cap.match(/rama ([^\s·]+) · commit ([0-9a-f]+) · ([\d-]+)/);
    return m ? `rama ${m[1]} · commit ${m[2]} · ${m[3]}` : "origen desconocido";
  } catch { return "origen desconocido"; }
})();

const salida =
  `// ARTE DE LA PORTADA — GENERADO por generar_arte_login.mjs. NO EDITAR A MANO: se regenera.\n` +
  `// Origen: Capturas_UI/ (${sello}) · WebP q${CALIDAD} · viewport ${VIEWPORT.width}x${VIEWPORT.height}\n` +
  `window.ARTE_LOGIN = ${JSON.stringify(arte)};\n`;
writeFileSync(join(root, "arte_login.js"), salida);
console.log(`\narte_login.js escrito · ${Math.round(salida.length / 1024)} KB · ${sello}`);
