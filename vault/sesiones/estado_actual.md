---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-18T18:45:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, y el último que actualiza.** ≤80 líneas; se sobrescribe.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone de 41,0 MB, **140/140 PASA**, **167 gates de contrato**, **29 casos e2e**,
`tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault (63 reglas verbatim por tema, índice en
`invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró la tabla de invariantes**: las 63 reglas y los 12
invariantes del contrato tienen gate; ninguna fila dice ya «sin gate». Los 30 gates nuevos los escribió un agente por
fila y otro intentó refutarlos (log), y **lo que destaparon sí cambió el producto** (abajo). En paralelo entraron el
**punto fijo del generador** (32, ADR-0003) y el **id estable con dos marcas al editar** (33, ADR-0004).

> ## 🎯 Siguiente paso · decisión del usuario, ninguno empezado
>
> 0. **Correr el `.bat` una vez**: `build_app.ps1` cambió (embebe `arte_login.js`) y acá no se ejecuta; gateado, no probado.
> 1. **Los 20 desfases regla↔código que los gates midieron** (log de cerrar invariantes). Los tres grandes: la
>    cláusula «el cliente pide tasa bajo el mínimo del deudor» (regla 8) **no existe en el código**;
>    `validarMutacion` tiene **un solo call site** (LIN-01, GIR-01 y ATR-01 declarados y nunca invocados); y el
>    `idProceso` de la solicitud al comité **colisiona entre pestañas** y descarta la segunda en silencio.
> 2. **Decidir los datos**: razones sociales reales sobre RUT sintéticos (un ADR y un gate). 3. Sacar `pipeline.zip` del versionado.

## En vuelo ahora

| Trabajo | Estado | Rama | Siguiente paso |
|---|---|---|---|
| Invariantes cerradas · «Operación creada» · punto fijo · gates cableados | ✅ mergeadas a `main` (bd14091) | — | **pushear el tag `v0.1.0`** (abajo) |
| **Portada que muestra el producto** | ✅ en la rama · reglas 34/35/36 · ADR-0005 · contrato 151→167 | `claude/elegant-fermat-pyfpnm` | mergear a `main` con `--no-ff` cuando el usuario lo vea |

## Defectos de producto corregidos al cerrar la tabla (los destaparon los gates)

1. **13-sexdecies**: retirar la ÚLTIMA factura estaba vetado en la mutación y en el sub-tab «documentos» aunque la
   regla lo permite. Ahora la oferta se vacía por `limpiarSimulacion` y vuelve al panel de arranque.
2. **14**: la vía «no confirmada» retiraba sin `setReevalPend(true)` y la línea se recalculaba sola.
3. **OTG-01**: `revertirVisado` y `revertirExc` usaban `val`/`x` que no recibían → revertir reventaba con
   `ReferenceError`; revertir un O05 físico ahora revoca su evidencia.
4. **5**: el rechazo sin motivo grababa el status de la etapa viva como causa, el lector devolvía el genérico, cuatro
   escritores no grababan actor ni fecha, la bitácora decía «Sistema», y arrastrar una Perdida la revivía. Además
   **15-quinquies** (guiones por campo ausente), **27-bis** (auditoría con el módulo viejo) y el texto de **RAT-01**.

## Bloqueos

- **El tag `v0.1.0` no llegó al remoto**: el proxy git deniega `refs/tags/*` (HTTP 403, política; se reporta, no se
  rodea; reintentado dos veces). Existe local sobre `bd14091`. Lo pone el usuario desde Windows:
  `git fetch origin main && git tag -a v0.1.0 bd14091 -m "v0.1.0 — bootstrap agéntico" && git push origin v0.1.0`.

## Deudas anotadas (no bloquean, no olvidar)

1. **Cifras desfasadas sin gate**: `arquitectura.md` y `README.md` citan ~21.000 líneas, 118 componentes, ~24 MB
   (medido: ~26.100 / 154 / 40,7). Commit T3 cuando el usuario diga.
2. **Líneas base de los auditores**: `BASE_MUERTOS` bajó a 6 (sale `lineaDeVersion`: el caso 125 la ejercita);
   quedan 6 hallazgos «revisar a mano» y 7 `useState` sin uso.
3. **Separación por género** de cada regla, al tocarla. **GN como disyunción** (22) sigue pendiente del negocio.
4. Pendientes escritos en las reglas: el `<h1>` de Reportes dice «Gestión de Clientes» (27-bis); `STATUS_ETAPA` no
   es tenant-aware y `OperacionesView` duplica filas (28); el A1 no trae `MntNotaCredito` (13-quater); la guarda
   contra una solicitud duplicada sólo ve las de su pestaña (33).
5. **Hooks en Windows**: correr su health check la primera vez. El CI avisa que `checkout@v4` y `setup-node@v4`
   apuntan a Node 20: subir a `@v5` (T3).
6. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**: se confirma al mezclar `main` (reglas 32/33, casos 116–140).
7. **Al regenerar las capturas, regenerar también `arte_login.js`** o la portada muestra una UI que ya no existe ·
   `marcaFondo` no está en el selector de colores de Configuración.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas por tema](../conocimiento/index.md) · [hooks](../conocimiento/loop_agentico_hooks.md) ·
[flujo git](../conocimiento/flujo_git.md) · [arquitectura](../conocimiento/arquitectura.md) · [verificación](../conocimiento/verificacion.md) · [ADR](../adr/index.md)

## Última sesión

[18-09-2026 — la portada muestra el producto](./2026-09-18_portada_que_muestra_el_producto.md) ·
[17-09-2026 — cerrar la tabla de invariantes](./2026-09-17_cerrar_invariantes.md)
