import Phaser from 'phaser';

import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_TEXTURE_KEYS
} from '../ground.js';
import { ROCK_CELL_SIZE, getRockSheetKey } from '../rocks.js';

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
     * São seis porque o tint do Phaser só multiplica: um atlas de terra marrom
     * tingido de azul daria lama escura em vez de gelo. Cada bioma tem a própria
     * cor na textura.
     *
     * O custo NÃO é o de um atlas. Este laço carrega os seis no boot, e o
     * comentário dizia o contrário — o que escondia o número que importa: o
     * pacote de boot todo, chão e fundo juntos, é de 11,5 MB. Carregar por
     * bioma na entrada seria a correção, e é um trabalho de carga assíncrona no
     * meio da partida, não uma troca de linha aqui.
     */
    for (const [biomeId, textureKey] of Object.entries(GROUND_TEXTURE_KEYS)) {
      this.load.spritesheet(textureKey, `assets/ground_${biomeId}.png`, {
        frameWidth: GROUND_CELL_WIDTH,
        frameHeight: GROUND_CELL_HEIGHT
      });
    }

    /**
     * Rochas. Uma folha por bioma, doze modelos em cada uma.
     *
     * Antes eram quatro imagens pequenas, compartilhadas por todos os biomas e
     * tingidas por `palette.rockHighlight`. O tint do Phaser só multiplica, e
     * isso funciona mal sobre arte que já tem cor: tingir uma rocha azul de um
     * azul claro não muda o matiz, só lava o contraste. É o mesmo motivo do
     * atlas de chão por bioma.
     *
     * A folha é recortada por `node scripts/slice-rocks.mjs`, que põe cada
     * modelo numa célula quadrada encaixada na base. O quadrado é o que impede
     * a distorção; ver `ROCK_DISPLAY` em `../rocks.js`.
     */
    for (const biomeId of Object.keys(GROUND_TEXTURE_KEYS)) {
      this.load.spritesheet(getRockSheetKey(biomeId), `assets/rocks_${biomeId}.png`, {
        frameWidth: ROCK_CELL_SIZE,
        frameHeight: ROCK_CELL_SIZE
      });
    }

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