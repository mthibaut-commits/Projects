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
(`pipeline_comercial.jsx`), build standalone, **181/181 PASA**, **73 archivos de gate de contrato**,
**41 casos e2e** (41/41), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(114 reglas verbatim por tema) y **cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen
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
([log](./2026-09-23_nadie_escribe_una_transicion_ajena.md)). Y el **24-09, cinco de UI** en el detalle: la píldora
redundante fuera, las tarjetas de otorgamiento por área, la evaluación colapsada con su icono de re-evaluar, el
encabezado de Verificación reordenado y los V00–V10 en una columna con el veredicto dentro de V01 — con un hallazgo de
método: colapsar sacó un botón del DOM y un e2e pasó por su rama de respaldo
([log](./2026-09-24_cinco_de_ui_y_un_colapsable_que_se_llevo_el_boton.md)). Y **regla 81 · caso 178**: las filas «Sin
clasificar» del tubo se juntan por RUT y llevan el `opId` —uno de los 8 sitios del join por RUT—, sólo las ve el gestor
del pipeline (rol `inbound`) y el desglose de `capacidadDeudores` **siempre cuadra** con el encabezado
([log](./2026-09-24_el_tubo_se_junta_por_rut.md)). Y **regla 82 · `e2e-82-a`**: el encabezado del detalle mide lo
mismo en todos los tabs (alto mínimo fijo + `scrollbar-gutter: stable`), más cuatro de UI en Verificación —chip de
cabecera sólo si el deudor está partido, sin columna Tasa, el panel de la API en una fila, y la tabla ordenada por
tipo · folio · emisión · vencimiento · monto con estado en tres valores— ([log](./2026-09-24_el_encabezado_no_salta.md)).
Y **regla 83 · ADR-0025 · caso 179**: el nivel de una excepción se calcula UNA vez —la versión guardaba el del tramo y la
solicitud, el hilo y la bandeja el escalado por monto: por eso el Jefe de Operaciones veía «(N1)» en la tarjeta, nada en
la bandeja y ningún mensaje— ([log](./2026-09-24_un_nivel_por_excepcion.md)). Y **regla 84 · caso 180 · `e2e-84-a`**: la
oportunidad es UNA lista (`poolOportunidad`) y la fila del tubo cuenta lo mismo que «Todo lo disponible» del detalle
([log](./2026-09-24_la_oportunidad_es_una_sola_lista.md)). Y **regla 85 · ADR-0026 · caso 181**: el corte del día lee el
estado del proceso —versión emitida o pre-evaluación— y ya no elimina la operación que el ejecutivo trabaja en el detalle
([log](./2026-09-24_el_corte_lee_el_proceso.md)). Y la **tarjeta de otorgamiento termina en la banda** («Modificar solicitud» abre un panel lateral; [log](./2026-09-24_la_tarjeta_termina_en_la_banda.md)).

> ## 🎯 Siguiente paso
>
> 1. **Pregunta abierta al usuario (24-09):** ¿un aviso a los aprobadores **al publicar** la oferta, además de la
>    solicitud (regla 66) y la firma (regla 50)? Hoy no existe por diseño; sería un T2 en `cerrarOferta`. Y si el Jefe
>    de Operaciones (N3) debe aprobar operaciones críticas, se baja el piso en `PISO_ATRIB_MONTO` (Mantenedores), no en código.
> 2. **Cinco gaps del curse decididos el 23-09 y sin implementar** (matriz §2.2, verbatim del usuario): G-23 · G-18 · G-27 · G-28 · G-05; G-29 como T2.
> 3. **Lo demás**: selector de sesión angosto · chip «Negociación» tras comité · `.bat` · O01 · 28 · 13-quater · `pipeline.zip` · ¿el KPI del tubo suma la oportunidad completa (regla 84)?

## En vuelo · nada: todo lo del 24-09 entró a `main` (`b4a5b17` y siguientes)
**Antes de modificar se integra `main`** (`node sincronizar_main.mjs`, paso 0) y se verifica el árbol MEZCLADO, no la rama.

## Bloqueos · del usuario, desde Windows
El relay git bloquea el BORRADO y `refs/tags/*` con **HTTP 403** (los pushes normales funcionan). Quedan el tag `v0.1.0`
sobre `bd14091` y borrar las ramas ya integradas; se quedan `main`, `respaldo/main-2026-09-17` y `claude/local-mauricio-20260910` (única copia local del 10-09).

## Deudas anotadas (no bloquean, no olvidar)
1. **Perder dejó de ser un destino manual** (regla 80): el gesto es «Rechazar»; el contrato admite perder arrastrando
   (`moverEtapa(id, "perdida", {closeReason})`, caso 176) si se abre ahí el menú de motivos.
2. **Mojibake en el padrón**: 38 de 1.983 identidades traen `?` donde va `Ñ`/`Ó`/`Í` (`CONSTRUCTORA Y SERVICIOS NU?EZ
   SPA`); se arregla re-extrayendo del AEC, que no está commiteado. · **`Capturas_UI/` NO es determinista.**
3. `BASE_MUERTOS` en **1** (`giroDeal`) · **GN como disyunción** (22) · sin gate, la concentración del Directorio (31) · dos sitios arman un RUT de CLIENTE (`rutDe`), regla 46.
4. **Dos sesiones paralelas toman el mismo «siguiente entero libre»**, y el turno se pierde MIENTRAS UNO
   VERIFICA ([log](./2026-09-23_mezclar_todo_lo_pendiente.md)). Al mezclar, `git cherry` y no `--merged`.
5. **Hooks en Windows**: `node verificar_hooks.mjs` una vez · `gitflow_guard.mjs` cree que `git merge-base` integra a `main` · `invariantes.test.mjs` sólo comprueba que el caso citado EXISTA.
6. **Reportes, lo que la revisión no arregló** (medido, [log](./2026-09-23_reportes_leen_la_cartera.md)): los **25
   cedentes sin ficha en el A5** que sí ceden a Security figuran «Inactivos»; «Brecha de wallet» multiplica por
   `COLOC_PROM_12M` (lo nuestro) y no por lo que el cliente cede; «SOW promedio» (30 %) promedia prospectos en 0 al lado
   del donut (64 %); `COMPETENCIA_POR_RUT` corta el 22-06 y deja fuera **3.352** cesiones del 23-06; `COMPETIDORES`
   —fallback de `competidorDe`— trae a «Security Factoring» y «Coface Chile»; `dashSerie` fabrica sparklines; el Plan
   Mensual simula con `pcRng`.

**Conocimiento clave** · [invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto en [`vault/index.md`](../index.md) · últimas: [Reportes lee la cartera](./2026-09-23_reportes_leen_la_cartera.md) · [cartera leída](./2026-09-23_cartera_leida_no_inventada.md) · [generadores en pesos](./2026-09-23_generadores_en_pesos.md) · [el millón es la última capa](./2026-09-23_el_millon_es_la_ultima_capa.md)
