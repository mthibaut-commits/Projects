# Análisis — Solicitud de Línea al Comité (Crear Presentación)

**Módulo:** Tab **Líneas** · NEX Factoring (demo)
**Naturaleza:** El sistema **solo genera la solicitud** (inyección). La revisión y decisión del comité ocurren en **otro sistema**, integrado vía API. Nuestra app inyecta, lista y consulta estado — no resuelve.
**Fase actual:** Análisis (este documento). La implementación va en un turno dedicado posterior.

---

## 1. Objetivo

Permitir que el ejecutivo prepare y envíe una **presentación al comité** para:
- **Crear** una nueva línea‑producto para un cliente, o
- **Editar** condiciones ya aprobadas en un comité anterior (renovar / modificar).

La presentación es un **conjunto estructurado de información** (6 secciones) que se arma con datos traídos de las APIs y con lo que el ejecutivo propone. Al enviarse, queda como una **solicitud en gestión** en el sistema externo.

---

## 2. Estructura del tab Líneas y navegación

El tab **Líneas** se reestructura en **2 sub-tabs**:

### Sub-tab 1 — **Vigentes** (líneas vigentes)
- Es la tabla de líneas que hoy vive en el tab, **más el recomendador** por línea: indica si la línea **está bien** o si **hay que modificarla** (y qué tipo de modificación sugiere: ampliar, renovar próxima a vencer, rebajar por baja utilización, regularizar exceso, etc.).
- **Origen de datos:**
  - Las líneas se **inyectan diariamente desde un archivo CSV vía SFTP** (carga batch).
  - Los **montos (utilizado/disponible) se actualizan cada 1 hora vía API**.
  - En la demo: se simula la carga batch como el seed inicial y el refresh horario como un tick que actualiza montos; se muestra "Última carga CSV: dd-mm hh:mm · Montos actualizados: hh:mm".
- **Punto de entrada — Modificar / Renovar:** haciendo **click en una línea** de Vigentes se inicia la solicitud de **modificación o renovación** de esa línea → abre **Crear Presentación** pre-cargada con el cliente, la línea actual y el tipo sugerido por el recomendador (el ejecutivo puede cambiarlo entre Renovar y los subtipos de Modificar).

### Sub-tab 2 — **En proceso** (Bandeja)
- Líneas que están con una **solicitud de creación / modificación / renovación en gestión**.
- Es la **Bandeja**: lista de solicitudes en gestión (**API 2**) con su estado (**API 3**).
- Cada fila: cliente, tipo/subtipo de solicitud, montos propuestos, fecha de presentación, estado (en gestión / aprobada / rechazada / observada), última actualización de estado.
- **Punto de entrada — Crear Línea (nueva):** desde este sub-tab, botón **"+ Nueva línea"** → abre **Crear Presentación** con tipo **Crear Línea** para un cliente sin línea vigente (selector de cliente de la cartera).
- Fuera del punto de entrada, la Bandeja es solo consulta: la resolución ocurre en el sistema externo.

### Crear Presentación
- Asistente de 6 pasos (wizard con barra de progreso tipo chevrons). Entradas: **click en línea de Vigentes** → Modificar/Renovar (pre-cargada); **"+ Nueva línea" en En proceso** → Crear Línea (cliente nuevo en líneas).
- Footer: **Guardar · Cancelar · Anterior · Siguiente**; en el último paso además **Vista Previa · Solicitar VB**. Accesos **FICHA / COMITÉ**.
- Al inyectarse (API 1), la solicitud aparece en **En proceso** y la línea correspondiente queda marcada "con solicitud en curso" en Vigentes.

### Patrón interactivo de llenado por paso (recuperar → aceptar → editar → confirmar)
El llenado de cada sección desde las APIs **no es silencioso**: es un flujo interactivo en 4 momentos.

1. **Recuperar.** Al entrar a un paso, el sistema consulta la(s) API(s) de ese paso y muestra un panel de recuperación: *"Recuperamos esta información de [API 4 · Plataforma 360 / API 6 · Riesgo BICE / API 5 · Documental]"*, con un resumen de lo obtenido (n° de campos, fecha/hora de la consulta, fuente) y un preview de los datos. Estados visibles: consultando… / recuperado / error (con botón Reintentar).
2. **Aceptar la recuperación.** El ejecutivo revisa el preview y presiona **"Aceptar y cargar"** → recién ahí los datos se vacían en los campos/tablas de la sección en la UI. (Alternativa: "Descartar" deja la sección vacía para llenado manual.)
3. **Editar.** Con los datos vaciados, el ejecutivo edita lo editable (montos propuestos, fechas, deudores, flags, notas). Los campos que son de solo lectura por regla (firmográfica, deuda CMF, documentos) quedan bloqueados pero visibles con su fuente.
4. **Confirmar el paso.** Para avanzar con **Siguiente**, el paso exige confirmación explícita (**"Confirmar sección"** o el propio Siguiente actúa de confirmación con un check visible en el chevron del progreso). Cada sección confirmada queda con ✓ en la barra; volver Atrás permite re-editar y, si se desea, **re-recuperar** de la API (advirtiendo que se sobreescriben los datos cargados, no las ediciones propuestas del ejecutivo, que se conservan).

Mapa paso → API del panel de recuperación: Paso 1 (Comité y Cliente) → API 4 + API 5 · Paso 2 (Financiera) → API 6 + API 4 · Paso 3 (Línea) → datos internos (CSV/API horaria) · Paso 4 (Deudores) → API 4 **por cada deudor agregado** (mismo patrón en miniatura: recuperar → aceptar → editar en el modal del deudor) · Paso 6 (Notas) → generación IA sobre API 4 (el borrador IA también se acepta antes de editar).

---

## 3. Tipos de solicitud (API 1 · Inyección)

| Tipo | Subtipo | Qué hace |
|---|---|---|
| **Crear Línea** | — | Nueva línea‑producto (Factoring y/o Confirming) |
| **Renovar Línea** | — | Renueva la línea vigente (nueva vigencia, típicamente 1 año) |
| **Modificar Línea** | Agregar crédito | Aumenta el cupo aprobado |
| | Modificar vencimiento | Cambia la fecha de vencimiento de la línea |
| | Agregar deudores | Incorpora deudores nuevos a la línea |
| | Regularizar deudores | Ajusta condiciones/estado de deudores ya en la línea |
| | Rebajar línea | Reduce el cupo aprobado |
| | Ratificar exceso | Formaliza un uso por sobre el cupo |

Cada línea ingresada se asocia a un **producto** (ej. FACTURA, CHEQUE PROPIO) y genera una solicitud con **vigencia** (≈ 1 año). En modificación, el ejecutivo puede además pedir una **línea puntual** asociada a un producto (ej. Facturas) para aprobar un **deudor específico** y/o un **subproducto Factoring**.

---

## 4. APIs (mockeadas como servicios deterministas en la demo)

| # | API | Rol en el módulo |
|---|---|---|
| **1** | **Inyección** | Crea la solicitud (Crear/Renovar/Modificar + subtipos). Devuelve un `idProceso`. |
| **2** | **Listar procesos** | Lista todas las solicitudes en creación/modificación/renovación en gestión → alimenta la Bandeja. |
| **3** | **Consultar estado** | Estado de un proceso en gestión (por `idProceso`). |
| **4** | **Empresa · Plataforma 360** | Info firmográfica, comercial, socios, índices/ventas/ratios, y datos del deudor al agregarlo. |
| **5** | **Documental factoring** | Recupera documentos del repositorio (+ los que Datamart ya recuperó: Carpeta Tributaria, Cert. Deuda Tesorería). |
| **6** | **Riesgo Crédito BICE** (swagger) | Deuda y riesgo financiero. 9 endpoints: clasificación deudora, consolidado, deuda BICE, boletín comercial, previsional, protestos, tipo de cambio, mora ACHEF, mora CMF. |

> Nota: en el documento original nombraste 5 APIs; el swagger de Riesgo BICE es una fuente adicional (la trato como "API 6" para la sección Financiera). Al implementar, cada una será un servicio mock determinista por RUT (con `hashStr`) para que los datos sean estables y coherentes.

---

## 5. Las 6 secciones del asistente

### Paso 1 — Información de Comité y Cliente
**INFORMACIÓN RUT** *(línea + productos, propio + API 4)*: Rut/Nombre · Estado de Línea (Vigente/…) · Motivo (Crear/Renovar/Modificar) · Producto (Renovar Línea Factoring, Confirming…) · Requiere Directorio (Automático/Sí/No) · **Fecha Presentación a Comité** (date picker editable).
**INFORMACIÓN CLIENTE** *(API 4)*: Fecha Ingreso · Fecha Primera Operación · Actividad Económica · Sector Económico · Página Web · Origen · N° Trabajadores · Empresas Relacionadas · Cliente Banco · Deudor · Solicitudes y Reclamos · Gestión Comercial · Alertas.
**INFORMACIÓN COMERCIAL** *(API 4)*: Línea Global Aprobada/Utilizada · Fecha Vencimiento · Monto Aprobado/Utilizado Deudor · Fecha Última Operación · Jefe de Grupo · Asistente Comercial · Gestionador de Cobranza · Quintil · Margen Contribución (último mes / 12m) · Colocación Promedio 12m · Spread Real 12m · Tasa Última Operación · Comisión Última Operación · Segmento · Sub‑Segmento.
**DOCUMENTOS ADJUNTOS** *(API 5 + Datamart)*: tabla Tipo · Nombre · Año · Versión · Usuario · Fecha Creación · Emisión · Vencimiento · Comentario · Descargar/editar/eliminar. Tipos: Riesgo, Legal, Comercial (Contrato Marco, Mandato/Pagaré, Informe de Poderes, Carpeta Tributaria, Cert. Deuda Tesorería y Convenios, Compliance Tracker, Circular…).
**SOCIOS** *(API 4)*: Rut · Nombre/Razón Social · Deuda Directa/Indirecta · Fecha Info por Cliente · Informes Comerciales · Participación % · Socio Otra Empresa · PEP · FATCA · Aprobación Legal.

### Paso 2 — Datos Financieros y Riesgo *(API 6 swagger + API 4)*
**INFORMACIÓN FINANCIERA**: Deuda Info por Cliente (Directa $ / Indirecta $ / Leasing UF) · ÍNDICES (Pas.Exigible/Gen.Bruta · Patrimonio · Generación · Leverage) · VENTAS 2024/25/26 · VENTAS SII 2024/25/26 (con "N de 12 meses").
**RATIOS**: Línea/Patrimonio · Línea/Ventas · Deuda/Ventas · Línea/Deuda.
**ÍNDICES INTERNOS FACTORING**: Morosidad · Protesto %.
**INFORMES COMERCIALES CLIENTE**: Históricos · Vigentes.
**RIESGO CON OTRAS EMPRESAS DE FACTORING** *(mora ACHEF)*: Fecha Inf · Nro Empresas · Vigente $ · Morosas $ · Facturas $ · Cheques $ · Letras $ · Otros $ · Total.
Fuente: deuda directa/indirecta y mora → **CMF / Deuda BICE**; informes comerciales → **Boletín Comercial**; protestos → **Protestos**; previsional → **Deuda Previsional**; ACHEF → **Mora ACHEF**; índices/ventas/ratios → **API 4**.

### Paso 3 — Información de Línea *(propuesta del ejecutivo)*
**INGRESO DE LÍNEAS**: Fecha Venc. Actual · Línea Global Actual · Línea Global Utilizada · Spread 12m · **Fecha Vencimiento (editable)** · Productos No Factoring · Líneas Puntuales Factoring · **Línea Global Propuesta** · **Línea Factoring Propuesta** · **Línea Confirming Propuesta** · **Total Propuesto** (= suma).
**SUBPRODUCTO FACTORING** (agregar): Tipo Documento (CHEQUE PROPIO / FACTURA) · Monto Aprobado · Monto Utilizado · Línea Factoring Propuesta · Anticipo % · Plazo Máximo Documento (días).
**OPERACIONES PUNTUALES FACTORING** (agregar): Actual (Tipo Doc · Aprobado · Utilizado · Fecha Venc. Actual · Observación) / Propuesto (Propuesto · Fecha Venc. · Observación).
**SUBPRODUCTO CONFIRMING** (agregar): Tipo Dcto · Monto Aprobado/Utilizado · Línea Confirming Propuesta · Monto Propuesto en Moneda · Tipo Cambio · Fecha Tipo Cambio · Moneda · Garantía · Cesión · Pagaré · Prórroga.
**FIANZA SOLIDARIA** (agregar): Rut · Nombre · Régimen Matrimonial · Estado de Situación · Socio Otra Empresa · PEP · FATCA · Aprobación Legal.
**GARANTÍAS** (agregar): Tipo Garantía · Institución · Producto · ID Garantía · Operación · Fecha Inicio/Término · Monto · % Cobertura · Aprobación Legal.
**HISTORIAL DE OPERACIONES** (Últimos 12m / Histórico): Cantidad Docs Comprados · Monto Comprado · Monto Cancelado por Deudor · Monto Cancelado por Cliente · Índice Protesto/Prórroga · Cuotas Leasing (pagadas fuera plazo / morosas) · Cuotas Crédito (pagadas fuera plazo / morosas) · Morosidad Factura >45% / >90%.

### Paso 4 — Información Deudores *(clave · Nota Deudor + API 4)*
**DEUDORES FACTORING** (tabla editable): **Nota** (Nota Deudor 1–5, coloreada) · Cliente/Deudor · Política %Línea · Rut · Nombre/Razón Social · Monto Anterior · Monto Utilizado · **Línea Factoring Propuesta** · Referencia (Ver) · Info Deudor Directa/Indirecta · Concentración por Deudor · flags **V/N/C/FR/CP** (Verificación, Notificación, Cobranza, FA Respaldo, Cheque Pago) · editar/eliminar. Pie: **Otros Deudores Límite Máx. %** · **Prom. Ponderado** (nota ponderada). Acciones: Revisión Inf. Com. · Modificar varios deudores · Importar RUT · **Agregar Deudor Factoring**.
**Modal EDITAR DEUDOR FACTORING**: Rut/Nombre · Monto Anterior/Utilizado · **Monto Propuesto** · Info Deuda Directa/Indirecta · Fecha Inf. Cliente · flags Verificación/Notificación/Cobranza/FA Respaldo/Cheque Pago · **LISTADO DE PRODUCTOS** (Producto ej. FACTURA · Mto Anterior/Utilizado/Propuesto · Agregar Producto).
**Regla:** el ejecutivo agrega **buenos deudores según la Nota Deudor**, pudiendo agregar/editar montos y condiciones. **Cada vez que se agrega un deudor se llama a la API 4** (Plataforma 360) para traer su información.

### Paso 5 — Información de Bienes *(condicional)*
Aparece atenuado en las pantallas; aplica a garantías/bienes (leasing). En v1 lo dejo **opcional/placeholder** salvo que definas su contenido.

### Paso 6 — Presentación Comercial *(5 notas · generadas con IA)*
Cinco áreas de texto libre: **Negocio Propuesto · Referencias Comerciales · Antecedentes Generales · Aspectos de Mercado · Análisis Financiero**. Botones: Guardar · Cancelar · **Vista Previa** · **Solicitar VB** · "Copiar Comentarios".
**IA:** cada nota se **redacta con IA** a partir de la información de la **API 4** (y lo ya cargado en pasos previos). En la demo: un generador que compone texto determinista por RUT + los datos de la presentación (firmográfica, comercial, financiera, deudores, línea propuesta).

---

## 6. Modelo de datos de la solicitud (borrador)

```
Solicitud {
  idProceso            // API 1 devuelve
  rutCliente, razonSocial
  tipo                 // crear | renovar | modificar
  subtipoModificacion  // agregar_credito | modif_vencimiento | agregar_deudores |
                       // regularizar_deudores | rebajar_linea | ratificar_exceso | null
  estado               // borrador | inyectada | en_gestion | aprobada | rechazada | observada  (API 3)
  fechaPresentacionComite, requiereDirectorio
  vigencia             // ~1 año
  // Paso 3
  lineaGlobalPropuesta, lineaFactoringPropuesta, lineaConfirmingPropuesta, totalPropuesto
  fechaVencimientoPropuesta
  subproductosFactoring[]   // {tipoDoc, aprobado, utilizado, propuesta, anticipo, plazoMax}
  operacionesPuntuales[]    // {actual{...}, propuesto{...}}
  subproductosConfirming[]
  fianzasSolidarias[], garantias[]
  // Paso 4
  deudores[]           // {rut, razonSocial, nota, montoAnterior, montoUtilizado, propuesta,
                       //   politicaPctLinea, deudaDirecta, deudaIndirecta, concentracion,
                       //   flags{V,N,C,FR,CP}, productos[]}
  otrosDeudoresLimiteMaxPct, promPonderado
  // Paso 6
  notas { negocioPropuesto, referenciasComerciales, antecedentesGenerales, aspectosMercado, analisisFinanciero }
}
// Snapshots read-only por RUT: empresa (API4), financiero (API6), documentos (API5), socios (API4)
```

---

## 7. Ciclo de vida y estados

```
Borrador ──(Solicitar VB / Enviar)──► API 1 Inyección ──► En gestión (sistema externo)
                                                             │  API 2 lista · API 3 estado
                                                             ▼
                                        Aprobada · Rechazada · Observada  (solo consulta)
```
La app **no** cambia el estado a aprobado/rechazado; solo **inyecta** y **refleja** el estado que devuelve la API 3. La Bandeja se refresca con API 2.

---

## 8. Reglas de negocio a respetar

1. El sistema **solo inyecta y consulta**; no aprueba.
2. **Total Propuesto = Línea Factoring Propuesta + Línea Confirming Propuesta** (+ no factoring), reactivo a los inputs.
3. Cada **línea ↔ producto**; vigencia ≈ 1 año.
4. **Línea puntual**: en modificación, aprueba un deudor/subproducto específico.
5. **Deudores por Nota Deudor**: se agregan "buenos deudores"; agregar deudor **dispara API 4**.
6. **Prom. Ponderado** de la nota se recalcula con los montos propuestos.
7. Fechas editables con **calendario** (Presentación a Comité, Vencimiento propuesto, etc.).
8. Datos de API (firmográfica, financiera, documentos, socios) son **solo lectura** en la presentación.

---

## 9. Generación IA de las 5 notas comerciales

Entrada: API 4 (firmográfica + comercial) + snapshot financiero (API 6) + deudores y línea propuesta del propio asistente.
Salida: borrador editable de las 5 notas. En la demo, un generador determinista por RUT que arma cada nota con los datos disponibles (p. ej. "Negocio Propuesto" resume tipo de solicitud + línea propuesta + productos; "Análisis Financiero" usa leverage, ventas, morosidad y protestos). El ejecutivo puede editar antes de "Solicitar VB".

---

## 10. Plan de implementación (turno siguiente)

1. Reestructurar el tab **Líneas** en sub-tabs **Vigentes / En proceso**: Vigentes = tabla actual + recomendador por línea + metadatos de carga (CSV SFTP diario, montos vía API cada hora, simulados); En proceso = Bandeja (API 2 + API 3).
2. Servicios mock deterministas por RUT: `api1Inyeccion`, `api2ListarProcesos`, `api3EstadoProceso`, `api4Empresa360`, `api5Documentos`, `api6RiesgoBICE`.
3. Estado de "solicitudes en gestión" (persistido en memoria) + marca "con solicitud en curso" en la línea vigente.
4. Wizard `PresentacionComite` de 6 pasos con barra de progreso, footer y validaciones mínimas por paso; pre-carga desde el recomendador (cliente + tipo sugerido).
5. Reactividad de Total Propuesto, Prom. Ponderado y el disparo API 4 al agregar deudor.
6. Generador IA de las 5 notas.
7. Verificación en ambos archivos.

---

## 11. Preguntas abiertas (para cerrar antes de implementar)

1. **Información de Bienes** (paso 5): ¿qué campos lleva o lo dejamos como placeholder condicional a garantías?
2. **Vigencia**: ¿fija en 12 meses o editable por el ejecutivo?
3. **"Solicitar VB"** vs **enviar/inyectar**: ¿VB es un paso previo (visto bueno de jefatura) antes de la inyección API 1, o es el envío mismo?
4. **Permisos**: ¿quién puede crear la solicitud (solo ejecutivo con cartera del cliente) y quién ve la Bandeja completa (jefatura)?
5. **Nota Deudor en deudores**: ¿reuso el modelo de Nota Deudor ya implementado (1–5) para poblar la columna Nota y el Prom. Ponderado? (asumo que sí).
