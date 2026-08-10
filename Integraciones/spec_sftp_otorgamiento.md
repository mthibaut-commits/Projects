# Spec — sftp_otorgamiento.csv (Activo A16)

**Propósito:** variables del **Modelo de Riesgo v1.0** para evaluar el catálogo de otorgamiento C01–C52 (cliente), D01–D23 (deudor) y O01–O04 (operación). Monta la sección OTORGAMIENTO de la **tabla interna**; el motor de NEX evalúa los tramos y niveles (N1..N5/Comité) localmente contra esta tabla.
**Transporte:** SFTP · `/in/otorgamiento/` · `OTORGAMIENTO_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. **Intradía:** upserts vía API A22 (dominio `OTORGAMIENTO`).
**Clave:** `RUT` + `ROL` (+ `RUT_CONTRAPARTE` para variables del par C-D). Full-replace diario + upserts.
**Unidades:** montos en **pesos** salvo sufijo `_MM` (millones) o `_M` (miles); porcentajes 0–100.

| Campo | Reglas que alimenta | Descripción |
|---|---|---|
| PAGARE_FIRMADO / MNT_PAGARES_M / FCH_VCTO_PAGARE | C01–C03 | Pagaré: existencia, montos, vigencia |
| IVA_ULT_PERIODO (AAAAMM) | C04 | Información financiera al día (≤ 2 meses) |
| LINEA_APROBADA_MM / LINEA_EXTENDIDA | C05–C07 | Línea vigente, extensión por Riesgo, cupo |
| VAR_VENTA_MENSUAL_PCT | C08 | Variación vs promedio L6M (−20/−40) |
| NOTA_COMPORTAMIENTO | C09 / D01 | Nota 1–5 (umbral 3,7) |
| CMF_DIR_MOROSA_30_90 / 90_180 / 180_3A / CMF_DIR_CASTIGADA / CMF_IND_VENCIDA / CMF_IND_CASTIGADA / CMF_LEASING_MOROSA / CMF_DEUDA_TOTAL | C10–C16 / D02–D08 | Moras CMF por tramo (escalas MM$5/MM$10 ó 5%/10% del total) |
| EFX_DEUDA_MOROSA / EFX_PROTESTOS | C17–C18 / D09 | Equifax (DICOM), escala MM$5 |
| ACHEF_MOROSA_60_90 / 90_180 / MAS_180 | C19–C21 / D10–D12 | Moras ACHEF (escalas MM$25/MM$50) |
| INFRACCIONES_LABORALES_12M | C22 / D13 | Escala MM$10/25/50 |
| MORA_INTERNA_MAS_25D / 30_90 / 90_180 / 180_3A / DEUDA_INTERNA_TOTAL | C23–C26 / D14–D17 | Mora en cartera propia por tramo |
| TGR_VIGENTE / TGR_MOROSA / TGR_COBRANZA_ADM / **TGR_COBRANZA_JUD** / **TGR_CONVENIOS** / **TGR_CONVENIOS_CUOTAS_IMPAGAS** | C27–C32 | TGR último mes. **Los 3 en negrita = HARD_BLOCK (rechazo firme, no excepcionable)** |
| CONCENTRACION_VENTA_PCT / VENTA_CRUZADA_PCT / NOTA_CREDITO_PCT / RECLAMO_PCT | C33–C36 / D19–D23 | Comportamiento (umbral 50 / 30-60 / 8-30 / 3-20) |
| RATIO_CESION_VENTA_PCT / NRO_FACTORINGS_LM / FACTORING_PEQUENO_PCT | C37–C39 | Endeudamiento factoring (50-80 / 3-8 / 35) |
| CARTERA_RECLAMADA / CARTERA_NC / CARTERA_MOROSA / CXC_PENDIENTES | C40–C43, C47–C50 | Gestión de cartera (N1 Comercial) |
| SOCIOS_COMUNES_CD | D18 | 1 = cliente y deudor comparten socios (N5) |
| CLIENTE_BLOQUEADO | O04 | Bloqueo vigente |
| JUICIOS_GESINTEL | C52 | Informativo |
| FECHA_CORTE | — | Generación |

**Homologación de niveles:** política N1..N5 (N5=máxima) + Comité; módulo interno 1=máxima → `nivelMod = 6 − N` (Comité→1).
**Re-evaluación:** las variables de burós (CMF/Equifax/ACHEF/infracciones) NO se re-evalúan por operación; el resto sí (v1→v2 con contrato firmado).
