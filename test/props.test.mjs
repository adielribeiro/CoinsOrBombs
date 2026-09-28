import test from 'node:test';
import assert from 'node:assert/strict';

import { readPng } from '../scripts/png.mjs';
import {
  BASE_TILE_HEIGHT,
  BASE_TILE_WIDTH,
  CAVE_ENTRANCE_ASPECT,
  CAVE_ENTRANCE_BASE,
  CAVE_ENTRANCE_WIDTH,
  PICKAXE_ASPECT,
  PICKAXE_DISPLAY
} from '../src/game/config.js';
import { ROCK_DISPLAY } from '../src/game/rocks.js';

const raiz = new URL('../public/assets/', import.meta.url);

/**
 * A arte da boca e da picareta chega num canvas quadrado de 168x168, CENTRALIZADA,
 * com folga transparente igual em cima e embaixo. O jogo ancora os dois pela BASE
 * (`setOrigin(0.5, 1)`), então essa folga não é espaço neutro: ela vira distância
 * entre o rodapé da peça e o chão, e a peça levita por um valor que depende da
 * arte em vez de depender do jogo.
 *
 * Medido na boca antes do corte: 29px de folga embaixo, o que virava 12,6px de
 * levitação na tela. `scripts/trim-props.mjs` apara a arte na origem; estes testes
 * existem para o corte não ser desfeito por um `setDisplaySize` novo, e para a
 * proporção declarada no código não divergir da arte sem ninguém avisar.
 */
const ARTE = {
  boca: { arquivo: 'cave_entrance.png', aspecto: CAVE_ENTRANCE_ASPECT, largura: 156, altura: 113 },
  picareta: { arquivo: 'pickaxe_lvl1.png', aspecto: PICKAXE_ASPECT, largura: 140, altura: 142 }
};

for (const [nome, arte] of Object.entries(ARTE)) {
  test(`a arte de ${nome} esta aparada no conteudo`, async () => {
    const img = await readPng(new URL(arte.arquivo, raiz));

    assert.equal(
      img.width,
      arte.largura,
      `${arte.arquivo} tem ${img.width}px de largura, e o codigo assume `
        + `${arte.largura}. Reexecute 'node scripts/trim-props.mjs'.`
    );
    assert.equal(
      img.height,
      arte.altura,
      `${arte.arquivo} tem ${img.height}px de altura, e o codigo assume `
        + `${arte.altura}. Reexecute 'node scripts/trim-props.mjs'.`
    );
  });

  test(`a proporcao de ${nome} no codigo bate com a arte`, () => {
    // `setDisplaySize(largura, altura)` com a proporcao errada estica a arte sem
    // erro nenhum: o build passa, os testes passam, e o arco sai achatado num
    // tile que e duas vezes mais largo que alto. E por isso que a proporcao mora
    // em `config.js` com o nome do arquivo do lado, e naomagada em um `setScale`
    // dentro da cena.
    const doArquivo = arte.altura / arte.largura;

    assert.ok(
      Math.abs(arte.aspecto - doArquivo) < 0.0005,
      `${arte.arquivo} tem proporcao ${doArquivo.toFixed(4)}, e o codigo assume `
        + `${arte.aspecto.toFixed(4)}`
    );
  });

  test(`a arte de ${nome} nao tem folga transparente`, async () => {
    // Se aparecer folga de novo, a peça volta a flutuar. E a folga aqui é
    // simetrica por construction: a arte de origem e centralizada no canvas.
    const img = await readPng(new URL(arte.arquivo, raiz));
    const { width: W, height: H, channels: C, data: D } = img;
    let minX = W;
    let maxX = -1;
    let minY = H;
    let maxY = -1;

    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (D[(y * W + x) * C + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    assert.notEqual(maxY, -1, `${arte.arquivo} esta totalmente transparente`);

    for (const [lado, valor, extremo] of [
      ['acima', minY, 'inicio'],
      ['abaixo', H - 1 - maxY, 'fim'],
      ['a esquerda', minX, 'inicio'],
      ['a direita', W - 1 - maxX, 'fim']
    ]) {
      assert.equal(
        valor,
        0,
        `${arte.arquivo} tem ${valor}px de folga ${lado}. O sprite e ancorado `
          + `pela base, e folga no ${extremo} vira levitacao na tela. `
          + `Rode 'node scripts/trim-props.mjs'.`
      );
    }
  });
}

test('a boca e maior que o tile e cabe na tela', () => {
  // A boca é a entrada da caverna, e uma entrada que não é maior que o tile que
  // ela atravessa não lê como entrada. A versão anterior usava 0,54 de `setScale`
  // sobre uma arte menor, o que dava 61px de boca num tile de 96px.
  const larguraBoca = Math.round(BASE_TILE_WIDTH * CAVE_ENTRANCE_WIDTH);

  assert.ok(
    larguraBoca > BASE_TILE_WIDTH,
    `a boca sai com ${larguraBoca}px, e o tile tem ${BASE_TILE_WIDTH}px. `
      + `Uma entrada do tamanho do tile le como um objeto posto em cima dele.`
  );

  // E ela não pode engolir o mapa. A altura que importa é a que invade as linhas
  // de fundo, que é a que cobre a caverna: `tileHeight / 2` por linha.
  const alturaBoca = Math.round(larguraBoca * CAVE_ENTRANCE_ASPECT);
  const linhasCobertas = alturaBoca / (BASE_TILE_HEIGHT / 2);

  assert.ok(
    linhasCobertas <= 4,
    `a boca cobre ${linhasCobertas.toFixed(1)} linhas de fundo (altura `
      + `${alturaBoca}px, avanco ${BASE_TILE_HEIGHT / 2}px). Acima de 4 ela `
      + `esconde o mapa atras.`
  );
});

test('a boca e a picareta assentam na mesma linha que as rochas', () => {
  // As rochas assentam em 0,3 da altura do tile. A boca precisa assentar perto
  // disso: e o mesmo chao. Com 0,28 a diferenca e de 1px, invisivel; e o valor
  // antigo, que era `setScale` com origem no centro e a arte acima da linha do
  // chao, deixava a boca inteira flutuando.
  const baseRochas = BASE_TILE_HEIGHT * 0.3;
  const baseBoca = BASE_TILE_HEIGHT * CAVE_ENTRANCE_BASE;

  assert.ok(
    Math.abs(baseRochas - baseBoca) <= 2,
    `a boca assenta em ${baseBoca.toFixed(1)}px e as rochas em `
      + `${baseRochas.toFixed(1)}px do centro do tile. Sao o mesmo chao, e uma `
      + `diferenca de ${Math.abs(baseRochas - baseBoca).toFixed(1)}px le como `
      + `a boca estar mais funda que a rocha.`
  );
});

test('a picareta cobre a rocha sem esconder o mapa', () => {
  // A picareta e o efeito de golpe: ela passa POR CIMA da rocha que esta sendo
  // quebrada. Se ela for grande demais, o efeito esconde justamente a peca que o
  // jogador esta mirando.
  const larguraPicareta = Math.round(BASE_TILE_WIDTH * PICKAXE_DISPLAY);
  const ladoRochas = Math.round(BASE_TILE_WIDTH * ROCK_DISPLAY);

  assert.ok(
    larguraPicareta < ladoRochas,
    `a picareta sai com ${larguraPicareta}px, e a rocha com ${ladoRochas}px. `
      + `Com a picareta maior, o golpe cobre a rocha que ele deveria atingir.`
  );
});
