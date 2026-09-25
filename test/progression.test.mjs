import test from 'node:test';
import assert from 'node:assert/strict';

import { generateMap } from '../src/game/systems/mapGenerator.js';
import { getNeighbors4, isFrontierRock } from '../src/game/systems/helpers.js';
import { BIOMES, getBiomeForCave, getBiomeProgress } from '../src/game/progression.js';

const TOTAL_CAVES = BIOMES.at(-1).endCave;
const SAMPLES_PER_CAVE = 40;

/** A rocha da saída é quebrável quando toca a região aberta alcançada a partir da entrada. */
function exitIsBreakable(map) {
  const openRegion = new Set([`${map.entry.col},${map.entry.row}`]);
  const queue = [map.entry];

  while (queue.length > 0) {
    const current = queue.shift();

    getNeighbors4(current.col, current.row, map.width, map.height).forEach((neighbor) => {
      const key = `${neighbor.col},${neighbor.row}`;
      const tile = map.tiles[neighbor.row][neighbor.col];

      if (openRegion.has(key) || tile.type === 'rock') return;

      openRegion.add(key);
      queue.push(neighbor);
    });
  }

  return getNeighbors4(map.exit.col, map.exit.row, map.width, map.height).some((neighbor) =>
    openRegion.has(`${neighbor.col},${neighbor.row}`)
  );
}

test('toda cave gerada tem a saída quebrável a partir da entrada', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    for (let attempt = 0; attempt < SAMPLES_PER_CAVE; attempt += 1) {
      const map = generateMap(cave, 1, 0);

      assert.ok(
        exitIsBreakable(map),
        `cave ${cave} (${getBiomeProgress(cave).label}) gerou saida inalcancavel na tentativa ${attempt}`
      );
    }
  }
});

test('a entrada é sempre um tile aberto e único', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const entrances = map.tiles.flat().filter((tile) => tile.type === 'entrance');

    assert.equal(entrances.length, 1, `cave ${cave} deveria ter exatamente 1 entrada`);
    assert.equal(map.tiles[map.entry.row][map.entry.col].type, 'entrance');
  }
});

test('a rocha da saída é fronteira quebrável, nunca um tile vazio', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const exitTile = map.tiles[map.exit.row][map.exit.col];

    assert.equal(exitTile.type, 'rock', `cave ${cave}: a saida deveria estar escondida em rocha`);
    assert.equal(exitTile.isHiddenExit, true);
    assert.ok(
      isFrontierRock(map, map.entry, exitTile),
      `cave ${cave}: a saida nao e fronteira da area aberta`
    );
  }
});

test('a densidade de bomba cresce com a profundidade do bioma', () => {
  const densityAt = (localCave) => {
    const cave = getBiomeForCave(1).startCave + localCave - 1;
    let bombs = 0;
    let rocks = 0;
    const samples = 60;

    for (let i = 0; i < samples; i += 1) {
      const map = generateMap(cave, 1, 0);

      for (const tile of map.tiles.flat()) {
        if (tile.type !== 'rock') continue;
        rocks += 1;
        if (tile.hiddenContent === 'bomb') bombs += 1;
      }
    }

    return bombs / rocks;
  };

  const early = densityAt(1);
  const mid = densityAt(10);
  const late = densityAt(20);

  assert.ok(early < mid, `cave 1 (${early}) deveria ser mais segura que a cave 10 (${mid})`);
  assert.ok(mid < late, `cave 10 (${mid}) deveria ser mais perigosa que a cave 20 (${late})`);
  assert.ok(early < 0.18, `cave 1 com ${early} de bomba e injusta com 2 de vida`);
});

test('a resistência da rocha cresce com a profundidade', () => {
  const hpAt = (localCave) => {
    const cave = localCave;
    const map = generateMap(cave, 1, 0);

    return Math.max(...map.tiles.flat().filter((t) => t.type === 'rock').map((t) => t.hp));
  };

  assert.ok(hpAt(1) < hpAt(10), 'a cave 10 deveria ser mais dura que a cave 1');
  assert.ok(hpAt(10) < hpAt(20), 'a cave 20 deveria ser mais dura que a cave 10');
});

test('a picareta reduz a resistência da rocha', () => {
  const maxHp = (power) => {
    const map = generateMap(1, power, 0);
    return Math.max(...map.tiles.flat().filter((t) => t.type === 'rock').map((t) => t.hp));
  };

  assert.ok(maxHp(5) < maxHp(1), 'picareta nivel 5 deveria quebrar mais rapido que nivel 1');
  assert.ok(maxHp(5) >= 1, 'picareta nivel 5 nunca pode dar 0 de resistencia');
});

test('toda cave devolve o bioma correto e o total de caves coerente', () => {
  for (const biome of BIOMES) {
    const progress = getBiomeProgress(biome.startCave);

    assert.equal(progress.totalCaves, biome.endCave - biome.startCave + 1);
    assert.equal(progress.biome.id, biome.id);
  }
});
