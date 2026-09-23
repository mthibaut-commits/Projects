---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-23T09:45:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **169/169 PASA**, **59 archivos de gate de contrato**
(515 tests), **37 casos e2e** (37/37), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(98 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
gate. La crónica del 17 al 19-09 vive en sus logs (ADR-0001 a 0006, el linter como paso 0-bis).
El **20-09** entró todo lo de plata: **regla 8 sin proxy** (149, ADR-0008), **girar no es acción de NEX**
(43, 147, 148), **ATR-01 en el handler** (145), el **id de la solicitud al comité** (146), las
**identidades son pares reales del AEC** (42, ADR-0009), los **controles de la integración al core** (41,
ADR-0007) y las **líneas** (44–46, ADR-0010 y 0011); casos 150–151.

El **21-09 y 22-09**, en dos sesiones paralelas mezcladas acá: la **identidad de la sesión es una sola**
(47), el **atajo del otorgamiento no se salta el visado** (48), el **stream del inbound se reparte por ROL**
(49), el **cierre le escribe a quien firma** (50), **un defecto, tres síntomas** (51, ADR-0012: `PRE_EVAL` y
`HILOS` eran `let` de módulo y el detalle es pestaña propia), **`Configuración › Tenants`** (52) y el orden de
la carpeta (`Auditoria/` mide, `Regresiones/` coteja; gate `rutas.test.mjs`). Logs del 21-09 en `sesiones/`.
Y el **tab de Verificación** (59): se ve al SIMULAR —informativo, porque lo que la compuerta de la regla 6
protege es la LLAMADA y no la información—, el chip del deudor dice **Prime** y la nota va rotulada en vez
de «Lista Blanca», y los criterios V00–V10 subieron al panel del DEUDOR dejando en la factura sólo su quiz
telefónico ([log](./2026-09-22_el_deudor_decide_la_factura_se_llama.md)).

> ## 🎯 Siguiente paso
>
> 1. **El backlog decidido, en rojo primero** (`Regresiones/Gaps_Proceso_Curse_2026-09-22.md` §2.2; los casos y su
>    orden en `vault/specs/proceso-curse/casos_de_prueba.md`). **Hechos el 23-09** (regla, gate y `CASOS_ESPERADOS` en
>    cada commit): ADR-0013 (un evento, cinco versiones: regla 68, caso 168) · 0014 · 0015 · 0016 · 0017 · 0018 ·
>    0019 · antigüedad ≤20 días · corte y reinicio por hora · M-19 en `cerrarOferta` · M-01 (el acuse del DTE:
>    regla 69, caso 169; el A1 ya lo traía). **El backlog decidido del 22-09 quedó entero**: 18 gaps implementados
>    ([log](./2026-09-23_backlog_decidido.md) §1–§11), con sus pantallas en `28_version_v1.e2e.mjs` (`e2e-68-a/b/c/d`,
>    `e2e-69-a`). Sigue: los T1 sin decisión previa (gaps §2.2: G-05, G-18, G-23 … G-28), cada uno con su caso en rojo.
> 2. **UI**: el selector de sesión de la navbar, 1/3 más angosto y con elipsis (desborda a 1366 px) · el chip
>    «Negociación» en una operación ya enviada a comité · **join de empresas SIEMPRE por RUT** (8 sitios; T1) ·
>    `.bat` una vez · O01 · 28 · 13-quater.
## En vuelo · esta rama, encima de `main`: lo del **22 y 23-09** ([log](./2026-09-22_mesa_por_operacion_y_nota_rica.md))
La mesa por factura (53, 157) y el color del badge (54, 158); la firma cruza al tubo (**55**); el scroller de la
tabla es su propio panel (**56**); la mesa va **operación → deudor colapsable → factura** con **panel lateral** para
las dos decisiones (53 ampliada); la nota es **rica con captura pegada** (**57**); la **oferta publicada se ve en el
tubo** (**58**, `e2e-58`). Y el **proceso de curse documentado de punta a punta**: el spec
(`Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md`; 40 cláusulas: 39 implementadas · 1 distinto · 0
pendientes · 0 abiertas), el informe de **gaps** (36 G-nn + 12 documentales: 8 cerrados · 18 implementados · 0
decididos · 0 por confirmar · 10 sin decisión), las **42 historias de usuario** (32 vigentes · 10 por implementar · 0 por confirmar) y
los **casos de prueba** (143 ids, 133 con caso; 121 casos nuevos: e2e 50 · suite 66 · contrato 5). Las decisiones del
usuario del 22 y 23-09 están en el log §8 y en **ADR-0013 … ADR-0019**; el 23-09 cerró las cinco preguntas que quedaban.

## Bloqueos · los dos son del usuario, desde Windows
El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (6 de 6; las 14 ramas están `protected: false`, los
pushes normales funcionan y el MCP tampoco expone borrado). Quedan **el tag `v0.1.0`** sobre `bd14091` y **borrar 6
ramas ya integradas** (`elegant-fermat-pyfpnm`, `migrate-project-session-vui9dl`, `sleepy-bohr-0x3j73`,
`vibrant-hawking-qrzskw`, `vibrant-hopper-33tg8j`, `local-mauricio-11sep`); no se tocan `respaldo/main-2026-09-17` ni las 5 sin mezclar.

## Deudas anotadas (no bloquean, no olvidar)

1. **Lista Blanca / Deudor Autorizado, decisiones de negocio**: el activo no trae
   `VIGENTE_DESDE`/`HASTA`/`ESTADO`/`FECHA_CORTE` —una lista blanca **nunca vence**—;
   `prime = Lista Blanca || Autorizado` deja **84%** en Prime; `CUPO_SUGERIDO_MM` sin leerse (ADR-0010).
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í`. Se arregla
   re-extrayendo del AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista**: el tubo se
   retrata a mitad del stream, así que capturar en un estado conocido es decisión suya.
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · `PANEL_TAREAS` es `let` de módulo sin storage ni aviso: la tarea creada en el DETALLE no llega al tubo (familia de la 51; medido el 23-09 con la regla 66) · sin gate, la concentración del
   Directorio (31) · una fila «Sin clasificar» dice «2 deudores» y el desglose suma 0 · **dos sesiones
   paralelas toman el mismo «siguiente entero libre»** (reglas, casos, ADR y archivos e2e): quien mezcla renumera.
4. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · los 13 skills de `taste-skill` viven en el
   `~/.claude/skills/` del CONTENEDOR · `gitflow_guard.mjs` bloquea `git merge-base --is-ancestor` creyéndolo
   un merge a `main`: usar `git branch -r --merged` · `invariantes.test.mjs` comprueba que el caso citado
   EXISTE, no que sea el correcto (tres citas corridas en +2 pasaron): cruzar número con título del caso.
## Conocimiento clave
[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [el backlog decidido, entero](./2026-09-23_backlog_decidido.md) · [el deudor decide, la factura se llama](./2026-09-22_el_deudor_decide_la_factura_se_llama.md) · [la mesa por operación y la nota rica](./2026-09-22_mesa_por_operacion_y_nota_rica.md)
