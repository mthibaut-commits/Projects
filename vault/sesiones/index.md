---
type: indice
title: "Sesiones — el tablero y los logs"
description: "estado_actual.md es el tablero (≤80 líneas, se sobrescribe); cada sesión deja un log con lo hecho, los errores y su solución, lo pendiente y las sorpresas"
tags: [indice, sesiones]
timestamp: 2026-09-19T00:40:00Z
---

# Sesiones

- [`estado_actual.md`](./estado_actual.md) — **el tablero**. Es el primer archivo que lee toda sesión y el
  último que actualiza. ≤80 líneas; se sobrescribe, no crece. La única casa de la fase y del siguiente paso.
- Un log por sesión, `YYYY-MM-DD_<tema>.md`, con *Hecho · Decisiones tomadas con el usuario · Errores
  encontrados y su solución · Pendiente · Sorpresas y aprendizajes*. Lo que en 3 meses siga importando sube a
  `../conocimiento/`.

| Fecha | Log | Qué pasó |
|---|---|---|
| 17-09-2026 | [`2026-09-17_partir_claude_md.md`](./2026-09-17_partir_claude_md.md) | Auditoría de bootstrap agéntico y partición de `CLAUDE.md`; se abre el vault |
| 17-09-2026 | [`2026-09-17_cablear_gates.md`](./2026-09-17_cablear_gates.md) | Tests de contrato, hooks deterministas y CI; primer hallazgo del gate de la suite |
| 17-09-2026 | [`2026-09-17_cerrar_invariantes.md`](./2026-09-17_cerrar_invariantes.md) | Se cierra la tabla de invariantes: un gate por cada una de las 30 filas que iban sólo por revisión (30 agentes escriben, 30 refutan, se repara lo refutado). La suite pasa de 115 a 139 casos, `tests/e2e/` de 1 a 16 archivos y `tests/contract/` de 6 a 24. Los gates destaparon siete defectos de producto, corregidos en el mismo commit, y 20 desfases regla↔código que quedan como decisión |
| 17-09-2026 | [`2026-09-17_merge_a_main.md`](./2026-09-17_merge_a_main.md) | `main` mezclado en la rama (cuatro commits paralelos, conflicto en `CLAUDE.md` portado al vault), `--no-ff` a `main` y `v0.1.0` |
| 17-09-2026 | [`2026-09-17_operacion_creada_y_editar.md`](./2026-09-17_operacion_creada_y_editar.md) | Chip «Operación creada» + Acciones › Editar (regla 33, caso 116); el cierre del día ya no renombra la operación (ADR-0004): el tubo vuelve a enterarse de la simulación |
| 17-09-2026 | [`2026-09-17_restyle_detalle_simulado.md`](./2026-09-17_restyle_detalle_simulado.md) | El detalle simulado según el mockup del usuario: giro sin badge, chip naranjo de solicitud, panel lila, Express en azul (reglas 29 y 22) |
| 17-09-2026 | [`2026-09-17_generador_v04_v10.md`](./2026-09-17_generador_v04_v10.md) | El A10 modela la relación por perfil y V10 pasa a ser del deudor: «verificados por modelo» 5% → 50%; se descubre que la cadena A2 → A5 → A2 del generador no tiene punto fijo y se regenera por bloque (`--solo`) |
| 21-09-2026 | [`2026-09-21_spec_mensajeria.md`](./2026-09-21_spec_mensajeria.md) | Spec del centro de mensajería interna: los dos tipos de conversación, los tres hilos que el otorgamiento abre solo y reutiliza, el puente con el criterio, @menciones, terminar y reabrir, la campana, el permiso y cinco límites medidos —el primero, que las conversaciones viven en memoria de la sesión— |
| 20-09-2026 | [`2026-09-20_controles_integracion.md`](./2026-09-20_controles_integracion.md) | Documentar la tabla de controles del giro destapa que el botón de integración al core sólo miraba la atribución y la huella: `controlesIntegracion` exige ahora OTG-02, VER-01, LIN-01 factura por factura y GIR-02, en el botón y antes de escribir (regla 41, caso 144, `regla_41.test.mjs`, ADR-0007) |
| 19-09-2026 | [`2026-09-19_spec_excepciones_revision.md`](./2026-09-19_spec_excepciones_revision.md) | El usuario revisa el PDF del spec de excepciones: se incluyen los mensajes de alerta de configuración («Sin aprobador definido» y dónde aparece), se aclara el cargo vigente con un ejemplo, se explica la re-evaluación y entra la simulación como primer momento del motor, §4.3 reescrito para un lector ajeno al diseño, y sale «compuerta» y la jerga |
| 18-09-2026 | [`2026-09-18_spec_gestion_excepciones.md`](./2026-09-18_spec_gestion_excepciones.md) | Spec del proceso operativo de una excepción de otorgamiento (`spec-gestion-excepciones.md` + PDF), verificado contra el fuente; Context7 no disponible ni aplicable; se corrigen dos viñetas del layout A16 (D02–D13 son excepciones, no bloqueos firmes) y los conteos del catálogo en `spec-otorgamiento.md` |
| 17-09-2026 | [`2026-09-17_punto_fijo_generador.md`](./2026-09-17_punto_fijo_generador.md) | Se cierra el bucle A2 → A5 → A2 del generador: la intención de participación pasa a ser un insumo declarado (`lib/intencion_sow.js`, congelado con la trayectoria que produjo el A2 vigente, hallada por arqueología en git), una corrida completa reproduce `datos_inyectados.js` byte a byte sin mover una cesión; gate `generador.test.mjs`, regla 32, ADR-0003 |
| 17-09-2026 | [`2026-09-17_unidades_v04.md`](./2026-09-17_unidades_v04.md) | El desfase de unidades de V03/V04/V09 se corrigió igual en dos sesiones; se reintegró desde `main` con lo adicional: V04 y V10 siguen mandando al teléfono a casi todos (dato y política), el layout del A10 en miles, el script de regresión en pesos |
| 18-09-2026 | [`2026-09-18_integracion_y_tab_todos.md`](./2026-09-18_integracion_y_tab_todos.md) | Se cierra el merge de las cuatro ramas del 17-09: cinco gates reconciliados (la compuerta de la regla 5 se mudó, los tokens del vacío se re-midieron, el chip de solicitud se partió en dos, el menú ganó «Editar»), una REGRESIÓN propia que sólo vio el e2e —el paquete cerrado escondía el menú con el reset que 13-quaterdecies exige deshabilitado y visible—, el renombre O05 y la regla 34: el tubo abre en «Todos», que pasa a ser el primer tab |

| 18-09-2026 | [`2026-09-18_regla_mal_definida.md`](./2026-09-18_regla_mal_definida.md) | Regla 35: un criterio sin área no se ejecuta ni se verifica y la salida lo dice, con la causa y dónde se arregla. La sonda de DOM destapó que una regla no ejecutada caía en el acordeón «N regla(s) aprobada(s)», contada como aprobada y escondida |

| 18-09-2026 | [`2026-09-18_orden_tabla_y_bandeja.md`](./2026-09-18_orden_tabla_y_bandeja.md) | El orden de la tabla pasa a ser prioridad de gestión con las que tienen línea global disponible primero (30-bis), deja de re-ordenarse en cada lote, y la Bandeja Inbound deja de botar facturas de la cartera en silencio (36). Tres preguntas del usuario contestadas midiendo en el navegador, y un contador que decía 262 sobre una tabla de 307 |

| 18-09-2026 | [`2026-09-18_regla_sin_aprobador.md`](./2026-09-18_regla_sin_aprobador.md) | Ampliación de la regla 35: tener área no basta —una regla excepcionable a la que nadie puede firmarle la excepción tampoco se ejecuta, con tres causas y tres mantenedores—. La compuerta recibe el PADRÓN por parámetro y el núcleo se partió en `cargoDeAreaNivel` porque `auditar_aislamiento` sacó a `evalReglaCli` de las puras; y un identificador citado dentro de un string cuenta como lectura para ese auditor |

| 21-09-2026 | [`2026-09-21_ordenar_la_carpeta.md`](./2026-09-21_ordenar_la_carpeta.md) | Los `.md` y `.pdf` de la raíz se ordenan por lo que el documento ES: `Auditoria/` (lo que mide), `Regresiones/` (lo que cotejó definición contra implementación), los PDF de contrato a `Integraciones/` y `Specs_Procesos/` partido en cinco temas. 41 renombres, 77 referencias rotas medidas con un verificador diferencial de enlaces y 63 reparadas; de paso, el paso 0 estaba en rojo en `main` y dos bloques de comandos habían perdido un salto de línea |

La historia anterior al vault (02-09 → 16-09-2026) no tiene logs propios: vive dentro de las reglas de
dominio (cada una trae fecha y qué la motivó) y en `Auditoria/` y `Regresiones/`.
