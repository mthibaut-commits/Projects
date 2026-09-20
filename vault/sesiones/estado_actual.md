---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-20T04:00:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 41,1 MB, **147/147 PASA**, **33 archivos de gate de contrato**
(217 tests), **29 casos e2e** (28 en verde: el 29-b, abajo), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (67 reglas
verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de
invariantes**: cada regla y los 12 del contrato tienen gate. Lo que destaparon cambió el producto, y la
crónica del 17 y 18-09 vive en sus logs: punto fijo del generador (32, ADR-0003), id estable (33, ADR-0004),
tubo en «Todos» (34), regla mal definida (35), orden por prioridad y Bandeja Inbound (30-bis, 36), formateo
con Prettier (ADR-0005), ATR-01 en el handler (143), GIR-01/OTG-02 en `moverEtapa`, `aplicado` gateado y el
id de la solicitud al comité (144). El 19-09, corrección de ALCANCE del usuario:
**girar no es una acción de NEX** — el sistema termina en la inyección a Tesorería, que autoriza Operaciones, y
el giro vuelve como **callback** y la asignación se **congela en la inyección** (37, 145, 146). El **linter**
cierra el cuarteto de gates: `eslint` en 0, paso 0-bis. Y la **regla 8 deja de ser proxy**: la tasa simulada se
valida contra el mínimo DEL DEUDOR y perforarlo sale de atribución (147, ADR-0006) — el piso de riesgo era
techo del Agente IA y no del ejecutivo, y 5.154 pares salían «ok» bajo él. El **20-09** las identidades pasan a ser
**pares reales del AEC** de BICE Factoring (42, ADR-0007): sólo identidad, ninguna transacción, y sin las
93 personas naturales del archivo. Se fue el **39,3 % de RUT de deudor en rango de persona**.

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado.
> 0. **`e2e-29-b` EN ROJO**, y no es la app: con el padrón real ninguna operación del Directorio trae ya un
>    deudor de **cupo cero**, así que la rama «sale entero de la oferta» de «Sacar facturas sin línea» no se
>    puede ejercitar. Las salidas son aflojar la aserción (prohibido) o que la regla 31 garantice ese deudor
>    —requisito NUEVO, con gate—. Decisión de producto; el diagnóstico completo está en el log del 20-09.
> 1. **LA MEZCLA CON `main`**, que bloquea todo lo demás: 10 commits de esta rama fuera, 26 de otras sesiones,
>    9 archivos en conflicto y la colisión de numeración (la 37 de esta rama debe pasar a **41**; la 42 ya se
>    tomó contándola). El push a `main` necesita permiso del usuario. · 2. **Regla 28**
>    (`STATUS_ETAPA` a tenant-aware, las filas que Operaciones repite) y **13-quater** (si el A1 real trae
>    `MntNotaCredito`): las dos son de negocio. · 3. **Motor O01**: conserva la versión débil del hueco de la
>    regla 8 (compara contra el promedio ponderado sin pasarle el piso); es una línea y una decisión de
>    negocio. · 4. **Determinismo de `Capturas_UI/`**: capturar en un estado
>    conocido cambia QUÉ muestra la fuente de Figma.

## En vuelo ahora · nada: todo está en `main`, sólo quedan las tareas del usuario (abajo)

Integrado: el padrón real del AEC (42, ADR-0007) · la regla 8 contra el mínimo del deudor (147, ADR-0006) ·
el giro congelado, su callback y el linter (37, 145, 146) · girar fuera de NEX · el id de la solicitud
(15-bis-bis) · OTG-02 en `moverEtapa` · ATR-01 y el gate de `aplicado` · formateo y re-anclaje (ADR-0005) ·
invariantes · e2e · tab «Todos» (34) · regla 35 · paso 2 · auditorías · escalera T1-T3 · despacho de agentes ·
id estable (33, ADR-0004) · punto fijo del generador (32, ADR-0003). ~~`pipeline.zip`~~ fuera del versionado.

**Lo que los gates destaparon**: nueve defectos de producto y el paso 2. Uno por uno, en los logs del 17 y 18-09.

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

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto, en [`vault/index.md`](../index.md)
Últimas: [el padrón real](./2026-09-20_padron_real_del_aec.md) · [la tasa contra el deudor](./2026-09-19_la_tasa_se_valida_contra_el_deudor.md) · [congelar el giro](./2026-09-19_congelar_el_giro_en_la_inyeccion.md) · [callback y linter](./2026-09-19_callback_de_giro_y_linter.md) · [girar no es de NEX](./2026-09-19_girar_no_es_de_nex.md)
