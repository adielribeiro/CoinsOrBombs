import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOTAO,
  ZONA_MORTA,
  aplicarZonaMorta,
  criarLeitorDeControle,
  direcoesDoQuadro,
  lerQuadro
} from '../src/game/gamepad.js';

/**
 * Um controle falso.
 *
 * A forma é a do Gamepad API: `buttons` com `pressed` e `value`, `axes` com dois
 * números. Montar uma fake em vez de mockear `lerQuadro` é o que garante que o
 * teste exercite o caminho que o navegador usa.
 */
function controle({ botoes = [], axes = [0, 0], connected = true, id = 'Xbox Controller' } = {}) {
  const apertados = new Set(botoes);

  return {
    id,
    index: 0,
    connected,
    mapping: 'standard',
    axes,
    buttons: Object.fromEntries(
      Object.entries(BOTAO).map(([acao, indice]) => [
        indice,
        { pressed: apertados.has(acao), touched: apertados.has(acao), value: apertados.has(acao) ? 1 : 0 }
      ])
    )
  };
}

// --- zona morta ------------------------------------------------------------

test('dentro da zona morta, o eixo vira zero', () => {
  // O caso que motiva a zona: analógico com folga mecânica, centro mal
  // centrado. Sem zona morta a seleção anda sozinha na tela de título.
  assert.deepEqual(aplicarZonaMorta(0.05, 0.04), { x: 0, y: 0 });
  assert.deepEqual(aplicarZonaMorta(-0.1, 0.08), { x: 0, y: 0 });
  assert.deepEqual(aplicarZonaMorta(0, 0), { x: 0, y: 0 });
});

test('fora da zona morta, o eixo é normalizado para comprimento 1', () => {
  // Sem normalizar, uma leitura a 30% e outra a 90% dariam velocidades de
  // navegação diferentes, e a pessoa sente sem saber nomear.
  const fraco = aplicarZonaMorta(0.3, 0);
  const forte = aplicarZonaMorta(0.9, 0);

  assert.ok(Math.abs(Math.hypot(fraco.x, fraco.y) - 1) < 1e-9, 'o eixo fraco não foi normalizado');
  assert.ok(Math.abs(Math.hypot(forte.x, forte.y) - 1) < 1e-9, 'o eixo forte não foi normalizado');
  assert.equal(fraco.x, forte.x, 'a direção mudou com a força do analógico');
});

test('a zona morta preserva a direção em diagonal', () => {
  const { x, y } = aplicarZonaMorta(0.5, 0.5);

  assert.ok(x > 0 && y > 0, 'a diagonal perdeu o sinal');
  assert.ok(Math.abs(x - y) < 1e-9, 'a diagonal 45 graus saiu torta');
  assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-9);
});

test('uma leitura estragada não derruba o eixo', () => {
  // Um controle desconectando no meio do quadro devolve `undefined`, e um `NaN`
  // aqui viraria "nunca mais sai da posição" em vez de "parou".
  assert.deepEqual(aplicarZonaMorta(undefined, undefined), { x: 0, y: 0 });
  assert.deepEqual(aplicarZonaMorta(NaN, 0), { x: 0, y: 0 });
  assert.deepEqual(aplicarZonaMorta(0, Infinity), { x: 0, y: 0 });
});

test('a zona morta é configurável e o padrão é o exportado', () => {
  assert.deepEqual(aplicarZonaMorta(0.3, 0, 0.5), { x: 0, y: 0 }, '0,3 está dentro de uma zona de 0,5');
  assert.notDeepEqual(aplicarZonaMorta(0.3, 0, ZONA_MORTA), { x: 0, y: 0 });
});

// --- direções --------------------------------------------------------------

test('o analógico vira as quatro direções', () => {
  const para = (eixo) => lerQuadro({ pads: [controle({ axes: eixo })] }).direcoes;

  assert.equal(para([0, -1]).dominante, 'cima');
  assert.equal(para([1, 0]).dominante, 'direita');
  assert.equal(para([0, 1]).dominante, 'baixo');
  assert.equal(para([-1, 0]).dominante, 'esquerda');

  // Uma direção por vez, sempre. É o que impede um menu de andar na diagonal.
  for (const eixo of [[0, -1], [1, 0], [0, 1], [-1, 0], [0.4, -0.4]]) {
    const marcadas = Object.entries(para(eixo)).filter(([chave, valor]) => chave !== 'dominante' && valor);
    assert.equal(marcadas.length, 1, `o eixo ${JSON.stringify(eixo)} marcou ${marcadas.length} direções`);
  }
});

test('o d-pad funciona igual ao analógico', () => {
  const { direcoes } = lerQuadro({ pads: [controle({ botoes: ['dpadDireita'] })] });

  assert.equal(direcoes.direita, true);
  assert.equal(direcoes.esquerda, false);
});

test('a diagonal resolve para uma direção só, e o empate vai para o horizontal', () => {
  // A 45 graus exatos os dois componentes empatam depois da normalização. O que
  // decide é o empate para o horizontal, e ele é uma escolha — resolver por ordem
  // de iteração faria a prioridade depender de um `for` que muda de arquivo.
  const diagonal = lerQuadro({ pads: [controle({ axes: [0.4, -0.4] })] });
  assert.equal(diagonal.direcoes.dominante, 'direita', 'a diagonal não foi desempatada');
  assert.equal(diagonal.direcoes.cima, false, 'a diagonal ficou com duas direções de menu');

  const diagonalOposta = lerQuadro({ pads: [controle({ axes: [-0.4, -0.4] })] });
  assert.equal(diagonalOposta.direcoes.dominante, 'esquerda');

  const maisParaCima = lerQuadro({ pads: [controle({ axes: [0.2, -0.98] })] });
  assert.equal(maisParaCima.direcoes.dominante, 'cima', 'um empurrão claramente vertical virou horizontal');

  const maisParaLado = lerQuadro({ pads: [controle({ axes: [0.98, -0.2] })] });
  assert.equal(maisParaLado.direcoes.dominante, 'direita');
});

test('a direção dominante é null quando o analógico está parado', () => {
  assert.equal(lerQuadro({ pads: [controle({ axes: [0, 0] })] }).direcoes.dominante, null);
  assert.equal(lerQuadro({ pads: [controle({ axes: [0.05, 0.05] })] }).direcoes.dominante, null);
  assert.equal(lerQuadro({ pads: [] }).direcoes.dominante, null);
});

test('o d-pad não tem diagonal para desempatar', () => {
  const { direcoes } = lerQuadro({ pads: [controle({ botoes: ['dpadCima'] })] });

  assert.equal(direcoes.cima, true);
  assert.equal(direcoes.dominante, 'cima');
});

test('sem controle, nenhuma direção', () => {
  const { direcoes, conectado } = lerQuadro({ pads: [] });

  assert.equal(conectado, false);
  assert.deepEqual(direcoes, { cima: false, baixo: false, esquerda: false, direita: false, dominante: null });
});

test('um controle desconectado no meio da lista não conta', () => {
  // `getGamepads` devolve `null` nos buracos, e o índice do controle pode mudar.
  const pads = [null, controle({ connected: false, botoes: ['confirmar'] }), null];

  const { conectado, bordas } = lerQuadro({ pads });

  assert.equal(conectado, false, 'um controle desconectado foi lido como conectado');
  assert.deepEqual(bordas, {}, 'um controle desconectado gerou borda');
});

// --- bordas ----------------------------------------------------------------

test('uma borda é "acabou de apertar", não "está apertado"', () => {
  // A razão de existir do módulo. Segurar o botão por vários quadros não pode
  // virar vários comandos.
  const primeiro = lerQuadro({ pads: [controle({ botoes: ['confirmar'] })], anterior: null });
  assert.equal(primeiro.bordas.confirmar, true, 'a primeira leitura não foi borda');

  const segundo = lerQuadro({ pads: [controle({ botoes: ['confirmar'] })], anterior: primeiro });
  assert.equal(segundo.bordas.confirmar, undefined, 'segurar virou outro comando');
  assert.equal(segundo.botoes.confirmar, true, 'o botão solto deixou de estar lido');
});

test('soltar e apertar de novo dá outra borda', () => {
  const apertado = lerQuadro({ pads: [controle({ botoes: ['voltar'] })], anterior: null });
  const solto = lerQuadro({ pads: [controle({})], anterior: apertado });
  const deNovo = lerQuadro({ pads: [controle({ botoes: ['voltar'] })], anterior: solto });

  assert.equal(apertado.bordas.voltar, true);
  assert.equal(solto.bordas.voltar, undefined);
  assert.equal(deNovo.bordas.voltar, true, 'o segundo clique foi perdido');
});

test('cada botão tem sua própria borda', () => {
  const quadro = lerQuadro({ pads: [controle({ botoes: ['confirmar', 'voltar', 'pausa'] })] });

  assert.deepEqual(Object.keys(quadro.bordas).sort(), ['confirmar', 'pausa', 'voltar']);
});

test('um controle com value e não pressed ainda é lido', () => {
  // Os gatilhos analógicos do PlayStation reports `value`; os demais reports
  // `pressed`. Ler os dois pega os dois sem adivinhar.
  const pad = controle();
  pad.buttons[BOTAO.confirmar] = { pressed: false, touched: true, value: 1 };

  const quadro = lerQuadro({ pads: [pad] });

  assert.equal(quadro.botoes.confirmar, true, 'value 1 não foi lido como pressionado');
});

test('um botão com value parcial não conta', () => {
  const pad = controle();
  pad.buttons[BOTAO.confirmar] = { pressed: false, touched: true, value: 0.3 };

  assert.equal(lerQuadro({ pads: [pad] }).botoes.confirmar, false, '0,3 foi lido como clique');
});

// --- o leitor ---------------------------------------------------------------

test('o leitor produz uma borda por clique, sem precisar consumir', () => {
  // A primeira versão tinha `consumir()`, e ele quebrava: o primeiro consumidor
  // marcava a borda como lida e o segundo perdia o clique. Uma leitura por quadro
  // já resolve, e sem estado extra para errar.
  const leitor = criarLeitorDeControle({
    obterPads: () => [controle({ botoes: ['confirmar'] })],
    agora: () => 0
  });

  const a = leitor.ler();
  const b = leitor.ler();

  assert.equal(a.bordas.confirmar, true, 'o primeiro quadro não foi borda');
  assert.equal(b.bordas.confirmar, undefined, 'o segundo quadro repetiu a borda');
});

test('o leitor guarda o anterior sozinho', () => {
  // Se o chamador precisasse passar o anterior, esqueceria em algum caminho e o
  // clique seria perdido ali — e o bug apareceria uma vez a cada cem usos.
  let leitura = 0;
  const leitor = criarLeitorDeControle({
    obterPads: () => {
      leitura += 1;
      return [leitura === 1 ? controle({ botoes: ['confirmar'] }) : controle({})];
    }
  });

  assert.equal(leitor.ler().bordas.confirmar, true);
  assert.equal(leitor.ler().bordas.confirmar, undefined);
  assert.equal(leitor.ler().bordas.confirmar, undefined);
});

test('o leitor funciona sem navegador nenhum', () => {
  // Este teste roda no Node, sem `navigator`. É o que prova que o padrão do
  // `obterPads` degrada em vez de explodir — e é a mesma degradação de um
  // navegador sem Gamepad API.
  const leitor = criarLeitorDeControle();
  const quadro = leitor.ler();

  assert.equal(quadro.conectado, false);
  assert.equal(leitor.conectado(), false);
  assert.equal(leitor.nomeDoControle(), null);
});

test('o leitor diz o nome do controle, e só dos conhecidos', () => {
  const xbox = criarLeitorDeControle({ obterPads: () => [controle({ id: 'Xbox Controller' })] });
  const dualsense = criarLeitorDeControle({
    obterPads: () => [controle({ id: 'DualSense Wireless Controller' })]
  });
  const estranho = criarLeitorDeControle({ obterPads: () => [controle({ id: 'Generic USB Joystick' })] });

  assert.equal(xbox.nomeDoControle(), 'Xbox');
  assert.equal(dualsense.nomeDoControle(), 'PlayStation 5');
  assert.equal(estranho.nomeDoControle(), 'Controle', 'um controle desconhecido ficou sem nome');
});

test('o leitor pega o primeiro controle conectado de uma lista com nulos', () => {
  // O formato real de `getGamepads()` é um array esparso, e é assim que ele chega.
  const leitor = criarLeitorDeControle({
    obterPads: () => [null, null, controle({ id: 'Xbox Controller' }), null]
  });

  assert.equal(leitor.conectado(), true);
  assert.equal(leitor.nomeDoControle(), 'Xbox');
});
