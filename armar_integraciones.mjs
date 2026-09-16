/* ============================================================================================
   CONSOLIDADO DE INTEGRACIONES — reúne los specs de `Integraciones/` en un solo documento.

       node armar_integraciones.mjs
       PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node md_a_pdf.mjs Integraciones/Integraciones_APIs_y_SFTP.md

   Existe por la misma razón que `md_a_pdf.mjs`: un documento que reúne a otros once y se mantiene
   a mano se desfasa de ellos a la primera corrección, y el desfase no se nota hasta que alguien
   implementa contra la copia vieja. Cada spec sigue siendo la fuente; esto los ordena y los indexa.

   El orden es el del FLUJO, no el alfabético: primero las entregas SFTP que montan la tabla interna,
   después el stream de cesiones, y al final las APIs — las que NEX expone y las que consume.
   ============================================================================================ */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = "Integraciones";
const SALIDA = join(DIR, "Integraciones_APIs_y_SFTP.md");

const GRUPOS = [
  { titulo: "Entregas SFTP diarias", intro: "Cada archivo monta una sección de la **tabla interna**. La aplicación nunca consulta a Security en línea: lee siempre esa tabla, que se refresca con el batch diario y con los upserts intradía de la API A22.",
    specs: ["spec_sftp_cartera", "spec_sftp_deudores_listas", "spec_sftp_plataforma360", "spec_sftp_otorgamiento", "spec_sftp_verificacion", "spec_sftp_lineas_vigentes"] },
  { titulo: "Streams", intro: "Registro electrónico de cesiones. No es una entrega diaria ni una consulta puntual: es el histórico del que se derivan el mix de financiamiento, la detección de competencia y el bloqueo de un documento ya cedido.",
    specs: ["spec_aecsync"] },
  { titulo: "APIs", intro: "La primera la **expone NEX** para que Security actualice la tabla interna dentro del día; las otras tres las **consume** NEX.",
    specs: ["spec_swagger_actualizacion_intradia", "spec_swagger_consulta_lineas", "spec_swagger_montos_lineas", "spec_swagger_gestion_lineas"] },
];

// Baja un nivel todos los encabezados: el H1 de cada spec pasa a ser una sección del consolidado.
// Los bloques de código se saltan — un `#` ahí adentro es un comentario, no un título.
function degradar(md) {
  const out = [];
  let enCodigo = false;
  for (const l of md.split("\n")) {
    if (/^```/.test(l)) enCodigo = !enCodigo;
    out.push(!enCodigo && /^#{1,5}\s/.test(l) ? "#" + l : l);
  }
  return out.join("\n");
}

const leer = (slug) => {
  const src = readFileSync(join(DIR, slug + ".md"), "utf8").replace(/\s*$/, "\n");
  const titulo = (src.match(/^#\s+(.*)$/m) || [])[1] || slug;
  const mT = titulo.match(/^Spec\s*[—-]\s*(.+?)\s*\((Activos?)\s+([^)]+)\)\s*$/i);
  const cuerpo = src.replace(/^#\s+.*\n/, "");
  return {
    slug, titulo,
    nombre: mT ? mT[1] : titulo,
    activos: mT ? mT[3].trim() : "—",
    transporte: ((cuerpo.match(/^\*\*Transporte:\*\*\s*([A-Za-zÁÉÍÓÚáéíóú]+)/m) || [])[1] || "API").toUpperCase(),
    // El propósito es la primera frase: alcanza para un índice y no obliga a abrir el capítulo.
    proposito: ((cuerpo.match(/^\*\*Propósito:\*\*\s*([\s\S]*?)(?:\.\s|\.\n)/m) || [])[1] || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
    cuerpo: degradar(cuerpo).replace(/^\s+/, ""),
  };
};

const specs = GRUPOS.flatMap((g) => g.specs.map(leer));
const hoy = new Date().toISOString().slice(0, 10);

const doc = [];
doc.push("# Integraciones — APIs y SFTP");
doc.push("");
doc.push(`**Propósito:** el contrato de las entregas que alimentan NEX Factoring y de las APIs que expone o consume. Reúne los ${specs.length} specs de \`Integraciones/\`, que siguen siendo la fuente de cada uno.`);
doc.push(`**Alcance:** ${specs.length} integraciones · generado el ${hoy}.`);
doc.push("");
doc.push("---");
doc.push("");
doc.push("## El patrón");
doc.push("");
doc.push("Todas las entregas siguen la misma forma: **SFTP diario → tabla interna → upserts intradía por la API A22**. La aplicación lee siempre la tabla interna y nunca consulta a Security en línea, así que una integración que no llega no deja la pantalla en blanco: deja el dato del día anterior, que es un estado que se puede explicar.");
doc.push("");
doc.push("Dos integraciones se salen del patrón a propósito. **A23 · consulta de líneas** se llama en el momento de evaluar una oferta, porque el cupo disponible cambia con cada operación que cursa cualquier canal y una foto diaria no sirve para decidir. **A13/A14/A15 · gestión de líneas** es el borde con el sistema del comité: NEX inyecta y consulta, y la resolución ocurre afuera.");
doc.push("");
doc.push("## Índice");
doc.push("");
doc.push("| Documento | Activo | Transporte | Qué entrega |");
doc.push("|---|---|---|---|");
for (const s of specs) doc.push(`| \`${s.nombre}\` | **${s.activos}** | ${s.transporte} | ${s.proposito} |`);
doc.push("");

for (const g of GRUPOS) {
  doc.push("---");
  doc.push("");
  doc.push(`## ${g.titulo}`);
  doc.push("");
  doc.push(g.intro);
  doc.push("");
  for (const slug of g.specs) {
    const s = specs.find((x) => x.slug === slug);
    doc.push(`### ${s.nombre} · ${s.activos}`);
    doc.push("");
    doc.push(s.cuerpo.replace(/\n---\n/g, "\n"));
    doc.push("");
  }
}

writeFileSync(SALIDA, doc.join("\n").replace(/\n{3,}/g, "\n\n"));
console.log(`OK: ${SALIDA} · ${specs.length} specs · ${doc.join("\n").split("\n").length} líneas`);
