/* Gate de contrato de la regla 13-quaterdecies sobre el TEXTO del fuente, sin navegador. La regla vive
   en dos closures de React (`limpiarSimulacion` en PipelineComercial y `motivoNoReset` en DealDrawer),
   así que no hay función de nivel módulo que la suite pueda llamar: acá se fija la ESTRUCTURA que la
   sostiene y el e2e mide lo que el navegador hace.
   (1) Los campos que se borran salen de `Object.keys(finanzasDe(…))` —la MISMA función que los escribe—
       y se ponen en `undefined` (borrados, no viejos); el patch los esparce y el closure devuelve
       `{ ...d, ...patch, … }`: el patch PISA al estado viejo (al revés, `{ ...patch, ...d }`, la cifra
       vieja gana y el reset no borra nada).
   (2) El pool se rearma con la UNIÓN de facturasOp + facturasDisponibles (no se pierde ninguna) y la
       oferta queda vacía: `facturasOp: []`, `simulado: false`, `monto: 0`, `facturas: 0`.
   (3) La evidencia NO se toca: el closure no nombra ningún repositorio ni las versiones ni el visado.
   (4) El tubo se entera por el MISMO canal que la simulación: `simAvisoRef.current = { id, patch }`, y el
       efecto que lo drena postea `nex-simulado`.
   (5) En DealDrawer: `motivoNoReset` cubre firmada (`aprobacionFormalCliente`) y publicada (`ofertaPublicada`),
       CADA uno de esos dos mensajes apunta a «Reabrir para modificar», `puedeReiniciar = !motivoNoReset`, y
       CADA botón «Eliminar la simulación y vaciar la oferta» va `disabled={!puedeReiniciar}` —no envuelto en
       `{puedeReiniciar && …}`: el ítem se deshabilita con motivo, no desaparece (regla 24)—, en rojo, seguido
       del motivo escrito; el ConfirmDialog `confirmReset` es quien llama a `onLimpiarSimulacion`.
   La vuelta a Prospección dentro del patch ya la fija el test de contrato de 12-bis (su punto 5): no se repite.
   Sonda: mutantes del fuente, una violación distinta cada uno, y el auditor tiene que nombrar la suya. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const ITEM = "Eliminar la simulación y vaciar la oferta";
const REPOS_EVIDENCIA = ["repoVisado", "repoVisadoDetalle", "repoSolicitudExc", "repoVerifExc", "repoOtorgEventos", "repoVerifTel",
  "repoNoConfirmadas", "repoVerifVeredicto", "repoContratoEvidencia", "repoSimVersions", "repoGiro", "SIM_VERSIONS", "VISADO_STATE",
  "VERIF_TEL", "GIRO_STATE", "REPOS[", "localStorage"];
/* El ítem envuelto en una condición que lo hace DESAPARECER: `puedeReiniciar && …`, `puedeReiniciar ? …`
   o su disfraz `!motivoNoReset && …`. `!puedeReiniciar` (el motivo escrito debajo) no cuenta. */
const ENVOLTURA = /(?:(?<!!)\bpuedeReiniciar|!motivoNoReset)\s*(?:&&|\?)/;

/* Closure de `PipelineComercial` (2 espacios): desde `  const nombre = ` hasta la siguiente declaración a esa sangría. */
export function closureDe(src, nombre) {
  const m = src.match(new RegExp(`^  const ${nombre} = [^\\n]*\\n`, "m"));
  if (!m) return null;
  const desde = m.index + m[0].length;
  const resto = src.slice(desde);
  const fin = resto.search(/^  (?:const|let|function|useEffect|useLayoutEffect)\b/m);
  return m[0] + (fin < 0 ? resto : resto.slice(0, fin));
}
/* El objeto literal `const patch = { … }` de un closure, por llaves balanceadas. */
export function patchDe(closure) {
  const i = closure.indexOf("const patch = {"); if (i < 0) return null;
  let j = closure.indexOf("{", i), prof = 0;
  for (; j < closure.length; j++) { const c = closure[j]; if (c === "{") prof++; else if (c === "}") { prof--; if (!prof) break; } }
  return closure.slice(i, j + 1);
}
/* Tramo de DealDrawer que decide si se puede reiniciar: desde `const motivoNoReset` hasta `const puedeReiniciar`. */
export function tramoMotivo(src) {
  const a = src.indexOf("const motivoNoReset ="); if (a < 0) return null;
  const b = src.indexOf("const puedeReiniciar", a); if (b < 0) return null;
  return src.slice(a, src.indexOf("\n", b) + 1);
}
/* Una rama del ternario de `motivoNoReset`: desde su condición hasta la siguiente rama (`\n    : `) o el final. */
export function ramaMotivo(tramo, condicion) {
  const i = tramo.indexOf(condicion); if (i < 0) return null;
  const resto = tramo.slice(i);
  const fin = resto.search(/\n\s*:\s/);
  return fin < 0 ? resto : resto.slice(0, fin);
}
/* Cada botón del ítem: lo que precede a su `<button` en la ventana (`previo`, hasta 900 chars), la etiqueta
   `<button …>` abierta (`apertura`) y las 3 líneas que lo siguen (`despues`). */
export function botonesItem(src) {
  const out = [];
  let i = -1;
  while ((i = src.indexOf(ITEM, i + 1)) >= 0) {
    const antes = src.slice(Math.max(0, i - 900), i);
    const ab = antes.lastIndexOf("<button");
    if (ab < 0) continue;                                   // un ConfirmDialog o un comentario, no un botón
    const apertura = antes.slice(ab).replace(/<[A-Z][A-Za-z]* [^>]*\/>/g, ""); // fuera los íconos (<RotateCcw … />)
    if (/<\/button>/.test(apertura)) continue;               // el <button más cercano ya se cerró: no es el del ítem
    const despues = src.slice(i, src.indexOf("\n", src.indexOf("\n", src.indexOf("\n", i) + 1) + 1) + 1);
    out.push({ previo: antes.slice(0, ab), apertura, despues, pos: i });
  }
  return out;
}

export function auditarReset(src) {
  const fallos = [];
  const cl = closureDe(src, "limpiarSimulacion");
  if (!cl) { fallos.push("closure: no existe `const limpiarSimulacion =` en PipelineComercial"); return fallos; }
  // (1) la lista de campos sale de finanzasDe, la misma función que los escribe, y se borran (undefined)
  if (!/Object\.keys\(finanzasDe\(d\.cliente, d\.deudor, 0\)\)\.forEach\(\(k\) => \{ vacios\[k\] = undefined; \}\)/.test(cl))
    fallos.push("campos: los campos a borrar no salen de `Object.keys(finanzasDe(d.cliente, d.deudor, 0))` puestos en `undefined` — con una lista escrita a mano, un concepto nuevo se queda viejo en el tubo");
  const patch = patchDe(cl);
  if (!patch) fallos.push("patch: el closure no arma `const patch = { … }`");
  else {
    if (!/\.\.\.vacios/.test(patch)) fallos.push("patch: no esparce `...vacios` (los campos de la simulación no se borran)");
    if (!/simulado: false/.test(patch)) fallos.push("patch: no escribe `simulado: false`");
    if (!/facturasOp: \[\]/.test(patch)) fallos.push("patch: la oferta no queda vacía (`facturasOp: []`)");
    if (!/facturasDisponibles: pool/.test(patch)) fallos.push("patch: el pool no vuelve a `facturasDisponibles`");
    if (!/\bfacturas: 0\b/.test(patch) || !/\bmonto: 0\b/.test(patch)) fallos.push("patch: `facturas: 0` y `monto: 0` tienen que ir en el patch (lo aritmético se actualiza al instante)");
  }
  // el patch PISA al estado viejo: `{ ...d, ...patch }`; al revés la cifra vieja gana y el reset no borra nada
  if (!/return \{ \.\.\.d, \.\.\.patch\b/.test(cl) || /\.\.\.patch, \.\.\.d\b/.test(cl))
    fallos.push("patch: el closure no devuelve `{ ...d, ...patch, … }` — el patch tiene que pisar al estado viejo; con `{ ...patch, ...d }` la cifra vieja gana y el reset no borra nada");
  // (2) el pool es la unión de la oferta y lo disponible, deduplicada por id: no se pierde ninguna factura
  if (!/\[\.\.\.\(d\.facturasOp \|\| \[\]\), \.\.\.\(d\.facturasDisponibles \|\| \[\]\)\]\.forEach/.test(cl))
    fallos.push("pool: el pool no se rearma con la unión `[...facturasOp, ...facturasDisponibles]` (las facturas de la oferta se perderían)");
  // (3) no toca la evidencia
  for (const r of REPOS_EVIDENCIA) if (cl.includes(r)) fallos.push(`evidencia: limpiarSimulacion nombra \`${r}\` — el reset no toca visado, verificaciones, vetos ni versiones`);
  if (/\bdelete\b/.test(cl)) fallos.push("evidencia: limpiarSimulacion usa `delete` (borra algo que no es suyo)");
  // (4) aviso al tubo por el mismo canal que la simulación
  if (!/simAvisoRef\.current = \{ id, patch \}/.test(cl)) fallos.push("aviso: limpiarSimulacion no deja el patch en `simAvisoRef.current = { id, patch }` (el tubo no se entera: vacía acá, simulada allá)");
  if (!/simAvisoRef\.current;[\s\S]{0,400}?postMessage\(\{ type: "nex-simulado", dealId: av\.id, patch: av\.patch \}/.test(src))
    fallos.push("aviso: el efecto que drena `simAvisoRef` no postea `nex-simulado` con `{ dealId, patch }`");
  // (5) DealDrawer: sólo mientras la oferta siga siendo del ejecutivo, con el motivo escrito
  const tm = tramoMotivo(src);
  if (!tm) fallos.push("motivo: no existe `const motivoNoReset =` … `const puedeReiniciar` en DealDrawer");
  else {
    const firmada = ramaMotivo(tm, "aprobacionFormalCliente(deal)"), publicada = ramaMotivo(tm, "ofertaPublicada(deal)");
    if (!firmada) fallos.push("motivo: `motivoNoReset` no consulta `aprobacionFormalCliente(deal)` (una oferta firmada se podría vaciar)");
    else if (!/«Reabrir para modificar»/.test(firmada)) fallos.push("motivo: el mensaje de FIRMADA no apunta a «Reabrir para modificar», la puerta que revoca la firma");
    if (!publicada) fallos.push("motivo: `motivoNoReset` no consulta `ofertaPublicada(deal)` (una oferta publicada se podría vaciar)");
    else if (!/«Reabrir para modificar»/.test(publicada)) fallos.push("motivo: el mensaje de PUBLICADA no apunta a «Reabrir para modificar», la puerta que revoca la firma");
    if (!/const puedeReiniciar = !motivoNoReset;/.test(tm)) fallos.push("motivo: `puedeReiniciar` no es `!motivoNoReset`");
  }
  const bts = botonesItem(src);
  if (bts.length < 2) fallos.push(`boton: se esperaban al menos 2 botones «${ITEM}» (menú Opciones y menú Acciones); hay ${bts.length}`);
  bts.forEach((b, k) => {
    if (ENVOLTURA.test(b.previo)) fallos.push(`boton ${k + 1}: el ítem se envuelve en una condición (\`puedeReiniciar && …\`) y DESAPARECE en vez de deshabilitarse con el motivo escrito (regla 24)`);
    if (!/disabled=\{!puedeReiniciar\}/.test(b.apertura)) fallos.push(`boton ${k + 1}: el botón «${ITEM}» no va \`disabled={!puedeReiniciar}\``);
    if (!/title=\{motivoNoReset \|\|/.test(b.apertura)) fallos.push(`boton ${k + 1}: el tooltip del botón no lleva el motivo (\`title={motivoNoReset || …}\`)`);
    if (!/color: C\.red/.test(b.apertura)) fallos.push(`boton ${k + 1}: el botón no va en rojo (\`color: C.red\`) — es lo único destructivo de la pantalla`);
    if (!/setConfirmReset\(true\)/.test(b.apertura)) fallos.push(`boton ${k + 1}: el botón no abre el ConfirmDialog (\`setConfirmReset(true)\`)`);
    if (!/\{!puedeReiniciar && <div[^\n]*\{motivoNoReset\}<\/div>\}/.test(b.despues)) fallos.push(`boton ${k + 1}: el motivo no se escribe debajo del botón deshabilitado (\`{!puedeReiniciar && <div…>{motivoNoReset}</div>}\`)`);
  });
  if (!/<ConfirmDialog abierto=\{confirmReset\}[\s\S]{0,900}?onConfirmar=\{\(\) => \{ setConfirmReset\(false\); onLimpiarSimulacion && onLimpiarSimulacion\(deal\.id\); \}\}/.test(src))
    fallos.push("dialogo: el `ConfirmDialog` de `confirmReset` no es quien llama a `onLimpiarSimulacion(deal.id)`");
  if (!/onLimpiarSimulacion=\{limpiarSimulacion\}/.test(src)) fallos.push("cableado: DealDrawer no recibe `onLimpiarSimulacion={limpiarSimulacion}`");
  return fallos;
}

test("13-quaterdecies · el reset borra lo que finanzasDe escribe, rearma el pool entero, deja la oferta vacía y el patch pisa al estado viejo", () => {
  const f = auditarReset(jsx).filter((x) => /^(campos|patch|pool|closure):/.test(x));
  assert.deepEqual(f, []);
});
test("13-quaterdecies · el reset no toca la evidencia: ningún repositorio, versión ni visado en el closure", () => {
  const f = auditarReset(jsx).filter((x) => /^evidencia:/.test(x));
  assert.deepEqual(f, []);
  const cl = closureDe(jsx, "limpiarSimulacion");
  assert.ok(cl.length > 400, "el closure se recortó demasiado corto: " + cl.length);
});
test("13-quaterdecies · el tubo se entera por el mismo canal que la simulación (simAvisoRef → nex-simulado)", () => {
  assert.deepEqual(auditarReset(jsx).filter((x) => /^aviso:/.test(x)), []);
});
test("13-quaterdecies · deshabilitado —no oculto— con el motivo escrito si firmada o publicada, cada mensaje apuntando a «Reabrir para modificar», en rojo, con ConfirmDialog", () => {
  const f = auditarReset(jsx).filter((x) => /^(motivo|boton|dialogo|cableado)/.test(x));
  assert.deepEqual(f, []);
  assert.equal(botonesItem(jsx).length, 2, "dos botones: menú Opciones (Negocio › Detalle) y menú Acciones (las otras pestañas)");
});

test("13-quaterdecies · SONDAS: cada violación plantada la caza su gate", () => {
  const cl = closureDe(jsx, "limpiarSimulacion");
  const MSG_FIRMADA = '"El cliente ya firmó esta oferta: para modificarla, usa «Reabrir para modificar»."';
  const MSG_PUBLICADA = '"La oferta ya se publicó al cliente: para modificarla, usa «Reabrir para modificar»."';
  const BOTON_OPCIONES = "<button onClick={() => { setPrimeMenu(false); setConfirmReset(true); }} disabled={!puedeReiniciar}";
  const CIERRE_OPCIONES = "Eliminar la simulación y vaciar la oferta</span>\n                                          </button>";
  const BOTON_ACCIONES = "<button onClick={() => { setAccMenu(false); setConfirmReset(true); }} disabled={!puedeReiniciar}";
  const CIERRE_ACCIONES = "Eliminar la simulación y vaciar la oferta\n            </button>";
  const mutantes = [
    ["lista a mano en vez de finanzasDe", jsx.replace('Object.keys(finanzasDe(d.cliente, d.deudor, 0)).forEach((k) => { vacios[k] = undefined; });', '["tasaDescuento", "giro", "comision"].forEach((k) => { vacios[k] = undefined; });'), /^campos:/],
    ["cifras viejas en vez de borradas", jsx.replace("vacios[k] = undefined; });", "vacios[k] = d[k]; });"), /^campos:/],
    ["el patch pisado por el estado viejo ({ ...patch, ...d })", jsx.replace(cl, cl.replace("return { ...d, ...patch, historialContacto", "return { ...patch, ...d, historialContacto")), /^patch: el closure no devuelve/],
    ["el reset borra el visado", jsx.replace(cl, cl.replace("const upd = (d) => {", "const upd = (d) => {\n      repoVisado.del(id);")), /^evidencia: .*repoVisado/],
    ["el reset borra las versiones", jsx.replace(cl, cl.replace("const upd = (d) => {", "const upd = (d) => {\n      delete SIM_VERSIONS[id];")), /^evidencia:/],
    ["sin aviso al tubo", jsx.replace(cl, cl.replace("      simAvisoRef.current = { id, patch };\n", "")), /^aviso: limpiarSimulacion/],
    ["la oferta no queda vacía", jsx.replace(cl, cl.replace("facturasOp: [], facturasDisponibles: pool", "facturasOp: d.facturasOp, facturasDisponibles: pool")), /^patch: la oferta no queda vacía/],
    ["se pierden las facturas de la oferta", jsx.replace(cl, cl.replace("[...(d.facturasOp || []), ...(d.facturasDisponibles || [])].forEach", "[...(d.facturasDisponibles || [])].forEach")), /^pool:/],
    ["una publicada se puede vaciar", jsx.replace('    : ofertaPublicada(deal) ? ' + MSG_PUBLICADA + '\n', ""), /^motivo: `motivoNoReset` no consulta `ofertaPublicada/],
    ["una firmada se puede vaciar", jsx.replace("    : aprobacionFormalCliente(deal) || deal.clienteAcepto ? ", "    : false ? "), /^motivo: `motivoNoReset` no consulta `aprobacionFormalCliente/],
    ["publicada apunta a otra puerta aunque firmada lo repita dos veces", jsx.replace(MSG_PUBLICADA, '"La oferta ya se publicó al cliente: cierra la pestaña."').replace(MSG_FIRMADA, '"El cliente ya firmó esta oferta: usa «Reabrir para modificar» («Reabrir para modificar»)."'), /^motivo: el mensaje de PUBLICADA/],
    ["firmada apunta a otra puerta", jsx.replace(MSG_FIRMADA, '"El cliente ya firmó esta oferta: cierra la pestaña."'), /^motivo: el mensaje de FIRMADA/],
    ["el botón no se deshabilita", jsx.replace("disabled={!puedeReiniciar}\n                                            title={motivoNoReset ||", "\n                                            title={motivoNoReset ||"), /^boton \d: el botón «.*» no va `disabled/],
    ["el ítem de Opciones desaparece en vez de deshabilitarse", jsx.replace(BOTON_OPCIONES, "{puedeReiniciar && " + BOTON_OPCIONES).replace(CIERRE_OPCIONES, CIERRE_OPCIONES + "}"), /^boton \d: el ítem se envuelve/],
    ["el ítem de Acciones desaparece en vez de deshabilitarse", jsx.replace(BOTON_ACCIONES, "{puedeReiniciar && (\n            " + BOTON_ACCIONES).replace(CIERRE_ACCIONES, CIERRE_ACCIONES + ")}"), /^boton \d: el ítem se envuelve/],
    ["el ítem se oculta con el disfraz !motivoNoReset", jsx.replace(BOTON_OPCIONES, "{!motivoNoReset && " + BOTON_OPCIONES).replace(CIERRE_OPCIONES, CIERRE_OPCIONES + "}"), /^boton \d: el ítem se envuelve/],
    ["el motivo no se escribe", jsx.replace("            {!puedeReiniciar && <div className=\"px-2 pb-1 t9\" style={{ color: C.faint }}>{motivoNoReset}</div>}\n          </>)}", "          </>)}"), /^boton \d: el motivo no se escribe/],
    ["el diálogo no llama al reset", jsx.replace("onConfirmar={() => { setConfirmReset(false); onLimpiarSimulacion && onLimpiarSimulacion(deal.id); }}", "onConfirmar={() => { setConfirmReset(false); }}"), /^dialogo:/],
  ];
  for (const [nombre, src, re] of mutantes) {
    assert.notEqual(src, jsx, `el mutante «${nombre}» no cambió el fuente: el ancla del replace no calza`);
    const f = auditarReset(src);
    assert.ok(f.some((x) => re.test(x)), `el mutante «${nombre}» no fue cazado por su gate; fallos: ${JSON.stringify(f)}`);
  }
  // Y el fuente sin mutar no dispara ninguno de los gates nuevos: los mutantes de arriba son la única forma de verlos.
  assert.deepEqual(auditarReset(jsx).filter((x) => /envuelve|no devuelve|mensaje de (FIRMADA|PUBLICADA)/.test(x)), []);
});
