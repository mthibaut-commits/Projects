---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T05:10:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, y el último que actualiza.** ≤80 líneas; se sobrescribe.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **140/140 PASA**, **26 archivos de gate de contrato**, **29 casos e2e**,
`tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (62 reglas verbatim por tema, índice en
`invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de invariantes**: las 62 reglas y los 12
invariantes del contrato tienen gate; ninguna fila dice ya «sin gate». Lo que esos gates destaparon cambió el
producto — siete defectos, en el [log del 17](./2026-09-17_cerrar_invariantes.md). El 18-09-2026 dos auditorías
midieron el repositorio y el código; de la segunda salió **el único defecto accionable, ya corregido** (abajo).

> ## 🎯 Siguiente paso · decisión del usuario, ninguno empezado
>
> 1. **Los 20 desfases regla↔código que los gates midieron** (log de cerrar invariantes). Los tres grandes: la
>    cláusula «el cliente pide tasa bajo el mínimo del deudor» (regla 8) **no existe en el código**;
>    `validarMutacion` tiene **un solo call site** (LIN-01, GIR-01 y ATR-01 declarados y nunca invocados); y el
>    `idProceso` de la solicitud al comité **colisiona entre pestañas** y descarta la segunda en silencio.
> 2. **Decidir los datos**: razones sociales reales sobre RUT sintéticos (un ADR y un gate); ningún test lo afirma
>    ni lo niega hoy. 3. Sacar `pipeline.zip` (29,6 MB) del versionado.

## En vuelo ahora

| Trabajo | Estado | Rama | Siguiente paso |
|---|---|---|---|
| El paso 2 · el health check de hooks · el gate de cifras | ✅ los tres cerrados hoy (abajo) | `claude/ecstatic-ptolemy-f7cb4m` | mergear a `main` con `--no-ff` |
| Auditorías del bootstrap y del código | ✅ `Auditoria_Bootstrap_Agentico_Cierre.md` · `Auditoria_Codigo_Fuente.md` (+PDF) | ídem | — |
| Cerrar la tabla de invariantes | ✅ mergeada a `main` con `--no-ff` (4cd5be6) · 30 filas · suite 116→140 · e2e 1→16 · contrato 7→25 | ídem | — |
| Cablear los gates · partir `CLAUDE.md` | ✅ mergeadas (bd14091) | `claude/vibrant-hopper-33tg8j` | **pushear el tag `v0.1.0`** (abajo) |

## Lo cerrado el 18-09-2026

1. **El paso 2** no veía 11 declaraciones (diez `async function` y el `export default`) y `auditar_muerto.mjs` sí.
   El patrón es ahora el del auditor, la cola `$NF`, y dos gates exigen que `CLAUDE.md`, el vault y el CI escriban
   el MISMO paso 2 y que los dos analizadores coincidan; el patrón se LEE de `CLAUDE.md`.
2. **El health check de hooks es un comando**: `node verificar_hooks.mjs`. El CI lo corre entero y subió a
   `checkout@v5`/`setup-node@v5`; lo que no puede atestiguar es Windows, y **ahí falta correrlo una vez**.
3. **`cifras.test.mjs`**: lo que los documentos afirman contra la medición — exactas las estructurales, en banda
   las continuas, y falla si la afirmación desapareció. Destapó nueve cifras viejas, tres de ellas del mismo
   conteo de reglas (61 · 63 · 62 medido).

## Bloqueos

- **El tag `v0.1.0` no llegó al remoto**: el proxy git deniega `refs/tags/*` (HTTP 403, política; se reporta, no se
  rodea; reintentado dos veces). Existe local sobre `bd14091`. Lo pone el usuario desde Windows:
  `git fetch origin main && git tag -a v0.1.0 bd14091 -m "v0.1.0 — bootstrap agéntico" && git push origin v0.1.0`.

## Deudas anotadas (no bloquean, no olvidar)

1. **Pendientes escritos dentro de las reglas**: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis);
   `STATUS_ETAPA` no es tenant-aware y `OperacionesView` duplica filas (28); la guarda contra una solicitud
   duplicada sólo ve las de su pestaña (33). El A1 sin `MntNotaCredito` (13-quater) **no es código**: es una
   pregunta al dueño del dato, y agregar el campo al activo sintético sería inventarlo.
2. **Líneas base de los auditores**: `BASE_MUERTOS` bajó a 6 (sale `lineaDeVersion`: el caso 125 la ejercita);
   quedan 6 hallazgos «revisar a mano» y 7 `useState` sin uso.
3. **GN como disyunción** (22) sigue pendiente del negocio. La separación por género de cada regla no es deuda:
   ADR-0001 la decidió **regla por regla, al tocarla**.
4. **Hooks en Windows**: correr `node verificar_hooks.mjs` la primera vez; es lo único que el CI no atestigua.
5. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**: se confirma al mezclar `main` (reglas 32/33, casos 116–140).

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) ·
[hooks](../conocimiento/loop_agentico_hooks.md) · [flujo git](../conocimiento/flujo_git.md) ·
[arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [ADR](../adr/index.md)

## Última sesión

[18-09-2026 — auditorías y el paso 2](./2026-09-18_auditorias_y_paso_2.md) ·
[17-09-2026 — cerrar la tabla de invariantes](./2026-09-17_cerrar_invariantes.md)
