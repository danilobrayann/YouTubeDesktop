# criar-atalho.ps1
param(
    [switch]$PreferSource
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Determinar o alvo do atalho
$exeDir  = Join-Path $scriptDir "dist\win-unpacked\TurboDown.exe"
$exePack = Join-Path $scriptDir "dist\TurboDown-win32-x64\TurboDown.exe"
$legacyExeDir = Join-Path $scriptDir "dist\win-unpacked\YouTube Desktop.exe"
$legacyExePack = Join-Path $scriptDir "dist\YouTube Desktop-win32-x64\YouTube Desktop.exe"
$batPath = Join-Path $scriptDir "iniciar.bat"
$iconPath = Join-Path $scriptDir "assets\icon.ico"

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class TurboDownShellNotify
{
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern void SHChangeNotify(uint eventId, uint flags, string itemPath, IntPtr itemData);
}
'@

function Update-ShellIcon {
    param([string]$Path)

    [TurboDownShellNotify]::SHChangeNotify(0x00002000, 0x0005, $Path, [IntPtr]::Zero)
}

if ($PreferSource) {
    $targetPath = $batPath
    $workDir = $scriptDir
} elseif (Test-Path $exeDir) {
    $targetPath = $exeDir
    $workDir = Split-Path -Parent $exeDir
} elseif (Test-Path $exePack) {
    $targetPath = $exePack
    $workDir = Split-Path -Parent $exePack
} else {
    $targetPath = $batPath
    $workDir = $scriptDir
}

# 2. Localizar a pasta real da Area de Trabalho
$desktopCandidates = @(
    (Join-Path $env:USERPROFILE "OneDrive\Área de Trabalho"),
    (Join-Path $env:USERPROFILE "Desktop"),
    [System.Environment]::GetFolderPath('Desktop')
)

$targetDesktop = $null
foreach ($d in $desktopCandidates) {
    if ($d -and (Test-Path $d -ErrorAction SilentlyContinue)) {
        $targetDesktop = $d
        break
    }
}

if (-not $targetDesktop) {
    $targetDesktop = Join-Path $env:USERPROFILE "Desktop"
}

# 3. Criar o atalho .lnk
$shortcutPath = Join-Path $targetDesktop "TurboDown.lnk"

try {
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $workDir
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }
    $shortcut.Description = "TurboDown - Assistir e baixar videos"
    $shortcut.Save()
    if (Test-Path $iconPath) {
        Update-ShellIcon $iconPath
    }
    Update-ShellIcon $shortcutPath
    Write-Host "OK - Atalho criado com sucesso em: $shortcutPath" -ForegroundColor Green

    $legacyShortcutPath = Join-Path $targetDesktop "YouTube Desktop.lnk"
    if (Test-Path $legacyShortcutPath) {
        $legacyShortcut = $wshShell.CreateShortcut($legacyShortcutPath)
        if ($legacyShortcut.TargetPath -in @($batPath, $legacyExeDir, $legacyExePack, $exeDir, $exePack)) {
            Remove-Item -LiteralPath $legacyShortcutPath -Force
        }
    }
} catch {
    # Fallback criando na raiz do projeto se a Area de Trabalho estiver protegida
    try {
        $fallbackLnk = Join-Path $scriptDir "TurboDown.lnk"
        $shortcut = $wshShell.CreateShortcut($fallbackLnk)
        $shortcut.TargetPath = $targetPath
        $shortcut.WorkingDirectory = $workDir
        if (Test-Path $iconPath) { $shortcut.IconLocation = "$iconPath,0" }
        $shortcut.Save()
        if (Test-Path $iconPath) {
            Update-ShellIcon $iconPath
        }
        Update-ShellIcon $fallbackLnk
        Write-Host "OK - Atalho criado na pasta do projeto: $fallbackLnk" -ForegroundColor Yellow
    } catch {}
}
