# Script PowerShell para gravar testes em MP4
# Requisitos: Windows 10/11 com gravador de tela

Write-Host "🎬 PREPARANDO PARA GRAVAR OS TESTES..." -ForegroundColor Green

$outputDir = "e:\Projetos\Pontinho\pontinho\test-videos"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = "$outputDir\pontinho_test_$timestamp.mp4"

Write-Host "📹 Arquivo de saída: $outputFile`n" -ForegroundColor Cyan

# Usar a ferramenta nativa de captura do Windows (DXGI Desktop Duplication)
# Alternativa: usar ffmpeg se disponível

# Tentar com ffmpeg primeiro
try {
    $ffmpegExists = (Get-Command ffmpeg -ErrorAction SilentlyContinue) -ne $null
    if ($ffmpegExists) {
        Write-Host "✅ FFmpeg encontrado!" -ForegroundColor Green
        Write-Host "`n⏱️  Iniciando testes em 3 segundos... pressione Ctrl+C no terminal ffmpeg para parar a gravação`n" -ForegroundColor Yellow
        
        # Inicia FFmpeg em background para gravar a tela
        $ffmpegProcess = Start-Process -FilePath "ffmpeg" -ArgumentList `
            "-f gdigrab -framerate 30 -i desktop -c:v libx264 -crf 23 -preset veryfast `"$outputFile`"" `
            -WindowStyle Minimized -PassThru
        
        Start-Sleep -Seconds 3
        
        # Executa os testes
        Write-Host "🎮 Executando testes...[veja o vídeo para acompanhar]`n" -ForegroundColor Cyan
        cd e:\Projetos\Pontinho\pontinho
        & node test-automation.js
        
        Write-Host "`n✅ Testes completados! Parando a gravação...`n" -ForegroundColor Green
        Start-Sleep -Seconds 2
        
        # Para o FFmpeg (ctrl+c)
        Stop-Process -InputObject $ffmpegProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        if (Test-Path $outputFile) {
            $fileSize = (Get-Item $outputFile).Length / 1MB
            Write-Host "📹 Vídeo gravado com sucesso!" -ForegroundColor Green
            Write-Host "   Arquivo: $outputFile" -ForegroundColor Cyan
            Write-Host "   Tamanho: $([math]::Round($fileSize, 2)) MB`n" -ForegroundColor Cyan
        }
    }
    else {
        throw "FFmpeg não encontrado"
    }
}
catch {
    Write-Host "⚠️  FFmpeg não está instalado. Vou tentar usar o Windows Game Bar..." -ForegroundColor Yellow
    Write-Host "`n📌 Instruções:" -ForegroundColor Cyan
    Write-Host "   1. Pressione WIN + G para abrir o Game Bar" -ForegroundColor White
    Write-Host "   2. Clique em 'Iniciar gravação' (ou WIN + Alt + R)" -ForegroundColor White
    Write-Host "   3. Espere alguns segundos" -ForegroundColor White
    Write-Host "   4. Execute o script: cd e:\Projetos\Pontinho\pontinho && node test-automation.js" -ForegroundColor White
    Write-Host "   5. Quando terminar, pressione WIN + Alt + R para parar a gravação" -ForegroundColor White
    Write-Host "`nVídeos do Game Bar são salvos em: C:\Users\[USERNAME]\Videos\Captures`n" -ForegroundColor Yellow
}
