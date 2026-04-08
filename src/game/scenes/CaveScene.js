import Phaser from 'phaser';
import { BASE_TILE_HEIGHT, BASE_TILE_WIDTH, getTileMetrics, toIso } from '../config.js';
import { createCollectionState, createStatsState, getBiomeForCave, getRelicById, isRelicContent } from '../progression.js';
import { generateMap } from '../systems/mapGenerator.js';
import { getNeighbors4, isExitUnlocked, isFrontierRock } from '../systems/helpers.js';

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
      lastMessage: 'Quebre uma rocha na beirada da área aberta para começar.'
    };

    this.purchased = [];
    this.hoveredRockTile = null;
    this.pendingResponsiveRefreshes = [];

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
      this.renderStatusBanner();
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

    this.onNextCave = (event) => {
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

    this.onForcedResize = () => {
      this.scheduleResponsiveRefresh();
    };

    this.onOpenExitLobby = (event) => {
      const nextCave = event?.detail?.nextCave ?? this.metaState.cave + 1;
      const message =
        event?.detail?.message ?? `Você decidiu seguir para a Cave ${nextCave}.`;

      this.openLobby('exit', message, nextCave);
    };

    window.addEventListener('cob-buy-upgrade', this.onExternalSync);
    window.addEventListener('cob-buy-utility', this.onExternalSync);
    window.addEventListener('cob-use-utility', this.onUtilityUse);
    window.addEventListener('cob-restart-run', this.onManualRestart);
    window.addEventListener('cob-enter-cave', this.onEnterCave);
    window.addEventListener('cob-next-cave', this.onNextCave);
    window.addEventListener('cob-open-exit-lobby', this.onOpenExitLobby);
    window.addEventListener('cob-force-resize', this.onForcedResize);
    this.scale.on('resize', this.onResize);

    this.events.on('shutdown', () => {
      window.removeEventListener('cob-buy-upgrade', this.onExternalSync);
      window.removeEventListener('cob-buy-utility', this.onExternalSync);
      window.removeEventListener('cob-use-utility', this.onUtilityUse);
      window.removeEventListener('cob-restart-run', this.onManualRestart);
      window.removeEventListener('cob-enter-cave', this.onEnterCave);
      window.removeEventListener('cob-next-cave', this.onNextCave);
      window.removeEventListener('cob-open-exit-lobby', this.onOpenExitLobby);
      window.removeEventListener('cob-force-resize', this.onForcedResize);
      this.scale.off('resize', this.onResize);
      this.clearResponsiveRefreshQueue();
    });

    if (this.metaState.inLobby) {
      this.renderLobbyBackdrop();
      this.syncUI();
    } else {
      this.refreshRun(false);
    }

    this.scheduleResponsiveRefresh();
  }

  clearResponsiveRefreshQueue() {
    if (!this.pendingResponsiveRefreshes?.length) return;

    this.pendingResponsiveRefreshes.forEach((timer) => {
      if (timer && !timer.hasDispatched) {
        timer.remove(false);
      }
    });

    this.pendingResponsiveRefreshes = [];
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
      this.renderStatusBanner();
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

    return {
      width,
      height,
      isLandscape,
      isShort,
      isNarrow,
      isMobileLandscape,
      isCompact: height <= 430 || width <= 760,
      hudTopOffset: isMobileLandscape ? 50 : height <= 560 ? 58 : 74,
      bottomPadding: isMobileLandscape ? 10 : 18,
      sidePadding: isMobileLandscape ? 18 : width <= 1100 ? 24 : 34,
      verticalNudge: isMobileLandscape ? 6 : 28
    };
  }

  getMapBoundsForMetrics(originX, originY, tileWidth, tileHeight) {
    const points = [];

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        const point = toIso(col, row, originX, originY, tileWidth, tileHeight);

        points.push({
          minX: point.x - tileWidth / 2,
          maxX: point.x + tileWidth / 2,
          minY: point.y - tileHeight * 1.5,
          maxY: point.y + tileHeight / 2 + tileHeight * 0.5
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

    const renderScale = Phaser.Math.Clamp(fitScale, 0.54, 1.16);

    this.renderMetrics = {
      ...profile,
      ...getTileMetrics(renderScale)
    };
  }

  refreshRun(keepCave = false) {
    this.backgroundLayer.removeAll(true);
    this.floorLayer.removeAll(true);
    this.objectLayer.removeAll(true);
    this.clearHoveredRock();
    this.clearStatusBanner();
    this.hidePickaxeEffect();

    if (!keepCave && this.metaState.hp <= 0) {
      this.metaState.cave = 1;
      this.metaState.hp = this.metaState.maxHp;
      this.metaState.bombs = 0;
    }

    if (this.metaState.inLobby) {
      this.renderLobbyBackdrop();
      this.syncUI();
      return;
    }

    this.mapData = generateMap(this.metaState.cave, this.metaState.pickaxePower, 0);
    this.metaState.biomeId = this.mapData.biome?.id ?? getBiomeForCave(this.metaState.cave).id;
    this.metaState.biomeName = this.mapData.biome?.name ?? getBiomeForCave(this.metaState.cave).name;
    this.cameras.main.setBackgroundColor(this.mapData.biome?.palette?.background ?? '#14181f');
    this.renderMap();
    this.renderStatusBanner();
    this.syncUI();
  }

  renderLobbyBackdrop() {
    this.backgroundLayer.removeAll(true);
    this.floorLayer.removeAll(true);
    this.objectLayer.removeAll(true);
    this.hoverIndicator.setVisible(false);
    this.hidePickaxeEffect();

    this.updateRenderMetrics();

    this.drawCaveWalls({
      minX: this.scale.width * 0.16,
      maxX: this.scale.width * 0.84,
      maxY: this.scale.height * 0.72
    });
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

  addBackdropRock(x, y, scale = 1.6, alpha = 0.22, tint = 0x2f251c) {
    const variants = ['rock_01', 'rock_02', 'rock_03'];
    const texture = Phaser.Utils.Array.GetRandom(variants);

    const rock = this.add.image(x, y, texture);
    rock.setScale(scale);
    rock.setAlpha(alpha);
    rock.setTint(tint);
    rock.setAngle(Phaser.Math.Between(-18, 18));
    rock.setDepth(-960);

    this.backgroundLayer.add(rock);
  }

  drawCaveCracks(bounds) {
    const cracks = this.add.graphics();
    const biome = this.mapData?.biome ?? getBiomeForCave(this.metaState.cave);
    cracks.lineStyle(2, biome.palette.edge, 0.18);

    for (let i = 0; i < 18; i += 1) {
      const startX = Phaser.Math.Between(Math.floor(bounds.minX - 120), Math.floor(bounds.maxX + 120));
      const startY = Phaser.Math.Between(Math.floor(bounds.minY - 90), Math.floor(bounds.maxY + 110));
      const segments = Phaser.Math.Between(3, 6);

      let x = startX;
      let y = startY;

      cracks.beginPath();
      cracks.moveTo(x, y);

      for (let s = 0; s < segments; s += 1) {
        x += Phaser.Math.Between(-22, 22);
        y += Phaser.Math.Between(12, 28);
        cracks.lineTo(x, y);
      }

      cracks.strokePath();
    }

    cracks.setDepth(-955);
    this.backgroundLayer.add(cracks);
  }

  drawCaveWalls(bounds) {
    const biome = this.mapData?.biome ?? getBiomeForCave(this.metaState.cave);
    const background = this.add.image(this.scale.width / 2, this.scale.height / 2, biome.backgroundKey ?? 'cave_bg');
    const coverScale = Math.max(this.scale.width / background.width, this.scale.height / background.height);

    background.setScale(coverScale);
    background.clearTint();
    background.setAlpha(1);
    background.setDepth(-1000);
    this.backgroundLayer.add(background);

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

    this.drawCaveCracks(bounds);

    for (let x = bounds.minX - 120; x <= bounds.maxX + 120; x += 88) {
      this.addBackdropRock(
        x + Phaser.Math.Between(-8, 8),
        bounds.minY - 32 + Phaser.Math.Between(-12, 10),
        Phaser.Math.FloatBetween(1.45, 1.95),
        0.16,
        Phaser.Utils.Array.GetRandom(biome.palette.rockTints)
      );
    }

    for (let y = bounds.minY + 20; y <= bounds.maxY + 70; y += 82) {
      this.addBackdropRock(
        bounds.minX - 86 + Phaser.Math.Between(-10, 8),
        y + Phaser.Math.Between(-8, 8),
        Phaser.Math.FloatBetween(1.25, 1.85),
        0.14,
        Phaser.Utils.Array.GetRandom(biome.palette.rockTints)
      );

      this.addBackdropRock(
        bounds.maxX + 86 + Phaser.Math.Between(-8, 10),
        y + Phaser.Math.Between(-8, 8),
        Phaser.Math.FloatBetween(1.25, 1.85),
        0.14,
        Phaser.Utils.Array.GetRandom(biome.palette.rockTints)
      );
    }

    const vignette = this.add.graphics();
    vignette.fillStyle(biome.palette.edge, 0.14);
    vignette.fillRect(0, 0, 68, height);
    vignette.fillRect(width - 68, 0, 68, height);
    vignette.fillRect(0, 0, width, 42);
    vignette.fillRect(0, height - 58, width, 58);
    vignette.setDepth(-970);
    this.backgroundLayer.add(vignette);
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

  renderMap() {
    this.backgroundLayer.removeAll(true);
    this.floorLayer.removeAll(true);
    this.objectLayer.removeAll(true);
    this.hoverIndicator.setVisible(false);

    const centeredOrigin = this.getCenteredMapOrigin();
    const { tileWidth, tileHeight, mapScale } = this.renderMetrics;
    const originX = centeredOrigin.x;
    const originY = centeredOrigin.y;
    this.origin = { x: originX, y: originY };

    this.renderCaveBackdrop(originX, originY);
    const biome = this.mapData.biome ?? getBiomeForCave(this.metaState.cave);

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        const tile = this.mapData.tiles[row][col];
        const point = toIso(col, row, originX, originY, tileWidth, tileHeight);

        const floorKey = tile.floorVariant || 'floor_01';
        const floor = this.add.image(point.x, point.y, floorKey).setDisplaySize(tileWidth + 4, tileHeight + 18);

        floor.setDepth(point.y);
        tile.floorSprite = floor;

        if (tile.type === 'exit') {
          floor.setTint(biome.palette.exit);
          floor.setScale(1.05);
          floor.setInteractive({ cursor: 'pointer' });
        }

        if (tile.type === 'entrance') {
          floor.setTint(biome.palette.entrance);
        }

        this.floorLayer.add(floor);

        if (tile.safePath) {
          this.renderSafePathHighlight(point, point.y + 3);
        }

        if (tile.type === 'rock') {
          const revealedBomb = tile.utilityRevealBomb === true;
          const rockKey = revealedBomb ? 'bomb' : tile.rockVariant || 'rock_01';
          const rock = this.add
            .image(point.x, point.y - tileHeight * (revealedBomb ? 0.44 : 0.5), rockKey)
            .setDisplaySize(
              Math.round(tileWidth * (revealedBomb ? 0.5 : 0.75)),
              Math.round(tileHeight * (revealedBomb ? 1.15 : 1.72))
            )
            .setInteractive({ cursor: 'pointer' });

          rock.setData('tile', tile);
          rock.setDepth(point.y + 10);

          if (revealedBomb) {
            rock.setTint(0xffb0b0);
          } else if (biome.id === 'frost') {
            rock.setTint(0xd7f0ff);
          } else if (biome.id === 'ember') {
            rock.setTint(0xffc0b1);
          } else if (biome.id === 'ruins') {
            rock.setTint(0xe1d2ff);
          }

          this.attachRockHover(rock, tile);
          this.objectLayer.add(rock);

          tile.rockSprite = rock;
          tile.sprite = rock;
        } else {
          floor.setData('tile', tile);
          tile.sprite = floor;
          this.renderDecoration(tile, point);
        }

        if (tile.type === 'exit') {
          this.renderExitHighlight(point);
          this.renderExitStructure(point, point.y + 11);

          const glow = this.add.image(point.x, point.y - tileHeight * 0.42, 'exit_glow');
          glow.setScale(0.56 * mapScale);
          glow.setDepth(point.y + 13);
          this.objectLayer.add(glow);

          const marker = this.add.text(point.x - tileWidth * 0.32, point.y - tileHeight * 1.18, 'SAÍDA', {
            fontSize: this.getMarkerFontSize(18),
            color: '#f6fff9',
            fontStyle: 'bold',
            stroke: '#0d2a1c',
            strokeThickness: this.renderMetrics.isMobileLandscape ? 4 : 5
          });

          marker.setDepth(point.y + 16);
          this.objectLayer.add(marker);
        }

        if (tile.type === 'entrance') {
          const frame = this.add.image(point.x, point.y - tileHeight * 0.64, 'entrance_frame');
          frame.setScale(0.54 * mapScale);
          frame.setDepth(point.y + 11);
          this.objectLayer.add(frame);

          const marker = this.add.text(point.x - tileWidth * 0.16, point.y - tileHeight * 1.18, 'IN', {
            fontSize: this.getMarkerFontSize(16),
            color: '#f1fbff',
            fontStyle: 'bold',
            stroke: '#10263c',
            strokeThickness: this.renderMetrics.isMobileLandscape ? 4 : 5
          });

          marker.setDepth(point.y + 12);
          this.objectLayer.add(marker);
        }
      }
    }
  }

  renderExitStructure(point, depth) {
    const { tileWidth, tileHeight } = this.renderMetrics;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x081015, 0.94);
    shadow.lineStyle(3, 0x8df0b0, 0.7);
    shadow.fillEllipse(point.x, point.y + tileHeight * 0.04, tileWidth * 0.56, tileHeight * 0.38);
    shadow.strokeEllipse(point.x, point.y + tileHeight * 0.04, tileWidth * 0.56, tileHeight * 0.38);
    shadow.setDepth(depth);
    this.objectLayer.add(shadow);

    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(0x163a2b, 0.55);
    innerGlow.fillEllipse(point.x, point.y + tileHeight * 0.02, tileWidth * 0.4, tileHeight * 0.2);
    innerGlow.setDepth(depth + 0.1);
    this.objectLayer.add(innerGlow);

    const rungColor = 0xc5a26a;
    const leftX = point.x - tileWidth * 0.09;
    const rightX = point.x + tileWidth * 0.02;
    const topY = point.y - tileHeight * 0.08;
    const bottomY = point.y + tileHeight * 0.16;

    const ladder = this.add.graphics();
    ladder.lineStyle(4, rungColor, 0.9);
    ladder.beginPath();
    ladder.moveTo(leftX, topY);
    ladder.lineTo(leftX, bottomY);
    ladder.moveTo(rightX, topY);
    ladder.lineTo(rightX, bottomY);

    for (let index = 0; index < 3; index += 1) {
      const y = topY + ((bottomY - topY) / 3) * index;
      ladder.moveTo(leftX, y);
      ladder.lineTo(rightX, y);
    }

    ladder.strokePath();
    ladder.setDepth(depth + 0.2);
    this.objectLayer.add(ladder);
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

    const marker = this.add.text(point.x, point.y - tileHeight * 1.02, 'SAÍDA', {
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

  openExitDecision() {
    if (this.metaState.inLobby) return;

    const nextCave = this.metaState.nextCaveAvailable ?? this.metaState.cave + 1;
    this.metaState.nextCaveAvailable = nextCave;
    this.metaState.lastMessage = `Você encontrou a saída da Cave ${this.metaState.cave}. Deseja seguir para a próxima cave ou continuar explorando esta cave?`;
    this.syncUI();

    window.dispatchEvent(
      new CustomEvent('cob-exit-decision', {
        detail: {
          state: { ...this.metaState }
        }
      })
    );
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
    if (!tile?.sprite || tile.type !== 'rock') {
      return;
    }

    if (tile.utilityRevealBomb) {
      tile.sprite.setTint(0xffb0b0);
      return;
    }

    const biome = this.mapData?.biome ?? getBiomeForCave(this.metaState.cave);

    if (biome.id === 'frost') {
      tile.sprite.setTint(0xd7f0ff);
      return;
    }

    if (biome.id === 'ember') {
      tile.sprite.setTint(0xffc0b1);
      return;
    }

    if (biome.id === 'ruins') {
      tile.sprite.setTint(0xe1d2ff);
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

    const { tileWidth, tileHeight, mapScale } = this.renderMetrics;
    const point = toIso(tile.col, tile.row, this.origin.x, this.origin.y, tileWidth, tileHeight);
    this.pickaxeEffect.setVisible(true);
    this.pickaxeEffect.setAlpha(1);
    this.pickaxeEffect.setScale(0.42 * mapScale);
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
      this.openExitDecision('Você encontrou a saída. Deseja seguir para a próxima cave ou continuar explorando esta?');
      return;
    }

    if (tile.type !== 'rock') {
      this.setMessage('Agora a interação é focada nas rochas expostas da borda.');
      return;
    }

    const canBreak = isFrontierRock(this.mapData, this.mapData.entry, tile);

    if (!canBreak) {
      this.setMessage('Você só pode quebrar rochas que estejam na beirada da área aberta.');
      return;
    }

    this.animatePickaxe(tile);
    this.damageRock(tile);
  }

  damageRock(tile, isBonus = false) {
    tile.hp -= 1;

    if (tile.hp > 0) {
      this.setMessage(`Rocha danificada. Falta ${tile.hp} clique(s).`);
      tile.sprite.setTint(0xffd39d);

      this.time.delayedCall(110, () => {
        if (this.hoveredRockTile === tile) {
          this.setHoveredRock(tile);
        } else {
          this.applyRockBaseTint(tile);
        }
      });

      return;
    }

    this.resolveBrokenRock(tile, isBonus);
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

    if (tile.sprite) {
      tile.sprite.destroy();
    }

    tile.rockSprite = null;

    const floor = tile.floorSprite;

    if (floor) {
      floor.setData('tile', tile);
      tile.sprite = floor;
    } else {
      const fallbackFloorKey = tile.floorVariant || 'floor_01';
      const fallbackFloor = this.add.image(rewardPos.x, rewardPos.y, fallbackFloorKey).setDisplaySize(tileWidth + 4, tileHeight + 18);

      fallbackFloor.setDepth(rewardPos.y);
      fallbackFloor.setData('tile', tile);
      this.floorLayer.add(fallbackFloor);

      tile.floorSprite = fallbackFloor;
      tile.sprite = fallbackFloor;
    }

    if (revealedHiddenExit) {
      this.renderExitHighlight(rewardPos);
      this.renderExitTileVisual(tile, rewardPos);
    } else {
      this.renderDecoration(tile, rewardPos);
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

      message = `${isBonus ? 'Quebra bônus! ' : ''}Você encontrou ${gain} moeda(s).`;
    } else if (revealedContent === 'bomb') {
      this.metaState.bombs += 1;
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
        this.openLobby('death', 'Você ficou sem vida e voltou ao lobby.');
        return;
      }

      message = `${isBonus ? 'Quebra bônus azarada! ' : ''}Bomba! Vida restante: ${this.metaState.hp}.`;
    } else if (isRelicContent(revealedContent)) {
      const relic = getRelicById(revealedContent.relicId);

      if (relic) {
        this.metaState.collection = {
          ...createCollectionState(),
          ...this.metaState.collection,
          [relic.id]: (this.metaState.collection?.[relic.id] ?? 0) + 1
        };
        this.metaState.stats = {
          ...createStatsState(),
          ...this.metaState.stats,
          totalRelicsFound: (this.metaState.stats?.totalRelicsFound ?? 0) + 1
        };
        this.metaState.lastRelicFound = relic.id;
        this.showRelicFoundEffect(rewardPos, relic);
        message = `${isBonus ? 'Quebra bônus! ' : ''}Você encontrou a relíquia ${relic.name}.`;
      } else {
        message = isBonus ? 'Quebra bônus! A rocha extra estava vazia.' : 'Só pedra e poeira... siga cavando.';
      }
    } else if (revealedHiddenExit) {
      this.metaState.nextCaveAvailable = this.metaState.cave + 1;
      message = isBonus
        ? 'Quebra bônus! Você encontrou a saída escondida. Clique no buraco para decidir se quer sair.'
        : 'Você encontrou a saída escondida desta cave. Clique no buraco para decidir se quer sair.';
    } else {
      message = isBonus ? 'Quebra bônus! A rocha extra estava vazia.' : 'Só pedra e poeira... siga cavando.';
    }

    const utilityFound = this.tryCollectRandomUtility(rewardPos);
    if (utilityFound) {
      extraMessages.push(`Você encontrou um utilitário bônus: ${utilityFound}.`);
    }

    if (this.tryRevealRandomBombBonus()) {
      extraMessages.push('Uma bomba escondida foi revelada no mapa.');
    }

    if (!isBonus) {
      this.tryRockBurst(tile);

      if (this.metaState.inLobby) {
        return;
      }
    }

    this.setMessage([message, ...extraMessages].filter(Boolean).join(' '));
    this.syncUI();
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
      this.time.delayedCall(70 + index * 70, () => {
        if (!bonusTile || bonusTile.type !== 'rock' || this.metaState.inLobby) {
          return;
        }

        bonusTile.hp = 1;
        this.animatePickaxe(bonusTile);
        this.damageRock(bonusTile, true);
      });
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

    const utilityValue = this.add.text(rewardPos.x, rewardPos.y - tileHeight * 0.96, '+1 utilitário', {
      fontSize: this.getMarkerFontSize(16),
      color: '#dffbff',
      fontStyle: 'bold',
      stroke: '#0a4d5d',
      strokeThickness: this.renderMetrics.isMobileLandscape ? 3 : 4
    }).setOrigin(0.5);
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

    window.dispatchEvent(
      new CustomEvent('cob-utility-found', {
        detail: {
          id: reward.id,
          label: reward.label,
          amount: 1,
          cave: this.metaState.cave
        }
      })
    );
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

    const label = this.add.text(rewardPos.x, rewardPos.y - tileHeight * 1.02, relic.name, {
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

    const utilityPool = [
      { id: 'lifePotion', label: 'Poção de Vida', icon: '❤️' },
      { id: 'revealBomb', label: 'Poção Dedo-Duro', icon: '💣' },
      { id: 'safePath', label: 'Poção Caminho Seguro', icon: '🧭' }
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

    return reward.label;
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

  handleUtilityUse(type) {
    if (!type || this.metaState.inLobby) {
      return;
    }

    const currentCount = this.metaState.utilities?.[type] ?? 0;

    if (currentCount <= 0) {
      this.setMessage('Você não tem esse utilitário na mochila.');
      return;
    }

    if (type === 'lifePotion') {
      if (this.metaState.hp >= this.metaState.maxHp) {
        this.setMessage('Sua vida já está cheia. Guardar poção nunca fez mal a ninguém.');
        return;
      }

      this.metaState.hp = Math.min(this.metaState.maxHp, this.metaState.hp + 1);
      this.consumeUtility(type);
      this.setMessage(`Poção de vida usada. Vida atual: ${this.metaState.hp}/${this.metaState.maxHp}.`);
      this.syncUI();
      return;
    }

    if (type === 'revealBomb') {
      const hiddenBomb = this.findHiddenBombTile();

      if (!hiddenBomb) {
        this.setMessage('Nenhuma bomba escondida restante para dedurar nesta cave.');
        return;
      }

      hiddenBomb.utilityRevealBomb = true;
      this.consumeUtility(type);
      this.renderMap();
      this.setMessage('Poção dedo-duro usada. Uma bomba foi revelada no mapa.');
      this.syncUI();
      return;
    }

    if (type === 'safePath') {
      const success = this.revealSafePath();

      if (!success) {
        this.setMessage('Não encontrei uma rota segura completa nesta cave. O subterrâneo resolveu ser dramático.');
        return;
      }

      this.consumeUtility(type);
      this.renderMap();
      this.setMessage('Poção caminho seguro usada. A rota verde até a saída foi revelada.');
      this.syncUI();
    }
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
    const cameFrom = new Map();
    const queue = [this.mapData.entry];
    const visited = new Set([`${this.mapData.entry.col},${this.mapData.entry.row}`]);
    let foundExit = null;

    for (let row = 0; row < this.mapData.height; row += 1) {
      for (let col = 0; col < this.mapData.width; col += 1) {
        this.mapData.tiles[row][col].safePath = false;
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const currentKey = `${current.col},${current.row}`;

      if (current.col === this.mapData.exit.col && current.row === this.mapData.exit.row) {
        foundExit = current;
        break;
      }

      const neighbors = getNeighbors4(current.col, current.row, this.mapData.width, this.mapData.height);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.col},${neighbor.row}`;
        if (visited.has(neighborKey)) continue;

        const tile = this.mapData.tiles[neighbor.row][neighbor.col];
        const isSafeTile = tile.type !== 'rock' || tile.hiddenContent !== 'bomb';

        if (!isSafeTile) continue;

        visited.add(neighborKey);
        cameFrom.set(neighborKey, currentKey);
        queue.push(neighbor);
      }
    }

    if (!foundExit) {
      return false;
    }

    let walkKey = `${foundExit.col},${foundExit.row}`;

    while (walkKey) {
      const [col, row] = walkKey.split(',').map(Number);
      const tile = this.mapData.tiles[row][col];
      tile.safePath = true;
      walkKey = cameFrom.get(walkKey);
    }

    return true;
  }

  renderStatusBanner() {
    this.clearStatusBanner();
  }

  clearStatusBanner() {
    if (!this.statusBanner) return;
    this.statusBanner.forEach((item) => item.destroy());
    this.statusBanner = null;
  }

  openExitDecision(message) {
    this.metaState.inLobby = false;
    this.metaState.lobbyReason = null;
    this.metaState.nextCaveAvailable = this.metaState.cave + 1;
    this.metaState.outcomeCave = this.metaState.cave;
    this.metaState.lastMessage = message;

    this.syncUI();

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

    if (reason === 'exit') {
      this.metaState.stats = {
        ...createStatsState(),
        ...this.metaState.stats,
        totalCavesCleared: (this.metaState.stats?.totalCavesCleared ?? 0) + 1
      };
      this.metaState.bestCave = Math.max(this.metaState.bestCave ?? 1, resolvedCave);
    }

    this.metaState.inLobby = true;
    this.metaState.lobbyReason = reason;
    this.metaState.nextCaveAvailable = nextCave;
    this.metaState.outcomeCave = resolvedCave;
    this.metaState.lastMessage = message;

    this.clearHoveredRock();
    this.hidePickaxeEffect();
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

  setMessage(message) {
    this.metaState.lastMessage = message;
    this.syncUI();
  }

  syncUI() {
    this.game?.uiBridge?.syncUI?.({ state: this.metaState, purchased: this.purchased });
    window.dispatchEvent(new CustomEvent('cob-state', { detail: this.metaState }));
  }

  renderDecoration(tile, point) {
    if (!tile.deco) return;

    const deco = this.add.image(point.x, point.y - 18, tile.deco);
    const { mapScale, tileHeight } = this.renderMetrics;

    let scale = 0.42 * mapScale;
    let yOffset = -tileHeight * 0.4;

    if (tile.deco === 'deco_lantern') {
      scale = 0.38 * mapScale;
      yOffset = -tileHeight * 0.56;
    }

    if (tile.deco === 'deco_tracks') {
      scale = 0.5 * mapScale;
      yOffset = -tileHeight * 0.08;
    }

    if (tile.deco === 'deco_rubble') {
      scale = 0.4 * mapScale;
      yOffset = -tileHeight * 0.22;
    }

    if (tile.deco === 'deco_gold_pile') {
      scale = 0.46 * mapScale;
      yOffset = -tileHeight * 0.22;
    }

    if (tile.deco === 'deco_ice_spike') {
      scale = 0.34 * mapScale;
      yOffset = -tileHeight * 0.48;
    }

    if (tile.deco === 'deco_lava_vent') {
      scale = 0.44 * mapScale;
      yOffset = -tileHeight * 0.22;
    }

    if (tile.deco === 'deco_ruin_pillar') {
      scale = 0.42 * mapScale;
      yOffset = -tileHeight * 0.46;
    }

    deco.setPosition(point.x, point.y + yOffset);
    deco.setScale(scale);
    deco.setDepth(point.y + 6);

    this.objectLayer.add(deco);
  }
}
