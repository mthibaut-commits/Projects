---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-23T18:05:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **171/171 PASA**, **66 archivos de gate de contrato**
(440 tests), **37 casos e2e** (37/37), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(104 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
gate. La crónica del 17 al 22-09 vive en sus logs — ADR-0001 a 0012, el linter como paso 0-bis, todo lo de
plata del 20-09 (reglas 41–46, ADR-0007 a 0011, casos 145–151) y, del 21 y 22-09 en sesiones paralelas, las
reglas 47–52 y 59, el **orden de la carpeta** (`Auditoria/` mide, `Regresiones/` coteja, `Specs_Procesos/`
en cinco temas; 41 renombres y 63 referencias reparadas), los **entregables versionados** (`Versión N.N.N` +
anexo, estampada en cada hoja del PDF) y `Casos_de_Prueba/`: **97 casos** sobre las cinco pantallas, 80
automatizados y **17 manuales**, 7 de ellos en la Mesa de verificación.

El **23-09**, la plata otra vez en tres reglas: la **60** (el millón es la ÚLTIMA CAPA), la **61** (todo generador
produce en PESOS: en miles cada monto se cuantiza de a $1.000 y dos entran en criterios que DECIDEN) y la **62**
(la cartera se LEE: `PC_CLIENTES` sorteaba en una escala sin declarar y cuatro KPI mostraban ~M$5 donde va la
cartera de 500 clientes; el fallback de 80 empresas se fue y `auditar_unidades` estrena el patrón **(d)** en cero).

> ## 🎯 Siguiente paso
>
> 1. **El backlog decidido, en rojo primero** (`Regresiones/Gaps_Proceso_Curse_2026-09-22.md` §2.2; los casos y su
>    orden en `vault/specs/proceso-curse/casos_de_prueba.md`). **Hechos el 23-09** (regla, gate y `CASOS_ESPERADOS` en
>    cada commit): ADR-0013 (un evento, cinco versiones: regla 72, caso 168) · 0014 · 0015 · 0016 · 0017 · 0018 ·
>    0019 · antigüedad ≤20 días · corte y reinicio por hora · M-19 en `cerrarOferta` · M-01 (el acuse del DTE:
>    regla 73, caso 169; el A1 ya lo traía). **El backlog decidido del 22-09 quedó entero**: 18 gaps implementados
>    ([log](./2026-09-23_backlog_decidido.md) §1–§11), con sus pantallas en `28_version_v1.e2e.mjs`. **ADR-0020** (§12): el
>    A1 es un **flujo de eventos por documento** (regla 74, caso 170, `regla_74` + `dtesync.test.mjs`; activo migrado a 55.549
>    eventos, 46 MB). **ADR-0021** (§13): sobre la oferta cerrada, publicada o firmada la NC, el reclamo o la cesión a otro
>    **inhabilitan el documento y dejan la operación no cursable** (regla 75, caso 171; el veto de la regla 71 escrito por el
>    SII; el ejecutivo retira, re-evalúa y vuelve a firmar). Sin decisiones pendientes. Sigue: los T1 sin decisión previa
>    (gaps §2.2: G-05, G-18, G-23 … G-28), cada uno con su caso en rojo.
> 2. **UI y lo demás**: el selector de sesión 1/3 más angosto con elipsis (desborda a 1366 px) · el chip
>    «Negociación» en una operación ya enviada a comité · **join de empresas SIEMPRE por RUT** (8 sitios; T1) ·
>    `.bat` una vez · regenerar `Capturas_UI/` (deuda 2) · O01 · 28 · 13-quater · `pipeline.zip`.

## En vuelo · nada: entraron el **backlog de ADR** (reglas 64–75) y las **39 skills de terceros** (63)
Las skills se CORRIGEN, no se descartan: 12 llevan su bloque `AJUSTE-LOCAL-NEX` citando la regla, con auditor y
gate. Verificar el árbol MEZCLADO y no la rama —y que un paso 0 rojo APAGA el CI entero— subió a
[`flujo_git.md`](../conocimiento/flujo_git.md) ([log](./2026-09-23_el_paso_0_lleva_tres_commits_en_rojo.md)).

## Bloqueos · los dos son del usuario, desde Windows

El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (los pushes normales funcionan; el MCP tampoco
expone borrado). Quedan **el tag `v0.1.0`** sobre `bd14091` y **borrar seis ramas**: `ecstatic-ptolemy`,
`elegant-fermat`, `sleepy-bohr`, `vibrant-hawking`, `vibrant-hopper` y `local-mauricio-11sep`; `respaldo/main-
2026-09-17` sale integrada y **no se toca**. **`--merged` sin `git fetch --prune` antes MIENTE**: con refs viejas
`migrate-project-session-vui9dl` sale integrada y lleva 13 commits sin mezclar. Y `unidades-peso-verificacion`
es borrable pero **no** aparece ahí: su contenido entró por otro commit.

## Deudas anotadas (no bloquean, no olvidar)
1. **Lista Blanca / Deudor Autorizado, decisiones de negocio**: el activo no trae `VIGENTE_DESDE`/`HASTA`/
   `ESTADO`/`FECHA_CORTE` —una lista blanca **nunca vence**—; `prime = Lista Blanca || Autorizado` deja **84%**
   en Prime; `CUPO_SUGERIDO` sin leerse (ADR-0010).
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í`; se arregla re-extrayendo
   del AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista**: el tubo se retrata a mitad del
   stream, así que capturar en un estado conocido es decisión suya.
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del
   Directorio (31) · una fila «Sin clasificar» dice «2 deudores» y el desglose suma 0 · dos sitios
   arman un RUT de CLIENTE (`rutDe` de módulo): no llegan al par, y la regla 46 lo dice.
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**: quien mezcla después renumera lo suyo y
   revisa **las citas del otro lado**. **Está pasando otra vez**: `migrate-project-session-vui9dl` sigue viva y
   su rama ya usa **60, 61 y 62** (más 63–70); al integrarla, esas tres bajan.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · los 13 skills de `taste-skill` viven en el
   `~/.claude/skills/` del CONTENEDOR · `gitflow_guard.mjs` cree que `git merge-base` integra a `main` (el
   `\b` de su patrón casa con el guion): usar `git branch -r --merged` · y `invariantes.test.mjs` comprueba
   que el caso citado EXISTE, no que sea el correcto: cruzar número y título.

**Conocimiento clave** · [invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [cartera leída](./2026-09-23_cartera_leida_no_inventada.md) · [generadores en pesos](./2026-09-23_generadores_en_pesos.md) · [el millón es la última capa](./2026-09-23_el_millon_es_la_ultima_capa.md) · [el paso 0 en rojo](./2026-09-23_el_paso_0_lleva_tres_commits_en_rojo.md) · [el deudor decide](./2026-09-22_el_deudor_decide_la_factura_se_llama.md)
