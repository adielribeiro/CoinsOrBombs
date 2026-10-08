/** Regras de expedição puras. Metadados de tile não fazem parte do save. */
export const UTILITY_CAPACITY = 8;
const UTILITY_IDS = ['lifePotion', 'revealBomb', 'safePath'];
export function utilityCount(utilities = {}) {
  return UTILITY_IDS.reduce((total, id) => total + Math.max(0, utilities[id] || 0), 0);
}
export function hasUtilitySpace(utilities) {
  return utilityCount(utilities) < UTILITY_CAPACITY;
}

export function specialBombChance(cave) {
  return cave < 4 ? 0 : Math.min(0.55, 0.15 + (cave - 4) * 0.008);
}
export function chooseBombVariant(cave, random = Math.random) {
  if (random() >= specialBombChance(cave)) return 'normal';
  const pool = cave < 11 ? ['raider'] : cave < 21 ? ['raider', 'erosion'] : ['raider', 'erosion', 'reinforced'];
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
export function bombEffect(variant, cave, coins = 0) {
  return {
    damage: variant === 'reinforced' ? (cave >= 51 ? 3 : 2) : 1,
    coinsLost: variant === 'raider' ? Math.min(12, Math.ceil(Math.max(0, coins) * 0.1)) : 0,
    wornRocks: variant === 'erosion' ? 3 : 0
  };
}
export function bombMarker(variant, cave) {
  if (variant === 'reinforced') return `!${bombEffect(variant, cave).damage}`;
  return variant === 'raider' ? '!$' : variant === 'erosion' ? '!⛏' : '';
}

// Uma escolha opcional por cave, fora da rota segura, nunca sobre relíquias.
// O custo é conhecido antes da escavação; nenhum evento depende de cronômetro.
export const ENVIRONMENTS = {
  sunstone: { marker: '+$', extraHp: 2, coins: 3 },
  frost: { marker: '+♥', extraHp: 2, heal: 1 },
  ember: { marker: '♥→$', extraHp: 1, healthCost: 1, coins: 5 },
  ruins: { marker: '$→?', extraHp: 1, coinCost: 5, reveal: 2 },
  wind: { marker: '+?', extraHp: 2, reveal: 1 },
  crystal: { marker: '+??', extraHp: 3, reveal: 2 }
};
export function canExcavateEnvironment(biomeId, state) {
  const rule = ENVIRONMENTS[biomeId];
  return !rule || ((state.hp ?? 0) > (rule.healthCost ?? 0)
    && (state.coins ?? 0) >= (rule.coinCost ?? 0));
}
export function applyEnvironmentReward(biomeId, state) {
  const rule = ENVIRONMENTS[biomeId];
  if (!rule || !canExcavateEnvironment(biomeId, state)) return state;
  return {
    ...state,
    coins: (state.coins ?? 0) - (rule.coinCost ?? 0) + (rule.coins ?? 0),
    hp: Math.min(state.maxHp, state.hp - (rule.healthCost ?? 0) + (rule.heal ?? 0)),
    stats: { ...state.stats, totalCoinsCollected: (state.stats?.totalCoinsCollected ?? 0) + (rule.coins ?? 0) }
  };
}

/** Aplica após a rota segura e as relíquias: não quebra suas garantias. */
export function decorateChallenges(mapData, cave, safeRoute, random = Math.random) {
  const protectedTiles = new Set(safeRoute.map(tile => `${tile.col},${tile.row}`));
  const candidates = [];
  for (const tile of mapData.tiles.flat()) {
    if (tile.type !== 'rock' || tile.isHiddenExit) continue;
    if (tile.hiddenContent === 'bomb') tile.bombVariant = chooseBombVariant(cave, random);
    if (cave >= 4 && tile.hiddenContent === 'empty' && !protectedTiles.has(`${tile.col},${tile.row}`)) candidates.push(tile);
  }
  if (candidates.length) {
    const tile = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    tile.environment = mapData.biome.id;
    tile.hp += ENVIRONMENTS[tile.environment].extraHp;
  }
}
