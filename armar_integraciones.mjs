/* ============================================================================================
   CONSOLIDADO DE INTEGRACIONES — reúne los specs de `Integraciones/` en un solo documento.

       node armar_integraciones.mjs
       PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node md_a_pdf.mjs Integraciones/Integraciones_APIs_y_S3.md

   Existe por la misma razón que `md_a_pdf.mjs`: un documento que reúne a otros once y se mantiene
   a mano se desfasa de ellos a la primera corrección, y el desfase no se nota hasta que alguien
   implementa contra la copia vieja. Cada spec sigue siendo la fuente; esto los ordena y los indexa.

   El orden es el del FLUJO, no el alfabético: primero las entregas SFTP que montan la tabla interna,
   después el stream de cesiones, y al final las APIs — las que NEX expone y las que consume.
   ============================================================================================ */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = "Integraciones";
const SALIDA = join(DIR, "Integraciones_APIs_y_S3.md");

const GRUPOS = [
  { titulo: "El transporte", intro: "Cómo llega una entrega y qué la hace procesarse. Va primero porque las seis entregas diarias comparten este mecanismo y ninguna lo redefine.",
    specs: ["spec_s3_ingesta"] },
  { titulo: "Entregas diarias", intro: "Cada archivo monta una sección de la **tabla interna**. La aplicación nunca consulta a Security en línea: lee siempre esa tabla, que se refresca con la entrega diaria y con los upserts intradía de la API A22.",
    specs: ["spec_s3_cartera", "spec_s3_deudores_listas", "spec_s3_plataforma360", "spec_s3_otorgamiento", "spec_s3_verificacion", "spec_s3_lineas_vigentes"] },
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
  // El anexo de control de versiones de cada spec NO entra: doce anexos seguidos dentro de un
  // consolidado no se leen, y el consolidado lleva el suyo al final. La LÍNEA de versión sí se
  // queda en el capítulo: dice qué versión de ese spec es la que este documento reproduce.
  const cuerpo = src.replace(/^#\s+.*\n/, "").replace(/\n*(?:---\n\n)?## Anexo · Control de versiones\n[\s\S]*$/, "\n");
  return {
    slug, titulo,
    nombre: mT ? mT[1] : titulo,
    activos: mT ? mT[3].trim() : "—",
    // El token puede llevar dígitos ("S3"): sin ellos la columna decía "S".
    transporte: ((cuerpo.match(/^\*\*Transporte:\*\*\s*([A-Za-z0-9ÁÉÍÓÚáéíóú]+)/m) || [])[1] || "API").toUpperCase(),
    // El propósito es la primera frase: alcanza para un índice y no obliga a abrir el capítulo.
    proposito: ((cuerpo.match(/^\*\*Propósito:\*\*\s*([\s\S]*?)(?:\.\s|\.\n)/m) || [])[1] || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
    cuerpo: degradar(cuerpo).replace(/^\s+/, ""),
  };
};

const specs = GRUPOS.flatMap((g) => g.specs.map(leer));
const hoy = new Date().toISOString().slice(0, 10);

// El consolidado tiene versión PROPIA: reúne a los doce, así que no puede heredar la de ninguno. Se
// declara acá y no en el .md porque el .md es generado — editarlo a mano lo pisa la próxima corrida.
const VERSION = "1.2.1";
const HISTORIAL = [
  ["1.2.1", "21-09-2026", "Rutas de los documentos citados, tras agrupar la documentación por carpetas."],
  ["1.2.0", "18-09-2026", "Correcciones del A16: D02–D13 son excepciones no re-evaluables y no bloqueos firmes, C47–C50 salen del catálogo y el tipo `porDeudor` lo declara la regla."],
  ["1.1.0", "17-09-2026", "V04 y V10 pasan a ser alcanzables con el A10, y las comparaciones del predictor van en pesos."],
  ["1.0.0", "16-09-2026", "Primera versión: reúne los doce specs de integración, ya sobre S3."],
];

const doc = [];
doc.push("# Integraciones — APIs y S3");
doc.push("");
doc.push(`**Propósito:** el contrato de las entregas que alimentan NEX Factoring y de las APIs que expone o consume. Reúne los ${specs.length} specs de \`Integraciones/\`, que siguen siendo la fuente de cada uno.`);
doc.push(`**Alcance:** ${specs.length} integraciones · generado el ${hoy}.`);
doc.push("");
doc.push(`**Versión ${VERSION} · ${HISTORIAL[0][1]} · NEX Factoring**`);
doc.push("");
doc.push("---");
doc.push("");
doc.push("## El patrón");
doc.push("");
doc.push("Todas las entregas siguen la misma forma: **el archivo se deposita en S3 → S3 avisa → el backoffice lo procesa y monta la tabla interna → los upserts intradía entran por la API A22**. La aplicación lee siempre la tabla interna y nunca consulta a Security en línea, así que una integración que no llega no deja la pantalla en blanco: deja el dato del día anterior, que es un estado que se puede explicar.");
doc.push("");
doc.push("El aviso reemplaza al cron: el procesamiento arranca cuando el archivo llega y no cuando el reloj lo permite, y como el `PutObject` de S3 es atómico desaparece el archivo a medio escribir que el SFTP dejaba ver — y con él el archivo centinela que había que acordar para taparlo.");
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

// El anexo cierra el documento, en hoja propia cuando sale a PDF.
doc.push("---");
doc.push("");
doc.push("## Anexo · Control de versiones");
doc.push("");
doc.push("**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.");
doc.push("");
doc.push("| Versión | Fecha | Qué cambió |");
doc.push("|---|---|---|");
HISTORIAL.forEach(([v, f, q], i) => doc.push(`| ${i === 0 ? `**${v}**` : v} | ${f} | ${q} |`));
doc.push("");

writeFileSync(SALIDA, doc.join("\n").replace(/\n{3,}/g, "\n\n"));
console.log(`OK: ${SALIDA} · ${specs.length} specs · ${doc.join("\n").split("\n").length} líneas`);
