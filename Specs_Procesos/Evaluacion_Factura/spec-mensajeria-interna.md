# Centro de Mensajería Interna

**Versión 1.0.0 · 21-09-2026 · NEX Factoring**

Este documento describe **cómo funciona el centro de mensajería**: para qué existe, qué es una
conversación, quién la abre y desde dónde, cómo se avisa, qué queda registrado y dónde están hoy sus
límites. Es la vista de **quien lo usa** —el ejecutivo comercial, los apoderados de Riesgo, Comercial y
Operaciones, el equipo de verificación— y sirve para validar el comportamiento con las áreas y para
capacitar.

> **Para qué existe.** Una operación de factoring la trabajan varias personas de áreas distintas al
> mismo tiempo: el ejecutivo la arma, los apoderados visan sus excepciones, verificación llama al
> deudor, Operaciones la integra. Cuando uno necesita algo de otro —un antecedente, una aclaración, un
> respaldo— esa conversación **tiene que quedar pegada a la operación**, no perderse en un correo o un
> WhatsApp que nadie más puede ver. El centro de mensajería es donde ocurre, y por eso cada
> conversación nace con un **asunto**, con la **operación** a la que pertenece y, cuando corresponde,
> con **el criterio que la motivó**.

**Lo que no es.** No es el canal con el **cliente** —eso es el correo de la oferta y el WhatsApp del
agente, que son otro proceso— ni reemplaza a la **bitácora** de la operación, que registra los hechos.
Acá se conversa entre personas de la casa.

---

## 1. Una conversación, en una página

Una **conversación** (un *hilo*) es un intercambio entre dos o más personas de la organización, con:

| Qué lleva | Para qué |
|---|---|
| un **tipo** | «Requerimiento de información para otorgamiento» o «Mensaje interno» (§2) |
| un **asunto** | lo que se lee en la lista: «Aprobación de excepciones · OP-1042» |
| la **operación** a la que pertenece, y su cliente | así la conversación vive dentro de la ficha de esa operación. Puede no tener ninguna: es un mensaje directo |
| el **criterio** que la originó, cuando la abrió un apoderado desde la mesa | la conversación muestra la regla, su área y su hallazgo (§5) |
| los **participantes** | quiénes la ven y a quiénes les llega. Crece sola: quien escribe entra, y a quien se menciona también (§4) |
| los **mensajes**, con autor, texto, adjunto y fecha-hora | el intercambio |
| el **estado**: abierta o terminada | una terminada se lee pero no admite mensajes, y se puede reabrir (§6) |
| quién la **creó** y cuándo | |
| quién la ha **leído** | de ahí salen los no leídos y el número de la campana (§7) |

---

## 2. Los dos tipos, y por qué son dos

| Tipo | Cuándo se usa | Quién suele abrirla |
|---|---|---|
| **Requerimiento de información para otorgamiento** | falta un antecedente para poder decidir sobre un criterio: un apoderado no puede visar una excepción sin más datos | el apoderado, desde la mesa de Otorgamientos (§3.3) |
| **Mensaje interno** | todo lo demás: coordinar, avisar, preguntar | cualquiera, desde la operación o desde el centro |

Son dos y no uno porque **un requerimiento bloquea trabajo de otro**: alguien está esperando esa
respuesta para poder decidir. Se distinguen con su propio color y etiqueta en la lista, y un
requerimiento nacido desde un criterio muestra además **cuál** (§5).

---

## 3. Dónde se abre una conversación, y cuáles se abren solas

### 3.1 Desde la operación · tab «Mensajería»

Dentro del detalle de una operación, el tab **Mensajería** lista las conversaciones **de esa
operación** —las que uno abrió y las que le abrieron— con un buscador y el filtro *activos / todos*.
Desde ahí se abre una nueva: se elige **destinatario** y **tipo**, se escribe el primer mensaje, y la
conversación queda atada a la operación con el cliente ya puesto.

El tab **sólo se muestra a quien tiene el permiso** de ver mensajería (§8).

### 3.2 Desde el centro de mensajería · la campana

La campana de la barra superior abre un panel lateral con **todas las conversaciones del usuario**,
sean de la operación que sean, ordenadas por el **último mensaje**. Trae el mismo buscador y filtro, y
permite **iniciar una conversación nueva** eligiendo destinatario, tipo, la operación (opcional) y un
asunto propio.

Una conversación atada a una operación **abre la ficha de esa operación** en su tab de Mensajería, en
vez de responderse dentro del panel: así el contexto —las facturas, los criterios, la bitácora— está a
un clic y nadie responde a ciegas.

### 3.3 Las que el proceso abre solo

Tres momentos del otorgamiento crean conversación sin que nadie la pida, porque en los tres hay alguien
esperando algo de otro:

| Momento | Asunto | Quiénes quedan dentro | Qué dice |
|---|---|---|---|
| El ejecutivo **solicita la aprobación** de una excepción (§4.2 del spec de excepciones) | «Aprobación de excepciones · {operación}» | el ejecutivo y **todos los apoderados hábiles** para esa excepción | quién pide, qué criterio, su comentario y si adjuntó respaldo |
| El ejecutivo envía la operación a **pre-evaluación** | «Pre-evaluación de otorgamiento · {operación}» | el ejecutivo y los apoderados de las excepciones pendientes | cuántos criterios hay por excepcionar |
| Un apoderado **termina su parte** del visado | «Avance de otorgamiento · {operación}» | el apoderado y el ejecutivo dueño | si no queda nada pendiente, o **qué cargo y cuántas reglas** faltan todavía |

Las tres **reutilizan la conversación** si ya existe para esa operación, en vez de abrir una nueva cada
vez: el hilo de una operación es uno, y se lee de corrido. El requerimiento que abre un apoderado desde
la mesa (§3.4) sí crea una por criterio, porque cada uno pregunta por algo distinto.

### 3.4 El requerimiento desde la mesa de Otorgamientos

Un apoderado que necesita más datos para decidir usa **«Solicitar más información»** en la tarjeta de
la excepción: elige el destinatario —el ejecutivo dueño, el Gerente Comercial, la jefatura del
ejecutivo, el Jefe de Operaciones o un analista de Operaciones—, escribe qué necesita y adjunta un
documento si corresponde. Se abre una conversación de tipo **requerimiento**, atada a la operación **y
al criterio**, y la mesa la muestra bajo esa misma tarjeta con su último mensaje.

---

## 4. Cómo se conversa

- **Los mensajes son de quien los escribe**, con su nombre y la fecha y hora. No se editan ni se
  borran: un intercambio del que alguien decidió algo es evidencia.
- **Se puede adjuntar un documento** a cualquier mensaje.
- **@menciones.** Escribir `@` ofrece los nombres de la organización; al elegir uno, el mensaje queda
  dirigido a esa persona y **ella entra a la conversación** aunque no estuviera. Es la forma de sumar a
  alguien sin abrir un hilo nuevo: la mención se resalta en el texto.
- **Quien escribe entra**, si no estaba.
- La conversación **no se cierra sola**: se termina a mano (§6).

---

## 5. El puente con el criterio

Una conversación nacida de un requerimiento muestra, sobre el chat, **la regla que lo gatilló**: su
número, su área, su nombre y el hallazgo que la levantó. Es lo que evita la pregunta de vuelta —«¿de
qué criterio me estás hablando?»— y lo que permite que quien responde entienda sin salir de la
conversación.

---

## 6. Terminar y reabrir

Cuando el asunto se resolvió, cualquiera de los participantes la **da por terminada**. Una conversación
terminada:

- **se lee completa**, pero no admite mensajes nuevos: en lugar de la caja de texto dice
  «Conversación terminada — sólo lectura»;
- **desaparece del filtro por defecto** («activos») y aparece marcada como «Terminada» en «todos»;
- **se puede reabrir** con un clic si el asunto vuelve.

Terminarla **queda en la auditoría** con quién y cuándo. Reabrirla no: es volver al estado normal.

---

## 7. Cómo se avisa

- **La campana** de la barra superior lleva el número de conversaciones **con mensajes sin leer**, en
  rojo. Una conversación cuenta como no leída cuando **el último mensaje es de otro** y este usuario no
  la ha abierto desde entonces.
- **Abrir la conversación la marca como leída**, sin apretar nada.
- Ese mismo número aparece en la **bandeja de gestión diaria** y en el **plan por ejecutivo**, para que
  el pendiente de responder se vea junto al resto del trabajo del día.
- **No hay correo ni notificación fuera de la aplicación**: la mensajería es interna y se lee dentro.

---

## 8. Quién puede verla

La mensajería es un **permiso por usuario**, que se administra en `Configuración › Permisos` junto con
los demás (ver la bitácora, ver cobranza, excepcionar verificación…). Quien no lo tiene **no ve el tab
Mensajería** en el detalle de la operación.

El super administrador lo tiene siempre. La lista de destinatarios de una conversación nueva ofrece a
los usuarios reales del tenant, sin incluirse a uno mismo ni a la cuenta de sistema.

---

## 9. Qué queda registrado

| Qué | Dónde |
|---|---|
| **Cada mensaje enviado** | auditoría: módulo «Mensajería interna», acción «Mensaje enviado», con el cliente, la operación y el texto |
| **Terminar una conversación** | auditoría: acción «Conversación terminada», con quién y cuándo |
| El intercambio completo | la propia conversación, dentro de la operación |

La auditoría es la misma que registra los visados y las verificaciones, con su encadenamiento de
huellas: un mensaje que decidió algo se puede reconstruir meses después.

---

## 10. Límites de hoy, dichos en vez de disimulados

| # | Límite | Qué implica |
|---|---|---|
| 1 | **Las conversaciones viven en memoria de la sesión.** A diferencia del visado, las verificaciones o las versiones, no pasan por la capa de repositorios: **se pierden al recargar la página** | En producción tienen que ser una tabla con `tenant_id` y persistencia, como el resto de la evidencia. Lo que **sí** sobrevive es la auditoría de cada mensaje |
| 2 | No hay **notificación fuera de la aplicación** (correo, push) | Quien no entra, no se entera. Para un requerimiento que bloquea una operación, eso es una decisión de producto que conviene revisar |
| 3 | El aviso de «Solicitar más información» de la mesa dice que **crea una tarea** y lo que crea es una **conversación** | O se crea la tarea, o el texto dice conversación. Está anotado también en el spec de excepciones |
| 4 | Una conversación terminada **la reabre cualquiera**, sin registro | Terminar se audita; reabrir no. Si reabrir tiene consecuencias —vuelve a contar como pendiente—, debería auditarse igual |
| 5 | No hay **búsqueda global** de mensajes ni exportación | El buscador filtra la lista por asunto, cliente, operación, participantes y el último mensaje, no el contenido completo del historial |

---

## 11. Cómo se verificó este documento

Cada afirmación se cotejó contra el fuente del pipeline (`pipeline_comercial.jsx`) el 21-09-2026: la
estructura de una conversación y sus campos, los dos tipos y sus etiquetas, los tres momentos que abren
conversación sola y sus asuntos, la reutilización del hilo por operación, el destinatario del
requerimiento desde la mesa, las @menciones y cómo suman participantes, el criterio de no leído, el
estado terminado y su cartel de sólo lectura, el permiso por usuario y las dos escrituras de auditoría.
Los límites del §10 también están medidos: la estructura de datos de las conversaciones no usa la capa
de repositorios.

---

## Documentos relacionados

| Documento | Qué cubre |
|---|---|
| [`spec-gestion-excepciones.md`](../Excepciones/spec-gestion-excepciones.md) | el proceso donde nacen los requerimientos y los avisos automáticos |
| [`spec-otorgamiento.md`](../Otorgamiento/spec-otorgamiento.md) | el modelo de riesgo y los criterios que un requerimiento cita |
| [`spec-ciclo-factura.md`](spec-ciclo-factura.md) | en qué orden corren los motores y dónde encaja cada aviso |

---

## Anexo · Control de versiones

**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.

| Versión | Fecha | Qué cambió |
|---|---|---|
| **1.0.0** | 21-09-2026 | Primera versión: el centro de mensajería interna, con sus cinco límites medidos. |
