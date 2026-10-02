import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ESPERA_REPETICAO_MS,
  INTERVALO_REPETICAO_MS,
  alvosAlcancaveis,
  criarNavegadorDeFoco,
  ordenarPorDirecao,
  passoDeRepeticao,
  primeiroAlvo,
  proximoAlvo
} from '../src/game/foco.js';

/**
 * O `id` do alvo escolhido, para as asserções lerem como antes.
 *
 * `proximoAlvo` devolve o alvo, e não o `id` dele: no jogo real quase nenhum botão tem
 * `id`, e escolher por ele fazia toda direção cair no primeiro botão da tela. Ver o `id`
 * do alvo devolvido é o que mantém estas asserções legíveis sem descrever de novo o que
 * mudou.
 */
const passoPara = (...argumentos) => proximoAlvo(...argumentos)?.id ?? null;

/**
 * Um retângulo como alvo.
 *
 * A navegação só conhece `{ id, x, y, largura, altura }` — é por isso que ela é
 * uma função pura. O `elemento` é opcional e existe só para o navegador de foco,
 * que precisa chamar `focus()` e `click()`.
 */
function alvo(id, x, y, largura = 100, altura = 40, extra = {}) {
  return { id, x, y, largura, altura, ...extra };
}

/**
 * Um DOM mínimo.
 *
 * Não é um DOM de verdade: é só o que `alvosAlcancaveis` e o navegador usam — e
 * usar um de verdade exigiria um navegador, e aí o teste deixaria de ser um teste
 * de lógica para virar um teste de integração.
 */
function domFalso(alvos, { ocultos = new Set(), semId = false } = {}) {
  // `ativo` é uma referência só. Se `focus()` escrevesse em um lugar e o
  // `elementoAtivo` do navegador lesse de outro, o teste passaria a medir a
  // variável errada — e passaria.
  const estado = { ativo: null };

  const elementos = alvos.map((item) => {
    const elemento = {
      // No jogo real quase nenhum botão tem `id`, e `element.id` devolve `''`
      // nesse caso — não `null`, e não `undefined`. `semId` reproduz isso.
      id: semId ? '' : item.id,
      dataset: semId ? {} : { focoId: item.id },
      offsetParent: ocultos.has(item.id) ? null : {},
      disabled: false,
      tagName: 'BUTTON',
      getAttribute(nome) {
        return nome === 'aria-hidden' && ocultos.has(item.id) ? 'true' : null;
      },
      getBoundingClientRect() {
        return {
          left: item.x,
          top: item.y,
          width: ocultos.has(item.id) ? 0 : item.largura,
          height: ocultos.has(item.id) ? 0 : item.altura
        };
      },
      focus() {
        estado.ativo = elemento;
      },
      click() {
        elemento.clicado = (elemento.clicado ?? 0) + 1;
      }
    };

    return elemento;
  });

  return {
    raiz: { querySelectorAll: () => elementos },
    elementos,
    /** O que o navegador de foco lê para saber quem está com o foco. */
    elementoAtivo: () => estado.ativo,
    get ativo() {
      return estado.ativo;
    }
  };
}

/** `getComputedStyle` é global no navegador; o teste precisa do mínimo. */
globalThis.getComputedStyle ??= () => ({ position: 'static' });

// --- geometria -------------------------------------------------------------

test('para cima, o alvo é o que está acima', () => {
  const a = alvo('a', 0, 0);
  const b = alvo('b', 0, 100);

  assert.equal(passoPara([a, b], b, 'cima'), 'a');
  assert.equal(passoPara([a, b], a, 'baixo'), 'b');
});

test('o alvo tem de estar na direção, não só ser o mais perto', () => {
  // Sem o teste de sentido, apertar "cima" numa tela de duas linhas poderia
  // escolher o vizinho da direita — que está mais perto, mas não está acima.
  const cima = alvo('cima', 0, 0);
  const direita = alvo('direita', 100, 45);
  const origem = alvo('origem', 0, 100);

  assert.equal(passoPara([cima, direita], origem, 'cima'), 'cima');
});

test('um alvo alinhado demais não conta como passo', () => {
  // Dois botões colados com 2px de folga: apertar para cima não deve ficar
  // quicando entre os dois.
  const origem = alvo('origem', 0, 100, 100, 40);
  const colado = alvo('colado', 0, 98, 100, 40);

  assert.equal(passoPara([colado], origem, 'cima'), null, 'um alvo de 2px virou um passo');
});

test('o ângulo ganha da distância', () => {
  // Duas opções para cima: uma na mesma coluna e perto, outra na coluna vizinha e
  // longe. Vence a mesma coluna, mesmo estando mais longe — porque atravessar
  // colunas é um desvio, e desvio é o que a pessoa não pediu.
  const origem = alvo('origem', 200, 300, 100, 40);
  const mesmaColuna = alvo('mesma-coluna', 200, 200, 100, 40);
  const outraColuna = alvo('outra-coluna', 0, 260, 100, 40);

  assert.equal(passoPara([outraColuna, mesmaColuna], origem, 'cima'), 'mesma-coluna');
});

test('atravessar uma coluna larga não é penalizado como quatro passos', () => {
  // A distância é o comprimento do passo, não a "distância em linha". Uma coluna
  // de 400px de largura é um passo, e tratá-la como dez seria uma navigação que
  // pula alvos.
  const origem = alvo('origem', 200, 300, 100, 40);
  const colado = alvo('colado', 150, 200, 100, 40);
  const longe = alvo('longe', -400, 200, 100, 40);

  assert.equal(passoPara([longe, colado], origem, 'cima'), 'colado');
});

test('numa grade, cima acha o card de cima e não o da diagonal', () => {
  // Seleção de bioma: 2 colunas. O card da diagonal está mais perto em pixel, e
  // mesmo assim não é o que "para cima" deve escolher.
  const origem = alvo('atual', 400, 300, 300, 120);
  const acimaNaColuna = alvo('acima', 400, 100, 300, 120);
  const diagonal = alvo('diagonal', 0, 100, 300, 120);

  assert.equal(passoPara([diagonal, acimaNaColuna], origem, 'cima'), 'acima');
  assert.equal(passoPara([diagonal, acimaNaColuna], origem, 'esquerda'), 'diagonal');
});

test('sem alvo na direção, devolve null em vez de um vizinho qualquer', () => {
  // Devolver `null` é o que faz a repetição parar na borda, em vez de ficar
  // quicando ou dar a volta.
  const origem = alvo('origem', 0, 0);

  assert.equal(passoPara([alvo('lateral', 300, 0)], origem, 'cima'), null);
  assert.equal(passoPara([], origem, 'baixo'), null);
});

test('ordenar devolve do melhor para o pior', () => {
  const origem = alvo('origem', 0, 300, 100, 40);
  const longe = alvo('longe', 0, 0, 100, 40);
  const perto = alvo('perto', 0, 240, 100, 40);

  assert.deepEqual(
    ordenarPorDirecao([longe, perto], origem, 'cima').map((a) => a.id),
    ['perto', 'longe']
  );
});

test('o primeiro alvo é o de cima e da esquerda, não o último do DOM', () => {
  // Numa grade, o primeiro card não é o último que entrou no DOM.
  const emGrade = [alvo('baixo-direita', 200, 200), alvo('cima-esquerda', 0, 0), alvo('baixo-esquerda', 0, 200)];

  assert.equal(primeiroAlvo(emGrade)?.id, 'cima-esquerda');
  assert.equal(primeiroAlvo([])?.id ?? null, null);
  assert.equal(primeiroAlvo(null), null);
});

// --- repetição -------------------------------------------------------------

test('o primeiro passo é imediato', () => {
  // Esperar 380ms antes do primeiro passo é a sensação de controle quebrado mais
  // comum em navegação por controle: a pessoa aperta e nada acontece.
  assert.equal(passoDeRepeticao(null, 1000).repetir, true);
});

test('segurar não repete antes da espera', () => {
  const primeiro = passoDeRepeticao(null, 1000);

  assert.equal(passoDeRepeticao(primeiro, 1000 + ESPERA_REPETICAO_MS - 1).repetir, false);
});

test('na virada da espera, repete uma vez', () => {
  const primeiro = passoDeRepeticao(null, 1000);
  const virada = passoDeRepeticao(primeiro, 1000 + ESPERA_REPETICAO_MS);

  assert.equal(virada.repetir, true);
  assert.equal(virada.repetiuEm, 1000 + ESPERA_REPETICAO_MS);
  assert.equal(virada.desde, 1000, 'a origem do tempo se perdeu');
});

test('entre repetições, o intervalo é menor que a espera', () => {
  // Se fossem iguais, segurar seria indistinguível de apertar várias vezes — e
  // atravessar uma lista inteira seria lento demais sem parecer lento.
  assert.ok(INTERVALO_REPETICAO_MS < ESPERA_REPETICAO_MS);
});

test('as repetições seguintes seguem o intervalo curto', () => {
  let estado = passoDeRepeticao(null, 0);
  const instantes = [];

  // Quadros de 50ms, por um segundo. O passo exato cai no primeiro quadro que
  // passa da espera, e o que importa é isso: a repetição não pode vir antes da
  // espera, e as seguintes não podem vir antes do intervalo.
  for (let passo = 1; passo <= 20; passo += 1) {
    const resultado = passoDeRepeticao(estado, passo * 50);
    estado = resultado;

    if (resultado.repetir) instantes.push(passo * 50);
  }

  assert.ok(instantes.length >= 3, `só ${instantes.length} repetições em 600ms segurados`);

  assert.ok(
    instantes[0] >= ESPERA_REPETICAO_MS,
    `a primeira repetição veio em ${instantes[0]}ms, antes da espera de ${ESPERA_REPETICAO_MS}ms`
  );

  for (let i = 1; i < instantes.length; i += 1) {
    const passo = instantes[i] - instantes[i - 1];

    assert.ok(
      passo >= INTERVALO_REPETICAO_MS,
      `a repetição ${i} veio ${passo}ms depois, e o mínimo é ${INTERVALO_REPETICAO_MS}ms`
    );
  }
});

test('soltar a direção zera a repetição', () => {
  // Soltar e apertar de novo tem de andar na hora. Se o estado sobrevivesse, o
  // segundo aperto pagaria a espera de novo e a pessoa sentiria umlag.
  const segurado = passoDeRepeticao(null, 0);
  const atrasado = passoDeRepeticao(segurado, ESPERA_REPETICAO_MS - 50);

  assert.equal(atrasado.repetir, false, 'segurou e andou cedo demais');
});

// --- alvos alcançáveis -----------------------------------------------------

test('um alvo escondido não entra na lista', () => {
  // Um botão de uma tela fechada que ainda recebe foco é o pior bug de
  // navegação: a pessoa aperta e nada acontece.
  const { raiz } = domFalso([alvo('visivel', 0, 0), alvo('escondido', 0, 100)], { ocultos: new Set(['escondido']) });

  assert.deepEqual(alvosAlcancaveis(raiz).map((a) => a.id), ['visivel']);
});

test('um alvo de tamanho zero não entra na lista', () => {
  const { raiz } = domFalso([alvo('ok', 0, 0), alvo('colapsado', 0, 100, 0, 0)]);

  assert.deepEqual(alvosAlcancaveis(raiz).map((a) => a.id), ['ok']);
});

test('uma raiz que não é DOM devolve lista vazia', () => {
  assert.deepEqual(alvosAlcancaveis(null), []);
  assert.deepEqual(alvosAlcancaveis({}), []);
});

// --- o navegador completo --------------------------------------------------

test('botões sem id andam um a um, e não caem todos no primeiro', () => {
  // Este é o teste do bug que existia no jogo.
  //
  // A navegação escolhia o alvo pelo `id`, e no jogo real quase nenhum botão tem
  // `id`: `element.id` devolve `''` e `dataset.focoId` é `undefined`. Com o `id`
  // vazio em todos, a busca por "o alvo com este id" devolvia o primeiro da lista —
  // e as quatro direções levavam ao mesmo botão. Quem jogava com controle via
  // empurrar o analógico e caía sempre no "Entrar", qualquer que fosse a direção.
  //
  // O teste anterior não pegava isso porque o DOM falso dele dava `id` distinto
  // para cada botão, que é exatamente o que o jogo não tem.
  const { raiz, elementos, elementoAtivo } = domFalso(
    [
      alvo('entrar', 48, 184, 520, 58),
      alvo('config', 48, 242, 520, 58),
      alvo('idioma', 48, 300, 520, 58),
      alvo('info', 48, 358, 520, 58)
    ],
    { semId: true }
  );

  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo });

  assert.equal(alvosAlcancaveis(raiz).length, 4, 'um botão sem id sumiu da lista');

  elementos[0].focus();
  assert.equal(nav.mover('baixo'), true);
  assert.equal(elementoAtivo(), elementos[1], 'baixo pulou o Configurações');

  assert.equal(nav.mover('baixo'), true);
  assert.equal(elementoAtivo(), elementos[2]);

  assert.equal(nav.mover('cima'), true);
  assert.equal(elementoAtivo(), elementos[1], 'cima pulou o Configurações');

  // E `atual()` não pode devolver `''` como se fosse um id: isso é o que o HUD
  // leria, e `''` não identifica ninguém.
  assert.equal(nav.atual(), null, 'devolveu um id vazio como se fosse identificação');
});

test('o navegador move o foco de verdade, elemento por elemento', () => {
  const { raiz, elementos, elementoAtivo } = domFalso([
    alvo('a', 0, 0),
    alvo('b', 0, 100),
    alvo('c', 0, 200)
  ]);

  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo });

  assert.equal(nav.focarPrimeiro(), 'a');
  assert.equal(elementoAtivo(), elementos[0], 'o foco não foi para o primeiro');

  assert.equal(nav.mover('baixo'), true);
  assert.equal(elementoAtivo(), elementos[1], 'o foco não andou para o elemento certo');

  assert.equal(nav.mover('baixo'), true);
  assert.equal(elementoAtivo(), elementos[2]);

  // Na borda de baixo, não há para onde ir: devolve falso, e o foco fica.
  assert.equal(nav.mover('baixo'), false);
  assert.equal(elementoAtivo(), elementos[2], 'o foco saiu da tela');

  assert.equal(nav.mover('cima'), true);
  assert.equal(elementoAtivo(), elementos[1]);
});

test('o navegador ativa o alvo com foco', () => {
  const { raiz, elementos, elementoAtivo } = domFalso([alvo('a', 0, 0), alvo('b', 0, 100)]);
  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo });

  nav.focarPrimeiro();
  assert.equal(elementoAtivo(), elementos[0]);

  assert.equal(nav.ativar(), true);
  assert.equal(elementos[0].clicado, 1, 'o clique não chegou no elemento com foco');
  assert.equal(nav.atual(), 'a');
});

test('sem alvo com foco, ativar não faz nada em vez de clicar no primeiro', () => {
  // Clicar no primeiro quando o foco está em lugar nenhum é o comportamento que
  // faz o jogo executar uma ação que a pessoa não pediu.
  const { raiz, elementoAtivo } = domFalso([alvo('a', 0, 0)]);
  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo });

  assert.equal(nav.ativar(), false);
});

test('mover sem alvo nenhum não quebra', () => {
  const nav = criarNavegadorDeFoco({ raiz: domFalso([]).raiz, elementoAtivo: () => null });

  assert.equal(nav.mover('baixo'), false);
  assert.equal(nav.focarPrimeiro(), null);
  assert.equal(nav.atual(), null);
});

test('a repetição do navegador anda uma vez por direção segurada', () => {
  const alvos = Array.from({ length: 8 }, (_, i) => alvo(`linha-${i}`, 0, i * 100));
  const { raiz, elementoAtivo } = domFalso(alvos);

  let agora = 0;
  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo, agora: () => agora });

  nav.focarPrimeiro();

  // Quadro a quadro segurando "baixo", a 10ms. O passo cai no primeiro quadro que
  // passa do tempo, e o que se afirma é o intervalo a partir do passo anterior —
  // não o número do quadro, que é borda do teste e não da lógica.
  const passos = [];

  for (let quadro = 1; quadro <= 200; quadro += 1) {
    agora = quadro * 10;

    if (nav.moverComRepeticao('baixo', agora)) passos.push(agora);
  }

  assert.equal(passos[0], 10, 'o primeiro passo não foi no primeiro quadro');

  assert.ok(
    passos[1] - passos[0] >= ESPERA_REPETICAO_MS,
    `a primeira repetição veio ${passos[1] - passos[0]}ms depois, e a espera é ${ESPERA_REPETICAO_MS}ms`
  );

  for (let i = 2; i < passos.length; i += 1) {
    assert.ok(
      passos[i] - passos[i - 1] >= INTERVALO_REPETICAO_MS,
      `a repetição ${i} veio ${passos[i] - passos[i - 1]}ms depois, e o mínimo é ${INTERVALO_REPETICAO_MS}ms`
    );
  }

  // E não passou da última linha: 8 alvos, o foco começa no primeiro.
  assert.equal(passos.length, 7, `o foco andou ${passos.length} vezes para uma lista de 8`);
});

test('soltar a direção zera a repetição do navegador', () => {
  const alvos = Array.from({ length: 6 }, (_, i) => alvo(`l-${i}`, 0, i * 100));
  const { raiz, elementoAtivo } = domFalso(alvos);

  let agora = 0;
  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo, agora: () => agora });

  nav.focarPrimeiro();

  assert.equal(nav.moverComRepeticao('baixo', 0), true, 'o primeiro passo não foi imediato');

  // Segura bem depois do primeiro passo, sem passar da espera.
  assert.equal(nav.moverComRepeticao('baixo', ESPERA_REPETICAO_MS - 10), false, 'segurou e andou cedo demais');

  // Solta: o navegador esquece o tempo daquela direção.
  nav.moverComRepeticao(null, ESPERA_REPETICAO_MS);

  // Segura de novo: tem de andar na hora, sem pagar a espera outra vez.
  assert.equal(nav.moverComRepeticao('baixo', ESPERA_REPETICAO_MS + 10), true);
});

test('mudar de direção não herda a repetição da anterior', () => {
  // Sem isto, soltar o "baixo" e segurar o "direita" direto deixaria o "direita"
  // esperando o tempo do "baixo", e o primeiro passo para o lado atrasaria.
  const { raiz, elementoAtivo } = domFalso([
    alvo('meio', 0, 100),
    alvo('baixo', 0, 200),
    alvo('direita', 100, 100)
  ]);

  let agora = 0;
  const nav = criarNavegadorDeFoco({ raiz, elementoAtivo, agora: () => agora });

  // O foco começa no primeiro alvo, que é o de cima e da esquerda: `meio`.
  assert.equal(nav.focarPrimeiro(), 'meio');

  assert.equal(nav.moverComRepeticao('baixo', 10), true, 'o primeiro passo para baixo não aconteceu');
  nav.moverComRepeticao(null, 20);

  assert.equal(
    nav.moverComRepeticao('direita', 30),
    true,
    'trocar de direção pagou a espera da direção anterior'
  );
});
