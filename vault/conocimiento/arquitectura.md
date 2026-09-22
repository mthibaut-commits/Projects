---
type: conocimiento
title: "Arquitectura y build"
description: "Un solo archivo fuente, el build dual (PowerShell y Node) con el mismo contrato, las dependencias vendorizadas fijadas por SBOM, el web component, los datos inyectados y el feed de proveedores"
tags: [conocimiento, arquitectura, build]
timestamp: 2026-09-17T15:29:14Z
---

# Arquitectura y build

> Verbatim del `CLAUDE.md` anterior al 17-09-2026. Los comandos canónicos están en la tabla de `CLAUDE.md`; acá está el porqué de cada pieza. **Tres cifras de este texto están desfasadas y sin gate** (líneas, componentes y MB del build: ver `Auditoria/Auditoria_Bootstrap_Agentico.md` §2.3); se corrigen cuando exista el gate que las produzca, no a mano.

- **Un solo archivo fuente:** `pipeline_comercial.jsx` (~50.000 líneas, ~155 componentes). React 18 + Tailwind CORE (sin compilador: solo clases base) en un único componente raíz `PipelineComercial`.
- **Build:** dos implementaciones del MISMO contrato, hay que mantenerlas en sincronía:
  - `build_app.ps1` — el que usa Mauricio en Windows vía `Iniciar_NEX_Factoring.bat`.
  - `build_app.mjs` — puerto a Node (`node build_app.mjs`), para construir y verificar donde no hay PowerShell (contenedores Linux, CI, sesiones remotas). Mismo resultado.
  - Si cambia uno, cambia el otro. Tarda ~1,5 s y genera ~31 MB.
- **Sin bundler ni CDN:** el HTML embebe las dependencias **vendorizadas** desde `vendor/` (builds UMD: react, react-dom, prop-types, `_alias.js`, d3-path/array/shape/sankey, lucide-react, recharts, xlsx) y transpila el JSX en el navegador con Babel Standalone (`babel.min.js.descarga`). Tailwind sale de `saved_resource`. El orden de `vendorOrden` importa. Ya NO hay importmap ni esm.sh.
- **Integridad del vendor:** `vendor/SBOM.json` fija versión y `sha256` de cada dependencia y el build **falla** si un hash no calza. Actualizar una librería = bajar el archivo, revisar el diff y regenerar el manifiesto a propósito. `.gitattributes` marca `vendor/** -text` porque cualquier normalización de fin de línea cambia los bytes y rompe el hash (`_alias.js` es CRLF a propósito).
- **El `.jsx` no monta la app:** el build APPENDEA `definirWebComponent(React, ReactDOM, PipelineComercial)` + el `<nex-pipeline>` en `#root`. El fuente termina en el `}` de cierre de `PipelineComercial` — **nunca agregar el montaje raíz al fuente**. (El `ReactDOM.createRoot` que sí vive en el `.jsx` está DENTRO de `definirWebComponent`: es el contrato de embebido, no el arranque.) El build también traduce los `import` a destructuring de globales UMD y quita el `export default`; el fuente los conserva porque es lo que entiende `tsc`.
- **Datos inyectados (CRÍTICO):** el build embebe `datos_inyectados.js` (~25 MB, rescatado del build de Cowork) como script clásico ANTES del bundle: define `window.DTESYNC` (30.000 facturas), `LISTA_BLANCA`, `DEUDORES_AUTORIZADOS`, `AECSYNC`, `SHARE_OF_WALLET`, `ESTRATEGIA_PRECIO`, `LINEA_DISPONIBLE`. **Sin este archivo el inbound no clasifica ninguna factura y el pipeline queda en 0 oportunidades** (el generador sintético de respaldo no trae `tipoDeudor`/`inboundBucket`). No editarlo a mano.
- **Feed diario de proveedores:** `proveedores_clientes.json` se embebe como `window.PROVEEDORES_CLIENTES` (en producción va por API). Es un archivo EXTERNO, así que el build escapa `<` como `\u003c`: una razón social con `</script` cerraría el bloque y lo siguiente se parsearía como marcado.
- El resultado es un HTML standalone que el usuario abre en Chrome.
