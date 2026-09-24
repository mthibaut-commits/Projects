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
> Reglas en este archivo: **10** · **11** · **16** · **40** · **49** · **64** · **65** · **68** · **76** · **77** · **79**.

10. **Contactabilidad:** mensaje NO entregado ⇒ 1 solo intento y "Error de contactabilidad"; solo se reintenta (hasta 3) si se entrega sin respuesta.

11. **Asignación de ejecutivo por CEDENTE** (cliente), nunca por deudor. Reglas de prospección solo consideran Lista Blanca/Autorizados/históricos del último año **y la población Nota Deudor > 4,2** (`deudorAbreOportunidad`, Rule-04/05: son las «dos poblaciones» del spec de inbound; *anotado el 17-09-2026 por el caso 120: el texto omitía la segunda*); "Otro" nunca abre oportunidad (agregado manual ⇒ Otorgamiento). Las **empresas candidatas** salen de `proveedores_clientes.json` cruzado con `CESIONARIOS_MERCADO` (cesionarios reales de AECSync, sin nosotros: un candidato por definición no nos cede).

16. **Churn de cartera** (`churnCartera`, `CHURN_SEG`): «operan con otros» son TRES fenómenos con acción comercial distinta — **sólo otros** (churn consumado, reconquistar), **compartida** (wallet a capturar, relación viva) y **perdiendo** (compartida con SOW cayendo: la más urgente). Montos desde la serie semanal de `SHARE_OF_WALLET` (mío vs. total) y el reparto entre el factoring target y el resto desde AECSync. **Quién es «factoring target» lo CONFIGURA el tenant** (ver regla 13-duodecies) sobre el padrón de cesionarios, que clasifica **por RUT** (`CESIONARIOS_CAT`, espejo de `GeneradorDatos/lib/cesionarios.js`): el clasificador buscaba el trozo «ita» para encontrar «Itaú» y con eso daba **Eurocapital** por factoring de banco —«eurocap·ita·l»—, así que el churn le atribuía al target negocio que se había llevado otro, el KPI «SOW factoring target» del dashboard quedaba inflado y la alerta comercial «esta empresa cede facturas al factoring target (BCI · Banco de Chile · Itaú)» se levantaba nombrando a tres que no habían participado. Un trozo de tres letras adentro de un nombre propio no es una clasificación — **la identidad es el RUT**, misma lección que el A24. El padrón se indexa además por nombre porque varios call sites sólo tienen la razón social, y un nombre que no declara NO es banco. Las glosas del churn **derivan** la enumeración de la configuración (`targetNombres()`): escritas a mano nombraban «BCI · Banco de Chile · Itaú» sobre una clasificación que decía otra cosa. `COMPETIDORES_FACTORING` también sale de él: dos listas de cesionarios se desincronizan y la sintética empieza a producir nombres que el clasificador no sabe ubicar. Corregido el 15-09-2026, caso 99.
    - **AMPLIACIÓN del 23-09-2026 (regla 76):** «Solo competencia» de Reportes › Cliente es el MISMO conjunto que «sólo otros»: el cliente que en la ventana de 8 semanas cede y no nos cede nada (SOW 0). Contaba a los que caían o estaban 10 pp bajo la meta —100 clientes contra 22—. Y el filtro «Operan con otros» de Clientes cuenta lo mismo que la card del Dashboard: sólo otros + compartidas.

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

64. **LA FACTURA CEDIDA A UN FACTORING AJENO NO ES CANDIDATA DEL INBOUND; LA CEDIDA A SECURITY SÍ** (23-09-2026,
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
      `regla_64.test.mjs` (la cuarta condición, la candidata agregable y el motivo de exclusión, cada uno con sonda).
    - **El perfil de la Bandeja nombra el motivo** («Cedida a otro factoring (excluida)»), como nombra el bloqueo de
      riesgo: la diferencia entre «no tenemos regla para esto» y «otro se la llevó» es la que explica por qué no
      se captura.
    - Caso **159**, en las dos direcciones y con sonda: el mismo evento sin su cesión en el índice del A2 vuelve a
      calificar, o sea que la exclusión sale del activo y de nada más.

65. **LA ANTIGÜEDAD MÁXIMA DESDE LA EMISIÓN ES CONDICIÓN DE CANDIDATURA DEL INBOUND, Y EL TOPE ES DEL TENANT** (23-09-2026,
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

68. **EL CORTE Y EL REINICIO DEL DÍA SON POR RELOJ DEL TENANT; AL CORTE LA OPORTUNIDAD SIN OFERTA SE ELIMINA Y AL REINICIO
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
      22:59 sobrevive; el evento del reinicio con `-R1` y referencia). `regla_68.test.mjs` fija lo cableado: el efecto
      corta por `r.corte`, la corrida no abre fuera de la ventana, el corte elimina, el reinicio devuelve al inbound, la
      nueva lleva `referencia`, y la pantalla no ofrece etapa ni llama declarativa a la frecuencia.

76. **REPORTES › CLIENTE Y SOW LEEN LA CARTERA MEDIDA DEL ALCANCE: ninguna cifra de esas pestañas se escribe a mano, y el
    estado de un cliente se mide** (23-09-2026, hallazgos 1–5 de la revisión de Reportes). La pestaña Cliente traía un donut
    escrito a mano (24 %, «$616.032 MM», «$1,93 B»), dos series fijas de 2025 —«Mercado vs Security» y la tendencia por
    zona, con zonas que ni siquiera se llamaban como las del activo—, un toggle «Share of Wallet» que le sumaba 18 a un
    monto en pesos, y una lista fija de ocho «competidores» con BICE, el tenant, adentro. Y «Solo competencia» contaba a
    todo el que cayera o estuviera 10 pp bajo la meta, así que la «Brecha crítica» (más de 20 pp) no podía tener a nadie:
    el que estaba así de lejos ya no era «Security». Ninguna cifra respondía a los filtros.
    - **La ventana es la del churn**: las últimas 8 semanas de la serie del A5 de cada cliente, que es el A2 semana a
      semana (regla 13-undecies). `ventanaSow` la guarda en cada fila de `PC_CLIENTES` (la serie y las dos sumas, en pesos).
    - **El estado se MIDE** (`estadoCartera`): sin ficha en el A5 o sin cesiones en la ventana, **Inactivo**; cede y no nos
      cede nada, **Competencia** (FUGA): SOW 0, el «sólo otros» del churn (regla 16) y el «0 % con nosotros» del pricing
      (`sowEstado`, regla 9); nos cede algo, **Security**, aunque caiga o esté lejos de la meta —eso es su brecha, no otro
      estado— (CAÍDA bajo la meta, como antes). Medido: «Solo competencia» = «Sólo con otros» = SOW 0 del A5 = **22**
      clientes, el mismo conjunto; antes eran 100.
    - **La desviación contra la meta es una PARTICIÓN de los que operan con Security** (`desviacionSow`): defendidos, brecha
      moderada (hasta 20 pp) y crítica (más de 20). El corte es de PANTALLA y tiene nombre (`BRECHA_CRITICA_PP`) para que el
      rótulo y la cuenta no digan números distintos. Medido: **118 / 27 / 66** de 211.
    - **El donut, las series y los competidores salen del alcance**: `sowDeCartera` (lo cedido a Security y a todos en la
      ventana), `seriesCartera` (por semana, en total y por zona de `ZONAS_COMERCIALES`; el SOW de una zona es Security /
      total cedido con `pctSerie`, y una semana sin cesiones no tiene punto), y `competidoresDeCartera` (el A2 por cesionario
      en las semanas de la ventana de cada cliente, con el nombre del padrón y **nunca el tenant**, que el padrón marca
      `nuestro`). Los competidores suman exactamente lo que el donut llama «Competencia».
    - **El filtro «Segmento SOW»** (`segmentoSowCartera`): en o sobre la meta es «target»; bajo ella manda la tendencia del
      A5 —el que cae está «bajando» aunque nos ceda algo—.
    - **«Operan con otros» de Clientes** (`cedeAOtros`) cuenta lo mismo que la card del Dashboard: el que cede algo a otros
      en la ventana (sólo otros + compartidas).
    - **Lo que cambia fuera de Reportes**, porque lee el mismo estado: en Tareas, «Dejó de operar» (retención crítica) queda
      para los 22 que no nos ceden nada, y los que nos ceden algo bajo la meta (CAÍDA) pasan a «Redujo sus operaciones
      Security»; el Plan Mensual trata como «difíciles» a menos clientes.
    - **Lo que NO arregla, anotado en el tablero**: los 25 cedentes sin ficha en el A5 que sí ceden a Security siguen como
      «Inactivos»; «Brecha de wallet» multiplica la brecha por `COLOC_PROM_12M` y no por lo que el cliente cede; y «cedidos
      en el año» rotula un promedio mensual.
    - Caso **172**, `regla_76.test.mjs` (ninguna serie ni lista fija declarada, el estado medido en `PC_CLIENTES`, el donut
      y los gráficos con lo calculado, la desviación y los competidores con sus funciones, el toggle sin el 18, y el filtro
      de Clientes; una sonda por pieza) y `e2e-76` (la pantalla con la sesión de la gerencia: «Solo competencia» igual a
      «Sólo otros» del Dashboard, el donut cuadrado con sus montos, la desviación que suma, los competidores sin el tenant
      que suman la competencia del donut, el eje del SOW en %, y el alcance de un ejecutivo que mueve el donut; en rojo
      contra el fuente anterior: «Solo competencia» decía 100 y «Sólo otros» 22).

77. **LAS CIFRAS DE OPERACIÓN DE REPORTES Y DEL DASHBOARD SE SUMAN SEMANA A SEMANA DEL A1 Y DEL A2, CON UNA SOLA FUNCIÓN
    PARA LAS DOS PANTALLAS** (23-09-2026, hallazgos 6, 7 y 10 de la revisión de Reportes).
    - **Los defectos**: lo facturado salía de `cedido / (0,50 + hash(RUT) % 30 / 100)` —una razón inventada por cliente— en
      el Dashboard y en Performance comercial (medido: el A1 deja a **157 de 233** clientes fuera de esa banda); lo del
      factoring target y lo de los deudores prime se repartían con la proporción de TODO el período (`competenciaDe`, que
      además corta el 22-06, y un 0,85 / 0,6 / 0,4 por segmento para quien no tenía cesiones), así que el SOW prime salía
      idéntico al general por construcción y el KPI «SOW Target Deudores Prime» mostraba el SOW general; y `sowTargetPct`
      —la participación propia frente al factoring target— se calculaba sin que ninguna pantalla la leyera.
    - **Dos índices por semana** (`indicesCartera`, memoizado): el A2 por cedente y semana —total, lo nuestro, lo cedido a
      deudores prime y lo nuestro de eso, y el monto por cesionario— y el A1 por emisor y semana de emisión —lo facturado y
      lo facturado a deudores prime—, leído por `documentosDTE()` (regla 74). El target NO se resuelve al indexar: es
      configuración del tenant (regla 13-duodecies) y se aplica al sumar.
    - **Una sola suma**: `sumarSemanas` (pura; rango de lunes a lunes, bordes incluidos), `filaCartera` (un cliente del A5
      en un rango) y `sumarFilas` (el agregado con sus porcentajes: `sowPrimePct`, `sowTargetPct`, `targetPrimePct`, `null`
      sin base —«no hubo cesiones prime» no es «0 %»—). El Dashboard y Performance comercial las usan las dos: el mismo
      alcance y el mismo rango dan las mismas cifras.
    - **A la vista**: el KPI se llama «SOW deudores prime» y muestra lo ganado en deudores prime sobre lo cedido a ellos; la
      participación frente al target va en el KPI «Ganado (Security)», en la columna «Vs target» de la tabla y de la
      evolución semanal de Performance, y en la card «Cedido a Security» del Dashboard. Las metas «SOW deudores prime» y
      «SOW factoring target» del Dashboard pasan a ser del mes, como el resto de sus cards.
    - Medido sobre el activo: el índice del A1 suma **$1.674.637.402.648** igual que los documentos; el A2 del A5 cuadra
      semana a semana; SOW **64,11 %** y prime **64,36 %**; frente al target, **92,5 %**.
    - Caso **173**, `regla_77.test.mjs` (sin `tasaCesion` ni hash del RUT con «fac», el Dashboard y Performance con
      `filaCartera` y `sumarFilas` y sin `competenciaDe`, el KPI prime con `sowPrimePct` y no con el SOW general, y
      `sowTargetPct` leído por las dos pantallas; con sondas) y `e2e-77` (el Dashboard y Performance comercial dicen lo
      mismo del mes —facturado, ganado, SOW prime—, el rótulo nuevo y la comparación frente al target en las dos; en rojo
      contra el fuente anterior).

79. **EL BENCHMARK POR DEUDOR CUENTA SÓLO OPERACIONES DEL TUBO, Y LA TASA DE LA COMPETENCIA ES LA QUE EL EJECUTIVO
    REGISTRÓ** (23-09-2026, hallazgo 9 de la revisión de Reportes). `benchmarkPor` sumaba cinco operaciones de «histórico
    de mercado» por deudor —clientes ficticios, montos de $50 a $650 que eran millones, un competidor por hash de una lista
    que incluía a «Security Factoring»— y la tasa de la competencia salía de un hash, aunque el ejecutivo la escribe al
    marcar una pérdida por competencia (`tasaCierreCompetidor`, en «Marcar como perdida»). Nadie la leía.
    - **Sólo lo que pasó**: una fila por operación ganada (Aceptada, Cesión, Giro) o perdida ante un competidor; las
      abiertas no entran y sin operaciones no hay benchmark.
    - **La tasa de la competencia es la registrada**; sin registro queda vacía: ni se inventa ni entra al promedio. La
      nuestra, la de la simulación, y sin simular no hay «tasa BICE» (antes, el piso del deudor más 0,8).
    - **La estrategia compara contra lo registrado** —y nuestra tasa en esas mismas operaciones— y, si no hay nada
      registrado, pide registrarlo. La fecha de cada fila es la de la operación, en orden cronológico.
    - Caso **175**.

81. **Las filas «Sin clasificar» del tubo se juntan por RUT, llevan su código de oportunidad, y sólo las ve el gestor
    del pipeline** (24-09-2026, reportado por el usuario mirando el tubo: «¿por qué se ven estas oportunidades?»,
    «ahí debiera ir el código de la oportunidad», «se están mostrando las sin clasificar al ejecutivo Carla y eso no
    debiera ser así: deberían mostrarse al ejecutivo gestor del pipeline, y sólo él ve todo lo que no tiene
    clasificación»). Es el corolario de la regla 46 para el CEDENTE y uno de los 8 sitios del T1 «join de empresas
    siempre por RUT».
    - **Lo que se veía.** Filas con «4 deudores · 5 facturas» y el desglose «0 Prime con línea · 0 Otros con línea ·
      0 deudores sin línea», todas «Sin línea», y en el subtítulo `OF-CONSTRUCTORA Y SERVICIOS NU?EZ SPA` donde la
      fila sana dice `OP-D95265-R2`. Tres síntomas, **una causa**: `agruparInboundPorCliente` agrupaba por
      NOMBRE (`ev.cedente`) y por nombre juntaba a los deudores (`ev.pagador`), y **tiraba el RUT que el evento del
      inbound sí trae** (`rutEmisor`) y el `opId` que ya venía calculado del RUT. La fila salía sin `rutEmisor`,
      `capacidadDeudores` salía por su guarda —`if (!rutCliente) return vacio`— y el desglose quedaba en cero bajo un
      encabezado que la agrupación sí había contado; `lineaDeCliente` no encontraba línea; y el id era
      `"OF-" + nombre`, que es lo que aparecía en el subtítulo. **No es que no tuvieran línea: nadie podía preguntar
      por ella.**
    - **Ahora:** la clave de agrupación es `ev.rutEmisor`, con el nombre sólo de respaldo cuando el evento no trae
      RUT; la fila lleva `rutEmisor` y su `id` es el `opId` del evento (`OP-D<hash del RUT>`, el mismo de la
      oportunidad que ese cedente abre); los deudores se juntan por `rutRecep` y cada uno lleva su `rut`. El evento
      del inbound pasa a traer `rutRecep: r.RUTRecep` —la fila del A1 lo tenía y el constructor lo descartaba— y
      `analisisDeudoresDeDeal` prefiere el `rut` que la fila ya trae antes que resolverlo por nombre.
    - **Dos direcciones, las dos en el caso:** el mismo RUT escrito de dos formas («NUÑEZ» y «Nunez») es UN cedente
      —antes eran dos filas—, y el mismo nombre con dos RUT son DOS cedentes —lo que un join por nombre nunca podía
      distinguir—.
    - **Quién las ve.** Sólo el **gestor del pipeline**, que es el ROL `inbound` (`esGestorPipeline(code)`: `inbound`
      o admin), y ve TODO lo sin clasificar. Antes la ejecutiva comercial veía las de su cartera («Otras Empresas») y
      cualquier no-ejecutivo las que no tenían dueño («Otras facturas»). La visibilidad sigue al rol y no a un código
      de usuario, por lo mismo que la atribución (21-09-2026: el super-admin es un rol). Para los demás, el filtro
      «Otras facturas» queda vacío y su tooltip lo dice.
    - **Y el desglose cuadra con el encabezado, siempre** (mismo día, mirando `SOC ALTAMIRANO Y SOTO LTDA · 7 deudores`
      con 0/0/0: «eso siempre debiera de cuadrar»). `capacidadDeudores` ya no devuelve el vacío sin RUT del cliente ni
      sin su estado de líneas: cuando nadie puede tener línea, los N deudores van a «sin línea» con todo su monto —la
      plata trabada que ese chip existe para mostrar—. **Σ(Prime con línea + Otros con línea + sin línea) = N deudores**
      es la invariante; el vacío queda sólo para cero deudores. El lector no distingue «no hay» de «no se pudo
      preguntar», así que el motor no puede contestar lo segundo con un cero.
    - Caso **178** (la agrupación pura, en las dos direcciones, con el respaldo por nombre, y el desglose que cuadra
      con y sin RUT del cliente) y `regla_81.test.mjs` (la clave por RUT, el `opId` como id, `rutRecep` en el evento, los
      deudores por RUT, la visibilidad por rol y la guarda de `capacidadDeudores`; cada uno con su sonda).
