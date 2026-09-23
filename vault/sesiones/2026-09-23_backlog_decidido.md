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

## 1 · ADR-0014 · La cedida a un factoring ajeno no es candidata (regla 64, caso 159)

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
rotulan «Cedida a Security» (el `SHORT_EST` del candado perdió sus dos claves de cesión propia) y la regla 64 quedó
con gate de texto propio, `regla_64.test.mjs`, que fija las tres piezas con sonda cada una: la cuarta condición, la
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

## 2 · M-10 · La antigüedad máxima desde la emisión, configurable (regla 65, caso 160)

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
HU-05 vigente en CA-1/CA-2, CP-012/120 con el caso 160 (66 cubiertos · 67 nuevos · 100 CP piden caso), regla 65 y su
fila, cifras (160/160; 90 reglas).

## 3 · M-19 · Ninguna excepción sin justificar en la mutación de cierre (regla 66, caso 161)

**Qué cambió.** `cerrarOferta` re-comprueba las excepciones mudas (`compuertaExcepcionesMudas` sobre
`excepcionesSinComentario`) después del monto y antes de armar `patchCierre`, y devuelve la negativa con «Cierre
rechazado · N excepción(es) sin justificar». `solicitarAprobacionExc` rechaza la solicitud sin comentario, respaldo ni
declaración (CA-4 de HU-25). Y «Enviar de todos modos» de la Pre-evaluación pasa `sinComentarios: true`: es la
declaración explícita del ejecutivo, y sin ella la pieza anterior habría dejado la pre-evaluación sin solicitar nada, en
silencio — el diálogo lo dice ahora con esas palabras.

**Cómo se probó lo que es un closure.** `cerrarOferta` vive dentro de `PipelineComercial`, así que la suite prueba la
compuerta PURA que él llama (caso 161: cinco mudas reales del motor sobre una operación sin evidencia del contrato,
caso 85) y el gate de texto `regla_66.test.mjs` fija que la llama y retorna antes de escribir. Es el mismo reparto que
la regla 59: lo puro por su nombre, lo cableado por su texto.

**Lo que costó.** `solicitarAprobacionExc` deja tarea, hilo y pre-evaluación al aceptar: el caso limpia los cuatro
repositorios en `finally` (`repoSolicitudExc`, `repoPreEval` con `difundir=false`, `repoHilos` por `hilosDeDeal`,
`PANEL_TAREAS` por `ops`) para no dejar rastro con un id de prueba.

**Documentos:** spec del curse (M-19 implementada, §15), gaps (G-12 cerrado: implementado), HU-25 vigente en CA-1/3/4
(el chip «Operación creada» de CA-2 sigue por e2e, CP-065), CP-064/065/067 (caso 161), regla 66 y su fila, cifras.

## 4 · ADR-0017 · El resultado de líneas entra al giro: con facturas a comité, Giro Normal (regla 67, caso 162)

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
gaps (G-20 y G-34 cerrados), HU-37 vigente, CP-104/128 (caso 162; el chip en pantalla sigue por e2e), regla 67 y la 22
ampliada, cifras.

## 5 · ADR-0019 · El corte y el reinicio por reloj del tenant; la sin oferta se elimina (regla 68, casos 163–164)

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
- **La regla 65 había quedado intercalada** entre las viñetas de la 60 (M-10 la insertó tras la viñeta equivocada); se
  devolvió a su orden en este commit.

**Documentos:** spec del inbound (§6 el reloj, §10.4 el job, `topeDocsCorrida` → `topeBandeja`), spec del ciclo (§17),
spec del curse (M-07 y M-08 implementadas; §15), gaps (G-02, G-03, GD-07 cerrados), HU-08 y HU-09 vigentes,
CP-019/020/121/022/023/143 (casos 163–164), regla 68 y punteros en 22 y 9-bis, cifras.

## 6 · ADR-0015 · El comité que rechaza retira, versiona y reabre (regla 69, caso 165)

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

**Documentos:** regla 69, punteros en 13, 15 y 5, contrato de la API 3 (Integraciones y swagger), spec del curse (M-29;
M-18 a medias: la mitad de la verificación va con ADR-0018), gaps (G-19, G-33 cerrados), HU-35 vigente, CP-095/096/133
(caso 165; CP-126/127 siguen por e2e), cifras.

## 7 · ADR-0016 · La excepción que la versión N ya no levanta se marca, no se borra (regla 70, caso 166)

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

**Documentos:** regla 70 (puntero en la 4), fila en `invariantes.md`, spec del curse (M-21 implementada: 33 · 6 · 1; §15),
gaps (G-14 y G-35 cerrados; 11 implementados · 7 decididos; GD-06 escrito), HU-32 vigente (27 · 15), CP-087/088/125 con
el caso 166 (CP-124 sigue por e2e), `spec-gestion-excepciones.md` §3, §5.5 y §11, cifras (166/166; 95 reglas; 56 archivos
de gate, 46 por regla; 473 tests).

## 8 · ADR-0018 · La verificación fallida marca y avisa, no retira (regla 71, caso 167)

**Qué cambió.** `marcarNoVerificada` es el único escritor del veto y no toca la oferta: los tres caminos de la mesa
(`verificarDeudor` parcial, `marcarFactura`, `noConfirmoDeudor`) y el diálogo del tab Verificación del detalle marcan en
vez de retirar; `verifResumenDeal` cuenta las marcadas que siguen en la oferta e `issueVerificacion` lo pone en palabras
(tarjeta del tubo, tab y cabecera del detalle, VER-01); `avisarNoVerificadas` le escribe al ejecutivo dueño como el
sistema (molde de la regla 50). `retirarFacturaOferta` perdió la excepción «noConfirmada» —la guarda de sólo lectura aplica
siempre y ya no recorta ni emite versión—: el ejecutivo pasa por «Editar la oferta» (reabre, revoca la firma), retira,
re-simula y publica de nuevo. La mesa lista la marcada UNA vez y deriva el estado del deudor de sus documentos.

**Lo que costó / sorpresas.**
- **Los casos de prueba del 22-09 imaginaban otro retiro**: CP-119/CP-140 suponían que el ejecutivo retira sobre la
  firmada con `retirarFacturaOferta(id, f, "noConfirmada")` y que la versión «sólo encoge». El ADR dice otra cosa —«abrir la
  operación, sacar esas facturas, volver a simular y volver a publicar»— y ese camino ya existe («Editar la oferta» reabre y
  revoca la firma; la versión nueva sale de la simulación). Se eligió el existente y se dejó dicho en los CP.
- **El gate de la regla 14 (4-bis) fijaba un DEFECTO**: el único emisor de versión incompleto era el recorte de la
  verificación; desapareció con el retiro. El test se dio vuelta —hoy `emisoresCompletos` devuelve `[]`— y la sonda planta
  un emisor incompleto para probar que el gate lo sigue cazando. La sonda de la 53 se re-ancló a la línea nueva del deudor.
- **Abrir la pantalla**: el menú «Verificación» sólo existe para el rol que verifica (hubo que cambiar la sesión antes de
  navegar) y el botón del navbar lleva un badge, así que `irA` (que exige `^…$`) no lo encuentra: se hace clic por texto. El
  panel lateral exige motivo, tres campos de contacto y «sin respaldo» antes de habilitar el pie.
- **La fixture del caso 167**: el primer deudor «tel» de `TODOS_LB` puede ser `LB[0]`, así que la tercera factura —del
  «otro» deudor— caía en el mismo grupo; se elige un RUT distinto. Y `controlesIntegracion` devuelve `{ok, faltas, …}`, no
  una lista.
- **La cabecera del detalle no tenía chip de verificación** (el «Requiere Verificación» vive en la tarjeta del tubo): se
  agregó «no cursa · N» al tab Verificación.

**Documentos:** regla 71 (punteros en la 6 y en la 13), fila en `invariantes.md`, spec del curse (M-18 implementada
entera: 34 · 6 · 0; §15 dos filas), gaps (G-11 en M-18 y G-36 cerrados; 13 implementados · 5 decididos), HU-42 vigente y
HU-33 CA-3 en su dirección nueva (28 · 14), CP-091/119/129/138–142 (caso 167 y `regla_71`; la pantalla sigue por e2e),
`spec-verificacion-facturas.md` §1 y §9, `spec-ciclo-factura.md` §14, cifras (167/167; 96 reglas; 57 archivos de gate, 47
por regla; 486 tests).

## 9 · ADR-0013 · Un evento de evaluación, cinco motores, cinco versiones (regla 72, caso 168)

**Qué cambió.** `evaluarOperacion(deal, usuario, opts)` es el ÚNICO evento: «Simular la oferta» (`simularOferta`, antes de
escribir el negocio y sobre el negocio tal como va a quedar), «Re-evaluar operación» (`reevaluarOperacion`, desde la
cabecera y desde el aviso «La selección cambió») y «Re-evaluación de la simulación» (`reevaluarCliente`, el único que
pide el origen actualizado) son el mismo gesto con otro `origen` y `motivo`. `snapVersionCli(deal, rev, opts)` corre los
cinco motores y devuelve `res`, `verificacion`, `linea`, `giro` (`giroDeVersion`, sobre la asignación recién evaluada) y
`pricing` (`pricingDeVersion`: modo de tasa y condiciones, M-36) más `motoresFallidos`; `versionCompleta` rechaza la
versión a medias (bitácora y auditoría «Evaluación fallida»); `contarVersiones` cuenta por motor y el pill del tab
Otorgamiento lo muestra («N versiones · 5 motores»). `tasaDelNegocio` decide la tasa en un sitio para la pantalla y la
versión. La regularización del origen la pide sólo `opts.origenActualizado`. El rechazo del comité arma su versión con el
mismo `snapVersionCli` (línea recortada). G-09 cerrado: sin marca de recálculo, sin esqueletos del tubo, sin banner; la
bitácora dice «Facturas nuevas … al pool disponible» / «Facturas agregadas al pool».

**Lo que costó / sorpresas.**
- **La pantalla desmintió la primera versión**: «Todo lo disponible» incorpora y simula EN EL MISMO TICK
  (`onSugerirOferta` + `onSimular`), `setDeals` no ejecuta el updater en el acto y `simularOferta` leía `dealsRef.current`
  con la oferta vacía: la v1 salía con `res` y las otras cuatro secciones en `null`. Los tres editores del paquete
  (`incorporarFacturasOferta`, `aplicarSugerencia`, `retirarFacturaOferta`) adelantan ahora la foto al ref
  (`dealsRef.current = …map(upd)`); el render la vuelve a escribir con lo mismo.
- **El tubo no veía la versión**: releer `repoSimVersions` dentro del aviso `nex-simulado` seguía dando 0 —el postMessage
  llega ANTES de que el storage de la otra pestaña se propague al renderer—. Se escucha el evento `storage` del navegador
  (dispara cuando la escritura ya es visible) y se re-emiten las filas con versión: la fila pasó de «Excede la línea
  M$2.212,2» (caída a `evCli`) a «Requiere comité M$2.381» (la asignación de la versión).
- **«2 versiónes»**: el pill tenía `versión{… "" : "es"}` desde siempre; se vio al contar por motor. Corregido.
- **Gates re-anclados, no aflojados**: `regla_70` (la marca la dispara el evento), `regla_14` (4) (la emite
  `evaluarOperacion`; `reevaluarCliente` pasa por él) y (4-bis) (dos emisores: el evento y el comité), `regla_12_bis`
  (la sonda quitaba el primer `simulado: true`, que ahora es el del snapshot del evento y no el del patch).
  `contarVersiones` nació sin lector y `auditar_muerto` lo cazó: el lector es el pill.
- **`asignarLineas` se reemplaza por nombre en el caso 168** para el motor caído: las funciones de nivel módulo son
  bindings globales del script clásico, así que la suite puede sustituirlas y restaurarlas en el `finally`.

**Documentos:** regla 72 (punteros en la 13 y la 14; la 66 y `ui_detalle_y_tubo.md` apuntan al evento), fila en
`invariantes.md`, `spec-otorgamiento.md` §2, `spec-gestion-excepciones.md` §4.1 y §5.5, `spec-asignacion-lineas.md` §4.3
(cinco bloques), `spec-ciclo-factura.md` §23c fila 5, spec del curse (M-13/M-24/M-26/M-36 implementadas: 38 · 2 · 0; §7,
§7.1, §8 y §15), gaps (G-09/G-10/G-22/G-32 y GD-10 cerrados: 17 implementados · 1 decidido), HU-12/13/21 vigentes (31 · 11),
CP-031/033/034/053/054/122/123/134/135 (CP-035/036 y las pantallas siguen e2e), cifras (168/168; 97 reglas; 58 archivos de
gate, 48 por regla; 504 tests).

## 10 · M-01 · El acuse del receptor es una bandera del DTE que el A1 trae y `facturaDeDTE` lee (regla 73, caso 169)

**Qué cambió.** `facturaDeDTE` lee `EstadoDTE.Aceptado` (+ `FchAcuseRecibo`), `Reclamado` (+ `FchReclamo`) y `FchRecepcion`
en tres estados —`acuse`: aceptada · reclamada · sin_acuse— con `acuseCodigo` y `fchAcuse`, sin derivar nada; el stream y el
libro del asistente lo llevan con el documento; `acuseLabel` + `ChipAcuse` lo muestran en las tres filas del documento del
detalle («Con acuse» / «Sin acuse» / «Reclamada», la fecha en el tooltip) y callan sin dato del A1; ningún filtro lo mira
(«Buena factura», `estadoCandidata`, el perfil de la Bandeja); el Excel de candidatas perdió la columna «Aceptada/Reclamada»
que un sorteo por RUT llenaba.

**Lo que costó / sorpresas.**
- **El A1 ya traía la bandera** (§0 lo había medido): 21.974 aceptadas con código «2», 2.088 reclamadas, 5.938 sin acuse
  ni reclamo (4.637 emitidas en los 8 días anteriores al batch). El spec del curse, el informe de gaps y las HU/CP decían
  «no la trae» y pedían layout + generador + activo regenerado: nada de eso hizo falta —`DTESYNC` es dataset base y el
  punto fijo se conserva—. Los documentos se corrigieron en el mismo commit (regla núcleo 2: gana la medición).
- **El sorteo del Excel**: un candidato es proveedor de un cliente, no cliente, y no tiene documentos en el A1; inventar su
  acuse era exactamente el G-01. Se retiró la columna con el sorteo (`u = r()` desaparece; el caso 121 mide propiedades,
  no valores, y sigue verde). El resto del detalle sintético del Excel queda como está, declarado en el fuente.
- **Abrir la pantalla**: las filas de la oferta van agrupadas por deudor y no dibujan facturas hasta abrir un acordeón o
  pasar a «Por factura» (`button[title="Todas las facturas de la oferta en una sola lista…"]`); «Todo lo disponible» vacía la
  lista de disponibles, así que los chips de `filaOtraD` se miran ANTES de simular. Medido: 39 chips en la oferta (33 con
  acuse · 6 sin acuse) = lo que el A1 dice de esas 39 facturas; 17 en los disponibles del arranque (2 reclamadas, con su
  candado); sin errores de consola.

**Documentos:** regla 73 en `datos_y_activos.md` (fila en `invariantes.md`), `spec-inbound-facturas.md` §2 y §3,
`Levantamiento_Activos_Informacion.md` A1, spec del curse (M-01 implementada: 39 · 1 · 0; §16), gaps (G-01 cerrado: 18
implementados · 0 decididos), HU-04 vigente (32 · 10), CP-010/CP-011 (la fila en pantalla sigue e2e), cifras (169/169; 98
reglas; 59 archivos de gate, 49 por regla; 515 tests). El backlog decidido del 22-09 quedó entero.

## 11 · Las pantallas que los commits dejaron dichas: `28_version_v1.e2e.mjs` (e2e-72-a/b/c/d, e2e-73-a)

**Qué cambió.** Cinco casos e2e sobre la fila 0 de «Sin línea» del Directorio, encadenados y cada uno dejando el
estado que necesita si el anterior no llegó: `e2e-72-c` (sin simular: cero versiones, sin titular y sin compuertas
—el pie no existe todavía, la pantalla muestra el panel de arranque—), `e2e-72-a` (dos facturas a mano y «Simular la
oferta»: la v1/rev 0 con las cinco secciones sobre esos dos folios, contemporánea, el TUBO la ve sin recargar y la
auditoría tiene el evento), `e2e-72-b` (cerrar y reabrir: misma cantidad de versiones, misma vigente, mismo titular y
mismo pie), `e2e-72-d` (gear → «Selección de la tasa del negocio» a otro modo → un detalle nuevo lo lee → «Re-evaluar
simulación» deja v2 con el modo nuevo y la v1 conserva el suyo; el `finally` devuelve el modo) y `e2e-73-a` (el chip del
acuse de cada factura de la oferta coincide con el A1 para ese folio; en los disponibles también, y la reclamada sigue
bloqueada en su fila). Citados en `invariantes.md` (filas 68 y 69) y en las reglas; la capa queda en 37 casos en 19
archivos.

**Lo que costó / sorpresas.**
- **CP-036 decía «Por evaluar» sin número**: medido, sin simular el detalle no dibuja el pie —ni otorgamiento, ni
  verificación, ni línea, ni chips de giro— y muestra el panel de arranque; «Por evaluar» es el rótulo de la
  selección cambiada (regla 14). El caso afirma lo que la regla quiere (ninguna cifra) con lo que la pantalla hace.
- **CP-035 paso 4 (mover el A23 en memoria) no se afirma**: en la etapa Oferta el detalle dibuja la evaluación viva;
  leer desde la versión es de la ACEPTADA (regla 13, `regla_12.test.mjs`). Leer la versión también en la oferta sería
  una decisión nueva; quedó dicho en el CP.
- **CP-123 pedía «Re-evaluar operación» sin tocar nada**: ese botón sólo existe con «La selección cambió». El gesto
  del caso es «Re-evaluar simulación» del tab Otorgamiento (el mismo evento) y, si no hubiera re-evaluables, una
  factura más y «Re-evaluar operación». Y el modo cambiado en el tubo lo lee un detalle NUEVO (la config persiste en
  el acto, `guardarCfgOper` en efecto); un detalle ya abierto no.
- **Los ids de los esbozos (`e2e-13-a`, `e2e-HU-21-a`) se escribieron antes de que existieran las reglas 72 y 69**: los
  casos llevan el número de la regla que fijan, como toda la capa.
- **La celda del folio**: el chip está dentro de la celda del tipo; la fila es el `div` de grilla que lo contiene y
  sus hijos son las celdas. La primera versión miraba los hijos del padre de la fila (las otras filas). Y en los
  disponibles la reclamada no lleva el emoji del candado: se rotula «Reclamada por el deudor» y el botón «Agregar» va
  apagado; el caso mira las tres formas.

**Documentos:** `invariantes.md` (filas 68 y 69, cifra de la capa), reglas 72 y 69, CP-034/035/036/123/010 (los
esbozos pasan a casos escritos), HU-13/HU-21/HU-04, cifras (37 casos e2e en 19 archivos), tablero.

## 12 · ADR-0020: el A1 es un flujo de eventos por documento (regla 74, caso 170)

**Qué pidió el usuario.** «Considera que los eventos de dtesync llegan varias veces para la misma factura una vez se
crea (notifica nueva factura), después puede llegar nota de crédito, después aceptación. Considera eso para modelar
el archivo de dtesync.»

**Qué se midió antes de tocar.** El A1 traía una fila por documento con su estado FINAL. `Notificacion` no tenía
relación con las banderas (22.630 `DTE_SINCRONIZADO` · 7.370 `DTE_ACTUALIZADO`, repartidos igual entre aceptadas,
reclamadas y con NC) y las fechas de las banderas eran **tres constantes posteriores al corte**: todos los acuses el
23-06, todas las NC el 24-06, todos los reclamos el 25-06 (emisiones del 06-05 al 22-06, `FchRecepcion` 23-06 en todas).
El archivo va por folio estrictamente creciente (globalmente único), no por fecha. Las banderas son exclusivas
(AC 21.974 · RE 2.088 · NC 1.487 · ninguna 4.451). La documentación de DTE-Sync no fue alcanzable (egreso bloqueado).

**Qué cambió.**
- **El activo**: `migrar_dtesync_eventos.js` (una vez, commiteado como `migrar_padron.js`) expandió cada documento en su
  creación (`DTE_SINCRONIZADO`, `Secuencia` 1, sin banderas, `FchNotificacion` = emisión) más una actualización por
  bandera (`DTE_ACTUALIZADO`: identidad + envoltorio + `EstadoDTE` acumulado, sin repetir el documento), fechada de forma
  determinista (acuse y reclamo 1–8 días desde la emisión, NC 1–30; nunca después de la recepción) y ordenó el log por
  llegada. 30.000 documentos → **55.549 eventos**; el bloque pasó de 22,2 a 32,9 MB y el archivo de 35 a 46 MB. Los
  derivados salieron **byte a byte iguales** (el pliegue reproduce el documento y ninguno lee las fechas de las banderas).
- **El generador**: `lib/dtesync.js` (`plegar` · `expandir` · `ordenarLog` · `validarLog` · `diferenciasDeMigracion` ·
  `resumen`); `derivar` pliega una vez y entrega documentos a los módulos; `generador.test.mjs` pliega antes del
  `dependeDe`.
- **El fuente**: `plegarDTE` + `documentosDTE()` (memo) —los ocho lectores de `window.DTESYNC` pasan por ahí; el stream es
  el único que recorre el log—; `estadoDeDTE` como único lector de `EstadoDTE` (`facturaDeDTE` lo esparce y lleva
  `secuenciaDTE`); `streamDesdeDTE` emite `eventoActualizacionDTE` para las filas con `Secuencia > 1` **sin `FchEmis`**;
  `parcharDocumentoDTE`, `aplicarActualizacionAEvento`, `aplicarActualizacionDTE` (pura: disponibles siempre, la oferta
  mientras sea del ejecutivo, aviso con `avisoDTE` sobre la cerrada/publicada/firmada) y `aplicarEventosADeal`; el tick
  separa las actualizaciones antes de clasificar (`aplicarActualizacionesDTE`: acumulado, bandeja, deals, selected;
  contadores en `actDTERef` que la corrida reporta y pone a cero); «facturas recibidas» cuenta documentos; la Bandeja
  dice «N actualizaciones» y «eventos en cola»; `CONTRATOS_DATOS` esquema 2 y el diagnóstico cuenta documentos y eventos.
- **Suite**: caso 170; los 13 lectores directos de `window.DTESYNC` de la suite pasan a `documentosDTE()` (con el log, un
  `porFolio` por emisor|folio quedaba con la fila slim y el caso 94 caía). `CASOS_ESPERADOS` 169 → 170 (decisión).
- **Gates**: `regla_74.test.mjs` (14 tests: el pliegue del fuente EXTRAÍDO y ejecutado en Node contra el del generador,
  sobre el mismo log en orden y al revés; ningún lector fuera del pliegue y el stream; el tick; el aviso; el contrato;
  doce sondas) y `dtesync.test.mjs` (6 tests: el bloque commiteado valida como log; las funciones con sondas).
  535/535 (59 → 61 archivos, 49 → 50 por regla).

**Lo que costó / sorpresas.**
- **Un documento plegado también tiene `Secuencia > 1`.** La primera versión del stream tomaba «`Secuencia > 1`» como
  actualización, así que `streamDesdeDTE(documentosDTE())` —lo que hacen los casos de muestreo 111, 159 y 160— devolvía
  eventos sin `facturasOp` y la suite cayó con «Cannot read properties of undefined (reading '0')». El discriminador es
  «trae `FchEmis`»: una actualización no trae el documento; una fila que lo trae es un documento, plegado o no.
- **`window.DTESYNC` aparece seis veces en el fuente**, no tres: la sentencia del pliegue lo nombra dos veces y la del
  stream tres. El gate quita las dos sentencias del texto y exige que quede sólo el comentario.
- **El orden**: plegar por folio reproduce EXACTAMENTE el orden del activo plano (folios únicos y crecientes), así que
  `PC_CLIENTES`, el elenco del Directorio y los `.slice(0, 4000)` de la suite no cambian. El log, en cambio, va por fecha:
  el stream arranca con los documentos de mayo (excluidos por antigüedad, ~12 s a 250 eventos por tick) y después llega
  junio. `e2e-31` compara antes/después, no cifras.
- **El aviso sobre la oferta cerrada** se marca en el documento (`avisoDTE`), no en su estado: si se marcara el estado, la
  re-entrega no se distinguiría de la primera; si no se marcara nada, cada re-entrega repetiría la traza.

**Pendiente del usuario** (decisión #7 de `spec-inbound-facturas.md` §12): qué hacer cuando una NC o un reclamo llega
sobre un documento de una oferta **publicada o firmada**. Hoy: el documento no se toca, la bitácora avisa (`exito:
false`) y la corrida cuenta el aviso. La regla candidata es la de ADR-0018 (issue + aviso; el ejecutivo retira,
re-simula y vuelve a publicar).

**Documentos:** ADR-0020 (+ fila en `adr/index.md`), regla 74 en `datos_y_activos.md` (fila 70 en `invariantes.md`, y las
filas de gate `dtesync.test.mjs` y `regla_<slug>` 50), `Levantamiento` A1, `spec-inbound-facturas.md` §2/§6/§12,
`spec-proceso-curse.md` §5 (llegada por eventos, M-01), `GeneradorDatos/README.md` (base y sección nueva),
`arquitectura.md`, HU-01 CA-5 y CP-144, cifras (170/170; 99 reglas; 61 archivos de gate, 50 por regla; ~46 MB), tablero.

## 13 · ADR-0021: sobre la oferta cerrada, publicada o firmada la NC, el reclamo o la cesión a otro inhabilitan el documento (regla 75, caso 171)

**Qué decidió el usuario** (la #7 que ADR-0020 dejó abierta): «se debe dejar la oferta como no cursable, el documento
debe quedar inhabilitado, el ejecutivo debería retirar la factura, re-evaluar, volver a firmar. Cuando una factura está
reclamada, anulada y/o cedida a otro, quiere decir que el deudor no va a pagar esa factura (no la reconoce; por lo que es
como que esté no verificada, al margen que la verificación telefónica haya dado por verificada), si está cedida a un
tercero, al momento de intentar cederla el SII va a rechazar la cesión de esa factura».

**Qué cambió.** Se reutilizó entero el ciclo de ADR-0018 en vez de inventar un segundo mecanismo:
- `aplicarActualizacionDTE`: sobre la oferta cerrada, publicada o firmada la NC, el reclamo o la cesión (`bloquea` incluye
  `cedida`) parchan el documento Y lo marcan `inhabilitada` (motivo, glosa, secuencia, fecha), con traza en rojo; `cambio`
  devuelve el documento para que quien llama escriba el veto. El acuse no inhabilita. `aplicarEventosADeal` devuelve
  `inhabilitadas`.
- El tick (`aplicarActualizacionesDTE`) decide las inhabilitaciones sobre `dealsRef.current` FUERA del updater y escribe el
  veto por el único escritor, `marcarNoVerificada(id, facs, { origen: "sii", motivoLbl })`; el parche del estado sigue por
  su updater, idempotente.
- `marcarNoVerificada` admite el origen «sii»: `por` = `ACTOR_SII` («SII · DTESync»), la entrada anota `origen` y `cambio`,
  la bitácora de otorgamiento dice que el SII inhabilitó; el aviso sigue siendo `avisarNoVerificadas` (ancla de la regla
  67), que con documentos marcados usa el asunto «Documentos inhabilitados en el SII · OP» y explica por qué.
- `vetoDe` (la entrada del veto) al lado de `noConfirmada`; `estadoCandidata` etiqueta «Inhabilitada en el SII» con la
  instrucción; `verifResumenDeal` cuenta TODO documento vetado como `tel`/`pend` antes de mirar la llamada (la llamada en
  verde no destraba) y devuelve `sii`; `issueVerificacion` nombra aparte lo del SII y titula según haya de una o de las dos
  clases; VER-01, la tarjeta del tubo y `motivoExcl` de la fila lo dicen; `onStorageVeto` relee el veto en el detalle abierto.
- Caso 170 (d) pasó a fijar la inhabilitación; caso 171 nuevo; `regla_75.test.mjs` (17 tests) y `regla_74` re-anclado.
  `CASOS_ESPERADOS` 170 → 171 (decisión). Gates 552/552 (62 archivos, 51 por regla).

**Lo que costó / sorpresas.**
- **Las anclas de tres gates vecinos.** `regla_64` planta su sonda sobre `const motivoExcl = (f) => {const c = cesionDeFactura(`
  (la línea nueva va DESPUÉS de la cesión); `regla_72` exige que `onStorage` empiece con su guarda original (el veto tiene
  su propio oyente, `onStorageVeto`, declarado antes); `regla_71` exige `repoNoConfirmadas.set(id, nc); const deudor = …`
  contiguos y la llamada `avisarNoVerificadas(d0, fs, motivoLbl)` tal cual (el origen viaja en `gestion` y en el documento
  marcado, no en un parámetro nuevo).
- **El heredoc de la suite dentro de un comando en segundo plano no dejó rastro**: el script de Python no corrió y la suite
  arrancó sobre el archivo viejo. Se mató la corrida (`pkill -f run_tests.mjs` también mata al shell que lo escribe: exit
  144) y se repitió en primer plano. La edición de la suite va en su propio comando, y después se lanza.
- **`verifResumenDeal` dejaba cursar un documento vetado con la llamada en verde**: la regla 71 decía «cuentan también en
  pend (no tienen llamada registrada)», o sea que dependía de que la llamada no existiera. Ahora el veto cuenta antes de
  mirar la llamada, para las dos clases.

**Documentos:** ADR-0021 (+ índice), regla 75 en `verificacion.md` (+ lista de la cabecera), regla 74 reescrita en la
viñeta que decía «sólo avisan», filas 70 y 71 de `invariantes.md` (+ `regla_<slug>` 51), `spec-inbound` §6 y §12 (#7
decidida), `spec-proceso-curse` §5 y M-18, `Levantamiento` A1, HU-01 (CA-5, reglas y cláusulas), CP-144 y CP-145, cifras
(171/171; 100 reglas; 62 archivos de gate; ~46 MB), tablero.
