import Phaser from 'phaser';

import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_TEXTURE_KEYS
} from '../ground.js';
import { ROCK_CELL_SIZE, getRockSheetKey, getRockVariantCount } from '../rocks.js';
import { BIOMA_INICIAL, getBackdropKey } from '../backdrops.js';
import { getEntranceKey } from '../entrances.js';

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
        frameHeight: ROCK_CELL_SIZE,
        // A folha tem 16 células e cada bioma usa entre 12 e 14. Sem o
        // `endFrame`, o Phaser criaria frame também para a célula vazia, e ela é
        // um retângulo transparente: qualquer índice que a pegasse seria uma
        // rocha invisível, e ninguém veria o motivo.
        endFrame: getRockVariantCount(biomeId) - 1
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
    this.load.image('exit_glow', 'assets/exit_glow.png');
    this.load.image('exit_ladder', 'assets/exit_ladder.png');

    /**
     * Fundo e entrada: SÓ do primeiro bioma.
     *
     * A versão anterior carregava os seis fundos e uma entrada, o que levava o
     * pacote de boot de 14,8 MB para 36,8 MB. Os fundos em 4K somam 17,3 MB e as
     * seis entradas 2,3 MB, para uma tela que mostra um de cada vez.
     *
     * O primeiro bioma entra porque é o da tela de título: sem ele, o menu
     * apareceria com um retângulo da cor da caverna até o fundo chegar. Os outros
     * cinco entram por demanda, em `ensureBackdrop`, no `backdrops.js`.
     */
    this.load.image(getBackdropKey(BIOMA_INICIAL), `assets/${getBackdropKey(BIOMA_INICIAL)}.png`);
    this.load.image(getEntranceKey(BIOMA_INICIAL), `assets/${getEntranceKey(BIOMA_INICIAL)}.png`);

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