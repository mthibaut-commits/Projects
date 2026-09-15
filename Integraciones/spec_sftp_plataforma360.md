# Spec — sftp_plataforma360.csv (Activo A11)

**Propósito:** información de empresa de la Plataforma 360 (firmográfica, comercial, índices, ventas, socios) por RUT — clientes y deudores. Monta la sección PLATAFORMA360 de la **tabla interna**. Alimenta la presentación al comité (pasos 1, 2 y 4) y la generación IA de notas.
**Transporte:** SFTP · `/in/plataforma360/` · `PLATAFORMA360_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. **Intradía:** upserts vía API A22 (dominio `PLATAFORMA360`).
**Clave:** `RUT` + `ROL` (CLIENTE | DEUDOR). Full-replace diario + upserts intradía.

| Campo | Tipo | Descripción |
|---|---|---|
| RUT / RAZON_SOCIAL / ROL | string | Identificación; ROL: CLIENTE o DEUDOR |
| ACTIVIDAD_ECONOMICA / SECTOR | string | Firmográfica |
| NUM_TRABAJADORES | integer | Dotación |
| FECHA_INGRESO / FECHA_PRIMERA_OPERACION | date | Historia como cliente |
| CLIENTE_BANCO / ALERTAS | SI\|NO | Relación banco y alertas vigentes |
| NOTA_COMPORTAMIENTO | number 1–5 | **Nota de comportamiento (5 = mejor pagador). ÚNICA fuente**: la consultan C09 (cliente), D01 (deudor), el CAT, el predictor de verificación y la UI. No viaja en ningún otro activo |
| SEGMENTO / SUB_SEGMENTO / QUINTIL | string / int | Segmentación comercial |
| MARGEN_ULT_MES_M / MARGEN_12M_M | number (M$) | Márgenes de contribución |
| COLOC_PROM_12M_M | number (M$) | Colocación promedio 12m |
| SOW_SECURITY_PCT / SOW_FACTORING_TARGET_PCT / SOW_OTROS_FACTORING_PCT / SOW_OTROS_BANCARIOS_PCT | number (%) | **Mix de financiamiento del cliente**: con quién se financia y en qué proporción. Las cuatro porciones **suman 100**. Sólo para ROL=CLIENTE; en un deudor vienen vacías (no 0: un deudor no se financia con nosotros, la pregunta no le aplica). Las tres porciones de factoring, renormalizadas sobre su subtotal, **reproducen el `SOWActualPct` del A5**, que sigue siendo el maestro de la participación *dentro* del factoring |
| SPREAD_REAL_12M_PCT / TASA_ULT_OP_PCT / COMISION_ULT_OP_M | number | Pricing histórico |
| PAS_EXIGIBLE_GEN_BRUTA / PATRIMONIO_M / GENERACION_M / LEVERAGE | number | Índices financieros |
| VENTAS_A1..A3_M / VENTAS_SII_A1..A3_M | number (M$) | Ventas 3 años (cliente y SII); vacío = sin período |
| SOCIOS_JSON | JSON string | Array `{rut, nombre, participacion, pep, fatca}` |
| FECHA_CORTE | date | Generación del archivo |

**Por qué el mix vive acá.** Es el dato que alimenta la columna **SOW** del tubo comercial en versión tabla, y ningún otro activo puede producirlo entero: **A2 (AECSync)** sólo registra *cesiones*, o sea factoring; **A5 (Share of Wallet)** sólo mide participación *dentro* del factoring. Ninguno de los dos ve la deuda **bancaria que no es factoring**, que es una de las cuatro porciones. El sujeto del campo es la EMPRESA —no su cartera, no un par cliente-deudor—, así que por el criterio del Levantamiento §5 el maestro es este activo. No crea una segunda verdad sobre lo que el A5 ya dice: lo **extiende**. Las tres porciones de factoring renormalizadas tienen que reproducir el `SOWActualPct` del A5 y hay un caso de prueba que lo fija (99).

**Notas:** campos vacíos = sin información (no 0). La nota de comportamiento se **consolidó acá** (antes viajaba además en A16 y A10, y el layout de A3/A4 también la declaraba): es un atributo de la empresa, y tres copias podían discrepar sobre el mismo RUT. Para deudores, los campos comerciales de cliente pueden venir vacíos. Solapa variables con A16: mantener consistencia de nombres o consolidar entrega (ver Levantamiento §4).
