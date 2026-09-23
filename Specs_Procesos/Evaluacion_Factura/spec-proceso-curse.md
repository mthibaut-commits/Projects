# El proceso de curse de una operación

**Versión:** 1.0 · **Fecha:** 22-09-2026 · **Sistema:** NEX Factoring · Pipeline Comercial

El usuario revisó las diferencias de la Parte IV cláusula por cláusula y decidió el 22 y el 23-09-2026:
lo que dio por bueno tal como está figura como **implementado (definición ajustada)** con la fecha de su
respuesta, lo que pidió construir conserva su estado medido y lleva «**decidido: implementar**», y una
pregunta abierta llevaría «**por confirmar**» con la pregunta exacta: desde el 23-09-2026 no queda
ninguna. Las decisiones que descartan una alternativa están en los ADR 0013–0019 (`vault/adr/`): un
evento de evaluación con cinco versiones, la cedida a un factoring ajeno, el comité que rechaza, la
excepción que deja de aplicar, el giro Normal cuando hay comité y, el 23-09-2026, la verificación
fallida que marca la operación y avisa al ejecutivo (ADR-0018) y el corte del día que elimina la
oportunidad sin oferta y no toca la que la tiene (ADR-0019).

Este documento describe **el curse de una operación** tal como el negocio lo define: la máquina de
estados por la que pasa un negocio de factoring desde que el inbound lo abre hasta que Tesorería
gira, quién actúa en cada estado y qué produce cada evaluación. La unidad es la **operación** —el
negocio de un cliente con sus deudores y su paquete de facturas—, no el documento tributario:
`spec-ciclo-factura.md` ya sigue a la factura y explica la costura entre los motores, y este
documento **no lo repite**, lo cita por sección. Tampoco es el spec de ningún motor: cada uno tiene
el suyo y acá sólo se dice cuándo corre, qué recibe, qué devuelve y qué se versiona.

Lo que este documento hace, y ningún otro hacía, es poner frente a frente **el modelo del negocio**
(normativo: las cláusulas M-01 a M-40 de la Parte IV) y **lo que el sistema hace hoy** (medido contra
el fuente el 22-09-2026). Donde el modelo dice algo que el sistema no hace, se escribe con las
palabras **pendiente** o **decisión abierta**; nunca se describe como si existiera.

Se lee en cuatro tiempos:

- **Parte I — el modelo.** Qué es el curse, la máquina de estados con el catálogo real de etapas, el
 mapa del camino y los actores.
- **Parte II — las etapas del proceso.** Una sección por etapa, cada una en tres bloques: qué dice el
 modelo, qué hace el sistema hoy, diferencias y pendientes.
- **Parte III — los invariantes.** Las reglas del vault que gobiernan el proceso, con su número y su
 gate.
- **Parte IV — la conciliación.** La tabla cláusula por cláusula, las contradicciones que hay que
 decidir y lo pendiente agrupado por motor.

> **La premisa que ordena el documento.** El modelo del negocio es la **definición normativa**; el
> sistema es **la medición**. Cuando difieren, este documento no elige: registra la diferencia con su
> evidencia (la regla del vault por su número, la sección del spec o la condición del fuente por su nombre) y la lleva a la lista de decisiones. Todo monto es un
> peso entero; el millón es abreviatura de pantalla (`M$`), no una unidad de dato.

---

## Parte I · El modelo

### 1. Qué es el curse y qué lo distingue de la evaluación de una factura

**Cursar** es comprar un paquete de facturas a un cliente: decidir que se compra, a qué precio,
contra qué línea, con qué aprobaciones y por qué vía se gira, y dejar cada decisión con evidencia de
actor y hora. La **operación** es la unidad de esa decisión: nace como oportunidad de un cliente
(`spec-ciclo-factura.md` §1 «Qué hace»: una oportunidad por cliente, nunca por factura, porque el
ejecutivo se asigna por cliente), se convierte en oferta cuando el ejecutivo elige documentos, se
evalúa, se publica, el cliente la firma y la casa la integra al core.

La **evaluación de una factura** es otra cosa y tiene otro dueño: cada motor decide sobre su propia
unidad —la factura en líneas y prorrateo, el deudor en verificación y giro, la regla × el sujeto en
otorgamiento, la operación en pricing (`spec-ciclo-factura.md` §0, tabla «Los siete motores»)— y la
operación agrega esos veredictos. Tres consecuencias que el resto del documento usa:

- La operación **cambia de estado**; la factura **entra o sale** de ella. Hoy un deudor que no confirma
 retira sus facturas y la operación encoge con la firma vigente (§11); decidido (ADR-0018): marcar
 «no verificada» deja la operación con un issue y avisa, y es el ejecutivo quien retira, re-simula y
 vuelve a publicar para una nueva firma. Un rechazo firme del cliente pierde la operación
 entera (§13).
- Lo que un motor decide **se versiona como evidencia** de la operación (§8), y la evidencia no
 reserva ni decide la evaluación siguiente (`spec-ciclo-factura.md` §17).
- Las **compuertas** (excepciones justificadas, monto a girar positivo, OTG-02, VER-01, LIN-01,
 GIR-02) son de la operación: se comprueban sobre el paquete completo, factura por factura cuando
 corresponde (regla 41).

### 2. La máquina de estados de la operación

El catálogo real tiene tres capas. El **modelo** declara siete etapas en `STAGES` con su
orden `STAGE_ORDER`. El **tenant** puede renombrarlas y colorearlas (`ETAPAS_TENANT_DEFECTO`, regla 28), y `ETAPA_PUBLICADA = "oferta_publicada"` es un pseudo-estado que no es un
`stage`: es `oferta` con la oferta cerrada y publicada (`etapaVisualId`). Después de la firma
manda un tercer traductor, `estadoOperacion`, que no es configurable y gana sobre el rótulo
del tenant (`etapaDeDeal` = `estadoOperacion(d) || stageName(etapaVisualId(d))`).

| Estado (id del modelo · rótulo del tenant) | Qué lo abre | Qué lo cierra | Quién actúa |
|---|---|---|---|
| `prospeccion` · **Sin gestión** / Prospección | La corrida horaria del inbound crea la oportunidad con la oferta vacía (`correrProceso`); o el rollover de fin de día la reabre con el mismo id (`rolloverDia`). Decidido (ADR-0019): el reinicio del día abre otra, con id propio y referencia a la que el corte eliminó (§5) | La **simulación** de la oferta (`simularOferta`, regla 12-bis); o la pérdida. Decidido (ADR-0019): el corte del día la elimina si sigue sin oferta | Inbound (sistema); el ejecutivo arma la oferta |
| `oferta` · **Negociación** / Oferta y Negociación | `simularOferta` promueve `prospeccion → oferta` | Cerrar y publicar (`cerrarOferta`); la pérdida por oferta no aceptada o cesión a otro factor (`evaluarPerdidas`) | Ejecutivo; Agente IA (opcional, regla 8); apoderados si hay pre-evaluación |
| `oferta_publicada` · **Oferta publicada** (pseudo-estado) | `patchCierre` asienta `ofertaCerrada` + `ofertaComunicada` (`ofertaPublicada`, regla 58). El predicado tiene dos lecturas más: «cerrada» = `ofertaCerrada \|\| negocioNum` y «comunicada» = `ofertaComunicada` **o** algún mensaje de `waSesion` que calce `/Oferta de factoring/i`, porque el Agente IA publica por WhatsApp sin la bandera (regla 8, caso 158): también entra al pseudo-estado una oportunidad con `negocioNum` cuya sesión de WhatsApp contenga la oferta del agente, sin pasar por `cerrarOferta` | La firma del cliente en el portal (`confirmarCierre`); reabrir (`reabrirOperacion`) vuelve a `oferta` | El cliente en el portal; comité (solicitud inyectada); apoderados y verificación (pendientes ya exigidos, regla 54) |
| `aceptadas` · **Aceptada** | Id del catálogo; `estadoOperacion` lo rotula igual que `cesion`. En el fuente no se encontró escritor de `stage: "aceptadas"` con esa cadena: la firma escribe `cesion` u `otorgamiento` según `etapaTrasFirma` (el `patch` de `confirmarCierre`) | — | — |
| `cesion` · **Aceptada** (rótulo) / **Pendiente Integración** (con `integracion: "pendiente"`) | `etapaTrasFirma` cuando la firma no deja nada pendiente: `{stage: "cesion", integracion: "pendiente"}`; también `moverEtapa` (botón «Avanzar» del detalle) tras la compuerta OTG-02, pero **sin** `integracion` —`estadoOperacion` la rotula «Aceptada», no «Pendiente Integración»— (§13) | `aprobarIntegracion` tras OTG-01 y `controlesIntegracion` | Operaciones N3 |
| `otorgamiento` · **Otorgamiento / Verificación** | `etapaTrasFirma` cuando falta algo: motivo `linea_o_deudor` · `excepciones` · `verificacion` · `evidencia`; también `moverEtapa` y el arrastre del Kanban (`moveTo`), sin guarda (§13) | `otorgamientoCompleto` → el `useEffect` de avance; la pérdida por bloqueo firme | Apoderados por (área, nivel); Ejecutivo de verificación; el ejecutivo (respaldos); Operaciones (O05 física) |
| `giro` con `giroPendiente: true` · **Pendiente de Giro** | `aprobarIntegracion` escribe `{stage: "giro", integracion: "aprobada", giroPendiente: true}` y congela el giro en `repoGiro` | El callback de Tesorería (`recibirGiroTesoreria`) | Tesorería (fuera de NEX, regla 43) |
| `giro` sin `giroPendiente` · **Girada** | El aviso de Tesorería devuelve el patch `{giroPendiente: false, giroRef, giroTs}` | Terminal | — |
| `perdida` · **Perdida** | Ocho escritores (§13): manual (`reject`), cron (`evaluarPerdidas`), bloqueo firme (`useEffect`) y dos manuales sin causa (`moverEtapa`, `moveTo`) | Terminal (regla 5): reabrir es una operación nueva con referencia | Ejecutivo; sistema |

Dos colapsos de pantalla que no son estados: `displayStageId` muestra `giro` como
`aceptadas` en el tubo, y `fueraDelTubo` saca de la lista lo que ya es de Operaciones.

### 3. El mapa del camino

```
 DTESync (A1) ──┐
 AECSync (A2) ──┤ cada hora simulada (CRON_MS)
 listas A3/A4 ──┘
 │
 ▼
 ┌─────────────┐ simularOferta ┌─────────────────┐ cerrarOferta ┌──────────────────┐
 │ prospeccion │ ──────────────▶ │ oferta │ ──────────────▶ │ oferta_publicada │
 │ Sin gestión │ │ Negociación │ + solicitud │ (pseudo-estado) │
 └──────┬──────┘ └────────┬────────┘ al comité └────────┬─────────┘
 │ rolloverDia │ Re-evaluar: líneas · otorg · │ firma en el
 │ (mismo id) │ verificación · pricing · giro │ portal
 ▼ ▼ ▼
 (reabierta, oferta vacía) versión append-only confirmarCierre → etapaTrasFirma
 │
 ┌────────────────────────────────────────┴───────┐
 │ falta algo (OTG-02 · VER-01 · O05 · línea) │ nada falta
 ▼ ▼
 ┌─────────────────────────┐ otorgamientoCompleto ┌────────────────────────┐
 │ otorgamiento │ ───────────────────────▶ │ cesion + integracion │
 │ Otorgamiento/Verificac. │ (hoy salta a Girada: │ «Pendiente Integr.» │
 └────────────┬────────────┘ desfase, §11) └───────────┬────────────┘
 │ bloqueo firme │ Operaciones N3:
 ▼ │ aprobarIntegracion
 ┌────────────┐ ▼
 │ perdida │ ◀── reject · evaluarPerdidas ┌──────────────────┐
 │ (terminal) │ │ giro + pendiente │
 └────────────┘ │ «Pendiente Giro» │
 └────────┬─────────┘
 │ recibirGiroTesoreria
 ▼
 ┌────────────┐
 │ Girada │
 └────────────┘
```

### 4. Los actores

| Actor | Qué hace en el curse | Dónde lo fija el sistema |
|---|---|---|
| **Inbound (sistema)** | Clasifica el stream, agrupa por cedente, abre o actualiza la oportunidad, cierra el día y hoy reabre lo no gestionado; con ADR-0019, al corte elimina la oportunidad sin oferta y al reinicio la vuelve a originar con id propio | `tickCron`, `correrProceso`, `rolloverDia`; `spec-inbound-facturas.md` §6 |
| **Ejecutivo comercial** | Arma la oferta, pide la evaluación, justifica cada excepción, cierra y publica, puede reabrir, puede perder; con ADR-0018, recibe el aviso de la verificación fallida, retira las facturas del deudor no verificado, re-simula y vuelve a publicar para una nueva firma | `incorporarFacturasOferta` / `retirarFacturaOferta` (regla 33), `reevaluarLinea`, `solicitarAprobacionExc`, `cerrarOferta`, `reabrirOperacion`, `reject` |
| **Agente IA** | Canal opcional del primer contacto y de la publicación por WhatsApp; ofrece dentro del piso del deudor | `canalDeRegla` (`spec-inbound-facturas.md` §5.2), `SPREAD_MIN_DEUDOR`, regla 8 |
| **Apoderados por (área, nivel)** | Aprueban o rechazan excepciones en la mesa Otorgamientos o en el tab del detalle; nivel igual o superior de la misma área | `aprobarExc` con OTG-01 antes de escribir; `puedeAprobarExc` (regla 18); `spec-gestion-excepciones.md` §2.2 |
| **Ejecutivo de verificación** | Contacta al deudor, firma verificada / no verificada por factura; hoy retira lo no confirmado (con ADR-0018 marca y el sistema avisa: no retira) | `verificarDeudor`, `marcarFactura`, `noConfirmoDeudor`, `DrawerVerificacion` (regla 53), `puedeVerificarFacturas` (regla 18) |
| **Comité de líneas** (sistema externo) | Resuelve la solicitud de líneas que el cierre inyecta; NEX sólo inyecta y consulta | `solicitudComiteDeOferta` → `api1Inyeccion`; `api3EstadoProceso`; regla 15 |
| **Operaciones N3** | Visa O05 en la vía física; aprueba la integración al core tras los controles | `aprobarExc` (O05), `aprobarIntegracion` con `controlesIntegracion`; regla 41 |
| **Tesorería** (fuera de NEX) | Gira y avisa | `recibirGiroTesoreria` (pura); regla 43 |
| **El cliente en el portal** | Acepta formalmente firmando con código de un solo uso; es la única aceptación válida | `enviarCierre`, `confirmarCierre`; regla 1 |

---

## Parte II · Las etapas del proceso

### 5. Sincronización DTESync e inbound

**Qué dice el modelo (M-01 a M-10).** Las facturas llegan continuamente por DTESync junto con
cesiones, notas de crédito, aceptaciones y reclamos. Cada hora los motores de inbound buscan facturas
que cumplan sus condiciones; si detectan, abren una oportunidad al cliente o actualizan la abierta.
La oportunidad cuantifica las facturas segmentadas en deudores Prime y Otros, y hace un join con la
tabla de líneas para decir cuántas facturas y cuánto monto tienen deudores con línea, Prime con línea
y otros sin línea. Hay una hora de corte (23:00 por defecto) en que se eliminan las oportunidades no
gestionadas y a las 06:00 del día siguiente se reinicia. Una factura es candidata si no está cedida a
otro factoring, no está reclamada y no tiene nota de crédito que la anule; las reglas seleccionan por
RUT emisor, fecha de emisión, reclamo, NC y cesiones previas, cruzando los emisores con una lista
etiquetada.

**Qué hace el sistema hoy.**

- *Llegada.* `facturaDeDTE` lee del A1 las banderas `reclamada` (`EstadoDTE.Reclamado`),
 `notaCredito` y `folioNotaCredito`, y `credito` (`FormaPago === "2"`). Las cesiones **no** vienen
 por DTESync: llegan por el A2 AECSync y se cruzan por RUT cedente + folio (`spec-ciclo-factura.md`
 §1 «Qué recibe», §2 «Qué bloquea un documento»). **Desde el 23-09-2026 el A1 es un flujo de eventos por
 documento** (ADR-0020, regla 70, caso 170): cada factura llega varias veces —la creación, y después cada
 cambio de estado como `DTE_ACTUALIZADO` con el `EstadoDTE` acumulado—; el stream separa la actualización de
 la factura nueva y la aplica donde el documento vive (`aplicarActualizacionDTE`), con traza para la NC y el
 reclamo, y sobre una oferta cerrada, publicada o firmada lo inhabilita y deja la operación no cursable (ADR-0021,
 regla 71, caso 171: el veto de la regla 67 escrito por el SII; el ejecutivo retira, re-evalúa y vuelve a firmar).
- *Corrida horaria.* Un `setInterval` cada `CRON_MS` (`cronMs: 3500`, «1 «hora» = N ms»; `frecuenciaMin: 60`) llama a `tickCron` → `correrProceso` + `evaluarPerdidas`; sigue tras
 drenarse el stream (`spec-inbound-facturas.md` §8). Esa corrida es una **simulación en el navegador**:
 el `setInterval` sólo se instala si `CFG_ACTIVA.modoDemo !== false` (su propio comentario:
 «El cron es parte del MOTOR DE SIMULACIÓN: sin modo demo no corre») y su período es `CRON_MS =
 cfgT.cronMs`, 3,5 s. `frecuenciaMin: 60` es un **parámetro huérfano**, igual que `horaInicio`
 / `horaFin`: se edita en Configuración › Operación (`<input {...num("frecuenciaMin", …)}>`) y
 ningún cron lo lee (`frecuenciaMin` sólo aparece en su declaración, en la pantalla de Configuración y en un comentario). El
 job real del backend está pendiente (§10.4).
- *Candidatura.* `clasificarFactura` toma la **primera** regla activa de `INBOUND_RULES` cuyos criterios califican; un criterio desconocido califica todo (`facturaCalifica`). El
 filtro de calidad «Buena factura» (cuatro condiciones, `CRITERIO_PRED`) y el catálogo de
 criterios viven en `spec-inbound-facturas.md` §3 y §5.1 y no se repiten acá. Lo que importa al
 proceso: **reclamo y NC no son criterios por sí solos** —una regla no puede seleccionar «reclamadas»
 ni «con NC», sólo excluirlas vía «Buena factura»—; los demás criterios de `CRITERIO_PRED` —incluido `Crédito`, que sí es seleccionable por sí solo, y los alias
 persistidos `Clientes` / `No clientes`, que existen por compatibilidad con las reglas
 guardadas en localStorage (el comentario de `CRITERIO_PRED`: un criterio desconocido califica TODO)— son los de
 la tabla de `spec-inbound-facturas.md` §5.1 y no se repiten acá. Las siete `INBOUND_RULES` usan sólo
 «Buena factura», las listas, Cliente / No Cliente y SOW.
- *Apertura y actualización.* `correrProceso` agrupa `acumulado` por cedente y crea la oportunidad
 en `prospeccion` con ejecutivo, CAT, pool de facturas y **la oferta vacía** (`facturasOp: []`);
 tope `MAX_NUEVOS = 40` por corrida, el resto se re-encola. Si el cliente ya tiene una
 oportunidad `_inbound` en `prospeccion | oferta`, las facturas nuevas se suman a
 `facturasDisponibles` deduplicando por id/folio con la traza «Llegaron N factura(s) nueva(s)»
 (`aplicar(warn)`); la oferta elegida no se toca. Si la existente está aceptada, cursada o
 perdida, se abre otra (`spec-inbound-facturas.md` §6 punto 2). **Desfase cerrado el 23-09-2026 (ADR-0013, regla 68; G-09, GD-10):** el fuente prometía una re-simulación
 al llegar facturas nuevas —el banner inalcanzable del detalle, la marca de recálculo en curso y los dos mensajes
 de bitácora «Recalculando…» / «Recálculo aplicado»— que `aplicar` nunca hacía. Se retiraron: la bitácora dice
 «Facturas nuevas para N oportunidad(es): M documento(s) al pool disponible» y «Facturas agregadas al pool», el
 tubo y el detalle no dibujan un estado de recálculo, y la única evaluación es el evento explícito
 (`regla_68.test.mjs`).
- *Segmentación Prime / Otros y join con líneas.* `capacidadDeudores` devuelve tres
 tramos con `n` y `monto`: `primeConLinea`, `otrosConLinea`, `sinLinea`. Prime = `tipoDeudor` Lista
 Blanca o Deudor Autorizado (`CRITERIO_PRED`, `esPrime`). «Con línea» se decide en el
 nivel par (LF2/LF3 propia, o pozo LF4 / LF1 si prime) y en el nivel deudor (`lineaDeDeudor`) con
 el umbral «¿le cabe al menos una factura?» (`spec-ciclo-factura.md` §22). La tarjeta del tubo lo
 dibuja con `chipTramo` y el tooltip del chip `primeConLinea` lo declara
 **cota superior**, «no lo que se va a girar». El nivel cliente viene de `lineaCreditoDe`.
 Esa cuantificación **no es un dato de la oportunidad**: `correrProceso` no la escribe (
 no calcula prime/otros ni línea) y `capacidadDeudores` tiene un solo llamador, la tarjeta del tubo
 al dibujarse, donde es un lookup contra el listado A23 («no una corrida del motor»). En producción no habría dónde consultarla fuera de la pantalla.
- *Cierre del día.* No hay hora de reloj en la lógica, aunque sí como **parámetro huérfano**:
 `CFG_OPER_BASE` declara `horaInicio: "08:00"` y `horaFin: "18:00"` con el comentario «ventana horaria
 de operación (inbound + actualizaciones)», Configuración › Operación las edita con
 `<input type="time">` y ningún otro sitio del fuente las lee (`grep horaInicio|horaFin`:
 cuatro resultados, todos de configuración). El cierre se dispara por conteo: `corridas % HORAS_DIA
 === 0` → `cerrarDiaRef.current` → `rolloverDia(nDia)`. Con
 `reaperturaDiaria: true` y `etapaNoGestionada: "prospeccion"`, toda oportunidad
 `_inbound` que quedó en esa etapa se **reabre con el mismo id** (comentario del fuente «EL ID NO
 CAMBIA»), con el paquete re-escalado, `facturasOp: []`, `simulado: false` y
 `reaperturas++`. Al llegar a `DIAS_SEMANA` el cron pausa y muestra el reporte semanal. Lo decidido
 en su lugar (ADR-0019) está en «Diferencias y pendientes».

**Diferencias y pendientes.**

| Cláusula | Estado medido | Qué difiere |
|---|---|---|
| M-01 | implementado (el 23-09-2026: regla 69, caso 169, `regla_69.test.mjs`; y el flujo de eventos: ADR-0020, regla 70, caso 170, `regla_70.test.mjs`) | Las cesiones llegan por A2, no por DTESync; NC sin monto en el A1. **El A1 es un flujo de eventos por documento** (modelo del usuario, 23-09-2026: «los eventos de dtesync llegan varias veces para la misma factura: una vez se crea, después puede llegar nota de crédito, después aceptación»): 55.549 notificaciones sobre 30.000 documentos, el documento se pliega en un solo sitio y el inbound aplica cada actualización donde el documento vive. **La aceptación es una bandera del DTE** (definición del negocio, 22-09-2026: el acuse de recibo / aceptación del receptor viaja con el documento, como el reclamo y la NC) **y el A1 la trae** —`EstadoDTE.Aceptado` con `FchAcuseRecibo`, `Reclamado` con `FchReclamo`, `FchRecepcion`: 21.974 aceptadas, 2.088 reclamadas, 5.938 sin acuse de 30.000; el informe del 22-09 decía «no la trae» y estaba mal medido—. Desde el 23-09-2026 `facturaDeDTE` la lee (`acuse`, `acuseCodigo`, `fchAcuse`, `fchRecepcion`), `ChipAcuse` la muestra en las tres filas del documento y el Excel de candidatas dejó de sortearla. La aceptación **no participa del filtro de candidatura** (definición del negocio, 23-09-2026: «Las facturas los primeros 8 días desde su emisión no tienen acuse de aceptación y/o reclamo y en ese estado de ausencia de acuse sí son candidatas»): se muestra y no decide; lo que excluye sigue siendo el reclamo y la NC, más la cesión a un factoring ajeno (M-09) y la exigencia de que la venta sea a crédito |
| M-05 | implementado (definición ajustada 22-09-2026) | La cuantificación Prime / Otros es un **join en pantalla**, no un dato que produzca el inbound: se calcula al dibujar la tarjeta (`capacidadDeudores`, cuyo único llamador es la tarjeta del tubo) y no se persiste en la oportunidad. «Prime» acá es sólo listas; en verificación el protocolo recortado es prime **o** nota > 4,2 (regla 6): cuál «Prime» segmenta la oportunidad sigue en §16 |
| M-06 | implementado (definición ajustada 22-09-2026) | El join con líneas es una consulta en pantalla: los tramos son `primeConLinea · otrosConLinea · sinLinea` (sin distinguir prime u otro en el último), y son cota superior, no asignación; se calculan en el render de la tarjeta, no en la oportunidad (M-05) |
| M-07 | implementado | **Implementado el 23-09-2026** (ADR-0019, regla 64, casos 163–164): la hora de corte (`horaFin`, 23:00 por defecto) es un parámetro del tenant que el job consume (`jobDelReloj`); a esa hora la oportunidad del inbound sin oferta se elimina —con su cierre en la bitácora del sistema— y la que tiene oferta no se toca. El corte es por reloj, no por conteo de corridas (`relojSimulado` traduce la corrida de la demo a una hora) |
| M-08 | implementado | **Implementado el 23-09-2026** (ADR-0019, regla 64, casos 163–164): la hora de reinicio (`horaInicio`, 06:00 por defecto) es un parámetro del tenant; a esa hora el inbound vuelve a abrir la oportunidad que el corte eliminó, desde su paquete más lo que llegó, como una oportunidad **nueva** con id propio (`-R<n>`) y `referencia` (`eventoDeReoriginacion`), sin simular y con la oferta vacía |
| M-09 | **implementado** (23-09-2026, ADR-0014: regla 60, caso 159) | El inbound excluye la factura cedida a un factoring **ajeno** a Factoring Security; la cedida a Security **no** se excluye (decisión #6 de §15, cerrada). Hoy «Buena factura» **no** consulta `cedida`; la cesión bloquea sólo al incorporar (`estadoCandidata`) y como pérdida por AECSync. Y la candidata exige «a crédito», que el modelo no menciona |
| M-10 | implementado | Criterio de **antigüedad máxima desde la emisión** como quinta condición de «Buena factura» (`superaAntiguedad`; `antiguedadMaxDias` en `CFG_OPER_BASE`, 20 días por defecto, editable en Configuración › Operación; el perfil de la Bandeja nombra «Antigüedad > N días (excluida)»): **implementado el 23-09-2026** (regla 61, caso 160). Reclamo y NC siguen sólo como parte de «Buena factura», no seleccionables; la «lista de emisores con tags» y la cesión previa quedaron **descartadas** como criterios (22-09-2026): los tags son del deudor (A3/A4) |

### 6. La oportunidad y la selección del ejecutivo

**Qué dice el modelo (M-11, M-12).** El ejecutivo toma una oportunidad sin oferta, la abre y
selecciona las facturas que cumplen los criterios de admisibilidad. Cada vez que selecciona o modifica
su selección, la oferta se evalúa o re-evalúa.

**Qué hace el sistema hoy.** La oferta nace vacía por diseño (`spec-ciclo-factura.md` §1 «La oferta
nace vacía»). El detalle es una pestaña propia con los documentos disponibles del libro de ventas del
cliente (§2 «Documentos disponibles») partidos en «Deudores aprobados línea / sin aprobar» por lo que
`seleccionConLinea` / `facturasConLinea` devuelven `CON_LINEA`. `estadoCandidata`
bloquea en este orden: `noConfirmada` (veto de verificación) → `notaCredito` → `reclamada` →
`cedida` (con `nuestra` y parcial) → `otraOp`. Incorporar y retirar viven en
`incorporarFacturasOferta` / `retirarFacturaOferta` (regla 33). Armar a mano tiene salida: «Tienes N
factura(s) elegida(s) · M$X» y la acción principal «Simular la oferta» (regla 13-sexdecies). Lo que
saca la oportunidad de Prospección es la **simulación** (`simularOferta`, regla 12-bis), no
editar el paquete.

La re-evaluación **se pide**: editar la oferta actualiza al instante sólo lo aritmético (monto,
conteos, monto por deudor) y deja «Por evaluar», sin número, todo lo que depende de líneas o
verificación hasta apretar Re-evaluar (`reevaluarLinea`; regla 14, gate 124, e2e-14).

**Diferencias y pendientes.** M-11 implementado. **M-12 implementado (definición ajustada
22-09-2026)**: cuando cambia la selección de facturas, el ejecutivo presiona simular para volver a
evaluar las condiciones de la operación y todos los motores; el gesto es explícito, la regla 14 se
conserva (con `spec-otorgamiento.md` §2, `spec-asignacion-lineas.md` §8.4 y `spec-ciclo-factura.md`
§3) y «simular» es el evento de evaluación de M-13 (decisión #1 de §15 cerrada, ADR-0013).

### 7. La evaluación: cinco motores en paralelo

**Qué dice el modelo (M-13).** Al evaluar o re-evaluar la oferta corren en paralelo cinco motores
—otorgamiento (EAN), verificación, líneas, giro y pricing—, cada uno con su spec.

**Qué hace el sistema hoy (desde el 23-09-2026, ADR-0013, regla 68).** Son independientes: ninguno llama a
otro y `girosDeDeal` es el único adaptador que conoce a los tres (`spec-ciclo-factura.md` §0 «Tres
propiedades», punto 1). Y hay **una sola pasada**: `evaluarOperacion` es el evento de evaluación —lo
disparan «Simular la oferta» (`simularOferta`, antes de escribir el negocio y sobre el negocio tal como va a
quedar), «Re-evaluar operación» (`reevaluarOperacion`, desde la cabecera y desde el aviso «La selección
cambió») y «Re-evaluación de la simulación» (`reevaluarCliente`, con el origen actualizado)— y corre los
cinco motores sobre el mismo paquete: otorgamiento (`res`), verificación, líneas, giro (`giroDeVersion`) y
pricing (`pricingDeVersion`, con el modo de tasa que `tasaDelNegocio` también le da a la pantalla). La
versión se emite con las cinco secciones o no se emite (`versionCompleta`; un motor caído queda en la
bitácora y en la auditoría como «Evaluación fallida»), y la primera simulación emite la v1. La
Pre-evaluación sigue siendo una lectura que pone la operación en la bandeja de los apoderados
(`spec-gestion-excepciones.md` §4.1 y §5.5); el render del detalle sigue pintando desde `evalLin` y
`verifFactura`. Las fichas dicen sólo lo que este documento necesita; los catálogos y las fórmulas viven
en el spec de cada motor.

#### 7.1 Otorgamiento (EAN)

| | |
|---|---|
| Cuándo corre | Simulación (emite la **v1**: regla 68, ADR-0013, 23-09-2026), pre-evaluación (lectura), «Re-evaluar operación» y «Re-evaluación de la simulación» (el mismo evento, versión nueva), cierre de la oferta (compuerta) y firma del cliente (`spec-otorgamiento.md` §2 lista cuatro momentos —pre-evaluación, una sola «Re-evaluación» disparada por «Re-evaluar operación», cierre y firma—: omite la simulación, no distingue los dos gestos que este documento separa y está desactualizado en un segundo punto: atribuye a «Re-evaluar operación» «veredicto vigente + versión nueva (evidencia)», cuando en el fuente ese botón (`lanzarReeval` → `onReevaluar` → `reevaluarLinea`; cabecera del detalle) no toca `repoSimVersions` y la versión la emite sólo `reevaluarCliente` («Re-evaluación de la simulación»; el único emisor de `repoSimVersions` es `reevaluarCliente`); lo correcto es `spec-gestion-excepciones.md` §5.5 («No crea una versión») y §4.1) |
| Unidad de decisión | La regla × el sujeto: reglas C/O una vez por operación, reglas D una vez por deudor; `stKey` = `n` o `n@RUT` (`evaluarOtorgItems`) |
| Qué recibe | Operación (cliente, deudores, facturas, publicación, evidencia del contrato), variables del A16, catálogo, política, padrón (`spec-otorgamiento.md` §9.1) |
| Qué devuelve | `items[]` con disposición `aprobado · excepcion · rechazado · clasificacion · no_ejecutada`, área, nivel exigido tras el piso por monto, aprobadores; agregado `aprobada · sujeta · rechazada` (`visadoDealCalc`) |
| Qué se versiona | `vars` y `res` (disposición por regla) en `snapVersionCli`; el visado **no** va en la versión, vive en `repoVisado` por `stKey` (§8) |
| Spec propio | `Specs_Procesos/Otorgamiento/spec-otorgamiento.md`; el ciclo de la excepción en `Specs_Procesos/Excepciones/spec-gestion-excepciones.md` |

Lo que el modelo llama bloqueante, re-evaluable y excepcionable existe con esos tres nombres: rechazo
firme (`rechFirme`), rechazo re-evaluable (`rechReev`) y excepción con ruteo (área, nivel) y piso por
monto (regla 4). Qué reglas son knockout y cuáles no se re-evalúan lo fija `spec-otorgamiento.md` §3.3
y `spec-gestion-excepciones.md` §2.4, no este documento. Una precisión de lectura del fuente:
`NO_REEV_CLIENTE` es la lista de las **no** re-evaluables (`reglaReev = (n) => !NO_REEV_CLIENTE.has(n)`) y `rechReev` es su complemento; el literal inicial de `NO_REEV_CLIENTE` (n 12–41 del catálogo viejo) está muerto,
porque la IIFE que inyecta el Modelo de Riesgo v1.0 hace `NO_REEV_CLIENTE.clear` y la rellena con los
28 ids del catálogo vivo: cuáles son lo dice `spec-gestion-excepciones.md` §2.4, no este
documento. Los únicos tramos «rechazado»
del catálogo vivo son `tHard` en C30/C31/C32: eso es lo que sostiene «rechazo firme sólo
C30–C32».

#### 7.2 Verificación de facturas

| | |
|---|---|
| Cuándo corre | En el **render del detalle** (`verifFactura`), en la misma pasada que líneas (regla 14, gate 124), y con evidencia sólo en `snapVersionCli.verificacion` al hacer «Re-evaluación de la simulación»; ningún evento de evaluación la invoca: `simularOferta` no llama a `verifDecision` y «Re-evaluar operación» sólo apaga `reevalPend` (§7); el tab se ve desde la simulación en modo informativo y se vuelve accionable al pre-evaluar o publicar (regla 59) |
| Unidad de decisión | El **deudor** dentro de la operación; la verificación de una factura es la de su deudor (`verifDecision`, regla 6) |
| Qué recibe | El par cliente-deudor y **todas** las facturas de ese deudor en la operación (`verifFactura`); el estado del cliente por parámetro (regla 6, «Regla 0» de verificación; `spec-verificacion-facturas.md` §4.0) |
| Qué devuelve | `requiere_verificacion` con motivo y la lista completa de criterios evaluados (`spec-verificacion-facturas.md` §2.3); por operación, `verifResumenDeal` cuyo `.pend` es VER-01 |
| Qué se versiona | El veredicto por deudor en `snapVersionCli.verificacion`; el contacto vive aparte en `repoVerifTel` (por factura: `{por, fecha, checklist{existencia, recepcion, fechaPago}, contacto, compromiso, respaldo, sinRespaldo, notas}`, `verificarDeudor`) y el veredicto congelado en `repoVerifVeredicto` (por deudor y `congelarVeredicto`) |
| Spec propio | `Specs_Procesos/Verificacion/spec-verificacion-facturas.md` |

#### 7.3 Asignación de líneas

| | |
|---|---|
| Cuándo corre | En el **render del detalle** (`evalLin`) y en cada versión (`snapVersionCli`, sólo desde `reevaluarCliente` y `retirarFacturaOferta`), recálculo siempre completo (regla 7); no la invoca `simularOferta` (que sólo escribe `simulado`, `stage` y `finanzasDe`) ni «Re-evaluar operación» (`reevaluarLinea`, un spinner de 700 ms que apaga `reevalPend`); al cerrar la oferta para armar la solicitud (`cerrarOferta`, llamada a `asignarLineas`); LIN-01 factura por factura al integrar (regla 41) |
| Unidad de decisión | La **factura completa**: `CON_LINEA` o `REQUIERE_COMITE`, nunca parcial (`asignarLineas`) |
| Qué recibe | Facturas itemizadas, RUT cliente, estado de líneas inyectado (`inyecta`) |
| Qué devuelve | `cursable`, `requiereComite`, `facturas` con `origen[{lineaId, tipo, monto}]` (una factura sí puede repartirse LF3 → LF2), `deudores`, `lineasUsadas`, `solicitudes` con motivo `par · lf4 · lf1 · cliente · deudor · suspendida` |
| Qué se versiona | `snapVersionCli.linea` completa; `lineaDeVersion` pinta desde la última versión sin volver a correr el motor (regla 13) |
| Spec propio | `Specs_Procesos/Lineas/spec-asignacion-lineas.md` |

La evaluación **no reserva**: la reserva la crea el sistema de líneas al firmar el cliente y el core
la commitea al aprobar Operaciones (regla 12; `spec-asignacion-lineas.md` §3.7).

#### 7.4 Giro

| | |
|---|---|
| Cuándo corre | En cada re-evaluación (el chip ya aparece en la tarjeta del tubo desde que la oferta está simulada, `spec-ciclo-factura.md` §0); se congela en la inyección (`repoGiro`, regla 43) |
| Unidad de decisión | El **deudor**; las facturas heredan (`asignarGiros`, regla 22) |
| Qué recibe | Facturas con su giro ya prorrateado, `verificado{deudor}`, `excepcionDeudor{deudor}`, `excepcionCliente`, `primeraOperacion`, `montoGirar` (`spec-modelo-giro.md` §6.1) |
| Qué devuelve | Montos y facturas por tipo GE / GN, fila por factura con hechos, `cuadra` / `descuadre`; la suma por tipo es siempre el monto a girar |
| Qué se versiona | No va en `snapVersionCli`; se congela aparte al inyectar (`giroCongelado` gana sobre el cálculo del día) |
| Spec propio | `Specs_Procesos/Evaluacion_Factura/spec-modelo-giro.md` |

#### 7.5 Pricing

| | |
|---|---|
| Cuándo corre | Al simular (`simularOferta` → `finanzasDe`) y en el render del detalle (`proRiesgo` / `tasaPond`); el motor de conceptos `simularOperacion` es puro |
| Unidad de decisión | La **operación** para el desglose; el **deudor** para la tasa (`spreadSugerido` con piso `SPREAD_MIN_DEUDOR`); la **factura** para el prorrateo (`prorratearOperacion`, regla 21) |
| Qué recibe | Catálogo de conceptos y constantes del tenant por parámetro; política comercial (spread de lista, tabla SOW); costo de fondo; `tasaModo` |
| Qué devuelve | Filas del desglose y el cierre fijo del catálogo (`spec-pricing-simulacion.md` §3.1 «El cierre es fijo»; regla 20); tasa y plazo equivalentes (`tasaEquivalente`); giro por factura |
| Qué se versiona | **Nada de las condiciones comerciales**: ni `snapVersionCli` ni `huellaOperacion` contienen tasa, comisión ni anticipo (regla 23) |
| Spec propio | `Specs_Procesos/Evaluacion_Factura/spec-pricing-simulacion.md` |

La comparación contra el último negocio existe y es del **cliente, no del par**: `historialComercial` siembra sólo por cliente (`hashStr(cliente + "hc")` y `hashStr(cliente + "_op_" + i)`) y el parámetro `deudor` sólo rotula cada fila; `tasaUltimoNegocio` llama
`historialComercial(deal.cliente, deal.deudor)` y toma `h[0]` («Hace 1 mes»), y el propio comentario del
fuente dice «Tasa del ÚLTIMO negocio cursado del cliente». Es sintético, sembrado sólo por cliente. Y
`CFG_ACTIVA.tasaModo` (`"riesgo" | "ultima" |
"mayor"`, default `"mayor"`: «no ofertar bajo la última tasa cursada») decide cuál manda; si manda la
del último negocio, el prorrateo pasa a top-down.

**Diferencias y pendientes (M-13, M-14 a M-17, M-22 a M-27, M-30 a M-35).** Las fichas de la Parte
IV lo detallan; lo que importa a nivel de proceso: (a) tres gestos de evaluación y no uno, y ningún
evento que invoque verificación ni líneas (M-13, M-24, M-26) → **implementado el 23-09-2026** (ADR-0013,
regla 68, caso 168, `regla_68.test.mjs`): simular o re-evaluar es **un evento** (`evaluarOperacion`) que
corre los cinco motores sobre el mismo paquete, cada uno deja su sección en la versión y las cinco cuentan
igual; el evento es un gesto del **ejecutivo**: simular es la acción que se ejecuta
al re-evaluar la oferta («Re-evaluar operación», el botón del resumen del detalle, bajo «La selección
cambió») y «el cliente simula» del modelo es una forma de hablar —no hay simulación del cliente en
ningún canal, ni portal de autoservicio ni intent del Agente IA (definición del negocio, 23-09-2026)—;
(b) el resultado de líneas **entra** al criterio de giro desde el 23-09-2026 (ADR-0017, regla 63, caso
162): si hay que pedir comité, el giro es Normal (LIN-01 sigue bloqueando la integración aparte, regla 41); (c) el pricing compara contra **el** último negocio del cliente (no del par)
y no contra «los últimos negocios»: `spec-pricing-simulacion.md` §4.2 fija **el** último negocio, en
singular, como tasa top-down, y ningún spec define una ventana de N negocios ni un promedio (M-35,
**definición confirmada**: en la demo ese historial es dato generado y en producción la fuente es el
último negocio cursado del cliente en el core, dato / contrato, §16); (d) el modelo (M-22) decía
«empresa emisora» para la unidad de verificación, mientras `spec-verificacion-facturas.md` §2.1 fija
la unidad en el deudor («La decisión es por deudor dentro de la operación») y el sistema decide así
(`verifDecision`; `verifFactura` evalúa todas las facturas del deudor): M-22 quedó **implementado
(definición ajustada 23-09-2026)** —«es por deudor»: la empresa deudora, quien paga y a quien se llama;
decisión #5 de §15 cerrada del todo— y M-23 **implementado (definición ajustada 22-09-2026)**: todas
las facturas de la oferta pasan por el motor, la decisión es por deudor y sólo las del deudor que falla
se verifican; (e) el contacto de verificación **sí registra** los tres
hechos que el modelo pide obtener: `DrawerVerificacion` lleva el checklist `{existencia,
recepcion, fechaPago}` (rótulos «Existencia de la factura», «Recepción conforme», «Fecha de
pago»; en la mesa `CHECKS`) y exige los tres más la fecha de pago comprometida
antes de confirmar (`completo = chk.existencia && chk.recepcion && chk.fechaPago && !!compromiso`), y `verificarDeudor` lo persiste por factura en `repoVerifTel`, de
donde `verifFactura` lo lee (`checks`). Lo pendiente es sólo documental: `spec-verificacion-facturas.md`
no describe el checklist
(M-22-bis, §14 y §16). Además, M-15 («bloqueante» = el rechazo firme del catálogo, hoy C30–C32, y
las que en el futuro se clasifiquen como rechazo firme) y M-27 (cinco líneas: LF1–LF4 más la global del
deudor) quedaron **implementadas (definición ajustada 22-09-2026)**.

### 8. El resultado versionado de una evaluación

**Qué dice el modelo (M-36 a M-40).** Al terminar los motores se obtienen, versionados: las
condiciones comerciales de la oferta, los requisitos de excepción, los requisitos de verificación, la
asignación de líneas y las solicitudes de líneas adicionales, y los montos a girar por giro normal o
express. Las excepciones y verificaciones resueltas se almacenan versionadas y no se vuelven a pedir
(M-20, M-25).

**Qué hace el sistema hoy (desde el 23-09-2026, ADR-0013, regla 68).** Cada evento de evaluación —simular,
«Re-evaluar operación», «Re-evaluación de la simulación»— emite una versión append-only en `repoSimVersions`
con `snapVersionCli`, de cinco secciones: `res` (otorgamiento), `verificacion`, `linea`, `giro` y
`pricing`, más `motoresFallidos`. La primera simulación emite la **v1** contemporánea (no hay v1
retroactiva) y una evaluación que no completa los cinco no se emite (caso 168). El rechazo del comité emite
la suya con la línea recortada (ADR-0015, regla 65); el retiro por verificación ya no emite (ADR-0018).
Desde Aceptada en adelante una versión nueva no re-asigna: recorta la anterior (`recortarAsignacion`,
llamada en `snapVersionCli`).

| Lo que produce la evaluación | Dónde queda | Sobrevive a la re-evaluación siguiente |
|---|---|---|
| **Condiciones comerciales** (modo de tasa, tasa ponderada y del último negocio, tasa efectiva, descuento, comisión, anticipo, gastos, plazo equivalente, monto a girar) | `snapVersionCli.pricing` (`pricingDeVersion`), además de los campos de `finanzasDe` en la operación; **no** en la huella (regla 23) | La versión las congela; la operación las recalcula al siguiente evento (M-36, implementado el 23-09-2026: ADR-0013, regla 68, caso 168) |
| **Requisitos de excepción** (ítems con disposición, área, nivel, aprobadores) | `snapVersionCli.res` (disposición por regla) + `repoVisado` / `VISADO_STATE` por `stKey` + `SOLICITUD_EXC` | La versión es foto; el **visado sobrevive por clave estable** (`reevaluarCliente`: «NO se tocan las excepciones ya resueltas»). Si la regla deja de gatillar, el ítem sale aprobado y el visado, la solicitud, la tarea y el hilo quedan marcados **«ya no aplica desde la versión N»** con actor sistema y hora, nunca borrados; la marca no es decisión (M-21, ADR-0016, regla 66, 23-09-2026) |
| **Requisitos de verificación** (por deudor, con causas) | `snapVersionCli.verificacion` + `repoVerifTel` por (operación, factura) + `repoVerifVeredicto` por (operación, deudor) | El contacto y el veredicto congelado sobreviven por clave estable; `limpiarSimulacion` y reabrir no los tocan (regla 1). No es versionado: es clave estable (M-25) |
| **Asignación de líneas y solicitudes** | `snapVersionCli.linea` (por factura, con origen) + `repoSolicitudComite` al cerrar | La versión anterior es evidencia, no reserva ni entrada del cálculo (`spec-ciclo-factura.md` §17); el diff `gano_linea · perdio_linea · cambio_de_linea` sólo explica |
| **Giro GE / GN** | `snapVersionCli.giro` (`giroDeVersion`, sobre la asignación de la misma versión) hasta la inyección; después `repoGiro` (`giroCongelado`) | Se versiona en cada evento y se congela al inyectar (regla 43) |
| **Huella del paquete** | `huellaOperacion`: `op · rut · nd · nf · monto · deudores[rut:monto]` + SHA-256, en `repoContratoEvidencia` | Si el paquete cambia, la huella no calza y O05 vuelve a ser excepción por sí solo (regla 23) |

**Diferencias y pendientes.** M-36, M-37, M-38, M-39, M-40 implementados (M-36 el 23-09-2026: ADR-0013,
regla 68, caso 168 —la versión guarda el modo de tasa con que se simuló y las condiciones asignadas, y
la v1 es contemporánea de la simulación—). M-20 y M-25 **implementado (definición ajustada
22-09-2026)**: sobreviven por clave estable (`stKey`, `facturaId`, deudor), no dentro de la versión, y
esa clave estable basta como versionado. M-21 **implementado el 23-09-2026**
(ADR-0016, regla 66, caso 166): la excepción que la versión N ya no levanta **no se elimina**; el visado, la solicitud, la
tarea y el hilo quedan marcados «ya no aplica desde la versión N», auditable, y si una versión
posterior la vuelve a levantar se abre una solicitud nueva. Antes del 23-09 el «marcar como cumple» ocurría solo y
nada marcaba ni eliminaba (buscado «huérfan» —sólo en Configuración › Áreas, sobre criterios que rutean a
un área borrada—, «ya no levanta», «ya no aplica», «visado obsoleto»: nada sobre visados obsoletos). `spec-modelo-giro.md` §7 todavía dice que no hay
pantalla de la asignación mientras la regla 22 cita `ChipGiro` en tres sitios: uno de los dos está
desactualizado.

### 9. Justificación de excepciones, cierre, envío a comité y publicación

**Qué dice el modelo (M-18, M-19, M-28).** Si la regla es bloqueante, la única forma de avanzar es
eliminar las facturas del deudor, y si el deudor está bloqueado el sistema debe retirarlas
automáticamente como resultado de la simulación. Tras el otorgamiento, el ejecutivo justifica cada
regla excepcionable y sólo entonces puede enviar a comité y publicar. Y, textualmente: «En caso de
existir suficiente línea, al publicarse la oferta el sistema debe enviar a solicitar automáticamente al
comité las líneas puntuales necesarias para cubrir los gaps». Ese «existir» es una **errata del
modelo**, confirmada por el usuario el 23-09-2026: «En caso de no existir suficiente línea se solicita.
En caso de existir suficiente se asigna esa.» La solicitud automática al comité sale sólo cuando **no**
existe línea suficiente; cuando existe, la cascada asigna esa línea y no se pide nada.

**Qué hace el sistema hoy.**

- *Justificar.* `solicitarAprobacionExc` **no exige nada**: recibe `(deal, x, execCode,
 comentario, archivos, sinComentarios)` y guarda `comentario || ""`, `(archivos || []).slice` y
 `!!sinComentarios` sin validar. La exigencia —comentario, respaldo adjunto o la
 declaración explícita «sin comentarios»— vive en el formulario del tab (dos llamadas a `solicitarAprobacionExc`: la del formulario —con el comentario, los adjuntos y la
 declaración «sin comentarios»— y la de «solicitar todas», con comentario vacío y `sinComentario: true`); el botón de Pre-evaluación la
 llama para cada excepción pendiente con `"", []` y sin `sinComentarios`: una solicitud sin
 justificación ni declaración. Al solicitar, escribe `SOLICITUD_EXC`, enciende la pre-evaluación, audita,
 abre el hilo a los aprobadores hábiles y crea la tarea por (área, nivel)
 (`spec-gestion-excepciones.md` §4.2). Las ampliaciones se apilan append-only (regla 30-ter).
- *Cerrar y publicar.* Es una sola decisión en `ModalCurse` (regla 23) con dos compuertas: sin
 excepciones sin justificar y Monto a Girar positivo, corte en $1 (`giroCursable`, regla
 13-septdecies). **Las dos compuertas no están al mismo nivel**: la del monto se re-comprueba en la
 mutación (`cerrarOferta`, con el comentario «la pantalla que apaga el botón no es el
 control (regla 24)»); la de las excepciones sin justificar vive **sólo en la pantalla** —`disabled=
 {sinComentario > 0 || !gOk}` del botón de `ModalCurse` y `if (!datosCurse) return;` en
 `ejecutarAccion`—, y `cerrarOferta` no consulta `excPend`,
 `sinComentario` ni el visado (§16). El CTA nombra lo que va a pasar: «Enviar a Comité y Publicar» cuando parte de la
 oferta no tiene cupo (`spec-ciclo-factura.md` §6). `cerrarOferta` escribe `patchCierre`
 (`ofertaCerrada`, `ofertaComunicada`, `negocioNum`, `publicacion: "electronica" | "fisica"`),
 invalida el cache del visado y, en la vía electrónica, llama a `enviarCierre` dentro del gesto del
 clic. Con eso los pendientes pasan de pronóstico (morado) a exigidos (rojo) (regla 54) y el tab
 Verificación pasa de informativo a accionable (regla 59).
- *Enviar a comité.* Lo genera el cierre: `asignarLineas` → `solicitudComiteDeOferta` (una
 solicitud con N líneas de detalle `tipoLinea: "puntual"`, una por deudor sin cupo, `propFactoring =
 aprobada + pedido`) → `api1Inyeccion` → `repoSolicitudComite` y `deal.solicitudComite`;
 regla 15-bis (gates 106–107). Una solicitud idéntica no se re-inyecta (`mismaSolicitudComite`,
 regla 33); cruza de pestaña por `nex-solicitud` (regla 15-bis-bis). Lo que se **inyecta no depende
 del motivo**: `solicitudComiteDeOferta` arma siempre `tipo: "modificar"`, `subtipo:
 "agregar_deudores"`, `propGlobal: 0` y cada línea de detalle con `tipoLinea: "puntual"`; `RESOLUCION_COMITE` sólo aporta el rótulo `pide` / `alcance` que viaja en
 `detalle[]` (`par` / `lf4` → puntual; `lf1` → asignación por comité; `cliente` / `deudor` → global;
 `spec-ciclo-factura.md` §11), y `api1Inyeccion` inyecta ese objeto sin transformarlo: una
 factura rechazada por `cliente` o `deudor` produce igual una puntual cliente-deudor.
- *Bloqueo firme.* `visadoDealCalc` marca `rechFirme` sólo con rechazos no re-evaluables
 (C30–C32 del cliente); `bloqueoFirmeInfo` arma la causa y el efecto de pérdida por bloqueo firme pasa
 la operación **entera** a `perdida` con `perdidaPor: "sistema"`. `retirarFacturaOferta`
 tiene tres llamadores y los tres son de verificación con motivo `"noConfirmada"` (retiro automático al marcar;
 cambia con ADR-0018: la marca deja de llamarlo y retira el ejecutivo): ningún camino retira facturas por otorgamiento.

**Diferencias y pendientes.** **M-28 implementado (definición ajustada 23-09-2026)**: con la errata
del modelo confirmada, es lo que el sistema hace —`solicitudComiteDeOferta` devuelve `null` salvo
`ev.requiereComite > 0` y `cerrarOferta` sólo inyecta si hay solicitud (regla 15-bis; casos 106,
107)—; la solicitud sale al cerrar, no al simular, siempre con líneas puntuales por deudor, y publicar
exige además Monto a Girar > 0. Queda un pendiente sin decisión: si el tipo de la solicitud debe seguir
al motivo (§16). **M-19 implementado** el 23-09-2026 (regla 62, caso 161, `regla_62.test.mjs`): la compuerta «sin excepciones sin
justificar» es exigencia del backend, en la mutación —`cerrarOferta` re-comprueba las excepciones mudas con
`compuertaExcepcionesMudas` antes de escribir, como ya hacía con el monto—, `solicitarAprobacionExc` no guarda una
solicitud sin justificación y «Enviar de todos modos» de la Pre-evaluación envía con la declaración explícita
«sin comentarios»; `ModalCurse` conserva su botón (regla 30) (§16). **M-18
pendiente → decidido: implementar** (ADR-0015 para el comité, ADR-0018 para la verificación), **redefinida el
22-09-2026** y **cerrada el 23-09-2026**: no es un bloqueo de otorgamiento a nivel deudor —esa disposición no
existe (D02–D13 son excepciones visables no re-evaluables, `spec-gestion-excepciones.md` §2.4) y no se crea—
sino la consecuencia del comité que rechaza la línea o de la verificación que no confirma al deudor; los dos
caminos terminan igual —el cliente firma la nueva operación— y difieren en quién retira. **Comité (ADR-0015):**
NEX recibe el rechazo, retira las facturas del deudor, emite versión y reabre. **Verificación (ADR-0018):**
marcar una factura «no verificada» **no la retira**; deja la operación con un **issue** visible —«facturas no
verificadas: no se puede cursar»—, VER-01 sigue mandando, y el sistema **notifica al ejecutivo comercial** por
mensajería (cuáles facturas, de qué deudor, y que no se cursará mientras sigan en la oferta); el **ejecutivo**
retira las facturas del deudor no verificado, **re-simula** (el evento de evaluación de ADR-0013, que emite
versión) y **vuelve a publicar**, lo que revoca la firma anterior (regla 1) para que el cliente firme la nueva
operación; las retiradas quedan vetadas. Hoy ningún camino retira facturas por otorgamiento ni por comité, y el
botón «No verificar» de la mesa y del detalle retira solo y la operación encoge conservando la firma (regla 13,
§11): ese retiro automático y la mitad de la regla 13 que lo describe se reemplazan. La decisión #2 de §15
queda cerrada.

### 10. Aceptación formal del cliente y reapertura

**Qué dice el modelo.** No tiene cláusula propia de la firma: la nombra al publicar (M-19) y da por
hecho que la oferta publicada se acepta. Lo que sigue es lo medido, para que el modelo lo adopte o corrija.

**Qué hace el sistema hoy.**

- *La firma es del cliente y sólo en el portal.* `enviarCierre` abre la pestaña del portal
 en el gesto del clic, emite el OTP una vez (sólo el hash queda en el store) y envía el enlace; el
 correo es aviso sin enlaces. `confirmarCierre` recibe el `postMessage` de la firma, registra
 la evidencia del contrato por la vía electrónica (`registrarEvidenciaContrato`), calcula la oferta,
 recorta a `montoFirmado`, arma `dealFirmado` (`stage: "cesion"`, `clienteAcepto: true`,
 `reabierta: undefined`) **sólo como base en memoria** sobre la que se evalúan las compuertas
 (`visadoDeal`, `verifResumenDeal`, `evidenciaContratoOk`) y llama a `etapaTrasFirma`
 (§11). Lo que se **persiste** es el `patch` de `confirmarCierre`: `stage: stageFinal` —`"cesion"` sólo
 cuando `destino.integracion`, con `otorgada: true, integracion: "pendiente", giroPendiente:
 true`, y `"otorgamiento"` con `giroPendiente: true` en cualquier otro caso— más
 `reabierta: undefined`; el patch **no** lleva `clienteAcepto`. El ejecutivo no puede mover una operación
 a Aceptada (regla 1). La firma cruza a la pestaña del tubo con `avisarTubo` (regla 55) y escribe el
 hilo «Cierre de negocio» a los aprobadores pendientes (regla 50).
- *Física vs electrónica.* O05 «Contrato firmado por cliente de la operación» (#305, Operaciones N3) existe siempre. Electrónica: la firma en el portal es la evidencia y O05 queda aprobado
 sin visado. Física: O05 queda como excepción de Operaciones N3, el ejecutivo adjunta el comprobante
 y `aprobarExc` registra la evidencia al aprobarlo; revertir el visado revoca la evidencia. Entre las dos vías cambian 0 de 77 criterios (`spec-ciclo-factura.md` §16).
- *La evidencia es una huella.* `huellaOperacion`, cadena canónica + SHA-256; las
 condiciones comerciales no entran (regla 23). `aprobacionFormalCliente` es la lectura:
 `clienteAcepto || otorgada || cierreFirmado || cesionExterna || stage ∈ {cesion, otorgamiento,
 giro}`, y **false** si `deal.reabierta`. **Vacío medido:** el único escritor persistido de
 `clienteAcepto: true` es el manejador del intent `cursar` del WhatsApp del cliente:
 cuando el cliente escribe que quiere cursar, la operación —todavía en `oferta`— queda con
 `clienteAcepto: true`, `cierreEnviado: true`, `ofertaComunicada: true` y status «Cliente aceptó ·
 enlace de cierre enviado», y desde ahí `aprobacionFormalCliente` devuelve `true` sin firma
 en el portal. Es una aceptación por canal que la regla 1 declara inválida y que la lectura de la
 aprobación formal acepta (§16).
- *Reapertura.* `reabrirOperacion` comprueba `edicionOperacion` (regla 33), guarda
 `enEdicion {desde, ts, por, versionAceptada, reserva}` y, si la edición revoca la firma, vuelve a
 `oferta` con `reabierta` puesta: el cliente debe firmar de nuevo. Sobrevive toda la evidencia
 (`repoVisado`, `repoVerifExc`, `repoVerifTel`, `repoNoConfirmadas`), las facturas no confirmadas
 quedan vetadas y la reserva sobrevive (regla 1). Girada o integrada al core no se reabre. Distinta de
 «Eliminar la simulación y vaciar la oferta» (regla 13-quaterdecies), que sólo aplica mientras la
 oferta sea del ejecutivo.

**Diferencias y pendientes.** Sin cláusula del modelo que contradecir. Tres vacíos del propio sistema:
`clienteAcepto` lo escribe el canal WhatsApp y no la firma, y `aprobacionFormalCliente` lo acepta
(§16); el id `aceptadas` está en el catálogo pero la firma escribe `cesion` u `otorgamiento` (§2); y la
inscripción de la
cesión electrónica (AEC) entre la firma y la integración no tiene motor (`spec-ciclo-factura.md` §23b).

### 11. Después de la firma: otorgamiento, verificación, líneas del comité

**Qué dice el modelo (M-20, M-21, M-23, M-25, M-29).** Las excepciones y verificaciones ya resueltas
no se vuelven a pedir. Si el deudor no pasa las reglas de verificación, todas las facturas de la
oferta deben verificarse. Si el comité no aprueba la línea, se retiran las facturas de los deudores
sin línea y se re-evalúa la operación, quedando cumplido el criterio de línea.

**Qué hace el sistema hoy.**

- *La bifurcación.* `etapaTrasFirma` recibe `requiereOtorg` (línea o deudores «Otro»),
 `pendVisado` (OTG-02), `pendVerif` (VER-01) y `evidenciaOk` (GIR-02): si falta cualquiera →
 `otorgamiento` con su motivo («Otorgamiento / Verificación», una sola etapa); si no →
 `{stage: "cesion", integracion: "pendiente"}` («Pendiente Integración», sale del tubo). Regla 26,
 gate 88.
- *Otorgamiento post-firma.* Los apoderados deciden en la mesa o en el tab (`aprobarExc`, OTG-01
 antes de escribir); el tab sobrevive a la firma. `otorgamientoCompleto` = en
 `otorgamiento`, sin bloqueo, con aprobación formal vigente, sin `excPend` ni `rechReev` (OTG-02
 primero, regla 48) y con el atajo `otorgAuto` o todas las excepciones aprobadas. **No mira VER-01**
 por sí misma.
- *Verificación post-firma (lo que hace el sistema HOY).* `verificarDeudor` registra las confirmadas en
 `repoVerifTel` y **retira solo** las no confirmadas con `retirarFacturaOferta(id, fac, "noConfirmada")`;
 lo mismo hacen `marcarFactura` (por folio) y `noConfirmoDeudor` (por deudor) desde el botón «No verificar»
 de la mesa y el diálogo «Retirar factura no confirmada» del tab Verificación del detalle: quedan vetadas en
 `repoNoConfirmadas`, y si la operación ya está aceptada se emite versión nueva con
 `recortarAsignacion` y la auditoría «el cupo liberado sigue reservado». La operación **encoge, no se
 pierde**, **la firma del cliente sigue valiendo** y nadie avisa al ejecutivo comercial; retirar la última
 factura es pérdida (`spec-ciclo-factura.md` §14). El veredicto se congela con el contacto
 (`congelarVeredicto`) y el predictor no vuelve a opinar. Lo decidido en su lugar está en «Diferencias y
 pendientes» (ADR-0018).
- *Líneas del comité.* NEX sólo consulta (`api3EstadoProceso`, pull con «Consultar
 estados», regla 15). El estado final simulado es «Aprobada» u «Observada» por `hash(idProceso) % 5`;
 Aprobada constituye la línea (`constituirLinea`: LF3 si puntual, LF2 si no) y se superpone al activo
 (`repoLineaComite`, regla 44). Una «Observada» deja las facturas `REQUIERE_COMITE` y LIN-01 frena la
 integración (`controlesIntegracion`). La única acción es manual, «Sacar facturas sin línea ·
 N fact.» (en la pestaña de deudores del detalle, no en el menú Acciones; el estado vacío dice
 «No hay facturas por agregar ni facturas sin línea por sacar.»; comentario de la tarjeta del tubo), con la
 oferta abierta. `spec-asignacion-lineas.md` §8.7 la llama «Quitar lo que no tiene línea»:
 rótulo desfasado del fuente.
- *Salida de la etapa (desfase medido).* Dos escritores: `avanzarPipeline` movería
 `otorgamiento → cesion + integracion pendiente` exigiendo `verifResumenDeal.pend === 0`, pero su
 `avanzarRef.current` **nunca se invoca**; y el `useEffect [deals, cfgVer]` con
 `deals.filter(otorgamientoCompleto)` pasa **directo** a `stage: "giro"`, «Girada · otorgada», sin
 Pendiente Integración, sin VER-01 y sin Operaciones N3 (`spec-ciclo-factura.md` §23c fila 4).

**Diferencias y pendientes.** M-20 y M-25 implementado (definición ajustada 22-09-2026, §8). **M-23
implementado (definición ajustada 22-09-2026)**: todas las facturas de la oferta pasan por el motor de
verificación, la decisión es por deudor y sólo las del deudor que falla se verifican —pueden salir
deudores que no requieren verificación—; es lo que el sistema hace (regla 6) y cierra la segunda mitad
de la decisión #5 de §15; la primera mitad —la unidad— quedó cerrada el 23-09-2026: es el deudor (M-22,
definición ajustada). La «Regla 0» de verificación (regla 6; `spec-verificacion-facturas.md` §4.0,
cliente nuevo) sigue como el único caso que verifica toda la oferta.
**M-18 en la verificación → decidido: implementar** (ADR-0018, 23-09-2026): marcar una factura «no
verificada» **no la retira**; la operación queda con el issue «facturas no verificadas: no se puede cursar»
(VER-01 sigue mandando: `verifResumenDeal.pend` y `controlesIntegracion`), con actor y hora en la bitácora, y
el sistema notifica al ejecutivo comercial por el centro de mensajería; el ejecutivo retira las facturas del
deudor no verificado, re-simula (evento de ADR-0013, con versión) y vuelve a publicar: publicar de nuevo revoca
la firma (regla 1) y el cliente firma la nueva operación; las retiradas quedan vetadas, como hoy. Cambian el
botón «No verificar» de la mesa y del detalle (`marcarFactura`, `verificarDeudor`, `noConfirmoDeudor` dejan de
llamar al retiro), `verifResumenDeal` (el issue) y el centro de mensajería (el aviso); la regla 13 pierde la
mitad «después de aceptar sólo encoge».
**M-29 pendiente → decidido: implementar** (ADR-0015): el comité es el **comité de crédito**, opera
fuera de la plataforma y da la aceptación o el rechazo de las solicitudes de aumento de línea puntual;
NEX tiene que recibir el rechazo (estado «Rechazada» por línea de detalle en la API 3, dato / contrato)
y aplicar M-18: retirar las facturas del deudor, emitir versión con el motivo y reabrir para una nueva
firma; si no queda ninguna factura, pérdida con causa (regla 5). Hoy no existe estado «Rechazada»
(buscado `rechazarSolicitud`, `resolverComite`, `decisionComite`: nada), ni retiro de las facturas sin
línea, ni reapertura por comité (decisión #4 de §15 cerrada). Y el desfase del avance a Girada
es del sistema, no del modelo: el camino vivo desde Otorgamiento se salta tres controles.

### 12. Giro

**Qué dice el modelo (M-33, M-40).** El motor de giros agrupa las facturas girables en express y/o
normal según si el cliente es nuevo y los resultados de otorgamiento, verificación y líneas; el
resultado de la evaluación son los montos a girar por giro normal o express.

**Qué hace el sistema hoy.**

- *GE / GN.* `asignarGiros`: GE / GN según el catálogo declarativo de tipos y sus cinco
 hechos por deudor (el quinto, `sinComite`, desde ADR-0017) (`spec-modelo-giro.md` §2, §2.1 y §4; regla 22, gates 81, 83–84). Acá sólo cuándo
 corre, qué recibe y qué devuelve (§7.4); el catálogo no se repite.
- *Inyección al core.* `aprobarIntegracion`: OTG-01 → `controlesIntegracion`
 devuelve las faltas con código —OTG-02 (visado pendiente), VER-01 (`pend > 0`), LIN-01 (cada factura
 `CON_LINEA` desde la versión, falla cerrado sin asignación), GIR-02 («El paquete no es el
 autorizado», `evidenciaContratoOk` contra la huella)—; el botón se deshabilita con la lista y la
 compuerta se vuelve a llamar antes de escribir; el intento bloqueado va a auditoría (regla 41, gate
 144). Si pasa: `repoGiro.set(id, giroEntregado)` congela el reparto y el patch es `{stage: "giro",
 integracion: "aprobada", giroPendiente: true}` = «Pendiente de Giro».
- *La noticia de Tesorería.* Girar no es una acción de NEX (regla 43): `moverEtapa` no ofrece `giro`
 como transición manual, GIR-01 queda `aplicado: "externo"`. `recibirGiroTesoreria(ev, deal)` es pura: exige `operacionId`, `stage: "giro"` y `giroPendiente`; devuelve
 `{giroPendiente: false, giroTs, giroRef, status «Girada · ref», giroMonto sólo si el aviso lo trae}`;
 negativas `aviso_incompleto · no_inyectada · ya_girada` (gate **147**; el 145 de la suite es ATR-01 y
 el 148 el congelado en la inyección; la regla 43 del vault todavía cita «caso 145», desfase de la
 renumeración del merge de la sesión paralela). El monto no se inventa.

**Diferencias y pendientes.** M-40 implementado. **M-33 implementado** el 23-09-2026
(ADR-0017, regla 63, caso 162): el resultado de líneas entra al criterio del giro —si las facturas del
deudor requieren comité, el giro es **Normal** aunque cumpla las condiciones de Express—; `asignarGiros`
recibe el quinto hecho por deudor (`requiereComite` → `sinComite`) y el adaptador `girosDeDeal` lo saca de
la asignación de líneas de la última versión (LIN-01 sigue bloqueando la integración aparte); dos
tipos y no tres
(`spec-modelo-giro.md` §7); GN como disyunción pendiente de confirmar (§2 «Supuesto explícito»). El
contrato de entrega a Tesorería (payload, endpoint, idempotencia, evento) no está modelado
(`spec-ciclo-factura.md` §23b).

### 13. Pérdida y sus causas

**Qué dice el modelo (M-15, M-18).** Una regla bloqueante fuera del límite impide avanzar; el modelo
no define la pérdida como estado, la implica.

**Qué hace el sistema hoy.** La pérdida es terminal (regla 5): causa específica siempre
(`causaPerdidaDeal`: `causaPerdida` → `bloqueoFirmeInfo.causa` → «Cesión externa» → «El
cliente no aceptó la oferta» → «Sin contacto» → «Oportunidad perdida (causa no registrada)» **sólo si el
status es el genérico** «no superó reglas de otorgamiento» → `deal.status || "Oportunidad
perdida"`. Y como `STATUS_ETAPA` no tiene clave `perdida`, los dos escritores
manuales escriben `status: STATUS_ETAPA["perdida"] || d.status` = el status de la etapa anterior
(`moverEtapa`, `moveTo`): para una pérdida por arrastre o por «Avanzar»,
`causaPerdidaDeal` devuelve como «causa» el status de la etapa de origen —p. ej. «En oferta y
negociación»—, no «causa no registrada»), etapa de origen, actor,
cierre de tareas en cascada, badges accionables suprimidos; reabrir es una operación nueva con
referencia. Ocho escritores de `stage: "perdida"` (seis con causa y dos manuales sin ella):

| Escritor | Causa | Actor | Estado |
|---|---|---|---|
| `reject(id, closeReason, extra)` | Manual desde el detalle; deriva `bloqueo_firme` si hay `bloqueoFirmeInfo`, si no `cliente_declino`; guarda `cedidaCompetidor` / `tasaCierreCompetidor` | Ejecutivo | vivo |
| `evaluarPerdidas` (cron) | Cesión al competidor por AEC, `rndDetBool` 12% una vez por oportunidad | Sistema | vivo |
| `evaluarPerdidas` (cron) | Oferta no aceptada si `d.perdedor`, una sola vez en Oferta, respetando `negocioNum` / demo / `fueraAtribucion` | Sistema | vivo |
| `useEffect` | Bloqueo firme de otorgamiento (`rechFirme` o excepción rechazada por un apoderado): `perdidaOtorg`, `motivoPerdida: "bloqueo_firme"`, `perdidaPor: "sistema"` | Sistema | vivo |
| `avanzarPipeline` | Cesión a la competencia documento a documento (sólo si todas las facturas están cedidas); «el cliente no aceptó» por `d.perdedor` | Sistema | **sin llamador** |
| `moverEtapa(id, stageId)` | Botón «Avanzar» del detalle (`onMover(deal.id, avanzarA)`; `avanzarA` = siguiente id de `STAGE_ORDER` salvo `aceptadas`). Escribe `{...d, stage: stageId, status: STATUS_ETAPA[stageId]}` para cualquier etapa salvo `aceptadas` y `giro`; `cesion` sólo pasa OTG-02 y entra **sin** `integracion`; `otorgamiento`, `perdida` (**sin `causaPerdida` ni `etapaPerdida`**, contra la regla 5, y con `status` de la etapa de origen porque `STATUS_ETAPA` no tiene `perdida`) y volver a `oferta` / `prospeccion` no tienen guarda | Ejecutivo | vivo |
| `moveTo(stageId)` | Arrastre del Kanban (`onDrop(stage.id)`). Escribe `stage: stageId` bloqueando sólo `aceptadas`, la salida de `perdida` y el retroceso desde aceptadas / cesion / giro; a `perdida` entra sin causa y con `status: STATUS_ETAPA["perdida"] \|\| d.status` = el de la etapa de origen | Ejecutivo | vivo |

Dos puertas de negocio a la pérdida por otorgamiento (`spec-ciclo-factura.md` §13): el rechazo firme
(C30–C32 del cliente, nunca del deudor) y la excepción rechazada por un apoderado con atribución (no
hay apelación dentro de la operación). El bloqueo firme tiene precedencia en la causa. Hoy un deudor que
no confirma **no** es pérdida: es encogimiento (§11), salvo que retire la última factura; con ADR-0018 la marca
tampoco pierde la operación —la deja con un issue— y es el ejecutivo quien, al retirar, decide si sigue con
menos facturas o la pierde con causa (regla 5).

**Diferencias y pendientes.** **M-15 implementado (definición ajustada 22-09-2026)**: «bloqueante» es
el **rechazo firme** del catálogo —hoy las tres reglas del **cliente** C30–C32 (`tHard`, rótulo «bloqueo
firme»), y las que en el futuro se clasifiquen como rechazo firme— y su efecto es la **pérdida
automática y terminal** de la operación entera (`useEffect` escribe `stage: "perdida"` con
`perdidaPor: "sistema"` para toda operación activa con `bloqueoFirmeInfo`; `snapVersionCli`
`estado = nRechFirme ? "rechazada" …`; reglas 4 y 5), aceptado así. M-18 redefinida y **decidido:
implementar** (ADR-0015 para el comité, ADR-0018 para la verificación, §9): no hay bloqueo a nivel deudor; el
retiro de las facturas de un deudor es la consecuencia del comité que rechaza (el sistema retira y reabre) o de
la verificación que no confirma (el sistema marca y avisa; el ejecutivo retira, re-simula y vuelve a publicar),
y en los dos caminos el cliente firma la nueva operación. La pérdida por cesión externa vive en dos sitios,
uno vivo (cron, sintético al 12%) y uno sin llamador (documento a documento por A2): decidir cuál es el
camino de producción es parte de la limpieza del inbound, no de este modelo.

---

## Parte III · Invariantes del proceso

Las reglas del vault que gobiernan el proceso, con su número tal cual está en
`vault/conocimiento/reglas/<tema>.md` y el gate según `vault/conocimiento/invariantes.md`. Las reglas
propias de cada motor que el cuerpo cita (18, 20, 21, 30-ter, 44, 45, 53) viven en
`vault/conocimiento/reglas/<tema>.md`; el motor que gobiernan las detalla en su spec. La columna Gate sigue al
índice, cotejado caso por caso contra `tests_asignacion_lineas.js` (regla núcleo 2): el número de un caso
nombra lo que prueba.

| Regla | Tema | Enunciado (resumen fiel) | Gate |
|---|---|---|---|
| 1 | curse_firma_y_etapas | Curse nunca por email: el cliente acepta sólo firmando en el portal; el ejecutivo no puede mover a Aceptada; reabrir revoca la firma; girada o integrada no se reabre; al reabrir se conservan los repositorios y las no confirmadas quedan vetadas | ~24–26 |
| 5 | curse_firma_y_etapas | Pérdida es estado terminal: causa específica, etapa de origen, actor, cierre de tareas en cascada; reapertura = operación nueva con referencia | 117, 118, regla_5.test.mjs |
| 12-bis | curse_firma_y_etapas | Lo que saca una oportunidad de Prospección es la simulación, no editar el paquete; invariante dual prospección/oferta | e2e-12-bis-a a e, regla_12_bis.test.mjs |
| 23 | curse_firma_y_etapas | Publicar se decide en `ModalCurse`, dos vías (electrónica / física); O05 existe siempre; la evidencia es la huella del paquete sin condiciones comerciales | ~85 |
| 24 | curse_firma_y_etapas | GIR-02: `evidenciaContratoOk` devuelve el porqué; el destino apagado se muestra con motivo; `aprobarIntegracion` lo comprueba antes de escribir | ~86 |
| 26 | curse_firma_y_etapas | Máquina post-firma: «Otorgamiento / Verificación» → «Pendiente Integración» → «Pendiente de Giro»; `estadoOperacion` único traductor; `etapaTrasFirma` pura | 88 |
| 28 | curse_firma_y_etapas | Nombre y color de cada etapa son del tenant; el código no se edita; «Oferta publicada» no es un stage; `etapaDeDeal` única puerta al rótulo | 110–111 |
| 30 | curse_firma_y_etapas | El menú Acciones no cierra ni avanza: cerrar tiene un solo camino (`ModalCurse` con sus dos compuertas) | e2e-30, regla_30.test.mjs |
| 33 | curse_firma_y_etapas | El paquete cerrado es sólo lectura (salvo `noConfirmada`); cerrada, publicada y reabierta son tres hechos; re-cerrar conserva lo excepcionado y no re-inyecta una solicitud idéntica | 140, regla_33.test.mjs |
| 41 | curse_firma_y_etapas | `controlesIntegracion` puro: OTG-02, VER-01, LIN-01 factura por factura desde la versión, GIR-02; se vuelve a llamar antes de escribir | 144, regla_41.test.mjs |
| 43 | curse_firma_y_etapas | Girar no es acción de NEX: termina en `aprobarIntegracion`; el giro vuelve como callback (`recibirGiroTesoreria` pura); la asignación se congela en la inyección | 147, 148, regla_transiciones.test.mjs |
| 50 | otorgamiento_y_atribucion | Al firmar el cliente, el sistema escribe el hilo «Cierre de negocio» a ejecutivo y aprobadores pendientes | 154, regla_aviso_cierre.test.mjs |
| 55 | curse_firma_y_etapas | La firma cruza a la pestaña del tubo (`avisarTubo` antes de aplicar el patch) | regla_estado_pestanas.test.mjs |
| 58 | curse_firma_y_etapas | La oferta publicada es un estado (`ETAPA_PUBLICADA`); `patchCierre` asienta `ofertaComunicada`; el tab Verificación pasa a accionable al cerrar | e2e-58, regla_58.test.mjs |
| 59 | verificacion | El tab de Verificación se ve con la oferta simulada, en modo informativo (la compuerta de la regla 6 protege la llamada, no la información) y se vuelve accionable al pre-evaluar o publicar; el chip del deudor dice Prime y la nota va rotulada; los criterios V00–V10 son del deudor y el quiz telefónico es de la factura | e2e-59-a, e2e-59-b, regla_verif_informativa.test.mjs |
| 54 | ui_detalle_y_tubo | Pendientes de otorgamiento y verificación: pronóstico (morado) mientras se simula, exigidos (rojo) al publicar | 158, regla_54.test.mjs |
| 8 | oferta_pricing_y_giro | «Cerrar oferta» es prerequisito de publicar; el Agente IA es opcional; el piso de la operación es el del deudor más exigente | 119, 149 |
| 13-quaterdecies | oferta_pricing_y_giro | «Eliminar la simulación y vaciar la oferta» devuelve al estado de entrada sin tocar la evidencia; sólo mientras la oferta sea del ejecutivo | e2e-13-quaterdecies, regla_13_quaterdecies.test.mjs |
| 13-sexdecies | oferta_pricing_y_giro | Armar la oferta a mano tiene salida «Simular la oferta»; la oferta vacía es un estado normal | e2e-13-sexdecies-a a d, regla_13_sexdecies.test.mjs |
| 13-septdecies | oferta_pricing_y_giro | Monto a Girar no positivo se simula pero no se cursa: `giroCursable` puro, corte en $1 | 108 |
| 14 | oferta_pricing_y_giro | Reevaluación explícita: editar la oferta no dispara cálculo; «Por evaluar» hasta Re-evaluar; verificación y líneas en la misma pasada | 124, e2e-14-a/b/c, regla_14.test.mjs |
| 22 | oferta_pricing_y_giro | `asignarGiros`: suma por tipo = monto a girar; GE = verificado y sin marcas; por deudor; se congela (la regla 22 dice «al aceptar», `repoGiro`; la 43 lo movió a la inyección en `aprobarIntegracion`); el id no cambia con el cierre del día (con ADR-0019 vale para lo que sobrevive al corte: la oportunidad sin oferta se elimina y el reinicio abre otra con id propio) | 81, 83–84, ~78–80, ~82 |
| 4 | otorgamiento_y_atribucion | Motor de otorgamiento = Modelo de Riesgo v1.0: 77 reglas; piso por monto; ruteo (área, nivel); KNOCKOUT C30/C31/C32 → pérdida automática | 44, 46, 48, 56–59, ~38–41, ~43, ~45, ~47, ~49–51 |
| 35 | otorgamiento_y_atribucion | Una regla excepcionable sin aprobador posible no se ejecuta (`no_ejecutada`), nunca en silencio | 141, 143, regla_35.test.mjs |
| 48 | otorgamiento_y_atribucion | El atajo del otorgamiento automático no pasa por encima de OTG-02 (`otorgAutoVigente`) | 153, regla_48.test.mjs |
| 6 | verificacion | Verificación aislada y por deudor; dos segmentos; «Regla 0» (primera operación del cliente, viñeta de la regla 6); V01 compuerta; unanimidad; el veredicto se congela con el contacto; confirmación parcial | ~27–32, ~52–55, ~76–77 |
| 7 | lineas_y_solicitud_comite | `asignarLineas` pura; cinco líneas; cabe en los tres niveles; recálculo siempre completo | ~1–15, ~89 |
| 12 | lineas_y_solicitud_comite | La reserva no es de NEX: el sistema de líneas reserva al firmar, el core commitea al aprobar; `requiere_resimulacion` si el curse reevalúa distinto | 122, regla_12.test.mjs |
| 13 | lineas_y_solicitud_comite | Cada simulación emite una versión append-only; una aceptada se lee de su versión; después de aceptar sólo encoge (mitad reemplazada: el comité que rechaza reabre, ADR-0015, y la verificación fallida marca y avisa sin retirar, ADR-0018) | ~16–23 |
| 15 | lineas_y_solicitud_comite | NEX sólo inyecta (API 1) y consulta (API 2/3, pull); resuelve el sistema externo | 125, e2e-15, regla_15.test.mjs |
| 15-bis | lineas_y_solicitud_comite | La solicitud se genera sola al cerrar: una solicitud con N líneas puntuales; lo pedido se suma a la vigente | 106–107 |
| 15-bis-bis | lineas_y_solicitud_comite | La solicitud inyectada cruza de pestaña; idempotente por la solicitud; la inyección no exige la firma | 126, 146, e2e-15-bis-bis-a/b, regla_15_bis_bis.test.mjs |
| OTG-01 | contrato con el servidor | Sólo aprueba quien tiene atribución; el resolver recalcula desde el rol del token | 135, regla_otg_01.test.mjs |
| OTG-02 | contrato con el servidor | No avanza a Cesión con excepciones o rechazos re-evaluables sin resolver | 88, regla_transiciones.test.mjs |
| VER-01 | contrato con el servidor | No cursa con verificación pendiente | 52, 88 |
| LIN-01 | contrato con el servidor | La operación cabe en la línea disponible del cliente al armarla (contrato); que en la integración se mire factura por factura desde la versión es la regla 41 (caso 144) | 134 |
| GIR-01 | contrato con el servidor | No gira sin pasar por Cesión; NEX no lo aplica (`externo`) | 136, regla_transiciones.test.mjs |
| GIR-02 | contrato con el servidor | El paquete girado es el que se autorizó (huella contra huella) | 86, 88 |
| ATR-01 | contrato con el servidor | El descuento no excede la atribución del rol sin la jefatura | 137, 143, regla_atr_01.test.mjs |

---

## Parte IV · Conciliación del modelo con el sistema

### 14. Cláusula por cláusula

Estados: **implementado** · **implementado distinto** (con otra forma o alcance, y se dice cuál) ·
**pendiente** (no existe) · **decisión abierta** (el modelo y una regla vigente se contradicen). Una
cláusula que el usuario dio por buena figura **implementado (definición ajustada)** con la fecha de su
respuesta (22-09-2026 o 23-09-2026); la que pidió construir conserva su estado medido más «→
**decidido: implementar**» (y el ADR si lo hay); una pregunta abierta llevaría «**por confirmar**» con
la pregunta, y desde el 23-09-2026 no queda ninguna. La
evidencia es la **definición**: la regla del vault por su número, la sección del spec, o la condición del
fuente por su nombre —el símbolo que la encarna—, medida al 22-09-2026. Nunca una línea de código: la
línea cambia con el próximo commit; la definición, no.

| Id | Cláusula | Estado | Evidencia |
|---|---|---|---|
| M-01 | Las facturas llegan por DTESync con cesiones, NC, aceptaciones y reclamos | implementado → **implementado el 23-09-2026** (regla 69, caso 169, `regla_69.test.mjs`: el A1 trae la aceptación y `facturaDeDTE` la lee; se muestra y no participa del filtro de candidatura, definición del negocio 23-09-2026) | `facturaDeDTE` (reclamo, NC y **acuse** como banderas de `EstadoDTE`: `Aceptado`/`FchAcuseRecibo`, `Reclamado`/`FchReclamo`); cesiones por A2 (`spec-ciclo-factura.md` §1); `ChipAcuse` en las filas del documento; el Excel de candidatas sin la columna sorteada. Una factura sin acuse —sus primeros 8 días desde la emisión— sí es candidata: «Buena factura» (`CRITERIO_PRED`) no mira la aceptación, y así queda (23-09-2026) |
| M-02 | Cada hora corren los motores de inbound | implementado distinto → **decidido: implementar** (el cron lee `frecuenciaMin` y la ventana del tenant y corre con eso) | La corrida horaria es una **simulación en el navegador**: `setInterval(…, CRON_MS)` sólo si `CFG_ACTIVA.modoDemo !== false` (su comentario: sin modo demo no corre) → `tickCron` → `correrProceso`; `CRON_MS = cfgT.cronMs` (`cronMs: 3500`). `frecuenciaMin: 60` es un **parámetro huérfano**: se edita en Configuración › Operación y ningún cron lo lee, como `horaInicio` / `horaFin`. El job real del backend está pendiente (`spec-inbound-facturas.md` §10.4) |
| M-03 | Al detectar facturas se abre una oportunidad al cliente | implementado | `correrProceso` agrupa por cedente; tope `MAX_NUEVOS = 40`; `spec-inbound-facturas.md` §6 |
| M-04 | Si ya existe una oportunidad abierta se actualiza | implementado | `aplicar(warn)`: suma a `facturasDisponibles` deduplicando; la oferta no se toca; aceptada/cursada/perdida → otra |
| M-05 | Cuantifica facturas segmentadas en Prime y Otros | implementado (definición ajustada 22-09-2026: es un join en pantalla, no parte del inbound) | `capacidadDeudores` tiene un solo llamador, la tarjeta del tubo al dibujarse (lookup sobre A23, «no una corrida del motor», dice su comentario): se calcula en el render, no se persiste en la oportunidad ni la produce el inbound (`correrProceso` no la escribe); en producción no habría dónde consultarlo fuera de la pantalla. `chipTramo`; Prime = listas (`CRITERIO_PRED`) |
| M-06 | Join con líneas: con línea, Prime con línea, otros sin línea | implementado (definición ajustada 22-09-2026: es un join en pantalla, no parte del inbound) | `capacidadDeudores`: `primeConLinea · otrosConLinea · sinLinea`, cota superior (lo declara el tooltip del chip); se calcula en el render de la tarjeta, no en la oportunidad (M-05); `lineaCreditoDe` |
| M-07 | Hora de corte 23:00 elimina las no gestionadas | implementado → **implementado el 23-09-2026** (ADR-0019, regla 64: corte por hora del tenant, la sin oferta se elimina, la con oferta no se toca) | `jobDelReloj` / `relojSimulado`; el efecto corta por `r.corte`; `corteDia` → `corteDelDia` elimina y deja bitácora; `cfgOper` v3 sin `etapaNoGestionada` ni `horasDia` |
| M-08 | A las 06:00 se reinicia el proceso | implementado → **implementado el 23-09-2026** (ADR-0019, regla 64: reinicio por hora del tenant; re-origina con id propio y referencia) | `horaInicio` 06:00; `reinicioDia` devuelve al inbound `eventoDeReoriginacion` y `correrProceso` abre la nueva con `referencia`; fuera de la ventana la corrida no abre |
| M-09 | Candidata si no cedida, no reclamada, sin NC | **implementado** (23-09-2026, ADR-0014, regla 60, caso 159: excluye la cedida a un factoring ajeno; la cedida a Security es candidata) | el criterio «Buena factura» de `CRITERIO_PRED` no consulta `cedida`; `estadoCandidata` la bloquea al incorporar; exige además `credito` |
| M-10 | Reglas por RUT emisor, fecha de emisión, reclamo, NC, cesiones previas; lista de emisores con tags | implementado → **implementado el 23-09-2026** (regla 61, caso 160: antigüedad máxima desde la emisión, `antiguedadMaxDias`, 20 días por defecto; lista con tags y cesión previa descartadas) | `INBOUND_RULES` + `CRITERIO_PRED` («Buena factura» exige `!superaAntiguedad(f)`); reclamo y NC sólo dentro de «Buena factura», no seleccionables por sí solos; tags del deudor, no del emisor; criterio desconocido califica todo |
| M-11 | El ejecutivo toma la oportunidad sin oferta y selecciona | implementado | `facturasOp: []` al nacer; `estadoCandidata`; `incorporarFacturasOferta` / `retirarFacturaOferta` (regla 33); regla 13-sexdecies |
| M-12 | Cada cambio de selección re-evalúa | implementado (definición ajustada 22-09-2026: el gesto de simular es explícito; regla 14; ADR-0013) | Regla 14 (gate 124, e2e-14): la re-evaluación se pide; `reevaluarLinea`; `spec-otorgamiento.md` §2, `spec-asignacion-lineas.md` §8.4, `spec-ciclo-factura.md` §3 |
| M-13 | Cinco motores en paralelo, independientes | implementado → **implementado el 23-09-2026** (ADR-0013, regla 68, caso 168, `regla_68.test.mjs`: un evento, cinco motores, una versión de cinco secciones o ninguna; el evento es un gesto del ejecutivo —«Simular la oferta», «Re-evaluar operación», «Re-evaluación de la simulación»—: «el cliente simula» es una forma de hablar, definición del negocio 23-09-2026) | Independientes (`spec-ciclo-factura.md` §0 punto 1) y con una sola pasada: `evaluarOperacion` → `snapVersionCli` (`res`, `verificacion`, `linea`, `giro`, `pricing`); `versionCompleta`, `contarVersiones` |
| M-14 | Otorgamiento evalúa por empresa, no por factura | implementado | `evaluarOtorgItems`, `stKey`; `deudorBlock`; regla 4 |
| M-15 | Reglas bloqueantes impiden avanzar | implementado (definición ajustada 22-09-2026: «bloqueante» = rechazo firme del catálogo, hoy C30–C32 y las que se clasifiquen así) | El modelo llamaba «bloqueante» a lo que detiene la operación hasta retirar las facturas del deudor; el 22-09-2026 se fijó que bloqueante es el rechazo firme del catálogo y que el retiro por deudor no es un bloqueo de otorgamiento (M-18, ADR-0015); el sistema tiene rechazo firme sólo en C30–C32 del **cliente** (`tHard`, «bloqueo firme»; `visadoDealCalc` `rechFirme`) y su efecto es **pérdida automática y terminal** de la operación entera (`useEffect`, `perdidaPor: "sistema"`; `snapVersionCli` `estado = "rechazada"`; reglas 4 y 5), sin vía de destrabe |
| M-16 | Reglas re-evaluables | implementado | `NO_REEV_CLIENTE` es la lista de las **no** re-evaluables (`reglaReev`), vigente —la IIFE del Modelo de Riesgo la rellena— con los 28 de `spec-gestion-excepciones.md` §2.4 (el literal inicial está muerto); `rechReev` es su complemento → sujeta; `reevaluarCliente` emite versión |
| M-17 | Reglas excepcionables por apoderado según criticidad | implementado | Ruteo (área, nivel) + piso `PISO_ATRIB_MONTO` / `CFG_TRAMOS` (regla 4); `puedeAprobarExc` (regla 18); `aprobarExc` con OTG-01 |
| M-18 | Deudor bloqueado → el sistema retira sus facturas automáticamente | pendiente → **implementada entera el 23-09-2026**, redefinida en dos mitades: la del **comité** (ADR-0015, regla 65, caso 165: el rechazo retira las facturas del deudor, deja versión y reabre para una nueva firma; en cero, pérdida) y la de la **verificación** (ADR-0018, regla 67, caso 167: el sistema marca la operación con el issue y avisa; el ejecutivo retira con la operación reabierta, re-simula y vuelve a publicar) | `rechazoComiteDecision` + `aplicarRechazoComite` (comité); `marcarNoVerificada` (único escritor del veto, sin retiro ni versión) + `issueVerificacion` + `avisarNoVerificadas` (verificación); `retirarFacturaOferta` ya no tiene la excepción «noConfirmada»: la guarda de sólo lectura aplica siempre · **Y la tercera mitad, la del SII** (ADR-0021, regla 71, caso 171, 23-09-2026): la NC, el reclamo o la cesión a otro sobre un documento de la oferta cerrada, publicada o firmada lo inhabilitan por el mismo veto de la regla 67, escrito por el SII y contado como pendiente aunque la llamada esté en verde; el ejecutivo retira, re-evalúa y vuelve a firmar |
| M-19 | Justificar cada excepcionable antes de enviar a comité y publicar | implementado → **implementado el 23-09-2026** (regla 62, caso 161: exigencia del backend en `cerrarOferta`, con gate de texto) | `cerrarOferta` re-comprueba el monto (`giroCursable`) y las excepciones mudas (`compuertaExcepcionesMudas` sobre `excepcionesSinComentario`) antes de escribir y devuelve la negativa con «Cierre rechazado · N excepción(es) sin justificar»; `solicitarAprobacionExc` rechaza la solicitud sin comentario, respaldo ni declaración; la Pre-evaluación envía con la declaración «sin comentarios»; `ModalCurse` conserva su botón (regla 30); CTA «Enviar a Comité y Publicar» |
| M-20 | Excepción resuelta no se vuelve a pedir; versionadas | implementado (definición ajustada 22-09-2026: la clave estable basta como versionado) | `reevaluarCliente`; `repoVisado` por `dealId + stKey`, `VISADO_STATE`; sobrevive por clave estable, no dentro de la versión |
| M-21 | Si ya no era necesaria, se marca cumple y se elimina | implementado distinto → **implementado el 23-09-2026** (ADR-0016, regla 66, caso 166: se marca «ya no aplica desde la versión N», no se elimina) | `excepcionesQueYaNoAplican` (pura) + `marcarExcepcionesQueYaNoAplican` desde `evaluarOperacion` (regla 68): la solicitud y el visado pasan a `no_aplica` con `{desdeVersion, por: "sistema", fecha}`, la tarea se cierra con el motivo, el hilo recibe el aviso del sistema; `excSinVisar`/`solVigente` en todo lector: la marcada no justifica ni se reactiva, la solicitud nueva lleva la anterior como historia |
| M-22 | Verificación por empresa para decidir el contacto | implementado (definición ajustada 23-09-2026: la unidad es el **deudor** —la empresa deudora, quien paga y a quien se llama—; «es por deudor») | El modelo decía «empresa emisora» (= cedente) y se corrige; sistema: por deudor (`verifDecision`; `verifFactura` evalúa todas las facturas del deudor); regla 6; `spec-verificacion-facturas.md` §2.1 («La decisión es por deudor dentro de la operación, no por factura»). §15 #5 cerrada |
| M-22-bis | El contacto obtiene si la factura es verídica, si los bienes/servicios se prestaron según lo pactado y confirma la fecha de pago (cláusula del motor b del modelo, sin número propio en el modelo) | implementado | Por factura, en `repoVerifTel`; no versionado, clave estable como M-25. `DrawerVerificacion` lleva el checklist `{existencia, recepcion, fechaPago}` (rótulos «Existencia de la factura» / «Recepción conforme» / «Fecha de pago»; mesa `CHECKS`) y exige los tres checks más la fecha comprometida antes de confirmar (`completo`); `verificarDeudor` y `confirmarLlamadaTel` de `VerificacionTab` persisten `{por, fecha, checklist, contacto, compromiso, respaldo, sinRespaldo, notas}`; `verifFactura` lo lee (`checks: [existencia, recepcion, fechaPago]`); regla 6 («checklist existencia/recepción/fecha»). El veredicto congelado sigue siendo por deudor (`VERIF_VEREDICTO`). Pendiente sólo documental: `spec-verificacion-facturas.md` no describe el checklist (§2.1: el detalle por factura «no es responsabilidad de esta función») |
| M-23 | Si el deudor no pasa, todas las facturas de la oferta se verifican | implementado (definición ajustada 22-09-2026: todas entran, se decide por deudor, se verifican las del deudor que falla) | `verifFactura` (todas las del deudor); «Regla 0» de verificación (regla 6; `spec-verificacion-facturas.md` §4.0: todas las de la oferta sólo para cliente nuevo) |
| M-24 | La verificación corre en cada evaluación | implementado → **implementado el 23-09-2026** (ADR-0013, regla 68: la invoca el evento y deja `verificacion` en la versión) | `snapVersionCli.verificacion` en cada evento, la simulación incluida; el render del detalle sigue pintando desde `verifFactura`; tras el contacto se congela (M-25) |
| M-25 | Factura verificada no se vuelve a pedir; versionadas | implementado (definición ajustada 22-09-2026: la clave estable basta como versionado) | `repoVerifTel` por (deal, factura); `congelarVeredicto`; `limpiarSimulacion` no los toca; clave estable, no versión |
| M-26 | Líneas en cada evaluación, cada factura con línea asignada | implementado → **implementado el 23-09-2026** (ADR-0013, regla 68: la invoca el evento y deja `linea` en la versión) | `asignarLineas` (`CON_LINEA` / `REQUIERE_COMITE`) en `snapVersionCli.linea` en cada evento; la simulación lo ejecuta (`simularOferta` dispara `evaluarOperacion` antes de escribir el negocio) y «Re-evaluar operación» también (`reevaluarOperacion`); LIN-01 en `controlesIntegracion` |
| M-27 | Cuatro líneas LF1–LF4 | implementado (definición ajustada 22-09-2026: cinco líneas, LF1–LF4 más la global del deudor) | El modelo dice cuatro; el sistema asigna contra **cinco**: LF1–LF4 (cascada por estado del cliente, `spec-asignacion-lineas.md` §3.5; `asignarLineas`) más la línea **global** del deudor como tercer nivel obligatorio —una factura cursa sólo si `m ≤ restPar && m ≤ dispCliente && m ≤ restDeudor`; `capacidadDeudores` «Nivel 3: la línea GLOBAL del deudor»— (regla 7 «cinco líneas»; origen A23 bloque `LINEA_DEUDOR`, regla 44; y la línea del RUT cliente ES la suma de sus líneas, regla 45, ADR-0011). |
| M-28 | Al publicar, solicitud automática al comité | implementado (definición ajustada 23-09-2026: la solicitud sale sólo cuando **no** existe línea suficiente; el «existir» del modelo es una errata) | `cerrarOferta` → `solicitudComiteDeOferta` (siempre `tipoLinea: "puntual"`, `propGlobal: 0`; el motivo sólo rotula) → `api1Inyeccion`; regla 15-bis (casos 106, 107): `solicitudComiteDeOferta` devuelve `null` salvo `ev.requiereComite > 0` y `cerrarOferta` sólo inyecta si hay solicitud; con línea suficiente la cascada asigna esa línea y no se pide nada (§9) |
| M-29 | Comité no aprueba → retirar facturas sin línea y re-evaluar | implementado → **implementado el 23-09-2026** (ADR-0015, regla 65, caso 165: comité de crédito externo; «Rechazada» por línea de detalle en la API 3; el rechazo retira, versiona y reabre; en cero, pérdida con causa) | `api3EstadoProceso` resuelve «Aprobada» / «Observada» / «Rechazada» y lo escribe por línea de detalle; `rechazoComiteDecision` (pura) + `aplicarRechazoComite`, disparado por «Consultar estados» |
| M-30 | La línea es un monto; la asignación es por factura | implementado | `asignarLineas` `resFacturas` con su `origen`; regla núcleo 9; `spec-asignacion-lineas.md` §2.1, §2.4 |
| M-31 | Una factura puede asociarse a más de una línea (LF2–LF3) | implementado | `origen.push`; «una factura se reparte entre ambas», dice el comentario de `asignarLineas`; sólo dentro de la cascada del par |
| M-32 | No se cursa con línea por monto parcial | implementado | La condición de `asignarLineas`: `m ≤ restPar` y ≤ `dispCliente` y ≤ `restDeudor`; si no, completa a `REQUIERE_COMITE`; LIN-01 (regla 41) |
| M-33 | Giro GE / GN según cliente nuevo, otorgamiento, verificación y líneas | implementado → **implementado el 23-09-2026** (ADR-0017, regla 63, caso 162: con comité el giro es Normal) | `asignarGiros`: quinto hecho `sinComite` por deudor, que `girosDeDeal` saca de las facturas `REQUIERE_COMITE` de la versión; dos tipos; GN disyunción (`spec-modelo-giro.md` §2) |
| M-34 | Pricing asigna tasa por deudor | implementado | `spreadSugerido`; `SPREAD_MIN_DEUDOR`; `tasaDe`; `prorratearOperacion` |
| M-35 | Tasa equivalente vs. tasa de los últimos negocios | implementado (definición ajustada 22-09-2026: contra el último negocio del cliente; en producción la fuente es el core, dato / contrato) | `tasaEquivalente`; `tasaUltimoNegocio` (**el** último negocio del **cliente**, sintético y sembrado sólo por cliente en `historialComercial`, no del par); `tasaModo` |
| M-36 | Condiciones comerciales versionadas | implementado → **implementado el 23-09-2026** (ADR-0013 punto 5, regla 68, caso 168: la versión guarda el modo de tasa y las condiciones) | `snapVersionCli.pricing` (`pricingDeVersion`: `modo`, `usaUltNeg`, `tasaRiesgo`, `tasaUltNeg`, `tasaSimulada`, `tasaDescuento`, `comision`, `anticipoPct`, `comisionPct`, `comisionUF`, `gastosCLP`, `gastoDocCLP`, `plazoEquivalente`, `montoGirar`); `tasaDelNegocio` decide la tasa para la pantalla y la versión; `huellaOperacion` sigue fijando el paquete, no el precio (caso 85) |
| M-37 | Resultado: requisitos de excepción | implementado | `evaluarOtorgItems`; tab Otorgamiento y mesa; regla 54 |
| M-38 | Resultado: requisitos de verificación | implementado | `verifResumenDeal`; tab y mesa `VerificacionView` (regla 53) |
| M-39 | Resultado: asignación de líneas y solicitudes | implementado | `asignarLineas` devuelve `solicitudes`; `lineaDeVersion`; `solicitudComiteDeOferta` |
| M-40 | Resultado: montos a girar GE / GN | implementado | `asignarGiros` `porTipo` / `porDeudor`; `giroDeal` / `giroCongelado`; regla 22 |

Conteo sobre las 40 cláusulas: **39 implementadas** (14 medidas, catorce implementadas el 23-09-2026 —M-09, ADR-0014; M-10, regla 61; M-19, regla 62; M-33, ADR-0017; M-07 y M-08, ADR-0019; M-29, ADR-0015; M-21, ADR-0016; M-18, ADR-0015 y ADR-0018; M-13, M-24, M-26 y M-36, ADR-0013, regla 68; M-01, regla 69— más 11 por definición ajustada: M-05,
M-06, M-12, M-15, M-20, M-23, M-25, M-27 y M-35 el 22-09-2026, y M-22 y M-28 el 23-09-2026) · **1
implementada distinto** (M-02: con «decidido: implementar» y sin pregunta abierta) · **0 pendientes** (M-18, de
máquina de estados, quedó implementada entera el 23-09-2026: el comité con ADR-0015, regla 65, y la
verificación con ADR-0018, regla 67) · **0 decisiones abiertas** (la última, M-22, cerrada el 23-09-2026: la
unidad es el deudor); más M-22-bis, **implementada** (por factura, clave estable; pendiente sólo
documentarla en el spec de verificación).
Las «implementadas distinto» no son defectos por sí solas: cada una tiene una lectura del modelo que el
sistema no adoptó, y va a §15 o §16.

### 15. Las contradicciones que hay que decidir

Cada una con las dos lecturas. Ninguna se cierra programando: se cierra con un ADR que reemplace la
regla vigente o con una corrección del modelo. Las seis están **cerradas**, ninguna a medias y ninguna
con una pregunta abierta: #1, #2, #4 y #6 el 22-09-2026; el 23-09-2026, #2 del todo en la verificación
(ADR-0018), #3 en el destino de la no gestionada (ADR-0019), #1 en «el cliente simula» y #5 en la
unidad (M-22: el deudor). La última columna dice cómo se cerró cada una.

| # | Tema | Lectura A (modelo) | Lectura B (vigente, con evidencia) | Qué se decidió |
|---|---|---|---|---|
| 1 | Re-evaluación al cambiar la selección (M-12) | Cada vez que el ejecutivo selecciona o modifica su selección, la oferta se evalúa o re-evalúa | La re-evaluación se pide y cada evaluación deja evidencia; editar sólo actualiza lo aritmético (regla 14, gate 124, e2e-14-a/b/c; `spec-otorgamiento.md` §2; `spec-asignacion-lineas.md` §8.4; `spec-ciclo-factura.md` §3; `reevaluarLinea`) | **Cerrada el 22-09-2026 y del todo el 23-09-2026**: sólo el gesto explícito —simular o re-evaluar— dispara la evaluación, y ese gesto es **un evento** que corre los cinco motores y emite las cinco versiones; la regla 14 se conserva (ADR-0013). El gesto es del **ejecutivo**: «Simular es la acción del ejecutivo que se ejecuta al Re-evaluar la oferta (y que contempla correr el motor de otorgamiento, verificación de facturas, asignación de líneas, motor de giros y motor de precios)» (23-09-2026); «el cliente simula» del modelo es una forma de hablar y no hay simulación del cliente en ningún canal: nada nuevo que construir, ni portal de autoservicio ni intent del Agente IA. Sin ADR nuevo: no se descartó una alternativa que el negocio hubiera pedido |
| 2 | Deudor bloqueado → retiro automático de sus facturas (M-18) | Existe un bloqueo a nivel deudor y el sistema retira sus facturas como resultado de la simulación | Los knockouts son C30–C32 del cliente (`spec-ciclo-factura.md` §13); un rechazo firme pierde la operación entera (reglas 4 y 5; `useEffect`); D02–D13 son excepciones no re-evaluables (`spec-gestion-excepciones.md` §2.4); paquete cerrado sólo lectura (regla 33); `retirarFacturaOferta` sólo por `noConfirmada` | **Cerrada el 22-09-2026 y cerrada del todo el 23-09-2026 (ADR-0015 y ADR-0018)**: no existe ni se crea una disposición «bloqueante del deudor» en el otorgamiento; M-18 se redefine como la consecuencia del comité que rechaza la línea o de la verificación que no confirma, y en los dos casos el cliente firma la nueva operación. Comité (ADR-0015): el sistema retira las facturas del deudor, emite versión y reabre. Verificación (ADR-0018): marcar «no verificada» no retira; la operación queda con el issue «facturas no verificadas: no se puede cursar», el sistema avisa al ejecutivo comercial por mensajería, y el ejecutivo retira las facturas del deudor, re-simula y vuelve a publicar, lo que revoca la firma (regla 1); las retiradas quedan vetadas. Descartados el retiro automático con la firma vigente (hoy, regla 13) y el retiro automático con reapertura (ADR-0015 tal cual) |
| 3 | Cierre del día: eliminar vs reabrir (M-07, M-08) | A la hora de corte se eliminan las oportunidades no gestionadas y al día siguiente se reinicia | `rolloverDia` reabre con el mismo id y el paquete actualizado (regla 22); el corte es por conteo de corridas. `spec-ciclo-factura.md` §17 dice que el rollover «cierra y **re-origina** las oportunidades del inbound que nadie gestionó» y que «Es una oportunidad **nueva**, con su propio identificador»: el vault y el fuente («EL ID NO CAMBIA») contradicen a ese spec | **Cerrada del todo**: el reloj el 22-09-2026 —la hora de corte (23:00 por defecto) y la de reinicio (06:00 por defecto) son parámetros del tenant que el job consume (M-07, M-08)— y el destino el 23-09-2026 (ADR-0019): «Hoy el corte es por corridas (demo) pero en producción será un continuo. Las oportunidades que han sido gestionadas por el ejecutivo (tienen oferta) no se eliminan.» El corte y el reinicio cuelgan del reloj y no del conteo de corridas, que es un artificio de la demo; «gestionada» es la oportunidad que tiene oferta (etapa Oferta o posterior) y no se toca, cualquiera sea su etapa; la que no tiene oferta se **elimina** y la bitácora del sistema registra el cierre con el id, el cedente y el paquete; al reinicio el inbound la vuelve a abrir desde la base —las facturas que tenía más las que llegaron— como una oportunidad **nueva**, con id propio y referencia a la eliminada, sin simular y con la oferta vacía; «el id no cambia» sigue valiendo para todo lo que sobrevive al corte. Gana la lectura A, con `spec-ciclo-factura.md` §17; la regla 22 se reescribe en lo que dice del cierre del día. Descartados: reabrir con el mismo id (la lectura B, `rolloverDia`), «no gestionada» como etapa configurable del tenant (`etapaNoGestionada`) y un criterio por actividad **Implementada el 23-09-2026** (regla 64, casos 163–164, `regla_64.test.mjs`). |
| 4 | Comité que no aprueba (M-29) | Se retiran las facturas de los deudores sin línea y se re-evalúa; el criterio de línea queda cumplido | Después de aceptar la operación sólo encoge y la única mutación es el retiro por verificación (regla 13; `spec-asignacion-lineas.md` §4.3); paquete cerrado sólo lectura y reabrir revoca la firma (reglas 33 y 1); el comité simulado nunca rechaza (`api3EstadoProceso`) | **Cerrada el 22-09-2026**: el comité de crédito es externo y responde aceptación o rechazo; la API 3 devuelve «Rechazada» por línea de detalle; al recibirlo NEX retira las facturas del deudor, emite versión con el motivo y **reabre** la operación (la firma se revoca, regla 1, y el cliente firma el paquete que queda); si no queda ninguna factura, pérdida con causa «línea rechazada por el comité» (regla 5). La regla 13 pierde su mitad «sólo encoge»: el rechazo del comité reabre (ADR-0015) y la verificación fallida marca y avisa, y el ejecutivo retira y vuelve a publicar (ADR-0018) |
| 5 | Unidad de la verificación (M-22, M-23) | Las reglas corren a nivel de la empresa emisora y, si falla, todas las facturas de la oferta se verifican | La unidad es el deudor: V01–V10 son atributos del deudor o del par (regla 6; `spec-verificacion-facturas.md` §2.1 «La decisión es por deudor dentro de la operación» —«empresa emisora» no aparece en ese spec, es el texto de M-22—; `verifDecision`; `verifFactura`); sólo la «Regla 0» de verificación (regla 6; `spec-verificacion-facturas.md` §4.0) verifica toda la oferta | **Cerrada del todo**: la segunda mitad el 22-09-2026 —todas las facturas de la oferta pasan por el motor, se decide por deudor y sólo las del deudor que falla se verifican (M-23)— y la primera el 23-09-2026 —«es por deudor»: la unidad de la verificación es la empresa **deudora**, quien paga y a quien se llama; «empresa emisora» era un error de redacción del modelo (M-22)—. Sin ADR: en las dos se aceptó la conducta vigente |
| 6 | Cedida como exclusión del inbound (M-09) | Candidata sólo si no está cedida a otro factoring | El inbound no excluye la cedida (`CRITERIO_PRED`); bloquea al incorporar (`estadoCandidata`); declarado desfase con el PDF de política (`spec-inbound-facturas.md` §3, §11 fila 1, §12.1; `spec-ciclo-factura.md` §23c fila 6) | **Cerrada el 22-09-2026**: la cesión a un factoring **ajeno** a Factoring Security es la cuarta condición del filtro; la cedida a Security **no** se excluye (ADR-0014). **Implementada el 23-09-2026**: regla 60, caso 159 |

### 16. Lo pendiente, por motor

Cada ítem dice qué pide el modelo o el spec, qué se buscó en el fuente y qué se encontró.

| Motor | Pendiente o decisión abierta | Qué se buscó y qué se encontró |
|---|---|---|
| Inbound | Hora de corte y de reinicio (M-07, M-08) y frecuencia de la corrida (M-02) como parámetros del tenant que el job del backend consuma (`spec-inbound-facturas.md` §10.4) → **implementado el 23-09-2026** (regla 64, casos 163–164: `jobDelReloj`, `intervaloJobMs`, `relojSimulado`; 23:00, 06:00 y `frecuenciaMin` configurables). Qué hace el corte → **implementado** (ADR-0019; T1): la oportunidad **sin oferta se elimina** (la bitácora del sistema registra el cierre con el id, el cedente y el paquete), la que **tiene oferta no se toca**, y al reinicio el inbound la re-origina como oportunidad nueva, con id propio y referencia a la eliminada; cambian `rolloverDia` (elimina en vez de reabrir y salta las que tienen oferta), el job por hora, la configuración del tenant (se retira `etapaNoGestionada`) y la regla 22 en lo que dice del cierre del día | `23:00`, `06:00`, `hora de corte`, `HORA_CORTE`, `corte diario`: nada; `horaInicio` / `horaFin`: cuatro resultados, todos de configuración (`CFG_OPER_BASE` y los `<input type="time">`) y ningún consumidor; `frecuenciaMin: 60`: editable en Configuración › Operación y sin consumidor: el cron es `setInterval(…, CRON_MS)` (sólo con `modoDemo !== false`) y el cierre es por conteo; la ventana y la frecuencia configuradas son decorativas; `rolloverDia` reabre con el mismo id la `_inbound` que quedó en `etapaNoGestionada` (`reaperturaDiaria`) |
| Inbound | Criterio de **antigüedad máxima desde la emisión** (M-10), configurable, 20 días por defecto → **implementado el 23-09-2026** (regla 61, caso 160: `antiguedadMaxDias` en `CFG_OPER_BASE`, quinta condición de «Buena factura», Configuración › Operación); la cesión previa y la lista de emisores con tags quedaron **descartadas** como criterios | `superaAntiguedad` en `CRITERIO_PRED`, contra el corte del activo; reclamo y NC sólo dentro de «Buena factura», no seleccionables por sí solos; los tags son del deudor (A3/A4) |
| Inbound | La **aceptación del DTE** (M-01) es una bandera del documento —definición del negocio, 22-09-2026— y **el A1 la trae**: `facturaDeDTE` la lee junto a reclamo y NC y la fila del documento la muestra → **implementado el 23-09-2026** (regla 69, caso 169, `regla_69.test.mjs`; el informe del 22-09 decía «no la trae»: estaba mal medido). **No participa del filtro de candidatura** (definición del negocio, 23-09-2026): una factura sin acuse —sus primeros 8 días desde la emisión— sí es candidata, y «Buena factura» sigue sin mirarla | `EstadoDTE.Aceptado` («2») con `FchAcuseRecibo`, `Reclamado` con `FchReclamo`, `FchRecepcion` (`Levantamiento_Activos_Informacion.md` A1, `spec-inbound-facturas.md` §2); `facturaDeDTE` → `acuse` / `acuseCodigo` / `fchAcuse` / `fchRecepcion`; `acuseLabel` + `ChipAcuse`; `facturasDeCandidata` ya no sortea |
| Inbound | El fuente anuncia una re-simulación automática al llegar facturas que no ocurre —en el comentario y en la bitácora, no en la pantalla del detalle—: la decisión #1 de §15 quedó cerrada a favor del gesto explícito (ADR-0013), así que hay que corregir el comentario y los mensajes de bitácora y retirar el banner muerto | La pantalla del detalle no anuncia nada: el banner «Se está recalculando la simulación con el paquete actualizado» es inalcanzable por `deal.actualizando && !fullPage` (y lo mismo su gemelo en la pestaña de deudores), porque el único `<DealDrawer` pasa `fullPage`. Lo que promete la re-simulación es el comentario «el resultado re-simulado llega tras una latencia», el estado `actualizando: true` y los `logSys` «Recalculando N oportunidad(es) … latencia estimada …» y «Recálculo aplicado»; `aplicar` sólo anexa a `facturasDisponibles` y apaga `actualizando`, sin `simulado`, sin `finanzasDe`, sin versión |
| Inbound | Definición única de «Prime» para segmentar (M-05): sólo listas, o listas + nota > 4,2 | Listas en `CRITERIO_PRED` y `capacidadDeudores`; disyunción con la nota en `verifDecision` (regla 6) |
| Inbound | El acumulador de la corrida en `useState` se pierde al cerrar la pestaña; topes de 40 y 4 en el código | `spec-inbound-facturas.md` §10.4 y §12.4 |
| Otorgamiento | La disposición «bloqueante del deudor» **no se crea** (contradicción 2, cerrada); M-18 pasa a Líneas y Verificación: retiro de las facturas del deudor y nueva firma → **implementado el 23-09-2026** (ADR-0015 para el comité: el sistema retira y reabre, regla 65; ADR-0018 para la verificación: el sistema marca y avisa, el ejecutivo retira, re-simula y vuelve a publicar, regla 67) | `aplicarRechazoComite` reabre tras el retiro; `avisarNoVerificadas` escribe al ejecutivo; `retirarFacturaOferta` sin llamador con motivo «noConfirmada» |
| Otorgamiento | Excepción que deja de ser necesaria (M-21): el visado, la solicitud, la tarea y el hilo se marcan «ya no aplica desde la versión N», con actor «sistema» y hora; nada se elimina; una versión posterior que la vuelva a levantar abre solicitud nueva → **implementado el 23-09-2026** (ADR-0016, regla 66, caso 166, `regla_66.test.mjs`) | `excepcionesQueYaNoAplican` + `marcarExcepcionesQueYaNoAplican` (desde `reevaluarCliente`); `excSinVisar`/`solVigente` en los doce lectores del visado; `spec-gestion-excepciones.md` §3 y §5.5 lo definen |
| Otorgamiento | Compuerta «sin excepciones sin justificar» en la mutación (M-19): exigencia del backend en `cerrarOferta` y gate → **implementado el 23-09-2026** (regla 62, caso 161, `regla_62.test.mjs`) | `cerrarOferta` re-comprueba `giroCursable` y `compuertaExcepcionesMudas` antes de `patchCierre`; `solicitarAprobacionExc` rechaza la solicitud muda; la Pre-evaluación envía con la declaración «sin comentarios»; el botón de `ModalCurse` `disabled={sinComentario > 0 \|\| !gOk}` sigue, como pantalla (regla 30) |
| Otorgamiento | Tres gestos de evaluación → **implementado el 23-09-2026** (ADR-0013, regla 68, caso 168, `regla_68.test.mjs`): un solo evento de evaluación (`evaluarOperacion`: simular / re-evaluar) corre los cinco motores, la versión trae las cinco secciones o no se emite, y la primera simulación emite la v1; el evento es un gesto del ejecutivo —«Simular la oferta», «Re-evaluar operación», «Re-evaluación de la simulación»—, y «el cliente simula» es una forma de hablar del modelo (23-09-2026): no hay simulación del cliente en ningún canal | `simularOferta`, `reevaluarOperacion` y `reevaluarCliente` disparan `evaluarOperacion`; `spec-gestion-excepciones.md` §4.1 y §5.5 |
| Otorgamiento | El camino vivo a giro salta Pendiente Integración, VER-01 y Operaciones N3 (desfase del sistema) | `useEffect` escribe Girada; `avanzarPipeline` sin llamador; `spec-ciclo-factura.md` §23c fila 4 |
| Verificación | Verificación y líneas invocadas por el evento de evaluación y con versión propia (M-24, M-26) → **implementado el 23-09-2026** (ADR-0013, regla 68, caso 168) | `snapVersionCli.verificacion` y `.linea` en cada evento, la simulación incluida; el render del detalle sigue pintando desde `verifFactura` y `evalLin` |
| Verificación | La verificación fallida **marca y avisa, no retira** (M-18, ADR-0018): marcar «no verificada» deja la operación con el issue «facturas no verificadas: no se puede cursar» (VER-01 sigue mandando) y con actor y hora en la bitácora; el sistema notifica al ejecutivo comercial por el centro de mensajería (facturas, deudor, y que no se cursará mientras sigan en la oferta); el ejecutivo retira las facturas del deudor con la operación reabierta, re-simula (versión nueva) y vuelve a publicar, lo que revoca la firma (regla 1) para la nueva firma del cliente; las retiradas quedan vetadas → **implementado el 23-09-2026** (regla 67, caso 167, `regla_67.test.mjs`) | `marcarNoVerificada` (único escritor del veto: bitácora + `avisarNoVerificadas`; sin retiro ni versión), `verifResumenDeal.noVerif` + `issueVerificacion` (tarjeta del tubo, tab y bloque de pendientes del detalle, VER-01), la mesa sin duplicar; el retiro es el ordinario sobre la operación reabierta («Editar la oferta») |
| Verificación | Quién y cómo registra el contacto (la operación en cero tras retirar todo ya está definida: `spec-ciclo-factura.md` §14, retirar la última factura es pérdida, citado en §11) | No está en `spec-verificacion-facturas.md`; el vault sí (`DrawerVerificacion`, regla 53) |
| Verificación | Qué obtiene el contacto (M-22-bis): **implementado**; pendiente sólo que `spec-verificacion-facturas.md` documente el checklist | `DrawerVerificacion`: checklist `{existencia, recepcion, fechaPago}`, rótulos, `completo = chk.existencia && chk.recepcion && chk.fechaPago && !!compromiso`, devuelve `checklist: chk`; `verificarDeudor` y `VerificacionTab` persisten `{por, fecha, checklist, contacto, compromiso, respaldo, sinRespaldo, notas}` en `repoVerifTel`; `verifFactura` lee `checks`; mesa `CHECKS`; `VERIF_VEREDICTO` sigue por deudor; la fecha de pago además como criterio previo (`spec-verificacion-facturas.md` §5 fila 6) |
| Líneas | Comité de crédito que rechaza (M-29): estado «Rechazada» por línea de detalle en la API 3 (dato / contrato), retiro de las facturas del deudor, versión con motivo y reapertura para nueva firma; en cero, pérdida → **implementado el 23-09-2026** (ADR-0015, regla 65, caso 165, `regla_65.test.mjs`; T1; contradicción 4 cerrada) | `api3EstadoProceso` resuelve «Rechazada» por línea; `rechazoComiteDecision` retira, recorta la versión (`comite_rechazo`) y reabre con `reabierta`; `aplicarRechazoComite` escribe y `reject(id, "committee_reject")` pierde en cero; lo dispara «Consultar estados» |
| Líneas | La consulta A23 sin consumidor; transacción, lock y `requiere_resimulacion` inexistentes | `spec-ciclo-factura.md` §23a; `spec-asignacion-lineas.md` §6 |
| Líneas | LF1 tras la primera operación; qué se pide al comité en estado A | `spec-ciclo-factura.md` §24 |
| Líneas | Si el tipo de la solicitud debe seguir al motivo (M-28): hoy la solicitud automática pide siempre líneas puntuales cliente-deudor aunque el motivo sea `cliente`, `deudor` o `lf1` | `solicitudComiteDeOferta` (`tipo: "modificar"`, `subtipo: "agregar_deudores"`, `propGlobal: 0`, `tipoLinea: "puntual"`); `RESOLUCION_COMITE` sólo aporta `pide` / `alcance`; `api1Inyeccion` no transforma |
| Giro | El resultado de líneas entra al criterio (M-33): un deudor con facturas a comité califica Giro Normal aunque cumpla Express; `asignarGiros` recibe el quinto hecho y el adaptador lo pasa → **implementado el 23-09-2026** (ADR-0017, regla 63, caso 162; T1) | `GIRO_HECHOS` declara `sinComite`, GE lo exige, `girosDeDeal` lo lee de `lineaDeVersion` (o de la asignación que le pasen) y `giroResumenDeal` lo cubre en su firma |
| Giro | Tercer tipo; GN disyunción o conjunción; pantalla de la asignación (§7 del spec vs regla 22) | `spec-modelo-giro.md` §2, §7 |
| Giro | Contrato de entrega a Tesorería (payload, endpoint, idempotencia, evento) | No modelado (`spec-ciclo-factura.md` §23b); `recibirGiroTesoreria` es sólo el callback |
| Pricing | Tasa de referencia (M-35): **definición confirmada**, el último negocio del cliente; lo pendiente es la fuente en producción —el último negocio cursado del cliente en el core (dato / contrato)— porque en la demo ese historial es dato generado | «últimos negocios» (plural) o promedio: no existe; sólo `tasaUltimoNegocio`, del **cliente** (sintético, `historialComercial` siembra sólo por cliente), no del par; `spec-pricing-simulacion.md` §4.2 fija **el** último negocio, en singular, como tasa top-down, y ningún spec define una ventana ni un promedio |
| Pricing | Condiciones comerciales en la versión (M-36): la simulación emite versión y la versión guarda el modo de tasa (ponderada o última operación) y las condiciones asignadas (descuento, comisiones) → **implementado el 23-09-2026** (ADR-0013, regla 68, caso 168; T1) | `snapVersionCli.pricing` (`pricingDeVersion`); `huellaOperacion` sigue fijando el paquete y no el precio (caso 85); `spec-ciclo-factura.md` §23c fila 5 cerrada |
| Pricing | El plazo por documento no llega al prorrateo (plazo por deudor) | Desfase medido, `spec-ciclo-factura.md` §23c fila 1 |
| Máquina de estados | No hay catálogo formal de transiciones: `spec-ciclo-factura.md` §20 dice que el resolver valida «contra la máquina de estados» sin definirla. La tabla de §2 es la primera enumeración, y es medida, no normativa | Transiciones repartidas entre `simularOferta`, `cerrarOferta`, `confirmarCierre` / `etapaTrasFirma`, `aprobarIntegracion`, `recibirGiroTesoreria`, `reabrirOperacion`, los dos escritores manuales `moverEtapa` y `moveTo` —con guardas parciales: `cesion` entra sin `integracion`, `perdida` sin causa, y volver a `oferta` / `prospeccion` no tiene guarda en `moverEtapa`— y los ocho escritores de pérdida |
| Máquina de estados | El id `aceptadas` sin escritor; si `Aceptada` y `Cesión` deben ser dos estados con la inscripción de la AEC entre medio (`spec-ciclo-factura.md` §23b) | `stage: "aceptadas"` como cadena literal: ningún escritor; la firma escribe `cesion` u `otorgamiento` (`patch` de `confirmarCierre`) |
| Máquina de estados | `clienteAcepto` lo escribe el canal WhatsApp, no la firma: el intent `cursar` deja la operación en `oferta` con `clienteAcepto: true` y `aprobacionFormalCliente` la da por aceptada sin portal, contra la regla 1 | los dos escritores de `clienteAcepto: true` son `dealFirmado` (base en memoria) y el manejador del intent `cursar` del canal WhatsApp (`if (intent === "cursar" && hayOferta && !yaBoton)`); el `patch` de `confirmarCierre` no lo escribe; `aprobacionFormalCliente` lo lee |

---

## Documentos relacionados

| Documento | Qué cubre |
|---|---|
| `Specs_Procesos/Evaluacion_Factura/spec-ciclo-factura.md` | la costura entre los siete motores siguiendo a la factura; §0 mapa, §3 la reevaluación, §6 cierre, §7 post-firma, §13 pérdida, §14 deudor que no confirma, §15 reapertura, §17 versiones (y la re-originación con id propio que ADR-0019 decide para el cierre del día), §23 lo declarado y no implementado |
| `Specs_Procesos/Evaluacion_Factura/spec-inbound-facturas.md` | la corrida horaria, el filtro de calidad, las siete reglas y el dimensionamiento (§5, §6, §10.4, §12) |
| `Specs_Procesos/Otorgamiento/spec-otorgamiento.md` | el catálogo, la atribución, el ciclo del visado y el contrato del motor como servicio (§2, §3, §4, §5, §9) |
| `Specs_Procesos/Excepciones/spec-gestion-excepciones.md` | qué pasa entre que el motor levanta una excepción y un apoderado la resuelve; los cinco momentos de evaluación (§4.1), qué libera el giro (§5.3), la re-evaluación (§5.5) |
| `Specs_Procesos/Verificacion/spec-verificacion-facturas.md` | la decisión por deudor, los dos protocolos, la «Regla 0» (primera operación del cliente) y el veredicto congelado (§2.1, §4.0, §9; §9 y `spec-ciclo-factura.md` §14 cambian con ADR-0018: la verificación fallida marca y avisa, no retira) |
| `Specs_Procesos/Lineas/spec-asignacion-lineas.md` | las cinco líneas, la cascada, la versión y el diff, «después de aceptar sólo encoge» (§3.5, §3.7, §4.3, §6, §8.8; la mitad del «sólo encoge» que hablaba de la verificación la reemplaza ADR-0018) |
| `Specs_Procesos/Evaluacion_Factura/spec-pricing-simulacion.md` | la tasa por deudor, el catálogo de conceptos y el prorrateo (§2, §3, §4) |
| `Specs_Procesos/Evaluacion_Factura/spec-modelo-giro.md` | GE / GN, la calificación por deudor, el congelado y lo no resuelto (§2, §5, §6.1, §7) |
| `vault/conocimiento/invariantes.md` | el índice de las reglas de dominio y del contrato con el servidor citadas en la Parte III |
| `vault/conocimiento/reglas/curse_firma_y_etapas.md` | las reglas de la firma, las etapas post-firma y la integración (1, 5, 12-bis, 23, 24, 26, 28, 30, 33, 41, 43, 55, 58) |
| `Levantamiento_Activos_Informacion.md` | los activos A1–A25 (DTESync, AECSync, listas, líneas A23) y el maestro de cada campo |
| `Integraciones/Integraciones_APIs_y_S3.md` | los contratos de integración: API 1/2/3 de líneas, swaggers y transporte |
