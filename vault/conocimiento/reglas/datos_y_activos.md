---
type: conocimiento
title: "Reglas — Datos y activos: el pipeline lee, no genera"
description: "El libro de ventas, las fechas del documento, las facturas y cesiones que salen del archivo, el mix de financiamiento medido en A2 y publicado en A11, A5 derivado de A2 y el factoring target como configuración del tenant"
tags: [conocimiento, reglas, dominio]
timestamp: 2026-09-17T15:29:14Z
---

# Datos y activos: el pipeline lee, no genera

> Reglas de dominio de NEX, **verbatim** desde el `CLAUDE.md` anterior al 17-09-2026, agrupadas por tema. Se citan por su número (`regla 13-bis`) y **no se renumeran**: el fuente y otros documentos las referencian así. Índice de todas, con qué caso de la suite verifica cada una: [`invariantes.md`](../invariantes.md).
>
> Reglas en este archivo: **13-bis** · **13-ter** · **13-quater** · **13-quinquies** · **13-nonies** · **13-undecies** · **13-duodecies** · **69** · **70**.

13-bis. **El LIBRO DE VENTAS no depende de la oferta** (`candidatasLibro`, 14-09-2026). Es lo que el cliente **emitió**: no cambia porque nosotros elijamos qué comprarle. El folio más alto se anclaba sobre las facturas ya incluidas (`Math.max(...enOferta, ...reales)`) y de ese folio cuelga **todo** —el folio de cada documento, y del folio salen por hash su **deudor** y su **monto**—, así que incorporar una factura corría el ancla y **re-sorteaba el libro entero**: el mismo deudor mostraba dos facturas antes de agregar y siete después, con folios y montos que no existían un segundo antes. El ancla sale ahora **sólo de la identidad de la operación**, que es lo único inmutable ahí: cualquier dato del negocio que se pueda editar reintroduce el defecto. Se resigna que el folio más nuevo quede sobre lo ya en oferta —realismo que costaba la estabilidad del pool— y los choques con folios reales los sigue saltando `usados`. **Y el ancla estable deja un cabo:** el libro volvería a generar la factura recién incorporada y el documento aparecería **dos veces**, una en la oferta y otra en «otras facturas de este deudor»; para eso sirve `enOferta` —excluir, no anclar—, que es lo que hace ahora. Caso 92.

13-ter. **Las FECHAS de la factura son un dato del documento, no una derivación de la pantalla** (14-09-2026). El usuario lo dijo entero: «esas no pueden cambiar entre una pantalla y otra, y los montos, folios, rut, razón social… la factura se carga y debe persistir en el build». La fecha de emisión salía de `new Date(Date.now() - (hashStr("em" + folio) % 20 + 3) * 86400000)` en **tres** sitios del detalle, más una cuarta fórmula por `diasEmision` en la tabla de candidatas y una quinta por id en `diasEmiCand`. Dos consecuencias, las dos visibles: el **reloj** —la misma factura decía 09-09 hoy y 10-09 mañana, y una captura de ayer ya no reproducía— y el **desacuerdo** —`f.candidata ? diasEmision : hashStr("em"+folio)`, o sea el mismo folio con una fecha en «Deudores disponibles» y otra al incorporarlo a la oferta—. Mientras tanto el activo **A1 trae `FchEmis` y `FchVenc` en cada fila** y el inbound las descartaba fijando **`venc: 45` a mano**: todas las facturas del sistema vencían a 45 días y el prorrateo —que descuenta por plazo— cobraba lo mismo por un documento a 30 que por uno a 90; el activo trae **105 plazos distintos**. La carga manual de XML sí las leía, así que una factura cargada a mano tenía fechas reales y una del inbound no.
    - **Un solo resolver: `fechasDocumento(f)`** → `{emision, vencimiento}` en ISO, y `fmtFechaDoc` para mostrarlas. Orden: lo que el documento TRAE (`fchEmis`/`fchVenc`, del activo) · lo que el libro le estampó · y sólo entonces un respaldo estable por folio. Tener dos fórmulas fue exactamente lo que hizo que el mismo folio mostrara fechas distintas en dos pantallas, así que la corrección no es arreglar las cinco sino **dejar una**.
    - **`corteDTE()` es el ancla: la emisión más reciente que trae el batch.** Es una propiedad del DATO, no del reloj. De ahí cuelgan los documentos sintéticos del libro de ventas y los tres generadores del alta manual (`corteMs()`), que anclaban en `Date.now()` y corrían el libro del cliente un día cada día.
    - **`plazoDTE(r)` es la resta de las dos fechas del activo**, y el inbound lo usa en vez del 45 cableado. `diasEmiCand` —la antigüedad que descarta una factura recién emitida al publicar— se MIDE contra la emisión y el corte, en vez de tener su propio sorteo.
    - Verificado en el DOM, no sólo en el test: 51 folios vistos en más de una pantalla, **cero conflictos**, y las facturas que se mueven de «Deudores disponibles» a la oferta conservan emisión y vencimiento. Caso **93**, que además fija que el resolver no mira el reloj (se adelanta `Date.now` 40 días y devuelve lo mismo).

13-quater. **LAS FACTURAS SALEN DEL ARCHIVO. El pipeline no genera datos: los lee y los procesa** (14-09-2026). Es la regla que el `README.md` del generador ya escribía, y tres sitios la rompían.
    - **`candidatasLibro` SINTETIZABA el libro de ventas**: 40–80 facturas por operación, con el folio salido de `hashStr(deal.id)` y, colgando del folio, el **deudor** y el **monto**. O sea que «Deudores disponibles» y «otras facturas de este deudor» mostraban documentos que no existen en ningún activo —razones sociales y montos inventados— al lado de las facturas reales que el inbound sí leía del A1. Ahora lee **`libroPorEmisor()`**, un índice del A1 por `RUTEmisor`: el archivo trae 30.000 facturas de 500 emisores (37 a 85 por cliente, mediana 60, con 23 deudores distintos cada uno), o sea exactamente un libro de ventas. `ventanaLibroDias` pasó de dimensionar el generador a **filtrar** el archivo por antigüedad. **Un cliente que el archivo no declara no tiene libro** —antes se le sintetizaba uno completo, que es la forma más silenciosa de inventar: una pantalla llena de documentos plausibles—.
    - **`estadoCandidata` SORTEABA el estado del documento** (`hashStr("estCand" + folio) % 100`): una factura real se declaraba «anulada por nota de crédito» o «cedida a terceros» porque su folio caía en un tramo del hash, y ~29% de todo lo que mirara quedaba bloqueado. Ahora cada motivo sale de un activo: **`notaCredito`** y **`reclamada`** de `EstadoDTE` del A1 (1.487 y 2.088 de 30.000), **`cedida`** del join con AECSync (A2) por `RUTCedente`+`Folio`. **«Reclamada por el deudor» no se mostraba nunca** y es justamente lo que impide comprar el documento. Lo único que NO sale del archivo es **`otraOp`** —qué documento tomó ya otra operación nuestra no es un hecho del SII sino de este sistema—: entra por parámetro como el veto de la verificación, con `FOLIOS_EN_OPERACION` como registro del módulo.
    - **La nota de crédito PARCIAL se retiró.** El layout del A1 trae `NotaCredito` y `FolioNotaCredito` pero **no el monto**, así que no se puede saber cuánto rebaja. Se inventaba («20% a 49% del monto») y la factura se agregaba a la oferta por ese neto: una cifra sin origen entrando al monto a girar. Mientras el activo no declare `MntNotaCredito` —anotado como hueco del layout—, un documento con nota de crédito no se compra.
    - **El asistente de alta manual también inventaba** (`genFacturasCliente` sorteaba 6–13 facturas con `rndDet`; `genFacturasIncorporar`, las que hicieran falta para cuadrar un monto objetivo, más cuatro «extra»). Los dos leen ahora el mismo libro vía `facturasDelLibro(rutEmisor, excluir)`, y la oportunidad que crea el asistente queda con su `rutEmisor` —sin él no tenía libro ni líneas—.
    - **Un solo constructor: `facturaDeDTE(r)`.** El mismo objeto literal estaba escrito en tres sitios y lo que se agregaba en uno faltaba en los otros —así el inbound descartaba `FchEmis`/`FchVenc`—. Sale de él todo lo que es del documento, incluido su estado. Lo mismo con `sectorDeDeudor(tipo, hist)`.
    - **Hueco medido, y se arregla en el GENERADOR, no acá:** de las **1.300 cesiones de AECSync sólo 3 referencian un folio que el A1 declara** para ese mismo cedente, aunque los 258 cedentes sí son emisores del A1 y los rangos de folio se solapan. Las dos entregas se produjeron con folios independientes, así que «cedida a terceros» casi nunca se gatilla — no porque no haya cesiones, sino porque no se pueden atribuir a un documento. Antes no se notaba porque el estado se sorteaba. Si el pipeline «resolviera» la discrepancia, volvería a inventar el dato.
    - Verificado en el DOM además de en la suite: **51 folios en pantalla, los 51 que el activo declara para ese cliente, cero inventados**, y los estados visibles son los reales (5 reclamadas, ninguna «NC parcial»). Caso **94**.

13-quinquies. **UNA FACTURA CEDIDA ES UNA FACTURA QUE EXISTE** (14-09-2026). El corolario del anterior, y el usuario lo pidió con esas palabras: «las facturas cedidas no se pueden inventar, deben ser facturas del pool de facturas generadas; revisa en todas partes donde se usan las cesiones». **AECSync (A2) era un dataset BASE con folios propios**: de sus **1.300 cesiones sólo 3** referenciaban un folio que el A1 declara para ese mismo cedente —aunque los 258 cedentes sí son emisores del A1 y los rangos de folio se solapan—, y **1.267 tenían fecha ANTERIOR a la emisión** del documento que decían ceder.
    - **Una cesión sin documento no se puede atribuir a nada**, así que todo lo que cuelga de ella se inventaba aguas abajo, en tres sitios distintos: «cedida a terceros» salía de un hash del folio, **`perdidaCesion` era `rndDetBool("aec|"+id, 0.12)`** —el 12% de las oportunidades de un cedente que alguna vez cedió se perdían por sorteo, sin que NINGUNA de sus facturas estuviera cedida— y `cedidasOtro` quedaba siempre en 0 mientras la UI lo leía en dos lugares.
    - **Se arregló en el GENERADOR**, no en la aplicación: `GeneradorDatos/datasets/cesiones.js`, y el **A2 pasó de base a derivado**. Cada cesión apunta a un documento real de su cedente y copia sus campos del A1 (folio, emisión, monto, receptor, vencimiento); lo propio de la cesión —a qué factoring, cuándo, con qué correo— se conserva de la entrega anterior, que es lo que la deja reconocible: los mismos siete factoring con los mismos pesos. Reglas de plausibilidad, todas medibles: sólo documentos a **crédito**, sin nota de crédito ni reclamo, **un documento se cede UNA vez** —dos cesiones del mismo folio serían dos dueños del mismo crédito— y la fecha de cesión **después** de la emisión. Medido: **1.300 de 1.300** reconcilian, 0 anteriores a su emisión, 0 folios dobles, 0 sobre documentos no cedibles.
    - **El pipeline ahora lo LEE**, en los cuatro sitios donde las cesiones importan. `cesionesPorDocumento()` indexa por `RUT del cedente|folio`: `estadoCandidata` bloquea con el **nombre del factoring y la fecha** —y distingue **«Ya financiada»** cuando la cesión fue a nosotros, que no es competencia sino cartera propia—; `cesionesAjenasDeDeal(deal)` cuenta las facturas de ESA oferta que se llevó otro; la pérdida por cesión ocurre cuando se la llevaron **toda** y, si es una parte, queda en `cedidasOtro` y la oferta sigue con el resto; y `aecCompetidorDe` nombra al factoring que tocó SUS facturas en vez de elegir uno con `hashStr(deal.id) % lista.length`.
    - **Dos sitios más que inventaban, encontrados al revisar:** `motivoExcl` marcaba como cedidas **las primeras N facturas de la lista** (`fi < deal.cedidasOtro`), así que reordenar la oferta cambiaba cuáles figuraban cedidas — la cesión es de un FOLIO y el A2 dice cuál; e `itemizarFacturas`, el respaldo para operaciones sin `facturasOp`, inventaba el folio (`10000000 + hash % 8999999`) y hasta el **estado** del documento (`reclamada: h % 17 === 0`, `notaCredito: h % 23 === 0`) — un reclamo que el SII nunca registró. Ahora toma documentos del libro del cliente, y cuando no hay uno para esa posición la factura entra **marcada como sin documento** en vez de llevar un folio que parece real.
    - **Los DOS invariantes del activo, comprobados en el generador antes de escribir** (14-09-2026, a pedido del usuario: «la fecha de cesión no puede ser anterior a la fecha de emisión y el monto de cesión debiera ser igual o menor que el de la factura»). **(1)** No se cede una factura que no se emitió. **(2)** El monto cedido es **igual o menor** que el del documento: la **cesión parcial** existe —se cede una parte del crédito y el resto sigue siendo del cliente— pero ceder MÁS sería transferir un crédito que no existe. Se validan en `cesiones.js` y una cesión que los rompa **no sale del generador**: es el único punto donde todavía se pueden arreglar, porque un consumidor que reciba `MontoCesion > MontoDocumento` no tiene con qué. **Y la cota «o menor» hay que EJERCITARLA**: la entrega anterior tenía las 1.300 cesiones por el total exacto, así que el invariante se cumplía sin que nada lo probara — ahora **160 son parciales** (12%, entre el 30% y el 95% del documento). El pipeline las lee: una cesión parcial deja el documento con dos dueños, así que se bloquea igual pero el mensaje dice por cuánto —«Cedida en parte · …a Tanner Servicios Financieros el 2026-06-22 **por M$147,3 de M$171,6** (cesión parcial)»—, que es lo que el ejecutivo necesita para decidir si vale la pena pedirle al cliente que la resuelva. Y lo que se llevó el otro factoring es el monto **cedido**, no el del documento: sumar el total inflaría la pérdida.
    - **Y lo que el A11 DERIVA de las cesiones estaba mal derivado** (lo destapó la pregunta del usuario, «Plataforma 360 ¿por qué trae cesiones?»). No trae cesiones: trae tres campos que se MIDEN sobre ellas —colocación promedio 12m e historia como cliente—, que su spec declara y que son atributos de la EMPRESA. Pero el fold guardaba el **máximo** de las fechas de cesión y lo escribía en `FECHA_PRIMERA_OPERACION`: una empresa que nos cede hace dos años figuraba como cliente estrenado el mes pasado, al revés de para lo que ese campo sirve al decidir. Y `FECHA_INGRESO` se generaba por hash sin mirarla, así que podía quedar **después** de la primera operación — un cliente que operó antes de existir. Corregido: el fold guarda las dos puntas, «primera» toma el mínimo y el ingreso se acota. Medido sobre los 233 clientes con colocación: 233 correctas, 0 ingresos posteriores. **Antes de reconciliar las cesiones esto no se podía ni comprobar.** Lo que sí sigue generándose por perfil es el pricing histórico (`TASA_ULT_OP_PCT`, `SPREAD_REAL_12M_PCT`, `COMISION_ULT_OP_M`): una cesión traspasa el crédito, no el precio al que se compró, así que no está en ningún activo — la cesión sólo decide si el campo aplica.
    - Verificado en pantalla: los tooltips dicen «AECSync registra la cesión de este folio a **Eurocapital** el 2026-06-23» y «a **Tanner Servicios Financieros** el 2026-06-22», con las cesiones que el activo declara. Caso **95**, que cubre también lo que el A11 deriva.
    - **(23-09-2026, ADR-0014, regla 64)** La cedida a Security dejó de bloquearse al incorporar: es candidata como cualquier otra y se rotula «Cedida a Security» (el caso 95 ahora fija que ENTRA). La cedida a un factoring ajeno sigue bloqueada al incorporar y, además, ya no es candidata del inbound: caso **159**. La oferta tampoco la excluye ya (`motivoExcl` sólo mira la cesión ajena; gate `regla_64.test.mjs`).

13-nonies. **La columna SOW del tubo: el MIX DE FINANCIAMIENTO lo MIDE el A2 y lo PUBLICA el A11** (15-09-2026, pedido del usuario). La fila de la tabla se lee de corrido: cuánto hay que comprarle (Oportunidad), **con quién se compite por eso** (SOW) y qué produce simularlo (Simulación).
    - **El DATO son cuatro porciones que suman 100** —«Otros factoring», «★ Security», «Factoring target», «Otros bancarios»— con el desglose por cesionario (razón social y %). **Lo que la columna DIBUJA son los cesionarios**, no las porciones (15-09-2026, pedido del usuario): la pregunta es con quién se compite y para eso «Otros bancarios · 22%» no sirve para llamar a nadie, «Banco Santander · 14%» sí. Ver 13-quindecies.
    - **TODA CESIÓN ES FACTORING**, y ésa fue la premisa que hubo que corregir a mitad de camino. Un banco que compra una factura está haciendo factoring, y **AECSync registra todas las cesiones, bancarias y no bancarias**, identificando en cada una al cesionario — el usuario lo dijo así: «AECSync registra todas las cesiones sean Bancarias, no bancarias, por lo que es desde ahí donde debe provenir esta información». O sea que el activo contesta la pregunta ENTERA. El primer intento trató «bancario» como deuda fuera del factoring, concluyó que ningún activo la traía y **generó esa porción por perfil**: inventar un dato porque se buscó en el activo equivocado.
    - **Quién mide qué.** **A2** mide cómo se reparte entre contrapartes —es el único que identifica al cesionario—. **A5** dice cuánto es nuestro, y el mix se **ancla** a su `SOWActualPct` en vez de recalcularlo: es la cifra que ya alimenta el descuento por SOW del **pricing**, el dimensionamiento de líneas y el churn, y recalcularla dejaría el mismo número con dos valores en dos pantallas. **A11** lo publica: se inyecta ahí y de ahí lo lee la pantalla («esta información se inyectará en Plataforma 360 y será desde ahí desde donde se obtendrá la información para pintar esos campos»), el mismo camino que `COLOC_PROM_12M_M` y `FECHA_PRIMERA_OPERACION`.
    - **El hueco que esto destapó quedó CERRADO el mismo día** (ver 13-undecies): A2 y A5 medían la misma cifra con 13,8 pto de desvío mediano. El negocio decidió que A2 es el maestro y A5 se deriva de él, así que la porción propia del mix ya no se «ancla» a un activo distinto: los dos salen del mismo registro.
    - **El padrón de cesionarios clasifica por RUT** (`GeneradorDatos/lib/cesionarios.js`, espejado en el fuente como `CESIONARIOS_CAT`): `banco`, `target` —política comercial del tenant, no propiedad del cesionario— y `nuestro`. De esos tres atributos sale la partición de cuatro porciones, exhaustiva y disjunta. Un RUT que el padrón no declara cae en «otros factoring» y la corrida lo **grita**: es un padrón desactualizado y en silencio se ve igual que un dato correcto. **El activo necesitaba bancos:** traía siete cesionarios y los dos bancarios eran justamente el target, así que «Otros bancarios» no tenía de dónde salir — el reparto de cesionarios pasó a un **panel por cedente** (2 a 4 contrapartes, pesos decrecientes) sobre un padrón de 15 que incluye banca fuera del target.
    - **Un DEUDOR no tiene mix: `null`, no cuatro ceros.** No cede facturas, así que la pregunta no le aplica. En pantalla es «Sin medición».
    - **Orden descendente y una porción en CERO no se dibuja** (`mixSowVisible`, de nivel módulo y no dentro del `map` de la celda, porque una regla escrita dentro de un JSX no se puede probar) — **salvo la nuestra**, que se muestra siempre aunque sea 0%: «no nos cede nada» es justamente lo que el ejecutivo vino a leer. El detalle de un chip es **exactamente** la suma de sus cesionarios: el 100 se reparte una sola vez y las porciones se agregan desde el detalle, porque al revés los dos redondeos por separado dejan el tooltip diciendo 21,9 donde el chip dice 22.
    - Caso **99**. Y destapó un defecto viejo: el clasificador por trozo de razón social ponía a **Eurocapital** entre los factoring de banco (ver regla 16).

13-undecies. **A5 se DERIVA de A2: la misma cifra se cuenta una sola vez** (15-09-2026, decisión del usuario: «tienes que hacer que A5 y A2 sean iguales; primero genera A2 y luego genera A5 con los resultados de A2»).
    - **El problema, medido:** los dos activos respondían la misma pregunta —cuánto de lo que cede el cliente se lo lleva Security— por caminos independientes, y discrepaban **13,8 pto en la mediana y 61,8 en el p90** sobre los 233 clientes que ambos cubren: **A5 decía 97,7% donde A2 medía 5,1%**. Y esa cifra decide el descuento por SOW del **pricing**, el segmento de churn y los KPI del dashboard. Nadie lo medía porque A5 era un dataset BASE y A2 no reconciliaba con el A1 hasta el 14-09.
    - **La decisión aplica el criterio del Levantamiento §5**: el maestro es el activo cuyo SUJETO es el del campo. El sujeto de «cuánto de lo cedido se llevó cada quién» es la **cesión**, y A2 es su registro; lo de A5 es el **análisis** sobre esos hechos. El generador produce A2 y después **mide** A5 sobre él. Resultado: **233 de 233 clientes calzan dentro de 0,05 pto**, que es el redondeo a un decimal con que se publican los porcentajes. Caso **101**, que fija también que la serie semanal cuadre **monto a monto** —si sólo cuadrara el total, A5 podría repartir mal en el tiempo y la tendencia, que es lo que decide el descuento, saldría de una trayectoria inventada—.
    - **A2 dejó de ser una MUESTRA.** Traía 1.300 cesiones mientras A5 declaraba **9.104** en sus series: el analítico afirmaba siete veces más operaciones de las que el registro contenía, y con **0,63 cesiones por cliente-semana** no hay serie semanal que medir. Ahora son **7.480**, cediendo una fracción real (45–85%) del pool CEDIBLE de cada cliente.
    - **Los NIVELES de A5 no se pudieron conservar, y no por una decisión sino por ARITMÉTICA:** sólo **114 de 233 clientes** tenían documentos suficientes para sostener lo que declaraban, y el peor pedía **11.579 MM en 61 cesiones teniendo 2.019 MM en 36 documentos** —5,7× más plata de la que emitió—. Un cliente no puede ceder lo que no facturó. **Lo que sí se conservó es la PARTICIPACIÓN, porque es un cociente:** la trayectoria semanal de A5 entra como *intención* al generar A2 —qué proporción de cada semana va a nosotros— y después se vuelve a medir sobre lo escrito. Así quién es buen cliente y quién se está yendo no cambió. Impacto medido en pricing: el SOW se mueve 2,8 pto en la mediana, **38% de los clientes cambian de estado** y el descuento por SOW cambia **0,00 pto en la mediana** (p90 0,10, máximo 0,20).
    - **Lo que NO se mide, a propósito: `SOWTargetPct`.** Es una **meta comercial**, no una observación: derivarla de las cesiones haría que el objetivo fuera siempre igual al resultado y el **gap no existiría nunca**, que es lo único que esa cifra sirve para decir. Lo mismo el segmento, el horizonte y la frecuencia. Se conservan de la entrega.
    - **Dos límites del registro, dichos en vez de disimulados.** (1) La serie cubre **8 semanas** y no 10: el A1 trae emisiones desde el 2026-05-06 y no se puede ceder un documento que no se emitió. Los consumidores toman `slice(-8)` y derivan las semanas del propio dato, así que se adaptan — pero el **eje de semanas es común a todos los clientes**, con las semanas sin cesiones en 0, porque «no cedió nada» es un dato y series de distinto largo no se pueden comparar en el mismo gráfico. (2) `HistoricoMensual` son 13 meses sobre un registro de 2, así que **no es medible**: se conserva su trayectoria pero **anclada** al SOW medido —el último mes ES la cifra medida— para que el gráfico no contradiga al registro. Es reconstrucción declarada, no medición.

13-duodecies. **«Factoring target» es CONFIGURACIÓN DEL TENANT, y el rótulo del chip se arma con ella** (15-09-2026, pedido del usuario: «cambiar factoring target por "BCI - Santander"» y «en la configuración del tenant agrega un configurador para definir las empresas de Factoring target»). BCI es BCI para todos; **a quién se mira de frente lo decide cada factoring**, así que no es un atributo del cesionario sino una política comercial — y mientras viviera en una constante, cambiarla era editar el código y el rótulo de la pantalla podía decir cualquier cosa.
    - **`Configuración › Factoring target`** (`pc_factoring_target_<tenant>`) lista el padrón de cesionarios con **el volumen que el A2 registra de cada uno** —elegir de frente a quien no aparece en el registro es mirar a un competidor que no está compitiendo— y se marca quiénes son target. Higiene igual que roles y áreas: sólo entran RUT que el padrón declara, sin repetidos y **nunca el nuestro**, que movería nuestra propia cartera al balde de la competencia. Auditoría con el antes y el después. El default es **BCI Factoring · Banco Santander**.
    - **El rótulo se DERIVA** (`targetEtiqueta()`): con los nombres cortos de quienes estén adentro —«BCI - Santander»—, los dos primeros y el resto contado si son más, y el detalle completo en el tooltip. Las glosas del churn enumeran con `targetNombres()` por la misma razón: escritas a mano decían «BCI · Banco de Chile · Itaú» mientras la clasificación decía otra cosa, o sea que la alerta comercial acusaba a tres que no habían participado. **Un rótulo escrito a mano nombra a quien quiera.**
    - **Se configura la PARTICIÓN, nunca la MEDICIÓN.** El A2 mide cesión por cesión quién se llevó qué y el A11 publica ese detalle (`SOW_DETALLE_JSON`); los cuatro agregados del archivo se calculan con el padrón **por defecto** y la aplicación **reagrupa al leer** con lo que el tenant declare. Si la partición viniera resuelta del archivo, mover la perilla no cambiaría nada. Consecuencia que el caso 103 fija: al mover el target, **la porción propia y el total ajeno no se mueven** — sólo cambia en qué balde cae cada cesionario.
    - **`target` se evalúa ANTES que `banco`**, así que un target no bancario cae en su porción y la partición sigue siendo exhaustiva y disjunta. Sin target configurado la porción no se dibuja y su volumen se reparte entre las otras tres: es un estado válido, no un error.
    - **Y hubo que mirar el cache**, como siempre que se cablea una perilla (regla 9-bis): `mixSowDeal` memoiza por cliente porque el tubo dibuja ~100 filas, así que guardar invalida (`invalidarMixSow`). Sin eso la pantalla seguiría mostrando la partición anterior y el mantenedor se vería decorativo.
    - La suite encontró una asimetría al escribirla: `cargarFactoringTarget` deduplicaba y `guardarFactoringTarget` no, así que un RUT repetido sobrevivía hasta el próximo arranque y ahí desaparecía solo. Leer y escribir aplican **la misma** higiene.

32. **El generador tiene PUNTO FIJO: `datos_inyectados.js` commiteado es lo que una corrida completa produce, byte a byte** (17-09-2026, pedido del usuario: «arregla el bucle A2 → A5 → A2 del generador»). Lo que un derivado necesita y no se mide vive **declarado** —la intención de participación en `GeneradorDatos/lib/intencion_sow.js`, el padrón de cesionarios en `lib/cesionarios.js`—; de su propia entrega anterior un derivado toma sólo lo que **conserva** (la ficha del A5, los campos estructurales de las líneas), nunca lo que **mide**.
    - **El bucle, medido:** `cesiones.js` tomaba la intención de participación de los campos MEDIDOS del A5 (`SOWActualPct`, `HistoricoSemanal[].SOWPct`) y completaba el conjunto de cedentes con el A2 anterior; `share_of_wallet.js` volvía a medir sobre el A2 recién escrito. Un sorteo por documento no reproduce su propio umbral: cada corrida completa movía cesiones de cesionario sin que nada cambiara —**153 de 7.480, luego 67, luego 33**: convergía y no llegaba— y A5 y A11 se movían con ellas. El encabezado del generador decía «determinista» y no lo era; `--solo` se había agregado como rodeo.
    - **La intención se congeló con la trayectoria que produjo las cesiones vigentes** —el A5 tal como iba en la entrada de la última regeneración del A2 (`fd70d76`, la primera medición sobre el registro)—, y por eso cerrar el bucle **no movió una sola cesión**: A2, A5 y A11 salieron iguales byte a byte. El archivo trae 233 clientes con `actual` y `semanas` en %, y 25 cedentes «sin ficha» que ceden con un perfil estable por RUT. Cambiar la historia de un cliente es editar ese archivo y regenerar completo. Las alternativas descartadas (re-sortear por semilla, columna en el A5, iterar hasta converger, congelar la medición vigente) están en ADR-0003.
    - **El gate `tests/contract/generador.test.mjs`** corre la cadena entera en proceso sobre el archivo commiteado y exige que cada bloque derivado salga igual —basta una corrida: si f(x) = x, f(f(x)) = x—, y que `cesiones.generar` dé lo mismo con y sin A2/A5 en la entrada. Rompe si se cambia un módulo sin regenerar, o si un módulo vuelve a leer su propia salida. `--solo` sigue existiendo para probar un módulo en aislamiento, no para proteger a los demás bloques.

42. **LA IDENTIDAD ES REAL Y VIENE DEL PADRÓN; LA TRANSACCIÓN ES SINTÉTICA** (20-09-2026, decisión del usuario: «no inventes los RUT, toma pares de RUT y razón social que sean reales». ADR-0007).
    - **El número de regla salta de 37 a 42 a propósito.** `main` ya había tomado 36, 37, 38 y 39 para el tema `portada_y_sesion` y 40 para la Bandeja Inbound, mientras esta rama tomaba 36 y 37 por su cuenta: es la deuda del tablero —«dos sesiones paralelas toman el mismo siguiente entero libre; quien mezcla después renumera»— y acá se paga por adelantado en vez de crear una tercera colisión. La 41 queda **reservada** para la regla de giro que esta rama numeró 37.
    - **Qué entra y qué no.** El par `RUT ↔ razón social` es registro público —viaja en cada factura electrónica— y vive en `GeneradorDatos/lib/padron.js`, igual que las 15 instituciones de `lib/cesionarios.js`. De las 411.526 cesiones del AEC **no entra ni una**: ni folio, ni monto, ni fecha, ni quién cedió a quién. Eso es la cartera comercial del factoring. Las operaciones se siguen generando sintéticas y deterministas (regla núcleo 9). **El AEC no se commitea**; el extractor sí.
    - **Ninguna persona natural.** El AEC trae empresarios individuales con nombre completo y RUT: **93**, excluidos. El corte es `RUT < 50.000.000`, medido: de los 93 bajo 30M ninguno lleva marca societaria, entre 30M y 50M no hay ninguno, y los 9 del tramo 50–60M son el 100 % sociedades —por eso el umbral no es 60M, que habría perdido empresas reales—.
    - **El padrón es la ÚNICA fuente**, y son cuatro listas disjuntas: 741 deudores, 500 clientes, 45 prospectos del stream y 697 proveedores. Un RUT en dos listas rompe lo que los joins del activo afirman.
    - **La identidad vive en más de un archivo, y eso costó dos corridas.** `lib/intencion_sow.js` declara por RUT quién cede: migrar el activo sin migrarlo a él dejó **AECSYNC en CERO filas** sin un solo error, porque «este cliente no tiene documentos cedibles» es una condición legítima. Y `proveedores_clientes.json` trae 697 proveedores que no están en el A1: faltando ellos, el caso **121** cayó con «candidatas 0». Los dos son ARCHIVOS LIGADOS y se migran en la misma pasada, con el mismo mapa.
    - **Se mapea por RUT, nunca por nombre.** En el activo sintético había **50 razones sociales compartidas por dos RUT distintos** («Constructora RM SA» era 39663693-3 y 41604007-5): un reemplazo por nombre las habría fusionado. El nombre se deriva siempre del RUT que tiene al lado (`spec_aecsync.md` §81: «la identidad es el RUT, no el nombre»), y de paso las 50 colisiones desaparecen.
    - **Lo que esto arregló, medido.** Antes: 51,5 % de los RUT de deudor fuera del rango de empresa y **39,3 % en rango de persona natural**, con razones sociales reales encima —«Clorox Chile S.A.» llevaba `9.710.034-4`—. Después: **100 % en rango de empresa** y los 1.983 RUT del padrón con dígito verificador válido, que es lo que distingue un RUT real de uno escrito a mano.
    - Gate: `tests/contract/padron.test.mjs` (9 tests, 4 sondas negativas). El punto fijo del generador se conserva (`generador.test.mjs`).

60. **EL MILLÓN ES LA ÚLTIMA CAPA: ningún campo, ningún contrato y ningún mensaje lo nombran** (23-09-2026,
    instrucción del usuario: «Los M$ son siempre visuales, corrige para que las comparaciones sean siempre en $»).
    La regla 9-ter ya decía que una COMPARACIÓN se hace en pesos. Ésta cierra las otras tres puertas por las que
    el millón volvía a entrar: el nombre de un campo, la declaración de un layout y el texto de un mensaje.
    - **El único sitio que divide por un millón es el formateador** (`fmtMM`, `fmtMMc`), y el único que lo
      multiplica no existe: **re-inflar un peso a escala de millones es siempre un error**. Sobrevivía uno:
      `fmtCLP((f.monto || 0) * 1e6)` en el mensaje que se le manda al cliente para pedirle los XML que faltan,
      resto del patrón `amountMM * 1e6` que la migración del 14-09-2026 retiró de todas partes menos de un
      template literal. Ese mensaje le mostraba al cliente **su factura un millón de veces más grande**.
    - **Un campo del layout NUNCA se llama `_MM` ni se declara en `MM$`.** Quedaban tres sitios: `CUPO_SUGERIDO_MM`
      en A3/A4, `LINEA_APROBADA_MM` en A16 —y su línea de unidades, que **autorizaba explícitamente** el sufijo—,
      y tres filas de A11 que declaraban `number (M$)` cuando el generador producía **miles** y el lector
      multiplicaba por mil. Esa última es la peor de las tres: quien implementara la entrega leyendo el layout
      habría enviado cifras **mil veces mayores**, y nada lo habría dicho — un margen de $40.000.000 y uno de
      $40.000.000.000 se ven los dos plausibles en la ficha de una empresa.
    - ~~**El sufijo `_M` (MILES) sí existe y se queda**~~ — **REEMPLAZADO por la regla 61 al día siguiente**:
      consistente sí, pero consistentemente cuantizado de a $1.000. El texto original se conserva porque explica
      el criterio con el que se decidió, que es lo que la 48 corrige. Decía:
      el generador lo produce en miles, el layout lo dice y el lector lo pasa a pesos antes de formatear. Lo que
      no puede pasar es que un layout lo llame de una forma y el sistema lo use de otra.
    - **Y se abrevia en UNA escala.** El explicador de criterios rendía los umbrales como «$20M», que es
      exactamente la forma en que se veía la unidad rota del 14-09 («M$100» salía como «$100M»). Ahora rinde `M$20`.
    - Gate: **`auditar_unidades.mjs` pasa a estar cableado** en `tests/contract/auditores.test.mjs` con línea base
      **cero**, y estrena el patrón **(d)**: el argumento de un formateador MULTIPLICADO por un millón. Antes sólo
      buscaba divisiones —por eso no vio el defecto en un año de existir— y era un comando de mano, que es la
      otra mitad de por qué sobrevivió. Cero es una **regla**, no un snapshot: el sistema no tiene ningún campo en
      millones, así que ningún candidato es legítimo. Con su sonda negativa, que planta las dos formas y comprueba
      que multiplicar por MIL no se reporta.

61. **TODO GENERADOR PRODUCE EN PESOS. Ningún activo lleva sufijo de escala** (23-09-2026, instrucción del
    usuario: «todos los generadores que produzcan en pesos, no en miles ni millones, o si no se pierde
    precisión»). **Reemplaza el punto de la regla 60 que dejaba vivir el sufijo `_M` (MILES)**: era
    consistente de punta a punta, sí, pero consistentemente cuantizado de a $1.000.
    - **Lo que se perdía, medido.** Veinte campos de cuatro activos viajaban en miles. Cada uno quedaba
      cuantizado al múltiplo de $1.000 más cercano: un pagaré de $450.678.123 se guardaba como `450678` y
      volvía como $450.678.000. Es el mismo defecto del 14-09-2026 —cuando la factura entraba cuantizada de
      a $10.000— una escala más abajo, y por eso menos visible.
    - **Y no era sólo presentación.** `MNT_PAGARES` entra en la comparación de **C02** («Pagaré con Monto
      Suficiente para Cartera»): el criterio comparaba una cifra cuantizada contra el uso exacto de la
      cartera más el monto de la simulación. `V03` y `V04` son **denominadores de una razón que decide** en
      el predictor de verificación.
    - **Qué cambió**: los acumuladores internos de `verificacion.js` y `plataforma360.js` dejan de llevar
      millones (`p.mm`) y llevan pesos (`p.pesos`); los rangos de `riesgo_bice.js` se declaran en pesos; y
      los veinte campos pierden el sufijo — `V03_MNT_COMPRA_3M`, `V04_VENTA_PROM_3M`, `V10_MNT_PAGADO_3M`,
      `MNT_PAGARES`, `CMF_DEUDA_DIRECTA`, `CMF_DEUDA_INDIRECTA`, `DEUDA_PREVISIONAL`, `ACHEF_VIGENTE`,
      `PATRIMONIO`, `GENERACION`, `MARGEN_ULT_MES`, `MARGEN_12M`, `COLOC_PROM_12M`, `COMISION_ULT_OP`,
      `VENTAS_A1..A3` y `VENTAS_SII_A1..A3`. Con ellos se van **veinte multiplicaciones por mil** del
      fuente: diez en los lectores y diez en los sitios que formateaban.
    - **El caso 115 se RE-ANCLA, no se afloja.** Comparaba el valor leído contra `celda × 1000`; ahora lo
      compara contra la celda **tal cual**, que es una exigencia más fuerte: cualquier factor —el ×1.000 de
      antes o el ÷1.000 del defecto original— rompe la igualdad. Sigue midiendo sobre 200 filas reales del
      A10 y no contra un orden de magnitud.
    - **Un layout sin sufijos también es un layout sin ambigüedad.** El `_M` obligaba a que tres cosas
      dijeran lo mismo —el generador, la declaración y el lector— y el 23-09 se encontró que en A11 no lo
      decían: el layout declaraba millones donde el generador ponía miles. Sin sufijo no hay nada que
      sincronizar.
    - **Y los bloques BASE no los alcanza ninguna corrida.** Los derivados se arreglan en su generador y se
      regeneran; los base se copian tal cual desde el activo de entrada. Medido sobre las **119 claves
      distintas** del activo quedaban **dos** con nombre de escala, ninguna con lectores:
      `DEUDORES_AUTORIZADOS.LineaSugeridaMM` (599 filas, BASE) y `RequeridoParaTargetMM` del A5 (233,
      derivado). Se sacaron las dos por instrucción del usuario —«si nadie lo ocupa, elimínalo»—: la
      derivada en su generador, la base con `GeneradorDatos/sanear_campos_muertos.js`, que corre una vez y
      queda commiteado como los otros saneadores. **La segunda era una trampa**: guardaba PESOS
      (202.175.551) bajo un nombre que dice millones, así que quien le creyera al nombre habría
      multiplicado por un millón. Un campo que nadie lee y que miente sobre su unidad no es información.
    - Gate: el caso **115** (el activo calza peso a peso sobre 200 filas), `generador.test.mjs` —el punto
      fijo, más **«ningún campo del activo nombra una escala»**, que se mide sobre el ARCHIVO porque es
      donde el sufijo sobrevive sin que nadie lo note— y la línea base **cero** de `auditar_unidades` en
      `auditores.test.mjs`.

62. **LA CARTERA COMERCIAL SE LEE, NO SE INVENTA: fuera los generadores que quedaban dentro de la app**
    (23-09-2026, instrucción del usuario: «saca esos generadores y cuando los implementes, que escalen en
    pesos»). Es la regla núcleo 9 —*el pipeline lee los activos, no los genera*— aplicada al último sitio
    donde seguía sin cumplirse, y lo que la hace urgente es que **no era sólo suciedad: cuatro KPI estaban
    mal**.
    - **`PC_CLIENTES` sorteaba cuatro campos con `pcRng`**: el volumen del cliente, si tenía «malos
      deudores», en qué proporción, y **a qué competidor se le iba el volumen** —este último de una lista
      de nombres al azar, así que la ficha podía nombrar a un factoring que jamás le compró una factura a
      ese cliente—.
    - **El daño medido.** `vol` salía en una escala que no declaraba nadie (5.000 a 65.000) y cuatro KPI de
      Reportes lo pasan por `fmtMMc`, que **divide por un millón**: «Brecha de wallet», «cedido», «Buenos»
      y «Malos» mostraban del orden de **M$5** donde va la cartera de 500 clientes. No es un redondeo: es
      un factor de un millón, la misma familia del 14-09.
    - **De dónde sale cada uno ahora**, y todos existían ya: el **volumen** del `COLOC_PROM_12M` del A11
      —colocación promedio 12m, en pesos, que el propio activo MIDE sobre las cesiones del A2—; el
      **competidor** del detalle por cesionario del mismo A11, tomando el mayor que no somos nosotros
      (regla 13-quindecies); y los **malos deudores** de la proporción de sus deudores bajo
      `NOTA_PRIORITARIA`, que es la nota de corte que el sistema ya usa para decidir a quién le abre
      oportunidad. El corte del 50% que parte el panel en dos es de **pantalla** y está dicho como tal: la
      regla es la nota.
    - **El fallback sintético de 80 empresas se retira entero.** Armaba nombres con tres listas, sorteaba
      RUT y fabricaba volumen y SOW para cuando falta `datos_inyectados.js`. Sin ese archivo el pipeline
      muestra **0 oportunidades** de todos modos: una cartera falsa al lado de un tubo vacío no rescata la
      demo, la vuelve incoherente — y esas 80 empresas se mezclaban con las reales apenas el activo
      aparecía a medias. Sin activo, `PC_CLIENTES` es `[]`.
    - **Y las series de referencia del mercado pasan a PESOS.** `PC_MERCADO`, `PC_SECURITY` y `PC_ZONA`
      estaban escritas en miles de millones («245» por 245 B CLP) y el eje del gráfico de zonas las
      rotulaba **«$13 MM»**, que dice millones donde el dato son miles de millones. Ahora se escriben en
      pesos y el eje usa `fmtMM`, el formateador único.
    - Gate: `regla_62.test.mjs` sobre el texto del fuente —ni `pcRng` ni una lista de competidores dentro
      de `PC_CLIENTES`, y el catálogo sale de `P360`— más la línea base de `auditar_muerto`, que es la que
      obliga a que no quede ningún resto sin referencias.

73. **EL ACUSE DEL RECEPTOR ES UNA BANDERA DEL DTE QUE EL A1 TRAE Y `facturaDeDTE` LEE; SE MUESTRA Y NO FILTRA** (23-09-2026,
    M-01, G-01; el usuario, 22-09-2026: «las aceptaciones son parte de las banderas de DTE»; 23-09-2026: «las facturas los
      primeros 8 días desde su emisión no tienen acuse de aceptación y/o reclamo y en ese estado de ausencia de acuse sí
      son candidatas»). El spec del curse y el informe de gaps decían que «el A1 no la trae»: **la trae**. `EstadoDTE`
      viene con `Aceptado` (código «2» en las 21.974 aceptadas de 30.000, con `FchAcuseRecibo`), `Reclamado` («1» en
      2.088, con `FchReclamo`), `NotaCredito` (1.487) y `FchRecepcion` (la fecha del batch, 2026-06-23 en todas); 5.938
      filas no tienen acuse ni reclamo, 4.637 de ellas emitidas en los 8 días anteriores al batch. Lo que faltaba era
      LEERLO: `facturaDeDTE` lo derivaba en nada y `facturasDeCandidata` lo sorteaba para un Excel.
    - **Tres estados, leídos tal cual** (`acuse`: `aceptada` · `reclamada` · `sin_acuse`), con `acuseCodigo` (el código
      que el A1 trae en `Aceptado`), `fchAcuse` (la del acuse o la del reclamo) y `fchRecepcion`. Nada se deriva de la
      fecha ni del folio: sin acuse es un VALOR del activo (regla 13-ter, regla 13-quater). El stream (`streamDesdeDTE`)
      y el libro del asistente (`facturasDelLibro`) lo llevan con el documento.
    - **Se muestra**: `ChipAcuse` en las tres filas del documento del detalle (la oferta, «otras facturas» y los
      disponibles del tab Detalle), junto al tipo —«Con acuse» / «Sin acuse» / «Reclamada», con la fecha en el tooltip—;
      `acuseLabel` es la única lectura de pantalla. Sin dato del A1 (XML a mano, fixtures) el chip no dibuja nada:
      «Sin acuse» es lo que el activo dice, no lo que se afirma de un documento que llegó por otro camino.
    - **No filtra**: «Buena factura» (`CRITERIO_PRED`), `estadoCandidata` y el perfil de la Bandeja no leen `acuse`.
      Lo que excluye sigue siendo el reclamo, la nota de crédito, la cesión a un factoring ajeno (regla 64), la venta al
      contado y la antigüedad (regla 65). Una factura sin acuse en sus primeros 8 días es candidata, y con acuse también.
    - **El Excel de candidatas dejó de inventarlo**: la columna «Aceptada/Reclamada» salía de un sorteo por RUT
      (`facturasDeCandidata`), y un candidato —proveedor de un cliente, no cliente— no tiene documentos en el A1. Se
      retiró la columna con el sorteo; el resto de ese detalle sigue siendo la derivación determinista del agregado que
      el comentario del fuente declara, hasta que exista el endpoint de detalle.
    - **Ni el generador ni el activo cambian**: `DTESYNC` es un dataset base que ya trae las banderas; el punto fijo
      (regla 32) se conserva sin regenerar. El layout lo declara `Levantamiento_Activos_Informacion.md` (A1) y
      `spec-inbound-facturas.md` §2.
    - Caso **169** (los tres estados leídos con su fecha y el A1 entero contado por `facturaDeDTE` igual que por
      `EstadoDTE`; el stream y el libro; «Buena factura» y `estadoCandidata` sin mirar el acuse, en las dos direcciones;
      el rótulo con sus tres textos y mudo sin dato; el Excel sin `estado`) y `regla_73.test.mjs` (la lectura sin
      derivar, «Sin acuse» en un solo sitio y nunca como sorteo, el chip en las tres filas y mudo sin dato, el libro, y
      ningún filtro leyendo `acuse`; diez sondas). La fila en pantalla la fija `e2e-73-a` (CP-010): en la oferta y en
      los disponibles el chip de cada factura coincide con lo que el A1 trae para ese folio, y la reclamada sigue
      bloqueada en su fila.

74. **EL A1 ES UN FLUJO DE EVENTOS POR DOCUMENTO: UNA FILA POR NOTIFICACIÓN, Y EL DOCUMENTO SE PLIEGA EN UN SOLO SITIO**
    (23-09-2026, ADR-0020; el usuario: «Considera que los eventos de dtesync llegan varias veces para la misma factura una
      vez se crea (notifica nueva factura), después puede llegar nota de crédito, después aceptación. Considera eso para
      modelar el archivo de dtesync»). Hasta ese día el A1 traía una fila por DTE con su estado FINAL y el stream lo
      reproducía como si cada documento llegara una sola vez y ya decidido: una factura con nota de crédito nunca había sido
      candidata y nada «llegaba después». `Notificacion` venía sin relación con las banderas (22.630 `DTE_SINCRONIZADO` y
      7.370 `DTE_ACTUALIZADO`, repartidos igual entre aceptadas, reclamadas y con NC) y las fechas de las banderas eran tres
      constantes posteriores al corte (todos los acuses el 23-06, las NC el 24-06, los reclamos el 25-06): un marcador, no
      un dato.
    - **El log.** `window.DTESYNC` es la lista de notificaciones en orden de llegada: cada fila es un evento con `Secuencia`
      (1..n por documento) y `FchNotificacion`. La creación (`DTE_SINCRONIZADO`, secuencia 1) trae el documento entero y
      `EstadoDTE` sin banderas; cada cambio posterior (`DTE_ACTUALIZADO`) trae la identidad (`RUTEmisor`, `TipoDTE`,
      `Folio`), el envoltorio y el `EstadoDTE` ACUMULADO, y no repite el documento. Hoy: 30.000 documentos en 55.549
      eventos (21.974 acuses · 2.088 reclamos · 1.487 notas de crédito), del 06-05 al 23-06. `CONTRATOS_DATOS` lo declara
      con esquema 2 y los tres campos del envoltorio; un archivo plano se pliega igual pero se diagnostica «faltan campos».
    - **El pliegue, en un solo sitio por lado.** `plegarDTE(eventos)` en el fuente y `plegar` en
      `GeneradorDatos/lib/dtesync.js`: un documento por (emisor, folio), los campos de la creación y el estado del evento
      más nuevo —el orden de llegada no importa, un evento atrasado sólo completa—, ordenados por folio, que es el orden
      que el activo plano traía (ningún lector cambió de orden). `documentosDTE()` es la ÚNICA lectura del log fuera del
      stream: `corteDTE`, `libroPorEmisor`, `OTRO_FOP_POR_CEDENTE`, `SENALES_CLIENTE`, `RUT_DEUDOR_POR_NOMBRE`,
      `PC_CLIENTES`, `paresPorEmisor` y el contrato pasan por ahí, y el generador pliega una vez en `derivar` antes de
      entregar `DTESYNC` a los módulos. El gate corre las dos funciones sobre el mismo log y exige el mismo resultado.
    - **El stream recorre el log.** La creación entra como factura sin banderas (`facturaDeDTE`, con `secuenciaDTE` 1); la
      actualización entra como evento `actualizacion` (`eventoActualizacionDTE`: `docId`, `secuencia`, `estado` leído por
      `estadoDeDTE`, el mismo lector que usa `facturaDeDTE`). Una fila con `FchEmis` es un documento —la creación, o un
      documento ya plegado— y nunca una actualización. El tick separa las actualizaciones ANTES de clasificar: no entran a
      las reglas ni cuentan como «facturas recibidas» (la Bandeja las cuenta aparte, «N actualizaciones», y la cola es de
      eventos).
    - **Dónde se aplica una actualización** (`aplicarActualizacionDTE`, pura): el documento se parcha donde viva —en el
      acumulado y la bandeja (`aplicarActualizacionAEvento`), en los disponibles de la oportunidad siempre, en la oferta
      mientras el paquete sea del ejecutivo— y sólo si el evento es más nuevo que lo que el documento sabe
      (`secuenciaDTE`): una re-entrega no se aplica dos veces. La NC y el reclamo dejan traza en la bitácora («El SII
      notificó una nota de crédito sobre el documento #N: queda bloqueado en…»); el acuse se anota sin traza. **Sobre la
      oferta cerrada o publicada, o después de la firma, la NC, el reclamo o la cesión a otro INHABILITAN el documento y
      dejan la operación no cursable (ADR-0021, regla 75)**: el documento queda con su estado nuevo y marcado
      `inhabilitada`, el veto de la regla 71 lo cubre y el ejecutivo retira, re-evalúa y vuelve a publicar para una nueva
      firma. (Hasta ADR-0021, el mismo día, sólo se avisaba: era la decisión que ADR-0020 dejó abierta.) La corrida
      siguiente reporta en su línea de bitácora del sistema cuántas actualizaciones aplicó y cuántos documentos inhabilitó.
    - **La migración fue una sola vez** (`GeneradorDatos/migrar_dtesync_eventos.js`, como `migrar_padron.js`): cada documento
      se expandió en su creación y una actualización por bandera, fechada de forma determinista dentro de la ventana del
      negocio (acuse y reclamo hasta 8 días desde la emisión, NC hasta 30) y nunca después de la recepción del batch; el
      log quedó en orden de llegada. El pliegue reproduce cada documento salvo el envoltorio y esas fechas
      (`diferenciasDeMigracion`) y los derivados salieron byte a byte iguales: el punto fijo (regla 32) se conserva. El
      archivo pasó de 35 a 46 MB.
    - Caso **170** (el pliegue en los dos órdenes y la fila plana; el A1 real contado por documentos en el libro, los pares y
      el corte; el stream con la creación sin banderas y la actualización aparte; la NC en los disponibles y en la oferta
      abierta con traza, la inhabilitación sobre la oferta cerrada (regla 75), la re-entrega, el acuse sin traza, el folio
      ajeno, el lote y el evento del inbound), `regla_74.test.mjs` (ningún lector del log fuera del pliegue y el stream; los lectores plegados;
      el pliegue del fuente ejecutado en Node contra el del generador; el stream y el tick separando; el aviso sobre la
      oferta cerrada; el contrato; doce sondas) y `dtesync.test.mjs` (el bloque commiteado valida como log —creación
      primero, secuencias contiguas, fechas en ventana, orden de llegada, actualizaciones sin el documento— y `plegar`,
      `expandir`, `migrar` y `validarLog` sobre logs plantados, con sus sondas).
