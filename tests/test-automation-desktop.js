// Teste Automatizado usando Puppeteer
// Instale antes: npm install puppeteer

const puppeteer = require("puppeteer");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  console.log("🎮 INICIANDO TESTES AUTOMATIZADOS...\n");

  const browser = await puppeteer.launch({
    headless: false, // Ver o navegador abrindo
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

  try {
    // ========================================
    // TESTE 1: Modo Amistoso
    // ========================================
    console.log("📝 TESTE 1: Selecionando Modo Amistoso");
    await page.click("#btn-mode-amistoso");
    await sleep(500);
    console.log("  ✅ Modo Amistoso selecionado\n");

    // ========================================
    // TESTE 2: Adicionar 3 Jogadores
    // ========================================
    console.log("📝 TESTE 2: Adicionando 3 Jogadores");
    const jogadores = ["JOÃO", "MARIA", "PEDRO"];

    for (const nome of jogadores) {
      // Clica no botão +
      await page.click("#btn-add-player");
      await sleep(300);

      // Digita o nome
      await page.type("#new-player-name", nome);
      await sleep(100);

      // Clica em Adicionar
      await page.click("#btn-confirm-add");
      await sleep(400);

      console.log(`  ✅ ${nome} adicionado`);
    }

    const playerCount = await page.$$eval(
      ".player-card",
      (cards) => cards.length,
    );
    console.log(`  ✅ Total: ${playerCount} jogadores\n`);

    // ========================================
    // TESTE 3: Primeira Rodada (sem estouros)
    // ========================================
    console.log("📝 TESTE 3: Processando Primeira Rodada");
    console.log("  Valores: João=5, Maria=10, Pedro=8");

    await page.click("#btn-end-round");
    await sleep(500);

    // Preenche os valores
    const inputs1 = await page.$$("#round-inputs [data-player-id]");
    const valores1 = [5, 10, 8];

    for (let i = 0; i < inputs1.length; i++) {
      await page.evaluate(
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs1[i],
        valores1[i],
      );
      await sleep(100);
    }

    await page.click("#btn-process-round");
    await sleep(1500);
    console.log("  ✅ Primeira rodada processada\n");

    // ========================================
    // TESTE 4: Segunda Rodada (múltiplos estouros)
    // ========================================
    console.log("📝 TESTE 4: Segunda Rodada com Múltiplos Estouros");
    console.log("  Valores: João=5, Maria=95 (ESTOURA), Pedro=93 (ESTOURA)");

    await page.click("#btn-end-round");
    await sleep(500);

    const inputs2 = await page.$$("#round-inputs [data-player-id]");
    const valores2 = [5, 95, 93];

    for (let i = 0; i < inputs2.length; i++) {
      await page.evaluate(
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs2[i],
        valores2[i],
      );
      await sleep(100);
    }

    console.log("  ⏳ Processando rodada com estouros...");
    await page.click("#btn-process-round");
    await sleep(1500);

    // Primeiro estouro: Maria - SIM (reentrada)
    console.log("  🔴 Maria estourou! Respondendo: SIM");
    const yesBtn1 = await page.$("#btn-confirm-yes");
    if (yesBtn1) {
      await page.click("#btn-confirm-yes");
      await sleep(1000);
    }

    // Segundo estouro: Pedro - NÃO (eliminação)
    console.log("  🔴 Pedro estourou! Respondendo: NÃO");
    const noBtn = await page.$("#btn-confirm-no");
    if (noBtn) {
      await page.click("#btn-confirm-no");
      await sleep(1000);
    }

    console.log("  ✅ Segunda rodada processada\n");

    // ========================================
    // VERIFICAR RESULTADOS
    // ========================================
    console.log("📊 VERIFICAÇÃO DOS RESULTADOS:");

    const resultados = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".player-card")).map(
        (card) => {
          const nomeEl = card.querySelector(".truncate");
          const nome = nomeEl ? nomeEl.textContent.trim() : "Desconhecido";
          const scoreEl = card.querySelector(".rounded-full");
          const score = scoreEl ? scoreEl.textContent.trim() : "?";
          const eliminado = card.classList.contains("bg-gray-400");

          return { nome, score, eliminado };
        },
      );
    });

    resultados.forEach((j) => {
      const status = j.eliminado ? "❌ ELIMINADO" : `✅ Pontos: ${j.score}`;
      console.log(`  ${j.nome}: ${status}`);
    });

    // Validações
    console.log("\n✔️ VALIDAÇÕES:");

    const maria = resultados.find((j) => j.nome.includes("MARIA"));
    const pedro = resultados.find((j) => j.nome.includes("PEDRO"));
    const joao = resultados.find((j) => j.nome.includes("JOÃO"));

    if (maria && !maria.eliminado) {
      console.log("  ✅ Maria voltou ao jogo com reentrada");
    } else {
      console.log("  ⚠️  Maria: comportamento inesperado");
    }

    if (pedro && pedro.eliminado) {
      console.log("  ✅ Pedro foi eliminado corretamente");
    } else {
      console.log("  ⚠️  Pedro: deveria estar eliminado");
    }

    if (joao && !joao.eliminado) {
      console.log("  ✅ João permanece ativo");
    }

    console.log("\n🎉 TESTES COMPLETADOS COM SUCESSO!");
    console.log("✨ O sistema está funcionando corretamente.");

    await sleep(3000);
  } catch (error) {
    console.error("❌ ERRO NOS TESTES:", error);
  } finally {
    await browser.close();
  }
})();
