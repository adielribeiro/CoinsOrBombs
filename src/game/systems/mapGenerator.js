import { createRelicContent, getBiomeForCave, getBiomeProgress } from '../progression.js';
import { getNeighbors4, getNeighbors8, isExitReachable } from './helpers.js';

const FLOOR_VARIANTS = ['floor_01', 'floor_02', 'floor_03'];
// O boulder redondo entra com peso maior: as lajes com rachadura (rock_01..03)
// são ambíguas em silhueta pequena, enquanto o boulder lê imediatamente como
// "isto aqui é uma rocha".
const ROCK_VARIANTS = ['rock', 'rock', 'rock_01', 'rock_02', 'rock_03'];

function getMapSize(cave) {
  return {
    width: 4 + Math.floor((cave - 1) / 2),
    height: 5 + Math.floor((cave - 1) / 3)
  };
}

/**
 * A resistência da rocha agora também cresce com a profundidade do bioma.
 * Antes ela dependia só da picareta, então a Cave 20 era idêntica à
 * Cave 1 em dificuldade de quebra.
 */
function getRockHp(pickaxePower = 1, localCave = 1) {
  const base = 6 - pickaxePower;
  const depthBonus = Math.floor((localCave - 1) / 4);

  return Math.max(1, base + depthBonus);
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
    floorVariant: pickRandom(FLOOR_VARIANTS),
    rockVariant: pickRandom(ROCK_VARIANTS),
    deco: null,
    isHiddenExit: false
  };
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
        tile.deco = biome.id === 'sunstone' ? 'deco_gold_pile' : 'deco_rubble';
        continue;
      }

      if (biome.id === 'sunstone' && roll < 0.14) {
        tile.deco = Math.random() < 0.55 ? 'deco_gold_pile' : 'deco_lantern';
        continue;
      }

      if (biome.id === 'frost' && roll < 0.16) {
        tile.deco = Math.random() < 0.7 ? 'deco_ice_spike' : 'deco_crystal_blue';
        continue;
      }

      if (biome.id === 'ember' && roll < 0.16) {
        tile.deco = Math.random() < 0.7 ? 'deco_lava_vent' : 'deco_crystal_red';
        continue;
      }

      if (biome.id === 'ruins' && roll < 0.16) {
        tile.deco = Math.random() < 0.6 ? 'deco_ruin_pillar' : 'deco_crate';
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
        tile.deco = biome.id === 'frost' ? 'deco_crystal_blue' : 'deco_crystal_red';
      }
    }
  }
}

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

  const { localCave } = getBiomeProgress(cave);
  const { width, height } = getMapSize(localCave);
  const entryRow = Math.floor(height / 2);

  const entry = { col: 0, row: entryRow };
  const exit = pickHiddenExitPosition(width, height, entry);
  const rockHp = getRockHp(pickaxePower, localCave);
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
  // bomba CAIUR com a profundidade. A Cave 1 ficava com ~24% de chance por
  // rocha com apenas 2 de vida — a run morria por sorteio antes de qualquer
  // decisão do jogador.
  const bombDensity = Math.min(0.3, 0.12 + (localCave - 1) * 0.005) * biome.bombMultiplier;

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

  return mapData;
}
