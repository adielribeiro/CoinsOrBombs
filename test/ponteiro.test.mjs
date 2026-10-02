import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SENSIBILIDADES,
  SENSIBILIDADE_PADRAO,
  VELOCIDADE_MAXIMA_PX_S,
  deslocamentoDoPonteiro,
  limitarPonteiro,
  moveu,
  porcentagemDaSensibilidade,
  proximaSensibilidade
} from '../src/game/ponteiro.js';

/**
 * O ponteiro dos menus.
 *
 * ## O que estes testes seguram
 *
 * 1. **A velocidade não depende do quadro.** Separar `dt` de pixels é o que mantém
 *    o ponteiro na mesma velocidade num monitor de 60Hz e de 144Hz. Um teste que
 *    compara "deslocou X pixels" num `dt` fixo não pegaria a soma por quadro — a
 *    soma por quadro dá a mesma resposta nesse `dt`.
 *
 * 2. **O ponteiro não foge da tela.** Uma posição fora da janela não volta sozinha:
 *    quem empurrou para o canto ficaria sem cursor até soltar o analógico.
 *
 * 3. **A sensibilidade é um número da lista, e não uma aritmética.** Deixar o menu
 *    somar `+0.25` produziria valores que ele não sabe mostrar de volta.
 */

const JANELA = { largura: 1000, altura: 800 };

// --- o deslocamento --------------------------------------------------------

test('com o analógico no fim do curso, a velocidade é a máxima', () => {
  const d = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, SENSIBILIDADE_PADRAO);

  assert.equal(d.x, VELOCIDADE_MAXIMA_PX_S);
  assert.equal(d.y, 0);
});

test('um segundo de deslocamento é o mesmo a 60 e a 6 quadros por segundo', () => {
  // O deslocamento de UM quadro é menor num quadro menor — isso é o certo. O que
  // não pode mudar é a soma de um segundo inteiro, que é o que a pessoa sente.
  // Somar pixels por quadro passaria nesta comparação de quadro único e falharia
  // nesta.
  const umSegundo = (quadrosPorSegundo) => {
    let total = 0;

    for (let i = 0; i < quadrosPorSegundo; i += 1) {
      total += deslocamentoDoPonteiro({ x: 1, y: 0 }, 1 / quadrosPorSegundo, 1).x;
    }

    return total;
  };

  // Com tolerância, e não com igualdade: somar 144 frações de 1/144 dá
  // 1200,0000000000002, e reprovar por isso seria reprovar o número certo.
  const perto = (obtido) =>
    assert.ok(
      Math.abs(obtido - VELOCIDADE_MAXIMA_PX_S) < 0.001,
      `somou ${obtido}px em um segundo e o esperado é ${VELOCIDADE_MAXIMA_PX_S}`
    );

  perto(umSegundo(30));
  perto(umSegundo(60));
  perto(umSegundo(144));
  perto(umSegundo(6), 'a velocidade mudou com o tamanho do quadro');
});

test('um empurrão leve anda bem devagar, que é onde fica a precisão', () => {
  // Com um quarto do curso, um quarto da velocidade: é o que permite parar o
  // ponteiro em cima de um botão pequeno.
  const leve = deslocamentoDoPonteiro({ x: 0.25, y: 0 }, 1, 1);

  assert.ok(leve.x > 0, 'empurrão leve não moveu nada');
  assert.ok(leve.x < VELOCIDADE_MAXIMA_PX_S / 3, `empurrão leve andou ${leve.x}px em 1s`);
});

test('a sensibilidade multiplica a velocidade, e o padrão não multiplica nada', () => {
  const base = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, 1);
  const triplo = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, 3);
  const suave = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, 0.25);

  assert.equal(triplo.x, base.x * 3);
  assert.equal(suave.x, base.x / 4);
});

test('sem tempo, sem deslocamento — e sem sentido nenhum virando pixel', () => {
  for (const dt of [0, -1, Number.NaN, undefined]) {
    assert.deepEqual(
      deslocamentoDoPonteiro({ x: 1, y: 1 }, dt, 1),
      { x: 0, y: 0 },
      `dt=${String(dt)} andou`
    );
  }

  for (const eixo of [null, undefined, {}, { x: 0, y: 0 }]) {
    assert.deepEqual(deslocamentoDoPonteiro(eixo, 1, 1), { x: 0, y: 0 });
  }
});

test('sensibilidade impossível não vira velocidade infinita', () => {
  // O valor vem do `localStorage`, que é editável. Um `NaI` aqui viraria
  // deslocamento `NaN` e o ponteiro sumiria sem erro no console.
  for (const sensibilidade of [Number.NaN, undefined, 'rápido']) {
    const d = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, sensibilidade);

    assert.equal(d.x, VELOCIDADE_MAXIMA_PX_S, `sensibilidade ${String(sensibilidade)}`);
  }
});

// --- a borda da tela -------------------------------------------------------

test('o ponteiro não sai da janela, por nenhum lado', () => {
  const inicio = { x: 500, y: 400 };

  const longeParaCimaEsquerda = limitarPonteiro(inicio, { x: -9999, y: -9999 }, JANELA);
  assert.deepEqual(longeParaCimaEsquerda, { x: 0, y: 0 });

  const longeParaBaixoDireita = limitarPonteiro(inicio, { x: 9999, y: 9999 }, JANELA);
  assert.deepEqual(longeParaBaixoDireita, { x: 1000, y: 800 });

  // E um empurrão pequeno perto da borda é só cortado, não ignorado.
  const perto = limitarPonteiro({ x: 995, y: 795 }, { x: 40, y: 40 }, JANELA);
  assert.deepEqual(perto, { x: 1000, y: 800 });
});

test('a margem guarda a ponta da seta, e não a base', () => {
  // O desenho da seta aponta para o alto e à esquerda: com a ponta colada em zero,
  // o ponteiro ficaria com o corpo para fora da tela.
  const comMargem = limitarPonteiro({ x: 10, y: 10 }, { x: -50, y: -50 }, JANELA, 8);

  assert.deepEqual(comMargem, { x: 8, y: 8 });
  assert.deepEqual(limitarPonteiro({ x: 10, y: 10 }, { x: -50, y: -50 }, JANELA), { x: 0, y: 0 });
});

test('uma janela sem tamanho não prende o ponteiro no canto', () => {
  // `innerWidth` vale 0 nos quadros em que o layout ainda não existe. Limitar por
  // zero prenderia o ponteiro no canto, e de lá ele só sairia se a pessoa o
  // levasse de volta — que é o pior jeito de sumir.
  const semTamanho = limitarPonteiro({ x: 500, y: 400 }, { x: 100, y: 100 }, { largura: 0, altura: 0 });

  assert.deepEqual(semTamanho, { x: 600, y: 500 });
  assert.deepEqual(limitarPonteiro({ x: 1, y: 1 }, null, null), { x: 1, y: 1 });
  assert.deepEqual(limitarPonteiro({ x: 1, y: 1 }, { x: 5, y: 5 }, undefined), { x: 6, y: 6 });
});

// --- a sensibilidade -------------------------------------------------------

test('os botões andam pela lista e param nas pontas', () => {
  assert.equal(proximaSensibilidade(1, 1), 1.5);
  assert.equal(proximaSensibilidade(1, -1), 0.75);
  assert.equal(proximaSensibilidade(3, 1), 3, 'aumentar no máximo passou do máximo');
  assert.equal(proximaSensibilidade(0.25, -1), 0.25, 'diminuir no mínimo passou do mínimo');
});

test('a lista nunca produz um valor fora dela', () => {
  // Bater na ponta é o que impede o estado de guardar um `1.25` que o menu não
  // sabe mostrar de volta.
  let valor = SENSIBILIDADE_PADRAO;

  for (let i = 0; i < 20; i += 1) valor = proximaSensibilidade(valor, 1);
  assert.equal(valor, SENSIBILIDADES[SENSIBILIDADES.length - 1]);

  for (let i = 0; i < 20; i += 1) valor = proximaSensibilidade(valor, -1);
  assert.equal(valor, SENSIBILIDADES[0]);
});

test('toda sensibilidadevizinha é da lista', () => {
  for (const valor of SENSIBILIDADES) {
    assert.ok(SENSIBILIDADES.includes(proximaSensibilidade(valor, 1)), `${valor} para cima`);
    assert.ok(SENSIBILIDADES.includes(proximaSensibilidade(valor, -1)), `${valor} para baixo`);
  }
});

test('sensibilidade fora da lista entra pelo valor mais próximo do padrão', () => {
  // Storage editado à mão, ou um padrão antigo: nenhum dos dois pode deixar o
  // menu sem botão nenhum.
  assert.ok(SENSIBILIDADES.includes(proximaSensibilidade(1.37, 1)));
  assert.ok(SENSIBILIDADES.includes(proximaSensibilidade(-9, 1)));
  assert.ok(SENSIBILIDADES.includes(proximaSensibilidade(Number.NaN, -1)));
});

test('a porcentagem mostrada é o número que o menu espera', () => {
  assert.equal(porcentagemDaSensibilidade(1), 100);
  assert.equal(porcentagemDaSensibilidade(0.25), 25);
  assert.equal(porcentagemDaSensibilidade(3), 300);
  assert.equal(porcentagemDaSensibilidade(Number.NaN), 100);
});

// --- a deflexão ------------------------------------------------------------

test('moveu distingue deflection de parado', () => {
  assert.equal(moveu({ x: 0.3, y: 0 }), true);
  assert.equal(moveu({ x: 0, y: -0.9 }), true);
  assert.equal(moveu({ x: 0, y: 0 }), false);
  assert.equal(moveu(null), false);
  assert.equal(moveu({}), false);
});