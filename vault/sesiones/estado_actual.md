---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T20:30:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 41,1 MB, **142/142 PASA**, **30 archivos de gate de contrato**
(202 tests), **29 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (65 reglas
verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de
invariantes**: cada regla y los 12 del contrato tienen gate. Lo que esos gates destaparon cambió el producto
—ocho defectos, abajo—. El generador tiene punto fijo (32, ADR-0003), el id de una operación es estable (ADR-0004)
con «Operación creada» + Editar (33) y el detalle sigue el mockup (29, 22); el 18-09 el tubo abre en «Todos» (34),
**una regla con un tramo de excepción sin área ya no se ejecuta
ni se verifica** (35), el orden de la tabla es **prioridad de gestión**, la Bandeja Inbound deja de botar trabajo
en silencio (30-bis, 36) y el fuente quedó **formateado con Prettier** (ADR-0005), con `prettier --check` como
paso 0 del CI y los 59 gates de texto que cayeron re-anclados sobre `canonico()`.

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado.
> 1. **Los 20 desfases regla↔código que midieron los gates** (`2026-09-17_cerrar_invariantes.md`). Los tres grandes:
>    la cláusula «tasa bajo el mínimo del deudor» de la regla 8 **no existe en el código**; `validarMutacion` tiene
>    **un solo call site** (LIN-01, GIR-01 y ATR-01 declarados y nunca invocados); y el `idProceso` de la solicitud
>    al comité **colisiona entre pestañas** y descarta la segunda en silencio. Se suma uno medido el 18-09:
>    `giroDeal` es el único lector de `GIRO_STATE` —la asignación congelada de giros— y **nadie lo llama**, ni
>    `GIRO_STATE` tiene escritor: «la congelada manda sobre el recálculo del día» está probada con estado
>    inyectado y no ocurre en ninguna pantalla. Cablearla pide decidir cuándo congela: ¿al aceptar, al firmar?
> 2. **Decidir los datos**: razones sociales reales sobre RUT sintéticos — un ADR y un gate que lo sostenga (hoy
>    ningún test lo afirma ni lo niega). · 3. **El LINTER**, lo único que le falta al cuarteto de gates: sobre
>    49.583 líneas sin `package.json`, pide decidir qué reglas y qué hacer con lo que reporte del legado.

## En vuelo ahora · nada: todo está en `main`, sólo quedan las tareas del usuario (abajo)

Integrado: formateo del fuente y re-anclaje de los gates (ADR-0005) · invariantes · e2e · O05 · tab «Todos» (34) ·
regla mal definida (35) · paso 2 · auditorías · spec de excepciones · escalera T1-T3 · despacho de agentes ·
«Operación creada» + Editar e id estable (33, 29, 22, ADR-0004, `8b75a03`) · punto fijo del generador
(32, ADR-0003, `3a27737`) · gates y partir `CLAUDE.md` (`bd14091`). ~~`pipeline.zip`~~ fuera del versionado.

## Lo que los gates destaparon

**Ocho defectos de producto** y el **paso 2** de la verificación, que no veía once declaraciones. Uno por uno, con su
porqué: [invariantes](./2026-09-17_cerrar_invariantes.md) · [integración](./2026-09-18_integracion_y_tab_todos.md) ·
[auditorías](./2026-09-18_auditorias_y_paso_2.md) · [deudas](./2026-09-18_deudas_cerradas.md) · [regla 35](./2026-09-18_regla_mal_definida.md) · [formateo](./2026-09-18_formatear_el_fuente.md).

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea). Queda
**el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas integradas**; hoy sólo quedan `main` y la de esta sesión.

## Deudas anotadas (no bloquean, no olvidar)

1. **Auditores, revisados el 18-09**: `BASE_MUERTOS` baja de 6 a **1** sin borrar nada (cuatro eran un mismo falso
   positivo —un `const` local a columna 0—, el quinto un catálogo que ahora sí gobierna, y el que queda subió a
   «siguiente paso»); los 7 `useState` quedan con su veredicto uno por uno en `auditores.test.mjs`. Formatear
   destapó dos puntos ciegos más, los dos corregidos: `BASE_PURAS` cargaba a `lineaDeDeudor`, que **nunca fue
   pura** (cuerpo de una línea, invisible al auditor), y la sección C cortaba las firmas a las 12 líneas.
2. **GN como disyunción** (22), del negocio; la separación por género no es deuda (ADR-0001: regla por regla).
3. De los pendientes de las reglas quedan **decisiones, no defectos**: las filas que Operaciones repite del tubo y
   `STATUS_ETAPA` a tenant-aware (28); si el A1 trae `MntNotaCredito` (13-quater). Sin gate, la concentración (31).
4. **Hooks en Windows**: `node verificar_hooks.mjs` una vez; es lo único que el CI no atestigua. · **`Capturas_UI/`
   NO es determinista**: dos corridas del mismo build dan tablas distintas porque el tubo se retrata a mitad del
   stream (el 18-09 volvió a pasar, en `10-tubo-kanban.html`). Capturar en un estado conocido (stream pausado, o
   Modo Directorio, determinista por construcción, 31) cambia QUÉ muestra la fuente de Figma: decisión suya.
5. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** y el mismo archivo: pasó con las reglas
   32/33, con los casos 116–140 y con este tablero. Se confirma al mezclar `main`; quien mezcla después renumera.
6. Los 13 skills de `taste-skill` viven en el `~/.claude/skills/` del CONTENEDOR, efímero: para tenerlos estables, `/plugin marketplace add leonxlnx/taste-skill` en la máquina del usuario.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) · [despacho de agentes](../conocimiento/despacho_agentes.md) · [flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [decisiones](../adr/index.md)
Últimas: [formateo](./2026-09-18_formatear_el_fuente.md) · [orden y bandeja](./2026-09-18_orden_tabla_y_bandeja.md) · [auditorías y paso 2](./2026-09-18_auditorias_y_paso_2.md)
