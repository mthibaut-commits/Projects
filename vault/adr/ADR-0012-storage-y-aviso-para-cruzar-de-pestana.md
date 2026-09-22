---
type: adr
title: "ADR-0012 · El estado que cruza de pestaña va con storage Y aviso al opener, no con uno de los dos"
description: "Por qué el estado del otorgamiento se persiste en repositorio y además se difunde por postMessage, y por qué BroadcastChannel y el evento storage no son opción en este producto"
tags: [adr, otorgamiento, pestanas, arquitectura]
estado: aceptado
timestamp: 2026-09-21T22:00:00Z
---

# ADR-0012 · Storage **y** aviso para cruzar de pestaña

## Contexto

El usuario reportó tres cosas en una misma tarde, como si fueran tres defectos:

> «Cuando el Gerente Comercial ingresa al otorgamiento no le aparece ninguna línea pendiente siendo que
> en el detalle de otorgamiento sí se requieren de su aprobación.»
>
> «Tampoco se gatilló el mensaje en esta operación a los involucrados.»
>
> «El ejecutivo de verificación no puede accionar las acciones desde el menú verificación de las
> operaciones que fueron enviadas al comité y/o con solicitud de pre-evaluación.»

**Era uno solo.** `PRE_EVAL` era un `let {}` de módulo y `HILOS` un `let []`. El detalle de la
oportunidad es **pestaña propia** desde el 02-09 (regla 15-bis-bis), y un `let` de módulo es memoria de
cada documento: `solicitarAprobacionExc` escribe los dos —la pre-evaluación que habilita la bandeja y el
hilo que avisa al aprobador— **en el documento del detalle**, y la pestaña del tubo, donde se pintan la
mesa de Otorgamientos y el Centro de mensajería, no se enteraba nunca.

Peor: el **botón** «Pre-evaluación» sí avisaba, con un `postMessage` escrito a mano junto a su `onClick`.
El otro camino —solicitar la aprobación de una excepción, que es el que el ejecutivo usa de verdad— no.
Cuando el aviso vive en el call site, el call site que se escribe después se olvida.

## Decisión

El estado del otorgamiento que puede nacer en el detalle va con **las dos cosas**:

1. **Repositorio** (`crearRepo` → `localStorage`, por tenant): `repoPreEval` y `repoHilos`, como ya lo
   eran el visado, las solicitudes de excepción y los veredictos de verificación.
2. **Aviso al opener** (`postMessage`), emitido desde el **punto único** por donde pasa el estado
   —`setPreEval` y `hiloEnviar`—, nunca desde el call site.

Y un tercer pedazo que faltaba: `repo.recargar()`, porque `crearRepo` lee el storage **una sola vez** al
montar el módulo. Una pestaña ya abierta no veía lo que otra escribía ni siquiera en los repositorios que
ya existían. `refrescarEstadoOtorgamiento()` lo corre sobre los seis del otorgamiento al recibir un aviso.

## Alternativas descartadas

- **Sólo `postMessage`.** No sobrevive a cerrar la pestaña, y el flujo real es justamente ése: el
  ejecutivo cierra el detalle y el aprobador abre la mesa después. `crearRepo` ya traía escrita la
  distinción («aquél cruzaba a una pestaña ABIERTA y esto tiene que sobrevivir a que la pestaña se
  cierre») y lo que faltaba era aplicarla también acá.
- **Sólo storage.** El aprobador tiene el tubo abierto mientras el ejecutivo trabaja: sin aviso no se
  entera hasta recargar, y recargar no se le ocurre a nadie que está mirando una bandeja que dice cero.
- **`BroadcastChannel` o el evento `storage`.** No funcionan en este producto: el entregable se abre como
  **`file://`** y cada página es un **origen único**, así que no comparten ni canal ni storage. Es la
  misma razón por la que toda la comunicación entre pestañas de NEX es `postMessage` con `ORIGEN_APP`.
- **Difundir desde cada call site**, como hacía el botón. Es exactamente el defecto que este ADR cierra.

## Consecuencias

- `PRE_EVAL` y `HILOS` pasan a ser alias de repositorio, con la misma forma que `VISADO_STATE`: el código
  que los LEE no cambia; las escrituras pasan por el repo.
- Los `id` de hilo dejan de colisionar entre pestañas. Se numeran con el largo de la lista local, así que
  dos pestañas producían dos «H1001» distintos; guardando la **lista completa** bajo una clave, las dos
  parten de la misma lista. `recibirHilo` sigue identificando por **(operación, asunto)**, que es lo único
  estable entre documentos.
- El receptor **no re-difunde** (`setPreEval(…, difundir = false)`): sin ese corte, dos pestañas que se
  tengan la una a la otra como opener se rebotan el aviso.
- Lo que la mensajería escribe **queda en el navegador del usuario**. En producción esto es una tabla y el
  problema no existe; acá es storage por tenant y se limpia con `REPOS_FRESCOS`, igual que el resto.

## Regla

**51**, en [`reglas/otorgamiento_y_atribucion.md`](../conocimiento/reglas/otorgamiento_y_atribucion.md).
Gate: caso **155** de la suite y `tests/contract/regla_estado_pestanas.test.mjs`.
