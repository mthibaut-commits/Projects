<#
  build_app.ps1
  ---------------------------------------------------------------
  Genera pipeline_comercial.html a partir de pipeline_comercial.jsx.

  No hay paso de build/bundling: el HTML resultante carga
  React 18 + lucide-react + recharts + d3-sankey via importmap (ESM,
  esm.sh) y transpila el JSX en el navegador con Babel Standalone
  (embebido localmente desde babel.min.js.descarga). Tailwind se
  incluye embebido localmente desde saved_resource (script CDN de
  tailwindcss.com, clases base, sin config extra).

  El .jsx NO trae su propio createRoot: este script lo appendea al
  final del bundle inline. Nunca agregar createRoot directamente en
  pipeline_comercial.jsx.
  ---------------------------------------------------------------
#>

$ErrorActionPreference = "Stop"

try {
    $root       = $PSScriptRoot
    $jsxPath    = Join-Path $root "pipeline_comercial.jsx"
    $outPath    = Join-Path $root "pipeline_comercial.html"
    $babelPath  = Join-Path $root "babel.min.js.descarga"
    $twPath     = Join-Path $root "saved_resource"

    if (-not (Test-Path $jsxPath)) {
        throw "No se encontro pipeline_comercial.jsx en $root"
    }

    # Lectura robusta de encoding (evita problemas de BOM/ANSI de Get-Content).
    $jsxSource = [System.IO.File]::ReadAllText($jsxPath, [System.Text.Encoding]::UTF8)

    $babelJs = $null
    if (Test-Path $babelPath) {
        $babelJs = [System.IO.File]::ReadAllText($babelPath, [System.Text.Encoding]::UTF8)
    }

    $tailwindJs = $null
    if (Test-Path $twPath) {
        $tailwindJs = [System.IO.File]::ReadAllText($twPath, [System.Text.Encoding]::UTF8)
    }

    # Colecciones de datos del webhook/SFTP (window.DTESYNC, LISTA_BLANCA, DEUDORES_AUTORIZADOS,
    # AECSYNC, SHARE_OF_WALLET, ESTRATEGIA_PRECIO, LINEA_DISPONIBLE). Sin ellas el inbound no
    # clasifica ninguna factura y el pipeline queda vacio (rescatadas del build original de Cowork).
    $datosPath = Join-Path $root "datos_inyectados.js"
    $datosJs = $null
    if (Test-Path $datosPath) {
        $datosJs = [System.IO.File]::ReadAllText($datosPath, [System.Text.Encoding]::UTF8)
    }

    # ---- Fragmentos de HTML (single-quoted: sin interpolacion de PowerShell) ----
    # Importante: todo lo que viene de archivos externos (jsx, babel, tailwind) se
    # concatena tal cual con "+", nunca se interpola dentro de un here-string de
    # PowerShell, porque esos archivos contienen literales ${...} / $variable /
    # backticks de JS que PowerShell reinterpretaria y corromperia.

    $head = @'
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NEX Factoring - Pipeline Comercial</title>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "lucide-react": "https://esm.sh/lucide-react@0.383.0?external=react",
    "recharts": "https://esm.sh/recharts@2.12.7?external=react,react-dom",
    "d3-sankey": "https://esm.sh/d3-sankey@0.12.3"
  }
}
</script>
<style>
  html, body, #root { height: 100%; }
  body { margin: 0; }
</style>
<script>
'@

    $head2 = @'
</script>
<script>
'@

    $head3 = @'
</script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-type="module" data-presets="react">
import React from "react";
import ReactDOM from "react-dom/client";

'@

    $tail = @'

ReactDOM.createRoot(document.getElementById("root")).render(<PipelineComercial />);
</script>
</body>
</html>
'@

    # Bloque de datos inyectados: va ANTES del bundle de la app, como script clasico,
    # para que window.DTESYNC y demas existan cuando el modulo evalue sus constantes.
    $datosBlock = if ($datosJs) { '</script>' + "`n" + '<script>' + "`n" + $datosJs + "`n" + '</script>' + "`n" + '<script>' + "`n" } else { '' }

    # Si falta algun recurso local, cae a CDN online como respaldo.
    $babelBlock = if ($babelJs) {
        $head + $datosBlock + $babelJs + $head2
    } else {
        $head + $datosBlock + '</script>' + "`n" + '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>' + "`n" + '<script>'
    }

    $tailwindBlock = if ($tailwindJs) {
        $babelBlock + $tailwindJs + $head3
    } else {
        $babelBlock + '</script>' + "`n" + '<script src="https://cdn.tailwindcss.com"></script>' + "`n" + '<script type="text/babel" data-type="module" data-presets="react">' + "`n" + 'import React from "react";' + "`n" + 'import ReactDOM from "react-dom/client";' + "`n`n"
    }

    $html = $tailwindBlock + $jsxSource + $tail

    # Escritura UTF-8 sin BOM (mas compatible con file:// en navegadores).
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outPath, $html, $utf8NoBom)

    Write-Host "OK: generado $outPath"
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
