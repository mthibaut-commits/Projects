/* Gate de contrato de la regla 73 (M-01, G-01: el acuse del receptor es una bandera del DTE que el A1 trae; `facturaDeDTE`
   la lee, la pantalla la muestra y ningún filtro la mira), sobre el TEXTO del fuente. Lo que se puede llamar por nombre lo
   prueba el caso 169 (`facturaDeDTE`, `streamDesdeDTE`, `facturasDelLibro`, «Buena factura», `estadoCandidata`,
   `acuseLabel`, `facturasDeCandidata`); lo que la suite no alcanza son los closures de React —que las tres filas del
   documento dibujen el chip— y lo que un nombre no dice: que «Sin acuse» exista en el fuente SÓLO como rótulo del valor
   del A1 y nunca como un sorteo, que el filtro de candidatura no lea `acuse`, y que el Excel de candidatas no lo invente.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const tramo = (can, desde, hasta, largo) => {
  const i = can.indexOf(desde);
  if (i < 0) return "";
  const j = hasta ? can.indexOf(hasta, i) : -1;
  return can.slice(i, j < 0 ? i + (largo || 3000) : j);
};

export function auditarRegla73(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · `facturaDeDTE` LEE el acuse del A1 en tres estados, con su fecha, sin derivar nada.
  const fd = tramo(can, "function facturaDeDTE(r) {", "function acuseLabel(f) {");
  if (!fd) fallos.push("no encuentro `facturaDeDTE` seguido de `acuseLabel`");
  else {
    if (!fd.includes('acuse: est.Reclamado === "1" ? "reclamada" : est.Aceptado != null && est.Aceptado !== "" ? "aceptada" : "sin_acuse",')) fallos.push("`facturaDeDTE` no lee el acuse del `EstadoDTE` en sus tres estados (o lo deriva de otra cosa)");
    if (!fd.includes('fchAcuse: est.Reclamado === "1" ? est.FchReclamo || null : est.FchAcuseRecibo || null,')) fallos.push("`facturaDeDTE` no lleva la fecha del acuse o del reclamo que el A1 trae");
    if (/hashStr\(|pcRng\(|Math\.random/.test(fd)) fallos.push("`facturaDeDTE` sortea: el acuse es un dato del documento");
  }
  // 2 · «Sin acuse» es un VALOR del A1 rotulado en un solo sitio, nunca un sorteo.
  const apar = can.match(/"Sin acuse"/g) || [];
  if (apar.length !== 1) fallos.push(`«Sin acuse» aparece ${apar.length} veces en el fuente: tiene que ser sólo el rótulo del valor del A1 (\`acuseLabel\`)`);
  const al = tramo(can, "function acuseLabel(f) {", "function ChipAcuse({f}) {");
  if (!al.includes('texto: "Sin acuse"') || !al.includes('texto: "Con acuse"') || !al.includes('texto: "Reclamada"')) fallos.push("`acuseLabel` no rotula los tres estados");
  const cand = tramo(can, "function facturasDeCandidata(cand, anclaISO) {", "async function exportarCandidatasXlsx(");
  if (!cand) fallos.push("no encuentro `facturasDeCandidata`");
  else if (/"Aceptada"|"Sin acuse"|"Reclamada"|estado:|const estado =/.test(cand)) fallos.push("`facturasDeCandidata` vuelve a sortear el acuse: es una bandera del DTE que sólo el A1 trae");
  if (can.includes('"Aceptada/Reclamada"')) fallos.push("el Excel de candidatas vuelve a llevar la columna inventada «Aceptada/Reclamada»");
  // 3 · La pantalla lo muestra: el chip en las tres filas del documento, y sin dato del A1 no afirma nada.
  const chips = (can.match(/<ChipAcuse f=\{f\} \/>/g) || []).length;
  if (chips < 3) fallos.push(`el chip del acuse está en ${chips} fila(s) del documento; van las tres (oferta, otras facturas, disponibles del detalle)`);
  const ch = tramo(can, "function ChipAcuse({f}) {", "// LIBRO DE VENTAS DEL CLIENTE");
  if (!ch.includes("if (!f || !f.acuse) return null;")) fallos.push("`ChipAcuse` afirma un acuse sin dato del A1 (XML a mano, fixtures)");
  if (!can.includes("acuse: f.acuse, fchAcuse: f.fchAcuse,")) fallos.push("el libro del asistente (`facturasDelLibro`) no lleva el acuse con el documento");
  // 4 · Ningún filtro lo mira: «Buena factura», `estadoCandidata` y el perfil de la Bandeja.
  const bf = tramo(can, '"Buena factura": (f) =>', null, 260);
  if (!bf || /acuse/.test(bf)) fallos.push("«Buena factura» lee el acuse: sin acuse la factura sigue siendo candidata (23-09-2026)");
  const ec = tramo(can, "function estadoCandidata(f, deal, estado) {", "function cesionDeFactura(");
  if (!ec) fallos.push("no encuentro `estadoCandidata`");
  else if (/acuse/.test(ec)) fallos.push("`estadoCandidata` bloquea por el acuse: sólo el reclamo, la NC, la cesión ajena y el veto bloquean");
  const cf = tramo(can, "function criteriosDesdeFactura(f) {", null, 1800);
  if (/acuse/.test(cf)) fallos.push("el perfil de la Bandeja nombra el acuse como criterio, y no lo es");
  return fallos;
}

test("regla 73: el acuse del receptor es una bandera del DTE que el A1 trae; facturaDeDTE la lee, la fila la muestra, ningún filtro la mira y nadie la sortea", () => {
  assert.deepEqual(auditarRegla73(jsx), []);
});

const MUTANTES = [
  ["facturaDeDTE deriva el acuse en vez de leerlo", (c) => c.replace('acuse: est.Reclamado === "1" ? "reclamada" : est.Aceptado != null && est.Aceptado !== "" ? "aceptada" : "sin_acuse",', 'acuse: hashStr(String(r.Folio)) % 10 < 9 ? "aceptada" : "sin_acuse",')],
  ["facturaDeDTE pierde la fecha del acuse", (c) => c.replace('fchAcuse: est.Reclamado === "1" ? est.FchReclamo || null : est.FchAcuseRecibo || null,', "fchAcuse: null,")],
  ["el Excel de candidatas vuelve a sortear el acuse", (c) => c.replace("const cedida = r() < pCede;", 'const u = r(); const estado = u < 0.9 ? "Aceptada" : u < 0.96 ? "Reclamada" : "Sin acuse"; const cedida = estado !== "Reclamada" && r() < pCede;')],
  ["la columna inventada vuelve al Excel", (c) => c.replace('"Monto", "Nota de crédito",', '"Monto", "Aceptada/Reclamada", "Nota de crédito",')],
  ["una fila del documento pierde el chip", (c) => c.replace("<ChipAcuse f={f} />", "")],
  ["el chip afirma «Sin acuse» sin dato", (c) => c.replace("if (!f || !f.acuse) return null;", "")],
  ["el libro del asistente pierde el acuse", (c) => c.replace("acuse: f.acuse, fchAcuse: f.fchAcuse,", "")],
  ["«Buena factura» filtra por el acuse", (c) => c.replace('"Buena factura": (f) => f.credito && !f.reclamada', '"Buena factura": (f) => f.credito && f.acuse === "aceptada" && !f.reclamada')],
  ["estadoCandidata bloquea sin acuse", (c) => c.replace('if (f.reclamada === true) return R("reclamada", "Reclamada por el deudor",', 'if (f.acuse === "sin_acuse") return R("sinAcuse", "Sin acuse todavía"); if (f.reclamada === true) return R("reclamada", "Reclamada por el deudor",')],
  ["el perfil de la Bandeja lo nombra como criterio", (c) => c.replace('if (cedidaAFactoringAjeno(f)) c.push("Cedida a otro factoring (excluida)");', 'if (f.acuse === "sin_acuse") c.push("Sin acuse (excluida)"); if (cedidaAFactoringAjeno(f)) c.push("Cedida a otro factoring (excluida)");')],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no cambió el fuente: el ancla ya no existe");
    assert.ok(auditarRegla73(mut).length > 0, "el gate no cazó la violación plantada");
  });
