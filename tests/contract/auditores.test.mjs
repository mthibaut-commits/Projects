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
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./_comun.mjs";

/* Hallazgos conocidos de auditar_muerto. «Vivos sólo entre ellos» y «sólo en scripts» son para REVISAR A
   MANO, no para borrar a ciegas: el propio auditor lo dice. */
/* 17-09-2026: sale `lineaDeVersion`. No se borró ni se cableó: el caso 124 (regla 14) la llama por su nombre para
   fijar que el detalle LEE la versión vigente y no recalcula, así que deja de estar «viva sólo entre muertos». Encoger
   esta línea base es la decisión de haber agregado ese caso, y va dicha en el commit. */
/* 18-09-2026: bajan CINCO de seis, y ninguno se borró — se revisaron uno por uno, que es lo que esta lista pide.
   · `PESO_COL`, `ChipCond`, `MarcaNuevo` y `porcionLabel`: un SOLO falso positivo con cuatro caras. `PESO_COL` es un
     `const` LOCAL de `TablaOportunidades` escrito a columna 0 —las llaves mandan, no la sangría—, así que el auditor
     lo tomaba por declaración de nivel módulo y le atribuía las ~300 líneas siguientes; todo lo que esas líneas
     usaban salía «vivo sólo entre muertos». Se indentó el `const` y los cuatro desaparecieron.
   · `CLIENTE_ESTADOS`: era un catálogo vivo sólo por su test —`estadoCliente` repetía los cuatro nombres como
     literales—. Ahora los LEE del catálogo, así que gobierna algo y la duplicación no puede desfasarse.
   Queda `giroDeal`. Hasta el 19-09-2026 era un HALLAZGO DE PRODUCTO: era el único lector de `GIRO_STATE`, que no
   tenía escritor (`repoGiro` sólo se hidrataba), así que «la asignación congelada manda sobre el recálculo del día»
   estaba probada por la suite con un estado INYECTADO y no ocurría en ninguna pantalla. Eso YA NO ES CIERTO y la
   pregunta que la nota dejaba abierta —¿congela al aceptar, al firmar?— está contestada: congela en la INYECCIÓN a
   Tesorería (regla 43). `aprobarIntegracion` escribe `GIRO_STATE` y el congelado se lee en pantalla, pero por
   `giroResumenDeal` a través de `giroCongelado`, que es la única fuente del «gana el congelado» (caso 148).
   `giroDeal` sigue sin call site, y ahora por otro motivo: devuelve la MISMA forma que `giroResumenDeal` pero su
   rama viva calcula sin el prorrateo por factura, así que no son intercambiables. Lo mantienen vivo los casos 82 y
   146, que fijan la regla sobre la ruta simple. Es candidato a poda de una sesión futura —con sus dos casos
   reescritos sobre `giroCongelado`—, no de ésta: borrar un símbolo de nivel módulo se verifica con las capturas. */
export const BASE_MUERTOS = ["giroDeal"];
/* Los 7 `useState` sin uso, revisados uno por uno el 18-09-2026. Ninguno se tocó todavía y el veredicto de cada uno
   queda acá para que la próxima revisión no empiece de cero:
   · `reevTick` — FALSO POSITIVO. Se escribe y no se lee, y ése es exactamente su trabajo: cambiar el valor fuerza el
     re-render tras visar o re-evaluar. El «render para nadie» del auditor es el render que se busca.
   · `spreadDeudor` y `vencDias` — mapas que se leen en varios sitios y cuyo setter no se llama: la EDICIÓN por
     deudor que su forma de estado promete no existe. Ya está escrito en el fuente junto a `spreadDeudor`.
   · `alertF` — filtro por alerta de contactabilidad: se lee en dos ramas y nadie lo escribe, así que las dos ramas
     no se alcanzan. Retirarlo se lleva el filtro, que es una CAPACIDAD, no sólo estado.
   · `channel`, `dealTabInicial`, `diaModal` — restos: `channel` no se lee ni se escribe, `dealTabInicial` viaja al
     detalle siempre en `null` y `diaModal` sólo se resetea. Son los tres que una poda podría llevarse, y la
     verificación de una poda son las CAPTURAS (`.claude/rules/code_style.md`), no `tsc` ni el build. */
export const BASE_USESTATE = ["alertF", "channel", "dealTabInicial", "diaModal", "reevTick", "spreadDeudor", "vencDias"];
/* Funciones que auditar_aislamiento declara «nada global» (38 desde el 18-09-2026).
   SALE `lineaDeDeudor`, y no porque se haya acoplado: **nunca fue pura**. Era una función de UNA SOLA LÍNEA
   —`function lineaDeDeudor(rutDeudor) { return lineasDeudor().get(rutDeudor) || null; }`— y el auditor
   extrae el cuerpo a partir de la línea SIGUIENTE a la declaración, así que veía un cuerpo vacío y la
   declaraba limpia. Al formatear el fuente (ADR-0006) el cuerpo bajó de línea, el auditor lo vio, y con él
   la llamada a `lineasDeudor()`, que está memoizada. La línea base cargaba un falso negativo.
   Se revisaron las otras dos de una línea que había en la lista —`difPrecioDoc` y `tramoNota`—: ésas sí son
   puras, el auditor las sigue declarando limpias con el cuerpo a la vista. El punto ciego ya no existe en la
   práctica (el formateador no deja cuerpos de una línea), pero queda escrito por si alguien lo reintroduce. */
/* 18-09-2026: ENTRAN `reglaNoEjecutable` y `cargoDeAreaNivel`, y la decisión va en el commit. La regla 35
   se amplió —una regla excepcionable sin nadie que pueda firmarla tampoco se ejecuta—, así que la compuerta
   necesita el padrón del tenant. Se le pasa por PARÁMETRO y el núcleo que resuelve (área, nivel) se partió
   de su adaptador: el primer intento llamaba a `rolDeAreaNivel`, que se busca el padrón cuando no se lo
   dan, y el auditor —que sigue las llamadas— sacó a `evalReglaCli` de esta lista en el acto. Eso es
   exactamente lo que esta línea base existe para impedir. */
export const BASE_PURAS = [
  "evalReglaCli", "reglaNoEjecutable", "cargoDeAreaNivel",
  "deudorBlock", "nivelExigido", "pisoPorMonto", "esReglaDeudor", "verifDecision", "verifEvaluar",
  "causasVerif", "claveVeredicto", "facturasDeudorEnDeal", "reemplazoVigente", "validarSimCfg", "parseFormula",
  "evalFormula", "varsDeFormula", "tokenizarFormula", "sowEstado", "calcularOferta", "tasaMinIA", "prorratearOperacion",
  "prorratearConcepto", "difPrecioDoc", "valorPresenteDoc", "plazoEquivalente", "tasaEquivalente", "asignarGiros",
  "giroCalifica", "recortarAsignacion", "tipoLineaDeDeudor", "dispDeudor", "spreadMinDeudor",
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

const correr = (script, ...args) => {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, `${script} salió con ${r.status}: ${(r.stderr || "").slice(0, 400)}`);
  return r.stdout;
};

/* auditar_unidades sale con 1 cuando encuentra candidatos, así que acá no se usa `correr`. */
const unidades = (fuente) => {
  const r = spawnSync(process.execPath, ["auditar_unidades.mjs", ...(fuente ? [fuente] : [])],
    { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { salida: r.stdout, n: +((r.stdout.match(/^(\d+) candidato/m) || [])[1] ?? -1) };
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

/* auditar_unidades NO estaba gateado —era un comando de mano— y por eso el 23-09-2026 sobrevivió un
   `fmtCLP((f.monto || 0) * 1e6)` en el mensaje que se le manda al cliente: le mostraba su factura un
   millón de veces más grande. Acá es línea base CERO, que es una regla y no un snapshot: el sistema no
   tiene ningún campo en millones, así que ningún candidato es legítimo. Si aparece uno, se mira. */
test("auditar_unidades: ningún candidato — el millón no cruza a un formateador (línea base 0)", () => {
  const { n, salida } = unidades();
  assert.equal(n, 0, `el auditor de unidades encontró ${n} candidato(s):\n${salida}`);
});

test("sonda negativa: el auditor de unidades caza el millón multiplicado y el dividido", () => {
  const f = join(RAIZ, "tests", "contract", ".sonda_unidades.jsx");
  try {
    writeFileSync(f, ["const a = fmtCLP(monto * 1e6);", "const b = fmtMM(total / 1e6);", "const ok = fmtMM(miles * 1000);"].join("\n"));
    const { n, salida } = unidades(f);
    assert.equal(n, 2, `se esperaban 2 candidatos plantados y hubo ${n}:\n${salida}`);
    assert.match(salida, /\(d\) FORMATEADOR CON EL ARGUMENTO MULTIPLICADO — 1/);
    assert.match(salida, /\(a\) FORMATEADOR CON EL ARGUMENTO YA DIVIDIDO — 1/);
    // Multiplicar por MIL es legítimo: los layouts declaran campos en miles con el sufijo `_M`.
    assert.doesNotMatch(salida, /miles \* 1000/);
  } finally {
    rmSync(f, { force: true });
  }
});

test("sonda negativa: un hallazgo plantado, una t16 y una pura que se acopla se detectan", () => {
  const plantado = parsearMuerto("── SIN NINGUNA REFERENCIA — borrar (1) ────────\n   12   fantasma   cod=0    com=0\n\n── D · clases propias del <style> (16 declaradas) ────────\n   declaradas y NO usadas: ninguna\n   usadas y NO declaradas: t16  ← el caso t14\n");
  assert.deepEqual(plantado.hallazgos, [{ simbolo: "fantasma", seccion: "SIN NINGUNA REFERENCIA — borrar (1)" }]);
  assert.equal(plantado.clasesSinDeclarar, "t16");
  assert.deepEqual(compararBase(BASE_MUERTOS, [...BASE_MUERTOS, "fantasma"]).nuevos, ["fantasma"]);
  assert.deepEqual(compararBase(BASE_PURAS, BASE_PURAS.filter((f) => f !== "verifDecision")).desaparecidos, ["verifDecision"]);
  assert.deepEqual(parsearAislamiento("  ✓ a   1  nada global\n  ✗ b   2  TENANT\n  ✓ c   3  nada global\n"), ["a", "c"]);
});
