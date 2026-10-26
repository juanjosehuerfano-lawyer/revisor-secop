# Genera los íconos PNG de la PWA (192, 512 y 180 para iOS) con el mismo dibujo de icons/icono.svg.
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot '..\icons'

function Color($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

foreach ($tam in 180, 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $tam, $tam
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.ScaleTransform($tam / 64, $tam / 64)
  $g.Clear((Color '#0f4c5c'))
  $papel = New-Object System.Drawing.SolidBrush (Color '#f6f5f1')
  $g.FillPolygon($papel, [System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 20,14), (New-Object System.Drawing.PointF 38,14), (New-Object System.Drawing.PointF 46,22), (New-Object System.Drawing.PointF 46,50), (New-Object System.Drawing.PointF 20,50)))
  $g.FillPolygon((New-Object System.Drawing.SolidBrush (Color '#cfe3e7')), [System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 38,14), (New-Object System.Drawing.PointF 46,22), (New-Object System.Drawing.PointF 38,22)))
  $lapiz = New-Object System.Drawing.Pen (Color '#0f4c5c'), 3
  $lapiz.StartCap = 'Round'; $lapiz.EndCap = 'Round'
  $g.DrawLine($lapiz, 25, 30, 39, 30); $g.DrawLine($lapiz, 25, 36, 35, 36)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush (Color '#e9a23b')), 33, 35, 18, 18)
  $check = New-Object System.Drawing.Pen (Color '#0f4c5c'), 2.6
  $check.StartCap = 'Round'; $check.EndCap = 'Round'; $check.LineJoin = 'Round'
  $g.DrawLines($check, [System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 38.5,44), (New-Object System.Drawing.PointF 41,46.5), (New-Object System.Drawing.PointF 45.5,41.5)))
  $bmp.Save((Join-Path $dir "icono-$tam.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
"Íconos generados en $dir"
