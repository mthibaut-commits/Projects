---
type: adr
title: "ADR-0005 — El fuente se formatea con Prettier, y los gates de contrato se re-anclan sobre texto canónico"
description: "Decisión del usuario (18-09-2026) de formatear pipeline_comercial.jsx entero en un commit propio, con el costo medido de antemano: 59 de 178 tests de contrato, un caso de la suite y dos auditores a re-anclar. Se descartaron formatear sólo lo que se toca y no formatear"
tags: [adr, fuente, gates, formato, verificacion]
timestamp: 2026-09-18T20:05:00Z
estado: aceptada
reemplaza: null
---

# ADR-0005: el fuente se formatea, y los gates se re-anclan sobre texto canónico

## Contexto

`pipeline_comercial.jsx` es **un solo archivo** y nunca pasó por un formateador. Las líneas largas eran la
norma: un elemento JSX con ocho props, su `style` y su `title` cabían en una sola, y eso hacía que buena
parte de las reglas de PANTALLA se pudieran fijar en el texto con una expresión regular corta y legible.
Veintiún gates `regla_<slug>.test.mjs` y los dos auditores (`auditar_muerto`, `auditar_aislamiento`) están
construidos sobre esa propiedad: leen el fuente como TEXTO y lo recortan por líneas, por sangría o por
literales contiguos. No es un accidente — es lo que permite gatear «el CTA dice esto» sin montar la app.

El costo se pagaba en la otra dirección: diffs ilegibles, ediciones quirúrgicas con anclas de 200 caracteres,
y el hallazgo del 18-09-2026 de que un `const` LOCAL escrito a columna 0 (`PESO_COL`) hacía que el auditor de
código muerto le atribuyera 300 líneas ajenas y declarara «vivos sólo entre muertos» a cuatro símbolos sanos.

Antes de decidir se **midió** el costo de formatear: **59 de 178** tests de contrato caían, más el caso 118
de la suite y dos regresiones de auditor, con el fuente pasando de 26.448 a 49.583 líneas (+87 %).

## Decisión

**Se formatea el `.jsx` entero con Prettier 3.6.2, en un commit propio, y se re-anclan todos los gates que
caen.** El usuario lo decidió con la medición a la vista: *«(c) entera, yo re-anclo todo»*.

- `.prettierrc`: `printWidth 160`, `trailingComma "all"`, `arrowParens "always"`, comillas dobles.
- `.prettierignore` deja fuera `vendor/` (bytes fijados por el SBOM), lo generado (`datos_inyectados.js`,
  `pipeline_comercial.html`, las capturas, `atribuciones_otorgamiento.json`) y `Legado/`.
- El formato pasa a ser **un gate**: `npx prettier --check pipeline_comercial.jsx` corre en el CI junto a los
  demás pasos. Sin él, el formato se deshace en tres commits y los gates re-anclados vuelven a caer.
- Los gates se re-anclan con `canonico()` (`tests/contract/_comun.mjs`): colapsa los espacios, saca la coma
  final antes de un cierre y aprieta los corchetes. Un patrón escrito contra el fuente de una línea vuelve a
  calzar sobre el texto canónico, y deja de depender de dónde el formateador pone los saltos. Las SONDAS de
  cada gate se plantan también sobre el texto canónico: `canonico` es idempotente, así que el detector lo
  normaliza otra vez sin efecto.

## Alternativas descartadas

- **(a) No formatear.** Mantiene los 178 gates intactos y sin trabajo. Se descarta porque el problema que el
  formateo resuelve no es estético: es que la forma del archivo produce **defectos de análisis** (el
  `PESO_COL` a columna 0, los cuerpos de una línea que el auditor de aislamiento no veía) y hace que cada
  edición quirúrgica dependa de un ancla frágil.
- **(b) Formatear sólo lo que se toca.** Barato hoy y caro para siempre: el archivo queda con dos estilos, el
  gate de formato no se puede activar (nunca pasaría sobre el archivo entero), y cada gate cae de a uno, en
  sesiones distintas, sin que nadie relacione la caída con el formato. Es el peor reparto del mismo costo.

## Consecuencias

- **Los gates de texto y el formateador quedan acoplados a propósito.** Cambiar `printWidth` vuelve a mover
  los anclajes. Por eso el `.prettierrc` es parte del contrato y su cambio es un T1, no un ajuste de estilo.
- Tres líneas base cambiaron y quedan dichas en el commit: `BASE_PURAS` pierde `lineaDeDeudor` —que **nunca
  fue pura**: era una función de una línea y el auditor empieza a leer el cuerpo en la línea siguiente, así
  que veía un cuerpo vacío—; la cota de la sección C de `auditar_muerto` sube de 12 a 60 líneas porque una
  firma larga pasó a ocupar una línea por prop; y la ventana del caso 118 sube de 6 a 12 líneas porque el
  `onClick` que envuelve a `onReject(deal.id)` se abrió en cuatro.
- El punto ciego de los cuerpos de una línea **ya no se puede reintroducir sin querer**: el formateador no
  deja cuerpos de una línea. Queda escrito igual, porque la causa era el auditor y no el fuente.
