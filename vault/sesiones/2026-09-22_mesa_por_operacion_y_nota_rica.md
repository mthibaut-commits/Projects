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
historias de usuario y los casos de prueba Playwright que el usuario pidió para después de evaluarlo.

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

## Verificación

prettier · eslint · tsc sin TS1 · sin duplicados · build 44,1 MB · **415 gates de contrato** · **158/158** ·
**e2e 30/30** · capturas regeneradas. Reglas **56**, **57** y **58** nuevas y **53** ampliada, todas con gate
y sondas; `e2e-58` es el caso 30.
