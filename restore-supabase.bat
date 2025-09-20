@echo off
REM PlazaCMS Supabase Database Restore Script
REM Double-click to restore to Supabase

echo.
echo ========================================
echo   PlazaCMS Supabase Restore Utility
echo ========================================
echo.

REM Use full paths
set "PS=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
set "SUPABASEPS=A:\dev\plazacms\.backupdb\restore-supabase.ps1"

REM Check if PowerShell is available
if not exist "%PS%" (
    echo ERROR: PowerShell not found at "%PS%"!
    echo Please install PowerShell to use this restore script.
    pause
    exit /b 1
)

REM Check if Supabase restore script exists
if not exist "%SUPABASEPS%" (
    echo ERROR: Supabase restore script not found at "%SUPABASEPS%"!
    echo Please make sure the restore-supabase.ps1 file exists.
    pause
    exit /b 1
)

REM Run Supabase restore script
echo Starting Supabase restore process...
echo.

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%SUPABASEPS%"

echo.
echo ========================================
echo Supabase restore process completed!
echo ========================================
echo.
pause