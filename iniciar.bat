@echo off
chcp 65001 >nul 2>&1
title TurboDown
cd /d "%~dp0"

if not exist "%~dp0node_modules" (
    echo.
    echo  Dependencias ainda nao instaladas!
    echo  Execute o arquivo "instalar.bat" primeiro.
    echo.
    pause
    exit /b 1
)

echo  Iniciando TurboDown...
call npm.cmd start

if %errorlevel% neq 0 (
    echo.
    echo  O aplicativo fechou com codigo: %errorlevel%
    pause
)
