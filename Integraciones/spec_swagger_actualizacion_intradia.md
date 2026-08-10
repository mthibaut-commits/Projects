# Spec — swagger_actualizacion_intradia.yaml (Activo A22)

**Propósito:** endpoint **expuesto por NEX** para que Security actualice la **tabla interna** (montada desde los SFTP diarios de otorgamiento A16, verificación A10 y Plataforma 360 A11) cuando los registros varían dentro del día. La aplicación nunca consulta a Security en línea: siempre lee la tabla interna (batch + estos upserts).

| Endpoint | Uso |
|---|---|
| `POST /upsert` | Upsert de registros por dominio (`OTORGAMIENTO` \| `VERIFICACION` \| `PLATAFORMA360`). Cada registro: `rut` (+ `rutContraparte` si la variable es del par C-D) + mapa `variables` cuyos nombres **coinciden con el layout del CSV del dominio** (p. ej. `CMF_DIR_MOROSA_30_90`, `V02_PCT_PAGADO_3M`, `VENTAS_SII_A3_M`). Responde aplicados/rechazados con detalle. |
| `GET /estado` | Observabilidad: timestamp de la última carga batch, del último upsert y conteo de registros por dominio. |

**Semántica:** upsert parcial — sólo se actualizan las variables enviadas; el resto del registro se conserva. Timestamp por registro; la UI muestra "Actualizado hh:mm".
**Casos de uso típicos:** regularización de una mora TGR (des-bloquea un HARD_BLOCK en la re-evaluación), degradación intramés de V07/V08 (mora/reclamos del par), cambio de línea aprobada tras comité.
**Seguridad:** mTLS o OAuth2 client-credentials (por definir); origen autorizado único (Security). Reintentos idempotentes: mismo registro + mismo timestamp no duplica.
**Auditoría:** cada upsert queda en la bitácora de NEX (origen, dominio, n° registros, timestamp).
