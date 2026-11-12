@echo off
title YouTube Desktop - Gerador de Icone
color 0E

echo.
echo  =========================================================
echo   Gerando assets\icon.ico nativo (.NET oficial)
echo  =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%gerar-icone.ps1"

if exist "%SCRIPT_DIR%assets\icon.ico" (
    echo  OK - Icone criado com sucesso em assets\icon.ico!
) else (
    echo  ERRO ao gerar icone.
)

echo.
pause
