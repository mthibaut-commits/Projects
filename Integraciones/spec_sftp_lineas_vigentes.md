# Spec — sftp_lineas_vigentes.csv (Activo A7)

**Propósito:** carga diaria de las líneas de crédito vigentes por cliente. Alimenta el tab Líneas (sub-tab Vigentes) y el recomendador. Los montos se refrescan durante el día vía API Montos (A8).
**Transporte:** SFTP · carpeta `/in/lineas/` · nombre `LINEAS_VIGENTES_AAAAMMDD.csv` · frecuencia diaria ~06:00 · encoding UTF-8 · separador `;` · decimal `.` · primera fila header.
**Clave:** `ID_LINEA` (única). Carga tipo full-replace (snapshot del día).

| Campo | Tipo | Descripción |
|---|---|---|
| ID_LINEA | string | Identificador único de la línea |
| RUT_CLIENTE | string | RUT sin puntos, con guión y DV |
| RAZON_SOCIAL | string | Razón social del cliente |
| LINEA_APROBADA_MM | number | Línea aprobada por comité (MM$) |
| USO_ACTUAL_MM | number | Uso al corte (MM$) |
| DISPONIBLE_MM | number | Aprobada − uso (MM$) |
| PROYECCION_POST_CURSE_MM | number | Uso + operaciones en curso (MM$) |
| MOROSIDAD_DIAS | integer | Días de mora del cliente (0 = sin mora) |
| FECHA_VENCIMIENTO | date (AAAA-MM-DD) | Vencimiento de la línea |
| EJECUTIVO | string | Ejecutivo dueño de la cartera |
| ZONA | string | Zona geográfica |
| FECHA_CORTE | date | Fecha de generación del archivo |

**Validaciones:** LINEA_APROBADA_MM > 0 · DISPONIBLE_MM = LINEA_APROBADA_MM − USO_ACTUAL_MM (tolerancia 0,1) · RUT válido con DV. Filas inválidas se rechazan y se informan; el archivo no se descarta completo.
