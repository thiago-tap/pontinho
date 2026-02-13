# Deploy script for Cloudflare Pages (Windows)

Write-Host "🚀 Deployment para Cloudflare Pages" -ForegroundColor Green
Write-Host ""

# Verificar se Wrangler está instalado
$wrangler = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wrangler) {
    Write-Host "❌ Wrangler não está instalado" -ForegroundColor Red
    Write-Host "Instale com: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Fazendo deploy da pasta 'public/'..." -ForegroundColor Cyan
Write-Host ""

wrangler pages deploy public/

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Seu site está em:" -ForegroundColor Green
    Write-Host "   https://pontinho.pages.dev" -ForegroundColor Cyan
    Write-Host "   ou seu domínio customizado" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erro no deployment" -ForegroundColor Red
    exit 1
}
