/* OTG-01 · SÓLO APRUEBA QUIEN TIENE ATRIBUCIÓN — la mitad que la suite no alcanza. `validarMutacion` (caso de la
   suite) es la puerta del CONTRATO, pero los cuatro caminos que ESCRIBEN el visado (`aprobarExc`/`revertirVisado`
   en el detalle, `setExc`/`revertirExc` en la mesa de Otorgamientos) viven dentro de componentes de React y no se
   pueden invocar desde la suite. (El quinto camino, el del SISTEMA que marca «ya no aplica» —regla 66—, no decide y
   está exento con su propia comprobación, más abajo.) Lo que sí se puede fijar es la PROPIEDAD DEL TEXTO que CLAUDE.md declara para
   OTG-01: «se comprueba la atribución antes de ESCRIBIR, no sólo al dibujar el botón». Gate: toda función que
   llame `repoVisado.set(` comprueba `puedeAprobarExc(usuario, …)` ANTES de ese `.set`, audita el intento con
   «Decisión rechazada por atribución (OTG-01)» y sale con `return`. Con sonda: se planta una copia del fuente con
   la comprobación borrada de un camino y el gate lo nombra. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico} from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
/* Una declaración de función, en las dos formas que usa el fuente: `const f = (a) => {` y `function f(a) {`.
   Con sólo la primera, un camino nuevo escrito con `function` heredaba la comprobación de su vecino (R1 de la refutación). */
const DECL = /(?:const (\w+) = (?:async )?\(([^)]*)\) => \{|(?:async )?function (\w+)\(([^)]*)\) \{)/g;

/* Los sitios que escriben el visado, con la función que los envuelve y el tramo entre la declaración y el `.set`. */
export function sitiosDeEscrituraVisado(src) {
  const sitios = [];
  const re = /repoVisado\.set\(/g;
  let m;
  while ((m = re.exec(src))) {
    let decl = null, d;
    DECL.lastIndex = 0;
    while ((d = DECL.exec(src)) && d.index < m.index) decl = d;
    const tramo = decl ? src.slice(decl.index, m.index) : "";
    sitios.push({ fn: decl ? (decl[1] || decl[3]) : "?", params: decl ? (decl[2] || decl[4] || "") : "", linea: src.slice(0, m.index).split("\n").length, tramo });
  }
  return sitios;
}
/* REGLA 66 · EL SISTEMA TAMBIÉN ESCRIBE EL VISADO, Y NO DECIDE: marca «ya no aplica desde la versión N» lo que la versión
   nueva ya no levanta (`marcarExcepcionesQueYaNoAplican`). No hay apoderado cuya atribución comprobar, así que ese camino
   queda exento —con dos condiciones que el gate SÍ comprueba: lo que escribe sale de la decisión pura
   `excepcionesQueYaNoAplican` (que sólo escribe `VISADO_NO_APLICA`) y el tramo no escribe «aprobado» ni «rechazado» por
   su cuenta. Un camino del sistema que aprobara sería OTG-01 roto con otro nombre, y el gate lo nombra. */
export function esMarcaDelSistema(s) {
  return s.fn === "marcarExcepcionesQueYaNoAplican" && /const r = excepcionesQueYaNoAplican\(/.test(s.tramo) && !/"(aprobado|rechazado)"/.test(s.tramo);
}
/* El gate en sí: los sitios donde la escritura NO viene precedida por la comprobación + auditoría + return. */
export function sitiosSinGate(src) {
  return sitiosDeEscrituraVisado(src).filter((s) => {
    if (esMarcaDelSistema(s)) return false;
    const i = s.tramo.search(/if \(!puedeAprobarExc\(usuario, /);
    if (i < 0) return true;
    const resto = s.tramo.slice(i);
    return !/registrarAuditoria\([^;]*Decisión rechazada por atribución \(OTG-01\)/.test(resto) || !/\breturn;/.test(resto);
  }).map((s) => `${s.fn} (línea ${s.linea})`);
}

test("OTG-01 · la invariante del contrato cubre aprobar y rechazar y delega en puedeAprobarExc", () => {
  const m = canonico(jsx).match(/\{codigo: "OTG-01",.*?evaluar: \(p\) => ([^}]*)\}/);
  assert.ok(m, "no se encontró la entrada OTG-01 de INVARIANTES con su evaluar");
  const entrada = m[0];
  assert.match(entrada, /mutaciones: \["excepcion\.aprobar", "excepcion\.rechazar"\]/);
  assert.match(entrada, /autoridad: "servidor"/);
  assert.match(m[1], /^puedeAprobarExc\(p\.usuario, p\.regla, p\.nivel\)/);
});

test("OTG-01 · todo camino que escribe el visado comprueba la atribución ANTES de escribir, audita y sale", () => {
  const sitios = sitiosDeEscrituraVisado(jsx);
  assert.ok(sitios.length >= 4, `se esperaban al menos los 4 caminos conocidos (detalle × 2, mesa × 2); hay ${sitios.length}`);
  const nombres = sitios.map((s) => s.fn);
  for (const f of ["aprobarExc", "revertirVisado", "setExc", "revertirExc"]) assert.ok(nombres.includes(f), `falta el camino ${f}: ${nombres.join(", ")}`);
  assert.deepEqual(sitiosSinGate(jsx), [], "caminos que escriben el visado sin comprobar la atribución antes");
});

test("OTG-01 · SONDA: borrada la comprobación de un camino, el gate lo nombra", () => {
  const sitios = sitiosDeEscrituraVisado(jsx);
  const s = sitios.find((x) => x.fn === "aprobarExc");
  assert.ok(s, "sin aprobarExc no hay dónde plantar la sonda");
  const bloque = s.tramo.match(/    if \(!puedeAprobarExc\(usuario, [\s\S]*?\n    \}\n/);
  assert.ok(bloque, "no se aisló el bloque de la comprobación en aprobarExc");
  const plantado = jsx.replace(s.tramo, s.tramo.replace(bloque[0], ""));
  assert.notEqual(plantado, jsx, "la sonda no cambió el fuente");
  const sin = sitiosSinGate(plantado);
  assert.equal(sin.length, 1, `el gate tenía que nombrar exactamente un camino: ${sin.join(" · ")}`);
  assert.match(sin[0], /^aprobarExc /);
  // y un camino NUEVO escrito con `function` (no con flecha): antes heredaba la comprobación del vecino y no se veía
  const conFuncion = jsx.replace("  const solicitarInfo = (deal, x, destId",
    '  async function forzarVisado(deal, k, val) {\n    const st = { ...(repoVisado.get(deal.id) || {}), [k]: val };\n    await repoVisado.set(deal.id, st);\n  }\n  const solicitarInfo = (deal, x, destId');
  assert.notEqual(conFuncion, jsx, "la sonda del camino con `function` no cambió el fuente");
  const sinF = sitiosSinGate(conFuncion);
  assert.equal(sinF.length, 1, `el camino con \`function\` tenía que salir solo: ${sinF.join(" · ")}`);
  assert.match(sinF[0], /^forzarVisado /);
  // y la otra forma de saltárselo: dejar la comprobación pero sin el `return` (audita y escribe igual)
  const sinReturn = jsx.replace(s.tramo, s.tramo.replace(bloque[0], bloque[0].replace(/\n      return;\n/, "\n")));
  assert.notEqual(sinReturn, jsx);
  assert.match(sitiosSinGate(sinReturn).join(" · "), /aprobarExc/);
});

test("OTG-01 · SONDA regla 66: el camino del sistema está exento sólo mientras se limite a marcar; si aprueba, el gate lo nombra", () => {
  assert.ok(sitiosDeEscrituraVisado(jsx).some(esMarcaDelSistema), "no se encontró el camino del sistema (regla 66)");
  const plantado = jsx.replace("  if (!r.salen.length) return [];\n  repoSolicitudExc.set(deal.id, r.sol);", '  if (!r.salen.length) return [];\n  r.st[r.salen[0].stKey] = "aprobado";\n  repoSolicitudExc.set(deal.id, r.sol);');
  assert.notEqual(plantado, jsx, "la sonda no cambió el fuente");
  const sin = sitiosSinGate(plantado);
  assert.equal(sin.length, 1, `el gate tenía que nombrar exactamente el camino del sistema: ${sin.join(" · ")}`);
  assert.match(sin[0], /^marcarExcepcionesQueYaNoAplican /);
});

/* La comprobación de OTG-01 se pegó copiada en los dos caminos de REVERSIÓN con identificadores que esas funciones
   no recibían —`revertirVisado(x)` usaba `val` y `revertirExc(deal, k)` usaba `x`—, así que revertir un visado
   reventaba con ReferenceError antes de escribir (fallaba cerrado, pero rota). Lo destapó este gate el 17-09-2026 y
   se corrigió en el mismo commit. Cada identificador que el tramo usa tiene que ser parámetro de la función. */
test("OTG-01 · cada camino usa sólo identificadores que recibe: la comprobación pegada no puede reventar con ReferenceError", () => {
  const fallas = [];
  for (const s of sitiosDeEscrituraVisado(jsx)) {
    const params = s.params.split(",").map((p) => p.trim().replace(/=.*$/, "")).filter(Boolean);
    for (const id of ["x", "val"]) {
      const usa = new RegExp(`(?<![\\w.])${id}(?:\\.|\\s*===)`).test(s.tramo);
      if (usa && !params.includes(id)) fallas.push(`${s.fn} (línea ${s.linea}) usa \`${id}\` y sus parámetros son (${s.params})`);
    }
  }
  assert.deepEqual(fallas, []);
});
