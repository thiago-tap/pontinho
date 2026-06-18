const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Configurações de vídeo
const OUTPUT_DIR = path.join(__dirname, "videos");
const FRAMES_DIR = path.join(OUTPUT_DIR, "frames");
const OUTPUT_VIDEO = path.join(OUTPUT_DIR, `pontinho-test-${Date.now()}.mp4`);
const FRAME_RATE = 30;

// Criar diretórios
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

// Limpar frames antigos
const existingFrames = fs.readdirSync(FRAMES_DIR);
existingFrames.forEach((f) => fs.unlinkSync(path.join(FRAMES_DIR, f)));

let frameCounter = 0;

async function captureFrame(page, description = "") {
  try {
    const screenshot = await page.screenshot({
      path: path.join(
        FRAMES_DIR,
        `frame-${String(frameCounter).padStart(6, "0")}.png`,
      ),
    });
    frameCounter++;
    if (description) console.log(`  📸 Frame ${frameCounter}: ${description}`);
  } catch (e) {
    console.error("Erro ao capturar frame:", e.message);
  }
}

async function createVideoFromFrames() {
  return new Promise((resolve, reject) => {
    console.log("\n📽️  Criando vídeo a partir dos frames...");

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

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ Vídeo criado com sucesso: ${OUTPUT_VIDEO}`);
        console.log(
          `   ${frameCounter} frames em ${frameCounter / FRAME_RATE}s`,
        );
        resolve(true);
      } else if (code === 127) {
        console.log("⚠️  FFmpeg não encontrado no sistema.");
        console.log("   Frames salvos em:", FRAMES_DIR);
        console.log("   Para gerar MP4, instale FFmpeg: https://ffmpeg.org/");
        resolve(false);
      } else {
        reject(new Error(`FFmpeg error (código ${code}): ${stderr}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

async function runTestsWithRecording() {
  console.log("🎥 GRAVANDO TESTES DO PONTINHO EM VÍDEO...\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();

  try {
    // Navegar para o site
    console.log("📺 Navegando para http://localhost:8000\n");
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

    for (let i = 0; i < 5; i++) await captureFrame(page, "Página carregada");

    // ========================================
    // TESTE 1: Modo Amistoso
    // ========================================
    console.log("\n📝 TESTE 1: Selecionando Modo Amistoso");
    await page.click("#btn-mode-amistoso");
    await sleep(300);
    for (let i = 0; i < 3; i++)
      await captureFrame(page, "Botão amistoso clicado");

    // ========================================
    // TESTE 2: Adicionar 3 Jogadores
    // ========================================
    console.log("\n📝 TESTE 2: Adicionando 3 Jogadores");
    const jogadores = ["JOÃO", "MARIA", "PEDRO"];

    for (const nome of jogadores) {
      await page.click("#btn-add-player");
      await sleep(200);
      for (let i = 0; i < 2; i++) await captureFrame(page, `Clicou +`);

      await page.type("#new-player-name", nome);
      await sleep(200);
      for (let i = 0; i < 2; i++) await captureFrame(page, `Digitou: ${nome}`);

      await page.click("#btn-confirm-add");
      await sleep(400);
      for (let i = 0; i < 3; i++)
        await captureFrame(page, `${nome} adicionado`);
    }

    // ========================================
    // TESTE 3: Primeira Rodada
    // ========================================
    console.log("\n📝 TESTE 3: Primeira Rodada (sem estouros)");
    await page.click("#btn-end-round");
    await sleep(400);
    for (let i = 0; i < 3; i++)
      await captureFrame(page, "Modal de rodada aberto");

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
      await sleep(150);
      for (let j = 0; j < 2; j++)
        await captureFrame(page, `Preenchendo valores`);
    }

    await page.click("#btn-process-round");
    await sleep(1000);
    for (let i = 0; i < 5; i++) await captureFrame(page, "Rodada processada");

    // ========================================
    // TESTE 4: Segunda Rodada (Múltiplos Estouros)
    // ========================================
    console.log("\n📝 TESTE 4: Segunda Rodada (Múltiplos Estouros)");
    await page.click("#btn-end-round");
    await sleep(800);
    await page.waitForSelector("#round-inputs [data-player-id]", {
      timeout: 5000,
    });
    for (let i = 0; i < 3; i++)
      await captureFrame(page, "Modal de rodada aberto");

    const inputs2 = await page.$$("#round-inputs [data-player-id]");
    const valores2 = [5, 95, 93]; // Maria e Pedro estourão

    for (let i = 0; i < inputs2.length; i++) {
      await page.evaluate(
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        },
        inputs2[i],
        valores2[i],
      );
      await sleep(150);
      for (let j = 0; j < 2; j++)
        await captureFrame(page, `Preenchendo valores`);
    }

    await page.click("#btn-process-round");
    await sleep(1200);
    for (let i = 0; i < 5; i++)
      await captureFrame(page, "Primeira rodada processada");

    // Primeiro estouro: Maria - SIM
    console.log("  🔴 Maria estourou! Respondendo SIM");
    await page.waitForSelector("#modal-confirm", { timeout: 5000 });
    for (let i = 0; i < 3; i++)
      await captureFrame(page, "Modal de estouro: Maria");
    await page.click("#btn-confirm-yes");
    await sleep(1500);
    for (let i = 0; i < 5; i++)
      await captureFrame(page, "Maria voltou ao jogo");

    // Segundo estouro: Pedro - NÃO
    console.log("  🔴 Pedro estourou! Respondendo NÃO");
    await page.waitForSelector("#modal-confirm", { timeout: 5000 });
    for (let i = 0; i < 3; i++)
      await captureFrame(page, "Modal de estouro: Pedro");
    await page.click("#btn-confirm-no");
    await sleep(1500);
    for (let i = 0; i < 5; i++) await captureFrame(page, "Pedro eliminado");

    // Capturar resultado final
    await sleep(500);
    for (let i = 0; i < 10; i++) await captureFrame(page, "Resultado final");

    console.log("\n✅ Todos os testes foram gravados!");
    console.log(`📊 Total de frames capturados: ${frameCounter}`);

    await browser.close();

    // Criar vídeo
    await createVideoFromFrames();
  } catch (error) {
    console.error("❌ Erro durante os testes:", error);
    await browser.close();
  }
}

// Executar
runTestsWithRecording();
