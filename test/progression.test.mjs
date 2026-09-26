import test from 'node:test';
import assert from 'node:assert/strict';

import { generateMap } from '../src/game/systems/mapGenerator.js';
import { findSafeRoute, getNeighbors4, isFrontierRock } from '../src/game/systems/helpers.js';
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

test('toda cave tem rota sem bomba até a saída (a Poção Caminho Seguro sempre funciona)', () => {
  // Regressão: a busca exigia "não é rocha E não é bomba". No começo da cave
  // o único tile aberto é a entrada, então a busca nunca saía dela e a poção
  // falhava em 100% das caves (0 sucesso em 2.400 geradas).
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    for (let attempt = 0; attempt < SAMPLES_PER_CAVE; attempt += 1) {
      const map = generateMap(cave, 1, 0);
      const route = findSafeRoute(map);

      assert.ok(
        route,
        `cave ${cave} (${getBiomeProgress(cave).label}) ficou sem rota sem bomba, entao a pocao nao faria nada`
      );
    }
  }
});

test('a rota segura nunca atravessa uma bomba', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const map = generateMap(cave, 1, 0);
      const route = findSafeRoute(map);

      for (const step of route) {
        const tile = map.tiles[step.row][step.col];
        assert.notEqual(
          tile.hiddenContent,
          'bomb',
          `cave ${cave}: a rota passou por uma bomba em ${step.col},${step.row}`
        );
      }
    }
  }
});

test('a rota segura começa na entrada e termina na saída, em tiles vizinhos', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const route = findSafeRoute(map);

    assert.deepEqual(route[0], { col: map.entry.col, row: map.entry.row }, 'comeco na entrada');
    assert.deepEqual(
      route.at(-1),
      { col: map.exit.col, row: map.exit.row },
      'fim na saida'
    );

    for (let i = 1; i < route.length; i += 1) {
      const distance =
        Math.abs(route[i].col - route[i - 1].col) + Math.abs(route[i].row - route[i - 1].row);
      assert.equal(distance, 1, `degrau ${i} da rota nao e ortogonal`);
    }
  }
});

test('a rota segura atravessa rocha, que e o que a torna util', () => {
  // Se a rota so passasse por chao aberto ela seria inútil: no início da cave
  // nao existe chao aberto nenhum além da entrada.
  let comRocha = 0;

  for (let cave = 1; cave <= 20; cave += 1) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const map = generateMap(cave, 1, 0);
      const route = findSafeRoute(map);
      const atravessaRocha = route.some((step) => map.tiles[step.row][step.col].type === 'rock');
      if (atravessaRocha) comRocha += 1;
    }
  }

  assert.ok(comRocha > 0, 'a rota precisa indicar quais rochas quebrar');
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
