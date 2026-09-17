---
type: conocimiento
title: "Reglas — Prospección, cartera y churn"
description: "Contactabilidad, asignación de ejecutivo por cedente, las empresas candidatas y los tres fenómenos del churn de cartera"
tags: [conocimiento, reglas, dominio]
timestamp: 2026-09-17T15:29:14Z
---

# Prospección, cartera y churn

> Reglas de dominio de NEX, **verbatim** desde el `CLAUDE.md` anterior al 17-09-2026, agrupadas por tema. Se citan por su número (`regla 10`) y **no se renumeran**: el fuente y otros documentos las referencian así. Índice de todas, con qué caso de la suite verifica cada una: [`invariantes.md`](../invariantes.md).
>
> Reglas en este archivo: **10** · **11** · **16**.

10. **Contactabilidad:** mensaje NO entregado ⇒ 1 solo intento y "Error de contactabilidad"; solo se reintenta (hasta 3) si se entrega sin respuesta.

11. **Asignación de ejecutivo por CEDENTE** (cliente), nunca por deudor. Reglas de prospección solo consideran Lista Blanca/Autorizados/históricos del último año; "Otro" nunca abre oportunidad (agregado manual ⇒ Otorgamiento). Las **empresas candidatas** salen de `proveedores_clientes.json` cruzado con `CESIONARIOS_MERCADO` (cesionarios reales de AECSync, sin nosotros: un candidato por definición no nos cede).

16. **Churn de cartera** (`churnCartera`, `CHURN_SEG`): «operan con otros» son TRES fenómenos con acción comercial distinta — **sólo otros** (churn consumado, reconquistar), **compartida** (wallet a capturar, relación viva) y **perdiendo** (compartida con SOW cayendo: la más urgente). Montos desde la serie semanal de `SHARE_OF_WALLET` (mío vs. total) y el reparto entre el factoring target y el resto desde AECSync. **Quién es «factoring target» lo CONFIGURA el tenant** (ver regla 13-duodecies) sobre el padrón de cesionarios, que clasifica **por RUT** (`CESIONARIOS_CAT`, espejo de `GeneradorDatos/lib/cesionarios.js`): el clasificador buscaba el trozo «ita» para encontrar «Itaú» y con eso daba **Eurocapital** por factoring de banco —«eurocap·ita·l»—, así que el churn le atribuía al target negocio que se había llevado otro, el KPI «SOW factoring target» del dashboard quedaba inflado y la alerta comercial «esta empresa cede facturas al factoring target (BCI · Banco de Chile · Itaú)» se levantaba nombrando a tres que no habían participado. Un trozo de tres letras adentro de un nombre propio no es una clasificación — **la identidad es el RUT**, misma lección que el A24. El padrón se indexa además por nombre porque varios call sites sólo tienen la razón social, y un nombre que no declara NO es banco. Las glosas del churn **derivan** la enumeración de la configuración (`targetNombres()`): escritas a mano nombraban «BCI · Banco de Chile · Itaú» sobre una clasificación que decía otra cosa. `COMPETIDORES_FACTORING` también sale de él: dos listas de cesionarios se desincronizan y la sintética empieza a producir nombres que el clasificador no sabe ubicar. Corregido el 15-09-2026, caso 99.
