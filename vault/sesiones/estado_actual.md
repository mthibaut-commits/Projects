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
(`pipeline_comercial.jsx`), build standalone, **173/173 PASA**, **67 archivos de gate de contrato**
(593 tests), **37 casos e2e**, `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(105 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
gate. La crónica del 17 al 23-09 vive en sus logs: ADR-0001 a 0021, reglas 41–75 y el backlog del curse entero.

**Cierre del 23-09 (ADR-0023, regla 76, casos 172 y 173):** las tres transiciones que se escribían por fuera.
Tras el otorgamiento la operación queda **Pendiente Integración** y nunca «Girada» (`stage: "giro"` tiene UN
escritor: `aprobarIntegracion`); las dos puertas manuales pasan por el catálogo puro `transicionManual` —la
pérdida **exige causa** y se delega en `reject`—; y el intent `cursar` de WhatsApp manda el **enlace**, no la
firma. La máquina de estados son **DOS TRAMOS**: el comercial ordenado y el posterior a la firma sin orden
interno, porque cesión y otorgamiento son *atributos desacoplados* (definición del usuario). Con eso **G-30
queda cerrado de hecho**. [Log](./2026-09-23_nadie_escribe_una_transicion_ajena.md).

> ## 🎯 Siguiente paso
>
> **Cinco gaps con DECISIÓN del usuario tomada el 23-09 y sin implementar** (`Regresiones/Gaps_Proceso_Curse_2026-09-22.md`
> §2.2), cada uno con su caso en rojo redactado. Orden propuesto por costo y riesgo:
> 1. **G-23** · el motor ya reparte por plazo de documento; el gap está en los **llamadores** —`docsPro`
>    (:14223) y `pricingDeVersion` (:25327) pasan `dias` por deudor, sembrado con la PRIMERA factura (:13061),
>    así que reordenar la oferta cambia el precio—. Falta decidir el control por deudor (propuesta: `vencFecha`).
> 2. **G-18** · la solicitud al comité debe seguir al MOTIVO (`solicitudComiteDeOferta`, :42395, lo cablea) **y**
>    al subir una línea de par debe subir la del cliente: la **regla 45 que nunca llegó al escritor** (:3864).
> 3. **G-27** · el proceso es **transaccional por cliente**: la segunda evaluación espera a la primera, y la
>    reserva de cupo garantiza que no se curse dos veces contra el mismo.
> 4. **G-28** · contrato de ida a Tesorería: **API REST JSON síncrona**; los archivos viajan como **URL a un
>    bucket S3** de las dos cuentas, con idempotencia y registro del envío contra el cual cotejar la vuelta.
> 5. **G-05** · **Prime es una enumeración de RUTs** (S3 → tabla), distinto de **Buen deudor** (nota > 4,2) y **no
>    excluyentes**. El código ya los separa: `segmento` (:3258) **nombra PRIME a la disyunción**, y el comentario
>    de :3213 contradice al de :3243. Arrastra el fallback por razón social de `tipoDeudor` (:2694).
> 6. **G-29** (T2) · el acumulador del inbound en `useState` y los topes cableados: son del tenant.
>
> **EL TUBO, reportado el 24-09** (T1, es el «join por RUT» de los 8 sitios): las filas «Sin clasificar» de
> `agruparInboundPorCliente` (`:18857`) agrupan por NOMBRE y tiran el RUT que el evento SÍ trae (`rutEmisor`,
> `:4465`), así que su id es `"OF-"+nombre` —debe ser el `opId` (`:4497`)—, `capacidadDeudores` sale por su
> guarda sin RUT (`:42868`) y el desglose queda en 0/0/0 bajo un encabezado que dice 4 deudores, y todas salen
> «Sin línea». Falta además `rutRecep` en el evento. **Y sólo debe verlas el ejecutivo GESTOR del pipeline**,
> no la ejecutiva comercial: hoy se le muestran a Carla.
> **UI y lo demás**: selector de sesión 1/3 más angosto con elipsis · chip «Negociación» en una operación ya
> enviada a comité · `.bat` una vez · `Capturas_UI/` (deuda 2) · O01 · 28 · 13-quater · zip.

## En vuelo · nada. **Antes de modificar se integra `main`**: skill `sincronizar-main` + `node sincronizar_main.mjs`
(paso 0 del ciclo, 23-09). Verificar el árbol MEZCLADO y no la rama, y un paso 0 rojo APAGA el CI entero:
[`flujo_git.md`](../conocimiento/flujo_git.md).
## Bloqueos · los dos son del usuario, desde Windows

El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (los pushes normales funcionan; el MCP tampoco
expone borrado). Queda **el tag `v0.1.0`** sobre `bd14091`. Las ramas integradas las borró el usuario el 23-09;
quedan `main`, la de la sesión, `respaldo/main-2026-09-17` (no se toca) y `claude/local-mauricio-20260910`, la
ÚNICA copia del estado local del 10-09 (`git cherry` la da `+`: borrarla lo pierde).

## Deudas anotadas (no bloquean, no olvidar)
1. **Perder dejó de ser un destino manual** (regla 76): el gesto es «Rechazar», que pide el motivo. Para
   perder arrastrando habría que abrir ahí el menú de motivos; el contrato ya lo admite
   (`moverEtapa(id, "perdida", { closeReason })` delega en `reject`) y el caso 172 lo cubre.
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í`; se arregla re-extrayendo del
   AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista**: el tubo se retrata a mitad del stream.
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del
   Directorio (31) · «Sin clasificar» dice «2 deudores» y el desglose suma 0 · dos sitios arman un RUT de
   CLIENTE (`rutDe` de módulo): no llegan al par, y la regla 46 lo dice.
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** y el turno se pierde MIENTRAS UNO VERIFICA
   ([procedimiento](./2026-09-23_mezclar_todo_lo_pendiente.md)). Al mezclar, `git cherry` y no `--merged`.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · `gitflow_guard.mjs` cree que `git merge-base` integra
   a `main` (usar `git branch -r --merged`) · `invariantes.test.mjs` comprueba que el caso citado EXISTE, no que sea el correcto.

**Conocimiento clave** · [invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [transiciones ajenas](./2026-09-23_nadie_escribe_una_transicion_ajena.md) · [el paso 0 en rojo](./2026-09-23_el_paso_0_lleva_tres_commits_en_rojo.md) · [mezclar todo](./2026-09-23_mezclar_todo_lo_pendiente.md)
