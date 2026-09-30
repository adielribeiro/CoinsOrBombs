/** Español. */
export default {
  // --- marca y menú -------------------------------------------------------
  'menu.kicker': 'ArchangelSoft',
  'menu.taglineTail': 'sin segunda oportunidad',
  'menu.taglineCaves': {
    one: '{count} cueva',
    other: '{count} cuevas'
  },
  'menu.taglineBiomes': {
    one: '{count} bioma',
    other: '{count} biomas'
  },
  'menu.enter': 'Jugar',
  'menu.settings': 'Ajustes',
  'menu.info': 'Información',
  'menu.mainAria': 'Menú principal',

  // --- jogos salvos --------------------------------------------------------
  'saves.title': 'Elegir una partida',
  'saves.subtitle': 'Cada partida guarda su propia cueva, monedas, reliquias y colección.',
  'saves.newGame': 'Nueva partida',
  'saves.nameLabel': 'Nombre de la partida',
  'saves.namePlaceholder': 'Mi partida',
  'saves.create': 'Crear y jugar',
  'saves.empty': 'Todavía no hay partidas.',
  'saves.emptyHint': 'Ponle nombre a la primera partida para empezar.',
  'saves.play': 'Jugar',
  'saves.rename': 'Renombrar',
  'saves.renameTitle': 'Renombrar partida',
  'saves.saveName': 'Guardar nombre',
  'saves.delete': 'Borrar',
  'saves.deleteTitle': 'Borrar partida',
  'saves.deleteConfirm': '¿Borrar \"{name}\"? Perderás sus monedas, reliquias y cueva. No se puede deshacer.',
  'saves.playedOn': 'Jugado el {date}',
  'saves.current': 'En curso',
  'saves.nameTaken': 'Ya existe una partida con ese nombre. Puedes usarlo igual.',
  'saves.ariaList': 'Partidas guardadas',
  'saves.relics': {
    one: '{count} reliquia',
    other: '{count} reliquias'
  },

  // --- pantalla de idioma -------------------------------------------------
  'language.title': 'Idioma',
  'language.hint': 'El cambio se aplica al momento, sin reiniciar.',
  'language.current': 'Actual',
  'language.back': 'Volver',

  // --- HUD ----------------------------------------------------------------
  'hud.cave': 'CUEVA',
  'hud.biome': 'BIOMA',
  'hud.coins': 'MONEDAS',
  'hud.bombs': 'BOMBAS',
  'hud.relics': 'RELIQUIAS',
  'hud.pickaxe': 'PICO',
  'hud.hp': 'PV',
  'hud.titleLife': 'Vida actual',
  'hud.titleCoins': 'Monedas recogidas en esta partida',
  'hud.titleBombs': 'Bombas todavía ocultas en esta cueva',
  'hud.titleRelics': 'Reliquias de la colección',
  'hud.titlePickaxe': 'Nivel del pico',
  'hud.utilitiesAria': 'Utilidades de la partida',
  'hud.use': 'Usar',
  'hud.utilityAria': '{name} ({count} en la mochila). {description}',
  'hud.utilityTitle': '{name} · {count}',

  // --- pantalla completa --------------------------------------------------
  'fullscreen.enter': 'Entrar en pantalla completa',
  'fullscreen.exit': 'Salir de pantalla completa',
  'fullscreen.exitWithKey': 'Salir de pantalla completa (Esc)',
  'fullscreen.closeNotice': 'Cerrar aviso',
  'fullscreen.error.ios':
    'Safari en iPhone e iPad no tiene pantalla completa. Añade el juego a la pantalla de inicio para jugar sin la barra del navegador.',
  'fullscreen.error.unsupported': 'Este navegador no ofrece pantalla completa para web. No se cambió nada.',
  'fullscreen.error.gesture': 'El navegador rechazó la pantalla completa. Toca «Pantalla completa» para intentarlo de nuevo.',
  'fullscreen.error.denied':
    'No se pudo entrar en pantalla completa. Usa el botón de pantalla completa de la esquina inferior.',

  // --- selección de bioma -------------------------------------------------
  'biomeSelect.title.menu': 'Elige un bioma',
  'biomeSelect.title.next': 'Siguiente bioma',
  'biomeSelect.devMode': 'Modo desarrollador',
  'biomeSelect.bestCave': 'Mejor cueva {n}',
  'biomeSelect.status.locked': 'Bloqueado',
  'biomeSelect.status.dev': 'Dev',
  'biomeSelect.status.completed': 'Completado',
  'biomeSelect.status.available': 'Disponible',
  'biomeSelect.status.visited': 'Visitado',
  'biomeSelect.unlockAt': 'Cueva {n}',
  'biomeSelect.start': 'Empezar en este bioma',
  'biomeSelect.enter': 'Entrar al bioma',

  // --- ajustes ------------------------------------------------------------
  'settings.title': 'Ajustes',
  'settings.fullscreen': 'Pantalla completa al empezar',
  'settings.fullscreenPwaHint':
    'Safari en iPhone e iPad no tiene pantalla completa: instálalo desde la pantalla de inicio.',
  'settings.rememberRun': 'Recordar mi progreso',
  'settings.devMode': 'Modo desarrollador',
  'settings.devNote': '{unlocked} de {total} biomas desbloqueados',
  'settings.input': 'Entrada',
  'settings.inputReduced': 'Reducida',
  'settings.inputAnimated': 'Animada',
  'settings.orientation': 'Orientación recomendada',
  'settings.orientationLandscape': 'Horizontal',
  'settings.orientationLandscapeDesktop': 'Horizontal (escritorio)',
  'settings.bestCaveRecorded': 'Mejor cueva registrada',

  // --- información --------------------------------------------------------
  'info.title': 'Información de progreso',
  'info.biomesUnlocked': 'Biomas desbloqueados',
  'info.devModeBestCave': 'Modo desarrollador · mejor cueva {n}',
  'info.currentBiome': 'Bioma actual',
  'info.currentCave': 'Cueva actual',
  'info.objectives': 'Objetivos',
  'info.relics': 'Reliquias',
  'info.totalRelics': 'Total {n}',

  // --- vestíbulo ----------------------------------------------------------
  'lobby.defeatBadge': 'DERROTA',
  'lobby.victoryBadge': 'VICTORIA',
  'lobby.defeatTitle': 'Has sido derrotado',
  'lobby.clearTitle': 'Cueva {cave} completada',
  'lobby.coins': 'Monedas',
  'lobby.life': 'Vida',
  'lobby.pickaxe': 'Pico',
  'lobby.next': 'Siguiente',
  'lobby.chooseUpgrade': 'Elige tu mejora',
  'lobby.chooseUpgradeSub': 'Elige 1 mejora para la próxima cueva.',
  'lobby.reroll': 'Cambiar · {n}',
  'lobby.rerollMissing': 'Faltan {n}',
  'lobby.noUpgradesLeft': 'Todas las vías de mejora ya están al máximo en esta partida.',
  'lobby.nextCave': 'Siguiente cueva',
  'lobby.utilityShop': 'Tienda de utilidades',
  'lobby.retry': 'Intentar de nuevo',
  'lobby.mainMenu': 'Menú principal',

  // --- tienda de utilidades -----------------------------------------------
  'shop.title': 'Tienda de utilidades',
  'shop.subtitle': 'Compra consumibles para usar en la próxima exploración.',
  'shop.inBag': 'En la mochila: {n}',
  'shop.buy': 'Comprar · {n}',
  'shop.missing': 'Faltan {n}',
  'shop.sell': 'Vender · {n}',
  'shop.empty': 'Sin objetos',

  // --- pausa --------------------------------------------------------------
  'pause.kicker': 'Pausa',
  'pause.title': '{biome} · {cave}',
  'pause.message': 'Cueva congelada.',
  'pause.continue': 'Continuar',
  'pause.toMenu': 'Ir al menú',
  'pause.hint': 'Esc continúa',
  'pause.aria': 'Juego en pausa',

  // --- decisión de salida -------------------------------------------------
  'exit.badge': 'SALIDA ENCONTRADA',
  'exit.question': '¿Qué quieres hacer?',
  'exit.nextCave': 'Siguiente cueva',
  'exit.keepExploring': 'Seguir explorando esta cueva',

  // --- rotación -----------------------------------------------------------
  'rotate.hint': 'Gira el móvil para jugar mejor en horizontal.',
  'rotate.title': 'Gira el móvil',
  'rotate.playing': 'Para seguir jugando, pon el dispositivo en horizontal.',
  'rotate.menu': 'Pon el dispositivo en horizontal para desbloquear el menú.',

  // --- botones que aparecen en más de un sitio ----------------------------
  'common.close': 'Cerrar',
  'common.back': 'Volver',
  'common.info': 'Información',
  'common.resetProgress': 'Reiniciar progreso',

  // --- contenido: utilidades ----------------------------------------------
  'utility.lifePotion.name': 'Poción de Vida',
  'utility.lifePotion.description': 'Recupera 1 punto de vida durante la partida.',
  'utility.revealBomb.name': 'Poción Dedo-Duro',
  'utility.revealBomb.description': 'Revela una bomba oculta en el mapa actual.',
  'utility.safePath.name': 'Poción Ruta Segura',
  'utility.safePath.description': 'Muestra la ruta segura hasta la salida de la cueva actual.',

  // --- contenido: mejoras -------------------------------------------------
  'reward.pickaxe.name': 'Pico {tier}',
  'reward.pickaxe.first': '+1 nivel de pico: las rocas se rompen con un clic menos.',
  'reward.pickaxe.next': '+1 nivel de pico. Requiere Pico {tier}.',
  'reward.vitality.name': 'Vitalidad {tier}',
  'reward.vitality.description': '+1 vida máxima. La próxima cueva empieza con la vida llena.',
  'reward.coins.name': 'Monedas {tier}',
  'reward.coins.description': {
    one: '{chance}% de probabilidad de recoger +{count} moneda.',
    other: '{chance}% de probabilidad de recoger +{count} monedas.'
  },
  'reward.rocks.name': 'Rocas {tier}',
  'reward.rocks.description': {
    one: '{chance}% de probabilidad de romper +{count} roca.',
    other: '{chance}% de probabilidad de romper +{count} rocas.'
  },
  'reward.utility.name': 'Utilidad {tier}',
  'reward.utility.description':
    '{chance}% de probabilidad de recoger una utilidad aleatoria al romper una roca.',
  'reward.bomb.name': 'Bombas {tier}',
  'reward.bomb.description':
    '{chance}% de probabilidad de revelar una bomba aleatoria al romper una roca.',

  // --- contenido: biomas --------------------------------------------------
  'biome.sunstone.name': 'Mina Solar',
  'biome.sunstone.range': 'Cuevas 1-10',
  'biome.frost.name': 'Gruta de Hielo',
  'biome.frost.range': 'Cuevas 11-20',
  'biome.ember.name': 'Profundidades Carmesí',
  'biome.ember.range': 'Cuevas 21-30',
  'biome.ruins.name': 'Ruinas Abisales',
  'biome.ruins.range': 'Cuevas 31-40',
  'biome.wind.name': 'Galería del Viento',
  'biome.wind.range': 'Cuevas 41-50',
  'biome.crystal.name': 'Cámara de Cristal',
  'biome.crystal.range': 'Cuevas 51-60',

  // --- contenido: reliquias -----------------------------------------------
  'relic.amber_fang.name': 'Colmillo de Ámbar',
  'relic.amber_fang.description': 'Fragmento fósil perdido en la Mina Solar.',
  'relic.frost_bloom.name': 'Flor de Hielo',
  'relic.frost_bloom.description': 'Cristal orgánico raro de las cavernas congeladas.',
  'relic.ember_core.name': 'Núcleo Incandescente',
  'relic.ember_core.description': 'Roca viva calentada en el corazón de las profundidades.',
  'relic.ruin_tablet.name': 'Placa de las Ruinas',
  'relic.ruin_tablet.description': 'Inscripción ancestral traída de las Ruinas Abisales.',
  'relic.gust_shell.name': 'Concha de Ráfaga',
  'relic.gust_shell.description': 'Cáscara hueca que canta cuando pasa el viento.',
  'relic.prism_core.name': 'Núcleo de Prisma',
  'relic.prism_core.description': 'El corazón de la Cámara de Cristal.',

  // --- contenido: objetivos -----------------------------------------------
  'objective.rocks.label': 'Rompedor',
  'objective.rocks.description': 'Rompe 40 rocas en total.',
  'objective.coins.label': 'Buscatesoros',
  'objective.coins.description': 'Recoge 80 monedas en total.',
  'objective.caves.label': 'Explorador',
  'objective.caves.description': 'Completa 8 Cuevas.',
  'objective.relics.label': 'Curador',
  'objective.relics.description': 'Encuentra 4 reliquias.',

  // --- mensajes de partida -------------------------------------------------
  'msg.intro': 'Rompe una roca en el borde del área abierta para empezar.',
  'msg.enterCave': 'Has entrado en la Cueva {cave} de {biome}.',
  'msg.reroll': 'Mejoras renovadas por {n} monedas.',
  'msg.utilityAdded': '{name} añadida a tu mochila de la partida.',
  'msg.utilitySold': '{name} vendida por {n} monedas.',
  'msg.chooseNextCave': 'Has decidido pasar a la siguiente cueva.',
  'msg.exitToCave': 'Has decidido pasar a la Cueva {n}.',
  'msg.rewardChosen': '{reward} elegida. Vida restaurada. Has entrado en la Cueva {cave} de {biome}.',
  'msg.defeat':
    'Has sido derrotado. Las mejoras volvieron al inicio del bioma actual, pero tus monedas, objetivos y reliquias se conservaron.',
  'msg.foundExit': 'Has encontrado la salida. ¿Pasas a la siguiente cueva o sigues explorando esta?',
  'msg.deathLobby': 'Te has quedado sin vida y has vuelto al vestíbulo.',

  // --- mensajes de la rotura ----------------------------------------------
  'msg.coinBonus': '¡Rotura extra!',
  'msg.unluckyBonus': '¡Rotura extra con mala suerte!',
  'msg.coinFound': {
    one: 'Has encontrado {count} moneda.',
    other: 'Has encontrado {count} monedas.'
  },
  'msg.bombHit': '¡Bomba! Vida restante: {n}.',
  'msg.relicFound': 'Has encontrado la reliquia {relic}.',
  'msg.emptyBonus': '¡Rotura extra! La roca adicional estaba vacía.',
  'msg.empty': 'Solo piedra y polvo... sigue excavando.',
  'msg.exitBonus': '¡Rotura extra! Has encontrado la salida oculta. Haz clic en el agujero para decidir si sales.',
  'msg.exitHidden':
    'Has encontrado la salida oculta de esta cueva. Haz clic en el agujero para decidir si sales.',
  'msg.bombRevealed': 'Se ha revelado una bomba oculta en el mapa.',

  // --- mensajes de utilidad ------------------------------------------------
  'msg.utilityReward': '+1 utilidad',
  'msg.utilityDropFound': "Has encontrado una utilidad de bonificación: {name}.",
  'msg.lifeUsed': "Poción de vida usada. Vida actual: {hp}/{max}.",
  'msg.utilityMissing': 'No tienes esa utilidad en la mochila.',
  'msg.lifeFull': 'Ya tienes la vida al máximo: la poción se ha guardado.',
  'msg.noBombsLeft': 'No quedan bombas ocultas en esta cueva.',
  'msg.revealUsed': 'Poción Dedo-Duro usada. Se ha revelado una bomba en el mapa.',
  'msg.noSafeRoute': 'No hay ruta sin bombas hasta la salida en esta cueva.',
  'msg.safePathUsed': 'Poción Ruta Segura usada. Se ha revelado la ruta verde hasta la salida.',

  // --- texto dibujado en la escena ----------------------------------------
  'scene.markerIn': 'IN',
  'scene.markerOut': 'SALIDA'
};
