const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("ffmpeg-static");

const FRAMES_DIR = path.join(__dirname, "videos", "frames");
const OUTPUT_VIDEO = path.join(
  __dirname,
  "videos",
  `pontinho-test-${Date.now()}.mp4`,
);
const FRAME_RATE = 15; // 15 FPS

console.log("🎥 Criando MP4 a partir dos frames...\n");

// Contarframes
const frameCount = fs
  .readdirSync(FRAMES_DIR)
  .filter((f) => f.endsWith(".png")).length;
const duration = (frameCount / FRAME_RATE).toFixed(1);

console.log(`  📊 Total de frames: ${frameCount}`);
console.log(`  ⏱️  Duração: ${duration}s`);
console.log(`  ⚙️  Usando FFmpeg: ${ffmpeg}\n`);

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
  "-v",
  "quiet",
  OUTPUT_VIDEO,
];

console.log("  🚀 Processando vídeo...");

const ffmpegProcess = spawn(ffmpeg, ffmpegArgs, { stdio: "pipe" });

let stderr = "";

ffmpegProcess.stderr.on("data", (data) => {
  stderr += data.toString();
  // Mostrar progresso
  process.stdout.write(".");
});

ffmpegProcess.on("close", (code) => {
  console.log("\n");

  if (code === 0) {
    const stats = fs.statSync(OUTPUT_VIDEO);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log("✅ MP4 criado com sucesso!\n");
    console.log(`  📁 Arquivo: ${OUTPUT_VIDEO}`);
    console.log(`  📦 Tamanho: ${sizeMB} MB`);
    console.log(`  ⏱️  Duração: ${duration}s`);
    console.log(`  📊 Frames: ${frameCount}`);
    console.log(`  ⚡ Taxa: ${FRAME_RATE} FPS\n`);

    console.log("🎬 Vídeo pronto para demonstração dos testes!");
  } else {
    console.log("❌ Erro ao criar vídeo (código ${code})");
    if (stderr) {
      console.log("  Detalhes:", stderr);
    }
  }
});

ffmpegProcess.on("error", (err) => {
  console.error("❌ Erro ao executar FFmpeg:", err.message);
});
