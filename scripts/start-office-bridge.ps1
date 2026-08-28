$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$cloudflared = Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $cloudflared)) {
  throw 'No se encontró cloudflared. Instálalo antes de iniciar el puente.'
}

if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'No se encontró el archivo .env del proyecto.'
}

$hasSecret = Select-String -LiteralPath $envFile -Pattern '^GATEWAY_SHARED_SECRET=.+$' -Quiet
if (-not $hasSecret) {
  throw 'Configura GATEWAY_SHARED_SECRET en .env antes de iniciar el puente.'
}

$node = (Get-Command node).Source
$api = Start-Process -FilePath $node -ArgumentList 'server/index.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

try {
  $health = $null
  for ($attempt = 1; $attempt -le 10; $attempt += 1) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 3
      if ($health.ok) { break }
    } catch {
      if ($attempt -eq 10) { throw 'El API local no respondió después de 15 segundos.' }
    }
    Start-Sleep -Milliseconds 1500
  }

  if (-not $health.ok) { throw 'El API local no respondió correctamente.' }

  Write-Host 'Puente local iniciado. Copia la URL https://...trycloudflare.com que aparecerá abajo.' -ForegroundColor Green
  Write-Host 'Mantén esta ventana abierta mientras se utilice el dashboard.' -ForegroundColor Yellow
  & $cloudflared tunnel --url http://127.0.0.1:3001 --no-autoupdate
} finally {
  if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id }
}
