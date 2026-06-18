const puppeteer = require("puppeteer");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function galaxyS23Test() {
  console.log("📱 TESTE VISUAL - SAMSUNG GALAXY S23\n");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();

  // Configurar viewport Galaxy S23 (360x800 em pixels lógicos, 1440x3120 físicos)
  await page.setViewport({
    width: 360,
    height: 800,
    deviceScaleFactor: 4, // Galaxy S23 usa alta DPI
  });

  try {
    console.log("📱 Samsung Galaxy S23 (360x800 px)\n");
    console.log("Navegando para http://localhost:8000\n");
    await page.goto("http://localhost:8000", { waitUntil: "networkidle0" });

    await sleep(1000);
    console.log("✅ Tela inicial carregada\n");

    // ========================================
    // 1. MODO APOSTADO
    // ========================================
    console.log('1️⃣ MODO APOSTADO - Clique em "Modo Apostado"');
    await sleep(2000);

    await page.evaluate(() => {
      const btn = document.querySelector("#btn-mode-apostado");
      if (btn) btn.click();
    });
    await sleep(1500);
    console.log("✅ Campos de entrada visíveis\n");

    // Preencher campos
    await page.type("#entry-fee", "5");
    await page.type("#rebuy-fee", "3");
    await sleep(800);
    console.log("✅ Valores preenchidos (R$5 e R$3)\n");

    // Iniciar jogo
    console.log('2️⃣ INICIAR JOGO - Clicando em "Começar"');
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-start-game");
      if (btn) btn.click();
    });
    await sleep(1500);
    console.log("✅ Mesa aberta em modo apostado\n");

    // ========================================
    // 2. ADICIONAR JOGADORES
    // ========================================
    console.log("3️⃣ ADICIONAR JOGADORES\n");
    const players = ["ANA", "BRUNO", "CARLOS", "DIANA"];

    for (const nome of players) {
      console.log(`  Adicionando ${nome}...`);
      await page.evaluate(() => {
        const btn = document.querySelector("#btn-add-player");
        if (btn) btn.click();
      });
      await sleep(800);

      await page.type("#new-player-name", nome);
      await sleep(400);

      await page.evaluate(() => {
        const btn = document.querySelector("#btn-confirm-add");
        if (btn) btn.click();
      });
      await sleep(1000);
      console.log(`  ✅ ${nome} adicionado`);
    }
    console.log("\n");

    // ========================================
    // 3. PRIMEIRA RODADA
    // ========================================
    console.log("4️⃣ PRIMEIRA RODADA\n");
    console.log("  Abrindo modal de rodada...");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-end-round");
      if (btn) btn.click();
    });
    await sleep(1200);
    console.log("  ✅ Modal aberto");

    // Preencher valores
    const inputs1 = await page.$$("#round-inputs [data-player-id]");
    for (let i = 0; i < inputs1.length; i++) {
      await page.evaluate(
        (inp, v) => {
          inp.value = v;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs1[i],
        (i + 1) * 5,
      );
      await sleep(200);
    }

    await sleep(600);
    console.log("  ✅ Valores preenchidos");

    // Processar rodada
    console.log("  Processando rodada...");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-process-round");
      if (btn) btn.click();
    });
    await sleep(2000);
    console.log("  ✅ Rodada processada\n");

    // ========================================
    // 4. SEGUNDA RODADA
    // ========================================
    console.log("5️⃣ SEGUNDA RODADA\n");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-end-round");
      if (btn) btn.click();
    });
    await sleep(1200);

    const inputs2 = await page.$$("#round-inputs [data-player-id]");
    for (let i = 0; i < inputs2.length; i++) {
      await page.evaluate(
        (inp, v) => {
          inp.value = v;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs2[i],
        (i + 2) * 5,
      );
      await sleep(200);
    }

    console.log("  ✅ Valores preenchidos");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-process-round");
      if (btn) btn.click();
    });
    await sleep(2000);
    console.log("  ✅ Rodada processada\n");

    // ========================================
    // 5. TERCEIRA RODADA COM ESTOURO
    // ========================================
    console.log("6️⃣ TERCEIRA RODADA (COM ESTOURO)\n");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-end-round");
      if (btn) btn.click();
    });
    await sleep(1200);

    const inputs3 = await page.$$("#round-inputs [data-player-id]");
    // Fazer alguém estourar
    for (let i = 0; i < inputs3.length; i++) {
      const value = i === 0 ? 80 : (i + 1) * 10; // Primeira pessoa vai estourar
      await page.evaluate(
        (inp, v) => {
          inp.value = v;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs3[i],
        value,
      );
      await sleep(200);
    }

    console.log("  ✅ Valores que causam estouro preenchidos");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-process-round");
      if (btn) btn.click();
    });
    await sleep(2000);
    console.log("  ⏳ Aguardando modal de estouro...\n");

    // Verificar estouro
    try {
      await page.waitForSelector("#modal-confirm", { timeout: 3000 });
      console.log("  🔴 ESTOURO DETECTADO!");
      await sleep(1500);

      // Clicar SIM (reentrada)
      await page.evaluate(() => {
        const btn = document.querySelector("#btn-confirm-yes");
        if (btn) btn.click();
      });
      await sleep(1500);
      console.log("  ✅ Jogador reentrou com reentrada\n");
    } catch (e) {
      console.log("  ⚠️ Modal não apareceu (jogador pode ter score negativo)");
      await sleep(1000);
      console.log("");
    }

    // ========================================
    // 6. HISTÓRICO
    // ========================================
    console.log("7️⃣ HISTÓRICO DE RODADAS\n");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-history");
      if (btn) btn.click();
    });
    await sleep(1500);
    console.log("  ✅ Histórico aberto (observe os elementos)");
    await sleep(2000);

    await page.evaluate(() => {
      const btn = document.querySelector("#btn-close-history");
      if (btn) btn.click();
    });
    await sleep(800);
    console.log("  ✅ Histórico fechado\n");

    // ========================================
    // 7. AJUDA
    // ========================================
    console.log("8️⃣ TELA DE AJUDA\n");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-help");
      if (btn) btn.click();
    });
    await sleep(1500);
    console.log("  ✅ Ajuda aberta (veja o layout responsivo)");

    // Scroll na ajuda
    await page.evaluate(() => {
      const modal = document.querySelector("#modal-help");
      if (modal) modal.scrollTop = modal.scrollHeight / 2;
    });
    await sleep(1500);
    console.log("  ✅ Scroll dentro da ajuda");
    await sleep(1000);

    await page.evaluate(() => {
      const btn = document.querySelector("#btn-close-help");
      if (btn) btn.click();
    });
    await sleep(800);
    console.log("  ✅ Ajuda fechada\n");

    // ========================================
    // 8. UNDO
    // ========================================
    console.log("9️⃣ DESFAZER (UNDO)\n");
    await sleep(500);
    const undoBtn = await page.$("#btn-undo:not(:disabled)");
    if (undoBtn) {
      console.log("  Desfazendo última ação...");
      await page.evaluate(() => {
        const btn = document.querySelector("#btn-undo");
        if (btn) btn.click();
      });
      await sleep(1500);
      console.log("  ✅ Ação desfeita\n");
    } else {
      console.log("  ℹ️ Botão Undo não disponível\n");
    }

    // ========================================
    // 9. OBSERVAR LAYOUT FINAL
    // ========================================
    console.log("🔟 PLACAR FINAL E LAYOUT\n");
    console.log("  ✅ Observar posicionamento dos elementos");
    console.log("  ✅ Verificar responsividade do layout em Galaxy S23");
    console.log("  ✅ Testar scroll e altura dos componentes\n");

    // Scroll para baixo para ver todo conteúdo
    await page.evaluate(() => window.scrollBy(0, 300));
    await sleep(1200);

    await page.evaluate(() => window.scrollBy(0, 300));
    await sleep(1200);

    console.log("═══════════════════════════════════════════════════");
    console.log("✅ TESTE MOBILE (GALAXY S23) CONCLUÍDO!");
    console.log("═══════════════════════════════════════════════════\n");
    console.log("Viewport: 360x800 px (Galaxy S23)");
    console.log("Device Scale Factor: 4x (1440 dpi)\n");
    console.log("Mantenha o navegador aberto para inspeção visual.");
    console.log("Pressione Ctrl+C no terminal para encerrar.\n");

    // Manter aberto indefinidamente
    await sleep(999999);
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
    await browser.close();
  }
}

galaxyS23Test().catch(console.error);
