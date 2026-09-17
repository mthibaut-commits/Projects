---
type: conocimiento
title: "Invariantes: índice de las reglas de dominio y del contrato con el servidor"
description: "Cada regla de dominio con su enunciado, el archivo donde vive verbatim y qué caso de la suite la verifica; y los 12 invariantes del contrato con el servidor con su cobertura. La columna vacía es el hallazgo"
tags: [conocimiento, invariantes, indice]
timestamp: 2026-09-17T15:29:14Z
---

# Reglas de dominio (invariantes — NO romper)

> **Lista que un code review rechaza sin discusión.** Las reglas viven **verbatim** en `reglas/<tema>.md` —se citan por número y no se renumeran— y este índice dice dónde está cada una y **qué caso de `tests_asignacion_lineas.js` la verifica**. La columna *casos* se extrajo del propio texto de cada regla (las que nombran su caso); una regla **sin gate** no es una regla falsa: es una que hoy sólo la sostiene la revisión, y ésa es la deuda que esta tabla hace visible.

## Reglas de dominio (61 · 40 con caso en la suite —31 lo citan en su texto, 9 se les asignó por el título del caso— · 21 sólo por revisión)

> **Cómo leer la columna de casos.** Un número a secas está **citado en el texto de la regla**. Un número con `~` se le asignó leyendo el **título** del caso en `tests_asignacion_lineas.js` (`ok("N …")`) el 17-09-2026: es una inferencia razonable, no una cita — antes de apoyarse en él, abrir el caso. *Sin gate* = hoy sólo la sostiene la revisión.

| Regla | Enunciado | Vive en | Casos de la suite |
|---|---|---|---|
| 1 | Curse nunca por email | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | ~24–26 |
| 2 | Nota Deudor 1–5 | [`reglas/clasificacion_deudor.md`](./reglas/clasificacion_deudor.md) | **sin gate** (revisión) |
| 3 | CAT 1–5 por nota ponderada por monto | [`reglas/clasificacion_deudor.md`](./reglas/clasificacion_deudor.md) | 104 |
| 4 | Motor de otorgamiento = Modelo de Riesgo v1.0 | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | 44, 46, 48, 56–59, ~38–41, ~43, ~45, ~47, ~49–51 |
| 5 | Pérdida es estado terminal | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | **sin gate** (revisión) |
| 6 | Verificación de facturas = rutina AISLADA, y la decisión es POR DEUDOR | [`reglas/verificacion.md`](./reglas/verificacion.md) | ~27–32, ~52–55, ~76–77 |
| 7 | Motor de asignación de líneas | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | ~1–15, ~89 |
| 8 | Oferta | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | **sin gate** (revisión) |
| 9-bis | Un umbral de política se lee con `pol(clave, default)` y no se incrusta en ninguna parte. | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | 90 |
| 9-ter | Una COMPARACIÓN se hace en PESOS. El `M$` no cruza a la lógica | [`reglas/verificacion.md`](./reglas/verificacion.md) | 115 |
| 9 | Pricing | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | ~69 |
| 10 | Contactabilidad | [`reglas/prospeccion_cartera_y_churn.md`](./reglas/prospeccion_cartera_y_churn.md) | **sin gate** (revisión) |
| 11 | Asignación de ejecutivo por CEDENTE | [`reglas/prospeccion_cartera_y_churn.md`](./reglas/prospeccion_cartera_y_churn.md) | **sin gate** (revisión) |
| 12 | La reserva NO es de NEX | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | **sin gate** (revisión) |
| 12-bis | Lo que saca una oportunidad de Prospección es la SIMULACIÓN | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | **sin gate** (revisión) |
| 13 | Cada simulación emite una VERSIÓN, y el diff entre versiones es informativo | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | ~16–23 |
| 13-bis | El LIBRO DE VENTAS no depende de la oferta | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 92 |
| 13-ter | Las FECHAS de la factura son un dato del documento, no una derivación de la pantalla | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 93 |
| 13-quater | LAS FACTURAS SALEN DEL ARCHIVO. El pipeline no genera datos: los lee y los procesa | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 94 |
| 13-quinquies | UNA FACTURA CEDIDA ES UNA FACTURA QUE EXISTE | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 95 |
| 13-sexies | O06 · El monto cedido tiene que ser el monto del documento — y ese control NO existía | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | 96 |
| 13-septies | «Deudores disponibles» se parte en DOS PESTAÑAS, por LÍNEA | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | 97 |
| 13-octies | «Deudores disponibles» se puede ver POR DEUDOR o POR FACTURA | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | 98 |
| 13-octies-bis | «Documentos en la oferta»: la misma elección de vista, y el vacío se ve | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | **sin gate** (revisión) |
| 13-nonies | La columna SOW del tubo: el MIX DE FINANCIAMIENTO lo MIDE el A2 y lo PUBLICA el A11 | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 99 |
| 13-decies | La columna «Oportunidad» parte los deudores por LÍNEA, con un LOOKUP y no con el motor | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | 100 |
| 13-undecies | A5 se DERIVA de A2: la misma cifra se cuenta una sola vez | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 101 |
| 13-duodecies | «Factoring target» es CONFIGURACIÓN DEL TENANT, y el rótulo del chip se arma con ella | [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | 103 |
| 13-terdecies | La LÍNEA GENERAL DEL CLIENTE va en la cabecera del detalle, y se mueve con la simulación | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | **sin gate** (revisión) |
| 13-quaterdecies | «Eliminar la simulación y vaciar la oferta»: partir de cero sin cerrar la pestaña | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | **sin gate** (revisión) |
| 13-quindecies | La columna SOW dibuja a los CESIONARIOS, cuatro chips, y nosotros salimos siempre | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | 105 |
| 13-sexdecies | Armar la oferta A MANO tiene que tener salida, y retirar la última factura también | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | **sin gate** (revisión) |
| 13-septdecies | Una oferta con «Monto a Girar» NO POSITIVO se arma y se simula, pero NO se cursa | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | 108 |
| 14 | Reevaluación explícita | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | **sin gate** (revisión) |
| 15 | Solicitud de línea | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | **sin gate** (revisión) |
| 15-bis | La solicitud se genera SOLA al cerrar la oferta | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | 106–107 |
| 15-bis-bis | La solicitud inyectada al cerrar la oferta tiene que CRUZAR de pestaña | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | **sin gate** (revisión) |
| 15-bis-ter | Y lo que el detalle escribe en un REPOSITORIO también tiene que cruzar | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | 113 |
| 15-quater | La solicitud al comité se ABRE y muestra sus líneas de detalle | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | 109 |
| 15-quinquies | El DOCUMENTO de la solicitud: qué terminó inyectando el sistema | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | **sin gate** (revisión) |
| 15-ter | El wizard de presentación al comité pide DOS secciones y muestra UN documento | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | 107 |
| 15-quater-bis | El paso de DEUDORES del wizard se rediseñó | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | **sin gate** (revisión) |
| 16 | Churn de cartera | [`reglas/prospeccion_cartera_y_churn.md`](./reglas/prospeccion_cartera_y_churn.md) | 99 |
| 18 | Áreas, roles y usuarios: TRES pantallas de Configuración, todo por TENANT. | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | ~33–37, ~42 |
| 19 | Vacaciones y reemplazos | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | ~60–64 |
| 20 | Pricing y simulación: los conceptos, sus variables y sus fórmulas son CONFIGURACIÓN DEL TENANT | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | 65, ~66–68 |
| 21 | El prorrateo a nivel de FACTURA | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | 65, ~70–75 |
| 22 | Asignación de giros | [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | 81, 83–84, ~78–80, ~82 |
| 23 | Publicar la oferta: se decide en el modal de curse, y deja evidencia | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | ~85 |
| 26 | Después de la firma: Otorgamiento/Verificación → Pendiente Integración → Pendiente de Giro | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | 88 |
| 27 | Monto mínimo de línea aprobada: $10.000.000, y la PUNTUAL exenta | [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | 102 |
| 27-bis | Los rótulos del menú: «Gestión diaria» y «Reportes» | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | **sin gate** (revisión) |
| 28 | El NOMBRE y el COLOR de cada etapa son configuración del TENANT | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | 110–111 |
| 29 | En el DETALLE, los montos de DOCUMENTO van en pesos; el `M$` queda para los resúmenes | [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | **sin gate** (revisión) |
| 30 | El menú «Acciones» del detalle no cierra la oferta ni avanza de etapa | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | **sin gate** (revisión) |
| 30-ter | El contrato físico se carga en la tarjeta de O05, y solicitar no cierra la puerta | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | 114 |
| 24 | El GATE de inyección al core: el paquete girado es el que se autorizó | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | ~86 |
| 25 | Rotación de personas: qué ve cada uno y a quién se le atribuye lo hecho | [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | 91, ~87 |
| 30-bis | El ORDEN de la lista de oportunidades: avance primero, plata después | [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | 112 |
| 31 | MODO DIRECTORIO — demo acotada | [`reglas/modo_directorio.md`](./reglas/modo_directorio.md) | **sin gate** (revisión) |
| 17 | Teléfonos ofuscados en logs | [`contrato_servidor_y_auditoria.md`](./contrato_servidor_y_auditoria.md) | **sin gate** (revisión) |

## Contrato con el servidor (12 invariantes, `INVARIANTES` en el fuente)

> Autoridad `servidor` = la decisión es del backend y lo de acá es anticipación; **esto no es un control de seguridad** (el atacante ES el cliente). Detalle: [`contrato_servidor_y_auditoria.md`](./contrato_servidor_y_auditoria.md). Cobertura = menciones del código en la suite; **8 de 12 no tienen gate**.

| Código | Nombre | Regla | Autoridad | En la suite |
|---|---|---|---|---|
| TEN-01 | Aislamiento por tenant | Toda mutación usa el tenant fijado al abrir la sesión; si el tenant activo cambió sin re-autenticar, se rechaza. | servidor | **sin gate** |
| RAT-01 | Límite de tasa por usuario | Máximo de mutaciones por minuto y por (usuario, colección). | servidor | **sin gate** |
| IDM-01 | Idempotencia de la mutación | La misma mutación no se aplica dos veces. Acá sólo se CUENTAN los duplicados: la idempotencia real necesita una clave generada por el cliente, que este código todavía no emite. | servidor | **sin gate** |
| LIN-01 | La operación no supera la línea disponible | El monto de la operación tiene que caber en la línea disponible del cliente al momento de armarla. | servidor | **sin gate** |
| OTG-01 | Sólo aprueba quien tiene atribución | La excepción la resuelve un apoderado con atribución en el área y nivel que la regla exige. | servidor | **sin gate** |
| OTG-02 | No avanza a Cesión con excepciones pendientes | Con excepciones o rechazos re-evaluables sin resolver, la operación no puede pasar a Cesión. | servidor | 1 mención(es) |
| VER-01 | No cursa con verificación pendiente | Todas las facturas de la operación tienen que tener su verificación telefónica completa. | servidor | 2 mención(es) |
| GIR-01 | No gira sin pasar por Cesión | El desembolso exige que la operación haya pasado por Cesión (documentos cedidos a Security). | servidor | **sin gate** |
| GIR-02 | El paquete girado es el que se autorizó | El desembolso exige una evidencia de contrato de cesión (O05) cuya huella calce con la operación que se inyecta. | servidor | 2 mención(es) |
| ATR-01 | Descuento dentro de la atribución | El descuento aplicado no puede exceder la atribución del rol sin autorización de la jefatura correspondiente. | servidor | **sin gate** |
| CRY-01 | El hash del OTP no sale del servidor | El OTP se guarda como SHA-256 con sal por emisión; el hash nunca viaja al cliente ni a otra página. La validación ocurre server-side, con límite de intentos y TTL. | servidor | **sin gate** |
| PRI-01 | La prioridad de curse la pide una jefatura | Marcar una oportunidad como prioritaria es una instrucción de jefatura, no del ejecutivo dueño del negocio. | servidor | **sin gate** |
## Gates de contrato (`tests/contract/`, desde el 17-09-2026)

> `node --test "tests/contract/*.test.mjs"` — paso 4 de la verificación, ~8 s, sin navegador ni dependencias. Cada archivo
> exporta su lógica y trae una **sonda negativa** (planta la violación y comprueba que el gate la caza). Dos clases: un
> **snapshot** es un literal que se actualiza a propósito (y se dice en el commit); una **regla** no se actualiza nunca.
> Cómo agregar un gate o un caso: `.claude/rules/testing.md`.

| Archivo | Qué fija | Clase |
|---|---|---|
| `vault.test.mjs` | Frontmatter OKF en todo documento del vault, `type` del vocabulario, `timestamp` ISO, tablero ≤80 líneas, `CLAUDE.md` ≤150, y que sólo el tablero afirme la fase | regla |
| `invariantes.test.mjs` | Este índice ↔ los archivos de reglas (cada fila apunta a una regla que existe a columna 0; cada regla tiene su fila; ninguna en dos archivos) · cada caso citado existe en la suite · los 12 códigos del contrato son los de `INVARIANTES` en el fuente · cada `regla N` que cita el `.jsx` sigue existiendo | regla |
| `fuente.test.mjs` | Sin símbolos duplicados de nivel módulo (paso 2) · el fuente no monta la app (termina en el `}` de `PipelineComercial`, sin `definirWebComponent(` a columna 0) · toda clase propia del `<style>` usada está declarada y viceversa (el caso `t14`) · `stageName` es de nivel módulo · `vendorOrden` idéntico en `build_app.mjs` y `build_app.ps1` y cada archivo existe en `vendor/` | regla |
| `suite.test.mjs` | Cada número de caso tiene un solo título y van consecutivos desde 1 · la suite declara `CASOS_ESPERADOS` casos | regla · **snapshot** (`CASOS_ESPERADOS`) |
| `auditores.test.mjs` | `auditar_muerto`: los hallazgos y los `useState` sin uso son exactamente los conocidos (`BASE_MUERTOS`, `BASE_USESTATE`), y las clases del `<style>` dan «ninguna» en los dos sentidos · `auditar_aislamiento`: las funciones puras (`BASE_PURAS`, 39) siguen puras — lo que se desacopló no se vuelve a acoplar | **snapshot** · regla |
| `hooks.test.mjs` | La lógica de los tres hooks (`protect_paths`, `gitflow_guard` con integración = `main`, `worktree_guard`) y una corrida de punta a punta por stdin | regla |
| `tests/e2e/*.e2e.mjs` (paso 6, `node tests/e2e/correr.mjs`) | Las reglas de PANTALLA, con la sesión iniciada y el detalle abierto en su pestaña: un caso por regla, citado en la tabla de arriba como `e2e-<regla>`; `00_sesion` es el humo del harness | regla |

Lo que **no** es gate y por qué: `regresion_diferencial.mjs` compara dos builds y el CI no tiene el anterior (se corre a
mano); la suite entera es el paso 5, no un gate de contrato; y los datos —RUT sintéticos, razones sociales reales— son
una decisión pendiente del usuario (tablero), así que ningún test la afirma ni la niega todavía.
