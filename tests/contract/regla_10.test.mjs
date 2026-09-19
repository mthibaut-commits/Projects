/* Gate de contrato de la regla 10 (contactabilidad) sobre el TEXTO del fuente: un SNAPSHOT, no una regla.
   El «hasta 3» real de la regla vive en `iniciarContacto`, clausura de `PipelineComercial` (`reintentosNoResp`,
   `Intento N/3 sin respuesta`, `reint >= 3`): no es función de nivel módulo, ninguna suite puede llamarla, y la
   pantalla no ofrece ancla porque ningún generador escribe `contactable: false` (la rama no se alcanza en la
   demo). Lo que se fija acá es la ESTRUCTURA que sostiene el tope:
   (1) existe, es UN solo número —el contador `reint >= N`, la glosa `Intento ${reint}/N` y el evento de cierre
       «no respondió en N intentos» dicen el mismo N— y los tres viven DENTRO de la rama `eraNoVerif`, sin otro
       contador afuera;
   (2) responder lo reinicia (`reintentosNoResp: 0` en la rama `exito` que precede a `eraNoVerif`) y agotarlo
       también (vuelve a NO VERIFICADO con el contador en 0).
   SNAPSHOT: `TOPE_REINTENTOS = 3`. Actualizarlo es la decisión de cambiar el «hasta 3» de la regla 10 y va al
   commit junto con el texto de la regla; no es un trámite.
   DESFASE regla↔código que este gate NO afirma (defecto de código, va al tablero): `eraNoVerif` exige
   `contactable === false` y la rama corre cuando `!exito`, o sea cuenta hasta 3 intentos cuyos mensajes quedaron
   «fallido» (= NO entregado: `est = exito ? "read" : "fallido"`), que según la cláusula (i) admiten UN solo
   intento; y la UI sólo exige re-editar el dato para el PRIMER reintento (`modificado` lee `contactoModificado`,
   que un reintento fallido no limpia). La regla sobre las funciones puras la fija el caso de la suite. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
export const TOPE_REINTENTOS = 3; // snapshot: el «hasta 3» de la regla 10 tal como lo escribe iniciarContacto
export const ANCLA = "const iniciarContacto = (id, canal, template, reiniciar) => {";
const sinComentarios = (s) => String(s).replace(/^\s*\/\/[^\n]*/gm, "");
const lineaDe = (src, idx) => src.slice(0, idx).split("\n").length;

/* Bloque entre llaves que abre en `desde` (índice del `{`), contando llaves. El cuerpo no tiene llaves sueltas
   en cadenas y los `${}` de los template literals van balanceados; si eso cambia, el gate falla en voz alta. */
export function bloqueLlaves(texto, desde) {
  if (desde < 0 || texto[desde] !== "{") return null;
  let n = 0;
  for (let i = desde; i < texto.length; i++) {
    if (texto[i] === "{") n++;
    else if (texto[i] === "}" && --n === 0) return texto.slice(desde, i + 1);
  }
  return null;
}
/* Cuerpo de `iniciarContacto` (sin comentarios de línea) y la línea del ancla en el fuente original. */
export function cuerpoIniciarContacto(src) {
  const i = src.indexOf(ANCLA);
  if (i < 0 || src.indexOf(ANCLA, i + 1) >= 0) return null;
  const cuerpo = bloqueLlaves(src, i + ANCLA.length - 1);
  return cuerpo ? { texto: sinComentarios(cuerpo), linea: lineaDe(src, i) } : null;
}
/* El tope medido en los tres sitios de la rama `eraNoVerif` (fallos de estructura) y el reinicio del contador
   (fallosReinicio), separados para que cada test diga qué se rompió. */
export function topeReintentos(src) {
  const fallos = [], fallosReinicio = [];
  const b = cuerpoIniciarContacto(src);
  if (!b) return { fallos: [`no encuentro (una sola vez) \`${ANCLA}\` con un cuerpo cerrado`], fallosReinicio, topes: null };
  const c = b.texto;
  if (!/const eraNoVerif = d\.contactable === false && !d\.telValidado && !d\.emailValidado && !d\.verifManual;/.test(c))
    fallos.push("cambió la definición de `eraNoVerif` (contactable === false y sin validar): revisar el gate junto con la regla");
  const j = c.indexOf("else if (eraNoVerif) {");
  const rama = j < 0 ? null : bloqueLlaves(c, j + "else if (eraNoVerif) ".length);
  if (!rama) { fallos.push("no encuentro la rama `else if (eraNoVerif) {…}` en iniciarContacto"); return { fallos, fallosReinicio, topes: null, linea: b.linea }; }
  const num = (re, que) => { const m = rama.match(re); if (!m) fallos.push(`la rama eraNoVerif ya no tiene ${que}`); return m ? +m[1] : null; };
  const topes = {
    contador: num(/\breint >= (\d+)\b/, "el contador `reint >= N`"),
    glosa: num(/Intento \$\{reint\}\/(\d+) sin respuesta/, "la glosa `Intento ${reint}/N sin respuesta`"),
    cierre: num(/no respondió en (\d+) intentos/, "el evento de cierre «no respondió en N intentos»"),
  };
  const vals = Object.values(topes).filter((v) => v != null);
  if (vals.length === 3 && new Set(vals).size !== 1) fallos.push(`el tope no es uno solo: contador ${topes.contador}, glosa ${topes.glosa}, cierre ${topes.cierre}`);
  // Fuera de la rama no puede quedar otro contador ni otra glosa: sería un segundo «hasta N» que este gate no mide.
  if (/\breint >= \d+|Intento \$\{reint\}\/\d+|no respondió en \d+ intentos/.test(c.replace(rama, ""))) fallos.push("hay un contador o una glosa de reintentos FUERA de la rama eraNoVerif");
  // Reinicio: la rama `if (exito) {…}` inmediatamente anterior pone el contador en 0, y agotar el tope también.
  const k = c.lastIndexOf("if (exito) {", j);
  const ramaExito = k < 0 ? null : bloqueLlaves(c, k + "if (exito) ".length);
  if (!ramaExito || !/reintentosNoResp: 0/.test(ramaExito)) fallosReinicio.push("responder ya no reinicia el contador (`reintentosNoResp: 0` en la rama exito que precede a eraNoVerif)");
  if (!/if \(reint >= \d+\) \{[\s\S]{0,600}?reintentosNoResp: 0/.test(rama)) fallosReinicio.push("agotar el tope ya no reinicia el contador (la rama `reint >= N` tiene que dejar reintentosNoResp: 0)");
  return { fallos, fallosReinicio, topes, linea: b.linea };
}

test("10 · (1) el «hasta 3» de iniciarContacto es UN solo tope —contador, glosa y cierre dicen el mismo número— y vive dentro de la rama eraNoVerif (snapshot TOPE_REINTENTOS)", () => {
  const r = topeReintentos(jsx);
  assert.deepEqual(r.fallos, []);
  assert.deepEqual(r.topes, { contador: TOPE_REINTENTOS, glosa: TOPE_REINTENTOS, cierre: TOPE_REINTENTOS },
    "cambió el tope: actualizar TOPE_REINTENTOS es cambiar el «hasta 3» de la regla 10 y va al commit con el texto de la regla");
});

test("10 · (2) responder reinicia el contador de reintentos, y agotar el tope también (vuelve a NO VERIFICADO con reintentosNoResp: 0)", () => {
  assert.deepEqual(topeReintentos(jsx).fallosReinicio, []);
});

test("sonda negativa: un tope distinto en el contador, la glosa cambiada o duplicada fuera de la rama, el reinicio borrado, eraNoVerif redefinido y la función ausente se detectan", () => {
  const planta = (de, a) => { const p = jsx.replace(de, a); assert.notEqual(p, jsx, `la sonda no encontró «${de.slice(0, 60)}»`); return p; };
  const a = topeReintentos(planta("if (reint >= 3) {", "if (reint >= 5) {"));
  assert.ok(a.fallos.some((f) => /no es uno solo/.test(f)) && a.topes.contador === 5, "no cazó el contador en 5 con la glosa en 3");
  const b = topeReintentos(planta("Intento ${reint}/3 sin respuesta del cliente", "Sin respuesta (${reint})"));
  assert.ok(b.fallos.some((f) => /ya no tiene la glosa/.test(f)), "no cazó la glosa cambiada");
  const c = topeReintentos(planta("      const stageNuevo = canal === \"WhatsApp\"", "      hist.push({ resultado: `Intento ${reint}/3 sin respuesta del cliente` });\n      const stageNuevo = canal === \"WhatsApp\""));
  assert.ok(c.fallos.some((f) => /FUERA de la rama/.test(f)), "no cazó la glosa duplicada fuera de la rama");
  const d = topeReintentos(planta("verifFields = { contactoModificado: false, reintentosNoResp: 0 }; // respondió", "verifFields = { contactoModificado: false }; // respondió"));
  assert.ok(d.fallosReinicio.some((f) => /responder ya no reinicia/.test(f)), "no cazó el reinicio borrado al responder");
  const e = topeReintentos(planta("const eraNoVerif = d.contactable === false &&", "const eraNoVerif = d.contactable !== true &&"));
  assert.ok(e.fallos.some((f) => /definición de `eraNoVerif`/.test(f)), "no cazó eraNoVerif redefinido");
  const f = topeReintentos(planta(ANCLA, "const iniciarContactoV2 = (id, canal, template, reiniciar) => {"));
  assert.ok(f.fallos.some((x) => /no encuentro/.test(x)) && f.topes === null, "no cazó la función ausente");
});
