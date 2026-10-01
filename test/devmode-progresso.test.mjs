import test from 'node:test';
import assert from 'node:assert/strict';

import {
  contaProgresso,
  createCollectionState,
  createImprovementState,
  createStatsState,
  registrarCaveConcluida,
  registrarReliquiaEncontrada
} from '../src/game/progression.js';

/**
 * Um save de teste não conta progresso.
 *
 * Estas regras moram em `progression.js` e não na cena, e isso é deliberado: a cena
 * é uma classe do Phaser e não sobe em Node. Com a regra aqui, ela é **executada**
 * — e o sintoma que estas três funções evitam é o pior possível, porque não é um
 * erro: é o jogo de verdade deixando de ter sentido depois de uma tarde de testes.
 *
 * O que a cena faz com o resultado é uma linha, e a linha é conferida pelo teste de
 * declarações: a cena precisa chamar estas funções, e não ter um `if` próprio.
 */

/** Um estado qualquer, com a marca que o teste está exercendo. */
function estado(dev) {
  return {
    cave: 12,
    bestCave: 12,
    collection: createCollectionState(),
    stats: createStatsState(),
    ...createImprovementState(),
    dev
  };
}

// --- a pergunta que os três consultam --------------------------------------

test('so dev true desliga a contagem', () => {
  assert.equal(contaProgresso(estado(false)), true, 'jogo normal nao conta');
  assert.equal(contaProgresso(estado(true)), false, 'save de teste contou');
});

test('estado sem a marca conta, porque e jogo normal antigo', () => {
  // Um `metaState` montado antes de o evento de entrada chegar não tem a chave. Se
  // isso contasse como teste, a primeira caverna de uma sessão nova deixaria de
  // contar — e ninguém veria nada de errado.
  assert.equal(contaProgresso({ cave: 1 }), true);
  assert.equal(contaProgresso({ dev: undefined }), true);
  assert.equal(contaProgresso({ dev: 'sim' }), true, 'uma string marks nao devia valer');
});

// --- a cave concluída ------------------------------------------------------

test('concluir uma cave avanca o bestCave e conta uma caverna', () => {
  const depois = registrarCaveConcluida(estado(false), 20);

  assert.equal(depois.bestCave, 20, 'o bestCave nao avancou');
  assert.equal(depois.stats.totalCavesCleared, 1);
});

test('concluir a mesma cave duas vezes conta uma so vez', () => {
  // Clicar na saída repetidamente contava a conclusão de novo, e o objetivo
  // Explorador podia ser farmado sem avançar. O guarda é o terceiro argumento.
  const primeira = registrarCaveConcluida(estado(false), 20, true);
  const segunda = registrarCaveConcluida(primeira, 20, false);

  assert.equal(segunda.stats.totalCavesCleared, 1, 'a mesma caverna contou duas vezes');
});

test('num save de teste, concluir uma cave nao muda nada', () => {
  const antes = estado(true);
  const depois = registrarCaveConcluida(antes, 60);

  assert.equal(depois.bestCave, 12, `o bestCave foi para ${depois.bestCave} numa passada de teste`);
  assert.equal(depois.stats.totalCavesCleared, 0, 'o contador de cavernas andou em modo de teste');
});

test('num save de teste, o estado volta identico, e nao quase igual', () => {
  // "Quase igual" deixaria a porta aberta para alguém normalizar o estado antes de
  // comparar, e o teste passaria com um save de teste meio alterado.
  const antes = estado(true);
  const depois = registrarCaveConcluida(antes, 60);

  assert.deepEqual(depois, antes, 'o save de teste voltou diferente depois de concluir uma cave');
});

test('o bestCave nunca anda para tras, mesmo em jogo normal', () => {
  const longe = registrarCaveConcluida(estado(false), 40);
  const volta = registrarCaveConcluida(longe, 5);

  assert.equal(volta.bestCave, 40, 'o bestCave voltou para tras');
});

test('dezenas de caves de teste nao movem o bestCave', () => {
  // Um teste só com uma passagem provaria pouco. O modo desenvolvedor existe para
  // passar por todas as cavernas em minutos.
  let atual = estado(true);

  for (let cave = 1; cave <= 60; cave += 1) {
    atual = registrarCaveConcluida(atual, cave);
  }

  assert.equal(atual.bestCave, 12, `depois de 60 caves de teste o bestCave ficou ${atual.bestCave}`);
  assert.equal(atual.stats.totalCavesCleared, 0);
});

// --- a relíquia ------------------------------------------------------------

test('achar uma reliquia soma na colecao e no contador', () => {
  const depois = registrarReliquiaEncontrada(estado(false), 'amber_fang');

  assert.equal(depois.collection.amber_fang, 1);
  assert.equal(depois.stats.totalRelicsFound, 1);
  assert.equal(depois.lastRelicFound, 'amber_fang');
});

test('achar a mesma reliquia de novo soma duas vezes', () => {
  const uma = registrarReliquiaEncontrada(estado(false), 'amber_fang');
  const duas = registrarReliquiaEncontrada(uma, 'amber_fang');

  assert.equal(duas.collection.amber_fang, 2);
  assert.equal(duas.stats.totalRelicsFound, 2);
});

test('achar uma reliquia em modo de teste nao conta, mas ela aparece', () => {
  const depois = registrarReliquiaEncontrada(estado(true), 'prism_core');

  // Aparece: é o efeito visual que o modo de teste serve para ver.
  assert.equal(depois.lastRelicFound, 'prism_core', 'a reliquia some do HUD em modo de teste');

  // E não conta.
  assert.equal(depois.collection.prism_core, 0, 'a reliquia entrou na colecao de um save de teste');
  assert.equal(depois.stats.totalRelicsFound, 0, 'a reliquia foi contada num save de teste');
});

test('as seis reliquias em modo de teste nao mudam a colecao', () => {
  // A coleção completa é a recompensa de um jogo inteiro. Ganhar as seis numa tarde
  // de teste é o dano exato que o modo precisa evitar.
  let atual = estado(true);
  const reliquias = ['amber_fang', 'frost_bloom', 'ember_core', 'ruin_tablet', 'gust_shell', 'prism_core'];

  for (const id of reliquias) {
    atual = registrarReliquiaEncontrada(atual, id);
  }

  assert.equal(
    Object.values(atual.collection).reduce((a, b) => a + b, 0),
    0,
    'a colecao de um save de teste não está zerada'
  );
  assert.equal(atual.stats.totalRelicsFound, 0);
});

test('a reliquia conta em jogo normal depois de um save de teste', () => {
  // A marca não pode "grudar" no estado. Alguém que copia um estado de teste para
  // um normal continuaria com a marca, e o jogo normal deixaria de contar.
  const deTeste = registrarReliquiaEncontrada(estado(true), 'amber_fang');
  const normal = { ...deTeste, dev: false };
  const depois = registrarReliquiaEncontrada(normal, 'amber_fang');

  assert.equal(depois.collection.amber_fang, 1, 'o jogo normal nao contou apos um save de teste');
});

// --- o que a cena faz com o resultado ---------------------------------------

test('as duas regras devolvem um estado novo, e nao mutam o recebido', () => {
  // A cena faz `this.metaState = regra(this.metaState, ...)`. Se a regra mutasse o
  // objeto, o estado antigo mudaria junto — e um `undo` seria impossível.
  const antes = estado(false);
  const copia = structuredClone(antes);

  registrarCaveConcluida(antes, 30);
  registrarReliquiaEncontrada(antes, 'amber_fang');

  assert.deepEqual(antes, copia, 'uma das regras mutou o estado que recebeu');
});
