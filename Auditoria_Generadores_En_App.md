# Auditoría — ¿queda algún generador de datos dentro del pipeline?

**Fecha:** 14-09-2026 · **Alcance:** `pipeline_comercial.jsx` completo.
**Regla que se audita** (`GeneradorDatos/README.md`): *el pipeline no genera datos: los lee y los procesa.*

**Respuesta corta:** los **motores de decisión** están limpios; el **resto de la aplicación no**. Quedan
cuatro activos de información declarados que la app se fabrica en runtime, más tres variables sueltas del
catálogo de otorgamiento y una reaparición del invento de línea que ya se había corregido.

---

## 1. Lo que sí quedó limpio

### Motor de otorgamiento — 74 de 77 variables

Cruzando **todas** las variables que evalúa el catálogo vivo (C01–C52 / D01–D23 / O01–O04) contra su origen:

| Origen | Variables | |
|---|---|---|
| Activo **A16** (`window.OTORGAMIENTO`) | **70** | buró, mora interna, TGR, comportamiento comercial, notas |
| Derivadas del maestro de líneas y del monto de la operación | 4 | `carteraVig`, `mntLinea`, `clienteNuevo`, `mntSimulacion` |
| **Generadas en la app** | **3** | ver §2.1 |

### Predictor de verificación — 10 de 10

Todas del activo **A10** (`window.VERIFICACION`) desde el 14-09-2026. V03, V04 y V09 son razones contra el
monto del documento: el activo trae el denominador y NEX calcula la razón.

### Líneas de crédito — del maestro

`lineaDeCliente` / `lineaCreditoDe` leen sólo `LINEA_DISPONIBLE` (más el overlay de lo que el comité
constituye en sesión). Es lo que cerró INC-11.

### Generadores legítimos — estado de demo, no datos

No son hallazgos: no describen al negocio, mueven la demo.

- `generarStream` — motor de llegada de facturas al inbound.
- `simular` — cálculo de la oferta (tasa, anticipo, giro). Es una **regla**, no un dato.
- `dashSerie` — forma del sparkline alrededor de un valor real.
- Estado de la verificación telefónica (Completada / En curso / Pendiente).

---

## 2. Lo que sigue inventando

### 2.1 · O01–O03 del catálogo de otorgamiento — moneda al aire

```js
// pipeline_comercial.jsx:8288  (varsModeloExt)
// O01–O03 NO viajan en el A16: se derivan de la simulación de la oferta (spec §9).
spreadBajoBanda: r() < 0.08, comisionBajoMin: r() < 0.07, cxcSinAplicar: r() < 0.06,
```

El comentario afirma una derivación **que no ocurre**: son tres monedas al aire. Y sí son derivables — la
operación ya tiene su spread, su comisión y su piso de deudor, y el A16 trae `CXC_PENDIENTES`.

**Severidad: alta.** Son reglas del catálogo que deciden excepciones. Además el comentario miente, que es
peor que el dato: quien lo lea va a creer que el motor ya evalúa la oferta real.

> ✅ **CORREGIDO el 14-09-2026.** Se agrega `varsOperacion(deal, A)`, que las deriva de la operación:
> **O01** compara la tasa aplicada contra la tasa de referencia —spread de riesgo de cada deudor topado
> por su piso, más el costo de fondo, ponderado por monto— con la **misma** escalera de atribución que usa
> el panel de condiciones (`evalAtribucion`); **O02** compara la comisión contra el mínimo de la política
> (2 UF); **O03** compara lo aplicado de CxC contra el mínimo sobre las `CXC_PENDIENTES` del A16, con el
> 30% pasado a política (`cxcAplicaMinPct`) en vez de incrustado.
>
> Cambia el comportamiento y conviene saberlo: O01 y O02 dejan de dispararse solos. Sin simulación no hay
> precio que juzgar, y una oferta a la tasa de referencia con la comisión por defecto (200.000 sobre un
> mínimo de 76.000) no levanta nada. Sólo excepcionan cuando el ejecutivo **negocia** bajo la banda, que
> es lo que la regla dice. O03 pasa a excepcionar el **10,6%** de los clientes: los que tienen CxC
> pendientes en el A16 y no aplican el mínimo.

### 2.2 · A11 · Plataforma 360 — activo declarado, generado en runtime

`api4Empresa360` (`:14130`) fabrica con un hash del RUT la firmográfica (actividad, sector, dotación,
fechas), la comercial (quintil, márgenes, colocación promedio 12 m, spread real, segmento, jefe de grupo),
los **socios** (RUT, participación, PEP, FATCA) y los índices (patrimonio, leverage, ventas, ventas SII).

Existen `Integraciones/spec_sftp_plataforma360.md` y su CSV de muestra: el contrato está escrito, el
dataset no. **Alimenta el paso 2 del wizard de comité y el resumen de empresa** — o sea, la presentación
sobre la que el comité decide una línea.

**Severidad: alta.**

### 2.3 · A9 · API Riesgo Crédito BICE — activo declarado, generado en runtime

`api6RiesgoBICE` (`:14167`) fabrica deuda directa e indirecta, mora CMF, ACHEF (empresas, vigente, morosas,
facturas), boletín comercial, deuda previsional, protestos, clasificación deudora y morosidad interna.

Hay un swagger con nueve endpoints (`swagger_riesgo BICE.yaml`). Peor que la ausencia del dataset: estas
variables **ya existen en el A16** con otros números. La misma empresa puede mostrar una mora CMF en el
otorgamiento y otra distinta en la presentación al comité.

**Severidad: alta** — no es sólo dato inventado, es dato inventado que **contradice** al activo bueno.

### 2.4 · A12 · Repositorio documental (API 5)

`api5Documentos` (`:14162`) genera el listado de documentos de la carpeta (tipo, nombre, año, versión,
usuario, creación, vencimiento). Activo declarado, sin dataset. **Severidad: media.**

### 2.5 · Usuarios y Apoderados de la Empresa

`apoderadosDeEmpresa` / `usuariosDeEmpresa` (`:2537`, `:2545`) generan los contactos, sus cargos y el flag
APODERADO. Tiene spec propia (`Specs_Procesos/Spec_API_Usuarios_Apoderados_Empresa.pdf`).

Importa porque **C57 evalúa `apoderados`** (poderes suficientes para autorizar la operación), y ese valor
sale hoy de `yn(0.92)` en `apiVarsCliente`, no de esta tabla. **Severidad: media.**

### 2.6 · A20 · Libro de ventas — inventa en vez de consultar DTESync

`genFacturasCliente` (`:7015`) lo dice en su propio comentario:

> *SERVER-SIDE: es `query libroVentas(rutCedente)` sobre los DTE del SII.*

…y acto seguido inventa entre 6 y 13 facturas con deudores sacados de `BUENOS_PAGADORES`. **El dato existe**:
`window.DTESYNC` tiene las 30.000 facturas reales del cedente. Lo mismo `candidatasLibro` (`:2276`) y
`genFacturasIncorporar` (`:7047`).

**Severidad: media.** No decide nada por sí solo, pero el libro que ve el ejecutivo no corresponde a las
facturas que el inbound está procesando para ese mismo cliente.

### 2.7 · Plan Mensual — el invento de línea que INC-11 ya había corregido

```js
// pipeline_comercial.jsx:13443  (ptmSignals)
const lineaAprob = Math.round(c.vol * (0.5 + r() * 0.7));
const lineaUso   = Math.round(lineaAprob * (0.3 + r() * 0.6));
const moraDias   = r() < 0.22 ? 5 + Math.floor(r() * 60) : 0;
```

Es **exactamente** el patrón que documentó INC-11 —tres inventos paralelos de la línea de crédito—
sobreviviendo en el módulo de Plan Mensual, que no se tocó al corregirlo. El Plan le muestra al ejecutivo
una línea aprobada, utilizada y disponible que **no es la del maestro**.

**Severidad: alta.** Es una contradicción visible entre dos vistas de la misma aplicación.

> ✅ **CORREGIDO el 14-09-2026.** `ptmSignals` lee `lineaDeCliente` —el maestro más lo que el comité haya
> constituido— igual que Líneas y el otorgamiento. La mora sale del A16: la tabla trae montos por tramo
> de mora interna, no días, así que el peor tramo con saldo define los días (`moraDiasCliente`). El chip
> "En observación" sin mora pasa a significar algo: cliente bloqueado o con juicios en el A16.
>
> `emitioBuenos` y `cedioComp` también se **miden**: el primero sobre DTESync (¿emitió a deudores de lista
> o autorizados?), el segundo sobre AECSync (¿cedió a un factoring que no es el nuestro?), reusando el
> índice que ya existía. `compRapida` y `tasaNoComp` se eliminan: eran dos monedas al aire que **nadie
> leía** — se devolvían y ningún consumidor las usaba.
>
> De paso, `filaLineaCliente` (vista de Líneas) tenía las mismas dos señales generadas con su propio hash:
> ahora lee las mismas que el Plan, así que las dos vistas no pueden contradecir al mismo cliente.

### 2.8 · Descuentos de la operación

`descuentosDeal` (`:3949`) genera los documentos con mora y las cuentas por cobrar que se descuentan del
giro, con montos y folios inventados. El A16 ya trae `CARTERA_MOROSA` y `CXC_PENDIENTES` del cliente.
**Severidad: media** — son pesos que se le descuentan al cliente.

### 2.9 · Histórico de operaciones cursadas

`OP_SINTETICAS` (`:13708`) y `facturasDeOp` (`:13734`) generan las operaciones ya cursadas y su apertura en
facturas, con su cobranza. No hay activo declarado para esto. **Severidad: baja**, pero es el histórico de
colocación sobre el que se calculan métricas del dashboard.

---

## 3. Resumen

| # | Qué | Activo | Severidad |
|---|---|---|---|
| 2.1 | ~~O01–O03 del catálogo por moneda al aire~~ | — (derivable) | ✅ **Cerrado** 14-09 |
| 2.2 | Plataforma 360 | A11 | **Alta** |
| 2.3 | Riesgo Crédito BICE — contradice al A16 | A9 | **Alta** |
| 2.7 | ~~Línea inventada en el Plan Mensual~~ | A7/A8 (ya existe) | ✅ **Cerrado** 14-09 |
| 2.4 | Repositorio documental | A12 | Media |
| 2.5 | Usuarios y apoderados | spec propia | Media |
| 2.6 | Libro de ventas inventado teniendo DTESync | A20 / A1 | Media |
| 2.8 | Descuentos de la operación | A16 (parcial) | Media |
| 2.9 | Histórico de operaciones cursadas | — | Baja |

**Orden sugerido.** ~~Primero 2.7 y 2.1~~ — **hechos el 14-09-2026**: eran contradicciones internas y se
arreglaron sin dataset nuevo, leyendo el maestro y el A16 que ya existían y derivando de la simulación.
Sigue **2.3 antes que 2.2**, los dos activos declarados que alimentan la decisión del comité, y 2.3 primero
porque además contradice al A16. El resto puede ir por tamaño.

Con 2.1 cerrado, el catálogo de otorgamiento queda en **73 variables del A16 o derivadas de un activo y 4
derivadas de la operación**, sin ninguna generada.
