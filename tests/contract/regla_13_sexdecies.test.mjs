/* Gate de contrato de la regla 13-sexdecies sobre el TEXTO del fuente (lo que la e2e no puede sondear plantando
   una violación en el navegador): (1) el panel de arranque de `DealDrawer` ofrece, con la oferta NO vacía,
   «Tienes {validas.length} factura…», un botón «Simular la oferta» que simula LA SELECCIÓN (`elegirInicio(validas`),
   deshabilitado sólo por la compuerta de estado, y el rótulo «O reemplaza la selección por» ANTES de los atajos
   (`opcionesInicio.map`); (2) el ícono de retiro de la oferta —título «Retirar esta factura de la oferta»— se dibuja
   siempre que la operación no esté bloqueada, sin `disabled`, con el onClick a secas, en `C.sub` y con hover;
   (3) NINGÚN botón que abra el diálogo de retiro (hoy dos: la fila de la oferta y el sub-tab «documentos») lleva
   `disabled`, un título condicional, un onClick con guarda ni una condición por cantidad para dibujarse, y el
   diálogo confirma sin condición; (4) la mutación `retirarFacturaOferta` no devuelve la operación sin cambios por
   cuántas facturas quedan —sólo por «la factura no existe»—, ni en `upd` ni antes, salvo que vacíe la oferta por
   `limpiarSimulacion` (que es lo que la regla pide al retirar la última). Cada gate con su sonda, y las de los
   gates 3 y 4 son BI-ESTADO: parten del fuente con el veto o ya reparado, arman la otra variante y exigen que el
   gate acepte la reparada y cace la vetada. El sub-tab «documentos» (~línea 8020) no tiene caso e2e de
   comportamiento (sólo se alcanza con `CFG_ACTIVA.tabDetalle === false`): queda gateado sólo por este texto. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leer, canonico} from "./_comun.mjs";

/* `SEXDECIES_FUENTE=/ruta/a/un.jsx` corre el gate contra un fuente candidato (p. ej. la reparación antes de commitearla). */
const jsx = process.env.SEXDECIES_FUENTE ? readFileSync(process.env.SEXDECIES_FUENTE, "utf8") : leer("pipeline_comercial.jsx");
/* Borra comentarios (`/* … *​/` —también en su forma JSX `{/* … *​/}`— y líneas `//`) SIN mover el texto: cada carácter
   borrado pasa a espacio y los saltos de línea se conservan, así que un índice en la copia es el mismo índice —y la
   misma línea— en el fuente que se recibió. */
const sinComentarios = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/^[ \t]*\/\/[^\n]*/gm, (m) => m.replace(/[^\n]/g, " "));
const lineaDe = (src, idx) => src.slice(0, idx).split("\n").length;
/* Tramo balanceado desde el ancla (que termina en `{`) hasta la llave que lo cierra. */
function cuerpo(src, ancla, desde = 0) {
  const ini = src.indexOf(ancla, desde); if (ini < 0) return null;
  let i = ini + ancla.length, prof = 1;
  while (i < src.length && prof) { const ch = src[i]; if (ch === "{") prof++; else if (ch === "}") prof--; i++; }
  return { ini, fin: i, texto: src.slice(ini, i) };
}
/* Cada `if (COND) SENTENCIA` de un tramo, con la condición balanceada y la sentencia (un bloque `{…}` o hasta el `;`). */
function ifs(texto) {
  const out = []; const re = /\bif \(/g; let m;
  while ((m = re.exec(texto))) {
    let i = m.index + m[0].length, prof = 1;
    while (i < texto.length && prof) { const ch = texto[i]; if (ch === "(") prof++; else if (ch === ")") prof--; i++; }
    const cond = texto.slice(m.index + m[0].length, i - 1);
    let j = i; while (j < texto.length && /\s/.test(texto[j])) j++;
    let stmt;
    if (texto[j] === "{") { let k = j, p = 0; do { if (texto[k] === "{") p++; else if (texto[k] === "}") p--; k++; } while (k < texto.length && p); stmt = texto.slice(j, k); }
    else { const k = texto.indexOf(";", j); stmt = texto.slice(j, k < 0 ? undefined : k + 1); }
    out.push({ idx: m.index, cond: cond.replace(/\s+/g, " ").trim(), stmt });
  }
  return out;
}

/* (1) Panel de arranque: dentro del bloque `!deal.simulado`, el tramo `validas.length > 0` trae las tres piezas en orden,
   y el botón de la selección sólo se deshabilita por la compuerta de estado (`bloqueado`/`soloLectura`). */
export function panelManual(src) {
  const c = sinComentarios(src); const fallos = [];
  const ini = c.indexOf("{!deal.simulado ? (");
  if (ini < 0) return ["no encuentro el panel de arranque (`{!deal.simulado ? (`)"];
  const finB = c.indexOf("Documentos en la oferta", ini); // la sección que sigue al panel
  const bloque = canonico(c.slice(ini, finB > ini ? finB : ini + 30000));   // canónico: ver _comun.mjs (ADR-0006)
  const iT = bloque.search(/Tienes \{validas\.length\} factura\{validas\.length === 1 \? "" : "s"\} elegida/);
  const iB = bloque.search(/<button\s*onClick=\{\(\) => elegirInicio\(validas,/);
  const iS = bloque.search(/Simular la oferta/);
  const iR = bloque.indexOf("O reemplaza la selección por");
  const iM = bloque.indexOf("opcionesInicio.map(");
  const iP = bloque.indexOf("¿Qué facturas quieres incluir en la oferta?");
  if (iT < 0) fallos.push("el panel no dice «Tienes {validas.length} factura(s) elegida(s)»");
  if (iB < 0) fallos.push("no hay un botón que simule LA SELECCIÓN (`elegirInicio(validas, …)`)");
  if (iS < 0) fallos.push("no hay «Simular la oferta»");
  if (iR < 0) fallos.push("falta el rótulo «O reemplaza la selección por»");
  if (iP < 0) fallos.push("falta la pregunta de la oferta vacía «¿Qué facturas quieres incluir en la oferta?»");
  if (!fallos.length) {
    if (!(iT < iB && iB < iS && iS < iR && iR < iM)) fallos.push(`orden roto: Tienes ${iT} < botón ${iB} < Simular ${iS} < O reemplaza ${iR} < atajos ${iM}`);
    const guarda = bloque.slice(0, iT).search(/validas\.length > 0 \? \(/);
    if (guarda < 0) fallos.push("«Tienes…» no está bajo la guarda `validas.length > 0`: con la oferta vacía ofrecería simular nada");
    if (!(iM > iR)) fallos.push("los atajos no están DESPUÉS del rótulo «O reemplaza la selección por»");
    const tagB = bloque.slice(iB, bloque.indexOf("</button>", iB)); const dis = tagB.match(/disabled=\{[^}]*\}/);
    if (dis && !/^disabled=\{(bloqueado|soloLectura)\}$/.test(dis[0])) fallos.push(`«Simular la oferta» no se deshabilita sólo por la compuerta de estado \`bloqueado\`/\`soloLectura\` (${dis[0]}): la salida manual existe en el texto y no se puede apretar`);
  }
  return fallos;
}
/* Todos los botones que abren el diálogo de retiro (`setConfirmRetiro(f)` sobre un <Trash2>), con lo que los precede. */
const botonesRetiro = (c0) => { const c = canonico(c0); return [...c.matchAll(/<button\b[\s\S]{0,600}?setConfirmRetiro\(f\)[\s\S]{0,600}?>\s*(?=<Trash2)/g)].map((m) => ({ b: m[0], idx: m.index, previo: c.slice(Math.max(0, m.index - 40), m.index) })); };
/* Lo que la regla exige de CUALQUIER botón de retiro: se dibuja siempre que no esté bloqueado, sin `disabled`,
   con el onClick a secas y un título fijo que no hable de conservar una factura. */
function vetosDe(c, { b, idx, previo }) {
  const ln = lineaDe(c, idx); const fallos = [];
  if (/\bdisabled=/.test(b)) fallos.push(`línea ${ln}: un botón de retiro lleva ${(b.match(/disabled=\{[^}]*\}/) || ["disabled"])[0]}: con una sola factura el ícono queda vetado`);
  if (!/onClick=\{\(\) => setConfirmRetiro\(f\)\}/.test(b)) fallos.push(`línea ${ln}: el onClick del retiro no es \`() => setConfirmRetiro(f)\` a secas (${(b.match(/onClick=\{[^\n]*?\}\}?(?= )/) || ["?"])[0]}): una guarda ahí es el veto sin la palabra disabled`);
  if (!/ title="[^"]+"/.test(b)) fallos.push(`línea ${ln}: el título del botón de retiro es condicional (${(b.match(/title=\{[^}]*\}/) || ["?"])[0]}): un título que cambia con la cantidad es el veto viejo`);
  if (/al menos (una|1) factura|la última/i.test(b)) fallos.push(`línea ${ln}: un botón de retiro dice que la oferta debe conservar una factura`);
  // `\(?` porque prettier abre el paréntesis del JSX condicional: `{!soloLectura ? (`
  if (!/\{!(bloqueado|soloLectura) \? \(?\s*$/.test(previo)) fallos.push(`línea ${ln}: el botón de retiro no se dibuja con \`{!bloqueado ? \` ni \`{!soloLectura ? \` sino tras «${previo.trim().slice(-32)}»: una condición por cantidad esconde el ícono`);
  return fallos;
}
/* (2) El ícono de retiro de la FILA DE LA OFERTA: uno solo, sin veto, en C.sub y con hover. */
export function retiroSinVeto(src) {
  const c = sinComentarios(src); const fallos = [];
  const btns = botonesRetiro(c).filter((x) => /title="Retirar esta factura de la oferta"/.test(x.b));
  if (btns.length !== 1) fallos.push(`hay ${btns.length} botones con título «Retirar esta factura de la oferta» (se espera 1: la fila de la oferta)`);
  for (const x of btns) {
    fallos.push(...vetosDe(c, x)); const ln = lineaDe(c, x.idx);
    if (!/color: C\.sub/.test(x.b)) fallos.push(`línea ${ln}: el ícono no va en C.sub`);
    if (!/hover:bg-stone-100/.test(x.b)) fallos.push(`línea ${ln}: el ícono no tiene hover`);
    if (/disabled:opacity/.test(x.b)) fallos.push(`línea ${ln}: el ícono conserva la atenuación de deshabilitado`);
  }
  return fallos;
}
/* (3) El veto viejo no vuelve en NINGÚN botón que retire de la oferta, con ninguna grafía; y el diálogo confirma sin condición. */
export function vetoViejoNoVuelve(src) {
  const c = sinComentarios(src); const fallos = [];
  const btns = botonesRetiro(c);
  if (!btns.length) return ["no hay ningún botón que abra el diálogo de retiro (setConfirmRetiro(f))"];
  for (const x of btns) fallos.push(...vetosDe(c, x));
  const dlg = c.indexOf('titulo="¿Retirar esta factura de la oferta?"');
  if (dlg < 0) fallos.push("no encuentro el ConfirmDialog «¿Retirar esta factura de la oferta?»");
  else if (!/onConfirmar=\{\(\) => \{\s*onRetirarFactura\(deal\.id, confirmRetiro\);/.test(c.slice(dlg, dlg + 1400))) fallos.push(`línea ${lineaDe(c, dlg)}: el onConfirmar del diálogo de retiro no llama a onRetirarFactura(deal.id, confirmRetiro) de entrada y sin condición`);
  return fallos;
}
/* (4) La mutación admite dejar la oferta vacía: ningún `return d` de `upd` depende de cuántas facturas quedan
   (`nuevasOp.length`, `base.length`…) salvo la guarda «no existe» (`nuevasOp.length === base.length`); `upd` sólo
   devuelve `d` o el objeto nuevo (un `return cond ? … : d` es el mismo veto); y antes de `upd` un `return`
   condicionado por la cantidad sólo vale si vacía la oferta por `limpiarSimulacion` (retirar la última vuelve al
   panel de arranque), nunca como salida silenciosa. */
export function mutacionAdmiteVacia(src) {
  const c = sinComentarios(src);
  const fn = cuerpo(c, "const retirarFacturaOferta = (id, fac, motivo) => {");
  if (!fn) return ["no encuentro `retirarFacturaOferta`"];
  if (!/setDeals\(\(prev\) => prev\.map\(upd\)\)/.test(fn.texto)) return ["no pude delimitar el cuerpo de `retirarFacturaOferta` (no veo su `setDeals((prev) => prev.map(upd))`)"];
  const upd = cuerpo(fn.texto, "const upd = (d) => {");
  if (!upd) return ["`retirarFacturaOferta` no tiene su `const upd = (d) => {`"];
  const fallos = []; const ln = (idxEnFn) => lineaDe(c, fn.ini + idxEnFn);
  if (!/nuevasOp\.length === base\.length|base\.length === nuevasOp\.length/.test(upd.texto)) fallos.push("perdió la guarda de «la factura no existe» (nuevasOp.length === base.length)");
  for (const { idx, cond, stmt } of ifs(upd.texto)) {
    if (!/\breturn d;/.test(stmt) || /limpiarSimulacion\(/.test(stmt)) continue;
    const resto = cond.replace(/d\.id !== id/g, "").replace(/nuevasOp\.length === base\.length|base\.length === nuevasOp\.length/g, "");
    if (/\b(length|nuevasOp|base|validas|facturasOp)\b/.test(resto)) fallos.push(`línea ${ln(upd.ini + idx)}: un \`return d\` de retirarFacturaOferta depende de cuántas facturas quedan (\`if (${cond}) …\`): retirar la última deja la operación sin cambios —el ícono se deja apretar y el diálogo confirma, pero no retira`);
  }
  for (const m of upd.texto.matchAll(/\breturn\b(?!\s*(?:d;|\{))/g)) fallos.push(`línea ${ln(upd.ini + m.index)}: \`upd\` devuelve algo que no es \`d\` ni el objeto nuevo (\`${upd.texto.slice(m.index, m.index + 60).split("\n")[0].trim()}\`): un veto por cantidad con otra grafía`);
  for (const { idx, cond, stmt } of ifs(fn.texto.slice(0, upd.ini))) {
    if (!/\breturn\b/.test(stmt)) continue;
    if (/\.length\b|itemizarFacturas\(/.test(cond) && !/limpiarSimulacion\(/.test(stmt)) fallos.push(`línea ${ln(idx)}: antes de \`upd\`, retirarFacturaOferta se va sin retirar cuando \`${cond}\`: un veto por cantidad fuera del updater`);
  }
  return fallos;
}

test("13-sexdecies · el panel de arranque con la oferta no vacía: «Tienes N…», «Simular la oferta» sobre la selección (deshabilitado sólo por bloqueado), «O reemplaza la selección por» antes de los atajos", () => {
  assert.deepEqual(panelManual(jsx), []);
});
test("13-sexdecies · el ícono de retiro de la fila de la oferta: se dibuja si no está bloqueada, sin disabled ni guarda, en C.sub, con hover", () => {
  assert.deepEqual(retiroSinVeto(jsx), []);
});
test("13-sexdecies · el veto «la oferta debe tener al menos una factura» no vive en ningún botón de retiro (con ninguna grafía) ni en el diálogo", () => {
  assert.deepEqual(vetoViejoNoVuelve(jsx), []);
});
test("13-sexdecies · retirarFacturaOferta no devuelve la operación sin cambios por cuántas facturas quedan: sólo por «no existe»", () => {
  assert.deepEqual(mutacionAdmiteVacia(jsx), []);
});

/* Las dos variantes del fuente a partir de la que exista: `con` trae el veto y `sin` la reparación. */
const dosEstados = (viejo, nuevo, nuevoRe) => jsx.includes(viejo) ? { con: jsx, sin: jsx.replace(viejo, nuevo), estado: "con el veto" }
  : nuevoRe.test(jsx) ? { con: jsx.replace(nuevoRe, viejo), sin: jsx, estado: "reparado", re: nuevoRe } : null;
const distinto = (copia, base, que) => { assert.notEqual(copia, base, `la sonda «${que}» no tocó nada: actualizar su ancla`); return copia; };

test("13-sexdecies · SONDAS: cada violación plantada cambia el veredicto, y los gates 3 y 4 aceptan el fuente reparado y cazan el veto en los DOS estados del fuente", () => {
  // 1 · sin el botón que simula la selección; sin el rótulo; sin la guarda de oferta vacía; el botón siempre deshabilitado.
  const s1 = distinto(jsx.replace(/<button(\s*onClick=\{\(\) => elegirInicio\(validas,\s*"Selección manual"\)\})/, "<div$1"), jsx, "botón de la selección");
  assert.ok(panelManual(s1).some((f) => /simule LA SELECCIÓN/.test(f)), "no cazó la falta del botón de la selección");
  const s1b = distinto(jsx.replace("O reemplaza la selección por", "O reemplaza la seleccion por"), jsx, "rótulo O reemplaza");
  assert.ok(panelManual(s1b).some((f) => /O reemplaza/.test(f)), "no cazó la falta del rótulo");
  const s1c = distinto(jsx.replace(/\{validas\.length > 0 \? \(/, "{true ? ("), jsx, "guarda validas.length > 0");
  assert.ok(panelManual(s1c).some((f) => /guarda/.test(f)), "no cazó la guarda de oferta vacía retirada");
  const COMP = (canonico(jsx).match(/\{!(bloqueado|soloLectura) \? \(?<button\b[\s\S]{0,600}?setConfirmRetiro/) || [])[1] || "bloqueado";   // la compuerta de estado, como se llame hoy
  const s1d = distinto(jsx.replace(new RegExp('(onClick=\\{\\(\\) => elegirInicio\\(validas,\\s*"Selección manual"\\)\\}\\s*disabled=\\{)' + COMP + '(\\})'), "$1true$2"), jsx, "Simular siempre deshabilitado");
  assert.ok(panelManual(s1d).some((f) => /sólo por la compuerta de estado/.test(f)), "no cazó «Simular la oferta» deshabilitado siempre");
  // 2 · el ícono de la fila de la oferta: vuelve a llevar el veto / pierde el color y el hover / onClick con guarda / no se dibuja con una factura.
  // El <button> ya no cabe en una línea: se toma del fuente tal como está y las sondas lo mutan con regex.
  const btn = (jsx.match(/<button\b[\s\S]{0,700}?title="Retirar esta factura de la oferta"[\s\S]{0,700}?>\s*(?=<Trash2)/) || [""])[0];
  assert.ok(btn, "no encuentro el botón de retiro de la fila de la oferta: actualizar el ancla");
  const s2 = distinto(jsx.replace(btn, btn.replace(/<button\b/, "<button disabled={validas.length <= 1}")), jsx, "disabled en la fila de la oferta");
  assert.ok(retiroSinVeto(s2).some((f) => /lleva disabled/.test(f)), "el gate 2 no cazó el disabled plantado");
  assert.ok(vetoViejoNoVuelve(s2).some((f) => /lleva disabled/.test(f)), "el gate 3 no cazó el veto plantado en la fila de la oferta");
  const s2b = distinto(jsx.replace(btn, btn.replace("color: C.sub", "color: C.faint").replace(" hover:bg-stone-100", "")), jsx, "gris sin hover");
  const f2b = retiroSinVeto(s2b); assert.ok(f2b.some((f) => /C\.sub/.test(f)) && f2b.some((f) => /hover/.test(f)), "no cazó el gris sobre gris sin hover");
  const s2c = distinto(jsx.replace(btn, btn.replace(/onClick=\{\(\) => setConfirmRetiro\(f\)\}/, "onClick={() => validas.length > 1 && setConfirmRetiro(f)}")), jsx, "onClick con guarda");
  assert.ok(retiroSinVeto(s2c).some((f) => /a secas/.test(f)) && vetoViejoNoVuelve(s2c).some((f) => /a secas/.test(f)), "no cazó el onClick con guarda (veto sin la palabra disabled)");
  const s2d = distinto(jsx.replace(new RegExp("\\{!" + COMP + " \\? (\\(?\\s*<button\\b[\\s\\S]{0,700}?title=\"Retirar esta factura de la oferta\")"), "{validas.length > 1 && !" + COMP + " ? $1"), jsx, "ícono no dibujado con una factura");
  assert.ok(retiroSinVeto(s2d).some((f) => /no se dibuja/.test(f)) && vetoViejoNoVuelve(s2d).some((f) => /no se dibuja/.test(f)), "no cazó el ícono que no se dibuja con una factura");
  // 3 · el sub-tab «documentos» (~línea 8020), en los DOS estados del fuente: el gate 3 acepta la reparación y caza el veto.
  const VIEJO_8020 = 'onClick={() => setConfirmRetiro(f)} disabled={validas.length <= 1} title={validas.length <= 1 ? "La oferta debe tener al menos una factura" : "Retirar de la oferta"}';
  const NUEVO_8020 = 'onClick={() => setConfirmRetiro(f)} title="Retirar de la oferta"';
  const RE_8020 = /onClick=\{\(\) => setConfirmRetiro\(f\)\}\s*title="Retirar de la oferta"/;
  const e3 = dosEstados(VIEJO_8020, NUEVO_8020, RE_8020);
  assert.ok(e3, "el sub-tab «documentos» no trae ni el veto viejo ni el botón reparado con `title=\"Retirar de la oferta\"`: actualizar la sonda");
  assert.deepEqual(vetoViejoNoVuelve(e3.sin), [], `el gate 3 no acepta el sub-tab «documentos» reparado (fuente ${e3.estado})`);
  const f3 = vetoViejoNoVuelve(e3.con);
  assert.ok(f3.some((f) => /lleva disabled/.test(f)) && f3.some((f) => /condicional/.test(f)) && f3.some((f) => /conservar una factura/.test(f)), `el gate 3 no caza el veto viejo del sub-tab «documentos» (fuente ${e3.estado}): ${JSON.stringify(f3)}`);
  for (const [que, mut, esperado] of [
    ["disabled con < 2 y otro título", 'onClick={() => setConfirmRetiro(f)} disabled={validas.length < 2} title={validas.length < 2 ? "Debe quedar al menos 1 factura en la oferta" : "Retirar de la oferta"}', /lleva disabled|condicional/],
    ["disabled={ultima}", 'onClick={() => setConfirmRetiro(f)} disabled={ultima} title={ultima ? "No puedes retirar la última" : "Retirar de la oferta"}', /lleva disabled|condicional|la última/],
    ["onClick con guarda", 'onClick={() => validas.length > 1 && setConfirmRetiro(f)} title="Retirar de la oferta"', /a secas/],
  ]) {
    const s = distinto(e3.sin.replace(e3.estado === "reparado" ? RE_8020 : NUEVO_8020, mut), e3.sin, que);
    assert.ok(vetoViejoNoVuelve(s).some((f) => esperado.test(f)), `el gate 3 no cazó «${que}» en el sub-tab «documentos»`);
  }
  const s3d = distinto(e3.sin.replace(new RegExp("\\{!" + COMP + " \\? (\\(?\\s*<button\\b[\\s\\S]{0,700}?title=\"Retirar de la oferta\")"), "{validas.length > 1 && !" + COMP + " ? $1"), e3.sin, "sub-tab: ícono no dibujado con una factura");
  assert.ok(vetoViejoNoVuelve(s3d).some((f) => /no se dibuja/.test(f)), "el gate 3 no cazó el ícono del sub-tab que no se dibuja con una factura");
  const s3e = distinto(e3.sin.replace(/onConfirmar=\{\(\) => \{(\s*)onRetirarFactura\(deal\.id, confirmRetiro\);/, "onConfirmar={() => {$1if (validas.length > 1) onRetirarFactura(deal.id, confirmRetiro);"), e3.sin, "veto en onConfirmar");
  assert.ok(vetoViejoNoVuelve(s3e).some((f) => /onConfirmar/.test(f)), "el gate 3 no cazó el veto puesto en el onConfirmar del diálogo");
  // 4 · la mutación, en los DOS estados: el gate 4 acepta la reparación y caza el veto con cualquier grafía.
  const VETO_MUT = "if (nuevasOp.length === base.length || nuevasOp.length === 0) return d;";
  const REP_MUT = "if (nuevasOp.length === base.length) return d;";
  const e4 = dosEstados(VETO_MUT, REP_MUT, new RegExp(REP_MUT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(e4, "retirarFacturaOferta no trae ni el rechazo de la oferta vacía ni la guarda reparada `if (nuevasOp.length === base.length) return d;`: actualizar la sonda");
  assert.deepEqual(mutacionAdmiteVacia(e4.sin), [], `el gate 4 no acepta la mutación reparada (fuente ${e4.estado})`);
  assert.ok(mutacionAdmiteVacia(e4.con).some((f) => /cuántas facturas quedan/.test(f)), `el gate 4 no caza el veto de la oferta vacía (fuente ${e4.estado})`);
  // Se planta DENTRO de retirarFacturaOferta: `return { ...d, facturasOp: nuevasOp,` y `const d0 = deals.find(…)` existen
  // antes en el fuente (incorporarFacturasOferta y otra función), y un replace a ciegas caería allá.
  const enRetirar = (base, viejo, nuevo) => { const i = base.indexOf("const retirarFacturaOferta = (id, fac, motivo) => {"); const j = base.indexOf(viejo, i); assert.ok(i >= 0 && j >= 0, `no encuentro «${viejo.slice(0, 40)}» dentro de retirarFacturaOferta`); return base.slice(0, j) + nuevo + base.slice(j + viejo.length); };
  for (const [que, mut, esperado] of [
    ["!nuevasOp.length", REP_MUT + "\n      if (!nuevasOp.length) return d;", /cuántas facturas quedan/],
    ["nuevasOp.length < 1", "if (nuevasOp.length === base.length || nuevasOp.length < 1) return d;", /cuántas facturas quedan/],
    ["base.length === 1 antes de filtrar", "if (base.length === 1) return d;\n      " + REP_MUT, /cuántas facturas quedan/],
    ["return d en bloque", "if (nuevasOp.length === base.length) return d;\n      if (nuevasOp.length === 0) { logSys(\"info\", \"oferta\", \"vacía\"); return d; }", /cuántas facturas quedan/],
  ]) {
    const s = distinto(enRetirar(e4.sin, REP_MUT, mut), e4.sin, que);
    assert.ok(mutacionAdmiteVacia(s).some((f) => esperado.test(f)), `el gate 4 no cazó «${que}»`);
  }
  const RET = (e4.sin.slice(e4.sin.indexOf("const retirarFacturaOferta = (id, fac, motivo) => {")).match(/return \{\s*\.\.\.d,\s*facturasOp: nuevasOp,/) || [""])[0];
  assert.ok(RET, "no encuentro el `return { ...d, facturasOp: nuevasOp,` de retirarFacturaOferta");
  const s4t = distinto(enRetirar(e4.sin, RET, "return nuevasOp.length === 0 ? d : { ...d, facturasOp: nuevasOp,"), e4.sin, "ternario en el return");
  assert.ok(mutacionAdmiteVacia(s4t).some((f) => /no es `d` ni el objeto nuevo/.test(f)), "el gate 4 no cazó el veto en un ternario del return");
  const D0 = (e4.sin.slice(e4.sin.indexOf("const retirarFacturaOferta = (id, fac, motivo) => {")).match(/const d0 = deals\.find\(\(x\) => x\.id === id\);/) || ["const d0 = deals.find((x) => x.id === id);"])[0];
  const s4a = distinto(enRetirar(e4.sin, D0, D0 + "\n    if (d0 && itemizarFacturas(d0).length <= 1) return;"), e4.sin, "veto antes de upd");
  assert.ok(mutacionAdmiteVacia(s4a).some((f) => /antes de `upd`/.test(f)), "el gate 4 no cazó el veto por cantidad puesto antes de `upd`");
  const s4r = distinto(enRetirar(e4.sin, D0, D0 + "\n    if (d0 && [\"prospeccion\", \"oferta\"].includes(d0.stage) && itemizarFacturas(d0).length === 1) { limpiarSimulacion(id); return; }"), e4.sin, "reparación completa plantada");
  assert.deepEqual(mutacionAdmiteVacia(s4r), [], "el gate 4 rechaza la reparación que vacía la oferta por limpiarSimulacion");
  const s4b = distinto(enRetirar(e4.sin, REP_MUT, ""), e4.sin, "sin la guarda no existe");
  assert.ok(mutacionAdmiteVacia(s4b).some((f) => /no existe/.test(f)), "no cazó la pérdida de la guarda de «no existe»");
});
