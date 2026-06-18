# Guia Técnico — Pontinho Master

> Documentação para desenvolvedores. Cobre configuração local, deploy e arquitetura do código.

---

## Requisitos

- **Node.js** 18+
- **npm** 9+
- **Git**
- Navegador moderno (Chrome 120+, Firefox 121+, Safari 17+)

---

## Instalação

```bash
git clone https://github.com/thiago-tap/pontinho.git
cd pontinho
npm install
```

---

## Desenvolvimento local

```bash
npm run dev
# Acesse http://localhost:3000
```

O servidor usa `http-server` com cache desativado (`-c-1`) para facilitar o desenvolvimento.

---

## Estrutura do projeto

```
pontinho/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Deploy automático no GitHub Pages
├── public/                   # Tudo que é servido em produção
│   ├── index.html            # Página principal (SPA)
│   ├── app.js                # Toda a lógica do jogo (~1600 linhas)
│   ├── styles.css            # Estilos customizados (complementa Tailwind)
│   ├── favicon.svg           # Ícone do app
│   ├── manifest.json         # PWA manifest (offline, add to homescreen)
│   ├── sw.js                 # Service Worker (cache offline)
│   └── CNAME                 # Domínio customizado: pontinho.catiteo.com
├── tests/                    # Scripts de teste com Puppeteer
│   ├── test-automation.js    # Teste E2E móvel
│   ├── test-all-features.js  # Cobertura completa
│   ├── test-mobile.js        # iPhone 12 (390x844)
│   ├── test-galaxy-s23.js    # Galaxy S23 (360x800)
│   └── test-regras-negocio.js # Regras de negócio
├── scripts/                  # Utilitários de gravação de vídeo/GIF
│   ├── record-video.js
│   ├── convert-to-gif.js
│   └── create-mp4.js
├── package.json
└── README.md
```

---

## Deploy

O deploy é feito **automaticamente** via GitHub Actions a cada push para `main`.

O arquivo `.github/workflows/deploy.yml` faz:
1. Checkout do código
2. Empacota a pasta `public/` como artefato
3. Publica no GitHub Pages

**Configuração necessária (uma vez):**
1. No GitHub: Settings → Pages → Source → **GitHub Actions**
2. Aguardar o primeiro deploy (~1 min)
3. Site disponível em `https://pontinho.catiteo.com`

Para deploy manual:
```bash
# Qualquer push para main dispara o deploy automaticamente
git push origin main
```

---

## Testes

```bash
npm run test:full      # Desktop 1280×720
npm run test:mobile    # iPhone 12 (390×844)
npm run test:galaxy    # Galaxy S23 (360×800)
npm run test:rules     # Regras de negócio
```

Requer Chrome instalado. Os testes usam Puppeteer com `headless: false` por padrão.

---

## Arquitetura do código

### `public/app.js` — Módulo IIFE

Toda a lógica está em um único IIFE (`const App = (() => { ... })()`).

**Seções internas:**

| Seção | Função |
|---|---|
| Estado | `players`, `config`, `roundHistory`, `currentRound`, `undoStack`, ... |
| Utilitários | `escapeHtml()`, `showToast()`, `showConfirm()` |
| Persistência | `saveState()`, `loadState()`, `clearState()` |
| Undo | `takeSnapshot()`, `undo()` — pilha de até 10 snapshots |
| Navegação | `startAmistoso()`, `startApostado()`, `newGame()`, `restartPartida()` |
| Lógica core | `processRound()`, `checkEstouros()`, `advanceDealer()` |
| Drag & Drop | `setupDragAndDrop()`, `reorderPlayer()` |
| Renderização | `renderGame()` — reconstrói o DOM a cada mudança de estado |
| Event Listeners | `init()` — registra todos os handlers |

### Schema do `localStorage`

Chave: `pontinho-state`

```json
{
  "players": [
    {
      "id": 1,
      "name": "JOÃO",
      "score": 99,
      "debt": 10.00,
      "hasPaid": false,
      "eliminated": false,
      "roundsWon": 0,
      "biggestLoss": 0
    }
  ],
  "config": {
    "entry": 10.00,
    "rebuy": 5.00
  },
  "roundHistory": [
    {
      "round": 1,
      "scores": { "1": 15, "2": 0 },
      "playerNames": { "1": "JOÃO", "2": "MARIA" }
    }
  ],
  "currentRound": 1,
  "nextId": 3,
  "gameStarted": true,
  "originalOrder": [1, 2],
  "dealerIndex": 0,
  "undoStack": []
}
```

### Regras de negócio principais

- Todos começam com **99 pontos**
- Quem "bate" (vence a rodada) recebe **0 pontos perdidos**
- Score < 0 → **estouro** → oferta de reentrada (se ≥ 2 ativos)
- Reentrada → score recebe a **menor pontuação positiva** da mesa
- Entrada tardia → mesma regra da reentrada
- Jogo termina quando restar **1 jogador ativo**
- Dealer avança pela ordem original, pulando eliminados

---

## Debugging

```javascript
// No console do navegador (F12):

// Ver estado atual
JSON.parse(localStorage.getItem('pontinho-state'))

// Limpar estado salvo
localStorage.clear(); location.reload();
```

---

## Checklist pré-deploy

- [ ] `node --check public/app.js` sem erros
- [ ] Sem `console.log` esquecidos
- [ ] Testado em mobile (Chrome DevTools device toolbar)
- [ ] LocalStorage funcionando após refresh
- [ ] Fluxo completo testado: apostado + amistoso

---

*Última atualização: junho 2026 · v1.1.0*
