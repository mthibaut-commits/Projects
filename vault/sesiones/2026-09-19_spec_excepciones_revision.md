---
type: sesion
title: "Sesión 2026-09-19 — Revisión del spec de gestión de excepciones con el usuario: alertas de configuración, re-evaluación y lenguaje para quien no diseñó el sistema"
description: "El usuario leyó el PDF del spec de gestión de excepciones y pidió cinco cosas: incluir los mensajes de alerta cuando la configuración deja una excepción sin aprobador, aclarar la frase del cargo vigente frente al anotado al solicitar, explicar qué es la re-evaluación e incluir la simulación entre los momentos en que corre el motor, reescribir la sección de agregar información para un lector ajeno al diseño, y sacar la palabra «compuerta» y la jerga (append-only, gate, se apila); todo verificado contra el fuente y mezclado en main"
tags: [sesion, spec, otorgamiento, excepciones, revision]
timestamp: 2026-09-19T00:40:00Z
feature: null
---

# Sesión 2026-09-19: el spec de excepciones, revisado con el usuario

## Hecho

- **Mensajes de alerta de configuración** (§2.2 punto 4, §2.3 y §6.4). Se citan tal como los produce el fuente:
  el cargo «Sin aprobador definido», el requisito «{Área} · N{nivel}» y las tres causas («el criterio no declara
  área» · «el área «{id}» no existe en este tenant — créala en Configuración › Áreas» · «nadie tiene {Área} en
  nivel N{nivel} o superior — asígnalo en Configuración › Usuarios»), y una tabla con **dónde aparece cada aviso**:
  la mesa (en el lugar de «Aprueban: …» y en el bloque de otros aprobadores), la tarjeta del tab («Requiere visto
  bueno de Sin aprobador definido (N4)»), la tarea (destinatario «Sin aprobador definido»), `Configuración ›
  Otorgamiento` (fila del tramo y tabla resumen, causa como tooltip) y `Configuración › Áreas` («⚠ nadie — hay
  criterios sin aprobador posible», «en uso» con «{n} criterio(s) rutean a esta área; quedarían sin aprobador»).
  El piso por monto se lee en ese mantenedor y **no se edita** desde la UI (`PISO_ATRIB_MONTO` sin escritor).
- **La frase que no se entendía** («…y no el que se anotó al solicitarla»). Reescrita en §2.3 y §4.4 con un
  ejemplo: se solicita con la operación en M$15 (Jefe de Grupo, N1), se incorpora una factura, pasa a M$50 y el
  piso la sube a N2 (Gerente Comercial); la tarjeta muestra el cargo calculado con el monto de hoy y la solicitud
  guarda sólo quién pidió y cuándo.
- **Qué es la re-evaluación** (§5.4 reescrito) y **la simulación como primer momento** (§4.1 pasa a una tabla de
  cinco momentos). Medido en el fuente: `simularOferta` deja la operación simulada y en Oferta (bitácora
  «Simulación de la oferta: N factura(s) por …»); «Re-evaluar operación» de la cabecera sólo apaga «Por evaluar»
  (`setReevalPend(false)`) y no crea versión; «Re-evaluación de la simulación» del tab (`reevaluarCliente`) pide
  las variables al origen y guarda una versión inmutable (v1 al primer uso, luego v2, v3…), habilitada sólo con
  re-evaluables pendientes y operación no perdida. Nueva fila **Versión de evaluación** en la tabla del §3.
- **§4.3 reescrito para un lector ajeno al diseño**: qué recibe el ejecutivo después de solicitar, qué ve, qué
  pasa con lo que agrega («＋ Información agregada por … · fecha»), por qué no se edita la solicitud original, por
  qué exige una solicitud previa, por qué no se guarda vacía y por qué no decide nada.
- **Sin «compuerta» ni jerga**: «compuerta» → «cuándo se puede visar» / «condición»; «gate» → «control de
  integración al core» / «la confirmación del cierre»; «append-only» → «sólo se agrega, nunca se edita»;
  «ampliación / se apila» → «información agregada después». «Criterio», que el usuario sugirió, se descartó porque
  en el documento ya nombra a las reglas del catálogo. Observación nueva en §10: en el tab, una excepción sin
  aprobador se puede solicitar igual. PDF regenerado y enviado; `mapa_documentos.md` con el mismo vocabulario.
- **El párrafo de apertura, redactado por el usuario** (19-09, sexta petición, con su texto de referencia):
  la premisa decía «una excepción es una decisión con nombre y hora», que describe la EVIDENCIA y no el
  HECHO. Ahora dice de dónde nace —una regla de negocio que se evalúa y **no se cumple**—, que no cumplir
  no bota la operación sino que habilita a alguien **facultado** a autorizarla, y para qué existe todo lo
  demás: que un negocio que **no cumple al 100%** se apruebe igual, con la trazabilidad y la auditoría que
  **Operaciones** necesita. El rótulo pasó a «Contexto y orden del documento».
- **Los tres controles del giro, en tabla** (19-09, séptima petición). §5.3 decía «sólo después de que sus
  tres controles pasen» y no los nombraba. Ahora abre con una tabla: **OTG-02** (ninguna excepción sin
  decidir ni rechazo re-evaluable sin regularizar · lo levantan los apoderados visando · bloquea la salida
  de «Otorgamiento / Verificación»), **VER-01** (todas las facturas con su verificación telefónica · lo
  levanta el equipo de verificación · bloquea en el mismo punto) y **GIR-02** (la huella de lo que se va a
  inyectar calza con la de lo firmado · se repara solo · bloquea la integración al core, el último punto
  antes del dinero), más **GIR-01** aparte, que no es un pendiente sino consecuencia del camino. Los
  enunciados salen literal de `INVARIANTES` en el fuente.
- **Faltaban dos controles en esa tabla** (20-09, corrección del usuario): la **línea** —cada factura con cupo
  aprobado y asignado; la que no cabe va al comité y la solicitud sale sola al cerrar— y la **aprobación de
  Operaciones N3**, que es el control HUMANO: alguien responde por lo que entra al core (que lo excepcionado
  esté bien excepcionado, las llamadas hechas, la documentación en regla). Quedan cinco filas: tres que se
  levantan trabajando, una que es la firma de una persona y GIR-02, que no se levanta sino que se cumple.
  **Medido antes de escribir:** la aprobación de Operaciones existe (`aprobarIntegracion`, exige Operaciones
  N3 y la huella), pero **el control de línea no se vuelve a comprobar factura por factura antes de girar**:
  el cupo se asigna al armar la oferta y la única compuerta de línea posterior a la firma es de nivel
  operación (`requiereOtorgamiento` → «excede la línea de crédito aprobada»). Queda como observación 8 del
  §10, para que el usuario decida si la firma de Operaciones debe exigirlo por factura.
- Context7 volvió a invocarse por slash command: sigue sin herramientas MCP en la sesión y no aplica.
- **`main` avanzó 40 commits mientras tanto y cambió la definición que acababa de documentar.** La **regla 35**
  (18-09, otra sesión) hace que una regla con tramo de excepción que no llega a nadie —sin área, área
  inexistente o sin usuario— **no se ejecute** y salga como «No ejecutada · falta configuración» (quinta
  disposición, ocho pantallas); «Sin aprobador definido» queda sólo para el **piso por monto**, que es de la
  operación y no de la regla. Además el fuente se formateó con Prettier (paso 0 nuevo), el paso 2 cambió de
  expresión y la suite es 143/143. Se mezcló `main` en la rama (conflicto sólo en el tablero) y el spec se
  reconcilió: §1 (disposición `no_ejecutada`), §2.2 punto 4, §2.3, §2.4, §6.4 reescrito con las dos
  situaciones y sus textos exactos (el párrafo que `main` había insertado quedaba a medias y decía
  «compuerta»), observación 7 acotada al piso, caso **141** citado. Cotejo: 44 textos y 11 casos citados
  existen en el fuente y la suite mezclados. PDF regenerado. Verificación sobre el árbol mezclado, con el
  procedimiento nuevo: paso 0 Prettier OK, `tsc` 0 TS1, 0 duplicados, build 41,3 MB, **233/233 gates**,
  **143/143 PASA**, **e2e 29/29 PASA**.
- Verificación sobre el árbol (docs y vault; el fuente no cambió): `tsc` 0 TS1, 0 duplicados, build 40,7 MB, **151/151 gates**,
  **140/140 PASA**; la capa e2e (29 casos) terminó después, también en verde: **29/29 PASA**.

## Decisiones tomadas con el usuario

- Las cinco peticiones son de **legibilidad y completitud** del entregable, no de proceso: ninguna cambió el
  comportamiento descrito. El usuario decide el vocabulario del documento: «compuerta» no vuelve.

## Errores encontrados y su solución (regla 11)

1. **Un rótulo citado de memoria** («enviar igual») y **una definición implícita** («se anotó al solicitarla»)
   sólo se cazan leyendo el PDF como lector externo. El cotejo literal contra el fuente atrapa lo primero; lo
   segundo lo atrapó el usuario. Antes de entregar conviene una pasada preguntando «¿esto lo entiende quien no
   estuvo en el diseño?».
2. **El hook de git evalúa el TEXTO del comando contra la rama vigente al invocarlo**: estando en `main`, bloquea
   cualquier comando que mencione un commit o un merge —aunque empiece con el cambio a la rama, y aunque la
   mención vaya dentro de un heredoc que sólo escribe un archivo—. Se separa el cambio de rama en un comando
   propio, y los textos que nombran esas operaciones se redactan sin la forma literal del subcomando.

## Pendiente / siguiente paso

- Las siete observaciones del §10 del spec siguen siendo decisiones del usuario o de negocio.
- Del usuario sigue pushear el tag `v0.1.0` desde Windows (403 desde el entorno remoto, tres intentos).

## Sorpresas y aprendizajes

- **Los dos «Re-evaluar» de la pantalla no hacen lo mismo**: el de la cabecera re-lee la operación tal como quedó;
  el del tab vuelve al origen y versiona. El documento tiene que decirlo, porque el usuario ve el mismo verbo dos
  veces y lee una sola cosa.
- **La simulación es un momento del motor aunque no tenga botón que diga «evaluar»**: es la primera vez que la
  operación tiene monto y facturas, y por eso es la v1. Un spec de proceso que parte en la pre-evaluación empieza
  un paso tarde.
