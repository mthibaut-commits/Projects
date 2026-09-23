---
type: feature
title: "Historias de usuario del proceso de curse"
description: "Del inbound al giro, por etapa y por actor: las historias vigentes que protegen conducta con gate y las por implementar que cierran un gap G-nn (desde el 23-09-2026 ninguna queda pendiente de una decisión Dn); cada una con sus criterios de aceptación en Dado / Cuando / Entonces y en las dos direcciones cuando el criterio es un control"
tags: [feature, proceso-curse, historias-usuario, curse, gaps]
timestamp: 2026-09-23T13:00:00Z
---

# Historias de usuario del proceso de curse

**Fecha:** 22-09-2026 (con las decisiones del 23-09-2026 aplicadas: ADR-0018, ADR-0019, M-01, M-13, M-22 y M-28). Insumos: el modelo M-01…M-40 (más M-22-bis) de
`Specs_Procesos/Evaluacion_Factura/spec-proceso-curse.md`, las reglas del vault (`vault/conocimiento/reglas/`, índice
en `invariantes.md`), la matriz de gaps G-01…G-36 y las seis decisiones D1…D6 de
`Regresiones/Gaps_Proceso_Curse_2026-09-22.md`, el inventario de la capa e2e (`tests/e2e/`), **las decisiones del
usuario del 22-09-2026** (`vault/sesiones/2026-09-22_mesa_por_operacion_y_nota_rica.md` §8; las que tuvieron alternativa
descartada están en ADR-0013 … ADR-0017) y las del 23-09-2026: la verificación fallida (ADR-0018), el cierre del día
(ADR-0019), el acuse del DTE (M-01), «el cliente simula» (M-13), la unidad de la verificación (M-22) y la errata de M-28.

Cómo se lee:

- Una historia es **vigente** cuando el sistema ya hace lo que dice y hay gate (caso de la suite, `e2e-<regla>` o
  `regla_<slug>.test.mjs`): sus criterios protegen conducta y el caso de prueba que se derive sólo la fija en pantalla.
  Es **vigente (definición ajustada)**, con la fecha de su respuesta (22-09-2026 o 23-09-2026), cuando el usuario, al
  revisar las diferencias con el modelo, dio por buena la conducta actual: se ajustó el modelo, no el sistema.
- Es **por implementar** cuando cierra un gap G-nn: el criterio de aceptación es la regla que entraría al vault, y el
  caso se escribe **en rojo primero** (`.claude/rules/workflow.md`). Lleva «(ADR-nnnn)» cuando la decisión que faltaba
  se tomó el 22 o el 23-09-2026 con una alternativa descartada, y «→ decidido: implementar» cuando el usuario lo pidió
  tal cual.
- Es **pendiente de confirmar** cuando queda una pregunta que sólo el usuario puede responder: desde el 23-09-2026
  no hay ninguna. Las seis decisiones D1…D6 del documento de gaps están cerradas —D2 del todo con ADR-0018 y D3 con
  ADR-0019, el 23-09-2026— y cada historia trae una sola lectura.
- Un criterio es **vigente hoy · cambia con ADR-0018** cuando describe el retiro automático por «No verificar» que el
  sistema hace hoy y que ADR-0018 reemplaza: el criterio vigente queda como lo que hoy pasa (su caso de la suite se da
  vuelta en el commit del ADR) y el criterio nuevo dice la dirección contraria (HU-42).
- Los criterios que son un **control** van en las dos direcciones: el caso que pasa y el caso que bloquea.
- Lo observable es algo que una prueba lee: un rótulo de etapa, un chip, un estado en un repositorio, una fila de la
  bitácora, un botón deshabilitado con su motivo. Regla de la casa: la evidencia es la definición, nunca el código.
- Todo monto es un peso entero; `M$` es abreviatura de pantalla.

Actores: **Inbound (sistema)** · **Ejecutivo comercial** · **Agente IA** · **Apoderado por área y nivel** ·
**Ejecutivo de verificación** · **Comité de líneas** · **Operaciones N3** · **Tesorería** · **Cliente en el portal** ·
**Administrador del tenant**.

---

## Etapa 1 · Inbound (M-01 … M-10)

### Actor: Inbound (sistema)

### HU-01 · Abrir la oportunidad por cedente y actualizar la abierta
- **Como** Inbound (sistema), **quiero** abrir una oportunidad por cedente cuando llegan facturas y sumar a la abierta sin tocar su oferta, **para** que el ejecutivo vea una sola oportunidad viva por cliente.
- **Estado**: vigente.
- **Reglas**: 40, 49, 11 · **Cláusulas**: M-03, M-04 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado un cedente sin oportunidad abierta · Cuando la corrida trae sus facturas · Entonces aparece una fila del tubo en «Sin gestión» con la oferta vacía y las facturas en «Documentos disponibles».
  - CA-2 · Dado el mismo cedente con oportunidad en «Sin gestión» o «Negociación» · Cuando llegan facturas nuevas · Entonces «Documentos disponibles» crece sin duplicar folios y «Documentos en la oferta» no cambia (lo hace `aplicar`, `spec-inbound-facturas.md` §6, sobre la oportunidad ABIERTA; sin regla del vault ni caso: CP-002 es NUEVO. La regla 33 rige otra cosa: la oferta CERRADA es de sólo lectura hasta «Editar la oferta»).
  - CA-3 · Dado el cedente con oportunidad aceptada, cursada o perdida · Cuando llegan facturas · Entonces se abre otra oportunidad y la terminal no se reabre (regla 5).
  - CA-4 · Dado un stream que excede el tope de la Bandeja Inbound · Cuando entra lo nuevo · Entonces sale primero lo que no es de nadie y la bandeja dice cuánto botó (caso 142).
- **Notas**: el stream no es determinista; el caso e2e lo prueba con el Modo Directorio o inyectando por el canal (`e2e-31`).

### HU-02 · La corrida es un batch del servidor con topes del tenant
- **Como** Inbound (sistema), **quiero** que el acumulador de la corrida y los topes de oportunidades nuevas vivan fuera de la pestaña, **para** que cerrar el navegador no pierda la corrida ni el tope quede escrito en el código.
- **Estado**: por implementar (T2).
- **Reglas**: 40 · **Cláusulas**: M-03 · **Gaps**: G-29.
- **Criterios de aceptación**:
  - CA-1 · Dado un tope de oportunidades nuevas por corrida configurado en el tenant · Cuando la corrida trae más cedentes que el tope · Entonces abre exactamente el tope y la bitácora nombra cuántos quedaron para la siguiente.
  - CA-2 · Dado el mismo tenant con el tope cambiado en Configuración › Operación · Cuando corre de nuevo · Entonces el conteo abierto sigue al nuevo valor (dirección de control: el valor del código no manda).
- **Notas**: supuesto: los topes `MAX_NUEVOS` y el de facturas por oportunidad pasan a parámetros de `CFG_OPER_BASE` (GD-07).

### HU-03 · Candidata: no reclamada, sin NC y no cedida a un factoring ajeno
- **Como** Inbound (sistema), **quiero** que una factura cedida a un factoring distinto de Factoring Security no cuente como candidata, y que la cedida a Security sí cuente, **para** que el dimensionamiento de la tarjeta no infle facturas que nunca se van a poder comprar.
- **Estado**: **vigente desde el 23-09-2026** (ADR-0014 implementado: regla 60, caso 159). D6 cerrada el 22-09-2026: la cedida a un factoring ajeno queda fuera del inbound; la cedida a Security entra como cualquier otra.
- **Reglas**: 13-nonies · **Cláusulas**: M-09 · **Gaps**: G-06.
- **Criterios de aceptación**:
  - CA-1 · Dado un cedente con una factura cedida en el A2 a un factoring distinto de Factoring Security · Cuando corre el inbound · Entonces la factura no está en «Documentos disponibles» y el contador de la tarjeta no la suma.
  - CA-2 · Dado el mismo cedente con una factura cedida en el A2 a Factoring Security · Cuando corre el inbound · Entonces sí es candidata: está en «Documentos disponibles» y la tarjeta la cuenta (dirección que no bloquea).
  - CA-3 · Dado una factura cedida a un ajeno que ya estaba en el pool · Cuando el ejecutivo la incorpora · Entonces «Agregar a la simulación» sigue deshabilitado con el motivo de cesión (`estadoCandidata`, caso 95): el inbound y la incorporación distinguen propia/ajena con la misma fuente.
  - CA-4 · Dado la exclusión activa · Cuando se mira la columna SOW · Entonces el mix de cesionarios sigue mostrando al otro factor (caso 99): la medición no se pierde.
- **Notas**: ADR-0014: «El filtro de candidatura del inbound suma una cuarta condición: la factura no está cedida a un factoring distinto de Factoring Security (según el AEC, activo A2). Una factura cedida a Security no se excluye». Cambian `facturaCalifica` / el criterio «Buena factura» de `CRITERIO_PRED` y `spec-inbound-facturas.md` §3, §11 fila 1 y §12.1 (el desfase con el PDF de política se cierra).

### HU-04 · Las aceptaciones son una bandera del DTE
- **Como** Inbound (sistema), **quiero** que el acuse de recibo / aceptación del receptor llegue en el A1 como bandera del `EstadoDTE`, igual que el reclamo y la nota de crédito, **para** no dimensionar con un dato inventado.
- **Estado**: por implementar (T2; dato / contrato) → **decidido: implementar**; el filtro no cambia (definición ajustada 23-09-2026).
- **Reglas**: — · **Cláusulas**: M-01 · **Gaps**: G-01.
- **Criterios de aceptación**:
  - CA-1 · Dado el A1 · Cuando llega una factura · Entonces su aceptación es una bandera del `EstadoDTE` junto al reclamo y la NC, y el generador la produce desde esa bandera y no con un sorteo propio «Aceptada / Reclamada / Sin acuse»; el gate del generador (punto fijo) sigue verde.
  - CA-2 (control en las dos direcciones) · Dado una factura en sus primeros 8 días desde la emisión, sin acuse de aceptación ni reclamo · Cuando corre el inbound · Entonces sí es candidata —la tarjeta la cuenta y está en «Documentos disponibles»— y la fila del documento muestra «Sin acuse»; con acuse, también es candidata y la fila muestra la aceptación (dirección que no bloquea). Dado una factura reclamada · Cuando corre el inbound · Entonces no es candidata (dirección que bloquea): lo que excluye sigue siendo el reclamo y la NC —más la cesión a un factoring ajeno (HU-03, ADR-0014) y la exigencia de que la venta sea a crédito—; el acuse se muestra y no decide.
- **Notas**: «Las aceptaciones son parte de las banderas de DTE» (22-09-2026); «Las facturas los primeros 8 días desde su emisión no tienen acuse de aceptación y/o reclamo y en ese estado de ausencia de acuse sí son candidatas» (23-09-2026): se acepta la conducta vigente del filtro, sin ADR. Hoy el A1, el layout y el generador no traen la aceptación; reclamo y NC sí llegan como banderas del `EstadoDTE`; la cesión por el A2.

### HU-05 · Antigüedad máxima desde la emisión, configurable
- **Como** Inbound (sistema), **quiero** que sólo sean candidatas las facturas emitidas hace no más de N días, con N como parámetro del tenant (20 por defecto), **para** no ir a buscar facturas que por su antigüedad nadie va a comprar.
- **Estado**: vigente en CA-1 y CA-2 (implementada el 23-09-2026: regla 61, caso 160); CA-3 sigue por implementar (CP-013, control de configuración sin decisión). La «lista de emisores con tags» y la cesión previa como criterios quedan descartadas (22-09-2026).
- **Reglas**: 9-bis, 61 · **Cláusulas**: M-10 · **Gaps**: G-31 (implementado; G-07 quedó cerrado: la antigüedad va en G-31).
- **Criterios de aceptación**:
  - CA-1 · Dado el parámetro antigüedad máxima = 20 días · Cuando el inbound corre · Entonces una factura emitida hace 21 días no es candidata y el perfil de la Bandeja la cuenta como «Antigüedad > 20 días (excluida)»; una emitida hace 20 días sí lo es.
  - CA-2 · Dado el parámetro cambiado a 30 días en Configuración › Operación («Antigüedad máxima de la factura») · Cuando corre de nuevo · Entonces la de 21 días entra: el valor del código no manda (regla 9-bis).
  - CA-3 · Dado un criterio desconocido en la configuración · Cuando corre el filtro · Entonces no califica nada y Configuración › Inbound lo marca como no ejecutable (hoy califica todo: dirección que bloquea).
- **Notas**: «Necesitamos implementar un criterio para ir a buscar facturas que tengan cierta antigüedad, ejemplo no más de 20 días desde su emisión, con eso basta» (22-09-2026). Los tags de hoy son del deudor (A3/A4); no se crea una lista de emisores.

### HU-06 · Segmentación Prime / Otros y join con líneas: una consulta en pantalla
- **Como** Inbound (sistema), **quiero** que la cuantificación Prime / Otros y el cruce con líneas se calculen al dibujar la tarjeta como consulta sobre el A23, y no como un dato que la corrida escriba en la oportunidad, **para** que la cifra refleje la línea vigente sin esperar la siguiente corrida.
- **Estado**: vigente (definición ajustada 22-09-2026).
- **Reglas**: 13-decies, 44 · **Cláusulas**: M-05, M-06 · **Gaps**: G-04 (cerrado: no aplica).
- **Criterios de aceptación**:
  - CA-1 · Dado una oportunidad abierta · Cuando se dibuja la tarjeta · Entonces el chip parte los deudores por línea con un lookup sobre el A23 y no con el motor (regla 13-decies, caso 100).
  - CA-2 · Dado que el comité constituye una línea · Cuando la tarjeta se redibuja · Entonces la cifra cambia sin esperar corrida, porque lo constituido se superpone al activo (regla 44, caso 150).
  - CA-3 · Dado la oportunidad leída por su id · Cuando se inspecciona · Entonces no trae un campo `primeConLinea · otrosConLinea · sinLinea`: el inbound no lo produce (dirección que bloquea).
- **Notas**: «Está bien, es un join, no es parte del inbound» (22-09-2026). Sigue siendo una cota superior sobre el A23, nunca niega lo que el motor asigna (regla 13-decies).

### HU-07 · Una sola definición de Prime
- **Como** Inbound (sistema), **quiero** que «Prime» signifique lo mismo al segmentar y al verificar, **para** que un deudor no reciba el protocolo recortado en una pantalla y el completo en otra.
- **Estado**: por implementar (T1).
- **Reglas**: 6, 2 · **Cláusulas**: M-05 · **Gaps**: G-05.
- **Criterios de aceptación**:
  - CA-1 · Dado un deudor fuera de listas con nota > 4,2 · Cuando se mira el chip del tubo y el segmento de `verifDecision` · Entonces los dos dicen lo mismo (Prime u Otros según la definición única).
  - CA-2 · Dado un deudor en listas con nota ≤ 4,2 · Cuando se evalúa · Entonces también coinciden; hoy divergen (caso 116 fija la nota; dirección que bloquea).
- **Notas**: supuesto: se decide por ADR cuál de las dos definiciones sobrevive; cambia el segmento V01–V10.

### Actor: Administrador del tenant

### HU-08 · Frecuencia, hora de corte y hora de reinicio que el job consume
- **Como** Administrador del tenant, **quiero** que `frecuenciaMin`, la hora de corte (`horaFin`, 23:00 por defecto) y la hora de reinicio (`horaInicio`, 06:00 por defecto) gobiernen la corrida, **para** que lo que edito en Configuración › Operación mande y no sea decorativo.
- **Estado**: por implementar (T2) → **decidido: implementar** (M-02, M-07, M-08). Qué hace el corte con cada oportunidad lo fija HU-09 (ADR-0019).
- **Reglas**: 9-bis · **Cláusulas**: M-02, M-07, M-08 · **Gaps**: G-02.
- **Criterios de aceptación**:
  - CA-1 · Dado `frecuenciaMin` cambiado y guardado · Cuando se observa la bitácora del inbound · Entonces las corridas se separan por ese intervalo y el `hint` del campo «Frecuencia de actualización» (Configuración › Operación, `CfgCampo`) ya no dice «DECLARATIVA» (hoy lo dice en mayúsculas: «DECLARATIVA: es el valor de producción…»; `CFG_OPER_BASE` no tiene `hint`, sólo un comentario). El caso 90 no asierta nada sobre `frecuenciaMin` —la nombra sólo en un comentario y su aserción mueve `otrosDeudoresPct`—, así que consumirla no lo pone en rojo: se corrige ese comentario y el `hint`, sin tocar el caso.
  - CA-2 · Dado la hora de corte del tenant · Cuando el reloj la alcanza · Entonces el job de corte corre una sola vez y la bitácora dice «Corte del día»; qué hace con cada oportunidad lo fija HU-09 (la que tiene oferta no se toca; la que no, se elimina); a otra hora el corte no corre, aunque el conteo de corridas complete un día (dirección que bloquea).
  - CA-3 · Dado la hora de reinicio del tenant · Cuando el reloj la alcanza · Entonces el job de reinicio arranca las corridas del día —y el inbound vuelve a abrir, como oportunidades nuevas, las que el corte eliminó (HU-09)— y la bitácora lo registra; entre el corte y el reinicio no se abren oportunidades y se registra «fuera de ventana». Cambiar cualquiera de las dos horas en Configuración › Operación mueve el corte o el reinicio.
- **Notas**: «Debe leer la configuración y correr en base a esa configuración» (M-02); «Impleméntala con configuración del tenant» (M-07); «Implemento ese job en base al parámetro configurable del tenant» (M-08). En producción el inbound es un proceso continuo: el corte y el reinicio cuelgan del reloj del tenant y no del conteo de corridas, que es un artificio de la demo («Hoy el corte es por corridas (demo) pero en producción será un continuo», 23-09-2026; ADR-0019). En la demo el cron es un `setInterval` bajo `modoDemo`; el caso e2e no puede mover el reloj.

### HU-09 · Cierre del día: la oportunidad sin oferta se elimina y el inbound la vuelve a originar; la que tiene oferta no se toca
- **Como** Administrador del tenant, **quiero** que al corte del día la oportunidad que nadie gestionó —la que no tiene oferta— se elimine y que al reinicio el inbound la vuelva a abrir como oportunidad nueva, y que la que tiene oferta no se toque, **para** que el ejecutivo empiece el día con lo que llegó sin perder lo que ya trabajó.
- **Estado**: por implementar (ADR-0019). D3 cerrada del todo el 23-09-2026: el corte y el reinicio son por reloj del tenant (HU-08); «gestionada» es la oportunidad que tiene oferta —el ejecutivo la simuló o la armó: etapa Oferta o posterior— y no se toca; la que no tiene oferta se elimina y el reinicio la re-origina con id propio y referencia. Descartados reabrir con el mismo id (hoy, `rolloverDia`), «no gestionada» como etapa configurable del tenant y un criterio por actividad.
- **Reglas**: 22, 12-bis, 5 · **Cláusulas**: M-07, M-08 · **Gaps**: G-03.
- **Criterios de aceptación**:
  - CA-1 · Dado una oportunidad del inbound sin oferta (en «Sin gestión», con la oferta vacía) · Cuando llega la hora de corte del tenant · Entonces se elimina: desaparece del tubo y de la vista del ejecutivo, y la bitácora del sistema registra el cierre con el id, el cedente y el paquete que tenía.
  - CA-2 · Dado la oportunidad eliminada al corte · Cuando llega la hora de reinicio · Entonces el inbound abre una oportunidad nueva del mismo cedente, con id propio y una referencia a la eliminada, con las facturas que tenía más las que llegaron, sin simular y con la oferta vacía: es una originación, no una reapertura, y ninguna oportunidad conserva el id eliminado.
  - CA-3 (dirección que bloquea) · Dado una oportunidad con oferta —en «Negociación» (simulada, sin publicar), «Oferta publicada» o posterior— · Cuando pasa el corte · Entonces no la toca, cualquiera sea su etapa: mismo id, misma etapa, mismo paquete y misma oferta. El criterio es «tiene oferta», no una etapa configurable del tenant: ningún valor de la configuración hace que el corte elimine una oportunidad con oferta.
  - CA-4 (control en las dos direcciones, en el borde) · Dado dos oportunidades del inbound sin oferta · Cuando el ejecutivo simula una antes de la hora de corte y la otra sigue sin oferta · Entonces al corte la simulada no se elimina y la otra sí.
- **Notas**: «Hoy el corte es por corridas (demo) pero en producción será un continuo. Las oportunidades que han sido gestionadas por el ejecutivo (tienen oferta) no se eliminan» (23-09-2026). ADR-0019: la no gestionada se elimina a la hora de corte y al reinicio el inbound la vuelve a abrir «como una **oportunidad nueva, con su propio id** y una referencia a la eliminada, sin simular y con la oferta vacía. No es una reapertura: es una originación»; «el id no cambia» sigue valiendo para todo lo que sobrevive al corte. Cambian, en el commit que lo implemente, `rolloverDia` (elimina en vez de reabrir y salta las que tienen oferta), el job por hora del tenant (HU-08, G-02), la configuración del tenant (se retira `etapaNoGestionada`) y la regla 22 en lo que dice del cierre del día; `spec-ciclo-factura.md` §17 ya describe la originación con id propio (GD-02 cerrado). Un detalle abierto sobre una oportunidad eliminada queda huérfano: su aviso de simulación llega con un id que ya no existe y se descarta, que es la conducta actual ante un id desconocido; cerrar esa pestaña con un mensaje es una mejora de pantalla, no parte de esta historia.

---

## Etapa 2 · Oportunidad y selección (M-11, M-12)

### Actor: Ejecutivo comercial

### HU-10 · Tomar la oportunidad y armar la oferta a mano
- **Como** Ejecutivo comercial, **quiero** recibir la oportunidad con la oferta vacía y elegir factura por factura, **para** decidir yo qué ofrezco.
- **Estado**: vigente.
- **Reglas**: 13-sexdecies, 33, 12-bis, 13-quaterdecies · **Cláusulas**: M-11 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado una oportunidad recién abierta · Cuando abro el detalle · Entonces «Documentos en la oferta» dice 0 · 0 y el panel de arranque pregunta qué facturas incluir (`e2e-13-octies-bis-a`).
  - CA-2 · Dado dos facturas agregadas · Cuando miro el panel · Entonces dice «Tienes 2 facturas elegidas · M$X» con acción principal «Simular la oferta» (`e2e-13-sexdecies-a`); la cabecera sigue en «Prospección» (`e2e-12-bis-b`).
  - CA-3 · Dado una sola factura · Cuando la retiro · Entonces la oferta queda vacía, el folio vuelve al pool y la fila sigue «Sin simular» (`e2e-13-sexdecies-c/d`).
  - CA-4 · Dado la oferta cerrada · Cuando intento agregar o retirar · Entonces no hay botones: el paquete es de sólo lectura y la única puerta es «Editar la oferta» (regla 33, caso 140).
- **Notas**: ninguna.

### HU-11 · Re-evaluar cuando cambia la selección es un gesto explícito
- **Como** Ejecutivo comercial, **quiero** saber qué de la oferta está evaluado y qué no cuando agrego o quito facturas, y decidir yo cuándo se re-evalúa, **para** no mostrarle al cliente una cifra que no corresponde a la selección.
- **Estado**: vigente (definición ajustada 22-09-2026). D1 cerrada: el gesto es explícito, la regla 14 se mantiene y «simular» es el evento de evaluación de HU-13 (ADR-0013).
- **Reglas**: 14 · **Cláusulas**: M-12 · **Gaps**: G-08 (cerrado sin cambio).
- **Criterios de aceptación**:
  - CA-1 · Dado una oferta simulada · Cuando agrego una factura · Entonces conteo y monto cambian al instante, el titular dice «La selección cambió» sin cifra y las filas «Sin evaluar» hasta «Re-evaluar operación» (`e2e-14-a/b`; caso 124).
  - CA-2 · Dado la misma oferta con la selección cambiada · Cuando no aprieto nada · Entonces no corre ninguna evaluación ni se emite versión: un clic de selección no es un evento (dirección que bloquea).
  - CA-3 · Dado «La selección cambió» en pantalla · Cuando miro el pie de la tarjeta · Entonces compuertas y chips de giro tampoco afirman cifras (hoy sí: `e2e-14-c` es el snapshot del defecto y se da vuelta en el mismo commit).
- **Notas**: «Hoy, cuando se cambia la selección de facturas, el ejecutivo debe presionar simular para volver a reevaluar las condiciones de la operación y todos los motores» (M-12, 22-09-2026). ADR-0013 descarta re-evaluar en cada clic: cada clic emitiría versión y consultaría la API de líneas, que el contrato no prevé (regla 12).

### HU-12 · La bitácora no anuncia un recálculo que no ocurrió
- **Como** Ejecutivo comercial, **quiero** que «Recalculando N oportunidad(es)…» y «Recálculo aplicado» aparezcan sólo si la oferta se re-simuló, **para** que la bitácora sea evidencia y no promesa.
- **Estado**: por implementar (T2) → **decidido: se retira el anuncio** (D1 cerrada en B el 22-09-2026, ADR-0013: la única evaluación es el evento explícito).
- **Reglas**: 14 · **Cláusulas**: M-12 · **Gaps**: G-09.
- **Criterios de aceptación**:
  - CA-1 · Dado una oportunidad simulada · Cuando llegan facturas nuevas · Entonces la bitácora dice «Facturas agregadas al pool» y no «Recálculo aplicado»; la oferta y su versión no cambian.
  - CA-2 · Dado la misma oportunidad · Cuando el ejecutivo aprieta «Re-evaluar» · Entonces la bitácora sí registra la evaluación y existe la versión nueva (dirección que no bloquea).
  - CA-3 · Dado el detalle en pestaña propia · Cuando la oportunidad está actualizando · Entonces no existe un banner inalcanzable: o se ve o no está en el fuente.
- **Notas**: GD-10 corrige el comentario y los mensajes en el mismo commit.

---

## Etapa 3 · Evaluación (M-13 … M-17, M-22 … M-27, M-30 … M-40)

### Actor: Inbound (sistema) — los motores

### HU-13 · Simular o re-evaluar es UN evento: cinco motores, cinco versiones con el mismo número
- **Como** sistema, **quiero** que «Simular la oferta» y «Re-evaluar» sean el mismo evento, que corra otorgamiento, verificación, líneas, giro y pricing en paralelo y que cada motor emita su versión con el mismo número, **para** que «la versión N» signifique lo mismo en los cinco y lo que el ejecutivo muestra al cliente no dependa del render.
- **Estado**: por implementar (ADR-0013). D1 cerrada del todo: el 22-09-2026, el gesto explícito es UN evento; el 23-09-2026, «el cliente simula» es una forma de hablar del modelo —simular es la acción del ejecutivo al re-evaluar la oferta y no hay simulación del cliente en ningún canal—.
- **Reglas**: 13, 14 · **Cláusulas**: M-13, M-24, M-26 · **Gaps**: G-10.
- **Criterios de aceptación**:
  - CA-1 · Dado una oferta armada sin simular · Cuando aprieto «Simular la oferta» · Entonces existe la versión v1 en los cinco motores —otorgamiento, verificación, líneas, giro y pricing— congelada sobre esas facturas, y no hay v1 retroactiva (caso 124 es el molde).
  - CA-2 · Dado la v1 emitida · Cuando aprieto «Re-evaluar» · Entonces los cinco motores corren de nuevo sobre el mismo paquete y cada uno queda con dos versiones: el número de versiones es el mismo en los cinco.
  - CA-3 · Dado que un motor no completa · Cuando termina el evento · Entonces no existe la versión N de la operación: una evaluación que no completa los cinco no es una versión (dirección que bloquea).
  - CA-4 · Dado la v1 emitida · Cuando cierro y reabro el detalle · Entonces el titular, la mesa de verificación y las compuertas de línea leen la versión, no un recálculo del render (`lineaDeVersion`).
  - CA-5 · Dado una oferta sin simular · Cuando abro el detalle · Entonces no hay versión y las compuertas dicen «Por evaluar».
- **Notas**: ADR-0013: «Simular y re-evaluar son el mismo evento […] El evento corre los cinco motores […] de forma asíncrona y en paralelo […] Cada motor emite una versión por evento, y el número de versiones es el mismo en los cinco […] La primera simulación emite la v1; no hay v1 retroactiva». Hoy emiten versión dos escritores y ninguno es la simulación: «Re-evaluación de la simulación» (`reevaluarCliente`, que hace nacer la v1 retroactiva) y el retiro por `noConfirmada` sobre una operación aceptada (`retirarFacturaOferta`; casos 21–23, regla 13). Cambian `simularOferta`, los llamadores de `reevaluarCliente`, `snapVersionCli`, y `spec-otorgamiento.md` §2 y `spec-gestion-excepciones.md` §4.1, que describen los tres gestos. «Simular es la acción del ejecutivo que se ejecuta al Re-evaluar la oferta (y que contempla correr el motor de otorgamiento, verificación de facturas, asignación de líneas, motor de giros y motor de precios)» (23-09-2026): el único actor del evento es el ejecutivo y el gesto es «Re-evaluar operación», el botón del resumen del detalle bajo «La selección cambió»; nada nuevo que construir, ni portal de autoservicio ni intent del Agente IA.

### HU-14 · Otorgamiento evalúa por empresa
- **Como** sistema, **quiero** evaluar las reglas del otorgamiento por cliente y por deudor, no por factura, **para** que una excepción se pida una vez por empresa.
- **Estado**: vigente.
- **Reglas**: 4 · **Cláusulas**: M-14 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado un deudor con tres facturas que gatilla una regla D · Cuando abro el tab Otorgamiento · Entonces hay una sola fila para ese deudor y su visado es por deudor (caso 47).
  - CA-2 · Dado el cliente que gatilla una regla C · Cuando se lista · Entonces la fila es del cliente y no se repite por deudor.
- **Notas**: ninguna.

### HU-15 · Asignación de líneas por factura, en cascada y sin curse parcial
- **Como** sistema, **quiero** asignar cada factura completa contra el cupo disponible y repartirla sólo dentro de la cascada del par, **para** que ninguna factura se curse a medias.
- **Estado**: vigente.
- **Reglas**: 7, 27, 41, LIN-01 · **Cláusulas**: M-30, M-31, M-32 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado una factura mayor que la LF3 del par y con LF2 holgada · Cuando corre la asignación · Entonces `origen` nombra LF3 y luego LF2 con los montos exactos —la cascada consume primero la PUNTUAL y después la NORMAL— (caso 3: factura de 130 con LF3 de 60 y LF2 de 172 → `[LF3:60, LF2:70]` en ese orden); que la factura repartida queda `CON_LINEA` lo fija el caso 7 (`fA` CON_LINEA).
  - CA-2 · Dado una factura de monto = disponible · Cuando corre · Entonces cursa; con un peso más queda `REQUIERE_COMITE` con motivo `cliente` (caso 134).
  - CA-3 · Dado una oferta con parte sin cupo · Cuando miro el detalle · Entonces el deudor muestra «Solicitud línea $Z» en ámbar con Z = monto − asignado (`e2e-29-b`: color `#C2410C` sobre `#FFF7ED`, tolerancia $1, uno por faltante, suma ≤ Y − X, y su desaparición tras «Sacar facturas sin línea»). Que la fila de la factura diga «Requiere comité» en la vista plana de la oferta es NUEVO: `e2e-29-b` no lee ese estado (se lee como `e2e-14-a` lee «Sin evaluar»; CP-041).
- **Notas**: el caso e2e ve la asignación por el titular; por factura sólo en la suite.

### HU-16 · La línea global del deudor es la quinta línea del modelo
- **Como** sistema, **quiero** que la asignación considere cinco líneas —LF1 a LF4 y la global del deudor—, **para** que el motor y el modelo cursen las mismas facturas.
- **Estado**: vigente (definición ajustada 22-09-2026).
- **Reglas**: 7, 44, 45 · **Cláusulas**: M-27 · **Gaps**: G-16 (cerrado).
- **Criterios de aceptación**:
  - CA-1 · Dado un par con cupo y un deudor con global agotada · Cuando corre la asignación · Entonces la factura queda `REQUIERE_COMITE` con motivo `deudor` y el tooltip del chip del tubo lo nombra «Nivel 3: línea global del deudor» (regla 7, ADR-0011).
  - CA-2 · Dado el mismo par con la global holgada · Cuando corre · Entonces la factura cursa por la cascada del par y no aparece motivo `deudor` (dirección que no bloquea).
- **Notas**: «Ok» a las cinco líneas (M-27, 22-09-2026). El spec de curse dice cinco, no cuatro.

### HU-17 · Consulta A23 en cada evaluación y `requiere_resimulacion`
- **Como** sistema, **quiero** que cada evaluación lea el estado real de la línea y que una operación firmada cuyo A23 cambió no apruebe en silencio un subconjunto, **para** que dos operaciones del mismo cliente no consuman el mismo cupo.
- **Estado**: por implementar (T1) → **decidido: implementar** (ADR-0013: líneas corre por el evento de evaluación y emite versión).
- **Reglas**: 12, 13 · **Cláusulas**: M-26, M-39 · **Gaps**: G-27.
- **Criterios de aceptación**:
  - CA-1 · Dado dos simulaciones del mismo cliente contra el mismo disponible · Cuando la segunda se firma después de que el core commiteó la primera · Entonces pasa a `requiere_resimulacion` y el detalle lo rotula en rojo con la diferencia (caso 122 nombra el estado).
  - CA-2 · Dado que el A23 no cambió entre versión y firma · Cuando se firma · Entonces sigue su camino y no aparece `requiere_resimulacion`.
- **Notas**: «Que se invoquen explícitamente y que queden versionadas» (M-24 / M-26, 22-09-2026). Transacción y lock son del servidor (`spec-asignacion-lineas.md` §6).

### HU-18 · Verificación por deudor y la Regla 0
- **Como** sistema, **quiero** que todas las facturas de la oferta pasen por el motor de verificación, que se decida por deudor a quién llamar, y que toda la oferta se verifique sólo para el cliente nuevo, **para** que el equipo llame a quien paga la factura.
- **Estado**: vigente (definición ajustada: el 22-09-2026 todas las facturas entran al motor y se decide por deudor, M-23; el 23-09-2026 la unidad de las reglas V01–V10 es el **deudor** —la empresa deudora, quien paga y a quien se llama—, M-22: «es por deudor»). D5 cerrada del todo; G-15 cerrado.
- **Reglas**: 6, 9-ter · **Cláusulas**: M-22, M-23 · **Gaps**: G-15 (cerrado).
- **Criterios de aceptación**:
  - CA-1 · Dado un deudor que falla V01–V10 · Cuando se abre la mesa · Entonces la fila es del deudor con todas sus causas y sólo sus facturas están «por verificar»; los deudores que pasan no requieren verificación (casos 27–30, 157).
  - CA-2 · Dado un cliente en su primera operación · Cuando se evalúa · Entonces todas las facturas de la oferta van a verificación (caso 76).
  - CA-3 · (retirado el 23-09-2026: la lectura «empresa emisora» quedó descartada; CA-1 y CA-2 son la definición).
- **Notas**: «Todas las facturas de la oferta pasan por el motor de verificación (los que pasan son los deudores); ahí podrían salir deudores que no requieren verificación» (M-23, 22-09-2026); «es por deudor» (M-22, 23-09-2026). GD-03 y GD-04 corrigen los textos.

### HU-19 · Pricing: tasa por deudor sobre cada documento con su plazo
- **Como** sistema, **quiero** que el descuento racional use el plazo del documento y la tasa del deudor, **para** que la diferencia de precio sea la de cada factura y no la de un plazo promedio.
- **Estado**: por implementar (T1).
- **Reglas**: 9, 21 · **Cláusulas**: M-34 · **Gaps**: G-23.
- **Criterios de aceptación**:
  - CA-1 · Dado dos facturas del mismo deudor con plazos distintos · Cuando corre el prorrateo · Entonces sus `VP` difieren con la misma tasa y la suma por documento sigue siendo el total (casos 70–73 son el molde).
  - CA-2 · Dado la tasa simulada bajo el piso del deudor · Cuando simulo · Entonces `SimResumen` dice que queda fuera de atribución (caso 149): lo vigente no se pierde.
- **Notas**: hoy el plazo llega por deudor (`spec-ciclo-factura.md` §23c fila 1).

### HU-20 · Tasa de referencia: el último negocio del cliente
- **Como** sistema, **quiero** que la tasa top-down parta del último negocio del cliente, **para** que el ejecutivo negocie contra un dato que el negocio reconoce.
- **Estado**: vigente (definición ajustada 22-09-2026). La fuente del dato en producción —el último negocio cursado del cliente en el core— es dato/contrato por implementar.
- **Reglas**: 8, 9 · **Cláusulas**: M-35 · **Gaps**: G-21 (cerrado en la definición; queda el contrato del dato).
- **Criterios de aceptación**:
  - CA-1 · Dado un cliente con negocios previos · Cuando miro la referencia · Entonces `tasaModo` parte del último negocio del cliente y el tooltip dice de qué negocio sale.
  - CA-2 · Dado un cliente sin historial · Cuando miro · Entonces la referencia dice «sin negocios previos» y no se rellena con un promedio inventado.
- **Notas**: «Está bien que sea contra el último negocio; ¿qué significa sintético en tu respuesta?» (M-35, 22-09-2026): en la demo ese historial es dato generado, no leído de un activo (`spec-pricing-simulacion.md` §4.2); en producción sale del core.

### HU-21 · La versión guarda el modo de tasa y las condiciones comerciales
- **Como** sistema, **quiero** que cada versión congele el modo de tasa con que se simuló (tasa ponderada o última operación) y las condiciones asignadas —descuento, comisiones y anticipo—, **para** poder probar qué se ofreció en la v1 y con qué modelo.
- **Estado**: por implementar (T1, ADR-0013) → **decidido: implementar**.
- **Reglas**: 13, 23 · **Cláusulas**: M-36 · **Gaps**: G-22, G-32.
- **Criterios de aceptación**:
  - CA-1 · Dado una simulación con tasa ponderada · Cuando se emite la versión · Entonces la versión guarda `modo de tasa = ponderada`, el descuento, las comisiones y el anticipo asignados; una simulada con «última operación» guarda ese modo, y el diff entre versiones reporta el cambio de modo o de condición cuando ocurre.
  - CA-2 · Dado la huella O05 · Cuando se compara · Entonces sigue fijando el paquete (N° operación, RUT, deudores, facturas, montos) y no el precio (regla 23, caso 85): la huella no cambia por una tasa o un modo distinto.
- **Notas**: «Implementa que sí emita versión y guarda en la versión el tipo de modelo que se utilizó para simular (tasa ponderada o última operación) y las condiciones de descuento y comisiones que se asignaron» (M-36, 22-09-2026). ADR-0013 punto 5; `snapVersionCli` hoy no contiene tasa, comisión ni anticipo.

### HU-22 · El resultado versionado se muestra: excepciones, verificación, solicitudes y giros
- **Como** sistema, **quiero** que el resultado diga qué excepciones, qué verificaciones, qué solicitudes y qué montos GE / GN produce la oferta, **para** que cada actor vea su parte.
- **Estado**: vigente.
- **Reglas**: 54, 53, 15-bis, 22 · **Cláusulas**: M-37, M-38, M-39, M-40 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado una oferta simulada · Cuando miro el tab Otorgamiento · Entonces lista los requisitos de excepción en morado (pronóstico) y al publicar pasan a rojo (caso 158).
  - CA-2 · Dado la misma oferta · Cuando abro la Mesa de verificación · Entonces lista sólo lo que el predictor mandó a teléfono, agrupado por deudor y con sus causas (caso 30: `filasVerificacion` agrupa por deudor y sólo trae los que requieren llamada, con `causas.length ≥ 1`; caso 27: todas las causas, no sólo la primera; el caso 157 fija otra cosa: el estado POR FACTURA, que la retirada sigue en la mesa y el respaldo por documento).
  - CA-3 · Dado deudores sin cupo · Cuando cierro · Entonces `solicitudes` se convierte en una solicitud al comité (caso 106) y el chip de giro reparte el Monto a Girar por tipo (casos 80, 83).
- **Notas**: ninguna.

### Actor: Apoderado por área y nivel

### HU-23 · Re-evaluables y excepcionables según criticidad
- **Como** Apoderado, **quiero** que sólo me lleguen las excepciones de mi área y nivel, escaladas por monto, **para** firmar lo que me corresponde y nada más.
- **Estado**: vigente.
- **Reglas**: 4, 18, 19, 35, OTG-01 · **Cláusulas**: M-16, M-17 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado una excepción de Operaciones N1 (C01) · Cuando la aprueba un cargo de Operaciones · Entonces queda visada; si la intenta un cargo COMERCIAL de nivel mayor (GG, N3) se rechaza con OTG-01 (casos 38 y 135: la escalada no cruza áreas). Dado una de Riesgo N5 (C21) · Cuando la intenta RG (N4) · Entonces se rechaza; SR (N5) sí la aprueba (caso 135). Dado un cargo vacante · Cuando se busca aprobador · Entonces lo cubre su jefatura del área y N4 de Riesgo es sólo RG / SR (caso 36).
  - CA-2 · Dado una regla cuyo tramo no llega a nadie · Cuando se evalúa · Entonces sale `no_ejecutada` y nombrada, no bloquea (caso 141).
  - CA-3 · Dado un rechazo re-evaluable · Cuando el ejecutivo re-evalúa con variables frescas · Entonces se emite versión y la excepción se vuelve a calcular; uno de `NO_REEV_CLIENTE` no (caso 56).
- **Notas**: sin caso en pantalla más allá del panel de solicitud (`e2e-15-bis-bis-a`).

### HU-24 · Rechazo firme del cliente: la operación se pierde con causa; no hay bloqueo por deudor
- **Como** Apoderado, **quiero** que un rechazo firme del cliente (C30–C32 y las que en el futuro se clasifiquen así) pierda la operación con causa, y que toda otra regla sea una excepción por firmar, **para** que nada salga de la oferta por el otorgamiento sin el gesto de alguien.
- **Estado**: vigente (definición ajustada 22-09-2026). D2 cerrada: no existe una disposición «bloqueante del deudor»; retirar las facturas de un deudor es la consecuencia del rechazo del comité (HU-35, ADR-0015) o de la verificación fallida (HU-42, ADR-0018: la marca y avisa, y el ejecutivo retira), no del otorgamiento.
- **Reglas**: 4, 5, 33, 1 · **Cláusulas**: M-15, M-18 · **Gaps**: G-11 (cerrado en M-15: no aplica; decidido en M-18 con ADR-0018, HU-42).
- **Criterios de aceptación**:
  - CA-1 (control en las dos direcciones) · Dado un cliente que gatilla C30–C32 · Cuando se evalúa · Entonces la operación pasa a «Perdida» con `perdidaPor: "sistema"` y causa específica (knockout → `rechFirme`, reglas 4 y 5). Dado el mismo cliente que gatilla una regla C que NO es knockout (re-evaluable, `rechReev`) · Cuando se evalúa · Entonces la operación sigue en su etapa, la regla sale como excepción por firmar y no se escribe `perdidaPor: "sistema"` (dirección que no bloquea).
  - CA-2 · Dado un deudor que gatilla una regla D · Cuando simulo · Entonces el detalle no propone retirarlo: la excepción se firma o se rechaza y, si el ejecutivo quiere sacarlo, lo retira a mano antes de cerrar (dirección que bloquea al retiro automático).
  - CA-3 · Dado la oferta firmada · Cuando una regla del otorgamiento cambia de resultado · Entonces no hay retiro: el paquete es de sólo lectura y la reserva no se toca (reglas 33, 12). Las únicas mutaciones que pasan sobre la firmada son el retiro de una factura marcada «no verificada» —hoy lo hace el sistema al marcar (regla 13, casos 21–23; CP-119, vigente hoy · cambia con ADR-0018); con ADR-0018 lo hace el ejecutivo (HU-42)— y el rechazo del comité (ADR-0015).
- **Notas**: «Está perfecto: son esas 3 reglas y/o las que en el futuro se clasifiquen como rechazo firme» (M-15, 22-09-2026): «bloqueante» = rechazo firme del catálogo, y su efecto —pérdida terminal— se acepta. M-18 quedó redefinido: «no es un bloqueo de otorgamiento; es la consecuencia del comité que rechaza o de la verificación fallida», y el 23-09-2026 cerrado para la verificación (ADR-0018).

---

## Etapa 4 · Cierre y publicación (M-19, M-28)

### Actor: Ejecutivo comercial

### HU-25 · Ninguna excepción sin justificar en la mutación de cierre
- **Como** Ejecutivo comercial, **quiero** que el cierre rechace una oferta con excepciones sin comentario aunque no pase por el modal, **para** que el control viva en la mutación y no en la pantalla.
- **Estado**: por implementar (T2; regla 24) → **decidido: implementar**, como exigencia del backend y con gate.
- **Reglas**: 24, 30, 13-septdecies · **Cláusulas**: M-19 · **Gaps**: G-12.
- **Criterios de aceptación**:
  - CA-1 · Dado una excepción sin comentario · Cuando se invoca `cerrarOferta` por cualquier camino · Entonces devuelve negativa, no escribe `ofertaCerrada` y la bitácora dice «Cierre rechazado · N excepción(es) sin justificar».
  - CA-2 · Dado todas justificadas · Cuando cierro · Entonces escribe `ofertaCerrada` y aparece el chip «Operación creada» (regla 33).
  - CA-3 · Dado el modal · Cuando hay excepciones mudas · Entonces «Confirmar y enviar» sigue deshabilitado con «Pendiente: N excepción(es) por aclarar en el tab Otorgamiento» (vigente, `e2e-15-bis-bis-a`).
  - CA-4 · Dado la Pre-evaluación · Cuando solicito · Entonces `solicitarAprobacionExc` no guarda una solicitud sin justificación.
- **Notas**: «Debe ser una exigencia del backend y un gate» (M-19, 22-09-2026). El molde es `giroCursable`, que el cierre ya aplica al monto (caso 108).

### HU-26 · Solicitud automática al comité al publicar
- **Como** Ejecutivo comercial, **quiero** que al publicar con parte sin cupo la solicitud al comité se arme sola y cruce al tubo, **para** no presentarla a mano.
- **Estado**: vigente (definición ajustada 23-09-2026): la solicitud automática sale sólo cuando no existe línea suficiente; cuando existe, la cascada asigna esa línea y no se pide nada.
- **Reglas**: 15-bis, 15-bis-bis, 15 · **Cláusulas**: M-28 · **Gaps**: G-17 (cerrado).
- **Criterios de aceptación**:
  - CA-1 · Dado deudores sin cupo · Cuando confirmo «Enviar a Comité y Publicar» · Entonces la bitácora dice «Solicitud de línea inyectada» con id y el tubo la tiene idéntica (`e2e-15-bis-bis-a`, que además comprueba que Líneas › Solicitudes CONTIENE el id —`verEnBandeja`—, no que la fila diga «En gestión»). El estado inicial «En gestión» lo escribe `api1Inyeccion` (`estado: "En gestión", refrescos: 0`) y es vigente pero sin gate en pantalla: leer el rótulo de la fila de la bandeja es NUEVO (CP-068).
  - CA-2 · Dado toda la oferta con cupo · Cuando cierro · Entonces el CTA dice «Cerrar oferta y publicar» y no se inyecta nada (`e2e-29-a`; dirección que bloquea).
  - CA-3 · (retirado el 23-09-2026: la lectura literal de M-28 —con línea suficiente, pedir igual al comité— quedó descartada; CA-1 y CA-2 son la definición).
- **Notas**: «En caso de no existir suficiente línea se solicita. En caso de existir suficiente se asigna esa.» (M-28, 23-09-2026): el «existir» del modelo es una errata y es lo que el sistema hace (`solicitudComiteDeOferta` devuelve `null` salvo `ev.requiereComite > 0`; regla 15-bis; casos 106, 107). Que lo pedido siga al motivo es HU-27 (G-18, sin decisión). El id lo propone la pestaña y lo asigna el tubo (caso 146).

### HU-27 · Lo que se pide al comité sigue al motivo del rechazo
- **Como** Ejecutivo comercial, **quiero** que la solicitud pida ampliar el tope del cliente cuando el motivo es `cliente`, LF1 cuando es `lf1` y una puntual cuando es el par, **para** que el comité resuelva lo que falta.
- **Estado**: por implementar (T1).
- **Reglas**: 15-bis, 7, 15-quater · **Cláusulas**: M-28 · **Gaps**: G-18.
- **Criterios de aceptación**:
  - CA-1 · Dado motivo `cliente` · Cuando se arma la solicitud · Entonces `propGlobal` > 0, el tipo no es `puntual` y «Ver documento» dice «Línea propuesta: ampliación del tope».
  - CA-2 · Dado motivo `deudor` (par sin cupo) · Cuando se arma · Entonces sigue una puntual cliente-deudor con «Solicitado» en el wizard (caso 106, vigente).
  - CA-3 · Dado motivo `lf1` · Cuando se arma · Entonces pide LF1 y no una puntual.
- **Notas**: `RESOLUCION_COMITE` ya mapea `pide` / `alcance`; falta que la solicitud lo use.

### HU-28 · Publicar por dos vías con la huella O05
- **Como** Ejecutivo comercial, **quiero** publicar electrónicamente o con contrato físico y que el paquete quede con huella, **para** que lo que se firme sea lo que se inyecte.
- **Estado**: vigente.
- **Reglas**: 23, 58, 54, 8 · **Cláusulas**: M-19, M-28 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado el modal · Cuando elijo «Electrónicamente · vía email» y confirmo · Entonces se abre el simulador de correo, la fila del tubo pasa a «Oferta publicada» y `exigeAcciones` pinta los pendientes en rojo. Gate por pieza: la fila del tubo → `e2e-58` (que NO pasa por el modal: inyecta `ofertaCerrada` / `ofertaComunicada` por el canal `nex-simulado`); el color de los pendientes → caso 158; la apertura del simulador de correo (`email.html`) → sin gate: el único e2e que confirma «Electrónicamente · vía email» es `e2e-15-bis-bis-a`, y afirma el log y la bandeja, no la pestaña de correo (CP-074 es NUEVO para eso).
  - CA-2 · Dado sólo `ofertaCerrada` sin comunicar · Cuando miro el tubo · Entonces sigue «Negociación» (`e2e-58`, dirección que bloquea; caso 31).
  - CA-3 · Dado la vía física · Cuando confirmo · Entonces O05 queda como excepción de Operaciones N3 con el contrato en su tarjeta, y la cierra el visado con el comprobante (regla 30-ter; caso 85: `fisicaSinVisar` es excepción de Operaciones N3 y `fisicaVisada` queda aprobada; caso 114 sólo para la segunda mitad de la regla: `ampliarSolicitudExc` agrega información después de solicitar sin pisar la justificación).
  - CA-4 · Dado el Agente IA que publicó por WhatsApp · Cuando se evalúa `ofertaPublicada` · Entonces cuenta como comunicada (caso 32).
- **Notas**: ninguna.

---

## Etapa 5 · Firma (§10 del spec)

### Actor: Cliente en el portal

### HU-29 · Aceptar sólo firmando en el portal
- **Como** Cliente, **quiero** aceptar la oferta firmando en el portal con OTP, **para** que mi aceptación sea la única que vale.
- **Estado**: vigente (sin caso en pantalla: ninguna maniobra e2e llega a la firma).
- **Reglas**: 1, 55, 26, 50 · **Cláusulas**: — (§10) · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado la oferta publicada · Cuando firmo en el portal · Entonces el detalle pasa a «Otorgamiento / Verificación» o «Pendiente Integración» según lo que falte, el tubo dice lo mismo (regla 55) y los aprobadores reciben el hilo «Cierre de negocio · <id>» (caso 154).
  - CA-2 · Dado la firma hecha · Cuando el ejecutivo aprieta «Editar la oferta» · Entonces `reabierta` bloquea `aprobacionFormalCliente` y una nueva firma la restituye (casos 24, 26).
  - CA-3 · Dado el ejecutivo · Cuando intenta mover a «Aceptada» · Entonces no existe esa acción (regla 1).
- **Notas**: el caso e2e necesita la maniobra nueva `email.html` → `curse.html` → `aceptada`, o el sustituto por el canal en la pestaña del detalle.

### Actor: Agente IA

### HU-30 · El «cursar» del chat no es una firma
- **Como** Agente IA, **quiero** que un «cursar» del cliente por WhatsApp registre la intención y no la aceptación, **para** no dar por firmada una operación sin portal ni OTP.
- **Estado**: por implementar (T1).
- **Reglas**: 1, 8 · **Cláusulas**: — (§10) · **Gaps**: G-26.
- **Criterios de aceptación**:
  - CA-1 · Dado una oferta publicada por el agente · Cuando el cliente escribe «cursar» · Entonces la bitácora dice «Intención de curse por WhatsApp», `clienteAcepto` sigue falso y la etapa sigue «Oferta publicada».
  - CA-2 · Dado esa intención · Cuando se consulta `aprobacionFormalCliente` · Entonces es falsa hasta la firma en el portal; después de firmar, verdadera (casos 24–26 son el molde).
- **Notas**: hoy el intent escribe `clienteAcepto: true` con la operación en `oferta`.

---

## Etapa 6 · Post-firma (M-18, M-20, M-21, M-22-bis, M-23, M-25, M-29)

### Actor: Apoderado por área y nivel

### HU-31 · Una excepción resuelta no se vuelve a pedir, y se identifica por su clave estable
- **Como** Apoderado, **quiero** que un visado sobreviva a la re-evaluación y que se sepa qué estaba visado al emitir cada versión, **para** no firmar dos veces y poder auditar.
- **Estado**: vigente (definición ajustada 22-09-2026: la clave estable regla × sujeto basta como versionado).
- **Reglas**: 33, 13, 51 · **Cláusulas**: M-20 · **Gaps**: G-13 (cerrado).
- **Criterios de aceptación**:
  - CA-1 · Dado un visado en `repoVisado` · Cuando el ejecutivo re-evalúa · Entonces la fila sigue «Aprobada» y no vuelve a la bandeja del apoderado (regla 33).
  - CA-2 · Dado la versión N emitida · Cuando se cruza el repositorio de visados por la clave estable (`dealId + stKey`) · Entonces se reconstruye qué estaba visado al emitirla, sin copiar el visado dentro de la versión.
  - CA-3 · Dado «Eliminar la simulación» · Cuando confirmo · Entonces el visado no se toca (`e2e-13-quaterdecies`).
- **Notas**: «ok» (M-20 / M-25, 22-09-2026): la clave estable —regla × sujeto para el visado; factura para la verificación— es el versionado.

### HU-32 · La excepción que dejó de aplicar se marca «ya no aplica desde la versión N», no se borra
- **Como** Apoderado, **quiero** que una excepción que ya no gatilla salga de mi bandeja con un estado que diga que cambió y desde qué versión, **para** no firmar ni rechazar algo que no existe y poder auditar que esa regla quedó así en el cambio de versión.
- **Estado**: por implementar (T1, ADR-0016) → **decidido: implementar**.
- **Reglas**: 4, 25 · **Cláusulas**: M-21 · **Gaps**: G-14, G-35.
- **Criterios de aceptación**:
  - CA-1 · Dado una excepción solicitada o visada · Cuando la versión N deja de gatillarla · Entonces la solicitud y el visado pasan a «ya no aplica desde la versión N» con actor «sistema» y hora, la tarea se cierra y el hilo recibe el aviso con ese mismo motivo; el criterio se muestra cumplido en la versión vigente y la excepción anterior sigue visible en el historial del visado con su nuevo estado.
  - CA-2 · Dado la misma excepción que sigue gatillando · Cuando se re-evalúa · Entonces la tarea sigue abierta y nada se marca (dirección que bloquea).
  - CA-3 · Dado una excepción marcada «ya no aplica» · Cuando la versión N+1 la vuelve a gatillar · Entonces se abre una solicitud nueva y la marcada no se reactiva.
- **Notas**: ADR-0016: «Nada se borra. La solicitud y el visado de una excepción que la versión N ya no levanta pasan al estado “ya no aplica desde la versión N”, con actor “sistema” y hora; la tarea y el hilo asociados se cierran con ese mismo motivo». «No debería quedar huérfano, debería quedar con un estado que identifique que cambió, para poder auditar que esa regla quedó así en el cambio de versión» (M-21). Cambian `visadoDealCalc`, el repositorio de visados y `spec-gestion-excepciones.md` §5.5.

### Actor: Ejecutivo de verificación

### HU-33 · Registrar el contacto con el checklist por factura
- **Como** Ejecutivo de verificación, **quiero** registrar por factura si existe, si se recibió conforme y la fecha de pago comprometida, **para** que el veredicto tenga respaldo.
- **Estado**: vigente (sin caso en pantalla: `DrawerVerificacion` no tiene e2e); CA-3 es **vigente hoy · cambia con ADR-0018** (HU-42 trae la dirección contraria).
- **Reglas**: 6, 18, 53, 57 · **Cláusulas**: M-22-bis · **Gaps**: — (G-36 en el CA-3, vía HU-42).
- **Criterios de aceptación**:
  - CA-1 · Dado el panel «Registrar verificación telefónica» · Cuando marco los tres checks y la fecha · Entonces «Registrar verificación» se habilita y la factura pasa a «verificada» en la mesa (caso 157).
  - CA-2 · Dado un check sin marcar · Cuando intento registrar · Entonces el botón sigue deshabilitado (dirección que bloquea).
  - CA-3 (vigente hoy · cambia con ADR-0018) · Dado «No verificar» · Cuando confirmo «Retirar y vetar» en el panel «Registrar que el deudor NO confirmó» · Entonces HOY la factura sale de la oferta, queda `noConfirmada`, sigue tachada en la mesa y el detalle exige «Re-evaluar» (regla 6). Con ADR-0018 pasa a la dirección contraria: la factura sigue en la oferta marcada «no verificada», la operación queda con el issue y el ejecutivo comercial recibe el aviso (HU-42 CA-1, CA-2); el rótulo del botón de confirmación lo fija la implementación.
  - CA-4 · Dado una sesión que no es Ejecutivo de verificación · Cuando abre la mesa · Entonces no puede firmar (caso 33).
- **Notas**: GD-03 documenta el checklist en el spec. El retiro automático que CA-3 describe hoy es el que G-36 (ADR-0018) reemplaza; la mesa sigue marcando, la operación encoge sólo cuando el ejecutivo retira.

### HU-34 · Una factura verificada no se vuelve a pedir, y se identifica por su clave estable
- **Como** Ejecutivo de verificación, **quiero** que la llamada registrada sobreviva a la re-evaluación y que se sepa qué estaba verificado al emitir cada versión, **para** no llamar dos veces.
- **Estado**: vigente (definición ajustada 22-09-2026: la clave estable por factura basta como versionado).
- **Reglas**: 6, 13 · **Cláusulas**: M-25 · **Gaps**: G-13 (cerrado).
- **Criterios de aceptación**:
  - CA-1 · Dado una llamada en `repoVerifTel` · Cuando el ejecutivo re-evalúa · Entonces la factura sigue «verificada» y el veredicto congelado mantiene la fila (caso 55).
  - CA-2 · Dado la versión N emitida · Cuando se cruza `repoVerifTel` por la factura · Entonces se reconstruye qué estaba verificado al emitirla, sin copiar la llamada dentro de la versión.
- **Notas**: «ok» (M-20 / M-25, 22-09-2026). `limpiarSimulacion` no toca la llamada (`e2e-13-quaterdecies`).

### HU-42 · La verificación fallida marca la operación con un issue y avisa; el ejecutivo retira, re-simula y vuelve a publicar para una nueva firma
- **Como** Ejecutivo de verificación, **quiero** que marcar una factura como «no verificada» deje la operación con un issue y avise al ejecutivo comercial sin retirar nada, **para** que sea el ejecutivo quien decida qué saca de la oferta y mande al cliente a firmar la nueva operación.
- **Estado**: por implementar (ADR-0018). D2 cerrada del todo el 23-09-2026: ni el retiro automático con la firma vigente (hoy, regla 13) ni el retiro automático con reapertura (ADR-0015 tal cual); el sistema marca y avisa, el ejecutivo retira, re-simula y vuelve a publicar.
- **Reglas**: 13, 1, 6, 33, 5, 50, 41, VER-01 · **Cláusulas**: M-18 · **Gaps**: G-11 (en M-18), G-36.
- **Criterios de aceptación**:
  - CA-1 (control, dirección que bloquea el retiro) · Dado una operación firmada con una factura del deudor X en la oferta · Cuando el Ejecutivo de verificación la marca «no verificada» —«No verificar» en la mesa o «El deudor no confirmó · retirar» en el tab Verificación del detalle— · Entonces la factura sigue en «Documentos en la oferta», no se emite ninguna versión, la etapa no cambia y la firma sigue vigente; la operación muestra el issue «facturas no verificadas: no se puede cursar» con el deudor y los folios, VER-01 bloquea la integración (`controlesIntegracion` lo nombra; regla 41) y la bitácora registra la marca con actor y hora.
  - CA-2 · Dado la misma marca · Cuando se registra · Entonces el ejecutivo comercial de la operación recibe en Mensajería un hilo del sistema que nombra las facturas, el deudor y que la operación no se cursará mientras sigan en la oferta (el molde es el hilo «Cierre de negocio», regla 50); sin marca no hay hilo (dirección que bloquea).
  - CA-3 · Dado el issue y el aviso · Cuando el ejecutivo comercial abre la operación y retira las facturas del deudor no verificado · Entonces salen de la oferta y vuelven a «Documentos disponibles» vetadas (`repoNoConfirmadas`, regla 6), el detalle exige re-simular y el issue sigue mientras quede alguna marcada; ese retiro del ejecutivo es la única mutación admitida sobre la firmada por este motivo (regla 33), y puede sacar más de lo estrictamente no verificado.
  - CA-4 · Dado las facturas retiradas · Cuando el ejecutivo re-simula y vuelve a publicar · Entonces la re-simulación es el evento de evaluación de ADR-0013 y emite versión (que sólo encoge respecto de la firmada, `recortarAsignacion`), publicar de nuevo revoca la firma anterior (regla 1: `reabierta`, `aprobacionFormalCliente` falsa, el tubo en «Negociación» hasta la firma) y el cliente firma la nueva operación en el portal; tras la nueva firma la etapa la decide `etapaTrasFirma` (regla 26) y el issue ya no está.
  - CA-5 (dirección que bloquea) · Dado una factura retirada por este motivo · Cuando el ejecutivo intenta volver a incorporarla · Entonces «Agregar a la simulación» no está habilitado y el motivo es el veto de verificación (`estadoCandidata` → `noConfirmada`); no vuelve a entrar en ninguna versión (regla 1).
  - CA-6 · Dado la factura marcada · Cuando miro la mesa antes y después del retiro · Entonces sigue tachada con su veredicto «no verificada» (regla 6, caso 157) y el veredicto congelado del deudor no cambia.
  - CA-7 (control en las dos direcciones) · Dado que el ejecutivo retira la última factura de la oferta firmada (o rechaza la operación) · Cuando confirma · Entonces la operación pasa a «Perdida» con causa específica, etapa de origen y el actor que retiró (regla 5). Dado la única factura de la oferta marcada «no verificada» · Cuando se marca · Entonces la operación NO se pierde: queda con el issue y el aviso, y perderla es decisión del ejecutivo.
- **Notas**: ADR-0018: «Marcar una factura “no verificada” no la retira de la oferta. Deja la operación con un issue visible —“facturas no verificadas: no se puede cursar”— que bloquea el curse (VER-01 sigue mandando) […] El sistema notifica al ejecutivo comercial de la operación por el centro de mensajería […] El ejecutivo abre la operación, retira las facturas del deudor no verificado, re-simula (el evento de evaluación de ADR-0013, que emite versión) y vuelve a publicar la oferta. Publicar de nuevo revoca la firma anterior (regla 1) […] Las facturas retiradas por este motivo quedan vetadas». Difiere del comité (HU-35, ADR-0015) sólo en quién retira: el comité rechaza y el sistema retira; la verificación falla y retira el ejecutivo, «porque puede decidir sacar más de lo estrictamente no verificado o perder la operación». Hoy el botón «No verificar» de la mesa (`verificarDeudor`, `marcarFactura`, `noConfirmoDeudor`) y el diálogo «Retirar factura no confirmada» del detalle llaman a `retirarFacturaOferta` con `noConfirmada` y la operación encoge con la firma vigente (regla 13, casos 21–23; HU-33 CA-3, CP-091, CP-119, CP-129: vigente hoy · cambia con ADR-0018). Cambian esos tres llamadores (dejan de retirar), `verifResumenDeal` (el issue), el centro de mensajería (el aviso), `spec-verificacion-facturas.md` §9 y `spec-ciclo-factura.md` §14 (GD-12); la regla 13 pierde la mitad «después de aceptar sólo encoge». Si publicar de nuevo sobre la firmada exige pasar antes por «Editar la oferta» (`reabrirOperacion`) o el CTA de `ModalCurse` reabre solo, lo fija la implementación y el caso de prueba lo dice.

### Actor: Comité de líneas

### HU-35 · El rechazo del comité retira las facturas del deudor y reabre la operación para una nueva firma
- **Como** Comité de líneas (comité de crédito, externo a la plataforma), **quiero** que mi rechazo de una línea puntual llegue a NEX y deje a la operación en un estado definido, **para** que no quede firmada sobre una línea que no existe.
- **Estado**: por implementar (ADR-0015). D4 cerrada el 22-09-2026: ni encoger con la firma vigente ni sólo reabrir — se retiran las facturas del deudor Y se reabre la operación para que el cliente firme de nuevo.
- **Reglas**: 15, 13, 33, 1, 5 · **Cláusulas**: M-29, M-18 · **Gaps**: G-19, G-33.
- **Criterios de aceptación**:
  - CA-1 · Dado una solicitud en la bandeja · Cuando el sistema externo la rechaza · Entonces la API de estado del proceso (API 3) devuelve «Rechazada» por línea de detalle y Líneas › Solicitudes la lista «Rechazada» (hoy sólo «Aprobada» / «Observada»).
  - CA-2 · Dado la operación firmada con esa solicitud · Cuando llega el rechazo de una línea puntual · Entonces las facturas del deudor que dependían de ella se retiran de la oferta, se emite versión con el motivo, la operación vuelve a «Negociación» con `reabierta` revocando la firma (regla 1), y el ejecutivo vuelve a publicar el paquete que queda para que el cliente lo firme.
  - CA-3 · Dado que al retirar no queda ninguna factura · Cuando llega el rechazo · Entonces la operación pasa a «Perdida» con causa «línea rechazada por el comité» (regla 5).
  - CA-4 · Dado «Observada» · Cuando se consulta · Entonces nada se retira ni se reabre: la operación sigue esperando (dirección que bloquea).
  - CA-5 · Dado «Aprobada» · Cuando se consulta · Entonces se constituye la línea y la bitácora dice «Línea constituida» (caso 150, vigente).
- **Notas**: ADR-0015: «Al recibir el rechazo de una línea puntual, NEX retira de la oferta las facturas del deudor que dependían de ella, emite versión con el motivo, y reabre la operación: la firma anterior se revoca (regla 1) y el ejecutivo vuelve a publicar el paquete que queda». «Este es el comité de crédito, que opera fuera de la plataforma y da la aceptación o el rechazo de las solicitudes de aumento de línea puntual» (M-29); «las facturas del deudor se deben retirar de la oferta y hacer una acción equivalente a reabrir la oferta, porque el ejecutivo la tiene que mandar a firmar de nuevo» (M-18). Descartado encoger sin nueva firma: el cliente firmó un paquete que ya no es el que se va a cursar. Precisa la regla 13; cambian el contrato de la API 3 (`Integraciones/`), `api3EstadoProceso` y el manejador de la bandeja de solicitudes.

---

## Etapa 7 · Integración y giro (M-33, M-40; §11–§12)

### Actor: Operaciones N3

### HU-36 · Después de la firma nadie salta Pendiente Integración
- **Como** Operaciones N3, **quiero** que toda operación firmada pase por «Pendiente Integración» y que «Aprobar integración al core» sea el único camino a «Pendiente de Giro», **para** que los tres controles se miren siempre.
- **Estado**: por implementar (T1; la dirección positiva es vigente).
- **Reglas**: 26, 41, 24, 43, OTG-02, VER-01, GIR-02 · **Cláusulas**: — (§11–§12) · **Gaps**: G-24.
- **Criterios de aceptación**:
  - CA-1 · Dado una firmada con OTG-02, VER-01 y LIN-01 en verde · Cuando pasa el avance periódico · Entonces queda «Pendiente Integración» en Operaciones y **no** «Girada» (caso 88 fija el orden; falta la dirección negativa).
  - CA-2 · Dado una falta en cualquiera de los tres · Cuando Operaciones abre la fila · Entonces «Aprobar integración al core» está deshabilitado con la lista de códigos (caso 144).
  - CA-3 · Dado la huella O05 que no calza · Cuando se aprueba · Entonces se rechaza con `no_calza` y se audita (caso 86).
  - CA-4 · Dado todo en verde · Cuando apruebo · Entonces la operación pasa a «Pendiente de Giro», el giro se congela en `repoGiro` y no hay «girar» en ningún menú (regla 43, caso 148).
- **Notas**: el caso e2e exige la maniobra de firma (HU-29).

### Actor: Inbound (sistema) — el giro

### HU-37 · GE / GN con cinco hechos: si hay facturas a comité, el giro es Normal
- **Como** sistema, **quiero** decidir Giro Express o Normal con cliente nuevo, otorgamiento, verificación, marcas de excepción y el resultado de líneas, **para** que el Express sea sólo lo que no necesita nada — y una operación que depende de una línea que todavía no existe no gire Express.
- **Estado**: por implementar (T1, ADR-0017) → **decidido: implementar**.
- **Reglas**: 22 · **Cláusulas**: M-33 · **Gaps**: G-20, G-34.
- **Criterios de aceptación**:
  - CA-1 · Dado una factura verificada, sin excepciones y con línea · Cuando se asigna · Entonces es GE; con una marca de excepción es GN (caso 78, vigente).
  - CA-2 · Dado un deudor con facturas `REQUIERE_COMITE` (la asignación de líneas no las cubrió completas) · Cuando se asigna el giro · Entonces sus facturas son Giro Normal aunque estén verificadas, sin excepciones y no sea la primera operación; el mismo deudor con todo cubierto queda en lo que ya decidían los cuatro hechos (dirección que no bloquea).
  - CA-3 · Dado la primera operación del cliente · Cuando se asigna · Entonces todo es GN (caso 79).
  - CA-4 · Dado el reparto · Cuando se suma por tipo · Entonces GE + GN sigue siendo el monto a girar: la regla de oro se conserva (casos 80, 83).
- **Notas**: ADR-0017: «`asignarGiros` recibe un quinto hecho por deudor: si sus facturas requieren comité […] Un deudor con facturas a comité califica Giro Normal, aunque cumpla las condiciones de Express». «El resultado de la línea sí afecta el tipo de giro; si hay que pedir comité el giro debe ser Giro Normal» (M-33). Cambian `spec-modelo-giro.md` §2 y el adaptador `giroResumenDeal`; GD-09 alinea §7 del spec de giro con `ChipGiro`.

### Actor: Tesorería

### HU-38 · El giro sale con contrato y vuelve como noticia
- **Como** Tesorería, **quiero** recibir la operación inyectada con un payload definido e idempotente y avisar el giro por callback, **para** que NEX cierre la operación con lo que yo giré.
- **Estado**: por implementar (T1; el callback es vigente).
- **Reglas**: 43, 22 · **Cláusulas**: M-40 · **Gaps**: G-28.
- **Criterios de aceptación**:
  - CA-1 · Dado la aprobación de la integración · Cuando se inyecta · Entonces existe un registro de envío con operación, montos GE / GN por deudor y referencia, y un reintento no lo duplica.
  - CA-2 · Dado el aviso de Tesorería por `nex-giro` · Cuando llega · Entonces la operación pasa a «Girada» y la bitácora dice «Giro notificado por Tesorería» (caso 147, vigente).
  - CA-3 · Dado un aviso sin referencia, repetido o de una no inyectada · Cuando llega · Entonces «Aviso de giro descartado» con `aviso_incompleto`, `ya_girada` o `no_inyectada` y nada cambia (caso 147).
- **Notas**: el contrato de ida no está modelado (`spec-ciclo-factura.md` §23b).

---

## Etapa 8 · Pérdida y máquina de estados (§2, §13)

### Actor: Ejecutivo comercial

### HU-39 · Toda pérdida con causa, toda transición con guarda
- **Como** Ejecutivo comercial, **quiero** que ningún camino escriba «Perdida» sin causa ni «Aceptada» sin el tramo de integración, **para** que el tubo, Operaciones y la bitácora digan lo mismo.
- **Estado**: por implementar (T1; la pérdida manual con causa y la guarda OTG-02 de `moverEtapa` son vigentes).
- **Reglas**: 5, 26, 28, 41, OTG-02 · **Cláusulas**: — (§2, §13) · **Gaps**: G-25.
- **Criterios de aceptación**:
  - CA-1 · Dado «Rechazar…» · Cuando confirmo con motivo · Entonces la fila pasa a «Perdida» con causa específica, etapa de origen y actor, y las tareas se cierran (casos 117, 118).
  - CA-2 · Dado «Avanzar a» o el arrastre del Kanban hacia pérdida · Cuando no hay causa · Entonces se rechaza con negativa y la etapa no cambia.
  - CA-3 · Dado el escritor de `cesion` que existe —`moverEtapa(id, "cesion")`, llamable por el Kanban / `moveTo`, o mejor `etapaTrasFirma` (caso 88)— · Cuando pasa OTG-02 · Entonces escribe `integracion: "pendiente"` y la fila aparece en Operaciones como «Pendiente Integración», no como «Aceptada» sin tramo. Lo VIGENTE: con OTG-02 en falta `moverEtapa` consulta `invarianteCumple("OTG-02", "oportunidad.avanzarEtapa", …)`, corta con `return`, deja `logSys` «Transición bloqueada (OTG-02)» y auditoría «Avance de etapa bloqueado (OTG-02)» —gate `regla_transiciones.test.mjs`, fila OTG-02 de `invariantes.md`—, y tampoco escribe `aceptadas` ni `giro`. Lo que FALTA: que `moverEtapa` escriba `integracion: "pendiente"` al pasar a `cesion`, y toda guarda en `moveTo` (el Kanban), que escribe `cesion` sin mirar OTG-02 (sólo rechaza `aceptadas`, origen `perdida` y retroceder desde aceptadas/cesión/giro). «Avanzar a» NO ofrece «Cesión» en ninguna etapa (regla 30, `e2e-30`: la cesión la fija que las facturas queden cedidas), así que este criterio no tiene disparador de UI.
  - CA-4 · Dado el id `aceptadas` · Cuando se revisa el catálogo · Entonces tiene escritor o no está.
- **Notas**: volver a `oferta` / `prospeccion` desde «Avanzar a» también lleva guarda.

### Actor: Administrador del tenant

### HU-40 · Una máquina de estados normativa
- **Como** Administrador del tenant, **quiero** un catálogo de transiciones con sus guardas y escritores, **para** que una transición nueva tenga contra qué validarse y los nombres y colores del tenant se cuelguen de él.
- **Estado**: por implementar (T2).
- **Reglas**: 28, 26, 30-bis · **Cláusulas**: — (§2) · **Gaps**: G-30.
- **Criterios de aceptación**:
  - CA-1 · Dado el catálogo · Cuando se intenta una transición que no figura · Entonces el resolver la rechaza y lo audita.
  - CA-2 · Dado una transición del catálogo · Cuando se ejecuta · Entonces `estadoOperacion` la rotula con el nombre del tenant y el orden del tubo la respeta (casos 110, 112).
- **Notas**: GD-08 parte de la tabla medida en §2 del spec de curse. La reapertura por rechazo del comité (HU-35) y la republicación tras la verificación fallida (HU-42, ADR-0018) entran al catálogo como transiciones con escritor.

### HU-41 · Mientras se simula, los pendientes son pronóstico; al publicar se exigen
- **Como** Ejecutivo comercial, **quiero** ver en morado lo que faltaría y en rojo lo que falta, **para** saber qué destrabar antes de que el cliente firme.
- **Estado**: vigente.
- **Reglas**: 54, 6, 58 · **Cláusulas**: M-37, M-38 · **Gaps**: —.
- **Criterios de aceptación**:
  - CA-1 · Dado la oferta simulada sin publicar · Cuando miro los badges · Entonces van en morado y el tab de Verificación se ve en modo informativo, sin las dos acciones (regla 59, `e2e-59-a`; la compuerta la fija el caso 31).
  - CA-2 · Dado cerrada Y comunicada · Cuando miro · Entonces van en rojo y el tab de Verificación pasa a accionable (regla 59: la compuerta de la regla 6 protege la LLAMADA, no la información; los casos 31 —cerrar sin publicar no lo habilita— y 32 —la publicación del Agente IA cuenta— fijan qué lo abre; el color, el caso 158; `e2e-58` mira la fila del TUBO y `e2e-59-b` las acciones del tab: en pantalla el color es NUEVO, CP-116).
- **Notas**: la compuerta de Línea no cambia con la publicación.

---

## Cobertura

Cada una de las 41 cláusulas y de los 36 gaps aparece al menos una vez.

| Cláusulas | Historias |
|---|---|
| M-01 · M-02 · M-03 · M-04 | HU-04 · HU-08 · HU-01, HU-02 · HU-01 |
| M-05 · M-06 · M-07 · M-08 | HU-06, HU-07 · HU-06 · HU-08, HU-09 · HU-08, HU-09 |
| M-09 · M-10 · M-11 · M-12 | HU-03 · HU-05 · HU-10 · HU-11, HU-12 |
| M-13 · M-14 · M-15 · M-16 · M-17 | HU-13 · HU-14 · HU-24 · HU-23 · HU-23 |
| M-18 · M-19 · M-20 · M-21 | HU-24, HU-35, HU-42 · HU-25, HU-28 · HU-31 · HU-32 |
| M-22 · M-22-bis · M-23 · M-24 · M-25 | HU-18 · HU-33 · HU-18 · HU-13 · HU-34 |
| M-26 · M-27 · M-28 · M-29 | HU-13, HU-17 · HU-16 · HU-26, HU-27, HU-28 · HU-35 |
| M-30 · M-31 · M-32 · M-33 | HU-15 · HU-15 · HU-15 · HU-37 |
| M-34 · M-35 · M-36 | HU-19 · HU-20 · HU-21 |
| M-37 · M-38 · M-39 · M-40 | HU-22, HU-41 · HU-22, HU-41 · HU-17, HU-22 · HU-22, HU-38 |

| Gaps | Historias |
|---|---|
| G-01 · G-02 · G-03 · G-04 · G-05 | HU-04 · HU-08 · HU-09 · HU-06 (cerrado) · HU-07 |
| G-06 · G-07 · G-08 · G-09 · G-10 | HU-03 (implementada: regla 60) · HU-05 (cerrado; la antigüedad en G-31) · HU-11 (cerrado) · HU-12 · HU-13 |
| G-11 · G-12 · G-13 · G-14 · G-15 | HU-24 (cerrado en M-15), HU-42 (decidido en M-18, ADR-0018) · HU-25 · HU-31, HU-34 (cerrado) · HU-32 · HU-18 (cerrado) |
| G-16 · G-17 · G-18 · G-19 · G-20 | HU-16 (cerrado) · HU-26 (cerrado) · HU-27 · HU-35 · HU-37 |
| G-21 · G-22 · G-23 · G-24 · G-25 | HU-20 (cerrado) · HU-21 · HU-19 · HU-36 · HU-39 |
| G-26 · G-27 · G-28 · G-29 · G-30 | HU-30 · HU-17 · HU-38 · HU-02 · HU-40 |
| G-31 · G-32 · G-33 · G-34 · G-35 | HU-05 (implementada: regla 61) · HU-21 · HU-35 · HU-37 · HU-32 |
| G-36 | HU-42 (y HU-33 CA-3, vigente hoy · cambia con ADR-0018) |

**Por estado (42 historias):** 21 vigentes —10 por conducta con gate (HU-01, HU-10, HU-14, HU-15, HU-22, HU-23, HU-28,
HU-29, HU-33 —con su CA-3 vigente hoy · cambia con ADR-0018— y HU-41) y 9 por definición ajustada el 22 y 23-09-2026
(HU-06, HU-11, HU-16, HU-18, HU-20, HU-24, HU-26, HU-31, HU-34) y 2 implementadas el 23-09-2026 (HU-03, ADR-0014: regla 60, caso 159; HU-05, regla 61, caso 160)— · 21 por implementar (HU-02, HU-04,
HU-07, HU-08, HU-09 ADR-0019, HU-12, HU-13 ADR-0013, HU-17, HU-19, HU-21 ADR-0013, HU-25, HU-27, HU-30, HU-32
ADR-0016, HU-35 ADR-0015, HU-36, HU-37 ADR-0017, HU-38, HU-39, HU-40, HU-42 ADR-0018) · 0 pendientes de confirmar.

**Preguntas abiertas dentro de historias que ya tienen estado:** ninguna desde el 23-09-2026.

**Lo que los casos de prueba tienen que pedir con maniobra nueva:** la firma del cliente (HU-29, HU-30, HU-35, HU-36,
HU-42), el tab de Otorgamiento con un visado real (HU-23, HU-31, HU-32), el `DrawerVerificacion` con las dos
decisiones y el aviso en Mensajería (HU-33, HU-34, HU-42), «Aprobar integración al core» en Operaciones (HU-36) y el callback `nex-giro` (HU-38).
El cron real, el comité real, Tesorería y el reloj no son alcanzables y cada caso usa su sustituto (Directorio,
`api3EstadoProceso` por `evaluate`, `nex-giro`, tolerar las dos ramas) y lo dice en su cabecera.
