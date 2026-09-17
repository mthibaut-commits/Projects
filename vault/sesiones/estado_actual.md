---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-17T15:29:14Z
---

# Estado actual

> **Este es el primer archivo que lee toda sesión, y el último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,6 MB, **115/115 PASA**, `tsc` limpio, 0 duplicados.
Los procesos tienen spec en `Specs_Procesos/` con su PDF. El 17-09-2026 el repo abrió su vault (`CLAUDE.md` de
229 KB a 105 líneas; 60 reglas verbatim por tema, índice en `invariantes.md`) y **cableó sus gates**: 29 tests de
contrato en `tests/contract/` (~8 s, sin dependencias, cada uno con sonda negativa), tres hooks deterministas en
`.claude/hooks/` y un CI de un solo job (`.github/workflows/gates.yml`) con los cinco pasos en toda rama. Nada del
producto cambió. Detalle y trade-offs: ADR-0001 y ADR-0002.

> ## 🎯 Siguiente paso
>
> Todos son decisión del usuario; ninguno está empezado. Desde `v0.1.0`, `main` lleva los hooks: una sesión de
> Claude Code que intente `git commit` directo sobre `main` va a rebotar y tendrá que abrir rama (`flujo_git.md`).
> 1. **Cerrar la tabla de invariantes**: 8 de los 12 del contrato con el servidor sin gate (TEN-01, RAT-01, IDM-01,
>    LIN-01, OTG-01, GIR-01, ATR-01, CRY-01, PRI-01) y 21 reglas de dominio sólo por revisión.
> 2. **Decidir los datos**: las razones sociales de los deudores son reales (Codelco, Cencosud, MOP…) sobre RUT
>    sintéticos. Un ADR que lo decida y un gate que lo sostenga (hoy ningún test lo afirma ni lo niega).
> 3. Sacar `pipeline.zip` (build del 12-08-2026, 29,6 MB) del versionado.

## En vuelo ahora

| Trabajo | Estado | Rama | Siguiente paso |
|---|---|---|---|
| Cablear los gates | ✅ completada 17-09-2026 · 29/29 · CI verde en su run #1 · **mergeada a `main` con `--no-ff` · `v0.1.0`** | `claude/ecstatic-ptolemy-f7cb4m` | — |
| Partir `CLAUDE.md` y abrir el vault | ✅ completada 17-09-2026 · sonda 398/398 · mergeada a `main` · `v0.1.0` | ídem | — |

## Bloqueos

- Ninguno.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate.** `vault/conocimiento/arquitectura.md` dice ~21.000 líneas / 118 componentes /
   ~31 MB (medido: 25.922 / 154 / 40,6); `README.md` dice «~21.000 líneas, 118 componentes», «~24 MB» (34) y
   «7 hallazgos abiertos» (los siete cerrados el 11-09). Un commit T3 cuando el usuario diga.
2. **Líneas base de los auditores** (`tests/contract/auditores.test.mjs`): 7 hallazgos «revisar a mano»
   (`porcionLabel`, `MarcaNuevo`, `ChipCond`, `PESO_COL`, `lineaDeVersion`, `CLIENTE_ESTADOS`, `giroDeal`) y 7
   `useState` sin uso. Decidir uno por uno —borrar o cablear— y encoger la línea base en el mismo commit.
3. **Separación por género** de cada regla (regla → invariante · porqué → ADR · historia → log): regla por regla,
   cuando se toque cada una (ADR-0001).
4. **GN como disyunción** (regla 22) es un supuesto pendiente de confirmar con el negocio; la tercera forma de
   giro no está definida (`spec-modelo-giro.md`).
5. `PipelineComercial` (2.905 líneas, 50 `useState`) y `DealDrawer` (2.794) son el 22 % del fuente. Medida, no tarea.
6. Pendientes que las reglas dejan escritos: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis);
   `STATUS_ETAPA` no es tenant-aware y `OperacionesView` duplica filas del tubo (28); el A1 no trae
   `MntNotaCredito` (13-quater).
7. **Hooks en Windows**: correr el health check de `loop_agentico_hooks.md` en la máquina del usuario la primera
   vez (Git Bash tiene que expandir `$CLAUDE_PROJECT_DIR`). `regresion_diferencial.mjs` sigue siendo manual.
   El CI avisa que `actions/checkout@v4` y `setup-node@v4` apuntan a Node 20 (deprecado): subir a `@v5` (T3).
8. La suite monta la app entera pero **no** `DealDrawer`, el wizard ni la bandeja: lo que cambia ahí se verifica
   abriendo la pantalla (regla núcleo 4).

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) ·
[hooks](../conocimiento/loop_agentico_hooks.md) · [flujo git](../conocimiento/flujo_git.md) ·
[arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) ·
[decisiones cerradas](../adr/index.md)

## Última sesión

[17-09-2026 — merge a main y v0.1.0](./2026-09-17_merge_a_main.md) ·
[17-09-2026 — cablear los gates](./2026-09-17_cablear_gates.md) ·
[17-09-2026 — auditoría y partición de CLAUDE.md](./2026-09-17_partir_claude_md.md)
