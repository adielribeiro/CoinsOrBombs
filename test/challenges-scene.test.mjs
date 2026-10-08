import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as challenges from '../src/game/challenges.js';
import * as progression from '../src/game/progression.js';
import * as helpers from '../src/game/systems/helpers.js';
import * as config from '../src/game/config.js';
import { t } from '../src/i18n/index.js';

// Execute os métodos reais da cena, substituindo somente a superfície gráfica.
// O Node não tem canvas/WebGL; nenhum trecho da regra de dano é copiado aqui.
const source = (await readFile(new URL('../src/game/scenes/CaveScene.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
  .replace(/^export /gm, '');
const CaveScene = vm.runInNewContext(`${source}\nCaveScene`, {
  ...challenges, ...progression, ...helpers, ...config, t,
  Phaser: { Scene: class {}, Utils: { Array: { Shuffle: list => list, GetRandom: list => list[0] } } }
});
function visual() {
  const object = {};
  for (const method of ['setDisplaySize', 'setDepth', 'setStrokeStyle', 'setData', 'setTint', 'destroy', 'setTexture', 'setOrigin']) {
    object[method] = () => object;
  }
  return object;
}
function scene() {
  const s = new CaveScene();
  s.metaState = { ...s.metaState, cave: 51, hp: 8, maxHp: 8, coins: 100 };
  s.origin = { x: 0, y: 0 };
  s.renderMetrics = { tileWidth: 80, tileHeight: 40 };
  s.add = { image: visual, text: visual, circle: visual };
  s.objectLayer = { add() {} };
  s.tweens = { add() {} };
  s.cameras = { main: { flash() {} } };
  s.notes = [];
  s.notify = message => s.notes.push(message);
  s.spawnBreakDebris = () => {};
  s.showDamageCount = () => {};
  s.flashRockHit = () => {};
  s.openLobby = () => { s.metaState.inLobby = true; };
  s.tryRockBurst = () => {};
  s.tryRevealRandomBombBonus = () => false;
  s.mapData = { width: 1, height: 1, tiles: [[{ type: 'floor' }]] };
  return s;
}
function rock(extra = {}) {
  return { col: 0, row: 0, type: 'rock', hp: 1, hiddenContent: 'empty', floorSprite: visual(), ...extra };
}

test('cena: primeiro toque explica bomba especial sem dano; segundo aplica efeito uma vez', () => {
  const s = scene();
  const tile = rock({ hiddenContent: 'bomb', bombVariant: 'reinforced' });
  s.metaState.bombsRemaining = 1;
  s.damageRock(tile);
  assert.equal(s.metaState.hp, 8);
  assert.equal(tile.hp, 1);
  assert.equal(s.notes.length, 1);
  s.damageRock(tile);
  assert.equal(s.metaState.hp, 5);
  assert.equal(s.metaState.bombsRemaining, 0);
  assert.equal(tile.type, 'floor');
  s.handleTileClick(tile);
  assert.equal(s.metaState.hp, 5);
});

test('cena: saque aplica teto; desgaste termina após três rochas sem alterar picareta', () => {
  const s = scene();
  const raider = rock({ hiddenContent: 'bomb', bombVariant: 'raider', challengeAcknowledged: true });
  s.damageRock(raider);
  assert.equal(s.metaState.coins, 90);
  const erosion = rock({ hiddenContent: 'bomb', bombVariant: 'erosion', challengeAcknowledged: true });
  s.damageRock(erosion);
  assert.equal(s.wornRocks, 3);
  for (let i = 0; i < 3; i++) {
    const tile = rock();
    s.damageRock(tile);
    assert.equal(tile.hp, 2);
    s.damageRock(tile);
    s.damageRock(tile);
    assert.equal(tile.type, 'floor');
  }
  assert.equal(s.wornRocks, 0);
  const last = rock();
  s.damageRock(last);
  assert.equal(last.type, 'floor');
  assert.equal(s.metaState.pickaxePower, 1);
});

test('cena: quebra automática não aceita custos opcionais nem aciona bombas especiais', () => {
  const s = scene();
  for (const extra of [{ environment: 'ember' }, { hiddenContent: 'bomb', bombVariant: 'reinforced' }]) {
    const tile = rock(extra);
    s.damageRock(tile, true);
    assert.equal(tile.type, 'rock');
    assert.equal(s.metaState.hp, 8);
  }
});

test('cena: obstáculo quente debita ao concluir e nunca mata; gelo não revela bombas', () => {
  const s = scene();
  const hot = rock({ environment: 'ember' });
  s.damageRock(hot);
  assert.equal(s.metaState.hp, 8);
  s.damageRock(hot);
  assert.equal(s.metaState.hp, 7);
  assert.equal(s.metaState.coins, 105);
  s.metaState.hp = 1;
  const blocked = rock({ environment: 'ember', challengeAcknowledged: true });
  s.damageRock(blocked);
  assert.equal(blocked.type, 'rock');
  const bomb = rock({ hiddenContent: 'bomb' });
  s.mapData.tiles = [[bomb]];
  s.damageRock(rock({ environment: 'frost', challengeAcknowledged: true }));
  assert.equal(s.metaState.hp, 2);
  assert.equal(bomb.utilityRevealBomb, undefined);
});

test('cena: selo das ruínas gasta moedas e revela somente bombas ainda escondidas', () => {
  const s = scene();
  const bombs = [rock({ hiddenContent: 'bomb' }), rock({ hiddenContent: 'bomb' })];
  s.mapData = { width: 2, height: 1, tiles: [bombs] };
  s.damageRock(rock({ environment: 'ruins', challengeAcknowledged: true }));
  assert.equal(s.metaState.coins, 95);
  assert.ok(bombs.every(bomb => bomb.utilityRevealBomb));
});

test('cena: inventário lotado impede drops sem apagar itens', () => {
  const s = scene();
  s.metaState.utilityDropChance = 1;
  s.metaState.utilities = { safePath: 8, lifePotion: 2, revealBomb: 0 };
  assert.equal(s.tryCollectRandomUtility(), null);
  assert.equal(s.metaState.utilities.safePath, 8);
  assert.equal(s.metaState.utilities.lifePotion, 2);
});
