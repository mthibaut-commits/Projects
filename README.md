# NEX Factoring — Pipeline Comercial

Demo de un pipeline comercial de **factoring chileno** para Datamart, sobre el caso de BICE / Factoring
Security. UI en español (Chile).

La app es un **HTML standalone** que se abre en Chrome: no hay servidor, ni bundler, ni CDN.

## Construir y abrir

```bash
node build_app.mjs          # ~1,5 s → pipeline_comercial.html (~31 MB)
```

En Windows, Mauricio usa `Iniciar_NEX_Factoring.bat`, que llama a `build_app.ps1`. **Las dos
implementaciones cumplen el mismo contrato y hay que mantenerlas en sincronía.**

## Verificar

```bash
npx tsc --jsx preserve --allowJs --noEmit --skipLibCheck pipeline_comercial.jsx   # sin errores TS1
node build_app.mjs                                                                # valida los sha256 de vendor/
node --test "tests/contract/*.test.mjs"                                           # gates de contrato (vault, índice, fuente, hooks)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_tests.mjs                       # la suite: 165 casos en ChromiumPLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_pantallas.mjs              # si el cambio toca la UI
```

## Por dónde empezar

| Quiero… | Voy a |
|---|---|
| Entender el proyecto antes de tocar nada | **`CLAUDE.md`** (comandos y reglas núcleo) → `vault/sesiones/estado_actual.md` (estado y siguiente paso) → `vault/conocimiento/invariantes.md` (las reglas de dominio, por tema, con qué caso las verifica) |
| Saber cómo funciona el negocio | `Specs_Procesos/`, por tema: `Otorgamiento/`, `Verificacion/`, `Lineas/`, `Excepciones/` y `Evaluacion_Factura/` (lo transversal: ciclo de la factura, inbound, pricing, giro, mensajería). En cada uno, el `.md` manda y el PDF es su copia entregable |
| Integrar con los sistemas de Security | `Levantamiento_Activos_Informacion.md` (A1–A23) y `Integraciones/` |
| Trabajar en el motor de otorgamiento | `Specs_Procesos/Otorgamiento/spec-otorgamiento.md` (el modelo y el contrato del motor) y `Regresiones/Inconsistencias_Motor_Otorgamiento.md` — **INC-01 a INC-07 están cerrados**; lo que sigue abierto son los parámetros que la política declara sin definir (§5) |
| Saber qué se midió del repo o del fuente | `Auditoria/` — cada informe sale con un número; `Regresiones/` — dónde la definición y la implementación no calzan |
| Exportar pantallas a Figma | `Capturas_UI/` — capturas del DOM real, generadas por `capturar_pantallas.mjs` |

## Cómo está organizado

- **Un solo archivo fuente:** `pipeline_comercial.jsx` (~50.000 líneas, ~155 componentes, un componente
  raíz `PipelineComercial`). React 18 + Tailwind CORE, transpilado en el navegador por Babel Standalone.
- **`vendor/`** — dependencias UMD vendorizadas, con `sha256` fijado en `vendor/SBOM.json`. **El build
  falla si un hash no calza.** `.gitattributes` marca `vendor/** -text`: normalizar fines de línea
  cambia los bytes y rompe la integridad.
- **`datos_inyectados.js`** (~33 MB) — el dataset que alimenta el inbound: 30.000 facturas de DTESync,
  lista blanca, AECSync, share of wallet. Sin él el pipeline queda en 0 oportunidades. No editar a mano.

`CLAUDE.md` y el `vault/` son la fuente de verdad operativa y mandan sobre este archivo.
