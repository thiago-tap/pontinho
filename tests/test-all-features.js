const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const OUTPUT_DIR = path.join(__dirname, "videos", "full-test");
const FRAMES_DIR = path.join(OUTPUT_DIR, "frames");
const FRAME_RATE = 15;

if (fs.existsSync(FRAMES_DIR)) {
  fs.readdirSync(FRAMES_DIR).forEach((f) =>
    fs.unlinkSync(path.join(FRAMES_DIR, f)),
  );
} else {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

let frameCounter = 0;

async function captureFrame(page, desc = "") {
  await page.screenshot({
    path: path.join(
      FRAMES_DIR,
      `frame-${String(frameCounter).padStart(6, "0")}.png`,
    ),
  });
  frameCounter++;
  if (desc) console.log(`${frameCounter}: ${desc}`);
}

async function fullTest() {
  console.log("TESTE COMPLETO DO PONTINHO\n");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const timeout = (ms, name) =>
    new Promise((r) =>
      setTimeout(() => {
        console.log(`⏱️ Timeout ${name}`);
        r(true);
      }, ms),
    );

  try {
    console.log("Navegando...\n");
    await Promise.race([
      page.goto("http://localhost:8000", { waitUntil: "networkidle0" }),
      timeout(15000, "load"),
    ]);

    for (let i = 0; i < 5; i++) await captureFrame(page, "Home");

    // TESTE 1: Modo Apostado
    console.log("\n1️⃣ MODO APOSTADO");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-mode-apostado");
        if (b) b.click();
      }),
      timeout(3000),
    ]);
    await sleep(400);
    await Promise.race([page.type("#entry-fee", "5"), timeout(2000)]);
    await Promise.race([page.type("#rebuy-fee", "3"), timeout(2000)]);
    await sleep(200);
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-start-game");
        if (b) b.click();
      }),
      timeout(3000),
    ]);
    await sleep(600);
    for (let i = 0; i < 4; i++) await captureFrame(page, "Mesa apostada");

    // TESTE 2: Jogadores
    console.log("\n2️⃣ ADICIONAR JOGADORES");
    for (const nome of ["ANA", "BRUNO", "CARLOS"]) {
      await Promise.race([
        page.evaluate(() => {
          const b = document.querySelector("#btn-add-player");
          if (b) b.click();
        }),
        timeout(2000),
      ]);
      await sleep(300);
      await Promise.race([page.type("#new-player-name", nome), timeout(2000)]);
      await sleep(100);
      await Promise.race([
        page.evaluate(() => {
          const b = document.querySelector("#btn-confirm-add");
          if (b) b.click();
        }),
        timeout(2000),
      ]);
      await sleep(500);
      for (let i = 0; i < 2; i++)
        await captureFrame(page, `${nome} adicionado`);
    }

    // TESTE 3: Primeira Rodada
    console.log("\n3️⃣ PRIMEIRA RODADA");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-end-round");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(600);
    for (let i = 0; i < 2; i++) await captureFrame(page, "Modal de rodada");

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
      await sleep(100);
    }

    for (let i = 0; i < 2; i++) await captureFrame(page, "Valores preenchidos");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-process-round");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    for (let j = 0; j < 8; j++) {
      await sleep(200);
      await captureFrame(page, "Processando rodada");
    }

    // TESTE 4: Segunda Rodada
    console.log("\n4️⃣ SEGUNDA RODADA");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-end-round");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(600);
    for (let i = 0; i < 2; i++) await captureFrame(page, "Próxima rodada");

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
      await sleep(100);
    }

    for (let i = 0; i < 2; i++) await captureFrame(page, "Valores rodada 2");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-process-round");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    for (let j = 0; j < 8; j++) {
      await sleep(200);
      await captureFrame(page, "Processando rodada 2");
    }

    // TESTE 5: Histórico
    console.log("\n5️⃣ HISTÓRICO");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-history");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(500);
    for (let i = 0; i < 4; i++)
      await captureFrame(page, "Histórico de rodadas");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-close-history");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(300);

    // TESTE 6: Ajuda
    console.log("\n6️⃣ AJUDA");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-help");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(500);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Tela de ajuda");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-close-help");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(300);

    // TESTE 7: Entrada Tardia
    console.log("\n7️⃣ ENTRADA TARDIA");
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-add-player");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(300);
    await Promise.race([page.type("#new-player-name", "DIANA"), timeout(2000)]);
    await sleep(100);
    await Promise.race([
      page.evaluate(() => {
        const b = document.querySelector("#btn-confirm-add");
        if (b) b.click();
      }),
      timeout(2000),
    ]);
    await sleep(500);
    for (let i = 0; i < 3; i++) await captureFrame(page, "Diana entrou");

    // TESTE 8: Mais 2 rodadas
    console.log("\n8️⃣ MAIS 2 RODADAS");
    for (let rodada = 0; rodada < 2; rodada++) {
      console.log(`  Rodada ${rodada + 3}...`);
      await Promise.race([
        page.evaluate(() => {
          const b = document.querySelector("#btn-end-round");
          if (b) b.click();
        }),
        timeout(2000),
      ]);
      await sleep(600);

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
        await sleep(80);
      }

      for (let i = 0; i < 2; i++)
        await captureFrame(page, `Rodada ${rodada + 3}`);
      await Promise.race([
        page.evaluate(() => {
          const b = document.querySelector("#btn-process-round");
          if (b) b.click();
        }),
        timeout(2000),
      ]);
      for (let j = 0; j < 8; j++) {
        await sleep(200);
        await captureFrame(page, `Processando R${rodada + 3}`);
      }
    }

    // TESTE 9: Placar Final
    console.log("\n9️⃣ PLACAR FINAL");
    for (let i = 0; i < 12; i++) await captureFrame(page, "Estado final");

    console.log(`\n✅ Teste completado! ${frameCounter} frames capturados\n`);
    await browser.close();

    // Converter para vídeo
    console.log("Convertendo para MP4...");
    const OUTPUT_VIDEO = path.join(
      OUTPUT_DIR,
      `pontinho-demonstration-${Date.now()}.mp4`,
    );

    await new Promise((resolve, reject) => {
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
          console.log(`\n📽️ MP4 CRIADO COM SUCESSO!`);
          console.log(`📁 ${OUTPUT_VIDEO}`);
          console.log(`📦 Tamanho: ${sizeMB} MB`);
          console.log(
            `⏱️ Duração: ${(frameCounter / FRAME_RATE).toFixed(1)}s @ ${FRAME_RATE} FPS`,
          );
          resolve();
        } else {
          reject(new Error(`FFmpeg error ${code}`));
        }
      });
      ffmpeg.on("error", reject);
    });
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
  }
}

fullTest().catch(console.error);
