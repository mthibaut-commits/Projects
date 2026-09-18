/* El índice de reglas (`vault/conocimiento/invariantes.md`) es lo que un review usa para saber qué regla hay,
   dónde vive y qué caso la verifica. Desde que las reglas viven en archivos por tema, el índice y los
   archivos son DOS copias de una misma lista, y dos copias divergen a la primera edición sin que nada lo
   diga. Este test es el cable entre las cuatro cosas que tienen que calzar:

     índice ↔ archivos de reglas   (cada fila apunta a una regla que existe; cada regla tiene su fila)
     índice ↔ suite                (cada caso citado existe en tests_asignacion_lineas.js)
     índice ↔ fuente               (los códigos del contrato con el servidor son los de `INVARIANTES`)
     fuente ↔ índice               (cada `regla N` que cita el .jsx sigue existiendo)                    */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { RAIZ, leer, lineasDe, caminar, rel, numerosDeCasos } from "./_comun.mjs";

const ID = "\\d+(?:-[a-z]+)*";
const FILA_REGLA = new RegExp(`^\\| (${ID}) \\| (.*?) \\| \\[\`([^\`]+)\`\\]\\([^)]*\\) \\| (.*?) \\|$`);
const FILA_CONTRATO = /^\| ([A-Z]{3}-\d{2}) \|/;

export const filasReglas = (md) =>
  lineasDe(md)
    .map((l) => l.match(FILA_REGLA))
    .filter(Boolean)
    .map((m) => ({ id: m[1], enunciado: m[2], archivo: m[3], casos: casosDeCelda(m[4]), e2e: e2eDeCelda(m[4]), contratos: contratosDeCelda(m[4]) }));

/* «44, 46, 56–59, ~38–41» → [44, 46, 56, 57, 58, 59, 38, 39, 40, 41]; «**sin gate** …» → [].
   Un token `e2e-<id>` cita un caso de la capa e2e (tests/e2e/*.e2e.mjs) y sale por `e2eDeCelda`. */
export function casosDeCelda(celda) {
  if (/sin gate/.test(celda)) return [];
  const out = [];
  for (const tok of celda.split(/,\s*/)) {
    const t = tok.trim().replace(/^~/, "").replace(/`/g, "");
    const r = t.match(/^(\d+)[–-](\d+)$/);
    if (r) for (let k = +r[1]; k <= +r[2]; k++) out.push(k);
    else if (/^\d+$/.test(t)) out.push(+t);
  }
  return out;
}
export const e2eDeCelda = (celda) =>
  celda
    .split(/,\s*/)
    .map((t) => t.trim().replace(/`/g, ""))
    .filter((t) => /^e2e-[A-Za-z0-9-]+$/.test(t));
/* Un token `<archivo>.test.mjs` cita un gate de contrato: tests/contract/<archivo>.test.mjs tiene que existir. */
export const contratosDeCelda = (celda) =>
  celda
    .split(/,\s*/)
    .map((t) => t.trim().replace(/`/g, ""))
    .filter((t) => /^[a-z0-9_]+\.test\.mjs$/.test(t));
/* Las filas del contrato con el servidor: código y su última celda («En la suite»), que cita casos, e2e y gates igual que las reglas. */
export const filasContrato = (md) =>
  lineasDe(md)
    .filter((l) => FILA_CONTRATO.test(l))
    .map((l) => {
      const celdas = l.replace(/\s*\|$/, "").split(" | ");
      const ultima = celdas[celdas.length - 1];
      return { id: l.match(FILA_CONTRATO)[1], casos: casosDeCelda(ultima), e2e: e2eDeCelda(ultima), contratos: contratosDeCelda(ultima) };
    });
/* ids `e2e-…` declarados en tests/e2e/*.e2e.mjs (cada archivo exporta casos: [{ id, … }]) */
export function idsE2e(archivos) {
  const ids = new Set();
  for (const a of archivos) for (const m of leer(a).matchAll(/\bid:\s*["'`](e2e-[A-Za-z0-9-]+)["'`]/g)) ids.add(m[1]);
  return ids;
}

export const codigosContrato = (md) =>
  lineasDe(md)
    .map((l) => l.match(FILA_CONTRATO))
    .filter(Boolean)
    .map((m) => m[1]);

export function codigosFuente(jsx) {
  const ini = jsx.indexOf("const INVARIANTES = [");
  const fin = jsx.indexOf("\n];", ini);
  return [...jsx.slice(ini, fin).matchAll(/codigo: "([A-Z]{3}-\d{2})"/g)].map((m) => m[1]);
}

/* Las reglas viven en reglas/*.md y la 17 en contrato_servidor_y_auditoria.md; una regla empieza con su
   número a columna 0. Los `1.`…`5.` de arquitectura.md y verificacion.md son pasos, no reglas: no entran. */
const ARCHIVOS_REGLAS = () => [...caminar(join(RAIZ, "vault/conocimiento/reglas")), join(RAIZ, "vault/conocimiento/contrato_servidor_y_auditoria.md")].map(rel);

export function reglasEnArchivos(archivos, leerRel = leer) {
  const donde = new Map(); // id → [archivos]
  for (const a of archivos)
    for (const l of lineasDe(leerRel(a))) {
      const m = l.match(new RegExp(`^(${ID})\\. \\S`));
      if (m) donde.set(m[1], [...(donde.get(m[1]) || []), a]);
    }
  return donde;
}

/* «regla 15-bis», «(regla 14)». La «regla 0» es la del predictor de verificación, no una de dominio. */
export const referenciasRegla = (jsx) => [...new Set([...jsx.matchAll(new RegExp(`\\bregla (${ID})\\b`, "g")).map((m) => m[1])])].filter((id) => id !== "0");

export function verificar({ filas, donde, casosSuite, codigosIdx, codigosSrc, referencias, casosE2e = new Set(), gatesContrato = new Set(), filasC = [] }) {
  const fallos = [];
  const ids = new Set(filas.map((f) => f.id));
  const citas = (f, que) => {
    for (const c of f.casos) if (!casosSuite.has(c)) fallos.push(`índice: ${que} ${f.id} cita el caso ${c}, que no existe en la suite`);
    for (const e of f.e2e || []) if (!casosE2e.has(e)) fallos.push(`índice: ${que} ${f.id} cita ${e}, que ningún tests/e2e/*.e2e.mjs declara`);
    for (const t of f.contratos || []) if (!gatesContrato.has(t)) fallos.push(`índice: ${que} ${f.id} cita ${t}, que no existe en tests/contract/`);
  };
  for (const f of filas) {
    const archs = donde.get(f.id) || [];
    if (!archs.length) fallos.push(`índice: la regla ${f.id} no empieza a columna 0 en ningún archivo de reglas`);
    else if (!archs.some((a) => a.endsWith(f.archivo))) fallos.push(`índice: la regla ${f.id} dice vivir en ${f.archivo} y está en ${archs.join(", ")}`);
    citas(f, "la regla");
  }
  for (const f of filasC) citas(f, "el invariante");
  for (const [id, archs] of donde) {
    if (!ids.has(id)) fallos.push(`archivos: la regla ${id} (${archs.join(", ")}) no tiene fila en el índice`);
    if (archs.length > 1) fallos.push(`archivos: la regla ${id} está en más de un archivo: ${archs.join(", ")}`);
  }
  const rep = filas.map((f) => f.id).filter((id, i, a) => a.indexOf(id) !== i);
  for (const id of new Set(rep)) fallos.push(`índice: la regla ${id} tiene más de una fila`);
  const idx = new Set(codigosIdx),
    src = new Set(codigosSrc);
  for (const c of src) if (!idx.has(c)) fallos.push(`contrato: ${c} está en INVARIANTES del fuente y no en el índice`);
  for (const c of idx) if (!src.has(c)) fallos.push(`contrato: ${c} está en el índice y no en INVARIANTES del fuente`);
  for (const r of referencias) if (!ids.has(r)) fallos.push(`fuente: el .jsx cita «regla ${r}» y esa regla no está en el índice`);
  return fallos;
}

const datosReales = () => {
  const idx = leer("vault/conocimiento/invariantes.md");
  const jsx = leer("pipeline_comercial.jsx");
  return {
    filas: filasReglas(idx),
    donde: reglasEnArchivos(ARCHIVOS_REGLAS()),
    casosSuite: new Set(numerosDeCasos(leer("tests_asignacion_lineas.js"))),
    casosE2e: idsE2e(caminar(join(RAIZ, "tests/e2e"), ".e2e.mjs").map(rel)),
    gatesContrato: new Set(caminar(join(RAIZ, "tests/contract"), ".test.mjs").map((a) => a.split("/").pop())),
    filasC: filasContrato(idx),
    codigosIdx: codigosContrato(idx),
    codigosSrc: codigosFuente(jsx),
    referencias: referenciasRegla(jsx),
  };
};

test("el índice de invariantes calza con los archivos de reglas, la suite y el fuente", () => {
  const d = datosReales();
  assert.ok(d.filas.length >= 60, `el índice tiene ${d.filas.length} filas de reglas (se esperaban ≥60)`);
  assert.equal(d.codigosIdx.length, 12, "el índice lista 12 invariantes del contrato");
  assert.deepEqual(verificar(d), []);
});

test("sonda negativa: una fila plantada para una regla inexistente, un caso inexistente y un código de más se detectan", () => {
  const d = datosReales();
  const plantada = {
    ...d,
    filas: [
      ...d.filas,
      { id: "99", enunciado: "plantada", archivo: "reglas/curse_firma_y_etapas.md", casos: [999], e2e: ["e2e-fantasma"], contratos: ["fantasma.test.mjs"] },
    ],
    filasC: [...d.filasC, { id: "ZZZ-98", casos: [998], e2e: [], contratos: ["otro_fantasma.test.mjs"] }],
    codigosSrc: [...d.codigosSrc, "ZZZ-99"],
  };
  const f = verificar(plantada);
  assert.ok(
    f.some((x) => x.includes("la regla 99 no empieza")),
    "no cazó la regla plantada",
  );
  assert.ok(
    f.some((x) => x.includes("caso 999")),
    "no cazó el caso inexistente",
  );
  assert.ok(
    f.some((x) => x.includes("e2e-fantasma")),
    "no cazó el caso e2e inexistente",
  );
  assert.ok(
    f.some((x) => x.includes("fantasma.test.mjs")),
    "no cazó el gate de contrato inexistente",
  );
  assert.ok(
    f.some((x) => x.includes("el invariante ZZZ-98 cita el caso 998")),
    "no cazó el caso inexistente de una fila del contrato",
  );
  assert.ok(
    f.some((x) => x.includes("otro_fantasma.test.mjs")),
    "no cazó el gate inexistente de una fila del contrato",
  );
  assert.deepEqual(contratosDeCelda("117, `regla_5.test.mjs`, `e2e-5`"), ["regla_5.test.mjs"]);
  assert.ok(
    d.filasC.length === 12 && d.filasC.every((x) => x.casos.length || x.e2e.length || x.contratos.length),
    "las 12 filas del contrato citan al menos un gate",
  );
  assert.deepEqual(e2eDeCelda("115, `e2e-29`, ~3"), ["e2e-29"]);
  assert.ok(d.casosE2e.has("e2e-00"), "el humo e2e-00 tiene que estar declarado en tests/e2e/");
  assert.ok(
    f.some((x) => x.includes("ZZZ-99")),
    "no cazó el código de más",
  );
  assert.deepEqual(casosDeCelda("44, 56–59, ~38–41, ~43"), [44, 56, 57, 58, 59, 38, 39, 40, 41, 43]);
  assert.deepEqual(casosDeCelda("**sin gate** (revisión)"), []);
});

/* ── `aplicado` no puede mentir ─────────────────────────────────────────────────────────────────────
   Cada invariante declara en qué se apoya HOY: `repositorio`, `motor`, `funcion`, `observado` o `ui`. El
   propio comentario de la tabla dice que existe para «que quede auditable qué invariante existe, quién la
   hace cumplir de verdad y dónde se aplica hoy» — y nadie lo comprobaba. El 18-09-2026 se midió: OTG-01,
   VER-01 y ATR-01 decían `ui` y los tres tenían (o pasaron a tener) una guarda en el handler; dos de ellas
   desde hacía semanas. Es el hallazgo 2.3 otra vez, en un campo en vez de en una cifra.
   La regla que lo caza es barata y de una sola dirección: **si el código aparece en el fuente FUERA de la
   tabla, `aplicado` no puede ser `ui`**, porque esa aparición ES la guarda o su auditoría. Al revés no se
   exige nada: un invariante que sólo vive en la tabla puede legítimamente apoyarse en la pantalla. */
export const APLICADO_VALIDOS = new Set(["repositorio", "motor", "funcion", "observado", "ui"]);

export function aplicadoDe(jsx) {
  const ini = jsx.indexOf("const INVARIANTES = [");
  const bloque = jsx.slice(ini, jsx.indexOf("\n];", ini));
  const fuera = jsx.slice(0, ini) + jsx.slice(jsx.indexOf("\n];", ini));
  return [...bloque.matchAll(/codigo: "([A-Z]{3}-\d{2})"[\s\S]*?aplicado: "(\w+)"/g)].map((m) => ({
    codigo: m[1],
    aplicado: m[2],
    fuera: fuera.includes(m[1]),
  }));
}

export function verificarAplicado(filas) {
  const fallos = [];
  for (const f of filas) {
    if (!APLICADO_VALIDOS.has(f.aplicado))
      fallos.push(`${f.codigo}: \`aplicado: "${f.aplicado}"\` no está en el vocabulario (${[...APLICADO_VALIDOS].join(", ")})`);
    if (f.aplicado === "ui" && f.fuera)
      fallos.push(
        `${f.codigo} declara \`aplicado: "ui"\` —que el único control es que la pantalla esconda la acción— y su código aparece en el fuente fuera de la tabla: eso es una guarda. Corrige el campo, no el código (regla 24)`,
      );
  }
  return fallos;
}

test("`aplicado` describe dónde se hace cumplir el invariante de verdad, y no se queda atrás", () => {
  assert.deepEqual(verificarAplicado(aplicadoDe(leer("pipeline_comercial.jsx"))), []);
});

test("sonda negativa: un `aplicado` inventado y uno que dice «ui» con guarda en el código se detectan", () => {
  assert.deepEqual(verificarAplicado([{ codigo: "AAA-01", aplicado: "ui", fuera: false }]), [], "sólo en la tabla: `ui` es legítimo");
  assert.match(verificarAplicado([{ codigo: "AAA-01", aplicado: "ui", fuera: true }])[0], /eso es una guarda/);
  assert.match(verificarAplicado([{ codigo: "AAA-01", aplicado: "resolver", fuera: false }])[0], /no está en el vocabulario/);
  const reales = aplicadoDe(leer("pipeline_comercial.jsx"));
  assert.equal(reales.length, 12, "se leyeron los 12 invariantes");
  /* Desde el 18-09-2026 NINGUNO se apoya sólo en la pantalla: los cuatro que decían `ui` tenían guarda y el
     campo estaba atrasado, y los dos que sí la necesitaban —OTG-02 y GIR-01 en el «Avanzar a» manual— se
     cablearon en `moverEtapa`. Que no quede ninguno es la conclusión, no un fallo: la dirección «ui con
     guarda» la sigue probando la violación PLANTADA de arriba, que no depende de cómo esté el fuente hoy. */
  assert.ok(
    reales.every((f) => f.aplicado !== "ui"),
    "un invariante volvió a apoyarse sólo en la pantalla: eso es la regla 24, no un cambio de campo",
  );
});
