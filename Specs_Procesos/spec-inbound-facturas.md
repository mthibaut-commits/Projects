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
el proveedor de DTE y acá son los 30.000 registros de `DTESYNC`. Por cada registro se leen:

| Campo del DTE | Para qué |
|---|---|
| `RUTEmisor` / `RznSoc` | el **cedente**: quién emite la factura y de quién será la oportunidad |
| `RUTRecep` / `RznSocRecep` | el **deudor**: quién debe pagarla — es a él a quien se clasifica |
| `Folio`, `TipoDTEDesc`, `MntTotal` | identidad y monto del documento |
| `FormaPago` | `2` = **crédito**. Es el primer filtro: al contado no hay nada que anticipar |
| `EstadoDTE.Reclamado` | el deudor la reclamó dentro del plazo legal |
| `EstadoDTE.NotaCredito` | fue anulada o rebajada por nota de crédito |

Cada DTE produce **un evento de inbound** con el documento ya normalizado (`facturasOp: [fac]`), su
clasificación de deudor y el contexto comercial del cedente: SOW (`SOW_POR_RUT`), estrategia de precio
(`PRECIO_POR_CLAVE`) y si ya es cliente.

---

## 3. Filtro de calidad: qué es una «buena factura»

Antes de cualquier regla comercial. **Tres condiciones, todas obligatorias:**

| Condición | Regla | Si falla |
|---|---|---|
| **A crédito** | `FormaPago === "2"` | se descarta del inbound |
| **Sin reclamo** | `EstadoDTE.Reclamado !== "1"` | se descarta |
| **Sin nota de crédito** | `EstadoDTE.NotaCredito !== "1"` | se descarta |

A eso el criterio «Buena factura» le suma la **cuarta** condición, que no es del documento sino del
deudor: que **abra oportunidad** (§4). Las cuatro juntas:

```
buena_factura = credito  y  no_reclamada  y  no_nota_credito  y  deudor_abre_oportunidad
```

> **Dos filtros que la política pide y el código NO aplica acá** (ver §11): que la factura **no esté ya
> cedida** a otro factor, y la marca **«solicitar XML»** cuando el XML no es recuperable. El estado
> `cedida` sí existe y sí bloquea la factura más adelante —`estadoCandidata` la marca «Cedida a
> terceros» y no se puede incorporar—, pero el inbound no la excluye al entrar: la cesión a la
> competencia se detecta **después**, como pérdida por AECSync. No es un olvido inocuo: una factura ya
> cedida puede llegar a formar parte del monto con que se dimensiona una oportunidad.

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
| `Buena factura` | las cuatro condiciones del §3 |
| `Deudor elegible` | sólo la cuarta: que el deudor abra oportunidad |
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

---

## 6. Corrida horaria: de facturas a oportunidades

Las facturas que califican se **acumulan**; no crean nada al instante. Cada «hora» corre el proceso
(`correrProceso`) y ahí sí:

1. **Agrupa por CEDENTE.** La unidad de la oportunidad es el cliente, nunca el deudor.
2. **¿Ya tiene una oportunidad abierta?** Si el cedente tiene una en *Prospección* u *Oferta*, las
   facturas nuevas **la absorben** (`warning`) en vez de crear otra. Si la que existe ya fue aceptada,
   cursada o perdida, **sí** se abre una nueva — así la prospección no se seca.
3. **Dimensiona el paquete** con el cupo del cliente (§6.1).
4. **Crea la oportunidad** con su ejecutivo, su CAT, su contactabilidad y su pool de facturas.

**Tope de 40 oportunidades nuevas por corrida.** Lo que excede se **re-encola** para la hora siguiente,
para que la prospección fluya hora a hora en vez de saturarse de una vez. El tope de documentos
procesados por corrida (`topeDocsCorrida`, 60) y el tamaño del lote son **configuración del tenant**, no
constantes del código.

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
- **La corrida horaria es un `useEffect` con `setTimeout`.** En producción es un job. Los parámetros ya
  están fuera del código (configuración del tenant), que es la mitad del camino.
- **El acumulador vive en `useState`.** Es una cola: si la pestaña se cierra entre la clasificación y la
  corrida, esas facturas se pierden. Tiene la misma forma que tenía la verificación telefónica antes de
  pasar a `repoVerifTel`.

---

## 11. Dónde el código se aparta del PDF de política

| PDF | Código | Lectura |
|---|---|---|
| Filtro de calidad: **«ya cedida (AECSync) → se excluye»** | el inbound **no** lo filtra; la cesión se detecta después como pérdida | **Desfase real.** Una factura ya cedida puede entrar al monto con que se dimensiona una oportunidad. El estado `cedida` sí bloquea la incorporación más adelante |
| Filtro de calidad: **«XML disponible → marca solicitar XML»** | no existe la marca | **No implementado** |
| «Las reglas consideran sólo Lista Blanca + Autorizados + históricos del último año» | además abre la **Nota > 4,2** | **El código va más allá a propósito**: son dos poblaciones. Conviene que el PDF lo recoja |
| Clasificación del deudor (§6), buckets CAT1/CAT4/OTRO | calza exacto | — |
| «Asignación por cedente» (invariante 2) | calza exacto | — |
| «Corrida horaria agrupada por cliente» (invariante 3) | calza, con tope de 40 nuevas por corrida que el PDF no menciona | el tope es operativo, no de política |
| «Una oportunidad abierta absorbe las nuevas sin duplicar» (invariante 4) | calza, con la precisión de que sólo absorbe en *Prospección* u *Oferta* | conviene precisarlo en el PDF |
| «Deudor Otro agregado manualmente ⇒ Otorgamiento» (invariante 6) | calza | — |

---

## 12. Lo que hay que decidir

1. **¿El inbound debe excluir las facturas ya cedidas?** Hoy no lo hace y el PDF dice que sí. Si la
   respuesta es sí, entra como cuarta condición del filtro de calidad y cambia el monto con que se
   dimensionan las oportunidades.
2. **¿La marca «solicitar XML» se implementa?** Hoy no existe.
3. **¿El orden de las siete reglas es el orden de prioridad del negocio?** Define qué regla captura y,
   con ella, el canal del primer contacto. Hoy Rule-01 (recuperar SOW) gana sobre todas.
4. **¿El tope de 4 facturas «Otro» por cedente y el de 40 oportunidades por corrida son parámetros del
   tenant?** Hoy están en el código; el resto de los parámetros operativos ya salieron a configuración.
5. **¿El cupo tentativo de los clientes sin línea (MM$300–1.300) es una banda del negocio?** Hoy es
   sintético y determinista por RUT.
