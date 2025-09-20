# Requires: PostgreSQL client tools (pg_dump) available in PATH
$ErrorActionPreference = 'Stop'

# Settings
$BackupDir = 'A:\dev\plazacms\.backupdb'
$ConnectionString = 'postgres://admin:SuperSecret@localhost:5432/plazacms'
# No retention policy - always overwrite latest files

# Define backup files (always overwrite latest)
$BackupFiles = @{
    'Schema' = Join-Path $BackupDir "schema_only.sql"
    'Data' = Join-Path $BackupDir "data_only.sql"
    'Countries' = Join-Path $BackupDir "data_countries.sql"
    'States' = Join-Path $BackupDir "data_states.sql"
    'Cities' = Join-Path $BackupDir "data_cities.sql"
}

Write-Host "========================================="
Write-Host "PlazaCMS Advanced Backup Utility"
Write-Host "========================================="
Write-Host "Backup directory: $BackupDir"
Write-Host "Mode: Overwrite latest backup files"
Write-Host ""

# Ensure backup directory exists
if (-not (Test-Path -Path $BackupDir -PathType Container)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "Created backup directory: $BackupDir"
}

# Check pg_dump availability
try {
    $null = Get-Command pg_dump -ErrorAction Stop
    Write-Host "[OK] pg_dump found in PATH"
} catch {
    Write-Error "pg_dump is not found in PATH. Install PostgreSQL client tools or add pg_dump to PATH."
    exit 1
}

# Function to validate dump file and content
function Test-DumpFile {
    param($FilePath, $MinSize = 1024, $ExpectedType = "")
    
    if (-not (Test-Path -Path $FilePath -PathType Leaf)) {
        throw "Dump file was not created: $FilePath"
    }
    
    $fileInfo = Get-Item $FilePath
    $fileSizeBytes = $fileInfo.Length
    $fileName = Split-Path $FilePath -Leaf
    $fileSizeKB = [math]::Round($fileSizeBytes/1KB, 2)
    
    if ($fileSizeBytes -lt $MinSize) {
        Write-Warning "Dump file is small ($fileSizeBytes bytes): $fileName"
    }
    
    # Validate file content
    try {
        $content = Get-Content $FilePath -Raw
        
        # Check for actual SQL errors in the dump (only at line start)
        $errorLines = $content -split "`n" | Where-Object { $_ -match "^(ERROR|FATAL):" -and $_ -notmatch "pg_dump:" }
        if ($errorLines.Count -gt 0) {
            Write-Warning "Potential errors found in $fileName"
        }
        
        # Validate specific content based on type
        switch ($ExpectedType) {
            "schema" {
                if (-not ($content -match "CREATE TABLE" -or $content -match "CREATE FUNCTION")) {
                    Write-Warning "Schema file may be incomplete - no CREATE statements found"
                } else {
                    $tableCount = ([regex]::Matches($content, "CREATE TABLE")).Count
                    Write-Host "[OK] Created: $fileName ($fileSizeKB KB) - $tableCount tables"
                }
            }
            "data" {
                if (-not ($content -match "INSERT INTO" -or $content -match "COPY")) {
                    Write-Warning "Data file may be incomplete - no INSERT/COPY statements found"
                } else {
                    $insertCount = ([regex]::Matches($content, "INSERT INTO")).Count
                    $copyCount = ([regex]::Matches($content, "COPY")).Count
                    Write-Host "[OK] Created: $fileName ($fileSizeKB KB) - $insertCount inserts, $copyCount copies"
                }
            }
            default {
                Write-Host "[OK] Created: $fileName ($fileSizeKB KB)"
            }
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Warning "Could not validate content of $fileName`: $errorMsg"
        Write-Host "[OK] Created: $fileName ($fileSizeKB KB)"
    }
}

Write-Host ""
Write-Host "Starting database backup process..."
Write-Host ""

# 1. Schema only backup
Write-Host "[1/5] Dumping schema only..."
try {
    & pg_dump --schema-only --file $BackupFiles.Schema --format=plain --no-owner --no-privileges --if-exists --clean $ConnectionString
    Test-DumpFile $BackupFiles.Schema 1024 "schema"
} catch {
    Write-Error "Schema dump failed: $_"
    exit 2
}

# 2. Data only backup (exclude location tables)
Write-Host "[2/5] Dumping data only (excluding location tables)..."
try {
    & pg_dump --data-only --exclude-table=public.countries --exclude-table=public.states --exclude-table=public.cities --file $BackupFiles.Data --format=plain --no-owner --no-privileges --disable-triggers $ConnectionString
    Test-DumpFile $BackupFiles.Data 1024 "data"
} catch {
    Write-Error "Data dump failed: $_"
    exit 3
}

# 3. Countries data backup
Write-Host "[3/5] Dumping countries data..."
try {
    & pg_dump --data-only --table=public.countries --file $BackupFiles.Countries --format=plain --no-owner --no-privileges $ConnectionString
    Test-DumpFile $BackupFiles.Countries 100 "data"
} catch {
    Write-Error "Countries dump failed: $_"
    exit 4
}

# 4. States data backup
Write-Host "[4/5] Dumping states data..."
try {
    & pg_dump --data-only --table=public.states --file $BackupFiles.States --format=plain --no-owner --no-privileges $ConnectionString
    Test-DumpFile $BackupFiles.States 100 "data"
} catch {
    Write-Error "States dump failed: $_"
    exit 5
}

# 5. Cities data backup
Write-Host "[5/5] Dumping cities data..."
try {
    & pg_dump --data-only --table=public.cities --file $BackupFiles.Cities --format=plain --no-owner --no-privileges $ConnectionString
    Test-DumpFile $BackupFiles.Cities 100 "data"
} catch {
    Write-Error "Cities dump failed: $_"
    exit 6
}

Write-Host ""
Write-Host "All database dumps completed successfully!"
Write-Host ""

# Comprehensive backup validation
Write-Host "Validating backup integrity..."
try {
    # Test connection and get source database stats
    $sourceStats = @{}
    
    # Count tables
    $tableCount = & psql $ConnectionString -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
    $sourceStats.Tables = $tableCount.Trim()
    
    # Count total records in main tables
    $recordCounts = @()
    $mainTables = @('products', 'categories', 'orders', 'customers', 'countries', 'states', 'cities')
    
    foreach ($table in $mainTables) {
        try {
            $count = & psql $ConnectionString -t -c "SELECT COUNT(*) FROM $table;" 2>$null
            if ($count -and $count.Trim() -match '^\d+$') {
                $recordCounts += "$table`: $($count.Trim())"
                $sourceStats[$table] = [int]$count.Trim()
            }
        } catch {
            Write-Warning "Could not count records in table $table"
        }
    }
    
    Write-Host "[VALIDATION] Source database stats:"
    Write-Host "  Tables: $($sourceStats.Tables)"
    foreach ($record in $recordCounts) {
        Write-Host "  Records - $record"
    }
    
    # Validate backup files contain expected content
    $backupValid = $true
    
    # Check schema file for all tables
    try {
        $schemaContent = Get-Content $BackupFiles.Schema -Raw
        $foundTables = ([regex]::Matches($schemaContent, "CREATE TABLE public\.(\w+)")).Count
        $expectedTables = if ([string]::IsNullOrEmpty($sourceStats.Tables)) { 1 } else { [int]$sourceStats.Tables }
        
        if ($foundTables -lt $expectedTables / 2) {
            Write-Warning "Schema backup may be incomplete - found only $foundTables table definitions"
            $backupValid = $false
        } else {
            Write-Host "[VALIDATION] Schema contains $foundTables table definitions"
        }
    } catch {
        Write-Warning "Could not validate schema content"
        $backupValid = $false
    }
    
    Write-Host "[VALIDATION] Backup validation: $(if ($backupValid) { 'PASSED' } else { 'WARNING' })"
    
} catch {
    Write-Warning "Could not perform backup validation: $_"
}

Write-Host ""

# Remove old timestamped backup files (cleanup from previous version)
Write-Host "Cleaning up old timestamped backup files..."
$OldTimestampedFiles = Get-ChildItem -Path $BackupDir -Filter "*.sql" | Where-Object { 
    $_.Name -match "^\w+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.sql$"
}

if ($OldTimestampedFiles.Count -gt 0) {
    Write-Host "Removing $($OldTimestampedFiles.Count) old timestamped files:"
    foreach ($file in $OldTimestampedFiles) {
        Write-Host "  - $($file.Name)"
        Remove-Item -Path $file.FullName -Force
    }
} else {
    Write-Host "No old timestamped files to remove."
}

# Remove legacy single backup file if exists
$LegacyFile = Join-Path $BackupDir 'plazastorecms.sql'
if (Test-Path -Path $LegacyFile -PathType Leaf) {
    Write-Host "Removing legacy backup file: plazastorecms.sql"
    Remove-Item -Path $LegacyFile -Force
}

Write-Host ""
Write-Host "========================================="
Write-Host "Backup process completed successfully!"
Write-Host "Latest backup files ready for restore."
Write-Host "========================================="

exit 0