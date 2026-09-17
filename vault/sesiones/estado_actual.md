---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-17T17:57:26Z
---

# Estado actual

> **Este es el primer archivo que lee toda sesión, y el último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **116/116 PASA**, `tsc` limpio, 0 duplicados.
Los procesos tienen spec en `Specs_Procesos/` con su PDF. El 17-09-2026 el repo abrió su vault (`CLAUDE.md` de
229 KB a ~105 líneas; 62 reglas verbatim por tema, índice en `invariantes.md`) y **cableó sus gates**: 29 tests
de contrato en `tests/contract/` (~8 s, sin dependencias, cada uno con sonda negativa), tres hooks deterministas
en `.claude/hooks/` y un CI de un solo job (`.github/workflows/gates.yml`) con los cinco pasos en toda rama.
Detalle y trade-offs: ADR-0001, ADR-0002. Las dos últimas sesiones sumaron la regla 32, el ADR-0003 y el restyle del detalle simulado (reglas 29 y 22).

> ## 🎯 Siguiente paso
>
> Todos son decisión del usuario. Desde `v0.1.0`, `main` lleva los hooks: `git commit` directo sobre `main` rebota.
> 0. **Mergear `--no-ff` a `main`** la rama `claude/migrate-project-session-vui9dl` (dos commits verificados:
>    regla 32 + ADR-0003, y el restyle del detalle simulado).
> 1. **Cerrar la tabla de invariantes**: 8 de los 12 del contrato con el servidor sin gate (TEN-01, RAT-01, IDM-01,
>    LIN-01, OTG-01, GIR-01, ATR-01, CRY-01, PRI-01) y 21 reglas de dominio sólo por revisión.
> 2. **Decidir los datos**: razones sociales reales de deudores sobre RUT sintéticos (un ADR y un gate).
> 3. Sacar `pipeline.zip` (build del 12-08-2026, 29,6 MB) del versionado.

## En vuelo ahora

| Trabajo | Estado | Rama | Siguiente paso |
|---|---|---|---|
| «Operación creada» + Acciones › Editar; id estable en el cierre del día | ✅ verificada 17-09-2026 · 116/116 · sondas 19/19 y 6/6 · **pusheada, sin mergear** | `claude/migrate-project-session-vui9dl` | merge `--no-ff` a `main` cuando el usuario diga |
| Restyle del detalle simulado (mockup del usuario) | ✅ verificada 17-09-2026 · 116/116 · sonda 15/15 · **pusheada, sin mergear** | ídem | ídem |
| Cablear los gates · partir `CLAUDE.md` | ✅ mergeadas a `main` (bd14091) | `claude/ecstatic-ptolemy-f7cb4m` | pushear el tag `v0.1.0` desde la máquina del usuario |

## Bloqueos

- **El tag `v0.1.0` no llegó al remoto**: el proxy git del entorno deniega `refs/tags/*` (HTTP 403, política; se
  reporta, no se rodea). Lo pone el usuario desde Windows: `git fetch origin main && git tag -a v0.1.0 bd14091 -m
  "v0.1.0 — bootstrap agéntico" && git push origin v0.1.0`.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate.** `arquitectura.md` dice ~21.000 líneas / 118 componentes / ~31 MB (medido:
   ~26.100 / 154 / 40,7); `README.md` dice «~21.000 líneas, 118 componentes», «~24 MB» (34) y «7 hallazgos
   abiertos» (cerrados el 11-09). Un commit T3 cuando el usuario diga.
2. **Líneas base de los auditores** (`tests/contract/auditores.test.mjs`): 7 hallazgos «revisar a mano» y 7
   `useState` sin uso. Decidir uno por uno —borrar o cablear— y encoger la línea base en el mismo commit.
3. **Separación por género** de cada regla (regla → invariante · porqué → ADR · historia → log), al tocarla.
4. **GN como disyunción** (regla 22) es un supuesto pendiente del negocio; la tercera forma de giro no está definida.
5. `PipelineComercial` (~2.950 líneas, 50 `useState`) y `DealDrawer` (~2.850) son el 22 % del fuente. Medida, no tarea.
6. Pendientes que las reglas dejan escritos: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis);
   `STATUS_ETAPA` no es tenant-aware y `OperacionesView` duplica filas del tubo (28); el A1 no trae
   `MntNotaCredito` (13-quater); la guarda contra una solicitud al comité duplicada sólo ve las de su pestaña (32).
7. **Hooks en Windows**: correr el health check de `loop_agentico_hooks.md` la primera vez. El CI avisa que
   `actions/checkout@v4` y `setup-node@v4` apuntan a Node 20: subir a `@v5` (T3).
8. La suite monta la app entera pero **no** `DealDrawer`, el wizard ni la bandeja: lo que cambia ahí se verifica
   abriendo la pantalla (regla núcleo 4). Las sondas de esta sesión viven en el scratchpad, no en el repo.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) ·
[hooks](../conocimiento/loop_agentico_hooks.md) · [flujo git](../conocimiento/flujo_git.md) ·
[arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) ·
[decisiones cerradas](../adr/index.md)

## Última sesión

[17-09-2026 — el detalle simulado según el mockup](./2026-09-17_restyle_detalle_simulado.md) ·
[17-09-2026 — «Operación creada» + Editar, y el id que cambiaba](./2026-09-17_operacion_creada_y_editar.md) ·
[17-09-2026 — merge a main y v0.1.0](./2026-09-17_merge_a_main.md) ·
