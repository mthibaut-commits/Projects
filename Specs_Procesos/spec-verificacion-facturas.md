# Especificación · Determinación de verificación de facturas

**Producto:** Factoring Security · módulo de originación
**Alcance:** función aislada que decide si las facturas de una operación deben verificarse con el deudor
**Relación:** corre junto al motor de asignación de líneas (`spec-asignacion-lineas.md`) en la misma reevaluación de la operación.

---

## 1. Qué es la verificación

Antes de girar, el equipo de operaciones de Security puede necesitar **contactar al deudor** para obtener un documento —correo o grabación telefónica— donde quede explícito que pagará las facturas que se están evaluando.

- El contacto toma típicamente **3 a 4 horas**, así que **retrasa el giro**.
- Si el deudor **no confirma**, Security **retira las facturas no confirmadas** de la operación.
- La decisión es **dicotómica**: se verifica o no se verifica.

El objetivo de esta función es aislar esa decisión, para que el motor la calcule de forma determinista y el ejecutivo sepa antes de comprometer un plazo si la operación va a requerir contacto.

---

## 2. Contrato de la función

### 2.1 Granularidad de la salida

**La decisión es por deudor dentro de la operación**, no por factura.

Ninguna de las reglas discrimina entre facturas del mismo deudor:

- Las reglas 2, 5, 7, 8 y 10 son atributos del deudor o del par cliente-deudor.
- Las reglas 3 y 4 comparan el **monto agregado de la operación con ese deudor** contra sus promedios.
- Las reglas 6 y 9 nacen a nivel documento pero **escalan al deudor**: si una factura desvía la fecha de pago o supera el umbral de alto monto, se verifica el conjunto para que el contacto sea consistente.

El detalle por factura aparece **después** del contacto, cuando el deudor confirma unas y no otras y Security retira las no confirmadas. Esa es una fase distinta y no es responsabilidad de esta función.

Dos consecuencias de esa fase que sí hay que fijar:

- **La factura no confirmada queda VETADA para esa operación.** No se puede volver a seleccionar, ni siquiera si la operación se reabre para modificarla: es el resultado de una llamada, no una preferencia del ejecutivo. Agregar otras facturas sí se puede, y esas sí pasan por verificación.
- **La verificación ya realizada se conserva.** El veredicto por deudor y, sobre todo, las llamadas ya registradas persisten por operación. Si se reabre para modificarla, rehacer un contacto que ya se hizo son 3–4 horas por deudor tiradas, y el deudor ya respondió.


### 2.2 Entrada

```json
{
  "rut_cliente": "76.129.440-2",
  "rut_deudor": "64.492.386-2",
  "facturas": [ { "folio": "107032", "monto": 52300000, "fecha_vencimiento": "2026-10-16" } ],
  "monto_operacion_par": 84100000
}
```

### 2.3 Salida

```json
{
  "rut_deudor": "64.492.386-2",
  "requiere_verificacion": true,
  "motivo": "protocolo | criterio_incumplido",
  "protocolo_deudor": { "existe": true, "id": "PROT-0043" },
  "grupo": "prime | nota_alta | otros",
  "criterios_aplicables": [1,4,5,7,8,10],
  "criterios_evaluados": [
    { "regla": 4, "variable": "MntOpC-D / AvgVentaPromC-D 3M", "valor": 1.14, "criterio": "< 1.0", "cumple": false, "dato_disponible": true },
    { "regla": 10, "variable": "MntPagoDeudorUlt3M", "valor": null, "criterio": "> 1.000M", "cumple": false, "dato_disponible": false }
  ]
}
```

La función devuelve siempre **la lista completa de criterios evaluados**, no solo el veredicto. El ejecutivo y el equipo de operaciones necesitan saber qué falló para saber si vale la pena editar la operación.

---

## 3. Segmentación

Existen dos protocolos según el deudor:

| Grupo | Definición | Criterios que debe superar |
|---|---|---|
| **Protocolo recortado** | Deudor **prime** *o* deudor con **nota deudor > 4,2**. Son dos poblaciones distintas; basta pertenecer a una. | 6 criterios: **1, 4, 5, 7, 8, 10** |
| **Protocolo completo** | Todos los demás | 10 criterios |

---

## 4. Lógica de decisión

### 4.0 Cortocircuito por primera operación (regla 0)

**Si es la primera operación del cliente, se verifican TODAS las facturas**, cualquiera sea el
segmento del deudor y aunque cumpla todos los criterios. Es una compuerta y va **antes** que la del
protocolo propio: cuando aplica, es la **única causa informada**, porque ninguna otra regla se evaluó.

Aplica a los **dos segmentos** porque no es un criterio de riesgo del deudor: es del **cliente**. Un
cliente sin operaciones no tiene historial propio del par sobre el que decidir, y su primera operación
se cursa contra la línea inicial LF1.

El estado del cliente —`nuevo`, `activo`, `suspendido`, `eliminado`— lo devuelve una **API de
Security** al iniciar sesión; sólo `nuevo` es primera operación. Entra **por parámetro** al modelo, no
se lee adentro: es dato del tenant, y además cambia en cuanto el cliente cursa, así que memoizarlo
junto al par —que sí se cachea— lo dejaría verificándolo todo para siempre.

> Esta regla vive en el modelo de verificación y no en el de líneas ni en la pantalla del giro:
> «si hay que llamar a este deudor» es una sola pregunta y tiene un solo dueño. Con la regla afuera,
> cada sitio que necesitara saberlo habría reimplementado su propia versión.

### 4.1 Cortocircuito por protocolo (regla 1)

La regla 1 **no es un criterio más del conjunto**, es una compuerta al inicio de la función:

```
si ExisteProtocoloDeudor:
    requiere_verificacion = SÍ
    protocolo a seguir     = el del deudor
    fin                          ← no se evalúan las demás reglas
```

Si el deudor tiene un protocolo de confirmación definido, siempre hay que seguirlo, así que siempre se verifica usando ese protocolo.

### 4.2 Unanimidad

Si no hay protocolo, para **evitar** la verificación hay que superar **todos** los criterios aplicables al grupo. Es una conjunción, no una votación por mayoría: basta que falle uno para gatillar el contacto.

### 4.3 Dato faltante equivale a incumplimiento

No existe estado intermedio. Si la variable no se puede calcular por falta de información, el criterio **no se cumple** y la operación va directo a verificación.

Esto tiene un efecto deseado: un deudor nuevo no tiene historial para las reglas 2, 5 y 10, así que se verifica por construcción.

---

## 5. Las once reglas (0 a 10)

| # | Nombre | Variable | Criterio | Recortado | Completo |
|---|---|---|---|:---:|:---:|
| 1 | Existencia de protocolo de verificación del deudor | `ExisteProtocoloDeudor` | compuerta | ✔ | ✔ |
| 2 | Monto pagado por el deudor sobre la cartera, últimos 3M | `MntPagoDeudorUlt3M / MntPagoUlt3M` | ≥ 90% | | ✔ |
| 3 | Monto de la operación contra el promedio de compra | `MntOpC-D / AvgMntFacturaOpCarteraC-D` | ≤ 1,3× | | ✔ |
| 4 | Monto de la operación contra la relación comercial | `MntOpC-D / AvgVentaPromC-D 3M` | < 1,0 | ✔ | ✔ |
| 5 | Estabilidad de la relación comercial, últimos 6M | `Count(VentaMensualC-D > 0)` | **≥ 4 meses** | ✔ | ✔ |
| 6 | Desviación de la fecha de pago | `abs(FchVctoDoc − FchVctoProm) / FchVctoProm` | ≤ 5% | | ✔ |
| 7 | Porcentaje pagado con más de 25 días de mora | `MntPagoC-D >25d mora / MntPago` | < 3% | ✔ | ✔ |
| 8 | Porcentaje de facturas reclamadas | `MntFactReclamadas / MntTotalFacturas` | < 4% | ✔ | ✔ |
| 9 | Documento de alto monto | `MntOpC-D` | ≤ $300M | | ✔ |
| 10 | Historial de pago relevante con el factoring, últimos 3M | `MntPagoDeudorUlt3M` | > $1.000M | ✔ | ✔ |

### Propósito y detalle de cada regla

**1 · Protocolo del deudor.** Algunos deudores tienen un protocolo de confirmación propio. Si existe, hay que seguirlo siempre. Ver §4.1.

**2 · Quién paga realmente.** En factoring, si el deudor no paga, Security le exige el pago al cliente, que firmó un pagaré, y ejerce sus derechos de cobro contra él antes de demandar al deudor, porque es más barato. Esta regla cuantifica **qué porcentaje de la obligación pagó el deudor y qué porcentaje terminó pagando el cliente**: se toman todas las facturas operadas en los últimos 3 meses y se contrasta con el módulo de recaudación para saber quién pagó efectivamente. Si el cliente aportó una fracción relevante, la relación cliente-deudor no es tan buena y conviene llamar. El resultado es una **variable precalculada** que se publica a diario y el motor solo lee, del tipo "96% de pago del deudor en los últimos 3 meses".

**3 · Crecimiento controlado de la colocación.** Alerta si el monto de la operación se escapa más de un 30% respecto de lo que Security ha comprado de ese par en los 3 meses anteriores. Como la ventana es móvil y se evalúa en cada corrida, el tope acompaña a la colocación: si el primer mes se compran 100, después se puede llegar a 130 sin verificar, y más adelante a unos 170. El objetivo es que el factoring crezca con calma mientras conoce la relación comercial y acumula comportamiento de pago. Reemplaza al antiguo límite de promedio de compra por factura.

> El promedio **no es un valor que se recalcule por calendario**. El modelo corre en cada operación y, en cada corrida, toma la ventana de los 3 meses móviles anteriores a ese momento. Lo mismo vale para las demás ventanas de N meses de estas reglas.

**4 · Coherencia con la relación comercial real.** El monto financiado del par no puede superar lo que ese cliente y ese deudor comercializan en promedio, tomado del **libro de compraventa de los últimos 3 meses**, sobre facturas emitidas y recibidas. Es la regla antifraude: detecta una factura emitida fuera de lo que habitualmente se transa entre las partes. Se evalúa sobre el **conjunto de facturas de la operación**, no factura por factura. Si no hay relación comercial, o es demasiado joven, la variable no se calcula y por lo tanto se verifica.

**5 · Estabilidad de la relación.** Exige que existan facturas válidas emitidas entre las partes en **al menos 4 de los últimos 6 meses**, es decir `>= 4`, no `> 4` como decía la lámina. **Excluye facturas reclamadas y anuladas.**

**6 · Fecha de pago coherente con el histórico.** Quien arma la operación selecciona la fecha de pago de la factura. Si esa fecha se aleja del plazo que Security ya tiene calculado a partir del comportamiento de pago histórico del par, aparece la alerta. Ejemplo: si el deudor paga en promedio a 43 días y el usuario fija un plazo que se desvía más de 5%, hay que llamar. Cuando esta regla falla se verifican **todas** las facturas de ese deudor, para que el contacto quede consistente.

**7 · Deterioro del pago.** Mide qué porcentaje de los pagos del deudor ocurre más de 25 días después de la fecha de financiamiento, que es la fecha promedio de pago. Sobre 3%, el deudor está deteriorando su comportamiento.

**8 · Facturas reclamadas.** Mide si el deudor está reclamando facturas a su cliente por sobre el umbral, señal de que la relación comercial está cuestionada y de que el deudor ya no está recibiendo conforme.

**9 · Alto monto.** Medida preventiva: sobre el umbral se verifica sin más análisis. Se mide sobre el **total de la operación con ese deudor**. Comparar además la factura individual sería redundante —ninguna factura puede superar la suma de las facturas del mismo deudor, así que el total gatilla siempre primero— y hace pensar que son dos umbrales cuando es uno.

**10 · Representatividad del historial.** Evita el falso positivo del deudor que cumple todas las reglas simplemente porque operó una sola vez con Security. Exige volumen de pago suficiente en los últimos 3 meses para que sus estadísticas sean representativas.

---

## 6. Algoritmo

```
funcion requiere_verificacion(rut_cliente, rut_deudor, facturas):

    # 1 · compuerta
    si existe_protocolo(rut_deudor):
        retornar SÍ, motivo = "protocolo", protocolo = protocolo(rut_deudor)

    # 2 · segmento
    si es_prime(rut_deudor) o nota_deudor(rut_deudor) > 4.2:
        criterios = [1, 4, 5, 7, 8, 10]      # seis, la 1 incluida (ver §2.3 y §3)
    si no:
        criterios = [2, 3, 4, 5, 6, 7, 8, 9, 10]

    # 3 · evaluación
    monto_op = suma(facturas.monto)
    resultados = []

    para cada c en criterios:
        valor = calcular(c, rut_cliente, rut_deudor, facturas, monto_op)
        si valor es NULO:                  # sin información
            resultados += { c, cumple: falso, dato_disponible: falso }
        si no:
            resultados += { c, cumple: evalua_criterio(c, valor), valor }

    # 4 · unanimidad
    si todos(resultados.cumple):
        retornar NO, resultados
    si no:
        retornar SÍ, motivo = "criterio_incumplido", resultados
```

---

## 7. Origen de los datos

Distinguir las dos clases importa, porque define cuándo hay que recalcular.

### 7.1 Variables del deudor o del par

Independientes de la operación que se esté armando. Algunas son **variables precalculadas** que se publican con refresco diario y el motor solo lee, como el porcentaje de pago del deudor de la regla 2. Otras se calculan **en cada corrida del motor**, tomando la ventana de N meses móviles anterior a ese instante: es el caso de los promedios de las reglas 3 y 4 y de los conteos de la regla 5.

En ningún caso las ventanas se cierran por calendario. Una corrida del 15 de marzo mira desde el 15 de diciembre, no desde el 1 de enero.

| Variable | Usada por |
|---|---|
| `ExisteProtocoloDeudor` | 1 |
| `PctPagoDeudorUlt3M` | 2 |
| `AvgMntFacturaOpCarteraC-D` (ventana móvil 3M) | 3 |
| `AvgVentaPromC-D` (ventana móvil 3M, libro de compraventa) | 4 |
| `MesesConVentaC-D` (ventana móvil 6M, sin reclamadas ni anuladas) | 5 |
| `FchVctoPromC-D` (plazo histórico de pago) | 6 |
| `PctPagoSobre25dMoraC-D` | 7 |
| `PctFactReclamadasC-D` | 8 |
| `MntPagoDeudorUlt3M` (ventana móvil 3M) | 10 |
| `EsPrime`, `NotaDeudor` | segmentación |

### 7.2 Variables de la operación

Cambian cada vez que el ejecutivo agrega o quita facturas:

| Variable | Usada por |
|---|---|
| `MntOpC-D` — monto de la operación con ese deudor | 3, 4, 9 |
| `FchVctoDoc` — fecha de vencimiento de cada factura | 6 |
| `MntFactura` — monto de cada factura | 9 |

---

## 8. Integración con el armado de la oferta

Cuatro criterios dependen del monto de la operación con el deudor, así que **el resultado de verificación cambia cuando el ejecutivo edita la selección de facturas**. Debe recalcularse en la misma reevaluación explícita que corre el motor de asignación de líneas, no en un flujo aparte.

La pantalla de armado de oferta debería mostrar, por deudor, si requiere verificación y qué criterio la gatilló, con el mismo tratamiento que el estado de línea: dato de apoyo, no protagonista. El ejecutivo necesita saberlo antes de comprometer un plazo de giro, porque el contacto agrega 3 a 4 horas.

Un caso concreto que el ejecutivo debería poder ver: si el único criterio que falla es la regla 3 o la 9, quitar o reducir facturas de ese deudor puede evitar la verificación completa.

---

## 9. Decisiones abiertas y diferencias con la versión anterior

| Tema | Estado |
|---|---|
| **Regla 10, umbral fijo** | La versión anterior exigía 20× el monto de la operación o más de MM$1.500. La versión actual es un umbral fijo de $1.000M, que no mira el tamaño de la operación evaluada: un deudor con $1.100M de pagos pasa igual para una factura de $5M que para una de $400M. |
| **Segmento** | La versión anterior usaba nota > 3,7 y prime. La actual usa prime o nota > 4,2, alineado con el umbral que se usa para dimensionar cupos de línea. |
| **Reglas 3 y 8** | El árbol de decisión anterior usaba 1,1× y 5%. La versión actual usa 1,3× y 4%. |
| **Regla 6, unidad** | Se pasó de un criterio en días (< 5 días) a uno porcentual (≤ 5% del plazo promedio). Sobre 43 días, 5% equivale a poco más de 2 días. |
| **Reevaluación tras el contacto** | **Resuelto**, y por separado para cada mitad. **La verificación se congela:** el resultado del contacto es un HECHO, no una nueva predicción, y volver a predecir sobre el monto ya recortado sería circular (bajar el monto sólo puede mejorar las reglas 3, 4 y 9, que es justamente lo que la llamada ya resolvió). **La asignación de línea se RECORTA, no se recalcula:** salen las facturas retiradas y las demás conservan su línea y su monto. Re-asignar contra el estado del día expondría a una operación ya firmada al cupo que otro negocio se llevó mientras tanto, y no puede mejorar nada, porque la reserva vigente cubre un monto MAYOR que el que queda. Una operación firmada no pierde línea por una llamada telefónica. El cupo que se libera sigue reservado hasta que lo liberen en el sistema de gestión de líneas. Ver §3.7 y §4.3 del spec de asignación de líneas. |
