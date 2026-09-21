/* Gate de contrato: TODA RUTA QUE UN DOCUMENTO CITA TIENE QUE EXISTIR.

   Nace del reordenamiento del 21-09-2026 (pedido del usuario: auditorías y regresiones a su carpeta,
   specs por proceso dentro de `Specs_Procesos/`). Mover un archivo no rompe nada que un test ejecute
   —los `.md` no se corren— así que una ruta muerta se queda ahí, en silencio, hasta que alguien la
   sigue y no llega. En ese movimiento hubo ocho enlaces `](./spec-*.md)` entre specs que quedaron
   apuntando a nada, y catorce rutas en backticks. Ninguno lo habría cazado otro gate.

   Mide dos formas, que son las dos que este repo usa:
     · enlaces markdown relativos  `[texto](../Proceso/spec-x.md)` — se resuelven contra su archivo;
     · rutas en backticks          `` `Specs_Procesos/Otorgamiento/spec-otorgamiento.md` `` — contra la raíz.

   NO mira `vault/sesiones/` ni `vault/adr/`: son HISTORIA. Un log dice dónde estaba un archivo el día
   que se escribió y un ADR razona sobre el repo de su fecha; corregirles la ruta falsearía el registro,
   que es la misma doctrina con la que el log del 18-09 dejó intactos los greps de una auditoría. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { RAIZ, leer } from "./_comun.mjs";

/* Carpetas que no se revisan: historia (no se corrige), archivo muerto, y lo que no es documentación. */
export const EXENTAS = ["vault/sesiones", "vault/adr", "Legado", "node_modules", ".git", "vendor", "fuentes", "Capturas_UI", "Variantes_UI", "Figma_Export"];

const documentos = (dir = ".", acc = []) => {
  for (const f of readdirSync(join(RAIZ, dir))) {
    const rel = dir === "." ? f : `${dir}/${f}`;
    if (EXENTAS.some((e) => rel === e || rel.startsWith(e + "/")) || f.startsWith(".")) continue;
    if (statSync(join(RAIZ, rel)).isDirectory()) documentos(rel, acc);
    else if (rel.endsWith(".md")) acc.push(rel);
  }
  return acc;
};

/* Un enlace markdown relativo: `[texto](ruta)`. Se descartan las URL y los anclas internos. */
const ENLACE = /\]\(([^)\s]+)\)/g;
/* Una ruta en backticks que arranca en una carpeta del repo. Lleva extensión: un `Integraciones/` a
   secas nombra la carpeta, no un archivo, y exigirle extensión evita perseguir prosa. */
const EN_BACKTICKS = /`((?:Specs_Procesos|Integraciones|Auditorias|Regresiones|GeneradorDatos|tests|vault|Skills)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]{1,6})`/g;

/* Las rutas que un documento cita, ya resueltas contra la raíz del repo. `texto` permite plantar. */
export function rutasCitadas(rel, texto) {
  const src = texto != null ? texto : leer(rel);
  const fuera = [];
  for (const m of src.matchAll(ENLACE)) {
    const t = m[1];
    if (/^(https?:|mailto:|#)/.test(t)) continue;
    fuera.push({ cita: t, destino: normalize(join(dirname(rel), t)) });
  }
  for (const m of src.matchAll(EN_BACKTICKS)) fuera.push({ cita: m[1], destino: normalize(m[1]) });
  return fuera;
}

export function auditarRutas(docs) {
  const fallos = [];
  for (const rel of docs) for (const r of rutasCitadas(rel)) if (!existsSync(join(RAIZ, r.destino))) fallos.push(`${rel} cita \`${r.cita}\` y no existe (${r.destino})`);
  return fallos;
}

test("toda ruta que un documento cita existe", () => {
  assert.deepEqual(auditarRutas(documentos()), []);
});

test("el gate mira lo que tiene que mirar: los specs, las integraciones, las auditorías y el vault de conocimiento", () => {
  const docs = documentos();
  for (const esperado of [
    "CLAUDE.md",
    "README.md",
    "vault/conocimiento/mapa_documentos.md",
    "Specs_Procesos/Excepciones/spec-gestion-excepciones.md",
    "Auditorias/Inconsistencias_Motor_Otorgamiento.md",
    "Integraciones/spec_s3_verificacion.md",
  ])
    assert.ok(docs.includes(esperado), `${esperado} debería estar en el barrido`);
  assert.ok(!docs.some((d) => EXENTAS.some((e) => d.startsWith(e + "/"))), "la historia (sesiones, ADR) queda fuera del barrido");
  assert.ok(docs.length > 40, `esperaba más de 40 documentos; encontré ${docs.length}`);
});

const MUTANTES = {
  "un enlace relativo a un spec que se movió": {
    rel: "Specs_Procesos/Excepciones/spec-gestion-excepciones.md",
    texto: "ver [`spec-otorgamiento.md`](./spec-otorgamiento.md)",
    re: /spec-otorgamiento\.md` y no existe/,
  },
  "un enlace con `../` a una carpeta equivocada": {
    rel: "Specs_Procesos/Excepciones/spec-gestion-excepciones.md",
    texto: "ver [x](../Verificacion/spec-otorgamiento.md)",
    re: /Verificacion\/spec-otorgamiento\.md` y no existe/,
  },
  "una ruta en backticks que quedó en la raíz": {
    rel: "vault/conocimiento/mapa_documentos.md",
    texto: "el cotejo vive en `Specs_Procesos/Revision_Definiciones_2026-09-11.md` y se lee entero",
    re: /Revision_Definiciones_2026-09-11\.md` y no existe/,
  },
  "una auditoría citada sin su carpeta": {
    rel: "README.md",
    texto: "leer `Auditorias/Inconsistencias_Motor_Otorgamiento_v9.md` antes de corregir",
    re: /Inconsistencias_Motor_Otorgamiento_v9\.md` y no existe/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`sonda negativa: «${nombre}» lo caza el gate`, () => {
    const citas = rutasCitadas(m.rel, m.texto);
    assert.ok(citas.length > 0, "la sonda no plantó ninguna cita: no probaría nada");
    const fallos = citas.filter((r) => !existsSync(join(RAIZ, r.destino))).map((r) => `${m.rel} cita \`${r.cita}\` y no existe (${r.destino})`);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}

test("sonda negativa: una ruta VIVA no se reporta (el gate no es un «falla siempre»)", () => {
  const citas = rutasCitadas("README.md", "el proceso está en [otorgamiento](Specs_Procesos/Otorgamiento/spec-otorgamiento.md) y `tests/contract/rutas.test.mjs` lo vigila");
  assert.equal(citas.length, 2, `esperaba dos citas; obtuve ${JSON.stringify(citas)}`);
  assert.deepEqual(
    citas.filter((r) => !existsSync(join(RAIZ, r.destino))),
    [],
  );
});
