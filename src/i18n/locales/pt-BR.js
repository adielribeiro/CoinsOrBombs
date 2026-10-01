/**
 * Português (Brasil). A fonte da verdade do conjunto de chaves.
 *
 * Toda chave nova entra aqui primeiro, e `test/i18n.test.mjs` exige que os outros
 * nove idiomas tenham exatamente este conjunto. Nenhuma string de interface pode
 * ficar fora daqui: o que não vira chave, vira texto preso em português num jogo
 * que fala nove idiomas.
 *
 * `count` marca a plural. Onde a forma muda com o número, a mensagem é um objeto
 * de formas e não uma string — é o que permite ao polonês escolher entre uma,
 * poucas e muitas sem que o resto dos idiomas precise saber disso.
 */
export default {
  // --- marca e menu -------------------------------------------------------
  // O lockup "Coins or Bombs" NÃO é traduzido: é o nome do produto, e a arte da
  // tela de título já o desenha. Traduzir a peça "or" deixaria o logo incoerente
  // com o nome na Play Store.
  'menu.kicker': 'ArchangelSoft',
  'menu.taglineTail': 'nenhuma segunda chance',
  'menu.taglineCaves': {
    one: '{count} cave',
    other: '{count} caves'
  },
  'menu.taglineBiomes': {
    one: '{count} bioma',
    other: '{count} biomas'
  },
  'menu.enter': 'Entrar',
  'menu.settings': 'Configurações',
  'menu.info': 'Informações',
  'menu.mainAria': 'Menu principal',

  // --- jogos salvos --------------------------------------------------------
  // A tela que aparece ao clicar em "Entrar". Cada card é uma run inteira: a
  // caverna em que a pessoa parou, as moedas, as relíquias e a coleção ficam
  // gravadas separadas das outras, como um mundo do Minecraft.
  'saves.title': 'Escolher um jogo',
  'saves.subtitle': 'Cada jogo guarda sua caverna, moedas, relíquias e coleção.',
  'saves.newGame': 'Novo jogo',
  'saves.nameLabel': 'Nome do jogo',
  'saves.namePlaceholder': 'Meu jogo',
  'saves.create': 'Criar e jogar',
  'saves.empty': 'Nenhum jogo ainda.',
  'saves.emptyHint': 'Dê um nome ao primeiro jogo para começar.',
  'saves.play': 'Jogar',
  'saves.rename': 'Renomear',
  'saves.renameTitle': 'Renomear jogo',
  'saves.saveName': 'Salvar nome',
  'saves.delete': 'Apagar',
  'saves.deleteTitle': 'Apagar jogo',
  'saves.deleteConfirm':
    'Apagar "{name}"? As moedas, as relíquias e a caverna deste jogo se perdem. Não dá para desfazer.',
  'saves.relics': {
    one: '{count} relíquia',
    other: '{count} relíquias'
  },
  'saves.playedOn': 'Jogado em {date}',
  'saves.current': 'Em andamento',
  'saves.testGame': 'Teste',
  'saves.blockedNeedsDev': 'Ligue o modo desenvolvedor para abrir um jogo de teste.',
  'saves.blockedNeedsStandard': 'Desligue o modo desenvolvedor para abrir um jogo de verdade.',
  'saves.nameTaken': 'Já existe um jogo com esse nome. Pode usar assim mesmo.',
  'saves.ariaList': 'Jogos salvos',

  // --- final ---------------------------------------------------------------
  // A carta do fim, na caverna 60. São chaves separadas e não um texto único com
  // `\n` porque o parágrafo é o que dá o ritmo da rolagem: cada um precisa do seu
  // espaço, e um texto corrido só permitiria um bloco único no meio da tela.
  'finale.title': 'Você chegou até aqui.',
  'finale.p1':
    'Cada pedra quebrada, cada caminho descoberto e cada desafio superado trouxe você um pouco mais longe.',
  'finale.p2':
    'No fim, a maior riqueza nunca esteve apenas nas profundezas da caverna, mas na coragem de continuar quando o caminho parecia difícil, na curiosidade de explorar o desconhecido e na persistência de tentar mais uma vez.',
  'finale.p3':
    'A jornada termina por agora, mas todo explorador sabe que sempre existe outra passagem, outro mistério e uma nova aventura esperando para ser descoberta.',
  'finale.p4': 'Talvez esta tenha sido apenas a primeira escavação.',
  'finale.p5': 'Obrigado por jogar e por chegar até o fim.',
  'finale.signature': 'Com carinho,',
  'finale.team': 'Equipe Archangel Soft',
  'finale.closing': 'Até a próxima aventura. ⛏️✨',
  'finale.skip': 'Pular',

  // --- tela de idioma -----------------------------------------------------
  'language.title': 'Idioma',
  'language.hint': 'A troca vale na hora, sem reiniciar.',
  'language.current': 'Atual',
  'language.back': 'Voltar',

  // --- HUD ----------------------------------------------------------------
  'hud.cave': 'CAVE',
  'hud.biome': 'BIOMA',
  'hud.coins': 'MOEDAS',
  'hud.bombs': 'BOMBAS',
  'hud.relics': 'RELÍQUIAS',
  'hud.pickaxe': 'PICARETA',
  'hud.hp': 'HP',
  'hud.titleLife': 'Vida atual',
  'hud.titleCoins': 'Moedas acumuladas nesta run',
  'hud.titleBombs': 'Bombas ainda escondidas nesta cave',
  'hud.titleRelics': 'Relíquias na coleção',
  'hud.titlePickaxe': 'Nível da picareta',
  'hud.utilitiesAria': 'Utilitários da run',
  'hud.use': 'Usar',
  'hud.utilityAria': '{name} ({count} na mochila). {description}',
  'hud.utilityTitle': '{name} · {count}',

  // --- tela cheia ---------------------------------------------------------
  'fullscreen.enter': 'Entrar em tela cheia',
  'fullscreen.exit': 'Sair da tela cheia',
  'fullscreen.exitWithKey': 'Sair da tela cheia (Esc)',
  'fullscreen.closeNotice': 'Fechar aviso',
  'fullscreen.error.ios':
    'No iPhone e no iPad o Safari não tem tela cheia. Adicione o jogo à Tela de Início para jogar sem a barra do navegador.',
  'fullscreen.error.unsupported': 'Este navegador não oferece tela cheia para a web. Nada foi alterado.',
  'fullscreen.error.gesture':
    'O navegador recusou a tela cheia. Toque em "Tela cheia" para tentar de novo.',
  'fullscreen.error.denied':
    'Não foi possível entrar em tela cheia. Use o botão de tela cheia no canto inferior.',

  // --- seleção de bioma ---------------------------------------------------
  'biomeSelect.title.menu': 'Selecione um bioma',
  'biomeSelect.title.next': 'Próximo bioma',
  'biomeSelect.devMode': 'Modo desenvolvedor',
  'biomeSelect.bestCave': 'Melhor cave {n}',
  'biomeSelect.status.locked': 'Bloqueado',
  'biomeSelect.status.dev': 'Dev',
  'biomeSelect.status.completed': 'Concluído',
  'biomeSelect.status.available': 'Disponível',
  'biomeSelect.status.visited': 'Visitado',
  'biomeSelect.unlockAt': 'Cave {n}',
  'biomeSelect.start': 'Começar neste bioma',
  'biomeSelect.enter': 'Entrar no bioma',
  'biomeSelect.enterCave': 'Entrar na cave {n}',

  // --- configurações ------------------------------------------------------
  'settings.title': 'Configurações',
  'settings.fullscreen': 'Tela cheia ao começar',
  'settings.fullscreenPwaHint':
    'No iPhone e no iPad o Safari não tem tela cheia — instale pela Tela de Início.',
  'settings.rememberRun': 'Lembrar meu progresso',
  'settings.devMode': 'Modo desenvolvedor',
  'settings.devNote': '{unlocked} de {total} biomas liberados',
  'settings.input': 'Entrada',
  'settings.inputReduced': 'Reduzida',
  'settings.inputAnimated': 'Animada',
  'settings.orientation': 'Orientação recomendada',
  'settings.orientationLandscape': 'Paisagem',
  'settings.orientationLandscapeDesktop': 'Paisagem (desktop)',
  'settings.bestCaveRecorded': 'Melhor cave registrada',

  // --- informações --------------------------------------------------------
  'info.title': 'Informações da Progressão',
  'info.biomesUnlocked': 'Biomas desbloqueados',
  'info.devModeBestCave': 'Modo desenvolvedor · melhor cave {n}',
  'info.currentBiome': 'Bioma atual',
  'info.currentCave': 'Cave atual',
  'info.objectives': 'Objetivos',
  'info.relics': 'Relíquias',
  'info.totalRelics': 'Total {n}',

  // --- lobby --------------------------------------------------------------
  'lobby.defeatBadge': 'DERROTA',
  'lobby.victoryBadge': 'VITÓRIA',
  'lobby.defeatTitle': 'Você foi derrotado',
  'lobby.clearTitle': 'Cave {cave} concluída',
  'lobby.coins': 'Moedas',
  'lobby.life': 'Vida',
  'lobby.pickaxe': 'Picareta',
  'lobby.next': 'Próxima',
  'lobby.chooseUpgrade': 'Escolha sua melhoria',
  'lobby.chooseUpgradeSub': 'Escolha 1 melhoria para a próxima cave.',
  'lobby.reroll': 'Trocar · {n}',
  'lobby.rerollMissing': 'Faltam {n}',
  'lobby.noUpgradesLeft': 'Todas as trilhas de melhoria já chegaram ao máximo nesta run.',
  'lobby.nextCave': 'Próxima cave',
  'lobby.utilityShop': 'Loja utilitários',
  'lobby.retry': 'Tentar novamente',
  'lobby.mainMenu': 'Menu principal',

  // --- loja de utilitários ------------------------------------------------
  'shop.title': 'Loja de utilitários',
  'shop.subtitle': 'Compre consumíveis para usar durante a próxima exploração.',
  'shop.inBag': 'Na mochila: {n}',
  'shop.buy': 'Comprar · {n}',
  'shop.missing': 'Faltam {n}',
  'shop.sell': 'Vender · {n}',
  'shop.empty': 'Sem itens',

  // --- pausa --------------------------------------------------------------
  'pause.kicker': 'Pausado',
  'pause.title': '{biome} · {cave}',
  'pause.message': 'Cave congelada.',
  'pause.continue': 'Continuar',
  'pause.toMenu': 'Ir para o menu',
  'pause.hint': 'Esc continua',
  'pause.controllerHint': 'Direcional move · A confirma · B volta · Start pausa',
  'hud.controller': '{name} conectado',
  'pause.aria': 'Jogo pausado',

  // --- decisão da saída ----------------------------------------------------
  'exit.badge': 'SAÍDA ENCONTRADA',
  'exit.question': 'O que deseja fazer?',
  'exit.nextCave': 'Próxima cave',
  'exit.keepExploring': 'Continuar na cave atual',
  // Na última caverna não existe "próxima": o botão que ofereceria seguir em
  // frente vira o botão que abre o final.
  'exit.finale': 'Ver o final',

  // --- rotação ------------------------------------------------------------
  'rotate.hint': 'Gire o celular para jogar melhor em modo paisagem.',
  'rotate.title': 'Gire o celular',
  'rotate.playing': 'Para continuar jogando, use o dispositivo no modo paisagem.',
  'rotate.menu': 'Use o dispositivo no modo paisagem para liberar o menu.',

  // --- botões que reaparecem em mais de um lugar --------------------------
  'common.close': 'Fechar',
  'common.back': 'Voltar',
  'common.info': 'Informações',
  'common.resetProgress': 'Reiniciar progresso',

  // --- conteúdo: utilitários ---------------------------------------------
  'utility.lifePotion.name': 'Poção de Vida',
  'utility.lifePotion.description': 'Recupera 1 ponto de vida durante a run.',
  'utility.revealBomb.name': 'Poção Dedo-Duro',
  'utility.revealBomb.description': 'Revela uma bomba escondida no mapa atual.',
  'utility.safePath.name': 'Poção Caminho Seguro',
  'utility.safePath.description': 'Mostra a rota segura até a saída da cave atual.',

  // --- conteúdo: melhorias ------------------------------------------------
  'reward.pickaxe.name': 'Picareta {tier}',
  'reward.pickaxe.first': '+1 nível de picareta: rochas quebram com 1 clique a menos.',
  'reward.pickaxe.next': '+1 nível de picareta. Requer Picareta {tier}.',
  'reward.vitality.name': 'Vitalidade {tier}',
  'reward.vitality.description': '+1 vida máxima. Próxima cave começa com vida cheia.',
  'reward.coins.name': 'Moedas {tier}',
  'reward.coins.description': {
    one: '{chance}% de chance de coletar +{count} moeda.',
    other: '{chance}% de chance de coletar +{count} moedas.'
  },
  'reward.rocks.name': 'Rochas {tier}',
  'reward.rocks.description': {
    one: '{chance}% de chance de quebrar +{count} rocha.',
    other: '{chance}% de chance de quebrar +{count} rochas.'
  },
  'reward.utility.name': 'Utilitário {tier}',
  'reward.utility.description':
    '{chance}% de chance de coletar 1 utilitário aleatório ao quebrar uma rocha.',
  'reward.bomb.name': 'Bombas {tier}',
  'reward.bomb.description':
    '{chance}% de chance de revelar 1 bomba aleatória ao quebrar uma rocha.',

  // --- conteúdo: biomas ---------------------------------------------------
  'biome.sunstone.name': 'Mina Solar',
  'biome.sunstone.range': 'Caves 1-10',
  'biome.frost.name': 'Gruta de Gelo',
  'biome.frost.range': 'Caves 11-20',
  'biome.ember.name': 'Profundezas Rubras',
  'biome.ember.range': 'Caves 21-30',
  'biome.ruins.name': 'Ruínas Abissais',
  'biome.ruins.range': 'Caves 31-40',
  'biome.wind.name': 'Galeria de Vento',
  'biome.wind.range': 'Caves 41-50',
  'biome.crystal.name': 'Câmara de Cristal',
  'biome.crystal.range': 'Caves 51-60',

  // --- conteúdo: relíquias ------------------------------------------------
  'relic.amber_fang.name': 'Presa Âmbar',
  'relic.amber_fang.description': 'Fragmento fóssil perdido na Mina Solar.',
  'relic.frost_bloom.name': 'Flor de Gelo',
  'relic.frost_bloom.description': 'Cristal orgânico raro das cavernas congeladas.',
  'relic.ember_core.name': 'Núcleo Incandescente',
  'relic.ember_core.description': 'Rocha viva aquecida no coração das profundezas.',
  'relic.ruin_tablet.name': 'Placa das Ruínas',
  'relic.ruin_tablet.description': 'Inscrição ancestral trazida das Ruínas Abissais.',
  'relic.gust_shell.name': 'Concha de Rajada',
  'relic.gust_shell.description': 'Casco oco que canta quando o vento passa.',
  'relic.prism_core.name': 'Núcleo de Prisma',
  'relic.prism_core.description': 'Coração da Câmara de Cristal.',

  // --- conteúdo: objetivos ------------------------------------------------
  'objective.rocks.label': 'Britador',
  'objective.rocks.description': 'Quebre 40 rochas no total.',
  'objective.coins.label': 'Garimpeiro',
  'objective.coins.description': 'Colete 80 moedas no total.',
  'objective.caves.label': 'Explorador',
  'objective.caves.description': 'Conclua 8 caves.',
  'objective.relics.label': 'Curador',
  'objective.relics.description': 'Encontre 4 relíquias.',

  // --- mensagens de partida ----------------------------------------------
  'msg.intro': 'Quebre uma rocha na beirada da área aberta para começar.',
  'msg.enterCave': 'Você entrou na Cave {cave} de {biome}.',
  'msg.reroll': 'Melhorias renovadas por {n} moedas.',
  'msg.utilityAdded': '{name} adicionada à mochila da run.',
  'msg.utilitySold': '{name} vendida por {n} moedas.',
  'msg.chooseNextCave': 'Você decidiu seguir para a próxima cave.',
  'msg.exitToCave': 'Você decidiu seguir para a Cave {n}.',
  'msg.rewardChosen':
    '{reward} escolhida. Vida restaurada. Você entrou na Cave {cave} de {biome}.',
  'msg.defeat':
    'Você foi derrotado. As melhorias voltaram ao início do bioma atual, mas suas moedas, objetivos e relíquias foram mantidos.',
  'msg.foundExit':
    'Você encontrou a saída. Deseja seguir para a próxima cave ou continuar explorando esta?',
  'msg.deathLobby': 'Você ficou sem vida e voltou ao lobby.',

  // --- mensagens da quebra ------------------------------------------------
  'msg.coinBonus': 'Quebra bônus!',
  'msg.unluckyBonus': 'Quebra bônus azarada!',
  'msg.coinFound': {
    one: 'Você encontrou {count} moeda.',
    other: 'Você encontrou {count} moedas.'
  },
  'msg.bombHit': 'Bomba! Vida restante: {n}.',
  'msg.relicFound': 'Você encontrou a relíquia {relic}.',
  'msg.emptyBonus': 'Quebra bônus! A rocha extra estava vazia.',
  'msg.empty': 'Só pedra e poeira... siga cavando.',
  'msg.exitBonus':
    'Quebra bônus! Você encontrou a saída escondida. Clique no buraco para decidir se quer sair.',
  'msg.exitHidden':
    'Você encontrou a saída escondida desta cave. Clique no buraco para decidir se quer sair.',
  'msg.bombRevealed': 'Uma bomba escondida foi revelada no mapa.',

  // --- mensagens de utilitário --------------------------------------------
  'msg.utilityReward': '+1 utilitário',
  'msg.utilityDropFound': "Você encontrou um utilitário bônus: {name}.",
  'msg.lifeUsed': "Poção de vida usada. Vida atual: {hp}/{max}.",
  'msg.utilityMissing': 'Você não tem esse utilitário na mochila.',
  'msg.lifeFull': 'Sua vida já está cheia — a poção foi guardada.',
  'msg.noBombsLeft': 'Nenhuma bomba escondida restante nesta cave.',
  'msg.revealUsed': 'Poção dedo-duro usada. Uma bomba foi revelada no mapa.',
  'msg.noSafeRoute': 'Não há rota sem bomba até a saída nesta cave.',
  'msg.safePathUsed': 'Poção caminho seguro usada. A rota verde até a saída foi revelada.',

  // --- textos desenhados na cena -----------------------------------------
  'scene.markerIn': 'IN',
  'scene.markerOut': 'SAÍDA'
};
