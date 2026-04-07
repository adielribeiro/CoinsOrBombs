import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { CaveScene } from './scenes/CaveScene.js';

function getContainerSize(container) {
  const rect = container.getBoundingClientRect();

  return {
    width: Math.max(1, Math.round(rect.width || container.clientWidth || window.innerWidth || 1)),
    height: Math.max(1, Math.round(rect.height || container.clientHeight || window.innerHeight || 1))
  };
}

export function createGame(container, uiBridge = {}) {
  const initialSize = getContainerSize(container);
  let game = null;
  let resizeTimers = [];

  const clearResizeTimers = () => {
    resizeTimers.forEach((timerId) => window.clearTimeout(timerId));
    resizeTimers = [];
  };

  const syncResize = () => {
    if (!game || !container?.isConnected) return;

    const { width, height } = getContainerSize(container);

    if (!width || !height) return;

    if (game.scale.width !== width || game.scale.height !== height) {
      game.scale.resize(width, height);
    }

    window.dispatchEvent(new CustomEvent('cob-force-resize'));
  };

  const scheduleResizeSync = () => {
    clearResizeTimers();

    [0, 120, 280, 520].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        syncResize();
      }, delay);

      resizeTimers.push(timerId);
    });
  };

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: initialSize.width,
    height: initialSize.height,
    backgroundColor: '#171d28',
    scene: [BootScene, CaveScene],
    callbacks: {
      postBoot: (bootedGame) => {
        bootedGame.uiBridge = uiBridge;
        scheduleResizeSync();
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initialSize.width,
      height: initialSize.height
    }
  });

  const onViewportChange = () => {
    scheduleResizeSync();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      scheduleResizeSync();
    }
  };

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          scheduleResizeSync();
        })
      : null;

  resizeObserver?.observe(container);

  window.addEventListener('resize', onViewportChange, { passive: true });
  window.addEventListener('orientationchange', onViewportChange, { passive: true });
  window.addEventListener('pageshow', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  const originalDestroy = game.destroy.bind(game);

  game.destroy = (...args) => {
    clearResizeTimers();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('orientationchange', onViewportChange);
    window.removeEventListener('pageshow', onViewportChange);
    window.visualViewport?.removeEventListener('resize', onViewportChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    return originalDestroy(...args);
  };

  return game;
}