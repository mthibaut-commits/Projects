---
type: sesion
title: "Sesión 2026-09-23 — El backlog decidido, en rojo primero: ADR-0013 a 0019, antigüedad, corte por reloj, M-19 y el acuse"
description: "Implementación de las decisiones del proceso de curse, un ADR por commit con su regla, su gate y la cadena de verificación completa; empieza por la candidatura (cedida ajena, antigüedad, acuse) y sigue con el cierre, el giro, el corte del día, el comité, los visados, la verificación fallida y el evento de evaluación"
tags: [sesion, curse, inbound, adr, backlog]
timestamp: 2026-09-23T05:30:00Z
feature: proceso-curse
---

# 23-09-2026 · El backlog decidido, en rojo primero

Con las cinco confirmaciones respondidas y mezcladas a `main`, el usuario pidió seguir con el backlog del
tablero: ADR-0013 a 0019, la antigüedad configurable, el corte por reloj, M-19 en el backend y el acuse en
el activo. Un ADR por commit; cada uno con su regla en el vault (siguiente entero libre, desde la 60), su
caso en la suite o su gate, y los seis pasos de verificación. Antes de tocar el fuente, cinco exploradores
en paralelo mapearon el filtro del inbound, el cierre y el comité, el giro y la verificación, las versiones
y los visados, y la infraestructura de pruebas; los extractos quedaron en los resultados de la sesión, no
en el vault: son la foto de un día.

## 0 · Dos cosas que aparecieron antes de empezar

- **`main` llegó sin pasar por Prettier**: un ternario de `VerificacionTab` partido en dos líneas hacía
  fallar el paso 0 sobre el propio `main`. Se corrigió en su commit (`d2027a1`) sin tocar conducta.
- **El A1 ya trae el acuse.** `EstadoDTE` tiene `Aceptado` («2» en 21.974 de las 30.000 filas, con
  `FchAcuseRecibo`), `Reclamado` (2.088), `NotaCredito` (1.487) y 4.451 filas sin nada — o sea que «sin
  acuse» existe en el dato. Lo que falta es que `facturaDeDTE` lo LEA y que el layout lo declare: M-01 es
  más chico de lo que el spec de curse y el informe de gaps decían («el A1 no la trae»), y no exige
  regenerar `datos_inyectados.js`. Se corrige en el commit de M-01.

## 1 · ADR-0014 · La cedida a un factoring ajeno no es candidata (regla 60, caso 159)

**Qué cambió.** «Buena factura» exige ahora una cuarta condición, `!cedidaAFactoringAjeno(f)`, sobre la misma
fuente que ya usaba la incorporación (`cesionDeFactura`, el índice del A2 por `RUT del cedente|folio`); el
perfil de la Bandeja nombra «Cedida a otro factoring (excluida)»; y `estadoCandidata` deja de bloquear la
cedida a Security: la devuelve agregable, rotulada «Cedida a Security» (antes «Ya financiada», bloqueada).
Los casos 95 (fijaba el bloqueo de la nuestra) y 121 (contaba como no capturada toda OTRO con nota sobre
el corte, sin descontar la cedida ajena) se corrigieron con la regla.

**Medido sobre el archivo** (caso 159, 8.000 filas del stream): 192 facturas cedidas a un factoring ajeno
excluidas, 0 capturadas; 266 cedidas a Security capturadas. El A2 trae 7.396 cesiones, 4.534 a Security.

**Lo que costó / sorpresas.**
- **`f.cedida` nunca se asigna** en el fuente: sólo se lee (nueve sitios) y siempre es `undefined`. La cesión
  real sale del índice del A2; el campo es un resto. Queda anotado, no se tocó.
- El evento del stream que evalúa `CRITERIO_PRED` **no lleva el folio en la raíz**: va en `facturasOp[0]`
  (`streamDesdeDTE`). El predicado nuevo lo busca ahí primero y cae a la raíz para los eventos armados a
  mano en la suite.
- La sonda del caso 159 borra la cesión del índice memoizado (`cesionesPorDocumento()` devuelve el `Map`)
  y la restaura en `finally`: así el caso prueba que la exclusión sale del A2 y de nada más.

**Documentos:** `spec-inbound-facturas.md` §3, §11 fila 1 y §12.1 cierran el desfase; el spec del curse
(§5, §14, §15 fila 6 y su conteo: 26 implementadas · 11 distinto), el informe de gaps (M-09, G-06
«cerrado: implementado»), HU-03 (vigente) y CP-007/008 (caso 159) quedan con la medición.

**La capa e2e cazó lo que la suite no podía.** Con la suite en 159/159, diez casos de pantalla cayeron a la vez
(12-bis-b, 13-terdecies, 13-sexdecies a–d, 14 a–c, 59-a): todos agregan «la primera factura agregable» del pool de
la operación del Directorio, y esa factura es una cedida a Security. `estadoCandidata` ya la dejaba agregar, pero
`motivoExcl` —el closure del detalle que decide qué factura de la oferta cuenta— seguía excluyéndola como «Ya
financiada por Security»: entraba y no contaba, «Tienes 1 factura elegida» no aparecía y «esta operación» no
cuadraba con «Total oferta». Se corrigió `motivoExcl` (sólo la cesión ajena excluye), las dos listas de candidatas
rotulan «Cedida a Security» (el `SHORT_EST` del candado perdió sus dos claves de cesión propia) y la regla 60 quedó
con gate de texto propio, `regla_60.test.mjs`, que fija las tres piezas con sonda cada una: la cuarta condición, la
candidata agregable y el motivo de exclusión. Lección: una regla que dice «entra» se fija en TODOS los sitios que
deciden si una factura cuenta; `grep cesionDeFactura(` los enumera (cinco). Y el gate nuevo se equivocó dos veces
antes de quedar: su ventana sobre el predicado se cortaba en el `{}` del respaldo del evento, y su chequeo global
de «Ya financiada por Security» cazaba el comentario que explica por qué se fue — se quitó: el cuerpo de
`motivoExcl` ya lo fija.

**Y un tercer efecto, de tamaño.** Con las cedidas a Security agregables, «Todo lo disponible» de la primera
operación del Directorio (OP-DIR5) pasó de **17 a 39 facturas**, y el caso `e2e-59-a` —que esperaba 2,5 s fijos
tras el clic— leía las pestañas ANTES de que la simulación aterrizara: la latencia simulada es
`latenciaBaseMs + n · latenciaPorDocMs` (700 + 45·39 = 2.455 ms más el render). Se midió construyendo el fuente de
`HEAD` al lado: mismo gesto, 17 facturas, 1.465 ms. El caso ahora espera a que el panel de arranque se retire, que es
la señal, como ya hacía `14_13_sexdecies`. Un tiempo fijo en un e2e es una apuesta sobre el tamaño del dato.
