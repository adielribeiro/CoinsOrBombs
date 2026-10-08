import test from 'node:test';
import assert from 'node:assert/strict';

import { direcoesDoQuadro, deslocamentoDaDirecao } from '../src/game/gamepad.js';
import { generateMap } from '../src/game/systems/mapGenerator.js';
import { proximoTileValido } from '../src/game/cursor.js';

/**
 * Um quadro de controle com as duas metades: eixo e direção.
 *
 * O defeito que estes testes cobrem foi encontrado no navegador, e a parte importante dele
 * é que **o eixo e o botão são canais diferentes**. O direcional digital não move eixo
 * nenhum, e o passo em grade era chamado com o eixo cru — o que fazia o cursor receber um
 * vetor zerado e não andar, sem erro nenhum.
 */

/** O formato é o de `lerQuadro`: `eixo` é um par, e `direcoes` vem junto. */
function quadro({ eixo = { x: 0, y: 0 }, botoes = [] } = {}) {
  const aperta = new Set(botoes);
  const lidos = {};

  for (const nome of ['dpadCima', 'dpadBaixo', 'dpadEsquerda', 'dpadDireita']) {
    lidos[nome] = aperta.has(nome);
  }

  return {
    conectado: true,
    eixo,
    botoes: lidos,
    direcoes: direcoesDoQuadro({ conectado: true, eixo, botoes: lidos })
  };
}

test('o direcional digital anda, mesmo sem mover eixo nenhum', () => {
  // Este é o defeito: com o botão apertado e o eixo em zero, o passo recebia `0, 0`.
  for (const [botao, esperado] of [
    ['dpadDireita', { x: 1, y: 0 }],
    ['dpadEsquerda', { x: -1, y: 0 }],
    ['dpadBaixo', { x: 0, y: 1 }],
    ['dpadCima', { x: 0, y: -1 }]
  ]) {
    assert.deepEqual(deslocamentoDaDirecao(quadro({ botoes: [botao] })), esperado, `${botao} nao virou vetor`);
  }
});

test('o analógico manda no deslocamento, e com a intensidade que teve', () => {
  // O analógico tem força, e quem mira devia sentir isso. Um vetor unitário aqui
  // transformaria o analógico num direcional digital.
  const forte = deslocamentoDaDirecao(quadro({ eixo: { x: 0.8, y: 0.3 } }));

  assert.equal(forte.x, 0.8);
  assert.equal(forte.y, 0.3);

  // E um empurrão fraco continua fraco, que é o que dá precisão de mira.
  const fraco = deslocamentoDaDirecao(quadro({ eixo: { x: 0.2, y: 0.1 } }));

  assert.equal(fraco.x, 0.2);
  assert.equal(fraco.y, 0.1);
});

test('o analógico tem precedência sobre o direcional', () => {
  // Os dois canais podem vir no mesmo quadro: analógico torto em cima do direcional.
  // Quem tem intensidade é quem manda, porque é o analógico que está sendo usado.
  const d = deslocamentoDaDirecao(quadro({ eixo: { x: 0.5, y: 0 }, botoes: ['dpadBaixo'] }));

  assert.equal(d.x, 0.5);
  assert.equal(d.y, 0);
});

test('sem direção e sem eixo, o deslocamento é zero — e não um palpite', () => {
  assert.deepEqual(deslocamentoDaDirecao(quadro()), { x: 0, y: 0 });
  assert.deepEqual(deslocamentoDaDirecao(undefined), { x: 0, y: 0 });
});

test('a força do vetor não muda o tamanho do passo', () => {
  // É o que garante que o digital e o analógico deem o mesmo passo: `passosOrdenados`
  // normaliza o vetor, então a magnitude não chega ao tile.
  const opcoes = { largura: 7, altura: 7, metricas: { tileWidth: 64, tileHeight: 32 } };
  const existe = () => true;

  const fraco = deslocamentoDaDirecao(quadro({ botoes: ['dpadDireita'] }), 0.2);
  const forte = deslocamentoDaDirecao(quadro({ eixo: { x: 1, y: 0 } }));

  assert.deepEqual(
    proximoTileValido(3, 3, fraco.x, fraco.y, opcoes, existe),
    proximoTileValido(3, 3, forte.x, forte.y, opcoes, existe),
    'a forca do empurrao mudou o passo'
  );
});

/**
 * A saída precisa estar ao alcance do direcional digital.
 *
 * ## Por que este teste existe
 *
 * O direcional tem quatro botões, e o mapa é isométrico: as quatro direções de **tela** são
 * quatro passos diagonais da **grade**, `(1,-1)`, `(-1,1)`, `(1,1)` e `(-1,-1)`. Cada um
 * muda `col` e `row` de um a um, então a paridade de `col + row` é um invariante do
 * movimento do direcional.
 *
 * Lido só com isso, o direcional pareceria unable de alcançar metade das saídas — e a
 * conclusão seria "o jogo não dá para terminar sem analógico". **Não é verdade**, e o
 * motivo está em `proximoTileValido`: quando o melhor passo cai fora do mapa, ele tenta o
 * próximo melhor, e esse costuma ser um passo diagonal, que troca a paridade.
 *
 * Este teste mede o que o jogo faz, e não o que a aritmética sugere. Sem ele, uma
 * refatoração que removesse o quique de passo continuaria passando em tudo e deixaria
 * metade das caves sem fim por controle.
 */
test('a saída fica ao alcance do direcional, e a mira alcança o mapa inteiro', () => {
  const METRICAS = { tileWidth: 64, tileHeight: 32 };
  const VETORES = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  const alcancaveis = (mapa) => {
    const chave = (c, r) => `${c},${r}`;
    const vistos = new Set([chave(mapa.entry.col, mapa.entry.row)]);
    const fila = [{ col: mapa.entry.col, row: mapa.entry.row }];

    while (fila.length > 0) {
      const atual = fila.shift();

      for (const [dx, dy] of VETORES) {
        const proximo = proximoTileValido(
          atual.col,
          atual.row,
          dx,
          dy,
          { largura: mapa.width, altura: mapa.height, metricas: METRICAS },
          (col, row) => Boolean(mapa.tiles[row]?.[col])
        );

        const k = chave(proximo.col, proximo.row);

        if (vistos.has(k)) continue;

        vistos.add(k);
        fila.push({ col: proximo.col, row: proximo.row });
      }
    }

    return vistos;
  };

  const TOTAL = 300;

  for (let cave = 1; cave <= TOTAL; cave += 1) {
    const mapa = generateMap(cave, 1, 0, 0);
    const vistos = alcancaveis(mapa);

    assert.ok(
      vistos.has(`${mapa.exit.col},${mapa.exit.row}`),
      `cave ${cave}: saida fora do alcance do direcional`
    );
    assert.equal(
      vistos.size,
      mapa.width * mapa.height,
      `cave ${cave}: a mira nao alcançou o mapa inteiro`
    );
  }
});