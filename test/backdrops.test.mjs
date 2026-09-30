import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

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

const MISSING = '__MISSING';

/**
 * Uma cena falsa com o minimo do Phaser que `ensureBackdrop` toca.
 *
 * Existe porque o caminho de carga por bioma nao e verificavel no navegador deste
 * ambiente: a aba fica com `visibilityState === 'hidden'`, o `requestAnimationFrame`
 * e estrangulado, o `BootScene` nunca termina o preload e o `CaveScene.create()`
 * nunca registra os ouvintes. Sem cena, nao ha `ensureBackdrop` para chamar.
 *
 * ## A parte que importa: `get`
 *
 * `textures.exists` e `list.hasOwnProperty(key)`, e `textures.get(key)` devolve a
 * textura `__MISSING` quando a chave nao esta na lista. A `__MISSING` e exatamente
 * a caixa preta com X verde que apareceu no lugar do fundo de cinco dos seis
 * biomas, sem erro no console.
 *
 * A cena reproduz isso: uma chave que nao esta em `existentes` continua "existindo"
 * para quem so pergunta com `exists`, e devolve `__MISSING` para quem pergunta com
 * `get`. Sem essa distincao, o teste passa, o jogo desenha o X, e ninguem entende
 * por que.
 *
 * ## Por que a cena mora AQUI e nao em um modulo ao lado
 *
 * Ela morou em `test/cena-phaser.mjs`, importada por este arquivo, e o resultado
 * foi impossivel de explicar: o mesmo objeto devolvido por `cenaFalsa()`, com
 * `texturas` presente em toda sondagem, chegava a um arquivo de teste sem
 * `texturas` — em linhas consecutivas do mesmo arquivo, e de forma diferente
 * conforme o arquivo de teste que o executava. A CI, em Linux com Node 22, via a
 * mesma coisa.
 *
 * Nao tenho explicacao que eu consiga provar. O que era real e proprio desse
 * arranjo: `node --test` trata TUDO sob `test/` como arquivo de teste, e um modulo
 * auxiliar sem testes e uma armadilha esperando acontecer.
 *
 * Um duplo de teste que so este arquivo usa nao tem motivo para estar em outro
 * lugar. E ficar aqui elimina a variavel.
 *
 * O que ela cobre e a LOGICA: quando pedir, quando nao pedir, quando liberar o
 * pedido. O que nao cobre e se o Phaser realmente baixa o arquivo — e isso fica
 * registrado como limite, nao escondido.
 */
function cenaFalsa(chaves = []) {
  const existentes = new Set(chaves);
  const ouvintes = new Map();
  const pedidos = [];
  const iniciados = [];

  return {
    texturas: {
      existentes,
      exists(chave) {
        return this.existentes.has(chave);
      },
      get(chave) {
        if (this.existentes.has(chave)) return { key: chave };
        return { key: MISSING };
      }
    },
    load: {
      once(evento, fn) {
        if (!ouvintes.has(evento)) ouvintes.set(evento, []);
        ouvintes.get(evento).push(fn);
      },
      image(chave, url) {
        pedidos.push({ key: chave, url });
      },
      start() {
        iniciados.push(pedidos.length);
      }
    },

    // Instrumentacao do teste, nao da cena real.
    _pedidos: pedidos,
    _iniciados: iniciados,
    _ouvintes: ouvintes,

    /** Dispara um evento como o Phaser faria quando o arquivo chega. */
    emitir(evento) {
      for (const fn of ouvintes.get(evento) ?? []) fn();
    },

    /** Marca uma textura como carregada, como o `textures.exists` passaria a ver. */
    terTextura(chave) {
      existentes.add(chave);
    }
  };
}

const arteDe = (biomaId) => [getBackdropKey(biomaId), getEntranceKey(biomaId)];

test('todo bioma tem fundo e entrada registrados', () => {
  for (const id of BIOMAS) {
    assert.ok(BACKDROP_KEYS[id], `${id} sem chave de fundo`);
    assert.ok(ENTRANCES[id], `${id} sem entrada`);
    assert.equal(getBackdropKey(id), BACKDROP_KEYS[id]);
  }

  assert.equal(listBackdropKeys().length, BIOMAS.length, 'a lista de fundos nao bate com a de biomas');
  assert.equal(new Set(listBackdropKeys()).size, BIOMAS.length, 'dois biomas compartilham o fundo');
});

test('o bioma do boot e um bioma de verdade, e e a Mina Solar', () => {
  // A Mina Solar e o primeiro bioma, e o que a tela de titulo mostra, e o unico
  // que o `BootScene` carrega sem depender de rede. Um `BIOMA_INICIAL` que nao
  // existe faria o menu cair no placeholder de textura ausente para sempre.
  assert.ok(BIOMAS.includes(BIOMA_INICIAL), `BIOMA_INICIAL e "${BIOMA_INICIAL}", que nao e bioma`);
  assert.equal(BIOMA_INICIAL, 'sunstone');
  assert.equal(getBackdropKeyForCave(1), getBackdropKey('sunstone'));
  // Cave 7 ainda e Mina Solar: a faixa vai de 1 a 10. A Gruta de Gelo abre na 11.
  assert.equal(getBackdropKeyForCave(7), getBackdropKey('sunstone'));
  assert.equal(getBackdropKeyForCave(11), getBackdropKey('frost'));
});

test('bioma sem registro cai no inicial, e nao quebra', () => {
  assert.equal(getBackdropKey('bioma-que-nao-existe'), getBackdropKey(BIOMA_INICIAL));
});

test('devolve verdadeiro sem pedir nada quando as duas artes ja estao', () => {
  const scene = cenaFalsa(arteDe('frost'));

  assert.equal(isBackdropReady(scene, 'frost'), true);
  assert.equal(ensureBackdrop(scene, 'frost', () => {}), true);
  assert.equal(scene._pedidos.length, 0, 'pediu arquivo que ja estava em cache');
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
    'o pedido tem de ser o par. Pedir so o fundo deixaria a entrada aparecendo '
      + 'um quadro depois, como um pedestal que surge.'
  );
  assert.equal(scene._iniciados.length, 1, 'os dois arquivos vao no mesmo start()');
  assert.equal(avisos, 0, 'o onReady nao pode disparar antes de a arte chegar');
});

test('chamar duas vezes no mesmo bioma nao abre dois pedidos', () => {
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

test('depois que chega, o mesmo bioma nao abre outro pedido', () => {
  const scene = cenaFalsa();
  ensureBackdrop(scene, 'crystal', () => {});

  scene.terTextura(getBackdropKey('crystal'));
  scene.emitir(`filecomplete-image-${getBackdropKey('crystal')}`);

  scene.terTextura(getEntranceKey('crystal'));
  scene.emitir(`filecomplete-image-${getEntranceKey('crystal')}`);

  const antes = scene._pedidos.length;
  assert.equal(ensureBackdrop(scene, 'crystal', () => {}), true);
  assert.equal(scene._pedidos.length, antes, 'pediu de novo uma arte que ja tinha chegado');
});

test('um arquivo que falha libera o pedido, e o placeholder nao trava', () => {
  // E a rede. Sem o `loaderror`, a chave ficaria presa em "carregando" e o
  // placeholder da cor do bioma nunca mais sairia — nem se o jogador saisse e
  // voltasse ao bioma.
  const scene = cenaFalsa();
  ensureBackdrop(scene, 'wind', () => {});

  scene.emitir('loaderror');

  const antes = scene._pedidos.length;
  ensureBackdrop(scene, 'wind', () => {});
  assert.equal(
    scene._pedidos.length,
    antes + 2,
    'o bioma ficou marcado como "carregando para sempre" depois do erro: a '
      + 'nova tentativa nao abriu pedido'
  );
});

test('o pedido e por cena, e nao global', () => {
  // Duas cenas nao podem compartilhar a lista de em voo. `CaveScene` e criado e
  // destruido ao longo da sessao, e uma chave presa no conjunto de uma cena morta
  // diria para sempre que "ja esta carregando" para a cena nova.
  const a = cenaFalsa();
  const b = cenaFalsa();

  ensureBackdrop(a, 'sunstone', () => {});
  assert.equal(a._pedidos.length, 2, 'a primeira cena nao pediu fundo e entrada');
  assert.equal(b._pedidos.length, 0);

  ensureBackdrop(b, 'sunstone', () => {});
  assert.equal(b._pedidos.length, 2, 'a segunda cena herdou o pedido da primeira');
});

test('cada bioma tem as duas artes em disco, e o par tem o mesmo bioma', () => {
  // Sem o arquivo, o `ensureBackdrop` pediria um caminho que da 404, o `loaderror`
  // liberaria o pedido, e o bioma ficaria em cinza para sempre. E o bug que o
  // teste de "a chave existe" nao pega: aqui e o arquivo que importa.
  for (const id of BIOMAS) {
    for (const key of arteDe(id)) {
      assert.ok(
        existsSync(new URL(`../public/assets/${key}.png`, import.meta.url)),
        `${id}: falta ${key}.png. O pedido daria 404 e o bioma ficaria sem arte.`
      );
    }
  }
});

test('a arte do bioma e a do bioma, e nao a de outro', () => {
  // Um `switch` com `case` errado, ou um `??` que cai no primeiro bioma, daria a
  // caverna da Mina Solar dentro da Camara de Cristal — e as duas se parecem o
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

test('o bioma de uma cave e o mesmo que o do fundo daquela cave', () => {
  // `getBackdropKeyForCave` e o atalho que a cena usa quando o jogador entra numa
  // cave sem passar pela selecao de bioma. Se ele discordar do `getBiomeForCave`,
  // a tela de titulo e a partida mostram cavernas diferentes.
  for (const cave of [1, 5, 10, 11, 25, 40, 41, 55, 60]) {
    assert.equal(
      getBackdropKeyForCave(cave),
      getBackdropKey(getBiomeForCave(cave).id),
      `cave ${cave}: o atalho de fundo discorda do bioma da cave`
    );
  }
});

// --- a barreira do X verde -------------------------------------------------
//
// O X verde e a textura `__MISSING` do Phaser, e e o que `textures.get(chave)`
// devolve quando a chave nao esta na lista. Cinco dos seis biomas entravam com
// ela no lugar do fundo, sem erro no console.
//
// A barreira e `texturaEhUsavel`, no `CaveScene`: a textura devolvida precisa ter
// a MESMA chave que foi pedida. Estes testes nao podem chamar a funcao — ela nao e
// exportada, e a cena importa Phaser — entao verificam o que dá: que a cena usa a
// comparacao de chave, e nao o `exists` sozinho.

const FONTE_CAVE_SCENE = readFileSync(
  new URL('../src/game/scenes/CaveScene.js', import.meta.url),
  'utf8'
);

test('a barreira do X verde compara a chave, e nao usa exists sozinho', () => {
  // `textures.exists` e `list.hasOwnProperty(key)`: ele responde "sim" para uma
  // chave registrada e para uma arte que nunca chegou. So a identidade separa os
  // dois casos.
  assert.ok(
    FONTE_CAVE_SCENE.includes('textura.key === chave'),
    'CaveScene nao compara a chave da textura devolvida com a chave pedida. '
      + 'E isso que separa "carregou" de "o Phaser vai desenhar a __MISSING".'
  );

  assert.ok(
    FONTE_CAVE_SCENE.includes('function texturaEhUsavel('),
    'a funcao que faz a comparacao sumiu do CaveScene'
  );

  // E nenhum dos dois desenhos de arte pode voltar a confiar so no `exists`.
  //
  // A contagem olha SO codigo: as linhas de comentario comecam com `*` ou `//`, e
  // o `console.error` do aviso e um template literal, cujas continuacoes comecam
  // com `+`. Sem esse filtro, o proprio texto que explica o problema contaria
  // como uso do problema.
  const linhasDeCodigo = FONTE_CAVE_SCENE
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith('*') && !linha.startsWith('//') && !linha.startsWith('+'));

  const usosCru = linhasDeCodigo.filter((linha) => linha.includes('textures.exists(')).length;

  assert.equal(
    usosCru,
    0,
    `CaveScene chama \`textures.exists(\` em ${usosCru}x de codigo. Fora do `
      + 'console.error, que e diagnostico, nenhuma checagem de arte pode se '
      + 'basear nele.'
  );
});

test('o fundo cai para o da Mina Solar antes de cair no retangulo', () => {
  // O X verde e o pior desfecho porque e preto. A reserva e o que garante que o
  // jogador veja uma caverna enquanto a arte do bioma nao chega.
  assert.ok(
    FONTE_CAVE_SCENE.includes('getBackdropKey(BIOMA_INICIAL)'),
    'a reserva do fundo sumiu. Sem ela, uma falha de carga vira a caixa preta '
      + 'com X verde.'
  );

  assert.ok(
    FONTE_CAVE_SCENE.includes('texturaEhUsavel(this, reserva)'),
    'a reserva e calculada mas nao e usada'
  );
});

test('o aviso do fundo traz o que a cena ve, e sai uma vez por chave', () => {
  // A causa deste bug nao estava no codigo que desenhou, e sim na checagem que
  // decidiu que a arte tinha chegado. Por isso o aviso leva `exists` e `get` das
  // duas chaves: sem isso, o proximo bug parecido nao tem por onde ser entendido.
  assert.ok(
    FONTE_CAVE_SCENE.includes('this.fundoAvisado'),
    'o aviso do fundo nao e guardado por chave. Um `console.error` por quadro '
      + 'esconde a mensagem em vez de destacá-la.'
  );

  assert.ok(
    FONTE_CAVE_SCENE.includes('descreveTextura('),
    'o aviso nao descreve a textura devolvida. `get` e o que entrega a __MISSING, '
      + 'e sem isso o log nao diz nada de util.'
  );
});
