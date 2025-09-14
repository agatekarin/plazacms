# 🔄 PlazaCMS Auto Backup System

Automated backup solution untuk PlazaCMS project dengan multiple destination support.

## 📋 Features

- ✅ **Multiple Backup Locations** → A:\BackupProject, C:\BackupProject, dan D:\BackupProject
- ✅ **Timestamped Archives** → `plazacms-backup-2025-01-15_14-30-45.zip`
- ✅ **Smart Exclusions** → Excludes node_modules, .next, .git, logs, etc.
- ✅ **Backup Verification** → Verifies file integrity after backup
- ✅ **Detailed Logging** → Shows progress and results
- ✅ **Scheduled Automation** → Daily/Weekly/Monthly automated backups
- ✅ **Cleanup Management** → Automatic temp file cleanup

## 🚀 Quick Start

### Manual Backup (Easy Way)

```bash
# Double-click this file:
backup-plazacms.bat
```

### Manual Backup (PowerShell)

```powershell
# Basic backup
.\backup-project.ps1

# With verbose output
.\backup-project.ps1 -Verbose

# Include node_modules
.\backup-project.ps1 -IncludeNodeModules

# Custom locations
.\backup-project.ps1 -BackupLocations @("E:\Backup", "F:\Archive")

# Default 3 locations
.\backup-project.ps1 -BackupLocations @("A:\BackupProject", "C:\BackupProject", "D:\BackupProject")
```

### Automated Backup Setup

```powershell
# Run as Administrator
.\setup-auto-backup.ps1

# Daily backup at 2 AM (default)
.\setup-auto-backup.ps1 -BackupInterval Daily -BackupTime "02:00"

# Weekly backup on Sunday at 3 AM
.\setup-auto-backup.ps1 -BackupInterval Weekly -BackupTime "03:00"

# Replace existing task
.\setup-auto-backup.ps1 -Force
```

## 📁 Backup Structure

```
plazacms-backup-2025-01-15_14-30-45.zip
├── admin/                 # Admin panel source
├── store/                 # Store frontend (if exists)
├── .mysetting/           # Database schema & docs
├── *.md                  # Documentation files
├── *.json                # Config files
├── *.js                  # Root scripts
└── backup-info.json      # Backup metadata
```

## 🚫 Excluded Files/Folders

- `node_modules/` (unless -IncludeNodeModules)
- `.next/`, `dist/`, `build/`
- `.git/`, `.env.local`, `.env.production`
- `*.log`, `*.tmp`, `*.temp`
- `coverage/`, `.nyc_output/`
- `Thumbs.db`, `.DS_Store`

## 📊 Backup Locations

| Location           | Purpose          | Notes                          |
| ------------------ | ---------------- | ------------------------------ |
| `A:\BackupProject` | Primary backup   | Fast local storage             |
| `C:\BackupProject` | System backup    | OS drive for easy access       |
| `D:\BackupProject` | Secondary backup | Different drive for redundancy |

## 🔧 Configuration Options

### Script Parameters

```powershell
# All available parameters
.\backup-project.ps1 `
  -ProjectPath "A:\dev\plazacms" `
  -BackupLocations @("A:\BackupProject", "D:\BackupProject") `
  -IncludeNodeModules `
  -Verbose
```

### Scheduled Task Options

```powershell
# Setup options
.\setup-auto-backup.ps1 `
  -BackupInterval "Daily" `    # Daily, Weekly, Monthly
  -BackupTime "02:00" `        # 24-hour format
  -Force                       # Replace existing task
```

## 📈 Backup Monitoring

### Check Backup Status

```powershell
# View scheduled task
Get-ScheduledTask -TaskName "PlazaCMS-AutoBackup"

# Check task history
Get-ScheduledTaskInfo -TaskName "PlazaCMS-AutoBackup"
```

### Manual Task Management

```powershell
# Start backup task manually
Start-ScheduledTask -TaskName "PlazaCMS-AutoBackup"

# Disable automated backup
Disable-ScheduledTask -TaskName "PlazaCMS-AutoBackup"

# Remove scheduled task
Unregister-ScheduledTask -TaskName "PlazaCMS-AutoBackup" -Confirm:$false
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. PowerShell Execution Policy

```powershell
# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. Access Denied to Backup Location

```powershell
# Check if backup directories exist and are writable
Test-Path "A:\BackupProject"
Test-Path "D:\BackupProject"

# Create directories if needed
New-Item -ItemType Directory -Path "A:\BackupProject" -Force
New-Item -ItemType Directory -Path "D:\BackupProject" -Force
```

#### 3. Scheduled Task Not Running

```powershell
# Check task status
Get-ScheduledTaskInfo -TaskName "PlazaCMS-AutoBackup"

# View task history in Event Viewer:
# Windows Logs > Applications and Services Logs > Microsoft > Windows > TaskScheduler
```

#### 4. Large Backup Size

```powershell
# Exclude node_modules to reduce size (default behavior)
.\backup-project.ps1

# Check what's taking space
Get-ChildItem "A:\dev\plazacms" -Recurse | Sort-Object Length -Descending | Select-Object -First 20
```

## 📋 Backup Best Practices

1. **Regular Testing** → Test restore process monthly
2. **Multiple Locations** → Use different drives/locations
3. **Monitor Size** → Keep an eye on backup sizes
4. **Cleanup Old Backups** → Remove backups older than 30 days
5. **Verify Integrity** → Check backup files periodically

## 🔄 Restore Process

1. **Extract Backup** → Unzip backup file to desired location
2. **Install Dependencies** → Run `pnpm install` in admin folder
3. **Setup Environment** → Copy `.env.local` from secure location
4. **Database Restore** → Import schema from `.mysetting/schema.sql`
5. **Test Application** → Verify everything works

## 📞 Support

If you encounter issues:

1. Check the backup logs in PowerShell output
2. Verify backup locations are accessible
3. Ensure sufficient disk space
4. Check Windows Event Viewer for scheduled task errors

---

**🎯 Happy Backing Up! Your PlazaCMS project is now protected with automated backups.**
