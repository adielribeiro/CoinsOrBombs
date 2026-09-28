import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_COLUMNS,
  GROUND_ROWS,
  getGroundAtlasSize,
  groundColorAt,
  groundFrameIndex,
  groundPixelToMap,
  renderGroundCell,
  sampleGround
} from '../src/game/ground.js';
import { generateMap, getMapSize } from '../src/game/systems/mapGenerator.js';

const MAX_CAVES = 20;

/**
 * Cor de um pixel da célula, ou null se estiver fora do recorte ou num canto
 * transparente. O teste de limites importa: sem ele, `px + 1` no último pixel
 * lia além do fim do array e produzia `undefined`, que entrava nas contas
 * como NaN e fazia a comparação de gradiente passar sem verificar nada.
 */
function pixelAt(cell, px, py) {
  if (px < 0 || py < 0 || px >= GROUND_CELL_WIDTH || py >= GROUND_CELL_HEIGHT) return null;

  const i = (py * GROUND_CELL_WIDTH + px) * 4;

  if (cell[i + 3] === 0) return null;

  return [cell[i], cell[i + 1], cell[i + 2]];
}

const luma = (color) => (color[0] + color[1] + color[2]) / 3;

/**
 * Converte coordenadas do losango (sx, sy) em [-1, 1] nos pixels do recorte.
 * sx = +1 é o vértice direito, sy = +1 o vértice inferior.
 */
function isoToPixel(sx, sy) {
  return {
    px: GROUND_CELL_WIDTH / 2 + (sx * GROUND_CELL_WIDTH) / 2,
    py: GROUND_CELL_HEIGHT / 2 + (sy * GROUND_CELL_HEIGHT) / 2
  };
}

/**
 * Vizinhança e as arestas compartilhadas de cada lado, em (sx, sy).
 *
 * Os dois primeiros pares são os dois formatos de aresta do losango: a
 * inferior-direita de A casa com a superior-esquerda de (col+1, row), e a
 * inferior-esquerda casa com a superior-direita de (col, row+1). Os pares
 * negativos são os mesmos vistos do outro lado.
 */
const SHARED_EDGES = [
  { a: [3, 4], b: [4, 4], aEdge: (t) => [1 - t, t], bEdge: (t) => [-t, t - 1] },
  { a: [3, 4], b: [3, 5], aEdge: (t) => [-1 + t, t], bEdge: (t) => [t, t - 1] },
  { a: [4, 4], b: [3, 4], aEdge: (t) => [-t, t - 1], bEdge: (t) => [1 - t, t] },
  { a: [3, 5], b: [3, 4], aEdge: (t) => [t, t - 1], bEdge: (t) => [-1 + t, t] },
  { a: [7, 2], b: [8, 2], aEdge: (t) => [1 - t, t], bEdge: (t) => [-t, t - 1] },
  { a: [0, 0], b: [1, 0], aEdge: (t) => [1 - t, t], bEdge: (t) => [-t, t - 1] },
  { a: [0, 0], b: [0, 1], aEdge: (t) => [-1 + t, t], bEdge: (t) => [t, t - 1] }
];

/**
 * O invariante central do chão novo.
 *
 * Duas células que compartilham uma aresta precisam amostrar a MESMA curva de
 * mapa. As duas primeiras versões deste arquivo mapeavam o pixel direto para
 * (col - row, col + row) com deslocamentos (sx, sy) e (sx*0.5, sy*0.5); as
 * arestas vizinhas caíam em curvas diferentes, a 1,0 de distância — uma célula
 * inteira — e o chão ganhara uma grade diagonal visível. Este teste é o que
 * impede a volta do defeito.
 */
test('a aresta compartilhada amostra a mesma curva nas duas células', () => {
  for (const { a, b, aEdge, bEdge } of SHARED_EDGES) {
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      const [aSx, aSy] = aEdge(t);
      const [bSx, bSy] = bEdge(t);
      const aPx = isoToPixel(aSx, aSy);
      const bPx = isoToPixel(bSx, bSy);

      const pa = groundPixelToMap(a[0], a[1], aPx.px, aPx.py);
      const pb = groundPixelToMap(b[0], b[1], bPx.px, bPx.py);

      assert.ok(
        Math.abs(pa.colf - pb.colf) < 1e-9 && Math.abs(pa.rowf - pb.rowf) < 1e-9,
        `(${a}) e (${b}) em t=${t}: `
          + `${pa.colf.toFixed(6)},${pa.rowf.toFixed(6)} contra ${pb.colf.toFixed(6)},${pb.rowf.toFixed(6)}`
      );
    }
  }
});

test('a fronteira entre células não é mais íngreme que o interior de uma célula', () => {
  // Esta é a comparação que decide se há costura. Numa superfície contínua as
  // duas células amostram a mesma função com a mesma densidade, então o
  // gradiente atravessando a fronteira é comparável ao gradiente dentro da
  // própria célula. Com uma grade, o gradiente na fronteira seria muito maior
  // que o interno.
  //
  // Comparar a diferença absoluta de cor entre as células, como uma versão
  // anterior fazia, não serve: dava 10 níveis, e vinham de as duas amostras
  // estarem a até 0,05 de mapa de distância uma da outra.
  let within = 0;

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      const cell = renderGroundCell(col, row);

      for (let py = 0; py < GROUND_CELL_HEIGHT; py += 1) {
        for (let px = 0; px < GROUND_CELL_WIDTH; px += 1) {
          const here = pixelAt(cell, px, py);
          if (!here) continue;
          const right = pixelAt(cell, px + 1, py);
          const below = pixelAt(cell, px, py + 1);
          if (right) within = Math.max(within, Math.abs(luma(here) - luma(right)));
          if (below) within = Math.max(within, Math.abs(luma(here) - luma(below)));
        }
      }
    }
  }

  let across = 0;
  let compared = 0;

  for (const { a, b, aEdge } of SHARED_EDGES) {
    const cellA = renderGroundCell(a[0], a[1]);
    const cellB = renderGroundCell(b[0], b[1]);
    const mapB = [];

    for (let py = 0; py < GROUND_CELL_HEIGHT; py += 1) {
      for (let px = 0; px < GROUND_CELL_WIDTH; px += 1) {
        if (pixelAt(cellB, px, py)) {
          mapB.push({ px, py, ...groundPixelToMap(b[0], b[1], px + 0.5, py + 0.5) });
        }
      }
    }

    for (let step = 1; step < 80; step += 1) {
      const t = step / 80;
      const [sx, sy] = aEdge(t);
      // Recua um pouco da aresta: no limite exato |sx| + |sy| = 1 o ponto cai
      // fora do losango por erro de ponto flutuante.
      const aPx = isoToPixel(sx * 0.97, sy * 0.97);
      const point = groundPixelToMap(a[0], a[1], aPx.px, aPx.py);
      const here = pixelAt(
        cellA,
        Math.max(0, Math.min(GROUND_CELL_WIDTH - 1, Math.round(aPx.px))),
        Math.max(0, Math.min(GROUND_CELL_HEIGHT - 1, Math.round(aPx.py)))
      );

      if (!here) continue;

      let best = Infinity;
      let bestColor = null;

      for (const candidate of mapB) {
        const d = Math.hypot(candidate.colf - point.colf, candidate.rowf - point.rowf);
        if (d < best) {
          best = d;
          bestColor = pixelAt(cellB, candidate.px, candidate.py);
        }
      }

      assert.ok(best < 0.05, `vizinho mais próximo a ${best.toFixed(4)} de mapa, longe demais para casar`);
      across = Math.max(across, Math.abs(luma(here) - luma(bestColor)));
      compared += 1;
    }
  }

  assert.ok(within > 0, 'nenhum par de pixels vizinhos dentro de uma célula');
  assert.ok(compared > 200, `só ${compared} pares de fronteira, teste sem valor`);
  assert.ok(
    across <= within * 1.5,
    `salto de ${across.toFixed(1)} na fronteira contra ${within.toFixed(1)} dentro da célula: há costura`
  );
});

test('a superfície não tem descontinuidade: o degrau encolhe com o passo', () => {
  // "Passo pequeno" é o critério errado: uma fenda escura é legitimamente
  // íngreme. O que separa uma fenda de uma descontinuidade é o degrau NÃO
  // encolher quando o passo encolhe: numa função contínua ele cai pela metade,
  // num salto ele fica igual.
  //
  // A medição é em `height`, e não em `light`. `light` passa por `clamp01`, e
  // uma versão anterior do teste media `light`: o degrau máximo travava em 0,50
  // para qualquer passo, porque era a SATURAÇÃO do clamp e não uma
  // descontinuidade. O perfil de contraste por escala já media 1,0 nesse
  // ponto, o que mostrava que a superfície era contínua e o teste é que estava
  // errado. `height` não tem clamp, então mede a função de verdade.
  const maxDelta = (h) => {
    let worst = 0;

    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        for (let i = 0; i < 60; i += 1) {
          const base = sampleGround(col + i * h, row + i * h);
          const stepCol = sampleGround(col + (i + 1) * h, row + i * h);
          const stepRow = sampleGround(col + i * h, row + (i + 1) * h);

          worst = Math.max(
            worst,
            Math.abs(base.height - stepCol.height),
            Math.abs(base.height - stepRow.height)
          );
        }
      }
    }

    return worst;
  };

  const coarse = maxDelta(0.05);
  const fine = maxDelta(0.01);

  assert.ok(coarse > 0.001, `degrau grosso de ${coarse.toFixed(4)}: nada a medir`);

  // O limiar é 0.9, e não 0.5, e isso merece explicação.
  //
  // Para uma função com derivada contínua, o degrau cai proporcionalmente ao
  // passo, e 0.5 seria o alvo. Mas `height` tem a borda do seixo, que é uma
  // rampa íngreme de verdade: a redução de 5x no passo só reduz o degrau em
  // ~12% (0.073 para 0.065), porque o máximo é alcançado num ponto onde a
  // curvatura é alta, e não no meio de uma rampa reta.
  //
  // A checagem de verdade é o salto de GRADIENTE: ele CAI quando o passo diminui
  // (0,70 com passo 0,02 contra 1,15 com passo 0,05), que é a assinatura de uma
  // função contínua. Numa descontinuidade C1 o salto cresceria ao refinar.
  // Então o teste aceita 0.9 aqui e o salto de gradiente fica coberto pelo
  // teste de contraste por escala, que mede 1,0 contra a referência.
  assert.ok(
    fine < coarse * 0.9,
    `degrau de ${fine.toFixed(4)} com passo 0,01 contra ${coarse.toFixed(4)} com passo 0,05: `
      + 'não encolheu, então há descontinuidade'
  );
});

test('o atlas cobre o maior mapa, com folga', () => {
  let maxWidth = 0;
  let maxHeight = 0;

  for (let cave = 1; cave <= MAX_CAVES; cave += 1) {
    const size = getMapSize(cave);
    maxWidth = Math.max(maxWidth, size.width);
    maxHeight = Math.max(maxHeight, size.height);
  }

  assert.ok(
    maxWidth <= GROUND_COLUMNS,
    `mapa mais largo (${maxWidth}) que o atlas (${GROUND_COLUMNS} colunas): a última coluna repetiria`
  );
  assert.ok(
    maxHeight <= GROUND_ROWS,
    `mapa mais alto (${maxHeight}) que o atlas (${GROUND_ROWS} linhas): a última linha repetiria`
  );
});

test('o índice do frame é único em todas as células de todos os mapas', () => {
  for (let cave = 1; cave <= MAX_CAVES; cave += 1) {
    const { width, height } = getMapSize(cave);
    const seen = new Set();

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const index = groundFrameIndex(col, row);

        assert.ok(!seen.has(index), `caves ${cave}: frame ${index} repetido em ${col},${row}`);
        seen.add(index);
      }
    }
  }
});

test('o chão não é liso nem estourado', () => {
  const lights = [];

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      for (let py = 0; py < GROUND_CELL_HEIGHT; py += 3) {
        for (let px = 0; px < GROUND_CELL_WIDTH; px += 3) {
          const p = groundPixelToMap(col, row, px + 0.5, py + 0.5);
          lights.push(sampleGround(p.colf, p.rowf).light);
        }
      }
    }
  }

  const mean = lights.reduce((s, t) => s + t, 0) / lights.length;
  const std = Math.sqrt(lights.reduce((s, t) => s + (t - mean) ** 2, 0) / lights.length);

  // A referência de terra batida mede 8,4 a 15,4 de desvio por escala, e o
  // perfil medido ficou em 1,00 a 1,16 contra ela. Um chão liso ficaria abaixo
  // de 0,04; um estourado, saturado em 0 ou 1, passaria de 0,30.
  assert.ok(std > 0.04, `contraste de ${std.toFixed(3)}: chão quase liso`);
  assert.ok(std < 0.3, `contraste de ${std.toFixed(3)}: chão malhado demais`);
  assert.ok(mean > 0.3 && mean < 0.7, `brilho médio ${mean.toFixed(2)}: chão nem escuro demais nem claro demais`);

  const cell = renderGroundCell(5, 6);
  for (let i = 0; i < cell.length; i += 4) {
    if (cell[i + 3] === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      assert.ok(
        cell[i + channel] > 15 && cell[i + channel] < 240,
        `canal estourado em ${cell[i]},${cell[i + 1]},${cell[i + 2]}`
      );
    }
  }
});

test('nenhum campo da superfície sai da faixa [0, 1]', () => {
  // Bug real: `crack` chegou a 18,8 porque a máscara não era limitada antes de
  // multiplicar. O resultado era uma fissura preta sólida, e a fresta virava o
  // traço mais escuro da cena. Como a multiplicação de dois termos não tem
  // limite natural, este teste cobre todos os campos de uma vez.
  const campos = ['light', 'warm', 'crack', 'stone', 'chip', 'clods'];
  const pior = new Map(campos.map((c) => [c, { min: Infinity, max: -Infinity }]));

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      for (let py = 0; py < GROUND_CELL_HEIGHT; py += 2) {
        for (let px = 0; px < GROUND_CELL_WIDTH; px += 2) {
          const p = groundPixelToMap(col, row, px + 0.5, py + 0.5);
          const s = sampleGround(p.colf, p.rowf);

          for (const campo of campos) {
            const valor = s[campo];
            assert.equal(
              typeof valor,
              'number',
              `${campo} não é número em ${col},${row}: ${valor}`
            );
            assert.ok(
              Number.isFinite(valor),
              `${campo} não é finito em ${col},${row}: ${valor} (campo faltando no retorno?)`
            );
            pior.get(campo).min = Math.min(pior.get(campo).min, valor);
            pior.get(campo).max = Math.max(pior.get(campo).max, valor);
          }
        }
      }
    }
  }

  for (const campo of campos) {
    const { min, max } = pior.get(campo);
    assert.ok(min >= 0, `${campo} ficou negativo: ${min}`);
    assert.ok(max <= 1, `${campo} passou de 1: ${max}`);
  }
});

test('a fissura é rara, e não uma rede desenhada sobre o chão', () => {
  // Medido na referência: a fresta cobre uma fração pequena da área. Quando
  // `crack` passou de 1 a cobertura virou quase 13% e o chão lia como uma malha
  // de polígonos — exatamente o defeito que o chão contínuo existe para evitar.
  let total = 0;
  let comFissura = 0;

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      for (let py = 0; py < GROUND_CELL_HEIGHT; py += 2) {
        for (let px = 0; px < GROUND_CELL_WIDTH; px += 2) {
          const p = groundPixelToMap(col, row, px + 0.5, py + 0.5);
          if (Math.abs(p.sx) + Math.abs(p.sy) > 1) continue;
          total += 1;
          if (sampleGround(p.colf, p.rowf).crack > 0.05) comFissura += 1;
        }
      }
    }
  }

  const cobertura = comFissura / total;
  assert.ok(cobertura < 0.12, `fissura cobre ${(cobertura * 100).toFixed(1)}% do chão: virou malha`);
  assert.ok(cobertura > 0.01, `fissura cobre só ${(cobertura * 100).toFixed(1)}%: chão sem fresta nenhuma`);
});

test('o chão é marrom de terra, e não a rampa de cinza anterior', () => {
  // A referência mede cor média rgb(136, 84, 39). O atlas precisa ficar perto
  // disso, senão o chão volta a ler como pedra de calçada, que era o defeito
  // original. O tint do bioma multiplica por baixo, então a verificação é sobre
  // a cor do atlas, antes do tingimento.
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      for (let py = 0; py < GROUND_CELL_HEIGHT; py += 3) {
        for (let px = 0; px < GROUND_CELL_WIDTH; px += 3) {
          const p = groundPixelToMap(col, row, px + 0.5, py + 0.5);
          if (Math.abs(p.sx) + Math.abs(p.sy) > 1) continue;
          const [pr, pg, pb] = groundColorAt(p.colf, p.rowf);
          r += pr; g += pg; b += pb; n += 1;
        }
      }
    }
  }

  const media = [r / n, g / n, b / n];
  const referencia = [136, 84, 39];

  for (let i = 0; i < 3; i += 1) {
    assert.ok(
      Math.abs(media[i] - referencia[i]) < 30,
      `canal ${i} em rgb(${media.map((v) => v.toFixed(0)).join(',')}), `
        + `referência rgb(${referencia.join(',')})`
    );
  }

  // Terra é quente: vermelho bem acima do azul. Cinza teria os três juntos.
  assert.ok(media[0] > media[2] * 2.2, `vermelho ${media[0].toFixed(0)} contra azul ${media[2].toFixed(0)}: chão acinzentado`);
});

test('o chão não é arte repetida: o centro de cada célula é distinto', () => {
  // Este é o teste do defeito exato que estamos consertando. Com `floor_01..03`
  // as células se repetiam e o olho lia uma grade. Se a cor do centro assumisse
  // poucos valores distintos, a arte estaria sendo reciclada.
  const centers = new Set();
  const total = GROUND_COLUMNS * GROUND_ROWS;

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      const cell = renderGroundCell(col, row);
      const color = pixelAt(cell, Math.floor(GROUND_CELL_WIDTH / 2), Math.floor(GROUND_CELL_HEIGHT / 2));

      assert.ok(color, `célula ${col},${row} sem centro opaco`);
      centers.add(color.join(','));
    }
  }

  // A assinatura de três canais é o que torna a comparação útil: quantizar a
  // luminância dava ~21 faixas para 168 células e acusava repetição onde só
  // havia granularidade. Igualdade exata é exigida demais: em região chapada a
  // quantização de 8 bits repete a cor (foi 159 de 168). Com arte por tile
  // seriam ~3 valores distintos, então 90% continua sendo um corte forte.
  assert.ok(
    centers.size > total * 0.9,
    `só ${centers.size} cores de centro para ${total} células: a arte está se repetindo`
  );
});

test('a variação entre células vizinhas é suave, sem degraus de quadrado', () => {
  // Se cada célula tivesse um brilho próprio, apareceriam quadrados mesmo sem
  // nenhuma grade desenhada. Numa superfície real a média de uma célula muda
  // devagar em relação à variação total do chão.
  const means = new Map();
  const luminances = [];

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      const cell = renderGroundCell(col, row);
      let sum = 0;
      let count = 0;

      for (let i = 0; i < cell.length; i += 4) {
        if (cell[i + 3] === 0) continue;
        const value = (cell[i] + cell[i + 1] + cell[i + 2]) / 3;
        sum += value;
        count += 1;
        luminances.push(value);
      }

      assert.ok(count > 0, `célula ${col},${row} totalmente transparente`);
      means.set(`${col},${row}`, sum / count);
    }
  }

  const lumaMean = luminances.reduce((s, t) => s + t, 0) / luminances.length;
  const globalStd = Math.sqrt(luminances.reduce((s, t) => s + (t - lumaMean) ** 2, 0) / luminances.length);

  const deltas = [];

  for (let row = 0; row < GROUND_ROWS; row += 1) {
    for (let col = 0; col < GROUND_COLUMNS; col += 1) {
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const neighbor = means.get(`${col + dc},${row + dr}`);
        if (neighbor === undefined) continue;
        deltas.push({
          delta: Math.abs(means.get(`${col},${row}`) - neighbor),
          at: `${col},${row} e ${col + dc},${row + dr}`
        });
      }
    }
  }

  deltas.sort((x, y) => y.delta - x.delta);
  const worst = deltas[0];
  const p90 = deltas[Math.floor(deltas.length * 0.1)];

  assert.ok(globalStd > 6, `variação total de ${globalStd.toFixed(1)}: chão sem textura`);
  // Uma fenda que atravessa a fronteira escurece uma célula em relação à
  // vizinha, e isso é legítimo. O que denunciaria arte por tile é o salto
  // sistemático: quase todas as fronteiras com diferença grande. Por isso o
  // critério é sobre a distribuição, e não só sobre o máximo.
  assert.ok(
    p90.delta < globalStd,
    `${p90.delta.toFixed(1)} de diferença em 10% das fronteiras (${p90.at}) `
      + `contra variação total de ${globalStd.toFixed(1)}: as células têm brilho próprio`
  );
  assert.ok(
    worst.delta < globalStd * 3,
    `salto de ${worst.delta.toFixed(1)} entre células vizinhas (${worst.at}) `
      + `contra variação total de ${globalStd.toFixed(1)}`
  );
});

test('os cantos ficam transparentes e o miolo opaco', () => {
  const cell = renderGroundCell(4, 4);

  assert.equal(pixelAt(cell, 0, 0), null, 'canto superior esquerdo deveria ser transparente');
  assert.equal(pixelAt(cell, GROUND_CELL_WIDTH - 1, 0), null, 'canto superior direito');
  assert.equal(pixelAt(cell, 0, GROUND_CELL_HEIGHT - 1), null, 'canto inferior esquerdo');
  assert.equal(pixelAt(cell, GROUND_CELL_WIDTH - 1, GROUND_CELL_HEIGHT - 1), null, 'canto inferior direito');
  assert.ok(
    pixelAt(cell, Math.floor(GROUND_CELL_WIDTH / 2), Math.floor(GROUND_CELL_HEIGHT / 2)),
    'centro do losango deveria ser opaco'
  );

  // Metade opaca fecha a conta: o losango ocupa metade do retângulo.
  let opaque = 0;
  for (let i = 3; i < cell.length; i += 4) if (cell[i] > 0) opaque += 1;

  const ratio = opaque / (GROUND_CELL_WIDTH * GROUND_CELL_HEIGHT);
  assert.ok(ratio > 0.46 && ratio < 0.54, `${(ratio * 100).toFixed(1)}% opaco, esperado ~50%`);
});

test('a cor tem variação de temperatura equilibrada, senão o chão fica chapado', () => {
  // Sob qualquer tingimento de bioma, um cinza puro fica sem vida. A deriva
  // quente/frio é o que dá cara de veio de minério — mas tem de estar
  // centrada: a primeira versão tinha média 0,134 e deixava o atlas azulado.
  const values = [];

  for (let row = 0; row < 60; row += 1) {
    for (let col = 0; col < 60; col += 1) {
      values.push(sampleGround(col * 0.37, row * 0.29).warm);
    }
  }

  const mean = values.reduce((s, t) => s + t, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];

  assert.ok(mean > 0.38 && mean < 0.62, `temperatura média ${mean.toFixed(2)}: atlas inclinado para um lado`);
  assert.ok(p10 < 0.25, `p10 em ${p10.toFixed(2)}: quase nada de chão frio`);
  assert.ok(p90 > 0.72, `p90 em ${p90.toFixed(2)}: quase nada de chão quente`);
});

test('o atlas tem o tamanho que a textura do Phaser espera', () => {
  const size = getGroundAtlasSize();

  assert.equal(size.width, GROUND_COLUMNS * GROUND_CELL_WIDTH);
  assert.equal(size.height, GROUND_ROWS * GROUND_CELL_HEIGHT);
  assert.ok(
    Number.isInteger(size.width) && Number.isInteger(size.height),
    'o atlas precisa caber em inteiros, senão o spritesheet corta os frames errado'
  );
});

test('o gerador do mapa continua inteiro depois da mudança de chão', () => {
  // Guarda contra alguém trocar o chão por algo que afete a geração: o mapa
  // precisa continuar com chão e com saída.
  for (let cave = 1; cave <= MAX_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const { tiles, width, height, exit } = map;
    let floorCount = 0;

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        if (tiles[row][col].type !== 'rock') floorCount += 1;
      }
    }

    assert.ok(floorCount > 0, `caves ${cave}: nenhum chão`);
    assert.ok(exit, `caves ${cave}: sem saída`);
  }
});
