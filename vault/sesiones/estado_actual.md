---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-17T23:05:00Z
---

# Estado actual

> **Este es el primer archivo que lee toda sesión, y el último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **139/139 PASA**, **147 gates de contrato**, **29 casos e2e**,
`tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault, cableó sus gates (ADR-0001 y ADR-0002) y **cerró la
tabla de invariantes**: las 61 reglas de dominio y los 12 invariantes del contrato tienen gate; ninguna fila dice ya
«sin gate». Los 30 gates nuevos los escribió un agente por fila y otro intentó refutarlos; lo refutado se reparó y
lo aceptado se pulió (log de la sesión). **Lo que destaparon sí cambió el producto** (abajo).

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado.
> 1. **Los desfases regla↔código que los gates midieron** (20, listados en el log de la sesión): los tres grandes son
>    la cláusula «el cliente pide tasa bajo el mínimo del deudor» de la regla 8, que **no existe en el código**;
>    `validarMutacion` con **un solo call site** (LIN-01, GIR-01 y ATR-01 declarados y nunca invocados); y el
>    `idProceso` de la solicitud al comité, que **colisiona entre pestañas** y descarta la segunda en silencio.
> 2. **Decidir los datos**: razones sociales reales sobre RUT sintéticos. Un ADR que lo decida y un gate que lo
>    sostenga (hoy ningún test lo afirma ni lo niega). 3. Sacar `pipeline.zip` (29,6 MB) del versionado.

## En vuelo ahora

| Trabajo | Estado | Rama | Siguiente paso |
|---|---|---|---|
| Cerrar la tabla de invariantes | ✅ completada 17-09-2026 · 30 filas · suite 115→139 · e2e 1→16 archivos · contrato 6→24 | `claude/ecstatic-ptolemy-f7cb4m` | mergear a `main` con `--no-ff` cuando el usuario lo diga |
| Cablear los gates · partir `CLAUDE.md` | ✅ completadas 17-09-2026 · mergeadas a `main` (bd14091) | ídem | **pushear el tag `v0.1.0`** desde Windows (abajo) |

## Defectos de producto corregidos en el mismo commit (los destaparon los gates)

1. **13-sexdecies**: retirar la ÚLTIMA factura estaba vetado en la mutación y en el sub-tab «documentos» aunque la
   regla lo permite. Ahora la oferta se vacía por `limpiarSimulacion` y vuelve al panel de arranque.
2. **14**: la vía «no confirmada» retiraba sin `setReevalPend(true)` y la línea se recalculaba sola.
3. **OTG-01**: `revertirVisado` y `revertirExc` usaban `val`/`x` que no recibían → revertir reventaba con
   `ReferenceError`; y revertir un O05 físico ahora revoca su evidencia (`revocarEvidenciaContrato`).
4. **5**: el rechazo sin motivo grababa como causa el status de la etapa viva, el lector devolvía el genérico, cuatro
   escritores no grababan actor ni fecha, la bitácora decía «Sistema» en toda pérdida, y arrastrar una Perdida en el
   Kanban la revivía sin causa ni auditoría.
5. **15-quinquies** (guiones por campo ausente), **27-bis** (auditoría con el módulo viejo) y el texto de **RAT-01**.

## Bloqueos

- **El tag `v0.1.0` no llegó al remoto**: el proxy git del entorno remoto deniega `refs/tags/*` (HTTP 403, política de
  la organización; se reporta, no se rodea). Lo pone el usuario desde Windows:
  `git fetch origin main && git tag -a v0.1.0 bd14091 -m "v0.1.0 — bootstrap agéntico" && git push origin v0.1.0`.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate**: `vault/conocimiento/arquitectura.md` y `README.md` citan ~21.000 líneas,
   118 componentes y ~24 MB (medido: 25.9k / 154 / 40,7). Un commit T3 cuando el usuario diga.
2. **Líneas base de los auditores**: `BASE_MUERTOS` bajó a 6 (sale `lineaDeVersion`: el caso 124 la ejercita).
   Quedan 6 hallazgos «revisar a mano» y 7 `useState` sin uso: decidir uno por uno.
3. **Separación por género** de cada regla (regla → invariante · porqué → ADR · historia → log), regla por regla.
   **GN como disyunción** (regla 22) sigue pendiente de confirmar con el negocio.
5. `PipelineComercial` (2.9k líneas) y `DealDrawer` (2.8k) son el 22 % del fuente. Medida, no tarea.
6. **Hooks en Windows**: correr el health check de `loop_agentico_hooks.md` la primera vez. El CI avisa que
   `actions/checkout@v4` y `setup-node@v4` apuntan a Node 20 (deprecado): subir a `@v5` (T3).
7. Sub-viñetas sin gate ejecutable, declaradas en el log: la concentración por deudor del Directorio (regla 31).

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) ·
[hooks](../conocimiento/loop_agentico_hooks.md) · [flujo git](../conocimiento/flujo_git.md) ·
[arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [ADR](../adr/index.md)

## Última sesión

[17-09-2026 — cerrar la tabla de invariantes](./2026-09-17_cerrar_invariantes.md) ·
[17-09-2026 — merge a main y v0.1.0](./2026-09-17_merge_a_main.md) ·
[17-09-2026 — cablear los gates](./2026-09-17_cablear_gates.md)
