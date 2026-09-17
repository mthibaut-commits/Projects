#!/usr/bin/env node
/* PreToolUse (Edit|Write|MultiEdit): bloquea escrituras del agente a rutas protegidas.
   Recibe el input de la tool como JSON por stdin; exit 2 = bloquear (stderr va al agente).

   En Node y no en bash porque Node ya es requisito del repo (build_app.mjs) y el usuario trabaja en
   Windows; la LÓGICA se exporta (`decidir`) para probarla desde tests/contract/hooks.test.mjs. */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PROTEGIDAS = [
  { re: /(^|\/)vault\/adr\/ADR-[^/]+\.md$/, soloExistente: true,
    motivo: "los ADR aceptados son inmutables. Escribe un ADR nuevo que lo reemplace (campo `reemplaza:`) y marca el viejo como `estado: reemplazada`" },
  { re: /(^|\/)vendor\//, motivo: "vendor/ tiene los bytes fijados por sha256 en vendor/SBOM.json: actualizar una dependencia es bajar el archivo, revisar el diff y regenerar el manifiesto a propósito" },
  { re: /(^|\/)(babel\.min\.js\.descarga|saved_resource)$/, motivo: "dependencia vendorizada del build (Babel Standalone / Tailwind): no se edita" },
  { re: /(^|\/)fuentes\//, motivo: "fuentes embebidas (woff2, `-text` en .gitattributes): binarias, no se editan" },
  { re: /(^|\/)datos_inyectados\.js$/, motivo: "lo produce GeneradorDatos/generar.js: corrige el generador y regenera, no el archivo" },
  { re: /(^|\/)proveedores_clientes\.json$/, motivo: "feed externo (en producción va por API): no se edita a mano" },
  { re: /(^|\/)atribuciones_otorgamiento\.json$/, motivo: "se regenera con regenerar_atribuciones.mjs; editado a mano se desfasa del catálogo" },
  { re: /(^|\/)(Capturas_UI|Variantes_UI)\/[^/]+\.html$/, motivo: "capturas del DOM real, se regeneran con capturar_*.mjs; si una pantalla se ve mal, el arreglo va en el .jsx" },
  { re: /(^|\/)Integraciones\/Integraciones_APIs_y_S3\.md$/, motivo: "lo arma armar_integraciones.mjs desde los once specs: edita el spec y regenera" },
  { re: /\.pdf$/i, motivo: "los PDF se generan con md_a_pdf.mjs desde su .md: edita el .md y regenera" },
  { re: /(^|\/)pipeline_comercial\.html$/, motivo: "salida del build (ignorada por git): se regenera con node build_app.mjs" },
  { re: /(^|\/)Legado\//, motivo: "Legado/ es archivo histórico y no es fuente (ver su README)" },
  { re: /(^|\/)[^/]*\.env(\..*)?$/, motivo: "los archivos .env no se editan desde el agente" },
  { re: /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|Cargo\.lock|go\.sum)$/, motivo: "los lockfiles los regenera el package manager, no se editan a mano" },
];

export function decidir(filePath, existe = existsSync) {
  if (!filePath) return { bloquear: false };
  const p = String(filePath).replace(/\\/g, "/");
  for (const r of PROTEGIDAS) {
    if (!r.re.test(p)) continue;
    if (r.soloExistente && !existe(filePath)) continue;   // crear un ADR nuevo sí se permite
    return { bloquear: true, motivo: r.motivo };
  }
  return { bloquear: false };
}

async function main() {
  let entrada = "";
  for await (const trozo of process.stdin) entrada += trozo;
  let ruta = "";
  try { ruta = JSON.parse(entrada)?.tool_input?.file_path ?? ""; } catch { process.exit(0); }
  const d = decidir(ruta);
  if (d.bloquear) { process.stderr.write(`BLOQUEADO (protect_paths): ${ruta} — ${d.motivo}.\n`); process.exit(2); }
  process.exit(0);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
