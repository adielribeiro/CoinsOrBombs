import test from 'node:test';
import assert from 'node:assert/strict';

import { getRockHp, getMapSize } from '../src/game/systems/mapGenerator.js';
import { BIOMES, MELHORIAS_DE_PICARETA, PICARETA_MAXIMA, getBiomeForCave, pickaxeLevelDe } from '../src/game/progression.js';

/**
 * A curva de dificuldade, medida.
 *
 * ## Por que este arquivo existe
 *
 * Porque `getRockHp` morava num `function` privado e **nenhum teste o chamava**. A curva é a
 * parte do jogo que define se ele é difícil, e ela era a única que ninguém verificava.
 *
 * O defeito que este arquivo existe para pegar foi medido antes de ser consertado: com a
 * fórmula antiga (`max(1, 6 - picareta + ...)`), a pedra saía com **1 de HP nas caves 1 a 28**
 * com a picareta no teto de uma run, e nas caves 1 a 40 com a melhoria de relíquia no
 * máximo. Quarenta e sete por cento e sessenta e sete por cento do jogo sem a picareta
 * valer nada, e o sintoma que a pessoa relatava era "a partir da terceira cave fica fácil".
 *
 * ## O que os testes afirmam, e por quê
 *
 * Cada afirmação aqui é uma **propriedade da curva**, não um número solto. Se alguém
 * reconfigurar o balanceamento, o teste diz *qual* propriedade quebrou — e a propriedade
 * que quebra é sempre a mesma: a picareta tem que continuar valendo alguma coisa.
 */

const INDEX_DO_BIOMA = BIOMES.reduce((mapa, bioma, indice) => {
  mapa[bioma.id] = indice;

  return mapa;
}, {});

/** A resistência da rocha na cave, com a picareta dada. */
function hpNa(cave, pickaxe) {
  return getRockHp(pickaxe, cave, INDEX_DO_BIOMA[getBiomeForCave(cave).id]);
}

/** A picareta máxima que dá para alcançar **dentro de uma run**, sem melhoria de relíquia. */
const PICARETA_DE_RUN = pickaxeLevelDe(MELHORIAS_DE_PICARETA, 0);

const ULTIMA_CAVE = BIOMES[BIOMES.length - 1].endCave;

// --- a rampa nunca anda para trás --------------------------------------------

test('a pedra nunca fica mais fácil de uma cave para a seguinte', () => {
  // Vale para toda picareta, inclusive o teto. É a propriedade que impede o degrau para
  // baixo que existia quando a rampa usava a cave local do bioma.
  for (let pickaxe = 1; pickaxe <= PICARETA_MAXIMA; pickaxe += 1) {
    for (let cave = 2; cave <= ULTIMA_CAVE; cave += 1) {
      assert.ok(
        hpNa(cave, pickaxe) >= hpNa(cave - 1, pickaxe),
        `cave ${cave} com picareta ${pickaxe} ficou mais leve: ${hpNa(cave - 1, pickaxe)} -> ${hpNa(cave, pickaxe)}`
      );
    }
  }
});

test('cada bioma começa mais duro do que o anterior terminou', () => {
  // O degrau entre mundos é uma das coisas que dão a sensação de "outro jogo". Uma queda
  // na virada do bioma desfaz isso.
  for (let indice = 1; indice < BIOMES.length; indice += 1) {
    const anterior = BIOMES[indice - 1].endCave;
    const atual = BIOMES[indice].startCave;

    assert.ok(
      hpNa(atual, PICARETA_DE_RUN) >= hpNa(anterior, PICARETA_DE_RUN),
      `${BIOMES[indice].id} abre mais leve do que ${BIOMES[indice - 1].id} fechou`
    );
  }
});

// --- a picareta continua valendo alguma coisa --------------------------------

test('nenhum nível de picareta é inerte onde a pedra pesa mais de um clique', () => {
  // O invariante do projeto: carta de picareta que a pessoa paga e não vê diferença é
  // carta morta. Aqui vale em **toda** cave, e não só na mais funda.
  //
  // Onde a pedra já custa 1 clique a falta é do piso, não da picareta — e é por isso que a
  // afirmação é "onde a pedra pesa", e não "em toda cave". Com a fórmula antiga eram 50
  // níveis mortos, e quase todos no fundo, que é onde a picareta é testada de verdade.
  const inertes = [];

  for (let cave = 1; cave <= ULTIMA_CAVE; cave += 1) {
    for (let pickaxe = 1; pickaxe < PICARETA_MAXIMA; pickaxe += 1) {
      const antes = hpNa(cave, pickaxe);
      const depois = hpNa(cave, pickaxe + 1);

      if (antes <= 1) continue;

      if (depois !== antes - 1) {
        inertes.push(`cave ${cave}, picareta ${pickaxe}->${pickaxe + 1}: ${antes}->${depois}`);
      }
    }
  }

  assert.deepEqual(inertes, [], `niveis de picareta sem efeito:\n${inertes.join('\n')}`);
});

test('a trivialidade da pedra não passa do primeiro bioma, para quem joga do zero', () => {
  // O defeito que motivou a mudança: nas caves 1 a 28 a pedra ficava com 1 clique para quem
  // já tinha a picareta no teto de uma run.
  //
  // O limite é o **primeiro bioma**, e não zero. A picareta de uma run chega a 7 lá pela
  // cave 14, então na prática caves 1 a 10 com 7 é um cenário que não ocorre — mas a
  // propriedade é a que o jogo garante, e não a que uma run média produz.
  const trivial = [];

  for (let cave = 1; cave <= ULTIMA_CAVE; cave += 1) {
    if (hpNa(cave, PICARETA_DE_RUN) <= 1) trivial.push(cave);
  }

  const fimDoPrimeiroBioma = BIOMES[0].endCave;

  assert.ok(
    trivial.every((cave) => cave <= fimDoPrimeiroBioma),
    `pedra de um clique fora do primeiro bioma: ${trivial.join(', ')}`
  );
});

test('a campanha não passa de um terço da campanha trivial, nem com o teto comprado', () => {
  // Quem já tem a melhoria de relíquia no máximo começa o jogo acima do nível, e isso é
  // o certo — ele comprou. O limite aqui é só para atrivialidade não virar o jogo.
  const trivial = [];

  for (let cave = 1; cave <= ULTIMA_CAVE; cave += 1) {
    if (hpNa(cave, PICARETA_MAXIMA) <= 1) trivial.push(cave);
  }

  assert.ok(
    trivial.length <= ULTIMA_CAVE / 3,
    `${trivial.length} caves de um clique com a picareta no teto (${ULTIMA_CAVE / 3} e o limite)`
  );
});

// --- as pontas da curva ------------------------------------------------------

test('a cave 1 continua igual: cinco cliques com a picareta inicial', () => {
  // O começo do jogo não muda. Quem está aprendendo a ler o mapa precisa que a primeira
  // pedra não mude de preço junto com a curva.
  assert.equal(hpNa(1, 1), 5);
});

test('a última cave é de uma dúzia de cliques, e não de uma', () => {
  // O outro lado da curva: se a cave 60 for de 3 cliques, a campanha não teve nenhuma
  // progressão de esforço.
  assert.ok(
    hpNa(ULTIMA_CAVE, PICARETA_DE_RUN) >= 12,
    `a cave ${ULTIMA_CAVE} saiu com ${hpNa(ULTIMA_CAVE, PICARETA_DE_RUN)} cliques`
  );
});

// --- o custo total por caverna, que é o que a pessoa sente --------------------

test('dentro de um bioma, o esforço total só sobe', () => {
  // A pedra é uma parte do custo. A outra é quantas pedras tem, e o mapa **reinicia** a
  // cada bioma: a cave 10 é 9x9 e a cave 11 é 6x7, porque cada bioma é um mundo próprio.
  // Então o custo total cai na virada, e isso é desenho, não defeito.
  //
  // A propriedade é **dentro** do bioma. É nela que o defeito antigo aparecia de um jeito
  // pior: a rampa de resistência usava a cave local do bioma, e por isso o mundo inteiro
  // ficava mais leve a cada virada, e não só o reset do mapa.
  const pedrasEm = (cave) => {
    const { width, height } = getMapSize(cave);

    return width * height;
  };

  const custo = (cave, pickaxe) => pedrasEm(cave) * hpNa(cave, pickaxe);

  for (const pickaxe of [PICARETA_DE_RUN, PICARETA_MAXIMA]) {
    for (let cave = 2; cave <= ULTIMA_CAVE; cave += 1) {
      const mesmoBioma = getBiomeForCave(cave).id === getBiomeForCave(cave - 1).id;

      if (!mesmoBioma) continue;

      assert.ok(
        custo(cave, pickaxe) >= custo(cave - 1, pickaxe),
        `custo total caiu na cave ${cave} com picareta ${pickaxe}: ${custo(cave - 1, pickaxe)} -> ${custo(cave, pickaxe)}`
      );
    }
  }
});

test('a campanha custa pelo menos quatro vezes mais no fim do que no começo', () => {
  // Antes da mudança o custo total **caía** de 175 cliques na cave 1 para 74 na cave 20, e
  // só voltava a subir depois da 29. Uma variação de 8,5 vezes para os dois lados é o que
  // faz o meio do jogo parecer um buraco.
  const { width, height } = getMapSize(1);
  const custoInicial = width * height * hpNa(1, PICARETA_DE_RUN);

  const ultimo = getMapSize(ULTIMA_CAVE);
  const custoFinal = ultimo.width * ultimo.height * hpNa(ULTIMA_CAVE, PICARETA_DE_RUN);

  assert.ok(
    custoFinal >= custoInicial * 4,
    `a campanha grewu ${(custoFinal / custoInicial).toFixed(1)}x, e o alvo era 4x ou mais`
  );
});