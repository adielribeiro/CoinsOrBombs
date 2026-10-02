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