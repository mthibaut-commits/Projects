# Pricing y simulación de la operación

**Versión 1.2 · 12-09-2026 · NEX Factoring**

Qué determina la **tasa** de un negocio y cómo se construye el **desglose** que termina en el monto
que el cliente recibe. Es el tercer proceso aislable del módulo, junto con la asignación de líneas y
la verificación de facturas, y el único que toca directamente la plata que sale.

Todo lo que este documento describe es **configuración del tenant**: dos factorings no calculan igual
—otro IVA, otra retención, un gasto por documento, un concepto que uno cobra y el otro no— y hasta la
versión anterior eso vivía cableado dentro del código de la pantalla.

---

## 1. Dónde corre esto

**En el servidor.** El monto a girar es plata: una cifra que decide el navegador no la decide nadie.
La implementación de referencia corre en el cliente porque es una demo, pero está escrita para que se
extraiga sin reescribirla:

- `simularOperacion(entrada, { cfg, constantes })` es **pura**. No lee configuración por su cuenta:
  el catálogo de conceptos y las constantes del tenant entran por parámetro. Los valores por defecto
  son comodidad para los call sites de la interfaz, no una dependencia.
- `spreadSugerido(deudor, deal, params)` recibe la política comercial del tenant por parámetro.
- Las fórmulas se compilan a un **AST** que se serializa y se vuelve a evaluar igual en el resolver.

El resolver debe recalcular el desglose desde la configuración del tenant y desde los datos de la
operación, **nunca desde el payload del cliente**. Una pantalla que muestra el monto a girar no lo
autoriza.

---

## 2. La tasa

```
tasa mensual = spread del deudor + costo de fondo
```

| Componente | Origen | Parámetro |
|---|---|---|
| Costo de fondo | Se carga diariamente | `costoFondo` (% mensual) |
| Spread de lista | Política comercial del tenant | `spreadEstandar` (% mensual) |
| Descuento por Share of Wallet | Política comercial del tenant | `sowAjuste` (puntos por estado) |
| Piso de riesgo del deudor | Modelo de riesgo | `spreadMinDeudor(deudor)` |

### 2.1 Spread sugerido

Se parte del spread de lista y se descuentan puntos según el estado de Share of Wallet del cliente:
cuánto está dispuesto el factoring a resignar para capturar o recuperar cartera.

| Estado de SOW | Cuándo aplica | Descuento base |
|---|---|---|
| `target` | El cliente supera el target | 0,00 pts |
| `creciendo` | Tendencia creciente | 0,05 pts |
| `estable` | Bajo target, estable | 0,10 pts |
| `nuevo` | Cliente nuevo o sin SOW conocido | 0,10 pts |
| `decreciente` | Tendencia a la baja | 0,15 pts |
| `competencia` | 0% con nosotros | 0,20 pts |

```
bruto   = spreadEstandar − descuento(estadoSOW)
spread  = max(piso del deudor, bruto)
topado  = bruto < piso
```

**El piso de riesgo del deudor manda y no se negocia.** Si el descuento comercial lo perfora, el
spread se trunca ahí y la operación queda marcada como `topado`: es riesgo, no margen. Es la única
regla de este documento que no es configurable por tenant, porque no sale de la política comercial
sino del modelo de riesgo.

### 2.2 Atribución sobre la tasa

Bajar la tasa respecto de la condición original es un **descuento** y se clasifica por bandas: hasta
cierto porcentaje lo autoriza el ejecutivo; sobre eso, la jefatura; sobre el máximo de jefatura, el
Gerente Comercial. Bajo `tasaMinAbsoluta` la operación **no es ofertable por nadie**. Bajo `pisoTasa`
es económicamente inviable y se sugiere cerrar la oportunidad.

---

## 3. La simulación

### 3.1 Forma

La simulación es una lista **ordenada** de conceptos. Cada concepto tiene una fórmula y un rol:

- **`base`** — monto de referencia; no se descuenta. El **último** concepto `base` es el monto del que
  se descuenta: el Monto Anticipo.
- **`descuento`** — entra al **Subtotal Descuentos**.

El cierre es **fijo** y no se configura:

```
Subtotal Descuentos = Σ conceptos con rol «descuento»
Monto a Girar       = Monto Anticipo − Subtotal Descuentos
Retención           = fórmula propia (se INFORMA, no se descuenta del giro)
```

Son el resultado del proceso, no conceptos que un mantenedor pueda borrar. La retención se informa
al cliente y se libera si las facturas se pagan en la fecha comprometida.

### 3.2 Catálogo base

Reproduce exactamente la aritmética que estaba cableada; hay un caso de prueba que lo fija en 96
combinaciones de entrada. Un mantenedor que cambia los números el día que se instala no es un
mantenedor, es un incidente.

| # | Concepto | Rol | Fórmula |
|---|---|---|---|
| 1 | Monto Documentos | base | `montoDocs` |
| 2 | Monto Anticipo | base | `redondear(montoDocs * antic / 100)` |
| 3 | Diferencia de precio | descuento | `redondear(montoDocs * antic / 100 - (montoDocs * antic / 100) / (1 + tasaEq / 100 * plazoEq / 30))` |
| 4 | Comisión | descuento | `redondear(acotar(montoDocs * pctCom / 100, comMin * UF, comMax * UF))` |
| 5 | Gastos | descuento | `redondear(gastoOp + gastoDoc * cantFacturas)` |
| 6 | IVA | descuento | `redondear(comision * ivaPct / 100)` |
| 7 | Recargos | descuento | `mora` |
| 8 | Descuentos | descuento | `otrosDesc` |
| 9 | Cuentas por cobrar | descuento | `cxc` |
| — | **Retención** | resultado | `redondear(montoDocs * retencionPct / 100)` |

La **diferencia de precio** es el precio del dinero. El concepto del catálogo la calcula sobre el
total con **descuento racional** usando la **tasa y el plazo equivalentes** (§4.3), y da exactamente la
suma documento a documento: es la propiedad que justifica que exista una tasa equivalente. Hasta la
v1.1 se calculaba lineal y sin plazo (`montoDocs · tasa/100 · antic/100`), que cobra lo mismo por 15
días que por 90.

La **comisión** es un porcentaje sobre el monto acotado por un mínimo y un máximo en UF. `acotar` es
ese patrón escrito una sola vez.

El **IVA** grava la comisión, y para eso usa el concepto `comision` **ya calculado**: es el caso que
justifica que el orden importe.

### 3.3 Variables disponibles

| Variable | Origen | Qué es |
|---|---|---|
| `montoDocs` | operación | Suma de las facturas seleccionadas |
| `cantFacturas` | operación | Número de documentos |
| `dias` | operación | Plazo promedio hasta el pago del deudor |
| `mora` | operación | Documentos con mora |
| `otrosDesc` | operación | Descuentos pactados |
| `cxc` | operación | Saldo por cobrar del cliente |
| `tasa` | condición | Tasa mensual, editable bajo atribución |
| `antic` | condición | % de anticipo |
| `pctCom` | condición | % de comisión |
| `comMin` / `comMax` | condición | Piso y techo de la comisión, en UF |
| `gastoOp` / `gastoDoc` | condición | Gasto fijo y gasto por documento |
| `UF` | tenant | Valor de la UF |
| `ivaPct` | tenant | % de IVA |
| `retencionPct` | tenant | % de retención |
| `tasaEq` | operación | Tasa equivalente (§4.3), con 6 decimales |
| `plazoEq` | operación | Plazo equivalente (§4.3), con 6 decimales |

Las de **operación** salen del negocio que se simula. Las de **condición** las edita el ejecutivo en
la propia pantalla, sujetas a atribución (§2.2). Las de **tenant** se editan en
*Configuración › Operación* y las fórmulas las usan por su nombre.

Una fórmula puede además usar cualquier concepto **anterior** por su identificador.

### 3.4 Lenguaje de las fórmulas

Operadores `+ − * / ( )` y unario `−`. Funciones: `min`, `max`, `abs`, `redondear`, `techo`, `piso`,
`acotar(x, mín, máx)`, `si(condición, a, b)`.

Un **porcentaje se escribe dividiendo**: `tasa / 100`. Es más largo que un operador `%` y es lo que
hace la fórmula auditable por quien no la escribió. El símbolo `%` es el módulo.

Una **división por cero da 0**, no infinito: infinito se propaga a todas las filas de abajo y deja la
pantalla entera sin sentido.

Las fórmulas se **interpretan**, no se evalúan como JavaScript. No es purismo: la fórmula la escribe
un administrador y queda guardada en la configuración del tenant, así que se ejecutaría en el
navegador de **todos** sus usuarios. Con `eval`, el mantenedor de pricing sería una consola remota.

### 3.5 Reglas de validación

El mantenedor **no deja guardar** un catálogo que rompería el giro:

| Se rechaza | Por qué |
|---|---|
| Identificador repetido | Dos conceptos con el mismo nombre: el segundo pisa al primero en el ámbito |
| Identificador que choca con una variable | La fórmula diría una cosa y calcularía otra |
| Referencia a un concepto **posterior** | Daría 0 sin avisar — el error que nadie encuentra mirando la pantalla |
| Variable que no existe | Ídem |
| Fórmula que no parsea | — |
| Catálogo sin ningún concepto `base` | Sin monto anticipo no hay de dónde descontar |

En ejecución, una fórmula rota deja **esa fila en 0 y marcada**, sin reventar la pantalla: el usuario
está mirando una oferta, no un test.

### 3.6 Evidencia

Cada cambio del catálogo va a auditoría con el **diff de fórmulas** —la anterior y la nueva, concepto
por concepto—, no con un «se guardó la configuración». Quien audite un giro raro de hace tres meses
necesita saber con qué fórmula se calculó.

Las operaciones ya simuladas **conservan su versión**: la simulación es evidencia y no se recalcula
sola al cambiar el catálogo (ver la regla de versionado del módulo de líneas).

---

## 4. El cálculo por factura

La simulación entrega cifras de la **operación**, pero el giro se materializa en transferencias
bancarias que ejecuta **Tesorería** —un módulo independiente que este sistema alimenta— y que pueden
repartirse de varias formas. Para poder repartir hay que saber qué le corresponde a **cada factura**:
su diferencia de precio, su parte de la comisión, del IVA, de los gastos y de los descuentos, y con
eso su monto a girar.

> **Regla de oro.** La suma de los montos por documento es **siempre** el total de la operación, en
> todos los conceptos. Es lo que hace el reparto auditable y lo que impide que Tesorería transfiera un
> peso de más o de menos. Todo lo que sigue existe para sostener esa regla.

### 4.1 La diferencia de precio: descuento racional

El valor presente de una factura y su diferencia de precio son:

```
VP_i  = monto_i / (1 + tasa_i/100 × dias_i/30)
dif_i = monto_i − VP_i
```

Es **descuento racional**, no lineal. Con descuento lineal (`monto × i × t`) la cifra sale más alta y
no reconcilia contra la planilla del negocio.

### 4.2 Dos direcciones, porque son dos preguntas distintas

**BOTTOM-UP — la tasa la pone el riesgo de cada deudor** (spread del deudor + costo de fondo). Se
calcula la diferencia de precio de **cada** documento con la tasa de su deudor y su propio plazo, y la
de la operación es la **suma**:

```
difPrecio_operación = Σ dif_i
```

**TOP-DOWN — la tasa la fija el ejecutivo, o viene del último negocio.** Se toma esa tasa única y se
calcula la diferencia de precio de cada documento con **su propio plazo**:

```
dif_i = monto_i − monto_i / (1 + tasaÚnica/100 × dias_i/30)
```

Aquí **no se intenta reconstruir qué tasa tendría cada deudor**. Eso es un problema de optimización
con infinitas soluciones, y resolverlo por aproximación daría cifras que nadie puede explicar ni
defender frente al cliente. La restricción de que los deudores conserven su tasa se **resigna a
propósito**: queda una heurística que cuadra, en vez de un óptimo que no se entiende.

### 4.3 Plazo equivalente y tasa equivalente

Para mostrarle al cliente **una** tasa cuando el cálculo fue bottom-up, se deriva la tasa única que
produce exactamente la misma diferencia de precio sobre el total:

```
peso_i           = dif_i / Σdif                    ← peso en la DIFERENCIA DE PRECIO
plazoEquivalente = Σ (peso_i × dias_i)
tasaEquivalente  = difPrecio / plazoEquivalente × 30 / VP_total       (× 100 para %)
```

**El plazo se pondera por el peso en la diferencia de precio, no en el monto.** No es un detalle: con
dos documentos de MM$100 a 31 y 62 días, ponderar por monto da **46,5 días** y por diferencia de
precio da **52,79**. Sólo la segunda hace que la tasa equivalente reproduzca la diferencia de precio
original, que es lo único que la justifica.

> **Confirmado (12-09-2026).** El enunciado inicial describía el plazo ponderado «por el monto de cada
> factura»; la planilla de referencia lo pondera por el peso de la diferencia de precio. El negocio
> confirmó que manda la planilla.

Verificación con los datos de la planilla:

| Documento | Monto | Tasa | Días | Valor presente | Dif. precio | Peso | Aporte al plazo |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 100.000.000 | 1,00% | 31 | 98.977.235,24 | 1.022.764,76 | 0,297078 | 9,209416 |
| B | 100.000.000 | 1,20% | 62 | 97.580.015,61 | 2.419.984,39 | 0,702922 | 43,581169 |
| **Total** | **200.000.000** | | | **196.557.250,85** | **3.442.749,15** | **1,000000** | **52,790584** |

Tasa equivalente = 3.442.749,15 / 52,790584 × 30 / 196.557.250,85 = **0,995362% mensual**. Aplicada al
total con el plazo equivalente devuelve la misma diferencia de precio.

> La planilla despeja la tasa con los totales **ya redondeados a entero** y obtiene 0,99536204%; la
> implementación usa los valores exactos y obtiene 0,99536209%. Difieren en el décimo decimal y la
> tasa equivalente es informativa, así que se usa la exacta.

### 4.3.1 Precisión: se calcula con 6 decimales y se muestra con 2 y 1

La tasa equivalente y el plazo equivalente se **calculan y se guardan con 6 decimales**, y se
**presentan** con **2 decimales la tasa** y **1 el plazo**.

No es cosmética. Redondear la tasa equivalente a los 2 decimales que se muestran y calcular con ésa
mueve la diferencia de precio: en el ejemplo de la planilla, de 0,995362% a 1,00% son **15.764 pesos**
sobre una operación de MM$200. El resumen dejaría de cuadrar con la suma por documento, que es
exactamente lo que la tasa equivalente existe para garantizar.

**La tasa que el ejecutivo edita es el override.** Mientras no toque el campo, el resumen usa la tasa
equivalente exacta del bottom-up. En cuanto la cambia, el cálculo pasa a **top-down** con la tasa que
él escribió (§4.2).

### 4.4 El resto de los conceptos: siempre top-down

Comisión, IVA, gastos, descuentos y cuentas por cobrar se determinan **sobre la operación** y se
reparten por el peso en **monto** de cada documento, **sin considerar el plazo**:

```
peso_i     = redondear6(monto_i / Σmonto)
asignado_i = redondear(total_concepto × peso_i)
```

### 4.5 Decimales, orden y variable de ajuste

Los pesos se calculan con **6 decimales** y cada monto asignado se redondea a **entero**. Eso deja un
residuo por documento, y en una operación con muchas facturas chicas los residuos se acumulan: la suma
de las partes **no da** el total. Tres reglas lo resuelven:

1. **El reparto se recorre de la factura más grande a la más chica.**
2. **La factura MÁS GRANDE absorbe el residuo**, de modo que la suma cuadre exactamente. Va a la más
   grande y no a la última por decisión de negocio (12-09-2026), y es además lo robusto: siempre puede
   absorberlo sin cruzar el cero. En la más chica el ajuste podía **superar lo asignado** —en una
   operación de MM$20.000 repartida en 300 documentos quedaba en **−4 pesos**— y una comisión negativa
   no se explica ni se transfiere.
3. **Cada concepto expone su variable de ajuste** (`ajustes[concepto] = { pesos, documento }`): cuántos
   pesos hubo que sumar o restar y en qué documento. Se devuelve en vez de esconderse — si algún día
   son miles de pesos donde deberían ser unidades, es la señal de que el peso o el redondeo están mal,
   y sin el dato nadie lo notaría.

> **El descuadre es estructural, no un defecto.** El peso chileno no tiene decimales, así que el monto
> asignado a cada factura **tiene** que ser un entero. Redondear n veces y sumar no da el total: por eso
> la variable de ajuste es parte del diseño y no un parche.

**Magnitud esperada del ajuste.** Son dos fuentes de error y escalan distinto:

| Fuente | Error por documento | Dónde domina |
|---|---|---|
| Redondeo del monto a entero | ≤ ½ peso | Conceptos chicos: una comisión de $59.479 entre 60 facturas acumula ~30 pesos |
| Redondeo del peso a 6 decimales | ≤ total × 5·10⁻⁷ | Conceptos grandes: el anticipo de una operación de MM$2.000, miles de pesos |

La cota es `n/2 + n × total × 5·10⁻⁷`. Superarla significa que el redondeo dejó de ser el declarado.
Si se quisiera el ajuste acotado a ±1 peso en todos los casos, habría que subir la precisión del peso
o repartir por sumas acumuladas; es un cambio de una línea y una decisión de negocio, no una
limitación del diseño.

### 4.6 El monto a girar por documento

```
descuentos_i = dif_i + Σ (conceptos con rol «descuento»)_i
giro_i       = anticipo_i − descuentos_i
```

Y por la regla de oro, `Σ giro_i = montoGirar` de la operación. Ése es el número que se entrega al
modelo de giro, que decide **cómo** se le hace llegar al cliente y en cuántas transferencias.

---

## 5. Qué NO está resuelto

- **El giro es uno solo.** Hoy el resultado es un único monto. El modelo de entrega —cómo y en cuántas
  partes se le hace llegar al cliente, combinando las formas de giro que el factoring tenga— es una
  funcionalidad aparte, también por tenant, y toma este `montoGirar` y el desglose por factura del §4
  como entrada. La regla de oro se hereda: la suma de las transferencias es el monto a girar.
- **El anticipo parcial descuenta sobre lo financiado**, no sobre el nominal: la base de la diferencia
  de precio es `monto × antic/100`. Con anticipo 100% —el default y el caso de la planilla— la base es
  el nominal y el resultado es idéntico. La planilla de referencia aplica el anticipo después de
  descontar y en su propio resumen lo trata como 100%, así que el caso parcial no está verificado
  contra ella.
- **La retención no tiene fecha de liberación modelada.** Se informa como monto y como condición
  («si las facturas se pagan en la fecha informada»), sin un evento que la libere.
- **Las condiciones originales de una operación** se fijan al abrir la simulación y no se re-leen si
  el tenant cambia sus valores por defecto a mitad de una negociación.
