---
type: adr
title: "ADR-0016 · La excepción que deja de ser necesaria tras una re-evaluación se marca «ya no aplica desde la versión N», no se elimina"
description: "Cuando una re-evaluación deja de levantar una excepción que ya estaba solicitada o visada, el visado, la solicitud, la tarea y el hilo no quedan huérfanos ni se borran: reciben un estado que dice que cambió, con la versión, para poder auditarlo"
tags: [adr, otorgamiento, excepciones, versionado, auditoria]
estado: aceptado
timestamp: 2026-09-22T22:30:00Z
---

# ADR-0016 · La excepción que deja de ser necesaria tras una re-evaluación se marca «ya no aplica desde la versión N», no se elimina

## Contexto

El spec del curse (M-21) midió que, cuando una re-evaluación ya no levanta una excepción que se había
solicitado o visado, el criterio pasa a «cumple» y **el visado, la solicitud, la tarea y el hilo quedan
huérfanos**: nadie los elimina ni los marca. El modelo del usuario decía «se elimina la excepción ya
realizada». Al revisar la diferencia, el usuario precisó (22-09-2026):

> «No debería quedar huérfano, debería quedar con un estado que identifique que cambió, para poder
> auditar que esa regla quedó así en el cambio de versión.»

## Decisión

- Nada se borra. La solicitud y el visado de una excepción que la versión N ya no levanta pasan al
  estado **«ya no aplica desde la versión N»**, con actor «sistema» y hora; la tarea y el hilo asociados
  se cierran con ese mismo motivo.
- El criterio se muestra como **cumplido** en la versión vigente, y la excepción anterior sigue visible
  en el historial del visado con su nuevo estado.
- Si una versión posterior vuelve a levantar la misma excepción, se abre una solicitud **nueva**: la
  marcada no se reactiva.

## Alternativas descartadas

- **Eliminar** la excepción (texto original del modelo). Descartada por el usuario: se pierde la traza
  de que un apoderado la aprobó y de por qué dejó de hacer falta.
- **Dejarla como está** (estado actual): huérfana, aprobada sobre una regla que ya no gatilla.
  Descartada: es indistinguible de una aprobación vigente.

## Consecuencias

- Es un **T1**: cambia lo que un visado significa. Regla nueva con gate y caso en la suite que re-evalúe
  con una excepción visada que deja de gatillar y compruebe el estado y la auditoría.
- Cambian `visadoDealCalc` (que hoy consulta sólo lo que gatilla), el repositorio de visados y
  `spec-gestion-excepciones.md` §5.5.
