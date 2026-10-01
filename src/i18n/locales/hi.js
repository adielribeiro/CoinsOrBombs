/**
 * हिन्दी (Hindi).
 *
 * देवनागरी में अंग्रेज़ी उधारणाएँ आमतौर पर ज्यादा लिखी जाती हैं — `Cave` जैसा शब्द
 * खेल के अंदर `Jaskinia` से ज़्यादा सहज लगता है। इसलिए कुछ लेबल जानबूझकर
 * अंग्रेज़ी में रखे गए हैं, और वह जानबूझकर है, गलती से नहीं।
 *
 * `{count}` के साथ बहुवचन नहीं बदलता: 1 और 10 के बीच अंतर सिर्फ़ अंक दिखता है।
 * इसलिए यहाँ `one` और `other` एक जैसे हैं, और दोनों रखे गए हैं ताकि शब्द-चयन
 * हर भाषा में एक जैसा व्यवहार करे।
 */
export default {
  // --- ब्रांड और मेन्यू ----------------------------------------------------
  'menu.kicker': 'ArchangelSoft',
  'menu.taglineTail': 'कोई दूसरा मौका नहीं',
  'menu.taglineCaves': {
    one: '{count} Cave',
    other: '{count} Caves'
  },
  'menu.taglineBiomes': {
    one: '{count} Biome',
    other: '{count} Biomes'
  },
  'menu.enter': 'खेलें',
  'menu.settings': 'सेटिंग्स',
  'menu.info': 'जानकारी',
  'menu.mainAria': 'मुख्य मेन्यू',

  // --- jogos salvos --------------------------------------------------------
  'saves.title': 'खेल चुनें',
  'saves.subtitle': 'हर खेल अपनी गुफा, सिक्के, अवशेष और संग्रह अलग रखता है।',
  'saves.newGame': 'नया खेल',
  'saves.nameLabel': 'खेल का नाम',
  'saves.namePlaceholder': 'मेरा खेल',
  'saves.create': 'बनाएं और खेलें',
  'saves.empty': 'अभी कोई खेल नहीं।',
  'saves.emptyHint': 'शुरू करने के लिए पहले खेल को एक नाम दें।',
  'saves.play': 'खेलें',
  'saves.rename': 'नाम बदलें',
  'saves.renameTitle': 'खेल का नाम बदलें',
  'saves.saveName': 'नाम सहेजें',
  'saves.delete': 'मिटाएं',
  'saves.deleteTitle': 'खेल मिटाएं',
  'saves.deleteConfirm': '\"{name}\" मिटा दें? इस खेल के सिक्के, अवशेष और गुफा खो जाएंगे। यह वापस नहीं लाया जा सकता।',
  'saves.playedOn': '{date} को खेला गया',
  'saves.current': 'चल रहा है',
  'saves.testGame': 'टेस्ट',
  'saves.blockedNeedsDev': 'टेस्ट गेम खोलने के लिए डेवलपर मोड चालू करें।',
  'saves.blockedNeedsStandard': 'असली गेम खोलने के लिए डेवलपर मोड बंद करें।',
  'saves.nameTaken': 'इस नाम का खेल पहले से मौजूद है। आप फिर भी इसका उपयोग कर सकते हैं।',
  'saves.ariaList': 'सहेजे गए खेल',

  // --- final ---------------------------------------------------------------
  'finale.title': 'आप यहाँ तक पहुँच गए।',
  'finale.p1': 'हर टूटा पत्थर, हर खोजा गया रास्ता और हर पार की गई चुनौती ने आपको थोड़ा और आगे पहुँचाया।',
  'finale.p2': 'अंत में, सबसे बड़ा धन कभी भी केवल गुफा की गहराई में नहीं था, बल्कि उस साहस में जो रास्ता कठिन लगे तब भी आगे बढ़ने की हिम्मत में, अनजाने को जानने की उत्सुकता में, और एक बार फिर कोशिश करने की जिद में।',
  'finale.p3': 'यात्रा अभी समाप्त होती है, लेकिन हर खोजी जानता है कि हमेशा एक और रास्ता, एक और रहस्य और नई रोमांच यात्रा इंतज़ार में होती है।',
  'finale.p4': 'शायद यह तो बस पहली खुदाई थी।',
  'finale.p5': 'खेलने के लिए और अंत तक पहुँचने के लिए धन्यवाद।',
  'finale.signature': 'प्यार सहित,',
  'finale.team': 'आर्कएंजल सॉफ्ट टीम',
  'finale.closing': 'अगले रोमांच तक। ⛏️✨',
  'finale.skip': 'छोड़ें',
  'saves.relics': {
    one: '{count} अवशेष',
    other: '{count} अवशेष'
  },

  // --- भाषा स्क्रीन --------------------------------------------------------
  'language.title': 'भाषा',
  'language.hint': 'बदलाव तुरंत लागू होता है, दोबारा शुरू करने की ज़रूरत नहीं।',
  'language.current': 'मौजूदा',
  'language.back': 'वापस',

  // --- HUD ----------------------------------------------------------------
  'hud.cave': 'CAVE',
  'hud.biome': 'BIOME',
  'hud.coins': 'सिक्के',
  'hud.bombs': 'बम',
  'hud.relics': 'अवशेष',
  'hud.pickaxe': 'कुल्हाड़ी',
  'hud.hp': 'जीवन',
  'hud.titleLife': 'मौजूदा जीवन',
  'hud.titleCoins': 'इस रन में जुटाए सिक्के',
  'hud.titleBombs': 'इस Cave में अभी छिपे बम',
  'hud.titleRelics': 'संग्रह के अवशेष',
  'hud.titlePickaxe': 'कुल्हाड़ी का स्तर',
  'hud.utilitiesAria': 'रन की सामग्री',
  'hud.use': 'इस्तेमाल करें',
  'hud.utilityAria': '{name} ({count} बोरी में)। {description}',
  'hud.utilityTitle': '{name} · {count}',

  // --- फ़ुलस्क्रीन ---------------------------------------------------------
  'fullscreen.enter': 'फ़ुलस्क्रीन में जाएँ',
  'fullscreen.exit': 'फ़ुलस्क्रीन से बाहर आएँ',
  'fullscreen.exitWithKey': 'फ़ुलस्क्रीन से बाहर आएँ (Esc)',
  'fullscreen.closeNotice': 'सूचना बंद करें',
  'fullscreen.error.ios':
    'iPhone और iPad पर Safari में फ़ुलस्क्रीन नहीं होता। ब्राउज़र की पट्टी के बिना खेलने के लिए गेम को होम स्क्रीन पर जोड़ें।',
  'fullscreen.error.unsupported': 'यह ब्राउज़र वेब के लिए फ़ुलस्क्रीन नहीं देता। कुछ भी नहीं बदला गया।',
  'fullscreen.error.gesture': 'ब्राउज़र ने फ़ुलस्क्रीन मना कर दिया। दोबारा कोशिश के लिए "फ़ुलस्क्रीन" पर टैप करें।',
  'fullscreen.error.denied':
    'फ़ुलस्क्रीन में नहीं जाया जा सका। नीचे के कोने में मौजूद फ़ुलस्क्रीन बटन इस्तेमाल करें।',

  // --- बायोम चुनाव ---------------------------------------------------------
  'biomeSelect.title.menu': 'कोई Biome चुनें',
  'biomeSelect.title.next': 'अगला Biome',
  'biomeSelect.devMode': 'डेवलपर मोड',
  'biomeSelect.bestCave': 'सबसे अच्छी Cave {n}',
  'biomeSelect.status.locked': 'बंद',
  'biomeSelect.status.dev': 'Dev',
  'biomeSelect.status.completed': 'पूरी हुई',
  'biomeSelect.status.available': 'उपलब्ध',
  'biomeSelect.status.visited': 'देखी गई',
  'biomeSelect.unlockAt': 'Cave {n}',
  'biomeSelect.start': 'इस Biome में शुरू करें',
  'biomeSelect.enter': 'Biome में जाएँ',
  'biomeSelect.enterCave': 'Cave {n} में प्रवेश करें',

  // --- सेटिंग्स ------------------------------------------------------------
  'settings.title': 'सेटिंग्स',
  'settings.fullscreen': 'शुरू होते ही फ़ुलस्क्रीन',
  'settings.fullscreenPwaHint':
    'iPhone और iPad पर Safari में फ़ुलस्क्रीन नहीं होता — होम स्क्रीन से इंस्टॉल करें।',
  'settings.rememberRun': 'मेरी प्रगति याद रखें',
  'settings.devMode': 'डेवलपर मोड',
  'settings.devNote': '{total} में से {unlocked} Biome खुले',
  'settings.input': 'इनपुट',
  'settings.inputReduced': 'कम',
  'settings.inputAnimated': 'एनिमेटेड',
  'settings.orientation': 'सुझाई गई दिशा',
  'settings.orientationLandscape': 'लैंडस्केप',
  'settings.orientationLandscapeDesktop': 'लैंडस्केप (डेस्कटॉप)',
  'settings.bestCaveRecorded': 'दर्ज सबसे अच्छी Cave',

  // --- जानकारी --------------------------------------------------------------
  'info.title': 'प्रगति की जानकारी',
  'info.biomesUnlocked': 'खुले हुए Biome',
  'info.devModeBestCave': 'डेवलपर मोड · सबसे अच्छी Cave {n}',
  'info.currentBiome': 'मौजूदा Biome',
  'info.currentCave': 'मौजूदा Cave',
  'info.objectives': 'लक्ष्य',
  'info.relics': 'अवशेष',
  'info.totalRelics': 'कुल {n}',

  // --- लॉबी ------------------------------------------------------------------
  'lobby.defeatBadge': 'हार',
  'lobby.victoryBadge': 'जीत',
  'lobby.defeatTitle': 'आप हार गए',
  'lobby.clearTitle': 'Cave {cave} पूरी हुई',
  'lobby.coins': 'सिक्के',
  'lobby.life': 'जीवन',
  'lobby.pickaxe': 'कुल्हाड़ी',
  'lobby.next': 'अगली',
  'lobby.chooseUpgrade': 'अपना सुधार चुनें',
  'lobby.chooseUpgradeSub': 'अगली Cave के लिए 1 सुधार चुनें।',
  'lobby.chooseUpgradeFixedSub': 'बधाई हो, आपने "{biome}" बायोम पूरा कर लिया। उपहार के रूप में एक ऐसा सुधार चुनें जो आपके साथ खेल के अंत तक रहे।',
  'lobby.reroll': 'बदलें · {n}',
  'lobby.rerollMissing': '{n} बाकी',
  'lobby.noUpgradesLeft': 'इस रन में सुधार की सभी शाखाएँ पहले ही अपनी सीमा पर हैं।',
  'lobby.nextCave': 'अगली Cave',
  'lobby.utilityShop': 'सामग्री की दुकान',
  'lobby.retry': 'फिर कोशिश करें',
  'lobby.mainMenu': 'मुख्य मेन्यू',

  // --- सामग्री की दुकान --------------------------------------------------------
  'shop.title': 'सामग्री की दुकान',
  'shop.subtitle': 'अगली खोज के लिए खपने वाली चीज़ें खरीदें।',
  'shop.inBag': 'बोरी में: {n}',
  'shop.buy': 'खरीदें · {n}',
  'shop.missing': '{n} बाकी',
  'shop.sell': 'बेचें · {n}',
  'shop.empty': 'कोई चीज़ नहीं',

  // --- रोक --------------------------------------------------------------------
  'pause.kicker': 'रुका हुआ',
  'pause.title': '{biome} · {cave}',
  'pause.message': 'Cave जमी हुई।',
  'pause.continue': 'जारी रखें',
  'pause.toMenu': 'मेन्यू पर जाएँ',
  'pause.hint': 'Esc से जारी',
  'pause.controllerHint': 'डी-पैड चलाता है · A पुष्टि करता है · B वापस जाता है · Start रोकता है',
  'hud.controller': '{name} जुड़ा',
  'pause.aria': 'खेल रुका हुआ है',

  // --- निकास का फ़ैसला -------------------------------------------------------
  'exit.badge': 'निकास मिल गया',
  'exit.question': 'आप क्या करना चाहते हैं?',
  'exit.nextCave': 'अगली Cave',
  'exit.keepExploring': 'इसी Cave में खोज जारी रखें',
  'exit.finale': 'अंत देखें',

  // --- घुमाना -----------------------------------------------------------------
  'rotate.hint': 'बेहतर खेलने के लिए फ़ोन घुमाकर लैंडस्केप में लाएँ।',
  'rotate.title': 'फ़ोन घुमाएँ',
  'rotate.playing': 'खेल जारी रखने के लिए डिवाइस लैंडस्केप में रखें।',
  'rotate.menu': 'मेन्यू खोलने के लिए डिवाइस लैंडस्केप में रखें।',

  // --- एक से ज़्यादा जगह दिखने वाले बटन ---------------------------------------
  'common.close': 'बंद करें',
  'common.back': 'वापस',
  'common.info': 'जानकारी',
  'common.resetProgress': 'प्रगति रीसेट करें',

  // --- सामग्री: सामग्री -------------------------------------------------------
  'utility.lifePotion.name': 'जीवन पोशन',
  'utility.lifePotion.description': 'रन के दौरान 1 जीवन बदला देती है।',
  'utility.revealBomb.name': 'ज़िद्दी-अंगूठा पोशन',
  'utility.revealBomb.description': 'मौजूदा नक्शे पर छिपा एक बम दिखा देती है।',
  'utility.safePath.name': 'सुरक्षित रास्ता पोशन',
  'utility.safePath.description': 'मौजूदा Cave के निकास तक का सुरक्षित रास्ता दिखाती है।',

  // --- सामग्री: सुधार ---------------------------------------------------------
  'reward.pickaxe.name': 'कुल्हाड़ी {tier}',
  'reward.pickaxe.first': '+1 कुल्हाड़ी स्तर: चट्टानें एक क्लिक कम में टूटेंगी।',
  'reward.pickaxe.next': '+1 कुल्हाड़ी स्तर। कुल्हाड़ी {tier} चाहिए।',
  'reward.fixed': 'स्थायी',
  'reward.vitality.name': 'जीवन {tier}',
  'reward.vitality.description': '+1 अधिकतम जीवन। अगली Cave पूरे जीवन से शुरू होगी।',
  'reward.coins.name': 'सिक्के {tier}',
  'reward.coins.description': {
    one: '+{count} सिक्का जुटाने की {chance}% संभावना।',
    other: '+{count} सिक्के जुटाने की {chance}% संभावना।'
  },
  'reward.rocks.name': 'चट्टानें {tier}',
  'reward.rocks.description': {
    one: '+{count} चट्टान तोड़ने की {chance}% संभावना।',
    other: '+{count} चट्टानें तोड़ने की {chance}% संभावना।'
  },
  'reward.utility.name': 'सामग्री {tier}',
  'reward.utility.description':
    'चट्टान तोड़ते समय 1 बेतरतीब सामग्री मिलने की {chance}% संभावना।',
  'reward.bomb.name': 'बम {tier}',
  'reward.bomb.description': 'चट्टान तोड़ते समय 1 बेतरतीब बम दिखने की {chance}% संभावना।',

  // --- सामग्री: Biome ---------------------------------------------------------
  'biome.sunstone.name': 'सनस्टोन खदान',
  'biome.sunstone.range': 'Caves 1-10',
  'biome.frost.name': 'बर्फ़ की गुफा',
  'biome.frost.range': 'Caves 11-20',
  'biome.ember.name': 'लाल गहराइयाँ',
  'biome.ember.range': 'Caves 21-30',
  'biome.ruins.name': 'गहरे खंडहर',
  'biome.ruins.range': 'Caves 31-40',
  'biome.wind.name': 'हवा की गैलरी',
  'biome.wind.range': 'Caves 41-50',
  'biome.crystal.name': 'क्रिस्टल कक्ष',
  'biome.crystal.range': 'Caves 51-60',

  // --- सामग्री: अवशेष ---------------------------------------------------------
  'relic.amber_fang.name': 'अंबर का दाँत',
  'relic.amber_fang.description': 'सनस्टोन खदान में खोया गया जीवाश्म टुकड़ा।',
  'relic.frost_bloom.name': 'पाले का फूल',
  'relic.frost_bloom.description': 'जमी हुई गुफाओं का दुर्लभ क्रिस्टल।',
  'relic.ember_core.name': 'चमकता केंद्रक',
  'relic.ember_core.description': 'गहराइयों के बीच में गरम की गई जीवित चट्टान।',
  'relic.ruin_tablet.name': 'खंडहरों की शिला',
  'relic.ruin_tablet.description': 'गहरे खंडहरों से लाई गई प्राचीन अंकन।',
  'relic.gust_shell.name': 'झोंका कपड़ा',
  'relic.gust_shell.description': 'खोखला shell जो हवा चलने पर गाता है।',
  'relic.prism_core.name': 'प्रिज़्म केंद्रक',
  'relic.prism_core.description': 'क्रिस्टल कक्ष का दिल।',

  // --- सामग्री: लक्ष्य ----------------------------------------------------------
  'objective.rocks.label': 'चट्टान तोड़नेवाला',
  'objective.rocks.description': 'कुल 40 चट्टानें तोड़ें।',
  'objective.coins.label': 'खोजी',
  'objective.coins.description': 'कुल 80 सिक्के जुटाएँ।',
  'objective.caves.label': 'खोजी-बार',
  'objective.caves.description': '8 Caves पूरी करें।',
  'objective.relics.label': 'अवशेष संग्रहकर्ता',
  'objective.relics.description': '4 अवशेष पाएँ।',

  // --- रन के संदेश --------------------------------------------------------------
  'msg.intro': 'शुरू करने के लिए खुले इलाके के किनारे एक चट्टान तोड़ें।',
  'msg.enterCave': 'आप {biome} की Cave {cave} में पहुँचे।',
  'msg.reroll': '{n} सिक्कों में सुधार बदले गए।',
  'msg.utilityAdded': '{name} रन की बोरी में जोड़ी गई।',
  'msg.utilitySold': '{name} {n} सिक्कों में बेची गई।',
  'msg.chooseNextCave': 'आपने अगली Cave पर जाने का फ़ैसला किया।',
  'msg.exitToCave': 'आपने Cave {n} पर जाने का फ़ैसला किया।',
  'msg.rewardChosen': '{reward} चुनी गई। जीवन भरा गया। आप {biome} की Cave {cave} में पहुँचे।',
  'msg.defeat':
    'आप हार गए। सुधार मौजूदा Biome की शुरुआत पर लौट गए, पर आपके सिक्के, लक्ष्य और अवशेष बने रहे।',
  'msg.foundExit': 'आपको निकास मिल गया। अगली Cave पर जाएँ, या इसी में खोज जारी रखें?',
  'msg.deathLobby': 'आपका जीवन ख़त्म हो गया और आप लॉबी वापस चले गए।',

  // --- तोड़ने के संदेश -----------------------------------------------------------
  'msg.coinBonus': 'बोनस तोड़!',
  'msg.unluckyBonus': 'मदहूम बोनस तोड़!',
  'msg.coinFound': {
    one: 'आपको {count} सिक्का मिला।',
    other: 'आपको {count} सिक्के मिले।'
  },
  'msg.defeatDev': 'आप हार गए। सुधार वर्तमान बायोम की शुरुआत पर लौट गए, सिवाह छोड़कर — किल्फ़ा टेस्ट किट का हिस्सा है। आपके सिक्के, लक्ष्य और अवशेष सुरक्षित रहे।',
  'msg.bombHit': 'बम! बचा जीवन: {n}।',
  'msg.relicFound': 'आपको अवशेष {relic} मिला।',
  'msg.emptyBonus': 'बोनस तोड़! अतिरिक्त चट्टान खाली निकली।',
  'msg.empty': 'सिर्फ़ पत्थर और धूल... खोदना जारी रखें।',
  'msg.exitBonus': 'बोनस तोड़! आपको छिपा निकास मिल गया। निकलने का फ़ैसला करने के लिए छेद पर क्लिक करें।',
  'msg.exitHidden': 'आपको इस Cave का छिपा निकास मिल गया। निकलने का फ़ैसला करने के लिए छेद पर क्लिक करें।',
  'msg.bombRevealed': 'नक्शे पर एक छिपा बम दिखा दिया गया।',

  // --- सामग्री के संदेश ------------------------------------------------------------
  'msg.utilityReward': '+1 सामग्री',
  'msg.utilityDropFound': "आपको एक बोनस सामग्री मिली: {name}।",
  'msg.lifeUsed': "जीवन पोशन इस्तेमाल हुई। मौजूदा जीवन: {hp}/{max}।",
  'msg.utilityMissing': 'आपके पास यह सामग्री बोरी में नहीं है।',
  'msg.lifeFull': 'आपका जीवन पहले से ही भरा है — पोशन रख ली गई।',
  'msg.noBombsLeft': 'इस Cave में कोई छिपा बम नहीं बचा।',
  'msg.revealUsed': 'ज़िद्दी-अंगूठा पोशन इस्तेमाल हुई। नक्शे पर एक बम दिखा दिया गया।',
  'msg.noSafeRoute': 'इस Cave में निकास तक बम-रहित कोई रास्ता नहीं है।',
  'msg.safePathUsed': 'सुरक्षित रास्ता पोशन इस्तेमाल हुई। निकास तक का हरा रास्ता दिखा दिया गया।',

  // --- दृश्य में बनाया गया टेक्स्ट -----------------------------------------------------
  'scene.markerIn': 'IN',
  'scene.markerOut': 'निकास',

  // --- lore de entrada dos biomas -----------------------------------------
  'lore.falante': 'खनिक',
  'lore.dicaAvancar': 'जारी रखने के लिए क्लिक करें या A दबाएं',
  'lore.dicaPular': 'छोड़ने के लिए Enter या B दबाएं',
  'lore.painel': '{n}/{total}',
  'lore.sunstone.p1.a': 'ये आवाज़ कैसी थी??',
  'lore.sunstone.p2.a': 'बिल्कुल! मैं रास्ता भूल गया हूँ!',
  'lore.sunstone.p2.b': 'मुझे पता था कि इतनी गहराई तक नहीं आना चाहिए!!',
  'lore.sunstone.p3.a': 'कम से कम मेरा उपकरण तो है!!',
  'lore.sunstone.p3.b': 'अब बस यहाँ से निकलना है!!',
  'lore.sunstone.p4.a': 'समस्या यह है कि यह जगह बमों से भरी हुई है!!',
  'lore.sunstone.p5.a': 'एक गलत कदम और "BOOM"...',
  'lore.sunstone.p6.a': 'अच्छा...तो मैं यहाँ हमेशा नहीं ठहरूँगा..चलो!!!',
};
