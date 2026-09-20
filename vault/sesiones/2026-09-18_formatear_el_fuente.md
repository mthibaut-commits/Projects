---
type: sesion
title: "Formatear el fuente entero y re-anclar los 59 gates que cayeron"
description: "El .jsx pasa por Prettier (26.448 → 49.583 líneas), el formato se vuelve el paso 0 del CI, y los 59 tests de contrato, el caso 118 y los dos auditores que se apoyaban en la forma del archivo se re-anclan sobre texto canónico. Con el costo medido antes de decidir y los dos falsos negativos que el formateo destapó"
tags: [sesion, formato, gates, auditores, adr]
timestamp: 2026-09-18T20:40:00Z
---

# Formatear el fuente, y qué se rompe cuando los gates leen texto

## Qué se decidió y con qué medición

El usuario eligió la opción **(c) entera** —«formatear el `.jsx` en un commit propio, yo re-anclo todo»— después
de que se midiera el costo, que es lo que hace útil la decisión: **59 de 178** tests de contrato caían, más el
**caso 118** de la suite y **dos regresiones de auditor**, con el fuente pasando de **26.448 a 49.583 líneas**
(+87 %). Las alternativas descartadas —no formatear, y formatear sólo lo que se toca— y el porqué están en
[ADR-0006](../adr/ADR-0006-formatear-el-fuente.md).

## El método, porque se va a volver a necesitar

Un gate `regla_<slug>.test.mjs` fija una regla de PANTALLA sobre el TEXTO del fuente. Eso sólo funciona mientras
la forma del archivo sea estable, y un formateador la cambia entera. La receta que resultó, en este orden:

1. **Canonizar el TRAMO, no el archivo.** `canonico()` (`tests/contract/_comun.mjs`) colapsa los espacios, saca la
   coma final antes de un cierre y aprieta los corchetes. Aplicado al principio de cada detector —`const src =
   canonico(src0)`— los patrones escritos contra el fuente de una línea vuelven a calzar casi todos. El primer
   intento fue aplicarlo a los archivos de gate en bloque y **empeoró** (`regla_5` pasó de 4 fallos a 7): el
   destino de `canonico` es el fuente que se inspecciona, no el test que lo inspecciona.
2. **Ajustar sólo los patrones que codificaban el salto de línea.** Los que llevaban `[^\n]*` o contaban líneas.
   Todo lo demás se deja: un patrón que sigue calzando es un patrón que sigue vigilando lo mismo.
3. **Plantar las SONDAS sobre el texto canónico también.** `canonico` es idempotente, así que el detector lo
   normaliza otra vez sin efecto, y la sonda deja de depender de dónde el formateador puso los saltos. Es lo que
   se hizo en `regla_29`, donde 19 de 19 sondas se anclaban en literales de una línea que ya no existen.

Lo que **no** se hizo, y es la tentación: aflojar la exigencia para que el gate pase. La sonda negativa de cada
gate lo delata al primer intento —un gate aflojado deja de cazar su propio mutante—, y ése es exactamente el
trabajo para el que la sonda existe.

## Los dos falsos negativos que el formateo destapó

Los dos son del mismo tipo: un analizador que empieza a leer un cuerpo **en la línea siguiente** a la declaración.

- **`auditar_aislamiento` daba por pura a `lineaDeDeudor`**, que **nunca lo fue**: era una función de UNA SOLA
  LÍNEA (`function lineaDeDeudor(rut) { return lineasDeudor().get(rut) || null; }`) y el auditor veía un cuerpo
  vacío. Al bajar el cuerpo de línea apareció la llamada a `lineasDeudor()`, que está memoizada. `BASE_PURAS`
  cargaba el falso negativo desde siempre. Se revisaron las otras dos funciones de una línea que había en la
  lista —`difPrecioDoc` y `tramoNota`—: ésas sí son puras, con el cuerpo a la vista.
- **`auditar_muerto` § C cortaba las firmas a las 12 líneas.** Prettier pasó a escribir una prop por línea, y
  `SimResumen` declara 22 en 24 líneas: las de la segunda mitad salían reportadas como «props que el componente
  no declara». Eran 11 candidatos donde hay 2. La cota subió a 60 líneas y volvieron los 2 conocidos, que son
  los dos falsos positivos por anidamiento que el propio auditor documenta.

El punto ciego de los cuerpos de una línea ya no se puede reintroducir sin querer —el formateador no los deja—,
pero queda escrito porque la causa estaba en el auditor, no en el fuente.

## Las tres líneas base que se movieron, y por qué cada una

Subir un snapshot es una decisión y va dicha en el commit (regla del `workflow.md`). Las tres:

- `BASE_PURAS` pierde `lineaDeDeudor` — el falso negativo de arriba. No es un desacople que se perdió.
- `auditar_muerto` § C: cota de 12 → 60 líneas. Es la misma regla midiendo bien.
- Caso 118 de la suite: la ventana que busca `otorgBloqueado(deal) ?` sobre el call site bare de
  `onReject(deal.id)` sube de 6 a 12 líneas, porque el `onClick` que lo envuelve se abrió en cuatro.

## El gate que hace que esto no se deshaga

`npx prettier --check pipeline_comercial.jsx` entra como **paso 0** —numerado así a propósito: no verifica una
conducta, protege a los que sí, y numerarlo 0 deja intacta la numeración 1-6 que citan `cifras.test.mjs`, el CI y
media docena de documentos—. Sin él, el formato se deshace en tres commits y los 59 gates re-anclados vuelven a
caer de a uno, en sesiones distintas, sin que nadie relacione la caída con el formato.

## Verificación

Paso 0 `prettier --check` limpio · 1 `tsc` sin TS1 · 2 sin duplicados · 3 build 41,1 MB · 4 **188/188** gates de
contrato · 5 **141/141** la suite · 6 **29/29** e2e · 7 las 11 capturas renderizan (exit 0). Las capturas **no
van en el commit**: diez son byte a byte idénticas salvo el sello de build, y la única que cambia de verdad
—`10-tubo-kanban.html`— es la no-determinista conocida (el tubo se retrata a mitad del stream, deuda 4 del
tablero). Meterla habría hecho pasar por cambio del formateo lo que es ruido de la captura.
