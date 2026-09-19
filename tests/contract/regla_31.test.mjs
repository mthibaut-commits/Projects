/* Gate de contrato de la regla 31 · MODO DIRECTORIO, la mitad que es una PROPIEDAD DEL TEXTO del fuente:
   «BLOQUE DESECHABLE: todo vive en una sección propia del fuente y en enganches marcados con la palabra
   `DIRECTORIO`; nada más del pipeline lo conoce y nada persiste; determinista, sin sorteo». Se fija:
   (1) el bloque existe, delimitado por sus dos rótulos, y sus tres símbolos de nivel módulo
       (`DIRECTORIO_PERFIL`, `construirDirectorio`, `ToggleDirectorio`) se declaran UNA vez y SÓLO adentro;
   (2) fuera del bloque, toda línea de CÓDIGO que nombre al modo (el estado `directorio`, `setDirectorio`,
       la marca `_directorio`, `construirDirectorio`, `ToggleDirectorio`, `DIRECTORIO_PERFIL`) está a lo más
       a VENTANA líneas después de una marca `DIRECTORIO` — es lo que hace que retirarlo sea un grep—, y hay
       al menos cinco marcas (la regla enumera cinco enganches);
   (3) dentro del bloque no hay `Math.random` (determinista) ni `localStorage`/`sessionStorage` (nada persiste),
       y en todo el fuente no existe una clave `pc_directorio`.
   Con SONDA NEGATIVA: un `Math.random()` y un `localStorage` plantados en el bloque, una referencia a
   `directorio` plantada lejos de toda marca y una segunda declaración de `construirDirectorio` fuera del
   bloque se detectan. Modelo: tests/contract/fuente.test.mjs. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const INICIO = /MODO DIRECTORIO · demo acotada/, FIN = /fin del bloque MODO DIRECTORIO/;
const SIMBOLOS = ["DIRECTORIO_PERFIL", "construirDirectorio", "ToggleDirectorio"];
const REF = /\bdirectorio\b|_directorio|setDirectorio|construirDirectorio|ToggleDirectorio|DIRECTORIO_PERFIL/;
const VENTANA = 20;   // era 8 hasta el 18-09-2026: el formateo (ADR-0005) abre cada enganche en varias
                      // líneas, así que la misma distancia lógica ocupa más. Lo que la regla fija —que
                      // retirar el modo sea un grep— no cambió; cambió el largo del código, no su forma.

/* Límites del bloque (índices de línea, base 0) o null si falta un rótulo. */
export function bloqueDirectorio(src) {
  const L = src.split("\n");
  const a = L.findIndex((l) => INICIO.test(l)), b = L.findIndex((l) => FIN.test(l));
  return a >= 0 && b > a ? { a, b, L } : null;
}
/* (1) Dónde se declara cada símbolo del bloque: líneas (base 1) dentro y fuera. */
export function declaracionesDirectorio(src) {
  const bl = bloqueDirectorio(src);
  if (!bl) return null;
  const out = {};
  for (const s of SIMBOLOS) {
    const re = new RegExp("^(?:function|const|let|var) " + s + "\\b");
    const donde = bl.L.map((l, i) => (re.test(l) ? i : -1)).filter((i) => i >= 0);
    out[s] = { dentro: donde.filter((i) => i > bl.a && i < bl.b).map((i) => i + 1), fuera: donde.filter((i) => i <= bl.a || i >= bl.b).map((i) => i + 1) };
  }
  return out;
}
/* (2) Fuera del bloque: líneas de código que nombran al modo sin una marca DIRECTORIO en las VENTANA
   líneas anteriores (o en la misma), y cuántas marcas hay. Se saltan las líneas de prosa (comentario). */
export function enganchesSinMarca(src, ventana = VENTANA) {
  const bl = bloqueDirectorio(src);
  if (!bl) return null;
  const { a, b, L } = bl;
  const esMarca = (l) => /DIRECTORIO/.test(l);
  const sinMarca = [], marcas = [];
  for (let i = 0; i < L.length; i++) {
    if (i >= a && i <= b) continue;
    if (esMarca(L[i])) marcas.push(i + 1);
    const t = L[i].trim();
    if (!REF.test(L[i]) || /^(\/\/|\/\*|\*)/.test(t)) continue;
    let ok = false;
    for (let j = Math.max(0, i - ventana); j <= i; j++) if (esMarca(L[j])) { ok = true; break; }
    if (!ok) sinMarca.push(`${i + 1}: ${t.slice(0, 80)}`);
  }
  return { sinMarca, marcas };
}
/* (3) Sorteo y persistencia dentro del bloque; clave de storage en todo el fuente. */
export function impurezasDirectorio(src) {
  const bl = bloqueDirectorio(src);
  if (!bl) return null;
  const cuerpo = bl.L.slice(bl.a, bl.b + 1).join("\n");
  const f = [];
  if (/Math\.random/.test(cuerpo)) f.push("Math.random dentro del bloque: el elenco tiene que ser determinista");
  if (/localStorage|sessionStorage/.test(cuerpo)) f.push("storage dentro del bloque: nada persiste, al recargar el tubo vuelve completo");
  if (/pc_directorio/.test(src)) f.push("existe una clave `pc_directorio` en el fuente");
  return f;
}

test("el bloque MODO DIRECTORIO existe y sus tres símbolos se declaran una vez y sólo adentro", () => {
  const d = declaracionesDirectorio(jsx);
  assert.ok(d, "faltan los rótulos «MODO DIRECTORIO · demo acotada» / «fin del bloque MODO DIRECTORIO»");
  for (const s of SIMBOLOS) {
    assert.deepEqual(d[s].fuera, [], `${s} está declarado FUERA del bloque desechable (líneas ${d[s].fuera.join(",")})`);
    assert.equal(d[s].dentro.length, 1, `${s} tiene que declararse exactamente una vez dentro del bloque; hay ${d[s].dentro.length}`);
  }
});

test("fuera del bloque, todo enganche del modo va marcado con DIRECTORIO (≥ 5 marcas) — retirarlo es un grep", () => {
  const e = enganchesSinMarca(jsx);
  assert.ok(e, "no hay bloque");
  assert.ok(e.marcas.length >= 5, `la regla enumera cinco enganches marcados; hay ${e.marcas.length} marcas fuera del bloque`);
  assert.deepEqual(e.sinMarca, [], "línea de código que nombra al modo Directorio sin una marca DIRECTORIO a ≤ " + VENTANA + " líneas");
});

test("dentro del bloque no hay sorteo ni storage, y no existe la clave pc_directorio", () => {
  assert.deepEqual(impurezasDirectorio(jsx), []);
});

test("sonda negativa: Math.random y localStorage en el bloque, un enganche sin marca y una declaración fuera se detectan", () => {
  const bl = bloqueDirectorio(jsx);
  const L = jsx.split("\n");
  // (a) sorteo y storage plantados dentro del bloque
  const conRandom = [...L]; conRandom.splice(bl.a + 1, 0, "  const sorteo = Math.random(); localStorage.setItem('pc_directorio', '1');");
  const imp = impurezasDirectorio(conRandom.join("\n"));
  assert.equal(imp.length, 3, `tenía que detectar sorteo, storage y clave: ${JSON.stringify(imp)}`);
  // (b) un enganche plantado lejos de toda marca: 200 líneas después del fin del bloque, sin comentario alguno
  const lejos = [...L]; lejos.splice(bl.b + 200, 0, "  if (directorio) setDeals((p) => p.filter((d) => !d._directorio));");
  const e = enganchesSinMarca(lejos.join("\n"));
  assert.equal(e.sinMarca.length, 1, `tenía que cazar exactamente el enganche plantado: ${JSON.stringify(e.sinMarca)}`);
  assert.match(e.sinMarca[0], /^\d+: if \(directorio\)/);
  // …y el mismo enganche CON su marca dos líneas antes pasa
  const marcado = [...L]; marcado.splice(bl.b + 200, 0, "  // DIRECTORIO: enganche de prueba", "  if (directorio) setDeals((p) => p.filter((d) => !d._directorio));");
  assert.deepEqual(enganchesSinMarca(marcado.join("\n")).sinMarca, []);
  // (c) una segunda declaración de construirDirectorio fuera del bloque
  const d = declaracionesDirectorio(jsx + "\nfunction construirDirectorio() {}\n");
  assert.equal(d.construirDirectorio.fuera.length, 1);
  assert.equal(d.construirDirectorio.dentro.length, 1);
  // (d) sin rótulo de cierre no hay bloque
  assert.equal(bloqueDirectorio(jsx.replace(FIN, "fin del bloque")), null);
});
