---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T14:10:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **141/141 PASA**, **33 archivos de gate de contrato**
(177 tests), **29 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (68 reglas verbatim por tema, índice en
`invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de invariantes**: cada regla y los 12
invariantes del contrato tienen gate; ninguna fila dice ya «sin gate». Lo que esos gates destaparon cambió el
producto —ocho defectos, abajo—. El generador tiene punto fijo (32, ADR-0003), el id de una operación es estable
(ADR-0004) con «Operación creada» + Editar (33) y el detalle sigue el mockup (29, 22); el 18-09 el tubo abre en
«Todos» (34), **una regla con un tramo sin área ya no se ejecuta ni se verifica** (35) y la **portada pasó a mostrar
el producto** con un solo morado de marca (36, 37, 38 · ADR-0005).

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado. **0. Correr el `.bat` una vez**: `build_app.ps1` cambió (embebe
> `arte_login.js`) y acá no se ejecuta; la simetría está gateada, no probada.
> 1. **Los 20 desfases regla↔código que midieron los gates** (`2026-09-17_cerrar_invariantes.md`). Los tres grandes:
>    la cláusula «tasa bajo el mínimo del deudor» de la regla 8 **no existe en el código**; `validarMutacion` tiene
>    **un solo call site** (LIN-01, GIR-01 y ATR-01 declarados y nunca invocados); y el `idProceso` del comité
>    **colisiona entre pestañas** y descarta la segunda en silencio.
> 2. **Decidir los datos**: razones sociales reales sobre RUT sintéticos — un ADR y un gate (hoy ningún test lo
>    afirma ni lo niega). · 3. Sacar `pipeline.zip` (**2,7 MB**, un build del 12-08 de un generado).

## En vuelo ahora · nada: todo está en `main`, sólo quedan las tareas del usuario (abajo)

| Trabajo | Integrado en `main` |
|---|---|
| **Portada que muestra el producto** (36, 37, 38 · ADR-0005): arte generado, un solo morado, zoom al dashboard. Los colores no llegaban a quien tenía config guardada: `cfgOper` subió a v2 con migración (39) | este merge |
| Invariantes · e2e · O05 · tab «Todos» (34) · regla mal definida (35) · paso 2 · auditorías · spec exc. | `d389379` |
| «Operación creada» + id estable + restyle (33, 29, 22 · ADR-0004) `8b75a03` · punto fijo (32 · ADR-0003) `3a27737` · gates y partir `CLAUDE.md` (ADR-0001/2) `bd14091` | ✓ |

## Lo que los gates destaparon (todo corregido; el detalle, en los logs)
**Ocho defectos de producto** (13-sexdecies, 14, OTG-01, 5, el reset, 15-quinquies, 27-bis, RAT-01), **el paso 2**
que no veía 11 declaraciones —una colisión sólo se sabía en el paso 5, sin nombrar el símbolo—, el health check de
hooks como comando, `cifras.test.mjs` contando lo que los documentos afirman, y los dos pendientes de regla que eran
defectos (27-bis, 33). Uno por uno: [invariantes](./2026-09-17_cerrar_invariantes.md) ·
[integración](./2026-09-18_integracion_y_tab_todos.md) · [auditorías](./2026-09-18_auditorias_y_paso_2.md) · [regla 35](./2026-09-18_regla_mal_definida.md).

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea). Queda
**el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas integradas**; hoy sólo quedan `main` y la de esta sesión.

## Deudas anotadas (no bloquean, no olvidar)

1. Del informe de cierre del bootstrap queda **uno**: **decidir el cuarteto de gates**, incompleto sin linter ni
   formateador y única desviación del skill sin ADR (el porqué del formateador ya está escrito en
   `loop_agentico_hooks.md`; falta el ADR que lo cierre). Los otros dos quedaron el 18-09:
   `conocimiento/despacho_agentes.md` y `.claude/rules/workflow.md` con la escalera T1/T2/T3, gateada.
2. **Auditores**: `BASE_MUERTOS` en 6; 6 hallazgos «revisar a mano» y 7 `useState` sin uso. · **GN como
   disyunción** (22), del negocio; la separación por género no es deuda (ADR-0001: regla por regla, al tocarla).
3. De los pendientes de las reglas quedan **decisiones, no defectos** (log de hoy): las filas que Operaciones
   repite del tubo y `STATUS_ETAPA` a tenant-aware (28); si el A1 real trae `MntNotaCredito` (13-quater, del dueño
   del dato). Sin gate: la concentración del Directorio (31).
4. **Hooks en Windows**: correr `node verificar_hooks.mjs` una vez; es lo único que el CI no puede atestiguar.
5. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** y el mismo archivo: pasó con las reglas
   32/33, con los casos 116–140 y con este tablero. Se confirma al mezclar `main`; quien mezcla después renumera.
6. **Al regenerar las capturas, regenerar `arte_login.js`** o la portada muestra una UI que ya no existe ·
   `marcaFondo` no está en el selector de colores de Configuración.
7. Los 13 skills de `taste-skill` viven en el `~/.claude/skills/` del CONTENEDOR, efímero: para tenerlos estables,
   `/plugin marketplace add leonxlnx/taste-skill` en la máquina del usuario.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) · [despacho de agentes](../conocimiento/despacho_agentes.md) · [flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [decisiones](../adr/index.md)
Últimas: [la portada muestra el producto](./2026-09-18_portada_que_muestra_el_producto.md) · [auditorías y paso 2](./2026-09-18_auditorias_y_paso_2.md) · [deudas cerradas](./2026-09-18_deudas_cerradas.md) · [spec de excepciones](./2026-09-18_spec_gestion_excepciones.md)
