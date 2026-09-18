/* Gate de contrato de la regla 5 (Pérdida es estado terminal), sobre el TEXTO del fuente: lo que la suite
   no alcanza porque vive dentro de componentes de React (los escritores de la pérdida, la tarjeta del
   Kanban, la reapertura, el arrastre del Kanban y `moverEtapa`). Cada escritor de `stage: "perdida"`
   tiene que grabar la etapa de ORIGEN, el ACTOR y una causa ESPECÍFICA —el lector `causaPerdidaDeal`
   devuelve `status` verbatim como último recurso, así que la garantía «nunca el genérico» vive en quien
   escribe—; el bloqueo firme se consulta ANTES que el status; los badges accionables de la tarjeta van
   detrás de `!isPerdida`, nombrados uno por uno; una perdida no se reabre en sitio (reapertura =
   operación nueva); y desde `perdida` no se arrastra ni se mueve a ninguna etapa. Con sonda: se planta
   la violación y el gate la caza, y se planta la corrección de los dos tests rojos y el gate se abre.
   DOS TESTS QUEDAN EN FALLA a propósito (17-09-2026): el actor no se graba en los 4 escritores
   automáticos, y ni `moveTo` ni `moverEtapa` miran si el origen es `perdida`. Documentan el defecto. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const GENERICO = /no super[oó] (las )?reglas de otorgamiento/i;

/* Cuerpo de una función de nivel módulo: desde su declaración hasta la siguiente declaración a columna 0
   (la misma guarda estructural que hizo segura la poda). */
export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^(?:function|const) ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const desde = m.index;
  const resto = src.slice(desde + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(desde, fin < 0 ? undefined : desde + m[0].length + fin);
}
/* Cuerpo de una función flecha DENTRO de un componente (`  const nombre = (…) => {` … `\n  };`). */
export function cuerpoInterno(src, nombre) {
  const i = src.indexOf(`  const ${nombre} = (`);
  if (i < 0) return null;
  const fin = src.indexOf("\n  };", i);
  return fin < 0 ? null : src.slice(i, fin);
}

/* El cuerpo de una función de NIVEL MÓDULO (`function nombre(`), hasta su `}` a columna 0. */
export function cuerpoModulo(src, nombre) {
  const i = src.indexOf(`function ${nombre}(`);
  if (i < 0) return null;
  const fin = src.indexOf("\n}", i);
  return fin < 0 ? null : src.slice(i, fin);
}

/* Los ESCRITORES de la pérdida: cada objeto literal que asigna `stage: "perdida"` (con cualquier comilla
   y aunque el objeto vaya en varias líneas). De cada uno se extrae el objeto —del `{` que lo abre al `}`
   que lo cierra, sin los `${…}` de los template literals— y se mira: la etapa de origen, la causa
   específica, el genérico (también cuando llega por una variable declarada unas líneas antes) y el actor. */
export function escritoresDePerdida(src) {
  const lineas = src.split("\n"); const escritores = [];
  lineas.forEach((l, i) => {
    if (!/\bstage:\s*["'`]perdida["'`]/.test(l)) return;
    const ventana = lineas.slice(Math.max(0, i - 6), i + 12).join("\n").replace(/\$\{[^}]*\}/g, "");
    const pos = ventana.search(/\bstage:\s*["'`]perdida["'`]/);
    const ini = ventana.lastIndexOf("{", pos), fin = ventana.indexOf("}", pos);
    const obj = ventana.slice(ini < 0 ? 0 : ini, fin < 0 ? undefined : fin);
    // el valor de `causaPerdida:` / `status:` cuando es un identificador: se busca su literal hasta 15 líneas antes
    const literalDe = (id) => { const m = lineas.slice(Math.max(0, i - 15), i + 1).join("\n").match(new RegExp(`\\b(?:const|let|var) ${id} = (["'\`])([^\\n]*?)\\1`)); return m ? m[2] : null; };
    const valores = [...obj.matchAll(/\b(?:causaPerdida|status):\s*([A-Za-z_$][\w$]*)\b/g)].map((m) => literalDe(m[1])).filter(Boolean);
    escritores.push({ linea: i + 1, obj,
      origen: /\betapaPerdida:\s*d\.stage\b/.test(obj),
      especifica: /\bcausaPerdida:\s*(causa|bi\.causa)\b/.test(obj) || /\bstatus:\s*[`"']Perdido · /.test(obj),
      generico: GENERICO.test(obj) || valores.some((v) => GENERICO.test(v)),
      actor: /\bperdidaPor:/.test(obj) && /\bfechaPerdida:/.test(obj) });
  });
  const fallos = [];
  for (const e of escritores) {
    if (!e.origen) fallos.push(`L${e.linea}: escribe stage: "perdida" sin grabar la etapa de origen (etapaPerdida: d.stage)`);
    if (!e.especifica) fallos.push(`L${e.linea}: escribe stage: "perdida" sin causa específica (causaPerdida: causa | bi.causa, o status: «Perdido · …»)`);
    if (e.generico) fallos.push(`L${e.linea}: escribe el genérico «no superó reglas de otorgamiento» como causa`);
  }
  const sinActor = escritores.filter((e) => !e.actor).map((e) => `L${e.linea}: escribe stage: "perdida" sin grabar el actor (perdidaPor) y la fecha (fechaPerdida)`);
  return { escritores: escritores.map((e) => e.linea), fallos, sinActor };
}

/* El lector: el bloqueo firme (causa con nombre de regla) se consulta ANTES de cualquier lectura del
   status, se acceda como se acceda (`deal.status`, `deal["status"]`, `deal?.status`). */
export function lectorDeCausa(src) {
  const c = cuerpoDe(src, "causaPerdidaDeal"); const fallos = [];
  if (!c) return { fallos: ["no existe `function causaPerdidaDeal`"] };
  if (GENERICO.test(c)) fallos.push("causaPerdidaDeal contiene el genérico como literal");
  const iBloq = c.indexOf("bloqueoFirmeInfo("), iStatus = c.search(/\bstatus\b/);
  if (iBloq < 0) fallos.push("causaPerdidaDeal no consulta bloqueoFirmeInfo");
  if (iStatus >= 0 && iBloq >= 0 && iBloq > iStatus) fallos.push("causaPerdidaDeal lee el status antes que el bloqueo firme: un status genérico taparía la regla que perdió la operación");
  return { fallos };
}

/* La tarjeta: cada badge ACCIONABLE va detrás de `!isPerdida`, nombrado —verificación pendiente,
   contactabilidad, cedidas en parte, desembolso—, y el badge del visado sólo se evalúa en etapas vivas. */
export const BADGES_ACCIONABLES = [
  ["verificación pendiente", /\{!isPerdida && \(\(\) => \{ const vr = verifResumenDeal\(deal\)/],
  ["error de contactabilidad", /\{deal\.contactable === false && !isPerdida &&/],
  ["cedidas en parte", /\{!isPerdida && deal\.cedidasOtro > 0/],
  ["estado del desembolso", /\{!isPerdida && dealDisbursement\(deal\) &&/],
];
export function badgesDeTarjeta(src) {
  const c = cuerpoDe(src, "DealCard"); const fallos = [];
  if (!c) return { fallos: ["no existe `function DealCard`"] };
  if (!/const isPerdida = deal\.stage === "perdida"/.test(c)) fallos.push("DealCard no define isPerdida");
  for (const [nombre, re] of BADGES_ACCIONABLES) if (!re.test(c)) fallos.push(`el badge «${nombre}» de DealCard no va detrás de !isPerdida`);
  const mVis = c.match(/\[([^\]]*)\]\.includes\(deal\.stage\) && \(\(\) => \{\s*const vis = visadoDeal\(deal\)/);
  if (!mVis) fallos.push("no encuentro la guarda de etapas del badge de visado");
  else if (/"perdida"/.test(mVis[1])) fallos.push("el badge de visado se evalúa también en perdida");
  return { fallos };
}

/* Reabrir en sitio no admite una perdida: se reactiva con una operación NUEVA. Desde el 17-09-2026 (regla 33) la
   compuerta vive en `edicionOperacion`, que `reabrirOperacion` consulta antes de tocar nada. */
export function reaperturaEnSitio(src) {
  const c = cuerpoInterno(src, "reabrirOperacion"); const fallos = [];
  if (!c) return { fallos: ["no existe reabrirOperacion"] };
  if (!/const ed = edicionOperacion\(d0\);/.test(c) || !/if \(![^)]*ed\.ok\) return;/.test(c))
    fallos.push("reabrirOperacion ya no consulta `edicionOperacion(d0)` antes de reabrir");
  const e = cuerpoModulo(src, "edicionOperacion") || "";
  if (!e) fallos.push("no existe edicionOperacion");
  else if (!/if \(deal\.stage === "perdida"\) return \{ aplica: true, ok: false/.test(e))
    fallos.push("edicionOperacion admite una perdida: la reapertura tiene que ser una operación nueva con referencia");
  return { fallos };
}

/* Terminalidad de las DOS puertas que mueven una operación de etapa sin función pura: el arrastre del
   Kanban (`moveTo`) y el selector del detalle (`moverEtapa`). Cada una tiene que negarse cuando el
   ORIGEN es `perdida` —un `if (…"perdida"…) … return` que mire la etapa de la operación—, no sólo el destino. */
export function terminalidadDeEtapa(src) {
  const fallos = [];
  for (const nombre of ["moveTo", "moverEtapa"]) {
    const c = cuerpoInterno(src, nombre);
    if (!c) { fallos.push(`no existe ${nombre}`); continue; }
    // la guarda tiene que leer la etapa de la OPERACIÓN (`orig` o `….stage`) y compararla con perdida; una
    // que sólo mire el destino (`stageId === "perdida"`) no cierra esta puerta
    const lineasIf = (c.match(/if \([^\n]*["'`]perdida["'`][^\n]*\)[^\n]*return/g) || []);
    const guarda = lineasIf.some((l) => /\borig\b|\.stage\b/.test(l));
    if (!guarda) fallos.push(`${nombre} no mira si el ORIGEN es perdida: arrastrar o mover una perdida la revive sin causa, sin auditoría y sin operación nueva`);
  }
  return { fallos };
}

test("todo escritor de stage: «perdida» graba la etapa de origen y una causa específica, nunca el genérico", () => {
  const r = escritoresDePerdida(jsx);
  assert.ok(r.escritores.length >= 5, `se esperaban al menos 5 escritores (rechazo, cesión ×2, oferta no aceptada ×2, bloqueo firme); hay ${r.escritores.length}`);
  assert.deepEqual(r.fallos, []);
});

test("causaPerdidaDeal consulta el bloqueo firme antes que el status y no trae el genérico", () => {
  assert.deepEqual(lectorDeCausa(jsx).fallos, []);
});

test("la tarjeta del Kanban suprime cada badge accionable de una perdida (verificación, contactabilidad, cedidas en parte, desembolso) y no evalúa el visado", () => {
  assert.deepEqual(badgesDeTarjeta(jsx).fallos, []);
});

test("una perdida no se reabre en sitio (reabrirOperacion consulta edicionOperacion, que la rechaza por terminal)", () => {
  assert.deepEqual(reaperturaEnSitio(jsx).fallos, []);
});

test("todo escritor de stage: «perdida» graba el ACTOR (perdidaPor) y la fecha (fechaPerdida)", () => {
  // Hasta el 17-09-2026 lo grababan 2 de 6 (rechazo manual y bloqueo firme «sistema»); los 4 automáticos —cesión
  // AECSync ×2 y oferta no aceptada ×2— no. La regla 5 nombra el actor y la bitácora lo lee (`bitacoraDe`).
  assert.deepEqual(escritoresDePerdida(jsx).sinActor, []);
});

test("desde perdida no se arrastra ni se mueve a ninguna etapa (moveTo y moverEtapa miran el origen)", () => {
  // Hasta el 17-09-2026 `moveTo` sólo bloqueaba la vuelta atrás desde aceptadas/cesión/giro y `moverEtapa` no miraba
  // el origen: la columna Perdida rinde `DealCard` con `draggable` y las otras columnas aceptan el drop, así que
  // arrastrar una perdida la revivía sin causa ni auditoría.
  assert.deepEqual(terminalidadDeEtapa(jsx).fallos, []);
});

test("SONDA · plantar la violación la caza: escritor sin origen, con el genérico (directo, por variable, con comillas simples, en varias líneas), lector que lee el status primero (de cualquier forma), badge sin guarda, reapertura de una perdida", () => {
  const base = escritoresDePerdida(jsx);
  // (1) un escritor nuevo que pierde sin origen y con el genérico
  const r1 = escritoresDePerdida(jsx + '\n// sonda\nconst _s = (d) => ({ ...d, stage: "perdida", status: "No superó reglas de otorgamiento" });\n');
  assert.ok(r1.fallos.some((f) => /sin grabar la etapa de origen/.test(f)), "no cazó el escritor sin etapaPerdida");
  assert.ok(r1.fallos.some((f) => /genérico/.test(f)), "no cazó el genérico");
  assert.ok(r1.fallos.some((f) => /sin causa específica/.test(f)), "no cazó la causa no específica");
  // (2) a un escritor REAL se le quita la etapa de origen
  const s2 = jsx.replace('stage: "perdida", etapaPerdida: d.stage, perdidaOtorg: true,', 'stage: "perdida", perdidaOtorg: true,');
  assert.notEqual(s2, jsx, "la sonda no encontró el escritor del bloqueo firme para mutarlo");
  assert.equal(escritoresDePerdida(s2).fallos.length, 1);
  // (3) el genérico llega por una VARIABLE declarada en la línea anterior (`causaPerdida: causa`)
  const r3 = escritoresDePerdida(jsx + '\nconst _s2 = (d) => { const causa = "No superó reglas de otorgamiento";\n  return { ...d, stage: "perdida", etapaPerdida: d.stage, causaPerdida: causa, status: causa }; };\n');
  assert.equal(r3.escritores.length, base.escritores.length + 1);
  assert.ok(r3.fallos.some((f) => /genérico/.test(f)), "no cazó el genérico asignado por variable");
  // (4) comillas simples: cuenta como escritor y se le exige lo mismo
  const r4 = escritoresDePerdida(jsx + "\nconst _s3 = (d) => ({ ...d, stage: 'perdida', status: 'No superó reglas de otorgamiento' });\n");
  assert.equal(r4.escritores.length, base.escritores.length + 1);
  assert.ok(r4.fallos.some((f) => /genérico/.test(f)) && r4.fallos.some((f) => /sin grabar la etapa de origen/.test(f)));
  // (5) un escritor VÁLIDO en varias líneas no es falso positivo, y uno inválido en varias líneas se caza
  const r5 = escritoresDePerdida(jsx + '\nconst _s4 = (d) => ({\n  ...d,\n  stage: "perdida",\n  etapaPerdida: d.stage,\n  causaPerdida: causa,\n  fechaPerdida: nowStamp(), perdidaPor: "sistema",\n});\n');
  assert.equal(r5.escritores.length, base.escritores.length + 1);
  assert.deepEqual(r5.fallos, base.fallos);
  assert.deepEqual(r5.sinActor, base.sinActor);
  const r5b = escritoresDePerdida(jsx + '\nconst _s5 = (d) => ({\n  ...d,\n  stage: "perdida",\n  status: "No superó reglas de otorgamiento",\n});\n');
  assert.ok(r5b.fallos.some((f) => /genérico/.test(f)) && r5b.fallos.some((f) => /sin grabar la etapa de origen/.test(f)));
  // (6) el lector cae al status ANTES de mirar el bloqueo firme, se acceda como se acceda
  const c = cuerpoDe(jsx, "causaPerdidaDeal");
  for (const acceso of ["deal.status", 'deal["status"]', "deal?.status"]) {
    const s = jsx.replace(c, c.replace("  if (deal.causaPerdida) return deal.causaPerdida;\n", `  if (deal.causaPerdida) return deal.causaPerdida;\n  if (${acceso}) return ${acceso};\n`));
    assert.notEqual(s, jsx);
    assert.ok(lectorDeCausa(s).fallos.some((f) => /antes que el bloqueo firme/.test(f)), `no cazó ${acceso}`);
  }
  // (7) reabrir admite perdida
  const s7 = jsx.replace('  if (deal.stage === "perdida") return { aplica: true, ok: false', '  if (false) return { aplica: true, ok: false');
  assert.notEqual(s7, jsx);
  assert.ok(reaperturaEnSitio(s7).fallos.some((f) => /admite una perdida/.test(f)));
  const s7b = jsx.replace("    const ed = edicionOperacion(d0);\n", "");
  assert.notEqual(s7b, jsx);
  assert.ok(reaperturaEnSitio(s7b).fallos.some((f) => /ya no consulta/.test(f)));
  // (8) el badge de visado se evalúa también en perdida
  const s8 = jsx.replace('{["prospeccion", "oferta", "aceptadas", "otorgamiento"].includes(deal.stage) && (() => {', '{["prospeccion", "oferta", "aceptadas", "otorgamiento", "perdida"].includes(deal.stage) && (() => {');
  assert.notEqual(s8, jsx);
  assert.ok(badgesDeTarjeta(s8).fallos.some((f) => /también en perdida/.test(f)));
  // (9) a UN badge accionable se le quita la guarda: el gate lo nombra (antes contaba «≥3» y no lo veía)
  const s9 = jsx.replace("{!isPerdida && deal.cedidasOtro > 0 && deal.cedidasOtro < deal.facturas && (", "{deal.cedidasOtro > 0 && deal.cedidasOtro < deal.facturas && (");
  assert.notEqual(s9, jsx);
  assert.deepEqual(badgesDeTarjeta(s9).fallos, ["el badge «cedidas en parte» de DealCard no va detrás de !isPerdida"]);
});

test("SONDA de actor y terminalidad: quitar el actor a un escritor se caza; quitar una guarda de origen se caza, y una guarda que sólo mira el destino no la reemplaza", () => {
  // Actor: los seis escritores lo graban (los cuatro automáticos desde el 17-09-2026); quitárselo se caza uno a uno
  const sinActorAuto = jsx
    .split('perdidaPor: "sistema", fechaPerdida: nowStamp(), cesionEval: true,').join("cesionEval: true,")
    .split('perdidaPor: "sistema", fechaPerdida: nowStamp(), ofertaEval: true,').join("ofertaEval: true,");
  assert.notEqual(sinActorAuto, jsx);
  assert.equal(escritoresDePerdida(sinActorAuto).sinActor.length, escritoresDePerdida(jsx).sinActor.length + 4);
  const sinActor = sinActorAuto
    .replace('fechaPerdida: nowStamp(), perdidaPor: (USERS[usuario] || usuario), ', "")
    .replace('fechaPerdida: nowStamp(), perdidaPor: "sistema", ', "");
  assert.notEqual(sinActor, sinActorAuto);
  assert.equal(escritoresDePerdida(sinActor).sinActor.length, escritoresDePerdida(jsx).sinActor.length + 6);
  // Terminalidad: sin la guarda de origen en cada puerta el gate se pone rojo…
  const sinGuarda = jsx
    .replace('    if (orig === "perdida") { setDraggingId(null); return; }\n', "")
    .replace('    if (((dealsRef.current || []).find((x) => x.id === id) || {}).stage === "perdida") return;\n', "");
  assert.notEqual(sinGuarda, jsx);
  assert.equal(terminalidadDeEtapa(sinGuarda).fallos.length, 2);
  // …y una guarda que sólo mira el DESTINO (`stageId === "perdida"`) no abre el gate: la puerta es el origen
  const soloDestino = sinGuarda
    .replace("    if (!draggingId) return;\n", '    if (!draggingId) return;\n    if (stageId === "perdida") { setDraggingId(null); return; }\n')
    .replace("  const moverEtapa = (id, stageId) => {\n", '  const moverEtapa = (id, stageId) => {\n    if (stageId === "perdida") return;\n');
  assert.notEqual(soloDestino, sinGuarda);
  assert.equal(terminalidadDeEtapa(soloDestino).fallos.length, 2);
  assert.deepEqual(terminalidadDeEtapa(jsx).fallos, []);
});
