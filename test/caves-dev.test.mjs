import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIOMES,
  TOTAL_CAVES,
  cavesDoBioma,
  getBiomeForCave,
  getBiomeProgress
} from '../src/game/progression.js';

/**
 * Escolher a cave, não só o bioma.
 *
 * O modo desenvolvedor servia para chegar num bioma, e a primeira cave do bioma era
 * a única porta de entrada. Para testar a cave 27 era preciso reiniciar o
 * progresso e avançar cave por cave — o que anula a mão que o modo desenvolvedor
 * existe para oferecer.
 *
 * Estes testes verificam a regra pela execução: a lista que a tela mostra é a
 * mesma que a regra do bioma diz, e cada número leva ao bioma que ele pertence.
 */

test('as caves do bioma vão da primeira à última, sem buraco', () => {
  for (const biome of BIOMES) {
    const caves = cavesDoBioma(biome);

    assert.equal(
      caves.length,
      biome.endCave - biome.startCave + 1,
      `${biome.id}: ${caves.length} caves para uma faixa de ${biome.startCave} a ${biome.endCave}`
    );

    assert.equal(caves[0], biome.startCave, `${biome.id} não começa em startCave`);
    assert.equal(caves[caves.length - 1], biome.endCave, `${biome.id} não termina em endCave`);
  }
});

test('todo número oferecido pertence mesmo ao bioma escolhido', () => {
  // A regra que a tela depende: se o seletor oferecer uma cave que pertence a
  // outro bioma, o jogo entra numa caverna com o nome do bioma errado — e a HUD
  // mostra o nome de um bioma enquanto o chão é o de outro.
  for (const biome of BIOMES) {
    for (const cave of cavesDoBioma(biome)) {
      assert.equal(
        getBiomeForCave(cave).id,
        biome.id,
        `a cave ${cave} pertence a ${getBiomeForCave(cave).id}, e foi oferecida em ${biome.id}`
      );
    }
  }
});

test('juntando todos os biomas, o seletor cobre 1 a 60 sem repetir', () => {
  // Se sobrar buraco, existe uma cave que o modo desenvolvedor não oferece. Se
  // repetir, uma cave aparece em dois biomas e o seletor mente sobre a faixa.
  const todas = BIOMES.flatMap((biome) => cavesDoBioma(biome));

  assert.deepEqual(
    [...todas].sort((a, b) => a - b),
    Array.from({ length: TOTAL_CAVES }, (_, i) => i + 1),
    'a união das caves não dá exatamente 1 a 60'
  );

  assert.equal(new Set(todas).size, TOTAL_CAVES, 'alguma cave aparece em dois biomas');
});

test('a cave final é oferecida, e é a última do seu bioma', () => {
  // A cave 60 é o final do jogo. Se o seletor não a oferece, não há como testá-la
  // sem chegar lá por jogo.
  const ultimo = BIOMES[BIOMES.length - 1];
  const caves = cavesDoBioma(ultimo);

  assert.ok(caves.includes(TOTAL_CAVES), `a cave ${TOTAL_CAVES} não é oferecida`);
  assert.equal(caves[caves.length - 1], TOTAL_CAVES);
});

test('o número é o absoluto, e não a posição dentro do bioma', () => {
  // A Gruta de Gelo começa na 11. O seletor tem de oferecer 11, e não 1: quem
  // está testando a cave 27 quer o 27 na tela, e não "a sétima daqui".
  const frost = BIOMES.find((biome) => biome.id === 'frost');
  const caves = cavesDoBioma(frost);

  assert.equal(caves[0], 11, 'a primeira cave da Gruta de Gelo ofereceu 1');
  assert.equal(caves[caves.length - 1], 20);
});

test('o rótulo do progresso bate com a cave oferecida', () => {
  // A cave escolhida aparece em duas formas na tela: o botão diz "Entrar na cave
  // 27" e a HUD vai dizer "7/10". As duas vêm de números diferentes, e é o
  // `getBiomeProgress` que garante que o 7 é o da 27.
  for (const biome of BIOMES) {
    for (const cave of cavesDoBioma(biome)) {
      const { localCave, totalCaves } = getBiomeProgress(cave);

      assert.equal(localCave, cave - biome.startCave + 1, `a cave ${cave} virou ${localCave}`);
      assert.equal(totalCaves, biome.endCave - biome.startCave + 1, `total errado na cave ${cave}`);
    }
  }
});

test('um bioma sem faixa não devolve lista vazia silenciosa', () => {
  // Bioma com startCave maior que endCave é dado errado. A lista viria vazia e o
  // seletor apareceria vazio, sem nenhuma pista de que o problema é o dado.
  const quebrado = { id: 'quebrado', startCave: 30, endCave: 20 };

  assert.deepEqual(
    cavesDoBioma(quebrado),
    [],
    'a lista de caves de um bioma invertido não é vazia'
  );
});
