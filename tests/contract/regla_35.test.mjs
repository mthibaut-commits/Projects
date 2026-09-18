/* Gate de contrato de la regla 35 (una regla mal definida no se ejecuta ni se verifica, y la salida lo
   dice), sobre el TEXTO del fuente. La suite prueba el MOTOR con una regla plantada (caso 141); acá se
   fija la forma: que la compuerta sea PURA y de nivel módulo, que `evalReglaCli` la consulte ANTES de
   mirar los tramos —después sería un veredicto ya emitido—, que el veredicto de la operación lleve las
   no ejecutadas sin meterlas en `exc`/`rech` (no bloquean, se ven), y que la pantalla las nombre.
   Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Cuerpo de una función de nivel módulo: de su declaración a la siguiente a columna 0. */
export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^function ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const resto = src.slice(m.index + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(m.index, fin < 0 ? undefined : m.index + m[0].length + fin);
}

export function auditarRegla35(src) {
  const fallos = [];
  // 1 · La compuerta existe, es de NIVEL MÓDULO y es PURA: decide con la regla que recibe y nada más.
  const c = cuerpoDe(src, "reglaNoEjecutable");
  if (!c) { fallos.push("no existe `function reglaNoEjecutable(regla)` de nivel módulo"); return fallos; }
  if (!/if \(regla\.clasif\) return \{ noEjecutable: false \}/.test(c)) fallos.push("la compuerta no exime a las reglas de CLASIFICACIÓN: informan y no deciden, así que no necesitan aprobador");
  if (!/if \(!\(regla\.tiers && regla\.tiers\.length\)\) return \{ noEjecutable: false \}/.test(c)) fallos.push("la compuerta no exime a una regla SIN TRAMOS: si no decide, no hay a quién pedirle nada");
  if (!/if \(!regla\.area\) return \{[\s\S]{0,200}noEjecutable: true/.test(c)) fallos.push("la compuerta no marca como no ejecutable la regla que DECIDE y no declara área");
  if (!/motivo:/.test(c) || !/arregla:/.test(c)) fallos.push("la compuerta no devuelve el MOTIVO y DÓNDE SE ARREGLA: «no ejecutada» sin causa deja al usuario sin qué configurar");
  // Pureza: no lee estado global de la app ni el padrón. `regla` es su único insumo.
  for (const glob of ["VISADO_STATE", "padronAprobadores", "TENANT", "deal"]) {
    if (new RegExp(`\\b${glob}\\b`).test(c)) fallos.push(`reglaNoEjecutable lee \`${glob}\`: la compuerta juzga la DEFINICIÓN de la regla, no el estado del tenant ni de la operación`);
  }
  // 2 · `evalReglaCli` la consulta ANTES de evaluar los tramos.
  const e = cuerpoDe(src, "evalReglaCli");
  if (!e) { fallos.push("no existe `function evalReglaCli`"); return fallos; }
  const iGuarda = e.indexOf("reglaNoEjecutable(rule)"), iTiers = e.indexOf("rule.tiers[i][0](v)");
  if (iGuarda < 0) fallos.push("evalReglaCli no consulta `reglaNoEjecutable(rule)`: la regla mal definida se evaluaría igual");
  else if (iTiers >= 0 && iGuarda > iTiers) fallos.push("evalReglaCli consulta la compuerta DESPUÉS de recorrer los tramos: para entonces el veredicto ya se emitió");
  if (!/return \{ disp: "no_ejecutada", motivo: nd\.motivo, arregla: nd\.arregla/.test(e)) fallos.push("evalReglaCli no devuelve la disposición `no_ejecutada` con su motivo");
  // 3 · El veredicto de la operación las junta, las EXPONE, y NO las mete en exc/rech (no bloquean).
  const v = cuerpoDe(src, "visadoDealCalc");
  if (!v) { fallos.push("no existe `function visadoDealCalc`"); return fallos; }
  if (!/const noEjec = res\.filter\(\(x\) => x\.disp === "no_ejecutada"\)/.test(v)) fallos.push("visadoDealCalc no junta las reglas no ejecutadas");
  if (!/return \{[^\n]*\bnoEjec\b/.test(v)) fallos.push("visadoDealCalc no devuelve `noEjec`: sin salir del motor, la pantalla no puede nombrarlas");
  for (const campo of ["exc", "rech"]) {
    const m = v.match(new RegExp(`const ${campo} = res\\.filter\\(\\(x\\) => x\\.disp === "([a-z_]+)"\\)`));
    if (m && m[1] === "no_ejecutada") fallos.push(`visadoDealCalc mete las no ejecutadas en \`${campo}\`: una regla que nadie evaluó no puede concluir nada`);
  }
  // 4 · La pantalla la nombra: el badge con su rótulo y el recuadro con la frase que la regla exige.
  if (!/no_ejecutada: "No ejecutada · falta configuración"/.test(src)) fallos.push("el vocabulario de disposiciones no rotula `no_ejecutada`");
  if (!/no_ejecutada: "#C2410C"/.test(src)) fallos.push("`no_ejecutada` no va en ámbar: en gris se lee como un estado neutro y es configuración que falta");
  if (!/Esta regla no se ejecutó ni se verificó\./.test(src)) fallos.push("la fila del criterio no dice que la regla no se ejecutó ni se verificó");
  if (!/La operación se evaluó SIN ella/.test(src)) fallos.push("la fila no dice que la operación se evaluó SIN esa regla: es la consecuencia, y es lo que hay que poder leer");
  // El hallazgo NO se muestra en una regla no ejecutada: afirmaría algo que nadie midió.
  if (!/x\.disp !== "aprobado" && x\.disp !== "no_ejecutada" && x\.hallazgo/.test(src)) fallos.push("la fila muestra el `hallazgo` de una regla no ejecutada: afirma un resultado que nadie midió");
  // 5 · El TERCER BALDE del tab. Una regla no ejecutada no requiere aprobación, así que caía en `okRows`
  //     —dentro del acordeón «N regla(s) aprobada(s)», colapsado—: contada como aprobada y escondida.
  //     Lo encontró la sonda de DOM, no el fuente, y por eso se fija acá.
  if (!/const noEjecRows = active\.rows\.filter\(\(x\) => x\.disp === "no_ejecutada"\)/.test(src)) fallos.push("el tab no separa las no ejecutadas en su propio balde");
  if (!/const okRows = active\.rows\.filter\(\(x\) => !reqAprob\(x\) && x\.disp !== "no_ejecutada"\)/.test(src)) fallos.push("las no ejecutadas siguen cayendo en `okRows`: se cuentan como aprobadas y se esconden en el acordeón");
  if (!/reqRows\.length === 0 && noEjecRows\.length === 0 && /.test(src)) fallos.push("el tab dice «Todas las reglas están aprobadas» con una regla sin ejecutar: afirma que se aprobó un criterio que nadie miró");
  if (!/\{noEjecRows\.map\(\(x\) => reglaCard\(x, active\.key \+ "-ne-"\)\)\}/.test(src)) fallos.push("las no ejecutadas no se dibujan: sin fila, la regla desaparece de la salida");
  if (!/const orden = \{ rechazado: 0, excepcion: 1, no_ejecutada: 2, aprobado: 3 \}/.test(src)) fallos.push("el mapa de orden no conoce `no_ejecutada`: `orden[undefined]` da NaN y el comparador queda indefinido para esas filas");
  // 6 · El contador no la disuelve en «ok» ni en «pendiente».
  if (!/const noEjec = items\.filter\(\(it\) => it\.disp === "no_ejecutada"\)\.length/.test(src)) fallos.push("el contador del pie no cuenta aparte las no ejecutadas: sumarlas a `ok` diría que la operación pasó un criterio que nadie miró");
  return fallos;
}

test("35 · la compuerta es pura y de nivel módulo, corre ANTES de los tramos, el veredicto las expone sin bloquear y la pantalla las nombra", () => {
  assert.deepEqual(auditarRegla35(jsx), []);
});

const MUTANTES = {
  "la compuerta se consulta después de los tramos": {
    src: jsx.replace(`  const nd = reglaNoEjecutable(rule);
  if (nd.noEjecutable) return { disp: "no_ejecutada", motivo: nd.motivo, arregla: nd.arregla, tierIdx: null };
`, "").replace(`  return { disp: "aprobado", tierIdx: null };`, `  const nd = reglaNoEjecutable(rule);
  if (nd.noEjecutable) return { disp: "no_ejecutada", motivo: nd.motivo, arregla: nd.arregla, tierIdx: null };
  return { disp: "aprobado", tierIdx: null };`),
    re: /DESPUÉS de recorrer los tramos/,
  },
  "evalReglaCli deja de consultarla": {
    src: jsx.replace(`  const nd = reglaNoEjecutable(rule);
  if (nd.noEjecutable) return { disp: "no_ejecutada", motivo: nd.motivo, arregla: nd.arregla, tierIdx: null };
`, ""),
    re: /no consulta `reglaNoEjecutable\(rule\)`/,
  },
  "la compuerta mira el estado del tenant": { src: jsx.replace('  if (!regla.area) return {', '  if (padronAprobadores().areas.length === 0) return { noEjecutable: false };\n  if (!regla.area) return {'), re: /lee `padronAprobadores`/ },
  "las no ejecutadas se meten en las excepciones": { src: jsx.replace('const exc = res.filter((x) => x.disp === "excepcion")', 'const exc = res.filter((x) => x.disp === "no_ejecutada")'), re: /mete las no ejecutadas en `exc`/ },
  "el veredicto deja de exponerlas": { src: jsx.replace("aprob, clasif, noEjec, excPend", "aprob, clasif, excPend"), re: /no devuelve `noEjec`/ },
  "la fila muestra el hallazgo de una regla que nadie evaluó": { src: jsx.replace('{x.disp !== "aprobado" && x.disp !== "no_ejecutada" && x.hallazgo', '{x.disp !== "aprobado" && x.hallazgo'), re: /muestra el `hallazgo`/ },
  "el badge va en gris como la clasificación": { src: jsx.replace('no_ejecutada: "#C2410C"', 'no_ejecutada: C.faint'), re: /no va en ámbar/ },
  "el contador la suma a las aprobadas": { src: jsx.replace('const noEjec = items.filter((it) => it.disp === "no_ejecutada").length;', ""), re: /no cuenta aparte las no ejecutadas/ },
  "vuelven al balde de las aprobadas": { src: jsx.replace('const okRows = active.rows.filter((x) => !reqAprob(x) && x.disp !== "no_ejecutada");', "const okRows = active.rows.filter((x) => !reqAprob(x));"), re: /siguen cayendo en `okRows`/ },
  "«todas aprobadas» con una sin ejecutar": { src: jsx.replace("{reqRows.length === 0 && noEjecRows.length === 0 && <div", "{reqRows.length === 0 && <div"), re: /«Todas las reglas están aprobadas» con una regla sin ejecutar/ },
  "el orden no conoce la quinta disposición": { src: jsx.replace("const orden = { rechazado: 0, excepcion: 1, no_ejecutada: 2, aprobado: 3 };", "const orden = { rechazado: 0, excepcion: 1, aprobado: 2 };"), re: /no conoce `no_ejecutada`/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`35 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla35(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
