/**
 * Polski.
 *
 * O arquivo tem três formas onde os outros idiomas latinos têm duas, e a
 * diferença não é enfeite: é substantivo na declinação errada. Com `{count}`
 * valendo 2 sai "jaskinie", com 5 sai "jaskiń", e a linha de regra do
 * `REGRAS_DE_PLURAL` no `index.js` é o que escolhe entre as três.
 *
 * Note a ausência de `other`: o polonês não tem forma genérica para números
 * inteiros, e `t()` nunca chega a procurá-la porque a regra só devolve `one`,
 * `few` ou `many`.
 */
export default {
  // --- marka i menu --------------------------------------------------------
  'menu.kicker': 'ArchangelSoft',
  'menu.taglineTail': 'bez drugiej szansy',
  'menu.taglineCaves': {
    one: '{count} jaskinia',
    few: '{count} jaskinie',
    many: '{count} jaskiń'
  },
  'menu.taglineBiomes': {
    one: '{count} biom',
    few: '{count} biomy',
    many: '{count} biomów'
  },
  'menu.enter': 'Graj',
  'menu.settings': 'Ustawienia',
  'menu.info': 'Informacje',
  'menu.mainAria': 'Menu główne',

  // --- jogos salvos --------------------------------------------------------
  'saves.title': 'Wybierz zapis',
  'saves.subtitle': 'Każdy zapis ma własną jaskinię, monety, relikwie i kolekcję.',
  'saves.newGame': 'Nowy zapis',
  'saves.nameLabel': 'Nazwa zapisu',
  'saves.namePlaceholder': 'Mój zapis',
  'saves.create': 'Utwórz i graj',
  'saves.empty': 'Nie ma jeszcze żadnych zapisów.',
  'saves.emptyHint': 'Nazwij pierwszy zapis, aby zacząć.',
  'saves.play': 'Graj',
  'saves.rename': 'Zmień nazwę',
  'saves.renameTitle': 'Zmień nazwę zapisu',
  'saves.saveName': 'Zapisz nazwę',
  'saves.delete': 'Usuń',
  'saves.deleteTitle': 'Usuń zapis',
  'saves.deleteConfirm': 'Usunąć „{name}”? Monety, relikwie i jaskinia tego zapisu zostaną utracone. Nie można tego cofnąć.',
  'saves.playedOn': 'Ostatnio grane {date}',
  'saves.current': 'W toku',
  'saves.testGame': 'Test',
  'saves.blockedNeedsDev': 'Włącz tryb dewelopera, aby otworzyć grę testową.',
  'saves.blockedNeedsStandard': 'Wyłącz tryb dewelopera, aby otworzyć prawdziwą grę.',
  'saves.nameTaken': 'Zapis o tej nazwie już istnieje. Możesz go mimo to użyć.',
  'saves.ariaList': 'Zapisane gry',

  // --- final ---------------------------------------------------------------
  'finale.title': 'Dotarłeś aż tutaj.',
  'finale.p1': 'Każdy rozbity kamień, każda odkryta ścieżka i każde pokonane wyzwanie przybliżały cię trochę bardziej.',
  'finale.p2': 'Na koniec największe bogactwo nigdy nie leżało wyłącznie w głębinach jaskini, lecz w odwadze, by iść dalej, gdy droga wydawała się trudna, w ciekawości nieznanego i w wytrwałości, by spróbować jeszcze raz.',
  'finale.p3': 'Podróż kończy się na razie, ale każdy odkrywca wie, że zawsze czeka kolejne przejście, kolejna zagadka i nowa przygoda, która czeka na odkrycie.',
  'finale.p4': 'Może to była jedynie pierwsza wyprawa.',
  'finale.p5': 'Dziękujemy za grę i za to, że dotarłeś do końca.',
  'finale.signature': 'Z serca,',
  'finale.team': 'Zespół Archangel Soft',
  'finale.closing': 'Do następnej przygody. ⛏️✨',
  'finale.skip': 'Pomiń',
  'saves.relics': {
    one: '{count} relikt',
    few: '{count} relikty',
    many: '{count} reliktów'
  },

  // --- ekran języka -------------------------------------------------------
  'language.title': 'Język',
  'language.hint': 'Zmiana działa od razu, bez restartu.',
  'language.current': 'Obecny',
  'language.back': 'Wróć',

  // --- HUD -----------------------------------------------------------------
  'hud.cave': 'JASKINIA',
  'hud.biome': 'BIOM',
  'hud.coins': 'MONETY',
  'hud.bombs': 'BOMBY',
  'hud.relics': 'RELIKTY',
  'hud.pickaxe': 'KILOF',
  'hud.hp': 'ŻYCIE',
  'hud.titleLife': 'Aktualne życie',
  'hud.titleCoins': 'Monety zebrane w tym przejściu',
  'hud.titleBombs': 'Bomby wciąż ukryte w tej jaskini',
  'hud.titleRelics': 'Relikwie dostępne do wydania',
  'hud.titlePickaxe': 'Poziom kilofa',
  'hud.utilitiesAria': 'Przedmioty przejścia',
  'hud.use': 'Użyj',
  'hud.utilityAria': '{name} ({count} w plecaku). {description}',
  'hud.utilityTitle': '{name} · {count}',

  // --- pełny ekran ---------------------------------------------------------
  'fullscreen.enter': 'Wejdź w pełny ekran',
  'fullscreen.exit': 'Wyjdź z pełnego ekranu',
  'fullscreen.exitWithKey': 'Wyjdź z pełnego ekranu (Esc)',
  'fullscreen.closeNotice': 'Zamknij komunikat',
  'fullscreen.error.ios':
    'Safari na iPhone i iPad nie ma pełnego ekranu. Dodaj grę do ekranu głównego, aby grać bez paska przeglądarki.',
  'fullscreen.error.unsupported':
    'Ta przeglądarka nie oferuje pełnego ekranu dla stron. Nic nie zostało zmienione.',
  'fullscreen.error.gesture': 'Przeglądarka odmówiła pełnego ekranu. Dotknij „Pełny ekran”, aby spróbować ponownie.',
  'fullscreen.error.denied':
    'Nie udało się wejść w pełny ekran. Użyj przycisku pełnego ekranu w dolnym rogu.',

  // --- wybór biomu ---------------------------------------------------------
  'biomeSelect.title.menu': 'Wybierz biom',
  'biomeSelect.title.next': 'Następny biom',
  'biomeSelect.devMode': 'Tryb dewelopera',
  'biomeSelect.bestCave': 'Najlepsza jaskinia {n}',
  'biomeSelect.status.locked': 'Zablokowany',
  'biomeSelect.status.dev': 'Dev',
  'biomeSelect.status.completed': 'Ukończony',
  'biomeSelect.status.available': 'Dostępny',
  'biomeSelect.status.visited': 'Odwiedzony',
  'biomeSelect.unlockAt': 'Jaskinia {n}',
  'biomeSelect.start': 'Zacznij w tym biomie',
  'biomeSelect.enter': 'Wejdź do biomu',
  'biomeSelect.enterCave': 'Wejdź do jaskini {n}',

  // --- ustawienia ----------------------------------------------------------
  'settings.title': 'Ustawienia',
  'settings.fullscreen': 'Pełny ekran na starcie',
  'settings.fullscreenPwaHint':
    'Safari na iPhone i iPad nie ma pełnego ekranu — zainstaluj z ekranu głównego.',
  'settings.rememberRun': 'Zapamiętaj mój postęp',
  'settings.devMode': 'Tryb dewelopera',
  'settings.devNote': 'Odblokowane biome: {unlocked} z {total}',

  // --- informacje ----------------------------------------------------------
  'info.title': 'Informacje o postępie',
  'info.biomesUnlocked': 'Odblokowane biome',
  'info.devModeBestCave': 'Tryb dewelopera · najlepsza jaskinia {n}',
  'info.currentBiome': 'Obecny biom',
  'info.currentCave': 'Obecna jaskinia',
  'info.objectives': 'Cele',
  'info.relics': 'Relikty',
  'info.totalRelics': 'Razem {n}',

  // --- poczekalnia ---------------------------------------------------------
  'lobby.defeatBadge': 'PORAZKA',
  'lobby.victoryBadge': 'ZWYCIĘSTWO',
  'lobby.defeatTitle': 'Pokonano cię',
  'lobby.clearTitle': 'Jaskinia {cave} ukończona',
  'lobby.coins': 'Monety',
  'lobby.life': 'Życie',
  'lobby.pickaxe': 'Kilof',
  'lobby.next': 'Następna',
  'lobby.chooseUpgrade': 'Wybierz ulepszenie',
  'lobby.chooseUpgradeSub': 'Wybierz 1 ulepszenie na następną jaskinię.',
  'lobby.chooseUpgradeFixedSub': 'Gratulacje, ukończyłeś biom "{biome}". W nagrodę wybierz ulepszenie, które towarzyszy ci do końca gry.',
  'lobby.reroll': 'Wymień · {n}',
  'lobby.rerollMissing': 'Brakuje {n}',
  'lobby.noUpgradesLeft': 'Wszystkie ścieżki ulepszeń są już na maksimum w tym przejściu.',
  'lobby.nextCave': 'Następna jaskinia',
  'lobby.utilityShop': 'Ulepszenia / Pomoce',
  'lobby.retry': 'Spróbuj ponownie',
  'lobby.mainMenu': 'Menu główne',

  // --- sklep z przedmiotami -----------------------------------------------
  'shop.title': 'Ulepszenia / Pomoce',
  'shop.sectionUtilities': 'Pomoce',
  'shop.sectionUpgrades': 'Ulepszenia',
  'shop.upgradesSubtitle': 'Trwałe ulepszenia, opłacane relikwiami.',
  'shop.relicBalance': 'Relikwie: {n}',
  'shop.buyNext': 'Ulepsz za {n}',
  'shop.notEnoughRelics': 'Za mało relikwii',
  'shop.maxLevel': 'Najwyższy poziom',
  'shop.level': 'Poziom: {atual}/{max}',
  'shop.upgrade.health.name': 'Ulepsz Życie',
  'shop.upgrade.health.benefit': '+1 maksymalnego zycia za poziom',
  'shop.upgrade.pickaxe.name': 'Ulepsz Kilof',
  'shop.upgrade.pickaxe.benefit': '+1 poziom kilofa za poziom',
  'shop.upgrade.lifePotion.name': 'Ulepsz Miksturę Życia',
  'shop.upgrade.lifePotion.benefit': '+1 odzyskanego zycia za miksture',
  'shop.upgrade.revealBomb.name': 'Ulepsz Miksturę Twardego Palca',
  'shop.upgrade.revealBomb.benefit': '+1 ujawnionej bomby za miksture',
  'shop.upgrade.safePath.name': 'Ulepsz Miksturę Bezpiecznej Drogi',
  'shop.upgrade.safePath.b3': 'Oprócz tego wskazuje krótki objazd do relikwii i z powrotem.',
  'shop.upgrade.safePath.b2': 'Oprócz zagrożen zaznacza relikwie w pobliżu drogi.',
  'shop.upgrade.safePath.b1': 'Zaznacza zagrozenia wzdluz bezpiecznej drogi.',
  'shop.upgradeNext': 'Następny poziom: {benefit}',
  'shop.subtitle': 'Pomoce za monety, trwale ulepszenia za relikwie.',
  'shop.inBag': 'W plecaku: {n}',
  'shop.buy': 'Kup · {n}',
  'shop.missing': 'Brakuje {n}',
  'shop.sell': 'Sprzedaj · {n}',
  'shop.empty': 'Brak przedmiotów',

  // --- pauza ---------------------------------------------------------------
  'pause.kicker': 'Pauza',
  'pause.title': '{biome} · {cave}',
  'pause.message': 'Jaskinia zamrożona.',
  'pause.continue': 'Wznów',
  'pause.toMenu': 'Przejdź do menu',
  'pause.hint': 'Esc wznawia',
  'pause.controllerHint': 'Kierunek przesuwa · A zatwierdza · B wraca · Start pauzuje',
  'hud.controller': '{name} podłączony',
  'hud.pause': 'Pauza',
  'pause.aria': 'Gra wstrzymana',

  // --- decyzja przy wyjściu -------------------------------------------------
  'exit.badge': 'ZNALEZIONO WYJŚCIE',
  'exit.question': 'Co chcesz zrobić?',
  'exit.nextCave': 'Następna jaskinia',
  'exit.keepExploring': 'Kontynuuj eksplorację tej jaskini',
  'exit.finale': 'Zobacz zakończenie',

  // --- obrót ekranu --------------------------------------------------------
  'rotate.title': 'Obróć telefon',
  'rotate.playing': 'Aby grać dalej, trzymaj urządzenie poziomo.',
  'rotate.menu': 'Trzymaj urządzenie poziomo, aby odblokować menu.',

  // --- przyciski występujące w więcej niż jednym miejscu -------------------
  'common.close': 'Zamknij',
  'common.back': 'Wróć',
  'common.info': 'Informacje',
  'common.resetProgress': 'Zresetuj postęp',

  // --- treść: przedmioty ----------------------------------------------------
  'utility.lifePotion.name': 'Mikstura Życia',
  'utility.lifePotion.description': 'Przywraca 1 punkt życia w trakcie przejścia.',
  'utility.revealBomb.name': 'Mikstura Upartego Kciuka',
  'utility.revealBomb.description': 'Odsłania jedną ukrytą bombę na bieżącej mapie.',
  'utility.safePath.name': 'Mikstura Bezpiecznej Drogi',
  'utility.safePath.description': 'Pokazuje bezpieczną drogę do wyjścia z bieżącej jaskini.',

  // --- treść: ulepszenia ------------------------------------------------------
  'reward.pickaxe.name': 'Kilof {tier}',
  'reward.pickaxe.first': '+1 poziom kilofa: skały pękają o jeden klik mniej.',
  'reward.pickaxe.next': '+1 poziom kilofa. Wymaga Kilofa {tier}.',
  'reward.fixed': 'Trwała',
  'reward.vitality.name': 'Witalność {tier}',
  'reward.vitality.description': '+1 maksymalne życie. Następna jaskinia zaczyna z pełnym życiem.',
  'reward.coins.name': 'Monety {tier}',
  'reward.coins.description': {
    one: '{chance}% szans na zdobycie +{count} monetę.',
    few: '{chance}% szans na zdobycie +{count} monety.',
    many: '{chance}% szans na zdobycie +{count} monet.'
  },
  'reward.rocks.name': 'Skały {tier}',
  'reward.rocks.description': {
    one: '{chance}% szans na rozbicie +{count} skałę.',
    few: '{chance}% szans na rozbicie +{count} skały.',
    many: '{chance}% szans na rozbicie +{count} skał.'
  },
  'reward.utility.name': 'Przedmiot {tier}',
  'reward.utility.description':
    '{chance}% szans na zdobycie losowego przedmiotu przy rozbiciu skały.',
  'reward.bomb.name': 'Bombe {tier}',
  'reward.bomb.description':
    '{chance}% szans na odsłonięcie losowej bomby przy rozbiciu skały.',

  // --- treść: biome -----------------------------------------------------------
  'biome.sunstone.name': 'Kopalnia Kamienia Słonecznego',
  'biome.sunstone.range': 'Jaskinie 1-10',
  'biome.frost.name': 'Lodowa Grota',
  'biome.frost.range': 'Jaskinie 11-20',
  'biome.ember.name': 'Karmione Głębiny',
  'biome.ember.range': 'Jaskinie 21-30',
  'biome.ruins.name': 'Otchłanne Ruiny',
  'biome.ruins.range': 'Jaskinie 31-40',
  'biome.wind.name': 'Galeria Wiatru',
  'biome.wind.range': 'Jaskinie 41-50',
  'biome.crystal.name': 'Kryształowa Komnata',
  'biome.crystal.range': 'Jaskinie 51-60',

  // --- treść: relikwie ---------------------------------------------------------
  'relic.amber_fang.name': 'Bursztynowy Kieł',
  'relic.amber_fang.description': 'Fragment skamieliny zgubiony w Kopalni Kamienia Słonecznego.',
  'relic.frost_bloom.name': 'Kwiat Mrozu',
  'relic.frost_bloom.description': 'Rzadki kryształ organiczny z zamarzłych jaskiń.',
  'relic.ember_core.name': 'Rdzeń Żarzący',
  'relic.ember_core.description': 'Żywa skała rozgrzana w sercu głębin.',
  'relic.ruin_tablet.name': 'Tabliczka z Ruin',
  'relic.ruin_tablet.description': 'Prastary napis przywieziony z Otchłannych Ruin.',
  'relic.gust_shell.name': 'Muszla Porywu',
  'relic.gust_shell.description': 'Pusta skorupka, która śpiewa, gdy przepływa wiatr.',
  'relic.prism_core.name': 'Rdzeń Pryzmatyczny',
  'relic.prism_core.description': 'Serce Kryształowej Komnaty.',

  // --- treść: cele -------------------------------------------------------------
  'objective.rocks.label': 'Rębacz Skał',
  'objective.rocks.description': 'Rozbij 40 skał łącznie.',
  'objective.coins.label': 'Poszukiwacz Złota',
  'objective.coins.description': 'Zbierz 80 monet łącznie.',
  'objective.caves.label': 'Odkrywca',
  'objective.caves.description': 'Ukończ 8 jaskiń.',
  'objective.relics.label': 'Kurator',
  'objective.relics.description': 'Znajdź 4 relikty.',

  // --- komunikaty przejścia ----------------------------------------------------
  'msg.intro': 'Rozbij skałę na krawędzi otwartego terenu, aby zacząć.',
  'msg.enterCave': 'Wstąpiłeś do Jaskinii {cave} biomu {biome}.',
  'msg.reroll': 'Ulepszenia wymienione za {n} monet.',
  'msg.utilityAdded': '{name} dodano do plecaka przejścia.',
  'msg.utilitySold': '{name} sprzedano za {n} monet.',
  'msg.chooseNextCave': 'Zdecydowałeś przejść do następnej jaskini.',
  'msg.exitToCave': 'Zdecydowałeś przejść do Jaskinii {n}.',
  'msg.rewardChosen': 'Wybrano: {reward}. Życie odnowione. Wstąpiłeś do Jaskinii {cave} biomu {biome}.',
  'msg.defeat':
    'Pokonano cię. Ulepszenia wróciły na początek bieżącego biomu, ale twoje monety, cele i relikty zostały zachowane.',
  'msg.foundExit': 'Znalazłeś wyjście. Przejść do następnej jaskini czy dalej eksplorować tę?',
  'msg.deathLobby': 'Straciłeś całe życie i wróciłeś do poczekalni.',

  // --- komunikaty rozbicia -------------------------------------------------------
  'msg.coinBonus': 'Rozbicie bonusowe!',
  'msg.unluckyBonus': 'Niefortelne rozbicie bonusowe!',
  'msg.coinFound': {
    one: 'Znaleziono {count} monetę.',
    few: 'Znaleziono {count} monety.',
    many: 'Znaleziono {count} monet.'
  },
  'msg.defeatDev': 'Przegrałeś. Ulepszenia wróciły na początek bieżącego biomu, z wyjątkiem kilofa, który należy do zestawu testowego. Twoje monety, cele i relikwie zostały zachowane.',
  'msg.bombHit': 'Bomba! Pozostałe życie: {n}.',
  'msg.relicFound': 'Znaleziono relikt: {relic}.',
  'msg.emptyBonus': 'Rozbicie bonusowe! Dodatkowa skała była pusta.',
  'msg.empty': 'Tylko kamień i kurz… kopaj dalej.',
  'msg.exitBonus': 'Rozbicie bonusowe! Znalazłeś ukryte wyjście. Kliknij dziurę, aby zdecydować, czy wyjść.',
  'msg.exitHidden': 'Znalazłeś ukryte wyjście z tej jaskini. Kliknij dziurę, aby zdecydować, czy wyjść.',
  'msg.bombRevealed': 'Jedna ukryta bomba została odsłonięta na mapie.',

  // --- komunikaty przedmiotów -------------------------------------------------------
  'msg.utilityReward': '+1 przedmiot',
  'msg.utilityDropFound': "Znaleziono bonusowy przedmiot: {name}.",
  'msg.lifeUsed': "Użyto Mikstury Życia. Aktualne życie: {hp}/{max}.",
  'msg.utilityMissing': 'Nie masz tego przedmiotu w plecaku.',
  'msg.lifeFull': 'Twoje życie jest już pełne — mikstura została zachowana.',
  'msg.noBombsLeft': 'W tej jaskini nie ma już ukrytych bomb.',
  'msg.revealUsed': 'Użyto Mikstury Upartego Kciuka. Jedna bomba została odsłonięta na mapie.',
  'msg.noSafeRoute': 'W tej jaskini nie ma drogi bez bomb do wyjścia.',
  'msg.safePathUsed': 'Użyto Mikstury Bezpiecznej Drogi. Zielona droga do wyjścia została odsłonięta.',

  // --- tekst rysowany w scenie ---------------------------------------------------------
  'scene.markerIn': 'IN',
  'scene.markerOut': 'WYJŚCIE',

  // --- lore de entrada dos biomas -----------------------------------------
  'lore.falante': 'Górnik',
  'lore.dicaAvancar': 'Kliknij lub A, aby kontynuować',
  'lore.dicaPular': 'Enter lub B, aby pominąć',
  'lore.painel': '{n}/{total}',
  'lore.sunstone.p1.a': 'Co to za hałas??',
  'lore.sunstone.p2.a': 'Oczywiście! Zgubiłem się!',
  'lore.sunstone.p2.b': 'Wiedziałem, że nie powinienem schodzić tak głęboko!!',
  'lore.sunstone.p3.a': 'Przynajmniej mam swój sprzęt!!',
  'lore.sunstone.p3.b': 'Teraz muszę tylko stąd uciec!!',
  'lore.sunstone.p4.a': 'Problem w tym, że to miejsce jest pełne bomb!!',
  'lore.sunstone.p5.a': 'Jeden zły krok i "BOOM"...',
  'lore.sunstone.p6.a': 'No...nie zostanę tu na zawsze więc..RUCHAMY!!!',
  'lore.frost.p1.a': 'Jak zimno.....',
  'lore.frost.p2.a': 'Na mojej mapie nie ma takiego miejsca, nazwijmy to Lodową Jaskinią.',
  'lore.frost.p3.a': 'Myślałem, że będzie łatwiej....',
  'lore.frost.p4.a': 'No bo, z tego co widzę, to nie tylko bomby porozrzucane dookoła!!',
  'lore.frost.p4.b': 'Mogę użyć tych zasobów, które znalazłem, żeby szybciej stąd wydostać!!',
  'lore.frost.p5.a': 'Lecimy dalej!!',
  'lore.ember.p1.a': 'JAK SIĘ PIERWSZY....',
  'lore.ember.p2.a': 'Muszę się skupić, zostało jeszcze dużo...',
  'lore.ember.p3.a': 'Jeśli utrzymam to tempo, szybko skończę!!',
  'lore.ember.p4.a': 'Skoro tak...UCIERAJ!!!!',
  'lore.ruins.p1.a': 'Co za MIEJSCE!!!!',
  'lore.ruins.p2.a': 'To ruiny jakiejś starożytnej cywilizacji!',
  'lore.ruins.p3.a': 'Może kiedyś wrócę, żeby zbadać to dokładniej!',
  'lore.ruins.p4.a': 'Teraz muszę iść dalej!!',
  'lore.wind.p1.a': 'WHOOO...TRZYMAJ SIĘ!!',
  'lore.wind.p2.a': 'Ta wichura chyba oznacza, że wyjście jest już blisko.',
  'lore.wind.p3.a': 'Nie mogę się doczekać kąpieli!',
  'lore.wind.p4.a': 'DO PRZODU!',
  'lore.crystal.p1.a': 'Jestem zmęczony, szefie!',
  'lore.crystal.p2.a': 'Sądzę, że wyjście jest już blisko',
  'lore.crystal.p3.a': 'Co za ponure miejsce!!!',
  'lore.crystal.p4.a': 'Te kryształy wyglądają na ostre... lepiej iść powoli....',

  // --- cena final antes do fim do jogo ---------------
  'cenaFinal.dica': 'Kliknij, aby kontynuować',

  // --- cena final ------------------------------------------
  'cenaFinal.falante': 'Górnik',
  'cenaFinal.p1.a': 'AAAHH CHŁOPAKU.....',
  'cenaFinal.p2.a': 'Wreszcie wyjście',
  'cenaFinal.p3.a': 'Muszę przestać naprawiać te bałagany...hihihi',
  'cenaFinal.p4.a': 'No...zostało mi już tylko Wyjście!!!!!',

  // --- ponteiro do menu --------------------------------------
  'settings.pointerSensitivity': 'Czułość wskaźnika',
  'settings.pointerSpeed': 'Prędkość wskaźnika',
  'settings.pointerLess': 'Mniej',
  'settings.pointerMore': 'Więcej',
  'settings.pointerPercent': '{valor}%',
};
