// Recorte pelo conteúdo e redução por média de caixa, para a arte que vem de fora.
//
// Estas duas funções nasceram em `trim-entrances.mjs` e foram parar aqui porque a
// escada da saída precisa exatamente do mesmo treatment: uma arte pintada num
// canvas quadrado de 1254x1254, centralizada, que precisa ser aparada e reduzida
// antes de virar um PNG carregado pelo jogo.
//
// A regra que vale para as duas peças, e que é a mesma do fatiador de rochas: a
// arte de origem vem CENTRALIZADA, com folga transparente em volta. O jogo ancora
// as peças no chão, então essa folga não é espaço neutro — ela vira distância
// entre o rodapé da peça e o chão, e a peça passa a flutuar por um valor que
// depende da arte, não do jogo.

/**
 * Limiar de alfa para considerar um pixel "conteúdo".
 *
 * 8, e não mais: a borda de uma arte pintada tem o alfa subindo devagar, e um
 * limiar baixo puxa para dentro um halo quase invisível que, depois da
 * reamostragem, vira franja suja.
 */
export const LIMIAR = 8;

/** Recorte do conteúdo, com o alfa. Devolve `null` se a arte for vazia. */
export function recorteDoConteudo(img, limiar = LIMIAR) {
  const { width: W, height: H, channels: C, data: D } = img;
  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (D[(y * W + x) * C + 3] > limiar) {
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
 * PNG (o preto), e a peça ganha um contorno escuro de 1px. Sem desmultiplicar, a
 * cor gravada é a cor já escurecida pela mistura.
 *
 * E por caixa e não por amostragem de ponto: numa redução de 7,8x — que é o caso
 * da escada, de 1003px para 128px — o ponto pega um pixel e joga fora quase oito,
 * e o contorno da arte fica serrilhado.
 */
export function reduzPorCaixa(img, recorte, larguraDestino) {
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
