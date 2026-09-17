---
type: sesion
title: "17-09-2026 — cerrar la tabla de invariantes"
description: "Un gate por cada una de las 30 filas que iban sólo por revisión (21 reglas de dominio y los 9 invariantes del contrato sin gate): 30 agentes escribieron, 30 refutaron, se reparó lo refutado y se pulió lo aceptado; los gates destaparon defectos de producto que se corrigieron en el mismo commit y desfases regla↔código que quedan como decisión"
tags: [sesion, gates, invariantes, agentes]
timestamp: 2026-09-17T22:31:35Z
---

# 17-09-2026 — cerrar la tabla de invariantes

**Pedido:** «ya puse el tag, ahora cierra la tabla de invariantes». **Resultado:** las 61 reglas de dominio y los 12
invariantes del contrato tienen gate; la suite pasa de 115 a 139 casos, `tests/e2e/` de 1 a 16 archivos
(29 casos) y `tests/contract/` de 6 a 24 archivos. Rama `claude/ecstatic-ptolemy-f7cb4m`, commit (este).

## Método

1. **Un agente por fila** (30, effort alto) con un brief invariante: no editar el repo, no construir, todo en
   `scratchpad/cerrar/casos/<id>/`, máximo 6 corridas, dos direcciones cuando la regla bloquea, sonda cuando es una
   propiedad. Runner aislado (`correr_caso.mjs`: el prólogo de la suite + el snippet, evaluado en el HTML construido).
2. **Un refutador por fila**, con la consigna de demostrar que el gate NO fija la regla: imaginar la regla rota y
   ver si el caso sigue pasando, las dos direcciones, contaminación del estado global, determinismo, evidencia
   calculada. Veredictos: 19 aceptados con observaciones menores, 11 bloqueantes.
3. **Reparación** de lo bloqueante por un agente fresco (workflow `wf_fef0d52b-a85`, concurrencia 2 = nproc − 2):
   seis filas reparadas por agente (5, 8, 11, 14, 15, 30) y **cinco por el orquestador** (17, 31, IDM-01, OTG-01,
   CRY-01) cuando la cuenta topó su límite de sesión por segunda vez. **La re-refutación no alcanzó a correr**: el
   límite cayó justo ahí, y lo reparado se verificó corriendo cada gate y la verificación completa, no con un
   refutador nuevo. Queda dicho como lo que es.
4. **Pulido** de lo aceptado con observaciones: un agente por fila aplica la sugerencia del refutador sin debilitar
   el gate (siete filas completas; cinco casos de suite los corrigió el orquestador a mano y cinco pulidos que
   quedaron a medias se terminaron acá).
5. Integración: `integrar_casos.mjs` numera cada título distinto desde 116 en el orden de las filas y copia los e2e
   y los tests de contrato con el import de `_comun.mjs` relativo; `actualizar_indice.py` cierra las celdas del
   índice; `patch_gate_indice.py` hace que el índice también verifique las citas a `tests/contract/` y las filas
   del contrato; `patch_gate_suite.py` enseña al gate de la suite los casos asíncronos (`const TIT = "N …"`).

## Lo que los refutadores encontraron (y por qué valió la pena)

- Gates que fijaban **la salida de hoy y no la regla**: el de la fila 8 exigía «aprobado» para una tasa BAJO el mínimo
  del deudor (lo contrario de la regla) y se blindaba contra la corrección; el de la 10 declaraba «fuera de regla» el
  único intento «no entregado» que la cláusula (i) describe; el de la 2 exigía que NO existiera la función que la
  regla nombra. Los tres se reescribieron.
- Comprobaciones **vacuas**: el solape de cabeceras por `getBoundingClientRect` de ítems de grid (15-quater-bis) no
  puede fallar nunca; «lo que el emisor postea es el registro inyectado» con la lista vacía (15-bis-bis) no distingue
  `unshift` de `push`; «el disponible entra neto de A23» (12) era una identidad que el propio dato construye.
- **Contaminación** entre casos e2e: el runner comparte una página, y un caso dejaba el filtro rápido en «Sin
  línea», el Directorio encendido (el toggle dice «Directorio · 5» y el harness no lo reconocía), un modal abierto
  que bloquea la navbar del resto de la corrida, o claves en `localStorage`. El harness ahora reinicia el estado al
  empezar cada ARCHIVO (Directorio apagado, filtro «Con línea» —el de arranque, que muestra 3 de las 5 filas del
  Directorio—, sin modal) y `encenderDirectorio` es idempotente.
- Casos que **reventaban en vez de fallar** (`TypeError` sobre `undefined`, `RangeError` con un tope `Infinity`):
  en la suite, un throw aborta `page.evaluate` y se pierde el reporte de los otros casos.

## Defectos de producto corregidos en el mismo commit (`parche_defectos.py`)

| Regla | Defecto | Arreglo |
|---|---|---|
| 13-sexdecies | «Retirar la última factura está permitido» y la mutación lo vetaba (`nuevasOp.length === 0`); el sub-tab «documentos» conservaba el veto viejo | La guarda se retira; en Prospección/Oferta retirar la última va por `limpiarSimulacion` (oferta vacía, vuelve al panel de arranque); el sub-tab pierde el veto |
| 14 | La vía «noConfirmada» retiraba la factura sin `setReevalPend(true)`: la línea se recalculaba sola | `setReevalPend(true)` en la misma sentencia, como las otras dos vías |
| OTG-01 | `revertirVisado(x)` usaba `val` y `revertirExc(deal, k)` usaba `x`/`val` sin recibirlos: revertir un visado reventaba con `ReferenceError` | Reciben lo que usan; revertir un O05 aprobado por la vía física revoca la evidencia (`revocarEvidenciaContrato`, dual de `registrarEvidenciaContrato`) |
| 5 | «Cerrar oportunidad» por tarifa bajo el piso cerraba sin motivo y `reject` grababa el status de la operación viva como causa; el lector devolvía el genérico; los 4 escritores automáticos no grababan actor ni fecha; la bitácora estampaba «Sistema» en toda pérdida; arrastrar una Perdida en el Kanban (o «Avanzar a») la revivía | Motivo `price_rate`; causa nunca el status; el genérico se dice «causa no registrada»; `perdidaPor`/`fechaPerdida` en los seis escritores; la bitácora nombra al actor; `moveTo` y `moverEtapa` miran el origen |
| RAT-01 | El texto decía «(usuario, colección)» y la clave real es `${usuario}|${familia}` | Texto del invariante y del visor |

## Desfases regla↔código que quedan como DECISIÓN del usuario (tablero)

Cada uno lo midió un gate y quedó ESCRITO en el detalle del caso o en `hallazgos` del reporte; ninguno se afirma ni se
niega en la suite. Corregirlos es cambiar el producto o la regla, y eso lo decide el usuario.

1. **Regla 8 — «fuera de atribución si el cliente pide tasa bajo el mínimo del deudor» no se computa.**
   `generarContactabilidad` fija `fueraAtribucion = false` siempre; el único escritor de `true` es el botón «Contactar a
   ejecutivo» del mock de WhatsApp (que no mira ninguna tasa) y el guion del cron que narra «el cliente pidió una tasa
   bajo el mínimo» exige `prospeccion && fueraAtribucion`, combinación inalcanzable (el botón mueve a «oferta»). Medido:
   1.889 de 5.520 contactos piden bajo el mínimo y 0 quedan marcados. El predicado es de una línea
   (`tasaSolicitada < tasaMinIA(deudor)`) y el evento que lo dispararía no existe: decisión de producto. El caso 118
   fija lo que sí existe (piso + costo del tenant, escalera, O01) como proxy declarado.
2. **Regla 10 — `iniciarContacto` reintenta hasta 3 veces un mensaje NO entregado** («fallido»), contra la cláusula (i):
   la UI sólo obliga a cambiar el teléfono antes del PRIMER reintento (`contactoModificado` no se limpia tras un reintento
   fallido). Y el generador de historiales no produce «no entregados» (el 14 % que el stream comenta ya no existe).
3. **Regla 12 — el detalle vuelve a correr el motor en `otorgamiento`**: `snapVersionCli` cuenta como aceptadas
   `[aceptadas, cesion, otorgamiento, giro]` y recorta, pero `bloqueado` en el drawer es `[aceptadas, cesion, giro, perdida]`,
   así que una operación firmada con pendientes (regla 26) re-asigna contra un disponible que ya viene neto de su propia
   reserva. Y el adaptador A23→motor que lea `reservada`/`requiere_resimulacion` no existe: el motor sólo ve `aprobada − uso`.
4. **Regla 28 vs la cabecera del detalle**: `· {deal.id} · {STAGES[stageIdx].name}` (~7626) y `stageLbl` (~7347) rotulan con
   el catálogo BASE («Prospección» / «Oferta y Negociación») mientras el tubo dice «Sin gestión» / «Negociación» para la
   misma operación; el caso 110 homologó seis sitios y éste quedó fuera (lo midieron 12-bis y 13-quaterdecies).
5. **Regla 13-terdecies / 14 — la tarjeta «Línea de crédito» del detalle** (~7809–7832) dibuja «Esta operación» y «Línea
   proyectada» SIN la compuerta `deal.simulado`: con la oferta sin simular pero con `monto` (el paquete del inbound) muestra
   el tramo y la proyección que la regla 14 dice que no se muestran hasta simular. Tercera copia del indicador.
6. **Regla 15 — el callback push no existe** (sólo pull con «Consultar estados»); «una solicitud por línea» vive sólo en la
   pantalla (`conSolicitud` en `LineasView`), no en la inyección.
7. **Regla 15-bis-bis — `idProceso` no es único entre pestañas**: `SOLIC_SEQ` arranca en 0 en cada documento y
   `recibirSolicitudLinea` no avanza la del tubo, así que dos pestañas de detalle que cierren dos ofertas producen el mismo
   `PRC-2601` y la segunda solicitud al comité se descarta EN SILENCIO como duplicada. Defecto de diseño.
8. **Regla 17 — dos ofuscadores con convenciones opuestas**: `fonoOfuscado` deja los ÚLTIMOS 4 dígitos («•••4321») y el
   `ofs` local de `editarContacto` tapa los últimos y deja el PREFIJO («+56 9 8765 XXXX»); bitácora y auditoría juntas
   revelan el número completo.
9. **Regla 27-bis** — el `<h1>` de Reportes sigue diciendo «Gestión de Clientes» (ya anotado en la regla); el catálogo de
   vistas está copiado tres veces (navbar a mano, `VISTAS` de Command-K, `capturar_pantallas.mjs`): extraer un `VISTAS_APP`.
10. **Regla 29 — «Solicitud línea $X»** se condiciona a `disponible > 0` ANTES de esta oferta: 11 de 16 deudores que
    quedaron en $0 por el tope del CLIENTE siguen en verde «Línea disponible $X». Y dos M$ en sitios de documento que el
    gate tolera a propósito: el badge «M$Y puntual» del chip «Línea disponible» y el titular «Aceptada · M$X con línea
    asignada».
11. **Regla 5 — «reapertura = operación nueva con referencia»** no existe como dato ni función (el gate sólo fija que no
    se reabre en sitio).
12. **Regla 13-octies-bis — auditoría que se pierde**: `registrarAuditoria` persiste en un timer de 1.200 ms y no hay flush
    al cerrar la pestaña (`beforeunload` sólo vuelca el log técnico): quien vacía la oferta y cierra el detalle en menos
    de 1,2 s pierde ese registro. Medido: 7 entradas en memoria, 6 en localStorage.
13. **Regla 15-quater-bis** — `updDeu(i, {propuesta})` desde la fila no sincroniza `productos[].propuesto`: la siguiente
    edición de un producto pisa la corrección de la fila; y aprobado 0 se muestra «—» mientras utilizado 0 se muestra «0».
14. **TEN-01 — el gate está abierto sin sesión** (`SESION === null` escribe en la tabla de `TENANT_ACTUAL` sin pasar por
    TEN-01); y `mutaciones: ["*"]` promete más de lo que cubre: sólo los repos de `crearRepo`, no las escrituras de
    configuración por tenant (`escribirVersionado` con `*_KEY` de carga).
15. **LIN-01, GIR-01, ATR-01 — evaluadores declarados y NO cableados**: `validarMutacion(` tiene un solo call site
    (`prioridadCurse.set`). Ni crear/incorporar facturas, ni girar, ni guardar condiciones pasan por el contrato; el
    avance automático escribe `otorgamiento → giro` sin pasar por cesión, que es justo lo que GIR-01 rechaza. Los casos
    fijan el EVALUADOR, no el flujo. ATR-01 además es fail-open bajo `bandas[0].tMin = 0.78` (literal duplicado del viejo
    mínimo absoluto, la forma de la regla 9-bis): con el mínimo del tenant en 0,50 un 25,7 % de descuento da «ok»; hoy
    inalcanzable (tasaRef mínima 0,98) pero abierto.
16. **PRI-01 — quitar la prioridad no pasa por el contrato**: `setPrioridadCurse(id, code, false)` borra sin
    `validarMutacion`, y los botones de la UI («Quitar prioridad de curse») también; sólo los tapa `puedeMarcar`.
17. **IDM-01 — el duplicado observado se contabiliza como RECHAZO** (`registrarRechazo`, mismo contador
    `CONTRATO_RECHAZOS` que TEN-01/RAT-01) y el log dice «rechazó» cuando nada se rechazó; sólo `datos.observado: true`
    lo distingue.
18. **CRY-01 — el prototipo persiste hash+sal en `localStorage`** (`fs_curse_<neg>`) para que `curse.html` valide en otra
    página, y NO hay límite de intentos en `validarOtp` ni familia `otp.*` en `CONTRATO_LIMITES`: lo que la regla llama
    servidor no existe en el cliente; el gate fija lo persistible (hash+sal, nunca el código).
19. **Regla 2** — `sc.score` se calcula y no se usa en dos filas del detalle (~8001, ~8062): código muerto para el auditor.
20. **Regla 15-quinquies** — el marcador de ausentes trata `""` como ausente (`v == null || v === ""`).

## Errores del proceso (para no repetirlos)

- El workflow cayó entero en la fase de refutación por el límite de sesión de la cuenta («resets 7pm UTC»); se
  reanudó con `resumeFromRunId` y los 30 escritores salieron del caché.
- `integrar_casos.mjs`: un título con backticks cortaba el regex del título; y `String.replace` con un snippet que
  contiene `$` seguido de backtick insertó la suite entera en medio de un caso (el patrón `$\``): el reemplazo va
  con función.
- El runner e2e nuevo ponía el filtro en «Todos» y 13-terdecies abría otra operación (5 filas en vez de 3): el estado
  de arranque es «Con línea».
- `node --check` no acepta una sustitución de proceso; `column` no existe en el contenedor.
