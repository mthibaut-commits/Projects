# Modelo de giro · asignación de giros

**Versión 1.0 · 12-09-2026 · NEX Factoring**

Cómo se le entrega el dinero al cliente: en cuántas partes y de qué tipo. Es el último eslabón del
pipeline comercial — toma el **monto a girar** y su desglose por factura (spec de pricing §4) y
produce lo que **Tesorería** va a transferir.

> **Regla de oro.** La suma de los montos por tipo de giro es **siempre** el monto a girar de la
> operación. Un peso que no cae en ningún tipo es un peso que nadie transfiere.

---

## 1. Dónde encaja

El giro **siempre** se materializa en una transferencia bancaria que ejecuta **Tesorería**, un módulo
independiente al que este sistema sólo le entrega el resultado. El pipeline comercial no transfiere:
decide cuánto va por cada tipo y lo publica.

```
simulación → monto a girar → prorrateo por factura → ASIGNACIÓN DE GIROS → Tesorería
```

---

## 2. Los tipos de giro

| Código | Tipo | Califica |
|---|---|---|
| **GE** | Giro Express | La verificación la dio por **no necesaria** **y** el otorgamiento **no** dejó marcas de excepción — ni del cliente ni del deudor |
| **GN** | Giro Normal | Todo lo demás |

**Express exige las dos condiciones a la vez; basta que falle una para caer en Normal.** Eso incluye
la factura verificada cuyo deudor arrastra una excepción, y la factura sin excepciones cuyo deudor
quedó por verificar.

> **Supuesto explícito.** El enunciado de negocio describe GN como «por verificar **y** con marcas de
> excepción». Se implementó como **disyunción**: si fuera conjunción, una factura por verificar y sin
> excepciones no calificaría en ningún tipo y la regla de oro se rompería. Pendiente de confirmar.

**Qué cuenta como marca de excepción:** las del motor de otorgamiento que admiten resolución —
`excepcion` (excepcionable, alguien la puede visar) y `rechazado` **re-evaluable** (se levanta
regularizando la variable). Un **rechazo firme** no es una marca: esa operación no se cursa, así que
no llega a discutir de qué tipo es su giro.

### 2.1 El catálogo es una lista, no dos constantes

Security opera hoy con dos tipos y el modelo admite más **sin tocar el motor**: un tipo es una fila
con su código, su orden y su criterio declarativo. El orden es la prioridad — gana el primero que
califica — y el último lleva `resto: true`, que recoge lo que no calificó en ninguno. Sin ese último,
una factura podría quedar sin tipo y la suma dejaría de cuadrar.

Un criterio sólo puede pedir **hechos que el modelo declara** (`verificado`, `sinExcepcionCliente`,
`sinExcepcionDeudor`, `sinPrimeraOperacion`). Uno que pida cualquier otra cosa no lo cumple nadie y su
tipo queda vacío: es deliberado, para que un catálogo mal escrito se note en vez de desviar plata en
silencio.

---

## 3. La calificación es POR DEUDOR

Se determina mirando la factura, pero **califican todas las facturas del deudor**: los dos motores de
los que depende deciden por deudor —una llamada de verificación cubre todas sus facturas, y una
excepción de otorgamiento es del par cliente-deudor—, así que una factura no puede calificar distinto
que sus hermanas.

El motor lo hace explícito en dos pasos: califica el **deudor**, y después cada factura hereda el tipo
del suyo.

Las condiciones del **cliente** —sus marcas de excepción, y si es su primera operación— entran igual
en el bloque de hechos de cada deudor. Así el criterio de un tipo se evalúa contra un solo objeto y un
tipo nuevo puede mezclar condiciones de los dos niveles.

---

## 4. La primera operación va completa a Giro Normal

La primera operación de un cliente se cursa contra la **línea inicial LF1** (MM$30, sólo deudores
Prime) y **todas sus facturas se verifican** — eso lo decide la **regla 0 del modelo de verificación**,
no este modelo. La consecuencia aquí es aritmética: si ninguna factura está verificada, ninguna
califica para Express y el monto completo va a **GN**.

El modelo declara igual `sinPrimeraOperacion` como condición de Express, aunque sea redundante con la
regla 0. No es duplicar la regla: es poder **explicar** el resultado sin reconstruirlo —«primera
operación del cliente, por eso no hay Express»— en vez de dejar al ejecutivo deduciendo por qué su
cliente no tiene Giro Express.

El estado del cliente (`nuevo` · `activo` · `suspendido` · `eliminado`) lo devuelve una **API de
Security** al iniciar sesión; sólo `nuevo` es primera operación.

---

## 5. Cuándo se calcula y cuándo se congela

- Se **recalcula en cada reevaluación** de la oportunidad, porque depende del resultado de los dos
  motores y esos cambian: retirar una factura no confirmada, visar una excepción o agregar documentos
  mueve la clasificación.
- Queda **FIJO cuando el cliente acepta**. Desde ahí los montos de cada tipo son un compromiso, y lo
  que ocurra después es resorte de los módulos posteriores al pipeline comercial. Congelarlo es además
  lo único que evita que una reevaluación posterior mueva una cifra que Tesorería ya tomó.

La asignación congelada **gana siempre** sobre el cálculo del día.

---

## 6. Desacoplamiento

El motor **no llama** al de verificación ni al de otorgamiento: recibe sus veredictos ya calculados.
Tres razones, y las tres son la misma:

- en producción esto corre en el **servidor**, junto al resto de las decisiones que mueven plata;
- los dos motores de los que depende ya son puros y reciben su estado por parámetro, así que
  encadenarlos aquí habría reintroducido las lecturas globales que costó sacar;
- y un test puede **contradecir al navegador** —inyectar «este deudor está verificado» aunque el
  predictor diga lo contrario—, que es la única forma de probar que decide con lo que le pasan.

Un **adaptador** aparte (`girosDeDeal`) es el único que conoce a los tres motores a la vez y arma la
entrada. En la auditoría de aislamiento el motor sale limpio (sólo su propio catálogo) y el adaptador
arrastra lo que arrastran los motores que consulta, que es exactamente su trabajo.

### 6.1 Contrato

**Entrada**

| Campo | Qué es |
|---|---|
| `facturas` | `[{ id, deudor, giro }]` — el monto a girar **ya prorrateado** por factura |
| `verificado` | `{ [deudor]: bool }` — veredicto del motor de verificación |
| `excepcionDeudor` | `{ [deudor]: bool }` — marcas del otorgamiento, por deudor |
| `excepcionCliente` | `bool` — marcas del otorgamiento, del cliente |
| `primeraOperacion` | `bool` — estado del cliente |
| `montoGirar` | El total de la operación, para comprobar el cuadre |

**Salida**: los montos y las facturas por tipo, la fila de cada factura con su tipo y los hechos que
lo explican, el cuadre (`cuadra`, `descuadre`) y un `motivo` en una línea cuando la operación completa
quedó en un tipo por una condición del cliente.

El cuadre **se comprueba y se informa; no se fuerza**. Si no cuadra, el que está mal es quien armó la
entrada —los montos por factura salen del prorrateo, que ya cuadra por construcción— y taparlo aquí
con un ajuste escondería el error en el sitio equivocado.

---

## 7. Qué NO está resuelto

- **Las tres formas de giro.** El enunciado menciona que Security tiene **tres formas combinables**
  de entregar el dinero, y define **dos tipos** (GE y GN). El catálogo está preparado para el tercero
  —es una fila más— pero falta su criterio.
- **No hay pantalla todavía.** El modelo y su congelado existen; falta mostrar la asignación en el
  detalle de la operación y en el resumen del curse.
- **La entrega a Tesorería** no está modelada: falta el contrato de salida (qué se le publica, cuándo,
  y con qué idempotencia).
