import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NIVEL_MAXIMO_CAMINHO,
  PASSOS_MAXIMOS_DO_DESVIO,
  RELIQUIAS_NO_MAXIMO,
  desvioParaReliquia,
  escondeBomba,
  escondeReliquia,
  marcasDoCaminhoSeguro,
  perigosAoLadoDaRota,
  reliquiasPertoDaRota
} from '../src/game/systems/caminhoSeguro.js';
import { findSafeRoute } from '../src/game/systems/helpers.js';
import { createRelicContent } from '../src/game/progression.js';

/**
 * A Poção Caminho Seguro além da rota.
 *
 * ## O que estes testes seguram
 *
 * 1. **O nível 0 é a poção de antes.** Só a rota. Uma função que já devolvesse algo no
 *    nível 0 daria de graça o que a melhoria vende.
 *
 * 2. **Nada além do que foi pedido.** O nível 1 revela bomba ao lado, e não a bomba da
 *    cave; o nível 2 revela relíquia perto, e não a relíquia do mapa. Os limites são o
 *    produto: sem eles a melhoria vira "revele tudo" e o resto da cave perde o sentido.
 *
 * 3. **O desvio é curto e não alonga a saída.** É a parte que promete "não criar uma rota
 *    nova", e a promessa é sobre comprimento — então o teste mede comprimento.
 *
 * ## Os mapas são escritos à mão
 *
 * Não uso `generateMap` aqui. Um mapa aleatório com bomba ou sem bomba decide se o teste
 * passa, e um teste que passa ou falha conforme o mapa é um teste que às vezes não prova
 * nada. Os mapas abaixo são pequenos, desenhados, e o que cada um tem dentro é o nome.
 */

/** Um mapa vazio de `width` por `height`, tudo chão. */
function mapaVazio(width, height) {
  const tiles = [];

  for (let row = 0; row < height; row += 1) {
    const linha = [];

    for (let col = 0; col < width; col += 1) {
      linha.push({ col, row, type: 'floor', walkable: true, revealed: false, hiddenContent: 'empty' });
    }

    tiles.push(linha);
  }

  return { width, height, tiles, entry: { col: 0, row: 0 }, exit: { col: width - 1, row: 0 } };
}

/** Uma rota horizontal de `length` tiles na linha 0. */
function rotaNaLinhaZero(length) {
  const rota = [];

  for (let col = 0; col < length; col += 1) rota.push({ col, row: 0 });

  return rota;
}

/** Escreve o conteúdo de um tile. */
function por(tile, conteudo) {
  tile.hiddenContent = conteudo;

  return tile;
}

// --- os limites de cada nível ---------------------------------------------

test('o nível 0 não marca nada, porque a rota já é a poção de antes', () => {
  const mapa = mapaVazio(12, 6);
  const rota = rotaNaLinhaZero(12);

  por(mapa.tiles[0][3], 'bomb');
  por(mapa.tiles[1][7], createRelicContent('amber_fang'));

  const marcas = marcasDoCaminhoSeguro(mapa, rota, 0);

  assert.deepEqual(marcas.perigos, [], 'o nível 0 marcou perigo');
  assert.deepEqual(marcas.reliquias, [], 'o nível 0 marcou reliquia');
  assert.equal(marcas.desvio, null, 'o nível 0 desenhou desvio');
});

test('o nível 1 marca as bombas ao lado da rota, e só elas', () => {
  const mapa = mapaVazio(12, 8);
  const rota = rotaNaLinhaZero(12);

  // As duas coladas na rota, na linha 1. A linha 0 é a rota inteira, e um tile da
  // rota não é perigo ao lado da rota — ele é a rota.
  por(mapa.tiles[1][2], 'bomb');
  por(mapa.tiles[1][5], 'bomb');

  // Uma casa de distância em linha reta: fora do raio, não entra.
  por(mapa.tiles[2][5], 'bomb');

  // Longe: fora.
  por(mapa.tiles[7][11], 'bomb');

  const perigos = marcasDoCaminhoSeguro(mapa, rota, 1).perigos;

  assert.equal(perigos.length, 2, `marcou ${perigos.length} perigos: ${JSON.stringify(perigos)}`);
  assert.ok(perigos.some((p) => p.col === 2 && p.row === 1), 'a primeira bomba colada sumiu');
  assert.ok(perigos.some((p) => p.col === 5 && p.row === 1), 'a segunda bomba colada sumiu');

  // E um tile da rota nunca vira perigo, mesmo com uma bomba embaixo dele: o caminho
  // verde não pode parecer o lugar perigoso.
  por(mapa.tiles[0][8], 'bomb');

  assert.ok(
    !perigosAoLadoDaRota(mapa, rota).some((p) => p.row === 0),
    'marcou como perigo um tile que está na rota'
  );
  assert.ok(!perigos.some((p) => p.row === 2), 'marcou bomba a duas casas de distância');
  assert.ok(!perigos.some((p) => p.row === 7), 'marcou a bomba do outro lado do mapa');
});

test('o nível 1 usa oito vizinhos, porque na diagonal também se pisa', () => {
  // Uma bomba na diagonal de um tile da rota é um passo de verdade na grade isométrica.
  // Ficar nos quatro vizinhos deixaria metade dos riscos sem marca, e a pessoa
  // aprenderia a não confiar no verde.
  const mapa = mapaVazio(9, 9);
  const rota = rotaNaLinhaZero(9);

  // As duas diagonais do tile (4,0): (3,1) e (5,1). `tiles` é indexado por linha
  // primeiro, e é aí que a maioria dos fixtures de grade erra.
  por(mapa.tiles[1][3], 'bomb');
  por(mapa.tiles[1][5], 'bomb');
  const perigos = perigosAoLadoDaRota(mapa, rota);

  assert.equal(perigos.length, 2, `marcou ${perigos.length} de 2 diagonais`);
});

test('o nível 1 não marca bomba que a poção dedão já revelou', () => {
  const mapa = mapaVazio(9, 4);
  const rota = rotaNaLinhaZero(9);

  por(mapa.tiles[1][4], 'bomb');
  mapa.tiles[1][4].utilityRevealBomb = true;

  assert.deepEqual(perigosAoLadoDaRota(mapa, rota), [], 'marcou uma bomba já revelada');
  assert.equal(escondeBomba(mapa.tiles[1][4]), false, 'a bomba revelada ainda conta como bomba');
});

test('o nível 2 marca a relíquia colada na rota, e não a do outro lado do mapa', () => {
  const mapa = mapaVazio(14, 10);
  const rota = rotaNaLinhaZero(14);

  por(mapa.tiles[1][6], createRelicContent('amber_fang'));
  por(mapa.tiles[9][13], createRelicContent('frost_bloom'));

  const marcas = marcasDoCaminhoSeguro(mapa, rota, 2);

  assert.equal(marcas.reliquias.length, 1, `marcou ${marcas.reliquias.length} reliquias`);
  assert.deepEqual(marcas.reliquias[0], { col: 6, row: 1 }, 'a relíquia colada não foi a escolhida');
  assert.equal(marcas.perigos.length, 0, 'o nível 2 não deveria inventar perigo');
});

test('o nível 2 olha a duas casas quando não há nada colado na rota', () => {
  // Relíquia é rara. Uma única passada deixaria a melhoria em branco na maioria das
  // caves, e uma melhoria que não mostra nada parece quebrada.
  const mapa = mapaVazio(14, 10);
  const rota = rotaNaLinhaZero(14);

  por(mapa.tiles[2][7], createRelicContent('amber_fang'));

  const reliquias = marcasDoCaminhoSeguro(mapa, rota, 2).reliquias;

  assert.deepEqual(reliquias, [{ col: 7, row: 2 }], 'a relíquia a duas casas não apareceu');
});

test('o nível 2 não marca relíquia a três ou mais casas da rota', () => {
  const mapa = mapaVazio(14, 10);
  const rota = rotaNaLinhaZero(14);

  por(mapa.tiles[3][7], createRelicContent('amber_fang'));
  por(mapa.tiles[9][13], createRelicContent('frost_bloom'));

  assert.deepEqual(marcasDoCaminhoSeguro(mapa, rota, 2).reliquias, [], 'revelou relíquia longe');
});

test('o nível 2 tem teto, porque "perto" não pode virar "todas"', () => {
  const mapa = mapaVazio(20, 6);
  const rota = rotaNaLinhaZero(20);

  // Seis relíquias coladas na rota. O pedido é "oportunidades de pequenos desvios", e
  // seis setas apontando relíquia ao mesmo tempo é um mapa de relíquias.
  for (const col of [3, 5, 7, 9, 11, 13]) {
    por(mapa.tiles[1][col], createRelicContent('amber_fang'));
  }

  const reliquias = marcasDoCaminhoSeguro(mapa, rota, 2).reliquias;

  assert.equal(reliquias.length, RELIQUIAS_NO_MAXIMO, `marcou ${reliquias.length}`);
});

test('o nível 1 não marca relíquia, e o nível 2 também traz os perigos', () => {
  const mapa = mapaVazio(12, 6);
  const rota = rotaNaLinhaZero(12);

  por(mapa.tiles[1][3], 'bomb');
  por(mapa.tiles[1][7], createRelicContent('amber_fang'));

  const um = marcasDoCaminhoSeguro(mapa, rota, 1);
  const dois = marcasDoCaminhoSeguro(mapa, rota, 2);

  assert.equal(um.perigos.length, 1, 'o nível 1 perdeu o perigo');
  assert.deepEqual(um.reliquias, [], 'o nível 1 marcou relíquia');
  assert.equal(dois.perigos.length, 1, 'o nível 2 perdeu o perigo do nível 1');
  assert.equal(dois.reliquias.length, 1, 'o nível 2 perdeu a relíquia');
});

// --- o desvio ---------------------------------------------------------------

test('o nível 3 aponta o desvio até uma relíquia colada na rota', () => {
  const mapa = mapaVazio(12, 6);
  const rota = rotaNaLinhaZero(12);

  por(mapa.tiles[1][6], createRelicContent('amber_fang'));

  const { desvio } = marcasDoCaminhoSeguro(mapa, rota, 3);

  assert.ok(desvio, 'o nível 3 não desenhou desvio para uma relíquia colada');
  assert.deepEqual(desvio.reliquia, { col: 6, row: 1 }, 'a relíquia não é a marcada');
  assert.equal(desvio.tiles.length, 1, `o desvio andou ${desvio.tiles.length} tiles`);

  // A âncora é um tile **da rota**, não qualquer vizinho. E não é o de cima: num mapa
  // isométrico o vizinho da direita também é adjacente, e é o que menos alonga o
  // caminho até a saída — que é o critério do nível 3.
  assert.ok(
    rota.some((p) => p.col === desvio.ancora.col && p.row === desvio.ancora.row),
    `a ancora ${JSON.stringify(desvio.ancora)} não está na rota`
  );

  assert.ok(
    desvio.ancora.col >= desvio.reliquia.col,
    `a ancora ${desvio.ancora.col} mandou a pessoa voltar para tras do desvio`
  );
});

test('o desvio não passa por cima de bomba', () => {
  // Um desvio que apontasse por uma bomba seria um caminho que mata, que é o contrário
  // de "relativamente seguro".
  const mapa = mapaVazio(12, 8);
  const rota = rotaNaLinhaZero(12);

  // A relíquia está colada na rota em (9,1), mas o caminho mais curto de (9,0) passa
  // por cima de (9,1) direto — o que não é bomba. Para testar o bloqueio, a relíquia
  // fica longe e a bomba no meio do caminho curto.
  por(mapa.tiles[1][3], 'bomb');
  por(mapa.tiles[1][7], 'bomb');
  por(mapa.tiles[1][9], createRelicContent('amber_fang'));

  const { desvio } = marcasDoCaminhoSeguro(mapa, rota, 3);

  assert.ok(desvio, 'o nível 3 não achou desvio');

  for (const passo of desvio.tiles) {
    const conteudo = mapa.tiles[passo.row][passo.col].hiddenContent;

    assert.notEqual(conteudo, 'bomb', `o desvio passou pela bomba em ${passo.col},${passo.row}`);
  }
});

test('o desvio é curto: o número de passos tem teto', () => {
  const mapa = mapaVazio(24, 24);
  const rota = rotaNaLinhaZero(24);

  // Relíquia longe, atrás de um corredor: o desvio existe, e é curto ou não existe.
  por(mapa.tiles[6][20], createRelicContent('amber_fang'));

  const { desvio } = marcasDoCaminhoSeguro(mapa, rota, 3);

  if (desvio) {
    assert.ok(
      desvio.tiles.length <= PASSOS_MAXIMOS_DO_DESVIO,
      `o desvio andou ${desvio.tiles.length} tiles, e o teto e ${PASSOS_MAXIMOS_DO_DESVIO}`
    );
  }
});

test('a âncora do desvio é a mais próxima da saída, e não a mais próxima da entrada', () => {
  // Quem desvia no fim da rota já vai passar por ali de qualquer jeito. Quem desvia no
  // começo precisa voltar pela rota inteira depois — que é a "rota nova até a relíquia"
  // que o nível 3 promete não criar.
  const mapa = mapaVazio(20, 8);
  const rota = rotaNaLinhaZero(20);

  por(mapa.tiles[1][2], createRelicContent('amber_fang'));
  por(mapa.tiles[1][17], createRelicContent('frost_bloom'));

  const { desvio } = marcasDoCaminhoSeguro(mapa, rota, 3);

  assert.ok(desvio, 'nenhum desvio apesar das duas relíquias');
  // A relíquia colada na saída foi a escolhida, e não a da entrada. A âncora pode ser a
  // vizinha da direita em vez da de cima, porque é a mesma casa de distância da relíquia
  // e não obriga a voltar depois do desvio.
  assert.equal(
    desvio.reliquia.col,
    17,
    `o desvio apontou para a coluna ${desvio.reliquia.col} em vez da relíquia da saída`
  );

  assert.ok(
    desvio.ancora.col >= 17,
    `a ancora ${desvio.ancora.col} está antes da relíquia da saída, e alonga o caminho`
  );
});

test('o nível 3 devolve desvio nulo numa cave sem relíquia', () => {
  // O caso comum. Um desenho vazio na tela parece falha; `null` é o que a cena usa para
  // não desenhar nada.
  const mapa = mapaVazio(14, 8);
  const rota = rotaNaLinhaZero(14);

  por(mapa.tiles[1][4], 'bomb');

  const marcas = marcasDoCaminhoSeguro(mapa, rota, 3);

  assert.equal(marcas.desvio, null, 'desenhou desvio sem relíquia');
  assert.equal(marcas.perigos.length, 1, 'e o perigo do nível 1 se perdeu');
});

test('a relíquia que está em cima da rota não vira desvio', () => {
  // Uma relíquia no tile da rota não está "perto" dela: está nela. O desvio não tem
  // sentido, e oferecer um seria mostrar um caminho que não sai da rota.
  const mapa = mapaVazio(12, 6);
  const rota = rotaNaLinhaZero(12);

  por(mapa.tiles[0][6], createRelicContent('amber_fang'));

  // O nome do destructuring é sem acento, e por um motivo: `relíquias` com acento é um
  // identificador diferente de `reliquias`, e o teste passava comparando `undefined` com
  // `[]` — reprovando com a mensagem de "marcou como próxima" em vez de dizer que a
  // variável estava errada. Identificador com acento é uma letra diferente do ponto de
  // vista do JavaScript.
  const { reliquias, desvio } = marcasDoCaminhoSeguro(mapa, rota, 3);

  assert.deepEqual(reliquias, [], 'a relíquia sobre a rota foi marcada como próxima');
  assert.equal(desvio, null, 'a relíquia sobre a rota virou desvio');
});

test('relíquia longe demais da rota não gera desvio', () => {
  // Ela nem entra na lista do nível 2, e o desvio usa essa lista. Sem este teste, um
  // desvio para o outro lado da cave passaria despercebido.
  const mapa = mapaVazio(14, 10);
  const rota = rotaNaLinhaZero(14);

  por(mapa.tiles[9][13], createRelicContent('amber_fang'));

  assert.equal(marcasDoCaminhoSeguro(mapa, rota, 3).desvio, null, 'desvio para relíquia distante');
  assert.deepEqual(reliquiasPertoDaRota(mapa, rota), [], 'a relíquia distante entrou na lista');
  assert.equal(desvioParaReliquia(mapa, rota, [{ col: 13, row: 9 }]), null, 'o desvio aceitou listaMentira');
});

// --- a compatibilidade com a rota de verdade --------------------------------

test('as marcas saem da rota que o jogo calcula, sem recalcular', () => {
  // `findSafeRoute` é a função de produção. As marcas têm de funcionar na lista que ela
  // devolve, e não numa lista feita à mão com outra forma.
  const mapa = mapaVazio(15, 10);

  mapa.entry = { col: 0, row: 5 };
  mapa.exit = { col: 14, row: 5 };

  // Muro de bombas com uma brecha: obriga a rota a fazer um desvio de verdade.
  for (let row = 0; row < 10; row += 1) {
    if (row === 7) continue;

    por(mapa.tiles[row][7], 'bomb');
  }

  por(mapa.tiles[6][9], createRelicContent('amber_fang'));

  const rota = findSafeRoute(mapa);

  assert.ok(rota, 'a rota de produção não achou a brecha');
  assert.ok(rota.length > 15, `a rota ficou reta (${rota.length} tiles), e o muro obrigava a curvar`);

  const marcas = marcasDoCaminhoSeguro(mapa, rota, 3);

  assert.ok(marcas.perigos.length > 0, 'nenhum perigo ao lado de uma rota que contorna um muro');
  assert.ok(marcas.reliquias.length > 0, 'a relíquia perto da rota não foi vista');
  assert.ok(marcas.desvio, 'a relíquia perto da rota não virou desvio');

  // E nada marcado está em cima de uma bomba que a rotaAvoidance... a rota é justamente
  // o caminho sem bomba, então nenhum tile dela é bomba.
  const naRota = new Set(rota.map((p) => `${p.col},${p.row}`));

  for (const perigo of marcas.perigos) {
    assert.ok(!naRota.has(`${perigo.col},${perigo.row}`), 'marcou como perigo um tile da rota');
  }
});

// --- o reconhecimento de conteúdo ------------------------------------------

test('reconhece os três tipos de hiddenContent sem confundir', () => {
  // `'empty'` é truthy. Reconhecer relíquia por truthiness marcaria todas as rochas
  // vazias da cave, e a tela viria cheia de setas para nada.
  const mapa = mapaVazio(4, 4);

  assert.equal(escondeReliquia(mapa.tiles[0][0]), false, "'empty' contou como relíquia");
  assert.equal(escondeReliquia({ hiddenContent: 'bomb' }), false, "'bomb' contou como relíquia");
  assert.equal(escondeReliquia({ hiddenContent: 'coin' }), false, "'coin' contou como relíquia");
  assert.equal(escondeReliquia({ hiddenContent: createRelicContent('amber_fang') }), true, 'a relíquia não foi reconhecida');
  assert.equal(escondeReliquia({}), false, 'tile sem hiddenContent');
  assert.equal(escondeReliquia(undefined), false, 'tile indefinido');
  assert.equal(escondeReliquia({ hiddenContent: null }), false, 'hiddenContent nulo');
});

test('o nível fora da faixa é limitado, e um nível quebrado não quebra a poção', () => {
  const mapa = mapaVazio(10, 5);
  const rota = rotaNaLinhaZero(10);

  por(mapa.tiles[1][4], createRelicContent('amber_fang'));

  for (const nivel of [99, -3, Number.NaN, undefined, 'dois']) {
    const marcas = marcasDoCaminhoSeguro(mapa, rota, nivel);

    assert.ok(Array.isArray(marcas.perigos), `nivel ${nivel} devolveu perigos quebrados`);
    assert.ok(Array.isArray(marcas.reliquias), `nivel ${nivel} devolveu reliquias quebradas`);
  }

  // Um nível editado para 99 não pode revelar mais que o nível máximo.
  const noMaximo = marcasDoCaminhoSeguro(mapa, rota, NIVEL_MAXIMO_CAMINHO);
  const acima = marcasDoCaminhoSeguro(mapa, rota, 99);

  assert.deepEqual(acima, noMaximo, 'nivel 99 revelou mais que o nivel maximo');
});

test('rota vazia não quebra a poção', () => {
  const mapa = mapaVazio(6, 4);

  por(mapa.tiles[1][2], 'bomb');

  for (const rota of [[], null, undefined]) {
    const marcas = marcasDoCaminhoSeguro(mapa, rota, 3);

    assert.deepEqual(marcas, { perigos: [], reliquias: [], desvio: null }, `rota ${rota} quebrou`);
  }
});
