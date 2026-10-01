/**
 * 日本語。
 *
 * 日本語にも単数複数の区別がないため、複数形のキーは `other` 一つだけを持つ。
 * 語形を選ぶ仕組みは通常どおり動くが、実際に選ばれるのは常に `other` だけになる。
 *
 * 洞窟や Biome という単語は日本語にそのまま置き換える意味がないため、意図的に
 * 英語のまま残してある。日本語のゲーム UI で英単語が混ざるのは普通で、プレイヤーが
 * 見ているのは語源ではなく意味だから。
 */
export default {
  // --- ブランドとメニュー ---------------------------------------------------
  'menu.kicker': 'ArchangelSoft',
  'menu.taglineTail': '二度在手はない',
  'menu.taglineCaves': {
    other: 'Cave {count} 個'
  },
  'menu.taglineBiomes': {
    other: 'Biome {count} 種類'
  },
  'menu.enter': 'プレイ',
  'menu.settings': '設定',
  'menu.info': '情報',
  'menu.mainAria': 'メインメニュー',

  // --- jogos salvos --------------------------------------------------------
  'saves.title': 'ゲームを選択',
  'saves.subtitle': '各ゲームは洞窟・コイン・遺物・コレクションをそれぞれ保存します。',
  'saves.newGame': 'あたらしいゲーム',
  'saves.nameLabel': 'ゲーム名',
  'saves.namePlaceholder': 'マイゲーム',
  'saves.create': '作成してプレイ',
  'saves.empty': 'まだゲームがありません。',
  'saves.emptyHint': '最初のゲームに名前をつけて始めましょう。',
  'saves.play': 'プレイ',
  'saves.rename': '名前を変更',
  'saves.renameTitle': 'ゲーム名を変更',
  'saves.saveName': '名前を保存',
  'saves.delete': '削除',
  'saves.deleteTitle': 'ゲームを削除',
  'saves.deleteConfirm': '「{name}」を削除しますか？このゲームのコイン・遺物・洞窟は失われます。元に戻せません。',
  'saves.playedOn': 'プレイ日時: {date}',
  'saves.current': 'プレイ中',
  'saves.testGame': 'テスト',
  'saves.blockedNeedsDev': 'テスト用存档を開くには開発者モードをオンにしてください。',
  'saves.blockedNeedsStandard': '本物のゲームを開くには開発者モードをオフにしてください。',
  'saves.nameTaken': '同じ名前のゲームがすでにあります。そのまま使うこともできます。',
  'saves.ariaList': '保存されたゲーム',

  // --- final ---------------------------------------------------------------
  'finale.title': 'ここまで辿り着きました。',
  'finale.p1': '割れた石ひとつ、発見した道ひとつ、乗り越えた試練ひとつが、あなたを少しずつ遠くまで導きました。',
  'finale.p2': '結局、もっとも大きな富は洞窟の深部にだけあったのではありません。道は困難に見えるときにも踏み続ける勇気と、未知を覗き求める好奇心と、もう一度試す根気が集まったものに過ぎません。',
  'finale.p3': '旅はここで一度終わりますが、すべての探検者は知っています。必ずもう一つの通路、もう一つの謎、そして発見を待つ新たな冒険が待っています。',
  'finale.p4': 'この穴掘りは始至终最初の一手にすぎないかもしれません。',
  'finale.p5': 'プレイしてきて、最後まで辿り着いてくれたことに感謝します。',
  'finale.signature': '心より、',
  'finale.team': 'Archangel Soft チーム',
  'finale.closing': '次の冒険まで。⛏️✨',
  'finale.skip': 'スキップ',
  'saves.relics': {
    other: '遺物 {count} 個'
  },

  // --- 言語画面 ---------------------------------------------------------------
  'language.title': '言語',
  'language.hint': '変更はすぐ反映されます。再起動は不要です。',
  'language.current': '現在',
  'language.back': 'もどる',

  // --- HUD --------------------------------------------------------------------
  'hud.cave': 'CAVE',
  'hud.biome': 'BIOME',
  'hud.coins': 'コイン',
  'hud.bombs': '爆弾',
  'hud.relics': 'レリック',
  'hud.pickaxe': 'ツルハシ',
  'hud.hp': 'HP',
  'hud.titleLife': '現在の体力',
  'hud.titleCoins': '今回のランで集めたコイン',
  'hud.titleBombs': 'この Cave にまだ隠れている爆弾',
  'hud.titleRelics': 'コレクションのレリック',
  'hud.titlePickaxe': 'ツルハシのレベル',
  'hud.utilitiesAria': 'ランのアイテム',
  'hud.use': '使う',
  'hud.utilityAria': '{name}（かばんの中 {count} 個）。{description}',
  'hud.utilityTitle': '{name} · {count}',

  // --- フルスクリーン ---------------------------------------------------------
  'fullscreen.enter': 'フルスクリーンにする',
  'fullscreen.exit': 'フルスクリーンをやめる',
  'fullscreen.exitWithKey': 'フルスクリーンをやめる（Esc）',
  'fullscreen.closeNotice': 'お知らせを閉じる',
  'fullscreen.error.ios':
    'iPhone と iPad の Safari にはフルスクリーンがありません。ホーム画面にゲームを追加すると、ブラウザの枠なしで遊べます。',
  'fullscreen.error.unsupported': 'このブラウザはウェブのフルスクリーンに対応していません。何も変更していません。',
  'fullscreen.error.gesture': 'ブラウザがフルスクリーンを拒否しました。「フルスクリーン」をタップしてもう一度お試しください。',
  'fullscreen.error.denied': 'フルスクリーンに入れませんでした。下隅のフルスクリーンボタンを使ってください。',

  // --- Biome の選択 -------------------------------------------------------------
  'biomeSelect.title.menu': 'Biome を選ぶ',
  'biomeSelect.title.next': '次の Biome',
  'biomeSelect.devMode': '開発者モード',
  'biomeSelect.bestCave': '最高記録 Cave {n}',
  'biomeSelect.status.locked': 'ロック中',
  'biomeSelect.status.dev': 'Dev',
  'biomeSelect.status.completed': 'クリア済み',
  'biomeSelect.status.available': '入れます',
  'biomeSelect.status.visited': '訪問済み',
  'biomeSelect.unlockAt': 'Cave {n}',
  'biomeSelect.start': 'この Biome で始める',
  'biomeSelect.enter': 'Biome に入る',
  'biomeSelect.enterCave': 'Cave {n} に入る',

  // --- 設定 ------------------------------------------------------------------------
  'settings.title': '設定',
  'settings.fullscreen': '開始をフルスクリーンで',
  'settings.fullscreenPwaHint': 'iPhone と iPad の Safari にはフルスクリーンがないため、ホーム画面からインストールしてください。',
  'settings.rememberRun': '進捗を記憶する',
  'settings.devMode': '開発者モード',
  'settings.devNote': '{total} 個中 {unlocked} 個の Biome が解放済み',
  'settings.input': '入力',
  'settings.inputReduced': '控えめ',
  'settings.inputAnimated': 'アニメーション',
  'settings.orientation': '推奨の向き',
  'settings.orientationLandscape': '横向き',
  'settings.orientationLandscapeDesktop': '横向き（デスクトップ）',
  'settings.bestCaveRecorded': '記録された最高 Cave',

  // --- 情報 --------------------------------------------------------------------------
  'info.title': '進捗の情報',
  'info.biomesUnlocked': '解放済みの Biome',
  'info.devModeBestCave': '開発者モード · 最高記録 Cave {n}',
  'info.currentBiome': '現在の Biome',
  'info.currentCave': '現在の Cave',
  'info.objectives': '目標',
  'info.relics': 'レリック',
  'info.totalRelics': '合計 {n}',

  // --- ロビー ---------------------------------------------------------------------------
  'lobby.defeatBadge': '敗北',
  'lobby.victoryBadge': '勝利',
  'lobby.defeatTitle': '敗北しました',
  'lobby.clearTitle': 'Cave {cave} クリア',
  'lobby.coins': 'コイン',
  'lobby.life': '体力',
  'lobby.pickaxe': 'ツルハシ',
  'lobby.next': '次の',
  'lobby.chooseUpgrade': '強化を選ぼう',
  'lobby.chooseUpgradeSub': '次の Cave に向けて強化を 1 つ選んでください。',
  'lobby.chooseUpgradeFixedSub': 'おめでとう、「{biome}」のバイオムをクリアしました。報酬として、ゲームの最後まで付き했지만う改善を1つ選んでください。',
  'lobby.reroll': '引き直し · {n}',
  'lobby.rerollMissing': 'あと {n}',
  'lobby.noUpgradesLeft': '今回のランではすべての強化路線が上限に達しています。',
  'lobby.nextCave': '次の Cave',
  'lobby.utilityShop': 'アイテムショップ',
  'lobby.retry': 'もう一度',
  'lobby.mainMenu': 'メインメニュー',

  // --- アイテムショップ -------------------------------------------------------------------
  'shop.title': 'アイテムショップ',
  'shop.subtitle': '次の探索で使う消耗品を買えます。',
  'shop.inBag': 'かばんの中：{n}',
  'shop.buy': '買う · {n}',
  'shop.missing': 'あと {n}',
  'shop.sell': '売る · {n}',
  'shop.empty': 'アイテムなし',

  // --- 一時停止 ----------------------------------------------------------------------------
  'pause.kicker': '一時停止',
  'pause.title': '{biome} · {cave}',
  'pause.message': 'Cave を止めています。',
  'pause.continue': 'つづける',
  'pause.toMenu': 'メニューに戻る',
  'pause.hint': 'Esc で再開',
  'pause.controllerHint': '十字キーで移動 · A で決定 · B で戻る · Start でポーズ',
  'hud.controller': '{name} 接続中',
  'pause.aria': '一時停止中',

  // --- 出口の選択 ----------------------------------------------------------------------------
  'exit.badge': '出口を発見',
  'exit.question': 'どうしますか？',
  'exit.nextCave': '次の Cave',
  'exit.keepExploring': 'この Cave を探索をつづける',
  'exit.finale': 'エンディングを見る',

  // --- 回転-----------------------------------------------------------------------------------
  'rotate.hint': '横向きにすると遊びやすくなります。',
  'rotate.title': '端末を横向きに',
  'rotate.playing': 'つづけるには、端末を横向きにしてください。',
  'rotate.menu': 'メニューを出すには、端末を横向きにしてください。',

  // --- 複数の場所に出るボタン -------------------------------------------------------------------
  'common.close': '閉じる',
  'common.back': 'もどる',
  'common.info': '情報',
  'common.resetProgress': '進捗をリセット',

  // --- 内容：アイテム ---------------------------------------------------------------------------
  'utility.lifePotion.name': '生命のポーション',
  'utility.lifePotion.description': '今回のランでHPを1回復する。',
  'utility.revealBomb.name': '頑固な指のポーション',
  'utility.revealBomb.description': '現在の地図で隠された爆弾を1つ見つけ出す。',
  'utility.safePath.name': '安全な道のポーション',
  'utility.safePath.description': '現在のCaveの出口までの安全な道を示す。',

  // --- 内容：強化 ------------------------------------------------------------------------------
  'reward.pickaxe.name': 'ツルハシ {tier}',
  'reward.pickaxe.first': 'ツルハシ+1レベル：岩の叩き割りが1回減る。',
  'reward.pickaxe.next': 'ツルハシ+1レベル。ツルハシ {tier} が必要。',
  'reward.fixed': '固定',
  'reward.vitality.name': '体力 {tier}',
  'reward.vitality.description': '最大HP+1。次のCaveは満タンで始まる。',
  'reward.coins.name': 'コイン {tier}',
  'reward.coins.description': {
    other: 'コインを {count} 枚多く拾える確率 {chance}%。'
  },
  'reward.rocks.name': '岩 {tier}',
  'reward.rocks.description': {
    other: '岩を {count} 個多く叩き割れる確率 {chance}%。'
  },
  'reward.utility.name': 'アイテム {tier}',
  'reward.utility.description': '岩を叩いたときランダムなアイテムが手に入る確率 {chance}%。',
  'reward.bomb.name': '爆弾 {tier}',
  'reward.bomb.description': '岩を叩いたときランダムな爆弾が1つ見つかる確率 {chance}%。',

  // --- 内容：Biome ------------------------------------------------------------------------------
  'biome.sunstone.name': 'サンストーン鉱山',
  'biome.sunstone.range': 'Cave 1-10',
  'biome.frost.name': '氷の洞窟',
  'biome.frost.range': 'Cave 11-20',
  'biome.ember.name': '紅莲の深淵',
  'biome.ember.range': 'Cave 21-30',
  'biome.ruins.name': '深淵の遺跡',
  'biome.ruins.range': 'Cave 31-40',
  'biome.wind.name': '風の回廊',
  'biome.wind.range': 'Cave 41-50',
  'biome.crystal.name': '水晶の密室',
  'biome.crystal.range': 'Cave 51-60',

  // --- 内容：レリック -----------------------------------------------------------------------------
  'relic.amber_fang.name': '琥珀の牙',
  'relic.amber_fang.description': 'サンストーン鉱山で失われた化石の欠片。',
  'relic.frost_bloom.name': '霜の花',
  'relic.frost_bloom.description': '凍った洞窟の珍しい有機水晶。',
  'relic.ember_core.name': '灼熱のコア',
  'relic.ember_core.description': '深淵の的心脏で熱を持つ生きた岩。',
  'relic.ruin_tablet.name': '遺跡の石板',
  'relic.ruin_tablet.description': '深淵の遺跡から持ち帰られた先史の碑文。',
  'relic.gust_shell.name': '突風の貝殻',
  'relic.gust_shell.description': '風が抜けると歌い出す空の殻。',
  'relic.prism_core.name': 'プリズムのコア',
  'relic.prism_core.description': '水晶の密室の心臓部。',

  // --- 内容：目標 ----------------------------------------------------------------------------------
  'objective.rocks.label': '砕石工',
  'objective.rocks.description': '合計で岩を40個叩き割る。',
  'objective.coins.label': '金鉱夫',
  'objective.coins.description': '合計でコインを80枚集める。',
  'objective.caves.label': '探検家',
  'objective.caves.description': 'Caveを8つクリアする。',
  'objective.relics.label': '蒐集家',
  'objective.relics.description': 'レリックを4つ見つける。',

  // --- ランのメッセージ -------------------------------------------------------------------------------
  'msg.intro': '広場の端の岩を叩いて始めよう。',
  'msg.enterCave': '{biome} の Cave {cave} に入った。',
  'msg.reroll': 'コイン {n} 枚で強化を引き直した。',
  'msg.utilityAdded': '{name} をランのかばんに入れた。',
  'msg.utilitySold': '{name} をコイン {n} 枚で売った。',
  'msg.chooseNextCave': '次の Cave に行くことにした。',
  'msg.exitToCave': 'Cave {n} に行くことにした。',
  'msg.rewardChosen': '{reward} を選んだ。体力が全回復した。{biome} の Cave {cave} に入った。',
  'msg.defeat':
    '敗北した。強化は現在のBiomeの最初に戻ったが、コイン・目標・レリックはそのまま残った。',
  'msg.foundExit': '出口を見つけた。次の Cave に行くか、ここで探索をつづけるか。',
  'msg.deathLobby': '体力が尽きて、ロビーに戻った。',

  // --- 叩いたときのメッセージ --------------------------------------------------------------------------
  'msg.coinBonus': 'ボーナス打ち！',
  'msg.unluckyBonus': '不運なボーナス打ち！',
  'msg.coinFound': {
    other: 'コインを {count} 枚見つけた。'
  },
  'msg.defeatDev': '敗北しました。アップグレードは現在のバイオムの先頭に戻りましたが、テストキットの一部であるツルハタは残ります。コイン・目標・遺物はそのままです。',
  'msg.bombHit': '爆弾！残りの体力：{n}。',
  'msg.relicFound': 'レリック {relic} を発見した。',
  'msg.emptyBonus': 'ボーナス打ち！余分な岩は空だった。',
  'msg.empty': '石と埃だけだ……掘り進めろ。',
  'msg.exitBonus': 'ボーナス打ち！隠れた出口を見つけた。穴をクリックして出るか決めよう。',
  'msg.exitHidden': 'この Cave の隠れた出口を見つけた。穴をクリックして出るか決めよう。',
  'msg.bombRevealed': '地図で隠された爆弾が1つ見つかった。',

  // --- アイテムのメッセージ ------------------------------------------------------------------------------
  'msg.utilityReward': 'アイテム+1',
  'msg.utilityDropFound': "ボーナスアイテムを手に入れた：{name}。",
  'msg.lifeUsed': "生命のポーションを使った。現在の体力：{hp}/{max}。",
  'msg.utilityMissing': 'そのアイテムはかばんに入っていない。',
  'msg.lifeFull': '体力はすでに満タンだ——ポーションは残した。',
  'msg.noBombsLeft': 'この Cave に隠された爆弾はもう残っていない。',
  'msg.revealUsed': '頑固な指のポーションを使った。地図で爆弾が1つ見つかった。',
  'msg.noSafeRoute': 'この Cave には爆弾を避けて出口まで行く道がない。',
  'msg.safePathUsed': '安全な道のポーションを使った。出口までの緑の道が見えた。',

  // --- シーン内に描かれる文字---------------------------------------------------------------------------------
  'scene.markerIn': 'IN',
  'scene.markerOut': '出口',

  // --- lore de entrada dos biomas -----------------------------------------
  'lore.falante': '鉱夫',
  'lore.dicaAvancar': 'クリックまたは A で次へ',
  'lore.dicaPular': 'Enter または B でスキップ',
  'lore.painel': '{n}/{total}',
  'lore.sunstone.p1.a': 'あの音は一体何だったんだ!?',
  'lore.sunstone.p2.a': '最快だ! 道に迷子了!',
  'lore.sunstone.p2.b': 'こんなに深いところまで来るべきじゃなかった!!',
  'lore.sunstone.p3.a': 'せめて装備はあるからな!!',
  'lore.sunstone.p3.b': 'さあ、ここから出るだけだ!!',
  'lore.sunstone.p4.a': '問題はここが爆弾だらけってことだ!!',
  'lore.sunstone.p5.a': '一歩も間違えたら「BOOM」...',
  'lore.sunstone.p6.a': 'ふむ...ずっとここにいるわけにはいかないな..行くぞ!!!',
};
