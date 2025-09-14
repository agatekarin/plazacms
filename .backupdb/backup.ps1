# Requires: PostgreSQL client tools (pg_dump) available in PATH
$ErrorActionPreference = 'Stop'

# Settings
$BackupDir = 'A:\dev\plazacms\.backupdb'
$ConnectionString = 'postgres://admin:SuperSecret@localhost:5432/plazacms'
$DumpFile = Join-Path $BackupDir 'plazastorecms.sql'

Write-Host "Backup directory: $BackupDir"
Write-Host "Dump file: $DumpFile"

# Ensure backup directory exists
if (-not (Test-Path -Path $BackupDir -PathType Container)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Check pg_dump availability
try {
    $null = Get-Command pg_dump -ErrorAction Stop
} catch {
    Write-Error "pg_dump is not found in PATH. Install PostgreSQL client tools or add pg_dump to PATH."
    exit 1
}

Write-Host 'Starting database dump (pg_dump) ...'

# Remove old dump file if exists to avoid mixing
if (Test-Path -Path $DumpFile -PathType Leaf) {
    Remove-Item -Path $DumpFile -Force
}

# Perform dump; use --file to avoid PS redirection encoding issues
& pg_dump --file "$DumpFile" --format=plain --no-owner --no-privileges "$ConnectionString"

# Validate dump file
if (-not (Test-Path -Path $DumpFile -PathType Leaf)) {
    Write-Error "Dump failed: $DumpFile was not created."
    exit 2
}

$dumpInfo = Get-Item $DumpFile
if ($dumpInfo.Length -lt 1024) { # sanity check: at least 1KB
    Write-Warning "Dump file is unexpectedly small ($($dumpInfo.Length) bytes). Proceeding to archive but please verify."
}

Write-Host 'Database dump complete.'

exit 0

