@echo off
setlocal ENABLEDELAYEDEXPANSION

rem Determine absolute repo root as parent of this script's directory
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "DEFAULT_ROOT=%%~fI"

rem Arguments: [RootPath] [OutputPath] [show]
set "ROOT=%DEFAULT_ROOT%"
if not "%~1"=="" set "ROOT=%~1"

set "OUT=%ROOT%\PROJECT_STRUCTURE.md"
if not "%~2"=="" set "OUT=%~2"

set "USEBAT="
if /I "%~3"=="show" set "USEBAT=-UseBat"

set "PS1=%SCRIPT_DIR%Export-ProjectStructure.ps1"

set "PSCMD=& '%PS1%' -RootPath '%ROOT%' -OutputPath '%OUT%'"
if /I "%~3"=="show" set "PSCMD=%PSCMD% -UseBat"

powershell -NoProfile -NoLogo -ExecutionPolicy Bypass -Command "%PSCMD%"
if errorlevel 1 (
  echo Failed to generate project structure.>&2
  exit /b 1
)

echo Wrote %OUT%
endlocal
exit /b 0

