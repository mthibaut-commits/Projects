# Generador de datos de entrada — NEX Factoring

Produce **`datos_inyectados.js`**, el archivo que `build_app.ps1` embebe como script clásico **antes** del
bundle y que define los activos de información que consume el pipeline.

La regla que justifica que esto sea una aplicación aparte:

> **El pipeline no genera datos: los lee y los procesa.** Todo lo que la aplicación necesite saber del
> negocio —notas, deudas, líneas, comportamiento— tiene que venir de un dataset. Si el runtime inventa un
> valor, la UI y el motor terminan evaluando cosas distintas y los umbrales de la política acaban
> duplicados dentro de un generador.

## Uso

```bash
node GeneradorDatos/generar.js                       # lee y reescribe datos_inyectados.js en la raíz
node GeneradorDatos/generar.js entrada.js salida.js  # rutas explícitas
```

La generación es **determinista**: dos corridas sobre la misma entrada producen el mismo archivo byte a
byte. Se apoya en `hashStr` + mulberry32, el mismo azar estable que usa el pipeline.

## Datasets

**Base** — rescatados del build original, se copian sin tocar:

| Dataset | Qué es |
|---|---|
| `DTESYNC` | 30.000 facturas electrónicas emitidas |
| `LISTA_BLANCA` | 22 deudores de lista blanca |
| `DEUDORES_AUTORIZADOS` | 600 deudores autorizados |
| `AECSYNC` | 1.300 cesiones electrónicas |
| `SHARE_OF_WALLET` | 233 clientes de cartera con su SOW |
| `ESTRATEGIA_PRECIO` | 466 estrategias de precio promocional |

**Derivados** — se regeneran en cada corrida a partir de los base, **en orden**: cada uno queda disponible para los siguientes (por eso `VERIFICACION` puede leer la nota del `OTORGAMIENTO` recién generado).

| Dataset | Activo | Módulo | Qué deriva |
|---|---|---|---|
| `LINEA_DISPONIBLE` | A7 + A8 | `datasets/lineas.js` | Línea por cliente y tipo. Los montos salen del volumen real de facturas a crédito del cedente hacia deudores de esa clase, llevado a un mes × `SOWTargetPct`. Los campos estructurales (ejecutivo, segmento, % uso, estado) se conservan del maestro |
| `OTORGAMIENTO` | A16 | `datasets/otorgamiento.js` | Variables de riesgo de cliente, deudor y par cliente-deudor, con la forma del contrato (una fila por `RUT` + `ROL` + `RUT_CONTRAPARTE`, 54 campos, columnar como el CSV de origen) |
| `PLATAFORMA360` | A11 | `datasets/plataforma360.js` | Maestro de empresa por RUT (clientes y deudores): firmográfica, comercial, socios, índices y la **nota de comportamiento**, que vive sólo acá. Razón social y ventas salen de DTESync; colocación y última operación, de AECSync; segmento, del SOW |
| `RIESGO_BICE` | A9 | `datasets/riesgo_bice.js` | Sólo lo que la API de Riesgo BICE reporta y el A16 **no** trae. Lo que solapa (mora CMF, mora ACHEF, protestos, mora interna) no se duplica: el pipeline lo lee del A16 al componer la respuesta |
| `CARTERA` | A24 | `datasets/cartera.js` | Estructura comercial (código, nombre, equipo, **jefatura**, zona, sucursal) y asignación de cada cliente a su ejecutivo. La asignación se **mide** del `Ejecutivo` que ya declara el A5, para que el activo nuevo no contradiga al que la app venía leyendo; el archivo la vuelve a llavear por **código** y no por nombre |
| `VERIFICACION` | A10 | `datasets/verificacion.js` | Variables del predictor de verificación por par cliente-deudor. El promedio de factura del par y su venta mensual salen del volumen real de DTESync; la nota del deudor se **lee del A16 ya generado** para que los dos activos no puedan divergir |

## Cómo se calibra el riesgo

`datasets/otorgamiento.js` y `datasets/verificacion.js` generan valores desde **rangos de plausibilidad de
negocio** por perfil de entidad — sana, con incidencias aisladas, problemática — y **en ningún punto miran
un umbral de regla**. Lo que se puede medir no se genera: los montos de línea, el promedio de factura del
par y su venta mensual salen del volumen real de DTESync.

Eso es deliberado: si el generador colocara los valores respecto de los cortes de la política, los
umbrales quedarían duplicados aquí y en el catálogo, y moverlos en la política rompería la calibración
en silencio. Qué porcentaje de la cartera cae en excepción es una **propiedad emergente del dato**.

Los diales están en la constante `RANGO` de cada módulo y en la distribución de perfiles (`perfil`). Tras
cambiarlos conviene medir el resultado: hoy son ~57% de clientes sin ninguna excepción y ~3% de knockout
por TGR en otorgamiento, y ~70% de facturas en verificación telefónica en el predictor.

## Un atributo, un activo

Cuando dos activos describen a la misma empresa, el atributo vive en **uno** y los demás lo consultan. La
nota de comportamiento viajaba en tres archivos y el desglose de deuda de la API de Riesgo BICE repetía lo
que el A16 ya declaraba: dos copias siempre terminan discrepando.

Cuando dos activos necesitan ser **coherentes** sin compartir el campo —la nota del A11 y la deuda de buró
del A16 describen a la misma empresa desde ángulos distintos— el perfil se decide una sola vez por RUT en
`lib/perfil.js` y los dos módulos lo consultan. Así una empresa no sale con nota 4,8 y castigada en la CMF.

## Al agregar un dataset

1. Un módulo en `datasets/` que exporte `generar(datos)` y devuelva el valor del dataset.
2. Registrarlo en el arreglo `DERIVADOS` de `generar.js`.
3. Si su forma es la de un CSV ancho, devolver `{ campos, filas }` en columnar: repetir los nombres de
   campo en cada fila cuesta un orden de magnitud en tamaño de archivo.

## Unidad de los montos

Los datasets se emiten con **todos los montos en pesos, enteros**. Nada en millones.

- `SHARE_OF_WALLET` (A5) — la serie semanal pasó de `MontoBICEMM`/`MontoTotalMM` a `MontoBICE`/`MontoTotal`.
- `LINEA_DISPONIBLE` (A7/A8) — `MontoAprobado`, `MontoUtilizado`, `MontoDisponible`, `LiberadoUlt24h`,
  `CursadoUlt24h`.

El **cupo** de una línea sí se otorga en cifras típicamente redondas —un comité aprueba $500.000.000,
no $497.331.204— y por eso el 82% cae en tramos de $5.000.000. Pero puede ser cualquier monto, así
que el 18% restante queda en la cifra exacta a propósito: ningún consumidor debe suponer que un cupo
es redondo. Lo **utilizado**, que sale de facturas reales, es siempre exacto al peso.
