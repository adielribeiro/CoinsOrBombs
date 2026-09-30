import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';

import {
  BACKDROP_KEYS,
  BIOMA_INICIAL,
  getBackdropKey,
  getBackdropKeyForCave,
  listBackdropKeys
} from '../src/game/backdrops.js';
import { ENTRANCES, getEntranceKey, listEntranceKeys } from '../src/game/entrances.js';
import { BIOMES, getBiomeForCave } from '../src/game/progression.js';

const IDS = BIOMES.map((b) => b.id);

const FONTE_BOOT = readFileSync(
  new URL('../src/game/scenes/BootScene.js', import.meta.url),
  'utf8'
);

const FONTE_CAVE_SCENE = readFileSync(
  new URL('../src/game/scenes/CaveScene.js', import.meta.url),
  'utf8'
);

test('todo bioma tem fundo e entrada registrados', () => {
  for (const id of IDS) {
    assert.ok(BACKDROP_KEYS[id], `${id} sem chave de fundo`);
    assert.ok(ENTRANCES[id], `${id} sem entrada`);
    assert.equal(getBackdropKey(id), BACKDROP_KEYS[id]);
  }

  assert.equal(listBackdropKeys().length, IDS.length, 'a lista de fundos não bate com a de biomas');
  assert.equal(new Set(listBackdropKeys()).size, IDS.length, 'dois biomas compartilham o fundo');
  assert.equal(listEntranceKeys().length, IDS.length, 'a lista de entradas não bate com a de biomas');
});

test('o bioma de referência é um bioma de verdade, e é a Mina Solar', () => {
  // A Mina Solar é a caverna da cave 1 e o fundo que a tela de título mostra. É
  // também a reserva: quando a arte do bioma não está, é ela que evita a caixa
  // preta com X verde.
  assert.ok(IDS.includes(BIOMA_INICIAL), `BIOMA_INICIAL é "${BIOMA_INICIAL}", que não é bioma`);
  assert.equal(BIOMA_INICIAL, 'sunstone');
  assert.equal(getBackdropKeyForCave(1), getBackdropKey('sunstone'));
  // Cave 7 ainda é Mina Solar: a faixa vai de 1 a 10. A Gruta de Gelo abre na 11.
  assert.equal(getBackdropKeyForCave(7), getBackdropKey('sunstone'));
  assert.equal(getBackdropKeyForCave(11), getBackdropKey('frost'));
});

test('bioma sem registro cai no inicial, e não quebra', () => {
  assert.equal(getBackdropKey('bioma-que-nao-existe'), getBackdropKey(BIOMA_INICIAL));
});

test('o bioma de uma cave é o mesmo que o do fundo daquela cave', () => {
  for (const cave of [1, 5, 10, 11, 25, 40, 41, 55, 60]) {
    assert.equal(
      getBackdropKeyForCave(cave),
      getBackdropKey(getBiomeForCave(cave).id),
      `cave ${cave}: o atalho de fundo discorda do bioma da cave`
    );
  }
});

test('a arte do bioma é a do bioma, e não a de outro', () => {
  // Um `switch` com `case` errado, ou um `??` que cai no primeiro bioma, daria a
  // caverna da Mina Solar dentro da Câmara de Cristal — e as duas se parecem o
  // bastante para passar.
  for (const id of IDS) {
    const par = [getBackdropKey(id), getEntranceKey(id)];

    for (const outro of IDS) {
      if (outro === id) continue;

      assert.notEqual(par[0], getBackdropKey(outro), `${id} e ${outro} compartilham o fundo`);
      assert.notEqual(par[1], getEntranceKey(outro), `${id} e ${outro} compartilham a entrada`);
    }
  }
});

// --- os seis entram no boot ------------------------------------------------
//
// A carga por bioma foi tentada e nao funcionou: em cinco dos seis biomas o fundo
// e a entrada nao apareciam, sem erro no console. A decisao agora e nao depender
// de carga nenhuma depois do boot.
//
// A lista em si e testada em `boot.test.mjs`, que EXECUTA `listBiomeArt` em vez
// de ler o fonte do `BootScene`. Isso nao e preciosismo: o `preload` do
// `BootScene` ja teve um `ReferenceError` duas vezes nesta mesma mudanca — um laco
// iterando `BIOMAS` que se chamava `BIOMES`, e um `bioma` declarado e `biome`
// usado. Os dois passaram pelo build e pelo `node --test`.
//
// E o teste que existia antes nao pegou nenhum dos dois, porque procurava no
// texto a grafia errada.

test('o boot carrega a lista de arte, e a lista nao tem caminho por demanda', () => {
  assert.ok(
    FONTE_BOOT.includes('listBiomeArt()'),
    'o BootScene nao itera listBiomeArt(). A lista e testada em boot.test.mjs, e '
      + 'se o BootScene montar a dele, esse arquivo inteiro nao mede nada.'
  );

  // E a regra do id: `BIOMES` e a lista de BIOMAS, e cada item e um OBJETO com
  // `id`, `name` e `palette`. Passar o objeto para uma funcao que indexa por id
  // encontra `undefined`, e o `??` de reserva devolve a Mina Solar — nos seis. O
  // sintoma e "todo bioma mostra o mesmo fundo", que e indistinguivel de "a
  // carga nao funcionou".
  for (const linha of [FONTE_BOOT, FONTE_CAVE_SCENE]
    .join('\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /getBackdropKey\(biome\)|getEntranceForBiome\(biome\)|getGroundTextureKey\(biome\)|getRockSheetKey\(biome\)/.test(l))) {
    assert.fail(`passa o bioma inteiro para uma funcao que indexa por id: ${linha}`);
  }
});

test('nao sobrou carga por demanda em lugar nenhum', () => {
  // `ensureBackdrop` foi removido. Se ele voltar sem uma forma de se verificar,
  // o jogo volta a mostrar a caverna errada sem nenhum aviso.
  for (const [nome, fonte] of [['BootScene', FONTE_BOOT], ['CaveScene', FONTE_CAVE_SCENE]]) {
    assert.ok(
      !fonte.includes('ensureBackdrop'),
      `${nome} ainda chama \`ensureBackdrop\`. A carga por bioma foi removida porque `
        + 'nao funcionava, e voltar a ela traz de volta o bug silencioso.'
    );
  }
});

test('não sobrou carga por demanda em lugar nenhum', () => {
  // `ensureBackdrop` foi removido. Se ele voltar sem uma forma de se verificar,
  // o jogo volta a mostrar a caverna errada sem nenhum aviso.
  for (const [nome, fonte] of [['BootScene', FONTE_BOOT], ['CaveScene', FONTE_CAVE_SCENE]]) {
    assert.ok(
      !fonte.includes('ensureBackdrop'),
      `${nome} ainda chama \`ensureBackdrop\`. A carga por bioma foi removida porque `
        + 'não funcionava, e voltar a ela traz de volta o bug silencioso.'
    );
  }
});

test('o total do boot cabe no que a gente aceita pagar', () => {
  // Não é um teste de velocidade, é um registro da troca que foi feita: os seis
  // fundos e as seis entradas são 19,8 MB, e o boot inteiro fica perto de 27 MB.
  // Se um dia alguém quiser voltar a carregar por bioma, este número é o que tem
  // que baixar — e o teste de `não sobrou carga por demanda` é o que impede.
  let kb = 0;
  for (const id of IDS) {
    for (const key of [getBackdropKey(id), getEntranceKey(id)]) {
      const caminho = new URL(`../public/assets/${key}.png`, import.meta.url);
      assert.ok(existsSync(caminho), `falta ${key}.png, e o boot pede esse arquivo`);
      kb += statSync(caminho).size / 1024;
    }
  }

  assert.ok(
    kb > 15000,
    `a arte dos seis biomas somou ${(kb / 1024).toFixed(1)} MB. Se este número `
      + 'caiu muito, alguém encolheu a arte de propósito — e o CHANGELOG deveria '
      + 'dizer.'
  );

  assert.ok(
    kb < 25000,
    `a arte dos seis biomas somou ${(kb / 1024).toFixed(1)} MB, acima do que o `
      + 'jogo aceita no boot. Encolha a arte, não o número de biomas.'
  );
});

// --- a barreira do X verde -------------------------------------------------
//
// O X verde é a textura `__MISSING` do Phaser, e é o que `textures.get(chave)`
// devolve quando a chave não está na lista. `textures.exists(chave)` é
// `list.hasOwnProperty(chave)`, então ele responde "sim" tanto para uma arte que
// carregou quanto para uma que nunca chegou — e foi assim que o X chegou à tela.

test('a barreira do X verde compara a chave, e não usa exists sozinho', () => {
  assert.ok(
    FONTE_CAVE_SCENE.includes('textura.key === chave'),
    'CaveScene não compara a chave da textura devolvida com a chave pedida. E '
      + 'isso que separa "carregou" de "o Phaser vai desenhar a __MISSING".'
  );

  assert.ok(
    FONTE_CAVE_SCENE.includes('function texturaEhUsavel('),
    'a função que faz a comparação sumiu do CaveScene'
  );

  // E nenhum desenho de arte pode voltar a confiar só no `exists`. A contagem
  // olha SÓ código: comentário começa com `*` ou `//`, e o `console.error` é um
  // template literal cujas continuações começam com `+`.
  const linhasDeCodigo = FONTE_CAVE_SCENE
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith('*') && !linha.startsWith('//') && !linha.startsWith('+'));

  const usosCru = linhasDeCodigo.filter((linha) => linha.includes('textures.exists(')).length;

  assert.equal(
    usosCru,
    0,
    `CaveScene chama \`textures.exists(\` em ${usosCru}x de código. Fora do `
      + 'console.error, que é diagnóstico, nenhuma checagem de arte pode se '
      + 'basear nele.'
  );
});

test('o fundo cai para o da Mina Solar antes de cair no retângulo', () => {
  // O X verde é o pior desfecho porque é preto. A reserva é o que garante que o
  // jogador veja uma caverna enquanto a arte do bioma não está.
  assert.ok(
    FONTE_CAVE_SCENE.includes('getBackdropKey(BIOMA_INICIAL)'),
    'a reserva do fundo sumiu. Sem ela, uma falha de carga vira a caixa preta '
      + 'com X verde.'
  );

  assert.ok(
    FONTE_CAVE_SCENE.includes('texturaEhUsavel(this, reserva)'),
    'a reserva é calculada mas não é usada'
  );
});

test('usar a reserva avisa, porque a reserva esconde a falha', () => {
  // "O bioma mostrou a caverna errada" é indistinguível de "está tudo bem" sem
  // isto. E a falha é justamente do tipo que o jogador não percebe.
  assert.ok(
    FONTE_CAVE_SCENE.includes('this.fundoAvisado'),
    'o aviso do fundo não é guardado por chave. Um `console.error` por quadro '
      + 'esconde a mensagem em vez de destacá-la.'
  );

  assert.ok(
    FONTE_CAVE_SCENE.includes('está usando'),
    'não há aviso quando a reserva entra. O aviso que só dispara quando NENHUM '
      + 'fundo serve é o que deixa a falha passar em silêncio.'
  );
});
