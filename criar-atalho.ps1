# criar-atalho.ps1
param(
    [switch]$PreferSource
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Determinar alvo do atalho (prioridade para o executavel compilado se ja existir)
$exeDir  = Join-Path $scriptDir "dist\win-unpacked\YouTube Desktop.exe"
$exePack = Join-Path $scriptDir "dist\YouTube Desktop-win32-x64\YouTube Desktop.exe"
$batPath = Join-Path $scriptDir "iniciar.bat"
$iconPath = Join-Path $scriptDir "assets\icon.ico"

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
$shortcutPath = Join-Path $targetDesktop "YouTube Desktop.lnk"

try {
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $workDir
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = $iconPath
    }
    $shortcut.Description = "YouTube Desktop - Assistir e baixar videos"
    $shortcut.Save()
    Write-Host "OK - Atalho criado com sucesso em: $shortcutPath" -ForegroundColor Green
} catch {
    # Fallback criando na raiz do projeto se a Area de Trabalho estiver protegida
    try {
        $fallbackLnk = Join-Path $scriptDir "YouTube Desktop.lnk"
        $shortcut = $wshShell.CreateShortcut($fallbackLnk)
        $shortcut.TargetPath = $targetPath
        $shortcut.WorkingDirectory = $workDir
        if (Test-Path $iconPath) { $shortcut.IconLocation = $iconPath }
        $shortcut.Save()
        Write-Host "OK - Atalho criado na pasta do projeto: $fallbackLnk" -ForegroundColor Yellow
    } catch {}
}
