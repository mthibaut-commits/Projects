---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-22T01:10:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **155/155 PASA**, **43 archivos de gate de contrato**
(268 tests), **29 casos e2e** (29/29), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su
vault (79 reglas verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y
**cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen gate. La crónica del 17 al 19-09
vive en sus logs (reglas 32–40, ADR-0003 a 0006, y el **linter** en 0 como paso 0-bis).

El **20-09** entró todo lo de esta rama, sobre plata: la **regla 8 deja de ser proxy** (149, ADR-0008),
**girar no es una acción de NEX** (43, 147, 148), **ATR-01 en el handler** (145), el **id de la solicitud
al comité** (146), las **identidades pasan a ser pares reales del AEC** (42, ADR-0009) y, al cierre, las
**líneas** (44–46, casos 150–151, ADR-0010 y ADR-0011). De `main`, los **controles de la integración al
core** (41, ADR-0007) y la **spec de mensajería**.

El **21-09** se ordenó la carpeta (pedido del usuario): la raíz baja a tres `.md` —`CLAUDE.md`, `README.md`,
`Levantamiento_Activos_Informacion.md`—, nacen `Auditoria/` (lo que mide) y `Regresiones/` (lo que cotejó
definición contra implementación), los cuatro PDF de contrato se van a `Integraciones/` y `Specs_Procesos/`
queda en cinco temas: `Otorgamiento`, `Verificacion`, `Lineas`, `Excepciones` y `Evaluacion_Factura`. Son
**41 renombres**; las **77 referencias** que rompieron se midieron con un verificador diferencial de enlaces
y se repararon 63 — los logs y el ADR citan las rutas viejas **a propósito**, y la tabla de
`conocimiento/mapa_documentos.md` las resuelve. Cada carpeta nueva trae `README.md` con el criterio de qué entra. Y
dos defectos que el usuario vio en pantalla (152, 153): la **identidad de la sesión es una sola** (47 — el
selector de la demo no tocaba `SESION`, así que la mesa le negaba marcar a la Ejecutiva de verificación) y
el **atajo del otorgamiento no se salta el visado** (48 — OTG-02 declarado y no obedecido). El **22-09**, la **mesa de verificación trabaja por FACTURA** agrupada por deudor, con marcar, adjuntar y anotar por documento (53, 157), y el color del badge dice si el pendiente ya se exige o todavía es pronóstico (54, 158). Y tres defectos que venían de `main`: **el paso 0 estaba en rojo** (dos líneas partidas a mano tras
formatear) y `CLAUDE.md`, `README.md` y `.claude/rules/testing.md` habían perdido un salto de línea, con lo
que el bloque canónico de verificación mostraba ocho pasos y no nueve. Los tres cerrados.

**Las líneas, en un párrafo.** La ESTRUCTURA es un insumo (44, ADR-0010): el **activo A23** (`LINEA_CUPO`
4.167 filas + `LINEA_DEUDOR` 741) reemplaza los 3.170 de 3.636 objetos que el pipeline fabricaba desde el
A7, que el levantamiento §5.4 prohíbe. El **nivel 1 es el CONSOLIDADO** (45, ADR-0011): la cabecera ES la
suma de las líneas y las superaba en 217 de 224 clientes. El **RUT del deudor se resuelve, no se arma**
(46): el wizard lo inventaba con 92 % de DV inválidos, así que su línea caía en un par inexistente. Con los
tres, el bucle del comité cierra por los dos caminos (casos 150–151); `lineaMinima` y `otrosDeudoresPct`
quedaron declarativas y su `hint` lo dice.

> ## 🎯 Siguiente paso
>
> 1. **Subir a `main`** con `merge --no-ff`, **confirmando antes con el usuario**: es a quien le toca
>    autorizar el push. La rama trae la mudanza de documentos y queda verde entera (los seis pasos).
> 2. **Correr el `.bat` una vez** (`build_app.ps1` cambió y acá no se ejecuta: la simetría está gateada, no
>    probada) · 3. **Regenerar `Capturas_UI/`**, desfasadas desde el padrón real (deuda 2) · 4. **Motor O01**
>    (el hueco débil de la regla 8) · 5. **Regla 28** y **13-quater**, de negocio · 6. Sacar `pipeline.zip`.

## En vuelo ahora · `claude/migrate-project-session-vui9dl`: la mesa por factura (53) y el color del badge (54)

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea): queda **el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas integradas**.

## Deudas anotadas (no bloquean, no olvidar)

1. **Auditores**: `BASE_MUERTOS` queda en **1** (`giroDeal`), candidato a poda. · **GN como disyunción**
   (22), del negocio. · Sin gate, la concentración del Directorio (31). · `DEUDORES_AUTORIZADOS.
   LineaSugeridaMM` (599 filas) es un campo heredado **sin uso, sin documentar y nombrado en millones**:
   no lo confundan con una señal de línea por deudor (ADR-0010). · Quedan **dos** sitios que arman un RUT
   de CLIENTE (`rutDe` de módulo, la degradación de `PC_CLIENTES`): no llegan al par, y la regla 46 lo dice.
2. **`Capturas_UI/` NO es determinista**: el tubo se retrata a mitad del stream. Capturar en un estado
   conocido (stream pausado, o Modo Directorio, 31) cambia QUÉ muestra la fuente de Figma: decisión suya.
3. **Dos sesiones paralelas toman el mismo «siguiente entero libre»** — reglas, casos Y ADR, las tres
   cosas. Quien mezcla después renumera lo suyo, y hay que revisar también las CITAS del otro lado.
4. **Hooks en Windows**: `node verificar_hooks.mjs` una vez; es lo único que el CI no atestigua. · Los 13
   skills de `taste-skill` viven en el `~/.claude/skills/` del CONTENEDOR, efímero: `/plugin marketplace add leonxlnx/taste-skill` en su máquina.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto, en [`vault/index.md`](../index.md)
Últimas: [mesa por factura](./2026-09-22_mesa_por_factura_y_badges.md) · [identidad y atajo](./2026-09-21_identidad_y_atajo_otorgamiento.md) · [ordenar la carpeta](./2026-09-21_ordenar_la_carpeta.md) · [mensajería](./2026-09-21_spec_mensajeria.md) · [las tres casuísticas del elenco](./2026-09-20_las_tres_casuisticas_del_elenco.md) · [el nivel 1 es el consolidado](./2026-09-20_el_nivel_1_es_el_consolidado.md) · [las líneas son un insumo](./2026-09-20_las_lineas_son_un_insumo.md)
