---
type: indice
title: "Specs de feature: qué se quiere, cómo se prueba"
description: "Índice de vault/specs/: una carpeta por feature con sus historias de usuario (feature), su plan de pruebas (plan) y, cuando lleguen, el spec técnico y las tareas. Nace el 22-09-2026 con el proceso de curse"
tags: [indice, specs]
timestamp: 2026-09-22T21:00:00Z
---

# Specs de feature

Una carpeta por feature, con el flujo que `.claude/rules/workflow.md` reserva para un **T1 de verdad**:
`feature` (las historias de usuario y sus criterios de aceptación) → `spec` → `plan` (cómo se prueba) →
`tareas`. Los specs de **proceso** —cómo ES el sistema hoy— no viven acá sino en `Specs_Procesos/`; y lo
que coteja definición contra implementación y deja hallazgos, en `Regresiones/`. Acá va lo que se QUIERE
y cómo se va a PROBAR.

| Carpeta | Qué es | Documentos |
|---|---|---|
| `proceso-curse/` | El proceso de curse de una operación tal como el negocio lo define (`Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md`), llevado a historias de usuario por actor y etapa y a casos de prueba sobre el harness e2e; los gaps que las motivan están en `Regresiones/Gaps_Proceso_Curse_2026-09-22.md` | `proceso-curse/historias_usuario.md` (feature) · `proceso-curse/casos_de_prueba.md` (plan) |
