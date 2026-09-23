/* Gate de contrato de la regla 14 (reevaluación explícita) sobre el TEXTO del fuente. La regla vive casi
   entera en estado de React (`reevalPend` en `DealDrawer`) y en dos callbacks de `PipelineComercial`
   (`incorporarFacturasOferta` / `retirarFacturaOferta`) que ninguna suite puede invocar, así que lo que se
   fija acá es la ESTRUCTURA que la sostiene:
   (1) las dos mutaciones de la oferta NO llaman a ningún motor (líneas, verificación, otorgamiento, pricing,
       giro): sólo lo aritmético. `recortarAsignacion` queda permitido en retirar porque el recorte de una
       ACEPTADA no re-asigna (regla 13) — es la única excepción y se nombra.
   (2) en `DealDrawer`, cada llamada a `onIncorporarFacturas(<x>.id…)` / `onRetirarFactura(<x>.id…)` marca
       `setReevalPend(true)` en el mismo bloque del handler (una o varias líneas): agregar o quitar ⇒
       pendiente de re-evaluar. La vía «noConfirmada» se juzga aparte (2-bis) porque hoy NO lo hace.
   (3) con la pendencia activa la evaluación de línea es `null` («Sin evaluar» SIN número), no la anterior ni
       una recalculada, y la tarjeta de veredicto trata `reevalPend` ANTES de formatear cualquier cifra.
   (4) `snapVersionCli` congela `linea` y `verificacion` en la MISMA versión: una sola reevaluación.
   (4-bis) TODO emisor de versión (`repoSimVersions.push`) emite las dos decisiones sobre la misma selección:
       o sale de `snapVersionCli`, o si recorta `linea` recorta también `verificacion`. Hoy el segundo emisor
       (`retirarFacturaOferta`, aceptadas en adelante) recorta la línea y COPIA la verificación vieja: FALLA
       documentada, como (2-bis).
   Los números de línea se reportan sobre el fuente original: quitar comentarios conserva los saltos de línea.
   Cada gate lleva su sonda: se planta la violación en una copia del fuente y el gate cambia de veredicto. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico} from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
/* Quita comentarios CONSERVANDO los saltos de línea, para que los índices sigan siendo líneas del fuente. */
const sinComentarios = (s) => String(s)
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/^(\s*)\/\/[^\n]*/gm, "$1");
const lineaDe = (src, idx) => src.slice(0, idx).split("\n").length;

/* Cuerpo de una arrow const INTERNA de PipelineComercial: desde su ancla hasta la siguiente `  const ` a dos espacios. */
export function cuerpoInterno(src, ancla) {
  const i = src.indexOf(ancla);
  if (i < 0) return null;
  const resto = src.slice(i + ancla.length);
  const fin = resto.search(/\n  const [A-Za-z_]/);
  return { texto: resto.slice(0, fin < 0 ? undefined : fin), linea: lineaDe(src, i) };
}
/* Motores y emisores de versión que una mutación de la oferta NO puede invocar. */
export const MOTORES = ["asignarLineas", "facturasConLinea", "verifEvaluar", "verifDecision", "verifFactura", "verifDeudorDeal", "verifResumenDeal",
  "snapVersionCli", "reevaluarCliente", "evaluarOtorgItems", "visadoDeal", "visadoDealCalc", "simularOperacion", "prorratearOperacion", "asignarGiros", "girosDeDeal", "simularOferta"];
export function mutacionesSinMotor(src) {
  const c = sinComentarios(src); const fallos = [];
  for (const [nombre, ancla] of [["incorporarFacturasOferta", "const incorporarFacturasOferta = (id, facs) => {"], ["retirarFacturaOferta", "const retirarFacturaOferta = (id, fac, motivo) => {"]]) {
    const b = cuerpoInterno(c, ancla);
    if (!b) { fallos.push(`no encuentro \`${ancla}\``); continue; }
    for (const m of MOTORES) if (new RegExp("\\b" + m + "\\s*\\(").test(b.texto)) fallos.push(`${nombre} (línea ${b.linea}) llama a ${m}(): agregar o quitar facturas NO dispara cálculo`);
    if (nombre === "incorporarFacturasOferta" && /repoSimVersions\.push\(/.test(b.texto)) fallos.push(`${nombre} emite una versión: sólo Re-evaluar la emite`);
    if (!/\bmonto\b/.test(b.texto) || !/deudores/.test(b.texto)) fallos.push(`${nombre} ya no actualiza lo aritmético (monto / deudores)`);
  }
  return fallos;
}
/* (2) Dentro de DealDrawer, toda mutación de la oferta marca la pendencia en el mismo bloque del handler. */
export function bloqueDealDrawer(src) {
  const i = src.indexOf("function DealDrawer(");
  if (i < 0) return null;
  const resto = src.slice(i);
  const fin = resto.slice(1).search(/\n(?:function|const|let) [A-Za-z_]/);
  return { texto: resto.slice(0, fin < 0 ? undefined : fin + 1), desde: i };
}
/* Tramo desde la llamada hasta el `}` que cierra el bloque que la contiene (o 800 caracteres). Cubre
   `() => { onX(...); setReevalPend(true); }`, el `if (…) { … }`, el `forEach((f) => onX(...)); setReevalPend(true);`
   y las sentencias partidas en varias líneas. */
function tramoDelHandler(texto, desde) {
  let prof = 0; let fin = desde;
  for (let i = desde; i < Math.min(texto.length, desde + 800); i++) {
    const ch = texto[i];
    if (ch === "{") prof++;
    else if (ch === "}") { if (prof === 0) break; prof--; }
    fin = i + 1;
  }
  return texto.slice(desde, fin);
}
export function llamadasSinPendencia(src, motivoExcluido) {
  const c = sinComentarios(src); const dd = bloqueDealDrawer(c);
  if (!dd) return ["no encuentro `function DealDrawer(`"];
  const fallos = []; let vistas = 0;
  const re = /\bon(IncorporarFacturas|RetirarFactura)\(\s*[A-Za-z_$][\w$]*\.id\b/g; let m;
  while ((m = re.exec(dd.texto))) {
    const seg = tramoDelHandler(dd.texto, m.index);
    const args = (seg.match(/^on\w+\(([^)]*)\)/) || [])[1] || "";
    if (motivoExcluido && new RegExp('"' + motivoExcluido + '"').test(args)) continue;
    vistas++;
    const k = lineaDe(c, dd.desde + m.index);
    if (!/setReevalPend\(true\)/.test(seg)) fallos.push(`línea ${k}: muta la oferta sin setReevalPend(true): «${seg.replace(/\s+/g, " ").trim().slice(0, 110)}»`);
  }
  if (vistas < 5) fallos.push(`sólo ${vistas} llamadas a onIncorporarFacturas/onRetirarFactura en DealDrawer (se esperaban ≥ 5: agregar una, todas, retirar, atajos)`);
  return fallos;
}
/* (3) Con la pendencia activa, la evaluación de línea es null y el veredicto no formatea ninguna cifra. */
export function pendienteSinNumero(src) {
  const c = sinComentarios(src); const fallos = [];
  const ev = canonico(c).match(/const evalLin = leeDeVersion \? ultVer\.linea\s*: reevalPend \? (null|.+?)\s*: asignarLineas\(validas/);
  if (!ev) fallos.push("no encuentro la cadena `evalLin = leeDeVersion ? … : reevalPend ? … : asignarLineas(validas…)`");
  else if (ev[1] !== "null") fallos.push(`con reevalPend la evaluación de línea vale «${ev[1]}» y tiene que ser null: una cifra vieja o recalculada se lee como cifra`);
  if (!/const \[reevalPend, setReevalPend\] = useState\(false\)/.test(c)) fallos.push("falta el estado `reevalPend` en DealDrawer");
  const iVd = c.search(/const vd = !validas\.length\s*\?/);
  if (iVd < 0) fallos.push("no encuentro la tarjeta de veredicto (`const vd = !validas.length ?`)");
  else {
    // Los DOS índices se miden sobre el MISMO texto (el canónico): compararlos en espacios distintos
    // —uno canónico y otro crudo— da un orden inventado, que es lo que pasó al formatear el fuente.
    const tramo = canonico(c.slice(iVd, iVd + 6000));
    const iPend = tramo.search(/: reevalPend \? \{tono: "parcial", tit: "La selección cambió"/);
    const iCifra = tramo.search(/fmtCLP\(evalLin\.cursable\)/);
    if (iPend < 0) fallos.push("el veredicto no tiene la rama «La selección cambió» para reevalPend");
    if (iCifra < 0) fallos.push("el veredicto ya no formatea la cifra cursable (cambió la forma; revisar el gate)");
    if (iPend >= 0 && iCifra >= 0 && iPend > iCifra) fallos.push("la rama reevalPend del veredicto va DESPUÉS de formatear la cifra: con la selección cambiada se mostraría un número");
    if (!/Sin evaluar/.test(c)) fallos.push("no existe el rótulo «Sin evaluar» de la fila sin evaluación");
  }
  return fallos;
}
/* (4) La versión congela línea y verificación juntas. */
export function versionUnica(src) {
  const c = sinComentarios(src); const fallos = [];
  const i = c.indexOf("function snapVersionCli(deal, rev, opts) {");
  if (i < 0) return ["no encuentro `function snapVersionCli(deal, rev, opts) {`"];
  const resto = c.slice(i); const fin = resto.slice(1).search(/\n(?:function|const|let) [A-Za-z_]/);
  const cuerpo = resto.slice(0, fin < 0 ? undefined : fin + 1);
  const ret = canonico(cuerpo).match(/return \{v: rev \+ 1,[\s\S]*?\};/);
  if (!ret) return ["no encuentro el `return { v: rev + 1, … }` de snapVersionCli"];
  if (!/\blinea\b/.test(ret[0])) fallos.push("la versión no congela `linea`");
  if (!/\bverificacion\b/.test(ret[0])) fallos.push("la versión no congela `verificacion`: verificación y líneas se recalculan en la MISMA reevaluación");
  if (!/asignarLineas\(fsOp, deal\.rutEmisor\)/.test(cuerpo)) fallos.push("la línea de la versión no sale de asignarLineas(fsOp, deal.rutEmisor)");
  if (!/verifResumenDeal\(deal\)/.test(cuerpo) || !/verifFactura\(f, deal\)/.test(cuerpo)) fallos.push("la verificación de la versión no sale de verifResumenDeal/verifFactura");
  // Desde la regla 72 (ADR-0013) la emite el EVENTO, `evaluarOperacion`; «Re-evaluación de la simulación» pasa por él.
  if (!/function evaluarOperacion\(deal, usuario, opts\) \{[\s\S]{0,1600}repoSimVersions\.push\(deal\.id, nv\)/.test(c)) fallos.push("evaluarOperacion ya no emite la versión (`repoSimVersions.push(deal.id, nv)`)");
  if (!/function reevaluarCliente\(deal, usuario\) \{[\s\S]{0,700}evaluarOperacion\(deal, usuario, \{/.test(c)) fallos.push("reevaluarCliente ya no pasa por el evento de evaluación (regla 72)");
  return fallos;
}
/* (4-bis) TODO emisor de versión emite las dos decisiones sobre la misma selección. El segundo argumento de
   cada `repoSimVersions.push(` es `snapVersionCli(...)`, un `nv` que sale de ahí, o un objeto literal; si el
   literal copia una versión anterior (`...prev`) y reescribe `linea:` tiene que reescribir `verificacion:`. */
export function emisoresCompletos(src) {
  const c = sinComentarios(src); const fallos = []; let n = 0;
  const re = /repoSimVersions\.push\(/g; let m;
  while ((m = re.exec(c))) {
    n++;
    // Argumentos hasta el paréntesis que cierra la llamada.
    let prof = 1; let j = m.index + m[0].length; const ini = j;
    for (; j < c.length && prof > 0; j++) { if (c[j] === "(") prof++; else if (c[j] === ")") prof--; }
    const args = c.slice(ini, j - 1);
    const k = lineaDe(c, m.index);
    const segundo = args.replace(/^[^,]*,\s*/, "");
    if (/^snapVersionCli\(/.test(segundo) || /^nv\b/.test(segundo)) continue;
    if (/\.\.\.\w+/.test(segundo) && /\blinea:/.test(segundo) && !/\bverificacion:/.test(segundo))
      fallos.push(`línea ${k}: emite una versión que recorta \`linea\` y COPIA \`verificacion\` de la anterior (la factura retirada sigue adentro y el total es el viejo): línea y verificación describen selecciones distintas — «nunca en flujos aparte»`);
  }
  // Desde la regla 72 los emisores son DOS: el evento (`evaluarOperacion`, que cubre simular y los dos re-evaluar) y el
  // rechazo del comité (`aplicarRechazoComite`, con la versión que `rechazoComiteDecision` arma con `snapVersionCli`).
  if (n < 2) fallos.push(`sólo ${n} emisores de versión (se esperaban ≥ 2: evaluarOperacion y aplicarRechazoComite)`);
  return fallos;
}

test("14 · (1) incorporar/retirar facturas de la oferta no llaman a ningún motor ni emiten versión: sólo lo aritmético", () => {
  assert.deepEqual(mutacionesSinMotor(jsx), []);
  // SONDA: se planta una asignación de líneas dentro de incorporar → el gate la caza.
  const plantado = jsx.replace("const incorporarFacturasOferta = (id, facs) => {", "const incorporarFacturasOferta = (id, facs) => {\n    const _ev = asignarLineas(facs, id);");
  assert.ok(mutacionesSinMotor(plantado).some((f) => /asignarLineas/.test(f)), "la sonda no cazó la asignación plantada");
  const plantado2 = jsx.replace("const retirarFacturaOferta = (id, fac, motivo) => {", "const retirarFacturaOferta = (id, fac, motivo) => {\n    verifResumenDeal({ id });");
  assert.ok(mutacionesSinMotor(plantado2).some((f) => /verifResumenDeal/.test(f)), "la sonda no cazó la verificación plantada");
});

const AGREGAR = /const agregar = \(\) => \{\s*onIncorporarFacturas\(deal\.id, \[f\]\);\s*setReevalPend\(true\);\s*\};/;
test("14 · (2) en DealDrawer, agregar o quitar desde la oferta marca setReevalPend(true) en el mismo handler (una o varias líneas, cualquier `<x>.id`)", () => {
  // La vía «noConfirmada» (tab Verificación) se juzga aparte, en el test siguiente.
  assert.deepEqual(llamadasSinPendencia(jsx, "noConfirmada"), []);
  assert.ok(AGREGAR.test(jsx), "no encuentro la sentencia `agregar` sobre la que se plantan las sondas");
  // SONDA 1: la sentencia `agregar` sin setReevalPend(true) → cazada, con su línea del fuente original.
  const lineaAgregar = lineaDe(jsx, jsx.search(AGREGAR));
  const s1 = llamadasSinPendencia(jsx.replace(AGREGAR, "const agregar = () => { onIncorporarFacturas(deal.id, [f]); };"), "noConfirmada");
  assert.ok(s1.some((f) => f.startsWith(`línea ${lineaAgregar}:`) && /sin setReevalPend/.test(f)), "la sonda no cazó la llamada sin pendencia (o la línea reportada no es la del fuente): " + JSON.stringify(s1));
  // SONDA 2: la misma llamada con otro nombre de deal (`d.id`) y sin pendencia → también cazada.
  const s2 = llamadasSinPendencia(jsx.replace(AGREGAR, "const agregar = () => { onIncorporarFacturas(d.id, [f]); };"), "noConfirmada");
  assert.ok(s2.some((f) => /sin setReevalPend/.test(f) && /d\.id/.test(f)), "la sonda no cazó `onIncorporarFacturas(d.id…)` sin pendencia");
  // SONDA 3 (falso positivo): la sentencia partida en varias líneas sigue siendo válida.
  const s3 = llamadasSinPendencia(jsx.replace(AGREGAR, "const agregar = () => {\n                            onIncorporarFacturas(deal.id, [f]);\n                            setReevalPend(true);\n                          };"), "noConfirmada");
  assert.deepEqual(s3, [], "el gate acusa una sentencia multilínea que sí marca la pendencia");
});

test("14 · (2-bis) DEFECTO documentado: la vía «noConfirmada» del tab Verificación también deja la operación pendiente de re-evaluar (regla 6: «el ejecutivo tiene que Re-evaluar — no se recalcula solo»)", () => {
  assert.deepEqual(llamadasSinPendencia(jsx, null), []);
});

test("14 · (3) con la selección cambiada la evaluación de línea es null («Sin evaluar»/«La selección cambió»), nunca una cifra vieja ni recalculada", () => {
  assert.deepEqual(pendienteSinNumero(jsx), []);
  // SONDA 1: la pendencia devuelve la versión anterior (cifra vieja) → el gate lo caza.
  const plantado = jsx.replace(/:\s*reevalPend\s*\?\s*null(\s*):\s*asignarLineas\(validas/, ": reevalPend ? (ultVer ? ultVer.linea : null)$1: asignarLineas(validas");
  assert.notEqual(plantado, jsx, "la sonda no encontró `reevalPend ? null`");
  assert.ok(pendienteSinNumero(plantado).some((f) => /tiene que ser null/.test(f)), "la sonda no cazó la cifra vieja");
  // SONDA 2: la rama «La selección cambió» se mueve DESPUÉS de la rama que formatea la cifra → cazada.
  // Las dos ramas ya no caben en una línea cada una (el formateo las abre), así que la sonda las mueve como
  // BLOQUES de texto: se recorta la rama `reevalPend` entera y se reinserta después de la que formatea la cifra.
  const RE_PEND = /\s*:\s*reevalPend\s*\?\s*\{[\s\S]{0,400}?tit: "La selección cambió"[\s\S]{0,400}?\n\s*\}/;
  const mP = jsx.match(RE_PEND);
  // Lo que la regla fija es que la rama `reevalPend` vaya ANTES de formatear la cifra, así que la sonda la
  // reinserta justo DESPUÉS de `fmtCLP(evalLin.cursable)`: ésa es la violación, no cambiar de lugar cualquier rama.
  const iCifra0 = jsx.search(/fmtCLP\(evalLin\.cursable\)/);
  assert.ok(mP && iCifra0 > mP.index, "no encuentro la rama reevalPend y la cifra para plantar el orden");
  const sinPend = jsx.slice(0, mP.index) + jsx.slice(mP.index + mP[0].length);
  const iCifra1 = sinPend.search(/fmtCLP\(evalLin\.cursable\)/);
  const fin = sinPend.indexOf("\n", iCifra1) + 1;
  const movido = (sinPend.slice(0, fin) + mP[0] + "\n" + sinPend.slice(fin)).split("\n");
  assert.ok(pendienteSinNumero(movido.join("\n")).some((f) => /va DESPUÉS de formatear la cifra/.test(f)), "la sonda no cazó la rama reevalPend puesta después de la cifra");
});

test("14 · (4) la versión que emite Re-evaluar congela línea Y verificación juntas (una sola reevaluación)", () => {
  assert.deepEqual(versionUnica(jsx), []);
  const plantado = jsx.replace(/(return \{\s*v: rev \+ 1,[\s\S]{0,1200}?)\blinea,(\s*)verificacion,/, "$1linea,$2");
  assert.notEqual(plantado, jsx, "la sonda no encontró `linea, verificacion,` en el return de snapVersionCli");
  assert.ok(versionUnica(plantado).some((f) => /verificacion/.test(f)), "la sonda no cazó la versión sin verificación");
});

/* El segundo emisor, tal como está hoy en el fuente (el formateo lo abre en varias líneas): se localiza por
   regex y se muta con regex, no con un literal pegado. */
const RE_RECORTE = /origen: `Verificación · el deudor no confirmó el folio \$\{fac\.folio \|\| fac\.id\}`,(\s*)linea: nl,?(\s*)\}\);/;
test("14 · (4-bis) el gate de emisores distingue las dos direcciones: limpio el fuente —desde la regla 71 ningún emisor recorta copiando la verificación vieja— y cazado el que se plante", () => {
  // HOY: ningún emisor incompleto. El único que lo era —el recorte de `retirarFacturaOferta` por «el deudor no
  // confirmó»— desapareció con ADR-0018 (regla 71): la verificación fallida ya no retira ni emite versión; quien retira
  // es el ejecutivo, con la operación reabierta, y la versión nueva sale de la simulación siguiente.
  assert.ok(!RE_RECORTE.test(jsx), "volvió el emisor de retirarFacturaOferta que recortaba la línea copiando la verificación vieja (regla 71: marcar no retira)");
  assert.deepEqual(emisoresCompletos(jsx), []);
  // SONDA: un emisor que copia una versión anterior y reescribe sólo `linea` → cazado, en su línea.
  const ANCLA = "  const reabrirOperacion = (id) => {\n";
  assert.ok(jsx.includes(ANCLA), "no encuentro dónde plantar la sonda");
  const plantado = jsx.replace(ANCLA, ANCLA + "    repoSimVersions.push(id, { ...prev0, v: 9, linea: nl0 });\n");
  const lineaPush = lineaDe(jsx, jsx.indexOf(ANCLA)) + 1;
  const f = emisoresCompletos(plantado);
  assert.ok(f.length === 1 && f[0].startsWith(`línea ${lineaPush}:`), "la sonda no cazó el emisor incompleto en su línea: " + JSON.stringify(f));
  // Dirección limpia: el mismo emisor recortando también la verificación → sin fallos.
  const reparado = jsx.replace(ANCLA, ANCLA + "    repoSimVersions.push(id, { ...prev0, v: 9, linea: nl0, verificacion: recortarVerificacion(prev0.verificacion, ids0) });\n");
  assert.deepEqual(emisoresCompletos(reparado), []);
});

/* Hasta el 23-09-2026 el emisor de `retirarFacturaOferta` (la vía «el deudor no confirmó») recortaba la LÍNEA y copiaba la
   verificación de la versión anterior: la versión nueva mezclaba dos selecciones, y este test fijaba ese único emisor
   incompleto como hallazgo del tablero. ADR-0018 (regla 71) retiró ese camino entero —marcar «no verificada» no retira
   ni emite versión—, así que el hallazgo se cerró por desaparición del emisor: `emisoresCompletos` devuelve [] y la
   sonda de arriba prueba que el gate sigue cazando uno plantado. */
