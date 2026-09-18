---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T03:45:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, y el último que actualiza.** ≤80 líneas; se sobrescribe.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 40,7 MB, **140/140 PASA**, **153 gates de contrato**, **29 casos e2e**,
`tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (63 reglas verbatim por tema, índice en
`invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de invariantes**: las 63 reglas y los 12
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
| El agujero del paso 2 | ✅ patrón nuevo en los tres sitios + dos gates de acuerdo (contrato 151→153) | `claude/ecstatic-ptolemy-f7cb4m` | mergear a `main` con `--no-ff` |
| Auditorías del bootstrap y del código | ✅ `Auditoria_Bootstrap_Agentico_Cierre.md` · `Auditoria_Codigo_Fuente.md` (+PDF) | ídem | — |
| Cerrar la tabla de invariantes | ✅ mergeada a `main` con `--no-ff` (4cd5be6) · 30 filas · suite 116→140 · e2e 1→16 · contrato 7→25 | ídem | — |
| Cablear los gates · partir `CLAUDE.md` | ✅ mergeadas (bd14091) | `claude/vibrant-hopper-33tg8j` | **pushear el tag `v0.1.0`** (abajo) |

## El paso 2 de la verificación, corregido el 18-09-2026

Buscaba `^(function|const|let|var) [A-Za-z0-9_]+`: veía 944 declaraciones y **no veía 11** —diez `async function`
y el `export default function PipelineComercial`—, mientras `auditar_muerto.mjs`, del mismo repo, sí las veía. Un
`const sha256Hex` que colisione con el `async function sha256Hex` es «Identifier has already been declared»,
**`tsc` no lo dice** y el paso 2 tampoco lo habría dicho: el aviso llegaba dos minutos más tarde, en el paso 5,
cuando la suite no logra montar la app y sin nombrar el símbolo. Ahora el patrón es el del auditor, la cola es
`$NF` (con `export default` el nombre es el ÚLTIMO campo, no el segundo) y `fuente.test.mjs` exige que `CLAUDE.md`,
el vault y el CI escriban el MISMO paso 2 y que los dos analizadores coincidan: el patrón se LEE de `CLAUDE.md`.

## Bloqueos

- **El tag `v0.1.0` no llegó al remoto**: el proxy git deniega `refs/tags/*` (HTTP 403, política; se reporta, no se
  rodea; reintentado dos veces). Existe local sobre `bd14091`. Lo pone el usuario desde Windows:
  `git fetch origin main && git tag -a v0.1.0 bd14091 -m "v0.1.0 — bootstrap agéntico" && git push origin v0.1.0`.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate**: `arquitectura.md` y `README.md` citan ~21.000 líneas, 118 componentes, ~24 MB
   (medido: 26.233 / 154 / 40,7). Commit T3 cuando el usuario diga.
2. **Líneas base de los auditores**: `BASE_MUERTOS` bajó a 6 (sale `lineaDeVersion`: el caso 125 la ejercita);
   quedan 6 hallazgos «revisar a mano» y 7 `useState` sin uso.
3. **Separación por género** de cada regla, al tocarla. **GN como disyunción** (22) sigue pendiente del negocio.
4. Pendientes escritos en las reglas: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis); `STATUS_ETAPA` no
   es tenant-aware y `OperacionesView` duplica filas (28); el A1 no trae `MntNotaCredito` (13-quater); la guarda
   contra una solicitud duplicada sólo ve las de su pestaña (33).
5. **Hooks en Windows**: correr su health check la primera vez. El CI avisa que `checkout@v4` y `setup-node@v4`
   apuntan a Node 20: subir a `@v5` (T3).
6. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**: se confirma al mezclar `main` (reglas 32/33, casos 116–140).

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) ·
[hooks](../conocimiento/loop_agentico_hooks.md) · [flujo git](../conocimiento/flujo_git.md) ·
[arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [ADR](../adr/index.md)

## Última sesión

[18-09-2026 — auditorías y el paso 2](./2026-09-18_auditorias_y_paso_2.md) ·
[17-09-2026 — cerrar la tabla de invariantes](./2026-09-17_cerrar_invariantes.md)
