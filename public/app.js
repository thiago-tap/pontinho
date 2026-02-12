'use strict';

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

    // --- REFERÊNCIAS DOM ---
    const $ = (id) => document.getElementById(id);
    const setupScreen = $('setup-screen');
    const gameScreen = $('game-screen');
    const entryFeeInput = $('entry-fee');
    const rebuyFeeInput = $('rebuy-fee');
    const totalPotEl = $('total-pot');
    const playersListEl = $('players-list');
    const btnEndRound = $('btn-end-round');
    const newPlayerNameInput = $('new-player-name');
    const roundInputsEl = $('round-inputs');
    const winnerBanner = $('winner-banner');
    const winnerNameEl = $('winner-name');
    const roundCounterEl = $('round-counter');
    const toastContainer = $('toast-container');

    const modalAddPlayer = $('modal-add-player');
    const modalEndRound = $('modal-end-round');
    const modalConfirm = $('modal-confirm');
    const modalHistory = $('modal-history');

    // =============================================
    // UTILITÁRIOS
    // =============================================

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'info') {
        const colors = {
            info: 'bg-blue-500',
            success: 'bg-green-600',
            warning: 'bg-yellow-500 text-black',
            error: 'bg-red-500',
        };
        const toast = document.createElement('div');
        toast.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-center animate-toast-in pointer-events-auto`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('animate-toast-in');
            toast.classList.add('animate-toast-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 2500);
    }

    function showConfirm(title, message) {
        return new Promise((resolve) => {
            $('confirm-title').textContent = title;
            $('confirm-message').textContent = message;

            const yesBtn = $('btn-confirm-yes');
            const noBtn = $('btn-confirm-no');

            function cleanup() {
                yesBtn.removeEventListener('click', onYes);
                noBtn.removeEventListener('click', onNo);
                modalConfirm.removeEventListener('close', onClose);
                modalConfirm.close();
            }

            function onYes() { cleanup(); resolve(true); }
            function onNo() { cleanup(); resolve(false); }
            function onClose() { cleanup(); resolve(false); }

            yesBtn.addEventListener('click', onYes);
            noBtn.addEventListener('click', onNo);
            modalConfirm.addEventListener('close', onClose);

            modalConfirm.showModal();
        });
    }

    // =============================================
    // PERSISTÊNCIA (localStorage)
    // =============================================

    function saveState() {
        try {
            const state = { players, config, roundHistory, currentRound, nextId, gameStarted };
            localStorage.setItem('pontinho-state', JSON.stringify(state));
        } catch (e) {
            // Silently fail if storage is full
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem('pontinho-state');
            if (!saved) return false;
            const state = JSON.parse(saved);
            players = state.players || [];
            config = state.config || { entry: 0, rebuy: 0 };
            roundHistory = state.roundHistory || [];
            currentRound = state.currentRound || 0;
            nextId = state.nextId || 1;
            gameStarted = state.gameStarted || false;
            return gameStarted;
        } catch (e) {
            return false;
        }
    }

    function clearState() {
        localStorage.removeItem('pontinho-state');
    }

    // =============================================
    // NAVEGAÇÃO
    // =============================================

    function startGame() {
        const entryVal = parseFloat(entryFeeInput.value);
        const rebuyVal = parseFloat(rebuyFeeInput.value);

        if (isNaN(entryVal) || isNaN(rebuyVal) || entryVal < 0 || rebuyVal < 0) {
            showToast('Preencha valores válidos (>= 0) para entrada e reentrada!', 'error');
            return;
        }

        config.entry = entryVal;
        config.rebuy = rebuyVal;
        gameStarted = true;

        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        gameScreen.classList.add('flex');

        saveState();
        renderGame();
    }

    function restoreGame() {
        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        gameScreen.classList.add('flex');
        renderGame();
    }

    async function newGame() {
        const confirmed = await showConfirm(
            'Nova Mesa',
            'Tem certeza que deseja encerrar o jogo atual e começar uma nova mesa?'
        );
        if (!confirmed) return;

        players = [];
        config = { entry: 0, rebuy: 0 };
        roundHistory = [];
        currentRound = 0;
        nextId = 1;
        gameStarted = false;

        clearState();

        gameScreen.classList.add('hidden');
        gameScreen.classList.remove('flex');
        setupScreen.classList.remove('hidden');

        entryFeeInput.value = '';
        rebuyFeeInput.value = '';
        winnerBanner.classList.add('hidden');
        roundCounterEl.textContent = '';

        showToast('Mesa encerrada!', 'info');
    }

    // =============================================
    // LÓGICA CORE
    // =============================================

    function getLowestScore() {
        const activePlayers = players.filter(p => !p.eliminated && p.score >= 0);
        if (activePlayers.length === 0) return 99;
        return Math.min(...activePlayers.map(p => p.score));
    }

    function confirmAddPlayer() {
        const name = newPlayerNameInput.value.trim().toUpperCase();
        if (!name) {
            showToast('Digite o nome do jogador!', 'warning');
            return;
        }
        if (name.length > 20) {
            showToast('Nome muito longo! Máximo 20 caracteres.', 'warning');
            return;
        }
        if (players.some(p => p.name === name && !p.eliminated)) {
            showToast('Já existe um jogador ativo com esse nome!', 'warning');
            return;
        }

        const startScore = (players.filter(p => !p.eliminated).length > 0) ? getLowestScore() : 99;

        players.push({
            id: nextId++,
            name: name,
            score: startScore,
            debt: config.entry,
            hasPaid: false,
            eliminated: false,
        });

        newPlayerNameInput.value = '';
        modalAddPlayer.close();
        saveState();
        renderGame();
        showToast(`${name} entrou na mesa!`, 'success');
    }

    function togglePayment(id) {
        const player = players.find(p => p.id === id);
        if (player && player.debt > 0) {
            player.hasPaid = !player.hasPaid;
            saveState();
            renderGame();
            showToast(
                player.hasPaid ? `${player.name} pagou!` : `Pagamento de ${player.name} desmarcado.`,
                player.hasPaid ? 'success' : 'info'
            );
        }
    }

    // =============================================
    // RODADA
    // =============================================

    function openEndRoundModal() {
        const container = roundInputsEl;
        container.innerHTML = '';

        const activePlayers = players.filter(p => !p.eliminated);
        let html = '';
        activePlayers.forEach(p => {
            const safeName = escapeHtml(p.name);
            html += `
                <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <span class="font-bold text-gray-700 truncate min-w-0 flex-1">${safeName}</span>
                    <input type="number" data-player-id="${p.id}" min="0"
                        class="round-score-input shrink-0 w-20 border-2 border-gray-200 rounded-lg p-2 text-center focus:border-green-500 focus:ring-2 focus:ring-green-300 focus:outline-none min-h-[44px]"
                        placeholder="0" inputmode="numeric">
                </div>
            `;
        });
        container.innerHTML = html;
        modalEndRound.showModal();

        const firstInput = container.querySelector('input');
        if (firstInput) firstInput.focus();
    }

    function processRound() {
        const roundData = {};
        let hasValidInput = false;

        players.forEach(p => {
            if (!p.eliminated) {
                const input = document.querySelector(`[data-player-id="${p.id}"]`);
                if (input) {
                    const lost = parseInt(input.value) || 0;
                    if (lost < 0) {
                        showToast('Valores não podem ser negativos!', 'error');
                        return;
                    }
                    roundData[p.id] = lost;
                    p.score -= lost;
                    if (lost > 0) hasValidInput = true;
                }
            }
        });

        currentRound++;
        roundHistory.push({
            round: currentRound,
            scores: { ...roundData },
            playerNames: Object.fromEntries(players.map(p => [p.id, p.name])),
        });

        modalEndRound.close();
        saveState();
        checkEstouros();
    }

    // =============================================
    // ESTOURO E REBUY
    // =============================================

    async function checkEstouros() {
        for (const player of players) {
            if (!player.eliminated && player.score < 0) {
                const survivors = players.filter(p => p.score >= 0 && !p.eliminated).length;

                if (survivors >= 1) {
                    const confirmed = await showConfirm(
                        `${player.name} ESTOUROU!`,
                        `Pontuação: ${player.score}. Deseja pagar a volta (R$ ${config.rebuy.toFixed(2)})?`
                    );

                    if (confirmed) {
                        const targetScore = players
                            .filter(p => p.score >= 0 && p.id !== player.id && !p.eliminated)
                            .map(p => p.score)
                            .reduce((min, cur) => Math.min(min, cur), 99);

                        player.score = targetScore;
                        player.debt += config.rebuy;
                        player.hasPaid = false;
                        showToast(`${player.name} pagou a volta e voltou com ${targetScore} pontos!`, 'info');
                    } else {
                        player.eliminated = true;
                        showToast(`${player.name} foi eliminado!`, 'error');
                    }
                } else {
                    player.eliminated = true;
                    showToast(`${player.name} foi eliminado!`, 'error');
                }
            }
        }
        saveState();
        renderGame();
    }

    // =============================================
    // HISTÓRICO
    // =============================================

    function openHistory() {
        const container = $('history-content');

        if (roundHistory.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fa-solid fa-clock-rotate-left text-4xl mb-3" aria-hidden="true"></i>
                    <p>Nenhuma rodada registrada ainda.</p>
                </div>
            `;
        } else {
            let html = '';
            [...roundHistory].reverse().forEach(round => {
                html += `<div class="bg-gray-50 rounded-lg p-3">
                    <div class="font-bold text-green-700 text-sm mb-2">Rodada ${round.round}</div>`;
                Object.entries(round.scores).forEach(([id, lost]) => {
                    const name = escapeHtml(round.playerNames[id] || 'Desconhecido');
                    html += `
                        <div class="flex justify-between gap-2 text-sm py-1 border-b border-gray-100 last:border-0">
                            <span class="text-gray-700 truncate min-w-0">${name}</span>
                            <span class="font-mono shrink-0 ${lost > 0 ? 'text-red-500' : 'text-gray-400'}">-${lost}</span>
                        </div>`;
                });
                html += '</div>';
            });
            container.innerHTML = html;
        }

        modalHistory.showModal();
    }

    // =============================================
    // RENDERIZAÇÃO (UI)
    // =============================================

    function renderGame() {
        // Pote
        const totalPot = players.reduce((sum, p) => sum + p.debt, 0);
        totalPotEl.textContent = totalPot.toFixed(2);

        // Contador de rodadas
        if (currentRound > 0) {
            roundCounterEl.textContent = `Rodada ${currentRound}`;
        } else {
            roundCounterEl.textContent = '';
        }

        // Ordenar: ativos por score desc, depois eliminados
        const sorted = [...players].sort((a, b) => {
            if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
            return b.score - a.score;
        });

        // Checar vencedor
        const activePlayers = players.filter(p => !p.eliminated);
        const hasWinner = activePlayers.length === 1 && players.length > 1 && players.filter(p => p.eliminated).length > 0;

        if (hasWinner) {
            winnerBanner.classList.remove('hidden');
            winnerNameEl.textContent = activePlayers[0].name;
        } else {
            winnerBanner.classList.add('hidden');
        }

        // Lista de jogadores
        const list = playersListEl;

        if (sorted.length === 0) {
            list.innerHTML = `
                <div class="col-span-full text-center text-white opacity-70 mt-10 animate-fade-in">
                    <i class="fa-solid fa-users text-5xl mb-4 block" aria-hidden="true"></i>
                    <p class="text-lg">Adicione jogadores para começar!</p>
                    <p class="text-sm mt-2 opacity-70">Toque no botão <i class="fa-solid fa-user-plus" aria-hidden="true"></i> acima</p>
                </div>`;
        } else {
            let html = '';
            sorted.forEach((p, index) => {
                const isWinner = hasWinner && !p.eliminated;
                const cardColor = p.eliminated ? 'bg-gray-400' : isWinner ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-white';
                const scoreColor = p.score < 0 ? 'bg-red-500 text-white' : 'bg-green-100 text-green-800';
                const moneyIcon = p.hasPaid ? 'text-green-600 fa-circle-check' : 'text-red-500 fa-sack-dollar';
                const moneyText = p.hasPaid ? 'Pago' : `Deve R$ ${p.debt.toFixed(2)}`;
                const textColor = p.eliminated ? 'line-through text-gray-600' : 'text-gray-800';
                const safeName = escapeHtml(p.name);

                html += `
                <div class="player-card ${cardColor} rounded-xl shadow p-3 flex items-center gap-3 animate-slide-up" style="animation-delay: ${index * 0.05}s">
                    <div class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${p.eliminated ? 'bg-black text-white' : isWinner ? 'bg-yellow-400 text-yellow-900' : scoreColor}">
                        ${p.eliminated ? '<i class="fa-solid fa-skull" aria-hidden="true"></i>' : isWinner ? '<i class="fa-solid fa-crown" aria-hidden="true"></i>' : p.score}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="font-bold ${textColor} text-sm truncate">${safeName}</div>
                        ${!p.eliminated && p.debt > 0 ? `<div class="text-xs text-gray-500 truncate">${moneyText}</div>` : ''}
                        ${isWinner ? '<div class="text-xs text-yellow-600 font-bold">Vencedor!</div>' : ''}
                    </div>
                    ${!p.eliminated ? `
                    <button type="button" data-toggle-payment="${p.id}"
                        class="shrink-0 text-2xl active:scale-90 transition-all focus:ring-2 focus:ring-green-300 focus:outline-none rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="${p.hasPaid ? 'Desmarcar pagamento de ' + safeName : 'Marcar pagamento de ' + safeName}">
                        <i class="fa-solid ${moneyIcon}" aria-hidden="true"></i>
                    </button>
                    ` : ''}
                </div>`;
            });
            list.innerHTML = html;
        }

        // Controla botão de fechar rodada
        const activeCount = activePlayers.length;
        btnEndRound.disabled = activeCount < 2;

        if (hasWinner) {
            btnEndRound.disabled = true;
            btnEndRound.textContent = 'JOGO ENCERRADO';
        } else {
            btnEndRound.textContent = 'FECHAR RODADA';
        }
    }

    // =============================================
    // EVENT LISTENERS
    // =============================================

    function init() {
        // Tela de setup
        $('btn-start-game').addEventListener('click', startGame);

        // Enter nos inputs de setup
        entryFeeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') rebuyFeeInput.focus();
        });
        rebuyFeeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') startGame();
        });

        // Header do jogo
        $('btn-new-game').addEventListener('click', newGame);
        $('btn-add-player').addEventListener('click', () => {
            newPlayerNameInput.value = '';
            modalAddPlayer.showModal();
            setTimeout(() => newPlayerNameInput.focus(), 100);
        });
        $('btn-history').addEventListener('click', openHistory);

        // Modal adicionar jogador
        $('btn-confirm-add').addEventListener('click', confirmAddPlayer);
        $('btn-cancel-add').addEventListener('click', () => modalAddPlayer.close());
        newPlayerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmAddPlayer();
        });

        // Modal fim de rodada
        btnEndRound.addEventListener('click', openEndRoundModal);
        $('btn-process-round').addEventListener('click', processRound);
        $('btn-cancel-round').addEventListener('click', () => modalEndRound.close());

        // Modal histórico
        $('btn-close-history').addEventListener('click', () => modalHistory.close());

        // Delegação de evento para botões de pagamento
        playersListEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-toggle-payment]');
            if (btn) {
                const id = parseInt(btn.dataset.togglePayment);
                togglePayment(id);
            }
        });

        // Prevenir perda acidental
        window.addEventListener('beforeunload', (e) => {
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { showToast };
})();
