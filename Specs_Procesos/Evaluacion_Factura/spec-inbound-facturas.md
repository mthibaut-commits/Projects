# Spec — Inbound de facturas (selección y originación automática)

**Qué es.** El proceso que mira **todas** las facturas electrónicas que emiten los cedentes, decide cuáles
vale la pena financiar y con cuáles abre una oportunidad comercial. Es el único proceso del pipeline que
corre **sin que nadie lo pida**: llega un DTE y se decide solo.

**Por qué está escrito así.** Este documento existe para **aislarlo**. Es la tercera rutina del sistema
—junto con la verificación y la asignación de líneas— que en producción tiene que correr del lado del
servidor, y por el mismo motivo: el atacante es el cliente. Un inbound que decide en el navegador no
decide nada, porque `INBOUND_RULES` se edita desde la consola. Así que además de describir el proceso,
el §10 dice **exactamente** qué lee hoy cada función y qué falta para extraerla.

**Relación con el PDF.** `Spec_Proceso_Inbound_Facturas.pdf` es la política del negocio. Este archivo
describe **lo que el código ejecuta**, y en el §11 dice dónde se aparta y por qué.

---

## 1. El embudo, en una frase por etapa

```
DTE del cedente  →  filtro de calidad  →  clasificación del deudor  →  motor de reglas
                                                                            │
                        ┌───────────────────────────────────────────────────┴────────┐
                        │ califica alguna regla                     no califica      │
                        ▼                                                  ▼
                 acumulador de la corrida                      bandeja «sin clasificar»
                        │                                       (con su perfil y motivo)
                        ▼
              corrida horaria: agrupa por CEDENTE
                        │
          ┌─────────────┴──────────────┐
          │ el cedente ya tiene una    │ no tiene
          │ oportunidad abierta        ▼
          ▼                     nueva OPORTUNIDAD en Prospección
   absorbe las facturas         (ejecutivo, CAT, contactabilidad, pool de facturas)
   (warning, sin duplicar)
```

De 30.000 DTE inyectados, la parte que abre oportunidad es minoría: el filtro de calidad y la
clasificación del deudor descartan la mayor parte, y eso es el comportamiento correcto.

---

## 2. Entrada: qué trae un DTE

El inbound se alimenta del **stream de DTE** (`streamDesdeDTE`), que en producción es el feed del SII /
el proveedor de DTE y acá es el **log de notificaciones** de `DTESYNC`: **55.549 eventos sobre 30.000 documentos**
(ADR-0020, regla 70; 23-09-2026). Cada documento llega **varias veces**: primero su creación (`DTE_SINCRONIZADO`,
`Secuencia` 1, el documento entero y sin banderas) y después cada cambio de estado —el acuse, el reclamo, la nota de
crédito— como `DTE_ACTUALIZADO`, con la identidad y el `EstadoDTE` acumulado. De la creación se leen:

| Campo del DTE | Para qué |
|---|---|
| `RUTEmisor` / `RznSoc` | el **cedente**: quién emite la factura y de quién será la oportunidad |
| `RUTRecep` / `RznSocRecep` | el **deudor**: quién debe pagarla — es a él a quien se clasifica |
| `Folio`, `TipoDTEDesc`, `MntTotal` | identidad y monto del documento |
| `FormaPago` | `2` = **crédito**. Es el primer filtro: al contado no hay nada que anticipar |
| `EstadoDTE.Reclamado` (+ `FchReclamo`) | el deudor la reclamó dentro del plazo legal |
| `EstadoDTE.NotaCredito` | fue anulada o rebajada por nota de crédito |
| `EstadoDTE.Aceptado` (+ `FchAcuseRecibo`, `FchRecepcion`) | el **acuse de recibo** del receptor (regla 69, M-01; 23-09-2026): `aceptada` con su fecha, `reclamada` si hay reclamo, `sin_acuse` mientras el receptor no se pronuncia —lo normal en los primeros 8 días desde la emisión—. Se lee y se **muestra** en la fila del documento; **no filtra** (§3) |

Cada creación produce **un evento de inbound** con el documento ya normalizado (`facturasOp: [fac]`), su
clasificación de deudor y el contexto comercial del cedente: SOW (`SOW_POR_RUT`), estrategia de precio
(`PRECIO_POR_CLAVE`) y si ya es cliente. Cada **actualización** produce un evento `actualizacion`
(`eventoActualizacionDTE`: `docId`, `secuencia`, `estado`) que **no se clasifica**: el tick lo separa antes de las
reglas y lo aplica donde el documento vive —el acumulado, la Bandeja y las oportunidades (§6)—, sólo si es más
nuevo que lo que el documento ya sabe. Una factura puede así ser candidata al llegar y quedar bloqueada cuando
llega su NC, que es lo que pasa en el SII. Quien necesite **el documento** (el libro de ventas, los pares, el
corte) no lee el log: lee `documentosDTE()`, el pliegue.

---

## 3. Filtro de calidad: qué es una «buena factura»

Antes de cualquier regla comercial. **Cinco condiciones del documento, todas obligatorias:**

| Condición | Regla | Si falla |
|---|---|---|
| **A crédito** | `FormaPago === "2"` | se descarta del inbound |
| **Sin reclamo** | `EstadoDTE.Reclamado !== "1"` | se descarta |
| **Sin nota de crédito** | `EstadoDTE.NotaCredito !== "1"` | se descarta |
| **No cedida a un factoring ajeno** | el A2 no registra una cesión a un factoring distinto de Security (`cedidaAFactoringAjeno`; regla 60) | se descarta |
| **Emitida hace no más de N días** | `FchEmis` contra el corte del activo, con `N = antiguedadMaxDias` del tenant (20 por defecto; regla 61) | se descarta |

El **acuse del receptor no está en la lista** (regla 69, definición del negocio del 23-09-2026): una factura sin
acuse —sus primeros 8 días desde la emisión— es candidata igual que una con acuse; sólo el reclamo excluye. Se
muestra en la fila del documento y no decide.

A eso el criterio «Buena factura» le suma la condición que no es del documento sino del deudor: que
**abra oportunidad** (§4). Todas juntas:

```
buena_factura = credito  y  no_reclamada  y  no_nota_credito  y  no_cedida_a_factoring_ajeno
               y  emitida_hace_no_mas_de_N_dias  y  deudor_abre_oportunidad
```

> **Un filtro que la política pide y el código NO aplica acá** (ver §11): la marca **«solicitar XML»**
> cuando el XML no es recuperable. El otro que faltaba —que la factura **no esté ya cedida** a otro
> factor— se aplica desde el 23-09-2026 (ADR-0014, regla 60): «Buena factura» exige además que el A2
> no registre una cesión a un factoring **ajeno** a Security (`cedidaAFactoringAjeno`); la cedida a
> Security es candidata como cualquier otra, porque es cartera propia. Antes la cesión a la
> competencia se detectaba **después**, como pérdida por AECSync, y la factura ya cedida entraba al
> monto con que se dimensionaba la oportunidad.
>
> La **antigüedad** entró el mismo día (regla 61; M-10, G-31): `antiguedadMaxDias` es del tenant (20 días por
> defecto, Configuración › Operación), se cuenta contra el corte del activo (regla 13-ter) y «no más de N» incluye
> el día N; el perfil de la Bandeja nombra «Antigüedad > N días (excluida)». Medido sobre el A1: 25.485 de las
> 30.000 facturas tienen 20 días o menos, así que el filtro deja pasar la mayoría.

---

## 4. Clasificación del deudor: tres buckets

La decisión de fondo del inbound. Combina **las listas** con el **historial de factoring del último año
del par cedente-deudor** (`clasifInbound`):

```
tipo = tipoDeudor(rutRecep, razonSocial)          # Lista Blanca | Deudor Autorizado | Otro

si tipo ∈ {Lista Blanca, Deudor Autorizado}  →  bucket CAT1        (deudor propio/bueno)
si no:
    hist = histFactoringUltimoAnio(cedente, deudor)
    si hist = "bice"   →  bucket CAT1                              (ya lo factorizamos nosotros)
    si hist = "otro"   →  bucket CAT4                              (lo factorizó la competencia)
    si no              →  bucket OTRO                              (no abre oportunidad)
```

| Bucket | Quién es | Qué pasa con sus facturas |
|---|---|---|
| **CAT1** | Lista Blanca, Autorizado, o el cedente ya lo factorizó **con nosotros** este año | abre oportunidad |
| **CAT4** | el cedente lo factorizó con **otro** factor este año | abre oportunidad — es la de **recuperación de SOW** |
| **OTRO** | deudor fuera de listas y **sin historia reciente** | **nunca** abre oportunidad por sí solo |

**Un deudor fuera de listas con historia reciente no es «Otro».** Es la corrección conceptual que
sostiene el bucket CAT4: si el cedente ya le factorizó a ese deudor —con nosotros o con la
competencia—, el par está probado comercialmente y la oportunidad es legítima. Para mostrar se
distinguen como «Histórico BICE» y «Histórico» (`tipoDeudorDisp`), no como «Otro».

### 4.1 · Pero la lista no es el único camino: la Nota también abre

```
deudor_abre_oportunidad(f) = (bucket ≠ OTRO)  o  (nota_deudor(f) > 4,2)
```

**Son dos poblaciones y basta pertenecer a una.** Antes sólo contaba el bucket, y como el bucket excluye
por construcción a los no listados, la regla «Lista Deudores ND>4,2» **no podía capturar nada** aunque
el deudor tuviera nota 4,6. El corte es `NOTA_PRIORITARIA = 4,2`, el mismo que abre el protocolo
recortado de verificación.

### 4.2 · Las facturas de deudor «Otro» no se tiran: quedan disponibles

`OTRO_FOP_POR_CEDENTE` indexa, por cedente, sus facturas a crédito de deudores excluidos (hasta **4**
por cedente, para no inflar la oportunidad). No abren nada solas, pero entran al **pool disponible** de
la oportunidad para que el ejecutivo las agregue a mano. Al agregarlas, la operación **pasa por
Otorgamiento** — es la puerta con control, no una excepción silenciosa.

---

## 5. Motor de reglas de prospección

Una factura que pasó el filtro se ofrece a las reglas **en orden**; **la primera que califica la
captura** (`clasificarFactura`) y ninguna otra la vuelve a mirar. Cada regla es una **conjunción** de
criterios: `facturaCalifica` exige que se cumplan **todos** (`every`).

### 5.1 · Los criterios

| Criterio | Qué mide |
|---|---|
| `Buena factura` | las seis condiciones del §3 (cinco del documento y la del deudor) |
| `Deudor elegible` | sólo la del deudor: que abra oportunidad |
| `Crédito` | sólo que sea a crédito |
| `Lista Deudores Prime` | Lista Blanca **o** Autorizado |
| `Lista Deudores ND>4.2` | nota del deudor sobre el corte, esté o no en lista |
| `Deudores históricos Security sin Bloqueo` | ya factorizado con nosotros **y** sin bloqueo vigente |
| `Histórico otro factor` | factorizado con la competencia el último año |
| `Cliente` / `No Cliente` | si el cedente ya es cliente |
| `SOW a la baja` / `al alza` / `estable` | tendencia del share of wallet del cedente |
| `Supera target SOW` | el SOW actual alcanzó el objetivo |
| `Con descuento` | la estrategia de precio le da descuento promocional |

> **Un criterio desconocido NO descarta la factura: la deja pasar.** `facturaCalifica` ignora lo que no
> está en el catálogo. Suena laxo y es deliberado: las reglas se **persisten en `localStorage`**, y una
> regla guardada que apunte a un criterio que ya no existe calificaría **todo** si el default fuera
> «cumple». Por eso los criterios viejos se conservan como **alias** en vez de borrarse. Al mover un
> criterio hay que dejar su alias, o las reglas guardadas de los usuarios empiezan a capturar de más.

### 5.2 · Las siete reglas por defecto

| Regla | Qué busca | Criterios | Canal |
|---|---|---|---|
| **Rule-01** | recuperar SOW con promoción de tasa | Buena factura + SOW a la baja | Agente IA |
| **Rule-02** | deudores Prime de **clientes** | Buena factura + Prime + Cliente | Agente IA |
| **Rule-03** | deudores Prime de **prospectos** | Buena factura + Prime + No Cliente | Ejecutivo |
| **Rule-04** | deudores ND>4,2 de **clientes** | Buena factura + ND>4,2 + Cliente | Agente IA |
| **Rule-05** | deudores ND>4,2 de **prospectos** | Buena factura + ND>4,2 + No Cliente | Ejecutivo |
| **Rule-06** | históricos Security sin bloqueo — re-anticipar | Buena factura + históricos sin bloqueo | Agente IA |
| **Rule-07** | histórico otro factor — recuperar | Buena factura + Histórico otro factor | Ejecutivo |

El **orden importa**: un deudor Prime de un cliente con SOW a la baja lo captura Rule-01, no Rule-02.
La regla capturante queda en la factura (`reglaId`) y **define el canal del primer contacto**
(`canalDeRegla`), así que cambiar el orden cambia por dónde se contacta al cliente.

### 5.3 · Lo que no califica se explica, no se descarta en silencio

Toda factura que ninguna regla captura va a la bandeja **«sin clasificar»** con su **perfil**
(`criteriosDesdeFactura`): la lista de criterios que sí cumple, agrupada por perfil y por cedente, con
conteo y monto. El perfil nombra **el criterio más específico** —primero la pertenencia a listas, al
final la nota, que es la que recoge a los que no están en ninguna— y distingue dos cosas que no son lo
mismo:

- **«Otro deudor (excluido)»** — no tenemos regla para esto.
- **«Histórico Security con bloqueo (excluido)»** — Riesgo lo tiene bloqueado.

Sólo la segunda explica por qué una factura que *debería* capturarse no se capturó.

Desde el 23-09-2026 el perfil nombra dos exclusiones más, las dos del **documento**: **«Cedida a otro factoring
(excluida)»** (regla 60) y **«Antigüedad > N días (excluida)»** (regla 61, con el tope vigente del tenant).

---

## 6. Corrida horaria: de facturas a oportunidades

Las facturas que califican se **acumulan**; no crean nada al instante. Cada «hora» corre el proceso
(`correrProceso`) y ahí sí:

1. **Agrupa por CEDENTE.** La unidad de la oportunidad es el cliente, nunca el deudor.
2. **¿Ya tiene una oportunidad abierta?** Si el cedente tiene una en *Prospección* u *Oferta*, las
   facturas nuevas **la absorben** (`warning`) en vez de crear otra. Si la que existe ya fue aceptada,
   cursada o perdida, **sí** se abre una nueva — así la prospección no se seca.
   Las **actualizaciones del A1** (regla 70) no esperan a la corrida: en cada lote del stream parchan el documento
   donde viva (`aplicarActualizacionDTE`) —en los disponibles siempre; en la oferta mientras el paquete sea del
   ejecutivo— y la NC o el reclamo dejan traza («El SII notificó una nota de crédito sobre el documento #N: queda
   bloqueado en…»). Sobre una oferta **cerrada o publicada**, o después de la firma, la NC o el reclamo **no tocan el
   documento**: la bitácora avisa y la corrida cuenta el aviso (decisión #7 de §12). La corrida reporta en su línea
   de bitácora del sistema cuántas actualizaciones aplicó.
3. **Dimensiona el paquete** con el cupo del cliente (§6.1).
4. **Crea la oportunidad** con su ejecutivo, su CAT, su contactabilidad y su pool de facturas.

**Tope de 40 oportunidades nuevas por corrida.** Lo que excede se **re-encola** para la hora siguiente,
para que la prospección fluya hora a hora en vez de saturarse de una vez. El tamaño de la Bandeja
(`topeBandeja`, regla 40) y el del lote son **configuración del tenant**, no constantes del código.

**El día lo gobierna el reloj del tenant (ADR-0019, regla 64).** A la hora de reinicio (`horaInicio`, 06:00 por
defecto) el job arranca las corridas y vuelve a abrir, como oportunidades **nuevas** con id propio (`-R<n>`) y
`referencia`, las que el corte eliminó; a la hora de corte (`horaFin`, 23:00) la oportunidad **sin oferta** se elimina
—queda en la bitácora del sistema con su id, su cedente y su paquete— y la que **tiene oferta** no se toca, cualquiera
sea su etapa. Entre las dos corre la corrida; fuera, no se abre nada («fuera de ventana»). El conteo de corridas no
decide: en producción el inbound es continuo (`jobDelReloj`, `intervaloJobMs` sobre `frecuenciaMin`) y en la demo
cada corrida es una hora simulada del reinicio al corte (`relojSimulado`).

### 6.1 · Cómo se dimensiona el paquete, y por qué no se recorta igual para todos

El sistema **nunca propone una oferta que no se pueda cursar**, pero tampoco le impide al ejecutivo
armar una más grande y pedirla al comité. El recorte usa **el mismo motor de asignación** que evalúa la
pantalla (`cortarConMotorLinea`): si se recortara con otra noción de cupo, los dos cálculos
divergirían y la oferta propuesta aparecería con facturas en «Requiere comité» apenas se abre, sin que
nadie las hubiera agregado.

Hay **dos casos y no son el mismo**:

- **Cliente CON línea y cupo agotado** → el recorte es legítimo, y es justo lo que alimenta «Líneas por
  gestionar».
- **Cliente SIN línea aprobada** (prospecto) → su `disponible` vale 0. Recortar a una factura
  **escondería la demanda real** justo en el caso que debe disparar la solicitud de línea. Con los datos
  inyectados eso es el **53% de los cedentes**, y dejaba el **81% del tubo** en un solo documento. Para
  ellos se dimensiona con un **cupo tentativo** (MM$300–1.300). No afirma que exista línea: la
  `aprobada` sigue en 0, la oportunidad sigue quedando fuera de línea y las pantallas siguen diciendo
  «Sin línea».

### 6.2 · La oferta nace VACÍA

El paquete que el motor dimensiona **no se convierte en oferta**. Entra al **pool disponible** junto con
lo que no cupo y los deudores «Otro»; la oferta la arma el ejecutivo en el detalle. El corte se conserva
porque sigue dimensionando la oportunidad —monto, deudores, CAT— y es lo que alimenta «Líneas por
gestionar».

### 6.3 · CAT de la oportunidad: dos catalogaciones que NO son la misma

| | Qué mide | Dónde |
|---|---|---|
| **CAT por mix de buckets** (`catDeMix`) | qué parte de las facturas elegibles son CAT1 vs CAT4 | la catalogación de **origen** del inbound |
| **CAT por Nota ponderada por monto** (`catShares`) | qué parte del **monto** está en cada tramo de nota | la CAT **de riesgo** de la operación (invariante 3) |

`catDeMix`: 100% CAT1 → CAT-1 · ≥70% → CAT-2 · 1–69% → CAT-3 · 0% (sólo CAT4) → CAT-4. Las facturas de
deudor «Otro» **no entran al mix**. Confundir las dos catalogaciones lleva a leer «CAT-4» como «deudores
en el límite de compra» cuando en el inbound significa «todo viene de la competencia».

---

## 7. Asignación de ejecutivo: siempre por cedente

`asignarEjecutivo`, en tres pasos, y **el deudor no influye en ninguno**:

1. **Maestro de cartera** (`ejecutivoDeCartera` sobre el SOW inyectado): si la empresa es cliente, va
   **siempre** a su ejecutivo dueño. Así el ejecutivo de la oportunidad coincide con el de la cartera —
   una sola fuente de verdad.
2. **Mapa explícito** (`EMPRESA_EJECUTIVO`) para las empresas de la semilla curada.
3. **Reparto estable** por hash del cedente: mismo cliente → mismo ejecutivo, siempre.

---

## 8. El cron no se apaga cuando el stream se seca

El motor de fondo sigue corriendo después de que el stream se drena (gate `iniciadoRef`). No es un
detalle de implementación: lo que corre en cada tick además de la corrida son las **evaluaciones de
pérdida** —cesión a otro factor detectada por AECSync, oferta no aceptada—, y si el cron se apagara con
el stream esas pérdidas no se evaluarían nunca.

---

## 9. Métricas del motor

Todo lo que el inbound decide queda contado, porque es lo que permite auditar si las reglas están bien
puestas: recibidas · califican · sin clasificar · originadas, más el detalle **por regla** (conteo,
monto, empresas) y **por perfil** de lo no clasificado. El panel Sankey recorre Origen → CAT → Etapa →
Desenlace → Causa.

---

## 10. Aislamiento: qué falta para llevarlo al backend

Medido transitivamente —siguiendo la cadena de llamadas, no sólo el cuerpo de cada función— con
`node auditar_aislamiento.mjs`. **14 de 17 funciones del inbound no leen estado mutable.**

### 10.1 · Puras de verdad, cuerpo y cadena

`histFactoringUltimoAnio` · `deudorAbreOportunidad` · `notaDeudorEvento` · `bloqueoDeudor` ·
`facturaCalifica` · `clasificarFactura` · `catDeMix` · `canalDeRegla`

**El corazón del inbound ya es extraíble.** La decisión de qué factura califica y qué regla la captura
no lee nada del navegador.

### 10.2 · Sólo leen DATOS — en producción, un SELECT

| Función | Qué lee |
|---|---|
| `tipoDeudor`, `clasifInbound`, `ajustarACupo` | las listas (`LISTA_BLANCA`, `LB_RUT`, `DA_RUT`, …) |
| `criteriosDesdeFactura` | el parámetro `NOTA_PRIORITARIA` |
| `streamDesdeDTE` | SOW y estrategia de precio por RUT, más las listas |
| `ejecutivoDeCartera` | el maestro de cartera (SOW) |

No es estado mutable: son tablas. Para el servicio se resuelven con una consulta, igual que `_VERIF_PAR`
en la verificación.

### 10.3 · Lo que sí hay que inyectar

| Función | Qué arrastra | Por dónde |
|---|---|---|
| **`asignarEjecutivo`** | `EXECS`, `EMPRESA_EJECUTIVO` (**TENANT**) | su propio cuerpo |
| `cortarConMotorLinea` | las tablas de líneas y `window` | `paresPorEmisor`, `lf4MetaPorCliente`, `lineasDeCliente` |
| `lineaCreditoDe` | las tablas de líneas y **`Date`** | `lineaIdxPorRut`, `sowDeDeal` |

Tres observaciones, en orden de importancia:

1. **`asignarEjecutivo` lee el padrón de ejecutivos directo.** Es exactamente la misma forma que tenía
   el motor de otorgamiento antes de recibir `padronAprobadores()`: datos del **tenant** dentro de una
   función que decide. La corrección es del mismo tamaño — un **padrón de cartera** inyectado
   `{ejecutivos, dueños}` — y tiene el mismo motivo: qué ejecutivo existe y de quién es cada cliente es
   configuración del factoring, no del modelo de inbound.
2. **El inbound depende del motor de líneas para dimensionar.** Eso está bien —es deliberado, para que
   los dos cálculos no divergan— pero significa que extraer el inbound **arrastra** la dependencia de
   A23. En el servicio, el inbound tendría que recibir el disponible ya consultado, no consultarlo.
3. **`lineaCreditoDe` arrastra `Date` por `sowDeDeal`.** Una decisión que depende del reloj del cliente
   no es reproducible: dos corridas del mismo DTE pueden dimensionar distinto. La hora la pone el
   servidor.

### 10.4 · Lo que además hay que mover de lugar

- **Las reglas viven en `localStorage`** (`nex_inbound_rules_v4`). En el navegador eso es conveniencia;
  en producción las reglas de prospección son **configuración del tenant** y su edición es un evento
  auditable con actor y hora. Un motor que lee sus propias reglas del cliente no decide nada: es el
  mismo argumento de `REGLAS_CLIENTE` en el otorgamiento.
- **La corrida horaria es un `setInterval` del navegador.** En producción es un job que consume `intervaloJobMs`
  (`frecuenciaMin`) y las horas de reinicio y corte del tenant (`jobDelReloj`): las tres son puras y reciben la
  configuración y la hora, así que el job las llama tal cual (regla 64). El reloj simulado (`relojSimulado`) es lo
  único que queda de la demo.
- **El acumulador vive en `useState`.** Es una cola: si la pestaña se cierra entre la clasificación y la
  corrida, esas facturas se pierden. Tiene la misma forma que tenía la verificación telefónica antes de
  pasar a `repoVerifTel`.

---

## 11. Dónde el código se aparta del PDF de política

| PDF | Código | Lectura |
|---|---|---|
| Filtro de calidad: **«ya cedida (AECSync) → se excluye»** | el inbound excluye la cedida a un factoring **ajeno** (`cedidaAFactoringAjeno`, cuarta condición de «Buena factura»); la cedida a Security es candidata | **Cerrado el 23-09-2026** (ADR-0014, regla 60, caso 159): la cesión ajena ya no entra al monto con que se dimensiona la oportunidad, y al incorporar sigue bloqueada con el nombre del factoring |
| Filtro de calidad: **«XML disponible → marca solicitar XML»** | no existe la marca | **No implementado** |
| «Las reglas consideran sólo Lista Blanca + Autorizados + históricos del último año» | además abre la **Nota > 4,2** | **El código va más allá a propósito**: son dos poblaciones. Conviene que el PDF lo recoja |
| Clasificación del deudor (§6), buckets CAT1/CAT4/OTRO | calza exacto | — |
| «Asignación por cedente» (invariante 2) | calza exacto | — |
| «Corrida horaria agrupada por cliente» (invariante 3) | calza, con tope de 40 nuevas por corrida que el PDF no menciona | el tope es operativo, no de política |
| «Una oportunidad abierta absorbe las nuevas sin duplicar» (invariante 4) | calza, con la precisión de que sólo absorbe en *Prospección* u *Oferta* | conviene precisarlo en el PDF |
| «Deudor Otro agregado manualmente ⇒ Otorgamiento» (invariante 6) | calza | — |

---

## 12. Lo que hay que decidir

1. **¿El inbound debe excluir las facturas ya cedidas?** Decidido el 22-09-2026 e implementado el
   23-09-2026 (ADR-0014, regla 60): sí, las cedidas a un factoring **ajeno**, como cuarta condición del
   filtro de calidad; la cedida a Security no se excluye.
2. **¿La marca «solicitar XML» se implementa?** Hoy no existe.
3. **¿El orden de las siete reglas es el orden de prioridad del negocio?** Define qué regla captura y,
   con ella, el canal del primer contacto. Hoy Rule-01 (recuperar SOW) gana sobre todas.
4. **¿El tope de 4 facturas «Otro» por cedente y el de 40 oportunidades por corrida son parámetros del
   tenant?** Hoy están en el código; el resto de los parámetros operativos ya salieron a configuración.
5. **¿El cupo tentativo de los clientes sin línea (MM$300–1.300) es una banda del negocio?** Hoy es
   sintético y determinista por RUT.
6. **¿La antigüedad máxima desde la emisión es criterio del inbound?** Decidido el 22-09-2026 e implementado el
   23-09-2026 (regla 61): sí, como condición del filtro de calidad, con el tope como parámetro del tenant
   (`antiguedadMaxDias`, 20 días por defecto).
7. **¿Qué hace el sistema cuando llega una nota de crédito o un reclamo sobre un documento de una oferta ya
   publicada o firmada?** (ADR-0020, regla 70; 23-09-2026). Hoy el documento **no se toca**, la bitácora de la
   operación avisa (`exito: false`) y la corrida cuenta el aviso: la decisión es del ejecutivo. La regla candidata
   es la de ADR-0018 —marcar la operación con un issue, avisar por el centro de notificaciones, y que el ejecutivo
   retire el documento, re-simule y vuelva a publicar para una nueva firma—. No está decidido.
