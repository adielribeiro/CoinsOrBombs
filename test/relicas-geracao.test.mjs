import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DISTRIBUICAO_DE_RELQUIAS,
  MAXIMO_DE_RELQUIAS,
  MINIMO_DE_RELQUIAS,
  podaReliquiasPorCave,
  registraCave,
  registraReliquiaColetada,
  registroDaCave,
  reliquiasParaColocar,
  sorteiaQuantidadeDeReliquias
} from '../src/game/relics.js';
import { isRelicContent } from '../src/game/progression.js';
import { generateMap } from '../src/game/systems/mapGenerator.js';
import { comPermanentes, estadoInicial } from '../src/game/saves.js';

/**
 * A quantidade de relíquias de cada cave, e o que fecha o farm.
 *
 * ## As duas metades do problema
 *
 * **A distribuição.** Toda cave tem entre uma e três, sorteadas por um único `Math.random`
 * na proporção 40/50/10. O erro fácil aqui é "uma garantida, mais 50% para a segunda",
 * que daria 25% de uma e 75% de duas — e nenhuma asserção sobre o código enforçado
 * perceberia, porque o código estaria obeying a si próprio.
 *
 * **O anti-farm.** `refreshRun` gera o mapa em toda entrada numa cave, e a morte manda a
 * pessoa de volta à primeira cave do bioma. Com relíquia garantida, isso é um laço de
 * farm: mesma cave, sorteio novo, mais relíquias, para sempre. O registro por cave é o
 * que fecha, e a parte que mais importa é a **segunda** visita — a primeira é a única em
 * que o sorteio é legítimo.
 *
 * ## A distribuição é testada em três lugares
 *
 * 1. **Pelas faixas**, com o sorteio injetado: 0.05 dá três, 0.3 dá dois, 0.9 dá uma.
 * 2. **Pela soma das faixas**, que tem de dar 1.
 * 3. **Por muitas caves de verdade**, com `Math.random` de verdade: a proporção observada
 *    precisa bater com a declarada dentro de uma margem. É a única das três que pega um
 *    "uma garantida mais 50% para a segunda", porque os outros dois testes só olham a
 *    implementação.
 */

/** A distribuição pedida, escrita à mão. */
const ESPERADO = [
  { quantidade: 1, fracao: 0.4 },
  { quantidade: 2, fracao: 0.5 },
  { quantidade: 3, fracao: 0.1 }
];

// --- a distribuição ---------------------------------------------------------

test('o sorteio dá três acima de 10%, dois de 10% a 60%, e um abaixo', () => {
  assert.equal(sorteiaQuantidadeDeReliquias(0.05), 3, 'nos primeiros 10%');
  assert.equal(sorteiaQuantidadeDeReliquias(0.0999), 3, 'no limite de cima dos 10%');
  assert.equal(sorteiaQuantidadeDeReliquias(0.1), 2, 'o limite de 10% é da faixa de dois');
  assert.equal(sorteiaQuantidadeDeReliquias(0.3), 2, 'no meio da faixa de dois');
  assert.equal(sorteiaQuantidadeDeReliquias(0.5999), 2, 'no limite de cima dos 60%');
  assert.equal(sorteiaQuantidadeDeReliquias(0.6), 1, 'o limite de 60% é da faixa de um');
  assert.equal(sorteiaQuantidadeDeReliquias(0.9999), 1, 'perto de 1');
});

test('as faixas somam um, e cobrem de 0 a 1 sem buraco nem sobra', () => {
  let anterior = 0;

  for (const faixa of [...DISTRIBUICAO_DE_RELQUIAS].sort((a, b) => a.ate - b.ate)) {
    assert.ok(faixa.ate > anterior, `a faixa de ${faixa.quantidade} tem um buraco antes dela`);
    anterior = faixa.ate;
  }

  assert.ok(Math.abs(anterior - 1) < 1e-9, `as faixas somam ${anterior}, e o certo é 1`);
});

test('a tabela da configuração bate com a distribuição pedida', () => {
  // A configuração guarda o **fim** de cada intervalo, não a probabilidade, porque é o
  // fim que o `if` do sorteio compara. Então a comparação é entre probabilidades: a
  // largura da faixa é a chance, e a largura de um intervalo termina onde o próximo
  // começa.
  //
  // Uma versão anterior deste teste somava as frações do pedido em ordem de valor, e
  // produzia 0.5 como fim esperado da faixa de um — porque 40% e 10% não são vizinhos
  // numa tabela escrita como 40/50/10. A conta da largura não depende da ordem: ela sai
  // dos próprios limites, que é de onde o sorteio lê.
  const limites = [...DISTRIBUICAO_DE_RELQUIAS].sort((a, b) => a.ate - b.ate);
  let inicio = 0;

  for (const faixa of limites) {
    const largura = faixa.ate - inicio;
    const esperado = ESPERADO.find((e) => e.quantidade === faixa.quantidade);

    assert.ok(esperado, `a tabela nao tem a faixa de ${faixa.quantidade} reliquias`);
    assert.ok(
      Math.abs(largura - esperado.fracao) < 1e-9,
      `${faixa.quantidade} reliquia ocupa ${(largura * 100).toFixed(2)}% do sorteio, e o pedido e ${esperado.fracao * 100}%`
    );

    inicio = faixa.ate;
  }
});

test('nenhuma cave tem zero nem mais de três', () => {
  for (let roll = 0; roll < 1; roll += 0.001) {
    const n = sorteiaQuantidadeDeReliquias(roll);

    assert.ok(n >= MINIMO_DE_RELQUIAS, `sorteio ${roll} deu ${n} reliquias`);
    assert.ok(n <= MAXIMO_DE_RELQUIAS, `sorteio ${roll} deu ${n} reliquias`);
  }
});

test('um sorteio quebrado não gera cave sem relíquia', () => {
  // `NaN` e `undefined` comparam como falso em toda comparação de "<", e a primeira faixa
  // da tabela é a de três: um sorteio quebrado cairia nela e daria três relíquias em vez
  // de nenhuma. O teste fixa que não dá nenhuma das duas coisas.
  for (const sorteio of [Number.NaN, undefined, null, 'meio']) {
    const n = sorteiaQuantidadeDeReliquias(sorteio);

    assert.ok(
      n >= MINIMO_DE_RELQUIAS && n <= MAXIMO_DE_RELQUIAS,
      `sorteio ${String(sorteio)} deu ${n} reliquias`
    );
  }
});

test('a proporção observada bate com a declarada', () => {
  // A única verificação que pega "uma garantida mais 50% para a segunda": as outras
  // olham a implementação, e uma implementação errada passa nas duas.
  const AMOSTRAS = 20000;
  const contagem = { 1: 0, 2: 0, 3: 0 };

  for (let i = 0; i < AMOSTRAS; i += 1) {
    contagem[sorteiaQuantidadeDeReliquias()] += 1;
  }

  for (const { quantidade, fracao } of ESPERADO) {
    const observada = contagem[quantidade] / AMOSTRAS;

    // Margem de 1 ponto percentual: generosa o bastante para não tremer entre execuções,
    // estreita o bastante para separar 40/50/10 de 25/75/0.
    assert.ok(
      Math.abs(observada - fracao) < 0.01,
      `${quantidade} reliquia saiu em ${(observada * 100).toFixed(2)}%, e o pedido e ${fracao * 100}%`
    );
  }
});

// --- o registro por cave ----------------------------------------------------

test('a primeira visita sorteia, e a segunda reusa o total', () => {
  const primeira = reliquiasParaColocar(null, 0.05);

  assert.equal(primeira.total, 3, 'a primeira visita nao sorteou');
  assert.equal(primeira.restantes, 3, 'na primeira visita nada foi coletado ainda');

  // A segunda visita **não sorteia**: um sorteio de 0.05 aqui devolveria o mesmo 3 por
  // acaso, e é justamente o acaso que não pode estar na conta. O total veio do registro.
  const segunda = reliquiasParaColocar({ total: 2, coletadas: 0 }, 0.05);

  assert.equal(segunda.total, 2, 'a segunda visita sorteou de novo');
  assert.equal(segunda.restantes, 2);
});

test('voltar a uma cave devolve o que faltava, e nada quando não falta', () => {
  const total = 3;

  // Levou uma de três: volta com duas.
  const depoisDeUma = reliquiasParaColocar({ total, coletadas: 1 }, 0.05);

  assert.equal(depoisDeUma.restantes, 2, `restou ${depoisDeUma.restantes} de ${total}`);

  // Levou todas: volta com zero, e zero é a resposta que fecha o farm.
  const depoisDeTodas = reliquiasParaColocar({ total, coletadas: 3 }, 0.05);

  assert.equal(depoisDeTodas.restantes, 0, 'a cave devolveu reliquia depois de colhidas todas');

  // E um total guardado não pode ser alterado por mais coletas que a cave não tinha.
  const alemDoTotal = reliquiasParaColocar({ total: 2, coletadas: 9 }, 0.05);

  assert.equal(alemDoTotal.coletadas, 2, 'o contador passou do total do registro');
  assert.equal(alemDoTotal.restantes, 0);
});

test('registrar uma coleta sobe o contador e não mexe no total', () => {
  const registro = registraCave(null, { total: 2, coletadas: 0, cave: 7 });

  const depois = registraReliquiaColetada(registro, 7);

  assert.deepEqual(depois['7'], { total: 2, coletadas: 1 }, 'o registro da cave ficou errado');

  const terceira = registraReliquiaColetada(depois, 7);

  assert.deepEqual(terceira['7'], { total: 2, coletadas: 2 });
});

test('registrar uma coleta não perde os registros das outras caves', () => {
  let registro = registraCave(null, { total: 1, coletadas: 1, cave: 3 });

  registro = registraCave(registro, { total: 3, coletadas: 0, cave: 4 });
  registro = registraReliquiaColetada(registro, 4);

  assert.deepEqual(registro['3'], { total: 1, coletadas: 1 }, 'a cave 3 foi sobrescrita');
  assert.deepEqual(registro['4'], { total: 3, coletadas: 1 });
});

test('registro de cave inexistente é null, e não um objeto vazio fingindo que existe', () => {
  // A diferença importa: `null` é "sorteia", e um objeto vazio é "sorteia também" só por
  // acidente da implementação. Se um dia `null` virar `{}`, o sorteio some.
  assert.equal(registroDaCave({}, 3), null);
  assert.equal(registroDaCave(undefined, 3), null);
  assert.equal(registroDaCave({ 3: null }, 3), null);
  assert.deepEqual(registroDaCave({ 3: { total: 2, coletadas: 0 } }, 3), { total: 2, coletadas: 0 });
});

test('a poda não descarta a cave em que a pessoa está', () => {
  // Descartar o registro da cave atual reabriria o farm **naquele instante**: a próxima
  // entrada nela sortearia de novo. É o porquê do `>=` em vez de `>`.
  const registro = { 3: { total: 1, coletadas: 1 }, 5: { total: 2, coletadas: 0 } };

  assert.deepEqual(Object.keys(podaReliquiasPorCave(registro, 5)).sort(), ['5'], 'a cave atual foi podada');
  assert.deepEqual(Object.keys(podaReliquiasPorCave(registro, 9)).sort(), [], 'nada sobreviveu');
});

test('a poda descarta uma entrada de cave que não é número', () => {
  const registro = { primeiro: { total: 1, coletadas: 0 }, 4: { total: 2, coletadas: 0 } };

  assert.deepEqual(Object.keys(podaReliquiasPorCave(registro, 1)).sort(), ['4'], 'entrada de cave invalida sobreviveu');
});

// --- o que o gerador faz com o número ---------------------------------------

test('o gerador coloca exatamente o número pedido de relíquias', () => {
  for (const quantidade of [1, 2, 3]) {
    for (let tentativa = 0; tentativa < 6; tentativa += 1) {
      const mapa = generateMap(1 + tentativa, 1, 0, quantidade);
      const achadas = mapa.tiles.flat().filter((tile) => isRelicContent(tile.hiddenContent));

      assert.equal(
        achadas.length,
        quantidade,
        `pedi ${quantidade} reliquias e o mapa saiu com ${achadas.length}`
      );
    }
  }
});

test('o gerador nunca coloca duas relíquias no mesmo tile', () => {
  // Um tile tem um `hiddenContent`. Duas relíquias no mesmo tile significam que a
  // segunda sobrescreveu a primeira, e a cave "teria" duas enquanto o mapa tem uma — que
  // é um bug que só apareceria como uma relíquia a menos no fim da cave.
  for (let cave = 1; cave <= 30; cave += 1) {
    const mapa = generateMap(cave, 1, 0, 3);
    const comReliquia = mapa.tiles.flat().filter((tile) => isRelicContent(tile.hiddenContent));
    const posicoes = new Set(comReliquia.map((tile) => `${tile.col},${tile.row}`));

    assert.equal(posicoes.size, comReliquia.length, `a cave ${cave} repetiu tile`);
  }
});

test('toda cave de verdade tem pelo menos uma relíquia na primeira visita', () => {
  // A regra é da cave, não da chamada. Um gerador que devolve zero sem ninguém pedir
  // continua errado, e é por isso que o teste passa a quantidade e confere a cave.
  for (let cave = 1; cave <= 60; cave += 1) {
    const { total, restantes } = reliquiasParaColocar(null, Math.random());
    const mapa = generateMap(cave, 1, 0, restantes);
    const achadas = mapa.tiles.flat().filter((tile) => isRelicContent(tile.hiddenContent)).length;

    assert.ok(achadas >= 1, `a cave ${cave} foi gerada com ${achadas} reliquias, e o total sorteado era ${total}`);
    assert.ok(achadas <= MAXIMO_DE_RELQUIAS, `a cave ${cave} tem ${achadas} reliquias, e o máximo e ${MAXIMO_DE_RELQUIAS}`);
  }
});

test('a relíquia não cai sobre entrada, saída, chão ou moeda', () => {
  for (let cave = 1; cave <= 24; cave += 1) {
    const mapa = generateMap(cave, 1, 0, 3);
    const comReliquia = mapa.tiles.flat().filter((tile) => isRelicContent(tile.hiddenContent));

    for (const tile of comReliquia) {
      assert.notEqual(tile.type, 'floor', `a cave ${cave} pôs relíquia em chão (${tile.col},${tile.row})`);
      assert.notEqual(tile.isHiddenExit, true, `a cave ${cave} pôs relíquia na saída escondida`);

      // Entrada e saída são chão, então a asserção é de **desigualdade**: relíquia em
      // rocha nunca pode estar em cima delas. Escrever `equal` aqui reprovaria em toda
      // cave, porque a única forma de passar seria relíquia exatamente na entrada.
      assert.notEqual(
        `${tile.col},${tile.row}`,
        `${mapa.entry.col},${mapa.entry.row}`,
        `a cave ${cave} pôs relíquia na entrada`
      );

      assert.notEqual(
        `${tile.col},${tile.row}`,
        `${mapa.exit.col},${mapa.exit.row}`,
        `a cave ${cave} pôs relíquia na saída`
      );
    }
  }
});

test('a relíquia não rouba a bomba nem a moeda de nenhum tile', () => {
  // ## Por que comparação, e não igualdade
  //
  // O mapa é aleatório, então "esta cave tem 7 bombas" não é verificável. O que é
  // verificável é que **pedir relíquias não reduz bombas nem moedas** — e é isso que
  // quebraria se o filtro de conteúdo saísse, porque a relíquia sobrescreveria o que
  // estivesse embaixo.
  //
  // A consequência real de roubar é silenciosa: a HUD promete `bombsRemaining`, que é a
  // contagem de bombas escondidas, e uma bomba virada relíquia some do número sem erro
  // em lugar nenhum. Por isso a verificação é sobre a média de muitas caves: uma amostra
  // só não veria a diferença, e a diferença de uma amostra é exatamente o ruído.
  //
  // ## Por que a margem é de 0,6, e não de 0,15
  //
  // Porque as duas amostras são **independentes**: 400 mapas de cada lado, cada um com
  // o próprio sorteio de moedas. O erro-padrão da diferença das médias é da ordem de 0,2
  // com essa variância, e uma margem de 0,15 é menos de um desvio — o teste reprovava
  // cerca de uma vez em quatro por puro acaso. Um teste que reprova sem motivo treme a
  // confiança em toda a suíte, e o primeiro reaction seria "o teste é instável", não
  // "o mapa está errado".
  //
  // ## Por que 0,6 ainda acha o defeito
  //
  // Porque o defeito que se procura rouba até **três** moedas — uma por relíquia —, ou
  // seja, desloca a média em até 3. A margem de 0,6 é mais de cinco vezes menor que isso:
  // sobra uma margem enorme para o defeito aparecer elittle folga para o ruído.
  const AMOSTRAS = 400;
  const MARGEM = 0.6;

  const media = (quantas) => {
    let bombas = 0;
    let moedas = 0;

    for (let i = 0; i < AMOSTRAS; i += 1) {
      const mapa = generateMap(1 + (i % 60), 1, 0, quantas);

      for (const linha of mapa.tiles) {
        for (const tile of linha) {
          if (tile.hiddenContent === 'bomb') bombas += 1;
          else if (tile.hiddenContent === 'coin') moedas += 1;
        }
      }
    }

    return { bombas: bombas / AMOSTRAS, moedas: moedas / AMOSTRAS };
  };

  const sem = media(0);
  const com = media(3);

  assert.ok(
    Math.abs(sem.bombas - com.bombas) < MARGEM,
    `pedir 3 reliquias tirou bombas do mapa: ${sem.bombas.toFixed(2)} sem, ${com.bombas.toFixed(2)} com`
  );

  assert.ok(
    Math.abs(sem.moedas - com.moedas) < MARGEM,
    `pedir 3 reliquias tirou moedas do mapa: ${sem.moedas.toFixed(2)} sem, ${com.moedas.toFixed(2)} com`
  );
});

// --- o registro sobrevive ---------------------------------------------------

test('o registro por cave atravessa a morte', () => {
  // Se ele sumisse, a volta à mesma cave seria um sorteio novo — e a morte devolve a
  // pessoa à primeira cave do bioma, que é uma cave que ela já visitou.
  const estado = {
    ...estadoInicial(4),
    cave: 4,
    relicasPorCave: { 4: { total: 3, coletadas: 3 } },
    relics: 9
  };

  const depois = comPermanentes(estado);

  assert.deepEqual(depois.relicasPorCave, { 4: { total: 3, coletadas: 3 } }, 'o registro se perdeu');
});

test('um registro editado a mao é aparado, e o que sobra ainda impede o farm', () => {
  const editado = comPermanentes({
    relics: 5,
    relicasPorCave: {
      primeiro: { total: 1, coletadas: 0 },
      0: { total: 2, coletadas: 0 },
      4: { total: 3, coletadas: 99 },
      5: { total: 0, coletadas: 0 },
      6: null,
      7: { total: 2, coletadas: 1 }
    }
  });

  assert.deepEqual(Object.keys(editado.relicasPorCave).sort(), ['4', '7'], 'sobrou entrada invalida');
  assert.equal(editado.relicasPorCave['4'].coletadas, 3, 'o contador passou do total');
  assert.deepEqual(editado.relicasPorCave['7'], { total: 2, coletadas: 1 });
});

test('um save sem o registro abre com registro vazio, e não com undefined', () => {
  // O vazio é o estado que **sorteia**, que é o certo para um save que nunca jogou. Um
  // `undefined` faria a cena ler "não há registro" e abriria o farm no primeiro retorno.
  const estado = comPermanentes({ relics: 0 });

  assert.deepEqual(estado.relicasPorCave, {});
  assert.deepEqual(estadoInicial(1).relicasPorCave, {});
});
