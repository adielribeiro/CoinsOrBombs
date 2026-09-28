// Reproduz em Node a camada de chão exatamente como o jogo a desenha, para
// inspecionar e medir sem depender do navegador.
//
//   node scripts/preview-ground.mjs
//
// Espelha `drawGroundCell` em src/game/scenes/CaveScene.js: célula em
// toIso(col, row), `setDisplaySize(tileWidth + 1, tileHeight + 1)`, amostra
// bilinear (o filtro do Phaser) e o tint do bioma em cada célula.
//
// A medição do fim é a que importa: ela compara o salto de luminância
// atravessando a fronteira entre células com o salto dentro de uma célula.
// Numa superfície contínua o primeiro é comparável ao segundo; com costura
// seria muito maior.
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

import { toIso } from '../src/game/config.js';
import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_COLUMNS,
  GROUND_ROWS,
  groundPixelToMap,
  groundColorAt
} from '../src/game/ground.js';
import { getBiomeForCave } from '../src/game/progression.js';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const start = y * (stride + 1);
    raw[start] = 1;
    for (let x = 0; x < stride; x += 1) {
      const current = rgba[y * stride + x];
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
      raw[start + 1 + x] = (current - left) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --- o que o jogo faria -------------------------------------------------

const COLS = 6;
const ROWS = 5;
const CAVE = 1;

const BASE_TILE_WIDTH = Math.round(86 * 1.12);
const BASE_TILE_HEIGHT = Math.round(44 * 1.12);
const TILE_W = BASE_TILE_WIDTH;
const TILE_H = BASE_TILE_HEIGHT;
// `setDisplaySize(tileWidth + 1, tileHeight + 1)`: a sobreposição de 1px.
const SPRITE_W = TILE_W + 1;
const SPRITE_H = TILE_H + 1;

// A célula mais à esquerda é (0, ROWS-1); a de cima é (0, 0). Centralizar o
// losango do mapa é igual a centralizar a célula central.
const originX = ROWS * (TILE_W / 2) + SPRITE_W / 2;
const originY = SPRITE_H / 2;
const W = Math.ceil((COLS + ROWS) * (TILE_W / 2) + SPRITE_W);
const H = Math.ceil((COLS + ROWS) * (TILE_H / 2) + SPRITE_H);

const biome = getBiomeForCave(CAVE);
const tint = biome.palette.ground;
// O tint do Phaser multiplica os três canais.
const tintR = (tint >> 16) & 0xff;
const tintG = (tint >> 8) & 0xff;
const tintB = tint & 0xff;

const out = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < out.length; i += 4) {
  out[i] = 0x11; out[i + 1] = 0x14; out[i + 2] = 0x1c; out[i + 3] = 0xff;
}

// Amostra bilinear do frame da célula, como o filtro linear do Phaser.
function sampleFrame(col, row, u, v) {
  // u, v em [0, 1] dentro do sprite.
  const x = u * GROUND_CELL_WIDTH - 0.5;
  const y = v * GROUND_CELL_HEIGHT - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  let r = 0, g = 0, b = 0, a = 0;

  for (let j = 0; j <= 1; j += 1) {
    for (let i = 0; i <= 1; i += 1) {
      const px = x0 + i;
      const py = y0 + j;
      const w = (i ? fx : 1 - fx) * (j ? fy : 1 - fy);
      if (w === 0) continue;

      const cx = px < 0 || px >= GROUND_CELL_WIDTH ? -1 : px;
      const cy = py < 0 || py >= GROUND_CELL_HEIGHT ? -1 : py;
      if (cx < 0 || cy < 0) continue; // fora do losango: transparente

      const m = groundPixelToMap(col, row, px + 0.5, py + 0.5);
      if (Math.abs(m.sx) + Math.abs(m.sy) > 1) continue;

      const [pr, pg, pb] = groundColorAt(m.colf, m.rowf);
      r += pr * w; g += pg * w; b += pb * w; a += w;
    }
  }

  if (a === 0) return null;
  return [r / a, g / a, b / a];
}

const centers = [];
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    centers.push({ col, row, ...toIso(col, row, originX, originY, TILE_W, TILE_H) });
  }
}
// Ordem do pintor, como no render.
centers.sort((p, q) => p.y - q.y);

for (let py = 0; py < H; py += 1) {
  for (let px = 0; px < W; px += 1) {
    for (const cell of centers) {
      const left = cell.x - SPRITE_W / 2;
      const top = cell.y - SPRITE_H / 2;
      const u = (px + 0.5 - left) / SPRITE_W;
      const v = (py + 0.5 - top) / SPRITE_H;

      if (u < 0 || u > 1 || v < 0 || v > 1) continue;

      const color = sampleFrame(cell.col % GROUND_COLUMNS, cell.row % GROUND_ROWS, u, v);
      if (!color) continue;

      const i = (py * W + px) * 4;
      out[i] = (color[0] * tintR) / 255;
      out[i + 1] = (color[1] * tintG) / 255;
      out[i + 2] = (color[2] * tintB) / 255;
      out[i + 3] = 255;
    }
  }
}

await writeFile('ground-preview.png', encodePng(W, H, out));

// --- medição: sobrou alguma grade? ---------------------------------------
// Compara o salto de luminância atravessando a fronteira entre células com o
// salto entre pixels vizinhos dentro de uma célula. Se houvesse costura, o
// primeiro seria muito maior que o segundo.
const luma = (i) => (out[i] + out[i + 1] + out[i + 2]) / 3;
const isGround = (px, py) => out[(py * W + px) * 4 + 3] === 255 && !(out[(py * W + px) * 4] === 0x11 && out[(py * W + px) * 4 + 1] === 0x14);

let within = 0;
for (let py = 1; py < H - 1; py += 1) {
  for (let px = 1; px < W - 1; px += 1) {
    if (!isGround(px, py) || !isGround(px + 1, py)) continue;
    within = Math.max(within, Math.abs(luma((py * W + px) * 4) - luma((py * W + px + 1) * 4)));
    if (!isGround(px, py + 1)) continue;
    within = Math.max(within, Math.abs(luma((py * W + px) * 4) - luma(((py + 1) * W + px) * 4)));
  }
}

let across = 0;
for (const cell of centers) {
  const left = cell.x - SPRITE_W / 2;
  const top = cell.y - SPRITE_H / 2;
  // Percorre a aresta inferior-direita do sprite.
  for (let step = 2; step < 40; step += 1) {
    const t = step / 40;
    const ex = left + (1 - t) * SPRITE_W;
    const ey = top + t * SPRITE_H;
    const nx = Math.round(ex) + 1;
    const ny = Math.round(ey);
    if (nx >= W || ny >= H) continue;
    if (!isGround(Math.round(ex), ny) || !isGround(nx, ny)) continue;
    across = Math.max(across, Math.abs(luma((ny * W + Math.round(ex)) * 4) - luma((ny * W + nx) * 4)));
  }
}

console.log(`ground-preview.png ${W}x${H}  (${biome.name}, tint 0x${tint.toString(16)})`);
console.log(`  salto dentro de uma celula: ${within.toFixed(1)}`);
console.log(`  salto atraves da fronteira: ${across.toFixed(1)}`);
console.log(`  razao atravessar/dentro: ${(across / within).toFixed(2)} (1.0 seria costura, ~1 sem grade)`);
