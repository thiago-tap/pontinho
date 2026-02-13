# Pontinho - Cloudflare Pages Configuration

## 🚀 Deploy no Cloudflare Pages

Como o Pontinho é um site estático (HTML/CSS/JavaScript), o deploy é muito simples:

### 1. **Via CLI do Wrangler**

```bash
# Instalar Wrangler (se não tiver)
npm install -g wrangler

# Login no Cloudflare
wrangler login

# Deploy a pasta public/
wrangler pages deploy public/
```

### 2. **Via Git Integration (Recomendado)**

No dashboard do Cloudflare Pages:

```
1. Go to Pages → Create a project
2. Connect your GitHub
3. Select the repository: thiago-tap/pontinho
4. Configure:
   - Framework: None (static)
   - Build command: (leave empty)
   - Build output directory: public
5. Save and Deploy
```

### 3. **Arquivo de Configuração (wrangler.toml)**

Se quiser usar `wrangler pages deploy` com configuração:

```toml
name = "pontinho"
type = "javascript"

[build]
command = ""
cwd = "./"
watch_paths = ["public/**/*"]

[env.production]
name = "pontinho"
```

Salve como `wrangler.toml` na raiz do projeto.

### 4. **Deploy Command Automático**

```bash
# Deploy apenas a pasta public/
wrangler pages deploy public/

# Com arquivo de configuração
wrangler pages publish public/
```

## 📋 .gitignore já criado!

O arquivo `.gitignore` foi gerado com:

- ✅ `node_modules/` - Dependências npm
- ✅ `package-lock.json` - Lock file
- ✅ `.env` - Variáveis de ambiente
- ✅ `videos/` e `test-videos/` - Testes
- ✅ `*.mp4` e `*.gif` - Mídia de testes
- ✅ Arquivos de OS (Mac, Windows)
- ✅ IDE files (VSCode, IntelliJ)
- ✅ Cloudflare files

## 📝 Passos para GitHub

```bash
# 1. Adicionar ao git
git add .gitignore
git commit -m "chore: add .gitignore for Cloudflare Pages deployment"

# 2. Push
git push origin main

# 3. Depois no Cloudflare Pages Dashboard
# Conectar o repositório GitHub e fazer auto-deploy
```

## ⚙️ Build Settings no Cloudflare Pages

| Setting                | Value         |
| ---------------------- | ------------- |
| Framework              | None          |
| Build command          | (leave empty) |
| Build output directory | `public`      |
| Root directory         | `/`           |

## ✨ Resultado

- Cada push para `main` fará auto-deploy
- URL: `https://pontinho.pages.dev` ou seu domínio customizado
- Acesso instantâneo a todas as funcionalidades (Modo Apostado, Jogadores, etc.)

## 🔗 CNAME já configurado

Seu `CNAME` existe, então o domínio customizado provavelmente já está:

- ✅ Configurado no Cloudflare
- ✅ Apontando para Pages
- ✅ Pronto para produção
