@echo off
setlocal EnableDelayedExpansion
title TurboDown - Instalador
color 0A

echo.
echo  =========================================================
echo   TurboDown - Instalador Oficial
echo  =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo  Pasta do projeto: %SCRIPT_DIR%
echo.

:: ---------------------------------------------------------
:: PASSO 1: Atualizar o projeto antes da instalacao
:: ---------------------------------------------------------
echo  [1/5] Buscando a ultima atualizacao do projeto...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo  ERRO: Esta pasta nao e um repositorio Git.
    echo  Baixe ou clone o projeto pelo GitHub e execute o instalador novamente.
    pause
    exit /b 1
)

git pull --no-rebase --autostash
if errorlevel 1 (
    echo.
    echo  ERRO: Nao foi possivel atualizar o projeto.
    echo  Verifique sua conexao com a internet e resolva qualquer conflito Git
    echo  antes de executar o instalador novamente.
    pause
    exit /b 1
)
echo  OK - Projeto atualizado.

:: ---------------------------------------------------------
:: PASSO 2: Verificar Node.js
:: ---------------------------------------------------------
echo.
echo  [2/5] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%V in ('node -v 2^>nul') do echo  OK - Node.js %%V detectado.
) else (
    echo  AVISO: Node.js nao encontrado.
    echo  Instalando Node.js automaticamente...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    echo.
    echo  Node.js instalado! Feche e abra este instalador novamente.
    pause
    exit /b 0
)

:: ---------------------------------------------------------
:: PASSO 3: Gerar icone nativo oficial (assets\icon.ico)
:: ---------------------------------------------------------
echo.
echo  [3/5] Gerando icone oficial (assets\icon.ico)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%gerar-icone.ps1"
if errorlevel 1 (
    echo  ERRO: Nao foi possivel gerar o novo icone TurboDown.
    pause
    exit /b 1
)
if exist "%SCRIPT_DIR%assets\icon.ico" (
    echo  OK - Icone nativo pronto!
) else (
    echo  ERRO: O arquivo assets\icon.ico nao foi criado.
    pause
    exit /b 1
)

:: ---------------------------------------------------------
:: PASSO 4: Configurar dependencias do Electron
:: ---------------------------------------------------------
echo.
echo  [4/5] Verificando pacotes do Electron...
call npm.cmd install
if errorlevel 1 (
    echo.
    echo  ERRO: Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
)

if exist "%SCRIPT_DIR%node_modules\electron\install.js" (
    node "%SCRIPT_DIR%node_modules\electron\install.js" >nul 2>&1
)
echo  OK - Dependencias do Electron estao prontas!

:: ---------------------------------------------------------
:: PASSO 5: Gerar o instalador nativo do Windows
:: ---------------------------------------------------------
echo.
echo  [5/5] Gerando o instalador nativo do Windows...
call npm.cmd run build:win
if errorlevel 1 (
    echo.
    echo  Preparando novamente as ferramentas do build e tentando outra vez...
    call :prepare_wincodesign
    if errorlevel 1 goto build_failed
    call npm.cmd run build:win
    if errorlevel 1 goto build_failed
)

set "INSTALLER_PATH="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$installer = Get-ChildItem -LiteralPath '%SCRIPT_DIR%dist' -Filter '*Setup*.exe' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if ($installer) { $installer.FullName }"`) do set "INSTALLER_PATH=%%I"

if not defined INSTALLER_PATH (
    echo.
    echo  ERRO: O instalador Setup nao foi encontrado na pasta dist.
    pause
    exit /b 1
)

echo.
echo  Abrindo o instalador do TurboDown...
start /wait "" "%INSTALLER_PATH%"
echo.
echo  Instalador finalizado. O TurboDown pode ser aberto pelo atalho criado
echo  na Area de Trabalho ou no menu Iniciar.
exit /b 0

:prepare_wincodesign
set "SEVENZIP=%SCRIPT_DIR%node_modules\7zip-bin\win\x64\7za.exe"
set "WCS_CACHE=%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"

if not exist "%SEVENZIP%" exit /b 1
if not exist "%WCS_CACHE%" exit /b 1
if exist "%WCS_CACHE%\winCodeSign-2.6.0" exit /b 0

for %%F in ("%WCS_CACHE%\*.7z") do (
    if exist "%%~fF" (
        "%SEVENZIP%" x -y -xr!*darwin* "%%~fF" -o"%WCS_CACHE%\winCodeSign-2.6.0" >nul 2>&1
        if not errorlevel 1 exit /b 0
    )
)

exit /b 1

:build_failed
echo.
echo  ERRO: Nao foi possivel gerar o instalador do TurboDown.
echo  Verifique as permissoes e tente executar instalar.bat novamente.
pause
exit /b 1
