# PlazaCMS Auto Backup Script
# Backup project to multiple locations with timestamp

param(
    [string]$ProjectPath = "A:\dev\plazacms",
    [string[]]$BackupLocations = @("A:\BackupProject", "C:\BackupProject", "D:\BackupProject"),
    [switch]$IncludeNodeModules = $false,
    [switch]$Verbose = $false
)

# Get timestamp for backup filename
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "plazacms-backup-$timestamp.zip"

Write-Host "[BACKUP] PlazaCMS Auto Backup Started" -ForegroundColor Green
Write-Host "[SOURCE] $ProjectPath" -ForegroundColor Cyan
Write-Host "[ARCHIVE] $backupName" -ForegroundColor Cyan

# Check if source project exists
if (-not (Test-Path $ProjectPath)) {
    Write-Host "[ERROR] Project path not found: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Create temporary backup directory
$tempDir = Join-Path $env:TEMP "plazacms-backup-temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "[COPY] Copying project files..." -ForegroundColor Yellow

# Copy project files excluding specified patterns
try {
    # Separate directories and files for better robocopy handling
    $excludeDirs = @("node_modules", ".next", ".wrangler", "dist", "build", ".git", "coverage", ".nyc_output")
    
    # Exclude temporary files but INCLUDE important .env files (.env, .env.local, .env.production)
    $excludeFiles = @("*.log", "*.tmp", "*.temp", "Thumbs.db", ".DS_Store", ".env.development.local", ".env.test.local")
    
    # Add node_modules to exclude if not explicitly included
    if (-not $IncludeNodeModules) {
        $excludeDirs += "node_modules"
    }
    
    $robocopyArgs = @(
        $ProjectPath,
        $tempDir,
        "/E",     # Copy subdirectories including empty ones
        "/XD"     # Exclude directories
    )
    
    # Add exclude directories (will exclude them anywhere in the tree)
    $robocopyArgs += $excludeDirs
    
    # Add exclude files
    $robocopyArgs += "/XF"
    $robocopyArgs += $excludeFiles
    
    if ($Verbose) {
        $robocopyArgs += "/V"  # Verbose output
    } else {
        $robocopyArgs += "/NJH", "/NJS"  # No job header/summary
    }
    
    $result = & robocopy @robocopyArgs
    
    if ($LASTEXITCODE -ge 8) {
        throw "Robocopy failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "[SUCCESS] Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error copying files: $_" -ForegroundColor Red
    exit 1
}

# Create backup info file
$backupInfo = @{
    BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    ProjectPath = $ProjectPath
    BackupName = $backupName
    ExcludedDirectories = $excludeDirs
    ExcludedFiles = $excludeFiles
    IncludeNodeModules = $IncludeNodeModules
    PowerShellVersion = $PSVersionTable.PSVersion.ToString()
    ComputerName = $env:COMPUTERNAME
    UserName = $env:USERNAME
} | ConvertTo-Json -Depth 2

$backupInfoPath = Join-Path $tempDir "backup-info.json"
$backupInfo | Out-File -FilePath $backupInfoPath -Encoding UTF8

Write-Host "[ZIP] Creating ZIP archive..." -ForegroundColor Yellow

# Create ZIP file in temp location first
$tempZipPath = Join-Path $env:TEMP $backupName

try {
    # Use .NET compression for better performance
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $tempZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    
    Write-Host "[SUCCESS] ZIP archive created successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error creating ZIP: $_" -ForegroundColor Red
    exit 1
}

# Copy to backup locations
$successCount = 0
foreach ($location in $BackupLocations) {
    Write-Host "[BACKUP] Backing up to: $location" -ForegroundColor Cyan
    
    try {
        # Create backup directory if it doesn't exist
        if (-not (Test-Path $location)) {
            New-Item -ItemType Directory -Path $location -Force | Out-Null
            Write-Host "   [MKDIR] Created backup directory" -ForegroundColor Gray
        }
        
        # Copy ZIP to backup location
        $destinationPath = Join-Path $location $backupName
        Copy-Item $tempZipPath $destinationPath -Force
        
        # Verify backup
        if (Test-Path $destinationPath) {
            $fileSize = (Get-Item $destinationPath).Length
            $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
            Write-Host "   [OK] Backup successful ($fileSizeMB MB)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "   [FAIL] Backup verification failed" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "   [ERROR] Error backing up to $location : $_" -ForegroundColor Red
    }
}

# Cleanup temp files
try {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $tempZipPath -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "[WARN] Could not clean up temp files" -ForegroundColor Yellow
}

# Summary
Write-Host "`n[SUMMARY] Backup Summary:" -ForegroundColor Magenta
Write-Host "   Archive: $backupName" -ForegroundColor White
Write-Host "   Successful: $successCount / $($BackupLocations.Count)" -ForegroundColor White
Write-Host "   Locations:" -ForegroundColor White

foreach ($location in $BackupLocations) {
    $destinationPath = Join-Path $location $backupName
    if (Test-Path $destinationPath) {
        $fileSize = (Get-Item $destinationPath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "      [OK] $location ($fileSizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "      [FAIL] $location (Failed)" -ForegroundColor Red
    }
}

if ($successCount -eq $BackupLocations.Count) {
    Write-Host "`n[SUCCESS] All backups completed successfully!" -ForegroundColor Green
    exit 0
} elseif ($successCount -gt 0) {
    Write-Host "`n[WARN] Some backups failed. Check locations above." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n[ERROR] All backups failed!" -ForegroundColor Red
    exit 1
}