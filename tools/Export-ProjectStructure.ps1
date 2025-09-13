param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath,
    [string]$OutputPath,
    [string[]]$Exclude = @('node_modules', '.next'),
    [switch]$ExcludeHidden = $true,
    [switch]$UseBat
)

function Test-IsHidden([System.IO.FileSystemInfo]$item) {
    # Treat Windows Hidden/System attributes OR dot-prefixed names as hidden
    $hasHiddenAttr = (($item.Attributes -band [IO.FileAttributes]::Hidden) -ne 0) -or (($item.Attributes -band [IO.FileAttributes]::System) -ne 0)
    $isDotPrefixed = $item.Name.StartsWith('.')
    return ($hasHiddenAttr -or $isDotPrefixed)
}

function Test-ExcludedByName([System.IO.FileSystemInfo]$item, [string[]]$names) {
    foreach ($ex in $names) {
        if ($item.Name -ieq $ex) { return $true }
    }
    return $false
}

function Get-TreeLines([string]$path, [string]$prefix = '', [string[]]$excludeNames, [bool]$skipHidden) {
    $entries = @()

    $dirs = Get-ChildItem -LiteralPath $path -Directory -ErrorAction SilentlyContinue | Sort-Object Name
    if ($skipHidden) { $dirs = $dirs | Where-Object { -not (Test-IsHidden $_) } }
    $dirs = $dirs | Where-Object { -not (Test-ExcludedByName $_ $excludeNames) }

    $files = Get-ChildItem -LiteralPath $path -File -ErrorAction SilentlyContinue | Sort-Object Name
    if ($skipHidden) { $files = $files | Where-Object { -not (Test-IsHidden $_) } }

    $children = @()
    $children += $dirs
    $children += $files

    for ($i = 0; $i -lt $children.Count; $i++) {
        $child = $children[$i]
        $isLast = ($i -eq $children.Count - 1)
        $connector = '|-- '
        if ($isLast) { $connector = '+-- ' }

        if ($child.PSIsContainer) {
            $entries += "$prefix$connector$($child.Name)/"
            $newPrefix = "$prefix|   "
            if ($isLast) { $newPrefix = "$prefix    " }
            $entries += Get-TreeLines -path $child.FullName -prefix $newPrefix -excludeNames $excludeNames -skipHidden:$skipHidden
        } else {
            $entries += "$prefix$connector$($child.Name)"
        }
    }

    return $entries
}

# ---- Main ----
if (-not (Test-Path -LiteralPath $RootPath)) {
    throw "RootPath not found: $RootPath"
}
$rootItem = Get-Item -LiteralPath $RootPath
if (-not $rootItem.PSIsContainer) {
    throw "RootPath must be a directory: $RootPath"
}

$tree = @("$($rootItem.Name)/")
$tree += Get-TreeLines -path $RootPath -prefix '' -excludeNames $Exclude -skipHidden:$ExcludeHidden

$resolvedRoot = (Resolve-Path -LiteralPath $RootPath)
$excludedNames = (($Exclude | Sort-Object -Unique) -join ', ')
$hiddenStatus = 'included'
if ($ExcludeHidden) { $hiddenStatus = 'excluded' }

$md = @()
$md += '# Project Structure'
$md += ''
$md += ('- Root: ' + '`' + $resolvedRoot + '`')
$md += ('- Excluded names: ' + $excludedNames)
$md += ('- Hidden: ' + $hiddenStatus)
$md += ''
$md += '```'
$md += $tree
$md += '```'
$md += ''
$md += ('_Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '_')

if ($OutputPath) {
    $md -join "`r`n" | Out-File -LiteralPath $OutputPath -Encoding utf8
}

if ($UseBat) {
    $bat = Get-Command bat -ErrorAction SilentlyContinue
    if ($bat) {
        if ($OutputPath) {
            & $bat.Path -l md $OutputPath
        } else {
            $md -join "`r`n" | & $bat.Path -l md
        }
    } else {
        Write-Warning "bat not found. Printing plain text."
        $md
    }
} else {
    if ($OutputPath) {
        Write-Host "Wrote $OutputPath"
    } else {
        $md
    }
}

