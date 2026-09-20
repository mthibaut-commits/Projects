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

> **Contexto y orden del documento.** Una excepción nace de una **regla de negocio** que el sistema
> evalúa sobre la operación y que **no se cumple**. Que no se cumpla no significa que la operación se
> caiga: significa que alguien **facultado** puede autorizarla igual, a sabiendas. Eso es excepcionar.
>
> Todo lo que pasa entre que el motor levanta la excepción y que el apoderado con **atribución** la
> autoriza —la justificación del ejecutivo, el ruteo a quien corresponde, el respaldo, la decisión
> firmada— existe para lo mismo: que un negocio que **no cumple al 100%** las reglas establecidas pueda
> aprobarse igual, con la **trazabilidad y la auditoría** que Operaciones necesita para responder, meses
> después, quién autorizó qué y con qué antecedentes a la vista.

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
| `no_ejecutada` | la regla está **mal definida**: tiene un tramo de excepción y no hay a quién pedírsela | no se evalúa, y la salida lo dice (§6.4) |

Una **excepción** es entonces un criterio incumplido que la casa puede aceptar **a sabiendas**, a
cambio de que alguien con atribución lo firme. El ciclo completo es:

```
  evaluación ──► excepción PENDIENTE ──► SOLICITADA (justificada por el ejecutivo) ──► en BANDEJA
                                            │  + información agregada después            │
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
4. **Una regla que no llega a nadie no se ejecuta.** Si un criterio tiene un tramo de excepción y ese
   tramo no se puede dirigir a una persona —no declara área, declara un área que este tenant no tiene, o
   nadie tiene esa área en ese nivel ni en uno superior—, el criterio está **mal definido** y el motor
   **no lo evalúa ni lo verifica**: sale como **«No ejecutada · falta configuración»**, con la causa y el
   mantenedor donde se arregla (§6.4). El super administrador no cuenta como aprobador. Los knock out no
   necesitan área (no se aprueban: incumplen y se acabó), ni las reglas de clasificación ni las que no
   tienen tramos. Caso distinto: la regla está bien definida pero el **piso por monto** de esta operación
   pide un nivel que nadie tiene; ahí la excepción sí se ejecuta y sale con **«Sin aprobador definido»**
   (§2.3, §6.4).

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
nivel que no tiene no exige más, deja la excepción sin aprobador. Los cortes y el piso viven en la
configuración del tenant y se ven en `Configuración › Otorgamiento`, junto a las atribuciones por
criterio, donde cada tramo muestra el cargo que lo firma hoy o, en naranja, «Sin área · NO SE EJECUTA» /
«Sin aprobador · NO SE EJECUTA» si la regla está mal definida (§6.4).

El piso es distinto de la definición de la regla: es **de la operación**. La misma regla se dirige bien
en una operación chica y pide más arriba en una grande, así que no corresponde dejar de ejecutarla:
corresponde decir que **a ese monto no hay quien firme**. Si alguien deja sin titular el nivel que el
piso exige, la excepción sí se ejecuta y sale con **«Sin aprobador definido · requiere {Área} ·
N{nivel}»** y la causa («nadie tiene {Área} en nivel N{nivel} o superior — asígnalo en Configuración ›
Usuarios»), en la tarjeta, en la mesa y en la tarea (§6.4). La operación no se pierde ni se aprueba sola:
queda **sujeta a aprobación** hasta que alguien configure a quien la firme.

**Consecuencia para el proceso:** la misma excepción, en una operación de M$15 y en una de M$90, le
llega a personas distintas. Y el monto puede cambiar **después** de que el ejecutivo pidió la
aprobación —se agrega una factura, se re-evalúa—, con lo que también cambia el cargo que corresponde.
Por eso la tarjeta muestra el cargo **calculado con el monto y el tramo de hoy**, no el que regía el
día en que se envió la solicitud: la solicitud guarda quién pidió y cuándo (historia); a quién le toca
decidir lo dice siempre la tarjeta (§4.4).

### 2.4 Lo que la configuración vigente produce

Medido sobre `atribuciones_otorgamiento.json` (18-09-2026), el catálogo tiene **77 criterios**
(48 de cliente, 23 de deudor, 6 de operación) y **133 tramos de excepción** que rutean a:

| Área | Tramos de excepción | Por nivel exigido en el tramo | Cargo que los recibe hoy |
|---|---|---|---|
| Riesgo | **97** | N1 2 · N2 19 · N3 23 · N4 33 · N5 20 | Jefe de Riesgo 77 · Subgerente de Riesgo 20 |
| Comercial | **29** | N1 18 · N2 11 | Jefe de Grupo Comercial 18 · Gerente Comercial 11 |
| Operaciones | **7** | N1 3 · N2 1 · N3 2 · N5 1 | Jefe de Operaciones 6 · Operaciones 1 |

**Ninguno queda sin aprobador, y ninguna regla del catálogo está mal definida** (§6.4): las 77 declaran
área y las 69 con excepción tienen a quién pedírsela en este tenant. Riesgo no tiene cargos en N1–N3,
así que sus 77 tramos de N1–N4 caen todos en el Jefe de Riesgo por escalada: distinguirlos es dar de
alta usuarios de Riesgo en esos niveles, no cambiar el catálogo. Los niveles de la tabla son los del
tramo; el piso por monto los sube.

De los 77 criterios, **28 no son re-evaluables**: los datos de burós del cliente y del deudor
(C10–C22, D02–D13) y los tres knockout de la Tesorería General (C30–C32). Sólo estos tres **rechazan**;
los 25 de burós son **excepciones** —se visan como cualquier otra— que una re-evaluación no repara,
porque una firma no borra un dato de bureau.

---

## 3. Los registros del proceso

Todo lo que el proceso escribe tiene dueño, nombre y hora. Son seis registros por operación, más la
auditoría, la mensajería y las tareas:

| Registro | Qué guarda | Quién escribe | Cuándo |
|---|---|---|---|
| **Solicitud** (por excepción) | comentario, respaldos, la declaración «sin comentarios», quién, cuándo, y el cargo y nivel **al momento de solicitar**; más cada **información agregada después**, con su autor y su fecha | el ejecutivo | al solicitar y al agregar información (§4.2, §4.3) |
| **Visado** (por excepción) | `aprobado` / `rechazado`; ausente = pendiente | el apoderado | al decidir; se borra al revertir |
| **Detalle del visado** (por excepción) | justificación de la decisión, respaldos, quién (con su reemplazo, si cubre a otro), cuándo | el apoderado | junto con el visado |
| **Bitácora de otorgamiento** (por operación) | cada evento del proceso con actor y fecha-hora: solicitud, información agregada, pre-evaluación, decisión, pérdida por bloqueo firme, integración | el sistema, en cada acción | en cada acción; sólo se agrega, nunca se edita |
| **Pre-evaluación** (por operación) | que el ejecutivo pidió adelantar la revisión: quién y cuándo | el ejecutivo | al enviar a pre-evaluación |
| **Versión de evaluación** (por operación) | la foto de cada corrida del motor: las variables del cliente tal como las entregó el origen y la disposición de cada criterio, con fecha y número (v1, v2…); la v1 es la evaluación de la simulación | el sistema | en cada **re-evaluación de la simulación** (§5.5); sólo se agrega, nunca se edita ni se borra |
| **Auditoría** (global) | módulo, acción, glosa, actor, éxito, severidad, y la **huella encadenada** de cada registro; incluye los **intentos rechazados** por atribución | toda acción | siempre |
| **Mensajería** (hilos por operación) | los avisos entre ejecutivo y apoderados: solicitud, pre-evaluación, avance, requerimientos de información | quien actúa | según la acción |
| **Tareas** | «Aprobar excepción #n …», con el par (área, nivel) como destinatario | al solicitar | vence en un día |

El visado es **evidencia regulatoria**: la decisión de un apoderado se escribe a través de un
repositorio con confirmación, y si la escritura no se confirma se audita el **intento**, no una
aprobación que no ocurrió.

---

## 4. El proceso, paso a paso

### 4.1 La excepción nace en la evaluación

El motor corre sobre la operación en cinco momentos:

| Momento | Quién lo dispara | Qué produce |
|---|---|---|
| **La simulación** | el ejecutivo arma la oferta y simula | la **primera evaluación**: la operación pasa a Oferta con su monto y sus facturas, y cada criterio queda con su disposición. Es la versión **v1** |
| **La pre-evaluación** | el ejecutivo, desde el detalle, con la oferta abierta | adelanta el veredicto y abre la bandeja (§4.5) |
| **«Re-evaluar operación»** | el ejecutivo, después de agregar o quitar facturas | vuelve a evaluar la operación **tal como quedó** —monto, piso, tramos— con las mismas variables del origen |
| **«Re-evaluación de la simulación»** | el ejecutivo, desde el tab Otorgamiento, cuando quedan re-evaluables pendientes | pide al origen las variables de hoy y guarda una **versión nueva** (§5.5) |
| **El cierre de la oferta y la firma** | la confirmación del cierre en el modal de curse; el cliente al firmar | decide si la oferta puede publicarse; decide a qué etapa va la operación firmada (§5.3) |

Agregar o quitar facturas **no** re-evalúa solo: lo que depende del motor queda en «Por evaluar», sin
número, hasta que el ejecutivo aprieta «Re-evaluar operación». Una cifra vieja atenuada igual se lee
como cifra, y alguien la va a citar.

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

### 4.3 Agregar información a una solicitud ya enviada

Después de enviar la solicitud, el ejecutivo suele recibir cosas que el apoderado necesita ver: el
contrato firmado que llega dos días más tarde, la aclaración que el apoderado le pidió por teléfono, un
respaldo que no tenía a mano. Enviar la solicitud **no cierra esa puerta**: mientras la excepción siga
pendiente, la tarjeta muestra «En espera del visto bueno de {cargo} (N{nivel})» y el botón **«Agregar
información»**, que abre un comentario y la opción de adjuntar archivos.

Cómo funciona, y por qué:

- **Lo nuevo se agrega debajo de la solicitud original, como una entrada más**, con el nombre de quien
  lo agregó y la fecha y hora («＋ Información agregada por {persona} · {fecha}»). La solicitud original
  **no se modifica ni se reemplaza**. La razón es de auditoría: el apoderado pudo haber leído ya la
  solicitud tal como se envió, y después hay que poder reconstruir qué información existía en cada
  momento y quién la aportó. Si el texto original se pudiera editar, esa reconstrucción sería imposible.
- **Sólo se puede agregar información a una excepción que ya fue solicitada.** Si todavía no se envió al
  apoderado, el camino es «Solicitar aprobación» (§4.2): ese gesto es el que le avisa y le crea la tarea.
  Guardar antecedentes sobre una solicitud que no existe dejaría el respaldo escrito sin que nadie
  supiera que tiene que mirarlo.
- **Una entrada sin comentario y sin archivos no se guarda.** El botón «Enviar» exige al menos uno de los
  dos; un bloque vacío le anunciaría al apoderado que hay algo nuevo que leer cuando no lo hay.
- **Agregar información no aprueba ni rechaza nada.** Son antecedentes para quien decide. Lo único que
  exige atribución es la decisión (§4.7); aportar información lo hace el ejecutivo cuantas veces haga
  falta mientras la excepción esté pendiente.

### 4.4 A quién le llega, y por qué el cargo se calcula en vivo

Cuando el ejecutivo envía la solicitud, el sistema anota **quién la pidió y cuándo**, y la tarjeta lo
muestra como historia («Aprobación solicitada por … · fecha»). Lo que **no** se muestra de esa
anotación es el cargo que correspondía ese día, porque el requisito **se mueve**: el tramo cambia al
re-evaluar y el piso sube o baja con el monto de la operación. Ejemplo: se solicita una excepción de
Comercial con la operación en M$15 (le toca el Jefe de Grupo, N1); antes de que alguien la decida se
incorpora una factura y la operación pasa a M$50, y el piso la sube a N2 (Gerente Comercial). La
tarjeta dice «Gerente Comercial (N2)», que es quien de verdad puede firmarla hoy; mostrar además el
cargo anotado al solicitar dejaría dos destinatarios distintos para la misma excepción. El vigente es
siempre el que la tarjeta calcula al momento de mirarla.

### 4.5 Cuándo se puede visar: con pre-evaluación o con la aceptación del cliente

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
   paquete que después compara el control de integración al core (§6.1).
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
hilo o agregándola a la solicitud (§4.3).

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

Firmar es del **cliente**; girar es de la casa, y sólo después de que pasen **sus controles**. Son
cinco automáticos y uno humano —la firma de Operaciones—, cada uno mirando una cosa distinta y
bloqueando en un punto distinto del camino. Uno de los cinco, **O05**, no es un invariante técnico sino
un **criterio del propio catálogo de otorgamiento**: el que exige que el cliente haya **autorizado
explícitamente esta operación** y que exista el comprobante.

| Control | Qué exige | Quién lo levanta | Dónde bloquea |
|---|---|---|---|
| **LIN-01** · no se gira lo que no tiene cupo | que **cada factura** esté cubierta por una **línea aprobada y asignada**. La que no cabe no se descarta: sale marcada para el **comité**, y la solicitud se genera sola al cerrar la oferta | el **comité de crédito**, aprobando o ampliando la línea (vive en el sistema de gestión de líneas, no en NEX) | al armar y al cerrar la oferta, y otra vez en la aprobación de Operaciones: una factura sin cupo no se puede imputar a nada en el core |
| **OTG-02** · no avanza con excepciones pendientes | ninguna excepción sin decidir ni rechazo re-evaluable sin regularizar | los apoderados, visando (§4.7) | la operación no sale de «Otorgamiento / Verificación» |
| **VER-01** · no cursa con verificación pendiente | todas las facturas de la operación con su verificación telefónica completa | el equipo de verificación, llamando al deudor | la operación no sale de «Otorgamiento / Verificación» |
| **O05** · el cliente autorizó explícitamente la operación | que **conste la autorización del cliente sobre este paquete**, con su comprobante: la firma en el portal si la oferta se publicó por correo, o el **contrato de cesión firmado en papel**, adjunto y visado, si se publicó físicamente. Es un **criterio del catálogo** (Operaciones N3), así que se gestiona como cualquier excepción y **OTG-02 lo cubre**: mientras no conste, hay una excepción pendiente | el **cliente**, firmando; en la vía física, el ejecutivo adjuntando el contrato y **Operaciones** visándolo (§6.1) | la operación no sale de «Otorgamiento / Verificación»: sin constancia de que el cliente autorizó, no hay nada que girar |
| **GIR-02** · el paquete girado es el que se autorizó | que la **huella** de lo que se va a inyectar al core calce con la de **esa misma autorización**. O05 comprueba que la autorización EXISTA; GIR-02, que siga describiendo lo que se va a girar | nadie: se repara solo cuando el paquete vuelve a ser el autorizado, o el cliente vuelve a autorizarlo | dentro de esa misma aprobación, antes de escribirla: es el último punto en que la comparación sirve |
| **La aprobación de Operaciones** · alguien responde por lo que entra al core | que un apoderado de **Operaciones N3** revise la operación y **apruebe la integración al core**. El botón **no se habilita** mientras falte cualquiera de los otros cuatro: la firma se da sobre una operación que ya está en regla | el **Jefe de Operaciones** (o quien tenga Operaciones N3 o superior), desde el detalle | el paso de «Pendiente Integración» a «Pendiente de Giro». Sin esa firma la operación no llega a Tesorería |

**La tabla va en el orden en que se cumplen.** Los cuatro primeros se levantan trabajando —el comité
aprobando la línea, los apoderados visando, la verificación llamando, el cliente firmando—; **GIR-02**
no se levanta, se cumple solo cuando el paquete sigue siendo el autorizado; y la **firma de
Operaciones** va al final porque es lo último y porque se da **sobre una operación que ya está en
regla**: es una **decisión de una persona**, con su atribución (§2.2) y su registro en la bitácora con
nombre y hora, no una confirmación de trámite. Todos se comprueban **en el servidor** en producción: la
pantalla que esconde un botón no es el control. Hay además un **GIR-01**, que exige que la operación haya pasado por Cesión —el giro se emite
contra la cesión confirmada, no contra la etapa que informa el navegador—, pero no es un pendiente que
alguien resuelva: es consecuencia de haber recorrido el camino.

**Los cuatro automáticos se vuelven a mirar en la aprobación de Operaciones, no sólo el día de la
firma** (§5.5). Entre que la operación queda «Pendiente Integración» y que alguien la firma pueden
pasar días, y en ese rato un visado se puede revertir, una factura se puede retirar por no confirmada y
el cupo de una línea se puede consumir en otro negocio.

Cuando el cliente firma, la operación va a:

| Destino | Cuándo | Motivo que se anota |
|---|---|---|
| **Otorgamiento / Verificación** | queda algún criterio por excepcionar, alguna llamada por hacer, la operación excede la línea o incluye deudores fuera de las listas, o falta la evidencia del contrato | «N criterio(s) de otorgamiento por excepcionar» · «N factura(s) esperan la verificación telefónica» · «excede la línea…» · «falta la evidencia vigente del contrato de cesión (O05)» |
| **Pendiente Integración** | nada de lo anterior | «Sin criterios por excepcionar ni verificación pendiente → pasa a Operaciones» |

Es **una** etapa y no dos porque el ejecutivo tiene un solo pendiente: que la casa termine de revisar.

Desde «Otorgamiento / Verificación», la operación sale sola cuando se cumplen **las cuatro** cosas a
la vez: no tiene bloqueo firme, el cliente mantiene su aprobación formal (reabrir la revoca), **todas**
sus excepciones están aprobadas (OTG-02) y no queda verificación pendiente (VER-01). Ahí pasa a
**Pendiente Integración · esperando a Operaciones**: deja de ser una oportunidad del tubo y aparece en
**Operaciones**.

**Pendiente de Giro.** Acá entra el control humano: un apoderado de **Operaciones N3** revisa la
operación y aprueba la **integración al core** desde el detalle. Es la firma con que Operaciones
responde por lo que entra al core —que lo excepcionado esté bien excepcionado, que las llamadas estén
hechas, que la documentación esté— y no una confirmación de trámite: por eso exige atribución y queda
en la bitácora con nombre y hora.

La acción vuelve a comprobar dos cosas **antes de escribir**, porque el botón no es el control: la
atribución (un intento sin ella queda auditado como OTG-01, severidad alta) y la **huella** de lo que
se va a inyectar contra la de lo que el cliente autorizó (GIR-02; si no calza, «Integración bloqueada»
con las dos huellas en la auditoría). Aprobada, la operación queda **Pendiente de Giro**, que es lo que
toma Tesorería, con la huella verificada anotada en su bitácora.

### 5.4 La aprobación de Operaciones comprueba los controles, dos veces

El botón **«Aprobar integración al core»** del detalle no es una confirmación de trámite: es donde
Operaciones firma que la operación está en condiciones de entrar al core. Por eso **no se habilita**
mientras falte alguno de los controles, y la tarjeta lista **qué** falta, una línea por control, con su
código y qué hay que hacer:

> **No se puede integrar: faltan 2 controles.**
> **OTG-02** · 3 criterio(s) de otorgamiento sin resolver: hay que excepcionarlos o regularizarlos antes de integrar
> **LIN-01** · 1 factura(s) sin línea aprobada y asignada (#9002): esperan al comité

Un botón apagado sin causa manda a adivinar, y lo que se adivina acá es por qué no sale la plata.

**Se comprueba dos veces, y la segunda es la que vale.** Al apretar, la acción vuelve a correr los
controles **antes de escribir**: la pantalla pudo abrirse hace un rato y entre medio alguien pudo
revertir un visado. El intento bloqueado queda en la auditoría con los códigos en la acción
(«Integración bloqueada (OTG-02 · LIN-01)»), severidad alta, y en el log del sistema con la lista. La
**atribución se mira primero**: quien no tiene Operaciones N3 ni ve el detalle de lo que falta, sólo el
aviso de que la firma es de esa área.

**Qué mira cada control acá**, que no es exactamente lo mismo que el día de la firma:

- **OTG-02** lee el visado **vigente**, no el que había cuando la operación cambió de etapa: una
  excepción revertida vuelve a bloquear.
- **VER-01** lee la verificación vigente: una factura retirada porque el deudor no la confirmó vuelve a
  bloquear, porque el paquete cambió.
- **LIN-01** mira **factura por factura** la asignación que la operación tiene congelada en su versión
  —lo que el cliente firmó y lo que el sistema de líneas tiene reservado—, no el total contra la línea
  del cliente. Un paquete puede caber holgado y traer igual una factura sin línea de par. Si no hay
  ninguna asignación que respalde el paquete, **se falla cerrado**: no poder afirmar que cada factura
  tiene cupo no es lo mismo que afirmar que lo tiene.
- **GIR-02** compara las dos huellas, como siempre: la del paquete que el cliente autorizó (O05) contra
  la del que se va a inyectar.
- **O05** no aparece por separado en esta lista porque es un criterio del catálogo: si la autorización
  del cliente no consta, hay una excepción pendiente y **OTG-02** ya bloquea.

Por qué acá y no antes: es el **último punto en que mirar sirve**. Después, el dinero ya salió. Las
alternativas descartadas —avisar sin bloquear, dejarlo sólo para el servidor, re-asignar la línea en
ese momento— están en ADR-0007.

### 5.5 Qué es la re-evaluación, y por qué no reabre lo decidido

**Re-evaluar es volver a correr los criterios sobre la operación con los datos de hoy.** Los criterios
no se evalúan una vez y quedan fijos: cada vez que el sistema los muestra —en el tab, en la mesa, en el
tubo— los calcula sobre la operación tal como está en ese momento. Lo que cambia entre una corrida y
otra son sus dos entradas: **la operación** (qué facturas, qué monto, qué deudores) y **las variables del
cliente y de los deudores** que entrega el origen (el activo de otorgamiento del día). De ahí que haya
dos gestos distintos con el mismo verbo:

- **«Re-evaluar operación»** (cabecera del detalle). Se usa después de agregar o quitar facturas:
  vuelve a evaluar la operación **tal como quedó** —el monto nuevo mueve el piso por monto y los tramos
  que dependen de él— con las mismas variables del origen. No crea una versión.
- **«Re-evaluación de la simulación»** (tab Otorgamiento). Vuelve a pedir al origen las variables del
  cliente y guarda una **versión nueva** (v2, v3…), inmutable, con las variables recibidas y la
  disposición de cada criterio. El tab muestra cuántas versiones hay, deja elegir cualquiera y marca el
  **diff** entre una y la anterior: qué variables cambiaron y qué criterios cambiaron de disposición.
  El botón se habilita sólo mientras queden re-evaluables pendientes —excepciones sin decidir o
  rechazos re-evaluables— y la operación no esté perdida. Es el gesto que corresponde cuando el
  ejecutivo consiguió lo que faltaba: el pagaré firmado, la información financiera al día, la línea
  aprobada por el comité.

**Qué puede cambiar al re-evaluar.** Sólo los criterios **re-evaluables** (documentación, garantías,
vigencias, la línea, el comportamiento comercial ajustable, el precio de la operación): un rechazo
re-evaluable se regulariza y una excepción puede dejar de serlo. La mesa dice, por criterio, con qué se
regulariza («se regulariza al re-evaluar sincronizando la información financiera con el SII», «al
actualizar los protestos vigentes», «al actualizar la información con las fuentes»).

**Qué no cambia.** Los criterios de burós y los knockout no se re-evalúan (§2.4): una firma no borra un
dato de bureau. Y **las excepciones ya decididas conservan su visado**: si el origen devolviera el valor
original, una excepción aprobada se reabriría y se perdería la firma del apoderado, que es evidencia.
Las versiones anteriores tampoco se borran: son la constancia de qué se evaluó y cuándo, y por eso
sobreviven incluso a vaciar la oferta y empezar de cero.

---

## 6. Casos particulares

### 6.1 O05 · El cliente autoriza explícitamente la operación

**Ninguna operación se gira sin que conste que el cliente la autorizó.** No es una cortesía del proceso
ni un supuesto: es un **criterio del catálogo de otorgamiento** —O05, «Contrato firmado por cliente de
la operación», de Operaciones N3— y mientras no conste queda como **excepción pendiente**, con todo lo
que eso implica: la operación no sale de «Otorgamiento / Verificación» y el giro no se libera.

Lo que se exige es **el comprobante**, no la palabra de nadie. Existe **siempre**, en las dos vías de
publicación; lo que cambia es **quién lo crea**:

- **Electrónica.** La firma del cliente en el portal es la evidencia: el criterio queda aprobado sin que
  nadie lo vise.
- **Física (contrato en papel).** El papel se firmó fuera del sistema: queda como **excepción de
  Operaciones N3**. La tarjeta lo dice con esas palabras —«📎 Acá se carga el contrato de cesión
  firmado… lo autoriza el {cargo} ({área})»—; el ejecutivo adjunta el comprobante como respaldo de la
  solicitud (o agregándolo después, si el papel llega más tarde) y el apoderado de Operaciones lo visa. **Visar O05 es
  lo que crea la evidencia**: la huella del paquete (número de operación, RUT del cliente, número de
  deudores y de facturas, monto total y monto por deudor) que el control de integración al core compara.

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

### 6.4 «No ejecutada · falta configuración» y «Sin aprobador definido»

Son dos situaciones distintas, con dos avisos distintos, y ninguna ocurre en silencio.

#### Una regla mal definida no se ejecuta

Una regla está **mal definida** cuando tiene al menos un tramo de excepción y ese tramo **no llega a
nadie**: el ruteo de una excepción es el par (área, nivel), y con ese par tiene que existir una persona
que pueda firmarla. Son tres causas, y las tres detienen la regla:

| Causa | Qué dice la tarjeta | Cómo se arregla (texto de la tarjeta) |
|---|---|---|
| **sin área**: la regla no declara área | «el criterio tiene un tramo de excepción y no declara área, así que no hay a quién pedírsela» | «Declara el área de la regla en el catálogo de otorgamiento.» |
| **área inexistente**: declara un área que este tenant no tiene | «su tramo de excepción pide {Área} · N{nivel} y el área «{identificador}» no existe en este tenant» | «Crea el área «{identificador}» en Configuración › Áreas, o corrige la que la regla declara.» |
| **sin usuario**: el área existe y nadie la tiene en ese nivel ni en uno superior | «su tramo de excepción pide {Área} · N{nivel} y nadie tiene {Área} en nivel N{nivel} o superior» | «Asigna a alguien {Área} en nivel N{nivel} o superior en Configuración › Usuarios.» |

Se prueban **todos** los tramos de excepción de la regla, no sólo el primero, y el super administrador
no cuenta: puede firmar cualquier cosa, pero es la llave maestra del tenant, no el aprobador que la
política designa. Una regla intacta puede pasar a estar mal definida el día que alguien borra un área o
deja un nivel sin gente: la definición se juzga contra el padrón vigente.

**No necesitan área** los knock out —tramos sólo de rechazo: incumplen y se acabó, no hay a quién
pedirle nada—, las reglas de clasificación (informan) ni las que no tienen tramos (no deciden).

**Qué pasa con la operación.** El motor corta antes de mirar los tramos y devuelve la regla como
**«No ejecutada · falta configuración»**. No entra entre las excepciones ni entre los rechazos —no se
evaluó, así que no puede concluir nada— y por eso **no bloquea**: la operación se evaluó **sin** esa
regla. Lo que la protege no es un bloqueo, es que el problema se vea, y se ve en ocho sitios:

| Dónde | Qué muestra |
|---|---|
| **Tab Otorgamiento**, fila del criterio | badge ámbar «No ejecutada · falta configuración» y un recuadro: «**Esta regla no se ejecutó ni se verificó.** {causa}. La operación se evaluó SIN ella.», con el texto de cómo se arregla. El hallazgo de la regla **no** se muestra: afirmaría algo que nadie midió |
| **Tab Otorgamiento**, cabecera de cada bloque | «⚠ N regla(s) de el cliente / este deudor NO se ejecutaron: les falta configuración y la operación se evaluó sin ellas.», y las reglas en su propio bloque, nunca dentro del acordeón de las aprobadas |
| **Detalle**, pie del panel y aviso de la etapa de Otorgamiento | «N regla(s) no se ejecutaron: les falta configuración (tab Otorgamiento)» y «N regla(s) NO SE EJECUTARON por falta de configuración: la operación se evaluó sin ellas.» |
| **Tarjeta del Kanban** | badge ámbar «N criterio(s) sin ejecutar», con el detalle en el tooltip |
| **Tubo**, contador «N/M criterios» | la regla no ejecutada **sigue contando** en el total M; encoger el denominador sería la forma más silenciosa de esconderla |
| **`Configuración › Otorgamiento`**, atribuciones por criterio | la fila en naranja: «Sin área · NO SE EJECUTA» o «Sin aprobador · NO SE EJECUTA», con la frase de arreglo como tooltip |
| **`Configuración › Otorgamiento`**, criterios de verificación | las reglas sin área no caen en ningún grupo del catálogo: se listan aparte, «Fuera de las áreas listadas · N NO SE EJECUTAN» |
| **`Configuración › Áreas`** | un recuadro naranjo arriba, «N criterio(s) MAL DEFINIDOS: no se ejecutan ni se verifican», que los lista uno por uno con su número y su causa; y en la tabla, la columna «Quién la tiene» dice «⚠ nadie — hay criterios sin aprobador posible» para un área con criterios y sin usuarios |

Hoy ninguna regla del catálogo está en este caso (§2.4). Se prueba plantando una regla sin área en la
suite, porque un control que compara el catálogo consigo mismo pasa siempre y no vigila nada.

#### «Sin aprobador definido»: el piso por monto

Cuando la regla está bien definida pero el **piso por monto** de esta operación (§2.3) sube el nivel a
uno que nadie tiene, la excepción **sí se ejecuta**: el nivel es de la operación, no de la regla. El
motor entonces la dirige al cargo **«Sin aprobador definido»**, con el requisito («{Área} · N{nivel}») y
la causa («nadie tiene {Área} en nivel N{nivel} o superior — asígnalo en Configuración › Usuarios»),
porque una lista de aprobadores vacía se leería como «todavía no lo miran» cuando la operación está
pegada esperando a alguien que no existe:

| Dónde | Qué muestra |
|---|---|
| **Mesa Otorgamientos**, tarjeta de la excepción | en naranja, en el lugar de «Aprueban: {nombres}»: **«Sin aprobador definido · {causa}»**; en el bloque de excepciones de otros aprobadores: «**Sin aprobador definido** · requiere {Área} · N{nivel} · {causa}» |
| **Tab Otorgamiento** del detalle, tarjeta del ejecutivo | «Requiere visto bueno de **Sin aprobador definido** (N{nivel})». El formulario de solicitud se abre igual y la solicitud queda registrada; la tarea nombra al requisito y el aviso de mensajería sale sin destinatarios (§10) |
| **Tarea** «Aprobar excepción #n …» | destinatario **«Sin aprobador definido»**, en vez de una lista vacía; se resuelve cada vez que se mira, así que desaparece en cuanto alguien recibe la atribución |

Los dos avisos se corrigen donde nacieron —el catálogo, `Configuración › Áreas` o `Configuración ›
Usuarios`— y desaparecen solos: el padrón se recalcula con cada cambio de roles, áreas o reemplazos.

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
  {fecha})»; el visado, la solicitud y la información agregada **firman** con «{nombre} (en reemplazo de …)», y la
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
| 7 | Cuando el **piso por monto** deja una excepción sin aprobador, en el **tab del detalle** se puede **solicitar** igual: la tarjeta dice «Solicitar aprobación al Sin aprobador definido (N{nivel})», la solicitud se registra y el aviso sale sin destinatarios. La mesa, en cambio, muestra la causa y el mantenedor donde se arregla. Conviene que la tarjeta haga lo mismo | producto |
| 8 | ~~El control de la línea no se vuelve a comprobar factura por factura antes de girar~~ — **cerrada el 20-09-2026**: la aprobación de Operaciones exige ahora los cuatro controles, y LIN-01 se mira factura por factura (§5.4, regla 41, ADR-0007) | cerrada |

---

## 11. Cómo se verificó este documento

Cada afirmación operativa se cotejó contra el fuente del pipeline (`pipeline_comercial.jsx`) el
18-09-2026: los textos de las tarjetas, del modal de curse y de la mesa; las tablas de atribución por
rol y de piso por monto; la lista de criterios no re-evaluables; las escrituras y sus auditorías; y
las transiciones de etapa tras la firma y tras el visado. Las cifras del catálogo salen de
`atribuciones_otorgamiento.json`. La suite de la aplicación cubre el proceso con los casos **44**
(el motor decide con el padrón inyectado), **56–59** (el visado y las versiones entran por parámetro),
**88** (a qué etapa va la operación al firmar, las 16 combinaciones), **90** (los umbrales se leen de la
configuración), **91** (traspaso de cartera), **96** (O06), **114** (solicitar no cierra la puerta:
la información agregada se conserva junto a la solicitud original) y **141** (una regla mal definida no
se ejecuta ni se verifica, y sale nombrada en el veredicto).

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
