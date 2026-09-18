# Proceso de Otorgamiento — Gestión de excepciones

**Versión:** 1.0 · **Fecha:** 18-09-2026 · **Sistema:** NEX Factoring · Pipeline Comercial

Este documento describe **el proceso operativo** con que se gestiona una excepción de otorgamiento:
cómo nace, quién la justifica, a quién le llega, en qué pantalla se decide, qué queda registrado en
cada paso y qué efecto tiene la decisión sobre la operación. Es la vista de **quien trabaja** el
otorgamiento —el ejecutivo comercial, los apoderados de Riesgo, Comercial y Operaciones, el equipo de
verificación— y sirve para validar el flujo con las áreas y para capacitar.

Lo que **no** repite: el modelo de riesgo (el catálogo de criterios, sus tramos y por qué el ruteo es
el par área-nivel) y el contrato del motor como servicio viven en
[`spec-otorgamiento.md`](./spec-otorgamiento.md). Acá se citan sólo cuando el proceso los necesita.

> **La premisa que ordena el documento:** una excepción es una **decisión con nombre y hora**. Todo lo
> que pasa entre que el motor la levanta y que un apoderado la firma existe para que esa decisión llegue
> **justificada** a quien tiene la **atribución** de tomarla, y para que después se pueda **auditar**.

---

## 1. Qué es una excepción, en una página

El motor de otorgamiento evalúa cada criterio del catálogo sobre la operación y produce una
**disposición** por criterio:

| Disposición | Qué significa | Qué hace el proceso |
|---|---|---|
| `aprobado` | el criterio se cumple | nada; queda como registro de auditoría |
| **`excepcion`** | se incumple, y **un apoderado puede autorizarlo** | **este documento** |
| `rechazado` | se incumple y **no se autoriza** | la operación se pierde (§8) |
| `clasificacion` | informa, no decide | se muestra, no se gestiona |

Una **excepción** es entonces un criterio incumplido que la casa puede aceptar **a sabiendas**, a
cambio de que alguien con atribución lo firme. El ciclo completo es:

```
  evaluación ──► excepción PENDIENTE ──► SOLICITADA (justificada por el ejecutivo) ──► en BANDEJA
                                            │  + ampliaciones (append-only)              │
                                            └──────────────────────────────────────────►│
                                                                                  el apoderado DECIDE
                                                                                          │
                                                                          aprobada ◄──────┴──────► rechazada
                                                                              │                       │
                                                       todas aprobadas ⇒ la operación avanza      bloqueo firme ⇒ pérdida
```

Cada excepción se identifica por su **clave de estado** (`stKey`): el número del criterio para los de
cliente y de operación (`"117"` es C17, `"305"` es O05), y `número@RUT del deudor` para los de deudor
(`"202@88390200-9"` es D02 de ese deudor). Los criterios de deudor se evalúan **una vez por cada
deudor** de la operación y se visan **por deudor**: aprobar D02 para un deudor no lo aprueba para otro.

---

## 2. Actores y atribuciones

### 2.1 Quién hace qué

| Actor | Rol en el proceso | Atribución |
|---|---|---|
| **Ejecutivo comercial** | arma la oferta, **justifica** cada excepción (comentario, respaldo o la declaración de que no tiene comentarios), la **solicita**, amplía la información y sigue el avance | ninguna: no visa criterios |
| **Apoderados de Comercial** | Jefe de Grupo Comercial · Gerente Comercial · Gerente General | Comercial **N1 · N2 · N3** |
| **Apoderados de Riesgo** | Jefe de Riesgo · Subgerente de Riesgo | Riesgo **N4 · N5** |
| **Apoderados de Operaciones** | Jefe de Operaciones · Operaciones | Operaciones **N3 · N5** |
| **Ejecutivo de verificación** | registra las llamadas al deudor (proceso aparte, [`spec-verificacion-facturas.md`](./spec-verificacion-facturas.md)); comparte la etapa «Otorgamiento / Verificación» | firma verificaciones, no criterios |
| **Super administrador** | cuenta de sistema: cubre todas las áreas en el nivel máximo | no aparece como destinatario de tareas |

La atribución **sigue al cargo, no a la persona**: el nivel y el área los implica el rol que el tenant
le asigna a cada usuario en `Configuración › Usuarios`; el catálogo de roles es de lectura. Cambiarle
el cargo a alguien le cambia la atribución. Un usuario sin rol con atribución no aprueba nada.

### 2.2 Cómo se decide a quién le toca

El ruteo de una excepción es el par **(área, nivel)**: el criterio declara el **área** y el tramo que
calzó declara el **nivel**. Con ese par se busca en el **padrón** del tenant a quienes tienen esa área
en ese nivel **o superior**.

1. Aprueba **cualquier nivel igual o superior de la misma área**, sin tope: si el cargo exacto está
   vacante o su titular ausente, lo cubre la jefatura de su área.
2. **La escalada no cruza áreas.** Un Gerente General (Comercial N3) no visa una excepción de Riesgo.
3. **El monto de la operación impone un piso.** El nivel exigido es el **mayor** entre el del tramo y
   el piso del área para el tramo de monto de la operación (§2.3). Nunca baja el nivel del tramo.
4. Un criterio **sin área no lo aprueba nadie**, y un área que el tenant no tiene tampoco: son
   configuraciones que faltan, y el motor las nombra («Sin aprobador definido», §6.4).

El cargo que se muestra como responsable es el del nivel exacto si existe; si no, el primer cargo del
área que lo alcance, marcado como escalada. Es la misma regla con que se decide quién puede firmar, así
que lo que la pantalla anuncia es quien de verdad puede hacerlo.

### 2.3 El piso por monto

| Monto de la operación | Gravedad | Comercial | Riesgo | Operaciones |
|---|---|---|---|---|
| hasta M$20 | leve | N1 | N1 | N1 |
| hasta M$60 | moderado | N2 | N3 | N2 |
| hasta M$120 | grave | N3 | N4 | N3 |
| sobre M$120 | crítico | N3 | N5 | N4 |

Cada columna **satura en el tope de su área** (Comercial en N3, Riesgo en N5): pedirle a un área un
nivel que no tiene no exige más, deja la excepción sin aprobador. Los cortes viven en la configuración
del tenant y se ven en `Configuración › Otorgamiento`, junto a las atribuciones por criterio.

**Consecuencia para el proceso:** la misma excepción, en una operación de M$15 y en una de M$90, le
llega a personas distintas. Por eso la tarjeta de la excepción muestra el **cargo vigente** calculado
en el momento, y no el que se anotó al solicitarla (§4.4).

### 2.4 Lo que la configuración vigente produce

Medido sobre `atribuciones_otorgamiento.json` (18-09-2026), el catálogo tiene **77 criterios**
(48 de cliente, 23 de deudor, 6 de operación) y **133 tramos de excepción** que rutean a:

| Área | Tramos de excepción | Por nivel exigido en el tramo | Cargo que los recibe hoy |
|---|---|---|---|
| Riesgo | **97** | N1 2 · N2 19 · N3 23 · N4 33 · N5 20 | Jefe de Riesgo 77 · Subgerente de Riesgo 20 |
| Comercial | **29** | N1 18 · N2 11 | Jefe de Grupo Comercial 18 · Gerente Comercial 11 |
| Operaciones | **7** | N1 3 · N2 1 · N3 2 · N5 1 | Jefe de Operaciones 6 · Operaciones 1 |

**Ninguno queda sin aprobador.** Riesgo no tiene cargos en N1–N3, así que sus 77 tramos de N1–N4 caen
todos en el Jefe de Riesgo por escalada: distinguirlos es dar de alta usuarios de Riesgo en esos
niveles, no cambiar el catálogo. Los niveles de la tabla son los del tramo; el piso por monto los sube.

De los 77 criterios, **28 no son re-evaluables**: los datos de burós del cliente y del deudor
(C10–C22, D02–D13) y los tres knockout de la Tesorería General (C30–C32). Sólo estos tres **rechazan**;
los 25 de burós son **excepciones** —se visan como cualquier otra— que una re-evaluación no repara,
porque una firma no borra un dato de bureau.

---

## 3. Los registros del proceso

Todo lo que el proceso escribe tiene dueño, nombre y hora. Son cinco registros por operación, más la
auditoría y la mensajería:

| Registro | Qué guarda | Quién escribe | Cuándo |
|---|---|---|---|
| **Solicitud** (por excepción) | comentario, respaldos, la declaración «sin comentarios», quién, cuándo, y el cargo y nivel **al momento de solicitar**; más las **ampliaciones** apiladas | el ejecutivo | al solicitar y al ampliar (§4.2, §4.3) |
| **Visado** (por excepción) | `aprobado` / `rechazado`; ausente = pendiente | el apoderado | al decidir; se borra al revertir |
| **Detalle del visado** (por excepción) | justificación de la decisión, respaldos, quién (con su reemplazo, si cubre a otro), cuándo | el apoderado | junto con el visado |
| **Bitácora de otorgamiento** (por operación) | cada evento del proceso con actor y fecha-hora: solicitud, ampliación, pre-evaluación, decisión, pérdida por bloqueo firme, integración | el sistema, en cada acción | append-only |
| **Pre-evaluación** (por operación) | que el ejecutivo pidió adelantar la revisión: quién y cuándo | el ejecutivo | al enviar a pre-evaluación |
| **Auditoría** (global) | módulo, acción, glosa, actor, éxito, severidad, y la **huella encadenada** de cada registro; incluye los **intentos rechazados** por atribución | toda acción | siempre |
| **Mensajería** (hilos por operación) | los avisos entre ejecutivo y apoderados: solicitud, pre-evaluación, avance, requerimientos de información | quien actúa | según la acción |
| **Tareas** | «Aprobar excepción #n …», con el par (área, nivel) como destinatario | al solicitar | vence en un día |

El visado es **evidencia regulatoria**: la decisión de un apoderado se escribe a través de un
repositorio con confirmación, y si la escritura no se confirma se audita el **intento**, no una
aprobación que no ocurrió.

---

## 4. El proceso, paso a paso

### 4.1 La excepción nace en la evaluación

El motor corre en cuatro momentos: cuando el ejecutivo pide una **pre-evaluación**, cuando aprieta
**«Re-evaluar operación»**, al **cerrar la oferta** y **tras la firma** del cliente. Agregar o quitar
facturas **no** re-evalúa: lo que depende del motor queda en «Por evaluar», sin número, hasta que
alguien lo pida.

Cada corrida produce la lista de ítems (criterio × deudor) con su disposición, el nivel exigido ya con
el piso por monto aplicado, el cargo responsable y la lista de quienes pueden firmar. Las excepciones
salen **pendientes**: nadie las ha justificado ni decidido.

**Dónde se ven.** En el **tab Otorgamiento** del detalle de la operación —que sobrevive a la firma y al
giro, porque después es el registro de quién aprobó qué— y, cuando la operación está en bandeja, en la
mesa **Otorgamientos** del menú. El tab ordena primero lo que requiere autorización, luego por
severidad y número; agrupa los criterios de cliente en un bloque y los de cada deudor en el suyo, y
cada tarjeta muestra el criterio, su hallazgo, si es re-evaluable (♻) o firme (🔒), el tramo que calzó
y un badge con la disposición.

### 4.2 El ejecutivo justifica y solicita

La justificación **precede** a la decisión: el apoderado no puede resolver algo que no le llegó
justificado. Por eso el cierre de la oferta está bloqueado mientras quede una excepción sin justificar
(§4.6), y por eso la tarjeta de cada excepción pendiente le dice al ejecutivo **«Requiere visto bueno de
{cargo} (N{nivel})»** y le ofrece **«Solicitar aprobación»**.

El formulario «Solicitar aprobación al {cargo} (N{nivel}) · comentario y respaldo» admite tres formas
de justificar, y **exige al menos una**:

1. un **comentario** para el apoderado;
2. **respaldos adjuntos** (el mecanismo de archivos del visado);
3. la casilla **«No tengo comentarios adicionales»**.

La tercera existe porque **el silencio no le sirve al apoderado**: no distingue «no aplica» de «se me
olvidó». Declararlo es una justificación válida; no declararlo deja la excepción sin justificar.

Al enviar, en un solo gesto:

- se guarda la **solicitud** con su comentario, respaldos, quién, cuándo, y el cargo y nivel vigentes;
- si la operación no estaba en bandeja, la solicitud **enciende la pre-evaluación** (§4.5), para que el
  apoderado tenga dónde visarla;
- queda el evento en la **bitácora** de la operación y en la **auditoría**;
- sale un mensaje en el hilo **«Aprobación de excepciones · {operación}»** a todos los apoderados
  hábiles para esa excepción (el super-admin no), con el comentario y los adjuntos;
- se crea la **tarea** «Aprobar excepción #n {criterio} · {cliente} · {cargo} (N{nivel}) · solicitada
  por {ejecutivo}», que guarda el par (área, nivel) y **resuelve sus destinatarios cada vez que se
  mira**: el apoderado que llega la ve y el que se fue deja de verla. Vence en un día.

**En bloque.** Cuando quedan varias sin justificar —del cliente y de todos los deudores—, el tab ofrece
«Quedan N excepción(es) sin justificar… decláralo en todas y envíalas»: manda **una solicitud por
excepción**, cada una a su apoderado, declarando que no hay comentarios adicionales. Las que ya fueron
justificadas con un comentario o un respaldo **no se tocan**.

### 4.3 Ampliar una solicitud ya enviada

Solicitar **no cierra la puerta**. Mientras la excepción siga pendiente, la tarjeta dice «En espera del
visto bueno de {cargo} (N{nivel})» y ofrece **«Agregar información»**: el contrato firmado que llega dos
días después, la aclaración que el apoderado pidió por teléfono.

- La ampliación **se apila** bajo la solicitud, con **su** autor y **su** hora; la justificación
  original no se toca, porque el apoderado pudo haberla leído ya y saber qué se sabía en cada momento es
  justamente lo que se audita.
- **Sin solicitud previa no escribe nada**: una ampliación es información *para* alguien, y fabricar
  ahí una solicitud se saltaría el aviso y la tarea. Una ampliación **vacía** tampoco: anunciaría algo
  nuevo que leer cuando no lo hay.
- Aportar respaldo **no decide nada**. Lo único gateado por atribución es **visar**.

### 4.4 A quién le llega, y por qué el cargo se calcula en vivo

La solicitud congela el cargo y el nivel **como historia** («Aprobación solicitada por … · fecha»).
Pero el requisito **se mueve**: el tramo cambia al re-evaluar y el piso sube o baja con el monto de la
operación. Por eso el destinatario vigente lo dice el **badge**, que se recalcula en cada lectura, y no
la línea de la solicitud. Dos destinatarios distintos para la misma excepción serían un error de
lectura; el vigente es siempre el del badge.

### 4.5 La compuerta de la bandeja: pre-evaluación o aceptación

**Sólo se puede visar cuando la operación está en bandeja**: desde la aceptación del cliente en
adelante (Aceptada, Otorgamiento / Verificación, Pendiente Integración, Giro), o con la
**pre-evaluación** solicitada. Antes de eso la oferta todavía se está armando, la mesa de Otorgamientos
no la lista, y la tarjeta se lo dice al apoderado con esas palabras: «La aprobación se habilita al
solicitar Pre-evaluación o tras la aceptación del cliente».

**La pre-evaluación** es el mecanismo con que el ejecutivo **adelanta** la revisión de una oportunidad
con altas chances de cursarse, para no comprometer un plazo a ciegas. Se pide desde la cabecera del
detalle (el botón no se muestra en los tabs de Otorgamiento ni de Verificación, donde el ejecutivo no
arma nada) y hace tres cosas:

1. **Advierte** si hay excepciones sin justificar: el diálogo «Excepciones sin comentario» dice
   cuántas y ofrece tres salidas: «Cancelar», «Ir a revisar» (al tab de Otorgamiento) o **«Enviar de
   todos modos»**.
2. **Solicita** en bloque toda excepción pendiente que aún no tenga solicitud, sin comentario: cada
   una queda enviada a su apoderado facultado, con su tarea y su aviso.
3. Marca la operación en **pre-evaluación** (quién y cuándo), lo anota en la bitácora y avisa por el
   hilo «Pre-evaluación de otorgamiento · {operación}» a los apoderados involucrados, con el número de
   criterios por excepcionar. Se puede **cancelar** desde el mismo botón.

El detalle vive en su propia pestaña, así que avisa al tubo para que la mesa de Otorgamientos —que vive
en la otra— la liste de inmediato.

### 4.6 El cierre de la oferta exige las justificaciones

Al cerrar la oferta, el modal de curse muestra el bloque de otorgamiento con **«Pendiente: N
excepción(es) por aclarar por parte del ejecutivo»** y **deshabilita la confirmación** mientras N sea
mayor que cero. No se puede publicar una oferta con excepciones que nadie justificó. El cierre no
decide las excepciones: sólo garantiza que lleguen justificadas.

### 4.7 El apoderado decide

**Dónde.** En dos sitios que escriben **la misma decisión**:

- La mesa **Otorgamientos** (menú › Mesa de decisión). Lista «Operaciones en otorgamiento (N)», con
  el usuario, su atribución **efectiva** («Riesgo N4», «Comercial N2 · Riesgo N4») y, si está cubriendo
  a alguien, «En reemplazo de {persona} (hasta el {fecha})». Filtra por **fase** —Todas ·
  Pre-evaluación · Evaluación · Finalizadas— y por defecto muestra **«Sólo mis pendientes»**: las
  operaciones con excepciones que **este** usuario puede accionar, con el contador «N para ti». Cada
  operación se expande en: rechazos firmes (bloquean el curse), rechazos re-evaluables (no bloquean el
  visado; dicen cómo se regularizan), **excepciones a aprobar** —las del cliente primero, luego un
  bloque por deudor—, las de **otros aprobadores** (sólo lectura, para ver el panorama) y las reglas
  aprobadas (plegadas, sólo auditoría).
- El **tab Otorgamiento** del detalle, en la tarjeta de cada excepción, con «Tu atribución permite
  visar: Aprobar · Rechazar» y un badge «para ti» por bloque.

**Qué muestra cada excepción** en la mesa: `#n · criterio`, el hallazgo, «Dominio: {área} · Aprueba:
N{nivel} · {cargo} ({área})», y «Aprueban: {nombres}» —o, en naranja, «Sin aprobador definido · requiere
{área · N} · {causa}»—; si ya se decidió, la decisión con su justificación y respaldo; y los
requerimientos de información abiertos.

**La decisión.** Aprobar o rechazar, con **justificación** y respaldo opcional. En la mesa la
justificación es **obligatoria** («La justificación es obligatoria»); en el tab del detalle el
comentario es opcional (§10). Al confirmar:

1. **Se comprueba la atribución antes de escribir**, no sólo al dibujar el botón: quien visa tiene que
   tener **hoy** el (área, nivel) que la excepción exige. La pantalla puede venir de una sesión vieja,
   de un rol que cambió o de una atribución revocada. Un intento sin atribución **no escribe** y queda
   en la auditoría como «Decisión rechazada por atribución (OTG-01)», severidad alta. En producción
   esto lo rechaza el servidor desde el rol del token; la pantalla sólo lo anticipa.
2. Si el criterio es **O05** y se aprueba, visar **crea la evidencia del contrato**: la huella del
   paquete que después compara el gate del core (§6.1).
3. Se escriben el **visado** y su **detalle**, se anota en la **bitácora** («{apoderado} aprobó /
   rechazó la excepción · regla #n … ({área} N{nivel})») y en la **auditoría**, y se invalida el
   cálculo cacheado de la operación para que el tubo, el detalle y la mesa cambien a la vez.
4. Desde la mesa, además, el apoderado **avisa su avance** (§4.9).

**Visar todo.** Un apoderado con la **aprobación masiva** habilitada (permiso por usuario, habilitado
por defecto) puede aprobar o rechazar **de una vez** todas las excepciones visables del bloque que
está mirando —el cliente o un deudor— con un solo comentario y respaldo, que se repiten en cada
criterio. Cada excepción pasa igual por la comprobación de atribución.

**Revertir.** Una decisión se puede **revertir** por quien tenga la atribución: la excepción vuelve a
pendiente y el detalle se borra. Es la misma comprobación de atribución que decidir.

### 4.8 Pedir más información desde la mesa

Un apoderado —con o sin atribución para esa excepción («Sin atribución para aprobar; puedes solicitar
información»)— puede **«Solicitar más información»**: elige el destinatario (el ejecutivo dueño de la
operación, el Gerente Comercial, la jefatura del ejecutivo, el Jefe de Operaciones o un analista de
Operaciones), escribe qué necesita (obligatorio) y adjunta un documento si corresponde. Abre un hilo
de mensajería **«Requerimiento · regla #n {criterio}»** atado a la operación y a esa excepción, que la
mesa muestra bajo la tarjeta con su último mensaje. La respuesta del ejecutivo vuelve por el mismo
hilo o como **ampliación** de la solicitud (§4.3).

### 4.9 Coordinar entre apoderados

Cuando un apoderado decide **la última excepción que le tocaba** en una operación, el sistema le avisa
al ejecutivo por el hilo «Avance de otorgamiento · {operación}»:

- «{apoderado} completó su parte del otorgamiento de {cliente}. **No quedan excepciones pendientes; la
  operación puede avanzar.**», o
- «… **Aún falta que** {cargo} (N{nivel}) excepcione {k} regla(s); … Coordina con los aprobadores para
  avanzar.», con un renglón por cargo pendiente.

Es lo que permite que Riesgo, Comercial y Operaciones trabajen la misma operación sin pasarse la
pelota: cada uno sabe qué queda y de quién.

---

## 5. El estado de la operación y sus efectos

### 5.1 El agregado

A partir de las excepciones y sus decisiones, la operación tiene **un** estado de otorgamiento:

| Estado | Cuándo |
|---|---|
| **Rechazada** | hay un rechazo firme (C30–C32) **o una excepción que un apoderado rechazó** |
| **Sujeta a aprobación** | queda alguna excepción pendiente, o un rechazo re-evaluable sin regularizar |
| **Aprobada** | todas las excepciones están aprobadas y no hay rechazos |

Además de las tres, la mesa le pone a cada operación una **fase**: **Pre-evaluación** (el ejecutivo la
adelantó y hay excepciones por decidir), **Evaluación** (el cliente ya aceptó y hay excepciones por
decidir) o **Finalizada** (no queda nada pendiente). Una operación rechazada sale de la bandeja.

### 5.2 Una excepción rechazada es un bloqueo firme

Si quien tiene el par (área, nivel) dijo **no**, dentro de esa operación no hay a quién apelar: la
escalada del modelo es por nivel, no por reintento, y quien está arriba en la misma área ya podía
haberla visto. El efecto es el mismo que el de un rechazo firme del catálogo:

- El detalle muestra el aviso rojo de bloqueo, **deshabilita** avanzar de etapa y deja como única
  acción **perder** la operación con la causa del bloqueo.
- El motor de fondo la **pierde solo**: la saca de su columna con causa específica («Bloqueo firme:
  {criterio} (#n); …»), etapa de origen, fecha-hora, actor «sistema» y el subtipo (protesto, castigo o
  mora), lo anota en la bitácora («… → operación perdida (terminal, no excepcionable)») y cierra sus
  tareas en cascada. La pérdida es **estado terminal**; reabrirla es una operación nueva.
- Sale de las bandejas que empujan al ejecutivo a gestionarla: una tarea sobre una operación muerta
  manda a alguien a trabajar por algo que no existe.

El apoderado puede **revertir** su rechazo mientras la operación no se haya perdido (§4.7); una vez
perdida, el camino es una operación nueva.

### 5.3 Qué libera el giro

Firmar es del **cliente**; girar es de la casa, y sólo después de que sus tres controles pasen.
Cuando el cliente firma, la operación va a:

| Destino | Cuándo | Motivo que se anota |
|---|---|---|
| **Otorgamiento / Verificación** | queda algún criterio por excepcionar, alguna llamada por hacer, la operación excede la línea o incluye deudores fuera de las listas, o falta la evidencia del contrato | «N criterio(s) de otorgamiento por excepcionar» · «N factura(s) esperan la verificación telefónica» · «excede la línea…» · «falta la evidencia vigente del contrato de cesión (O05)» |
| **Pendiente Integración** | nada de lo anterior | «Sin criterios por excepcionar ni verificación pendiente → pasa a Operaciones» |

Es **una** etapa y no dos porque el ejecutivo tiene un solo pendiente: que la casa termine de revisar.

Desde «Otorgamiento / Verificación», la operación sale sola cuando se cumplen **las cuatro** cosas a
la vez: no tiene bloqueo firme, el cliente mantiene su aprobación formal (reabrir la revoca), **todas**
sus excepciones están aprobadas y no queda verificación pendiente. Ahí pasa a **Pendiente Integración
· esperando a Operaciones**: deja de ser una oportunidad del tubo y aparece en **Operaciones**.

**Pendiente de Giro.** Un apoderado de **Operaciones N3** aprueba la **integración al core** desde el
detalle. La acción vuelve a comprobar dos cosas antes de escribir, porque el botón no es el control:
la atribución (un intento sin ella queda auditado como OTG-01) y la **huella** de lo que se va a
inyectar contra la de lo que el cliente autorizó (GIR-02; si no calza, «Integración bloqueada» con las
dos huellas en la auditoría). Aprobada, la operación queda **Pendiente de Giro**, que es lo que toma
Tesorería, con la huella verificada anotada en su bitácora.

### 5.4 Re-evaluar no reabre lo decidido

Cada evaluación emite una **versión** inmutable. Re-evaluar trae datos frescos del origen y **no toca
las excepciones ya resueltas**: si el origen devolviera el valor original, una excepción visada se
reabriría y se perdería la firma del apoderado, que es evidencia. Los criterios re-evaluables dicen en
la mesa cómo se regularizan («se regulariza al re-evaluar sincronizando la información financiera con el
SII», «al actualizar los protestos vigentes», «al actualizar la información con las fuentes»); los de
burós y los knockout no se re-evalúan (§2.4).

---

## 6. Casos particulares

### 6.1 O05 · La evidencia del contrato de cesión

Existe **siempre**, en las dos vías de publicación; lo que cambia es **quién crea la evidencia**:

- **Electrónica.** La firma del cliente en el portal es la evidencia: el criterio queda aprobado sin que
  nadie lo vise.
- **Física (contrato en papel).** El papel se firmó fuera del sistema: queda como **excepción de
  Operaciones N3**. La tarjeta lo dice con esas palabras —«📎 Acá se carga el contrato de cesión
  firmado… lo autoriza el {cargo} ({área})»—; el ejecutivo adjunta el comprobante como respaldo de la
  solicitud (o como ampliación, si llega después) y el apoderado de Operaciones lo visa. **Visar O05 es
  lo que crea la evidencia**: la huella del paquete (número de operación, RUT del cliente, número de
  deudores y de facturas, monto total y monto por deudor) que el gate de integración compara.

Si el paquete cambia después de la firma, la huella no calza y el criterio vuelve a abrirse solo.

### 6.2 O06 · El monto cedido y el monto del documento

El control de Operaciones sobre el registro de cesiones: una **cesión parcial** es excepción
Operaciones **N3**; una cesión **por más** que el documento es Operaciones **N5**, el tope del área,
porque no es una diferencia sino un crédito que no existe. Se mide documento a documento sobre las
facturas de la oferta.

### 6.3 C05 · Cliente nuevo

Un cliente sin línea aprobada levanta **Riesgo N5**, la máxima atribución del modelo: la constitución
de una línea es la decisión más estructural del proceso. La línea misma se tramita en la **solicitud al
comité** ([`spec-asignacion-lineas.md`](./spec-asignacion-lineas.md)); la excepción sólo deja constancia
de que se está cursando sin ella.

### 6.4 «Sin aprobador definido»

Cuando ningún usuario del tenant puede firmar un par (área, nivel), el motor lo dice con esas
palabras en la tarjeta, en la mesa y en la tarea, con el requisito («{área} · N{nivel}») y **la
causa**, que son dos y se arreglan en mantenedores distintos:

| Causa | Dónde se arregla |
|---|---|
| el criterio no declara área | el catálogo |
| el área no existe en este tenant | `Configuración › Áreas` |
| nadie tiene esa área en ese nivel o superior | `Configuración › Usuarios` |

Una lista de aprobadores vacía se leería como «todavía no lo miran», cuando la operación está pegada
esperando a alguien que no existe.

**Salvo la primera fila, que desde el 18-09-2026 no llega hasta acá.** Un criterio con un **tramo de excepción** que **no declara
área** no está mal atendido: está **mal definido**, y una regla mal definida **no se ejecuta ni se
verifica**. Una **knock out** no entra acá: no se aprueba, así que no necesita aprobador ni área. El motor corta antes de mirar los tramos y la devuelve como **«No ejecutada · falta
configuración»**, con la causa y el mantenedor donde se arregla. Se ve en la fila del criterio —en su
propio bloque del tab, nunca dentro del acordeón de las aprobadas—, en el contador del panel y en el
tooltip de la compuerta de Otorgamiento, y la tarjeta dice la consecuencia con todas sus letras: **la
operación se evaluó SIN ella**. No bloquea, porque nada se evaluó y por tanto nada concluyó; lo que
protege a la operación es que el problema se VEA. Las reglas de **clasificación** y las **sin tramos** quedan
fuera por lo mismo: informan o no deciden. Las otras dos filas de la tabla siguen igual —
ahí la regla está bien definida y lo que falta es un usuario—.

### 6.5 La excepción de verificación

Es una excepción **de otro proceso** que comparte la misma etapa: un usuario con el permiso
**excepción de verificación** (por usuario, además del super-admin) puede **eximir una factura** de la
verificación telefónica antes del giro, con un comentario. Queda registrada con quién y cuándo, en la
bitácora y en la auditoría, y es reversible. No pasa por la mesa de Otorgamientos: se hace desde el
tab de Verificación del detalle.

---

## 7. Reemplazos, vacaciones y rotación

- **Quien cubre a alguien asume sus atribuciones** durante el período: el mismo nivel de la misma área,
  tomando el **mayor** por área (cubrir a un N1 nunca baja a un N2). Se configura en `Configuración ›
  Vacaciones y reemplazos` y entra por el **padrón**: la mesa, el tab, las tareas y los avisos lo
  respetan sin saber que existe.
- **Es aditivo por defecto**: el ausente sigue pudiendo aprobar. La ausencia **total** (licencia,
  salida) se marca caso a caso, y entonces el reemplazante es el único que puede.
- La mesa le muestra al reemplazante su atribución **efectiva** y «En reemplazo de {persona} (hasta el
  {fecha})»; el visado, la solicitud y la ampliación **firman** con «{nombre} (en reemplazo de …)», y la
  auditoría estampa sola «Acción ejecutada bajo configuración de REEMPLAZANTE de …», para que en seis
  meses se pueda decir por qué esta persona pudo aprobar esto.
- **Firmar una verificación también se delega**, aunque sea un rol y no un nivel.
- **Las tareas siguen al par (área, nivel)**, no a la foto de nombres del día en que se crearon. Y el
  **traspaso de cartera** entre ejecutivos (`Configuración › Oportunidades › Migración`) mueve las
  operaciones vivas sin tocar su visado.

---

## 8. Configuración del tenant que gobierna el proceso

| Pantalla | Qué decide |
|---|---|
| `Configuración › Áreas` | las áreas que aprueban excepciones; cuántos tramos rutean a cada una y quién la tiene, con aviso si hay criterios y nadie que los apruebe. El identificador no se edita (es lo que el catálogo compara) |
| `Configuración › Roles` | el catálogo de cargos y qué atribución implica cada uno (lectura) |
| `Configuración › Usuarios` | qué cargo tiene cada persona — es lo que le da o le quita la atribución |
| `Configuración › Vacaciones y reemplazos` | quién cubre a quién, desde y hasta cuándo, y si el ausente conserva la atribución |
| `Configuración › Otorgamiento` | las **atribuciones por criterio** (área y nivel de cada tramo, con sus aprobadores de hoy; descargable como JSON), el **piso por monto**, y los **permisos por usuario**: aprobación masiva y excepción de verificación |
| Umbrales de política | los cortes que usan los criterios (nota mínima de compra, tramos de monto, mínimos de comisión y de aplicación de CxC…) se leen de la configuración activa del tenant, nunca de la regla |

El archivo `atribuciones_otorgamiento.json` del repositorio es la foto de esa configuración y **se
regenera con un script** desde la aplicación construida; no se edita a mano.

---

## 9. Indicadores de la mesa

- **Operaciones en otorgamiento (N)** y **«k con acciones para ti»**, con los contadores por fase
  (Pre-evaluación · Evaluación · Finalizadas).
- Por operación: «N excepción(es) pendiente(s) · M rechazo(s) re-evaluable(s)», el estado agregado y
  «N para ti».
- La fase por operación (pre-evaluación, evaluación, finalizada) está disponible para los tableros con
  la misma lógica que usa la mesa.

---

## 10. Decisiones abiertas y observaciones

Ninguna bloquea la operación; todas cambian el contrato del servicio o la configuración.

| # | Observación | Dónde se decide |
|---|---|---|
| 1 | La **justificación del apoderado** es obligatoria en la mesa y opcional en el tab del detalle, sobre la misma decisión. Conviene un solo criterio | proceso |
| 2 | «Solicitar más información» anuncia que crea una tarea; lo que crea es un **hilo de mensajería** atado a la excepción. O se crea la tarea, o el texto dice hilo | producto |
| 3 | **Riesgo no tiene cargos en N1–N3**: 77 de sus 97 tramos caen en el Jefe de Riesgo por escalada | configuración del tenant |
| 4 | Parámetros que la política declara sin definir: tramos de C07, umbrales de C08 y C37, C13/D05 (¿escala o firme?), C27, C39, banda de O01, semántica del 30% de O03, escala de la nota | Riesgo (`Inconsistencias_Motor_Otorgamiento.md` §5) |
| 5 | **Concurrencia del visado**: dos apoderados decidiendo la misma excepción a la vez necesitan una respuesta 409 con semántica definida; hoy la escritura es optimista con confirmación | plataforma (`spec-otorgamiento.md` §12) |
| 6 | Los criterios de burós de **deudor** (D02–D13) son excepciones no re-evaluables, no bloqueos firmes: sólo C30–C32 rechazan. Los documentos que los describen como knockout deben decirlo así | documentación |

---

## 11. Cómo se verificó este documento

Cada afirmación operativa se cotejó contra el fuente del pipeline (`pipeline_comercial.jsx`) el
18-09-2026: los textos de las tarjetas, del modal de curse y de la mesa; las tablas de atribución por
rol y de piso por monto; la lista de criterios no re-evaluables; las escrituras y sus auditorías; y
las transiciones de etapa tras la firma y tras el visado. Las cifras del catálogo salen de
`atribuciones_otorgamiento.json`. La suite de la aplicación cubre el proceso con los casos **44**
(el motor decide con el padrón inyectado), **56–59** (el visado y las versiones entran por parámetro),
**88** (a qué etapa va la operación al firmar, las 16 combinaciones), **90** (los umbrales se leen de la
configuración), **91** (traspaso de cartera), **96** (O06) y **114** (solicitar no cierra la puerta:
la ampliación se apila).

---

## Documentos relacionados

| Documento | Qué cubre |
|---|---|
| [`spec-otorgamiento.md`](./spec-otorgamiento.md) | el modelo de riesgo (catálogo, tramos, ruteo, piso por monto) y el contrato del motor como servicio |
| [`spec-verificacion-facturas.md`](./spec-verificacion-facturas.md) | la verificación telefónica, que comparte la etapa «Otorgamiento / Verificación» |
| [`spec-asignacion-lineas.md`](./spec-asignacion-lineas.md) | las líneas y la solicitud al comité (C05) |
| [`spec-ciclo-factura.md`](./spec-ciclo-factura.md) | en qué orden corren los motores y dónde se bifurca el camino |
| `Inconsistencias_Motor_Otorgamiento.md` | la auditoría de la política contra la implementación y los parámetros abiertos |
| `Integraciones/spec_s3_otorgamiento.md` | el layout A16: las variables que alimentan el motor |
