# Levantamiento de Activos de Información — NEX Factoring · Pipeline Comercial

**Fecha:** 04-08-2026 · **Alcance:** todos los activos de información (APIs, archivos batch, streams, catálogos y canales) que el sistema necesita para operar, según lo modelado en la aplicación. Para cada activo: tipo, dirección, frecuencia, contenido y módulos que lo consumen.

---

## 1. Resumen ejecutivo

| # | Activo | Tipo | Dirección | Frecuencia |
|---|---|---|---|---|
| A1 | DTESync — facturas electrónicas | Stream / API | Entrada | Continua (corridas por cron horario) |
| A2 | AECSync — cesiones electrónicas | Stream / API | Entrada | Continua |
| A3 | Lista Blanca de deudores | **Archivo vía SFTP → tabla interna** | Entrada | **Diaria (batch)** |
| A4 | Deudores Autorizados | **Archivo vía SFTP → tabla interna** | Entrada | **Diaria (batch)** |
| A5 | Share of Wallet por cliente | Dataset (JSON) | Entrada | Semanal / mensual |
| A6 | Estrategia de precio | Dataset (JSON) | Entrada | Diaria |
| A7 | Líneas de crédito vigentes | **Archivo CSV vía SFTP** | Entrada | **Diaria (batch)** |
| A8 | Montos de líneas (uso/disponible) | API REST | Entrada | **Cada 1 hora** |
| A9 | API Riesgo Crédito BICE (swagger) | API REST (9 endpoints) | Entrada | Bajo demanda |
| A10 | Datos de verificación (predictor V01–V10) | **Archivo vía SFTP → tabla interna** | Entrada | **Diaria (batch)** |
| A11 | Plataforma 360 — empresa | **Archivo vía SFTP → tabla interna** | Entrada | **Diaria (batch)** |
| A12 | Repositorio documental factoring (API 5) | API REST | Entrada | Bajo demanda |
| A13 | Inyección de solicitud de línea (API 1) | API REST | **Salida** | Por evento |
| A14 | Listar procesos de línea (API 2) | API REST | Entrada | Bajo demanda |
| A15 | Estado de proceso de línea (API 3) | API REST | Entrada | Bajo demanda |
| A16 | Datos de otorgamiento (modelo C/D/O + variables) | **Archivo vía SFTP → tabla interna** | Entrada | **Diaria (batch)** |
| A22 | Endpoint de actualización intradía (Security) | API REST (push de Security) | Entrada (por evento) | Intradía, cuando varían registros |
| A17 | WhatsApp Business (Agente IA) | API de mensajería | Bidireccional | Tiempo real |
| A18 | Email / Call Center | Canales | Bidireccional | Tiempo real |
| A19 | Portal de curse (factoringsecurity.cl/curse) | Aplicación externa | Salida (evento de firma) | Por evento |
| A20 | Carga de facturas XML / Excel (wizard) | Archivos (XML DTE, XLSX) | Entrada | Manual |
| A21 | Auditoría / bitácora | Log interno | Salida | Continua |

---

## 2. Detalle por activo

### A1 · DTESync — feed de facturas electrónicas (DTE)
- **Tipo:** stream/API de documentos tributarios electrónicos emitidos (tipo 33/34/46), identificados por folio.
- **Contenido:** RUT emisor (cedente), razón social, RUT/razón social receptor (deudor), folio, tipo DTE, monto total, enlaces XML/PDF, reclamos, notas de crédito.
- **Consumen:** Bandeja Inbound (motor de reglas de prospección), creación automática de oportunidades, itemización de facturas de la oferta.
- **Regla operacional:** las facturas que califican una regla se acumulan y pasan a Prospección en la corrida horaria (cron).

### A2 · AECSync — cesiones electrónicas
- **Tipo:** stream/API de archivos AEC (cesión del crédito).
- **Contenido:** cesiones registradas por cedente, factor cesionario (detección de competidor), fecha, montos.
- **Consumen:** detección de pérdida por competencia (`cesion_externa`), SOW estimado "mi competencia en este cliente", benchmark de deudores.

### A3 · Lista Blanca de deudores ⭐ BATCH SFTP → tabla interna
- **Tipo:** **archivo diario vía SFTP** (mismo patrón que A10/A11/A16); monta la sección de listas de la tabla interna. Se entrega junto con A4 en un archivo único con columna `LISTA` (BLANCA | AUTORIZADA) — ver `Integraciones/sftp_deudores_listas.csv`.
- **Contenido:** deudores de mejor calidad (whitelist) por RUT/razón social, con vigencia y cupo sugerido.
- **Consumen:** clasificación de deudor, reglas de prospección CAT, elegibilidad de facturas del inbound, segmento Elite del predictor de verificación (clasificación Prime).

### A4 · Deudores Autorizados ⭐ BATCH SFTP → tabla interna
- **Tipo:** **archivo diario vía SFTP**, misma entrega que A3 (columna `LISTA` = AUTORIZADA).
- **Contenido:** deudores autorizados (segunda categoría de "buenos deudores").
- **Consumen:** ídem A3.

### A5 · Share of Wallet (`SHARE_OF_WALLET`)
- **Tipo:** dataset JSON por RUT de cliente.
- **Contenido:** SOW actual/target, tendencia, histórico mensual/semanal, gap.
- **Consumen:** chips SOW de oportunidades, estrategia de precio por SOW (spread sugerido), panel SOW del cliente, plan mensual.

### A6 · Estrategia de precio (`ESTRATEGIA_PRECIO`)
- **Tipo:** dataset JSON indexado por `RUT cliente | Tipo de línea`.
- **Contenido:** spread promocional, puntos de descuento por cliente-línea.
- **Consumen:** tasa inicial de oportunidades inbound. *(Nota: el modelo de spread por SOW implementado ahora deriva el descuento internamente; este dataset queda como fuente histórica/de contraste.)*

### A7 · Líneas de crédito vigentes — CSV vía SFTP ⭐ BATCH
- **Tipo:** **archivo plano CSV** transferido por **SFTP**.
- **Frecuencia:** **carga diaria** (batch, ~06:15).
- **Contenido:** cliente, RUT, línea aprobada, uso, disponible, proyección, morosidad, ejecutivo, zona.
- **Consumen:** tab Líneas (sub-tab Vigentes), recomendador de línea (aumentar/rebajar/bloquear/renovar), indicadores de línea en oportunidades y plan mensual.

### A8 · Montos de líneas — API de actualización
- **Tipo:** API REST.
- **Frecuencia:** **cada 1 hora** refresca uso/disponible de las líneas cargadas por A7.
- **Consumen:** tab Líneas (montos), proyección post-curse.

### A9 · API Riesgo Crédito BICE (swagger `riesgo-credito/v1`)
- **Tipo:** API REST — 9 endpoints: clasificación deudora, consolidado, deuda BICE, boletín comercial, deuda previsional, protestos, tipo de cambio (UF/USD), mora ACHEF, mora CMF.
- **Consumen:** Paso "Datos Financieros y Riesgo" de la presentación al comité (deuda directa/indirecta, moras, protestos, ACHEF), análisis financiero IA.

### A10 · Datos de verificación — predictor V01–V10 ⭐ BATCH SFTP → tabla interna
- **Tipo:** **archivo diario vía SFTP** desde Security; con él se monta una **tabla interna** que es la que consulta la aplicación (no se consulta a Security en línea).
- **Contenido:** variables del predictor por par cliente-deudor (3M): V01 protocolo propio del deudor · V02 % pagado Ult3M · V03 monto vs promedio compra · V04 monto vs relación comercial · V05 recurrencia Ult6M · V06 diferencia fecha de pago · V07 % mora >25d (degradable intramés) · V08 % reclamadas (degradable intramés) · V09 marca alto monto (>MM$300) · V10 historial de pago relevante; más el segmento (Elite / Otros).
- **Actualización intradía:** vía **A22** (endpoint de Security que actualiza la tabla interna).
- **Consumen:** tab Verificación de la operación (VERIFICADA POR MODELO / VERIFICACIÓN TELEFÓNICA por factura), chip "Requiere Verificación N/M" de la card. El botón "Refrescar" relee la tabla interna; la verificación telefónica registrada no se pierde.

### A11 · Plataforma 360 — información de empresa ⭐ BATCH SFTP → tabla interna
- **Tipo:** **archivo diario vía SFTP** desde Plataforma 360; monta una **tabla interna** que consulta la aplicación (mismo patrón que A10/A16 — la información es de la misma familia que la requerida por otorgamiento y verificación, y comparten buena parte de las variables).
- **Contenido:** firmográfica (actividad, sector, trabajadores, fechas, alertas), información comercial (línea global, márgenes, colocación, spread real, segmento), socios (participación, PEP, FATCA), índices financieros, ventas y ventas SII — por RUT de empresa (clientes y deudores).
- **Actualización intradía:** cubierta por el mismo esquema del endpoint **A22** si el origen actualiza registros dentro del día.
- **Consumen:** presentación al comité (pasos 1, 2 y 4 — al agregar cada deudor se lee su registro de la tabla interna), generación IA de las 5 notas comerciales.
- **Nota de consolidación:** por el solapamiento de variables con A10/A16, evaluar consolidar los tres en **una misma entrega SFTP** (un paquete diario con secciones empresa / otorgamiento / verificación) para simplificar la operación del batch.

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

### A16 · Datos de otorgamiento — Modelo de Riesgo v1.0 ⭐ BATCH SFTP → tabla interna
- **Tipo:** **archivo diario vía SFTP** desde Security; con él se monta una **tabla interna** que la aplicación consulta para evaluar el catálogo C01–C52 (cliente), D01–D23 (deudor) y O01–O04 (operación).
- **Contenido:** variables por RUT cliente/deudor y por par C-D — pagarés (existencia, montos, vigencia), línea (aprobada, extendida, cupo), IVA al día, variación de venta, nota de comportamiento (cliente y deudor, umbral 3,7), moras CMF por tramo (directa 30-90/90-180/180d-3A, castigada, indirecta, leasing), Equifax/DICOM (mora, protestos), ACHEF por tramo, infracciones laborales, TGR (vigente, morosa, cobranza adm./judicial, convenios, cuotas impagas — judicial/convenios = bloqueo firme), mora interna por tramo, concentración, venta cruzada, NC, reclamos, ratio cesión/venta, n° factorings, socios comunes C-D, y variables de operación (spread/banda, comisiones, CxC, bloqueo).
- **Evaluación local:** el motor evalúa los tramos y niveles (N1..N5/Comité, homologados a la matriz de atribución) **contra la tabla interna**, con el versionado v1/v2 de re-evaluación al obtener el contrato firmado.
- **Actualización intradía:** vía **A22** — si dentro del día varían los registros de otorgamiento, Security actualiza la tabla y el sistema accede a la información fresca.
- **Consumen:** tab Otorgamiento, gate de avance a Giro, pérdida automática por bloqueo firme, badge "Requiere otorgamiento".

### A22 · Endpoint de actualización intradía de la tabla interna (Security) — ENTRADA por evento
- **Tipo:** API REST expuesta/consumida para que **Security actualice la tabla interna** montada desde los archivos SFTP de A10 y A16 cuando los registros varían dentro del día.
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
| Líneas — Vigentes | **A7 (CSV SFTP)**, A8 |
| Líneas — Presentación al comité | A9, A11, A12, A13, A14, A15 |
| Panel Clientes / SOW / Sankey | A2, A5 |
| Plan mensual / Plan por ejecutivo | A5, A7 |
| Auditoría | A21 |

## 4. Observaciones para integración

1. **Activos batch vía SFTP (diarios): cinco entregas** — el CSV de líneas (A7), los datos de **verificación** (A10), la **Plataforma 360** (A11), los datos de **otorgamiento** (A16) y las **listas de deudores** (A3 Lista Blanca + A4 Autorizados, en un archivo único con columna `LISTA`). Todos montan **tablas internas** que son la única fuente que consulta la aplicación; el endpoint A22 las refresca intradía cuando los registros varían. Por el solapamiento de variables entre A10, A11 y A16, se recomienda evaluar **una entrega SFTP consolidada**. Los catálogos restantes (A5 SOW / A6 estrategia de precio), hoy JSON precargados, son candidatos a sumarse al mismo esquema.
1-bis. **Patrón tabla interna:** la app nunca consulta a Security en línea para otorgamiento/verificación; lee siempre su tabla interna (batch + upserts A22), lo que desacopla disponibilidad y latencia del origen.
2. **A13 es la única escritura hacia sistemas externos** (inyección); todo lo demás hacia afuera son canales de contacto (A17/A18) y el evento de curse (A19).
3. La app hoy **mockea** A9–A15 con servicios deterministas; el contrato de datos de este documento es la referencia para reemplazarlos por las integraciones reales.
4. Puntos de resiliencia sugeridos: reintento/backoff en A8 (refresh horario), cache del último CSV válido en A7, y manejo de error visible en los paneles de recuperación del wizard (ya contemplado en la UX recuperar→aceptar).
