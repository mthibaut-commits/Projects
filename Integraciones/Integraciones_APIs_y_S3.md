# Integraciones — APIs y S3

**Propósito:** el contrato de las entregas que alimentan NEX Factoring y de las APIs que expone o consume. Reúne los 12 specs de `Integraciones/`, que siguen siendo la fuente de cada uno.
**Alcance:** 12 integraciones · generado el 2026-09-23.

**Versión 1.2.1 · 21-09-2026 · NEX Factoring**

---

## El patrón

Todas las entregas siguen la misma forma: **el archivo se deposita en S3 → S3 avisa → el backoffice lo procesa y monta la tabla interna → los upserts intradía entran por la API A22**. La aplicación lee siempre la tabla interna y nunca consulta a Security en línea, así que una integración que no llega no deja la pantalla en blanco: deja el dato del día anterior, que es un estado que se puede explicar.

El aviso reemplaza al cron: el procesamiento arranca cuando el archivo llega y no cuando el reloj lo permite, y como el `PutObject` de S3 es atómico desaparece el archivo a medio escribir que el SFTP dejaba ver — y con él el archivo centinela que había que acordar para taparlo.

Dos integraciones se salen del patrón a propósito. **A23 · consulta de líneas** se llama en el momento de evaluar una oferta, porque el cupo disponible cambia con cada operación que cursa cualquier canal y una foto diaria no sirve para decidir. **A13/A14/A15 · gestión de líneas** es el borde con el sistema del comité: NEX inyecta y consulta, y la resolución ocurre afuera.

## Índice

| Documento | Activo | Transporte | Qué entrega |
|---|---|---|---|
| `Ingesta por AWS S3` | **A25** | S3 | el transporte de las **entregas diarias** |
| `s3_cartera.csv` | **A24** | S3 | la **estructura comercial** del factoring —quién es ejecutivo, de qué equipo, bajo qué jefatura, en qué zona y sucursal— y la **asignación de cada cliente a su ejecutivo** |
| `s3_deudores_listas.csv` | **A3 + A4** | S3 | catálogo diario de **buenos deudores** — Lista Blanca (A3) y Deudores Autorizados (A4) — en un archivo único diferenciado por la columna `LISTA` |
| `s3_plataforma360.csv` | **A11** | S3 | información de empresa de la Plataforma 360 (firmográfica, comercial, índices, ventas, socios) por RUT — clientes y deudores |
| `s3_otorgamiento.csv` | **A16** | S3 | variables del **Modelo de Riesgo v1.0** para evaluar el catálogo de otorgamiento **C01–C52 (cliente)**, **D01–D23 (deudor)** y **O01–O04 (operación)** |
| `s3_verificacion.csv` | **A10** | S3 | variables del **Predictor de Verificación** (V01–V10) por **par cliente-deudor** (ventana 3M/6M) |
| `s3_lineas_vigentes.csv` | **A7** | S3 | carga diaria de las líneas de crédito vigentes por cliente |
| `AECSync` | **A2** | STREAM | todas las **cesiones electrónicas** de un cliente: qué documento cedió, a qué **cesionario**, cuándo y por cuánto |
| `swagger_actualizacion_intradia.yaml` | **A22** | API | endpoint **expuesto por NEX** para que Security actualice la **tabla interna** (montada desde las entregas diarias de otorgamiento A16, verificación A10 y Plataforma 360 A11) cuando los registros varían dentro del día |
| `swagger_consulta_lineas.yaml` | **A23** | API | responder, en el momento de evaluar una oferta, **cuánto cupo hay disponible** en los tres niveles que la regla de validación compara |
| `swagger_montos_lineas.yaml` | **A8** | API | refrescar durante el día los **montos** (uso, disponible, proyección, morosidad) de las líneas cargadas por el batch diario `s3_lineas_vigentes.csv` (A7) |
| `swagger_gestion_lineas.yaml` | **A13 / A14 / A15** | API | integrar NEX con el sistema externo de gestión de líneas (comité) |

---

## El transporte

Cómo llega una entrega y qué la hace procesarse. Va primero porque las seis entregas diarias comparten este mecanismo y ninguna lo redefine.

### Ingesta por AWS S3 · A25

**Versión 1.0.0 · 16-09-2026 · NEX Factoring**

**Propósito:** el transporte de las **entregas diarias**. Security deja el archivo en un bucket S3 y S3 **avisa solo** al backoffice, que lo procesa y monta la tabla interna. Lo comparten las seis entregas de batch (A24, A3+A4, A11, A16, A10, A7), que no lo redefinen: este documento dice **cómo llega** el archivo y cada spec dice **qué trae**.
**Transporte:** S3 · bucket `nex-ingesta-<ambiente>` · un prefijo por entrega · notificación `s3:ObjectCreated:*` → **SNS** → **SQS** → worker del backoffice.

### Por qué el evento y no un cron

El backoffice **no pregunta si llegó algo: se entera**. Un cron que mira una carpeta a una hora fija tiene dos problemas que no se arreglan moviendo la hora.

1. **El archivo que llega tarde espera hasta la corrida siguiente.** Si la entrega sale a las 06:20 y el cron corre a las 06:00, el pipeline trabaja un día entero con el dato de ayer sin que nada lo diga.
2. **Procesar «lo que haya» no distingue «no llegó» de «no había novedades».** Las dos cosas se ven igual desde afuera: una carpeta sin cambios.

Además, el `PutObject` de S3 es **atómico** —el objeto existe completo o no existe— y el evento se emite **cuando ya es durable**. Eso elimina el archivo a medio escribir: un transporte donde el archivo se ve mientras se sube obliga a acordar un centinela (`.done`) para saber cuándo terminar de esperar, y ese centinela es una convención más que se puede olvidar de un lado. Acá el objeto ES el centinela.

### El camino del archivo

```
  Security                       AWS                              Backoffice
  ────────                       ───                              ──────────
  PutObject  ────────────────▶  s3://nex-ingesta-prod
                                      │
                                      │  s3:ObjectCreated:*  (prefijo + sufijo .csv)
                                      ▼
                                  SNS  nex-ingesta-eventos
                                      │
                                      │  (fan-out: suscripción por dominio)
                                      ▼
                                  SQS  nex-ingesta-<dominio>     ──▶  worker
                                      │                                  │
                                      │  tras N intentos                 │ procesa
                                      ▼                                  ▼
                                  SQS  nex-ingesta-dlq            tabla interna
```

**Por qué SNS en el medio y no S3 → SQS directo.** Un bucket admite una sola notificación por combinación de evento y prefijo, así que encadenar un segundo consumidor —un archivador, un validador, una métrica— obligaría a tocar la configuración del bucket cada vez. Con SNS el bucket publica **una** vez y quien necesite enterarse se suscribe. El costo es un salto más y vale la pena: la configuración del bucket es la parte que Security opera y que no queremos estar cambiando.

**Por qué SQS y no una llamada HTTP al backoffice.** Una notificación HTTP se pierde si el backoffice está caído, desplegándose o saturado — y justamente la entrega diaria llega a una hora fija, que es cuando más probable es que coincida con una ventana de mantención. La cola retiene el evento hasta que alguien lo tome, aplica reintentos con backoff y, cuando el archivo es irrecuperable, lo deja en la **DLQ** en vez de perderlo. Un archivo que no se puede procesar tiene que quedar en algún lado donde alguien lo vea.

### Convenciones del bucket

| Qué | Valor |
|---|---|
| Bucket | `nex-ingesta-<ambiente>` (`dev` · `qa` · `prod`) |
| Prefijo | `<dominio>/` — `cartera/` · `listas/` · `plataforma360/` · `otorgamiento/` · `verificacion/` · `lineas/` |
| Objeto | `<ENTREGA>_AAAAMMDD.csv` — `CARTERA_20260916.csv`, `OTORGAMIENTO_20260916.csv`, … |
| Filtro del evento | prefijo `<dominio>/` **y** sufijo `.csv` |
| Versionado | **activado** — es lo que permite reprocesar una entrega puntual sin pedirla de nuevo |
| Cifrado | SSE-KMS, llave administrada por el dueño del bucket |
| Acceso público | bloqueado a nivel de cuenta y de bucket |

**El prefijo es el dominio y el nombre lleva la fecha.** No se usa una jerarquía por fecha (`cartera/2026/09/16/`) porque el consumidor no lista el bucket: reacciona a un evento que ya le dice la llave exacta, y una jerarquía sólo agregaría una convención más que mantener sincronizada entre las dos partes.

### El contrato del evento

Lo que llega a la cola es el registro de S3, con una envoltura de SNS. El worker sólo necesita cuatro campos: **bucket**, **key**, **versionId** y **size**. Todo lo demás es contexto.

```json
{
  "Records": [
    {
      "eventVersion": "2.1",
      "eventSource": "aws:s3",
      "awsRegion": "us-east-1",
      "eventTime": "2026-09-16T09:04:11.238Z",
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": { "name": "nex-ingesta-prod" },
        "object": {
          "key": "otorgamiento/OTORGAMIENTO_20260916.csv",
          "size": 4821993,
          "eTag": "9b2cf5e0c1a34d77b0f1d2e3a4b5c6d7",
          "versionId": "nUxJ1p9VqK2sYc0tR7mB4eH6lA3wZ8gD"
        }
      }
    }
  ]
}
```

El dominio **se deriva del prefijo de la key**, no de un campo aparte: un campo que el productor tiene que llenar es un campo que puede contradecir a la ruta, y entonces hay dos verdades sobre qué entrega es ésta.

### Reglas del consumidor

1. **Idempotencia por `(bucket, key, versionId)`.** S3 → SNS → SQS es **al-menos-una-vez**: el mismo evento puede llegar dos veces, y con `at-least-once` no es un caso raro sino el comportamiento normal. El worker registra la terna antes de procesar y descarta lo repetido. Sin esto, una entrega de full-replace que se procesa dos veces no rompe nada, pero una de upsert sí.
2. **El orden NO está garantizado.** Si el mismo día llegan dos versiones de una entrega, el evento de la segunda puede entrar antes. Se resuelve con el **nombre del objeto** —que lleva la fecha— y, a igual fecha, con `eventTime`: gana el más reciente y el anterior se descarta con una anotación. No se resuelve con el orden de llegada, que no significa nada.
3. **Un archivo que no parsea NO se reintenta indefinidamente.** Tres intentos con backoff y a la **DLQ**, con alerta. Un CSV mal formado no se arregla reintentando y, mientras se reintenta, bloquea la cola detrás de él.
4. **La carga es transaccional por entrega.** Full-replace significa que la tabla interna queda con el archivo entero o queda como estaba: un corte a media carga deja al pipeline decidiendo con media cartera, que es peor que decidir con la de ayer.
5. **Un archivo que no llegó es un estado, no un silencio.** Cada dominio declara su hora esperada; si a esa hora no entró evento, el backoffice lo registra y la pantalla muestra la antigüedad del dato. El evento dice cuándo llegó algo, nunca cuándo faltó algo.

### Permisos

- **Security** recibe un rol con `s3:PutObject` **sólo** sobre `nex-ingesta-<ambiente>/<dominio>/*`, sin `GetObject` ni `ListBucket`: quien deposita no necesita leer, y no poder leer es lo que evita que una credencial filtrada exponga las entregas de los demás.
- **El worker** recibe `s3:GetObject` y `s3:GetObjectVersion` sobre el bucket, y el consumo de su cola. No tiene `PutObject`: el consumidor no escribe en el buzón del que lee.
- **El bucket** no se expone a internet. El acceso va por **VPC endpoint**, así que el objeto no sale a la red pública en ningún tramo.

### Reproceso

Con el versionado activo, volver a procesar una entrega no obliga a pedirla de nuevo: se reemite el evento contra el `versionId` que se quiere, desde la consola de operación del backoffice. Es la operación que resuelve el caso «la entrega estaba bien pero el worker tenía un bug»: se corrige el worker y se reproduce el mismo archivo, con la garantía de que es **el mismo bytes a bytes** y no una segunda extracción del origen, que podría traer otra cosa.

### Qué queda fuera de este documento

- **Los layouts.** Ni un campo, ni un separador, ni un encoding: cada entrega los declara en su propio spec.
- **La tabla interna.** Es lo único que la aplicación lee. El evento decide *cuándo* se monta, no *qué* se lee.
- **Los upserts intradía (A22).** Entran por API: son correcciones puntuales dentro del día, no un archivo.
- **AECSync (A2).** Es un stream, no una entrega de batch, y no pasa por acá.

---

## Entregas diarias

Cada archivo monta una sección de la **tabla interna**. La aplicación nunca consulta a Security en línea: lee siempre esa tabla, que se refresca con la entrega diaria y con los upserts intradía de la API A22.

### s3_cartera.csv · A24

**Versión 2.0.0 · 16-09-2026 · NEX Factoring**

**Propósito:** la **estructura comercial** del factoring —quién es ejecutivo, de qué equipo, bajo qué jefatura, en qué zona y sucursal— y la **asignación de cada cliente a su ejecutivo**. Es lo que decide **quién ve qué** en el tubo y a quién se le atribuye una operación.
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/cartera/CARTERA_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** upserts vía API A22 (dominio `CARTERA`) — un ejecutivo que entra o una cartera que se traspasa no esperan al batch del día siguiente.
**Clave:** `TIPO` + `COD_EJECUTIVO` + `RUT_CLIENTE`. Full-replace diario + upserts.

### Por qué existe

Ni la estructura ni la asignación son del pipeline: las produce **RRHH** y la **administración comercial**.

Tres consecuencias, todas verificadas antes de escribir esto:

1. **La cartera viajaba en el activo equivocado.** A5 describe participación de mercado; de quién es un cliente no es un atributo de su SOW. Cuando un activo lleva un campo que no es suyo, nadie sabe que hay que actualizarlo.
2. **La identidad era el nombre.** Cambiarle el apellido a una persona dejaba a toda su cartera sin dueño — sin error, sin aviso y sin forma de notarlo salvo que alguien reclamara.
3. **La jefatura no llegaba por ningún activo.** Era un mapa de una línea en el código. Un jefe nuevo no estaba en él, la búsqueda daba `undefined`, y eso se leía como «ve todo»: el ejecutivo nuevo fallaba **cerrado** y el jefe nuevo fallaba **abierto**, indistinguible de la gerencia.

### Dos granos, un archivo

La columna `TIPO` distingue las dos poblaciones:

| `TIPO` | Grano | Qué declara |
|---|---|---|
| `EJECUTIVO` | la persona | código, nombre, correo, equipo, jefatura, zona, sucursal, estado |
| `CARTERA` | la asignación | qué RUT cliente le pertenece, desde cuándo |

**Viajan juntos a propósito y se validan como una UNIDAD.** Una fila `CARTERA` que apunta a un `COD_EJECUTIVO` que el archivo no declara es un archivo roto: cargarla igual deja operaciones colgando de alguien que no existe, que es exactamente el estado que después nadie puede auditar. Con los dos granos en la misma entrega la comprobación es local y la carga falla entera, no a medias.

### Campos

| Campo | Aplica a | Descripción |
|---|---|---|
| `TIPO` | ambos | `EJECUTIVO` \| `CARTERA` |
| `COD_EJECUTIVO` | ambos | **La identidad.** Código estable del ejecutivo, independiente del nombre. Es lo que se congela en el JSON de cada oportunidad (`deal.exec`) |
| `RUT_CLIENTE` | `CARTERA` | RUT del cedente. Vacío en las filas `EJECUTIVO` |
| `NOMBRE` | ambos | Nombre de la persona en `EJECUTIVO`; razón social del cliente en `CARTERA`, como **copia de conveniencia** — el maestro de razón social es **A11** |
| `EMAIL` | `EJECUTIVO` | Correo corporativo |
| `EQUIPO` | `EJECUTIVO` | **Rótulo** del equipo comercial. Es presentación: se puede renombrar sin que cambie quién manda a quién |
| `COD_JEFE` | `EJECUTIVO` | **La arista.** Código de la jefatura a la que reporta. Es lo que decide el alcance de un jefe, no el rótulo del equipo |
| `ZONA` | `EJECUTIVO` | Zona comercial |
| `SUCURSAL` | `EJECUTIVO` | Sucursal desde la que opera |
| `ESTADO` | ambos | `ACTIVO` \| `INACTIVO`. Sólo se cargan las filas activas |
| `VIGENTE_DESDE` | ambos | Alta de la persona, o fecha en que el cliente se asignó a ese ejecutivo |
| `VIGENTE_HASTA` | ambos | Baja. Vacío mientras siga vigente |
| `FECHA_CORTE` | ambos | Generación |

### Notas

- **El rótulo del equipo no es una clave foránea.** `EQUIPO` se muestra; `COD_JEFE` decide. Hacer coincidir rótulos para saber a quién ve un jefe funcionaba sólo mientras nadie renombrara un equipo ni llegara un jefe cuyo equipo aún no estuviera escrito.
- **`COD_JEFE` apunta al catálogo de usuarios del TENANT, no a este archivo.** Quién es jefe y qué atribución tiene es configuración del tenant (Configuración › Usuarios / Roles); declararlo también acá lo pondría en dos sitios, que es el problema que este activo viene a cerrar. Este archivo declara **sólo la fuerza de venta**.
- **Una jefatura puede estar VACANTE**, y es un estado legítimo y frecuente: sus ejecutivos cuelgan de la gerencia. En el tenant de la demo sólo *Equipo Andes* tiene jefatura declarada; *Pacífico* y *Austral* están vacantes. De paso ejercita el caso que las reglas de atribución ya contemplan —un cargo vacante lo cubre la jefatura de su área—.
- **Un jefe que el archivo no menciona no ve NADA.** En una pantalla de oportunidades ajenas, fallar cerrado es la única respuesta defendible: lo contrario es que un error de carga abra la cartera completa.
- **Un RUT que no está en el archivo es un PROSPECTO, no un cliente sin ejecutivo.** No se rellena: quién trabaja un prospecto lo decide el pipeline con su propia regla de reparto, y eso es proceso, no dato. La diferencia importa porque un cliente sin dueño sí sería un defecto del archivo.
- **El archivo mueve EMPRESAS; no mueve OPERACIONES.** `deal.exec` guarda el código congelado en el JSON de la oportunidad. Que mañana el archivo asigne la empresa a otra persona no reasigna los negocios en curso: eso es un acto administrativo con fecha y responsable, y se hace en `Configuración › Oportunidades › Migración › Cambio de ejecutivo`, que va a la bitácora. Sólo se traspasa lo que está **en gestión, hasta antes del giro**: una operación girada ya se desembolsó y moverla sólo reescribiría de quién cuelga una venta que hizo otro.
- **La razón social de `CARTERA` es copia de conveniencia.** Se emite para que el archivo se pueda leer solo en una revisión manual; el maestro es A11. Si difieren, no se corrige el maestro: se registra la discrepancia (ver `Levantamiento_Activos_Informacion.md` §5).
- **Un código que el padrón ya no conoce no es «Agente IA».** Ese rótulo es para lo que de verdad no tiene dueño —`exec` vacío, originado por el inbound—. Un código desconocido es alguien que se fue, y se muestra marcado: relabelarlo falsea la atribución de operaciones que sí tuvieron dueño, y el dashboard, el Plan por Ejecutivo y el churn empiezan a contarle al agente lo que negoció una persona.

### s3_deudores_listas.csv · A3 + A4

**Versión 3.0.0 · 23-09-2026 · NEX Factoring**

**Propósito:** catálogo diario de **buenos deudores** — Lista Blanca (A3) y Deudores Autorizados (A4) — en un archivo único diferenciado por la columna `LISTA`. Monta la sección de listas de la **tabla interna**. Gobierna la clasificación de deudores, las reglas de prospección (CAT), y la elegibilidad del inbound (sólo LB/Autorizados/históricos abren oportunidad).
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/listas/DEUDORES_LISTAS_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** altas/bajas urgentes vía API A22 si se requiere (dominio a habilitar) o esperan al batch siguiente.
**Clave:** `RUT_DEUDOR` + `LISTA`. Full-replace diario (snapshot): un deudor ausente en el archivo del día queda **fuera de listas** (pasa a "Otro").

| Campo | Tipo | Descripción |
|---|---|---|
| RUT_DEUDOR | string | RUT del deudor (sin puntos, con guión y DV) |
| RAZON_SOCIAL | string | Razón social |
| LISTA | BLANCA \| AUTORIZADA | BLANCA = Lista Blanca (A3) · AUTORIZADA = Deudores Autorizados (A4) |
| CUPO_SUGERIDO | number | Cupo sugerido de exposición por deudor, en **pesos enteros**; informativo |
| VIGENTE_DESDE / VIGENTE_HASTA | date | Ventana de vigencia en la lista |
| ESTADO | VIGENTE \| SUSPENDIDO | SUSPENDIDO mantiene el registro pero lo excluye de elegibilidad |
| FECHA_CORTE | date | Generación del archivo |

**Retirado del layout:** `CLASIFICACION` (PRIME \| NORMAL) salió junto con el segmento Elite del predictor de verificación, que era su único consumidor. Y `NOTA_DEUDOR` salió porque la nota es un atributo de la **empresa** y vive sólo en el **A11** (Plataforma 360): este archivo dice a qué lista pertenece un deudor, no cómo se comporta.

**Reglas:** un RUT no puede estar en ambas listas simultáneamente (prima BLANCA; se loguea el conflicto) · registros con `VIGENTE_HASTA` pasada o `ESTADO=SUSPENDIDO` no habilitan elegibilidad · los cambios de lista impactan la CAT de las oportunidades abiertas en la siguiente evaluación.

### s3_plataforma360.csv · A11

**Versión 4.0.0 · 23-09-2026 · NEX Factoring**

**Propósito:** información de empresa de la Plataforma 360 (firmográfica, comercial, índices, ventas, socios) por RUT — clientes y deudores. Monta la sección PLATAFORMA360 de la **tabla interna**. Alimenta la presentación al comité (pasos 1, 2 y 4) y la generación IA de notas.
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/plataforma360/PLATAFORMA360_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** upserts vía API A22 (dominio `PLATAFORMA360`).
**Clave:** `RUT` + `ROL` (CLIENTE | DEUDOR). Full-replace diario + upserts intradía.

| Campo | Tipo | Descripción |
|---|---|---|
| RUT / RAZON_SOCIAL / ROL | string | Identificación; ROL: CLIENTE o DEUDOR |
| ACTIVIDAD_ECONOMICA / SECTOR | string | Firmográfica |
| NUM_TRABAJADORES | integer | Dotación |
| FECHA_INGRESO / FECHA_PRIMERA_OPERACION | date | Historia como cliente |
| CLIENTE_BANCO / ALERTAS | SI\|NO | Relación banco y alertas vigentes |
| NOTA_COMPORTAMIENTO | number 1–5 | **Nota de comportamiento (5 = mejor pagador). ÚNICA fuente**: la consultan C09 (cliente), D01 (deudor), el CAT, el predictor de verificación y la UI. No viaja en ningún otro activo |
| SEGMENTO / SUB_SEGMENTO / QUINTIL | string / int | Segmentación comercial |
| MARGEN_ULT_MES / MARGEN_12M | number (pesos) | Márgenes de contribución |
| COLOC_PROM_12M | number (pesos) | Colocación promedio 12m |
| SOW_SECURITY_PCT / SOW_FACTORING_TARGET_PCT / SOW_OTROS_FACTORING_PCT / SOW_OTROS_BANCARIOS_PCT | number (%) | **Mix de financiamiento del cliente**: con quién se financia por cesión y en qué proporción. Las cuatro porciones **suman 100**. Sólo para ROL=CLIENTE; en un deudor vienen vacías (no 0: un deudor no cede facturas, la pregunta no le aplica). **Se miden sobre A2 · AECSync** —el único activo que identifica al cesionario— y se inyectan acá; `SOW_SECURITY_PCT` se **ancla** al `SOWActualPct` del A5 para que la misma cifra no tenga dos valores. **`SOW_FACTORING_TARGET_PCT` se publica con el padrón de cesionarios POR DEFECTO**: quién es «target» es política comercial del tenant, así que el consumidor que la tenga configurada reagrupa desde `SOW_DETALLE_JSON` |
| SOW_DETALLE_JSON | JSON string | Desglose del mix **por cesionario**: array `{rut, nombre, porcion, pct}`, ordenado de mayor a menor. Es lo que el tooltip de cada chip muestra —«Otros bancarios · 22%» no sirve para llamar a nadie; «Banco Santander 14% · Scotiabank 8%» sí—. Cada porción es **exactamente** la suma de los suyos: el 100 se reparte una sola vez, cesionario por cesionario, y las cuatro porciones se agregan desde acá |
| SPREAD_REAL_12M_PCT / TASA_ULT_OP_PCT / COMISION_ULT_OP | number | Pricing histórico |
| PAS_EXIGIBLE_GEN_BRUTA / PATRIMONIO / GENERACION / LEVERAGE | number | Índices financieros |
| VENTAS_A1..A3 / VENTAS_SII_A1..A3 | number (pesos) | Ventas 3 años (cliente y SII); vacío = sin período |
| SOCIOS_JSON | JSON string | Array `{rut, nombre, participacion, pep, fatca}` |
| FECHA_CORTE | date | Generación del archivo |

**Por qué el mix vive acá, y dónde se mide.** Alimenta la columna **SOW** del tubo comercial en versión tabla. El sujeto del campo es la EMPRESA —no su cartera, no un par cliente-deudor—, así que por el criterio del Levantamiento §5 el maestro de publicación es este activo. Pero **el dato se mide en A2 · AECSync**, que registra todas las cesiones del cliente —bancarias y no bancarias— e identifica al cesionario de cada una: es el único que puede decir con quién se financia. Acá llega **inyectado**, igual que `COLOC_PROM_12M_M` y `FECHA_PRIMERA_OPERACION`, que también se miden sobre las cesiones. `SOW_SECURITY_PCT` se ancla al `SOWActualPct` del A5 —ver el hueco abierto en Levantamiento §5.6, donde los dos activos miden esa cifra con 13,8 pto de desvío mediano—.

**Notas:** campos vacíos = sin información (no 0). La nota de comportamiento se **consolidó acá** (antes viajaba además en A16 y A10, y el layout de A3/A4 también la declaraba): es un atributo de la empresa, y tres copias podían discrepar sobre el mismo RUT. Para deudores, los campos comerciales de cliente pueden venir vacíos. Solapa variables con A16: mantener consistencia de nombres o consolidar entrega (ver Levantamiento §4).

### Unidad de los montos

**Todos los montos van en pesos enteros.** Ningún campo lleva sufijo de escala: ni `_M` (miles) ni
`_MM` (millones). El millón es una abreviatura de PANTALLA y el único sitio del sistema que divide
por un millón es el formateador.

Este layout pasó por las dos formas del error en tres días. Hasta el **23-09-2026** por la mañana,
tres filas declaraban `number (M$)` —o sea **millones**— mientras el generador las producía en
**miles** y el lector las multiplicaba por mil: quien implementara la entrega leyendo el layout
habría enviado cifras **mil veces mayores**, y nada lo habría dicho. Corregida la declaración, quedaba
el problema de fondo: **en miles, cada monto se cuantiza de a $1.000**. Por eso los campos perdieron
el sufijo y van en pesos.

### s3_otorgamiento.csv · A16

**Versión 4.0.0 · 23-09-2026 · NEX Factoring**

**Propósito:** variables del **Modelo de Riesgo v1.0** para evaluar el catálogo de otorgamiento **C01–C52 (cliente)**, **D01–D23 (deudor)** y **O01–O04 (operación)**. Monta la sección OTORGAMIENTO de la **tabla interna**; el motor de NEX evalúa localmente los tramos (risk tiers) y niveles (N1..N5 / Comité) contra esta tabla, sin recalcular nada en origen.
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/otorgamiento/OTORGAMIENTO_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** upserts vía API **A22** (dominio `OTORGAMIENTO`, mismos nombres de campo). Full-replace diario + upserts.
**Unidades:** montos en **pesos enteros**, sin excepción — **ningún campo lleva sufijo de escala**: ni `_M` (miles) ni `_MM` (millones); porcentajes 0–100; booleanos 1/0; fechas ISO `AAAA-MM-DD` (o `AAAAMM` para IVA).

### 1. Modelo de filas: una fila por (RUT, ROL, RUT_CONTRAPARTE)

La clave primaria es **`RUT` + `ROL` (+ `RUT_CONTRAPARTE`)**. Cada entidad de la política se entrega como una fila con un `ROL`:

| ROL | RUT | RUT_CONTRAPARTE | Qué variables porta | Reglas |
|---|---|---|---|---|
| **CLIENTE** | RUT del cedente | *(vacío)* | Perfil de riesgo y comportamiento del **cliente** | C01–C52, y las variables base de O01–O04 |
| **DEUDOR** | RUT del deudor (pagador) | RUT del **cliente** con quien opera | Perfil de riesgo del **deudor** + variables del **par cliente-deudor** | D01–D23 |

- Una operación puede tener **varios deudores** ⇒ se entrega **una fila `DEUDOR` por cada par (cliente, deudor)**. El mismo deudor con dos clientes distintos son dos filas (distinto `RUT_CONTRAPARTE`).
- Las columnas de moras/bureau (CMF, Equifax, ACHEF, infracciones, mora interna) y `NOTA_COMPORTAMIENTO` son **compartidas**: en una fila `CLIENTE` describen al cliente (C10–C26); en una fila `DEUDOR` describen al deudor (D01–D17). El `ROL` define de quién son.
- Las columnas de **comportamiento comercial** (`NOTA_CREDITO_PCT`, `RECLAMO_PCT`, `VENTA_CRUZADA_PCT`) son del **cliente** en fila CLIENTE (C34–C36) y del **deudor** en fila DEUDOR (D19–D20). Las variables del **par C-D** (D21–D23) van en columnas propias `*_CD_PCT` (ver §3) y en `SOCIOS_COMUNES_CD` (D18), siempre en la fila `DEUDOR`.
- **TGR** (C27–C32) y **endeudamiento factoring / cartera del cliente** (C37–C46) son sólo del **cliente** (fila CLIENTE). La **cartera del par** (C47–C50) va en columnas propias `*_CD` de la fila `DEUDOR`: son las gemelas de C40–C43 medidas contra ese deudor, y se evalúan **una vez por deudor** como las D (ver §2).

### 2. Evaluación por deudor y visado

- El motor arma el set de variables del cliente `vCli` (fila CLIENTE) y, para **cada** fila `DEUDOR` ligada a ese cliente, sobrepone el bloque del deudor (columnas de la fila DEUDOR) y evalúa **una vez por deudor** las reglas **D01–D23**. El resto de las C y las O se evalúan una sola vez. El tipo lo **declara la regla** (`porDeudor`), no el prefijo del código.
- El resultado es una lista de ítems **(regla × deudor)**. La clave de estado/visado (`stKey`) es:
  - **Cliente / Operación:** `stKey = "<n>"`  (ej. `"117"` = C17, `"301"` = O01).
  - **Deudor / par C-D:** `stKey = "<n>@<rut_deudor>"`  (ej. `"202@88390200-9"` = D02 del deudor 88390200-9; `"221@77250120-4"` = D21 del par con ese deudor).
- El **visado** (aprobación/rechazo de cada excepción por el apoderado con atribución) se registra **independiente por (operación, stKey)**: estado `aprobado | rechazado | pendiente` + respaldo (comentario, adjunto, quién, fecha). La bandeja agrupa las reglas D en un bloque **por deudor** (razón social + RUT).
- Estado agregado de la operación: **aprobada** / **sujeta a excepción** / **rechazada**. Sólo rechazan los tres knockout de cliente (**C30–C32**, TGR) y una **excepción que un apoderado rechazó**: los dos son bloqueo firme y pierden la operación. Los criterios de burós del deudor (**D02–D13**) son **excepciones no re-evaluables**: se visan como cualquier otra, pero una re-evaluación no las repara.

### 3. Diccionario de campos

| Campo | Reglas | ROL que lo porta | Descripción |
|---|---|---|---|
| RUT | — | ambos | RUT de la entidad de la fila (cliente o deudor) |
| ROL | — | — | `CLIENTE` \| `DEUDOR` |
| RUT_CONTRAPARTE | — | DEUDOR | En fila DEUDOR: RUT del cliente del par. Vacío en fila CLIENTE |
| PAGARE_FIRMADO / MNT_PAGARES / FCH_VCTO_PAGARE | C01–C03 | CLIENTE | Pagaré: existencia, monto suficiente (cartera+simulación), vigencia (60d post últ. vcto.) |
| IVA_ULT_PERIODO (AAAAMM) | C04 | CLIENTE | Información financiera al día (≤ 2 meses) |
| LINEA_APROBADA / LINEA_EXTENDIDA | C05–C07 | CLIENTE | Línea vigente, extensión por Riesgo (N4), cupo (excedente ≤10% N2 / >10% N4) |
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

> **Variables del par cliente-deudor:** `VENTA_CRUZADA_CD_PCT`, `NOTA_CREDITO_CD_PCT`, `RECLAMO_CD_PCT`. D19–D20 (deudor) y D21–D23 (par) viajan en columnas distintas, ambas en la fila `DEUDOR`: sin separarlas, una variable del par se lee como si fuera del deudor.
>
> **Cartera del par cliente-deudor:** `CARTERA_RECLAMADA_CD`, `CARTERA_NC_CD`, `CARTERA_MOROSA_CD`, `CXC_PENDIENTES_CD`. Se miden por par porque es donde el deterioro se ve: un cliente con la cartera global limpia puede arrastrar reclamos, notas de crédito o mora con un solo deudor, y agregado al cliente eso se diluye hasta desaparecer. Viajan en la fila `DEUDOR` —una por par (cliente, deudor)— y **no** en la fila `CLIENTE`, que ya porta el agregado en las `CARTERA_*` a secas.

Variables de **operación** (O01–O03: spread bajo banda, comisión/gastos bajo mínimo, CxC sin aplicar) **no** viajan en este archivo: se derivan de la **simulación** de la oferta en NEX (condiciones comerciales del ejecutivo) y se evalúan contra las bandas de atribución. `O04` sí usa `CLIENTE_BLOQUEADO`.

### 4. Niveles y re-evaluación

- **Niveles:** política N1..N5, **N5 = máxima**, **sin transformación**. El nivel que cada regla necesita es **configuración de la regla**, no algo que el motor derive: homologarlo con una fórmula del tipo `6 − N` invierte la escala y manda una excepción N1 —un pagaré sin firmar— al cargo más alto.
- **Ruteo de la excepción = (área, nivel):** la **regla** declara el ÁREA y su **tramo** declara el NIVEL. Con ese par se buscan los usuarios de esa área con ese nivel **o superior**; cualquiera de ellos autoriza, sin tope. Un cargo vacante lo cubre la jefatura de su misma área y **la escalada no cruza áreas**. Una regla **sin área no la aprueba nadie**: un default silencioso escondería una regla mal configurada.
- **Re-evaluación (v1 → v2 al firmar el contrato):** las variables de **burós** (CMF / Equifax / ACHEF / infracciones) del cliente y del deudor **NO** se re-evalúan (bloqueo firme: **C10–C22, C30–C32, D02–D13**). El resto **sí** se re-evalúa (C01–C09, C23–C29, C33–C52, D01, D14–D23, O01–O04). La re-evaluación **no re-abre** las excepciones ya visadas.

### 5. Ejemplo (ver `s3_otorgamiento.csv`)

El archivo de ejemplo trae 5 filas:

1. **CLIENTE `76920742-2`** — sano (línea 350 MM, nota 4,1, sin moras).
2. **DEUDOR `88390200-9`** (par de `76920742-2`) — sin moras; par C-D sano.
3. **DEUDOR `77250120-4`** (par de `76920742-2`, mismo cliente ⇒ operación multi-deudor) — mora CMF 30–90 de $8.000.000 sobre $120.000.000 de deuda total (2,6% y &lt; $10 MM ⇒ **D02 excepción N3**), nota 3,5 (&lt; 3,7 ⇒ **D01 N4**) y **`SOCIOS_COMUNES_CD=1`** (**D18 N5**). Además arrastra cartera deteriorada **con este cliente y no con otros**: `CARTERA_RECLAMADA_CD=$3.500.000` (**C47 N1c**) y `CXC_PENDIENTES_CD=$1.800.000` (**C50 N1c**), aunque las `CARTERA_*` del cliente vengan en 0. Sus `stKey` son `"202@77250120-4"` (D02) y `"147@77250120-4"` (C47).
4. **CLIENTE `79443326-K`** — riesgoso: variación de venta −45%, `TGR_COBRANZA_JUD=$4.500.000` ⇒ **C30 HARD_BLOCK** (rechazo firme, la operación se pierde).
5. **DEUDOR `91022333-1`** (par de `79443326-K`) — mora Equifax $7.000.000 (**D09**), par con NC 12% (**D22 N2c**), venta cruzada 64% (**D21 N2c**) y `CARTERA_MOROSA_CD=$5.200.000` (**C49 N1c**).

### s3_verificacion.csv · A10

**Versión 3.0.0 · 23-09-2026 · NEX Factoring**

**Propósito:** variables del **Predictor de Verificación** (V01–V10) por **par cliente-deudor** (ventana 3M/6M). Monta la sección VERIFICACION de la **tabla interna**. NEX decide localmente: VERIFICADA POR MODELO o VERIFICACIÓN TELEFÓNICA antes de girar.
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/verificacion/VERIFICACION_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Intradía:** upserts vía API A22 (dominio `VERIFICACION`) — clave para V07/V08 que son **degradables intramés**.
**Clave:** `RUT_CLIENTE` + `RUT_DEUDOR`. Full-replace diario + upserts.

| Campo | Criterio | Umbral | Descripción |
|---|---|---|---|
| V01_PROTOCOLO_PROPIO | V01 | Existe → prevalece | 1 = el deudor tiene protocolo propio de verificación |
| V02_PCT_PAGADO_3M | V02 | ≥ 90% | Monto pagado por el deudor / cartera del par Ult3M |
| **V03_MNT_COMPRA_3M** | V03 | razón ≤ 1,3× | **Total comprado al par en 3M móviles, en pesos enteros.** NEX divide el monto de la operación con ese deudor por este total. El archivo trae el **total**, no la razón: la razón depende de la operación que se está evaluando y el archivo no la conoce |
| **V04_VENTA_PROM_3M** | V04 | razón < 1,0× | **Venta mensual promedio del par, en pesos enteros.** Mismo motivo que V03: viaja el denominador, la razón la calcula NEX |
| V05_RECURRENCIA_MESES_6M | V05 | **≥ 4** | Meses con venta C-D > 0 en Ult6M (sin reclamos/anulaciones). El umbral es **≥ 4**, no > 4: con 4 meses el criterio se cumple |
| **V06_PLAZO_PROM_PAGO_DIAS** | V06 | desviación **≤ 5% del plazo** | **Plazo promedio de pago del par, en días.** NEX calcula la desviación de cada factura contra él —`abs(plazo_doc − plazo_prom) / plazo_prom`— y aplica el 5%. El umbral **no son 5 días**: en un par que paga a 30 días tolera ±1,5 y en uno de 90 tolera ±4,5. El archivo trae el **plazo promedio**, no la diferencia ya calculada: una diferencia agregada no se puede recomputar por factura |
| V07_PCT_MORA_25D | V07 | < 3% | % pagado con mora >25d — **degradable intramés** |
| V08_PCT_RECLAMADAS | V08 | < 4% | % facturas reclamadas — **degradable intramés** |
| V10_MNT_PAGADO_3M | V10 | **> MM$1.000** | Historial de pago factoring relevante, en pesos enteros: lo que el **deudor** le pagó al factoring en 3 meses **sumando todos sus cedentes** —es un atributo del deudor, como V01, y viaja repetido en cada fila del par—. Umbral **fijo**: no mira el tamaño de la operación evaluada. El «> 20× la operación ó > MM$1.500» es de la versión anterior del predictor |
| SEGMENTO | — | `PRIME` \| `OTROS` | Pre-segmentación del origen, **informativa**: NEX la recalcula siempre (ver nota). Los nombres `ELITE`/`OTHERS` son de la versión anterior |
| CLASIFICACION | — | `PRIME` \| `NORMAL` | Lista Blanca / Deudor Autorizado. Es **una de las dos** puertas de entrada al protocolo recortado |
| NOTA_DEUDOR | — | **> 4,2** abre por sí sola | Nota 1–5. La **otra** puerta de entrada: una nota > 4,2 basta aunque el deudor no sea PRIME |
| FECHA_CORTE | — | — | Generación |

**Razones contra la operación.** V03, V04, V06 y V09 dependen del documento que se evalúa, así que el archivo trae el **denominador** y NEX calcula: el total comprado al par, su venta mensual, su plazo histórico. Los tres se **miden** sobre DTESync en el generador de datos, no se sintetizan.

**Notas:**

- **La segmentación la decide NEX, no el archivo.** El protocolo recortado se aplica si el deudor es PRIME **o** su nota supera 4,2 — son **dos poblaciones y basta pertenecer a una**, no una conjunción. `SEGMENTO` viaja para poder contrastar, pero no manda. La versión anterior exigía nota ≥ 3,7 **y** clasificación Prime.
- **PRIME** aplica seis criterios (V01, V04, V05, V07, V08, V10); **OTROS** aplica los diez.
- **V01 es compuerta, no atajo:** si el deudor tiene protocolo propio de confirmación **se verifica siempre** con ese protocolo y no se evalúa ningún otro criterio.
- **Un campo vacío es incumplimiento, nunca «no aplica».** No hay estado intermedio: un deudor nuevo —sin historial para V02, V05 y V10— se verifica por construcción. Enviar 0 y enviar vacío no son lo mismo si el 0 es un dato real.
- **V03** compara el monto de la operación contra **el total comprado al par en 3M móviles**, no contra un promedio por factura; el nombre `V03_RATIO_PROM_COMPRA` quedó del límite anterior.
- **V09** (alto monto, > MM$300) no viaja en el archivo: se evalúa en NEX sobre el **total de la operación con ese deudor** y sólo aplica al segmento OTROS — un PRIME no tiene techo por monto.
- La verificación telefónica registrada en NEX no se pierde con las cargas.

**Fuente normativa:** `Specs_Procesos/Verificacion/spec-verificacion-facturas.md`, que es la versión vigente del predictor. El PDF `Spec_Proceso_Calificacion_Otorgamiento_Verificacion_v1.1.pdf` describe la versión anterior (segmentos «Elite/Others», V10 con el múltiplo, entrada por conjunción) y quedó atrás en esos puntos.

### s3_lineas_vigentes.csv · A7

**Versión 2.0.0 · 16-09-2026 · NEX Factoring**

**Propósito:** carga diaria de las líneas de crédito vigentes por cliente. Alimenta el tab Líneas (sub-tab Vigentes) y el recomendador. Los montos se refrescan durante el día vía API Montos (A8).
**Transporte:** S3 · `s3://nex-ingesta-<ambiente>/lineas/LINEAS_VIGENTES_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. El `PutObject` emite `s3:ObjectCreated:*` y el backoffice lo procesa al llegar, sin cron (**A25 · ingesta por S3**). **Montos en PESOS**, enteros, sin separador de miles ni decimales.
**Clave:** `ID_LINEA` (única). Carga tipo full-replace (snapshot del día).

| Campo | Tipo | Descripción |
|---|---|---|
| ID_LINEA | string | Identificador único de la línea |
| RUT_CLIENTE | string | RUT sin puntos, con guión y DV |
| RAZON_SOCIAL | string | Razón social del cliente |
| LINEA_APROBADA | integer | Línea aprobada por comité, en PESOS |
| USO_ACTUAL | integer | Uso al corte, en PESOS |
| DISPONIBLE | integer | Aprobada − uso, en PESOS |
| PROYECCION_POST_CURSE | integer | Uso + operaciones en curso, en PESOS |
| MOROSIDAD_DIAS | integer | Días de mora del cliente (0 = sin mora) |
| FECHA_VENCIMIENTO | date (AAAA-MM-DD) | Vencimiento de la línea |
| EJECUTIVO | string | Ejecutivo dueño de la cartera |
| ZONA | string | Zona geográfica |
| FECHA_CORTE | date | Fecha de generación del archivo |

**Validaciones:** LINEA_APROBADA > 0 · DISPONIBLE = LINEA_APROBADA − USO_ACTUAL (igualdad EXACTA, sin tolerancia: son pesos enteros) · RUT válido con DV. Filas inválidas se rechazan y se informan; el archivo no se descarta completo.

### Unidad de los montos

Todos los montos van en **pesos**, enteros. No se entregan en millones ni con decimales.

El millón es una abreviatura de PANTALLA, no una unidad de dato. Este layout entregaba
`LINEA_APROBADA_MM` y compañía en millones con un decimal, o sea cuantizados de a $100.000, y el uso
declarado dejaba de cuadrar contra la suma de las facturas cedidas, que sí son pesos exactos. El
cupo que aprueba el comité puede ser cualquier monto —típicamente es una cifra redonda, pero no
necesariamente—, así que el layout no supone nada sobre su forma.

---

## Streams

Registro electrónico de cesiones. No es una entrega diaria ni una consulta puntual: es el histórico del que se derivan el mix de financiamiento, la detección de competencia y el bloqueo de un documento ya cedido.

### AECSync · A2

**Versión 1.0.1 · 16-09-2026 · NEX Factoring**

**Propósito:** todas las **cesiones electrónicas** de un cliente: qué documento cedió, a qué **cesionario**, cuándo y por cuánto. Es el único activo que identifica a las **contrapartes de financiamiento** del cliente, y de ahí sale el **mix de financiamiento** (columna SOW del tubo), la detección de competencia, la pérdida por cesión y el bloqueo «cedida a terceros» de una factura candidata.

**Proveedor:** **Datamart** — servicio `AECSync`. Documentación: <https://docs.datamart.cl/#tag/AEC-Sync>.
**Transporte:** stream / notificación push (ver «Envoltorio»), continuo. Consulta **por cliente (cedente)**: la pregunta que el servicio contesta es *todas las cesiones de este RUT, con todos sus cesionarios*.
**Clave del registro:** `RUTEmisor` + `Folio` — ver «Cómo se une con el A1».

> **Pendiente de cotejo.** Las rutas HTTP, el esquema de autenticación, la paginación y los límites de tasa de este documento **no están cotejados contra la documentación del servicio** (`docs.datamart.cl`). El **payload** sí es literal: es el que entrega el servicio y el que el pipeline consume. Antes de implementar, cotejar transporte y autenticación y completar esta sección.

### 1. Campos

Los 22 campos del registro. La columna **Sujeto** es lo que decide quién manda cuando el mismo dato llega por más de una entrega (Levantamiento §5): **el maestro es el activo cuyo sujeto es el del campo.**

#### 1.1 De la CESIÓN — sujeto: el acto de ceder. Maestro: **A2**

| Campo | Tipo | Descripción |
|---|---|---|
| `RUTCedente` / `RazonSocialCedente` / `EmailCedente` | string | Quién cede el crédito: el cliente |
| `RUTFactoring` / `RazonSocialFactoring` / `EmailFactoring` | string | **El cesionario.** El campo que ningún otro activo tiene, y del que cuelga todo lo que este activo aporta |
| `FechaCesion` | datetime | Cuándo se cedió. ISO con hora (`2026-06-23T03:01`) |
| `MontoCesion` | number (pesos) | Cuánto se cedió. **Igual o menor** que `MontoDocumento` — ver §3 |

#### 1.2 Del DOCUMENTO — sujeto: la factura. Maestro: **A1 · DTESync**

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

#### 1.3 Envoltorio de la notificación — sujeto: la entrega

| Campo | Tipo | Descripción |
|---|---|---|
| `ReceptorElectronico` | boolean | Si el receptor opera con DTE electrónico |
| `Servicio` | string | `AECSync` |
| `Notificacion` | string | Tipo de evento (`AEC_SINCRONIZADO`) |
| `Extras` | object | Campos adicionales del servicio. Hoy vacío |

La tripleta `Servicio` / `Notificacion` / `Extras` es el envoltorio de un **evento push**, no de una respuesta a una consulta: el activo llega empujado a medida que el registro electrónico sincroniza las cesiones. Eso es lo que lo separa de las cinco entregas SFTP, que son batch diario.

### 2. Cómo se une con el A1

El documento se identifica por **`RUTEmisor` + `Folio`**, no por `RUTCedente` + `Folio`.

En la operación normal los dos RUT coinciden —quien emitió la factura es quien la cede— y en la entrega actual coinciden en **1.300 de 1.300**. Pero son cosas distintas y pueden separarse: en una **re-cesión** el cedente es el factor que compró el documento, no quien lo emitió. Unir por el cedente en ese caso no encuentra el documento, y una cesión sin documento no se puede atribuir a nada: todo lo que cuelga de ella —el bloqueo «cedida a terceros», la pérdida ante la competencia, el conteo de facturas cedidas— se queda sin base.

### 3. Invariantes del activo

Se validan **en el origen** —`GeneradorDatos/datasets/cesiones.js` para la entrega sintética— y una cesión que los rompa no se emite. Es el único punto donde todavía se pueden arreglar: un consumidor que reciba `MontoCesion > MontoDocumento` no tiene con qué.

1. **`FechaCesion` ≥ `FechaEmisionDTE`.** No se cede una factura que todavía no se emitió.
2. **`MontoCesion` ≤ `MontoDocumento`.** La **cesión parcial** es válida —se cede parte del crédito y el resto queda con el cliente, hoy 160 de 1.300— pero ceder más sería transferir un crédito que no existe. La cota «o menor» hay que **ejercitarla**: si todas las cesiones vienen por el total exacto, el invariante se cumple sin que nada lo pruebe.
3. **Un documento se cede UNA vez.** Dos cesiones del mismo folio serían dos dueños del mismo crédito, que es justamente lo que el registro electrónico existe para impedir.
4. **Sólo documentos cedibles:** a crédito, sin nota de crédito y sin reclamo.
5. **`MontoDocumento` es el `MntTotal` del A1**, y el resto de los campos de §1.2 también. El activo no puede contradecir al documento que dice ceder.

### 4. El padrón de cesionarios

AECSync identifica al cesionario pero **no dice de qué tipo es** — no es un dato del SII sino del mercado. Ese padrón es nuestro (`GeneradorDatos/lib/cesionarios.js`, espejado en el fuente) y clasifica cada cesionario **por RUT**:

- **`banco`** — es un banco o la filial de factoring de un banco. **AECSync registra las cesiones bancarias y las no bancarias**, así que esta partición se mide y no se supone.
- **`target`** — los que se miran de frente. Es política **comercial del tenant**, no una propiedad del cesionario, así que lo del padrón es sólo el **default** (hoy BCI Factoring · Banco Santander): quién es target se edita en `Configuración › Factoring target` y el consumidor reagrupa con esa configuración. Por eso no tiene que ser bancario: `target` se evalúa **antes** que `banco` y la partición sigue siendo exhaustiva y disjunta.
- **`nuestro`** — Factoring Security: cartera propia, no competencia.

**La identidad es el RUT, no el nombre.** Un trozo de razón social no clasifica: «eurocap·**ita**·l» contiene el «ita» de «Itaú», y con el mix midiéndose sobre esta clasificación eso no es un KPI torcido sino una porción entera mal atribuida. Un cesionario que el padrón no declara cae en «otros factoring» —el balde conservador— y la corrida lo **informa**: es un padrón desactualizado, y en silencio se ve igual que un dato correcto.

### 5. Qué consume

| Consumidor | Qué usa |
|---|---|
| **Mix de financiamiento** (columna SOW del tubo) | El reparto por cesionario, medido por `MontoCesion`. Se mide acá y se **inyecta en el A11**, que es de donde la pantalla lo lee (Levantamiento §5.6). Los cuatro agregados del A11 se publican con el padrón por defecto; lo que manda es `SOW_DETALLE_JSON` —la medición, cesionario por cesionario— que el consumidor **reagrupa** con el target que su tenant declara |
| Bloqueo de una factura candidata | «Cedida a terceros» con el nombre del factoring y la fecha, o «Ya financiada» si la cesión fue a nosotros; y «Cedida en parte · por X de Y» cuando es parcial |
| Pérdida por cesión de una oportunidad | Las facturas de ESA oferta que se llevó otro, y quién |
| **O06** del motor de otorgamiento | `MontoCesion` contra `MontoDocumento`, documento a documento |
| A11 · Plataforma 360 | Colocación promedio 12m y fecha de primera operación, medidas sobre las cesiones a nosotros |
| Prospección | `CESIONARIOS_MERCADO`: un candidato por definición no nos cede |

### 6. Ejemplo

`aecsync_notificacion.json` al lado de este archivo trae el registro tal como llega.

---

## APIs

La primera la **expone NEX** para que Security actualice la tabla interna dentro del día; las otras tres las **consume** NEX.

### swagger_actualizacion_intradia.yaml · A22

**Versión 1.0.1 · 16-09-2026 · NEX Factoring**

**Propósito:** endpoint **expuesto por NEX** para que Security actualice la **tabla interna** (montada desde las entregas diarias de otorgamiento A16, verificación A10 y Plataforma 360 A11) cuando los registros varían dentro del día. La aplicación nunca consulta a Security en línea: siempre lee la tabla interna (batch + estos upserts).

| Endpoint | Uso |
|---|---|
| `POST /upsert` | Upsert de registros por dominio (`OTORGAMIENTO` \| `VERIFICACION` \| `PLATAFORMA360`). Cada registro: `rut` (+ `rutContraparte` si la variable es del par C-D) + mapa `variables` cuyos nombres **coinciden con el layout del CSV del dominio** (p. ej. `CMF_DIR_MOROSA_30_90`, `V02_PCT_PAGADO_3M`, `VENTAS_SII_A3_M`). Responde aplicados/rechazados con detalle. |
| `GET /estado` | Observabilidad: timestamp de la última carga batch, del último upsert y conteo de registros por dominio. |

**Semántica:** upsert parcial — sólo se actualizan las variables enviadas; el resto del registro se conserva. Timestamp por registro; la UI muestra "Actualizado hh:mm".
**Casos de uso típicos:** regularización de una mora TGR (des-bloquea un HARD_BLOCK en la re-evaluación), degradación intramés de V07/V08 (mora/reclamos del par), cambio de línea aprobada tras comité.
**Seguridad:** mTLS o OAuth2 client-credentials (por definir); origen autorizado único (Security). Reintentos idempotentes: mismo registro + mismo timestamp no duplica.
**Auditoría:** cada upsert queda en la bitácora de NEX (origen, dominio, n° registros, timestamp).

### swagger_consulta_lineas.yaml · A23

**Versión 1.1.1 · 21-09-2026 · NEX Factoring**

**Propósito:** responder, en el momento de evaluar una oferta, **cuánto cupo hay disponible** en los tres niveles que la regla de validación compara. Es la API que alimenta el motor de asignación de líneas (`Specs_Procesos/Lineas/spec-asignacion-lineas.md`).

| Endpoint | Uso |
|---|---|
| `POST /consulta` | Cupo de un cliente y de todos los deudores de la operación, en los tres niveles |

**Frecuencia:** bajo demanda, **una sola llamada por evaluación** con todos los RUT deudores. No una llamada por deudor: el motor reevalúa la operación completa (§4.2 del spec de líneas) y N llamadas devuelven N snapshots distintos.

### Los tres niveles

La regla de validación es `monto_factura ≤ min(disponible_cliente, disponible_cliente_deudor, disponible_deudor)`. La API devuelve exactamente esos tres, y no obliga al consumidor a derivarlos:

| Nivel | Qué es | Líneas que agrupa | Alcance |
|---|---|---|---|
| **Cliente** | Cupo del cliente | **LF1** (inicial) y **LF4** (otros deudores) — comodines, sin RUT deudor | Compartido entre **todos** los deudores de la operación |
| **Cliente-deudor** | Cupo del par | **LF2** (normal) y **LF3** (puntual) | Exclusivo de ese par |
| **Deudor** | Exposición máxima del factoring a ese deudor | — | Compartido entre **todos los clientes** que le ceden, incluidas carteras de otros ejecutivos |

**El nivel cliente viene UNA vez, no por deudor.** LF1 y LF4 son pozos comodín: repetirlos por deudor y sumarlos duplica cupo que no existe.

### Los cuatro montos

En los tres niveles y en cada línea individual:

```
disponible = aprobada − utilizada − reservada
```

| Campo | Significado |
|---|---|
| `aprobada` | Lo que el comité aprobó |
| `utilizada` | **Exposición viva**: cedido y no pagado. Una factura vencida e impaga **sigue consumiendo**; el cupo se libera **sólo cuando el deudor paga** |
| `reservada` | Cupo comprometido por operaciones aceptadas y aún no aprobadas por Operaciones |
| `disponible` | Lo que queda para operaciones nuevas |

#### Quién es dueño de la reserva

**NEX sólo lee.** El ciclo de vida es del sistema de gestión de líneas y lo cierra el core:

1. Mientras el cliente no acepta, lo que existe es una **evaluación**, no una reserva. Este endpoint es consulta y no persiste nada.
2. **El cliente acepta** → el sistema de gestión de líneas **crea la reserva** (`reservada` sube).
3. **Operaciones aprueba en el core** → el core **commitea la reserva**: la elimina y la convierte en línea utilizada (`reservada` baja, `utilizada` sube por el mismo monto).

Consecuencia para el consumidor: una operación ya aceptada no depende de que NEX vuelva a evaluarla para conservar su cupo.

#### La asignación se calcula sobre el disponible que devuelve esta API

No hay corrección del lado del consumidor. `disponible` es el número con el que se asigna, tal como llega: la evaluación anterior de una operación no reserva cupo, no protege facturas y no entra al cálculo. Lo que el consumidor sí guarda es la **versión de la simulación**, que congela el resultado de cada evaluación como evidencia y permite mostrar qué se movió entre una y otra —una línea ampliada, o cupo consumido por otro negocio cursado por otro canal—. Ver §4.3 del spec de asignación de líneas.

### Reglas de la respuesta

- **Snapshot único.** `consultadoEn` vale para los tres niveles. Si se arman desde lecturas de instantes distintos, la comparación `min(...)` cruza estados que nunca coexistieron y deja pasar operaciones sobre cupo inexistente.
- **Línea suspendida.** Conserva su `utilizada` —la suspensión no libera lo ya cedido— pero no admite operaciones nuevas: devuelve `disponible = 0`. No omitir la línea: el consumidor necesita distinguir «suspendida» de «inexistente» para explicar el motivo del rechazo.
- **Par sin línea propia.** Se devuelve igual, con montos en cero y `sinLineaPropia = true`. El motor lo necesita para saber que el único camino de ese deudor es la LF4 del nivel cliente, y que el motivo de un eventual rechazo es `lf4` y no `par`.
- **Elegibilidad expuesta, no en duro.** `soloPrime` (LF1) y `unSoloUso` (LF1, LF3) viajan en la respuesta para que el motor no lleve esas reglas escritas en su código.
- **Tope propio del cliente.** `topePropio = false` significa que el nivel cliente es un consolidado de reporte y **no puede bloquear por sí solo** (si cada par está dentro de su línea, la suma también). Sólo bloquea si el comité asignó un tope inferior a la suma de los cupos.
- **`version`** por línea, para el control de concurrencia optimista del curse.

### Relación con los otros activos de línea

| Activo | Qué aporta | En qué se diferencia de A23 |
|---|---|---|
| **A7** — CSV diario de líneas vigentes | La **estructura** de las líneas del cliente | Batch, una vez al día; sin nivel deudor y sin reservado |
| **A8** — Montos de líneas | Refresco **horario** de uso/disponible de las líneas de A7 | Por `idLinea` y por cliente; no trae reservado ni la exposición global del deudor |
| **A23** — Esta API | Cupo **al momento de evaluar**, en los tres niveles, con reservado | Bajo demanda, una llamada por evaluación |

A7/A8 alimentan la vista «Líneas» del menú, que es fotografía de cartera. A23 alimenta la decisión de cursar, que exige el dato fresco y el nivel deudor.

**Resiliencia:** ante error o timeout, la evaluación **no se completa** y el resultado queda en «Por evaluar». Es preferible a mostrar un cursable calculado con cupos viejos: el ejecutivo compromete plazos de giro sobre esa cifra.

### Unidad de los montos

`aprobada`, `utilizada`, `reservada` y `disponible` van en **pesos**, enteros, en los tres niveles.

Se llamaban `aprobadaMM` y compañía y viajaban en millones. Eso obligaba al consumidor a reinflar a
pesos para comparar contra el monto de una factura —que sí es exacto— y cada ida y vuelta perdía
hasta $100.000 por línea. El millón es una abreviatura de pantalla; el contrato no la usa.

El cupo que aprueba el comité **puede ser cualquier monto**: típicamente es una cifra redonda, pero
el consumidor no debe suponerlo. `disponible = aprobada − utilizada − reservada` se cumple de forma
exacta, sin tolerancia.

### swagger_montos_lineas.yaml · A8

**Versión 1.0.1 · 16-09-2026 · NEX Factoring**

**Propósito:** refrescar durante el día los **montos** (uso, disponible, proyección, morosidad) de las líneas cargadas por el batch diario `s3_lineas_vigentes.csv` (A7). La estructura de las líneas viene del CSV; esta API sólo actualiza montos.

| Endpoint | Uso |
|---|---|
| `GET /montos` | Todos los montos vigentes. Parámetro `desde` (timestamp) para modo **delta** — sólo líneas con cambios. |

**Frecuencia:** pull de NEX **cada 1 hora** (mostrado en la UI como "Montos actualizados vía API: hh:00").
**Clave de correlación:** `idLinea` (mismo `ID_LINEA` del CSV A7); si no existe en la carga del día, el registro se ignora y se loguea.
**Resiliencia:** ante error o timeout, NEX conserva los últimos montos válidos y reintenta al ciclo siguiente (backoff); la UI muestra la hora del último refresh exitoso.

### swagger_gestion_lineas.yaml · A13 / A14 / A15

**Versión 1.0.0 · 29-08-2026 · NEX Factoring**

**Propósito:** integrar NEX con el sistema externo de gestión de líneas (comité). NEX **sólo inyecta y consulta**; la resolución (aprobación/rechazo/observación) ocurre en el sistema externo.

| Endpoint | Activo | Uso |
|---|---|---|
| `POST /solicitudes` | A13 | Inyecta la solicitud creada por el wizard "Crear Presentación" (tipo CREAR/RENOVAR/MODIFICAR + subtipo, líneas propuestas, subproductos, deudores con nota/política 25-30%/flags/productos, fianzas, garantías y las 5 notas comerciales). Devuelve `idProceso`. |
| `GET /solicitudes` | A14 | Lista los procesos en gestión → alimenta el sub-tab "En proceso" (Bandeja). Filtros por RUT y estado. |
| `GET /solicitudes/{idProceso}` | A15 | Estado y trazabilidad de un proceso — consulta **pull** (historial de estados con fechas y observaciones). |
| `POST /callbacks/estado-solicitud` | A15-push | **Actualización de estado PUSH**: callback **expuesto por NEX** para que el sistema de gestión notifique cambios de estado sin esperar el pull. Si el estado es APROBADA incluye las condiciones finales resueltas por el comité; si es OBSERVADA/RECHAZADA, la observación es obligatoria. Idempotente. |

**Tipos de solicitud sobre el mismo `POST /solicitudes`** (discriminador `tipo`): **CREAR** (nueva línea — cliente sin línea o empresa nueva; `subtipoModificacion` no aplica), **RENOVAR** (renueva vigencia de la línea actual), **MODIFICAR** (requiere `subtipoModificacion`: AGREGAR_CREDITO, MODIFICAR_VENCIMIENTO, AGREGAR_DEUDORES, REGULARIZAR_DEUDORES, REBAJAR_LINEA, RATIFICAR_EXCESO).

**Estados:** EN_GESTION → EN_ANALISIS_RIESGO → EN_COMITE → APROBADA | OBSERVADA | RECHAZADA. **El desenlace viaja también por línea de detalle** (`lineasDetalle[].estado`, ADR-0015): el comité aprueba o rechaza línea a línea, y NEX aplica RECHAZADA al consultarla —retira de la oferta las facturas del deudor cuya línea se rechazó, deja versión y reabre la operación para una nueva firma; si no queda ninguna, la pierde con causa (regla 68)—. `observacion` es obligatoria si OBSERVADA o RECHAZADA.
**Reglas:** `subtipoModificacion` obligatorio si tipo=MODIFICAR · una línea no admite dos solicitudes en gestión (409) · montos en MM$ · `notaDeudor` escala 1–5 (política de compra ≥ 3,7).
**Frecuencia:** POST por evento (Solicitar VB); GET al abrir la Bandeja y con "Consultar estados".
**Autenticación:** por definir con el equipo del sistema de gestión (se sugiere OAuth2 client-credentials).

---

## Anexo · Control de versiones

**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.

| Versión | Fecha | Qué cambió |
|---|---|---|
| **1.2.1** | 21-09-2026 | Rutas de los documentos citados, tras agrupar la documentación por carpetas. |
| 1.2.0 | 18-09-2026 | Correcciones del A16: D02–D13 son excepciones no re-evaluables y no bloqueos firmes, C47–C50 salen del catálogo y el tipo `porDeudor` lo declara la regla. |
| 1.1.0 | 17-09-2026 | V04 y V10 pasan a ser alcanzables con el A10, y las comparaciones del predictor van en pesos. |
| 1.0.0 | 16-09-2026 | Primera versión: reúne los doce specs de integración, ya sobre S3. |
