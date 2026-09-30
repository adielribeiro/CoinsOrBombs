import Phaser from 'phaser';

import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_TEXTURE_KEYS
} from '../ground.js';
import { ROCK_CELL_SIZE, getRockSheetKey, getRockVariantCount } from '../rocks.js';
import { listBiomeArt } from '../backdrops.js';

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

    // Entulho. Sobrevive à remoção da decoração espalhada porque deixou de ser
    // decoração: é a textura de duas coisas que são efeito de jogo —
    // `spawnBreakDebris` (o caco que sai da rocha quebrada) e `renderGrit` (o
    // cascalho do chão). Apagar junto quebraria a animação de quebra.
    this.load.image('deco_rubble', 'assets/deco_rubble.png');

    // Special
    this.load.image('exit_glow', 'assets/exit_glow.png');
    this.load.image('exit_ladder', 'assets/exit_ladder.png');

    /**
     * Fundos e entradas: os seis de cada, TODOS no boot.
     *
     * Isto já foi por demanda, com um só par no boot e os outros cinco pedidos na
     * hora de entrar no bioma. Não funcionou: em cinco dos seis biomas o fundo não
     * aparecia, a entrada não aparecia, e nenhum erro no console dizia por quê. O
     * pedido existia, o `start()` era chamado, e nenhum evento de conclusão
     * chegava — o que o jogo desenhava era o fundo da Mina Solar, que é o único
     * que estava em cache.
     *
     * A economia que aquilo prometia era de 17 MB na primeira visita, contra uma
     * tela que mostra um bioma por vez. Trocar 17 MB por "o jogo funciona" é uma
     * conta fácil, e a alternativa era manter um caminho de carga que eu não
     * consegui fazer funcionar nem explicar.
     *
     * Medido: 19,8 MB de fundo e entrada, 27 MB de boot no total. O que economiza
     * é o tempo de espera de quem joga uma única cave; o que custa é a espera de
     * quem joga as seis. É a escolha certa para um jogo de progressão.
     */
    // A lista vem pronta de `listBiomeArt`, que é pura e testada. Um laço escrito
    // aqui dentro é um `ReferenceError` esperando acontecer, e o build não pega.
    for (const item of listBiomeArt()) {
      this.load.image(item.key, item.url);
    }
  }

  create() {
    this.scene.start('CaveScene');
  }
}