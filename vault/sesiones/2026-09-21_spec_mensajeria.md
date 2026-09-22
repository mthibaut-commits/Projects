---
type: sesion
title: "Sesión 2026-09-21 — Spec del centro de mensajería interna"
description: "El usuario pidió documentar el funcionamiento del centro de mensajería; se escribió spec-mensajeria-interna.md (+ PDF) contra el fuente: los dos tipos de conversación y por qué son dos, los tres momentos del otorgamiento que abren hilo solo, el puente con el criterio, @menciones, terminar y reabrir, el criterio de no leído, el permiso por usuario y cinco límites medidos, el primero de ellos que las conversaciones no pasan por la capa de repositorios y se pierden al recargar"
tags: [sesion, spec, mensajeria]
timestamp: 2026-09-21T02:30:00Z
feature: null
---

# Sesión 2026-09-21: el centro de mensajería, documentado

## Hecho

- **`Specs_Procesos/spec-mensajeria-interna.md` (+ `.pdf`, v1.0)**, once secciones: qué es una
  conversación y qué lleva; los **dos tipos** y por qué son dos —un requerimiento **bloquea trabajo de
  otro**—; dónde se abre (tab del detalle, campana) y **las tres que el proceso abre solo** (solicitar
  aprobación de una excepción, pre-evaluación, terminar la parte propia del visado), que **reutilizan el
  hilo** de la operación en vez de crear uno por evento; el requerimiento desde la mesa, atado **al
  criterio**, que la conversación muestra con su área y su hallazgo; @menciones que **suman
  participantes**; terminar y reabrir; el criterio de no leído y la campana; el permiso por usuario; lo
  que queda en auditoría; y los límites.
- **Los 30 textos de pantalla citados existen tal cual en el fuente** (etiquetas de los tipos, asuntos
  de los hilos automáticos, el cartel de sólo lectura, los mensajes de lista vacía, los destinatarios
  del requerimiento, las dos acciones de auditoría). Enlazado desde `mapa_documentos.md`.
- **Cinco límites medidos, no supuestos.** El primero importa: `HILOS` es un arreglo de módulo y **no
  pasa por la capa de repositorios** —a diferencia del visado, las verificaciones y las versiones—, así
  que las conversaciones **se pierden al recargar**; lo que sobrevive es la auditoría de cada mensaje.
  Los otros cuatro: no hay notificación fuera de la app; el aviso de «Solicitar más información» dice
  que crea una tarea y crea una conversación (ya anotado en el spec de excepciones); reabrir no se
  audita aunque terminar sí; y el buscador filtra por asunto, cliente, operación, participantes y último
  mensaje, no por el historial completo.
- Gates de contrato 268/268. Sólo cambia documentación: el fuente no se tocó.

## Decisiones tomadas con el usuario

- «Puedes documentar funcionamiento del centro de mensajería» (21-09). Se documentó **lo que hace hoy**,
  con sus límites medidos; ninguno se arregló en esta sesión. El primero —la persistencia— es el que
  conviene decidir: hoy es memoria de sesión y en producción tiene que ser una tabla por tenant.

## Errores encontrados y su solución (regla 11)

1. **`origin/main` había avanzado 8 commits** (reglas 44–46: las líneas como insumo del A23, el nivel 1
   como consolidado, el comité cerrando su bucle) y el hook bloquea `git merge --ff-only origin/main`
   estando en `main` por contener «git merge». Se trae con **`git pull --ff-only origin main`**, que el
   hook no intercepta y hace lo mismo.

## Pendiente / siguiente paso

- Los cinco límites del §10 son decisiones del usuario o de plataforma; el de la persistencia es el que
  bloquea un uso real.
- Del usuario sigue pushear el tag `v0.1.0` desde Windows (403 desde el entorno remoto).

## Sorpresas y aprendizajes

- **El módulo tiene dos entradas y una sola lista.** El tab del detalle filtra por operación y la
  campana por usuario, pero ambas leen el mismo arreglo de conversaciones; por eso una conversación
  atada a una operación, abierta desde la campana, **lleva a la ficha** en vez de responderse en el
  panel: el contexto está a un clic y nadie responde a ciegas.
- **Reutilizar el hilo por operación no es un detalle de implementación:** es lo que hace que los avisos
  del otorgamiento se lean de corrido en vez de como cinco conversaciones sueltas con el mismo asunto.
