#Requires -Version 5.1
<#
  Installation Windows pour POS Algerie (pos-dz).

  Ce script :
    1. Verifie/installe Node.js LTS (via winget) si absent.
    2. Installe les dependances du monorepo (npm install, workspaces).
    3. Met en place MongoDB local (Docker si disponible, sinon MongoDB Community Server via winget).
    4. Genere apps/api/.env et apps/web/.env.local si absents.
    5. Lance le seed (tenant/boutique/admin de demo).
    6. En option, programme une synchronisation periodique de la base locale vers un cluster
       MongoDB Atlas via le script existant src/scripts/migrate-tenant-to-cloud.ts (tache planifiee
       Windows) -- voir docs/INSTALL.md pour ce que "synchronisation" veut dire dans ce projet
       (le SyncEngine caisse<->API existe deja ; la synchro base-a-base decrite ici sert au cas
       "commerce local qui veut aussi alimenter un cluster cloud en lecture/backup/reporting").

  Utilisation :
    powershell -ExecutionPolicy Bypass -File scripts\windows-install.ps1
    powershell -ExecutionPolicy Bypass -File scripts\windows-install.ps1 -Mode LocalOnly
    powershell -ExecutionPolicy Bypass -File scripts\windows-install.ps1 -Mode AtlasOnly -AtlasUri "mongodb+srv://..."
    powershell -ExecutionPolicy Bypass -File scripts\windows-install.ps1 -Mode LocalWithAtlasSync `
        -AtlasUri "mongodb+srv://..." -TenantId "<id>" -SyncIntervalMinutes 60
#>

[CmdletBinding()]
param(
  [ValidateSet('LocalOnly', 'AtlasOnly', 'LocalWithAtlasSync')]
  [string]$Mode,
  [string]$AtlasUri,
  [string]$TenantId,
  [int]$SyncIntervalMinutes = 60,
  [switch]$SkipSeed,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    ATTENTION  $msg" -ForegroundColor Yellow }

function Test-CommandExists($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# --- 1. Node.js -----------------------------------------------------------

function Ensure-Node {
  Write-Step "Verification de Node.js (v20+ requis)"
  $needInstall = $true
  if (Test-CommandExists 'node') {
    $verStr = (node -v) -replace '^v', ''
    $major = [int]($verStr.Split('.')[0])
    if ($major -ge 20) {
      Write-Ok "Node.js $verStr deja installe"
      $needInstall = $false
    } else {
      Write-Warn2 "Node.js $verStr trouve, mais v20+ est requis"
    }
  }
  if ($needInstall) {
    if (Test-CommandExists 'winget') {
      Write-Host "    Installation de Node.js LTS via winget..."
      winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
      Write-Warn2 "Node.js vient d'etre installe : fermez et relancez ce script dans une nouvelle fenetre PowerShell (PATH pas encore rafraichi dans cette session)."
      exit 0
    } else {
      throw "Node.js v20+ introuvable et winget indisponible. Installez-le manuellement depuis https://nodejs.org/ puis relancez ce script."
    }
  }
}

# --- 2. npm install ---------------------------------------------------------

function Install-Dependencies {
  Write-Step "Installation des dependances (npm install, 3 workspaces + packages/shared)"
  Push-Location $RepoRoot
  try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install a echoue (code $LASTEXITCODE)" }
    Write-Ok "Dependances installees"
  } finally {
    Pop-Location
  }
}

# --- 3. MongoDB local --------------------------------------------------------

function Ensure-MongoLocal {
  Write-Step "Mise en place de MongoDB local"

  if (Test-CommandExists 'docker') {
    Write-Host "    Docker detecte : demarrage de MongoDB via docker compose..."
    Push-Location $RepoRoot
    try {
      docker compose up -d mongo
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "MongoDB demarre via Docker (mongodb://localhost:27017/pos-dz)"
        return
      }
      Write-Warn2 "docker compose a echoue, tentative avec MongoDB Community Server..."
    } finally {
      Pop-Location
    }
  }

  if (Test-CommandExists 'mongod') {
    Write-Ok "mongod deja present sur ce poste"
    try { Start-Service MongoDB -ErrorAction SilentlyContinue } catch {}
    return
  }

  if (Test-CommandExists 'winget') {
    Write-Host "    Installation de MongoDB Community Server via winget..."
    winget install -e --id MongoDB.Server --accept-source-agreements --accept-package-agreements
    Start-Sleep -Seconds 5
    try {
      Start-Service MongoDB -ErrorAction SilentlyContinue
      Write-Ok "MongoDB Community Server installe et demarre comme service Windows"
    } catch {
      Write-Warn2 "MongoDB installe mais le service n'a pas pu demarrer automatiquement. Demarrez-le via services.msc si besoin."
    }
    return
  }

  Write-Warn2 "Ni Docker ni winget disponibles : impossible d'installer MongoDB automatiquement."
  Write-Warn2 "Solution de secours (dev/demo uniquement, donnees non persistees) : lancez 'npm run dev:mongo' dans un terminal a part."
}

# --- 4. Fichiers .env ---------------------------------------------------------

function New-Secret {
  return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}

function Write-EnvFiles([string]$MongoUri) {
  Write-Step "Configuration des fichiers .env"

  $apiEnvPath = Join-Path $RepoRoot 'apps\api\.env'
  if ((Test-Path $apiEnvPath) -and -not $Force) {
    Write-Warn2 "apps\api\.env existe deja, conserve tel quel (utilisez -Force pour l'ecraser)."
  } else {
    $jwtSecret = New-Secret
    @(
      "PORT=4000",
      "MONGODB_URI=$MongoUri",
      "JWT_SECRET=$jwtSecret",
      "JWT_EXPIRES_IN=12h",
      "CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:47623"
    ) -join "`n" | Set-Content -Path $apiEnvPath -Encoding utf8
    Write-Ok "apps\api\.env genere (JWT_SECRET aleatoire)"
  }

  $webEnvPath = Join-Path $RepoRoot 'apps\web\.env.local'
  if ((Test-Path $webEnvPath) -and -not $Force) {
    Write-Warn2 "apps\web\.env.local existe deja, conserve tel quel (utilisez -Force pour l'ecraser)."
  } else {
    "NEXT_PUBLIC_API_URL=http://localhost:4000" | Set-Content -Path $webEnvPath -Encoding utf8
    Write-Ok "apps\web\.env.local genere"
  }
}

# --- 5. Seed --------------------------------------------------------------

function Invoke-Seed {
  if ($SkipSeed) { return }
  Write-Step "Creation des donnees de demo (tenant, boutique, admin, caissier, produits)"
  Push-Location $RepoRoot
  try {
    npm run seed
    if ($LASTEXITCODE -ne 0) {
      Write-Warn2 "Le seed a echoue (code $LASTEXITCODE) -- verifiez que MongoDB est bien demarre puis relancez 'npm run seed' manuellement."
    } else {
      Write-Ok "Donnees de demo creees (identifiants affiches ci-dessus)"
    }
  } finally {
    Pop-Location
  }
}

# --- 6. Synchro periodique vers Atlas -----------------------------------------

function Register-AtlasSyncTask([string]$LocalUri, [string]$AtlasUriValue, [string]$TenantIdValue, [int]$IntervalMinutes) {
  Write-Step "Programmation de la synchronisation periodique vers MongoDB Atlas"

  $configPath = Join-Path $PSScriptRoot 'sync-config.env'
  @(
    "LOCAL_MONGODB_URI=$LocalUri",
    "ATLAS_MONGODB_URI=$AtlasUriValue",
    "TENANT_ID=$TenantIdValue"
  ) -join "`n" | Set-Content -Path $configPath -Encoding utf8
  # Fichier avec des identifiants Atlas : restreindre l'acces au seul compte courant.
  icacls $configPath /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null
  Write-Ok "Config de synchro ecrite dans scripts\sync-config.env (acces restreint a $($env:USERNAME))"

  $taskName = 'POS-DZ Atlas Sync'
  $syncScript = Join-Path $PSScriptRoot 'sync-to-atlas.ps1'
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`""
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 1)

  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Copie periodique du tenant $TenantIdValue de MongoDB local vers Atlas (pos-dz)" | Out-Null

  Write-Ok "Tache planifiee '$taskName' creee : synchro toutes les $IntervalMinutes minute(s)"
  Write-Host "    Pour synchroniser tout de suite : scripts\sync-now.bat"
  Write-Host "    Pour desactiver : Unregister-ScheduledTask -TaskName '$taskName'"
}

# --- Choix du mode -----------------------------------------------------------

if (-not $Mode) {
  Write-Host ""
  Write-Host "Quel mode de base de donnees voulez-vous ?" -ForegroundColor Cyan
  Write-Host "  1) Local uniquement       - MongoDB sur ce PC, aucune donnee dans le cloud"
  Write-Host "  2) Atlas uniquement       - l'API se connecte directement a votre cluster Atlas"
  Write-Host "  3) Local + synchro Atlas  - MongoDB local + copie periodique vers Atlas (planifiee)"
  $choice = Read-Host "Votre choix [1/2/3]"
  switch ($choice) {
    '2' { $Mode = 'AtlasOnly' }
    '3' { $Mode = 'LocalWithAtlasSync' }
    default { $Mode = 'LocalOnly' }
  }
}

if ($Mode -in @('AtlasOnly', 'LocalWithAtlasSync') -and -not $AtlasUri) {
  $AtlasUri = Read-Host "URI MongoDB Atlas (mongodb+srv://user:pass@cluster.mongodb.net/pos-dz?retryWrites=true&w=majority)"
}
if ($Mode -eq 'LocalWithAtlasSync' -and -not $TenantId) {
  Write-Host "L'ID du tenant a synchroniser sera affiche par le seed ci-dessous si vous ne le connaissez pas encore."
  $TenantId = Read-Host "ID du tenant a synchroniser vers Atlas (laissez vide pour le renseigner plus tard dans scripts\sync-config.env)"
}

# --- Execution ---------------------------------------------------------------

Write-Host "POS Algerie - installation Windows (mode: $Mode)" -ForegroundColor Magenta

Ensure-Node
Install-Dependencies

$localUri = 'mongodb://localhost:27017/pos-dz'
switch ($Mode) {
  'LocalOnly' {
    Ensure-MongoLocal
    Write-EnvFiles -MongoUri $localUri
  }
  'AtlasOnly' {
    Write-EnvFiles -MongoUri $AtlasUri
  }
  'LocalWithAtlasSync' {
    Ensure-MongoLocal
    Write-EnvFiles -MongoUri $localUri
  }
}

Invoke-Seed

if ($Mode -eq 'LocalWithAtlasSync') {
  Register-AtlasSyncTask -LocalUri $localUri -AtlasUriValue $AtlasUri -TenantIdValue $TenantId -IntervalMinutes $SyncIntervalMinutes
}

Write-Step "Termine"
Write-Host "Prochaines etapes :"
Write-Host "  npm run dev:api      -> API sur http://localhost:4000"
Write-Host "  npm run dev:web      -> back-office Next.js sur http://localhost:3000"
Write-Host "  npm run dev:desktop  -> shell caisse Electron (optionnel)"
Write-Host "  npm run build:desktop:win -> installateur .exe pour les postes de caisse"
if ($Mode -eq 'LocalWithAtlasSync' -and -not $TenantId) {
  Write-Warn2 "N'oubliez pas de renseigner TENANT_ID dans scripts\sync-config.env une fois le seed passe, sinon la synchro planifiee echouera."
}
