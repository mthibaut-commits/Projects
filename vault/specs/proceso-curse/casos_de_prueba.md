---
type: plan
title: "Casos de prueba del proceso de curse"
description: "Un caso de prueba por criterio de aceptación de las 42 historias del proceso de curse, en las dos direcciones cuando el criterio es un control: qué caso e2e o de la suite ya lo protege, y para los nuevos la precondición exacta sobre el harness de tests/e2e, los pasos con selector por rol/texto/title, el resultado observable y el esbozo del archivo; con las decisiones del usuario del 22 y del 23-09-2026 aplicadas: cada decisión cerrada deja sólo la lectura elegida (desde el 23-09-2026 no queda ninguna por confirmar) y las historias que las decisiones crean tienen su caso"
tags: [plan, proceso-curse, casos-de-prueba, playwright, e2e, suite, gaps, decisiones]
timestamp: 2026-09-23T12:00:00Z
---

# Casos de prueba del proceso de curse

**Fecha:** 23-09-2026 (con las decisiones del usuario del 22 y del 23-09-2026 aplicadas). Insumos:
`vault/specs/proceso-curse/historias_usuario.md` (HU-01 … HU-42 y sus CA-k), `Regresiones/Gaps_Proceso_Curse_2026-09-22.md`
(G-01 … G-36, D1 … D6, §4.1 «lo que la capa e2e cubre hoy»), las decisiones del usuario en
`vault/sesiones/2026-09-22_mesa_por_operacion_y_nota_rica.md` §8 y los ADR que las fijan (ADR-0013 evento de evaluación ·
ADR-0014 cedida a un factoring ajeno · ADR-0015 el comité que rechaza retira y reabre · ADR-0016 «ya no aplica desde la
versión N» · ADR-0017 con comité el giro es Normal · ADR-0018 la verificación fallida marca y avisa, el ejecutivo retira y
vuelve a publicar · ADR-0019 al corte la oportunidad sin oferta se elimina y la que tiene oferta no se toca), el harness
`tests/e2e/_harness.mjs` + `correr.mjs` y los 32 casos e2e
de los 18 archivos `tests/e2e/*.e2e.mjs` (los dos de `26_59.e2e.mjs`, `e2e-59-a/-b`, fijan el tab de Verificación
informativo al simular, regla 59).

Cómo se lee:

- Un **CP** verifica un criterio de aceptación (CA-k de HU-nn). Un criterio que es un **control** lleva dos CP, o
  un CP con las dos direcciones nombradas: el que pasa y el que bloquea (VER-01 falló semanas porque sólo se miraba
  una, `.claude/rules/testing.md`).
- **Capa**: `e2e` cuando la conducta vive en pantalla o cruza de pestaña (closures de `PipelineComercial`, dos
  documentos); `suite` cuando es un motor puro alcanzable por nombre con estado inyectado (`asignarLineas`,
  `verifDecision`, `prorratearOperacion`, `giroCursable`…); `contrato` cuando se vigila el fuente o el vault como
  texto (`tests/contract/`, siempre con sonda negativa).
- **Cobertura actual** cita el id e2e o el número de la suite que YA verifica el criterio —comprobado contra lo que
  ese caso verifica, no contra su título— o dice **NUEVO**. «Parcial» nombra qué falta.
- **Estado de las decisiones (23-09-2026).** Las seis están cerradas y cada CP trae **sólo la lectura elegida**; la
  descartada se retira: **D1** cerrada (B con la precisión: el gesto es explícito y es UN evento que corre los cinco
  motores, ADR-0013; el 23-09-2026, el gesto es del ejecutivo —«el cliente simula» es una forma de hablar del modelo—),
  **D2** cerrada (no hay bloqueo por deudor; M-18 redefinida, ADR-0015) y cerrada del todo el 23-09-2026 (ADR-0018: la
  verificación fallida marca la operación con un issue y avisa al ejecutivo; el ejecutivo retira, re-simula y vuelve a
  publicar para una nueva firma), **D3** cerrada (el reloj el 22-09-2026; el 23-09-2026, ADR-0019: la oportunidad sin
  oferta se elimina al corte y el inbound la re-origina con id propio, y la que tiene oferta no se toca; CP-021 sin
  caso), **D4** cerrada (retirar Y reabrir, ADR-0015), **D5** cerrada del todo el 23-09-2026 (M-22: la unidad de la
  verificación es el deudor; CP-048 sin caso) y **D6** cerrada (A con una precisión: la cedida a un factoring ajeno,
  ADR-0014). Desde el 23-09-2026 no queda nada **por confirmar**: M-01 (el acuse del DTE se muestra y no filtra,
  CP-010) y M-28 (la errata del modelo: la solicitud al comité sale sólo sin línea suficiente; CP-070 sin caso) se
  respondieron ese día. Un CP que hoy prueba el retiro automático por «No verificar»
  como conducta vigente lleva «**vigente hoy · cambia con ADR-0018: pasa a la dirección contraria**»: se escribe primero
  fijando lo vigente y se da vuelta, con el mismo id, en el commit del ADR. Lo que el usuario dio por bueno tal como está queda **implementado (definición ajustada)**, con la fecha de su respuesta;
  lo que pidió implementar conserva su cobertura medida y suma «→ **decidido: implementar**» con su ADR.
- Regla de la casa: la evidencia es la definición. Reglas por número, casos por número o id, condiciones del fuente
  por su nombre, secciones de spec por §. Ningún selector por clase de Tailwind (`tr.pl-row` y `header nav button`
  son las excepciones aceptadas por forma). Todo monto es un peso entero; `M$` es abreviatura de pantalla.
- Los archivos e2e nuevos se numeran a continuación del último existente (`26_59.e2e.mjs`, el de la regla 59): **27 en adelante**.
  Los ids nuevos son `e2e-<regla>` (con sufijo por dirección) cuando la regla existe, si no `e2e-HU-nn-<letra>`.
  Los sufijos parten de `-a` (`e2e-14-a/b/c`, `e2e-29-a/b`): un `-b` sin `-a` queda huérfano. Si la regla ya tiene
  un id SIN sufijo (`e2e-15`), el nuevo toma `-b` y el existente se renombra a `-a` sólo en un commit que toque
  también su archivo y su fila de `invariantes.md`.
- **El id de un CP es de EMISIÓN, no de posición.** CP-001 … CP-116 se emitieron en el orden de las historias;
  CP-117, CP-118 y CP-119 —y después CP-133 … CP-137— son direcciones que faltaban a un control y tomaron el
  siguiente entero libre, y van en la sección de su historia (CP-117, CP-119 y CP-137 en HU-24, CP-118 en HU-39,
  CP-133 en HU-35, CP-134 en HU-11, CP-135 en HU-12, CP-136 en HU-16): por eso la secuencia del documento no es
  consecutiva ahí. No se renumera —las referencias cruzadas (HU-01 CA-2, HU-28 CA-1, HU-41 CA-2, CP-055, CP-079)
  citan el id— y un CP nuevo toma siempre el siguiente entero libre. **CP-120 … CP-128** son los casos que las decisiones
  del 22-09-2026 crean (antigüedad configurable, corte y reinicio por hora del tenant, cinco versiones que cuentan igual,
  el modo de tasa en la versión, «ya no aplica» visible y auditado, el rechazo del comité en pantalla y el giro con
  comité) y van en la sección de la historia que redefinen, citando el CA que `historias_usuario.md` ya trae para esa
  decisión. **CP-129 … CP-132** son HU-42 (M-18 en la verificación, decidida el 23-09-2026 con ADR-0018: CP-129
  es la conducta vigente que se da vuelta y remite a CP-119, CP-130 quedó sin caso, CP-131 vale hoy y con el ADR, y
  CP-132 es NUEVO: su mitad de la pérdida —retirar la última pierde con causa— vale hoy y con el ADR, y su mitad de la
  marca —marcar no pierde— nace con ADR-0018), y **CP-138 … CP-142** son los casos que ADR-0018 crea (marcar no retira y deja el issue; el aviso al ejecutivo en
  Mensajería; el ejecutivo retira, re-simula y publica → firma revocada y versión nueva; la retirada no se incorpora; el
  botón del detalle tampoco retira), y **CP-143** es la dirección que bloquea del corte del día que ADR-0019 crea (la
  oportunidad que recibe oferta justo antes del corte no se elimina y la que sigue sin oferta sí) y va en la sección de
  HU-09. Un id cuya lectura quedó **descartada** por una decisión (CP-014, 021, 029, 032, 043, 048, 062, 070, 097, 130)
  queda sin caso, con la decisión que lo retiró, y no se reutiliza.

---

## 0 · Maniobras compartidas

Los CP citan estas maniobras por su código para no repetir la precondición. Cada una dice qué provoca, con qué
selector y **por qué el sustituto es legítimo** cuando el disparador real no se puede provocar.

| Código | Maniobra | Cómo, y por qué vale |
|---|---|---|
| **MN-01** | Tubo poblado sin stream | `await h.encenderDirectorio()` (regla 31, caso 129, `e2e-31`): cinco OP-DIR deterministas, 3 dentro de línea (filtro «Con línea», filas 0–2) y 2 con línea parcial («Sin línea»). Filtro por `button[title="Filtrar oportunidades"]` con texto `^Todos` / `^Con línea` / `^Sin línea`; ids `OP-DIR\d+` leídos de las `tr.pl-row`. Se apaga en el `finally`: regenera las cinco limpias. |
| **MN-02** | Detalle abierto | `const det = await h.abrirDetalle(n)` (pestaña propia, «DETALLE DE OPORTUNIDAD»); por id, `locator("tr.pl-row", { hasText: id })`. Etapa de la cabecera: el `<span>` que sigue al `<h1>` («· OP-DIRn · Etapa»); etapa de la fila del tubo: `ETAPAS` sobre `tr.innerText` (Prospección se rotula «Sin gestión» y Oferta «Negociación» en el tubo: caso 110, la etapa se rotula en un solo sitio con los dos colapsos; regla 28, el nombre y el color son configuración del tenant). |
| **MN-03** | Simular | Chip del panel de arranque `button` con texto `/Todo lo disponible/` (cliente parcial ⇒ CTA «Enviar a Comité y Publicar») o `/Deudores con línea/` (⇒ «Cerrar oferta y publicar», `e2e-29-a`); esperar `/condiciones comerciales/i` y `/Se puede cursar\|No se puede cursar/`. |
| **MN-04** | Cerrar y publicar (vía electrónica) | CTA `button` `/^\s*(Enviar a Comité y Publicar\|Cerrar oferta y publicar)\s*$/` → modal: tarjeta `button` `/Electrónicamente · vía email/` → `button` `/^\s*(Confirmar y enviar\|Confirmar curse)\s*$/`; si aparece el segundo modal (facturas < 8 días, `intentarCerrar`), `button` `^Cerrar oferta$`. Si el botón está deshabilitado con «Pendiente: N excepción(es) por aclarar en el tab Otorgamiento»: «Cancelar» → tab «Otorgamiento» → `button` `/Marcar sin comentarios y solicitar \(\d+\)/` → `button` `/^\s*Enviar \d+ solicitud\(es\)\s*$/` → volver a «Negocio» y repetir (`e2e-15-bis-bis-a`). Efectos: `ofertaCerrada` + `ofertaComunicada`, N° de negocio, pestaña `email.html?n=<neg>` capturada con `ctx.waitForEvent("page")`. **La pestaña nace en `about:blank`**: el cierre abre `window.open("", "_blank")` en el clic (para que el bloqueador de pop-ups no la frene) y sólo después le fija `win.location.href = emailHref(updated)`, así que leer la URL recién capturada devuelve `about:blank`; antes de leer `<neg>` va `await p.waitForURL(/email\.html\?n=/, { timeout: 30000 })` (o `waitForFunction` sobre `location.search`). Fila del tubo «Oferta publicada» (regla 58). |
| **MN-05** | Firma del cliente (sustituto por canal) | En la pestaña del DETALLE que publicó: `det.evaluate((neg) => window.postMessage({ type: "aceptada", neg }, "*"), neg)`. Es el MISMO mensaje que `curse.html` emite a su `opener` y `email.html` relaya (regla 55); el listener arma el payload con `curseDesdeDeal` y llama `confirmarCierre` → `etapaTrasFirma` → `avisarTubo`. Legítimo porque prueba el efecto real de la firma en NEX; lo que NO prueba (portal, OTP del cliente) lo gatea `regla_cry_01.test.mjs` y el CP-079 recorre el camino real una vez (MN-06). |
| **MN-06** | Firma del cliente (camino real) | Tras MN-04, en la pestaña `email.html`: leer `#otp` y `<neg>`, clic en `#cta` (se rotula «Ir al portal a firmar →», y su `click` abre `curse.html?n=<neg>` con `window.open`: por rol, `getByRole("link", { name: /Ir al portal a firmar/ })`); ahí `#lg-neg`, `#lg-rut`, `#lg-pass`, `#lg-otp`, `#lg-btn`, elegir cesión y abono, `#pt-cursar`; tras 3 pasos × 1400 ms el portal postea `aceptada`. Sólo bajo `file://` (`ES_FILE`). Es la única maniobra que recorre el OTP del cliente (un solo uso, `OTP_TTL_MS`). |
| **MN-07** | Sesión / rol | `select[title="Sesión de usuario (sólo demo)"]` en la cabecera del tubo y del detalle (cada pestaña tiene la suya); `usuario0 = await sel.inputValue()`, `sel.selectOption(codigo)`, 600 ms; al final `sel.selectOption(usuario0)`. El código se elige leyendo `USERS` por `evaluate` según rol y área (Ejecutivo de verificación para firmar una verificación, regla 18; apoderado del área y nivel que la regla exige, regla 4), nunca con un código fijo. Requiere `modoDemo` y `demoSuplantarUsuario` (Configuración › Funcionalidades). |
| **MN-08** | Inyección por canal | `window.postMessage({ type, … }, "*")` sobre la pestaña del TUBO: `nex-simulado` (`{dealId, patch}`: `stage`, `simulado`, `ofertaCerrada`, `ofertaComunicada`, `negocioNum`, `facturasOp`, `waSesion`), `nex-solicitud` (registro de la solicitud), `nex-giro` (`{evento: {operacionId, referencia, montoGirado?}}` → `recibirGiroTesoreria`, caso 147; el campo del monto es `montoGirado` —es lo que `recibirGiroTesoreria` lee para escribir `giroMonto`— y un `monto` se ignora en silencio, así que el `EV` del caso 147 es el molde). Legítimo porque es exactamente lo que el tubo escucha y lo que el detalle, el portal y Tesorería le mandan; el estado del tubo vive en closures sin setter, así que el canal es la conducta real y no una función privada (`e2e-12-bis-c/d`, `e2e-58`). Se usa cuando el disparador real no se puede provocar: **cron** (Directorio lo silencia), **comité** (`api3EstadoProceso(id)` por `evaluate`, avanza por refrescos y decide por `hashStr`), **Tesorería** (`nex-giro`), **hora de corte** (sin reloj configurable: el caso tolera las dos ramas). |
| **MN-09** | Ticket crafteado | `abrirConTicket(h, extra, usuario)` (`e2e-30`): `emitirTicketDetalle("deal", id, usuario, { deal: {...payload.deal, ...últimoPatch, ...extra}, usuario, tab: null, ts })` en el tubo y `ctx.newPage().goto(url + "?t=" + uuid)`. Sirve para menús y compuertas en un estado que el flujo no da rápido (publicada, otra sesión); no para el veredicto (la foto no vuelve al tubo). **Prerrequisito**: `abrirConTicket` toma el PRIMER ticket `tipo: "deal"` de `TICKETS_EMITIDOS` y lanza «no encuentro el ticket del detalle … ¿se abrió el detalle desde el tubo?» si no hay ninguno; por tanto exige un MN-02 previo en la misma sesión (dentro del caso o del archivo) y craftea ESE deal, no uno elegido por id. |
| **MN-10** | Restauración | `fotoRepos` / `restaurarRepos` de las claves `pc_repo_*` (`e2e-29`, `e2e-15-bis-bis`; barren todo `pc_repo_*`). Las claves reales las arma `crearRepo(nombre)` como `"pc_repo_" + nombre` con forma `{[tenantId]: {[id]: valor}}`: `pc_repo_otorgamiento_visado` (`repoVisado`), `pc_repo_verificacion_telefonica` (`repoVerifTel`), `pc_repo_giro_asignacion` (`repoGiro`), `pc_repo_linea_comite` (`repoLineaComite`), `pc_repo_simulacion_version` (`repoSimVersions`), `pc_repo_solicitud_comite` (`repoSolicitudComite`), `pc_repo_factura_no_confirmada` (`repoNoConfirmadas`, el veto de CP-091; regla 6). En los CP se lee por `repoX.get(id)` desde `evaluate`, nunca por una clave abreviada. Retiro de la solicitud en `api2ListarProcesos()` y de `SOLIC_SEQ`, borrado de `fs_curse_<neg>`, filtro rápido al que estaba, sesión al `usuario0`, `det.close()`, `h.apagarDirectorio()`. Todo en el `finally`. |

Y las capas que la suite exige: un caso nuevo toma el siguiente entero (168 en adelante), sube `CASOS_ESPERADOS` en
`tests/contract/suite.test.mjs` y se cita en la regla y en `invariantes.md`; un gate de contrato nuevo lleva
`sonda negativa` y lee `canonico(src)` (ADR-0006).

---

## Etapa 1 · Inbound

## HU-01 · Abrir la oportunidad por cedente y actualizar la abierta

### CP-001 · Una fila nueva del stream nace en «Sin gestión» con la oferta vacía
- **Criterio**: CA-1 de HU-01 · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: parcial — `e2e-12-bis-a` y `e2e-13-octies-bis-a` lo prueban sobre una OP-DIR (Directorio), no sobre una fila que el inbound abre. **NUEVO** para el stream.
- **Precondición**: sesión iniciada, Directorio APAGADO (silencia el stream y es la condición para que la barra muestre Start / Reiniciar / Inbound: con Directorio encendido los tres se ocultan, `e2e-31`), «Gestión diaria», tubo «0 de 0», y el filtro rápido en **«Todos»**: la Bandeja Inbound sólo se concatena al tubo bajo `quickFilter === "todos" && showInbound && !directorio`, y la línea base de la capa es «Con línea» (`reiniciar` del harness), que sólo deja oferta/prospección `!fueraDeLinea`; con la base puesta la fila del stream puede no verse nunca.
- **Pasos**: 1) filtro «Todos» (`button[title="Filtrar oportunidades"]` con texto `^Todos`); 2) el `button` con texto «Start» de la barra del tubo (`title` «Sólo demo · iniciar la simulación del inbound»; al correr pasa a «Pausar» con `title` «Sólo demo · pausar la simulación»; el botón de ícono con `title` «Reproducir streaming de facturas» / «Pausar» es OTRO control, la cabecera del `InboundPanel` del Kanban); 3) `waitForFunction` hasta que exista una `tr.pl-row` (tolerancia 120 s: el stream no es determinista en tiempo); 4) «Pausar»; 5) leer la etapa de la primera fila; 6) abrir su detalle (MN-02) y leer «Documentos en la oferta».
- **Resultado esperado**: la fila dice «Sin gestión» y «Sin simular»; el detalle dice «Documentos en la oferta» 0 · 0, el panel de arranque pregunta qué facturas incluir y «Documentos disponibles» tiene ≥ 1 folio.
- **Esbozo e2e**: id `e2e-HU-01-a` · archivo `27_inbound_stream.e2e.mjs` · `filtroRapido(h.pagina, "Todos")`, `h.pagina.locator("button", {hasText: /^\s*Start\s*$/})`, `h.abrirDetalle(0)`, `h.texto(det)` · `finally`: `button` «Reiniciar» de la barra (`title` «Sólo demo · reiniciar la simulación (todo a cero)»), `det.close()`, `filtroRapido(h.pagina, "Con línea")`, `h.reiniciar()`.

### CP-002 · Las facturas nuevas de un cedente abierto suman al pool sin duplicar y no tocan la oferta
- **Criterio**: CA-2 de HU-01 · **Dirección**: positiva (crece) y negativa (la oferta no cambia, ningún folio repetido) · **Capa**: suite. · **Cobertura actual**: NUEVO. El caso 142 fija la ventana de la bandeja, no la fusión del pool.
- **Precondición**: `aplicar` alcanzable por nombre con una oportunidad `{facturasDisponibles: [A, B], facturasOp: [A], stage: "oferta"}` y un lote `[B, C]` (el caso en rojo motiva exponer la fusión como función pura; hoy vive en el efecto del inbound).
- **Pasos**: 1) aplicar el lote; 2) contar folios del pool; 3) comparar `facturasOp` antes y después.
- **Resultado esperado**: pool = `[A, B, C]` (B una sola vez), `facturasOp` idéntico, `simulado` y `finanzasDe` intactos.

### CP-003 · Una oportunidad terminal no se reabre: se abre otra
- **Criterio**: CA-3 de HU-01 · **Dirección**: negativa (la terminal no cambia) y positiva (aparece la nueva) · **Capa**: suite. · **Cobertura actual**: NUEVO (regla 5 fija la terminalidad en los casos 117 y 118; la apertura de la segunda no está probada).
- **Precondición**: estado con una oportunidad del cedente X en `perdida` y una en `giro` sin `giroPendiente`; lote con facturas de X.
- **Pasos**: 1) correr la agrupación por cedente (`correrProceso` con estado inyectado); 2) listar oportunidades de X.
- **Resultado esperado**: las dos terminales conservan `stage` y paquete; existe una tercera en `prospeccion` con las facturas nuevas.

### CP-004 · La Bandeja Inbound bota primero lo que no es de nadie y lo dice
- **Criterio**: CA-4 de HU-01 · **Dirección**: ambas · **Capa**: suite. · **Cobertura actual**: **caso 142** (lo nuevo entra adelante, sale primero lo que no es de nadie, lo que sale se cuenta) y `regla_40.test.mjs`.
- **Precondición y pasos**: los del caso 142. · **Resultado esperado**: el descarte cuenta exactamente lo botado.

## HU-02 · La corrida es un batch del servidor con topes del tenant

### CP-005 · La corrida abre exactamente el tope y nombra el resto
- **Criterio**: CA-1 de HU-02 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: NUEVO (G-29; se escribe en rojo: hoy `MAX_NUEVOS` está en el código).
- **Precondición**: `cfg.topeNuevosPorCorrida = 3` (nombre del parámetro por definir en `CFG_OPER_BASE`, GD-07) y un lote con 5 cedentes.
- **Pasos**: 1) correr con la configuración inyectada; 2) contar oportunidades abiertas; 3) leer la bitácora (`SYS_LOG`).
- **Resultado esperado**: 3 abiertas; una fila de bitácora «2 cedente(s) quedan para la siguiente corrida».

### CP-006 · El tope cambiado en Configuración manda sobre el del código
- **Criterio**: CA-2 de HU-02 · **Dirección**: negativa (el valor del código no manda) · **Capa**: suite. · **Cobertura actual**: NUEVO (molde: caso 90, «lo que el tenant configura lo aplica el motor»).
- **Precondición**: la misma corrida con `tope = 5` y luego `tope = 1`.
- **Pasos**: 1) correr dos veces con las dos configuraciones sobre el mismo lote.
- **Resultado esperado**: 5 y 1 abiertas respectivamente; ninguna corrida abre 40.

## HU-03 · Candidata: no reclamada, sin NC y no cedida a un factoring ajeno (D6 cerrada el 22-09-2026: A con una precisión, ADR-0014; implementada el 23-09-2026: regla 60, caso 159)

### CP-007 · La cedida a un factoring ajeno no es candidata y la tarjeta no la cuenta; la cedida a Factoring Security sí entra
- **Criterio**: CA-1 y CA-2 de HU-03 · **Dirección**: negativa (la ajena queda fuera) y positiva (la cedida a Security y la no cedida entran) · **Capa**: suite. · **Cobertura actual**: **caso 159** (implementado el 23-09-2026, ADR-0014, regla 60): el filtro sobre el A2 real, el perfil de la Bandeja y la sonda sin cesión; G-06 cerrado. D6 cerrada el 22-09-2026: «sólo si está cedida a una empresa diferente a Factoring Security; si está cedida a Security sí se puede agregar» — la cuarta condición del filtro excluye la cesión a un factoring **distinto de Factoring Security**, según el A2; excluir toda cesión quedó descartado.
- **Precondición**: `CRITERIO_PRED` «Buena factura» (o el criterio nuevo que la implementación de ADR-0014 nombre) con tres facturas iguales salvo la cesión, con identidades del padrón (regla 42, nunca inventadas): una cedida a un cesionario distinto de Security, una cedida a Security y una sin cesión en el A2.
- **Pasos**: 1) evaluar `facturaCalifica` sobre las tres; 2) contar candidatas; 3) leer el motivo de la excluida (el tooltip del criterio en la tarjeta, `capacidadDeudores` / `chipTramo`, por `evaluate`).
- **Resultado esperado**: 2 candidatas (la cedida a Security y la no cedida); la ajena queda fuera con motivo «cedida a otro factoring». Nace en rojo: hoy «Buena factura» no consulta `cedida`.

### CP-008 · Al incorporar, la cedida a un factoring ajeno se bloquea; la no cedida y la cedida a Security entran
- **Criterio**: CA-3 de HU-03 · **Dirección**: negativa y positiva · **Capa**: suite. · **Cobertura actual**: **caso 159** (implementado el 23-09-2026, ADR-0014, regla 60): la ajena bloqueada con el nombre del factoring, la cedida a Security entra rotulada; el caso 95 fija además que la nuestra ENTRA.
- **Precondición**: `estadoCandidata` con una factura cedida a un factoring ajeno en el A2, una cedida a Security y una no cedida (el caso 95 ya distingue la cesión propia de la ajena al incorporar: ADR-0014 lleva esa misma distinción, con la misma fuente, al inbound).
- **Pasos**: 1) consultar el estado de cada una; 2) intentar `incorporarFacturasOferta` con la cedida.
- **Resultado esperado**: la cedida a un ajeno devuelve el motivo de cesión y no entra a `facturasOp`; las otras dos entran. En pantalla, el botón de agregar de la cedida está `disabled` y su `title` ya NO es «Agregar a la simulación»: cuando la factura está bloqueada el `title` pasa a ser el rótulo de `estadoCandidata` (`est.label`) seguido de su detalle (o «· no se puede agregar»), así que el selector por ese `title` sólo encuentra botones HABILITADOS (es la razón por la que un caso que agrega por vista plana pide `:not([disabled])`, como el disparador de CP-124). Localizar la fila por folio y leer el `button[disabled]` cuyo `title` contiene el rótulo de cesión (se verifica en el e2e de MN-02 cuando una OP-DIR traiga una cedida; hoy ninguna la trae).

### CP-009 · La columna SOW sigue mostrando al otro factor
- **Criterio**: CA-4 de HU-03 · **Dirección**: positiva (la medición no se pierde) · **Capa**: suite. · **Cobertura actual**: **caso 99** (el mix se mide sobre AECSync y se inyecta en el A11) y **caso 105** (la columna nombra a los 4 mayores). Con la decisión (ADR-0014) se vuelven a correr sin cambio: son la dirección que protege —excluir del inbound no borra la medición del SOW—.
- **Precondición y pasos**: los de los casos 99 y 105. · **Resultado esperado**: sin cambio.

## HU-04 · Las aceptaciones de DTESync son una bandera del DTE (decidido el 22-09-2026: el dato; el 23-09-2026: se muestra y no filtra)

### CP-010 · Sin acuse (primeros 8 días) SÍ es candidata; con acuse también; reclamada no
- **Criterio**: CA-2 de HU-04 (definición ajustada 23-09-2026: el acuse no participa del filtro) · **Dirección**: positiva (la sin acuse y la con acuse entran) y negativa (la reclamada queda fuera) · **Capa**: suite. · **Cobertura actual**: la mitad del reclamo es conducta vigente —el criterio «Buena factura» de `CRITERIO_PRED` ya excluye la reclamada y `estadoCandidata` la bloquea al incorporar (§6 del spec de curse)—, pero ni CP-007 ni la sección de HU-03 nombran un caso de la suite que la ejerza, así que no se cita ninguno; la mitad del acuse es **NUEVA** porque el dato no existe (G-01, CP-011) → **decidido: implementar** el dato; el filtro no cambia. «Las facturas los primeros 8 días desde su emisión no tienen acuse de aceptación y/o reclamo y en ese estado de ausencia de acuse sí son candidatas» (23-09-2026).
- **Precondición**: el A1 con el campo del acuse (nombre por definir en `facturaDeDTE`, CP-011) y «Buena factura» de `CRITERIO_PRED` tal como está; tres facturas iguales salvo el `EstadoDTE`, con identidades del padrón (regla 42): una emitida hace 3 días sin acuse ni reclamo («Sin acuse»), una con acuse («Aceptada») y una reclamada; `hoy` inyectado (el caso 93 adelanta `Date.now` sin tocar el activo).
- **Pasos**: 1) evaluar `facturaCalifica` sobre las tres; 2) contar candidatas; 3) leer el acuse de cada una (el dato que la fila del documento muestra); 4) cambiar el acuse de la primera a «Aceptada» y volver a contar.
- **Resultado esperado**: 2 candidatas —la sin acuse y la con acuse— y la reclamada fuera; cada factura trae su acuse tal como viene en el A1; el paso 4 no cambia el conteo: ningún criterio de candidatura lee el acuse. Nace en rojo sólo por el dato (hoy el acuse no llega a la factura); la exclusión del reclamo ya pasa.

### CP-011 · El acuse es un campo del A1 y no un sorteo: el layout lo declara, el generador lo produce en punto fijo y `facturaDeDTE` lo lee
- **Criterio**: CA-1 de HU-04 (el acuse como bandera del `EstadoDTE` en el A1; decidido el 22-09-2026: entra como dato; el 23-09-2026: se muestra y no filtra, CP-010) · **Dirección**: negativa (ningún consumidor sortea el acuse fuera del activo) y positiva (el campo llega a la factura) · **Capa**: contrato + suite. · **Cobertura actual**: NUEVO → **decidido: implementar** (G-01, sin ADR). El gate `generador.test.mjs` fija el punto fijo del generador, no la existencia del campo.
- **Precondición**: el layout del A1 (`Levantamiento_Activos_Informacion.md`; `esquema` de `DTESYNC`) con el campo del acuse —nombre por definir en `facturaDeDTE`; una bandera del DTE junto a `Reclamado` y `NotaCredito`, con los valores aceptada / reclamada / sin acuse—; `datos_inyectados.js` regenerado con ese campo por `GeneradorDatos/generar.js`.
- **Pasos**: 1) gate que lee el fuente como texto y comprueba que «Sin acuse» aparece sólo como VALOR del campo del A1 y no como sorteo de `facturasDeCandidata` (sonda negativa plantando el sorteo); 2) `node GeneradorDatos/generar.js` reproduce el activo byte a byte (`generador.test.mjs` sigue verde); 3) suite: `facturaDeDTE` sobre una fila con cada valor.
- **Resultado esperado**: el gate pasa y su sonda cae; el generador sigue en punto fijo; la factura trae el acuse tal como viene en el A1, sin derivarlo (regla 13-ter: lo que trae el documento no se recalcula en pantalla).

## HU-05 · Criterio de candidatura por antigüedad de la emisión (decidido el 22-09-2026: no más de 20 días, configurable; tags del emisor y cesión previa descartados · implementado el 23-09-2026: regla 61, caso 160)

### CP-012 · «Emitida hace no más de 20 días» deja entrar la de 20 y excluye la de 21, y la cuenta como excluida por antigüedad
- **Criterio**: CA-1 de HU-05 · **Dirección**: negativa (excluye) y positiva (la reciente entra), en el borde · **Capa**: suite. · **Cobertura actual**: caso **160** (implementado el 23-09-2026, regla 61; G-31, sin ADR: «necesitamos implementar un criterio para ir a buscar facturas que tengan cierta antigüedad, ejemplo no más de 20 días desde su emisión, con eso basta»). El criterio se escribe sobre `FchEmis`, que es dato del documento (regla 13-ter).
- **Precondición**: `CRITERIO_PRED` con el criterio de antigüedad y el parámetro del tenant en su valor por defecto (`antiguedadMaxDias: 20` en `CFG_OPER_BASE`); la antigüedad se mide contra el corte del activo (`corteDTE`, regla 13-ter), así que no hace falta inyectar `hoy`; tres eventos con el documento (`facturasOp[0].fchEmis`) a 5, 20 y 21 días y la raíz a 1 día, para fijar que el filtro mira el documento.
- **Pasos**: 1) evaluar «Buena factura» y `clasificarFactura` sobre las tres; 2) leer el perfil de la Bandeja (`criteriosDesdeFactura`).
- **Resultado esperado**: entran la de 5 y la de 20 días («no más de 20» incluye el día 20); la de 21 sale con el perfil «Antigüedad > 20 días (excluida)». Nació en rojo el 23-09-2026 —ningún criterio miraba la fecha; el descarte < 8 días al cerrar, `intentarCerrar`, es otra cosa— y quedó verde con `superaAntiguedad`.

### CP-013 · Un criterio desconocido no califica nada y se marca no ejecutable
- **Criterio**: CA-3 de HU-05 · **Dirección**: negativa (hoy califica todo: rojo) · **Capa**: suite + e2e. · **Cobertura actual**: NUEVO. G-07 quedó cerrado el 22-09-2026 y el criterio desconocido NO fue objeto de la decisión: el caso se conserva como control de configuración (T2, regla 35 como molde: lo no ejecutable se nombra y no bloquea) y no afirma ninguna decisión del usuario.
- **Precondición**: configuración del tenant con un criterio `"no_existe"` en las reglas del inbound. Configuración NO tiene sección «Inbound» (sus secciones son Tenants, Operación, Logs y versión, Auditoría, Usuarios, Roles, Áreas, Factoring target, Etapas, Vacaciones y reemplazos, Simulación, Correo saliente, Oportunidades, Otorgamiento, Productos, Monedas, Costo de fondo, Funcionalidades y Bancos): las reglas (`INBOUND_RULES`, leídas por `leerVersionado(RULES_KEY, "reglasInbound")`) se ven en el `InboundPanel` (las `RuleCard` con «Pausar regla» / «Activar regla»), que se renderiza ÚNICAMENTE en la vista Kanban, dentro de la `MacroColumn` «Bandeja Inbound», bajo `showInbound && !directorio`. El botón «Inbound» de la barra del tubo existe pero hace otra cosa: muestra u oculta la columna (`title` «Mostrar columna Inbound» / «Ocultar columna Inbound (más espacio)»), no abre las reglas. Dos disparadores que no se pueden provocar sin sustituto: (1) las reglas se leen UNA vez al montar la app (`useState(cargarReglas)`, que llama `leerVersionado(RULES_KEY, "reglasInbound", INBOUND_RULES)`), así que plantar `"no_existe"` en `RULES_KEY` de `localStorage` por `evaluate` exige `page.reload()`, y recargar pierde la sesión —`SESION` es memoria del módulo (`SESION = { usuario, via, tenant, iniciada, expira, actividad }`, `suplantar` la reescribe en memoria) y nada la persiste en storage—; el harness inicia sesión sólo dentro de `abrirApp`, así que el caso repite la secuencia de login de `abrirApp` tras recargar (Ingresar → OTP leído de pantalla → «Verificar y entrar»), o el harness exporta `iniciarSesion(pagina)`, y el caso lo dice. (2) El panel vive en el Kanban: selector de vista `button[title="Cambiar la vista del tubo (Tabla / Kanban / Tamaño)"]` → «Kanban» (por defecto carga en Tabla).
- **Pasos**: suite: 1) evaluar el filtro; e2e: 2) plantar `RULES_KEY`, `page.reload()`, volver a iniciar sesión, `h.irA("Gestión diaria")` (no el gear: `h.irA` sólo sirve para los rótulos de la navbar, y el gear es `button[title="Configuración"]`, fuera del `nav`); 3) selector de vista → «Kanban» → abrir el panel (`onToggleOpen`, el `button` de la cabecera «Bandeja Inbound»); 4) leer la fila del criterio en el panel.
- **Resultado esperado**: cero candidatas por ese criterio; la fila dice «no ejecutable» (molde: `reglaNoEjecutable`, caso 141).
- **Esbozo e2e**: id `e2e-HU-05-a` · archivo `27_inbound_stream.e2e.mjs` · `h.pagina.evaluate` sobre `RULES_KEY`, `page.reload()` + login, selector de vista, `button` de la cabecera «Bandeja Inbound», texto de la fila · `finally`: el pie del propio panel «Restablecer reglas a las predeterminadas» (`onResetRules`, la restauración legítima; los botones de Configuración «Restaurar valores por defecto» / «Restaurar el catálogo base» no tocan las reglas del inbound), volver a la vista «Tabla», `h.reiniciar()`.

### CP-014 · (sin caso: lectura descartada el 22-09-2026)
- La «lista de emisores con tags» y la cesión previa quedaron **descartadas** como criterios del inbound (M-10, segunda vuelta: «con eso basta»; G-07 cerrado). El criterio que sí entra es la antigüedad (CP-012, CP-120). El id no se reutiliza.

### CP-120 · El tope de antigüedad es del tenant: bajado a 10 días la de 15 sale; el valor del código no manda
- **Criterio**: CA-2 de HU-05 (decisión del 22-09-2026 sobre M-10: antigüedad máxima **configurable**, 20 días por defecto) · **Dirección**: negativa (con 10 la de 15 sale) y positiva (con 20 entra) · **Capa**: suite. · **Cobertura actual**: caso **160** (implementado el 23-09-2026, regla 61; G-31). Molde: caso 90 («lo que el tenant configura lo aplica el motor»); CP-006 es el mismo control para el tope de la corrida.
- **Precondición**: la de CP-012 con una factura a 15 días; `aplicarCfgActiva({ …, antiguedadMaxDias: 10 })` y luego `30`; para «ausente», `CFG_ACTIVA` sin la clave (sin `aplicarCfgActiva`, que la rellenaría desde `CFG_OPER_BASE`).
- **Pasos**: 1) evaluar con 10; 2) evaluar con 30; 3) evaluar con el parámetro ausente.
- **Resultado esperado**: fuera (la de 15), dentro (la de 21), y con el parámetro ausente rige el 20 de `CFG_OPER_BASE`: nunca un número propio del criterio.

## HU-06 · Segmentación Prime / Otros y join con líneas: un join en pantalla (definición ajustada 22-09-2026: «es un join, no es parte del inbound»)

### CP-015 · El chip del tubo es un join en pantalla: sus tres cifras coinciden con `capacidadDeudores` sobre el A23 del momento
- **Criterio**: CA-1 de HU-06 (definición ajustada 22-09-2026: «está bien, es un join, no es parte del inbound») · **Dirección**: positiva (las cifras coinciden) y negativa (nada se persiste) · **Capa**: suite + e2e. · **Cobertura actual**: **implementado (definición ajustada 22-09-2026)** — **caso 100** (el lookup como cota superior sobre el A23, regla 13-decies) en la suite; en pantalla parcial: ningún e2e lee las cifras del chip. G-04 quedó cerrado: la segmentación Prime / Otros y el join con líneas NO se persisten en la oportunidad.
- **Precondición**: MN-01 con filtro «Todos» y un MN-02 sobre la fila 0 (para tener su foto en `TICKETS_EMITIDOS[…].payload.deal`, `e2e-30`).
- **Pasos**: 1) leer el TEXTO de los TRES chips de la columna «Oportunidad» de la fila 0: `chipTramo(k, txt, fg, bg, tip)` pinta un chip por tramo —`"primeConLinea"` (rótulo «Prime con línea»), `"otrosConLinea"` («Otros con línea») y `"sinLinea"`— sobre `capacidadDeudores(an.lista, d.rutEmisor)`, con contenido `«n · M$monto»` cuando hay (o `0`) y el `title` es el tip explicativo del tramo, no las cifras; se localizan por su rótulo y de cada uno se separan `n` y `monto`; 2) en el tubo, `evaluate` que llame `capacidadDeudores` sobre la misma oportunidad y devuelva conteo y monto por tramo; 3) leer las claves de la oportunidad.
- **Resultado esperado**: `n` y `monto` de cada chip = lo que devuelve la función (en pesos; el chip abrevia con `fmtMM`); la oportunidad NO trae campos de segmentación persistidos (la dirección que la definición ajustada fija).
- **Esbozo e2e**: id `e2e-13-decies-a` · archivo `36_tubo_segmentacion.e2e.mjs` · `h.encenderDirectorio`, `filtroRapido(h.pagina, "Todos")`, `h.abrirDetalle(0)`, `h.pagina.evaluate` · `finally`: `det.close()`, `h.apagarDirectorio()`, `filtroRapido(h.pagina, "Con línea")` (la precondición pone «Todos» y `correr.mjs` sólo reinicia el filtro al cambiar de ARCHIVO).

### CP-016 · Constituida una línea, el join la refleja al redibujar, sin esperar una corrida
- **Criterio**: CA-2 de HU-06 (definición ajustada 22-09-2026: el join es una consulta en pantalla) · **Dirección**: positiva (cambia tras constituir) y negativa (nada queda persistido que pueda quedarse atrás) · **Capa**: suite. · **Cobertura actual**: NUEVO, y fija conducta vigente (moldes: caso 150, la línea constituida la usa la asignación siguiente; caso 100, el lookup).
- **Precondición**: oportunidad cuyo `capacidadDeudores` devuelve `sinLinea = 2`; `constituirLinea` para uno de esos deudores (sobre una copia de `LINEAS_DATA`, restaurada al final).
- **Pasos**: 1) leer los tramos; 2) constituir; 3) volver a llamar `capacidadDeudores` sin correr ninguna corrida; 4) leer.
- **Resultado esperado**: tras el paso 3, `sinLinea = 1` y el deudor pasó a su tramo con línea; no existe ningún campo de la oportunidad que siga diciendo 2.

## HU-07 · Una sola definición de Prime

### CP-017 · Deudor fuera de listas con nota > 4,2: el chip y `verifDecision` dicen lo mismo
- **Criterio**: CA-1 de HU-07 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: NUEVO (G-05; el caso 116 fija la nota y el caso 53 la estabilidad del segmento, no su igualdad entre motores).
- **Precondición**: deudor sintético fuera de `CRITERIO_PRED` listas con nota 4,5.
- **Pasos**: 1) segmento por `capacidadDeudores`; 2) segmento por `verifDecision`.
- **Resultado esperado**: iguales (Prime u Otros según el ADR que decida la definición).

### CP-018 · Deudor en listas con nota ≤ 4,2: también coinciden (hoy divergen)
- **Criterio**: CA-2 de HU-07 · **Dirección**: negativa · **Capa**: suite. · **Cobertura actual**: NUEVO (rojo).
- **Precondición**: deudor en listas con nota 3,8. · **Pasos**: como CP-017. · **Resultado esperado**: el mismo segmento en los dos motores.

## HU-08 · Frecuencia, ventana, hora de corte y hora de reinicio que el job consume (decidido el 22-09-2026: parámetros del tenant; el corte cuelga del reloj y no del conteo de corridas, ADR-0019)

### CP-019 · `frecuenciaMin` gobierna el intervalo y deja de ser declarativo
- **Criterio**: CA-1 de HU-08 · **Dirección**: positiva · **Capa**: suite + contrato. · **Cobertura actual**: caso **163** (`intervaloJobMs`: 15 → 900.000 ms, 60 → 3.600.000) y `regla_64.test.mjs` (el `hint` del campo sin «DECLARATIVA»), implementados el 23-09-2026 (M-02, G-02, sin ADR: «debe leer la configuración y correr en base a esa configuración»). El **caso 90** no se toca: NO ejerce `frecuenciaMin` —sus cuatro tramos son el piso de tasa (`evalAtribucion`), `otrosDeudoresPct` sobre la LF4 (`lineasDeCliente`), `ventanaLibroDias` (`candidatasLibro`) y `notaMinCompra` / `vigenciaLineaMeses` en la glosa; la única configuración que mueve es `aplicarCfgActiva({ …, otrosDeudoresPct })` y `frecuenciaMin` aparece sólo en el comentario de su tramo (b)—, así que hacer que el job la consuma no lo pone en rojo y no hay nada que «dar vuelta». La regla 9-bis (`reglas/otorgamiento_y_atribucion.md`) la nombra declarativa: se corrige ahí, en el comentario del caso 90 y en el `hint`, y CP-019 entra como caso nuevo (159 en adelante).
- **Precondición**: la función pura que arma el intervalo del job (por definir con G-02/GD-07) recibe `cfg` con `frecuenciaMin: 15`.
- **Pasos**: 1) llamar con 15 y con 60; 2) gate de contrato: el `hint` del `CfgCampo` «Frecuencia de actualización» de Configuración › Operación (el que hoy dice «DECLARATIVA: es el valor de producción…») ya no contiene `/declarativ/i`. `CFG_OPER_BASE.frecuenciaMin` no tiene `hint`, sólo un comentario de código: el gate busca en el JSX del campo, sobre `canonico(src)`, con sonda negativa plantando la palabra.
- **Resultado esperado**: 900 000 y 3 600 000 ms; el `hint` del campo no dice «DECLARATIVA».

### CP-020 · Fuera de la ventana el job no abre y lo registra; dentro sí
- **Criterio**: CA-3 de HU-08 (la ventana: «fuera de ventana» entre corte y reinicio) · **Dirección**: negativa y positiva · **Capa**: suite. · **Cobertura actual**: caso **163** (`jobDelReloj` con la ventana 08:00–18:00: 07:30 fuera, 10:00 dentro), implementado el 23-09-2026 (M-02; G-02). En la corrida, `tickCron` sólo abre con `r.enVentana` y registra «Fuera de ventana» (`regla_64.test.mjs`).
- **Precondición**: `horaInicio: "08:00"`, `horaFin: "18:00"`; `ahora` inyectado a las 07:30 y a las 10:00 (sin reloj configurable en la UI: el sustituto es la hora por parámetro, MN-08).
- **Pasos**: 1) correr a las 07:30; 2) a las 10:00.
- **Resultado esperado**: 0 abiertas y bitácora «fuera de ventana»; luego N > 0 abiertas. La ventana no es el corte del día: el corte y el reinicio tienen su propia hora (CP-121), y qué le pasa a cada oportunidad al corte lo fijan CP-022, CP-023 y CP-143 (ADR-0019).

### CP-121 · El corte y el reinicio corren a la hora del tenant (23:00 / 06:00 por defecto), no por conteo de corridas, y cambiados la siguen
- **Criterio**: CA-2 y CA-3 de HU-08 (decisión del 22-09-2026 sobre M-07 y M-08: «impleméntala con configuración del tenant» · «implemento ese job en base al parámetro configurable del tenant») · **Dirección**: negativa (a las 22:59 no corta; a las 05:59 no reinicia) y positiva (a las 23:00 corta; a las 06:00 reinicia) · **Capa**: suite. · **Cobertura actual**: caso **163** (`jobDelReloj` y `relojSimulado`: 22:59 no corta, 23:00 corta, 05:59 no reinicia, 06:00 reinicia, y con 21:00/07:00 las sigue; ninguna corrida múltiplo de 8 corta) y `regla_64.test.mjs` (el efecto corta por `r.corte`, nunca por conteo), implementados el 23-09-2026 (G-02 y G-03 en el reloj; ADR-0019 punto 1). Nació en rojo: el corte era `corridas % HORAS_DIA === 0` y no existía hora de reinicio.
- **Precondición**: `cfg` con la hora de corte y la de reinicio (nombres por definir en `CFG_OPER_BASE`, GD-07; 23:00 y 06:00 por defecto) y el job del cierre del día como función pura que recibe `ahora`: es el sustituto legítimo del reloj —el e2e no puede mover la hora y el Directorio silencia el cron (MN-08)—, así que este control es sólo de suite. Una oportunidad `_inbound` sin oferta.
- **Pasos**: 1) correr a las 22:59 y a las 23:00; 2) correr a las 05:59 y a las 06:00; 3) repetir con corte 21:00 / reinicio 07:00 en `cfg`.
- **Resultado esperado**: el corte deja bitácora «Cierre del día» sólo a las 23:00 (y a las 21:00 en el paso 3), el reinicio sólo a las 06:00 (07:00), y ninguna corrida intermedia corta aunque `corridas` sea múltiplo de `HORAS_DIA`. **Qué le pasa a cada oportunidad en el corte no se asierta aquí**: lo fijan CP-022, CP-023 y CP-143 (HU-09, ADR-0019); este caso fija sólo el reloj.

## HU-09 · Cierre del día: la oportunidad sin oferta se elimina y el inbound la vuelve a originar; la que tiene oferta no se toca (D3 cerrada del todo el 23-09-2026, ADR-0019; 021 retirado)

### CP-021 · (sin caso: lectura descartada el 23-09-2026)
- La lectura B de D3 —al corte, `rolloverDia` reabre la no gestionada con el mismo id, el paquete actualizado, su ejecutivo, su bitácora y sus contactos (regla 22)— quedó descartada por ADR-0019: la oportunidad sin oferta se elimina al corte y el inbound la vuelve a originar como oportunidad nueva, con id propio y referencia (CP-022); «el id no cambia» vale sólo para lo que sobrevive al corte (CP-023). El id no se reutiliza.

### CP-022 · Al corte la oportunidad sin oferta se elimina y deja su cierre en la bitácora del sistema; al reinicio el inbound abre otra, con id propio y referencia, sin simular y con la oferta vacía
- **Criterio**: CA-1 y CA-2 de HU-09 (ADR-0019 puntos 3 y 4; «gestionada» = tiene oferta) · **Dirección**: positiva (la sin oferta desaparece; nace la nueva con referencia) y negativa (la nueva no hereda el id ni la oferta; ninguna oportunidad conserva el id eliminado) · **Capa**: suite. · **Cobertura actual**: caso **164** (`corteDelDia`, `eventoDeReoriginacion`, `idReoriginado`) y `regla_64.test.mjs` (`corteDia` elimina y deja bitácora, `reinicioDia` devuelve el evento al inbound y `correrProceso` escribe `referencia`), implementados el 23-09-2026 (ADR-0019, G-03; T1). Nació en rojo: `rolloverDia` reabría con el mismo id la `_inbound` que quedó en `etapaNoGestionada`, y ningún caso de la suite ejerce `rolloverDia` (la regla 22 enuncia «el id no cambia con el cierre del día» sin caso que lo titule), así que no hay caso que dar vuelta: la regla 22 se reescribe en el commit que implemente ADR-0019.
- **Precondición**: el job del corte y el del reinicio como funciones puras que reciben `ahora` y la configuración del tenant (el sustituto legítimo del reloj de CP-121: el e2e no puede mover la hora y el Directorio silencia el cron, MN-08); una oportunidad `_inbound` «X» en `prospeccion` sin oferta (`facturasOp: []`, sin simular), con ejecutivo, bitácora y facturas en «Documentos disponibles», y facturas nuevas del mismo cedente que llegan entre el corte y el reinicio; identidades del padrón (regla 42).
- **Pasos**: 1) correr el corte a la hora del tenant; 2) listar las oportunidades y leer la bitácora del sistema (`SYS_LOG`); 3) correr el reinicio; 4) listar de nuevo y leer la oportunidad nueva del cedente.
- **Resultado esperado**: paso 2: «X» ya no existe —ni en el tubo ni por id— y la bitácora del sistema tiene una fila de cierre con el id «X», el cedente y el paquete que tenía; paso 4: existe «Y» ≠ «X» del mismo cedente, en `prospeccion`, con `referencia: "X"`, las facturas de «X» más las que llegaron, `simulado` falso y `facturasOp: []`; ninguna oportunidad tiene el id «X».

### CP-023 · La que tiene oferta (simulada) o está más adelante no se toca
- **Criterio**: CA-3 de HU-09 (ADR-0019 punto 2: «gestionada» es la que tiene oferta, cualquiera sea su etapa; punto 5: el id no cambia para lo que sobrevive) · **Dirección**: negativa (el corte no la toca) · **Capa**: suite. · **Cobertura actual**: caso **164** (S simulada sin publicar, P publicada, O en otorgamiento y G en giro quedan idénticas; X sin oferta y E con paquete elegido sin simular se eliminan; la manual no se toca), implementado el 23-09-2026 (ADR-0019, G-03). `etapaNoGestionada` se retiró de la configuración (esquema v3, `regla_64.test.mjs`): no hay parámetro que pueda hacer que el corte elimine una con oferta, así que el paso 3 quedó sin objeto.
- **Precondición**: cuatro oportunidades `_inbound` con oferta: `oferta` simulada SIN `ofertaCerrada` (el caso discriminante), `oferta` con `ofertaCerrada` + `ofertaComunicada`, `otorgamiento` y `giro`; más una sin oferta en `prospeccion` como contraste (la «X» de CP-022).
- **Pasos**: 1) correr el corte con la configuración por defecto; 2) leer las cinco; 3) repetir con la configuración del tenant que plante `etapaNoGestionada: "oferta"`.
- **Resultado esperado**: en los dos pasos, las cuatro con oferta idénticas antes y después (`id`, `stage`, paquete, `facturasOp`, `negocioNum`, ejecutivo y bitácora) y sólo la de contraste eliminada (CP-022). El paso 3 nace en rojo: hoy, con ese parámetro, `rolloverDia` reabriría la `oferta` simulada vaciándole la oferta.

### CP-143 · La oportunidad que recibe oferta justo antes del corte no se elimina; la que sigue sin oferta sí
- **Criterio**: CA-4 de HU-09 (la dirección que bloquea del control de CP-022, en el borde; ADR-0019 punto 2) · **Dirección**: negativa (la que recibió oferta no se elimina) y positiva (la que sigue sin oferta sí) · **Capa**: suite. · **Cobertura actual**: caso **164** (A simulada antes del corte sobrevive, B sin oferta se elimina), implementado el 23-09-2026 (ADR-0019, G-03).
- **Precondición**: dos oportunidades `_inbound` sin oferta, «A» y «B», en `prospeccion`; el job del corte como función pura que recibe `ahora` (CP-121), con la hora de corte del tenant en su valor por defecto (23:00).
- **Pasos**: 1) con `ahora` a las 22:59, armar la oferta de «A» con una factura de su pool y simularla (`simularOferta`, por su nombre: la saca de Prospección, regla 12-bis); 2) correr el corte a las 23:00; 3) leer «A», «B» y la bitácora del sistema.
- **Resultado esperado**: «A» idéntica a como quedó tras simular (mismo `id`, `stage: "oferta"`, `simulado`, `facturasOp`, bitácora); «B» eliminada, con su fila de cierre en la bitácora del sistema (id, cedente, paquete); ninguna otra fila de cierre.

---

## Etapa 2 · Oportunidad y selección

## HU-10 · Tomar la oportunidad y armar la oferta a mano

### CP-024 · La oferta nace vacía y se ve
- **Criterio**: CA-1 de HU-10 · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: **`e2e-13-octies-bis-a`** (0 · 0, sin segmentado, caja de vacío con estilo computado y sonda de cinco elementos plantados).
- **Precondición y pasos**: los de ese caso (MN-01, MN-02 sobre una OP-DIR sin simular). · **Resultado esperado**: «Documentos en la oferta» 0 · 0 y el panel de arranque pregunta.

### CP-025 · Dos facturas a mano: «Tienes 2 facturas elegidas · M$X», «Simular la oferta», cabecera en Prospección
- **Criterio**: CA-2 de HU-10 · **Dirección**: positiva (panel) y negativa (no promueve) · **Capa**: e2e. · **Cobertura actual**: **`e2e-13-sexdecies-a`** (el panel y que simular usa ESA selección) + **`e2e-12-bis-b`** (la cabecera muestreada cada 40 ms nunca sale de «Prospección»).
- **Precondición y pasos**: los de esos casos. · **Resultado esperado**: el texto del panel con X = suma leída por rótulo Folio/Monto; la fila sigue «Sin gestión · Sin simular».

### CP-026 · Retirar la última vacía la oferta y devuelve el folio
- **Criterio**: CA-3 de HU-10 · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: **`e2e-13-sexdecies-c`** (sin simular) y **`e2e-13-sexdecies-d`** (ya simulada: la simulación se borra y vuelve a Prospección en el detalle y en el tubo).
- **Precondición y pasos**: los de esos casos. · **Resultado esperado**: panel de arranque, folio en «Documentos disponibles», fila «Sin simular».

### CP-027 · Con la oferta cerrada no hay botones de agregar ni retirar; sólo «Editar la oferta»
- **Criterio**: CA-4 de HU-10 · **Dirección**: negativa (sólo lectura) · **Capa**: e2e. · **Cobertura actual**: parcial — **caso 140** (cerrar se deshace con «Editar») y **`e2e-30`** (con ticket `ofertaCerrada`+`ofertaComunicada` aparece «Editar la oferta» en el menú); nadie comprueba la AUSENCIA de los botones del paquete. **NUEVO**.
- **Precondición**: MN-01, una OP-DIR simulada con MN-03 «Deudores con línea» y cerrada con MN-04; o MN-09 con `{ofertaCerrada: true, ofertaComunicada: true, negocioNum}` y `usuario` ADMIN en el payload (MN-09 exige el MN-02 previo). El botón «Acciones» sólo existe en los tabs Bitácora, Cobranza y Mensajería (regla 30), que la sesión inicial (Ejecutivo Comercial) NO ve: hay que cambiar la sesión a ADMIN (MN-07 en la pestaña del detalle, o el `usuario` del ticket) y abrir el tab «Bitácora» antes de buscar el menú (`e2e-30` hace exactamente eso).
- **Pasos**: 1) en Negocio › Detalle, contar `button[title="Agregar a la simulación"]` y `button[title="Retirar esta factura de la oferta"]`; 2) sesión ADMIN → tab «Bitácora» → abrir el menú «Acciones» y leer sus ítems; 3) contraste: en un detalle sin cerrar los botones del paso 1 existen.
- **Resultado esperado**: 0 y 0 en la cerrada; «Editar la oferta» presente; > 0 en la abierta.
- **Esbozo e2e**: id `e2e-33-a` · archivo `29_publicacion.e2e.mjs` · `abrirConTicket`, `det.locator(...)`, tab «Bitácora», `itemAcciones` · `finally`: `sel.selectOption(usuario0)`, cerrar pestañas extra, MN-10.

## HU-11 · Re-evaluar cuando cambia la selección (D1 cerrada el 22-09-2026: el gesto es explícito, ADR-0013)

### CP-028 · Agregar o quitar no calcula: «La selección cambió» sin cifra hasta «Re-evaluar operación»
- **Criterio**: CA-1 de HU-11 · **Dirección**: negativa (no aparece cifra) y positiva (re-evaluar la devuelve) · **Capa**: e2e + suite. · **Cobertura actual**: **implementado (definición ajustada 22-09-2026)** — **`e2e-14-a`** (agregar), **`e2e-14-b`** (quitar), **caso 124** (una reevaluación es UNA versión sobre las mismas facturas). D1 cerrada (ADR-0013): «hoy, cuando se cambia la selección de facturas, el ejecutivo debe presionar simular para volver a reevaluar»; la regla 14 se conserva.
- **Precondición y pasos**: los de esos casos. · **Resultado esperado**: titular «La selección cambió», filas «Sin evaluar», cifra sólo tras el botón.

### CP-029 · (sin caso: lectura descartada el 22-09-2026)
- La lectura D1-A —agregar re-evalúa sola y emite versión— quedó descartada por ADR-0013: el gesto es explícito (regla 14) y cada clic emitiría versión y consultaría la API de líneas. El id no se reutiliza.

### CP-030 · Con «La selección cambió» el pie tampoco afirma cifras
- **Criterio**: CA-3 de HU-11 · **Dirección**: negativa · **Capa**: e2e. · **Cobertura actual**: **`e2e-14-c`** es el SNAPSHOT del defecto (pasa en verde fijando que el pie sigue afirmando números). Se da vuelta en el mismo commit que lo corrige: mismo id, aserción invertida.
- **Precondición y pasos**: los de `e2e-14-c` (una factura agregada tras simular). · **Resultado esperado**: compuertas «Verificación» y «Línea» y chips de giro (por `title`) dicen «Por evaluar» y ningún «Deudores con línea N» en verde.

### CP-134 · Cambiar la selección sin apretar nada no corre ningún motor ni emite versión
- **Criterio**: CA-2 de HU-11 · **Dirección**: negativa (el control bloquea: un clic de selección no es un evento) · **Capa**: suite. · **Cobertura actual**: parcial — `e2e-14-a` sólo mide el aviso «La selección cambió» y las filas «Sin evaluar»; no cuenta versiones ni comprueba que ningún motor haya corrido (el caso 124 es el molde de `SIM_VERSIONS`). D1 cerrada (ADR-0013): la dirección que bloquea es la lectura elegida y no tenía caso propio (CP-029 cubría la descartada). **Desde el 23-09-2026:** `regla_14.test.mjs` (1) fija por texto que `incorporarFacturasOferta` y `retirarFacturaOferta` no llaman a ningún motor ni emiten versión, y `regla_68.test.mjs` que los únicos emisores son el evento y el comité; la lectura de `SIM_VERSIONS` tras editar sigue por e2e.
- **Precondición**: oferta simulada, `n0 = SIM_VERSIONS[id].length` y la `linea` de la última versión guardada.
- **Pasos**: 1) `incorporarFacturasOferta` y luego `retirarFacturaOferta` sin motivo sobre la misma oferta, sin «Re-evaluar operación»; 2) leer `SIM_VERSIONS[id]`, `simulado` y la `linea` vigente.
- **Resultado esperado**: `SIM_VERSIONS[id].length === n0`; la última versión es la misma (mismo `v`, misma `linea`); `simulado` no cambia; ninguna consulta al A23 (regla 12). La dirección que se ve en pantalla es CP-028.

## HU-12 · La bitácora no anuncia un recálculo que no ocurrió (D1 cerrada el 22-09-2026: el anuncio se retira, ADR-0013)

### CP-031 · Al llegar facturas la bitácora dice «Facturas agregadas al pool», no «Recálculo aplicado»
- **Criterio**: CA-1 de HU-12 · **Dirección**: negativa · **Capa**: contrato + suite. · **Cobertura actual**: **cubierto el 23-09-2026** por `regla_68.test.mjs` (busca «Recálculo aplicado», «Recalculando», el banner y la marca de recálculo, con sonda, y exige los dos mensajes nuevos); la lectura de `SYS_LOG` tras `aplicar` sigue como extensión posible de CP-002 (regla 68; G-09 y GD-10 cerrados).
- **Precondición**: contrato: `regla_recalculo.test.mjs` lee `canonico(src)`; suite: CP-002 extendido.
- **Pasos**: 1) el gate busca «Recálculo aplicado» y «Recalculando» en el fuente; 2) sonda negativa plantándolos; 3) en la suite, tras `aplicar`, leer `SYS_LOG`.
- **Resultado esperado**: cero apariciones; la última fila de `SYS_LOG` dice «Facturas agregadas al pool» y `SIM_VERSIONS` no creció.

### CP-032 · (sin caso: lectura descartada el 22-09-2026)
- La lectura D1-A —«Recálculo aplicado» y una versión nueva al llegar facturas— quedó descartada por ADR-0013: con el gesto explícito, el anuncio se retira (CP-031). El id no se reutiliza.

### CP-033 · No existe un banner inalcanzable
- **Criterio**: CA-3 de HU-12 · **Dirección**: negativa · **Capa**: contrato. · **Cobertura actual**: **cubierto el 23-09-2026** por `regla_68.test.mjs` (la condición `deal.actualizando` y el banner no existen en el fuente; sonda que los planta).
- **Precondición**: el mismo gate de CP-031. · **Pasos**: 1) buscar la condición `deal.actualizando && !fullPage`; 2) sonda plantándola.
- **Resultado esperado**: ausente (o el banner se muestra con `fullPage`, y entonces lo verifica un e2e que lo vea).

### CP-135 · «Re-evaluar» sí registra la evaluación en la bitácora y deja la versión nueva
- **Criterio**: CA-2 de HU-12 · **Dirección**: positiva (la dirección que no bloquea del control de CP-031) · **Capa**: suite. · **Cobertura actual**: **cubierto el 23-09-2026** por el caso **168** (cada evento deja la versión y la fila de auditoría «Evaluación de la operación» con su origen; el fallido deja «Evaluación fallida» sin versión) y por `regla_68.test.mjs` («Re-evaluar operación» dispara el evento). CP-032 cubría la lectura descartada y este es el caso de la elegida.
- **Precondición**: oportunidad simulada, `n0 = SIM_VERSIONS[id].length` y el largo de la bitácora antes del gesto.
- **Pasos**: 1) el gesto «Re-evaluar» (la función que el botón llama, por su nombre); 2) leer `SIM_VERSIONS[id]` y la bitácora.
- **Resultado esperado**: `SIM_VERSIONS[id].length === n0 + 1`; una entrada nueva de bitácora que nombra la evaluación y su versión; ninguna entrada dice «Recálculo aplicado» sin una versión detrás (CP-031 es la otra dirección).

---

## Etapa 3 · Evaluación

## HU-13 · La simulación corre los cinco motores y emite la primera versión (decidido el 22-09-2026: ADR-0013; el 23-09-2026: simular es el gesto del ejecutivo, «Re-evaluar operación»)

### CP-034 · «Simular la oferta» deja la v1 con los cinco motores: otorgamiento, verificación, líneas, giro y pricing
- **Criterio**: CA-1 de HU-13 · **Dirección**: positiva · **Capa**: e2e + suite. · **Cobertura actual**: **suite cubierta el 23-09-2026** por el caso **168** (la v1 `v: 1`, `rev: 0`, contemporánea, con `res`, `verificacion`, `linea`, `giro` y `pricing`) y `regla_68.test.mjs` (`simularOferta` dispara el evento antes de escribir el negocio); la pantalla —el botón y `SIM_VERSIONS` por `evaluate`— sigue como e2e NUEVO con el esbozo de abajo. `e2e-14-a` sólo MIDE `SIM_VERSIONS` sin afirmarlo.
- **Precondición**: MN-01, MN-02 sobre una OP-DIR sin simular; `n0 = (SIM_VERSIONS[id] || []).length` por `evaluate`. `SIM_VERSIONS` NO es una lista que se filtre: es el objeto `{ [dealId]: [ { v, rev, ts, origen, vars, estado, nApr, nExc, nRech } ] }` que se reapunta a `repoSimVersions.all()` tras cada rehidratación (todos los lectores hacen `SIM_VERSIONS[deal.id] || []`: `revOtorgActual`, `lineaDeVersion`, el diff); se lee `SIM_VERSIONS[id]` o `repoSimVersions.get(id)` (clave real `pc_repo_simulacion_version`).
- **Pasos**: 1) dos facturas a mano (`e2e-13-sexdecies-a`); 2) `button` «Simular la oferta · 2 fact.»; 3) esperar `/Se puede cursar|No se puede cursar/`; 4) `evaluate` sobre `SIM_VERSIONS[id]`.
- **Resultado esperado**: una versión más con `v: 1` y `rev: 0` (el registro no tiene campo `numero`: lleva `v` 1-based y `rev` 0-based, «v1 se emite con rev = 0», `revOtorgActual` = nº de versiones − 1). Campos observables HOY en el molde: `v, rev, ts, origen, vars, estado, nApr, nExc, nRech`, más `linea` (singular, con `cursable` y `facturas` por factura en `CON_LINEA` / `REQUIERE_COMITE`), que sólo la empuja el retiro por «no confirmó» (`repoSimVersions.push(id, { ...prev, v, rev, ts, origen, linea })`) y que `reabrirOperacion` lee (`linea.cursable` de la última). **`verificacion` y `res` no existen en ninguna versión**: que la v1 los traiga —y traiga `linea` al simular, no sólo al retirar— es exactamente el gap G-10 que este caso pone en rojo, no un campo del molde. Los `vars` van sobre esos dos folios exactos. Con ADR-0013 la v1 trae los CINCO resultados: además de `linea` y `verificacion`, el giro por deudor y el pricing (su contenido lo fijan CP-053 y CP-123; que los cinco cuenten igual, CP-122). **Desde el 23-09-2026 (regla 68) la v1 trae las cinco secciones y las fija el caso 168.**
- **Esbozo e2e**: id `e2e-13-a` · archivo `28_version_v1.e2e.mjs` · `h.abrirDetalle`, agregar por vista plana, `evaluate` · `finally`: Opciones → «Eliminar la simulación», MN-10.

### CP-035 · Cerrar y reabrir el detalle lee la versión, no el render
- **Criterio**: CA-4 de HU-13 · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: NUEVO (`lineaDeVersion` lo fija el caso 124 en la suite; en pantalla no).
- **Precondición**: la de CP-034 ya simulada; leer el titular y la compuerta «Línea» (por `title`).
- **Pasos**: 1) `det.close()`; 2) abrir de nuevo por id (MN-02); 3) releer titular y compuerta; 4) `evaluate`: modificar en memoria el A23 del par (sin persistir, `LINEAS_DATA`) y releer.
- **Resultado esperado**: idénticos antes y después del cierre; tras el paso 4 la compuerta NO cambia (lee la versión), y sólo «Re-evaluar operación» la mueve.
- **Esbozo e2e**: id `e2e-13-b` · archivo `28_version_v1.e2e.mjs` · `finally`: restaurar `LINEAS_DATA` desde la foto, MN-10.

### CP-036 · Sin simular no hay versión y las compuertas dicen «Por evaluar»
- **Criterio**: CA-5 de HU-13 · **Dirección**: negativa · **Capa**: e2e. · **Cobertura actual**: NUEVO.
- **Precondición**: MN-01, MN-02 sobre OP-DIR sin simular. · **Pasos**: 1) `SIM_VERSIONS` del id; 2) leer compuertas por `title`.
- **Resultado esperado**: cero versiones; «Por evaluar» sin número.
- **Esbozo e2e**: id `e2e-13-c` · archivo `28_version_v1.e2e.mjs` · `finally`: `det.close()`, `h.apagarDirectorio()`.

### CP-122 · Tras N eventos de evaluación los cinco motores cuentan N versiones; una evaluación que no completa los cinco no es versión
- **Criterio**: CA-2 y CA-3 de HU-13 (ADR-0013 punto 3: «siempre debieran haber la misma cantidad de ejecuciones en todos los motores») · **Dirección**: positiva (N · N · N · N · N) y negativa (un motor que falla no deja una versión a medias) · **Capa**: suite. · **Cobertura actual**: **cubierto el 23-09-2026** por el caso **168** (tres eventos → 3 · 3 · 3 · 3 · 3 con `contarVersiones`, la primera `v: 1`/`rev: 0`, `asignarLineas` caído → sin versión, bitácora «Evaluación fallida», `revOtorgActual` = 2) y por `regla_68.test.mjs` (el evento rechaza la versión incompleta; ningún emisor fuera del evento y del comité).
- **Precondición**: el evento de evaluación alcanzable por nombre (lo que `simularOferta` y `reevaluarCliente` pasan a disparar) sobre una oportunidad con dos deudores; `n0` = versiones por motor antes.
- **Pasos**: 1) simular (evento 1); 2) re-evaluar dos veces (eventos 2 y 3); 3) contar versiones de otorgamiento, verificación, líneas, giro y pricing; 4) inyectar un fallo en uno de los motores (por ejemplo `asignarLineas` sin A23) y disparar un cuarto evento; 5) contar de nuevo.
- **Resultado esperado**: paso 3: 3 · 3 · 3 · 3 · 3, y la primera es `v: 1`, `rev: 0` (no hay v1 retroactiva); paso 5: sigue 3 en los cinco, la bitácora registra la evaluación fallida y la versión vigente no cambia (`revOtorgActual` = 2). El único actor del evento es el ejecutivo: simular es la acción que se ejecuta al re-evaluar la oferta («Re-evaluar operación») y «el cliente simula» es una forma de hablar del modelo (23-09-2026), así que no hay otro canal que disparar y el caso dispara el evento por su nombre.

## HU-14 · Otorgamiento evalúa por empresa

### CP-037 · Un deudor con tres facturas es UNA fila del tab y su visado es por deudor
- **Criterio**: CA-1 de HU-14 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **caso 47** (suite). En pantalla, NUEVO: el tab Otorgamiento no tiene caso e2e.
- **Precondición**: MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible» (trae excepciones del cliente y de deudores, `e2e-15-bis-bis-a`); tab «Otorgamiento».
- **Pasos**: 1) leer las filas de criterios D por RUT de deudor; 2) contar filas por (criterio, RUT).
- **Resultado esperado**: como máximo una fila por (criterio, deudor) aunque el deudor tenga varias facturas en la oferta.
- **Esbozo e2e**: id `e2e-4-a` (primer id e2e de la regla 4: los sufijos parten de `-a`, como `e2e-14-a/b/c`, `e2e-29-a/b`; un `-b` sin `-a` queda huérfano) · archivo `31_otorgamiento_visado.e2e.mjs` · el tab NO es `role="tab"` (no hay ninguno en el fuente): los tabs del detalle son `button`s con el rótulo y un badge numérico opcional, y se abre con el selector que ya usa `e2e-15-bis-bis-a`, `det.locator("button").filter({ hasText: /^\s*Otorgamiento\s*\d*\s*$/ }).first()` · `finally`: MN-10.

### CP-038 · Una regla C es una fila del cliente y no se repite por deudor
- **Criterio**: CA-2 de HU-14 · **Dirección**: negativa · **Capa**: suite. · **Cobertura actual**: NUEVO (los casos 44 y 46 fijan el catálogo y el padrón, no la unicidad de la fila del cliente).
- **Precondición**: `evaluarOtorgItems` con un cliente que gatilla C-nn y tres deudores. · **Pasos**: contar ítems con `stKey` de esa regla.
- **Resultado esperado**: exactamente uno.

## HU-15 · Asignación de líneas por factura, en cascada y sin curse parcial

### CP-039 · Una factura repartida entre LF2 y LF3 nombra las dos en `origen`
- **Criterio**: CA-1 de HU-15 · **Capa**: suite · **Cobertura actual**: **caso 3**. · **Resultado esperado**: `origen` con dos líneas y estado `CON_LINEA`.

### CP-040 · Monto = disponible cursa; un peso más queda `REQUIERE_COMITE` con motivo `cliente`
- **Criterio**: CA-2 de HU-15 · **Dirección**: positiva y negativa · **Capa**: suite · **Cobertura actual**: **caso 134** (las dos direcciones, LIN-01). · **Resultado esperado**: el borde exacto pasa; $1 más va a comité.

### CP-041 · El deudor con faltante muestra «Solicitud línea $Z» en ámbar; su factura dice «Requiere comité»
- **Criterio**: CA-3 de HU-15 · **Dirección**: positiva y negativa (sacadas las facturas, no queda chip) · **Capa**: e2e · **Cobertura actual**: parcial — **`e2e-29-b`** fija el chip «Solicitud línea $Z» (Z = monto − asignado con tolerancia $1, color `rgb(194, 65, 12)` sobre `#FFF7ED`, uno por faltante, suma ≤ Y − X) y la dirección contraria tras «Sacar facturas sin línea»; su `leer()` recoge `chipsSolicitud`, `chipsLinea`, `chipsDeudor` y `ctas` y **no lee ningún «Requiere comité»**. Ese estado por factura es **NUEVO** en pantalla.
- **Precondición**: la de `e2e-29-b` (MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible»). · **Pasos**: 1) vista plana `button[title^="Todas las facturas en una sola lista"]`; 2) leer el estado de la fila de cada factura del deudor con faltante, como `e2e-14-a` lee «Sin evaluar». · **Resultado esperado**: las facturas de ese deudor dicen «Requiere comité» (estado `REQUIERE_COMITE` del motor, caso 134); las del deudor con cupo no.
- **Esbozo e2e**: id `e2e-29-c` · archivo `21_29.e2e.mjs` (se agrega al archivo de la regla 29, no a uno nuevo) · `finally`: el de `e2e-29-b`.

## HU-16 · La línea global del deudor es la quinta línea del modelo (definición ajustada 22-09-2026: «ok» a cinco líneas, G-16 cerrado)

### CP-042 · La global agotada manda y el tooltip lo nombra
- **Criterio**: CA-1 de HU-16 · **Dirección**: negativa (no cursa) · **Capa**: suite + e2e. · **Cobertura actual**: **implementado (definición ajustada 22-09-2026: cinco líneas, LF1–LF4 más la global del deudor)** — **caso 4** («manda la línea del deudor») en la suite; el tooltip «Nivel 3: línea global del deudor» del chip del tubo es **NUEVO** en pantalla (un rótulo, T2: la decisión fija el motor, no el texto del chip).
- **Precondición**: MN-01 filtro «Todos»; fila con un deudor cuya global esté agotada (se identifica leyendo `LINEAS_DATA` por `evaluate`, sin inventar RUT, regla 46).
- **Pasos**: 1) leer el `title` del chip «Oportunidad» de esa fila.
- **Resultado esperado**: contiene «Nivel 3» y «línea global del deudor» y cuenta esa factura en `sinLinea`. **Nace en rojo**: hoy «Nivel 3: la línea GLOBAL del deudor» existe sólo como comentario de `capacidadDeudores` y «línea global del deudor» no aparece en ningún `title` renderizado.
- **Esbozo e2e**: id `e2e-13-decies-b` (el chip «Oportunidad» del tubo es la regla 13-decies —parte los deudores por LÍNEA con un lookup— y no la regla 7, que es el motor `asignarLineas` de la suite; CP-015 toma `e2e-13-decies-a`) · archivo `36_tubo_segmentacion.e2e.mjs` · `finally`: `h.apagarDirectorio()` y luego `filtroRapido(h.pagina, "Con línea")`: la precondición pone «Todos», `correr.mjs` sólo reinicia el filtro al cambiar de ARCHIVO y el filtro es la línea base de la capa (`_harness.mjs`), así que sin esto el caso siguiente de `36_tubo_segmentacion` hereda «Todos» (como `restaurarTubo` de `10_12_bis` y el `finally` de `25_58`). Este caso **nace en rojo** (G-16, §16 del spec): no fija conducta vigente y va en el paso 3 del orden sugerido, no en el 1.

### CP-043 · (sin caso: lectura descartada el 22-09-2026)
- La lectura «la global del deudor es un control aparte y el modelo tiene cuatro líneas» quedó descartada: el usuario dio por buenas las cinco líneas (M-27 «ok», G-16 cerrado, §16 del spec respondido). LIN-01 sigue en la integración (caso 144) como control aguas abajo, no como sustituto del tercer nivel. El id no se reutiliza.

### CP-136 · Con la global del deudor holgada la factura cursa por la cascada del par y no aparece motivo `deudor`
- **Criterio**: CA-2 de HU-16 · **Dirección**: negativa (el control no dispara) · **Capa**: suite. · **Cobertura actual**: NUEVO, junto al caso 4 (que fija la dirección que bloquea: la global agotada manda). La cascada del par la cubren los casos 3 y 134 sin mirar la global; CP-043 cubría la lectura descartada (cuatro líneas) y este es el caso de la elegida (cinco).
- **Precondición**: `asignarLineas` con un par con cupo y un A23 cuyo bloque `LINEA_DEUDOR` deja la global del deudor holgada (`restDeudor` ≥ monto de la factura).
- **Pasos**: 1) asignar; 2) leer `origen`, `estado` y `motivo` de la factura.
- **Resultado esperado**: la factura en `CON_LINEA` con `origen` de la cascada del par (LF1–LF4, regla 7); ningún `REQUIERE_COMITE` con motivo `deudor`; el tooltip del chip no nombra «Nivel 3».

## HU-17 · Consulta A23 en cada evaluación y `requiere_resimulacion`

### CP-044 · La segunda firma contra un A23 ya consumido pasa a `requiere_resimulacion`
- **Criterio**: CA-1 de HU-17 · **Dirección**: negativa (no aprueba el subconjunto) · **Capa**: suite. · **Cobertura actual**: NUEVO (G-27; el estado `requiere_resimulacion` lo nombran la regla 12 y `spec-asignacion-lineas.md` §6; el caso 122, gate de la regla 12, no lo menciona ni lo ejerce: el caso nuevo se escribe junto a él).
- **Precondición**: dos versiones del mismo cliente contra `disponible = D`; el core commitea la primera (`utilizada += m1`).
- **Pasos**: 1) firmar la segunda (`confirmarCierre` / `etapaTrasFirma` con estado inyectado); 2) leer `stage` y motivo.
- **Resultado esperado**: `requiere_resimulacion` con la diferencia en pesos; ninguna factura queda aprobada en silencio.

### CP-045 · Si el A23 no cambió, la firma sigue su camino
- **Criterio**: CA-2 de HU-17 · **Dirección**: positiva · **Capa**: suite · **Cobertura actual**: NUEVO. · **Resultado esperado**: `otorgamiento` o `cesion` por `etapaTrasFirma` (caso 88), sin `requiere_resimulacion`.

## HU-18 · Verificación por deudor y la Regla 0 (D5 cerrada del todo: M-23 el 22-09-2026 y M-22 el 23-09-2026, la unidad es el deudor; 048 retirado)

### CP-046 · La mesa lista al deudor con todas sus causas y sólo sus facturas
- **Criterio**: CA-1 de HU-18 · **Dirección**: positiva y negativa (las facturas de otro deudor no están «por verificar») · **Capa**: suite + e2e. · **Cobertura actual**: **implementado (definición ajustada 22-09-2026: «todas las facturas de la oferta pasan por el motor de verificación, los que pasan son los deudores», M-23)** — **casos 27–30** (todas las causas, protocolo propio, criterio sin dato, agrupación) y **157** (por factura) en la suite; la Mesa `VerificacionView` es **NUEVA** en e2e.
- **Precondición**: MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible»; `h.irA("Verificación")`, h1 «Mesa de verificación». No hace falta MN-04: la Mesa (`VerificacionView`) recibe `deals` completo y `filasVerificacion` recorre TODO deal con `facturasOp` (o vetadas) agrupando por deudor con `verifFactura`, sin mirar `ofertaPublicada` (caso 30 obtiene su fila sin `ofertaCerrada` ni `ofertaComunicada`); una OP-DIR simulada y sin publicar ya aparece. El caso 31 gatea otra cosa: el TAB «Verificación» del detalle (`mostrarVerif`), no la mesa. Publicar antes sería una elección del caso, no una condición.
- **Pasos**: 1) localizar la operación por su N°; 2) leer la cabecera del deudor (causas) y sus filas; 3) contrastar con las facturas de otro deudor de la misma operación que el predictor no mandó a teléfono.
- **Resultado esperado**: un card por deudor con ≥ 1 causa; sus facturas «por verificar»; las del otro deudor no aparecen.
- **Esbozo e2e**: id `e2e-6-a` · archivo `32_verificacion_mesa.e2e.mjs` · `h.irA`, `button[title="Abrir la operación"]` · `finally`: MN-10 (repos, `fs_curse_<neg>`, Directorio).

### CP-047 · La primera operación del cliente verifica TODAS las facturas
- **Criterio**: CA-2 de HU-18 · **Capa**: suite · **Cobertura actual**: **caso 76** (Regla 0) y **caso 77** (sólo «nuevo» es primera operación). · **Resultado esperado**: toda la oferta a teléfono.

### CP-048 · (sin caso: lectura descartada el 23-09-2026)
- La lectura A de M-22 —la unidad de la verificación es la empresa emisora y, si falla, toda la oferta queda «por verificar»— quedó descartada: el usuario confirmó que «es por deudor», la empresa deudora, quien paga la factura y a quien el equipo llama (D5 cerrada del todo, sin ADR). CP-046 y CP-047 son la definición. El id no se reutiliza.

## HU-19 · Pricing: tasa por deudor sobre cada documento con su plazo

### CP-049 · Dos facturas del mismo deudor con plazos distintos producen `VP` distintos con la misma tasa
- **Criterio**: CA-1 de HU-19 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: NUEVO (G-23; los casos 70–73 son el molde y hoy el plazo entra por deudor).
- **Precondición**: `prorratearOperacion` con facturas de 30 y 90 días del mismo deudor, tasa 2,1 %.
- **Pasos**: 1) prorratear; 2) comparar `VP` por documento; 3) sumar por concepto.
- **Resultado esperado**: `VP` distintos; la suma por documento = total en todos los conceptos (caso 71 sigue verde).

### CP-050 · Bajo el piso del deudor la simulación queda fuera de atribución
- **Criterio**: CA-2 de HU-19 · **Dirección**: negativa · **Capa**: suite · **Cobertura actual**: **caso 149** y **caso 119**. · **Resultado esperado**: `requiereGerente` con el piso del deudor más exigente.

## HU-20 · Tasa de referencia: el último negocio cursado del cliente (definición confirmada 22-09-2026; en producción lo entrega el core)

### CP-051 · La referencia es el último negocio cursado del cliente y el chip lo nombra con id, fecha y tasa
- **Criterio**: CA-1 de HU-20 (definición confirmada 22-09-2026: «está bien que sea contra el último negocio») · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: **implementado (definición ajustada 22-09-2026)** en el motor —`tasaUltimoNegocio` toma el último negocio del cliente— pero sin caso que lo fije: NUEVO como caso que protege conducta vigente (G-21 cerrado). «Sintético» = en la demo ese historial es dato generado (`historialComercial`, sembrado por cliente con `hashStr` + `pcRng`), no leído de un activo; en producción la fuente es el último negocio cursado del cliente en el core (dato / contrato, sin gap propio todavía).
- **Precondición**: cliente con historial de 3 negocios; `CFG_ACTIVA.tasaModo` en `"ultima"` («Tasa del último negocio cursado») y luego en `"mayor"` («La mayor de ambas»).
- **Pasos**: 1) leer `tasaUltimoNegocio(deal)`; 2) prorratear con cada modo; 3) leer el `title` del chip de tasa (`tasaFuente`) por `evaluate`.
- **Resultado esperado**: la referencia es el negocio más reciente de los 3 (id, fecha, tasa); con `"ultima"` la tasa efectiva es la suya; con `"mayor"`, la mayor entre ella y la ponderada por riesgo; el `title` nombra ese negocio.

### CP-052 · Sin negocios previos del cliente la referencia dice «cliente sin negocios previos» y rige la ponderada por riesgo
- **Criterio**: CA-2 de HU-20 · **Dirección**: negativa (no se inventa referencia) · **Capa**: suite · **Cobertura actual**: NUEVO, fija conducta vigente (el `title` del chip de tasa ya dice «cliente sin negocios previos»). · **Precondición**: cliente sin historial; `tasaModo` en `"ultima"` y en `"mayor"`. · **Resultado esperado**: `tasaUltimoNegocio` vacío; la tasa efectiva es la ponderada por riesgo en los dos modos; el rótulo «cliente sin negocios previos»; ningún promedio ni la tasa de otro cliente.

## HU-21 · Las condiciones comerciales y el modo de tasa viajan en la versión (decidido el 22-09-2026: ADR-0013 punto 5, G-32)

### CP-053 · La versión trae tasa, comisión y anticipo y el diff los reporta
- **Criterio**: CA-1 de HU-21 · **Capa**: suite · **Cobertura actual**: **parcial desde el 23-09-2026**: el caso **168** fija que cada versión trae `pricing` (tasa ponderada, tasa efectiva, descuento, comisión, anticipo, gastos, modo); el diff entre versiones de pricing (`cambio_tasa`) sigue NUEVO (los casos 16–19 son el molde del diff).
- **Precondición**: dos versiones con tasa 2,1 y 2,4. · **Resultado esperado**: cada versión con tasa, comisión y anticipo Y el modo de tasa con que se simuló (CP-123); el diff reporta `cambio_tasa`.

### CP-054 · La huella O05 no cambia por una tasa distinta
- **Criterio**: CA-2 de HU-21 · **Dirección**: negativa · **Capa**: suite. · **Cobertura actual**: **cubierto el 23-09-2026** por el caso **168** (d): dos versiones con modo de tasa distinto y `huellaOperacion` idéntica (junto al 85).
- **Precondición**: `huellaOperacion` sobre el mismo paquete con dos tasas. · **Resultado esperado**: SHA-256 idéntico.

### CP-123 · La versión guarda el modo de tasa y las condiciones asignadas; cambiar el modo en Configuración y re-evaluar deja una versión que lo dice
- **Criterio**: CA-1 de HU-21 (en pantalla; M-36, decisión del 22-09-2026: «guarda en la versión el tipo de modelo que se utilizó para simular (tasa ponderada o última operación) y las condiciones de descuento y comisiones que se asignaron») · **Dirección**: positiva (la versión lo trae y cambia con el modo) y negativa (sin cambiar el modo, dos versiones seguidas lo repiten igual) · **Capa**: e2e + suite. · **Cobertura actual**: **suite cubierta el 23-09-2026** por el caso **168** (`CFG_ACTIVA.tasaModo` en «riesgo» y en «ultima» deja dos versiones que difieren en `pricing.modo` y no en la huella); la pantalla —gear → «Selección de la tasa del negocio» → «Re-evaluar operación» → `SIM_VERSIONS`— sigue como e2e NUEVO con el esbozo de abajo.
- **Precondición**: MN-01 «Con línea» fila 0, MN-02, MN-03 «Deudores con línea»; `v0 = SIM_VERSIONS[id]` por `evaluate` (con ADR-0013 la simulación ya emitió la v1, CP-034). El modo se cambia en pantalla, que sí existe: gear `button[title="Configuración"]` → sección «Simulación y pricing» → `CfgCampo` «Selección de la tasa del negocio» (`select` con «Ponderada por riesgo del deudor» = `riesgo`, «Tasa del último negocio cursado» = `ultima`, «La mayor de ambas (no bajar de la última)» = `mayor`); `modo0 = select.inputValue()`.
- **Pasos**: 1) leer la última versión: su modo de tasa y sus condiciones (tasa efectiva, comisiones, anticipo) por deudor; 2) en el detalle «Re-evaluar operación» sin tocar nada → versión n+1; 3) cambiar el modo a uno distinto de `modo0`, volver al detalle → «Re-evaluar operación» → versión n+2; 4) leer las tres.
- **Resultado esperado**: paso 2: la n+1 repite modo y condiciones de la anterior; paso 4: la n+2 trae el modo nuevo y, si la tasa efectiva cambió, condiciones distintas, y el diff entre n+1 y n+2 reporta el cambio de modo. La huella O05 no cambia entre las tres (CP-054, caso 85). Suite: `snapVersionCli` con `CFG_ACTIVA.tasaModo` en `"riesgo"` y en `"ultima"` produce dos snapshots que difieren en el modo y no en el paquete.
- **Esbozo e2e**: id `e2e-HU-21-a` · archivo `28_version_v1.e2e.mjs` · `h.abrirDetalle`, `evaluate(() => SIM_VERSIONS)`, `button[title="Configuración"]` · `finally`: `select.selectOption(modo0)`, Opciones → «Eliminar la simulación», MN-10.

## HU-22 · El resultado versionado se muestra

### CP-055 · El tab Otorgamiento lista los requisitos en morado y al publicar pasan a rojo
- **Criterio**: CA-1 de HU-22 · **Capa**: suite + e2e · **Cobertura actual**: **caso 158** (suite); en pantalla lo cubren CP-115 y CP-116 (HU-41: badges en morado sin publicar, en rojo al publicar).

### CP-056 · La mesa lista sólo lo que el predictor mandó a teléfono
- **Criterio**: CA-2 de HU-22 · **Capa**: suite + e2e · **Cobertura actual**: **caso 30** (`filasVerificacion` agrupa por deudor y sólo trae los que requieren llamada, con `causas.length ≥ 1`) y **caso 27** (todas las causas) en la suite; el **caso 157** fija el estado POR FACTURA, la retirada que sigue en la mesa y el respaldo por documento, no el filtro; CP-046 en pantalla.

### CP-057 · Al cerrar, `solicitudes` es una solicitud al comité y el chip reparte el giro
- **Criterio**: CA-3 de HU-22 · **Capa**: suite + e2e · **Cobertura actual**: **caso 106** (solicitud en puntual), **casos 80 y 83** (suma por tipo, chip del tubo), **`e2e-15-bis-bis-a`** (la solicitud cruza). · **Resultado esperado**: el de esos casos.

## HU-23 · Re-evaluables y excepcionables según criticidad

### CP-058 · El apoderado del área y nivel visa la excepción; para quien no tiene atribución el botón «Aprobar excepción» no se renderiza (rama `puedeVisar`)
- **Criterio**: CA-1 de HU-23 · **Dirección**: positiva y negativa · **Capa**: suite + e2e. · **Cobertura actual**: **casos 36, 38, 135** (suite, las dos direcciones: el 135 ejerce `GG` comercial N3 rechazado sobre C01 Operaciones N1 —`ggViola`— y `RG` N4 rechazado / `SR` N5 aprobado sobre C21 —`nivelOk`—; el 38 fija que C01 la aprueban sólo los de Operaciones; el 36 que `pueden(reglaN4, 4)` son sólo `RG` y `SR` y que el cargo vacante lo cubre la jefatura). En pantalla, **NUEVO**: ningún e2e monta el tab Otorgamiento con un visado real.
- **Precondición**: MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible», tab «Otorgamiento». El e2e monta UNO de los tres escenarios que CA-1 enuncia y dice cuál: (i) una excepción de Operaciones N1 (C01), visada por un cargo de Operaciones y negada a `GG` (comercial N3); (ii) una de Riesgo N5 (C21), negada a `RG` (N4) y visada por `SR` (N5); (iii) un cargo vacante cubierto por su jefatura (caso 36). Si la OP-DIR no gatilla ninguna de esas reglas, el caso declara que verifica el mismo control OTG-01 con otro par (área, nivel) y nombra la regla que sí gatilló. Los códigos se eligen por `USERS` con MN-07 en la pestaña del detalle (regla 4), nunca fijos.
- **Pasos**: 1) con el cargo SIN atribución (el comercial en (i), `RG` en (ii)): buscar en esa fila `getByRole("button", { name: /^Aprobar excepción/ })` (el botón se rotula «Aprobar excepción» y abre el panel «Aprobar excepción · comentario y respaldo»); 2) con el cargo CON atribución: «Aprobar excepción» → comentario → confirmar; 3) leer el estado de la fila; 4) `evaluate` con `repoVisado.get(id)` (clave real `pc_repo_otorgamiento_visado`, `crearRepo("otorgamiento_visado")`, forma `{[tenantId]: {[dealId]: {[stKey]: …}}}`).
- **Resultado esperado**: paso 1: **ausente** —cuando la sesión no tiene atribución la rama `puedeVisar` (`x.regla && puedeAprobarExc(usuario, x.regla, x.nivel || 4)`) no se renderiza y aparece el panel de solicitud en su lugar, así que la aserción es «cero botones», no «disabled con OTG-01»; el rechazo con código OTG-01 lo fija `validarMutacion` en la suite (caso 135)—; paso 3: «Aprobada» con el nombre del apoderado (padrón, caso 59); paso 4: la entrada por `stKey`.
- **Esbozo e2e**: id `e2e-OTG-01` · archivo `31_otorgamiento_visado.e2e.mjs` · MN-07 en la pestaña del detalle, `det.getByRole("button", { name: /^Aprobar excepción/ })` · `finally`: `sel.selectOption(usuario0)`, MN-10.

### CP-059 · Una regla cuyo tramo no llega a nadie sale `no_ejecutada` y no bloquea
- **Criterio**: CA-2 de HU-23 · **Dirección**: negativa · **Capa**: suite · **Cobertura actual**: **casos 141 y 143**, `regla_35.test.mjs`. · **Resultado esperado**: nombrada en el veredicto, sin bloquear.

### CP-060 · Un rechazo re-evaluable se recalcula con versión; uno de `NO_REEV_CLIENTE` no
- **Criterio**: CA-3 de HU-23 · **Dirección**: positiva y negativa · **Capa**: suite · **Cobertura actual**: **caso 56** (el motor decide con las variables inyectadas) y **caso 124** (la re-evaluación emite versión). · **Resultado esperado**: el re-evaluable cambia con variables frescas; el no re-evaluable queda como estaba.

## HU-24 · Bloqueo por deudor: no existe (D2 cerrada el 22-09-2026, ADR-0015: bloqueante es el rechazo firme del catálogo; M-18 redefinida: el comité que rechaza retira y reabre (ADR-0015); la verificación fallida marca la operación y avisa, y el ejecutivo retira, re-simula y vuelve a publicar (ADR-0018))

### CP-061 · C30–C32 del cliente pierden la operación con `perdidaPor: "sistema"`
- **Criterio**: CA-1 de HU-24 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: NUEVO, y fija conducta que el usuario dio por buena: M-15 «está perfecto: son esas 3 reglas y/o las que en el futuro se clasifiquen como rechazo firme» → **implementado (definición ajustada 22-09-2026)** en el motor, sin caso que ejerza el efecto. La regla 4 enuncia «knockout C30/C31/C32 → `rechFirme` → pérdida automática» pero ningún caso de la suite ejerce el efecto (los casos 117–118 fijan la pérdida manual).
- **Precondición**: `visadoDealCalc` con C30 gatillada y el `useEffect` de pérdida como función alcanzable (o su predicado). · **Resultado esperado**: `stage: "perdida"`, `perdidaPor: "sistema"`, `causaPerdidaDeal` específica (regla 5), tareas cerradas. La dirección que NO bloquea es CP-117.

### CP-117 · Una regla C gatillada que NO es knockout deja la operación en su etapa, como excepción por firmar
- **Criterio**: CA-1 de HU-24 (segunda dirección: el control no dispara) · **Dirección**: negativa (no se pierde) · **Capa**: suite. · **Cobertura actual**: NUEVO. El bloqueo firme es un control (regla 4: knockout C30/C31/C32 → `rechFirme` → pérdida automática; regla 5) y cada control lleva las dos direcciones; ni CP-061, ni CP-063 (la firmada es de sólo lectura), ni CP-060 (re-evaluación con variables frescas) comprueban que una regla no-knockout NO pierda la operación.
- **Precondición**: `visadoDealCalc` con una regla C re-evaluable gatillada (complemento de `NO_REEV_CLIENTE`, `spec-gestion-excepciones.md` §2.4) y ninguna de C30–C32; el mismo predicado de pérdida de CP-061.
- **Pasos**: 1) evaluar; 2) leer `rechFirme`, `rechReev` y `exc`; 3) correr el predicado de pérdida; 4) leer `stage` y `perdidaPor`.
- **Resultado esperado**: `rechFirme` vacío, la regla en `rechReev` (o en `exc` con su aprobador ruteado por área y nivel, regla 4); `stage` sin cambio; sin `perdidaPor: "sistema"`; la excepción aparece en el tab Otorgamiento como pendiente por firmar (`e2e-15-bis-bis-a` es el molde del panel).

### CP-062 · (sin caso: lectura descartada el 22-09-2026)
- La lectura D2-A —una disposición «bloqueante del deudor» y el gesto «Sacar facturas del deudor bloqueado»— quedó descartada por ADR-0015: no hay bloqueo por deudor; M-18 es la consecuencia del comité que rechaza (CP-096, CP-126, CP-127) o de la verificación fallida (ADR-0018: CP-138 … CP-142; CP-091 y CP-119 fijan lo de hoy y se dan vuelta). El id no se reutiliza.

### CP-063 · Firmada, ninguna mutación fuera de las dos admitidas retira nada
- **Criterio**: CA-3 de HU-24 · **Dirección**: negativa · **Capa**: suite. · **Cobertura actual**: **NUEVO** en las dos capas. `regla_33.test.mjs` vigila OTRA pieza de la regla 33 —la guarda contra la solicitud al comité duplicada (`repoSolicitudComite` existe, `previa` lo consulta, la inyección lo escribe con `detalle`)— y no menciona `incorporarFacturasOferta` ni `retirarFacturaOferta`; la regla 33 dice que la guarda de las mutaciones «lo verifica ABRIR el detalle».
- **Precondición**: deal con `clienteAcepto: true`, `paqueteCerrado`; llamar `retirarFacturaOferta` con motivo distinto de `noConfirmada` y de `comite_rechazo` (las dos mutaciones admitidas sobre la firmada desde ADR-0015; CP-096 fija la segunda; desde ADR-0018 la primera la dispara el ejecutivo y no la marca de la verificación, CP-140). · **Resultado esperado**: negativa; `facturasOp` intacto; `reservado` sin cambio (regla 12). La dirección que PASA sobre la misma operación es CP-119.

### CP-119 · Sobre la misma firmada, la marca de la verificación NO retira (desde el 23-09-2026, ADR-0018, regla 67); el retiro es del EJECUTIVO con la operación reabierta, por el camino ordinario
- **Criterio**: CA-3 de HU-24 (dirección que pasa: el control de sólo lectura tiene una excepción, y es una sola) · **Dirección**: positiva (el retiro del ejecutivo pasa) y negativa (marcar «no verificada» no retira) · **Capa**: suite. · **Cobertura actual**: **casos 21–23** (regla 13: después de aceptar sólo se encoge; la mutación admitida es el retiro por `noConfirmada`, y emite versión) fijan la versión que encoge y valen tal cual para el retiro; lo que HOY dispara ese retiro es la marca de la verificación (`verificarDeudor`, `marcarFactura`, `noConfirmoDeudor`), y eso es lo que ADR-0018 cambia: **vigente hoy · cambia con ADR-0018: pasa a la dirección contraria** en el disparador —la marca deja de retirar (CP-138) y retira el ejecutivo (CP-140)—; el molde de la versión que encoge es `recortarAsignacion` (CP-096 lo cita como molde del rechazo del comité). Una sola lectura desde el 23-09-2026: la del ADR.
- **Precondición**: el mismo deal de CP-063 (`clienteAcepto: true`, `paqueteCerrado`), `n0 = (SIM_VERSIONS[id] || []).length`, una factura de la oferta marcada «no verificada» (veredicto en `repoVerifVeredicto` y la marca por factura, sin retiro). **Implementación (23-09-2026)**: la marca es el veto sin retiro (caso 167, `regla_67`); `retirarFacturaOferta` ya no acepta la excepción «noConfirmada» —la guarda de sólo lectura aplica siempre— y no recorta ni emite versión: el ejecutivo pasa por «Editar la oferta» (reabre y revoca la firma), retira, re-simula (la versión nueva sale de la simulación) y vuelve a publicar. Los casos 21–23 siguen fijando `recortarAsignacion` para el comité (regla 65).
- **Pasos**: 1) leer `facturasOp` y `SIM_VERSIONS[id]` después de la marca; 2) retirar como ejecutivo: `retirarFacturaOferta(id, f, "noConfirmada")` (la llamada que con ADR-0018 hace el gesto del ejecutivo en el detalle, no la marca); 3) leer `facturasOp`, `SIM_VERSIONS[id]` y `linea.cursable` de la última versión; 4) intentar volver a agregar el folio.
- **Resultado esperado**: paso 1: `facturasOp` y `SIM_VERSIONS[id].length === n0` sin cambio (la marca no retira ni versiona; hoy falla: retira al marcar); paso 3: el folio sale de `facturasOp`; una versión más (`v: n0 + 1`, `rev: n0`) con `linea` que sólo ENCOGE respecto de la anterior (ninguna factura nueva en `CON_LINEA`, `cursable` ≤ el anterior); el folio queda vetado (`repoNoConfirmadas`, regla 6) y no vuelve a entrar (regla 1); `reservado` no sube. Que publicar de nuevo revoque la firma es CP-140; que la marca deje el issue y el aviso, CP-138 y CP-139.

### CP-137 · Un deudor que gatilla una regla D no produce ninguna propuesta de retiro en el detalle: la excepción se firma o se rechaza
- **Criterio**: CA-2 de HU-24 · **Dirección**: negativa (bloquea al retiro automático) · **Capa**: e2e. · **Cobertura actual**: NUEVO. D2 cerrada (ADR-0015): la disposición «bloqueante del deudor» y el gesto «Sacar facturas del deudor bloqueado» no existen ni se crean (CP-062 cubría esa lectura y quedó retirado); ningún e2e afirma su ausencia.
- **Precondición**: MN-01 con una fila cuyo deudor gatilla una regla D (el tab Otorgamiento la lista como excepción por firmar; molde `e2e-15-bis-bis-a`), MN-02, MN-03.
- **Pasos**: 1) MN-03; 2) abrir el tab Otorgamiento; 3) leer los botones y textos del panel del deudor; 4) leer «Documentos en la oferta».
- **Resultado esperado**: la fila del deudor con su regla D y los gestos de visado según atribución (CP-058); ningún botón ni texto que proponga sacar sus facturas (el único retiro es el manual por factura, `button[title="Retirar esta factura de la oferta"]`; «Sacar facturas sin línea» es del motor de líneas, `e2e-29-b`); las facturas del deudor siguen en «Documentos en la oferta».
- **Esbozo e2e**: id `e2e-HU-24-a` · archivo `31_otorgamiento_visado.e2e.mjs` · `finally`: MN-10.

---

## Etapa 4 · Cierre y publicación

## HU-25 · Ninguna excepción sin justificar en la mutación de cierre

### CP-064 · `cerrarOferta` con una excepción muda devuelve negativa y no escribe
- **Criterio**: CA-1 de HU-25 · **Dirección**: negativa · **Capa**: suite. · **Cobertura actual**: caso **161** y `regla_62.test.mjs` (implementado el 23-09-2026; M-19: «debe ser una exigencia del backend y un gate»; G-12, regla 62 con la 24 como principio y `giroCursable` —caso 108, que el cierre ya aplicaba al monto— como molde).
- **Precondición**: una operación sin evidencia del contrato (O05 queda «sujeta a excepción», caso 85) y sin solicitudes: `excepcionesSinComentario` devuelve ≥ 1. `cerrarOferta` es un closure de `PipelineComercial`, así que la suite prueba la compuerta pura que él llama (`compuertaExcepcionesMudas`) y el gate de texto fija que la llama antes de escribir.
- **Pasos**: 1) `compuertaExcepcionesMudas(excepcionesSinComentario(deal))`; 2) leer `ok`, `n` y `motivo`; 3) el gate de texto: la llamada y el `return eChk` en `cerrarOferta` antes de `patchCierre`.
- **Resultado esperado**: `{ok: false, n, motivo}` con «Cierre rechazado · N excepción(es) sin justificar»; en la mutación `logSys` escribe lo mismo y no se escribe `ofertaCerrada` ni se inyecta nada (`return eChk` antes de `patchCierre`, gate `regla_62.test.mjs`).

### CP-065 · Todas justificadas: escribe `ofertaCerrada` y aparece «Operación creada»
- **Criterio**: CA-2 de HU-25 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: suite: caso **161** (con todas justificadas la compuerta deja pasar); en pantalla parcial: `e2e-15-bis-bis-a` cierra de verdad pero afirma el log y la bandeja, no el chip. NUEVO para el chip.
- **Precondición**: MN-01 «Con línea» fila 0, MN-03 «Deudores con línea», MN-04. Para el menú «Acciones» hace falta la sesión ADMIN (MN-07 en la pestaña del detalle) y el tab «Bitácora» / «Cobranza» / «Mensajería»: la sesión inicial no ve esos tabs y en Negocio › Detalle el botón no existe (regla 30, `e2e-30`).
- **Pasos**: 1) tras confirmar, leer `h.texto(det)`; 2) MN-07 a ADMIN → tab «Bitácora» → menú «Acciones».
- **Resultado esperado**: chip «Operación creada», sin CTA de cierre, ítem «Editar la oferta» (regla 33).
- **Esbozo e2e**: id `e2e-33-b` (la conducta es la regla 33 —cerrada la oferta, el CTA se va y queda «Operación creada» + Acciones › Editar— y no la 24, que es el gate de inyección al core; el id se cita en la fila 33 de `invariantes.md`) · archivo `29_publicacion.e2e.mjs` · MN-04, MN-07, `itemAcciones` · `finally`: `sel.selectOption(usuario0)`, MN-10.

### CP-066 · El modal sigue deshabilitado con «Pendiente: N excepción(es) por aclarar…»
- **Criterio**: CA-3 de HU-25 · **Dirección**: negativa · **Capa**: e2e · **Cobertura actual**: **parcial** — `e2e-15-bis-bis-a` lee el `title` «Pendiente: N excepción(es)…» y destraba por el tab Otorgamiento, pero sólo dentro de `if (await conf.isDisabled()) { … } else { await conf.click(); }`, con `excepciones = "sin excepciones pendientes"` por defecto: si la operación no trae excepciones sin justificar confirma directo y el caso pasa igual. Es cobertura CONDICIONAL, no un gate: nadie exige que el botón ESTÉ deshabilitado cuando hay excepciones mudas. **NUEVO** como caso propio.
- **Precondición**: MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible» (trae excepciones del cliente y de deudores, `e2e-15-bis-bis-a`); se comprueba por `evaluate` que la simulación deja ≥ 1 excepción sin comentario (o se planta una: retirar el comentario de la solicitud en `SOLICITUD_EXC`), y el caso reporta cuántas.
- **Pasos**: 1) CTA `button` `/^\s*Enviar a Comité y Publicar\s*$/` → tarjeta `/Electrónicamente · vía email/`; 2) leer `disabled` y `title` del `button` `/^\s*(Confirmar y enviar|Confirmar curse)\s*$/`; 3) «Cancelar» → tab «Otorgamiento» → «Marcar sin comentarios y solicitar (N)» → «Enviar N solicitud(es)»; 4) volver a «Negocio», repetir el paso 1 y releer.
- **Resultado esperado**: paso 2: `disabled` y `title` «Pendiente: N excepción(es) por aclarar en el tab Otorgamiento» con N = las contadas (compuerta de `ModalCurse`: `disabled={sinComentario > 0 || !gOk}`); paso 4: habilitado y sin ese `title`.
- **Esbozo e2e**: id `e2e-HU-25-a` · archivo `29_publicacion.e2e.mjs` · `finally`: «Cancelar» si el modal quedó abierto, MN-10.

### CP-067 · `solicitarAprobacionExc` no guarda una solicitud sin justificación
- **Criterio**: CA-4 de HU-25 · **Dirección**: negativa y positiva (con texto sí guarda) · **Capa**: suite. · **Cobertura actual**: caso **161** (implementado el 23-09-2026, regla 62; el caso 114 fija que solicitar no cierra la puerta). · **Precondición**: `solicitarAprobacionExc` con `comentario: "   "`, sin archivos ni declaración; luego con la declaración «sin comentarios»; luego con texto. · **Resultado esperado**: negativa, `SOLICITUD_EXC` sin entrada, sin pre-evaluación abierta y sin tarea; luego una entrada con `sinComentarios: true`; luego una con comentario, y la cuenta de mudas en cero.

## HU-26 · Solicitud automática al comité al publicar (definición ajustada 23-09-2026: la solicitud sale sólo sin línea suficiente; 070 retirado)

### CP-068 · Con deudores sin cupo la solicitud se inyecta, cruza y la bandeja la lista
- **Criterio**: CA-1 de HU-26 · **Capa**: e2e + suite · **Cobertura actual**: **`e2e-15-bis-bis-a`** (log «Solicitud de línea inyectada», registro idéntico en `api2ListarProcesos()` del tubo, y que Líneas › Solicitudes CONTIENE el id: `verEnBandeja` devuelve `t.includes(id)`), **`e2e-15-bis-bis-b`** (idempotencia), **casos 106, 126, 146**. El rótulo «En gestión» de la fila lo escribe `api1Inyeccion` (`SOLICITUDES_LINEA.unshift({ …sol, idProceso, estado: "En gestión", refrescos: 0, … })`) y es vigente, pero ningún e2e lo lee: **parcial** para el rótulo. · **Resultado esperado**: el de esos casos; y, NUEVO, la fila de la bandeja con ese id dice «En gestión» (se lee su `innerText`, dentro de `e2e-15-bis-bis-a` o como `e2e-15-bis-bis-c` en el mismo archivo `17_15_bis_bis.e2e.mjs`, sin pulsar «Consultar estados», que la avanzaría).

### CP-069 · Con toda la oferta con cupo el CTA dice «Cerrar oferta y publicar» y no se inyecta nada
- **Criterio**: CA-2 de HU-26 (definición ajustada 23-09-2026, M-28: «En caso de existir suficiente se asigna esa») · **Dirección**: negativa · **Capa**: e2e + suite. · **Cobertura actual**: **`e2e-29-a`** (el CTA, sin «Enviar a Comité»); que NO se inyecte tras confirmar es **NUEVO** (suite: `solicitudComiteDeOferta` devuelve `null` sin `requiereComite`).
- **Precondición**: MN-01 «Con línea» fila 0, MN-03 «Deudores con línea», MN-04; `n0 = api2ListarProcesos().length` en el tubo.
- **Pasos**: 1) confirmar «Confirmar curse»; 2) releer `api2ListarProcesos()` y `SYS_LOG`.
- **Resultado esperado**: `n0` sin cambio; ninguna fila «Solicitud de línea inyectada».
- **Esbozo e2e**: id `e2e-15-bis-c` · archivo `29_publicacion.e2e.mjs` · `finally`: MN-10.

### CP-070 · (sin caso: lectura descartada el 23-09-2026)
- La lectura literal de M-28 —con línea suficiente se inyecta igual una solicitud al comité y el CTA lo nombra— quedó descartada: el usuario confirmó la errata del modelo, «En caso de no existir suficiente línea se solicita. En caso de existir suficiente se asigna esa.» (G-17 cerrado, sin ADR). CP-068 y CP-069 son la definición. El id no se reutiliza.

## HU-27 · Lo que se pide al comité sigue al motivo del rechazo

### CP-071 · Motivo `cliente`: `propGlobal` > 0, tipo no puntual, «Línea propuesta: ampliación del tope»
- **Criterio**: CA-1 de HU-27 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: NUEVO (G-18; rojo junto al caso 106; el caso 134 produce el motivo `cliente`). «Ver documento» lo fija `e2e-15-quinquies` para el registro de hoy: se extiende.
- **Precondición**: suite: `solicitudComiteDeOferta` con `ev` cuyo `solicitudes` traen motivo `cliente`; e2e: registro inyectado por consola con `recibirSolicitudLinea` (como `e2e-15-quinquies`) con ese motivo.
- **Pasos**: suite: 1) armar; 2) leer `propGlobal`, `tipoLinea`. e2e: 3) `h.irA("Líneas")` → «Solicitudes» → «Ver documento» → leer la sección «Línea propuesta».
- **Resultado esperado**: `propGlobal` > 0, `tipoLinea ≠ "puntual"`; el documento dice «ampliación del tope».
- **Esbozo e2e**: id `e2e-15-bis-a` · archivo `35_comite_resolucion.e2e.mjs` · `finally`: retirar el registro de `SOLICITUDES_LINEA`, limpiar `_cacheCli`, cerrar el modal por «Cerrar».

### CP-072 · Motivo `deudor`: puntual cliente-deudor y chip «Solicitado» en el wizard
- **Criterio**: CA-2 de HU-27 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **caso 106** (puntual); el chip «Solicitado» en el wizard es **NUEVO** (`e2e-15-quater-bis` declara que no lo cubre).
- **Precondición**: el caso inyecta él mismo el registro con `recibirSolicitudLinea(...)` por `evaluate` (molde `18_15_quinquies`: `recibirSolicitudLinea(auto)` y limpieza de `_cacheCli`), con `rut` = el cliente que abrirá el wizard. No puede apoyarse en `e2e-15-bis-bis-a`: su `finally` retira la solicitud de `api2ListarProcesos()` en las dos pestañas y restaura `SOLIC_SEQ` («al salir: retirada de las dos pestañas»), y además vive en otro archivo, que `correr.mjs [34_…]` no corre. Luego `h.irA("Líneas")` → «Solicitudes» → `getByRole("button", { name: /Nueva línea$/ })` (el botón se rotula «Nueva línea» con icono, no «+ Nueva línea») con el mismo cliente; el chip lo alimenta `deudoresSolicitadosLinea(rut)`.
- **Pasos**: 1) paso Deudores; 2) leer los chips de la fila del deudor solicitado.
- **Resultado esperado**: chip «Solicitado» en ese deudor y no en los demás.
- **Esbozo e2e**: id `e2e-15-bis-b` · archivo `35_comite_resolucion.e2e.mjs` · `finally`: cerrar el wizard, retirar el registro (`api2ListarProcesos().splice`), `_cacheCli.delete(RUT)`, MN-10.

### CP-073 · Motivo `lf1`: pide LF1 y no una puntual
- **Criterio**: CA-3 de HU-27 · **Dirección**: negativa (no puntual) · **Capa**: suite · **Cobertura actual**: NUEVO. · **Resultado esperado**: `tipoLinea: "lf1"` (o el nombre que `RESOLUCION_COMITE.pide` fije) y sin línea de detalle por par.

## HU-28 · Publicar por dos vías con la huella O05

### CP-074 · Vía electrónica: se abre el simulador de correo, el tubo pasa a «Oferta publicada» y los pendientes van en rojo
- **Criterio**: CA-1 de HU-28 · **Dirección**: positiva · **Capa**: e2e + suite. · **Cobertura actual**: parcial — **`e2e-58`** (por inyección `nex-simulado`, no por el cierre real) y **caso 158**; `e2e-15-bis-bis-a` cierra de verdad pero no afirma la pestaña `email.html` ni la fila. **NUEVO** para el camino real.
- **Precondición**: MN-01 «Con línea» fila 0, MN-03 «Deudores con línea».
- **Pasos**: 1) MN-04 con `const [p] = await Promise.all([ctx.waitForEvent("page"), confirmar.click()])`; 2) `await p.waitForURL(/email\.html\?n=/, { timeout: 30000 })` y sólo entonces leer la URL: la pestaña nace en `about:blank` (`window.open("", "_blank")` en el clic, y `win.location.href = href` después, con `href = emailHref(updated)` para el canal Email), así que leerla recién capturada devuelve `about:blank`; 3) `esperarEtapa(h.pagina, id, "Oferta publicada")`; 4) en el detalle, `getComputedStyle` del badge de pendientes.
- **Resultado esperado**: URL `email.html?n=<neg>#d=…` (de ahí se lee `<neg>`); fila «Oferta publicada»; badges en `rgb(239, 68, 68)` (`#EF4444`, CP-116) y el tab «Verificación» presente.
- **Esbozo e2e**: id `e2e-23-a` · archivo `29_publicacion.e2e.mjs` · `finally`: cerrar `email.html`, borrar `fs_curse_<neg>`, MN-10.

### CP-075 · Sólo `ofertaCerrada` sin comunicar: sigue «Negociación»
- **Criterio**: CA-2 de HU-28 · **Dirección**: negativa · **Capa**: e2e + suite · **Cobertura actual**: **`e2e-58`** (dirección B) y **caso 31** (cerrar sin publicar no habilita la verificación). · **Resultado esperado**: el de esos casos.

### CP-076 · Vía física: O05 queda como excepción de Operaciones N3 con el contrato en su tarjeta
- **Criterio**: CA-3 de HU-28 · **Dirección**: positiva · **Capa**: e2e + suite. · **Cobertura actual**: **caso 114** y **caso 85** (suite); en pantalla **NUEVO**.
- **Precondición**: la de CP-074, pero en el modal `button` `/Físicamente · con contrato adjunto/`.
- **Pasos**: 1) confirmar; 2) tab «Otorgamiento»; 3) localizar la tarjeta del criterio O05.
- **Resultado esperado**: fila O05 «Operaciones · N3» pendiente, con el control de carga del contrato y el cargo derivado (regla 30-ter); no se abre `email.html`.
- **Esbozo e2e**: id `e2e-23-b` · archivo `29_publicacion.e2e.mjs` · `finally`: MN-10.

### CP-077 · La oferta publicada por el Agente IA cuenta como comunicada
- **Criterio**: CA-4 de HU-28 · **Capa**: suite + e2e · **Cobertura actual**: **caso 32** y **`e2e-12-bis-d`** (`waSesion` con la oferta promueve y el dual no la devuelve). · **Resultado esperado**: `ofertaPublicada` verdadero con `negocioNum` + mensaje `/Oferta de factoring/i`.

---

## Etapa 5 · Firma

## HU-29 · Aceptar sólo firmando en el portal

### CP-078 · La firma cruza al tubo y deja la etapa que `etapaTrasFirma` decide
- **Criterio**: CA-1 de HU-29 · **Dirección**: positiva · **Capa**: e2e + suite. · **Cobertura actual**: **casos 88 y 154** y `regla_estado_pestanas.test.mjs` (suite/texto). En pantalla **NUEVO**: ninguna maniobra e2e llega a la firma.
- **Precondición**: MN-01 «Sin línea» fila 0 (deja excepciones y deudores sin cupo: la firma no deja nada listo), MN-03 «Todo lo disponible», MN-04; `neg` de la URL de `email.html`.
- **Pasos**: 1) MN-05 en la pestaña del detalle; 2) esperar la cabecera del detalle; 3) `esperarEtapa` en el tubo; 4) MN-07 a ADMIN en el detalle → «Mensajería».
- **Resultado esperado**: cabecera «Otorgamiento / Verificación» (falta línea, excepciones y verificación); la fila del tubo dice «Otorgamiento»; el hilo «Cierre de negocio · <id>» existe con remitente el sistema.
- **Esbozo e2e**: id `e2e-55` · archivo `30_firma.e2e.mjs` · MN-04, MN-05, `esperarEtapa` · `finally`: MN-10 completo (repos, solicitud, `fs_curse_<neg>`, sesión, Directorio).

### CP-079 · Con todo en verde la firma va a «Pendiente Integración» (y el camino real una vez)
- **Criterio**: CA-1 de HU-29 (segunda rama) · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: NUEVO.
- **Precondición**: MN-01 «Con línea» fila 0, MN-03 «Deudores con línea», MN-04; excepciones resueltas con la maniobra de CP-058 y la verificación con la de CP-089 (tres checks y fecha → la factura pasa a «verificada», caso 157, regla 53) antes de firmar —no CP-091, que es la marca «No verificar» y deja la factura `noConfirmada` (hoy retirada y el detalle exigiendo «Re-evaluar»; con ADR-0018, en la oferta con el issue), lo contrario del «todo en verde» que este caso necesita (regla 26, caso 88)— (o una fila sin pendientes, que el caso busca entre las tres y reporta cuál). Las maniobras se rehacen dentro de este caso: el `finally` de los otros las deshace.
- **Pasos**: 1) MN-06 (camino real: `email.html` → `curse.html` → `#pt-cursar`); 2) esperar; 3) `h.irA("Operaciones")`.
- **Resultado esperado**: cabecera «Pendiente Integración»; la fila sale del tubo (`fueraDelTubo`) y aparece en Operaciones con ese rótulo (regla 26).
- **Esbozo e2e**: id `e2e-1-a` · archivo `30_firma.e2e.mjs` · `ctx.waitForEvent("page")` ×2 · `finally`: MN-10; si `ES_FILE` es falso el caso lo dice y cae a MN-05.

### CP-080 · «Editar la oferta» revoca la firma y volver a firmar la restituye
- **Criterio**: CA-2 de HU-29 · **Dirección**: negativa y positiva · **Capa**: suite + e2e. · **Cobertura actual**: **casos 24 y 26** (suite). En pantalla **NUEVO**.
- **Precondición**: la cadena de CP-078 rehecha dentro del caso (MN-01 «Sin línea» fila 0 → MN-03 → MN-04 → MN-05): la firmada de CP-078 NO sobrevive, porque su `finally` es MN-10 completo y `h.apagarDirectorio()` retira las OP-DIR por su marca `_directorio` (el siguiente encendido las regenera de cero con `construirDirectorio`). Alternativa: escribir el archivo 29 como UN caso encadenado (CP-078 → 080) con un solo `finally`. Luego MN-07 a ADMIN en la pestaña del detalle y tab «Bitácora»: el menú «Acciones» sólo existe en Bitácora / Cobranza / Mensajería (regla 30, `e2e-30`).
- **Pasos**: 1) menú «Acciones» → «Editar la oferta»; como la firma se revoca, el `ConfirmDialog` se titula «¿Reabrir esta operación para modificarla?» y su botón se rotula «Reabrir operación» (no «Editar la oferta»; `edicionOperacion(...).revocaFirma`) → confirmar; 2) leer cabecera y tubo; 3) MN-05 de nuevo.
- **Resultado esperado**: el diálogo con ese título y ese botón; la cabecera vuelve a «Oferta y Negociación» con la marca de reabierta; el tubo «Negociación»; tras el paso 3 vuelve a «Otorgamiento».
- **Esbozo e2e**: id `e2e-1-b` · archivo `30_firma.e2e.mjs` · `finally`: `sel.selectOption(usuario0)`, MN-10.

### CP-081 · El ejecutivo no tiene acción para mover a «Aceptada»
- **Criterio**: CA-3 de HU-29 · **Dirección**: negativa · **Capa**: e2e. · **Cobertura actual**: parcial — `e2e-30` fija que «Avanzar a» iguala el catálogo, no que excluya «Aceptada» antes de la firma. **NUEVO**.
- **Precondición**: un detalle real abierto antes (MN-01, MN-02 sobre la fila 0), porque MN-09 toma el primer ticket `tipo: "deal"` de `TICKETS_EMITIDOS` y lanza si no hay ninguno; luego MN-09 con `{ofertaCerrada: true, ofertaComunicada: true, negocioNum}` sin `clienteAcepto` y `usuario` ADMIN en el payload (para que exista el tab «Bitácora» con el menú «Acciones», regla 30).
- **Pasos**: 1) menú del botón principal; 2) listar los ítems bajo «Avanzar a»; 3) tab «Bitácora» → menú «Acciones» → listar sus ítems.
- **Resultado esperado**: ninguno dice «Aceptada» ni «Cesión»; el menú «Acciones» tampoco.
- **Esbozo e2e**: id `e2e-1-c` · archivo `30_firma.e2e.mjs` · `h.abrirDetalle(0)`, `abrirConTicket` · `finally`: cerrar las dos pestañas, `h.apagarDirectorio()`.

## HU-30 · El «cursar» del chat no es una firma

### CP-082 · «cursar» por WhatsApp registra intención y no escribe `clienteAcepto`
- **Criterio**: CA-1 de HU-30 · **Dirección**: negativa · **Capa**: suite. · **Cobertura actual**: NUEVO (G-26; rojo).
- **Precondición**: deal en `oferta` con `ofertaPublicada` y `waSesion`; el manejador del intent `cursar` alcanzable por nombre.
- **Pasos**: 1) despachar el intent; 2) leer `clienteAcepto`, `stage`, bitácora.
- **Resultado esperado**: `clienteAcepto` falso, etapa «Oferta publicada», bitácora «Intención de curse por WhatsApp».

### CP-083 · `aprobacionFormalCliente` es falsa hasta el portal y verdadera después
- **Criterio**: CA-2 de HU-30 · **Dirección**: negativa y positiva · **Capa**: suite · **Cobertura actual**: NUEVO (los casos 24–26 son el molde). · **Resultado esperado**: falsa tras el intent; verdadera tras `confirmarCierre`.

---

## Etapa 6 · Post-firma

## HU-31 · Una excepción resuelta no se vuelve a pedir, y su clave estable es el versionado (definición ajustada 22-09-2026: «ok», G-13 cerrado)

### CP-084 · El visado sobrevive a la re-evaluación
- **Criterio**: CA-1 de HU-31 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: NUEVO (la regla 33 lo enuncia; el caso 58 prueba que el visado entra por parámetro, no que `reevaluarCliente` lo conserve).
- **Precondición**: `repoVisado` con una entrada aprobada por `dealId + stKey`; `reevaluarCliente`. · **Resultado esperado**: la fila sigue «Aprobada» y no vuelve a la bandeja del apoderado.

### CP-085 · El visado se referencia por su clave estable `dealId + stKey`; ninguna versión lo copia ni lo duplica
- **Criterio**: CA-2 de HU-31 (definición ajustada 22-09-2026: «ok» a la clave estable regla × sujeto como versionado, M-20) · **Dirección**: positiva (la clave sobrevive a la versión) y negativa (la versión no lleva una copia que pueda divergir) · **Capa**: suite. · **Cobertura actual**: **implementado (definición ajustada 22-09-2026)** — **caso 58** (el visado entra al motor por su clave) y **`e2e-13-quaterdecies`** (sobrevive a «Eliminar la simulación»); G-13 cerrado.
- **Precondición y pasos**: los del caso 58; además, emitir dos versiones con `snapVersionCli` con un visado aprobado entre medio. · **Resultado esperado**: `repoVisado.get(id)[stKey]` es la única fuente del estado; las dos versiones no contienen `visados` y `visadoDealCalc` sobre cualquiera de ellas lee el mismo estado.

### CP-086 · «Eliminar la simulación» no toca el visado
- **Criterio**: CA-3 de HU-31 · **Dirección**: negativa · **Capa**: e2e · **Cobertura actual**: **`e2e-13-quaterdecies`** (planta visado, llamada, veto y versión y comprueba la evidencia intacta). · **Resultado esperado**: el de ese caso.

## HU-32 · La excepción que dejó de aplicar se marca «ya no aplica desde la versión N», no se borra (decidido el 22-09-2026: ADR-0016, G-35, T1)

### CP-087 · Cuando ya no gatilla: el visado y la solicitud pasan a «ya no aplica desde la versión N» con actor «sistema» y hora; la tarea se cierra y el hilo recibe el aviso
- **Criterio**: CA-1 de HU-32 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: suite: caso **166** (`reevaluarCliente` marca la solicitud de C07 «ya no aplica desde la versión 2» con actor sistema y hora, cierra la tarea con el motivo, postea en el hilo como el sistema y deja auditoría y bitácora; sin el deudor, el visado de D19 se marca conservando la decisión; nada se borra), implementado el 23-09-2026 (ADR-0016, regla 66; G-14 y G-35). «No debería quedar huérfano, debería quedar con un estado que identifique que cambió, para poder auditar que esa regla quedó así en el cambio de versión».
- **Precondición**: `SOLICITUD_EXC` con una solicitud abierta por `stKey` (y, en una segunda corrida, `repoVisado` con la misma clave aprobada) y una re-evaluación (`reevaluarCliente` con variables que dejan de gatillar el criterio) que emite la versión N.
- **Pasos**: 1) re-evaluar; 2) leer `repoVisado.get(id)[stKey]` y `SOLICITUD_EXC[id][stKey]`; 3) leer la tarea del aprobador y el hilo; 4) leer la auditoría.
- **Resultado esperado**: estado «ya no aplica desde la versión N» (`no_aplica` en `VISADO_STATE` y `estado: "no_aplica"` en la solicitud, con `noAplica: {desdeVersion: N, por: "sistema", fecha}`), la tarea cerrada con ese motivo, un mensaje del sistema en el hilo, una fila de auditoría; nada se borra (`repoVisado` y `SOLICITUD_EXC` conservan la entrada). En la versión N el criterio figura como cumplido.

### CP-088 · Si sigue gatillando nada se marca
- **Criterio**: CA-2 de HU-32 · **Dirección**: negativa · **Capa**: suite · **Cobertura actual**: caso **166** (O05 sigue gatillando: su solicitud y su tarea quedan intactas; el visado de D19 sigue «aprobado» mientras el deudor está en la oferta), implementado el 23-09-2026. · **Resultado esperado**: tarea abierta y visado sin cambio.

### CP-124 · «Ya no aplica desde la versión N» se ve en el tab Otorgamiento y queda auditado: el criterio cumplido, la excepción anterior visible con su estado, la tarea cerrada
- **Criterio**: CA-1 de HU-32 (en pantalla; ADR-0016: «el criterio se muestra como cumplido en la versión vigente, y la excepción anterior sigue visible en el historial del visado con su nuevo estado») · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: NUEVO en pantalla; la conducta está implementada el 23-09-2026 (regla 66, caso 166 en la suite; `regla_66.test.mjs` fija que el tab muestra la excepción anterior con su estado, que la huérfana tiene lista propia y que la bandeja de Tareas dice el motivo). Falta el caso e2e.
- **Precondición**: MN-01 «Sin línea» fila 0, MN-02, MN-03 «Todo lo disponible» (trae excepciones de deudores, `e2e-15-bis-bis-a`); tab «Otorgamiento» (`det.locator("button").filter({ hasText: /^\s*Otorgamiento\s*\d*\s*$/ }).first()`) → «Marcar sin comentarios y solicitar (N)» → «Enviar N solicitud(es)»: queda una solicitud por `stKey` de un criterio D de un deudor X; `n0 = SIM_VERSIONS[id].length`. El disparador que deja de gatillar SÍ existe en la UI, sin sustituto: en Negocio › Detalle, vista plana `button[title^="Todas las facturas en una sola lista"]` → `button[title="Retirar esta factura de la oferta"]` de TODAS las facturas del deudor X → «Re-evaluar operación» (la regla D de X ya no tiene sujeto en la versión N = n0 + 1).
- **Pasos**: 1) retirar las facturas de X y re-evaluar; 2) tab «Otorgamiento»: leer la fila del criterio de X; 3) `h.irA("Tareas")` en el tubo y buscar la tarea del aprobador por el id de la operación; 4) MN-07 a ADMIN en el detalle → tab «Mensajería» → el hilo de la excepción; 5) `evaluate`: `repoVisado.get(id)[stKey]`, `SOLICITUD_EXC[id][stKey]` y la última auditoría de la operación.
- **Resultado esperado**: la fila del criterio de X ya no está pendiente y muestra la excepción anterior con el rótulo «ya no aplica desde la versión N» (N = n0 + 1), sin botón «Aprobar excepción»; la tarea aparece cerrada con ese motivo; el hilo tiene un mensaje del sistema con la versión; el repositorio conserva la entrada con `desdeVersion: N` y `por: "sistema"`; la auditoría tiene la fila. Nada se borró: `SOLICITUD_EXC[id][stKey]` existe.
- **Esbozo e2e**: id `e2e-HU-32-a` · archivo `31_otorgamiento_visado.e2e.mjs` · el `button` del tab «Otorgamiento», `button[title="Retirar esta factura de la oferta"]`, `h.irA("Tareas")` · `finally`: `sel.selectOption(usuario0)`, MN-10 (incluye `pc_repo_otorgamiento_visado` y la solicitud en `SOLICITUD_EXC`).

### CP-125 · Si una versión posterior vuelve a levantar la misma excepción, se abre una solicitud nueva y la marcada no se reactiva
- **Criterio**: CA-3 de HU-32 (ADR-0016: «si una versión posterior vuelve a levantar la misma excepción, se abre una solicitud nueva: la marcada no se reactiva») · **Dirección**: negativa (la marcada sigue «ya no aplica») y positiva (existe una solicitud nueva) · **Capa**: suite. · **Cobertura actual**: caso **166** (la versión que vuelve a levantar C07 y D19 los deja pendientes otra vez; la solicitud marcada no justifica —`excepcionesSinComentario` la lista— ni se reactiva; la solicitud nueva anota su versión y lleva la anterior en `anteriores`; la re-evaluación siguiente la marca de nuevo), implementado el 23-09-2026.
- **Precondición**: el estado final de CP-087 (la excepción marcada desde la versión N) y una re-evaluación con las variables que vuelven a gatillar el criterio (versión N + 1). Cómo conviven dos entradas bajo la clave estable `dealId + stKey` (historial por clave, o la versión como parte de la clave) lo define la implementación; el caso asierta que son dos y distinguibles. La implementación eligió la historia por clave: la solicitud vigente lleva `anteriores` y el detalle del visado nuevo hereda la del marcado.
- **Pasos**: 1) re-evaluar; 2) leer las entradas por `stKey`; 3) leer la bandeja del apoderado.
- **Resultado esperado**: la entrada marcada conserva «ya no aplica desde la versión N»; hay una solicitud nueva, pendiente, con su propia fecha y `desdeVersion: N + 1` como origen; la bandeja del apoderado la muestra una sola vez; el visado anterior no vuelve a «aprobado».

## HU-33 · Registrar el contacto con el checklist por factura

### CP-089 · Tres checks y fecha habilitan «Registrar verificación» y la factura pasa a «verificada»
- **Criterio**: CA-1 de HU-33 · **Dirección**: positiva · **Capa**: e2e + suite. · **Cobertura actual**: **caso 157** (suite). En pantalla **NUEVO**: `DrawerVerificacion` no tiene e2e.
- **Precondición**: autocontenida —MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible», `h.irA("Verificación")`— porque la mesa NO queda poblada tras CP-046: su `finally` (MN-10) apaga el Directorio y restaura los repos, y `correr.mjs` cierra las pestañas extra tras cada caso (así lo hacen `10_12_bis` y `21_29`). Alternativa: el archivo 31 encadena CP-046 → 089 → 090 → 091 en un caso con un solo `finally`. Luego MN-07 en el tubo eligiendo por `USERS` el Ejecutivo de verificación (regla 18).
- **Pasos**: 1) `button[title="El deudor confirmó ESTE documento"]` de una factura; 2) en el panel «Registrar verificación telefónica», marcar «Existencia de la factura», «Recepción conforme», «Fecha de pago» y llenar la fecha comprometida; 3) `button` «Registrar verificación»; 4) leer el estado de la fila.
- **Resultado esperado**: el botón pasa de `disabled` a habilitado sólo con los tres checks + fecha (en `DrawerVerificacion`, sobre el estado `chk`: `completo = chk.existencia && chk.recepcion && chk.fechaPago && !!compromiso`); la fila dice «verificada»; `repoVerifTel.get(dealId)` por `evaluate` (clave real `pc_repo_verificacion_telefonica`, `crearRepo("verificacion_telefonica")`, indexada por `deal.id` bajo el tenant y no por folio: `repoVerifTel.set(fila.deal.id, m)`) contiene para ese folio un registro con la forma `{ por, fecha, checklist: { existencia, recepcion, fechaPago }, contacto, compromiso, respaldo, sinRespaldo, notas }`: los tres booleanos van ANIDADOS en `checklist` (el panel devuelve `checklist: chk` en `onConfirmar` y `verificarDeudor` copia `llamada.checklist` al registro `reg`, que se guarda como `m[f.id] = { por, fecha, ...reg }`), así que el paso 4 lee `m[folio].checklist.existencia`, `.recepcion`, `.fechaPago` y `m[folio].compromiso` (regla 53, caso 157).
- **Esbozo e2e**: id `e2e-53-a` · archivo `32_verificacion_mesa.e2e.mjs` · `h.encenderDirectorio`, `h.irA("Verificación")`, `button[title="Cerrar"]` · `finally`: `sel.selectOption(usuario0)`, MN-10.

### CP-090 · Con un check sin marcar el botón sigue deshabilitado
- **Criterio**: CA-2 de HU-33 · **Dirección**: negativa · **Capa**: e2e. · **Cobertura actual**: NUEVO.
- **Precondición**: la misma cadena que CP-089, rehecha en este caso (MN-01 «Sin línea» → MN-03 → `h.irA("Verificación")` → MN-07 al Ejecutivo de verificación) y el panel abierto con `button[title="El deudor confirmó ESTE documento"]`; el estado de CP-089 no sobrevive a su `finally`. · **Pasos**: 1) marcar dos checks y la fecha; 2) leer `disabled`; 3) marcar los tres sin fecha; 4) leer.
- **Resultado esperado**: `disabled` en los dos intentos.
- **Esbozo e2e**: id `e2e-53-b` · mismo archivo · `finally`: `button[title="Cerrar"]`, `sel.selectOption(usuario0)`, `h.apagarDirectorio()`.

### CP-091 · «No verificar» → «Marcar no verificada»: desde el 23-09-2026 (ADR-0018, regla 67) la factura SIGUE en la oferta, marcada y vetada, con el issue y el aviso; antes salía de la oferta
- **Criterio**: CA-3 de HU-33 · **Dirección**: positiva (el retiro ocurre) y negativa (no se puede volver a agregar) · **Capa**: e2e + suite. · **Cobertura actual**: **casos 21 y 25** (retirar la no confirmada baja el cursable; queda vetada) en la suite fijan lo de HOY. En pantalla **NUEVO**. **Vigente hoy · cambia con ADR-0018: pasa a la dirección contraria** — el mismo id `e2e-6-b` se escribe primero fijando lo vigente (paso 1 del orden sugerido) y se da vuelta en el commit de ADR-0018 con la aserción de CP-138 (la factura sigue en la oferta, el issue, ninguna versión) y CP-139 (el aviso); la mitad «no se puede volver a agregar» sobrevive tal cual en CP-141, porque el veto lo pone el retiro del ejecutivo.
- **Precondición**: la misma cadena que CP-089, rehecha en este caso (MN-01 «Sin línea» → MN-03 → `h.irA("Verificación")` → MN-07 al Ejecutivo de verificación).
- **Pasos**: 1) `button` «No verificar» de la fila (`title` «El deudor NO reconoció este documento: se retira de la oferta y queda vetado»; con ADR-0018 el `title` deja de prometer el retiro y el caso lo lee por rol); 2) panel «Registrar que el deudor NO confirmó» → motivo y contacto → `button` «Retirar y vetar» (hoy; el rótulo con ADR-0018 lo fija la implementación); 3) leer la fila en la mesa; 4) abrir la operación por `button[title="Abrir la operación"]`; 5) leer «Documentos en la oferta» y el estado de re-evaluación; 6) buscar el folio en «Documentos disponibles».
- **Resultado esperado (hoy)**: fila tachada «no verificada» en la mesa (regla 53); el folio ya no está en la oferta; «Re-evaluar operación» exigido; el folio no aparece con «Agregar a la simulación» habilitado (vetado, regla 1). **Con ADR-0018**: fila tachada igual; el folio SIGUE en «Documentos en la oferta»; el detalle muestra el issue «facturas no verificadas: no se puede cursar»; ninguna versión nueva (CP-138); el paso 6 pasa a CP-141, después del retiro del ejecutivo.
- **Esbozo e2e**: id `e2e-6-b` (el sufijo sigue a `e2e-6-a` de CP-046: los ids `e2e-<regla>` llevan sufijos consecutivos por dirección, como `e2e-14-a/b/c`) · mismo archivo · `finally`: `sel.selectOption(usuario0)`, MN-10 (el veto persiste en `pc_repo_factura_no_confirmada`: restaurar la foto).

### CP-092 · Una sesión que no es Ejecutivo de verificación no puede firmar
- **Criterio**: CA-4 de HU-33 · **Dirección**: negativa · **Capa**: suite + e2e. · **Cobertura actual**: **caso 33** (suite). En pantalla **NUEVO**.
- **Precondición**: autocontenida —MN-01 «Sin línea» fila 0, MN-03, `h.irA("Verificación")`— con la sesión inicial (ejecutivo comercial), sin MN-07. · **Pasos**: 1) contar `button[title="El deudor confirmó ESTE documento"]` y `button[title^="El deudor NO reconoció"]`; 2) leer el texto de la fila.
- **Resultado esperado**: cero botones (dirección «cero»): con la sesión inicial `puedeMarcar = puedeVerificarFacturas(SESION.usuario)` es falso y la mesa muestra en su lugar el texto «Sólo el Ejecutivo de verificación puede marcarla» (regla 18).
- **Esbozo e2e**: id `e2e-18` · mismo archivo · `finally`, en este orden (MN-10 mínimo): `det.close()` si MN-03 abrió el detalle en pestaña propia (`correr.mjs` cierra las pestañas extra sólo DESPUÉS de cada caso), `h.irA("Gestión diaria")`, `h.apagarDirectorio()` (navega a «Gestión diaria» y apaga el toggle, pero no toca el filtro rápido) y `filtroRapido(h.pagina, "Con línea")`: la precondición deja «Sin línea» y `correr.mjs` sólo reinicia el filtro entre archivos; CP-089/090/091 del mismo archivo también parten de «Sin línea» y lo restauran vía MN-10.

## HU-34 · Una factura verificada no se vuelve a pedir, y su clave estable es el versionado (definición ajustada 22-09-2026, G-13 cerrado)

### CP-093 · La llamada sobrevive a la re-evaluación y el veredicto congelado mantiene la fila
- **Criterio**: CA-1 de HU-34 · **Capa**: suite · **Cobertura actual**: **caso 55** (veredicto congelado) y **caso 52** (pendiente contra las llamadas registradas). · **Resultado esperado**: la factura sigue «verificada» tras `reevaluarCliente`.

### CP-094 · La verificación vive por factura con clave estable (`repoVerifTel`, `repoVerifVeredicto`); la versión la referencia, no la copia
- **Criterio**: CA-2 de HU-34 (definición ajustada 22-09-2026: la clave estable basta, M-25) · **Capa**: suite · **Cobertura actual**: **implementado (definición ajustada 22-09-2026)** — **caso 55** (veredicto congelado) y **caso 52** (pendiente contra las llamadas registradas); G-13 cerrado. La VERSIÓN de verificación que ADR-0013 exige (CP-034, CP-122) congela la DECISIÓN del motor —qué deudores van a teléfono—, no la llamada registrada, que sigue por clave estable. · **Resultado esperado**: tras `reevaluarCliente` y una versión nueva, `repoVerifTel.get(dealId)[folio]` sigue siendo la única fuente del estado de la factura y ninguna versión lleva una copia.

## HU-42 · La verificación fallida marca la operación con un issue y avisa; el ejecutivo retira, re-simula y vuelve a publicar (M-18 en la verificación: decidida el 23-09-2026, ADR-0018)

Una sola lectura desde el 23-09-2026: marcar «no verificada» **no retira** —deja el issue «facturas no verificadas: no se
puede cursar» (VER-01 sigue mandando) y el sistema avisa al ejecutivo comercial por Mensajería—; el **ejecutivo** retira
las facturas del deudor, re-simula (evento de ADR-0013, con versión) y vuelve a publicar, lo que revoca la firma (regla 1)
para que el cliente firme la nueva operación; las retiradas quedan vetadas. Difiere del comité (HU-35, ADR-0015) sólo en
quién retira. CP-129 fija lo que el sistema hace hoy y se da vuelta; CP-130 quedó sin caso; CP-131 vale hoy y con el
ADR; CP-132 es NUEVO (su mitad de la pérdida —retirar la última pierde con causa— vale hoy y con el ADR; su mitad de la
marca —marcar no pierde— nace con ADR-0018); CP-138 … CP-142 son los casos nuevos. La precondición común es lograble con el harness: MN-01, MN-03, MN-04,
MN-05 (la firmada), `h.irA("Verificación")` y MN-07 al Ejecutivo de verificación elegido por `USERS` (regla 18), la mesa
`VerificacionView` y su panel lateral `DrawerVerificacion`; para el aviso, MN-07 al ejecutivo comercial de la operación y
el tab «Mensajería» del detalle.

### CP-129 · «No verificar» sobre la firmada NO encoge ni retira desde el 23-09-2026 (ADR-0018, regla 67): la etapa y la firma siguen, la operación queda con el issue
- **Criterio**: CA-1 de HU-42 (la dirección que ADR-0018 invierte) · **Dirección**: hoy positiva (el retiro pasa al marcar) y negativa (nada se reabre) · **Capa**: suite. · **Cobertura actual**: **casos 21–23** (regla 13), cubierto del todo para lo de HOY: es la aserción de CP-119 antes del ADR y remite a ella. **Vigente hoy · cambia con ADR-0018: pasa a la dirección contraria** — con el ADR la marca no retira nada (CP-138) y quien encoge la operación es el ejecutivo, cuya republicación revoca la firma (CP-140); los casos 21–23 se re-anclan al retiro del ejecutivo en el commit del ADR.
- **Precondición**: la de CP-119 (`clienteAcepto: true`, `paqueteCerrado`, `n0`). · **Pasos**: hoy, marcar por nombre (`verificarDeudor` con la factura fuera de las confirmadas, o `marcarFactura` con «no verificada») y leer `facturasOp`, `SIM_VERSIONS[id]`, `stage`, `reabierta` y `aprobacionFormalCliente(deal)`.
- **Resultado esperado (hoy)**: el folio sale, una versión más que sólo encoge, `stage` sin cambio, `reabierta` ausente y `aprobacionFormalCliente` verdadera. **Con ADR-0018**: `facturasOp` y `SIM_VERSIONS[id].length` sin cambio, `stage` sin cambio, `aprobacionFormalCliente` verdadera hasta que el ejecutivo vuelva a publicar (CP-138); la versión que encoge y la firma revocada llegan con el retiro y la republicación del ejecutivo (CP-140).

### CP-130 · (sin caso: lectura descartada el 23-09-2026)
- La lectura «el retiro automático por `noConfirmada` revoca la firma y devuelve la operación a Negociación» —aplicar ADR-0015 tal cual a la verificación— quedó descartada por ADR-0018: la marca no retira ni reabre; la decisión de qué sacar y si vale la pena seguir es del ejecutivo, y el aviso es lo que la gatilla. Lo que de esa lectura sobrevive —la firma revocada, `stage: "oferta"`, `reabierta`— vive en CP-140 como efecto de la republicación del ejecutivo. El id no se reutiliza.

### CP-131 · La factura marcada sigue tachada en la mesa con su veredicto, antes y después del retiro del ejecutivo (vale hoy y con ADR-0018)
- **Criterio**: CA-6 de HU-42 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **casos 21, 25 y 157** (suite; regla 6): cubierto del todo en el motor y no cambia con el ADR. En pantalla es la aserción de la mesa en CP-091 / CP-138 (`e2e-6-b`), que no se duplica.
- **Precondición**: la factura marcada «no verificada» (CP-138) y luego retirada por el ejecutivo (CP-140). · **Pasos**: 1) leer la mesa del deudor (`verifDecision` sobre la versión vigente y `repoVerifVeredicto`) después de la marca; 2) releer después del retiro; 3) leer la marca de re-simulación del detalle tras el retiro.
- **Resultado esperado**: la fila sigue con su veredicto «no verificada», tachada, en los dos momentos; el veredicto congelado del deudor no cambia (`congelarVeredicto`); tras el retiro el detalle exige re-simular antes de publicar (regla 6, caso 157).

### CP-132 · El ejecutivo que retira la última factura de la firmada pierde la operación con causa; marcarla «no verificada» NO la pierde (vale hoy y con ADR-0018 en la pérdida; la marca es la dirección nueva)
- **Criterio**: CA-7 de HU-42 · **Dirección**: negativa (la marca no pierde) y positiva (el retiro de la última pierde con causa) · **Capa**: suite. · **Cobertura actual**: NUEVO. CP-026 fija que retirar la última vacía la oferta ANTES de la firma; sobre la firmada ningún caso ejerce la pérdida por retiro (los casos 117–118 fijan la pérdida manual). Hoy el retiro de la última lo hace el sistema al marcar y escribe `perdidaPor: "sistema"` (`spec-ciclo-factura.md` §14); con ADR-0018 lo hace el ejecutivo.
- **Precondición**: deal firmado cuya oferta tiene una sola factura, marcada «no verificada» (sin retiro). · **Pasos**: 1) leer `stage` tras la marca; 2) retirar como ejecutivo (`retirarFacturaOferta(id, f, "noConfirmada")`); 3) leer `stage`, `perdidaPor`, `causaPerdidaDeal(deal, estado)`, la etapa de origen y las tareas.
- **Resultado esperado**: paso 1: `stage` sin cambio, la operación con el issue y sin `perdidaPor` (la marca no pierde: hoy falla, porque la marca retira y la oferta queda en cero); paso 3: `stage: "perdida"`, causa específica de la regla 5 (la oferta quedó en cero tras el retiro por verificación), etapa de origen, el actor que retiró (con ADR-0018 el ejecutivo; hoy `perdidaPor: "sistema"`), tareas cerradas; ninguna nueva firma que pedir.

### CP-138 · Marcar «no verificada» en la mesa NO retira: la factura sigue en la oferta, no hay versión, la firma sigue; la operación muestra el issue y VER-01 bloquea
- **Criterio**: CA-1 de HU-42 · **Dirección**: negativa (el control bloquea el retiro: `facturasOp` y las versiones no cambian) y positiva (el issue existe y VER-01 lo nombra) · **Capa**: e2e + suite. · **Cobertura actual**: suite: caso **167** (el resumen y `issueVerificacion` nombran la marcada que sigue en la oferta, VER-01 la cuenta y dice qué hacer) y `regla_67.test.mjs` (los tres caminos de la mesa y el diálogo marcan sin retirar ni versionar), implementado el 23-09-2026 (ADR-0018, regla 67, G-36). En pantalla sigue NUEVO.
- **Precondición**: MN-01 «Sin línea» fila 0 (deja un deudor por verificar, `e2e-15-bis-bis-a`), MN-02, MN-03 «Todo lo disponible», MN-04, MN-05 (la firmada: cabecera «Otorgamiento / Verificación», `e2e-55`); `neg` de la URL de `email.html`; `n0 = SIM_VERSIONS[id].length` y `fo0 = facturasOp` por `evaluate`; `h.irA("Verificación")` (h1 «Mesa de verificación», la operación por su N°); MN-07 en el tubo al Ejecutivo de verificación elegido por `USERS` (regla 18). Encadenado con CP-139 … CP-141 en un solo caso con un solo `finally` (la firmada no sobrevive a MN-10).
- **Pasos**: 1) `button` «No verificar» de una factura del deudor X (hoy con `title` «El deudor NO reconoció este documento: se retira de la oferta y queda vetado»; con ADR-0018 el `title` ya no promete el retiro: el caso lo localiza por rol y texto dentro de la fila); 2) panel lateral «Registrar que el deudor NO confirmó» → motivo (`MOTIVOS_NO_VERIF`), contacto, respaldo o «sin respaldo» → el botón de confirmación del panel (hoy «Retirar y vetar»; el rótulo con ADR-0018 lo fija la implementación y el caso lo lee como el único `button` habilitado del pie del panel); 3) leer la fila en la mesa; 4) abrir la operación por `button[title="Abrir la operación"]` (pestaña propia, MN-02); 5) leer «Documentos en la oferta» y el issue de la cabecera / del bloque de pendientes; 6) `evaluate`: `SIM_VERSIONS[id].length`, `facturasOp`, `stage`, `aprobacionFormalCliente(deal)`, `verifResumenDeal(deal).pend`, `controlesIntegracion(deal)` y la última fila de auditoría de la operación.
- **Resultado esperado**: fila tachada «no verificada» con su veredicto (regla 53); el folio SIGUE en «Documentos en la oferta» (conteo y monto iguales a los de antes); el detalle muestra el issue «facturas no verificadas: no se puede cursar» con el deudor X y sus folios; `SIM_VERSIONS[id].length === n0`; `facturasOp` igual a `fo0`; `stage` sin cambio (sigue «Otorgamiento / Verificación»); `aprobacionFormalCliente` verdadera; `verifResumenDeal(deal).pend > 0` y `controlesIntegracion(deal)` nombra VER-01 (regla 41); auditoría «Deudor NO confirmó» con actor y hora y sin «facturas retiradas». La suite ejerce lo mismo por nombre: `marcarFactura` / `verificarDeudor` / `noConfirmoDeudor` con la decisión «no verificada» dejan `facturasOp` y `SIM_VERSIONS` intactos y `verifResumenDeal(deal).pend > 0`.
- **Esbozo e2e**: id `e2e-HU-42-a` · archivo `38_verificacion_fallida.e2e.mjs` · MN-04, MN-05, `h.irA("Verificación")`, MN-07, `button` «No verificar», `button[title="Abrir la operación"]`, `evaluate` · `finally`: `sel.selectOption(usuario0)`, MN-10 completo (repos —incluido `pc_repo_factura_no_confirmada`—, solicitud y `SOLIC_SEQ`, `fs_curse_<neg>`, sesión, Directorio).

### CP-139 · El aviso al ejecutivo comercial llega a Mensajería: facturas, deudor y «no se cursará mientras sigan en la oferta»
- **Criterio**: CA-2 de HU-42 · **Dirección**: positiva (el hilo existe tras la marca) y negativa (sin marca no hay hilo) · **Capa**: e2e + suite. · **Cobertura actual**: suite: caso **167** (`avisarNoVerificadas`: remitente el sistema, destinatario `deal.exec`, la operación, el deudor, cada folio y «no se podrá cursar»; se reusa; calla sin marcadas), implementado el 23-09-2026 (ADR-0018 punto 2, G-36). En pantalla sigue NUEVO. El molde del hilo del sistema es el «Cierre de negocio · <id>» de la firma (regla 50, caso 154, `regla_aviso_cierre.test.mjs`).
- **Precondición**: el estado de CP-138 (encadenado); `h0 = hilosDeDeal(id).length` leído por `evaluate` ANTES de marcar; el ejecutivo comercial de la operación es `deal.exec`, y su código se elige por `USERS` (regla 4: nunca fijo).
- **Pasos**: 1) en la pestaña del detalle, MN-07 al ejecutivo comercial de la operación (`select[title="Sesión de usuario (sólo demo)"]`); 2) tab «Mensajería» (el `button` del tab, como los otros tabs del detalle); 3) leer el hilo más reciente: asunto, remitente, cuerpo; 4) `evaluate`: `hilosDeDeal(id)` y `repoHilos`; 5) en la suite, marcar por nombre y contar hilos; contraste: una marca «verificada» (CP-089) no abre hilo.
- **Resultado esperado**: `hilosDeDeal(id).length === h0 + 1`; el hilo nuevo tiene remitente el sistema, destinatario el ejecutivo comercial de la operación, y su texto nombra la operación, el deudor X, los folios marcados y que «no se podrá cursar mientras sigan en la oferta» (el texto exacto lo fija la implementación; el caso exige el N° de operación, el deudor y cada folio); la campana de la cabecera del tubo lo cuenta para ese ejecutivo; sin marca, `h0`.
- **Esbozo e2e**: id `e2e-HU-42-b` · mismo archivo · MN-07 en el detalle, el tab «Mensajería», `evaluate(() => hilosDeDeal(id))` · `finally`: el de CP-138.

### CP-140 · El ejecutivo retira las facturas del deudor no verificado, re-simula y vuelve a publicar: versión nueva que sólo encoge, firma revocada, el cliente firma de nuevo y el issue desaparece
- **Criterio**: CA-3 y CA-4 de HU-42 · **Dirección**: positiva (retiro, versión, republicación, nueva firma) y negativa (las facturas del otro deudor no se tocan; la firma anterior deja de valer) · **Capa**: e2e + suite. · **Cobertura actual**: la implementación (23-09-2026, regla 67) eligió el camino ordinario: el ejecutivo pasa por «Editar la oferta» (reabre y revoca la firma, CP-080), retira (el retiro ya no lleva motivo ni recorta), re-simula (la versión nueva sale de la simulación) y vuelve a publicar; nada de eso es nuevo en el motor —lo fijan los casos 24 y 26 y la regla 33—, así que en la suite no hay caso propio. En pantalla sigue NUEVO. Moldes: casos 22 y 23 (`recortarAsignacion`, la versión que encoge), 24 y 26 (la firma revocada por `reabierta` y restituida por la nueva firma), CP-080 (la reapertura en pantalla) y CP-096 (el camino gemelo del comité).
- **Precondición**: el estado de CP-138 / CP-139 (encadenado); MN-07 de vuelta al ejecutivo comercial de la operación en la pestaña del detalle; `n1 = SIM_VERSIONS[id].length`, los folios del deudor X y los del deudor con línea Y.
- **Pasos**: 1) en Negocio › Detalle, vista plana `button[title^="Todas las facturas en una sola lista"]` → `button[title="Retirar esta factura de la oferta"]` de cada factura de X → confirmar (sobre la firmada la guarda de sólo lectura, regla 33, deja pasar la marcada «no verificada»: es la excepción de la regla); 2) leer «Documentos en la oferta» / «Documentos disponibles» y el issue; 3) el gesto de re-simular («Re-evaluar operación» / «Simular la oferta», el evento de ADR-0013) → `SIM_VERSIONS[id]`; 4) MN-04 (volver a publicar; si la implementación exige pasar antes por «Editar la oferta» → «Reabrir operación», CP-080, el caso lo hace y lo dice) → leer la cabecera, `reabierta`, `aprobacionFormalCliente(deal)` y la fila del tubo; 5) MN-05 (la nueva firma) → cabecera y tubo; 6) MN-07 a ADMIN → tab «Mensajería»: el hilo «Cierre de negocio · <id>».
- **Resultado esperado**: paso 2: los folios de X en «Documentos disponibles» con el motivo de veto y sin botón de agregar habilitado (CP-141); los de Y siguen en la oferta; el issue ya no nombra a X; paso 3: `SIM_VERSIONS[id].length === n1 + 1` y la `linea` de la nueva versión sólo encoge respecto de la firmada (ninguna factura nueva en `CON_LINEA`, `cursable` ≤ el anterior; `reservado` no sube, regla 12); paso 4: la firma anterior revocada —`reabierta` con `ts`, `aprobacionFormalCliente` falsa (regla 1)—, la cabecera «Oferta y Negociación» → «Oferta publicada» y el tubo «Negociación» → «Oferta publicada» (regla 58), sin issue; paso 5: la cabecera vuelve a lo que `etapaTrasFirma` decida (regla 26) y `aprobacionFormalCliente` verdadera; paso 6: el hilo tiene la segunda firma (regla 50). Suite: sobre el deal de CP-119, `retirarFacturaOferta(id, f, "noConfirmada")` por el ejecutivo pasa y emite versión; el evento de evaluación emite otra; volver a publicar (`cerrarOferta` sobre la operación con la firma revocada) deja `reabierta` y `aprobacionFormalCliente` falsa hasta `confirmarCierre`.
- **Esbozo e2e**: id `e2e-HU-42-c` · mismo archivo · vista plana, `button[title="Retirar esta factura de la oferta"]`, MN-04, MN-05, `esperarEtapa` · `finally`: el de CP-138.

### CP-141 · La factura retirada por este motivo no se puede volver a incorporar: «Agregar a la simulación» no está habilitado y el motivo es el veto
- **Criterio**: CA-5 de HU-42 · **Dirección**: negativa (no entra) y positiva (una factura del pool sin veto sí entra) · **Capa**: e2e + suite. · **Cobertura actual**: parcial — **casos 25, 95 y 167** (la no confirmada queda vetada y no vuelve a entrar; `estadoCandidata` bloqueado con el veto inyectado) en la suite fijan el veto; en pantalla es la mitad de CP-091 que sobrevive al ADR y se mueve aquí: **NUEVO** en pantalla. La implementación pone el veto con la MARCA —es el hecho de la llamada—; el retiro del ejecutivo sólo la saca de la oferta.
- **Precondición**: el estado de CP-140 tras el paso 2 (los folios de X en «Documentos disponibles»).
- **Pasos**: 1) localizar cada folio de X en «Documentos disponibles» y leer su botón de agregar (`button[disabled]` cuyo `title` es el rótulo de `estadoCandidata`, `est.label`, seguido de su detalle: cuando la factura está bloqueada el `title` ya NO es «Agregar a la simulación», CP-008); 2) contraste: un folio del pool sin veto tiene `button[title="Agregar a la simulación"]:not([disabled])`; 3) `evaluate`: `estadoCandidata(f)` y `repoNoConfirmadas.get(id)` (clave real `pc_repo_factura_no_confirmada`, regla 6); 4) suite: `incorporarFacturasOferta` con el folio vetado.
- **Resultado esperado**: el botón de cada folio de X está `disabled` con el rótulo de veto de verificación en su `title`; `estadoCandidata` devuelve `noConfirmada` (el primero de la cadena de bloqueos, §6 del spec de curse); el folio está en `repoNoConfirmadas`; `incorporarFacturasOferta` devuelve negativa y `facturasOp` no cambia; ninguna versión posterior lo contiene (regla 1). El folio sin veto sí entra.
- **Esbozo e2e**: id `e2e-HU-42-d` · mismo archivo · `evaluate(() => repoNoConfirmadas.get(id))` · `finally`: el de CP-138.

### CP-142 · El botón del tab Verificación del detalle tampoco retira: «El deudor no confirmó · retirar» pasa a marcar y dejar el issue
- **Criterio**: CA-1 de HU-42 (el segundo sitio: el detalle; ADR-0018 nombra «la mesa y el detalle») · **Dirección**: negativa (no retira) · **Capa**: e2e. · **Cobertura actual**: NUEVO en pantalla; la conducta está implementada el 23-09-2026 (regla 67): el botón dice «El deudor no confirmó · marcar», el diálogo confirma con «Marcar no verificada» y llama a `onMarcarNoVerificada` (lo fija `regla_67.test.mjs`).
- **Precondición**: MN-01 «Sin línea» fila 0, MN-02, MN-03 «Todo lo disponible», MN-04, MN-05 (firmada), en la pestaña del detalle MN-07 al Ejecutivo de verificación (`puedeMarcar` exige `puedeVerificarFacturas`, regla 18); `n0 = SIM_VERSIONS[id].length`, `fo0 = facturasOp`.
- **Pasos**: 1) tab «Verificación» (el `button` del tab, con el badge de pendientes); 2) en la factura pendiente del deudor X, el `button` «El deudor no confirmó · retirar» (con ADR-0018 el rótulo deja de decir «retirar»: el caso lo localiza por rol dentro de la fila del deudor y reporta el texto); 3) el diálogo → confirmar (hoy «Retirar factura no confirmada»; el rótulo nuevo lo fija la implementación); 4) leer «Documentos en la oferta», el issue y `evaluate`: `SIM_VERSIONS[id].length`, `facturasOp`, `verifResumenDeal(deal).pend`.
- **Resultado esperado**: el folio sigue en la oferta (`facturasOp` igual a `fo0`), `SIM_VERSIONS[id].length === n0`, el issue «facturas no verificadas: no se puede cursar» visible, `verifResumenDeal(deal).pend > 0`; el rótulo del botón y del diálogo ya no prometen retirar; el retiro es el gesto del ejecutivo (CP-140).
- **Esbozo e2e**: id `e2e-HU-42-e` · mismo archivo · MN-07 en el detalle, el `button` del tab «Verificación», `ConfirmDialog` · `finally`: `sel.selectOption(usuario0)`, MN-10 completo.

---

## HU-35 · El comité de crédito que rechaza retira las facturas del deudor y reabre la operación (D4 cerrada el 22-09-2026: retirar Y reabrir, ADR-0015)

### CP-095 · La bandeja lista «Rechazada»
- **Criterio**: CA-1 de HU-35 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: suite: caso **165** (la API 3 resuelve «Rechazada» por línea de detalle —residuo 1 de `hashStr(idProceso)`— con observación y sin constituir), implementado el 23-09-2026 (ADR-0015 punto 1, G-33: «este es el comité de crédito, que opera fuera de la plataforma y da la aceptación o el rechazo»); la fila de la bandeja en pantalla sigue NUEVO (e2e). El caso 125 eligió sus ids por el desenlace y ahora conoce los tres.
- **Precondición**: solicitud inyectada en el caso con `recibirSolicitudLinea` por `evaluate` (molde `18_15_quinquies`; no `e2e-15-bis-bis-a`, cuyo `finally` la retira). El comité real no es alcanzable y **plantar el string no sirve**: «Consultar estados» llama `api3EstadoProceso`, que SOBREESCRIBE `s.estado` con `SEQ[min(3, s.refrescos)]` y decide el fin por `hashStr(idProceso)` (caso 125), así que un `estado: "Rechazada"` forzado se pierde en el siguiente clic. Cuando G-33 agregue la rama «Rechazada» a la API 3, el caso elige un `idProceso` cuyo `hashStr` caiga en ella y pone `s.refrescos = 3` (o pulsa «Consultar estados» tres veces), como CP-098. Si sólo se quiere la bandeja, se aserta SIN pulsar «Consultar estados».
- **Pasos**: 1) inyectar con el `idProceso` elegido y `refrescos = 3`; 2) `h.irA("Líneas")` → «Solicitudes» → «Consultar estados»; 3) leer la fila.
- **Resultado esperado**: estado «Rechazada»; en Vigentes la línea deja de decir «Solicitud en curso».
- **Esbozo e2e**: id `e2e-15-b` (la regla 15 ya tiene `e2e-15` sin sufijo en `16_15.e2e.mjs`; el nuevo toma `-b` y el existente se renombra a `-a` sólo en un commit que toque también ese archivo y la fila 15 de `invariantes.md`) · archivo `35_comite_resolucion.e2e.mjs` · `finally`: retirar el registro, `_cacheCli`, MN-10.

### CP-096 · El rechazo retira las facturas del deudor sin línea, emite versión con motivo `comite_rechazo` y REABRE la operación revocando la firma; en cero, pérdida
- **Criterio**: CA-2 y CA-3 de HU-35, fundidos por la decisión (D4 cerrada el 22-09-2026: retirar Y reabrir, ADR-0015) · **Dirección**: positiva (retiro, versión, reapertura) y negativa (no re-asigna contra el estado nuevo; ninguna factura del deudor con línea se toca) · **Capa**: suite. · **Cobertura actual**: caso **165** (`rechazoComiteDecision`: retira s1, quedan c1 y c2, versión 2 con `comite_rechazo` que sólo encoge, vuelve a Oferta con `reabierta` y `aprobacionFormalCliente` falsa, paquete editable; en cero, `committee_reject`) y `regla_65.test.mjs` (`aplicarRechazoComite` escribe la versión, parchea o pierde), implementados el 23-09-2026 (ADR-0015 puntos 2 y 3; G-19). Los casos 22 y 23 fueron el molde de `recortarAsignacion`; el 24, el de la firma revocada. Descartado encoger sin nueva firma: «el cliente firmó un paquete que ya no es el que se va a cursar».
- **Precondición**: deal firmado (`clienteAcepto: true`, en `otorgamiento` o `cesion`) con dos deudores, uno con línea y otro pendiente de comité (`REQUIERE_COMITE`, solicitud inyectada); el manejador del rechazo alcanzable por nombre con un estado «Rechazada» de la API 3 sobre esa línea de detalle; `n0 = SIM_VERSIONS[id].length`.
- **Pasos**: 1) aplicar el rechazo; 2) leer `facturasOp`, `SIM_VERSIONS[id]`, `stage`, `reabierta`, `aprobacionFormalCliente(deal)` y la bitácora; 3) repetir sobre un deal cuyo único deudor era el pendiente.
- **Resultado esperado**: paso 2: sólo las facturas del deudor sin línea salen de `facturasOp` (vuelven a «Documentos disponibles» con el motivo); versión `n0 + 1` con motivo `comite_rechazo` y `linea` que sólo encoge; `stage: "oferta"`, `reabierta` con `ts` y la reserva de la versión aceptada (regla 12), `aprobacionFormalCliente` falsa (regla 1) y la oferta editable como tras «Editar la oferta» (`edicionOperacion`, CP-080) para que el ejecutivo vuelva a publicar; bitácora «Línea rechazada por el comité · N factura(s) retiradas · la operación se reabre para una nueva firma». Paso 3: `stage: "perdida"` con causa específica «línea rechazada por el comité» (`causaPerdidaDeal`, regla 5), `perdidaPor: "sistema"`, tareas cerradas.

### CP-097 · (sin caso: lectura descartada el 22-09-2026)
- La lectura D4-B sola —volver a «Negociación» revocando la firma SIN retirar las facturas— quedó descartada por ADR-0015; su aserción (la firma se revoca, `stage: "oferta"`, `reabierta`) vive dentro de CP-096 y CP-126 junto al retiro. El id no se reutiliza.

### CP-098 · «Aprobada» constituye la línea y la bitácora lo dice
- **Criterio**: CA-5 de HU-35 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **caso 150** y **caso 125** (suite). En pantalla **NUEVO**: `e2e-15` sólo llega a «Solicitud en curso».
- **Precondición**: solicitud inyectada como en CP-095. Llamar `api3EstadoProceso(id)` N veces NO avanza: la API lee `s.refrescos` sin incrementarlo; quien lo incrementa es el handler «Consultar estados» de la bandeja (`onRefrescar`: `s.refrescos = (s.refrescos || 0) + 1` antes de consultar). Se avanza pulsando «Consultar estados» tres veces, o poniendo `s.refrescos = 3` por `evaluate` y pulsando una vez (si `hashStr(idProceso)` la deja en «Observada», el caso lo reporta y elige otro id).
- **Pasos**: 1) avanzar por «Consultar estados» ×3 (o `refrescos = 3` y ×1); 2) leer la fila; 3) pestaña «Vigentes».
- **Resultado esperado**: fila «Aprobada»; la línea del par aparece en Vigentes con la aprobada = propuesta; auditoría «Línea constituida».
- **Esbozo e2e**: id `e2e-44` · archivo `35_comite_resolucion.e2e.mjs` · `finally`: restaurar `repoLineaComite` (clave real `pc_repo_linea_comite`, `crearRepo("linea_comite")`) con `fotoRepos` / `restaurarRepos` (MN-10) y además retirar de `LINEAS_DATA` la fila que `constituirLinea` insertó (`e2e-15` la retira por `lineaId`) y el registro de `api2ListarProcesos()`.

### CP-133 · «Observada» no retira ni reabre: la operación sigue esperando
- **Criterio**: CA-4 de HU-35 · **Dirección**: negativa (el control no dispara) · **Capa**: suite. · **Cobertura actual**: caso **165** («Observada» y «Aprobada» devuelven `aplica: false`, sin versión, sin retiro ni reapertura; una operación girada tampoco se toca), implementado el 23-09-2026. Es la dirección que bloquea del control de CP-096.
- **Precondición**: el deal firmado de CP-096 con la solicitud en «Observada» (`s.refrescos` en el tramo de `SEQ` que la deja ahí, caso 125); `n0 = SIM_VERSIONS[id].length`.
- **Pasos**: 1) el manejador que «Consultar estados» llama; 2) leer `facturasOp`, `SIM_VERSIONS[id].length`, `stage`, `reabierta` y `aprobacionFormalCliente(deal)`.
- **Resultado esperado**: `facturasOp` intacto; `SIM_VERSIONS[id].length === n0`; `stage` sin cambio; `reabierta` ausente; `aprobacionFormalCliente` verdadera; la fila de la bandeja sigue «Observada».

### CP-126 · En pantalla: el comité rechaza → el tubo vuelve a «Negociación», el detalle marca la reapertura, las facturas del deudor están en «Documentos disponibles» y el cliente puede firmar de nuevo
- **Criterio**: CA-2 de HU-35 (en pantalla; ADR-0015 punto 2, en pantalla y hasta la nueva firma) · **Dirección**: positiva · **Capa**: e2e. · **Cobertura actual**: NUEVO → **decidido: implementar** (ADR-0015, G-19, G-33). Nace en rojo: no existe «Rechazada» ni manejador.
- **Precondición**: MN-01 «Sin línea» fila 0 (dos deudores, uno sin cupo: la solicitud al comité nace sola, `e2e-29-b`), MN-02, MN-03 «Todo lo disponible», MN-04 (inyecta la solicitud: log «Solicitud de línea inyectada», `e2e-15-bis-bis-a`), MN-05 (la firma cruza al tubo: cabecera «Otorgamiento / Verificación», `e2e-55`); `neg` de la URL de `email.html`; `n0 = SIM_VERSIONS[id].length`. **El disparador real es «Consultar estados»** en Líneas › Solicitudes, que hoy nunca rechaza: cuando G-33 agregue la rama, el caso pone `s.refrescos = 3` por `evaluate` sobre el registro de `api2ListarProcesos()` y fuerza el desenlace por el mecanismo que G-33 defina para la demo (hoy es `hashStr(idProceso) % 5`); si el id no cae en «Rechazada», el caso lo dice y aplica el rechazo con el MISMO manejador que la bandeja llama, por `evaluate` —la conducta real del receptor, no una función privada: el argumento de MN-08—. No se usa `nex-simulado`: parchar `stage: "oferta"` a mano probaría el patch, no el manejador.
- **Pasos**: 1) `h.irA("Líneas")` → «Solicitudes» → «Consultar estados»; 2) leer la fila (estado); 3) `esperarEtapa(h.pagina, id, "Negociación")`; 4) en el detalle, la cabecera y el texto de reapertura («Operación reabierta el … el cliente deberá volver a firmar», el sub que `reabierta` agrega); 5) «Documentos disponibles»: los folios del deudor sin línea, con el motivo; «Documentos en la oferta»: sólo los del deudor con línea; 6) `evaluate`: `SIM_VERSIONS[id].length` y el motivo de la última; 7) MN-04 de nuevo (la oferta que queda se publica) y MN-05: la firma nueva.
- **Resultado esperado**: fila «Rechazada»; tubo «Negociación»; detalle «Oferta y Negociación» con la marca de reabierta; los folios repartidos como dice el paso 5; `n0 + 1` versiones con motivo `comite_rechazo`; tras el paso 7 la cabecera vuelve a «Otorgamiento / Verificación» y el hilo «Cierre de negocio · <id>» tiene la segunda firma.
- **Esbozo e2e**: id `e2e-HU-35-a` · archivo `37_comite_rechaza.e2e.mjs` · MN-04, MN-05, `h.irA("Líneas")`, `esperarEtapa` · `finally`: MN-10 completo (repos, solicitud y `SOLIC_SEQ`, `fs_curse_<neg>`, sesión, Directorio).

### CP-127 · En pantalla: si el rechazo deja la oferta en cero, la fila pasa a «Perdida» con la causa «línea rechazada por el comité», sin nueva firma que pedir
- **Criterio**: CA-3 de HU-35 (en pantalla; ADR-0015 punto 3) · **Dirección**: negativa (no se reabre: se pierde) · **Capa**: e2e. · **Cobertura actual**: NUEVO → **decidido: implementar** (ADR-0015, regla 5). Nace en rojo.
- **Precondición**: la cadena de CP-126 pero con una oferta cuyo ÚNICO deudor es el sin cupo: MN-03 «Todo lo disponible» y luego retirar a mano (`button[title="Retirar esta factura de la oferta"]`) las facturas de los deudores con línea antes de MN-04, o MN-01 «Sin línea» con la fila cuyo único deudor está sin cupo (el caso busca entre las dos «Sin línea» y reporta cuál); MN-04, MN-05; el mismo disparador de CP-126.
- **Pasos**: 1) «Consultar estados» con el desenlace «Rechazada»; 2) `esperarEtapa(h.pagina, id, "Perdida")`; 3) la bitácora del detalle; 4) `evaluate`: `perdidaPor`, `causaPerdidaDeal(deal, estado)`.
- **Resultado esperado**: fila «Perdida»; bitácora con la causa específica «línea rechazada por el comité», la etapa de origen y el actor «sistema»; sin badges accionables ni CTA de publicar (regla 5); `SIM_VERSIONS[id]` con la versión del retiro.
- **Esbozo e2e**: id `e2e-HU-35-b` · mismo archivo · `finally`: MN-10 completo.

---

## Etapa 7 · Integración y giro

## HU-36 · Después de la firma nadie salta Pendiente Integración

### CP-099 · Firmada con los tres controles en verde queda «Pendiente Integración», no «Girada»
- **Criterio**: CA-1 de HU-36 · **Dirección**: positiva (Pendiente Integración) y negativa (nunca Girada sin `aprobarIntegracion`) · **Capa**: suite + e2e. · **Cobertura actual**: **caso 88** fija el orden (positiva); la negativa sobre el `useEffect` de avance es **NUEVA** (G-24, rojo); en pantalla CP-079 la observa.
- **Precondición**: NO hay «avance periódico» que correr N veces: `avanzarPipeline` —la función con `PIPELINE_TICK`, que sí escribe «Pendiente Integración» con `stage: "cesion", integracion: "pendiente"` tras `otorgamientoCompleto` y `verifResumenDeal(d).pend === 0`— no tiene llamador (`avanzarRef` se asigna y nunca se invoca; el comentario del fuente dice «El avance del pipeline NO usa timer: es event-driven»). El escritor VIVO de «Girada» es el `useEffect` «AVANCE AUTOMÁTICO A GIRO» sobre `[deals, cfgVer]`, que filtra `deals.filter(otorgamientoCompleto)` y escribe `stage: "giro", giroPendiente: false, status: "Girada · otorgada…"` sin mirar la verificación (`otorgamientoCompleto` comprueba el visado y `aprobacionFormalCliente`, no VER-01). Suite: deal con `clienteAcepto`, visado completo, `repoVerifTel` completo, LIN-01 por factura, y el predicado + escritor de ese efecto expuestos como función alcanzable por nombre (el caso en rojo lo motiva); o e2e con firma (CP-079), que es donde el efecto corre de verdad.
- **Pasos**: 1) suite: aplicar el escritor del efecto sobre el estado (o e2e: firmar con MN-05/MN-06 y esperar); 2) leer `stage`, `integracion`, `giroPendiente`.
- **Resultado esperado**: `{stage: "cesion", integracion: "pendiente"}` y nunca `giro` sin pasar por `aprobarIntegracion` (regla 26, caso 88; G-24).

### CP-100 · Con una falta el botón está deshabilitado con la lista de códigos
- **Criterio**: CA-2 de HU-36 · **Dirección**: negativa · **Capa**: suite + e2e. · **Cobertura actual**: **caso 144** (suite). En pantalla **NUEVO**.
- **Precondición**: la cadena de CP-078 rehecha en el caso (MN-01 «Sin línea» fila 0 → MN-03 → MN-04 → MN-05: la firmada de CP-078 no sobrevive a su `finally`). El botón «Aprobar integración al core» NO vive en la fila de `OperacionesView` (que recibe `deals` y `onOpen`) sino en el DETALLE, tab «Negocio», bloque de integración de `DealDrawer`, y sólo se renderiza cuando `puedeAprobarExc(usuario, {area: "operaciones"}, 3)` es verdadero (regla 41); con la sesión inicial no existe el `button` y en su lugar se lee «La aprueba un usuario de Operaciones con atribución N3 o superior».
- **Pasos**: 1) `h.irA("Operaciones")` → localizar la fila por N° → abrir la operación (`onOpen` → pestaña propia, MN-02); 2) en esa pestaña MN-07 a un usuario de Operaciones con atribución N3 (elegido por `USERS`); 3) tab «Negocio» → `getByRole("button", { name: "Aprobar integración al core" })` y su `title`.
- **Resultado esperado**: `disabled` y el `title` nombra OTG-02 / VER-01 / LIN-01 según falte; con la sesión inicial, el texto «La aprueba un usuario de Operaciones con atribución N3 o superior» y cero botones.
- **Esbozo e2e**: id `e2e-41` · archivo `33_integracion_giro.e2e.mjs` · `finally`: `sel.selectOption(usuario0)`, MN-10.

### CP-101 · Huella O05 que no calza: `no_calza` y auditado
- **Criterio**: CA-3 de HU-36 · **Dirección**: negativa · **Capa**: suite · **Cobertura actual**: **caso 86** (`sin_evidencia` / `no_calza`). · **Resultado esperado**: el de ese caso.

### CP-102 · Todo en verde: «Pendiente de Giro», giro congelado, ningún «Girar» en menús
- **Criterio**: CA-4 de HU-36 · **Dirección**: positiva y negativa (sin «Girar») · **Capa**: suite + e2e. · **Cobertura actual**: **casos 148, 136** y `regla_transiciones.test.mjs` (suite/texto). En pantalla **NUEVO**.
- **Precondición**: la cadena de CP-079 rehecha en el caso (MN-01 «Con línea» → MN-03 → MN-04 → MN-05/MN-06 con excepciones y verificación resueltas, evidencia O05 creada por la firma electrónica): la «Pendiente Integración» de CP-079 NO sobrevive, porque su `finally` es MN-10 con `h.apagarDirectorio()`, que retira las OP-DIR por su marca `_directorio` y el siguiente encendido las regenera de cero con `construirDirectorio`. Alternativa: el archivo 32 encadena CP-079 → 102 → 107 en un solo caso con un solo `finally`. El botón está en el detalle, tab «Negocio» (mismo camino que CP-100), con MN-07 a Operaciones N3 en la pestaña del detalle.
- **Pasos**: 1) Operaciones → abrir la operación → MN-07 (OP N3) → tab «Negocio» → `getByRole("button", { name: "Aprobar integración al core" })` habilitado → clic; 2) `h.irA("Operaciones")` y leer el rótulo de la fila; 3) `evaluate` con `repoGiro.get(id)` (clave real `pc_repo_giro_asignacion`, `crearRepo("giro_asignacion")`, forma `{[tenantId]: {[dealId]: valor}}`); 4) en el detalle, menú del botón principal y, con sesión ADMIN en Bitácora, «Acciones».
- **Resultado esperado**: «Pendiente de Giro»; en `repoGiro` lo que `aprobarIntegracion` congela: `giroResumenDeal` con GE/GN por deudor, `ts` y `por` (regla 43); ningún ítem «Girar».
- **Esbozo e2e**: id `e2e-43-a` · archivo `33_integracion_giro.e2e.mjs` · `finally`: `sel.selectOption(usuario0)`, MN-10.

## HU-37 · GE / GN con los hechos que el modelo pide, y con líneas (decidido el 22-09-2026: con comité el giro es Normal, ADR-0017, G-34)

### CP-103 · Verificada, sin excepciones y con línea es GE; con marca es GN
- **Criterio**: CA-1 de HU-37 · **Dirección**: positiva y negativa · **Capa**: suite · **Cobertura actual**: **caso 78** y **caso 81**. · **Resultado esperado**: el de esos casos.

### CP-104 · Un deudor con facturas a comité califica Giro Normal aunque esté verificado, sin excepciones y no sea cliente nuevo
- **Criterio**: CA-2 de HU-37 · **Dirección**: negativa (no es GE) · **Capa**: suite · **Cobertura actual**: caso **162** (implementado el 23-09-2026; ADR-0017, regla 63; G-20 y G-34; T1: `asignarGiros` recibe el quinto hecho por deudor, `requiereComite` → `sinComite`, y `girosDeDeal` lo saca de las facturas `REQUIERE_COMITE` de la versión). «El resultado de la línea sí afecta el tipo de giro; si hay que pedir comité el giro debe ser Giro Normal». · **Precondición**: `asignarGiros` con un deudor verificado, sin marcas, cliente no nuevo, y `requiereComite` verdadero; y `girosDeDeal` con una asignación (`linea`) que deja sus facturas en `REQUIERE_COMITE`. · **Resultado esperado**: todas sus facturas GN con `hechos.sinComite === false`; el chip de giro dice Normal y su `title` nombra el comité como causa (el `title` sigue por e2e, CP-128).

### CP-105 · La primera operación va completa a GN
- **Criterio**: CA-3 de HU-37 · **Capa**: suite · **Cobertura actual**: **caso 79**. · **Resultado esperado**: todo GN.

### CP-128 · Sin comité los cuatro hechos siguen decidiendo (GE cuando corresponde) y la suma por tipo sigue siendo el monto a girar; en pantalla, el chip del deudor a comité dice Normal
- **Criterio**: CA-2 (segunda dirección) y CA-4 de HU-37 (ADR-0017: «con comité → Normal; sin comité → lo que ya decidían los cuatro hechos» y «la regla de oro se conserva») · **Dirección**: positiva (sin comité nada cambia respecto de los casos 78–81) y de conservación (regla de oro) · **Capa**: suite + e2e. · **Cobertura actual**: suite: caso **162** (implementado el 23-09-2026; la dirección «sin comité» es idéntica al caso 78 y 50 carteras al azar conservan la regla de oro sin ningún deudor a comité en Express); el chip en pantalla sigue NUEVO (e2e).
- **Precondición**: suite: la entrada de los casos 78 y 80 con el quinto hecho falso en todos los deudores, y luego verdadero en uno (A). e2e: MN-01 «Sin línea» fila 0, MN-02, MN-03 «Todo lo disponible» (un deudor con «Solicitud línea $Z», `e2e-29-b`).
- **Pasos**: suite: 1) `asignarGiros` con el hecho falso: comparar con el resultado de los casos 78 y 80; 2) con el hecho verdadero en A: sumar GE + GN. e2e: 3) leer los chips de giro por `title` en el pie de la tarjeta (los que `e2e-14-c` lee como «Por evaluar»), del deudor con «Solicitud línea» y de uno con cupo.
- **Resultado esperado**: paso 1: idéntico a los casos 78 y 80 (GE donde era GE); paso 2: A entero en GN y GE + GN = monto a girar (regla 22, caso 80); paso 3: el deudor con solicitud dice Normal con el comité como causa en el `title`; el deudor con cupo, lo que sus cuatro hechos digan.
- **Esbozo e2e**: id `e2e-HU-37-a` · archivo `21_29.e2e.mjs` (misma precondición que `e2e-29-b/c`) · `finally`: el de `e2e-29-b`.

## HU-38 · El giro sale con contrato y vuelve como noticia

### CP-106 · La inyección deja un registro de envío idempotente
- **Criterio**: CA-1 de HU-38 · **Dirección**: positiva y negativa (el reintento no duplica) · **Capa**: suite. · **Cobertura actual**: NUEVO (G-28; contrato de ida sin modelar).
- **Precondición**: `aprobarIntegracion` sobre un deal en verde; llamar dos veces. · **Resultado esperado**: un registro con operación, GE/GN por deudor y referencia; la segunda llamada devuelve el mismo registro.

### CP-107 · El aviso `nex-giro` cierra la operación en «Girada» y la bitácora lo dice
- **Criterio**: CA-2 de HU-38 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **caso 147** (suite). En pantalla **NUEVO**.
- **Precondición**: la cadena de CP-102 rehecha en el caso (firma con todo en verde y la aprobación de la integración), o el archivo 32 escrito como un caso encadenado CP-079 → 102 → 107: la «Pendiente de Giro» de CP-102 no sobrevive a su `finally` (MN-10 apaga el Directorio). Tesorería no es alcanzable: MN-08 `nex-giro` sobre el tubo con `{evento: {operacionId, referencia: "TES-E2E-1", montoGirado}}` —el campo es `montoGirado`, que `recibirGiroTesoreria` redondea a `giroMonto`; un `monto` se ignora en silencio y el caso no probaría que el monto girado se registró; molde: el `EV` del caso 147.
- **Pasos**: 1) postear; 2) `h.irA("Operaciones")` y leer la fila; 3) auditoría por `evaluate`.
- **Resultado esperado**: «Girada»; acción «Giro notificado por Tesorería» con la referencia; `giroMonto` = el `montoGirado` posteado.
- **Esbozo e2e**: id `e2e-43-b` · archivo `33_integracion_giro.e2e.mjs` · `finally`: MN-10.

### CP-108 · Un aviso sin referencia, repetido o de una no inyectada se descarta y nada cambia
- **Criterio**: CA-3 de HU-38 · **Dirección**: negativa · **Capa**: suite + e2e. · **Cobertura actual**: **caso 147** (las cuatro salidas). En pantalla **NUEVO** (la más barata: `no_inyectada` sobre cualquier OP-DIR recién simulada).
- **Precondición**: MN-01, fila 0 simulada (MN-03). · **Pasos**: 1) `nex-giro` con su id; 2) leer la fila y la auditoría.
- **Resultado esperado**: la fila sigue «Negociación»; «Aviso de giro descartado (no_inyectada)».
- **Esbozo e2e**: id `e2e-43-c` · mismo archivo · `finally`: MN-10.

---

## Etapa 8 · Pérdida y máquina de estados

## HU-39 · Toda pérdida con causa, toda transición con guarda

### CP-109 · «Rechazar…» con motivo deja la fila en «Perdida» con causa, origen y actor
- **Criterio**: CA-1 de HU-39 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **casos 117 y 118** (suite). En pantalla parcial: `e2e-30` abre el diálogo «¿Por qué se pierde esta operación?» y lo cancela. **NUEVO** para confirmar.
- **Precondición**: MN-01 filtro «Todos», MN-02 fila 0 (sin simular basta).
- **Pasos**: 1) menú del botón principal → «Rechazar…»; 2) en «¿Por qué se pierde esta operación?» hacer clic en una causa DISTINTA de `competitor`: el catálogo ofrecido es `CLOSE_REASONS` sin `grant_block` ni `inactivity`, y el clic llama `onReject(deal.id, r.k)` de inmediato —no hay paso «confirmar»—; sólo `competitor` abre un segundo paso cuyo botón queda `disabled` hasta elegir contra qué factoring se perdió (`rechComp.quien`, `title` «Elige contra qué factoring se perdió») e ingresar una tasa > 0 (`rechComp.tasa`, `title` «Ingresa la tasa de cierre»), y confirma con `onReject(deal.id, "competitor", { competidor, tasaCierre })`; si el caso quiere esa causa, llena los dos campos; 3) `esperarEtapa(h.pagina, id, "Perdida")`; 4) leer la bitácora del detalle.
- **Resultado esperado**: fila «Perdida»; bitácora con la causa específica, la etapa de origen «Prospección» y el actor; sin badges accionables (regla 5).
- **Esbozo e2e**: id `e2e-5-a` · archivo `34_perdida_transiciones.e2e.mjs` · `finally`: `h.apagarDirectorio()` (regenera) y `filtroRapido(h.pagina, "Con línea")`: la precondición pone «Todos» y `correr.mjs` sólo reinicia el filtro entre archivos.

### CP-110 · `moverEtapa` o el Kanban hacia pérdida sin causa se rechaza
- **Criterio**: CA-2 de HU-39 · **Dirección**: negativa · **Capa**: suite + e2e. · **Cobertura actual**: NUEVO (G-25; hoy `moverEtapa` y `moveTo` escriben `perdida` sin causa: rojo). La mitad «Avanzar a» del criterio es SÓLO suite: el menú del botón principal nunca ofrece «Perdida» (`destinos` excluye `aceptadas`, `cesion` y `perdida`; regla 30, `e2e-30`), así que en e2e el único camino es el Kanban.
- **Precondición**: suite: `moverEtapa(deal, "perdida")` sin causa; e2e: MN-01, selector de vista de la barra del tubo → «Kanban» (las vistas son `kanban` / `tabla` / `tamaño`; por defecto carga en Tabla), la columna destino es la MacroColumn «Aceptada / Perdida» con `col("perdida", { colapsable: true })`, que **inicia COLAPSADA** (`colapsado = true` en `StageColumn`): el caso debe desplegarla antes del `dragTo` o soltar sobre su resumen colapsado, y decir cuál eligió.
- **Pasos**: 1) intentar (`moverEtapa` en la suite; `dragTo` de la tarjeta a la columna «Perdida» desplegada en e2e); 2) leer `stage` / la columna de la tarjeta y la negativa.
- **Resultado esperado**: negativa con motivo «falta la causa»; la etapa no cambia; la tarjeta vuelve a su columna (hoy el handler de drop escribe `{ ...d, stage: stageId }` sin causa: rojo).
- **Esbozo e2e**: id `e2e-5-b` · mismo archivo · `finally`: volver a la vista «Tabla», `h.apagarDirectorio()`.

### CP-111 · `moverEtapa(id, "cesion")` con OTG-02 en verde escribe `integracion: "pendiente"` y Operaciones lo rotula «Pendiente Integración»
- **Criterio**: CA-3 de HU-39 · **Dirección**: positiva · **Capa**: suite. · **Cobertura actual**: NUEVO (el caso 110 fija el traductor `estadoOperacion`; la escritura de `moverEtapa` no). **Sin capa e2e**: «Cesión» no es destino de «Avanzar a» en ninguna etapa —`destinos` excluye `aceptadas`, `cesion` y `perdida` («Cesión la fija que las facturas queden cedidas») y desde `otorgamiento` no queda ningún destino porque `giro` también se excluye (regla 30; `e2e-30` fija que «Avanzar a» iguala ese cálculo)—, así que en pantalla no hay disparador. El rótulo «Pendiente Integración» de Operaciones sobre una firmada sin pendientes ya lo gatea CP-079, que es lo que la regla 26 fija.
- **Precondición**: estado inyectado (molde caso 110): deal firmado con OTG-02 en verde (visado completo en `repoVisado`) y verificación pendiente; `moverEtapa` alcanzable por nombre.
- **Pasos**: 1) `moverEtapa(id, "cesion")`; 2) leer `stage`, `integracion` y `estadoOperacion(deal)`.
- **Resultado esperado**: `{stage: "cesion", integracion: "pendiente"}` y el rótulo «Pendiente Integración» (no «Aceptada» sin tramo); lo que hoy está en rojo aquí es sólo `integracion: "pendiente"` (`moverEtapa` escribe `cesion` sin ese campo); la guarda con OTG-02 en falta es CP-118.

### CP-118 · `cesion` con OTG-02 en falta: `moverEtapa` ya corta (gate de texto + caso de suite que la ejerza); `moveTo` del Kanban escribe sin guarda (rojo)
- **Criterio**: CA-3 de HU-39 (la guarda, dirección que bloquea) · **Dirección**: negativa · **Capa**: contrato + suite (+ e2e para `moveTo`). · **Cobertura actual**: **dividida por escritor**. (a) `moverEtapa` SÍ mira OTG-02 antes de escribir `cesion`: consulta `invarianteCumple("OTG-02", "oportunidad.avanzarEtapa", { deal })`, corta con `return`, deja `logSys` «Transición bloqueada (OTG-02)» y `registrarAuditoria` «Avance de etapa bloqueado (OTG-02)»; también devuelve sin escribir para `aceptadas` y `giro`. Esa dirección está gateada como TEXTO por `regla_transiciones.test.mjs` (exige el `invarianteCumple` y el `return` en la cabeza de `moverEtapa`, hasta su `setDeals(`; regla 41 e invariante OTG-02 en `invariantes.md` lo citan), pero ningún caso de la suite EJERCE la función: ese caso es NUEVO y nace en verde. (b) `moveTo` (el arrastre del Kanban) escribe `cesion` sin ninguna guarda —sólo rechaza `aceptadas`, el origen `perdida` y retroceder desde aceptadas/cesión/giro—: NUEVO y en rojo (G-25 queda acotado a `moveTo` y a `integracion: "pendiente"`). HU-39 se titula «toda transición con guarda» y CP-110 cubre la guarda de la pérdida en las dos direcciones; la de la cesión sólo tenía la dirección que pasa.
- **Precondición**: el estado de CP-111 con una excepción sin visar (OTG-02 en falta, `controlesIntegracion` la nombra, caso 144); `moverEtapa` alcanzable por nombre para (a); para (b), MN-01, vista Kanban (selector `button[title="Cambiar la vista del tubo (Tabla / Kanban / Tamaño)"]` → «Kanban»), la tarjeta de una OP-DIR simulada con excepción sin visar y la MacroColumn «Aceptada / Perdida» desplegada (como en CP-110).
- **Pasos**: (a) 1) `moverEtapa(id, "cesion")`; 2) leer `stage`, `integracion`, la última fila `warn` de `SYS_LOG` y la última auditoría. (b) 3) `dragTo` de la tarjeta a la columna «Cesión»; 4) leer `stage` / la columna de la tarjeta.
- **Resultado esperado**: (a) `stage` sin cambio (sigue `otorgamiento`), sin `integracion`, bitácora «Transición bloqueada (OTG-02) · <id> · quedan excepciones o rechazos re-evaluables sin resolver en el otorgamiento», auditoría «Avance de etapa bloqueado (OTG-02)» con `exito: false` —verde hoy—; (b) la tarjeta vuelve a su columna y `stage` no cambia —rojo hoy: el handler de drop escribe `{ ...d, stage: stageId }`—. En e2e el único disparador es el Kanban (`e2e-5-c`, mismo archivo que CP-110): «Avanzar a» no ofrece «Cesión» (ver CP-111), y si algún día lo ofreciera, el ítem tendría que salir ausente o deshabilitado con el motivo.

### CP-112 · El id `aceptadas` tiene escritor o no está en el catálogo
- **Criterio**: CA-4 de HU-39 · **Dirección**: negativa · **Capa**: contrato. · **Cobertura actual**: NUEVO.
- **Precondición**: gate `regla_transiciones.test.mjs` extendido: por cada id de `STAGES` busca `stage: "<id>"` en `canonico(src)`. · **Pasos**: 1) correr; 2) sonda plantando un id sin escritor.
- **Resultado esperado**: todo id del catálogo tiene al menos un escritor.

## HU-40 · Una máquina de estados normativa

### CP-113 · Una transición que no figura en el catálogo se rechaza y se audita
- **Criterio**: CA-1 de HU-40 · **Dirección**: negativa · **Capa**: suite · **Cobertura actual**: NUEVO (G-30). · **Precondición**: el catálogo de transiciones (GD-08) y `giro → oferta`. · **Resultado esperado**: negativa y fila de auditoría «transición no permitida».

### CP-114 · Una transición del catálogo se rotula con el nombre del tenant y respeta el orden del tubo
- **Criterio**: CA-2 de HU-40 · **Capa**: suite · **Cobertura actual**: **casos 110 y 112** (un solo traductor; el orden por etapa). · **Resultado esperado**: el de esos casos.

## HU-41 · Mientras se simula los pendientes son pronóstico; al publicar se exigen

### CP-115 · Simulada sin publicar: badges en morado y el tab «Verificación» en modo informativo, sin acciones
- **Criterio**: CA-1 de HU-41 · **Dirección**: negativa (no exige) · **Capa**: suite + e2e. · **Cobertura actual**: **caso 31** y **caso 158** (suite); en pantalla, **`e2e-59-a`** fija el tab informativo (regla 59) y el color del badge es **NUEVO**.
- **Precondición**: MN-01 «Sin línea» fila 0, MN-03 «Todo lo disponible».
- **Pasos**: 1) `getComputedStyle` del badge de pendientes del tab «Otorgamiento» (por `title`); 2) contar el tab «Verificación» y sus acciones.
- **Resultado esperado**: `getComputedStyle(...).backgroundColor === "rgb(124, 58, 237)"` (`#7C3AED`: los dos badges de la barra de tabs del detalle y los dos del bloque de pendientes usan literalmente `backgroundColor: exigeAcciones(deal) ? "#EF4444" : "#7C3AED"`, no `C.indigo` `#703EFF`; `exigeAcciones` devuelve `ofertaPublicada(deal)` fuera de aceptadas/cesión/otorgamiento/giro, regla 54), o al menos distinto del rojo `rgb(239, 68, 68)`; un tab «Verificación» en modo informativo, sin los botones de firmar y con el cartel que dice qué los abre (regla 59, `e2e-59-a`).
- **Esbozo e2e**: id `e2e-54-a` · archivo `29_publicacion.e2e.mjs` · `finally`: Opciones → «Eliminar la simulación», MN-10.

### CP-116 · Cerrada Y comunicada: badges en rojo y el tab «Verificación» pasa a accionable
- **Criterio**: CA-2 de HU-41 · **Dirección**: positiva · **Capa**: suite + e2e. · **Cobertura actual**: **caso 158** y **`e2e-58`** (el tubo); **`e2e-59-b`** fija que pre-evaluar abre las acciones del tab (regla 59). En el detalle, el color es **NUEVO** (lo comparte CP-074).
- **Precondición**: la de CP-115 y MN-04 (o MN-09 con `{ofertaCerrada, ofertaComunicada, negocioNum}`).
- **Pasos**: 1) releer el badge; 2) contar el tab «Verificación»; 3) leer la compuerta «Línea» antes y después.
- **Resultado esperado**: rojo `rgb(239, 68, 68)` (`#EF4444`, el literal de los cuatro badges y también `C.red` en la paleta; el `#dc2626` de `code_style.md` no está en el fuente); el tab «Verificación» con sus dos acciones habilitadas (regla 59); la compuerta de Línea idéntica (no cambia con la publicación).
- **Esbozo e2e**: id `e2e-54-b` · mismo archivo · `finally`: MN-10.

---

## Matriz de cobertura

Una fila por historia: sus CP, cuáles están cubiertos hoy (con el id que los cubre) y cuáles son nuevos, por capa.

| HU | CP | Cubiertos hoy (por) | Nuevos e2e | Nuevos suite | Nuevos contrato |
|---|---|---|---|---|---|
| HU-01 | 001–004 | 001 parcial (e2e-12-bis-a, e2e-13-octies-bis-a sobre OP-DIR), 004 (caso 142) | 001 | 002, 003 | — |
| HU-02 | 005–006 | — | — | 005, 006 | — |
| HU-03 [D6 cerrada, ADR-0014; implementada 23-09-2026] | 007–009 | 007 (caso 159), 008 (casos 159, 95), 009 (casos 99, 105) | — | — | — |
| HU-04 [el acuse se muestra y no filtra, 23-09-2026] | 010–011 | — | — | 010, 011 | 011 |
| HU-05 [014 retirado; implementada 23-09-2026] | 012–013, 120 | 012 (caso 160), 120 (caso 160) | 013 | 013 | — |
| HU-06 [definición ajustada] | 015–016 | 015 parcial (caso 100: el join en pantalla; el chip no se lee) | 015 | 016 | — |
| HU-07 | 017–018 | — | — | 017, 018 | — |
| HU-08 [el corte por reloj, ADR-0019; implementada 23-09-2026] | 019–020, 121 | 019 (caso 163, `regla_64`), 020 (caso 163), 121 (caso 163, `regla_64`) | — | — | — |
| HU-09 [D3 cerrada, ADR-0019; 021 retirado; implementada 23-09-2026] | 022–023, 143 | 022 (caso 164, `regla_64`), 023 (caso 164), 143 (caso 164) | — | — | — |
| HU-10 | 024–027 | 024 (e2e-13-octies-bis-a), 025 (e2e-13-sexdecies-a, e2e-12-bis-b), 026 (e2e-13-sexdecies-c/d), 027 parcial (caso 140, e2e-30) | 027 | — | — |
| HU-11 [D1 cerrada, ADR-0013; 029 retirado] | 028, 030, 134 | 028 (e2e-14-a/b, caso 124), 030 (e2e-14-c, se invierte), 134 parcial (e2e-14-a: mide el aviso, no cuenta versiones) | — | 134 | — |
| HU-12 [D1 cerrada; 032 retirado] | 031, 033, 135 | — | — | 031, 135 | 031, 033 |
| HU-13 [ADR-0013] | 034–036, 122 | — | 034, 035, 036 | 034, 122 | — |
| HU-14 | 037–038 | 037 (caso 47) | 037 | 038 | — |
| HU-15 | 039–041 | 039 (caso 3), 040 (caso 134), 041 parcial (e2e-29-b: el chip, no el «Requiere comité» por factura) | 041 | — | — |
| HU-16 [043 retirado] | 042, 136 | 042 (caso 4) | 042 (nace en rojo) | 136 | — |
| HU-17 | 044–045 | — | — | 044, 045 | — |
| HU-18 [D5 cerrada; 048 retirado] | 046–047 | 046 (casos 27–30, 157), 047 (casos 76, 77) | 046 | — | — |
| HU-19 | 049–050 | 050 (casos 149, 119) | — | 049 | — |
| HU-20 | 051–052 | — | — | 051, 052 | — |
| HU-21 [ADR-0013 punto 5] | 053–054, 123 | 054 parcial (caso 85) | 123 | 053, 054, 123 | — |
| HU-22 | 055–057 | 055 (caso 158), 056 (casos 30, 27; 157 por factura), 057 (casos 106, 80, 83, e2e-15-bis-bis-a) | — | — | — |
| HU-23 | 058–060 | 058 (casos 36, 38, 135), 059 (casos 141, 143), 060 (casos 56, 124) | 058 | — | — |
| HU-24 [D2 cerrada, ADR-0015; 062 retirado] | 061, 063, 117, 119, 137 | 119 (casos 21–23: vigente hoy · cambia con ADR-0018, se re-ancla al retiro del ejecutivo) | 137 | 061, 063, 117 | — |
| HU-25 [implementada 23-09-2026] | 064–067 | 064 (caso 161, `regla_62`), 067 (caso 161), 065 parcial (caso 161 en la suite; e2e-15-bis-bis-a cierra, no afirma el chip), 066 parcial (e2e-15-bis-bis-a sólo bajo `if (isDisabled())`) | 065, 066 | — | — |
| HU-26 [definición ajustada 23-09-2026; 070 retirado] | 068–069 | 068 parcial (e2e-15-bis-bis-a/b, casos 106, 126, 146; el rótulo «En gestión» no se lee), 069 (e2e-29-a) | 068, 069 | 069 | — |
| HU-27 | 071–073 | 072 (caso 106) | 071, 072 | 071, 073 | — |
| HU-28 | 074–077 | 074 parcial (e2e-58, caso 158), 075 (e2e-58, caso 31), 076 (casos 114, 85), 077 (caso 32, e2e-12-bis-d) | 074, 076 | — | — |
| HU-29 | 078–081 | 078 (casos 88, 154), 080 (casos 24, 26), 081 parcial (e2e-30) | 078, 079, 080, 081 | — | — |
| HU-30 | 082–083 | — | — | 082, 083 | — |
| HU-31 [definición ajustada] | 084–086 | 085 (caso 58, e2e-13-quaterdecies), 086 (e2e-13-quaterdecies) | — | 084 | — |
| HU-32 [ADR-0016; implementada 23-09-2026] | 087–088, 124, 125 | 087, 088, 125 (caso 166, `regla_66`) | 124 | — | — |
| HU-33 | 089–092 | 089 (caso 157), 091 (casos 25 y 167: la dirección nueva desde el 23-09-2026), 092 (caso 33) | 089, 090, 091, 092 | — | — |
| HU-34 [definición ajustada] | 093–094 | 093 (casos 55, 52), 094 (casos 55, 52) | — | — | — |
| HU-42 [ADR-0018; implementada 23-09-2026; 130 retirado] | 129, 131, 132, 138–142 | 129 y 138 (caso 167, `regla_67`), 139 (caso 167), 131 (casos 25, 157, 167), 141 parcial (casos 25, 95, 167: el veto en la suite), 142 (`regla_67`, texto) | 138, 139, 140, 141, 142 | 132, 140 | — |
| HU-35 [D4 cerrada, ADR-0015; 097 retirado; implementada 23-09-2026] | 095–096, 098, 126, 127, 133 | 095 parcial (caso 165 en la suite; la bandeja por e2e), 096 (caso 165, `regla_65`), 098 (casos 150, 125), 133 (caso 165) | 095, 098, 126, 127 | — | — |
| HU-36 | 099–102 | 099 (caso 88), 100 (caso 144), 101 (caso 86), 102 (casos 148, 136) | 100, 102 | 099 | — |
| HU-37 [ADR-0017; implementada 23-09-2026] | 103–105, 128 | 103 (casos 78, 81), 104 (caso 162), 105 (caso 79), 128 parcial (caso 162 en la suite; el chip por e2e) | 128 | — | — |
| HU-38 | 106–108 | 107 (caso 147), 108 (caso 147) | 107, 108 | 106 | — |
| HU-39 | 109–112, 118 | 109 (casos 117, 118), 118 parcial (`regla_transiciones.test.mjs` fija la guarda de `moverEtapa` como texto) | 109, 110, 118 (`moveTo`) | 110, 111, 118 | 112 |
| HU-40 | 113–114 | 114 (casos 110, 112) | — | 113 | — |
| HU-41 | 115–116 | 115 (casos 31, 158), 116 (caso 158, e2e-58) | 115, 116 | — | — |

Archivos e2e propuestos (27 en adelante) y los ids que declaran:

| Archivo | Ids | Historias |
|---|---|---|
| `27_inbound_stream.e2e.mjs` | e2e-HU-01-a, e2e-HU-05-a | HU-01, HU-05 |
| `28_version_v1.e2e.mjs` | e2e-13-a, e2e-13-b, e2e-13-c, e2e-HU-21-a | HU-13, HU-21 (CP-123: el modo de tasa en la versión) |
| `29_publicacion.e2e.mjs` | e2e-33-a, e2e-33-b, e2e-HU-25-a, e2e-15-bis-c, e2e-23-a, e2e-23-b, e2e-54-a, e2e-54-b | HU-10, HU-25, HU-26, HU-28, HU-41 |
| `30_firma.e2e.mjs` | e2e-55, e2e-1-a, e2e-1-b, e2e-1-c | HU-29 |
| `31_otorgamiento_visado.e2e.mjs` | e2e-4-a, e2e-OTG-01, e2e-HU-32-a, e2e-HU-24-a | HU-14, HU-23, HU-32 (CP-124: «ya no aplica desde la versión N» en el tab), HU-24 (CP-137: ninguna propuesta de retiro por una regla D) |
| `32_verificacion_mesa.e2e.mjs` | e2e-6-a, e2e-53-a, e2e-53-b, e2e-6-b, e2e-18 | HU-18, HU-33 |
| `33_integracion_giro.e2e.mjs` | e2e-41, e2e-43-a, e2e-43-b, e2e-43-c | HU-36, HU-38 |
| `34_perdida_transiciones.e2e.mjs` | e2e-5-a, e2e-5-b, e2e-5-c | HU-39 (CP-111 es sólo suite y la guarda de `moverEtapa` en CP-118 también: «Avanzar a» no ofrece «Cesión»; `e2e-5-c` es el `moveTo` del Kanban) |
| `35_comite_resolucion.e2e.mjs` | e2e-15-bis-a, e2e-15-bis-b, e2e-15-b, e2e-44 | HU-27, HU-35 |
| `36_tubo_segmentacion.e2e.mjs` | e2e-13-decies-a, e2e-13-decies-b | HU-06, HU-16 |
| `37_comite_rechaza.e2e.mjs` | e2e-HU-35-a, e2e-HU-35-b | HU-35 (CP-126, CP-127: el rechazo del comité retira, reabre y exige nueva firma; en cero, pérdida) |
| `38_verificacion_fallida.e2e.mjs` | e2e-HU-42-a, e2e-HU-42-b, e2e-HU-42-c, e2e-HU-42-d, e2e-HU-42-e | HU-42 (CP-138 … CP-142: marcar no retira y deja el issue; el aviso al ejecutivo en Mensajería; el ejecutivo retira, re-simula y publica → firma revocada y versión nueva; la retirada no se incorpora; el botón del detalle tampoco retira) |
| `21_29.e2e.mjs` (existente) | e2e-29-c, e2e-HU-37-a | HU-15 (CP-041: el «Requiere comité» por factura va al archivo de la regla 29), HU-37 (CP-128: el chip de giro del deudor a comité dice Normal, misma precondición) |
| `17_15_bis_bis.e2e.mjs` (existente) | e2e-15-bis-bis-c (o dentro de `-a`) | HU-26 (CP-068: el rótulo «En gestión» de la bandeja) |

Ningún id nuevo choca con los 32 declarados hoy en `tests/e2e/*.e2e.mjs`: no existe `e2e-4-*`, `e2e-13-decies*` ni
`e2e-HU-42-*`, y el único sin sufijo que se comparte es `e2e-15`, por eso CP-095 toma `e2e-15-b`.

Los ids `e2e-<regla>` nuevos entran a la fila de su regla en `vault/conocimiento/invariantes.md` y al texto de la
regla en `reglas/<tema>.md` (regla núcleo 8); el gate `invariantes.test.mjs` exige que el archivo los declare.
`e2e-14-c` conserva su id al invertirse (CP-030).

---

## Resumen

**143 ids emitidos (CP-001 … CP-143) y 133 casos de prueba con contenido** para las 42 historias: cada CA tiene al menos
un CP y cada control lleva las dos direcciones (dentro del mismo CP o en el par que lo sigue). Diez ids quedaron **sin
caso** porque su lectura fue descartada por una decisión del 22-09-2026 o del 23-09-2026 y no se reutilizan: CP-014 (tags
del emisor, M-10), CP-021 (reabrir con el mismo id al corte, D3-B, ADR-0019), CP-029 y CP-032 (D1-A, ADR-0013), CP-043
(cuatro líneas, M-27), CP-048 (la empresa emisora como unidad de la verificación, M-22), CP-062 (bloqueo por deudor,
D2-A, ADR-0015), CP-070 (la lectura literal de M-28, «existiendo suficiente línea»), CP-097 (D4-B sola, ADR-0015) y
CP-130 (retiro automático con reapertura en la verificación, ADR-0018). CP-117, CP-118, CP-119 y CP-133 … CP-137 son direcciones que faltaban a un control (CP-133: «Observada»
no retira ni reabre, HU-35; CP-134: un clic de selección no corre motores, HU-11; CP-135: «Re-evaluar» sí registra y
versiona, HU-12; CP-136: la global holgada no produce motivo `deudor`, HU-16; CP-137: ninguna propuesta de retiro por
una regla D, HU-24); **CP-120 … CP-128** son los casos que las decisiones crean: CP-120 (HU-05: el tope de antigüedad es del tenant), CP-121 (HU-08: corte y reinicio
por hora del tenant), CP-122 (HU-13: cinco motores, cinco versiones, un mismo número), CP-123 (HU-21: el modo de tasa y
las condiciones en la versión), CP-124 y CP-125 (HU-32: «ya no aplica desde la versión N» visible y auditado; la marcada
no se reactiva), CP-126 y CP-127 (HU-35: el rechazo del comité en pantalla, hasta la nueva firma; en cero, pérdida) y
CP-128 (HU-37: sin comité deciden los cuatro hechos, y el chip del deudor a comité dice Normal). Todos van en la sección de su historia: el id es de emisión y no de posición («Cómo se lee»). **CP-129 … CP-132** son
HU-42 (M-18 en la verificación, decidida el 23-09-2026 con ADR-0018): CP-129 la conducta vigente que se da vuelta (remite
a CP-119), CP-130 sin caso, CP-131 vale hoy y con el ADR, CP-132 es NUEVO (su mitad de la pérdida —retirar la última
pierde con causa— vale hoy y con el ADR; su mitad de la marca —marcar no pierde— nace con ADR-0018); y **CP-138 … CP-142**
son los casos que ADR-0018 crea:
CP-138 (marcar «no verificada» en la mesa no retira y deja el issue; VER-01 bloquea), CP-139 (el aviso al ejecutivo
comercial en Mensajería), CP-140 (el ejecutivo retira, re-simula y vuelve a publicar: versión nueva, firma revocada, el
cliente firma de nuevo), CP-141 (la retirada no se puede volver a incorporar) y CP-142 (el botón del tab Verificación
del detalle tampoco retira); y **CP-143** es la dirección que bloquea del corte del día que ADR-0019 crea (HU-09: la
oportunidad que recibe oferta justo antes del corte no se elimina; la que sigue sin oferta sí). Tres CP quedan **vigente hoy · cambia con ADR-0018: pasa a la dirección contraria** y se
dan vuelta con su mismo id en el commit del ADR: CP-091 (`e2e-6-b`), CP-119 y CP-129 (casos 21–23).

**Cubiertos hoy, total o parcialmente: 64 CP** (medidos sobre la matriz: la columna «Cubiertos hoy» nombra 63 CP; CP-141 —parcial en la suite, casos 25 y 95— se cuenta entre los nuevos porque nace con ADR-0018, así que quedan 62).
Por la capa e2e: `e2e-13-octies-bis-a`, `e2e-13-sexdecies-a/c/d`, `e2e-12-bis-a/b/d`, `e2e-14-a/b/c`, `e2e-29-a/b`,
`e2e-15-bis-bis-a/b`, `e2e-58`, `e2e-30`, `e2e-13-quaterdecies`. Por la suite: casos 3, 4, 21–33, 36, 38, 47, 52, 55,
56, 58, 76–81, 83, 85, 86, 88, 99, 100, 105, 106, 110, 112, 114, 117–119, 124–126, 134–136, 140–144, 146–150, 154, 157,
158, 159, 160, 161, 162, 163, 164, 165, 166, 167 (el 145 —ATR-01, quién autoriza un descuento— no lo cita ningún CP; y `regla_35`, `regla_40`, `regla_transiciones`,
`regla_estado_pestanas` como texto; `regla_33` vigila la solicitud duplicada, no las mutaciones del paquete). De esos
85, **46 están cubiertos del todo** —entre ellos los tres que la decisión del usuario dejó **implementados como están**:
CP-085 y CP-094 (la clave estable es el versionado, G-13 cerrado) y CP-028 (el gesto explícito, D1), y los dos de HU-42
que remiten a lo que los casos 21–23 y 157 ya fijan (CP-129, que se da vuelta con ADR-0018, y CP-131)— y **37 son
parciales** (CP-001, 015, 027, 037, 041, 042, 046, 054, 058, 065, 066, 068, 069, 072, 074, 076, 078, 080, 081, 089, 091,
092, 095, 098, 099, 100, 102, 107, 108, 109, 115, 116, 118, 128, 134, 138, 139): la conducta está en la suite, en un gate de texto o en un e2e
vecino y falta el caso en pantalla (HU-01, HU-06, HU-10, HU-14, HU-15, HU-16, HU-18, HU-23, HU-25, HU-26, HU-27, HU-28,
HU-29, HU-33, HU-35, HU-36, HU-38, HU-39, HU-41), falta la dirección negativa (CP-054, CP-069, CP-074, CP-099), el e2e
que se cita sólo la cubre bajo condición (CP-066) o sólo mide el aviso sin contar versiones (CP-134). CP-141 es parcial
en la suite (casos 25 y 95 fijan el veto) pero nace con ADR-0018 y se cuenta entre los nuevos. Los otros **48 CP
son enteramente nuevos**; en total, 85 CP piden al menos un caso nuevo (37 + 48), y 85 + 48 = 133.

**Nuevos por capa:** **e2e 50** (en 12 archivos nuevos, `27` … `38`, más tres ids que van a archivos existentes,
`21_29` y `17_15_bis_bis`; 30 de ellos fijan conducta vigente sin gate en pantalla —CP-001, 015, 027, 037, 041, 046,
058, 065, 066, 068, 069, 072, 074, 076, 078–081, 089–092, 098, 100, 102, 107, 108, 109, 115, 116; CP-091 se escribe
fijando lo vigente y se da vuelta con ADR-0018— y 20 dependen de un gap o de una decisión ya tomada —CP-013, 034–036,
042 (el tooltip, nace en rojo), 071, 095, 110, 118 (`moveTo`), 123, 124, 126, 127, 128, 137, 138–142—; CP-111 es sólo
de suite porque «Avanzar a» no ofrece «Cesión») · **suite 42** (del 168 en adelante; `CASOS_ESPERADOS` sube en cada
commit que los agrega, y se dice) · **contrato 4** (CP-011, CP-031, CP-033, CP-112; todos con sonda negativa
sobre `canonico(src)`). Un CP suma en dos capas cuando la conducta se prueba en el motor y en la pantalla (50 + 42 + 4 =
96 casos para 85 CP).

**Decisiones del 22 y del 23-09-2026.** Cerradas y aplicadas: **D1** (ADR-0013: CP-028 y CP-030 protegen el gesto
explícito; CP-031/033 retiran el anuncio; CP-034–036, CP-122 y CP-123 fijan el evento de evaluación, las cinco versiones
y su contenido), **D2** (ADR-0015: no hay bloqueo por deudor; CP-061/117 fijan M-15 tal como está), **D3** en el
destino (ADR-0019: CP-022, CP-023 y CP-143), **D4** (ADR-0015: CP-096 en la suite, CP-126/127 en pantalla; CP-095 y
G-33 para el estado «Rechazada»), **D2 en la verificación, 23-09-2026** (ADR-0018: CP-138/139/140/141/142 en rojo,
CP-132 en su dirección nueva; CP-091, CP-119 y CP-129 fijan lo de hoy y se dan vuelta), **D6** (ADR-0014:
CP-007/008/009), **M-21** (ADR-0016: CP-087/088/125 en la suite —caso 166—, CP-124 por e2e), **M-33** (ADR-0017: CP-104/128), **M-10** (G-31: CP-012/120),
**M-02/M-07/M-08** en el reloj (CP-019/020/121), **M-19** (CP-064), **M-36** (CP-053/123), **M-01** en el dato (G-01:
CP-011). Dadas por buenas como están: M-05/M-06 (CP-015/016), M-15 (CP-061), M-20/M-25 (CP-085/094), M-22 y M-23
(CP-046/047; CP-048 retirado el 23-09-2026), M-27 (CP-042), M-28 (CP-068/069; CP-070 retirado el 23-09-2026), M-35
(CP-051/052) y M-01 en el filtro (CP-010). **Por confirmar: nada desde el 23-09-2026.** Las cuatro respuestas de ese
día fijaron: **D3, el destino** de la no gestionada (ADR-0019) → CP-022, CP-023 y CP-143, con CP-021 sin caso;
**M-01**, el acuse se muestra y no filtra → CP-010 (y CP-011 para el dato); **M-13**, «el cliente simula» es el gesto
del ejecutivo → CP-122, que dispara el evento por su nombre; y **G-17** (M-28), la errata del modelo → CP-069 es la
dirección vigente, con CP-070 sin caso. M-18 en la verificación está decidida (ADR-0018, 23-09-2026; HU-42: CP-129,
CP-131, CP-132, CP-138 … CP-142).

**Orden sugerido para escribirlos:**

1. **Primero, la conducta vigente sin gate en pantalla** (todo desde la firma en adelante está protegido sólo por la
   suite, §4 del documento de gaps): `30_firma` (CP-078, 079, 080, 081) es la maniobra que los demás necesitan;
   después `32_verificacion_mesa` (CP-046, 089–092), `31_otorgamiento_visado` (CP-037, 058), `33_integracion_giro`
   (CP-100, 102, 107, 108), `29_publicacion` (CP-027, 065, 066, 069, 074, 076, 115, 116), `34_perdida_transiciones`
   (CP-109), `36_tubo_segmentacion` (CP-015) y los dos que se suman a archivos existentes (CP-041 en `21_29`, CP-068 en
   `17_15_bis_bis`); en la suite, el caso que EJERCE la guarda OTG-02 de `moverEtapa` (CP-118 (a), nace en verde) y los
   que fijan lo que el usuario dio por bueno tal como está (CP-016, 051, 052, 061, 117, 133, 136). Ninguno cambia el fuente: sólo
   fijan lo que ya pasa. CP-042 no va acá: el tooltip nace en rojo y está en el paso 3.
2. **Después, los T1 decididos el 22 y el 23-09-2026, en rojo, cada uno en el commit de su ADR**: ADR-0013 (**hecho el 23-09-2026**: el caso 168 y `regla_68` cubren
   CP-031/033/034/053/054/122/123/134/135; CP-035/036 y las pantallas de CP-034/123 siguen e2e NUEVO; CP-030 no se dio
   vuelta: el pie de la tarjeta es la regla 14, no el evento), ADR-0014 (CP-007/008), ADR-0015 (CP-095 con G-33, CP-096,
   CP-126/127, CP-137, CP-063 con la segunda mutación), ADR-0016 (CP-087/088, 124, 125), ADR-0017 (CP-104/128), ADR-0018
   (CP-138/139/140/141/142 y CP-132 en su dirección nueva; el vuelco de CP-091, CP-119 y CP-129, con los casos 21–23
   re-anclados al retiro del ejecutivo; GD-12 en el mismo commit), ADR-0019 (CP-022, CP-023 y CP-143; la regla 22
   reescrita en lo que dice del cierre del día, en el mismo commit). Con ellos los T1 sin
   decisión previa (§2.2 del documento de gaps): CP-017/018 (G-05), CP-071/073 (G-18),
   CP-049 (G-23), CP-099 negativa (G-24), CP-110/111/118 (b)/112 (G-25), CP-082/083 (G-26), CP-044/045 (G-27), CP-106
   (G-28). Cada uno con su regla ampliada o nueva y su fila en `invariantes.md`.
3. **Luego, los T2 decididos y los que no esperan decisión**: CP-064/067 (G-12: implementados, caso 161), CP-012/120 (G-31: implementados, caso 160), CP-019/020/121 (G-02, G-03: implementados, casos 163–164),
   CP-010 y CP-011 (G-01: el dato; el filtro no cambia), CP-005/006 (G-29), CP-013 (control de configuración), CP-042
   (el tooltip), CP-113 (G-30), CP-054 (junto al 85).

Ningún CP espera una respuesta del usuario desde el 23-09-2026. Los gaps documentales GD-01 … GD-12 de §5 del
documento de gaps se cierran en el commit de la decisión que los resuelve.
