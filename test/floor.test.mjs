import test from 'node:test';
import assert from 'node:assert/strict';

import { FLOOR_ART, getFloorDisplaySize, getTileMetrics } from '../src/game/config.js';
import { generateMap } from '../src/game/systems/mapGenerator.js';

/**
 * A arte de chão é um bloco: losango da superfície superior em cima, faces
 * laterais embaixo. Só o losango deve cair na célula, senão as faces laterais
 * invadem o vizinho e o piso vira uma pilha de blocos. Estes testes travam a
 * geometria para que uma mudança futura de `FLOOR_ART` não reintroduza a junta.
 */
test('o losango de cima da arte cabe exatamente na célula isométrica', () => {
  for (const renderScale of [0.6, 0.8, 1, 1.16]) {
    const { tileWidth, tileHeight } = getTileMetrics(renderScale);
    const { displayWidth, displayHeight } = getFloorDisplaySize(tileWidth);

    const topWidth = displayWidth * FLOOR_ART.topWidth;
    const topHeight = displayHeight * FLOOR_ART.topHeight;

    // Largura: o losango deve fechar a largura da célula.
    assert.ok(
      Math.abs(topWidth - tileWidth) < 1,
      `escala ${renderScale}: topo com ${topWidth.toFixed(1)}px para célula de ${tileWidth}px`
    );

    // Altura: pode passar um pouco, nunca ficar menor que a célula — senão
    // aparece uma fresta de fundo entre tiles.
    assert.ok(
      topHeight >= tileHeight - 1,
      `escala ${renderScale}: topo com ${topHeight.toFixed(1)}px é menor que a célula de ${tileHeight}px`
    );

    // E não muito maior, senão a arte avança demais sobre o vizinho.
    assert.ok(
      topHeight <= tileHeight * 1.15,
      `escala ${renderScale}: topo com ${topHeight.toFixed(1)}px cobre ${(topHeight / tileHeight).toFixed(2)} células`
    );
  }
});

test('as faces laterais ficam abaixo da célula, para o vizinho cobrir', () => {
  for (const renderScale of [0.6, 0.8, 1, 1.16]) {
    const { tileWidth, tileHeight } = getTileMetrics(renderScale);
    const { displayWidth, displayHeight } = getFloorDisplaySize(tileWidth);

    const cellHalf = tileHeight / 2;
    const topShift = displayHeight / 2 - displayHeight * FLOOR_ART.topOffsetY;
    const imageTop = -(cellHalf - topShift) - displayHeight / 2;

    // Vértices do losango de cima, medidos a partir do topo da imagem.
    const diamondTop = imageTop + displayHeight * FLOOR_ART.opaqueTopY;
    const diamondBottom = imageTop + displayHeight * (FLOOR_ART.opaqueTopY + FLOOR_ART.topHeight);
    // Última linha opaca da arte, ou seja, embaixo das faces laterais.
    const artBottom = imageTop + displayHeight * FLOOR_ART.opaqueBottomY;

    assert.ok(
      Math.abs(diamondTop - -cellHalf) < 1.5,
      `escala ${renderScale}: losango começa em ${diamondTop.toFixed(1)}px, célula em ${-cellHalf}px`
    );

    // O losango tem de cobrir a célula inteira. Passar um pouco é o desejado:
    // a arte tem razão 1,89 e a célula 1,96, então casar a largura faz a
    // altura estourar ~3,6% — sobreposição, que é inofensiva. O que seria um
    // defeito é a fresta, na direção oposta.
    assert.ok(
      diamondBottom >= cellHalf - 1,
      `escala ${renderScale}: losango termina em ${diamondBottom.toFixed(1)}px, célula em ${cellHalf}px (fresta)`
    );
    assert.ok(
      diamondBottom <= cellHalf * 1.15,
      `escala ${renderScale}: losango cobre ${(diamondBottom / cellHalf).toFixed(2)} células (avanço demais)`
    );

    // E as faces laterais têm de avançar além do fundo da célula, senão
    // aparecem por cima do tile vizinho como uma faixa escura.
    assert.ok(
      artBottom > cellHalf + 2,
      `escala ${renderScale}: faces laterais avançam só ${(artBottom - cellHalf).toFixed(1)}px além da célula`
    );
  }
});

test('o deslocamento vertical do piso põe o losango no lugar certo', () => {
  // Coberto pelo teste das faces laterais, que checa os dois vértices do
  // losango em todas as escalas de render. Aqui fica a consistência da
  // proporção: a arte preserva o aspecto do canvas, senão a pedra achata.
  const { tileWidth } = getTileMetrics(1);
  const { displayWidth, displayHeight } = getFloorDisplaySize(tileWidth);

  assert.ok(
    Math.abs(displayHeight / displayWidth - 100 / 160) < 0.001,
    'a arte de chão precisa preservar a proporção do canvas'
  );

  assert.ok(displayWidth > tileWidth, 'a arte é maior que a célula: só o losango cabe dentro dela');
});

test('o tom do chão nunca estoura o byte de cor', () => {
  // GetColor empacota em bytes: acima de 255 o valor vaza para o canal
  // vizinho e o tile renderiza quase preto.
  for (let cave = 1; cave <= 6; cave += 1) {
    const map = generateMap(cave, 1, 0);

    for (const row of map.tiles) {
      for (const tile of row) {
        assert.ok(
          tile.floorTone > 0 && tile.floorTone <= 1,
          `tom ${tile.floorTone} fora de (0, 1] em ${tile.col},${tile.row}`
        );
        assert.ok(Math.round(tile.floorTone * 255) <= 255, 'tom acima de 255');
      }
    }
  }
});

test('o tom e o entulho são estáveis entre gerações da mesma posição', () => {
  // Se variassem a cada chamada, o mapa "pisca" toda vez que a tela é
  // redesenhada (por exemplo, ao redimensionar).
  const a = generateMap(4, 1, 0);
  const b = generateMap(4, 1, 0);

  for (let row = 0; row < a.tiles.length; row += 1) {
    for (let col = 0; col < a.tiles[row].length; col += 1) {
      assert.equal(a.tiles[row][col].floorTone, b.tiles[row][col].floorTone, `tom em ${col},${row}`);
      assert.equal(a.tiles[row][col].grit, b.tiles[row][col].grit, `entulho em ${col},${row}`);
    }
  }
});

test('há variação de tom suficiente para o chão não parecer xadrez', () => {
  const map = generateMap(7, 1, 0);
  const tones = new Set(map.tiles.flat().map((tile) => Math.round(tile.floorTone * 100)));

  assert.ok(tones.size >= 8, `só ${tones.size} tons distintos: a variação é irrelevante`);
});

test('parte dos tiles recebe entulho, e o resto não vira liso demais', () => {
  let withGrit = 0;
  let total = 0;

  for (let cave = 1; cave <= 4; cave += 1) {
    for (const row of generateMap(cave, 1, 0).tiles) {
      for (const tile of row) {
        total += 1;
        if (tile.grit > 0) withGrit += 1;
      }
    }
  }

  const ratio = withGrit / total;
  assert.ok(ratio > 0.2, `só ${(ratio * 100).toFixed(0)}% dos tiles com entulho`);
  assert.ok(ratio < 0.8, `${(ratio * 100).toFixed(0)}% com entulho é excesso de poluição`);
});
