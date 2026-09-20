---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-20T06:00:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **149/149 PASA**, **38 archivos de gate de contrato**
(260 tests), **29 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (72 reglas
verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de
invariantes**: cada regla y los 12 del contrato tienen gate. La crónica del 17 al 19-09 vive en sus logs:
punto fijo del generador (32, ADR-0003), id estable (33, ADR-0004), tubo en «Todos» (34), regla mal
definida y su ampliación (35), portada que muestra el producto (36–39, ADR-0005), Bandeja Inbound (40),
formateo con Prettier (ADR-0006) y el **linter** en 0 (paso 0-bis).

El **20-09** entran cinco cosas de esta rama, todas sobre plata: la **regla 8 deja de ser proxy** (149,
ADR-0008), **girar no es una acción de NEX** —termina en la inyección a Tesorería, vuelve como callback y la
asignación se congela ahí (43, 147, 148)—, **ATR-01 en el handler** (145), el **id de la solicitud al
comité** (146), y las **identidades pasan a ser pares reales del AEC** (42, ADR-0009): sólo identidad,
ninguna transacción, sin las 93 personas naturales — se fue el 39,3 % de RUT de deudor en rango de persona.
De `main`, los **controles de la integración al core** (41, ADR-0007), que se comprueban al firmar.

> ## 🎯 Siguiente paso
>
> Decisión del usuario; ninguno empezado.
> 0. **Correr el `.bat` una vez**: `build_app.ps1` cambió (embebe `arte_login.js`) y acá no se ejecuta; la
>    simetría está gateada, no probada.
> 1. **`e2e-29-b` en rojo, y NO es la app**: con el padrón real ninguna operación del Directorio trae ya un
>    deudor de **cupo cero**, así que la rama «sale entero de la oferta» de «Sacar facturas sin línea» no se
>    puede ejercitar. Aflojar la aserción está prohibido (`testing.md`); la otra salida es que la regla 31
>    garantice ese deudor, que es un requisito NUEVO con su gate. El diagnóstico entero, en el log del 20-09.
> 2. **Regenerar `Capturas_UI/`**: la UI muestra los nombres reales del padrón, así que la fuente de Figma
>    quedó desfasada. Atado a la deuda 3: capturar en un estado conocido cambia QUÉ muestra.
> 3. **Motor O01**: conserva la versión débil del hueco de la regla 8 —compara contra el promedio ponderado
>    sin pasarle el piso del deudor—. Es una línea y una decisión de negocio (crea excepciones nuevas).
> 4. **Regla 28** (`STATUS_ETAPA` a tenant-aware) y **13-quater** (si el A1 real trae `MntNotaCredito`): de
>    negocio. · 5. Sacar `pipeline.zip` (**2,7 MB**, un build del 12-08 de un generado).

## En vuelo ahora · nada: esta rama queda mezclada con `main` y verde salvo el `e2e-29-b` de arriba

Integrado en esta mezcla: el padrón real (42, ADR-0009) · la regla 8 contra el mínimo del deudor (149,
ADR-0008) · el giro fuera de NEX, su callback y el congelado (43, 147, 148) · ATR-01 en el handler (145) ·
el id de la solicitud (146) · el linter · el formateo y el re-anclaje de los gates (ADR-0006). De `main`:
regla 35 ampliada · portada (36–39, ADR-0005) · Bandeja Inbound (40) · controles de integración (41, ADR-0007).

**La mezcla costó tres renumeraciones**, y es la deuda 4 de abajo cobrándose: la regla 37 de esta rama pasó
a **43** (`main` tomó 37 para «BIENVENIDO» y 41 para los controles), sus casos 143–147 pasaron a **145–149**
(los dos lados habían tomado el 143), y sus ADR 0006 y 0007 pasaron a **0008** y **0009**. Además `main`
había renumerado el ADR de formateo a 0006 **sin mover sus 26 citas**, que seguían apuntando al 0005 —que
ahora es la portada—: corregidas por contexto en la misma mezcla.

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea). Queda
**el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas integradas**.

## Deudas anotadas (no bloquean, no olvidar)

1. **Auditores**: `BASE_MUERTOS` queda en **1** (`giroDeal`), ya no un hallazgo de producto sino candidato
   a poda. · **GN como disyunción** (22), del negocio. · Sin gate, la concentración del Directorio (31).
2. **`Capturas_UI/` NO es determinista**: el tubo se retrata a mitad del stream. Capturar en un estado
   conocido (stream pausado, o Modo Directorio, 31) cambia QUÉ muestra la fuente de Figma: decisión suya.
3. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** — reglas, casos Y ADR, las tres cosas.
   Quien mezcla después renumera lo suyo, y hay que revisar también las CITAS del otro lado.
4. **Hooks en Windows**: `node verificar_hooks.mjs` una vez; es lo único que el CI no atestigua. · Los 13
   skills de `taste-skill` viven en el `~/.claude/skills/` del CONTENEDOR, efímero:
   `/plugin marketplace add leonxlnx/taste-skill` en su máquina.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto, en [`vault/index.md`](../index.md)
Últimas: [el padrón real](./2026-09-20_padron_real_del_aec.md) · [controles de integración](./2026-09-20_controles_integracion.md) · [la tasa contra el deudor](./2026-09-19_la_tasa_se_valida_contra_el_deudor.md)
