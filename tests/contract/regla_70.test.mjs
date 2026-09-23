/* Gate de contrato de la regla 70 (ADR-0020: el A1 es un flujo de eventos por documento), sobre el TEXTO del fuente.
   Lo que se puede llamar por nombre lo prueba el caso 170 (`plegarDTE`, `documentosDTE`, `streamDesdeDTE`,
   `aplicarActualizacionDTE`, `aplicarActualizacionAEvento`); lo que la suite no alcanza es lo que un nombre no dice:
   que NADIE lea `window.DTESYNC` fuera del pliegue y del stream, que los ocho lectores pasen por `documentosDTE()`,
   que el pliegue del fuente sea EL MISMO que el del generador (`GeneradorDatos/lib/dtesync.js`: acá se extrae la
   función del fuente, se ejecuta en Node y se compara sobre el mismo log, ordenado y al revés), que el tick del
   inbound enrute las actualizaciones antes de clasificar y no las cuente como facturas, que sobre la oferta cerrada
   la NC o el reclamo dejen aviso sin tocar el documento, y que el contrato de datos declare el esquema 2 con los
   tres campos del envoltorio. Con sonda negativa por pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { RAIZ, leer, canonico } from "./_comun.mjs";

const require = createRequire(import.meta.url);
const { plegar } = require(join(RAIZ, "GeneradorDatos/lib/dtesync.js"));
const jsx = leer("pipeline_comercial.jsx");
const tramo = (can, desde, hasta, largo) => {
  const i = can.indexOf(desde);
  if (i < 0) return "";
  const j = hasta ? can.indexOf(hasta, i) : -1;
  return can.slice(i, j < 0 ? i + (largo || 3000) : j);
};

/* El pliegue del fuente, extraído del TEXTO CRUDO (no del canónico: la función lleva un comentario de línea) y
   ejecutado en Node. Devuelve null si no se encuentra o no compila. */
export function plegarDelFuente(src) {
  const ini = src.indexOf("function plegarDTE(eventos) {");
  const fin = src.indexOf("let _DOCS_DTE = null;", ini);
  if (ini < 0 || fin < 0) return null;
  try {
    return new Function(src.slice(ini, fin) + "\nreturn plegarDTE;")();
  } catch {
    return null;
  }
}

/* Un log plantado con lo que puede pasar: dos emisores con el mismo folio, un documento con tres eventos, uno con
   ninguno, una fila plana, y un evento sin identidad. */
export const LOG_PLANTADO = () => {
  const est = (x = {}) => ({ NotaCredito: null, FchNotaCredito: null, FolioNotaCredito: null, TipoDTERef: null, FolioDTERef: null, Aceptado: null, Reclamado: null, FchReclamo: null, FchRecepcion: "2026-06-23", FchAcuseRecibo: null, ...x });
  const cre = (rut, folio, emis) => ({ RUTEmisor: rut, RznSoc: "R " + rut, TipoDTE: "33", TipoDTEDesc: "Factura electronica", Folio: folio, FchEmis: emis, FchVenc: "2026-08-01", RUTRecep: "96.1-2", RznSocRecep: "D", MntTotal: 1000 + folio, EnlaceXml: "x", EnlacePdf: "p", FormaPago: "2", EmitidoRecibido: 1, Origen: "sii", EstadoDTE: est(), Servicio: "DTESync", Notificacion: "DTE_SINCRONIZADO", FchNotificacion: emis, Secuencia: 1, Extras: null });
  const act = (rut, folio, seq, fecha, x) => ({ RUTEmisor: rut, TipoDTE: "33", Folio: folio, EstadoDTE: est(x), Servicio: "DTESync", Notificacion: "DTE_ACTUALIZADO", FchNotificacion: fecha, Secuencia: seq, Extras: null });
  return [
    cre("1-9", 7, "2026-06-01"),
    cre("2-7", 7, "2026-06-02"),
    act("1-9", 7, 2, "2026-06-03", { Aceptado: "2", FchAcuseRecibo: "2026-06-03" }),
    cre("1-9", 5, "2026-06-04"),
    act("1-9", 7, 3, "2026-06-05", { Aceptado: "2", FchAcuseRecibo: "2026-06-03", NotaCredito: "1", FchNotaCredito: "2026-06-05", FolioNotaCredito: 500007 }),
    { RUTEmisor: "3-5", RznSoc: "Plana", TipoDTE: "33", Folio: 9, FchEmis: "2026-06-06", MntTotal: 9, EstadoDTE: est({ Reclamado: "1", FchReclamo: "2026-06-08" }), Servicio: "DTESync", Notificacion: "DTE_SINCRONIZADO", Extras: null },
    act("2-7", 7, 2, "2026-06-07", { Reclamado: "1", FchReclamo: "2026-06-07" }),
    null,
    { Folio: 11 },
  ];
};

export function auditarRegla70(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · `window.DTESYNC` se lee en DOS sentencias de código —el pliegue y el stream— y se nombra en un comentario;
  //     nada más. Se quitan las dos sentencias del texto y lo que queda tiene que ser sólo el comentario.
  const PLIEGUE = canonico('_DOCS_DTE = plegarDTE((typeof window !== "undefined" && Array.isArray(window.DTESYNC) && window.DTESYNC) || []);');
  const STREAM = canonico('if (typeof window !== "undefined" && Array.isArray(window.DTESYNC) && window.DTESYNC.length) return sesgarACedentesConLinea(streamDesdeDTE(window.DTESYNC));');
  if (!can.includes(PLIEGUE)) fallos.push("`documentosDTE` no pliega el log con `plegarDTE`");
  if (!can.includes(STREAM)) fallos.push("el stream no recorre el log entero (`streamDesdeDTE(window.DTESYNC)`)");
  const resto = (can.replace(PLIEGUE, "").replace(STREAM, "").match(/window\.DTESYNC/g) || []).length;
  if (resto !== 1) fallos.push(`\`window.DTESYNC\` se lee en ${resto} sitio(s) fuera del pliegue y del stream (va sólo el comentario que lo explica); un lector nuevo del log tiene que pasar por documentosDTE()`);
  // 2 · Los lectores pliegan: cada uno itera `documentosDTE()`.
  const lectores = [
    ["corteDTE", "function corteDTE() {", "const corteMs = "],
    ["libroPorEmisor", "function libroPorEmisor() {", "for (const a of _libroEmisor.values())"],
    ["OTRO_FOP_POR_CEDENTE", "const OTRO_FOP_POR_CEDENTE = (() => {", "// Cap por cedente"],
    ["SENALES_CLIENTE", "const SENALES_CLIENTE = (() => {", "const senalesDe = "],
    ["RUT_DEUDOR_POR_NOMBRE", "const RUT_DEUDOR_POR_NOMBRE = (() => {", "function apiVarsCliente("],
    ["PC_CLIENTES", "const PC_CLIENTES = (() => {", "const vistos = new Map();"],
    ["paresPorEmisor", "function paresPorEmisor() {", "for (const [rut, g] of m)"],
  ];
  for (const [nombre, desde, hasta] of lectores) {
    const t = tramo(can, canonico(desde), canonico(hasta), 1500);
    if (!t) fallos.push(`no encuentro \`${nombre}\``);
    else if (!/documentosDTE\(\)/.test(t)) fallos.push(`\`${nombre}\` no lee los documentos plegados (documentosDTE())`);
  }
  // 3 · El pliegue del fuente es el del generador: mismo resultado sobre el mismo log, en orden y al revés.
  const plegarDTE = plegarDelFuente(src);
  if (!plegarDTE) fallos.push("no puedo extraer y ejecutar `plegarDTE` del fuente");
  else {
    const log = LOG_PLANTADO();
    const a = JSON.stringify(plegarDTE(log)), b = JSON.stringify(plegar(log));
    if (a !== b) fallos.push("`plegarDTE` (fuente) y `plegar` (GeneradorDatos/lib/dtesync.js) pliegan distinto el mismo log");
    const r = [...log].reverse();
    if (JSON.stringify(plegarDTE(r)) !== a) fallos.push("`plegarDTE` depende del orden de llegada: un evento atrasado pisa uno más nuevo");
    if (plegarDTE(log).length !== 4) fallos.push("`plegarDTE` no deja un documento por (emisor, folio)");
  }
  // 4 · El stream separa la actualización de la factura nueva.
  const st = tramo(can, canonico("function streamDesdeDTE(dte) {"), canonico("const fac = facturaDeDTE(r);"), 600);
  if (!st.includes(canonico('if ((+r.Secuencia || 1) > 1 && !("FchEmis" in r)) { out.push(eventoActualizacionDTE(r, i)); continue; }'))) fallos.push("`streamDesdeDTE` trata una actualización como factura nueva, o un documento plegado como actualización");
  const ea = tramo(can, canonico("function eventoActualizacionDTE(r, i) {"), canonico("const glosaCambioDTE = "), 1200);
  if (!ea.includes(canonico("const est = estadoDeDTE(r.EstadoDTE || {});")) || !ea.includes('tipo: "actualizacion"')) fallos.push("`eventoActualizacionDTE` no lee el estado con `estadoDeDTE` o no se marca como actualización");
  const fd = tramo(can, canonico("function facturaDeDTE(r) {"), canonico("function estadoDeDTE(est) {"), 2500);
  if (!fd.includes(canonico("...estadoDeDTE(est),")) || !fd.includes(canonico("secuenciaDTE: +r.Secuencia || 1,"))) fallos.push("`facturaDeDTE` no lee el estado por `estadoDeDTE` o no lleva la secuencia del A1");
  // 5 · El tick enruta antes de clasificar y no cuenta las actualizaciones como facturas.
  const tk = tramo(can, canonico("const lote = streamQueue.slice(0, STREAM_LOTE);"), canonico("}, 350);"), 6000);
  if (!tk) fallos.push("no encuentro el tick del stream");
  else {
    const iAct = tk.indexOf(canonico('const actualizaciones = lote.filter((e) => e && e.tipo === "actualizacion");'));
    const iFor = tk.indexOf(canonico("for (const f of facturas) {"));
    if (iAct < 0 || iFor < 0 || iAct > iFor) fallos.push("el tick clasifica las actualizaciones del A1 como facturas (no las separa antes del bucle)");
    if (!tk.includes(canonico("if (actualizaciones.length) aplicarActualizacionesDTE(actualizaciones);"))) fallos.push("el tick no aplica las actualizaciones");
    if (!tk.includes(canonico("setRecibidas((n) => n + facturas.length);"))) fallos.push("«facturas recibidas» cuenta eventos y no documentos");
    if (/for \(const f of lote\)/.test(tk)) fallos.push("el bucle de clasificación recorre el lote entero, actualizaciones incluidas");
  }
  // 6 · Sobre la oferta cerrada, la NC o el reclamo se aplican Y la inhabilitan (regla 71 fija el resto).
  const ap = tramo(can, canonico("function aplicarActualizacionDTE(deal, ev) {"), canonico("function aplicarEventosADeal("), 5000);
  if (!ap) fallos.push("no encuentro `aplicarActualizacionDTE`");
  else {
    if (!ap.includes(canonico("if (bloquea && paqueteCerrado) {"))) fallos.push("`aplicarActualizacionDTE` no distingue la oferta cerrada");
    if (!ap.includes(canonico("inhabilitada: { motivo: ev.cambio, glosa: glosaCambioDTE(ev), secuencia: ev.secuencia, fecha: ev.fchNotificacion || null }"))) fallos.push("sobre la oferta cerrada el documento no queda marcado `inhabilitada` con su secuencia (se repetiría en cada re-entrega)");
    if (!ap.includes("queda inhabilitado y la operación no se cursa")) fallos.push("la traza de la inhabilitación perdió su texto");
    if (!ap.includes(canonico("const paqueteCerrado = ofertaCerradaVigente(deal) || ofertaPublicada(deal) ||"))) fallos.push("«paquete cerrado» no mira el cierre, la publicación y las etapas posteriores a la firma");
  }
  // 7 · El contrato de datos: esquema 2 con el envoltorio del evento.
  const ct = tramo(can, canonico('coleccion: "DTESYNC",'), canonico('coleccion: "AECSYNC"'), 500);
  if (!ct.includes("esquema: 2") || !/"Notificacion", "FchNotificacion", "Secuencia"/.test(ct)) fallos.push("`CONTRATOS_DATOS` no declara el A1 como flujo de eventos (esquema 2 con Notificacion, FchNotificacion y Secuencia)");
  return fallos;
}

test("regla 70: el A1 es un flujo de eventos que se pliega en un solo sitio, con el mismo pliegue que el generador; el stream y el tick separan las actualizaciones; la oferta cerrada distingue la inhabilitación", () => {
  assert.deepEqual(auditarRegla70(jsx), []);
});

/* Las sondas se plantan sobre el texto CRUDO (la función extraída lleva un comentario de línea, y `canonico` la
   rompería); `auditarRegla70` canoniza por dentro. */
const MUTANTES = [
  ["un lector vuelve a leer el log directo", (s) => s.replace("  _libroEmisor = new Map();\n  for (const r of documentosDTE()) {", '  _libroEmisor = new Map();\n  for (const r of (typeof window !== "undefined" && Array.isArray(window.DTESYNC) ? window.DTESYNC : [])) {')],
  ["el pliegue deja ganar al evento atrasado", (s) => s.replace("(+e.Secuencia || 1) >= (+prev.Secuencia || 1) ? { ...prev, ...e } : { ...e, ...prev }", "{ ...prev, ...e }")],
  ["el pliegue pierde documentos (clave sólo por folio)", (s) => s.replace('const k = e.RUTEmisor + "|" + e.Folio;\n    const prev = docs.get(k);', "const k = String(e.Folio);\n    const prev = docs.get(k);")],
  ["el stream trata la actualización como factura nueva", (s) => s.replace('    if ((+r.Secuencia || 1) > 1 && !("FchEmis" in r)) {\n      out.push(eventoActualizacionDTE(r, i));\n      continue;\n    }\n    const fac = facturaDeDTE(r);', "    const fac = facturaDeDTE(r);")],
  ["el stream trata un documento plegado como actualización", (s) => s.replace('if ((+r.Secuencia || 1) > 1 && !("FchEmis" in r)) {', "if ((+r.Secuencia || 1) > 1) {")],
  ["el tick clasifica las actualizaciones", (s) => s.replace("      for (const f of facturas) {\n        const ds = deudorStatsRef.current;", "      for (const f of lote) {\n        const ds = deudorStatsRef.current;")],
  ["el tick no aplica las actualizaciones", (s) => s.replace("      if (actualizaciones.length) aplicarActualizacionesDTE(actualizaciones);\n", "")],
  ["«recibidas» cuenta eventos", (s) => s.replace("setRecibidas((n) => n + facturas.length);", "setRecibidas((n) => n + lote.length);")],
  ["la oferta cerrada se parcha igual", (s) => s.replace("    if (bloquea && paqueteCerrado) {", "    if (false) {")],
  ["la inhabilitación no queda marcada y se repetiría", (s) => s.replace("const marcado = { ...nf, inhabilitada: {", "const marcado = { ...nf, marca: {")],
  ["facturaDeDTE deja de leer el estado por estadoDeDTE", (s) => s.replace("    ...estadoDeDTE(est),\n", '    reclamada: est.Reclamado === "1",\n')],
  ["el contrato vuelve al esquema 1", (s) => s.replace('    coleccion: "DTESYNC",\n    esquema: 2,', '    coleccion: "DTESYNC",\n    esquema: 1,')],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const mut = mutar(jsx);
    assert.notEqual(mut, jsx, "la sonda no cambió el fuente: el ancla ya no existe");
    assert.ok(auditarRegla70(mut).length > 0, "el gate no cazó la violación plantada");
  });

test("sonda negativa: el pliegue del fuente y el del generador se comparan de verdad (un log distinto da otro resultado)", () => {
  const plegarDTE = plegarDelFuente(jsx);
  assert.ok(plegarDTE, "no se pudo extraer plegarDTE");
  const log = LOG_PLANTADO();
  assert.equal(JSON.stringify(plegarDTE(log)), JSON.stringify(plegar(log)));
  assert.notEqual(JSON.stringify(plegarDTE(log.slice(0, 3))), JSON.stringify(plegar(log)));
});
