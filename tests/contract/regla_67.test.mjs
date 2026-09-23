/* Gate de contrato de la regla 67 (ADR-0018: la verificación fallida MARCA y AVISA, no retira; el ejecutivo retira,
   re-simula y vuelve a publicar), sobre el TEXTO del fuente. Lo que se puede llamar por nombre lo prueba el caso 167
   (`verifResumenDeal`, `issueVerificacion`, `filasVerificacion`, `avisarNoVerificadas`, el veto); lo que la suite no
   alcanza son los closures de React: que los tres caminos de la mesa y el diálogo del detalle marquen en vez de retirar,
   que `retirarFacturaOferta` ya no tenga la excepción «noConfirmada» ni emita versión, que el issue se vea en la cabecera
   y en el tab, y que ninguna pantalla siga prometiendo el retiro.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla67(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · UN solo escritor del veto, que no retira ni versiona.
  const iM = can.indexOf("const marcarNoVerificada = (id, facs, gestion) => {");
  const marca = iM < 0 ? "" : can.slice(iM, can.indexOf("const verificarDeudor = async (fila, confirmadas, llamada) => {", iM));
  if (!marca) fallos.push("no existe `marcarNoVerificada`: la marca no tiene escritor propio");
  else {
    if (!marca.includes("repoNoConfirmadas.set(id, nc);")) fallos.push("`marcarNoVerificada` no escribe el veto: la factura volvería a entrar (regla 6)");
    if (!marca.includes("if (d0) avisarNoVerificadas(d0, fs, motivoLbl);")) fallos.push("`marcarNoVerificada` no avisa al ejecutivo comercial");
    if (!marca.includes("logOtorgEvento(")) fallos.push("`marcarNoVerificada` no deja el evento en la bitácora con actor y hora");
    if (/retirarFacturaOferta\(|repoSimVersions\.push\(|setDeals\(/.test(marca)) fallos.push("`marcarNoVerificada` RETIRA o VERSIONA: marcar no toca la oferta (ADR-0018)");
  }
  // 2 · Los tres caminos de la mesa marcan; ninguno retira con «noConfirmada».
  if (!can.includes("if (no.length) marcarNoVerificada(fila.deal.id, no, llamada);")) fallos.push("`verificarDeudor` (confirmación parcial) no marca las no confirmadas");
  if (!can.includes("marcarNoVerificada(fila.deal.id, [f], gestion);")) fallos.push("`marcarFactura` no marca el documento no confirmado");
  if (!can.includes("marcarNoVerificada(fila.deal.id, fila.facturas, gestion);")) fallos.push("`noConfirmoDeudor` no marca las facturas del deudor");
  if (can.includes('"noConfirmada")')) fallos.push("alguien vuelve a retirar con el motivo «noConfirmada»: la verificación no retira (ADR-0018)");
  // 3 · `retirarFacturaOferta` sin excepción: la guarda de sólo lectura aplica siempre, y no recorta ni emite versión.
  const iR = can.indexOf("const retirarFacturaOferta = (id, fac, motivo) => {");
  const ret = iR < 0 ? "" : can.slice(iR, can.indexOf("const upd = (d) => {", iR));
  if (!ret) fallos.push("no encuentro `retirarFacturaOferta`");
  else {
    if (!ret.includes("if (ofertaCerradaVigente(dRet)) {")) fallos.push("`retirarFacturaOferta` ya no comprueba la oferta cerrada");
    if (/noConfirmada|repoNoConfirmadas\.set\(|repoSimVersions\.push\(|recortarAsignacion\(/.test(ret)) fallos.push("`retirarFacturaOferta` conserva la excepción de la verificación (veto, recorte o versión): la operación firmada volvería a encoger sin nueva firma");
  }
  // 4 · El detalle marca, no retira; el rótulo no promete el retiro.
  if (!can.includes('etiquetaConfirmar="Marcar no verificada" onConfirmar={() => {onMarcarNoVerificada(deal.id, [confirmNoConf], null);')) fallos.push("el diálogo del tab Verificación del detalle no marca (o su rótulo sigue prometiendo retirar)");
  if (!can.includes("onMarcarNoVerificada={marcarNoVerificada}")) fallos.push("`DealDrawer` no recibe `onMarcarNoVerificada`");
  if (!can.includes("El deudor no confirmó · marcar")) fallos.push("el botón del tab Verificación no dice «marcar»");
  if (/El deudor no confirmó · retirar|Retirar factura no confirmada/.test(can)) fallos.push("el detalle sigue prometiendo retirar al no confirmar");
  // 5 · El issue existe y se ve: resumen, texto, cabecera, tab y VER-01.
  if (!can.includes("noVerif: noVerificadas.length")) fallos.push("`verifResumenDeal` no cuenta las marcadas que siguen en la oferta");
  if (!can.includes("function issueVerificacion(deal, estado) {")) fallos.push("no existe `issueVerificacion`: el issue no tiene una sola fuente");
  if (!can.includes("No se puede cursar · {iss.n} no verificada(s)")) fallos.push("la cabecera del detalle no muestra el issue");
  if (!can.includes("<b>{iss.titulo}.</b> {iss.texto}")) fallos.push("el tab Verificación no muestra el issue");
  if (!can.includes("no cursa · {issTab.n}")) fallos.push("la cabecera del detalle (el tab Verificación) no marca el issue");
  if (!can.includes("marcada(s) no verificada(s): el ejecutivo tiene que retirarlas, re-simular y volver a publicar")) fallos.push("VER-01 no nombra las marcadas ni dice qué hacer");
  // 6 · El aviso: del sistema al ejecutivo, y calla sin marcadas.
  const iA = can.indexOf("function avisarNoVerificadas(deal, facs, motivo) {");
  const av = iA < 0 ? "" : can.slice(iA, can.indexOf("function excepcionesSinComentario(deal) {", iA));
  if (!av) fallos.push("no existe `avisarNoVerificadas` de nivel módulo");
  else {
    if (!av.includes("if (!deal || !fs.length) return null;")) fallos.push("el aviso no calla sin facturas marcadas");
    if (!av.includes("hiloEnviar(h, CODE_SISTEMA, texto, null);")) fallos.push("el aviso no lo firma el sistema");
    if (!av.includes("const ejec = deal.exec && USERS[deal.exec] ? deal.exec : null;")) fallos.push("el aviso no va al ejecutivo dueño de la operación");
  }
  // 7 · La mesa no promete retirar y no duplica la marcada que sigue en la oferta.
  if (/Retirar y vetar|se retira de la oferta y queda vetado|retira y veta todo/.test(can)) fallos.push("la mesa sigue prometiendo retirar al marcar");
  if (!can.includes('"Marcar no verificada"}')) fallos.push("el pie del panel de la mesa no dice «Marcar no verificada»");
  if (!can.includes(".filter(([id]) => !enOfertaIds.has(id))")) fallos.push("la mesa lista dos veces la marcada que sigue en la oferta");
  return fallos;
}

test("regla 67: la verificación fallida marca y avisa, no retira; el ejecutivo retira, re-simula y vuelve a publicar", () => {
  assert.deepEqual(auditarRegla67(jsx), []);
});

const MUTANTES = [
  ["la mesa vuelve a retirar al confirmar parcialmente", (c) => c.replace("if (no.length) marcarNoVerificada(fila.deal.id, no, llamada);", 'no.forEach((f) => retirarFacturaOferta(fila.deal.id, f, "noConfirmada"));')],
  ["la marca retira", (c) => c.replace("repoNoConfirmadas.set(id, nc); const deudor = fs[0].deudor", "repoNoConfirmadas.set(id, nc); fs.forEach((f) => retirarFacturaOferta(id, f)); const deudor = fs[0].deudor")],
  ["la marca no avisa", (c) => c.replace("if (d0) avisarNoVerificadas(d0, fs, motivoLbl);", "")],
  ["el retiro recupera la excepción de la verificación", (c) => c.replace("const dRet = (dealsRef.current || []).find((x) => x.id === id); if (ofertaCerradaVigente(dRet)) {", 'const dRet = (dealsRef.current || []).find((x) => x.id === id); if (motivo !== "noConfirmada" && ofertaCerradaVigente(dRet)) {')],
  ["el diálogo del detalle retira", (c) => c.replace('etiquetaConfirmar="Marcar no verificada" onConfirmar={() => {onMarcarNoVerificada(deal.id, [confirmNoConf], null);', 'etiquetaConfirmar="Retirar factura no confirmada" onConfirmar={() => {onRetirarFactura(deal.id, confirmNoConf, "noConfirmada");')],
  ["la cabecera no muestra el issue", (c) => c.replace("No se puede cursar · {iss.n} no verificada(s)", "")],
  ["el tab no muestra el issue", (c) => c.replace("<b>{iss.titulo}.</b> {iss.texto}", "")],
  ["la cabecera del detalle calla", (c) => c.replace("no cursa · {issTab.n}", "")],
  ["VER-01 calla", (c) => c.replace("marcada(s) no verificada(s): el ejecutivo tiene que retirarlas, re-simular y volver a publicar", "")],
  ["el aviso lo firma el ejecutivo", (c) => c.replace("hiloEnviar(h, CODE_SISTEMA, texto, null); return h;} // Excepciones de la operación PENDIENTES", 'hiloEnviar(h, "CR", texto, null); return h;} // Excepciones de la operación PENDIENTES')],
  ["la mesa vuelve a prometer retirar", (c) => c.replace('"Marcar no verificada"}', '"Retirar y vetar"}')],
  ["la marcada se lista dos veces en la mesa", (c) => c.replace(".filter(([id]) => !enOfertaIds.has(id))", "")],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no cambió el fuente: el ancla ya no existe");
    assert.ok(auditarRegla67(mut).length > 0, "el gate no cazó la violación plantada");
  });
