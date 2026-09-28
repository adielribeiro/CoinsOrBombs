/**
 * Síntese da superfície do chão.
 *
 * Por que isto existe
 * -------------------
 * A arte anterior (`floor_01..03`) era um bloco 3x3: uma grelha de nove lajes com
 * rejunte escuro, mais a moldura clara do losango. Desenhada célula a célula, a
 * grelha se repetia em cada tile e o chão lia como piso de azulejos — o oposto
 * de uma caverna, onde o chão é uma superfície contínua irregular e a sombra
 * vem da rocha desenhada por cima.
 *
 * Nenhum ajuste de escala ou de sobreposição remove a grelha: ela está gravada
 * dentro de cada tile. A saída é não usar arte de tile para o chão, e sim gerar
 * uma superfície contínua e recortá-la nas células.
 *
 * Como a continuidade é garantida
 * ------------------------------
 * O chão é função das coordenadas CONTÍNUAS de mapa, e não do tile. Para um
 * ponto de tela a uma distância (dx, dy) do centro da célula, a coordenada de
 * mapa é a inversa da projeção isométrica:
 *
 *   colf = dx / tw + dy / th
 *   rowf = -dx / tw + dy / th
 *
 * Em (colf, rowf) a célula é o quadrado unitário [col-0.5, col+0.5] x
 * [row-0.5, row+0.5] — o losango da tela vira um quadrado alinhado. Como a
 * função é contínua e independe da célula, duas células que compartilham uma
 * aresta amostram a mesma curva: a emenda é contínua por construção, sem
 * ajuste e sem costura.
 *
 * A versão anterior deste arquivo mapeava o ponto direto para (u, v) com
 * (u, v) = (col - row, col + row) e deslocamentos (sx, sy) e (sx*0.5, sy*0.5).
 * As duas tentativas deixavam as arestas vizinhas em curvas de plano diferentes
 * — a 1,0 de distância, uma célula inteira — e o chão ganhara uma grade
 * diagonal visível. `test/ground.test.mjs` trava isso numericamente.
 *
 * A malha de ruído é girada antes da amostragem porque os eixos de
 * (colf, rowf) são exatamente os eixos da célula. Sem a rotação, qualquer
 * octave de frequência inteira produziria um desenho que se repete a cada
 * célula — que é uma grade, só que com outro formato.
 */

/** Células por coluna / linha no atlas. Cobre o maior mapa com folga. */
export const GROUND_COLUMNS = 14;
export const GROUND_ROWS = 12;

/** Tamanho do recorte, em pixels de textura. Superamostra a célula de 96x49. */
export const GROUND_CELL_WIDTH = 112;
export const GROUND_CELL_HEIGHT = 57;

/** Chave da textura do atlas no Phaser. */
export const GROUND_TEXTURE_KEY = 'ground';

/**
 * Rotação do domínio de ruído, em radianos (~20°). Fora de qualquer múltiplo
 * de 45° para não alinhar nem com os eixos da célula nem com as diagonais do
 * losango na tela.
 */
const GROUND_ROTATION = 0.349;

const COS_ROTATION = Math.cos(GROUND_ROTATION);
const SIN_ROTATION = Math.sin(GROUND_ROTATION);

/**
 * Hash inteiro de 32 bits. `Math.imul` mantém a multiplicação em 32 bits com
 * sinal em vez de perder precisão no double — sem isso o hash degenera numa
 * sequência periódica e o ruído ganha textura de grade.
 */
function hash2(ix, iy, seed) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** Ruído de valor com interpolação suave: contínuo, mas não derivável. */
function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const ux = smoothstep(x - x0);
  const uy = smoothstep(y - y0);

  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);

  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;

  return top + (bottom - top) * uy;
}

/**
 * Soma de octaves com normalização. As frequências sobem por 2.03, e não por
 * 2, de propósito: uma progressão geométrica exata restaura a simetria do
 * ruído em certas escalas e o chão volta a parecer um desenho repetido.
 */
function fbm(x, y, seed, octaves, frequency) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let f = frequency;

  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * f, y * f, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    f *= 2.03;
  }

  return sum / total;
}

/**
 * Voronói de pontos jitterados: devolve a distância ao ponto mais próximo
 * (a forma dos seixos), a distância ao segundo (as arestas viram fendas) e o
 * vetor até o ponto mais próximo, que é o que dá volume ao seixo.
 *
 * O jitter vai de 0.15 a 0.85, não de 0 a 1. Com 0 a 1 os pontos chegam perto
 * demais dos cantos da célula e as arestas ficam quase retas: o resultado lê
 * como uma rede de polígonos desenhada, não como fenda.
 */
function voronoi(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  let nearest = Infinity;
  let second = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let nearestCell = 0;

  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const cx = x0 + i;
      const cy = y0 + j;
      const dx = cx + 0.15 + hash2(cx, cy, seed) * 0.7 - x;
      const dy = cy + 0.15 + hash2(cx, cy, seed + 7919) * 0.7 - y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < nearest) {
        second = nearest;
        nearest = d;
        nearestX = dx;
        nearestY = dy;
        nearestCell = cx * 65536 + cy;
      } else if (d < second) {
        second = d;
      }
    }
  }

  return { nearest, edge: second - nearest, nx: nearestX, ny: nearestY, cell: nearestCell };
}

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Amostra a superfície num ponto de mapa contínuo.
 *
 * Devolve campos separados em vez de uma cor pronta porque o jogo tinge o chão
 * inteiro por bioma (`palette.ground`): a variação fica no atlas, a cor vem do
 * bioma. Com a cor aqui dentro seria preciso um atlas por bioma.
 *
 * @param {number} colf coluna contínua
 * @param {number} rowf linha contínua
 * @returns {{shade: number, warm: number, pebble: number, crack: number}}
 */
export function sampleGround(colf, rowf) {
  const x = colf * COS_ROTATION - rowf * SIN_ROTATION;
  const y = colf * SIN_ROTATION + rowf * COS_ROTATION;

  // Manchas largas de luz e sombra, do tamanho de alguns tiles. É a camada que
  // mais aproxima a referência: o brilho entra em poças, não em grade.
  const broad = fbm(x, y, 11, 3, 0.3);
  // Granulação média da rocha.
  const mottle = fbm(x, y, 29, 3, 1.3);
  // Grão fino, quase textura.
  const grain = fbm(x, y, 53, 2, 6.2);
  // Deriva de temperatura: manchas quentes e frias, como veio de minério.
  // A diferença de dois campos independentes é usada em vez de um só
  // deslocado de 0.5 porque o fbm tem média local enviesada: com um octave só
  // a amostra real deu média 0,134 em `warm`, o que deixava o atlas inteiro
  // azulado e brigava com o tingimento quente do bioma.
  const warmth = fbm(x, y, 71, 2, 0.42) - fbm(x, y, 97, 2, 0.39);

  // Seixos. Duas camadas com frequências e sementes diferentes: uma só deixa
  // a treliça do Voronói aparecer como fileiras de bolinhas. A interferência
  // entre as duas é o que faz o olho ler cascalho.
  //
  // O raio varia por seixo, derivado da célula que o contém — do contrário
  // todos saem do mesmo tamanho e o chão vira bolinha.
  //
  // O vetor até o centro entra no brilho com sinal: a face voltada para
  // cima-esquerda clareia, a oposta escurece. Sem isso o seixo é mancha chapada,
  // e mancha chapada some; volume é o que o faz ler pedrinha.
  const stones = voronoi(x * 0.95, y * 0.95, 137);
  const stoneSize = 0.12 + hash2(stones.cell, 0, 617) * 0.14;
  const gateA = fbm(x, y, 311, 2, 0.6);
  const pebbleA = clamp01(1 - stones.nearest / stoneSize) * clamp01((gateA - 0.5) * 4.5);
  const lightA = -((stones.nx + stones.ny) / 0.95) * 1.8 * pebbleA;

  const chips = voronoi(x * 2.4, y * 2.4, 419);
  const chipSize = 0.1 + hash2(chips.cell, 0, 881) * 0.12;
  const gateB = fbm(x, y, 617, 2, 0.47);
  const pebbleB = clamp01(1 - chips.nearest / chipSize) * clamp01((gateB - 0.54) * 4.5);
  const lightB = -((chips.nx + chips.ny) / 2.4) * 1.8 * pebbleB;

  const pebble = Math.max(pebbleA, pebbleB);
  const pebbleLight = lightA + lightB;

  // Fendas: uma rede de arestas de Voronói cobre a área inteira e vira desenho
  // de teia. A máscara de baixa frequência é o que a transforma em rachaduras:
  // some na maior parte do chão e aparece em recortes.
  const cracks = voronoi(x * 0.55, y * 0.55, 211);
  const crackGate = fbm(x, y, 233, 2, 0.37);
  const crack = clamp01(1 - cracks.edge / 0.06) * clamp01((crackGate - 0.55) * 5);

  const shade = clamp01(
    0.5 + (broad - 0.5) * 0.85 + (mottle - 0.5) * 0.42 + (grain - 0.5) * 0.14
      + pebble * 0.12 + pebbleLight - crack * 0.34
  );

  return {
    shade,
    // O viés quente/frio entra na cor, não no brilho, senão a derivação vira
    // listras visíveis.
    warm: clamp01(0.5 + warmth * 2.2),
    pebble,
    crack
  };
}

/**
 * Rampa de cinzas da pedra, da fenda profunda ao topo iluminado.
 *
 * Os valores são altos de propósito. O tint do Phaser MULTIPLICA a textura, e
 * `palette.ground` nunca passa de 255 por canal, então a cor final é sempre
 * estetereno multiplicado por algo abaixo de 1. Com a rampa escura o chão
 * saía em marrom lamacento, sem nenhuma folga para o bioma clarear.
 *
 * O deslocamento quente/frio entra por cima, e é ele que impede o chão de
 * parecer cinza chapado sob qualquer tingimento.
 */
const RAMP = [
  { at: 0, rgb: [72, 64, 56] },
  { at: 0.34, rgb: [120, 110, 97] },
  { at: 0.6, rgb: [162, 150, 134] },
  { at: 0.82, rgb: [196, 182, 163] },
  { at: 1, rgb: [224, 210, 190] }
];

function rampColor(shade) {
  for (let i = 1; i < RAMP.length; i += 1) {
    if (shade <= RAMP[i].at) {
      const lower = RAMP[i - 1];
      const upper = RAMP[i];
      const t = (shade - lower.at) / (upper.at - lower.at);

      return [
        Math.round(mix(lower.rgb[0], upper.rgb[0], t)),
        Math.round(mix(lower.rgb[1], upper.rgb[1], t)),
        Math.round(mix(lower.rgb[2], upper.rgb[2], t))
      ];
    }
  }

  return RAMP[RAMP.length - 1].rgb;
}

/** Converte a amostra num RGB, aplicando o desvio quente/frio. */
export function groundColorAt(colf, rowf) {
  const { shade, warm } = sampleGround(colf, rowf);
  const [r, g, b] = rampColor(shade);
  // Frio tira verde, quente tira azul. Preserva a luminância: é pigmento, não luz.
  const chroma = (warm - 0.5) * 34;

  return [
    Math.max(0, Math.min(255, Math.round(r + chroma))),
    Math.max(0, Math.min(255, Math.round(g - chroma * 0.18))),
    Math.max(0, Math.min(255, Math.round(b - chroma)))
  ];
}

/**
 * Converte um pixel do recorte na coordenada de mapa contínua que ele
 * representa, invertendo a projeção isométrica.
 *
 * `sx` e `sy` vêm em [-1, 1] e descrevem o losango: fora de |sx| + |sy| <= 1 o
 * pixel está no canto transparente.
 */
export function groundPixelToMap(col, row, px, py, cellWidth = GROUND_CELL_WIDTH, cellHeight = GROUND_CELL_HEIGHT) {
  const sx = (px - cellWidth / 2) / (cellWidth / 2);
  const sy = (py - cellHeight / 2) / (cellHeight / 2);

  return {
    colf: col + (sx + sy) / 2,
    rowf: row + (sy - sx) / 2,
    sx,
    sy
  };
}

/** Índice do frame do atlas para a célula, com volta para mapa maior que o atlas. */
export function groundFrameIndex(col, row) {
  const column = ((col % GROUND_COLUMNS) + GROUND_COLUMNS) % GROUND_COLUMNS;
  const line = ((row % GROUND_ROWS) + GROUND_ROWS) % GROUND_ROWS;

  return line * GROUND_COLUMNS + column;
}

/** Dimensões do atlas inteiro, em pixels. */
export function getGroundAtlasSize() {
  return {
    width: GROUND_COLUMNS * GROUND_CELL_WIDTH,
    height: GROUND_ROWS * GROUND_CELL_HEIGHT
  };
}

/**
 * Renderiza uma célula do atlas em RGBA.
 *
 * Os cantos ficam transparentes de propósito: os losangos vizinhos preenchem
 * essas frestas, e só na borda externa do mapa o fundo aparece — que é o
 * efeito certo, o chão encontra o fundo da caverna.
 */
export function renderGroundCell(
  col,
  row,
  cellWidth = GROUND_CELL_WIDTH,
  cellHeight = GROUND_CELL_HEIGHT
) {
  const data = new Uint8ClampedArray(cellWidth * cellHeight * 4);

  for (let py = 0; py < cellHeight; py += 1) {
    for (let px = 0; px < cellWidth; px += 1) {
      // +0.5 amostra o centro do pixel, que é o que a GPU pinta.
      const { colf, rowf, sx, sy } = groundPixelToMap(col, row, px + 0.5, py + 0.5, cellWidth, cellHeight);

      if (Math.abs(sx) + Math.abs(sy) > 1) continue;

      const [r, g, b] = groundColorAt(colf, rowf);
      const i = (py * cellWidth + px) * 4;

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  return data;
}
