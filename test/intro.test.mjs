import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTRO_SEEN_KEY,
  INTRO_VISTO,
  desmarcarIntroVista,
  introJaVista,
  marcarIntroVista
} from '../src/game/intro.js';

/**
 * Quando o splash da ArchangelSoft aparece.
 *
 * ## A regra mudou duas vezes, e este arquivo é o registro disso
 *
 * A primeira versão marcava "visto" e não olhava mais nada. Ela resolveu a
 * repetitividade que motivou a mudança e criou o problema oposto: quem jogou uma
 * vez parou de ver o logo para sempre, e a complaint que veio foi "a cena da
 * ArchangelSoft não sobe". As duas coisas eram verdade ao mesmo tempo — a cena
 * estava no código, e o storage não tinha como dizer que era outra versão.
 *
 * Hoje a marca é a **versão** em que o splash foi visto. Estes testes existem
 * para a regra continuar valendo as duas metades: não repetir sessão atrás de
 * sessão, e voltar quando o jogo muda.
 */

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

const V = '0.3.0';

// --- a regra de sempre -----------------------------------------------------

test('o splash aparece na primeira entrada da versão', () => {
  const storage = storageFalso();

  assert.equal(introJaVista(storage, V), false, 'o splash já aparece marcado antes de ser visto');

  marcarIntroVista(storage, V);
  assert.equal(introJaVista(storage, V), true, 'o splash foi visto e não ficou marcado');
});

test('a marca sobrevive a várias entradas da mesma versão', () => {
  // A repetição era o primeiro problema: o splash voltava toda vez que se saía do
  // menu. O que se afirma é que a segunda, a terceira e a décima entrada da MESMA
  // versão continuam vendo o splash como já visto.
  const storage = storageFalso();

  assert.equal(introJaVista(storage, V), false);
  marcarIntroVista(storage, V);

  for (let entrada = 1; entrada <= 10; entrada += 1) {
    assert.equal(introJaVista(storage, V), true, `na entrada ${entrada} o splash voltou`);
  }
});

test('o splash volta quando a versão do jogo sobe', () => {
  // A segunda metade da regra, e a que faltava antes. Sem este teste, voltar a
  // guardar "sim" passava: a repetitividade continuava resolvida e ninguém
  // percebia que o logo tinha deixado de aparecer para sempre.
  const storage = storageFalso();

  marcarIntroVista(storage, '0.2.0');
  assert.equal(introJaVista(storage, '0.2.0'), true, 'a marca da versao antiga nao vale na versao antiga');

  assert.equal(
    introJaVista(storage, '0.3.0'),
    false,
    'o splash não voltou quando o jogo mudou de versão'
  );

  // E, vendo a nova, a marca passa a ser da nova.
  marcarIntroVista(storage, '0.3.0');
  assert.equal(introJaVista(storage, '0.3.0'), true);
  assert.equal(introJaVista(storage, '0.2.0'), false, 'a versão antiga voltou a valer');
});

test('a marca antiga, "sim", faz o splash aparecer uma vez e vira versão', () => {
  // Quem já jogou tem "sim" gravado. Tratar isso como "visto na versão atual"
  // manteria o logo invisível justamente para quem mais precisa ver a mudança.
  const storage = storageFalso();
  storage.setItem(INTRO_SEEN_KEY, INTRO_VISTO);

  assert.equal(
    introJaVista(storage, V),
    false,
    'a marca antiga "sim" foi lida como se fosse desta versão'
  );

  marcarIntroVista(storage, V);
  assert.equal(storage.getItem(INTRO_SEEN_KEY), V, 'a marca não virou a versão');
  assert.equal(introJaVista(storage, V), true);
});

test('a marca é salva sob uma chave só nossa', () => {
  const storage = storageFalso();
  marcarIntroVista(storage, V);

  assert.equal(storage.tem(INTRO_SEEN_KEY), true, 'a marca não foi gravada');
  assert.equal(storage.getItem(INTRO_SEEN_KEY), V, 'a marca não guarda a versão');

  // E a chave é do jogo, com o prefixo que o resto usa — nada de `intro` solto no
  // mesmo espaço das configurações.
  assert.ok(
    INTRO_SEEN_KEY.startsWith('coinsorbombs:'),
    `a chave é "${INTRO_SEEN_KEY}", fora do namespace do jogo`
  );
});

// --- os cantos, que é onde a regra costuma furar ---------------------------

test('sem storage, o splash aparece — e o jogo não quebra', () => {
  // O lado que o jogo erra tem que ser o de mostrar o splash: dois segundos e
  // meio de intro é um incômodo, e esconder o splash de quem nunca viu tira a
  // única coisa que ele existe para fazer.
  assert.equal(introJaVista(null, V), false, 'sem storage, o splash sumiu');
  assert.equal(introJaVista(storageQueLanca(), V), false, 'storage que lança escondeu o splash');

  assert.equal(marcarIntroVista(null, V), false, 'marcar sem storage devolveu outra coisa');
  assert.equal(marcarIntroVista(storageQueLanca(), V), false, 'storage que lança devolveu outra coisa');
});

test('sem versão o splash aparece, e não some', () => {
  // `versaoAtual` vazio tornaria a comparação impossível. Devolver `true`
  // esconderia o splash de todo mundo — o modo de falha que ninguém percebe,
  // porque o jogo funciona e o logo simplesmente não existe.
  const storage = storageFalso();
  marcarIntroVista(storage, V);

  for (const versao of [undefined, null, '', '   ']) {
    assert.equal(
      introJaVista(storage, versao),
      false,
      `a versão "${String(versao)}" escondeu o splash`
    );
  }
});

test('um valor estranho na chave não conta como splash visto', () => {
  const storage = storageFalso();

  for (const valor of ['', 'nao', 'false', '0', 'true', 'undefined', 'v0.3.0']) {
    storage.setItem(INTRO_SEEN_KEY, valor);
    assert.equal(
      introJaVista(storage, V),
      false,
      `o valor "${valor}" na chave foi lido como "splash já visto"`
    );
  }
});

test('a versão é normalizada, para um espaço não apagar o splash para sempre', () => {
  // A versão é comparada como texto, e o corte óbvio é `GAME_VERSION` vir com
  // espaço. Gravar a marca sem aparar faria `marcar(' 0.3.0 ')` e ler
  // `introJaVista('0.3.0')` discordarem para sempre — e o lado da discordância
  // é `false`, que é o lado que **mostra** o splash. O efeito seria o logo
  // reaparecer toda sessão, que é a reclamação original voltando.
  const storage = storageFalso();
  marcarIntroVista(storage, '  0.3.0  ');

  assert.equal(storage.getItem(INTRO_SEEN_KEY), '0.3.0', 'a marca guardou o espaço');
  assert.equal(introJaVista(storage, '0.3.0'), true, 'o splash voltou mesmo com espaço na versão');

  // E o lado inverso: uma marca adulterada à mão é outra versão, e o splash
  // aparece. Mostrar é o lado que erra para o lugar certo.
  storage.setItem(INTRO_SEEN_KEY, '0.3.0 ');
  assert.equal(introJaVista(storage, '0.3.0'), false, 'uma marca adulterada contou como desta versão');
});

test('desmarcar devolve o splash, e é assim que se vê ele de novo', () => {
  const storage = storageFalso();

  marcarIntroVista(storage, V);
  assert.equal(introJaVista(storage, V), true);

  desmarcarIntroVista(storage);
  assert.equal(introJaVista(storage, V), false, 'desmarcar não voltou ao estado inicial');
});

test('desmarcar sem storage não quebra', () => {
  assert.doesNotThrow(() => desmarcarIntroVista(null));
  assert.doesNotThrow(() => desmarcarIntroVista(storageQueLanca()));
});