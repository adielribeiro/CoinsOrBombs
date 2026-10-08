import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MELHORIAS_DE_PICARETA,
  PICARETA_MAXIMA,
  createImprovementState,
  pickaxeLevelDe
} from '../src/game/progression.js';
import { NIVEL_MAXIMO } from '../src/game/melhorias.js';
import { buildRewardCatalog } from '../src/game/rewards.js';
import { generateMap } from '../src/game/systems/mapGenerator.js';

/**
 * A picareta vai até o 10, e cada nível tem de valer alguma coisa.
 *
 * ## O bug que estes testes impedem de voltar
 *
 * Já aconteceu uma vez, com outro número. O `Math.min` do `apply` da picareta tinha
 * um `5` escrito dentro, e o catálogo foi estendido para 7 níveis. O resultado foi
 * "Picareta 05", "Picareta 06" e "Picareta 07" aparecerem no lobby, serem
 * escolhidas, e não mudarem nada: eram **cartas mortas**. Nenhum teste pegou, porque
 * nenhum comparava o teto do catálogo com o teto do `apply`.
 *
 * Agora a esticar a picareta é uma linha. Se alguém subir `MELHORIAS_DE_PICARETA` de
 * novo e esquecer o `Math.min`, os testes abaixo reprovam — e a falha aparece no
 * `npm test`, não depois de uma partida.
 */

const tFalso = (chave) => chave;

/** Uma picareta no nível de melhoria `n`. */
function comPicareta(n) {
  return {
    ...createImprovementState(),
    pickaxeUpgradeLevel: n,
    pickaxeLevel: pickaxeLevelDe(n),
    pickaxePower: pickaxeLevelDe(n)
  };
}

// --- o teto tem um lugar só -----------------------------------------------

test('o teto e um numero so, e a picareta maxima vem dele', () => {
  // O teto tem duas parcelas: as 9 melhorias do catálogo de cartas e os 3 níveis da
  // melhoria de relíquia. As duas somam, e o teto acompanha — senão comprar a melhoria
  // de relíquia não mudaria nada e a pessoa pagaria por umaupgrade invisível.
  assert.equal(PICARETA_MAXIMA, MELHORIAS_DE_PICARETA + 1 + NIVEL_MAXIMO);

  // O total é 10: 6 níveis de carta mais 1 de base mais 3 de relíquia.
  //
  // Caiu de 13 por um motivo medido, e não por gosto. A pedra é aditiva, e a demanda
  // só passa de 11 na cave 21. Uma picareta 13 consome 12 pontos dela, então quem já
  // tinha a melhoria de relíquia no máximo quebrava pedra de 1 clique da cave 1 até a
  // cave 20 — um terço da campanha sem gastar nada.
  //
  // Baixar o teto **por carta** tira a saturação sem cortar o topo: numa run só dá
  // para chegar a 7, e os 3 que faltam vêm da relíquia, que é permanente entre runs.
  // Quem já comprou a melhoria continua vendo a pedra mais rápida; ela só deixa de
  // apagar a curva.
  assert.equal(PICARETA_MAXIMA, 10, 'a picareta maxima mudou de 10');
  assert.equal(MELHORIAS_DE_PICARETA, 6, 'o numero de melhorias mudou de 6');
});

test('a picareta vai do 1 ao 10, um nivel por melhoria', () => {
  for (let nivel = 0; nivel <= MELHORIAS_DE_PICARETA; nivel += 1) {
    assert.equal(pickaxeLevelDe(nivel), 1 + nivel, `melhoria ${nivel} deu outra coisa`);
  }
});

// --- nenhuma carta morta --------------------------------------------------

test('o catalogo oferece a proxima carta a cada nivel, e uma por vez', () => {
  // O catálogo não guarda as 9 cartas da picareta: ele guarda **a próxima**, uma
  // por trilha, como as outras. Então o teste caminha o nível e confere que a carta
  // oferecida é a do nível certo — do 1 ao 9, e nenhuma acima disso.
  for (let nivel = 0; nivel < MELHORIAS_DE_PICARETA; nivel += 1) {
    const cartas = buildRewardCatalog(comPicareta(nivel), tFalso)
      .filter((r) => r.track === 'pickaxe');

    assert.equal(cartas.length, 1, `no nível ${nivel} há ${cartas.length} cartas de picareta`);
    assert.equal(
      cartas[0].id,
      `pickaxe_${nivel + 1}`,
      `no nível ${nivel} o catálogo ofereceu ${cartas[0].id}`
    );
  }
});

test('nenhuma carta de picareta e morta', () => {
  // O teste que teria pegado o bug antigo. Cada carta é **aplicada** e conferida
  // que a força subiu de verdade. Uma carta morta é uma que aparece, é escolhida e
  // não muda nada — e é exatamente isso que esta linha reprova.
  for (let nivel = 0; nivel < MELHORIAS_DE_PICARETA; nivel += 1) {
    const antes = comPicareta(nivel);
    const carta = buildRewardCatalog(antes, tFalso).find((r) => r.track === 'pickaxe');

    assert.ok(carta, `não há carta de picareta para a melhoria ${nivel}`);

    const depois = carta.apply(antes);

    assert.equal(
      depois.pickaxePower,
      antes.pickaxePower + 1,
      `a carta "${carta.name}" não aumentou a força: ficou em ${depois.pickaxePower}`
    );
    assert.equal(
      depois.pickaxeLevel,
      antes.pickaxeLevel + 1,
      `a carta "${carta.name}" não aumentou o nível: ficou em ${depois.pickaxeLevel}`
    );
    assert.equal(depois.pickaxeUpgradeLevel, nivel + 1);
  }
});

test('o teto do apply e o mesmo teto do catalogo', () => {
  // A causa raiz do bug antigo: duas fontes de verdade. Aqui a comparação é
  // explícita — o `apply` não pode saturar antes do catálogo parar de oferecer.
  let nivel = 0;

  while (nivel < MELHORIAS_DE_PICARETA) {
    const carta = buildRewardCatalog(comPicareta(nivel), tFalso).find((r) => r.track === 'pickaxe');

    if (!carta) break;

    const forcaDepois = carta.apply(comPicareta(nivel)).pickaxePower;
    const forcaEsperada = nivel + 2;

    assert.equal(
      forcaDepois,
      forcaEsperada,
      `a carta "${carta.name}" parou em ${forcaDepois} e o catálogo ainda esperava `
        + `${forcaEsperada}. É carta morta: sobe o número, não o efeito.`
    );

    nivel += 1;
  }
});

test('nao ha carta de picareta acima da maxima', () => {
  const cartas = buildRewardCatalog(comPicareta(MELHORIAS_DE_PICARETA), tFalso)
    .filter((r) => r.track === 'pickaxe');

  assert.equal(cartas.length, 0, `a picareta no máximo ainda oferece ${cartas.length} carta(s)`);
});

// --- cada nivel tem de mudar o jogo de verdade ----------------------------

test('cada nivel a mais tira um clique da rocha mais profunda', () => {
  // O "aumentando também a força" precisa ter efeito, e não só um número maior na
  // HUD. A pedra mais difícil do jogo é a da cave 60 com a picareta mais fraca; o
  // teste compara essa pedra com a picareta no máximo.
  const hp = (cave, forca) =>
    generateMap(cave, forca).tiles.flat().find((t) => t.type === 'rock' && !t.environment)?.hp;

  const forte = hp(60, PICARETA_MAXIMA);
  const fraco = hp(60, 1);

  assert.ok(Number.isFinite(forte), 'a pedra da cave 60 não tem hp');
  assert.ok(
    forte < fraco,
    `a picareta no máximo (${forte}) não é mais forte que a picareta 1 (${fraco})`
  );
});

test('nenhum nivel da picareta e inerte na cave mais funda', () => {
  // Subir um nível e não tirar um clique é a mesma carta morta, vista pelo lado do
  // jogo. Aqui cada degrau da escala tem de valer exatamente um clique lá no fundo,
  // onde é que a picareta é testada de verdade.
  const hpNa = (forca) =>
    generateMap(60, forca).tiles.flat().find((t) => t.type === 'rock' && !t.environment)?.hp;

  for (let forca = 1; forca < PICARETA_MAXIMA; forca += 1) {
    assert.equal(
      hpNa(forca + 1),
      hpNa(forca) - 1,
      `da força ${forca} para ${forca + 1} o clique não mudou: ${hpNa(forca)} -> ${hpNa(forca + 1)}`
    );
  }
});

test('mesmo na primeira caverna, a picareta maxima ainda vale alguma coisa', () => {
  // Na cave 1 a pedra já é de 1 clique com qualquer picareta acima de 5, e é por
  // isso que o teste de "cada nível vale um clique" roda na cave 60. Aqui está a
  // confirmação de que o teto não inverte o jogo: ele nunca piora a pedra.
  const hpNaPrimeira = (forca) =>
    generateMap(1, forca).tiles.flat().find((t) => t.type === 'rock' && !t.environment)?.hp;

  const fraco = hpNaPrimeira(1);
  const forte = hpNaPrimeira(PICARETA_MAXIMA);

  assert.ok(forte <= fraco, `a picareta maxima piorou a pedra na cave 1: ${fraco} -> ${forte}`);
});
