/* Gate de contrato de la rutina «integrar main antes de modificar» (skill `sincronizar-main`, pedido del usuario del
   23-09-2026: «antes de partir con una modificación de la rama main debes integrar los cambios para que tu base sea
   lo más actualizada»). Una rutina que vive sólo en un documento se debilita en silencio: alguien simplifica el
   script y deja de detenerse en `main`, o la skill pierde el paso que la hacía rutina. Fija tres cosas:

     · la DECISIÓN de `sincronizar_main.mjs` (`planDeSincronizacion`) sobre una tabla de mediciones plantadas: nunca
       integra estando en `main`, nunca mezcla sobre un árbol sucio, avanza sin merge commit cuando la rama no tiene
       nada propio, toma el árbol de `main` cuando todo lo propio ya entró, y mezcla con --no-ff si no;
     · los COMANDOS que propone (`comandosDelPlan`): ninguno empuja, fuerza, rebasa ni reescribe;
     · los SIGUIENTES ENTEROS LIBRES (`siguientesLibres`) sobre insumos plantados y sobre el repo real;
     · que la skill diga el procedimiento y que el ciclo de una tarea, el flujo git y el `CLAUDE.md` la citen.

   Todo con sonda negativa: un gate verde que no se comprueba en rojo no vigila nada. No corre git: la parte que mide
   es impura y la cubre la corrida del script; acá se prueba lo que decide. */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer } from "./_comun.mjs";
import { planDeSincronizacion, comandosDelPlan, siguientesLibres, unirInsumos } from "../../sincronizar_main.mjs";

/* La tabla de mediciones: cada fila es un estado posible de la rama y la acción que corresponde. */
export const ESCENARIOS = [
  { que: "en main, aunque esté al día", m: { rama: "main", sucio: false, detras: 0, adelante: 0, propios: 0 }, accion: "detener" },
  { que: "en main y atrasada", m: { rama: "main", sucio: false, detras: 5, adelante: 0, propios: 0 }, accion: "detener" },
  { que: "HEAD desacoplado", m: { rama: "HEAD", sucio: false, detras: 3, adelante: 1, propios: 1 }, accion: "detener" },
  { que: "al día con trabajo en curso", m: { rama: "claude/x", sucio: true, detras: 0, adelante: 2, propios: 2 }, accion: "al_dia" },
  { que: "al día y limpia", m: { rama: "claude/x", sucio: false, detras: 0, adelante: 0, propios: 0 }, accion: "al_dia" },
  { que: "atrasada con el árbol sucio", m: { rama: "claude/x", sucio: true, detras: 4, adelante: 1, propios: 1 }, accion: "detener" },
  { que: "atrasada y sin nada propio", m: { rama: "claude/x", sucio: false, detras: 7, adelante: 0, propios: 0 }, accion: "avanzar" },
  { que: "atrasada y todo lo propio ya en main", m: { rama: "claude/x", sucio: false, detras: 31, adelante: 1, propios: 0 }, accion: "tomar_main" },
  { que: "atrasada y con trabajo propio", m: { rama: "feature/y", sucio: false, detras: 2, adelante: 3, propios: 2 }, accion: "mezclar" },
];

export function auditarPlan(plan) {
  const fallos = [];
  for (const e of ESCENARIOS) {
    const r = plan(e.m);
    if (!r || r.accion !== e.accion) fallos.push(`${e.que}: la acción es «${r && r.accion}» y tiene que ser «${e.accion}»`);
    else if (!r.motivo) fallos.push(`${e.que}: la acción no dice por qué`);
  }
  return fallos;
}

const PROHIBIDO = [/\bpush\b/, /--force\b|-f\b/, /\brebase\b/, /reset --hard/, /checkout\s+(-B\s+)?main\b/, /\bmerge\b(?!.*(--no-ff|--ff-only))/];
export function auditarComandos(comandos) {
  const fallos = [];
  for (const accion of ["detener", "al_dia", "avanzar", "tomar_main", "mezclar"]) {
    const cs = comandos(accion) || [];
    for (const c of cs) for (const re of PROHIBIDO) if (re.test(c)) fallos.push(`${accion}: «${c}» rompe una regla del flujo (${re})`);
    if ((accion === "detener" || accion === "al_dia") && cs.length) fallos.push(`${accion}: no corresponde correr nada y propone ${cs.length} comando(s)`);
  }
  if (!(comandos("avanzar") || []).some((c) => /git merge --ff-only origin\/main/.test(c))) fallos.push("avanzar no es un fast-forward: dejaría un merge commit vacío");
  if (!(comandos("mezclar") || []).some((c) => /git merge --no-ff .*origin\/main/.test(c))) fallos.push("mezclar no usa --no-ff");
  if (!(comandos("tomar_main") || []).some((c) => /git read-tree -u --reset origin\/main/.test(c))) fallos.push("tomar main no toma el árbol de origin/main");
  return fallos;
}

export function auditarLibres(libres) {
  const fallos = [];
  const r = libres({
    reglas: ["12. **Una**\n13-ter. **Dos**\n", "74. **Tres**\n    - 99. no es una regla: va indentado\n75. **Cuatro**"],
    casosEsperados: 171,
    adrs: ["ADR-0021-x.md", "ADR-0022-y.md", "index.md"],
    e2e: ["00_sesion.e2e.mjs", "28_version_v1.e2e.mjs", "_harness.mjs", "correr.mjs"],
  });
  if (r.regla !== 76) fallos.push(`la regla siguiente a 75 es ${r.regla}`);
  if (r.caso !== 172) fallos.push(`el caso siguiente a 171 es ${r.caso}`);
  if (r.adr !== "ADR-0023") fallos.push(`el ADR siguiente a ADR-0022 es ${r.adr}`);
  if (r.e2e !== "29") fallos.push(`el archivo e2e siguiente a 28 es ${r.e2e}`);
  const u = libres(unirInsumos({ reglas: ["80. **Rama**"], casosEsperados: 175, adrs: ["ADR-0024-z.md"], e2e: ["30_a.e2e.mjs"] },
    { reglas: ["76. **Main**"], casosEsperados: 172, adrs: ["ADR-0023-w.md"], e2e: ["29_b.e2e.mjs"] }));
  if (u.regla !== 81 || u.caso !== 176 || u.adr !== "ADR-0025" || u.e2e !== "31") fallos.push(`la unión no toma el máximo de los dos lados: ${JSON.stringify(u)}`);
  return fallos;
}

export function auditarSkill(texto) {
  const fallos = [];
  const t = String(texto);
  if (!/^---\nname: sincronizar-main\n/.test(t)) fallos.push("la skill no declara `name: sincronizar-main` en su frontmatter");
  if (!/\ndescription: /.test(t.slice(0, 2000))) fallos.push("la skill no tiene `description`: no se dispararía sola");
  const exige = [
    ["node sincronizar_main.mjs", "no manda a medir con el script"],
    ["ANTES de empezar cualquier modificación", "la descripción no dice que corre antes de modificar"],
    ["Justo antes de mezclar la rama a `main`", "no pide volver a integrar antes de mezclar a main"],
    ["uno por uno", "no dice que los comandos van de a uno (el hook bloquea el compuesto entero)"],
    ["git merge --no-ff", "no dice que integrar a main es con --no-ff"],
    ["git cherry", "no enseña a medir con git cherry"],
    ["siguiente", "no habla del siguiente entero libre"],
    ["la cadena", "no exige la verificación completa sobre lo integrado"],
  ];
  for (const [frase, falla] of exige) if (!t.includes(frase)) fallos.push(`la skill ${falla}`);
  return fallos;
}

export function auditarReferencias({ workflow, flujo, claude }) {
  const fallos = [];
  if (!/^0\. \*\*Integrar `main` antes de modificar\*\*.*sincronizar-main/m.test(workflow)) fallos.push("el ciclo de una tarea (`workflow.md`) no empieza integrando main con la skill");
  if (!flujo.includes("sincronizar-main")) fallos.push("`flujo_git.md` no cita la skill");
  if (!claude.includes("node sincronizar_main.mjs")) fallos.push("`CLAUDE.md` no lista el comando");
  return fallos;
}

const DOCS = () => ({ workflow: leer(".claude/rules/workflow.md"), flujo: leer("vault/conocimiento/flujo_git.md"), claude: leer("CLAUDE.md") });

test("la decisión de sincronizar: nunca en main, nunca sobre un árbol sucio con algo que integrar, avanza, toma main o mezcla según lo propio", () => {
  assert.deepEqual(auditarPlan(planDeSincronizacion), []);
});

test("los comandos propuestos no empujan, no fuerzan, no rebasan ni reescriben; avanzar es fast-forward y mezclar es --no-ff", () => {
  assert.deepEqual(auditarComandos(comandosDelPlan), []);
});

test("los siguientes enteros libres: regla, caso, ADR y e2e, sobre la unión de la rama y main", () => {
  assert.deepEqual(auditarLibres(siguientesLibres), []);
});

test("sobre el repo real, ningún número libre está tomado", () => {
  const reglas = readdirSync(join(RAIZ, "vault/conocimiento/reglas")).filter((f) => f.endsWith(".md")).map((f) => leer(`vault/conocimiento/reglas/${f}`));
  const casos = +/CASOS_ESPERADOS = (\d+)/.exec(leer("tests/contract/suite.test.mjs"))[1];
  const adrs = readdirSync(join(RAIZ, "vault/adr"));
  const e2e = readdirSync(join(RAIZ, "tests/e2e"));
  const l = siguientesLibres({ reglas, casosEsperados: casos, adrs, e2e });
  assert.ok(!reglas.some((t) => new RegExp(`^${l.regla}\\. `, "m").test(t)), `la regla ${l.regla} ya existe`);
  assert.equal(l.caso, casos + 1);
  assert.ok(!adrs.some((f) => f.startsWith(l.adr + "-")), `${l.adr} ya existe`);
  assert.ok(!e2e.some((f) => f.startsWith(l.e2e + "_")), `el archivo e2e ${l.e2e}_ ya existe`);
});

test("la skill dice el procedimiento, y el ciclo de una tarea, el flujo git y el CLAUDE.md la citan", () => {
  assert.deepEqual(auditarSkill(leer(".claude/skills/sincronizar-main/SKILL.md")), []);
  assert.deepEqual(auditarReferencias(DOCS()), []);
});

const plan = planDeSincronizacion;
const PLANES_MUTANTES = [
  ["integra estando en main", (m) => (m.rama === "main" ? { accion: "avanzar", motivo: "x" } : plan(m))],
  ["mezcla sobre un árbol sucio", (m) => (m.sucio && m.detras > 0 ? { accion: "mezclar", motivo: "x" } : plan(m))],
  ["deja un merge commit vacío cuando no hay nada propio", (m) => (m.adelante === 0 && m.detras > 0 && m.rama !== "main" ? { accion: "mezclar", motivo: "x" } : plan(m))],
  ["re-aplica lo que ya entró a main", (m) => { const r = plan(m); return r.accion === "tomar_main" ? { accion: "mezclar", motivo: "x" } : r; }],
  ["se detiene por trabajo en curso aunque no haya nada que integrar", (m) => (m.sucio && m.rama !== "main" && m.rama !== "HEAD" ? { accion: "detener", motivo: "x" } : plan(m))],
];
for (const [nombre, mutante] of PLANES_MUTANTES)
  test(`sonda negativa: el plan ${nombre}`, () => {
    assert.ok(auditarPlan(mutante).length > 0, "el gate no cazó la decisión plantada");
  });

const COMANDOS_MUTANTES = [
  ["empuja", (a) => (a === "mezclar" ? [...comandosDelPlan(a), "git push -u origin HEAD"] : comandosDelPlan(a))],
  ["fuerza", (a) => (a === "tomar_main" ? ["git reset --hard origin/main", "git push --force"] : comandosDelPlan(a))],
  ["rebasa", (a) => (a === "mezclar" ? ["git rebase origin/main"] : comandosDelPlan(a))],
  ["avanza con merge commit", (a) => (a === "avanzar" ? ["git merge --no-ff origin/main"] : comandosDelPlan(a))],
  ["mezcla sin --no-ff", (a) => (a === "mezclar" ? ["git merge origin/main"] : comandosDelPlan(a))],
];
for (const [nombre, mutante] of COMANDOS_MUTANTES)
  test(`sonda negativa: el comando propuesto ${nombre}`, () => {
    assert.ok(auditarComandos(mutante).length > 0, "el gate no cazó el comando plantado");
  });

test("sonda negativa: un cálculo de enteros libres que se salta la unión o cuenta lo indentado", () => {
  assert.ok(auditarLibres((x) => ({ ...siguientesLibres(x), regla: 100 })).length > 0);
  assert.ok(auditarLibres((x) => siguientesLibres({ ...x, reglas: x.reglas.slice(0, 1) })).length > 0);
});

test("sonda negativa: la skill sin el script, sin el --no-ff o sin el paso antes de mezclar se detecta; y las referencias borradas también", () => {
  const skill = leer(".claude/skills/sincronizar-main/SKILL.md");
  assert.ok(auditarSkill(skill.replaceAll("node sincronizar_main.mjs", "git pull")).length > 0);
  assert.ok(auditarSkill(skill.replaceAll("git merge --no-ff", "git merge")).length > 0);
  assert.ok(auditarSkill(skill.replace("Justo antes de mezclar la rama a `main`", "Al final")).length > 0);
  assert.ok(auditarSkill(skill.replace("name: sincronizar-main", "name: otra")).length > 0);
  const d = DOCS();
  assert.ok(auditarReferencias({ ...d, workflow: d.workflow.replace("sincronizar-main", "otra-cosa") }).length > 0);
  assert.ok(auditarReferencias({ ...d, claude: d.claude.replaceAll("node sincronizar_main.mjs", "") }).length > 0);
});
