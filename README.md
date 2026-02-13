# 🎴 Pontinho Master

> **Gerenciador de pontuação para o jogo de cartas Pontinho**

O **Pontinho Master** é uma aplicação web moderna e intuitiva para gerenciar partidas do jogo **Pontinho** (também conhecido como **Pif Paf**, **Buraco Português** ou **Jogo de Trincas**). Perfeita para jogar com amigos e manter uma contabilidade automática e precisa!

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Mobile Friendly](https://img.shields.io/badge/mobile-friendly-brightgreen)

---

## 📖 O Jogo - Regras Completas

### 🎯 Objetivo Principal

Ser o **último jogador** a permanecer na mesa com uma pontuação **maior ou igual a zero**. Todos começam com **99 pontos** e vão perdendo conforme as rodadas avançam. Quem fica com pontuação negativa (estoura) pode optar por pagar uma volta para continuar.

### 💰 Preparação da Mesa

Antes de iniciar, todos os jogadores definem dois valores importantes:

| Valor               | Descrição                                                       |
| ------------------- | --------------------------------------------------------------- |
| **Entrada**         | Quantia que cada jogador paga para entrar na mesa (ex: R$ 5,00) |
| **Volta/Reentrada** | Quantia para pagar se estourar e quiser continuar (ex: R$ 3,00) |

**Exemplo prático:**

- João paga R$ 5,00 (entrada)
- Maria paga R$ 5,00 (entrada)
- Pedro paga R$ 5,00 (entrada)
- **Pote inicial:** R$ 15,00

### 🎴 Como Funciona Uma Rodada

1. **Distribuição:** O dealer distribui cartas conforme as regras tradicionais do Pontinho
2. **Objetivo:** Cada jogador tenta formar:
   - **Trincas** = 3 cartas do mesmo valor (ex: 7-7-7)
   - **Sequências** = 3+ cartas consecutivas do mesmo naipe (ex: 5-6-7 de copas)
3. **Descida:** O primeiro a descer (baixar) todas as cartas é o **vencedor da rodada**
4. **Contagem:** Os demais contam os pontos das cartas restantes em suas mãos
5. **Subtração:** Esses pontos são **subtraídos** da pontuação do jogador

### 🃏 Tabela de Valores das Cartas

| Carta          | Valor     | Notas       |
| -------------- | --------- | ----------- |
| **Ás (A)**     | 15 pontos | Maior valor |
| **Figura (J)** | 10 pontos | Valete      |
| **Figura (Q)** | 10 pontos | Rainha      |
| **Figura (K)** | 10 pontos | Rei         |
| **10**         | 10 pontos | -           |
| **9**          | 9 pontos  | -           |
| **...**        | ...       | -           |
| **2**          | 2 pontos  | Menor valor |

> **💡 Nota:** O aplicativo permite customizar os valores conforme a regra da casa!

### 💥 O Estouro - Momento Crítico

Quando um jogador fica com **pontuação negativa**, ele **estoura**. Nesse momento, o aplicativo oferece duas opções:

#### ✅ Opção 1: Pagar a Volta (Reentrada)

- O jogador paga o valor da reentrada (ex: R$ 3,00)
- Sua pontuação é **restaurada** para o **menor valor positivo** entre os jogadores ativos
- O valor pago é adicionado ao pote
- O jogador **continua na mesa**

**Exemplo:**

```
Antes do estouro:
- João: 95 pontos
- Maria: 87 pontos
- Pedro: -5 pontos (estoura!)

Pedro paga R$ 3,00 de reentrada

Depois da reentrada:
- João: 95 pontos
- Maria: 87 pontos
- Pedro: 87 pontos (restaurado ao menor valor positivo)
- Pote: +R$ 3,00
```

#### ❌ Opção 2: Ser Eliminado

- O jogador **não paga** a reentrada
- É **removido da mesa** permanentemente
- Seu nome aparece na lista de eliminados
- Ainda deve pagar a entrada inicial

**Caso especial:** Se restar apenas um jogador ativo, o estouro é automático (sem opção de volta).

### 🚪 Entrada Tardia

Jogadores podem entrar **a qualquer momento** durante o jogo:

- Pagam o valor de entrada
- Começam com pontuação igual ao **menor valor positivo** dos jogadores ativos
- Se for o primeiro jogador, começa com **99 pontos**

**Exemplo:**

```
Mesa estabelecida:
- João: 75 pontos
- Maria: 82 pontos
- Rodada 3 iniciada

Diana quer entrar:
- Paga R$ 5,00 (entrada)
- Começa com 75 pontos (menor valor ativo)
- Apenas será afetada a partir da próxima rodada
```

### 🏆 Vitória

O jogo continua até **restar apenas um jogador**:

- Esse jogador é o **vencedor**
- Leva todo o **pote acumulado**
- Seu nome é exibido com destaque

**Exemplo de resultado final:**

```
🏆 VENCEDOR: João ✨

Pote Final: R$ 28,00
(5 + 5 + 5 + 3 entrada tardia + 5 reentrada Maria)
```

### 💳 Controle de Pagamentos

O aplicativo acompanha quem **pagou** e quem **ainda deve**:

- ✅ **Pagou:** Marcado como verde
- ❌ **Deve:** Marcado como vermelho
- 🔄 Pode alternar marcações facilmente

**Divisão no final:**

1. Cada jogador (menos o vencedor) acerta sua dívida
2. Valor total do pote vai para o vencedor

---

## ✨ Funcionalidades Principais

### 🎮 Gameplay

- ✅ Configuração flexível de valores de entrada e reentrada
- ✅ Suporte a **entrada tardia** de jogadores
- ✅ Adição/remoção de jogadores a qualquer momento
- ✅ Dois modos: **Amistoso** (sem dinheiro) e **Apostado** (com valores)

### 🧮 Controle de Pontuação

- ✅ Inserção automática de pontos perdidos por rodada
- ✅ Cálculo automático de estouros
- ✅ Controle inteligente de reentradas
- ✅ Sistema de desfazer última ação (Undo)

### 📊 Gestão Completa

- ✅ Histórico visual de todas as rodadas
- ✅ Rastreamento de pagamentos (pago/devendo)
- ✅ Indicação visual de quem esturou
- ✅ Status em tempo real de todos os jogadores

### 💾 Persistência e Segurança

- ✅ Salva automaticamente no navegador (LocalStorage)
- ✅ Recupera o jogo ao reabrir a página
- ✅ Funciona offline
- ✅ Sem necessidade de criar conta

### 📱 Interface

- ✅ **100% responsivo** - Funciona em celular, tablet e desktop
- ✅ Design moderno e intuitivo
- ✅ Ícones claros (Font Awesome)
- ✅ Tema com cores vibrantes
- ✅ Animações suaves

---

## 🚀 Como Usar - Passo a Passo

### Iniciando um Jogo

1. **Abra o aplicativo** em: [pontinho.catiteo.com](https://pontinho.catiteo.com)

2. **Escolha o modo:**
   - 🎮 **Amistoso:** Apenas para diversão, sem valores
   - 💰 **Apostado:** Configure valores de entrada e volta

3. **Se escolher Apostado:**
   - Digite o valor de **entrada** (ex: 5)
   - Digite o valor de **reentrada/volta** (ex: 3)
   - Clique em **"Começar"**

4. **Adicione jogadores:**
   - Clique no botão **+** no canto superior
   - Digite o nome do jogador
   - Repita até adicionar todos

### Jogando

5. **Após cada rodada de cartas:**
   - Clique em **"Fechar Rodada"**
   - Para cada jogador, insira os **pontos que perdeu**
   - Clique em **"Processar Rodada"**

6. **Se alguém estourar:**
   - Aparecerá uma mensagem: _"João estourou!"_
   - João escolhe:
     - ✅ **SIM** = Paga a volta e continua
     - ❌ **NÃO** = Eliminado do jogo

7. **Adicione novos jogadores** (entrada tardia):
   - Clique em **+** novamente
   - Novo jogador entra com a pontuação equivalente

8. **Veja o histórico:**
   - Clique em **"📊 Histórico"** para revisar todas as rodadas

9. **Finalize o jogo:**
   - Quando restar 1 jogador, ele é o vencedor
   - Marque os pagamentos
   - Divida o pote

---

## 🎛️ Configurações e Dicas

### Dicas para Melhor Experiência

| Dica                                  | Benefício                  |
| ------------------------------------- | -------------------------- |
| Use a entrada tardia para mais emoção | Mantém o jogo interessante |
| Revise o histórico entre rodadas      | Evita erros de contagem    |
| Marque pagamentos immediato           | Facilita ao final          |
| Use o Undo se errar                   | Não afeta o jogo anterior  |

### Regras Alternativas Suportadas

O aplicativo é **flexível** e suporta:

- ✅ Diferentes tabelas de pontos (customizável)
- ✅ Entrada tardia no meio do jogo
- ✅ Múltiplas reentradas
- ✅ Variações regionais (Pif Paf, Buraco, etc.)

---

## 💻 Tecnologias Utilizadas

```
Frontend:
  • HTML5 semântico
  • CSS3 com Tailwind CSS
  • JavaScript ES6+ vanilla
  • Font Awesome 6 (ícones)

Armazenamento:
  • LocalStorage (dados persistentes)

Hospedagem:
  • Cloudflare Pages (deploy automático)
  • Domínio: pontinho.catiteo.com
```

---

## 🌟 Casos de Uso

### 👥 Para Grupos de Amigos

- Jogue de forma organizada e divertida
- Sem necessidade de papel ou calculadora
- Histórico automático

### 🏠 Para Famílias

- Modo amistoso sem dinheiro envolvido
- Acompanhamento fácil para todos
- Funciona em qualquer dispositivo

### 🎉 Para Festas e Encontros

- Configure rapidamente
- Interface intuitiva mesmo para iniciantes
- Funciona 100% offline se necessário

---

## 🆘 Perguntas Frequentes

**P: Posso jogar sem internet?**
R: Sim! O jogo funciona completamente offline uma vez carregado.

**P: Meus dados são seguros?**
R: Sim! Tudo é armazenado localmente no seu navegador.

**P: Posso customizar os valores das cartas?**
R: Sim! O aplicativo permite inserir qualquer valor de pontuação.

**P: Funciona em mobile?**
R: 100%! Otimizado para iPhone, Android, tablets e desktops.

**P: Posso resetar um jogo em progresso?**
R: Sim! Recarregue a página e clique em "Novo Jogo".

---

## 📞 Suporte

Encontrou um bug? Tem uma sugestão?

- 📧 Abra uma issue no GitHub: [thiago-tap/pontinho](https://github.com/thiago-tap/pontinho)

---

## 📜 Licença

MIT © 2024 Pontinho Master

---

**Desenvolvido com ❤️ para amigos e famílias que amam um bom jogo de cartas!**
