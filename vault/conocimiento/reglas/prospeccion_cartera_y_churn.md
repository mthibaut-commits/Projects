---
type: conocimiento
title: "Reglas — Prospección, cartera y churn"
description: "Contactabilidad, asignación de ejecutivo por cedente, las empresas candidatas y los tres fenómenos del churn de cartera"
tags: [conocimiento, reglas, dominio]
timestamp: 2026-09-17T22:12:32Z
---

# Prospección, cartera y churn

> Reglas de dominio de NEX, **verbatim** desde el `CLAUDE.md` anterior al 17-09-2026, agrupadas por tema. Se citan por su número (`regla 10`) y **no se renumeran**: el fuente y otros documentos las referencian así. Índice de todas, con qué caso de la suite verifica cada una: [`invariantes.md`](../invariantes.md).
>
> Reglas en este archivo: **10** · **11** · **16** · **40** · **49**.

10. **Contactabilidad:** mensaje NO entregado ⇒ 1 solo intento y "Error de contactabilidad"; solo se reintenta (hasta 3) si se entrega sin respuesta.

11. **Asignación de ejecutivo por CEDENTE** (cliente), nunca por deudor. Reglas de prospección solo consideran Lista Blanca/Autorizados/históricos del último año **y la población Nota Deudor > 4,2** (`deudorAbreOportunidad`, Rule-04/05: son las «dos poblaciones» del spec de inbound; *anotado el 17-09-2026 por el caso 120: el texto omitía la segunda*); "Otro" nunca abre oportunidad (agregado manual ⇒ Otorgamiento). Las **empresas candidatas** salen de `proveedores_clientes.json` cruzado con `CESIONARIOS_MERCADO` (cesionarios reales de AECSync, sin nosotros: un candidato por definición no nos cede).

16. **Churn de cartera** (`churnCartera`, `CHURN_SEG`): «operan con otros» son TRES fenómenos con acción comercial distinta — **sólo otros** (churn consumado, reconquistar), **compartida** (wallet a capturar, relación viva) y **perdiendo** (compartida con SOW cayendo: la más urgente). Montos desde la serie semanal de `SHARE_OF_WALLET` (mío vs. total) y el reparto entre el factoring target y el resto desde AECSync. **Quién es «factoring target» lo CONFIGURA el tenant** (ver regla 13-duodecies) sobre el padrón de cesionarios, que clasifica **por RUT** (`CESIONARIOS_CAT`, espejo de `GeneradorDatos/lib/cesionarios.js`): el clasificador buscaba el trozo «ita» para encontrar «Itaú» y con eso daba **Eurocapital** por factoring de banco —«eurocap·ita·l»—, así que el churn le atribuía al target negocio que se había llevado otro, el KPI «SOW factoring target» del dashboard quedaba inflado y la alerta comercial «esta empresa cede facturas al factoring target (BCI · Banco de Chile · Itaú)» se levantaba nombrando a tres que no habían participado. Un trozo de tres letras adentro de un nombre propio no es una clasificación — **la identidad es el RUT**, misma lección que el A24. El padrón se indexa además por nombre porque varios call sites sólo tienen la razón social, y un nombre que no declara NO es banco. Las glosas del churn **derivan** la enumeración de la configuración (`targetNombres()`): escritas a mano nombraban «BCI · Banco de Chile · Itaú» sobre una clasificación que decía otra cosa. `COMPETIDORES_FACTORING` también sale de él: dos listas de cesionarios se desincronizan y la sintética empieza a producir nombres que el clasificador no sabe ubicar. Corregido el 15-09-2026, caso 99.

40. **La Bandeja Inbound es una VENTANA, tiene tope, y lo que el tope bota se DICE** (18-09-2026, reporte del usuario: «el contador de otras empresas sube y baja en la simulación, ¿por qué?»).
    - **El síntoma medido**: con el stream corriendo 70 s, el contador del tab «Otras Empresas» osciló entre **1 y 13** y **bajó en 18 de 45 mediciones**, para quedarse quieto recién cuando el stream se drenó. No era un cálculo raro: la bandeja (`streamFeed`) se arma con `[...lote, ...feed].slice(0, TOPE)`, así que es una **ventana deslizante** sobre el stream y el tab cuenta lo que hay **ahora** dentro de ella.
    - **El defecto de fondo era el nombre de la perilla.** `topeDocsCorrida` estaba documentada como «tope de documentos procesados por corrida (control de carga)» y se usaba —en su **único** sitio— como el **tamaño de la bandeja**. En 60, contra `loteStream: 250`, la bandeja **no alcanzaba a guardar ni un lote**: botaba casi todo lo que entraba, y con ello facturas de la cartera del ejecutivo que nadie había mirado. Un nombre que miente sobre lo que hace una perilla es lo que deja pasar un default absurdo durante meses: nadie compara «60» contra «250» si cree que son cosas distintas.
    - **Queda `topeBandeja`, en 500** —dos lotes completos—, con su rótulo y su ayuda diciendo qué es y qué pasa al pasarse. El esquema sube a `cfgOper: 2`, que es para lo que existe (`cargarCfgOper` absorbe claves nuevas sin subir el esquema; **renombrar** una sí lo sube).
    - **Lo que sale primero es lo que NO ES DE NADIE** (`recortarBandeja`, pura y de nivel módulo). El stream trae **30.000 documentos** y la bandeja guarda 500: recortar es inevitable, así que lo que se decide es **a quién se le bota el trabajo**. Salen, de la más antigua a la menos, las facturas de **empresas fuera de cartera** —que nadie está esperando—; una de la cartera sale sólo cuando ya no queda otra cosa que botar, y entonces se cuenta **aparte** y el aviso se pone rojo. Medido en el caso 142: con el criterio viejo —cortar por el final sin mirar de quién era— de 40 facturas de cartera en un lote de 250 sobrevivían **cero**; con el nuevo y tope 100 sobreviven **las 40**.
    - **El contador del tab cuenta las MISMAS filas que la tabla dibuja.** Al agrupar el inbound por cliente, contar facturas dejó el tab diciendo «Todos 262» sobre una tabla de **307 filas** (medido). Las dos cosas salen ahora de `agruparInboundPorCliente`, de nivel módulo y pura: el contador es `.length` de lo que se lista. Es la misma contradicción que persigue el modo Directorio («65 sobre una lista de 5»), y por eso «Todos» **agrupa igual que la pestaña** en vez de apilar una fila por factura — con la bandeja en 500, eso dejaba la tabla en ~570 filas.
    - **Y el recorte NUNCA es silencioso.** La bandeja tiene que tener tope —si no, crece sin fin—, pero lo que sale se **cuenta** y se dice: un aviso en la Bandeja Inbound («N factura(s) salieron de la bandeja por el tope») y un `logSys("warn", "inbound", …)`. El tab lleva además en su **tooltip** de dónde sale el número y por qué se mueve: sin eso, verlo subir y bajar no tiene explicación en pantalla. Es la misma regla que la 35: algo que desaparece de la pantalla sin decirlo es peor que el problema que esconde.

49. **El stream del inbound se reparte POR ROL, y el rol `inbound` existe** (21-09-2026, pedido del usuario: «asígnaselas a un usuario que tenga el rol inbound y que le liste sólo esas empresas que no están asignadas; los ejecutivos sólo pueden ver las empresas de su cartera»). Las filas «Sin clasificar» no son oportunidades: son facturas del A1 que ninguna regla del inbound priorizó todavía, agrupadas por cedente y visibles sólo con el toggle Inbound encendido.
    - **El rol existía como trabajo y no como rol.** Repartir las empresas sin dueño lo hacía la jefatura de paso, así que no había a quién asignárselo ni forma de distinguir «nadie lo está mirando» de «lo está mirando quien corresponde». Se dio de alta `inbound` en `ROLES_CAT` y el usuario **`IB · Tomás Alcaíno · Ejecutivo de Inbound`** con ese rol en `ROLES_DEFAULT`. El selector de sesión itera `USERS`, así que aparece solo: no hay una segunda lista que mantener.
    - **Quién ve qué, en una sola respuesta.** `ofOtrasVisible` es el único predicado y lo usan los DOS contadores y la lista: el **ejecutivo** ve sólo las empresas de SU cartera (`esCliente` y él es el dueño); el **rol inbound y la jefatura** ven sólo las que no son de la cartera de nadie, que es lo que hay que repartir.
    - **EL DEFECTO QUE ESTO CIERRA:** «Otras Empresas» filtraba por rol y **«Todos» no**. `inboundCount` contaba `streamFeed` entero, así que un ejecutivo leía en «Todos» un total que incluía la cartera de sus colegas y las empresas sin dueño — filas que su propia tabla nunca le mostraba. Es el mismo desacuerdo contador/tabla que la regla 40 corrigió en el otro sentido (contar facturas contra una tabla de filas agrupadas), y estaba a la vista desde entonces.
    - **La compuerta del toggle se conserva**: con el Inbound apagado la tabla no dibuja ninguna fila del stream, así que el contador va a 0. Perderla sería volver a dejar el contador por encima de la lista. Gate `regla_40.test.mjs`, que ahora exige las tres cosas —filas agrupadas, mismo filtro por rol y la compuerta— con una sonda por cada una.

63. **LA FACTURA CEDIDA A UN FACTORING AJENO NO ES CANDIDATA DEL INBOUND; LA CEDIDA A SECURITY SÍ** (23-09-2026,
    ADR-0014; decisión del usuario del 22-09-2026 al revisar el modelo de curse: «sólo si está cedida a una
    empresa diferente a Factoring Security; si está cedida a Security sí se puede agregar»).
    - **La cuarta condición de «Buena factura»**: a crédito, sin reclamo, sin nota de crédito **y no cedida a otro
      factoring** según el A2 (`cedidaAFactoringAjeno`, sobre `cesionDeFactura`: la misma fuente que ya usaba la
      incorporación). Antes el inbound contaba la cedida y la bloqueaba recién al incorporar, así que el monto con
      que se dimensionaba la oportunidad traía facturas que nunca se iban a poder comprar
      (`Specs_Procesos/Evaluacion_Factura/spec-inbound-facturas.md` §11 lo declaraba como desfase con el PDF).
    - **La cedida a Security no se excluye ni se bloquea**: es cartera propia, no competencia. `estadoCandidata` la
      devuelve agregable, rotulada «Cedida a Security» (antes «Ya financiada», bloqueada; el caso 95 fijaba lo
      contrario y se corrigió con esta regla). La cedida a un factoring ajeno sigue bloqueada al incorporar, con el
      nombre del factoring y la fecha.
    - **Y la oferta la CUENTA.** `motivoExcl` —lo que deja una factura de la oferta fuera del negocio— excluye sólo la
      cedida a un factoring ajeno; «Ya financiada por Security» dejó de ser motivo. Se vio en la capa e2e, no en la
      suite: la primera factura agregable del pool del Directorio es una cedida a Security, entraba a la oferta y no
      contaba —«Tienes 1 factura elegida» no aparecía, «esta operación» no cuadraba con «Total oferta»— y diez casos
      de pantalla cayeron a la vez. Las dos listas de candidatas la rotulan «Cedida a Security». Gate de texto:
      `regla_63.test.mjs` (la cuarta condición, la candidata agregable y el motivo de exclusión, cada uno con sonda).
    - **El perfil de la Bandeja nombra el motivo** («Cedida a otro factoring (excluida)»), como nombra el bloqueo de
      riesgo: la diferencia entre «no tenemos regla para esto» y «otro se la llevó» es la que explica por qué no
      se captura.
    - Caso **159**, en las dos direcciones y con sonda: el mismo evento sin su cesión en el índice del A2 vuelve a
      calificar, o sea que la exclusión sale del activo y de nada más.

64. **LA ANTIGÜEDAD MÁXIMA DESDE LA EMISIÓN ES CONDICIÓN DE CANDIDATURA DEL INBOUND, Y EL TOPE ES DEL TENANT** (23-09-2026,
      M-10 · G-31, decidido el 22-09-2026 sin ADR: «necesitamos implementar un criterio para ir a buscar facturas que
      tengan cierta antigüedad, ejemplo no más de 20 días desde su emisión, con eso basta»). «Buena factura» exige una
      quinta condición, `!superaAntiguedad(f)`: la factura emitida hace más de `antiguedadMaxDias` días —contados contra
      el corte del activo, regla 13-ter— no es candidata, porque nadie la va a comprar y contarla inflaba el monto con
      que se dimensionaba la oportunidad. El tope vive en `CFG_OPER_BASE` (20 por defecto), se edita en Configuración ›
      Operación («Antigüedad máxima de la factura») y se lee con `pol("antiguedadMaxDias", 20)`: el valor del código no
      manda (regla 9-bis). Medido sobre el A1: 25.485 de las 30.000 facturas tienen 20 días o menos contra el corte, así
      que el filtro deja pasar la mayoría.
    - **«No más de 20» incluye el día 20** y excluye el 21. La «lista de emisores con tags» y la cesión previa quedaron
      DESCARTADAS como criterios (M-10, segunda vuelta): el que entra es éste.
    - **El filtro mira el DOCUMENTO, no la raíz del evento.** El evento del stream lleva la factura en `facturasOp[0]`
      (con su `FchEmis`) y en la raíz traía `diasEmision: 1` fijo, así que la Bandeja decía «1d» para todas;
      `diasEmisionEvento` mide el documento y `streamDesdeDTE` estampa esa misma antigüedad en la raíz: lo que el
      filtro aplica es lo que la pantalla muestra.
    - **El perfil de la Bandeja nombra el motivo con el tope vigente** («Antigüedad > 20 días (excluida)»), como nombra
      la cesión ajena y el bloqueo de riesgo.
    - Caso **160**, en las dos direcciones y con el tenant moviéndose: 5 y 20 entran, 21 sale; con 10 sale la de 15,
      con 30 entra la de 21; sin la clave en la configuración persistida rige el 20 de `CFG_OPER_BASE`; y sobre 8.000
      filas del stream ninguna captura supera el tope y ninguna fila de la Bandeja lleva el 1 fijo.

67. **EL CORTE Y EL REINICIO DEL DÍA SON POR RELOJ DEL TENANT; AL CORTE LA OPORTUNIDAD SIN OFERTA SE ELIMINA Y AL REINICIO
    VUELVE COMO OPORTUNIDAD NUEVA, CON ID PROPIO Y REFERENCIA** (23-09-2026, ADR-0019, M-07 · M-08 · M-02, G-02 · G-03; el
      usuario: «Hoy el corte es por corridas (demo) pero en producción será un continuo. Las oportunidades que han sido
      gestionadas por el ejecutivo (tienen oferta) no se eliminan»). El job del inbound REINICIA el día a `horaInicio`
      (06:00 por defecto) y CORTA a `horaFin` (23:00): entre las dos corre la corrida; fuera, no se abre nada. El
      conteo de corridas no decide: `jobDelReloj(cfg, hora)` dice qué toca y `relojSimulado(corridas, cfg)` traduce la
      corrida de la demo a una hora del reinicio al corte (18 corridas por día con los defaults; antes eran 8 por
      `horasDia`, que se retiró). `frecuenciaMin` dejó de ser declarativa: `intervaloJobMs(cfg)` es el intervalo del job
      en producción.
    - **«Gestionada» es la oportunidad que TIENE OFERTA** —el ejecutivo la simuló: etapa Oferta o posterior (`tieneOferta`)—
      y no se toca al corte, cualquiera sea su etapa. Un paquete elegido sin simular no es oferta todavía (regla 12-bis):
      se elimina como cualquier otra. El criterio es funcional, no una etapa configurable: `etapaNoGestionada` se retiró
      de la configuración (esquema `cfgOper` v3) para que ningún valor del tenant haga que el corte elimine una con
      oferta.
    - **Al corte se ELIMINA** (`corteDelDia`, pura sobre la lista; `corteDia` la aplica): la oportunidad del inbound sin
      oferta deja de existir para el ejecutivo y para el tubo, y la bitácora del sistema registra el cierre con su id,
      su cedente y su paquete. Nada de lo eliminado tiene versiones, visados ni verificaciones colgando.
    - **Al reinicio vuelve como ORIGINACIÓN, no como reapertura** (regla 5): `eventoDeReoriginacion` la devuelve al
      inbound como un evento más —su paquete entero más lo que llegó del mismo cedente entre el corte y el reinicio— y
      `correrProceso` la abre con id propio (`idReoriginado`: el de la eliminada más `-R<n>`, nunca el mismo), con
      `referencia` a la eliminada, sin simular y con la oferta vacía. «El id no cambia» (ADR-0004, regla 22) sigue
      valiendo para todo lo que SOBREVIVE al corte.
    - **El esquema v3 migra lo guardado** (regla 39): retira `etapaNoGestionada` y `horasDia`, renombra
      `reaperturaDiaria` → `corteDiario` conservando la elección, y suelta las horas que eran el default viejo sin efecto
      (08:00 / 18:00) para que manden 06:00 / 23:00; una hora que el tenant cambió se conserva. La migración es
      autocontenida a propósito: el gate de la regla 39 evalúa el literal aislado.
    - Casos **163** (el reloj: 22:59 no corta y 23:00 sí, 05:59 no reinicia y 06:00 sí, la ventana, las horas movidas, el
      reloj simulado, el intervalo y la migración) y **164** (el corte: la sin oferta y la elegida sin simular se
      eliminan; la simulada, la publicada, la de otorgamiento, la de giro y la manual quedan idénticas; la simulada a las
      22:59 sobrevive; el evento del reinicio con `-R1` y referencia). `regla_67.test.mjs` fija lo cableado: el efecto
      corta por `r.corte`, la corrida no abre fuera de la ventana, el corte elimina, el reinicio devuelve al inbound, la
      nueva lleva `referencia`, y la pantalla no ofrece etapa ni llama declarativa a la frecuencia.
