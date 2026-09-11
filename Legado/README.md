# Legado — artefactos superados, conservados por trazabilidad

Lo que hay acá **no describe lo que la aplicación ejecuta**. Se conserva para poder rastrear de dónde
salió el catálogo actual, no como fuente. La fuente normativa es la spec de Calificación v1.1 más
`Integraciones/spec_sftp_otorgamiento.md`, y lo que corre es el catálogo **C01–C52 / D01–D23 / O01–O04**
que vive en `pipeline_comercial.jsx`.

## `Rules Cliente2_v0.xlsx` y `Rules Deudor_v0.xlsx`

Los maestros originales de los que salió el catálogo **anterior** (reglas 1–59), el que el runtime
reemplaza completo al cargar. Quedaron obsoletos en dos cosas que importan:

- `Rules Deudor_v0.xlsx` trae **10 reglas** —contra las 23 de D01–D23— y evalúa `$DeudorScore` en escala
  **0–99** con umbrales 80/60. Esa escala fue reemplazada por la **Nota Deudor 1–5** con umbral 3,7.
- `Rules Cliente2_v0.xlsx` trae 59 filas y columnas de trabajo (`Rutle Task`, `Reevaluation`) que no
  existen en el modelo actual.

Tomar cualquiera de los dos como referencia al implementar el servicio produciría un motor con la
escala de nota equivocada y con un tercio de las reglas de deudor.

## Lo que NO está acá

`atribuciones_otorgamiento.json` **sí** describe el catálogo vigente y por eso sigue en la raíz. Se
regenera desde la app —`node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node
regenerar_atribuciones.mjs`— o a mano desde Configuración › Otorgamiento › Descargar JSON. Se desfasó
dos meses del catálogo justamente porque regenerarlo era un gesto manual que nadie recordaba hacer.
