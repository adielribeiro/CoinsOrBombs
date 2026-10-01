import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * A cena usa as regras, e não as reescreve.
 *
 * A regra em si é testada **executando** — em `devmode-progresso.test.mjs`. O que
 * sobra aqui é uma coisa que nenhum teste de lógica pega: a cena pode ter a regra
 * certa ao lado e um `if (!this.metaState.dev)` da sua volta, que conta do jeito
 * antigo. Aí o `profile` para de ser gravado, a cave não conta, e o teste de
 * execução continua verde.
 *
 * Por isso este arquivo existe, e por isso ele é pequeno. Ele não descreve
 * comportamento: ele confere que as regras vivem num lugar só e que ninguém
 * escreveu uma segunda versão delas dentro da cena.
 */

const CENA = fileURLToPath(new URL('../src/game/scenes/CaveScene.js', import.meta.url));
const fonte = await readFile(CENA, 'utf8');

test('a cena delega a contagem de cave concluida', () => {
  assert.match(
    fonte,
    /this\.metaState\s*=\s*registrarCaveConcluida\(\s*this\.metaState,\s*resolvedCave,\s*firstTimeClear\s*\)/,
    'a cena não está chamando registrarCaveConcluida'
  );
});

test('a cena delega a contagem de reliquia', () => {
  assert.match(
    fonte,
    /this\.metaState\s*=\s*registrarReliquiaEncontrada\(\s*this\.metaState,\s*relic\.id\s*\)/,
    'a cena não está chamando registrarReliquiaEncontrada'
  );
});

test('a cena nao tem uma segunda versao da regra', () => {
  // Um `if (!this.metaState.dev)` dentro da cena é exatamente o `if` que estes
  // testes substituem. Se ele voltar, uma das duas contas passa a decidir sozinha
  // e a regra tem duas donas.
  const guardas = fonte.match(/if\s*\(!this\.metaState\.dev\)/g) ?? [];

  assert.equal(
    guardas.length,
    0,
    `a cena tem ${guardas.length} guarda(s) de save de teste escrita à mão. `
      + 'A regra mora em registrarCaveConcluida e registrarReliquiaEncontrada.'
  );
});

test('a cena nao mexe mais em bestCave nem no contador de cavernas', () => {
  // As mesmas duas contas, escritas de novo dentro da cena, dariam o mesmo número
  // e a mesma decisão — até o dia em que um dos dois mudasse. A prohibition é mais
  // barata que um teste que compara os dois valores.
  for (const proibido of [
    /this\.metaState\.bestCave\s*=\s*Math\.max/,
    /totalCavesCleared:\s*\(\s*this\.metaState\.stats/,
    /totalRelicsFound:\s*\(\s*this\.metaState\.stats/,
    /\[relic\.id\]:\s*\(\s*this\.metaState\.collection/
  ]) {
    assert.doesNotMatch(
      fonte,
      proibido,
      `a cena escreveu uma conta de progresso por conta própria: ${proibido}`
    );
  }
});

test('o estado padrao da cena e jogo normal, e nao save de teste', () => {
  // `contaProgresso` só desliga com `true`. Um `metaState` que nascesse com a chave
  // já ligada faria a cena parar de contar no jogo de verdade — e nada apareceria.
  assert.match(
    fonte,
    /dev:\s*false,/,
    'o estado inicial da cena não marca dev: false, e contaProgresso pode ler undefined'
  );
});
