import test from 'node:test';
import assert from 'node:assert/strict';

import { fromIso, toIso } from '../src/game/config.js';

/**
 * A projeção isométrica e o seu inverso.
 *
 * ## O que estes testes seguram
 *
 * 1. **`fromIso` desfaz `toIso`.** É a propriedade que importa: o ponteiro aponta
 *    para o mesmo tile que o losango marca. Uma inversão com sinal trocado não dá
 *    erro nenhum — dá um cursor que aponta para o canto oposto da caverna, e que
 *    parece "o jogo anda torto" em vez de "a conta está errada".
 *
 * 2. **A inversão é testada com a função real.** Havia uma cópia de `toIso` escrita
 *    dentro de outro teste, e é esse o caminho que esconde erro: as duas podem
 *    divergir e os testes continuarem verdes. Aqui a mesma função desenha e
 *    desfaz.
 *
 * 3. **O resultado é contínuo, e quem arredonda é quem chama.** Um `fromIso` que
 *    devolvesse inteiro esconderia o caso em que o ponteiro está entre dois tiles —
 *    que é o caso comum, e é onde o arredondamento decide.
 */

/** As métricas do jogo. */
const METRICAS = { tileWidth: 64, tileHeight: 32 };
const ORIGEM = { x: 400, y: 120 };

// --- a ida e a volta --------------------------------------------------------

test('o inverso desfaz a projeção, em toda a grade', () => {
  // Cobre os quatro quadrantes, a linha e a diagonal. A diagonal é onde um sinal
  // trocado aparece: `col` e `row` crescem juntos, e uma troca aí manda o cursor
  // para o lado oposto sem parecer erro.
  for (let col = 0; col < 12; col += 1) {
    for (let row = 0; row < 12; row += 1) {
      const ponto = toIso(col, row, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);
      const volta = fromIso(
        ponto.x,
        ponto.y,
        ORIGEM.x,
        ORIGEM.y,
        METRICAS.tileWidth,
        METRICAS.tileHeight
      );

      assert.equal(volta.col, col, `col ${col}, row ${row}: voltou em ${volta.col}`);
      assert.equal(volta.row, row, `col ${col}, row ${row}: voltou em ${volta.row}`);
    }
  }
});

test('o inverso funciona com a origem em qualquer lugar', () => {
  // A origem sai de `centeredOrigin`, que depende do tamanho da tela e da
  // progressão do mapa. Um inverso que só funciona com a origem em zero passaria
  // no teste acima e falharia no jogo.
  for (const origem of [
    { x: 0, y: 0 },
    { x: -320, y: 88 },
    { x: 1200, y: -640 },
    { x: 17.5, y: 3.25 }
  ]) {
    for (const [col, row] of [
      [0, 0],
      [3, 7],
      [11, 2]
    ]) {
      const ponto = toIso(col, row, origem.x, origem.y, METRICAS.tileWidth, METRICAS.tileHeight);
      const volta = fromIso(
        ponto.x,
        ponto.y,
        origem.x,
        origem.y,
        METRICAS.tileWidth,
        METRICAS.tileHeight
      );

      assert.equal(volta.col, col, `origem ${origem.x},${origem.y} em ${col},${row}`);
      assert.equal(volta.row, row, `origem ${origem.x},${origem.y} em ${col},${row}`);
    }
  }
});

test('o inverso acompanha a métrica de renderização', () => {
  // A cena desenha com `renderScale`, que muda `tileWidth`/`tileHeight` conforme o
  // mapa cabe na tela. Um inverso com as métricas fixas apontaria para o tile
  // errado em toda tela pequena — que é justamente o celular.
  for (const escala of [0.54, 1, 1.35]) {
    const tileWidth = Math.round(64 * escala);
    const tileHeight = Math.round(32 * escala);

    for (const [col, row] of [
      [0, 0],
      [5, 9],
      [2, 13]
    ]) {
      const ponto = toIso(col, row, ORIGEM.x, ORIGEM.y, tileWidth, tileHeight);
      const volta = fromIso(ponto.x, ponto.y, ORIGEM.x, ORIGEM.y, tileWidth, tileHeight);

      assert.equal(volta.col, col, `escala ${escala} em ${col},${row}`);
      assert.equal(volta.row, row, `escala ${escala} em ${col},${row}`);
    }
  }
});

// --- a mira -----------------------------------------------------------------

test('o inverso devolve contínuo, e o arredondamento escolhe o tile', () => {
  // Entre dois tiles não existe tile: o ponteiro está no chão, e o arredondamento
  // é o que decide para onde o cursor vai. Por isso o inverso não arredonda.
  const centro = toIso(4, 4, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);

  // Um tile inteiro em `col` vale `tileWidth` de pixels em `x`, e não a metade: a
  // projeção multiplica por 2 e divide por 2, e quem dá a volta precisa andar o
  // caminho inteiro.
  const entreTiles = fromIso(
    centro.x + METRICAS.tileWidth,
    centro.y,
    ORIGEM.x,
    ORIGEM.y,
    METRICAS.tileWidth,
    METRICAS.tileHeight
  );

  assert.equal(entreTiles.col, 5, 'o inverso arredondou: devolveu um tile inteiro');
  assert.equal(entreTiles.row, 3, 'o inverso arredondou a linha');

  // `row` também muda, e este é o ponto que faz o teste valer: na isometria,
  // "um tile para a direita na tela" é o passo `col + 1, row - 1`. Quem espera só
  // `col` mudando está esperando a projeção em tela, e a mira sai na diagonal.
  assert.equal(Math.round(entreTiles.col), 5, 'meio caminho entre 4 e 5 não foi para o vizinho');
  assert.equal(Math.round(entreTiles.row), 3, 'a linha deveria ter ido para cima também');
});

test('meio caminho na diagonal da tela é meio caminho nos dois eixos', () => {
  // Baixo-direita na tela: `col + 1, row + 1`, que é `tileWidth / 2` em x e
  // `tileHeight / 2` em y. É o passo que a pessoa mais usa, e o que mais confunde
  // quem escreve a inversão pela metade.
  const origem = toIso(0, 0, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);
  const passo = toIso(1, 1, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);

  assert.deepEqual(
    { x: passo.x - origem.x, y: passo.y - origem.y },
    { x: 0, y: METRICAS.tileHeight },
    'baixo-direita não é vertical: a isometria puxa a diagonal para baixo'
  );
});

test('metade do caminho arredonda para o tile de origem, e é assim que deve ser', () => {
  // O passo escolhido é o "cima-direita" da tela, que é `col + 0, row - 1`: meio
  // caminho em `row` e nada em `col`. Metade de passo, na isometria, mexe em um
  // eixo da grade e não no outro — e quem escreve a inversão esperando os dois
  // mudarem junto escreve a projeção em tela, não a da grade.
  //
  // O arredondamento do JavaScript sobe, e é o que a mira usa: meio caminho vira o
  // tile de origem. O teste existe para fixar a escolha, e não para mudá-la.
  const centro = toIso(6, 2, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);
  const passo = toIso(6, 1, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);
  const meio = fromIso(
    (centro.x + passo.x) / 2,
    (centro.y + passo.y) / 2,
    ORIGEM.x,
    ORIGEM.y,
    METRICAS.tileWidth,
    METRICAS.tileHeight
  );

  assert.equal(meio.col, 6, 'meio caminho mexeu no eixo errado da grade');
  assert.equal(meio.row, 1.5, 'meio caminho não ficou no meio da linha');
  assert.equal(Math.round(meio.col), 6, 'a coluna não devia ter mudado');
  assert.equal(Math.round(meio.row), 2, 'metade arredondou para fora do tile de origem');
});

test('a origem é o tile zero, e não um canto fora do mapa', () => {
  // Um sinal trocado aqui põe a origem no canto oposto, e o primeiro clique do
  // jogador mira fora da caverna sem nenhuma mensagem.
  const naOrigem = fromIso(ORIGEM.x, ORIGEM.y, ORIGEM.x, ORIGEM.y, METRICAS.tileWidth, METRICAS.tileHeight);

  assert.deepEqual(naOrigem, { col: 0, row: 0 });
});

test('número quebrado não vira tile NaN', () => {
  // A posição vem do DOM e do Phaser. Um `NaN` aqui viraria `Math.round(NaN)`,
  // que é `NaN`, e o cursor sumiria sem erro no console.
  for (const ponto of [
    [Number.NaN, 0],
    [0, Number.NaN],
    [Number.POSITIVE_INFINITY, 10]
  ]) {
    const volta = fromIso(
      ponto[0],
      ponto[1],
      ORIGEM.x,
      ORIGEM.y,
      METRICAS.tileWidth,
      METRICAS.tileHeight
    );

    assert.ok(Number.isFinite(volta.col), `col virou ${volta.col}`);
    assert.ok(Number.isFinite(volta.row), `row virou ${volta.row}`);
  }
});