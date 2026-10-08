/** Regras de expedição puras. Metadados de tile não fazem parte do save. */
/**
 * Quantos utilitarios a mochila segura antes de qualquer melhoria.
 *
 * Eram 8, e com 8 a bolsa virava armazem: dava para levar 3 pocoes de vida, 3 de revelar
 * e 2 de caminho seguro, e a compra no lobby nunca era uma decisao. Com 3, a lista que a
 * pessoa quer raramente cabe inteira, e **qual** utilitario fica de fora e a decisao.
 *
 * A capacidade e **somada** ao nivel da melhoria, e nunca guardada: um save antigo sem o
 * campo abre com 3, e guardar a capacidade final faria o bonus ser aplicado duas vezes ao
 * carregar.
 */
export const CAPACIDADE_BASE_DE_UTILITARIOS = 3;

/**
 * A capacidade da bolsa com o nivel da melhoria.
 *
 * Recebe o **nivel**, e nao o estado inteiro, de proposito: quem pergunta quanto cabe nao
 * precisa saber que existe uma melhoria permanente, e assim esta funcao nao importa nada
 * e nao cria ciclo com `melhorias.js`.
 *
 * @param {number} nivelDaMelhoria o nivel comprado, de 0 a 3
 * @returns {number} quantos utilitarios cabem
 */
export function capacidadeDeUtilitarios(nivelDaMelhoria) {
  const nivel = Number.isFinite(nivelDaMelhoria) ? Math.max(0, Math.trunc(nivelDaMelhoria)) : 0;

  return CAPACIDADE_BASE_DE_UTILITARIOS + nivel;
}

/**
 * Quanto custa a melhoria de carta revelar uma bomba.
 *
 * É o que limita a revelação, e o limite sai da **renda**: uma caverna rende uns 7
 * moedas no começo e uns 25 no fim, então a pessoa gasta entre 1 e 5 revelações por
 * caverna — e escolhe entre elas e as poções.
 *
 * Nenhum campo novo e nenhuma migração de save: o teto nasce de `coins`, que já existe.
 * E o problema que limitava a melhoria nunca foi a probabilidade, foi ela não ter teto
 * por caverna — a 30% por pedra ainda saíam umas 21 revelações de 22 bombas.
 */
export const CUSTO_PARA_REVELAR = 5;

/** A melhoria de carta tem de pagar a revelação que ela prometeu? */
export function podeRevelarPorPreco(coins) {
  return (coins ?? 0) >= CUSTO_PARA_REVELAR;
}

/**
 * A taxa passou e há moeda para pagar?
 *
 * Separado do `podeRevelarPorPreco` porque quem chama precisa do sorteio e da
 * disponibilidade ao mesmo tempo, e as duas são decisões diferentes: uma é do tempo,
 * a outra é do bolso.
 *
 * @param {{chance?: number, coins?: number}} estado
 * @param {() => number} random
 */
export function deveTentarRevelar({ chance, coins } = {}, random = Math.random) {
  if ((chance ?? 0) <= 0) return false;
  if (random() >= chance) return false;

  return podeRevelarPorPreco(coins);
}

/**
 * O saldo depois de pagar uma revelação.
 *
 * O desconto é uma função e não uma subtração na cena por um motivo concreto: uma
 * subtração em `CaveScene` não é testável, porque a cena precisa de Phaser. A conferência
 * por mutação mostrou que o teste passava igual com a cobrança apagada — ou seja, ele
 * não cobria nada. Aqui, apagar a função quebra o teste.
 *
 * Nunca fica negativo: a guarda de quem chama já exige o saldo, e um `Math.max` aqui
 * evita que um `coins` corrompido num save antigo vire uma dívida.
 */
export function saldoDepoisDaRevelacao(coins) {
  return Math.max(0, (coins ?? 0) - CUSTO_PARA_REVELAR);
}
const UTILITY_IDS = ['lifePotion', 'revealBomb', 'safePath'];
export function utilityCount(utilities = {}) {
  return UTILITY_IDS.reduce((total, id) => total + Math.max(0, utilities[id] || 0), 0);
}
/**
 * Ainda cabe mais alguma coisa na bolsa?
 *
 * A capacidade e argumento e nao constante porque ela muda com a melhoria comprada, e uma
 * constante aqui seria a loja discordando da regra — que foi exatamente o bug que a
 * funcao pura acima resolve.
 *
 * @param {object} utilities o inventario
 * @param {number} [capacidade] quantos utilitarios cabem
 */
export function hasUtilitySpace(utilities, capacidade = CAPACIDADE_BASE_DE_UTILITARIOS) {
  return utilityCount(utilities) < capacidade;
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
