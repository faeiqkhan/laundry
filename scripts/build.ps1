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
Remove-Item $release -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $release -Force | Out-Null

Copy-Item $jar.FullName (Join-Path $release "ClothNCare.jar")
Copy-Item (Join-Path $PSScriptRoot "start.bat") (Join-Path $release "start.bat")
Copy-Item (Join-Path $PSScriptRoot "README-CLIENT.txt") (Join-Path $release "README-CLIENT.txt")
New-Item -ItemType Directory -Path (Join-Path $release "invoices") | Out-Null

# Bundle a portable Java runtime so the client does not need to install Java.
# Extract a Temurin JRE (17 or newer) once into jre-staging\jre - it is copied
# here on every build. Falls back to the system Java at runtime if missing.
$jreStaging = Join-Path $repoRoot "jre-staging\jre"
if (Test-Path $jreStaging) {
    Write-Host "Copying bundled Java runtime (jre-staging\jre -> release\jre)..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path (Join-Path $release "jre") -Force | Out-Null
    Copy-Item "$jreStaging\*" (Join-Path $release "jre") -Recurse -Force
} else {
    Write-Host "WARNING: jre-staging\jre not found - release will require Java to be installed." -ForegroundColor Yellow
}

# Seed the release with the current database so existing data is preserved.
if (Test-Path "$backend\data\clothncare.db") {
    New-Item -ItemType Directory -Path (Join-Path $release "data") -Force | Out-Null
    Copy-Item "$backend\data\clothncare.db" (Join-Path $release "data\clothncare.db") -Force
} else {
    New-Item -ItemType Directory -Path (Join-Path $release "data") | Out-Null
}

Write-Host "`nDONE. Copy the 'release' folder to the client PC:" -ForegroundColor Green
Write-Host "  $release"
Write-Host "Then on the client PC double-click start.bat (Java 17+ required)." -ForegroundColor Green
