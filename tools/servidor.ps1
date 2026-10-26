# Servidor estático mínimo para desarrollo (los módulos ES no cargan desde file://).
# Uso: powershell -ExecutionPolicy Bypass -File tools/servidor.ps1 [-Puerto 5173]
param([int]$Puerto = 5173)
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.md' = 'text/markdown; charset=utf-8'; '.ico' = 'image/x-icon'
}
$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://localhost:$Puerto/")
$http.Start()
Write-Host "Revisor SECOP en http://localhost:$Puerto/  (Ctrl+C para detener)"
try {
  while ($http.IsListening) {
    $ctx = $http.GetContext()
    $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($ruta -eq '' -or $ruta.EndsWith('/')) { $ruta += 'index.html' }
    $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
    $resp = $ctx.Response
    try {
      if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($archivo)
        $ext = [IO.Path]::GetExtension($archivo).ToLower()
        $resp.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { 'application/octet-stream' }
        $resp.Headers.Add('Cache-Control', 'no-cache')
        $resp.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -ne 'HEAD') { $resp.OutputStream.Write($bytes, 0, $bytes.Length) }
      } else {
        $resp.StatusCode = 404
      }
    } catch {
      Write-Host "Error sirviendo $ruta : $($_.Exception.Message)"
    } finally {
      $resp.Close()
    }
  }
} finally { $http.Stop() }
