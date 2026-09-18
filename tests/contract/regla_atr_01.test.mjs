/* Gate de contrato de ATR-01 (el descuento no excede la atribución del rol sin la jefatura) sobre el TEXTO
   del fuente. El caso 137 prueba el VALIDADOR del contrato y el 143 el PREDICADO de autorización; ninguno de
   los dos puede ver lo que este gate fija, porque vive en un closure de un componente: que alguien PREGUNTE
   antes de escribir.
   Hasta el 18-09-2026 `autorizarJefe` marcaba `deal.condAutJefe = true` sin volver a comprobar nada. El único
   control era `puedeAutorizar`, que decide si se DIBUJA el botón, y que además se alimentaba del prop `esJefe`
   —«esta pantalla cree que eres jefe», que no es tener hoy la atribución—. Es la regla 24 al pie de la letra:
   la pantalla que apaga el botón no es el control. Acá se fija:
   (1) `puedeAutorizarCondiciones(code, estado)` es de NIVEL MÓDULO y PURO: decide con sus dos argumentos y el
       padrón, sin leer `deal`, `VISADO_STATE` ni props.
   (2) `autorizarJefe` lo consulta ANTES de escribir —índice de la guarda < índice de `setAutorizSig` y de
       `condAutJefe`—, y la guarda CORTA (`return`), no sólo audita.
   (3) El rechazo queda AUDITADO y nombra el invariante: una autorización que no ocurre y no deja rastro es
       peor que una que se bloquea, porque nadie se entera (regla 24).
   (4) El render usa el MISMO predicado y ya no el prop `esJefe`: con dos fuentes, la que gatea el botón y la
       que autoriza pueden discrepar, que es exactamente el defecto.
   Los patrones se aplican sobre `canonico(src)` (ADR-0005) y las sondas se plantan sobre el texto canónico. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const PREDICADO = "puedeAutorizarCondiciones";
const entre = (src, desde, hasta) => {
  const i = src.indexOf(desde);
  if (i < 0) return null;
  const j = src.indexOf(hasta, i);
  return j < 0 ? null : src.slice(i, j);
};

/* El closure `autorizarJefe` sobre el texto canónico. */
export const closureAutorizar = (src) => entre(canonico(src), "const autorizarJefe = ", "const _desc =");

export function auditarAtr01(src0) {
  const src = canonico(src0);
  const fallos = [];
  // (1) el predicado, de nivel módulo y puro
  const decl = new RegExp(`const ${PREDICADO} = \\(code, estado\\) =>`);
  if (!decl.test(src))
    fallos.push(`no existe \`const ${PREDICADO} = (code, estado) =>\` de nivel módulo: sin él, la suite no puede probar la escalera por su nombre (caso 142)`);
  const cuerpo = entre(src, `const ${PREDICADO} = (code, estado) =>`, ";");
  if (cuerpo) {
    for (const glob of ["deal", "VISADO_STATE", "esJefe", "usuarioCod"])
      if (new RegExp(`\\b${glob}\\b`).test(cuerpo))
        fallos.push(`\`${PREDICADO}\` lee \`${glob}\`: juzga al CÓDIGO contra el padrón, no el estado de una pantalla`);
    if (!/esGerenteComercial\(code\)/.test(cuerpo) || !/esJefeComercial\(code\)/.test(cuerpo))
      fallos.push(`\`${PREDICADO}\` ya no deriva la atribución del padrón (\`esJefeComercial\`/\`esGerenteComercial\`)`);
    if (!/: false/.test(cuerpo)) fallos.push(`\`${PREDICADO}\` no falla CERRADO: un estado que no pide autorización («ok», «bajoMinimo») no lo autoriza nadie`);
  }
  // (2)(3) la guarda, ANTES de escribir, que corta y que audita
  const az = closureAutorizar(src);
  if (!az) {
    fallos.push("no encuentro el closure `autorizarJefe`");
    return fallos;
  }
  const iGuarda = az.indexOf(`if (!${PREDICADO}(usuarioCod, atrib.estado))`);
  const iFirma = az.indexOf("setAutorizSig(condSig)");
  const iEscribe = az.indexOf("condAutJefe = true");
  if (iGuarda < 0)
    fallos.push(
      `\`autorizarJefe\` no vuelve a preguntar \`${PREDICADO}(usuarioCod, atrib.estado)\`: el único control sería el botón, y la pantalla que apaga el botón no es el control (regla 24)`,
    );
  if (iEscribe < 0) fallos.push("`autorizarJefe` ya no escribe `condAutJefe = true`: si la marca se movió, este gate dejó de vigilar dónde se escribe");
  if (iGuarda >= 0 && iFirma >= 0 && iGuarda > iFirma)
    fallos.push("la guarda está DESPUÉS de `setAutorizSig`: las condiciones ya quedaron firmadas cuando se pregunta");
  if (iGuarda >= 0 && iEscribe >= 0 && iGuarda > iEscribe) fallos.push("la guarda está DESPUÉS de escribir `condAutJefe`: autoriza y después pregunta");
  if (iGuarda >= 0) {
    const tramo = az.slice(iGuarda, iFirma > iGuarda ? iFirma : iGuarda + 900);
    if (!/\breturn;/.test(tramo)) fallos.push("la guarda de `autorizarJefe` no CORTA (`return;`): detectar y seguir escribiendo no es un control");
    if (!/registrarAuditoria\(/.test(tramo))
      fallos.push("el rechazo de `autorizarJefe` no se audita: una autorización que no ocurre y no deja rastro no la ve nadie (regla 24)");
    if (!/ATR-01/.test(tramo)) fallos.push("el registro del rechazo no nombra ATR-01: el código es lo que cruza la auditoría con el contrato");
  }
  // (4) el render y el handler comparten predicado, y el prop se fue
  if (!new RegExp(`const puedeAutorizar = ${PREDICADO}\\(usuarioCod, atrib\\.estado\\)`).test(src))
    fallos.push(`el botón ya no se gatea con \`${PREDICADO}\`: con dos fuentes, la que dibuja y la que autoriza pueden discrepar`);
  if (/const puedeAutorizar = requiereGerente \? esGerente : esJefe/.test(src))
    fallos.push("`puedeAutorizar` volvió al prop `esJefe`: un prop dice «esta pantalla cree que eres jefe», no «tienes hoy la atribución»");
  return fallos;
}

test("ATR-01 · el predicado es de nivel módulo y puro, `autorizarJefe` lo pregunta ANTES de escribir y corta, el rechazo se audita, y el botón se gatea con el mismo predicado", () => {
  assert.deepEqual(auditarAtr01(jsx), []);
});

test("ATR-01 · SONDAS: cada violación plantada en una copia del fuente hace fallar al auditor", () => {
  const can = canonico(jsx);
  const GUARDA = `if (!${PREDICADO}(usuarioCod, atrib.estado)) {`;
  const sondas = [
    ["sin la guarda en el handler", can.replace(GUARDA, "if (false) {"), /no vuelve a preguntar/],
    [
      "la guarda no corta: audita y sigue",
      can.replace(/(if \(!puedeAutorizarCondiciones\(usuarioCod, atrib\.estado\)\) \{[\s\S]{0,700}?)return;/, "$1"),
      /no CORTA/,
    ],
    [
      "el rechazo deja de auditarse",
      can.replace(/(if \(!puedeAutorizarCondiciones\(usuarioCod, atrib\.estado\)\) \{)registrarAuditoria\(/, "$1noop("),
      /no se audita|no nombra ATR-01/,
    ],
    [
      "el botón vuelve al prop `esJefe`",
      can.replace(`const puedeAutorizar = ${PREDICADO}(usuarioCod, atrib.estado)`, "const puedeAutorizar = requiereGerente ? esGerente : esJefe"),
      /volvió al prop `esJefe`|ya no se gatea/,
    ],
    [
      "el predicado mira el estado de la pantalla",
      can.replace(`const ${PREDICADO} = (code, estado) =>`, `const ${PREDICADO} = (code, estado) => deal &&`),
      /lee `deal`/,
    ],
    ["el predicado deja de fallar cerrado", can.replace("? esJefeComercial(code) : false;", "? esJefeComercial(code) : true;"), /no falla CERRADO/],
  ];
  const mudas = sondas.filter(([, src]) => src === can).map(([n]) => n);
  assert.deepEqual(mudas, [], "sondas cuyo ancla ya no existe en el fuente: no probarían nada");
  const nocazadas = sondas.filter(([, src, re]) => !auditarAtr01(src).some((f) => re.test(f))).map(([n]) => n);
  assert.deepEqual(nocazadas, [], "sondas que el auditor no cazó");
  assert.equal(sondas.length, 6, "conteo de sondas (se cita en el reporte)");
});
