---
type: sesion
title: "Sesión 2026-09-20 — Los tres controles del giro se cablean en el botón de Operaciones (regla 41)"
description: "Revisando la tabla del spec de excepciones el usuario detectó que faltaban dos controles, y al medirlos apareció el agujero: el botón de integración al core sólo comprobaba la atribución y la huella, así que un visado revertido, una factura retirada o un cupo consumido en otro negocio no volvían a bloquear. Se agregó controlesIntegracion (OTG-02, VER-01, LIN-01 factura por factura y GIR-02), cableada en el botón y en el handler, con regla 41, caso 144, gate regla_41.test.mjs y ADR-0007"
tags: [sesion, otorgamiento, giro, operaciones, invariantes]
timestamp: 2026-09-20T04:30:00Z
feature: null
---

# Sesión 2026-09-20: lo que Operaciones firma, comprobado al firmarlo

## Hecho

- **El agujero, encontrado documentando.** Al revisar la tabla de controles del §5.3 el usuario apuntó
  que faltaban dos: que **Operaciones apruebe** y que **ninguna factura quede sin línea asignada**. Al
  medirlo: la aprobación existía, pero el botón sólo comprobaba **OTG-01** (la atribución del que firma)
  y **GIR-02** (la huella). El resto se daba por hecho porque `etapaTrasFirma` no deja pasar una
  operación con pendientes — **pero esa es la foto del día de la firma**. Entre ese día y el clic pueden
  pasar días, y en el medio un apoderado puede **revertir** un visado, la verificación puede **retirar**
  una factura no confirmada y el cupo de una línea puede **consumirse en otro negocio** del cliente.
  Ninguna de las tres mueve la etapa hacia atrás, y la huella no se entera de dos de ellas.
- **`controlesIntegracion(deal, estado)`**, pura, único sitio que decide. Devuelve las faltas **con su
  código**: OTG-02 (visado vigente), VER-01 (verificación vigente), **LIN-01 factura por factura** sobre
  la asignación congelada en la versión —no el total contra la línea del cliente— y GIR-02. Sin
  asignación que respalde el paquete **falla cerrado**. `lineaAsignadaDe` busca la versión más reciente
  con asignación y sólo calcula si no hay ninguna (regla 12: una aceptada se lee de su versión).
- **Cableada en los dos sitios**: el botón se apaga con `!ctrl.ok` y lista las faltas una por una con su
  código y qué hacer; `aprobarIntegracion` la **vuelve a llamar antes de escribir** —la pantalla puede
  venir de hace un rato— y audita el intento con los códigos en la acción, severidad alta. La atribución
  sigue yendo **primero**: quien no puede firmar no recibe el detalle de lo que falta.
- **Regla 41** en `curse_firma_y_etapas.md` + fila en `invariantes.md`; **caso 144** de la suite, en las
  dos direcciones (limpia integra; cada control por separado bloquea) y `CASOS_ESPERADOS` a 144;
  **`regla_41.test.mjs`** con 11 sondas que vigilan el **cableado**, que es lo que ningún test de motor
  ve; **ADR-0007** con las cinco alternativas descartadas. Spec: §5.3 reescrita, **§5.4 nueva** («La
  aprobación de Operaciones comprueba los controles, dos veces») y la observación 8 **cerrada**. PDF
  regenerado.
- **O05 explícito en la tabla de controles** (20-09, cierre del usuario): que el cliente **autorice
  explícitamente** la operación y que exista el **comprobante** es una regla del otorgamiento, no un
  supuesto del proceso, y la tabla del §5.3 no lo decía —sólo hablaba de la huella—. Se agregó como su
  propia fila, diciendo que es un criterio del catálogo (Operaciones N3) y que por eso **OTG-02 lo
  cubre**: mientras no conste, hay una excepción pendiente. El §6.1 se retituló «El cliente autoriza
  explícitamente la operación» y abre con esa frase. GIR-02 quedó dicho como lo que es: comprueba que
  **esa misma autorización** siga describiendo el paquete.
- **La tabla va en el orden en que se cumplen** (20-09, cierre del usuario): la firma de Operaciones
  pasa a ser la **última fila**, después de GIR-02. Es lo último que ocurre y se da sobre una operación
  que ya está en regla, así que leerla en medio de los automáticos confundía el orden del proceso.
- Verificación: prettier OK, `tsc` 0 TS1, 0 duplicados, build 41,3 MB, **245/245 gates**, **144/144 PASA**,
  y la compuerta comprobada **en Chromium sobre el HTML construido** —0 errores de página, los cuatro
  códigos con su texto—, que es lo que la suite no monta. La capa e2e terminó después, también en verde:
  **29/29 PASA**.

## Decisiones tomadas con el usuario

- «Incorpora un control en el botón… para que no se pueda aprobar si no se cumple con los 3» (20-09). Se
  agregó **GIR-02 al mismo mecanismo**, que ya estaba pero suelto: con cuatro códigos en una sola
  compuerta, la pantalla tiene una sola fuente de «no se puede» y el resolver una sola lista que
  implementar. Las alternativas —avisar sin bloquear, dejarlo sólo al servidor, re-asignar la línea acá—
  están en ADR-0007.

## Errores encontrados y su solución (regla 11)

1. **Un gate de texto que se prueba contra el fuente sin acotar el ámbito pasa por casualidad.** Dos
   patrones (`estado !== "CON_LINEA"` y `ctrl.faltas.map(`) existían **en otra parte** del archivo, así
   que el mutante los borraba de la compuerta y el auditor seguía diciendo que todo bien. Se acotaron al
   **cuerpo de la función** y al `<li>` de la lista. Un gate que no falla con su propio mutante no
   vigila nada, y eso sólo se ve escribiendo la sonda.
2. **`canonico` colapsa `{ area: … }` a `{area: …}`**, así que un `indexOf` escrito a mano contra el
   texto canónico no calza: se pasa el literal por `canonico` también.
3. **Un mutante que borra el bloque no prueba el reordenamiento.** Para comprobar que la atribución se
   mira primero hay que **mover** el bloque, no borrarlo; borrarlo dispara otro fallo distinto y la sonda
   quedaba verde por la razón equivocada.
4. **`cifras.test.mjs` (de otra sesión) cazó las doce cifras** que un caso nuevo desfasa: `CLAUDE.md`,
   `README.md`, `verificacion.md`, `index.md`, `invariantes.md`, `testing.md` y el tablero. Vale la pena
   correrlo apenas se agrega un caso o un gate, no al final.

## Pendiente / siguiente paso

- El resolver del servidor tiene que implementar los cuatro códigos 1:1; hoy el cliente **anticipa** el
  rechazo, que es lo que puede hacer.
- Del usuario sigue pushear el tag `v0.1.0` desde Windows (403 desde el entorno remoto).

## Sorpresas y aprendizajes

- **Documentar un proceso es auditarlo.** El agujero no salió de leer el código buscando defectos: salió
  de escribir una tabla y que el dueño del proceso dijera «falta esto». Un spec que nombra los controles
  uno por uno obliga a comprobar que existan.
- **«No puede llegar acá con eso pendiente» es una afirmación sobre el pasado**, y los controles son
  sobre el presente. Cuando entre dos puntos puede pasar tiempo y hay acciones que retroceden el estado
  sin retroceder la etapa, la compuerta se vuelve a mirar en el punto donde todavía sirve mirarla.
