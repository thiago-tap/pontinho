#!/bin/bash
# Deploy script for Cloudflare Pages

echo "🚀 Deployment para Cloudflare Pages"
echo ""

# Verificar se Wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler não está instalado"
    echo "Instale com: npm install -g wrangler"
    exit 1
fi

echo "📦 Fazendo deploy da pasta 'public/'..."
wrangler pages deploy public/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy concluído com sucesso!"
    echo ""
    echo "📍 Seu site está em: https://pontinho.pages.dev"
    echo "   ou seu domínio customizado"
else
    echo "❌ Erro no deployment"
    exit 1
fi
