---
type: indice
title: "Conocimiento — qué responde cada documento y dónde va cada cosa"
description: "Índice de vault/conocimiento: las reglas de dominio por tema, la arquitectura, la verificación, el contrato con el servidor y el mapa de documentos; y la tabla de dónde va cada clase de conocimiento"
tags: [indice, conocimiento]
timestamp: 2026-09-17T15:29:14Z
---

# Conocimiento

## Qué responde cada documento

| Documento | Responde a |
|---|---|
| [`invariantes.md`](./invariantes.md) | ¿Qué reglas hay, dónde vive cada una y qué caso de la suite la verifica? ¿Qué invariantes del contrato con el servidor están sin gate? **Empezar por acá.** |
| [`reglas/curse_firma_y_etapas.md`](./reglas/curse_firma_y_etapas.md) | ¿Qué mueve una operación de etapa, qué la cierra, qué revoca la firma, qué pasa después de firmar? |
| [`reglas/clasificacion_deudor.md`](./reglas/clasificacion_deudor.md) | ¿Qué es la Nota Deudor, la CAT, y por qué una oferta vacía no tiene CAT? |
| [`reglas/verificacion.md`](./reglas/verificacion.md) | ¿Cuándo hay que llamar al deudor, con qué criterios, y qué congela el contacto? |
| [`reglas/otorgamiento_y_atribucion.md`](./reglas/otorgamiento_y_atribucion.md) | ¿Cómo decide el motor de otorgamiento, quién aprueba qué, cómo entran las vacaciones y la rotación? |
| [`reglas/lineas_y_solicitud_comite.md`](./reglas/lineas_y_solicitud_comite.md) | ¿Cómo se asigna la línea, qué es la reserva, qué congela una versión, cómo nace y viaja la solicitud al comité? |
| [`reglas/oferta_pricing_y_giro.md`](./reglas/oferta_pricing_y_giro.md) | ¿Cómo se calcula la tasa, el desglose del giro, el prorrateo por factura y el tipo de giro? |
| [`reglas/prospeccion_cartera_y_churn.md`](./reglas/prospeccion_cartera_y_churn.md) | ¿Quién es el ejecutivo de cada cliente, cuándo se reintenta un contacto, qué es churn? |
| [`reglas/datos_y_activos.md`](./reglas/datos_y_activos.md) | ¿De qué activo sale cada dato, y por qué el pipeline lee y no genera? |
| [`reglas/ui_detalle_y_tubo.md`](./reglas/ui_detalle_y_tubo.md) | ¿Cómo se parte, ordena y rotula lo que muestran el detalle y el tubo? |
| [`reglas/modo_directorio.md`](./reglas/modo_directorio.md) | ¿Qué es el toggle de demo acotada y por qué es desechable? |
| [`arquitectura.md`](./arquitectura.md) | ¿Cómo se construye el HTML, qué hay en `vendor/`, qué son los datos inyectados? |
| [`verificacion.md`](./verificacion.md) | ¿Qué cubre cada uno de los 114 casos de la suite y cada paso de verificación? |
| [`contrato_servidor_y_auditoria.md`](./contrato_servidor_y_auditoria.md) | ¿Qué debe implementar el resolver 1:1, qué es y qué no es un control de seguridad acá, cómo se audita? |
| [`mapa_documentos.md`](./mapa_documentos.md) | ¿Qué es cada documento fuera del vault (specs, integraciones, auditorías, capturas) y para qué sirve? |

## Dónde va cada cosa

| Si es… | Va en… |
|---|---|
| Una regla de dominio (lo que un review rechaza sin discusión) | `reglas/<tema>.md` al final del tema, con su fila en `invariantes.md` |
| Una decisión con alternativas descartadas | `../adr/` — inmutable |
| El estado presente de la arquitectura | `arquitectura.md` — se actualiza |
| Algo que aprendí hoy y mañana no importa | el log de sesión (`../sesiones/`) |
| Algo que aprendí hoy y en 3 meses seguirá importando | acá, en `conocimiento/` |
| Algo específico de esta máquina o de cómo trabaja el usuario | la memoria del agente, no el vault |
| En qué fase estamos y qué sigue | **solo** `../sesiones/estado_actual.md` |
| Cómo es un proceso o una integración HOY, para entregar | `Specs_Procesos/` e `Integraciones/` (fuera del vault, sin historial) |
