import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PILHA,
  aceitaControle,
  fechaTelaDoTopo,
  telaDoTopo,
  temTelaAberta
} from '../src/game/telas.js';

const ABERTO = (nomes) => Object.fromEntries(nomes.map((n) => [n, true]));

test('sem nada aberto, não há topo', () => {
  assert.equal(telaDoTopo({}), null);
  assert.equal(telaDoTopo(), null);
  assert.equal(temTelaAberta({}), false);
});

test('uma tela só é o topo dela mesma', () => {
  assert.equal(telaDoTopo(ABERTO(['pausa'])), 'pausa');
  assert.equal(telaDoTopo(ABERTO(['configuracoes'])), 'configuracoes');
  assert.equal(telaDoTopo(ABERTO(['final'])), 'final');
});

test('o topo vem da pilha, e não da ordem em que o objeto foi montado', () => {
  // Isto NÃO é "a última que abriu". A pilha é uma ordem fixa e explícita, e o
  // motivo é que a ordem de abertura não é informação que a tela tenha: dois
  // `setState` no mesmo quadro dão um objeto cuja ordem de chave não quer dizer
  // nada. A pilha é o que concorda entre o `Esc` e o botão voltar.
  assert.equal(telaDoTopo(ABERTO(['configuracoes', 'pausa'])), 'configuracoes');
  assert.equal(telaDoTopo(ABERTO(['pausa', 'configuracoes'])), 'configuracoes', 'a ordem das chaves decidiu');
});

test('a ordem da pilha é a ordem de empilhamento', () => {
  // Só o que acontece no jogo de verdade entra aqui. A maioria das telas se
  // exclui — a de jogos fecha a de idioma, o botão de sair da pausa fecha a de
  // idioma — então inventar combinações para "cobrir" a tabela testaria uma
  // situação que ninguém nunca vê.
  //
  // A combinação que existe é a carta do final por cima do modal da saída: o
  // `abrirFinale` abre uma enquanto fecha a outra, e a pilha diz qual ganha se
  // as duas chegarem a coexistir num mesmo quadro.
  assert.equal(telaDoTopo(ABERTO(['saida', 'final'])), 'final');
  assert.equal(telaDoTopo(ABERTO(['final', 'saida'])), 'final', 'a ordem da tabela não valou nada');
});

test('a pilha não repete nem esquece tela', () => {
  assert.equal(new Set(PILHA).size, PILHA.length, 'tela repetida na pilha');

  // Toda tela que o `App.jsx` controla tem de estar aqui, senão `Esc` e o botão
  // voltar não fecham ela. Este é o teste que importa: um modal novo nasce
  // devendo entrar nesta lista, e sem ele o `Esc` daquele modal simplesmente não
  // faria nada — e ninguém percebe até alguém com controle na mão relatar.
  for (const tela of ['final', 'saida', 'utilitaria', 'bioma', 'jogos', 'idioma', 'configuracoes', 'informacoes', 'pausa']) {
    assert.ok(PILHA.includes(tela), `${tela} não está na pilha`);
  }
});

test('fechar devolve o nome da tela que fechou', () => {
  const fechadas = [];

  const fechou = fechaTelaDoTopo(ABERTO(['pausa', 'configuracoes']), (nome) => fechadas.push(nome));

  assert.equal(fechou, 'configuracoes');
  assert.deepEqual(fechadas, ['configuracoes'], 'o fechador não foi chamado com a tela do topo');
});

test('fechar sem nada aberto não chama o fechador', () => {
  let chamadas = 0;

  const fechou = fechaTelaDoTopo({}, () => { chamadas += 1; });

  assert.equal(fechou, null);
  assert.equal(chamadas, 0, 'o fechador foi chamado sem haver tela');
});

test('fechar sem função não quebra, e ainda diz o que fecharia', () => {
  // Faltar a função é um erro do chamador, e um erro do chamador não pode virar
  // `undefined` numa exceção dentro de um listener de teclado.
  assert.equal(fechaTelaDoTopo(ABERTO(['pausa'])), 'pausa');
});

test('telas fechadas explicitamente não contam como abertas', () => {
  // O `App.jsx` passa as flags como estão; um modal montando enquanto o outro
  // desmonta entrega `false` no objeto, e ele tem de ser respeitado.
  assert.equal(telaDoTopo({ pausa: true, saida: false }), 'pausa');
  assert.equal(telaDoTopo({ pausa: undefined, saida: true }), 'saida');
});

test('toda tela da pilha aceita controle', () => {
  for (const tela of PILHA) {
    assert.equal(aceitaControle(tela), true, `${tela} não aceita foco de controle`);
  }

  assert.equal(aceitaControle(null), false);
  assert.equal(aceitaControle('inexistente'), false);
});
