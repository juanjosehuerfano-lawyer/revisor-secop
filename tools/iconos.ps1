# Genera los iconos PNG de la PWA (192, 512 y 180 para iOS) con el mismo dibujo de icons/icono.svg:
# una ruta blanca con tres estaciones sobre azul medianoche; la ultima estacion va en amarillo.
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot '..\icons'

function Color($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Punto($x, $y) { New-Object System.Drawing.PointF $x, $y }

foreach ($tam in 180, 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $tam, $tam
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.ScaleTransform($tam / 64, $tam / 64)
  $g.Clear((Color '#0e1b3d'))
  $linea = New-Object System.Drawing.Pen (Color '#ffffff'), 5
  $linea.StartCap = 'Round'; $linea.EndCap = 'Round'; $linea.LineJoin = 'Round'
  $g.DrawLines($linea, [System.Drawing.PointF[]]@((Punto 14 44), (Punto 28 44), (Punto 40 30), (Punto 50 30)))
  $fondo = New-Object System.Drawing.SolidBrush (Color '#0e1b3d')
  $anillo = New-Object System.Drawing.Pen (Color '#ffffff'), 3.5
  foreach ($c in @(@(15, 44), @(34, 37))) {
    $x = $c[0] - 6; $y = $c[1] - 6
    $g.FillEllipse($fondo, $x, $y, 12, 12)
    $g.DrawEllipse($anillo, $x, $y, 12, 12)
  }
  $g.FillEllipse((New-Object System.Drawing.SolidBrush (Color '#ffcd00')), 41, 22, 16, 16)
  $bmp.Save((Join-Path $dir "icono-$tam.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
"Iconos generados en $dir"
