import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SENSIBILIDADES,
  SENSIBILIDADE_PADRAO,
  VELOCIDADES,
  VELOCIDADE_MAXIMA_PX_S,
  VELOCIDADE_PADRAO,
  deslocamentoDoPonteiro,
  indiceDaLista,
  limitarPonteiro,
  moveu,
  porcentagemDaSensibilidade,
  porcentagemDaVelocidade,
  proximaSensibilidade,
  proximaVelocidade,
  valorDaLista
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
  const d = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, {
    sensibilidade: SENSIBILIDADE_PADRAO,
    velocidade: VELOCIDADE_PADRAO
  });

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
      total += deslocamentoDoPonteiro({ x: 1, y: 0 }, 1 / quadrosPorSegundo, {
        sensibilidade: 1,
        velocidade: 1
      }).x;
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

test('o curso inteiro não atravessa a tela em menos de um segundo', () => {
  // A primeira versão andava 1200 px por segundo, e uma tela de 1000px de altura
  // era atravessada em menos de um segundo: entre dois botões vizinhos já passava
  // um quarto de tela, e parar em cima de um alvo exigia acertar o empurrão no meio
  // do curso. A velocidade virou metade por isso, e este teste é o que impede que
  // ela volte sozinha.
  assert.ok(
    VELOCIDADE_MAXIMA_PX_S <= 700,
    `a velocidade máxima subiu para ${VELOCIDADE_MAXIMA_PX_S} px/s e o ponteiro ficou rápido de novo`
  );
});

test('a sensibilidade multiplica a resposta, e o padrão não multiplica nada', () => {
  // O empurrão é pequeno de propósito. No fim do curso o teto de velocidade corta
  // a diferença — que é o que a velocidade promete — e um teste no curso cheio
  // diria que a sensibilidade não faz nada, o que é falso: ela muda a resposta
  // embaixo.
  const suave = deslocamentoDoPonteiro({ x: 0.4, y: 0 }, 1, { sensibilidade: 1, velocidade: 2 });
  const triplo = deslocamentoDoPonteiro({ x: 0.4, y: 0 }, 1, { sensibilidade: 3, velocidade: 2 });
  const fraco = deslocamentoDoPonteiro({ x: 0.4, y: 0 }, 1, { sensibilidade: 0.25, velocidade: 2 });

  assert.equal(triplo.x, suave.x * 3);
  assert.equal(fraco.x, suave.x / 4);
});

test('sem tempo, sem deslocamento — e sem sentido nenhum virando pixel', () => {
  for (const dt of [0, -1, Number.NaN, undefined]) {
    assert.deepEqual(
      deslocamentoDoPonteiro({ x: 1, y: 1 }, dt, { sensibilidade: 1, velocidade: 1 }),
      { x: 0, y: 0 },
      `dt=${String(dt)} andou`
    );
  }

  for (const eixo of [null, undefined, {}, { x: 0, y: 0 }]) {
    assert.deepEqual(
      deslocamentoDoPonteiro(eixo, 1, { sensibilidade: 1, velocidade: 1 }),
      { x: 0, y: 0 }
    );
  }
});

test('sensibilidade impossível não vira velocidade infinita', () => {
  // O valor vem do `localStorage`, que é editável. Um `NaN` aqui viraria
  // deslocamento `NaN` e o ponteiro sumiria sem erro no console.
  for (const sensibilidade of [Number.NaN, undefined, 'rápido']) {
    const d = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, {
      sensibilidade,
      velocidade: 1
    });

    assert.equal(d.x, VELOCIDADE_MAXIMA_PX_S, `sensibilidade ${String(sensibilidade)}`);
  }
});

test('velocidade impossível não vira deslocamento infinito', () => {
  for (const velocidade of [Number.NaN, undefined, 'devagar']) {
    const d = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, {
      sensibilidade: 1,
      velocidade
    });

    assert.equal(d.x, VELOCIDADE_MAXIMA_PX_S, `velocidade ${String(velocidade)}`);
  }
});

// --- a separação entre sensibilidade e velocidade ---------------------------

test('a velocidade é o teto, e a sensibilidade não sobe acima dele', () => {
  // A conta é `resposta = empurrao * base * sensibilidade`, cortada por
  // `teto = base * velocidade`. Com a sensibilidade no máximo e a velocidade no
  // mínimo, a resposta no fim do curso é o teto — e é isso que impede a
  // sensibilidade de voltar a ser o botão de "atravessar a tela depressa".
  const devagar = deslocamentoDoPonteiro({ x: 1, y: 0 }, 1, { sensibilidade: 3, velocidade: 0.5 });

  assert.equal(devagar.x, VELOCIDADE_MAXIMA_PX_S * 0.5, 'a sensibilidade furou o teto');
});

test('a sensibilidade mexe embaixo e a velocidade mexe em cima, e uma não é a outra', () => {
  // Esta é a propriedade que faz os dois controles valerem a pena: cada um tem seu
  // próprio território. Se os dois mexessem na mesma faixa, seriam um controle só
  // escrito de dois jeitos.
  const empurraoPequeno = 0.2;

  const soSensibilidade = deslocamentoDoPonteiro({ x: empurraoPequeno, y: 0 }, 1, {
    sensibilidade: 0.25,
    velocidade: 1
  });
  const soVelocidade = deslocamentoDoPonteiro({ x: empurraoPequeno, y: 0 }, 1, {
    sensibilidade: 1,
    velocidade: 0.5
  });

  // Empurrao pequeno, o teto não encosta: a sensibilidade é quem manda, e ela
  // muda a resposta.
  assert.notEqual(soSensibilidade.x, soVelocidade.x, 'no empurrão pequeno os dois deram o mesmo');

  // E a resposta com sensibilidade no padrão tem de ser a mesma de antes, quando
  // não existia teto: `0.2 * base`.
  const noPadrao = deslocamentoDoPonteiro({ x: empurraoPequeno, y: 0 }, 1, {
    sensibilidade: 1,
    velocidade: 1
  });

  assert.ok(
    Math.abs(noPadrao.x - empurraoPequeno * VELOCIDADE_MAXIMA_PX_S) < 1e-9,
    `com o padrão a resposta mudou: ${noPadrao.x}`
  );
});

test('o teto não corta a direção do empurrão', () => {
  // Aplicar o teto escalando o vetor inteiro zeraria a seta no empurrão fraco — que
  // é justamente onde a mira fina vive. A solução normaliza pela resposta e
  // reaplica o total, e este teste é o que impede alguém de trocar por um
  // `escalar` mais simples.
  const suave = deslocamentoDoPonteiro({ x: 0.1, y: 0.1 }, 1, { sensibilidade: 1, velocidade: 2 });

  assert.ok(suave.x > 0, 'a seta zerou no empurrão fraco');
  assert.ok(suave.y > 0, 'a seta zerou no empurrão fraco');

  // E a razão entre os eixos continua sendo a mesma do empurrão.
  assert.ok(
    Math.abs(suave.x / suave.y - 1) < 1e-9,
    `o teto entortou a direção: ${suave.x} por ${suave.y}`
  );
});

// --- a lista e a barra -----------------------------------------------------

test('a barra mostra o índice, e o índice volta a ser o valor', () => {
  // A barra é um `input[type=range]`, que trabalha com números, e a lista é a
  // fonte da verdade. Sem esta ida e volta, a lâmina ficaria numa casa que não
  // existe e o `onChange` gravaria `undefined` no estado.
  for (const [indice, valor] of SENSIBILIDADES.entries()) {
    assert.equal(indiceDaLista(valor, SENSIBILIDADES), indice, `valor ${valor}`);
    assert.equal(SENSIBILIDADES[indiceDaLista(valor, SENSIBILIDADES)], valor);
  }

  for (const [indice, valor] of VELOCIDADES.entries()) {
    assert.equal(indiceDaLista(valor, VELOCIDADES), indice, `valor ${valor}`);
  }
});

test('valor fora da lista entra pelo mais próximo, e não pelo começo', () => {
  // Cair no índice 0 é o pior desfecho: 0 é o valor mais lento das duas listas, e
  // quem tinha escolhido "rápido" acordaria com a barra no mínimo sem ter tocado
  // em nada.
  const indiceDoMeio = indiceDaLista(1.4, SENSIBILIDADES);

  assert.ok(indiceDoMeio > 0, `caiu no começo da lista (índice ${indiceDoMeio})`);
  assert.equal(SENSIBILIDADES[indiceDoMeio], 1.5, 'não foi para o valor mais próximo');

  const acima = indiceDaLista(99, VELOCIDADES);

  assert.equal(acima, VELOCIDADES.length - 1, 'acima do fim não foi para o fim');

  const abaixo = indiceDaLista(-99, SENSIBILIDADES);

  assert.equal(abaixo, 0, 'abaixo do começo não foi para o começo');
});

test('a barra nunca fica sem posição', () => {
  // Um `range` sem `value` é um campo morto na tela, e a pessoa não tem como
  // saber que ele existe.
  for (const valor of [undefined, null, Number.NaN, 'rápido', {}, -1]) {
    for (const lista of [SENSIBILIDADES, VELOCIDADES]) {
      const indice = indiceDaLista(valor, lista);

      assert.ok(Number.isInteger(indice), `valor ${String(valor)} deu índice ${indice}`);
      assert.ok(indice >= 0 && indice < lista.length, `valor ${String(valor)} deu índice ${indice}`);
      assert.equal(lista[indice], valorDaLista(valor, lista, 1), 'a lista e a barra discordam');
    }
  }
});

test('a velocidade anda pelos mesmos degraus da sensibilidade', () => {
  // Os dois controles compartilham a mesma forma de lista, e é o que garante que
  // andar um passo na barra e apertar o d-pad deem o mesmo resultado.
  // A velocidade tem os mesmos degraus, e a lista é outra: o passo acima de 100%
  // é 150%, não 200%, porque `1.25` não existe nela.
  assert.equal(proximaVelocidade(VELOCIDADE_PADRAO, 1), 1.5);
  assert.equal(proximaVelocidade(VELOCIDADE_PADRAO, -1), 0.75);
  assert.equal(proximaSensibilidade(SENSIBILIDADE_PADRAO, 1), 1.5);
  assert.equal(proximaSensibilidade(SENSIBILIDADE_PADRAO, -1), 0.75);

  // E o fim da lista é o fim, dos dois lados.
  assert.equal(proximaVelocidade(VELOCIDADES[0], -1), VELOCIDADES[0]);
  assert.equal(proximaSensibilidade(SENSIBILIDADES[0], -1), SENSIBILIDADES[0]);
});

test('a velocidade mostra porcentagem, e o padrão é 100%', () => {
  assert.equal(porcentagemDaVelocidade(VELOCIDADE_PADRAO), 100);
  assert.equal(porcentagemDaSensibilidade(SENSIBILIDADE_PADRAO), 100);
  assert.equal(porcentagemDaVelocidade(VELOCIDADES[0]), 50);
  assert.equal(porcentagemDaVelocidade(Number.NaN), 100);
  assert.equal(porcentagemDaSensibilidade('rápido'), 100);
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