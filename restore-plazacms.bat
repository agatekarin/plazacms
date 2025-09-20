@echo off
REM PlazaCMS Database Restore Script
REM Double-click to run restore

echo.
echo ========================================
echo   PlazaCMS Database Restore Utility
echo ========================================
echo.

REM Use full paths
set "PS=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
set "RESTOREPS=A:\dev\plazacms\.backupdb\restore.ps1"

REM Check if PowerShell is available
if not exist "%PS%" (
    echo ERROR: PowerShell not found at "%PS%"!
    echo Please install PowerShell to use this restore script.
    pause
    exit /b 1
)

REM Check if restore script exists
if not exist "%RESTOREPS%" (
    echo ERROR: Restore script not found at "%RESTOREPS%"!
    echo Please make sure the restore.ps1 file exists.
    pause
    exit /b 1
)

REM Run restore script
echo Starting database restore process...
echo.

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%RESTOREPS%"

echo.
echo ========================================
echo Restore process completed!
echo ========================================
echo.
pause