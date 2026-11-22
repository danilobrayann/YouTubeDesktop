@echo off
setlocal EnableDelayedExpansion
title TurboDown - Publicar Versao no GitHub
color 0E

echo.
echo  =========================================================
echo   TurboDown - Publicador de Release (GitHub)
echo  =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: ---------------------------------------------------------
:: PASSO 1: Verificar GitHub token
:: ---------------------------------------------------------
echo  [1/3] Verificando credenciais do GitHub...
if "%GH_TOKEN%"=="" (
    echo  ERRO: Variavel GH_TOKEN nao definida.
    echo.
    echo  Para publicar releases automaticas, defina o token:
    echo    set GH_TOKEN=seu_token_aqui
    echo  e execute este script novamente.
    echo.
    echo  Crie um token em: https://github.com/settings/tokens
    echo  Permissao necessaria: repo (full control of private repositories)
    echo.
    pause
    exit /b 1
)
echo  OK - Token encontrado.

:: ---------------------------------------------------------
:: PASSO 2: Verificar versao e bump se necessario
:: ---------------------------------------------------------
echo.
echo  [2/3] Verificando versao do package.json...
for /f "tokens=2 delims=:," %%V in ('findstr /C:"\"version\"" package.json') do (
    set "CURRENT_VERSION=%%V"
)
set "CURRENT_VERSION=!CURRENT_VERSION: =!"
set "CURRENT_VERSION=!CURRENT_VERSION:"=!"
echo  Versao atual: !CURRENT_VERSION!
echo.
set /p BUMP="  Deseja aumentar a versao? (s/N): "
if /i "%BUMP%"=="s" (
    echo.
    echo  Opcoes: patch (1.3.0 -> 1.3.1), minor (1.3.0 -> 1.4.0), major (1.3.0 -> 2.0.0)
    set /p BTYPE="  Tipo (patch/minor/major, padrao=patch): "
    if "%BTYPE%"=="" set "BTYPE=patch"
    echo.
    echo  Executando npm version !BTYPE!...
    call npm.cmd version !BTYPE!
    if errorlevel 1 (
        echo  ERRO ao atualizar versao.
        pause
        exit /b 1
    )
    for /f "tokens=2 delims=:," %%V in ('findstr /C:"\"version\"" package.json') do (
        set "CURRENT_VERSION=%%V"
    )
    set "CURRENT_VERSION=!CURRENT_VERSION: =!"
    set "CURRENT_VERSION=!CURRENT_VERSION:"=!"
    echo  Nova versao: !CURRENT_VERSION!
    echo  Fazendo commit e push da versao...
    git add package.json package-lock.json
    git commit -m "chore: bump version to !CURRENT_VERSION!"
    git push origin main
    if errorlevel 1 (
        echo  AVISO: Nao foi possivel fazer push. Faca manualmente.
    )
) else (
    echo  Usando versao atual: !CURRENT_VERSION!
)

:: ---------------------------------------------------------
:: PASSO 3: Build e publicar no GitHub
:: ---------------------------------------------------------
echo.
echo  [3/3] Compilando e publicando no GitHub...
echo  (Isso pode demorar varios minutos)
echo.
call npm.cmd run publish:win
if errorlevel 1 (
    echo.
    echo  =========================================================
    echo   ERRO NA PUBLICACAO
    echo  =========================================================
    echo  Verifique se o GH_TOKEN esta correto e tem permissao repo.
    pause
    exit /b 1
)

echo.
echo  =========================================================
echo   RELEASE PUBLICADA COM SUCESSO!
echo  =========================================================
echo.
echo  Versao: !CURRENT_VERSION!
echo  URL: https://github.com/danilobrayann/YouTubeDesktop/releases
echo.
echo  Os usuarios receberao a atualizacao automaticamente
echo  na proxima vez que abrirem o TurboDown.
echo.
pause
