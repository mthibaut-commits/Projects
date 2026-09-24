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
(`pipeline_comercial.jsx`), build standalone, **177/177 PASA**, **70 archivos de gate de contrato**,
**39 casos e2e** (39/39), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(109 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
gate. La crónica del 17 al 23-09 vive en sus logs: el backlog decidido del curse (reglas 64–75, ADR-0013 a 0021), la
plata (60–62), el orden de la carpeta, los entregables versionados y `Casos_de_Prueba/`.

La **noche del 23-09**, en dos ramas paralelas. La **revisión de Reportes**: la cartera de Cliente y SOW se MIDE (76), las
cifras de operación se suman del A1 y el A2 con una sola función (77), la pérdida por cesión es un hecho del A2 (78,
ADR-0023, T1) y el benchmark por deudor cuenta sólo lo que pasó (79) — casos 172–175, `e2e-76`/`-77`
([log](./2026-09-23_reportes_leen_la_cartera.md)). Y **ADR-0024 · regla 80 · casos 176 y 177**: las tres transiciones que
se escribían por fuera (G-24, G-25, G-26) — tras el otorgamiento la operación queda **Pendiente Integración** y nunca
«Girada» (`stage: "giro"` tiene UN escritor: `aprobarIntegracion`), las **dos** puertas manuales pasan por el catálogo
puro `transicionManual`, la pérdida **exige causa** y el intent `cursar` de WhatsApp manda el **enlace**, no la firma; la
máquina de estados son **DOS TRAMOS**, porque cesión y otorgamiento son *atributos desacoplados*, con lo que **G-30 queda
cerrado de hecho**
([log](./2026-09-23_nadie_escribe_una_transicion_ajena.md)).

> ## 🎯 Siguiente paso
>
> 1. **INCONSISTENCIA DE CONTROL, 24-09, sin diagnosticar.** Con la sesión en **Jefe de Operaciones (Operaciones N3)**
>    la bandeja dice «48 excepciones pendientes, **ninguna requiere tu atribución**» y desglosa «3 en Operaciones N4»,
>    mientras el detalle de esa operación muestra «En espera del visto bueno de **Jefe de Operaciones (N1)**» y **(N3)**:
>    tarjeta y bandeja calculan área/nivel distinto (la familia del `|| 4` contra `|| 1` de `:10820`). **Y los mensajes
>    tampoco llegaron.** Mirar `rolDeAreaNivel`, `puedeAprobarExc` y «Sólo mis pendientes» de `OtorgamientosView`.
> 2. **EL TUBO** (T1, el «join por RUT» de los 8 sitios): las filas «Sin clasificar» de `agruparInboundPorCliente`
>    (`:18857`) agrupan por NOMBRE y tiran el RUT que el evento trae (`:4465`) — id `"OF-"+nombre` en vez del `opId`
>    (`:4497`), `capacidadDeudores` sale por su guarda sin RUT (`:42868`) con desglose 0/0/0 bajo un encabezado que dice
>    4 deudores, y todas «Sin línea». Falta `rutRecep` en el evento. **Y sólo debe verlas el gestor del pipeline.**
> 3. **Cinco gaps del curse decididos el 23-09 y sin implementar** (matriz §2.2, con el texto verbatim del usuario):
>    **G-23** · **G-18** · **G-27** · **G-28** · **G-05**; **G-29** queda como T2.
> 4. **UI pedida el 24-09**: quitar la píldora «Sujeto a excepción · N1 · Jefe de Operaciones (Operaciones)» (redundante)
>    y **agrupar por área** las tarjetas de otorgamiento · «Re-evaluación de la simulación» **colapsada**, con header
>    «Evaluación de la simulación · V1 · 5 motores» y un **icono de actualizar** que la gatille · en Verificación el
>    header va **razón social + chip Nota Deudor + chip Prime**, y los V00–V10 **en una columna** con el protocolo
>    telefónico **dentro de «V01»**.
> 5. **Lo demás**: selector de sesión 1/3 más angosto con elipsis · chip «Negociación» en una operación ya enviada a
>    comité · `.bat` una vez · regenerar `Capturas_UI/` (deuda 2) · O01 · 28 · 13-quater · `pipeline.zip`.

## En vuelo · nada: la revisión de Reportes (reglas 76–79) entró a `main` el 24-09
**Antes de modificar se integra `main`**: skill `sincronizar-main` + `node sincronizar_main.mjs` (paso 0 del ciclo), y se
verifica el árbol MEZCLADO, no la rama ([`flujo_git.md`](../conocimiento/flujo_git.md)).

## Bloqueos · del usuario, desde Windows
El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (los pushes normales funcionan; el MCP tampoco expone
borrado). Queda **el tag `v0.1.0`** sobre `bd14091` y borrar las dos ramas ya integradas. Se quedan `main`,
`respaldo/main-2026-09-17` (no se toca) y `claude/local-mauricio-20260910`, ÚNICA copia del estado local del 10-09.

## Deudas anotadas (no bloquean, no olvidar)
1. **Perder dejó de ser un destino manual** (regla 80): el gesto es «Rechazar». Para perder arrastrando habría que abrir
   ahí el menú de motivos; el contrato ya lo admite (`moverEtapa(id, "perdida", {closeReason})`) y el caso 176 lo cubre.
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í` (`CONSTRUCTORA Y SERVICIOS NU?EZ
   SPA`); se arregla re-extrayendo del AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista.**
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del Directorio (31) ·
   dos sitios arman un RUT de CLIENTE (`rutDe` de módulo): no llegan al par, y la regla 46 lo dice.
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**, y el turno se pierde MIENTRAS UNO
   VERIFICA ([log](./2026-09-23_mezclar_todo_lo_pendiente.md)). Al mezclar, `git cherry` y no `--merged`.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · `gitflow_guard.mjs` cree que `git merge-base` integra a
   `main` (usar `git branch -r --merged`) · `invariantes.test.mjs` sólo comprueba que el caso citado EXISTA.
6. **Reportes, lo que la revisión no arregló** (medido, [log](./2026-09-23_reportes_leen_la_cartera.md)): los **25
   cedentes sin ficha en el A5** que sí ceden a Security figuran «Inactivos»; «Brecha de wallet» multiplica por
   `COLOC_PROM_12M` (lo nuestro) y no por lo que el cliente cede; «SOW promedio» (30 %) promedia prospectos en 0 al lado
   del donut (64 %); `COMPETENCIA_POR_RUT` corta el 22-06 y deja fuera **3.352** cesiones del 23-06; `COMPETIDORES`
   —fallback de `competidorDe`— trae a «Security Factoring» y «Coface Chile»; `dashSerie` fabrica sparklines; el Plan
   Mensual simula con `pcRng`.

**Conocimiento clave** · [invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [Reportes lee la cartera](./2026-09-23_reportes_leen_la_cartera.md) · [cartera leída](./2026-09-23_cartera_leida_no_inventada.md) · [generadores en pesos](./2026-09-23_generadores_en_pesos.md) · [el millón es la última capa](./2026-09-23_el_millon_es_la_ultima_capa.md)
