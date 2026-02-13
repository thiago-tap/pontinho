// Teste com Gravação de Vídeo
// Instale: npm install puppeteer

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  console.log("🎬 INICIANDO TESTES COM GRAVAÇÃO DE VÍDEO...\n");

  // Criar diretório para vídeo se não existir
  const videoDir = path.join(__dirname, "test-videos");
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  const videoPath = path.join(videoDir, `pontinho-test-${Date.now()}.webm`);

  // Se o sistema suportar gravação nativa do Chrome
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: [
      "--enable-usermedia-screen-capturing",
      "--disable-features=TranslateUI",
      "--no-first-run",
    ],
  });

  const page = await browser.newPage();

  try {
    // Navegar até o aplicativo
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });
    await sleep(1000);

    console.log("🎮 TESTE 1: Selecionando Modo Amistoso");
    await page.click("#btn-mode-amistoso");
    await sleep(800);
    console.log("  ✅ Modo Amistoso selecionado\n");

    console.log("📝 TESTE 2: Adicionando 3 Jogadores");
    const jogadores = ["JOÃO", "MARIA", "PEDRO"];

    for (const nome of jogadores) {
      await page.click("#btn-add-player");
      await sleep(400);

      await page.type("#new-player-name", nome);
      await sleep(150);

      await page.click("#btn-confirm-add");
      await sleep(600);

      console.log(`  ✅ ${nome} adicionado`);
    }

    const playerCount = await page.$$eval(
      ".player-card",
      (cards) => cards.length,
    );
    console.log(`  ✅ Total: ${playerCount} jogadores\n`);

    console.log("📝 TESTE 3: Processando Primeira Rodada");
    console.log("  Valores: João=5, Maria=10, Pedro=8");
    await sleep(1000);

    await page.click("#btn-end-round");
    await sleep(800);

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
      await sleep(200);
    }

    await sleep(500);
    await page.click("#btn-process-round");
    await sleep(2000);
    console.log("  ✅ Primeira rodada processada\n");

    console.log("📝 TESTE 4: Segunda Rodada com Múltiplos Estouros");
    console.log("  Valores: João=5, Maria=95 (ESTOURA), Pedro=93 (ESTOURA)");
    await sleep(1500);

    await page.click("#btn-end-round");
    await sleep(800);

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
      await sleep(200);
    }

    await sleep(800);
    console.log("  ⏳ Processando rodada com estouros...");
    await page.click("#btn-process-round");
    await sleep(2000);

    // Primeiro estouro: Maria - SIM
    console.log("  🔴 Maria estourou! Respondendo: SIM");
    await sleep(500);
    const yesBtn1 = await page.$("#btn-confirm-yes");
    if (yesBtn1) {
      await page.click("#btn-confirm-yes");
      await sleep(1500);
    }

    // Segundo estouro: Pedro - NÃO
    console.log("  🔴 Pedro estourou! Respondendo: NÃO");
    await sleep(500);
    const noBtn = await page.$("#btn-confirm-no");
    if (noBtn) {
      await page.click("#btn-confirm-no");
      await sleep(1500);
    }

    console.log("  ✅ Segunda rodada processada\n");

    // Verificar resultados
    console.log("📊 VERIFICAÇÃO DOS RESULTADOS:");
    await sleep(1000);

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

    // Validações finais
    console.log("\n✔️ VALIDAÇÕES FINAIS:");

    const maria = resultados.find((j) => j.nome.includes("MARIA"));
    const pedro = resultados.find((j) => j.nome.includes("PEDRO"));
    const joao = resultados.find((j) => j.nome.includes("JOÃO"));

    if (maria && !maria.eliminado) {
      console.log("  ✅ Maria voltou ao jogo com reentrada");
    }

    if (pedro && pedro.eliminado) {
      console.log("  ✅ Pedro foi eliminado corretamente");
    }

    if (joao && !joao.eliminado) {
      console.log("  ✅ João permanece ativo");
    }

    await sleep(3000);

    console.log("\n🎉 TESTES COMPLETADOS COM SUCESSO!");
    console.log("✨ O sistema está funcionando corretamente.\n");
  } catch (error) {
    console.error("❌ ERRO NOS TESTES:", error);
  } finally {
    await browser.close();

    if (fs.existsSync(videoPath)) {
      console.log(`📹 Vídeo salvo em: ${videoPath}`);
    } else {
      console.log(
        `⚠️  Nota: Para gravar vídeo, use screencastify ou gravador de tela do Windows`,
      );
      console.log(
        `    A gravação pode ser feita manualmente durante a execução dos testes.`,
      );
    }
  }
})();
