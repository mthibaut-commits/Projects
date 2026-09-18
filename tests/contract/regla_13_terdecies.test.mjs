/* Gate de contrato de la regla 13-terdecies sobre el TEXTO del fuente, para lo que la suite no ve porque
   es estructura y no comportamiento: (1) `IndicadorLinea` se declara UNA vez a nivel módulo y lo dibujan
   EXACTAMENTE dos sitios —en cualquiera de sus formas: etiqueta autocerrada, etiqueta con cierre o
   `createElement`—: la columna «Línea» del tubo, dentro de un `<td>` y SIN `conOperacion`, y la cabecera
   del detalle, bajo `{fullPage &&` y CON `conOperacion`; (2) el rótulo es «Línea proyectada» y «Proyección
   post-curse» no vuelve fuera de los comentarios. La definición de «Disponible» (aprobada − utilizada) y la
   compuerta por `deal.simulado` NO se fijan acá sino en la suite (el caso de esta regla en caso.js), por
   comportamiento: atarlas al literal (`Math.round(…)`, `!!deal.simulado`) daba falso rojo en un refactor
   correcto (`mmRound`, `=== true`) sin vigilar nada que la suite no vigile. Con sondas: cada violación
   plantada la caza su gate, y lo que no es violación no lo caza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const sinComentarios = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/[^\n]*/gm, "");
const declaracionesNivelModulo = (s) => (String(s).match(/^(?:function|const|let|var|export) [A-Za-z0-9_]+/gm) || []).length;
const lineaDe = (src, i) => src.slice(0, i).split("\n").length;

/* Todo sitio que dibuja el componente, en cualquiera de sus formas: `<IndicadorLinea … />`,
   `<IndicadorLinea …>…</IndicadorLinea>` o `createElement(IndicadorLinea, {…})`. `forma` es la etiqueta de
   apertura (o la llamada), que es donde van las props; `ctx` son los 400 caracteres anteriores. */
export function usosDeIndicador(src) {
  const usos = [];
  for (const m of src.matchAll(/<IndicadorLinea\b[^>]*>/g)) usos.push({ forma: m[0], indice: m.index });
  for (const m of src.matchAll(/createElement\(\s*IndicadorLinea\b[^)]*\)?/g)) usos.push({ forma: m[0], indice: m.index });
  return usos.sort((a, b) => a.indice - b.indice)
    .map((u) => ({ ...u, linea: lineaDe(src, u.indice), ctx: src.slice(Math.max(0, u.indice - 400), u.indice) }));
}
export function indicadorUnico(src) {
  const fallos = [];
  const decl = src.match(/^function IndicadorLinea\(/gm) || [];
  if (decl.length !== 1) fallos.push(`IndicadorLinea se declara ${decl.length} veces a nivel módulo (tiene que ser 1)`);
  const usos = usosDeIndicador(src);
  if (usos.length !== 2) fallos.push(`IndicadorLinea se dibuja en ${usos.length} sitios (tienen que ser 2: tubo y cabecera del detalle) — líneas ${usos.map((u) => u.linea).join(", ")}`);
  const tubo = usos.filter((u) => /<td\b[^>]*>\s*$/.test(u.ctx));
  // `\{fullPage &&` y no `fullPage &&`: `{!fullPage && …}` también contiene `fullPage &&`, y con la condición
  // invertida la cabecera del detalle —que es la variante fullPage— se queda sin indicador.
  const cab = usos.filter((u) => /\{fullPage && \(\s*<div[^>]*>\s*$/.test(u.ctx));
  if (tubo.length !== 1) fallos.push(`no hay exactamente UN uso dentro de un <td> del tubo (${tubo.length})`);
  else if (/conOperacion/.test(tubo[0].forma)) fallos.push(`el tubo pasa conOperacion (línea ${tubo[0].linea}): la columna muestra el ESTADO de la línea, no un derivado de la oferta`);
  if (cab.length !== 1) fallos.push(`no hay exactamente UN uso en la cabecera bajo fullPage (${cab.length})`);
  else if (!/\bconOperacion\b/.test(cab[0].forma)) fallos.push(`la cabecera del detalle no pasa conOperacion (línea ${cab[0].linea})`);
  return fallos;
}
export function rotuloProyectada(src) {
  const fallos = [];
  // El helper que quita comentarios corta desde cada `/*` hasta el `*/` siguiente: un `/*` dentro de un string o
  // de un regex se llevaría código. Cota barata: las declaraciones de nivel módulo tienen que seguir todas ahí.
  if (declaracionesNivelModulo(sinComentarios(src)) !== declaracionesNivelModulo(src))
    fallos.push("sinComentarios se comió código (un `/*` dentro de un string o un regex): el gate del rótulo no es de fiar hasta arreglar el helper");
  const c = sinComentarios(src);
  if (!/Línea proyectada/.test(c)) fallos.push("no aparece el rótulo «Línea proyectada»");
  // Sin /i: lo vetado es el RÓTULO, con la mayúscula con que se escribe en pantalla. La prosa de un tooltip que lo
  // nombre en minúsculas («no es la proyección post-curse») no es el rótulo, y los comentarios cuentan su historia.
  if (/Proyección post-curse/.test(c)) fallos.push("vuelve el rótulo «Proyección post-curse», que nombraba el momento del cálculo y no lo que la celda muestra");
  return fallos;
}

test("13-terdecies · IndicadorLinea: una declaración y exactamente dos sitios de dibujo, en cualquier forma (tubo sin conOperacion dentro de un <td>; cabecera con conOperacion bajo `{fullPage &&`)", () => {
  assert.deepEqual(indicadorUnico(jsx), []);
});
test("13-terdecies · el rótulo es «Línea proyectada» y «Proyección post-curse» no vuelve fuera de los comentarios", () => {
  assert.deepEqual(rotuloProyectada(jsx), []);
});
test("13-terdecies · SONDAS: cada violación plantada la caza su gate, y lo que no es violación no lo caza", () => {
  // Cada sonda comprueba que MUTÓ algo: una sonda que no encuentra su ancla pasaría por no haber plantado nada.
  const plantar = (de, a) => { const s = jsx.replace(de, a); assert.notEqual(s, jsx, `la sonda no mutó nada: no encuentro «${String(de).slice(0, 70)}»`); return s; };
  const TUBO = "<IndicadorLinea deal={d} />", CAB = "<IndicadorLinea deal={deal} ancho={260} conOperacion />";
  // 1 · dos componentes.
  const s1 = plantar(/^function IndicadorLinea\(/m, "function IndicadorLinea(p) { return null; }\nfunction IndicadorLinea(");
  assert.ok(indicadorUnico(s1).some((f) => /declara 2 veces/.test(f)), "no cazó la segunda declaración");
  // 1b · el tubo pasa conOperacion (la proyección post-curse en la columna, que ya se probó y se revirtió).
  const s1b = plantar(TUBO, "<IndicadorLinea deal={d} conOperacion />");
  assert.ok(indicadorUnico(s1b).some((f) => /el tubo pasa conOperacion/.test(f)), "no cazó el tubo con conOperacion");
  // 1c · la cabecera sin conOperacion (el detalle dejaría de moverse con la simulación).
  const s1c = plantar(CAB, "<IndicadorLinea deal={deal} ancho={260} />");
  assert.ok(indicadorUnico(s1c).some((f) => /cabecera del detalle no pasa conOperacion/.test(f)), "no cazó la cabecera sin conOperacion");
  // 1d · un tercer sitio de dibujo, en las TRES formas en que se puede escribir.
  for (const [forma, copia] of [
    ["autocerrada", "<IndicadorLinea deal={d} />"],
    ["con cierre", "<IndicadorLinea deal={d} conOperacion></IndicadorLinea>"],
    ["createElement", "{React.createElement(IndicadorLinea, { deal: d, conOperacion: true })}"],
  ]) {
    const s = plantar(TUBO, TUBO + copia);
    assert.ok(indicadorUnico(s).some((f) => /se dibuja en 3 sitios/.test(f)), `no cazó un tercer sitio de dibujo (${forma})`);
  }
  // 1e · la cabecera bajo `!fullPage`: la variante fullPage —el detalle— se queda sin indicador.
  const s1e = jsx.replace(/\{fullPage && \(\s*<div className="shrink-0">/, '{!fullPage && (\n              <div className="shrink-0">');
  assert.notEqual(s1e, jsx, "la sonda 1e no encontró la cabecera bajo fullPage");
  assert.ok(indicadorUnico(s1e).some((f) => /cabecera bajo fullPage \(0\)/.test(f)), "no cazó la cabecera bajo !fullPage");
  // 2 · el rótulo viejo plantado COMO rótulo, fuera de comentario: sí lo caza.
  const s2 = plantar('<span style={{ color: C.sub }}>Línea proyectada</span>', '<span style={{ color: C.sub }}>Proyección post-curse</span>');
  assert.ok(rotuloProyectada(s2).some((f) => /Proyección post-curse/.test(f)), "no cazó el rótulo viejo");
  // 2b · nombrado en minúsculas en la prosa de un tooltip, o dentro de un comentario: NO es el rótulo y no lo caza.
  const s2b = plantar('title="Sesión de usuario (sólo demo)"', 'title="Sesión de usuario (sólo demo; no es la proyección post-curse)"');
  assert.deepEqual(rotuloProyectada(s2b), [], "cazó prosa en minúsculas que no es el rótulo");
  const s2c = plantar(/^function IndicadorLinea\(/m, "// antes se llamaba «Proyección post-curse»\nfunction IndicadorLinea(");
  assert.deepEqual(rotuloProyectada(s2c), [], "cazó el rótulo viejo dentro de un comentario");
  // 2d · desaparece el rótulo nuevo.
  const s2d = jsx.split("Línea proyectada").join("Línea post-curse");
  assert.notEqual(s2d, jsx);
  assert.ok(rotuloProyectada(s2d).some((f) => /no aparece el rótulo «Línea proyectada»/.test(f)), "no cazó la ausencia del rótulo nuevo");
  // 3 · el helper: un `/*` dentro de un string se lleva la declaración siguiente y el gate lo dice en vez de callar.
  const s3 = plantar(/^function IndicadorLinea\(/m, 'const SONDA_13T = "/*";\nfunction IndicadorLinea(');
  assert.ok(rotuloProyectada(s3).some((f) => /se comió código/.test(f)), "no detectó que sinComentarios se comió código");
});
