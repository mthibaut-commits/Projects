# El ciclo de una factura — de la sincronización al giro

**Versión 1.1.1 · 21-09-2026 · NEX Factoring**

Este documento sigue **un documento tributario** desde que Security lo recibe hasta que Tesorería
transfiere el dinero. Existen ya seis specs de proceso —inbound, líneas, otorgamiento, verificación,
pricing y giro—, cada uno completo en su dominio; lo que ninguno hace, y hace éste, es **la costura**:
en qué orden corren, qué se pasan entre sí, dónde el camino se bifurca y qué queda decidido en cada
punto.

Se lee en cuatro tiempos:

- **Parte I — el camino general.** La cadena completa en el caso más simple: cliente conocido con
  línea vigente, deudores en lista, todo cabe, nadie objeta. Es donde se explican los **siete motores**
  y qué decide cada uno.
- **Parte II — las variantes.** Las diez bifurcaciones reales, cada una anclada al punto exacto de la
  Parte I donde se separa del camino general.
- **Parte III — los cortes transversales.** Qué activo alimenta cada eslabón, qué tiene que hacer
  cumplir el servidor y dónde corre hoy cada motor.
- **Parte IV — qué falta.** Lo declarado y no implementado, y las decisiones que no se cierran
  programando.

> **La premisa que ordena el documento.** El pipeline **no genera datos: los lee y los procesa.** Una
> factura, su deudor, su monto y sus fechas son un **dato del documento**, no una derivación de la
> pantalla que lo muestra. Lo que el pipeline produce son **decisiones** —si se compra, a qué precio,
> contra qué línea, con qué aprobación y por qué vía se gira— y cada una deja evidencia con actor y
> hora. Cuando un dato no existe, se dice; no se rellena.

**Alcance.** Todo lo que sigue es del producto **Factoring**. El catálogo de productos reserva el
lugar para otros cinco —Confirming de Nómina, Confirming Tradicional, Ordering, Cheque y Crédito
Comercial— hoy inactivos; entrarían por el mismo tubo con otro pricing y otra forma de cesión.

---

## Parte I · El camino general

### 0. El mapa en una página

```
   A1 DTE ─┐
   A2 AEC ─┤
           ├──▶ ① INBOUND ──▶ oportunidad ──▶ ② OFERTA ──┐
   listas ─┘    clasifica       (vacía)        el ejecutivo│
                y agrupa                       elige folios│
                                                           ▼
                                         ┌─────── ③ REEVALUACIÓN ───────┐
                                         │  (una sola pasada, explícita) │
                                         │  ③a líneas   ③b otorgamiento  │
                                         │        ③c verificación        │
                                         └───────────────┬───────────────┘
                                                         ▼
                              ④ PRICING ──▶ ⑤ PRORRATEO ──▶ monto a girar
                                                         │      por factura
                                                         ▼
                                    ⑥ CIERRE Y PUBLICACIÓN ──▶ firma del cliente
                                                         │        (portal)
                                                         ▼
                                     ⑦ POST-FIRMA: las tres compuertas
                                       ├─ falta algo → Otorgamiento / Verificación
                                       └─ no falta   → Pendiente Integración
                                                         │  (Operaciones N3 aprueba)
                                                         ▼
                                              Pendiente de Giro
                                                         ▼
                                  entrega del reparto de ⑧ a Tesorería
```

**⑧ no es el último paso en el tiempo.** El modelo de giro se evalúa desde que la oferta está
simulada —el chip «Giro Normal» / «Giro Express» ya aparece en la tarjeta del tubo de una operación
en Oferta y Negociación— y lo que ocurre después de «Pendiente de Giro» es la **entrega** de ese
reparto a Tesorería.

Los siete motores de la cadena, con lo único que decide cada uno:

| # | Motor | Decide | Unidad de la decisión |
|---|---|---|---|
| ① | `clasificarFactura` / `deudorAbreOportunidad` | Qué facturas entran y cuáles **abren oportunidad** | la factura |
| ③a | `asignarLineas` | **Contra qué línea** se cursa cada factura, y cuál no cabe | la factura |
| ③b | `evaluarOtorgItems` | Si el riesgo **permite** cursar, y quién autoriza cada desvío | la regla × el sujeto |
| ③c | `verifDecision` | Si hay que **llamar al deudor** antes de girar | el deudor |
| ④ | `simularOperacion` | El **monto a girar** de la operación | la operación |
| ⑤ | `prorratearOperacion` | Qué le toca de eso a **cada documento** | la factura |
| ⑧ | `asignarGiros` | Por **qué vía** se transfiere cada parte | el deudor → la factura |

Tres propiedades que valen para los siete y que conviene fijar antes de entrar en detalle:

1. **Ninguno llama a otro.** Los tres motores de la reevaluación corren en la misma pasada y son
   independientes: una operación puede caber perfectamente en la línea y estar bloqueada por
   otorgamiento, y al revés. El modelo de giro **recibe** los veredictos de otorgamiento y
   verificación por parámetro; un adaptador (`girosDeDeal`) es el único componente que conoce a los
   tres a la vez.
   *¿Por qué?* Encadenarlos reintroduciría en cada motor las lecturas de estado que costó sacarles, y
   haría imposible probar uno sin montar los otros dos.
2. **Todo lo que deciden entra por parámetro y sale puro.** El visado, el veto de la verificación, el
   padrón de aprobadores y el estado del cliente no se leen desde dentro: se inyectan. El default al
   estado del navegador es comodidad del llamador, no dependencia.
   *¿Por qué?* En producción estos motores corren **del lado del servidor**. Ver §21.
3. **Todo monto es un peso entero.** No hay campo en millones en ninguna parte: ni en el fuente, ni en
   los activos, ni en los contratos de API, ni en los layouts. El millón es una **abreviatura de
   pantalla** y vive en un solo formateador (`M$`, escala única).

---

### 1. Sincronización e inbound

**Qué recibe.** El libro de ventas electrónico del cliente (**A1 · DTESync**, 30.000 documentos de 500
emisores), el registro de cesiones del mercado (**A2 · AECSync**), las listas de riesgo (**A3 · Lista
Blanca**, **A4 · Deudores Autorizados**) y el histórico de factoring del par cliente-deudor. En la demo
los activos llegan embebidos. En producción, **A3 y A4** llegan como entrega diaria por **S3 con
notificación por evento** (§19); **A1** y **A2** son streams y no pasan por ese transporte. El
**histórico del par** —lo que separa CAT1 de CAT4— no lo entrega ningún activo y hoy se genera
determinista por par (§23).

**Qué hace.** Dos relojes distintos, y conviene no confundirlos:

- **La ingesta** consume el stream de documentos por lotes. Es lo que llena la bandeja.
- **La corrida** (`tickCron`) agrupa lo acumulado **por cedente** y crea una oportunidad por cliente,
  no por factura.

*¿Por qué agrupa por cedente?* Porque el ejecutivo se asigna **por cliente**, nunca por deudor, y
porque una llamada comercial cubre todo lo que ese cliente tiene para vender hoy. Una oportunidad por
factura produciría cien conversaciones donde hay una.

**El filtro de calidad.** Una factura es comprable si es **a crédito**, **sin reclamo**, **sin nota de
crédito** y su deudor abre oportunidad. El reclamo y la nota de crédito salen de `EstadoDTE` del A1;
que sea a crédito, de `FormaPago` de la misma fila; el cuarto es la clasificación.

> Una **nota de crédito** deja el documento fuera y no se compra por el neto. El layout del A1 trae
> `NotaCredito` y `FolioNotaCredito` pero **no el monto**, así que no se puede saber cuánto rebaja:
> estimarlo sería inventar la cifra que entra al monto a girar. Es un hueco declarado del layout
> (§23).

**Los tres buckets del deudor.**

| Bucket | Quién cae ahí | ¿Abre oportunidad solo? |
|---|---|---|
| **CAT1** | Lista Blanca, Deudor Autorizado, o histórico con nosotros | Sí |
| **CAT4** | Histórico con la competencia en los últimos 12 meses | Sí |
| **OTRO** | Ni listas ni historia | **No** — ver §12 |

Y una **disyunción** que importa: `deudorAbreOportunidad` es «bucket elegible **o** Nota Deudor >
4,2». Son dos poblaciones, no una conjunción — la lista dice «con éste ya operamos» y la nota dice
«éste paga»; basta una. Medido: de las facturas del bucket OTRO, el 46% abre igual por nota.

**Las siete reglas de captura.** Se evalúan **en orden** y gana la primera que calza. El orden importa
porque la regla que captura define el **canal del primer contacto** —WhatsApp del agente, correo,
llamada del ejecutivo—, no sólo si se abre la oportunidad.

**Qué produce.** Una oportunidad en **Prospección**, con su cliente, sus deudores, su monto
dimensionado, su CAT y su ejecutivo asignado — y con **la oferta vacía** (`facturasOp: []`).

> **La oferta nace vacía, y es deliberado.** El inbound dimensiona la *oportunidad*: cuánto hay para
> comprarle a este cliente hoy. Elegir qué documentos entran es del ejecutivo, y la pantalla lo
> recibe con su panel de arranque. Una oferta pre-armada se lee como una decisión que alguien tomó.

**Las fechas del documento son un dato.** `fechasDocumento(f)` es el único resolver: toma lo que el
documento **trae** (`FchEmis`/`FchVenc` del activo), después lo que el libro le estampó, y sólo
entonces un respaldo estable por folio. El ancla del libro sintético es `corteDTE()` —la emisión más
reciente del batch—, que es una propiedad del **dato**, no del reloj: la misma factura muestra las
mismas fechas hoy, mañana y en cualquier pantalla.

---

### 2. De la oportunidad a la oferta

El ejecutivo abre el **detalle de la oportunidad**, que es una **pestaña propia del navegador** y no
un panel sobre la lista.

**Documentos disponibles.** El libro de ventas del cliente, leído del A1 y **no sintetizado**: 37 a 85
facturas por cliente, con sus deudores, montos y fechas reales. El libro **no depende de la oferta**:
es lo que el cliente emitió, y no cambia porque nosotros elijamos qué comprarle.

Se presenta partido en dos pestañas y con dos vistas:

- **Pestañas, por línea:** *Deudores aprobados línea* (al menos una factura suya cabe hoy en el cupo)
  y *Deudores sin aprobar* (ninguna cabe, o no tiene documentos incorporables). La partición es
  **exhaustiva y disjunta**.
  *¿Por qué por línea y no por calidad?* La pregunta que el ejecutivo trae a esa pantalla es **a quién
  le puedo comprar hoy**, y eso lo decide el cupo. Prime es la calidad del deudor y las compuertas de
  otorgamiento y verificación son trámites que se resuelven: ninguno de los tres cambia si el
  documento cabe.
- **El criterio es por FACTURA, no por el total del deudor.** Se le pregunta al motor qué documentos
  salen `CON_LINEA` en vez de comparar el monto del deudor contra su holgura: la asignación es por
  factura completa, así que «cabe el total» y «cabe esta factura» no son la misma pregunta.
- **Vistas:** *Por deudor* (un acordeón por empresa) responde a quién comprarle; *Por factura* (plana,
  folio descendente) responde qué documentos hay. Es una **vista, no un filtro**: cambiar de vista no
  puede hacer desaparecer un documento.

**Qué bloquea un documento.** Cada motivo sale de un activo, ninguno de un sorteo:

| Motivo | Origen |
|---|---|
| Anulada por nota de crédito | `EstadoDTE` del A1 |
| Reclamada por el deudor | `EstadoDTE` del A1 |
| Cedida a terceros / Ya financiada | join con el A2 por `RUT cedente + folio` |
| En otra operación | estado del **pipeline**, no del SII: entra por parámetro |

La cesión se nombra con el factoring y la fecha, y distingue la **cesión propia** («Ya financiada») de
la ajena. Una **cesión parcial** —el A2 declara un monto menor que el documento— bloquea igual, pero
el mensaje dice por cuánto: el crédito quedó con dos dueños y el ejecutivo necesita saber si vale la
pena pedirle al cliente que lo resuelva.

**Qué mueve la etapa.** Lo que saca una oportunidad de Prospección es la **simulación**, no la
edición del paquete. «Oferta y Negociación» significa que hay una oferta que negociar, y una oferta
sin precio no es una oferta.

**La CAT clasifica el paquete que se compra.** Con la oferta vacía **no hay CAT** de la operación: lo
que se muestra es la CAT de lo **disponible**, dicho con esa palabra y con otro tratamiento visual. No
son el mismo número. Un conjunto vacío **no es «CAT-1»**: es ausencia de dato, y se devuelve como tal.

---

### 3. La reevaluación: tres rutinas, una sola pasada

**La reevaluación se PIDE, no ocurre.** Agregar o quitar facturas actualiza al instante sólo lo
aritmético —monto de la oferta, conteos, monto por deudor— y deja en **«Por evaluar», sin número**,
todo lo que dependa de líneas o de verificación, hasta que el ejecutivo aprieta **Re-evaluar**.

*¿Por qué?* Una cifra vieja atenuada **igual se lee como cifra** y alguien la va a citar. Y porque la
evaluación emite evidencia: convertir cada tecleo en una versión haría del historial un log de
edición.

Las tres rutinas corren en esa misma pasada y **ninguna llama a las otras**.

#### 3.1 Asignación de líneas (`asignarLineas`)

Función **pura** de (selección de facturas, estado de líneas) → (asignaciones, faltantes). No persiste
nada y no muta lo memoizado.

**Cinco líneas y tres niveles.**

| Código | Nombre de negocio | Alcance |
|---|---|---|
| **LF1** | Línea Inicial Cliente | del cliente, al enrolar, $30.000.000, sólo deudores **de lista** — acá la nota > 4,2 no basta |
| **LF2** | Normal Cliente-Deudor | del par |
| **LF3** | Puntual Cliente-Deudor | del par, a medida de una operación |
| **LF4** | Cliente-Otros Deudores | del **cliente**: financia a los deudores sin línea propia con él |
| — | Línea global del deudor | del **deudor**, compartida por todos los clientes que le ceden |

> **La regla de validación.** Una factura se cursa sólo si cabe en **los tres niveles a la vez**:
> `monto ≤ min(disponible_cliente, disponible_par, disponible_deudor)`.

**Por factura completa, nunca parcial.** No se compra media factura, así que «cabe el total del
deudor» y «cabe esta factura» son preguntas distintas y pueden dar respuestas distintas.

**El recálculo es siempre COMPLETO.** Se recorre por tramo y nota descendente y los recursos son
compartidos: el comodín LF4 es un pozo del **cliente** —uno por categoría de deudor, «Lista Blanca» y
«Deudores Autorizados», y un deudor no alcanza el de la otra— que comparten todos sus deudores sin
línea propia; y la línea del deudor la consumen **todos** sus clientes. Recalcular sólo el deudor tocado diverge y termina
cursando contra cupo inexistente.

**Qué sale.** Cada factura queda `CON_LINEA` —con su origen, que es una **lista** de (línea, monto),
porque una factura puede repartirse entre dos— o `REQUIERE_COMITE` con un **motivo** que dice cuál de
los niveles la frenó: `par` · `lf4` · `lf1` · `cliente` · `deudor` · `suspendida`.

**El motivo determina qué se le pide al comité y a quién afecta.** Ampliar la línea global de un
deudor toca carteras de otros ejecutivos y **no** se resuelve con una puntual del cliente: son
solicitudes distintas (§11).

**El mínimo de línea aprobada es $10.000.000, y la puntual está exenta.** Una línea bajo el mínimo no
financia ninguna factura del cliente: existe en la ficha y sólo produce rechazos. La LF3 se exceptúa
porque es un cupo a medida de una operación —su tamaño lo fija esa operación, no la política— pero se
talla contra el piso de su hermana, para que partir el cupo en dos no deje la LF2 bajo el mínimo por
la puerta de atrás.

> **Un piso por línea significa MENOS líneas, no líneas más grandes.** El presupuesto del cliente es
> el que es: repartirlo entre más de `total/piso` partes es imposible. Se decide primero **cuántas**
> caben, se reparte entre las de mayor peso y las demás quedan en 0 — esos deudores pasan a
> financiarse por el comodín, que es exactamente para lo que existe. Y lo que el piso deja sin
> repartir **vuelve al comodín**: descontárselo al cliente sería quitarle capacidad que el comité sí
> le aprobó, por una regla de tamaño mínimo.

**El piso no crea capacidad.** Si el presupuesto efectivo del cliente queda bajo el mínimo, su única
línea vale lo que le queda: darle igual $10.000.000 sería aprobarle cupo que nadie aprobó. El tope del
cliente es una decisión de riesgo; el mínimo es sólo una regla de cómo se **reparte**.

#### 3.2 Otorgamiento (`evaluarOtorgItems`)

La decisión de riesgo sobre **esta** operación: si se cursa, si se cursa con **excepciones autorizadas
por un apoderado**, o si no se cursa.

**El catálogo** (medido el 17-09-2026 sobre `atribuciones_otorgamiento.json`):

| | |
|---|---|
| Reglas | **77** — 48 de cliente (C) · 23 de deudor (D) · 6 de operación (O) |
| Origen | **75** de la política de riesgo v1.0 · **2 propias** del proceso: **O05** y **O06** |
| Tramos | **183** — 133 de excepción · 47 de aprobación · 3 de rechazo |
| Reglas con al menos un tramo de excepción | **69** |
| Tramos de excepción por área | riesgo **97** · comercial **29** · operaciones **7** |
| Sin aprobador definido | **0** |

Las dos reglas propias se cuentan aparte porque la cobertura de la **política** es lo que se audita
con Riesgo; sumar las nuestras al mismo total dejaría de medirla.

**Cuatro disposiciones:** `aprobado` (no hay nada que hacer) · `excepcion` (se incumple y un apoderado
puede autorizarlo) · `rechazado` (se incumple y no se autoriza) · `clasificacion` (informa, no decide).
Que «informativo» sea una disposición y no la ausencia de una es lo que permite que el catálogo siga
siendo **una sola lista**.

**Un tramo es un risk tier.** Se evalúan en orden y gana el primero que calza; si ninguno calza el
resultado es `aprobado`. A mayor desvío de la variable, mayor jerarquía exigida.

**El tipo de regla no está atado al prefijo del código.** Por defecto se lee de él —`D01`–`D23`— pero
una regla numerada en el bloque de cliente que sea del par cliente-deudor lo **declara**, y esa
declaración manda sobre el prefijo. Hoy ninguna lo necesita, y el mecanismo se conserva igual:
deducirlo *sólo* del prefijo obligaría a renumerar una regla cada vez que cambia de sujeto, y con eso
se pierde la trazabilidad con el documento de política, que es por donde se audita el catálogo. Las de
deudor se evalúan una vez **por cada deudor** de la operación y se visan por deudor.

**El ruteo de una excepción es el par (ÁREA, NIVEL).** La regla declara el área; su tramo, el nivel.
Con ese par se buscan en el **padrón** los usuarios de esa área con ese nivel **o superior**.

- Aprueba **cualquier nivel igual o superior de la misma área**, sin tope: un cargo vacante —o alguien
  de vacaciones— dejaría las operaciones esperando a quien no existe.
- **La escalada no cruza áreas.** Un Gerente General y un Jefe de Riesgo no son dos peldaños de una
  escalera: son atribuciones distintas.
- Una regla con un **tramo de excepción y sin área NO SE EJECUTA** —el área es a quién se le pide la excepción, así que una **knock out** no la necesita: no se aprueba—. Desde el 18-09-2026 no se evalúa siquiera: el motor la devuelve como «No ejecutada · falta configuración», con la causa y dónde se arregla, y la operación se evalúa SIN ella. Antes se evaluaba igual y su excepción salía «Sin aprobador definido», o sea que la operación quedaba esperando a alguien que no existe. Un default silencioso —«si no dice área, que la vea
  Riesgo»— escondería una regla mal configurada detrás de una aprobación real.
- Cuando no hay nadie, el motor lo dice con esas palabras: **«Sin aprobador definido»**, con el
  requisito (`área · N`) y **la causa**, que son dos y se arreglan en mantenedores distintos — el área
  no existe en el tenant, o nadie la tiene en ese nivel o superior. Una lista de aprobadores vacía se
  lee como «todavía no lo miran», cuando la operación está pegada esperando a alguien que no existe.

**El monto de la operación impone un PISO de atribución.** Son **dos factores** y el requisito es el
**mayor** (`max`, no suma): el tramo mide cuánto se **desvía** la variable de riesgo; el piso, cuánto
se **arriesga** si ese desvío resulta cierto. Sumando, dos factores medianos exigirían más que un
factor extremo. Es **piso**: el nivel del tramo nunca baja por el monto. Tramos de política:
≤ MM$20 · ≤ MM$60 · ≤ MM$120 · > MM$120.

**Cada columna satura en el tope de su área** —Comercial hasta N3, Riesgo hasta N5— porque pedirle a
un área un nivel que no tiene no exige más: deja la excepción sin aprobador, que sería un bug de esa
tabla disfrazado de control.

**El ciclo del visado.** El motor produce la excepción con su (área, nivel) → el **ejecutivo** la
justifica (comentario, respaldo adjunto, o la declaración explícita de que no tiene comentarios) → el
**apoderado** con esa atribución la aprueba o la rechaza, y eso queda con actor y hora.

*¿Por qué la justificación es requisito de entrada y no un paso paralelo?* Porque el apoderado no
puede decidir sobre algo que no le llegó justificado: dejar cerrar sin ella no adelanta nada — la
operación se detiene igual, sólo que más tarde y sin que nadie sepa por qué.

**Solicitar la aprobación no cierra la puerta.** El contrato firmado llega dos días después de la
solicitud, y la aclaración que Operaciones pidió por teléfono también. Aportar respaldo **no decide
nada** —lo gateado por atribución es *visar*— así que el panel admite ampliaciones, que se **apilan**
(append-only) con su propio actor y su propia hora sobre la justificación original, sin pisarla.

**Las dos reglas propias.**

- **O05 · Contrato firmado por cliente de la operación.** Existe **siempre** y en las dos vías de publicación; lo
  que cambia es **quién crea la evidencia** (§16). Operaciones N3.
- **O06 · Monto Cedido Igual al Monto del Documento.** Su par documental: aquél comprueba que
  *exista* la autorización, éste que lo cedido *coincida* con lo que se va a comprar. Dos tramos a
  niveles distintos porque no son el mismo hecho: una cesión **parcial** deja el crédito con dos
  dueños y cobrarlo sería compartir la cobranza (Operaciones **N3**); una cesión por **más** que la
  factura no es una diferencia sino un crédito que no existe (Operaciones **N5**). Ese segundo caso el
  activo lo valida en origen y no debería llegar nunca — y justamente por eso el criterio lo mira: un
  control que sólo cubre lo que ya sabemos que pasa no controla nada.

**Rechazo firme y rechazo re-evaluable.** Un rechazo **firme** pierde la operación; uno re-evaluable,
no. Una firma de contrato no borra un dato de bureau, pero sí regulariza documentación, vigencias y
garantías. Los tres knockouts del catálogo son **C30, C31 y C32** (cobranza judicial TGR, convenios de
deuda TGR y cuotas de convenio impagas) — ver §13.

#### 3.3 Verificación de facturas (`verifDecision`)

Decide **una sola cosa**: si hay que **llamar al deudor** antes de girar. El contacto busca dejar por
escrito o grabado que pagará; **toma 3 o 4 horas y retrasa el giro**, y si el deudor no confirma, las
facturas no confirmadas se retiran. Por eso el ejecutivo tiene que saberlo **antes** de comprometer un
plazo.

> **La unidad de la decisión es el DEUDOR, nunca la factura.** Una llamada cubre todas sus facturas.
> Evaluar por documento daba veredictos distintos entre facturas del mismo deudor y volvía
> inconsistente el contacto.

**Regla 0 · Primera operación del cliente.** Si el cliente es nuevo se verifican **todas** las
facturas, cualquiera sea el segmento del deudor. Es compuerta y va **antes** que todo lo demás.

*¿Por qué vive acá?* No es un criterio de riesgo del **deudor** sino del **cliente**, y «si hay que
llamar a este deudor» es una sola pregunta con un solo dueño. El estado del cliente entra **por
parámetro** y **no se memoiza con el par**: guardado en el cache, el cliente seguiría verificándolo
todo para siempre después de cursar.

**Dos segmentos, y la entrada es una disyunción:** `recortado = prime || nota > 4,2`.

| Segmento | Quién | Criterios |
|---|---|---|
| **PRIME** | Lista Blanca, Deudor Autorizado, **o** nota > 4,2 | 6: V01, V04, V05, V07, V08, V10 |
| **OTROS** | el resto | los 10 |

**V01 es COMPUERTA, no atajo.** Si el deudor tiene protocolo propio de confirmación, se verifica
**siempre** con ese protocolo y no se evalúa nada más. Tener protocolo propio significa que ese deudor
exige un procedimiento, no que esté exento.

**Unanimidad.** Para **evitar** la verificación hay que superar **todos** los criterios aplicables. Es
conjunción, no mayoría: la verificación es barata comparada con comprar una factura que no existe.

**`null` = incumplimiento.** No hay estado intermedio ni «no aplica» por falta de dato. Un deudor
nuevo —sin historial— se verifica **por construcción**: el riesgo de un dato faltante no es cero, es
desconocido, y tratarlo como cumplido convierte la ausencia de información en una autorización.

**Los umbrales:**

| | Criterio | Umbral | Segmentos |
|---|---|---|---|
| V01 | Protocolo propio de confirmación | compuerta | ambos |
| V02 | % pagado por el deudor, 3M | ≥ 90% | OTROS |
| V03 | Operación vs. compra promedio del par, 3M | ≤ 1,3× | OTROS |
| V04 | Operación vs. venta promedio del par, 3M | < 1,0 | ambos |
| V05 | Meses con venta en los últimos 6 | ≥ 4 | ambos |
| V06 | Desvío del vencimiento vs. plazo promedio del par | ≤ 5% **del plazo** | OTROS |
| V07 | Pagos con mora > 25 días | < 3% | ambos |
| V08 | Reclamos | < 4% | ambos |
| V09 | Monto de la operación con ese deudor | ≤ MM$300 | **sólo OTROS** |
| V10 | Pagos del deudor al factoring, 3M | > MM$1.000 | ambos |

**V09 sólo aplica en OTROS:** un Prime no tiene techo por monto. La lista es lo que compra el derecho
a que no se te mire el tamaño de la operación.

> **Los dos lados de cada comparación van en PESOS.** Los criterios que miden el monto de la
> operación —**V03**, **V04** y **V09**— lo comparan contra variables del par y contra umbrales que
> tienen que estar en la misma unidad. El activo los entrega en **miles** (sufijo `_M` del layout),
> así que se multiplican por mil al leerlos; los umbrales de la tabla se escriben en pesos
> (`300e6`, `1000e6`). `M$` es una abreviatura de pantalla y sólo la aplica el formateador.

**V06 y V09 nacen en el documento y escalan al conjunto** del deudor: no se puede llamar a confirmar
tres de siete facturas y dejar cuatro sin preguntar en la misma llamada.

**El veredicto se CONGELA con el contacto.** Registrada la llamada deja de ser una predicción. Volver
a predecir sobre el monto ya recortado es circular —retirar las no confirmadas baja el monto, y los
criterios sensibles al monto podrían pasar a cumplir— y borraría la evidencia recién firmada.

**Quién firma.** Sólo el **Ejecutivo de verificación** (y el super-admin) marca una factura como
verificada o no verificada, en la mesa y en el tab del detalle. El resto ve el estado pero no lo firma:
una verificación es evidencia de una conversación. Se delega por vacaciones (§18).

**Dónde se trabaja.** El **tab Verificación** del detalle aparece con facturas en la oferta y en dos
escenarios: cuando el ejecutivo aprieta **Pre-evaluación**, o cuando la oferta está **cerrada y
publicada**. Antes de eso no hay nada que llamar: la oferta se está armando y quemar 3 o 4 horas por
un deudor cuyas facturas quizá se retiren es el error que la compuerta evita. La **mesa de
verificación** es la vista del equipo, y lista **sólo** lo que el predictor mandó a teléfono, con
**todas** las causas que gatillaron el contacto: si fueron dos, van las dos, porque quien llama tiene
que confirmarlas en la misma llamada.

---

### 4. Pricing y simulación (`simularOperacion`)

Dos preguntas de plata: **a qué tasa** se compra cada factura y, con esa tasa, **cuánto recibe el
cliente**.

**La tasa.**

```
tasa mensual del deudor = spread del deudor + costo de fondo
spread bruto            = spread de lista − descuento por estado de SOW
spread final            = max(piso del deudor, spread bruto)
```

- El **costo de fondo** es un dato diario y el mismo para todos los deudores. Separarlo del spread es
  lo que permite saber si un negocio flojo lo está por la plaza o por el deudor: una decisión la toma
  tesorería y la otra el comité.
- El **spread de lista** y la **tabla de descuentos por SOW** son **política comercial del tenant** —
  cuánto está dispuesto cada factoring a resignar para recuperar cartera— y entran por parámetro.
- El **piso del deudor** es lo único de este eslabón que **no** es configurable: sale del modelo de
  riesgo. Que el default de un deudor desconocido sea más alto que el de todos los listados es
  deliberado: no conocer al deudor es más riesgoso que conocerlo mal.

**El desglose.** Un catálogo **ordenado** de conceptos, configuración del tenant. Cada concepto tiene
su fórmula sobre variables de la operación, condiciones que edita el ejecutivo, constantes del tenant
y **los conceptos ya calculados más arriba**. Rol `base` = monto de referencia; rol `descuento` = entra
al Subtotal.

**El cierre es fijo y no se configura:**

```
Monto a Girar = Monto Anticipo − Subtotal Descuentos
```

y la **Retención**, con fórmula propia, **se informa y no se descuenta del giro**: condiciona lo que el
cliente termina recibiendo pero se libera si las facturas se pagan en fecha. Meterla al Subtotal la
haría irrecuperable en el modelo; dejarla fuera del catálogo la haría invisible.

*¿Por qué es configuración y no código?* Dos factorings no calculan igual —otro IVA, otra retención, un
gasto por documento, un concepto que uno cobra y el otro no—. Mientras la aritmética viviera dentro de
un componente de pantalla, ni se podía representar otro tenant ni llevar el cálculo al backend, que es
donde el monto a girar tiene que calcularse.

**Las fórmulas se INTERPRETAN, no se evalúan como JavaScript.** Un parser propio produce un AST y un
evaluador lo recorre. No es purismo: la fórmula la escribe un administrador y queda en la
configuración del **tenant**, así que correría en el navegador de **todos** sus usuarios — con `eval`,
el mantenedor de pricing sería una consola remota. Y un AST se serializa y se re-evalúa idéntico en el
resolver, que es a donde esto tiene que mudarse.

- Gramática: `+ − * / % ( )` —donde `%` es el **módulo**, no un porcentaje—, unario, y ocho
  funciones con aridad verificada al parsear.
- Un porcentaje se escribe dividiendo (`tasa / 100`), que es lo que lo hace auditable por quien no la
  escribió.
- **División por cero da 0, no `Infinity`**: un `Infinity` se propaga a todas las filas de abajo y
  destruye el documento; un 0 es una cifra rara que se nota en una fila.
- **Toda fila se redondea al peso.** El peso chileno no tiene decimales y cada concepto se transfiere
  o se contabiliza.

**Se valida ANTES de guardar**: identificador inválido, repetido, que choca con una variable,
**referencia a un concepto posterior**, variable inexistente, fórmula que no parsea, catálogo sin
ningún concepto de rol `base` —sin él no hay de dónde descontar y todo giro sale negativo— y los dos
mismos controles sobre la fórmula de la retención. La
referencia adelantada es la peor: daría 0 sin avisar, y un 0 en una fila de descuentos es plata que el
factoring deja de cobrar sin que nadie lo note mirando la pantalla. En **ejecución**, en cambio, una
fórmula rota deja la fila en 0 y marcada, y el resto del desglose sigue cuadrando: el usuario está
mirando una oferta, no un test.

**La pantalla se dibuja DESDE el catálogo.** Un concepto que el administrador agregue aparece en el
detalle y entra al Subtotal. Mientras las filas estuvieran cableadas, el mantenedor sería decorativo.

---

### 5. Prorrateo por factura (`prorratearOperacion`)

La simulación da cifras de la **operación**; el giro se materializa en transferencias que ejecuta
**Tesorería**, y para repartir hay que saber qué le toca a **cada documento**.

> **Regla de oro.** La suma por documento es **siempre** el total de la operación, **en todos los
> conceptos**. Todo lo demás de este eslabón existe para sostenerla.

**El descuento es RACIONAL, no lineal:**

```
VP  = monto / (1 + tasa/100 · días/30)
dif = monto − VP
```

Con descuento lineal la cifra sale más alta y no reconcilia contra la planilla del negocio, que es el
documento con el que el área comercial compara.

**Dos modos.**

- **Bottom-up** (tasa del deudor): la diferencia de precio de cada documento se calcula con la tasa de
  **su** deudor y su propio plazo, y la de la operación es la **suma**. La tasa la pone el riesgo del
  deudor: dos deudores del mismo cliente tienen spreads distintos porque son dos riesgos distintos.
- **Top-down** (tasa única que fija el ejecutivo): esa tasa sobre el plazo de cada documento. **No se
  reconstruye la tasa de cada deudor** — es un problema de optimización con infinitas soluciones y
  daría cifras que nadie puede explicar frente al cliente. Se resigna a propósito.

**El plazo equivalente se pondera por el peso en la DIFERENCIA DE PRECIO, no en el monto.** Es la
única ponderación con la que la tasa equivalente reproduce la diferencia de precio de la que salió,
que es lo único que justifica que exista una tasa equivalente. Medido sobre la planilla del negocio:
dos documentos de MM$100, uno a 31 días al 1,00% y otro a 62 días al 1,20%, dan **52,79** días
ponderando por diferencia de precio y **46,50** ponderando por monto.

```
tasaEquivalente (%) = difPrecio / plazoEq · 30 / VP_total · 100
```

**Precisión 6/2/1: se calcula con 6 decimales, se muestra con 2 la tasa y 1 el plazo, y la fórmula del
resumen recibe siempre la exacta.** No es cosmética: sobre el ejemplo de la planilla (MM$200),
calcular con la tasa ya redondeada a los 2 decimales que se muestran mueve la diferencia de precio en
**15.764 pesos**, y el resumen dejaría de cuadrar con la suma por documento.

**Los demás conceptos son siempre top-down** y se reparten por peso en **monto**, sin plazo: se
determinan sobre la operación, no sobre el documento. Una comisión acotada por un mínimo en UF no
tiene versión por factura.

**El descuadre es ESTRUCTURAL, no un defecto.** El peso chileno no tiene decimales, así que el monto
de cada factura tiene que ser entero, y redondear *n* veces y sumar no da el total. Por eso hay una
**variable de ajuste por concepto** que se **devuelve** en vez de esconderse, y el residuo lo absorbe
el documento de **mayor peso en ese concepto** —la factura más grande en todo lo que se reparte por
monto, y la de mayor diferencia de precio en la diferencia de precio—: siempre puede absorberlo sin
cruzar el cero. En el de menor peso el ajuste podía superar lo asignado, y una comisión negativa no se
explica ni se transfiere.

---

### 6. Cierre, publicación y firma del cliente

Cerrar la oferta y publicarla son **la misma decisión** y se toman en el modal de curse. La vía cambia
**qué queda pendiente**, así que tiene que elegirse antes de confirmar, no después.

**Qué muestra el modal.** Los bloques de «qué tiene que pasar» con un tratamiento **neutro e idéntico**
y el mismo resumen **facturas · deudores · monto** a la derecha, que es lo que se compara entre
bloques. Un bloque en $0 no se dibuja: no le pide nada al ejecutivo y empuja hacia abajo a los que sí.

*¿Por qué neutro?* Con color e icono propios la pantalla se leía como un semáforo y afirmaba
«bueno/malo», cuando lo único que hay que comunicar es **qué falta y por cuánto**.

**Las dos compuertas del cierre.**

1. **No quedan excepciones sin justificar.**
2. **El «Monto a Girar» es positivo.** El corte está en **$1**, no en cero: no se transfieren $0, y
   girar negativo sería cobrarle al cliente por venderte su factura — pasa con documentos chicos,
   donde la comisión mínima más los gastos y su IVA superan al anticipo.

> **El gate va al FINAL del camino, no a la entrada.** Agregar la factura y simular es exactamente
> cómo el ejecutivo ve **por qué** no da: prohibir agregarla escondería la causa y dejaría la pantalla
> diciendo que no sin decir cuánto falta. Y **sin simular no se pronuncia**: una oferta que nadie
> evaluó no se bloquea por una cifra que nadie calculó.

Las dos se **dicen**, no sólo apagan el botón: el giro no positivo con una banda que trae el motivo y
qué hacer; las excepciones sin justificar, dentro de su propio bloque y en el tooltip del CTA. Un CTA
apagado sin explicación deja al ejecutivo sin dónde enterarse.

**El CTA nombra lo que va a pasar.** Con parte de la oferta sin cupo, el botón dice **«Enviar a Comité
y Publicar»**: cerrarla ahí no es sólo cerrarla, y ésa es justo la consecuencia que hay que anticipar
antes de apretar.

**La solicitud de línea la genera el CIERRE, no el ejecutivo.** Cuando el cierre deja deudores sin
cupo, se arma **una** solicitud con **N líneas de detalle** —una por deudor, con lo que faltó y en
línea **puntual**— y se inyecta por API 1. El ejecutivo no vuelve a capturar a mano la lista que el
modal acaba de mostrarle deudor por deudor (§11).

**El curse NUNCA es por email.** El cliente acepta **sólo firmando en el portal**. El correo es el
aviso, y explícitamente **sin enlaces**: el cliente entra por su cuenta, se autentica y firma con un
código de un solo uso.

*¿Por qué?* Una firma tiene que poder atribuirse a una persona autenticada. Un clic en un enlace de
correo no identifica a nadie y es el vector natural de phishing sobre una operación con monto
conocido.

**El ejecutivo no puede mover una operación a Aceptada.** Está bloqueado en el arrastre y en el
selector: «Aceptada» representa la firma formal del cliente, y que la pudiera fijar el ejecutivo
convertiría la evidencia de una firma en una preferencia de pantalla.

**La evidencia es una HUELLA del paquete, no una bandera.** La huella es una cadena canónica con
**N° de operación · RUT del cliente · nº de deudores · nº de facturas · monto total · monto por deudor
ordenado**, y se guarda junto con su SHA-256.

- Una **bandera** dice «el cliente firmó» y confía en que toda modificación pase por el botón
  «Reabrir». La **huella** dice «el cliente firmó **esto**» y no confía en nada: cambió el paquete, no
  calza, venga el cambio por donde venga.
- El **monto por deudor ordenado** es lo que cierra la sustitución: con sólo conteos y total, cambiar
  una factura por otra del mismo monto en otro deudor dejaría la huella idéntica.
- **Las condiciones comerciales NO entran.** El cliente firma un paquete y un monto de documentos; el
  precio se mueve dentro de la atribución y tiene su propio control. Si el precio entrara, ajustar la
  tasa un decimal revocaría una firma válida.
- Se guarda **la cadena y el hash**: el hash sirve para comparar y la cadena para **auditar** — quien
  revise un giro en seis meses necesita ver qué se firmó, no un hexadecimal que sólo dice que no
  calza.

---

### 7. Después de la firma: las tres compuertas

**Firmar es del CLIENTE; girar es de la casa**, y sólo después de que sus controles pasen. En el
instante en que se registra la firma, `etapaTrasFirma` recibe el estado de las tres compuertas —más si
la operación exige otorgamiento manual por línea o por deudor— y devuelve el destino:

| Compuerta | Invariante | Qué falta |
|---|---|---|
| Otorgamiento | OTG-02 | excepciones o rechazos re-evaluables sin resolver |
| Verificación | VER-01 | llamadas telefónicas pendientes |
| Contrato de cesión | GIR-02 / O05 | no consta la autorización, o no describe este paquete |

- **Falta cualquiera de las tres → «Otorgamiento / Verificación».** Es **una** etapa y no dos, aunque
  sean dos motores: el ejecutivo tiene un solo pendiente —que la casa termine de revisar— y no puede
  hacer nada distinto según cuál falte.
- **No falta ninguna, y la operación cabe en la línea con deudores conocidos → «Pendiente
  Integración».** Hay una cuarta entrada además de las tres compuertas: si la operación supera la línea
  aprobada del cliente o incluye deudores «Otro», queda igual en «Otorgamiento / Verificación», con su
  propio motivo. Con todo resuelto, la operación **sale del tubo**: ya no es una
  oportunidad y el ejecutivo no tiene nada que hacer ahí. Los KPI, en cambio, la siguen contando: la
  venta girada del mes es suya aunque la operación ya no esté en su tablero.
- **Operaciones (N3 o superior) aprueba la integración al core → «Pendiente de Giro».** Quien responde
  por lo que entra al core es esa área.

`integracion` (`null` · `pendiente` · `aprobada`) es un **campo** de la operación y no una etapa nueva:
las etapas del tubo describen el proceso **comercial**, y esto ya no lo es. Además el tenant puede
renombrar sus etapas, y «Pendiente Integración» no es algo que un factoring pueda renombrar — es
**dónde está** la operación.

**GIR-02 · El gate de inyección al core.** Ahí se compara la huella del paquete que se va a inyectar
contra la de la evidencia. Es el **último punto en que la comparación sirve de algo**: después el
dinero ya salió.

- Devuelve **el porqué** y no un booleano: `sin_evidencia` y `no_calza` se arreglan de formas distintas
  —una pide adjuntar el comprobante o esperar la firma, la otra pide volver a firmar— y la pantalla
  tiene que poder decir cuál es.
- El destino «Girar» **no desaparece** del menú cuando falla: se muestra apagado, con el motivo y con
  las dos huellas. Desaparecer sin explicación deja al ejecutivo con una operación aceptada que no
  puede girar y sin dónde enterarse de por qué.
- **Se comprueba dos veces**: al dibujar el botón y al escribir la mutación. La pantalla que muestra
  el botón no es el control — puede venir de una sesión vieja, de un rol que cambió o de un paquete
  que se modificó en otra pestaña.
- La comparación va en **tiempo constante**, no con `!==`: comparar strings corta en el primer byte
  distinto y filtra por tiempo cuántos caracteres se acertaron.

**El tab de Otorgamiento sobrevive a la firma.** Después del giro el visado es además el **registro**
de quién aprobó qué, y esconderlo lo deja inalcanzable justo cuando hay que auditarlo.

---

### 8. Modelo de giro y entrega a Tesorería (`asignarGiros`)

Último eslabón: toma el monto a girar **ya prorrateado por factura** y decide **por qué vía** va cada
parte. No calcula plata: la reparte y la etiqueta.

> **Regla de oro heredada del prorrateo.** La suma por tipo es **siempre** el monto a girar. Un peso
> que no cae en ningún tipo es un peso que nadie transfiere.

| Código | Tipo | Califica |
|---|---|---|
| **GE** | Giro Express | la verificación lo dio por **no necesario** **y** el otorgamiento **no** dejó marcas de excepción, ni del cliente ni del deudor |
| **GN** | Giro Normal | todo lo demás |

*¿Por qué las dos condiciones a la vez?* Express es la vía rápida **de Tesorería**, y su criterio se
apoya en lo mismo que las tres compuertas ya exigen (§7): si el deudor no confirmó por teléfono o si el
otorgamiento dejó una excepción sin visar, hay una razón conocida por la que ese dinero podría no
volver, y ese deudor no entra a la vía rápida. **Girar antes de que los controles terminen no ocurre
en ningún tipo:** ninguna operación con algo pendiente llega al giro.

> **Supuesto explícito.** El enunciado de negocio describe GN como «por verificar **y** con marcas de
> excepción». Se implementó como **disyunción**: con conjunción, una factura por verificar y sin
> excepciones no calificaría en ningún tipo y la regla de oro se rompería. **Pendiente de confirmar.**

**Qué cuenta como marca de excepción:** una excepción, o un rechazo **re-evaluable**. Un rechazo firme
no es una marca — esa operación no se cursa, así que no llega a discutir de qué tipo es su giro.

**La calificación es POR DEUDOR y las facturas heredan.** Los dos motores de los que depende deciden
por deudor, así que dos facturas hermanas no pueden salir con tipos distintos sin que exista ningún
hecho que las separe. Las condiciones del **cliente** entran igual en el bloque de hechos de cada
deudor, para que el criterio se evalúe contra un solo objeto y un tipo nuevo pueda mezclar los dos
niveles.

**Primera operación → todo GN, y es aritmética, no una regla aparte:** la regla 0 de verificación manda
a llamar todas las facturas, así que ningún deudor sale verificado. El modelo declara igual la
condición —aunque sea redundante— para poder **explicar** el resultado sin reconstruirlo: un ejecutivo
que pregunta por qué su cliente no tiene Express necesita una respuesta, no una deducción.

**El catálogo es una LISTA con criterio declarativo**, para que agregar un tipo sea agregar una fila.
El orden es la prioridad y el último lleva el comodín, que recoge lo que no calificó en ninguno — sin
él una factura quedaría sin tipo y la suma dejaría de cuadrar. Un criterio sólo puede pedir hechos que
el modelo declara: uno que pida otra cosa **no lo cumple nadie**, a propósito, para que un catálogo mal
escrito se note como un tipo en cero en vez de desviar plata en silencio hacia una vía rápida que
nadie autorizó.

**El cuadre se informa, NO se fuerza.** Si no cuadra, el que está mal es quien armó la entrada: los
montos por factura salen del prorrateo, que ya cuadra por construcción con su propia variable de
ajuste. Taparlo acá con un segundo ajuste escondería el error en el sitio equivocado y dejaría dos
mecanismos de cuadre discutiendo entre ellos.

**Un tipo en cero no se dibuja**, y el chip **se nombra solo** —«Giro Express», «Giro Normal»—: en la
fila del deudor no hay un rótulo que lo anteceda.

**Y ahí termina la cadena del pipeline comercial.** El resultado se entrega a **Tesorería**, un módulo
independiente. El contrato de esa entrega todavía no está modelado (§23).

---

## Parte II · Las variantes

Cada una dice **dónde** se separa del camino general y **qué** se comporta distinto.

### 9. Cliente nuevo · primera operación

**Se bifurca en cuatro puntos**, y conviene saber que «cliente nuevo» significa cosas distintas en cada
uno:

| Predicado | Qué mide | Qué cambia |
|---|---|---|
| Estado del cliente (API de Security) | `nuevo` · `activo` · `suspendido` · `eliminado` | **regla 0** de verificación → se llaman todos los deudores; y el giro entero a **GN** |
| C05 · Línea Cliente Nuevo | no tiene línea aprobada | **excepción de Riesgo N5**, la máxima |
| Estado A del motor de líneas | el maestro no lo conoce | sólo **LF1**, $30.000.000, restringida a deudores **Prime** |
| Sin historia de Share of Wallet | no hay serie del A5 | no hay «tasa del último negocio»: el piso comercial de precio no aplica |

**C05 va a Riesgo N5 y su vía normal NO es el visado.** Constituir una línea es la decisión más
estructural del proceso y en la práctica la ejerce el Comité de Crédito, que **no es un nivel aparte
ni una cuenta del sistema**: es quien ejerce la máxima atribución de Riesgo. El campo `regulariza` de
la regla declara que el ejecutivo no debe excepcionarla — se tramita la línea y, aprobada, la regla
deja de salir al re-evaluar.

**La LF1 restringida a Prime es lo que la hace defendible.** Existe para desbloquear la primera venta
sin esperar al comité, no para financiar la cartera: el único riesgo que la casa acepta sin análisis es
el de deudores cuya calidad ya está declarada en las listas. Medido, cubre alrededor del 1% del libro
del cliente mediano.

**El inbound dimensiona con un cupo TENTATIVO, no con la LF1.** La demanda real de un cliente nuevo es
justo lo que debe disparar la solicitud de línea, y recortarla la escondería: el **55%** de los
cedentes no tiene línea aprobada, y dimensionar con su disponible —que vale 0— dejaría el **81%** del
tubo en un solo documento. El cupo tentativo dimensiona **sin afirmar**: la línea aprobada sigue en 0
y la pantalla sigue diciendo «Sin línea».

### 10. Cliente sin línea y línea suspendida

Se bifurca **antes** de la cascada de líneas. Tres estados, y los dos primeros se ven igual aguas abajo
pero no son lo mismo:

| Estado | Qué es | Qué recibe |
|---|---|---|
| **A** | enrolado, todavía sin comité | **LF1** de $30.000.000, sólo deudores Prime |
| **S** | el comité SÍ le constituyó líneas y hoy están **todas suspendidas** | **nada** — no hay cascada de ninguna clase |
| **B** | el caso general | LF2/LF3/LF4 según su reparto |

**«Sin fila en el maestro» no significa «cliente nuevo».** Se distingue con **dos** preguntas al mismo
archivo: quién tiene cupo, y a quién **conoce** el maestro. Si el archivo lo nombra y aun así no tiene
cupo vigente, es un estado S.

*¿Por qué S no recibe la LF1?* Un cliente al que el comité le constituyó líneas y se las suspendieron
tomó una decisión de riesgo deliberada. Darle la LF1 de cliente nuevo la **rodearía**: el mismo cliente
al que se le cerró el cupo saldría cursando $30.000.000 al día siguiente por la puerta del
enrolamiento.

**En estado S no se evalúan montos.** No es que no quepa: es que **no hay contra qué imputarla**.
Evaluar contra un cupo inexistente produciría un motivo de rechazo que manda al comité la solicitud
equivocada — ampliar una línea en vez de reactivarla.

**Suspender no libera lo ya cedido.** La exposición vigente es plata que el deudor todavía no pagó:
ponerla en cero al suspender haría desaparecer del nivel 3 una concentración que sigue existiendo y que
comparten todos los clientes que le ceden a ese deudor.

### 11. La factura no cabe: solicitud de línea al comité

Se bifurca **dentro** de la reevaluación. La factura que no cabe en los tres niveles no se descarta ni
se retiene: sale marcada `REQUIERE_COMITE` con su **motivo**, y el motivo determina qué se pide.

| Motivo | Qué se le pide al comité | A quién afecta |
|---|---|---|
| `par` / `lf4` | Solicitar **Línea Puntual** Cliente-Deudor | sólo este par |
| `lf1` | **Asignación de líneas** por comité | todo el cliente |
| `cliente` | **Ampliar Línea Global Cliente** | todo el cliente |
| `deudor` | Solicitar o **Ampliar Línea Global Deudor** | **todas** las carteras |
| `suspendida` | **Reactivar** las líneas del cliente | todo el cliente |

**La oferta no se parte.** La operación sigue el camino general completo —se simula, se cierra, se
publica, el cliente firma— y lo único que se desvía es que al cerrar sale sola la solicitud.

**Una solicitud por (deudor, motivo).** El comité aprueba o **recorta** cada línea por separado:
agrupar por factura llenaría la bandeja de redundancias; agrupar todo en una obligaría a aprobarla o
rechazarla entera.

**Lo pedido se SUMA a la vigente.** El campo que viaja es *vigente + pedido*, porque es el que se
escribe como la línea aprobada del cliente: mandar sólo lo pedido dejaría al cliente con **menos**
línea el día que el comité se la aprueba — una solicitud que castiga por pedir.

**«Sin línea propia» no es una línea en cero.** El par sin cupo propio se financia por el comodín del
cliente, así que escribir «$0 aprobada» afirmaría que al comité se le pide ampliar algo que existe — y
es justamente el caso que una puntual viene a resolver. El comodín tampoco se cuela en la fila del par:
no es suyo.

**La solicitud viaja en PESOS y el borde que la constituye no la redondea.** El cupo que aprueba el
comité puede ser **cualquier monto** —típicamente redondo, pero nada aguas abajo puede suponerlo—, y
una décima de peso en el disponible es la cifra contra la que el motor decide si una factura cabe.

**NEX sólo inyecta y consulta.** La atribución para aprobar una línea es del comité de crédito, que
vive en el sistema de gestión de líneas. Duplicar acá ese ciclo duplicaría un estado cuyo dueño es otro
sistema — la misma razón por la que **NEX evalúa, no reserva** (§17).

### 12. Deudor «Otro» y carga manual

Se bifurca en **un solo predicado** del inbound: un deudor sin listas y sin historia de 12 meses no
abre oportunidad por sí solo.

*¿Por qué?* Prospectar es la casa ofreciéndose sola. Sin lista de riesgo y sin haberle comprado nunca a
ese par no hay nada sobre lo que basar la oferta, y una oferta automática a una contraparte desconocida
es un compromiso comercial que nadie tomó. **Excluirla del inbound no es negarse a comprarla**: es
exigir que la decisión la tome una persona.

Desde que esa factura entra a la oferta, tres cosas cambian a la vez:

1. **Otorgamiento manual.** La operación deriva a Otorgamiento aunque el visado no levante ninguna
   excepción. Es la contrapartida exacta de lo anterior: si el sistema se negó a abrir la oportunidad
   solo, no puede después dejar que se curse sola.
2. **Comodín LF4.** Qué comodín le toca lo decide el tipo del deudor, y no hay una tercera categoría
   porque el comité no aprueba cupo para «desconocidos»: todo lo que no es Lista Blanca cae en
   «Deudores Autorizados». El tipo pesa además en el **orden** de atención —los Prime primero, porque
   el comodín y el tope del cliente son recursos compartidos—, en la LF1 del estado A y en la holgura
   con que se talla la línea global del deudor.
3. **Protocolo completo de verificación**, salvo que la nota lo rescate. V09 es el caso que mejor lo
   explica: un Prime no tiene techo por monto; sin lista, ese techo vuelve a existir.

**«Otro» no significa «sin línea propia».** La línea de par la aprueba el comité por la cuantía de la
relación comercial, no por en qué lista está el deudor.

**Y en estado A la LF1 lo excluye:** un cliente nuevo comprándole a un deudor desconocido son dos
incógnitas a la vez.

### 13. Rechazo firme y pérdida

Se bifurca **antes** de que el ejecutivo toque nada: la oportunidad puede crearse y morir en
Prospección, sin oferta, sin líneas y sin verificación.

**Tres reglas del catálogo pueden rechazar**, y son las tres de la Tesorería General de la República:
**C30** cobranza judicial · **C31** convenios de deuda · **C32** cuotas de convenio impagas. El
knockout es **binario y el umbral es cero**: no hay tramos, no escala con el monto.

*¿Por qué?* Una cobranza judicial del Fisco, un convenio de deuda o sus cuotas impagas no son una
magnitud de riesgo: son un **hecho jurídico**. El Fisco tiene prelación sobre el crédito que se está
comprando, así que el tamaño del adeudo no cambia la respuesta.

**Las seis reglas TGR se parten 3/3 y los dos ejes coinciden.** Deuda vigente, morosa y cobranza
administrativa son **excepción** y **re-evaluables**: deberle impuestos al Fisco es un hecho corriente
de cualquier empresa chilena. Que el Fisco haya **judicializado** el cobro, o que el contribuyente haya
**reconocido** la deuda firmando un convenio —y más aún, que lo esté incumpliendo— es otra cosa.

**El knockout es del CLIENTE, nunca del deudor.** Lo que se compra es el crédito del cliente contra su
deudor: que el Fisco persiga al **cedente** contamina la cesión misma —puede embargar el crédito que
nos están vendiendo—; que persiga al deudor es riesgo de cobranza, y eso lo miden las 23 reglas de
deudor con excepción y nivel.

**Lo que se repara al re-evaluar es una lista explícita**, no un filtro por categoría: documentación,
vigencias, garantías y comportamiento comercial ajustable. **Nunca se reparan** los datos de bureau
—CMF, ACHEF, infracciones laborales— ni las seis TGR. Una firma no borra un dato de bureau:
la cobranza judicial la levanta la Tesorería General, no nosotros. Eso es lo que hace que la pérdida
sea **terminal de verdad** y no una etiqueta. Queda un desfase anotado: la re-evaluación deja hoy los
**protestos** en cero, así que ese criterio se repara con la firma cuando por la misma razón no
debería.

**La segunda puerta al mismo destino** es una excepción que el apoderado con atribución **rechazó**. Si
quien tiene el par (área, nivel) dijo que no, dentro de esta operación no hay a quién apelar: la
escalada del modelo es por **nivel**, no por reintento, y quien está arriba en la misma área ya podía
haberla visto. Re-evaluar para borrar un «no» firmado sería deshacer evidencia.

**La pérdida es estado terminal**, y graba cuatro cosas en el mismo movimiento: **causa específica**
(nunca la genérica), **etapa de origen**, **actor** y **hora**, más el cierre de tareas en cascada.

- Sin la etapa de origen el embudo no puede decir **dónde** se cae el negocio, que es para lo que sirve
  medir pérdidas.
- La causa tiene **precedencia fija** y el bloqueo firme gana: es la razón por la que la operación no
  se podía cursar pase lo que pase. Rotularla «no tomó la oferta» diría que la perdimos comercialmente
  y mandaría al ejecutivo a recuperar un cliente que Riesgo bloqueó.
- Los **badges accionables se suprimen**: un badge es una llamada a la acción, y «Requiere Verificación
  3/7» sobre una operación muerta manda a alguien a gastar 3 o 4 horas llamando por una operación que
  no existe. Lo que los reemplaza no es vacío: es la **causa**.

**Reabrir una pérdida es una operación nueva** con referencia a la anterior, no una resurrección.

### 14. El deudor no confirma

Se bifurca en la mesa de verificación. La factura sale de la oferta y queda **vetada** para esa
operación.

**El veto no es reversible.** Es el resultado de una llamada, no una preferencia del ejecutivo: si
fuera reversible, el mismo ejecutivo que no consiguió la confirmación podría reponer el documento y
girar contra un crédito que ya se sabe que el deudor discute. Se comprueba **dos veces** —al ofrecer la
factura y al incorporarla— por si la pantalla la ofrece por otro camino.

**La confirmación puede ser PARCIAL.** El deudor reconoce unas facturas y no otras: el veredicto sigue
siendo del **deudor** y el veto es por **factura**. Es el único punto del pipeline donde las facturas
hermanas dejan de coincidir, y por eso el badge del tab es por factura mientras la cabecera agrupa y
dice «n de m por verificar».

**Después de la firma la operación sólo ENCOGE.** El retiro no re-asigna contra el estado del día:
**recorta** la asignación anterior y las demás facturas conservan su línea y su origen.

*¿Por qué?* El cupo ya está reservado por un monto **mayor** que el que queda, así que volver a evaluar
no puede mejorar nada y sí puede empeorarlo: expondría la operación al cupo que otro negocio consumió
mientras tanto. Una operación firmada no pierde línea por una llamada telefónica.

**El cupo liberado no vuelve solo.** Sigue reservado por el monto original hasta que lo liberen en el
sistema de gestión de líneas. La app **muestra** el monto y dónde pedirlo, y nunca lo toca.

**La oferta no puede quedar vacía por esta vía**: retirar la última factura de la operación no es una
oferta encogida, es una **pérdida**, y ésa es otra decisión con su propia causa y su propio actor.

### 15. Reapertura

Es la **única vuelta atrás** que existe. Se llega desde Aceptada o Cesión; **girada no se reabre** —el
dinero ya salió y devolverla a oferta reescribiría de qué es una transferencia que Tesorería ya
ejecutó—. La guarda se repite en el handler, porque entre que se dibujó el menú y que se apretó, la
operación pudo girarse.

**Reabrir REVOCA la firma.** Mientras la marca esté puesta, la aprobación formal del cliente devuelve
**false**: el cliente firmó un paquete y un monto concretos, y si eso cambia, lo firmado ya no describe
lo que se va a cursar.

**El corte va en el GATE, no limpiando banderas.** Limpiar banderas una por una es una lista que hay
que mantener: el día que alguien agregue la quinta forma de marcar «el cliente aceptó», tiene que
acordarse de limpiarla acá — y si se olvida, la operación gira sin aceptación vigente. Un
cortocircuito no se puede olvidar. Y la **huella** es la segunda cerradura, que además no confía en que
la modificación haya pasado por este botón.

**Al reabrir NO se parte de cero.** Sobrevive todo lo que es **evidencia**: el visado, las excepciones
de verificación, las **llamadas telefónicas ya registradas** y las facturas vetadas. Rehacer una
verificación telefónica son 3 o 4 horas por deudor, y un visado es la decisión de un apoderado con su
actor y su hora.

**La reserva sobrevive y NEX no la toca.** El diálogo dice cuánto quedó reservado de la versión
aceptada y que hay que pedir su liberación en el sistema de gestión de líneas; hasta entonces ese cupo
aparece tomado al re-evaluar. Hay que **decirlo**, porque si no se lee como un error del sistema.

**Distinta de «Eliminar la simulación y vaciar la oferta»**, que devuelve la oportunidad al estado de
entrada —oferta vacía, facturas de vuelta en el pool, campos de la simulación borrados, etapa de vuelta
a Prospección— y que sólo se puede **mientras la oferta siga siendo del ejecutivo**: publicada es un
compromiso con el cliente y firmada es un paquete aceptado. Ahí la opción va deshabilitada **con el
motivo escrito**, apuntando a «Reabrir para modificar», que es la puerta que revoca la firma
explícitamente.

### 16. Publicación física vs. electrónica

Se bifurca en **un** punto: el modal de curse. Lo que la elección cambia **no** es lo que decide el
motor de otorgamiento —medido: entre una operación electrónica y la misma física, sin evidencia,
cambian **0** criterios de 77— sino **quién escribe la huella** que cierra O05.

| Vía | Quién crea la evidencia | Qué más cambia |
|---|---|---|
| **Electrónica · email** | la **firma del cliente** en el portal; O05 queda aprobado sin que nadie lo vise | sale el correo con el código de negocio y la clave de un solo uso |
| **Física · contrato adjunto** | el **visado de Operaciones** sobre el comprobante adjunto | no sale correo ni código |

*¿Por qué existe O05 en las dos?* Que el criterio existiera sólo en la vía física dejaría a la
operación electrónica cursando **sin ninguna constancia** mientras el cliente no firma.

*¿Por qué en la electrónica nadie lo visa?* El acto de autenticarse y firmar en el portal, con su
actor y su hora, **es** el respaldo: no hay nada que un apoderado pueda agregar verificándolo. En la
física, en cambio, el papel se firmó **fuera** del sistema: no hay nada que el sistema pueda dar por
cierto.

**La tarjeta del criterio dice dónde va el contrato**, y el texto cambia según la vía. Que la vía
física deja O05 abierto lo decían el modal (al confirmar, o sea *antes*) y el badge de la oferta
publicada, los dos en otra pestaña; en la tarjeta donde se **actúa** no lo decía nadie. Y un aviso que
pide un papel cuando no hace falta enseña a ignorarlo. El cargo que autoriza se **deriva** del padrón,
no se escribe: quién firma en Operaciones lo configura el tenant.

**El correo sale dentro del gesto del clic.** Diferirlo a un efecto le haría perder la activación del
usuario y el navegador lo bloquearía como pop-up.

**La evidencia de O05 no se congela con la versión.** La versión es la foto de lo que dijo el **origen
externo**; la evidencia es un hecho de la operación que cambia dentro de la misma revisión. Leída del
snapshot, publicar en papel no abriría el criterio hasta la próxima reevaluación, o sea **después de
girar**.

### 17. La reevaluación siguiente y el diff entre versiones

**Cada evaluación emite una VERSIÓN**, append-only e inmutable, que congela: las variables del modelo
con su disposición por regla, la **asignación de líneas** (qué línea y qué monto por factura) y el
**veredicto de verificación** por deudor. La versión estampa además **con qué política** y con qué
build se evaluó — la vigente **en el instante** de la evaluación, no la actual.

*¿Por qué la política?* Sin eso, comparar la v1 con la v2 después de un cambio de umbrales produce un
diff que **miente**: se movieron las reglas, no los datos. Y una operación aprobada hace meses no se
puede reconstruir.

**La versión es evidencia, NO reserva.** La API manda: la asignación se calcula íntegramente con lo
que devuelve la consulta de líneas. La versión anterior **no reserva cupo, no protege facturas y no
entra al cálculo** — devuelve exactamente lo mismo con y sin ella. Lo único que agrega es el **diff**.

*¿Por qué?* Si la versión anterior le diera preferencia a una factura, la evaluación de hoy dejaría de
ser una consulta y pasaría a ser un estado que hay que mantener, y dos sesiones abiertas darían
resultados distintos sobre el mismo origen.

**El diff dice lo que el resultado nuevo NO dice:**

- `gano_linea` — le ampliaron la línea (o un deudor pagó y se liberó cupo) y facturas que iban a comité
  ahora se cursan.
- `perdio_linea` — el cupo se consumió en **otro negocio**, a veces de otra cartera, y ahora califican
  menos.
- `cambio_de_linea` — la factura se sigue cursando, pero la financia otro cupo: se agotó la puntual y
  ahora entra por la normal, o el mismo par se reparte distinto entre sus líneas. El cursable no se
  movió y no hay nada que pedirle al comité; lo que cambió es **de dónde sale la plata**, que es lo que
  explica por qué la puntual del mes pasado ya no alcanza.

Sin el diff, una oferta idéntica que ayer se cursaba y hoy no **se lee como un error del sistema** — y
el ejecutivo no lo puede deducir mirando sólo el resultado nuevo, porque la línea del deudor es global
y el comodín del cliente es un pozo compartido.

**Una operación ACEPTADA se LEE de su versión, no se re-evalúa.** Su cupo ya está reservado, así que el
disponible que devuelve la consulta viene **neto** de esa reserva: recalcular mostraría menos cursable
del que el cliente firmó, que es la cifra que se gira.

**Re-evaluar no toca las excepciones ya resueltas.** Trae datos frescos del origen; si el origen
devolviera el valor original, una excepción ya visada se reabriría y se perdería la firma del
apoderado, que es evidencia regulatoria.

**No hay reevaluación diaria de la cartera.** La asignación es una **consulta pura**: si el comité
amplió una línea o si otro negocio se llevó el cupo, la respuesta de hoy ya es la de hoy sin que nadie
recalcule nada. Lo único que corre al cierre del día es el **rollover**, que cierra y **re-origina** las
oportunidades del inbound que nadie gestionó, y las devuelve **sin simular** — una cifra vieja se lee
como cifra. Es una oportunidad **nueva**, con su propio identificador; no es la variante de reapertura,
que revoca una firma.

### 18. Rotación de personas y reemplazos

Esta variante no agrega un paso: **corta la cadena a lo largo**. Ningún motor lee quién es el
ejecutivo, así que cambiar de persona **no mueve una sola cifra**: mueve **quién ve** la operación y
**quién puede firmarla**.

**El traspaso de cartera es un acto administrativo explícito**, con fecha y responsable, y va a la
bitácora. El archivo de cada mañana reasigna **empresas**; las operaciones vivas guardan el ejecutivo
con el que nacieron. Sin el traspaso, quien recibe la cartera no ve ninguna de sus operaciones vivas.

- **Sólo se traspasa lo que está en gestión**, hasta antes del giro: una operación girada ya se
  desembolsó y moverla sólo reescribiría de quién cuelga una venta que hizo otro.
- La etapa **se vuelve a mirar en la mutación**: entre abrir el mantenedor y confirmar, una operación
  pudo girarse.
- **Quién la originó se escribe una sola vez**: en un segundo traspaso el original sigue siendo el
  primero.

**El alcance de una jefatura se DERIVA del archivo**, no se cablea, y el «ve todo» se decide por
**rol**. Lo desconocido falla **cerrado**: en una pantalla de oportunidades ajenas, un `undefined` que
se lee como «todos» es una fuga de cartera silenciosa.

**Un código que el padrón ya no conoce NO es el «Agente IA».** Relabelar falsea la atribución de una
operación que sí tuvo dueño, y lo hace en silencio: el dashboard y el plan por ejecutivo empiezan a
contarle al agente operaciones que negoció una persona.

**Una tarea de aprobación sigue al par (área, nivel), no a la foto de nombres** del día en que se
creó: así el apoderado que llega la ve y el que se fue deja de verla, sin migrar nada.

**El reemplazo entra por el PADRÓN, no por el motor.** Meterlo dentro del motor habría metido una
política de RRHH en el modelo de riesgo. Toma el **mayor** nivel por área —cubrir a un N1 nunca baja a
un N2— y marca las dos puntas, porque la bitácora tiene que poder decir **por qué** esta persona pudo
aprobar esto.

**Es ADITIVO por defecto y revocable por reemplazo.** Estar de vacaciones no es estar desconectado: un
gerente que entra a visar algo urgente no debería toparse con un permiso revocado. Un flag lo desactiva
caso a caso, para la ausencia que sí tiene que ser total —licencia, salida— donde dejar la atribución
viva es justo el riesgo. **El orden importa:** se le quita al ausente *después* de pasársela a quien
cubre, o el reemplazante heredaría un cargo ya vaciado.

**La UI tiene que mirar la atribución EFECTIVA**, no la del cargo: una atribución que sólo existe en el
motor no existe, porque nadie llega a ejercerla.

**Firmar una verificación también se delega.** Si la única Ejecutiva de verificación se va de
vacaciones, sin eso nadie registra una llamada y las operaciones se pegan en el giro.

---

## Parte III · Cortes transversales

### 19. Mapa de activos por eslabón

El patrón general: **entrega diaria por S3 → tabla interna → upsert intradía**. La app **nunca**
consulta a Security en línea; lee siempre su tabla interna.

*¿Por qué?* Desacopla disponibilidad y latencia del origen: una integración que no llega no deja la
pantalla en blanco, deja el dato del día anterior — que es un estado que se puede explicar.

| Eslabón | Activos que consume |
|---|---|
| ① Inbound | **A1** DTESync · **A2** AECSync · **A3/A4** listas · histórico |
| ② Oferta | **A1** (libro de ventas) · **A2** (cesiones por folio) · **A11** (nota, razón social, SOW) |
| ③a Líneas | consulta de líneas en tres niveles (**A23**) · ver §23 |
| ③b Otorgamiento | **A16** (variables del modelo de riesgo) · **A11** · **A24** (padrón y cartera) |
| ③c Verificación | **A10** (variables del par cliente-deudor) |
| ④ Pricing | **A11** (SOW) · configuración del tenant · el **piso de riesgo del deudor**, que hoy es una constante del fuente y ningún activo declara (§23) |
| ⑤ Prorrateo | nada externo: recibe del pricing |
| ⑥ Cierre | **A13** (inyección de solicitud de línea) · correo saliente del tenant |
| ⑦ Post-firma | **A2** (inscripción de la cesión, ver §23) |
| ⑧ Giro | nada externo: recibe de ③b, ③c y ⑤ |

**Tres reglas del mapa:**

- **UN maestro por campo.** El maestro es el activo cuyo **sujeto** es el del campo: la nota de
  comportamiento es de la **empresa**, así que sale de A11 y no de A16 aunque A16 sea la entrega del
  modelo de riesgo. Mientras los valores coincidan no se nota; el día que difieran —y difieren, porque
  tienen cortes distintos— el sistema elige por accidente: gana el que se cargó último.
- **A7/A16 nunca alimentan el motor de líneas; A23 nunca alimenta la vista Líneas.** A23 es la única
  entrega **neta de reservas** y la única con el nivel deudor. Mezclarlas da el error más caro de
  todos —cursar contra cupo ya tomado— y no avisa, porque las dos cifras se ven igual en pantalla.
- **El dominio se deriva del PREFIJO de la key** del objeto en S3, no de un campo del payload: un campo
  que el productor llena puede contradecir a la ruta, y entonces hay dos verdades sobre qué entrega es
  ésta.

**Lo que el consumidor tiene que garantizar**, porque la entrega es **al-menos-una-vez**: idempotencia
por `(bucket, key, versionId)`; resolver el orden por el **nombre del objeto** —que lleva la fecha— y
no por el de llegada, que no significa nada; DLQ tras tres intentos, porque un CSV mal formado no se
arregla reintentando y mientras tanto bloquea la cola; y carga **transaccional por entrega**, porque
media cartera es peor que la de ayer.

**Un hueco del layout se declara y se arregla en el GENERADOR, nunca aguas abajo.** Un consumidor que
reciba un monto cedido mayor que el documento no tiene con qué arreglarlo. Y **una cota hay que
ejercitarla**: mientras todas las cesiones vinieran por el total exacto, ni el hueco de la regla O06 ni
el del dato tenían cómo notarse.

### 20. Invariantes y contrato con el servidor

Doce códigos, en **un solo lugar**, que el resolver debe implementar **1:1 con el mismo código de
error**:

| Código | Qué garantiza | Eslabón |
|---|---|---|
| **TEN-01** | Aislamiento por tenant: el resolver toma el tenant del **token**, nunca del parámetro | todos |
| **RAT-01** | Límite de tasa por (usuario, colección) | todos |
| **IDM-01** | Idempotencia: la misma mutación no se aplica dos veces | todos |
| **LIN-01** | La operación no supera la línea disponible al armarla | ③a |
| **OTG-01** | Sólo aprueba quien tiene atribución en el área y nivel que la regla exige | ③b |
| **OTG-02** | Con excepciones sin resolver, la operación no pasa a Cesión | ⑦ |
| **VER-01** | Todas las facturas con su verificación completa antes de cursar | ③c / ⑦ |
| **GIR-01** | No gira sin pasar por Cesión | ⑦ |
| **GIR-02** | El paquete girado es el que se autorizó: **huella contra huella** | ⑦ |
| **ATR-01** | El descuento no excede la atribución del rol sin autorización de la jefatura | ④ |
| **CRY-01** | El código de un solo uso se guarda como hash con sal por emisión; se valida server-side | ⑥ |
| **PRI-01** | Marcar prioridad de curse es instrucción de jefatura, no del dueño del negocio | transversal |

> **Esto NO es un control de seguridad, y decirlo importa.** El atacante **es** el cliente: toda la
> regla de negocio de esta app vive en el bundle, y con la consola abierta se edita el catálogo de
> reglas, se cambia el nivel que exige una regla o se invoca cualquier mutación. Lo que hay en el
> navegador **anticipa** el rechazo para que la UI no invente mensajes; no lo impone. Y un evaluador
> que revienta **nunca bloquea** la operación: fallar del lado de dejar pasar es correcto cuando lo que
> se está ejecutando es una predicción, no un control.

**Qué tiene que recalcular el resolver aunque el cliente ya lo haya hecho:** el tenant (del token), la
atribución (del rol del token, no del payload), la transición de etapa (contra la máquina de estados),
el conteo de verificaciones en estado final, la **huella** (desde la operación persistida), la banda de
tasa y la atribución de precio, y la validación del código de un solo uso.

**Lo que ninguna cantidad de trabajo en el navegador puede resolver es la concurrencia.** El punto de
contención real es la **línea global del deudor**, que es compartida entre carteras: dos ejecutivos
cursando con un segundo de diferencia pasan los dos el chequeo y juntos exceden el cupo. Eso exige un
`SELECT ... FOR UPDATE` sobre la línea más el recálculo del uso **en la misma transacción**.

**Un detalle del contrato que no es cosmético:** el nivel del **tramo** y el nivel **exigido** viajan
los dos. Sin eso nadie puede explicar por qué esta excepción llegó a este apoderado y una igual del mes
pasado no. Y una **lista de aprobadores vacía es un resultado con su causa**, no un error.

**Inyección en planillas.** Los exportes llevan razones sociales de fuera, y Excel, LibreOffice y
Sheets **ejecutan** una celda que empieza con `=`, `+`, `-`, `@`, tabulador o retorno. Se antepone
apóstrofo. No es una vulnerabilidad de la app: es inyección en la herramienta del destinatario, y la
app es el vector.

### 21. Dónde corre cada motor

**Hoy los siete corren en el navegador.** En producción, los cuatro que deciden plata o permisos
—líneas, otorgamiento, verificación y **pricing**— tienen que correr **en el servidor**.

Cuatro reglas de aislamiento que valen para todos:

1. **BATCH y MEMO no son deuda: son un SELECT.** Las tablas precalculadas que arrastra el motor de
   líneas son, en producción, filas del batch diario que el resolver trae en la misma query. Tratarlas
   como deuda mezcla «hay que inyectarlo» con «hay que consultarlo», que son dos trabajos distintos.
2. **COMMIT y TENANT entran por parámetro.** El visado, las versiones, el veto y las llamadas
   registradas son evidencia con actor y hora: son del servidor. El padrón —áreas, usuarios, cargos—
   es del tenant, no del modelo de riesgo.
3. **Un analizador estático NO distingue «lee el global» de «cae al global sólo si no le pasan el
   estado».** Eso se prueba **ejecutando**, con un estado que **contradiga** al del navegador. Es la
   única evidencia que vale.
4. **Con estado inyectado hay que saltarse el cache.** La clave del cache está indexada por la
   operación, no por el estado: cachear una evaluación hecha con otro visado devuelve la respuesta
   equivocada **sin ningún error**.

**Y el cache que depende de una perilla del tenant se valida por FIRMA del umbral**, no por un
invalidador que haya que acordarse de llamar desde el mantenedor. Si no, la perilla se mueve, la
pantalla no, y nadie sabe si el motor la aplicó.

**Un umbral de política se lee del catálogo y no se incrusta en ninguna parte.** Mientras el umbral
viva duplicado —una copia editable en Configuración y una copia literal dentro de la regla— editar la
primera no cambia nada, y quien usa el mantenedor una vez y no ve efecto deja de creerle al resto de la
pantalla.

### 22. Vocabulario

Cuatro términos que la cadena usa con más de un sentido y conviene fijar:

- **Disponible.** Tiene dos sentidos que conviven en la misma fila. En «Documentos disponibles» es
  **documento incorporable**; en la línea es **cupo** (`aprobada − utilizada − reservada`). Son dos
  preguntas que el ejecutivo tiene que poder distinguir de un vistazo: *cuántos documentos puedo
  agregar* y *cuánto cupo me queda*.
- **Cliente.** En NEX el **cliente** es el **cedente** —quien nos vende su factura—. El **deudor** es
  quien la va a pagar. El ejecutivo se asigna por cliente, nunca por deudor.
- **«Con línea».** En la partición de pestañas significa **le cabe al menos una factura hoy**, no
  «tiene línea aprobada»: un deudor sin línea propia puede caber por el comodín del cliente. Son dos
  preguntas distintas porque deciden cosas distintas — cursar hoy, contra qué se le pide al comité.
- **`M$` = millones**, en una sola escala, cualquiera sea la magnitud. Bajo el millón se muestra el
  peso entero. En los **layouts de los activos** el sufijo `_M` son **miles**: es una colisión de
  notación y por eso los comentarios que traducen la unidad lo dicen con palabras.

---

## Parte IV · Qué falta

Tres familias, y confundirlas es el error caro.

### 23. Lo declarado y no implementado

**(a) Lo que es del SERVIDOR y el prototipo no puede tener.** No hay una sola llamada de red en el
fuente: las cuatro APIs de líneas y las seis entregas diarias existen como swagger y como layout, no
como código. Con eso quedan fuera:

- **La consulta de líneas A23 no tiene consumidor.** El estado de líneas se **sintetiza** desde el
  maestro de cartera (A7/A8), que es por cliente, **sin nivel deudor y sin `reservado`**. Es el único
  incumplimiento medible del Levantamiento §5, y es también la costura por donde A23 tiene que entrar:
  el motor ya recibe el estado por parámetro.
- **La transacción de curse y el lock** sobre la línea del deudor (§20).
- **La idempotencia real**, que necesita una clave que el **cliente** genere una vez por intención.
  Hoy sólo se **cuentan** los duplicados; detectarlos no bloquea nada.
- **`requiere_resimulacion`**, el estado para el curse que reevalúa distinto. Sólo tiene sentido dentro
  de la transacción del servidor.
- **El upsert intradía**: mientras no exista, «el dato del día anterior» es lo único que hay.

**(b) Eslabones del proceso sin motor.**

- **La inscripción de la cesión electrónica (AEC).** Es el acto que **transfiere el crédito**: sin él
  no somos cesionarios y el giro paga una factura que sigue siendo del cliente. Hoy el registro de
  cesiones (A2) sólo se **lee**. Falta el eslabón completo entre la firma y la integración al core, con
  su propio modo de fallo: rechazo del SII, cesión ya inscrita por otro.
- **El contrato de entrega a Tesorería.** La cadena termina en «Pendiente de Giro»: no hay payload, ni
  endpoint, ni idempotencia de entrega, ni evento. Es el único eslabón que mueve dinero de verdad, y
  sin contrato de salida la regla de oro se comprueba dentro de la app y nadie la comprueba del otro
  lado.
- **La negociación de precio es una SEGUNDA escalera de aprobación**, disjunta de la del otorgamiento:
  clasifica un cambio de condiciones según en qué banda de tasa caiga y escala ejecutivo → jefatura →
  Gerente Comercial, con un bloqueo duro por tasa mínima absoluta. Está implementada pero no
  documentada como proceso, y se enchufa al otorgamiento por un solo hilo (una variable de regla). Es
  el paso entre «hay un precio sugerido» y «el cliente aceptó un precio», y le falta su spec.
- **El versionado del catálogo de reglas.** Un veredicto de otorgamiento es evidencia regulatoria y
  tiene que poder reproducirse con el catálogo **vigente al decidir**. Hoy la versión congela las
  variables y la disposición de cada regla, pero no **qué regla era**: si mañana cambia un tramo, la
  versión de ayer se reinterpreta con el catálogo de hoy.

**(c) Desfases medidos entre lo que el sistema declara y lo que hace** (17-09-2026). Se listan porque
quien implemente contra este documento necesita saber cuáles párrafos describen intención y cuáles
describen conducta:

| Desfase | Medido |
|---|---|
| El **plazo del documento** no llega al prorrateo: se usa un plazo por **deudor** en vez del vencimiento del documento | 29.554 de 30.000 facturas tienen un plazo real distinto del que entra al cálculo; desvío medio 21,9 días. 691 de 697 deudores tienen más de un plazo en el archivo, así que un parámetro por deudor no puede representar al documento ni en principio |
| **Tres entradas del pricing** (mora, otros descuentos, cuentas por cobrar) se generan por hash y entran al Subtotal | contradice «el pipeline no genera datos»; el prorrateo las reparte documento a documento |
| El **«Monto a Girar» del catálogo del tenant no sale de la pantalla del detalle**: lo que viaja al resto del sistema es la simulación gruesa del tubo | la operación se cursa por una cifra distinta de la que el ejecutivo aprobó en pantalla |
| El camino vivo de «Otorgamiento» a giro **salta a Girada** sin pasar por Pendiente Integración, sin VER-01 y sin la aprobación de Operaciones N3 | es el atajo que §7 describe como cerrado, vivo por otra ruta |
| **`simularOferta` no emite versión**, contra lo que declara el modelo de versionado: en la oferta la emite sólo «Re-evaluar» (después de aceptada la emite además el recorte por verificación, §14) | una operación simulada y no re-evaluada no tiene versión de la cual leer |
| El **inbound no excluye las facturas ya cedidas** a otro factor | entran al monto con que se dimensiona la oportunidad, así que el tubo ofrece una oportunidad más grande de la que existe |
| El **histórico de factoring del par** —lo que separa CAT1 de CAT4 en el inbound— no lo entrega ningún activo: se genera determinista por par | la clasificación que decide si una factura abre oportunidad se apoya en un dato que no viene de ninguna entrega |
| El **piso de riesgo del deudor** del pricing es una constante del fuente por razón social, y ningún layout lo declara | 675 de 697 deudores del archivo reciben el default; el activo que debería traerlo es el del modelo de riesgo |
| La **re-evaluación repara los protestos**, que son un dato de bureau | el criterio de protestos se apaga con la firma del contrato, contra la regla que dice que una firma no borra un dato de bureau |
| La **rama de fallo** de la contactabilidad está cableada: el productor devuelve siempre «contactable» | el «no entregado» no ocurre nunca, así que la regla de reintentos no se puede ejercitar y los consumidores del estado de error quedan inalcanzables |

### 24. Las decisiones que no se cierran programando

- **La tercera forma de giro.** El enunciado menciona **tres formas combinables** y define dos. El
  catálogo está preparado —es una fila más— y falta su criterio.
- **La disyunción de GN.** Implementada por necesidad aritmética; falta que el negocio la confirme.
- **Nueve parámetros que la política v1.0 declara sin definir** y para los que el código eligió un
  valor para poder correr. El más consecuente tiene dos lecturas que dan resultados **opuestos** sobre
  la misma operación.
- **Cuál de las nociones de «cliente nuevo» quiere el negocio en cada punto.** El código tiene cuatro,
  miden sujetos distintos sobre activos distintos y ninguna se deriva de otra.
- **Qué pasa con la LF1 después de la primera operación.** Se documenta como «un solo uso, se consume
  completa» y el motor la trata como un pozo que sobrevive.
- **Qué debe pedirse al comité para un cliente en estado A**: N puntuales por deudor, o una asignación
  de líneas del cliente. Hoy la solicitud automática arma lo primero.
- **Si un deudor histórico debe seguir derivando a otorgamiento manual.** Hoy lo hace: el inbound abre
  la oportunidad sola y el gate la manda igual a revisión.

---

## Documentos relacionados

| Documento | Qué cubre |
|---|---|
| `Specs_Procesos/Evaluacion_Factura/spec-inbound-facturas.md` | ① — qué facturas entran y cuáles abren oportunidad |
| `Specs_Procesos/Lineas/spec-asignacion-lineas.md` | ③a — las cinco líneas, los tres niveles, la cascada |
| `Specs_Procesos/Otorgamiento/spec-otorgamiento.md` | ③b — el catálogo, la atribución y el motor como servicio |
| `Specs_Procesos/Verificacion/spec-verificacion-facturas.md` | ③c — los dos protocolos y los diez criterios |
| `Specs_Procesos/Evaluacion_Factura/spec-pricing-simulacion.md` | ④ y ⑤ — la tasa, el catálogo de conceptos y el prorrateo |
| `Specs_Procesos/Evaluacion_Factura/spec-modelo-giro.md` | ⑧ — los tipos de giro y la entrega a Tesorería |
| `Levantamiento_Activos_Informacion.md` | los activos A1–A25 y, en su §5, cuál es el maestro de cada campo |
| `Integraciones/Integraciones_APIs_y_S3.md` | los contratos de integración: swaggers, layouts y el transporte |
| `Regresiones/Inconsistencias_Motor_Otorgamiento.md` | la auditoría de la política contra el motor, con sus decisiones de negocio |

---

## Anexo · Control de versiones

**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.

| Versión | Fecha | Qué cambió |
|---|---|---|
| **1.1.1** | 21-09-2026 | Rutas de los documentos citados. |
| 1.1.0 | 18-09-2026 | La regla mal definida entra al camino general, y el desfase de unidades de V03/V04/V09 que este documento reportaba queda corregido. |
| 1.0.0 | 17-09-2026 | Primera versión: la costura de los siete motores, las diez variantes y los cortes transversales, verificada afirmación por afirmación contra el fuente. |
