<#
  build_app.ps1
  ---------------------------------------------------------------
  Genera pipeline_comercial.html a partir de pipeline_comercial.jsx.

  No hay paso de build/bundling: el HTML resultante embebe
  React 18 + lucide-react + recharts + d3-sankey desde vendor/ (builds
  UMD, sin CDN en runtime) y transpila el JSX con Babel Standalone
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

    # ---- Estampa de build (VERSIONADO) ----------------------------------------------------------
    # Gestion de incidencias: el HTML generado debe poder identificarse a si mismo. Se inyecta
    # window.__NEX_BUILD__ ANTES del bundle, para que APP_BUILD lo lea al evaluar sus constantes.
    # Si el repo no esta disponible (copia suelta del build), cae a "sin-git" en vez de fallar.
    $buildFecha = (Get-Date).ToString("yyyy-MM-dd HH:mm")
    $buildCommit = "sin-git"
    $buildRama = "-"
    try {
        $c = & git -C $root rev-parse --short HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $c) { $buildCommit = $c.Trim() }
        $b = & git -C $root rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $b) { $buildRama = $b.Trim() }
        # Marca el build como sucio si hay cambios sin commitear: un HTML generado sobre el working
        # tree no corresponde a ningun commit y eso tiene que verse en el diagnostico.
        $st = & git -C $root status --porcelain 2>$null
        if ($LASTEXITCODE -eq 0 -and $st) { $buildCommit = $buildCommit + "+local" }
    } catch { }
    # Ademas del objeto global, se deja un <meta name="nex-build"> para poder identificar el archivo
    # desde "ver codigo fuente" sin abrir la app ni la consola.
    $buildMeta = $buildFecha + ' | ' + $buildCommit + ' | ' + $buildRama
    $buildJs = 'window.__NEX_BUILD__={fecha:"' + $buildFecha + '",commit:"' + $buildCommit + '",rama:"' + $buildRama + '"};' + "`n" +
               'try{var m=document.createElement("meta");m.name="nex-build";m.content="' + $buildMeta + '";document.head.appendChild(m);}catch(e){}'

    # Colecciones de datos del webhook/SFTP (window.DTESYNC, LISTA_BLANCA, DEUDORES_AUTORIZADOS,
    # AECSYNC, SHARE_OF_WALLET, ESTRATEGIA_PRECIO, LINEA_DISPONIBLE). Sin ellas el inbound no
    # clasifica ninguna factura y el pipeline queda vacio (rescatadas del build original de Cowork).
    $datosPath = Join-Path $root "datos_inyectados.js"
    $datosJs = $null
    if (Test-Path $datosPath) {
        $datosJs = [System.IO.File]::ReadAllText($datosPath, [System.Text.Encoding]::UTF8)
    }

    # ---- Dependencias VENDORIZADAS (OWASP A08) ------------------------------------------------
    # Antes React, recharts, lucide y d3-sankey se cargaban desde esm.sh por importmap, SIN integrity.
    # Un import map no permite proteger la cadena completa: la URL de entrada de esm.sh es un shim de
    # ~130 bytes que re-exporta desde otra ruta, de modo que un SRI ahi cubre el shim y no el codigo.
    # Ademas la app se abre por file:// (ver Iniciar_NEX_Factoring.bat), donde los modulos ES locales
    # quedan bloqueados por CORS. Por eso se usan los builds UMD, embebidos en el HTML: se elimina la
    # dependencia de un tercero en tiempo de ejecucion y el archivo sigue siendo autocontenido.
    # Actualizar una libreria = volver a bajar el archivo a vendor/ y revisar el diff.
    $vendorOrden = @("react.js","react-dom.js","prop-types.js","_alias.js","d3-path.js","d3-array.js","d3-shape.js","d3-sankey.js","lucide-react.js","recharts.js","xlsx.js")
    $vendorJs = ""
    foreach ($v in $vendorOrden) {
        $vp = Join-Path $root "vendor\$v"
        if (-not (Test-Path $vp)) { throw "Falta la dependencia vendorizada: vendor\$v" }
        $vendorJs = $vendorJs + "`n/* vendor: $v */`n" + [System.IO.File]::ReadAllText($vp, [System.Text.Encoding]::UTF8)
    }

    # Feed DIARIO de proveedores de clientes (proveedores_clientes.json). Es un archivo JSON puro
    # —el mismo artefacto que se deja cada manana para cargar en la BD interna— y aca se embebe como
    # window.PROVEEDORES_CLIENTES para que el demo funcione sin backend ni fetch (que file:// bloquea).
    # En produccion la app NO lo embebe: lo pide por API.
    $provPath = Join-Path $root "proveedores_clientes.json"
    $provJs = $null
    if (Test-Path $provPath) {
        $provJson = [System.IO.File]::ReadAllText($provPath, [System.Text.Encoding]::UTF8)
        $provJs = "window.PROVEEDORES_CLIENTES=" + $provJson + ";"
    }

    # Los `import` del .jsx se traducen a destructuring de los globales UMD. El fuente se mantiene con
    # imports (es lo que entiende el chequeo de tipos); la traduccion ocurre solo al construir.
    $globalDe = @{ "react" = "React"; "react-dom" = "ReactDOM"; "lucide-react" = "LucideReact"; "recharts" = "Recharts"; "d3-sankey" = "d3" }
    $jsxSource = [regex]::Replace($jsxSource, 'import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";', {
        param($m)
        $mod = $m.Groups[2].Value
        $g = $globalDe[$mod]
        if (-not $g) { throw "Import sin global UMD conocido: $mod" }
        $names = $m.Groups[1].Value -replace '\s+as\s+', ': '
        'const {' + $names + '} = ' + $g + ';'
    })

    # El fuente declara `export default function PipelineComercial`, valido cuando el bundle era un
    # modulo ES. Ahora es un script clasico y `export` seria un SyntaxError, asi que se quita al
    # construir; el .jsx conserva el export porque es lo que espera el chequeo de tipos.
    $jsxSource = $jsxSource -replace 'export default function PipelineComercial', 'function PipelineComercial'

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
<!-- Content Security Policy (OWASP A05). Acota DE DONDE puede cargarse codigo: sin esto, cualquier
     inyeccion puede traer un script de cualquier host. Se permite 'unsafe-inline'/'unsafe-eval'
     porque el demo transpila JSX en el navegador con Babel Standalone; en produccion el bundle va
     compilado y ambos se quitan, que es el mayor beneficio de sacar Babel del runtime.
     Nota: frame-ancestors se IGNORA en <meta>; contra clickjacking hay que mandarlo como cabecera
     HTTP (o X-Frame-Options) desde el servidor/CDN, junto con HSTS y Referrer-Policy. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; child-src blob:; frame-src blob:; object-src 'none'; base-uri 'self'; form-action 'self'" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<title>NEX Factoring - Pipeline Comercial</title>
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
<script type="text/babel" data-presets="react">

'@

    $tail = @'

// La app se monta a traves del web component <nex-pipeline>: asi el contrato de embebido de la
// guia de integracion (parameters + nex:set-token) esta VIVO y no es solo documentacion.
// Standalone es el mismo camino, sin atributos.
definirWebComponent(React, ReactDOM, PipelineComercial);
document.getElementById("root").appendChild(document.createElement("nex-pipeline"));
</script>
</body>
</html>
'@

    # Bloque de datos inyectados: va ANTES del bundle de la app, como script clasico,
    # para que window.DTESYNC y demas existan cuando el modulo evalue sus constantes.
    # La estampa de build va PRIMERO, antes incluso de los datos inyectados.
    $payload = $buildJs + "`n" + $vendorJs
    if ($datosJs) { $payload = $payload + "`n" + $datosJs }
    if ($provJs)  { $payload = $payload + "`n" + $provJs }
    $datosBlock = '</script>' + "`n" + '<script>' + "`n" + $payload + "`n" + '</script>' + "`n" + '<script>' + "`n"

    # Si falta algun recurso local, cae a CDN online como respaldo.
    $babelBlock = if ($babelJs) {
        $head + $datosBlock + $babelJs + $head2
    } else {
        $head + $datosBlock + '</script>' + "`n" + '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>' + "`n" + '<script>'
    }

    $tailwindBlock = if ($tailwindJs) {
        $babelBlock + $tailwindJs + $head3
    } else {
        $babelBlock + '</script>' + "`n" + '<script src="https://cdn.tailwindcss.com"></script>' + "`n" + '<script type="text/babel" data-presets="react">' + "`n`n"
    }

    $html = $tailwindBlock + $jsxSource + $tail

    # Escritura UTF-8 sin BOM (mas compatible con file:// en navegadores).
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outPath, $html, $utf8NoBom)

    Write-Host "OK: generado $outPath"
    Write-Host "    build $buildFecha | commit $buildCommit | rama $buildRama"
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
