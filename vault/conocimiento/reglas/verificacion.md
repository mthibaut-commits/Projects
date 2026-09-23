---
type: conocimiento
title: "Reglas — Verificación de facturas"
description: "La rutina aislada de verificación telefónica: decisión por deudor, los dos segmentos, la regla 0, los diez criterios y sus umbrales, el veredicto congelado, el tab del detalle y la mesa del equipo"
tags: [conocimiento, reglas, dominio]
timestamp: 2026-09-17T15:29:14Z
---

# Verificación de facturas

> Reglas de dominio de NEX, **verbatim** desde el `CLAUDE.md` anterior al 17-09-2026, agrupadas por tema. Se citan por su número (`regla 6`) y **no se renumeran**: el fuente y otros documentos las referencian así. Índice de todas, con qué caso de la suite verifica cada una: [`invariantes.md`](../invariantes.md).
>
> Reglas en este archivo: **6** · **9-ter** · **53** · **57** · **59** · **67** · **71**.

6. **Verificación de facturas = rutina AISLADA, y la decisión es POR DEUDOR** (`Specs_Procesos/Verificacion/spec-verificacion-facturas.md`). El contacto con el deudor busca dejar por escrito o grabado que pagará; toma **3–4 horas y retrasa el giro**, y si el deudor no confirma **Security retira las facturas no confirmadas**. Por eso el ejecutivo tiene que saber ANTES de comprometer un plazo. `verifDecision(par, facturas)` es la función pura; `verifEvaluar` la adapta a la UI, `verifDeudorDeal` la consulta y `verifFactura` sólo delega — **la verificación de una factura ES la de su deudor**, porque una llamada cubre todas sus facturas y evaluarla por documento daba veredictos distintos entre facturas del mismo deudor. Detalle:
   - **`verifPar(rutCliente, deudor, tipo)`** memoiza en `_VERIF_PAR` el estado del PAR (protocolo propio, % pagado 3M, recurrencia, mora, reclamos, historial). Semilla = el par, **nunca el folio**.
   - **CORRECCIÓN del 23-09-2026 (ADR-0018, regla 71):** «Security retira las facturas no confirmadas» dejó de ser lo que hace la mesa. Marcar «no verificada» escribe el veto, deja el issue y avisa al ejecutivo comercial; retirar, re-simular y volver a publicar es decisión del ejecutivo, y el cliente firma la nueva operación.
   - **Dos segmentos** (spec §3): `recortado = prime || nota > NOTA_PRIORITARIA` — son DOS poblaciones y basta pertenecer a una. **PRIME** (Lista Blanca o Deudor Autorizado, o nota > 4,2) aplica 6 reglas: **V01, V04, V05, V07, V08, V10**. **OTROS** aplica las 10. Los nombres viejos «ELITE/OTHERS» ya no existen.
   - **REGLA 0 · PRIMERA OPERACIÓN DEL CLIENTE** (12-09-2026): compuerta como V01 y **antes** que ella — en la primera operación se verifican **TODAS** las facturas, cualquiera sea el segmento del deudor. Aplica a los dos segmentos porque no es un criterio de riesgo del DEUDOR sino del CLIENTE. Vive acá y no en el motor de líneas ni en la pantalla del giro: «si hay que llamar a este deudor» es una sola pregunta y tiene un solo dueño. El **estado del cliente** (`nuevo` · `activo` · `suspendido` · `eliminado`) lo devuelve una API de Security al iniciar sesión y sólo `nuevo` es primera operación; entra **por parámetro** (`esPrimeraOperacionCliente(deal, estados)`) y **no se memoiza con el par**, que sí se cachea — si se guardara ahí, el cliente seguiría verificándolo todo para siempre después de cursar.
   - **V01 es COMPUERTA, no atajo:** si el deudor tiene protocolo propio de confirmación **se verifica SIEMPRE** con ese protocolo y no se evalúa nada más. (Antes estaba invertido: el protocolo evitaba la llamada.)
   - **Unanimidad** (§4.2): para EVITAR la verificación hay que superar TODOS los criterios aplicables — conjunción, no mayoría.
   - **`null` = incumplimiento** (§4.3): no hay estado intermedio, así que un deudor nuevo —sin historial para V02/V05/V10— se verifica por construcción.
   - **Umbrales:** V02 ≥90% · V03 ≤1,3× · V04 <1,0 · V05 ≥4 meses (no >4) · V06 ≤5% del plazo promedio del par (no 5 días) · V07 <3% · V08 <4% · V09 ≤MM$300 · V10 >MM$1.000 (umbral fijo, no 20× la operación).
   - **V09 (alto monto) sólo aplica en OTROS:** un Prime no tiene techo por monto. Se mide sobre el TOTAL de la operación con ese deudor, no por factura.
   - Las reglas que nacen a nivel documento (V06 y V09) **escalan al conjunto** del deudor para que el contacto quede consistente.
   - Sin versionado: viene de API/SFTP, botón "Refrescar". Verificación telefónica: checklist existencia/recepción/fecha, bloquea el giro.
   - **El estado de la llamada sale del COMMIT, no de un sorteo.** `verifFactura` lo elegía con `par.h % 3` entre Completada/En curso/Pendiente sin mirar nunca `repoVerifTel`, así que `verifResumenDeal` contaba pendientes imaginarios y **VER-01 fallaba en las dos direcciones**: una operación con todas sus llamadas firmadas podía quedar bloqueada, y una SIN NINGUNA podía pasar el control. Una llamada está registrada o no: no hay estado intermedio, porque el repositorio guarda `{por, fecha}` y nada más.
   - **El veredicto se CONGELA con el contacto** (`repoVerifVeredicto`, §9 del spec). Registrado el contacto deja de ser una predicción. Antes se recalculaba en cada render contra la oferta VIGENTE, y como retirar las no confirmadas baja el monto, los criterios 3, 4 y 9 podían pasar a cumplir: el deudor volvía a «verificado por modelo» y su fila **desaparecía de la mesa**, borrando la evidencia recién firmada. Volver a predecir sobre el monto ya recortado es además circular.
   - **`verifPar` resuelve el `tipo` ADENTRO**, desde la identidad del par, y el RUT del deudor entra en la clave de memoización. Antes lo recibía por parámetro sin que formara parte de la clave, y los dos llamadores pasaban cosas distintas (`tipoDeudorDisp(f)` vs `tipoDeudor(null, nombre)`): el primero en llegar fijaba nota, segmento y criterios para toda la sesión.
   - **La confirmación puede ser PARCIAL:** el deudor reconoce unas facturas y no otras. La mesa trae un selector por folio —todas marcadas por defecto— y al registrar, las desmarcadas se retiran y quedan vetadas igual que en el «no verificada» completo.
   - **No hay «reglas duras».** El campo `dura` del catálogo y el `hard` del veredicto se retiraron: `verifFactura` devolvía siempre `hard: false` y ningún criterio tenía un efecto distinto de mandar el deudor al teléfono. El mantenedor `CriteriosVerifMantenedor` **se eliminó**: no estaba enganchado a ninguna vista —no había forma de llegar a él— y además no era de este spec, sino de los criterios de *visado* por área del otorgamiento.
   - **Tab «Verificación» del detalle** (`VerificacionTab`): es donde el equipo de verificación marca por factura y registra la llamada, dentro de la operación. Aparece en DOS escenarios, y sólo con facturas en la oferta: cuando el ejecutivo aprieta **Pre-evaluación** (`tienePreEval`, adelanta el proceso igual que con el otorgamiento) o cuando la oferta está **cerrada Y publicada** (`ofertaPublicada`: las dos mitades, cerrar es la aprobación interna y publicar el compromiso con el cliente). Desde Aceptada en adelante se muestra siempre. Antes de eso no hay nada que llamar: la oferta todavía se está armando y quemar 3–4 horas por un deudor cuyas facturas quizá se retiren es el error que la compuerta evita. Una verificación **negativa** retira la factura de la oferta y la **veta** (`onRetirarFactura(..., "noConfirmada")`); el ejecutivo tiene que **Re-evaluar** — no se recalcula solo (regla 14). El tab estuvo huérfano un tiempo: el componente existía pero no estaba en la barra de pestañas y no había forma de llegar. **Refinado por la regla 59** (22-09-2026): el tab se ve también con la oferta sólo SIMULADA, en modo informativo — lo que esta compuerta protege es la LLAMADA, no la información.
   - **El tab agrupa por DEUDOR y el badge es por FACTURA** (13-09-2026). El veredicto es del deudor —una llamada cubre todas sus facturas— y la lista plana lo contradecía: repetía el chip, la nota y el nombre en cada fila, y no se veía que siete filas eran UNA decisión. Agrupar lo dice sin explicarlo, y de paso deja a la vista lo único que cambia entre facturas, que es el folio y el monto. El badge sigue siendo **por factura** porque la confirmación puede ser **parcial**: ahí las hermanas dejan de coincidir. La cabecera del grupo resume y dice **«n de m por verificar»** cuando están divididas — decir sólo «Req. verif.» escondería que la mitad ya está.
   - **La fila de factura trae los DATOS DEL DOCUMENTO** (14-09-2026): folio · tipo doc. · f. emisión · f. vencimiento · **tasa** · monto · verif., en el mismo orden y con los mismos títulos que la tabla de candidatas, y con cabecera de columnas dentro de cada grupo —sin ella, dos fechas seguidas no dicen cuál es cuál—. Traía sólo folio y monto, y quien está por gastar 3–4 horas llamando al deudor necesita saber qué factura le va a confirmar. **La tasa entra por parámetro** (`tasaDe`): sale del spread del deudor, que el ejecutivo puede haber pisado en la pestaña Negocio, así que recalcularla con el sugerido mostraría el mismo documento con dos precios en la misma pantalla.
   - **El botón «Pre-evaluación» y el menú «Acciones» NO se muestran en Otorgamiento ni en Verificación** (14-09-2026). En esos dos tabs el ejecutivo no arma la oferta: lee lo que la casa decidió y qué falta llamar. Pre-evaluación pertenece a la oferta —«adelanta el otorgamiento de lo que estoy armando»— y ofrecerla dentro del propio tab de Otorgamiento invita a apretarla mirando el resultado que ya produjo; el menú de acciones, que termina la operación, compite con las acciones por criterio y por factura que esos tabs ya traen. Siguen en Negocio.
   - **Mesa de verificación** (`VerificacionView`, vista de la navbar junto a Otorgamientos): el equipo de verificación marca **verificada** o **no verificada** por **DEUDOR**, no por factura — una llamada cubre todas sus facturas. Cada fila trae **todas las causas** que gatillaron el contacto (`causasVerif`), con valor y umbral: si fueron dos, van las dos, porque quien llama tiene que confirmarlas en la misma llamada. Un criterio **sin dato** se muestra como incumplimiento, nunca como «no aplica» (§4.3), y el **protocolo propio del deudor es compuerta**: cuando aplica es la ÚNICA causa, porque no se evaluó ninguna otra. «Verificada» registra la llamada de todas sus facturas (`repoVerifTel`); «no verificada» las retira y las veta, que es el camino que recorta la asignación y emite versión nueva. `filasVerificacion` sólo lista lo que el predictor mandó a teléfono: lo que el modelo dio por verificado no aparece, porque no hay nada que llamar.

9-ter. **Una COMPARACIÓN se hace en PESOS. El `M$` no cruza a la lógica** (17-09-2026, pedido del usuario: «esas comparaciones de $ con M$ tienen que ser siempre en $; en la BD siempre en $, en la UI puedes usar M$»). Es el corolario operativo de la regla de la escala única, y lo que la migración al peso del 14-09 dejó pendiente: migrar los MONTOS no basta si los UMBRALES contra los que se comparan se quedan en millones.
    - **El predictor de verificación lo tenía roto en los dos lados a la vez.** `montoOp` se suma en pesos; `mntCompraOp3M` y `avgVentaProm3M` se leían del A10 **dividiendo** por mil (el layout trae MILES, sufijo `_M`), o sea que quedaban en millones; y los umbrales de V09 y V10 estaban escritos `300` y `1000`. V03 y V04 dividían dos magnitudes con un factor **1.000.000** entre medio y V09 exigía una operación de **$300 pesos**.
    - **El efecto no es un sesgo sino la INVERSIÓN del criterio.** Los tres existen para poner un techo por monto; con la unidad rota no los cumplía nadie, y como para EVITAR la verificación hay que superar **todos** los aplicables (unanimidad, §4.2), el techo terminaba mandando al teléfono a la población entera. **V04 aplica también a PRIME**, así que se llevaba además a los deudores de lista. Medido antes y después sobre las mismas 800 filas del A10, con el mismo escenario: **V03 0→800, V04 0→800, V09 0→800**. Sobre 1.500 pares con una operación plausible, **241 evitan hoy la verificación donde antes evitaban 0**.
    - **V10 NO estaba roto y no se movió:** comparaba millones contra millones, consistente en los dos lados. Da **161 de 800 antes y después**, y esa invariabilidad es lo que confirma que la migración conserva el comportamiento donde ya era correcto — un cambio de unidades que mueve *todo* es un cambio de unidades mal hecho.
    - **La causa dominante de verificación ahora es V10** (1.048 fallas de 1.500, 646 como primera causa): el deudor no le ha pagado M$1.000 al factoring en 3 meses. Es un criterio legítimo con la unidad correcta. **Giro Express sigue sin aparecer en una operación cualquiera** y eso no es un defecto pendiente: GE exige además que el otorgamiento no haya dejado marcas de excepción (regla 22), y una operación con 47 criterios por aprobar no califica por ese otro lado.
    - **El mismo error, en la narrativa de la IA** (`resumenEmpresa`): `ventaAnual`, `patrimonio` y `coloc` se dividían por mil y por un millón y después se pasaban a `fmtMM`, **que vuelve a dividir**. La facturación anual de un cliente salía como «$1.234» en vez de «M$1.234». El resto del archivo ya lo hacía bien —`fmtMM(ventasSII[i] * 1000)`— así que la misma cifra se leía distinta en dos pantallas. Se encontró **auditando**, no leyendo: `node auditar_unidades` cruza cada `fmtMM/fmtMMc/fmtCLP` con los argumentos ya divididos, en la línea y a través de una variable intermedia.
    - **Lo que la prueba tiene que medir es el ACTIVO, no un orden de magnitud.** El caso 115 comprueba `par.x === Math.round(celda * 1000)` fila por fila (200/200) en vez de «≥ 1e6»: un umbral suelto lo pasaría también una conversión equivocada por 10. Y fija el **borde exacto** (M$300 cumple, M$300+1 no), porque un criterio que sólo se comprueba lejos del umbral no prueba dónde está el umbral.
    - **Dos fixtures de la suite llevaban escrita la unidad equivocada** (casos 54 y 76) y el 76 se cayó al migrar: es el caso sano —la prueba afirmaba el defecto— y se corrige el fixture, nunca el criterio.
    - **Con la unidad arreglada, el predictor sigue mandando al teléfono a casi todos, y la causa ya es DATO y POLÍTICA, no código** (17-09-2026, medido criterio por criterio sobre los 13.302 pares del A10 que tienen facturas en el libro, con tres ofertas: todas las facturas del par, una sola, las del último mes). V03 pasa del 0% al 100% y V09 al 98%. Pero **V04** —que aplica a los DOS segmentos— lo pasa el 28% de los pares PRIME y el 1% de OTROS **aun con una sola factura**: `V04_VENTA_PROM_3M_M` es la venta mensual del par derivada de una ventana de **47 días con ~2 facturas por par** (`p.mm × 30/47` en `GeneradorDatos/datasets/verificacion.js`), así que una factura sola ya vale más que el «promedio mensual». Y **V10** (MM$1.000 pagados en 3 meses) lo pasa el 15% de PRIME y el 5% de OTROS. Por unanimidad (§4.2) quedan «verificados por modelo» el **5,3% de los pares PRIME y ninguno de OTROS**: Giro Express es alcanzable pero raro. No se tocó nada: V04 hace lo que la política dice sobre un archivo donde casi toda relación parece esporádica, y V10 es un umbral de política sobre pares chicos. La perilla estaba en el **generador**, no en el motor, y se movió el mismo día (abajo).
    - **Cerrado el 17-09-2026 en el generador, sin tocar el motor ni la política.** `datasets/verificacion.js` extrapolaba la ventana de 47 días linealmente (`p.mm × 30/47` como venta mensual, `× 90/47` como compra en 3M), o sea trataba una muestra corta como si fuera la relación entera, y sembraba V10 por PAR. Ahora la **factura típica se mide** y la **frecuencia mensual** y la **fracción cedida se modelan por perfil** de la relación —el mismo perfil que decide la recurrencia V05, nunca por debajo del ritmo que la ventana muestra— y **V10 es del DEUDOR**: lo que le pagó al factoring en 3M sumando todos sus cedentes, que es lo que la política pide («evita el falso positivo del deudor que operó una sola vez con Security… para que *sus* estadísticas sean representativas»). Con flujos de RNG propios, para que V01/V02/V05/V06/V07/V08 quedaran byte a byte iguales: sólo cambiaron V03, V04 y V10. Medido con una factura en la oferta: V04 pasa **80% PRIME / 82% OTROS** (antes 28% / 1%) y V10 **90% / 93%** (antes 15% / 5%); «verificados por modelo» **49,8% / 50,3%** (antes 5,3% / 0). Ninguna cifra se colocó respecto de un umbral: son propiedad emergente del perfil. Y se regeneró **sólo el bloque** (`generar.js --solo=VERIFICACION`) porque la cadena A2 → A5 → A2 del generador no tenía punto fijo (cerrado ese mismo día: regla 32).
    - **V10 a nivel DEUDOR, ratificado por el usuario el 17-09-2026** («ratifica V10 a nivel deudor»). Lo pagado al factoring en 3M se suma sobre todos los cedentes del deudor, como dice la política; el generador lo modela así (`V10_MNT_PAGADO_3M_M` es del deudor, no del par) y el motor lee la misma columna. Volver a par era una línea del generador y dejó de ser una opción abierta: no se re-litiga.

53. **LA MESA DE VERIFICACIÓN TRABAJA POR FACTURA, AGRUPADA POR DEUDOR** (22-09-2026, pedido del usuario:
    «necesito que esta funcionalidad sea la operación, un listado de facturas agrupada por deudor —a través
    del deudor se pueda acceder a las razones que gatilló la verificación—, pero que el core sea poder marcar
    si la factura está verificada o no, adjuntar un archivo y agregar una nota»).
    - **Qué NO cambia: el agrupamiento y de quién son las causas.** La llamada sigue siendo del DEUDOR —una
      cubre todas sus facturas— y las causas son suyas, así que no se repiten documento a documento: viven en
      la cabecera del grupo, detrás de un disclosure con sus códigos a la vista. La regla 6 sigue entera; lo
      que cambia es la **unidad de trabajo**, no la unidad de decisión.
    - **Qué SÍ cambia: la unidad de trabajo es el documento.** Cada factura trae folio, tipo, las dos fechas,
      monto, su estado (`por verificar` · `verificada` · `no verificada`) y sus acciones: marcarla, **adjuntar
      un archivo** y **anotar**. No es una regla nueva del motor: `verificarDeudor` ya escribía factura por
      factura y la confirmación PARCIAL ya existía —el deudor reconoce unas y otras no—; lo que faltaba era
      poder resolverlas de a una, que es como ocurre la llamada.
    - **TRES NIVELES, no uno** (22-09-2026, pedido del usuario). Arriba la **OPERACIÓN** —su número, su fecha
      (`fechaOportunidad`) y cómo va su verificación completa—, adentro sus **DEUDORES** como cards colapsables
      iguales a las del detalle, y al abrir una, sus **FACTURAS** con un estado cada una. La mesa listaba
      deudores sueltos: el verificador llama POR OPERACIÓN —es lo que frena un giro— y tenía que reconstruir a
      qué operación pertenecía cada fila leyendo el enlace del cliente. El agrupador (`filasVerificacion`) NO
      cambió: sigue devolviendo una fila por (operación, deudor) y el nivel de arriba se arma en la vista.
    - **Los contadores van al costado de la razón social, y UN CHIP EN CERO NO SE DIBUJA** (`cuentaVerif` +
      `chipsVerif`): «Verificadas 2 · No verificadas 3 · Pendientes 0» deja de mostrar el último. El usuario lo
      pidió para «Pendientes» y vale para los tres: un cero no es un estado, es la ausencia de uno, y tres chips
      donde dos dicen cero esconden al único que había que leer. La misma función alimenta los dos niveles, para
      que el de la operación no pueda dejar de cuadrar con la suma de los de abajo.
    - **LAS DOS DECISIONES PASAN POR EL PANEL LATERAL** (`DrawerVerificacion`, `fixed inset-0 flex justify-end`).
      Lateral y no centrado porque se registra MIRANDO la lista —qué deudor, qué folio, qué queda pendiente— y un
      modal centrado tapa justo eso. Y sirve para las dos: el «no verificó» también tiene información que
      capturar —con quién se habló, POR QUÉ no confirmó (`MOTIVOS_NO_VERIF`), el correo donde lo dice— y hasta
      acá se resolvía con el sí/no de un diálogo de confirmación, o sea **retirando plata de una operación viva
      sin dejar un solo dato de por qué**. El ALCANCE lo trae quien lo abre: un folio desde su fila, o todo lo
      pendiente del deudor desde su cabecera. Si el alcance cubre TODO lo pendiente se usa el escritor del deudor
      (`onVerificar`/`onNoConfirmar`), que además congela su veredicto de una vez; si es un folio suelto, el del
      documento. En los dos casos el respaldo se escribe en CADA documento del alcance, porque la evidencia se
      pregunta desde el folio.
    - **La fecha de pago vive DENTRO de su check** y se habilita al marcarlo. Estaba como un campo suelto de la
      grilla de contacto, así que el check podía quedar marcado y la fecha vacía: exactamente el caso que el
      propio rótulo declara imposible —«sin fecha no hay compromiso que verificar»—. Ahora son un solo dato y se
      validan juntos (`completo` exige `compromiso`), y el campo es un `type="date"`, no texto libre.
    - **Sin causas no hay disclosure**: una fila que dice «0 causas que gatillaron la verificación» es ruido con
      la tipografía de un título.
    - **«Verificar» en la cabecera del deudor sigue siendo el atajo del caso normal**, y cubre sólo lo que al deudor le queda
      PENDIENTE: lo ya resuelto documento a documento no se vuelve a tocar. Re-registrar una verificada no
      cambiaría nada, pero retirar una ya verificada sí, y por eso el alcance se acota en un solo sitio
      (`soloPendientes`) en vez de en cada llamador.
    - **LA RETIRADA SIGUE EN LA MESA, y ése fue el hallazgo.** Retirar una factura la saca de `facturasOp`,
      así que listándolas sólo desde ahí la evidencia de «ésta no la confirmó» **desaparecía de la pantalla
      justo después de registrarla** — y con todas retiradas, el deudor entero se esfumaba de la mesa aunque
      su veredicto estuviera congelado, que es lo contrario de lo que la regla 6 pide. Ahora `filasVerificacion`
      arma `docs` con las de la oferta **y** las vetadas: las retiradas se ven, tachadas, y no suman al monto
      porque no están en la oferta. Caso **157**, en sus dos formas: una retirada entre facturas vivas, y el
      deudor con todas retiradas.
    - **El RESPALDO es del documento** (`repoVerifRespaldo`, `{ nota, adjuntos, por, fecha }` por factura).
      Va aparte de `repoVerifTel` —que es el hecho de la llamada— porque se escribe en otro momento y por
      otra razón: el correo del deudor suele llegar antes que la decisión, y el porqué de una no confirmación
      se anota después de retirarla. Del archivo se guarda la **referencia** (nombre, tipo, tamaño, quién y
      cuándo), no los bytes: en producción el documento vive en el gestor documental y NEX apunta a él, igual
      que el respaldo de una excepción de otorgamiento.
    - **VER-01 no se tocó.** El contrato cuenta llamadas registradas por factura y eso es exactamente lo que
      la mesa escribe ahora, documento a documento: el gate del giro sigue diciendo lo mismo.
    - **Lo que la pantalla escondía y sólo se vio al usarla**: marcar y anotar escriben en los repositorios y
      no en `deals`, así que la lista memoizada por `[deals, tick]` no se enteraba y el KPI no se movía.
      Retirar sí cambia `deals` —saca la factura de la oferta— y por eso ése se veía y los otros dos no. Se
      arregla moviendo el tick en las dos acciones; lo midió una sonda de pantalla, no el fuente.
    - Gate de forma: `regla_53.test.mjs`.

57. **LA NOTA DE UNA VERIFICACIÓN ES RICA Y ACEPTA UNA CAPTURA PEGADA** (`NotaRica`, 22-09-2026, pedido del
    usuario: «el editor de texto debe ser un editor rich text que permita pegar un screenshot… al pegar el
    screenshot el sistema igual debe guardarlo como imagen en el file system»). Una verificación telefónica se
    respalda con lo que se VIO —el correo del deudor, la pantalla del portal, el WhatsApp donde confirma la
    fecha—, y obligar a guardar esa imagen a un archivo, buscarla y adjuntarla por separado es justo el paso
    donde la evidencia se pierde.
    - **Son DOS cosas y no una.** La captura queda **inline** en la nota —que es donde se lee en contexto— y
      además **baja al disco** (`guardarImagenPegada`), porque el respaldo de un giro se pide fuera de esta
      pantalla y meses después. Esto es un HTML sin servidor: el único sistema de archivos al que puede escribir
      es la carpeta de descargas del navegador, así que ahí va, con nombre determinista (`nombreCaptura`) para
      poder aparear a mano el archivo con el adjunto registrado.
    - **Y una tercera: entra como ADJUNTO.** La referencia que devuelve el guardado (`{nombre, tipo, tam}`) se
      suma a la misma lista que lo elegido con el selector, porque aguas abajo el respaldo no distingue de dónde
      vino el archivo — y es lo que habilita el botón sin tener que declarar «no hay respaldo».
    - **El texto se pega SIEMPRE PLANO.** Copiar de un correo arrastra su hoja de estilos y la nota termina con
      tipografías y fondos que no son de esta pantalla.
    - **Lo que se guarda se vuelve a pintar SANEADO** (`notaSegura` + `NotaLeida`): lista blanca de elementos
      (`NOTA_TAGS_OK`), ningún atributo sobrevive salvo el `src` de una imagen embebida en `data:` y su `alt`, y
      el árbol se arma en un `<template>`, que es inerte. No es una precaución teórica: `execCommand` pega lo que
      haya en el portapapeles y esto se le muestra meses después a quien audita un giro.
    - **En la bitácora va TEXTO PLANO** (`notaTextoPlano`): una glosa con `<div>` adentro no se lee, y una
      captura en base64 son cien mil caracteres en una fila de log. La imagen se nombra: `[imagen: archivo.png]`.
    - **El `innerHTML` se escribe sólo cuando difiere del DOM.** Reescribirlo en cada render mueve el cursor al
      principio y la nota se digita al revés — el defecto clásico de un `contentEditable` controlado, que no caza
      ningún gate: sólo se ve tecleando.
    - Gate de forma: `regla_57.test.mjs`, con sondas. `atob` y `FileReader` entraron a la lista de globales del
      linter: la lista dice exactamente qué toca esta app.

59. **El tab de Verificación se ve al SIMULAR —informativo—, el chip del deudor dice PRIME y los criterios son del DEUDOR, no de la factura** (22-09-2026, tres pedidos del usuario mirando la pantalla: «cuando se simula debiera habilitarse el tab de Verificación de manera informativa con el detalle de las facturas que se requieren verificar y cuáles no» · «el concepto Lista Blanca ya no se utiliza, prefiero que incluyas ahí el Chip de Prime y la Nota Deudor» · «separa la información de la evaluación de si el deudor requiere verificación de la información de factura; las causas son asociadas al deudor y el quiz de la verificación telefónica a cada factura, pero no los mezcles»). Refina la regla 6 en la pantalla; el predictor no se tocó.
    - **Lo que la compuerta protege es la LLAMADA, no la INFORMACIÓN.** La regla 6 escondía el tab hasta pre-evaluar o publicar, y el argumento —quemar 3–4 horas por un deudor cuyas facturas quizá se retiren— **justifica no dejar llamar, no dejar a ciegas a quien está armando la oferta**. Saber qué va a haber que verificar es justo lo que el ejecutivo necesita ANTES de comprometer un plazo, que es lo primero que dice la regla 6. Ahora el tab aparece **en cuanto hay oferta simulada** (`deal.simulado`) y con facturas; `verifAccionable` —pre-evaluación, oferta cerrada Y publicada, o etapa desde Aceptada— se calcula **aparte** y el tab recibe `informativo={!verifAccionable}`. **La negación, no `deal.simulado`:** las dos expresiones dicen lo mismo hoy y dejarían de coincidir en cuanto se agregue un tercer camino accionable — y el tab quedaría mudo justo donde hay que trabajar.
    - **En informativo no se firma nada.** `puedeAccionar = puedeMarcar && !informativo` gatea las DOS acciones que dejan evidencia: registrar la verificación telefónica y retirar la factura que el deudor no confirmó. Un gate que sólo comprobara que el tab aparece al simular pasaría con el defecto peor puesto. Y el modo **se anuncia** (`soloInforma`): un tab de sólo lectura sin cartel se lee como un tab roto, y quien busca el botón que no está reporta un defecto que no existe. El cartel dice las dos mitades —qué trae hoy la pantalla y qué abre la llamada—. `bloqueado` (Giro/Perdida) **no** lo muestra: ahí la llamada ya es historia y decir «la oferta está simulada y todavía se puede editar» sería falso.
    - **El chip del deudor nombra el SEGMENTO, no la lista de la que salió.** Decía «Lista Blanca» / «Autorizada», y el usuario da el rótulo por retirado. Dice **Prime**, que es la unión Lista Blanca ∪ Deudores Autorizados y es exactamente lo que el predictor usa para recortar el protocolo a 6 criterios. `verifFactura` **propaga `prime`** en sus DOS salidas —la fresca y la congelada; con una sola, el chip desaparecía justo después de la llamada— para que la UI no tenga que volver a comparar contra la cadena retirada. `DEUDOR_LABEL` y `DEUDOR_CHIP` **se eliminaron**: vivían sólo en este tab, y dejarlos habría sido código muerto con el nombre retirado adentro.
    - **La Nota Deudor va ROTULADA.** Era un número suelto entre el chip y el nombre del deudor: nada decía de qué era. Sin nota en el maestro se muestra **`s/n`**, no `0` —que es la peor nota posible— y en gris. El color lo fija `NOTA_COLOR`, y se retiró la copia local `notaCol` que decía lo mismo: dos copias del mismo indicador se separan a la primera corrección.
    - **Los criterios V00–V10 son del DEUDOR y viven en el panel del grupo** (`g.v0`, que abre la cabecera). `verifDecision` los calcula UNA vez sobre el conjunto de facturas del par: repetirlos dentro de cada fila mostraba el mismo dato N veces y —esto es lo que el usuario señaló— **sugería que la factura tenía criterios propios**. No los tiene. La tarjeta del veredicto y el segmento suben al mismo panel.
    - **El quiz telefónico es de la FACTURA**, que es la única pregunta de la verificación que se responde por documento: existencia, recepción conforme y fecha de pago de ESE folio. La fila abre **sólo si hay llamada que mirar** (`tel`) —la pendiente o la ya registrada, que sobrevive al veredicto congelado—: una factura que el modelo dio por verificada no tiene quiz, y su fila no dibuja chevron ni cursor. Ofrecer un panel vacío es peor que no ofrecer nada.
    - Gate: [`tests/contract/regla_verif_informativa.test.mjs`](../../../tests/contract/regla_verif_informativa.test.mjs) (16 tests, 15 sondas) y los casos **`e2e-59-a`** y **`e2e-59-b`**, que abren la pantalla con la oferta simulada **con la sesión del Ejecutivo de verificación** —con cualquier otra, «no aparece el botón de firmar» es cierto por el permiso y no por la compuerta, y la aserción no vigila nada— y prueban las dos direcciones: informativo sin botones, y pre-evaluado con ellos. No hay caso de suite: `VerificacionTab` es un componente y la suite no monta componentes (`.claude/rules/testing.md`).

71. **LA VERIFICACIÓN FALLIDA MARCA Y AVISA, NO RETIRA: EL EJECUTIVO RETIRA, RE-SIMULA Y VUELVE A PUBLICAR PARA UNA NUEVA
    FIRMA** (23-09-2026, ADR-0018, M-18, G-11 en M-18 · G-36; el usuario: «si el verificador no verifica una factura, la
      operación debe quedar marcada con un issue, se debe notificar al ejecutivo con un mensaje de que no se podrá cursar
      porque la oferta tiene facturas que no pudieron ser verificadas y el ejecutivo deberá abrir la operación y sacar esas
      facturas de ese deudor no verificado, volver a simular, y volver a ejecutar el proceso de publicar la oferta para que
      el cliente firme la nueva operación»). Antes la mesa retiraba SOLA al marcar: la operación encogía con la firma
      vigente (la mitad de la regla 13 que hablaba de la verificación) y nadie le avisaba al ejecutivo.
    - **Marcar es escribir el veto, y nada más.** `marcarNoVerificada(id, facs, gestion)` es el ÚNICO escritor de
      `repoNoConfirmadas` —los tres caminos de la mesa (`verificarDeudor` parcial, `marcarFactura`, `noConfirmoDeudor`) y
      el diálogo del tab Verificación del detalle pasan por ahí—: escribe el veto con actor, hora y motivo, deja el evento
      en la bitácora de otorgamiento y avisa; NO toca `facturasOp`, NO emite versión, NO mueve la etapa ni la firma. La
      factura sigue en la oferta, vetada: `estadoCandidata` la bloquea cuando salga (regla 6, casos 25 y 95).
    - **El issue tiene una sola fuente.** `verifResumenDeal` cuenta las marcadas que siguen en la oferta (`noVerif`,
      `noVerificadas`) —siguen contando en `pend`, así que VER-01 manda igual (regla 41) y dice qué hacer— e
      `issueVerificacion(deal, estado)` lo pone en palabras: «Facturas no verificadas: no se puede cursar», deudor y folios,
      y la instrucción. Lo muestran la tarjeta del tubo (chip rojo), el tab Verificación del detalle (banner) y el bloque
      de pendientes del detalle; el control VER-01 lo nombra.
    - **El aviso lo firma el sistema** (`avisarNoVerificadas`, el molde del cierre, regla 50): un hilo por operación
      («Verificación fallida · OP»), al ejecutivo dueño, con la operación, el deudor, cada folio, el motivo y que no se
      cursará mientras sigan en la oferta; se reusa en la segunda marca y calla sin marcadas. Se llama fuera de todo
      updater (regla 22).
    - **Retira el EJECUTIVO, por el camino ordinario.** Abre la operación, «Editar la oferta» (que en una firmada la
      REABRE y revoca la firma, regla 1 y regla 33), retira las facturas del deudor —o más, o pierde la operación con
      causa: es decisión suya—, vuelve a simular y publica de nuevo; el cliente firma la nueva operación. Por eso
      `retirarFacturaOferta` perdió la excepción «noConfirmada»: la guarda de sólo lectura aplica siempre y el retiro ya no
      recorta ni emite versión —la versión nueva sale de la simulación siguiente sobre el paquete nuevo—. El recorte sin
      re-asignar (`recortarAsignacion`) queda para el rechazo del comité (regla 69).
    - **La mesa lo muestra sin duplicar**: la marcada que sigue en la oferta viene de `facturasOp` con estado
      `no_verificada` y suma al monto (está en la oferta); la que el ejecutivo ya retiró sigue en la mesa desde el veto,
      como antes (caso 157); el estado del deudor se deriva de sus documentos. Ningún rótulo promete retirar: el botón del
      detalle dice «El deudor no confirmó · marcar», el pie del panel «Marcar no verificada».
    - Caso **167** (el resumen y el issue nombran la marcada, VER-01 la cuenta y la nombra; la mesa la lista una vez y
      deriva el deudor; el aviso del sistema al ejecutivo, reusado y mudo sin marcadas; el veto bloquea) y
      `regla_71.test.mjs` (el único escritor que no retira ni versiona, los tres caminos y el diálogo, el retiro sin
      excepción, el issue en cabecera, tab y VER-01, el aviso, los rótulos, la mesa sin duplicar: once sondas). La
      pantalla sigue por e2e (CP-138 a CP-142).

75. **LA NC, EL RECLAMO O LA CESIÓN A OTRO SOBRE UN DOCUMENTO DE UNA OFERTA CERRADA, PUBLICADA O FIRMADA LO INHABILITAN Y
    DEJAN LA OPERACIÓN NO CURSABLE: EL EJECUTIVO RETIRA, RE-EVALÚA Y VUELVE A FIRMAR** (23-09-2026, ADR-0021; el usuario:
      «se debe dejar la oferta como no cursable, el documento debe quedar inhabilitado, el ejecutivo debería retirar la
      factura, re-evaluar, volver a firmar. Cuando una factura está reclamada, anulada y/o cedida a otro, quiere decir que
      el deudor no va a pagar esa factura (no la reconoce; por lo que es como que esté no verificada, al margen que la
      verificación telefónica haya dado por verificada), si está cedida a un tercero, al momento de intentar cederla el
      SII va a rechazar la cesión de esa factura»). Cierra la decisión #7 que ADR-0020 dejó abierta: hasta entonces la
      actualización sobre la oferta cerrada sólo avisaba.
    - **El documento queda con su estado nuevo y marcado.** `aplicarActualizacionDTE` (regla 74) lo parcha también en la
      oferta cerrada, publicada o firmada, y cuando lo que llega es la NC, el reclamo o la cesión a otro le pone
      `inhabilitada` (motivo, glosa, secuencia, fecha) y deja la traza en rojo: «queda inhabilitado y la operación no se
      cursa hasta que el ejecutivo lo retire, re-evalúe y vuelva a publicar para una nueva firma». El acuse se anota y no
      inhabilita. La fila de la oferta lo rotula «Inhabilitada en el SII · nota de crédito (folio N)».
    - **El veto es el de la regla 71, escrito por el SII.** El tick del inbound decide las inhabilitaciones sobre la foto
      vigente del tubo, FUERA de todo updater (regla 22), y las escribe por el ÚNICO escritor del veto,
      `marcarNoVerificada`, con origen «sii»: `por` es `SII · DTESync`, la entrada anota `origen` y `cambio`, la bitácora
      de otorgamiento dice «SII · DTESync inhabilitó N documento(s)…» y el aviso al ejecutivo (`avisarNoVerificadas`) sale
      con el asunto «Documentos inhabilitados en el SII · OP» y dice por qué: el deudor no va a pagar un documento
      reclamado, anulado o cedido a otro, tenga o no la verificación telefónica en verde. Un veto por motivo y operación;
      la re-entrega no lo repite (`secuenciaDTE`).
    - **Cuenta como pendiente aunque la llamada esté en verde.** `verifResumenDeal` cuenta todo documento vetado —por la
      llamada o por el SII— como `tel` y `pend` ANTES de mirar la llamada, así que VER-01 (regla 41) sigue mandando y lo
      dice: «N inhabilitada(s) en el SII: reclamo, nota de crédito o cesión a otro». `issueVerificacion` lo nombra aparte
      con su motivo y titula «Documentos inhabilitados en el SII: no se puede cursar» (o «Facturas no verificadas e
      inhabilitadas en el SII…» si hay de las dos); la tarjeta del tubo suma «· N en el SII»; `estadoCandidata` etiqueta
      «Inhabilitada en el SII» con la instrucción; la mesa lo lista como no verificada (regla 71).
    - **Rótulo corregido por el usuario (23-09-2026):** «Inhabilitada **por** el SII» → «Inhabilitada **en** el SII», en
      todos los textos de PANTALLA —la candidata, la fila de la oferta, el título del issue, el asunto del aviso, VER-01 y
      la tarjeta del tubo—: el rótulo dice **dónde** está inhabilitado el documento, en el registro del SII, no quién
      actuó. El veto sigue firmado por «SII · DTESync», que ése sí es el autor, y los comentarios que describen el veto
      («escrito por el SII») tampoco cambian. **ADR-0021 conserva la redacción con que se decidió**: los ADR son
      inmutables (regla núcleo 7) y esto es un rótulo, no una decisión.
    - **Retira el EJECUTIVO, por el camino de la regla 71**: «Editar la oferta» (reabre y revoca la firma, reglas 1 y 33),
      retirar el documento, volver a simular y publicar de nuevo; el cliente firma la nueva operación. El veto impide
      volver a agregarlo.
    - **La cesión a otro es de la misma familia** (`bloquea` incluye `cedida`): hoy la trae el join con el A2 al incorporar
      (regla 64) y la pérdida de la oportunidad por cesión sigue en `evaluarPerdidas`; cuando exista el evento del A2
      sobre un documento ya en la oferta cerrada, entra por este mismo camino.
    - **El detalle abierto ve el veto que escribió el tubo**: `onStorageVeto` relee `repoNoConfirmadas` por el evento
      `storage`, como las versiones (regla 72).
    - Caso **171** (la decisión pura en las dos direcciones y el lote; el veto del SII plantado cuenta como pendiente con
      la llamada en verde; el issue, VER-01 y la candidata lo dicen con su motivo; mezclado con el veto de la llamada, y
      sólo con la llamada; el aviso con su asunto, reusado, y el de la llamada intacto) y `regla_75.test.mjs` (la decisión
      marca y devuelve el documento; el tick escribe por el único escritor y fuera del updater; el escritor firma como el
      SII; el resumen cuenta antes de la llamada; el issue, la candidata, el aviso, VER-01, la tarjeta, la fila y el
      oyente; dieciséis sondas). El caso 170 (d) pasó a fijar la inhabilitación. La pantalla queda por e2e cuando el
      stream sea determinista (CP-145).
