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
(`pipeline_comercial.jsx`), build standalone de 40,6 MB, **114/114 casos PASA**, `tsc` limpio, 0 duplicados
(medido el 17-09-2026 sobre `b1b6446`). Los procesos —otorgamiento, verificación, líneas, pricing, giro, inbound,
ciclo de la factura— tienen spec en `Specs_Procesos/` con su PDF. El repo **acaba de abrir su vault**: `CLAUDE.md`
pasó de 229 KB a 98 líneas y las 60 reglas de dominio viven verbatim en `vault/conocimiento/reglas/`, con índice en
`invariantes.md` (39 con caso en la suite, 21 sólo por revisión). Nada del producto cambió.

> ## 🎯 Siguiente paso
>
> El orden por retorno sobre riesgo de `Auditoria_Bootstrap_Agentico.md` §8, con el paso 1 ya hecho. **Los
> cuatro son decisión del usuario**; ninguno está empezado.
> 1. **Cablear lo que ya existe**: `tests/contract/` con la sonda del vault (`chequear_vault.mjs`, en el scratchpad
>    de la sesión del 17-09, lista para promover), los tres auditores y la suite; hooks `protect_paths` /
>    `gitflow_guard` / `worktree_guard`; CI con los cuatro pasos. Antes: decidir el preset de git (GitHub Flow o
>    develop/main).
> 2. **Cerrar la tabla de invariantes**: 8 de los 12 del contrato con el servidor sin gate (TEN-01, RAT-01, IDM-01,
>    LIN-01, OTG-01, GIR-01, ATR-01, CRY-01, PRI-01) y 21 reglas de dominio sólo por revisión.
> 3. **Decidir los datos**: las razones sociales de los deudores son reales (Codelco, Cencosud, MOP…) sobre RUT
>    sintéticos. Un ADR que lo decida y un gate que lo sostenga.
> 4. Sacar `pipeline.zip` (build del 12-08-2026, 29,6 MB) del versionado.

## En vuelo ahora

| Trabajo | Estado | Rama | Siguiente paso |
|---|---|---|---|
| Partir `CLAUDE.md` y abrir el vault | ✅ completada 17-09-2026 · sonda 398/398 · verificación completa en verde | `claude/ecstatic-ptolemy-f7cb4m` | mergear a `main` (usuario) |

## Bloqueos

- Ninguno.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate.** `vault/conocimiento/arquitectura.md` dice ~21.000 líneas / 118 componentes /
   ~31 MB (medido: 25.922 / 154 / 40,6); `README.md` dice «30 casos» (114), «~24 MB» (34) y «7 hallazgos abiertos»
   (los siete cerrados el 11-09). Se corrigen cuando exista el gate que las produzca, o a mano en un commit T3.
2. **Separación por género** de cada regla (regla → invariante · porqué → ADR · historia → log): regla por regla,
   cuando se toque cada una. Por qué no ahora: ADR-0001.
3. **GN como disyunción** (regla 22) es un supuesto explícito pendiente de confirmar con el negocio, y la tercera
   forma de giro que el enunciado menciona no está definida (`spec-modelo-giro.md`).
4. `PipelineComercial` (2.905 líneas, 50 `useState`) y `DealDrawer` (2.794) son el 22 % del fuente. Medida, no tarea.
5. Pendientes que las propias reglas dejan escritos: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis);
   `STATUS_ETAPA` no es tenant-aware y `OperacionesView` lista operaciones que también están en el tubo (28);
   el layout del A1 no trae `MntNotaCredito` (13-quater).
6. La suite monta la app entera pero **no** `DealDrawer`, el wizard ni la bandeja: lo que cambia ahí se verifica
   abriendo la pantalla (regla núcleo 4).

## Conocimiento clave

[invariantes](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) ·
[arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) ·
[mapa de documentos](../conocimiento/mapa_documentos.md) · [decisiones cerradas](../adr/index.md)

## Última sesión

[17-09-2026 — auditoría de bootstrap y partición de CLAUDE.md](./2026-09-17_partir_claude_md.md)
