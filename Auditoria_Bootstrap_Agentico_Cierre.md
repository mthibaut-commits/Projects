# Cierre de la auditoría de bootstrap agéntico — lo que quedó cableado, lo que falta y lo que no corresponde

**Fecha:** 18-09-2026 · **Commit:** `a8e76db` (rama `claude/ecstatic-ptolemy-f7cb4m`; lo sustantivo está en `main`, `4cd5be6`)
**Marco:** skill `agentic-repo-bootstrap-v2`, los doce pasos · **Alcance:** el REPOSITORIO, no el producto
**Verificación previa:** los seis pasos de `CLAUDE.md`, los seis en verde (151/151 gates, 140/140 la suite, 29/29 la capa e2e)

Este documento cierra el que se abrió el 17-09-2026 (`Auditoria_Bootstrap_Agentico.md`). Aquel medía un
repositorio donde la disciplina existía pero **no estaba cableada**. Este mide el mismo repositorio después
de tres sesiones de trabajo y contesta una sola pregunta: **¿qué del bootstrap sigue pendiente, y de eso
qué corresponde a este repo y qué no?**

> La distinción importa. El skill trae doce pasos pensados para un repositorio que empieza. NEX no empieza:
> tiene 26.100 líneas de fuente, 140 casos de suite y un año de decisiones. Varios pasos del skill **no
> aplican**, y decirlo es parte del trabajo: un bootstrap que se cumple al pie de la letra sobre un proyecto
> maduro fabrica ceremonia que nadie va a usar. Lo que sigue separa las tres categorías sin mezclarlas.

---

## 1. La lista original, contestada

La auditoría del 17-09 cerró con seis recomendaciones ordenadas por retorno. Así quedaron:

| # | Recomendación | Estado |
|---|---|---|
| 1 | Partir `CLAUDE.md` sin perder un párrafo | ✅ 229 KB → **113 líneas**; 63 reglas verbatim en `vault/conocimiento/reglas/` (10 archivos), índice en `invariantes.md`, ADR-0001 |
| 2 | Cablear lo que ya existe (auditores, suite, hooks, CI) | ✅ **25 archivos** de contrato (151 tests), 3 hooks deterministas, CI de un job idéntico en toda rama, ADR-0002 |
| 3 | Cerrar la tabla de invariantes | ✅ 63 reglas y 12 invariantes del contrato, **ninguna fila «sin gate»**; suite 116 → 140, e2e 1 → 16 archivos |
| 4 | Decidir los datos (razones sociales reales) | ⛔ **pendiente — decisión del usuario** |
| 5 | Sacar `pipeline.zip` del versionado | ⛔ **pendiente** (sigue versionado, 1 archivo) |
| 6 | Anotar los dos componentes grandes como deuda medida | ✅ en el tablero, sin tocar el código |

Cuatro de seis hechas; las dos abiertas son las dos que **no son técnicas**: una necesita que el usuario
decida, la otra que el usuario confirme que el zip no le sirve a nadie.

---

## 2. Lo que el skill pide y este repo NO tiene

Medido contra los doce pasos, uno por uno. Las tres filas de arriba son las que valen algo acá.

| Paso | Qué pide | Estado en NEX | Veredicto |
|---|---|---|---|
| **8** | `vault/conocimiento/despacho_agentes.md`: routing de modelos, bloque invariante, cierres proporcionales | **Escrito el 18-09-2026** | ✅ salvo el routing por modelo, que este repo no tiene medido y por eso no se prescribe (§3) |
| **7** | Escalera de ceremonia T1/T2/T3 escrita en `.claude/rules/workflow.md` | **No existe el archivo**; «T3» se usa en el tablero, en `flujo_git.md`, en un hook y en cinco mensajes de commit | **Falta: hay una referencia colgando** (§4) |
| **6** | Cuarteto de gates: tests · tipos · lint · format-check | Tests ✅ · tipos ✅ · **lint ✗ · format ✗** (el repo no tiene linter ni formateador) | **Decisión, no tarea** (§5) |
| 2 | `vault/roadmap/`, `features/`, `specs/`, `plantillas/` | Sólo `adr/`, `sesiones/`, `conocimiento/` | No aplica hoy (§6) |
| 3 | `.claude/rules/workflow.md` y `architecture.md` | Sólo `code_style.md` y `testing.md` | `workflow.md` sí (§4); `architecture.md` ya vive en `vault/conocimiento/arquitectura.md` |
| 4 | Hook de formato · `tdd-guard` | No cableados | Correcto y documentado: no hay formateador, y `tdd-guard` exige un reporter por unidad que esta suite de integración no produce (ADR-0002) |
| 5 | Capa `unit` | No existe | Correcto y documentado: un solo archivo fuente; la suite prueba las funciones puras por su nombre (`.claude/rules/testing.md`) |
| 10 | Paridad local del artefacto | El `.bat` construye **el mismo HTML** que se entrega; las herramientas viven en el repo, no en `/tmp` | Cumplido por construcción |
| 11 | Graphify | No evaluado | Opcional; no vale el riesgo sobre un `CLAUDE.md` con gate de 150 líneas |
| 12 | Tag `v0.1.0` | ⛔ **el proxy del entorno deniega `refs/tags/*` (HTTP 403)** | Lo pone el usuario desde Windows (comando en el tablero) |

Los pasos 1, 2b, 9 y 12 (salvo el tag) están completos: `.gitignore` con el bloque que explica por qué
`.claude/` SÍ se versiona, README sin afirmar fase, regla de precedencia escrita en `vault/index.md`,
tablero con gate de 80 líneas, tres niveles de memoria declarados, ADR-0001 con las desviaciones.

---

## 3. El hueco caro: no hay doctrina de despacho, y esta sesión probó que hace falta

> **Cerrado el 18-09-2026** en [`vault/conocimiento/despacho_agentes.md`](vault/conocimiento/despacho_agentes.md),
> con el bloque invariante verbatim, la consigna del refutador, los cuatro modos de falla de abajo y los límites
> del contenedor. `vault.test.mjs` exige que las ocho cláusulas del brief sigan ahí: la forma de perderlo otra vez
> no es borrar el archivo, es resumirlo. El **routing por modelo** queda fuera a propósito — no está medido en
> este repo, y prescribirlo sin evidencia sería inventarlo. Lo que sigue es el hallazgo tal como se escribió.

**El dato.** Para cerrar la tabla de invariantes esta sesión despachó **más de noventa agentes**: uno por
fila para escribir el gate, otro por fila para intentar refutarlo, reparadores para lo refutado y pulidores
para lo aceptado. Funcionó —los 30 gates existen y pasan— pero **nada de cómo se hizo quedó en el repo**.

**Qué se perdió.** El bloque invariante que obedecía cada agente (no editar el repo, no construir, todo en
su carpeta, máximo 6 corridas, dos direcciones cuando la regla bloquea, sonda cuando es una propiedad)
vivía en un `BRIEF.md` del scratchpad de la sesión. Ese directorio no sobrevive a la sesión. La próxima
que quiera orquestar algo parecido **lo escribe de nuevo, y probablemente peor**.

**Por qué importa más que en un repo cualquiera.** Los refutadores encontraron, en los gates de sus
compañeros, exactamente los errores que el skill anticipa y que una doctrina escrita evita:

- gates que fijaban **la salida de hoy y no la regla** (tres casos: uno exigía «aprobado» para una tasa bajo
  el mínimo, o sea lo contrario de lo que la regla dice, y se blindaba contra su corrección);
- comprobaciones **vacuas** (un solape entre celdas de un grid que no puede fallar nunca);
- **contaminación entre casos** (un caso dejaba el Directorio encendido, un modal abierto o el filtro
  cambiado, y tumbaba a los siguientes);
- casos que **reventaban en vez de fallar**, abortando el reporte de los otros 139.

Esa lista es el contenido del documento que falta. Está medida, es de este repo y hoy sólo existe en el log
de la sesión, que nadie lee antes de despachar.

**Costo de escribirlo:** una sesión T2. **Costo de no escribirlo:** la próxima orquestación repite los
cuatro errores y los descubre otra vez a punta de refutación.

---

## 4. La referencia colgando: «T3» se usa y no está definido en ninguna parte

`grep -rn "T3"` devuelve el tablero (dos veces), `vault/conocimiento/flujo_git.md`, el comentario del hook
`gitflow_guard.mjs` y cinco mensajes de commit. **T1 y T2 no aparecen nunca.** La escalera de ceremonia
—que es lo que le da sentido a la sigla— vive sólo en §8 de la auditoría del 17-09, que es un documento de
diagnóstico, no una regla que alguien vaya a leer antes de trabajar.

El resultado práctico: un agente nuevo ve «commit T3» en el tablero, no encuentra qué es un T3, y elige
entre inventarlo o cobrar el paquete completo. Las dos salidas son malas.

**Lo que falta** es un `.claude/rules/workflow.md` con la escalera ya calibrada a NEX (la tabla de §8 de la
auditoría anterior sirve tal cual), el ciclo de desarrollo y el cierre de sesión. Es reubicar texto que ya
existe, igual que la partición de `CLAUDE.md`: **no hay que inventar nada**.

---

## 5. El cuarteto de gates está incompleto, y completarlo es una decisión, no una tarea

El skill pide cuatro gates que no se subsumen: tests, tipos, lint y format-check. NEX tiene los dos
primeros y **no tiene linter ni formateador**. Agregarlos hoy no es gratis:

- un formateador sobre `pipeline_comercial.jsx` reescribe **26.100 líneas** en un commit, y el fuente tiene
  una trampa conocida —el bloque `<style>` es un template literal donde un backtick fuera de lugar rompe el
  parseo a cientos de líneas de distancia (`code_style.md`)—;
- el repo no tiene dependencias npm por diseño, así que un linter introduce la primera.

Tres caminos, y la elección es del usuario:

1. **Declararlo desviación aceptada** en un ADR, con el motivo. Es lo más barato y deja el hueco visible en
   vez de silencioso. Hoy el hueco no está declarado en ninguna parte: es la única desviación del skill que
   no tiene su fila en ADR-0001 ni en ADR-0002.
2. **Format-check sólo sobre lo nuevo** (`tests/`, los `.mjs`), dejando el `.jsx` fuera con su razón escrita.
3. **Formatear el `.jsx` entero** en un commit propio, con los seis pasos corriendo antes y después. Es
   defendible, pero el diff tapa cualquier revisión que venga después.

Mi recomendación es la 1 o la 2. La 3 sólo si el usuario quiere cerrar el tema de una vez.

---

## 6. Lo que el skill pide y NO corresponde traer

Decirlo explícitamente evita que la próxima sesión lo interprete como deuda:

- **`vault/roadmap/`, `features/`, `specs/`** — el flujo `feature → spec → plan → tareas` es para trabajo que
  nace de un backlog. El de NEX nace de una petición del usuario en su pantalla, y el contrato que hay que
  cumplir no es una spec nueva: son las 63 reglas ya escritas, todas con gate. Crear esos directorios vacíos
  hoy es fabricar ceremonia. **Cuando llegue un T1 de verdad** —un motor nuevo, un invariante nuevo— ahí se
  crea `vault/specs/<slug>/` y no antes.
- **`vault/plantillas/`** — con una excepción barata: hay tres tipos de documento que ya se escriben a mano
  cada vez (log de sesión, ADR, regla). Tres plantillas cuestan media hora y evitan que cada sesión invente
  su formato. Es lo único de este bloque que recomiendo.
- **Capa `unit`, hook de formato, `tdd-guard`** — ya decididos y documentados con su razón. No volver sobre
  ellos.
- **Graphify** — el repo tiene UN archivo fuente. La herramienta resuelve el problema de agentes releyendo
  muchos archivos; acá el problema es el opuesto.

---

## 7. Deuda medida que sigue abierta (no es del bootstrap, pero se cuenta acá)

1. **Las cifras de `arquitectura.md` y `README.md` siguen desfasadas**: dicen ~21.000 líneas, 118 componentes
   y ~31 MB; lo medido hoy es ~26.100, 154 y 40,7 MB. Es exactamente el hallazgo §2.3 de la auditoría
   anterior —tres cifras que envejecieron en silencio— **repitiéndose en otro documento**. Ningún gate lo
   vigila, y por eso volvió a pasar. Un commit T3, o un gate que compare contra la medición.
2. **`pipeline.zip`** sigue versionado (build del 12-08-2026). **Corrección del 18-09**: pesa **2,7 MB**, no 29,6 — esa cifra es el contenido descomprimido (28,3 MB de `pipeline_comercial.html`). Sacarlo sigue siendo correcto por ser un build de algo generado, no por su peso.
3. **Los 20 desfases regla↔código** que los gates midieron al cerrar la tabla, listados en
   `vault/sesiones/2026-09-17_cerrar_invariantes.md`. Tres pesan de verdad: una cláusula de la regla 8 que no
   existe en el código, `validarMutacion` con un solo call site (tres invariantes declarados y nunca
   invocados) y el `idProceso` que colisiona entre pestañas y descarta la segunda solicitud en silencio.

---

## 8. El orden que tendría sentido

Por retorno sobre esfuerzo, y sin empaquetar nada que no lo necesite:

1. ~~**`vault/conocimiento/despacho_agentes.md`** (§3) — T2. El material está medido y es de este repo.~~ **HECHO el 18-09-2026**, con gate en `vault.test.mjs`.
2. **`.claude/rules/workflow.md`** con la escalera (§4) — T2. Es reubicar texto que ya existe.
3. **Decidir el cuarteto de gates** (§5) — una conversación, después un ADR de tres párrafos.
4. **Los datos** (recomendación 4 de la auditoría anterior) — un ADR y su gate.
5. **`pipeline.zip`** fuera del versionado, y las cifras de `arquitectura.md`/`README.md` al día — un T3.
6. **Tres plantillas** (§6) — media hora.

Lo que **no** hay que hacer: crear `roadmap/`, `features/` ni `specs/` vacíos, meter un formateador sin
decidirlo, ni escribir specs para trabajo que las reglas con gate ya describen.

---

## 9. Cómo reproducir cada número

```bash
wc -l CLAUDE.md vault/sesiones/estado_actual.md      # 113 y 80 (los dos con gate)
ls tests/contract/*.test.mjs | wc -l                  # 25 archivos
node --test "tests/contract/*.test.mjs"               # 151/151
ls tests/e2e/*.e2e.mjs | wc -l                        # 16 archivos
grep -c "sin gate\*\*" vault/conocimiento/invariantes.md   # sólo en la prosa, ninguna fila
grep -rn "T3" CLAUDE.md vault/ .claude/ | grep -v sesiones/20   # usos sin definición
ls vault/                                             # adr, conocimiento, sesiones (no hay specs/ ni features/)
ls .claude/rules/                                     # code_style.md, testing.md (no hay workflow.md)
ls vault/conocimiento/despacho_agentes.md             # desde el 18-09-2026 existe
git ls-files | grep pipeline.zip                      # sigue versionado (2,7 MB; los 29,6 de §… son el contenido descomprimido)
```
