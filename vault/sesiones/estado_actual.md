---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T04:10:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **140/140 PASA**, gates de contrato y **29 casos e2e**,
`tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault, cableó sus gates (ADR-0001, ADR-0002) y **cerró la
tabla de invariantes**: las **63 reglas** de dominio y los 12 invariantes del contrato tienen gate; ninguna fila dice
ya «sin gate». El generador tiene **punto fijo** (regla 32, ADR-0003) y el id de una operación es **estable**, con
«Operación creada» + Editar y el detalle simulado según el mockup (regla 33, ADR-0004, reglas 29 y 22).

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
| Invariantes cerradas · e2e · renombre O05 · tab «Todos» · spec de excepciones | este merge |
| «Operación creada» + Editar · id estable · restyle del detalle (33, 29, 22 · ADR-0004) | `8b75a03` |
| Punto fijo del generador (32 · ADR-0003) | `3a27737` |
| Cablear los gates · partir `CLAUDE.md` (ADR-0001, ADR-0002) | `bd14091` |

## Defectos de producto que destaparon los gates (corregidos en el mismo commit)

Retirar la última factura vetado aunque la 13-sexdecies lo permite · la vía «no confirmada» sin re-evaluación (14) ·
`revertirVisado`/`revertirExc` con `ReferenceError` y un O05 revertido sin revocar su evidencia (OTG-01) · una
Perdida que revivía arrastrándola (5) · el paquete cerrado escondía el reset que 13-quaterdecies exige visible ·
más 15-quinquies, 27-bis y RAT-01. Uno por uno: [invariantes](./2026-09-17_cerrar_invariantes.md) ·
[integración](./2026-09-18_integracion_y_tab_todos.md).

## Bloqueos

- **El tag `v0.1.0` no llegó al remoto**: el proxy git deniega `refs/tags/*` (HTTP 403, política; se reporta, no se
  rodea). Lo pone el usuario desde Windows sobre `bd14091` (`git tag -a v0.1.0 … && git push origin v0.1.0`).
- **Borrar las ramas ya integradas** también es del usuario (`git push origin --delete <rama>`): el proxy deniega el
  borrado desde el contenedor y el MCP de GitHub sólo sabe crear ramas.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate**: `arquitectura.md` y `README.md` citan ~21.000 líneas, 118 componentes y ~24 MB
   (medido: ~26.1k / 154 / 40,7). Un commit T3 cuando el usuario diga.
2. **Auditores**: `BASE_MUERTOS` bajó a 6; quedan 6 hallazgos «revisar a mano» y 7 `useState` sin uso, uno por uno.
3. **Separación por género** de cada regla (regla → invariante · porqué → ADR · historia → log), al tocarla, y
   **GN como disyunción** (22) pendiente con el negocio. · 4. `PipelineComercial` y `DealDrawer` (~2.9k líneas
   cada uno) son el 22 % del fuente: medida, no tarea.
5. Pendientes que las reglas dejan escritos: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis);
   `STATUS_ETAPA` no es tenant-aware y `OperacionesView` duplica filas del tubo (28); el A1 no trae
   `MntNotaCredito` (13-quater); la guarda contra una solicitud duplicada al comité sólo ve las de su pestaña (33);
   y sin gate ejecutable, declarada en el log, la concentración por deudor del Directorio (31).
6. **Hooks en Windows**: correr el health check de `loop_agentico_hooks.md` la primera vez; y el CI avisa que
   `actions/checkout@v4`/`setup-node@v4` apuntan a Node 20 (subir a `@v5`, T3).
7. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** (pasó con la regla 32/ADR-0003 y el caso 116,
   hoy 140): el número se confirma al mezclar `main`, y quien mezcla después renumera lo suyo.
8. Los 13 skills de `taste-skill` quedaron en el `~/.claude/skills/` del CONTENEDOR, efímero: para tenerlos
   estables va `/plugin marketplace add leonxlnx/taste-skill` en la máquina del usuario.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) ·
[flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [decisiones](../adr/index.md) ·
últimas: [integración](./2026-09-18_integracion_y_tab_todos.md) · [spec de excepciones](./2026-09-18_spec_gestion_excepciones.md)
