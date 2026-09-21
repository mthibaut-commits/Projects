---
type: sesion
title: "Las carpetas: auditorías, regresiones y los specs por proceso"
description: "Reordenamiento que pidió el usuario. Lo caro no fue mover los archivos sino las referencias: ocho enlaces relativos entre specs que habrían quedado apuntando a nada, y un gate nuevo para que no vuelva a pasar"
tags: [sesion, documentacion, estructura, gates]
timestamp: 2026-09-21T21:00:00Z
---

# Ordenar las carpetas · `rutas.test.mjs`

## Qué pidió el usuario

> «Puedes ordenar la estructuras de archivos PDF, .MD de la carpeta; crear una carpeta auditoría; una
> carpeta de regresiones; Integraciones; además asegurarte que los Spec estén todos en Spec_Procesos y
> dentro de Spec_Procesos subcarpetas de Otorgamiento, Verificación, Lineas, Excepciones, Evaluación
> Factura (General del proceso de evaluación).»

## Lo que había

La raíz tenía **siete auditorías con sus PDF**, el análisis del módulo de líneas y
`regresion_diferencial.mjs` sueltos, y `Specs_Procesos/` era una carpeta **plana** con cuatro cosas
distintas revueltas: los specs de proceso en `.md`, los PDF de política, los PDF de integraciones y el
cotejo de definiciones.

## Dónde quedó cada cosa

`Auditorias/` (12 archivos, incluida la `Revision_Definiciones` que estaba en Specs) · `Regresiones/`
(`regresion_diferencial.mjs`) · `Integraciones/` recibió los **4 PDF de integración** que vivían en
Specs · y `Specs_Procesos/` quedó con cinco subcarpetas: `Otorgamiento`, `Verificacion`, `Lineas`,
`Excepciones`, `Evaluacion_Factura`.

**Nombres sin acentos ni espacios**, que es la convención que el repo ya tenía (`Specs_Procesos`,
`Capturas_UI`, `GeneradorDatos`) y además la carpeta del usuario es Windows.

**Tres specs quedaron en la raíz de `Specs_Procesos/` a propósito**: pricing, modelo de giro y los PDF
de Gestión de Oportunidad en Kanban no son de ninguno de los cinco procesos que el usuario nombró.
Inventarles carpeta habría sido fabricar estructura que nadie pidió; quedan a la vista y se decide.

## Lo caro no fue mover: fue lo que apuntaba

**Ocho enlaces relativos entre specs.** `spec-gestion-excepciones.md` (7) y `spec-otorgamiento.md` (1)
se citan con `](./spec-otro.md)`. Al separarlos en carpetas los ocho habrían quedado apuntando a nada —y
**nada lo habría dicho**: un `.md` no se ejecuta—. Se re-apuntaron con `../<Proceso>/`.

**Dos enlaces más, que el gate nuevo encontró y yo no.** `Auditoria_Bootstrap_Agentico_Cierre.md`
enlazaba `vault/conocimiento/despacho_agentes.md` y `.claude/rules/workflow.md` **relativos a la raíz**,
donde el archivo vivía. Al bajarlo a `Auditorias/` los dos se rompieron. Los cacé sólo porque escribí el
gate antes de commitear.

**Y una medición desfasada de antes:** `mapa_documentos.md` decía «los 11 specs de `Integraciones/`» y
hay **12**. Regla núcleo 2: gana la medición, el documento se corrige en el mismo commit.

## El gate: `tests/contract/rutas.test.mjs`

Toda ruta que un documento cita tiene que existir, en las dos formas que este repo usa: el enlace
markdown relativo (se resuelve contra su archivo) y la ruta en backticks (contra la raíz). **Exentas
`vault/sesiones/` y `vault/adr/`**, que son historia: un log dice dónde estaba un archivo el día que se
escribió y un ADR razona sobre el repo de su fecha —corregirles la ruta falsearía el registro, que es la
misma doctrina con la que el log del 18-09 dejó intactos los greps de una auditoría—.

En las auditorías sí se actualizaron las RUTAS, y no las cifras: **una ruta no es una medición**. Una
ruta muerta en un documento que alguien va a seguir estorba; un conteo fechado es evidencia.

**Un falso positivo, y se arregló la prosa y no el gate** (ADR-0006). Yo mismo escribí en
`mapa_documentos.md` «los ocho `](./spec-*.md)`» —un glob con forma de enlace— y el gate lo reclamó, con
razón: no puede distinguir un ejemplo de una cita. Aflojar el patrón para que pasara habría dejado de
vigilar justo los enlaces que este movimiento rompió.

## Verificación

El `.jsx`, la suite y los casos e2e **no se tocaron** —esto es mover archivos y corregir referencias—,
así que los pasos 0 a 3 se corrieron igual (prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build) y
el que importa es el **4: 296 gates de contrato**, +7 del gate nuevo. La suite y los e2e se corrieron
como confirmación sobre entradas idénticas a la corrida anterior.
