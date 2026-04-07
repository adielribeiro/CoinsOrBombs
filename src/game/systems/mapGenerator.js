import { createRelicContent, getBiomeForCave, getBiomeProgress } from '../progression.js';
import { getNeighbors4, getNeighbors8 } from './helpers.js';

const FLOOR_VARIANTS = ['floor_01', 'floor_02', 'floor_03'];
const ROCK_VARIANTS = ['rock_01', 'rock_02', 'rock_03'];

function getMapSize(cave) {
  return {
    width: 4 + Math.floor((cave - 1) / 2),
    height: 5 + Math.floor((cave - 1) / 3)
  };
}

function getRockHp(pickaxePower = 1) {
  return Math.max(1, 6 - pickaxePower);
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

  return new Set(path);
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

export function generateMap(cave, pickaxePower = 1, coinLuck = 0) {
  const biome = getBiomeForCave(cave);
  const { localCave } = getBiomeProgress(cave);
  const { width, height } = getMapSize(localCave);
  const entryRow = Math.floor(height / 2);

  const entry = { col: 0, row: entryRow };
  const exit = pickHiddenExitPosition(width, height, entry);
  const rockHp = getRockHp(pickaxePower);
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

  const pathTiles = buildMainPath(width, height, entry, exit);
  pathTiles.delete(`${entry.col},${entry.row}`);
  pathTiles.delete(`${exit.col},${exit.row}`);

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

  const baseBombCount = 5 + Math.floor((localCave - 1) / 2);
  const bombDifficultyBonus = Math.floor((localCave - 1) / 5) * 0.02;
  const bombCount = Math.ceil(baseBombCount * 1.2 * (1 + bombDifficultyBonus) * biome.bombMultiplier);

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

  const bombsToPlace = Math.min(bombCount, bombCandidates.length);

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

  return {
    width,
    height,
    entry,
    exit,
    tiles,
    biome,
    localCave
  };
}