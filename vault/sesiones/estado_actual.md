---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-19T02:00:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 41,1 MB, **145/145 PASA**, **32 archivos de gate de contrato**
(208 tests), **29 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (66 reglas
verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de
invariantes**: cada regla y los 12 del contrato tienen gate. Lo que esos gates destaparon cambió el producto
—los defectos, abajo—. El generador tiene punto fijo (32, ADR-0003), el id de una operación es estable (ADR-0004)
con «Operación creada» + Editar (33) y el detalle sigue el mockup (29, 22); el 18-09 el tubo abre en «Todos» (34),
**una regla mal definida ya no se ejecuta ni se verifica** (35), el orden de la tabla es **prioridad de gestión** y
la Bandeja Inbound deja de botar trabajo en silencio (30-bis, 36), el fuente quedó **formateado con Prettier**
(ADR-0005) con `prettier --check` como paso 0 del CI, y **ATR-01 se comprueba en el handler** (caso 143,
`regla_atr_01.test.mjs`), **GIR-01 y OTG-02 se comprueban en `moverEtapa`** (`regla_transiciones.test.mjs`) y
el campo `aplicado` de `INVARIANTES` quedó **gateado** —ya no hay ningún invariante sostenido sólo por la pantalla—
y la **solicitud al comité dejó de perderse por un id repetido** (144). El 19-09, corrección de ALCANCE del usuario:
**girar no es una acción de NEX** — el sistema termina en la inyección a Tesorería, que autoriza Operaciones, y
el giro vuelve como **callback** (37, 145). El **linter** cierra el cuarteto de gates: `eslint` en 0, paso 0-bis.

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado.
> 1. **`giroDeal`/`GIRO_STATE`**: el paquete que vale es el que se INYECTA, así que si se congela la asignación de
>    giros se congela ahí (regla 37) — pero `giroDeal` sigue sin llamador y `GIRO_STATE` sin escritor. Cablearlo es
>    decisión de producto. · El callback de giro quedó **cerrado el 19-09** (145).
> 2. **Regla 8**: la cláusula «tasa bajo el mínimo del deudor» no se computa, y no por un predicado que falte —es de
>    una línea— sino porque **el evento que lo dispararía no existe**: nadie registra que el cliente pidió tasa bajo
>    el mínimo (medido: 1.889 de 5.520 contactos la piden, 0 marcados). Implementarlo es inventar un canal.
> 3. **Decidir los datos**: razones sociales reales sobre RUT sintéticos — un ADR y un gate que lo sostenga (hoy
>    ningún test lo afirma ni lo niega). Es lo único del bootstrap que sigue sin cerrar.

## En vuelo ahora · nada: todo está en `main`, sólo quedan las tareas del usuario (abajo)

Integrado: el callback de giro y el linter (37, 145) · girar fuera de NEX · el id de la solicitud (15-bis-bis) ·
OTG-02 en `moverEtapa` · ATR-01 y el gate de `aplicado` · formateo del fuente y re-anclaje de los gates (ADR-0005)
· invariantes · e2e · O05 · tab «Todos» (34) · regla mal definida (35) · paso 2 · auditorías · spec de excepciones
· escalera T1-T3 · despacho de agentes · «Operación creada» + Editar e id estable (33, 29, 22, ADR-0004) · punto
fijo del generador (32, ADR-0003) · gates y partir `CLAUDE.md` (`bd14091`). ~~`pipeline.zip`~~ fuera del versionado.

**Lo que los gates destaparon**: nueve defectos de producto y el paso 2, que no veía once declaraciones. Uno por
uno: [invariantes](./2026-09-17_cerrar_invariantes.md) · [integración](./2026-09-18_integracion_y_tab_todos.md) · [auditorías](./2026-09-18_auditorias_y_paso_2.md) · [regla 35](./2026-09-18_regla_mal_definida.md) · [formateo](./2026-09-18_formatear_el_fuente.md) · [ATR-01](./2026-09-18_atr_01_en_el_handler.md).

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea). Queda
**el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas integradas**; hoy sólo quedan `main` y la de esta sesión.

## Deudas anotadas (no bloquean, no olvidar)

1. **Auditores, revisados el 18-09** (detalle en `auditores.test.mjs`): `BASE_MUERTOS` baja de 6 a **1** sin borrar
   nada y los 7 `useState` quedan con su veredicto. Formatear destapó dos puntos ciegos, corregidos.
2. **GN como disyunción** (22), del negocio. De los pendientes de las reglas quedan **decisiones, no defectos**:
   las filas que Operaciones repite del tubo y `STATUS_ETAPA` a tenant-aware (28); si el A1 trae `MntNotaCredito`
   (13-quater). Sin gate, la concentración del Directorio (31).
3. **Hooks en Windows**: `node verificar_hooks.mjs` una vez; es lo único que el CI no atestigua. · **`Capturas_UI/`
   NO es determinista**: el tubo se retrata a mitad del stream. Capturar en un estado conocido (stream pausado, o
   Modo Directorio, 31) cambia QUÉ muestra la fuente de Figma: decisión suya.
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** (reglas 32/33, casos 116–140, el 142 del
   18-09, este tablero): quien mezcla después renumera. · Los 13 skills de `taste-skill` viven en el
   `~/.claude/skills/` del CONTENEDOR, efímero: `/plugin marketplace add leonxlnx/taste-skill` en su máquina.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) · [despacho de agentes](../conocimiento/despacho_agentes.md) · [flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [decisiones](../adr/index.md)
Últimas: [callback de giro y linter](./2026-09-19_callback_de_giro_y_linter.md) · [girar no es de NEX](./2026-09-19_girar_no_es_de_nex.md) · [id de la solicitud](./2026-09-18_id_solicitud_comite.md)
