const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const OUTPUT_DIR = path.join(__dirname, "videos", "full-test");
const FRAMES_DIR = path.join(OUTPUT_DIR, "frames");
const OUTPUT_VIDEO = path.join(OUTPUT_DIR, `pontinho-full-${Date.now()}.mp4`);
const FRAME_RATE = 15;

// Limpar frames anteriores
if (fs.existsSync(FRAMES_DIR)) {
  fs.readdirSync(FRAMES_DIR).forEach((f) =>
    fs.unlinkSync(path.join(FRAMES_DIR, f)),
  );
} else {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

let frameCounter = 0;

async function captureFrame(page, description = "") {
  try {
    await page.screenshot({
      path: path.join(
        FRAMES_DIR,
        `frame-${String(frameCounter).padStart(6, "0")}.png`,
      ),
    });
    frameCounter++;
    if (description) console.log(`  📸 Frame ${frameCounter}: ${description}`);
  } catch (e) {
    console.error("Erro ao capturar:", e.message);
  }
}

async function safeClick(page, selector, description = "") {
  try {
    await page.waitForSelector(selector, { timeout: 3000 });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    }, selector);
    if (description) console.log(`  ✓ Clicou: ${description}`);
    return true;
  } catch (e) {
    console.log(`  ⚠️  Não conseguiu clicar em ${selector}: ${e.message}`);
    return false;
  }
}

async function createVideoFromFrames() {
  return new Promise((resolve, reject) => {
    console.log("\n📽️  Convertendo frames para MP4...");

    const ffmpegArgs = [
      "-framerate",
      String(FRAME_RATE),
      "-i",
      path.join(FRAMES_DIR, "frame-%06d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "23",
      OUTPUT_VIDEO,
    ];

    const ffmpeg = spawn(ffmpegStatic, ffmpegArgs, { stdio: "pipe" });

    ffmpeg.stderr.on("data", () => process.stdout.write("."));

    ffmpeg.on("close", (code) => {
      console.log("\n");
      if (code === 0) {
        const stats = fs.statSync(OUTPUT_VIDEO);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ MP4 criado com sucesso!`);
        console.log(`   📁 ${OUTPUT_VIDEO}`);
        console.log(
          `   📦 ${sizeMB} MB | ⏱️  ${(frameCounter / FRAME_RATE).toFixed(1)}s`,
        );
        console.log(`   🎬 Frames: ${frameCounter}`);
        resolve(true);
      } else {
        reject(new Error(`FFmpeg error ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

async function fullTest() {
  console.log("🎮 TESTE COMPLETO - TODA A FUNCIONALIDADE DO PONTINHO\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();

  try {
    console.log("📺 Navegando...\n");
    await page.goto("http://localhost:8000", { waitUntil: "networkidle0" });

    for (let i = 0; i < 5; i++) await captureFrame(page, "Tela inicial");

    // ========================================
    // 1. MODO APOSTADO
    // ========================================
    console.log("\n1️⃣  TESTE: Modo Apostado com Valores");
    await safeClick(page, "#btn-mode-apostado", "Modo apostado");
    await sleep(400);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Campos de entrada");

    await page.type("#entry-fee", "10");
    await page.type("#rebuy-fee", "5");
    await sleep(300);
    for (let i = 0; i < 2; i++) await captureFrame(page, "Valores preenchidos");

    await safeClick(page, "#btn-start-game", "Iniciar jogo");
    await sleep(500);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Mesa aberta");

    // ========================================
    // 2. ADICIONAR JOGADORES
    // ========================================
    console.log("\n2️⃣  TESTE: Adicionar 4 Jogadores");
    const players = ["ANA", "BRUNO", "CARLOS", "DIANA"];

    for (const nome of players) {
      await safeClick(page, "#btn-add-player", `Abrir formulário`);
      await sleep(300);
      await page.type("#new-player-name", nome);
      await sleep(100);
      await safeClick(page, "#btn-confirm-add", `${nome} adicionado`);
      await sleep(400);
      for (let i = 0; i < 2; i++) await captureFrame(page, `${nome} na mesa`);
    }

    // ========================================
    // 3. ORGANIZAR ORDEM (Drag & Drop)
    // ========================================
    console.log("\n3️⃣  TESTE: Drag & Drop");
    const cards = await page.$$(".player-card");
    if (cards.length > 1) {
      const box1 = await cards[0].boundingBox();
      const box2 = await cards[cards.length - 1].boundingBox();

      await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
      await page.mouse.down();
      await sleep(200);
      await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
      await sleep(200);
      await page.mouse.up();
      await sleep(400);
      for (let i = 0; i < 3; i++)
        await captureFrame(page, "Ordem reorganizada");
    }

    // ========================================
    // 4. PRIMEIRA RODADA
    // ========================================
    console.log("\n4️⃣  TESTE: Primeira Rodada");
    await safeClick(page, "#btn-end-round", "Abrir rodada");
    await sleep(600);

    const inputs1 = await page.$$("#round-inputs [data-player-id]");
    const values1 = [5, 10, 8, 6];

    for (let i = 0; i < inputs1.length; i++) {
      await page.evaluate(
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs1[i],
        values1[i],
      );
      await sleep(100);
    }

    for (let i = 0; i < 2; i++) await captureFrame(page, "Valores preenchidos");
    await safeClick(page, "#btn-process-round", "Processar");
    await sleep(1200);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Rodada 1 finalizada");

    // ========================================
    // 5. SEGUNDA RODADA
    // ========================================
    console.log("\n5️⃣  TESTE: Segunda Rodada");
    await safeClick(page, "#btn-end-round", "Nova rodada");
    await sleep(600);

    const inputs2 = await page.$$("#round-inputs [data-player-id]");
    const values2 = [8, 15, 12, 10];

    for (let i = 0; i < inputs2.length; i++) {
      await page.evaluate(
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs2[i],
        values2[i],
      );
      await sleep(100);
    }

    for (let i = 0; i < 2; i++) await captureFrame(page, "Rodada 2 preparada");
    await safeClick(page, "#btn-process-round", "Processar");
    await sleep(1200);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Rodada 2 finalizada");

    // ========================================
    // 6. TERCEIRA RODADA - COM ESTOURO
    // ========================================
    console.log("\n6️⃣  TESTE: Rodada com Estouro");
    await safeClick(page, "#btn-end-round", "Nova rodada");
    await sleep(600);

    const inputs3 = await page.$$("#round-inputs [data-player-id]");
    const values3 = [80, 20, 15, 10];

    for (let i = 0; i < inputs3.length; i++) {
      await page.evaluate(
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs3[i],
        values3[i],
      );
      await sleep(100);
    }

    for (let i = 0; i < 2; i++)
      await captureFrame(page, "Valores causando estouro");
    await safeClick(page, "#btn-process-round", "Processar");
    await sleep(1500);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Processando...");

    // Modal de estouro
    try {
      await page.waitForSelector("#modal-confirm", { timeout: 4000 });
      console.log("  🔴 Estouro detectado!");
      for (let i = 0; i < 2; i++) await captureFrame(page, "Modal de estouro");

      await sleep(300);
      await page.evaluate(() => {
        const btn = document.querySelector("#btn-confirm-yes");
        if (btn) btn.click();
      });
      console.log("  ✓ Respondendo SIM (reentrada)");
      await sleep(1200);
      for (let i = 0; i < 3; i++) await captureFrame(page, "Jogador reentrou");
    } catch (e) {
      console.log("  ⚠️  Modal não encontrado: " + e.message);
      for (let i = 0; i < 2; i++) await captureFrame(page, "Continuando...");
    }

    // ========================================
    // 7. HISTÓRICO
    // ========================================
    console.log("\n7️⃣  TESTE: Histórico de Rodadas");
    await safeClick(page, "#btn-history", "Abrir histórico");
    await sleep(500);
    for (let i = 0; i < 4; i++) await captureFrame(page, "Histórico");
    await safeClick(page, "#btn-close-history", "Fechar histórico");
    await sleep(300);

    // ========================================
    // 8. AJUDA
    // ========================================
    console.log("\n8️⃣  TESTE: Como Jogar");
    await safeClick(page, "#btn-help", "Abrir ajuda");
    await sleep(500);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Ajuda");
    await safeClick(page, "#btn-close-help", "Fechar ajuda");
    await sleep(300);

    // ========================================
    // 9. ENTRADA TARDIA
    // ========================================
    console.log("\n9️⃣  TESTE: Entrada Tardia");
    await safeClick(page, "#btn-add-player", "Abrir formulário");
    await sleep(300);
    await page.type("#new-player-name", "EVA");
    await sleep(100);
    await safeClick(page, "#btn-confirm-add", "Eva adicionada");
    await sleep(500);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Eva entrou");

    // ========================================
    // 10. MAIS RODADAS
    // ========================================
    console.log("\n🔟 TESTE: Continuar Jogando");

    for (let round = 0; round < 3; round++) {
      console.log(`   Rodada ${round + 4}...`);
      await safeClick(page, "#btn-end-round", "Nova rodada");
      await sleep(600);

      const inputs = await page.$$("#round-inputs [data-player-id]");
      const randomValues = inputs.map(() => Math.floor(Math.random() * 20) + 7);

      for (let i = 0; i < inputs.length; i++) {
        await page.evaluate(
          (input, value) => {
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          },
          inputs[i],
          randomValues[i],
        );
        await sleep(80);
      }

      for (let i = 0; i < 2; i++)
        await captureFrame(page, `Rodada ${round + 4}`);
      await safeClick(page, "#btn-process-round", "Processar");
      await sleep(1200);

      // Verificar estouro
      try {
        await page.waitForSelector("#modal-confirm", { timeout: 1500 });
        console.log("   🔴 Estouro! Respondendo NÃO (eliminação)");
        for (let i = 0; i < 2; i++) await captureFrame(page, "Estouro");

        await sleep(200);
        await page.evaluate(() => {
          const btn = document.querySelector("#btn-confirm-no");
          if (btn) btn.click();
        });
        await sleep(1000);
        for (let i = 0; i < 2; i++)
          await captureFrame(page, "Jogador eliminado");
        break;
      } catch (e) {
        for (let i = 0; i < 2; i++) await captureFrame(page, "Rodada OK");
      }
    }

    // ========================================
    // 11. UNDO
    // ========================================
    console.log("\n1️⃣1️⃣  TESTE: Desfazer Ação");
    await sleep(200);
    const undoBtn = await page.$("#btn-undo:not(:disabled)");
    if (undoBtn) {
      for (let i = 0; i < 2; i++) await captureFrame(page, "Undo visível");
      await safeClick(page, "#btn-undo", "Desfazer");
      await sleep(800);
      for (let i = 0; i < 3; i++) await captureFrame(page, "Undo executado");
    } else {
      console.log("  ℹ️  Undo não disponível");
      for (let i = 0; i < 3; i++) await captureFrame(page, "Estado final");
    }

    // ========================================
    // 12. PLACAR FINAL
    // ========================================
    console.log("\n1️⃣2️⃣  TESTE: Placar Final");
    for (let i = 0; i < 15; i++)
      await captureFrame(page, "Estado final do jogo");

    console.log(`\n✅ Teste completo finalizado!`);
    console.log(`📊 Total de frames capturados: ${frameCounter}`);

    await browser.close();
    await createVideoFromFrames();
  } catch (error) {
    console.error("\n❌ Erro durante o teste:", error.message);
    console.error(error.stack);
    await browser.close();
  }
}

fullTest().catch(console.error);
