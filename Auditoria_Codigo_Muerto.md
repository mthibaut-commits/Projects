# Auditoría de código muerto y de rutinas que no deberían existir

**Fecha:** 14-09-2026 · **Fuente:** `pipeline_comercial.jsx` (~23.500 líneas, 870 declaraciones de nivel módulo)
**Herramienta:** `node auditar_muerto.mjs` (`--csv` para el inventario en crudo)

Dos preguntas distintas, y conviene no mezclarlas:

- **Código muerto** — existe y nadie lo alcanza. Se borra.
- **Rutinas que no deberían existir** — se ejecutan, y el problema es que hacen algo que no tiene
  sentido: un libro de ventas que se re-sortea, una fecha de emisión que cambia sola, un cache que no
  se entera de lo que cambió. Ésas no se borran: se arreglan, y algunas son defectos vivos.

> **Cómo leer los números.** El analizador se equivocó cuatro veces mientras se escribía —contaba
> `...spread` como acceso a propiedad, no conocía `async function`, cortaba la lista de props en el
> `{}` de un valor por defecto y trataba las sentencias de nivel módulo como parte del símbolo
> anterior— y las cuatro veces el error fue en la dirección peligrosa: **declarar borrable algo que la
> app usa**. Cada hallazgo de este documento está verificado a mano contra el fuente. La lección va
> escrita en el propio script: en esta herramienta un falso positivo no es ruido, es borrar código vivo.

---

## 1. Código muerto — inventario para borrar

### 1.1 Símbolos de nivel módulo sin ninguna referencia (5)

| Línea | Símbolo | Qué era | Por qué está muerto |
|---|---|---|---|
| 1500 | `notaEmpresa` | lee `NOTA_COMPORTAMIENTO` del activo A11 por RUT | **Duplica a `notaDeudor`**, que hace lo mismo y además resuelve por razón social. Quedó al portar la nota al activo A11: se escribieron las dos y se cableó la otra |
| 1564 | `CLIENTE_ESTADO_LBL` | etiquetas de los cuatro estados del cliente | Ninguna pantalla muestra el estado del cliente |
| 2602 | `SIM_VAR_LBL` | índice `id → label` de las variables de simulación | El mantenedor lee `SIM_VARIABLES` directo |
| 2605 | `SIM_RESULTADOS` | catálogo de resultados de la simulación | Sin consumidores |
| 2680 | `simCfgEsBase` | «¿la configuración de simulación es la de fábrica?» | Sin consumidores |

### 1.2 Mencionados sólo en comentarios (2)

| Línea | Símbolo | Menciones | Nota |
|---|---|---|---|
| 396 | `POLITICA_VERSION` | 1 | Además **ejecuta `politicaVigenteEn(Date.now(), …)` al cargar el bundle**: trabajo y una lectura del reloj para un valor que nadie usa |
| 12379 | `NIVEL_ROL` | 6 | El mapa nivel→rol que **INC-01/INC-03 retiraron**. Los seis comentarios son historia —explican por qué el ruteo es hoy `(área, nivel)`— y hay que **conservarlos**, pero redactados como pasado: hoy afirman un presente que no existe |

### 1.3 Estado de React que nadie lee ni escribe (6)

| Línea | Estado | Consecuencia |
|---|---|---|
| 6075 | `telV / forceTel` | Se declara y nunca se usa. **Ojo:** `forceTel` sí se llama en `registrarTel`, y lo que consigue es un re-render por efecto colateral — ver §2.3 |
| 6466 | `otorgNota / setOtorgNota` | Muerto |
| 6467 | `otorgArch / setOtorgArch` | Muerto |
| 6471 | `causaForm / setCausaForm` | Muerto. Resto del modelo de causas de desvío retirado el 11-09 |
| 6548 | `cierreMenu / setCierreMenu` | Muerto |
| 20975 | `diaModal / setDiaModal` | **No es sólo ruido:** el setter se llama UNA vez y con `null` (un reset). `diaModal` es siempre `null`, así que **el modal de cierre de día no se abre nunca**. O falta quien lo abra, o el modal sobra |

### 1.4 Estado que se lee y nunca se escribe — constantes disfrazadas (5)

No son código muerto: se leen y deciden. Lo que no existe es la **edición** que su forma promete.

| Línea | Estado | Qué significa |
|---|---|---|
| 4420 | `alertF` | Filtro de alertas fijo |
| 6488 | `vencDias` | Días de vencimiento por defecto, fijos |
| 6494 | `spreadDeudor` | **El override del spread por deudor no existe.** El valor se calcula al montar el detalle —el spread pactado si la operación ya se simuló, el sugerido si no— y no cambia nunca. Los cinco `spreadDeudor[d] != null ? … : spreadSugerido(…)` siempre toman la rama del mapa inicial |
| 20890 | `channel` | Canal fijo |
| 20918 | `dealTabInicial` | Pestaña inicial fija |

`reevTick` (6468) es un caso aparte: el setter se llama cuatro veces y **nadie lee el valor**. Funciona
—cambiar estado re-renderiza— pero por efecto colateral, y no se entiende leyendo la línea.

### 1.5 Sin uso en la app, vivos sólo por los scripts (2)

| Línea | Símbolo | Veredicto |
|---|---|---|
| 1563 | `CLIENTE_ESTADOS` | **Conservar.** Es el catálogo que el caso 77 fija como contrato de la API de estado del cliente |
| 11797 | `giroDeal` | **Revisar.** Lo prueba el caso 82 —«la asignación congelada al aceptar manda sobre el recálculo del día»— y **ningún punto de la app lo llama**. O sea que la congelación del giro está implementada y probada, y no ocurre en el producto |

### 1.6 Props que se pasan y el componente no declara (1)

| Línea | Qué | Consecuencia |
|---|---|---|
| 20457 | `<PCcliente agg={aggScope}>` | `PCcliente` espera `resumen` y lo usa en su primera línea (`resumen.total.toLocaleString()`). **Con `resumen` indefinido eso lanza `TypeError`** — ver §2.1 |

El analizador reportó un segundo caso, `<DashCard className="block">`, y es **falso positivo**: ese
`className` está en un `<span>` anidado dentro del prop `sub`, no en `DashCard`. La expresión que
recorta un uso de JSX no entiende anidamiento, así que puede atribuirle a un componente los props de
sus hijos. Queda anotado en el script: esta sección se lee como *candidatos*, no como hallazgos.

### 1.7 CSS

**`t16` se usa y no está declarada** (línea 15145, el título «Resumen por ejecutivo»). Es exactamente el
defecto de `t14`, que estuvo en quince lugares sin regla: el elemento hereda el tamaño del padre y
queda de un tamaño distinto en cada pantalla, por accidente y sin error. La escala llega hasta `t15`
(18 px). Ninguna clase propia declarada quedó sin uso.

---

## 2. Rutinas que no deberían existir

### 2.1 `ReportesView` — una vista entera inalcanzable, con su pestaña de entrada rota

`vistaApp` sólo se escribe desde `irA(v)`, y `irA` sólo se llama con los **diez** valores de `VISTAS`
(los nueve de la navbar + Configuración). **`"reportes"` no está en ninguno de los dos.** La rama
`vistaApp === "reportes"` del render no se ejecuta nunca.

Y su pestaña por defecto está rota: `sel` arranca en `"cartera"` y esa rama monta
`<PCcliente agg={aggScope} …>` cuando `PCcliente` espera `resumen`. La primera línea del componente es
`resumen.total.toLocaleString(…)`: **si la vista fuera alcanzable, entrar a ella sería una pantalla en
blanco.** Que el defecto lleve ahí sin que nadie lo note es la mejor prueba de que la vista está muerta.

Además **duplica** contenido de la vista «Gestión» (`PanelClientes`), que sí es alcanzable y monta el
mismo `PCcliente` bien, con `resumen`.

> **Es una decisión de producto, no de código, y por eso no se borró:** o la vista sobra y se elimina
> con lo que sólo cuelga de ella, o falta enchufarla a la navbar —y entonces primero hay que arreglar
> el prop—. Lo que no puede quedarse es como está.

### 2.2 La fecha de emisión de una factura se deriva del RELOJ, y con cinco fórmulas distintas

> **CORREGIDO el 14-09-2026.** El usuario lo escaló al leer este hallazgo: «esas no pueden cambiar
> entre una pantalla y otra, y los montos, folios, rut, razón social… la factura se carga y debe
> persistir en el build». Al ir a arreglarlo apareció algo peor de lo que este párrafo describía.

En tres sitios del detalle la fecha de emisión se calculaba así:

```js
const he = Math.abs(hashStr("em" + f.folio)) % 20 + 3;   // antigüedad en días, estable
const em = new Date(Date.now() - he * 86400000);         // …y acá entra el reloj
```

La antigüedad es estable, pero la **fecha** salía de `Date.now()`: el mismo documento decía
`09-09-2026` hoy y `10-09-2026` mañana, y una captura de ayer ya no reproducía. Una fecha de emisión es
un hecho del documento, no una función del día en que se mire. Es la misma familia que el libro de
ventas que se re-sorteaba: **un dato del negocio derivado de algo que se mueve solo.**

Peor: convivían **cinco** fórmulas para el mismo dato — `hashStr("em"+folio) % 20 + 3` en la tabla de
la oferta, `f.diasEmision` en la de candidatas (`f.candidata ? diasEmision : hash`, o sea la MISMA
factura cambiaba de fecha al incorporarla a la oferta, que es exactamente lo que el usuario reportó),
`diasEmision ?? 60` en «otras facturas de este deudor», `hoy + plazo` en el input editable de
vencimiento, y `hashStr(id + "emi") % 20` en `diasEmiCand`.

**Y lo que lo explica todo:** el activo **A1 (DTESync) trae `FchEmis` y `FchVenc` en cada fila**, y el
inbound las descartaba fijando **`venc: 45` a mano**. O sea que el dato estaba, llegaba todos los días,
y la aplicación lo tiraba para inventarlo peor. Dos consecuencias más allá de la pantalla: todas las
facturas del sistema vencían a 45 días —el activo trae **105 plazos distintos**— y el prorrateo, que
descuenta por plazo, cobraba lo mismo por un documento a 30 días que por uno a 90. La carga manual de
XML sí leía las dos fechas, así que una factura cargada a mano tenía fechas reales y una del inbound no.

**Lo implementado:**

| Pieza | Qué hace |
|---|---|
| `corteDTE()` | La fecha de corte del activo: la emisión más reciente del batch. Ancla del sistema, propiedad del DATO y no del reloj. |
| `fechasDocumento(f)` | **El único** resolver: `{emision, vencimiento}` en ISO. Lee lo que el documento trae · lo que el libro le estampó · y sólo entonces un respaldo estable por folio anclado en el corte. |
| `fmtFechaDoc(iso)` | El único formateador. |
| `plazoDTE(r)` | El plazo es la resta de las dos fechas de la fila del activo, en vez del `45` cableado. |
| `corteMs()` | Los tres generadores del alta manual (libro del cliente, facturas a incorporar, respaldo del XML sin `FchVenc`) anclan en el corte y no en `Date.now()`. |

Las cinco derivaciones se retiraron; `diasEmiCand` ahora **mide** contra la emisión y el corte en vez
de sortear. Verificado en el DOM además de en la suite: 51 folios vistos en más de una pantalla, **cero
conflictos**, y las facturas que pasan de «Deudores disponibles» a la oferta conservan emisión y
vencimiento. Caso **93**.

**Lo que este hallazgo enseña para el resto del inventario:** la pregunta no es sólo «¿este código se
usa?» sino «¿este dato se deriva de algo que se mueve?». Un símbolo muerto cuesta lectura; un dato
derivado del reloj o de estado editable cuesta credibilidad, y no lo detecta ningún analizador —lo
detecta alguien mirando la misma factura en dos pantallas.

### 2.3 `_GIRO_LISTA` — un cache que no se entera de la verificación

```js
const firma = `${VISADO_VER}|${fs.length}|${giroTotal}|${deal.stage}`;
```

`girosDeDeal` consulta **otorgamiento y verificación** de cada deudor, y el tipo de giro depende de las
dos (`GE` exige verificación no necesaria **y** sin marcas de excepción). La firma cubre el visado
—`VISADO_VER` se incrementa con `invalidarVisado()`— pero **no el estado de la verificación**: ni
`registrarTel` del detalle ni el de la mesa llaman a `invalidarVisado()`.

**Consecuencia:** registrar una llamada telefónica cambia el tipo de giro de ese deudor y **la tarjeta
del tubo sigue mostrando el anterior** hasta que cambie otra cosa. Es la misma trampa que ya tuvieron
`VISADO_CACHE` —indexado por operación, devolvía la evaluación hecha con otro visado— y `_cacheCli`
—memoizado por RUT, servía el dimensionamiento hecho con otro `otrosDeudoresPct`—.

**Arreglo:** que la firma incluya el commit de la verificación, o que registrar una llamada invalide.

### 2.4 Lo ya corregido en esta sesión, por si sirve de patrón

| Qué | Forma del defecto |
|---|---|
| `candidatasLibro` | El pool se anclaba en la oferta: elegir qué comprar re-sorteaba lo que el cliente había emitido |
| `_cacheCli` | Memo por RUT sin la política en la clave: mover la perilla no cambiaba el resultado |
| `tasaMinAbsoluta` | Declarado dos veces; la compuerta leía la copia que el mantenedor no editaba |
| `stageTrasEdicion` | La etapa avanzaba al tocar el paquete y no al ponerle precio |

Las cuatro son la misma pregunta: **¿de qué depende esto, y tiene sentido que dependa de eso?**

---

## 3. Qué se hizo y qué queda

| # | Hallazgo | Acción |
|---|---|---|
| 1.1 | 5 símbolos sin referencias | **Borrados** |
| 1.2 | 2 mencionados sólo en comentarios | **Borrados**, comentarios redactados en pasado |
| 1.3 | 6 estados de React muertos | **Borrados** (salvo `diaModal`, ver abajo) |
| 1.7 | `t16` sin declarar | **Corregido** a `t15` |
| 2.3 | `_GIRO_LISTA` sin la verificación en la firma | **Corregido** |
| 2.2 | La fecha de emisión sale del reloj, con cinco fórmulas, y el inbound descartaba `FchEmis`/`FchVenc` del activo | **Corregido** — un solo resolver (`fechasDocumento`) anclado en la fecha de corte del activo; caso 93 |
| 1.3 | `diaModal` nunca se abre | **Abierto** — falta decidir si sobra el modal o falta quien lo abra |
| 1.5 | `giroDeal` probado y sin llamador | **Abierto** — la congelación del giro no ocurre en el producto |
| 2.1 | `ReportesView` inalcanzable y rota | **Abierto** — borrar la vista o enchufarla arreglando el prop |
| 1.4 | 5 estados que se leen y nunca se escriben | **Abierto** — cada uno es una edición que la UI promete y no existe |

**La verificación de una poda no es `tsc` ni el build.** Los dos pasan con el login roto: así
desapareció `CUENTAS_DEMO` en la poda anterior y el error sólo apareció al ejecutar. Lo que verifica es
regenerar las capturas, que renderizan las once vistas, más la suite.
