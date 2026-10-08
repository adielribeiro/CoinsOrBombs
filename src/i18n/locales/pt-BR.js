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
  'hud.titleRelics': 'Relíquias disponíveis para gastar',
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
  'lobby.chooseUpgradeFixedSub': 'Parabéns, você finalizou o bioma "{biome}". Como prêmio, escolha uma melhoria para te acompanhar até o fim do jogo.',
  'lobby.reroll': 'Trocar · {n}',
  'lobby.rerollMissing': 'Faltam {n}',
  'lobby.noUpgradesLeft': 'Todas as trilhas de melhoria já chegaram ao máximo nesta run.',
  'lobby.nextCave': 'Próxima cave',
  'lobby.utilityShop': 'Melhorias / Utilitários',
  'lobby.retry': 'Tentar novamente',
  'lobby.mainMenu': 'Menu principal',

  // --- loja de utilitários ------------------------------------------------
  'shop.title': 'Melhorias / Utilitários',
  'shop.sectionUtilities': 'Utilitários',
  'shop.sectionUpgrades': 'Melhorias',
  'shop.upgradesSubtitle': 'Melhorias permanentes, pagas com relíquias.',
  'shop.relicBalance': 'Relíquias: {n}',
  'shop.buyNext': 'Melhorar por {n}',
  'shop.notEnoughRelics': 'Relíquias insuficientes',
  'shop.maxLevel': 'Nível máximo',
  'shop.level': 'Nível: {atual}/{max}',
  'shop.upgrade.health.name': 'Melhorar Vida',

  'shop.upgrade.capacidade.benefit': '+1 de espaço na mochila por nível',

  'shop.upgrade.capacidade.name': 'Melhorar Mochila',
  'shop.upgrade.health.benefit': '+1 de vida máxima por nível',
  'shop.upgrade.pickaxe.name': 'Melhorar Picareta',
  'shop.upgrade.pickaxe.benefit': '+1 de nível de picareta por nível',
  'shop.upgrade.lifePotion.name': 'Melhorar Poção de Vida',
  'shop.upgrade.lifePotion.benefit': '+1 de vida recuperada por poção',
  'shop.upgrade.revealBomb.name': 'Melhorar Poção Dedo Duro',
  'shop.upgrade.revealBomb.benefit': '+1 bomba revelada por poção',
  'shop.upgrade.safePath.name': 'Melhorar Poção Caminho Seguro',
  'shop.upgrade.safePath.b3': 'Além disso, indica um desvio curto até uma relíquia e de volta.',
  'shop.upgrade.safePath.b2': 'Além dos perigos, destaca as relíquias perto da rota.',
  'shop.upgrade.safePath.b1': 'Destaca os perigos ao lado da rota segura.',
  'shop.upgradeNext': 'Próximo nível: {benefit}',
  'shop.subtitle': 'Utilitários por moedas, melhorias permanentes por relíquias.',
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
  'hud.pause': 'Pausar',
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
  'reward.fixed': 'Fixa',
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
    '{chance}% de chance de revelar 1 bomba aleatória ao quebrar uma rocha — cada revelação custa {cost} moedas.',

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
  'msg.defeatDev': 'Você foi derrotado. As melhorias voltaram ao início do bioma atual, menos a picareta, que faz parte do kit de teste. Suas moedas, objetivos e relíquias foram mantidos.',
  'msg.bombHit': 'Bomba! Vida restante: {n}.',
  'msg.relicFound': 'Você encontrou a relíquia {relic}.',
  'msg.emptyBonus': 'Quebra bônus! A rocha extra estava vazia.',
  'msg.empty': 'Só pedra e poeira... siga cavando.',
  'msg.exitBonus':
    'Quebra bônus! Você encontrou a saída escondida. Clique no buraco para decidir se quer sair.',
  'msg.exitHidden':
    'Você encontrou a saída escondida desta cave. Clique no buraco para decidir se quer sair.',
  'msg.bombRevealed': 'Uma bomba escondida foi revelada no mapa. (−{cost} moedas)',

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
  'scene.markerOut': 'SAÍDA',

  // --- lore de entrada dos biomas -----------------------------------------
  'lore.falante': 'Minerador',
  'lore.dicaAvancar': 'Clique ou A para continuar',
  'lore.dicaPular': 'Enter ou B para pular',
  'lore.painel': '{n}/{total}',
  'lore.sunstone.p1.a': 'Que barulho foi esse??',
  'lore.sunstone.p2.a': 'É oficial! Estou perdido!',
  'lore.sunstone.p2.b': 'Sabia que não deveria ter vindo tão fundo!!',
  'lore.sunstone.p3.a': 'Pelo menos tenho meu equipamento!!',
  'lore.sunstone.p3.b': 'Agora precisa dar o fora daqui!!',
  'lore.sunstone.p4.a': 'O problema é que este lugar está cheio de Bombas!!',
  'lore.sunstone.p5.a': 'Um passo em falso e "BOOM"...',
  'lore.sunstone.p6.a': 'Bom...não vou ficar aqui pra sempre então..PARTIU!!!',
  'lore.frost.p1.a': 'Que frio.....',
  'lore.frost.p2.a': 'Meus mapas não mostram esse tipo de lugar, vou chamar de Gruta de Gelo.',
  'lore.frost.p3.a': 'Achei que seria mais fácil....',
  'lore.frost.p4.a': 'Bom pelo que vi não tem só bombas espalhadas por aí!!',
  'lore.frost.p4.b': 'Posso usar esses recursos que achei para me ajudar a sair daqui mais rápido!!',
  'lore.frost.p5.a': 'Vamos continuar!!',
  'lore.ember.p1.a': 'QUENTEEEEE....',
  'lore.ember.p2.a': 'Preciso manter o foco, ainda falta muito...',
  'lore.ember.p3.a': 'Se mantiver esse avanço logo vou finalizar!!',
  'lore.ember.p4.a': 'Dito isso....BORAAA!!',
  'lore.ruins.p1.a': 'Que lugar INCRÍVEL!!!!',
  'lore.ruins.p2.a': 'São ruínas de alguma civilização antiga!',
  'lore.ruins.p3.a': 'Talvez algum dia eu volte para explorar mais!',
  'lore.ruins.p4.a': 'Agora preciso avançar!!',
  'lore.wind.p1.a': 'AHOOO...SEGURAA!!',
  'lore.wind.p2.a': 'Provavelmente essa ventania indica que a saída está próxima.',
  'lore.wind.p3.a': 'Não vejo a hora de tomar um banho!',
  'lore.wind.p4.a': 'VAMOS EM FRENTE!',
  'lore.crystal.p1.a': 'Estou cansado chefe!',
  'lore.crystal.p2.a': 'Acredito que a saída esteja próxima',
  'lore.crystal.p3.a': 'Que lugar Sinistro!!!',
  'lore.crystal.p4.a': 'Esses cristais parecem afiados...é melhor ir com calma....',

  // --- cena final antes do fim do jogo ---------------
  'cenaFinal.dica': 'Clique para seguir',

  // --- cena final ------------------------------------------
  'cenaFinal.falante': 'Minerador',
  'cenaFinal.p1.a': 'AAAAHH MULEQUE.....',
  'cenaFinal.p2.a': 'Finalmente a saída',
  'cenaFinal.p3.a': 'Preciso parar de arrumar essas confusões...hehehehe',
  'cenaFinal.p4.a': 'Bom...agora só me resta a Saída!!!!!',

  // --- ponteiro do menu --------------------------------------
  'settings.pointerSensitivity': 'Sensibilidade do ponteiro',
  'settings.pointerSpeed': 'Velocidade do ponteiro',
  'settings.pointerLess': 'Menos',
  'settings.pointerMore': 'Mais',
  'settings.pointerPercent': '{valor}%',

  // Expedition challenges
  "challenge.bag": "Mochila: {n}/{max}. Escolha entre cura, detecção e caminho seguro.",
  "challenge.bagFull": "Mochila cheia. Use ou venda itens para abrir espaço. Itens antigos são preservados.",
  "challenge.cannotPay": "Recursos insuficientes para este obstáculo opcional. Ele nunca consome sua última vida.",
  "challenge.reinforced": "Bomba reforçada: causa {damage} de dano. Você pode contornar esta rocha.",
  "challenge.raider": "Bomba saqueadora: 1 de dano e perda de 10% das moedas (máximo 12).",
  "challenge.erosion": "Bomba de desgaste: 1 de dano; as próximas 3 rochas manuais exigem 2 golpes extras. Suas melhorias são mantidas.",
  "challenge.wear": "Desgaste: +2 golpes nesta rocha. Restam {n} rochas afetadas.",
  "challenge.sunstone": "Veio solar opcional: 2 golpes extras por 3 moedas. Toque novamente para escavar.",
  "challenge.frost": "Gelo medicinal opcional: 2 golpes extras para recuperar 1 vida. Toque novamente para escavar.",
  "challenge.ember": "Veio quente opcional: custa 1 vida e exige 1 golpe extra por 5 moedas. Toque novamente para escavar.",
  "challenge.ruins": "Selo das ruínas opcional: custa 5 moedas e exige 1 golpe extra para revelar até 2 bombas. Toque novamente para escavar.",
  "challenge.wind": "Bolsa de vento opcional: 2 golpes extras para revelar até 1 bomba. Toque novamente para escavar.",
  "challenge.crystal": "Prisma opcional: 3 golpes extras para revelar até 2 bombas. Toque novamente para escavar.",
  "challenge.completed": "Obstáculo opcional concluído. Benefício aplicado.",
  "challenge.guide": "A partir da cave 3, escave para achar a saída. Marcas amarelas indicam bombas especiais; verdes, obstáculos opcionais. O primeiro toque explica o efeito. Sempre existe uma rota sem bombas.",
};
