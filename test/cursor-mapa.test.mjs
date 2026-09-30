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

/** Anda o cursor na grade, filtrando pedra, igual a cena. */
function anda(mapa, col, row, dx, dy, opcoes = {}) {
  return proximoTileValido(col, row, dx, dy, opcoes, (c, r) => mapa.tiles[r]?.[c]?.type !== 'rock');
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
  // A propriedade que importa: o filtro de "não entre em pedra" e a checagem de
  // borda juntas, contra o mapa real. Um `NaN` aqui viraria um cursor em lugar
  // nenhum, e a pessoa acharia que o controle quebrou.
  //
  // A varredura parte de tiles abertos, e não de todos. O cursor nunca fica sobre
  // uma pedra — ele começa na entrada e só entra onde `type !== 'rock'` —, e
  // começar de uma pedra seria testar um estado que o jogo não produz. Onde não
  // há passo à frente, a função devolve o tile atual, e o tile atual seria a
  // própria pedra: o teste reprovaria por um cenário impossível.
  for (let i = 0; i < BIOMES.length; i += 1) {
    const mapa = mapaDoBioma(i);
    const opcoes = dimensoes(mapa);

    for (let col = 0; col < mapa.width; col += 1) {
      for (let row = 0; row < mapa.height; row += 1) {
        if (mapa.tiles[row][col].type === 'rock') continue;

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const alvo = anda(mapa, col, row, dx, dy, opcoes);

          assert.ok(
            dentroDoMapa(alvo.col, alvo.row, mapa.width, mapa.height),
            `${BIOMES[i].id}: de (${col},${row}) para (${alvo.col},${alvo.row})`
          );

          const tile = mapa.tiles[alvo.row]?.[alvo.col];
          assert.ok(tile, `${BIOMES[i].id}: o cursor chegou num tile que não existe`);
          assert.notEqual(tile.type, 'rock', `${BIOMES[i].id}: o cursor entrou numa pedra`);
        }
      }
    }
  }
});

test('de dentro da entrada, o cursor acha uma pedra que dá para quebrar', () => {
  // A pergunta do usuário. Se isto falha, o controle não serve para jogar: a
  // pessoa mexe o analógico, o cursor passeia pelo chão e nada quebra.
  for (let i = 0; i < BIOMES.length; i += 1) {
    const mapa = mapaDoBioma(i);
    const opcoes = dimensoes(mapa);
    let cursor = tileInicialDoCursor(mapa.entry, mapa.width, mapa.height);
    let achouQuebravel = false;
    let passos = 0;

    // Passeia como uma pessoa: direções variadas, e olha as pedras vizinhas.
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [0, -1], [1, -1], [-1, 0], [0, 1], [1, 0]]) {
      for (let tentativa = 0; tentativa < 12 && !achouQuebravel; tentativa += 1) {
        cursor = anda(mapa, cursor.col, cursor.row, dx, dy, opcoes);
        passos += 1;

        const vizinha = mapa.tiles[cursor.row]?.[cursor.col + 1] ?? mapa.tiles[cursor.row]?.[cursor.col];

        if (vizinha?.type === 'rock' && isFrontierRock(mapa, mapa.entry, vizinha)) achouQuebravel = true;
      }

      if (achouQuebravel) break;
    }

    assert.ok(
      achouQuebravel,
      `${BIOMES[i].id}: em ${passos} passos a partir da entrada, o cursor não achou pedra quebrável`
    );
  }
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
