---
type: sesion
title: "La v2 de datamart-ui se instala: la skill que se cargaba era la v1, con la v2 parqueada al lado desde el mismo commit"
description: "Pedido del usuario del 24-09-2026 («usa la V2»): la v2 de la skill datamart-ui y sus specs extendidos §34–§49 pasan de Skills/ a .claude/skills/datamart-ui/; la consigna —todo diseño en línea con datamart-ui v2, pulido con emil-design-eng, manda la regla 63— queda en CLAUDE.md; y un gate nuevo, skills_propias.test.mjs, exige que cada skill propia se llame como su carpeta y cite exactamente las referencias que trae. T2, un commit"
tags: [sesion, herramental, skills, datamart-ui, regla-63]
timestamp: 2026-09-24T07:00:00Z
---

# La v2 de `datamart-ui` se instala · gate `skills_propias`

## Qué pidió el usuario

> «Usa la V2.» Y que todo diseño esté en línea con `datamart-ui` y use además `emil-design-eng`.

## Lo que se midió

1. **La skill instalada era la v1.** `.claude/skills/datamart-ui/SKILL.md` (128 líneas) y `Skills/datamart-ui-skill v2.md`
   (138 líneas) entraron al repo **en el mismo commit**, `aa8cfcb` del 16-09-2026, y desde entonces la que cargaba el
   harness era la v1. El `diff` entre las dos es sólo de adiciones: la regla «no inventes una primitiva» (menús, overlays,
   tablas, calendario y sidebar ya están en §34–§49), la fila `references/components-extended.md` en la tabla de referencias
   y siete ítems del checklist (kebab siempre con su menú §34, paginación §47 o command §38 pasadas ~9 filas, spinner §43
   sólo inline, barra de acciones masivas §48 sólo con filas marcadas, `<Sheet>` vs ruta con breadcrumb, `<Switch>` vs
   `<Checkbox>`, umbrales de `<Progress>`).
2. **`Skills/` es el paquete del usuario.** ADR-0022 lo nombra así, con `datamart-ui.skill` (zip con la v1 y sus cinco
   referencias), la v2 y `components-extended.md`. No se toca: se **copia** a la skill instalada.
3. **La copia que sincroniza la organización** (`anthropic-skills:datamart-ui`) cita `charts.md` y `project-integration.md`,
   que su paquete no trae. La v2 del usuario es la consistente: cita seis referencias y las seis existen una vez instalada.
4. **Nada de esto falla solo.** Una skill que cita una referencia inexistente se carga igual y se lee a medias; una referencia
   instalada que nadie cita no se lee nunca. Es el agujero de `t14` en otra forma: lo que nadie declaró no rompe, sale
   distinto y nadie lo ve. Por eso la defensa es un gate y no la revisión.

## Qué se hizo (T2: rama corta, un commit verde)

- `Skills/datamart-ui-skill v2.md` → `.claude/skills/datamart-ui/SKILL.md` y `Skills/components-extended.md` →
  `.claude/skills/datamart-ui/references/components-extended.md`. Los dos ya venían en LF.
- `.claude/rules/code_style.md`: el puntero a los specs extendidos apunta a la ruta instalada.
- `CLAUDE.md` § «Flujo de trabajo con el usuario»: la consigna del 24-09 —todo diseño en línea con `datamart-ui` **v2**,
  pulido con `emil-design-eng` (skill de la organización, fuera del repo por ADR-0022)— con la prevalencia de la **regla 63**:
  los tokens son de Datamart, lo externo aporta composición. Queda en 130 líneas (gate ≤150).
- **Gate `tests/contract/skills_propias.test.mjs`**, con lógica exportada (`auditarSkill`) y siete sondas negativas: `name`
  distinto de la carpeta, sin `name`, sin frontmatter, referencia citada inexistente (`charts.md`), referencia instalada sin
  citar (`components-extended.md` junto a una v1), y la cita por enlace markdown. Probado contra la deriva real: con la v1 de
  `HEAD` y las referencias de hoy cae en «`components-extended.md` está instalada y el SKILL.md no la cita».
- Cifras: **73 archivos de gate** en el tablero y en `verificacion.md`; fila nueva en `invariantes.md` § Gates. De paso salió
  la fila DUPLICADA de `regla_<slug>.test.mjs` que decía 54 archivos (la medición da 59; regla núcleo 2).

## Lo que NO se hizo, y por qué

- No se instaló `emil-design-eng` en el repo: es skill de la organización y ADR-0022 deja fuera las de terceros. La consigna
  la nombra; quien la use la tiene en su `~/.claude/` o en el catálogo de la organización.
- No se tocó `Skills/`: es el paquete del usuario tal como lo entregó. El `.skill` sigue trayendo la v1: es su zip.
- El gate no compara la instalada con la parqueada byte a byte: una v3 llegaría con otro nombre de archivo y el gate tendría
  que conocerlo. Lo que sí cae es la deriva que importa: citar lo que no existe o traer lo que nadie cita.

## Verificación

Los seis pasos de `CLAUDE.md` sobre la rama al día con `origin/main` (`sincronizar_main.mjs`: al día). El `.jsx` no cambió.
