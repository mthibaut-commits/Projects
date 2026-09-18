/* Gate de contrato de la regla 30 sobre el TEXTO del fuente, sin navegador. La regla vive en dos closures de
   `DealDrawer` (`ejecutarAccion` y `panelAcciones`) y en la condición de render del botón «Acciones», así que no
   hay función de nivel módulo que la suite pueda llamar: acá se fija la ESTRUCTURA que la sostiene y el e2e
   (30.e2e.mjs) mide lo que el navegador hace.
   (1) LA NEGATIVA VA EN EL HANDLER: `ejecutarAccion(k, datosCurse)` tiene `if (!datosCurse) return;` ANTES de
       `setCursarModal(datosCurse)` y, de todas las props que DealDrawer recibe (se leen de su firma), sólo puede
       llamar a `onClose` —lista BLANCA, no negra: `onPublicar`, `onAdvance`, `onMover`, `onCerrarOferta`… quedan
       fuera por construcción—; tampoco llama a `intentarCerrar`. `onCerrarOferta` sólo se invoca desde los
       closures `intentarCerrar`/`confirmarPub`, e `intentarCerrar` sólo desde el `onConfirmar` de `<ModalCurse>`:
       cerrar tiene UN camino, el modal.
   (2) EL ÍTEM SE RETIRA DEL MENÚ: `ACCIONES_PPAL.filter((a) => seleccionable || a.k !== "cerrar")`, y `panelAcciones`
       no tiene NINGÚN otro camino al cierre: ni literal «Cerrar oferta»/«Publicar», ni `setCursarModal`, ni
       `intentarCerrar`, ni props de DealDrawer salvo `onReject` (la rama bloqueada) y `onMover` (sólo en (3)).
   (3) NO SE AVANZA DE ETAPA: el IIFE de «Avanzar a» empieza con `if (!seleccionable) return null;` y todo `onMover(`
       de `panelAcciones` vive DENTRO de ese IIFE (entre su `{(() => {` y su `})()}`), no sólo después de la guarda.
   (4) SÍ GANA «Eliminar la simulación y vaciar la oferta», bajo `!seleccionable`, en `C.red`, `disabled={!puedeReiniciar}`
       y con `motivoNoReset` escrito debajo.
   (5) DÓNDE SE MUESTRA: el botón «Acciones» va gateado por `!(tab === "negocio" && negTab === "detalle")` y por
       `!["otorgamiento", "verificacion"].includes(tab)`, y esos ids son los que la lista de tabs DECLARA
       (`["otorgamiento", "Otorgamiento"]`, `["verificacion", "Verificación"]`): renombrar el id deja el gate sin efecto.
   Sonda: doce mutantes del fuente —los siete originales y los cinco huecos que encontró la refutación—, una
   violación distinta cada uno, y el auditor tiene que nombrar la suya. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const ITEM = "Eliminar la simulación y vaciar la oferta";
const GUARDA_CURSE = "if (!datosCurse) return;";
const FILTRO_CERRAR = 'ACCIONES_PPAL.filter((a) => seleccionable || a.k !== "cerrar")';
const GUARDA_AVANZAR = "if (!seleccionable) return null;";
const GATE_NEGOCIO = '!(tab === "negocio" && negTab === "detalle")';
const GATE_TABS = '!["otorgamiento", "verificacion"].includes(tab)';
const TAB_OTORG = '["otorgamiento", "Otorgamiento"]';
const TAB_VERIF = '["verificacion", "Verificación"]';
const PROPS_EJECUTAR = ["onClose"]; // lista blanca: lo único que ejecutarAccion puede invocar de las props de DealDrawer
const PROPS_PANEL = ["onReject", "onMover"]; // onReject en la rama bloqueada; onMover sólo dentro del IIFE guardado

/* El cuerpo de DealDrawer y la lista de props que recibe (de su firma). */
export function dealDrawer(src) {
  const i = src.indexOf("function DealDrawer(");
  if (i < 0) return null;
  const firma = src.slice(i, src.indexOf(")", i) + 1);
  const props = (firma.match(/\{([^}]*)\}/) || [, ""])[1].split(",").map((s) => s.trim().split(/[:=\s]/)[0]).filter(Boolean);
  return { cuerpo: src.slice(i), props };
}
/* Closure de DealDrawer (2 espacios): desde `  const nombre = ` hasta la siguiente declaración/return a esa sangría. */
export function closureDe(src, nombre) {
  const m = src.match(new RegExp(`^  const ${nombre} = [^\\n]*\\n`, "m"));
  if (!m) return null;
  const desde = m.index + m[0].length;
  const resto = src.slice(desde);
  const fin = resto.search(/^  (?:const|let|function|return|useEffect|useLayoutEffect)\b/m);
  return m[0] + (fin < 0 ? resto : resto.slice(0, fin));
}
/* El elemento JSX `<ModalCurse … />` (hasta su cierre `/>`). */
export function elementoModalCurse(src) {
  const a = src.search(/<ModalCurse[\s>]/); if (a < 0) return null;
  const b = src.indexOf("/>", a); if (b < 0) return null;
  return src.slice(a, b + 2);
}
/* El IIFE `{(() => { … })()}` de panelAcciones que contiene «Avanzar a», por su sangría: [inicio, fin) dentro de `pa`. */
export function iifeAvanzar(pa) {
  const iAv = pa.search(/>\s*Avanzar a\s*</); if (iAv < 0) return null;
  const ini = pa.lastIndexOf("{(() => {", iAv); if (ini < 0) return null;
  const sangria = (pa.slice(pa.lastIndexOf("\n", ini) + 1, ini).match(/^\s*/) || [""])[0];
  const cierre = new RegExp("^" + sangria + "\\}\\)\\(\\)\\}", "m");
  const m = cierre.exec(pa.slice(iAv));
  if (!m) return null;
  return { ini, fin: iAv + m.index + m[0].length, iAv };
}
/* La línea que dibuja el botón «Acciones» del encabezado y la condición JSX que la gatea (`{… && (` más cercano arriba). */
export function renderBotonAcciones(src) {
  const L = src.split("\n");
  const i = L.findIndex((l, k) => /Acciones <ChevronDown/.test(l) && L.slice(Math.max(0, k - 8), k).some((x) => /setAccMenu\(/.test(x)));
  if (i < 0) return null;
  let j = i - 1;
  while (j >= 0 && i - j <= 20 && !/^\s*\{.*&& \($/.test(L[j])) j--;
  return { linea: L[i], gate: j >= 0 && i - j <= 20 ? L.slice(j, i).join("\n") : "", siguiente: L.slice(i + 1, i + 6).join("\n") };
}
/* El texto sin comentarios JSX `{/* … *\/}`, de bloque ni de línea. */
export const sinComentarios = (txt) => txt.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
/* Llamadas `nombre(` de una lista de nombres dentro de un texto. */
const llamadas = (txt, nombres) => nombres.filter((n) => new RegExp("\\b" + n + "\\(").test(txt));

export function auditar(src) {
  const fallos = [];
  const dd = dealDrawer(src);
  if (!dd) return ["no encuentro `function DealDrawer(` en el fuente"];
  const propsOn = dd.props.filter((p) => /^on[A-Z]/.test(p));
  if (propsOn.length < 5) fallos.push("la firma de DealDrawer ya no declara sus props `onXxx` como objeto destructurado: el auditor no puede leer la lista blanca");
  // (1) el handler
  const ej = closureDe(src, "ejecutarAccion");
  if (!ej) fallos.push("no encuentro el closure `ejecutarAccion` en DealDrawer");
  else {
    if (!/\(k, datosCurse\) =>/.test(ej)) fallos.push("`ejecutarAccion` ya no recibe `datosCurse` como segundo parámetro");
    const g = ej.indexOf(GUARDA_CURSE), s = ej.indexOf("setCursarModal(datosCurse)");
    if (g < 0) fallos.push("`ejecutarAccion` perdió la guarda `" + GUARDA_CURSE + "`: sin datosCurse tiene que NO cerrar (la negativa va en el handler, regla 24)");
    if (s < 0) fallos.push("`ejecutarAccion` ya no abre `ModalCurse` con `setCursarModal(datosCurse)`");
    if (g >= 0 && s >= 0 && g > s) fallos.push("la guarda `if (!datosCurse) return;` está DESPUÉS de `setCursarModal`: el modal se abriría igual sin datos");
    const fuera = llamadas(ej, propsOn).filter((p) => !PROPS_EJECUTAR.includes(p));
    if (fuera.length) fallos.push(`\`ejecutarAccion\` llama a props de DealDrawer fuera de la lista blanca [${PROPS_EJECUTAR.join(", ")}]: ${fuera.join(", ")} — cierra, publica o mueve de etapa sin pasar por ModalCurse`);
    if (/intentarCerrar\(/.test(ej)) fallos.push("`ejecutarAccion` llama a `intentarCerrar`: salta el modal de curse");
  }
  // cerrar tiene UN camino: onCerrarOferta sólo desde intentarCerrar/confirmarPub, e intentarCerrar sólo desde <ModalCurse onConfirmar>
  const totalCerrar = (dd.cuerpo.match(/onCerrarOferta\(/g) || []).length;
  const enClosures = ["intentarCerrar", "confirmarPub"].reduce((n, c) => n + ((closureDe(dd.cuerpo, c) || "").match(/onCerrarOferta\(/g) || []).length, 0);
  if (totalCerrar === 0 || totalCerrar !== enClosures)
    fallos.push(`\`onCerrarOferta(\` se invoca ${totalCerrar} veces en DealDrawer y ${enClosures} de ellas desde intentarCerrar/confirmarPub: tiene que ser sólo desde ahí`);
  const sitiosIntentar = (dd.cuerpo.match(/intentarCerrar\(/g) || []).length; // la declaración es `intentarCerrar = (`, no cuenta
  const mc = elementoModalCurse(dd.cuerpo);
  if (!mc) fallos.push("no encuentro el elemento `<ModalCurse … />` en DealDrawer");
  else if (sitiosIntentar !== 1 || !/intentarCerrar\(/.test(mc)) fallos.push(`\`intentarCerrar(\` tiene ${sitiosIntentar} llamador(es); tiene que ser exactamente uno y dentro de <ModalCurse onConfirmar>`);
  // (2)(3)(4) el panel
  const pa = closureDe(src, "panelAcciones");
  if (!pa) fallos.push("no encuentro el closure `panelAcciones` en DealDrawer");
  else {
    if (!pa.includes(FILTRO_CERRAR)) fallos.push("`panelAcciones` ya no filtra «cerrar» fuera del menú «Acciones» (`" + FILTRO_CERRAR + "`)");
    // los literales se buscan en el CÓDIGO: los comentarios del panel citan «Cerrar oferta y publicar» para explicar por qué no está
    const paCodigo = sinComentarios(pa);
    if (/Cerrar oferta|Publicar\b|Enviar a Comité/.test(paCodigo)) fallos.push("`panelAcciones` escribe un ítem de cierre a mano (fuera de ACCIONES_PPAL): el menú «Acciones» volvería a ofrecer cerrar");
    if (/setCursarModal\(|intentarCerrar\(/.test(pa)) fallos.push("`panelAcciones` abre el cierre directo (`setCursarModal`/`intentarCerrar`) sin pasar por ejecutarAccion");
    const fueraPanel = llamadas(pa, propsOn).filter((p) => !PROPS_PANEL.includes(p));
    if (fueraPanel.length) fallos.push(`\`panelAcciones\` llama a props de DealDrawer fuera de la lista blanca [${PROPS_PANEL.join(", ")}]: ${fueraPanel.join(", ")}`);
    const iife = iifeAvanzar(pa);
    if (!iife) fallos.push("`panelAcciones` perdió la sección «Avanzar a» del botón principal (o su IIFE `{(() => { … })()}`; sigue existiendo como elección en Negocio › Detalle)");
    else {
      const iGuarda = pa.indexOf(GUARDA_AVANZAR, iife.ini);
      if (iGuarda < 0 || iGuarda > iife.iAv) fallos.push("la sección «Avanzar a» no arranca con `" + GUARDA_AVANZAR + "`: el menú «Acciones» ofrecería avanzar de etapa");
      for (const m of pa.matchAll(/onMover\(/g)) if (m.index < Math.max(iGuarda, iife.ini) || m.index > iife.fin) fallos.push("hay un `onMover(` en `panelAcciones` FUERA del IIFE guardado por `!seleccionable`: el menú «Acciones» movería de etapa");
    }
    const iItem = pa.indexOf(ITEM);
    if (iItem < 0) fallos.push("`panelAcciones` perdió «" + ITEM + "»: desde las otras pestañas no habría forma de llegar");
    else {
      const antes = pa.slice(0, iItem);
      const iGate = antes.lastIndexOf("{!seleccionable && (");
      const iBtn = antes.lastIndexOf("<button");
      if (iGate < 0 || iGate > iBtn) fallos.push("el ítem «Eliminar la simulación…» no está bajo `{!seleccionable && (<>`");
      const btn = antes.slice(iBtn);
      if (!/disabled=\{!puedeReiniciar\}/.test(btn)) fallos.push("el botón «Eliminar la simulación…» no va `disabled={!puedeReiniciar}`");
      if (!/color: C\.red/.test(btn)) fallos.push("el botón «Eliminar la simulación…» no va en rojo (`color: C.red`)");
      const despues = pa.slice(iItem, iItem + 500);
      if (!/\{!puedeReiniciar && \(?\s*<div[^>]*>\s*\{motivoNoReset\}\s*<\/div>/.test(despues)) fallos.push("el motivo (`motivoNoReset`) no está ESCRITO debajo del ítem cuando no se puede");
    }
  }
  // (5) dónde se muestra, y que los ids del gate sean los que la lista de tabs declara
  const rb = renderBotonAcciones(src);
  if (!rb) fallos.push("no encuentro el botón «Acciones» del encabezado del detalle");
  else {
    if (!rb.gate.includes(GATE_NEGOCIO)) fallos.push("el botón «Acciones» ya no se oculta en Negocio › Detalle (`" + GATE_NEGOCIO + "`)");
    if (!rb.gate.includes(GATE_TABS)) fallos.push("el botón «Acciones» ya no se oculta en Otorgamiento/Verificación (`" + GATE_TABS + "`)");
    if (!/panelAcciones\(false\)/.test(rb.siguiente)) fallos.push("el botón «Acciones» del encabezado no abre `panelAcciones(false)` (la variante sin cerrar ni avanzar)");
  }
  if (!dd.cuerpo.includes(TAB_OTORG)) fallos.push("la lista de tabs de DealDrawer ya no declara `" + TAB_OTORG + "`: el gate `" + GATE_TABS + "` apunta a un id que no existe y no oculta nada");
  if (!dd.cuerpo.includes(TAB_VERIF)) fallos.push("la lista de tabs de DealDrawer ya no declara `" + TAB_VERIF + "`: el gate `" + GATE_TABS + "` apunta a un id que no existe y no oculta nada");
  return fallos;
}

test("regla 30 · el menú «Acciones» no cierra la oferta ni avanza de etapa: la negativa va en el handler (lista blanca), el ítem se retira, «Avanzar a» sólo dentro del IIFE guardado, el reset sí, y el botón no sale en Negocio/Otorgamiento/Verificación con los ids que la lista de tabs declara", () => {
  assert.deepEqual(auditar(jsx), []);
});

test("el auditor lee la lista de props de DealDrawer (la lista blanca vigila a onPublicar, onAdvance, onMover, onCerrarOferta…)", () => {
  const dd = dealDrawer(jsx);
  for (const p of ["onClose", "onPublicar", "onAdvance", "onMover", "onCerrarOferta", "onReject", "onLimpiarSimulacion"]) assert.ok(dd.props.includes(p), `falta ${p} en la firma leída: ${dd.props.join(",")}`);
});

/* Sonda: cada mutante rompe UNA cosa y el auditor tiene que nombrarla. Todos parten del fuente actual. */
const FIN_IIFE = "          })()}\n        </>\n      )}\n    </div>\n  );\n  return (\n    <>\n      {!fullPage";
const MUTANTES = [
  ["sin la guarda `if (!datosCurse) return;`", (s) => s.replace(GUARDA_CURSE, ""), /perdió la guarda/],
  ["el atajo viejo: onCerrarOferta directo antes de la guarda", (s) => s.replace(GUARDA_CURSE, 'if (!datosCurse) { onCerrarOferta(deal.id, { publicacion: "electronica" }); return; }'), /fuera de la lista blanca \[onClose\]: onCerrarOferta/],
  ["la guarda después de setCursarModal", (s) => s.replace(GUARDA_CURSE + "\n    setCursarModal(datosCurse);", "setCursarModal(datosCurse);\n    " + GUARDA_CURSE), /DESPUÉS de `setCursarModal`/],
  ["el menú vuelve a ofrecer «Cerrar oferta y publicar»", (s) => s.replace(FILTRO_CERRAR, "ACCIONES_PPAL"), /ya no filtra «cerrar»/],
  ["«Avanzar a» sin la guarda !seleccionable", (s) => s.replace(GUARDA_AVANZAR, ""), /no arranca con/],
  ["el botón «Acciones» también en Negocio › Detalle", (s) => s.replace(GATE_NEGOCIO + " && ", ""), /ya no se oculta en Negocio/],
  ["el botón «Acciones» también en Otorgamiento/Verificación", (s) => s.replace(" && " + GATE_TABS, ""), /ya no se oculta en Otorgamiento/],
  // los cinco huecos de la refutación
  ["(hueco 9) «Avanzar a» reinstalado como botón suelto DESPUÉS del IIFE, con índice mayor que la guarda",
    (s) => s.replace(FIN_IIFE, FIN_IIFE.replace("          })()}\n", '          })()}\n          {!seleccionable && <button onClick={() => { setAccMenu(false); onMover(deal.id, "otorgamiento"); }}>Otorgamiento</button>}\n')), /FUERA del IIFE guardado/],
  ["(hueco 10) ítem «Cerrar oferta y publicar» agregado al menú «Acciones» vía setCursarModal, sin pasar por ACCIONES_PPAL",
    (s) => s.replace("{!seleccionable && (", '{false && <button onClick={() => { setAccMenu(false); setCursarModal({ evalLin: null }); }}>Cerrar oferta y publicar</button>}\n          {!seleccionable && ('), /escribe un ítem de cierre a mano|abre el cierre directo/],
  ["(hueco 11) ejecutarAccion sin datosCurse PUBLICA por onPublicar, con la guarda intacta",
    (s) => s.replace(GUARDA_CURSE, 'if (k === "cerrar" && !datosCurse) { onPublicar(deal.id, deal.tasa, {}, "electronica"); return; }\n    ' + GUARDA_CURSE), /fuera de la lista blanca \[onClose\]: onPublicar/],
  ["(hueco 12) ejecutarAccion sin datosCurse AVANZA por onAdvance, con la guarda intacta",
    (s) => s.replace(GUARDA_CURSE, 'if (k === "cerrar" && !datosCurse) { onAdvance(deal.id); return; }\n    ' + GUARDA_CURSE), /fuera de la lista blanca \[onClose\]: onAdvance/],
  ["(hueco 13) el id del tab pasa de «otorgamiento» a «otorg»: el gate textual queda igual y ya no oculta nada",
    (s) => s.replace(TAB_OTORG, '["otorg", "Otorgamiento"]').replace(/tab === "otorgamiento"/g, 'tab === "otorg"'), /ya no declara `\["otorgamiento"/],
  ["(variante de 12) ejecutarAccion mueve de etapa con onMover", (s) => s.replace(GUARDA_CURSE, 'if (!datosCurse) { onMover(deal.id, "otorgamiento"); return; }'), /fuera de la lista blanca \[onClose\]: onMover/],
  ["(variante de 10) panelAcciones publica por onPublicar desde el reset", (s) => s.replace("setConfirmReset(true);", 'setConfirmReset(true); onPublicar(deal.id, deal.tasa, {}, "electronica");'), /fuera de la lista blanca \[onReject, onMover\]: onPublicar/],
];
for (const [nombre, mutar, esperado] of MUTANTES) {
  test(`sonda · mutante «${nombre}» es atrapado`, () => {
    const m = mutar(jsx);
    assert.notEqual(m, jsx, "el mutante no cambió nada: el ancla del reemplazo ya no existe en el fuente");
    const f = auditar(m);
    assert.ok(f.some((x) => esperado.test(x)), `el auditor no nombró la violación esperada (${esperado}); dijo: ${f.join(" | ") || "nada"}`);
  });
}
