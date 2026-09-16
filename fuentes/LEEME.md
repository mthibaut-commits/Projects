# Fuentes embebidas en los PDF

`Geist` y `Geist Mono` (subconjunto **latin**), la tipografía del sistema de diseño Datamart.
Las usa `md_a_pdf.mjs`, que las inserta como `data:` URI en el HTML intermedio: así el render
no depende de la red y el mismo `.md` produce siempre el mismo PDF.

- Origen: Google Fonts (`fonts.gstatic.com`), familia **Geist** de Vercel.
- Licencia: SIL Open Font License 1.1.
- Son **variables**: un solo archivo cubre los pesos 400–700, por eso hay uno por familia.

Se guardan como binario: `.gitattributes` las marca `-text` para que la normalización de fin de
línea no cambie sus bytes.
