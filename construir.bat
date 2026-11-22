@echo off
setlocal EnableDelayedExpansion
title TurboDown - Gerador de Executavel (.EXE)
color 0B

echo.
echo  =========================================================
echo   TurboDown - Gerador de Executavel Windows (.exe)
echo  =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 1. Garantir que o icone nativo oficial existe
echo  [1/3] Verificando e gerando o icone nativo (assets\icon.ico)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%gerar-icone.ps1"

:: 2. Pre-tratar o cache do winCodeSign (evita o erro de symbolic link do 7zip no Windows)
set "SEVENZIP=%SCRIPT_DIR%node_modules\7zip-bin\win\x64\7za.exe"
set "WCS_CACHE=%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"

if exist "%SEVENZIP%" (
    if exist "%WCS_CACHE%" (
        for %%F in ("%WCS_CACHE%\*.7z") do (
            if not exist "%WCS_CACHE%\winCodeSign-2.6.0" (
                echo  Otimizando cache do winCodeSign (removendo links simbolicos do Mac)...
                "%SEVENZIP%" x -y -xr!*darwin* "%%F" -o"%WCS_CACHE%\winCodeSign-2.6.0" >nul 2>&1
            )
        )
    )
)

:: 3. Verificar dependencias
echo.
echo  [2/3] Verificando dependencias...
if exist "%SCRIPT_DIR%node_modules\electron\install.js" (
    node "%SCRIPT_DIR%node_modules\electron\install.js" >nul 2>&1
)
echo  OK - Dependencias prontas!

:: 4. Escolha do formato de build
echo.
echo  [3/3] Escolha o tipo de Executavel:
echo.
echo   [1] Executavel Nativo Direto (Recomendado - sem erros de permissao)
echo       -> Gera pasta em dist\ com "TurboDown.exe" e cria atalho
echo.
echo   [2] Instalador Setup Completo (.exe)
echo       -> Gera instalador NSIS (se der erro de permissao, execute como Admin)
echo.
set /p BTYPE="  Opcao (1 ou 2, padrao = 1): "

if "%BTYPE%"=="" set "BTYPE=1"

echo.
if "%BTYPE%"=="1" (
    echo  Compilando Executavel Nativo...
    echo  (Aguarde a conclusao do empacotamento)
    echo.
    call npm.cmd run build -- --win --dir
) else (
    echo  Compilando Instalador Setup .exe...
    echo  (Aguarde a conclusao do empacotamento)
    echo.
    call npm.cmd run build:win
)

set BUILD_ERR=%errorlevel%

echo.
if %BUILD_ERR% equ 0 (
    echo  =========================================================
    echo   BUILD CONCLUIDO COM SUCESSO!
    echo  =========================================================
    echo.
    
    :: Atualizar o atalho da Area de Trabalho para apontar direto para o novo .exe
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%criar-atalho.ps1"
    
    echo.
    echo  Abrindo a pasta dist\...
    start "" explorer "%SCRIPT_DIR%dist"
) else (
    echo  =========================================================
    echo   ERRO NO BUILD (Codigo: %BUILD_ERR%)
    echo  =========================================================
    echo.
    echo  Dica: Se tentou a opcao 2 (Setup) e deu erro de permissao,
    echo  utilize a opcao 1 (Executavel Nativo Direto) ou clique com
    echo  o botao direito no construir.bat e escolha "Executar como Administrador".
)

echo.
echo  Pressione qualquer tecla para sair...
pause >nul
