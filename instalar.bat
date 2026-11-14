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
:: PASSO 5: Criar atalho na Area de Trabalho
:: ---------------------------------------------------------
echo.
echo  [5/5] Criando atalho na Area de Trabalho...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%criar-atalho.ps1" -PreferSource

echo.
echo  =========================================================
echo   INSTALACAO BASE CONCLUIDA COM SUCESSO!
echo  =========================================================
echo.
echo  O que voce deseja fazer agora?
echo.
echo   [1] Abrir o TurboDown agora (Rapido e Direto)
echo   [2] Gerar o Executavel (.exe) do Windows
echo   [3] Sair
echo.
set /p OPCAO="  Escolha uma opcao (1, 2 ou 3): "

if "%OPCAO%"=="1" (
    echo.
    echo  Iniciando TurboDown...
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
