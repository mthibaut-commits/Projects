---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T06:30:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **141/141 PASA**, **29 archivos de gate de contrato**
(177 tests), **29 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (64 reglas verbatim por tema, índice en
`invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de invariantes**: cada regla y los 12
invariantes del contrato tienen gate; ninguna fila dice ya «sin gate». Lo que esos gates destaparon cambió el
producto —ocho defectos, abajo—. El generador tiene punto fijo (32, ADR-0003), el id de una operación es estable
(ADR-0004) con «Operación creada» + Editar (33) y el detalle sigue el mockup (29, 22); el 18-09 el tubo abre en
«Todos» (34) y **una regla mal definida ya no se ejecuta ni se verifica** (35).

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado.
> 1. **Los 20 desfases regla↔código que midieron los gates** (`2026-09-17_cerrar_invariantes.md`). Los tres grandes:
>    la cláusula «tasa bajo el mínimo del deudor» de la regla 8 **no existe en el código**; `validarMutacion` tiene
>    **un solo call site** (LIN-01, GIR-01 y ATR-01 declarados y nunca invocados); y el `idProceso` de la solicitud
>    al comité **colisiona entre pestañas** y descarta la segunda en silencio.
> 2. **Decidir los datos**: razones sociales reales sobre RUT sintéticos — un ADR y un gate que lo sostenga (hoy
>    ningún test lo afirma ni lo niega). · 3. Sacar `pipeline.zip` (29,6 MB) del versionado.

## En vuelo ahora · nada: todo está en `main`, sólo quedan las tareas del usuario (abajo)

| Trabajo | Integrado en `main` |
|---|---|
| Invariantes · e2e · O05 · tab «Todos» (34) · regla mal definida (35) · paso 2 · auditorías · spec exc. | este merge |
| «Operación creada» + Editar · id estable · restyle del detalle (33, 29, 22 · ADR-0004) | `8b75a03` |
| Punto fijo del generador (32 · ADR-0003) `3a27737` · gates + partir `CLAUDE.md` (ADR-0001/2) `bd14091` | ✓ |

## Lo que los gates destaparon (corregido en el mismo commit)
**Ocho defectos de producto**: retirar la última factura vetado aunque la 13-sexdecies lo permite · la vía «no
confirmada» sin re-evaluación (14) · `revertirVisado`/`revertirExc` con `ReferenceError` y un O05 revertido sin
revocar su evidencia (OTG-01) · una Perdida que revivía (5) · el reset escondido por el paquete cerrado · más
15-quinquies, 27-bis y RAT-01.
**Y el paso 2 de la verificación**, que no veía 11 declaraciones (diez `async function` y el `export default`): una
colisión sólo se sabía en el paso 5, dos minutos más tarde y sin nombrar el símbolo. Ahora usa el patrón del auditor
con cola `$NF`, y `fuente.test.mjs` exige que `CLAUDE.md`, el vault y el CI escriban el MISMO paso 2. Y el 18-09: el
**health check de hooks es un comando** (`node verificar_hooks.mjs`, gateado; el CI subió a `@v5`),
**`cifras.test.mjs`** cuenta lo que los documentos afirman, y caen los dos pendientes de regla que eran defectos: el
`<h1>` de Reportes (27-bis) y la guarda contra una solicitud duplicada, que cruza de pestaña (33). Uno por uno:
[invariantes](./2026-09-17_cerrar_invariantes.md) · [integración](./2026-09-18_integracion_y_tab_todos.md) ·
[auditorías](./2026-09-18_auditorias_y_paso_2.md) · [regla 35](./2026-09-18_regla_mal_definida.md).

## Bloqueos · los dos son del usuario, desde Windows

El proxy git del contenedor deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se
rodea), y el MCP de GitHub sólo sabe crear ramas. Queda **el tag `v0.1.0`** sobre `bd14091`
(`git tag -a v0.1.0 … && git push origin v0.1.0`) y **borrar las ramas ya integradas** (`git push origin --delete`).

## Deudas anotadas (no bloquean, no olvidar)

1. **Auditores**: `BASE_MUERTOS` bajó a 6 (sale `lineaDeVersion`: el caso 124 la ejercita); quedan 6 hallazgos
   «revisar a mano» y 7 `useState` sin uso, uno por uno. · 2. **GN como disyunción** (22), pendiente del negocio;
   la separación por género no es deuda: ADR-0001 la decidió regla por regla, al tocarla.
3. De los pendientes de las reglas quedan **decisiones, no defectos** (log de hoy): las filas que Operaciones
   repite del tubo y `STATUS_ETAPA` a tenant-aware con sus regexes (28); si el A1 real trae `MntNotaCredito`
   (13-quater, pregunta al dueño del dato). Sin gate: la concentración del Directorio (31).
4. **Hooks en Windows**: correr `node verificar_hooks.mjs` una vez; es lo único que el CI no puede atestiguar.
5. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** y el mismo archivo: pasó con las reglas
   32/33, con los casos 116–140 y con este tablero. Se confirma al mezclar `main`; quien mezcla después renumera.
6. Los 13 skills de `taste-skill` están en el `~/.claude/skills/` del CONTENEDOR, efímero: para tenerlos estables,
   `/plugin marketplace add leonxlnx/taste-skill` en la máquina del usuario.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) ·
[flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [decisiones](../adr/index.md) · últimas:
[auditorías y paso 2](./2026-09-18_auditorias_y_paso_2.md) · [deudas cerradas](./2026-09-18_deudas_cerradas.md) · [spec de excepciones](./2026-09-18_spec_gestion_excepciones.md)
