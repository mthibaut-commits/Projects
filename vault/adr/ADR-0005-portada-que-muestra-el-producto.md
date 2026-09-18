---
type: adr
title: "ADR-0005 — La portada de ingreso muestra el producto, con #703EFF como único morado de marca"
description: "Decisión del 18-09-2026 con tres alternativas descartadas: se eligió una portada con profundidad real y capturas del producto (se descartaron «Cesión», «Columna» y «Marca»), el arte va en un activo generado (se descartó embeberlo en el .jsx y se descartó dibujarlo en JSX), y el acento de marca queda en #703EFF (se descartó conservar el #4F46E5 que convivía con él)"
tags: [adr, portada, marca, activos, build]
timestamp: 2026-09-18T18:20:00Z
estado: aceptada
reemplaza: null
---

# ADR-0005: la portada muestra el producto, con un solo morado

## Contexto

La portada era un *split login*: formulario a la izquierda y un panel con degradado a la derecha que
ocupaba el 60 % del lienzo para cargar tres líneas de texto. El usuario lo describió como «too flat».
La medición ubicó el problema en otro lado: no era falta de relieve sino que la pantalla era
**intercambiable** —cambiando el logo y el claim servía para cualquier SaaS—, y nada en ella hablaba
de factoring. En el mismo audit apareció que la marca tenía **dos moradas conviviendo**:
`marcaPrimario` valía `#4F46E5` mientras el acento del producto era `C.indigo = #703EFF`, y las dos
se veían en la misma pantalla.

## Decisión

1. **La portada muestra el producto, con profundidad real.** Fondo de tres radiales con grano, dos
   pantallas reales en perspectiva con profundidad de campo, tarjeta de vidrio, y una entrada
   orquestada de ~1,6 s. Al autenticarse, el panel del dashboard **crece hasta ser el sistema**
   (regla 36): el objeto que mirabas es aquel en el que entras.
2. **El arte es un activo generado, no bytes en el fuente** (regla 34): `Capturas_UI/` →
   `generar_arte_login.mjs` → `arte_login.js` → los dos builds.
3. **`#703EFF` es el único morado de marca.** `marcaPrimario` pasa a `#703EFF`, `marcaCta` se rederiva
   de él y `marcaPanel` deja de ser un degradado de dos paradas para ser la composición de radiales.
   Se agrega `marcaFondo` para el suelo de la portada.

## Alternativas descartadas

- **«Cesión»** — el héroe era una factura electrónica chilena sangrando por el borde, con el timbre de
  cesión como único color. Era la más específica del dominio y la que ningún otro producto podría usar.
  Descartada: el usuario la rechazó junto con las otras dos por plana. Sigue siendo la mejor respuesta
  si alguna vez la portada tiene que decir «conocemos tus documentos» en el primer segundo.
- **«Columna»** — una sola columna centrada, sin panel, con una hairline a sangre clavada en la línea
  base del titular. La más disciplinada y la que mejor sobrevive un cambio de tenant, porque no usa
  `marcaPanel` ni `marcaClaim`. Descartada: es **la más plana de las tres**, o sea agrava el síntoma
  reportado.
- **«Marca»** — color de marca a sangre con el formulario como tarjeta chica encima. La más
  institucional. Descartada por ser la menos específica: es la que más se parece a lo que ya había.
- **Embeber el arte como data URIs en `pipeline_comercial.jsx`** — habría evitado tocar los dos builds.
  Descartada: ~1 MB de base64 dentro de un archivo que se edita a mano, y bytes generados commiteados
  en el fuente, que es justo lo que prohíbe la regla 10.
- **Dibujar los paneles en JSX** en vez de usar capturas — 0 bytes de activo, sin cambios al build, y
  nunca se desactualiza. Descartada: el usuario aprobó un diseño donde los paneles son el producto
  real, y una abstracción dibujada es otra cosa aunque se parezca. La opción sigue sobre la mesa si el
  activo generado se vuelve una carga de mantenimiento.
- **Conservar `#4F46E5` como primario del tenant** — descartada por el usuario el 18-09-2026:
  preservar la marca literalmente era preservar el conflicto.

## Consecuencias

- El build tiene un tercer activo generado, y **`build_app.ps1` cambia con `build_app.mjs`**. El gate
  `regla_34.test.mjs` exige los dos: sin él, un cambio sólo en Node deja al usuario sin paneles y sin
  error. El `.ps1` no se pudo ejecutar acá (es de Windows): la simetría está gateada, no probada.
- La portada depende de `Capturas_UI/`, que ya se regenera cuando cambia la UI (paso 7 de la
  verificación). Quien regenere las capturas tiene que correr también el generador del arte.
- El HTML construido pasó de 40,7 MB a 41,0 MB.
