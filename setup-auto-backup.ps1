# Setup Automated Backup Task for PlazaCMS
# Run as Administrator to create scheduled task

param(
    [string]$BackupInterval = "Daily",  # Daily, Weekly, Monthly
    [string]$BackupTime = "02:00",      # 24-hour format
    [switch]$Force = $false
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator to create scheduled tasks." -ForegroundColor Red
    Write-Host "💡 Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$taskName = "PlazaCMS-AutoBackup"
$scriptPath = Join-Path (Get-Location) "backup-project.ps1"

Write-Host "🔧 Setting up automated backup for PlazaCMS" -ForegroundColor Green
Write-Host "📅 Interval: $BackupInterval at $BackupTime" -ForegroundColor Cyan

# Check if script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Backup script not found: $scriptPath" -ForegroundColor Red
    Write-Host "💡 Make sure backup-project.ps1 is in the same directory" -ForegroundColor Yellow
    exit 1
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask -and -not $Force) {
    Write-Host "⚠️  Scheduled task '$taskName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to replace it? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ Setup cancelled." -ForegroundColor Red
        exit 0
    }
}

# Remove existing task if it exists
if ($existingTask) {
    Write-Host "🗑️  Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

try {
    # Create scheduled task action
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

    # Create scheduled task trigger based on interval
    switch ($BackupInterval.ToLower()) {
        "daily" {
            $trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime
        }
        "weekly" {
            $trigger = New-ScheduledTaskTrigger -Weekly -At $BackupTime -DaysOfWeek Sunday
        }
        "monthly" {
            $trigger = New-ScheduledTaskTrigger -Weekly -At $BackupTime -WeeksInterval 4
        }
        default {
            throw "Invalid backup interval: $BackupInterval. Use Daily, Weekly, or Monthly."
        }
    }

    # Create scheduled task settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    # Create scheduled task principal (run as current user)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

    # Register the scheduled task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Automated backup for PlazaCMS project"

    Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "📋 Task Details:" -ForegroundColor Cyan
    Write-Host "   Name: $taskName" -ForegroundColor White
    Write-Host "   Interval: $BackupInterval" -ForegroundColor White
    Write-Host "   Time: $BackupTime" -ForegroundColor White
    Write-Host "   Script: $scriptPath" -ForegroundColor White

    # Show next run time
    $task = Get-ScheduledTask -TaskName $taskName
    $nextRun = (Get-ScheduledTaskInfo -TaskName $taskName).NextRunTime
    if ($nextRun) {
        Write-Host "   Next Run: $nextRun" -ForegroundColor White
    }

    Write-Host "`n🎉 Auto-backup is now configured!" -ForegroundColor Green
    Write-Host "💡 You can manage this task in Windows Task Scheduler" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error creating scheduled task: $_" -ForegroundColor Red
    exit 1
}

# Offer to run a test backup
Write-Host "`n🧪 Would you like to run a test backup now? (y/N): " -ForegroundColor Cyan -NoNewline
$testResponse = Read-Host

if ($testResponse -eq "y" -or $testResponse -eq "Y") {
    Write-Host "`n🚀 Running test backup..." -ForegroundColor Green
    & $scriptPath -Verbose
}