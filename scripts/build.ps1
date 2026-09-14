# Build script for Cloth n Care (run on the dev machine, not the client PC)
# Builds the React frontend, copies it into the Spring Boot static resources,
# packages the backend jar, and assembles a self-contained release folder
# (scripts\..\release) that can be copied to the client's PC.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\build.ps1

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot "ClothNCareFrontend\cloth-n-care-ui"
$backend  = Join-Path $repoRoot "ClothNCare\ClothNCare"
$release  = Join-Path $repoRoot "release"

# ---------------------------------------------------------------- Java
function Find-JavaHome {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        return $env:JAVA_HOME
    }
    $candidates = @(
        "$env:ProgramFiles\Eclipse Adoptium",
        "$env:ProgramFiles\Java",
        "$env:USERPROFILE\.jdks"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $jdk = Get-ChildItem $c -Directory -ErrorAction SilentlyContinue |
                Where-Object { Test-Path (Join-Path $_.FullName "bin\java.exe") } |
                Sort-Object Name -Descending |
                Select-Object -First 1
            if ($jdk) { return $jdk.FullName }
        }
    }
    return $null
}

$javaHome = Find-JavaHome
if (-not $javaHome) {
    Write-Host "ERROR: Java 17+ not found. Install it from https://adoptium.net or set JAVA_HOME." -ForegroundColor Red
    exit 1
}
$env:JAVA_HOME = $javaHome
Write-Host "Using JDK: $javaHome" -ForegroundColor Cyan

# ---------------------------------------------------------------- Frontend
Write-Host "`n[1/3] Building frontend..." -ForegroundColor Cyan
if (-not (Test-Path "$frontend\package.json")) {
    Write-Host "ERROR: frontend not found at $frontend" -ForegroundColor Red
    exit 1
}
Push-Location $frontend
try {
    if (-not (Test-Path "$frontend\node_modules")) {
        Write-Host "Installing frontend dependencies..."
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------- Static sync
Write-Host "`n[2/3] Syncing frontend build into backend static resources..." -ForegroundColor Cyan
$static = Join-Path $backend "src\main\resources\static"
Remove-Item "$static\assets\*" -Force -ErrorAction SilentlyContinue
Remove-Item "$static\index.html" -Force -ErrorAction SilentlyContinue
Copy-Item "$frontend\dist\*" $static -Recurse -Force

# ---------------------------------------------------------------- Backend
Write-Host "`n[3/3] Packaging backend..." -ForegroundColor Cyan
Push-Location $backend
try {
    & .\mvnw.cmd -q clean package
    if ($LASTEXITCODE -ne 0) { throw "backend build failed" }
} finally {
    Pop-Location
}

$jar = Get-ChildItem (Join-Path $backend "target") -Filter "*.jar" |
    Where-Object { $_.Name -notmatch "original|sources|javadoc" } |
    Select-Object -First 1
if (-not $jar) {
    Write-Host "ERROR: built jar not found" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------- Release
Write-Host "`nAssembling release folder..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $release -Force | Out-Null

Copy-Item $jar.FullName (Join-Path $release "ClothNCare.jar")
Copy-Item (Join-Path $PSScriptRoot "start.bat") (Join-Path $release "start.bat")
Copy-Item (Join-Path $PSScriptRoot "README-CLIENT.txt") (Join-Path $release "README-CLIENT.txt")
New-Item -ItemType Directory -Path (Join-Path $release "invoices") -Force | Out-Null

# Bundle the WhatsApp service (Node.js / whatsapp-web.js) so the WhatsApp
# feature works on the client PC. Session data, web cache and logs are
# per-machine state and are intentionally excluded.
$waSrc = Join-Path $repoRoot "whatsapp-service"
if (Test-Path (Join-Path $waSrc "src\server.js")) {
    Write-Host "Copying WhatsApp service (Node.js)..." -ForegroundColor Cyan
    $waDest = Join-Path $release "whatsapp-service"
    & robocopy $waSrc $waDest /E /XD "$waSrc\whatsapp-session" "$waSrc\whatsapp-web-cache" ".git" "$waSrc\node_modules\.cache" /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -lt 8) {
        $global:LASTEXITCODE = 0
    } else {
        throw "robocopy failed while copying whatsapp-service"
    }
} else {
    Write-Host "WARNING: whatsapp-service not found - WhatsApp will be disabled in the release." -ForegroundColor Yellow
}

# Bundle a portable Java runtime so the client does not need to install Java.
# Extract a Temurin JRE (17 or newer) once into jre-staging\jre - it is copied
# into the release. The copy is done only when release\jre is missing: a
# running app locks these DLLs and they cannot be overwritten, and the bundled
# runtime does not change between builds. Falls back to the system Java at
# runtime if missing.
$jreStaging = Join-Path $repoRoot "jre-staging\jre"
if (Test-Path $jreStaging) {
    $jreInRelease = Join-Path $release "jre"
    $jreComplete = (Test-Path (Join-Path $jreInRelease "bin\java.exe")) -and
                   (Test-Path (Join-Path $jreInRelease "lib\jvm.cfg"))
    if ($jreComplete) {
        Write-Host "Reusing existing release\jre (bundled Java already present)..." -ForegroundColor Cyan
    } else {
        Write-Host "Copying bundled Java runtime (jre-staging\jre -> release\jre)..." -ForegroundColor Cyan
        Remove-Item $jreInRelease -Recurse -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path $jreInRelease -Force | Out-Null
        Copy-Item "$jreStaging\*" $jreInRelease -Recurse -Force
    }
} else {
    Write-Host "WARNING: jre-staging\jre not found - release will require Java to be installed." -ForegroundColor Yellow
}

# Bundle a portable Node.js runtime so the WhatsApp service does not need Node
# installed on the client PC. Extract the official Windows x64 zip once into
# node-staging\node - it is copied into the release the same way as the JRE.
# The copy is done only when release\node is missing, since a running service
# may hold node.exe open and overwriting a bundled runtime between builds is
# pointless. Falls back to system Node at runtime if missing.
$nodeStaging = Join-Path $repoRoot "node-staging\node"
if (Test-Path (Join-Path $nodeStaging "node.exe")) {
    $nodeInRelease = Join-Path $release "node"
    if (Test-Path (Join-Path $nodeInRelease "node.exe")) {
        Write-Host "Reusing existing release\node (bundled Node already present)..." -ForegroundColor Cyan
    } else {
        Write-Host "Copying bundled Node.js runtime (node-staging\node -> release\node)..." -ForegroundColor Cyan
        Remove-Item $nodeInRelease -Recurse -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path $nodeInRelease -Force | Out-Null
        Copy-Item "$nodeStaging\*" $nodeInRelease -Recurse -Force
    }
} else {
    Write-Host "WARNING: node-staging\node not found - WhatsApp service will require Node.js to be installed." -ForegroundColor Yellow
}

# Seed the release with a database only when the release has none yet, so a
# running/deployed app keeps its own data (and no file-lock errors occur).
if (Test-Path "$backend\data\clothncare.db") {
    New-Item -ItemType Directory -Path (Join-Path $release "data") -Force | Out-Null
    if (Test-Path (Join-Path $release "data\clothncare.db")) {
        Write-Host "Keeping existing release data (release\data\clothncare.db). Delete it first to seed from the dev database." -ForegroundColor Cyan
    } else {
        Copy-Item "$backend\data\clothncare.db" (Join-Path $release "data\clothncare.db") -Force
    }
} else {
    New-Item -ItemType Directory -Path (Join-Path $release "data") -Force | Out-Null
}

Write-Host "`nDONE. Copy the 'release' folder to the client PC:" -ForegroundColor Green
Write-Host "  $release"
Write-Host "Then on the client PC double-click start.bat (Java 17+ required)." -ForegroundColor Green
