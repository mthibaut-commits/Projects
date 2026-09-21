---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-21T23:58:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 41,3 MB, **145/145 PASA**, **36 archivos de gate de contrato**
(249 tests), **29 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (71 reglas verbatim
por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de invariantes**:
cada regla y los 12 del contrato tienen gate. Lo que destaparon cambió el producto —ocho defectos, abajo—. El
generador tiene punto fijo (32, ADR-0003), el id de una operación es estable (ADR-0004) con «Operación creada» +
Editar (33) y el detalle sigue el mockup (29, 22); el 18-09 el tubo abre en «Todos» (34), **una regla con un tramo
sin aprobador posible ya no se ejecuta ni se verifica** (35), la **portada muestra el producto** (36–38 · ADR-0005), el
orden de la tabla es **prioridad de gestión** y la Bandeja Inbound deja de botar trabajo en silencio (30-bis, 40),
con el fuente **formateado con Prettier** (ADR-0006); y el 21-09 la **identidad de la sesión es una sola** (41) y el **atajo del otorgamiento no se salta el visado** (42).

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

## En vuelo ahora · `claude/migrate-project-session-vui9dl`: los dos defectos del 21-09, verdes; falta mezclar

| Trabajo | Integrado en `main` |
|---|---|
| **Identidad de la sesión** (41) y **atajo del otorgamiento automático** (42): el selector de la demo cambia `SESION.usuario` —antes la mesa le negaba marcar a la Ejecutiva de verificación— y `otorgAuto` deja de saltarse OTG-02: con criterios por aprobar no hay cartel verde ni avance a «Pendiente Integración» (144, 145) | **no, en la rama** |
| **Regla 35, ampliada por el usuario**: una regla excepcionable sin nadie que pueda firmarla tampoco se ejecuta (tres causas, tres mantenedores). La compuerta recibe el PADRÓN por parámetro y el núcleo se partió en `cargoDeAreaNivel` para no sacar a `evalReglaCli` de las puras (caso 143) | `895845c` |
| **Portada que muestra el producto** (36, 37, 38 · ADR-0005): arte generado, un solo morado, zoom al dashboard. Los colores no llegaban a quien tenía config guardada: `cfgOper` subió a v2 con migración (39) | `daf3493` |
| Invariantes · e2e · O05 · tab «Todos» (34) · regla mal definida (35) · paso 2 · auditorías · spec exc. `d389379` · «Operación creada» + id estable + restyle (33, 29, 22 · ADR-0004) `8b75a03` · punto fijo (32 · ADR-0003) `3a27737` · gates y partir `CLAUDE.md` (ADR-0001/2) `bd14091` | ✓ |

## Lo que los gates destaparon (todo corregido; el detalle, en los logs)
**Ocho defectos de producto** (13-sexdecies, 14, OTG-01, 5, el reset, 15-quinquies, 27-bis, RAT-01), **el paso 2**
que no veía 11 declaraciones —una colisión sólo se sabía en el paso 5, sin nombrar el símbolo—, el health check de
hooks como comando, `cifras.test.mjs`, y los dos pendientes de regla que eran defectos (27-bis, 33). Uno por uno: [invariantes](./2026-09-17_cerrar_invariantes.md) ·
[integración](./2026-09-18_integracion_y_tab_todos.md) · [auditorías](./2026-09-18_auditorias_y_paso_2.md) · [regla 35](./2026-09-18_regla_mal_definida.md) y su [ampliación](./2026-09-18_regla_sin_aprobador.md).

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea). Queda **el tag
`v0.1.0`** sobre `bd14091` y **borrar las 7 remotas integradas** (`git branch -r --merged main`; una es el respaldo).

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
5. **Dos sesiones paralelas toman el mismo entero libre y el mismo archivo**: pasó con 32/33, los casos 116–140,
   este tablero, y el 18-09 con la regla 36 y el ADR-0005 a la vez. Quien mezcla después renumera lo suyo.
6. **Al regenerar las capturas, regenerar `arte_login.js`** o la portada muestra una UI que ya no existe; y
   `marcaFondo` no está en el selector de colores de Configuración. · 7. Los 13 skills de `taste-skill` viven en
   el `~/.claude/skills/` del CONTENEDOR, efímero: van con `/plugin marketplace add leonxlnx/taste-skill`.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) · [despacho de agentes](../conocimiento/despacho_agentes.md) · [flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [decisiones](../adr/index.md)
Últimas: [identidad y atajo](./2026-09-21_identidad_y_atajo_otorgamiento.md) · [sin aprobador](./2026-09-18_regla_sin_aprobador.md) · [portada](./2026-09-18_portada_que_muestra_el_producto.md) · [orden y bandeja](./2026-09-18_orden_tabla_y_bandeja.md)
