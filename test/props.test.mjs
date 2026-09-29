import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { readPng } from '../scripts/png.mjs';
import {
  BASE_TILE_HEIGHT,
  BASE_TILE_WIDTH,
  CAVE_ENTRANCE_BASE,
  PICKAXE_ASPECT,
  PICKAXE_DISPLAY
} from '../src/game/config.js';
import {
  ENTRANCES,
  ENTRANCE_DISPLAY,
  getEntranceAspect,
  getEntranceForBiome,
  getEntranceKey,
  listEntranceKeys
} from '../src/game/entrances.js';
import { BIOMES } from '../src/game/progression.js';
import { ROCK_DISPLAY } from '../src/game/rocks.js';

const raiz = new URL('../public/assets/', import.meta.url);

/**
 * A boca da caverna deixou de ser uma arte só. Antes These testes existiam para
 * duas peças — `cave_entrance.png` e `pickaxe_lvl1.png` — e o que eles guardavam
 * continua de pé, com uma peça a mais: seis entradas, uma por bioma.
 *
 * A armadilha que eles-existem-para pegar é a mesma das outras duas, e ela é
 * silenciosa: a arte de origem chega num canvas de 1254x1254 CENTRALIZADO, e o
 * jogo ancora a boca pela BASE. Então a folga transparente não é espaço neutro,
 * é distância entre o pedestal e o chão. Medido na arte de origem: de 65px a 92px
 * de folga embaixo, por bioma.
 */
test('toda entrada existe em disco, no tamanho que o registro declara', async () => {
  for (const biome of BIOMES) {
    const entrada = getEntranceForBiome(biome.id);
    const caminho = new URL(`${entrada.key}.png`, raiz);

    assert.ok(existsSync(caminho), `falta a entrada de ${biome.id}: ${entrada.key}.png`);

    const img = await readPng(caminho);

    assert.equal(
      img.width,
      entrada.largura,
      `${entrada.key}.png tem ${img.width}px de largura, e o registro assume `
        + `${entrada.largura}. Reexecute 'node scripts/trim-entrances.mjs'.`
    );
    assert.equal(
      img.height,
      entrada.altura,
      `${entrada.key}.png tem ${img.height}px de altura, e o registro assume `
        + `${entrada.altura}. Reexecute 'node scripts/trim-entrances.mjs'.`
    );
  }
});

test('a proporção no código bate com a do arquivo, entrada por entrada', async () => {
  // `setDisplaySize(largura, altura)` com a proporção errada estica a arte sem
  // erro nenhum: o build passa, os testes passam, e o arco sai esmagado. E aqui
  // não pode ser uma constante única: as seis proporções vão de 0,831 (Ruínas, o
  // arco mais largo) a 0,883 (Cristal, o mais alto), e forçar uma delas
  // deformaria cincodas seis em até 6%.
  for (const biome of BIOMES) {
    const entrada = getEntranceForBiome(biome.id);
    const img = await readPng(new URL(`${entrada.key}.png`, raiz));
    const doArquivo = img.height / img.width;

    assert.ok(
      Math.abs(getEntranceAspect(biome.id) - doArquivo) < 0.0005,
      `${entrada.key}.png tem proporção ${doArquivo.toFixed(4)}, e o código `
        + `assume ${getEntranceAspect(biome.id).toFixed(4)}`
    );
  }
});

test('nenhuma entrada tem folga transparente', async () => {
  // Se a folga voltar, a peça volta a flutuar. E ela é simétrica por construção:
  // a arte de origem é centralizada no canvas.
  for (const biome of BIOMES) {
    const entrada = getEntranceForBiome(biome.id);
    const img = await readPng(new URL(`${entrada.key}.png`, raiz));
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

    assert.notEqual(maxY, -1, `${entrada.key}.png está totalmente transparente`);

    for (const [lado, valor, extremo] of [
      ['acima', minY, 'início'],
      ['abaixo', H - 1 - maxY, 'fim'],
      ['a esquerda', minX, 'início'],
      ['a direita', W - 1 - maxX, 'fim']
    ]) {
      assert.equal(
        valor,
        0,
        `${entrada.key}.png tem ${valor}px de folga ${lado}. O sprite é ancorado `
          + `pela base, e folga no ${extremo} vira levitação na tela. `
          + `Rode 'node scripts/trim-entrances.mjs'.`
      );
    }
  }
});

test('toda entrada tem o seu próprio arquivo, e nenhum se repete', () => {
  // A entrada deixou de ser uma arte única justamente para ser diferente por
  // bioma. Duas chaves iguais aqui significam dois biomas com a mesma boca, que é
  // o que a arte nova veio resolver.
  const chaves = listEntranceKeys();
  assert.equal(chaves.length, BIOMES.length, 'a contagem de entradas não bate com a de biomas');
  assert.equal(new Set(chaves).size, chaves.length, 'duas entradas compartilham a mesma chave');

  for (const biome of BIOMES) {
    assert.ok(ENTRANCES[biome.id], `${biome.id} sem entrada no registro`);
  }
});

test('bioma sem entrada no registro cai na primeira, e a primeira existe', () => {
  // Um bioma novo, sem entrada, não pode derrubar a cena: cai na da Mina Solar.
  assert.equal(getEntranceKey('bioma-que-nao-existe'), getEntranceKey(BIOMES[0].id));
  assert.ok(ENTRANCES[BIOMES[0].id], 'a entrada de reserva não existe');
});

test('a boca é maior que o tile e cobre uma faixa plausível de fundo', () => {
  // A entrada é a única peça alta da cena, e ela fica SEMPRE em `col: 0`, na
  // linha do meio — a borda esquerda do mapa, por `mapGenerator`. Por isso ela
  // pode ter quase oito linhas de altura sem comer o campo de jogo: o que ela
  // cobre para cima e para a direita é fundo.
  //
  // O que este teste segura é o outro lado: a boca não pode crescer sem parar. A
  // 4x o tile ela já cobriria o triângulo de tiles acima do ponto, e a 6x
  // cobriria a tela inteira em portrait. O teto é 3x.
  const larguraBoca = BASE_TILE_WIDTH * ENTRANCE_DISPLAY;
  const alturaBoca = larguraBoca * getEntranceAspect(BIOMES[0].id);
  const linhas = alturaBoca / (BASE_TILE_HEIGHT / 2);

  assert.ok(
    larguraBoca > BASE_TILE_WIDTH,
    `a boca sai com ${larguraBoca.toFixed(0)}px, e o tile tem `
      + `${BASE_TILE_WIDTH}px. Uma entrada do tamanho do tile lê como um objeto.`
  );

  assert.ok(
    linhas <= 12,
    `a boca cobre ${linhas.toFixed(1)} linhas de fundo (altura `
      + `${alturaBoca.toFixed(0)}px, avanço ${BASE_TILE_HEIGHT / 2}px). Acima de `
      + `12 ela toma a tela inteira em portrait.`
  );

  // E a base tem de ficar dentro do próprio tile, senão o pedestal flutua ou
  // afunda no chão. O meio-tile para trás e para a frente é 0,5.
  const base = BASE_TILE_HEIGHT * CAVE_ENTRANCE_BASE;
  assert.ok(
    base > -BASE_TILE_HEIGHT * 0.5 && base < BASE_TILE_HEIGHT * 0.5,
    `a base da boca está em ${base.toFixed(1)}px do centro do tile, e o `
      + `meio-tile vai de ${(-BASE_TILE_HEIGHT / 2).toFixed(1)} a `
      + `${(BASE_TILE_HEIGHT / 2).toFixed(1)}`
  );
});

test('a picareta continua sem esticar e sem cobrir a rocha', async () => {
  // A picareta é o efeito de golpe: ela passa POR CIMA da rocha que está sendo
  // quebrada. Se for grande demais, o efeito esconde justamente a peça que o
  // jogador está mirando.
  const imagem = await readPng(new URL('pickaxe_lvl1.png', raiz));

  assert.equal(imagem.width, 140, 'a picareta mudou de tamanho; ajuste PICKAXE_ASPECT');
  assert.equal(imagem.height, 142, 'a picareta mudou de tamanho; ajuste PICKAXE_ASPECT');

  assert.ok(
    Math.abs(PICKAXE_ASPECT - 142 / 140) < 0.0005,
    `PICKAXE_ASPECT é ${PICKAXE_ASPECT}, e a arte tem 142/140`
  );

  const larguraPicareta = BASE_TILE_WIDTH * PICKAXE_DISPLAY;
  const ladoRochas = BASE_TILE_WIDTH * ROCK_DISPLAY;

  assert.ok(
    larguraPicareta < ladoRochas,
    `a picareta sai com ${larguraPicareta.toFixed(0)}px, e a rocha com `
      + `${ladoRochas.toFixed(0)}px. Com a picareta maior, o golpe cobre a rocha.`
  );
});
