import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { getBackdropKey, listBiomeArt } from '../src/game/backdrops.js';
import { getEntranceKey } from '../src/game/entrances.js';
import { BIOMES } from '../src/game/progression.js';

const IDS = BIOMES.map((b) => b.id);

/**
 * A lista de assets do boot é testada EXECUTANDO a função que a monta.
 *
 * ## Por que executar, e não ler o fonte
 *
 * Foi assim que os dois bugs de fundo passaram. O `BootScene` importava `BIOMES`
 * e iterava `BIOMAS`; e depois declarava `bioma` e usava `biome`. Os dois são
 * `ReferenceError` — e um `ReferenceError` só existe em runtime: o build passa,
 * o `node --test` passa, e a tela fica preta sem mensagem útil.
 *
 * Pior: os testes que existiam procuravam strings no fonte do `BootScene`, e um
 * deles procurava `for (const bioma of BIOMAS)`, que era **exatamente a grafia
 * errada**. O teste passou porque repetiu o meu erro.
 *
 * Por isso a lista mora em `listBiomeArt`, que é pura — não precisa de Phaser,
 * nem de `window` — e é o que o `BootScene` itera. Aqui ela roda de verdade.
 */
const arte = listBiomeArt();

test('a arte de boot tem os doze arquivos: fundo e entrada de cada bioma', () => {
  assert.equal(
    arte.length,
    IDS.length * 2,
    `a lista tem ${arte.length} itens, e são ${IDS.length} biomas com fundo e entrada`
  );
});

test('a chave do bioma e a chave do registro, e batem', () => {
  // A lista do boot sai de `biome.backgroundKey`, e a cena usa `BACKDROP_KEYS`.
  // São dois lugares, e é por isso que este teste existe: quando a lista do boot
  // era montada a partir do registro, os dois discordaram e um bioma ficou sem
  // fundo — sem erro, sem aviso, só a caverna de outro bioma na tela.
  for (const biome of BIOMES) {
    assert.equal(
      biome.backgroundKey,
      getBackdropKey(biome.id),
      `${biome.id}: o bioma declara ${biome.backgroundKey} e o registro diz `
        + `${getBackdropKey(biome.id)}. A cena usa o registro e o boot usa o bioma.`
    );
  }
});

test('todo bioma tem a sua arte, com a sua chave', () => {
  const porChave = new Map(arte.map((item) => [item.key, item]));

  for (const id of IDS) {
    const fundo = porChave.get(getBackdropKey(id));

    assert.ok(fundo, `o boot não pede o fundo de ${id} (${getBackdropKey(id)})`);
    assert.equal(fundo.papel, 'fundo');
    assert.equal(fundo.bioma, id, `o fundo ${fundo.key} está marcado como de ${fundo.bioma}`);

    const entrada = porChave.get(getEntranceKey(id));

    assert.ok(entrada, `o boot não pede a entrada de ${id} (${getEntranceKey(id)})`);
    assert.equal(entrada.papel, 'entrada');
    assert.equal(entrada.bioma, id, `a entrada ${entrada.key} está marcada como de ${entrada.bioma}`);
  }
});

test('nenhum fundo se repete entre biomas', () => {
  // Seis biomas com a mesma arte é o bug inteiro: o jogador vê a Mina Solar em
  // todo lugar, e o sintoma é indistinguível de "a carga não funcionou".
  const fundos = arte.filter((i) => i.papel === 'fundo').map((i) => i.key);

  assert.equal(fundos.length, new Set(fundos).size, 'dois biomas pedem o mesmo fundo');
  assert.equal(fundos.length, IDS.length, `a lista tem ${fundos.length} fundos, e há ${IDS.length} biomas`);
});

test('a chave da textura bate com o caminho do arquivo', () => {
  // Se divergirem, o Phaser registra uma textura que aponta para um caminho e a
  // `__MISSING` aparece na tela — a caixa preta com X verde, sem erro no console.
  for (const item of arte) {
    assert.equal(
      item.url,
      `assets/${item.key}.png`,
      `a chave ${item.key} não bate com o caminho ${item.url}`
    );
  }
});

test('toda chave que o boot pede existe em disco', () => {
  for (const item of arte) {
    assert.ok(
      existsSync(new URL(`../public/${item.url}`, import.meta.url)),
      `o boot pede ${item.url}, que não existe. O Phaser registra a textura e `
        + 'desenha a __MISSING: a caixa preta com X verde.'
    );
  }
});

test('o BootScene carrega a lista, e não monta a dele mesmo', () => {
  // Se alguém escrever um laço de arte dentro do `preload`, o teste desta
  // arquivo deixa de valer: a lista testada não é a que o jogo usa. E um laço
  // escrito ali dentro é o que quebrou duas vezes.
  const fonte = readFileSync(new URL('../src/game/scenes/BootScene.js', import.meta.url), 'utf8');

  assert.ok(
    fonte.includes('listBiomeArt()'),
    'o BootScene não itera listBiomeArt(). A lista testada precisa ser a que o '
      + 'jogo usa, ou este arquivo inteiro não mede nada.'
  );

  assert.ok(
    !/getBackdropKey\(biome\)|getBackdropKey\(bioma\)|getEntranceKey\(biome\)/.test(fonte),
    'o BootScene tem um laço de arte próprio. A lista tem que vir de '
      + 'listBiomeArt, que é pura e testada.'
  );
});
