# Especificación · Asignación de líneas de crédito en el armado de ofertas de factoring

**Producto:** Factoring Security · módulo de originación
**Alcance:** motor de asignación de línea y pantalla de armado de oferta (etapa Oferta y Negociación)
**Estado:** especificación para implementación. El prototipo funcional adjunto (`asignacion-linea.html`) es la referencia de comportamiento.

---

## 1. Problema

Un ejecutivo arma una propuesta comercial seleccionando facturas emitidas por un cliente (cedente) contra distintos deudores. Antes de poder cursar la operación, el sistema debe responder dos preguntas:

1. ¿Qué parte de esta oferta se puede cursar hoy con la línea de crédito ya aprobada?
2. ¿Qué parte requiere pasar por el comité de riesgo, y qué habría que pedirle exactamente?

Todo lo demás en esta pantalla es secundario. El vocabulario interno de líneas es información de apoyo, no el objeto de la pantalla.

---

## 2. Modelo de dominio

### 2.1 Línea de crédito

Todas las líneas de factoring son objetos del **par cliente-deudor**, identificados por RUT.

```json
{
  "id": "LF2-0002",
  "producto": "factoring",
  "tipo": "LF1 | LF2 | LF3 | LF4",
  "granularidad": "par | comodin",
  "rut_cliente": "76.129.440-2",
  "rut_deudor": "64.492.386-2",
  "monto_aprobado": 360000000,
  "moneda": "CLP",
  "vigente_no_pagado": 200000000,
  "monto_reservado": 0,
  "monto_disponible": 160000000,
  "vigencia_desde": "2026-03-01",
  "vigencia_hasta": "2027-03-01",
  "estado": "vigente | suspendida | caducada | anulada",
  "solicitud_id": "SOL-00412",
  "version": 17
}
```

| Tipo | Nombre | Granularidad | Comportamiento |
|---|---|---|---|
| **LF1** | Inicial | comodín (`rut_deudor: null`) | $30.000.000 creada automáticamente al enrolar un cliente. Un solo uso. Solo admite deudores prime. Se consume completa. |
| **LF2** | Normal | par | Revolvente. Libera cupo únicamente cuando el deudor paga la factura. |
| **LF3** | Puntual | par | Un solo uso. **Se consume completa aunque se ocupe parcialmente**; el saldo caduca. |
| **LF4** | Otros deudores | comodín (`rut_deudor: null`) | Pozo genérico del cliente, dimensionado como el 10% de la suma de cupos. **Se evalúa solo para RUT deudores que no tienen LF2 ni LF3 propia.** Financia montos pequeños. |

LF1 y LF4 no pueden llevar un `rut_deudor` concreto porque por definición aplican a cualquier deudor. La llave del par se completa en la **asignación**, que sí registra el RUT deudor efectivo. Sin ese registro no se puede descontar del paraguas ni reportar exposición.

### 2.2 Paraguas del deudor

Línea propia del RUT deudor que limita la exposición total del factoring a ese deudor, **compartida por todos los clientes** que ceden facturas suyas. Es el control que impide que diez clientes cediendo el mismo deudor multipliquen la exposición.

```json
{
  "rut_deudor": "64.492.386-2",
  "monto_aprobado": 6000000000,
  "vigente_no_pagado": 5700000000,
  "version": 42
}
```

### 2.3 Línea del cliente

**Es el consolidado de las líneas cliente-deudor de ese cliente**, no un objeto independiente:

```
aprobado_cliente = Σ monto_aprobado de sus líneas
consumido_cliente = Σ vigente_no_pagado de sus líneas
```

> **Consecuencia de diseño:** como cifra derivada, este nivel **no puede bloquear por sí solo**. Si cada par está dentro de su línea, la suma también lo está. Solo se vuelve un control real si el comité aprueba para el cliente un tope propio inferior a la suma de sus cupos. Mientras no exista esa figura, el nivel 1 es un consolidado de reporte y "aumentar la línea del cliente" no es una operación: siempre se aumenta una línea cliente-deudor concreta.

### 2.4 Asignación

```json
{
  "id": "ASG-00981",
  "operacion_id": "OP-D922",
  "factura_id": "F-107032",
  "linea_id": "LF3-0003",
  "rut_cliente": "76.129.440-2",
  "rut_deudor": "64.492.386-2",
  "monto": 52300000,
  "estado": "reservada | aprobada | girada | liberada | anulada",
  "monto_caducado": 35900000,
  "fecha_vigencia": "2026-09-03",
  "nota_deudor_usada": 4.4,
  "periodo_nota": "2026-08",
  "creada_por": "crivas",
  "creada_en": "2026-09-03T14:22:10-03:00"
}
```

Una factura puede tener **más de una asignación** cuando su monto se reparte entre dos líneas de la cascada.

`nota_deudor_usada` y `periodo_nota` se guardan como snapshot. Si se lee la nota viva, una asignación del mes pasado deja de ser reproducible y la traza pierde valor como evidencia.

**Esta entidad se modela acá, pero este módulo no la persiste.** El motor es consulta pura (§5.2) y el cupo lo administra el sistema de gestión de líneas (§3.7). Lo que sí queda registrado es la **versión de la simulación**, que congela por cada factura con qué línea y con qué monto se la financió. Es **evidencia**: sirve para reconstruir la decisión y para explicar qué se movió respecto de la evaluación anterior, nunca como entrada del cálculo siguiente. Ver §4.3.

---

## 3. Reglas de negocio

### 3.1 Regla de validación

Para cada factura:

```
monto_factura ≤ min( disponible_cliente , disponible_cliente_deudor , disponible_deudor_global )
```

Los tres niveles se descuentan simultáneamente cuando la factura se asigna.

### 3.2 Cálculo de disponible

> **Nota de implementación:** el prototipo no consume A23, así que su `disponible` es `aprobado − vigente_no_pagado − consumido_en_esta_corrida`: **no hay término `reservado`**. Es correcto para una demo —no hay un sistema de gestión de líneas al otro lado— pero al implementar contra A23 el `reservado` es un tercer término que se **lee**, y sin él una operación ya aceptada aparecería con cupo que en realidad está comprometido.

```
disponible = monto_aprobado − vigente_no_pagado − reservado
```

- El cupo se libera **solo cuando el deudor paga la factura al vencimiento**.
- Una factura vencida e impaga **sigue consumiendo cupo**. No hay liberación por mora.
- El término `reservado` **se lee** del sistema de gestión de líneas (§5.1); este módulo no lo lleva ni lo escribe. Ver §3.7.
- Una línea **suspendida** conserva su `vigente_no_pagado` —la suspensión no libera lo ya cedido— pero no admite operaciones nuevas: su disponible es 0.

### 3.3 Asignación por factura completa

No se puede ceder media factura. Cuando el cupo no alcanza, quedan **facturas enteras** fuera de la asignación. Razonar en montos agregados por deudor produce resultados que no son ejecutables.

### 3.4 Orden de asignación

Los deudores de la operación se procesan **de mayor a menor nota deudor**. El orden importa porque hay recursos compartidos: el pozo LF4 y (cuando exista un tope propio) la línea del cliente.

Empate de nota: desempata el monto seleccionado, de mayor a menor.

### 3.5 Cascada de líneas por deudor

La cascada depende del **estado del cliente**, que son dos y son mutuamente excluyentes:

| Estado | Qué líneas tiene | Cascada |
|---|---|---|
| **A** — recién enrolado | Sólo la **LF1** (Línea Inicial Cliente, MM$30). Sin LF2, LF3 ni LF4 | `[LF1]`, y **sólo para deudores prime** |
| **B** — con líneas asignadas | LF2 / LF3 por par y el comodín LF4. **Sin LF1** | la de abajo |

En estado **A** la LF1 es el único camino, y cubre únicamente a los deudores prime: si el deudor no lo es, el motivo del rechazo es `lf1` y lo que se le pide al comité no es una línea más sino que **asigne líneas** al cliente (§4.1). El estado A termina cuando eso ocurre, y entonces la LF1 desaparece: no coexiste con las demás.

En estado **B**:

```
si existe LF2 o LF3 para el par:
    cascada = [LF3, LF2]        ← la puntual primero
si no:
    cascada = [LF4]             ← pozo comodín, único camino
```

- **La LF3 se consume primero** porque se aprobó para ese negocio y es de un solo uso. La LF2 complementa el saldo.
- La LF3 **no se amarra a una operación** en la aprobación. La asignación se resuelve en este proceso.
- La **LF4 nunca actúa como colchón** para deudores que ya tienen línea propia. Es exclusivamente el camino de los RUT sin LF2 ni LF3.

**Riesgo conocido:** como la LF3 no está atada a una operación, la consume la primera operación que toque ese deudor, del tamaño que sea. Una puntual de $120M aprobada para un negocio grande puede quemarse con una factura de $12M. Mitigación en §7.

### 3.6 Consumo de líneas de un solo uso

Al cerrar la asignación, toda línea LF1 o LF3 con `usado > 0` se marca consumida en su totalidad. El saldo va a `monto_caducado` y no se puede reutilizar. Ese campo alimenta el reporte que le dice al comité si las puntuales se están dimensionando bien.

### 3.7 Vigencia de la asignación

**La reserva no la administra este módulo.** El ciclo de vida del cupo es del sistema de gestión de líneas, y lo cierra el core:

1. Mientras el cliente no acepta, lo que existe es una **evaluación**, no una reserva. Este motor es consulta pura (§5.2) y no persiste nada.
2. **El cliente acepta** → el sistema de gestión de líneas **crea la reserva**.
3. **Operaciones aprueba en el core** → el core **commitea la reserva**: la elimina y la convierte en línea utilizada, que pasa a engrosar `vigente_no_pagado`.

Consecuencias:

- La reasignación diaria desde cero aplica **solo a las operaciones que el cliente todavía no acepta**. Una operación aceptada no pierde cupo: su reserva ya vive en el sistema de líneas y no depende de que este motor vuelva a calcularla.
- El término `reservado` de §3.2 se **lee** del sistema de líneas (§5.1). Este módulo no lo lleva ni lo escribe.

Esto cierra la excepción que esta sección dejaba abierta: no hay que proteger la reserva de las operaciones en curse, porque nunca estuvo en manos de este motor.

### 3.8 Moneda

Todas las líneas son en **pesos chilenos**. No hay indexación. Consecuencia: una línea aprobada hace más de un año financia menos volumen real del que el comité aprobó, lo que refuerza la necesidad de revisión periódica con `vigencia_hasta`.

### 3.9 Dimensionamiento del cupo (contexto — implementado sólo en parte)

```
cupo_deudor = venta_mensual × (plazo_pago / 30) × SoW_objetivo
```

Ejemplo: $100M mensuales a 45 días con SoW objetivo de 70% → $105M.

- La línea mide **saldo vigente cedido** (exposición viva), no monto cursado mensual. Por eso corresponde el factor `plazo/30`.
- El SoW de esta fórmula es sobre **stock**, no sobre flujo. Si el tablero comercial mide participación sobre el flujo mensual cedido, los dos números no van a cuadrar.
- El plazo debe ser el **DSO real observado**, no el declarado por el ejecutivo o el cliente.
- El consumo se registra en **monto nominal cedido**, no en monto girado. El derecho de cobro sobre el deudor es el valor completo de la factura.
- El flujo mensual se estima con media sobre los meses con venta > 0, no media aritmética simple.
- Ratio elevado de reclamos: killer o penalización del cupo (umbrales por definir en tramos deterministas).
- Cupo genérico LF4 = 10% de la suma de cupos de deudores prime y/o nota > 4,2.

> **Qué está implementado y qué no.** El prototipo **sí** dimensiona: reparte el presupuesto del cliente entre sus pares de forma proporcional al volumen facturado y reserva el comodín LF4 con el 10%. Lo que **no** implementa es la fórmula `venta_mensual × plazo/30 × SoW` de este apartado, y su 10% se toma sobre el **presupuesto total de pares**, sin filtrar por prime ni por nota > 4,2 como dice la línea de arriba. Es dimensionamiento sintético para que la demo tenga líneas con forma realista, no el cálculo de negocio.

---

## 4. Algoritmo de asignación

Función pura de `(selección de facturas, estado de líneas)` → `(asignaciones, faltantes)`. Sin efectos laterales hasta que se persiste.

```
funcion asignar(operacion, lineas, paraguas):

  disponible_cliente = Σ aprobado(lineas) − Σ vigente_no_pagado(lineas)
  resultados = []

  deudores = agrupar facturas seleccionadas por rut_deudor
  ordenar deudores por nota_deudor DESC, monto_seleccionado DESC

  para cada deudor en deudores:

      lf2 = linea(tipo=LF2, cliente, deudor)
      lf3 = linea(tipo=LF3, cliente, deudor)
      cascada = [lf3, lf2] sin nulos
      si cascada vacía:
          cascada = [linea(tipo=LF4, cliente)]

      cap_par      = Σ (aprobado − vigente − usado_en_esta_corrida) de cascada
      cap_paraguas = aprobado_paraguas − vigente_paraguas − usado_en_esta_corrida
      tope_efectivo = min(cap_par, disponible_cliente, cap_paraguas)

      facturas = facturas del deudor ordenadas por monto DESC

      para cada factura:
          rest_par      = cap_par − asignado_deudor
          rest_paraguas = cap_paraguas − usado_paraguas

          si factura.monto ≤ rest_par
             y factura.monto ≤ disponible_cliente
             y factura.monto ≤ rest_paraguas:

              # repartir la factura entre las líneas de la cascada, en orden
              resto = factura.monto
              para cada linea en cascada mientras resto > 0:
                  toma = min(resto, disponible(linea))
                  registrar asignacion(factura, linea, toma)
                  linea.usado += toma
                  resto -= toma

              asignado_deudor     += factura.monto
              disponible_cliente  -= factura.monto
              usado_paraguas      += factura.monto
              factura.estado = CON_LINEA

          si no:
              menor  = min(rest_par, disponible_cliente, rest_paraguas)
              motivo = cuál de los tres es el menor
              factura.estado = REQUIERE_COMITE con motivo

      holgura_deudor = max(0, min(cap_par − asignado_deudor,
                                  disponible_cliente,
                                  cap_paraguas − usado_paraguas))

  # consumo total de las líneas de un solo uso
  para cada linea de tipo LF3 o LF1 con usado > 0:
      linea.monto_caducado = disponible_original − usado
      linea.usado = disponible_original

  retornar resultados
```

**Ordenar las facturas por monto descendente** dentro de cada deudor maximiza el monto colocado y evita que facturas chicas consuman el cupo que necesitaba una grande.

### 4.1 Motivo del rechazo

El motivo es el nivel con menor disponible al momento del rechazo. Determina qué se le pide al comité:

| Motivo | Qué se pide | A quién afecta |
|---|---|---|
| `par` | Línea Puntual Cliente-Deudor | Solo este cliente y este deudor |
| `lf4` | Línea Puntual Cliente-Deudor | Solo este cliente y este deudor |
| `cliente` | Aumento de la Línea Global Cliente | Todo el cliente |
| `deudor` | **Ampliar** la Línea Global Deudor si ya tiene una, **Solicitar**la si no | **Todos los clientes que ceden ese deudor** |
| `lf1` | Asignación de líneas por comité | Todo el cliente |

Cuatro precisiones sobre esta tabla:

- **El motivo del deudor se llama `deudor`, no `paraguas`.** La palabra «paraguas» no existe en la implementación; el rótulo de negocio es **Línea Global Deudor**.
- **`deudor` tiene dos resoluciones, no una**, y la diferencia importa para redactar la solicitud: si el deudor ya tiene línea global se pide **ampliarla**; si no tiene, se pide **constituirla**.
- **`par` y `lf4` piden lo mismo al comité** —una Línea Puntual Cliente-Deudor—, y eso es correcto: lo que los separa es el diagnóstico (en `par` la línea del par existe y está sin cupo; en `lf4` no existe y el comodín del cliente tampoco alcanza), no la petición.
- **`lf1` es el quinto motivo** y sólo aparece con el cliente en **estado A**: recién enrolado, con la Línea Inicial de MM$30 y sin líneas de par. Si el deudor no está cubierto por esa línea inicial, lo que se pide no es una línea más sino que el comité **asigne líneas** al cliente.

Un aumento de la Línea Global Deudor no se resuelve con una puntual del cliente. Son resoluciones distintas y el modal de confirmación debe decirlo.

### 4.2 Alcance del recálculo

**Siempre se reevalúa la operación completa.** No es válido recalcular solo el deudor modificado:

- La línea del cliente se consume acumulativamente recorriendo en orden de nota.
- El pozo LF4 es compartido entre todos los deudores sin línea propia.
- Agregar un deudor con mejor nota reordena la lista y puede cambiar el resultado de todos los que vienen detrás.

Lo único exclusivo de un deudor es su línea del par. Mantener dos caminos de cálculo (parcial y completo) garantiza que en algún momento diverjan, y el síntoma es una operación cursada contra cupo inexistente. El costo es despreciable: decenas de deudores y cientos de facturas en memoria. La restricción real son las llamadas a la API de líneas, que se resuelven pidiendo todos los disponibles **una vez por evaluación**.

### 4.3 Versionado de la simulación y diff entre evaluaciones

**Lo que trae la API de líneas es la verdad, y sobre eso se asigna.** La evaluación anterior no reserva cupo, no le da preferencia a ninguna factura y no altera el resultado en ningún caso. El motor sigue siendo la función pura de §4: mismas entradas, mismo resultado.

Lo que sí hace falta es **explicar qué se movió**, porque entre una evaluación y la siguiente cambian datos que el ejecutivo no controla y que no puede deducir mirando sólo el resultado nuevo:

| Movimiento | Qué ve el ejecutivo | Qué pasó realmente |
|---|---|---|
| **Ganó línea** | Facturas que antes iban a comité ahora se cursan | El comité amplió la línea, o se liberó cupo porque un deudor pagó |
| **Perdió línea** | Facturas que antes se cursaban ahora van a comité | El cupo se consumió en **otro negocio**, cursado por otro canal, a veces de otra cartera |
| **Cambió de línea** | La misma factura se financia con otra línea | La puntual se agotó y la tomó la normal, o al revés |

Sin esa explicación, una oferta idéntica que ayer se cursaba y hoy no se lee como un error del sistema.

#### La versión es el mecanismo

El otorgamiento ya versiona cada simulación: un registro **inmutable y append-only** con lo que devolvió el origen en ese momento, y la pantalla diffea la versión N contra la N−1. **Ese mismo concepto cubre las otras dos decisiones que dependen de datos externos que se mueven solos**, así que cada versión de simulación fija las tres:

| Bloque de la versión | Qué congela | Por qué se mueve entre versiones |
|---|---|---|
| **Otorgamiento** | Variables del origen y disposición de cada regla | El JSON de la API se regulariza tras la firma |
| **Asignación de líneas** | Con qué línea y qué monto se financió cada factura, y qué quedó para comité | El comité amplía cupos; otros negocios los consumen |
| **Verificación de facturas** | Veredicto por deudor y qué criterio lo gatilló | El batch diario refresca el estado del par cliente-deudor |

Cada simulación emite una versión nueva; ninguna versión emitida se edita. El diff que ve el ejecutivo es siempre **versión actual contra versión anterior**, y es descriptivo: nunca una entrada del cálculo.

#### Después de aceptar, la operación sólo ENCOGE

La verificación telefónica es la única mutación que admite una operación firmada: si el deudor no confirma, Security **retira** esas facturas (§1 del spec de verificación). Nada agrega nunca. Esa mutación se resuelve **recortando** la asignación aceptada, no volviendo a asignar:

```
recortar(asignación_aceptada, facturas_que_quedan):
    salen las facturas retiradas, con sus líneas y sus montos
    las demás conservan su línea y su monto, intactas
    NO se consulta de nuevo /lineas/consulta ni se re-asigna nada
```

Las tres razones, en orden de peso:

1. **No puede mejorar y sí puede empeorar.** La reserva vigente cubre un monto MAYOR que el que queda, así que re-asignar no libera nada nuevo; lo único que haría es exponer la operación al cupo que otro negocio consumió mientras tanto. Una operación firmada no pierde línea por una llamada telefónica.
2. **El monto a girar bajaría dos veces.** Menos facturas ya baja el monto; que además cambiara la asignación de las facturas confirmadas haría irreconstruible la diferencia contra lo que el cliente firmó.
3. **El cupo liberado no vuelve solo.** La reserva sigue puesta por el monto original hasta que el core commitee la operación recortada o alguien pida liberar el sobrante en el sistema de gestión de líneas (§3.7). Por eso los disponibles del snapshot **no suben** al recortar: subirlos sería contar cupo que todavía está comprometido.

El recorte emite una **versión nueva**, con el motivo («el deudor no confirmó el folio N»). Esa versión es la evidencia de por qué el monto a girar quedó por debajo de lo aceptado.

#### Consecuencia de diseño

La versión anterior es **evidencia, no reserva**. Permite reconstruir por qué se decidió lo que se decidió —con qué cupos, con qué variables y con qué veredicto de verificación— sin condicionar la evaluación de hoy. La reserva, cuando existe, la administra el sistema de gestión de líneas y la commitea el core (§3.7): este módulo ni la lleva ni la simula.

---

## 5. API

### 5.1 Consultar disponibles

Una sola llamada por evaluación, con **todos** los RUT deudores involucrados. No una por deudor: el recálculo es completo (§4.2) y N llamadas devuelven N snapshots distintos.

La respuesta trae los **tres niveles que compara la regla de validación** (§3.1), cada uno con los cuatro montos, para que el consumidor no tenga que derivarlos:

```
disponible = aprobada − utilizada − reservada
```

```
POST /api/lineas/consulta
{
  "rut_cliente": "76.129.440-2",
  "producto": "factoring",
  "ruts_deudor": ["64.492.386-2", "18.869.288-9"]
}
→ {
  "consultado_en": "2026-09-03T14:22:10-03:00",
  "rut_cliente": "76.129.440-2",

  "cliente": {                          ← nivel 1 · comodines LF1 y LF4
    "aprobada": 1200000000,
    "utilizada":  780000000,
    "reservada":   45000000,
    "disponible": 375000000,
    "tope_propio": false,
    "lineas": [ { "id": "LF1-...", "tipo": "LF1", "solo_prime": true, ... },
                { "id": "LF4-...", "tipo": "LF4", ... } ]
  },

  "cliente_deudor": [                   ← nivel 2 · un elemento por RUT deudor pedido
    { "rut_deudor": "64.492.386-2",
      "sin_linea_propia": false,
      "aprobada": 360000000, "utilizada": 200000000, "reservada": 0, "disponible": 160000000,
      "lineas": [ { "id": "LF3-0003", "tipo": "LF3", "un_solo_uso": true, ... },
                  { "id": "LF2-0002", "tipo": "LF2", ... } ] }
  ],

  "deudor": [                           ← nivel 3 · exposición global, compartida entre carteras
    { "rut_deudor": "64.492.386-2", "nombre": "...",
      "aprobada": 6000000000, "utilizada": 5700000000, "reservada": 120000000, "disponible": 180000000,
      "n_clientes_cediendo": 7 }
  ]
}
```

Swagger: `Integraciones/swagger_consulta_lineas.yaml` (activo **A23**). Detalle de campos en `Integraciones/spec_swagger_consulta_lineas.md`.

**Reglas del contrato:**

- **El nivel cliente viene una sola vez, no por deudor.** LF1 y LF4 son pozos comodín compartidos entre todos los deudores de la operación; repetirlos por deudor y sumarlos duplica cupo que no existe.
- **Snapshot único.** `consultado_en` vale para los tres niveles. Armarlos desde lecturas de instantes distintos hace que el `min(...)` compare estados que nunca coexistieron.
- **El par sin línea propia se devuelve igual**, con montos en cero y `sin_linea_propia: true`. El motor lo necesita para saber que el único camino es la LF4 y que el motivo del rechazo sería `lf4`, no `par`.
- **La línea suspendida no se omite**, viene con `disponible: 0`. Hay que poder distinguir «suspendida» de «inexistente» para explicar el rechazo.
- **`tope_propio: false`** confirma que el nivel cliente es un consolidado de reporte y no puede bloquear por sí solo (§2.3).
- **La reserva es de lectura.** Ver §3.7: la crea el sistema de gestión de líneas al aceptar el cliente y la commitea el core al aprobar Operaciones.
- **Ante error o timeout la evaluación no se completa** y el resultado queda en «Por evaluar» (§8.4). Mostrar un cursable calculado con cupos viejos es peor: el ejecutivo compromete plazos de giro sobre esa cifra.

### 5.2 Evaluar

```
POST /api/operaciones/{id}/evaluar-linea
{
  "facturas": ["F-107032", "F-107044", "..."],
  "version_anterior": "SIMV-0007"        // opcional, SÓLO para poder devolver `cambio` y `diff`
}
→ {
  "cursable": 324200000,
  "requiere_comite": 199300000,
  "deudores": [ { "rut_deudor", "estado", "asignado", "holgura", "topes", "tramos" } ],
  "facturas": [
    { "factura_id": "F-107032",
      "estado": "CON_LINEA",
      "origen": [{ "linea_id", "monto" }],
      "motivo": null,
      "cambio": "igual" }      // igual | gano_linea | perdio_linea | cambio_de_linea | nueva
  ],
  "solicitudes": [ { "rut_deudor", "tipo_resolucion", "monto", "alcance" } ],
  "diff": { "ganaron": 2, "monto_ganado": 84100000, "perdieron": 0, "monto_perdido": 0, "cambiaron": 1 }
}
```

`version_anterior` **no participa de la decisión**: la asignación se calcula íntegramente con lo que devuelve `/lineas/consulta` (§5.1). Sirve sólo para que la respuesta traiga `cambio` y `diff` ya calculados. Omitirla devuelve el mismo `cursable`, los mismos `origen` y las mismas `solicitudes`, sin el diff.

`diff` alimenta el banner de reevaluación (§8.4): «2 facturas por $84,1M que antes iban a comité ahora tienen línea».

No persiste reservas. Es consulta.

### 5.3 Cursar

```
POST /api/operaciones/{id}/cursar
Idempotency-Key: {operacion_id}:{hash_seleccion}
```

Reevalúa dentro de la transacción y persiste. Ver §6.

### 5.4 Facturas disponibles que caben

Para la pista de "esta factura cabe en el cupo restante", filtrar del lado del servidor pasando las holguras calculadas:

```sql
select f.rut_deudor, f.folio, f.monto
from  (values (:rut1,:holgura1), (:rut2,:holgura2)) as h(rut_deudor, holgura)
join  factura f on f.rut_deudor   = h.rut_deudor
               and f.rut_cedente  = :cliente
               and f.estado       = 'disponible'
               and f.monto       <= h.holgura
```

Índice sugerido: `(rut_cedente, rut_deudor, monto)`.

> La pista dice que **una** factura cabe, no que quepan varias juntas, y no considera el efecto sobre los deudores que vienen más abajo en el orden. La verdad la entrega la reevaluación.

---

## 6. Concurrencia y transaccionalidad (no implementado en este módulo)

> Nada de este apartado existe en el prototipo: no hay transacción, ni lock, ni `Idempotency-Key`, ni el estado `requiere_resimulacion`. Es diseño para el servicio, no descripción de lo que corre hoy — igual que el §3.9. El caso de prueba nº 10 del §9 no es ejecutable contra esta implementación por la misma razón.

Las aprobaciones son secuenciales en la práctica, pero eso no las serializa: dos ejecutivos aprobando con un segundo de diferencia compiten igual.

1. La transacción de curse **reevalúa** con los disponibles leídos dentro de ella.
2. Toma **lock explícito** sobre las filas afectadas, en **orden fijo** para evitar deadlocks:
   **paraguas → líneas del cliente → líneas del par**, y dentro de cada grupo por `id` ascendente.
   El punto de contención real es el paraguas, porque es compartido entre carteras.
3. La operación es **idempotente por `operacion_id`**. Un reintento tras timeout no puede consumir cupo dos veces.

### Divergencia entre lo aceptado y lo evaluado

Si la reevaluación dentro de la transacción da un resultado distinto al que el cliente aceptó, **no se aprueba en silencio un subconjunto diferente**. Como la asignación es por factura completa, menos cupo significa menos facturas y por lo tanto un monto a girar distinto al que el cliente firmó.

La operación pasa a estado `requiere_resimulacion`, con el diff visible, y vuelve al ejecutivo.

---

## 7. Decisiones abiertas

| Tema | Estado |
|---|---|
| Sublímite de la LF4 por RUT deudor | Sin definir. Sin tope, el primer deudor sin línea propia puede consumir el pozo entero. Un deudor con facturas grandes no es un caso de LF4 y debería derivar a solicitud de línea propia antes de drenarlo. |
| Orden dentro del pozo LF4 | Hoy por nota, igual que todos. Si el propósito es cubrir la cola de montos chicos, ordenar por monto ascendente dentro de ese grupo alcanza para más deudores con el mismo cupo. |
| Tope propio del cliente | Sin definir. Sin él, el nivel 1 nunca bloquea (§2.3). |
| Umbral de utilización de la puntual | Propuesto: si la operación consume menos de X% de la LF3, marcar la asignación y exigir confirmación explícita del ejecutivo. No bloquea, obliga a que sea una decisión y no un efecto del orden de llegada. |
| Vigencia obligatoria en LF3 | Una puntual sin operación asociada y sin expiración queda flotando ocupando cupo aprobado. |
| Reserva en operaciones en curse | **Resuelto.** La reserva es del sistema de gestión de líneas y la commitea el core al aprobar Operaciones. Ver §3.7. |
| Caída de nota bajo 4,2 con línea aprobada | Recomendación: no tocar la línea, bloquear vía motor de reglas y generar tarea de Riesgo para revisar el cupo. |
| Orden entre operaciones del mismo cliente | La reasignación diaria debe decidir cuál de varias operaciones abiertas toca primero el pozo LF4. Sin regla explícita queda determinado por el orden de proceso. |
| Facturas en moneda extranjera | Tipo de cambio y momento de conversión sin definir. |
| Vigencia de la simulación enviada al cliente | La oferta se calculó con líneas de un día. O lleva expiración explícita, o se revalida antes del curse avisando si ya no es sostenible. |

---

## 8. Especificación de la pantalla

### 8.1 Principio

El ejecutivo arma una propuesta comercial agregando y quitando facturas. El feedback de línea existe para que entienda **si puede cursar y si necesita comité**. El vocabulario de líneas es apoyo, no protagonista.

### 8.2 Estructura

No hay filtro de listas ni panel de análisis de líneas. Todo dato de línea aparece contextualmente en la fila que lo necesita.


```
Encabezado de oportunidad
Tarjeta de veredicto          ← la respuesta, con la acción principal
Banner de reevaluación        ← diff, tras evaluar
Barra de trabajo              ← buscador + menú Acciones
Deudores en la oferta         ← solo las facturas agregadas
Otras facturas disponibles    ← solo las facturas no agregadas
Modal de confirmación
```

### 8.3 Veredicto

| Condición | Color | Texto |
|---|---|---|
| Oferta vacía | gris | La oferta está vacía |
| `requiere_comite = 0` | verde | Se puede cursar la oferta completa · $X |
| `cursable > 0` y `requiere_comite > 0` | **violeta** | Se puede cursar $X de $Y |
| `cursable = 0` | rojo | No se puede cursar nada de esta oferta |
| Selección modificada | violeta | La selección cambió |

El caso parcial **no es una advertencia**. Es el caso normal de una oferta grande. Nada de tonos de warning.

Cifras al pie: Oferta (siempre en vivo), Cursable hoy y Requiere comité.

### 8.4 Reevaluación explícita

Agregar o quitar facturas **no dispara cálculo**. Marca el resultado como desactualizado:

- La lista se atenúa.
- El botón principal se reemplaza por **Re-evaluar línea**.
- Las opciones del menú que dependen de la evaluación se deshabilitan.
- Las cifras que dependen de línea muestran **"Por evaluar"**, sin número. Una cifra vieja atenuada se sigue leyendo como cifra y alguien la va a citar.

**Se actualiza al instante** (aritmética pura): monto de la oferta, conteo de deudores y facturas, monto seleccionado por deudor.

**Queda pendiente** (requiere consultar líneas): monto cursable, monto a comité, estado de cada factura, monto asignado por deudor.

Tras evaluar, un banner muestra el diff: quién cambió de estado, cómo se movió el monto cursable y el que va a comité.

### 8.5 Fila de deudor

```
[nº] nombre / RUT · nota (periodo) · ★ Prime | chip cobertura | monto asignado / seleccionado | chip estado ⓘ | 🗑 | ▾
```

**Chip de cobertura** — `"N de M con línea"`, con fondo y borde del mismo tono:

| Condición | Tono |
|---|---|
| Todas con línea | verde |
| Cobertura parcial | violeta |
| Ninguna con línea | rojo |
| Sin evaluar / pendiente | gris |

Los fondos claros necesitan borde del mismo tono; sin él, el verde `#F0FDF4` es imperceptible sobre blanco.

Si el deudor tiene facturas recién agregadas, un segundo chip gris `"N sin evaluar"` al lado.

**Chip de estado** — **Con línea** (verde) / **Parcial** (violeta) / **Sin línea** (rojo) / **Sin evaluar** (gris). Contiene un ⓘ integrado; al hover abre el detalle: los tres topes con el restrictivo marcado, cuál manda y con cuánto, las líneas usadas con su monto, y la holgura restante. No debe haber un botón de info separado del chip.

**Franja violeta de puntual** — aparece solo cuando queda saldo de LF3 **y** el deudor tiene facturas sin agregar que quepan en ese saldo. Sin candidatas el mensaje no sirve y no se muestra. El monto es `min(saldo puntual, holgura del deudor)`, no el saldo de la línea a secas. Tono violeta, nunca warning: es una oportunidad, no una alerta.

**Alineación** — las filas de la oferta llevan círculo numerado y las de disponibles no. Para que las columnas coincidan entre ambas secciones, el bloque de nombre va a ancho fijo compensando esa diferencia (290px con número, 326px sin él), y el espacio sobrante lo absorbe un separador elástico después del chip de cobertura. El grupo final (estado, basurero, flecha) lleva separación propia y la fila algo más de padding a la derecha que a la izquierda.

### 8.6 Tabla de facturas

Columnas: folio · vencimiento · monto · **financiada con** · estado · acción.

- "Financiada con" muestra las líneas de origen con su monto. Una factura repartida entre dos líneas muestra ambas: `LF3-0011 · $60,0M` + `LF2-0004 · $70,0M`.
- Estado: Se puede cursar (verde) / Requiere comité (rojo, con el motivo en lenguaje de negocio debajo) / Sin evaluar (gris).
- Acción: **basurero** para quitar, **+** para agregar. Sin checkboxes.
- Las dos secciones son **disjuntas**: arriba solo lo agregado, abajo solo lo disponible. Un mismo deudor puede aparecer en ambas, marcado con "ya tiene facturas en la oferta". Mezclar agregadas y disponibles en una sola tabla hace imposible saber en qué quedó la selección.
- Encabezado de la sección inferior: "Otras facturas disponibles (N deudores)" · "Agrega más facturas de otros deudores".

Motivos en lenguaje de negocio, nunca el nombre técnico del nivel:

| Motivo interno | Texto |
|---|---|
| `par` | línea del deudor sin cupo |
| `lf4` | sin línea propia y el cupo genérico está tomado |
| `cliente` | tope del cliente alcanzado |
| `paraguas` | exposición máxima del deudor alcanzada |

### 8.7 Menú Acciones

- **Rellenar hasta el cupo disponible** — agrega, en pasadas sucesivas, las facturas que caben en el cupo restante. Cada factura que entra cambia el cupo del resto.
- **Quitar lo que no tiene línea** — deja una oferta cursable hoy sin pasar por comité.
- **Vaciar oferta** — destructiva, separada.

Se deshabilitan según contexto en vez de desaparecer.

### 8.8 Modal de confirmación

Se abre al presionar **Cursar** cuando hay solicitudes al comité. Tonos morados.

- Cabecera lila: "Confirmar curse". El botón que lo abre dice **Cursar** en todos los casos; cuando no hay solicitudes pendientes cursa directo sin modal.
- Dos cifras enfrentadas: lo que se cursa con línea vigente (verde) y lo que se solicita al comité (morado).
- Tabla: deudor · qué se pide · monto · a quién afecta.
- Nota: al confirmar se **publica la oferta** y la solicitud entra a la bandeja del comité. **No** se reserva nada acá: la reserva la crea el sistema de gestión de líneas cuando el **cliente firma**, y el core la convierte en línea utilizada cuando **Operaciones aprueba** (§3.7). La redacción anterior —«las asignaciones pasan de reservadas a aprobadas»— venía del modelo viejo, en que este módulo administraba la reserva, y contradecía al propio §3.7. El copy del modal en la aplicación la reproducía literal y se corrigió junto con esto.
- Acciones: Cancelar · **Confirmar y enviar**.
- Cierre por Escape, clic fuera o Cancelar.

La solicitud es **una sola** con líneas de detalle, cada una aprobable, recortable o rechazable por separado por el comité.

---

## 9. Casos de prueba

Datos sintéticos del prototipo. Cliente Comercial del Valle S.A. con 7 deudores en la oferta.

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Deudor con LF2 holgada, una factura chica | Con línea. Origen: LF2 completa. |
| 2 | Deudor con LF3 de $120M y facturas por $84,1M | Con línea, todo desde LF3. LF3 queda consumida, `monto_caducado = $35,9M`. Franja de saldo disponible si tiene facturas candidatas. |
| 3 | Factura de $130M con LF3 de $60M y LF2 con $172M | Con línea, repartida: `LF3 $60,0M + LF2 $70,0M`. |
| 4 | Deudor con par holgado pero paraguas con $150M | Parcial. Motivo `paraguas`. Solicitud tipo aumento de exposición del deudor. |
| 5 | Deudor sin LF2 ni LF3, LF4 con saldo | Con línea desde LF4. |
| 6 | Deudor sin LF2 ni LF3, LF4 ya agotada por un deudor de mejor nota | Sin línea. Motivo `lf4`. |
| 7 | Agregar un deudor de nota superior a los ya presentes | Entra en su posición por nota y puede cambiar el resultado de todos los que vienen detrás. Verificar que el recálculo es completo. |
| 8 | Quitar todas las facturas de un deudor | Sale de la oferta, libera cupo, los siguientes pueden mejorar. |
| 9 | Modificar la selección | Resultado marcado como desactualizado. Montos aritméticos actualizados, cifras de línea en "Por evaluar", acciones dependientes deshabilitadas. |
| 10 | Curse concurrente sobre el mismo paraguas | La segunda transacción reevalúa, detecta menos cupo y deriva a `requiere_resimulacion`. |
| 11 | Reevaluar sin que nada haya cambiado | El diff no reporta movimientos: todas las facturas `igual`. |
| 12 | Entre versiones el comité amplió la línea | Las que iban a comité pasan a `CON_LINEA` con `cambio: gano_linea`, y el diff informa cuántas y por cuánto. |
| 13 | Entre versiones otro negocio consumió el cupo | Las que se cursaban pasan a `REQUIERE_COMITE` con `cambio: perdio_linea`. Es el caso que, sin explicación, se lee como error del sistema. |
| 14 | La puntual se agotó entre versiones | La misma factura se financia ahora con la normal: `cambio: cambio_de_linea`. |
| 15 | La versión anterior no altera la asignación | Con y sin `version_anterior` el resultado es idéntico —mismo cursable, mismos `origen`, mismas solicitudes—; lo único que cambia es que aparece el diff. Guardarraíl del principio: la API es la verdad. |
