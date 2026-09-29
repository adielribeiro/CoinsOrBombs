// Apara e reduz a arte da entrada de caverna, uma por bioma.
//
//   node scripts/trim-entrances.mjs
//
// Existe por dois motivos, e os dois medidos.
//
// ## Aparar
//
// A arte chega num canvas quadrado de 1254x1254, CENTRALIZADA. Medido nos seis
// arquivos: a folga transparente é de 65px a 92px embaixo, e o conteúdo ocupa
// entre 1221x1039 e 1249x1089. Como o jogo ancora a boca pela BASE
// (`setOrigin(0.5, 1)`), essa folga não é espaço neutro: ela vira distância
// entre o pedestal de pedra e o chão, e a peça passa a flutuar por um valor que
// depende da arte em vez de depender do jogo.
//
// ## Reduzir
//
// A entrada é desenhada com 1,2x a largura do tile, ou 115px na tela. A arte de
// origem tem 1244px de largura: são 10,8x mais pixels do que a peça ocupa, em um
// PNG de 2,1 MB. Os seis arquivos juntos dariam 12,6 MB para algo que, no
// tamanho em que aparece, é um arco de 115px.
//
// O alvo aqui é `LADO_ALVO`, escolhido com folga: a entrada é desenhada com
// 1,2x a largura do tile, ou 115px na tela, e numa tela retina o canvas renderiza
// a 2x. Com 240px de arquivo a peça já estaria no ponto. Fica em 480 porque foi
// dimensionado quando a entrada estava a 2,4x, e 480 ainda dá espaço para ela
// crescer sem refazer a arte.
//
// Reduzir por média de caixa e não por amostragem de ponto: numa redução de
// 2,6x o ponto pega um pixel e joga fora cinco, e o contorno da arte fica
// serrilhado.
import { readFile, readdir, writeFile } from 'node:fs/promises';

import { readPng } from './png.mjs';
import { encodePng } from './png-encode.mjs';

const ORIGEM = 'C:/Users/adielvale/AppData/Local/Temp/opencode/cavein_zip/cave in';
const BIOMAS = ['sunstone', 'frost', 'ember', 'ruins', 'wind', 'crystal'];

/** Largura final, em pixels de arquivo. Ver a nota sobre `LADO_ALVO`. */
const LADO_ALVO = 480;

const LIMIAR = 8;

/** Recorte do conteúdo, com o alfa. O limiar é o mesmo do fatiador de rochas. */
function recorteDoConteudo(img) {
  const { width: W, height: H, channels: C, data: D } = img;
  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (D[(y * W + x) * C + 3] > LIMIAR) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, largura: maxX - minX + 1, altura: maxY - minY + 1 };
}

/**
 * Reduz por média de caixa, com o alfa na média e desmultiplicação na escrita.
 *
 * As duas etapas do alfa são o que separa uma borda limpa de uma franja suja:
 * sem o alfa na média, a borda semi-transparente é puxada para a cor de fundo do
 * PNG (o preto), e a peça ganha um contorno escuro de 1px. Sem desmultiplicar,
 * a cor gravada é a cor já escurecida pela mistura.
 */
function reduzPorCaixa(img, recorte, larguraDestino) {
  const { width: W, channels: C, data: D } = img;
  const escalaX = recorte.largura / larguraDestino;
  const alturaDestino = Math.max(1, Math.round(recorte.altura / escalaX));
  const escalaY = recorte.altura / alturaDestino;
  const saida = new Uint8ClampedArray(larguraDestino * alturaDestino * 4);

  for (let dy = 0; dy < alturaDestino; dy += 1) {
    const y0 = Math.floor(dy * escalaY);
    const y1 = Math.max(y0 + 1, Math.min(recorte.altura, Math.ceil((dy + 1) * escalaY)));

    for (let dx = 0; dx < larguraDestino; dx += 1) {
      const x0 = Math.floor(dx * escalaX);
      const x1 = Math.max(x0 + 1, Math.min(recorte.largura, Math.ceil((dx + 1) * escalaX)));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = ((recorte.y + y) * W + (recorte.x + x)) * C;
          const alfa = D[i + 3] / 255;
          // Soma já descontada pelo alfa, para a média sair da cor pura.
          r += D[i] * alfa;
          g += D[i + 1] * alfa;
          b += D[i + 2] * alfa;
          a += alfa;
          n += 1;
        }
      }

      const o = (dy * larguraDestino + dx) * 4;

      if (a > 0) {
        saida[o] = r / a;
        saida[o + 1] = g / a;
        saida[o + 2] = b / a;
      }
      saida[o + 3] = (a / n) * 255;
    }
  }

  return { saida, alturaDestino };
}

const existentes = new Set((await readdir('public/assets')).map((n) => n.toLowerCase()));
let totalAntes = 0;
let totalDepois = 0;

console.log('bioma      origem         destino        proporcao   arquivo');
console.log('-------------------------------------------------------------------------');

for (const bioma of BIOMAS) {
  const entrada = `${ORIGEM}/cave in ${bioma}.png`;
  const destino = `public/assets/cave_entrance_${bioma}.png`;

  let bufOrigem;
  try {
    bufOrigem = await readFile(entrada);
  } catch {
    console.log(`  ${bioma}: ${entrada} não existe. Nada foi escrito para este bioma.`);
    continue;
  }

  const img = await readPng(entrada);
  const recorte = recorteDoConteudo(img);

  if (!recorte) {
    console.log(`  ${bioma}: arte totalmente transparente. Nada foi escrito.`);
    continue;
  }

  const largura = Math.min(LADO_ALVO, recorte.largura);
  const { saida, alturaDestino } = reduzPorCaixa(img, recorte, largura);

  const antes = Math.round(bufOrigem.length / 1024);
  const png = encodePng(largura, alturaDestino, saida);
  await writeFile(destino, png);

  totalAntes += antes;
  totalDepois += png.length;

  console.log(
    `${bioma.padEnd(9)} ${`${recorte.largura}x${recorte.altura}`.padEnd(14)} `
      + `${`${largura}x${alturaDestino}`.padEnd(14)} `
      + `${(largura / alturaDestino).toFixed(4).padEnd(11)} `
      + `${antes} KB -> ${Math.round(png.length / 1024)} KB`
  );
}

console.log('-------------------------------------------------------------------------');
console.log(
  `total ${Math.round(totalAntes / 1024 / 1024 * 10) / 10} MB -> `
    + `${Math.round(totalDepois / 1024 / 10) / 10} MB`
);

if (existentes.has('cave_entrance.png')) {
  console.log('');
  console.log('ATENCAO: public/assets/cave_entrance.png ainda existe e virou orfa.');
}
