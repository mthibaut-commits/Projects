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
  "vigencia_desde": "2026-03-01",
  "vigencia_hasta": "2027-03-01",
  "estado": "vigente | caducada | anulada",
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

---

## 3. Reglas de negocio

### 3.1 Regla de validación

Para cada factura:

```
monto_factura ≤ min( disponible_cliente , disponible_cliente_deudor , disponible_deudor_global )
```

Los tres niveles se descuentan simultáneamente cuando la factura se asigna.

### 3.2 Cálculo de disponible

```
disponible = monto_aprobado − vigente_no_pagado − reservado
```

- El cupo se libera **solo cuando el deudor paga la factura al vencimiento**.
- Una factura vencida e impaga **sigue consumiendo cupo**. No hay liberación por mora.

### 3.3 Asignación por factura completa

No se puede ceder media factura. Cuando el cupo no alcanza, quedan **facturas enteras** fuera de la asignación. Razonar en montos agregados por deudor produce resultados que no son ejecutables.

### 3.4 Orden de asignación

Los deudores de la operación se procesan **de mayor a menor nota deudor**. El orden importa porque hay recursos compartidos: el pozo LF4 y (cuando exista un tope propio) la línea del cliente.

Empate de nota: desempata el monto seleccionado, de mayor a menor.

### 3.5 Cascada de líneas por deudor

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

### 3.9 Dimensionamiento del cupo (contexto, no implementado en este módulo)

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
| `par` | Línea puntual LF3 para este deudor | Solo este cliente y este deudor |
| `lf4` | Línea propia para este deudor | Solo este cliente y este deudor |
| `cliente` | Aumento de línea del cliente | Todo el cliente |
| `paraguas` | Aumento de exposición del deudor | **Todos los clientes que ceden ese deudor** |

Un aumento de paraguas no se resuelve con una puntual del cliente. Son resoluciones distintas y el modal de confirmación debe decirlo.

### 4.2 Alcance del recálculo

**Siempre se reevalúa la operación completa.** No es válido recalcular solo el deudor modificado:

- La línea del cliente se consume acumulativamente recorriendo en orden de nota.
- El pozo LF4 es compartido entre todos los deudores sin línea propia.
- Agregar un deudor con mejor nota reordena la lista y puede cambiar el resultado de todos los que vienen detrás.

Lo único exclusivo de un deudor es su línea del par. Mantener dos caminos de cálculo (parcial y completo) garantiza que en algún momento diverjan, y el síntoma es una operación cursada contra cupo inexistente. El costo es despreciable: decenas de deudores y cientos de facturas en memoria. La restricción real son las llamadas a la API de líneas, que se resuelven pidiendo todos los disponibles **una vez por evaluación**.

---

## 5. API

### 5.1 Consultar disponibles

```
POST /api/lineas/disponibles
{
  "rut_cliente": "76.129.440-2",
  "producto": "factoring",
  "ruts_deudor": ["64.492.386-2", "18.869.288-9", "..."]
}
→ {
  "lineas": [ ... ],
  "paraguas": [ ... ],
  "consultado_en": "2026-09-03T14:22:10-03:00"
}
```

Una sola llamada por evaluación, con todos los RUT deudores involucrados.

### 5.2 Evaluar

```
POST /api/operaciones/{id}/evaluar-linea
{ "facturas": ["F-107032", "F-107044", "..."] }
→ {
  "cursable": 324200000,
  "requiere_comite": 199300000,
  "deudores": [ { "rut_deudor", "estado", "asignado", "holgura", "topes", "tramos" } ],
  "facturas": [ { "factura_id", "estado", "origen": [{ "linea_id", "monto" }], "motivo" } ],
  "solicitudes": [ { "rut_deudor", "tipo_resolucion", "monto", "alcance" } ]
}
```

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

## 6. Concurrencia y transaccionalidad

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
- Nota: al confirmar, las asignaciones pasan de reservadas a aprobadas y la solicitud entra a la bandeja del comité.
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
