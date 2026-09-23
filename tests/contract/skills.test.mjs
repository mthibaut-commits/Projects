/* Gate de contrato de las SKILLS DE TERCEROS (23-09-2026, regla 63).

   Una skill de terceros de `.claude/skills/` es un archivo de instrucciones que el agente lee y
   obedece SOLO, sin que nadie se lo pida: la de TDD declara que aplica a «any new logic, any bug
   fix, any change that could break existing behavior». Cuando una de ellas contradice una decisión
   ya tomada acá —y tomada porque algo se rompió y quedó medido— no basta con anotar en el `CLAUDE.md`
   quién manda: la skill se CORRIGE, y la corrección tiene que sobrevivir a una reinstalación.

   Dos clases en el mismo archivo:
   · **snapshot** — `BASE_CHOQUES`: qué skills contradicen qué regla. Cambia cuando se instala,
     se saca o se actualiza una skill, y eso es una decisión que va escrita en el commit.
   · **regla** — toda skill que choca lleva su bloque de AJUSTE LOCAL. Esto NO se actualiza nunca:
     si una reinstalación pisa el bloque, el gate cae y se vuelve a poner.

   Por qué el gate y no la confianza: un token foráneo no falla el día que entra. Aparece un color
   que no está en `C` y esa esquina deja de ser Datamart sin que nadie lo vea — el agujero de `t14`,
   usada en 15 sitios sin estar declarada. Lo mismo con una capa de pruebas que este repo decidió no
   tener: nadie nota que se montó hasta que hay dos runners. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RAIZ, MARCA_INICIO, MARCA_FIN, auditar, sinAjuste, tieneAjuste } from "../../auditar_skills.mjs";

/** SNAPSHOT — medido el 23-09-2026 sobre las 39 skills de terceros. Subirlo es una decisión. */
export const BASE_CHOQUES = {
  "browser-testing-with-devtools": ["unidad"],
  "ci-cd-and-automation": ["unidad"],
  "constraint-driven-development": ["unidad"],
  "design-taste-frontend": ["token"],
  "design-taste-frontend-v1": ["token"],
  "git-workflow-and-versioning": ["git"],
  "high-end-visual-design": ["token"],
  "industrial-brutalist-ui": ["token"],
  "minimalist-ui": ["token"],
  "redesign-existing-projects": ["token"],
  "stitch-design-taste": ["designmd", "token"],
  "test-driven-development": ["unidad"],
};

const medido = () =>
  Object.fromEntries(auditar().map((f) => [f.skill, [...new Set(f.choques.map((c) => c.id))].sort()]));

test("las skills que contradicen una regla del repo son exactamente las conocidas", () => {
  assert.deepEqual(
    medido(),
    BASE_CHOQUES,
    "cambió qué skills chocan: si se instaló o actualizó una, ajústala y sube BASE_CHOQUES en el mismo commit",
  );
});

test("toda skill que choca lleva su bloque de AJUSTE LOCAL, y va antes del cuerpo", () => {
  const fallos = [];
  for (const f of auditar()) {
    if (!f.ajustada) {
      fallos.push(`${f.skill}: choca en [${f.choques.map((c) => c.id)}] y no trae el bloque de ajuste`);
      continue;
    }
    const s = readFileSync(join(RAIZ, f.skill, "SKILL.md"), "utf8");
    const i = s.indexOf(MARCA_INICIO);
    const cuerpo = s.search(/^#\s/m);
    if (i === -1) fallos.push(`${f.skill}: el ajuste no está en SKILL.md (¿quedó en otro .md?)`);
    else if (cuerpo !== -1 && i > cuerpo) fallos.push(`${f.skill}: el ajuste va DESPUÉS del cuerpo; se lee primero el consejo genérico`);
  }
  assert.deepEqual(fallos, []);
});

test("el ajuste cita la regla que lo respalda: no es una nota suelta", () => {
  const fallos = [];
  for (const f of auditar()) {
    const s = readFileSync(join(RAIZ, f.skill, "SKILL.md"), "utf8");
    const bloque = s.slice(s.indexOf(MARCA_INICIO), s.indexOf(MARCA_FIN));
    if (!/regla \d+|reglas? núcleo \d+|\.claude\/rules\/[a-z_]+\.md|flujo_git\.md/.test(bloque)) {
      fallos.push(`${f.skill}: el bloque de ajuste no cita ninguna regla ni archivo de reglas`);
    }
  }
  assert.deepEqual(fallos, []);
});

test("sonda negativa: una skill nueva que choca y no está ajustada se caza", () => {
  const raiz = mkdtempSync(join(tmpdir(), "skills-"));
  try {
    mkdirSync(join(raiz, "intrusa"));
    writeFileSync(join(raiz, "intrusa", "SKILL.md"), "# Intrusa\n\nUse Jest for unit tests.\nPalette: #FF00AA\n");
    const filas = auditar(raiz);
    assert.equal(filas.length, 1, "el auditor no vio la skill plantada");
    assert.deepEqual(
      filas[0].choques.map((c) => c.id).sort(),
      ["token", "unidad"],
      "no detectó los dos choques plantados",
    );
    assert.equal(filas[0].ajustada, false, "la dio por ajustada sin bloque");

    // y con el bloque puesto, la misma skill pasa a contar como ajustada
    writeFileSync(
      join(raiz, "intrusa", "SKILL.md"),
      `${MARCA_INICIO}\n> regla 63: los tokens salen de \`C\`\n${MARCA_FIN}\n\n# Intrusa\n\nUse Jest for unit tests.\nPalette: #FF00AA\n`,
    );
    const b = auditar(raiz);
    assert.equal(b[0].ajustada, true, "no reconoció el bloque de ajuste");
    assert.equal(b[0].choques.length, 2, "el ajuste no debe TAPAR el choque: el cuerpo sigue diciendo lo suyo");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("sonda negativa: el recorte del ajuste no se come el cuerpo ni se cuenta a sí mismo", () => {
  const conAjuste = `${MARCA_INICIO}\n> nada de #ABCDEF acá\n${MARCA_FIN}\n\n# Cuerpo\ntexto`;
  assert.equal(sinAjuste(conAjuste).includes("#ABCDEF"), false, "no recortó el bloque");
  assert.equal(sinAjuste(conAjuste).includes("# Cuerpo"), true, "se comió el cuerpo");
  assert.equal(tieneAjuste(conAjuste), true);
  assert.equal(tieneAjuste("# Sólo cuerpo"), false);
  // un bloque sin cerrar no se da por bueno
  assert.equal(tieneAjuste(`${MARCA_INICIO}\n> a medias`), false, "aceptó un bloque sin marca de fin");
});
