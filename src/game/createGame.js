import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { CaveScene } from './scenes/CaveScene.js';

export function createGame(container, uiBridge = {}) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundColor: '#171d28',
    scene: [BootScene, CaveScene],
    callbacks: {
      postBoot: (game) => {
        game.uiBridge = uiBridge;
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });
}
