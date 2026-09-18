/* Gate de contrato de la regla 12-bis sobre el TEXTO del fuente: lo que el e2e prueba en el navegador, acá
   se fija en la ESTRUCTURA que lo sostiene, en milisegundos. (1) `stageTrasEdicion` no vuelve; (2) la
   promoción a «oferta» vive en `simularOferta` y DENTRO del objeto `patch` que viaja por `nex-simulado`
   (fuera del patch el detalle avanzaba y el tubo no), y el patch se encola con `avisarTubo`; (3) el efecto
   post-commit que vacía `avisoTuboRef.current` y postea `nex-simulado` a `window.opener` existe y no lleva
   deps que lo apaguen; (4) el listener del tubo aplica el patch TAL CUAL (`{ ...d, ...m.patch }`: si
   pisara `stage`, la etapa no llegaría); (5) el invariante dual `sinPrecio` es la LÍNEA EXACTA
   `d.stage === "oferta" && !d.simulado && !tieneOferta(d)` —la igualdad de línea es lo que caza un
   `!!` invertido, que un `includes` dejaba pasar— y `tieneOferta` mira N° de negocio o la oferta en el
   hilo de WhatsApp; (6) los editores del paquete (incorporar/retirar) no ESCRIBEN `stage` (ni `stage:`,
   ni `stage =`, ni `["stage"] =`; una comparación `stage ===` no es una escritura); (7) `limpiarSimulacion`
   devuelve a prospección dentro de su patch y avisa por el mismo canal. Con sonda: cada garantía se rompe
   en una copia del fuente y el gate la caza —incluidos los cinco mutantes de la refutación que la versión
   anterior dejaba pasar—, y una sonda inversa comprueba que una comparación no se confunde con una escritura. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Closure de `PipelineComercial` (2 espacios de sangría): desde `  const nombre = ` hasta la siguiente
   declaración o efecto a la misma sangría. */
export function closureDe(src, nombre) {
  const m = src.match(new RegExp(`^  const ${nombre} = [^\\n]*\\n`, "m"));
  if (!m) return null;
  const desde = m.index + m[0].length;
  const resto = src.slice(desde);
  const fin = resto.search(/^  (?:const|let|function|useEffect|useLayoutEffect)\b/m);
  return m[0] + (fin < 0 ? resto : resto.slice(0, fin));
}
/* El objeto literal `const patch = { … }` de un closure: se corta por llaves balanceadas. */
export function patchDe(closure) {
  const i = closure.indexOf("const patch = {"); if (i < 0) return null;
  let j = closure.indexOf("{", i), prof = 0;
  for (; j < closure.length; j++) { const c = closure[j]; if (c === "{") prof++; else if (c === "}") { prof--; if (!prof) break; } }
  return closure.slice(i, j + 1);
}
/* El efecto post-commit que avisa al tubo: el `useEffect(() => {` más cercano por encima de
   `const cola = avisoTuboRef.current;` hasta su `});` (con o sin lista de deps). Devuelve el bloque y las deps. */
export function efectoAviso(src) {
  const i = src.indexOf("const cola = avisoTuboRef.current;"); if (i < 0) return null;
  const ini = src.lastIndexOf("useEffect(() => {", i); if (ini < 0) return null;
  const cierre = src.slice(i).match(/\n  \}(?:, (\[[^\]]*\]))?\);\n/); if (!cierre) return null;
  return { bloque: src.slice(ini, i + cierre.index + cierre[0].length), deps: cierre[1] || null };
}
/* La rama `nex-simulado` del listener del tubo: desde su `if` hasta 1600 caracteres después. Se amplió el tramo
   el 18-09-2026: main metió adentro la guarda del id que ya no existe y su comentario, y `aplicarSim` quedó fuera. */
export function ramaListener(src) {
  const i = src.indexOf('if (m && m.type === "nex-simulado" && m.dealId && m.patch) {');
  return i < 0 ? null : src.slice(i, i + 1600);
}

const PROMO = /stage: d\.stage === "prospeccion" \? "oferta" : d\.stage/;
export const DUAL = 'const sinPrecio = (d) => d.stage === "oferta" && !d.simulado && !tieneOferta(d);';
export const APLICAR = "const aplicarSim = (d) => (d.id === m.dealId ? { ...d, ...m.patch } : d);";
export const AVISO = 'window.opener.postMessage({ type: "nex-simulado", dealId: av.id, patch: av.patch }';
/* Una ESCRITURA de stage: `stage:` (objeto literal, con o sin espacio), `stage =` (asignación) o
   `["stage"] =`. Una comparación (`stage ===`, `stage ==`) no lo es. */
export const ESCRIBE_STAGE = /(?:\bstage|\[\s*["']stage["']\s*\])\s*(?::|=(?!=))/;

export function gatesDe(src) {
  const fallos = [];
  if (/\bstageTrasEdicion\b/.test(src)) fallos.push("`stageTrasEdicion` volvió al fuente: la edición del paquete no promueve, sólo la simulación");
  const sim = closureDe(src, "simularOferta");
  if (!sim) fallos.push("no existe el closure `simularOferta`");
  else {
    const patch = patchDe(sim);
    if (!patch) fallos.push("simularOferta no arma `const patch = {…}`");
    else {
      if (!/simulado: true/.test(patch)) fallos.push("el patch de simularOferta no marca `simulado: true`");
      if (!PROMO.test(patch)) fallos.push("la promoción prospeccion → oferta no está DENTRO del patch de simularOferta");
      if (PROMO.test(sim.replace(patch, ""))) fallos.push("la promoción aparece FUERA del patch: el detalle avanza y el tubo no");
      if (!/avisarTubo\(id, patch\)/.test(sim)) fallos.push("simularOferta no le pasa el patch a `avisarTubo` (el tubo no se entera)");
    }
  }
  // El aviso al tubo: sin este efecto, el patch queda en la cola de `avisoTuboRef` y no sale nunca.
  const ef = efectoAviso(src);
  if (!ef) fallos.push("no existe el efecto post-commit que vacía `avisoTuboRef.current` (el patch no le llega al tubo)");
  else {
    if (!ef.bloque.includes(AVISO)) fallos.push("el efecto post-commit no postea `nex-simulado` con el patch a window.opener");
    if (ef.deps && !/\bdeals\b/.test(ef.deps)) fallos.push(`el efecto post-commit lleva deps ${ef.deps} que no incluyen \`deals\`: no correría tras cada simulación`);
  }
  // El tubo aplica el patch tal cual: si pisara `stage` (o cualquier campo), la promoción no llegaría.
  const rama = ramaListener(src);
  if (!rama) fallos.push("el listener del tubo no tiene la rama `nex-simulado`");
  else {
    if (!rama.includes(APLICAR)) fallos.push("el listener del tubo no aplica el patch tal cual (`" + APLICAR + "`)");
    if (!/setDeals\(\(prev\) => prev\.map\(aplicarSim\)\)/.test(rama)) fallos.push("el listener del tubo no aplica `aplicarSim` a `deals`");
  }
  const mTO = src.match(/^  const tieneOferta = \(d\) => (.*)$/m);
  if (!mTO) fallos.push("no existe `tieneOferta`");
  else {
    if (!/!!d\.negocioNum/.test(mTO[1])) fallos.push("tieneOferta no mira el N° de negocio");
    if (!/waSesion[\s\S]*Oferta de factoring/.test(mTO[1])) fallos.push("tieneOferta no mira la oferta enviada por WhatsApp");
  }
  const mSP = src.match(/^\s*(const sinPrecio = \(d\) => .*;)$/m);
  if (!mSP) fallos.push("no existe el invariante dual (`const sinPrecio = (d) => …`)");
  else {
    // Igualdad de LÍNEA, no `includes`: «!!d.simulado» contiene «!d.simulado» y el dual invertido pasaba.
    if (mSP[1] !== DUAL) fallos.push(`el invariante dual no es la línea exacta «${DUAL}»: el fuente dice «${mSP[1]}»`);
    const dual = src.slice(mSP.index, mSP.index + 600);
    if (!/sinPrecio\(d\)\s*\?\s*\{ \.\.\.d, stage: "prospeccion"/.test(dual)) fallos.push("el invariante dual no devuelve a «prospeccion»");
  }
  if (!/d\.stage === "prospeccion" && tieneOferta\(d\)[\s\S]{0,200}stage: "oferta"/.test(src)) fallos.push("el invariante original (prospección con oferta → oferta) no está");
  for (const n of ["incorporarFacturasOferta", "retirarFacturaOferta"]) {
    const c = closureDe(src, n);
    if (!c) { fallos.push(`no existe el closure ${n}`); continue; }
    const m = c.match(ESCRIBE_STAGE);
    if (m) fallos.push(`${n} escribe \`stage\` («${m[0]}»): editar el paquete no mueve la etapa`);
  }
  const lim = closureDe(src, "limpiarSimulacion");
  if (!lim) fallos.push("no existe `limpiarSimulacion`");
  else {
    const p = patchDe(lim) || "";
    if (!/simulado: false/.test(p) || !/stage: \["prospeccion", "oferta"\]\.includes\(d\.stage\) \? "prospeccion"/.test(p)) fallos.push("limpiarSimulacion no devuelve a prospección dentro de su patch");
    if (!/avisarTubo\(id, patch\)/.test(lim)) fallos.push("limpiarSimulacion no avisa al tubo por el mismo canal");
  }
  return fallos;
}

/* Reemplaza `de` por `a` exigiendo que `de` aparezca EXACTAMENTE una vez: un ancla que se movió haría
   que la sonda pasara sin plantar nada. */
function mutar(src, de, a) {
  assert.equal(src.split(de).length, 2, "el ancla de la sonda no aparece exactamente una vez: " + String(de).slice(0, 80));
  return src.replace(de, a);
}

test("12-bis · la promoción vive en simularOferta dentro del patch y llega al tubo por el efecto post-commit, el tubo aplica el patch tal cual, el dual es la línea exacta y los editores no escriben stage", () => {
  assert.deepEqual(gatesDe(jsx), []);
});

test("12-bis · sonda: cada garantía plantada rota se caza (incluidos los cinco mutantes de la refutación)", () => {
  const sim = closureDe(jsx, "simularOferta"); const patch = patchDe(sim);
  // (a) la promoción sale del patch y queda en el return
  const simFuera = sim.replace(/stage: d\.stage === "prospeccion" \? "oferta" : d\.stage,\n/, "").replace("return { ...d, ...patch,", 'return { ...d, ...patch, stage: d.stage === "prospeccion" ? "oferta" : d.stage,');
  assert.notEqual(simFuera, sim);
  const fa = gatesDe(mutar(jsx, sim, simFuera));
  assert.ok(fa.some((f) => /DENTRO del patch/.test(f)) && fa.some((f) => /FUERA del patch/.test(f)), "no cazó la promoción fuera del patch: " + fa.join(" | "));
  // (b) el dual pierde la guarda de «ya tiene oferta»: empujaría a prospección una reapertura
  const fb = gatesDe(mutar(jsx, DUAL, 'const sinPrecio = (d) => d.stage === "oferta" && !d.simulado;'));
  assert.ok(fb.some((f) => /línea exacta/.test(f)), "no cazó el dual sin la guarda: " + fb.join(" | "));
  // (c) el dual pierde !simulado: dejaría de corregir la oferta sin precio
  const fc = gatesDe(mutar(jsx, DUAL, 'const sinPrecio = (d) => d.stage === "oferta" && !tieneOferta(d);'));
  assert.ok(fc.some((f) => /línea exacta/.test(f)), "no cazó el dual sin !simulado: " + fc.join(" | "));
  // (d) un editor del paquete vuelve a promover (objeto literal con espacio)
  const inc = closureDe(jsx, "incorporarFacturasOferta");
  const fd = gatesDe(mutar(jsx, inc, inc.replace("const upd = (d) => {", 'const upd = (d) => { if (d.id === id) d = { ...d, stage: "oferta" };')));
  assert.ok(fd.some((f) => /incorporarFacturasOferta escribe `stage`/.test(f)), "no cazó al editor promoviendo: " + fd.join(" | "));
  // (e) stageTrasEdicion vuelve
  const fe = gatesDe(jsx + "\nconst stageTrasEdicion = (d) => d;\n");
  assert.ok(fe.some((f) => /stageTrasEdicion/.test(f)), "no cazó la vuelta de stageTrasEdicion");
  // (f) simularOferta deja de marcar simulado
  const ff = gatesDe(mutar(jsx, sim, sim.replace("simulado: true,", "")));
  assert.ok(ff.some((f) => /simulado: true/.test(f)), "no cazó un patch sin simulado: " + ff.join(" | "));
  // (g) REFUTACIÓN 1: el dual INVERTIDO (`!!d.simulado` empuja a Prospección a las SIMULADAS)
  const fg = gatesDe(mutar(jsx, DUAL, 'const sinPrecio = (d) => d.stage === "oferta" && !!d.simulado && !tieneOferta(d);'));
  assert.ok(fg.some((f) => /línea exacta/.test(f)), "no cazó el dual invertido (!!d.simulado): " + fg.join(" | "));
  // (h) REFUTACIÓN 2: la guarda INVERTIDA (`!!tieneOferta(d)` devuelve a Prospección justo lo que YA tiene oferta)
  const fh = gatesDe(mutar(jsx, DUAL, 'const sinPrecio = (d) => d.stage === "oferta" && !d.simulado && !!tieneOferta(d);'));
  assert.ok(fh.some((f) => /línea exacta/.test(f)), "no cazó la guarda invertida (!!tieneOferta): " + fh.join(" | "));
  // (i) REFUTACIÓN 3: un editor promueve sin espacio tras los dos puntos, y otro por asignación
  const fi1 = gatesDe(mutar(jsx, inc, inc.replace("const upd = (d) => {", 'const upd = (d) => { if (d.id === id) d = { ...d, stage:"oferta", simulado: true };')));
  assert.ok(fi1.some((f) => /incorporarFacturasOferta escribe `stage`/.test(f)), "no cazó `stage:\"oferta\"` sin espacio: " + fi1.join(" | "));
  const ret = closureDe(jsx, "retirarFacturaOferta");
  const fi2 = gatesDe(mutar(jsx, ret, ret.replace("const upd = (d) => {", 'const upd = (d) => { if (d.id === id) { d = { ...d }; d.stage = "oferta"; d.simulado = true; }')));
  assert.ok(fi2.some((f) => /retirarFacturaOferta escribe `stage`/.test(f)), "no cazó la asignación `d.stage = \"oferta\"`: " + fi2.join(" | "));
  // (j) REFUTACIÓN 4: el tubo IGNORA la etapa del patch
  const fj = gatesDe(mutar(jsx, APLICAR, "const aplicarSim = (d) => (d.id === m.dealId ? { ...d, ...m.patch, stage: d.stage } : d);"));
  assert.ok(fj.some((f) => /no aplica el patch tal cual/.test(f)), "no cazó al tubo pisando stage: " + fj.join(" | "));
  // (k) REFUTACIÓN 5: el efecto post-commit que avisa al tubo, borrado entero
  const ef = efectoAviso(jsx); assert.ok(ef && ef.bloque.includes(AVISO), "ancla del efecto post-commit");
  const fk = gatesDe(mutar(jsx, ef.bloque, ""));
  assert.ok(fk.some((f) => /efecto post-commit/.test(f)), "no cazó el efecto borrado: " + fk.join(" | "));
  // (l) el efecto queda con deps `[]`: correría una sola vez y el segundo aviso no saldría
  const fl = gatesDe(mutar(jsx, ef.bloque, ef.bloque.replace(/\n  \}\);\n$/, "\n  }, []);\n")));
  assert.ok(fl.some((f) => /deps \[\]/.test(f)), "no cazó el efecto con deps []: " + fl.join(" | "));
});

test("12-bis · sonda inversa: una COMPARACIÓN `stage ===` dentro de un editor no cuenta como escritura", () => {
  const inc = closureDe(jsx, "incorporarFacturasOferta");
  const conComparacion = inc.replace("const upd = (d) => {", 'const upd = (d) => { if (d.stage === "oferta" || d.stage == "giro") { /* sólo mira */ }');
  assert.notEqual(conComparacion, inc);
  assert.deepEqual(gatesDe(mutar(jsx, inc, conComparacion)), []);
  assert.equal(ESCRIBE_STAGE.test('x = d.stage === "oferta"'), false);
  for (const esc of ['stage: "oferta"', 'stage:"oferta"', 'd.stage = "oferta"', 'd["stage"] = "oferta"']) assert.ok(ESCRIBE_STAGE.test(esc), "debía cazar " + esc);
});
