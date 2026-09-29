import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKDROP_KEYS,
  BIOMA_INICIAL,
  ensureBackdrop,
  getBackdropKey,
  getBackdropKeyForCave,
  isBackdropReady,
  listBackdropKeys
} from '../src/game/backdrops.js';
import { ENTRANCES, getEntranceKey } from '../src/game/entrances.js';
import { BIOMES, getBiomeForCave } from '../src/game/progression.js';

const BIOMAS = BIOMES.map((b) => b.id);

/**
 * Uma cena falsa com o mínimo do Phaser que `ensureBackdrop` toca.
 *
 * Existe porque o caminho de carga por bioma **não é verificável no navegador
 * deste ambiente**: a aba fica com `visibilityState === 'hidden'`, o
 * `requestAnimationFrame` é estrangulado, o `BootScene` nunca termina o preload
 * e o `CaveScene.create()` nunca registra os ouvintes. Sem cena, não há
 * `ensureBackdrop` para chamar.
 *
 * O que esta cena falsa cobre é a LÓGICA, que é a parte com decisão: quando
 * pedir, quando não pedir, quando liberar o pedido. O que ela não cobre é se o
 * Phaser realmente baixa o arquivo — e isso fica registrado como o limite,
 * não escondido.
 */
function cenaFalsa({ texturas = [] } = {}) {
  const ouvintes = new Map();
  const pedidos = [];
  const iniciados = [];

  const scene = {
    texturas: {
      existentes: new Set(texturas),
      exists(key) {
        return this.existentes.has(key);
      }
    },
    load: {
      once(evento, fn) {
        if (!ouvintes.has(evento)) ouvintes.set(evento, []);
        ouvintes.get(evento).push(fn);
      },
      image(key, url) {
        pedidos.push({ key, url });
      },
      start() {
        iniciados.push(pedidos.length);
      }
    },

    // Instrumentação do teste, não da cena real.
    _pedidos: pedidos,
    _iniciados: iniciados,
    _ouvintes: ouvintes,

    /** Dispara um evento como o Phaser faria quando o arquivo chega. */
    emitir(evento) {
      for (const fn of ouvintes.get(evento) ?? []) fn();
    },

    /** Marca uma textura como carregada, como o `textures.exists` passaria a ver. */
    terTextura(key) {
      scene.texturas.existentes.add(key);
    }
  };

  return scene;
}

const arteDe = (biomaId) => [getBackdropKey(biomaId), getEntranceKey(biomaId)];

test('todo bioma tem fundo e entrada registrados', () => {
  for (const id of BIOMAS) {
    assert.ok(BACKDROP_KEYS[id], `${id} sem chave de fundo`);
    assert.ok(ENTRANCES[id], `${id} sem entrada`);
    assert.equal(getBackdropKey(id), BACKDROP_KEYS[id]);
  }

  assert.equal(listBackdropKeys().length, BIOMAS.length, 'a lista de fundos não bate com a de biomas');
  assert.equal(new Set(listBackdropKeys()).size, BIOMAS.length, 'dois biomas compartilham o fundo');
});

test('o bioma do boot é um bioma de verdade, e é a Mina Solar', () => {
  // A Mina Solar é o primeiro bioma, é o que a tela de título mostra, e é o
  // único que o `BootScene` carrega sem depender de rede. Um `BIOMA_INICIAL` que
  // não existe faria o menu cair no placeholder de textura ausente para sempre.
  assert.ok(BIOMAS.includes(BIOMA_INICIAL), `BIOMA_INICIAL é "${BIOMA_INICIAL}", que não é bioma`);
  assert.equal(BIOMA_INICIAL, 'sunstone');
  assert.equal(getBackdropKeyForCave(1), getBackdropKey('sunstone'));
  // Cave 7 ainda é Mina Solar: a faixa vai de 1 a 10. A Gruta de Gelo abre na 11.
  assert.equal(getBackdropKeyForCave(7), getBackdropKey('sunstone'));
  assert.equal(getBackdropKeyForCave(11), getBackdropKey('frost'));
});

test('bioma sem registro cai no inicial, e não quebra', () => {
  assert.equal(getBackdropKey('bioma-que-nao-existe'), getBackdropKey(BIOMA_INICIAL));
});

test('devolve verdadeiro sem pedir nada quando as duas artes já estão', () => {
  const scene = cenaFalsa({ texturas: arteDe('frost') });

  assert.equal(isBackdropReady(scene, 'frost'), true);
  assert.equal(ensureBackdrop(scene, 'frost', () => {}), true);
  assert.equal(scene._pedidos.length, 0, 'pediu arquivo que já estava em cache');
  assert.equal(scene._iniciados.length, 0, 'chamou start() sem ter o que baixar');
});

test('pede o fundo E a entrada do bioma, no mesmo pedido', () => {
  const scene = cenaFalsa();
  let avisos = 0;

  assert.equal(ensureBackdrop(scene, 'ember', () => { avisos += 1; }), false);

  const pedidas = scene._pedidos.map((p) => p.key).sort();
  assert.deepEqual(
    pedidas,
    [getEntranceKey('ember'), getBackdropKey('ember')].sort(),
    'o pedido tem de ser o par. Pedir só o fundo deixaria a entrada aparecendo '
      + 'um quadro depois, como um pedestal que surge.'
  );
  assert.equal(scene._iniciados.length, 1, 'os dois arquivos vão no mesmo start()');
  assert.equal(avisos, 0, 'o onReady não pode disparar antes de a arte chegar');

  // A arte chega, e o render é chamado para trocar o placeholder.
  scene.terTextura(getBackdropKey('ember'));
  scene.terTextura(getEntranceKey('ember'));
  scene.emitir(`filecomplete-image-${getBackdropKey('ember')}`);

  assert.equal(avisos, 1, 'o onReady tem que disparar quando o fundo chega');
  assert.equal(isBackdropReady(scene, 'ember'), true);
});

test('chamar duas vezes no mesmo bioma não abre dois pedidos', () => {
  // O `renderMap` do Phaser pode passar pelo mesmo ponto duas vezes no mesmo
  // quadro, e sem isto o placeholder piscaria a cada passada.
  const scene = cenaFalsa();

  ensureBackdrop(scene, 'ruins', () => {});
  const pedidosDepoisDoPrimeiro = scene._pedidos.length;
  ensureBackdrop(scene, 'ruins', () => {});
  ensureBackdrop(scene, 'ruins', () => {});

  assert.equal(
    scene._pedidos.length,
    pedidosDepoisDoPrimeiro,
    'o segundo e o terceiro ensureBackdrop abriram pedidos novos'
  );
  assert.equal(scene._iniciados.length, 1, 'chamou start() mais de uma vez');
});

test('depois que chega, o mesmo bioma não abre outro pedido', () => {
  const scene = cenaFalsa();
  ensureBackdrop(scene, 'crystal', () => {});

  scene.terTextura(getBackdropKey('crystal'));
  scene.terTextura(getEntranceKey('crystal'));
  scene.emitir(`filecomplete-image-${getBackdropKey('crystal')}`);

  const antes = scene._pedidos.length;
  assert.equal(ensureBackdrop(scene, 'crystal', () => {}), true);
  assert.equal(scene._pedidos.length, antes, 'pediu de novo uma arte que já tinha chegado');
});

test('um arquivo que falha libera o pedido, e o placeholder não trava', () => {
  // É a rede. Sem o `loaderror`, a chave ficaria presa em "carregando" e o
  // placeholder da cor do bioma nunca mais sairia — nem se o jogador saísse e
  // voltasse ao bioma.
  const scene = cenaFalsa();
  ensureBackdrop(scene, 'wind', () => {});

  scene.emitir('loaderror');

  // O pedido foi liberado, então uma nova tentativa é possível. É este o ponto:
  // sem o `loaderror`, a chave ficaria presa em "carregando" e o placeholder da
  // cor do bioma nunca mais sairia — nem se o jogador saísse e voltasse ao bioma.
  const antes = scene._pedidos.length;
  ensureBackdrop(scene, 'wind', () => {});
  assert.equal(
    scene._pedidos.length,
    antes + 2,
    'o bioma ficou marcado como "carregando para sempre" depois do erro: a '
      + 'nova tentativa não abriu pedido'
  );
});

test('o pedido é por cena, e não global', () => {
  // Duas cenas não podem compartilhar a lista de em voo. `CaveScene` é criado e
  // destruído ao longo da sessão, e uma chave presa no conjunto de uma cena morta
  // diria para sempre que "já está carregando" para a cena nova.
  const a = cenaFalsa();
  const b = cenaFalsa();

  ensureBackdrop(a, 'sunstone', () => {});
  assert.equal(a._pedidos.length, 2, 'a primeira cena não pediu fundo e entrada');
  assert.equal(b._pedidos.length, 0);

  ensureBackdrop(b, 'sunstone', () => {});
  assert.equal(b._pedidos.length, 2, 'a segunda cena herdou o pedido da primeira');
});

test('cada bioma tem as duas artes em disco, e o par tem o mesmo bioma', async () => {
  // Sem o arquivo, o `ensureBackdrop` pediria um caminho que dá 404, o `loaderror`
  // liberaria o pedido, e o bioma ficaria em cinza para sempre. É o bug que o
  // teste de "a chave existe" não pega: aqui é o arquivo que importa.
  const { existsSync } = await import('node:fs');

  for (const id of BIOMAS) {
    for (const key of arteDe(id)) {
      assert.ok(
        existsSync(new URL(`../public/assets/${key}.png`, import.meta.url)),
        `${id}: falta ${key}.png. O pedido daria 404 e o bioma ficaria sem arte.`
      );
    }
  }
});

test('a arte do bioma é a do bioma, e não a de outro', () => {
  // Um `switch` com `case` errado, ou um `??` que cai no primeiro bioma, daria a
  // caverna da Mina Solar dentro da Câmara de Cristal — e as duas se parecem o
  // bastante para passar.
  for (const id of BIOMAS) {
    const par = arteDe(id);

    for (const outro of BIOMAS) {
      if (outro === id) continue;

      const parDoOutro = arteDe(outro);
      assert.notEqual(par[0], parDoOutro[0], `${id} e ${outro} compartilham o fundo`);
      assert.notEqual(par[1], parDoOutro[1], `${id} e ${outro} compartilham a entrada`);
    }
  }
});

test('o bioma de uma cave é o mesmo que o do fundo daquela cave', () => {
  // `getBackdropKeyForCave` é o atalho que a cena usa quando o jogador entra numa
  // cave sem passar pela seleção de bioma. Se ele discordar do `getBiomeForCave`,
  // a tela de título e a partida mostram cavernas diferentes.
  for (const cave of [1, 5, 10, 11, 25, 40, 41, 55, 60]) {
    assert.equal(
      getBackdropKeyForCave(cave),
      getBackdropKey(getBiomeForCave(cave).id),
      `cave ${cave}: o atalho de fundo discorda do bioma da cave`
    );
  }
});
