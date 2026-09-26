#Requires -Version 5.1
<#
  Execute une synchronisation ponctuelle du tenant configure de MongoDB local vers Atlas,
  en s'appuyant sur apps/api/src/scripts/migrate-tenant-to-cloud.ts (upsert par _id, rejouable
  sans risque). Appele par la tache planifiee "POS-DZ Atlas Sync" (voir windows-install.ps1),
  ou manuellement via sync-now.bat.
#>

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $PSScriptRoot 'sync-config.env'
$LogPath = Join-Path $PSScriptRoot 'sync.log'

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $LogPath -Value $line
  Write-Host $line
}

if (-not (Test-Path $ConfigPath)) {
  Write-Log "ERREUR: scripts\sync-config.env introuvable. Relancez windows-install.ps1 en mode LocalWithAtlasSync."
  exit 1
}

$config = @{}
Get-Content $ConfigPath | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $config[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$localUri = $config['LOCAL_MONGODB_URI']
$atlasUri = $config['ATLAS_MONGODB_URI']
$tenantId = $config['TENANT_ID']

if (-not $tenantId) {
  Write-Log "ERREUR: TENANT_ID vide dans scripts\sync-config.env -- renseignez l'ID du tenant a synchroniser."
  exit 1
}

Write-Log "Debut synchro tenant $tenantId -> Atlas"
Push-Location (Join-Path $RepoRoot 'apps\api')
try {
  $output = npx tsx src/scripts/migrate-tenant-to-cloud.ts --tenant-id=$tenantId --source=$localUri --target=$atlasUri 2>&1
  $output | ForEach-Object { Add-Content -Path $LogPath -Value $_ }
  if ($LASTEXITCODE -eq 0) {
    Write-Log "Synchro terminee avec succes."
  } else {
    Write-Log "Synchro terminee avec des erreurs (code $LASTEXITCODE) -- voir le detail ci-dessus dans sync.log."
  }
} finally {
  Pop-Location
}
