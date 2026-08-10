# Spec — swagger_gestion_lineas.yaml (Activos A13 / A14 / A15)

**Propósito:** integrar NEX con el sistema externo de gestión de líneas (comité). NEX **sólo inyecta y consulta**; la resolución (aprobación/rechazo/observación) ocurre en el sistema externo.

| Endpoint | Activo | Uso |
|---|---|---|
| `POST /solicitudes` | A13 | Inyecta la solicitud creada por el wizard "Crear Presentación" (tipo CREAR/RENOVAR/MODIFICAR + subtipo, líneas propuestas, subproductos, deudores con nota/política 25-30%/flags/productos, fianzas, garantías y las 5 notas comerciales). Devuelve `idProceso`. |
| `GET /solicitudes` | A14 | Lista los procesos en gestión → alimenta el sub-tab "En proceso" (Bandeja). Filtros por RUT y estado. |
| `GET /solicitudes/{idProceso}` | A15 | Estado y trazabilidad de un proceso — consulta **pull** (historial de estados con fechas y observaciones). |
| `POST /callbacks/estado-solicitud` | A15-push | **Actualización de estado PUSH**: callback **expuesto por NEX** para que el sistema de gestión notifique cambios de estado sin esperar el pull. Si el estado es APROBADA incluye las condiciones finales resueltas por el comité; si es OBSERVADA/RECHAZADA, la observación es obligatoria. Idempotente. |

**Tipos de solicitud sobre el mismo `POST /solicitudes`** (discriminador `tipo`): **CREAR** (nueva línea — cliente sin línea o empresa nueva; `subtipoModificacion` no aplica), **RENOVAR** (renueva vigencia de la línea actual), **MODIFICAR** (requiere `subtipoModificacion`: AGREGAR_CREDITO, MODIFICAR_VENCIMIENTO, AGREGAR_DEUDORES, REGULARIZAR_DEUDORES, REBAJAR_LINEA, RATIFICAR_EXCESO).

**Estados:** EN_GESTION → EN_ANALISIS_RIESGO → EN_COMITE → APROBADA | OBSERVADA | RECHAZADA.
**Reglas:** `subtipoModificacion` obligatorio si tipo=MODIFICAR · una línea no admite dos solicitudes en gestión (409) · montos en MM$ · `notaDeudor` escala 1–5 (política de compra ≥ 3,7).
**Frecuencia:** POST por evento (Solicitar VB); GET al abrir la Bandeja y con "Consultar estados".
**Autenticación:** por definir con el equipo del sistema de gestión (se sugiere OAuth2 client-credentials).
