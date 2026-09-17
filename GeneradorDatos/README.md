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
| `SHARE_OF_WALLET` | 233 clientes de cartera. Se copia su **ficha** (razón social, ejecutivo, segmento, horizonte y el `SOWTargetPct`, que es meta comercial); **el SOW se mide y por eso figura también en derivados** |
| `ESTRATEGIA_PRECIO` | 466 estrategias de precio promocional |

**Derivados** — se regeneran en cada corrida a partir de los base, **en orden**: cada uno queda disponible para los siguientes (por eso `VERIFICACION` puede leer la nota del `OTORGAMIENTO` recién generado).

| Dataset | Activo | Módulo | Qué deriva |
|---|---|---|---|
| `LINEA_DISPONIBLE` | A7 + A8 | `datasets/lineas.js` | Línea por cliente y tipo. Los montos salen del volumen real de facturas a crédito del cedente hacia deudores de esa clase, llevado a un mes × `SOWTargetPct`. Los campos estructurales (ejecutivo, segmento, % uso, estado) se conservan del maestro |
| `OTORGAMIENTO` | A16 | `datasets/otorgamiento.js` | Variables de riesgo de cliente, deudor y par cliente-deudor, con la forma del contrato (una fila por `RUT` + `ROL` + `RUT_CONTRAPARTE`, 54 campos, columnar como el CSV de origen) |
| `PLATAFORMA360` | A11 | `datasets/plataforma360.js` | Maestro de empresa por RUT (clientes y deudores): firmográfica, comercial, socios, índices y la **nota de comportamiento**, que vive sólo acá. Razón social y ventas salen de DTESync; colocación y última operación, de AECSync; segmento, del SOW. El **mix de financiamiento** (`SOW_*` + `SOW_DETALLE_JSON`) se **mide sobre AECSync** —el único activo que identifica al cesionario de cada cesión, bancaria o no— y se inyecta acá, que es de donde la aplicación lo lee; la porción propia se ancla al `SOWActualPct` del A5 para no dar dos valores de la misma cifra |
| `RIESGO_BICE` | A9 | `datasets/riesgo_bice.js` | Sólo lo que la API de Riesgo BICE reporta y el A16 **no** trae. Lo que solapa (mora CMF, mora ACHEF, protestos, mora interna) no se duplica: el pipeline lo lee del A16 al componer la respuesta |
| `AECSYNC` | A2 | `datasets/cesiones.js` | **El registro completo de cesiones y el maestro de la participación** (7.480; traía 1.300 mientras el A5 declaraba 9.104 en sus series). Cada una apunta a un **documento real del A1** de su cedente y copia sus campos. Se cede una fracción del pool CEDIBLE de cada cliente; el cesionario sale del padrón `lib/cesionarios.js` por un panel de 2 a 4 contrapartes, y qué parte va a nosotros lo fija la trayectoria de participación — que después se vuelve a medir en el A5 |
| `SHARE_OF_WALLET` | A5 | `datasets/share_of_wallet.js` | **Se MIDE sobre AECSync**, que corre antes: la serie semanal con sus montos, la participación actual, la tendencia, el gap, el estado y el diagnóstico salen de las cesiones. Antes A2 y A5 respondían la misma pregunta por caminos independientes y discrepaban **13,8 pto en la mediana**; hoy calzan dentro del redondeo en 233 de 233. Lo único que NO se mide es el `SOWTargetPct` —es una meta, y derivarla del resultado dejaría el gap siempre en cero— |
| `CARTERA` | A24 | `datasets/cartera.js` | Estructura comercial (código, nombre, equipo, **jefatura**, zona, sucursal) y asignación de cada cliente a su ejecutivo. La asignación se **mide** del `Ejecutivo` que ya declara el A5, para que el activo nuevo no contradiga al que la app venía leyendo; el archivo la vuelve a llavear por **código** y no por nombre |
| `VERIFICACION` | A10 | `datasets/verificacion.js` | Variables del predictor de verificación por par cliente-deudor. La **factura típica** del par se mide en DTESync; la **frecuencia mensual** con que el par factura y la **fracción que cede** se modelan por perfil de la relación —la ventana del A1 son 47 días con ~2 facturas por par, una muestra corta y no la relación—, nunca por debajo del ritmo que la ventana muestra. De ahí salen la venta mensual (V04) y lo comprado en 3M (V03). **V10 es del DEUDOR**, no del par: lo que le pagó al factoring en 3M sumando todos sus cedentes, como pide la política («que operó una sola vez con Security»). La nota del deudor se **lee del A16 ya generado** para que los dos activos no puedan divergir |

## Una cesión tiene que apuntar a una factura que existe

`AECSYNC` era un dataset **base** y no reconciliaba con `DTESYNC`. Medido sobre la entrega anterior: de
sus **1.300 cesiones sólo 3** referenciaban un folio que el A1 declara para ese mismo cedente, aunque
los 258 cedentes sí son emisores del A1 y los rangos de folio se solapan. Y **1.267 tenían fecha
anterior a la emisión** del documento que decían ceder.

No es un detalle de realismo. Una cesión sin documento no se puede atribuir a nada, así que todo lo que
cuelga de ella se terminaba inventando en el pipeline: «cedida a terceros» salía de un hash del folio,
`perdidaCesion` de un `rndDetBool(id, 0.12)` y `cedidasOtro` quedaba siempre en 0. **Inventar un valor
no sólo produce cifras falsas: tapa el hueco del dato que las haría notar.**

Reglas que el módulo impone, todas medibles contra el A1: sólo documentos a crédito, sin nota de
crédito ni reclamo, y cada documento cedido una sola vez. Más los **dos invariantes**, que se
comprueban antes de escribir y hacen fallar la corrida si no se cumplen:

1. **La fecha de cesión no es anterior a la emisión.** No se cede una factura que no se emitió.
2. **El monto cedido es igual o menor que el del documento.** La cesión parcial existe —se cede parte
   del crédito y el resto queda con el cliente—; ceder más sería transferir un crédito que no existe.

Se validan **acá** y no aguas abajo porque es el único punto donde todavía se pueden arreglar: un
consumidor que reciba `MontoCesion > MontoDocumento` no tiene con qué. Y una cota hay que
**ejercitarla**: la entrega anterior tenía las 1.300 cesiones por el total exacto, así que el segundo
invariante se cumplía sin que nada lo probara — hoy 160 son parciales.

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
por TGR en otorgamiento; y en el predictor, con una factura en la oferta, **la mitad de los pares queda
verificada por modelo** (49,8% PRIME · 50,3% OTROS, medido el 17-09-2026 sobre los 13.302 pares del A10 con
facturas en el libro) y la otra mitad va al teléfono. Los dos criterios que antes lo impedían —V04 y V10—
pasan 80% y 90% en PRIME, 82% y 93% en OTROS; el resto lo deciden V02, V05, V07 y V08 por perfil.

## Regenerar un solo derivado

`node GeneradorDatos/generar.js --solo=VERIFICACION` regenera únicamente ese bloque y conserva los demás tal
como vienen en la entrada. Existe porque **la cadena `AECSYNC → SHARE_OF_WALLET → AECSYNC` no tiene punto
fijo**: `cesiones.js` lee el A5 del archivo de entrada como intención de participación, y el A5 se vuelve a
medir sobre el A2 recién escrito, así que una corrida completa **mueve ~150 cesiones de cesionario aunque
nada haya cambiado** (medido el 17-09-2026: 153 de 7.480 en la primera corrida y otras tantas en la
segunda; A5 y A11 arrastran el cambio). Mientras eso no se cierre, un cambio en otro activo no debe
llevarse esa deriva en el mismo commit.

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
