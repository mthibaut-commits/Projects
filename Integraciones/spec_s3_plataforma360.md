# Spec — s3_plataforma360.csv (Activo A11)

**Versión 3.0.0 · 23-09-2026 · NEX Factoring**

**Propósito:** información de empresa de la Plataforma 360 (firmográfica, comercial, índices, ventas, socios) por RUT — clientes y deudores. Monta la sección PLATAFORMA360 de la **tabla interna**. Alimenta la presentación al comité (pasos 1, 2 y 4) y la generación IA de notas.
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/plataforma360/PLATAFORMA360_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** upserts vía API A22 (dominio `PLATAFORMA360`).
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
| MARGEN_ULT_MES_M / MARGEN_12M_M | number (miles de $) | Márgenes de contribución |
| COLOC_PROM_12M_M | number (miles de $) | Colocación promedio 12m |
| SOW_SECURITY_PCT / SOW_FACTORING_TARGET_PCT / SOW_OTROS_FACTORING_PCT / SOW_OTROS_BANCARIOS_PCT | number (%) | **Mix de financiamiento del cliente**: con quién se financia por cesión y en qué proporción. Las cuatro porciones **suman 100**. Sólo para ROL=CLIENTE; en un deudor vienen vacías (no 0: un deudor no cede facturas, la pregunta no le aplica). **Se miden sobre A2 · AECSync** —el único activo que identifica al cesionario— y se inyectan acá; `SOW_SECURITY_PCT` se **ancla** al `SOWActualPct` del A5 para que la misma cifra no tenga dos valores. **`SOW_FACTORING_TARGET_PCT` se publica con el padrón de cesionarios POR DEFECTO**: quién es «target» es política comercial del tenant, así que el consumidor que la tenga configurada reagrupa desde `SOW_DETALLE_JSON` |
| SOW_DETALLE_JSON | JSON string | Desglose del mix **por cesionario**: array `{rut, nombre, porcion, pct}`, ordenado de mayor a menor. Es lo que el tooltip de cada chip muestra —«Otros bancarios · 22%» no sirve para llamar a nadie; «Banco Santander 14% · Scotiabank 8%» sí—. Cada porción es **exactamente** la suma de los suyos: el 100 se reparte una sola vez, cesionario por cesionario, y las cuatro porciones se agregan desde acá |
| SPREAD_REAL_12M_PCT / TASA_ULT_OP_PCT / COMISION_ULT_OP_M | number | Pricing histórico |
| PAS_EXIGIBLE_GEN_BRUTA / PATRIMONIO_M / GENERACION_M / LEVERAGE | number | Índices financieros |
| VENTAS_A1..A3_M / VENTAS_SII_A1..A3_M | number (miles de $) | Ventas 3 años (cliente y SII); vacío = sin período |
| SOCIOS_JSON | JSON string | Array `{rut, nombre, participacion, pep, fatca}` |
| FECHA_CORTE | date | Generación del archivo |

**Por qué el mix vive acá, y dónde se mide.** Alimenta la columna **SOW** del tubo comercial en versión tabla. El sujeto del campo es la EMPRESA —no su cartera, no un par cliente-deudor—, así que por el criterio del Levantamiento §5 el maestro de publicación es este activo. Pero **el dato se mide en A2 · AECSync**, que registra todas las cesiones del cliente —bancarias y no bancarias— e identifica al cesionario de cada una: es el único que puede decir con quién se financia. Acá llega **inyectado**, igual que `COLOC_PROM_12M_M` y `FECHA_PRIMERA_OPERACION`, que también se miden sobre las cesiones. `SOW_SECURITY_PCT` se ancla al `SOWActualPct` del A5 —ver el hueco abierto en Levantamiento §5.6, donde los dos activos miden esa cifra con 13,8 pto de desvío mediano—.

**Notas:** campos vacíos = sin información (no 0). La nota de comportamiento se **consolidó acá** (antes viajaba además en A16 y A10, y el layout de A3/A4 también la declaraba): es un atributo de la empresa, y tres copias podían discrepar sobre el mismo RUT. Para deudores, los campos comerciales de cliente pueden venir vacíos. Solapa variables con A16: mantener consistencia de nombres o consolidar entrega (ver Levantamiento §4).


## Unidad de los montos

Todo campo cuyo nombre **termina en `_M` va en MILES de pesos**, entero; el resto va en **pesos**.
Ningún campo de este layout va en millones, ni de este ni de ningún otro: el millón es una
abreviatura de PANTALLA y el único sitio del sistema que divide por un millón es el formateador.

Va en la lista: `MARGEN_ULT_MES_M`, `MARGEN_12M_M`, `COLOC_PROM_12M_M`, `COMISION_ULT_OP_M`,
`PATRIMONIO_M`, `GENERACION_M`, `VENTAS_A1..A3_M` y `VENTAS_SII_A1..A3_M`.

Tres de esas filas **declaraban `M$`, o sea millones**, hasta el 23-09-2026, mientras el generador
las producía en miles y el lector las multiplicaba por mil para llevarlas a pesos. Quien hubiera
implementado la entrega leyendo el layout habría enviado cifras **mil veces mayores** que las que
NEX espera, y nada lo habría dicho: un margen de $40.000.000 y uno de $40.000.000.000 se ven los dos
plausibles en la ficha de una empresa.

---

## Anexo · Control de versiones

**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.

| Versión | Fecha | Qué cambió |
|---|---|---|
| **3.0.0** | 23-09-2026 | Los montos `_M` se declaran en **miles de pesos**, que es lo que el generador produce y lo que el lector espera. Tres filas decían `M$` (millones): quien implementó la entrega leyendo el layout enviaba cifras **mil veces mayores**. Entra la sección «Unidad de los montos», que además deja dicho que ningún campo va en millones. |
| 2.0.0 | 16-09-2026 | El transporte pasa de SFTP a S3. El layout no cambia. |
| 1.2.0 | 15-09-2026 | El share of wallet entra como columna del tubo, alimentado por este activo. |
| 1.1.0 | 14-09-2026 | El layout se ajusta a lo que produce el generador de activos. |
| 1.0.0 | 29-08-2026 | Primera versión: la plataforma 360 del cliente (A11). |
