/* Gate de contrato de la regla 64 (la factura cedida a un factoring AJENO no es candidata del inbound; la cedida a
   Security sí, y entra), sobre el TEXTO del fuente. La mitad de la regla tiene función pura y la prueba el caso 159
   (`cedidaAFactoringAjeno`, `CRITERIO_PRED`, `estadoCandidata`); la otra mitad vive en un closure del detalle
   —`motivoExcl`, lo que deja una factura de la oferta fuera del negocio— y la suite no monta componentes, así que
   se vigila acá.

   Por qué las TRES piezas juntas: el 23-09-2026 se implementaron las dos primeras, la suite pasó 159/159 y diez
   casos e2e cayeron a la vez. La primera factura agregable del pool del Directorio es una cedida a Security: la
   lista de candidatas la dejaba agregar (pieza 2) y la oferta la seguía excluyendo como «Ya financiada por
   Security» (pieza 3), así que entraba y no contaba —«Tienes 1 factura elegida» no aparecía, «esta operación» no
   cuadraba con «Total oferta»—. Una regla que dice «la cedida a Security entra» se fija en TODOS los sitios que
   deciden si una factura cuenta, o la pantalla se contradice sola.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla64(src) {
  const fallos = [];
  const can = canonico(src);

  // 1 · LA CUARTA CONDICIÓN. El predicado existe, mira `nuestra`, y «Buena factura» lo exige.
  // (el cuerpo lleva un `{}` como respaldo del evento, así que no se corta en el primer `};`: se mira una ventana)
  const iPred = can.indexOf("const cedidaAFactoringAjeno = (f) => {");
  const pred = iPred < 0 ? "" : can.slice(iPred, iPred + 400);
  if (!pred) fallos.push("no existe `cedidaAFactoringAjeno`: la cesión ajena vuelve a detectarse recién al incorporar");
  else if (!pred.includes("return !!(ces && !ces.nuestra);"))
    fallos.push("`cedidaAFactoringAjeno` no distingue la cesión NUESTRA: excluiría la cedida a Security, que es cartera propia");
  const buena = (can.match(/"Buena factura": \(f\) => (.*?), "Deudor elegible"/) || [])[1] || "";
  if (!buena) fallos.push("no encuentro el criterio «Buena factura» en `CRITERIO_PRED`");
  else if (!buena.includes("!cedidaAFactoringAjeno(f)"))
    fallos.push("«Buena factura» no exige `!cedidaAFactoringAjeno(f)`: la cedida a otro factoring entra al monto con que se dimensiona la oportunidad");

  // 2 · LA CANDIDATA CEDIDA A SECURITY ES AGREGABLE, y va rotulada.
  if (!/if \(ces && ces\.nuestra\) return \{clave: ces\.parcial \? "cedidaNuestraParcial" : "cedidaNuestra", bloqueada: false, agregable: true,/.test(can))
    fallos.push("`estadoCandidata` no devuelve la cedida a Security agregable y sin bloqueo (el caso 95 fijaba lo contrario hasta el 23-09-2026)");
  if (!can.includes('"Cedida a otro factoring (excluida)"'))
    fallos.push("el perfil de la Bandeja no nombra «Cedida a otro factoring (excluida)»: sin motivo, la factura no capturada parece «sin regla»");

  // 3 · LA OFERTA LA CUENTA. `motivoExcl` excluye sólo la cesión ajena; «Ya financiada» dejó de ser motivo.
  const excl = (can.match(/const motivoExcl = \(f\) => \{(.*?)\};/) || [])[1] || "";
  if (!excl) fallos.push("no encuentro `motivoExcl` en el detalle de la oferta");
  else {
    if (!excl.includes("if (c && !c.nuestra) return"))
      fallos.push("`motivoExcl` no excluye la cesión a un factoring ajeno por su folio");
    if (/if \(c\) return/.test(excl) || /financiada/i.test(excl))
      fallos.push("`motivoExcl` vuelve a excluir la cedida a Security («Ya financiada»): la factura que la lista deja agregar entra a la oferta y no cuenta");
  }
  return fallos;
}

test("regla 64: la cedida a un factoring ajeno no es candidata; la cedida a Security es agregable y la oferta la cuenta", () => {
  assert.deepEqual(auditarRegla64(jsx), []);
});

/* Cada mutante planta UNA violación sobre el texto canónico (`canonico` es idempotente) y el gate tiene que cazarla. */
const MUTANTES = [
  ["«Buena factura» sin la cuarta condición", (c) => c.replace("!cedidaAFactoringAjeno(f) && ", "")],
  ["la cedida a Security vuelve a bloquearse al incorporar", (c) => c.replace('"cedidaNuestra", bloqueada: false, agregable: true,', '"cedidaNuestra", bloqueada: true, agregable: false,')],
  ["el predicado deja de mirar `nuestra`", (c) => c.replace("return !!(ces && !ces.nuestra);", "return !!ces;")],
  ["el perfil ya no nombra el motivo", (c) => c.replace('"Cedida a otro factoring (excluida)"', '"Otro deudor (excluido)"')],
  ["la oferta vuelve a excluir la cedida a Security", (c) => c.replace("const motivoExcl = (f) => {const c = cesionDeFactura(deal.rutEmisor, f && f.folio);", 'const motivoExcl = (f) => {const c = cesionDeFactura(deal.rutEmisor, f && f.folio); if (c) return "Ya financiada por Security";')],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no plantó nada: el texto quedó igual");
    assert.ok(auditarRegla64(mut).length > 0, "el gate no cazó la violación plantada");
  });
