# Spec — swagger_montos_lineas.yaml (Activo A8)

**Propósito:** refrescar durante el día los **montos** (uso, disponible, proyección, morosidad) de las líneas cargadas por el batch diario `sftp_lineas_vigentes.csv` (A7). La estructura de las líneas viene del CSV; esta API sólo actualiza montos.

| Endpoint | Uso |
|---|---|
| `GET /montos` | Todos los montos vigentes. Parámetro `desde` (timestamp) para modo **delta** — sólo líneas con cambios. |

**Frecuencia:** pull de NEX **cada 1 hora** (mostrado en la UI como "Montos actualizados vía API: hh:00").
**Clave de correlación:** `idLinea` (mismo `ID_LINEA` del CSV A7); si no existe en la carga del día, el registro se ignora y se loguea.
**Resiliencia:** ante error o timeout, NEX conserva los últimos montos válidos y reintenta al ciclo siguiente (backoff); la UI muestra la hora del último refresh exitoso.
