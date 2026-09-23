# Spec — s3_lineas_vigentes.csv (Activo A7)

**Versión 2.0.0 · 16-09-2026 · NEX Factoring**

**Propósito:** carga diaria de las líneas de crédito vigentes por cliente. Alimenta el tab Líneas (sub-tab Vigentes) y el recomendador. Los montos se refrescan durante el día vía API Montos (A8).
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/lineas/LINEAS_VIGENTES_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Montos en PESOS**, enteros, sin separador de miles ni decimales.
**Clave:** `ID_LINEA` (única). Carga tipo full-replace (snapshot del día).

| Campo | Tipo | Descripción |
|---|---|---|
| ID_LINEA | string | Identificador único de la línea |
| RUT_CLIENTE | string | RUT sin puntos, con guión y DV |
| RAZON_SOCIAL | string | Razón social del cliente |
| LINEA_APROBADA | integer | Línea aprobada por comité, en PESOS |
| USO_ACTUAL | integer | Uso al corte, en PESOS |
| DISPONIBLE | integer | Aprobada − uso, en PESOS |
| PROYECCION_POST_CURSE | integer | Uso + operaciones en curso, en PESOS |
| MOROSIDAD_DIAS | integer | Días de mora del cliente (0 = sin mora) |
| FECHA_VENCIMIENTO | date (AAAA-MM-DD) | Vencimiento de la línea |
| EJECUTIVO | string | Ejecutivo dueño de la cartera |
| ZONA | string | Zona geográfica |
| FECHA_CORTE | date | Fecha de generación del archivo |

**Validaciones:** LINEA_APROBADA > 0 · DISPONIBLE = LINEA_APROBADA − USO_ACTUAL (igualdad EXACTA, sin tolerancia: son pesos enteros) · RUT válido con DV. Filas inválidas se rechazan y se informan; el archivo no se descarta completo.

## Unidad de los montos

Todos los montos van en **pesos**, enteros. No se entregan en millones ni con decimales.

El millón es una abreviatura de PANTALLA, no una unidad de dato. Este layout entregaba
`LINEA_APROBADA_MM` y compañía en millones con un decimal, o sea cuantizados de a $100.000, y el uso
declarado dejaba de cuadrar contra la suma de las facturas cedidas, que sí son pesos exactos. El
cupo que aprueba el comité puede ser cualquier monto —típicamente es una cifra redonda, pero no
necesariamente—, así que el layout no supone nada sobre su forma.

---

## Anexo · Control de versiones

**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.

| Versión | Fecha | Qué cambió |
|---|---|---|
| **2.0.0** | 16-09-2026 | El transporte pasa de SFTP a S3. El layout no cambia. |
| 1.1.0 | 14-09-2026 | Los montos se declaran en pesos enteros: el millón es abreviatura de pantalla. |
| 1.0.0 | 29-08-2026 | Primera versión: las líneas vigentes (A7). |
