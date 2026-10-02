import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MELHORIAS_DE_PICARETA,
  PICARETA_MAXIMA,
  POCOES_CAMINHO_SEGURO_NO_DEV,
  pickaxeLevelDe
} from '../src/game/progression.js';
import { NIVEL_MAXIMO } from '../src/game/melhorias.js';
import {
  PERSISTENTE,
  criarJogo,
  estadoInicial,
  estadoInicialDev,
  gravarEstadoDoJogo,
  hidratarEstado,
  lerJogo,
  listarJogos,
  partePersistente,
  saveCompativelComOModo
} from '../src/game/saves.js';

/**
 * O modo desenvolvedor não pode contaminar o jogo de verdade.
 *
 * Três regras, e as três são sobre **progresso**: um save de teste não guarda
 * melhor cave nem relíquias, e não abre no jogo normal — assim como o jogo normal
 * não abre no modo desenvolvedor.
 *
 * O porquê de ser regra e não preferência: o modo desenvolvedor dá picareta máxima e
 * poções, e pula direto para a cave que a pessoa quiser. Uma tarde de teste passaria
 * por 60 cavernas e pelas 6 relíquias. Se isso contasse, o jogo de verdade deixaria
 * de ter sentido em uma tarde — e o dano é silencioso, porque nada na tela diz que
 * aquilo contou.
 */

/** Um storage em memória, como o resto da suíte usa. */
function storageFalso() {
  const mapa = new Map();

  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
    clear: () => mapa.clear()
  };
}

// --- o kit do modo desenvolvedor --------------------------------------------

test('o modo desenvolvedor começa com 5 poções de caminho seguro', () => {
  const dev = estadoInicialDev(1);

  assert.equal(
    dev.utilities.safePath,
    POCOES_CAMINHO_SEGURO_NO_DEV,
    `o kit traz ${dev.utilities.safePath} poções, e o pedido foram ${POCOES_CAMINHO_SEGURO_NO_DEV}`
  );
  assert.equal(POCOES_CAMINHO_SEGURO_NO_DEV, 5, 'a quantidade mudou e o pedido eram 5');
});

test('o modo desenvolvedor começa com a picareta no máximo, e o nível junto', () => {
  const dev = estadoInicialDev(1);

  assert.equal(dev.pickaxeLevel, PICARETA_MAXIMA);
  assert.equal(dev.pickaxePower, PICARETA_MAXIMA);

  // O nível da melhoria tem de acompanhar. Deixá-lo em 0 faria a HUD mostrar
  // picareta 5 e o catálogo ainda oferecer "Picareta 05" — carta morta.
  assert.equal(
    dev.pickaxeUpgradeLevel,
    MELHORIAS_DE_PICARETA,
    `o nível ficou ${dev.pickaxeUpgradeLevel}, e o máximo é ${MELHORIAS_DE_PICARETA}`
  );
});

test('a picareta do modo dev é a mesma que o catálogo permite', () => {
  // Duas fontes de verdade para o mesmo teto. Se o catálogo subir para 5 e o kit
  // continuar em 5+1, o modo dev entrega uma picareta que o jogo nunca dá.
  assert.equal(PICARETA_MAXIMA, pickaxeLevelDe(MELHORIAS_DE_PICARETA, NIVEL_MAXIMO));
  assert.equal(PICARETA_MAXIMA, MELHORIAS_DE_PICARETA + 1 + NIVEL_MAXIMO);
});

test('o modo desenvolvedor não inventa head start de progresso', () => {
  const dev = estadoInicialDev(20);

  // Relíquias e estatísticas continuam zeradas, e o `bestCave` é o da cave — não
  // um "deixa tudo liberado". Um save de teste com cara de jogo de verdade é
  // exatamente o que a marca `dev` existe para evitar.
  const dev20 = dev;
  assert.equal(dev20.bestCave, 20, 'o bestCave do modo dev foi além da cave');
  assert.equal(Object.values(dev20.collection).reduce((a, b) => a + b, 0), 0, 'o modo dev já veio com relíquias');
  assert.equal(dev20.stats.totalRelicsFound, 0);
});

test('o kit do modo dev não mexe nas outras utilidades', () => {
  const dev = estadoInicialDev(1);

  assert.equal(dev.utilities.lifePotion, 0, 'inventou poção de vida que ninguém pediu');
  assert.equal(dev.utilities.revealBomb, 0, 'inventou bomba reveladora que ninguém pediu');
});

test('um jogo normal não recebe nada do kit', () => {
  const normal = estadoInicial(1);

  assert.equal(normal.utilities.safePath, 0);
  assert.equal(normal.pickaxeLevel, 1);
  assert.equal(normal.pickaxeUpgradeLevel, 0);
  assert.equal(normal.dev, false, 'um jogo normal nasceu marcado como teste');
});

// --- a marca de teste ------------------------------------------------------

test('a marca de teste sobrevive ao save e volta do save', () => {
  const storage = storageFalso();
  const id = criarJogo(storage, 'Teste');

  assert.equal(lerJogo(storage, id).dev, false, 'um jogo criado sem o modo dev nasceu marcado como teste');

  const idDev = criarJogo(storage, 'Dev', { cave: 1, estado: estadoInicialDev(1) });

  assert.equal(lerJogo(storage, idDev).dev, true, 'a marca de teste não sobreviveu ao save');
  assert.ok(PERSISTENTE.includes('dev'), 'a marca de teste não vai para o disco');
});

test('um save antigo, sem a chave, é jogo normal e não jogo de teste', () => {
  // Quem tem save de antes do modo desenvolvedor tem `dev` ausente. A dúvida tem que
  // resolver para o lado seguro: `undefined` não pode virar "deixa passar".
  const semMarca = hidratarEstado({ cave: 5, bestCave: 5, coins: 10 });

  assert.equal(semMarca.dev, false);
  assert.equal(saveCompativelComOModo(semMarca, false), true, 'um save antigo tem de abrir no jogo normal');
  assert.equal(saveCompativelComOModo(semMarca, true), false, 'um save antigo abriu no modo desenvolvedor');
});

test('`dev` e só true: um valor estranho não marca nada como teste', () => {
  for (const valor of ['true', 1, {}, [], 'sim']) {
    const estado = hidratarEstado({ cave: 1, dev: valor });
    assert.equal(estado.dev, false, `dev=${JSON.stringify(valor)} marcou um save como de teste`);
  }
});

// --- a regra de entrada ----------------------------------------------------

test('o modo desenvolvedor não abre um jogo de verdade', () => {
  const normal = hidratarEstado({ cave: 30, bestCave: 30, dev: false });

  assert.equal(saveCompativelComOModo(normal, true), false, 'o modo dev abriu um jogo de verdade');
});

test('o jogo normal não abre um jogo de teste', () => {
  // Não foi pedido explicitamente, e é a mesma contaminação pelo outro lado: um
  // save de teste tem picareta máxima e poções, e o que ele escrevesse no registro
  // do jogo de verdade contaminaria o jogo de verdade.
  const deTeste = hidratarEstado({ cave: 60, bestCave: 60, dev: true });

  assert.equal(saveCompativelComOModo(deTeste, false), false, 'um jogo de teste abriu no modo normal');
});

test('cada modo abre só os jogos dele', () => {
  const normal = hidratarEstado({ cave: 10, dev: false });
  const deTeste = hidratarEstado({ cave: 10, dev: true });

  assert.equal(saveCompativelComOModo(normal, false), true);
  assert.equal(saveCompativelComOModo(deTeste, true), true);
  assert.equal(saveCompativelComOModo(normal, true), false);
  assert.equal(saveCompativelComOModo(deTeste, false), false);
});

test('a regra trata modo desligado como desligado, e não como ausente', () => {
  // `undefined` é falsy, e é o valor que chega quando quem chama esquece o
  // argumento. Aí o jogo normal abriria e o de teste também não — e o sintoma
  // seria "nenhum save abre".
  const deTeste = hidratarEstado({ cave: 10, dev: true });

  assert.equal(saveCompativelComOModo(deTeste), false, 'sem argumento, um save de teste abriu');
  assert.equal(saveCompativelComOModo(deTeste, false), false);
});

test('um estado ausente não abre nada', () => {
  assert.equal(saveCompativelComOModo(null, true), false);
  assert.equal(saveCompativelComOModo(undefined, false), false);
});

// --- o que a tela de jogos precisa saber -----------------------------------

test('a lista de jogos diz quais são de teste', () => {
  // A tela usa isso para desabilitar o botão e escrever o motivo. Sem a informação
  // no resumo, ela teria de abrir cada save para saber — e abrir é justamente o que
  // ela precisa decidir se pode fazer.
  const storage = storageFalso();
  criarJogo(storage, 'Normal', { cave: 3, estado: estadoInicial(3) });
  criarJogo(storage, 'Dev', { cave: 40, estado: estadoInicialDev(1) });

  const lista = listarJogos(storage);
  const normal = lista.find((j) => j.name === 'Normal');
  const dev = lista.find((j) => j.name === 'Dev');

  assert.equal(normal.dev, false, 'o jogo normal não foi marcado como normal na lista');
  assert.equal(dev.dev, true, 'o jogo de teste não foi marcado como teste na lista');
});

test('a marca continua no save depois de gravar estado durante o jogo', () => {
  // A cada quadro a cena regrava o estado. Se a gravação perdesse a marca, o save
  // de teste viraria jogo normal no meio da sessão — e passaria a abrir no jogo de
  // verdade, com 5 poções e picareta máxima dentro dele.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Dev', { cave: 1, estado: estadoInicialDev(1) });

  for (let i = 0; i < 5; i += 1) {
    const atual = lerJogo(storage, id);
    gravarEstadoDoJogo(storage, id, { ...atual, cave: 10 + i, coins: 40 });
  }

  const final = lerJogo(storage, id);

  assert.equal(final.dev, true, 'a marca de teste se perdeu ao gravar estado');
  assert.equal(final.cave, 14);
});

test('o estado gravado leva a marca, e não só o registro do save', () => {
  // O guarda da cena lê `metaState.dev`, e o `metaState` vem do estado. Uma marca
  // que morasse só no registro do save exigiria mandá-la à mão em cada evento.
  const gravado = partePersistente(estadoInicialDev(1));

  assert.equal(gravado.dev, true);
});
