#!/usr/bin/env node
/*
  build_app.mjs
  ---------------------------------------------------------------
  Puerto a Node de build_app.ps1: genera pipeline_comercial.html a
  partir de pipeline_comercial.jsx con el MISMO resultado.

  Existe para poder construir y verificar el HTML donde no hay
  PowerShell (contenedores Linux, CI, sesiones remotas). En Windows
  el flujo del usuario no cambia: Iniciar_NEX_Factoring.bat sigue
  llamando a build_app.ps1.

  Uso:  node build_app.mjs

  MANTENER EN SINCRONIA con build_app.ps1. Son dos implementaciones
  del mismo contrato de build: si cambia una, cambia la otra.
  ---------------------------------------------------------------
*/

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const leer = (p) => readFileSync(p, "utf8");
const leerSiExiste = (p) => (existsSync(p) ? leer(p) : null);

try {
  const jsxPath   = join(root, "pipeline_comercial.jsx");
  const outPath   = join(root, "pipeline_comercial.html");
  const babelPath = join(root, "babel.min.js.descarga");
  const twPath    = join(root, "saved_resource");

  if (!existsSync(jsxPath)) {
    throw new Error(`No se encontro pipeline_comercial.jsx en ${root}`);
  }

  let jsxSource = leer(jsxPath);
  const babelJs = leerSiExiste(babelPath);
  const tailwindJs = leerSiExiste(twPath);

  // ---- Estampa de build (VERSIONADO) --------------------------------------------------------
  // Gestion de incidencias: el HTML generado debe poder identificarse a si mismo. Se inyecta
  // window.__NEX_BUILD__ ANTES del bundle, para que APP_BUILD lo lea al evaluar sus constantes.
  // Si el repo no esta disponible (copia suelta del build), cae a "sin-git" en vez de fallar.
  const dosDig = (n) => String(n).padStart(2, "0");
  const ahora = new Date();
  const buildFecha =
    `${ahora.getFullYear()}-${dosDig(ahora.getMonth() + 1)}-${dosDig(ahora.getDate())}` +
    ` ${dosDig(ahora.getHours())}:${dosDig(ahora.getMinutes())}`;

  const git = (...args) => {
    try {
      return execFileSync("git", ["-C", root, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return "";
    }
  };

  let buildCommit = "sin-git";
  let buildRama = "-";
  const c = git("rev-parse", "--short", "HEAD");
  if (c) buildCommit = c;
  const b = git("rev-parse", "--abbrev-ref", "HEAD");
  if (b) buildRama = b;
  // Marca el build como sucio si hay cambios sin commitear: un HTML generado sobre el working
  // tree no corresponde a ningun commit y eso tiene que verse en el diagnostico.
  if (git("status", "--porcelain")) buildCommit = buildCommit + "+local";

  // Ademas del objeto global, se deja un <meta name="nex-build"> para poder identificar el archivo
  // desde "ver codigo fuente" sin abrir la app ni la consola.
  const buildMeta = `${buildFecha} | ${buildCommit} | ${buildRama}`;
  const buildJs =
    `window.__NEX_BUILD__={fecha:"${buildFecha}",commit:"${buildCommit}",rama:"${buildRama}"};\n` +
    `try{var m=document.createElement("meta");m.name="nex-build";m.content="${buildMeta}";` +
    `document.head.appendChild(m);}catch(e){}`;

  // Colecciones de datos del webhook/SFTP (window.DTESYNC, LISTA_BLANCA, DEUDORES_AUTORIZADOS,
  // AECSYNC, SHARE_OF_WALLET, ESTRATEGIA_PRECIO, LINEA_DISPONIBLE). Sin ellas el inbound no
  // clasifica ninguna factura y el pipeline queda vacio (rescatadas del build original de Cowork).
  const datosJs = leerSiExiste(join(root, "datos_inyectados.js"));

  // ---- Dependencias VENDORIZADAS (OWASP A08) ------------------------------------------------
  // Antes React, recharts, lucide y d3-sankey se cargaban desde esm.sh por importmap, SIN integrity.
  // Un import map no permite proteger la cadena completa: la URL de entrada de esm.sh es un shim de
  // ~130 bytes que re-exporta desde otra ruta, de modo que un SRI ahi cubre el shim y no el codigo.
  // Ademas la app se abre por file:// (ver Iniciar_NEX_Factoring.bat), donde los modulos ES locales
  // quedan bloqueados por CORS. Por eso se usan los builds UMD, embebidos en el HTML: se elimina la
  // dependencia de un tercero en tiempo de ejecucion y el archivo sigue siendo autocontenido.
  // Actualizar una libreria = volver a bajar el archivo a vendor/ y revisar el diff.
  const vendorOrden = [
    "react.js", "react-dom.js", "prop-types.js", "_alias.js",
    "d3-path.js", "d3-array.js", "d3-shape.js", "d3-sankey.js",
    "lucide-react.js", "recharts.js", "xlsx.js",
  ];
  // ---- Integridad del vendor (OWASP A06/A08) ------------------------------------------------
  // Vendorizar quita la dependencia del CDN en runtime, pero deja el problema contrario: un archivo
  // de vendor/ puede cambiar y nadie se entera, porque ya no hay SRI ni lock. vendor/SBOM.json
  // registra version y sha256 de cada uno, y aca se verifica ANTES de embeberlos. Si un hash no
  // calza el build FALLA: actualizar una libreria obliga a revisar el diff y regenerar el
  // manifiesto a proposito.
  const sbomPath = join(root, "vendor", "SBOM.json");
  const sbomHashes = {};
  if (existsSync(sbomPath)) {
    for (const c of JSON.parse(leer(sbomPath)).componentes) sbomHashes[c.archivo] = c.sha256;
  } else {
    console.log("AVISO: no hay vendor/SBOM.json; no se puede verificar la integridad de las dependencias.");
  }

  let vendorJs = "";
  for (const v of vendorOrden) {
    const vp = join(root, "vendor", v);
    if (!existsSync(vp)) throw new Error(`Falta la dependencia vendorizada: vendor/${v}`);
    if (Object.prototype.hasOwnProperty.call(sbomHashes, v)) {
      // El hash va sobre los BYTES, no sobre el texto: cualquier conversion de fin de linea cambia
      // el sha256. Por eso .gitattributes marca vendor/** como -text (sin normalizar).
      const h = createHash("sha256").update(readFileSync(vp)).digest("hex").toLowerCase();
      if (h !== String(sbomHashes[v]).toLowerCase()) {
        throw new Error(
          `Integridad rota en vendor/${v} : sha256 ${h} no coincide con vendor/SBOM.json ` +
          `(${sbomHashes[v]}). Revisa el diff y, si el cambio es intencional, regenera el manifiesto.`
        );
      }
    } else {
      console.log(`AVISO: vendor/${v} no esta en el SBOM: se embebe sin verificar.`);
    }
    vendorJs += `\n/* vendor: ${v} */\n` + leer(vp);
  }

  // Feed DIARIO de proveedores de clientes (proveedores_clientes.json). Es un archivo JSON puro
  // —el mismo artefacto que se deja cada manana para cargar en la BD interna— y aca se embebe como
  // window.PROVEEDORES_CLIENTES para que el demo funcione sin backend ni fetch (que file:// bloquea).
  // En produccion la app NO lo embebe: lo pide por API.
  let provJson = leerSiExiste(join(root, "proveedores_clientes.json"));
  if (provJson) {
    // El feed es un archivo EXTERNO que se deja cada manana: una razon social que contenga la
    // secuencia "</script" cierra el bloque <script> del HTML generado y lo que venga despues se
    // parsea como marcado, en el origen de la app. Escapar "<" como \u003c es valido dentro de una
    // cadena JSON (decodifica al mismo caracter) y no puede romper el contexto. La estructura del
    // JSON no contiene "<", asi que el reemplazo global es seguro y completo.
    provJson = provJson.replaceAll("<", "\\u003c");
  }
  const provJs = provJson ? "window.PROVEEDORES_CLIENTES=" + provJson + ";" : null;

  // Los `import` del .jsx se traducen a destructuring de los globales UMD. El fuente se mantiene con
  // imports (es lo que entiende el chequeo de tipos); la traduccion ocurre solo al construir.
  const globalDe = {
    "react": "React",
    "react-dom": "ReactDOM",
    "lucide-react": "LucideReact",
    "recharts": "Recharts",
    "d3-sankey": "d3",
  };
  jsxSource = jsxSource.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";/g,
    (_todo, nombres, mod) => {
      const g = globalDe[mod];
      if (!g) throw new Error(`Import sin global UMD conocido: ${mod}`);
      return "const {" + nombres.replace(/\s+as\s+/g, ": ") + "} = " + g + ";";
    }
  );

  // El fuente declara `export default function PipelineComercial`, valido cuando el bundle era un
  // modulo ES. Ahora es un script clasico y `export` seria un SyntaxError, asi que se quita al
  // construir; el .jsx conserva el export porque es lo que espera el chequeo de tipos.
  jsxSource = jsxSource.replace(
    /export default function PipelineComercial/g,
    "function PipelineComercial"
  );

  // ---- Fragmentos de HTML ----
  // Todo lo que viene de archivos externos (jsx, babel, tailwind, vendor) se concatena tal cual,
  // nunca interpolado: esos archivos traen literales ${...} y backticks de JS.
  const head = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<!-- Content Security Policy (OWASP A05). Acota DE DONDE puede cargarse codigo: sin esto, cualquier
     inyeccion puede traer un script de cualquier host. Se permite 'unsafe-inline'/'unsafe-eval'
     porque el demo transpila JSX en el navegador con Babel Standalone; en produccion el bundle va
     compilado y ambos se quitan, que es el mayor beneficio de sacar Babel del runtime.
     Nota: frame-ancestors se IGNORA en <meta>; contra clickjacking hay que mandarlo como cabecera
     HTTP (o X-Frame-Options) desde el servidor/CDN, junto con HSTS y Referrer-Policy. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; child-src blob:; frame-src blob:; object-src 'none'; base-uri 'self'; form-action 'self'" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<title>NEX Factoring - Pipeline Comercial</title>
<style>
  html, body, #root { height: 100%; }
  body { margin: 0; }
</style>
<script>`;

  const head2 = `</script>
<script>`;

  const head3 = `</script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
`;

  const tail = `
// La app se monta a traves del web component <nex-pipeline>: asi el contrato de embebido de la
// guia de integracion (parameters + nex:set-token) esta VIVO y no es solo documentacion.
// Standalone es el mismo camino, sin atributos.
definirWebComponent(React, ReactDOM, PipelineComercial);
document.getElementById("root").appendChild(document.createElement("nex-pipeline"));
</script>
</body>
</html>`;

  // Bloque de datos inyectados: va ANTES del bundle de la app, como script clasico,
  // para que window.DTESYNC y demas existan cuando el modulo evalue sus constantes.
  // La estampa de build va PRIMERO, antes incluso de los datos inyectados.
  let payload = buildJs + "\n" + vendorJs;
  if (datosJs) payload = payload + "\n" + datosJs;
  if (provJs) payload = payload + "\n" + provJs;
  const datosBlock = "</script>\n<script>\n" + payload + "\n</script>\n<script>\n";

  // Si falta algun recurso local, cae a CDN online como respaldo.
  const babelBlock = babelJs
    ? head + datosBlock + babelJs + head2
    : head + datosBlock + '</script>\n<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n<script>';

  const tailwindBlock = tailwindJs
    ? babelBlock + tailwindJs + head3
    : babelBlock + '</script>\n<script src="https://cdn.tailwindcss.com"></script>\n<script type="text/babel" data-presets="react">\n\n';

  const html = tailwindBlock + jsxSource + tail;

  // Escritura UTF-8 sin BOM (mas compatible con file:// en navegadores).
  writeFileSync(outPath, html, "utf8");

  const mb = (html.length / 1048576).toFixed(1);
  console.log(`OK: generado ${outPath} (${mb} MB)`);
  console.log(`    build ${buildFecha} | commit ${buildCommit} | rama ${buildRama}`);
  process.exit(0);
} catch (e) {
  console.error(e && e.message ? e.message : String(e));
  process.exit(1);
}
