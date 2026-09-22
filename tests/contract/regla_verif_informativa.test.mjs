/* Gate de contrato de la regla 53 (el tab de Verificación: informativo al simular, el deudor decide y
   la factura se llama), sobre el TEXTO del fuente. `VerificacionTab` es un componente de React y la
   suite no monta componentes —lo dice `.claude/rules/testing.md`—, así que lo que esta regla fija se
   vigila acá y en el caso `e2e-53`, que abre la pantalla.

   Las tres mitades que se fijan, y por qué ninguna se prueba sola:

   1 · LA COMPUERTA PROTEGE LA LLAMADA, NO LA INFORMACIÓN. Un gate que sólo comprobara que el tab
       aparece al simular pasaría con el defecto peor puesto: que al simular se pueda REGISTRAR la
       llamada. Por eso se fija a la vez que `mostrarVerif` incluya `deal.simulado` y que las dos
       acciones —registrar la verificación y retirar la factura— exijan `puedeAccionar`, que niega
       `informativo`. Las dos juntas, o no se fija nada.
   2 · LA PANTALLA NO NOMBRA «LISTA BLANCA». El chip del deudor dice **Prime** y la nota va rotulada
       «Nota Deudor». `DEUDOR_LABEL`/`DEUDOR_CHIP` se retiraron: vivían sólo acá, así que dejarlos
       habría sido dejar código muerto con el nombre retirado adentro.
   3 · LOS CRITERIOS SON DEL DEUDOR Y EL QUIZ ES DE LA FACTURA. `verifDecision` calcula V00–V10 UNA
       vez sobre el conjunto del deudor: repetirlos en cada fila era mostrar el mismo dato N veces y
       sugerir que la factura tenía criterios propios. El gate exige que `evals` se pinte desde el
       grupo (`g.v0`) y que la fila de factura abra SÓLO cuando hay llamada que mirar.

   Con sonda negativa para cada pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El cuerpo de una función/arrow, contando llaves desde la ÚLTIMA de su declaración —no la primera,
   que en `function X({ a, b }) {` es la del destructuring y se cierra en el mismo renglón—. */
export function cuerpoDe(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const inicio = i + decl.length - 1;
  let prof = 0,
    visto = false;
  for (let j = inicio; j < src.length; j++) {
    const c = src[j];
    if (c === "{") {
      prof++;
      visto = true;
    } else if (c === "}") {
      prof--;
      if (visto && prof === 0) return src.slice(i, j + 1);
    }
  }
  return null;
}

export function auditarRegla53(src) {
  const fallos = [];
  const can = canonico(src);

  // 1 · EL TAB APARECE AL SIMULAR, y lo accionable se calcula APARTE para poder negarlo.
  if (!/const verifAccionable = /.test(src))
    fallos.push("no existe `verifAccionable`: sin separar «se ve» de «se puede accionar» el tab vuelve a ser todo o nada");
  if (!/const mostrarVerif = !!\(deal && \(deal\.facturasOp \|\| \[\]\)\.length && \(verifAccionable \|\| deal\.simulado\)\);/.test(can))
    fallos.push("`mostrarVerif` no incluye `deal.simulado`: con la oferta simulada el ejecutivo no ve qué va a haber que verificar, que es lo que necesita ANTES de comprometer un plazo");
  if (!/\(deal\.facturasOp \|\| \[\]\)\.length/.test(can))
    fallos.push("`mostrarVerif` dejó de exigir facturas en la oferta: sin facturas no hay nada que verificar");
  // …y lo accionable sigue siendo lo que era: pre-evaluación, oferta publicada o etapa avanzada.
  const va = (can.match(/const verifAccionable = [^;]+;/) || [])[0] || "";
  for (const t of ["tienePreEval(deal.id)", "ofertaPublicada(deal)"])
    if (!va.includes(t)) fallos.push(`\`verifAccionable\` ya no mira \`${t}\`: la compuerta de la llamada se abriría en otro momento`);

  // 2 · EL TAB RECIBE `informativo` COMO LA NEGACIÓN DE LO ACCIONABLE. Pasar `deal.simulado` en su
  //     lugar diría lo mismo hoy y mentiría en cuanto se agregue un tercer camino accionable.
  if (!/<VerificacionTab deal=\{deal\} facturasOp=\{deal\.facturasOp \|\| \[\]\} informativo=\{!verifAccionable\}/.test(can))
    fallos.push("`VerificacionTab` no recibe `informativo={!verifAccionable}`: sin ese dato el tab no puede saber si está mirando o trabajando");

  const vt = cuerpoDe(src, "function VerificacionTab({ deal, facturasOp = [], bloqueado, informativo, onNoConfirmada, usuario, tasaDe }) {");
  if (!vt) {
    fallos.push("`VerificacionTab` no declara `informativo` en su firma");
    return fallos;
  }
  const cvt = canonico(vt);

  // 3 · LA COMPUERTA PROTEGE LA LLAMADA. `puedeAccionar` niega `informativo`, y las DOS acciones lo
  //     exigen: registrar la verificación y retirar la factura no confirmada.
  if (!/const puedeAccionar = puedeMarcar && !informativo;/.test(cvt))
    fallos.push("no existe `puedeAccionar = puedeMarcar && !informativo`: con la oferta simulada se podría registrar una llamada por facturas que quizá se retiren (regla 6: 3–4 horas por deudor)");
  if (!/!bloqueado && puedeAccionar && tel\.estado !== "Completada"/.test(cvt))
    fallos.push("el botón «Registrar verificación» no exige `puedeAccionar`: el modo informativo dejaría firmar la llamada");
  if (!/!bloqueado && puedeAccionar && onNoConfirmada && tel\.estado !== "Completada"/.test(cvt))
    fallos.push("el botón «El deudor no confirmó · retirar» no exige `puedeAccionar`: el modo informativo dejaría retirar facturas de una oferta que todavía se está armando");
  // …y el modo informativo lo DICE. Un tab de sólo lectura sin cartel se lee como un tab roto.
  if (!/\{soloInforma && \(/.test(cvt) || !/const soloInforma = !!informativo && !bloqueado;/.test(cvt))
    fallos.push("el modo informativo no se anuncia en pantalla (`soloInforma`): sin cartel, un tab que no deja accionar se lee como un defecto");

  // 4 · LA PANTALLA NO NOMBRA «LISTA BLANCA»: chip **Prime** y nota rotulada **Nota Deudor**.
  for (const m of ["DEUDOR_LABEL", "DEUDOR_CHIP"])
    if (new RegExp(`\\b${m}\\b`).test(src)) fallos.push(`\`${m}\` sigue en el fuente: el chip del deudor volvió a nombrar la lista interna en vez del segmento Prime`);
  if (!/g\.prime && \(/.test(cvt)) fallos.push("la cabecera del deudor no pinta el chip **Prime** desde `g.prime`");
  if (!/Nota Deudor/.test(vt)) fallos.push("la nota del deudor no va rotulada «Nota Deudor»: un número suelto al lado del nombre no dice de qué es");
  if (!/prime: par\.prime,/.test(src)) fallos.push("`verifFactura` no propaga `prime`: la UI tendría que volver a comparar contra «Lista Blanca» para saber si el deudor es Prime");
  if ((src.match(/prime: par\.prime,/g) || []).length < 2)
    fallos.push("`verifFactura` propaga `prime` en una sola de sus dos salidas: con el veredicto congelado el chip desaparecería");
  // …y el color de la nota es UNO. La copia local `notaCol` decía lo mismo que `NOTA_COLOR` y dos
  //    copias del mismo indicador se separan a la primera corrección.
  if (/const notaCol = /.test(src)) fallos.push("vuelve la copia local `notaCol`: el color de la Nota Deudor lo fija `NOTA_COLOR` y una sola vez");
  if (!/NOTA_COLOR\(g\.nota\)/.test(cvt)) fallos.push("la cabecera del deudor no colorea la nota con `NOTA_COLOR`");

  // 5 · LOS CRITERIOS SON DEL DEUDOR. `v0` es el veredicto del grupo y es de donde se pintan.
  if (!/v0: x\.v,/.test(cvt)) fallos.push("el grupo no guarda `v0`: sin el veredicto del deudor los criterios volverían a leerse de cada fila");
  if (!/g\.v0\.evals\.map\(/.test(cvt)) fallos.push("los criterios V00–V10 no se pintan desde `g.v0`: repetirlos por factura muestra N veces el mismo dato y sugiere que la factura tiene criterios propios");
  if ((src.match(/evals\.map\(/g) || []).length !== 1)
    fallos.push("`evals.map(` aparece más de una vez: los criterios del deudor se pintan en UN solo sitio, el panel del grupo");
  if (!/\{abiertoDeudor\[g\.deudor\] && \(/.test(cvt)) fallos.push("el panel de criterios del deudor no se abre desde la cabecera del grupo (`abiertoDeudor`)");

  // 6 · EL QUIZ ES DE LA FACTURA, y la fila abre SÓLO si hay llamada que mirar. Sin esta guarda una
  //     factura verificada por el modelo ofrecería un panel vacío, que es peor que no ofrecer nada.
  if (!/\{isOpen && tel && \(/.test(cvt)) fallos.push("la fila de factura abre sin comprobar que haya llamada (`tel`): una factura verificada por el modelo abriría un panel vacío");
  if (!/\{tel \? \(/.test(cvt) && !/tel && </.test(cvt))
    fallos.push("la fila de factura dibuja el chevron aunque no haya nada que abrir");
  if (/Reglas de verificación · cliente-deudor \(3M\)/.test(vt) && !/Criterios del deudor/.test(vt))
    fallos.push("el panel de criterios conserva el título de la fila de factura: el rótulo tiene que decir que son del DEUDOR");

  return fallos;
}

test("53 · el tab de Verificación: informativo al simular, chip Prime + Nota Deudor, y los criterios del deudor separados del quiz por factura", () => {
  assert.deepEqual(auditarRegla53(jsx), []);
});

const MUTANTES = {
  "el tab deja de aparecer al simular": {
    src: jsx.replace("(verifAccionable || deal.simulado)", "verifAccionable"),
    re: /no incluye `deal\.simulado`/,
  },
  "el tab aparece sin facturas en la oferta": {
    src: jsx.replace(
      "const mostrarVerif = !!(deal && (deal.facturasOp || []).length && (verifAccionable || deal.simulado));",
      "const mostrarVerif = !!(deal && (verifAccionable || deal.simulado));",
    ),
    re: /dejó de exigir facturas|no incluye `deal\.simulado`/,
  },
  "lo accionable deja de mirar la pre-evaluación": {
    src: jsx.replace("tienePreEval(deal.id) ||", ""),
    re: /ya no mira `tienePreEval/,
  },
  "el tab recibe `deal.simulado` en vez de la negación de lo accionable": {
    src: jsx.replace("informativo={!verifAccionable}", "informativo={deal.simulado}"),
    re: /no recibe `informativo=\{!verifAccionable\}`/,
  },
  "el modo informativo deja registrar la llamada": {
    src: jsx.replace("const puedeAccionar = puedeMarcar && !informativo;", "const puedeAccionar = puedeMarcar;"),
    re: /no existe `puedeAccionar/,
  },
  "el botón de registrar vuelve a `puedeMarcar`": {
    src: jsx.replace("{!bloqueado && puedeAccionar && tel.estado !== \"Completada\" && (", "{!bloqueado && puedeMarcar && tel.estado !== \"Completada\" && ("),
    re: /«Registrar verificación» no exige `puedeAccionar`/,
  },
  "el botón de retirar vuelve a `puedeMarcar`": {
    src: jsx.replace("{!bloqueado && puedeAccionar && onNoConfirmada && tel.estado !== \"Completada\" && (", "{!bloqueado && puedeMarcar && onNoConfirmada && tel.estado !== \"Completada\" && ("),
    re: /«El deudor no confirmó · retirar» no exige `puedeAccionar`/,
  },
  "el modo informativo deja de anunciarse": {
    src: jsx.replace("const soloInforma = !!informativo && !bloqueado;", "const soloInforma = false;"),
    re: /no se anuncia en pantalla/,
  },
  "vuelve el chip de la lista interna": {
    src: jsx.replace("const VERIF_RULES = [", 'const DEUDOR_LABEL = { "Lista Blanca": "Lista Blanca" };\nconst VERIF_RULES = ['),
    re: /`DEUDOR_LABEL` sigue en el fuente/,
  },
  "`verifFactura` deja de propagar `prime`": {
    src: jsx.replace(/ {6}prime: par\.prime,\n/, ""),
    re: /propaga `prime` en una sola/,
  },
  "vuelve la copia local del color de la nota": {
    src: jsx.replace("  const CHECKS = [", '  const notaCol = (n) => (n >= 4 ? "#0a7d3f" : "#EF4444");\n  const CHECKS = ['),
    re: /vuelve la copia local `notaCol`/,
  },
  "los criterios vuelven a pintarse por factura": {
    src: jsx.replace("g.v0.evals.map((e) => {", "x.v.evals.map((e) => {"),
    re: /no se pintan desde `g\.v0`/,
  },
  "el grupo deja de guardar el veredicto del deudor": {
    src: jsx.replace("v0: x.v,", "v0x: x.v,"),
    re: /no guarda `v0`/,
  },
  "la fila de factura abre sin llamada que mirar": {
    src: jsx.replace("{isOpen && tel && (", "{isOpen && ("),
    re: /abre sin comprobar que haya llamada/,
  },
  "el panel del deudor deja de abrirse desde su cabecera": {
    src: jsx.replace("{abiertoDeudor[g.deudor] && (", "{false && ("),
    re: /no se abre desde la cabecera del grupo/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`53 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla53(m.src);
    assert.ok(
      fallos.some((f) => m.re.test(f)),
      `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`,
    );
  });
}
