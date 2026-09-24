/* Gate de contrato: LAS SKILLS PROPIAS DEL REPO CITAN SÓLO LO QUE TRAEN, Y SE LLAMAN COMO SU CARPETA.

   Nace el 24-09-2026, al instalar la v2 de `datamart-ui`. Desde el 16-09 la v1 estaba instalada en
   `.claude/skills/datamart-ui/` y la v2 del usuario parqueada al lado, en `Skills/`, en el MISMO commit: la
   instalada no citaba `references/components-extended.md` (§34–§49) y la parqueada sí. Y la copia que
   sincroniza la organización cita `charts.md` y `project-integration.md`, que su paquete no trae. Nada de
   eso falla: una skill que cita una referencia inexistente se carga igual y se lee a medias, que es el
   agujero de `t14` en otra forma —lo que nadie declaró no rompe, sale distinto y nadie lo ve—.

   Mide tres cosas, por skill (`.claude/skills/<carpeta>/SKILL.md`):
     · el frontmatter declara `name` y es igual a la carpeta (así la invoca el harness);
     · toda `references/<x>.md` que el SKILL.md cita existe en `<carpeta>/references/`;
     · ninguna `references/*.md` instalada queda sin citar (una referencia que nadie nombra es v1 con un
       archivo de v2 al lado, o un archivo que quedó de una versión anterior).

   NO mira `Skills/`: es el paquete del usuario tal como lo entregó (ADR-0022), no una skill instalada. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer, frontmatter } from "./_comun.mjs";

const DIR_SKILLS = ".claude/skills";

/* Las carpetas de `.claude/skills/` que traen un SKILL.md. */
export const skillsInstaladas = () =>
  readdirSync(join(RAIZ, DIR_SKILLS))
    .filter((f) => statSync(join(RAIZ, DIR_SKILLS, f)).isDirectory() && existsSync(join(RAIZ, DIR_SKILLS, f, "SKILL.md")))
    .sort();

/* Las referencias que un SKILL.md cita: `references/<archivo>.md`, en backticks o en un enlace. */
const CITA = /`references\/([A-Za-z0-9_.-]+\.md)`|\]\(references\/([A-Za-z0-9_.-]+\.md)\)/g;
export const referenciasCitadas = (texto) => [...new Set([...texto.matchAll(CITA)].map((m) => m[1] || m[2]))].sort();

/* Los `.md` que la carpeta `references/` de una skill trae de verdad. */
export const referenciasInstaladas = (carpeta) => {
  const dir = join(RAIZ, DIR_SKILLS, carpeta, "references");
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : [];
};

/* La revisión de UNA skill sobre datos ya leídos, para poder plantar. Devuelve los fallos, en prosa. */
export function auditarSkill(carpeta, textoSkill, instaladas) {
  const fallos = [];
  const { campos, error } = frontmatter(textoSkill);
  if (error) fallos.push(`${carpeta}/SKILL.md: ${error}`);
  else if (!campos.name) fallos.push(`${carpeta}/SKILL.md: el frontmatter no declara \`name\``);
  else if (campos.name !== carpeta) fallos.push(`${carpeta}/SKILL.md: declara \`name: ${campos.name}\` y la carpeta se llama \`${carpeta}\``);

  const citadas = referenciasCitadas(textoSkill);
  for (const r of citadas) if (!instaladas.includes(r)) fallos.push(`${carpeta}/SKILL.md cita \`references/${r}\` y no existe`);
  for (const r of instaladas) if (!citadas.includes(r)) fallos.push(`${carpeta}/references/${r} está instalada y el SKILL.md no la cita`);
  return fallos;
}

export const auditarTodas = () =>
  skillsInstaladas().flatMap((c) => auditarSkill(c, leer(`${DIR_SKILLS}/${c}/SKILL.md`), referenciasInstaladas(c)));

test("cada skill propia se llama como su carpeta y cita exactamente las referencias que trae", () => {
  assert.deepEqual(auditarTodas(), []);
});

test("el gate mira lo que tiene que mirar: las dos skills propias, y la v2 de datamart-ui con sus seis referencias", () => {
  const skills = skillsInstaladas();
  for (const s of ["datamart-ui", "sincronizar-main"]) assert.ok(skills.includes(s), `${s} debería estar instalada`);
  const refs = referenciasCitadas(leer(`${DIR_SKILLS}/datamart-ui/SKILL.md`));
  assert.ok(refs.includes("components-extended.md"), "la instalada es la v2: cita components-extended.md (§34–§49)");
  assert.equal(refs.length, 6, `la v2 cita seis referencias; encontré ${JSON.stringify(refs)}`);
});

const SKILL_OK = "---\nname: mi-skill\ndescription: prueba\n---\n\n# Mi skill\n\n| `references/a.md` | siempre |\n| `references/b.md` | a veces |\n";

test("sonda negativa: una skill correcta no da fallos (el gate no es un «falla siempre»)", () => {
  assert.deepEqual(auditarSkill("mi-skill", SKILL_OK, ["a.md", "b.md"]), []);
});

const MUTANTES = {
  "un `name` distinto de la carpeta": {
    texto: SKILL_OK.replace("name: mi-skill", "name: otra-cosa"), instaladas: ["a.md", "b.md"],
    re: /declara `name: otra-cosa` y la carpeta se llama `mi-skill`/,
  },
  "un frontmatter sin `name`": {
    texto: SKILL_OK.replace("name: mi-skill\n", ""), instaladas: ["a.md", "b.md"],
    re: /no declara `name`/,
  },
  "un SKILL.md sin frontmatter": {
    texto: "# Mi skill\n", instaladas: [],
    re: /no empieza con frontmatter/,
  },
  "una referencia citada que no existe (la copia de la organización: charts.md)": {
    texto: SKILL_OK + "| `references/charts.md` | gráficos |\n", instaladas: ["a.md", "b.md"],
    re: /cita `references\/charts\.md` y no existe/,
  },
  "una referencia instalada que nadie cita (la v1 con components-extended.md al lado)": {
    texto: SKILL_OK, instaladas: ["a.md", "b.md", "components-extended.md"],
    re: /components-extended\.md está instalada y el SKILL\.md no la cita/,
  },
  "un enlace markdown a una referencia inexistente también cuenta como cita": {
    texto: SKILL_OK + "ver [gráficos](references/charts.md)\n", instaladas: ["a.md", "b.md"],
    re: /cita `references\/charts\.md` y no existe/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`sonda negativa: «${nombre}» lo caza el gate`, () => {
    const fallos = auditarSkill("mi-skill", m.texto, m.instaladas);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
