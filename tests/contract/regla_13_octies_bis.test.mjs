/* Gate de contrato de la regla 13-octies-bis sobre el TEXTO del fuente, sin navegador: la sección de la
   oferta se titula «Documentos en la oferta»; su segmentado Por deudor / Por factura está gateado por la
   oferta NO vacía; la plana se arma con `facturasDeDeudores` —la MISMA función que la plana de
   «Documentos disponibles» y la que fija el caso 98—, `headDoc(true)` encabeza RUT deudor + razón social
   y `filaDoc(f, true)` pone esas dos celdas en cada fila; y la caja de vacío lleva exactamente los tokens
   de la regla (#F5F4F8 · borde 1px #E4E2EC · minHeight 72 · t11 font-medium · C.sub), nunca los viejos
   (#F7F7FA / C.faint) ni nada en su style que la esconda o desmienta un token (visibility, opacity,
   display, maxHeight, fontSize). Complementa al e2e: éste corre en milisegundos y aísla QUÉ token se
   movió; el e2e mide lo que el navegador dibuja.
   Sonda negativa: nueve mutantes del fuente, cada uno con una violación distinta, y el auditor tiene que
   nombrar la suya. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico} from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
/* Los dos títulos de sección, tolerando el salto de línea: prettier saca el texto JSX a su propia línea,
   así que `>Documentos en la oferta</span>` dejó de existir como texto contiguo. Lo que el gate fija es que
   el título esté, no cómo quedó envuelto. */
const TIT_OFERTA = />\s*Documentos en la oferta\s*<\/span>/;
const TIT_DISP = />\s*Documentos disponibles\s*<\/span>/;
const indiceDe = (src, re, desde = 0) => { const m = src.slice(desde).match(re); return m ? desde + m.index : -1; };
// Los tokens del vacío SE MIDIERON dos veces, y la segunda movió el par: mientras la caja vivía sobre
// blanco eran #EDECF3 / #DEDCE7; al mudarse la oferta al panel lila (regla 29, 17-09-2026) ese gris
// dejó de distinguirse del fondo y quedó en el tono de una tarjeta de fila. Lo que el gate defiende es
// que el vacío SE VEA: `viejoFondo` (#F7F7FA) y C.faint son los que lo hacían desaparecer y no vuelven.
const TOKENS = { fondo: "#F5F4F8", borde: "#E4E2EC", alto: 72, viejoFondo: "#F7F7FA" };

/* Recorta la sección de la oferta: desde su título hasta el título de «Documentos disponibles». */
export function seccionOferta(src) {
  const a = indiceDe(src, TIT_OFERTA); if (a < 0) return null;
  const b = indiceDe(src, TIT_DISP, a); if (b < 0) return null;
  return { texto: src.slice(a, b), desde: a, hasta: b };
}
/* Recorta `filaDoc(f, plana)`: desde su declaración hasta la de `cabDeudor`, que la sigue. */
export function tramoFilaDoc(src) {
  const a = src.indexOf("const filaDoc = (f, plana) => {"); if (a < 0) return null;
  const b = src.indexOf("const cabDeudor = ", a); if (b < 0) return null;
  return { texto: src.slice(a, b), desde: a, hasta: b };
}

export function auditarOferta(src) {
  const fallos = [];
  if (!TIT_OFERTA.test(src)) fallos.push("titulo: no existe el título «Documentos en la oferta»");
  if (/>Deudores en la oferta</.test(src)) fallos.push("titulo: sigue el título viejo «Deudores en la oferta»");
  const sec = seccionOferta(src);
  if (!sec) { fallos.push("seccion: no se pudo recortar la sección de la oferta"); return fallos; }
  const s = canonico(sec.texto);   // ver `canonico` en _comun.mjs: el patrón sigue siendo el de siempre
  // 1 · El segmentado sólo con la oferta no vacía: el `&&` de guarda va INMEDIATAMENTE antes del control.
  const iSeg = s.indexOf('lbl: "Por deudor"');
  if (iSeg < 0) fallos.push("segmentado: la sección de la oferta no tiene el control Por deudor / Por factura");
  else if (!/\{(?:validas|deudOf|deudOfF)\.length > 0 && \(<div.{0,300}?\{\[\{k: "deudor"/.test(s.slice(Math.max(0, iSeg - 500), iSeg + 20)))
    fallos.push("segmentado: el control Por deudor / Por factura de la oferta no está gateado por `validas.length > 0 &&` (con la oferta vacía no hay nada que presentar de dos formas)");
  if (!/lbl: "Por factura", tip: "Todas las facturas de la oferta en una sola lista/.test(s)) fallos.push("segmentado: falta «Por factura» con su tooltip propio de la oferta");
  // 2 · La plana es la MISMA función que la de disponibles (caso 98) y agrega RUT deudor + razón social:
  //     la cabecera (`headDoc(plana)`) y CADA fila (`filaDoc(f, plana)`, bloque `{plana && (<>…</>)}`).
  if (!/ofertaVista === "factura" && deudOfF\.length > 0 &&[\s\S]{0,400}?facturasDeDeudores\(deudOfF, grpOf\)\.map\(\(f\) => filaDoc\(f, true\)\)/.test(s))
    fallos.push("plana: la vista Por factura de la oferta no se arma con `facturasDeDeudores(deudOfF, grpOf)` + `filaDoc(f, true)`");
  if (!/\{headDoc\(true\)\}/.test(s)) fallos.push("plana: la vista Por factura de la oferta no dibuja `headDoc(true)`");
  // La plana de disponibles se calcula ANTES de la sección (`facturasDeDeudores(otTab.lista, grpOt)`): se
  // exige que haya otro call site distinto del de la oferta, o las dos vistas dejaron de compartir función.
  const llamadas = [...src.matchAll(/facturasDeDeudores\(([^)]*)\)/g)].map((m) => m[1].trim()).filter((a) => a !== "deudores, porDeudor");
  if (!llamadas.some((a) => a !== "deudOfF, grpOf")) fallos.push("plana: la plana de «Documentos disponibles» ya no usa `facturasDeDeudores` (las dos vistas dejaron de compartir función)");
  const headDoc = canonico(src).match(/const headDoc = \(plana\) => \(.*?\);/);
  if (!headDoc || !/\{plana && \(?<>\s*<span>RUT deudor<\/span>\s*<span>Razón social<\/span>\s*<\/>\)?\}/.test(headDoc[0])) fallos.push("plana: `headDoc(plana)` no agrega las columnas «RUT deudor» y «Razón social»");
  const fila = tramoFilaDoc(canonico(src));
  const bloque = fila && fila.texto.match(/\{plana && \(<>([\s\S]*?)<\/>\)\}/);
  if (!fila) fallos.push("plana: no encuentro `filaDoc(f, plana)` seguido de `cabDeudor`");
  else if (!bloque || !/\{f\.rutRecep\b/.test(bloque[1]) || !/\{f\.deudor\}/.test(bloque[1]))
    fallos.push("plana: `filaDoc(f, plana)` no agrega a la fila plana las celdas RUT deudor (`f.rutRecep`) y razón social (`f.deudor`) en su bloque `{plana && (<>…</>)}`");
  // 3 · La caja del vacío: el elemento que dice «Ninguna factura seleccionada» y su línea de apertura.
  const iVacio = s.indexOf('"Ninguna factura seleccionada"');
  if (iVacio < 0) { fallos.push("vacio: la sección no tiene el estado «Ninguna factura seleccionada»"); return fallos; }
  const antes = s.slice(0, iVacio); const iDiv = antes.lastIndexOf("<div ");
  const apertura = antes.slice(iDiv, antes.indexOf(">", iDiv) + 1);
  const cls = (apertura.match(/className="([^"]*)"/) || [])[1] || "";
  for (const c of ["t11", "font-medium"]) if (!cls.split(/\s+/).includes(c)) fallos.push(`vacio: la caja no lleva la clase ${c} (className «${cls}»)`);
  if (!new RegExp(`minHeight: ${TOKENS.alto}\\s*[,}]`).test(apertura)) fallos.push("vacio: la caja no declara minHeight: 72");
  if (!apertura.includes(`backgroundColor: "${TOKENS.fondo}"`)) fallos.push(`vacio: la caja no lleva el fondo ${TOKENS.fondo}`);
  if (!apertura.includes(`border: "1px solid ${TOKENS.borde}"`)) fallos.push(`vacio: la caja no lleva el borde 1px solid ${TOKENS.borde}`);
  if (!/color: C\.sub\b/.test(apertura)) fallos.push("vacio: el texto de la caja no va en C.sub");
  if (apertura.includes(TOKENS.viejoFondo) || /color: C\.faint\b/.test(apertura)) fallos.push("vacio: la caja volvió al estilo que desaparecía (#F7F7FA / C.faint)");
  // «Se ve»: nada en el style que la esconda (visibility/opacity/display) ni que desmienta un token que la
  // clase o el minHeight ya fijan (fontSize contra t11, maxHeight contra los 72 px). Lo que el navegador
  // dibuja lo mide el e2e; acá se cierra la puerta en el texto.
  const esconde = apertura.match(/\b(visibility|opacity|display|maxHeight|fontSize)\s*:/g);
  if (esconde) fallos.push(`vacio: el style de la caja declara ${esconde.map((x) => x.replace(/\s*:$/, "")).join(", ")}: la esconde o desmiente sus tokens (la regla dice que el vacío SE VE)`);
  if (!/deudOfF\.length === 0 && \(/.test(antes.slice(-1200))) fallos.push("vacio: la caja no está condicionada a la oferta vacía (`deudOfF.length === 0 &&`)");
  return fallos;
}

/* Mutantes: cada uno rompe UNA cosa dentro de la sección de la oferta (o de `filaDoc`). */
function mutar(src, f) { const sec = seccionOferta(src); return src.slice(0, sec.desde) + f(sec.texto) + src.slice(sec.hasta); }
function mutarFila(src, f) { const t = tramoFilaDoc(src); return src.slice(0, t.desde) + f(t.texto) + src.slice(t.hasta); }
const MUTANTES = {
  "fondo viejo #F7F7FA": { src: mutar(jsx, (s) => s.replace(`backgroundColor: "${TOKENS.fondo}"`, `backgroundColor: "${TOKENS.viejoFondo}"`)), re: /^vacio: .*fondo|estilo que desaparecía/ },
  "texto en C.faint": { src: mutar(jsx, (s) => s.replace(/(minHeight: 72[^}]*)color: C\.sub/, "$1color: C.faint")), re: /^vacio: .*C\.sub|C\.faint/ },
  "clase t9 en vez de t11": { src: mutar(jsx, (s) => s.replace(/rounded-xl px-3 t11 font-medium"(\s*)style=\{\{\s*minHeight: 72/, 'rounded-xl px-3 t9 font-medium"$1style={{ minHeight: 72')), re: /^vacio: .*clase t11/ },
  "minHeight 72.5 en vez de 72": { src: mutar(jsx, (s) => s.replace("minHeight: 72,", "minHeight: 72.5,")), re: /^vacio: .*minHeight: 72/ },
  "caja con visibility hidden en el style": { src: mutar(jsx, (s) => s.replace("minHeight: 72,", 'minHeight: 72, visibility: "hidden",')), re: /^vacio: .*visibility.*SE VE/ },
  "caja con maxHeight 10 (minHeight 72 intacto)": { src: mutar(jsx, (s) => s.replace("minHeight: 72,", "minHeight: 72, maxHeight: 10,")), re: /^vacio: .*maxHeight.*SE VE/ },
  "segmentado sin guarda de oferta vacía": { src: mutar(jsx, (s) => s.replace(/\{validas\.length > 0 && \(\s*(<div className="flex shrink-0 items-center rounded-lg p-0\.5")/, "{(\n$1")), re: /^segmentado: .*gateado/ },
  "plana reimplementada sin facturasDeDeudores": { src: mutar(jsx, (s) => s.replace("facturasDeDeudores(deudOfF, grpOf).map((f) => filaDoc(f, true))", "deudOfF.flatMap((dn) => grpOf[dn]).map((f) => filaDoc(f, true))")), re: /^plana: .*facturasDeDeudores\(deudOfF, grpOf\)/ },
  "filaDoc plana sin RUT ni razón social (cabecera intacta)": { src: mutarFila(jsx, (s) => s.replace(/\{plana && \(\s*<>[\s\S]*?<\/>\s*\)\}/, "{plana && null}")), re: /^plana: .*filaDoc\(f, plana\)/ },
  "título viejo": { src: jsx.replace(TIT_OFERTA, ">\n Deudores en la oferta\n </span>"), re: /^titulo:/ },
};

test("13-octies-bis · el fuente cumple: título, segmentado gateado, plana con facturasDeDeudores y RUT/razón social en cabecera (headDoc) y en cada fila (filaDoc), caja de vacío con sus tokens y sin nada que la esconda", () => {
  assert.deepEqual(auditarOferta(jsx), []);
});

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`13-octies-bis · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarOferta(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
