/* Gate de contrato de la REGLA 44: la estructura de líneas es un INSUMO, no un producto del pipeline.
   Los tres niveles —cupo del cliente, línea del par cliente-deudor y exposición global del deudor— los
   decide el sistema de gestión de líneas y llegan por el activo A23 (`LINEA_CUPO` + `LINEA_DEUDOR`).
   Hasta el 20-09-2026 los fabricaba `lineasDeCliente` a partir del A7/A8, que es lo que el levantamiento
   prohíbe en una línea («A7 y A16 nunca alimentan el motor de líneas»), y por eso `constituirLinea` no
   tenía dónde escribir la línea que el comité aprobaba: descartaba `sol.detalle` entero.

   Este gate vigila DOS cosas que ningún otro paso ve:
   · que el fuente no vuelva a dimensionar (ni sorteo, ni reparto, ni umbrales de talla en el lector), y
   · que el generador siga produciendo los dos bloques, con la forma que el lector espera.
   Y se lleva la prueba unitaria de `repartirConPiso`, que era el tramo (c) del caso 102 de la suite y
   ahora vive donde vive la función. Patrones sobre `canonico(src)` y sondas plantadas sobre el texto
   canónico (ADR-0006). */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { leer, canonico, RAIZ } from "./_comun.mjs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const gen = require(join(RAIZ, "GeneradorDatos/datasets/lineas_par.js"));

const entre = (src, desde, hasta) => {
  const i = src.indexOf(desde);
  if (i < 0) return null;
  const j = src.indexOf(hasta, i + desde.length);
  return j < 0 ? null : src.slice(i, j);
};

/* ── A · EL FUENTE LEE, NO FABRICA ────────────────────────────────────────────────────────────── */
export function auditarLector(src0) {
  const src = canonico(src0);
  const fallos = [];

  // El dimensionamiento no puede volver al fuente por ninguna de sus tres puertas.
  for (const [sym, porque] of [
    ["function repartirConPiso(", "repartir un presupuesto entre pares ES dimensionar: lo hace el sistema de líneas"],
    ["function lf4MetaPorCliente(", "tallar la LF4 por categoría ES dimensionar"],
    ["function clienteEnMaestroLineas(", "el estado A/B/S lo declara el activo en su fila CLIENTE, no se deduce del A7"],
  ])
    if (src.includes(sym)) fallos.push(`el fuente volvió a declarar \`${sym.replace("function ", "").replace("(", "")}\`: ${porque}`);

  // El LECTOR: índice sobre el activo, sin azar y sin umbrales de talla.
  const idx = entre(src, "function idxCupo() {", "function lineasDeCliente(");
  if (!idx) fallos.push("no existe `idxCupo()` seguido de `lineasDeCliente`: el lector del A23 es el único punto que arma el estado de líneas");
  else {
    if (!/window\.LINEA_CUPO/.test(idx)) fallos.push("`idxCupo` no lee `window.LINEA_CUPO`: el nivel 1-2 tiene que salir del activo A23");
    for (const mal of ["pcRng(", "hashStr(", "Math.random("])
      if (idx.includes(mal)) fallos.push(`\`idxCupo\` usa \`${mal}\`: un lector no sortea — quién tiene línea y de cuánto ya viene decidido`);
    if (/pol\(\s*"(lineaMinima|otrosDeudoresPct)"/.test(idx))
      fallos.push("`idxCupo` lee un umbral de dimensionamiento: esas perillas son declarativas y las aplica el sistema de líneas (regla 44)");
  }

  const deu = entre(src, "function lineasDeudor() {", "// Línea del deudor por RUT");
  if (!deu) fallos.push("no existe `lineasDeudor()`: el nivel 3 se lee del activo");
  else {
    if (!/window\.LINEA_DEUDOR/.test(deu)) fallos.push("`lineasDeudor` no lee `window.LINEA_DEUDOR`: la exposición global del deudor cruza carteras y no se deduce acá");
    for (const mal of ["pcRng(", "hashStr(", "lineasDeCliente("])
      if (deu.includes(mal))
        fallos.push(`\`lineasDeudor\` usa \`${mal}\`: construirse encima del nivel 2 o sortear la holgura es fabricar el nivel 3`);
  }

  // El TESTIGO del cache va aparte del mapa: «vacío» y «sin construir» son estados distintos, y
  // confundirlos deja a todo cliente leyéndose como estado A sin que nada falle (lo descubrió la suite).
  if (!/let _cupoListo = false;/.test(src) || !/if \(_cupoListo\) return _cacheCli;/.test(src))
    fallos.push("`idxCupo` no distingue «índice vacío» de «índice sin construir»: un `.clear()` de afuera lo daría por construido y nadie tendría cupo");

  // EL BUCLE DEL COMITÉ: lo que el comité aprueba línea a línea tiene dónde ir.
  if (!/function constituirLineasDeDetalle\(sol\)/.test(src))
    fallos.push("no existe `constituirLineasDeDetalle`: sin ella `constituirLinea` vuelve a descartar `sol.detalle` y el deudor que fue al comité sigue sin línea propia");
  const cons = entre(src, "function constituirLinea(sol) {", "function lineaDeCliente(");
  if (cons && !/constituirLineasDeDetalle\(sol\)/.test(cons))
    fallos.push("`constituirLinea` no escribe el detalle: el comité aprueba por par y sólo se estaría guardando el techo del cliente");
  const det = entre(src, "function constituirLineasDeDetalle(sol) {", "function constituirLinea(");
  if (det) {
    if (!/repoLineaComite\.set\(/.test(det)) fallos.push("`constituirLineasDeDetalle` no persiste en `repoLineaComite`");
    if (!/invalidarCupo\(\)/.test(det)) fallos.push("`constituirLineasDeDetalle` no invalida el índice: la línea nueva no la vería el motor");
    if (!/repoLineaComite\.all\(\)\[idProceso\]/.test(det))
      fallos.push("`constituirLineasDeDetalle` no es idempotente por `idProceso`: la API 3 se consulta en cada refresco y constituiría dos veces");
  }
  // EL RUT DEL DEUDOR SE RESUELVE, NO SE INVENTA (regla 46). El wizard del comité lo armaba con
  // `76000000 + (h % 20000000)` y un dígito verificador sorteado de una cadena: 92% inválidos y 100%
  // desconocidos, así que la línea otorgada caía sobre un par inexistente.
  // Se ancla en los DOS sitios que arman la identidad de un DEUDOR para el motor —el wizard del
  // comité y el `rutDe` de la evaluación de línea del detalle—, no en el patrón suelto: `rutDe` de
  // nivel módulo y la rama de degradación de `PC_CLIENTES` arman un RUT de CLIENTE para el alta
  // manual y para cuando no hay activo, que es otra cosa y no llega al par cliente-deudor. Prohibir
  // el patrón en todo el archivo sonaría más fuerte y vigilaría lo mismo, con dos falsos positivos.
  if (/const rutDe = \(n\) => \{/.test(src) && /rut:" \+ n/.test(src))
    fallos.push("el `rutDe` de la evaluación de línea vuelve a ARMAR el RUT del deudor: alimenta los tres niveles, y uno inventado es un deudor distinto");
  if (!/function rutDeDeudorPorNombre\(nombre\)/.test(src))
    fallos.push("no existe `rutDeDeudorPorNombre`: sin resolver contra el universo conocido, el wizard vuelve a fabricar identidades");
  const cdl = entre(src, "const construirDeudorLinea = (nombre) => {", "// Pre-carga:");
  if (cdl && !/rut: rutReal/.test(cdl))
    fallos.push("`construirDeudorLinea` no usa el RUT resuelto: es la fila que el comité aprueba y la que `constituirLineasDeDetalle` convierte en línea");
  if (/Object\.keys\(SPREAD_MIN_DEUDOR\)\.filter\(\(n\) => !deudores\.some/.test(src))
    fallos.push("los candidatos del wizard vuelven a salir de `SPREAD_MIN_DEUDOR`: son 23 razones sociales canónicas, no el catálogo de empresas deudoras");

  // LA CABECERA NO SE COPIA DEL TECHO APROBADO (regla 45): es la suma, también después de que el
  // comité constituye. Copiar `aprobadaCliente` devolvería el nivel 1 a ser un número suelto.
  const ov = entre(src, "for (const [idProceso, g] of Object.entries(repoLineaComite.all()))", "return _cacheCli;");
  if (ov) {
    if (/st\.asignadaCliente = g\.aprobadaCliente/.test(ov))
      fallos.push("el overlay copia `aprobadaCliente` en la cabecera: el nivel 1 es la SUMA de las líneas, no el techo que se pidió");
    if (!/st\.asignadaCliente = st\.lineas\.reduce\(/.test(ov))
      fallos.push("el overlay no recalcula la cabecera como suma tras constituir");
    if (!/origen: "comite"/.test(ov)) fallos.push("lo que el comité constituye no queda marcado: era el pedido explícito del usuario");
  }

  // Y NO se muta la entrega del sistema externo: sería fingir que el batch dice algo que no dice.
  if (/window\.LINEA_CUPO\s*(\.push|\[[^\]]*\]\s*=|=[^=])/.test(src))
    fallos.push("algo escribe sobre `window.LINEA_CUPO`: la entrega del sistema de líneas se lee, y lo que el comité constituye se superpone (repoLineaComite)");

  // LAS DOS PERILLAS SON DECLARATIVAS Y EL `hint` LO DICE. Es lo que la regla 9-bis exige de una
  // perilla que ningún motor consume: sin eso se mueve, no pasa nada, y quien la usó deja de creerle
  // a la pantalla.
  for (const campo of ["lineaMinima", "otrosDeudoresPct"]) {
    const i = src.indexOf(`num("${campo}"`);
    if (i < 0) {
      fallos.push(`el mantenedor ya no ofrece \`${campo}\`: la perilla viaja en el contrato del tenant aunque la aplique el sistema de líneas`);
      continue;
    }
    // El `hint` del campo está en el <CfgCampo> que lo envuelve: se busca hacia atrás desde el input.
    const campoAbre = src.lastIndexOf("<CfgCampo", i);
    if (campoAbre < 0 || !/DECLARATIVO/.test(src.slice(campoAbre, i)))
      fallos.push(`el hint de \`${campo}\` no dice DECLARATIVO: es la trampa de la regla 9-bis, una perilla que no hace nada y no lo declara`);
  }
  return fallos;
}

/* ── B · EL GENERADOR PRODUCE LOS DOS BLOQUES ─────────────────────────────────────────────────── */
export function auditarGenerador(src0) {
  const src = canonico(src0);
  const fallos = [];
  for (const b of ["LINEA_CUPO", "LINEA_DEUDOR"])
    if (!src.includes(`["${b}", lineasPar.`)) fallos.push(`\`${b}\` no está en DERIVADOS: el activo A23 no se regeneraría`);
  // El ORDEN importa: los dos niveles del A23 se dimensionan sobre el A7/A8 recién generado.
  const iA7 = src.indexOf('["LINEA_DISPONIBLE"');
  const iCupo = src.indexOf('["LINEA_CUPO"');
  if (iA7 >= 0 && iCupo >= 0 && iCupo < iA7)
    fallos.push("`LINEA_CUPO` se genera ANTES que `LINEA_DISPONIBLE`: tomaría la entrega anterior del A7/A8 como insumo estructural");
  return fallos;
}

const jsx = leer("pipeline_comercial.jsx");
const generar = leer("GeneradorDatos/generar.js");

test("regla 44: el fuente LEE la estructura de líneas del A23 y no la fabrica", () => {
  assert.deepEqual(auditarLector(jsx), []);
});

test("regla 44: el generador produce los dos bloques del A23, y después del A7/A8", () => {
  assert.deepEqual(auditarGenerador(generar), []);
});

/* ── C · `repartirConPiso`, que era el tramo (c) del caso 102 y ahora vive en el generador ─────── */
test("regla 27: el piso limita CUÁNTAS líneas caben, no cuánto recibe cada una", () => {
  const { repartirConPiso } = gen;
  const suma = (a) => a.reduce((x, y) => x + y, 0);
  const r1 = repartirConPiso(100e6, [1, 1, 1, 1], 10e6, 5e6);
  const r2 = repartirConPiso(25e6, [4, 3, 2, 1], 10e6, 5e6);
  const r3 = repartirConPiso(8e6, [1, 1, 1], 10e6, 5e6);
  const r4 = repartirConPiso(37e6, [2, 1], 0, 5e6); // piso 0 = el caso de la LF3, exenta del mínimo
  assert.equal(suma(r1), 100e6, "la suma tiene que ser EXACTA: el residuo lo absorbe una parte, no se pierde");
  assert.ok(r1.every((x) => x >= 10e6));
  // Con 25 de total y piso 10 caben DOS partes, no cuatro. Es la consecuencia que manda deudores al comodín.
  assert.equal(suma(r2), 25e6);
  assert.equal(r2.filter((x) => x > 0).length, 2);
  assert.ok(r2.every((x) => x === 0 || x >= 10e6));
  // …y se quedan las de MAYOR peso: si alguien pierde su línea propia, que sea el que menos aporta.
  assert.deepEqual(
    r2.map((x) => x > 0),
    [true, true, false, false],
  );
  assert.equal(suma(r3), 0, "si no cabe ninguna no se asigna nada: el piso NO crea capacidad");
  assert.equal(suma(r4), 37e6);
  assert.ok(r4.every((x) => x > 0), "sin piso entran todas");
});

/* ── D · SONDAS NEGATIVAS · un gate que no caza su propia violación no vigila nada ─────────────── */
test("sonda negativa: cada violación plantada en una copia del fuente hace fallar al gate", () => {
  const canon = canonico(jsx);
  const sondas = [
    ["vuelve el reparto", canon.replace("function idxCupo() {", "function repartirConPiso(t, p) { return p; }\nfunction idxCupo() {"), /repartirConPiso/],
    ["el lector sortea", canon.replace("function idxCupo() {if (_cupoListo)", "function idxCupo() {const rnd = pcRng(hashStr(\"x\")); if (_cupoListo)"), /idxCupo. usa/],
    // Ancla el CÓDIGO y no el nombre: la primera aparición de `window.LINEA_CUPO` en el fuente está
    // en un comentario, y un replace suelto habría plantado ahí — una sonda que no planta nada pasa
    // sola y deja el gate sin vigilancia (lo cazó ella misma al escribirla).
    ["el lector deja de leer el activo", canon.replace("Array.isArray(window.LINEA_CUPO) ? window.LINEA_CUPO : []", "Array.isArray(window.NO_EXISTE) ? window.NO_EXISTE : []"), /LINEA_CUPO/],
    ["el nivel 3 se construye encima del 2", canon.replace("function lineasDeudor() {if (_deudorIdx)", "function lineasDeudor() {lineasDeCliente(\"x\"); if (_deudorIdx)"), /lineasDeudor. usa/],
    ["el testigo del cache vuelve al mapa", canon.replace("let _cupoListo = false;", "let _cupoListoOtro = false;"), /índice vacío/],
    ["el comité vuelve a descartar el detalle", canon.replace("constituirLineasDeDetalle(sol); //", "//"), /no escribe el detalle/],
    ["se pierde la idempotencia", canon.replace("repoLineaComite.all()[idProceso]", "false"), /idempotente/],
    ["se muta la entrega del sistema externo", canon.replace("function idxCupo() {", "function ensuciar() { window.LINEA_CUPO.push({}); }\nfunction idxCupo() {"), /escribe sobre/],
    ["el hint deja de declarar la perilla", canon.replace(/DECLARATIVO/g, "aplicado"), /DECLARATIVO/],
    [
      "el wizard vuelve a inventar el RUT del deudor",
      canon.replace("rut: rutReal,", 'rut: `${76000000 + (h % 20000000)}-0`,'),
      /construirDeudorLinea. no usa el RUT resuelto/,
    ],
    [
      "los candidatos vuelven al catálogo de spreads",
      canon.replace(
        "const candidatosDeu = useMemo(",
        "const candidatosDeu = Object.keys(SPREAD_MIN_DEUDOR).filter((n) => !deudores.some((d) => d.nombre === n)); const noUsado = useMemo(",
      ),
      /SPREAD_MIN_DEUDOR/,
    ],
    ["la evaluación de línea vuelve a armar el RUT", canon.replace("const rutDe = (n) => rutMap[n]", 'const rutDe = (n) => { const h = hashStr("rut:" + n); return rutMap[n]'), /evaluación de línea/],
    ["la cabecera vuelve a copiar el techo", canon.replace("st.asignadaCliente = st.lineas.reduce(", "st.asignadaCliente = g.aprobadaCliente; const x = ("), /copia .aprobadaCliente./],
  ];
  for (const [nombre, plantado, espera] of sondas) {
    assert.notEqual(plantado, canon, `la sonda «${nombre}» no cambió el fuente: no está plantando nada`);
    const fallos = auditarLector(plantado);
    assert.ok(fallos.length > 0, `la sonda «${nombre}» NO fue cazada por el gate`);
    assert.ok(fallos.some((f) => espera.test(f)), `la sonda «${nombre}» se cazó por otro motivo: ${fallos.join(" · ")}`);
  }
  // …y el generador: sin su bloque en DERIVADOS, o con el orden invertido.
  assert.ok(auditarGenerador(canonico(generar).replace('["LINEA_CUPO", lineasPar.cupo],', "")).length > 0);
  const invertido = canonico(generar)
    .replace('["LINEA_DISPONIBLE", lineas],', "@@A7@@")
    .replace('["LINEA_CUPO", lineasPar.cupo],', '["LINEA_DISPONIBLE", lineas],')
    .replace("@@A7@@", '["LINEA_CUPO", lineasPar.cupo],');
  assert.ok(
    auditarGenerador(invertido).some((f) => /ANTES que/.test(f)),
    "el gate no caza que el A23 se genere antes que el A7/A8",
  );
});

/* ── E · EL ACTIVO TIENE LA FORMA QUE EL LECTOR ESPERA ────────────────────────────────────────── */
test("el activo A23 trae los dos bloques con la forma que el lector espera (snapshot)", () => {
  const datos = {};
  new Function("window", leer("datos_inyectados.js"))(datos);
  const cupo = datos.LINEA_CUPO || [];
  const deudor = datos.LINEA_DEUDOR || [];
  // SNAPSHOT: estas cifras se mueven cuando se regeneran los activos, y moverlas es una decisión que
  // va al commit. La migración del 20-09-2026 las dejó IDÉNTICAS a lo que el pipeline fabricaba.
  const porTipo = cupo.reduce((m, r) => ((m[r.TipoLinea] = (m[r.TipoLinea] || 0) + 1), m), {});
  assert.deepEqual(porTipo, { CLIENTE: 500, LF1: 267, LF2: 2526, LF3: 445, LF4: 429 });
  assert.equal(deudor.length, 741);
  // REGLA, no snapshot: la forma no puede degradarse aunque los conteos cambien.
  const cli = cupo.filter((r) => r.TipoLinea === "CLIENTE");
  assert.ok(cli.every((r) => ["A", "B", "S"].includes(r.EstadoCliente)), "el estado del cliente sólo puede ser A, B o S");
  assert.ok(
    cupo.filter((r) => r.Nivel === 2).every((r) => r.RUTDeudor && ["LF2", "LF3"].includes(r.TipoLinea)),
    "toda línea de nivel 2 nombra a su deudor y es LF2 o LF3: sin RUT no hay par que reconocer",
  );
  assert.ok(
    cupo.filter((r) => r.TipoLinea === "LF4").every((r) => r.Categoria === "Lista Blanca" || r.Categoria === "Deudores Autorizados"),
    "la LF4 es POR CATEGORÍA de deudor: sin ella el motor no sabe cuál comodín le toca a cada deudor",
  );
  assert.ok(cupo.every((r) => Number.isInteger(r.MontoAprobado) && Number.isInteger(r.MontoUtilizado)), "todo monto es un peso ENTERO (regla núcleo 9)");
  assert.ok(deudor.every((d) => d.MontoDisponible === d.MontoAprobado - d.MontoUtilizado), "disponible = aprobado − utilizado, sin reservado que NEX lleve aparte (regla 12)");
  // EL NIVEL 1 ES EL CONSOLIDADO (regla 45): la línea del RUT cliente ES la suma de lo que se le
  // asignó, por par o con los otros deudores. Se comprueba en aprobado Y en utilizado: hasta el
  // 20-09-2026 la cabecera superaba a la suma en 217 de 224 clientes —brecha mediana 13,7%,
  // $36.024.682.300— porque el dimensionamiento le dejaba una holgura sorteada del 8 al 22%.
  {
    const porRut = new Map();
    for (const r of cupo) {
      if (!porRut.has(r.RUTCliente)) porRut.set(r.RUTCliente, []);
      porRut.get(r.RUTCliente).push(r);
    }
    for (const [rut, filas] of porRut) {
      const cab = filas.find((f) => f.TipoLinea === "CLIENTE");
      assert.ok(cab, `${rut}: sin fila CLIENTE, el nivel 1 no existiría`);
      const L = filas.filter((f) => f.TipoLinea !== "CLIENTE");
      assert.equal(cab.MontoAprobado, L.reduce((a, f) => a + f.MontoAprobado, 0), `${rut}: la cabecera no es la suma de lo aprobado`);
      assert.equal(cab.MontoUtilizado, L.reduce((a, f) => a + f.MontoUtilizado, 0), `${rut}: la cabecera no es la suma de lo utilizado`);
    }
  }
  // LA MARCA (pedido del usuario): el activo trae SÓLO líneas del maestro. `COMITE` la escribe el
  // pipeline sobre lo que constituye una solicitud aprobada, así que una en el activo significaría
  // que la marca dejó de distinguir nada.
  assert.deepEqual([...new Set(cupo.map((r) => r.Origen))], ["MAESTRO"], "el activo no puede traer líneas marcadas como del COMITÉ");
  assert.ok(cupo.every((r) => r.IdProceso === ""), "una línea del maestro no nace de ningún proceso de comité");

  // Un cliente en estado A tiene LF1 y ninguna línea de par; uno en B, al revés. La LF1 es EXCLUYENTE.
  const porCli = new Map();
  for (const r of cupo) {
    if (!porCli.has(r.RUTCliente)) porCli.set(r.RUTCliente, []);
    porCli.get(r.RUTCliente).push(r);
  }
  for (const [rut, filas] of porCli) {
    const est = (filas.find((f) => f.TipoLinea === "CLIENTE") || {}).EstadoCliente;
    const tipos = new Set(filas.filter((f) => f.TipoLinea !== "CLIENTE").map((f) => f.TipoLinea));
    if (est === "A") assert.ok(tipos.has("LF1") && !tipos.has("LF2") && !tipos.has("LF4"), `${rut}: estado A con líneas de comité`);
    if (est === "B") assert.ok(!tipos.has("LF1"), `${rut}: estado B conservando la LF1, que es excluyente`);
    if (est === "S") assert.equal(tipos.size, 0, `${rut}: estado S con líneas vivas`);
  }
});
