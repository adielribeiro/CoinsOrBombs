import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEnvironmentReward, bombEffect, canExcavateEnvironment, chooseBombVariant, ENVIRONMENTS,
  hasUtilitySpace, specialBombChance, utilityCount, UTILITY_CAPACITY } from '../src/game/challenges.js';
import { isRelicContent } from '../src/game/progression.js';
import { generateMap } from '../src/game/systems/mapGenerator.js';
import { findSafeRoute, isFrontierRock } from '../src/game/systems/helpers.js';
import { estadoInicial, hidratarEstado, partePersistente } from '../src/game/saves.js';

test('progressão apresenta variantes gradualmente e limita sua frequência', () => {
  for (let cave = 1; cave <= 60; cave++) {
    assert.ok(specialBombChance(cave) <= 0.55);
    if (cave <= 3) assert.equal(chooseBombVariant(cave, () => 0), 'normal');
  }
  assert.equal(chooseBombVariant(4, () => 0), 'raider');
  const draw = values => () => values.shift();
  assert.equal(chooseBombVariant(11, draw([0, .99])), 'erosion');
  assert.equal(chooseBombVariant(21, draw([0, .99])), 'reinforced');
  assert.equal(bombEffect('reinforced', 50).damage, 2);
  assert.equal(bombEffect('reinforced', 51).damage, 3);
  assert.equal(bombEffect(undefined, 60).damage, 1);
});

test('saque tem teto e desgaste não remove melhorias nem inventário', () => {
  for (const coins of [0, 1, 5, 100, 1000]) {
    const effect = bombEffect('raider', 60, coins);
    assert.ok(effect.coinsLost <= coins);
    assert.ok(effect.coinsLost <= 12);
  }
  assert.equal(bombEffect('erosion', 11).wornRocks, 3);
});

test('mochila compartilha espaço e respeita o inventário de saves antigos', () => {
  assert.equal(hasUtilitySpace(), true);
  assert.equal(utilityCount({ lifePotion: 3, revealBomb: 2, safePath: 3 }), UTILITY_CAPACITY);
  assert.equal(hasUtilitySpace({ lifePotion: 3, revealBomb: 2, safePath: 3 }), false);
  const old = { lifePotion: 30, revealBomb: 7, safePath: 12 };
  assert.equal(hasUtilitySpace(old), false);
  assert.equal(utilityCount(old), 49);
  const state = { ...estadoInicial(), utilities: old };
  assert.deepEqual(hidratarEstado(partePersistente(state)).utilities, old);
});

test('obstáculos opcionais cobram uma vez, preservam a última vida e respeitam vida máxima', () => {
  const state = { hp: 2, maxHp: 3, coins: 7, stats: { totalCoinsCollected: 10 } };
  const hot = applyEnvironmentReward('ember', state);
  assert.equal(hot.hp, 1);
  assert.equal(hot.coins, 12);
  assert.equal(hot.stats.totalCoinsCollected, 15);
  assert.equal(canExcavateEnvironment('ember', hot), false);
  assert.equal(applyEnvironmentReward('ember', hot), hot);
  const ruins = applyEnvironmentReward('ruins', state);
  assert.equal(ruins.coins, 2);
  assert.equal(canExcavateEnvironment('ruins', ruins), false);
  assert.equal(applyEnvironmentReward('frost', { ...state, hp: 3 }).hp, 3);
  assert.equal(state.hp, 2, 'função pura não altera estado de entrada');
});

test('60 caves: rota preservada, relíquias intactas e no máximo um desafio opcional', () => {
  for (let cave = 1; cave <= 60; cave++) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const map = generateMap(cave, 13, .064, 3);
      const route = findSafeRoute(map);
      assert.ok(route);
      const tiles = map.tiles.flat();
      const challenges = tiles.filter(tile => tile.environment);
      assert.ok(challenges.length <= 1);
      if (cave < 4) assert.equal(challenges.length, 0);
      for (const tile of challenges) {
        assert.ok(ENVIRONMENTS[tile.environment]);
        assert.equal(tile.hiddenContent, 'empty');
        assert.equal(tile.isHiddenExit, false);
        assert.ok(!route.some(step => step.col === tile.col && step.row === tile.row));
      }
      assert.equal(tiles.filter(tile => isRelicContent(tile.hiddenContent)).length, 3);
    }
  }
});

test('exploração depois do tutorial não entrega sistematicamente a saída como fronteira inicial', () => {
  let hiddenBehindRocks = 0;
  for (let i = 0; i < 100; i++) {
    const map = generateMap(3);
    if (!isFrontierRock(map, map.entry, map.tiles[map.exit.row][map.exit.col])) hiddenBehindRocks++;
  }
  assert.ok(hiddenBehindRocks > 80, `apenas ${hiddenBehindRocks}% exigem exploração`);
});
