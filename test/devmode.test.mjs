import test from 'node:test';
import assert from 'node:assert/strict';

import { BIOMES, getUnlockedBiomes, isBiomeUnlocked } from '../src/game/progression.js';

const TOTAL_CAVES = BIOMES[BIOMES.length - 1].endCave;

/**
 * Modo desenvolvedor: libera todos os biomas para pular direto para qualquer
 * ambiente.
 *
 * Sem isso, ver o chão e a paleta da Gruta de Gelo exigia jogar a run inteira
 * até a Cave 20 — que é justamente o que se quer evitar ao testar uma
 * textura.
 */
test('sem modo desenvolvedor, o desbloqueio segue o unlockCave', () => {
  // Uma versão anterior passava `developerMode` sem default, e `undefined` é
  // falsy, então o caminho normal continuava certo. Este teste trava isso para
  // que uma troca de assinatura não abra o jogo sem querer.
  assert.equal(getUnlockedBiomes(1).length, 1, 'na Cave 1 só o primeiro bioma');
  assert.equal(getUnlockedBiomes(1, false).length, 1);

  const esperado = BIOMES.filter((biome) => biome.unlockCave <= 1).length;
  assert.equal(getUnlockedBiomes(1, undefined).length, esperado);
});

test('sem modo desenvolvedor, nenhum atalho libera bioma futuro', () => {
  // O melhor cave continua sendo a única fonte de verdade quando o modo está
  // desligado. `true` explícito não pode virar atalho.
  for (const cave of [1, 5, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50, 59, 60, TOTAL_CAVES]) {
    const liberados = getUnlockedBiomes(cave, false);
    for (const biome of liberados) {
      assert.ok(
        cave >= biome.unlockCave,
        `bioma ${biome.id} liberado na cave ${cave}, mas abre na ${biome.unlockCave}`
      );
    }
  }
});

test('modo desenvolvedor libera todos os biomas em qualquer cave', () => {
  for (const cave of [1, 5, 10, 20, 30, 40, 50, TOTAL_CAVES]) {
    const liberados = getUnlockedBiomes(cave, true);

    assert.equal(
      liberados.length,
      BIOMES.length,
      `cave ${cave}: só ${liberados.length} de ${BIOMES.length} biomas`
    );
    for (const biome of BIOMES) {
      assert.ok(
        liberados.some((b) => b.id === biome.id),
        `cave ${cave}: ${biome.id} não liberado`
      );
    }
  }
});

test('isBiomeUnlocked concorda com getUnlockedBiomes', () => {
  // São duas funções que respondem à mesma pergunta, em sítios diferentes do
  // app. Se divergirem, a tela de seleção e a de informações discordam.
  for (const cave of [1, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50, 59, 60]) {
    for (const dev of [false, true]) {
      const peloFiltro = new Set(getUnlockedBiomes(cave, dev).map((b) => b.id));

      for (const biome of BIOMES) {
        assert.equal(
          isBiomeUnlocked(biome, cave, dev),
          peloFiltro.has(biome.id),
          `${biome.id} na cave ${cave}, dev=${dev}`
        );
      }
    }
  }
});

test('isBiomeUnlocked trata bioma ausente sem estourar', () => {
  assert.equal(isBiomeUnlocked(null, TOTAL_CAVES, true), false);
  assert.equal(isBiomeUnlocked(undefined, TOTAL_CAVES), false);
});

test('getUnlockedBiomes devolve uma cópia, não o array original', () => {
  // O modo desenvolvedor pode devolver `BIOMES` direto, e aí um `sort` ou
  // `reverse` na tela quebraria a ordem dos biomas para sempre.
  const primeira = getUnlockedBiomes(1, true);
  primeira.reverse();

  assert.notEqual(BIOMES[0].id, 'ruins', 'a ordem global de BIOMES foi mutada');
  assert.equal(getUnlockedBiomes(1, true)[0].id, BIOMES[0].id);
});
