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
(`pipeline_comercial.jsx`), build standalone, **156/156 PASA**, **45 archivos de gate de contrato**
(289 tests), **29 casos e2e** (29/29), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su
vault (81 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato
tienen gate. La crónica del 17 al 19-09 vive en sus logs (ADR-0001 a 0006, el linter como paso 0-bis).
El **20-09** entró todo lo de plata: **regla 8 sin proxy** (149, ADR-0008), **girar no es acción de NEX**
(43, 147, 148), **ATR-01 en el handler** (145), el **id de la solicitud al comité** (146), las
**identidades son pares reales del AEC** (42, ADR-0009), los **controles de la integración al core** (41,
ADR-0007) y las **líneas**: estructura como insumo por el **activo A23** (44, ADR-0010), el **nivel 1 es
el CONSOLIDADO** (45, ADR-0011) y el **RUT del deudor se resuelve, no se arma** (46); casos 150–151.

El **21-09 y 22-09**, mirando pantallas con el usuario, y en DOS sesiones en paralelo que se mezclaron
acá: la mesa de verificación lista las facturas y colapsa sus causas · el pie de «Líneas solicitadas»
suma · la **identidad de la sesión es una sola** (47) y el **atajo del otorgamiento no se salta el
visado** (48), los dos de la otra rama · el **stream del inbound se reparte por ROL** y nace el rol
`inbound` (49) · el **cierre del negocio le escribe a quien tiene que firmar** (50)
([log](./2026-09-21_el_cierre_le_escribe_a_quien_firma.md)) · **UN DEFECTO, TRES SÍNTOMAS** (51,
ADR-0012): `PRE_EVAL` y `HILOS` eran `let` de módulo y el detalle es pestaña propia, así que la bandeja
del aprobador, el Centro de mensajería y el EV veían un estado que nunca salía del detalle
([log](./2026-09-21_un_defecto_tres_sintomas.md)) · **`Configuración › Tenants`** (52): el alta del
factoring vive en la plataforma (`nex_tenants`, sin sufijo), la marca se mudó ahí, se crea al
**administrador** que después da de alta al resto, y cada sección dice sobre qué tenant configura;
destapó que `atribDeRol` resolvía el super-admin por el CÓDIGO «ADMIN» y no por el rol
([log](./2026-09-21_el_tenant_se_da_de_alta.md)) · y se **ordenó la carpeta**, que las dos ramas hicieron
a la vez: ganó la de `main` —`Auditoria/` es lo que MIDE y `Regresiones/` lo que COTEJA definición contra
implementación— y de acá quedó el gate `rutas.test.mjs`
([log](./2026-09-21_ordenar_las_carpetas.md)).

> ## 🎯 Siguiente paso
>
> 1. **El tab VERIFICACIÓN**, tres pedidos: (a) habilitarlo al SIMULAR, informativo; (b) chip **PRIME** +
>    Nota Deudor en vez de «Lista Blanca», que el usuario da por retirado; (c) **separar** la evaluación
>    del DEUDOR (V00–V10 y causas, que son del par) del **quiz por FACTURA**.
> 2. **UI**: la card de la columna Oferta se corta · una oportunidad enviada a comité sigue diciendo
>    «Negociación» · el selector de sesión de la navbar, 1/3 más angosto y con elipsis.
> 3. **El join de empresas SIEMPRE por RUT**, nunca por razón social: 8 sitios medidos. Es un T1.
> 4. **Correr el `.bat` una vez** · **Regenerar `Capturas_UI/`** · **Motor O01** · **28** y **13-quater**.
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