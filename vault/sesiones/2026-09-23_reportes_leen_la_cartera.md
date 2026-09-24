---
type: sesion
title: "Sesión 2026-09-23 (noche) — Reportes lee la cartera: los diez hallazgos de la revisión (reglas 76–79)"
description: "La revisión de Reportes encontró cifras escritas a mano y defectos de cálculo en Cliente, SOW, Performance comercial, Benchmark deudores y el Dashboard. Se verificaron los diez contra el código, se escribieron cuatro casos, tres gates y dos e2e en rojo, y se corrigieron: la cartera se mide en la ventana del churn, las cifras de operación se suman semana a semana del A1 y el A2 con una sola función, la pérdida por cesión es un hecho del A2 y el benchmark cuenta sólo lo que pasó. Retirar el motor muerto `avanzarPipeline` destapó que el giro automático vivo se salta VER-01: queda como decisión T1 del usuario"
tags: [sesion, reportes, sow, churn, regla-76, regla-77, regla-78, regla-79]
timestamp: 2026-09-23T23:45:00Z
feature: null
---

# Sesión 2026-09-23 (noche): Reportes lee la cartera

## El pedido

Una revisión de la vista **Reportes** (`PanelClientes`: Cliente, SOW, Churn, Performance comercial, Benchmark deudores)
dejó diez hallazgos con líneas medidas sobre `main` 2836a02. Instrucción: verificar cada uno antes de corregir, el caso
en rojo primero, la regla en el vault con su fila en `invariantes.md`, datos deterministas y montos en pesos enteros.

## Los diez, verificados (el desfase de líneas contra 2836a02 era de ~975 en la primera mitad del fuente y ~1.265 en la segunda)

| # | Hallazgo | Verificado | Regla |
|---|---|---|---|
| 1 | Donut «Share of Wallet» fijo (24 %, «$616.032 MM», «$1,93 B») | sí | 76 |
| 2 | «Mercado vs Security» y la tendencia por zona, series fijas de 2025; el toggle SOW hacía `18 + monto` | sí; además las zonas fijas (Norte/Centro/Sur) no calzaban con las del activo («Zona Norte (Andina)», …) | 76 |
| 3 | «Competidores capturando cartera», ocho filas fijas con BICE adentro | sí | 76 |
| 4 | «Brecha crítica» siempre en 0 por construcción | sí: «Security» exigía estar a ≤10 pp de la meta; en el activo había 88 clientes a más de 20 pp | 76 |
| 5 | «Solo competencia» contaba los que caen o están 10 pp bajo la meta | sí: **100** clientes; con SOW 0 son **22** | 76 |
| 6 | KPI «SOW Target Deudores Prime» mostraba el SOW general | sí; con el reparto proporcional el SOW prime y el general eran la misma cifra por construcción | 77 |
| 7 | Facturas emitidas con razón inventada por hash | sí, en el Dashboard y en Performance: **157 de 233** clientes fuera de esa banda según el A1 | 77 |
| 8 | La pérdida por cesión real vivía en `avanzarPipeline`, que nadie llama; `evaluarPerdidas` sorteaba el 12 % | sí | 78 · ADR-0023 |
| 9 | Benchmark deudores rellenaba con historia sintética y no leía la «Tasa de cierre» registrada | sí: 5 filas inventadas por deudor, montos de $50 a $650 (eran millones), competidor por hash de una lista con «Security Factoring» | 79 |
| 10 | `sowTargetPct` calculado y nunca leído | sí | 77 |

## Hecho

- **Regla 76** (Cliente y SOW): `ventanaSow`, `estadoCartera`, `segmentoSowCartera`, `desviacionSow`, `sowDeCartera`,
  `seriesCartera`, `pctSerie`, `competidoresDeCartera`, `cedeAOtros`, `lunesISO`. `PC_CLIENTES` guarda la ventana de 8
  semanas. Medido: «Solo competencia» = «Sólo con otros» = SOW 0 = **22**, el mismo conjunto; desviación **118/27/66**
  de 211; donut **64 %** (M$228.419 / M$127.870); 14 competidores que suman exacto lo ajeno, sin el tenant. Fuera
  `PC_COMPETIDORES`, `PC_MERCADO`, `PC_SECURITY`, `PC_ZONA`. El filtro «Operan con otros» de Clientes pasa a contar lo
  mismo que la card del Dashboard, y el rótulo «cedidos en el año» —que era `COLOC_PROM_12M`, lo nuestro en promedio
  mensual— dice lo que es.
- **Regla 77** (Performance + Dashboard): `indicesCartera` (A2 y A1 por semana), `sumarSemanas`, `filaCartera`,
  `sumarFilas`, `frenteATarget`. Las dos pantallas suman con lo mismo: para el mes en curso dicen las dos facturado
  M$677.823, ganado M$211.321 (SOW 64 % · 92 % frente a BCI - Santander) y SOW prime 65 %. KPI renombrado «SOW deudores
  prime»; columna «Vs target» en la tabla y en la evolución semanal; las metas prime y target del Dashboard pasan a ser
  del mes.
- **Regla 78** (T1, ADR-0023): `perdidaPorCesion`; `evaluarPerdidas` decide con el A2, sin sorteo, y anota la cesión parcial.
- **Regla 79**: `benchmarkPor` sólo con operaciones del tubo, la tasa de cierre registrada (o vacía) y nuestra tasa de
  la simulación (o vacía); la estrategia compara contra lo registrado o pide registrarlo.
- **En rojo primero**: casos 172–175 (171/175 antes de implementar: tres por función inexistente y el 175 contra el
  código viejo: 9 filas donde había 4, tasas 1,21 y 1,35 inventadas); `regla_76/77/78.test.mjs` rojos; `e2e-76` y
  `e2e-77` escritos tras mirar la pantalla y **corridos en rojo contra un build del fuente anterior** («Solo competencia
  dice 100 y Sólo otros 22»; «Cedido a Security no muestra la participación frente al target»). `CASOS_ESPERADOS` 171 → 175.

## Lo que se destapó y NO se arregló: el giro automático (decisión del usuario, T1)

Retirar `avanzarPipeline` —378 líneas que nadie invoca— tumbó cuatro gates: el de la regla 48 (la rama «otorgamiento →
Pendiente Integración» con `otorgamientoCompleto && verif pend 0` **sólo existe ahí**), dos de la regla 5 (cuentan
escritores de `stage: "perdida"`) y la línea base de código muerto (cinco símbolos que sólo él usaba). Lo que corre de
verdad es un efecto del componente raíz que, con `otorgamientoCompleto`, manda la operación **a «Girada»** sin mirar
VER-01 y sin pasar por «Pendiente Integración» —las reglas 26 y 43 dicen lo contrario—. Llevar la rama al efecto vivo es
un T1 sobre el flujo de la plata, fuera de la revisión de Reportes: se restauró `avanzarPipeline` byte a byte y quedó
primero en el tablero.

## Fallos del camino (causa y solución)

- **Un gate de texto cazaba el comentario que anota el retiro** (`\bPC_MERCADO\b` sobre todo el fuente) → se busca la
  DECLARACIÓN a columna 0: nombrarlos no es traerlos.
- **Importar un `.test.mjs` desde otro registra sus tests dos veces** (lo avisa `_comun.mjs`) → `tramo` se mudó a `_comun.mjs`.
- **`hashStr([^)]*"fac")` era demasiado ancho**: cazó `hashStr(op.id + "fac")`, que siembra otra cosa en Operaciones →
  el patrón exige `RUTCliente`.
- **Una sonda reemplazaba `l="SOW deudores prime"` y tocaba `label="SOW deudores prime"` del Dashboard**, que también
  termina en `l="…"` → las sondas mutan dentro del tramo de la función y el gate busca el atributo con su espacio delante.
- **`A && B && (C) &` manda al fondo la cadena ENTERA**, no sólo `C`: la salida de los primeros se pierde. Para esperar,
  un `until … do sleep; done` sobre el archivo de salida.

## Lo que queda anotado (medido, sin tocar)

Los 25 cedentes sin ficha en el A5 que sí ceden a Security figuran «Inactivos»; «Brecha de wallet» multiplica por
`COLOC_PROM_12M`; «SOW promedio» (30 %) promedia prospectos en 0 al lado del donut (64 %); `COMPETENCIA_POR_RUT` corta el
22-06 y deja fuera 3.352 cesiones del 23-06; `COMPETIDORES` (fallback de `competidorDe`) trae a «Security Factoring» y a
«Coface Chile»; `dashSerie` fabrica las sparklines de varias cards; el Plan Mensual Ejecutivo simula lo «real» con `pcRng`.

## La integración a `main` (24-09, pedido del usuario: «hace el merge»)

`node sincronizar_main.mjs` dijo «al día»: `origin/main` seguía en `0368686`, así que la mezcla no trae nada nuevo y el
árbol mezclado es el que pasó los siete pasos en la rama (el fuente y las pruebas, byte a byte). La `main` local del clon
estaba seis commits atrás de `origin/main` sin nada propio: se puso al día con `git branch -f` antes de mezclar, porque
el hook bloquea en `main` todo `git merge` sin `--no-ff`, también el que sólo avanza. El tablero se actualizó en un commit
de la rama y no dentro del merge, para que el merge no traiga contenido que no está en ninguno de sus padres.
