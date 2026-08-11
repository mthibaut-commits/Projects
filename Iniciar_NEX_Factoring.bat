@echo off
REM Genera el panel NEX Factoring y lo abre en Chrome o Edge.
REM IMPORTANTE: se abre en un navegador real (NO en el visor de Claude), porque ese visor
REM bloquea abrir paginas file:// separadas (WhatsApp del cliente y sitio Security).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_app.ps1"
if errorlevel 1 (
  echo.
  echo Hubo un problema al generar la aplicacion.
  pause
  exit /b 1
)
set "APP=%~dp0pipeline_comercial.html"

REM 1) Chrome en PATH
where chrome >nul 2>nul && ( start "" chrome "%APP%" & goto :done )
REM 2) Chrome en ubicaciones tipicas
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" ( start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%APP%" & goto :done )
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" ( start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%APP%" & goto :done )
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" ( start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%APP%" & goto :done )
REM 3) Edge en PATH
where msedge >nul 2>nul && ( start "" msedge "%APP%" & goto :done )
REM 4) Edge en ubicacion tipica
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" ( start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%APP%" & goto :done )
REM 5) Ultimo recurso: navegador por defecto
start "" "%APP%"

:done
