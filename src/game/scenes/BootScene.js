import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Base
    this.load.image('bomb', 'assets/bomb.png');
    this.load.image('pickaxe', 'assets/pickaxe_lvl1.png');

    // Floors
    this.load.image('floor_01', 'assets/floor_01.png');
    this.load.image('floor_02', 'assets/floor_02.png');
    this.load.image('floor_03', 'assets/floor_03.png');

    // Rocks
    this.load.image('rock_01', 'assets/rock_01.png');
    this.load.image('rock_02', 'assets/rock_02.png');
    this.load.image('rock_03', 'assets/rock_03.png');

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
    this.load.image('cave_bg', 'assets/cave_bg.png');
  }

  create() {
    this.scene.start('CaveScene');
  }
}