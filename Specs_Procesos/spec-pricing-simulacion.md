# Pricing y simulación de la operación

**Versión 1.0 · 12-09-2026 · NEX Factoring**

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
| 3 | Diferencia de precio | descuento | `redondear(montoDocs * tasa / 100 * antic / 100)` |
| 4 | Comisión | descuento | `redondear(acotar(montoDocs * pctCom / 100, comMin * UF, comMax * UF))` |
| 5 | Gastos | descuento | `redondear(gastoOp + gastoDoc * cantFacturas)` |
| 6 | IVA | descuento | `redondear(comision * ivaPct / 100)` |
| 7 | Recargos | descuento | `mora` |
| 8 | Descuentos | descuento | `otrosDesc` |
| 9 | Cuentas por cobrar | descuento | `cxc` |
| — | **Retención** | resultado | `redondear(montoDocs * retencionPct / 100)` |

La **diferencia de precio** es el precio del dinero: tasa mensual × plazo × monto financiado. En la
implementación de referencia el plazo va implícito en la tasa mensual pactada; un tenant que quiera
prorratear por días escribe `... * dias / 30` en la fórmula, sin tocar código.

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

## 4. Qué NO está resuelto

- **El giro es uno solo.** Hoy el resultado es un único monto. El modelo de entrega —cómo y en cuántas
  partes se le hace llegar al cliente— es una funcionalidad aparte, también por tenant, y toma este
  `montoGirar` como entrada.
- **El plazo no prorratea la diferencia de precio** en el catálogo base: la tasa mensual pactada ya lo
  incorpora. Queda como fórmula posible, no como comportamiento por defecto.
- **La retención no tiene fecha de liberación modelada.** Se informa como monto y como condición
  («si las facturas se pagan en la fecha informada»), sin un evento que la libere.
- **Las condiciones originales de una operación** se fijan al abrir la simulación y no se re-leen si
  el tenant cambia sus valores por defecto a mitad de una negociación.
