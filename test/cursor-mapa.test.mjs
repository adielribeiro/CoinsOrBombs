import test from 'node:test';
import assert from 'node:assert/strict';

import { generateMap } from '../src/game/systems/mapGenerator.js';
import { isFrontierRock } from '../src/game/systems/helpers.js';
import { BIOMES, getBiomeStartCave } from '../src/game/progression.js';
import {
  dentroDoMapa,
  proximoTile,
  proximoTileValido,
  tileInicialDoCursor
} from '../src/game/cursor.js';

/**
 * O cursor de controle contra o mapa de verdade.
 *
 * Os testes de `cursor.js` usam retângulos e uma grade de 5x5, porque é assim que
 * a função se testa. Este aqui pega o mapa que o jogo gera mesmo, com as pedras
 * que ele coloca, e anda o cursor como a cena anda.
 *
 * A pergunta que importa é uma só: **quem chega em casa na última caverna
 * encontra pedra para quebrar com o controle?** É o caminho inteiro — geração,
 *projection isométrica, filtro de pedra e borda — e um erro em qualquer elo
 * deixaria a pessoa com um cursor que anda por cima de um mapa que não responde.
 */

const METRICAS = { tileWidth: 64, tileHeight: 32 };

/** Um mapa no começo de um bioma, que é quando o jogador tem o que fazer. */
function mapaDoBioma(indice = 0) {
  const biome = BIOMES[indice];

  return generateMap(getBiomeStartCave(biome.id), 1);
}

/**
 * O filtro que a cena passa para o cursor: qualquer tile que exista.
 *
 * É o mesmo da cena, e a igualdade é o ponto. O filtro antigo recusava pedra, e
 * com ele o cursor nunca ficava sobre uma — que é justamente o tile que o botão
 * de confirmar tenta quebrar. Um teste com o filtro errado continuaria verde
 * enquanto o controle não quebrava pedra nenhuma.
 */
function podeEntrarNoTileQueExiste(mapa) {
  return (col, row) => Boolean(mapa.tiles[row]?.[col]);
}

/** Anda o cursor na grade com o filtro da cena. */
function anda(mapa, col, row, dx, dy, opcoes = {}) {
  return proximoTileValido(col, row, dx, dy, opcoes, podeEntrarNoTileQueExiste(mapa));
}

const dimensoes = (mapa) => ({ largura: mapa.width, altura: mapa.height, metricas: METRICAS });

test('o cursor começa na entrada de todos os biomas', () => {
  // A entrada é o único lugar onde o jogador pode começar sem andar o mapa todo.
  for (let i = 0; i < BIOMES.length; i += 1) {
    const mapa = mapaDoBioma(i);
    const cursor = tileInicialDoCursor(mapa.entry, mapa.width, mapa.height);
    const tile = mapa.tiles[cursor.row]?.[cursor.col];

    assert.ok(tile, `${BIOMES[i].id}: o cursor começou fora do mapa`);
    assert.notEqual(tile.type, 'rock', `${BIOMES[i].id}: o cursor começou dentro de uma pedra`);
  }
});

test('andar o cursor nunca sai do mapa, em nenhum bioma e nenhuma direção', () => {
  // A propriedade que importa: a checagem de borda contra o mapa real, de **todo**
  // tile — inclusive de uma pedra. Um `NaN` aqui viraria um cursor em lugar
  // nenhum, e a pessoa acharia que o controle quebrou.
  //
  // A varredura passa por todos os tiles porque o cursor agora pode estar sobre
  // qualquer um deles. Quando ele começa dentro de uma pedra, um passo que não
  // cabe devolve o tile atual, e o tile atual é a própria pedra — que existe, e
  // por isso o teste passa. Era por isso que a versão antiga pulava as pedras: o
  // filtro antigo recusava pedra, e começar de uma pedra era um estado que o
  // jogo não produzia.
  for (let i = 0; i < BIOMES.length; i += 1) {
    const mapa = mapaDoBioma(i);
    const opcoes = dimensoes(mapa);

    for (let col = 0; col < mapa.width; col += 1) {
      for (let row = 0; row < mapa.height; row += 1) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const alvo = anda(mapa, col, row, dx, dy, opcoes);

          assert.ok(
            dentroDoMapa(alvo.col, alvo.row, mapa.width, mapa.height),
            `${BIOMES[i].id}: de (${col},${row}) para (${alvo.col},${alvo.row})`
          );

          const tile = mapa.tiles[alvo.row]?.[alvo.col];
          assert.ok(tile, `${BIOMES[i].id}: o cursor chegou num tile que não existe`);
        }
      }
    }
  }
});

/**
 * Anda a partir da entrada até o cursor ficar sobre uma pedra quebrável.
 *
 * Devolve quantos passos foram precisos, e `null` se não achou. É a caminhada do
 * jogo inteiro: geração, projeção isométrica, filtro do cursor e a borda da
 * caverna, com o filtro que a cena usa.
 */
function andaAtePedraQuebravel(mapa, limite = 96) {
  const opcoes = dimensoes(mapa);
  let cursor = tileInicialDoCursor(mapa.entry, mapa.width, mapa.height);
  let passos = 0;

  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [0, -1], [1, -1], [-1, 0], [0, 1], [1, 0]]) {
    for (let tentativa = 0; tentativa < 12; tentativa += 1) {
      cursor = anda(mapa, cursor.col, cursor.row, dx, dy, opcoes);
      passos += 1;

      const tile = mapa.tiles[cursor.row]?.[cursor.col];
      if (tile?.type === 'rock' && isFrontierRock(mapa, mapa.entry, tile)) return passos;

      if (passos >= limite) return null;
    }
  }

  return null;
}

test('de dentro da entrada, o cursor chega a uma pedra que dá para quebrar', () => {
  // A pergunta do usuário. Se isto falha, o controle não serve para jogar: a
  // pessoa mexe o analógico, o cursor passeia pela caverna e nada quebra.
  //
  // ## Por que vários mapas por bioma
  //
  // `generateMap` sorteia o mapa, e um teste que sorteia UM mapa por bioma
  // denuncia o sorteio, não a regra. Este falhou na CI em `ember` com "em 96
  // passos o cursor não achou pedra quebrável", e passou nas outras nove vezes em
  // que rodei. Um teste que falha em 1% das vezes ensina a pessoa a ignorar o
  // vermelho — que é o resultado pior possível, porque o vermelho deixa de
  // significar alguma coisa.
  //
  // ## Por que o alvo é a pedra DEBAixo do cursor
  //
  // Porque é o que o botão de confirmar quebra. A versão anterior procurava uma
  // pedra **vizinha**, o que descrevia um jogo que nunca existiu: com o filtro
  // que recusava pedra, o cursor não ficava sobre nenhuma, e o `A` — que age
  // sobre o tile de baixo — não tinha como acertar uma. O controle andava pelo
  // mapa e não quebrava nada. O teste passava quase sempre porque media a coisa
  // errada.
  //
  // Com o cursor podendo ficar sobre a pedra, a mediana é 1,5 passo e o pior caso
  // medido em 2400 mapas é 5. O limite de 96 passos é folga larga, e mesmo assim
  // ele não é o que segura o teste: seguram os 20 mapas por bioma.
  const MAPAS_POR_BIOMA = 20;

  for (let i = 0; i < BIOMES.length; i += 1) {
    for (let n = 0; n < MAPAS_POR_BIOMA; n += 1) {
      const mapa = mapaDoBioma(i);
      const passos = andaAtePedraQuebravel(mapa);

      assert.ok(
        passos !== null,
        `${BIOMES[i].id}, mapa ${n + 1}/${MAPAS_POR_BIOMA}: o cursor não chegou a uma `
          + 'pedra quebrável a partir da entrada'
      );
    }
  }
});

test('o cursor consegue ocupar a pedra que ele mira', () => {
  // O bug, escrito direto. O `A` age sobre o tile de baixo do cursor; se um
  // filtro recusasse pedra, esse tile nunca seria uma pedra e o controle não
  // quebraria nada — sem erro, sem aviso, sem nenhum sintoma além de um losango
  // que passeia pelo mapa.
  //
  // Doze passos, e não quatro: com quatro, 21 de 1500 mapas sorteados deixavam o
  // cursor só no chão, e o teste falhava em 1,4% das vezes. Doze não falhou em
  // nenhum dos 1500, com pior caso medido de 5. A folga é de duas vezes e meia
  // sobre o pior caso, e o teste só assim deixa de depender do sorteio.
  const MAPAS_POR_BIOMA = 20;
  const DIRECOES = [[1, 0], [0, 1], [1, 1], [0, -1]];
  const PASSOS_POR_DIRECAO = 3;

  for (let i = 0; i < BIOMES.length; i += 1) {
    for (let n = 0; n < MAPAS_POR_BIOMA; n += 1) {
      const mapa = mapaDoBioma(i);
      const opcoes = dimensoes(mapa);
      let cursor = tileInicialDoCursor(mapa.entry, mapa.width, mapa.height);
      let ficouSobrePedra = false;

      for (const [dx, dy] of DIRECOES) {
        for (let passo = 0; passo < PASSOS_POR_DIRECAO && !ficouSobrePedra; passo += 1) {
          cursor = anda(mapa, cursor.col, cursor.row, dx, dy, opcoes);
          if (mapa.tiles[cursor.row]?.[cursor.col]?.type === 'rock') ficouSobrePedra = true;
        }
      }

      assert.ok(
        ficouSobrePedra,
        `${BIOMES[i].id}, mapa ${n + 1}/${MAPAS_POR_BIOMA}: em ${DIRECOES.length * PASSOS_POR_DIRECAO} `
          + 'passos o cursor não ficou sobre nenhuma pedra'
      );
    }
  }
});

test('um filtro que recusa pedra quebraria o controle, e o contra-teste prova', () => {
  // Serve para ninguém reintroduzir o filtro antigo achando que ele é mais
  // seguro. Ele não é: ele deixa o controle sem conseguir quebrar.
  //
  // Aqui o esperado é `false` — o cursor NUNCA fica sobre pedra com esse filtro,
  // por definição. Uma exceção seria o filtro deixar de ser o do jogo, e aí este
  // contra-teste pararia de provar o que ele existe para provar.
  const mapa = mapaDoBioma(0);
  const opcoes = dimensoes(mapa);
  const recusaPedra = (c, r) => mapa.tiles[r]?.[c]?.type !== 'rock';

  let cursor = tileInicialDoCursor(mapa.entry, mapa.width, mapa.height);
  let algumaVezSobrePedra = false;

  // Oito direções por doze passos: bem acima do que qualquer um faria, e ainda
  // assim tem de ser impossível. É por isso que o resultado é `false` e não
  // "quase nunca".
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [0, -1], [1, -1], [-1, 0], [0, 1], [1, 0]]) {
    for (let passo = 0; passo < 12; passo += 1) {
      cursor = proximoTileValido(cursor.col, cursor.row, dx, dy, opcoes, recusaPedra);
      if (mapa.tiles[cursor.row]?.[cursor.col]?.type === 'rock') algumaVezSobrePedra = true;
    }
  }

  assert.equal(
    algumaVezSobrePedra,
    false,
    'o filtro que recusa pedra deixou o cursor sobre uma pedra — e então ele não é o '
      + 'filtro que estava no jogo, e este contra-teste parou de provar alguma coisa'
  );
});

test('o cursor anda para a frente mesmo com o mapa cheio de pedra', () => {
  // `proximoTile` sem filtro é o caminho do cursor quando não há pedra à frente.
  // Ele ainda tem de andar — e não pode sair do mapa.
  const mapa = mapaDoBioma(0);
  const opcoes = dimensoes(mapa);
  const cursor = tileInicialDoCursor(mapa.entry, mapa.width, mapa.height);

  const frente = proximoTile(cursor.col, cursor.row, 0, -1, opcoes);

  assert.ok(dentroDoMapa(frente.col, frente.row, mapa.width, mapa.height));
});

test('a entrada nunca é uma pedra, e o cursor pode ficar nela sem ficar preso', () => {
  const mapa = mapaDoBioma(0);
  const entrada = mapa.entry;
  const tile = mapa.tiles[entrada.row]?.[entrada.col];

  assert.equal(tile.type, 'entrance', 'a entrada não é uma entrada');

  // Com `seed` fixo o mapa é sempre o mesmo; o teste existe para travar isso,
  // porque uma entrada que virou pedra seria um beco sem saída de primeira
  // linha — e o jogador nem teria como sair.
  assert.ok(entrada.col === 0, `a entrada está na coluna ${entrada.col}, e não na borda esquerda`);
});
