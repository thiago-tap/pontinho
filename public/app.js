"use strict";

// =============================================
// Pontinho Master - Lógica do Jogo
// =============================================

const App = (() => {
  // --- ESTADO ---
  let players = [];
  let config = { entry: 0, rebuy: 0 };
  let roundHistory = [];
  let currentRound = 0;
  let nextId = 1;
  let gameStarted = false;
  let originalOrder = []; // Ordem física da mesa (IDs dos jogadores)
  let dealerIndex = 0; // Índice em originalOrder para o dealer atual
  let undoSnapshot = null; // Último snapshot para desfazer
  let confettiShown = false; // Flag para não repetir confetti

  // --- REFERÊNCIAS DOM ---
  const $ = (id) => document.getElementById(id);
  const setupScreen = $("setup-screen");
  const gameScreen = $("game-screen");
  const modeSelection = $("mode-selection");
  const apostadoFields = $("apostado-fields");
  const entryFeeInput = $("entry-fee");
  const rebuyFeeInput = $("rebuy-fee");
  const totalPotEl = $("total-pot");
  const potContainer = $("pot-container");
  const modeBadge = $("mode-badge");
  const btnAddPlayer = $("btn-add-player");
  const playersListEl = $("players-list");
  const btnEndRound = $("btn-end-round");
  const newPlayerNameInput = $("new-player-name");
  const roundInputsEl = $("round-inputs");
  const winnerBanner = $("winner-banner");
  const winnerNameEl = $("winner-name");
  const winnerProfitEl = $("winner-profit");
  const roundCounterEl = $("round-counter");
  const toastContainer = $("toast-container");
  const btnUndo = $("btn-undo");

  const modalAddPlayer = $("modal-add-player");
  const modalEndRound = $("modal-end-round");
  const modalConfirm = $("modal-confirm");
  const modalHistory = $("modal-history");
  const modalHelp = $("modal-help");
  const modalSettlement = $("modal-settlement");

  // =============================================
  // UTILITÁRIOS
  // =============================================

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /** Modo amistoso: sem cobranças quando entrada e reentrada são R$ 0,00 */
  function isAmistoso() {
    return config.entry === 0 && config.rebuy === 0;
  }

  function showToast(message, type = "info") {
    const colors = {
      info: "bg-blue-500",
      success: "bg-green-600",
      warning: "bg-yellow-500 text-black",
      error: "bg-red-500",
    };
    const toast = document.createElement("div");
    toast.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-center animate-toast-in pointer-events-auto`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("animate-toast-in");
      toast.classList.add("animate-toast-out");
      toast.addEventListener("animationend", () => toast.remove());
    }, 2500);
  }

  function showConfirm(title, message) {
    return new Promise((resolve) => {
      $("confirm-title").textContent = title;
      $("confirm-message").textContent = message;

      const yesBtn = $("btn-confirm-yes");
      const noBtn = $("btn-confirm-no");

      // Clonar só os botões para limpar listeners antigos
      const newYesBtn = yesBtn.cloneNode(true);
      const newNoBtn = noBtn.cloneNode(true);
      yesBtn.replaceWith(newYesBtn);
      noBtn.replaceWith(newNoBtn);

      let resolved = false;

      function resolveAndClose(value) {
        if (!resolved) {
          resolved = true;
          modalConfirm.close();
          // Aguardar para garantir que o modal foi totalmente fechado
          // antes de resolver a Promise. Isso é crítico para múltiplos modais
          // abrirem sequencialmente (caso de múltiplos estouros)
          setTimeout(() => resolve(value), 50);
        }
      }

      function onYes() {
        resolveAndClose(true);
      }

      function onNo() {
        resolveAndClose(false);
      }

      function onClose() {
        if (!resolved) {
          resolved = true;
          setTimeout(() => resolve(false), 50);
        }
      }

      newYesBtn.addEventListener("click", onYes);
      newNoBtn.addEventListener("click", onNo);
      // Use 'once' para não acumular listeners do close
      modalConfirm.addEventListener("close", onClose, { once: true });

      modalConfirm.showModal();
    });
  }

  // =============================================
  // PERSISTÊNCIA (localStorage)
  // =============================================

  function saveState() {
    try {
      const state = {
        players,
        config,
        roundHistory,
        currentRound,
        nextId,
        gameStarted,
        originalOrder,
        dealerIndex,
        undoSnapshot,
      };
      localStorage.setItem("pontinho-state", JSON.stringify(state));
    } catch (e) {
      // Silently fail if storage is full
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem("pontinho-state");
      if (!saved) return false;
      const state = JSON.parse(saved);
      players = state.players || [];
      config = state.config || { entry: 0, rebuy: 0 };
      roundHistory = state.roundHistory || [];
      currentRound = state.currentRound || 0;
      nextId = state.nextId || 1;
      gameStarted = state.gameStarted || false;
      originalOrder = state.originalOrder || [];
      dealerIndex = state.dealerIndex || 0;
      undoSnapshot = state.undoSnapshot || null;

      // Migração: adiciona campos novos a jogadores antigos
      players.forEach((p) => {
        if (p.roundsWon === undefined) p.roundsWon = 0;
        if (p.biggestLoss === undefined) p.biggestLoss = 0;
      });

      return gameStarted;
    } catch (e) {
      return false;
    }
  }

  function clearState() {
    localStorage.removeItem("pontinho-state");
  }

  // =============================================
  // SISTEMA UNDO (Ponto de Restauração)
  // =============================================

  /** Salva um snapshot do estado atual antes de cada processamento */
  function takeSnapshot() {
    undoSnapshot = {
      players: JSON.parse(JSON.stringify(players)),
      roundHistory: JSON.parse(JSON.stringify(roundHistory)),
      currentRound,
      dealerIndex,
      originalOrder: [...originalOrder],
    };
  }

  /** Restaura o último snapshot salvo */
  function undo() {
    if (!undoSnapshot) {
      showToast("Nada para desfazer!", "warning");
      return;
    }
    players = undoSnapshot.players;
    roundHistory = undoSnapshot.roundHistory;
    currentRound = undoSnapshot.currentRound;
    dealerIndex = undoSnapshot.dealerIndex;
    originalOrder = undoSnapshot.originalOrder;
    undoSnapshot = null;
    saveState();
    renderGame();
    showToast("Ação desfeita!", "info");
  }

  // =============================================
  // NAVEGAÇÃO
  // =============================================

  /** Modo amistoso: entra direto sem valores */
  function startAmistoso() {
    config.entry = 0;
    config.rebuy = 0;
    gameStarted = true;

    setupScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    gameScreen.classList.add("flex");

    saveState();
    renderGame();
  }

  /** Mostra os campos de valor para o modo apostado */
  function showApostadoFields() {
    modeSelection.classList.add("hidden");
    apostadoFields.classList.remove("hidden");
    setTimeout(() => entryFeeInput.focus(), 100);
  }

  /** Modo apostado: valida valores e inicia */
  function startApostado() {
    const entryVal = parseFloat(entryFeeInput.value) || 0;
    const rebuyVal = parseFloat(rebuyFeeInput.value) || 0;

    if (entryVal <= 0 || rebuyVal <= 0) {
      showToast("Preencha valores maiores que zero!", "error");
      return;
    }

    config.entry = entryVal;
    config.rebuy = rebuyVal;
    gameStarted = true;

    setupScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    gameScreen.classList.add("flex");

    saveState();
    renderGame();
  }

  function restoreGame() {
    setupScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    gameScreen.classList.add("flex");
    renderGame();
  }

  async function newGame() {
    const confirmed = await showConfirm(
      "Nova Mesa",
      "Tem certeza que deseja encerrar o jogo atual e começar uma nova mesa?",
    );
    if (!confirmed) return;

    players = [];
    config = { entry: 0, rebuy: 0 };
    roundHistory = [];
    currentRound = 0;
    nextId = 1;
    gameStarted = false;
    originalOrder = [];
    dealerIndex = 0;
    undoSnapshot = null;
    confettiShown = false;

    clearState();

    gameScreen.classList.add("hidden");
    gameScreen.classList.remove("flex");
    setupScreen.classList.remove("hidden");

    entryFeeInput.value = "";
    rebuyFeeInput.value = "";
    modeSelection.classList.remove("hidden");
    apostadoFields.classList.add("hidden");
    winnerBanner.classList.add("hidden");
    roundCounterEl.textContent = "";

    showToast("Mesa encerrada!", "info");
  }

  /** Reinicia a partida com os mesmos jogadores, reseta scores e rodadas */
  async function restartPartida() {
    const confirmed = await showConfirm(
      "Reiniciar Partida",
      "Tem certeza que deseja reiniciar a partida com os mesmos jogadores?",
    );
    if (!confirmed) return;

    // Manter os jogadores e configuração, mas resetar scores e histórico
    players.forEach((p) => {
      p.score = 99;
      p.eliminated = false;
      p.roundsWon = 0;
      p.biggestLoss = 0;
      p.debt = config.entry;
      p.hasPaid = false;
    });

    roundHistory = [];
    currentRound = 0;
    dealerIndex = 0;
    undoSnapshot = null;
    confettiShown = false;
    originalOrder = [];

    winnerBanner.classList.add("hidden");
    roundCounterEl.textContent = "";

    saveState();
    renderGame();

    showToast("Partida reiniciada com sucesso!", "success");
  }

  // =============================================
  // LÓGICA CORE
  // =============================================

  /** Busca a menor pontuação positiva (> 0) da mesa. Fallback para >= 0, depois 99.
   * @param {string} excludePlayerId - ID do jogador a excluir da busca (opcional) */
  function getLowestPositiveScore(excludePlayerId = null) {
    // Retorna o menor score não-negativo (>= 0), excluindo o player especificado
    const activePlayers = players.filter(
      (p) =>
        !p.eliminated &&
        p.score >= 0 &&
        (!excludePlayerId || p.id !== excludePlayerId),
    );
    if (activePlayers.length > 0) {
      return Math.min(...activePlayers.map((p) => p.score));
    }
    return 99;
  }

  function confirmAddPlayer() {
    const name = newPlayerNameInput.value.trim().toUpperCase();
    if (!name) {
      showToast("Digite o nome do jogador!", "warning");
      return;
    }
    if (name.length > 20) {
      showToast("Nome muito longo! Máximo 20 caracteres.", "warning");
      return;
    }
    if (players.some((p) => p.name === name && !p.eliminated)) {
      showToast("Já existe um jogador ativo com esse nome!", "warning");
      return;
    }

    takeSnapshot();

    // Entrada tardia: se já houve rodada, recebe a menor pontuação positiva
    const isLateEntry = currentRound > 0;
    const startScore = isLateEntry ? getLowestPositiveScore() : 99;

    const newPlayer = {
      id: nextId++,
      name: name,
      score: startScore,
      debt: config.entry,
      hasPaid: false,
      eliminated: false,
      roundsWon: 0,
      biggestLoss: 0,
    };

    players.push(newPlayer);
    originalOrder.push(newPlayer.id);

    newPlayerNameInput.value = "";
    modalAddPlayer.close();
    saveState();
    renderGame();

    if (isLateEntry) {
      showToast(`${name} entrou com ${startScore} pontos!`, "success");
    } else {
      showToast(`${name} entrou na mesa!`, "success");
    }
  }

  function togglePayment(id) {
    const player = players.find((p) => p.id === id);
    if (player && player.debt > 0) {
      player.hasPaid = !player.hasPaid;
      saveState();
      renderGame();
      showToast(
        player.hasPaid
          ? `${player.name} pagou!`
          : `Pagamento de ${player.name} desmarcado.`,
        player.hasPaid ? "success" : "info",
      );
    }
  }

  // =============================================
  // HELPERS UX
  // =============================================

  /** Retorna classes Tailwind para o círculo de score baseado na faixa */
  function getScoreZoneColor(score) {
    if (score >= 50) return "bg-green-100 text-green-800";
    if (score >= 20) return "bg-yellow-100 text-yellow-800";
    if (score >= 1) return "bg-orange-100 text-orange-800";
    return "bg-gray-200 text-gray-600";
  }

  /** Retorna os pontos perdidos por um jogador na última rodada, ou null */
  function getLastRoundLoss(playerId) {
    if (roundHistory.length === 0) return null;
    const last = roundHistory[roundHistory.length - 1];
    return last.scores[playerId] ?? null;
  }

  /** Efeito de confetti para celebrar o vencedor */
  function triggerConfetti() {
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden;";

    const colors = [
      "#f59e0b",
      "#10b981",
      "#3b82f6",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement("div");
      const size = Math.random() * 8 + 4;
      piece.style.cssText = `
                position:absolute;
                width:${size}px;height:${size}px;
                background:${colors[Math.floor(Math.random() * colors.length)]};
                left:${Math.random() * 100}%;top:-10px;
                border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
                animation:confettiFall ${Math.random() * 2 + 2}s linear forwards;
                animation-delay:${Math.random() * 0.8}s;
            `;
      container.appendChild(piece);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 5000);
  }

  // =============================================
  // DEALER (Distribuidor)
  // =============================================

  /** Retorna o ID do jogador que é o dealer atual */
  function getCurrentDealerId() {
    // Rodada 0: dealer preview (o primeiro da lista será o dealer)
    if (currentRound === 0) {
      if (originalOrder.length === 0) {
        // Ainda não foi iniciado: mostrar o primeiro jogador ativo
        const firstActive = players.find((p) => !p.eliminated);
        return firstActive?.id || null;
      }
      // originalOrder foi congelada: mostrar o primeiro daquela ordem
      return originalOrder[0] || null;
    }

    // Rodada 1+: dealer atual
    if (originalOrder.length === 0) return null;
    if (dealerIndex >= originalOrder.length) dealerIndex = 0;
    return originalOrder[dealerIndex];
  }

  /** Avança o dealer para o próximo jogador ativo na ordem original */
  function advanceDealer() {
    if (originalOrder.length === 0) return;

    let attempts = 0;
    do {
      dealerIndex = (dealerIndex + 1) % originalOrder.length;
      attempts++;
      const playerId = originalOrder[dealerIndex];
      const player = players.find((p) => p.id === playerId);
      if (player && !player.eliminated) return;
    } while (attempts < originalOrder.length);
  }

  // =============================================
  // RODADA
  // =============================================

  function openEndRoundModal() {
    const container = roundInputsEl;
    container.innerHTML = "";

    const activePlayers = players.filter((p) => !p.eliminated);
    const dealerId = getCurrentDealerId();

    let html = "";
    activePlayers.forEach((p) => {
      const safeName = escapeHtml(p.name);
      const isDealer = p.id === dealerId;
      const zoneColor =
        p.score >= 50
          ? "text-green-600"
          : p.score >= 20
            ? "text-yellow-600"
            : "text-orange-600";
      html += `
                <div class="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                    <div class="min-w-0 flex-1">
                        <div class="font-bold text-gray-700 text-sm truncate">${isDealer ? '<span style="color: #f59e0b; font-weight: bold;">🃏 DEALER:</span> ' : ""}${safeName}</div>
                        <div class="text-xs ${zoneColor} font-medium">Atual: ${p.score}</div>
                    </div>
                    <input type="number" data-player-id="${p.id}" data-current-score="${p.score}" min="0"
                        class="round-score-input shrink-0 w-20 border-2 border-gray-200 rounded-lg p-2.5 text-center text-lg focus:border-green-500 focus:ring-2 focus:ring-green-300 focus:outline-none min-h-[44px]"
                        placeholder="0" inputmode="numeric">
                    <div class="shrink-0 w-14 text-center">
                        <div class="text-[10px] text-gray-400 leading-none mb-0.5">Novo</div>
                        <div class="font-bold text-sm text-gray-600 preview-score" data-preview-for="${p.id}">${p.score}</div>
                    </div>
                </div>
            `;
    });
    container.innerHTML = html;
    modalEndRound.showModal();

    // Live preview + Enter navigation
    const inputs = [...container.querySelectorAll("input")];
    inputs.forEach((input, i) => {
      // Preview em tempo real
      input.addEventListener("input", () => {
        const lost = parseInt(input.value) || 0;
        const current = parseInt(input.dataset.currentScore);
        const newScore = current - lost;
        const previewEl = container.querySelector(
          `[data-preview-for="${input.dataset.playerId}"]`,
        );
        if (previewEl) {
          previewEl.textContent = newScore;
          if (newScore < 0) {
            previewEl.className = "font-bold text-sm text-red-500 bust-preview";
            previewEl.textContent = newScore + " 💥";
          } else if (newScore <= 10) {
            previewEl.className = "font-bold text-sm text-orange-500";
          } else {
            previewEl.className = "font-bold text-sm text-green-600";
          }
        }
      });

      // Enter → próximo input ou processar
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (i < inputs.length - 1) {
            inputs[i + 1].focus();
            inputs[i + 1].select();
          } else {
            processRound();
          }
        }
      });
    });

    if (inputs[0]) inputs[0].focus();
  }

  /** Inicia o jogo: trava ordemlista de jogadores e ativa o dealer */
  function startGame() {
    // Validar se há pelo menos 2 jogadores
    const activeCount = players.filter((p) => !p.eliminated).length;
    if (activeCount < 2) {
      showToast("Adicione pelo menos 2 jogadores!", "warning");
      return;
    }

    // Travar a ordem atual (se ainda não foi travada)
    if (originalOrder.length === 0) {
      originalOrder = players.filter((p) => !p.eliminated).map((p) => p.id);
    }

    // Incrementar para Rodada 1 (ativa o dealer e o botão "Fechar Rodada")
    currentRound = 1;
    dealerIndex = 0; // Reseta o dealer para o primeiro

    saveState();
    renderGame();
    showToast(
      "Partida iniciada! Dealer: " +
        escapeHtml(players.find((p) => p.id === originalOrder[0])?.name || "?"),
      "success",
    );
  }

  async function processRound() {
    // Validação: impedir valores negativos
    const inputs = document.querySelectorAll("#round-inputs [data-player-id]");
    for (const input of inputs) {
      const val = parseInt(input.value) || 0;
      if (val < 0) {
        showToast("Valores não podem ser negativos!", "error");
        return;
      }
    }

    // Aviso: todos os inputs são 0
    const allZero = [...inputs].every(
      (input) => (parseInt(input.value) || 0) === 0,
    );
    if (allZero) {
      const proceed = await showConfirm(
        "Tudo zero?",
        "Todos os valores estão zerados. Tem certeza que deseja processar esta rodada?",
      );
      if (!proceed) return;
    }

    // Tirar snapshot UMA ÚNICA VEZ antes de toda a operação
    // Isso permite que Undo reverta toda a rodada + estouros em uma única ação
    takeSnapshot();

    // Travar originalOrder na primeira rodada (se ainda vazio)
    if (originalOrder.length === 0) {
      originalOrder = players.filter((p) => !p.eliminated).map((p) => p.id);
    }

    const roundData = {};

    players.forEach((p) => {
      if (!p.eliminated) {
        const input = document.querySelector(
          `#round-inputs [data-player-id="${p.id}"]`,
        );
        if (input) {
          const lost = parseInt(input.value) || 0;
          roundData[p.id] = lost;
          p.score -= lost;

          // Métricas automáticas
          if (lost === 0) {
            p.roundsWon++;
          }
          if (lost > p.biggestLoss) {
            p.biggestLoss = lost;
          }
        }
      }
    });

    currentRound++;
    roundHistory.push({
      round: currentRound,
      scores: { ...roundData },
      playerNames: Object.fromEntries(players.map((p) => [p.id, p.name])),
    });

    // Processar estouros ANTES de avançar dealer
    // Isso garante que o dealer só avance para jogadores ainda ativos
    // Se novo dealer estourar:
    //  - Se recusar reentrada → eliminado → dealer avança para próximo
    //  - Se aceitar reentrada → fica no jogo → dealer fica com ele
    await checkEstouros();

    // Avançar dealer (a partir da Rodada 1)
    // Agora sabemos quem está realmente ativo após os estouros
    if (currentRound >= 1) {
      advanceDealer();
    }

    modalEndRound.close();
    saveState();
    renderGame(); // Renderiza com dealer atualizado
  }

  // =============================================
  // ESTOURO E REBUY
  // =============================================

  async function checkEstouros() {
    // IMPORTANTE: O snapshot é tirado pelo chamador (processRound)
    // Não tiramos snapshot aqui porque já foi feito ANTES de processar a rodada.
    // Isso garante que Undo reverte toda a rodada + estouros em uma ação.

    // VERIFICAÇÃO INICIAL: Se há múltiplos estouradores, declara o vencedor direto
    const estouradores = players.filter((p) => !p.eliminated && p.score < 0);
    const ativosComPontos = players.filter(
      (p) => !p.eliminated && p.score >= 0,
    );

    if (estouradores.length >= 2 && ativosComPontos.length === 1) {
      // REGRA: Múltiplos estouradores = vencedor automático
      const vencedor = ativosComPontos[0];
      vencedor.score = 99; // Garantir score positivo

      // Eliminar todos os estouradores
      estouradores.forEach((p) => {
        p.eliminated = true;
      });

      showToast(
        `${estouradores.map((p) => p.name).join(" e ")} estouraram! ${vencedor.name} é o VENCEDOR! 🏆`,
        "success",
      );
      saveState();
      return; // SAIR sem processar rebuy
    }

    // PROCESSAMENTO NORMAL: Oferecer rebuy individualmente
    for (const player of players) {
      if (!player.eliminated && player.score < 0) {
        // Feedback tátil no mobile
        navigator.vibrate?.(200);

        // Contar jogadores ativos AGORA (excluindo este que estourou)
        // Isso é recalculado a cada iteração em caso de múltiplos estouros
        const activeExcludingThis = players.filter(
          (p) => p.id !== player.id && !p.eliminated && p.score >= 0,
        ).length;

        // REGRA: Se há 2+ ativos, ofereça rebuy
        // Se há 1 ativo, declare vencedor automático
        // Se há 0 ativos, este é o vencedor (todos estouraram)
        if (activeExcludingThis >= 2) {
          // Há 2+ ativos: ofereça rebuy
          const rebuyMsg = isAmistoso()
            ? `Pontuação: ${player.score}. Deseja voltar ao jogo?`
            : `Pontuação: ${player.score}. Deseja pagar a volta (R$ ${config.rebuy.toFixed(2)})?`;

          const confirmed = await showConfirm(
            `${player.name} ESTOUROU!`,
            rebuyMsg,
          );

          if (confirmed) {
            // Reentrada confirmada: restaurar pontuação e ajustar dívida
            // Excluir este jogador da busca de menor score (ele tem score negativo agora)
            const targetScore = getLowestPositiveScore(player.id);
            player.score = targetScore;
            player.debt += config.rebuy;
            player.hasPaid = false;
            showToast(
              `${player.name} voltou com ${targetScore} pontos!`,
              "info",
            );
          } else {
            // Jogador recusou reentrada
            player.eliminated = true;
            showToast(`${player.name} foi eliminado!`, "error");
          }
        } else if (activeExcludingThis === 1) {
          // Apenas 1 ativo restante: vencedor automático!
          const vencedor = players.find(
            (p) => p.id !== player.id && !p.eliminated && p.score >= 0,
          );
          vencedor.score = 99;
          player.eliminated = true;
          showToast(
            `${player.name} estourou! ${vencedor.name} é o VENCEDOR! 🏆`,
            "success",
          );
          break; // SAIR - há um vencedor
        } else {
          // Nenhum otro jogador ativo: este é o vencedor!
          // Restaurar score para valor positivo (é o vencedor após todos estourarem)
          const winnerScore = 99; // Score padrão de vencedor
          player.score = winnerScore;

          // Eliminar todos os outros que ainda têm score negativo (também estouraram)
          players.forEach((p) => {
            if (p.id !== player.id && !p.eliminated && p.score < 0) {
              p.eliminated = true;
            }
          });

          showToast(
            `${player.name} ESTOUROU! Todos os outros também. ${player.name} é o VENCEDOR! 🏆`,
            "success",
          );
          break; // PARAR a iteração - há um vencedor!
        }
      }
    }

    saveState();
    // renderGame será chamado após advanceDealer em processRound()
  }

  // =============================================
  // DRAG AND DROP (Ordem da Mesa - Rodada 1)
  // =============================================

  function setupDragAndDrop() {
    let dragSrcId = null;

    // --- Desktop: HTML5 Drag and Drop ---
    playersListEl.addEventListener("dragstart", (e) => {
      if (currentRound > 0) return;
      const card = e.target.closest('.player-card[draggable="true"]');
      if (!card) return;
      dragSrcId = parseInt(card.dataset.playerId);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(dragSrcId));
    });

    playersListEl.addEventListener("dragover", (e) => {
      if (currentRound > 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const card = e.target.closest(".player-card");
      if (card && parseInt(card.dataset.playerId) !== dragSrcId) {
        card.classList.add("ring-2", "ring-yellow-400");
      }
    });

    playersListEl.addEventListener("dragleave", (e) => {
      const card = e.target.closest(".player-card");
      if (card) {
        card.classList.remove("ring-2", "ring-yellow-400");
      }
    });

    playersListEl.addEventListener("drop", (e) => {
      if (currentRound > 0) return;
      e.preventDefault();
      const card = e.target.closest(".player-card");
      if (!card) return;
      card.classList.remove("ring-2", "ring-yellow-400");

      const targetId = parseInt(card.dataset.playerId);
      if (dragSrcId === targetId) return;

      reorderPlayer(dragSrcId, targetId);
    });

    playersListEl.addEventListener("dragend", (e) => {
      playersListEl.querySelectorAll(".player-card").forEach((c) => {
        c.classList.remove("dragging", "ring-2", "ring-yellow-400");
      });
      dragSrcId = null;
    });

    // --- Mobile: Touch Drag and Drop ---
    let touchSrcId = null;
    let touchClone = null;
    let touchOffsetY = 0;

    playersListEl.addEventListener(
      "touchstart",
      (e) => {
        if (currentRound > 0) return;
        const handle = e.target.closest(".drag-handle");
        if (!handle) return;

        const card = handle.closest(".player-card");
        if (!card) return;

        touchSrcId = parseInt(card.dataset.playerId);
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        touchOffsetY = touch.clientY - rect.top;

        touchClone = card.cloneNode(true);
        touchClone.style.position = "fixed";
        touchClone.style.left = rect.left + "px";
        touchClone.style.top = rect.top + "px";
        touchClone.style.width = rect.width + "px";
        touchClone.style.zIndex = "1000";
        touchClone.style.opacity = "0.85";
        touchClone.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
        touchClone.style.pointerEvents = "none";
        touchClone.style.transition = "none";
        document.body.appendChild(touchClone);

        card.classList.add("dragging");
        e.preventDefault();
      },
      { passive: false },
    );

    playersListEl.addEventListener(
      "touchmove",
      (e) => {
        if (!touchClone || touchSrcId === null) return;

        const touch = e.touches[0];
        touchClone.style.top = touch.clientY - touchOffsetY + "px";

        // Highlight card under finger
        const cards = [...playersListEl.querySelectorAll(".player-card")];
        cards.forEach((c) => c.classList.remove("ring-2", "ring-yellow-400"));
        const cardUnder = cards.find((c) => {
          if (parseInt(c.dataset.playerId) === touchSrcId) return false;
          const rect = c.getBoundingClientRect();
          return touch.clientY > rect.top && touch.clientY < rect.bottom;
        });
        if (cardUnder) {
          cardUnder.classList.add("ring-2", "ring-yellow-400");
        }
        e.preventDefault();
      },
      { passive: false },
    );

    playersListEl.addEventListener("touchend", () => {
      if (touchSrcId === null) return;

      const highlighted = playersListEl.querySelector(
        ".player-card.ring-yellow-400",
      );
      if (highlighted) {
        const targetId = parseInt(highlighted.dataset.playerId);
        reorderPlayer(touchSrcId, targetId);
      }

      // Cleanup
      playersListEl.querySelectorAll(".player-card").forEach((c) => {
        c.classList.remove("dragging", "ring-2", "ring-yellow-400");
      });

      if (touchClone) {
        touchClone.remove();
        touchClone = null;
      }

      touchSrcId = null;
      renderGame();
    });
  }

  /** Move um jogador da posição de srcId para a posição de targetId */
  function reorderPlayer(srcId, targetId) {
    const srcIndex = players.findIndex((p) => p.id === srcId);
    const targetIndex = players.findIndex((p) => p.id === targetId);
    if (srcIndex === -1 || targetIndex === -1) return;

    const [moved] = players.splice(srcIndex, 1);
    players.splice(targetIndex, 0, moved);

    originalOrder = players.map((p) => p.id);
    saveState();
    renderGame();
  }

  // =============================================
  // HISTÓRICO
  // =============================================

  function openHistory() {
    const container = $("history-content");

    if (roundHistory.length === 0) {
      container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fa-solid fa-clock-rotate-left text-4xl mb-3" aria-hidden="true"></i>
                    <p>Nenhuma rodada registrada ainda.</p>
                </div>
            `;
    } else {
      let html = "";
      [...roundHistory].reverse().forEach((round) => {
        html += `<div class="bg-gray-50 rounded-lg p-3">
                    <div class="font-bold text-green-700 text-sm mb-2">Rodada ${round.round}</div>`;
        Object.entries(round.scores).forEach(([id, lost]) => {
          const name = escapeHtml(round.playerNames[id] || "Desconhecido");
          html += `
                        <div class="flex justify-between gap-2 text-sm py-1 border-b border-gray-100 last:border-0">
                            <span class="text-gray-700 truncate min-w-0">${name}</span>
                            <span class="font-mono shrink-0 ${lost > 0 ? "text-red-500" : "text-green-600 font-bold"}">
                                ${lost === 0 ? "🏆 0" : "-" + lost}
                            </span>
                        </div>`;
        });
        html += "</div>";
      });
      container.innerHTML = html;
    }

    modalHistory.showModal();
  }

  // =============================================
  // ACERTO DE CONTAS (Settlement)
  // =============================================

  function openSettlement() {
    const activePlayers = players.filter((p) => !p.eliminated);
    const winner = activePlayers[0];
    if (!winner) return;

    const losers = players.filter((p) => p.eliminated);
    const totalPot = players.reduce((sum, p) => sum + p.debt, 0);
    const netProfit = totalPot - winner.debt;

    // Populando header
    $("settlement-winner-name").textContent = escapeHtml(winner.name);
    $("settlement-winner-profit").textContent =
      `Lucro: R$ ${netProfit.toFixed(2)}`;
    $("settlement-total-in-play").textContent = totalPot.toFixed(2);

    // Populando lista de perdedores
    const losersContainer = $("settlement-losers");
    let losersHtml = "";

    if (losers.length === 0) {
      losersHtml = `
                <div class="text-center text-gray-400 py-4">
                    <p class="text-sm">Nenhum jogador elimado (modo amistoso?)</p>
                </div>
            `;
    } else {
      losers.forEach((p) => {
        const safeName = escapeHtml(p.name);
        const moneyIcon = p.hasPaid
          ? "text-green-600 fa-circle-check"
          : "text-red-500 fa-sack-dollar";
        const statusClass = p.hasPaid
          ? "line-through text-green-600"
          : "text-red-600 font-semibold";

        losersHtml += `
                    <div class="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-l-4 ${p.hasPaid ? "border-green-400" : "border-red-300"}">
                        <button type="button" data-settlement-toggle="${p.id}"
                            class="shrink-0 text-2xl active:scale-90 transition-all focus:ring-2 focus:ring-green-300 focus:outline-none rounded-full min-h-[40px] min-w-[40px] flex items-center justify-center"
                            aria-label="${p.hasPaid ? "Desmarcar pagamento de " + safeName : "Marcar pagamento de " + safeName}">
                            <i class="fa-solid ${moneyIcon}" aria-hidden="true"></i>
                        </button>
                        <div class="min-w-0 flex-1">
                            <div class="font-bold ${statusClass} text-sm truncate">${safeName}</div>
                            <div class="text-xs text-gray-500">Deve: R$ ${p.debt.toFixed(2)}</div>
                        </div>
                        <div class="shrink-0 text-sm font-mono ${p.hasPaid ? "text-green-600" : "text-gray-600"}">
                            ${p.hasPaid ? "✓" : "✗"}
                        </div>
                    </div>
                `;
      });
    }

    losersContainer.innerHTML = losersHtml;

    // Atualizando resumo de pagamentos
    updateSettlementSummary();

    // Delegação de evento para pagamentos na settlement (cada vez que abre)
    losersContainer.replaceWith(losersContainer.cloneNode(true));
    const newLosersContainer = $("settlement-losers");
    newLosersContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-settlement-toggle]");
      if (btn) {
        const id = parseInt(btn.dataset.settlementToggle);
        togglePayment(id);
        openSettlement(); // Atualizar modal após marcar pagamento
      }
    });

    modalSettlement.showModal();
  }

  function updateSettlementSummary() {
    const losers = players.filter((p) => p.eliminated);
    const paidAmount = losers
      .filter((p) => p.hasPaid)
      .reduce((sum, p) => sum + p.debt, 0);
    const pendingAmount = losers
      .filter((p) => !p.hasPaid)
      .reduce((sum, p) => sum + p.debt, 0);

    $("settlement-paid").textContent = `R$ ${paidAmount.toFixed(2)}`;
    $("settlement-pending").textContent = `R$ ${pendingAmount.toFixed(2)}`;
  }

  // =============================================
  // RENDERIZAÇÃO (UI)
  // =============================================

  /** Deleta um jogador da mesa (apenas durante setup) */
  function deletePlayer(playerId) {
    if (currentRound > 0) {
      showToast("Não é possível deletar jogadores durante o jogo!", "warning");
      return;
    }

    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    takeSnapshot();

    // Remove o jogador do array
    players = players.filter((p) => p.id !== playerId);

    // Remove da ordem original também
    originalOrder = originalOrder.filter((id) => id !== playerId);

    saveState();
    renderGame();

    showToast(`${player.name} foi removido da mesa!`, "info");
  }

  function renderGame() {
    const amistoso = isAmistoso();

    // --- Pote (oculto no modo amistoso) ---
    if (amistoso) {
      potContainer.classList.add("hidden");
    } else {
      potContainer.classList.remove("hidden");
      const totalPot = players.reduce((sum, p) => sum + p.debt, 0);
      totalPotEl.textContent = totalPot.toFixed(2);
    }

    // --- Mode badge (Amistoso) ---
    if (amistoso) {
      modeBadge.classList.remove("hidden");
    } else {
      modeBadge.classList.add("hidden");
    }

    // --- Botão Undo ---
    btnUndo.classList.toggle("hidden", !undoSnapshot);

    // --- Contador de rodadas + jogadores ativos ---
    if (currentRound > 0) {
      const totalPlayers = players.length;
      const activeCount2 = players.filter((p) => !p.eliminated).length;
      roundCounterEl.textContent = `Rodada ${currentRound} · ${activeCount2}/${totalPlayers} jogadores`;
    } else if (players.length > 0) {
      roundCounterEl.textContent = `${players.length} jogador${players.length !== 1 ? "es" : ""}`;
    } else {
      roundCounterEl.textContent = "";
    }

    // --- Ordenação ---
    // Antes da Rodada 1: ordem do drag-and-drop (original)
    // A partir da Rodada 1: ordenado por pontuação (maior → menor)
    let sorted;
    if (currentRound === 0) {
      sorted = [...players];
    } else {
      sorted = [...players].sort((a, b) => {
        if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
        return b.score - a.score;
      });
    }

    // --- Checar vencedor ---
    const activePlayers = players.filter((p) => !p.eliminated);
    const hasWinner =
      activePlayers.length === 1 &&
      players.length > 1 &&
      players.filter((p) => p.eliminated).length > 0;

    if (hasWinner) {
      const winner = activePlayers[0];
      const totalPot = players.reduce((sum, p) => sum + p.debt, 0);
      const netProfit = totalPot - winner.debt;

      winnerBanner.classList.remove("hidden");
      winnerNameEl.textContent = winner.name;

      if (!amistoso) {
        winnerProfitEl.classList.remove("hidden");
        winnerProfitEl.textContent = `Lucro Líquido: R$ ${netProfit.toFixed(2)}`;
      } else {
        winnerProfitEl.classList.add("hidden");
      }

      // Confetti (dispara apenas uma vez)
      if (!confettiShown) {
        confettiShown = true;
        triggerConfetti();
        // Abrir modal de acerto de contas após breve delay para confetti
        setTimeout(() => {
          if (!amistoso) {
            openSettlement();
          }
        }, 300);
      }

      // Desabilitar botão de adicionar jogador
      btnAddPlayer.disabled = true;
      btnAddPlayer.classList.add("opacity-50", "pointer-events-none");
    } else {
      winnerBanner.classList.add("hidden");
      btnAddPlayer.disabled = false;
      btnAddPlayer.classList.remove("opacity-50", "pointer-events-none");
    }

    // --- Dealer ---
    const dealerId = getCurrentDealerId();
    const isDragPhase = currentRound === 0;

    // Layout: coluna única na fase de arraste, grid após
    if (isDragPhase) {
      playersListEl.classList.remove("md:grid-cols-2", "lg:grid-cols-3");
      playersListEl.classList.add("max-w-lg", "mx-auto");
    } else {
      playersListEl.classList.add("md:grid-cols-2", "lg:grid-cols-3");
      playersListEl.classList.remove("max-w-lg", "mx-auto");
    }

    // --- Lista de jogadores ---
    if (sorted.length === 0) {
      playersListEl.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center text-center text-white opacity-70 mt-8 animate-fade-in gap-6">
                    <i class="fa-solid fa-users text-6xl block" aria-hidden="true"></i>
                    <div>
                        <p class="text-xl font-semibold mb-2">Adicione jogadores para começar!</p>
                        <p class="text-base opacity-70">Clique abaixo ou use o botão na barra superior</p>
                    </div>
                    <button type="button" onclick="document.getElementById('modal-add-player').showModal()"
                        class="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all focus:ring-4 focus:ring-green-300 focus:outline-none min-h-[48px] text-lg flex items-center justify-center gap-2">
                        <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
                        Adicionar Jogador
                    </button>
                </div>`;
    } else if (sorted.length > 0 && currentRound === 0) {
      // Modo setup: mostrar lista de jogadores dragáveis + botões de ação
      let html = `<div class="col-span-full text-center text-green-200 text-sm mb-3 animate-fade-in">
                    <i class="fa-solid fa-layer-group mr-1" aria-hidden="true"></i>
                    ${sorted.length} jogador${sorted.length !== 1 ? "es" : ""}
                </div>
                <div class="col-span-full text-center text-green-200 text-sm mb-4 animate-fade-in">
                    <i class="fa-solid fa-arrows-up-down mr-1" aria-hidden="true"></i>
                    Arraste para organizar a ordem da mesa
                </div>`;

      // Renderizar cards dos jogadores com drag-and-drop habilitado
      sorted.forEach((p) => {
        const safeName = escapeHtml(p.name);
        html += `
                <div class="player-card bg-white rounded-lg p-4 shadow cursor-move hover:shadow-lg transition-all" 
                     draggable="true" data-player-id="${p.id}">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                            ${safeName.charAt(0)}
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="font-bold text-gray-800 truncate">${safeName}</div>
                            <div class="text-sm text-gray-500">Score: 99</div>
                        </div>
                        <button type="button" data-delete-player="${p.id}"
                            class="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-300"
                            aria-label="Deletar ${safeName}">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
                        </button>
                        <div class="text-gray-400 cursor-grab active:cursor-grabbing drag-handle">
                            <i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>
                        </div>
                    </div>
                </div>`;
      });

      // Botões de ação
      const isDisabled = sorted.length <= 1;
      const disabledClass = isDisabled
        ? "opacity-50 cursor-not-allowed"
        : "hover:bg-yellow-400 active:scale-95";
      const disabledAttr = isDisabled ? "disabled" : "";

      html += `<div class="col-span-full flex flex-col md:flex-row gap-3 justify-center mt-4 pt-4 border-t border-green-700">
                    <button type="button" onclick="document.getElementById('modal-add-player').showModal()"
                        class="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all focus:ring-4 focus:ring-green-300 focus:outline-none min-h-[48px] text-base flex items-center justify-center gap-2">
                        <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
                        Continuar Adicionando
                    </button>
                    <button type="button" onclick="App.startGame()" ${disabledAttr}
                        class="bg-yellow-500 ${disabledClass} text-black font-bold py-3 px-6 rounded-lg shadow-lg transition-all focus:ring-4 focus:ring-yellow-300 focus:outline-none min-h-[48px] text-base flex items-center justify-center gap-2 disabled:shadow-none">
                        <i class="fa-solid fa-play" aria-hidden="true"></i>
                        Começar Partida
                    </button>
                </div>`;
      playersListEl.innerHTML = html;
    } else {
      let html = "";

      // Instrução de arraste (antes da primeira rodada)
      if (isDragPhase && sorted.length > 1) {
        html += `<div class="col-span-full text-center text-green-200 text-sm mb-2 animate-fade-in">
                    <i class="fa-solid fa-arrows-up-down mr-1" aria-hidden="true"></i>
                    Arraste para organizar a ordem da mesa
                </div>`;
      }

      sorted.forEach((p, index) => {
        const isWinner = hasWinner && !p.eliminated;
        const isDealer = p.id === dealerId && !p.eliminated;
        const cardColor = p.eliminated
          ? "bg-gray-400"
          : isWinner
            ? "bg-yellow-100 ring-2 ring-yellow-400"
            : "bg-white";
        const scoreColor =
          p.score < 0 ? "bg-red-500 text-white" : getScoreZoneColor(p.score);
        const textColor = p.eliminated
          ? "line-through text-gray-600"
          : "text-gray-800";
        const safeName = escapeHtml(p.name);

        // Conteúdo do círculo de score
        let circleContent;
        let circleColor;
        if (p.eliminated) {
          circleContent =
            '<i class="fa-solid fa-skull" aria-hidden="true"></i>';
          circleColor = "bg-black text-white";
        } else if (isWinner) {
          circleContent =
            '<i class="fa-solid fa-crown" aria-hidden="true"></i>';
          circleColor = "bg-yellow-400 text-yellow-900";
        } else {
          circleContent = p.score;
          circleColor = scoreColor;
        }

        // Posição no ranking
        let positionBadge = "";
        if (currentRound > 0 && !p.eliminated) {
          const pos = index + 1;
          positionBadge = `<span class="text-xs text-gray-400 font-medium">#${pos}</span> `;
        }

        // Delta da última rodada
        let deltaHtml = "";
        if (currentRound > 0 && !p.eliminated) {
          const lastLoss = getLastRoundLoss(p.id);
          if (lastLoss !== null && lastLoss > 0) {
            deltaHtml = `<span class="ml-1.5 text-xs text-red-400 font-medium">▼${lastLoss}</span>`;
          } else if (lastLoss === 0) {
            deltaHtml = `<span class="ml-1.5 text-xs text-green-500 font-medium">★</span>`;
          }
        }

        // Métricas automáticas
        let metricsHtml = "";
        if (!p.eliminated && currentRound > 0) {
          const parts = [];
          if (p.roundsWon > 0) parts.push(`🏆 ${p.roundsWon}`);
          if (p.biggestLoss > 0) parts.push(`📉 ${p.biggestLoss}`);
          if (parts.length > 0) {
            metricsHtml = `<div class="text-xs text-gray-400 mt-0.5">${parts.join(" &nbsp; ")}</div>`;
          }
        }

        // Dívida (oculta no modo amistoso)
        let debtHtml = "";
        if (!amistoso && !p.eliminated && p.debt > 0) {
          const moneyText = p.hasPaid ? "Pago" : `Deve R$ ${p.debt.toFixed(2)}`;
          debtHtml = `<div class="text-sm text-gray-500 truncate">${moneyText}</div>`;
        }

        // Info do vencedor
        let winnerInfo = "";
        if (isWinner && !amistoso) {
          const totalPot = players.reduce((sum, pl) => sum + pl.debt, 0);
          const netProfit = totalPot - p.debt;
          winnerInfo = `<div class="text-sm text-yellow-600 font-bold">Vencedor! Lucro: R$ ${netProfit.toFixed(2)}</div>`;
        } else if (isWinner) {
          winnerInfo =
            '<div class="text-sm text-yellow-600 font-bold">Vencedor!</div>';
        }

        // Badge do dealer
        let dealerBadge = "";
        if (isDealer) {
          const dealerLabel = currentRound === 0 ? "EMBARALHAR" : "DEALER";
          dealerBadge = `<span class="dealer-badge" title="${dealerLabel}">🃏 ${dealerLabel}</span>`;
        }

        // Handle de arraste (apenas antes da primeira rodada)
        let dragHandle = "";
        if (isDragPhase && !p.eliminated) {
          dragHandle = `<div class="drag-handle shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-1">
                        <i class="fa-solid fa-grip-vertical text-lg" aria-hidden="true"></i>
                    </div>`;
        }

        // Botão de pagamento (oculto no modo amistoso)
        let paymentBtn = "";
        if (!p.eliminated && !amistoso && p.debt > 0) {
          const moneyIcon = p.hasPaid
            ? "text-green-600 fa-circle-check"
            : "text-red-500 fa-sack-dollar";
          paymentBtn = `
                    <button type="button" data-toggle-payment="${p.id}"
                        class="shrink-0 text-3xl active:scale-90 transition-all focus:ring-2 focus:ring-green-300 focus:outline-none rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center"
                        aria-label="${p.hasPaid ? "Desmarcar pagamento de " + safeName : "Marcar pagamento de " + safeName}">
                        <i class="fa-solid ${moneyIcon}" aria-hidden="true"></i>
                    </button>`;
        }

        html += `
                <div class="player-card ${cardColor} rounded-2xl shadow-md p-5 flex items-center gap-3 animate-slide-up relative min-h-[110px]"
                    style="animation-delay: ${index * 0.05}s"
                    data-player-id="${p.id}"
                    ${isDragPhase && !p.eliminated ? 'draggable="true"' : ""}>
                    ${dealerBadge}
                    ${dragHandle}
                    <div class="shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-base ${circleColor}">
                        ${circleContent}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="font-bold ${textColor} text-base truncate">${positionBadge}${safeName}${deltaHtml}</div>
                        ${debtHtml}
                        ${metricsHtml}
                        ${winnerInfo}
                    </div>
                    ${paymentBtn}
                </div>`;
      });
      playersListEl.innerHTML = html;
    }

    // --- Controle do botão de fechar/iniciar rodada ---
    const activeCount = activePlayers.length;

    if (hasWinner) {
      btnEndRound.disabled = true;
      btnEndRound.textContent = "JOGO ENCERRADO";
    } else if (currentRound === 0) {
      // Rodada 0 (setup): mostrar "Iniciar Partida"
      btnEndRound.disabled = activeCount < 2;
      btnEndRound.textContent = "INICIAR PARTIDA";
    } else {
      // Rodadas 1+: mostrar "Fechar Rodada"
      btnEndRound.disabled = activeCount < 2;
      btnEndRound.textContent = "FECHAR RODADA";
    }
  }

  // =============================================
  // EVENT LISTENERS
  // =============================================

  function init() {
    // Tela de setup - seleção de modo
    $("btn-mode-amistoso").addEventListener("click", startAmistoso);
    $("btn-mode-apostado").addEventListener("click", showApostadoFields);
    $("btn-back-mode").addEventListener("click", () => {
      apostadoFields.classList.add("hidden");
      modeSelection.classList.remove("hidden");
      entryFeeInput.value = "";
      rebuyFeeInput.value = "";
    });
    $("btn-start-game").addEventListener("click", startApostado);

    // Enter nos inputs de setup (modo apostado)
    entryFeeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") rebuyFeeInput.focus();
    });
    rebuyFeeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") startApostado();
    });

    // Header do jogo
    $("btn-new-game").addEventListener("click", newGame);
    $("btn-add-player").addEventListener("click", () => {
      newPlayerNameInput.value = "";
      modalAddPlayer.showModal();
      setTimeout(() => newPlayerNameInput.focus(), 100);
    });
    $("btn-history").addEventListener("click", openHistory);
    $("btn-help").addEventListener("click", () => modalHelp.showModal());
    $("btn-close-help").addEventListener("click", () => modalHelp.close());
    $("btn-close-settlement").addEventListener("click", () =>
      modalSettlement.close(),
    );
    btnUndo.addEventListener("click", undo);
    $("btn-restart-partida").addEventListener("click", restartPartida);
    $("btn-restart-game").addEventListener("click", newGame);

    // Modal adicionar jogador
    $("btn-confirm-add").addEventListener("click", confirmAddPlayer);
    $("btn-cancel-add").addEventListener("click", () => modalAddPlayer.close());
    newPlayerNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmAddPlayer();
    });

    // Modal fim de rodada
    btnEndRound.addEventListener("click", () => {
      // Na Rodada 0, "Iniciar Partida" inicia o jogo
      if (currentRound === 0) {
        startGame();
      } else {
        // A partir da Rodada 1, "Fechar Rodada" processa normalmente
        openEndRoundModal();
      }
    });
    $("btn-process-round").addEventListener("click", processRound);
    $("btn-cancel-round").addEventListener("click", () =>
      modalEndRound.close(),
    );

    // Modal histórico
    $("btn-close-history").addEventListener("click", () =>
      modalHistory.close(),
    );

    // Delegação de evento para botões de pagamento e deletar jogador
    playersListEl.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-delete-player]");
      if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.deletePlayer);
        deletePlayer(id);
        return;
      }

      const paymentBtn = e.target.closest("[data-toggle-payment]");
      if (paymentBtn) {
        const id = parseInt(paymentBtn.dataset.togglePayment);
        togglePayment(id);
      }
    });

    // Drag and drop (ordem da mesa)
    setupDragAndDrop();

    // Prevenir perda acidental
    window.addEventListener("beforeunload", (e) => {
      if (gameStarted && players.length > 0) {
        e.preventDefault();
      }
    });

    // Restaurar jogo salvo
    if (loadState()) {
      restoreGame();
    }
  }

  // Iniciar quando DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { showToast, startGame, restartPartida };
})();
