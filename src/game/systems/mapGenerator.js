import { BIOMES, createRelicContent, getBiomeForCave, getBiomeProgress } from '../progression.js';
import { ROCK_VARIANT_COUNT } from '../rocks.js';
import { findSafeRoute, getNeighbors4, getNeighbors8 } from './helpers.js';

/**
 * Índice do modelo de rocha.
 *
 * Antes isto era uma lista de CHAVES de textura, com `rock` repetido para
 * pesar o boulder redondo. Agora é um índice de frame, porque cada bioma tem
 * doze modelos na própria folha, e repetir uma chave não pesa mais nada: todos
 * os doze entram com a mesma chance.
 *
 * O índice é puro número justamente para não carregar a folha aqui. Se a cena
 * recebese a chave, o gerador passaria a depender do nome do arquivo, e uma
 * troca de nome quebraria as duas pontas sem erro de build.
 */
const ROCK_VARIANTS = Array.from({ length: ROCK_VARIANT_COUNT }, (_, i) => i);

/**
 * Dimensões da cave. Exportado porque `GROUND_COLUMNS`/`GROUND_ROWS` no atlas
 * do chão precisam cobrir o maior mapa, e essa verificação só faz sentido
 * contra a função que define o tamanho.
 */
/**
 * Teto de tiles por lado.
 *
 * Fica abaixo das 14 colunas e 12 linhas do atlas do chão, para que nenhuma
 * célula precise repetir. A verificação está em test/ground.test.mjs.
 */
const MAX_TILES = 9;

/**
 * Teto da fração de rochas que escondem bomba.
 *
 * Acima de um terço, a cave deixa de ser um quebra-cabeça e vira sorteio: o
 * jogador não consegue ler o mapa, só pode torcer. O teto vale DEPOIS do
 * `bombMultiplier` do bioma, senão ele não é teto.
 */
const MAX_BOMB_DENSITY = 0.3;

/**
 * Fração de rochas que escondem bomba numa cave.
 *
 * Exportada porque a curva é a única parte da dificuldade que a amostragem não
 * consegue verificar. Comparar a densidade medida da Cave 10 com a da Cave 11
 * dava 0,144 contra 0,148: uma margem de 0,004 dentro de um erro de cerca de
 * 0,045 com 60 amostras. O teste passava ou falhava conforme o sorteio, e
 * reprovar ali não significava nada. Testando a fórmula, a afirmação "a cave 11
 * é mais perigosa que a 10" é exata.
 *
 * A rampa é sobre a cave GLOBAL. Com a cave local do bioma a densidade
 * reiniciava a cada bioma, e a última cave de um mundo era mais perigosa que a
 * primeira do seguinte: a Câmara de Cristal abria mais fácil do que a Cave 40
 * tinha fechado. O `bombMultiplier` do bioma entra por cima, e é ele que faz a
 * Galeria de Vento ser o alívio no meio da progressão.
 *
 * O teto é aplicado DEPOIS do multiplicador. Antes ele era aplicado antes,
 * então o limite de 0,3 não era um limite: a Câmara de Cristal passava dele e
 * chegava a 0,36.
 */
export function getBombDensity(cave = 1, biome = BIOMES[0]) {
  return Math.min(MAX_BOMB_DENSITY, (0.12 + (cave - 1) * 0.003) * biome.bombMultiplier);
}

/**
 * Dimensões da cave.
 *
 * O tamanho cresce dentro do bioma, e não com o número absoluto da cave.
 *
 * A versão anterior usava `4 + (cave - 1) / 2`, e isso crescia sem parar: com
 * 80 caves a maior cave era 43x31, um mapa impossível de ler. O problema é que
 * `cave` é global, então o sexto bioma começava já enorme.
 *
 * Agora a progressão é por bioma: as caves vão de 6x7 a 9x9 dentro de cada
 * bioma de 10, e o bioma seguinte recomeça pequeno. Isso casa com a ideia de
 * que cada bioma é um mundo próprio, e mantém o maior mapa em 9x9 — que o
 * atlas de 14x12 cobre com folga.
 */
export function getMapSize(cave) {
  const biome = getBiomeForCave(cave);
  const localCave = cave - biome.startCave;
  const step = Math.floor(localCave / 2);

  return {
    width: Math.min(MAX_TILES, 6 + step),
    height: Math.min(MAX_TILES, 7 + Math.floor(localCave / 3))
  };
}

/**
 * Resistência da rocha.
 *
 * A rampa é sobre a cave GLOBAL, não sobre a local do bioma. A versão anterior
 * usava `localCave`, e com as faixas encolhidas para 10 caves isso criava um
 * degrau para baixo a cada bioma: a rocha da Cave 10 era mais dura que a da
 * Cave 11, e o jogador sentia o mundo ficando mais fácil ao avançar. Pior, com
 * o bônus de bioma somando, a soma passava a valer 0 na Cave 51 e a rocha
 * virava inquebrável.
 *
 * São duas parcelas: a rampa global, suave e sempre crescente, e o índice do
 * bioma, que é o degrau entre um mundo e outro. É o que dá a sensação de que a
 * Câmara de Cristal é outro jogo, e não a continuação da Mina Solar.
 *
 * O total fica em 18 na Cave 60 com picareta base, e 14 com a picareta no
 * máximo. A faixa antiga de 80 caves chegava a 9, então a progressão é mais
 * longa, mas o teto continua em terreno de uma dúzia de cliques por rocha.
 */
function getRockHp(pickaxePower = 1, cave = 1, biomeIndex = 0) {
  const base = 6 - pickaxePower;
  const depthBonus = Math.floor((cave - 1) / 7);
  // Um ponto por bioma, contra um ponto a cada sete caves: o degrau de bioma
  // pesa mais do que a escadinha interna, mas não atropela a rampa.
  const biomeBonus = biomeIndex;

  return Math.max(1, base + depthBonus + biomeBonus);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createBaseTile(col, row, rockHp) {
  return {
    col,
    row,
    type: 'rock',
    hiddenContent: 'empty',
    revealed: false,
    walkable: false,
    hp: rockHp,
    // `floorVariant` e `floorTone` saíram daqui. O chão vem de um atlas de
    // superfície contínua (src/game/ground.js): escolher uma arte por tile
    // repetia a malha em cada célula, e tingir cada tile com um brilho próprio
    // recriava a mesma grade como degrau de luminância. A variação de tom mora
    // na textura e a cor vem do bioma.
    grit: pickGrit(col, row),
    rockVariant: pickRandom(ROCK_VARIANTS),
    deco: null,
    isHiddenExit: false
  };
}

/**
 * Quantidade de entulho desenhado sobre a célula, em sprites.
 *
 * Hash da posição: a mesma pedra volta sempre no mesmo lugar, então o mapa não
 * "pisca" a cada redesenho.
 */
function pickGrit(col, row) {
  const hash = Math.sin(col * 39.3468 + row * 11.135) * 24634.6345;
  const noise = hash - Math.floor(hash);

  return noise < 0.4 ? 1 + Math.floor(noise * 3) : 0;
}

function getDistance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function pickHiddenExitPosition(width, height, entry) {
  const minimumDistance = Math.max(3, Math.floor((width + height) / 2) - 1);
  const preferredCandidates = [];
  const fallbackCandidates = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (col === entry.col && row === entry.row) continue;

      const candidate = { col, row };
      const distance = getDistance(candidate, entry);

      if (distance >= minimumDistance && col >= 1) {
        preferredCandidates.push(candidate);
      } else if (distance >= 2) {
        fallbackCandidates.push(candidate);
      }
    }
  }

  return pickRandom(preferredCandidates.length > 0 ? preferredCandidates : fallbackCandidates);
}

function buildMainPath(width, height, entry, exit) {
  const path = [];
  let currentCol = entry.col;
  let currentRow = entry.row;
  let safety = width * height * 6;

  path.push(`${currentCol},${currentRow}`);

  while ((currentCol !== exit.col || currentRow !== exit.row) && safety > 0) {
    const options = [];

    if (currentCol < exit.col) {
      options.push({ col: currentCol + 1, row: currentRow });
      options.push({ col: currentCol + 1, row: currentRow });
    } else if (currentCol > exit.col) {
      options.push({ col: currentCol - 1, row: currentRow });
      options.push({ col: currentCol - 1, row: currentRow });
    }

    if (currentRow < exit.row) {
      options.push({ col: currentCol, row: currentRow + 1 });
      options.push({ col: currentCol, row: currentRow + 1 });
    } else if (currentRow > exit.row) {
      options.push({ col: currentCol, row: currentRow - 1 });
      options.push({ col: currentCol, row: currentRow - 1 });
    }

    if (currentRow > 1 && Math.random() < 0.24) {
      options.push({ col: currentCol, row: currentRow - 1 });
    }

    if (currentRow < height - 2 && Math.random() < 0.24) {
      options.push({ col: currentCol, row: currentRow + 1 });
    }

    if (currentCol > 0 && Math.random() < 0.10) {
      options.push({ col: currentCol - 1, row: currentRow });
    }

    if (currentCol < width - 1 && Math.random() < 0.10) {
      options.push({ col: currentCol + 1, row: currentRow });
    }

    const validOptions = options.filter(
      (option) =>
        option.col >= 0 &&
        option.row >= 0 &&
        option.col < width &&
        option.row < height
    );

    const next = pickRandom(validOptions.length > 0 ? validOptions : [{ col: exit.col, row: exit.row }]);

    currentCol = next.col;
    currentRow = next.row;
    path.push(`${currentCol},${currentRow}`);
    safety -= 1;
  }

  path.push(`${exit.col},${exit.row}`);

  return path;
}

function decorateOpenTiles(tiles, width, height, entry, biome) {
  const isNearEntry = (col) => col <= 2;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];

      if (tile.type === 'rock') continue;
      if (tile.type === 'entrance' || tile.type === 'exit') continue;

      const neighbors = getNeighbors8(col, row, width, height);
      const adjacentRockCount = neighbors.filter(
        (n) => tiles[n.row][n.col].type === 'rock'
      ).length;

      const roll = Math.random();

      if (isNearEntry(col) && roll < 0.10) {
        tile.deco = biome.id === 'ruins' ? 'deco_ruin_pillar' : 'deco_tracks';
        continue;
      }

      if (adjacentRockCount >= 2 && roll < 0.05) {
        tile.deco = DECO_NEAR_ROCK[biome.id] ?? 'deco_rubble';
        continue;
      }

      // Decoração temática do bioma, por tabela.
      //
      // Era uma cascata de `if (biome.id === 'x')`, e os biomas novos caíam
      // direto no genérico: a Galeria de Vento e a Câmara de Cristal recebiam
      // entulho de mó通用, que não diz nada sobre o lugar. Com a tabela, um
      // bioma novo entra por dados e o teste cobre a tabela inteira.
      const tematica = DECO_BY_BIOME[biome.id];

      if (tematica && roll < tematica.chance) {
        tile.deco = Math.random() < tematica.mainChance
          ? tematica.main
          : tematica.alt;
        continue;
      }

      if (roll < 0.10) {
        tile.deco = 'deco_rubble';
        continue;
      }

      if (roll < 0.14) {
        tile.deco = 'deco_crate';
        continue;
      }

      if (roll < 0.18) {
        tile.deco = tematica?.alt ?? (biome.id === 'frost' ? 'deco_crystal_blue' : 'deco_crystal_red');
      }
    }
  }
}

/**
 * Decoração temática de cada bioma.
 *
 * `chance` é a probabilidade de sair algo do bioma em vez do entulho comum,
 * `mainChance` o quanto pesa a decoração principal contra a secundária, e
 * `alt` o que completa. `DECO_NEAR_ROCK` é o que aparece encostado em rocha,
 * que costuma ser algo pequeno.
 */
const DECO_BY_BIOME = {
  sunstone: { chance: 0.14, main: 'deco_gold_pile', mainChance: 0.55, alt: 'deco_lantern' },
  frost: { chance: 0.16, main: 'deco_ice_spike', mainChance: 0.7, alt: 'deco_crystal_blue' },
  ember: { chance: 0.16, main: 'deco_lava_vent', mainChance: 0.7, alt: 'deco_crystal_red' },
  ruins: { chance: 0.16, main: 'deco_ruin_pillar', mainChance: 0.6, alt: 'deco_crate' },
  // Vento: estalactite alta e cristal azul, a mesma paleta do gelo — a
  // galeria é fria e vazia, e repetir a arte fica melhor do que inventar uma
  // peça fora do estilo.
  wind: { chance: 0.15, main: 'deco_ice_spike', mainChance: 0.45, alt: 'deco_crystal_blue' },
  // Cristal: o nome do bioma é Cristal, e `deco_crystal_blue` é literalmente
  // um cristal.
  crystal: { chance: 0.18, main: 'deco_crystal_blue', mainChance: 0.6, alt: 'deco_crystal_red' }
};

const DECO_NEAR_ROCK = {
  sunstone: 'deco_gold_pile',
  ruins: 'deco_ruin_pillar'
};

/**
 * Abre o menor trecho de caminho necessário para que a rocha da saída fique
 * encostada na área já aberta.
 *
 * Sem isto, uma cave pode sair da geração com a saída cercada por rocha que
 * não é fronteira — o jogador não conseguiria nem sequer clicar nela, e a
 * run ficaria sem solução possível. O caminho para em UM vizinho da saída:
 * os outros lados continuam rocha, então a saída segue "escondida".
 */
function ensureExitReachable(mapData) {
  if (hasOpenNeighborAtExit(mapData)) return;

  const { width, height, entry, exit } = mapData;
  const path = buildMainPath(width, height, entry, exit);
  const exitNeighbors = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map((n) => `${n.col},${n.row}`)
  );

  const open = (key) => {
    const [col, row] = key.split(',').map(Number);
    const tile = mapData.tiles[row][col];

    if (tile.type === 'rock' && !tile.isHiddenExit) {
      tile.type = 'floor';
      tile.walkable = true;
      tile.revealed = true;
      tile.hp = 0;
      tile.deco = null;
    }
  };

  for (const key of path) {
    if (key === `${entry.col},${entry.row}`) continue;

    // Para no primeiro vizinho da saída: abre a rota, mantém o resto fechado.
    if (exitNeighbors.has(key)) {
      open(key);
      return;
    }

    open(key);
  }
}

function hasOpenNeighborAtExit(mapData) {
  const { width, height, entry, exit } = mapData;
  const openRegion = floodOpenTiles(mapData, entry);
  const exitNeighbors = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map((n) => `${n.col},${n.row}`)
  );

  for (const key of openRegion) {
    if (exitNeighbors.has(key)) return true;
  }

  return false;
}

/**
 * Garante que exista ao menos uma rota da entrada até a saída sem passar por
 * bomba, que é o que a Poção Caminho Seguro revela.
 *
 * Sem isto, ~1,5% das caves ficavam com a saída cercada por bombas e a poção
 * respondia "não encontrei rota" — um utilitário comprado por 80 moedas que
 * não fazia nada. Astrategy: pega o caminho mais curto ignorando bombas e
 * limpa só as bombas que estiverem nele. Converter apenas as bombas vizinhas
 * da saída não bastava, porque a bomba pode estar mais longe e isolar a
 * saída do resto do mapa.
 */
function ensureSafeRoute(mapData) {
  if (findSafeRoute(mapData)) return;

  const route = shortestPathIgnoringBombs(mapData);
  if (!route) return;

  for (const step of route) {
    const tile = mapData.tiles[step.row][step.col];

    if (tile.hiddenContent === 'bomb') {
      tile.hiddenContent = 'empty';
    }
  }
}

/** Caminho mais curto da entrada até a saída, sem se importar com bombas. */
function shortestPathIgnoringBombs(mapData) {
  const { width, height, entry, exit } = mapData;
  const startKey = `${entry.col},${entry.row}`;
  const cameFrom = new Map();
  const visited = new Set([startKey]);
  const queue = [entry];
  let reached = false;

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.col === exit.col && current.row === exit.row) {
      reached = true;
      break;
    }

    for (const neighbor of getNeighbors4(current.col, current.row, width, height)) {
      const key = `${neighbor.col},${neighbor.row}`;
      if (visited.has(key)) continue;

      visited.add(key);
      cameFrom.set(key, `${current.col},${current.row}`);
      queue.push(neighbor);
    }
  }

  if (!reached) return null;

  const route = [];
  let key = `${exit.col},${exit.row}`;

  while (key) {
    const [col, row] = key.split(',').map(Number);
    route.push({ col, row });
    key = cameFrom.get(key);
  }

  return route.reverse();
}

function floodOpenTiles(mapData, start) {
  const visited = new Set([`${start.col},${start.row}`]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();

    getNeighbors8(current.col, current.row, mapData.width, mapData.height).forEach((neighbor) => {
      const key = `${neighbor.col},${neighbor.row}`;

      if (visited.has(key)) return;
      if (mapData.tiles[neighbor.row][neighbor.col].type === 'rock') return;

      visited.add(key);
      queue.push(neighbor);
    });
  }

  return visited;
}

export function generateMap(cave, pickaxePower = 1, coinLuck = 0) {
  const biome = getBiomeForCave(cave);

  // `getMapSize` e `getRockHp` recebem a cave GLOBAL, não a local. A versão
  // anterior passava `localCave` para as duas, o que só funcionava porque
  // `getMapSize` usava o número absoluto. Depois que `getMapSize` passou a
  // crescer por bioma, passar a local dava sempre o tamanho da primeira cave do
  // bioma e a dificuldade parava de subir.
  //
  // `localCave` continua existindo aqui, mas só para a densidade de armadilha,
  // que é expressa em fracção de rocha e não em valor absoluto.
  const { localCave } = getBiomeProgress(cave);
  const { width, height } = getMapSize(cave);
  const entryRow = Math.floor(height / 2);

  const entry = { col: 0, row: entryRow };
  const exit = pickHiddenExitPosition(width, height, entry);
  const rockHp = getRockHp(pickaxePower, cave, BIOMES.indexOf(biome));
  const tiles = [];

  for (let row = 0; row < height; row += 1) {
    const currentRow = [];
    for (let col = 0; col < width; col += 1) {
      currentRow.push(createBaseTile(col, row, rockHp));
    }
    tiles.push(currentRow);
  }

  tiles[entry.row][entry.col] = {
    ...createBaseTile(entry.col, entry.row, rockHp),
    type: 'entrance',
    hiddenContent: 'empty',
    revealed: true,
    walkable: true,
    hp: 0,
    deco: null,
    isHiddenExit: false
  };

  tiles[exit.row][exit.col] = {
    ...createBaseTile(exit.col, exit.row, rockHp),
    type: 'rock',
    hiddenContent: 'empty',
    revealed: false,
    walkable: false,
    hp: rockHp,
    deco: null,
    isHiddenExit: true
  };

  const pathTiles = new Set(
    buildMainPath(width, height, entry, exit).filter(
      (key) => key !== `${entry.col},${entry.row}` && key !== `${exit.col},${exit.row}`
    )
  );

  const protectedExitSides = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map(
      (neighbor) => `${neighbor.col},${neighbor.row}`
    )
  );

  const baseCoinChance = 0.2 + localCave * 0.012 + coinLuck;
  const coinChance = Math.min(0.48, baseCoinChance * biome.coinMultiplier);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];
      const key = `${col},${row}`;

      if (tile.type !== 'rock') continue;

      if (
        pathTiles.has(key) &&
        !protectedExitSides.has(key) &&
        !tile.isHiddenExit &&
        Math.random() < 0.18
      ) {
        tile.type = 'floor';
        tile.walkable = true;
        tile.revealed = true;
        tile.hp = 0;
      }

      if (!tile.isHiddenExit) {
        tile.hiddenContent = Math.random() < coinChance ? 'coin' : 'empty';
      }
    }
  }

  // Densidade em vez de contagem absoluta: o número de rochas cresce ~7x da
  // Cave 1 para a Cave 20, então uma contagem fixa fazia a densidade de
  // bomba CAIR com a profundidade. A Cave 1 ficava com ~24% de chance por
  // rocha com apenas 2 de vida — a run morria por sorteio antes de qualquer
  // decisão do jogador.
  const bombDensity = getBombDensity(cave, biome);

  const bombCandidates = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];

      if (tile.type !== 'rock' || tile.isHiddenExit) continue;
      bombCandidates.push(tile);
    }
  }

  for (let i = bombCandidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bombCandidates[i], bombCandidates[j]] = [bombCandidates[j], bombCandidates[i]];
  }

  const bombCount = Math.min(bombCandidates.length, Math.round(bombCandidates.length * bombDensity));
  const bombsToPlace = Math.max(1, bombCount);

  for (let i = 0; i < bombsToPlace; i += 1) {
    bombCandidates[i].hiddenContent = 'bomb';
  }

  const relicChance = Math.min(0.28, biome.relicChance + Math.floor((localCave - 1) / 5) * 0.01);
  if (Math.random() < relicChance) {
    const relicCandidates = bombCandidates.filter((tile) => tile.hiddenContent === 'empty');

    if (relicCandidates.length > 0) {
      const relicTile = pickRandom(relicCandidates);
      relicTile.hiddenContent = createRelicContent(biome.relicId);
    }
  }

  decorateOpenTiles(tiles, width, height, entry, biome);

  const mapData = {
    width,
    height,
    entry,
    exit,
    tiles,
    biome,
    localCave
  };

  ensureExitReachable(mapData);
  ensureSafeRoute(mapData);

  return mapData;
}
