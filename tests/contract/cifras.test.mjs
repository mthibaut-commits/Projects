/* Gate de CIFRAS: los números que los documentos afirman contra los que el repo mide.

   Es el hallazgo 2.3 de `Auditoria_Bootstrap_Agentico.md`, que ya pasó TRES veces: un documento cita un
   conteo, el repo crece, y la cifra queda vieja en silencio. El 18-09-2026 había tres versiones vivas del
   mismo número —`CLAUDE.md` decía 61 reglas de dominio, el tablero 63 y la medición daba 62— y ninguna era
   un error de nadie: no había quién las contara. Copiar los números correctos en un commit no arregla eso;
   lo arregla que ROMPA cuando se desfasan. Por eso este archivo cuenta y compara, y no guarda un snapshot.

   Dos clases de cifra, y se tratan distinto a propósito:

   · ESTRUCTURALES (reglas, invariantes del contrato, archivos de test, casos): cambian pocas veces y a
     propósito. Se exigen EXACTAS — agregar un caso y no tocar el documento que lo cuenta rompe acá, que es
     donde debe romper.
   · CONTINUAS (líneas del fuente, peso de un activo, componentes): cambian con cada edición. Exigirlas
     exactas sería un gate que rompe siempre y que todos aprenden a actualizar sin mirar; se exigen dentro de
     una BANDA, y entonces sólo gritan cuando la cifra dejó de describir la realidad. Por eso los documentos
     las escriben con `~`.

   Lo que NO se mide acá, y por qué: el NÚMERO DE TESTS de contrato. Tres archivos los generan en bucle
   (`regla_13_octies_bis`, `regla_17`, `regla_30`), así que la única forma de saberlo es correr el runner —y
   este archivo ES el runner—. Una cifra que sólo se sabe corriendo lo que la cuenta no puede ser un gate
   barato, y una cifra que nadie puede comprobar es exactamente lo que este archivo existe para evitar. Lo que
   los documentos citan es el número de ARCHIVOS de gate, que se cuenta mirando el directorio.

   Y la regla que hace que esto no se pueda apagar sin querer: si la afirmación ya NO está en el documento
   —porque alguien reescribió el párrafo— el gate falla igual. Un gate que no encuentra qué vigilar no es un
   gate que pasa. */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer, lineasDe, caminar, numerosDeCasos } from "./_comun.mjs";

/* Los ids de regla del vault, con la misma forma que usa invariantes.test.mjs: entero y sufijos latinos. */
const ID_REGLA = "\\d+(?:-[a-z]+)*";

const archivosDe = (dir, filtro) => readdirSync(join(RAIZ, dir)).filter(filtro);

/* ── Las mediciones. Cada una es la DEFINICIÓN de su cifra: si alguien discute el número, discute acá. ── */
export const MEDIDAS = {
  /* Reglas de dominio: un id a columna 0 seguido de punto y contenido, en vault/conocimiento/reglas/. */
  reglasDominio: () => {
    const ids = new Set();
    for (const a of caminar(join(RAIZ, "vault/conocimiento/reglas")))
      for (const l of lineasDe(leer(a.slice(RAIZ.length + 1)))) {
        const m = l.match(new RegExp(`^(${ID_REGLA})\\. \\S`));
        if (m) ids.add(m[1]);
      }
    return ids.size;
  },
  /* Invariantes del contrato con el servidor: los códigos de `INVARIANTES` en el fuente. */
  invariantesContrato: () => {
    const jsx = leer("pipeline_comercial.jsx");
    const ini = jsx.indexOf("const INVARIANTES = [");
    return new Set([...jsx.slice(ini, jsx.indexOf("\n];", ini)).matchAll(/codigo: "([A-Z]{3}-\d{2})"/g)].map((m) => m[1])).size;
  },
  /* Archivos de gate de contrato, y de ellos los que fijan UNA regla que vive en JSX. */
  archivosContrato: () => archivosDe("tests/contract", (f) => f.endsWith(".test.mjs")).length,
  gatesRegla: () => archivosDe("tests/contract", (f) => /^regla_.*\.test\.mjs$/.test(f)).length,
  /* La suite: los números de caso declarados en tests_asignacion_lineas.js, únicos. */
  casosSuite: () => new Set(numerosDeCasos(leer("tests_asignacion_lineas.js"))).size,
  /* La capa e2e: archivos `*.e2e.mjs` y los `id: "e2e-…"` que declaran. */
  archivosE2e: () => archivosDe("tests/e2e", (f) => f.endsWith(".e2e.mjs")).length,
  casosE2e: () => archivosDe("tests/e2e", (f) => f.endsWith(".e2e.mjs"))
    .reduce((n, f) => n + (leer(join("tests/e2e", f)).match(/\bid:\s*["'`]e2e-/g) || []).length, 0),
  /* Continuas. Líneas: las que cuenta `wc -l`, o sea saltos de línea. */
  lineasFuente: () => (leer("pipeline_comercial.jsx").match(/\n/g) || []).length,
  /* Componentes: declaraciones de nivel módulo con nombre en MAYÚSCULA inicial — `function X` o `const X = (`.
     No distingue un componente de una función auxiliar con nombre en mayúscula, y no pretende hacerlo: es una
     cifra de orden de magnitud, y por eso va en banda y los documentos la escriben con `~`. */
  componentes: () => {
    const src = leer("pipeline_comercial.jsx");
    return (src.match(/^(?:export default )?(?:async )?function [A-Z]/gm) || []).length
         + (src.match(/^const [A-Z][A-Za-z0-9_]* = \(/gm) || []).length;
  },
  /* Peso del activo inyectado, en MB (1024²), como lo vería el explorador de archivos. */
  pesoDatosMB: () => statSync(join(RAIZ, "datos_inyectados.js")).size / 1048576,
};

/* «26.232» → 26232 · «32,6» → 32.6 · «~34» → 34. El punto es separador de miles y la coma, decimal (es-CL). */
export function aNumero(s) {
  const t = String(s).replace(/[~*\s]/g, "");
  return t.includes(",") ? +t.replace(/\./g, "").replace(",", ".") : +t.replace(/\./g, "");
}

/* El texto con los espacios colapsados: así una afirmación sigue encontrándose aunque el párrafo se
   re-justifique y el número quede al otro lado de un salto de línea. */
export const plano = (texto) => texto.replace(/\s+/g, " ");

/* ── Las afirmaciones. Cada fila es «este documento dice este número y tiene que ser éste». La `re` lleva
      UN grupo de captura: el número. `banda` (en %) convierte la exigencia en un rango. ── */
export const AFIRMACIONES = [
  { archivo: "CLAUDE.md", que: "reglas de dominio con gate", re: /las (\d+) de dominio/, medida: "reglasDominio" },
  { archivo: "CLAUDE.md", que: "invariantes del contrato", re: /los (\d+) del contrato/, medida: "invariantesContrato" },
  { archivo: "CLAUDE.md", que: "casos de la suite (paso 5)", re: /# 5 · (\d+)\/\d+ PASA/, medida: "casosSuite" },
  { archivo: "CLAUDE.md", que: "casos e2e (paso 6)", re: /# 6 · e2e: (\d+) casos de pantalla/, medida: "casosE2e" },
  { archivo: "CLAUDE.md", que: "peso de datos_inyectados.js", re: /datos_inyectados\.js` \(~(\d+) MB/, medida: "pesoDatosMB", banda: 15 },

  { archivo: "README.md", que: "líneas del fuente", re: /pipeline_comercial\.jsx` \(~([\d.]+) líneas/, medida: "lineasFuente", banda: 15 },
  { archivo: "README.md", que: "componentes", re: /líneas, ~?([\d.]+) componentes/, medida: "componentes", banda: 20 },
  { archivo: "README.md", que: "casos de la suite", re: /la suite: (\d+) casos en Chromium/, medida: "casosSuite" },
  { archivo: "README.md", que: "peso de datos_inyectados.js", re: /\*\*`datos_inyectados\.js`\*\* \(~(\d+) MB\)/, medida: "pesoDatosMB", banda: 15 },

  { archivo: "vault/conocimiento/arquitectura.md", que: "líneas del fuente", re: /pipeline_comercial\.jsx` \(~([\d.]+) líneas/, medida: "lineasFuente", banda: 15 },
  { archivo: "vault/conocimiento/arquitectura.md", que: "componentes", re: /líneas, ~?([\d.]+) componentes\)/, medida: "componentes", banda: 20 },

  { archivo: "vault/conocimiento/verificacion.md", que: "archivos de contrato", re: /\((\d+) archivos en total\)/, medida: "archivosContrato" },
  { archivo: "vault/conocimiento/verificacion.md", que: "casos de la suite", re: /tests_asignacion_lineas\.js` — \*\*(\d+) casos\*\*/, medida: "casosSuite" },

  { archivo: "vault/conocimiento/invariantes.md", que: "invariantes del contrato", re: /Contrato con el servidor \((\d+) invariantes/, medida: "invariantesContrato" },
  { archivo: "vault/conocimiento/invariantes.md", que: "gates por regla", re: /`regla_<slug>\.test\.mjs` \((\d+) archivos/, medida: "gatesRegla" },
  { archivo: "vault/conocimiento/invariantes.md", que: "archivos e2e", re: /son (\d+) archivos y \d+ casos/, medida: "archivosE2e" },
  { archivo: "vault/conocimiento/invariantes.md", que: "casos e2e", re: /son \d+ archivos y (\d+) casos/, medida: "casosE2e" },

  { archivo: ".claude/rules/testing.md", que: "gates por regla", re: /\((\d+) archivos desde el 17-09-2026\)/, medida: "gatesRegla" },
  { archivo: ".claude/rules/testing.md", que: "casos de la suite", re: /\*\*La suite\*\*: (\d+) casos/, medida: "casosSuite" },
  { archivo: ".claude/rules/testing.md", que: "casos e2e", re: /\*\*(\d+) casos en \d+ archivos\*\*/, medida: "casosE2e" },
  { archivo: ".claude/rules/testing.md", que: "archivos e2e", re: /\*\*\d+ casos en (\d+) archivos\*\*/, medida: "archivosE2e" },

  { archivo: "vault/sesiones/estado_actual.md", que: "casos de la suite", re: /\*\*(\d+)\/\d+ PASA\*\*/, medida: "casosSuite" },
  { archivo: "vault/sesiones/estado_actual.md", que: "archivos de gate de contrato", re: /\*\*(\d+) archivos de gate de contrato\*\*/, medida: "archivosContrato" },
  { archivo: "vault/sesiones/estado_actual.md", que: "casos e2e", re: /\*\*(\d+) casos e2e\*\*/, medida: "casosE2e" },
  { archivo: "vault/sesiones/estado_actual.md", que: "reglas de dominio", re: /\((\d+) reglas verbatim/, medida: "reglasDominio" },
];

/* Compara una tabla de afirmaciones contra un mapa de mediciones. `leerRel` se inyecta para poder plantar
   documentos en la sonda negativa sin tocar los del repo. */
export function revisar(afirmaciones, medidas, leerRel = leer) {
  const fallos = [];
  for (const a of afirmaciones) {
    const texto = plano(leerRel(a.archivo));
    const m = texto.match(a.re);
    if (!m) {
      fallos.push(`${a.archivo}: ya no se encuentra la afirmación «${a.que}». Si el párrafo se reescribió, actualiza la fila de AFIRMACIONES; un gate que no encuentra qué vigilar no vigila nada`);
      continue;
    }
    const dice = aNumero(m[1]);
    const real = medidas[a.medida]();
    const ok = a.banda ? Math.abs(dice - real) <= (real * a.banda) / 100 : dice === real;
    if (!ok) fallos.push(`${a.archivo}: «${a.que}» dice ${m[1]} y la medición da ${a.banda ? real.toFixed(1) : real}${a.banda ? ` (banda ±${a.banda} %)` : ""}`);
  }
  return fallos;
}

const medidas = MEDIDAS;

test("cada cifra que un documento afirma calza con la medición del repo", () => {
  assert.deepEqual(revisar(AFIRMACIONES, medidas), [], "una cifra desfasada: corrige el DOCUMENTO, no este gate");
});

test("las mediciones son coherentes entre sí y con lo que ya gatean otros archivos", () => {
  assert.ok(medidas.reglasDominio() > 50, "el vault dejó de tener reglas: algo se rompió en la medición");
  assert.equal(medidas.invariantesContrato(), 12, "los invariantes del contrato son 12 (invariantes.test.mjs los cruza uno a uno con el fuente)");
  assert.ok(medidas.gatesRegla() < medidas.archivosContrato(), "los gates por regla son un subconjunto de los archivos de contrato");
  assert.ok(medidas.casosE2e() >= medidas.archivosE2e(), "cada archivo e2e aporta al menos un caso");
  assert.ok(medidas.lineasFuente() > 20000 && medidas.componentes() > 100, "el fuente dejó de medirse: revisa las definiciones de MEDIDAS");
});

test("sonda negativa: una cifra plantada, una afirmación borrada y una banda excedida se detectan", () => {
  const doc = { "x.md": "el repo tiene 7 reglas y ~100 líneas de fuente" };
  const leerX = (f) => doc[f];
  const med = { siete: () => 7, cien: () => 100 };
  const af = [
    { archivo: "x.md", que: "reglas", re: /tiene (\d+) reglas/, medida: "siete" },
    { archivo: "x.md", que: "líneas", re: /~(\d+) líneas/, medida: "cien", banda: 10 },
  ];
  assert.deepEqual(revisar(af, med, leerX), [], "el documento correcto no da fallos");

  doc["x.md"] = "el repo tiene 8 reglas y ~100 líneas de fuente";
  assert.match(revisar(af, med, leerX)[0], /dice 8 y la medición da 7/, "una cifra exacta desfasada tiene que caer");

  doc["x.md"] = "el repo tiene 7 reglas y ~105 líneas de fuente";
  assert.deepEqual(revisar(af, med, leerX), [], "dentro de la banda no se grita");
  doc["x.md"] = "el repo tiene 7 reglas y ~130 líneas de fuente";
  assert.match(revisar(af, med, leerX)[0], /banda ±10 %/, "fuera de la banda sí");

  doc["x.md"] = "este párrafo se reescribió y ya no cuenta nada";
  const f = revisar(af, med, leerX);
  assert.equal(f.length, 2, "las dos afirmaciones desaparecidas tienen que caer, no pasar en silencio");
  assert.match(f[0], /ya no se encuentra la afirmación/);

  /* El número parte y llega igual aunque el párrafo se re-justifique y lo deje al otro lado de un salto. */
  doc["x.md"] = "el repo\ntiene   7\nreglas y ~100 líneas de fuente";
  assert.deepEqual(revisar(af, med, leerX), [], "el colapso de espacios tiene que sobrevivir al salto de línea");

  assert.equal(aNumero("26.232"), 26232);
  assert.equal(aNumero("~34"), 34);
  assert.equal(aNumero("32,6"), 32.6);
  assert.equal(aNumero("**140**"), 140);
});
