---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-21T20:10:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **152/152 PASA**, **41 archivos de gate de contrato**
(289 tests), **29 casos e2e** (29/29), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su
vault (77 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato
tienen gate. La crónica del 17 al 19-09 vive en sus logs (ADR-0001 a 0006, el linter como paso 0-bis).

El **20-09** entró todo lo de plata: **regla 8 sin proxy** (149, ADR-0008), **girar no es acción de NEX**
(43, 147, 148), **ATR-01 en el handler** (145), el **id de la solicitud al comité** (146), las
**identidades son pares reales del AEC** (42, ADR-0009), los **controles de la integración al core** (41,
ADR-0007) y las **líneas**: estructura como insumo por el **activo A23** (44, ADR-0010), el **nivel 1 es
el CONSOLIDADO** (45, ADR-0011) y el **RUT del deudor se resuelve, no se arma** (46); casos 150–151.

El **21-09**, mirando pantallas con el usuario: la mesa de verificación lista las facturas y colapsa sus
causas · el pie de «Líneas solicitadas» suma · el **stream del inbound se reparte por ROL** y nace el rol
`inbound` (47) · el **cierre del negocio le escribe a quien tiene que firmar** (48): `confirmarCierre` no
llamaba a la mensajería ni una vez, y de las dos puertas a la mesa sólo avisaba la manual
([log](./2026-09-21_el_cierre_le_escribe_a_quien_firma.md)) · y se **ordenaron las carpetas**:
`Auditorias/`, `Regresiones/`, los PDF de integración a `Integraciones/` y `Specs_Procesos/` por proceso,
con gate `rutas.test.mjs` para las referencias ([log](./2026-09-21_ordenar_las_carpetas.md)).

> ## 🎯 Siguiente paso
>
> 1. **EL ESTADO DEL OTORGAMIENTO NO CRUZA DE PESTAÑA** y es la causa de tres síntomas que el usuario
>    reportó por separado: el Gerente Comercial ve 0 en Otorgamientos con criterios N1/N2 suyos en el
>    detalle, no llega ningún mensaje al Centro de mensajería, y el Ejecutivo de verificación no puede
>    accionar. `PRE_EVAL`, `HILOS` y lo que escribe `solicitarAprobacionExc` son memoria de CADA
>    documento; el detalle es pestaña propia y sólo el botón «Pre-evaluación» avisa al tubo. Es un T1.
> 2. **El tab VERIFICACIÓN**, tres pedidos: (a) habilitarlo al SIMULAR, informativo; (b) chip **PRIME** +
>    Nota Deudor en vez de «Lista Blanca», que el usuario da por retirado; (c) **separar** la evaluación
>    del DEUDOR (V00–V10 y causas, que son del par) del **quiz por FACTURA**.
> 3. **UI**: la card de la columna Oferta se corta · una oportunidad enviada a comité sigue diciendo
>    «Negociación» · el selector de sesión de la navbar, 1/3 más angosto y con elipsis.
> 4. **El join de empresas SIEMPRE por RUT**, nunca por razón social: 8 sitios medidos. Es un T1.
> 5. **Correr el `.bat` una vez** · **Regenerar `Capturas_UI/`** · **Motor O01** · **28** y **13-quater**.

## En vuelo · `main` en `5f2cb18` (20-09); la rama de sesión lleva lo del 21-09 encima

## Bloqueos · los dos son del usuario, desde Windows

El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403**, 6 de 6 en dos intentos. **Causa
descartada por medición**: las 14 ramas están `protected: false`, los pushes normales funcionan y el MCP
tampoco expone borrado. Quedan **el tag `v0.1.0`** sobre `bd14091` y **borrar 6 ramas ya integradas**:
`elegant-fermat-pyfpnm`, `migrate-project-session-vui9dl`, `sleepy-bohr-0x3j73`, `vibrant-hawking-qrzskw`,
`vibrant-hopper-33tg8j` y `local-mauricio-11sep`. **No se tocan** `respaldo/main-2026-09-17` ni las 5 sin
mezclar.

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
4. **Hooks en Windows**: `node verificar_hooks.mjs` una vez. · Los 13 skills de `taste-skill` viven en el
   `~/.claude/skills/` del CONTENEDOR. · `gitflow_guard.mjs` bloquea `git merge-base --is-ancestor`
   creyéndolo un merge a `main`: usar `git branch -r --merged`, que responde lo mismo.

## Conocimiento clave
[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto, en [`vault/index.md`](../index.md)
Últimas: [el cierre le escribe a quien firma](./2026-09-21_el_cierre_le_escribe_a_quien_firma.md) · [las tres casuísticas del elenco](./2026-09-20_las_tres_casuisticas_del_elenco.md) · [el nivel 1 es el consolidado](./2026-09-20_el_nivel_1_es_el_consolidado.md)
