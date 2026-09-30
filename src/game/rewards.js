/**
 * O catalogo de melhorias e o sorteio do lobby.
 *
 * Saiu do `App.jsx` para ca por dois motivos. O primeiro e practical: um teste em
 * Node nao importa um `.jsx`, entao a regra que decide se a melhoria escolhida sobe
 * o campo certo nao tinha como ser testada -- e essa regra e o coracao do recurso.
 *
 * O segundo e que e dado de jogo com um tradutor injetado, nao codigo de tela. Ele
 * nao sabe o que e uma tela; sabe o que a proxima melhoria e. Quando morar no
 * componente, qualquer um que leia a lista de melhorias tem que atravessar 2000
 * linhas de React para achar.
 *
 * Nao ha estado aqui dentro: `buildRewardCatalog` recebe o estado e devolve itens
 * puros com um `apply`, e quem aplica decide onde. E o que permite testar a regra
 * ("aplicar vitalidade sobe maxHp") sem montar o jogo.
 */

function tierLabel(value) {
  return String(value).padStart(2, '0');
}

/**
 * Embaralha uma cópia da lista.
 *
 * Não a lista original: `sort()` no lugar de `shuffle()` em um `.reverse()` é o
 * caminho curto para a ordem do lobby virar a ordem do catálogo, e o catálogo é
 * sempre o mesmo. A cópia é o que mantém o sorteio sorteando.
 */
export function shuffle(list) {
  const cloned = [...list];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
}

function getRewardVisual(track) {
  const visuals = {
    pickaxe: { icon: '⛏️', accent: 'pickaxe' },
    vitality: { icon: '🛡️', accent: 'vitality' },
    coins: { icon: '🪙', accent: 'coins' },
    rocks: { icon: '🪨', accent: 'rocks' },
    utility: { icon: '🎒', accent: 'utility' },
    bomb: { icon: '💥', accent: 'bomb' }
  };

  return visuals[track] ?? { icon: '✨', accent: 'default' };
}

export function buildRewardCatalog(state, t) {
  const rewards = [];

  // pickaxePower é limitado a 5 (1 base + 4 upgrades). O catálogo antigo
  // oferecia até 7 níveis, então "Picareta 05/06/07" eram cartas mortas:
  // aplicavam +1 em um valor já saturado e não mudavam nada na run.
  const nextPickaxe = (state.pickaxeUpgradeLevel ?? 0) + 1;
  if (nextPickaxe <= 4) {
    rewards.push({
      id: `pickaxe_${nextPickaxe}`,
      track: 'pickaxe',
      name: t('reward.pickaxe.name', { tier: tierLabel(nextPickaxe) }),
      description:
        nextPickaxe === 1
          ? t('reward.pickaxe.first')
          : t('reward.pickaxe.next', { tier: tierLabel(nextPickaxe - 1) }),
      apply: (currentState) => ({
        ...currentState,
        pickaxeUpgradeLevel: nextPickaxe,
        pickaxeLevel: Math.min(5, (currentState.pickaxeLevel ?? 1) + 1),
        pickaxePower: Math.min(5, (currentState.pickaxePower ?? 1) + 1)
      })
    });
  }

  const nextVitality = (state.vitalityLevel ?? 0) + 1;
  if (nextVitality <= 8) {
    rewards.push({
      id: `vitality_${nextVitality}`,
      track: 'vitality',
      name: t('reward.vitality.name', { tier: tierLabel(nextVitality) }),
      description: t('reward.vitality.description'),
      apply: (currentState) => ({
        ...currentState,
        vitalityLevel: nextVitality,
        maxHp: 2 + nextVitality,
        hp: 2 + nextVitality
      })
    });
  }

  const nextCoins = (state.coinBonusLevel ?? 0) + 1;
  if (nextCoins <= 8) {
    rewards.push({
      id: `coins_${nextCoins}`,
      track: 'coins',
      name: t('reward.coins.name', { tier: tierLabel(nextCoins) }),
      // `count` é a QUANTIDADE e `chance` é a probabilidade. A plural tem que
      // seguir a quantidade: mandar `chance` no lugar trocaria "+2 moedas" por
      // "+20 moedas" no polonês, porque 20 é uma categoria diferente de 2.
      description: t('reward.coins.description', { chance: nextCoins * 1, count: nextCoins }),
      apply: (currentState) => ({
        ...currentState,
        coinBonusLevel: nextCoins,
        coinBonusChance: nextCoins * 0.1,
        coinBonusAmount: nextCoins
      })
    });
  }

  const nextRocks = (state.rockBonusLevel ?? 0) + 1;
  if (nextRocks <= 2) {
    rewards.push({
      id: `rocks_${nextRocks}`,
      track: 'rocks',
      name: t('reward.rocks.name', { tier: tierLabel(nextRocks) }),
      description: t('reward.rocks.description', { chance: nextRocks * 1, count: nextRocks }),
      apply: (currentState) => ({
        ...currentState,
        rockBonusLevel: nextRocks,
        rockBonusChance: nextRocks * 0.1,
        rockBonusAmount: nextRocks
      })
    });
  }

  const nextUtility = (state.utilityDropLevel ?? 0) + 1;
  const utilityChances = [0.01, 0.02, 0.03, 0.03];

  if (nextUtility <= 2) {
    const nextChance = utilityChances[nextUtility - 1];

    rewards.push({
      id: `utility_${nextUtility}`,
      track: 'utility',
      name: t('reward.utility.name', { tier: tierLabel(nextUtility) }),
      description: t('reward.utility.description', { chance: Math.round(nextChance * 100) }),
      apply: (currentState) => ({
        ...currentState,
        utilityDropLevel: nextUtility,
        utilityDropChance: nextChance
      })
    });
  }

  const nextBomb = (state.bombRevealLevel ?? 0) + 1;
  if (nextBomb <= 10) {
    rewards.push({
      id: `bomb_${nextBomb}`,
      track: 'bomb',
      name: t('reward.bomb.name', { tier: tierLabel(nextBomb) }),
      description: t('reward.bomb.description', { chance: nextBomb * 1 }),
      apply: (currentState) => ({
        ...currentState,
        bombRevealLevel: nextBomb,
        bombRevealChance: nextBomb * 0.1
      })
    });
  }

  return rewards;
}

export function pickRewardOptions(state, t, amount = 4) {
  return shuffle(buildRewardCatalog(state, t)).slice(0, amount);
}
