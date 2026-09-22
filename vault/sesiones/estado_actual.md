---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-22T01:00:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **158/158 PASA**, **50 archivos de gate de contrato**
(289 tests), **30 casos e2e** (30/30), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(87 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
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

> ## 🎯 Siguiente paso
>
> 1. **Cuando el usuario evalúe el spec del curse**: revisar concordancia con lo implementado, la matriz de
>    **gaps** (funcionales · de proceso · de dato/contrato) desde su Parte IV, las **historias de usuario**
>    por actor y etapa con criterios de aceptación, y los **casos de prueba** e2e en las dos direcciones.
> 2. **El tab VERIFICACIÓN**: (a) habilitarlo al SIMULAR; (b) chip **PRIME** + Nota Deudor en vez de «Lista
>    Blanca»; (c) **separar** la evaluación del DEUDOR (V00–V10) del **quiz por FACTURA**.
> 3. **UI**: el selector de sesión de la navbar, 1/3 más angosto y con elipsis (la página desborda por él a
>    1366 px) · **El join de empresas SIEMPRE por RUT** (8 sitios; T1) · `.bat` una vez · O01 · 28 · 13-quater.
## En vuelo · esta rama, encima de `main`: lo del **22-09** ([log](./2026-09-22_mesa_por_operacion_y_nota_rica.md))
La mesa por factura (53, 157) y el color del badge (54, 158); la firma del cliente cruza al tubo (**55**); el
scroller de la tabla es su propio panel (**56**: la card de «Oferta» se cortaba porque desbordaba la PÁGINA,
no la celda); la mesa va **operación → deudor colapsable → factura** con **panel lateral para las dos
decisiones** (53 ampliada: retirar plata ya no se resuelve con un sí/no sin motivo); la nota es **rica con
captura pegada** (**57**); la **oferta publicada se ve en el tubo** (**58**: el estado ya existía — cerrar no
asentaba `ofertaComunicada` y dos de los tres escritores no avisaban; `e2e-58`); y el **spec del proceso de
curse** (`Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md`): el modelo del negocio conciliado
cláusula por cláusula —16 implementadas · 19 distinto · 3 pendientes · 3 decisiones— con 6 contradicciones.

## Bloqueos · los dos son del usuario, desde Windows

El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403**, 6 de 6 en dos intentos. **Causa descartada
por medición**: las 14 ramas están `protected: false`, los pushes normales funcionan y el MCP tampoco expone
borrado. Quedan **el tag `v0.1.0`** sobre `bd14091` y **borrar 6 ramas ya integradas** (`elegant-fermat-pyfpnm`,
`migrate-project-session-vui9dl`, `sleepy-bohr-0x3j73`, `vibrant-hawking-qrzskw`, `vibrant-hopper-33tg8j`,
`local-mauricio-11sep`); **no se tocan** `respaldo/main-2026-09-17` ni las 5 sin mezclar.

## Deudas anotadas (no bloquean, no olvidar)

1. **Lista Blanca / Deudor Autorizado, decisiones de negocio**: el activo no trae
   `VIGENTE_DESDE`/`HASTA`/`ESTADO`/`FECHA_CORTE` —una lista blanca **nunca vence**—;
   `prime = Lista Blanca || Autorizado` deja **84%** en Prime; `CUPO_SUGERIDO_MM` sin leerse (ADR-0010).
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í`. Se arregla
   re-extrayendo del AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista**: el tubo se
   retrata a mitad del stream, así que capturar en un estado conocido es decisión suya.
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del
   Directorio (31) · una fila «Sin clasificar» dice «2 deudores» y el desglose suma 0 · **dos sesiones
   paralelas toman el mismo «siguiente entero libre»** (reglas, casos Y ADR): quien mezcla renumera.
4. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · los 13 skills de `taste-skill` viven en el
   `~/.claude/skills/` del CONTENEDOR · `gitflow_guard.mjs` bloquea `git merge-base --is-ancestor` creyéndolo
   un merge a `main`: usar `git branch -r --merged` · `invariantes.test.mjs` comprueba que el caso citado
   EXISTE, no que sea el correcto (tres citas corridas en +2 pasaron): cruzar número con título del caso.
## Conocimiento clave
[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · última sesión: [la mesa por operación y la nota rica](./2026-09-22_mesa_por_operacion_y_nota_rica.md)
