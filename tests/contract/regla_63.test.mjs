/* Gate de contrato de la regla 63 (precedencia del lenguaje visual), sobre el TEXTO del fuente.
   La regla nació el 18-09-2026 al instalar skills de diseño de terceros —taste-skill (brutalist,
   minimalist, soft…) y la colección DESIGN.md de awesome-design-md—: aportan COMPOSICIÓN, nunca TOKENS.
   Un token foráneo no rompe nada visible el día que entra; simplemente aparece un color que no está en
   `C` y la pantalla deja de ser Datamart en un rincón, que es exactamente cómo se pierde un sistema de
   diseño. Es el agujero de `t14`/`t16` otra vez: no falla, sale distinto y nadie lo ve.

   DOS gates, de las dos clases que pide `.claude/rules/testing.md`:
   · SNAPSHOT — `BASE_PALETA`, los hex de seis dígitos que el fuente tenía el 18-09-2026. Uno nuevo
     rompe: o entró un token de afuera, o es un color propio que se decidió agregar y entonces la línea
     base sube EN EL COMMIT, como las de `auditores.test.mjs`. Uno que desaparece también rompe, a
     propósito. No cuenta apariciones: 1728 usos de 133 colores no dicen nada, el conjunto sí.
   · REGLA — nunca se actualiza: no hay `DESIGN.md` en la raíz del repo. Un DESIGN.md ahí es, por
     convención de Google Stitch, «cómo debe verse ESTE proyecto», y este proyecto ya tiene su lenguaje
     (la paleta `C`, la escala t7–t15, la skill datamart-ui y ADR que no se re-litigan). Dejarlo caer no
     agrega una referencia: la contradice en silencio. Desde el 23-09-2026 las referencias externas no se versionan
   en el repo, y las skills de terceros que motivaron la regla salieron con ellas (ADR-0022). */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { leer, RAIZ } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Los hex de SEIS dígitos del fuente, normalizados y únicos. Los de tres (#fff) no se listan: no existen
   en el fuente y sumarlos ensuciaría la línea base sin vigilar nada. */
export function paletaDelFuente(texto) {
  return [...new Set((texto.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => c.toLowerCase()))].sort();
}

/* Diferencia contra la línea base, en los dos sentidos. */
export function diffPaleta(texto, base = BASE_PALETA) {
  const hoy = paletaDelFuente(texto);
  return { entraron: hoy.filter((c) => !base.includes(c)), salieron: base.filter((c) => !hoy.includes(c)) };
}

/* La raíz del repo no lleva DESIGN.md. Recibe la lista de archivos para poder plantarle uno a la sonda. */
export function designMdEnRaiz(archivos) {
  return archivos.filter((f) => /^DESIGN\.md$/i.test(f));
}

export const BASE_PALETA = [
  "#0078d4", "#00a4ef", "#050015", "#065f46", "#075e54", "#0891b2",
  "#0a7d3f", "#0b0426", "#0d9488", "#0e7490", "#0ea5e9", "#0f766e",
  "#111b21", "#115e59", "#128c7e", "#14093a", "#14b8a6", "#166534",
  "#16a34a", "#1976d2", "#1e40af", "#22d3ee", "#230c65", "#232272",
  "#2563eb", "#25d366", "#316094", "#333840", "#334155", "#34b7f1",
  "#374151", "#4b5563", "#4c1d95", "#4f46e5", "#53bdeb", "#58606e",
  "#5b21d6", "#5f29e6", "#64748b", "#667781", "#66ad82", "#6a2e92",
  "#6b7280", "#703eff", "#7c3a10", "#7c3aed", "#7c7a85", "#7f90af",
  "#7fba00", "#86efac", "#8a63ff", "#8b5cf6", "#8f6bff", "#92400e",
  "#9a3412", "#9ca3af", "#9e9ca6", "#a99cf2", "#ada8bd", "#b4b2bc",
  "#b4bac2", "#b79cff", "#b91c1c", "#bbf7d0", "#bfdbfe", "#c2410c",
  "#c2557f", "#c4b5fd", "#c8d1e0", "#ca8a04", "#ccfbf1", "#d1d5db",
  "#d9ccff", "#d9fdd3", "#db2777", "#dcf8c6", "#dcfce7", "#dda0bd",
  "#ddd3ff", "#ddd6fe", "#dde3ed", "#e4af84", "#e4dbff", "#e4e2ec",
  "#e4e3e9", "#e5ddd5", "#e5e7eb", "#e7e0fb", "#e7e4f0", "#e9f2ff",
  "#ea580c", "#ebeff5", "#ece5dd", "#ecebef", "#ececf1", "#ecfeff",
  "#edecf3", "#edeef1", "#ee2eff", "#eef3ff", "#ef4444", "#efeae2",
  "#eff6ff", "#f0eff3", "#f0fdf4", "#f0fdfa", "#f1ecff", "#f25022",
  "#f3d8b6", "#f3f2f7", "#f3f4f6", "#f5f3ff", "#f5f4f8", "#f5f7fa",
  "#f7f7fa", "#f8fbff", "#f97316", "#f9fafb", "#faf5ff", "#faf9fb",
  "#fafafb", "#fca5a5", "#fcfcfd", "#fdba74", "#fde68a", "#fecaca",
  "#fed7aa", "#fef2f2", "#fef3c7", "#fef7f7", "#ff814b", "#ffb4b4",
  "#ffb900", "#ffd2ae", "#fff7ed", "#fffbeb", "#ffffff",
];

test("ningún color foráneo entró al fuente: la paleta es la línea base (skills de diseño de terceros aportan composición, no tokens)", () => {
  const d = diffPaleta(jsx);
  assert.deepEqual(d.entraron, [], "colores nuevos en el fuente. Si vienen de una referencia externa (un DESIGN.md, brutalist/minimalist/soft), NO entran: el token sale del objeto C. Si es un color propio decidido, sube BASE_PALETA en este commit y dilo en el mensaje");
  assert.deepEqual(d.salieron, [], "colores que desaparecieron: encoger la línea base también es una decisión y va en el commit");
});

test("la raíz del repo no tiene DESIGN.md: el lenguaje visual de este proyecto es datamart-ui, no el de una referencia", () => {
  assert.deepEqual(designMdEnRaiz(readdirSync(RAIZ)), []);
});

test("sonda negativa: un token foráneo plantado en el fuente lo caza el gate, y también uno que se borra", () => {
  // (1) el indigo de Stripe, tal como viene en su DESIGN.md de la colección
  const conForaneo = jsx + '\nconst _sonda = { primary: "#533afd" };\n';
  assert.deepEqual(diffPaleta(conForaneo).entraron, ["#533afd"]);
  assert.deepEqual(diffPaleta(conForaneo).salieron, []);
  // (2) mayúsculas y minúsculas son el MISMO token: plantar #703EFF no puede leerse como color nuevo
  assert.deepEqual(diffPaleta(jsx + '\nconst _s2 = "#703EFF";\n').entraron, []);
  // (3) borrar un color de la línea base también rompe
  assert.ok(BASE_PALETA.includes("#703eff"), "el púrpura de marca tiene que estar en la línea base");
  assert.deepEqual(diffPaleta(jsx, BASE_PALETA.concat("#abcdef")).salieron, ["#abcdef"]);
  // (4) el fuente de hoy, contra su propia línea base, no mueve nada
  assert.deepEqual(diffPaleta(jsx), { entraron: [], salieron: [] });
});

test("sonda negativa: un DESIGN.md plantado en la raíz lo caza el gate", () => {
  assert.deepEqual(designMdEnRaiz(["CLAUDE.md", "DESIGN.md", "README.md"]), ["DESIGN.md"]);
  assert.deepEqual(designMdEnRaiz(["CLAUDE.md", "README.md", "Skills"]), []);
});
