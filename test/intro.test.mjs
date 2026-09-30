import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTRO_SEEN_KEY,
  desmarcarIntroVista,
  introJaVista,
  marcarIntroVista
} from '../src/game/intro.js';

/** Um `localStorage` de mentira, que guarda em memória. */
function storageFalso() {
  const itens = new Map();

  return {
    getItem(chave) {
      return itens.has(chave) ? itens.get(chave) : null;
    },
    setItem(chave, valor) {
      itens.set(chave, String(valor));
    },
    removeItem(chave) {
      itens.delete(chave);
    },
    tem(chave) {
      return itens.has(chave);
    }
  };
}

/** Um storage que lança em tudo, como o de um modo privado bloqueado. */
function storageQueLanca() {
  return {
    getItem() {
      throw new Error('storage bloqueado');
    },
    setItem() {
      throw new Error('storage bloqueado');
    },
    removeItem() {
      throw new Error('storage bloqueado');
    }
  };
}

test('a intro é vista só na primeira vez', () => {
  const storage = storageFalso();

  assert.equal(introJaVista(storage), false, 'a intro já aparece marcada antes de ser vista');

  marcarIntroVista(storage);
  assert.equal(introJaVista(storage), true, 'a intro foi vista e não ficou marcada');
});

test('a marca sobrevive a várias entradas', () => {
  // A repetição era o problema: o splash voltava toda vez que se saía do menu.
  // O que se afirma aqui é que a segunda, a terceira e a décima entrada
  // continuam vendo a intro como já vista.
  const storage = storageFalso();

  assert.equal(introJaVista(storage), false);
  marcarIntroVista(storage);

  for (let entrada = 1; entrada <= 10; entrada += 1) {
    assert.equal(introJaVista(storage), true, `na entrada ${entrada} a intro voltou`);
  }
});

test('a marca é salva sob uma chave só nossa', () => {
  const storage = storageFalso();
  marcarIntroVista(storage);

  assert.equal(storage.tem(INTRO_SEEN_KEY), true, 'a marca não foi gravada');
  assert.equal(storage.getItem(INTRO_SEEN_KEY), 'sim');

  // E a chave é do jogo, com o prefixo que o resto usa — nada de `intro` solto no
  // mesmo espaço das configurações.
  assert.ok(
    INTRO_SEEN_KEY.startsWith('coinsorbombs:'),
    `a chave é "${INTRO_SEEN_KEY}", fora do namespace do jogo`
  );
});

test('sem storage, a intro aparece — e o jogo não quebra', () => {
  // O lado que o jogo erra tem que ser o de mostrar o splash: dois segundos e
  // meio de intro é um incômodo, e esconder o splash de quem nunca viu tira a
  // única coisa que ele existe para fazer.
  assert.equal(introJaVista(null), false, 'sem storage, a intro sumiu');
  assert.equal(introJaVista(storageQueLanca()), false, 'storage que lança escondeu a intro');

  assert.equal(marcarIntroVista(null), false, 'marcar sem storage devolveu outra coisa');
  assert.equal(marcarIntroVista(storageQueLanca()), false, 'storage que lança devolveu outra coisa');
});

test('um valor estranho na chave não conta como intro vista', () => {
  // A marca é o literal 'sim'. Qualquer outra coisa — um valor antigo, um
  // `null` escrito por engano, um número — é a mesma coisa que não existir, e o
  // jogo mostra a intro. É o lado que erra para o lugar de mostrar.
  const storage = storageFalso();

  for (const valor of ['', 'nao', 'false', '0', 'true', 'undefined']) {
    storage.setItem(INTRO_SEEN_KEY, valor);
    assert.equal(
      introJaVista(storage),
      false,
      `o valor "${valor}" na chave foi lido como "intro já vista"`
    );
  }
});

test('desmarcar devolve a intro, e é assim que se vê ela de novo', () => {
  const storage = storageFalso();

  marcarIntroVista(storage);
  assert.equal(introJaVista(storage), true);

  desmarcarIntroVista(storage);
  assert.equal(introJaVista(storage), false, 'desmarcar nãovoltou ao estado inicial');
});

test('desmarcar sem storage não quebra', () => {
  assert.doesNotThrow(() => desmarcarIntroVista(null));
  assert.doesNotThrow(() => desmarcarIntroVista(storageQueLanca()));
});
