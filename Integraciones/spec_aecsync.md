# Spec — AECSync (Activo A2)

**Propósito:** todas las **cesiones electrónicas** de un cliente: qué documento cedió, a qué **cesionario**, cuándo y por cuánto. Es el único activo que identifica a las **contrapartes de financiamiento** del cliente, y de ahí sale el **mix de financiamiento** (columna SOW del tubo), la detección de competencia, la pérdida por cesión y el bloqueo «cedida a terceros» de una factura candidata.

**Proveedor:** **Datamart** — servicio `AECSync`. Documentación: <https://docs.datamart.cl/#tag/AEC-Sync>.
**Transporte:** stream / notificación push (ver «Envoltorio»), continuo. Consulta **por cliente (cedente)**: la pregunta que el servicio contesta es *todas las cesiones de este RUT, con todos sus cesionarios*.
**Clave del registro:** `RUTEmisor` + `Folio` — ver «Cómo se une con el A1».

> **Lo que este documento NO pudo verificar.** Las rutas HTTP, el esquema de autenticación, la paginación y los límites de tasa **no están cotejados contra la documentación**: `docs.datamart.cl` está bloqueado por la política de red del entorno donde se escribió esto. El **payload** sí es literal —es el que entrega el servicio— y es lo que el pipeline consume. Antes de implementar, cotejar transporte y autenticación contra la doc y completar esta sección.

---

## 1. Campos

Los 22 campos del registro. La columna **Sujeto** es lo que decide quién manda cuando el mismo dato llega por más de una entrega (Levantamiento §5): **el maestro es el activo cuyo sujeto es el del campo.**

### 1.1 De la CESIÓN — sujeto: el acto de ceder. Maestro: **A2**

| Campo | Tipo | Descripción |
|---|---|---|
| `RUTCedente` / `RazonSocialCedente` / `EmailCedente` | string | Quién cede el crédito: el cliente |
| `RUTFactoring` / `RazonSocialFactoring` / `EmailFactoring` | string | **El cesionario.** El campo que ningún otro activo tiene, y del que cuelga todo lo que este activo aporta |
| `FechaCesion` | datetime | Cuándo se cedió. ISO con hora (`2026-06-23T03:01`) |
| `MontoCesion` | number (pesos) | Cuánto se cedió. **Igual o menor** que `MontoDocumento` — ver §3 |

### 1.2 Del DOCUMENTO — sujeto: la factura. Maestro: **A1 · DTESync**

AECSync los **copia** para que una cesión se pueda leer sola, sin ir a buscar el DTE. No son suyos: si discrepan con el A1, manda el A1 y la discrepancia se **registra**, no se corrige en el maestro (Levantamiento §5.2).

| Campo | Tipo | Descripción |
|---|---|---|
| `TipoDTE` / `TipoDTEDesc` | string | Tipo de documento (`33` · Factura electrónica) |
| `Folio` | integer | Folio del documento, correlativo dentro del emisor |
| `FechaEmisionDTE` | date | Emisión del documento |
| `MontoDocumento` | number (pesos) | Total del documento — el `MntTotal` del A1 |
| `RUTEmisor` | string | Quién emitió el documento |
| `RUTReceptor` / `RazonSocialReceptor` / `EmailReceptor` | string | El deudor |
| `FechaVencimientoCesion` | date | Vencimiento del crédito cedido, o sea el del documento |

### 1.3 Envoltorio de la notificación — sujeto: la entrega

| Campo | Tipo | Descripción |
|---|---|---|
| `ReceptorElectronico` | boolean | Si el receptor opera con DTE electrónico |
| `Servicio` | string | `AECSync` |
| `Notificacion` | string | Tipo de evento (`AEC_SINCRONIZADO`) |
| `Extras` | object | Campos adicionales del servicio. Hoy vacío |

La tripleta `Servicio` / `Notificacion` / `Extras` es el envoltorio de un **evento push**, no de una respuesta a una consulta: el activo llega empujado a medida que el registro electrónico sincroniza las cesiones. Eso es lo que lo separa de las cinco entregas SFTP, que son batch diario.

---

## 2. Cómo se une con el A1

El documento se identifica por **`RUTEmisor` + `Folio`**, no por `RUTCedente` + `Folio`.

En la operación normal los dos RUT coinciden —quien emitió la factura es quien la cede— y en la entrega actual coinciden en **1.300 de 1.300**. Pero son cosas distintas y pueden separarse: en una **re-cesión** el cedente es el factor que compró el documento, no quien lo emitió. Unir por el cedente en ese caso no encuentra el documento, y una factura sin documento es exactamente el estado que este activo dejó de tener el 14-09-2026 (ver §4).

---

## 3. Invariantes del activo

Se validan **en el origen** —`GeneradorDatos/datasets/cesiones.js` para la entrega sintética— y una cesión que los rompa no se emite. Es el único punto donde todavía se pueden arreglar: un consumidor que reciba `MontoCesion > MontoDocumento` no tiene con qué.

1. **`FechaCesion` ≥ `FechaEmisionDTE`.** No se cede una factura que todavía no se emitió.
2. **`MontoCesion` ≤ `MontoDocumento`.** La **cesión parcial** es válida —se cede parte del crédito y el resto queda con el cliente, hoy 160 de 1.300— pero ceder más sería transferir un crédito que no existe. La cota «o menor» hay que **ejercitarla**: mientras todas las cesiones fueron por el total exacto, el invariante se cumplía sin que nada lo probara, y con él se escondían dos huecos —el del dato y el de la regla O06 del motor de otorgamiento, que no existía—.
3. **Un documento se cede UNA vez.** Dos cesiones del mismo folio serían dos dueños del mismo crédito, que es justamente lo que el registro electrónico existe para impedir.
4. **Sólo documentos cedibles:** a crédito, sin nota de crédito y sin reclamo.
5. **`MontoDocumento` es el `MntTotal` del A1**, y el resto de los campos de §1.2 también. El activo no puede contradecir al documento que dice ceder.

---

## 4. Reconciliación con el A1 — cerrada el 14-09-2026

El activo traía folios propios: de **1.300 cesiones sólo 3** referenciaban un folio que el A1 declara para ese mismo cedente, y **1.267** tenían fecha anterior a la emisión del documento que decían ceder. Una cesión sin documento no se puede atribuir a nada, así que todo lo que cuelga de ella terminaba inventándose aguas abajo: el bloqueo «cedida a terceros» salía de un hash del folio, la pérdida ante la competencia de un sorteo, y el conteo de facturas cedidas quedaba siempre en cero.

Hoy las 1.300 reconcilian. **Se arregló en el origen y no en la aplicación a propósito:** si el consumidor «resolviera» la discrepancia, volvería a inventar el dato.

---

## 5. El padrón de cesionarios

AECSync identifica al cesionario pero **no dice de qué tipo es** — no es un dato del SII sino del mercado. Ese padrón es nuestro (`GeneradorDatos/lib/cesionarios.js`, espejado en el fuente) y clasifica cada cesionario **por RUT**:

- **`banco`** — es un banco o la filial de factoring de un banco. **AECSync registra las cesiones bancarias y las no bancarias**, así que esta partición se mide y no se supone.
- **`target`** — de los bancarios, los que se miran de frente (BCI · Banco de Chile · Itaú). Es política **comercial del tenant**, no una propiedad del cesionario.
- **`nuestro`** — Factoring Security: cartera propia, no competencia.

**La identidad es el RUT, no el nombre.** Clasificar por trozo de razón social puso a **Eurocapital** entre los factoring de banco —«eurocap·**ita**·l» contiene el «ita» con que se buscaba «Itaú»— y con el mix midiéndose sobre esta clasificación eso no es un KPI torcido sino una porción entera mal atribuida. Un cesionario que el padrón no declara cae en «otros factoring» —el balde conservador— y la corrida lo **informa**: es un padrón desactualizado, y en silencio se ve igual que un dato correcto.

---

## 6. Qué consume

| Consumidor | Qué usa |
|---|---|
| **Mix de financiamiento** (columna SOW del tubo) | El reparto por cesionario, medido por `MontoCesion`. Se mide acá y se **inyecta en el A11**, que es de donde la pantalla lo lee (Levantamiento §5.6) |
| Bloqueo de una factura candidata | «Cedida a terceros» con el nombre del factoring y la fecha, o «Ya financiada» si la cesión fue a nosotros; y «Cedida en parte · por X de Y» cuando es parcial |
| Pérdida por cesión de una oportunidad | Las facturas de ESA oferta que se llevó otro, y quién |
| **O06** del motor de otorgamiento | `MontoCesion` contra `MontoDocumento`, documento a documento |
| A11 · Plataforma 360 | Colocación promedio 12m y fecha de primera operación, medidas sobre las cesiones a nosotros |
| Prospección | `CESIONARIOS_MERCADO`: un candidato por definición no nos cede |

---

## 7. Ejemplo

`aecsync_notificacion.json` al lado de este archivo trae el registro tal como llega.
