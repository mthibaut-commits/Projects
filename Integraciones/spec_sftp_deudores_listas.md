# Spec — sftp_deudores_listas.csv (Activos A3 + A4)

**Propósito:** catálogo diario de **buenos deudores** — Lista Blanca (A3) y Deudores Autorizados (A4) — en un archivo único diferenciado por la columna `LISTA`. Monta la sección de listas de la **tabla interna**. Gobierna la clasificación de deudores, las reglas de prospección (CAT), la elegibilidad del inbound (sólo LB/Autorizados/históricos abren oportunidad) y la entrada al segmento **Elite** del predictor de verificación (clasificación PRIME).
**Transporte:** SFTP · `/in/listas/` · `DEUDORES_LISTAS_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. **Intradía:** altas/bajas urgentes vía API A22 si se requiere (dominio a habilitar) o esperan al batch siguiente.
**Clave:** `RUT_DEUDOR` + `LISTA`. Full-replace diario (snapshot): un deudor ausente en el archivo del día queda **fuera de listas** (pasa a "Otro").

| Campo | Tipo | Descripción |
|---|---|---|
| RUT_DEUDOR | string | RUT del deudor (sin puntos, con guión y DV) |
| RAZON_SOCIAL | string | Razón social |
| LISTA | BLANCA \| AUTORIZADA | BLANCA = Lista Blanca (A3) · AUTORIZADA = Deudores Autorizados (A4) |
| CLASIFICACION | PRIME \| NORMAL | Insumo del segmento Elite del predictor (PRIME requerido para Elite) |
| NOTA_DEUDOR | number 1–5 | Nota de comportamiento (política de compra ≥ 3,7) |
| CUPO_SUGERIDO_MM | number | Cupo sugerido de exposición por deudor (MM$), informativo |
| VIGENTE_DESDE / VIGENTE_HASTA | date | Ventana de vigencia en la lista |
| ESTADO | VIGENTE \| SUSPENDIDO | SUSPENDIDO mantiene el registro pero lo excluye de elegibilidad |
| FECHA_CORTE | date | Generación del archivo |

**Reglas:** un RUT no puede estar en ambas listas simultáneamente (prima BLANCA; se loguea el conflicto) · registros con `VIGENTE_HASTA` pasada o `ESTADO=SUSPENDIDO` no habilitan elegibilidad · los cambios de lista impactan la CAT de las oportunidades abiertas en la siguiente evaluación.
