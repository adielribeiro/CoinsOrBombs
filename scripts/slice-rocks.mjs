// Recorta as folhas de rocha por bioma em um spritesheet pronto para o jogo.
//
//   node scripts/slice-rocks.mjs               // todas as folhas da pasta titles
//   node scripts/slice-rocks.mjs frost         // so uma, para iterar rapido
//
// O que entra e o que sai
// ----------------------
// Entrada: `rocks_<bioma>.png`, 1448x1086, uma folha 4x3 de celulas de 362px,
// com 12 modelos de rocha por bioma. Medido nas seis folhas: todas com a mesma
// dimensao, todas as 12 celulas preenchidas, e nenhuma celula passa de 360px de
// conteudo — sobra 1px de calha, entao nenhum modelo invade o vizinho.
//
// Saida: `public/assets/rocks_<bioma>.png`, um spritesheet 4x3 de celulas
// QUADRADAS, que o BootScene carrega com `load.spritesheet`. E o mesmo caminho
// que o atlas do chao ja usa, entao nao ha conceito novo no projeto.
//
// Por que celula quadrada
// ----------------------
// Porque e a unica forma de nao distorcer. A rocha hoje e desenhada com
// `setDisplaySize(largura, altura)`, que esmaga o sprite para aquela caixa e
// ignora a proporcao do desenho. Com os modelos antigos, de 82x80, isso ja
// comprimia a arte na vertical para 56% do natural. Os modelos novos vao de
// 274x100 (laje deitada) a 344x360 (formacao alta): esmagar para uma caixa
// unica deformaria a laje para uma faixa e esticaria a formacao alta para um
// cilindro.
//
// Em vez disso a celula de saida e quadrada e o conteudo e reduzido para caber
// dentro dela, entalado na BASE e centralizado. Na hora de desenhar, a celula
// inteira vai para um quadrado na tela com escala uniforme, e a variedade de
// proporcao fica DENTRO da celula, que e onde ela pertence: a laje aparece
// baixa e larga, a formacao aparece alta, e nenhuma das duas e distorcida.
//
// Por que reduzir para 176px
// --------------------------
// A rocha ocupa cerca de 72px na tela, entao 176 e um buffer de 2,4x: sobra
// para tela de alta densidade sem sobrar imagem invisivel. As folhas de entrada
// pesam 1,7 a 2,2 MB com celulas de 362px; na saida isso vira uma fração disso.
// E o jogo baixa so a folha do bioma atual, como ja faz com o chao.
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { readPng } from './png.mjs';
import { encodePng } from './png-encode.mjs';

// Grade das folhas de entrada.
const GRADE_COLS = 4;
const GRADE_ROWS = 3;
const CELULA_ENTRADA = 362;

/** Celula de saida. Quadrada: e o que impede a distorcao. */
const CELULA_SAIDA = 176;

/**
 * Recorte do conteudo dentro da celula de entrada.
 *
 * A varredura e em passo de 1 porque o alfa importa: a base de uma rocha tem
 * borda suave, e um passo maior deixaria a borda serrilhada depois da reducao.
 * 362x362 por celula, 12 celulas por folha, 6 folhas: perto de 9,4 milhao de
 * pixels, o que e alguns segundos.
 */
function recorteDoConteudo(img, x0, y0) {
  const { width: W, channels: C, data: D } = img;
  let minX = CELULA_ENTRADA;
  let maxX = -1;
  let minY = CELULA_ENTRADA;
  let maxY = -1;

  for (let y = 0; y < CELULA_ENTRADA; y += 1) {
    for (let x = 0; x < CELULA_ENTRADA; x += 1) {
      const i = ((y0 + y) * W + (x0 + x)) * C;
      if (D[i + 3] > 2) {
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
 * Reduz o conteudo para dentro da celula de saida.
 *
 * A escala e a menor entre "caber na largura" e "caber na altura", entao o
 * detalhe nunca e esticado para preencher. E bilinear com amostra em area
 * ponderada: o PNG de entrada tem borda alpha suave, e nearest deixaria
 * serrilhado depois de 362-&gt;176.
 */
function reduzComBilinear(img, origem, escala, destinoX, destinoY, larguraDestino, alturaDestino) {
  const { width: W, channels: C, data: D } = img;
  const saida = new Uint8ClampedArray(CELULA_SAIDA * CELULA_SAIDA * 4);

  for (let y = 0; y < alturaDestino; y += 1) {
    // Centro do pixel de destino, mapeado de volta para a origem.
    const sy = (y + 0.5) / escala - 0.5 + origem.y;
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    const y1 = Math.min(CELULA_ENTRADA - 1, Math.max(0, y0 + 1));
    const y0c = Math.min(CELULA_ENTRADA - 1, Math.max(0, y0));

    for (let x = 0; x < larguraDestino; x += 1) {
      const sx = (x + 0.5) / escala - 0.5 + origem.x;
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      const x1 = Math.min(CELULA_ENTRADA - 1, Math.max(0, x0 + 1));
      const x0c = Math.min(CELULA_ENTRADA - 1, Math.max(0, x0));

      const o = (destinoY + y) * CELULA_SAIDA + (destinoX + x);
      if (o < 0 || o >= CELULA_SAIDA * CELULA_SAIDA) continue;

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (const [yy, wy] of [[y0c, 1 - fy], [y1, fy]]) {
        for (const [xx, wx] of [[x0c, 1 - fx], [x1, fx]]) {
          const peso = wy * wx;
          if (peso <= 0) continue;
          const i = (yy * W + xx) * C;
          // O alfa entra na media: sem isso, o RGB da borda transparente
          // (preto) escureceria a borda da rocha, e apareceria um halo escuro.
          const alfa = D[i + 3] / 255;
          r += D[i] * peso;
          g += D[i + 1] * peso;
          b += D[i + 2] * peso;
          a += alfa * peso;
        }
      }

      if (a > 0.0001) {
        // Despremultiplica: o RGB gravado e a cor real da rocha, e nao a cor
        // escurecida pela mistura com o fundo.
        saida[o * 4] = r / a;
        saida[o * 4 + 1] = g / a;
        saida[o * 4 + 2] = b / a;
      }
      saida[o * 4 + 3] = a * 255;
    }
  }

  return saida;
}

function recortaFolha(img) {
  const largura = GRADE_COLS * CELULA_SAIDA;
  const altura = GRADE_ROWS * CELULA_SAIDA;
  const saida = new Uint8ClampedArray(largura * altura * 4);
  const medidas = [];

  for (let r = 0; r < GRADE_ROWS; r += 1) {
    for (let c = 0; c < GRADE_COLS; c += 1) {
      const x0 = c * CELULA_ENTRADA;
      const y0 = r * CELULA_ENTRADA;
      const recorte = recorteDoConteudo(img, x0, y0);

      if (!recorte) {
        medidas.push({ indice: r * GRADE_COLS + c, vazia: true });
        continue;
      }

      const escala = Math.min(
        CELULA_SAIDA / recorte.largura,
        CELULA_SAIDA / recorte.altura
      );
      const larguraDestino = Math.max(1, Math.round(recorte.largura * escala));
      const alturaDestino = Math.max(1, Math.round(recorte.altura * escala));

      // Base encostada embaixo e centro no meio: e o que faz todas as rochas
      // assentarem no mesmo chao, em vez de cada uma flutuar na sua altura.
      const destinoX = Math.round((CELULA_SAIDA - larguraDestino) / 2);
      const destinoY = CELULA_SAIDA - alturaDestino;

      const celula = reduzComBilinear(
        img,
        recorte,
        escala,
        destinoX,
        destinoY,
        larguraDestino,
        alturaDestino
      );

      for (let y = 0; y < CELULA_SAIDA; y += 1) {
        for (let x = 0; x < CELULA_SAIDA; x += 1) {
          const de = (y * CELULA_SAIDA + x) * 4;
          const para = ((r * CELULA_SAIDA + y) * largura + (c * CELULA_SAIDA + x)) * 4;
          saida[para] = celula[de];
          saida[para + 1] = celula[de + 1];
          saida[para + 2] = celula[de + 2];
          saida[para + 3] = celula[de + 3];
        }
      }

      medidas.push({
        indice: r * GRADE_COLS + c,
        origem: `${recorte.largura}x${recorte.altura}`,
        saida: `${larguraDestino}x${alturaDestino}`,
        // Altura final em relacao a celula: e a medida que diz se a rocha vai
        // ler como laje deitada ou como formacao alta.
        alturaRelativa: alturaDestino / CELULA_SAIDA
      });
    }
  }

  return { saida, largura, altura, medidas };
}

const BIOMES = ['sunstone', 'frost', 'ember', 'ruins', 'wind', 'crystal'];
const apenas = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const alvos = apenas.length > 0 ? apenas : BIOMES;

await mkdir('public/assets', { recursive: true });

for (const biome of alvos) {
  const entrada = `C:/Users/adielvale/Desktop/titles/rocks_${biome}.png`;
  const temEntrada = await access(entrada).then(() => true, () => false);

  if (!temEntrada) {
    console.log(`rocks_${biome}.png nao encontrado em titles/ — pulando`);
    continue;
  }

  const img = await readPng(entrada);
  if (img.width !== GRADE_COLS * CELULA_ENTRADA || img.height !== GRADE_ROWS * CELULA_ENTRADA) {
    console.log(
      `rocks_${biome}.png tem ${img.width}x${img.height}, e a grade `
        + `esperada e ${GRADE_COLS * CELULA_ENTRADA}x${GRADE_ROWS * CELULA_ENTRADA}. `
        + `Nada foi escrito.`
    );
    continue;
  }

  const { saida, largura, altura, medidas } = recortaFolha(img);
  const destino = `public/assets/rocks_${biome}.png`;
  const png = encodePng(largura, altura, saida);
  await writeFile(destino, png);

  const entradaKB = (await readFile(entrada)).length / 1024;
  const alturas = medidas.filter((m) => !m.vazia).map((m) => m.alturaRelativa);
  const maisBaixa = Math.min(...alturas);
  const maisAlta = Math.max(...alturas);

  console.log(
    `rocks_${biome}.png  ${img.width}x${img.height} -> ${largura}x${altura}  `
      + `${Math.round(entradaKB)} KB -> ${Math.round(png.length / 1024)} KB  `
      + `| altura na celula: ${(maisBaixa * 100).toFixed(0)}% a ${(maisAlta * 100).toFixed(0)}%`
  );
}
