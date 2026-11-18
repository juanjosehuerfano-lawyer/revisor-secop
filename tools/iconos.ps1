# Genera los iconos PNG de las dos apps (180 para iOS, 192 y 512) a partir de su icono.svg, con Edge sin ventana:
# asi el PNG es siempre el mismo dibujo del SVG. Edita el SVG y vuelve a correr este script.
#   icons/icono.svg        -> Radar Contractual
#   radar/icons/icono.svg  -> Radar Publico
# En el PNG el fondo llena el cuadro (sin esquinas redondeadas): el celular le pone su propia mascara.
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'No se encontro Microsoft Edge.' }
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..')
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) 'iconos-radar'
New-Item -ItemType Directory -Force $tmp | Out-Null

foreach ($dir in 'icons', 'radar\icons') {
  $svg = Get-Content -Raw -Encoding UTF8 (Join-Path $raiz "$dir\icono.svg")
  foreach ($tam in 180, 192, 512) {
    $html = Join-Path $tmp "icono-$tam.html"
    $cuadrado = $svg -replace 'rx="14"', 'rx="0"'
    Set-Content -Encoding UTF8 $html "<!doctype html><style>html,body{margin:0;overflow:hidden}svg{display:block;width:${tam}px;height:${tam}px}</style>$cuadrado"
    $png = Join-Path $raiz "$dir\icono-$tam.png"
    & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 "--window-size=$tam,$tam" "--screenshot=$png" "file:///$($html -replace '\\', '/')" 2>$null | Out-Null
    if (-not (Test-Path $png)) { throw "No se genero $png" }
  }
  "Iconos generados en $dir"
}

# Vista previa al compartir el enlace (og:image, 1200x630): logo, nombre y subtitulo sobre azul noche.
$fuente = "file:///$((Join-Path $raiz 'fonts\inter-latin.woff2') -replace '\\', '/')"
$previas = @(
  # Tildes como entidades HTML: PowerShell 5.1 lee este archivo sin BOM como ANSI.
  @{ dir = 'icons';       nombre = 'Radar <b>Contractual</b>';    sub = 'B&uacute;squeda en SECOP'; texto = 'Procesos y contratos de SECOP I y SECOP II, con la fuente de cada dato.'; color = '#00e5ff' },
  @{ dir = 'radar\icons'; nombre = 'Radar <b>P&uacute;blico</b>'; sub = 'Veedur&iacute;a SECOP';    texto = '&iquest;C&oacute;mo contrata su entidad? Contratos p&uacute;blicos de Colombia para la ciudadan&iacute;a.'; color = '#00a86b' }
)
foreach ($p in $previas) {
  $svg = Get-Content -Raw -Encoding UTF8 (Join-Path $raiz "$($p.dir)\icono.svg")
  $html = Join-Path $tmp 'vista-previa.html'
  Set-Content -Encoding UTF8 $html @"
<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('$fuente') format('woff2');font-weight:100 900}
html,body{margin:0;overflow:hidden}
body{width:1200px;height:630px;background:#0b192c;color:#f8fafc;font-family:Inter,sans-serif;display:flex;align-items:center;gap:64px;padding:0 96px;box-sizing:border-box;border-top:12px solid $($p.color)}
svg{width:260px;height:260px;flex:none}
h1{margin:0;font-size:84px;font-weight:500;letter-spacing:-.02em;line-height:1}
h1 b{font-weight:800}
h2{margin:18px 0 0;font-size:48px;font-weight:600;color:$($p.color)}
p{margin:32px 0 0;font-size:28px;line-height:1.35;color:#cbd5e1;max-width:680px}
</style><body>$svg<div><h1>$($p.nombre)</h1><h2>$($p.sub)</h2><p>$($p.texto)</p></div></body>
"@
  $png = Join-Path $raiz "$($p.dir)\vista-previa.png"
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 '--window-size=1200,630' "--screenshot=$png" "file:///$($html -replace '\\', '/')" 2>$null | Out-Null
  if (-not (Test-Path $png)) { throw "No se genero $png" }
  "Vista previa generada en $($p.dir)"
}
