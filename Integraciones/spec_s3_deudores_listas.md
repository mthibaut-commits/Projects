# Spec — s3_deudores_listas.csv (Activos A3 + A4)

**Propósito:** catálogo diario de **buenos deudores** — Lista Blanca (A3) y Deudores Autorizados (A4) — en un archivo único diferenciado por la columna `LISTA`. Monta la sección de listas de la **tabla interna**. Gobierna la clasificación de deudores, las reglas de prospección (CAT), y la elegibilidad del inbound (sólo LB/Autorizados/históricos abren oportunidad).
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/listas/DEUDORES_LISTAS_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** altas/bajas urgentes vía API A22 si se requiere (dominio a habilitar) o esperan al batch siguiente.
**Clave:** `RUT_DEUDOR` + `LISTA`. Full-replace diario (snapshot): un deudor ausente en el archivo del día queda **fuera de listas** (pasa a "Otro").

| Campo | Tipo | Descripción |
|---|---|---|
| RUT_DEUDOR | string | RUT del deudor (sin puntos, con guión y DV) |
| RAZON_SOCIAL | string | Razón social |
| LISTA | BLANCA \| AUTORIZADA | BLANCA = Lista Blanca (A3) · AUTORIZADA = Deudores Autorizados (A4) |
| CUPO_SUGERIDO_MM | number | Cupo sugerido de exposición por deudor (MM$), informativo |
| VIGENTE_DESDE / VIGENTE_HASTA | date | Ventana de vigencia en la lista |
| ESTADO | VIGENTE \| SUSPENDIDO | SUSPENDIDO mantiene el registro pero lo excluye de elegibilidad |
| FECHA_CORTE | date | Generación del archivo |

**Retirado del layout:** `CLASIFICACION` (PRIME \| NORMAL) salió junto con el segmento Elite del predictor de verificación, que era su único consumidor. Y `NOTA_DEUDOR` salió porque la nota es un atributo de la **empresa** y vive sólo en el **A11** (Plataforma 360): este archivo dice a qué lista pertenece un deudor, no cómo se comporta.

**Reglas:** un RUT no puede estar en ambas listas simultáneamente (prima BLANCA; se loguea el conflicto) · registros con `VIGENTE_HASTA` pasada o `ESTADO=SUSPENDIDO` no habilitan elegibilidad · los cambios de lista impactan la CAT de las oportunidades abiertas en la siguiente evaluación.
