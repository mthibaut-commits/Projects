# Spec — sftp_verificacion.csv (Activo A10)

**Propósito:** variables del **Predictor de Verificación** (V01–V10) por **par cliente-deudor** (ventana 3M/6M). Monta la sección VERIFICACION de la **tabla interna**. NEX decide localmente: VERIFICADA POR MODELO o VERIFICACIÓN TELEFÓNICA antes de girar.
**Transporte:** SFTP · `/in/verificacion/` · `VERIFICACION_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. **Intradía:** upserts vía API A22 (dominio `VERIFICACION`) — clave para V07/V08 que son **degradables intramés**.
**Clave:** `RUT_CLIENTE` + `RUT_DEUDOR`. Full-replace diario + upserts.

| Campo | Criterio | Umbral | Descripción |
|---|---|---|---|
| V01_PROTOCOLO_PROPIO | V01 | Existe → prevalece | 1 = el deudor tiene protocolo propio de verificación |
| V02_PCT_PAGADO_3M | V02 | ≥ 90% | Monto pagado por el deudor / cartera del par Ult3M |
| V03_RATIO_PROM_COMPRA | V03 | ≤ 1,3× | Monto operación / promedio facturas operadas C-D |
| V04_RATIO_RELACION_COMERCIAL | V04 | < 1,0× | Monto operación / venta promedio C-D L6M |
| V05_RECURRENCIA_MESES_6M | V05 | > 4 | Meses con venta C-D > 0 en Ult6M (sin reclamos/anulaciones) |
| V06_DIF_FECHA_PAGO_DIAS | V06 | < 5 días | Vencimiento del doc vs fecha promedio de pago |
| V07_PCT_MORA_25D | V07 | < 3% | % pagado con mora >25d — **degradable intramés** |
| V08_PCT_RECLAMADAS | V08 | < 4% | % facturas reclamadas — **degradable intramés** |
| V10_MNT_PAGADO_3M_M | V10 | > 20× op ó > MM$1.500 | Historial de pago factoring relevante (M$) |
| SEGMENTO | — | ELITE \| OTHERS | Pre-segmentación del origen (NEX puede recalcular) |
| CLASIFICACION | — | PRIME \| NORMAL | Insumo de entrada al segmento Elite |
| NOTA_DEUDOR | — | ≥ 3,7 para Elite | Nota 1–5 |
| FECHA_CORTE | — | — | Generación |

**Notas:** V09 (documento alto monto > MM$300) se evalúa en NEX con el monto de la operación, no viaja en el archivo. Segmento **ELITE** aplica protocolo light (V01, V04, V05, V07, V08, V10); **OTHERS** aplica V01–V10. La verificación telefónica registrada en NEX no se pierde con las cargas.
