/**
 * 简体中文。
 *
 * 中文没有单复数之分，所以这里每个需要复数的键只写 `other` 一条。词形选择的
 * 逻辑照样会先去找 `one`、再找 `few`、再找 `many`，找不到才落到 `other` ——
 * 也就是说这套机制对中文是照常运行的，只不过规则决定它永远只选 `other`。
 *
 * 为了和 HUD 里的排版一致，洞穴、生物这类词在中文里保留英文。混排是中文游戏
 * 界面的常态，玩家看的是意思，不是词汇的来历。
 */
export default {
  // --- 品牌与菜单 ---------------------------------------------------------
  'menu.kicker': 'ArchangelSoft',
  'menu.taglineTail': '没有第二次机会',
  'menu.taglineCaves': {
    other: '{count} 个 Cave'
  },
  'menu.taglineBiomes': {
    other: '{count} 个 Biome'
  },
  'menu.enter': '开始',
  'menu.settings': '设置',
  'menu.info': '信息',
  'menu.mainAria': '主菜单',

  // --- jogos salvos --------------------------------------------------------
  'saves.title': '选择存档',
  'saves.subtitle': '每个存档单独保存自己的洞穴、金币、遗物和收藏。',
  'saves.newGame': '新游戏',
  'saves.nameLabel': '存档名称',
  'saves.namePlaceholder': '我的存档',
  'saves.create': '创建并开始',
  'saves.empty': '还没有存档。',
  'saves.emptyHint': '给第一个存档起个名字，就能开始了。',
  'saves.play': '开始游戏',
  'saves.rename': '重命名',
  'saves.renameTitle': '重命名存档',
  'saves.saveName': '保存名称',
  'saves.delete': '删除',
  'saves.deleteTitle': '删除存档',
  'saves.deleteConfirm': '确定删除“{name}”？这个存档的金币、遗物和洞穴都会消失，无法撤销。',
  'saves.playedOn': '游玩于 {date}',
  'saves.current': '进行中',
  'saves.testGame': '测试',
  'saves.blockedNeedsDev': '打开测试存档需要开启开发者模式。',
  'saves.blockedNeedsStandard': '打开正式存档需要关闭开发者模式。',
  'saves.nameTaken': '已经有同名的存档了。仍然可以用这个名字。',
  'saves.ariaList': '已保存的存档',

  // --- final ---------------------------------------------------------------
  'finale.title': '你走到了这里。',
  'finale.p1': '每一块破碎的岩石、每一条发现的道路、每一次战胜的挑战，都让你走得再远一点。',
  'finale.p2': '到最后，最宝贵的财富从来都不只在洞穴的深处，更在于道路看似艰难时仍继续前行的勇气、探索未知的渴望，以及再试一次的那份坚持。',
  'finale.p3': '旅程到此暂告一段落，但每一位探险者都知道：永远还有另一条通道、另一个谜团，以及一场等待被发现的全新冒险。',
  'finale.p4': '也许这只是一次最初的挖掘。',
  'finale.p5': '感谢你游玩，也感谢你走到最后。',
  'finale.signature': '衷心地，',
  'finale.team': 'Archangel Soft 团队',
  'finale.closing': '下次冒险再见。⛏️✨',
  'finale.skip': '跳过',
  'saves.relics': {
    other: '{count} 件遗物'
  },

  // --- 语言界面 ------------------------------------------------------------
  'language.title': '语言',
  'language.hint': '切换立即生效，无需重新开始。',
  'language.current': '当前',
  'language.back': '返回',

  // --- HUD -----------------------------------------------------------------
  'hud.cave': 'CAVE',
  'hud.biome': 'BIOME',
  'hud.coins': '金币',
  'hud.bombs': '炸弹',
  'hud.relics': '遗物',
  'hud.pickaxe': '镐',
  'hud.hp': '生命',
  'hud.titleLife': '当前生命',
  'hud.titleCoins': '本轮收集的金币',
  'hud.titleBombs': '这个 Cave 里还藏着的炸弹',
  'hud.titleRelics': '收藏中的遗物',
  'hud.titlePickaxe': '镐的等级',
  'hud.utilitiesAria': '本轮的道具',
  'hud.use': '使用',
  'hud.utilityAria': '{name}（背包里 {count} 个）。{description}',
  'hud.utilityTitle': '{name} · {count}',

  // --- 全屏 -----------------------------------------------------------------
  'fullscreen.enter': '进入全屏',
  'fullscreen.exit': '退出全屏',
  'fullscreen.exitWithKey': '退出全屏（Esc）',
  'fullscreen.closeNotice': '关闭提示',
  'fullscreen.error.ios':
    'iPhone 和 iPad 上的 Safari 没有全屏功能。把游戏加到主屏幕，就能在没有浏览器地址栏的情况下游玩。',
  'fullscreen.error.unsupported': '这个浏览器不提供网页全屏。没有做任何改动。',
  'fullscreen.error.gesture': '浏览器拒绝了全屏请求。点一下"全屏"再试一次。',
  'fullscreen.error.denied': '无法进入全屏。请使用底部角落的全屏按钮。',

  // --- 选择生物 ---------------------------------------------------------------
  'biomeSelect.title.menu': '选择一个 Biome',
  'biomeSelect.title.next': '下一个 Biome',
  'biomeSelect.devMode': '开发者模式',
  'biomeSelect.bestCave': '最好成绩 Cave {n}',
  'biomeSelect.status.locked': '未解锁',
  'biomeSelect.status.dev': 'Dev',
  'biomeSelect.status.completed': '已通关',
  'biomeSelect.status.available': '可进入',
  'biomeSelect.status.visited': '已到访',
  'biomeSelect.unlockAt': 'Cave {n}',
  'biomeSelect.start': '在这个 Biome 开始',
  'biomeSelect.enter': '进入该 Biome',
  'biomeSelect.enterCave': '进入 Cave {n}',

  // --- 设置 --------------------------------------------------------------------
  'settings.title': '设置',
  'settings.fullscreen': '开始时进入全屏',
  'settings.fullscreenPwaHint': 'iPhone 和 iPad 上的 Safari 没有全屏功能，请从主屏幕安装。',
  'settings.rememberRun': '记住我的进度',
  'settings.devMode': '开发者模式',
  'settings.devNote': '已解锁 {unlocked}/{total} 个 Biome',

  // --- 信息 -----------------------------------------------------------------------
  'info.title': '进度信息',
  'info.biomesUnlocked': '已解锁的 Biome',
  'info.devModeBestCave': '开发者模式 · 最好成绩 Cave {n}',
  'info.currentBiome': '当前 Biome',
  'info.currentCave': '当前 Cave',
  'info.objectives': '目标',
  'info.relics': '遗物',
  'info.totalRelics': '共 {n}',

  // --- 大厅 -----------------------------------------------------------------------
  'lobby.defeatBadge': '失败',
  'lobby.victoryBadge': '胜利',
  'lobby.defeatTitle': '你被击败了',
  'lobby.clearTitle': 'Cave {cave} 通关',
  'lobby.coins': '金币',
  'lobby.life': '生命',
  'lobby.pickaxe': '镐',
  'lobby.next': '下一关',
  'lobby.chooseUpgrade': '选择一项强化',
  'lobby.chooseUpgradeSub': '为下一个 Cave 选 1 项强化。',
  'lobby.chooseUpgradeFixedSub': '恭喜，你完成了"{biome}"生物群系。作为奖励，选择一项伴随你到通关的升级。',
  'lobby.reroll': '重抽 · {n}',
  'lobby.rerollMissing': '还差 {n}',
  'lobby.noUpgradesLeft': '本轮所有强化路线都已经到顶了。',
  'lobby.nextCave': '下一个 Cave',
  'lobby.utilityShop': '道具商店',
  'lobby.retry': '再试一次',
  'lobby.mainMenu': '主菜单',

  // --- 道具商店 -----------------------------------------------------------------------
  'shop.title': '道具商店',
  'shop.subtitle': '购买下一次探索要用的消耗品。',
  'shop.inBag': '背包里：{n}',
  'shop.buy': '购买 · {n}',
  'shop.missing': '还差 {n}',
  'shop.sell': '出售 · {n}',
  'shop.empty': '没有道具',

  // --- 暂停 ---------------------------------------------------------------------------
  'pause.kicker': '已暂停',
  'pause.title': '{biome} · {cave}',
  'pause.message': 'Cave 已冻结。',
  'pause.continue': '继续',
  'pause.toMenu': '回到菜单',
  'pause.hint': 'Esc 继续',
  'pause.controllerHint': '方向键移动 · A 确认 · B 返回 · Start 暂停',
  'hud.controller': '已连接 {name}',
  'pause.aria': '游戏已暂停',

  // --- 出口选择 -------------------------------------------------------------------------
  'exit.badge': '找到出口',
  'exit.question': '你想怎么做？',
  'exit.nextCave': '下一个 Cave',
  'exit.keepExploring': '继续探索这个 Cave',
  'exit.finale': '观看结局',

  // --- 旋转 -----------------------------------------------------------------------------
  'rotate.hint': '把手机横过来，横屏玩会更舒服。',
  'rotate.title': '把手机横过来',
  'rotate.playing': '要继续玩，请把设备横过来。',
  'rotate.menu': '把设备横过来才能打开菜单。',

  // --- 在多处出现的按钮 -------------------------------------------------------------------
  'common.close': '关闭',
  'common.back': '返回',
  'common.info': '信息',
  'common.resetProgress': '重置进度',

  // --- 内容：道具 -------------------------------------------------------------------------
  'utility.lifePotion.name': '生命药水',
  'utility.lifePotion.description': '本轮中恢复 1 点生命。',
  'utility.revealBomb.name': '犟指药水',
  'utility.revealBomb.description': '在当前地图上揭示一枚隐藏的炸弹。',
  'utility.safePath.name': '安全路线药水',
  'utility.safePath.description': '显示通往当前 Cave 出口的安全路线。',

  // --- 内容：强化 -------------------------------------------------------------------------
  'reward.pickaxe.name': '镐 {tier}',
  'reward.pickaxe.first': '镐 +1 级：敲碎岩石少一次点击。',
  'reward.pickaxe.next': '镐 +1 级。需要镐 {tier}。',
  'reward.fixed': '固定',
  'reward.vitality.name': '生命 {tier}',
  'reward.vitality.description': '最大生命 +1。下一个 Cave 以满生命开始。',
  'reward.coins.name': '金币 {tier}',
  'reward.coins.description': {
    other: '{chance}% 的概率多拿 {count} 枚金币。'
  },
  'reward.rocks.name': '岩石 {tier}',
  'reward.rocks.description': {
    other: '{chance}% 的概率多敲碎 {count} 块岩石。'
  },
  'reward.utility.name': '道具 {tier}',
  'reward.utility.description': '{chance}% 的概率在敲碎岩石时获得 1 件随机道具。',
  'reward.bomb.name': '炸弹 {tier}',
  'reward.bomb.description': '{chance}% 的概率在敲碎岩石时揭示 1 枚随机炸弹。',

  // --- 内容：Biome --------------------------------------------------------------------------
  'biome.sunstone.name': '阳石矿坑',
  'biome.sunstone.range': 'Cave 1-10',
  'biome.frost.name': '冰窟',
  'biome.frost.range': 'Cave 11-20',
  'biome.ember.name': '赤红深渊',
  'biome.ember.range': 'Cave 21-30',
  'biome.ruins.name': '深渊遗迹',
  'biome.ruins.range': 'Cave 31-40',
  'biome.wind.name': '风之回廊',
  'biome.wind.range': 'Cave 41-50',
  'biome.crystal.name': '水晶密室',
  'biome.crystal.range': 'Cave 51-60',

  // --- 内容：遗物 ---------------------------------------------------------------------------
  'relic.amber_fang.name': '琥珀獠牙',
  'relic.amber_fang.description': '在阳石矿坑遗失的化石碎片。',
  'relic.frost_bloom.name': '霜之花',
  'relic.frost_bloom.description': '冰封洞窟里罕见的有机水晶。',
  'relic.ember_core.name': '炽热核心',
  'relic.ember_core.description': '在深渊中心被加热的活岩。',
  'relic.ruin_tablet.name': '遗迹石板',
  'relic.ruin_tablet.description': '从深渊遗迹带回的远古铭文。',
  'relic.gust_shell.name': '疾风贝壳',
  'relic.gust_shell.description': '风掠过时会唱歌的空壳。',
  'relic.prism_core.name': '棱镜核心',
  'relic.prism_core.description': '水晶密室的心脏。',

  // --- 内容：目标 ---------------------------------------------------------------------------
  'objective.rocks.label': '碎岩者',
  'objective.rocks.description': '一共敲碎 40 块岩石。',
  'objective.coins.label': '淘金者',
  'objective.coins.description': '一共收集 80 枚金币。',
  'objective.caves.label': '探索者',
  'objective.caves.description': '通关 8 个 Cave。',
  'objective.relics.label': '收藏家',
  'objective.relics.description': '找到 4 件遗物。',

  // --- 回合消息 ---------------------------------------------------------------------------
  'msg.intro': '敲碎开阔区边缘的一块岩石开始游戏。',
  'msg.enterCave': '你进入了 {biome} 的 Cave {cave}。',
  'msg.reroll': '花 {n} 枚金币重抽了强化。',
  'msg.utilityAdded': '{name} 已放入本轮背包。',
  'msg.utilitySold': '{name} 卖了 {n} 枚金币。',
  'msg.chooseNextCave': '你决定前往下一个 Cave。',
  'msg.exitToCave': '你决定前往 Cave {n}。',
  'msg.rewardChosen': '已选择 {reward}。生命回满。你进入了 {biome} 的 Cave {cave}。',
  'msg.defeat': '你被击败了。强化退回当前 Biome 的起点，但金币、目标和遗物都保留了。',
  'msg.foundExit': '你找到了出口。去下一个 Cave，还是继续探索这里？',
  'msg.deathLobby': '你耗尽了生命，回到了大厅。',

  // --- 敲碎时的消息 -------------------------------------------------------------------------
  'msg.coinBonus': '额外敲碎！',
  'msg.unluckyBonus': '倒霉的额外敲碎！',
  'msg.coinFound': {
    other: '你找到了 {count} 枚金币。'
  },
  'msg.defeatDev': '你失败了。升级回到了当前生物群系的起点，但属于测试套装的镐除外。你的金币、目标和遗物都保留了。',
  'msg.bombHit': '炸弹！剩余生命：{n}。',
  'msg.relicFound': '你找到了遗物 {relic}。',
  'msg.emptyBonus': '额外敲碎！多出来的那块岩石是空的。',
  'msg.empty': '只有石头和灰尘……继续挖吧。',
  'msg.exitBonus': '额外敲碎！你找到了隐藏出口。点一下洞口，决定要不要出去。',
  'msg.exitHidden': '你找到了这个 Cave 的隐藏出口。点一下洞口，决定要不要出去。',
  'msg.bombRevealed': '地图上揭示了一枚隐藏的炸弹。',

  // --- 道具消息 ---------------------------------------------------------------------------
  'msg.utilityReward': '+1 道具',
  'msg.utilityDropFound': "你获得了一件额外道具：{name}。",
  'msg.lifeUsed': "已使用生命药水。当前生命：{hp}/{max}。",
  'msg.utilityMissing': '你的背包里没有这件道具。',
  'msg.lifeFull': '你的生命已经满了——药水已保留。',
  'msg.noBombsLeft': '这个 Cave 里已经没有隐藏的炸弹了。',
  'msg.revealUsed': '已使用犟指药水。地图上揭示了一枚炸弹。',
  'msg.noSafeRoute': '这个 Cave 里没有避开炸弹的路线通往出口。',
  'msg.safePathUsed': '已使用安全路线药水。通往出口的绿色路线已显示。',

  // --- 场景里画出来的文字 ---------------------------------------------------------------------
  'scene.markerIn': 'IN',
  'scene.markerOut': '出口',

  // --- lore de entrada dos biomas -----------------------------------------
  'lore.falante': '矿工',
  'lore.dicaAvancar': '点击或按 A 继续',
  'lore.dicaPular': '按 Enter 或 B 跳过',
  'lore.painel': '{n}/{total}',
  'lore.sunstone.p1.a': '刚才那是什么声音??',
  'lore.sunstone.p2.a': '好极了！我迷路了！',
  'lore.sunstone.p2.b': '我就知道不该下到这么深!!',
  'lore.sunstone.p3.a': '至少我还有装备!!',
  'lore.sunstone.p3.b': '现在只要离开这里就行了!!',
  'lore.sunstone.p4.a': '问题是这个地方到处都是炸弹!!',
  'lore.sunstone.p5.a': '一步走错就是"BOOM"……',
  'lore.sunstone.p6.a': '好吧...我不可能永远待在这里..出发!!!',
  'lore.frost.p1.a': '好冷.....',
  'lore.frost.p2.a': '我的地图上可没有这种地方，就叫它冰窟吧。',
  'lore.frost.p3.a': '我以为会更容易.....',
  'lore.frost.p4.a': '嗯，看样子这里可不只是炸弹乱放!!',
  'lore.frost.p4.b': '我可以利用找到的补给更快地离开这里!!',
  'lore.frost.p5.a': '继续走吧!!',
  'lore.ember.p1.a': '太热了....',
  'lore.ember.p2.a': '我得保持专注，还早着呢...',
  'lore.ember.p3.a': '照这个速度，我很快就能完成!!',
  'lore.ember.p4.a': '话虽如此....快跑!!!!',
  'lore.ruins.p1.a': '这地方太不可思议了!!!!',
  'lore.ruins.p2.a': '这是某个古代文明的遗迹!',
  'lore.ruins.p3.a': '也许哪天我会回来继续探索!',
  'lore.ruins.p4.a': '现在我得往前走了!!',
  'lore.wind.p1.a': '呜噢噢...抓紧!!',
  'lore.wind.p2.a': '这场狂风大概说明出口就在附近。',
  'lore.wind.p3.a': '真等不及想洗个澡了!',
  'lore.wind.p4.a': '出发!',
  'lore.crystal.p1.a': '我累了，老板!',
  'lore.crystal.p2.a': '我想出口应该不远了',
  'lore.crystal.p3.a': '这地方真阴森!!!',
  'lore.crystal.p4.a': '这些晶体看起来很锋利...还是慢一点好....',

  // --- cena final antes do fim do jogo ---------------
  'cenaFinal.dica': '点击继续',

  // --- cena final ------------------------------------------
  'cenaFinal.falante': '矿工',
  'cenaFinal.p1.a': 'AAAAHH 老兄.....',
  'cenaFinal.p2.a': '终于到出口了',
  'cenaFinal.p3.a': '我得停止收拾这些烂摊子了...嘿嘿嘿',
  'cenaFinal.p4.a': '好吧...现在只剩下出口了!!!!!',

  // --- ponteiro do menu --------------------------------------
  'settings.pointerSensitivity': '指针灵敏度',
  'settings.pointerLess': '降低',
  'settings.pointerMore': '提高',
  'settings.pointerPercent': '{valor}%',
};
