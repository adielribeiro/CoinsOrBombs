import Phaser from 'phaser';

import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_TEXTURE_KEYS
} from '../ground.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Base
    this.load.image('bomb', 'assets/bomb.png');
    this.load.image('pickaxe', 'assets/pickaxe_lvl1.png');

    /**
     * Chão. Um atlas por bioma, e não uma arte por tile.
     *
     * A antiga `floor_*.png` era uma grelha 3x3 e a grade aparecia em cada
     * célula; cada frame destes atlas é um recorte de UMA superfície contínua,
     * gerado por `node scripts/generate-ground.mjs`.
     *
     * São quatro porque o tint do Phaser só multiplica: um atlas de terra
     * marrom tingido de azul daria lama escura em vez de gelo. Cada bioma tem a
     * própria cor na textura. Só o atlas do bioma atual é baixado, então o custo
     * por jogador é o de um atlas.
     */
    for (const [biomeId, textureKey] of Object.entries(GROUND_TEXTURE_KEYS)) {
      this.load.spritesheet(textureKey, `assets/ground_${biomeId}.png`, {
        frameWidth: GROUND_CELL_WIDTH,
        frameHeight: GROUND_CELL_HEIGHT
      });
    }

    // Rocks
    this.load.image('rock_01', 'assets/rock_01.png');
    this.load.image('rock_02', 'assets/rock_02.png');
    this.load.image('rock_03', 'assets/rock_03.png');
    this.load.image('rock', 'assets/rock.png');

    // Decorations
    this.load.image('deco_rubble', 'assets/deco_rubble.png');
    this.load.image('deco_crystal_blue', 'assets/deco_crystal_blue.png');
    this.load.image('deco_crystal_red', 'assets/deco_crystal_red.png');
    this.load.image('deco_lantern', 'assets/deco_lantern.png');
    this.load.image('deco_crate', 'assets/deco_crate.png');
    this.load.image('deco_tracks', 'assets/deco_tracks.png');

    // Special
    this.load.image('entrance_frame', 'assets/entrance_frame.png');
    this.load.image('exit_glow', 'assets/exit_glow.png');
    this.load.image('cave_bg_sunstone', 'assets/cave_bg_sunstone.png');
    this.load.image('cave_bg_frost', 'assets/cave_bg_frost.png');
    this.load.image('cave_bg_ember', 'assets/cave_bg_ember.png');
    this.load.image('cave_bg_ruins', 'assets/cave_bg_ruins.png');
    this.load.image('cave_bg_wind', 'assets/cave_bg_wind.png');
    this.load.image('cave_bg_crystal', 'assets/cave_bg_crystal.png');

    // Biome decorations
    this.load.image('deco_gold_pile', 'assets/deco_gold_pile.png');
    this.load.image('deco_ice_spike', 'assets/deco_ice_spike.png');
    this.load.image('deco_lava_vent', 'assets/deco_lava_vent.png');
    this.load.image('deco_ruin_pillar', 'assets/deco_ruin_pillar.png');
  }

  create() {
    this.scene.start('CaveScene');
  }
}