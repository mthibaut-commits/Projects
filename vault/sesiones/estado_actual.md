---
type: sesion
title: "Estado actual"
description: "Foto del estado del proyecto para la próxima sesión: fase, siguiente paso, en vuelo, bloqueos y deudas anotadas. Se sobrescribe; ≤80 líneas"
tags: [handoff]
timestamp: 2026-09-23T14:10:00Z
---

# Estado actual

> **Primer archivo que lee toda sesión, último que actualiza.** ≤80 líneas; se sobrescribe, no crece.

## Fase del proyecto

Demo funcional del pipeline comercial de factoring para BICE / Factoring Security: un solo fuente
(`pipeline_comercial.jsx`), build standalone, **151/151 PASA**, **40 archivos de gate de contrato**
(273 tests), **29 casos e2e** (29/29), `tsc` limpio, 0 duplicados. El 17-09-2026 el repo abrió su vault
(77 reglas verbatim por tema, índice en `invariantes.md`), cableó sus gates (ADR-0001, ADR-0002) y **cerró
la tabla de invariantes**: cada regla y los 12 del contrato tienen gate. La crónica del 17 al 19-09 vive en
sus logs (reglas 32–40, ADR-0003 a 0006, y el **linter** en 0 como paso 0-bis).

El **20-09** entró lo de esta rama, sobre plata: la **regla 8 deja de ser proxy** (149, ADR-0008), **girar no es
de NEX** (43, 147, 148), **ATR-01** (145), el **id al comité** (146), el **padrón real** (42) y las **líneas** (44–46).

El **21-09**, tres pedidos. **Ordenar la carpeta**: la raíz baja a tres `.md`, nacen `Auditoria/` y
`Regresiones/`, los PDF de contrato se van a `Integraciones/` y `Specs_Procesos/` queda en cinco temas — 41
renombres y 77 referencias rotas medidas con un verificador diferencial, 63 reparadas (los logs y el ADR
citan las viejas a propósito y el mapa las resuelve). **Versionar los entregables**: `Versión N.N.N` y anexo
reconstruido del historial, estampada en cada hoja del PDF, con el gate exigiendo que cabecera y primera fila
calcen. Y **`Capturas_Simuladas/`**. De paso, tres defectos de `main`: el **paso 0 en rojo** y dos bloques de
comandos sin un salto de línea, con lo que la verificación canónica mostraba ocho pasos y no nueve.

El **23-09**, tres cosas. Los **casos de prueba**: `Casos_de_Prueba/casos-de-prueba-pantallas.md`, **97 casos**
sobre las cinco pantallas, cada uno con la regla que lo fija y su cobertura **medida** — 80 automatizados y
**17 manuales**, **7 de ellos en la Mesa de verificación**, la pantalla menos cubierta. La **regla 47**: el
millón es la ÚLTIMA CAPA — un mensaje al cliente multiplicaba por un millón y tres layouts declaraban campos
en MM$ (A11 contradecía a su generador **por mil**). Y la **regla 48**, que reemplaza el punto de la 47 que
dejaba vivir el sufijo `_M`: **todo generador produce en PESOS**. Veinte campos de cuatro activos viajaban en
miles, cuantizados de a $1.000, y dos entran en criterios que DECIDEN —`MNT_PAGARES` en C02 y V03/V04 como
denominadores del predictor—. Se van veinte multiplicaciones por mil del fuente; A10 sube a 3.0.0, A11 y A16
a 4.0.0; el caso **115 se re-ancla** a comparar contra la celda tal cual, que es más fuerte que el `×1000`
que tenía. `auditar_unidades` estrena el patrón **(d)** y **queda cableado** con línea base **cero**.

**Las líneas, en un párrafo.** La ESTRUCTURA es un insumo (44, ADR-0010): el **activo A23** reemplaza los 3.170 de
3.636 objetos que salían del A7; el **nivel 1 es la SUMA** (45) y el **RUT del deudor se resuelve, no se arma** (46).

> ## 🎯 Siguiente paso
>
> 1. **Subir a `main`** con `merge --no-ff`, **confirmando con el usuario**: la rama trae tres commits y va verde.
> 2. **Correr el `.bat` una vez** (`build_app.ps1` cambió y acá no se ejecuta: la simetría está gateada, no
>    probada) · 3. **Regenerar `Capturas_UI/`**, desfasadas desde el padrón real (deuda 2) · 4. **Motor O01**
>    (el hueco débil de la regla 8) · 5. **Regla 28** y **13-quater** · 6. Sacar `pipeline.zip`.

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
Últimas: [regla 48](./2026-09-23_generadores_en_pesos.md) · [regla 47](./2026-09-23_el_millon_es_la_ultima_capa.md) · [casos de prueba](./2026-09-23_casos_de_prueba.md) · [versionado](./2026-09-21_versionado_de_entregables.md) · [ordenar la carpeta](./2026-09-21_ordenar_la_carpeta.md) · [mensajería](./2026-09-21_spec_mensajeria.md) · [las tres casuísticas del elenco](./2026-09-20_las_tres_casuisticas_del_elenco.md) · [el nivel 1 es el consolidado](./2026-09-20_el_nivel_1_es_el_consolidado.md) · [las líneas son un insumo](./2026-09-20_las_lineas_son_un_insumo.md)
