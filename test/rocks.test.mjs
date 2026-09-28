import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

import { BIOMES } from '../src/game/progression.js';
import {
  ROCK_CELL_SIZE,
  ROCK_SHEET_COLUMNS,
  ROCK_SHEET_ROWS,
  ROCK_VARIANT_COUNT,
  ROCK_DISPLAY,
  getRockFrameIndex,
  getRockJitter,
  getRockSheetKey
} from '../src/game/rocks.js';
import { BASE_TILE_HEIGHT, BASE_TILE_WIDTH } from '../src/game/config.js';

const raiz = new URL('../public/assets/', import.meta.url);

/**
 * A primeira integração passou o build e os 66 testes, e mostrou 39 caixas
 * pretas com um X verde na tela — o placeholder de textura ausente do Phaser.
 * A causa foi passar o NOME do frame para `add.image`; o `load.spritesheet` não
 * recebe `frameNames`, então nome de frame não existe. O caminho certo é
 * `setFrame` com índice, que é o que o atlas do chão já fazia.
 *
 * Estes testes existem para o próximo bug de textura não precisar de uma sessão
 * de navegador para aparecer.
 */

test('toda folha de rocha tem o tamanho que o recorte produziu', async () => {
  // A constante do código e a do script precisam concordar. Se o script mudar
  // `CELULA_SAIDA` e o código não, os frames ficam desalinhados e o Phaser
  // não acha nada — de novo sem erro em lugar nenhum.
  const esperado = ROCK_SHEET_COLUMNS * ROCK_CELL_SIZE;
  const esperadoAlto = ROCK_SHEET_ROWS * ROCK_CELL_SIZE;

  for (const biome of BIOMES) {
    const caminho = new URL(`rocks_${biome.id}.png`, raiz);
    const temArquivo = await access(caminho).then(() => true, () => false);

    assert.ok(temArquivo, `falta a folha de rocha de ${biome.id}`);

    const buf = await readFile(caminho);
    assert.equal(buf.toString('ascii', 1, 4), 'PNG', `rocks_${biome.id}.png nao e PNG`);

    const largura = buf.readUInt32BE(16);
    const altura = buf.readUInt32BE(20);

    assert.equal(
      largura,
      esperado,
      `rocks_${biome.id}.png tem ${largura}px de largura, e o codigo espera ${esperado} `
        + `(${ROCK_SHEET_COLUMNS} colunas de ${ROCK_CELL_SIZE}px)`
    );
    assert.equal(
      altura,
      esperadoAlto,
      `rocks_${biome.id}.png tem ${altura}px de altura, e o codigo espera ${esperadoAlto} `
        + `(${ROCK_SHEET_ROWS} linhas de ${ROCK_CELL_SIZE}px)`
    );
  }
});

test('a folha tem os doze modelos que o gerador pode sortear', () => {
  assert.equal(ROCK_VARIANT_COUNT, 12, `a folha tem ${ROCK_VARIANT_COUNT} modelos`);
  assert.equal(ROCK_SHEET_COLUMNS * ROCK_SHEET_ROWS, ROCK_VARIANT_COUNT);
});

test('o indice de frame nunca sai da folha', () => {
  // Um indice fora da faixa vira o placeholder de textura ausente, e nenhum dos
  // dois estoura excecao. E por isso que o mod e duplo e normalizado.
  for (const entrada of [-100, -13, -12, -1, 0, 11, 12, 13, 100]) {
    const indice = getRockFrameIndex(entrada);

    assert.ok(
      Number.isInteger(indice) && indice >= 0 && indice < ROCK_VARIANT_COUNT,
      `variante ${entrada} virou o indice ${indice}, fora de 0..${ROCK_VARIANT_COUNT - 1}`
    );
  }

  // Valores que nao sao numero usam o primeiro modelo, em vez de virar NaN.
  for (const entrada of [NaN, undefined, null, 'x', 1.7, -0.5]) {
    const indice = getRockFrameIndex(entrada);
    assert.ok(
      Number.isInteger(indice) && indice >= 0 && indice < ROCK_VARIANT_COUNT,
      `variante ${String(entrada)} virou o indice ${indice}`
    );
  }
});

test('cada bioma tem folha com nome proprio', () => {
  const chaves = new Set(BIOMES.map((b) => getRockSheetKey(b.id)));

  assert.equal(chaves.size, BIOMES.length, 'dois biomas apontando para a mesma folha de rocha');
  assert.ok(getRockSheetKey('frost').includes('frost'), 'a chave deveria conter o id do bioma');
});

test('o gerador sorteia indice de rocha dentro da faixa', async () => {
  const { generateMap } = await import('../src/game/systems/mapGenerator.js');

  // Sem isto, um bioma novo com folha de tamanho diferente receberia um indice
  // que o Phaser nao acha, e o sintoma seria a tela inteira de caixas pretas.
  for (let cave = 1; cave <= 60; cave += 1) {
    const mapa = generateMap(cave, 1, 0);

    for (const linha of mapa.tiles) {
      for (const tile of linha) {
        if (tile.type !== 'rock') continue;

        const indice = getRockFrameIndex(tile.rockVariant);
        assert.ok(
          Number.isInteger(indice) && indice >= 0 && indice < ROCK_VARIANT_COUNT,
          `cave ${cave}: variante ${tile.rockVariant} virou o indice ${indice}`
        );
      }
    }
  }
});

test('o jitter da rocha e deterministico', () => {
  // O mapa e redesenhado a cada rocha quebrada e a cada redimensionamento. Um
  // jitter sorteado a cada desenho faria as rochas pularem de lugar a cada
  // repintura, o que e pior do que nenhuma variacao: parece bug.
  for (let col = 0; col < 9; col += 1) {
    for (let row = 0; row < 9; row += 1) {
      for (let v = 0; v < 12; v += 1) {
        const a = getRockJitter(col, row, v);
        const b = getRockJitter(col, row, v);

        assert.equal(a.angulo, b.angulo, `angulo mudou para (${col},${row},${v})`);
        assert.equal(a.escala, b.escala, `escala mudou para (${col},${row},${v})`);
        assert.equal(a.espelhar, b.espelhar, `espelhamento mudou para (${col},${row},${v})`);
      }
    }
  }
});

test('o jitter fica dentro dos limites que a cena assume', () => {
  for (let col = 0; col < 9; col += 1) {
    for (let row = 0; row < 9; row += 1) {
      for (let v = 0; v < 12; v += 1) {
        const j = getRockJitter(col, row, v);

        // Angulo: a rocha e ancorada na base, entao pivotar muito tira o pe
        // do losango do tile.
        assert.ok(
          Math.abs(j.angulo) <= 5,
          `angulo de ${j.angulo} graus em (${col},${row},${v}) passa dos 5`
        );
        // Escala: acima de 1,1 a rocha invade o tile vizinho de cima e o mapa
        // deixa de se ler; abaixo de 0,9 some.
        assert.ok(
          j.escala >= 0.9 && j.escala <= 1.1,
          `escala de ${j.escala.toFixed(3)} em (${col},${row},${v}) fora de 0,9 a 1,1`
        );
        assert.equal(typeof j.espelhar, 'boolean');
      }
    }
  }
});

test('o jitter realmente varia entre tiles vizinhos', () => {
  // Se o jitter devolvesse quase sempre o mesmo valor, ele estaria presente no
  // código e não na tela. Contar quantos valores distintos aparecem num mapa
  // inteiro é a checagem que pega isso.
  const angulos = new Set();
  const escalas = new Set();
  let espelhados = 0;

  for (let col = 0; col < 9; col += 1) {
    for (let row = 0; row < 9; row += 1) {
      const j = getRockJitter(col, row, (col + row) % 12);
      angulos.add(j.angulo.toFixed(3));
      escalas.add(j.escala.toFixed(3));
      if (j.espelhar) espelhados += 1;
    }
  }

  assert.ok(angulos.size >= 40, `so ${angulos.size} angulos distintos em 81 tiles`);
  assert.ok(escalas.size >= 40, `so ${escalas.size} escalas distintas em 81 tiles`);
  assert.ok(
    espelhados > 15 && espelhados < 66,
    `${espelhados} de 81 espelhadas: o espelhamento esta tendendo para um lado`
  );
});

test('a rocha nao cobre mais que tres linhas de fundo', () => {
  // Este numero veio de olhar a tela, nao de um calculo. A primeira integracao
  // usou `ROCK_DISPLAY` em 0.78, e o resultado foi um campo de 40 formacoes em
  // que o chao sumia e o mapa deixava de se ler. Nenhum teste pegaria aquilo:
  // o codigo estava certo, a arte estava certa, e o resultado era ilegive.
  //
  // A conta: o quadrado desenhado tem `tileWidth * ROCK_DISPLAY` de lado, e
  // cada linha do mapa avanca `tileHeight / 2` na tela. Com 84% dos tiles
  // sendo rocha, uma formacao alta cobre varias linhas ao mesmo tempo, e o
  // que fica entre elas e o chao.
  const lado = BASE_TILE_WIDTH * ROCK_DISPLAY;
  const avancoPorLinha = BASE_TILE_HEIGHT / 2;
  const linhasCobertas = lado / avancoPorLinha;

  assert.ok(
    linhasCobertas <= 3,
    `a rocha cobre ${linhasCobertas.toFixed(1)} linhas de fundo (lado ${lado.toFixed(0)}px, `
      + `avanco ${avancoPorLinha}px). Acima de 3 o mapa deixa de se ler.`
  );

  // E nao pode ser pequena demais para ler como rocha. O modelo mais baixo das
  // folhas ocupa 31% da altura da celula, e foi esse piso que apareceu achatado
  // demais quando a escala caiu muito.
  const menorModelo = 0.31;
  assert.ok(
    lado * menorModelo >= 14,
    `o modelo mais baixo sairia com ${(lado * menorModelo).toFixed(1)}px de altura, `
      + `abaixo dos 14px que ainda leem como rocha`
  );
});
