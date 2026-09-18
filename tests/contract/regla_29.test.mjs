/* Gate de contrato de la regla 29 (complemento del e2e): en el FUENTE, cada sitio que la regla nombra formatea
   con el abreviador que la regla le asigna. `fmtCLP` es el único que escribe pesos y `fmtMM` el único que
   abrevia en M$; una regla de PANTALLA se puede fijar en el texto porque los sitios son literales.
   Pesos: el titular del veredicto («Se puede cursar…»), el monto de cada deudor —las TRES ramas: fuera de la
   oferta `fmtCLP(disp.monto)`, «$X con línea, de $Y» y la simple `fmtCLP(monto)`—, «Línea disponible» (rótulo
   y tooltip), «Solicitud línea» (rótulo y tooltip) y «Total oferta». M$: el chip de conteo de sección, el
   indicador de línea de la cabecera y el badge del chip de Giro. Más el CTA («Enviar a Comité y Publicar»
   sólo cuando hay comité) y el ámbar del chip (texto Y fondo).
   Cada test lleva su SONDA: la violación plantada en una copia del fuente tiene que hacer fallar al detector.
   Lo que el gate TOLERA a propósito (queda en `hallazgos` del reporte, para que el usuario decida): el badge
   «M$Y puntual» dentro del chip «Línea disponible $X» y el titular «Aceptada · M$X con línea asignada» de la
   tarjeta de veredicto tras aceptar. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const entre = (src, desde, hasta) => { const i = src.indexOf(desde); if (i < 0) return null; const j = src.indexOf(hasta, i); return j < 0 ? null : src.slice(i, j + hasta.length); };
const plantillas = (bloque) => [...bloque.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]);

/* 1 · El titular del veredicto (las tres ramas con «Se puede cursar» / «No se puede cursar») sólo usa fmtCLP. */
export function veredictoEnPesos(src) {
  const b = entre(src, "evalLin.requiereComite === 0 ? { tono: \"con_linea\"", "cursar el resto hoy.` }");
  if (!b) return ["no encuentro el bloque del veredicto (las tres ramas con_linea / sin_linea / parcial)"];
  const fallos = [];
  if (!/Se puede cursar la oferta completa · \$\{fmtCLP\(evalLin\.cursable\)\}/.test(b)) fallos.push("la rama «oferta completa» no formatea con fmtCLP");
  if (!/Se puede cursar \$\{fmtCLP\(evalLin\.cursable\)\} de \$\{fmtCLP\(totalOf\)\}/.test(b)) fallos.push("la rama parcial no dice «Se puede cursar ${fmtCLP(cursable)} de ${fmtCLP(totalOf)}»");
  for (const p of plantillas(b)) if (/fmtMM\(/.test(p)) fallos.push("el veredicto abrevia en M$: ${" + p + "}");
  return fallos;
}
/* 2 · Monto del deudor (tres ramas), «Línea disponible» (rótulo y tooltip), «Solicitud línea» (rótulo, tooltip,
   ámbar de texto y fondo, el FALTANTE como cifra, sólo en la oferta) y «Total oferta»: fmtCLP. */
export function documentoEnPesos(src) {
  const fallos = [];
  if (!/<span>Total oferta · \{deudOf\.length\} deudor\(es\) · \{validas\.length\} factura\(s\)<\/span><span>\{fmtCLP\(totalOf\)\}<\/span>/.test(src)) fallos.push("«Total oferta» no va en fmtCLP(totalOf)");
  if (!/const lbl = hay \? `Línea disponible \$\{fmtCLP\(ld\.disponible\)\}`/.test(src)) fallos.push("«Línea disponible» no va en fmtCLP(ld.disponible)");
  if (!/`Línea disponible de este deudor: \$\{fmtCLP\(ld\.disponible\)\}/.test(src)) fallos.push("el tooltip de «Línea disponible» no va en fmtCLP(ld.disponible)");
  // «Solicitud línea» pasó de ser la rama gris del chip de estado a un chip PROPIO (17-09-2026): antes salía
  // sólo con el cupo en CERO —`pedir = !hay && enOferta`— y un deudor PARCIAL no escribía en ninguna parte la
  // plata que iba a pedir. Ahora la cifra es lo que la evaluación NO asignó, y por eso el gate exige el
  // FALTANTE y no el monto del deudor: un `solicitud = monto` volvería a reportar de más en cada parcial.
  if (!/const faltante = enOferta && ev \? Math\.max\(0, mmRound\(monto - ev\.asignado\)\) : 0;/.test(src)) fallos.push("«Solicitud línea» no pide el FALTANTE (monto - ev.asignado): un parcial reportaría de más");
  if (!/texto=\{`Solicitud línea \$\{fmtCLP\(solicitud\)\}`\}/.test(src)) fallos.push("«Solicitud línea» no va en fmtCLP(solicitud)");
  if (!/const tipSol = `Sin cupo para \$\{fmtCLP\(solicitud\)\}\$\{solicitud !== monto \? ` de sus \$\{fmtCLP\(monto\)\}` : ""\} en esta oferta: al cerrar, esa diferencia entra como línea PUNTUAL/.test(src)) fallos.push("el tooltip de «Solicitud línea» no va en fmtCLP(solicitud) y fmtCLP(monto) o ya no dice que entra como PUNTUAL al comité");
  // Fuera de la oferta no se pide nada: el `!enOferta ? 0` apaga el chip entero, porque se dibuja con `> 0`.
  if (!/const solicitud = !enOferta \? 0 : ev \? faltante : \(hay \? 0 : monto\);/.test(src)) fallos.push("«Solicitud línea» ya no se condiciona a estar EN la oferta (solicitud = !enOferta ? 0 : …)");
  if (!/\{solicitud > 0 && <ChipFila /.test(src)) fallos.push("el chip «Solicitud línea» no se dibuja con `solicitud > 0` (sin plata que pedir no hay chip)");
  if (!/<ChipFila fg="#C2410C" bg="#FFF7ED" borde="#F97316" punto="#F97316" texto=\{`Solicitud línea/.test(src)) fallos.push("el chip «Solicitud línea» no va en ámbar #C2410C sobre #FFF7ED con borde naranja #F97316");
  // La cifra de la derecha de la fila del deudor: fuera de la oferta `fmtCLP(disp.monto)`, con línea parcial
  // «$X con línea, de $Y», y la rama simple `fmtCLP(monto)` —la que muestran TODOS los deudores dentro de
  // línea—. El bloque va desde el «—» de «sin nada incorporable» hasta la cola «· tasa Z%».
  const fila = entre(src, "? (sinDisp ? <span style={{ color: C.faint }}>—</span> : ", "· tasa {tasa}%</span>");
  if (!fila) fallos.push("no encuentro el bloque del monto del deudor (de «—» a «· tasa {tasa}%»)");
  else {
    if (!/—<\/span> : fmtCLP\(disp\.monto\)\)/.test(fila)) fallos.push("el monto del deudor FUERA de la oferta («Documentos disponibles») no va en fmtCLP(disp.monto)");
    if (!/<>\{fmtCLP\(ev\.asignado\)\}<span[^>]*> con línea, de \{fmtCLP\(monto\)\}<\/span><\/>/.test(fila)) fallos.push("el monto del deudor («$X con línea, de $Y») no va en fmtCLP");
    if (!/<\/>\s*:\s*fmtCLP\(monto\)\}/.test(fila)) fallos.push("la rama simple del monto del deudor (asignado === monto) no va en fmtCLP(monto)");
    if (/fmtMM\(/.test(fila)) fallos.push("el monto del deudor abrevia en M$ en alguna rama");
  }
  return fallos;
}
/* 3 · Lo que se queda en M$: chip de sección, IndicadorLinea (sin un solo fmtCLP), badge de ChipGiro. */
export function resumenesEnMM(src) {
  const fallos = [];
  if (!/title="Monto seleccionado para esta oferta">\{fmtMM\(totalOf\)\}/.test(src)) fallos.push("el chip de conteo de sección no va en fmtMM(totalOf)");
  const ind = entre(src, "function IndicadorLinea(", "\n}\n");
  if (!ind) fallos.push("no encuentro IndicadorLinea");
  else { if (/fmtCLP\(/.test(ind)) fallos.push("IndicadorLinea formatea en pesos"); if (!/\{fmtMM\(L\.aprobada\)\} <span[^>]*>aprobada<\/span>/.test(ind) || !/`Disponible \$\{fmtMM\(L\.disponible\)\}`/.test(ind)) fallos.push("IndicadorLinea no dice «M$X aprobada» / «Disponible M$X»"); }
  const giro = entre(src, "function ChipGiro(", "\n}\n");
  if (!giro || !/badge=\{soloTipo \? null : fmtMM\(monto \|\| 0\)\}/.test(giro)) fallos.push("el badge de ChipGiro no va en fmtMM");
  return fallos;
}
/* 4 · El CTA nombra lo que va a pasar, y lo decide `evalLin.requiereComite > 0`. */
export function ctaComite(src) {
  const fallos = [];
  if (!/const labelAccion = \(k, aComite\) => \(k === "cerrar" && aComite\) \? "Enviar a Comité y Publicar"/.test(src)) fallos.push("labelAccion no devuelve «Enviar a Comité y Publicar» con aComite");
  if (!/\{ k: "cerrar", label: "Cerrar oferta y publicar"/.test(src)) fallos.push("la acción base ya no se llama «Cerrar oferta y publicar»");
  if (!/\{labelAccion\(accionSel, !!evalLin && evalLin\.requiereComite > 0\)\}/.test(src)) fallos.push("el botón principal no pasa `evalLin.requiereComite > 0` a labelAccion");
  return fallos;
}

test("29 · el titular del veredicto va en pesos (fmtCLP) y nunca en M$", () => assert.deepEqual(veredictoEnPesos(jsx), []));
test("29 · monto del deudor (fuera de la oferta, «con línea, de» y rama simple), «Línea disponible» y «Solicitud línea» (rótulo y tooltip; ámbar de texto y fondo, sólo en la oferta) y «Total oferta» van en fmtCLP", () => assert.deepEqual(documentoEnPesos(jsx), []));
test("29 · el chip de sección, el indicador de línea de la cabecera y el badge de Giro se quedan en fmtMM", () => assert.deepEqual(resumenesEnMM(jsx), []));
test("29 · el CTA dice «Enviar a Comité y Publicar» sólo cuando evalLin.requiereComite > 0", () => assert.deepEqual(ctaComite(jsx), []));

test("29 · SONDAS: cada violación plantada en una copia del fuente hace fallar a su detector", () => {
  const b = entre(jsx, "evalLin.requiereComite === 0 ? { tono: \"con_linea\"", "cursar el resto hoy.` }");
  const sondas = [
    ["titular en M$", veredictoEnPesos, jsx.replace(b, b.replace(/fmtCLP\(/g, "fmtMM("))],
    ["Total oferta en M$", documentoEnPesos, jsx.replace("<span>{fmtCLP(totalOf)}</span>", "<span>{fmtMM(totalOf)}</span>")],
    ["Línea disponible en M$", documentoEnPesos, jsx.replace("const lbl = hay ? `Línea disponible ${fmtCLP(ld.disponible)}`", "const lbl = hay ? `Línea disponible ${fmtMM(ld.disponible)}`")],
    ["tooltip de Línea disponible en M$", documentoEnPesos, jsx.replace("`Línea disponible de este deudor: ${fmtCLP(ld.disponible)}", "`Línea disponible de este deudor: ${fmtMM(ld.disponible)}")],
    ["Solicitud línea en M$", documentoEnPesos, jsx.replace("`Solicitud línea ${fmtCLP(solicitud)}`", "`Solicitud línea ${fmtMM(solicitud)}`")],
    ["tooltip de Solicitud línea en M$", documentoEnPesos, jsx.replace("const tipSol = `Sin cupo para ${fmtCLP(solicitud)}", "const tipSol = `Sin cupo para ${fmtMM(solicitud)}")],
    ["Solicitud línea fuera de la oferta", documentoEnPesos, jsx.replace("const solicitud = !enOferta ? 0 : ev ? faltante : (hay ? 0 : monto);", "const solicitud = ev ? faltante : (hay ? 0 : monto);")],
    ["Solicitud línea por el deudor entero y no por el faltante", documentoEnPesos, jsx.replace("const faltante = enOferta && ev ? Math.max(0, mmRound(monto - ev.asignado)) : 0;", "const faltante = enOferta && ev ? monto : 0;")],
    ["el chip se dibuja sin plata que pedir", documentoEnPesos, jsx.replace("{solicitud > 0 && <ChipFila fg=\"#C2410C\"", "{true && <ChipFila fg=\"#C2410C\"")],
    ["Solicitud línea en gris", documentoEnPesos, jsx.replace('<ChipFila fg="#C2410C" bg="#FFF7ED" borde="#F97316"', '<ChipFila fg="#6B7280" bg="#FFF7ED" borde="#F97316"')],
    ["Solicitud línea con fondo gris", documentoEnPesos, jsx.replace('<ChipFila fg="#C2410C" bg="#FFF7ED" borde="#F97316"', '<ChipFila fg="#C2410C" bg="#F3F4F6" borde="#F97316"')],
    ["monto del deudor «con línea, de» en M$", documentoEnPesos, jsx.replace("<>{fmtCLP(ev.asignado)}<span", "<>{fmtMM(ev.asignado)}<span")],
    ["monto del deudor, rama simple, en M$", documentoEnPesos, jsx.replace(/<\/span><\/>(\s*): fmtCLP\(monto\)\}/, "</span></>$1: fmtMM(monto)}")],
    ["monto del deudor fuera de la oferta en M$", documentoEnPesos, jsx.replace("—</span> : fmtCLP(disp.monto))", "—</span> : fmtMM(disp.monto))")],
    ["chip de sección en pesos", resumenesEnMM, jsx.replace('title="Monto seleccionado para esta oferta">{fmtMM(totalOf)}', 'title="Monto seleccionado para esta oferta">{fmtCLP(totalOf)}')],
    ["indicador de línea en pesos", resumenesEnMM, jsx.replace("{fmtMM(L.aprobada)} <span", "{fmtCLP(L.aprobada)} <span")],
    ["badge de Giro en pesos", resumenesEnMM, jsx.replace("badge={soloTipo ? null : fmtMM(monto || 0)}", "badge={soloTipo ? null : fmtCLP(monto || 0)}")],
    ["CTA sin comité", ctaComite, jsx.replace('(k === "cerrar" && aComite) ? "Enviar a Comité y Publicar"', '(k === "cerrar" && aComite) ? "Cerrar oferta y publicar"')],
    ["CTA sin mirar requiereComite", ctaComite, jsx.replace("{labelAccion(accionSel, !!evalLin && evalLin.requiereComite > 0)}", "{labelAccion(accionSel, false)}")],
  ];
  const mudas = sondas.filter(([, det, src]) => src === jsx || det(src).length === 0).map(([n]) => n);
  assert.deepEqual(mudas, [], "sondas que no cambiaron el fuente o que el detector no cazó");
  assert.equal(sondas.length, 19, "conteo de sondas (se cita en el reporte)"); // 17 → 19: el chip propio de «Solicitud línea» trajo la sonda del faltante y la del chip sin plata (17-09-2026)
});
