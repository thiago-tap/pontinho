#!/usr/bin/env pwsh

Write-Host "
==================================================================
    GRAVADOR DE TESTES - PONTINHO MASTER
==================================================================" -ForegroundColor Cyan

$scriptDir = "e:\Projetos\Pontinho\pontinho"
$videoDir = Join-Path $scriptDir "test-videos"

# Criar diretório
if (-not (Test-Path $videoDir)) {
    Write-Host "[+] Criando diretório: $videoDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $videoDir -Force | Out-Null
}

# Verificar FFmpeg
Write-Host "[*] Verificando FFmpeg..." -ForegroundColor Cyan
$ffmpegPath = & where.exe ffmpeg 2>$null
if ($ffmpegPath) {
    Write-Host "[+] FFmpeg encontrado: $ffmpegPath" -ForegroundColor Green
} else {
    Write-Host "[!] FFmpeg não encontrado. Tentando instalar..." -ForegroundColor Yellow
    try {
        & choco install ffmpeg -y *>$null
        $ffmpegPath = & where.exe ffmpeg 2>$null
        Write-Host "[+] FFmpeg instalado com sucesso" -ForegroundColor Green
    } catch {
        Write-Host "[X] Erro ao instalar FFmpeg" -ForegroundColor Red
        exit 1
    }
}

# Definir arquivo de saída
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $videoDir "pontinho_test_$timestamp.mp4"

Write-Host "[+] Arquivo de saída: $outputFile" -ForegroundColor Cyan
Write-Host "[*] Iniciando gravação em 5 segundos..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 5

# Iniciar FFmpeg
Write-Host "[*] Iniciando FFmpeg..." -ForegroundColor Cyan

$ffmpegCmd = @(
    "-f gdigrab",
    "-framerate 30",
    "-i desktop",
    "-c:v libx264",
    "-crf 23",
    "-preset veryfast",
    "-y",
    "`"$outputFile`""
)

$ffmpegProcess = Start-Process -FilePath "ffmpeg" `
    -ArgumentList ($ffmpegCmd -join " ") `
    -NoNewWindow -PassThru

Write-Host "[+] FFmpeg iniciado (PID: $($ffmpegProcess.Id))" -ForegroundColor Green
Start-Sleep -Seconds 3

# Executar testes  
Write-Host "[*] Executando testes..." -ForegroundColor Cyan
Write-Host ""

Push-Location $scriptDir

& node test-automation.js

Pop-Location

Write-Host ""
Write-Host "[+] Testes completados!" -ForegroundColor Green
Write-Host "[*] Finalizando gravação..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

# Parar FFmpeg
Get-Process ffmpeg -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "[+] FFmpeg finalizado" -ForegroundColor Green
Start-Sleep -Seconds 5

# Verificar resultado
Write-Host ""
if (Test-Path $outputFile) {
    $fileInfo = Get-Item $outputFile
    $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host "
==================================================================
    ✅ SUCESSO!
==================================================================" -ForegroundColor Green
    Write-Host "[+] Vídeo gravado com sucesso!" -ForegroundColor Green
    Write-Host "[+] Arquivo: $outputFile" -ForegroundColor Cyan
    Write-Host "[+] Tamanho: $fileSizeMB MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[*] Abrindo explorador de arquivos..." -ForegroundColor Yellow
    
    & explorer /select,$outputFile
} else {
    Write-Host "[X] Erro: Arquivo não encontrado" -ForegroundColor Red
}

Write-Host ""
