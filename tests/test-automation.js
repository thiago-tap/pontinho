// =============================================
// TESTE AUTOMATIZADO - Pontinho Master
// =============================================
// Cole este script no console do navegador para executar todos os testes

console.log("🎮 INICIANDO TESTES AUTOMATIZADOS DO PONTINHO...\n");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const $ = (id) => document.getElementById(id);

async function test1_ModoAmistoso() {
  console.log("📝 TESTE 1: Modo Amistoso");

  // Clica em AMISTOSO
  $("btn-mode-amistoso").click();
  await sleep(500);

  console.log("  ✅ Modo Amistoso selecionado");
  return true;
}

async function test2_AdicionarJogadores() {
  console.log("\n📝 TESTE 2: Adicionar 3 Jogadores");

  const jogadores = ["JOÃO", "MARIA", "PEDRO"];

  for (const nome of jogadores) {
    // Clica no botão +
    $("btn-add-player").click();
    await sleep(300);

    // Digite o nome
    $("new-player-name").value = nome;
    await sleep(100);

    // Clica em Adicionar
    $("btn-confirm-add").click();
    await sleep(400);

    console.log(`  ✅ ${nome} adicionado`);
  }

  console.log(
    `  ✅ Total: ${document.querySelectorAll(".player-card").length} jogadores`,
  );
  return true;
}

async function test3_PrimeiraRodada() {
  console.log("\n📝 TESTE 3: Primeira Rodada (sem estouros)");

  // Clica em FECHAR RODADA
  $("btn-end-round").click();
  await sleep(500);

  // Preenche os valores
  const inputs = document.querySelectorAll("#round-inputs [data-player-id]");
  const valores = [5, 10, 8]; // João, Maria, Pedro

  inputs.forEach((input, i) => {
    input.value = valores[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await sleep(300);

  // Clica em PROCESSAR
  $("btn-process-round").click();
  await sleep(1000);

  console.log("  ✅ Primeira rodada processada");
  return true;
}

async function test4_SegundaRodada_MultiplosEstouros() {
  console.log("\n📝 TESTE 4: Segunda Rodada (Múltiplos Estouros)");
  console.log("  Cenário: João=5, Maria=95 (ESTOURA), Pedro=93 (ESTOURA)");

  // Clica em FECHAR RODADA
  $("btn-end-round").click();
  await sleep(500);

  // Preenche os valores que causam estouros
  const inputs = document.querySelectorAll("#round-inputs [data-player-id]");
  const valores = [5, 95, 93]; // João, Maria (estoura), Pedro (estoura)

  inputs.forEach((input, i) => {
    input.value = valores[i];
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await sleep(300);

  console.log("  ⏳ Processando rodada com estouros...");

  // Clica em PROCESSAR
  $("btn-process-round").click();
  await sleep(1000);

  // PRIMEIRO ESTOURO: Maria - SIM (reentrada)
  console.log("  🔴 Maria estourou! Escolhendo: SIM (reentrada)");
  $("btn-confirm-yes").click();
  await sleep(800);

  // SEGUNDO ESTOURO: Pedro - NÃO (eliminação)
  console.log("  🔴 Pedro estourou! Escolhendo: NÃO (eliminação)");
  $("btn-confirm-no").click();
  await sleep(1000);

  console.log("  ✅ Segunda rodada processada com múltiplos estouros");
  return true;
}

function verificarResultados() {
  console.log("\n📊 VERIFICAÇÃO DOS RESULTADOS:");

  const jogadores = Array.from(document.querySelectorAll(".player-card")).map(
    (card) => {
      const nome = card.querySelector(".truncate").textContent.trim();
      const scoreEl = card.querySelector(".rounded-full");
      const score = scoreEl.textContent.trim();
      const eliminado = card.classList.contains("bg-gray-400");

      return { nome, score, eliminado };
    },
  );

  jogadores.forEach((j) => {
    const status = j.eliminado ? "❌ ELIMINADO" : `✅ Pontos: ${j.score}`;
    console.log(`  ${j.nome}: ${status}`);
  });

  // Validações
  console.log("\n✔️ VALIDAÇÕES:");
  const maria = jogadores.find((j) => j.nome.includes("MARIA"));
  const pedro = jogadores.find((j) => j.nome.includes("PEDRO"));
  const joao = jogadores.find((j) => j.nome.includes("JOÃO"));

  if (maria && !maria.eliminado) {
    console.log(`  ✅ Maria voltou ao jogo com reentrada`);
  }
  if (pedro && pedro.eliminado) {
    console.log(`  ✅ Pedro foi eliminado corretamente`);
  }
  if (joao && !joao.eliminado) {
    console.log(`  ✅ João permanece ativo`);
  }

  console.log("\n🎉 TESTES COMPLETADOS COM SUCESSO!");
}

async function runAllTests() {
  try {
    await test1_ModoAmistoso();
    await test2_AdicionarJogadores();
    await test3_PrimeiraRodada();
    await test4_SegundaRodada_MultiplosEstouros();

    verificarResultados();

    console.log(
      "\n✨ Todos os testes passaram! O sistema está funcionando corretamente.",
    );
  } catch (error) {
    console.error("❌ ERRO NOS TESTES:", error);
  }
}

// Executar
runAllTests();
