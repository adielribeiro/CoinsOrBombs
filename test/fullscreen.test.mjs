import test from 'node:test';
import assert from 'node:assert/strict';

import {
  describeFullscreenError,
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  isIosLike,
  onFullscreenChange,
  toggleFullscreen
} from '../src/game/fullscreen.js';

/**
 * O módulo lê `document`/`navigator`/`screen` de forma tardia, então dá para
 * exercitar os caminhos de plataforma sem DOM real.
 *
 * `navigator` no Node moderno é um accessor sem setter, então a troca precisa
 * ser por `defineProperty` — `Object.assign` lança TypeError.
 */
const ENV_KEYS = ['document', 'navigator', 'screen', 'location'];

function withEnv(env, fn) {
  const saved = ENV_KEYS.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      Reflect.deleteProperty(globalThis, key);
      continue;
    }

    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: true
    });
  }

  try {
    return fn();
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function fakeElement(props = {}) {
  return { nodeType: 1, className: 'game-area', ...props };
}

test('isFullscreenSupported reflete a presenca da API no elemento', () => {
  withEnv({ document: { documentElement: fakeElement() } }, () => {
    assert.equal(isFullscreenSupported(), false);
  });

  withEnv({ document: { documentElement: fakeElement({ requestFullscreen() {} }) } }, () => {
    assert.equal(isFullscreenSupported(), true);
  });

  withEnv(
    { document: { documentElement: fakeElement({ webkitRequestFullscreen() {} }) } },
    () => {
      assert.equal(isFullscreenSupported(), true, 'Safari com prefixo deve contar como suportado');
    }
  );
});

test('isFullscreenActive aceita o elemento padrao e o prefixado do Safari', () => {
  withEnv({ document: { documentElement: fakeElement(), fullscreenElement: fakeElement() } }, () => {
    assert.equal(isFullscreenActive(), true);
  });

  withEnv(
    { document: { documentElement: fakeElement(), webkitFullscreenElement: fakeElement() } },
    () => {
      assert.equal(isFullscreenActive(), true);
    }
  );

  withEnv({ document: { documentElement: fakeElement(), fullscreenElement: null } }, () => {
    assert.equal(isFullscreenActive(), false);
  });
});

test('enterFullscreen resolve quando a API devolve void em vez de Promise', async () => {
  const node = fakeElement({ requestFullscreen: () => undefined });

  const result = await withEnv({ document: { documentElement: node } }, () => enterFullscreen(node));

  assert.equal(result, true, 'um retorno void deve virar Promise resolvida, não Promise undefined');
});

test('enterFullscreen sinaliza iOS quando a API nao existe no Safari mobile', async () => {
  const node = fakeElement();

  await withEnv(
    {
      document: { documentElement: node },
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', maxTouchPoints: 5 }
    },
    async () => {
      assert.equal(isIosLike(), true);
      await assert.rejects(() => enterFullscreen(node), (error) => error.reason === 'ios');
    }
  );
});

test('enterFullscreen sinaliza "nao suportado" fora do iOS', async () => {
  const node = fakeElement();

  await withEnv(
    {
      document: { documentElement: node },
      navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', maxTouchPoints: 0 }
    },
    async () => {
      assert.equal(isIosLike(), false);
      await assert.rejects(() => enterFullscreen(node), (error) => error.reason === 'unsupported');
    }
  );
});

test('iPadOS 13+ se apresenta como Mac e ainda assim conta como iOS', () => {
  withEnv(
    { navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 } },
    () => {
      assert.equal(isIosLike(), true);
    }
  );

  withEnv(
    { navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 } },
    () => {
      assert.equal(isIosLike(), false, 'Mac de verdade com mouse nao pode ser tratado como iPad');
    }
  );
});

test('uma excecao lancada de forma sincronia vira motivo "gesture"', async () => {
  const node = fakeElement({
    requestFullscreen() {
      throw new TypeError('not allowed');
    }
  });

  await withEnv({ document: { documentElement: node } }, async () => {
    await assert.rejects(() => enterFullscreen(node), (error) => error.reason === 'gesture');
  });
});

test('ja estar em tela cheia nao dispara um segundo pedido', async () => {
  let calls = 0;
  const node = fakeElement({
    requestFullscreen() {
      calls += 1;
    }
  });

  await withEnv(
    { document: { documentElement: node, fullscreenElement: fakeElement() } },
    async () => {
      const result = await enterFullscreen(node);
      assert.equal(result, true);
    }
  );

  assert.equal(calls, 0);
});

test('toggleFullscreen escolhe entrar ou sair conforme o estado atual', async () => {
  let requested = 0;
  let exited = 0;
  const node = fakeElement({
    requestFullscreen() {
      requested += 1;
    }
  });

  await withEnv(
    { document: { documentElement: node, fullscreenElement: null, exitFullscreen: () => void (exited += 1) } },
    async () => {
      await toggleFullscreen(node);
      assert.equal(requested, 1);
      assert.equal(exited, 0);
    }
  );

  await withEnv(
    {
      document: {
        documentElement: node,
        fullscreenElement: fakeElement(),
        exitFullscreen: () => void (exited += 1)
      }
    },
    async () => {
      await toggleFullscreen(node);
      assert.equal(requested, 1, 'nao deve pedir entrada estando ja em tela cheia');
      assert.equal(exited, 1);
    }
  );
});

test('exitFullscreen nao faz nada quando o documento nao esta em tela cheia', async () => {
  let exited = 0;

  const result = await withEnv(
    { document: { documentElement: fakeElement(), fullscreenElement: null, exitFullscreen: () => void (exited += 1) } },
    () => exitFullscreen()
  );

  assert.equal(result, true);
  assert.equal(exited, 0);
});

test('onFullscreenChange devolve um unsubscribe', () => {
  const listeners = [];
  const doc = {
    documentElement: fakeElement(),
    addEventListener: (name) => listeners.push(name),
    removeEventListener: (name) => listeners.push(`-${name}`)
  };

  const off = withEnv({ document: doc }, () => onFullscreenChange(() => {}));

  assert.ok(listeners.includes('fullscreenchange'));
  assert.ok(listeners.includes('webkitfullscreenchange'));

  off();
  assert.ok(listeners.includes('-fullscreenchange'));
});

test('cada falha tem uma mensagem acionavel e distinta', () => {
  const ios = describeFullscreenError({ reason: 'ios' });
  const unsupported = describeFullscreenError({ reason: 'unsupported' });
  const gesture = describeFullscreenError({ reason: 'gesture' });
  const denied = describeFullscreenError(new Error('qualquer'));

  assert.match(ios.message, /Tela de Início/, 'no iOS a saida util e instalar o app');
  assert.match(unsupported.message, /não oferece tela cheia/);
  assert.match(gesture.message, /Tela cheia/);
  assert.match(denied.message, /botão de tela cheia/);

  const codes = new Set([ios.code, unsupported.code, gesture.code, denied.code]);
  assert.equal(codes.size, 4, 'as quatro causas precisam ser distinguíveis na UI');
});

test('sem document a biblioteca degrada sem quebrar', () => {
  withEnv({ document: undefined }, () => {
    assert.equal(isFullscreenSupported(), false);
    assert.equal(isFullscreenActive(), false);
    assert.equal(typeof onFullscreenChange(() => {}), 'function');
  });
});
