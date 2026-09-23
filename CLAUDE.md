# NEX Factoring — Pipeline Comercial (demo BICE / Factoring Security)

Demo de un pipeline comercial de factoring chileno para Datamart. UI en español (Chile).

## 📍 Estado

La fase, lo que está en vuelo y el siguiente paso viven **solo** en `vault/sesiones/estado_actual.md`
(regla núcleo 1: se lee al abrir toda sesión). Este documento no afirma la fase ni cita conteos del código:
cuando lo hacía, tres cifras quedaron obsoletas en silencio (`Auditoria/Auditoria_Bootstrap_Agentico.md`, §2.3).

## Stack

React 18 + Tailwind CORE **vendorizados** en `vendor/` (UMD, fijados por `sha256` en `vendor/SBOM.json`; el build
falla si un hash no calza) · JSX transpilado en el navegador con Babel Standalone · sin bundler ni CDN · Node 22
sólo para construir, probar y auditar · Playwright con el Chromium del contenedor. **Un solo archivo fuente**,
`pipeline_comercial.jsx`, que el build embebe junto a `datos_inyectados.js` (~46 MB; **sin él el pipeline queda
en 0 oportunidades**) en un HTML standalone que se abre en Chrome. El porqué de cada pieza:
`vault/conocimiento/arquitectura.md`.

## Verificación — SIEMPRE tras editar el `.jsx`, en este orden

```bash
npx prettier@3.6.2 --check pipeline_comercial.jsx                                                                   # 0 · el formato (ADR-0006)
npx eslint pipeline_comercial.jsx                                                                             # 0-bis · el linter (0 hallazgos)
npx tsc --jsx preserve --allowJs --noEmit --skipLibCheck pipeline_comercial.jsx                              # 1 · sin errores TS1
grep -oE '^(export default )?(async )?(function|const|let|var|class) [A-Za-z_$][A-Za-z0-9_$]*' pipeline_comercial.jsx | awk '{print $NF}' | sort | uniq -d  # 2 · debe salir vacío
node build_app.mjs                                                                                            # 3 · valida los hashes del vendor
node --test "tests/contract/*.test.mjs"                                                                       # 4 · gates de contrato (~10 s)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_tests.mjs                                                  # 5 · 171/171 PASA (~2 min)PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/e2e/correr.mjs                                           # 6 · e2e: 37 casos de pantalla (~8 min)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_pantallas.mjs                                         # 7 · sólo si toca la UI (~5 min)
```

Los pasos **0 y 0-bis** no verifican una conducta: protegen a los otros. El linter (`eslint.config.mjs`) no trae
reglas de estilo —de la forma se encarga Prettier— y cada regla suya cita el incidente de este repo que habría
cazado; al adoptarlo encontró una clave duplicada en un objeto de pricing. Los gates `regla_<slug>` y los dos auditores
leen el fuente como TEXTO y están re-anclados contra el `.jsx` formateado (ADR-0006), así que deshacer el formato
los tumba de a uno en sesiones distintas. Para arreglarlo: `npx prettier@3.6.2 --write pipeline_comercial.jsx`.
Ninguno de los seis subsume a otro, **y los cinco primeros juntos tampoco bastan**: la colisión parámetro/variable local, un
bloque declarado antes de su dependencia y un componente no importado pasan `tsc` y el build, y sólo aparecen en
el paso 5 o al abrir la pantalla — que es lo que hace el paso 6 (`tests/e2e/`, con la sesión iniciada y el detalle
abierto). El CI (`.github/workflows/gates.yml`) corre los seis en toda rama y todo PR, idénticos. Qué cubre cada caso de la suite: `vault/conocimiento/verificacion.md`; qué fija cada gate de
contrato: `vault/conocimiento/invariantes.md` § Gates. **Desde el 17-09-2026 ninguna regla queda «sin gate»**: las 104 de dominio y los 12 del contrato citan su caso de la suite, su `e2e-<regla>` o su `regla_<slug>.test.mjs`.

## Otros comandos

| Acción | Comando |
|---|---|
| Build en Windows (el del usuario) | `Iniciar_NEX_Factoring.bat` → `build_app.ps1` — **mismo contrato que `build_app.mjs`: si cambia uno, cambia el otro** |
| ¿Los hooks están corriendo acá? | `node verificar_hooks.mjs` — **la primera vez en cada máquina**, y cuando un hook «no saltó» |
| Código muerto | `node auditar_muerto.mjs` (`--csv` para el inventario en crudo) |
| Aislamiento de los motores | `node auditar_aislamiento.mjs` |
| Unidades (millones donde va un peso) | `node auditar_unidades.mjs` — candidatos, se verifican a mano |
| Regenerar atribuciones | `node build_app.mjs && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node regenerar_atribuciones.mjs` |
| Regenerar los activos sintéticos | `node GeneradorDatos/generar.js` — tiene punto fijo: reproduce el archivo commiteado byte a byte (gate `generador.test.mjs`) · un solo bloque: `--solo=VERIFICACION` |
| Spec `.md` → PDF | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node md_a_pdf.mjs <archivo.md>` |
| Consolidado de integraciones | `node armar_integraciones.mjs` |
| Tubo con una operación simulada | `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_tabla_simulada.mjs` → `Capturas_Simuladas/` |

## Reglas núcleo

1. **Memoria primero**: al iniciar, lee `vault/sesiones/estado_actual.md`; al terminar —o antes de una
   compactación— sobrescríbelo (≤80 líneas) y añade un log en `vault/sesiones/`.
2. **El tablero manda**: la fase y los bloqueos viven sólo ahí. Si otro documento afirma una fase o un conteo
   y contradice al tablero o a la medición, gana la medición y ese documento se corrige en el mismo commit.
3. **Las reglas de dominio viven en el vault, por tema, y se leen ANTES de tocar lo que gobiernan**:
   `vault/conocimiento/invariantes.md` es el índice (qué regla, dónde vive, qué caso la verifica) y
   `vault/conocimiento/reglas/<tema>.md` el texto. Están ganadas con incidentes reales: **no se resumen ni se
   renumeran**, se citan por número (`regla 24`, `regla 13-ter`). Una regla nueva toma el **siguiente entero
   libre** y va al final de su tema — nunca un sufijo `-bis`: así se fracturó la numeración anterior.
4. **Verificación completa antes de cada commit**: los seis pasos de arriba, el séptimo si toca la UI. Lo que
   cambia en el detalle, el wizard o la bandeja lo verifica el paso 6 o abrir la pantalla — la suite no los monta.
5. **Idiomas**: UI, documentación, vault, commits y comentarios en **español (Chile)**. Los identificadores
   siguen la convención que el fuente ya tiene (`.claude/rules/code_style.md`).
6. **Git**: `main` estable; se trabaja en la rama designada de la sesión o en `feature/<slug>`; integración con
   `merge --no-ff`; sin worktrees salvo que el usuario los pida. Mensajes de commit en español, descriptivos,
   que digan qué y por qué — el estilo del `git log`. → `vault/conocimiento/flujo_git.md`. *(Bloqueado por hooks.)*
7. **Decisiones = ADR**: una decisión con alternativas descartadas va a `vault/adr/` (inmutable; para cambiar,
   ADR nuevo que la reemplaza). Las tomadas antes de existir el vault están en `vault/adr/index.md`
   apuntando a la regla que las contiene: **no se re-litigan** (sidebar, drawer, Mis Tareas, nivel Comité…).
8. **Invariantes**: la tabla de `vault/conocimiento/invariantes.md` es lo que un review rechaza sin
   discusión. Una regla nueva entra ahí **con su caso en la suite** o con la columna *sin gate* escrita,
   nunca en silencio.
9. **Todo monto es un peso entero**; el millón es una abreviatura de PANTALLA (`fmtMM`, escala única `M$`).
   **Datos sintéticos DETERMINISTAS** (`hashStr` + `pcRng`), nunca `Math.random`; el pipeline **lee** los
   activos, no los genera.
10. **No tocar**: `vendor/` (bytes fijados por el SBOM), lo **generado** (`datos_inyectados.js`, las capturas,
    `atribuciones_otorgamiento.json`, los PDF: se corrige el origen y se regenera), `Legado/`, los ADR aceptados.
    **Nunca agregar el montaje raíz al `.jsx`**: lo appendea el build y el fuente termina en el `}` de
    `PipelineComercial`. *(Bloqueado por hooks, y por `tests/contract/`.)*
11. **Errores**: ante un fallo inesperado, registra causa y solución en el log de sesión antes de seguir — la
    próxima sesión no debe redescubrirlo. Lo que en 3 meses siga importando sube a `vault/conocimiento/`.
    **Nunca `rev` en una tubería**: en este contenedor no termina —gira al 99% de CPU indefinidamente—, así que
    para recortar el final de una línea va `python3 -c` o `awk`. Y **un comando que se pasa del tiempo de espera
    deja su proceso vivo**: se revisa con `ps -eo pid,etime,pcpu,comm | awk '$3+0>1'` y se mata, o sigue comiendo
    núcleos y frena las corridas de pruebas (17-09-2026: cuatro `rev` colgados, uno casi seis horas).
12. **Al dudar sobre el proyecto, busca en `vault/` antes de preguntar o asumir**:
    `grep -rn "^13-ter\." vault/conocimiento/reglas/` encuentra una regla por su número.

## Flujo de trabajo con el usuario

- El usuario (Mauricio, Datamart) reconstruye el HTML con el `.bat` y prueba en Chrome; itera con screenshots. Responder en español.
- Ediciones quirúrgicas con anclas únicas; verificar tras cada cambio (ver «Verificación» arriba). El archivo es grande: leer solo las secciones necesarias.
- **Su carpeta local es Windows (CRLF) y el repo es LF.** Al traer archivos suyos hay que normalizar, salvo `vendor/` (bytes fijados por el SBOM). Al comparar, normalizar antes de diferenciar o el diff sale entero.
- Historial: este proyecto se migró desde Cowork; ya no existe la copia espejo en `outputs` — hay UN solo `pipeline_comercial.jsx`.

## Mapa

- `.claude/rules/workflow.md` — **la escalera de ceremonia T1/T2/T3**, el ciclo de una tarea y el cierre de sesión
- `pipeline_comercial.jsx` — el fuente entero; convenciones y trampas en `.claude/rules/code_style.md` (se carga al tocarlo)
- `tests_asignacion_lineas.js` + `run_tests.mjs` — la suite · `tests/contract/` — gates de contrato · `tests/e2e/` — casos con sesión real (`.claude/rules/testing.md`)
- `build_app.mjs` / `build_app.ps1` — el build · `.github/workflows/gates.yml` — el CI, un solo job para toda rama
- `.claude/settings.json` + `.claude/hooks/` — los hooks deterministas (qué bloquean: `vault/conocimiento/loop_agentico_hooks.md`)
- `vault/` — memoria del proyecto; `vault/index.md` es su mapa
  - `conocimiento/invariantes.md` — **índice** de las reglas de dominio y del contrato con el servidor
  - `conocimiento/reglas/` — las reglas verbatim, por tema · `arquitectura.md` · `verificacion.md` · `contrato_servidor_y_auditoria.md` · `mapa_documentos.md`
  - `conocimiento/despacho_agentes.md` — **el bloque invariante que recibe todo agente despachado**, la consigna del refutador y los cuatro modos de falla medidos
  - `adr/` — decisiones · `sesiones/estado_actual.md` — el tablero · `sesiones/` — logs
- `Specs_Procesos/<tema>/` (`Otorgamiento` · `Verificacion` · `Lineas` · `Excepciones` · `Evaluacion_Factura`) · `Integraciones/` · `Levantamiento_Activos_Informacion.md` — la fuente de verdad de negocio; qué es cada uno: `vault/conocimiento/mapa_documentos.md`
- `GeneradorDatos/` — produce los activos sintéticos (`datos_inyectados.js`, `proveedores_clientes.json`)
- `Capturas_UI/` (el estado por defecto) · `Variantes_UI/` (los estados del detalle) · `Capturas_Simuladas/` (lo que
  exige conducir la app) — el DOM real capturado, fuente para Figma; `Figma_Export/` quedó obsoleto como fuente
- `Casos_de_Prueba/` — qué hay que mirar en pantalla para aceptar una entrega (97 casos, con su regla y su cobertura)
- `Auditoria/` — los informes que MIDEN (el repo, el fuente, el generador) · `Regresiones/` — lo que cotejó definición contra implementación y dejó hallazgos; la historia del proyecto vive ahí y en `vault/sesiones/`
