---
type: sesion
title: "Sesión 2026-09-22 — La card de «Oferta» se cortaba por la página, y la mesa pasó a trabajar por operación"
description: "La raíz de la tabla del tubo no podía encogerse, así que su scroll no existía y la página desbordaba; y la Mesa de verificación pasa a operación → deudor colapsable → factura, con panel lateral para verificar y para no verificar, y nota rica con captura pegada"
tags: [sesion, verificacion, mesa, ui, tubo, respaldo]
timestamp: 2026-09-22T04:30:00Z
feature: null
---

# 22-09-2026 · La card de «Oferta» se cortaba por la página, y la mesa pasó a trabajar por operación

Sesión de reportes del usuario mirando su pantalla. Cinco pedidos, todos verificados en pantalla.

## 1 · «De nuevo se descuadró la card de la columna Oferta» → regla 56

Estaba en el tablero como «la card de la columna Oferta se corta», sin causa. **La causa medida**, a 1366 px
de ventana: la raíz de `TablaOportunidades` es un ITEM flex del contenedor que el tubo comparte con el
Kanban, trae `min-width: auto` y **no se encogía** por debajo del `minWidth: 1526px` de la tabla. Los tres
síntomas salían de ahí a la vez:

| | antes | después |
|---|---|---|
| raíz de la tabla | 1536 px, no cede | 1318 px |
| `overflow-x-auto` del panel | `scrollWidth === clientWidth` → **no scrollea nada** | 1534 sobre 1316 → scrollea |
| quién desborda | el contenedor de ARRIBA (`scrollWidth` 1536 / `clientWidth` 1318): la PÁGINA | nadie: `main` queda en 1366 |
| borde derecho de la card | x=1535 sobre una ventana de 1366 → **chips cortados** | dentro del panel, alcanzable con scroll |

Arreglo: **`min-w-0`** en esa raíz. Una clase. De 1600 px para arriba no cambia nada. Lo que NO arregla, a
propósito: bajo ~1574 px la tabla sigue sin caber —sus cinco columnas suman 1526 px de contenido medido— y
hay que desplazarla; lo que cambia es que se desplaza DENTRO de su marco. Gate `regla_56.test.mjs`.

**Cómo se midió**, por si vuelve: una sonda Playwright que recorre los ancestros de la `<table>` y reporta
`display / flex / min-width / overflow-x / width / clientWidth / scrollWidth` de cada uno, a varios anchos de
viewport. La cadena entera se lee de un vistazo y el culpable es el primero que no encoge.

## 2 · Los botones de la mesa: «Verificar» / «No verificar»

«Registrar llamada» y «No confirmó nada» a **«Verificar» / «No verificar»**, y los del documento —que decían
«Verificada» / «No verificada»— a lo mismo: estaban al lado de una píldora que dice «Verificada», así que un
botón con ese texto se leía como el estado y no como la acción.

## 3 · La mesa trabaja por OPERACIÓN → deudor colapsable → factura (regla 53, ampliada)

El usuario: «esta sección está con un layout muy complejo… deberías tener una card con el número de
operación, fecha oportunidad y estado de verificación global, dentro de cada oportunidad una lista de cards
colapsables a nivel de deudor, como el detalle de la oportunidad».

- **Tres niveles.** El agrupador (`filasVerificacion`) **no cambió** —sigue devolviendo una fila por
  (operación, deudor), es puro y está gateado—: el nivel de arriba se arma en la vista con `ops`.
- **Contadores al costado de la razón social**, y **un chip en cero no se dibuja**. El usuario lo pidió para
  «Pendientes»; vale para los tres. Una sola función (`cuentaVerif`) alimenta los dos niveles, para que el de
  la operación no pueda dejar de cuadrar con la suma de los de abajo.
- **Sin causas no hay disclosure**: la fila «0 causas que gatillaron la verificación» era ruido con la
  tipografía de un título.
- La tabla de documentos pasó de **7 columnas a 4**. Las tres que se fueron no llevaban una decisión: «Tipo
  doc.» decía «Factura electrónica» en todas (bajó a subtítulo del folio), las dos fechas son UN dato (van con
  la flecha) y «Respaldo» era una columna propia para un solo botón.

## 4 · Las dos decisiones pasan por un PANEL LATERAL (`DrawerVerificacion`)

`ModalLlamadaVerif` era un modal centrado y sólo servía para verificar. Ahora:

- **Lateral**, porque se registra MIRANDO la lista y un modal centrado tapa justo eso.
- **Sirve para las dos.** El «no verificó» también tiene información que capturar —con quién se habló, POR QUÉ
  no confirmó, el correo donde lo dice— y se resolvía con el sí/no de un `ConfirmDialog`: **se retiraba plata de
  una operación viva sin dejar un solo dato de por qué**. Ése fue el hallazgo de este pedido.
- **El alcance lo trae quien lo abre**: un folio desde su fila, o todo lo pendiente del deudor desde su
  cabecera. Si cubre todo lo pendiente se usa el escritor del deudor (que además congela el veredicto); si es
  un folio suelto, el del documento. En los dos casos el respaldo baja a CADA documento del alcance.
- **La fecha de pago vive dentro de su check** y se habilita al marcarlo. Era un campo suelto de la grilla de
  contacto, así que el check podía quedar marcado y la fecha vacía: exactamente el caso que su propio rótulo
  declara imposible. Ahora `completo` exige la fecha, y el campo es un `type="date"`.

`RespaldoFactura` se borró: su trabajo lo hace el panel. El gate `regla_53.test.mjs` se **re-ancló** a la
pantalla nueva (no se aflojó: pasó de 4 comprobaciones de forma a 13, y de 9 sondas a 12).

## 5 · La nota es un editor rico y acepta una captura pegada (regla 57)

- La captura queda **inline** en la nota, **baja al disco** (`guardarImagenPegada`) y **entra como adjunto**.
  Tres cosas, no una. Sin servidor, la carpeta de descargas es el único sistema de archivos al que este HTML
  puede escribir.
- El texto se pega **siempre plano**: copiar de un correo arrastra su hoja de estilos.
- Lo guardado se vuelve a pintar **saneado** (`notaSegura` + `NotaLeida`): lista blanca de elementos, ningún
  atributo sobrevive salvo el `src` `data:` de una imagen y su `alt`, y el árbol se arma en un `<template>`,
  que es inerte. `execCommand` pega lo que haya en el portapapeles y esto se le muestra meses después a quien
  audita un giro.
- En la bitácora va **texto plano** (`notaTextoPlano`): un `<div>` no se lee y una captura en base64 son cien
  mil caracteres en una fila de log.
- El `innerHTML` se escribe **sólo cuando difiere del DOM**. Reescribirlo en cada render mueve el cursor al
  principio y la nota se digita al revés — no lo caza ningún gate, sólo se ve tecleando.

## Lo que costó, y queda anotado

1. **`auditar_muerto` lee los `className` con una regex.** Un ternario dentro de un template literal
   (`` `… ${chico ? "px-2 py-1 t9" : "… t11"}` ``) le entrega `t9"` y `t11"}` como nombres de clase y tumba el
   gate de clases sin declarar. Se concatena en vez de interpolar (`clsBoton`).
2. **`regla_17` quiere el ofuscador EN EL SITIO DEL LOG.** Ofuscar al cargar (`const fono = fonoOfuscado(...)`)
   no basta: el identificador sigue marcado como cargado desde un campo de teléfono. Se hoistea el CONTACTO
   (`const cto = gestion.contacto`) y se llama `fonoOfuscado(cto.fono)` dentro de la glosa.
3. **Una glosa con templates anidados no se recorta con `` glosa: `[^`]*` ``**: el `[^`]*` se corta en el
   primer backtick interior. El gate 57 busca la interpolación (`${reg.notas}`) en todo el fuente.
4. **`atob` y `FileReader`** entraron a la lista de globales del linter. La lista dice exactamente qué toca
   esta app: crece cuando el fuente crece, y el linter avisa cuál falta.

## 6 · «El tubo sigue diciendo negociación, ya se envió la oferta» → regla 58

El usuario preguntó si existe un estado «publicado» y pidió crearlo entre la negociación y la aceptación
formal. **Ya existía** —`ETAPA_PUBLICADA = "oferta_publicada"`, rotulado «Oferta publicada»— y está
exactamente ahí. Medido sobre el build antes de tocar nada:

| paso | `ofertaPublicada` | chip |
|---|---|---|
| simulada | false | Negociación |
| tras «Cerrar oferta y publicar» | **false** | **Negociación** |
| con `ofertaComunicada` | true | Oferta publicada |
| aceptada | true | Aceptada |

**Dos causas, no una.**

1. **`patchCierre` no marcaba `ofertaComunicada`.** El botón dice «y publicar», el modal elige CÓMO se
   publica, el historial que ese gesto escribe dice «correo enviado al cliente con el código de negocio y su
   clave de un solo uso» y el `status` queda en «Oferta publicada» — y la bandera seguía en false. La misma
   pantalla decía cuatro cosas distintas. El comentario de encima del patch afirmaba «todavía NO se comunica
   al cliente» y contradecía al historial tres líneas más abajo: se corrigió el comentario, que era el
   equivocado.
2. **Los tres escritores no avisaban al tubo.** `cerrarOferta` sí; `publicarOferta` (el canal del Agente IA)
   y `enviarCierre` (el enlace para firmar) hacían su `setDeals` local y nada más. **Cuarta vez** que aparece
   el mismo agujero (15-bis-bis, 51, 55, 58): el aviso vive en el *call site*, así que el call site que se
   escribe después se olvida.

**El predicado no se afloja**: sigue exigiendo cerrada Y comunicada. Lo que cambia es que el cierre asienta
los dos porque hace los dos. La regla 54 y el caso 158 quedan intactos, y `e2e-58` prueba la distinción en la
fila del tubo, en las dos direcciones.

**Trampa que costó, y queda anotada**: la sonda de la regla 55 mutaba con
`jsx.replace("avisarTubo(id, patch);\n      return { ...d, ...patch };", …)`, o sea **la primera
coincidencia del fuente**. Con tres funciones difundiendo un `patch` con las mismas dos líneas, la mutación
cayó en `publicarOferta` y dejó intacta la que la sonda vigila: el gate pasó sin probar nada. Se corrigió a
mutar **dentro del cuerpo** de `confirmarCierre` (`sinAviso(src, firma)`). Una sonda que muta por texto
global caduca en cuanto el patrón se repite.

## 7 · El spec del proceso de curse (`Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md`)

El usuario dictó el **modelo de curse** —DTESync, corrida horaria, hora de corte 23:00 / reinicio 06:00,
los cinco motores en paralelo, lo que cada evaluación produce versionado— y pidió el spec. Se escribió con
un workflow de 16 agentes: **seis lectores** en paralelo (la costura, cuatro pares de specs de motor, las
reglas del vault, el fuente), **una conciliación** que partió el modelo en 40 cláusulas M-nn y les dio
estado con evidencia, **un redactor** en el formato de la casa, y **dos rondas de tres refutadores**
(contra el fuente, contra el vault/specs, cobertura del modelo) con corrector: 36 + 33 correcciones
aplicadas, todas verificadas contra el código antes de aplicarse. Resultado: 845 líneas, **16
implementadas · 19 implementadas distinto · 3 pendientes · 3 decisiones abiertas**, seis contradicciones
que no se cierran programando (§15) y lo pendiente por motor (§16). Es el insumo del análisis de gaps, las
historias de usuario y los casos de prueba Playwright que el usuario pidió para después de evaluarlo. Tras
las decisiones del 22-09 (§8) y ADR-0018 del 23-09 (§9), la Parte IV quedó en **25 implementadas · 12
implementadas distinto (todas decididas: implementar) · 3 pendientes (decididas) · 0 decisiones abiertas**.

**Tres cosas que el proceso destapó fuera del spec, y se corrigieron en el mismo commit:**

1. **Tres citas de caso del índice estaban corridas en +2** desde la renumeración de la mezcla del 21-09:
   la regla 8 citaba el 147 (Tesorería) en vez del 149 (la tasa contra el mínimo del deudor), la 15-bis-bis
   el 144 (integración al core) en vez del 146 (la solicitud no se pierde por un id repetido), y la 43 los
   145–146 en vez de los 147–148. `invariantes.test.mjs` no lo vio porque comprueba que el caso citado
   EXISTE, no que sea el correcto: queda como deuda mejorar ese gate para que cruce el número con el título
   del caso (la regla nombra lo que su caso prueba).
2. El comentario de `verifFactura` decía que el repositorio guarda «`{por, fecha}` y nada más»; desde el
   panel lateral guarda el registro entero. Se corrigió.
3. Un desfase entre documentos que el spec deja escrito: `spec-ciclo-factura.md` §17 dice que el cierre del
   día «re-origina como oportunidad NUEVA con identificador propio» y el fuente (`rolloverDia`, «EL ID NO
   CAMBIA») y la regla 22 dicen lo contrario. Va a la decisión #3 de §15; no se tocó el spec del ciclo.

**Lo que costó**: los refutadores de la segunda ronda encontraron casi tantos hallazgos como los de la
primera (32 contra 36), y no eran regresiones del corrector sino cobertura distinta —cada refutador nuevo
mira otras afirmaciones—. Un documento de 800 líneas con ~200 anclas al fuente no converge en dos rondas;
converge cuando el spec se cita en los gates.

**Y una decisión del usuario que quedó como regla de la casa** (`Specs_Procesos/README.md`, regla 3): el
borrador citaba el fuente por LÍNEA (`l.NNNNN`, 506 veces) y el usuario lo objetó: «no tiene ningún
sentido porque todo va a cambiar; el spec tiene que ir a la definición de la regla y/o condición, no a la
línea de código». Tiene razón: la línea es la foto de un día en un archivo de 51.000 líneas, y la
verificación de los refutadores ya quedó hecha. Se reescribieron las 506 citas a la **definición** —regla
por número, sección de spec, o la condición del fuente por su nombre— sin perder ninguna evidencia: donde
la línea sostenía una afirmación («entre l.47300 y l.47400 no consulta `excPend`»), ahora la sostiene la
condición («`cerrarOferta` no consulta `excPend` antes de escribir»). Ningún otro spec de la carpeta
citaba líneas: el nuevo era el único, y la regla 3 evita que vuelva a pasar.

## 8 · Decisiones del usuario sobre el modelo de curse (22-09-2026, al revisar las diferencias)

Textuales, con la lectura que se les dio y lo que queda por confirmar. Se propagan a los cuatro
documentos (spec, gaps, historias, casos) y las que tienen alternativa descartada van a ADR.

| Cláusula | Lo que dijo el usuario | Lectura | Queda por confirmar |
|---|---|---|---|
| M-01 | «Las aceptaciones son parte de las banderas de DTE» | La aceptación (acuse de recibo / aceptación del receptor) viaja con el DTE como el reclamo y la NC; el A1, el layout y el generador no la traen → gap de dato/contrato. **El 23-09**: «las facturas los primeros 8 días desde su emisión no tienen acuse de aceptación y/o reclamo y en ese estado de ausencia de acuse sí son candidatas» → el acuse se trae y se muestra, pero **no participa del filtro**: «sin acuse» es candidata; lo que excluye sigue siendo el reclamo (G-01 decidido del todo; CP-010 fija la lectura) | — |
| M-02 | «Debe leer la configuración y correr en base a esa configuración» | El cron del inbound lee `frecuenciaMin` (y la ventana) del tenant y corre con eso; hoy el parámetro es huérfano → implementar | — |
| M-05 / M-06 | «Está bien, es un join, no es parte del inbound» | Definición ajustada: la cuantificación Prime/Otros y el join con líneas son una consulta en pantalla, no un dato que produzca el inbound → pasan a **implementado** | — |
| M-07 | «Impleméntala con configuración del tenant» | La hora de corte (23:00 por defecto) existe como parámetro del tenant y el job la consume → implementar. **El 23-09**: «hoy el corte es por corridas (demo) pero en producción será un continuo; las oportunidades que han sido gestionadas por el ejecutivo (tienen oferta) no se eliminan» → el corte es por reloj porque el inbound de producción es continuo; «gestionada» = tiene oferta y no se toca; la sin oferta se **elimina** al corte y el inbound la vuelve a abrir al reinicio como oportunidad nueva con id propio y referencia; se retira el parámetro «etapa no gestionada». Descartada la reapertura con el mismo id (ADR-0019; T1) | — |
| M-28 | «En caso de no existir suficiente línea se solicita. En caso de existir suficiente se asigna esa» (23-09) | La errata del modelo («en caso de **existir** suficiente línea») queda confirmada: la solicitud automática al comité sale sólo cuando **no** existe línea suficiente; cuando existe, la cascada asigna esa línea y no se pide nada → implementado (definición ajustada); G-17 cerrado; CP-070 sin caso | — |
| M-09 | «Sólo si está cedida a una empresa diferente a Factoring Security; si está cedida a Security sí se puede agregar» | El inbound excluye la factura cedida a un factoring **ajeno**; la cedida a Security no se excluye → implementar (cierra la decisión D6) | — |
| M-10 | «No entendí este issue» | Se re-explica: el modelo describe reglas por atributos del **emisor** (cedente) —RUT, fecha de emisión, cesión previa— y una lista de emisores con tags; el sistema tiene reglas por atributos del **deudor** (listas Prime / Blanca / Autorizado) y del documento (crédito, sin reclamo, sin NC), sin criterio por fecha ni por cesión previa | Qué es la «lista de emisores con tags» y qué criterios por fecha y cesión previa se quieren |
| M-10 (2ª vuelta) | «Necesitamos implementar un criterio para ir a buscar facturas que tengan cierta antigüedad, ejemplo no más de 20 días desde su emisión, con eso basta» | Criterio nuevo del inbound: antigüedad máxima desde la emisión, configurable (20 días por defecto) → implementar. La «lista de emisores con tags» y la cesión previa se descartan como criterios | — |
| M-15 | «Está perfecto: son esas 3 reglas y/o las que en el futuro se clasifiquen como rechazo firme» | «Bloqueante» = rechazo firme, del catálogo; su efecto (pérdida terminal) se acepta → **implementado** | — |
| M-19 | «Debe ser una exigencia del backend y un gate» | La compuerta «sin excepciones sin justificar» va en la mutación (`cerrarOferta`), no sólo en el modal, y con gate → implementar (T2; regla 24) | — |
| M-20 / M-25 | «ok» | La clave estable (regla × sujeto; factura) basta como versionado → **implementado** | — |
| M-21 | «No debería quedar huérfano, debería quedar con un estado que identifique que cambió, para poder auditar que esa regla quedó así en el cambio de versión» | La excepción que deja de ser necesaria NO se elimina: el visado, la solicitud, la tarea y el hilo quedan marcados «ya no aplica desde la versión N», auditable → implementar (T1: cambia lo que el visado significa) | — |
| M-24 / M-26 | «Que se invoquen explícitamente y que queden versionadas» | Parte del evento de evaluación de M-13: verificación y líneas corren por el evento y emiten versión → implementar | — |
| M-27 | «Ok» | Cinco líneas (LF1–LF4 + la global del deudor) → **implementado** | — |
| M-33 | «El resultado de la línea sí afecta el tipo de giro; si hay que pedir comité el giro debe ser Giro Normal» | El resultado de líneas entra al criterio del giro: `requiereComite > 0` ⇒ GN → implementar (T1: cambia el motor de giros, regla 22) | — |
| M-35 | «Está bien que sea contra el último negocio; ¿qué significa sintético en tu respuesta?» | Definición confirmada: el último negocio del cliente. «Sintético» = en la demo ese historial es dato generado, no leído de un activo → la fuente en producción es el último negocio cursado del cliente en el core (dato/contrato) | — |
| M-36 | «Implementa que sí emita versión y guarda en la versión el tipo de modelo que se utilizó para simular (tasa ponderada o última operación) y las condiciones de descuento y comisiones que se asignaron» | La simulación emite versión, y la versión guarda el modo de tasa y las condiciones (descuento, comisiones) → implementar (T1) | — |
| M-08 | «Implemento ese job en base al parámetro configurable del tenant» | Job de reinicio por parámetro del tenant (06:00 por defecto) → implementar | — |
| M-18 | «Si se rechaza la línea o no se verifica, las facturas del deudor se deben retirar de la oferta y hacer una acción equivalente a reabrir la oferta, porque el ejecutivo la tiene que mandar a firmar de nuevo» · y el 23-09, sobre la verificación: «Si el verificador no verifica una factura, la operación debe quedar marcada con un issue, se debe notificar al ejecutivo con un mensaje de que no se podrá cursar porque la oferta tiene facturas que no pudieron ser verificadas y el ejecutivo deberá abrir la operación y sacar esas facturas de ese deudor no verificado, volver a simular, y volver a ejecutar el proceso de publicar la oferta para que el cliente firme la nueva operación» | Dos caminos que terminan en nueva firma: el comité rechaza y el sistema retira (ADR-0015); la verificación falla, el sistema marca el issue y avisa, y el ejecutivo retira, re-simula y vuelve a publicar (ADR-0018). Reemplaza el retiro automático con firma vigente de la regla 13 → implementar (T1) | — |
| M-29 | «Este es el comité de crédito, que opera fuera de la plataforma y da la aceptación o el rechazo de las solicitudes de aumento de línea puntual» | El comité es externo; NEX tiene que recibir el rechazo (estado «Rechazada» por línea en la API 3) y aplicar M-18 → implementar (dato/contrato + T1) | — |
| M-12 | «Hoy, cuando se cambia la selección de facturas, el ejecutivo debe presionar simular para volver a reevaluar las condiciones de la operación y todos los motores» | Gesto explícito: la regla 14 se mantiene; «simular» es el evento de M-13 → **implementado** (D1 cerrada) | — |
| M-22 | «No la entiendo, dame más detalles» | Se re-explica: el modelo dice que las reglas de verificación corren «a nivel de la empresa emisora» (quien emite = el cliente); el motor decide por DEUDOR (quien paga y a quien se llama). Por M-23 el usuario dice «los que pasan son los deudores». **El 23-09**: «es por deudor» / «sí, es empresa deudora» → implementado (definición ajustada); G-15 cerrado; CP-048 sin caso; D5 cerrada del todo | — |
| M-23 | «Todas las facturas de la oferta pasan por el motor de verificación (los que pasan son los deudores); ahí podrían salir deudores que no requieren verificación» | Es lo que el sistema hace: todas entran, se decide por deudor, y sólo las del deudor que falla se verifican → **implementado** (D5 cerrada en su segunda mitad) | — |
| M-13 (y M-24, M-26, M-36) | «Al presionar simular se debe generar un evento que gatille todas las evaluaciones de los motores de manera asíncrona pero paralela. Cada vez que el cliente simula y/o el ejecutivo simula y/o re-evalúa se debe volver a correr los motores. Cada motor debiera tener una versión como el motor de otorgamiento y siempre debieran haber la misma cantidad de ejecuciones en todos los motores» | **Un evento de evaluación** (simular / re-evaluar) corre los cinco motores en paralelo, cada uno emite versión, y el número de versiones es el mismo en los cinco. Es un T1: un invariante nuevo. Cierra parcialmente D1: el gatillo es el gesto de simular o re-evaluar, no cada clic de selección. **El 23-09**: «simular es la acción del ejecutivo que se ejecuta al Re-evaluar la oferta (y que contempla correr el motor de otorgamiento, verificación de facturas, asignación de líneas, motor de giros y motor de precios)» → «el cliente simula» era una forma de hablar: el único actor es el ejecutivo y el gesto es «Re-evaluar operación»; ni portal de autoservicio ni intent del Agente IA; D1 cerrada del todo | — |

## 9 · Gaps, historias de usuario, casos de prueba y ADR-0018 (22 y 23-09-2026)

Con el spec evaluado, el usuario pidió lo que había anunciado: cotejar el proceso descrito contra las
definiciones implementadas, sacar los gaps (funcionales, de proceso, de dato / contrato), escribir las
historias de usuario y los casos de prueba Playwright. Tres workflows, uno por fase:

1. **Gaps + historias + casos** (15 agentes: lectores por etapa, un redactor por documento, tres refutadores
   —trazabilidad, verdad contra el fuente, ejecutabilidad sobre el harness e2e— y corrector; 52 + 33
   correcciones): `Regresiones/Gaps_Proceso_Curse_2026-09-22.md`, `vault/specs/proceso-curse/historias_usuario.md`
   y `casos_de_prueba.md`. Nació `vault/specs/` (índice `specs/index.md`, fila en `vault/index.md`) como la
   carpeta por feature que `workflow.md` reservaba para «un T1 de verdad».
2. **Las decisiones del usuario** (§8), propagadas a los cuatro documentos por un workflow de 6 agentes
   (spec 30 cambios · gaps 10 · historias 25 · casos 19; verificador con 12 hallazgos, aplicados) y fijadas
   en **ADR-0013 … ADR-0017** donde hubo alternativa descartada.
3. **ADR-0018**, la respuesta del 23-09 sobre M-18 en la verificación (la última pregunta que abría la lista):
   un agente aplicó 43 cambios —G-36 y GD-12 nuevos, HU-42 reescrita con siete criterios, CP-138 … CP-142,
   CP-130 sin caso—, el verificador dejó 11 hallazgos (dos citas «G-35» que debían decir G-36, un recuento
   63/62, tres marcas «cambia con ADR-0018» que faltaban, cuatro frases con historial) y el corrector los
   aplicó.
4. **Las cinco confirmaciones que quedaban**, respondidas el mismo 23-09 al explicárselas una por una (§8):
   M-22 (la unidad de la verificación es el **deudor**), M-07 (la oportunidad sin oferta se **elimina** al corte y
   el inbound la vuelve a abrir con id propio; la que tiene oferta no se toca; el corte es por reloj porque el
   inbound de producción es continuo: **ADR-0019**), M-13 («el cliente simula» era una forma de hablar: simular
   es Re-evaluar, y es del ejecutivo), M-01 (sin acuse **sí** es candidata: el acuse se trae y se muestra, no
   filtra) y M-28 (la errata confirmada: se solicita sólo si no existe línea suficiente). M-22 se aplicó a mano
   y un agente propagó las otras cuatro a los cuatro documentos, con recuento.

Resultado: **36 gaps + 12 documentales** (8 cerrados aceptando la conducta actual · 18 decididos: implementar ·
0 por confirmar · 10 sin decisión), **42 historias** (19 vigentes · 23 por implementar · 0 por confirmar) y
**143 ids de CP, 133 con caso** (121 casos nuevos: e2e 50 · suite 66 · contrato 5). **No queda ninguna
confirmación pendiente**: lo que sigue es el backlog decidido, en rojo primero (tablero).

**Lo que costó, y queda anotado:**

- **El tercer workflow se lanzó justo antes de una compactación del contexto**, y la sesión que siguió lo dio por
  no arrancado —el `.output` de la tarea estaba vacío y a primera vista no había journal— y estuvo a punto de
  rehacer a mano el trabajo mientras el agente ya escribía (los cuatro archivos cambiaban de mtime). La señal
  fiable es el **journal del run** (`subagents/workflows/<run>/journal.jsonl`, una línea `started`/`result` por
  agente) y el **mtime** de los archivos; el `.output` queda vacío hasta que el workflow entero termina. Regla
  práctica: antes de editar un archivo que un agente pudo tomar, mirar su mtime y el journal.
- **Las dudas del aplicador, y cómo quedaron**: (1) republicar sobre una firmada exige reabrir primero
  («Editar la oferta» → «Reabrir operación», regla 33; reabrir ya revoca la firma, regla 1): HU-42 lo deja
  escrito y el gesto exacto se decide al implementar; (2) los rótulos de hoy («Retirar y vetar», «El deudor no
  confirmó · retirar») prometen el retiro: los fija la implementación; (3) retirar la última factura tras
  reabrir vacía la oferta (regla 13-sexdecies) y la pérdida es del ejecutivo, con causa (regla 5): así quedó
  CP-132; (4) G-11 pasó de proceso a funcional; (5) `spec-verificacion-facturas.md` §9,
  `spec-ciclo-factura.md` §14 y la regla 13 del vault **no se tocan** hasta el commit que implemente ADR-0018,
  con su caso en rojo primero (GD-12).
- **Dos sesiones paralelas y el «siguiente entero libre»** (deuda del tablero) vale también para los ADR: esta
  rama emitió 0013–0018 encima de 0012; quien mezcle otra rama con ADR renumera.

## Verificación

prettier · eslint · tsc sin TS1 · sin duplicados · build 44,1 MB · **415 gates de contrato** · **158/158** ·
**e2e 30/30** · capturas regeneradas. Reglas **56**, **57** y **58** nuevas y **53** ampliada, todas con gate
y sondas; `e2e-58` es el caso 30.

El cierre documental del 23-09 (§9) no toca el fuente, el build ni la suite: sólo los gates de contrato, **415/415**
(`rutas`, `vault` y `cifras` son los que vigilan estos documentos).
