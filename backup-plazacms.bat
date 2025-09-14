@echo off
REM PlazaCMS Quick Backup Script
REM Double-click to run backup

echo.
echo ========================================
echo    PlazaCMS Auto Backup Utility
echo ========================================
echo.

REM Use full paths
set "PS=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
set "DBPS=A:\dev\plazacms\.backupdb\backup.ps1"
set "PROJPS=A:\dev\plazacms\backup-project.ps1"

REM Check if PowerShell is available
if not exist "%PS%" (
    echo ERROR: PowerShell not found at "%PS%"!
    echo Please install PowerShell to use this backup script.
    pause
    exit /b 1
)

REM Run backup script
echo Starting backup process...
echo.

echo [1/2] Dumping PostgreSQL database...
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%DBPS%"
if errorlevel 1 (
    echo ERROR: Database dump failed. Aborting project archive.
    pause
    exit /b 1
)

echo [2/2] Archiving project and distributing to backup locations...
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%PROJPS%" -Verbose

echo.
echo ========================================
echo Backup process completed!
echo Check the output above for results.
echo ========================================
echo.
pause