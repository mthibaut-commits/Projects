# Spec — sftp_otorgamiento.csv (Activo A16)

**Propósito:** variables del **Modelo de Riesgo v1.0** para evaluar el catálogo de otorgamiento **C01–C52 (cliente)**, **D01–D23 (deudor)** y **O01–O04 (operación)**. Monta la sección OTORGAMIENTO de la **tabla interna**; el motor de NEX evalúa localmente los tramos (risk tiers) y niveles (N1..N5 / Comité) contra esta tabla, sin recalcular nada en origen.
**Transporte:** SFTP · `/in/otorgamiento/` · `OTORGAMIENTO_AAAAMMDD.csv` · diaria · UTF-8 · separador `;` · con header. **Intradía:** upserts vía API **A22** (dominio `OTORGAMIENTO`, mismos nombres de campo). Full-replace diario + upserts.
**Unidades:** montos en **pesos** salvo sufijo `_MM` (millones) o `_M` (miles); porcentajes 0–100; booleanos 1/0; fechas ISO `AAAA-MM-DD` (o `AAAAMM` para IVA).

---

## 1. Modelo de filas: una fila por (RUT, ROL, RUT_CONTRAPARTE)

La clave primaria es **`RUT` + `ROL` (+ `RUT_CONTRAPARTE`)**. Cada entidad de la política se entrega como una fila con un `ROL`:

| ROL | RUT | RUT_CONTRAPARTE | Qué variables porta | Reglas |
|---|---|---|---|---|
| **CLIENTE** | RUT del cedente | *(vacío)* | Perfil de riesgo y comportamiento del **cliente** | C01–C52, y las variables base de O01–O04 |
| **DEUDOR** | RUT del deudor (pagador) | RUT del **cliente** con quien opera | Perfil de riesgo del **deudor** + variables del **par cliente-deudor** | D01–D23 |

- Una operación puede tener **varios deudores** ⇒ se entrega **una fila `DEUDOR` por cada par (cliente, deudor)**. El mismo deudor con dos clientes distintos son dos filas (distinto `RUT_CONTRAPARTE`).
- Las columnas de moras/bureau (CMF, Equifax, ACHEF, infracciones, mora interna) y `NOTA_COMPORTAMIENTO` son **compartidas**: en una fila `CLIENTE` describen al cliente (C10–C26); en una fila `DEUDOR` describen al deudor (D01–D17). El `ROL` define de quién son.
- Las columnas de **comportamiento comercial** (`NOTA_CREDITO_PCT`, `RECLAMO_PCT`, `VENTA_CRUZADA_PCT`) son del **cliente** en fila CLIENTE (C34–C36) y del **deudor** en fila DEUDOR (D19–D20). Las variables del **par C-D** (D21–D23) van en columnas propias `*_CD_PCT` (ver §3) y en `SOCIOS_COMUNES_CD` (D18), siempre en la fila `DEUDOR`.
- **TGR** (C27–C32) y **endeudamiento factoring / cartera del cliente** (C37–C46) son sólo del **cliente** (fila CLIENTE). La **cartera del par** (C47–C50) va en columnas propias `*_CD` de la fila `DEUDOR`: son las gemelas de C40–C43 medidas contra ese deudor, y se evalúan **una vez por deudor** como las D (ver §2).

## 2. Evaluación por deudor y visado

- El motor arma el set de variables del cliente `vCli` (fila CLIENTE) y, para **cada** fila `DEUDOR` ligada a ese cliente, sobrepone el bloque del deudor (columnas de la fila DEUDOR) y evalúa **una vez por deudor** las reglas **D01–D23** y **C47–C50** (cartera del par). El resto de las C y las O se evalúan una sola vez.
- El resultado es una lista de ítems **(regla × deudor)**. La clave de estado/visado (`stKey`) es:
  - **Cliente / Operación:** `stKey = "<n>"`  (ej. `"117"` = C17, `"301"` = O01).
  - **Deudor / par C-D:** `stKey = "<n>@<rut_deudor>"`  (ej. `"202@88390200-9"` = D02 del deudor 88390200-9; `"147@77250120-4"` = C47 del par con ese deudor).
- El **visado** (aprobación/rechazo de cada excepción por el apoderado con atribución) se registra **independiente por (operación, stKey)**: estado `aprobado | rechazado | pendiente` + respaldo (comentario, adjunto, quién, fecha). La bandeja agrupa las reglas D en un bloque **por deudor** (razón social + RUT).
- Estado agregado de la operación: **aprobada** / **sujeta a excepción** / **rechazada**. Un bloqueo firme de deudor (D02–D13) hace perder la operación igual que un knockout de cliente (C30–C32 TGR).

---

## 3. Diccionario de campos

| Campo | Reglas | ROL que lo porta | Descripción |
|---|---|---|---|
| RUT | — | ambos | RUT de la entidad de la fila (cliente o deudor) |
| ROL | — | — | `CLIENTE` \| `DEUDOR` |
| RUT_CONTRAPARTE | — | DEUDOR | En fila DEUDOR: RUT del cliente del par. Vacío en fila CLIENTE |
| PAGARE_FIRMADO / MNT_PAGARES_M / FCH_VCTO_PAGARE | C01–C03 | CLIENTE | Pagaré: existencia, monto suficiente (cartera+simulación), vigencia (60d post últ. vcto.) |
| IVA_ULT_PERIODO (AAAAMM) | C04 | CLIENTE | Información financiera al día (≤ 2 meses) |
| LINEA_APROBADA_MM / LINEA_EXTENDIDA | C05–C07 | CLIENTE | Línea vigente, extensión por Riesgo (N4), cupo (excedente ≤10% N2 / >10% N4) |
| VAR_VENTA_MENSUAL_PCT | C08 | CLIENTE | Variación de venta vs promedio L6M (−20 / −40) |
| NOTA_COMPORTAMIENTO | C09 / **D01** | CLIENTE = cliente · DEUDOR = deudor | Nota de comportamiento 1–5 (umbral 3,7 → N4) |
| CMF_DIR_MOROSA_30_90 / 90_180 / 180_3A | C10–C12 / **D02–D04** | CLIENTE / DEUDOR | Mora directa CMF por tramo. Escala combina monto (MM$5/MM$10) y % del total (5%/10%) |
| CMF_DIR_CASTIGADA | C13 / **D05** | CLIENTE / DEUDOR | Deuda castigada directa CMF |
| CMF_IND_VENCIDA / CMF_IND_CASTIGADA | C14–C15 / **D06–D07** | CLIENTE / DEUDOR | Deuda indirecta CMF vencida / castigada |
| CMF_LEASING_MOROSA | C16 / **D08** | CLIENTE / DEUDOR | Mora de leasing CMF |
| CMF_DEUDA_TOTAL | denom. C10–C16 / **D02–D08** | CLIENTE / DEUDOR | Deuda directa CMF **total** (denominador de la concentración %) |
| EFX_DEUDA_MOROSA / EFX_PROTESTOS | C17–C18 / **D09** | CLIENTE / DEUDOR | Equifax (DICOM): mora / protestos (escala MM$5) |
| ACHEF_MOROSA_60_90 / 90_180 / MAS_180 | C19–C21 / **D10–D12** | CLIENTE / DEUDOR | Moras ACHEF por tramo (escalas MM$25 / MM$50) |
| INFRACCIONES_LABORALES_12M | C22 / **D13** | CLIENTE / DEUDOR | Infracciones laborales 12m (escala MM$10 / 25 / 50) |
| MORA_INTERNA_MAS_25D / 30_90 / 90_180 / 180_3A | C23–C26 / **D14–D17** | CLIENTE / DEUDOR | Mora en cartera propia (con la factoring) por tramo |
| DEUDA_INTERNA_TOTAL | denom. C24–C26 / **D15–D17** | CLIENTE / DEUDOR | Deuda interna **total** (denominador de la concentración %) |
| TGR_VIGENTE / TGR_MOROSA / TGR_COBRANZA_ADM | C27–C29 | CLIENTE | TGR último mes (deuda vigente / morosa / cobranza administrativa) |
| **TGR_COBRANZA_JUD / TGR_CONVENIOS / TGR_CONVENIOS_CUOTAS_IMPAGAS** | C30–C32 | CLIENTE | **HARD_BLOCK**: > 0 ⇒ rechazo firme no excepcionable (pérdida terminal) |
| CONCENTRACION_VENTA_PCT | C33 | CLIENTE | Concentración de venta del cliente (umbral 50) |
| VENTA_CRUZADA_PCT | C34 | CLIENTE | Venta cruzada del cliente |
| NOTA_CREDITO_PCT | C35 (CLIENTE) / **D19** (DEUDOR) | CLIENTE = cliente · DEUDOR = deudor | Tasa de notas de crédito (umbral 8 / 8–30 / >30) |
| RECLAMO_PCT | C36 (CLIENTE) / **D20** (DEUDOR) | CLIENTE = cliente · DEUDOR = deudor | Tasa de reclamos (umbral 3 / 3–20 / >20) |
| **VENTA_CRUZADA_CD_PCT** | **D21** | DEUDOR | **Par cliente-deudor:** venta cruzada (≤30 OK / 30–60 N1c / >60 N2c) |
| **NOTA_CREDITO_CD_PCT** | **D22** | DEUDOR | **Par cliente-deudor:** tasa de notas de crédito (≤8 / 8–30 / >30) |
| **RECLAMO_CD_PCT** | **D23** | DEUDOR | **Par cliente-deudor:** tasa de reclamos (≤3 / 3–20 / >20) |
| RATIO_CESION_VENTA_PCT / NRO_FACTORINGS_LM / FACTORING_PEQUENO_PCT | C37–C39 | CLIENTE | Endeudamiento factoring (50–80 / 3–8 / 35) |
| CARTERA_RECLAMADA / CARTERA_NC / CARTERA_MOROSA / CXC_PENDIENTES | C40–C43 | CLIENTE | Gestión de cartera del **cliente**: documentos reclamados / con NC / en mora y CxC pendientes (excepción N1 Comercial) |
| **CARTERA_RECLAMADA_CD / CARTERA_NC_CD / CARTERA_MOROSA_CD / CXC_PENDIENTES_CD** | **C47–C50** | DEUDOR | **Par cliente-deudor:** las mismas cuatro medidas contra **este** deudor (excepción N1 Comercial). Una fila por par ⇒ el visado es por deudor |
| SOCIOS_COMUNES_CD | **D18** | DEUDOR | Par: cliente y deudor comparten socios (empresas relacionadas) ⇒ N5 |
| CLIENTE_BLOQUEADO | **O04** | CLIENTE | Bloqueo vigente (comercial/operativo/cobranza) al curse |
| JUICIOS_GESINTEL | C52 | CLIENTE | Informativo |
| FECHA_CORTE | — | ambos | Fecha de generación del snapshot |

> **Nuevo en esta versión (par C-D):** `VENTA_CRUZADA_CD_PCT`, `NOTA_CREDITO_CD_PCT`, `RECLAMO_CD_PCT`. Antes las variables del par se confundían con las del deudor/cliente en las columnas `*_PCT`. Ahora D19–D20 (deudor) y D21–D23 (par) tienen columnas distintas, ambas en la fila `DEUDOR`.
>
> **Nuevo (11-09-2026, cierre de INC-04):** `CARTERA_RECLAMADA_CD`, `CARTERA_NC_CD`, `CARTERA_MOROSA_CD`, `CXC_PENDIENTES_CD`. Las cuatro reglas C47–C50 estaban en la política y **no estaban implementadas**: el motor corría 75 de las 79. Se miden por par porque es donde el deterioro se ve: un cliente con la cartera global limpia puede arrastrar reclamos, notas de crédito o mora con un solo deudor, y agregado al cliente eso se diluye hasta desaparecer. Viajan en la fila `DEUDOR` —una por par (cliente, deudor)— y **no** en la fila `CLIENTE`, que ya porta el agregado en las `CARTERA_*` a secas.

Variables de **operación** (O01–O03: spread bajo banda, comisión/gastos bajo mínimo, CxC sin aplicar) **no** viajan en este archivo: se derivan de la **simulación** de la oferta en NEX (condiciones comerciales del ejecutivo) y se evalúan contra las bandas de atribución. `O04` sí usa `CLIENTE_BLOQUEADO`.

---

## 4. Niveles y re-evaluación

- **Niveles:** política N1..N5, **N5 = máxima**, sin transformación. La homologación `nivelMod = 6 − N` **se retiró** (INC-01, 11-09-2026): invertía la escala y mandaba una excepción N1 —un pagaré sin firmar— al cargo más alto, y una N5 —180 días de mora— al más bajo. El nivel que cada regla necesita es **configuración de la regla**, no algo que el motor transforme.
- **Ruteo de la excepción = (área, nivel)** (INC-03, 11-09-2026): la **regla** declara el ÁREA y su **tramo** declara el NIVEL. Con ese par se buscan los usuarios de esa área con ese nivel **o superior**; cualquiera de ellos autoriza, sin tope. Un cargo vacante lo cubre la jefatura de su misma área y **la escalada no cruza áreas**. Una regla **sin área no la aprueba nadie**: un default silencioso escondería una regla mal configurada.
- **Re-evaluación (v1 → v2 al firmar el contrato):** las variables de **burós** (CMF / Equifax / ACHEF / infracciones) del cliente y del deudor **NO** se re-evalúan (bloqueo firme: **C10–C22, C30–C32, D02–D13**). El resto **sí** se re-evalúa (C01–C09, C23–C29, C33–C52, D01, D14–D23, O01–O04). La re-evaluación **no re-abre** las excepciones ya visadas.

---

## 5. Ejemplo (ver `sftp_otorgamiento.csv`)

El archivo de ejemplo trae 5 filas:

1. **CLIENTE `76920742-2`** — sano (línea 350 MM, nota 4,1, sin moras).
2. **DEUDOR `88390200-9`** (par de `76920742-2`) — sin moras; par C-D sano.
3. **DEUDOR `77250120-4`** (par de `76920742-2`, mismo cliente ⇒ operación multi-deudor) — mora CMF 30–90 de $8.000.000 sobre $120.000.000 de deuda total (2,6% y &lt; $10 MM ⇒ **D02 excepción N3**), nota 3,5 (&lt; 3,7 ⇒ **D01 N4**) y **`SOCIOS_COMUNES_CD=1`** (**D18 N5**). Además arrastra cartera deteriorada **con este cliente y no con otros**: `CARTERA_RECLAMADA_CD=$3.500.000` (**C47 N1c**) y `CXC_PENDIENTES_CD=$1.800.000` (**C50 N1c**), aunque las `CARTERA_*` del cliente vengan en 0. Sus `stKey` son `"202@77250120-4"` (D02) y `"147@77250120-4"` (C47).
4. **CLIENTE `79443326-K`** — riesgoso: variación de venta −45%, `TGR_COBRANZA_JUD=$4.500.000` ⇒ **C30 HARD_BLOCK** (rechazo firme, la operación se pierde).
5. **DEUDOR `91022333-1`** (par de `79443326-K`) — mora Equifax $7.000.000 (**D09**), par con NC 12% (**D22 N2c**), venta cruzada 64% (**D21 N2c**) y `CARTERA_MOROSA_CD=$5.200.000` (**C49 N1c**).
