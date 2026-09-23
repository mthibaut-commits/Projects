# Levantamiento de Activos de Información — NEX Factoring · Pipeline Comercial

**Fecha:** 04-08-2026 · **Alcance:** todos los activos de información (APIs, archivos batch, streams, catálogos y canales) que el sistema necesita para operar, según lo modelado en la aplicación. Para cada activo: tipo, dirección, frecuencia, contenido y módulos que lo consumen.

---

## 1. Resumen ejecutivo

| # | Activo | Tipo | Dirección | Frecuencia |
|---|---|---|---|---|
| A1 | DTESync — facturas electrónicas | Stream / API | Entrada | Continua (corridas por cron horario) |
| A2 | AECSync — cesiones electrónicas | Stream / API | Entrada | Continua |
| A3 | Lista Blanca de deudores | **Archivo vía S3 → tabla interna** | Entrada | **Diaria (batch)** |
| A4 | Deudores Autorizados | **Archivo vía S3 → tabla interna** | Entrada | **Diaria (batch)** |
| A5 | Share of Wallet por cliente | Dataset (JSON) | Entrada | Semanal / mensual |
| A6 | Estrategia de precio | Dataset (JSON) | Entrada | Diaria |
| A7 | Líneas de crédito vigentes | **Archivo CSV vía S3** | Entrada | **Diaria (batch)** |
| A8 | Montos de líneas (uso/disponible) | API REST | Entrada | **Cada 1 hora** |
| A23 | Consulta de líneas 3 niveles (cliente / cliente-deudor / deudor) | API REST | Entrada | Bajo demanda (1 por evaluación) |
| A9 | API Riesgo Crédito BICE (swagger) | API REST (9 endpoints) | Entrada | Bajo demanda |
| A10 | Datos de verificación (predictor V01–V10) | **Archivo vía S3 → tabla interna** | Entrada | **Diaria (batch)** |
| A11 | Plataforma 360 — empresa | **Archivo vía S3 → tabla interna** | Entrada | **Diaria (batch)** |
| A12 | Repositorio documental factoring (API 5) | API REST | Entrada | Bajo demanda |
| A13 | Inyección de solicitud de línea (API 1) | API REST | **Salida** | Por evento |
| A14 | Listar procesos de línea (API 2) | API REST | Entrada | Bajo demanda |
| A15 | Estado de proceso de línea (API 3) | API REST | Entrada | Bajo demanda |
| A16 | Datos de otorgamiento (modelo C/D/O + variables) | **Archivo vía S3 → tabla interna** | Entrada | **Diaria (batch)** |
| A22 | Endpoint de actualización intradía (Security) | API REST (push de Security) | Entrada (por evento) | Intradía, cuando varían registros |
| A25 | Ingesta por AWS S3 — transporte de las entregas diarias | S3 + notificación (SNS → SQS) | Entrada (por evento) | Al depositarse cada archivo |
| A17 | WhatsApp Business (Agente IA) | API de mensajería | Bidireccional | Tiempo real |
| A18 | Email / Call Center | Canales | Bidireccional | Tiempo real |
| A19 | Portal de curse (factoringsecurity.cl/curse) | Aplicación externa | Salida (evento de firma) | Por evento |
| A20 | Carga de facturas XML / Excel (wizard) | Archivos (XML DTE, XLSX) | Entrada | Manual |
| A21 | Auditoría / bitácora | Log interno | Salida | Continua |

---

## 2. Detalle por activo

### A1 · DTESync — feed de facturas electrónicas (DTE)
- **Tipo:** stream/API de documentos tributarios electrónicos emitidos (tipo 33/34/46), identificados por folio.
- **Contenido:** RUT emisor (cedente), razón social, RUT/razón social receptor (deudor), folio, tipo DTE, monto total, enlaces XML/PDF, y en `EstadoDTE` las **banderas del receptor**: reclamo (`Reclamado`, `FchReclamo`), nota de crédito (`NotaCredito`, `FolioNotaCredito`, `FchNotaCredito`) y **acuse de recibo** (`Aceptado`, `FchAcuseRecibo`), más `FchRecepcion` (la fecha del batch).
- **El acuse del receptor (23-09-2026, regla 69, M-01).** `Aceptado` trae el código del acuse (el activo trae «2») con su `FchAcuseRecibo`; sin acuse ni reclamo el documento está «sin acuse», que es lo normal en sus primeros 8 días desde la emisión. Medido: 21.974 aceptadas, 2.088 reclamadas y 5.938 sin acuse de 30.000 (4.637 de ellas emitidas en los 8 días anteriores al batch). `facturaDeDTE` lo lee (`acuse`, `acuseCodigo`, `fchAcuse`, `fchRecepcion`), la fila del documento lo muestra y **no es criterio de candidatura**: sólo el reclamo y la NC excluyen.
- **Es un FLUJO DE EVENTOS por documento (23-09-2026, ADR-0020, regla 70).** El activo es el log de notificaciones del servicio, en orden de llegada: una fila por evento, con `Secuencia` (1..n por documento) y `FchNotificacion`. La **creación** (`DTE_SINCRONIZADO`, secuencia 1) trae el documento entero y `EstadoDTE` sin banderas; cada cambio de estado llega después como **`DTE_ACTUALIZADO`** con la identidad (`RUTEmisor`, `TipoDTE`, `Folio`), el envoltorio y el `EstadoDTE` **acumulado** a esa fecha —no repite el documento—. Hoy: **30.000 documentos en 55.549 eventos** (21.974 acuses · 2.088 reclamos · 1.487 notas de crédito), del 06-05 al 23-06. El documento es el **pliegue** de sus eventos (`documentosDTE()` en la aplicación, `plegar` en el generador: el mismo, gateado); el stream recorre el log y el inbound aplica cada actualización donde el documento vive. Sobre una oferta cerrada, publicada o firmada, una NC, un reclamo o una cesión a otro **inhabilitan el documento y dejan la operación no cursable** (ADR-0021, regla 71): el veto de la regla 67 lo escribe el SII y el ejecutivo retira, re-evalúa y vuelve a firmar. Contrato: esquema 2 en `CONTRATOS_DATOS`.
- **Consumen:** Bandeja Inbound (motor de reglas de prospección), creación automática de oportunidades, itemización de facturas de la oferta, y **el LIBRO DE VENTAS del cliente** — lo que el ejecutivo ve en «Deudores disponibles» y en «otras facturas de este deudor», y el asistente de alta manual. En producción es `query libroVentas(rutCedente)` sobre los DTE del SII.
- **Regla operacional:** las facturas que califican una regla se acumulan y pasan a Prospección en la corrida horaria (cron).
- **Hueco del layout — `MntNotaCredito` (14-09-2026).** `EstadoDTE` declara `NotaCredito` y `FolioNotaCredito` pero **no el monto** de la nota, así que no se puede distinguir la que ANULA el documento de la que sólo lo rebaja. La aplicación inventaba esa diferencia —«20% a 49% del monto», por hash del folio— y agregaba la factura a la oferta por el neto resultante: una cifra sin origen entrando al monto a girar. Mientras el activo no informe el monto, un documento con nota de crédito **no se compra**, que es la lectura conservadora. Para habilitar la compra por el neto hay que agregar `MntNotaCredito` a la entrega.

### A2 · AECSync — cesiones electrónicas ⭐ SERVICIO DATAMART
- **Tipo:** **servicio de Datamart** (`AECSync`), stream / notificación push. Documentación: <https://docs.datamart.cl/#tag/AEC-Sync>. Contrato campo por campo en **`Integraciones/spec_aecsync.md`**, con un ejemplo del payload en `Integraciones/aecsync_notificacion.json`.
- **Contenido:** **todas** las cesiones de un cliente —**bancarias y no bancarias**— identificando en cada una al **cesionario**: qué documento cedió, a quién, cuándo y por cuánto.
- **Lo que SÓLO este activo contesta:** quiénes son las contrapartes de financiamiento del cliente. Ningún otro lo sabe: el A11 es de empresa, y **A5 se deriva de acá** desde el 15-09-2026. De este activo salen el **mix de financiamiento** que alimenta la columna SOW y la **participación** entera del A5 (ver §5.6).
- **Es el REGISTRO COMPLETO, no una muestra** (15-09-2026): **7.480 cesiones**, una fracción real del pool cedible de cada cliente. Traía 1.300 mientras el A5 declaraba 9.104 en sus series — el analítico afirmaba siete veces más operaciones de las que el registro contenía.
- **Consumen:** detección de pérdida por competencia (`cesion_externa`), SOW estimado "mi competencia en este cliente", benchmark de deudores, y el bloqueo **«cedida a terceros»** de una factura candidata (join por `RUTCedente` + `Folio`).
- **Reconciliación con A1 — CERRADA el 14-09-2026.** El A2 traía folios propios: de **1.300 cesiones sólo 3** referenciaban un folio que A1 declara para ese mismo cedente, y **1.267 tenían fecha anterior a la emisión** del documento que decían ceder. Una cesión sin documento no se puede atribuir a nada, así que todo lo que cuelga de ella se inventaba en el pipeline (el bloqueo «cedida a terceros», la pérdida ante la competencia, el conteo de facturas cedidas). Se arregló **en el generador** —`GeneradorDatos/datasets/cesiones.js`, el A2 pasó de base a derivado—: cada cesión apunta a un documento real de su cedente y copia sus campos del A1. Hoy **1.300 de 1.300** reconcilian, ninguna es anterior a su emisión, ningún folio se cede dos veces y ninguna cae sobre un documento no cedible (contado, con nota de crédito o reclamado). Se arregló ahí y no en la aplicación a propósito: si el pipeline «resolviera» la discrepancia, volvería a inventar el dato.
- **Invariantes del activo** (se validan en el generador; una cesión que los rompa no se emite): la **fecha de cesión no es anterior a la emisión** del documento, y el **monto cedido es igual o menor** que el del documento. La **cesión parcial** es válida —se cede parte del crédito y el resto queda con el cliente— y hoy son 160 de 1.300; ceder más que la factura no lo es. `MontoDocumento` es siempre el `MntTotal` del A1.
- **Consume además:** el bloqueo de una factura candidata —**«Cedida a terceros»** con el nombre del factoring y la fecha, o **«Ya financiada»** si la cesión fue a nosotros—, la **pérdida por cesión** de una oportunidad (sus propias facturas cedidas, no un sorteo) y el conteo `cedidasOtro`.

### A3 · Lista Blanca de deudores ⭐ BATCH S3 → tabla interna
- **Tipo:** **archivo diario vía S3** (mismo patrón que A10/A11/A16); monta la sección de listas de la tabla interna. Se entrega junto con A4 en un archivo único con columna `LISTA` (BLANCA | AUTORIZADA) — ver `Integraciones/s3_deudores_listas.csv`.
- **Contenido:** deudores de mejor calidad (whitelist) por RUT/razón social, con vigencia y cupo sugerido.
- **Consumen:** clasificación de deudor, reglas de prospección CAT, elegibilidad de facturas del inbound, segmento Elite del predictor de verificación (clasificación Prime).

### A4 · Deudores Autorizados ⭐ BATCH S3 → tabla interna
- **Tipo:** **archivo diario vía S3**, misma entrega que A3 (columna `LISTA` = AUTORIZADA).
- **Contenido:** deudores autorizados (segunda categoría de "buenos deudores").
- **Consumen:** ídem A3.

### A5 · Share of Wallet (`SHARE_OF_WALLET`) — **DERIVADO de A2**
- **Tipo:** dataset JSON por RUT de cliente. **Se calcula sobre A2 · AECSync**, no se entrega por separado (15-09-2026, ver §5.6): la participación, la serie semanal con sus montos, la tendencia, el gap, el estado y el diagnóstico se **miden** sobre las cesiones. Los dos activos respondían la misma pregunta por caminos independientes y discrepaban 13,8 pto en la mediana; hoy calzan dentro del redondeo en 233 de 233 clientes.
- **Contenido:** SOW actual/target, tendencia, histórico mensual/semanal, gap.
- **Lo único que NO se mide es `SOWTargetPct`**, que es una **meta comercial**: derivarla de las cesiones haría que el objetivo fuera siempre igual al resultado y el gap no existiría nunca, que es lo único que esa cifra sirve para decir. Lo mismo el segmento, el horizonte y la frecuencia de actualización. `HistoricoMensual` son 13 meses sobre un registro de 2, así que se **ancla** al SOW medido en vez de medirse — reconstrucción declarada, no medición.
- **Consumen:** chips SOW de oportunidades, estrategia de precio por SOW (spread sugerido), panel SOW del cliente, plan mensual, churn de cartera.

### A6 · Estrategia de precio (`ESTRATEGIA_PRECIO`)
- **Tipo:** dataset JSON indexado por `RUT cliente | Tipo de línea`.
- **Contenido:** spread promocional, puntos de descuento por cliente-línea.
- **Consumen:** tasa inicial de oportunidades inbound. *(Nota: el modelo de spread por SOW implementado ahora deriva el descuento internamente; este dataset queda como fuente histórica/de contraste.)*

### A7 · Líneas de crédito vigentes — CSV vía S3 ⭐ BATCH
- **Tipo:** **archivo plano CSV** depositado en **S3** (A25).
- **Frecuencia:** **carga diaria** (batch, ~06:15).
- **Contenido:** cliente, RUT, línea aprobada, uso, disponible, proyección, morosidad, ejecutivo, zona.
- **Consumen:** tab Líneas (sub-tab Vigentes), recomendador de línea (aumentar/rebajar/bloquear/renovar), indicadores de línea en oportunidades y plan mensual.

### A8 · Montos de líneas — API de actualización
- **Tipo:** API REST.
- **Frecuencia:** **cada 1 hora** refresca uso/disponible de las líneas cargadas por A7.
- **Consumen:** tab Líneas (montos), proyección post-curse.

### A23 · Consulta de líneas en 3 niveles — API de disponibilidad ⭐ EVALUACIÓN
- **Tipo:** API REST (`POST /consulta`, swagger `Integraciones/swagger_consulta_lineas.yaml`).
- **Frecuencia:** bajo demanda, **una sola llamada por evaluación** con todos los RUT deudores de la operación (no una por deudor: el motor reevalúa la operación completa y N llamadas dan N snapshots distintos).
- **Devuelve** los tres niveles que compara la regla de validación —línea del **cliente** (comodines LF1/LF4), línea **cliente-deudor** (LF2/LF3) y línea del **deudor** (exposición global compartida entre carteras)— cada uno con **aprobada, utilizada, reservada y disponible**, donde `disponible = aprobada − utilizada − reservada`.
- **La reserva no es de NEX:** la crea el sistema de gestión de líneas cuando el cliente acepta y el core la commitea al aprobar Operaciones, convirtiéndola en utilizada. Acá sólo se lee.
- **Diferencia con A7/A8:** A7 (batch diario) da la estructura y A8 (horario) refresca montos, ambos por cliente y sin nivel deudor ni reservado; alimentan la vista «Líneas», que es fotografía de cartera. A23 alimenta la **decisión de cursar**, que exige dato fresco, el reservado y la exposición global del deudor.
- **Consumen:** motor de asignación de líneas, armado de la oferta, modal de confirmación de curse.
- **Activo en la demo (20-09-2026, regla 44):** dos bloques de `datos_inyectados.js` que produce `GeneradorDatos/datasets/lineas_par.js` — **`LINEA_CUPO`** (4.136 filas: una cabecera `CLIENTE` por cliente con su estado A/B/S, más una fila por objeto de línea LF1/LF2/LF3/LF4) y **`LINEA_DEUDOR`** (741 filas, nivel 3). Hasta esa fecha A23 **no tenía activo** y el pipeline fabricaba los 3.636 objetos de línea partiendo del A7/A8 —justo lo que §5.4 prohíbe—. El `reservado` sigue sin modelarse: no es de NEX (regla 12) y la demo no tiene el sistema que lo lleva, así que `MontoDisponible = MontoAprobado − MontoUtilizado`.

### A9 · API Riesgo Crédito BICE (swagger `riesgo-credito/v1`)
- **Tipo:** API REST — 9 endpoints: clasificación deudora, consolidado, deuda BICE, boletín comercial, deuda previsional, protestos, tipo de cambio (UF/USD), mora ACHEF, mora CMF.
- **Consumen:** Paso "Datos Financieros y Riesgo" de la presentación al comité (deuda directa/indirecta, moras, protestos, ACHEF), análisis financiero IA.

### A10 · Datos de verificación — predictor V01–V10 ⭐ BATCH S3 → tabla interna
- **Tipo:** **archivo diario vía S3** desde Security; con él se monta una **tabla interna** que es la que consulta la aplicación (no se consulta a Security en línea).
- **Contenido:** variables del predictor por par cliente-deudor (3M): V01 protocolo propio del deudor (es **compuerta**: si existe, se verifica siempre con él) · V02 % pagado Ult3M · V03 monto vs total comprado al par · V04 monto vs relación comercial · V05 recurrencia Ult6M · V06 **plazo promedio de pago** del par, contra el que NEX mide la desviación de cada factura (≤ 5% del plazo, no 5 días) · V07 % mora >25d (degradable intramés) · V08 % reclamadas (degradable intramés) · V10 historial de pago relevante; más la clasificación y la nota. **V09 (alto monto, >MM$300) no viaja**: se evalúa en NEX sobre el total de la operación con ese deudor. El **segmento lo decide NEX**, no el archivo: protocolo recortado si el deudor es PRIME **o** su nota supera 4,2 (los nombres «Elite/Others» son de la versión anterior del predictor).
- **Actualización intradía:** vía **A22** (endpoint de Security que actualiza la tabla interna).
- **Consumen:** tab Verificación de la operación (VERIFICADA POR MODELO / VERIFICACIÓN TELEFÓNICA por factura), chip "Requiere Verificación N/M" de la card. El botón "Refrescar" relee la tabla interna; la verificación telefónica registrada no se pierde.

### A11 · Plataforma 360 — información de empresa ⭐ BATCH S3 → tabla interna
- **Tipo:** **archivo diario vía S3** desde Plataforma 360; monta una **tabla interna** que consulta la aplicación (mismo patrón que A10/A16 — la información es de la misma familia que la requerida por otorgamiento y verificación, y comparten buena parte de las variables).
- **Contenido:** firmográfica (actividad, sector, trabajadores, fechas, alertas), información comercial (línea global, márgenes, colocación, spread real, segmento), el **mix de financiamiento del cliente** (`SOW_*`, ver abajo), socios (participación, PEP, FATCA), índices financieros, ventas y ventas SII — por RUT de empresa (clientes y deudores).
- **Mix de financiamiento (`SOW_SECURITY_PCT` / `SOW_FACTORING_TARGET_PCT` / `SOW_OTROS_FACTORING_PCT` / `SOW_OTROS_BANCARIOS_PCT`):** con quién se financia el cliente y en qué proporción; las cuatro porciones **suman 100** y sólo vienen para `ROL=CLIENTE` (en un deudor van vacías, no en 0). Alimenta la columna **SOW** del tubo comercial en versión tabla. Vive acá porque el mix es atributo de la **empresa** y éste es su maestro, pero **se mide sobre A2** —el único activo que identifica al cesionario de cada cesión— y se inyecta acá (ver §5.6). No duplica al A5 ni lo contradice: `SOW_SECURITY_PCT` se **ancla** a su `SOWActualPct`, y desde el 15-09-2026 A5 se deriva de A2, así que las dos entregas cuentan lo mismo una sola vez. **Los cuatro agregados se publican con el padrón de cesionarios por defecto**; lo que manda es `SOW_DETALLE_JSON` —el reparto cesionario por cesionario— porque una de las cuatro porciones, el **factoring target**, es política comercial del **tenant** y se configura en la aplicación.
- **Actualización intradía:** cubierta por el mismo esquema del endpoint **A22** si el origen actualiza registros dentro del día.
- **Consumen:** presentación al comité (pasos 1, 2 y 4 — al agregar cada deudor se lee su registro de la tabla interna), generación IA de las 5 notas comerciales.
- **Nota de consolidación:** por el solapamiento de variables con A10/A16, evaluar consolidar los tres en **una misma entrega** (un paquete diario con secciones empresa / otorgamiento / verificación) para simplificar la operación del batch.

### A24 · Cartera comercial — estructura y asignación ⭐ BATCH S3 → tabla interna

- **Tipo:** **archivo diario vía S3** (mismo patrón que A10/A11/A16). `Integraciones/s3_cartera.csv` + `spec_s3_cartera.md`.
- **Contenido:** dos granos con columna `TIPO`. **`EJECUTIVO`**: código, nombre, correo, **equipo**, **jefatura** (`COD_JEFE`), **zona**, sucursal, estado y vigencia. **`CARTERA`**: qué RUT cliente pertenece a qué ejecutivo y desde cuándo.
- **Actualización intradía:** vía **A22** (dominio `CARTERA`) — un ejecutivo que entra o una cartera que se traspasa no esperan al batch del día siguiente.
- **Consumen:** quién ve qué en el tubo y en Tareas (`execsVisiblesDe`), la atribución de una oportunidad a su ejecutivo (`asignarEjecutivo`), el Plan por Ejecutivo, el churn, los filtros por zona y equipo, y el mantenedor de migración de cartera.
- **Por qué es un activo y no código:** ni la estructura ni la asignación las produce el pipeline — son de RRHH y de la administración comercial, y cambian todos los días. Vivían en cuatro constantes del bundle, un mapa de jefaturas escrito a mano, y la asignación **dentro del A5** en un campo `Ejecutivo` llaveado por **nombre**: renombrar a una persona dejaba a toda su cartera sin dueño, en silencio.
- **Integridad:** los dos granos viajan juntos y se validan como una **unidad**. Una fila `CARTERA` que apunta a un código que el archivo no declara no se carga: aceptarla deja operaciones colgando de alguien que no existe.
- **El archivo mueve EMPRESAS, no OPERACIONES.** `deal.exec` queda congelado en el JSON de la oportunidad; traspasar los negocios en curso es un acto administrativo con bitácora (`Configuración › Oportunidades › Migración`), y sólo hasta antes del giro.

### A12 · Repositorio documental factoring (API 5)
- **Tipo:** API REST de documentos.
- **Contenido:** documentos por empresa (Riesgo/Legal/Comercial): contrato marco, mandato/pagaré, informe de poderes, compliance tracker, y los recuperados por Datamart (carpeta tributaria, certificado deuda Tesorería y convenios) — con versión, fechas de emisión/vencimiento.
- **Consumen:** sección Documentos Adjuntos de la presentación al comité.

### A13 · API de Inyección de solicitud de línea (API 1) — SALIDA
- **Tipo:** API REST hacia el sistema externo de gestión de líneas.
- **Payload:** RUT/cliente, tipo (Crear/Renovar/Modificar) y subtipo (agregar crédito, modificar vencimiento, agregar/regularizar deudores, rebajar línea, ratificar exceso), montos propuestos (global/factoring/confirming), vencimiento, deudores (con notas, políticas 25/30%, flags V-N-C-FR-CP, productos), garantías y fianzas, las 5 notas comerciales. Devuelve `idProceso`.
- **Regla:** el sistema **solo inyecta**; la resolución ocurre en el sistema externo.

### A14 / A15 · Listar procesos (API 2) y Estado de proceso (API 3)
- **Tipo:** API REST de consulta al sistema externo.
- **Consumen:** sub-tab "En proceso" (Bandeja) del tab Líneas: lista de solicitudes en gestión y su estado (En gestión → En análisis de Riesgo → En comité → Aprobada/Observada).

### A16 · Datos de otorgamiento — Modelo de Riesgo v1.0 ⭐ BATCH S3 → tabla interna
- **Tipo:** **archivo diario vía S3** desde Security; con él se monta una **tabla interna** que la aplicación consulta para evaluar el catálogo C01–C52 (cliente), D01–D23 (deudor) y O01–O04 (operación).
- **Contenido:** variables por RUT cliente/deudor y por par C-D — pagarés (existencia, montos, vigencia), línea (aprobada, extendida, cupo), IVA al día, variación de venta, nota de comportamiento (cliente y deudor, umbral 3,7), moras CMF por tramo (directa 30-90/90-180/180d-3A, castigada, indirecta, leasing), Equifax/DICOM (mora, protestos), ACHEF por tramo, infracciones laborales, TGR (vigente, morosa, cobranza adm./judicial, convenios, cuotas impagas — judicial/convenios = bloqueo firme), mora interna por tramo, concentración, venta cruzada, NC, reclamos, ratio cesión/venta, n° factorings, socios comunes C-D, gestión de cartera del cliente (reclamados, notas de crédito, mora, CxC pendientes) y **la misma gestión de cartera medida sobre el par C-D** (columnas `*_CD`, que evalúan C47–C50 una vez por deudor), y variables de operación (spread/banda, comisiones, CxC, bloqueo).
- **Evaluación local:** el motor evalúa los tramos y niveles (**N1..N5, N5 = máxima**, sin homologar: el nivel es configuración de la regla — INC-01) **contra la tabla interna**, con el versionado v1/v2 de re-evaluación al obtener el contrato firmado. El ruteo de cada excepción es el par **(área declarada por la regla, nivel declarado por el tramo)** — INC-03.
- **Actualización intradía:** vía **A22** — si dentro del día varían los registros de otorgamiento, Security actualiza la tabla y el sistema accede a la información fresca.
- **Consumen:** tab Otorgamiento, gate de avance a Giro, pérdida automática por bloqueo firme, badge "Requiere otorgamiento".

### A25 · Ingesta por AWS S3 — el transporte de las entregas ⭐ EVENTO

- **Tipo:** bucket S3 con notificación `s3:ObjectCreated:*` → **SNS** → **SQS** → worker del backoffice. `Integraciones/spec_s3_ingesta.md` + `Integraciones/s3_evento_notificacion.json`.
- **Qué resuelve:** que el procesamiento arranque **cuando el archivo llega** y no cuando el reloj lo permite. Un cron a hora fija deja esperando hasta la corrida siguiente a la entrega que sale tarde, y no distingue «no llegó» de «no había novedades».
- **Alcance:** las **seis entregas diarias** (A24, A3+A4, A11, A16, A10, A7). No aplica a **A2** —que es un stream— ni a los upserts intradía de **A22**, que son correcciones puntuales y no un archivo.
- **Lo que el consumidor debe garantizar:** idempotencia por `(bucket, key, versionId)` —la entrega es **al-menos-una-vez**—, resolver el orden por el nombre del objeto y no por el de llegada, DLQ tras tres intentos, y carga transaccional por entrega.
- **No cambia ningún layout:** este activo describe cómo llega el archivo; qué trae lo sigue declarando el spec de cada entrega.

### A22 · Endpoint de actualización intradía de la tabla interna (Security) — ENTRADA por evento
- **Tipo:** API REST expuesta/consumida para que **Security actualice la tabla interna** montada desde las entregas diarias por S3 de A10 y A16 cuando los registros varían dentro del día.
- **Semántica:** upsert por RUT / par C-D / regla; con timestamp de actualización visible en la UI ("Actualizado hh:mm").
- **Consumen:** re-evaluaciones de otorgamiento y refresco de verificación durante el día, sin esperar el batch siguiente.

### A17 · WhatsApp Business — Agente IA
- **Tipo:** API de mensajería (bidireccional, con estados de entrega).
- **Consumen:** contacto automático de prospección, publicación de ofertas (tras "Cerrar oferta"), detección de interés/aceptación, derivación fuera de atribución. Regla: mensaje **no entregado ⇒ 1 solo intento** y error de contactabilidad.

### A18 · Email / Call Center
- **Tipo:** canales de contacto (templates de email; llamadas con grabación y transcripción).
- **Consumen:** contactabilidad multicanal, historial de comunicaciones.

### A19 · Portal de curse (factoringsecurity.cl/curse)
- **Tipo:** aplicación externa donde el **cliente firma** formalmente.
- **Dirección:** el sistema envía el enlace de cierre; recibe el **evento de aceptación/firma** (única vía para pasar a Aceptada). Nunca por email ni acción del ejecutivo.

### A20 · Carga manual de facturas (wizard Nuevo Negocio)
- **Tipo:** archivos subidos por el ejecutivo: **XML DTE** individuales, o **Excel** de selección masiva (columnas: Rut Emisor · Tipo Doc (33/34/46) · Folio · Monto), o pegado de folios.
- **Consumen:** Paso 3 del wizard de nuevo negocio (Opciones → Cargar XML / Selección masiva).

### A21 · Auditoría / bitácora — SALIDA interna
- **Tipo:** log estructurado (usuario, módulo, acción, glosa, fecha-hora real, éxito).
- **Reglas:** teléfonos ofuscados; timestamps absolutos (nunca relativos); registra navegación, inyecciones, otorgamientos, pérdidas, cierres de oferta.

---

## 3. Matriz activo → módulo

| Módulo | Activos que consume |
|---|---|
| Bandeja Inbound / Prospección | A1, A3, A4, A5, A6 |
| Pipeline / Oportunidades | A1, A2, A5, A16, A17, A18, A19 |
| Simulación / Documentos | A1, A10, A20 |
| Verificación (por documento) | A10, A22 |
| Otorgamiento | A16, A22 |
| Líneas — Vigentes | **A7 (CSV por S3)**, A8 |
| Líneas — Presentación al comité | A9, A11, A12, A13, A14, A15 |
| Panel Clientes / SOW / Sankey | A2, A5 |
| Plan mensual / Plan por ejecutivo | A5, A7 |
| Auditoría | A21 |

## 4. Observaciones para integración

1. **Activos batch por S3 (diarios): seis entregas** — el CSV de líneas (A7), los datos de **verificación** (A10), la **Plataforma 360** (A11), los datos de **otorgamiento** (A16), las **listas de deudores** (A3 Lista Blanca + A4 Autorizados, en un archivo único con columna `LISTA`) y la **cartera comercial** (A24, con columna `TIPO`). Todos montan **tablas internas** que son la única fuente que consulta la aplicación; el endpoint A22 las refresca intradía cuando los registros varían. Por el solapamiento de variables entre A10, A11 y A16, se recomienda evaluar **una entrega SFTP consolidada**. Los catálogos restantes (A5 SOW / A6 estrategia de precio), hoy JSON precargados, son candidatos a sumarse al mismo esquema.
1-bis. **Patrón tabla interna:** la app nunca consulta a Security en línea para otorgamiento/verificación; lee siempre su tabla interna (batch + upserts A22), lo que desacopla disponibilidad y latencia del origen.
2. **A13 es la única escritura hacia sistemas externos** (inyección); todo lo demás hacia afuera son canales de contacto (A17/A18) y el evento de curse (A19).
3. La app hoy **mockea** A9–A15 con servicios deterministas; el contrato de datos de este documento es la referencia para reemplazarlos por las integraciones reales.
4. Puntos de resiliencia sugeridos: reintento/backoff en A8 (refresh horario), cache del último CSV válido en A7, y manejo de error visible en los paneles de recuperación del wizard (ya contemplado en la UX recuperar→aceptar).

## Unidad de los montos

**Todos los montos de todos los activos van en pesos, enteros.** Ningún campo viaja en millones.

Venían en millones varios de ellos —`LINEA_APROBADA_MM` y sus pares en A7/A8, `MontoBICEMM` /
`MontoTotalMM` en la serie semanal de A5, `montoMM` y `compraAnualMM` en el feed de proveedores,
`aprobadaMM` y compañía en el contrato A23— con uno o dos decimales de millón, es decir cuantizados
de a $100.000 o $10.000. Eso no cuadra contra los activos que sí traen el monto exacto (DTESync,
AECSync), y obliga a cada consumidor a reinflar a pesos, que es donde se pierde la plata.

El millón es una abreviatura de **pantalla**. En el dato, la unidad es el peso.

---

## 5. Campos que llegan por más de un activo — quién es el maestro

**Fecha:** 14-09-2026. Escrito junto con el porte de la app a leer los activos (`A9/A10/A11/A16`), que
es lo que dejó a la vista el problema: cuando cada dato tenía que salir de un activo concreto hubo que
elegir de cuál, y varios estaban en más de uno.

Las entregas diarias se levantaron una por una, cada una con el origen que la produce, y por eso
varias traen el **mismo dato** sin que ninguna declare cuál manda. Mientras los valores coincidan no se
nota; el día que difieran —y difieren, porque tienen cortes distintos— el sistema elige por accidente:
gana el activo que se cargó último, o el que consulta la función que preguntó primero. Esta sección
fija el maestro de cada campo compartido y dice qué hacer con las copias.

La regla general: **un campo tiene UN activo maestro, y en los demás es copia de conveniencia** —
existe para que el archivo se pueda leer solo, no para alimentar la tabla interna. La carga escribe el
campo **sólo** desde su maestro y usa la copia nada más que para conciliar.

### 5.1 Mapa de solapamiento

| Campo | A3/A4 listas | A7 líneas | A10 verificación | A11 P360 | A16 otorgamiento | **Maestro** |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Razón social | `RAZON_SOCIAL` (deudor) | `RAZON_SOCIAL` (cliente) | — | `RAZON_SOCIAL` (cualquiera) | — | **A11** |
| Nota de comportamiento | `NOTA_DEUDOR` | — | `NOTA_DEUDOR` | `NOTA_COMPORTAMIENTO` | `NOTA_COMPORTAMIENTO` (fila DEUDOR) | **A11** |
| Clasificación del deudor | `CLASIFICACION` | — | `CLASIFICACION` | — | — | **A3/A4** |
| Segmento | — | — | `SEGMENTO` | `SEGMENTO` · `SUB_SEGMENTO` | — | *colisión, ver 5.3* |
| Línea aprobada | — | `LINEA_APROBADA_MM` | — | — | `LINEA_APROBADA_MM` | **A23** *(ver 5.4)* |
| Ejecutivo / zona / jefatura | — | `EJECUTIVO` · `ZONA` | — | — | — | **A24** *(levantado el 14-09, ver 5.5)* |
| Participación / mix de financiamiento | — | — | — | `SOW_*` (4 porciones) | — | **A2** — lo mide; **A5** y **A11** lo publican, derivados de él (ver 5.6) |
| Datos del documento cedido | — | — | — | — | — | **A1** — el A2 copia `TipoDTE`, `Folio`, `FechaEmisionDTE`, `MontoDocumento`, `RUTEmisor`, `RUTReceptor`, `FechaVencimientoCesion` para que una cesión se lea sola; si discrepan manda el A1 |
| Fecha de corte | `FECHA_CORTE` | `FECHA_CORTE` | `FECHA_CORTE` | `FECHA_CORTE` | `FECHA_CORTE` | *propia de cada uno* |

`FECHA_CORTE` es la excepción deliberada: **no** es un campo duplicado sino el sello de cada entrega, y
tiene que ser distinta por activo. Es además el dato con que se detecta el desfase que esta sección
previene, así que conviene exponerla en la UI de cada pantalla que mezcle activos.

### 5.2 Razón social — maestro **A11 · Plataforma 360**

A11 es la única entrega cuyo **sujeto es la empresa**: llega por `RUT` con `ROL` (cliente / deudor /
ambos) y trae actividad, sector, trabajadores y fechas. A3/A4 y A7 llevan la razón social porque sus
filas se leen por RUT y sin el nombre son ilegibles en una revisión manual.

Al cargar: escribir el nombre **sólo** desde A11. Si la copia de A3/A4 o A7 difiere, **no** corregir el
maestro — registrar la discrepancia, porque casi siempre significa que un RUT cambió de razón social y
un origen todavía no lo recogió. Un deudor que aparece con dos nombres en dos pantallas es el síntoma
que el cliente reporta como «el sistema está mal».

### 5.3 Segmento — no es un duplicado, es una **colisión de nombre**

Las dos columnas se llaman igual y son cosas distintas:

- **A11 `SEGMENTO` / `SUB_SEGMENTO` / `QUINTIL`** — la segmentación **comercial del CLIENTE**, la que
  usa la presentación al comité y el margen. Sujeto: el RUT cliente.
- **A10 `SEGMENTO`** — el segmento del **PAR cliente-deudor** para el predictor de verificación
  (PRIME / OTROS). Sujeto: el par.

Además, el propio contrato de A10 dice que **el segmento lo decide NEX, no el archivo**: se calcula como
`prime || nota > 4,2` sobre datos que ya viajan en la misma fila. O sea que la columna de A10 es
**informativa y no debe consumirse** — si se consumiera, un archivo con el criterio viejo («Elite /
Others») volvería a meter una regla retirada por la puerta de atrás.

**Acción:** renombrar la columna de A10 a `SEGMENTO_ORIGEN` en la próxima versión del layout y dejar
escrito que NEX la ignora; A11 conserva `SEGMENTO` a secas. Mientras no se renombre, la carga **no**
debe escribirla en la tabla interna.

### 5.4 Nota, clasificación y línea — tres campos, tres razones distintas

- **Nota de comportamiento: maestro A11.** Viaja en cuatro entregas (A3/A4, A10, A11, A16) porque las
  cuatro la necesitan para su propio cálculo. Manda **A11** porque la nota es un atributo de la
  **EMPRESA** —no de su cartera, no de un par cliente-deudor, no de la lista en que esté—, y A11 es el
  maestro de empresa por RUT. Ese es el criterio que decide todos los casos de esta sección: **el
  maestro es el activo cuyo SUJETO es el del campo**. Por eso no es A16, aunque A16 sea la entrega del
  modelo de riesgo y la consuma: A16 describe la evaluación de un RUT, no al RUT. Implementado así en
  `notaEmpresa(rut)`, que la lee de `NOTA_COMPORTAMIENTO` de A11 y devuelve **`null`** —nunca 0— cuando
  el RUT no está en el maestro: un hueco del feed tratado como 0 convertiría a esa empresa en el peor
  pagador posible. Importa más de lo que parece: la misma cifra cruza `NOTA_PRIORITARIA = 4,2`, que
  decide el segmento de verificación, y `notaMinCompra`, que es política de compra — dos decisiones
  distintas sobre un número que, si sale de dos activos con cortes distintos, no es el mismo número.
- **Clasificación: maestro A3/A4.** Al revés que la nota: la clasificación **es** la lista (BLANCA /
  AUTORIZADA), así que su maestro es la entrega que la define. A10 la lleva como contexto.
- **Línea aprobada: ninguna de las dos entregas diarias.** A7 es la **fotografía de cartera** de la vista
  Líneas (batch diario + refresco horario A8) y A16 la lleva como **variable del modelo de riesgo**
  (C-de-línea). La cifra con que se **decide** si una factura cabe es la de **A23**, que es la única que
  devuelve los tres niveles con `aprobada / utilizada / reservada / disponible` y la única que está neta
  de reservas. Regla: **A7 y A16 nunca alimentan el motor de líneas; A23 nunca alimenta la vista Líneas.**
  Mezclarlas da el error más caro de todos —cursar contra cupo que ya está tomado— y no avisa.

### 5.5 Ejecutivo, jefatura y zona — el hueco, **levantado como A24** el 14-09-2026

`EJECUTIVO` y `ZONA` llegaban **sólo** en A7, y ahí estaban mal ubicados por dos razones:

1. **Colgaban de la LÍNEA, no del cliente.** Un cliente con dos líneas puede traer dos ejecutivos y el
   archivo no dice cuál vale. La regla de negocio es que el ejecutivo se asigna **por cedente**
   (regla 11), así que su sujeto es el RUT cliente.
2. **La JEFATURA no llegaba por ningún activo.** El sistema necesita saber a qué equipo pertenece cada
   ejecutivo para decidir qué ve un jefe (`execsVisiblesDe`, que falla **cerrado** ante un código que
   no conoce). Era una constante del prototipo y ninguna entrega lo declaraba: sin ella, un jefe nuevo
   no veía el equipo que acababa de recibir.

Y un tercer problema que sólo apareció al levantarlo: **la asignación cliente → ejecutivo ya existía,
escondida dentro del A5** (`SHARE_OF_WALLET.Ejecutivo`), el activo de participación de mercado — y
llaveada por **nombre**. De quién es un cliente no es un atributo de su SOW, y cuando un activo lleva
un campo que no es suyo nadie sabe que hay que actualizarlo. Peor: renombrar a una persona dejaba a
toda su cartera sin dueño, sin error y sin forma de notarlo salvo que alguien reclamara.

**Resuelto con `A24 · Cartera comercial`** (`Integraciones/spec_s3_cartera.md`), que declara por RUT
cliente su ejecutivo, y por ejecutivo su equipo, **jefatura**, zona y sucursal. Tres decisiones de
diseño que conviene no perder:

- **El CÓDIGO es la identidad, no el nombre.** Es lo que se congela en `deal.exec` y lo que permite que
  alguien se cambie el apellido sin que se caiga la cartera.
- **El rótulo del equipo no es una clave foránea.** `EQUIPO` se muestra; `COD_JEFE` —una arista de
  código a código— decide el alcance. Hacer coincidir rótulos funcionaba sólo mientras nadie renombrara
  un equipo ni llegara un jefe cuyo equipo aún no estuviera escrito.
- **Los dos granos viajan en el mismo archivo y se validan juntos.** Una asignación a un código que el
  archivo no declara no se carga: aceptarla deja operaciones colgando de alguien que no existe.

Y una distinción que el activo **no** borra: **el archivo mueve empresas, no operaciones.** Traspasar
los negocios en curso sigue siendo un acto administrativo con fecha y responsable
(`Configuración › Oportunidades › Migración`), y sólo hasta antes del giro — una operación girada ya se
desembolsó y moverla sólo reescribiría de quién cuelga una venta que hizo otro.

### 5.6 Mix de financiamiento — lo **mide** el A2, lo **publica** el A11

El caso más reciente (15-09-2026) y el que mejor muestra cómo se aplica el criterio, incluida una
premisa que hubo que corregir a mitad de camino.

La columna **SOW** del tubo responde *con quién se financia este cliente y cuánto de eso es nuestro*:
cuatro porciones que suman 100 — ★ Security, el factoring target, los otros bancarios y los otros
factoring.

**La premisa equivocada fue tratar «bancario» como algo fuera del factoring.** No lo es: **toda cesión
es factoring** —un banco que compra una factura está haciendo factoring—, y **AECSync registra todas
las cesiones, bancarias y no bancarias**, identificando en cada una al cesionario. O sea que el activo
ya contesta la pregunta entera y no hay ninguna porción que haya que generar por perfil. Mientras se
supuso lo contrario, una de las cuatro porciones se inventaba.

**Quién mide qué, que no es lo mismo:**

- **Cómo se reparte entre contrapartes lo mide A2.** Es el único que identifica al cesionario. Con el
  padrón de cesionarios —que clasifica por **RUT** en banco / target / nuestro— eso se vuelve la
  partición de cuatro porciones. Ningún otro activo puede contestarlo.
- **Cuánto es nuestro lo dice A5.** Es el activo que mide la participación, con su serie semanal y su
  target, y es el que ya alimenta el descuento por SOW del **pricing**, el dimensionamiento de líneas
  y el churn. El mix se **ancla** a su `SOWActualPct` en vez de recalcularlo, para que la misma cifra
  no aparezca con dos valores en dos pantallas.
- **A11 lo publica.** El mix es un atributo de la EMPRESA, así que por el criterio de esta sección vive
  en el maestro de empresa: se mide sobre A2 y se **inyecta** en A11, que es de donde la aplicación lo
  lee — el mismo camino que `COLOC_PROM_12M_M` y `FECHA_PRIMERA_OPERACION`, que también se miden sobre
  las cesiones. Incluye `SOW_DETALLE_JSON`, el desglose por cesionario que el tooltip muestra; cada
  porción es exactamente la suma de los suyos, porque el 100 se reparte una sola vez y las porciones
  se agregan desde el detalle.
- **Quién es «factoring target» NO lo mide nadie: lo declara el tenant** (15-09-2026). Es política
  comercial —otro factoring miraría de frente a otros— así que no es un atributo del cesionario ni un
  dato del activo. Consecuencia sobre el contrato: los cuatro agregados que A11 publica salen del
  padrón **por defecto**, y el **dato** es `SOW_DETALLE_JSON`; el consumidor reagrupa con su propia
  configuración (`Configuración › Factoring target`). Es la misma distinción de siempre entre el hecho
  y su lectura: la **medición** —cuánto cedió el cliente y a quién— no cambia con la perilla; lo único
  que cambia es en qué balde se agrupa cada cesionario.

Un **deudor** no trae mix: las cuatro columnas vienen **vacías**, no en 0. Un deudor no cede facturas,
así que la pregunta no le aplica, y cuatro ceros afirmarían algo que el archivo no dice.

#### Cerrado el 15-09-2026: **A5 se DERIVA de A2**

Los dos activos medían la misma cantidad por caminos independientes y discrepaban **13,8 pto en la
mediana y 61,8 en el p90** sobre los 233 clientes que ambos cubren —A5 decía 97,7% donde A2 medía
5,1%—. El negocio resolvió aplicando el criterio de esta sección: **A2 es el registro de los hechos,
así que es el maestro; A5 se calcula sobre él.** El generador produce primero AECSync y después Share
of Wallet, midiendo. Medido tras el cambio: **233 de 233 clientes calzan dentro de 0,05 pto**, que es
el redondeo a un decimal con que se publican los porcentajes.

Eso obligó a dos cosas que conviene no perder:

- **A2 dejó de ser una muestra.** Traía 1.300 cesiones mientras A5 declaraba **9.104** en sus series:
  el analítico afirmaba siete veces más operaciones de las que el registro contenía, y con 0,63
  cesiones por cliente-semana no hay serie que medir. Ahora son **7.480**, cediendo una fracción real
  del pool cedible de cada cliente.
- **Los NIVELES de A5 no se pudieron conservar, y no por una decisión sino por aritmética:** sólo
  **114 de 233 clientes** tenían documentos suficientes para sostener lo que declaraban, y el peor
  pedía 11.579 MM en 61 cesiones teniendo 2.019 MM en 36 documentos —5,7× más plata de la que
  emitió—. Un cliente no puede ceder lo que no facturó. Lo que sí se conservó es la **participación**,
  que es un cociente: la trayectoria semanal de A5 se usa como intención al generar A2, así que quién
  es buen cliente y quién se está yendo no cambió. Impacto medido en pricing: el SOW se mueve 2,8 pto
  en la mediana, 38% de los clientes cambian de estado y el **descuento por SOW cambia 0,00 pto en la
  mediana** (p90 0,10, máximo 0,20).

Qué sigue siendo de A5 y **no** se mide: **`SOWTargetPct`**, que es una meta comercial —derivarla de
las cesiones haría que el objetivo fuera siempre igual al resultado y el gap no existiría nunca—, más
el segmento, el horizonte y la frecuencia. Y dos límites del registro, declarados: la serie cubre las
**8 semanas** que el A1 sostiene (no se cede un documento que no se emitió) y `HistoricoMensual` son
13 meses sobre un registro de 2, así que se **ancla** al SOW medido en vez de medirse. Caso 101.

### 5.7 Qué hacer con esto

1. Declarar el maestro en el layout de cada entrega (una línea por campo compartido).
2. Renombrar `SEGMENTO` de A10 a `SEGMENTO_ORIGEN` y marcarlo como no consumido.
3. ~~Levantar el activo de **cartera** (ejecutivo · jefatura · zona por RUT cliente).~~ **HECHO** el 14-09-2026: `A24 · Cartera comercial`. Con eso `EJECUTIVO`/`ZONA` dejan de ser materia de A7, que vuelve a ser sólo estado de línea, y el `Ejecutivo` del A5 queda como campo pasajero **a retirar** en la próxima versión de ese layout.
4. En la carga, escribir cada campo sólo desde su maestro y **conciliar** las copias en vez de pisarlas:
   una discrepancia es información sobre el origen, no ruido que haya que resolver en silencio.
5. Exponer la `FECHA_CORTE` de cada activo en las pantallas que los mezclan.
6. ~~Decidir el maestro de la participación de Security.~~ **HECHO** el 15-09-2026: el maestro es **A2** y A5 se deriva de él (§5.6). 233 de 233 clientes calzan dentro del redondeo.

Esto es **diseño de la integración**, no un defecto del prototipo: hoy los cinco archivos son
deterministas y coinciden entre sí por construcción, así que nada de esto se manifiesta acá. Se
manifiesta el primer día de operación real.
