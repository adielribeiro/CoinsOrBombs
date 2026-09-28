// Mede a distribuição do termo de Lambert para fixar o recenter e o ganho.
//
//   node scripts/measure-lambert.mjs
//
// `lambert` tem viés positivo numa superfície quase plana, porque o termo Z da
// normal domina. Sem recenter, a rampa satura no topo e o chão vira areia
// clara. Este script imprime a média e o desvio reais para que os números do
// recenter venham de medição, e não de tentativa.
import { GROUND_CELL_HEIGHT, GROUND_CELL_WIDTH, groundPixelToMap, sampleGround } from '../src/game/ground.js';

const amostras = [];

for (let row = 0; row < 12; row += 1) {
  for (let col = 0; col < 14; col += 1) {
    for (let py = 0; py < GROUND_CELL_HEIGHT; py += 1) {
      for (let px = 0; px < GROUND_CELL_WIDTH; px += 1) {
        const { colf, rowf, sx, sy } = groundPixelToMap(col, row, px + 0.5, py + 0.5);
        if (Math.abs(sx) + Math.abs(sy) > 1) continue;
        amostras.push(sampleGround(colf, rowf));
      }
    }
  }
}

const campo = (nome, valores) => {
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const desvio = Math.sqrt(valores.reduce((a, b) => a + (b - media) ** 2, 0) / valores.length);
  const ordenados = [...valores].sort((a, b) => a - b);
  const p01 = ordenados[Math.floor(ordenados.length * 0.01)];
  const p99 = ordenados[Math.floor(ordenados.length * 0.99)];
  console.log(`${nome.padEnd(10)} media ${media.toFixed(4).padStart(8)}  desvio ${desvio.toFixed(4).padStart(7)}  p01 ${p01.toFixed(3).padStart(7)}  p99 ${p99.toFixed(3).padStart(7)}`);
  return { media, desvio, p01, p99 };
};

const l = campo('lambert', amostras.map((s) => s.light));
const altura = campo('altura', amostras.map((s) => s.height));

// O que o recenter precisa: deslocar a média para 0.5 e o ganho para que o
// p01/p99 caibam na rampa sem estourar.
console.log('');
console.log('recenter: subtrair a media, para o centro cair em 0.5');
console.log('ganho de contraste: (0.5 - 0.01) / (p99 - media) =', (0.49 / (l.p99 - l.media)).toFixed(2));
console.log('                          e (0.5 - 0.01) / (media - p01) =', (0.49 / (l.media - l.p01)).toFixed(2));
console.log('');
console.log(`samples: ${amostras.length}`);
console.log(`altura: media ${altura.media.toFixed(3)}, desvio ${altura.desvio.toFixed(3)}`);
