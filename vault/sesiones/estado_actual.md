---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-23T23:30:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **173/173 PASA**, **66 archivos de gate de contrato**
(575 tests), **37 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(105 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
gate. La crónica del 17 al 23-09 vive en sus logs: ADR-0001 a 0021, reglas 41–75, `Casos_de_Prueba/` con 97
casos, y el backlog del proceso de curse decidido entero.

**Cierre del 23-09 (ADR-0023, regla 76, casos 172 y 173):** las tres transiciones que se escribían por fuera.
Tras el otorgamiento la operación queda **Pendiente Integración** y nunca «Girada» —`stage: "giro"` tiene UN
escritor, `aprobarIntegracion`, con la atribución N3 y los cuatro controles—; las transiciones manuales pasan
por el catálogo puro `transicionManual` —la pérdida **exige causa** y se delega en `reject`, cesión escribe
`integracion`—; y el intent `cursar` de WhatsApp manda el **enlace**, no la firma. La máquina de estados son
**DOS TRAMOS**: el comercial ordenado y el posterior a la firma sin orden interno, porque cesión y otorgamiento
son *atributos desacoplados* (definición del usuario). Con eso **G-30 queda cerrado de hecho**: el catálogo es
el normativo que el spec decía validar y no definía. [Log](./2026-09-23_nadie_escribe_una_transicion_ajena.md).

> ## 🎯 Siguiente paso
>
> **Cinco gaps con DECISIÓN del usuario tomada el 23-09 y sin implementar** (`Regresiones/Gaps_Proceso_Curse_2026-09-22.md`
> §2.2), cada uno con su caso en rojo redactado. Orden propuesto por costo y riesgo:
> 1. **G-23** · el motor YA reparte por plazo de documento y guarda la diferencia de precio en pesos, sin tasa
>    por documento — lo decidido. El gap está en los **llamadores**: `docsPro` (:14223) y `pricingDeVersion`
>    (:25327) pasan `dias` **por deudor**, y no promediado: `vencDias` se siembra con la **primera factura**
>    (:13061), así que **reordenar la oferta cambia el precio**. `vencFecha` es editable POR FOLIO (:13066) y
>    sólo vive en la UI. Falta decidir el control por deudor (propuesta: manda `vencFecha`).
> 2. **G-18** · la solicitud al comité debe seguir al MOTIVO (`RESOLUCION_COMITE` los tiene y nadie la usa para
>    dar forma; cableado en `solicitudComiteDeOferta`, :42395) **y** al subir una línea de par debe subir la del
>    cliente: es la **regla 45 que nunca llegó al escritor** (`constituirLinea`, :3864, copia `propFactoring`).
> 3. **G-27** · el proceso es **transaccional por cliente**, no concurrente: la segunda evaluación espera a que
>    la primera se ejecute, y la reserva de cupo garantiza que no se curse dos veces contra el mismo.
> 4. **G-28** · contrato de ida a Tesorería: **API REST JSON síncrona**; todo archivo viaja como **URL a un
>    bucket S3** de las dos cuentas. Con idempotencia y registro del envío contra el cual cotejar la vuelta.
> 5. **G-05** · **Prime es una enumeración de RUTs** (S3 → tabla) y es distinto de **Buen deudor** (nota > 4,2);
>    **no son excluyentes**. El código ya los separa: el defecto es que `segmento` (:3258) **nombra PRIME a la
>    disyunción**, y el comentario de :3213 contradice al de :3243. Arrastra el fallback por razón social
>    de `tipoDeudor` (:2694) → join por RUT.
> 6. **G-29** (T2) · el acumulador del inbound en `useState` y los topes cableados (`MAX_NUEVOS = 40`, el de 4):
>    en producción son parámetro del tenant.
>
> **UI y lo demás**: selector de sesión 1/3 más angosto con elipsis (desborda a 1366 px) · chip «Negociación»
> en una operación ya enviada a comité · `.bat` una vez · `Capturas_UI/` (deuda 2) · O01 · 28 · 13-quater · zip.

## En vuelo · nada: lo de esta sesión está en `claude/ecstatic-ptolemy-f7cb4m`, pendiente de mezclar a `main`
## Bloqueos · los dos son del usuario, desde Windows

El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (los pushes normales funcionan; el MCP tampoco
expone borrado). Quedan **el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas ya integradas**; el listado se
hace con `git fetch --prune` primero y mirando `git cherry`, nunca `--merged` a secas.

## Deudas anotadas (no bloquean, no olvidar)
1. **Perder dejó de ser un destino manual** (regla 76): el gesto es «Rechazar», que pide el motivo. Para
   perder arrastrando habría que abrir ahí el menú de motivos; el contrato ya lo admite
   (`moverEtapa(id, "perdida", { closeReason })` delega en `reject`) y el caso 172 lo cubre.
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í`; se arregla re-extrayendo del
   AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista**: el tubo se retrata a mitad del stream.
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del
   Directorio (31) · «Sin clasificar» dice «2 deudores» y el desglose suma 0 · dos sitios arman un RUT de
   CLIENTE (`rutDe` de módulo): no llegan al par, y la regla 46 lo dice.
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**, y el turno se pierde MIENTRAS UNO
   VERIFICA: el 23-09 el mismo bloque se renumeró dos veces.
   [Procedimiento](./2026-09-23_mezclar_todo_lo_pendiente.md). Al mezclar, `git cherry` y no `--merged`.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · `gitflow_guard.mjs` cree que `git merge-base` integra
   a `main`: usar `git branch -r --merged` · `invariantes.test.mjs` comprueba que el caso citado EXISTE, no que
   sea el correcto: cruzar número y título.

**Conocimiento clave** · [invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [transiciones ajenas](./2026-09-23_nadie_escribe_una_transicion_ajena.md) · [el paso 0 en rojo](./2026-09-23_el_paso_0_lleva_tres_commits_en_rojo.md) · [mezclar todo](./2026-09-23_mezclar_todo_lo_pendiente.md)
