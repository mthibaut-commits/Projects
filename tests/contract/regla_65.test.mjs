/* Gate de contrato de la regla 65 (ninguna excepción sin justificar en la MUTACIÓN de cierre; solicitar sin
   justificación no escribe), sobre el TEXTO del fuente. La compuerta es pura y la prueba el caso 161
   (`compuertaExcepcionesMudas`, `excepcionesSinComentario`, `solicitarAprobacionExc`); lo que la suite no puede ver es
   que `cerrarOferta` —un closure de `PipelineComercial`— la LLAME antes de escribir, y que la Pre-evaluación envíe
   sus solicitudes con la declaración explícita. Eso se vigila acá.

   Las tres piezas, y por qué ninguna se prueba sola:
   1 · `cerrarOferta` re-comprueba las mudas ANTES de armar `patchCierre` y retorna la negativa. Sin esto la compuerta
       existe y nadie la llama: el defecto exacto que M-19 describía (la exigencia vivía sólo en el botón, regla 30).
   2 · `solicitarAprobacionExc` rechaza la solicitud muda antes de `repoSolicitudExc.set`. Sin esto la pantalla es el
       único control (regla 24), y al escritor llegan tres caminos.
   3 · `enviarPreEval` pasa `sinComentarios = true`: «Enviar de todos modos» ES la declaración. Sin esto la
       pre-evaluación dejaría de solicitar nada, en silencio, porque la pieza 2 rechazaría cada solicitud.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla65(src) {
  const fallos = [];
  const can = canonico(src);

  // 0 · La compuerta pura existe y siempre dice por qué.
  const iC = can.indexOf("function compuertaExcepcionesMudas(mudas) {");
  const comp = iC < 0 ? "" : can.slice(iC, iC + 600);
  if (!comp) fallos.push("no existe `compuertaExcepcionesMudas`: la exigencia vuelve a ser sólo de pantalla");
  else {
    if (!comp.includes("if (!n) return {ok: true, n: 0, motivo: null};")) fallos.push("`compuertaExcepcionesMudas` no deja pasar sin mudas");
    if (!/ok: false, n, motivo: `Cierre rechazado · \$\{n\} excepción\(es\) sin justificar/.test(comp))
      fallos.push("`compuertaExcepcionesMudas` no bloquea con la cuenta y el motivo «Cierre rechazado · N excepción(es) sin justificar»");
  }

  // 1 · `cerrarOferta` la llama y retorna ANTES de armar el patch.
  const iO = can.indexOf("const cerrarOferta = (id, opts = {}) => {");
  const iP = iO < 0 ? -1 : can.indexOf("const patchCierre = {", iO);
  const ventana = iO < 0 || iP < 0 ? "" : can.slice(iO, iP);
  if (!ventana) fallos.push("no encuentro `cerrarOferta` con su `patchCierre`");
  else {
    if (!ventana.includes("giroCursable(dChk ? dChk.giro : null)")) fallos.push("`cerrarOferta` dejó de re-comprobar el monto a girar (regla 13-septdecies)");
    if (!ventana.includes("const mudas = dChk ? excepcionesSinComentario(dChk) : [];"))
      fallos.push("`cerrarOferta` no vuelve a contar las excepciones sin justificar: la compuerta queda sólo en el botón de `ModalCurse`");
    if (!ventana.includes("const eChk = compuertaExcepcionesMudas(mudas);")) fallos.push("`cerrarOferta` no llama a `compuertaExcepcionesMudas`");
    if (!/if \(!eChk\.ok\) \{.*?return eChk;/.test(ventana)) fallos.push("`cerrarOferta` no retorna la negativa de la compuerta antes de escribir: con mudas seguiría cerrando");
  }

  // 2 · Solicitar sin justificación no escribe.
  const iS = can.indexOf("function solicitarAprobacionExc(deal, x, execCode, comentario, archivos, sinComentarios) {");
  const iW = iS < 0 ? -1 : can.indexOf("repoSolicitudExc.set(deal.id, sol);", iS);
  const escritor = iS < 0 || iW < 0 ? "" : can.slice(iS, iW);
  if (!escritor) fallos.push("no encuentro `solicitarAprobacionExc` con su escritura en `repoSolicitudExc`");
  else {
    if (!escritor.includes('const justificada = !!((comentario || "").trim() || (archivos && archivos.length) || sinComentarios);'))
      fallos.push("`solicitarAprobacionExc` no calcula si la solicitud viene justificada (comentario, respaldo o declaración)");
    if (!/if \(!justificada\) \{.*?return \{ok: false/.test(escritor))
      fallos.push("`solicitarAprobacionExc` guarda la solicitud muda: la pantalla vuelve a ser el único control (regla 24)");
  }

  // 3 · La Pre-evaluación envía con la declaración explícita.
  if (!can.includes('.forEach((it) => solicitarAprobacionExc(deal, it, usuario, "", [], true));'))
    fallos.push("`enviarPreEval` no pasa la declaración «sin comentarios»: con la pieza 2, «Enviar de todos modos» dejaría de solicitar nada, en silencio");
  return fallos;
}

test("regla 65: la mutación de cierre rechaza las excepciones sin justificar, solicitar sin justificación no escribe y la pre-evaluación declara", () => {
  assert.deepEqual(auditarRegla65(jsx), []);
});

/* Cada mutante planta UNA violación sobre el texto canónico (`canonico` es idempotente) y el gate tiene que cazarla. */
const MUTANTES = [
  ["`cerrarOferta` deja de llamar a la compuerta", (c) => c.replace("const eChk = compuertaExcepcionesMudas(mudas);", "const eChk = {ok: true, n: 0, motivo: null};")],
  ["`cerrarOferta` no retorna la negativa", (c) => c.replace("return eChk;", "")],
  ["`solicitarAprobacionExc` guarda la solicitud muda", (c) => c.replace("if (!justificada) {", "if (false && !justificada) {")],
  ["la pre-evaluación solicita sin declarar", (c) => c.replace('.forEach((it) => solicitarAprobacionExc(deal, it, usuario, "", [], true));', '.forEach((it) => solicitarAprobacionExc(deal, it, usuario, "", []));')],
  ["la compuerta deja pasar siempre", (c) => c.replace("if (!n) return {ok: true, n: 0, motivo: null};", "return {ok: true, n: 0, motivo: null};")],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no plantó nada: el texto quedó igual");
    assert.ok(auditarRegla65(mut).length > 0, "el gate no cazó la violación plantada");
  });
