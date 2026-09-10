# Inconsistencias del Motor de Otorgamiento — política v1.1 ↔ implementación

**Estado:** borrador de auditoría · **Fecha:** 10-09-2026 · **Alcance:** módulo de otorgamiento de NEX Factoring (Pipeline Comercial)

---

## 0. Cómo usar este documento

Este archivo es **autocontenido**: se puede abrir en una sesión nueva sin más contexto que el repositorio. Documenta las
desviaciones detectadas entre la política de riesgo vigente y lo que hace hoy el código, como paso previo a **encapsular
el motor de otorgamiento en un servicio (MS/API) independiente**.

Antes de extraer el motor conviene cerrar estos puntos: cada uno cambia el **contrato** del futuro servicio (qué nivel
devuelve, quién puede aprobar, qué reglas existen). Extraer primero y corregir después obliga a versionar el contrato dos veces.

Cada hallazgo trae: **qué dice la política** · **qué hace el código** · **evidencia** (`archivo:línea`) · **impacto** ·
**corrección propuesta** · **decisión pendiente**. Las decisiones pendientes son de negocio (Datamart / Riesgo de Factoring
Security), no técnicas.

Convención de referencias: todas las líneas apuntan a `pipeline_comercial.jsx` salvo que se indique otro archivo.

---

## 1. Resumen de hallazgos

| # | Hallazgo | Severidad | Efecto |
|---|---|---|---|
| **INC-01** | Homologación de niveles invertida (`NV(N) = 6 − N`) | **Alta** | Las 66 reglas con excepción rutean al aprobador equivocado; la escala de severidad queda al revés |
| **INC-02** | Sólo aprueba el nivel exacto; los superiores no | **Alta** | Contradice «cualquier nivel superior puede autorizar» (spec §3). Un Subgerente de Riesgo no puede visar una excepción N4 |
| **INC-03** | El área de Operaciones no puede aprobar nada | **Alta** | `NIVEL_ROL` sólo define áreas comercial/riesgo ⇒ el usuario `OP` nunca es aprobador hábil, pese a existir reglas de área Operaciones |
| **INC-04** | Faltan 4 reglas del catálogo (C47–C50) | **Media** | La política declara 79 reglas; el runtime implementa 75 |
| **INC-05** | Conviven dos modelos de atribución paralelos | **Media** | «Causas de desvío» (FL/OD) y «motor de reglas» (C/D/O) con convenciones opuestas; el primero está huérfano |
| **INC-06** | Nivel Comité sin representación | **Media** | C05 (constitución de línea) cae en el aprobador de menor jerarquía |
| **INC-07** | Artefactos del repo desactualizados | **Baja** | `atribuciones_otorgamiento.json` y los dos `.xlsx` describen el catálogo anterior |

---

## 2. Fuentes cotejadas

| Fuente | Rol | Referencia |
|---|---|---|
| `Specs_Procesos/Spec_Proceso_Calificacion_Otorgamiento_Verificacion_v1.1.pdf` | **Política vigente** (18-08-2026, reemplaza íntegramente a v1.0) | Normativa |
| `Integraciones/spec_sftp_otorgamiento.md` | Contrato de datos de entrada (Activo A16) + upsert intradía A22 | Normativa |
| `pipeline_comercial.jsx` | Implementación actual (demo) | Auditada |
| `atribuciones_otorgamiento.json` | Export de atribuciones | Desactualizado (ver INC-07) |
| `Rules Cliente2.xlsx`, `Rules Deudor.xlsx` | Maestros originales | Legado (ver INC-07) |

**Supuesto de trabajo:** la política v1.1 es normativa; el código es la parte que se ajusta. Si en algún punto la decisión
fuera la inversa (el código refleja un acuerdo posterior no documentado), hay que actualizar la spec y anotarlo aquí.

---

## 3. Hallazgos

### INC-01 · Homologación de niveles invertida

**Qué dice la política.** Spec §3: la escala es N1..N5 más Comité, donde **N5 es la máxima atribución individual**:

| Nivel | Rol | Área |
|---|---|---|
| N1 | Jefe de Grupo Comercial | Comercial |
| N2 | Gerente Comercial | Comercial |
| N3 | Gerente General | General |
| N4 | Jefe de Riesgo | Riesgo |
| N5 | Subgerente de Riesgo | Riesgo |
| COMITÉ | Comité de Crédito | Riesgo |

La spec menciona además una homologación a un módulo interno donde 1 = máxima: `nivelModulo = 6 − N` (Comité → 1).

**Qué hace el código.** El constructor del catálogo aplica esa conversión al **guardar** el nivel de cada tramo:

```js
// pipeline_comercial.jsx:8112
const NV = (N) => 6 - N, MM = 1e6;
```

Pero **todo lo que consume ese número lo interpreta en la convención de la política** (5 = máxima):

```js
// pipeline_comercial.jsx:8673
const NIVEL_ROL = {
  1: { rol: "Jefe de Grupo Comercial", area: "comercial" },
  ...
  5: { rol: "Subgerente de Riesgo",    area: "riesgo" },
};
// pipeline_comercial.jsx:869 — ATRIB_USUARIO: JG comercial:1 … SR riesgo:5
// pipeline_comercial.jsx:923 — puedeAprobarExc: lv >= nivelReq  (a mayor número, más atribución)
```

Es decir: se **escribe** en convención módulo y se **lee** en convención política. La conversión queda sin contraparte.

**Evidencia.** Nivel que la política asigna vs. rol al que efectivamente rutea el código:

| Regla | Política | Guardado | Aprobador efectivo hoy |
|---|---|---|---|
| C01 Pagaré firmado | N1 (Operaciones) | 5 | Subgerente de Riesgo |
| C07 Cupo en línea | N2 / N4 | 4 / 2 | Jefe de Riesgo / Gerente Comercial |
| C09 Nota cliente < 3,7 | N4 (Riesgo) | 2 | Gerente Comercial |
| C17 Mora Equifax | N2 / N3 | 4 / 3 | Jefe de Riesgo / Gerente General |
| C22 Infracciones laborales | N2 / N3 / N4 / N5 | 4 / 3 / 2 / 1 | Jefe de Riesgo → Gerente General → Gerente Comercial → **Jefe de Grupo Comercial** |
| C23 Mora interna > 25d | N1 | 5 | Subgerente de Riesgo |
| D01 Nota deudor < 3,7 | N4 | 2 | Gerente Comercial |
| D18 Socios comunes C-D | N5 | 1 | Jefe de Grupo Comercial |
| O01 Spread bajo banda | N1 | 5 | Subgerente de Riesgo |

El caso de C22 muestra el efecto con claridad: **a mayor monto de infracciones, menor jerarquía del aprobador**. La escala
de severidad quedó invertida.

**Impacto.** Alcanza a **66 reglas** con tramo de excepción y **129 tramos** en total — es decir, prácticamente todo el
catálogo excepcionable. Consecuencias:

- Las excepciones de Riesgo se rutean a Comercial y viceversa (`NIVEL_ROL[n].area` cambia con el nivel).
- La lista de aprobadores hábiles (`aprobadoresExc`, línea 929) y las notificaciones (`solicitarAprobacionExc`, línea 8604)
  apuntan a personas equivocadas.
- El JSON exportado desde Mantenedores (`buildAtribucionesJSON`, línea 9422) publica esos niveles incorrectos hacia afuera.

**Corrección propuesta.** Eliminar la conversión: `NV` pasa a ser identidad (`const NV = (N) => N`). Verificado tramo por
tramo, **con esa sola corrección las 66 reglas quedan alineadas con la spec §7–§9**, sin tocar ninguna otra cosa. Ejemplos:
C07 → N2/N4 ✓, C17 → N2/N3 ✓, C22 → N2/N3/N4/N5 ✓, C23 → N1 ✓, D18 → N5 ✓, O01–O04 → N1 ✓.

La única excepción es C05 (ver **INC-06**).

**Decisión pendiente.** Confirmar que la convención única del futuro servicio es la de la política (**N5 = máxima**) y
retirar de la spec la mención a la homologación `6 − N`, que hoy sólo induce este error. Si el módulo interno debe conservar
1 = máxima por alguna razón, entonces la conversión tiene que aplicarse **también** a `NIVEL_ROL`, `ATRIB_USUARIO` y a la
comparación de `puedeAprobarExc` — no sólo al catálogo.

---

### INC-02 · Sólo aprueba el nivel exacto, no los superiores

**Qué dice la política.** Spec §3, textual: *«el nivel de cada regla es el MÍNIMO requerido; cualquier nivel superior puede
autorizar»*.

**Qué hace el código.** Exige además que el nivel del usuario esté **explícitamente definido en los tramos de esa misma regla**:

```js
// pipeline_comercial.jsx:916
function nivelesAprobArea(regla, area) {
  const s = new Set();
  ((regla && regla.tiers) || []).forEach((t) => { if (t[1] === "excepcion") { const niv = t[2]; const nr = NIVEL_ROL[niv] || NIVEL_ROL[4]; if (nr.area === area) s.add(niv); } });
  return s;
}
// pipeline_comercial.jsx:923
function puedeAprobarExc(code, regla, nivelReq) {
  if (code === "ADMIN") return true;
  const nr = NIVEL_ROL[nivelReq] || NIVEL_ROL[4];
  const lv = atribDe(code).atrib[nr.area];
  return lv != null && lv >= nivelReq && nivelesAprobArea(regla, nr.area).has(lv);
}
```

El mismo criterio aparece en `aprobadoresDe` (línea 913), que compara con igualdad estricta:

```js
const aprobadoresDe = (area, nivel) => Object.keys(ATRIB_USUARIO).filter((k) => USERS[k] && (k === "ADMIN" || ATRIB_USUARIO[k].atrib[area] === nivel)).map((k) => USERS[k]);
```

**Impacto.** Una regla cuyo único tramo de excepción es N4 (por ejemplo C09 o D01) sólo puede ser visada por el **Jefe de
Riesgo**. El **Subgerente de Riesgo (N5)**, que la política define como máxima atribución individual, queda excluido: cumple
`lv >= nivelReq` pero su nivel no figura entre los tramos de esa regla. En la práctica desaparece la sustitución por
jerarquía superior y cada excepción depende de una única persona.

**Corrección propuesta.** Eliminar la condición `nivelesAprobArea(...).has(lv)` y dejar `lv >= nivelReq` como única regla
(más el super-admin). Eso implementa literalmente el «mínimo requerido» de la spec.

**Decisión pendiente.** Confirmar si se quiere conservar alguna forma de tope superior (por ejemplo, que Comité no vise
excepciones menores por higiene de proceso). Si la respuesta es sí, hay que expresarlo como un rango `[min, max]` explícito
por regla, no inferirlo de los tramos.

> **Nota:** el propio `atribuciones_otorgamiento.json` documenta la convención del código, no la de la spec: *«el nivel del
> tramo aplicable es el aprobador responsable; un SUPERIOR sólo puede aprobar (sustitución de emergencia) si su nivel está
> definido en el risk tier de la misma regla»*. Al cerrar este punto hay que alinear también ese texto.

---

### INC-03 · El área de Operaciones no puede aprobar nada

**Qué dice la política.** Spec §7 clasifica reglas como **EXC-OPS** (excepcionables por el área de Operaciones): C01–C04
—pagarés e información financiera— son de esa área.

**Qué hace el código.** El catálogo respeta el área en la regla (`R(101, "C01", "operaciones", …)`, línea 8121 y siguientes),
pero el ruteo de aprobación no usa ese campo: usa `NIVEL_ROL[nivel].area`, y **`NIVEL_ROL` sólo contiene `comercial` y
`riesgo`** (línea 8673). Como `puedeAprobarExc` resuelve el área por nivel:

```js
const nr = NIVEL_ROL[nivelReq] || NIVEL_ROL[4];
const lv = atribDe(code).atrib[nr.area];   // nr.area ∈ { comercial, riesgo }
```

el usuario aprobador de Operaciones —`OP: { tipo: "aprobador", atrib: { operaciones: 5 } }` (línea 878)— nunca obtiene un
`lv` distinto de `undefined` y **jamás resulta hábil para visar una excepción**.

El código incluso reconoce la divergencia y la muestra en pantalla en vez de resolverla:

```js
// pipeline_comercial.jsx:8862
const niv = x.nivel || 4; const nr = NIVEL_ROL[niv] || NIVEL_ROL[4]; const otraArea = nr.area !== x.regla.area;
```

**Impacto.** El área de Operaciones existe en el catálogo, en los mantenedores y en la matriz de gravedad, pero está muerta
en el flujo de aprobación. Las excepciones de C01–C04 terminan en Comercial o Riesgo según el nivel que les tocó por INC-01.

**Corrección propuesta.** Separar los dos conceptos, que hoy están fusionados en `NIVEL_ROL`:

- **Área responsable** → siempre `regla.area` (`riesgo` | `comercial` | `operaciones`).
- **Nivel requerido** → el del tramo aplicable.
- **Rol aprobador** → función de `(área, nivel)`, no de `nivel` solo.

Es decir, reemplazar `NIVEL_ROL: nivel → {rol, área}` por una matriz `ROL_POR_AREA_NIVEL: (área, nivel) → rol`, y hacer que
`puedeAprobarExc` compare contra `regla.area`.

**Decisión pendiente.** Definir la escala de niveles del área Operaciones (la spec §3 no la define: sólo describe la escalera
Comercial → General → Riesgo). Sin esa definición no se puede completar la matriz.

---

### INC-04 · Faltan 4 reglas del catálogo (C47–C50)

**Qué dice la política.** Spec §1: *«la política de riesgo evalúa 79 reglas»* = C01–C52 (52) + D01–D23 (23) + O01–O04 (4).
Spec §7 detalla **C47–C50 — «Cartera del par C-D: reclamados / NC / mora / CxC»**, carácter EXC-COM, nivel N1c, re-evaluables.

**Qué hace el código.** El catálogo de runtime tiene **75 reglas**: 48 de cliente, 23 de deudor, 4 de operación. Faltan
exactamente **C47, C48, C49 y C50**.

Verificable con:

```bash
awk '/^    R\(/{print}' pipeline_comercial.jsx | grep -oE '"[CDO][0-9]{2}"' | tr -d '"' | sort > /tmp/impl.txt
for i in $(seq -w 1 52); do grep -qx "C$i" /tmp/impl.txt || printf "C%s " $i; done; echo
# → C47 C48 C49 C50
```

**Impacto.** Son las cuatro reglas equivalentes a C40–C43 pero aplicadas al **par cliente-deudor** en lugar del cliente
completo. Su ausencia deja sin cubrir la gestión de cartera a nivel de par, que es justamente donde se detecta el deterioro
localizado en un deudor. C40–C43 (cliente) sí están implementadas (líneas 8160–8163).

**Corrección propuesta.** Implementarlas siguiendo el patrón de C40–C43 pero como reglas del deudor —es decir, evaluadas
una vez por cada deudor de la operación, con `stKey = n@rut`— dado que son del par C-D. Requieren cuatro variables nuevas en
el payload (cartera reclamada / NC / morosa / CxC del par), que **hoy no viajan** en `sftp_otorgamiento.csv`.

**Decisión pendiente.** Confirmar si C47–C50 se evalúan por par C-D (y entonces son reglas tipo D, con visado por deudor) o
si son agregadas del cliente (y entonces son tipo C). La spec §7 las lista en el bloque CLIENTE pero las nombra «del par C-D»,
lo que es ambiguo. De la respuesta depende el layout del archivo A16 y la forma del `stKey`.

---

### INC-05 · Conviven dos modelos de atribución paralelos

En el código hay **dos mecanismos completos y distintos** para decidir quién autoriza una operación:

| | **A · Causas de desvío** | **B · Motor de reglas** |
|---|---|---|
| Qué evalúa | `TIPOS_DESVIO`: FL (fuera de línea), OD (otros deudores), ON, DI | Catálogo C01–C52 / D01–D23 / O01–O04 |
| Origen del nivel | `MATRIZ_OTORG[gravedad][área]`, con gravedad por tramo de monto (`CFG_TRAMOS`) | Tramo del risk tier de cada regla |
| Convención | **1 = máxima** (crítico → riesgo:1) | **5 = máxima** (`NIVEL_ROL`) |
| Permiso | `puedeAccionarCausa`: `lv === nivelReq` (igualdad) | `puedeAprobarExc`: `lv >= nivelReq` + presente en los tramos |
| Disparador | `requiereOtorgamiento(deal)` — fuera de línea y/o deudores «Otro» | Evaluación de las 75 reglas sobre las variables A16 |
| Ubicación | líneas 854–957 | líneas 7992–8480 |

**Impacto.** Tres consecuencias concretas:

1. **El modelo A está huérfano en la UI.** `OtorgamientosView` (línea 9238) calcula `items`, `enOtorg` y `esPipeline` a partir
   de las causas… y **no los usa**: el JSX sólo renderiza `<VisadoClienteView>`, que es el modelo B. Son ~10 líneas de cómputo
   muerto en cada render.
2. **La matriz del modelo A es inalcanzable.** `MATRIZ_OTORG` (línea 854) exige `riesgo:1` para gravedad crítica, pero ningún
   usuario tiene ese nivel (`RG` es riesgo:4, `SR` es riesgo:5) y `puedeAccionarCausa` compara por **igualdad**. Resultado: las
   causas críticas sólo las puede accionar `ADMIN`, y las **leves** (que piden riesgo:5) las acciona el **Subgerente de Riesgo**
   —la máxima atribución para el caso más benigno.
3. **`requiereOtorgamiento` sigue siendo relevante** (líneas 1475–1482) para decidir el ruteo a la etapa Otorgamiento y para
   `causasDeDeal`, pero su resultado ya no gobierna la aprobación.

**Corrección propuesta.** Elegir un modelo único para el servicio. Recomendación: **conservar B** (es el que implementa la
política v1.1 y el que la UI usa) y **reexpresar FL y OD como reglas del catálogo** —de hecho ya existen equivalentes:
C07 cubre el cupo de línea y la clasificación de deudor pertenece al inbound. Con eso, `MATRIZ_OTORG`, `CFG_TRAMOS`,
`TIPOS_DESVIO`, `causasDeDeal`, `gravedadPorMonto`, `nivelReqCausa` y `puedeAccionarCausa` se retiran.

**Decisión pendiente.** Confirmar que la gravedad por tramo de monto (≤20 / ≤60 / ≤120 / >120 MM) **no** debe influir en el
nivel requerido. Hoy el modelo B ignora el monto de la operación: el nivel depende sólo del valor de la variable de riesgo.
Si el monto sí debe escalar la atribución, hay que incorporarlo al modelo B como un modificador explícito y documentarlo en
la spec, en vez de mantenerlo en un modelo paralelo.

---

### INC-06 · El nivel Comité no tiene representación

**Qué dice la política.** Spec §3 define **COMITÉ** como un nivel por encima de N5, área Riesgo, para *«constitución de líneas
nuevas y cambios estructurales»*. Spec §7 asigna a **C05 (Línea Cliente Nuevo)**: *«Sin línea → constitución vía COMITÉ»*.

**Qué hace el código.** `NIVEL_ROL` (línea 8673) sólo define 1..5; no hay entrada para Comité. C05 es además la **única regla
que fija su nivel de forma literal**, sin pasar por `NV()`:

```js
// pipeline_comercial.jsx:8125
R(105, "C05", "riesgo", "ClientSegmentation", "Línea Cliente Nuevo",
  "Cliente nuevo sin línea de crédito aprobada — requiere constitución de línea (Comité de Crédito)",
  [[(v) => v.clienteNuevo, "excepcion", 1]]),
```

Ese `1` corresponde a la homologación «Comité → 1» de la spec, pero `NIVEL_ROL[1]` es **Jefe de Grupo Comercial**, el rol de
menor atribución del sistema.

**Impacto.** La constitución de una línea nueva —la decisión más estructural del proceso— queda a criterio del aprobador de
menor jerarquía. Además, al corregir INC-01 (`NV` identidad), C05 seguirá roto porque su nivel está escrito a mano: es el
único caso que no se arregla solo.

**Corrección propuesta.** Añadir el nivel Comité como valor propio por encima de N5 (`6`, o mejor un token `"COMITE"` para no
depender del orden numérico), con su rol y área, y apuntar C05 a él. Si se usa un token, `puedeAprobarExc` necesita un orden
explícito en vez de comparación numérica.

**Decisión pendiente.** Definir si el Comité es un **usuario** del sistema (una cuenta que visa en la bandeja) o un **estado
externo** (la operación sale del flujo, va al módulo de Solicitud de Línea al Comité —ver `Analisis_Solicitud_Linea_Comite.md`—
y vuelve con una resolución). La segunda opción es la que sugiere el resto del diseño y cambia el contrato del servicio:
el motor no devolvería «excepción nivel Comité» sino «requiere constitución de línea», un resultado de otra naturaleza.

---

### INC-07 · Artefactos del repositorio desactualizados

**`atribuciones_otorgamiento.json`** (raíz del repo)

- Declara `"generado": "2026-07-10"` y `"total_criterios": 59`.
- Contiene el **catálogo anterior** (reglas 1–59, con nombres tipo *«Clasificación Matriz Cliente — Categoría 1»*,
  *«Protestos Vigentes Banco BICE»*, *«Morosidad BICE Factoring»*), no el Modelo de Riesgo v1.0 C/D/O.
- El runtime lo reemplaza completo en el IIFE de la línea 8111 (`REGLAS_CLIENTE.length = 0; V2.forEach(...)`), de modo que el
  archivo del repo **no describe lo que la aplicación ejecuta**.
- Su campo `descripcion` documenta además la convención de nivel exacto que contradice la spec (ver INC-02).
- Se regenera desde la app: Configuración → Otorgamiento → Atribuciones de aprobación → **Descargar JSON**
  (`buildAtribucionesJSON`, línea 9422). Conviene regenerarlo **después** de cerrar INC-01 a INC-03, no antes.

**`Rules Cliente2.xlsx` y `Rules Deudor.xlsx`** (raíz del repo)

- Son los maestros originales de los que salió el catálogo anterior.
- `Rules Deudor.xlsx` tiene **10 reglas** (vs. las 23 de D01–D23) y evalúa `$DeudorScore` en escala **0–99** con umbrales
  80/60 — una escala que ya fue reemplazada por la **Nota Deudor 1–5** con umbral 3,7 (invariante de dominio nº 2 en `CLAUDE.md`).
- `Rules Cliente2.xlsx` tiene 59 filas y columnas de trabajo (`Rutle Task`, `Reevaluation`) que no existen en el modelo actual.

**Corrección propuesta.** Marcarlos explícitamente como **legado** —moverlos a un subdirectorio `Legado/` o añadirles el sufijo
`_v0`— para que nadie los tome como fuente de verdad al implementar el servicio. La fuente normativa es la spec v1.1 más
`Integraciones/spec_sftp_otorgamiento.md`.

**Decisión pendiente.** Ninguna de negocio; es higiene del repositorio. Confirmar sólo si se conservan por trazabilidad o se
eliminan.

---

## 4. Verificado y consistente (no re-auditar)

Estos puntos se cotejaron y **coinciden** entre política e implementación:

| Punto | Verificación |
|---|---|
| Evaluación por deudor | `evaluarOtorgItems` (línea 8087) evalúa C y O una vez, y las D **una vez por cada deudor** con `deudorBlock` superpuesto. Coincide con spec §2 |
| Clave de visado `stKey` | `String(n)` para cliente/operación, `n + "@" + rut` para deudor (línea 8092-8093). Coincide con spec §6 |
| Reglas no re-evaluables | El set es `{110–122, 130–132, 202–213}` = **C10–C22, C30–C32, D02–D13** (línea 8199). Coincide exactamente con spec §5 |
| KNOCKOUT | C30/C31/C32 usan `tHard` → disposición `rechazado` + no re-evaluables → `rechFirme` → pérdida terminal automática (`useEffect` línea 16857). Coincide con spec §4 |
| Rechazo re-evaluable ≠ pérdida | `visadoDealCalc` (línea 8370) separa `rechFirme` de `rechReev`; sólo el primero produce pérdida. Coincide con spec §5 |
| Estado agregado | `aprobada` / `sujeta` / `rechazada` según excepciones pendientes y rechazos. Coincide con spec §6 |
| Re-evaluación v1 → v2 | `apiVarsCliente(deal, rev)` con `rev ≥ 1` regulariza sólo documentación, vigencias y garantías; no toca datos de buró (línea 7981-7986). Coincide con spec §5 |
| Las excepciones visadas no se re-abren | `reevaluarCliente` (línea 8329) no toca `VISADO_STATE`. Coincide con spec §6 |
| Umbrales de los tramos | Los valores (MM$5/10, MM$25/50, 3,7, 50%, 30/60%, 8/30%, 3/20%, 3/8 factorings, 35%) coinciden con spec §7–§9. **El error está en el nivel asignado, no en el umbral** |

---

## 5. Parámetros abiertos heredados de la spec (§13)

No son inconsistencias: son definiciones que la propia política declara pendientes. Bloquean el cierre del contrato del servicio.

| Ref | Parámetro |
|---|---|
| C07 | Tramos de excedente de línea (hoy 10%) |
| C08 | Umbrales de variación de venta (−20% / −40%) |
| C13 / D05 | Castigada CMF directa: ¿escala por monto o bloqueo firme? |
| C27 | Deuda vigente TGR: N2 en vez de rechazo (confirmado en v1.1) |
| C37 | Umbrales ratio cesión/venta (50% / 80%) |
| C39 | Cesión a factorings pequeños: ¿excepcionable o bloqueo firme? |
| O01 | Valores de banda de atribución y descuento máximo |
| O03 | Semántica del 30% de CxC: ¿mínimo exigido o tope de aplicación? |
| — | Escala de la nota de comportamiento: 1–5 vs. 1–7 (el umbral 3,7 se mantiene) |

---

## 6. Plan de trabajo sugerido

**Fase 1 — Decisiones de negocio** (bloqueante; no hay código que escribir antes)

1. INC-01: confirmar convención única de niveles (**N5 = máxima**) y retirar la homologación `6 − N` de la spec.
2. INC-02: confirmar que cualquier nivel superior autoriza; definir si hay tope.
3. INC-03: definir la escala de niveles del área Operaciones.
4. INC-04: definir si C47–C50 son reglas de cliente o de par C-D, y las variables que necesitan en A16.
5. INC-05: confirmar si el monto de la operación debe escalar la atribución.
6. INC-06: definir si Comité es usuario del sistema o salida a otro proceso.

**Fase 2 — Corrección en el módulo actual** (cada punto es una edición acotada)

7. `NV` → identidad (línea 8112) y C05 al nivel Comité.
8. Reemplazar `NIVEL_ROL` por `ROL_POR_AREA_NIVEL`; `puedeAprobarExc` compara contra `regla.area`.
9. Quitar la restricción `nivelesAprobArea(...).has(lv)`.
10. Implementar C47–C50.
11. Retirar el modelo de causas de desvío y su código muerto en `OtorgamientosView`.
12. Regenerar `atribuciones_otorgamiento.json` y marcar los `.xlsx` como legado.

**Fase 3 — Encapsulamiento**

13. Recién entonces extraer el motor: catálogo + evaluador + niveles quedan estables y el contrato del servicio se define una sola vez.

**Verificación tras cada cambio** (según `CLAUDE.md`): `tsc --jsx preserve --allowJs --noEmit --skipLibCheck` sin errores TS1,
y el chequeo de duplicados
`grep -oE "^(function|const|let|var) [A-Za-z0-9_]+" pipeline_comercial.jsx | awk '{print $2}' | sort | uniq -d` vacío.

---

## 7. Cómo reproducir la verificación

```bash
# 1) Reglas implementadas en runtime (esperado: 75 = 48 C + 23 D + 4 O)
awk '/^    R\(/{print}' pipeline_comercial.jsx | grep -oE '"[CDO][0-9]{2}"' | tr -d '"' | sort > /tmp/impl.txt
wc -l /tmp/impl.txt

# 2) Reglas de cliente ausentes respecto de C01–C52 (esperado: C47 C48 C49 C50)
for i in $(seq -w 1 52); do grep -qx "C$i" /tmp/impl.txt || printf "C%s " $i; done; echo

# 3) Puntos clave del ruteo de niveles
sed -n '8112p'  pipeline_comercial.jsx   # NV = 6 - N
sed -n '8673,8680p' pipeline_comercial.jsx  # NIVEL_ROL
sed -n '916,929p'  pipeline_comercial.jsx   # nivelesAprobArea + puedeAprobarExc
sed -n '854,891p'  pipeline_comercial.jsx   # MATRIZ_OTORG / CFG_TRAMOS / puedeAccionarCausa

# 4) Texto de la política vigente (requiere pypdf)
python3 -c "from pypdf import PdfReader; print('\n'.join((p.extract_text() or '') for p in PdfReader('Specs_Procesos/Spec_Proceso_Calificacion_Otorgamiento_Verificacion_v1.1.pdf').pages))" | less
```
