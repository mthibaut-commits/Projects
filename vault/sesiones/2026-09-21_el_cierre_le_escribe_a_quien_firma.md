---
type: sesion
title: "El cierre del negocio no le escribía a nadie, y la bandeja vacía mentía sobre por qué"
description: "Dos defectos que el usuario reportó juntos: `confirmarCierre` no llamaba a la mensajería una sola vez, y el cartel de la mesa de Otorgamientos confundía «no hay nada que hacer» con «hay 180 cosas y ninguna es tuya»"
tags: [sesion, otorgamiento, mensajeria, atribucion]
timestamp: 2026-09-21T19:40:00Z
---

# El cierre le escribe a quien firma · regla 50

## Qué reportó el usuario

> «Porque cuando se cierra un negocio no se están enviando los mensajes a los responsables ni al
> ejecutivo que tienen responsabilidad de aprobar. Además en el menú otorgamiento tampoco cuando
> cambias a uno de los aprobadores no se lista nada.»

Son dos cosas distintas y sólo una era un defecto del sistema. La otra era un cartel.

## 1 · El cierre no avisaba: una AUSENCIA, que es lo más difícil de cazar

`confirmarCierre` —162 líneas, el handler de la firma del cliente en el portal de Factoring
Security— llamaba a `hiloEnviar` **0 veces**, a `hiloNuevo` **0**, a `crearTarea` **0**. Tampoco a
`registrarAuditoria` ni a `logSys`. Lo único que dejaba era el `historialContacto` de la operación.

Lo que lo explica es que **de las dos puertas a la mesa de otorgamiento sólo avisaba una**:

| Puerta | Quién la abre | ¿Avisa? |
|---|---|---|
| Pre-evaluación | el ejecutivo aprieta un botón | sí, `avisarPreEval` |
| Firma del cliente | nadie: «la bandeja de otorgamiento la toma sin que nadie la envíe» | **no** |

O sea que **justo el camino donde nadie aprieta un botón era el que no le escribía a nadie**. La
operación quedaba esperando una firma que sus firmantes no sabían que existía.

Una ausencia no la caza ningún test que mire la salida, porque no hay salida que mirar: por eso el
gate de esta regla se fija sobre el TEXTO del fuente y no sobre lo que devuelve una función.

## 2 · Lo que se hizo

`avisarCierreNegocio`, de nivel módulo, simétrica de `avisarPreEval` y de `avisarAvanceOtorg` (que ya
hacía la dirección inversa: el aprobador avisa al ejecutivo cuando completa su parte). Cuatro
decisiones que vale la pena no re-litigar:

- **El remitente es el SISTEMA, no el ejecutivo.** La firma la hizo el CLIENTE en el portal. Además de
  que atribuirle un mensaje que no escribió falsea la bitácora, hay algo peor: `hiloEnviar` marca leído
  **sólo al remitente**, así que el aviso le habría llegado ya leído **justo a quien el usuario dijo que
  no le llega nada**. `CODE_SISTEMA` no entra a `USERS` —sería un login sin persona— ni a
  `participantes`, que son códigos de usuario que cinco pantallas resuelven contra `USERS`.
- **Calla cuando no hay nada que firmar ni que verificar.** Un «no tienes nada que hacer» en cada
  operación cursada limpia vacía la campana de significado, y ésas son la mayoría.
- **Los destinatarios salen del PADRÓN.** El bucle que `avisarPreEval` tenía escrito a mano recorría
  `ATRIB_USUARIO`, que es sólo *quién existe*: **se saltaba los reemplazos por vacaciones** (regla 19),
  así que quien cubre a un ausente no recibía el aviso. Ahora las dos usan `codigosAprobadoresDe`.
- **El texto dice los tramos y quién firma cada uno.** «3 criterios» no le sirve a nadie para saber si
  le toca; «2 de Comercial N3 (Gerente General) · 1 de Riesgo N5 (Subgerente de Riesgo)» sí.

Y el hilo **cruza de pestaña** (`recibirHilo` + `nex-hilo`): la firma vuelve del portal a la pestaña que
lo abrió, y ésa puede ser la del detalle, que monta el `DealDrawer` y nada más —sin campana ni bandeja
de mensajes—. Sin el puente el mensaje existía en la memoria de un documento que no lo muestra: el
mismo agujero que ya cerraron `nex-solicitud` y `nex-preeval`.

## 3 · La bandeja vacía: el motor estaba bien, el cartel no

Medido sobre la mesa de Otorgamientos: **180 excepciones pendientes** en 5 operaciones —110 de
comercial N3, 58 de riesgo N5, 12 de operaciones N4— y sólo **tres cargos** las alcanzan: Gerente
General, Subgerente de Riesgo y Operaciones (más el super-admin, que ve las 180). Jefe de Grupo
Comercial, Gerente Comercial, Jefe de Riesgo y Jefe de Operaciones ven **cero**.

**Eso es correcto** y es INC-03: `ROL_ATRIB` da UN área y UN nivel por rol, y `puedeAprobarExc` exige
nivel ≥ el requerido **dentro de la misma área** —la escalada no cruza áreas—. Lo que estaba mal era
que el cartel decía «No tienes operaciones con acciones pendientes», que se lee como *no hay nada que
hacer* cuando hay 180 cosas que hacer y ninguna es tuya. Ahora distingue las dos causas, lista los
tramos con quién firma cada uno y nombra la atribución del que está mirando.

**Vale la pena separar las dos mitades del reporte**: una era un defecto y la otra una explicación que
faltaba. Haber «arreglado» la segunda tocando el motor habría roto la atribución.

## Lo que hay que recordar del método

**Dos sondas negativas no plantaban nada, y las cazó su propia aserción** (`assert.notEqual(m.src, jsx)`
más el hecho de que el auditor no reportara el fallo esperado):

1. «el cierre deja de avisar» anteponía `null &&` a la llamada — el texto `avisarCierreNegocio(` seguía
   ahí, así que el auditor no veía nada raro. Una sonda tiene que **borrar** lo que el gate exige, no
   neutralizarlo.
2. «cada cierre abre un hilo nuevo» anclaba en `const prev = hilosDeDeal(deal.id).find(…)`, que aparece
   **idéntica en tres avisos distintos**: `String.replace` pisó la primera, que es la de `avisarPreEval`.
   La sonda cambiaba el fuente —su aserción pasaba— y no tocaba lo que el gate mira. Se re-ancló
   llevándose la línea de arriba, que sí es única.

Es la misma familia del fallo del 20-09 (`replace("window.LINEA_CUPO", …)` que pegó en un comentario):
**una sonda que planta en el lugar equivocado pasa sola**, y sólo se nota si el gate verde también se
comprueba en rojo.

## Verificación

Los seis pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **288 gates de contrato**
(40 archivos, +18 tests del gate nuevo) · **152/152** la suite · **29/29 e2e**.

El **paso 7 sí aplicaba** —la mesa de Otorgamientos es una de las 9 vistas de la navbar y su captura
muestra justo el cartel que cambió—, así que se capturó **a un directorio aparte** para comprobar que la
vista renderiza y que el texto nuevo es el correcto. `Capturas_UI/` **no se regeneró**: no es
determinista (el tubo se retrata a mitad del stream) y está desfasada desde el padrón real, así que
regenerarla es una decisión del usuario y sigue en el tablero como deuda 2.
