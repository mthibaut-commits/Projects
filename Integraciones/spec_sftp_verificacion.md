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
| V05_RECURRENCIA_MESES_6M | V05 | **≥ 4** | Meses con venta C-D > 0 en Ult6M (sin reclamos/anulaciones). El umbral es **≥ 4**, no > 4: con 4 meses el criterio se cumple |
| **V06_PLAZO_PROM_PAGO_DIAS** | V06 | desviación **≤ 5% del plazo** | **Plazo promedio de pago del par, en días.** NEX calcula la desviación de cada factura contra él —`abs(plazo_doc − plazo_prom) / plazo_prom`— y aplica el 5%. El umbral **no son 5 días**: en un par que paga a 30 días tolera ±1,5 y en uno de 90 tolera ±4,5. Antes esta columna traía la diferencia ya calculada en días (`V06_DIF_FECHA_PAGO_DIAS`), que no se puede recomputar por factura |
| V07_PCT_MORA_25D | V07 | < 3% | % pagado con mora >25d — **degradable intramés** |
| V08_PCT_RECLAMADAS | V08 | < 4% | % facturas reclamadas — **degradable intramés** |
| V10_MNT_PAGADO_3M_M | V10 | **> MM$1.000** | Historial de pago factoring relevante (M$). Umbral **fijo**: no mira el tamaño de la operación evaluada. El «> 20× la operación ó > MM$1.500» es de la versión anterior del predictor |
| SEGMENTO | — | `PRIME` \| `OTROS` | Pre-segmentación del origen, **informativa**: NEX la recalcula siempre (ver nota). Los nombres `ELITE`/`OTHERS` son de la versión anterior |
| CLASIFICACION | — | `PRIME` \| `NORMAL` | Lista Blanca / Deudor Autorizado. Es **una de las dos** puertas de entrada al protocolo recortado |
| NOTA_DEUDOR | — | **> 4,2** abre por sí sola | Nota 1–5. La **otra** puerta de entrada: una nota > 4,2 basta aunque el deudor no sea PRIME |
| FECHA_CORTE | — | — | Generación |

**Notas:**

- **La segmentación la decide NEX, no el archivo.** El protocolo recortado se aplica si el deudor es PRIME **o** su nota supera 4,2 — son **dos poblaciones y basta pertenecer a una**, no una conjunción. `SEGMENTO` viaja para poder contrastar, pero no manda. La versión anterior exigía nota ≥ 3,7 **y** clasificación Prime.
- **PRIME** aplica seis criterios (V01, V04, V05, V07, V08, V10); **OTROS** aplica los diez.
- **V01 es compuerta, no atajo:** si el deudor tiene protocolo propio de confirmación **se verifica siempre** con ese protocolo y no se evalúa ningún otro criterio.
- **Un campo vacío es incumplimiento, nunca «no aplica».** No hay estado intermedio: un deudor nuevo —sin historial para V02, V05 y V10— se verifica por construcción. Enviar 0 y enviar vacío no son lo mismo si el 0 es un dato real.
- **V03** compara el monto de la operación contra **el total comprado al par en 3M móviles**, no contra un promedio por factura; el nombre `V03_RATIO_PROM_COMPRA` quedó del límite anterior.
- **V09** (alto monto, > MM$300) no viaja en el archivo: se evalúa en NEX sobre el **total de la operación con ese deudor** y sólo aplica al segmento OTROS — un PRIME no tiene techo por monto.
- La verificación telefónica registrada en NEX no se pierde con las cargas.

**Fuente normativa:** `Specs_Procesos/spec-verificacion-facturas.md`, que es la versión vigente del predictor. El PDF `Spec_Proceso_Calificacion_Otorgamiento_Verificacion_v1.1.pdf` describe la versión anterior (segmentos «Elite/Others», V10 con el múltiplo, entrada por conjunción) y quedó atrás en esos puntos.
