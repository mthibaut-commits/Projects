/* Gate de contrato de la regla 71 (ADR-0021: la NC, el reclamo o la cesión a otro sobre una oferta cerrada, publicada o
   firmada INHABILITAN el documento y dejan la operación no cursable; el ejecutivo retira, re-evalúa y vuelve a publicar
   para una nueva firma), sobre el TEXTO del fuente. Lo que se puede llamar por nombre lo prueba el caso 171
   (`aplicarActualizacionDTE`, `aplicarEventosADeal`, `verifResumenDeal`, `issueVerificacion`, `controlesIntegracion`,
   `estadoCandidata`, `avisarNoVerificadas`); lo que la suite no alcanza son los closures de React: que el tick escriba el
   veto por el ÚNICO escritor (`marcarNoVerificada`, regla 67) y FUERA del updater, que ese escritor firme como el SII,
   que la tarjeta del tubo, VER-01 y la fila de la oferta lo digan, y que el detalle abierto relea el veto que escribió
   el tubo. Con sonda negativa por pieza. */
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

export function auditarRegla71(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · La decisión pura: sobre la oferta cerrada el documento queda con su estado nuevo y marcado `inhabilitada`.
  const ap = tramo(can, canonico("function aplicarActualizacionDTE(deal, ev) {"), canonico("function aplicarEventosADeal("), 5000);
  if (!ap) fallos.push("no encuentro `aplicarActualizacionDTE`");
  else {
    if (!ap.includes(canonico("const bloquea = !!(ev.estado && (ev.estado.notaCredito || ev.estado.reclamada || ev.estado.cedida));"))) fallos.push("la NC, el reclamo y la cesión a otro no son los tres motivos que inhabilitan");
    if (!ap.includes(canonico("const marcado = { ...nf, inhabilitada: { motivo: ev.cambio, glosa: glosaCambioDTE(ev), secuencia: ev.secuencia, fecha: ev.fchNotificacion || null } };"))) fallos.push("sobre la oferta cerrada el documento no queda marcado `inhabilitada` con su motivo, su glosa y su secuencia");
    if (!ap.includes(canonico('cambio = { donde: "inhabilitada", folio: ev.folio, cambio: ev.cambio, factura: marcado };'))) fallos.push("la decisión no devuelve el documento inhabilitado: el tick no tendría con qué escribir el veto");
    if (!ap.includes("queda inhabilitado y la operación no se cursa")) fallos.push("la traza de la inhabilitación no dice que la operación no se cursa");
    if (/avisoDTE/.test(ap)) fallos.push("la oferta cerrada vuelve a recibir sólo un aviso (`avisoDTE`) en vez de la inhabilitación");
  }
  // 2 · El tick escribe el veto por el único escritor y FUERA del updater.
  const tk = tramo(can, canonico("const aplicarActualizacionesDTE = (acts) => {"), canonico("setSelected((s) => (s ? aplicarEventosADeal(s, evs).deal : s));"), 4000);
  if (!tk) fallos.push("no encuentro `aplicarActualizacionesDTE`");
  else {
    const iVeto = tk.indexOf(canonico('marcarNoVerificada(d.id, facs, { origen: "sii", motivoLbl:'));
    const iUpd = tk.indexOf(canonico("setDeals((prev) => {"));
    if (iVeto < 0) fallos.push("el tick no escribe el veto del SII por `marcarNoVerificada` (regla 67: un solo escritor)");
    else if (iUpd < 0 || iVeto > iUpd) fallos.push("el tick escribe el veto dentro del updater de `setDeals` (regla 22: un updater puede correr dos veces)");
    if (!tk.includes(canonico("for (const d of dealsRef.current || []) {"))) fallos.push("las inhabilitaciones no se deciden sobre la foto vigente del tubo");
  }
  if ((can.match(/repoNoConfirmadas\.set\(/g) || []).length !== 1) fallos.push("el veto tiene más de un escritor (o ninguno): la regla 67 exige uno solo");
  // 3 · El escritor firma como el SII y anota el origen.
  const mk = tramo(can, canonico("const marcarNoVerificada = (id, facs, gestion) => {"), canonico("const verificarDeudor = async (fila, confirmadas, llamada) => {"), 4000);
  if (!mk) fallos.push("no encuentro `marcarNoVerificada`");
  else {
    if (!mk.includes(canonico('const porSII = !!(gestion && gestion.origen === "sii");'))) fallos.push("`marcarNoVerificada` no distingue el origen «sii»");
    if (!mk.includes(canonico("por: porSII ? ACTOR_SII : actorEtiqueta(usuario),"))) fallos.push("el veto del SII queda firmado por el usuario de la sesión y no por el servicio");
    if (!mk.includes(canonico('origen: "sii"'))) fallos.push("el veto del SII no anota su origen: la candidata y el issue no podrían decir por qué");
    if (!mk.includes("inhabilitó")) fallos.push("la bitácora de otorgamiento no dice que el SII inhabilitó el documento");
  }
  // 4 · El resumen cuenta el documento vetado como pendiente aunque la llamada esté en verde, y nombra el origen.
  const vr = tramo(can, canonico("function verifResumenDeal(deal, estado) {"), canonico("function issueVerificacion(deal, estado) {"), 3000);
  if (!vr) fallos.push("no encuentro `verifResumenDeal`");
  else {
    const iVet = vr.indexOf(canonico("if (noConfirmada(deal, f, estado && estado.vetadas)) { tel++; pend++; return; }"));
    const iVf = vr.indexOf(canonico("const vf = verifFactura(f, deal, estado);"));
    if (iVet < 0 || iVf < 0 || iVet > iVf) fallos.push("`verifResumenDeal` no cuenta el documento vetado como pendiente antes de mirar la llamada: con la llamada en verde, VER-01 dejaría cursar un documento que el deudor no va a pagar");
    if (!vr.includes(canonico('sii: noVerificadas.filter((x) => x.origen === "sii").length'))) fallos.push("`verifResumenDeal` no cuenta las vetadas por el SII");
  }
  // 5 · El issue, la candidata, el aviso, VER-01, la tarjeta y la fila lo dicen.
  const iss = tramo(can, canonico("function issueVerificacion(deal, estado) {"), "// ── MESA DE VERIFICACIÓN", 3500);
  if (!iss.includes('"Documentos inhabilitados por el SII: no se puede cursar"') || !iss.includes('"Facturas no verificadas e inhabilitadas por el SII: no se puede cursar"')) fallos.push("`issueVerificacion` no titula lo que el SII inhabilitó");
  if (!iss.includes("documento(s) inhabilitado(s) por el SII:")) fallos.push("`issueVerificacion` no nombra aparte los documentos inhabilitados con su motivo");
  const ec = tramo(can, canonico("function estadoCandidata(f, deal, estado) {"), canonico("function cesionDeFactura("), 3000);
  if (!ec.includes(canonico('R("inhabilitada", "Inhabilitada por el SII",'))) fallos.push("`estadoCandidata` no etiqueta la inhabilitada por el SII");
  if (!ec.includes(canonico("const veto = vetoDe(deal, f, estado && estado.vetadas);"))) fallos.push("`estadoCandidata` no lee la entrada del veto (no sabría quién lo escribió)");
  const av = tramo(can, canonico("function avisarNoVerificadas(deal, facs, motivo) {"), canonico("function excepcionesSinComentario(deal) {"), 3000);
  if (!av.includes("Documentos inhabilitados por el SII · ${deal.id}")) fallos.push("el aviso al ejecutivo no lleva el asunto del SII");
  if (!av.includes("no va a pagar")) fallos.push("el aviso no dice por qué el documento está inhabilitado");
  if (!can.includes("inhabilitada(s) por el SII: reclamo, nota de crédito o cesión a otro, regla 71")) fallos.push("VER-01 no nombra las inhabilitadas por el SII");
  if (!can.includes(canonico("No se puede cursar · {iss.n} no verificada(s){iss.sii ? ` · ${iss.sii} por el SII` : \"\"}"))) fallos.push("la tarjeta del tubo no dice cuántas inhabilitó el SII");
  if (!can.includes(canonico("if (f && f.inhabilitada) return `Inhabilitada por el SII · ${f.inhabilitada.glosa}`;"))) fallos.push("la fila de la oferta no rotula el documento inhabilitado con su motivo");
  // 6 · El detalle abierto relee el veto que escribió el tubo.
  const st = tramo(can, canonico("const onStorageVeto = (e) => {"), canonico("const onStorage = (e) => {"), 600);
  if (!st.includes(canonico('if (!e || e.key !== "pc_repo_" + repoNoConfirmadas.nombre) return;')) || !st.includes(canonico("repoNoConfirmadas.recargar(); NO_CONFIRMADAS = repoNoConfirmadas.all();"))) fallos.push("el detalle no relee el veto cuando otra pestaña lo escribe");
  if (!can.includes(canonico('window.addEventListener("storage", onStorageVeto);'))) fallos.push("el oyente del veto no está registrado");
  return fallos;
}

test("regla 71: sobre la oferta cerrada, publicada o firmada la NC, el reclamo o la cesión a otro inhabilitan el documento; el veto lo escribe el SII por el único escritor, cuenta como pendiente aunque la llamada esté en verde, y el issue, VER-01, la candidata, el aviso, la tarjeta y la fila lo dicen", () => {
  assert.deepEqual(auditarRegla71(jsx), []);
});

const MUTANTES = [
  ["la cesión a otro deja de inhabilitar", (c) => c.replace("const bloquea = !!(ev.estado && (ev.estado.notaCredito || ev.estado.reclamada || ev.estado.cedida));", "const bloquea = !!(ev.estado && (ev.estado.notaCredito || ev.estado.reclamada));")],
  ["la oferta cerrada no marca la inhabilitación", (c) => c.replace("const marcado = {...nf, inhabilitada: {motivo: ev.cambio,", "const marcado = {...nf, marca: {motivo: ev.cambio,")],
  ["la decisión no devuelve el documento", (c) => c.replace('cambio = {donde: "inhabilitada", folio: ev.folio, cambio: ev.cambio, factura: marcado};', 'cambio = {donde: "inhabilitada", folio: ev.folio, cambio: ev.cambio};')],
  ["la traza calla", (c) => c.replace("queda inhabilitado y la operación no se cursa", "queda anotado")],
  ["el tick no escribe el veto", (c) => c.replace('marcarNoVerificada(d.id, facs, {origen: "sii", motivoLbl:', 'console.log(d.id, facs, {origen: "sii", motivoLbl:')],
  ["el tick escribe el veto dentro del updater", (c) => c.replace("for (const d of dealsRef.current || []) {", "for (const d of []) {").replace("setDeals((prev) => {let toco = false; const out = prev.map((d) => {const r = aplicarEventosADeal(d, evs); if (r.deal !== d) toco = true; return r.deal;});", 'setDeals((prev) => {let toco = false; const out = prev.map((d) => {const r = aplicarEventosADeal(d, evs); if (r.inhabilitadas.length) marcarNoVerificada(d.id, r.inhabilitadas.map((x) => x.factura), {origen: "sii", motivoLbl: "x"}); if (r.deal !== d) toco = true; return r.deal;});')],
  ["el escritor firma como el usuario", (c) => c.replace("por: porSII ? ACTOR_SII : actorEtiqueta(usuario),", "por: actorEtiqueta(usuario),")],
  ["el escritor no anota el origen", (c) => c.replace('...(porSII ? {origen: "sii", cambio: (fac.inhabilitada && fac.inhabilitada.motivo) || null} : {})', "...{}")],
  ["un segundo escritor del veto", (c) => c.replace("repoNoConfirmadas.recargar(); NO_CONFIRMADAS = repoNoConfirmadas.all();", "repoNoConfirmadas.set(id, {}); NO_CONFIRMADAS = repoNoConfirmadas.all();")],
  ["el resumen deja cursar con la llamada en verde", (c) => c.replace("if (noConfirmada(deal, f, estado && estado.vetadas)) {tel++; pend++; return;}", "")],
  ["el issue no titula lo del SII", (c) => c.replace('"Documentos inhabilitados por el SII: no se puede cursar"', '"Facturas no verificadas: no se puede cursar"')],
  ["la candidata no dice por qué", (c) => c.replace('R("inhabilitada", "Inhabilitada por el SII",', 'R("noConfirmada", "El deudor no la confirmó",')],
  ["el aviso pierde el asunto del SII", (c) => c.replace("Documentos inhabilitados por el SII · ${deal.id}", "Verificación fallida · ${deal.id}")],
  ["VER-01 calla", (c) => c.replace("inhabilitada(s) por el SII: reclamo, nota de crédito o cesión a otro, regla 71", "")],
  ["la fila de la oferta no rotula", (c) => c.replace("if (f && f.inhabilitada) return `Inhabilitada por el SII · ${f.inhabilitada.glosa}`;", "")],
  ["el detalle no relee el veto", (c) => c.replace('window.addEventListener("storage", onStorageVeto);', "")],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no cambió el fuente: el ancla ya no existe");
    assert.ok(auditarRegla71(mut).length > 0, "el gate no cazó la violación plantada");
  });
