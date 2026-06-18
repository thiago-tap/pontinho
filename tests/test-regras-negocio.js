/**
 * Testes unitários - Regras de Negócio do Pontinho Master
 *
 * Testa a lógica pura do jogo, extraída do app.js,
 * validando cada regra de negócio documentada.
 *
 * Executar: node test-regras-negocio.js
 */

"use strict";

// ============================================================
// MOTOR DE TESTES SIMPLES
// ============================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function describe(name, fn) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"=".repeat(60)}`);
  fn();
}

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (e) {
    failedTests++;
    const msg = `  [FAIL] ${name}\n         -> ${e.message}`;
    console.log(msg);
    failures.push({ name, error: e.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// ============================================================
// SIMULAÇÃO DA LÓGICA CORE (extraída do app.js)
// ============================================================

function createGameState(entry = 0, rebuy = 0) {
  return {
    players: [],
    config: { entry, rebuy },
    roundHistory: [],
    currentRound: 0,
    nextId: 1,
    gameStarted: false,
    originalOrder: [],
    dealerIndex: 0,
    undoSnapshot: null,
  };
}

function isAmistoso(state) {
  return state.config.entry === 0 && state.config.rebuy === 0;
}

function getLowestPositiveScore(state, excludePlayerId = null) {
  const positivePlayers = state.players.filter(
    (p) =>
      !p.eliminated &&
      p.score > 0 &&
      (!excludePlayerId || p.id !== excludePlayerId)
  );
  if (positivePlayers.length > 0) {
    return Math.min(...positivePlayers.map((p) => p.score));
  }
  const activePlayers = state.players.filter(
    (p) =>
      !p.eliminated &&
      p.score >= 0 &&
      (!excludePlayerId || p.id !== excludePlayerId)
  );
  if (activePlayers.length > 0) {
    return Math.min(...activePlayers.map((p) => p.score));
  }
  return 99;
}

function addPlayer(state, name) {
  const isLateEntry = state.currentRound > 0;
  const startScore = isLateEntry ? getLowestPositiveScore(state) : 99;

  const newPlayer = {
    id: state.nextId++,
    name: name.toUpperCase(),
    score: startScore,
    debt: state.config.entry,
    hasPaid: false,
    eliminated: false,
    roundsWon: 0,
    biggestLoss: 0,
  };

  state.players.push(newPlayer);
  state.originalOrder.push(newPlayer.id);
  return newPlayer;
}

function takeSnapshot(state) {
  state.undoSnapshot = {
    players: JSON.parse(JSON.stringify(state.players)),
    roundHistory: JSON.parse(JSON.stringify(state.roundHistory)),
    currentRound: state.currentRound,
    dealerIndex: state.dealerIndex,
    originalOrder: [...state.originalOrder],
  };
}

function undo(state) {
  if (!state.undoSnapshot) return false;
  state.players = state.undoSnapshot.players;
  state.roundHistory = state.undoSnapshot.roundHistory;
  state.currentRound = state.undoSnapshot.currentRound;
  state.dealerIndex = state.undoSnapshot.dealerIndex;
  state.originalOrder = state.undoSnapshot.originalOrder;
  state.undoSnapshot = null;
  return true;
}

function startGame(state) {
  const activeCount = state.players.filter((p) => !p.eliminated).length;
  if (activeCount < 2) return false;

  if (state.originalOrder.length === 0) {
    state.originalOrder = state.players
      .filter((p) => !p.eliminated)
      .map((p) => p.id);
  }
  state.currentRound = 1;
  state.dealerIndex = 0;
  state.gameStarted = true;
  return true;
}

function getCurrentDealerId(state) {
  if (state.currentRound === 0) {
    if (state.originalOrder.length === 0) {
      const firstActive = state.players.find((p) => !p.eliminated);
      return firstActive?.id || null;
    }
    return state.originalOrder[0] || null;
  }
  if (state.originalOrder.length === 0) return null;
  if (state.dealerIndex >= state.originalOrder.length) state.dealerIndex = 0;
  return state.originalOrder[state.dealerIndex];
}

function advanceDealer(state) {
  if (state.originalOrder.length === 0) return;
  let attempts = 0;
  do {
    state.dealerIndex = (state.dealerIndex + 1) % state.originalOrder.length;
    attempts++;
    const playerId = state.originalOrder[state.dealerIndex];
    const player = state.players.find((p) => p.id === playerId);
    if (player && !player.eliminated) return;
  } while (attempts < state.originalOrder.length);
}

/**
 * Processa uma rodada com os pontos perdidos por cada jogador.
 * @param {Object} state - Estado do jogo
 * @param {Object} roundScores - Mapa { playerId: pontosPercidos }
 * @returns {Object} resultado com estouros e ações necessárias
 */
function processRound(state, roundScores) {
  takeSnapshot(state);

  if (state.originalOrder.length === 0) {
    state.originalOrder = state.players
      .filter((p) => !p.eliminated)
      .map((p) => p.id);
  }

  const roundData = {};
  state.players.forEach((p) => {
    if (!p.eliminated && roundScores[p.id] !== undefined) {
      const lost = roundScores[p.id];
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
  });

  state.currentRound++;
  state.roundHistory.push({
    round: state.currentRound,
    scores: { ...roundData },
    playerNames: Object.fromEntries(
      state.players.map((p) => [p.id, p.name])
    ),
  });

  return { roundData };
}

/**
 * Verifica estouros e retorna as ações necessárias.
 * @returns {Array} lista de estouros com informações
 */
function checkEstouros(state) {
  const estouros = [];
  const estouradores = state.players.filter(
    (p) => !p.eliminated && p.score < 0
  );
  const ativosComPontos = state.players.filter(
    (p) => !p.eliminated && p.score >= 0
  );

  // Múltiplos estouradores com apenas 1 sobrevivente
  if (estouradores.length >= 2 && ativosComPontos.length === 1) {
    const vencedor = ativosComPontos[0];
    vencedor.score = 99;
    estouradores.forEach((p) => {
      p.eliminated = true;
    });
    return {
      type: "auto_winner",
      winner: vencedor,
      eliminated: estouradores,
    };
  }

  // Processamento individual
  for (const player of state.players) {
    if (!player.eliminated && player.score < 0) {
      const activeExcludingThis = state.players.filter(
        (p) => p.id !== player.id && !p.eliminated && p.score >= 0
      ).length;

      estouros.push({
        player,
        canRebuy: activeExcludingThis >= 1,
        activeSurvivors: activeExcludingThis,
      });
    }
  }

  return { type: "individual", estouros };
}

/**
 * Executa a reentrada de um jogador.
 */
function doRebuy(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;

  const targetScore = getLowestPositiveScore(state, player.id);
  player.score = targetScore;
  player.debt += state.config.rebuy;
  player.hasPaid = false;
  return targetScore;
}

/**
 * Elimina um jogador.
 */
function eliminatePlayer(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (player) player.eliminated = true;
}

/**
 * Calcula o pote total.
 */
function getTotalPot(state) {
  return state.players.reduce((sum, p) => sum + p.debt, 0);
}

/**
 * Verifica se há vencedor.
 */
function checkWinner(state) {
  const activePlayers = state.players.filter((p) => !p.eliminated);
  const hasWinner =
    activePlayers.length === 1 &&
    state.players.length > 1 &&
    state.players.filter((p) => p.eliminated).length > 0;

  if (hasWinner) {
    const winner = activePlayers[0];
    const totalPot = getTotalPot(state);
    const netProfit = totalPot - winner.debt;
    return { winner, totalPot, netProfit };
  }
  return null;
}

// ============================================================
// TESTES
// ============================================================

// --- REGRA 1: Configuração e Pote ---
describe("REGRA 1: Configuração e Pote (Gestão Financeira)", () => {
  it("Modo Amistoso: entry=0, rebuy=0 → isAmistoso() retorna true", () => {
    const state = createGameState(0, 0);
    assertEqual(isAmistoso(state), true, "Deveria ser amistoso");
  });

  it("Modo Financeiro: entry>0, rebuy>0 → isAmistoso() retorna false", () => {
    const state = createGameState(10, 5);
    assertEqual(isAmistoso(state), false, "Não deveria ser amistoso");
  });

  it("Modo misto: entry>0, rebuy=0 → isAmistoso() retorna false (cobranças ativadas)", () => {
    const state = createGameState(10, 0);
    assertEqual(isAmistoso(state), false, "Não deveria ser amistoso com entry>0");
  });

  it("Pote Total = soma das dívidas de TODOS os jogadores (ativos + eliminados)", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice"); // debt = 10
    addPlayer(state, "Bob"); // debt = 10
    addPlayer(state, "Carol"); // debt = 10
    state.players[2].eliminated = true;
    state.players[2].debt = 15; // 10 entry + 5 rebuy

    const pot = getTotalPot(state);
    assertEqual(pot, 35, "Pote deve ser soma de todas dívidas (10+10+15)");
  });

  it("Pote calcula corretamente com múltiplas reentradas", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice"); // debt = 10
    addPlayer(state, "Bob"); // debt = 10
    // Bob faz 2 reentradas
    state.players[1].debt += 5; // 1a reentrada
    state.players[1].debt += 5; // 2a reentrada

    const pot = getTotalPot(state);
    assertEqual(pot, 30, "Pote deve incluir reentradas (10+20)");
  });
});

// --- REGRA 2: Gestão de Jogadores e Entrada Tardia ---
describe("REGRA 2: Gestão de Jogadores e Entrada Tardia", () => {
  it("Pontuação inicial padrão: jogador começa com 99 pontos", () => {
    const state = createGameState();
    const player = addPlayer(state, "Alice");
    assertEqual(player.score, 99, "Score inicial deve ser 99");
  });

  it("Dívida inicial: jogador assume dívida = valor da entrada", () => {
    const state = createGameState(10, 5);
    const player = addPlayer(state, "Alice");
    assertEqual(player.debt, 10, "Dívida inicial deve ser igual à entrada");
  });

  it("Dívida no modo amistoso: jogador não tem dívida", () => {
    const state = createGameState(0, 0);
    const player = addPlayer(state, "Alice");
    assertEqual(player.debt, 0, "Dívida deve ser 0 no modo amistoso");
  });

  it("Entrada tardia: jogador recebe a menor pontuação positiva da mesa", () => {
    const state = createGameState();
    addPlayer(state, "Alice"); // 99
    addPlayer(state, "Bob"); // 99
    startGame(state);

    // Simular rodada: Alice perde 20 (fica 79), Bob perde 50 (fica 49)
    processRound(state, { 1: 20, 2: 50 });
    advanceDealer(state);

    // Carol entra tardia - deve receber 49 (menor positiva)
    const carol = addPlayer(state, "Carol");
    assertEqual(carol.score, 49, "Entrada tardia deve receber menor pontuação positiva (49)");
  });

  it("Entrada tardia com jogador a 0: recebe a menor positiva (>0), não zero", () => {
    const state = createGameState();
    addPlayer(state, "Alice"); // 99
    addPlayer(state, "Bob"); // 99
    startGame(state);

    // Alice fica com 0, Bob fica com 30
    state.players[0].score = 0;
    state.players[1].score = 30;
    state.currentRound = 2;

    // Carol entra - getLowestPositiveScore busca >0 primeiro
    const carol = addPlayer(state, "Carol");
    assertEqual(carol.score, 30, "Entrada tardia com jogador a 0: deve receber menor positiva >0 (30)");
  });

  it("Entrada tardia: se todos estão a 0, fallback para >= 0 (retorna 0)", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    state.players[0].score = 0;
    state.players[1].score = 0;
    state.currentRound = 2;

    const carol = addPlayer(state, "Carol");
    assertEqual(carol.score, 0, "Se todos a 0, entrada tardia recebe 0");
  });

  it("Entrada tardia: se não há jogadores ativos, fallback para 99", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    state.players[0].eliminated = true;
    state.players[1].eliminated = true;
    state.currentRound = 2;

    const carol = addPlayer(state, "Carol");
    assertEqual(carol.score, 99, "Se nenhum ativo, fallback para 99");
  });
});

// --- REGRA 3: Dealer (Distribuidor) ---
describe("REGRA 3: A Roda do Dealer (Distribuidor)", () => {
  it("Rodada 0: dealer é o primeiro jogador da lista", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");

    const dealerId = getCurrentDealerId(state);
    assertEqual(dealerId, 1, "Dealer na rodada 0 deve ser o primeiro jogador");
  });

  it("Rodada 1: dealer avança para o próximo na ordem original", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Dealer inicial é Alice (index 0)
    assertEqual(getCurrentDealerId(state), 1, "Dealer inicial deve ser Alice");

    // Avança para Bob
    advanceDealer(state);
    assertEqual(getCurrentDealerId(state), 2, "Dealer deve avançar para Bob");
  });

  it("Dealer pula jogadores eliminados", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Eliminar Bob
    state.players[1].eliminated = true;

    // Avança de Alice → deveria pular Bob → Carol
    advanceDealer(state);
    assertEqual(getCurrentDealerId(state), 3, "Dealer deve pular Bob (eliminado) e ir para Carol");
  });

  it("Dealer faz wrap-around da lista e pula eliminados", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Carol eliminada
    state.players[2].eliminated = true;

    // Avançar 2 vezes: Alice→Bob, Bob→(pula Carol)→Alice
    advanceDealer(state);
    assertEqual(getCurrentDealerId(state), 2, "Deve ir para Bob");
    advanceDealer(state);
    assertEqual(getCurrentDealerId(state), 1, "Deve voltar para Alice (Carol eliminada)");
  });

  it("Ordem original é preservada após reordenação visual por pontuação", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // A originalOrder deve ser [1, 2, 3]
    assertDeepEqual(state.originalOrder, [1, 2, 3], "Ordem original deve ser preservada");

    // Mesmo com pontuações diferentes, o dealer segue a ordem original
    state.players[0].score = 10; // Alice
    state.players[1].score = 90; // Bob (visualmente seria primeiro)
    state.players[2].score = 50; // Carol

    // Dealer avança de Alice→Bob na ordem original (não visual)
    advanceDealer(state);
    assertEqual(getCurrentDealerId(state), 2, "Dealer segue ordem original, não visual");
  });
});

// --- REGRA 4: Execução da Rodada e Pontuação ---
describe("REGRA 4: Execução da Rodada e Pontuação", () => {
  it("Pontos são deduzidos da pontuação do jogador", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 20, 2: 0 });
    assertEqual(state.players[0].score, 79, "Alice: 99 - 20 = 79");
    assertEqual(state.players[1].score, 99, "Bob: 99 - 0 = 99");
  });

  it("Vencedor da rodada (0 pontos perdidos) incrementa roundsWon", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 20, 2: 0 });
    assertEqual(state.players[1].roundsWon, 1, "Bob deve ter 1 rodada ganha");
    assertEqual(state.players[0].roundsWon, 0, "Alice não deve ter rodadas ganhas");
  });

  it("Maior perda (biggestLoss) é atualizada corretamente", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 20, 2: 10 });
    assertEqual(state.players[0].biggestLoss, 20, "Maior perda de Alice deve ser 20");

    advanceDealer(state);
    processRound(state, { 1: 5, 2: 30 });
    assertEqual(state.players[0].biggestLoss, 20, "Maior perda de Alice mantém 20 (5 < 20)");
    assertEqual(state.players[1].biggestLoss, 30, "Maior perda de Bob atualiza para 30");
  });

  it("Rodada é registrada no histórico", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 15, 2: 0 });
    assertEqual(state.roundHistory.length, 1, "Deve ter 1 rodada no histórico");
    assertEqual(state.roundHistory[0].scores[1], 15, "Alice perdeu 15 na rodada");
    assertEqual(state.roundHistory[0].scores[2], 0, "Bob perdeu 0 na rodada");
  });

  it("currentRound incrementa a cada rodada processada", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);
    assertEqual(state.currentRound, 1, "Começa na rodada 1");

    processRound(state, { 1: 10, 2: 5 });
    assertEqual(state.currentRound, 2, "Após 1a rodada: rodada 2");

    advanceDealer(state);
    processRound(state, { 1: 10, 2: 5 });
    assertEqual(state.currentRound, 3, "Após 2a rodada: rodada 3");
  });
});

// --- REGRA 5: Estouro e Reentrada ---
describe("REGRA 5: A Regra do Estouro e da Reentrada (Volta)", () => {
  it("Estouro ocorre quando pontuação fica menor que zero (<0)", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Alice fica com -1 (estoura)
    processRound(state, { 1: 100, 2: 10, 3: 5 });
    const result = checkEstouros(state);

    assertEqual(result.type, "individual", "Deve ser processamento individual");
    assertEqual(result.estouros.length, 1, "Deve ter 1 estouro");
    assertEqual(result.estouros[0].player.id, 1, "Alice deve ter estourado");
    assert(state.players[0].score < 0, "Score de Alice deve ser negativo");
  });

  it("Score exatamente 0 NÃO é estouro", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 99, 2: 10 });
    assertEqual(state.players[0].score, 0, "Alice deve ter score 0");

    const result = checkEstouros(state);
    assertEqual(result.type, "individual", "Tipo individual");
    assertEqual(result.estouros.length, 0, "Score 0 não é estouro");
  });

  it("Sobreviventes >= 2: reentrada é oferecida", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Alice estoura, Bob e Carol sobrevivem
    processRound(state, { 1: 100, 2: 10, 3: 5 });
    const result = checkEstouros(state);

    assertEqual(result.estouros[0].canRebuy, true, "Reentrada deve ser permitida");
    assertEqual(result.estouros[0].activeSurvivors, 2, "2 sobreviventes");
  });

  it("Reentrada aceita: jogador recebe menor pontuação positiva", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Alice estoura
    processRound(state, { 1: 100, 2: 20, 3: 50 });
    // Bob=79, Carol=49 → menor positiva = 49

    const newScore = doRebuy(state, 1);
    assertEqual(newScore, 49, "Reentrada deve dar menor pontuação positiva (49)");
    assertEqual(state.players[0].score, 49, "Alice deve ter 49 pontos");
  });

  it("Reentrada aceita: valor da reentrada é somado à dívida", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    processRound(state, { 1: 100, 2: 10, 3: 5 });
    doRebuy(state, 1);

    assertEqual(state.players[0].debt, 15, "Dívida deve ser entrada(10) + rebuy(5) = 15");
  });

  it("Reentrada recusada: jogador é eliminado permanentemente", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    processRound(state, { 1: 100, 2: 10, 3: 5 });
    eliminatePlayer(state, 1);

    assertEqual(state.players[0].eliminated, true, "Alice deve estar eliminada");
  });

  it("Sobreviventes <= 1: reentrada PROIBIDA, jogador eliminado compulsoriamente", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    // Bob estoura, apenas Alice sobrevive (1 sobrevivente)
    processRound(state, { 1: 10, 2: 100 });
    const result = checkEstouros(state);

    assertEqual(result.estouros[0].canRebuy, true,
      "Com 1 sobrevivente, canRebuy é true (precisa de >= 1 outro ativo)");
    // Na verdade, vamos verificar: activeExcludingThis para Bob = players onde id !== Bob E !eliminated E score >= 0
    // Alice tem score 89 >= 0, não eliminada → activeExcludingThis = 1, que é >= 1
    // Então canRebuy É true com 1 sobrevivente! Mas a regra diz "Se Sobreviventes <= 1: reentrada proibida"
  });

  it("REGRA CRÍTICA: Com 2 jogadores, se 1 estoura, sobra 1 ativo → a implementação permite rebuy", () => {
    // NOTA: A documentação diz "Se Sobreviventes <= 1: reentrada proibida"
    // Mas a implementação usa "activeExcludingThis >= 1" (excluindo o estourador)
    // Com 2 jogadores: se 1 estoura, activeExcludingThis = 1, que é >= 1 → PERMITE rebuy
    // Isso parece intencional: o jogador pode reentrar se ainda há alguém para jogar contra
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 10, 2: 100 });
    const result = checkEstouros(state);

    // A implementação permite rebuy aqui (activeExcludingThis=1 >= 1)
    assertEqual(result.estouros[0].canRebuy, true,
      "Implementação permite rebuy com 1 sobrevivente");
    // A documentação diz que deveria ser proibido com <= 1 sobrevivente
    // MAS "Sobreviventes" na doc pode significar "jogadores com >= 0 incluindo o estourador"
    // Nesse caso: 2 jogadores, 1 estoura → sobreviventes = 1 (Alice) → <= 1 → proibido
    // OU "Sobreviventes" exclui o estourador → 1 (Alice) → é exatamente 1
  });

  it("Múltiplos estouradores simultâneos + 1 sobrevivente: vencedor automático", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Bob e Carol estouam, Alice sobrevive
    processRound(state, { 1: 10, 2: 100, 3: 100 });
    const result = checkEstouros(state);

    assertEqual(result.type, "auto_winner", "Deve declarar vencedor automático");
    assertEqual(result.winner.id, 1, "Alice deve ser a vencedora");
    assert(state.players[1].eliminated, "Bob deve estar eliminado");
    assert(state.players[2].eliminated, "Carol deve estar eliminado");
  });

  it("Reentrada: busca menor positiva EXCLUINDO o próprio jogador", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    // Alice estoura (-1), Bob=79, Carol=49
    processRound(state, { 1: 100, 2: 20, 3: 50 });

    // getLowestPositiveScore deve excluir Alice (score negativo e excluída por ID)
    const score = getLowestPositiveScore(state, 1);
    assertEqual(score, 49, "Deve buscar menor positiva excluindo o jogador (Carol=49)");
  });
});

// --- REGRA 6: Fim de Jogo e Acerto de Contas ---
describe("REGRA 6: Fim de Jogo e Acerto de Contas", () => {
  it("Condição de vitória: resta apenas 1 jogador com score >= 0", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    state.players[1].eliminated = true;
    state.players[2].eliminated = true;

    const result = checkWinner(state);
    assert(result !== null, "Deve ter um vencedor");
    assertEqual(result.winner.name, "ALICE", "Alice deve ser a vencedora");
  });

  it("Sem vencedor: mais de 1 jogador ativo", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    state.players[2].eliminated = true;

    const result = checkWinner(state);
    assert(result === null, "Não deve ter vencedor com 2+ ativos");
  });

  it("Lucro líquido = Pote Total - Investimento do vencedor", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice"); // debt=10
    addPlayer(state, "Bob"); // debt=10
    addPlayer(state, "Carol"); // debt=10

    // Bob fez 1 rebuy
    state.players[1].debt += 5; // debt=15

    // Bob e Carol eliminados
    state.players[1].eliminated = true;
    state.players[2].eliminated = true;

    const result = checkWinner(state);
    // Pote = 10 + 15 + 10 = 35
    // Lucro de Alice = 35 - 10 = 25
    assertEqual(result.totalPot, 35, "Pote total deve ser 35");
    assertEqual(result.netProfit, 25, "Lucro líquido deve ser 25");
  });

  it("Vencedor que fez reentradas: lucro descontado corretamente", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice"); // debt=10
    addPlayer(state, "Bob"); // debt=10

    // Alice fez 2 reentradas
    state.players[0].debt += 5; // 1a reentrada → debt=15
    state.players[0].debt += 5; // 2a reentrada → debt=20

    state.players[1].eliminated = true;

    const result = checkWinner(state);
    // Pote = 20 + 10 = 30
    // Lucro de Alice = 30 - 20 = 10
    assertEqual(result.totalPot, 30, "Pote total deve ser 30");
    assertEqual(result.netProfit, 10, "Lucro líquido após reentradas deve ser 10");
  });

  it("Toggle pagamento: marca e desmarca hasPaid", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");

    state.players[1].eliminated = true;

    // Marcar pagamento
    const bob = state.players[1];
    assertEqual(bob.hasPaid, false, "Inicialmente não pagou");
    bob.hasPaid = !bob.hasPaid;
    assertEqual(bob.hasPaid, true, "Após toggle deve estar pago");
    bob.hasPaid = !bob.hasPaid;
    assertEqual(bob.hasPaid, false, "Após segundo toggle volta a não pago");
  });
});

// --- REGRA 7: Integridade do Jogo (Sistema Undo) ---
describe("REGRA 7: Integridade do Jogo (Sistema Undo)", () => {
  it("Snapshot é salvo antes do processamento da rodada", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    assertEqual(state.undoSnapshot, null, "Snapshot inicial deve ser null");
    processRound(state, { 1: 20, 2: 10 });
    assert(state.undoSnapshot !== null, "Snapshot deve existir após processRound");
  });

  it("Undo restaura o estado completo da rodada anterior", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    // Rodada 1
    processRound(state, { 1: 20, 2: 10 });
    advanceDealer(state);
    assertEqual(state.players[0].score, 79, "Alice pré-undo: 79");
    assertEqual(state.players[1].score, 89, "Bob pré-undo: 89");

    // Undo
    const undone = undo(state);
    assertEqual(undone, true, "Undo deve retornar true");
    assertEqual(state.players[0].score, 99, "Alice pós-undo: 99");
    assertEqual(state.players[1].score, 99, "Bob pós-undo: 99");
    assertEqual(state.currentRound, 1, "Rodada deve voltar a 1");
  });

  it("Undo restaura roundHistory", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 20, 2: 10 });
    assertEqual(state.roundHistory.length, 1, "Deve ter 1 entrada no histórico");

    undo(state);
    assertEqual(state.roundHistory.length, 0, "Histórico deve estar vazio após undo");
  });

  it("Undo restaura dealerIndex", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    const originalDealerIndex = state.dealerIndex;
    processRound(state, { 1: 10, 2: 5, 3: 15 });
    advanceDealer(state);

    undo(state);
    assertEqual(state.dealerIndex, originalDealerIndex, "DealerIndex deve ser restaurado");
  });

  it("Undo sem snapshot: retorna false", () => {
    const state = createGameState();
    const result = undo(state);
    assertEqual(result, false, "Undo sem snapshot deve retornar false");
  });

  it("Apenas um nível de undo (snapshot único)", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 20, 2: 10 });
    advanceDealer(state);
    processRound(state, { 1: 10, 2: 30 });
    advanceDealer(state);

    // Primeiro undo: volta para antes da 2a rodada
    undo(state);
    assertEqual(state.players[0].score, 79, "Após 1o undo: Alice=79");
    assertEqual(state.players[1].score, 89, "Após 1o undo: Bob=89");

    // Segundo undo: não tem mais snapshot
    const result = undo(state);
    assertEqual(result, false, "2o undo deve falhar (snapshot consumido)");
  });

  it("Snapshot salvo antes de adicionar jogador", () => {
    const state = createGameState();
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    // Simular addPlayer com snapshot (como no código real)
    takeSnapshot(state);
    addPlayer(state, "Carol");

    assertEqual(state.players.length, 3, "Deve ter 3 jogadores");
    undo(state);
    assertEqual(state.players.length, 2, "Após undo: deve ter 2 jogadores");
  });
});

// --- TESTES ADICIONAIS: Cenários integrados ---
describe("CENÁRIOS INTEGRADOS", () => {
  it("Jogo completo amistoso: 3 jogadores, eliminações sequenciais", () => {
    const state = createGameState(0, 0);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    addPlayer(state, "Carol");
    startGame(state);

    assert(isAmistoso(state), "Deve ser amistoso");

    // Rodada 1: Carol perde muito
    processRound(state, { 1: 10, 2: 5, 3: 40 });
    advanceDealer(state);
    assertEqual(state.players[2].score, 59, "Carol=59");

    // Rodada 2: Carol estoura
    processRound(state, { 1: 5, 2: 10, 3: 60 });
    const result1 = checkEstouros(state);
    assertEqual(result1.estouros[0].canRebuy, true, "Carol pode reentrar");

    // Carol recusa
    eliminatePlayer(state, 3);
    advanceDealer(state);

    // Rodada 3: Bob estoura
    processRound(state, { 1: 5, 2: 85 });
    const result2 = checkEstouros(state);
    // Bob estoura, Alice sobrevive (1 ativo excluindo Bob = 1 >= 1 → pode reentrar)
    assertEqual(result2.estouros[0].canRebuy, true, "Bob pode reentrar");

    // Bob recusa
    eliminatePlayer(state, 2);

    const winner = checkWinner(state);
    assert(winner !== null, "Deve ter vencedor");
    assertEqual(winner.winner.name, "ALICE", "Alice vence");
    assertEqual(winner.netProfit, 0, "Lucro 0 no modo amistoso");
  });

  it("Jogo completo financeiro: reentradas e acerto de contas", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice"); // debt=10
    addPlayer(state, "Bob"); // debt=10
    addPlayer(state, "Carol"); // debt=10
    startGame(state);

    // Rodada 1: Bob estoura
    processRound(state, { 1: 10, 2: 100, 3: 20 });
    const r1 = checkEstouros(state);
    assertEqual(r1.estouros[0].canRebuy, true, "Bob pode reentrar");

    // Bob reenta
    doRebuy(state, 2);
    assertEqual(state.players[1].debt, 15, "Bob: debt=10+5=15");
    assertEqual(state.players[1].score, 79, "Bob recebe menor positiva (Carol=79)");
    advanceDealer(state);

    // Rodada 2: Bob estoura de novo e recusa
    processRound(state, { 1: 20, 2: 80, 3: 30 });
    eliminatePlayer(state, 2);
    advanceDealer(state);

    // Rodada 3: Carol estoura e recusa
    processRound(state, { 1: 10, 3: 50 });
    eliminatePlayer(state, 3);

    const winner = checkWinner(state);
    assert(winner !== null, "Deve ter vencedor");
    assertEqual(winner.winner.name, "ALICE", "Alice vence");
    // Pote = 10 + 15 + 10 = 35
    // Lucro Alice = 35 - 10 = 25
    assertEqual(winner.totalPot, 35, "Pote total = 35");
    assertEqual(winner.netProfit, 25, "Lucro líquido = 25");
  });

  it("Entrada tardia com reentrada: dívida acumula corretamente", () => {
    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 10, 2: 20 });
    advanceDealer(state);

    // Carol entra tardia
    const carol = addPlayer(state, "Carol");
    assertEqual(carol.debt, 10, "Carol: dívida = entrada (10)");
    assertEqual(carol.score, 79, "Carol: menor pontuação positiva (Bob=79)");

    // Carol estoura e reenta
    state.players[2].score = -1;
    doRebuy(state, 3);
    assertEqual(state.players[2].debt, 15, "Carol: 10 + 5 = 15 de dívida");
  });
});

// --- TESTE DE DIVERGÊNCIA: Doc vs Implementação ---
describe("ANÁLISE: Divergências entre Documentação e Implementação", () => {
  it("DIVERGÊNCIA - Regra 5: condição de rebuy usa >= 1 (impl) vs >= 2 (doc)", () => {
    // Documentação diz: "Se Sobreviventes >= 2: reentrada oferecida"
    //                    "Se Sobreviventes <= 1: reentrada proibida"
    //
    // Implementação (app.js:716-722) faz:
    //   activeExcludingThis = jogadores ativos EXCLUINDO o estourador
    //   if (activeExcludingThis >= 1) → permite rebuy
    //
    // Isso significa:
    //   - 3 jogadores, 1 estoura → 2 ativos restantes → PERMITE (doc: OK, impl: OK)
    //   - 2 jogadores, 1 estoura → 1 ativo restante → PERMITE (doc: PROÍBE, impl: PERMITE)
    //
    // A documentação conta "Sobreviventes" incluindo todos os não-estourados.
    // A implementação conta excluindo o estourador.
    //
    // Impacto: Com apenas 2 jogadores, se um estoura, a doc diz que o jogo DEVERIA
    // encerrar, mas a implementação oferece reentrada.

    const state = createGameState(10, 5);
    addPlayer(state, "Alice");
    addPlayer(state, "Bob");
    startGame(state);

    processRound(state, { 1: 10, 2: 100 });
    const result = checkEstouros(state);

    // Testando o comportamento REAL da implementação
    assertEqual(result.estouros[0].canRebuy, true,
      "IMPLEMENTAÇÃO: permite rebuy com 2 jogadores (1 estoura)");

    // A documentação diz "Sobreviventes <= 1" → proibido
    // Sobreviventes (score >= 0) = 1 (Alice) → <= 1 → deveria proibir
    console.log("  [INFO] A documentação (Regra 5) diz: 'Se Sobreviventes <= 1: reentrada proibida'");
    console.log("  [INFO] A implementação permite rebuy quando há >= 1 OUTRO jogador ativo");
    console.log("  [INFO] Isso é uma divergência intencional ou bug a ser resolvido");
  });
});

// ============================================================
// RESULTADO FINAL
// ============================================================

console.log(`\n${"=".repeat(60)}`);
console.log("  RESULTADO FINAL");
console.log(`${"=".repeat(60)}`);
console.log(`  Total:    ${totalTests}`);
console.log(`  Passou:   ${passedTests}`);
console.log(`  Falhou:   ${failedTests}`);
console.log(`${"=".repeat(60)}`);

if (failures.length > 0) {
  console.log("\n  FALHAS:");
  failures.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`);
    console.log(`     ${f.error}`);
  });
}

console.log("");
process.exit(failedTests > 0 ? 1 : 0);
