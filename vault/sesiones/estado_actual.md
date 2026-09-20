---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-20T22:20:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **151/151 PASA**, **39 archivos de gate de contrato**
(265 tests), **29 casos e2e** (29/29), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su
vault (75 reglas verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y
**cerró la tabla de invariantes**: cada regla y los 12 del contrato tienen gate. La crónica del 17 al 19-09
vive en sus logs (reglas 32–40, ADR-0003 a 0006, y el **linter** en 0 como paso 0-bis).

El **20-09** entró todo lo de esta rama, sobre plata: la **regla 8 deja de ser proxy** (149, ADR-0008),
**girar no es una acción de NEX** (43, 147, 148), **ATR-01 en el handler** (145), el **id de la solicitud
al comité** (146), las **identidades pasan a ser pares reales del AEC** (42, ADR-0009) y, al cierre, las
**líneas** (44–46, casos 150–151, ADR-0010 y ADR-0011). De `main`, los **controles de la integración al
core** (41, ADR-0007).

**Las líneas, en un párrafo.** La ESTRUCTURA es un insumo (44, ADR-0010): llega por el **activo A23**
(`LINEA_CUPO` 4.167 filas + `LINEA_DEUDOR` 741) que produce `GeneradorDatos/datasets/lineas_par.js`; antes
el pipeline fabricaba 3.170 de sus 3.636 objetos partiendo del A7, que el levantamiento §5.4 prohíbe. El
**nivel 1 es el CONSOLIDADO** (45, ADR-0011): la cabecera ES la suma de las líneas, en aprobado y en
utilizado — superaba a la suma en 217 de 224 clientes, con 13,7 % de brecha mediana. El **RUT del deudor
se resuelve, no se arma** (46): el wizard del comité lo inventaba con 92 % de DV inválidos y 100 %
desconocidos, así que su línea caía en un par inexistente. Con los tres, **el bucle del comité cierra por
los dos caminos** (casos 150 y 151) y lo que constituye queda marcado `Origen: COMITE` + `IdProceso`.
`lineaMinima` y `otrosDeudoresPct` quedaron **declarativas** y su `hint` lo dice.

> ## 🎯 Siguiente paso
>
> 1. **Subir a `main`.** La rama quedó **verde entera** por primera vez desde el 20-09 (los seis pasos,
>    29/29 e2e incluido), así que el bloqueo del clasificador por `[CI Bypass]` ya no aplica. La mezcla
>    se había hecho y `main` local quedó reseteado a `origin/main`: hay que rehacerla con `merge --no-ff`
>    y **confirmar antes con el usuario**, que es a quien le toca autorizar el push a `main`.
> 2. **Correr el `.bat` una vez**: `build_app.ps1` cambió y acá no se ejecuta; la simetría está gateada,
>    no probada. · 4. **Regenerar `Capturas_UI/`**, desfasadas desde el padrón real (atado a la deuda 2).
> 3. **Motor O01** (la versión débil del hueco de la regla 8: compara contra el promedio ponderado sin el
>    piso del deudor) · 4. **Regla 28** y **13-quater**: de negocio · 5. Sacar `pipeline.zip` (2,7 MB).

## En vuelo ahora · nada: la rama queda VERDE ENTERA (6/6 pasos)

## Bloqueos · los dos son del usuario, desde Windows

El proxy git deniega `refs/tags/*` y el borrado de ramas (HTTP 403, política; se reporta, no se rodea).
Queda **el tag `v0.1.0`** sobre `bd14091` y **borrar las ramas integradas**.

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
   skills de `taste-skill` viven en el `~/.claude/skills/` del CONTENEDOR, efímero:
   `/plugin marketplace add leonxlnx/taste-skill` en su máquina.

## Conocimiento clave

[invariantes y gates](../conocimiento/invariantes.md) · [reglas](../conocimiento/index.md) · [decisiones](../adr/index.md) · el resto, en [`vault/index.md`](../index.md)
Últimas: [las tres casuísticas del elenco](./2026-09-20_las_tres_casuisticas_del_elenco.md) · [el nivel 1 es el consolidado](./2026-09-20_el_nivel_1_es_el_consolidado.md) · [las líneas son un insumo](./2026-09-20_las_lineas_son_un_insumo.md)
