// Mede a referência de chão: contraste por faixa de frequência, densidade de
// seixos e verifyca de continuidade nas bordas. O objetivo é saber o que
// numerically a textura precisa ter, em vez de afinar no olho.
//
//   node scripts/measure-reference.mjs
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

const img = await readPng(process.argv[2] ?? 'C:/Users/adielvale/Desktop/titles/e36bdef4-b349-4fa8-b8ce-0e4640e072fd.png');
const { width: W, height: H, channels: C, data } = img;

const luma = (x, y) => {
  const i = (y * W + x) * C;
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
};

console.log(`referencia: ${W}x${H}, canais ${C}`);

// --- cor media e faixa -----------------------------------------------------
let rSum = 0, gSum = 0, bSum = 0, n = 0;
for (let y = 0; y < H; y += 2) {
  for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * C;
    rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; n++;
  }
}
console.log(`cor media: rgb(${(rSum/n).toFixed(0)}, ${(gSum/n).toFixed(0)}, ${(bSum/n).toFixed(0)})`);

// --- contraste por escala ---------------------------------------------------
// Média local em várias caixas. A diferença entre caixas de tamanhos diferentes
// é a energia do ruído NAQUELA escala. Uma textura de chão boa tem energia
// em toda faixa, inclusive a fina; uma lisa empurra tudo para a banda grossa.
const meanAt = (x0, y0, size) => {
  let s = 0, k = 0;
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      s += luma((x + W) % W, (y + H) % H);
      k++;
    }
  }
  return s / k;
};

console.log('\ncontraste por escala (desvio da media local, 0-255):');
console.log('caixa   desvio');
for (const size of [2, 4, 8, 16, 32, 64, 128]) {
  const samples = [];
  for (let y = 0; y + size < H; y += size * 2) {
    for (let x = 0; x + size < W; x += size * 2) {
      samples.push(meanAt(x, y, size));
    }
  }
  const m = samples.reduce((a, b) => a + b, 0) / samples.length;
  const sd = Math.sqrt(samples.reduce((a, b) => a + (b - m) ** 2, 0) / samples.length);
  console.log(`${String(size).padStart(4)}   ${sd.toFixed(2).padStart(6)}`);
}

// --- continuidade nas bordas -------------------------------------------------
// A textura é seamless? Compara a primeira coluna com a última e a primeira
// linha com a última. Se a arte é seamless de verdade, a borda esquerda e a
// direita são vizinhas, então a diferença pixel a pixel é a mesma que entre
// dois pixels internos.
let diffCol = 0, diffLinha = 0, k = 0;
for (let y = 0; y < H; y++) {
  diffCol += Math.abs(luma(0, y) - luma(W - 1, y));
  k++;
}
for (let x = 0; x < W; x++) {
  diffLinha += Math.abs(luma(x, 0) - luma(x, H - 1));
}
k = H * W;
console.log(`\nborda esquerda vs direita: media ${(diffCol/H).toFixed(2)}`);
console.log(`borda topo vs base:        media ${(diffLinha/W).toFixed(2)}`);

// --- densidade de seixos ----------------------------------------------------
// Seixos são máximos locais com borda clara em cima. Conta quantos existem por
// mil pixels, olhando a resposta a um Laplaciano (marcas bordas de disco).
const bordas = [];
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const lap = 4 * luma(x, y) - luma(x - 1, y) - luma(x + 1, y) - luma(x, y - 1) - luma(x, y + 1);
    bordas.push(Math.abs(lap));
  }
}
const mediaBorda = bordas.reduce((a, b) => a + b, 0) / bordas.length;
// Limiar: borda forte. Proporção de pixels acima do limiar = densidade de seixo.
const forte = bordas.filter((b) => b > mediaBorda * 2.2).length;
console.log(`\nresposta media ao Laplaciano: ${mediaBorda.toFixed(2)}`);
console.log(`pixels com borda forte (>2.2x media): ${(forte / bordas.length * 100).toFixed(2)}%`);
console.log(`  ou seja ~${(forte / bordas.length * bordas.length / 1000).toFixed(0)} bordas por mil pixels`);
