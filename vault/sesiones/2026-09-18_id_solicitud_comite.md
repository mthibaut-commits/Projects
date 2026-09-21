---
type: sesion
title: "La solicitud al comité deja de perderse por un id repetido: la pestaña propone, el tubo asigna"
description: "SOLIC_SEQ arranca en 0 en cada documento, así que dos cierres en dos pestañas proponían el mismo PRC-2601 y el receptor descartaba la segunda en silencio. Se deduplica por la SOLICITUD y no por el id. Con el caso 126, que medía el defecto a propósito, convertido en aserción del arreglo"
tags: [sesion, lineas, comite, 15-bis-bis, regla-24]
timestamp: 2026-09-18T23:30:00Z
---

# El id lo propone la pestaña y lo asigna el tubo

## El defecto

`SOLIC_SEQ` arranca en **0 en cada documento**, y el detalle de la oportunidad es **pestaña propia** desde el
02-09-2026. Dos ejecutivos —o el mismo en dos pestañas— cerrando dos ofertas producían **el mismo `PRC-2601`**
para solicitudes distintas. `recibirSolicitudLinea` deduplicaba por `idProceso`, así que la segunda se
descartaba: una petición al comité que el ejecutivo creía enviada, que no aparecía en la bandeja, y de la que
no quedaba ni una línea de log. **Nada fallaba**, que es el patrón de esta familia de defectos.

## Por qué el arreglo no es inventar producto

El modelo correcto ya estaba escrito en el propio fuente, en el comentario que encabeza el bloque de APIs:
*«la resolución ocurre en un sistema EXTERNO integrado vía API»*. El id de proceso **lo asigna ese sistema**;
la secuencia por pestaña es un artefacto del mock. Y en el mock, ese sistema externo **es el tubo**, que es
quien hospeda `SOLICITUDES_LINEA`. O sea que el id que emite el detalle siempre fue una **propuesta**, y el
tubo siempre fue quien debía asignarlo. El arreglo es hacer explícito lo que el diseño ya decía.

Lo que cambia, concretamente:

- La identidad de una solicitud pasa a ser **su contenido**, no su id: `mismaSolicitudComite` —mismo rut y
  mismo detalle, que es lo que el comité aprueba línea a línea— ya existía y se usaba al re-cerrar una oferta
  editada. Ahora también decide la idempotencia del receptor.
- Si el id propuesto está tomado por **otra** solicitud, entra con el siguiente id **libre** y conserva el
  propuesto en `idProcesoOrigen`, con su línea en el log técnico y en la auditoría. Esa traza no es adorno: la
  bitácora de la otra pestaña cita el id viejo, y sin ella la solicitud aparecería en la bandeja con un número
  que allá no existe (regla 24: nada cambia en silencio).
- `siguienteIdProceso()` avanza hasta encontrar un id que nadie tenga, y `api1Inyeccion` emite por ahí: el
  tubo tampoco puede re-emitir un id que ya recibió de una pestaña.

## El caso 126 medía el defecto a propósito

Su sección (e) decía, verbatim: *«la segunda se pierde en silencio (se documenta en hallazgos; acá sólo se
mide)»*. Es la disciplina correcta —un caso fija lo que el código hace, y el hallazgo se anota aparte— y por
eso el caso **falló en cuanto se arregló el defecto**, que es exactamente lo que tenía que pasar. Se convirtió
esa medición en aserción del arreglo. Su sección (c) se quedó donde estaba y ahora cuida la dirección
contraria: que arreglar esto no haya roto la idempotencia.

Hay un detalle que conviene no perder: (c) planta un clon que cambia `pedido` y `cliente` pero **no** el rut
ni el detalle, y sigue sin entrar. Antes el motivo era «mismo id»; ahora es `mismaSolicitudComite`, que es un
motivo mejor — dos solicitudes que piden lo mismo al comité son la misma aunque las etiquetas difieran.

## El gate también tenía escrita la regla vieja

`regla_15_bis_bis.test.mjs` exigía literalmente *«el receptor deduplica por idProceso»*. Re-anclado: ahora
exige que deduplique por `mismaSolicitudComite`, que asigne con `siguienteIdProceso()` y que conserve
`idProcesoOrigen`, con una sonda por cada una de las tres. Y conserva la que ya tenía: que el receptor **no
rearme** la solicitud llamando a `api1Inyeccion` —re-etiquetar no es rearmar; rearmar perdería lo que la
pestaña calculó—.

## Lo que NO se tocó, y por qué

La **regla 8** («fuera de atribución si el cliente pide tasa bajo el mínimo del deudor») sigue sin computarse.
El predicado es de una línea, pero **el evento que lo dispararía no existe**: nadie registra en ninguna parte
que el cliente pidió una tasa bajo el mínimo. Medido el 17-09: 1.889 de 5.520 contactos piden bajo el mínimo y
**0** quedan marcados. Implementarlo es inventar un canal y una interacción que el usuario no pidió — es
decisión de producto, y así quedó anotado desde el principio.

## Verificación

0 `prettier --check` limpio · 1 `tsc` sin TS1 · 2 sin duplicados · 3 build · 4 **208/208** contrato ·
5 **144/144** la suite · 6 e2e. `CASOS_ESPERADOS` sube de 143 a 144 y la aserción del caso 126 cambia de
sentido: las dos son decisiones y van dichas en el commit.
