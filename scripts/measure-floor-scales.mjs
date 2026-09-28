// Compara o contraste por escala do chão ATUAL com o da referência.
//
//   node scripts/measure-floor-scales.mjs
//
// Só conta pixels que são chão de verdade. Uma versão anterior media o patch
// inteiro, e os cantos transparentes do losango entravam na conta como se
// fossem chão: a máscara dominava a medição e o resultado não dizia nada
// sobre a textura.
import { GROUND_CELL_HEIGHT, GROUND_CELL_WIDTH, renderGroundCell } from '../src/game/ground.js';
import { readPng } from './png.mjs';

// O patch precisa ser grande o bastante para as escalas 32 e 64 terem amostras
// suficientes. Com 8x4 células a caixa de 64 nunca cabia inteira dentro do chão
// e saía "sem amostras", o que escondia justamente a faixa grossa.
const COLS = 14;
const ROWS = 12;

function composeGround() {
  const W = Math.round((COLS + ROWS) * (GROUND_CELL_WIDTH / 2) + GROUND_CELL_WIDTH);
  const H = Math.round((COLS + ROWS) * (GROUND_CELL_HEIGHT / 2) + GROUND_CELL_HEIGHT);
  const out = new Uint8ClampedArray(W * H * 4);
  const originX = ROWS * (GROUND_CELL_WIDTH / 2) + GROUND_CELL_WIDTH / 2;
  const originY = GROUND_CELL_HEIGHT / 2;

  const cells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      cells.push({
        col,
        row,
        x: originX + (col - row) * (GROUND_CELL_WIDTH / 2),
        y: originY + (col + row) * (GROUND_CELL_HEIGHT / 2)
      });
    }
  }
  cells.sort((a, b) => a.y - b.y);

  for (const cell of cells) {
    const data = renderGroundCell(cell.col, cell.row);
    const left = Math.round(cell.x - GROUND_CELL_WIDTH / 2);
    const top = Math.round(cell.y - GROUND_CELL_HEIGHT / 2);

    for (let py = 0; py < GROUND_CELL_HEIGHT; py += 1) {
      for (let px = 0; px < GROUND_CELL_WIDTH; px += 1) {
        const from = (py * GROUND_CELL_WIDTH + px) * 4;
        if (data[from + 3] === 0) continue;
        const tx = left + px;
        const ty = top + py;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        const to = (ty * W + tx) * 4;
        out[to] = data[from];
        out[to + 1] = data[from + 1];
        out[to + 2] = data[from + 2];
        out[to + 3] = 255;
      }
    }
  }

  return { out, W, H };
}

function escalaDeContraste(luma, W, H, dentro) {
  const linhas = [];

  for (const tamanho of [2, 4, 8, 16, 32, 64]) {
    const amostras = [];

    for (let y = 0; y + tamanho < H; y += tamanho * 2) {
      for (let x = 0; x + tamanho < W; x += tamanho) {
        // Só mede se a caixa for chão o suficiente. Exigir 100% de cobertura
        // eliminava quase toda amostra nas escalas 32 e 64, porque o losango é
        // raso: uma janela quadrada cabe dentro dele com dificuldade. Com 85%
        // de cobertura a medição continua sendo do chão, e o volume de amostras
        // volta a ser comparável entre as escalas.
        let cobertura = 0;
        for (let j = 0; j < tamanho; j += 1) {
          for (let i = 0; i < tamanho; i += 1) {
            if (dentro(x + i, y + j)) cobertura += 1;
          }
        }
        if (cobertura < tamanho * tamanho * 0.85) continue;

        let soma = 0;
        for (let j = 0; j < tamanho; j += 1) {
          for (let i = 0; i < tamanho; i += 1) soma += luma(x + i, y + j);
        }
        amostras.push(soma / (tamanho * tamanho));
      }
    }

    // Uma amostra de desvio-padrão precisa de volume para ser comparável. Na
  // escala 64 quase não sobram janelas inteiras dentro do losango, e comparar
  // um desvio de 6 amostras contra um de 4000 não diz nada — foi o que fez a
  // coluna 64 aparecer como 0.00 e mascarar o resto.
  if (amostras.length < 40) { linhas.push([tamanho, null, amostras.length]); continue; }

    const media = amostras.reduce((a, b) => a + b, 0) / amostras.length;
    const desvio = Math.sqrt(amostras.reduce((a, b) => a + (b - media) ** 2, 0) / amostras.length);
    linhas.push([tamanho, desvio, amostras.length]);
  }

  return linhas;
}

const referencia = await readPng(process.argv[2] ?? 'C:/Users/adielvale/Desktop/titles/e36bdef4-b349-4fa8-b8ce-0e4640e072fd.png');
const { width: RW, height: RH, channels: RC, data: RD } = referencia;

const lumaRef = (x, y) => {
  const i = (y * RW + x) * RC;
  return RD[i] * 0.299 + RD[i + 1] * 0.587 + RD[i + 2] * 0.114;
};

const { out, W, H } = composeGround();
const lumaAtual = (x, y) => {
  const i = (y * W + x) * 4;
  return out[i] * 0.299 + out[i + 1] * 0.587 + out[i + 2] * 0.114;
};

const ref = escalaDeContraste(lumaRef, RW, RH, () => true);
const atual = escalaDeContraste(lumaAtual, W, H, (x, y) => out[(y * W + x) * 4 + 3] === 255);

console.log('contraste por escala (so chao, sem a mascara)');
console.log('caixa   referencia   atual     razao   amostras');
for (let i = 0; i < ref.length; i += 1) {
  const [tamanho, r, quantas] = ref[i];
  const [, a] = atual[i];
  const razao = r && a ? (a / r).toFixed(2) : '  -  ';
  console.log(
    `${String(tamanho).padStart(4)}   ${(r ?? 0).toFixed(2).padStart(9)}   ${(a ?? 0).toFixed(2).padStart(7)}   ${razao.padStart(6)}   ${String(quantas ?? 0).padStart(6)}`
  );
}

console.log('\nalvo: a razao fica perto de 1.00 em todas as faixas.');
console.log('Abaixo de 1 na escala fina = textura lisa, sem detalhe de pixel.');
