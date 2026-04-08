import React, { useEffect, useRef, useState } from 'react';
import { createGame } from './game/createGame.js';
import {
  BIOMES,
  RELIC_CATALOG,
  createCollectionState,
  createStatsState,
  getBiomeForCave,
  getBiomeProgress,
  getBiomeStartCave,
  getObjectiveProgressList,
  getTotalRelics,
  getUnlockedBiomes
} from './game/progression.js';
import './styles/app.css';

const createUtilityInventory = () => ({
  lifePotion: 0,
  revealBomb: 0,
  safePath: 0
});

const createImprovementState = () => ({
  pickaxeUpgradeLevel: 0,
  vitalityLevel: 0,
  coinBonusLevel: 0,
  coinBonusChance: 0,
  coinBonusAmount: 0,
  rockBonusLevel: 0,
  rockBonusChance: 0,
  rockBonusAmount: 0,
  utilityDropLevel: 0,
  utilityDropChance: 0,
  bombRevealLevel: 0,
  bombRevealChance: 0
});

const firstBiome = getBiomeForCave(1);

const initialState = {
  screen: 'cave',
  cave: 1,
  hp: 2,
  maxHp: 2,
  coins: 0,
  bombs: 0,
  pickaxeLevel: 1,
  pickaxePower: 1,
  biomeId: firstBiome.id,
  biomeName: firstBiome.name,
  bestCave: 1,
  collection: createCollectionState(),
  stats: createStatsState(),
  lastRelicFound: null,
  utilities: createUtilityInventory(),
  inLobby: false,
  lobbyReason: null,
  nextCaveAvailable: null,
  outcomeCave: null,
  lastMessage: 'Clique em uma rocha na borda da área aberta para começar.',
  ...createImprovementState()
};

const utilityCatalog = [
  {
    id: 'lifePotion',
    icon: '❤️',
    name: 'Poção de Vida',
    description: 'Recupera 1 ponto de vida durante a run.',
    cost: 10,
    shortName: 'Vida'
  },
  {
    id: 'revealBomb',
    icon: '💣',
    name: 'Poção Dedo-Duro',
    description: 'Revela uma bomba escondida no mapa atual.',
    cost: 35,
    shortName: 'Duro'
  },
  {
    id: 'safePath',
    icon: '🧭',
    name: 'Poção Caminho Seguro',
    description: 'Mostra a rota segura até a saída da cave atual.',
    cost: 80,
    shortName: 'Seguro'
  }
];

const BIOME_ACCENT_COLORS = {
  sunstone: '#ffc26b',
  frost: '#8fd8ff',
  ember: '#ff926b',
  ruins: '#b99cff'
};

const ENTRY_PHASE = {
  MENU: 'menu',
  BLACK: 'black',
  LOGO: 'logo',
  PLAYING: 'playing'
};

const BLACK_SCREEN_MS = 3000;
const LOGO_FADE_MS = 3000;

function tierLabel(value) {
  return String(value).padStart(2, '0');
}

function shuffle(list) {
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

function buildRewardCatalog(state) {
  const rewards = [];

  const nextPickaxe = (state.pickaxeUpgradeLevel ?? 0) + 1;
  if (nextPickaxe <= 7) {
    rewards.push({
      id: `pickaxe_${nextPickaxe}`,
      track: 'pickaxe',
      name: `Picareta ${tierLabel(nextPickaxe)}`,
      description:
        nextPickaxe === 1
          ? '+1 nível de picareta.'
          : `+1 nível de picareta. Requer Picareta ${tierLabel(nextPickaxe - 1)}.`,
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
      name: `Vitalidade ${tierLabel(nextVitality)}`,
      description: '+1 vida máxima. Próxima cave começa com vida cheia.',
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
      name: `Moedas ${tierLabel(nextCoins)}`,
      description: `${nextCoins * 1}% de chance de coletar +${nextCoins} moeda(s).`,
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
      name: `Rochas ${tierLabel(nextRocks)}`,
      description: `${nextRocks * 1}% de chance de quebrar +${nextRocks} rocha(s).`,
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
      name: `Utilitário ${tierLabel(nextUtility)}`,
      description: `${Math.round(
        nextChance * 100
      )}% de chance de coletar 1 utilitário aleatório ao quebrar uma rocha.`,
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
      name: `Bombas ${tierLabel(nextBomb)}`,
      description: `${nextBomb * 1}% de chance de revelar 1 bomba aleatória ao quebrar uma rocha.`,
      apply: (currentState) => ({
        ...currentState,
        bombRevealLevel: nextBomb,
        bombRevealChance: nextBomb * 0.1
      })
    });
  }

  return rewards;
}

function pickRewardOptions(state, amount = 3) {
  return shuffle(buildRewardCatalog(state)).slice(0, amount);
}

function isMobilePortrait() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 900 && window.innerHeight > window.innerWidth;
}

function tryLockLandscape() {
  if (typeof window === 'undefined') return;

  const orientationApi = window.screen?.orientation;

  if (orientationApi?.lock) {
    orientationApi.lock('landscape').catch(() => {
      // alguns navegadores bloqueiam essa chamada
    });
  }
}

function normalizeProgressState(state) {
  return {
    ...state,
    collection: { ...createCollectionState(), ...(state?.collection ?? {}) },
    stats: { ...createStatsState(), ...(state?.stats ?? {}) },
    biomeId: state?.biomeId ?? getBiomeForCave(state?.cave ?? 1).id,
    biomeName: state?.biomeName ?? getBiomeForCave(state?.cave ?? 1).name,
    bestCave: state?.bestCave ?? 1,
    lastRelicFound: state?.lastRelicFound ?? null
  };
}

function getBiomeAccentColor(biomeId) {
  return BIOME_ACCENT_COLORS[biomeId] ?? '#8df0b0';
}

function isBiomeCompleted(biome, bestCave = 1) {
  return bestCave >= biome.endCave;
}

function isBiomeStartCave(cave = 1) {
  const biome = getBiomeForCave(cave);
  return cave === biome.startCave;
}

export default function App() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef(initialState);
  const entryTimeoutRef = useRef([]);

  const [gameState, setGameState] = useState(initialState);
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [rewardOptions, setRewardOptions] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState(null);
  const [showRotateLock, setShowRotateLock] = useState(isMobilePortrait());
  const [showUtilityShopModal, setShowUtilityShopModal] = useState(false);
  const [showExitDecision, setShowExitDecision] = useState(false);
  const [rewardRefreshCost, setRewardRefreshCost] = useState(10);
  const [entryPhase, setEntryPhase] = useState(ENTRY_PHASE.MENU);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showBiomeSelect, setShowBiomeSelect] = useState(false);
  const [biomeSelectContext, setBiomeSelectContext] = useState('menu');
  const [selectedBiomeId, setSelectedBiomeId] = useState(firstBiome.id);
  const [pendingBiomeState, setPendingBiomeState] = useState(null);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const handleViewportChange = () => {
      const mobilePortrait = isMobilePortrait();
      setShowRotateLock(mobilePortrait);

      if (!mobilePortrait) {
        tryLockLandscape();
      }
    };

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    const handleState = (event) => {
      if (!event.detail) return;
      setGameState((prev) => normalizeProgressState({ ...prev, ...event.detail }));
    };

    const handleSync = (event) => {
      if (!event.detail?.state) return;
      setGameState(normalizeProgressState(event.detail.state));
    };

    const handleCaveCleared = (event) => {
      const mergedState = normalizeProgressState({
        ...stateRef.current,
        ...(event.detail ?? {})
      });

      setGameState(mergedState);
      setSelectedUtility(null);
      setSelectedRewardId(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(false);
      setRewardRefreshCost(10);
      setRewardOptions(pickRewardOptions(mergedState, 3));
    };

    const handlePlayerDead = (event) => {
      if (!event.detail) return;

      setGameState((prev) => normalizeProgressState({ ...prev, ...event.detail }));
      setSelectedUtility(null);
      setSelectedRewardId(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(false);
      setRewardRefreshCost(10);
      setRewardOptions([]);
    };

    const handleExitDecision = (event) => {
      if (!event.detail?.state) return;

      setGameState(normalizeProgressState(event.detail.state));
      setSelectedUtility(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(true);
    };

    window.addEventListener('cob-state', handleState);
    window.addEventListener('cob-sync-ui', handleSync);
    window.addEventListener('cob-cave-cleared', handleCaveCleared);
    window.addEventListener('cob-player-dead', handlePlayerDead);
    window.addEventListener('cob-exit-decision', handleExitDecision);

    if (!gameRef.current && containerRef.current) {
      gameRef.current = createGame(containerRef.current, {
        getPersistentState: () => ({ ...stateRef.current, purchased: [] }),
        syncUI: (payload) => {
          window.dispatchEvent(new CustomEvent('cob-sync-ui', { detail: payload }));
        }
      });
    }

    return () => {
      window.removeEventListener('cob-state', handleState);
      window.removeEventListener('cob-sync-ui', handleSync);
      window.removeEventListener('cob-cave-cleared', handleCaveCleared);
      window.removeEventListener('cob-player-dead', handlePlayerDead);
      window.removeEventListener('cob-exit-decision', handleExitDecision);

      entryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      entryTimeoutRef.current = [];

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameState.inLobby) {
      setSelectedUtility(null);
      setShowExitDecision(false);
      return;
    }

    if (selectedUtility && (gameState.utilities?.[selectedUtility] ?? 0) <= 0) {
      setSelectedUtility(null);
    }
  }, [gameState.inLobby, gameState.utilities, selectedUtility]);

  useEffect(() => {
    if (entryPhase !== ENTRY_PHASE.PLAYING) return;
    if (!gameRef.current || !containerRef.current) return;

    const forceViewportSync = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      if (width > 0 && height > 0) {
        gameRef.current.scale.resize(width, height);
      }

      window.dispatchEvent(new CustomEvent('cob-force-resize'));
    };

    const timers = [0, 120, 320, 620].map((delay) => window.setTimeout(forceViewportSync, delay));

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [entryPhase]);

  const startEntrySequence = () => {
    if (showRotateLock) return;

    tryLockLandscape();

    entryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    entryTimeoutRef.current = [];

    setShowSettings(false);
    setShowInfoModal(false);
    setEntryPhase(ENTRY_PHASE.BLACK);

    const logoTimeout = window.setTimeout(() => {
      setEntryPhase(ENTRY_PHASE.LOGO);
    }, BLACK_SCREEN_MS);

    const playTimeout = window.setTimeout(() => {
      setEntryPhase(ENTRY_PHASE.PLAYING);
    }, BLACK_SCREEN_MS + LOGO_FADE_MS);

    entryTimeoutRef.current.push(logoTimeout, playTimeout);
  };

  const syncLocalState = (nextState) => {
    stateRef.current = nextState;
    setGameState(nextState);
  };

  const buildBiomeStartState = (targetCave, customMessage = null) => {
    const baseState = stateRef.current;
    const biome = getBiomeForCave(targetCave);
    const progress = getBiomeProgress(targetCave);

    return normalizeProgressState({
      ...initialState,
      cave: targetCave,
      biomeId: biome.id,
      biomeName: biome.name,
      coins: baseState.coins ?? 0,
      utilities: {
        ...createUtilityInventory(),
        ...(baseState.utilities ?? {})
      },
      collection: baseState.collection ?? createCollectionState(),
      stats: baseState.stats ?? createStatsState(),
      bestCave: Math.max(baseState.bestCave ?? 1, baseState.cave ?? 1),
      lastRelicFound: baseState.lastRelicFound ?? null,
      lastMessage: customMessage ?? `Você entrou na Cave ${progress.label} de ${biome.name}.`
    });
  };

  const finalizeCaveEntry = (nextState, { playIntro = false } = {}) => {
    syncLocalState(nextState);
    window.dispatchEvent(
      new CustomEvent('cob-enter-cave', {
        detail: nextState
      })
    );

    if (playIntro) {
      startEntrySequence();
      return;
    }

    setEntryPhase(ENTRY_PHASE.PLAYING);
  };

  const openBiomeSelection = ({ context = 'menu', biomeId = null, pendingState = null } = {}) => {
    const fallbackCave = pendingState?.cave ?? stateRef.current.cave ?? 1;
    const resolvedBiome = BIOMES.find((biome) => biome.id === biomeId) ?? getBiomeForCave(fallbackCave);

    setSelectedBiomeId(resolvedBiome.id);
    setPendingBiomeState(pendingState);
    setBiomeSelectContext(context);
    setShowBiomeSelect(true);
    setShowSettings(false);
    setShowInfoModal(false);
    setShowUtilityShopModal(false);
  };

  const closeBiomeSelection = () => {
    setShowBiomeSelect(false);
    setPendingBiomeState(null);
  };

  const maybeOpenBiomeSelection = (nextState, context = 'transition') => {
    if (!isBiomeStartCave(nextState.cave)) return false;

    openBiomeSelection({
      context,
      biomeId: getBiomeForCave(nextState.cave).id,
      pendingState: nextState
    });

    return true;
  };

  const confirmBiomeSelection = () => {
    const selectedBiome = BIOMES.find((biome) => biome.id === selectedBiomeId) ?? firstBiome;

    if (biomeSelectContext === 'menu') {
      const nextState = buildBiomeStartState(
        selectedBiome.startCave,
        `Você entrou na Cave ${getBiomeProgress(selectedBiome.startCave).label} de ${selectedBiome.name}.`
      );

      closeBiomeSelection();
      finalizeCaveEntry(nextState, { playIntro: true });
      return;
    }

    const nextState = pendingBiomeState ?? buildBiomeStartState(selectedBiome.startCave);

    closeBiomeSelection();
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    finalizeCaveEntry(nextState);
  };

  const rerollRewards = () => {
    const baseState = stateRef.current;

    if (!baseState.inLobby || baseState.lobbyReason === 'death') return;
    if (rewardOptions.length === 0) return;
    if (baseState.coins < rewardRefreshCost) return;

    const catalog = buildRewardCatalog(baseState);

    if (catalog.length === 0) return;

    const currentSignature = rewardOptions
      .map((item) => item.id)
      .sort()
      .join('|');

    let nextOptions = rewardOptions;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = shuffle(catalog).slice(0, 3);
      const candidateSignature = candidate
        .map((item) => item.id)
        .sort()
        .join('|');

      nextOptions = candidate;

      if (candidateSignature !== currentSignature) {
        break;
      }
    }

    const nextState = normalizeProgressState({
      ...baseState,
      coins: baseState.coins - rewardRefreshCost,
      lastMessage: `Melhorias renovadas por ${rewardRefreshCost} moedas.`
    });

    syncLocalState(nextState);
    setSelectedRewardId(null);
    setRewardOptions(nextOptions);
    setRewardRefreshCost((currentCost) => currentCost * 2);
  };

  const buyUtility = (utility) => {
    const baseState = stateRef.current;

    if (!baseState.inLobby) return;
    if (baseState.coins < utility.cost) return;

    const nextState = normalizeProgressState({
      ...baseState,
      coins: baseState.coins - utility.cost,
      utilities: {
        ...createUtilityInventory(),
        ...baseState.utilities,
        [utility.id]: (baseState.utilities?.[utility.id] ?? 0) + 1
      },
      lastMessage: `${utility.name} adicionada à mochila da run.`
    });

    syncLocalState(nextState);

    window.dispatchEvent(
      new CustomEvent('cob-buy-utility', {
        detail: {
          state: nextState,
          purchased: []
        }
      })
    );
  };

  const sellUtility = (utility) => {
    const baseState = stateRef.current;
    const owned = baseState.utilities?.[utility.id] ?? 0;
    const resaleValue = Math.max(1, Math.floor(utility.cost / 2));

    if (!baseState.inLobby) return;
    if (owned <= 0) return;

    const nextState = normalizeProgressState({
      ...baseState,
      coins: baseState.coins + resaleValue,
      utilities: {
        ...createUtilityInventory(),
        ...baseState.utilities,
        [utility.id]: Math.max(0, owned - 1)
      },
      lastMessage: `${utility.name} vendida por ${resaleValue} moedas.`
    });

    syncLocalState(nextState);
  };

  const useUtility = (utilityId) => {
    if (gameState.inLobby) return;
    if ((gameState.utilities?.[utilityId] ?? 0) <= 0) return;

    window.dispatchEvent(
      new CustomEvent('cob-use-utility', {
        detail: { type: utilityId }
      })
    );

    setSelectedUtility(null);
  };

  const continueExploringCurrentCave = () => {
    setShowExitDecision(false);
  };

  const chooseNextCaveFromExit = () => {
    const baseState = stateRef.current;

    setShowExitDecision(false);

    window.dispatchEvent(
      new CustomEvent('cob-open-exit-lobby', {
        detail: {
          nextCave: baseState.nextCaveAvailable ?? baseState.cave + 1,
          message: `Você decidiu seguir para a próxima cave.`
        }
      })
    );
  };

  const continueToNextCave = () => {
    const baseState = stateRef.current;
    const reward = rewardOptions.find((item) => item.id === selectedRewardId);
    const targetCave = baseState.nextCaveAvailable ?? baseState.cave + 1;
    const progressedState = reward ? reward.apply(baseState) : baseState;
    const nextBiome = getBiomeForCave(targetCave);

    const nextState = normalizeProgressState({
      ...progressedState,
      screen: 'cave',
      cave: targetCave,
      biomeId: nextBiome.id,
      biomeName: nextBiome.name,
      hp: progressedState.maxHp,
      bombs: 0,
      inLobby: false,
      lobbyReason: null,
      nextCaveAvailable: null,
      outcomeCave: null,
      lastMessage: reward
        ? `${reward.name} escolhida. Vida restaurada. Você entrou na Cave ${getBiomeProgress(targetCave).label} de ${nextBiome.name}.`
        : `Você entrou na Cave ${getBiomeProgress(targetCave).label} de ${nextBiome.name}. Vida restaurada.`
    });

    if (maybeOpenBiomeSelection(nextState, 'transition')) {
      return;
    }

    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    finalizeCaveEntry(nextState);
  };

  const buildResetState = (targetCave = null, customMessage = null) => {
    const baseState = stateRef.current;
    const biomeStartCave = targetCave ?? getBiomeStartCave(baseState.cave ?? 1);
    const biome = getBiomeForCave(biomeStartCave);

    return normalizeProgressState({
      ...initialState,
      cave: biomeStartCave,
      biomeId: biome.id,
      biomeName: biome.name,
      coins: baseState.coins ?? 0,
      utilities: {
        ...createUtilityInventory(),
        ...(baseState.utilities ?? {})
      },
      collection: baseState.collection ?? createCollectionState(),
      stats: baseState.stats ?? createStatsState(),
      bestCave: Math.max(baseState.bestCave ?? 1, baseState.cave ?? 1),
      lastRelicFound: baseState.lastRelicFound ?? null,
      lastMessage:
        customMessage ??
        'Você foi derrotado. As melhorias voltaram ao início do bioma atual, mas suas moedas, objetivos e relíquias foram mantidos.'
    });
  };

  const retryRun = () => {
    const nextState = buildResetState();

    setSelectedUtility(null);
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);

    if (maybeOpenBiomeSelection(nextState, 'transition')) {
      return;
    }

    finalizeCaveEntry(nextState);
  };

  const backToMainMenu = () => {
    const nextState = buildResetState();

    syncLocalState(nextState);
    setSelectedUtility(null);
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    setEntryPhase(ENTRY_PHASE.MENU);

    window.dispatchEvent(
      new CustomEvent('cob-restart-run', {
        detail: {
          ...nextState,
          purchased: []
        }
      })
    );
  };

  const showLobby = entryPhase === ENTRY_PHASE.PLAYING && gameState.inLobby;
  const showGameHud = entryPhase === ENTRY_PHASE.PLAYING && !showLobby;
  const isDeathLobby = gameState.lobbyReason === 'death';
  const resolvedOutcomeCave = gameState.outcomeCave ?? gameState.cave;
  const nextCaveNumber = gameState.nextCaveAvailable ?? gameState.cave + 1;
  const noRewardsLeft = rewardOptions.length === 0;

  const showMenu = entryPhase === ENTRY_PHASE.MENU && !showRotateLock;
  const showRotateGate = entryPhase === ENTRY_PHASE.MENU && showRotateLock;
  const showRotateDuringPlay = entryPhase === ENTRY_PHASE.PLAYING && showRotateLock;

  const currentObjectives = getObjectiveProgressList(gameState);
  const unlockedBiomes = getUnlockedBiomes(gameState.bestCave ?? 1);
  const unlockedBiomeIds = new Set(unlockedBiomes.map((biome) => biome.id));
  const relicEntries = Object.values(RELIC_CATALOG);
  const totalRelics = getTotalRelics(gameState.collection);
  const activeProgress = getBiomeProgress(gameState.cave);
  const activeBiome = activeProgress.biome;
  const currentLocalCave = activeProgress.localCave;
  const currentBiomeTotal = activeProgress.totalCaves;
  const nextProgress = getBiomeProgress(nextCaveNumber);
  const pendingBiome = pendingBiomeState ? getBiomeForCave(pendingBiomeState.cave) : null;

  return (
    <div className="app-shell">
      <main className="game-area">
        <div ref={containerRef} className="game-container" />

        {showGameHud && (
          <>
            <div className="top-hud">
              <div className="hud-pill">
                <span>Cave Atual</span>
                <strong>{activeProgress.label}</strong>
              </div>

              <div className="hud-pill">
                <span>Bioma</span>
                <strong>{activeBiome.name}</strong>
              </div>

              <div className="hud-pill">
                <span>Moedas</span>
                <strong>{gameState.coins}</strong>
              </div>

              <div className="hud-pill">
                <span>Vida</span>
                <strong>
                  {gameState.hp}/{gameState.maxHp}
                </strong>
              </div>

              <div className="hud-pill">
                <span>Relíquias</span>
                <strong>{totalRelics}</strong>
              </div>
            </div>

            <div className="utility-bar-wrap">
              <div className="utility-bar">
                {utilityCatalog.map((utility) => {
                  const count = gameState.utilities?.[utility.id] ?? 0;
                  const isSelected = selectedUtility === utility.id;

                  return (
                    <div key={utility.id} className={`utility-slot ${isSelected ? 'selected' : ''}`}>
                      <button
                        className="utility-icon-btn"
                        type="button"
                        onClick={() => setSelectedUtility(isSelected ? null : utility.id)}
                        disabled={count <= 0}
                        title={`${utility.name} · ${count}`}
                      >
                        <span className="utility-icon">{utility.icon}</span>
                        <span className="utility-count">x{count}</span>
                      </button>

                      <span className="utility-label">{utility.shortName}</span>

                      {isSelected && count > 0 && (
                        <button className="utility-use-btn" type="button" onClick={() => useUtility(utility.id)}>
                          Usar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {showExitDecision && showGameHud && !showLobby && (
          <div className="exit-decision-overlay">
            <div className="exit-decision-modal">
              <div className="result-badge win">SAÍDA ENCONTRADA</div>

              <h2>O que deseja fazer?</h2>
              <p>{gameState.lastMessage}</p>

              <div className="exit-decision-actions">
                <button className="primary-btn next-cave-btn" type="button" onClick={chooseNextCaveFromExit}>
                  Próxima cave
                </button>

                <button className="ghost-btn utility-lobby-btn" type="button" onClick={continueExploringCurrentCave}>
                  Continuar na cave atual
                </button>
              </div>
            </div>
          </div>
        )}

        {showLobby && (
          <div className="lobby-overlay">
            <div className="lobby-modal lobby-modal-modern">
              <div className={`result-hero ${isDeathLobby ? 'death' : 'win'}`}>
                <div className={`result-badge ${isDeathLobby ? 'death' : 'win'}`}>
                  {isDeathLobby ? 'DERROTA' : 'VITÓRIA'}
                </div>

                <h1>{isDeathLobby ? 'Você foi derrotado' : `Cave ${getBiomeProgress(resolvedOutcomeCave).label} concluída`}</h1>

                <p className="result-hero-message">{gameState.lastMessage}</p>

                <div className="hero-inline-summary">
                  <div className="hero-inline-item">
                    <span>🪙</span>
                    <div className="hero-inline-copy">
                      <strong>{gameState.coins}</strong>
                      <small>Moedas</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>❤️</span>
                    <div className="hero-inline-copy">
                      <strong>
                        {gameState.hp}/{gameState.maxHp}
                      </strong>
                      <small>Vida</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>⛏️</span>
                    <div className="hero-inline-copy">
                      <strong>Nv. {gameState.pickaxeLevel}</strong>
                      <small>Picareta</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>🗺️</span>
                    <div className="hero-inline-copy">
                      <strong>{getBiomeProgress(resolvedOutcomeCave).label}</strong>
                      <small>Cave</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>⬇️</span>
                    <div className="hero-inline-copy">
                      <strong>{isDeathLobby ? `1/${currentBiomeTotal}` : nextProgress.label}</strong>
                      <small>Próxima</small>
                    </div>
                  </div>
                </div>
              </div>

              {!isDeathLobby && (
                <>
                  <div className="lobby-section-card">
                    <div className="section-title-wrap section-title-wrap-inline">
                      <div>
                        <h2>Escolha sua melhoria</h2>
                        <p>Escolha 1 melhoria para a próxima cave.</p>
                      </div>

                      <button
                        className="reward-reroll-btn"
                        type="button"
                        onClick={rerollRewards}
                        disabled={noRewardsLeft || gameState.coins < rewardRefreshCost}
                      >
                        {gameState.coins >= rewardRefreshCost ? `Trocar · ${rewardRefreshCost}` : `Faltam ${rewardRefreshCost - gameState.coins}`}
                      </button>
                    </div>

                    {noRewardsLeft ? (
                      <p className="empty-text">
                        Todas as trilhas de melhoria já chegaram ao máximo nesta run.
                      </p>
                    ) : (
                      <div className="reward-line-grid">
                        {rewardOptions.map((reward) => {
                          const isSelected = selectedRewardId === reward.id;
                          const visual = getRewardVisual(reward.track);

                          return (
                            <button
                              key={reward.id}
                              type="button"
                              className={`reward-line-card ${visual.accent} ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedRewardId(reward.id)}
                            >
                              <div className="reward-icon-badge">{visual.icon}</div>
                              <strong>{reward.name}</strong>
                              <p>{reward.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="lobby-bottom-actions">
                    <button
                      className="primary-btn next-cave-btn"
                      type="button"
                      onClick={continueToNextCave}
                      disabled={!noRewardsLeft && !selectedRewardId}
                    >
                      Próxima cave
                    </button>

                    <button
                      className="ghost-btn utility-lobby-btn"
                      type="button"
                      onClick={() => setShowUtilityShopModal(true)}
                    >
                      Loja utilitários
                    </button>

                    <button
                      className="ghost-btn utility-lobby-btn"
                      type="button"
                      onClick={() => setShowInfoModal(true)}
                    >
                      Informações
                    </button>
                  </div>
                </>
              )}

              {isDeathLobby && (
                <div className="lobby-bottom-actions">
                  <button className="primary-btn next-cave-btn" type="button" onClick={retryRun}>
                    Tentar novamente
                  </button>

                  <button className="ghost-btn utility-lobby-btn" type="button" onClick={backToMainMenu}>
                    Menu principal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showLobby && showUtilityShopModal && !isDeathLobby && (
          <div className="utility-shop-modal-overlay" onClick={() => setShowUtilityShopModal(false)}>
            <div className="utility-shop-modal" onClick={(event) => event.stopPropagation()}>
              <div className="utility-shop-modal-header">
                <div>
                  <h2>Loja de utilitários</h2>
                  <p>Compre consumíveis para usar durante a próxima exploração.</p>
                </div>

                <button
                  className="utility-shop-close-btn"
                  type="button"
                  onClick={() => setShowUtilityShopModal(false)}
                >
                  Fechar
                </button>
              </div>

              <div className="utility-shop-line">
                {utilityCatalog.map((utility) => {
                  const canBuy = gameState.coins >= utility.cost;
                  const owned = gameState.utilities?.[utility.id] ?? 0;

                  return (
                    <div key={utility.id} className="utility-shop-pill">
                      <div className="utility-shop-pill-top">
                        <span className="utility-shop-pill-icon">{utility.icon}</span>
                        <div className="utility-shop-pill-text">
                          <strong>{utility.name}</strong>
                          <small>Na mochila: {owned}</small>
                        </div>
                      </div>

                      <p>{utility.description}</p>

                      <div className="shop-action-row">
                        <button
                          className="shop-buy-btn"
                          type="button"
                          onClick={() => buyUtility(utility)}
                          disabled={!canBuy}
                        >
                          {canBuy ? `Comprar · ${utility.cost}` : `Faltam ${utility.cost - gameState.coins}`}
                        </button>

                        <button
                          className="shop-sell-btn"
                          type="button"
                          onClick={() => sellUtility(utility)}
                          disabled={owned <= 0}
                        >
                          {owned > 0 ? `Vender · ${Math.max(1, Math.floor(utility.cost / 2))}` : 'Sem itens'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {showMenu && (
          <div className="entry-overlay menu-overlay">
            <div className="menu-panel">
              <div className="menu-brand-wrap">
                <span className="menu-kicker">ArchangelSoft apresenta</span>
                <h1>Coins or Bombs</h1>
                <p>Explore 20 caves por bioma, desbloqueie novos ambientes e acompanhe sua coleção pelo botão Informações.</p>
              </div>

              <div className="menu-actions">
                <button
                  className="menu-primary-btn"
                  type="button"
                  onClick={() => openBiomeSelection({ context: 'menu', biomeId: activeBiome.id })}
                >
                  Entrar
                </button>
                <button className="menu-secondary-btn" type="button" onClick={() => setShowSettings(true)}>
                  Configurações
                </button>
                <button className="menu-secondary-btn" type="button" onClick={() => setShowInfoModal(true)}>
                  Informações
                </button>
              </div>
            </div>
          </div>
        )}

        {entryPhase === ENTRY_PHASE.BLACK && <div className="entry-overlay intro-black-screen" />}

        {entryPhase === ENTRY_PHASE.LOGO && (
          <div className="entry-overlay splash-overlay">
            <img
              src="/assets/archangelsoft_splash.png"
              alt="ArchangelSoft"
              className="archangelsoft-splash"
            />
          </div>
        )}

        {showBiomeSelect && (
          <div className="menu-settings-backdrop biome-select-backdrop" onClick={closeBiomeSelection}>
            <div className="menu-settings-modal biome-select-modal" onClick={(event) => event.stopPropagation()}>
              <div className="menu-info-head biome-select-head">
                <div>
                  <h2>{biomeSelectContext === 'menu' ? 'Selecione um bioma' : 'Próximo bioma'}</h2>
                  <p>
                    {biomeSelectContext === 'menu'
                      ? 'Escolha em qual bioma deseja iniciar sua exploração.'
                      : `Confirme o ambiente para entrar na Cave ${pendingBiome ? getBiomeProgress(pendingBiome.startCave).label : '1/20'}.`}
                  </p>
                </div>

                <span className="biome-select-subtle">Melhor cave {gameState.bestCave}</span>
              </div>

              <div className="biome-select-grid">
                {BIOMES.map((biome) => {
                  const unlocked = unlockedBiomeIds.has(biome.id);
                  const completed = isBiomeCompleted(biome, gameState.bestCave ?? 1);
                  const selected = selectedBiomeId === biome.id;
                  const selectable = biomeSelectContext === 'menu' ? unlocked : pendingBiome?.id === biome.id;
                  const statusLabel = !unlocked ? 'Bloqueado' : completed ? 'Concluído' : selectable ? 'Disponível' : 'Visitado';

                  return (
                    <button
                      key={biome.id}
                      type="button"
                      className={`biome-card ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''} ${selected ? 'selected' : ''}`}
                      style={{ '--biome-accent': getBiomeAccentColor(biome.id) }}
                      onClick={() => selectable && setSelectedBiomeId(biome.id)}
                      disabled={!selectable}
                    >
                      <div className="biome-card-top">
                        <strong>{biome.name}</strong>
                        <span className="biome-status-badge">{statusLabel}</span>
                      </div>

                      <span className="biome-card-range">{biome.rangeLabel}</span>
                      <p>{biome.id === activeBiome.id ? 'Bioma atual da sua run.' : 'Ambiente disponível para exploração.'}</p>
                    </button>
                  );
                })}
              </div>

              <div className="biome-select-actions">
                <button className="menu-primary-btn compact" type="button" onClick={confirmBiomeSelection}>
                  {biomeSelectContext === 'menu' ? 'Começar neste bioma' : 'Entrar no bioma'}
                </button>

                <button className="menu-secondary-btn compact" type="button" onClick={closeBiomeSelection}>
                  {biomeSelectContext === 'menu' ? 'Fechar' : 'Voltar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettings && showMenu && (
          <div className="menu-settings-backdrop" onClick={() => setShowSettings(false)}>
            <div className="menu-settings-modal" onClick={(event) => event.stopPropagation()}>
              <h2>Configurações</h2>

              <div className="settings-line">
                <span>Animação de entrada</span>
                <strong>Ativada</strong>
              </div>

              <div className="settings-line">
                <span>Orientação ideal</span>
                <strong>Paisagem</strong>
              </div>

              <div className="settings-line">
                <span>Meta atual</span>
                <strong>{activeBiome.name}</strong>
              </div>

              <button className="menu-primary-btn compact" type="button" onClick={() => setShowSettings(false)}>
                Fechar
              </button>
            </div>
          </div>
        )}


        {showInfoModal && (
          <div className="menu-settings-backdrop" onClick={() => setShowInfoModal(false)}>
            <div className="menu-settings-modal info-modal" onClick={(event) => event.stopPropagation()}>
              <h2>Informações da Progressão</h2>

              <section className="menu-info-card">
                <div className="menu-info-head">
                  <h2>Biomas desbloqueados</h2>
                  <span>Melhor cave {gameState.bestCave}</span>
                </div>

                <div className="menu-chip-row">
                  {unlockedBiomes.map((biome) => (
                    <span key={biome.id} className="menu-chip">
                      {biome.name}
                    </span>
                  ))}
                </div>

                <div className="menu-summary-grid">
                  <div>
                    <span>Bioma atual</span>
                    <strong>{activeBiome.name}</strong>
                  </div>
                  <div>
                    <span>Cave atual</span>
                    <strong>{activeProgress.label}</strong>
                  </div>
                </div>
              </section>

              <section className="menu-info-card">
                <div className="menu-info-head">
                  <h2>Objetivos</h2>
                  <span>{currentObjectives.filter((item) => item.completed).length}/{currentObjectives.length}</span>
                </div>

                <div className="objective-list compact">
                  {currentObjectives.map((objective) => (
                    <div key={objective.id} className={`objective-card ${objective.completed ? 'completed' : ''}`}>
                      <div className="objective-card-head">
                        <strong>{objective.label}</strong>
                        <span>
                          {Math.min(objective.value, objective.target)}/{objective.target}
                        </span>
                      </div>
                      <p>{objective.description}</p>
                      <div className="objective-progress-bar">
                        <span style={{ width: `${objective.progress * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="menu-info-card">
                <div className="menu-info-head">
                  <h2>Relíquias</h2>
                  <span>Total {totalRelics}</span>
                </div>

                <div className="relic-grid compact">
                  {relicEntries.map((relic) => (
                    <div key={relic.id} className={`relic-card ${(gameState.collection?.[relic.id] ?? 0) > 0 ? 'owned' : ''}`}>
                      <span className="relic-icon">{relic.icon}</span>
                      <strong>{relic.name}</strong>
                      <small>{relic.description}</small>
                      <span className="relic-count">x{gameState.collection?.[relic.id] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </section>

              <button className="menu-primary-btn compact" type="button" onClick={() => setShowInfoModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        )}

        {entryPhase === ENTRY_PHASE.PLAYING && !showRotateLock && (
          <div className="rotate-device-hint">
            Gire o celular para jogar melhor em modo paisagem.
          </div>
        )}

        {showRotateGate && (
          <div className="rotate-lock-overlay">
            <div className="rotate-lock-card">
              <div className="rotate-lock-icon">📱</div>
              <h2>Gire o celular</h2>
              <p>Use o dispositivo no modo paisagem para liberar o menu.</p>
            </div>
          </div>
        )}

        {showRotateDuringPlay && (
          <div className="rotate-lock-overlay">
            <div className="rotate-lock-card">
              <div className="rotate-lock-icon">📱</div>
              <h2>Gire o celular</h2>
              <p>Para continuar jogando, use o dispositivo no modo paisagem.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
