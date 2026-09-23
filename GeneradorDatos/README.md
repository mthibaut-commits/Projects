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

La generación es **determinista y tiene punto fijo**: dos corridas sobre la misma entrada producen el mismo
archivo byte a byte, y una corrida sobre `datos_inyectados.js` lo reproduce tal como está commiteado. Se apoya
en `hashStr` + mulberry32 —el mismo azar estable que usa el pipeline— y en que ningún derivado vuelve a leer lo
que él mismo midió en la entrega anterior (abajo, «La intención de participación»). El gate
`tests/contract/generador.test.mjs` corre la cadena entera en proceso y exige que cada bloque salga igual.

## Datasets

**Base** — rescatados del build original, se copian sin tocar:

| Dataset | Qué es |
|---|---|
| `DTESYNC` | El **log de notificaciones** del A1: 30.000 facturas electrónicas emitidas en **55.549 eventos** (la creación de cada una, y después cada cambio de estado —21.974 acuses · 2.088 reclamos · 1.487 notas de crédito— como `DTE_ACTUALIZADO`). Los módulos reciben los **documentos**: `derivar` pliega el log una vez con `lib/dtesync.js` (abajo, «El A1 es un flujo de eventos») |
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
| `AECSYNC` | A2 | `datasets/cesiones.js` | **El registro completo de cesiones y el maestro de la participación** (7.480; traía 1.300 mientras el A5 declaraba 9.104 en sus series). Cada una apunta a un **documento real del A1** de su cedente y copia sus campos. Se cede una fracción del pool CEDIBLE de cada cliente; el cesionario sale del padrón `lib/cesionarios.js` por un panel de 2 a 4 contrapartes, y qué parte va a nosotros lo fija la **intención de participación** declarada en `lib/intencion_sow.js` — que después se mide en el A5. A2 no lee A5 ni su propia entrega anterior: es lo que le da al generador su punto fijo |
| `SHARE_OF_WALLET` | A5 | `datasets/share_of_wallet.js` | **Se MIDE sobre AECSync**, que corre antes: la serie semanal con sus montos, la participación actual, la tendencia, el gap, el estado y el diagnóstico salen de las cesiones. Antes A2 y A5 respondían la misma pregunta por caminos independientes y discrepaban **13,8 pto en la mediana**; hoy calzan dentro del redondeo en 233 de 233. Lo único que NO se mide es el `SOWTargetPct` —es una meta, y derivarla del resultado dejaría el gap siempre en cero— |
| `CARTERA` | A24 | `datasets/cartera.js` | Estructura comercial (código, nombre, equipo, **jefatura**, zona, sucursal) y asignación de cada cliente a su ejecutivo. La asignación se **mide** del `Ejecutivo` que ya declara el A5, para que el activo nuevo no contradiga al que la app venía leyendo; el archivo la vuelve a llavear por **código** y no por nombre |
| `VERIFICACION` | A10 | `datasets/verificacion.js` | Variables del predictor de verificación por par cliente-deudor. La **factura típica** del par se mide en DTESync; la **frecuencia mensual** con que el par factura y la **fracción que cede** se modelan por perfil de la relación —la ventana del A1 son 47 días con ~2 facturas por par, una muestra corta y no la relación—, nunca por debajo del ritmo que la ventana muestra. De ahí salen la venta mensual (V04) y lo comprado en 3M (V03). **V10 es del DEUDOR**, no del par: lo que le pagó al factoring en 3M sumando todos sus cedentes, como pide la política («que operó una sola vez con Security»). La nota del deudor se **lee del A16 ya generado** para que los dos activos no puedan divergir |

## El A1 es un flujo de eventos por documento

Desde el 23-09-2026 (ADR-0020, regla 74) el bloque `DTESYNC` no es «una fila por documento con su estado final»
sino el **log de notificaciones** del servicio, en orden de llegada: cada fila es un evento con `Secuencia` (1..n
por documento) y `FchNotificacion`. La **creación** (`DTE_SINCRONIZADO`, secuencia 1) trae el documento entero y
`EstadoDTE` sin banderas; cada cambio posterior (`DTE_ACTUALIZADO`) trae la identidad (`RUTEmisor`, `TipoDTE`,
`Folio`), el envoltorio y el `EstadoDTE` **acumulado**, y no repite el documento. Es lo que el usuario definió:
«los eventos de dtesync llegan varias veces para la misma factura: una vez se crea, después puede llegar nota de
crédito, después aceptación».

`lib/dtesync.js` tiene las tres funciones, puras: **`plegar(eventos)`** deja un documento por (emisor, folio) con
el estado del evento más nuevo, cualquiera sea el orden de llegada, y los devuelve por folio (el orden que el
activo plano traía); **`expandir(documentos)`** hace lo inverso para la migración; **`validarLog`** dice qué tiene
que cumplir un log para que plegarlo signifique algo. `derivar` pliega **una vez** y entrega los documentos a los
módulos en `DTESYNC`: ningún módulo recorre el log. La aplicación pliega con la misma función (`plegarDTE`), y el
gate `tests/contract/regla_74.test.mjs` las corre a las dos sobre el mismo log y exige el mismo resultado;
`tests/contract/dtesync.test.mjs` exige que el bloque commiteado valide como log.

La migración fue **`migrar_dtesync_eventos.js`**, una sola vez y commiteada como `migrar_padron.js`: cada documento
se expandió en su creación y una actualización por bandera, fechada de forma determinista dentro de la ventana del
negocio (acuse y reclamo hasta 8 días desde la emisión, NC hasta 30) y nunca después de la recepción del batch
—la entrega original traía las tres fechas como constantes posteriores al corte—. Los derivados salieron byte a
byte iguales: el pliegue reproduce el documento y ninguno lee las fechas de las banderas.

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

## La intención de participación, y por qué el generador tiene punto fijo

El A1 dice qué documentos existen y cuáles se pueden ceder, pero no quién los financió. Qué proporción de lo
que cede cada cliente va a nosotros —semana a semana— es la única entrada del A2 que no se mide: es una
**intención de generación**, y vive declarada en `lib/intencion_sow.js` (233 clientes con su trayectoria en %,
más 25 cedentes que el A5 no sigue y ceden con un perfil estable por RUT). `cesiones.js` la lee para sortear
el cesionario de cada documento; `share_of_wallet.js` **mide** después lo que quedó escrito. Que el SOW medido
difiera unas décimas de la intención es correcto: es el cociente real de un registro discreto.

Hasta el 17-09-2026 la intención se tomaba de los campos **medidos** del A5 (`SOWActualPct`,
`HistoricoSemanal[].SOWPct`), que el A5 volvía a medir sobre el A2 recién escrito, y los cedentes se
completaban con el A2 anterior. Un sorteo por documento no reproduce su propio umbral, así que cada corrida
completa movía cesiones de cesionario sin que nada hubiera cambiado —153 de 7.480, luego 67, luego 33:
convergía y no llegaba— y A5 y A11 se movían con ellas. Los números del archivo se congelaron con la
trayectoria que produjo las cesiones vigentes, así que cerrar el bucle no movió ninguna.

Para cambiar la historia de un cliente —que se esté yendo, que entre uno nuevo, que deje de ceder— se edita
ese archivo y se regenera completo. La meta comercial (`SOWTargetPct`) no va ahí: es del A5 y no se mide.

`node GeneradorDatos/generar.js --solo=VERIFICACION` regenera únicamente ese bloque y conserva los demás tal
como vienen en la entrada: sirve para probar un módulo en aislamiento, no para proteger a los otros — con el
punto fijo, una corrida completa sólo cambia lo que el módulo tocado cambia.

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
