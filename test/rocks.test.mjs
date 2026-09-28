import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';

import { readPng } from '../scripts/png.mjs';
import { BIOMES } from '../src/game/progression.js';
import {
  ROCK_CELL_SIZE,
  ROCK_SHEET_COLUMNS,
  ROCK_SHEET_ROWS,
  ROCK_VARIANT_COUNT,
  ROCK_VARIANT_COUNTS,
  ROCK_DISPLAY,
  getRockFrameIndex,
  getRockJitter,
  getRockSheetKey,
  getRockVariantCount
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

test('a grade comporta todos os sprites de todos os biomas', () => {
  // A grade é fixa (4x4) e a contagem varia por bioma, então a pergunta aqui é
  // se ela COMPORTA. A versão anterior fixava a grade no tamanho exato da
  // contagem, e a folha saía com alturas diferentes — o que deixava a grade do
  // jogo errada para os biomas que não tinham 12.
  const capacidade = ROCK_SHEET_COLUMNS * ROCK_SHEET_ROWS;
  const maior = Math.max(...Object.values(ROCK_VARIANT_COUNTS));
  const menor = Math.min(...Object.values(ROCK_VARIANT_COUNTS));

  assert.ok(
    maior <= capacidade,
    `o bioma com mais sprites tem ${maior}, e a grade comporta ${capacidade}`
  );
  assert.equal(
    ROCK_VARIANT_COUNT,
    menor,
    `o piso de seguranca e ${ROCK_VARIANT_COUNT}, e o menor bioma tem ${menor}. `
      + `Com o piso acima do menor, um indice sorteado cairia no piso em vez de `
      + `dar modulo, e o bioma perderia os ultimos sprites.`
  );
});

test('a contagem de sprites bate com a pasta, menos a arte levitante', () => {
  // A pasta de origem é a fonte da verdade, e não um manifest ao lado: é a pasta
  // que o fatiador lê, e um manifest seria uma segunda lista para sair de
  // sincronia.
  //
  // A contagem do código tem de ser MENOR ou igual à da pasta, e nunca maior —
  // declarar mais sprites do que a folha tem sempre dá índice fora da folha, que
  // é o placeholder de textura ausente.
  const pasta = 'C:/Users/adielvale/AppData/Local/Temp/opencode/sprites_zip/sprites_168x168';

  if (!existsSync(pasta)) {
    // Sem o ZIP descompactado não há o que comparar, e falhar aqui seria depender
    // de um caminho que não viaja com o repositório.
    return;
  }

  let totalPasta = 0;

  for (const biome of BIOMES) {
    const arquivos = readdirSync(`${pasta}/${biome.id}`)
      .filter((n) => n.endsWith('.png'));
    const declarado = getRockVariantCount(biome.id);
    totalPasta += arquivos.length;

    assert.ok(
      declarado <= arquivos.length,
      `${biome.id}: o codigo declara ${declarado} sprites, e a pasta tem `
        + `${arquivos.length}. Declarar mais do que a folha tem sempre dá `
        + `índice fora da folha, que é o placeholder de textura ausente.`
    );
  }

  // A diferença tem que ser o descarte de levitantes, e nada mais. Se um bioma
  // perdesse sprites por outro motivo, esta contagem acusaria.
  const totalCodigo = Object.values(ROCK_VARIANT_COUNTS).reduce((a, n) => a + n, 0);

  assert.equal(
    totalPasta - totalCodigo,
    4,
    `${totalPasta - totalCodigo} sprites descartados, e o esperado são 4 `
      + `levitantes da Galeria de Vento`
  );
});

test('o indice de frame nunca sai da folha do bioma', () => {
  // Um indice fora da faixa vira o placeholder de textura ausente, e nenhum dos
  // dois estoura excecao. E por isso que o mod e duplo e normalizado.
  for (const biome of Object.keys(ROCK_VARIANT_COUNTS)) {
    const total = getRockVariantCount(biome);

    for (const entrada of [-100, -total, -total - 1, -1, 0, total - 1, total, total + 1, 100]) {
      const indice = getRockFrameIndex(biome, entrada);

      assert.ok(
        Number.isInteger(indice) && indice >= 0 && indice < total,
        `${biome}: variante ${entrada} virou o indice ${indice}, fora de 0..${total - 1}`
      );
    }

    // Valores que nao sao numero usam o primeiro modelo, em vez de virar NaN.
    for (const entrada of [NaN, undefined, null, 'x', 1.7, -0.5]) {
      const indice = getRockFrameIndex(biome, entrada);
      assert.ok(
        Number.isInteger(indice) && indice >= 0 && indice < total,
        `${biome}: variante ${String(entrada)} virou o indice ${indice}`
      );
    }
  }
});

test('cada bioma tem folha com nome proprio', () => {
  const chaves = new Set(BIOMES.map((b) => getRockSheetKey(b.id)));

  assert.equal(chaves.size, BIOMES.length, 'dois biomas apontando para a mesma folha de rocha');
  assert.ok(getRockSheetKey('frost').includes('frost'), 'a chave deveria conter o id do bioma');

  // Todo bioma do jogo precisa de uma contagem declarada. Sem ela, o sorteio cai
  // no piso de 12 e uma folha de 14 fica com dois modelos fora da rodagem.
  for (const biome of BIOMES) {
    assert.ok(
      Number.isInteger(ROCK_VARIANT_COUNTS[biome.id]),
      `${biome.id} sem contagem de sprites declarada`
    );
  }
});

test('o gerador sorteia indice de rocha dentro da folha do bioma', async () => {
  const { generateMap } = await import('../src/game/systems/mapGenerator.js');

  // Sem isto, um bioma com folha de tamanho diferente receberia um índice que o
  // Phaser não acha, e o sintoma seria a tela inteira de caixas pretas.
  for (let cave = 1; cave <= 60; cave += 1) {
    const mapa = generateMap(cave, 1, 0);
    const total = getRockVariantCount(mapa.biome.id);

    for (const linha of mapa.tiles) {
      for (const tile of linha) {
        if (tile.type !== 'rock') continue;

        const indice = getRockFrameIndex(mapa.biome.id, tile.rockVariant);
        assert.ok(
          Number.isInteger(indice) && indice >= 0 && indice < total,
          `cave ${cave} (${mapa.biome.id}): variante ${tile.rockVariant} virou o `
            + `indice ${indice}, fora de 0..${total - 1}`
        );
      }
    }
  }
});

test('o gerador usa todos os sprites do bioma, nao so os doze primeiros', async () => {
  // O defeito de onde isto nasceu: um número único de variantes, sorteado do
  // mesmo jeito em todo bioma. Num bioma com 14 sprites, sortear de 0 a 11
  // funciona e ninguém percebe — dois modelos simplesmente nunca aparecem.
  const { generateMap } = await import('../src/game/systems/mapGenerator.js');

  for (const biome of BIOMES) {
    const esperado = getRockVariantCount(biome.id);
    const vistos = new Set();

    // Várias caves do bioma, para a chance de aparecer todos os modelos.
    for (let cave = biome.startCave; cave <= biome.endCave; cave += 1) {
      const mapa = generateMap(cave, 1, 0);
      for (const linha of mapa.tiles) {
        for (const tile of linha) {
          if (tile.type === 'rock') vistos.add(tile.rockVariant);
        }
      }
    }

    assert.equal(
      vistos.size,
      esperado,
      `${biome.id}: apareceram ${vistos.size} de ${esperado} sprites em `
        + `${biome.endCave - biome.startCave + 1} caves`
    );
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

test('nenhuma celula em uso fica com buraco embaixo, e nenhuma esta vazia', async () => {
  // Este e o teste do sintoma de rocha flutuando, e ele existe porque o fatiador
  // tinha um bug que nenhuma outra verificacao pegava: `reduzParaCelula` escrevia
  // o conteudo no canto (0, 0) da celula, e o empacotamento calculava `baseX` e
  // `baseY` para reassentar em seguida — duas variaveis que nunca eram lidas,
  // porque a copia do buffer para a folha e posicional e ignora as coordenadas.
  //
  // O resultado era conteudo no TOPO da celula, com o vazio sobrando embaixo. Na
  // cena o sprite usa origem (0.5, 1), entao esse vazio aparecia como levitacao:
  // quanto mais baixo o sprite estava no canvas de origem, maior era o buraco.
  // Medido na folha da Mina Solar antes da correcao, 9 das 12 rochas nao encostavam
  // na base, e a dispersao entre a mais alta e a mais baixa era de 32px na tela.
  //
  // A variacao de tamanho entre sprites continua existindo — e e o que da
  // silhuetas diferentes. O que nao pode existir e buraco: buraco e levitacao.
  for (const biome of BIOMES) {
    const folha = await readPng(new URL(`rocks_${biome.id}.png`, raiz));
    const total = getRockVariantCount(biome.id);

    for (let indice = 0; indice < total; indice += 1) {
      const x0 = (indice % ROCK_SHEET_COLUMNS) * ROCK_CELL_SIZE;
      const y0 = Math.floor(indice / ROCK_SHEET_COLUMNS) * ROCK_CELL_SIZE;
      const alfaEm = (y, x) => folha.data[((y0 + y) * folha.width + x0 + x) * folha.channels + 3];

      let ultimaOpaque = -1;
      for (let y = ROCK_CELL_SIZE - 1; y >= 0 && ultimaOpaque < 0; y -= 1) {
        for (let x = 0; x < ROCK_CELL_SIZE; x += 1) {
          if (alfaEm(y, x) > 8) {
            ultimaOpaque = y;
            break;
          }
        }
      }

      assert.notEqual(
        ultimaOpaque,
        -1,
        `${biome.id}: a celula ${indice} esta TRANSPARENTE. Com 'endFrame' em `
          + `${total - 1} no BootScene, o jogo vai pedir um frame vazio, e o `
          + `Phaser mostra o placeholder de textura ausente.`
      );

      assert.equal(
        ultimaOpaque,
        ROCK_CELL_SIZE - 1,
        `${biome.id}: a celula ${indice} termina na linha ${ultimaOpaque} da `
          + `celula, e nao na ${ROCK_CELL_SIZE - 1}. As ${ROCK_CELL_SIZE - 1 - ultimaOpaque} `
          + `linhas vazias viram levitacao na tela, porque o sprite e ancorado `
          + `pela base.`
      );
    }
  }
});
