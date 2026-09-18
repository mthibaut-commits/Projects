---
type: sesion
title: "18-09-2026 — cerrar deudas anotadas: hooks, cifras, y dos de los cuatro pendientes de las reglas"
description: "El health check de hooks pasa a ser un comando gateado, el CI sube a @v5, nace cifras.test.mjs (que cazó nueve cifras viejas y otras cinco en la primera mezcla), y de los cuatro pendientes escritos dentro de las reglas se corrigen los dos que son defectos; los otros dos son decisiones, y se explica por qué"
tags: [sesion, hooks, gates, cifras, reglas]
timestamp: 2026-09-18T06:10:00Z
---

# 18-09-2026 — cerrar deudas anotadas

## 1 · El CI, a `@v5`

`actions/checkout@v4` y `actions/setup-node@v4` corren sobre Node 20 en el runner y GitHub ya las avisa como
deprecadas. Suben a `@v5`; el `node-version: 22` de la app no cambia con esto y queda dicho en el YAML.

## 2 · El health check de los hooks es un comando

`node verificar_hooks.mjs`. Antes eran cuatro líneas de bash para copiar de `loop_agentico_hooks.md`, y por eso
quedaba sin correr justo donde más falta hace: la máquina Windows del usuario, la única que el contenedor no
puede atestiguar.

Lo que mide, y por qué cada cosa — un hook de script muere **en silencio** si el shell o el runtime están rotos,
y entonces no protege nada mientras todo parece normal, así que no basta con que la lógica esté bien:

1. Que `settings.json` declare los tres hooks **con su matcher**. Uno bien escrito y colgado del evento
   equivocado no se dispara nunca y se ve igual que uno que funciona.
2. Que `bash` responda: en Windows Claude Code corre los hooks por Git Bash y sin él no corre **ninguno**.
3. **La cadena completa**: el comando tal como está escrito en `settings.json`, ejecutado por el shell con
   `CLAUDE_PROJECT_DIR` puesto. Es la única forma de comprobar que la variable se expande en esa máquina.
4. Cada hook en sus **dos** direcciones. Uno que bloquea todo es tan inútil como uno mudo.

`hooks.test.mjs` lo corre entero en cada rama, así que un hook movido o con el matcher cambiado rompe el CI. Su
sonda negativa planta las cuatro formas de romper el cableado sobre un `settings.json` **plantado**, sin tocar el
del repo. Lo que el CI no puede decir sigue siendo si los hooks corren en Windows: eso se corre a mano una vez.

**Fricción, otra vez.** Escribir `verificar_hooks.mjs` por heredoc disparó `gitflow_guard`: el archivo lleva el
comando prohibido como DATO de su propia sonda y el guard mira el texto del comando. Salida documentada: la
herramienta de archivos, que no pasa por el hook de Bash. Queda en el registro de fricciones y el archivo lleva
la advertencia en su cabecera.

## 3 · `cifras.test.mjs` — que las cifras tengan quién las cuente

Es el hallazgo 2.3 de la auditoría de bootstrap pasando por **tercera** vez. Había tres versiones vivas del
mismo número: `CLAUDE.md` decía 61 reglas de dominio, el tablero 63, la medición daba 62. Ninguna era error de
nadie — no había quién las contara. Copiar los números buenos en un commit no arregla eso; lo arregla que
**rompa** cuando se desfasan.

Dos clases de cifra, tratadas distinto a propósito:

- **Estructurales** (reglas, invariantes del contrato, archivos de gate, casos de la suite y e2e): cambian pocas
  veces y a propósito → **exactas**.
- **Continuas** (líneas del fuente, componentes, peso de `datos_inyectados.js`): cambian con cada edición.
  Exigirlas exactas sería un gate que rompe siempre y que todos aprenden a actualizar sin mirar → **banda**
  ±15/20 %, y los documentos las escriben con `~`.

Y la regla que impide apagarlo sin querer: **si la afirmación ya no está en el documento, el gate falla igual**.
Un gate que no encuentra qué vigilar no es un gate que pasa.

Destapó nueve cifras viejas de una vez (CLAUDE.md 61→62 · tablero 63→62 · `verificacion.md` 24→26 · README y
`arquitectura.md` ~21.000→~26.000 líneas y 118→~155 componentes · README ~24→~33 MB). Y **en la primera mezcla
después de escribirlo cazó otras cinco**: entra la regla 34 y un gate más, así que 62→63 reglas, 26→27 archivos
de contrato y 18→19 gates por regla en dos documentos. Es exactamente el desfase silencioso que existe para
impedir, una hora después de existir.

**Lo que NO mide, y queda escrito**: el número de tests de contrato. Tres archivos los generan en bucle
(`regla_13_octies_bis`, `regla_17`, `regla_30`), así que sólo se sabe corriendo el runner — y ese archivo **es**
el runner. Una cifra que nadie puede comprobar es justo lo que el gate existe para evitar, así que los
documentos citan los **archivos** de gate, que se cuentan mirando el directorio.

## 4 · Los cuatro pendientes escritos dentro de las reglas

Dos eran defectos y se corrigieron. Dos no lo son, y la propia regla lo decía.

### Corregidos

- **27-bis · el `<h1>` de Reportes decía «Gestión de Clientes»**, el nombre anterior al renombre del 16-09. El
  renombre había tocado la navbar, `irA`, la miga y el Command-K; el cuarto sitio se quedó atrás. `e2e-27-bis`
  lo **leía y lo reportaba** —que es precisamente lo que deja vivo un desfase—; ahora lo **exige**.
- **33 · la guarda contra una solicitud duplicada al comité sólo veía su pestaña.** El detalle es pestaña propia
  desde el 02-09-2026, así que cerrar la oferta, cerrar la pestaña y volver a abrir la operación dejaba la
  comparación sin nada y entraba una segunda petición idéntica — y NEX **no puede retirar** la anterior
  (regla 15), o sea que el comité terminaba viendo las dos. La previa se busca ahora primero en
  `SOLICITUDES_LINEA` —que trae el estado vivo del proceso, el que el log nombra— y si no está, en
  `repoSolicitudComite`, un repositorio indexado por operación que guarda lo que el comparador necesita (`rut` y
  `detalle`) y sobrevive a cerrar la pestaña, como el visado. `regla_33.test.mjs` exige **las tres piezas**: con
  dos de las tres la guarda queda ciega sin que nada falle. **Sigue sin cubrir** dos sesiones en paralelo en
  navegadores distintos: no comparten storage, y ahí la segunda entra igual. Queda escrito en la regla.

### No son defectos: son decisiones, y la regla 28 ya lo decía verbatim

- **`OperacionesView` «duplica filas».** Lista `["aceptadas","cesion","otorgamiento","giro"]`, así que una
  operación en otorgamiento o en cesión sin integrar aparece en el tubo **y** en Operaciones. La regla dice:
  *«cambiar qué filas muestra esa pantalla es otra decisión, no un rótulo»*. Es una pregunta de producto —¿la
  operación en otorgamiento pertenece a Operaciones, al tubo, o a las dos?— y no la contesta un commit.
- **`STATUS_ETAPA` no es tenant-aware.** La regla dice por qué: *«es una línea de estado en prosa, no un rótulo
  de etapa, y hay regexes que la parsean para deducir la causa de una pérdida (`/no acept|no tom/`), así que
  migrarla es un cambio aparte con riesgo propio»*. Migrarla sin tocar esos lectores rompe la causa de la
  pérdida en silencio; tocarlos es el cambio, no el rótulo.

### Y uno que no es código

- **13-quater · el A1 no trae `MntNotaCredito`.** El layout del activo trae `NotaCredito` y `FolioNotaCredito`
  pero no el monto, así que no se puede saber cuánto rebaja la nota. Agregarle el campo al activo sintético
  sería **inventar el dato**, que es exactamente lo que la regla 13-quater prohíbe y lo que ese hallazgo
  corrigió. Es una pregunta al dueño del A1: ¿el archivo real trae el monto de la nota de crédito? Si lo trae,
  entra al layout, al generador y al punto fijo; si no lo trae, la regla actual —un documento con nota de
  crédito no se compra— es la respuesta correcta y deja de ser pendiente.

## 5 · La separación por género no es deuda

El tablero la arrastraba como pendiente. **ADR-0001 ya la decidió**: las reglas mezclan los tres géneros
—regla, porqué e historia— oración por oración, separarlas exige reescribirlas, y la decisión fue hacerlo
**regla por regla al tocar cada una**, con la atención puesta en ella. Hacerlo en masa contradice un ADR
aceptado. Sale de deudas y queda como lo que es: cómo se trabaja.

**GN como disyunción (regla 22)** sí sigue pendiente, y es del negocio: el enunciado decía «por verificar **y**
con excepciones» y se implementó como disyunción porque con conjunción una factura por verificar y sin
excepciones no calificaría en ningún tipo y la regla de oro se rompería. Está anotado como supuesto explícito en
la regla y como decisión **abierta** en `adr/index.md`. La pregunta para Mauricio es de una línea: ¿una factura
por verificar pero SIN excepciones va a Giro Normal (hoy sí) o a ninguno?
