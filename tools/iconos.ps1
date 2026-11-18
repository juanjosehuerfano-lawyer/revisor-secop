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
