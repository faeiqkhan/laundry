@echo off
rem Cloth n Care - LAN launcher (double-click this file)
rem Build once on a dev machine with scripts\build.ps1, copy this
rem whole folder to the client PC, then run start.bat.
rem Java is bundled in the "jre" folder - no installation needed.
rem If the "jre" folder is missing, the system Java is used as a fallback.

cd /d "%~dp0"

set "JAVA_EXE=%~dp0jre\bin\java.exe"
if exist "%JAVA_EXE%" goto :havejava

set "JAVA_EXE=java"
where java >nul 2>nul
if not errorlevel 1 goto :havejava

echo Java runtime not found.
echo Make sure the "jre" folder is next to start.bat, or install Java 17
echo or newer from https://adoptium.net then run this again.
pause
exit /b 1

:havejava
rem Make sure the data and invoices folders exist (SQLite cannot create
rem its database file if the parent folder is missing).
if not exist data mkdir data
if not exist invoices mkdir invoices

rem ------------------------------------------------------------------
rem Start the WhatsApp service (Node.js / whatsapp-web.js) so that
rem WhatsApp notifications and invoice messages work.
rem It is a no-op if Node is missing, the service folder is absent, or
rem something is already listening on port 3001.
rem ------------------------------------------------------------------
echo.
echo Starting WhatsApp service...
where node >nul 2>nul
if errorlevel 1 (
  echo   [SKIP] Node.js not found - WhatsApp notifications disabled.
  goto :secret
)
set "WA_DIR=whatsapp-service"
if not exist "%WA_DIR%\src\server.js" (
  if exist "..\whatsapp-service\src\server.js" set "WA_DIR=..\whatsapp-service"
)
if not exist "%WA_DIR%\src\server.js" (
  echo   [SKIP] whatsapp-service folder not found - WhatsApp notifications disabled.
  goto :secret
)
netstat -ano | findstr /r /c:":3001 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo   [OK] WhatsApp service already running on port 3001.
  goto :secret
)
rem Hide the service - no extra cmd window. Output goes to whatsapp-service.log
rem next to start.bat so it can be checked if something goes wrong.
start "" /b /d "%~dp0%WA_DIR%" node src\server.js >> "%~dp0whatsapp-service.log" 2>&1
echo   [OK] WhatsApp service starting in the background on 127.0.0.1:3001.
echo        If a QR code is required, open Settings -> WhatsApp Connection
echo        in the app to scan it.

:secret
if not exist jwt-secret.txt (
  echo First run: generating JWT secret...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[guid]::NewGuid().ToString()+[guid]::NewGuid().ToString();[System.IO.File]::WriteAllText('jwt-secret.txt',$s)"
)

set /p JWT_SECRET_KEY=<jwt-secret.txt

rem Detect the LAN IP (usually the Wi-Fi adapter) so other devices can open the app.
set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$r=Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1; if ($r) { (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $r.InterfaceIndex -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress }"`) do set "LAN_IP=%%i"

rem ------------------------------------------------------------------
rem If the app is already running, do not start a second instance.
rem ------------------------------------------------------------------
netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo.
  echo Cloth n Care is already running on port 8080.
  echo Open http://localhost:8080 in your browser, or stop the existing
  echo window before starting a new instance.
  echo.
  pause
  exit /b 0
)

echo.
echo Starting Cloth n Care...
echo   - On this PC:      http://localhost:8080
if defined LAN_IP (
  echo   - Other devices:   http://%LAN_IP%:8080  ^(same WiFi/LAN network^)
) else (
  echo   - Other devices:   use this PC's IP address on the WiFi/LAN network
)
echo   - Close this window to stop the app.
echo.
"%JAVA_EXE%" -jar ClothNCare.jar

pause
