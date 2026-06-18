const fs = require("fs");
const path = require("path");
const GifEncoder = require("gif-encoder");
const sharp = require("sharp");

const FRAMES_DIR = path.join(__dirname, "videos", "frames");
const OUTPUT_GIF = path.join(
  __dirname,
  "videos",
  `pontinho-test-${Date.now()}.gif`,
);
const FRAME_RATE = 15; // 15 FPS para GIF (mais leve)

async function createGifFromFrames() {
  console.log("🎬 Convertendo frames para GIF...\n");

  // Listar frames
  const files = fs
    .readdirSync(FRAMES_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  if (files.length === 0) {
    console.log("❌ Nenhum frame encontrado!");
    return false;
  }

  console.log(`  📊 Total de frames: ${files.length}`);
  console.log(
    `  ⏱️  Duração esperada: ${(files.length / FRAME_RATE).toFixed(1)}s\n`,
  );

  // Obter dimensões da primeira imagem
  const firstFrame = path.join(FRAMES_DIR, files[0]);
  const metadata = await sharp(firstFrame).metadata();
  const { width, height } = metadata;

  console.log(`  📐 Resolução: ${width}x${height}`);

  // Criar GIF
  const gif = new GifEncoder(width, height, FRAME_RATE);
  gif.createWriteStream().pipe(fs.createWriteStream(OUTPUT_GIF));

  let processed = 0;

  for (const file of files) {
    const framePath = path.join(FRAMES_DIR, file);

    try {
      const imageBuffer = await sharp(framePath).raw().toBuffer();

      gif.addFrame(imageBuffer);
      processed++;

      if (processed % 50 === 0) {
        console.log(`  ⏳ ${processed}/${files.length} frames processados...`);
      }
    } catch (error) {
      console.error(`  ❌ Erro ao processar ${file}:`, error.message);
    }
  }

  return new Promise((resolve) => {
    gif.on("finished", () => {
      console.log(`\n✅ GIF criado com sucesso!`);
      console.log(`  📁 Arquivo: ${OUTPUT_GIF}`);

      const stats = fs.statSync(OUTPUT_GIF);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  📦 Tamanho: ${sizeMB} MB`);

      resolve(true);
    });

    gif.on("error", (error) => {
      console.error(`  ❌ Erro ao criar GIF:`, error);
      resolve(false);
    });

    gif.end();
  });
}

// Executar
createGifFromFrames().catch(console.error);
