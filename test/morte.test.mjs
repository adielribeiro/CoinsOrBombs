import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIOMES,
  TOTAL_CAVES,
  caveAoMorrer,
  getBiomeForCave,
  getBiomeStartCave
} from '../src/game/progression.js';

/**
 * A tabela de recomeço, bioma a bioma.
 *
 * ## Por que uma tabela escrita à mão, e não os próprios `BIOMES`
 *
 * Porque os testes acima já percorrem `BIOMES`, e comparar a regra contra `BIOMES`
 * prova que a regra é coerente com a tabela — não que a tabela é a que a pessoa pediu.
 * Se alguém mover `startCave` do bioma do vento de 41 para 45, os testes continuam
 * verdes: eles seguem o dado.
 *
 * Esta tabela é a especificação, escrita fora do código que a consome. Quando os dois
 * divergirem, é a tabela que está certa, e o nome do bioma aparece na falha — que é a
 * diferença entre "o jogo voltou errado" e "o teste quebrou sem motivo".
 *
 * A regra que ela fixa, biome a bioma:
 *
 *     Mina Solar          1 a 10  -> morre, volta para a 1
 *     Gruta de Gelo       11 a 20 -> morre, volta para a 11
 *     Profundezas Rubras  21 a 30 -> morre, volta para a 21
 *     Ruínas Abissais     31 a 40 -> morre, volta para a 31
 *     Galeria de Vento    41 a 50 -> morre, volta para a 41
 *     Câmara de Cristal   51 a 60 -> morre, volta para a 51
 */
const TABELA = [
  { nome: 'Mina Solar', id: 'sunstone', inicio: 1, fim: 10 },
  { nome: 'Gruta de Gelo', id: 'frost', inicio: 11, fim: 20 },
  { nome: 'Profundezas Rubras', id: 'ember', inicio: 21, fim: 30 },
  { nome: 'Ruínas Abissais', id: 'ruins', inicio: 31, fim: 40 },
  { nome: 'Galeria de Vento', id: 'wind', inicio: 41, fim: 50 },
  { nome: 'Câmara de Cristal', id: 'crystal', inicio: 51, fim: 60 }
];

/**
 * Para onde uma run morta volta.
 *
 * ## A regra
 *
 * A primeira cave do bioma em que a pessoa morreu. Nem a cave da morte, nem a cave 1
 * do jogo.
 *
 * ## Por que este teste existe
 *
 * A cena do Phaser tinha `cave = 1` escrito à mão dentro do reinício da run. Para o
 * primeiro bioma isso coincidia com a regra, e por isso nenhum teste do jogo — que
 * joga do começo — enxergava. A cave 34 voltava para a cave 1, e a pessoa perdia o
 * bioma inteiro por causa de uma linha que "funcionava".
 *
 * Isto executa a regra em **todas** as caves do jogo, e não numa amostra. Amostra é o
 * que esconde bug de borda, e a borda aqui é justamente o bioma: o primeiro bioma é a
 * única faixa em que a resposta errada dá o número certo.
 */

// --- a tabela que a pessoa pediu, bioma a bioma -----------------------------

test('a tabela de recomeço é a que o jogo declara', () => {
  // Primeiro a consistência dos faixas: sem isto, a tabela abaixo pode estar
  // descrevendo um jogo que não é este.
  assert.equal(TABELA.length, BIOMES.length, 'a tabela e os biomas têm tamanhos diferentes');

  for (const linha of TABELA) {
    const bioma = BIOMES.find((b) => b.id === linha.id);

    assert.ok(bioma, `a tabela cita o bioma ${linha.id}, que não existe`);
    assert.equal(bioma.name, linha.nome, `o nome de ${linha.id} mudou`);
    assert.equal(bioma.startCave, linha.inicio, `${linha.nome} não começa na ${linha.inicio}`);
    assert.equal(bioma.endCave, linha.fim, `${linha.nome} não termina na ${linha.fim}`);
  }

  // E as faixas são contíguas e sem sobreposição: um gap faria uma cave sem bioma, e
  // `getBiomeForCave` cairia no último bioma por omissão — a pessoa morreria num
  // bioma que não é o dela.
  const ordenadas = [...TABELA].sort((a, b) => a.inicio - b.inicio);

  for (let i = 1; i < ordenadas.length; i += 1) {
    assert.equal(
      ordenadas[i].inicio,
      ordenadas[i - 1].fim + 1,
      `gap ou sobreposição entre ${ordenadas[i - 1].nome} e ${ordenadas[i].nome}`
    );
  }

  assert.equal(TABELA[0].inicio, 1, 'o jogo não começa na cave 1');
  assert.equal(
    ordenadas[ordenadas.length - 1].fim,
    TOTAL_CAVES,
    'a última faixa não é a última cave do jogo'
  );
});

for (const { nome, id, inicio, fim } of TABELA) {
  test(`morrer em ${nome} volta para a cave ${inicio}`, () => {
    // As três caves que decidem a regra: a última, a do meio e a primeira. A última é a
    // que a pessoa costuma alcançar — e a que o `cave = 1` antigo jogava no começo
    // do jogo sem nenhuma diferença visível.
    for (const cave of [inicio, Math.floor((inicio + fim) / 2), fim]) {
      assert.equal(
        caveAoMorrer(cave),
        inicio,
        `morrer em ${nome} na cave ${cave} não voltou para a ${inicio}`
      );
    }

    // E o bioma do recomeço é o mesmo em que a pessoa morreu.
    assert.equal(getBiomeForCave(caveAoMorrer(fim)).id, id, `${nome} recomeçou noutro bioma`);
  });
}

test('morrer em qualquer cave leva à primeira cave daquele bioma', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const esperado = getBiomeStartCave(cave);

    assert.equal(
      caveAoMorrer(cave),
      esperado,
      `morrer na ${cave} deveria voltar para a ${esperado}`
    );
  }
});

test('nenhum bioma volta para a cave 1 do jogo', () => {
  // Esta é a regressão que o `cave = 1` trazia: certaindade só no primeiro bioma, e
  // um retrocesso de bioma inteiro em todos os outros.
  for (const bioma of BIOMES.slice(1)) {
    const doMeio = Math.floor((bioma.startCave + bioma.endCave) / 2);

    assert.notEqual(
      caveAoMorrer(doMeio),
      1,
      `morrer na ${doMeio} (bioma ${bioma.id}) voltou para a cave 1`
    );
    assert.equal(
      caveAoMorrer(doMeio),
      bioma.startCave,
      `morrer na ${doMeio} (bioma ${bioma.id}) não voltou para a ${bioma.startCave}`
    );
  }
});

test('morrer nunca devolve a cave em que a pessoa morreu', () => {
  // Salvo a primeira cave do bioma, onde "voltar ao começo" e "ficar" coincidem — e é
  // aí que a regra é a mesma. Em qualquer outra cave, devolver a cave da morte é não
  // ter perdido nada.
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const primeira = getBiomeStartCave(cave);

    if (cave === primeira) continue;

    assert.notEqual(
      caveAoMorrer(cave),
      cave,
      `morrer na ${cave} devolveu a mesma cave, e a run não perdeu nada`
    );
  }
});

test('morrer dentro do bioma nunca sai dele', () => {
  // A consequência do primeiro teste que importa na prática: o bioma da morte é o
  // bioma do recomeço. Sem isso, uma morte no fim do jogo jogava a pessoa no começo.
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const alvo = caveAoMorrer(cave);

    assert.equal(
      getBiomeForCave(alvo).id,
      getBiomeForCave(cave).id,
      `morrer na ${cave} voltou para a ${alvo}, que é de outro bioma`
    );
  }
});

test('cave quebrada não vira cave nenhuma', () => {
  // O valor vem do `localStorage`, que é editável, e de um save antigo. Um `NaN`
  // aqui faria `generateMap` receber uma cave que não existe — sem erro, só um mapa
  // que não é de lugar nenhum.
  for (const cave of [undefined, null, Number.NaN, 'cave 5', {}, -3, 0]) {
    const alvo = caveAoMorrer(cave);

    assert.ok(Number.isInteger(alvo), `cave ${String(cave)} virou ${alvo}`);
    assert.ok(alvo >= 1 && alvo <= TOTAL_CAVES, `cave ${String(cave)} virou ${alvo}`);
  }
});