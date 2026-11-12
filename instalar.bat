@echo off
setlocal EnableDelayedExpansion
title YouTube Desktop - Instalador
color 0A

echo.
echo  =========================================================
echo   YouTube Desktop - Instalador Oficial
echo  =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo  Pasta do projeto: %SCRIPT_DIR%
echo.

:: ---------------------------------------------------------
:: PASSO 1: Verificar Node.js
:: ---------------------------------------------------------
echo  [1/4] Verificando Node.js...
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
:: PASSO 2: Gerar icone nativo oficial (assets\icon.ico)
:: ---------------------------------------------------------
echo.
echo  [2/4] Gerando icone oficial (assets\icon.ico)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%gerar-icone.ps1"
if exist "%SCRIPT_DIR%assets\icon.ico" (
    echo  OK - Icone nativo pronto!
) else (
    echo  AVISO: Icone nao gerado, continuando...
)

:: ---------------------------------------------------------
:: PASSO 3: Configurar dependencias do Electron
:: ---------------------------------------------------------
echo.
echo  [3/4] Verificando pacotes do Electron...
call npm.cmd install

if exist "%SCRIPT_DIR%node_modules\electron\install.js" (
    node "%SCRIPT_DIR%node_modules\electron\install.js" >nul 2>&1
)
echo  OK - Dependencias do Electron estao prontas!

:: ---------------------------------------------------------
:: PASSO 4: Criar atalho na Area de Trabalho
:: ---------------------------------------------------------
echo.
echo  [4/4] Criando atalho na Area de Trabalho...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%criar-atalho.ps1"

echo.
echo  =========================================================
echo   INSTALACAO BASE CONCLUIDA COM SUCESSO!
echo  =========================================================
echo.
echo  O que voce deseja fazer agora?
echo.
echo   [1] Abrir o YouTube Desktop agora (Rapido e Direto)
echo   [2] Gerar o Executavel (.exe) do Windows
echo   [3] Sair
echo.
set /p OPCAO="  Escolha uma opcao (1, 2 ou 3): "

if "%OPCAO%"=="1" (
    echo.
    echo  Iniciando YouTube Desktop...
    start "" "%SCRIPT_DIR%iniciar.bat"
    exit /b 0
)

if "%OPCAO%"=="2" (
    echo.
    call "%SCRIPT_DIR%construir.bat"
    exit /b 0
)

echo.
echo  Pronto! Voce pode abrir o app a qualquer momento pelo atalho
echo  na Area de Trabalho ou pelo arquivo iniciar.bat.
echo.
pause
