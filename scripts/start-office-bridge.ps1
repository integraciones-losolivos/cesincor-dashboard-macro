$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $projectRoot '.env'
$publicUrl = if ($env:NGROK_PUBLIC_URL) { $env:NGROK_PUBLIC_URL.TrimEnd('/') } else { 'https://acid-dose-ultra.ngrok-free.dev' }

try {
  $ngrok = (Get-Command ngrok -ErrorAction Stop).Source
} catch {
  throw 'No se encontró ngrok. Instálalo y configura el authtoken antes de iniciar el puente.'
}

if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'No se encontró el archivo .env del proyecto.'
}

$hasSecret = Select-String -LiteralPath $envFile -Pattern '^GATEWAY_SHARED_SECRET=.+$' -Quiet
if (-not $hasSecret) {
  throw 'Configura GATEWAY_SHARED_SECRET en .env antes de iniciar el puente.'
}

$api = $null
$ownsApiProcess = $false

function Get-NgrokTunnels {
  try {
    return @((Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2).tunnels)
  } catch {
    return @()
  }
}

try {
  $health = $null
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 3
  } catch {
    $node = (Get-Command node).Source
    $api = Start-Process -FilePath $node -ArgumentList 'server/index.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    $ownsApiProcess = $true
  }

  for ($attempt = 1; $attempt -le 10; $attempt += 1) {
    if ($health.ok) { break }
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 3
      if ($health.ok) { break }
    } catch {
      if ($attempt -eq 10) { throw 'El API local no respondió después de 15 segundos.' }
    }
    Start-Sleep -Milliseconds 1500
  }

  if (-not $health.ok) { throw 'El API local no respondió correctamente.' }

  $activeTunnels = Get-NgrokTunnels
  $existingTunnel = $activeTunnels | Where-Object { $_.public_url -eq $publicUrl } | Select-Object -First 1
  if ($existingTunnel) {
    Write-Host "El túnel de ngrok ya está activo en $publicUrl. Se reutiliza sin crear otro endpoint." -ForegroundColor Green
    return
  }

  if ($activeTunnels.Count -gt 0) {
    $activeUrls = ($activeTunnels | ForEach-Object { $_.public_url }) -join ', '
    throw "Ya existe un túnel ngrok activo ($activeUrls). No se creará otro para evitar consumir recursos del plan. Ciérralo desde su consola antes de iniciar una URL distinta."
  }

  Write-Host "Puente local disponible en $publicUrl" -ForegroundColor Green
  & $ngrok http 3001 --url $publicUrl
} finally {
  if ($ownsApiProcess -and $api -and -not $api.HasExited) { Stop-Process -Id $api.Id }
}
