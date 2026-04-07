export const BIOMES = [
  {
    id: 'sunstone',
    name: 'Mina Solar',
    unlockCave: 1,
    startCave: 1,
    endCave: 25,
    rangeLabel: 'Caves 1-25',
    backgroundKey: 'cave_bg_sunstone',
    relicId: 'amber_fang',
    relicChance: 0.12,
    coinMultiplier: 1,
    bombMultiplier: 1,
    primaryDeco: 'deco_gold_pile',
    palette: {
      background: '#14181f',
      overlay: 0xd99845,
      dust: 0xf5cd8a,
      rockTints: [0x3b2b1f, 0x442f20, 0x2c1f16],
      edge: 0x24160f,
      entrance: 0x71bfff,
      exit: 0x78ffb6,
      highlight: 0xffc26b
    }
  },
  {
    id: 'frost',
    name: 'Gruta de Gelo',
    unlockCave: 26,
    startCave: 26,
    endCave: 50,
    rangeLabel: 'Caves 26-50',
    backgroundKey: 'cave_bg_frost',
    relicId: 'frost_bloom',
    relicChance: 0.14,
    coinMultiplier: 0.94,
    bombMultiplier: 1.04,
    primaryDeco: 'deco_ice_spike',
    palette: {
      background: '#111a27',
      overlay: 0x73bdf2,
      dust: 0xd7f0ff,
      rockTints: [0x1f3344, 0x29475c, 0x183041],
      edge: 0x0f2230,
      entrance: 0x9bd9ff,
      exit: 0xb6ffef,
      highlight: 0x8fd8ff
    }
  },
  {
    id: 'ember',
    name: 'Profundezas Rubras',
    unlockCave: 51,
    startCave: 51,
    endCave: 75,
    rangeLabel: 'Caves 51-75',
    backgroundKey: 'cave_bg_ember',
    relicId: 'ember_core',
    relicChance: 0.16,
    coinMultiplier: 1.02,
    bombMultiplier: 1.08,
    primaryDeco: 'deco_lava_vent',
    palette: {
      background: '#201414',
      overlay: 0xe46845,
      dust: 0xffc0b1,
      rockTints: [0x4b221d, 0x5b2a24, 0x341814],
      edge: 0x2a120f,
      entrance: 0xffc283,
      exit: 0xff9878,
      highlight: 0xff926b
    }
  },
  {
    id: 'ruins',
    name: 'Ruínas Abissais',
    unlockCave: 76,
    startCave: 76,
    endCave: 100,
    rangeLabel: 'Caves 76-100',
    backgroundKey: 'cave_bg_ruins',
    relicId: 'ruin_tablet',
    relicChance: 0.18,
    coinMultiplier: 0.96,
    bombMultiplier: 1.12,
    primaryDeco: 'deco_ruin_pillar',
    palette: {
      background: '#181422',
      overlay: 0x987bff,
      dust: 0xe1d2ff,
      rockTints: [0x2d223c, 0x3c2c51, 0x241a31],
      edge: 0x171021,
      entrance: 0xbcb2ff,
      exit: 0xc6ffd6,
      highlight: 0xb99cff
    }
  }
];

export const RELIC_CATALOG = {
  amber_fang: {
    id: 'amber_fang',
    icon: '🦴',
    name: 'Presa Âmbar',
    biomeId: 'sunstone',
    description: 'Fragmento fóssil perdido na Mina Solar.'
  },
  frost_bloom: {
    id: 'frost_bloom',
    icon: '❄️',
    name: 'Flor de Gelo',
    biomeId: 'frost',
    description: 'Cristal orgânico raro das cavernas congeladas.'
  },
  ember_core: {
    id: 'ember_core',
    icon: '🔥',
    name: 'Núcleo Incandescente',
    biomeId: 'ember',
    description: 'Rocha viva aquecida no coração das profundezas.'
  },
  ruin_tablet: {
    id: 'ruin_tablet',
    icon: '📜',
    name: 'Placa das Ruínas',
    biomeId: 'ruins',
    description: 'Inscrição ancestral trazida das Ruínas Abissais.'
  }
};

export const OBJECTIVE_CATALOG = [
  {
    id: 'rocks',
    label: 'Britador',
    description: 'Quebre 40 rochas no total.',
    target: 40,
    statKey: 'totalRocksBroken'
  },
  {
    id: 'coins',
    label: 'Garimpeiro',
    description: 'Colete 80 moedas no total.',
    target: 80,
    statKey: 'totalCoinsCollected'
  },
  {
    id: 'caves',
    label: 'Explorador',
    description: 'Conclua 8 caves.',
    target: 8,
    statKey: 'totalCavesCleared'
  },
  {
    id: 'relics',
    label: 'Curador',
    description: 'Encontre 4 relíquias.',
    target: 4,
    statKey: 'totalRelicsFound'
  }
];

export function createStatsState() {
  return {
    totalRocksBroken: 0,
    totalCoinsCollected: 0,
    totalCavesCleared: 0,
    totalRelicsFound: 0
  };
}

export function createCollectionState() {
  return Object.values(RELIC_CATALOG).reduce((acc, relic) => {
    acc[relic.id] = 0;
    return acc;
  }, {});
}

export function getBiomeForCave(cave = 1) {
  return BIOMES.find((biome) => cave >= biome.startCave && cave <= biome.endCave) ?? BIOMES[BIOMES.length - 1];
}

export function getBiomeStartCave(cave = 1) {
  return getBiomeForCave(cave).startCave;
}

export function getBiomeProgress(cave = 1) {
  const biome = getBiomeForCave(cave);
  const total = biome.endCave - biome.startCave + 1;
  const localCave = Math.max(1, Math.min(total, cave - biome.startCave + 1));

  return {
    biome,
    localCave,
    totalCaves: total,
    label: `${localCave}/${total}`
  };
}

export function getUnlockedBiomes(bestCave = 1) {
  return BIOMES.filter((biome) => bestCave >= biome.unlockCave);
}

export function getRelicById(relicId) {
  return RELIC_CATALOG[relicId] ?? null;
}

export function createRelicContent(relicId) {
  return {
    kind: 'relic',
    relicId
  };
}

export function isRelicContent(content) {
  return Boolean(content && typeof content === 'object' && content.kind === 'relic' && content.relicId);
}

export function getObjectiveProgressList(state) {
  const stats = {
    ...createStatsState(),
    ...(state?.stats ?? {})
  };

  return OBJECTIVE_CATALOG.map((objective) => {
    const value = stats[objective.statKey] ?? 0;
    const progress = Math.min(1, value / objective.target);

    return {
      ...objective,
      value,
      progress,
      completed: value >= objective.target
    };
  });
}

export function getTotalRelics(collection = {}) {
  return Object.values({ ...createCollectionState(), ...collection }).reduce((sum, amount) => sum + amount, 0);
}
