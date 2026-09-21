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
(`pipeline_comercial.jsx`), build standalone, **152/152 PASA**, **40 archivos de gate de contrato**
(289 tests), **29 casos e2e** (29/29), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su
vault (77 reglas verbatim por tema, índice en `invariantes.md`) y **cerró la tabla de invariantes**: cada
regla y los 12 del contrato tienen gate. La crónica del 17 al 19-09 vive en sus logs (reglas 32–40,
ADR-0001 a 0006, y el **linter** en 0 como paso 0-bis).

El **20-09** entró todo lo de plata: la **regla 8 deja de ser proxy** (149, ADR-0008), **girar no es una
acción de NEX** (43, 147, 148), **ATR-01 en el handler** (145), el **id de la solicitud al comité** (146),
las **identidades pasan a ser pares reales del AEC** (42, ADR-0009), los **controles de la integración al
core** (41, ADR-0007) y las **líneas**: la ESTRUCTURA es un insumo que llega por el **activo A23** (44,
ADR-0010), el **nivel 1 es el CONSOLIDADO** —la cabecera ES la suma, en aprobado y en utilizado— (45,
ADR-0011) y el **RUT del deudor se resuelve, no se arma** (46); casos 150–151.

El **21-09**, mirando pantallas con el usuario: la mesa de verificación lista las facturas y colapsa las
causas · el pie de «Líneas solicitadas» suma aprobada/utilizada/disponible · el **stream del inbound se
reparte por ROL** y nace el rol `inbound` con su usuario (47) · y el **cierre del negocio le escribe a
quien tiene que firmar** (48): `confirmarCierre` no llamaba a la mensajería **ni una vez** —de las dos
puertas a la mesa de otorgamiento sólo avisaba la manual, y la automática es donde nadie aprieta un
botón—. Ahora va un hilo al **ejecutivo y a los aprobadores**, **de parte del SISTEMA**, con los tramos
(área, nivel) y quién firma cada uno; calla si no queda nada. La otra mitad del reporte **no era del
motor**: 180 excepciones que sólo alcanzan tres cargos es lo correcto (INC-03), mentía el cartel.
→ [log](./2026-09-21_el_cierre_le_escribe_a_quien_firma.md)

> ## 🎯 Siguiente paso
>
> 1. **El join de empresas SIEMPRE por RUT, nunca comparando razón social** — pedido del usuario. Medido:
>    **8 sitios** (`LB_NOMBRE`/`DA_NOMBRE`/`LISTA_BLANCA.has` en `tipoDeudor`, `P360.porNombre` ×3,
>    `tipoDeudor(null, x.name)`, `.find(x => x.nombre === dn)` ×2, `cartera.find`, `BUENOS_PAGADORES`).
>    La lección ya está escrita en `verifPar`. Es un T1.
> 2. **Correr el `.bat` una vez** (`build_app.ps1` está gateado, no probado) · 3. **Regenerar
>    `Capturas_UI/`** (deuda 3) · 4. **Motor O01** · 5. **28** y **13-quater**, de negocio · 6. `.zip`.

## En vuelo ahora · nada · `main` quedó en `5f2cb18` (20-09); la rama de sesión lleva lo del 21-09 encima

## Bloqueos · los dos son del usuario, desde Windows

El relay git bloquea la OPERACIÓN de borrado y `refs/tags/*` con **HTTP 403**, 6 de 6 en dos intentos.
**Causa descartada por medición**: las 14 ramas están `protected: false` y los pushes normales funcionan;
el MCP de GitHub tampoco expone borrado de ramas. Quedan **el tag `v0.1.0`** sobre `bd14091` y **borrar 6
ramas ya integradas**: `elegant-fermat-pyfpnm`, `migrate-project-session-vui9dl`, `sleepy-bohr-0x3j73`,
`vibrant-hawking-qrzskw`, `vibrant-hopper-33tg8j` (bajo `claude/`) y `local-mauricio-11sep`. **No se
tocan** `respaldo/main-2026-09-17` ni las 5 con trabajo sin mezclar.

## Deudas anotadas (no bloquean, no olvidar)

1. **Lista Blanca / Deudor Autorizado, decisiones de negocio pendientes**: el activo no trae
   `VIGENTE_DESDE`/`HASTA`/`ESTADO`/`FECHA_CORTE`, así que una lista blanca **nunca vence**;
   `prime = Lista Blanca || Autorizado` deja **84%** de los deudores en Prime; `CUPO_SUGERIDO_MM`
   (`LineaSugeridaMM`, 599 filas, en millones) sigue sin leerse (ADR-0010).
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í`
   (`COMPA?IA NAVIERA DEL SUR SpA`). Se arregla re-extrayendo del AEC, que no está commiteado.
3. **`Capturas_UI/` NO es determinista**: el tubo se retrata a mitad del stream. Capturar en un estado
   conocido (stream pausado, o Directorio, 31) cambia QUÉ muestra la fuente de Figma: decisión suya.
4. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del
   Directorio (31) · una fila «Sin clasificar» dice «2 deudores» y el desglose suma 0
   (`analisisDeudoresDeDeal` no halla facturas itemizadas en una fila agrupada) · **dos sesiones
   paralelas toman el mismo «siguiente entero libre»** (reglas, casos Y ADR): quien mezcla después
   renumera lo suyo y revisa las CITAS del otro lado.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez. · Los 13 skills de `taste-skill` viven en el
   `~/.claude/skills/` del CONTENEDOR. · `gitflow_guard.mjs` bloquea `git merge-base --is-ancestor`
   creyéndolo un merge a `main`: usar `git branch -r --merged`, que responde lo mismo.

## Conocimiento clave
[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto, en [`vault/index.md`](../index.md)
Últimas: [el cierre le escribe a quien firma](./2026-09-21_el_cierre_le_escribe_a_quien_firma.md) · [las tres casuísticas del elenco](./2026-09-20_las_tres_casuisticas_del_elenco.md) · [el nivel 1 es el consolidado](./2026-09-20_el_nivel_1_es_el_consolidado.md)
