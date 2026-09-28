// Composição lado a lado do chão de todos os biomas, para comparar de uma vez.
// A lista vem de BIOMES, então um bioma novo entra aqui sem tocar neste script.
//
//   node scripts/preview-biomes.mjs
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

import { toIso } from '../src/game/config.js';
import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  SOIL_BY_BIOME,
  groundColorAt,
  groundPixelToMap,
  renderGroundCell
} from '../src/game/ground.js';
import { BIOMES, getBiomeForCave } from '../src/game/progression.js';
import { encodePng } from './png-encode.mjs';

const COLS = 5;
const ROWS = 3;
const SPRITE_W = 97;
const SPRITE_H = 50;

const celulasW = (COLS + ROWS) * (SPRITE_W / 2) + SPRITE_W;
const celulasH = (ROWS + COLS) * (SPRITE_H / 2) + SPRITE_H;
const GAP = 8;
const W = BIOMES.length * celulasW + (BIOMES.length - 1) * GAP;
const H = celulasH;

const out = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < out.length; i += 4) {
  out[i] = 0x11;
  out[i + 1] = 0x14;
  out[i + 2] = 0x1c;
  out[i + 3] = 0xff;
}

BIOMES.forEach((biome, indice) => {
  const material = SOIL_BY_BIOME[biome.id];
  const tint = biome.palette.ground;
  const tr = (tint >> 16) & 0xff;
  const tg = (tint >> 8) & 0xff;
  const tb = tint & 0xff;
  const baseX = indice * (celulasW + GAP);

  const centers = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      centers.push({ col, row, ...toIso(col, row, 0, 0, SPRITE_W, SPRITE_H) });
    }
  }
  centers.sort((a, b) => a.y - b.y);

  for (const cell of centers) {
    const data = renderGroundCell(cell.col, cell.row, GROUND_CELL_WIDTH, GROUND_CELL_HEIGHT, material);
    const lx = baseX + Math.round(cell.x - GROUND_CELL_WIDTH / 2);
    const ly = Math.round(cell.y - GROUND_CELL_HEIGHT / 2);

    for (let py = 0; py < GROUND_CELL_HEIGHT; py += 1) {
      for (let px = 0; px < GROUND_CELL_WIDTH; px += 1) {
        const from = (py * GROUND_CELL_WIDTH + px) * 4;
        if (data[from + 3] === 0) continue;
        const tx = lx + px;
        const ty = ly + py;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        const to = (ty * W + tx) * 4;
        out[to] = (data[from] * tr) / 255;
        out[to + 1] = (data[from + 1] * tg) / 255;
        out[to + 2] = (data[from + 2] * tb) / 255;
        out[to + 3] = 255;
      }
    }
  }
});

await writeFile('biomes-preview.png', encodePng(W, H, out));

console.log(`biomes-preview.png ${W}x${H}`);
for (const biome of BIOMES) {
  const material = SOIL_BY_BIOME[biome.id];
  let r = 0, g = 0, b = 0, n = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      for (let py = 0; py < 57; py += 3) {
        for (let px = 0; px < 112; px += 3) {
          const p = groundPixelToMap(col, row, px + 0.5, py + 0.5);
          if (Math.abs(p.sx) + Math.abs(p.sy) > 1) continue;
          const [pr, pg, pb] = groundColorAt(p.colf, p.rowf, material);
          r += pr; g += pg; b += pb; n += 1;
        }
      }
    }
  }
  const R = r / n, G = g / n, B = b / n;
  console.log(
    `  ${biome.name.padEnd(20)} rgb(${R.toFixed(0).padStart(3)},${G.toFixed(0).padStart(3)},${B.toFixed(0).padStart(3)})`
    + `  lum ${(0.299 * R + 0.587 * G + 0.114 * B).toFixed(0)}`
  );
}
