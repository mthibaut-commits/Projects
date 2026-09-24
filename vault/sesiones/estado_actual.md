---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-24T01:30:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **175/175 PASA**, **69 archivos de gate de contrato**,
**39 casos e2e** (39/39), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(108 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
gate. La crónica del 17 al 23-09 vive en sus logs: el backlog decidido del curse (reglas 64–75, ADR-0013 a 0021),
la plata (60–62), el orden de la carpeta, los entregables versionados y `Casos_de_Prueba/`.

La **noche del 23-09**, la **revisión de Reportes**: diez hallazgos verificados y corregidos en rojo primero. La cartera
de Cliente y SOW se MIDE (regla 76: «Solo competencia» es SOW 0, el mismo conjunto que «sólo otros» del churn); las
cifras de operación del Dashboard y de Performance comercial se suman semana a semana del A1 y el A2 con una sola función
(77); la pérdida por cesión es un hecho del A2 (78, ADR-0023, T1); y el benchmark por deudor cuenta sólo lo que pasó (79).
Casos 172–175, `e2e-76`/`-77`, `regla_76/77/78.test.mjs` ([log](./2026-09-23_reportes_leen_la_cartera.md)).

> ## 🎯 Siguiente paso
>
> 1. **Decisión del usuario, T1 — el giro automático se salta VER-01.** Lo que saca hoy una operación de «Otorgamiento»
>    es un efecto del componente raíz («AVANCE AUTOMÁTICO A GIRO») que, con `otorgamientoCompleto`, la manda a
>    **«Girada»** sin mirar la verificación y sin pasar por «Pendiente Integración» (reglas 26 y 43). La rama correcta de
>    la regla 48 (`otorgamientoCompleto(d) && verifResumenDeal(d).pend === 0` → Pendiente Integración) vive SÓLO en
>    `avanzarPipeline`, código muerto, y el gate `regla_48` vigila ese texto. Propuesta: llevar la rama al efecto vivo
>    con su caso en rojo, retirar `avanzarPipeline` y re-anclar el gate (ADR-0023 §3).
> 2. Los T1 sin decisión previa del backlog del curse (gaps §2.2: G-05, G-18, G-23 … G-28), cada uno con su caso en rojo.
> 3. **UI y lo demás**: el selector de sesión 1/3 más angosto con elipsis (desborda a 1366 px) · el chip
>    «Negociación» en una operación ya enviada a comité · **join de empresas SIEMPRE por RUT** (8 sitios; T1) ·
>    `.bat` una vez · regenerar `Capturas_UI/` (deuda 2) · O01 · 28 · 13-quater · `pipeline.zip`.

## En vuelo · nada: la revisión de Reportes (reglas 76–79) entró a `main` el 24-09
Por `merge --no-ff` de `claude/dreamy-bardeen-n3ekp0`, a pedido del usuario; `main` no se había movido, así que el árbol
mezclado es el verificado en la rama ([`flujo_git.md`](../conocimiento/flujo_git.md)). **Antes de modificar se integra
`main`**: skill `sincronizar-main` + `node sincronizar_main.mjs` (paso 0 del ciclo).

## Bloqueos · del usuario, desde Windows

El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (los pushes normales funcionan; el MCP tampoco
expone borrado). Queda **el tag `v0.1.0`** sobre `bd14091`, y por borrar la rama ya integrada
`claude/dreamy-bardeen-n3ekp0`. Se quedan `main`, `respaldo/main-2026-09-17` (no se toca) y
`claude/local-mauricio-20260910`, la ÚNICA copia del estado local del 10-09 (`git cherry` la da `+`: borrarla lo pierde).

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
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**, y el turno se pierde MIENTRAS UNO
   VERIFICA ([log](./2026-09-23_mezclar_todo_lo_pendiente.md)). Al mezclar, `git cherry` y no `--merged`.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · `gitflow_guard.mjs` cree que `git merge-base` integra
   a `main`: usar `git branch -r --merged` · `invariantes.test.mjs` comprueba que el caso citado EXISTE, no que sea el
   correcto: cruzar número y título.
6. **Reportes, lo que la revisión no arregló** (medido): los **25 cedentes sin ficha en el A5** que sí ceden a Security
   figuran «Inactivos»; «Brecha de wallet» multiplica por `COLOC_PROM_12M` (lo nuestro) y no por lo que el cliente cede;
   «SOW promedio» (30 %) promedia prospectos en 0 al lado del donut (64 %); `COMPETENCIA_POR_RUT` corta el 22-06 y deja
   fuera **3.352** cesiones del 23-06 (reparto target/resto del churn); `COMPETIDORES` —fallback de `competidorDe`— trae
   a «Security Factoring» y «Coface Chile»; `dashSerie` fabrica sparklines del Dashboard; el Plan Mensual simula con `pcRng`.

**Conocimiento clave** · [invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [Reportes lee la cartera](./2026-09-23_reportes_leen_la_cartera.md) · [cartera leída](./2026-09-23_cartera_leida_no_inventada.md) · [generadores en pesos](./2026-09-23_generadores_en_pesos.md) · [el millón es la última capa](./2026-09-23_el_millon_es_la_ultima_capa.md)
