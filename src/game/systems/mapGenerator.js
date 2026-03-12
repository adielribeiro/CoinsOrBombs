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
  return Math.max(1, 5 - pickaxePower);
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
    deco: null
  };
}

function buildMainPath(width, height, entryRow, exitRow) {
  const path = [];
  let currentCol = 0;
  let currentRow = entryRow;
  path.push(`${currentCol},${currentRow}`);

  while (currentCol < width - 1) {
    const options = [];

    if (currentCol < width - 1) {
      options.push({ col: currentCol + 1, row: currentRow });
    }

    if (currentRow > 1 && Math.random() < 0.45) {
      options.push({ col: currentCol, row: currentRow - 1 });
    }

    if (currentRow < height - 2 && Math.random() < 0.45) {
      options.push({ col: currentCol, row: currentRow + 1 });
    }

    const next = pickRandom(options.filter(Boolean));
    currentCol = next.col;
    currentRow = next.row;
    path.push(`${currentCol},${currentRow}`);
  }

  while (currentRow !== exitRow) {
    currentRow += currentRow < exitRow ? 1 : -1;
    path.push(`${currentCol},${currentRow}`);
  }

  return new Set(path);
}

function decorateOpenTiles(tiles, width, height, entry, exit) {
  const isNearExit = (col, row) =>
    Math.abs(col - exit.col) <= 1 && Math.abs(row - exit.row) <= 1;

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

      if (isNearEntry(col) && roll < 0.08) {
        tile.deco = 'deco_tracks';
        continue;
      }

      if (isNearExit(col, row) && roll < 0.35) {
        tile.deco = Math.random() < 0.7 ? 'deco_crystal_blue' : 'deco_crystal_red';
        continue;
      }

      if (adjacentRockCount >= 2 && roll < 0.03) {
        tile.deco = 'deco_lantern';
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
        tile.deco = 'deco_crystal_blue';
        continue;
      }

      if (roll < 0.20) {
        tile.deco = 'deco_crystal_red';
      }
    }
  }
}

export function generateMap(cave, pickaxePower = 1, coinLuck = 0) {
  const { width, height } = getMapSize(cave);
  const entryRow = Math.floor(height / 2);
  const exitRow = Math.max(
    1,
    Math.min(height - 2, entryRow + (Math.random() < 0.5 ? -1 : 1))
  );

  const entry = { col: 0, row: entryRow };
  const exit = { col: width - 1, row: exitRow };
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
    deco: null
  };

  tiles[exit.row][exit.col] = {
    ...createBaseTile(exit.col, exit.row, rockHp),
    type: 'exit',
    hiddenContent: 'empty',
    revealed: true,
    walkable: true,
    hp: 0,
    deco: null
  };

  const pathTiles = buildMainPath(width, height, entryRow, exitRow);
  pathTiles.delete(`${entry.col},${entry.row}`);
  pathTiles.delete(`${exit.col},${exit.row}`);

  const protectedExitSides = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map(
      (neighbor) => `${neighbor.col},${neighbor.row}`
    )
  );

  const baseCoinChance = 0.20 + cave * 0.012 + coinLuck;
  const coinChance = Math.min(0.48, baseCoinChance * 1.1);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];
      const key = `${col},${row}`;

      if (tile.type !== 'rock') continue;

      // abre alguns pontos do caminho, mas nunca os lados ortogonais da saída
      if (
        pathTiles.has(key) &&
        !protectedExitSides.has(key) &&
        Math.random() < 0.18
      ) {
        tile.type = 'floor';
        tile.walkable = true;
        tile.revealed = true;
        tile.hp = 0;
      }

      tile.hiddenContent = Math.random() < coinChance ? 'coin' : 'empty';
    }
  }

  // Mais bombas
  const baseBombCount = 5 + Math.floor((cave - 1) / 2);
  const bombCount = Math.ceil(baseBombCount * 1.2);

  const bombCandidates = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];

      if (tile.type !== 'rock') continue;

      // evita colocar bomba na entrada e saída, mas pode existir perto do fim
      bombCandidates.push(tile);
    }
  }

  // embaralha candidatos
  for (let i = bombCandidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bombCandidates[i], bombCandidates[j]] = [bombCandidates[j], bombCandidates[i]];
  }

  const bombsToPlace = Math.min(bombCount, bombCandidates.length);

  for (let i = 0; i < bombsToPlace; i += 1) {
    bombCandidates[i].hiddenContent = 'bomb';
  }

  decorateOpenTiles(tiles, width, height, entry, exit);

  return {
    width,
    height,
    entry,
    exit,
    tiles
  };
}