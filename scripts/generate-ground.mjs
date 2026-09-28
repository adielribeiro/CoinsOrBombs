// Gera o atlas do chão da caverna.
//
// O chão deixou de ser arte de tile: era uma grelha 3x3 gravada em cada
// `floor_*.png`, e nenhuma escala ou sobreposição remove aquilo. Aqui a
// superfície é sintetizada uma única vez, contínua, e recortada nas células
// isométricas. Ver src/game/ground.js para a matemática da emenda.
//
//   node scripts/generate-ground.mjs
//
// Saída: public/assets/ground_atlas.png
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_COLUMNS,
  GROUND_ROWS,
  SOIL_BY_BIOME,
  getGroundAtlasSize,
  renderGroundCell
} from '../src/game/ground.js';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c;
  }

  return table;
})();

function crc32(buffer) {
  let c = -1;

  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }

  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Codifica RGBA em PNG.
 *
 * Filtro Sub em toda linha: o chão é ruído suave e quase metade do atlas são
 * cantos transparentes, e o Sub transforma gradientes em repetições curtas
 * que o deflate comprime muito melhor do que dado cru.
 */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 1; // Sub

    for (let x = 0; x < stride; x += 1) {
      const current = rgba[y * stride + x];
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;

      raw[rowStart + 1 + x] = (current - left) & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidade de bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compressão deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sem entrelaçamento

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const { width, height } = getGroundAtlasSize();

/**
 * Um atlas por bioma.
 *
 * O mesmo relevo e a mesma estrutura de altura, mudando só o material: cor,
 * intensidade da fissura e quanto o seixo levanta. Assim a Mina Solar é terra
 * batida, a Gruta de Gelo é neve e as Ruínas são pedra lavrada, todas com a
 * mesma costura contínua entre células.
 *
 * São 4 arquivos porque o tint do Phaser só multiplica — um atlas marrom
 * tingido de azul vira lama escura, não gelo. O jogo baixa só o do bioma atual.
 */
let total = 0;

for (const [biomeId, material] of Object.entries(SOIL_BY_BIOME)) {
  const atlas = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      const cell = renderGroundCell(col, row, GROUND_CELL_WIDTH, GROUND_CELL_HEIGHT, material);
      const originX = col * GROUND_CELL_WIDTH;
      const originY = row * GROUND_CELL_HEIGHT;

      for (let py = 0; py < GROUND_CELL_HEIGHT; py += 1) {
        const from = py * GROUND_CELL_WIDTH * 4;
        const to = ((originY + py) * width + originX) * 4;

        atlas.set(cell.subarray(from, from + GROUND_CELL_WIDTH * 4), to);
      }
    }
  }

  const png = encodePng(width, height, atlas);
  const path = `public/assets/ground_${biomeId}.png`;
  await writeFile(path, png);
  total += png.length;

  // Cor média, para conferir que o material entrou mesmo.
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < atlas.length; i += 4) {
    if (atlas[i + 3] === 0) continue;
    r += atlas[i];
    g += atlas[i + 1];
    b += atlas[i + 2];
    n += 1;
  }

  console.log(
    `ground_${biomeId}.png  ${width}x${height}  ${(png.length / 1024).toFixed(0)} KB  `
      + `cor media rgb(${(r / n).toFixed(0)},${(g / n).toFixed(0)},${(b / n).toFixed(0)})  `
      + `${((n / (width * height)) * 100).toFixed(0)}% opaco`
  );
}

console.log(`\n${GROUND_COLUMNS}x${GROUND_ROWS} celas de ${GROUND_CELL_WIDTH}x${GROUND_CELL_HEIGHT} por bioma`);
console.log(`total no repositorio: ${(total / 1024 / 1024).toFixed(2)} MB — o jogo baixa so o do bioma atual`);
