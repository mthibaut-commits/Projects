/* Gate de contrato de la regla 41 (los tres controles que firma Operaciones se vuelven a mirar al
   aprobar la integración al core), sobre el TEXTO del fuente. El caso 144 de la suite prueba que
   `controlesIntegracion` DECIDE bien; lo que ningún test de motor puede ver es el CABLEADO: que la
   pantalla use la compuerta y no un booleano suelto, que el handler la vuelva a llamar antes de
   escribir —el botón deshabilitado no es el control— y que la auditoría del intento bloqueado nombre
   los códigos. Ese cableado fue exactamente lo que faltaba antes de esta regla: la función que
   decidía la etapa existía y el botón miraba otra cosa.

   Con sonda negativa por pieza: cada mutante deshace una y el auditor tiene que cazarla. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla41(src) {
  const fallos = [];
  // Prettier parte las llamadas largas y agrega coma final (ADR-0006): se mide sobre el canónico, que
  // fija el COMPORTAMIENTO y no el formato.
  const can = canonico(src);
  const cuerpo = (src.match(/^function controlesIntegracion\(deal, estado\) \{[\s\S]*?\n\}/m) || [""])[0];
  const ccan = canonico(cuerpo);

  // 1 · La compuerta existe, es de nivel módulo y devuelve faltas con código.
  if (!/^function controlesIntegracion\(deal, estado\) \{/m.test(src))
    fallos.push("no existe `controlesIntegracion(deal, estado)` de nivel módulo: la decisión de si se puede integrar tiene que vivir en UN solo sitio, extraíble a un resolver");
  for (const cod of ["OTG-02", "VER-01", "LIN-01", "GIR-02"]) {
    const re = new RegExp(`codigo: "${cod}"[\\s\\S]{0,400}?detalle:`);
    if (!re.test(can)) fallos.push(`la compuerta no reporta el control ${cod} con su \`detalle\`: un botón apagado sin causa manda a adivinar por qué no sale la plata`);
  }

  // 2 · Los tres controles se miden de verdad, cada uno con su fuente.
  if (!/const vis = visadoDeal\(deal, estado\);[\s\S]{0,200}?excPend\.length \+ vis\.rechReev\.length/.test(ccan))
    fallos.push("OTG-02 no sale del visado vigente (`visadoDeal(deal, estado)` → `excPend` + `rechReev`): un visado revertido después de la firma tiene que volver a bloquear");
  if (!/verifResumenDeal\(deal, estado\)\.pend/.test(ccan))
    fallos.push("VER-01 no sale de `verifResumenDeal(deal, estado).pend`: una factura retirada por no confirmada tiene que volver a bloquear");
  if (!/estado !== "CON_LINEA"/.test(ccan) || !/lineaAsignadaDe\(deal, estado\)/.test(ccan))
    fallos.push("LIN-01 no se mide FACTURA POR FACTURA sobre la asignación (`lineaAsignadaDe` + `estado !== \"CON_LINEA\"`): un paquete puede caber en la línea del cliente y traer igual una factura sin cupo");
  // Sin asignación se falla CERRADO: lo que está en juego es plata que sale.
  if (!/} else if \(!facturasLin\.length\) \{/.test(ccan))
    fallos.push("sin asignación de línea la compuerta no falla cerrado: no poder afirmar que cada factura tiene cupo no es lo mismo que afirmar que lo tiene");

  // 3 · La compuerta es PURA: lo que decide entra por `estado`.
  for (const global of ["VISADO_STATE", "VERIF_TEL", "CONTRATO_EVIDENCIA"]) {
    if (new RegExp(`\\b${global}\\b`).test(cuerpo))
      fallos.push(`\`controlesIntegracion\` lee \`${global}\` por su cuenta: lo que decide tiene que entrar por \`estado\` para poder levantarla tal cual a un resolver`);
  }

  // 4 · EL CABLEADO. El botón se apaga con la compuerta, no con un booleano suelto.
  if (!/const ctrl = controlesIntegracion\(deal\);/.test(can))
    fallos.push("la pantalla de «Pendiente Integración» no calcula `controlesIntegracion`: estaría decidiendo con otra cosa que la que manda");
  if (!/disabled=\{!ctrl\.ok\}/.test(can))
    fallos.push("el botón «Aprobar integración al core» no se deshabilita con `!ctrl.ok`");
  if (!/ctrl\.faltas\.map\(\(x\) => \(<li key=\{x\.codigo\}/.test(can))
    fallos.push("la pantalla no lista las faltas una por una: el encargado de Operaciones tiene que ver QUÉ falta, no un botón apagado");

  // 5 · Y el handler la vuelve a llamar ANTES de escribir.
  const handler = (src.match(/const aprobarIntegracion = \(id\) => \{[\s\S]*?\n  \};/) || [""])[0];
  const hcan = canonico(handler);
  if (!/const ctrl = controlesIntegracion\(d0\);/.test(hcan))
    fallos.push("`aprobarIntegracion` no vuelve a llamar a la compuerta antes de escribir: la pantalla puede venir de hace un rato y el botón deshabilitado no es el control");
  if (!/if \(!ctrl\.ok\) \{[\s\S]{0,900}?return;/.test(hcan))
    fallos.push("`aprobarIntegracion` calcula la compuerta y no corta: calcularla y seguir es peor que no calcularla");
  if (!/Integración bloqueada \(\$\{codigos\}\)/.test(hcan))
    fallos.push("la auditoría del intento bloqueado no nombra los códigos: en seis meses «no se pudo integrar» no explica nada");
  if (!/severidad: "alta"/.test(hcan))
    fallos.push("el intento bloqueado no se audita con severidad alta");
  // La atribución sigue yendo PRIMERO: quien no puede firmar no llega a ver las faltas.
  const iAtrib = hcan.indexOf(canonico(`puedeAprobarExc(usuario, { area: "operaciones" }, 3)`));
  const iCtrl = hcan.indexOf("const ctrl = controlesIntegracion(d0);");
  if (iAtrib < 0) fallos.push("`aprobarIntegracion` ya no comprueba la atribución de Operaciones N3 (OTG-01)");
  else if (iCtrl >= 0 && iAtrib > iCtrl) fallos.push("la atribución se comprueba DESPUÉS de los controles: quien no puede firmar no tiene por qué recibir el detalle de lo que falta");

  return fallos;
}

test("41 · la integración al core exige sus controles, y el cableado los aplica", () => {
  assert.deepEqual(auditarRegla41(jsx), []);
});

/* Mueve el bloque de atribución para DESPUÉS de los controles, sin tocar su texto: es la forma en que
   esto se rompe de verdad —alguien reordena el handler— y no un borrado, que el auditor ya caza aparte. */
function moverAtribucionAlFinal(src) {
  const ini = src.indexOf('    if (!puedeAprobarExc(usuario, { area: "operaciones" }, 3)) {');
  if (ini < 0) return src;
  const fin = src.indexOf("\n      return;\n    }\n", ini) + "\n      return;\n    }\n".length;
  const bloque = src.slice(ini, fin);
  const sinBloque = src.slice(0, ini) + src.slice(fin);
  const ancla = "    const ctrl = controlesIntegracion(d0);\n";
  return sinBloque.replace(ancla, ancla + bloque);
}

const MUTANTES = {
  "el botón vuelve a mirar sólo la huella": { src: jsx.replace("disabled={!ctrl.ok}", "disabled={!ctrl.evidencia.ok}"), re: /no se deshabilita con `!ctrl\.ok`/ },
  "la pantalla deja de listar lo que falta": { src: jsx.replace("{ctrl.faltas.map((x) => (", "{[].map((x) => ("), re: /no lista las faltas una por una/ },
  "el handler confía en el botón": { src: jsx.replace("    const ctrl = controlesIntegracion(d0);\n", "    const ctrl = { ok: true, faltas: [], evidencia: evidenciaContratoOk(d0) };\n"), re: /no vuelve a llamar a la compuerta/ },
  "OTG-02 deja de mirar el visado vigente": { src: jsx.replace("  const pendVisado = vis.excPend.length + vis.rechReev.length;", "  const pendVisado = 0;"), re: /OTG-02 no sale del visado vigente/ },
  "VER-01 se da por hecho": { src: jsx.replace("  const pendVerif = verifResumenDeal(deal, estado).pend;", "  const pendVerif = 0;"), re: /VER-01 no sale de/ },
  "LIN-01 vuelve a mirar el total": { src: jsx.replace('const sinLinea = facturasLin.filter((x) => x && x.estado !== "CON_LINEA");', "const sinLinea = [];"), re: /LIN-01 no se mide FACTURA POR FACTURA/ },
  "sin asignación se deja pasar": { src: jsx.replace("  } else if (!facturasLin.length) {", "  } else if (false) {"), re: /no falla cerrado/ },
  "la compuerta se lee el visado global": { src: jsx.replace("  const vis = visadoDeal(deal, estado);\n  const pendVisado", "  const vis = visadoDealCalc(deal, VISADO_STATE[deal.id] || {});\n  const pendVisado"), re: /lee `VISADO_STATE` por su cuenta/ },
  "la auditoría pierde los códigos": { src: jsx.replace("accion: `Integración bloqueada (${codigos})`,", 'accion: "Integración bloqueada",'), re: /no nombra los códigos/ },
  "la atribución desaparece": { src: jsx.replace('    if (!puedeAprobarExc(usuario, { area: "operaciones" }, 3)) {', "    if (false) {"), re: /ya no comprueba la atribución/ },
  "la atribución se mira al final": { src: moverAtribucionAlFinal(jsx), re: /se comprueba DESPUÉS de los controles/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`41 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla41(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
