@echo off
chcp 65001 >nul
title Atualizar yt-dlp
echo  Atualizando yt-dlp para a versao mais recente...
yt-dlp -U
echo.
echo  Atualizado! Pressione qualquer tecla para fechar.
pause >nul
