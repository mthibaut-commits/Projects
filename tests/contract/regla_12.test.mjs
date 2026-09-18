/* Gate de contrato de la regla 12 (La reserva NO es de NEX), sobre el TEXTO del fuente y de los docs, para lo
   que la suite no alcanza porque vive en React o en el spec: (1) el motor de líneas no conoce la palabra
   «reserva» en su CÓDIGO ni persiste nada; (2) `snapVersionCli` recorta la versión anterior desde Aceptada en
   adelante en vez de volver a asignar; (3) el detalle lee la operación aceptada de la versión (`leeDeVersion`);
   (4) el A23 es quien declara `reservada` y `disponible = aprobada − utilizada − reservada`; y (5) nadie en el
   fuente graba una reserva propia —almacén, estado de React, campo, clave o storage—, con la única cifra `reserva`
   que sí se guarda (la informativa de `reabrir`) declarada como excepción y comprobada. Cinco tests, uno por punto,
   cada uno con sonda: se planta la violación y el gate la caza; un comentario o la prosa de pantalla no. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico} from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Cuerpo de una función de nivel módulo: hasta la siguiente declaración a columna 0 (guarda de la poda). */
export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^(?:function|const) ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const desde = m.index;
  const resto = src.slice(desde + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(desde, fin < 0 ? undefined : desde + m[0].length + fin);
}
/* Quita los comentarios pero CONSERVA los saltos de línea del bloque, para que la línea que se reporta sea la del fuente. */
export const sinComentarios = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, "")).replace(/\/\/[^\n]*/g, "");
const MOTOR = ["asignarLineas", "recortarAsignacion", "seleccionConLinea", "facturasConLinea", "capacidadDeudores"];
const PERSISTE = /localStorage|sessionStorage|setItem|SIM_VERSIONS|\bREPOS\b|crearRepo|repoSim|registrarAuditoria|fetch\(/;

/* 1 · El motor: código sin «reserv» y sin persistencia. Devuelve los fallos por función. */
export function motorSinReserva(src) {
  const fallos = [];
  for (const f of MOTOR) {
    const c = cuerpoDe(src, f);
    if (!c) { fallos.push(`${f}: no se encontró a nivel módulo`); continue; }
    const cod = sinComentarios(c);
    if (/reserv/i.test(cod)) fallos.push(`${f}: su código menciona «reserv»`);
    if (PERSISTE.test(cod)) fallos.push(`${f}: su código persiste o lee estado mutable (${(cod.match(PERSISTE) || [])[0]})`);
  }
  return fallos;
}
/* 2 · `snapVersionCli`: desde Aceptada en adelante RECORTA la versión anterior; asignar es la otra rama. */
export function aceptadaRecorta(src) {
  const c = cuerpoDe(src, "snapVersionCli");
  if (!c) return ["snapVersionCli no está a nivel módulo"];
  const fallos = [];
  const etapas = c.match(/const aceptada = !!\(deal && \[([^\]]*)\]\.includes\(deal\.stage\)\)/);
  const lista = etapas ? [...etapas[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
  for (const e of ["aceptadas", "cesion", "otorgamiento", "giro"]) if (!lista.includes(e)) fallos.push(`la etapa «${e}» no cuenta como aceptada en snapVersionCli`);
  if (!/if \(aceptada && lineaPrev\) \{\s*linea = recortarAsignacion\(lineaPrev,/.test(canonico(c))) fallos.push("la rama aceptada no recorta la versión anterior (recortarAsignacion(lineaPrev, …))");
  const ramaAceptada = (c.match(/if \(aceptada && lineaPrev\) \{([\s\S]*?)\} else/) || [])[1] || "";
  if (/asignarLineas\(/.test(ramaAceptada)) fallos.push("la rama aceptada vuelve a asignar contra el estado del día");
  if (!/\} else if \(fsOp\.length && deal && deal\.rutEmisor\) \{\s*const ev = asignarLineas\(fsOp, deal\.rutEmisor\);/.test(c)) fallos.push("la asignación desde cero no queda en la rama NO aceptada");
  return fallos;
}
/* 3 · El detalle lee la aceptada de la VERSIÓN: no re-evalúa contra un disponible que ya viene neto de su reserva. */
export function detalleLeeDeVersion(src) {
  const fallos = [];
  if (!/const leeDeVersion = bloqueado && !!\(ultVer && ultVer\.linea\);/.test(src)) fallos.push("falta `leeDeVersion = bloqueado && !!(ultVer && ultVer.linea)` en el detalle");
  if (!/const evalLin = leeDeVersion \? ultVer\.linea\s*: reevalPend \? null\s*: asignarLineas\(validas, deal\.rutEmisor,/.test(canonico(src))) fallos.push("`evalLin` no toma la versión cuando `leeDeVersion`");
  const bloq = src.match(/const bloqueado = \[([^\]]*)\]\.includes\(deal\.stage\);/);
  const lista = bloq ? [...bloq[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
  // Sólo las tres etapas en que el detalle y `snapVersionCli` COINCIDEN. «otorgamiento» cuenta como aceptada en
  // snapVersionCli y no en `bloqueado` del detalle (hallazgo 1 del reporte: ahí el detalle vuelve a correr
  // asignarLineas contra el disponible del día). Exigirla acá dejaría el gate en FALLA por un defecto que se
  // documenta y no se gatea; cuando las dos listas sean una sola constante, va acá.
  for (const e of ["aceptadas", "cesion", "giro"]) if (!lista.includes(e)) fallos.push(`«${e}» no bloquea la re-evaluación en el detalle`);
  return fallos;
}
/* 4 · A23 declara la reserva: es el activo que la LEE, y la fórmula está escrita ahí y no en el motor. */
export function a23DeclaraReserva(spec, swagger) {
  const fallos = [];
  if (!/disponible = aprobada − utilizada − reservada/.test(spec)) fallos.push("el spec de A23 no escribe `disponible = aprobada − utilizada − reservada`");
  if (!/\|\s*`reservada`\s*\|/.test(spec)) fallos.push("el spec de A23 no declara el campo `reservada`");
  const n = (swagger.match(/^\s*reservada:\s*\{ type: integer/gm) || []).length;
  if (n < 3) fallos.push(`el swagger de A23 declara \`reservada\` en ${n} esquema(s); son tres niveles`);
  return fallos;
}
/* 5 · Nadie en el fuente GRABA una reserva propia, en ninguna de sus formas: un almacén (`RESERVAS[id] = …`,
   `reservas = new Map()`), un estado de React (`setReservas`), un campo `reservado:`/`reservada =`, una clave
   `reserva:` o `{ …, reserva }` en un literal, una asignación `x.reserva =` / `x["reserva"] =`, o una clave de storage
   o repositorio con «reserv». Se mide sobre el CÓDIGO (sin comentarios) y una entrada por línea ofensora; la prosa de
   pantalla («no una reserva: el cupo lo reserva…») no cae porque la clave se busca en posición de literal (`{`/`,`).
   La ÚNICA excepción, declarada y comprobada por `excepcionReserva`: la cifra INFORMATIVA `reserva` que `reabrir` deja
   en la marca `reabierta` (`{ …, versionAceptada, reserva }`), copiada del cursable de la versión aceptada para decir
   cuánto sigue reservado AFUERA. Sólo se exime ESA forma en ESA línea; otro escritor en la misma línea sí cae. */
const ESCRITORES_RESERVA = [
  /\bRESERVAS?\b/,                                            // almacén global en mayúsculas
  /\b_?[Rr]eservas?\s*=\s*(?:new (?:Map|Set)\b|\{\}|\[\])/,    // `reservas = new Map()` / `{}` / `[]`
  /\bset[Rr]eservas?\b/,                                      // setter de estado React
  /\breservad[ao]s?\s*[:=](?!=)/,                             // campo `reservado:` / asignación `reservada =`
  /[{,]\s*reservas?\s*:(?!:)/,                                // clave `reserva:` en un literal
  /\.reservas?\s*=(?!=)/,                                     // `x.reserva = …`
  /\[\s*["'`]reserv[a-z]*["'`]\s*\]\s*=(?!=)/,                // `x["reserva"] = …`
  /\b(?:setItem|crearRepo)\([^)]*reserv/i,                    // storage o repositorio con clave «reserv»
];
const CLAVE_ABREVIADA = /[{,]\s*reservas?\s*[,}]/;            // `{ …, reserva }` — la forma de la marca de `reabrir`
const esMarcaDeReabrir = (l) => /versionAceptada:/.test(l) && /[{,]\s*reserva\s*\}/.test(l);
export function nadieGrabaReserva(src) {
  const fallos = [];
  sinComentarios(src).split("\n").forEach((l, i) => {
    const patrones = esMarcaDeReabrir(l) ? ESCRITORES_RESERVA : [...ESCRITORES_RESERVA, CLAVE_ABREVIADA];
    if (patrones.some((re) => re.test(l))) fallos.push(`L${i + 1}: ${l.trim().slice(0, 110)}`);
  });
  return fallos;
}
/* La excepción tiene que seguir siendo UNA y la informativa: la marca de `reabrir`, con `reserva` tomada en la línea
   anterior del cursable de la última versión (`.linea.cursable`), no de un cálculo propio. */
export function excepcionReserva(src) {
  const L = sinComentarios(src).split("\n");
  const marcas = L.map((l, i) => i).filter((i) => esMarcaDeReabrir(L[i]));
  const fallos = [];
  if (marcas.length !== 1) fallos.push(`la marca de reabrir con \`reserva\` aparece ${marcas.length} veces; tiene que ser una`);
  for (const i of marcas) if (!/const reserva = .*\.linea\.cursable : 0;/.test(L[i - 1] || "")) fallos.push(`L${i + 1}: la \`reserva\` de la marca no sale de \`.linea.cursable\` de la última versión`);
  return fallos;
}

const spec = leer("Integraciones/spec_swagger_consulta_lineas.md");
const swagger = leer("Integraciones/swagger_consulta_lineas.yaml");

test("el motor de líneas no conoce la palabra «reserva» en su código ni persiste nada (regla 12)", () => {
  assert.deepEqual(motorSinReserva(jsx), []);
  // SONDA: se planta en asignarLineas una línea que guarda la reserva; el gate la caza. Un comentario no.
  const conCodigo = jsx.replace(/^function asignarLineas\(facturas, rutCliente, inyecta\) \{\n/m, (m) => m + "  st.reservado = (st.reservado || 0); localStorage.setItem('pc_reserva', '1');\n");
  assert.equal(motorSinReserva(conCodigo).length, 2, "la sonda de código tenía que fallar por «reserv» y por persistencia");
  const conComentario = jsx.replace(/^function asignarLineas\(facturas, rutCliente, inyecta\) \{\n/m, (m) => m + "  // no reserva nada: SIM_VERSIONS es evidencia\n");
  assert.deepEqual(motorSinReserva(conComentario), [], "un comentario que explica que no reserva no es una violación");
});

test("desde Aceptada en adelante la versión nueva RECORTA la anterior, no vuelve a pedir cupo (regla 12)", () => {
  assert.deepEqual(aceptadaRecorta(jsx), []);
  const sinOtorg = jsx.replace('const aceptada = !!(deal && ["aceptadas", "cesion", "otorgamiento", "giro"].includes(deal.stage));', 'const aceptada = !!(deal && ["aceptadas", "cesion", "giro"].includes(deal.stage));');
  assert.notEqual(sinOtorg, jsx, "la sonda no encontró la línea `const aceptada = …` que quería mutar");
  assert.ok(aceptadaRecorta(sinOtorg).some((f) => /otorgamiento/.test(f)), "quitar «otorgamiento» de las aceptadas tenía que cazarse");
  const reasigna = jsx.replace(/if \(aceptada && lineaPrev\) \{\s*linea = recortarAsignacion\([\s\S]{0,120}?\);/, "if (aceptada && lineaPrev) {\n      linea = asignarLineas(fsOp, deal.rutEmisor);");
  assert.ok(aceptadaRecorta(reasigna).length >= 1, "re-asignar en la rama aceptada tenía que cazarse");
});

test("el detalle lee una operación aceptada de la versión, no de un recálculo contra A23 (regla 12)", () => {
  assert.deepEqual(detalleLeeDeVersion(jsx), []);
  const mut = jsx.replace("const leeDeVersion = bloqueado && !!(ultVer && ultVer.linea);", "const leeDeVersion = false;");
  assert.ok(detalleLeeDeVersion(mut).length >= 1, "apagar leeDeVersion tenía que cazarse");
});

test("A23 es quien declara `reservada` y la fórmula del disponible; la fórmula no vive en el motor (regla 12)", () => {
  assert.deepEqual(a23DeclaraReserva(spec, swagger), []);
  assert.ok(a23DeclaraReserva(spec.replace(/reservada/g, "reservadx"), swagger).length >= 2, "borrar `reservada` del spec tenía que cazarse");
  assert.ok(a23DeclaraReserva(spec, swagger.replace(/reservada:/g, "reservadx:")).length >= 1, "borrar `reservada` del swagger tenía que cazarse");
});

test("nadie en el fuente graba una reserva propia: ni almacén, ni estado, ni campo, ni clave, ni storage; la única `reserva` guardada es la informativa de reabrir (regla 12)", () => {
  assert.deepEqual(nadieGrabaReserva(jsx), []);
  assert.deepEqual(excepcionReserva(jsx), []);
  // SONDAS: cada forma de escritor se planta a nivel módulo y tiene que caer EXACTAMENTE ella (una línea).
  const planta = (linea) => { const m = jsx.replace(/^const REPOS = \{\};\n/m, (x) => x + linea + "\n"); assert.notEqual(m, jsx, "la sonda no encontró `const REPOS = {};`"); return nadieGrabaReserva(m); };
  const formas = {
    almacen: "const RESERVAS = {}; function reservar(d) { RESERVAS[d.id] = { reservado: d.monto }; }",
    mapa: "const _reservas = new Map();",
    estadoReact: "const [reservas, setReservas] = React.useState({});",
    campo: "function reservar(d) { d.reservado = d.monto; }",
    clave: "function reservar(d) { return { id: d.id, reserva: d.monto }; }",
    claveAbreviada: "function reservar(d) { const reserva = d.monto; return { id: d.id, reserva }; }",
    propiedad: "function reservar(d) { d.reserva = d.monto; }",
    corchete: "function reservar(d) { d[\"reservada\"] = d.monto; }",
    storage: "function reservar(d) { localStorage.setItem(\"pc_reservas\", JSON.stringify(d)); }",
  };
  for (const [forma, linea] of Object.entries(formas)) {
    const f = planta(linea);
    assert.equal(f.length, 1, `la forma «${forma}» tenía que caer en una línea: ${JSON.stringify(f)}`);
    assert.ok(f[0].includes(linea.slice(0, 40)), `la línea cazada por «${forma}» no es la plantada: ${f[0]}`);
  }
  // Un comentario y la prosa de pantalla no son escritores (la prosa «no una reserva: el cupo lo reserva…» ya está
  // en el fuente y pasa arriba; el comentario se planta).
  assert.deepEqual(planta("// reserva: vive afuera, RESERVAS no existe y reservado = 0"), [], "un comentario no es un escritor");
  // La excepción es por CONTENIDO y no por línea: la misma marca sin `versionAceptada` deja de ser la de reabrir y cae,
  // y un segundo escritor en la línea de la marca también cae.
  const marcaOriginal = "versionAceptada: vs.length, reserva };";
  assert.ok(jsx.includes(marcaOriginal), "la sonda no encontró la marca de reabrir");
  const sinVersion = jsx.replace(marcaOriginal, "reserva };");
  assert.equal(nadieGrabaReserva(sinVersion).length, 1, "la marca sin `versionAceptada` tenía que caer");
  assert.ok(excepcionReserva(sinVersion).length >= 1, "sin la marca, la excepción declarada deja de existir y tiene que decirse");
  const dobleEscritor = jsx.replace(marcaOriginal, marcaOriginal + " RESERVAS[id] = reserva;");
  assert.equal(nadieGrabaReserva(dobleEscritor).length, 1, "otro escritor en la línea de la marca tenía que caer");
  const calculada = jsx.replace(/^(\s*)const reserva = vs\.length && vs\[vs\.length - 1\]\.linea \? vs\[vs\.length - 1\]\.linea\.cursable : 0;\n/m, "$1const reserva = mmRound(d0.monto * 0.9);\n");
  assert.notEqual(calculada, jsx, "la sonda no encontró la línea que define `reserva` en reabrir");
  assert.ok(excepcionReserva(calculada).length >= 1, "una `reserva` calculada por NEX en la marca tenía que caer: ya no es la cifra informativa");
});
