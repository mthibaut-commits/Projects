# Revisión de las definiciones — otorgamiento, verificación y asignación de líneas

**Fecha:** 11-09-2026.

Se cotejaron los PDF de política, los `.md` de proceso y los layouts de integración contra lo que hoy ejecuta `pipeline_comercial.jsx`. Tres resultados: lo que **el PDF** debe recoger (§1–§3, abajo), lo que se **corrigió en los `.md`** del repo en esta misma revisión (§5) y los **defectos de implementación** que aparecieron de paso (§6).

Los PDF de `Specs_Procesos/` son la **política del negocio**: no se editan desde acá. Este archivo lista,
uno por uno, los puntos en que un PDF vigente ya **no describe lo que el sistema hace**, para que quien
emita la próxima versión sepa exactamente qué tocar. Cada punto dice qué afirma el PDF, qué hace hoy el
código y **por qué** difieren, que casi siempre es una decisión de negocio posterior al PDF.

Tres orígenes distintos, y conviene no mezclarlos:

1. **Decisiones del 11-09-2026** que cerraron la auditoría `Inconsistencias_Motor_Otorgamiento.md`
   (INC-01 a INC-07). El PDF describe el modelo anterior porque es anterior a esas decisiones.
2. **Una versión más nueva del predictor de verificación** que ya existe en el repo como
   `Specs_Procesos/spec-verificacion-facturas.md` y que el PDF v1.1 no incorporó. Ahí el `.md` es la
   fuente normativa vigente y el PDF es el que quedó atrás — su §14 ni siquiera existe: el propio `.md`
   trae una tabla de «qué cambió respecto de la versión anterior».
3. **Un apartado que el PDF dejó «por definir»** y que el negocio resolvió después (la reserva de cupo).

> **Ninguno de estos puntos es un bug abierto.** Todos están implementados, probados
> (`tests_asignacion_lineas.js`, **90 casos** al 14-09-2026) y documentados en los `.md` del repo. Lo que falta es que el
> PDF los recoja.

---

## 1. `Spec_Proceso_Calificacion_Otorgamiento_Verificacion_v1.1.pdf` — parte OTORGAMIENTO

### 1.1 · §3 — La homologación de niveles se retiró

**PDF:** «Homologacion con la matriz del modulo (1=maxima): nivelModulo = 6 - N; Comite se homologa a 1.»

**Hoy:** no hay homologación. `NV` quedó como identidad y **N5 = máxima** en todo el motor.

**Por qué:** la transformación invertía la escala. Una excepción N1 —un pagaré sin firmar— terminaba
exigiendo al Subgerente de Riesgo, y una N5 —180 días de mora ACHEF— la firmaba el Jefe de Grupo
Comercial. El nivel que cada regla necesita es **configuración de la regla**, no algo que el motor deba
transformar (INC-01, decidido el 11-09-2026).

### 1.2 · §3 — El Comité no es un nivel

**PDF:** la tabla de niveles trae una fila `COMITE · Comite de Credito · Riesgo · Constitucion de lineas
nuevas y cambios estructurales`, por encima de N5.

**Hoy:** no existe ese nivel. `C05 · Línea Cliente Nuevo` se configura como todas las demás, con su par
(área, nivel) = **Riesgo N5**, la máxima atribución individual.

**Por qué:** decisión de negocio del 11-09-2026 — *«el comité de riesgo no es un usuario; ahí hay que
definir un usuario y un nivel como en todas las reglas. Todas son iguales.»* C05 era la única regla del
catálogo con el nivel escrito a mano, heredado de esa homologación, y por eso quedaba en el aprobador de
**menor** jerarquía (INC-06).

### 1.3 · §3 — «Cualquier nivel superior» es de la misma área

**PDF:** «el nivel de cada regla es el MINIMO requerido; cualquier nivel superior puede autorizar».

**Hoy:** cierto, con una precisión que el PDF no hace: superior **de la MISMA área**. El ruteo es el par
(área declarada por la regla, nivel declarado por el tramo), y **la escalada no cruza áreas** — un
Gerente General no visa una excepción de Riesgo por mucho que su número sea mayor. Un cargo vacante lo
cubre la jefatura de su propia área. Una regla **sin área no la aprueba nadie**.

**Por qué:** INC-02 e INC-03, decididos el 11-09-2026. Sin la precisión, el área del PDF quedaba como
decorativa y 109 de los 130 tramos de entonces se resolvían por un área distinta de la declarada.

### 1.4 · §3 — N3 figura en el área «General»

**PDF:** `N3 · Gerente General · General`.

**Hoy:** «General» no es un área del catálogo (`AREAS_CAT` tiene comercial, riesgo, operaciones y
verificación), y el Gerente General cuelga de **comercial** en `ROL_ATRIB`.

**Hay que decidir:** o «General» se da de alta como área del tenant —y entonces las reglas que deban ir
ahí lo declaran—, o se acepta que el Gerente General es el tope de la escalera comercial y el PDF dice
«Comercial». Mientras tanto funciona, porque ninguna regla declara `general`; pero la tabla del PDF y el
catálogo dicen cosas distintas sobre la misma persona.

### 1.5 · §3 — Falta: el monto de la operación escala la atribución

**PDF:** no tiene el concepto. Sólo menciona el monto para decir que N5 es «Maxima atribucion individual
(sin tope de monto)».

**Hoy:** son **dos factores** y el requisito es el **mayor** de los dos. El tramo del risk tier mide
cuánto se desvía la variable de riesgo; el piso por monto (`PISO_ATRIB_MONTO`) mide cuánto se arriesga si
ese desvío resulta cierto:

| Monto de la operación | Comercial | Riesgo | Operaciones |
|---|---|---|---|
| hasta MM$20 (leve) | N1 | N1 | N1 |
| hasta MM$60 (moderado) | N2 | N3 | N2 |
| hasta MM$120 (grave) | N3 | N4 | N3 |
| más de MM$120 (crítico) | N3 | N5 | N4 |

Es **piso**, no reemplazo: el nivel del tramo nunca baja por el monto. Y cada columna satura en el tope
de su área —Comercial llega a N3— porque pedirle a un área un nivel que no tiene no exige más: deja la
excepción sin aprobador.

**Por qué:** decisión de negocio del 11-09-2026 — *«el monto sí cambia el nivel de aprobación»*. Es lo
que cerró INC-05 y lo que permitió retirar el modelo paralelo de causas de desvío.

### 1.6 · §6 — El vocabulario de «causas» quedó obsoleto

**PDF:** «(5) cuando TODAS las **causas** estan autorizadas la operacion queda OTORGADA y avanza a giro».

**Hoy:** lo que se autoriza son **excepciones**, identificadas por `stKey`, y lo que libera el giro es
`otorgamientoCompleto`: sin bloqueos firmes, con la aprobación formal del cliente y con el visado
resuelto. El modelo de «causas de desvío» (FL / OD / ON / DI) se retiró entero.

**Por qué:** era un segundo modelo de atribución que convivía con el motor de reglas decidiendo con la
convención opuesta, y su cadena de acción estaba **muerta** — ninguna causa era autorizable desde la
interfaz, así que una operación derivada a otorgamiento manual no tenía salida (INC-05).

### 1.7 · §7 — C47–C50: el carácter calza, falta decir que son por deudor

**PDF:** `C47-C50 · Cartera del par C-D: reclamados/NC/mora/CxC · EXC-COM · >0 N1c (gestion) · re-evaluable`.

**Hoy:** exactamente eso — área comercial, nivel N1, re-evaluables. Lo que el PDF **no dice**, y que el
negocio decidió el 11-09-2026, es que **se evalúan una vez por cada deudor** de la operación y se visan
por deudor (`stKey = "<n>@<rut>"`), como las D. El PDF las lista en el bloque CLIENTE pero las nombra
«del par C-D», y esa ambigüedad es la que se resolvió a favor del nombre.

**Consecuencia para §2 y §6:** donde el PDF dice que las reglas evaluadas por deudor son **D01–D23**,
ahora son **D01–D23 y C47–C50**. Y el layout A16 suma cuatro columnas `*_CD` en la fila `DEUDOR` (ver
`Integraciones/spec_s3_otorgamiento.md`).

> **Historia de estas cuatro reglas, que conviene leer entera.** Hasta el 11-09-2026 **no estaban
> implementadas**: el motor corría 75 de las 79 que la política declara. El 11-09 se implementaron como
> reglas del par, evaluadas y visadas por deudor. El **14-09-2026 se retiraron**: quedaban **dominadas
> por C40–C43**, que miden lo mismo a nivel de cliente con umbral `> 0` — si el par tiene un documento
> reclamado, el cliente también, y C40 ya había levantado la excepción. O sea que nunca podían ser la
> única causa de un visado. El catálogo corre hoy **76 reglas: 75 de la política más O05** (§10.1).
>
> La propiedad que estas reglas custodiaban —que el motor **no deduce el tipo de regla del prefijo del
> código**— sigue viva y cambió de testigo a D01–D04. Y el caso 48 pasó a fijar la decisión al revés: ni
> las reglas ni sus variables pueden volver sin que la suite se caiga.
>
> **Para el PDF:** C47–C50 salen del catálogo ejecutable. Si la política quiere conservarlas, sus
> umbrales tienen que dejar de ser `> 0`, porque con ese umbral no aportan una decisión que C40–C43 no
> hayan tomado ya.

---

## 2. `Spec_Proceso_Calificacion_Otorgamiento_Verificacion_v1.1.pdf` — parte VERIFICACIÓN

Acá el desfase no viene de decisiones del 11-09 sino de que **el predictor tiene una versión posterior**
que vive en `Specs_Procesos/spec-verificacion-facturas.md`. Ese `.md` es la fuente normativa vigente —
trae su propia tabla de cambios respecto de la versión que el PDF describe— y el código lo implementa.

### 2.1 · §10 — Los segmentos se llaman PRIME y OTROS

**PDF:** «segmentos **Elite** y Otros». **Hoy:** **PRIME** y **OTROS**; los nombres `ELITE`/`OTHERS` ya no
existen en el código.

### 2.2 · §10 — La entrada al segmento recortado es una disyunción, no una conjunción

**PDF:** «ELITE exige Nota > 3,7 **+** clasificacion Prime (Lista Blanca) **+** historial de pago
relevante (V10) **+** montos no excesivos (V04)».

**Hoy:** `recortado = prime || nota > 4,2`. Son **dos poblaciones y basta pertenecer a una**: o el deudor
está en Lista Blanca / Autorizados, o su nota supera 4,2. V04 y V10 no son condiciones de entrada sino
**criterios que se evalúan dentro** del segmento.

Van dos diferencias en una: la lógica (conjunción → disyunción) y el umbral de nota (**3,7 → 4,2**, que
es el mismo corte que se usa para dimensionar cupos de línea).

### 2.3 · §11 — V10 es un umbral fijo

**PDF:** `> 20x MntOp o > MM$1.500`. **Hoy:** **> MM$1.000**, fijo, sin mirar el tamaño de la operación
evaluada. Un deudor con MM$1.100 de pagos pasa igual para una factura de MM$5 que para una de MM$400.

### 2.4 · §11 — V05 es «≥ 4 meses», no «> 4»

**PDF:** `> 4 meses`. **Hoy:** **≥ 4**. Con exactamente 4 meses de venta en los últimos 6, el criterio se
cumple. La diferencia es un mes entero de relación comercial.

### 2.5 · §11 — V06 es un porcentaje del plazo, no 5 días

**PDF:** `FchVctoDoc - FchVctoProm < 5 dias`. **Hoy:** `abs(plazo_doc − plazo_prom) / plazo_prom ≤ 5%`.

No es lo mismo: en un par que paga a 30 días tolera ±1,5 días, y en uno que paga a 90 tolera ±4,5. Un
umbral fijo de 5 días es holgado para el primero y estrecho para el segundo. El layout A10 se corrigió en
consecuencia: la columna pasó de traer la diferencia ya calculada (`V06_DIF_FECHA_PAGO_DIAS`, que no se
puede recomputar por factura) a traer el **plazo promedio del par** (`V06_PLAZO_PROM_PAGO_DIAS`).

### 2.6 · §10 — La degradación intramés: hay que decidir

**PDF:** «es un protocolo light **degradable INTRAMES**: si durante el mes el par acumula mora >25d (V07)
o reclamos (V08) sobre umbral, **el deudor se degrada y sus proximas facturas se tratan como Otros**».

**Hoy:** V07 y V08 son dos de los seis criterios que aplica PRIME, así que incumplir cualquiera manda esa
factura a verificación telefónica. Pero el deudor **no cambia de segmento**: sus próximas facturas se
siguen evaluando con seis criterios, no con los diez.

**Mientras el incumplimiento persiste el resultado es el mismo** (V07 sigue fallando ⇒ teléfono). Se
separan en un caso concreto: si el incumplimiento se limpia dentro del mes, el PDF deja al deudor
degradado hasta fin de mes y el código lo devuelve a PRIME de inmediato. **Hay que decidir** si la
degradación es un estado que dura el mes o si basta con que los criterios la reflejen mientras dura.

### 2.7 · §11 — V09: el nombre de la variable dice factura, el umbral se mide sobre la operación

**PDF:** variable `MntFactura`, pero la lógica aclara «V09 se evalua con el monto de la operacion».
**Hoy:** el total de la operación **con ese deudor**, y sólo en el segmento OTROS. El nombre de la
variable es lo único que quedó del límite anterior por documento. Vale la pena renombrarlo en el PDF para
que nadie implemente dos umbrales donde hay uno.

---

## 3. `Spec_Proceso_Solicitud_Linea_Comite.pdf` y el §3.7 del spec de asignación

**PDF / spec:** el ciclo de vida de la **reserva de cupo** quedó «por definir».

**Hoy, definido:** la reserva **no es de NEX**. NEX evalúa y no persiste nada; el cliente firma y el
**sistema de gestión de líneas** crea la reserva; Operaciones aprueba en el core y el **core** la
commitea, convirtiéndola en línea utilizada. El `reservado` se **lee** por la API A23
(`disponible = aprobada − utilizada − reservada`), no se lleva en la aplicación.

Está documentado en `Integraciones/spec_swagger_consulta_lineas.md` §«Quién es dueño de la reserva» y en
la regla 12 de `CLAUDE.md`. La consecuencia práctica que conviene que el PDF recoja: una operación ya
aceptada **no pierde su cupo** en la reevaluación diaria, porque su reserva vive en el sistema externo;
el «se reasigna desde cero cada día» aplica sólo a lo que el cliente todavía no acepta.

---

## 4. Lo que NO cambió

Para no revisar dos veces lo mismo, esto se cotejó y **coincide** entre PDF e implementación:

| Punto | Dónde |
|---|---|
| Las cuatro disposiciones (aprobado / excepción / rechazo re-evaluable / rechazo definitivo) | §2 |
| KNOCKOUT: C30–C32 (TGR judicial, convenios, cuotas impagas) ⇒ rechazo firme no excepcionable ⇒ pérdida | §4 |
| Reglas no re-evaluables: C10–C22, C30–C32, D02–D13 | §5 |
| Un rechazo en regla re-evaluable **no** es pérdida: la operación queda activa con `requiere_otorgamiento` | §5 |
| Clave de visado `stKey`: `"<n>"` para cliente/operación, `"<n>@<rut>"` para deudor | §6 |
| Las excepciones ya visadas no se re-abren al re-evaluar | §6 |
| Estado agregado: aprobada / sujeta a excepción / rechazada | §6 |
| V01 es compuerta: si el deudor tiene protocolo propio, **prevalece** y se sigue ese protocolo | §11 |
| V02 ≥ 90% · V03 ≤ 1,3× · V04 < 1,0 · V07 < 3% · V08 < 4% · V09 > MM$300 | §11 |
| Checklist telefónico: existencia · recepción conforme · fecha de pago comprometida; bloquea el giro | §12 |
| La verificación telefónica registrada no se pierde con los refrescos de datos | §12 |
| Parámetros abiertos (C07, C08, C13/D05, C27, C37, C39, O01, O03, escala de la nota) | §13 |

Los parámetros de §13 siguen **abiertos**: no son desfases, son definiciones que la propia política
declara pendientes, y bloquean el cierre del contrato del servicio.


---

## 5. Corregido en esta revisión (documentos del repo)

Estos ya están arreglados; se listan para que no se vuelvan a auditar.

| Documento | Qué decía | Qué dice ahora |
|---|---|---|
| `Integraciones/spec_s3_verificacion.md` (A10) | V05 `> 4`; V06 `< 5 días` en una columna `V06_DIF_FECHA_PAGO_DIAS`; V10 `> 20× op ó > MM$1.500`; `SEGMENTO ELITE\|OTHERS`; `NOTA_DEUDOR ≥ 3,7 para Elite` | V05 **≥ 4**; V06 **≤ 5% del plazo**, con la columna renombrada a `V06_PLAZO_PROM_PAGO_DIAS` (trae el plazo promedio del par y NEX calcula la desviación); V10 **> MM$1.000** fijo; `PRIME\|OTROS` informativo; la entrada es `prime` **o** nota **> 4,2` |
| `Integraciones/s3_verificacion.csv` | Igual que arriba, con `ELITE` en los datos | Columna renombrada y filas al modelo vigente |
| `Integraciones/spec_s3_otorgamiento.md` (A16) | Cartera del par y del cliente en las mismas cuatro columnas; homologación `6 − N` | Cuatro columnas `*_CD` propias en la fila `DEUDOR`; niveles sin homologar y ruteo (área, nivel) |
| `Specs_Procesos/spec-verificacion-facturas.md` | Pseudocódigo con 5 criterios en el recortado; regla 9 con `MntFactura` **y** `MntOpC-D` | Seis criterios (la 1 incluida); la 9 sólo sobre el total, con el motivo explicado |
| `Specs_Procesos/spec-asignacion-lineas.md` | Orden por nota; cascada sin LF1 ni estados A/B; motivo `paraguas`; §3.9 «no implementado»; §8.8 «pasan de reservadas a aprobadas» | Orden por **tramo** y después nota; estados A/B con la LF1 y el quinto motivo `lf1`; motivos con sus nombres reales y las dos resoluciones del deudor; §3.9 y §6 marcados como implementados en parte / no implementados; §8.8 alineado con §3.7 |
| `Levantamiento_Activos_Informacion.md` | A10 con «segmento (Elite / Otros)» y «V06 diferencia fecha de pago»; A16 con la homologación | Segmento decidido por NEX, V06 como plazo promedio, V09 fuera del archivo; A16 con la cartera del par y el ruteo (área, nivel) |
| `pipeline_comercial.jsx` | El modal de curse decía «las asignaciones de línea pasan de **reservadas** a **aprobadas**» | Dice que la asignación es una **evaluación**: la reserva la crea el sistema de gestión de líneas cuando el cliente firma, y el core la commitea cuando Operaciones aprueba |

---

## 6. Defectos de implementación — **los siete corregidos el 11-09-2026**

No eran desfases de documentación: eran puntos donde el código **no hacía lo que su propia spec dice**.
Se verificaron uno por uno sobre el fuente y **se corrigieron todos**, con sus casos en la suite
(52–55). El diagnóstico se conserva porque es lo que justifica cada cambio.

### ~~6.1~~ · `verifResumenDeal` contaba pendientes de un estado sintético — **CORREGIDO**

`verifResumenDeal` calcula `pend` mirando `vf.tel.estado`, y ese estado lo **inventa** `verifFactura`:

```js
if (r.est === "tel") { const idx = par.h % 3; const estl = ["Completada", "En curso", "Pendiente"][idx]; … }
```

Nunca consulta `VERIF_TEL` / `repoVerifTel`, que es donde viven las llamadas realmente registradas —las
escriben el tab del detalle y la mesa de verificación—. Como el invariante **VER-01** («no cursa con
verificación pendiente») evalúa `verifResumenDeal(p.deal).pend === 0`, falla en las dos direcciones:

- una operación con **todas** sus llamadas firmadas puede seguir bloqueada, y
- una operación **sin ninguna** llamada puede pasar el control, si a cada deudor le tocó «Completada».

Lo segundo es lo grave: el control que existe para impedir el giro sin verificación se puede cumplir con
cero verificaciones. **Arreglo:** que `verifResumenDeal` cuente contra `VERIF_TEL[deal.id]`, como ya hacen
`filasVerificacion` y `VerificacionTab`.

### ~~6.2~~ · `verifPar` memoizaba sin el `tipo` — **CORREGIDO**

`verifPar(rutCliente, nombre, tipo)` memoiza en `_VERIF_PAR` con la clave `rutCliente|nombre` — **sin el
`tipo`**. Pero el `tipo` es lo que determina `sc`, `nota`, `prime`, `recortado`, `segmento` y `aplican`, y
los dos llamadores pasan uno distinto para el mismo par: `verifFactura` usa `tipoDeudorDisp(f)` (que puede
devolver «Histórico BICE») y `verifDeudorDeal` usa `tipoDeudor(null, nombre)` (Lista Blanca / Autorizado /
Otro). El primero que llame fija el segmento del par para toda la sesión.

Contradice el principio que el propio proyecto se dio —la semilla es la entidad estable— y hace que el
veredicto dependa de qué pantalla se abrió primero. **Arreglo:** incluir el `tipo` en la clave, o —mejor—
resolverlo **dentro** de `verifPar` a partir del par, para que no haya dos respuestas posibles.

### ~~6.3~~ · El veredicto no se congelaba tras el contacto — **CORREGIDO**

El §9 del spec dice que el resultado del contacto es **un hecho, no una nueva predicción**, y que volver a
predecir sobre el monto ya recortado sería circular. En el código no hay dónde se guarde ese veredicto:
todo se recalcula en cada render contra `deal.facturasOp`. Al retirar las facturas no confirmadas baja el
`montoOp`, y las reglas 3, 4 y 9 pueden pasar a cumplir: el deudor vuelve a `est: "ok"` y
`filasVerificacion` lo descarta, **borrando de la mesa la fila «no verificada» que se acaba de firmar**.
Lo único congelado es la copia dentro de la versión de simulación, que la interfaz no lee.

### ~~6.4~~ · La regla 6 no trataba el dato faltante como incumplimiento — **CORREGIDO**

El §4.3 es explícito: un criterio sin dato **incumple**, no hay estado intermedio. Las diez reglas lo
respetan (`v != null && …`) salvo la 6, que sustituye la fecha ausente por el promedio del par
(`f.venc != null ? f.venc : par.fchVctoProm`), con lo que la desviación da 0 y el criterio **cumple**.
Hay que decidir si es concesión de la demo o se alinea con el §4.3.

### ~~6.5~~ · La mesa no admitía confirmación parcial — **CORREGIDO**

El spec describe el caso de «el deudor confirma unas facturas y no otras, y Security retira las no
confirmadas». La mesa (`VerificacionView`) sólo ofrece verificada / no verificada por deudor, y
`noConfirmoDeudor` retira **todas** sus facturas. La granularidad por folio existe sólo en el tab del
detalle. Hay que decidir si la mesa debe admitir el resultado parcial.

### ~~6.6~~ · Dos cosas calculadas que nadie consumía — **CORREGIDO**

- **`saldoPuntual`** (`min(saldo puntual, holgura del deudor)`) se calcula exactamente como pide el §8.5 y
  **ningún componente lo lee**: la franja violeta de la puntual no está dibujada.
- **`montoCaducado`** viaja hasta la versión de simulación, pero el reporte que según el §3.6 debía
  alimentar —el que le dice al comité si las puntuales están bien dimensionadas— no existe.

### ~~6.7~~ · Restos del modelo viejo de verificación — **CORREGIDO**

`verifDeudor` (el modelo anterior de 6 criterios, con ≤1,1× promedio y ≤25 días de mora) **no tiene ningún
llamador**. Y varios comentarios contradicen el código que tienen al lado: «La verificación es POR
FACTURA», «Reglas V0–V5», «V1 es REGLA DURA», «la Nota Deudor no vuelve a filtrar acá». El campo
`VERIF_RULES.dura` está muerto: `verifFactura` devuelve siempre `hard: false`.

---

## 7. Decisiones que quedan abiertas

Ninguna bloquea la demo; todas cambian el contrato del servicio.

| # | Decisión | Dónde |
|---|---|---|
| 1 | ¿«General» es un área del tenant o el Gerente General es el tope de Comercial? | §1.4 |
| 2 | ¿La degradación intramés es un estado que dura el mes, o basta con que los criterios la reflejen? | §2.6 |
| 3 | ¿La LF4 es un pozo único o uno por categoría de deudor? Hoy son dos y A23 no puede representarlo | spec de líneas §2.1 |
| 4 | ¿La línea del cliente es un tope propio (top-down) o el consolidado de sus líneas de par? | spec de líneas §2.3 / §4 |
| 5 | Falta un motivo de rechazo «línea suspendida»: hoy se confunde con «no existe» | spec de líneas §3.2 |
| 6 | ¿La mesa de verificación admite confirmación parcial? | §6.5 |
| 7 | ¿La regla 6 sin dato cumple o incumple? | §6.4 |

---

## 8. Qué se hizo con cada uno (11-09-2026)

| # | Corrección |
|---|---|
| 6.1 | `verifFactura` lee el estado de la llamada de `repoVerifTel` —o del que se le inyecte— en vez de sortearlo con `par.h % 3`. `verifResumenDeal(deal, estado)` lo propaga, así que **VER-01 se evalúa contra el commit real**. Caso 52 |
| 6.2 | `verifPar(rutCliente, nombre, rutDeudor)`: el `tipo` se resuelve adentro, desde la identidad del par, y el RUT entra en la clave de memoización. Los dos llamadores dejaron de pasar cosas distintas. Caso 53 |
| 6.3 | Nuevo `repoVerifVeredicto`: registrado el contacto, el veredicto queda **congelado** con sus causas, actor y hora. `filasVerificacion` mantiene la fila del deudor aunque el predictor de hoy ya no lo mandaría a teléfono, y `causasVerif` devuelve las causas que se le dijeron a quien llamó. Caso 55 |
| 6.4 | Si a alguna factura le falta el plazo, la regla 6 vale `null` → incumple. Antes se rellenaba con el plazo promedio del par y el criterio **cumplía**. Caso 54 |
| 6.5 | La mesa trae un selector por folio, todas marcadas por defecto. Al registrar, las desmarcadas se retiran y quedan vetadas; la auditoría distingue «verificado» de «confirmó parcialmente» |
| 6.6 | `saldoPuntual` se muestra en la fila del deudor (chip lila + tooltip): avisa que parte del cupo disponible es una puntual de un solo uso que se quema entera con la primera factura. `montoCaducado` se totaliza en el modal de curse: es el dato con que el comité sabe si está dimensionando bien las puntuales |
| 6.7 | Se eliminaron `verifDeudor` (el modelo viejo de 6 criterios, sin llamadores), el campo `dura` del catálogo y el `hard` del veredicto —siempre `false`—, `telEstadoDe` y los comentarios que describían el modelo por documento. `CriteriosVerifMantenedor` se eliminó: no estaba enganchado a ninguna vista y además era de los criterios de visado del otorgamiento, no de este spec |

Y de paso, una **poda de código muerto**: 59 símbolos de nivel módulo sin ninguna referencia, 952
líneas. La verificación que importa acá no es `tsc` ni el build —los dos pasan con el login roto— sino
regenerar las capturas, que renderizan las 11 vistas.


---

## 9. Auditoría de aislamiento (12-09-2026) — y sus cuatro correcciones

Se midió la pureza **transitivamente** con `auditar_aislamiento.mjs`: el cuerpo de una función no basta
—`evaluarOtorgItems` no menciona ningún global y sin embargo sus variables de entrada salían de
`SIM_VERSIONS` una llamada más abajo—. De 582 funciones de nivel módulo, 41 leen estado de commit,
tenant o sesión. Cuatro cadenas decidían con estado que no se podía inyectar, y **se cerraron**:

| Cadena | Qué decidía | Corrección |
|---|---|---|
| `evaluarOtorgItems → varsClienteActual → SIM_VERSIONS` | las variables con que corre todo el catálogo | `varsClienteActual(deal, versiones)`, `revOtorgActual(deal, versiones)`, `evaluarOtorgItems(deal, {versiones})` |
| `estadoCandidata → noConfirmada → NO_CONFIRMADAS` | si una factura se puede incorporar a la oferta | `noConfirmada(deal, f, vetadas)`, `estadoCandidata(f, deal, {vetadas})` |
| `otorgamientoCompleto` / `causaPerdidaDeal → visadoDeal → VISADO_STATE` | **la liberación del giro** | `visadoDeal(deal, {visado})` y toda la cadena; con estado inyectado se salta `VISADO_CACHE`, que está indexado por operación |
| `aprobadoresExc → USERS` | el nombre de quien puede aprobar | el padrón trae `etiqueta`; el motor ya no lee el catálogo de usuarios |

**La prueba no es estática.** Un analizador no distingue «lee el global» de «cae al global sólo si no
le pasan el estado». Los casos **56–59** de la suite inyectan un estado que **contradice** al del
navegador y comprueban cuál manda: TGR judicial en $5M fuerza el knockout C30 aunque la operación no
lo tenga; el veto inyectado bloquea una factura que sin él es agregable; el visado inyectado mueve las
once excepciones de pendientes a rechazadas y el cache no envenena; y un padrón con un usuario que no
existe en la app devuelve su nombre.

**Verificado sin regresión.** `regresion_diferencial.mjs` vuelve a dar idénticas las siete familias que
no debían cambiar, y sobre las 24 operaciones sintéticas el estado agregado, los knockouts y el
conjunto de reglas que excepcionan siguen siendo **24 de 24** iguales al build anterior a la sesión.

**Lo que sigue atado y no se arregla inyectando:** `verifPar` memoiza en `_VERIF_PAR` (en producción,
un SELECT del batch diario), `asignarLineas` depende de las tablas precalculadas de líneas y de
`tipoDeudor` (las listas), y `nowStamp()` dentro de `verifFactura` (la hora la pone el servidor). Son
la categoría «dato», no «estado mutable del navegador».

---

## 10. Lo decidido después del 11-09 — lo que la próxima versión del PDF tiene que recoger

**Actualizado:** 14-09-2026.

Este archivo se escribió el 11-09 y desde entonces el negocio decidió seis cosas más que el PDF vigente
tampoco describe. Van acá, con el mismo criterio que §1–§3: qué dice el PDF, qué hace el código y por
qué difieren. Ninguna es un bug abierto — todas están implementadas y probadas.

### 10.1 · Existe una regla que NO viene de la política: **O05 · Contrato firmado por cliente de la operación**

**PDF:** el catálogo son 79 reglas (C01–C52 · D01–D23 · O01–O04) y todas salen de la política de riesgo.

**Hoy:** el catálogo corre **76 · 48 C + 23 D + 5 O** (la política aporta 75 tras el retiro de C47–C50,
ver §1.7). La que sobra es **O05**, que no viene de la política sino del
**proceso**: constatar que existe la autorización del contrato de cesión antes de girar. Se cuenta
aparte porque el caso 46 mide cobertura de la política y sumarlas al mismo total la dejaría sin medir.

Existe **siempre**, en las dos vías de publicación, y lo que cambia es **quién crea la evidencia**:

- **Electrónica (email).** La autorización del cliente en el portal es la evidencia y el criterio queda
  **aprobado** sin que nadie lo vise.
- **Física (contrato adjunto).** El papel se firmó fuera del sistema, así que no hay nada que dar por
  cierto: queda como **excepción de Operaciones N3**, el ejecutivo adjunta el comprobante y Operaciones
  lo visa.

Que existiera sólo en la vía física dejaría a la operación electrónica cursando sin ninguna constancia
mientras el cliente no firma.

**La evidencia es una HUELLA del paquete, no una bandera.** No dice «el cliente firmó» sino «el cliente
firmó ESTO»: `huellaOperacion(deal)` es una cadena canónica con N° de operación · RUT del cliente · n°
de deudores · n° de facturas · monto total · **monto por deudor ordenado**. Lo último cierra la
sustitución: con sólo conteos y total, cambiar una factura por otra del mismo monto en otro deudor
dejaría la huella idéntica. Se guarda la cadena **y** su SHA-256 — el hash sirve para comparar y la
cadena para auditar, porque quien revise un giro en seis meses necesita ver **qué** se firmó y no un
hexadecimal que sólo dice que no calza. Con eso el criterio se abre y se cierra solo: cambió el
paquete, la huella no calza, vuelve a ser excepción, sin que nadie tenga que acordarse de revocar nada.

Una bandera no habría servido: se revoca cuando alguien aprieta «Reabrir», o sea confía en que **toda**
modificación pase por esa puerta. La huella no confía en nada.

**Para el PDF:** agregar O05 a §7 marcada como criterio de proceso, y decir en §1 que el catálogo tiene
79 reglas **de política** más las que el proceso agregue.

**Configuración que hizo falta:** el área Operaciones tenía un solo cargo, en N5, así que un requisito
N3 se cubría por escalada y no se distinguía del que sí necesita la máxima atribución. Se dio de alta
**Jefe de Operaciones (N3)**. Dar de alta el cargo **no basta**: la atribución se resuelve contra el
padrón, así que un cargo sin titular deja el par (área, nivel) con nombre y sin nadie que lo firme — el
primer intento creó el cargo y la excepción siguió cayendo en N5. Caso 85.

### 10.2 · Firmar no es girar: hay dos estados entre la firma y Tesorería

**PDF:** después de la aceptación del cliente la operación pasa a cesión y giro.

**Hoy:** firmar es del CLIENTE; girar es de la casa, y sólo después de que sus controles pasen:

| Estado | Cuándo | Quién actúa |
|---|---|---|
| **Otorgamiento / Verificación** | falta excepcionar un criterio, hacer una llamada o falta la evidencia del contrato | riesgo · verificación · el ejecutivo |
| **Pendiente Integración** | resuelto todo lo anterior: **sale del tubo** y aparece en Operaciones | Operaciones |
| **Pendiente de Giro** | **Operaciones (N3)** aprueba la integración al core | Tesorería |

Es **una** etapa y no dos porque el ejecutivo tiene un solo pendiente —que la casa termine de revisar—;
dividirla obligaría a explicar una diferencia que no cambia nada de lo que él puede hacer.

**El defecto que lo destapó**, y que el PDF habilitaba: la confirmación del cierre saltaba directo a
**Giro** —con el dinero dado por transferido— cuando la heurística `requiereOtorgamiento` decía que no
hacía falta aprobación manual. Esa heurística mira dos cosas (¿supera la línea?, ¿hay deudores «Otro»?)
y **nació antes del motor de reglas**, así que el salto se llevaba por delante OTG-02, VER-01 y GIR-02.
Se vio en una operación «Girada» con **42 criterios por aprobar y 8 facturas por verificar a la vista,
en la misma pantalla**. La decisión se extrajo a `etapaTrasFirma(entrada)`, pura y de nivel módulo — el
tipo de cosa que en producción resuelve el servidor. Caso 88, con las 16 combinaciones.

**Para el PDF:** el diagrama de estados posterior a la firma, y que la aprobación de la integración al
core es de **Operaciones N3** y no del ejecutivo.

### 10.3 · Un invariante nuevo: **GIR-02**, el gate de inyección al core

El paquete que se gira tiene que ser el que se autorizó. En el momento de entregarle la operación a
Tesorería —el último punto en que la comparación sirve de algo, después el dinero ya salió— se compara
la huella de lo que se va a inyectar contra la de la evidencia de O05.

`evidenciaContratoOk(deal, estado)` devuelve **el porqué** y no un booleano: «sin_evidencia» y
«no_calza» se arreglan de formas distintas, y el detalle muestra las dos huellas, que es lo que se
audita. El destino «Girar» **no desaparece** del menú cuando falla: se muestra apagado con el motivo —
desaparecer sin explicación deja al ejecutivo con una operación aceptada que no puede girar y sin dónde
enterarse de por qué. Y la mutación lo vuelve a comprobar antes de escribir, porque la pantalla que
oculta el botón no es el control. Caso 86.

**Para el PDF:** sumar GIR-02 a la lista de controles, junto a OTG-01/02 y VER-01.

### 10.4 · La primera operación del cliente verifica TODO (regla 0 de verificación)

**PDF §10:** el protocolo de verificación se decide por el segmento del deudor.

**Hoy:** antes que eso hay una **regla 0**, compuerta y anterior a V01: en la **primera operación del
cliente** se verifican **todas** las facturas, cualquiera sea el segmento del deudor. No es un criterio
de riesgo del deudor sino del **cliente**, y por eso aplica a los dos segmentos.

Vive en el predictor de verificación y no en el motor de líneas ni en la pantalla del giro: «si hay que
llamar a este deudor» es una sola pregunta y tiene un solo dueño. El estado del cliente
(`nuevo · activo · suspendido · eliminado`) lo devuelve una API de Security al iniciar sesión, sólo
`nuevo` es primera operación, y entra **por parámetro** — no se memoiza con el par, que sí se cachea:
guardado ahí, el cliente seguiría verificándolo todo para siempre después de cursar. Casos 76 y 77.

### 10.5 · El pricing y el prorrateo por factura son configuración del TENANT

**PDF:** la aritmética del giro no está descrita; vivía cableada en el código.

**Hoy:** los **conceptos**, sus variables y sus fórmulas son configuración por tenant (dos factorings no
calculan igual). El cierre es fijo —`Monto a Girar = Monto Anticipo − Subtotal Descuentos`, y la
retención se informa y no se descuenta— y las fórmulas se **interpretan** (AST), no se evalúan como
JavaScript: la escribe un administrador y correría en el navegador de todos sus usuarios, así que con
`eval` el mantenedor de pricing sería una consola remota.

Y hay un nivel que el PDF no tiene: el **prorrateo por FACTURA**, porque el giro se materializa en
transferencias que ejecuta Tesorería. **Regla de oro: la suma por documento es siempre el total de la
operación, en todos los conceptos.** Descuento **racional** (no lineal), plazo equivalente ponderado por
el peso en la **diferencia de precio** (no en el monto — por monto da 46,5 días donde la planilla del
negocio da 52,79), cálculo con 6 decimales y presentación con 2 y 1, y la factura **más grande** absorbe
el residuo del redondeo al peso. El descuadre es **estructural**, no un defecto: el peso no tiene
decimales. Ver `spec-pricing-simulacion.md` §4. Casos 65–75.

### 10.6 · El último eslabón: la **asignación de giros** (GE / GN)

No existe en el PDF. Toma el monto a girar y su desglose por factura y produce lo que Tesorería va a
transferir. **GE (Express)**: la verificación lo dio por no necesario **y** el otorgamiento no dejó
marcas de excepción. **GN (Normal)**: todo lo demás. La calificación es **por deudor** y las facturas
heredan, porque los dos motores de los que depende deciden por deudor.

**Supuesto explícito que falta confirmar:** el enunciado decía «por verificar **y** con excepciones»; se
implementó como **disyunción**, porque con conjunción una factura por verificar y sin excepciones no
calificaría en ningún tipo y la regla de oro se rompería. Y el enunciado menciona **tres** formas de
giro y define dos: falta la tercera. Ver `spec-modelo-giro.md`. Casos 78–84.

### 10.7 · Decisiones abiertas — al día

A las siete de §7 se suman dos, ambas del modelo de giro:

| # | Decisión | Dónde |
|---|---|---|
| 8 | ¿GN es disyunción o conjunción? Implementado como disyunción por la regla de oro | §10.6 |
| 9 | ¿Cuál es la **tercera** forma de giro? El enunciado menciona tres y define dos | §10.6 |
