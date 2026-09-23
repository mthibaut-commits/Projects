/* Gate de contrato de la regla 78 (la pérdida por cesión a la competencia es un HECHO del A2, ADR-0023), sobre el TEXTO
   del fuente.

   `evaluarPerdidas` es lo único que el cron corre para detectar pérdidas, y la perdía con `rndDetBool(aec|id, 0.12)`: el
   12 % de las oportunidades de un cedente que alguna vez cedió afuera se perdía por sorteo, sin que ninguna de sus
   facturas estuviera cedida. La versión que sí miraba las facturas contra el A2 vivía en `avanzarPipeline`, un motor
   por timer que nadie llama —`avanzarRef` lo guarda y ningún sitio lo invoca—.

   `avanzarPipeline` NO se retiró con esta regla, y a propósito: el gate de la regla 48 vigila sobre su texto la rama
   «otorgamiento → Pendiente Integración», que no existe en ningún código vivo —lo que corre es un efecto que gira sin
   mirar VER-01—. Retirarlo obliga a llevar esa rama al efecto vivo, que es un cambio T1 sobre el flujo del giro y queda
   como decisión del usuario (tablero, 23-09-2026). Por eso este gate no exige su ausencia: exige que el CRON decida con
   el A2.

   La decisión pura (`perdidaPorCesion`) la prueba el caso 174. Lo que la suite no ve es que el CRON la use: eso vive
   dentro del componente raíz y se vigila acá, con sonda. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El cuerpo de `evaluarPerdidas` en la forma canónica: desde su declaración hasta la del cron que la llama. */
export function cuerpoEvaluarPerdidas(can) {
  const i = can.indexOf("const evaluarPerdidas = () => {");
  const j = i < 0 ? -1 : can.indexOf("const tickCron = () => {", i);
  return i < 0 || j < 0 ? "" : can.slice(i, j);
}

export function auditarRegla78(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · La decisión es pura, de nivel módulo, y se apoya en las cesiones del A2.
  if (!/^function perdidaPorCesion\(deal, ced = cesionesAjenasDeDeal\(deal\)\) \{/m.test(src))
    fallos.push("no existe `perdidaPorCesion(deal, ced = cesionesAjenasDeDeal(deal))` de nivel módulo: la decisión tiene que ser pura y leer el A2");
  // 2 · El cron decide con ella y no sortea.
  const ev = cuerpoEvaluarPerdidas(can);
  if (!ev) fallos.push("no encuentro `evaluarPerdidas` antes de `tickCron`");
  else {
    if (!ev.includes("const dec = perdidaPorCesion(d);")) fallos.push("`evaluarPerdidas` no decide la pérdida por cesión con `perdidaPorCesion`");
    if (/rndDetBool\(`aec\|/.test(ev)) fallos.push("vuelve el sorteo del 12 % (`rndDetBool(aec|…)`): la cesión a otro factoring es un hecho del A2");
    if (/aecCompetidorDe\(d\)|competidorDe\(d\)/.test(ev)) fallos.push("`evaluarPerdidas` vuelve a nombrar al competidor por el historial del cedente o por hash, y no por las facturas de la oferta");
    if (!ev.includes("cedidasOtro: dec.n")) fallos.push("una cesión PARCIAL ya no se anota (`cedidasOtro`): la oferta sigue, pero el tubo tiene que decirlo");
  }
  if (!can.includes("if (r.enVentana) correrProceso();") || !can.includes("evaluarPerdidas();")) fallos.push("el cron ya no evalúa las pérdidas");
  return fallos;
}

test("regla 78: la pérdida por cesión la decide el A2 en `evaluarPerdidas`, sin sorteo", () => {
  assert.deepEqual(auditarRegla78(jsx), []);
});

const MUTANTES = [
  ["vuelve el sorteo", (s) => s.replace("const dec = perdidaPorCesion(d);", "const dec = perdidaPorCesion(d);\n        if (rndDetBool(`aec|${d.id}`, 0.12)) {}"), /sorteo del 12/],
  ["el cron deja de usar la decisión", (s) => s.replace("const dec = perdidaPorCesion(d);", "const dec = { pierde: false, n: 0 };"), /no decide la pérdida/],
  ["la decisión deja de leer el A2", (s) => s.replace("function perdidaPorCesion(deal, ced = cesionesAjenasDeDeal(deal)) {", "function perdidaPorCesion(deal, ced = { n: 0 }) {"), /pura y leer el A2/],
  ["el cron vuelve a nombrar al competidor por hash", (s) => s.replace("const dec = perdidaPorCesion(d);", "const dec = perdidaPorCesion(d);\n        const comp = competidorDe(d);"), /por hash/],
];

test("sonda negativa: el sorteo, la decisión desconectada y el competidor por hash se cazan", () => {
  for (const [nombre, mutar, espera] of MUTANTES) {
    const mutado = mutar(jsx);
    assert.notEqual(mutado, jsx, `el mutante «${nombre}» no cambió nada: su ancla ya no está en el fuente`);
    const f = auditarRegla78(mutado);
    assert.ok(f.some((x) => espera.test(x)), `el mutante «${nombre}» no se cazó: ${JSON.stringify(f)}`);
  }
});
