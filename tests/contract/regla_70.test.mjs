/* Gate de contrato de la regla 70 (ADR-0016: la excepción que la versión N ya no levanta se marca «ya no aplica desde
   la versión N», no se borra; la marcada no se reactiva), sobre el TEXTO del fuente. La decisión pura y el flujo entero
   los prueba el caso 166 (`excepcionesQueYaNoAplican`, `reevaluarCliente` —que desde la regla 72 pasa por
   `evaluarOperacion`—, `solicitarAprobacionExc`); lo que la suite no
   puede ver es que NINGÚN lector del visado —y hay doce, entre motor, tab, mesa, avisos y contadores— trate la marca como
   una decisión, que la mutación no borre nada, y que el tab y la bandeja de tareas muestren el estado nuevo.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla70(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · La re-evaluación marca DESPUÉS de emitir la versión, con el número de esa versión.
  // Desde la regla 72 (ADR-0013) la versión la emite el EVENTO, `evaluarOperacion`, y ahí mismo se marca.
  const iR = can.indexOf("function evaluarOperacion(deal, usuario, opts) {");
  const reev = iR < 0 ? "" : can.slice(iR, iR + 3200);
  const iPush = reev.indexOf("repoSimVersions.push(deal.id, nv);");
  const iMarca = reev.indexOf("const yaNoAplican = marcarExcepcionesQueYaNoAplican(deal, nv.v);");
  if (iPush < 0 || iMarca < 0 || iMarca < iPush) fallos.push("`evaluarOperacion` no marca lo que la versión nueva ya no levanta (después de emitirla y con su número)");
  // 2 · La decisión es pura y SÓLO escribe la marca: nunca una decisión de apoderado.
  const iD = can.indexOf("function excepcionesQueYaNoAplican(items, sol, st, det, version, fecha) {");
  const dec = iD < 0 ? "" : can.slice(iD, can.indexOf("function marcarExcepcionesQueYaNoAplican(", iD));
  if (!dec) fallos.push("no existe `excepcionesQueYaNoAplican`: la política de la marca tiene que ser pura para poder probarla");
  else {
    if (!dec.includes("if (levanta.has(k)) continue;")) fallos.push("la decisión marca también lo que SIGUE gatillando");
    if (!dec.includes("if (!teniaSol && !teniaVis) continue;")) fallos.push("la decisión vuelve a marcar lo ya marcado");
    if (!dec.includes("estado: VISADO_NO_APLICA, noAplica: marca")) fallos.push("la solicitud no queda marcada con `{desdeVersion, por, fecha}`");
    if (!dec.includes("nSt[k] = VISADO_NO_APLICA;")) fallos.push("el visado no queda marcado `no_aplica`");
    if (!dec.includes('por: "sistema"')) fallos.push("la marca no lleva al sistema como actor");
    if (/"(aprobado|rechazado)"/.test(dec)) fallos.push("la decisión pura escribe una decisión de apoderado: el sistema no aprueba ni rechaza, marca");
  }
  // 3 · La mutación escribe los tres registros, cierra la tarea con el motivo, avisa como el sistema, y NO borra.
  const iM = can.indexOf("function marcarExcepcionesQueYaNoAplican(deal, version) {");
  const mut = iM < 0 ? "" : can.slice(iM, can.indexOf("// ── Cache del visado", iM));
  if (!mut) fallos.push("no existe `marcarExcepcionesQueYaNoAplican`: la decisión existiría y nadie la aplicaría");
  else {
    if (!mut.includes("repoSolicitudExc.set(deal.id, r.sol); repoVisado.set(deal.id, r.st); repoVisadoDetalle.set(deal.id, r.det);")) fallos.push("la mutación no escribe los tres registros marcados");
    if (/\bdelete\b|\.del\(/.test(mut)) fallos.push("la mutación BORRA: nada se borra, se marca (ADR-0016)");
    if (!mut.includes('tt.cierre = {motivo: r.rotulo, por: "sistema", fecha};')) fallos.push("la tarea del aprobador no se cierra con el motivo «ya no aplica desde la versión N»");
    if (!mut.includes("hiloEnviar(h, CODE_SISTEMA,")) fallos.push("el aviso en el hilo no lo firma el sistema");
    if (!mut.includes('accion: "Excepción ya no aplica"')) fallos.push("no queda fila de auditoría");
    if (!mut.includes("logOtorgEvento(deal.id, NOMBRE_SISTEMA,")) fallos.push("no queda evento en la bitácora de otorgamiento");
  }
  // 4 · NINGÚN lector trata la marca como decisión: el motor, la compuerta del cierre, la mesa y los demás.
  if (!can.includes("const excPend = exc.filter((e) => excSinVisar(st, e.stKey));")) fallos.push("`visadoDealCalc` cuenta la marca como decisión: la excepción que vuelve a levantar no saldría pendiente");
  if (!can.includes("const s = solVigente(sol, it.stKey);")) fallos.push("`excepcionesSinComentario` deja que la solicitud marcada justifique la de hoy");
  if (!can.includes('const ee = excSinVisar(VISADO_STATE[o.deal.id], x.stKey) ? "pendiente" : VISADO_STATE[o.deal.id][x.stKey];')) fallos.push("la mesa de Otorgamientos pinta la marca como si fuera una decisión");
  const sueltos = can.match(/!(st|st0|stOp|visSt)\[[^\]]*\.stKey\]/g) || [];
  if (sueltos.length) fallos.push(`quedan ${sueltos.length} lector(es) del visado con \`!st[x.stKey]\`: tratan la marca como decisión (${sueltos.join(", ")})`);
  // 5 · La solicitud nueva no pisa ni reactiva la marcada; la tarea conoce su excepción.
  if (!can.includes("previa && previa.estado === VISADO_NO_APLICA ? [...(previa.anteriores || []),")) fallos.push("`solicitarAprobacionExc` pisa la solicitud marcada en vez de llevarla como historia");
  if (!can.includes("version: versionVigente(deal.id),")) fallos.push("la solicitud no anota en qué versión se pidió");
  if (!can.includes('nodo: "Otorgamiento", stKey: x.stKey,')) fallos.push("la tarea de aprobación no conoce su excepción: no se puede cerrar cuando deja de aplicar");
  // 6 · Se ve: el criterio cumplido muestra la excepción anterior con su estado, la huérfana tiene lista propia, el visado
  //     nuevo hereda la historia y la tarea cerrada por el sistema dice por qué.
  if (!can.includes('{x.disp !== "excepcion" && excepcionAnteriorBlock(x.stKey)}')) fallos.push("el tab Otorgamiento no muestra la excepción anterior en el criterio cumplido");
  if (!can.includes("↺ Excepción anterior · {rotuloNoAplica(marca.desdeVersion)} · {marca.por} · {marca.fecha}")) fallos.push("la excepción anterior no dice «ya no aplica desde la versión N», actor y hora");
  if (!can.includes("{huerfanasMarcadas.map((k) => (")) fallos.push("la excepción cuyo deudor salió de la operación no se muestra en ninguna parte");
  if (!can.includes('{antRows.map((x) => reglaCard(x, active.key + "-ant-"))}')) fallos.push("el criterio cumplido con excepción anterior queda escondido en el colapsable de aprobadas: la marca no la ve nadie");
  if ((can.match(/\.\.\.historiaVisado\(\(repoVisadoDetalle\.get\(deal\.id\) \|\| \{\}\)\[(x\.stKey|k)\]\)/g) || []).length !== 2) fallos.push("un visado nuevo pisa la historia del marcado (detalle o mesa)");
  if (!can.includes("Cerrada por el {r.task.cierre.por} · {r.task.cierre.fecha}: {r.task.cierre.motivo}.")) fallos.push("la bandeja de Tareas no dice por qué el sistema cerró la tarea");
  return fallos;
}

test("regla 70: la excepción que la versión N ya no levanta se marca, no se borra; ningún lector trata la marca como decisión", () => {
  assert.deepEqual(auditarRegla70(jsx), []);
});

const MUTANTES = [
  ["la re-evaluación no marca", (c) => c.replace("const yaNoAplican = marcarExcepcionesQueYaNoAplican(deal, nv.v);", "const yaNoAplican = [];")],
  ["la decisión pura aprueba en vez de marcar", (c) => c.replace("nSt[k] = VISADO_NO_APLICA;", 'nSt[k] = "aprobado";')],
  ["la decisión marca lo que sigue gatillando", (c) => c.replace("if (levanta.has(k)) continue;", "")],
  ["la mutación borra la solicitud", (c) => c.replace("repoSolicitudExc.set(deal.id, r.sol); repoVisado.set(deal.id, r.st);", "repoSolicitudExc.del(deal.id); repoVisado.set(deal.id, r.st);")],
  ["la tarea no se cierra con el motivo", (c) => c.replace('tt.cierre = {motivo: r.rotulo, por: "sistema", fecha};', "")],
  ["el aviso lo firma un ejecutivo", (c) => c.replace("hiloEnviar(h, CODE_SISTEMA,", 'hiloEnviar(h, "CR",')],
  ["el motor cuenta la marca como decisión", (c) => c.replace("const excPend = exc.filter((e) => excSinVisar(st, e.stKey));", "const excPend = exc.filter((e) => !st[e.stKey]);")],
  ["la solicitud marcada justifica la de hoy", (c) => c.replace("const s = solVigente(sol, it.stKey);", "const s = sol[it.stKey];")],
  ["un lector suelto trata la marca como decisión", (c) => c.replace('const reqAprob = (x) => (x.disp === "excepcion" || x.disp === "rechazado") && excSinVisar(visSt, x.stKey);', 'const reqAprob = (x) => (x.disp === "excepcion" || x.disp === "rechazado") && !visSt[x.stKey];')],
  ["la solicitud nueva pisa la marcada", (c) => c.replace("previa && previa.estado === VISADO_NO_APLICA ? [...(previa.anteriores || []),", "false ? [...(previa.anteriores || []),")],
  ["el criterio cumplido no muestra la excepción anterior", (c) => c.replace('{x.disp !== "excepcion" && excepcionAnteriorBlock(x.stKey)}', "")],
  ["la mesa pinta la marca como decisión", (c) => c.replace('const ee = excSinVisar(VISADO_STATE[o.deal.id], x.stKey) ? "pendiente" : VISADO_STATE[o.deal.id][x.stKey];', 'const ee = (VISADO_STATE[o.deal.id] || {})[x.stKey] || "pendiente";')],
  ["la excepción anterior vuelve al colapsable de aprobadas", (c) => c.replace('{antRows.map((x) => reglaCard(x, active.key + "-ant-"))}', "")],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no cambió el fuente: el ancla ya no existe");
    assert.ok(auditarRegla70(mut).length > 0, "el gate no cazó la violación plantada");
  });
