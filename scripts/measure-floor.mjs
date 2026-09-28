// Mede a geometria do losango superior de cada variante de chão.
// O topo do bloco é um losango isométrico; abaixo dele ficam as faces
// laterais, que é o que faz cada tile parecer um bloco empilhado.
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

async function readPng(path) {
  const buf = await readFile(path);
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bpp = channels * (bitDepth / 8);
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

for (const name of ['floor_01', 'floor_02', 'floor_03']) {
  const img = await readPng(`public/assets/${name}.png`);
  const { width, height, channels, data } = img;

  let yTop = -1, yBottom = -1, widest = 0, yWidest = -1;
  const alpha = (x, y) => data[(y * width + x) * channels + (channels === 4 ? 3 : 0)];

  for (let y = 0; y < height; y++) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < width; x++) {
      if (alpha(x, y) > 24) { if (minX < 0) minX = x; maxX = x; }
    }
    if (minX < 0) continue;
    if (yTop < 0) yTop = y;
    yBottom = y;
    const w = maxX - minX;
    if (w > widest) { widest = w; yWidest = y; }
  }

  const fullH = yBottom - yTop + 1;
  const topH = yWidest - yTop + 1;

  console.log(
    `${name}: ${width}x${height} | topo y=${yTop} base y=${yBottom} | largura max=${widest + 1} em y=${yWidest}\n` +
    `   altura do losango superior = ${topH}px de ${fullH}px totais (${(topH / fullH * 100).toFixed(0)}%)\n` +
    `   razao 2:1 esperada do topo = ${(widest / topH).toFixed(2)} (ideal 2.00)`
  );
}
