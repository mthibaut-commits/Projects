/* Gate de contrato de la regla 72 (ADR-0013: UN evento de evaluación corre los cinco motores y emite una versión con
   cinco secciones o ninguna; la primera simulación emite la v1; el pricing versiona el modo de tasa y las condiciones),
   sobre el TEXTO del fuente. Lo que se puede llamar por nombre lo prueba el caso 168 (`evaluarOperacion`, `versionCompleta`,
   `contarVersiones`, `snapVersionCli` con sus cinco secciones, el motor caído, el pricing, el comité, `reevaluarCliente`);
   lo que la suite no alcanza son los closures de React: que «Simular la oferta» dispare el evento ANTES de escribir el
   negocio, que «Re-evaluar operación» sea el mismo evento y la pestaña del detalle lo reciba, que no quede ningún emisor
   de versión fuera del evento y del comité, que la regularización del origen la pida sólo la re-evaluación de la
   simulación, y que el anuncio de un recálculo que no ocurre (G-09) no vuelva.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

const tramo = (can, desde, hasta, largo) => {
  const i = can.indexOf(desde);
  if (i < 0) return "";
  const j = hasta ? can.indexOf(hasta, i) : -1;
  return can.slice(i, j < 0 ? i + (largo || 4000) : j);
};

export function auditarRegla72(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · La versión es la tupla de los cinco motores, y la emite UN evento que la rechaza a medias.
  if (!can.includes('const MOTORES_VERSION = ["res", "verificacion", "linea", "giro", "pricing"];')) fallos.push("`MOTORES_VERSION` ya no nombra los cinco motores");
  if (!can.includes("nRech, linea, verificacion, giro, pricing, motoresFallidos: fallidos, politica:")) fallos.push("`snapVersionCli` ya no devuelve las cinco secciones con los motores fallidos");
  const ev = tramo(can, "function evaluarOperacion(deal, usuario, opts) {", "function reevaluarCliente(deal, usuario) {");
  if (!ev) fallos.push("no existe `evaluarOperacion`: no hay evento de evaluación");
  else {
    const iRech = ev.indexOf("if (!versionCompleta(nv)) {");
    const iPush = ev.indexOf("repoSimVersions.push(deal.id, nv);");
    if (iRech < 0 || iPush < 0 || iPush < iRech) fallos.push("el evento emite sin comprobar que la versión esté completa: quedaría una versión a medias");
    if (!/return \{ok: false, motivo: "motor_fallido"/.test(ev)) fallos.push("el evento no devuelve el rechazo por motor fallido");
    if (!ev.includes("Evaluación fallida")) fallos.push("la evaluación fallida no queda escrita en la bitácora ni en la auditoría");
    if ((ev.match(/repoSimVersions\.push\(/g) || []).length !== 1) fallos.push("el evento empuja más de una versión (o ninguna)");
  }
  // 2 · «Simular la oferta» ES el evento, antes de escribir el negocio; «Re-evaluar operación» es el mismo evento.
  const sim = tramo(can, "const simularOferta = (id) => {", "const reevaluarOperacion = (id) => {");
  if (!sim) fallos.push("no encuentro `simularOferta` seguido de `reevaluarOperacion`");
  else {
    const iEv = sim.indexOf("if (d0) evaluarOperacion(");
    const iSet = sim.indexOf("setDeals((prev) => prev.map(upd));");
    if (iEv < 0 || iSet < 0 || iSet < iEv) fallos.push("simular no dispara el evento de evaluación antes de escribir el negocio (la v1 no se emite al simular)");
    if (!sim.includes('origen: (repoSimVersions.get(id) || []).length ? "Re-evaluación de la operación (simulación)" : "Simulación de la oferta"')) fallos.push("la versión de la simulación no dice su origen");
    if (!sim.includes('motivo: "simulacion"')) fallos.push("la versión de la simulación no lleva el motivo `simulacion`");
    if (!sim.includes("simulado: true, stage: d0.stage === \"prospeccion\" ? \"oferta\" : d0.stage, monto: monto0, facturas: fs0.length, ...fin0")) fallos.push("el evento no evalúa el negocio tal como va a quedar simulado (etapa, monto, facturas y condiciones)");
  }
  const reev = tramo(can, "const reevaluarOperacion = (id) => {", "const limpiarSimulacion = (id) => {");
  if (!reev.includes('return evaluarOperacion(d0, usuario, {origen: "Re-evaluación de la operación", motivo: "reevaluacion"});')) fallos.push("«Re-evaluar operación» ya no es el evento de evaluación");
  if (!can.includes("onEvaluar={reevaluarOperacion}")) fallos.push("la pestaña del detalle no recibe el evento (`onEvaluar`)");
  const rl = tramo(can, "const reevaluarLinea = () => {", null, 400);
  if (!rl.includes("if (onEvaluar) onEvaluar(deal.id);")) fallos.push("el botón «Re-evaluar operación» de la cabecera volvió a ser un spinner: no dispara el evento");
  const rp = tramo(can, "onReevaluar={() => {", null, 200);
  if (!rp.includes("if (onEvaluar) onEvaluar(deal.id);")) fallos.push("el aviso «La selección cambió» no dispara el evento al re-evaluar");
  // 3 · Ningún emisor fuera del evento y del comité, y el comité emite una versión COMPLETA con la línea recortada.
  const pushes = can.match(/repoSimVersions\.push\([^)]*\)/g) || [];
  const permitidos = new Set(["repoSimVersions.push(deal.id, nv)", "repoSimVersions.push(id, dec.version)"]);
  pushes.filter((p) => !permitidos.has(p)).forEach((p) => fallos.push(`emisor de versión fuera del evento y del comité: \`${p}\``));
  if (pushes.length !== 2) fallos.push(`se esperaban exactamente dos emisores de versión (el evento y el comité), hay ${pushes.length}`);
  if (!can.includes('snapVersionCli(dealTrasRetiro, vs.length, {linea: recortarAsignacion(prev.linea, quedan.map((f) => f.id)), origen, motivo: "comite_rechazo"})')) fallos.push("la versión del rechazo del comité no es la de los cinco motores sobre lo que queda con la línea recortada (regla 69)");
  // 4 · La regularización del origen la pide SÓLO «Re-evaluación de la simulación», no cualquier versión con número > 1.
  const snap = tramo(can, "function snapVersionCli(deal, rev, opts) {", "const nExc = res.filter(");
  if (!snap.includes("if (o.origenActualizado) {")) fallos.push("la regularización de las variables ya no depende del gesto");
  if (/if \(\(rev \|\| 0\) >= 1\) \{/.test(snap)) fallos.push("la regularización vuelve a dispararse por el número de versión: toda re-evaluación «arreglaría» el origen");
  const rc = tramo(can, "function reevaluarCliente(deal, usuario) {", "const VISADO_NO_APLICA =");
  if (!rc.includes('const r = evaluarOperacion(deal, usuario, {origenActualizado: true, origen: "Re-evaluación · JSON API actualizado tras firma", motivo: "reevaluacion_origen"});')) fallos.push("«Re-evaluación de la simulación» no pasa por el evento con el origen actualizado");
  if (/snapVersionCli\(/.test(rc)) fallos.push("«Re-evaluación de la simulación» arma la versión por su cuenta en vez de disparar el evento");
  // 5 · El giro y el pricing salen de los mismos cálculos que la pantalla, y el tab cuenta por motor.
  if (!can.includes("giro = fsOp.length ? giroDeVersion(deal, fsOp, {linea}) : null;")) fallos.push("la versión no trae el giro sobre la asignación recién evaluada");
  if (!can.includes("pricing = fsOp.length ? pricingDeVersion(deal, fsOp) : null;")) fallos.push("la versión no trae el pricing");
  if (!can.includes("const val = giroDeVersion(deal, fs, estado);")) fallos.push("el giro del tubo ya no sale del mismo cálculo que la versión");
  if (!can.includes("const tn = tasaDelNegocio(deal, tasaPondRiesgo, CFG_ACTIVA);")) fallos.push("la pantalla elige la tasa del negocio por su cuenta: lo que se muestra y lo que se versiona se separan");
  if (!can.includes("const nMot = contarVersiones(shown);")) fallos.push("el tab Otorgamiento no cuenta las versiones por motor");
  if (!can.includes('{shown.length} {shown.length === 1 ? "versión" : "versiones"} · {MOTORES_VERSION.length} motores')) fallos.push("el pill de versiones no dice cuántos motores (o vuelve a decir «versiónes»)");
  // 7 · El tubo relee las versiones por el evento `storage` (la carrera con el postMessage está medida).
  const st = tramo(can, "const onStorage = (e) => {", "window.addEventListener(\"storage\", onStorage);");
  if (!st.includes('if (!e || e.key !== "pc_repo_" + repoSimVersions.nombre) return;') || !st.includes("repoSimVersions.recargar(); SIM_VERSIONS = repoSimVersions.all();")) fallos.push("el tubo no relee las versiones cuando otra pestaña las escribe: la fila leería una asignación anterior");
  // 6 · G-09: el recálculo que no ocurre no se anuncia, y las facturas nuevas se dicen como lo que son.
  if (/Recálculo aplicado|Recalculando |Se está recalculando la simulación|\bactualizando\b/.test(can)) fallos.push("vuelve el anuncio de un recálculo que no ocurre (G-09)");
  if (!can.includes("Facturas nuevas para ${idsWarn.length} oportunidad(es): ${totalDocs} documento(s) al pool disponible")) fallos.push("la bitácora no dice que las facturas nuevas van al pool");
  if (!can.includes("Facturas agregadas al pool en ${idsWarn.length} oportunidad(es)")) fallos.push("la bitácora no cierra la corrida diciendo lo que hizo");
  return fallos;
}

test("regla 72: un evento de evaluación corre los cinco motores y emite una versión con cinco secciones o ninguna; simular emite la v1; ningún emisor fuera del evento y del comité; el recálculo que no ocurre no se anuncia", () => {
  assert.deepEqual(auditarRegla72(jsx), []);
});

const MUTANTES = [
  ["simular no evalúa", (c) => c.replace("if (d0) evaluarOperacion(", "if (false) evaluarOperacion(")],
  ["simular evalúa DESPUÉS de escribir el negocio", (c) => {
    const i = c.indexOf("if (d0) evaluarOperacion("); const j = c.indexOf("const upd = (d) => {", i);
    const bloque = c.slice(i, j); const k = c.indexOf("setDeals((prev) => prev.map(upd));", j);
    return c.slice(0, i) + c.slice(j, k) + "setDeals((prev) => prev.map(upd)); " + bloque + c.slice(k + "setDeals((prev) => prev.map(upd));".length);
  }],
  ["el evento emite a medias", (c) => c.replace("if (!versionCompleta(nv)) {", "if (false) {")],
  ["el evento no dice que falló", (c) => c.replace("`Evaluación fallida · ${deal.id}: ${que}", "`Evaluación · ${deal.id}: ${que}").replace('accion: "Evaluación fallida"', 'accion: "Evaluación"')],
  ["«Re-evaluar operación» vuelve a ser un spinner", (c) => c.replace("const reevaluarLinea = () => {setDetReeval(true); if (onEvaluar) onEvaluar(deal.id);", "const reevaluarLinea = () => {setDetReeval(true);")],
  ["la pestaña no recibe el evento", (c) => c.replace("onEvaluar={reevaluarOperacion}", "")],
  ["el aviso «La selección cambió» sólo se apaga", (c) => c.replace("onReevaluar={() => {if (onEvaluar) onEvaluar(deal.id);", "onReevaluar={() => {")],
  ["un emisor literal fuera del evento", (c) => c.replace("const reabrirOperacion = (id) => {", "const reabrirOperacion = (id) => {repoSimVersions.push(id, {v: 9});")],
  ["el comité re-asigna en vez de recortar", (c) => c.replace('snapVersionCli(dealTrasRetiro, vs.length, {linea: recortarAsignacion(prev.linea, quedan.map((f) => f.id)), origen, motivo: "comite_rechazo"})', 'snapVersionCli(dealTrasRetiro, vs.length, {origen, motivo: "comite_rechazo"})')],
  ["la regularización vuelve a ser por número de versión", (c) => c.replace("if (o.origenActualizado) {", "if ((rev || 0) >= 1) {")],
  ["la re-evaluación de la simulación arma la versión por su cuenta", (c) => c.replace('const r = evaluarOperacion(deal, usuario, {origenActualizado: true, origen: "Re-evaluación · JSON API actualizado tras firma", motivo: "reevaluacion_origen"});', 'const r = {version: snapVersionCli(deal, vs.length, {origenActualizado: true})}; repoSimVersions.push(deal.id, r.version);')],
  ["la versión pierde el pricing", (c) => c.replace("nRech, linea, verificacion, giro, pricing, motoresFallidos: fallidos, politica:", "nRech, linea, verificacion, giro, motoresFallidos: fallidos, politica:")],
  ["el giro de la versión no mira la asignación recién evaluada", (c) => c.replace("giro = fsOp.length ? giroDeVersion(deal, fsOp, {linea}) : null;", "giro = fsOp.length ? giroDeVersion(deal, fsOp, {}) : null;")],
  ["la pantalla elige la tasa por su cuenta", (c) => c.replace("const tn = tasaDelNegocio(deal, tasaPondRiesgo, CFG_ACTIVA);", "const tn = {ultNeg: null, usaUltNeg: false, tasaEfectiva: tasaPondRiesgo};")],
  ["el tab no cuenta por motor", (c) => c.replace("const nMot = contarVersiones(shown);", "const nMot = {};")],
  ["el tubo no relee las versiones", (c) => c.replace("repoSimVersions.recargar(); SIM_VERSIONS = repoSimVersions.all();", "")],
  ["la bitácora vuelve a anunciar el recálculo", (c) => c.replace("Facturas agregadas al pool en ${idsWarn.length} oportunidad(es)", "Recálculo aplicado en ${idsWarn.length} oportunidad(es)")],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no cambió el fuente: el ancla ya no existe");
    assert.ok(auditarRegla72(mut).length > 0, "el gate no cazó la violación plantada");
  });
