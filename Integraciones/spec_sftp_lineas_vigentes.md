# Spec — sftp_lineas_vigentes.csv (Activo A7)

**Propósito:** carga diaria de las líneas de crédito vigentes por cliente. Alimenta el tab Líneas (sub-tab Vigentes) y el recomendador. Los montos se refrescan durante el día vía API Montos (A8).
**Transporte:** SFTP · carpeta `/in/lineas/` · nombre `LINEAS_VIGENTES_AAAAMMDD.csv` · frecuencia diaria ~06:00 · encoding UTF-8 · separador `;` · **montos en PESOS, enteros, sin separador de miles ni decimales** · primera fila header.
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
