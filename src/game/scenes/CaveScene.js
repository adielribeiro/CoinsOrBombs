import Phaser from 'phaser';
import {
  BASE_TILE_HEIGHT,
  BASE_TILE_WIDTH,
  CAVE_ENTRANCE_BASE,
  EXIT_LADDER_ASPECT,
  EXIT_LADDER_CENTER_Y,
  EXIT_LADDER_DISPLAY,
  PICKAXE_ASPECT,
  PICKAXE_DISPLAY,
  fromIso,
  getTileMetrics,
  toIso
} from '../config.js';
import { GROUND_CELL_HEIGHT, GROUND_CELL_WIDTH, GROUND_TEXTURE_KEYS, groundFrameIndex } from '../ground.js';
import { getLocale, setLocale, t } from '../../i18n/index.js';
import { BIOMA_INICIAL, getBackdropKey } from '../backdrops.js';
import { ENTRANCE_DISPLAY, getEntranceAspect, getEntranceForBiome } from '../entrances.js';
import { dentroDoMapa, proximoTileValido, tileInicialDoCursor } from '../cursor.js';
import { tileSobOPonteiro } from '../ponteiro.js';

/**
 * A cena tem uma textura DE VERDADE para esta chave?
 *
 * `textures.exists(chave)` e `list.hasOwnProperty(chave)`, e
 * `textures.get(chave)` devolve a textura `__MISSING` quando a chave nao esta na
 * lista. A `__MISSING` e a caixa preta com o X verde que apareceu no lugar do
 * fundo de cinco dos seis biomas.
 *
 * O teste que serve e a identidade: a textura devolvida precisa ter a MESMA chave
 * que foi pedida. A `__MISSING` responde `__MISSING`, e e reprovada.
 *
 * Fica aqui, na cena, e nao em `backdrops.js`, por um motivo concreto: a
 * verificacao decide se o `add.image` pode rodar, e uma verificacao que falha em
 * silencio produce a caixa com X sem erro nenhum. Este bug nao esta no modulo que
 * pediu a arte, e sim na checagem que decidiu que ela tinha chegado.
 */
function texturaEhUsavel(scene, chave) {
  if (!scene || !scene.textures) return false;
  if (typeof scene.textures.get !== 'function') return false;
  const textura = scene.textures.get(chave);
  return Boolean(textura) && textura.key === chave;
}

/** Como o `console.error` descreve a textura que a cena recebeu. */
function descreveTextura(scene, chave) {
  if (!scene || !scene.textures || typeof scene.textures.get !== 'function') {
    return 'sem texturas';
  }
  const textura = scene.textures.get(chave);
  if (!textura) return 'vazio';
  return `${textura.key}${textura.key === chave ? ' (bate)' : ' (DIVERGE)'}`;
}
import {
  caveAoMorrer,
  createCollectionState,
  createStatsState,
  getBiomeForCave,
  getRelicById,
  isRelicContent,
  registrarCaveConcluida,
  registrarReliquiaEncontrada
} from '../progression.js';
import { ROCK_DISPLAY, getRockFrameIndex, getRockJitter, getRockSheetKey } from '../rocks.js';
import { generateMap } from '../systems/mapGenerator.js';
import { findSafeRoute, getNeighbors4, isFrontierRock } from '../systems/helpers.js';

/**
 * Desenha a célula do chão.
 *
 * O chão vem de um atlas gerado por `scripts/generate-ground.mjs`, e não de
 * arte de tile: a antiga `floor_*.png` era uma grelha 3x3 e a grade aparecia
 * em toda célula. Ver src/game/ground.js.
 *
 * A célula é desenhada 1px maior que o losango da grade. As bordas de duas
 * células vizinhas caem em posições fracionárias (a meia-altura é 24,5px), e
 * sem essa sobreposição o filtro bilinear do sprite deixa um fio de fundo
 * aparecer ao longo de cada aresta — que é a grade de novo, agora fininha.
 *
 * A textura vem do bioma da cave. Há um atlas por bioma porque o tint do Phaser
 * SÓ MULTIPLICA: um atlas de terra marrom tingido de azul daria lama escura em
 * vez de gelo. A cor precisa estar na textura, não na tinta.
 */
function drawGroundCell(scene, col, row, point, tileWidth, tileHeight, textureKey) {
  const cell = scene.add
    .image(point.x, point.y, textureKey)
    .setFrame(groundFrameIndex(col, row))
    .setDisplaySize(tileWidth + 1, tileHeight + 1);

  return cell;
}

/**
 * Chave da textura do chão para um bioma.
 *
 * O BootScene carrega os quatro atlas de uma vez, então sempre existe uma
 * textura para o bioma atual. O segundo piso é para o caso de um bioma novo
 * entrar em jogo sem passar pelo BootScene.
 */
export function getGroundTextureKey(biomeId) {
  return GROUND_TEXTURE_KEYS[biomeId] ?? GROUND_TEXTURE_KEYS.sunstone;
}

export class CaveScene extends Phaser.Scene {
  constructor() {
    super('CaveScene');
    this.metaState = {
      cave: 1,
      hp: 2,
      maxHp: 2,
      coins: 0,
      bombs: 0,
      pickaxeLevel: 1,
      pickaxePower: 1,
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
      bombRevealChance: 0,
      biomeId: getBiomeForCave(1).id,
      biomeName: getBiomeForCave(1).name,
      bestCave: 1,
      // Um save de teste não conta progresso: nem relíquia, nem cave concluída, nem
      // `bestCave`. O padrão é `false` — só `true` explícito marca teste, para que
      // um `metaState` montado antes de o evento de entrada chegar conte como jogo
      // normal em vez de perder o primeiro passo.
      dev: false,
      collection: createCollectionState(),
      stats: createStatsState(),
      lastRelicFound: null,
      utilities: {
        lifePotion: 0,
        revealBomb: 0,
        safePath: 0
      },
      inLobby: false,
      lobbyReason: null,
      nextCaveAvailable: null,
      outcomeCave: null,
      lastMessage: t('msg.intro')
    };

    this.purchased = [];
    this.hoveredRockTile = null;
    // O cursor de controle começa na entrada e só existe quando há controle
    // conectado. `col`/`row` são a posição na grade; `visivel` é o que decide se
    // o losango aparece, e ele é desligado sozinho quando um modal abre por cima.
    this.cursorTile = null;
    this.cursorVisivel = false;
    this.pendingResponsiveRefreshes = [];
    this.pendingEffects = [];
    this.clearedCaves = new Set();
    this.toastSequence = 0;
    this.reducedMotion = false;
    this.hudInset = 0;
    this.attractMode = false;
    this.paused = false;

    this.renderMetrics = {
      ...getTileMetrics(1),
      hudTopOffset: 70,
      bottomPadding: 18,
      sidePadding: 28,
      isMobileLandscape: false,
      isCompact: false
    };
  }

  create() {
    const savedState = this.game?.uiBridge?.getPersistentState?.();

    if (savedState) {
      const { purchased = [], ...restState } = savedState;
      this.metaState = {
        ...this.metaState,
        ...restState,
        collection: { ...createCollectionState(), ...(restState.collection ?? {}) },
        stats: { ...createStatsState(), ...(restState.stats ?? {}) }
      };
      this.purchased = [...purchased];
    }

    this.cameras.main.setBackgroundColor(getBiomeForCave(this.metaState.cave).palette.background);

    this.backgroundLayer = this.add.container();
    this.floorLayer = this.add.container();
    this.objectLayer = this.add.container();
    this.overlayLayer = this.add.container();

    this.hoverIndicator = this.add.graphics();
    this.hoverIndicator.setVisible(false);
    this.overlayLayer.add(this.hoverIndicator);

    // O cursor de controle é um losango como o de hover, com a cor de acento do
    // jogo em vez do verde/vermelho de "dá para quebrar". Duas cores para a mesma
    // forma diria "aqui é o mouse, aqui é o controle", e a pessoa não teria como
    // saber qual está em uso.
    this.cursorIndicator = this.add.graphics();
    this.cursorIndicator.setVisible(false);
    this.overlayLayer.add(this.cursorIndicator);

    this.pickaxeEffect = this.add.image(0, 0, 'pickaxe').setScale(0.42).setAlpha(0);
    this.pickaxeEffect.setVisible(false);
    this.overlayLayer.add(this.pickaxeEffect);

    this.input.on('gameobjectdown', (_, gameObject) => {
      const tile = gameObject.getData('tile');
      if (!tile || this.metaState.inLobby) return;
      this.handleTileClick(tile);
    });

    this.onExternalSync = (event) => {
      this.metaState = {
        ...this.metaState,
        ...event.detail.state,
        collection: { ...createCollectionState(), ...(event.detail.state?.collection ?? this.metaState.collection) },
        stats: { ...createStatsState(), ...(event.detail.state?.stats ?? this.metaState.stats) },
        utilities: {
          lifePotion: 0,
          revealBomb: 0,
          safePath: 0,
          ...(event.detail.state?.utilities ?? {})
        }
      };
      this.purchased = [...(event.detail.purchased ?? this.purchased)];
      this.syncUI();
    };

    this.onUtilityUse = (event) => {
      this.handleUtilityUse(event.detail?.type);
    };

    this.onManualRestart = (event) => {
      this.metaState = {
        ...this.metaState,
        ...event.detail,
        collection: { ...createCollectionState(), ...(event.detail?.collection ?? this.metaState.collection) },
        stats: { ...createStatsState(), ...(event.detail?.stats ?? this.metaState.stats) },
        utilities: {
          lifePotion: 0,
          revealBomb: 0,
          safePath: 0,
          ...(event.detail?.utilities ?? {})
        },
        inLobby: false,
        lobbyReason: null,
        nextCaveAvailable: null,
        outcomeCave: null
      };
      this.refreshRun(true);
      this.scheduleResponsiveRefresh();
    };

    this.onEnterCave = (event) => {
      this.metaState = {
        ...this.metaState,
        ...event.detail,
        collection: { ...createCollectionState(), ...(event.detail?.collection ?? this.metaState.collection) },
        stats: { ...createStatsState(), ...(event.detail?.stats ?? this.metaState.stats) },
        utilities: {
          lifePotion: 0,
          revealBomb: 0,
          safePath: 0,
          ...(event.detail?.utilities ?? {})
        },
        inLobby: false,
        lobbyReason: null,
        nextCaveAvailable: null,
        outcomeCave: null
      };
      this.refreshRun(true);
      this.scheduleResponsiveRefresh();
    };

    this.onResize = () => {
      this.scheduleResponsiveRefresh();
    };

    /**
     * Modo attract: a tela de título.
     *
     * Antes isto chamava `renderMap()`, e o menu ficava com o mapa de verdade
     * desenhado por cima do background: chão, rochas, estrutura de saída e
     * entrada. Sobre a arte do bioma, o resultado era um segundo cenário
     * competindo com o primeiro — as rochas apareciam como formas fantasma
     * atravessando o logo, e o chão virava um retângulo isométrico no meio de
     * uma caverna pintada.
     *
     * Agora a tela de título mostra a arte do bioma, e nada mais. É o que uma
     * tela de título de console faz: uma imagem, e o texto por cima.
     */
    this.onAttractMode = (event) => {
      const active = Boolean(event?.detail?.active);

      if (this.attractMode === active) return;

      this.attractMode = active;
      this.hoveredRockTile = null;
      this.hoverIndicator.clear();
      this.hoverIndicator.setVisible(false);

      // O lobby tem o seu próprio fundo, que já é o da tela de título.
      if (this.metaState.inLobby) return;

      // Só o caminho normal do mapa. `renderMap` decide entre a cave e a tela
      // de título pelo estado de `attractMode`, então este handler e o sync de
      // resize passam pelo mesmo lugar.
      if (this.mapData) {
        this.renderMap();
      } else {
        this.renderAttractBackdrop();
      }
    };

    /**
     * Controle: move o cursor de tile e confirma.
     *
     * ## Por que a cena recebe o comando em vez de ler o controle
     *
     * O `App.jsx` já lê `getGamepads` uma vez por quadro. Ler de novo aqui
     * daria duas bordas de clique para a mesma mão, e a segunda leria como "ainda
     * pressionado" — metade dos cliques sumiria, e não de forma constante, o que
     * é o pior tipo de bug.
     *
     * ## Por que a cena não decide o que é menu
     *
     * O evento chega com `telaAberta` já resolvido pelo React. Com um modal
     * aberto o comando é do menu, e mover o cursor da caverna por baixo dele é o
     * bug clássico de suporte a controle em jogo com HTML sobre o canvas: a
     * pessoa mexe o direcional, o cursor anda escondido, e parece quebrado.
     *
     * ## Por que confirmar chama o mesmo caminho do clique
     *
     * `handleTileClick` é o que o mouse executa. Um segundo caminho para
     * "quebrou uma pedra" acabaria divergindo dele em algum regra — e a pessoa
     * quebraria uma pedra de um jeito e não do outro, sem nenhum erro visível.
     */
    this.onGamepad = (event) => {
      const estado = event?.detail?.estado;
      const telaAberta = event?.detail?.telaAberta ?? null;
      const ponteiro = event?.detail?.ponteiro ?? null;

      const querMenu = telaAberta !== null;
      const conectado = Boolean(estado?.conectado);

      // Perdeu o controle, ou abriu um modal por cima: o cursor some. Sem isto, o
      // losango fica marcado num tile qualquer, e a pessoa desconectou há dez
      // segundos.
      if (!conectado || querMenu) {
        this.cursorVisivel = false;
        this.cursorIndicator?.clear();
        this.cursorIndicator?.setVisible(false);

        if (!conectado) this.cursorTile = null;

        return;
      }

      if (!this.cursorTile) {
        const entrada = this.mapData?.entry;
        if (!entrada) return;

        this.cursorTile = tileInicialDoCursor(entrada, this.mapData.width, this.mapData.height);
      }

      // O ponteiro tem precedência sobre o passo em grade, pelo mesmo motivo do
      // menu: quem mexe o analógico está mirando em algum lugar, e deixar o
      // cursor andar para outro lado seria brigar com a mão da pessoa.
      const mirarComPonteiro = ponteiro?.andou ? this.mirarPeloPonteiro(ponteiro) : false;

      const direcao = estado.direcoes?.dominante ?? null;

      if (direcao && this.cursorTile && !mirarComPonteiro) {
        const { tileWidth, tileHeight } = this.renderMetrics;

        this.cursorTile = proximoTileValido(
          this.cursorTile.col,
          this.cursorTile.row,
          estado.eixo?.x ?? 0,
          estado.eixo?.y ?? 0,
          {
            largura: this.mapData.width,
            altura: this.mapData.height,
            metricas: { tileWidth, tileHeight }
          },
          // O cursor pode ficar sobre a pedra. Este filtro é o que permite
          // quebrar: o `A` chama `handleTileClick` no tile **de baixo** do
          // cursor, e `handleTileClick` sai na hora se o tile não for pedra.
          //
          // Com o filtro antigo (`type !== 'rock'`) o cursor estava preso ao
          // chão, e o botão de confirmar não tinha como acertar uma pedra —
          // nenhuma, nunca. A gamepad movia o losango pelo mapa e não quebrava
          // nada. O filtro agora só recusa tile que **não existe**; a borda da
          // caverna, que decide o que pode ser quebrado, continua sendo
          // `isFrontierRock` no `handleTileClick`.
          (col, row) => Boolean(this.mapData.tiles[row]?.[col])
        );
      }

      this.cursorVisivel = true;
      this.renderCursorIndicator();

      if (estado.bordas?.confirmar && this.cursorTile) {
        const tile = this.mapData.tiles[this.cursorTile.row]?.[this.cursorTile.col];

        if (tile) this.handleTileClick(tile);
      }
    };

    /**
     * Pausa e retoma a cena.
     *
     * O overlay de pausa é React, então a cena do Phaser não sabe que ele
     * existe. Este é o canal: o React avisa, e a cena congela de verdade.
     *
     * `scene.pause()` para o `update` e o input, que é o que a pausa precisa. A
     * alternativa seria um `if (this.paused) return` no meio de cada handler, e
     * isso não cobre o que o Phaser despacha direto, como o timer de uma
     * armadilha ou uma animação em curso.
     */
    this.onPauseChange = (event) => {
      const shouldPause = Boolean(event?.detail?.paused);

      if (this.paused === shouldPause) return;

      this.paused = shouldPause;
      this.hoveredRockTile = null;
      this.hoverIndicator?.clear();
      this.hoverIndicator?.setVisible(false);

      if (shouldPause) {
        this.scene.pause();
      } else {
        this.scene.resume();
      }

      this.publishSceneState();
    };

    this.onSettingsChange = (event) => {
      const next = event?.detail ?? {};
      const reducedMotion = Boolean(next.reducedMotion);

      // O idioma é resolvido ANTES da saída antecipada, e o motivo é concreto: a
      // saída existe para não redesenhar o mapa quando o `reducedMotion` não
      // mudou, e trocar de idioma muda o texto desenhado na cena sem mexer
      // nesse valor. Com a checagem na frente, a troca de idioma nunca chegaria
      // a redesenhar, e o "SAÍDA" ficaria na língua anterior em cima de um mapa
      // já todo traduzido.
      const idiomaAntes = getLocale();
      setLocale(next.language);
      const idiomaMudou = getLocale() !== idiomaAntes;

      if (this.reducedMotion === reducedMotion && !idiomaMudou) return;

      this.reducedMotion = reducedMotion;

      if (this.mapData && !this.metaState.inLobby) {
        this.renderMap();
      }
    };

    this.onHudInset = (event) => {
      this.setHudInset(event?.detail?.height);
    };

    this.onForcedResize = () => {
      this.scheduleResponsiveRefresh();
    };

    this.onOpenExitLobby = (event) => {
      const nextCave = event?.detail?.nextCave ?? this.metaState.cave + 1;
      const message =
        event?.detail?.message ?? t('msg.exitToCave', { n: nextCave });

      this.openLobby('exit', message, nextCave);
    };

    window.addEventListener('cob-buy-utility', this.onExternalSync);
    window.addEventListener('cob-use-utility', this.onUtilityUse);
    window.addEventListener('cob-restart-run', this.onManualRestart);
    window.addEventListener('cob-enter-cave', this.onEnterCave);
    window.addEventListener('cob-open-exit-lobby', this.onOpenExitLobby);
    window.addEventListener('cob-settings', this.onSettingsChange);
    window.addEventListener('cob-attract-mode', this.onAttractMode);
    window.addEventListener('cob-hud-inset', this.onHudInset);
    window.addEventListener('cob-force-resize', this.onForcedResize);
    window.addEventListener('cob-pause', this.onPauseChange);
    window.addEventListener('cob-controle', this.onGamepad);
    this.scale.on('resize', this.onResize);

    this.events.on('shutdown', () => {
      window.removeEventListener('cob-buy-utility', this.onExternalSync);
      window.removeEventListener('cob-use-utility', this.onUtilityUse);
      window.removeEventListener('cob-restart-run', this.onManualRestart);
      window.removeEventListener('cob-enter-cave', this.onEnterCave);
      window.removeEventListener('cob-open-exit-lobby', this.onOpenExitLobby);
      window.removeEventListener('cob-settings', this.onSettingsChange);
      window.removeEventListener('cob-attract-mode', this.onAttractMode);
      window.removeEventListener('cob-hud-inset', this.onHudInset);
      window.removeEventListener('cob-force-resize', this.onForcedResize);
      window.removeEventListener('cob-pause', this.onPauseChange);
      window.removeEventListener('cob-controle', this.onGamepad);
      this.scale.off('resize', this.onResize);
      this.clearResponsiveRefreshQueue();
      this.flushPendingEffects();

      // Se a cena morrer pausada, o overlay de pausa do React fica esperando um
      // `resume` que nunca vem. Retomar aqui garante que o estado do Phaser e o
      // do React não fiquem discordando quando o jogador voltar ao menu.
      if (this.paused) {
        this.paused = false;
        this.scene.resume();
      }
    });

    if (this.metaState.inLobby) {
      this.renderLobbyBackdrop();
      this.syncUI();
    } else {
      this.refreshRun(false);
    }

    this.scheduleResponsiveRefresh();

    // A cena nasce depois do React montar, então os eventos de intenção de UI
    // (settings, modo attract, altura do HUD) disparados no mount chegam
    // antes de existir quem os escute. Este aviso faz o React reenviar tudo.
    window.dispatchEvent(new CustomEvent('cob-scene-ready'));
  }

  clearResponsiveRefreshQueue() {
    if (!this.pendingResponsiveRefreshes?.length) return;

    this.pendingResponsiveRefreshes.forEach((timer) => {
      if (timer) {
        timer.remove(false);
      }
    });

    this.pendingResponsiveRefreshes = [];
  }

  /**
   * Registra um callback atrasado para que ele seja cancelado quando a run
   * muda de cave. Sem isso, uma quebra em cascata disparada com atraso
   * poderia invadir a próxima cave e conceder recompensas da cave anterior.
   */
  trackEffect(timer) {
    this.pendingEffects.push(timer);
    return timer;
  }

  flushPendingEffects() {
    if (this.pendingEffects.length) {
      this.pendingEffects.forEach((timer) => timer?.remove?.(false));
      this.pendingEffects = [];
    }

    this.clearHoveredRock();
    this.hidePickaxeEffect();
  }

  performResponsiveRefresh() {
    if (!this.scene.isActive()) return;

    if (this.metaState.inLobby) {
      this.renderLobbyBackdrop();
      this.syncUI();
      return;
    }

    if (this.mapData) {
      this.renderMap();
      this.syncUI();
    }
  }

  scheduleResponsiveRefresh() {
    this.clearResponsiveRefreshQueue();

    this.performResponsiveRefresh();

    [120, 320, 520].forEach((delay) => {
      const timer = this.time.delayedCall(delay, () => {
        this.performResponsiveRefresh();
      });

      this.pendingResponsiveRefreshes.push(timer);
    });
  }

  getViewportProfile() {
    const width = this.scale.width;
    const height = this.scale.height;
    const isLandscape = width >= height;
    const isShort = height <= 430;
    const isNarrow = width <= 900;
    const isMobileLandscape = isLandscape && (height <= 500 || width <= 920);

    // A altura real do HUD em React vence a heurística: sem isso o topo do
    // mapa ficava escondido atrás do HUD de 2-3 linhas.
    const fallbackHud = isMobileLandscape ? 50 : height <= 560 ? 58 : 74;
    const hudTopOffset = this.hudInset > 0 ? this.hudInset : fallbackHud;

    return {
      width,
      height,
      isLandscape,
      isShort,
      isNarrow,
      isMobileLandscape,
      isCompact: height <= 430 || width <= 760,
      hudTopOffset,
      bottomPadding: isMobileLandscape ? 10 : 18,
      sidePadding: isMobileLandscape ? 18 : width <= 1100 ? 24 : 34,
      verticalNudge: isMobileLandscape ? 6 : 28
    };
  }

  setHudInset(value) {
    const next = Math.max(0, Math.round(value || 0));

    if (Math.abs(next - this.hudInset) < 2) return;

    this.hudInset = next;

    if (this.mapData || this.metaState.inLobby) {
      this.scheduleResponsiveRefresh();
    }
  }

  getMapBoundsForMetrics(originX, originY, tileWidth, tileHeight) {
    const points = [];

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        const point = toIso(col, row, originX, originY, tileWidth, tileHeight);

        points.push({
          minX: point.x - tileWidth / 2,
          maxX: point.x + tileWidth / 2,
          // Apenas a "coroa" da rocha entra acima do centro do tile, e o
          // brilho do chão few pixels abaixo. Usar 1.5x/1.0x inflava a caixa
          // em ~1.8x e encolhia o mapa inteiro na tela.
          minY: point.y - tileHeight * 0.95,
          maxY: point.y + tileHeight * 0.62
        });
      }
    }

    return {
      minX: Math.min(...points.map((p) => p.minX)),
      maxX: Math.max(...points.map((p) => p.maxX)),
      minY: Math.min(...points.map((p) => p.minY)),
      maxY: Math.max(...points.map((p) => p.maxY))
    };
  }

  updateRenderMetrics() {
    const profile = this.getViewportProfile();
    const baseBounds = this.getMapBoundsForMetrics(0, 0, BASE_TILE_WIDTH, BASE_TILE_HEIGHT);
    const mapWidth = baseBounds.maxX - baseBounds.minX;
    const mapHeight = baseBounds.maxY - baseBounds.minY;
    const availableWidth = Math.max(260, profile.width - profile.sidePadding * 2);
    const availableHeight = Math.max(
      220,
      profile.height - profile.hudTopOffset - profile.bottomPadding - (profile.isMobileLandscape ? 6 : 12)
    );

    let fitScale = Math.min(availableWidth / mapWidth, availableHeight / mapHeight);

    if (!Number.isFinite(fitScale) || fitScale <= 0) {
      fitScale = 1;
    }

    if (profile.isMobileLandscape) {
      fitScale *= 0.94;
    }

    // O teto subiu de 1.16 para 1.35: com o chão agora ocupando a célula
    // inteira (antes sobrava padding transparente na arte), a cave ficava
    // pequena no meio da tela em vez de contínua. Teto, não mínimo, para não
    // inflar o mapa em telas grandes.
    const renderScale = Phaser.Math.Clamp(fitScale, 0.54, 1.35);


    this.renderMetrics = {
      ...profile,
      ...getTileMetrics(renderScale)
    };
  }

  countHiddenBombs() {
    if (!this.mapData) return 0;

    let total = 0;

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        if (this.mapData.tiles[row][col].hiddenContent === 'bomb') total += 1;
      }
    }

    return total;
  }

  refreshRun(keepCave = false) {
    this.backgroundLayer.removeAll(true);
    this.floorLayer.removeAll(true);
    this.objectLayer.removeAll(true);
    this.flushPendingEffects();

    // A run morta volta para a primeira cave do bioma dela. A linha escrevia
    // `cave = 1` à mão, o que jogava quem morresse a partir da cave 11 no começo
    // do jogo — e perder o bioma inteiro é mais duro do que a morte que a
    // provocou. A regra mora em `caveAoMorrer` porque a tela de derrota, no
    // React, precisa dar a mesma resposta.
    if (!keepCave && this.metaState.hp <= 0) {
      this.metaState.cave = caveAoMorrer(this.metaState.cave);
      this.metaState.hp = this.metaState.maxHp;
      this.metaState.bombs = 0;
    }

    if (this.metaState.inLobby) {
      this.renderLobbyBackdrop();
      this.syncUI();
      return;
    }

    this.mapData = generateMap(
      this.metaState.cave,
      this.metaState.pickaxePower,
      (this.metaState.coinBonusLevel ?? 0) * 0.008
    );
    this.metaState.biomeId = this.mapData.biome?.id ?? getBiomeForCave(this.metaState.cave).id;
    this.metaState.biomeName = this.mapData.biome?.name ?? getBiomeForCave(this.metaState.cave).name;
    this.metaState.bombsRemaining = this.countHiddenBombs();
    this.cameras.main.setBackgroundColor(this.mapData.biome?.palette?.background ?? '#14181f');
    this.renderMap();
    this.syncUI();
  }

  /**
   * Fundo do lobby, que é o fundo do menu.
   *
   * O lobby não tem mapa: é a tela entre uma cave e a próxima. Então o fundo
   * dele é a arte do bioma, exatamente como na tela de título, e usa o mesmo
   * renderizador.
   *
   * Antes isto chamava `drawCaveWalls` diretamente, e `drawCaveWalls` desenha
   * uma sombra de chão arredondada (`floorShadow`) para assentar o mapa. Sem
   * mapa, essa sombra vira um retângulo vazio no meio da caverna — o mesmo tipo
   * de elemento fantasma que foi removido do fundo da cave.
   */
  renderLobbyBackdrop() {
    this.hoverIndicator.setVisible(false);
    this.hidePickaxeEffect();

    this.updateRenderMetrics();
    this.renderAttractBackdrop();
  }

  getCenteredMapOrigin() {
    this.updateRenderMetrics();

    const { tileWidth, tileHeight, hudTopOffset, bottomPadding, verticalNudge } = this.renderMetrics;
    const bounds = this.getMapBoundsForMetrics(0, 0, tileWidth, tileHeight);

    return {
      x: this.scale.width / 2 - (bounds.minX + bounds.maxX) / 2,
      y:
        hudTopOffset +
        (this.scale.height - hudTopOffset - bottomPadding) / 2 -
        (bounds.minY + bounds.maxY) / 2 +
        verticalNudge
    };
  }

  renderExitHighlight(point) {
    const { tileWidth, tileHeight } = this.renderMetrics;
    const halo = this.add.graphics();

    halo.lineStyle(3, 0x86ffb3, 0.95);
    halo.fillStyle(0x34d27a, 0.18);
    halo.beginPath();
    halo.moveTo(point.x, point.y - tileHeight / 2 - 6);
    halo.lineTo(point.x + tileWidth / 2 + 4, point.y + 1);
    halo.lineTo(point.x, point.y + tileHeight / 2 + 10);
    halo.lineTo(point.x - tileWidth / 2 - 4, point.y + 1);
    halo.closePath();
    halo.fillPath();
    halo.strokePath();
    halo.setDepth(point.y + 4);
    halo.alpha = 0.85;

    this.objectLayer.add(halo);

    this.tweens.add({
      targets: halo,
      alpha: 0.35,
      duration: 850,
      yoyo: true,
      repeat: -1
    });
  }

  getMapScreenBounds(originX, originY) {
    const { tileWidth, tileHeight } = this.renderMetrics;
    return this.getMapBoundsForMetrics(originX, originY, tileWidth, tileHeight);
  }

  /**
   * Desenha a arte de fundo do bioma, e garante que ela esteja carregada.
   *
   * O fundo é 4K (1672x941) e cada um dos seis vale 2,9 MB, então só o do bioma
   * atual é carregado — ver `backdrops.js`. A consequência é que aqui pode não
   * haver textura ainda, e são três desfechos:
   *
   * 1. **Tem a textura do bioma**: desenha, e é o caminho normal.
   * 2. **Não tem, mas a da Mina Solar tem**: desenha a da Mina Solar.
   * 3. **Não tem nenhuma das duas**: pinta um retângulo com `palette.background`,
   *    a cor do próprio bioma. O redesenho chega com o `complete`.
   *
   * ## O X verde, e por que ele aparecia
   *
   * Cinco dos seis biomas entravam com uma caixa preta e um X verde no lugar do
   * fundo, sem erro no console. O X é a textura `__MISSING` do Phaser, e ela é o
   * que `textures.get(chave)` devolve quando a chave não está na lista. E
   * `textures.exists(chave)` é `list.hasOwnProperty(chave)` — então ele não
   * distingue "carregou" de "não carregou", e a checagem antiga dizia que sim.
   *
   * A barreira é `texturaEhUsavel`, que compara a chave da textura devolvida com a
   * chave pedida, e a reserva é o que impede o pior: mesmo que a checagem erre,
   * o jogador vê uma caverna em vez de uma caixa preta.
   *
   * ## O console.error
   *
   * Uma vez por chave, não uma por quadro: o `renderMap` passa aqui várias vezes
   * enquanto o fundo baixa, e um erro por quadro esconde a mensagem em vez de
   * destacá-la. Ele traz o que a cena vê — `exists` e `get` das duas chaves —
   * porque a causa deste bug não estava no código que desenhou, e sim na checagem
   * que decidiu que a arte tinha chegado.
   */
  drawBiomeBackdrop(biome, depth, alpha) {
    const chave = getBackdropKey(biome.id);
    const reserva = getBackdropKey(BIOMA_INICIAL);

    // Não há pedido aqui. Os seis fundos e as seis entradas entram no `BootScene`,
    // então neste ponto a textura está carregada ou não está — e não há caminho
    // que a busque, porque a carga por demanda não funcionou e saiu. Ver o
    // cabeçalho de `backdrops.js`.
    //
    // A reserva para a Mina Solar é o seguro contra o pior desfecho possível: a
    // textura `__MISSING` do Phaser, que é a caixa preta com X verde. Uma caverna
    // errada é feio; uma caixa preta não é jogável.
    const usa = texturaEhUsavel(this, chave)
      ? chave
      : texturaEhUsavel(this, reserva)
        ? reserva
        : null;

    if (this.fundoAvisado !== chave) {
      this.fundoAvisado = chave;

      // A reserva é um evento, não um estado: ela é o que esconde a falha, e é
      // justamente por isso que precisa aparecer no console. Sem este aviso, "o
      // bioma mostrou a caverna errada" é indistinguível de "está tudo bem".
      if (usa === reserva) {
        console.error(
          `[fundo] o bioma ${biome.id} está sem a textura ${chave} e está usando `
            + `o fundo da Mina Solar no lugar. A cena ve: `
            + `exists=${this.textures && this.textures.exists(chave)} `
            + `get=${descreveTextura(this, chave)}`
        );
      } else if (!usa) {
        console.error(
          `[fundo] nenhuma textura de fundo utilizavel para o bioma ${biome.id}. `
            + `Nem ${chave} nem ${reserva}. A cena ve: `
            + `exists=${this.textures && this.textures.exists(chave)} `
            + `get=${descreveTextura(this, chave)}`
        );
      }
    }

    if (!usa) {
      const placeholder = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        biome.palette.background,
        1
      );

      placeholder.setDepth(depth);
      this.backgroundLayer.add(placeholder);
      return;
    }

    if (usa === chave) this.fundoAvisado = null;

    const background = this.add.image(this.scale.width / 2, this.scale.height / 2, usa);
    const coverScale = Math.max(this.scale.width / background.width, this.scale.height / background.height);

    background.setScale(coverScale);
    background.clearTint();
    background.setAlpha(alpha);
    background.setDepth(depth);
    this.backgroundLayer.add(background);
  }

  drawCaveWalls(bounds) {
    const biome = this.mapData?.biome ?? getBiomeForCave(this.metaState.cave);
    this.drawBiomeBackdrop(biome, -1000, 1);

    const edgeShade = this.add.graphics();
    edgeShade.fillStyle(biome.palette.edge, 0.26);
    edgeShade.fillRect(0, 0, this.scale.width, Math.max(38, this.renderMetrics.hudTopOffset + 8));
    edgeShade.fillRect(0, this.scale.height - 86, this.scale.width, 86);
    edgeShade.fillRect(0, 0, 84, this.scale.height);
    edgeShade.fillRect(this.scale.width - 84, 0, 84, this.scale.height);
    edgeShade.setDepth(-995);
    this.backgroundLayer.add(edgeShade);

    const floorShadow = this.add.graphics();
    floorShadow.fillStyle(biome.palette.edge, 0.14);
    floorShadow.fillRoundedRect(
      bounds.minX - 70,
      bounds.maxY + 18,
      bounds.maxX - bounds.minX + 140,
      72,
      30
    );
    floorShadow.setDepth(-994);
    this.backgroundLayer.add(floorShadow);
  }

  /**
   * Fundo da cave: a arte do bioma, e só ela.
   *
   * Antes isto desenhava um segundo cenário por cima do background: umas 40
   * pedras com `alpha` de 0,14 a 0,16 ao longo das bordas, mais 18 fissuras
   * desenhadas e 34 pontos de poeira. Eram as "rochas quase invisíveis" que
   * apareciam sobre a arte do bioma: um borrão fantasma, sem pertencer a lugar
   * nenhum, que só escurecia o fundo e criava a impressão de bug.
   *
   * A arte do bioma (`cave_bg_*`) já é uma caverna completa, com parede,
   * chão e profundidade. Encher o que está atrás dela com um cenário
   * procedural só compete com a arte. O que sobra é a vinheta, que serve para
   * assentar a UI, e a poeira, que é a única camada que ainda dá vida.
   */
  renderCaveBackdrop(originX, originY) {
    this.backgroundLayer.removeAll(true);

    const bounds = this.getMapScreenBounds(originX, originY);
    const width = this.scale.width;
    const height = this.scale.height;
    const biome = this.mapData?.biome ?? getBiomeForCave(this.metaState.cave);

    this.drawCaveWalls(bounds);

    const dust = this.add.graphics();
    dust.fillStyle(biome.palette.dust, 0.05);

    for (let i = 0; i < 34; i += 1) {
      const px = Phaser.Math.Between(Math.floor(bounds.minX - 120), Math.floor(bounds.maxX + 120));
      const py = Phaser.Math.Between(Math.floor(bounds.minY - 90), Math.floor(bounds.maxY + 120));
      const radius = Phaser.Math.Between(1, 3);
      dust.fillCircle(px, py, radius);
    }

    dust.setDepth(-980);
    this.backgroundLayer.add(dust);

    const vignette = this.add.graphics();
    vignette.fillStyle(biome.palette.edge, 0.14);
    vignette.fillRect(0, 0, 68, height);
    vignette.fillRect(width - 68, 0, 68, height);
    vignette.fillRect(0, 0, width, 42);
    vignette.fillRect(0, height - 58, width, 58);
    vignette.setDepth(-970);
    this.backgroundLayer.add(vignette);
  }

  /**
   * Fundo da tela de título: a arte do bioma, nada mais.
   *
   * Sem o mapa. Ver o comentário de `onAttractMode` — desenhar a cave aqui
   * colocava um segundo cenário por cima da arte, e eram as rochas que
   * apareciam atravessando o logo no menu.
   */
  renderAttractBackdrop() {
    this.backgroundLayer.removeAll(true);
    this.floorLayer.removeAll(true);
    this.objectLayer.removeAll(true);

    const biome = getBiomeForCave(this.metaState.cave);
    const width = this.scale.width;
    const height = this.scale.height;

    this.drawBiomeBackdrop(biome, -1000, 1);

    // Vinheta mais forte que a da cave: o texto do menu precisa de contraste,
    // e a arte do bioma é clara em alguns pontos.
    const shade = this.add.graphics();
    shade.fillStyle(biome.palette.edge, 0.3);
    shade.fillRect(0, 0, width, 160);
    shade.fillRect(0, height - 190, width, 190);
    shade.fillRect(0, 0, 240, height);
    shade.fillRect(width - 240, 0, 240, height);
    shade.setDepth(-995);
    this.backgroundLayer.add(shade);

    this.publishSceneState();
  }

  /**
   * Publica o estado da cena em `window`, para ser observável de fora.
   *
   * O Phaser 3.90 removeu `Phaser.GAMES`, então não há caminho oficial para
   * alcançar a cena a partir do console. E ler o canvas não prova nada: o WebGL
   * é criado sem `preserveDrawingBuffer`, então o readback volta vazio.
   *
   * A contagem de objetos por camada é a parte que resolve a dúvida real — "o
   * que está desenhado atrás do menu?". Antes desta mudança, a resposta era
   * só olhando, e foi assim que o cenário procedural sobreviveu tanto tempo
   * por cima da arte do bioma.
   */
  publishSceneState() {
    window.__cobSceneState = {
      paused: this.paused,
      cave: this.metaState?.cave ?? null,
      hp: this.metaState?.hp ?? null,
      inLobby: this.metaState?.inLobby ?? null,
      attractMode: this.attractMode,
      layers: {
        background: this.backgroundLayer?.length ?? 0,
        floor: this.floorLayer?.length ?? 0,
        objects: this.objectLayer?.length ?? 0
      },
      // Quantos modelos de rocha diferentes estão em uso agora, e quais.
      //
      // Existe por um motivo concreto: houve uma versão em que as 35 rochas da
      // Cave 1 apareciam todas com o mesmo modelo, e nada no build, nos testes
      // ou no console dizia por quê. Contar os frames em uso é o que responde
      // "a variação está no mapa ou só na folha de arte" em uma leitura.
      rockFrames: this.countRockFramesInUse()
    };
  }

  /**
   * Modelos de rocha em uso, medidos de dois jeitos.
   *
   * `dados` é o que o mapa pediu: os índices de `tile.rockVariant`. `sprites` é
   * o que o Phaser realmente entregou, lido de cada `rockSprite.frame`.
   *
   * Os dois juntos são o que separa "o mapa mandou o índice certo" de "o sprite
   * recebeu o frame certo". Houve uma versão em que `dados` contava 12 e
   * `sprites` contava 1 — o mapa estava perfeito e as 35 rochas eram a mesma
   * imagem, e nenhum aviso dizia por quê.
   */
  countRockFramesInUse() {
    if (!this.mapData || this.metaState.inLobby) return null;

    const dados = new Set();
    const sprites = new Set();
    // O bioma vem do MAPA, e não do metaState: o metaState carrega o bioma de
    // uma cave anterior, e contar a variação com o bioma errado daria um número
    // que não corresponde ao que está na tela.
    const biomeId = this.mapData.biome?.id ?? 'sunstone';

    for (const linha of this.mapData.tiles) {
      for (const tile of linha) {
        if (tile.type !== 'rock') continue;

        if (Number.isInteger(tile.rockVariant)) {
          dados.add(getRockFrameIndex(biomeId, tile.rockVariant));
        }

        const frame = tile.rockSprite?.frame;
        if (frame) sprites.add(`${frame.name}@${frame.cutX},${frame.cutY}`);
      }
    }

    return {
      dadosDistintos: dados.size,
      dadosIndices: [...dados].sort((a, b) => a - b),
      spritesDistintos: sprites.size,
      sprites: [...sprites].sort()
    };
  }

  getMarkerFontSize(base) {
    if (this.renderMetrics.isMobileLandscape) {
      return `${Math.max(12, Math.round(base * 0.72))}px`;
    }

    if (this.renderMetrics.isCompact) {
      return `${Math.max(13, Math.round(base * 0.84))}px`;
    }

    return `${base}px`;
  }

  renderSafePathHighlight(point, depth) {
    const { tileWidth, tileHeight } = this.renderMetrics;
    const glow = this.add.graphics();

    glow.lineStyle(2, 0x8df0b0, 0.95);
    glow.fillStyle(0x6cff8b, 0.10);
    glow.beginPath();
    glow.moveTo(point.x, point.y - tileHeight * 0.28);
    glow.lineTo(point.x + tileWidth * 0.3, point.y);
    glow.lineTo(point.x, point.y + tileHeight * 0.28);
    glow.lineTo(point.x - tileWidth * 0.3, point.y);
    glow.closePath();
    glow.fillPath();
    glow.strokePath();
    glow.setDepth(depth);

    this.objectLayer.add(glow);
  }

  /**
   * Desenha o mapa da cave.
   *
   * O guarda de `attractMode` fica AQUI, e não em cada chamador. `renderMap` é
   * chamado de vários lugares — `refreshRun`, `performResponsiveRefresh`, a
   * volta ao lobby — e o sync de resize agenda três redesenhos logo depois do
   * create. Com o guarda só no `onAttractMode`, o menu desenhava a arte do bioma
   * e logo em seguida o mapa inteiro por cima: o mesmo fantasma de rocha que
   * o recurso veio para tirar, só que voltando 300ms depois.
   *
   * No lugar certo, o caminho é único e nenhum chamador precisa saber.
   */
  renderMap() {
    if (this.attractMode && !this.metaState.inLobby) {
      this.renderAttractBackdrop();
      return;
    }

    this.backgroundLayer.removeAll(true);
    this.floorLayer.removeAll(true);
    this.objectLayer.removeAll(true);
    this.hoveredRockTile = null;
    this.hoverIndicator.setVisible(false);
    this.hideCursor();

    const centeredOrigin = this.getCenteredMapOrigin();
    const { tileWidth, tileHeight, mapScale } = this.renderMetrics;
    const originX = centeredOrigin.x;
    const originY = centeredOrigin.y;
    this.origin = { x: originX, y: originY };

    this.renderCaveBackdrop(originX, originY);
    const biome = this.mapData.biome ?? getBiomeForCave(this.metaState.cave);
    const groundTexture = getGroundTextureKey(biome.id);

    // Filhos de um Phaser.Container são desenhados na ordem de inserção:
    // setDepth() é ignorado dentro de containers. Em isométrico o grid
    // precisa de ordenação por Y real, e o loop row->col original não é
    // monotônico em Y, o que fazia rochas da frente sumirem atrás de
    // tiles que deveriam ficar atrás delas.
    const drawOrder = [];

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        drawOrder.push({ row, col, y: originY + (col + row) * (tileHeight / 2) });
      }
    }

    drawOrder.sort((a, b) => a.y - b.y);

    drawOrder.forEach(({ row, col, y }) => {
      const tile = this.mapData.tiles[row][col];
      const point = toIso(col, row, originX, originY, tileWidth, tileHeight);
      const isRock = tile.type === 'rock';

      // Chão: o losango da superfície superior é alinhado na célula, e não
      // a arte inteira. Ver FLOOR_ART em config.js — desenhar o bloco inteiro
      // fazia as faces laterais invadir o tile vizinho e o piso virar uma
      // pilha de blocos em vez de chão contínuo.
      const floor = drawGroundCell(this, col, row, point, tileWidth, tileHeight, groundTexture);

      floor.setData('tile', tile);
      tile.floorSprite = floor;

      // A cor do bioma JÁ está na textura: cada bioma tem o seu atlas, com a
      // sua cor de solo. O tint aqui é só um ajuste fino, e é a MESMA cor para
      // todas as células.
      //
      // Pode parecer que estamos tingindo tile por tile, que era exatamente o
      // que criava grade: não é. Grade vem de valor VARIADO por tile, que
      // produz degrau de luminância na fronteira. Uma cor só é aritmeticamente
      // o mesmo que tingir a camada inteira — e é a única opção, porque
      // `Container` não tem `setTint` (os mixins dele são AlphaSingle,
      // BlendMode, ComputedSize, Depth, Mask, PostPipeline, Transform e
      // Visible, sem Tint). Chamar `floorLayer.setTint(...)` estoura um
      // TypeError no fim do renderMap e mata a cena, deixando a tela preta com
      // o HUD de React por cima. Foi o que aconteceu. Ver test/scene.test.mjs.
      floor.setTint(biome.palette.ground);

      // Saída e entrada ficam por cima da cor do bioma, por serem marcadores de
      // jogo e precisar de leitura imediata.
      if (tile.type === 'exit') {
        floor.setTint(biome.palette.exit);
        floor.setInteractive({ cursor: 'pointer' });
      }

      if (tile.type === 'entrance') {
        floor.setTint(biome.palette.entrance);
      }

      this.floorLayer.add(floor);

      if (!isRock) {
        this.renderGrit(tile, point, tileWidth, tileHeight);
      }

      if (isRock) {
        const revealedBomb = tile.utilityRevealBomb === true;

        // A célula da folha é quadrada, e ela inteira vai para um quadrado na
        // tela. Escala uniforme, sem `setDisplaySize` com dois valores: foi
        // exatamente o `setDisplaySize` que achatava a rocha antiga de 82x80
        // para 80x45, e os doze modelos novos têm proporções muito diferentes
        // entre si. Ver `ROCK_DISPLAY` em rocks.js.
        const rockSize = Math.round(tileWidth * ROCK_DISPLAY * (revealedBomb ? 0.5 : 1));
        const frameIndex = revealedBomb ? 0 : getRockFrameIndex(biome.id, tile.rockVariant);
        // A bomba revelada é uma imagem solta e não entra no jitter: ela é um
        // marcador de jogo, e um marcador que gira e muda de tamanho deixa de
        // ser um marcador.
        const jitter = revealedBomb
          ? { angulo: 0, escala: 1, espelhar: false }
          : getRockJitter(tile.col, tile.row, frameIndex);

        const rock = this.add
          // Textura e frame são separados: a bomba revelada é uma imagem
          // solta, com um frame só, e por isso precisa de `setFrame(0)`. Passar
          // um índice de folha nela daria o placeholder de textura ausente.
          .image(point.x, point.y + tileHeight * 0.3, revealedBomb ? 'bomb' : getRockSheetKey(biome.id))
          // Origem na base: o recorte encaixa cada modelo no rodapé da célula,
          // então ancorar embaixo é o que faz todas as rochas assentarem no
          // mesmo chão em vez de cada uma flutuar na sua altura.
          .setOrigin(0.5, 1)
          .setDisplaySize(rockSize, rockSize)
          .setFrame(frameIndex)
          .setInteractive({ cursor: 'pointer' });

        // O jitter vem DEPOIS, e multiplica a escala em vez de trocar. Se a
        // escala fosse trocada, a rocha deixaria de caber no losango do tile —
        // que é a única coisa que faz a grade do mapa continuar legível.
        //
        // Estas três linhas NÃO podem entrar na cadeia de cima. Ler
        // `rock.scaleX` de dentro da expressão que ainda está produzindo `rock`
        // é zona morta temporal: `ReferenceError` na primeira rocha, a exceção
        // sobe do `renderMap` e a cena morre — canvas preto com o HUD de React
        // por cima. Foi exatamente o que aconteceu, e é a segunda vez que este
        // projeto cai nesse buraco.
        rock.setScale(rock.scaleX * jitter.escala, rock.scaleY * jitter.escala);
        rock.setAngle(jitter.angulo);
        rock.setFlipX(jitter.espelhar);

        rock.setData('tile', tile);

        if (revealedBomb) {
          rock.setTint(0xffb0b0);
        }

        this.attachRockHover(rock, tile);
        this.objectLayer.add(rock);

        tile.rockSprite = rock;
        tile.sprite = rock;

        // A rota segura é desenhada DEPOIS da rocha de propósito. Antes ela
        // entrava antes do `if (isRock)` e ficava escondida atrás da laje —
        // ou seja, a poção "funcionava" e não mostrava nada.
        if (tile.safePath) {
          this.renderSafePathHighlight(point, point.y + 3);
        }

        return;
      }

      tile.sprite = floor;

      if (tile.safePath) {
        this.renderSafePathHighlight(point, point.y + 3);
      }

      if (tile.type === 'exit') {
        this.renderExitHighlight(point);
        this.renderExitStructure(point, point.y + 11);

        const glow = this.add.image(point.x, point.y - tileHeight * 0.42, 'exit_glow');
        glow.setScale(0.56 * mapScale);
        glow.setDepth(point.y + 13);
        this.objectLayer.add(glow);

        // No menu principal o mapa é fundo de tela de título: o texto "SAÍDA"
        // aparecendo por cima da vinheta parecia defeito, não arte.
        if (!this.attractMode) {
          const marker = this.add.text(point.x, point.y - tileHeight * 1.06, t('scene.markerOut'), {
            fontSize: this.getMarkerFontSize(18),
            color: '#f6fff9',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#0d2a1c',
            strokeThickness: this.renderMetrics.isMobileLandscape ? 4 : 5
          }).setOrigin(0.5);

          this.objectLayer.add(marker);
        }
      }

      if (tile.type === 'entrance') {
        // Uma boca por bioma, com o material do lugar no arco e no pedestal.
        // A proporção também é por bioma: measurei de 0,831 (Ruínas) a 0,883
        // (Cristal), e com uma constante única o `setDisplaySize` esticaria ou
        // achataria cinco das seis em até 6%.
        const entrada = getEntranceForBiome(biome.id);

        // A arte pode não ter chegado ainda: ela é carregada por bioma, junto
        // com o fundo. A checagem é `texturaEhUsavel`, e não `textures.exists`,
        // porque `exists` só diz que a chave está registrada — e o Phaser
        // desenha a `__MISSING`, a caixa preta com X verde, quando a textura
        // pedida não chegou. O tile fica vazio por meio segundo e o redesenho
        // chega junto com o fundo.
        if (texturaEhUsavel(this, entrada.key)) {
          const larguraBoca = Math.round(tileWidth * ENTRANCE_DISPLAY);
          const alturaBoca = Math.round(larguraBoca * getEntranceAspect(biome.id));

          // Ancorada na BASE e na linha do chão, como as rochas. Com `setScale`
          // e origem no centro, a boca ficava inteira flutuando acima do tile.
          const frame = this.add
            .image(point.x, point.y + tileHeight * CAVE_ENTRANCE_BASE, entrada.key)
            .setOrigin(0.5, 1)
            .setDisplaySize(larguraBoca, alturaBoca);

          frame.setDepth(point.y - 1);
          this.objectLayer.add(frame);
        }

        if (!this.attractMode) {
          const marker = this.add.text(point.x, point.y - tileHeight * 1.02, t('scene.markerIn'), {
            fontSize: this.getMarkerFontSize(15),
            color: '#f1fbff',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#10263c',
            strokeThickness: this.renderMetrics.isMobileLandscape ? 4 : 5
          }).setOrigin(0.5);

          this.objectLayer.add(marker);
        }
      }
    });

    this.publishSceneState();
  }

  /**
   * Entulho espalhado no chão. Chão liso demais é o que mais denuncia um
   * tile genérico: uma caverna tem cascalho, pedriscos e terra. Cada tile
   * sorteado recebe 1-3 pieces pequenos, com tom puxado para a cor da
   * caverna, então a textura aparece sem virar poluição.
   */
  renderGrit(tile, point, tileWidth, tileHeight) {
    const count = tile.grit ?? 0;

    if (count === 0) return;

    for (let i = 0; i < count; i += 1) {
      // Distribuição estável a partir do tile: redesenhar dá o mesmo chão.
      const seed = Math.sin((tile.col + 1) * 31.7 + (tile.row + 1) * 17.3 + i * 5.1) * 10000;
      const n = seed - Math.floor(seed);

      const offsetX = (n - 0.5) * tileWidth * 0.52;
      const offsetY = (n * 7 % 1 - 0.5) * tileHeight * 0.5;
      const size = tileWidth * (0.05 + (n % 0.3) * 0.05);

      const pebble = this.add
        .image(point.x + offsetX, point.y + offsetY, 'deco_rubble')
        .setDisplaySize(size, size * 0.72)
        .setAngle(Math.round(n * 90) - 45)
        .setAlpha(0.34 + (n % 0.3))
        .setTint(0x6b5a45);

      this.objectLayer.add(pebble);
    }
  }

  /**
   * A saída: a peça inteira que o jogador precisa achar.
   *
   * Antes eram quatro desenhos de vetor — uma elipse escura com contorno verde,
   * uma elipse verde dentro dela, e as linhas de dois montantes com três degraus
   * — que ocupavam 54 x 19px. Hoje é uma arte pintada, com buraco, anel de terra
   * e escada, na mesma largura e um pouco mais alta.
   *
   * ## Por que a arte substitui os três desenhos, e não só a escada
   *
   * A arte traz o anel de terra pintado em volta do buraco. Usá-la só no lugar
   * das linhas de degrau deixaria esse anel desenhado em volta de uma elipse
   * escura de vetor, e as duas bordas não iam bater. A peça é a saída, e a saída
   * inteira virou uma arte.
   *
   * ## O verde que sobrou
   *
   * O contorno verde da elipse antiga era o que dizia "aqui é o objetivo", e é a
   * pista que faz o jogador saber para onde andar. A arte nova é marrom e preta,
   * e não tem essa pista — então o verde continua, virando um brilho que sai por
   * trás do buraco. É o mesmo sinal com outra forma, e é o que segura a leitura
   * de "cheguei aqui" sem pintar a arte de verde.
   *
   * A saída oculta NÃO usa esta arte. Ela é um segredo que o jogador acha por
   * acaso, e uma peça pintada e detalhada num ponto aleatório do mapa entrega o
   * segredo antes da hora. Continua com a escada de vetor, discreta.
   */
  renderExitStructure(point, depth) {
    const { tileWidth, tileHeight } = this.renderMetrics;
    const centroY = point.y + tileHeight * EXIT_LADDER_CENTER_Y;

    const brilho = this.add.graphics();
    brilho.fillStyle(0x2f8f5b, 0.5);
    brilho.fillEllipse(point.x, centroY, tileWidth * 0.52, tileHeight * 0.4);
    brilho.setDepth(depth);
    this.objectLayer.add(brilho);

    const largura = Math.round(tileWidth * EXIT_LADDER_DISPLAY);
    const altura = Math.round(largura * EXIT_LADDER_ASPECT);

    const peca = this.add
      .image(point.x, centroY, 'exit_ladder')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(largura, altura);

    peca.setDepth(depth + 0.1);
    this.objectLayer.add(peca);
  }


  clearExitVisual(tile) {
    if (!tile) return;

    ['exitShadowSprite', 'exitHoleSprite', 'exitLadderSprite', 'exitGlowSprite', 'exitMarkerSprite'].forEach((key) => {
      const item = tile[key];
      if (item && typeof item.destroy === 'function') {
        item.destroy();
      }
      tile[key] = null;
    });
  }

  renderExitTileVisual(tile, point) {
    if (!tile || !point) return;

    this.clearExitVisual(tile);

    const { tileWidth, tileHeight } = this.renderMetrics;

    if (tile.floorSprite) {
      tile.floorSprite.setInteractive({ cursor: 'pointer' });
      tile.floorSprite.setData('tile', tile);
      tile.floorSprite.clearTint();
    }

    const shadow = this.add.ellipse(point.x, point.y + tileHeight * 0.08, tileWidth * 0.54, tileHeight * 0.24, 0x000000, 0.22);
    shadow.setDepth(point.y + 8);
    this.objectLayer.add(shadow);

    const hole = this.add.ellipse(point.x, point.y, tileWidth * 0.5, tileHeight * 0.2, 0x0e1216, 0.96);
    hole.setStrokeStyle(3, 0x3a2515, 0.9);
    hole.setDepth(point.y + 9);
    this.objectLayer.add(hole);

    const ladder = this.add.graphics();
    ladder.lineStyle(2, 0xc49a6c, 0.95);
    const leftX = point.x - tileWidth * 0.08;
    const rightX = point.x + tileWidth * 0.08;
    const topY = point.y - tileHeight * 0.02;
    const bottomY = point.y - tileHeight * 0.42;
    ladder.beginPath();
    ladder.moveTo(leftX, topY);
    ladder.lineTo(leftX, bottomY);
    ladder.moveTo(rightX, topY);
    ladder.lineTo(rightX, bottomY);

    for (let step = 1; step <= 3; step += 1) {
      const y = topY - step * (tileHeight * 0.1);
      ladder.moveTo(leftX, y);
      ladder.lineTo(rightX, y);
    }

    ladder.strokePath();
    ladder.setDepth(point.y + 10);
    this.objectLayer.add(ladder);

    const glow = this.add.image(point.x, point.y - tileHeight * 0.35, 'exit_glow');
    glow.setScale(0.48 * this.renderMetrics.mapScale);
    glow.setAlpha(0.82);
    glow.setDepth(point.y + 11);
    this.objectLayer.add(glow);

    const marker = this.add.text(point.x, point.y - tileHeight * 1.02, t('scene.markerOut'), {
      fontSize: this.getMarkerFontSize(16),
      color: '#f6fff9',
      fontStyle: 'bold',
      stroke: '#0d2a1c',
      strokeThickness: this.renderMetrics.isMobileLandscape ? 4 : 5
    }).setOrigin(0.5);
    marker.setDepth(point.y + 12);
    this.objectLayer.add(marker);

    this.tweens.add({
      targets: glow,
      alpha: 0.38,
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    tile.exitShadowSprite = shadow;
    tile.exitHoleSprite = hole;
    tile.exitLadderSprite = ladder;
    tile.exitGlowSprite = glow;
    tile.exitMarkerSprite = marker;
  }

  attachRockHover(rock, tile) {
    rock.on('pointerover', () => this.setHoveredRock(tile));
    rock.on('pointerout', () => {
      if (this.hoveredRockTile === tile) {
        this.clearHoveredRock();
      }
    });
  }

  applyRockBaseTint(tile) {
    if (!tile?.sprite?.active || tile.type !== 'rock') {
      return;
    }

    if (tile.utilityRevealBomb) {
      tile.sprite.setTint(0xffb0b0);
      return;
    }

    const biome = this.mapData?.biome ?? getBiomeForCave(this.metaState.cave);
    const tint = biome.palette?.rockHighlight;

    if (typeof tint === 'number' && tint !== 0xffffff) {
      tile.sprite.setTint(tint);
      return;
    }

    tile.sprite.clearTint();
  }

  setHoveredRock(tile) {
    if (!tile?.sprite || tile.type !== 'rock' || this.metaState.inLobby) {
      this.clearHoveredRock();
      return;
    }

    if (this.hoveredRockTile && this.hoveredRockTile !== tile) {
      this.applyRockBaseTint(this.hoveredRockTile);
    }

    const canBreak = isFrontierRock(this.mapData, this.mapData.entry, tile);
    this.hoveredRockTile = tile;
    tile.sprite.setTint(canBreak ? 0xb8ffbe : 0xffb0b0);
    this.renderHoverIndicator(tile, canBreak);
  }

  clearHoveredRock() {
    this.applyRockBaseTint(this.hoveredRockTile);
    this.hoveredRockTile = null;
    this.hoverIndicator.clear();
    this.hoverIndicator.setVisible(false);
  }

    /**
     * O losango do cursor de controle.
     *
     * A mesma forma do indicador de hover, com a cor de acento do jogo. Duas
     * cores para a mesma forma diriam "aqui é o mouse, aqui é o controle" — e a
     * pessoa não teria como saber qual está em uso.
     */
    /**
     * Aponta o cursor para o tile que está embaixo do ponteiro.
     *
     * ## Por que a mira continua sendo um tile
     *
     * Um clique em coordenada de tela erra por meio pixel, e meio pixel numa aresta
     * de pedra isométrica é clicar na pedra errada ou em nada. Por isso o ponteiro
     * **mira** — diz em que tile se está — e a ação continua resolvendo um tile
     * inteiro. A precisão volta a ser do grid.
     *
     * ## O caminho do pixel até o tile
     *
     * O ponteiro chega em coordenada de viewport, que é o que o DOM dá. O canvas
     * pode estar em outra posição, e a câmera rola e tem zoom: entra
     * `getWorldPoint` para sair disso, e só então a projeção isométrica é
     * invertida.
     *
     * Devolve `true` quando o cursor foi de fato mirado — e `false` quando o
     * ponteiro está fora do mapa, para o passo em grade poder seguir valendo em vez
     * de o cursor travar no último tile.
     */
    mirarPeloPonteiro(ponteiro) {
      if (!this.origin || !this.mapData) return false;

      const canvas = this.game?.canvas;
      const caixa = canvas?.getBoundingClientRect?.();

      if (!caixa) return false;

      // O React dá coordenada de viewport, e a câmera rola e tem zoom: só depois
      // de `getWorldPoint` o ponto é do mundo.
      const mundo = this.cameras.main.getWorldPoint(ponteiro.x - caixa.left, ponteiro.y - caixa.top);

      const { tileWidth, tileHeight } = this.renderMetrics;

      // A decisão — o tile existe, cabe no mapa e é inteiro — mora em
      // `tileSobOPonteiro`, e não aqui. Uma cena do Phaser não roda no Node, e
      // uma mira escrita dentro dela ficaria correta por inspeção e erraria em
      // silêncio.
      const alvo = tileSobOPonteiro(mundo, {
        origem: this.origin,
        metricas: { tileWidth, tileHeight },
        largura: this.mapData.width,
        altura: this.mapData.height,
        existe: (col, row) => Boolean(this.mapData.tiles[row]?.[col])
      });

      if (!alvo) return false;
      if (this.cursorTile?.col === alvo.col && this.cursorTile?.row === alvo.row) return true;

      this.cursorTile = alvo;

      return true;
    }

    renderCursorIndicator() {
      const tile = this.cursorTile;
      const linha = tile && this.mapData ? this.mapData.tiles[tile.row] : null;
      const alvo = linha ? linha[tile.col] : null;

      if (!this.cursorVisivel || !alvo || !this.origin) {
        this.cursorIndicator.clear();
        this.cursorIndicator.setVisible(false);
        return;
      }

      const { tileWidth, tileHeight } = this.renderMetrics;
      const point = toIso(alvo.col, alvo.row, this.origin.x, this.origin.y, tileWidth, tileHeight);
      const halfWidth = Math.round(tileWidth * 0.3);
      const halfHeight = Math.round(tileHeight * 0.32);

      this.cursorIndicator.clear();
      this.cursorIndicator.lineStyle(2, 0x8df0b0, 0.9);
      this.cursorIndicator.fillStyle(0x8df0b0, 0.1);

      this.cursorIndicator.beginPath();
      this.cursorIndicator.moveTo(point.x, point.y - halfHeight);
      this.cursorIndicator.lineTo(point.x + halfWidth, point.y);
      this.cursorIndicator.lineTo(point.x, point.y + halfHeight);
      this.cursorIndicator.lineTo(point.x - halfWidth, point.y);
      this.cursorIndicator.closePath();
      this.cursorIndicator.strokePath();
      this.cursorIndicator.fillPath();
      this.cursorIndicator.setVisible(true);
    }

    /**
     * Esconde o cursor de controle.
     *
     * Chamado quando um modal abre, quando a pausa entra e no modo attract. O
     * losango ficaria marcado num tile qualquer atrás da tela, e a pessoa voltaria
     * do menu para um cursor que não foi ela que moveu.
     */
    hideCursor() {
      this.cursorVisivel = false;
      this.cursorIndicator.clear();
      this.cursorIndicator.setVisible(false);
    }

  renderHoverIndicator(tile, canBreak) {
    if (!tile || !this.origin) {
      this.hoverIndicator.setVisible(false);
      return;
    }

    const { tileWidth, tileHeight } = this.renderMetrics;
    const point = toIso(tile.col, tile.row, this.origin.x, this.origin.y, tileWidth, tileHeight);
    const strokeColor = canBreak ? 0x5cff6d : 0xff6b6b;
    const fillColor = canBreak ? 0x3cff59 : 0xff6b6b;
    const halfWidth = Math.round(tileWidth * 0.28);
    const halfHeight = Math.round(tileHeight * 0.3);

    this.hoverIndicator.clear();
    this.hoverIndicator.lineStyle(2, strokeColor, 0.95);
    this.hoverIndicator.fillStyle(fillColor, 0.06);

    this.hoverIndicator.beginPath();
    this.hoverIndicator.moveTo(point.x, point.y - halfHeight);
    this.hoverIndicator.lineTo(point.x + halfWidth, point.y);
    this.hoverIndicator.lineTo(point.x, point.y + halfHeight);
    this.hoverIndicator.lineTo(point.x - halfWidth, point.y);
    this.hoverIndicator.closePath();

    this.hoverIndicator.fillPath();
    this.hoverIndicator.strokePath();
    this.hoverIndicator.setVisible(true);
  }

  animatePickaxe(tile) {
    if (!this.origin) return;
    if (this.reducedMotion) return;

    const { tileWidth, tileHeight } = this.renderMetrics;
    const point = toIso(tile.col, tile.row, this.origin.x, this.origin.y, tileWidth, tileHeight);
    // A arte da picareta nova tem 140x142 de conteúdo, contra 73x83 da antiga. Na
    // escala antiga ela sairia do dobro do tamanho e cobriria a rocha que está
    // sendo quebrada — que é justamente o que o efeito precisa mostrar. Por isso
    // a largura vem do tile, e não do `setScale` sobre a arte.
    const larguraPicareta = Math.round(tileWidth * PICKAXE_DISPLAY);
    this.pickaxeEffect.setVisible(true);
    this.pickaxeEffect.setAlpha(1);
    this.pickaxeEffect.setDisplaySize(
      larguraPicareta,
      Math.round(larguraPicareta * PICKAXE_ASPECT)
    );
    this.pickaxeEffect.setAngle(-35);
    this.pickaxeEffect.setPosition(point.x + tileWidth * 0.32, point.y - tileHeight * 1.3);
    this.pickaxeEffect.setDepth(point.y + 40);

    this.tweens.killTweensOf(this.pickaxeEffect);
    this.tweens.add({
      targets: this.pickaxeEffect,
      x: point.x + tileWidth * 0.08,
      y: point.y - tileHeight * 0.82,
      angle: 18,
      duration: 110,
      ease: 'Quad.easeIn',
      yoyo: true,
      hold: 40,
      onComplete: () => this.hidePickaxeEffect()
    });
  }

  hidePickaxeEffect() {
    if (!this.pickaxeEffect) return;
    this.tweens.killTweensOf(this.pickaxeEffect);
    this.pickaxeEffect.setVisible(false);
    this.pickaxeEffect.setAlpha(0);
  }

  handleTileClick(tile) {
    if (tile.type === 'exit') {
      this.openExitDecision(t('msg.foundExit'));
      return;
    }

    if (tile.type !== 'rock') {
      // Clicar em chão não é erro, é o chão. Nada a dizer.
      return;
    }

    const canBreak = isFrontierRock(this.mapData, this.mapData.entry, tile);

    if (!canBreak) {
      // Sem texto na tela: o porquê aparece no próprio tile, onde o jogador
      // está olhando. O hover já pinta a rocha de vermelho quando não dá para
      // quebrar; o flash confirma o clique.
      this.flashInvalidTile(tile);
      return;
    }

    this.animatePickaxe(tile);
    this.damageRock(tile);
  }

  flashInvalidTile(tile) {
    const sprite = tile.sprite;
    if (!sprite?.active) return;

    this.tweens.killTweensOf(sprite);
    sprite.setTint(0xff6b6b);

    const baseX = sprite.x;

    this.tweens.add({
      targets: sprite,
      x: baseX + 4,
      duration: 55,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!sprite.active) return;
        sprite.x = baseX;
        this.applyRockBaseTint(tile);
      }
    });
  }

  damageRock(tile, isBonus = false) {
    tile.hp -= 1;

    if (tile.hp > 0) {
      this.showDamageCount(tile);
      this.flashRockHit(tile);
      return;
    }

    this.resolveBrokenRock(tile, isBonus);
  }

  /** Quantos cliques faltam, sobre a própria rocha, em vez de no log. */
  showDamageCount(tile) {
    if (this.reducedMotion || !this.origin) return;

    const { tileWidth, tileHeight } = this.renderMetrics;
    const point = toIso(tile.col, tile.row, this.origin.x, this.origin.y, tileWidth, tileHeight);

    const label = this.add
      .text(point.x, point.y - tileHeight * 0.86, `-${tile.hp}`, {
        fontSize: this.getMarkerFontSize(15),
        color: '#ffe3bd',
        fontStyle: 'bold',
        stroke: '#4a2a00',
        strokeThickness: this.renderMetrics.isMobileLandscape ? 3 : 4
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: label,
      y: label.y - tileHeight * 0.45,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  flashRockHit(tile) {
    const sprite = tile.sprite;

    if (!sprite?.active) return;

    sprite.setTint(0xffd39d);

    this.tweens.add({
      targets: sprite,
      scaleX: sprite.scaleX * 1.12,
      scaleY: sprite.scaleY * 0.88,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!sprite.active) return;

        if (this.hoveredRockTile === tile) {
          this.setHoveredRock(tile);
        } else {
          this.applyRockBaseTint(tile);
        }
      }
    });
  }

  spawnBreakDebris(tile, point) {
    if (this.reducedMotion) return;

    const { tileWidth } = this.renderMetrics;

    for (let i = 0; i < 5; i += 1) {
      const chunk = this.add
        .image(point.x + Phaser.Math.Between(-10, 10), point.y - Phaser.Math.Between(4, 22), 'deco_rubble')
        .setDisplaySize(tileWidth * 0.18, tileWidth * 0.18)
        .setAlpha(0.9);

      this.tweens.add({
        targets: chunk,
        x: chunk.x + Phaser.Math.Between(-34, 34),
        y: chunk.y + Phaser.Math.Between(10, 34),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(320, 520),
        ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy()
      });
    }
  }

  resolveBrokenRock(tile, isBonus = false) {
    this.metaState.stats = {
      ...createStatsState(),
      ...this.metaState.stats,
      totalRocksBroken: (this.metaState.stats?.totalRocksBroken ?? 0) + 1
    };

    const revealedHiddenExit = tile.isHiddenExit === true;
    const revealedContent = tile.hiddenContent;

    tile.type = revealedHiddenExit ? 'exit' : 'floor';
    tile.walkable = true;
    tile.revealed = true;
    tile.utilityRevealBomb = false;
    tile.hiddenContent = 'empty';
    tile.hp = 0;
    tile.isHiddenExit = false;

    if (this.hoveredRockTile === tile) {
      this.clearHoveredRock();
    }

    const { tileWidth, tileHeight } = this.renderMetrics;
    const rewardPos = toIso(tile.col, tile.row, this.origin.x, this.origin.y, tileWidth, tileHeight);

    this.spawnBreakDebris(tile, rewardPos);

    if (tile.sprite) {
      tile.sprite.destroy();
    }

    tile.rockSprite = null;

    const floor = tile.floorSprite;

    if (floor) {
      floor.setData('tile', tile);
      tile.sprite = floor;
    } else {
      const fallbackFloor = drawGroundCell(
        this,
        tile.col,
        tile.row,
        rewardPos,
        this.renderMetrics.tileWidth,
        this.renderMetrics.tileHeight,
        getGroundTextureKey(getBiomeForCave(this.metaState.cave).id)
      );

      fallbackFloor.setData('tile', tile);
      fallbackFloor.setTint(getBiomeForCave(this.metaState.cave).palette.ground);
      this.floorLayer.add(fallbackFloor);

      tile.floorSprite = fallbackFloor;
      tile.sprite = fallbackFloor;
    }

    if (revealedHiddenExit) {
      this.renderExitHighlight(rewardPos);
      this.renderExitTileVisual(tile, rewardPos);
    }

    let message = '';
    const extraMessages = [];

    if (revealedContent === 'coin') {
      let gain = 1;
      const bonusTriggered =
        (this.metaState.coinBonusChance ?? 0) > 0 && Math.random() < (this.metaState.coinBonusChance ?? 0);

      if (bonusTriggered) {
        gain += this.metaState.coinBonusAmount ?? 0;
      }

      this.metaState.coins += gain;
      this.metaState.stats = {
        ...createStatsState(),
        ...this.metaState.stats,
        totalCoinsCollected: (this.metaState.stats?.totalCoinsCollected ?? 0) + gain
      };

      const coinGlow = this.add.circle(rewardPos.x, rewardPos.y - tileHeight * 0.6, Math.max(10, tileWidth * 0.16), 0xffd76c, 0.22);
      coinGlow.setDepth(rewardPos.y + 18);
      this.objectLayer.add(coinGlow);

      const coinSprite = this.add.circle(rewardPos.x, rewardPos.y - tileHeight * 0.7, Math.max(7, tileWidth * 0.11), 0xffd76c, 1);
      coinSprite.setStrokeStyle(3, 0xfff3b0, 0.95);
      coinSprite.setDepth(rewardPos.y + 20);
      this.objectLayer.add(coinSprite);

      const coinValue = this.add.text(rewardPos.x - tileWidth * 0.12, rewardPos.y - tileHeight * 0.9, `+${gain}`, {
        fontSize: this.getMarkerFontSize(18),
        color: '#fff4bf',
        fontStyle: 'bold',
        stroke: '#7a5a00',
        strokeThickness: this.renderMetrics.isMobileLandscape ? 3 : 4
      });

      coinValue.setDepth(rewardPos.y + 21);
      this.objectLayer.add(coinValue);

      this.tweens.add({
        targets: [coinGlow, coinSprite, coinValue],
        y: `-=${Math.round(tileHeight * 0.95)}`,
        alpha: 0,
        duration: 850,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          coinGlow.destroy();
          coinSprite.destroy();
          coinValue.destroy();
        }
      });

      message = `${isBonus ? `${t('msg.coinBonus')} ` : ''}${t('msg.coinFound', { count: gain })}`;
    } else if (revealedContent === 'bomb') {
      this.metaState.bombs += 1;
      this.metaState.bombsRemaining = Math.max(0, (this.metaState.bombsRemaining ?? 0) - 1);
      this.metaState.hp -= 1;

      const bomb = this.add.image(rewardPos.x, rewardPos.y - tileHeight * 0.68, 'bomb').setDisplaySize(
        Math.max(26, tileWidth * 0.42),
        Math.max(26, tileWidth * 0.42)
      );
      bomb.setDepth(rewardPos.y + 20);
      this.objectLayer.add(bomb);

      this.tweens.add({
        targets: bomb,
        scale: 1.4,
        alpha: 0,
        duration: 550,
        onComplete: () => bomb.destroy()
      });

      this.cameras.main.flash(140, 255, 80, 80);

      if (this.metaState.hp <= 0) {
        this.openLobby('death', t('msg.deathLobby'));
        return;
      }

      message = `${isBonus ? `${t('msg.unluckyBonus')} ` : ''}${t('msg.bombHit', { n: this.metaState.hp })}`;
    } else if (isRelicContent(revealedContent)) {
      const relic = getRelicById(revealedContent.relicId);

      if (relic) {
        // Num save de teste a relíquia **aparece** — é o efeito que se quer ver —
        // mas não entra na coleção nem nas estatísticas. A regra disso mora em
        // `registrarReliquiaEncontrada`, no mesmo lugar do resto.
        this.metaState = registrarReliquiaEncontrada(this.metaState, relic.id);
        this.showRelicFoundEffect(rewardPos, relic);
        message = `${isBonus ? `${t('msg.coinBonus')} ` : ''}${t('msg.relicFound', { relic: t(relic.nameKey) })}`;
      } else {
        message = t(isBonus ? 'msg.emptyBonus' : 'msg.empty');
      }
    } else if (revealedHiddenExit) {
      this.metaState.nextCaveAvailable = this.metaState.cave + 1;
      message = t(isBonus ? 'msg.exitBonus' : 'msg.exitHidden');
    } else {
      message = t(isBonus ? 'msg.emptyBonus' : 'msg.empty');
    }

    const utilityFound = this.tryCollectRandomUtility(rewardPos);
    if (utilityFound) {
      extraMessages.push(t('msg.utilityDropFound', { name: t(utilityFound) }));
    }

    if (this.tryRevealRandomBombBonus()) {
      extraMessages.push(t('msg.bombRevealed'));
    }

    if (!isBonus) {
      this.tryRockBurst(tile);

      if (this.metaState.inLobby) {
        return;
      }
    }

    // A composição de frases existia só para alimentar o log em tela. O
    // lobby usa `lastMessage`, e lá a frase inteira ainda é o resultado da
    // cave, então ela continua sendo montada — apenas não é mais desenhada
    // durante a exploração.
    this.setMessage([message, ...extraMessages].filter(Boolean).join(' '));
  }

  tryRockBurst(originTile) {
    const chance = this.metaState.rockBonusChance ?? 0;
    const amount = this.metaState.rockBonusAmount ?? 0;

    if (chance <= 0 || amount <= 0) {
      return;
    }

    if (Math.random() >= chance) {
      return;
    }

    const candidates = [];
    const visited = new Set([`${originTile.col},${originTile.row}`]);
    const queue = [originTile];

    while (queue.length > 0 && candidates.length < amount) {
      const current = queue.shift();
      const neighbors = getNeighbors4(current.col, current.row, this.mapData.width, this.mapData.height)
        .map((neighbor) => this.mapData.tiles[neighbor.row][neighbor.col])
        .filter((candidate) => {
          const key = `${candidate.col},${candidate.row}`;
          return candidate.type === 'rock' && isFrontierRock(this.mapData, this.mapData.entry, candidate) && !visited.has(key);
        });

      Phaser.Utils.Array.Shuffle(neighbors);

      for (const candidate of neighbors) {
        const key = `${candidate.col},${candidate.row}`;
        visited.add(key);
        candidates.push(candidate);
        queue.push(candidate);

        if (candidates.length >= amount) {
          break;
        }
      }
    }

    candidates.forEach((bonusTile, index) => {
      this.trackEffect(
        this.time.delayedCall(70 + index * 70, () => {
          if (!bonusTile || bonusTile.type !== 'rock' || this.metaState.inLobby) {
            return;
          }

          bonusTile.hp = 1;
          this.animatePickaxe(bonusTile);
          this.damageRock(bonusTile, true);
        })
      );
    });
  }

  showUtilityFoundEffect(rewardPos, reward) {
    const { tileWidth, tileHeight } = this.renderMetrics;

    const glow = this.add.circle(
      rewardPos.x,
      rewardPos.y - tileHeight * 0.62,
      Math.max(10, tileWidth * 0.17),
      0x7ee6ff,
      0.24
    );
    glow.setDepth(rewardPos.y + 18);
    this.objectLayer.add(glow);

    const chip = this.add.circle(
      rewardPos.x,
      rewardPos.y - tileHeight * 0.72,
      Math.max(8, tileWidth * 0.115),
      0x7ee6ff,
      1
    );
    chip.setStrokeStyle(3, 0xe7fbff, 0.96);
    chip.setDepth(rewardPos.y + 20);
    this.objectLayer.add(chip);

    const icon = this.add.text(rewardPos.x, rewardPos.y - tileHeight * 0.72, reward.icon, {
      fontSize: this.getMarkerFontSize(16),
      color: '#062430',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    icon.setDepth(rewardPos.y + 21);
    this.objectLayer.add(icon);

    const utilityValue = this.add.text(
      rewardPos.x,
      rewardPos.y - tileHeight * 0.96,
      t('msg.utilityReward'),
      {
        fontSize: this.getMarkerFontSize(16),
        color: '#dffbff',
        fontStyle: 'bold',
        stroke: '#0a4d5d',
        strokeThickness: this.renderMetrics.isMobileLandscape ? 3 : 4
      }
    ).setOrigin(0.5);
    utilityValue.setDepth(rewardPos.y + 21);
    this.objectLayer.add(utilityValue);

    this.tweens.add({
      targets: [glow, chip, icon, utilityValue],
      y: `-=${Math.round(tileHeight * 0.95)}`,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        glow.destroy();
        chip.destroy();
        icon.destroy();
        utilityValue.destroy();
      }
    });
  }

  showRelicFoundEffect(rewardPos, relic) {
    const { tileWidth, tileHeight } = this.renderMetrics;

    const glow = this.add.circle(
      rewardPos.x,
      rewardPos.y - tileHeight * 0.62,
      Math.max(12, tileWidth * 0.2),
      0xf3c15c,
      0.3
    );
    glow.setDepth(rewardPos.y + 18);
    this.objectLayer.add(glow);

    const core = this.add.circle(
      rewardPos.x,
      rewardPos.y - tileHeight * 0.72,
      Math.max(9, tileWidth * 0.12),
      0xffe09b,
      1
    );
    core.setStrokeStyle(3, 0xfff7d2, 0.95);
    core.setDepth(rewardPos.y + 20);
    this.objectLayer.add(core);

    const icon = this.add.text(rewardPos.x, rewardPos.y - tileHeight * 0.74, relic.icon, {
      fontSize: this.getMarkerFontSize(16),
      color: '#3c2400',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    icon.setDepth(rewardPos.y + 21);
    this.objectLayer.add(icon);

    const label = this.add.text(rewardPos.x, rewardPos.y - tileHeight * 1.02, t(relic.nameKey), {
      fontSize: this.getMarkerFontSize(14),
      color: '#fff1c5',
      fontStyle: 'bold',
      stroke: '#6d4400',
      strokeThickness: this.renderMetrics.isMobileLandscape ? 3 : 4
    }).setOrigin(0.5);
    label.setDepth(rewardPos.y + 21);
    this.objectLayer.add(label);

    this.tweens.add({
      targets: [glow, core, icon, label],
      y: `-=${Math.round(tileHeight * 0.95)}`,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        glow.destroy();
        core.destroy();
        icon.destroy();
        label.destroy();
      }
    });
  }

  tryCollectRandomUtility(rewardPos = null) {
    const chance = this.metaState.utilityDropChance ?? 0;

    if (chance <= 0 || Math.random() >= chance) {
      return null;
    }

    // A chave, e não o rótulo: quem chama precisa montar a mensagem no idioma do
    // jogador, e devolver o texto já pronto travaria o utilitário em português.
    const utilityPool = [
      { id: 'lifePotion', nameKey: 'utility.lifePotion.name', icon: '❤️' },
      { id: 'revealBomb', nameKey: 'utility.revealBomb.name', icon: '💣' },
      { id: 'safePath', nameKey: 'utility.safePath.name', icon: '🧭' }
    ];

    const reward = Phaser.Utils.Array.GetRandom(utilityPool);

    this.metaState.utilities = {
      lifePotion: 0,
      revealBomb: 0,
      safePath: 0,
      ...this.metaState.utilities,
      [reward.id]: (this.metaState.utilities?.[reward.id] ?? 0) + 1
    };

    if (rewardPos) {
      this.showUtilityFoundEffect(rewardPos, reward);
    }

    return reward.nameKey;
  }

  tryRevealRandomBombBonus() {
    const chance = this.metaState.bombRevealChance ?? 0;

    if (chance <= 0 || Math.random() >= chance) {
      return false;
    }

    const hiddenBomb = this.findHiddenBombTile();

    if (!hiddenBomb) {
      return false;
    }

    hiddenBomb.utilityRevealBomb = true;

    if (hiddenBomb.rockSprite) {
      hiddenBomb.rockSprite.setTexture('bomb');
    } else if (hiddenBomb.sprite) {
      hiddenBomb.sprite.setTexture('bomb');
    }

    return true;
  }

  /**
   * Nenhum utilitário é bloqueado por momento da run: enquanto o jogador
   * estiver dentro de uma cave e tiver o item, ele pode usar. As duas
   * mensagens que sobraram são para quando a ação não teria efeito nenhum
   * (vida cheia, nenhuma bomba sobrando) — nesses casos o item não é
   * consumido, e o jogador recebe um aviso rápido em vez de um silêncio.
   */
  handleUtilityUse(type) {
    if (!type || this.metaState.inLobby) {
      return;
    }

    const currentCount = this.metaState.utilities?.[type] ?? 0;

    if (currentCount <= 0) {
      this.notify(t('msg.utilityMissing'));
      return;
    }

    if (type === 'lifePotion') {
      if (this.metaState.hp >= this.metaState.maxHp) {
        this.notify(t('msg.lifeFull'));
        return;
      }

      this.metaState.hp = Math.min(this.metaState.maxHp, this.metaState.hp + 1);
      this.consumeUtility(type);
      this.pulseHudPill('heart');
      this.setMessage(t('msg.lifeUsed', { hp: this.metaState.hp, max: this.metaState.maxHp }));
      this.syncUI();
      return;
    }

    if (type === 'revealBomb') {
      const hiddenBomb = this.findHiddenBombTile();

      if (!hiddenBomb) {
        this.notify(t('msg.noBombsLeft'));
        return;
      }

      hiddenBomb.utilityRevealBomb = true;
      this.consumeUtility(type);
      this.hoveredRockTile = null;
      this.renderMap();
      this.pulseHudPill('risk');
      this.setMessage(t('msg.revealUsed'));
      this.syncUI();
      return;
    }

    if (type === 'safePath') {
      const success = this.revealSafePath();

      if (!success) {
        this.notify(t('msg.noSafeRoute'));
        return;
      }

      this.consumeUtility(type);
      this.hoveredRockTile = null;
      this.renderMap();
      this.setMessage(t('msg.safePathUsed'));
      this.syncUI();
    }
  }

  /** Pulsa um pill do HUD, para a mudança de vida/risco ser perceptível sem texto. */
  pulseHudPill(kind) {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('cob-pulse-pill', { detail: { kind } }));
  }

  consumeUtility(type) {
    this.metaState.utilities = {
      lifePotion: 0,
      revealBomb: 0,
      safePath: 0,
      ...this.metaState.utilities,
      [type]: Math.max(0, (this.metaState.utilities?.[type] ?? 0) - 1)
    };
  }

  findHiddenBombTile() {
    const candidates = [];

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        const tile = this.mapData.tiles[row][col];

        if (tile.type === 'rock' && tile.hiddenContent === 'bomb' && !tile.utilityRevealBomb) {
          candidates.push(tile);
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    return Phaser.Utils.Array.GetRandom(candidates);
  }

  revealSafePath() {
    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        this.mapData.tiles[row][col].safePath = false;
      }
    }

    const route = findSafeRoute(this.mapData);

    if (!route) return false;

    for (const step of route) {
      this.mapData.tiles[step.row][step.col].safePath = true;
    }

    return true;
  }

  openExitDecision(message) {
    if (this.metaState.inLobby) return;

    this.metaState.inLobby = false;
    this.metaState.lobbyReason = null;
    this.metaState.nextCaveAvailable = this.metaState.cave + 1;
    this.metaState.outcomeCave = this.metaState.cave;
    this.setMessage(message);

    window.dispatchEvent(
      new CustomEvent('cob-exit-decision', {
        detail: {
          state: { ...this.metaState }
        }
      })
    );
  }

  openLobby(reason, message, nextCave = null) {
    const resolvedCave = this.metaState.cave;
    const firstTimeClear = reason === 'exit' && !this.clearedCaves.has(resolvedCave);

    if (reason === 'exit') {
      this.clearedCaves.add(resolvedCave);

      // `registrarCaveConcluida` decide sozinho se este save conta. A regra mora em
      // `progression.js` e é a mesma que a relíquia e o `profile` consultam — três
      // `if` parecidos em três arquivos divergem assim que alguém ajusta um deles.
      this.metaState = registrarCaveConcluida(this.metaState, resolvedCave, firstTimeClear);
    }

    this.metaState.inLobby = true;
    this.metaState.lobbyReason = reason;
    this.metaState.nextCaveAvailable = nextCave;
    this.metaState.outcomeCave = resolvedCave;
    this.metaState.lastMessage = message;

    this.clearHoveredRock();
    this.hidePickaxeEffect();
    this.flushPendingEffects();
    this.syncUI();

    if (reason === 'death') {
      window.dispatchEvent(
        new CustomEvent('cob-player-dead', {
          detail: { ...this.metaState }
        })
      );
      return;
    }

    if (reason === 'exit') {
      window.dispatchEvent(
        new CustomEvent('cob-cave-cleared', {
          detail: { ...this.metaState }
        })
      );
    }
  }

  update() {}

  /**
   * `lastMessage` alimenta os modais de lobby e de decisão de saída, onde a
   * frase é o resultado da cave. Durante a exploração não existe mais log em
   * tela: o feedback é visual (moeda, explosão, relíquia, tremor) e texto
   * demais cobria o mapa.
   */
  setMessage(message) {
    if (!message) return;
    this.metaState.lastMessage = message;
    this.syncUI();
  }

  /**
   * Aviso rápido para quando uma ação não pode ser satisfeita agora (vida
   * cheia, nenhuma bomba restante). Não é log: aparece uma vez e some.
   */
  notify(message) {
    window.dispatchEvent(
      new CustomEvent('cob-toast', {
        detail: { id: `${Date.now()}-${this.toastSequence++}`, text: message }
      })
    );
  }

  syncUI() {
    this.game?.uiBridge?.syncUI?.({ state: this.metaState, purchased: this.purchased });
  }
}
