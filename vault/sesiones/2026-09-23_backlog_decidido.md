---
type: sesion
title: "Sesión 2026-09-23 — El backlog decidido, en rojo primero: ADR-0013 a 0019, antigüedad, corte por reloj, M-19 y el acuse"
description: "Implementación de las decisiones del proceso de curse, un ADR por commit con su regla, su gate y la cadena de verificación completa; empieza por la candidatura (cedida ajena, antigüedad, acuse) y sigue con el cierre, el giro, el corte del día, el comité, los visados, la verificación fallida y el evento de evaluación"
tags: [sesion, curse, inbound, adr, backlog]
timestamp: 2026-09-23T05:30:00Z
feature: proceso-curse
---

# 23-09-2026 · El backlog decidido, en rojo primero

Con las cinco confirmaciones respondidas y mezcladas a `main`, el usuario pidió seguir con el backlog del
tablero: ADR-0013 a 0019, la antigüedad configurable, el corte por reloj, M-19 en el backend y el acuse en
el activo. Un ADR por commit; cada uno con su regla en el vault (siguiente entero libre, desde la 60), su
caso en la suite o su gate, y los seis pasos de verificación. Antes de tocar el fuente, cinco exploradores
en paralelo mapearon el filtro del inbound, el cierre y el comité, el giro y la verificación, las versiones
y los visados, y la infraestructura de pruebas; los extractos quedaron en los resultados de la sesión, no
en el vault: son la foto de un día.

## 0 · Dos cosas que aparecieron antes de empezar

- **`main` llegó sin pasar por Prettier**: un ternario de `VerificacionTab` partido en dos líneas hacía
  fallar el paso 0 sobre el propio `main`. Se corrigió en su commit (`d2027a1`) sin tocar conducta.
- **El A1 ya trae el acuse.** `EstadoDTE` tiene `Aceptado` («2» en 21.974 de las 30.000 filas, con
  `FchAcuseRecibo`), `Reclamado` (2.088), `NotaCredito` (1.487) y 4.451 filas sin nada — o sea que «sin
  acuse» existe en el dato. Lo que falta es que `facturaDeDTE` lo LEA y que el layout lo declare: M-01 es
  más chico de lo que el spec de curse y el informe de gaps decían («el A1 no la trae»), y no exige
  regenerar `datos_inyectados.js`. Se corrige en el commit de M-01.

## 1 · ADR-0014 · La cedida a un factoring ajeno no es candidata (regla 60, caso 159)

**Qué cambió.** «Buena factura» exige ahora una cuarta condición, `!cedidaAFactoringAjeno(f)`, sobre la misma
fuente que ya usaba la incorporación (`cesionDeFactura`, el índice del A2 por `RUT del cedente|folio`); el
perfil de la Bandeja nombra «Cedida a otro factoring (excluida)»; y `estadoCandidata` deja de bloquear la
cedida a Security: la devuelve agregable, rotulada «Cedida a Security» (antes «Ya financiada», bloqueada).
Los casos 95 (fijaba el bloqueo de la nuestra) y 121 (contaba como no capturada toda OTRO con nota sobre
el corte, sin descontar la cedida ajena) se corrigieron con la regla.

**Medido sobre el archivo** (caso 159, 8.000 filas del stream): 192 facturas cedidas a un factoring ajeno
excluidas, 0 capturadas; 266 cedidas a Security capturadas. El A2 trae 7.396 cesiones, 4.534 a Security.

**Lo que costó / sorpresas.**
- **`f.cedida` nunca se asigna** en el fuente: sólo se lee (nueve sitios) y siempre es `undefined`. La cesión
  real sale del índice del A2; el campo es un resto. Queda anotado, no se tocó.
- El evento del stream que evalúa `CRITERIO_PRED` **no lleva el folio en la raíz**: va en `facturasOp[0]`
  (`streamDesdeDTE`). El predicado nuevo lo busca ahí primero y cae a la raíz para los eventos armados a
  mano en la suite.
- La sonda del caso 159 borra la cesión del índice memoizado (`cesionesPorDocumento()` devuelve el `Map`)
  y la restaura en `finally`: así el caso prueba que la exclusión sale del A2 y de nada más.

**Documentos:** `spec-inbound-facturas.md` §3, §11 fila 1 y §12.1 cierran el desfase; el spec del curse
(§5, §14, §15 fila 6 y su conteo: 26 implementadas · 11 distinto), el informe de gaps (M-09, G-06
«cerrado: implementado»), HU-03 (vigente) y CP-007/008 (caso 159) quedan con la medición.

**La capa e2e cazó lo que la suite no podía.** Con la suite en 159/159, diez casos de pantalla cayeron a la vez
(12-bis-b, 13-terdecies, 13-sexdecies a–d, 14 a–c, 59-a): todos agregan «la primera factura agregable» del pool de
la operación del Directorio, y esa factura es una cedida a Security. `estadoCandidata` ya la dejaba agregar, pero
`motivoExcl` —el closure del detalle que decide qué factura de la oferta cuenta— seguía excluyéndola como «Ya
financiada por Security»: entraba y no contaba, «Tienes 1 factura elegida» no aparecía y «esta operación» no
cuadraba con «Total oferta». Se corrigió `motivoExcl` (sólo la cesión ajena excluye), las dos listas de candidatas
rotulan «Cedida a Security» (el `SHORT_EST` del candado perdió sus dos claves de cesión propia) y la regla 60 quedó
con gate de texto propio, `regla_60.test.mjs`, que fija las tres piezas con sonda cada una: la cuarta condición, la
candidata agregable y el motivo de exclusión. Lección: una regla que dice «entra» se fija en TODOS los sitios que
deciden si una factura cuenta; `grep cesionDeFactura(` los enumera (cinco). Y el gate nuevo se equivocó dos veces
antes de quedar: su ventana sobre el predicado se cortaba en el `{}` del respaldo del evento, y su chequeo global
de «Ya financiada por Security» cazaba el comentario que explica por qué se fue — se quitó: el cuerpo de
`motivoExcl` ya lo fija.

**Y un tercer efecto, de tamaño.** Con las cedidas a Security agregables, «Todo lo disponible» de la primera
operación del Directorio (OP-DIR5) pasó de **17 a 39 facturas**, y el caso `e2e-59-a` —que esperaba 2,5 s fijos
tras el clic— leía las pestañas ANTES de que la simulación aterrizara: la latencia simulada es
`latenciaBaseMs + n · latenciaPorDocMs` (700 + 45·39 = 2.455 ms más el render). Se midió construyendo el fuente de
`HEAD` al lado: mismo gesto, 17 facturas, 1.465 ms. El caso ahora espera a que el panel de arranque se retire, que es
la señal, como ya hacía `14_13_sexdecies`. Un tiempo fijo en un e2e es una apuesta sobre el tamaño del dato.

## 2 · M-10 · La antigüedad máxima desde la emisión, configurable (regla 61, caso 160)

**Qué cambió.** «Buena factura» exige una quinta condición, `!superaAntiguedad(f)`: la factura emitida hace más de
`antiguedadMaxDias` días —contados contra el corte del activo, regla 13-ter— no es candidata. El tope es del tenant
(`CFG_OPER_BASE`, 20 por defecto; sin subir el esquema, regla 39: la clave nueva la absorbe el merge), se edita en
Configuración › Operación («Antigüedad máxima de la factura», al lado de la ventana del libro) y se lee con `pol`. El
perfil de la Bandeja nombra «Antigüedad > N días (excluida)» con el N vigente.

**Medido antes de escribir**, sobre el A1 (`medir_antiguedad.mjs` en el scratchpad): el corte es el 22-06-2026 y las
emisiones van del 06-05 al 22-06; **25.485 de 30.000** facturas tienen 20 días o menos (23.545 ≤ 8; 27.142 ≤ 30;
30.000 ≤ 60), y de las 22.353 «buenas» por documento (crédito, sin reclamo ni NC) 18.984 pasan el tope. O sea que el
filtro deja pasar la mayoría y el demo no se apaga; sobre las 8.000 filas del stream que recorre la suite quedan
**1.215 excluidas por antigüedad, 0 viejas capturadas, 4.823 capturadas** (caso 160).

**Lo que costó / sorpresas.**
- **La raíz del evento del stream traía `diasEmision: 1` FIJO** (`streamDesdeDTE`), así que la Bandeja decía «1d» para
  las 30.000 facturas, y `fechasDocumento(ev)` sobre la raíz daba «ayer» para todas. El documento real va en
  `facturasOp[0].fchEmis`. El predicado nuevo (`diasEmisionEvento`) mira el documento primero, y la raíz ahora lleva
  la antigüedad medida: lo que el filtro aplica es lo que la pantalla muestra. El caso 160 pone raíz y documento en
  desacuerdo a propósito (1 vs 21) para fijar cuál manda.
- **El caso 121 volvió a caer**, como con ADR-0014: contaba como «no capturada» toda OTRO con nota sobre el corte sin
  descontar lo que el filtro excluye por el documento (13 eran más viejas que 20 días). Descuenta también la
  antigüedad.
- **CP-012 apuntaba al sitio equivocado**: pedía leer la exclusión en «el detalle de la tarjeta» (`capacidadDeudores`),
  que segmenta deudores y no facturas. El lugar es el perfil de la Bandeja (`criteriosDesdeFactura`), y así quedó.
- **La pantalla de Configuración se abrió** para ver el campo (el e2e no la cubre): «Antigüedad máxima de la factura»,
  valor 20, mín 1, máx 365. Las capturas de `Capturas_UI/` no se regeneraron: no son deterministas (deuda 2 del
  tablero) y regenerarlas es decisión del usuario.

**Documentos:** spec del inbound (§3 con las cinco condiciones del documento, §5.1, §5.3, §12.6), spec del curse (M-10
implementada; 27 implementadas · 10 distinto), gaps (G-31 cerrado: implementado; 2 implementados · 16 decididos),
HU-05 vigente en CA-1/CA-2, CP-012/120 con el caso 160 (66 cubiertos · 67 nuevos · 100 CP piden caso), regla 61 y su
fila, cifras (160/160; 90 reglas).

## 3 · M-19 · Ninguna excepción sin justificar en la mutación de cierre (regla 62, caso 161)

**Qué cambió.** `cerrarOferta` re-comprueba las excepciones mudas (`compuertaExcepcionesMudas` sobre
`excepcionesSinComentario`) después del monto y antes de armar `patchCierre`, y devuelve la negativa con «Cierre
rechazado · N excepción(es) sin justificar». `solicitarAprobacionExc` rechaza la solicitud sin comentario, respaldo ni
declaración (CA-4 de HU-25). Y «Enviar de todos modos» de la Pre-evaluación pasa `sinComentarios: true`: es la
declaración explícita del ejecutivo, y sin ella la pieza anterior habría dejado la pre-evaluación sin solicitar nada, en
silencio — el diálogo lo dice ahora con esas palabras.

**Cómo se probó lo que es un closure.** `cerrarOferta` vive dentro de `PipelineComercial`, así que la suite prueba la
compuerta PURA que él llama (caso 161: cinco mudas reales del motor sobre una operación sin evidencia del contrato,
caso 85) y el gate de texto `regla_62.test.mjs` fija que la llama y retorna antes de escribir. Es el mismo reparto que
la regla 59: lo puro por su nombre, lo cableado por su texto.

**Lo que costó.** `solicitarAprobacionExc` deja tarea, hilo y pre-evaluación al aceptar: el caso limpia los cuatro
repositorios en `finally` (`repoSolicitudExc`, `repoPreEval` con `difundir=false`, `repoHilos` por `hilosDeDeal`,
`PANEL_TAREAS` por `ops`) para no dejar rastro con un id de prueba.

**Documentos:** spec del curse (M-19 implementada, §15), gaps (G-12 cerrado: implementado), HU-25 vigente en CA-1/3/4
(el chip «Operación creada» de CA-2 sigue por e2e, CP-065), CP-064/065/067 (caso 161), regla 62 y su fila, cifras.

## 4 · ADR-0017 · El resultado de líneas entra al giro: con facturas a comité, Giro Normal (regla 63, caso 162)

**Qué cambió.** Quinto hecho por deudor en `asignarGiros`, `sinComite`, declarado en `GIRO_HECHOS` y exigido por GE;
entra por la entrada (`requiereComite`), como los otros cuatro, así que el motor sigue puro (el auditor de aislamiento
no cambió su línea base). El adaptador `girosDeDeal` lo saca de las facturas `REQUIERE_COMITE` de la asignación de la
última versión (`lineaDeVersion`), o de la asignación que le pasen (`est.linea`; `null` = ninguna). La firma del memo
del tubo (`giroResumenDeal`) suma el número de versiones: el hecho se lee de la última, y sin eso la tarjeta habría
seguido con el giro anterior — la misma trampa que ya costó la verificación (regla 22). El chip del deudor nombra la
causa.

**Lo que se decidió al escribir.** El hecho se nombra en POSITIVO (`sinComite`) como sus hermanos (`sinExcepcionDeudor`,
`sinPrimeraOperacion`): GE exige que todos sean `true`, y un catálogo persistido que no lo pida seguiría calificando
Express a un deudor a comité — no hay catálogo persistido hoy (`giroDeal` recibe `est.tiposGiro` y nadie lo pasa), así
que no hubo migración que hacer. La dirección «sin comité» del caso 162 compara el resultado con el motor SIN el hecho
(la misma entrada del caso 78): fija que el quinto hecho no se cuela en falso.

**Documentos:** `spec-modelo-giro.md` (§2 GE con tres condiciones, §2.1, §6, §6.1), spec del curse (M-33 implementada),
gaps (G-20 y G-34 cerrados), HU-37 vigente, CP-104/128 (caso 162; el chip en pantalla sigue por e2e), regla 63 y la 22
ampliada, cifras.

## 5 · ADR-0019 · El corte y el reinicio por reloj del tenant; la sin oferta se elimina (regla 64, casos 163–164)

**Qué cambió.** Tres funciones puras nuevas del reloj —`jobDelReloj(cfg, hora)`, `relojSimulado(corridas, cfg)`,
`intervaloJobMs(cfg)`— y tres del corte —`tieneOferta`, `corteDelDia(deals)`, `eventoDeReoriginacion(d, dia)` con
`idReoriginado`—. El cron ya no corta «cada `HORAS_DIA` corridas»: el efecto sobre `corridas` traduce la corrida a una
hora y a la hora de corte cierra el día y corta (`corteDia`: elimina la del inbound sin oferta, deja el cierre en la
bitácora y guarda el evento para el reinicio), a la hora de reinicio devuelve lo eliminado al inbound (`reinicioDia` →
`setAcumulado`) y `correrProceso` lo abre como oportunidad nueva con `referencia` y el id `-R<n>`; `tickCron` sólo abre
dentro de la ventana. `rolloverDia` se fue, y con él `etapaNoGestionada`, `horasDia` y `reaperturaDiaria` (→ `corteDiario`)
en un esquema v3 con migración autocontenida. La Bandeja dice la hora simulada en vez de «hora N/8».

**Lo que se decidió al escribir.**
- **El día de la demo pasa de 8 a 18 corridas** (06:00…23:00, ambas incluidas): la semana de 5 días tarda ~5 min con el
  reloj a 3,5 s por hora, antes ~2,3 min. Es consecuencia directa de «el corte es por reloj del tenant»; el tenant lo
  acorta moviendo las horas o el reloj. Queda dicho para que nadie lo busque como regresión.
- **El evento del reinicio va por `acumulado`**, como cualquier factura del stream, y la corrida de esa hora lo origina:
  así hereda el tope de 40 por corrida, el cupo tentativo, la contactabilidad y el ejecutivo por el mismo camino que
  todas, y «las facturas que llegaron entre el corte y el reinicio» se juntan solas porque `correrProceso` agrupa por
  cedente. El id nuevo lo trae el evento (`opId`), porque `ev.opId` es determinista por RUT y habría reproducido el
  eliminado.
- **La migración v3 repite la v2 en vez de llamarla**: el gate de la regla 39 evalúa el literal `cfgOper` aislado con
  `new Function`, así que una referencia a `MIGRACIONES.cfgOper[2]` habría reventado el gate. Está escrito en el
  comentario de la propia migración.
- **`intervaloJobMs` casi quedó muerta**: el auditor la cazó (sólo la usaba la suite); viaja ahora en la traza de la
  corrida, que dice el intervalo del job en producción. Y la sonda «renombrar sin subir el esquema» de `regla_40` tenía
  el «2» escrito a mano: ahora baja a 1 la versión que haya.
- **La regla 61 había quedado intercalada** entre las viñetas de la 60 (M-10 la insertó tras la viñeta equivocada); se
  devolvió a su orden en este commit.

**Documentos:** spec del inbound (§6 el reloj, §10.4 el job, `topeDocsCorrida` → `topeBandeja`), spec del ciclo (§17),
spec del curse (M-07 y M-08 implementadas; §15), gaps (G-02, G-03, GD-07 cerrados), HU-08 y HU-09 vigentes,
CP-019/020/121/022/023/143 (casos 163–164), regla 64 y punteros en 22 y 9-bis, cifras.

## 6 · ADR-0015 · El comité que rechaza retira, versiona y reabre (regla 65, caso 165)

**Qué cambió.** `api3EstadoProceso` resuelve también «Rechazada» (residuo 1 del mock, con `observacion`) y escribe el
desenlace por línea de detalle; `rechazoComiteDecision` (pura) decide qué facturas salen, la versión `comite_rechazo`
con la asignación recortada y el patch que reabre —Oferta, `enEdicion`, `reabierta` si había firma—, o la pérdida con
causa `committee_reject` si no queda factura; `aplicarRechazoComite` escribe, y lo dispara «Consultar estados» de
Líneas › Solicitudes (`onRechazo`), una vez por solicitud. La bandeja y el detalle de la solicitud pintan «Rechazada».

**Lo que costó / sorpresas.**
- **El caso 126 cayó** con la primera versión: la API 3 escribía el estado por línea en CADA consulta y el caso compara
  la huella de una solicitud que viaja entre pestañas quitando sólo lo que «la consulta de estado escribe después»
  (`estado`, `refrescos`, `tsEstado`). Escribir las líneas mutaba la huella. Se decidió que el estado por línea es
  el DESENLACE: se escribe sólo cuando el proceso resuelve, que es además lo que el contrato dice.
- **El mapa de colores de los estados vive en dos componentes** (la bandeja y el detalle de la solicitud): el script
  de edición y la sonda del gate tuvieron que aplicar a los dos, o «Rechazada» habría quedado con el color de «En
  gestión» en uno de ellos sin que nada lo dijera.
- **El caso 125 elegía sus ids por el desenlace del mock** con un helper propio (`finDe`): al sumar un tercer
  desenlace, su búsqueda del «Aprobada» podía caer en un «Rechazada». Se le enseñó el residuo 1.
- **El demo verá rechazos de verdad**: el primer proceso de una sesión es `PRC-2601` y su residuo es 1. Con tres
  «Consultar estados» la solicitud vuelve rechazada, la operación se reabre y el ejecutivo la publica de nuevo. Queda
  dicho para que no se lea como un error.

**Documentos:** regla 65, punteros en 13, 15 y 5, contrato de la API 3 (Integraciones y swagger), spec del curse (M-29;
M-18 a medias: la mitad de la verificación va con ADR-0018), gaps (G-19, G-33 cerrados), HU-35 vigente, CP-095/096/133
(caso 165; CP-126/127 siguen por e2e), cifras.

## 7 · ADR-0016 · La excepción que la versión N ya no levanta se marca, no se borra (regla 66, caso 166)

**Qué cambió.** `reevaluarCliente` llama, tras emitir la versión y con su número, a `marcarExcepcionesQueYaNoAplican`:
la decisión pura `excepcionesQueYaNoAplican` compara las claves con solicitud o visado contra lo que la evaluación vigente
levanta y marca lo que ya no levanta —solicitud `estado: "no_aplica"`, visado `"no_aplica"` conservando la decisión en su
detalle, `{desdeVersion, por: "sistema", fecha}`—; la mutación escribe los tres repositorios, cierra la tarea del aprobador
con el motivo (la tarea conoce su `stKey` desde `solicitarAprobacionExc`), postea en el hilo como `CODE_SISTEMA` (y lo
termina sólo cuando no queda excepción por visar), audita y deja bitácora. `excSinVisar`/`solVigente` son las únicas
lecturas del visado y de la solicitud en los doce lectores (`visadoDealCalc`, `faseOtorgDeal`, `excepcionesSinComentario`,
avisos, mesa, contadores, tab): la marca no es decisión, y si la regla vuelve a levantar está pendiente otra vez; la
solicitud nueva anota `version` y lleva la anterior en `anteriores`; el visado nuevo hereda la historia (`historiaVisado`).
El tab muestra «↺ Excepción anterior · ya no aplica desde la versión N · sistema · hora» en el criterio cumplido y una lista
propia para las huérfanas (deudor fuera de la oferta); la bandeja de Tareas dice «Cerrada por el sistema» y el motivo.

**Lo que costó / sorpresas.**
- **Qué regla usar de fixture no era obvio**: `evaluarOtorgItems` pisa las variables versionadas con `varsModeloExt(deal)`
  (pagaré, cliente nuevo, mora interna…), así que de todo lo que `snapVersionCli` regulariza sólo cambian de disposición
  las que el modelo no recalcula en vivo. Medido en la página sobre seis cedentes: C07 «Cupo suficiente» (`mntLinea`) o C02
  según el cliente; O05 nunca (la evidencia del contrato es de la operación). El caso usa el cedente del libro y C07, y
  para el visado usa D19 del segundo deudor quitándole la factura: la clave `n@rut` deja de existir y se marca igual.
- **La guarda del script de edición se cazó a sí misma**: el patrón «ningún `!st[…stKey]` suelto» encontró el `!st[stKey]`
  del propio `excSinVisar`. El gate exige `.stKey` (acceso a propiedad), que es lo que distingue un lector de la definición.
- **El gate de OTG-01 nombró el camino del sistema**: `marcarExcepcionesQueYaNoAplican` escribe `repoVisado.set` sin
  `puedeAprobarExc`, porque no hay apoderado. Se eximió con condición comprobada —lo que escribe sale de la decisión pura
  y el tramo no escribe «aprobado» ni «rechazado»— y con sonda: si el sistema aprobara, el gate lo nombra.
- **El hilo es por operación, no por excepción** («Aprobación de excepciones · OP»): cerrarlo al marcar una excepción
  escondería las que siguen pendientes. Recibe el aviso siempre y se termina cuando no queda nada por visar.
- **Abrir la pantalla mostró la marca escondida**: con la maniobra de CP-124 (Directorio › «Sin línea» › «Todo lo
  disponible» › 76 solicitudes › «Re-evaluar simulación») se marcaron cinco criterios del cliente (C02, C07, C35–C37,
  «desde v2») y el tab no mostraba NINGUNA «↺ Excepción anterior»: el criterio cumplido cae en `okRows`, que vive dentro
  del colapsable «N regla(s) aprobada(s)». Se le dio un balde propio (`antRows`), siempre a la vista, con su sonda.
- **El gate de la regla 35 fijaba la línea de `okRows` como texto** («las no ejecutadas no caen en el balde de las
  aprobadas»): el balde nuevo la extendió y el gate cayó con su sonda. Se re-ancló —la condición de la 35 sigue siendo
  obligatoria y el patrón admite condiciones adicionales—, no se aflojó (ADR-0006).
- **Deuda anotada, no tocada**: `PANEL_TAREAS` es un `let` de módulo sin storage ni aviso (la familia de la regla 51),
  así que la tarea creada y cerrada en el DETALLE no existe para la pestaña del tubo: «Tareas» no la muestra ni abierta
  ni cerrada. Es anterior a esta regla y va al tablero.

**Documentos:** regla 66 (puntero en la 4), fila en `invariantes.md`, spec del curse (M-21 implementada: 33 · 6 · 1; §15),
gaps (G-14 y G-35 cerrados; 11 implementados · 7 decididos; GD-06 escrito), HU-32 vigente (27 · 15), CP-087/088/125 con
el caso 166 (CP-124 sigue por e2e), `spec-gestion-excepciones.md` §3, §5.5 y §11, cifras (166/166; 95 reglas; 56 archivos
de gate, 46 por regla; 473 tests).
