# 🛠️ Guia Técnico - Pontinho Master

> **Documentação para desenvolvedores e usuários técnicos**

Este guia cobre tudo que você precisa para clonar, configurar e executar o projeto Pontinho Master localmente.

---

## 📋 Requisitos do Sistema

### Mínimo Necessário

- **Node.js** 16+ ou superior
- **npm** 7+ ou **yarn**
- **Git** (para clonar o repositório)
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Recomendado

- **Node.js** 18+ (suporte melhor a async/await)
- **VS Code** (editor recomendado)
- **Git Bash** (Windows) ou terminal Unix (Mac/Linux)
- 500 MB de espaço livre em disco

### Versões Testadas

```
Node.js: v18.17.0 a v20.10.0
npm: 9.0.0 a 10.2.0
Chrome: 120+
Firefox: 121+
Safari: 17+
```

---

## ⬇️ Instalação Local

### 1. Clonar o Repositório

```bash
# HTTPS (mais seguro com SSH)
git clone https://github.com/thiago-tap/pontinho.git

# Ou via SSH (se tiver chave SSH configurada)
git clone git@github.com:thiago-tap/pontinho.git

# Entrar no diretório
cd pontinho
```

### 2. Instalar Dependências

```bash
# Usar npm
npm install

# Ou usar yarn (mais rápido)
yarn install

# Ou usar pnpm (alternativa moderna)
pnpm install
```

**Tempo estimado:** 2-5 minutos dependendo da conexão

**Saída esperada:**

```
added 187 packages in 2m 30s
```

### 3. Estrutura de Pastas

```
pontinho/
├── public/
│   ├── index.html       # Página principal
│   ├── app.js          # Lógica principal do jogo (1200+ linhas)
│   ├── styles.css      # Estilos customizados
│   └── (assets)        # Imagens, ícones
├── .gitignore          # Arquivos ignorados no Git
├── package.json        # Dependências e scripts
├── wrangler.toml       # Config Cloudflare Pages
├── README.md           # Documentação sobre o jogo
└── DEVELOPMENT.md      # Este arquivo
```

---

## 🚀 Executar o Projeto

### Opção 1: Servidor HTTP Simples (Node.js)

```bash
# Iniciar servidor na porta 8000
npx http-server public/ -p 8000

# Acessar em: http://localhost:8000
```

### Opção 2: Python Server

```bash
# Python 3
python -m http.server 8000 --directory public/

# Python 2 (legado)
python -m SimpleHTTPServer 8000 --cwd public/
```

### Opção 3: PHP Server

```bash
# Requer PHP instalado
php -S localhost:8000 -t public/
```

### Opção 4: Live Server (VS Code)

1. Instale extensão "Live Server" no VS Code
2. Clique direito em `public/index.html`
3. Selecione "Open with Live Server"
4. Navegador abre automaticamente com hot reload

---

## 🧪 Executar Testes

### Teste Completo (Desktop 1280x720)

```bash
npm run test:full
```

Isso irá:

- ✅ Abrir navegador Chrome em viewport desktop
- ✅ Passar por todas as funcionalidades
- ✅ Capturar 81 frames
- ✅ Gerar vídeo MP4 (3-5 minutos)

### Teste Mobile (iPhone 12)

```bash
npm run test:mobile
```

Viewport: **390x844px** (2x device scale factor)

### Teste Galaxy S23

```bash
npm run test:galaxy
```

Viewport: **360x800px** (4x device scale factor)

### Teste Específico (Seu Próprio Script)

```bash
node test-automation.js    # Teste automático básico
node test-all-features.js  # Teste sem vídeo
```

---

## 📦 Dependências e Seu Papel

### Dependências de Desenvolvimento

| Pacote            | Versão   | Propósito                           |
| ----------------- | -------- | ----------------------------------- |
| **puppeteer**     | ^24.37.3 | Automação do navegador para testes  |
| **ffmpeg-static** | ^5.3.0   | Conversão de frames para vídeo MP4  |
| **gif-encoder**   | ^0.7.2   | Criação de GIFs animados            |
| **sharp**         | ^0.34.5  | Processamento/otimização de imagens |

### Dependências de Produção

**Nenhuma!** O projeto é 100% HTML/CSS/JavaScript vanilla.

---

## 🏗️ Estrutura do Código

### Arquivo Principal: `app.js` (1208 linhas)

```javascript
// Divisão lógica do código:

// 1. INICIALIZAÇÃO (linhas 1-100)
// - DOMContentLoaded
// - Carrega dados do localStorage
// - Inicializa estado do jogo

// 2. GERENCIAMENTO DE JOGADORES (linhas 101-300)
// - addPlayer()
// - removePlayer()
// - updatePlayerUI()
// - calculateLowestScore()

// 3. LÓGICA DE RODADAS (linhas 301-600)
// - processRound()
// - checkEstouros() ⭐ CRÍTICO
// - showConfirm()
// - handleReentrada()

// 4. SISTEMA DE UNDO (linhas 601-700)
// - takeSnapshot()
// - undo()

// 5. INTERFACE E EVENTOS (linhas 701-1208)
// - Event listeners
// - Modal management
// - UI updates
// - LocalStorage persistence
```

### Função Crítica: `checkEstouros()`

```javascript
// Verifica quando um jogador estoura (score < 0)
// Oferece opção de reentrada
// Elimina ou restaura o jogador

async function checkEstouros() {
  for (const player of players) {
    if (player.score < 0 && !player.eliminated) {
      // Lógica de estouro
      const shouldReenter = await showConfirm(...);

      if (shouldReenter) {
        // Pagar volta
        player.score = lowestScore;
        money.pote += money.rebuyFee;
      } else {
        // Eliminar
        player.eliminated = true;
      }
    }
  }
}
```

---

## 🔧 Stack Tecnológico Detalhado

### Frontend

```yaml
HTML5:
  - Semântica correta <header>, <main>, <section>
  - Accessibility attributes (aria-labels, role)
  - Mobile viewport meta tags

CSS3:
  - Tailwind CSS (framework)
  - Custom properties (--primary, --secondary)
  - Flexbox e Grid layouts
  - Animações e transições
  - Media queries para responsividade

JavaScript ES6+:
  - Async/await
  - Arrow functions
  - Template literals
  - Classes (modal, player)
  - Event delegation
  - Array methods (map, filter, reduce)
```

### Armazenamento

```javascript
// LocalStorage Schema
{
  gameState: {
    mode: 'apostado|amistoso',
    players: [
      { id, name, score, eliminated, paid }
    ],
    currentRound: number,
    roundHistory: [
      { date, points: {playerId: score} }
    ]
  },
  money: {
    entryFee: number,
    rebuyFee: number,
    pote: number
  }
}
```

### Deploy

```yaml
Cloudflare Pages:
  - Build: Static site (sem build step)
  - Output: /public
  - Preview URL: pontinho.pages.dev
  - Custom domain: pontinho.catiteo.com
  - Features:
      - Caching automático
      - CDN global
      - HTTPS obrigatório
      - Auto deploy via GitHub
```

---

## 🐛 Debugging

### Ativar Debug Console

No arquivo `app.js`, procure por `console.log` ou descomente:

```javascript
// Adicione no topo do app.js
const DEBUG = true;

if (DEBUG) {
  console.log("Game State:", gameState);
  console.log("Players:", players);
  console.log("Money:", money);
}
```

### Chrome DevTools

```
1. Abra: F12 ou Ctrl+Shift+I
2. Abas úteis:
   - Console: Ver logs e erros
   - Application > LocalStorage: Ver dados salvos
   - Network: Ver requisições
   - Elements: Inspecionar HTML/CSS
```

### Inspecionar LocalStorage

```javascript
// No console do navegador:
localStorage.getItem("pontinho-game");
JSON.parse(localStorage.getItem("pontinho-game"));

// Limpar dados:
localStorage.clear();
```

---

## 📝 Desenvolvimento

### Padrão de Commits

```bash
# Features
git commit -m "feat: adicionar modo amistoso"

# Bug fixes
git commit -m "fix: corrigir cálculo de estouro"

# Refactor
git commit -m "refactor: melhorar checkEstouros()"

# Docs
git commit -m "docs: atualizar README"

# Testes
git commit -m "test: adicionar teste mobile"
```

### Regras de Código

1. **Nomes em PT-BR** para variáveis do jogo
2. **Nomes em EN** para variáveis técnicas
3. **Função = 1 responsabilidade**
4. **Máximo 100 linhas por função**
5. **Comentários para lógica complexa**

---

## 🚢 Fazer Deploy

### Deploy Automático (Recomendado)

```bash
# 1. Commit suas mudanças
git add .
git commit -m "feat: nova funcionalidade"

# 2. Push para main
git push origin main

# 3. Cloudflare faz deploy automaticamente
# Verá em: https://dashboard.cloudflare.com
```

**Tempo:** ~2-3 minutos

### Deploy Manual via CLI

```bash
# 1. Instalar Wrangler (global ou local)
npm install -g @cloudflare/wrangler

# 2. Login
wrangler login

# 3. Deploy
npm run deploy
# ou
wrangler pages deploy public/
```

---

## 🔒 Segurança e Performance

### Segurança

- ✅ HTTPS forçado (Cloudflare)
- ✅ Nenhum envio de dados para servidor
- ✅ Dados apenas no LocalStorage (local)
- ✅ Sem cookies de rastreamento
- ✅ Privacy-first

### Performance

```
Metrics (Lighthouse):
- Performance: 95+
- Accessibility: 90+
- Best Practices: 85+
- SEO: 90+

Size:
- HTML: ~50 KB
- CSS (Tailwind): ~150 KB (minified)
- JS: ~45 KB (app.js)
- Total gzipped: ~60 KB
```

### Otimizações

- ✅ CSS inline (Tailwind via CDN)
- ✅ JavaScript minificado em produção
- ✅ Lazy loading de imagens
- ✅ Caching via Cloudflare

---

## 📞 Troubleshooting

### Problema: "Cannot find module..."

```bash
# Solução: Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Problema: Porta 8000 já em uso

```bash
# Usar outra porta
npx http-server public/ -p 8080

# Ou matar processo na porta 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :8000
kill -9 <PID>
```

### Problema: LocalStorage vazio

```bash
# Dados não estão sendo salvos?
1. Verificar se o navegador permite LocalStorage
2. Não está em modo incógnito (desabilita LocalStorage)
3. Verificar console por erros (F12)
```

### Problema: Testes travando

```bash
# Aumentar timeout
# No arquivo test-*.js, altere:
const TIMEOUT = 300000; // 5 minutos

# Ou rode com debug
DEBUG=true node test-automation.js
```

---

## 📚 Recursos Adicionais

### Documentação Externa

- [MDN - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [JavaScript.info](https://javascript.info/)

### Ferramentas Recomendadas

- **Editor:** VS Code + extensões (HTML, CSS, JavaScript)
- **Testing:** Puppeteer (já incluído)
- **Performance:** Lighthouse (Chrome DevTools)
- **Version Control:** GitHub Desktop ou Sourcetree

### Comunidade

- GitHub Issues: Reporte bugs
- Discussões: Sugira features
- Forks/PRs: Contribuições bem-vindas

---

## 📋 Checklist pré-Deploy

Antes de fazer push para produção:

- [ ] Testes locais passando (`npm run test:mobile`)
- [ ] Sem console errors (F12 → Console)
- [ ] LocalStorage funcionando
- [ ] Responsividade OK em 3 devices
- [ ] Offline mode funcionando
- [ ] `.gitignore` atualizado
- [ ] Commits com mensagens claras

---

## 🎯 Próximos Passos

### Para Começar Agora

1. Clone o repositório
2. Rode `npm install`
3. Inicie servidor: `npx http-server public/ -p 8000`
4. Abra `http://localhost:8000`
5. Teste a aplicação

### Para Contribuir

1. Crie uma branch: `git checkout -b feature/nova-feature`
2. Faça seu desenvolvimento
3. Teste tudo: `npm run test:full`
4. Commit e push
5. Abra um Pull Request

### Para Personalizar

1. Edite cores em `styles.css`
2. Mude valores no `app.js`
3. Customize regras
4. Deploy automático!

---

## 💡 Tips & Tricks

```javascript
// Resetar tudo no console (F12)
localStorage.clear();
location.reload();

// Ver dados salvos
console.log(JSON.parse(localStorage.getItem('pontinho-game')))

// Forçar modo escuro (se implementado)
document.documentElement.classList.add('dark')

// Testar responsividade (Chrome)
Ctrl+Shift+M (Toggle device toolbar)
```

---

## 📞 Suporte Técnico

- 📧 Issues: [GitHub](https://github.com/thiago-tap/pontinho/issues)
- 💬 Discussões: [GitHub Discussions](https://github.com/thiago-tap/pontinho/discussions)
- 🐦 Twitter: [@seu_usuario]

---

**Última atualização:** Fevereiro 2024
**Versão:** 1.0.0
**Mantido por:** [@thiago-tap](https://github.com/thiago-tap)
