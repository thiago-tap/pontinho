const puppeteer = require("puppeteer");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mobileTest() {
  console.log("📱 TESTE VISUAL - VERSÃO MOBILE\n");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();

  // Configurar viewport mobile (iPhone 12)
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
  });

  try {
    console.log("📱 Navegando para http://localhost:8000\n");
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
    const players = ["ANA", "BRUNO", "CARLOS"];

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
    // 5. HISTÓRICO
    // ========================================
    console.log("6️⃣ HISTÓRICO DE RODADAS\n");
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
    // 6. AJUDA
    // ========================================
    console.log("7️⃣ TELA DE AJUDA\n");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-help");
      if (btn) btn.click();
    });
    await sleep(1500);
    console.log("  ✅ Ajuda aberta (veja o layout)");
    await sleep(2000);

    await page.evaluate(() => {
      const btn = document.querySelector("#btn-close-help");
      if (btn) btn.click();
    });
    await sleep(800);
    console.log("  ✅ Ajuda fechada\n");

    // ========================================
    // 7. ENTRADA TARDIA
    // ========================================
    console.log("8️⃣ ENTRADA TARDIA\n");
    await page.evaluate(() => {
      const btn = document.querySelector("#btn-add-player");
      if (btn) btn.click();
    });
    await sleep(800);

    await page.type("#new-player-name", "DIANA");
    await sleep(400);

    await page.evaluate(() => {
      const btn = document.querySelector("#btn-confirm-add");
      if (btn) btn.click();
    });
    await sleep(1200);
    console.log("  ✅ Diana adicionada com entrada tardia\n");

    // ========================================
    // 8. MAIS RODADAS
    // ========================================
    console.log("9️⃣ MAIS RODADAS\n");
    for (let rodada = 0; rodada < 3; rodada++) {
      console.log(`  Rodada ${rodada + 3}...`);
      await page.evaluate(() => {
        const btn = document.querySelector("#btn-end-round");
        if (btn) btn.click();
      });
      await sleep(1200);

      const inputs = await page.$$("#round-inputs [data-player-id]");
      for (let i = 0; i < inputs.length; i++) {
        const val = Math.floor(Math.random() * 15) + 7;
        await page.evaluate(
          (inp, v) => {
            inp.value = v;
            inp.dispatchEvent(new Event("input", { bubbles: true }));
          },
          inputs[i],
          val,
        );
        await sleep(150);
      }

      console.log("  ✅ Valores preenchidos");
      await page.evaluate(() => {
        const btn = document.querySelector("#btn-process-round");
        if (btn) btn.click();
      });
      await sleep(2000);
      console.log("  ✅ Rodada processada\n");
    }

    // ========================================
    // 9. OBSERVAR PLACAR FINAL
    // ========================================
    console.log("🔟 PLACAR FINAL\n");
    console.log("  ✅ Observar posicionamento dos elementos");
    console.log("  ✅ Verificar responsividade do layout");
    console.log("  ✅ Testar scroll se necessário\n");

    // Scroll para baixo para ver todo conteúdo
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(1000);

    console.log("✅ TESTE MOBILE CONCLUÍDO!\n");
    console.log("Mantenha o navegador aberto para inspeção visual.");
    console.log("Pressione Ctrl+C no terminal para encerrar.\n");

    // Manter aberto
    await sleep(300000);
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
    await browser.close();
  }
}

mobileTest().catch(console.error);
