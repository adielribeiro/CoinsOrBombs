import test from 'node:test';
import assert from 'node:assert/strict';

import { toIso } from '../src/game/config.js';
import { tileSobOPonteiro } from '../src/game/ponteiro.js';

/**
 * A mira da caverna: o tile que a seta está apontando.
 *
 * ## Por que isto tem teste e a cena não
 *
 * A cena do Phaser não roda no Node. Uma mira escrita dentro dela ficaria correta
 * por inspeção e erraria em silêncio — e o erro aqui não dá aviso nenhum: o cursor
 * aponta para o canto oposto da caverna, e a pessoa acha que o jogo anda torto. Por
 * isso a decisão está aqui, e a cena só passa o ponto que o Phaser sabe medir.
 */

const METRICAS = { tileWidth: 64, tileHeight: 32 };
const ORIGEM = { x: 300, y: 90 };
const MAPA = { largura: 12, altura: 10 };

const tudo = () => true;
const semBorda = (largura, altura) => (col, row) =>
  col >= 1 && col < largura - 1 && row >= 1 && row < altura - 1;

const mirar = (col, row, opcoes = {}) => {
  const ponto = toIso(col, row, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);

  return tileSobOPonteiro(ponto, {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura,
    existe: tudo,
    ...opcoes
  });
};

// --- o caso óbvio ----------------------------------------------------------

test('a seta em cima do centro de um tile mira aquele tile', () => {
  for (const [col, row] of [
    [0, 0],
    [5, 5],
    [11, 9],
    [0, 9],
    [11, 0]
  ]) {
    assert.deepEqual(mirar(col, row), { col, row }, `mirou errado em ${col},${row}`);
  }
});

test('a seta entre dois tiles mira o mais próximo', () => {
  // É o caso comum: a seta está no chão entre dois losangos, e o arredondamento
  // decide. Sem isto, um `floor` no meio inverteria a escolha e a mira ficaria
  // meio tile fora do lugar.
  const a = toIso(4, 4, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);
  const b = toIso(4, 3, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);
  const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  const alvo = tileSobOPonteiro(meio, {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura,
    existe: tudo
  });

  assert.deepEqual(alvo, { col: 4, row: 4 }, 'meio caminho não foi para o tile de origem');
});

// --- as bordas -------------------------------------------------------------

test('fora do mapa a mira desiste, em vez de devolver um tile qualquer', () => {
  const longe = tileSobOPonteiro({ x: -5000, y: -5000 }, {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura,
    existe: tudo
  });

  assert.equal(longe, null, 'a mira devolveu tile fora do mapa');
});

test('fora do mapa para os quatro lados', () => {
  const opcoes = {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura,
    existe: tudo
  };

  const cantos = [
    [-5000, 0],
    [5000, 0],
    [0, -5000],
    [0, 5000]
  ];

  for (const [dx, dy] of cantos) {
    const mundo = { x: ORIGEM.x + dx, y: ORIGEM.y + dy };

    assert.equal(tileSobOPonteiro(mundo, opcoes), null, `mirou em ${dx},${dy}`);
  }
});

test('um tile que o mapa recusa não é mira', () => {
  // O mapa é quem decide o que existe. Uma borda sem tile é onde a caverna
  // termina, e devolver o tile mesmo assim colocaria o cursor fora do chão.
  const dentro = mirar(1, 1);
  const borda = mirar(0, 0, { existe: semBorda(MAPA.largura, MAPA.altura) });

  assert.deepEqual(dentro, { col: 1, row: 1 });
  assert.equal(borda, null, 'a mira aceitou tile que o mapa recusa');
});

// --- o que não pode dar errado ---------------------------------------------

test('ponto quebrado não vira tile NaN', () => {
  // A posição vem do DOM e do Phaser. `Math.round(NaN)` é `NaN`, e o cursor
  // sumiria sem erro no console — que é o modo de falha mais difícil de ver.
  const opcoes = {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura,
    existe: tudo
  };

  for (const mundo of [
    { x: Number.NaN, y: 0 },
    { x: 0, y: Number.NaN },
    { x: Number.POSITIVE_INFINITY, y: 10 },
    null,
    undefined,
    {}
  ]) {
    assert.equal(tileSobOPonteiro(mundo, opcoes), null, `aceitou ${JSON.stringify(mundo)}`);
  }
});

test('mapa sem tamanho não devolve tile', () => {
  const base = { origem: ORIGEM, metricas: METRICAS, existe: tudo };

  assert.equal(
    tileSobOPonteiro({ x: 0, y: 0 }, { ...base, largura: 0, altura: 10 }),
    null,
    'mapa sem largura devolveu tile'
  );
  assert.equal(
    tileSobOPonteiro({ x: 0, y: 0 }, { ...base, largura: 10, altura: Number.NaN }),
    null,
    'altura quebrada devolveu tile'
  );
});

test('sem a função do mapa, a mira só usa as bordas', () => {
  // O mapa é quem recusa tile, mas a borda do mapa é geometria e continua valendo
  // mesmo sem ele. Sem `existe`, o que sobra é o retângulo do mapa.
  const dentro = tileSobOPonteiro({ x: ORIGEM.x, y: ORIGEM.y }, {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura
  });

  assert.deepEqual(dentro, { col: 0, row: 0 });
});

test('a origem e o canto do mapa, e a seta não sai do retângulo', () => {
  // O canto de cima da projeção é o tile (0, 0), e é onde a seta nasce quando a
  // pessoa abre o jogo. Se a origem não fosse esse canto, o primeiro clique
  // miraria fora da caverna.
  const naOrigem = tileSobOPonteiro({ x: ORIGEM.x, y: ORIGEM.y }, {
    origem: ORIGEM,
    metricas: METRICAS,
    largura: MAPA.largura,
    altura: MAPA.altura,
    existe: tudo
  });

  assert.deepEqual(naOrigem, { col: 0, row: 0 });
});