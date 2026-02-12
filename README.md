# Pontinho Master

Gerenciador de pontuação para o jogo de cartas **Pontinho**, também conhecido como Pif Paf em algumas regiões do Brasil.

## Regras do Jogo

### Objetivo

O objetivo do Pontinho é ser o **último jogador** a permanecer na mesa. Cada jogador começa com **99 pontos** e vai perdendo pontos ao longo das rodadas. Quando a pontuação de um jogador fica abaixo de zero, ele **estoura** e pode ser eliminado.

### Preparação da Mesa

1. Antes de iniciar o jogo, os jogadores definem dois valores:
   - **Valor da entrada:** quantia que cada jogador paga para entrar na mesa.
   - **Valor da reentrada (volta):** quantia que um jogador paga caso estoure e queira continuar jogando.
2. Todos os valores pagos (entradas e reentradas) formam o **pote**, que será entregue ao vencedor.

### Como Funciona uma Rodada

1. As cartas são distribuídas entre os jogadores conforme as regras tradicionais do Pontinho.
2. Os jogadores tentam formar **trincas** (três cartas do mesmo valor) e **sequências** (três ou mais cartas seguidas do mesmo naipe).
3. O jogador que conseguir baixar todas as suas cartas primeiro vence a rodada.
4. Os demais jogadores contam os pontos das cartas que restaram em suas mãos. Esses pontos são **subtraídos** da pontuação de cada um.

### Pontuação das Cartas

| Carta                      | Valor               |
| -------------------------- | ------------------- |
| Ás (A)                     | 15 pontos           |
| Figuras (J, Q, K)          | 10 pontos cada      |
| Cartas numeradas (2 a 10)  | Valor da carta      |

> **Nota:** a pontuação pode variar conforme a regra da casa. O aplicativo permite inserir qualquer valor de pontos perdidos por jogador a cada rodada.

### Estouro

Quando a pontuação de um jogador fica **abaixo de zero**, ele estoura. Nesse momento, duas coisas podem acontecer:

1. **Pagar a volta (reentrada):** o jogador paga o valor da reentrada, e sua pontuação é restaurada para o **menor valor positivo** entre os jogadores ativos. O valor pago é adicionado ao pote.
2. **Ser eliminado:** o jogador decide não pagar a volta e é removido do jogo.

Se não houver jogadores ativos suficientes para continuar, o jogador é eliminado automaticamente.

### Entrada Tardia

Jogadores podem entrar na mesa **após o início do jogo**. Quando isso acontece:

- O novo jogador paga o valor da entrada.
- Sua pontuação inicial será igual à **menor pontuação** entre os jogadores ativos naquele momento, ou **99 pontos** se for o primeiro jogador.

### Vitória

O jogo termina quando restar **apenas um jogador** na mesa. Esse jogador é o vencedor e leva todo o pote acumulado.

### Pagamento

O pote é a soma de todas as entradas e reentradas realizadas durante o jogo. Ao final da partida:

- Cada jogador deve acertar sua dívida (entrada + eventuais reentradas).
- O valor total do pote é entregue ao vencedor.

## Funcionalidades do Aplicativo

- Configuração de valores de entrada e reentrada.
- Adição de jogadores a qualquer momento do jogo.
- Registro de pontos perdidos por rodada.
- Controle automático de estouros e reentradas.
- Histórico completo de todas as rodadas.
- Controle de pagamentos (quem já pagou e quem ainda deve).
- Indicação visual do vencedor.
- Persistência de dados: o jogo é salvo automaticamente e restaurado ao reabrir a página.
- Interface responsiva para celulares, tablets e desktops.

## Como Usar

1. Abra o aplicativo e defina os valores de **entrada** e **reentrada**.
2. Toque em **"Abrir Mesa"** para iniciar o jogo.
3. Adicione os jogadores tocando no botão **+** no canto superior direito.
4. Após cada rodada de cartas, toque em **"Fechar Rodada"** e insira os pontos que cada jogador perdeu.
5. Quando um jogador estourar, o aplicativo perguntará se ele deseja pagar a volta.
6. O jogo continua até restar apenas um jogador.

## Tecnologias

- HTML5 semântico
- CSS com Tailwind CSS
- JavaScript vanilla
- Font Awesome (ícones)
- LocalStorage (persistência)

## Acesso

O aplicativo está disponível em: [pontinho.catiteo.com](https://pontinho.catiteo.com)
