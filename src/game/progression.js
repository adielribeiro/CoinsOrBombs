/**
 * Biomas, em ordem de progressão.
 *
 * Cada bioma tem 10 caves, e a próxima faixa começa na cave seguinte:
 * 1-10, 11-20, 21-30, 31-40, 41-50, 51-60. O total de 60 caiu dos 80
 * anteriores porque as faixas encolheram de 20 para 10.
 *
 * `unlockCave` é a cave que precisa ser CONCLUÍDA para liberar o bioma, então
 * o segundo bioma abre ao terminar a 10, o terceiro ao terminar a 20, e assim
 * por diante.
 *
 * `nameKey` e `rangeKey` são a CHAVE de tradução, e `name`/`rangeLabel` são o
 * texto em português. A chave é o que a tela usa; o português fica como
 * referência para quem lê o código e para o teste, que compara a chave com o
 * dicionário. O nome não é resolvido aqui de propósito: esta lista é montada uma
 * vez no carregamento do módulo, e resolver o texto nela congelaria o idioma de
 * quem abriu o jogo.
 */
export const BIOMES = [
  {
    id: 'sunstone',
    name: 'Mina Solar',
    nameKey: 'biome.sunstone.name',
    unlockCave: 1,
    startCave: 1,
    endCave: 10,
    rangeLabel: 'Caves 1-10',
    rangeKey: 'biome.sunstone.range',
    backgroundKey: 'cave_bg_sunstone',
    relicId: 'amber_fang',
    relicChance: 0.12,
    coinMultiplier: 1,
    bombMultiplier: 1,
    palette: {
      background: '#14181f',
      overlay: 0xd99845,
      dust: 0xf5cd8a,
      rockTints: [0x3b2b1f, 0x442f20, 0x2c1f16],
      edge: 0x24160f,
      // A cor do chão mora no atlas de cada bioma (o tint do Phaser só
      // multiplica, então tingir um atlas marrom de azul daria lama escura).
      // Este valor é só o ajuste fino, e por isso é quase branco.
      ground: 0xfff6e8,
      entrance: 0x71bfff,
      exit: 0x78ffb6,
      rockHighlight: 0xffdcae,
      highlight: 0xffc26b
    }
  },
  {
    id: 'frost',
    name: 'Gruta de Gelo',
    nameKey: 'biome.frost.name',
    unlockCave: 10,
    startCave: 11,
    endCave: 20,
    rangeLabel: 'Caves 11-20',
    rangeKey: 'biome.frost.range',
    backgroundKey: 'cave_bg_frost',
    relicId: 'frost_bloom',
    relicChance: 0.14,
    coinMultiplier: 0.94,
    bombMultiplier: 1.04,
    palette: {
      background: '#111a27',
      overlay: 0x73bdf2,
      dust: 0xd7f0ff,
      rockTints: [0x1f3344, 0x29475c, 0x183041],
      edge: 0x0f2230,
      // Cor do chao. O atlas e uma superficie continua em cinza, entao um
      // unico atlas serve a todos os biomas: a cor entra como tint na camada
      // inteira. Tinta por celula reintroduziria a grade.
      ground: 0xf2f8ff,
      entrance: 0x9bd9ff,
      exit: 0xb6ffef,
      rockHighlight: 0xd7f0ff,
      highlight: 0x8fd8ff
    }
  },
  {
    id: 'ember',
    name: 'Profundezas Rubras',
    nameKey: 'biome.ember.name',
    unlockCave: 20,
    startCave: 21,
    endCave: 30,
    rangeLabel: 'Caves 21-30',
    rangeKey: 'biome.ember.range',
    backgroundKey: 'cave_bg_ember',
    relicId: 'ember_core',
    relicChance: 0.16,
    coinMultiplier: 1.02,
    bombMultiplier: 1.08,
    palette: {
      background: '#201414',
      overlay: 0xe46845,
      dust: 0xffc0b1,
      rockTints: [0x4b221d, 0x5b2a24, 0x341814],
      edge: 0x2a120f,
      // Cor do chao. O atlas e uma superficie continua em cinza, entao um
      // unico atlas serve a todos os biomas: a cor entra como tint na camada
      // inteira. Tinta por celula reintroduziria a grade.
      ground: 0xfff0e8,
      entrance: 0xffc283,
      exit: 0xff9878,
      rockHighlight: 0xffc0b1,
      highlight: 0xff926b
    }
  },
  {
    id: 'ruins',
    name: 'Ruínas Abissais',
    nameKey: 'biome.ruins.name',
    unlockCave: 30,
    startCave: 31,
    endCave: 40,
    rangeLabel: 'Caves 31-40',
    rangeKey: 'biome.ruins.range',
    backgroundKey: 'cave_bg_ruins',
    relicId: 'ruin_tablet',
    relicChance: 0.18,
    coinMultiplier: 0.96,
    bombMultiplier: 1.12,
    palette: {
      background: '#181422',
      overlay: 0x987bff,
      dust: 0xe1d2ff,
      rockTints: [0x2d223c, 0x3c2c51, 0x241a31],
      edge: 0x171021,
      // A cor do chão mora no atlas de cada bioma (o tint do Phaser só
      // multiplica, então tingir um atlas marrom de azul daria lama escura).
      // Este valor é só o ajuste fino, e por isso é quase branco.
      ground: 0xf6f0ff,
      entrance: 0xbcb2ff,
      exit: 0xc6ffd6,
      rockHighlight: 0xe1d2ff,
      highlight: 0xb99cff
    }
  },
  {
    id: 'wind',
    name: 'Galeria de Vento',
    nameKey: 'biome.wind.name',
    unlockCave: 40,
    startCave: 41,
    endCave: 50,
    rangeLabel: 'Caves 41-50',
    rangeKey: 'biome.wind.range',
    backgroundKey: 'cave_bg_wind',
    relicId: 'gust_shell',
    relicChance: 0.2,
    coinMultiplier: 1.12,
    bombMultiplier: 0.94,
    // Mais moedas e menos bombas: o vento espalha o minério e leva a
    // detonação para longe. É o bioma de respiração depois de três apertos.
    palette: {
      background: '#101a1c',
      overlay: 0x74d8e8,
      dust: 0xd6f4ff,
      rockTints: [0x24363c, 0x2f4650, 0x1b2930],
      edge: 0x0e1a1e,
      ground: 0xf0fbff,
      entrance: 0x8ef0ff,
      exit: 0xcaff9a,
      rockHighlight: 0xd6f4ff,
      highlight: 0x74d8e8
    }
  },
  {
    id: 'crystal',
    name: 'Câmara de Cristal',
    nameKey: 'biome.crystal.name',
    unlockCave: 50,
    startCave: 51,
    endCave: 60,
    rangeLabel: 'Caves 51-60',
    rangeKey: 'biome.crystal.range',
    backgroundKey: 'cave_bg_crystal',
    relicId: 'prism_core',
    relicChance: 0.24,
    coinMultiplier: 0.88,
    bombMultiplier: 1.2,
    // Menos moedas e muito mais bomba: o cristal reflete a detonação de volta
    // para dentro da cave. É o bioma final, e o mais caro.
    palette: {
      background: '#141a24',
      overlay: 0xa8f0ff,
      dust: 0xe8fbff,
      rockTints: [0x2a3348, 0x374259, 0x1f2736],
      edge: 0x121824,
      ground: 0xf4f8ff,
      entrance: 0xc0e8ff,
      exit: 0xa0ffd8,
      rockHighlight: 0xe8fbff,
      highlight: 0xa8f0ff
    }
  }
];

export const RELIC_CATALOG = {
  amber_fang: {
    id: 'amber_fang',
    icon: '🦴',
    name: 'Presa Âmbar',
    nameKey: 'relic.amber_fang.name',
    biomeId: 'sunstone',
    description: 'Fragmento fóssil perdido na Mina Solar.',
    descriptionKey: 'relic.amber_fang.description',
  },
  frost_bloom: {
    id: 'frost_bloom',
    icon: '❄️',
    name: 'Flor de Gelo',
    nameKey: 'relic.frost_bloom.name',
    biomeId: 'frost',
    description: 'Cristal orgânico raro das cavernas congeladas.',
    descriptionKey: 'relic.frost_bloom.description',
  },
  ember_core: {
    id: 'ember_core',
    icon: '🔥',
    name: 'Núcleo Incandescente',
    nameKey: 'relic.ember_core.name',
    biomeId: 'ember',
    description: 'Rocha viva aquecida no coração das profundezas.',
    descriptionKey: 'relic.ember_core.description',
  },
  ruin_tablet: {
    id: 'ruin_tablet',
    icon: '📜',
    name: 'Placa das Ruínas',
    nameKey: 'relic.ruin_tablet.name',
    biomeId: 'ruins',
    description: 'Inscrição ancestral trazida das Ruínas Abissais.',
    descriptionKey: 'relic.ruin_tablet.description',
  },
  gust_shell: {
    id: 'gust_shell',
    icon: '🐚',
    name: 'Concha de Rajada',
    nameKey: 'relic.gust_shell.name',
    biomeId: 'wind',
    description: 'Casco oco que canta quando o vento passa.',
    descriptionKey: 'relic.gust_shell.description',
  },
  prism_core: {
    id: 'prism_core',
    icon: '💎',
    name: 'Núcleo de Prisma',
    nameKey: 'relic.prism_core.name',
    biomeId: 'crystal',
    description: 'Coração da Câmara de Cristal.',
    descriptionKey: 'relic.prism_core.description',
  }
};

export const OBJECTIVE_CATALOG = [
  {
    id: 'rocks',
    label: 'Britador',
    labelKey: 'objective.rocks.label',
    description: 'Quebre 40 rochas no total.',
    descriptionKey: 'objective.rocks.description',
    target: 40,
    statKey: 'totalRocksBroken'
  },
  {
    id: 'coins',
    label: 'Garimpeiro',
    labelKey: 'objective.coins.label',
    description: 'Colete 80 moedas no total.',
    descriptionKey: 'objective.coins.description',
    target: 80,
    statKey: 'totalCoinsCollected'
  },
  {
    id: 'caves',
    label: 'Explorador',
    labelKey: 'objective.caves.label',
    description: 'Conclua 8 caves.',
    descriptionKey: 'objective.caves.description',
    target: 8,
    statKey: 'totalCavesCleared'
  },
  {
    id: 'relics',
    label: 'Curador',
    labelKey: 'objective.relics.label',
    description: 'Encontre 4 relíquias.',
    descriptionKey: 'objective.relics.description',
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

/**
 * As melhorias, zeradas.
 *
 * Estavam dentro do `App.jsx`, e foram para aqui pelo mesmo motivo de
 * `createUtilityInventory`: os jogos salvos precisam saber quais são. Uma melhoria
 * conquistada é permanente — morre a caverna, ela fica — e "permanente" só é
 * verdade se ela estiver no disco, não só na memória de um componente.
 *
 * ## Por que a lista de campos sai daqui e não de uma lista escrita à mão
 *
 * `IMPROVEMENT_FIELDS` é derivada desta fábrica. Escrever os doze nomes numa lista
 * separada, ao lado do save, funciona até alguém acrescentar a próxima melhoria:
 * o nome novo entra na fábrica, a lista não sabe dele, e a melhoria nunca vai para
 * o disco. Não há teste que pegue isso, porque não há erro — só uma melhoria que
 * o jogador escolhe e que desaparece.
 */
export function createImprovementState() {
  return {
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
  };
}

/** Os nomes das melhorias, derivados da fábrica. Fonte única, e não uma cópia. */
export const IMPROVEMENT_FIELDS = Object.keys(createImprovementState());

/**
 * Só as melhorias de um estado, completadas com zero onde faltarem.
 *
 * É o que o reinício de run usa para carregar a run de volta: o jogador escolhe
 * "Vitalidade 2", morre na caverna seguinte, e a vitalidade continua 2. Sem esta
 * função, `buildResetState` reconstrói o estado a partir do inicial e a melhoria
 * volta a zero — que era o que acontecia.
 *
 * Completar com zero em vez de deixar `undefined` é o que impede um save antigo, de
 * antes das melhorias existirem, de abrir com um campo que a tela lê e não
 * encontra.
 */
export function improvementsDe(estado) {
  const base = createImprovementState();
  const pego = {};

  for (const campo of IMPROVEMENT_FIELDS) {
    pego[campo] = estado?.[campo] ?? base[campo];
  }

  return pego;
}

/** A vida máxima que um nível de vitalidade dá. A base é 2, e cada nível soma 1. */
export function maxHpDe(vitalityLevel) {
  return 2 + (vitalityLevel ?? 0);
}

/**
 * Quantas melhorias de picareta o catálogo oferece.
 *
 * São 9, o que leva a picareta do nível 1 ao 10. Antes eram 4.
 *
 * ## Por que este número mora aqui, e não escrito em dois lugares
 *
 * O teto da picareta aparece em três: o catálogo, que para de oferecer melhoria;
 * o `Math.min` do `apply`, que satura o valor; e o modo desenvolvedor, que começa
 * com a picareta no máximo. Com o número nos três, um dia o catálogo sobe e os
 * outros dois ficam para trás — e o sintoma é pior que um erro.
 *
 * Já aconteceu. O catálogo chegou a oferecer 7 níveis com o `apply` ainda em
 * `Math.min(5)`, e "Picareta 05/06/07" viraram **cartas mortas**: apareciam no
 * lobby, eram escolhidas, e não mudavam nada na run. Nenhum teste pegou, porque
 * nenhum comparava o teto do catálogo com o teto do `apply`. Agora existe um.
 *
 * ## Por que 9 e não 10
 *
 * A picareta começa no 1, e cada melhoria soma 1. Então 9 melhorias levam ao 10.
 * `PICARETA_MAXIMA` é derivado daqui e não escrito, para os dois nunca discordarem.
 */
export const MELHORIAS_DE_PICARETA = 9;

/**
 * O nível de picareta que um nível de melhoria dá. Base 1, e cada um soma 1.
 *
 * É esta fórmula que `aplicarEfeitosDasMelhorias` usa ao recalcular o estado, e é
 * ela que decide o que a HUD mostra depois de uma morte.
 */
export function pickaxeLevelDe(pickaxeUpgradeLevel) {
  return Math.min(PICARETA_MAXIMA, 1 + (pickaxeUpgradeLevel ?? 0));
}

/**
 * As utilidades que o modo desenvolvedor começa com.
 *
 * São 5 poções de Caminho Seguro, e só isso: o pedido foi Caminho Seguro, e
 * inventar Vida e Revelar junto seria entregar um kit que ninguém pediu. A
 * quantidade é 5 porque é o que dá para limpar uma caverna inteira sem parar, e
 * não porque 5 tenha algum significado no resto do jogo — não tem.
 */
export const POCOES_CAMINHO_SEGURO_NO_DEV = 5;

/** O nível de picareta do modo desenvolvedor: o máximo que o catálogo permite. */
export const PICARETA_MAXIMA = MELHORIAS_DE_PICARETA + 1;

/**
 * Recalcula o que as melhorias **derivam**, a partir dos níveis das melhorias.
 *
 * Duas melhorias não terminam em si mesmas. Vitalidade 3 não é só o número 3: é
 * também 5 de vida máxima. Picareta 2 não é só o número 2: é também 2 de nível e
 * de força. Quem salva a melhoria guarda o **nível**, e o nível é a verdade — o que
 * ele produz é derivado, e por isso se recalcula em vez de se salvar.
 *
 * ## O bug que esta função conserta
 *
 * `improvementsDe` carregava os doze níveis ao reiniciar a run, mas `maxHp` e
 * `pickaxePower` vinham do `...initialState` — que tem `maxHp: 2` e
 * `pickaxePower: 1`. O resultado no navegador: a pessoa escolhia Vitalidade 1,
 * morria, e voltava com `vitalityLevel: 1` no save e **2 de vida** na HUD. A tela
 * mostrava o nívelcontradizendo o próprio número que dava o nome à melhoria.
 *
 * Guardar o derivado também não resolveria: passaria a haver duas verdades — o
 * nível e o que ele produz — e elas divergiriam assim que um deles fosse
 * corrigido sozinho. Uma regra só: o nível manda, o resto é consequence.
 *
 * `hp` é a **vida cheia**, e não a atual. Esta função só roda ao entrar numa
 * caverna, e lá a pessoa sempre começa com a vida cheia. Perder vida no meio da
 * caverna é outra coisa, e é o `maxHp` que limita o ganho de fora.
 *
 * ## Por que ela devolve só as melhorias, e não o estado inteiro
 *
 * A primeira versão fazia `...estado` junto. Em `buildBiomeStartState` e
 * `buildResetState` o uso é um spread no meio de um objeto literal, logo depois
 * de `cave: targetCave` — e o `cave` que vinha dentro de `...estado` sobrescrevia
 * o alvo. Escolher "Mina Solar cave 9" no modo desenvolvedor entrava na cave 1.
 *
 * Ficou escondido por meses porque morrer e trocar de bioma quase sempre levam a
 * `targetCave` igual ao `cave` atual: a diferença só aparece quando alguém escolhe
 * um destino, que é justamente o que o modo desenvolvedor passou a permitir.
 *
 * Devolver só o que esta função sabe calcular tira a armadilha pela raiz: ela não
 * transporta mais nada que não seja melhoria ou consequência de melhoria, então não
 * há campo alheio para sobrescrever por acidente.
 */
export function aplicarEfeitosDasMelhorias(estado) {
  const melhorias = improvementsDe(estado);
  const maxHp = maxHpDe(melhorias.vitalityLevel);
  const pickaxeLevel = pickaxeLevelDe(melhorias.pickaxeUpgradeLevel);

  return {
    ...melhorias,
    maxHp,
    hp: maxHp,
    pickaxeLevel,
    pickaxePower: pickaxeLevel
  };
}

/**
 * O inventário de utilidades, zerado.
 *
 * Estava definido dentro do `App.jsx`, ao lado das outras fábricas de estado
 * vazio — e foi para aqui quando os jogos salvos passaram a precisar dela.
 * `saves.js` hidrata um save, e hidratar precisa de um inventário vazio para
 * completar o que o save não trouxer; um `undefined` nessa chave viraria
 * `undefined` na tela.
 *
 * A chave é a identidade da utility no jogo inteiro. Trocar o nome aqui troca em
 * todos os saves, então o nome é parte do formato.
 */
export function createUtilityInventory() {
  return {
    lifePotion: 0,
    revealBomb: 0,
    safePath: 0
  };
}

export function createCollectionState() {
  return Object.values(RELIC_CATALOG).reduce((acc, relic) => {
    acc[relic.id] = 0;
    return acc;
  }, {});
}

/**
 * A última caverna do jogo: a `endCave` do último bioma.
 *
 * Fica aqui, e não na tela, porque é um dado do jogo e não da interface. O
 * `App.jsx` derivava isso na mão (`BIOMES[BIOMES.length - 1].endCave`) e era
 * preciso nas duas pontas do final — para saber quando mostrá-lo e para saber que
 * não existe caverna depois.
 */
export const TOTAL_CAVES = BIOMES[BIOMES.length - 1].endCave;

/**
 * Esta é a última caverna, e o final aparece aqui?
 *
 * A comparação é `>=`, e não `===`, por causa do que acontece em volta: antes do
 * final existir, clicar na Saída da caverna 60 levava para a 61. `getBiomeForCave`
 * não falha numa caverna fora da faixa — ela devolve o último bioma —, então o
 * jogador entrava numa caverna que mostra "10/10" para sempre, sem nunca mais
 * avançar. A caverna 61 é um beco, e `>=` garante que o final responda por ela
 * mesmo que algum save antigo tenha ficado gravado assim.
 */
export function ehCaveFinal(cave = 1) {
  return Number.isFinite(cave) && cave >= TOTAL_CAVES;
}

export function getBiomeForCave(cave = 1) {
  return BIOMES.find((biome) => cave >= biome.startCave && cave <= biome.endCave) ?? BIOMES[BIOMES.length - 1];
}

export function getBiomeStartCave(cave = 1) {
  return getBiomeForCave(cave).startCave;
}

/**
 * As caves de um bioma, em ordem: a primeira é a última.
 *
 * Existe para o modo desenvolvedor, que precisa chegar em "Mina Solar cave 9" sem
 * passar pelas oito anteriores. Antes, escolher um bioma só levava à primeira cave
 * dele — e para testar a cave 60, ou a cave 27, era preciso reiniciar o progresso
 * e avançar cave por cave.
 *
 * O número devolvido é o **absoluto**, o mesmo que a HUD mostra, e não a posição
 * dentro do bioma. Um seletor com "3" para a terceira cave da Mina Solar e para a
 * terceira da Gruta de Gelo obriga quem testa a contar de cabeça; e o contador é
 * justamente a coisa que se está tentando poupar.
 *
 * A lista vem de `startCave` e `endCave`, e não de um campo novo no bioma: são os
 * dois números que o resto do jogo já usa para decidir a que bioma uma cave
 * pertence. Uma terceira lista aqui seria uma quarta verdade sobre as mesmas
 * faixas, e foi exatamente uma verdade duplicada que deixou a vida máxima do
 * jogador contradizendo o próprio nível da melhoria.
 */
/**
 * As melhorias fixas, zeradas.
 *
 * ## O que é uma melhoria fixa
 *
 * São as que o jogador ganha ao **finalizar a última caverna de um bioma** — a
 * hora de escolher são 4 opções, e a escolhida vale até o fim do jogo, mesmo
 * depois de morrer e recomeçar o bioma. Tudo o que vem das outras cavernas é
 * temporário: 3 opções, e a escolha se perde na morte.
 *
 * ## Por que um piso, e não duas listas
 *
 * A tentação é guardar "o que é fixo" e "o que é temporário" em listas separadas.
 * Seria duas fontes de verdade para a mesma coisa: `pickaxeUpgradeLevel` valendo 2
 * e `pickaxeUpgradeLevelFixo` valendo 1 significaria que a picareta é 2, e alguém
 * teria de lembrar que o que a HUD mostra é a soma dos dois — em todo lugar que lê
 * o campo, incluindo a cena e os objetivos.
 *
 * Aqui os doze campos continuam sendo **o valor efetivo**, o que a HUD mostra e a
 * cena lê, sem soma nenhuma. `melhoriasFixas` é só o **piso**: o mínimo que a
 * morte devolve. Subir uma melhoria é mexer nos doze; morrer é copiar o piso por
 * cima. Uma regra só, e ela cabe numa linha.
 *
 * ## Por que o piso é uma cópia, e não uma lista de ids
 *
 * "Fixar a Vitalidade 2" como id exigiria, na morte, reconstruir os doze campos
 * aplicando ids na ordem em que foram fixados — e a ordem importa, porque os
 * campos interagem (`coinBonusLevel` sem `coinBonusChance` não faz nada). Uma
 * cópia do resultado não tem ordem, não tem interação e não pode ficar
 * inconsistente: ela é o que a tela mostrava no momento em que foi fixada.
 */
export function createMelhoriasFixasState() {
  return createImprovementState();
}

/** Só as melhorias fixas de um estado, completadas com zero onde faltarem. */
export function melhoriasFixasDe(estado) {
  const base = createMelhoriasFixasState();
  const pego = {};

  for (const campo of IMPROVEMENT_FIELDS) {
    pego[campo] = estado?.melhoriasFixas?.[campo] ?? base[campo];
  }

  return pego;
}

/**
 * Torna fixo o que a melhoria escolhida na virada de bioma mexeu.
 *
 * ## Por que a carta diz quais campos toca
 *
 * A primeira versão comparava o estado de antes com o de depois e promovia tudo o
 * que tinha subido. Isso estava errado, e um teste pegou: se a pessoa ganhou
 * moedas na terceira caverna e escolhe vitalidade na décima, a comparação promove
 * as **duas** — porque a de moedas também difere do piso, só que subiu dez
 * cavernas atrás. E a temporária passaria a sobreviver à morte, que é exatamente
 * o que ela não pode fazer.
 *
 * A pergunta "subiu?" não distingue uma coisa da outra. O que distingue é **qual
 * carta foi escolhida**, e por isso cada carta declara os campos que mexe, no
 * próprio lugar onde os aplica. Nada de mapa de track para campo em outro arquivo:
 * um dia um campo novo entra na melhoria, o mapa não sabe dele, e a falha é
 * silenciosa.
 *
 * Só sobe, nunca desce. Uma melhoria que já é fixa não perde o status porque o
 * jogador escolheu outra coisa.
 */
export function fixarMelhoriaEscolhida(estado, campos) {
  const fixasAntes = melhoriasFixasDe(estado);
  const fixas = { ...fixasAntes };

  for (const campo of campos ?? []) {
    // Um campo que não é melhoria é ignorado em vez de criar uma chave estranha no
    // piso: o piso tem doze campos, e um décimo terceiro não tem onde ficar.
    if (!IMPROVEMENT_FIELDS.includes(campo)) continue;

    const agora = estado?.[campo] ?? 0;

    if (agora > (fixasAntes[campo] ?? 0)) fixas[campo] = agora;
  }

  return { ...estado, melhoriasFixas: fixas };
}

/**
 * A morte: as melhorias temporárias voltam ao piso, e as fixas ficam.
 *
 * Copia `melhoriasFixas` por cima dos doze campos e recalcula o que elas produzem
 * — vida máxima e força de picareta. Sem o recálculo o jogador voltaria com
 * "Vitalidade 01" escrita no card e duas de vida na HUD, que foi um bug real.
 */
export function resetarMelhoriasTemporarias(estado) {
  const efeitos = aplicarEfeitosDasMelhorias({ ...estado, ...melhoriasFixasDe(estado) });

  return { ...estado, ...efeitos };
}

/**
 * Esta é a última caverna do bioma?
 *
 * É o que separa as duas menus: 4 opções fixas na virada, 3 temporárias nas outras.
 * A pergunta é feita pela caverna **concluída**, não pela próxima, porque é
 * concluí-la que libera a escolha.
 */
export function ehUltimaCaveDoBioma(cave) {
  const biome = getBiomeForCave(cave);

  return biome.endCave === cave;
}

/** Quantas opções o lobby oferece depois de concluir esta caverna. */
export const OPCOES_TEMPORARIAS = 3;
export const OPCOES_FIXAS = 4;

/** Este save conta progresso?
 *
 * Uma função de uma linha, e ainda assim mora aqui. As três coisas que contam
 * progresso — a cave concluída, a relíquia e o `profile` global — precisam
 * responder à mesma pergunta, e cada uma escrevia o teste por conta própria. Três
 * `if` parecidos em três arquivos divergem no primeiro dia em que alguém ajusta um
 * deles.
 *
 * Só `true` desliga. Um estado montado antes de o evento de entrada chegar conta
 * como jogo normal, e é isso que faz a primeira caverna de uma sessão nova contar.
 */
export function contaProgresso(estado) {
  return estado?.dev !== true;
}

/**
 * O estado depois de uma cave ter sido concluída.
 *
 * `primeiraVez` existe por um motivo antigo que continua valendo: clicar na saída
 * várias vezes na mesma caverna contava a mesma conclusão repetidamente, e o
 * objetivo "Explorador" podia ser farmado sem avançar.
 *
 * Num save de teste o estado volta **igual**. Não "quase igual": igual. É o que
 * garante que o `bestCave` não vá para 60 depois de uma passada de testes, e que o
 * objetivo Explorador não encha sozinho.
 */
export function registrarCaveConcluida(estado, cave, primeiraVez = true) {
  if (!contaProgresso(estado)) return estado;

  return {
    ...estado,
    stats: {
      ...createStatsState(),
      ...estado?.stats,
      ...(primeiraVez
        ? { totalCavesCleared: (estado?.stats?.totalCavesCleared ?? 0) + 1 }
        : {})
    },
    bestCave: Math.max(estado?.bestCave ?? 1, cave)
  };
}

/**
 * O estado depois de uma relíquia ter sido encontrada.
 *
 * Num save de teste a relíquia **aparece** — o efeito visual é o que o modo
 * desenvolvedor serve para testar — mas não entra na coleção nem no contador. Por
 * isso `lastRelicFound` fica de fora do desvio: é o que a tela mostra, e tirá-lo
 * junto faria o modo de teste esconder justamente o que ele existe para mostrar.
 */
export function registrarReliquiaEncontrada(estado, relicId) {
  const base = {
    ...estado,
    lastRelicFound: relicId
  };

  if (!contaProgresso(estado)) return base;

  return {
    ...base,
    collection: {
      ...createCollectionState(),
      ...estado?.collection,
      [relicId]: (estado?.collection?.[relicId] ?? 0) + 1
    },
    stats: {
      ...createStatsState(),
      ...estado?.stats,
      totalRelicsFound: (estado?.stats?.totalRelicsFound ?? 0) + 1
    }
  };
}

export function cavesDoBioma(biome) {
  const caves = [];

  for (let cave = biome.startCave; cave <= biome.endCave; cave += 1) {
    caves.push(cave);
  }

  return caves;
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

/**
 * Biomas liberados.
 *
 * `developerMode` ignora o `unlockCave` e devolve todos. Existe porque testar
 * o chão e a paleta de um bioma exigiria jogar a run inteira até lá: a Gruta de
 * Gelo só abre na Cave 10, e são 10 caves para ver uma cor.
 *
 * O parâmetro é explícito e não vem de um global: quem chama decide, e o
 * default segue sendo o caminho normal do jogo.
 */
export function getUnlockedBiomes(bestCave = 1, developerMode = false) {
  if (developerMode) return [...BIOMES];

  return BIOMES.filter((biome) => bestCave >= biome.unlockCave);
}

/** Um bioma está liberado? Mesma regra de `getUnlockedBiomes`. */
export function isBiomeUnlocked(biome, bestCave = 1, developerMode = false) {
  if (!biome) return false;
  if (developerMode) return true;

  return bestCave >= biome.unlockCave;
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
