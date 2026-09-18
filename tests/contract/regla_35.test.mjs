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
  // NO TODAS LAS REGLAS NECESITAN APROBADOR: el área es a quién se le pide la EXCEPCIÓN, así que sólo la
  // exige la regla con al menos un tramo `excepcion`. Un KNOCK OUT (sólo `rechazado`) no se aprueba y no
  // necesita área — exigírsela lo habría dejado sin ejecutar por una carencia que no lo es.
  if (!/if \(!regla\.area && \(regla\.tiers \|\| \[\]\)\.some\(\(t\) => t\[1\] === "excepcion"\)\)\s*return \{[\s\S]{0,300}noEjecutable: true/.test(c))
    fallos.push("la compuerta no condiciona el área a que la regla tenga un tramo de EXCEPCIÓN: un knock out no se aprueba y no necesita aprobador");
  // El criterio tiene que ser el MISMO con que la mesa de reglas arma su lista, o la mesa mostraría
  // reglas que el motor no rutea (o al revés).
  if (!/const rules = REGLAS_CLIENTE\.filter\(\(r\) => !r\.clasif && \(r\.tiers \|\| \[\]\)\.some\(\(t\) => t\[1\] === "excepcion"\)\)/.test(src))
    fallos.push("la mesa de reglas ya no arma su lista con `tiers.some(excepcion)`: su criterio y el de la compuerta tienen que ser el mismo");
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
  if (!/const noEjec = res\s*\.filter\(\(x\) => x\.disp === "no_ejecutada"\)/.test(v)) fallos.push("visadoDealCalc no junta las reglas no ejecutadas");
  if (!/return \{[^\n]*\bnoEjec\b/.test(v)) fallos.push("visadoDealCalc no devuelve `noEjec`: sin salir del motor, la pantalla no puede nombrarlas");
  for (const campo of ["exc", "rech"]) {
    const m = v.match(new RegExp(`const ${campo} = res\\s*\\.filter\\(\\(x\\) => x\\.disp === "([a-z_]+)"\\)`));
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
  // 6 · NUNCA EN SILENCIO. Fuera del tab de Otorgamiento había tres formas de que la operación se viera
  //     limpia: la tarjeta del Kanban devolvía `null` (una regla no ejecutada no llega a `exc` ni a
  //     `rechReev`), el denominador «N/M criterios» del tubo encogía solo, y la mesa de reglas —que es
  //     DONDE se arregla— mostraba un chip de área vacío.
  if (!/if \(!isPerdida && vis\.noEjec && vis\.noEjec\.length\) \{/.test(src)) fallos.push("la tarjeta del Kanban no dibuja nada con una regla sin ejecutar: la operación se ve limpia en el tubo");
  if (!/criterio\(s\) sin ejecutar/.test(src)) fallos.push("el badge de la tarjeta no nombra los criterios sin ejecutar");
  if (!/const totCrit = visC \? \(?visC\.aprob \+ visC\.clasif \+ visC\.exc\.length \+ visC\.rech\.length \+ \(visC\.noEjec \|\| \[\]\)\.length/.test(src))
    fallos.push("el total de criterios del tubo no cuenta las no ejecutadas: el denominador encoge solo y el criterio desaparece sin que nadie lo note");
  if (!/backgroundColor: ne\.noEjecutable \? "#FFF7ED" : undefined/.test(src)) fallos.push("la mesa de reglas no consulta la compuerta: es la pantalla donde se arregla y no marcaba la regla mal definida");
  if (!/Sin área · NO SE EJECUTA/.test(src)) fallos.push("la mesa de reglas no marca la fila mal definida en vez de su chip de área");
  // Las DOS pantallas de mantenedor que la escondían por construcción, y no por olvido:
  //  · el catálogo de criterios AGRUPA POR ÁREA sobre una lista fija de cuatro y filtra `r.area === area`:
  //    lo que no calza no pertenece a ningún grupo y desaparece, mientras la bajada sigue contando el total.
  //  · `CfgAreas` cuenta «Criterios que rutean acá» por fila: una regla sin área no rutea a ninguna, así que
  //    la suma deja de cuadrar con el catálogo sin que nada lo diga.
  if (!/const fuera = REGLAS_CLIENTE\.filter\(\(r\) => !areas\.includes\(r\.area\)\);/.test(src))
    fallos.push("el catálogo de criterios por área no junta las que no caen en ningún grupo: una regla que se esfuma de la pantalla que la cataloga es la vía más silenciosa de todas");
  if (!/Sin área · \{malas\.length \? "NO SE EJECUTAN"/.test(src)) fallos.push("el catálogo por área no rotula el grupo de las que no se ejecutan");
  if (!/no cae en ninguna de las áreas de abajo y va en el primer bloque/.test(src)) fallos.push("la bajada del catálogo sigue contando todas las reglas sin decir cuántas no se listan");
  if (!/const malas = REGLAS_CLIENTE\.filter\(\(r2\) => reglaNoEjecutable\(r2\)\.noEjecutable\);/.test(src))
    fallos.push("`CfgAreas` no avisa de los criterios sin área: es la pantalla donde se declaran y su tabla no los cuenta en ninguna fila");
  if (!/criterio\(s\) SIN ÁREA: no se ejecutan ni se verifican/.test(src)) fallos.push("`CfgAreas` no nombra el problema con todas sus letras");
  // 7 · El contador no la disuelve en «ok» ni en «pendiente».
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
  "la compuerta mira el estado del tenant": { src: jsx.replace('  if (!regla.area && (regla.tiers || []).some((t) => t[1] === "excepcion"))', '  if (padronAprobadores().areas.length === 0) return { noEjecutable: false };\n  if (!regla.area && (regla.tiers || []).some((t) => t[1] === "excepcion"))'), re: /lee `padronAprobadores`/ },
  "las no ejecutadas se meten en las excepciones": { src: jsx.replace('const exc = res\n    .filter((x) => x.disp === "excepcion")', 'const exc = res\n    .filter((x) => x.disp === "no_ejecutada")'), re: /mete las no ejecutadas en `exc`/ },
  "el veredicto deja de exponerlas": { src: jsx.replace("aprob, clasif, noEjec, excPend", "aprob, clasif, excPend"), re: /no devuelve `noEjec`/ },
  "la fila muestra el hallazgo de una regla que nadie evaluó": { src: jsx.replace('{x.disp !== "aprobado" && x.disp !== "no_ejecutada" && x.hallazgo', '{x.disp !== "aprobado" && x.hallazgo'), re: /muestra el `hallazgo`/ },
  "el badge va en gris como la clasificación": { src: jsx.replace('no_ejecutada: "#C2410C"', 'no_ejecutada: C.faint'), re: /no va en ámbar/ },
  "el contador la suma a las aprobadas": { src: jsx.replace('const noEjec = items.filter((it) => it.disp === "no_ejecutada").length;', ""), re: /no cuenta aparte las no ejecutadas/ },
  "vuelven al balde de las aprobadas": { src: jsx.replace('const okRows = active.rows.filter((x) => !reqAprob(x) && x.disp !== "no_ejecutada");', "const okRows = active.rows.filter((x) => !reqAprob(x));"), re: /siguen cayendo en `okRows`/ },
  "«todas aprobadas» con una sin ejecutar": { src: jsx.replace("{reqRows.length === 0 && noEjecRows.length === 0 && (", "{reqRows.length === 0 && ("), re: /«Todas las reglas están aprobadas» con una regla sin ejecutar/ },
  "el orden no conoce la quinta disposición": { src: jsx.replace("const orden = { rechazado: 0, excepcion: 1, no_ejecutada: 2, aprobado: 3 };", "const orden = { rechazado: 0, excepcion: 1, aprobado: 2 };"), re: /no conoce `no_ejecutada`/ },
  "la compuerta le exige área también al knock out": { src: jsx.replace('if (!regla.area && (regla.tiers || []).some((t) => t[1] === "excepcion"))', "if (!regla.area)"), re: /no condiciona el área a que la regla tenga un tramo de EXCEPCIÓN/ },
  "la tarjeta del Kanban vuelve a callarse": { src: jsx.replace("        if (!isPerdida && vis.noEjec && vis.noEjec.length) {", "        if (false) {"), re: /la tarjeta del Kanban no dibuja nada/ },
  "el denominador del tubo vuelve a encoger": { src: jsx.replace("visC.rech.length + (visC.noEjec || []).length", "visC.rech.length"), re: /el denominador encoge solo/ },
  "la mesa de reglas deja de marcarla": { src: jsx.replace('style={{ border: `1px solid ${ne.noEjecutable ? "#F97316" : C.line}`, backgroundColor: ne.noEjecutable ? "#FFF7ED" : undefined }}', 'style={{ border: `1px solid ${C.line}` }}'), re: /la mesa de reglas no consulta la compuerta/ },
  "el catálogo por área vuelve a esconderla": { src: jsx.replace("        const fuera = REGLAS_CLIENTE.filter((r) => !areas.includes(r.area));", "        const fuera = [];"), re: /no junta las que no caen en ningún grupo/ },
  "la bajada del catálogo vuelve a contar todas": { src: jsx.replace(" no cae en ninguna de las áreas de abajo y va en el primer bloque.", " reglas."), re: /sigue contando todas las reglas sin decir/ },
  "Configuración › Áreas deja de avisar": { src: jsx.replace("          const malas = REGLAS_CLIENTE.filter((r2) => reglaNoEjecutable(r2).noEjecutable);", "          const malas = [];"), re: /`CfgAreas` no avisa de los criterios sin área/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`35 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla35(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
