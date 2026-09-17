---
type: indice
title: "ADR — decisiones de arquitectura y decisiones cerradas antes del vault"
description: "Los ADR numerados (inmutables) y el registro de decisiones que se tomaron antes de existir el vault: cada una con fecha y un puntero a la regla que la contiene, para que no se re-litiguen"
tags: [indice, adr]
timestamp: 2026-09-17T15:29:14Z
---

# ADR

Un ADR aceptado es **inmutable**. Para cambiar de rumbo: ADR nuevo con `reemplaza:` y el viejo pasa a
`estado: reemplazada`. La numeración es `ADR-NNNN` y sigue desde acá.

| ADR | Título | Estado |
|---|---|---|
| [ADR-0001](./ADR-0001-partir-claude-md-y-abrir-el-vault.md) | Partir `CLAUDE.md` por vida útil y abrir el vault | aceptada · decidida con el usuario 17-09-2026 |
| [ADR-0002](./ADR-0002-cablear-los-gates.md) | Cablear los gates: tests de contrato, hooks deterministas y CI | aceptada · decidida con el usuario 17-09-2026 |
| [ADR-0003](./ADR-0003-id-estable-y-dos-marcas-al-editar.md) | El id de la operación es estable, y editar una oferta cerrada usa dos marcas | aceptada · 17-09-2026 |

## Decisiones cerradas antes del vault — registro con punteros

Estas decisiones se tomaron entre el 02-09 y el 16-09-2026 y su texto completo —contexto, alternativa
descartada, consecuencias— **vive dentro de la regla que las contiene** (`vault/conocimiento/reglas/`).
No se copian acá para no tener dos versiones; se listan para que una sesión nueva sepa que **ya están
decididas** y no las vuelva a proponer. Si una se reabre, se escribe un ADR nuevo que la reemplace.

| Fecha | Decisión | Dónde vive | Estado |
|---|---|---|---|
| — | Navegación por **navbar superior**; se probó un sidebar (§49) y el usuario prefirió la navbar. **No volver a proponer sidebar** | `.claude/rules/code_style.md` (Diseño Datamart UI) | cerrada |
| 02-09-2026 | El detalle de la oportunidad es **pestaña propia**, no un drawer sobre overlay | `.claude/rules/code_style.md` | cerrada |
| — | **Mis Tareas del Kanban** fue eliminado por completo; no reintroducir | `.claude/rules/code_style.md` | cerrada |
| — | **Curse nunca por email**: el cliente acepta sólo firmando en el portal; reabrir revoca la firma | regla 1 · `curse_firma_y_etapas.md` | cerrada |
| — | **La reserva no es de NEX**: NEX evalúa, el sistema de gestión de líneas reserva, el core commitea | regla 12 · `lineas_y_solicitud_comite.md` | cerrada (corrección del usuario al §3.7 del spec) |
| 11-09-2026 | **No hay nivel «Comité»**; C05 queda en Riesgo N5 (INC-06) | regla 4 · `otorgamiento_y_atribucion.md` | cerrada |
| 11-09-2026 | Se retira la homologación `nivel = 6−N`: el nivel es configuración de la regla (INC-01) | regla 4 | cerrada |
| 11-09-2026 | **El monto escala la atribución** como piso, `max` y no suma (INC-05); se retira el modelo paralelo de causas | regla 4 | cerrada |
| 11-09-2026 | Aprueba cualquier nivel igual o superior de la **misma** área; la escalada no cruza áreas (INC-02) | regla 18 | cerrada |
| 12-09-2026 | **Vacaciones son aditivas**: el ausente sigue aprobando salvo que el reemplazo se lo revoque | regla 19 | cerrada (decisión del usuario) |
| 12-09-2026 | El plazo equivalente se pondera por **diferencia de precio**, no por monto; manda la planilla | regla 21 · `oferta_pricing_y_giro.md` | cerrada (negocio) |
| 12-09-2026 | El residuo del prorrateo lo absorbe la **factura más grande** | regla 21 | cerrada (negocio) |
| 12-09-2026 | GE exige las dos condiciones; **GN se implementó como disyunción** | regla 22 | **abierta**: supuesto explícito, pendiente de confirmar |
| 13-09-2026 | Publicar la oferta se decide en el modal de curse; O05 existe siempre y la evidencia es una **huella**, no una bandera | regla 23 · `curse_firma_y_etapas.md` | cerrada |
| 13-09-2026 | Después de la firma: Otorgamiento/Verificación → Pendiente Integración → Pendiente de Giro; **firmar no es girar** | regla 26 | cerrada |
| 14-09-2026 | **Todo monto es un peso entero**; el millón es abreviatura de pantalla, escala única `M$` | `.claude/rules/code_style.md` | cerrada |
| 14-09-2026 | **C47–C50 se retiran**: quedaban dominadas por C40–C43 | regla 4 | cerrada |
| 14-09-2026 | **Las facturas salen del archivo**; el pipeline lee, no genera; una cesión apunta a un documento que existe | reglas 13-quater, 13-quinquies · `datos_y_activos.md` | cerrada |
| 15-09-2026 | **A5 se deriva de A2**: primero se genera A2, después se mide A5 sobre él | regla 13-undecies | cerrada (decisión del usuario) |
| 15-09-2026 | **Factoring target es configuración del tenant**, no atributo del cesionario | regla 13-duodecies | cerrada |
| 15-09-2026 | **Mínimo de línea aprobada $10.000.000**, la puntual exenta; un piso significa menos líneas, no más grandes | regla 27 | cerrada |
| 15-09-2026 | Una oferta con «Monto a Girar» no positivo **se simula pero no se cursa** | regla 13-septdecies | cerrada (decisión del usuario) |
| 15-09-2026 | La solicitud al comité **se genera sola al cerrar la oferta** y lo pedido se suma a la vigente | regla 15-bis | cerrada |
| 16-09-2026 | Ingesta de las seis entregas diarias por **AWS S3** (S3 → SNS → SQS), no SFTP | `mapa_documentos.md` (A25) | cerrada |
| 16-09-2026 | **Los documentos entregables no llevan historial**; la historia vive en el vault y en las auditorías | `mapa_documentos.md` | cerrada |
| 16-09-2026 | El nombre y el color de cada **etapa son configuración del tenant**; el código no se edita | regla 28 | cerrada |
| 16-09-2026 | El menú «Acciones» del detalle **no cierra la oferta ni avanza de etapa** | regla 30 | cerrada |
| 16-09-2026 | El **Modo Directorio** es un bloque desechable con cinco enganches marcados | regla 31 · `modo_directorio.md` | cerrada |
| 17-09-2026 | Partir `CLAUDE.md` por vida útil, verbatim, por tema | [ADR-0001](./ADR-0001-partir-claude-md-y-abrir-el-vault.md) | cerrada |
| 17-09-2026 | Gates por línea base, hooks en Node, CI de un solo job, preset A de git; sin tdd-guard ni formateador | [ADR-0002](./ADR-0002-cablear-los-gates.md) | cerrada |
| 17-09-2026 | El **id de la operación no cambia** con el cierre del día; **Editar** una oferta cerrada marca `enEdicion` aparte de `reabierta` | [ADR-0003](./ADR-0003-id-estable-y-dos-marcas-al-editar.md) · regla 32 | cerrada (pedido del usuario) |
