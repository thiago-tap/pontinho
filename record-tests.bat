@echo off
REM Script para gravar testes do Pontinho em MP4
REM Requisitos: FFmpeg (será instalado automaticamente)

setlocal enabledelayedexpansion
cd /d "e:\Projetos\Pontinho\pontinho"

echo.
echo ================================================================
echo   GRAVADOR DE TESTES - PONTINHO MASTER
echo ================================================================
echo.

REM Verificar se FFmpeg está instalado
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [*] FFmpeg não encontrado. Instalando...
    powershell -Command "choco install ffmpeg -y" >nul 2>&1
    if errorlevel 1 (
        echo [X] Erro ao instalar FFmpeg via Chocolatey
        echo [!] Instale manualmente: choco install ffmpeg -y
        pause
        exit /b 1
    )
    echo [+] FFmpeg instalado com sucesso
)

REM Criar diretório para vídeos
if not exist "test-videos" mkdir test-videos

REM Definir nome do arquivo com timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set outputfile=test-videos\pontinho_test_%mydate%_%mytime%.mp4

echo [+] Arquivo de saída: %outputfile%
echo.
echo [*] Iniciando gravação em 5 segundos...
echo [!] Para parar a gravação, feche o terminal do FFmpeg quando os testes terminarem
echo.

timeout /t 5 /nobreak

REM Iniciar gravação com FFmpeg em uma nova janela
start "FFmpeg Recorder" cmd /c ffmpeg -f gdigrab -framerate 30 -i desktop -c:v libx264 -crf 23 -preset veryfast "%outputfile%"

echo [+] Gravação iniciada!
echo [*] Aguardando 3 segundos para estabilizar...
timeout /t 3 /nobreak

REM Executar os testes
echo.
echo [*] Executando testes... (acompanhe na gravação)
echo.

node test-automation.js

echo.
echo [+] Testes completados!
echo [*] Feche a janela do FFmpeg para finalizar a gravação (pode levar alguns segundos)
echo [!] Pressione qualquer tecla quando o FFmpeg fechar...

pause

REM Verificar se o vídeo foi criado
if exist "%outputfile%" (
    for /f %%A in ('dir /b /s "%outputfile%"') do (
        set filesize=%%~zA
    )
    set /a filesizeMB=!filesize! / 1048576
    
    echo.
    echo ================================================================
    echo   SUCESSO!
    echo ================================================================
    echo [+] Vídeo gravado com sucesso!
    echo [+] Arquivo: %outputfile%
    echo [+] Tamanho: !filesizeMB! MB
    echo.
    echo [*] Abrindo o explorador de arquivos...
    explorer /select,"%outputfile%"
) else (
    echo [X] Aviso: Arquivo de vídeo não encontrado
    echo [!] Verifique se a gravação foi iniciada corretamente
)

echo [*] Pressione qualquer tecla para finalizar...
pause >nul
