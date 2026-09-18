/* Cablea los dos auditores propios del repo como gates. Ninguno de los dos es un gate por sí mismo:
   producen un inventario y salen con 0. Lo que se fija acá es una LÍNEA BASE —los hallazgos conocidos,
   como literal— y dos reglas:

     · auditar_muerto: el conjunto de hallazgos es EXACTAMENTE el conocido. Uno nuevo rompe (código muerto
       que alguien dejó, o un falso positivo nuevo: en los dos casos hay que mirar). Uno que desaparece
       también rompe, a propósito: encoger la línea base es una decisión que queda en el commit.
       Y la sección D (clases del <style>) tiene que decir «ninguna» en los dos sentidos: es una REGLA.
     · auditar_aislamiento: lo que se desacopló no se vuelve a acoplar. Las funciones que hoy no leen
       nada global tienen que seguir sin leerlo; que se sume una nueva es bienvenido y no rompe.

   Cada auditor se lanza UNA vez por archivo (6,5 s y 1 s). */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { RAIZ } from "./_comun.mjs";

/* Hallazgos conocidos de auditar_muerto al 17-09-2026. «Vivos sólo entre ellos» y «sólo en scripts»
   son para REVISAR A MANO, no para borrar a ciegas: el propio auditor lo dice. */
/* 17-09-2026: sale `lineaDeVersion`. No se borró ni se cableó: el caso 124 (regla 14) la llama por su nombre para
   fijar que el detalle LEE la versión vigente y no recalcula, así que deja de estar «viva sólo entre muertos». Encoger
   esta línea base es la decisión de haber agregado ese caso, y va dicha en el commit. */
export const BASE_MUERTOS = ["CLIENTE_ESTADOS", "ChipCond", "MarcaNuevo", "PESO_COL", "giroDeal", "porcionLabel"];
export const BASE_USESTATE = ["alertF", "channel", "dealTabInicial", "diaModal", "reevTick", "spreadDeudor", "vencDias"];
/* Funciones que auditar_aislamiento declara «nada global» al 17-09-2026 (39). */
export const BASE_PURAS = [
  "evalReglaCli", "deudorBlock", "nivelExigido", "pisoPorMonto", "esReglaDeudor", "verifDecision", "verifEvaluar",
  "causasVerif", "claveVeredicto", "facturasDeudorEnDeal", "reemplazoVigente", "validarSimCfg", "parseFormula",
  "evalFormula", "varsDeFormula", "tokenizarFormula", "sowEstado", "calcularOferta", "tasaMinIA", "prorratearOperacion",
  "prorratearConcepto", "difPrecioDoc", "valorPresenteDoc", "plazoEquivalente", "tasaEquivalente", "asignarGiros",
  "giroCalifica", "recortarAsignacion", "lineaDeDeudor", "tipoLineaDeDeudor", "dispDeudor", "spreadMinDeudor",
  "notaFromScore", "scoreDeudor", "tramoNota", "catShares", "catDeal", "catDisp", "aprobacionFormalCliente",
];

export function parsearMuerto(txt) {
  const out = { hallazgos: [], useState: [], clasesSinUso: null, clasesSinDeclarar: null };
  let seccion = "";
  for (const l of txt.split("\n")) {
    const h = l.match(/^── (.+?) ─{3,}/);
    if (h) { seccion = h[1]; continue; }
    if (/^B ·/.test(seccion)) { const m = l.match(/^\s+\d+\s+(\w+) \/ set\w+\s+/); if (m) out.useState.push(m[1]); continue; }
    if (/^C ·/.test(seccion)) continue;
    if (/^D ·/.test(seccion)) {
      const su = l.match(/declaradas y NO usadas: (.+)$/); if (su) out.clasesSinUso = su[1].trim();
      const sd = l.match(/usadas y NO declaradas: (.+?)(?:\s+←.*)?$/); if (sd) out.clasesSinDeclarar = sd[1].trim();
      continue;
    }
    const m = l.match(/^\s+\d+\s+(\w+)\s+cod=\d+/);
    if (m) out.hallazgos.push({ simbolo: m[1], seccion });
  }
  return out;
}

export const parsearAislamiento = (txt) => [...txt.matchAll(/^\s+✓ (\w+)/gm)].map((m) => m[1]);

export function compararBase(base, actual) {
  const b = new Set(base), a = new Set(actual);
  return { nuevos: [...a].filter((x) => !b.has(x)).sort(), desaparecidos: [...b].filter((x) => !a.has(x)).sort() };
}

const correr = (script) => {
  const r = spawnSync(process.execPath, [script], { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, `${script} salió con ${r.status}: ${(r.stderr || "").slice(0, 400)}`);
  return r.stdout;
};

const muerto = parsearMuerto(correr("auditar_muerto.mjs"));
const puras = parsearAislamiento(correr("auditar_aislamiento.mjs"));

test("auditar_muerto: los hallazgos son exactamente los conocidos (línea base)", () => {
  const { nuevos, desaparecidos } = compararBase(BASE_MUERTOS, muerto.hallazgos.map((h) => h.simbolo));
  const seccionDe = (s) => muerto.hallazgos.find((h) => h.simbolo === s)?.seccion;
  assert.deepEqual(nuevos, [], `hallazgos NUEVOS del auditor: ${nuevos.map((s) => `${s} (${seccionDe(s)})`).join(", ")} — código muerto que alguien dejó o un falso positivo nuevo; en los dos casos hay que mirar antes de tocar BASE_MUERTOS`);
  assert.deepEqual(desaparecidos, [], `estos hallazgos ya no aparecen: ${desaparecidos.join(", ")} — si se borraron o se cablearon a propósito, encoge BASE_MUERTOS en este archivo y dilo en el commit`);
});

test("auditar_muerto: los useState sin uso son exactamente los conocidos (línea base)", () => {
  const { nuevos, desaparecidos } = compararBase(BASE_USESTATE, muerto.useState);
  assert.deepEqual(nuevos, [], `useState nuevos que nadie lee o nadie escribe: ${nuevos.join(", ")}`);
  assert.deepEqual(desaparecidos, [], `useState que ya no figuran: ${desaparecidos.join(", ")} — encoge BASE_USESTATE y dilo en el commit`);
});

test("auditar_muerto: ninguna clase propia del <style> usada sin declarar ni declarada sin uso (regla)", () => {
  assert.equal(muerto.clasesSinDeclarar, "ninguna", `clases usadas y NO declaradas: ${muerto.clasesSinDeclarar} (el caso t14: el elemento hereda el tamaño del padre, sin error)`);
  assert.equal(muerto.clasesSinUso, "ninguna", `clases declaradas y NO usadas: ${muerto.clasesSinUso}`);
});

test("auditar_aislamiento: lo que se desacopló no se vuelve a acoplar (las puras siguen puras)", () => {
  const { nuevos, desaparecidos } = compararBase(BASE_PURAS, puras);
  assert.deepEqual(desaparecidos, [], `funciones que eran puras y ahora leen algo global: ${desaparecidos.join(", ")} — el motor tiene que recibir por parámetro lo que decide (regla 4 del otorgamiento)`);
  if (nuevos.length) console.log(`  (info) funciones que ahora son puras y no están en BASE_PURAS: ${nuevos.join(", ")} — súmalas cuando quieras protegerlas`);
});

test("sonda negativa: un hallazgo plantado, una t16 y una pura que se acopla se detectan", () => {
  const plantado = parsearMuerto("── SIN NINGUNA REFERENCIA — borrar (1) ────────\n   12   fantasma   cod=0    com=0\n\n── D · clases propias del <style> (16 declaradas) ────────\n   declaradas y NO usadas: ninguna\n   usadas y NO declaradas: t16  ← el caso t14\n");
  assert.deepEqual(plantado.hallazgos, [{ simbolo: "fantasma", seccion: "SIN NINGUNA REFERENCIA — borrar (1)" }]);
  assert.equal(plantado.clasesSinDeclarar, "t16");
  assert.deepEqual(compararBase(BASE_MUERTOS, [...BASE_MUERTOS, "fantasma"]).nuevos, ["fantasma"]);
  assert.deepEqual(compararBase(BASE_PURAS, BASE_PURAS.filter((f) => f !== "verifDecision")).desaparecidos, ["verifDecision"]);
  assert.deepEqual(parsearAislamiento("  ✓ a   1  nada global\n  ✗ b   2  TENANT\n  ✓ c   3  nada global\n"), ["a", "c"]);
});
