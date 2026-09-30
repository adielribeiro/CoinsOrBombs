import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCollectionState,
  createUtilityInventory,
  getTotalRelics
} from '../src/game/progression.js';
import {
  PERSISTENTE,
  PROFILE_KEY,
  SAVES_KEY,
  apagarJogo,
  criarJogo,
  estadoInicial,
  gravarEstadoDoJogo,
  gravarJogos,
  hidratarEstado,
  lerJogo,
  lerJogos,
  listarJogos,
  marcarUltimoJogado,
  migrarPerfilAntigo,
  normalizarNome,
  partePersistente,
  renomearJogo,
  resumoDoJogo
} from '../src/game/saves.js';

/** Um `localStorage` de mentira, que guarda em memória e pode ser inspecionado. */
function storageFalso() {
  const itens = new Map();

  return {
    getItem(chave) {
      return itens.has(chave) ? itens.get(chave) : null;
    },
    setItem(chave, valor) {
      itens.set(chave, String(valor));
    },
    removeItem(chave) {
      itens.delete(chave);
    },
    crud(chave) {
      return itens.get(chave) ?? null;
    }
  };
}

/** Um storage que lança, como o de um modo privado bloqueado. */
function storageQueLanca() {
  return {
    getItem() {
      throw new Error('storage bloqueado');
    },
    setItem() {
      throw new Error('storage bloqueado');
    },
    removeItem() {
      throw new Error('storage bloqueado');
    }
  };
}

/**
 * Um relógio controlado.
 *
 * A lista de jogos é ordenada por "jogado por último", e isso vem do relógio. Com
 * `Date.now()` de verdade, três jogos nascem no mesmo milissegundo e a ordem
 * depende do id aleatório — o teste não consegue afirmar nada, e a lista pode
 * trocar de ordem entre aberturas. Aqui o tempo anda quando o teste manda.
 */
function relogio(inicial = 1000) {
  let t = inicial;
  return {
    agora: () => t,
    avanca(ms = 1000) {
      t += ms;
      return t;
    }
  };
}

// --- criar ----------------------------------------------------------------

test('criar um jogo devolve um id, e o jogo aparece na lista', () => {
  const storage = storageFalso();
  const id = criarJogo(storage, 'Minha run');

  assert.ok(id, 'criarJogo não devolveu id');
  assert.equal(lerJogos(storage).saves[id].name, 'Minha run');
  assert.equal(listarJogos(storage).length, 1);
  assert.equal(listarJogos(storage)[0].name, 'Minha run');
});

test('cada jogo é independente', () => {
  // É o ponto do recurso: duas runs, dois estados, e apagar uma não toca na outra.
  const storage = storageFalso();
  const a = criarJogo(storage, 'Run A');
  const b = criarJogo(storage, 'Run B');

  gravarEstadoDoJogo(storage, a, { ...estadoInicial(1), coins: 500, cave: 7, bestCave: 7 });
  gravarEstadoDoJogo(storage, b, { ...estadoInicial(1), coins: 12, cave: 2 });

  assert.equal(lerJogo(storage, a).coins, 500);
  assert.equal(lerJogo(storage, b).coins, 12);
  assert.equal(lerJogo(storage, a).cave, 7);
  assert.equal(lerJogo(storage, b).cave, 2);

  apagarJogo(storage, b);

  assert.equal(lerJogo(storage, a).coins, 500, 'apagar um jogo mexeu no outro');
  assert.equal(lerJogo(storage, b), null);
});

test('cada jogo carrega o seu bestCave, e o destravamento é por jogo', () => {
  // A escolha de projeto: quem chega no gelo num jogo não destrava o gelo nos
  // outros. Um jogo novo começa na Mina Solar mesmo com outro na Gruta de Gelo.
  const storage = storageFalso();
  const longe = criarJogo(storage, 'Longe');
  const novo = criarJogo(storage, 'Novo');

  gravarEstadoDoJogo(storage, longe, { ...estadoInicial(1), bestCave: 23, cave: 23 });

  assert.equal(lerJogo(storage, longe).bestCave, 23);
  assert.equal(lerJogo(storage, novo).bestCave, 1, 'o jogo novo herdou o bestCave de outro');
});

test('criar um jogo com progresso reaproveitado guarda esse progresso', () => {
  // Recomeçar de propósito não pode custar a progressão: o `bestCave` é o que
  // destrava os biomas, e perder ele ao criar um slot seria uma punição invisível.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Continuacao', { estado: { ...estadoInicial(1), bestCave: 34 } });

  assert.equal(lerJogo(storage, id).bestCave, 34);
});

// --- nome -----------------------------------------------------------------

test('um nome vazio ou só com espaços vira um nome padrão', () => {
  // É o caso mais comum e o mais fácil de não tratar: apareceria um card sem
  // nome, e a pessoa não saberia qual é o dela.
  const storage = storageFalso();

  assert.equal(normalizarNome(''), 'Jogo 1');
  assert.equal(normalizarNome('    '), 'Jogo 1');
  assert.equal(normalizarNome(null), 'Jogo 1');
  assert.equal(normalizarNome(undefined), 'Jogo 1');

  const id = criarJogo(storage, '   ');
  assert.ok(lerJogos(storage).saves[id].name.length > 0, 'o jogo ficou sem nome');
});

test('o nome é aparado e tem tamanho limitado', () => {
  const storage = storageFalso();
  const id = criarJogo(storage, '   Run    com    espaços   ');

  assert.equal(lerJogos(storage).saves[id].name, 'Run com espaços');

  const longo = criarJogo(storage, 'x'.repeat(200));
  assert.ok(
    lerJogos(storage).saves[longo].name.length <= 28,
    `o nome ficou com ${lerJogos(storage).saves[longo].name.length} caracteres`
  );
});

test('renomear troca o nome e não mexe no estado', () => {
  const storage = storageFalso();
  const id = criarJogo(storage, 'Antes');
  gravarEstadoDoJogo(storage, id, { ...estadoInicial(1), coins: 99 });

  assert.equal(renomearJogo(storage, id, 'Depois'), true);
  assert.equal(lerJogos(storage).saves[id].name, 'Depois');
  assert.equal(lerJogo(storage, id).coins, 99, 'renomear perdeu o progresso');
});

test('renomear um id que não existe não cria nada', () => {
  const storage = storageFalso();
  criarJogo(storage, 'Unico');

  assert.equal(renomearJogo(storage, 'id-que-nao-existe', 'Fantasma'), false);
  assert.equal(listarJogos(storage).length, 1, 'um id inexistente criou um jogo');
});

// --- apagar ----------------------------------------------------------------

test('apagar o último jogado passa o último para outro', () => {
  // O botão de continuar aponta para o `lastPlayed`. Se ele aponta para um id que
  // acabou de ser apagado, o "continuar" leva a lugar nenhum.
  const storage = storageFalso();
  const relogio_ = relogio();

  const a = criarJogo(storage, 'A', { agora: relogio_.agora });
  relogio_.avanca();
  const b = criarJogo(storage, 'B', { agora: relogio_.agora });
  relogio_.avanca();
  const c = criarJogo(storage, 'C', { agora: relogio_.agora });

  for (const id of [a, b, c]) {
    relogio_.avanca();
    marcarUltimoJogado(storage, id, { agora: relogio_.agora });
  }
  assert.equal(lerJogos(storage).lastPlayed, c, 'o último marcado não é o último jogado');

  apagarJogo(storage, c);
  assert.ok(lerJogos(storage).lastPlayed, 'o lastPlayed ficou apontando para o apagado');
  assert.equal(lerJogos(storage).lastPlayed, b, 'não passou para o jogado mais recente que sobrou');
});

test('apagar o único jogo limpa o lastPlayed', () => {
  const storage = storageFalso();
  const unico = criarJogo(storage, 'So esse');

  apagarJogo(storage, unico);

  assert.equal(lerJogos(storage).lastPlayed, null, 'o lastPlayed ficou apontando para o apagado');
  assert.equal(listarJogos(storage).length, 0);
});

test('apagar um id que não existe não estraga nada', () => {
  const storage = storageFalso();
  const id = criarJogo(storage, 'Fica');

  assert.equal(apagarJogo(storage, 'nao-existe'), false);
  assert.equal(listarJogos(storage).length, 1);
  assert.equal(lerJogo(storage, id).cave, 1);
});

// --- o que é salvo ----------------------------------------------------------

test('o estado de tela não vai para o disco', () => {
  // `screen`, `inLobby`, `lobbyReason`, `nextCaveAvailable`, `outcomeCave` e
  // `lastMessage` são de uma tela, não de uma run. Se forem salvos, ao abrir um
  // jogo a pessoa entra numa tela de vitória que ficou aberta, ou presa no lobby.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Run');

  gravarEstadoDoJogo(storage, id, {
    ...estadoInicial(3),
    coins: 250,
    screen: 'victory',
    inLobby: true,
    lobbyReason: 'exit',
    nextCaveAvailable: 4,
    outcomeCave: 3,
    lastMessage: 'Voce morreu'
  });

  const salvo = lerJogos(storage).saves[id].state;

  for (const campo of ['screen', 'inLobby', 'lobbyReason', 'nextCaveAvailable', 'outcomeCave', 'lastMessage']) {
    assert.ok(!(campo in salvo), `${campo} foi para o disco, e é estado de tela`);
  }

  assert.equal(salvo.coins, 250, 'o que é progresso sumiu junto com o que não devia');
  assert.equal(salvo.cave, 3);
});

test('todo campo de PERSISTENTE é gravado, e nenhum outro', () => {
  // `PERSISTENTE` é a fonte de verdade. Este teste amarra a lista ao
  // comportamento, para uma chave nova na lista não ficar declarada e nunca gravada.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Run');

  const cheio = {
    ...estadoInicial(5),
    screen: 'cave',
    inLobby: false,
    lastMessage: 'x',
    campoDoFuturo: 123
  };
  gravarEstadoDoJogo(storage, id, cheio);

  const salvo = lerJogos(storage).saves[id].state;

  for (const campo of PERSISTENTE) {
    assert.ok(campo in salvo, `${campo} está em PERSISTENTE mas não foi gravado`);
  }

  assert.deepEqual(
    Object.keys(salvo).sort(),
    [...PERSISTENTE].filter((c) => c in cheio).sort(),
    'o que foi gravado não bate com o que a lista declara'
  );
});

test('abrir um jogo devolve um estado em forma, mesmo salvando pela metade', () => {
  // Um save truncado, ou de uma versão que não tinha um campo novo, não pode
  // derrubar a tela: a relíquia faltando viraria `undefined` no HUD.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Run');
  gravarEstadoDoJogo(storage, id, { cave: 9, coins: 700, collection: { amber_fang: 2 } });

  const aberto = lerJogo(storage, id);

  assert.equal(aberto.cave, 9);
  assert.equal(aberto.coins, 700);
  assert.equal(aberto.collection.amber_fang, 2, 'a relíquia que estava no save sumiu');
  assert.deepEqual(
    Object.keys(aberto.collection).sort(),
    Object.keys(createCollectionState()).sort(),
    'a coleção não foi completada com as relíquias que faltavam no save'
  );
  assert.equal(typeof aberto.stats.totalCoinsCollected, 'number', 'as estatísticas não foram completadas');
  assert.deepEqual(
    Object.keys(aberto.utilities).sort(),
    Object.keys(createUtilityInventory()).sort(),
    'o inventário de utilidades não foi completado'
  );
  assert.equal(aberto.biomeId, 'sunstone', 'o bioma não foi derivado da cave');
  assert.equal(aberto.maxHp, 2);
});

test('abrir um jogo desconhecido devolve null, não uma exception', () => {
  const storage = storageFalso();
  assert.equal(lerJogo(storage, 'id-que-nao-existe'), null);
});

test('gravar num id que não existe não cria o jogo', () => {
  const storage = storageFalso();
  const antes = storage.crud(SAVES_KEY);

  assert.equal(gravarEstadoDoJogo(storage, 'nao-existe', estadoInicial(3)), false);
  assert.equal(storage.crud(SAVES_KEY), antes, 'gravar num id fantasma mexeu no storage');
});

// --- resumos ---------------------------------------------------------------

test('o resumo traz o que a lista mostra, e conta as relíquias', () => {
  const storage = storageFalso();
  const id = criarJogo(storage, 'Run');
  gravarEstadoDoJogo(storage, id, {
    ...estadoInicial(4),
    coins: 1200,
    bombs: 3,
    bestCave: 14,
    collection: { amber_fang: 2, rocha_fria: 1, nao_achada: 0 }
  });

  const resumo = resumoDoJogo(lerJogos(storage).saves[id]);

  assert.equal(resumo.name, 'Run');
  assert.equal(resumo.cave, 4);
  assert.equal(resumo.coins, 1200);
  assert.equal(resumo.bombs, 3);
  assert.equal(resumo.bestCave, 14);
  assert.equal(resumo.biomeName, 'Mina Solar');
});

test('a contagem de relíquias do card é a mesma do HUD', () => {
  // O HUD soma as quantidades (`getTotalRelics`). Se o card contasse os tipos
  // diferentes, "2 relíquias" no card e "3 relíquias" no HUD descreveriam a mesma
  // coleção — a mesma palavra, dois meanings, na mesma sessão.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Run');

  gravarEstadoDoJogo(storage, id, {
    ...estadoInicial(4),
    collection: { amber_fang: 2, rocha_fria: 1, nao_achada: 0 }
  });

  const resumo = resumoDoJogo(lerJogos(storage).saves[id]);
  const estado = lerJogo(storage, id);

  assert.equal(resumo.relics, 3, 'o card não contou a mesma coisa que o HUD');
  assert.equal(resumo.relics, getTotalRelics(estado.collection));
});

test('a lista vem da mais recente para a mais antiga, e marca a última jogada', () => {
  const storage = storageFalso();
  const relogio_ = relogio();

  const a = criarJogo(storage, 'A', { agora: relogio_.agora });
  relogio_.avanca();
  const b = criarJogo(storage, 'B', { agora: relogio_.agora });
  relogio_.avanca();
  const c = criarJogo(storage, 'C', { agora: relogio_.agora });

  // Reordena jogando: C é a mais recente.
  for (const id of [a, b, c]) {
    relogio_.avanca();
    marcarUltimoJogado(storage, id, { agora: relogio_.agora });
  }

  const lista = listarJogos(storage);
  assert.deepEqual(
    lista.map((j) => j.id),
    [c, b, a],
    'a lista não está da mais recente para a mais antiga'
  );
  assert.equal(lista.filter((j) => j.isLastPlayed).length, 1, 'mais de um jogo marcado como último');
  assert.equal(lista.find((j) => j.isLastPlayed).id, c);
});

test('a ordem é a mesma mesmo quando tudo acontece no mesmo instante', () => {
  // O empate no mesmo milissegundo é o caso real: a pessoa cria três jogos e
  // clica neles em sequência, e o relógio pode não andar entre os cliques. Sem
  // desempate, a lista mudaria de ordem entre aberturas e os cards trocariam de
  // lugar sozinhos.
  const storage = storageFalso();
  const parado = { agora: () => 5000 };

  const ids = ['A', 'B', 'C', 'D'].map((nome) => criarJogo(storage, nome, parado));
  for (const id of ids) marcarUltimoJogado(storage, id, parado);

  const primeira = listarJogos(storage).map((j) => j.id);
  const segunda = listarJogos(storage).map((j) => j.id);

  assert.deepEqual(segunda, primeira, 'a ordem mudou entre duas leituras da mesma lista');
  assert.equal(primeira.length, 4);

  // E apagar o último continua levando ao próximo, mesmo com tudo empatado.
  apagarJogo(storage, lerJogos(storage).lastPlayed);
  assert.equal(lerJogos(storage).lastPlayed, primeira[1], 'não avançou para o segundo da lista');
});

// --- leitura defensiva ------------------------------------------------------

test('storage vazio devolve lista vazia, e não uma exception', () => {
  const lista = listarJogos(storageFalso());

  assert.deepEqual(lista, []);
  assert.equal(lerJogo(storageFalso(), 'qualquer'), null);
});

test('JSON quebrado não derruba o jogo, e não apaga o que está no storage', () => {
  // Um save ilegível **não pode** limpar o legível. Por isso a leitura falha para
  // a estrutura vazia e deixa o texto no storage como estava.
  const storage = storageFalso();
  storage.setItem(SAVES_KEY, '{ isso não é json');

  assert.deepEqual(listarJogos(storage), [], 'a leitura quebrou em vez de devolver vazio');
  assert.equal(storage.crud(SAVES_KEY), '{ isso não é json', 'o dado quebrado foi apagado');
});

test('um formato inesperado devolve vazio, sem exception', () => {
  const storage = storageFalso();

  for (const cru of ['[]', '"texto"', '42', 'null', '{"saves": 7}', '{"saves": []}']) {
    storage.setItem(SAVES_KEY, cru);
    assert.doesNotThrow(() => listarJogos(storage), `o formato ${cru} derrubou a leitura`);
  }
});

test('um slot dentro da lista quebrado é pulado, e os outros sobrevivem', () => {
  // Um save pode ter virado `null` de um jeito que não dá para ver de fora: uma
  // escrita interrompida, um merge de storage. Pulá-lo é o comportamento certo —
  // a alternativa é derrubar a lista inteira por causa de um.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Bom');
  const original = lerJogos(storage).saves[id];

  storage.setItem(
    SAVES_KEY,
    JSON.stringify({ version: 1, seq: 1, lastPlayed: id, saves: { [id]: original, quebrado: null } })
  );

  const lista = listarJogos(storage);
  assert.equal(lista.length, 1, 'um slot nulo derrubou o outro');
  assert.equal(lista[0].id, id);
  assert.equal(lista[0].name, 'Bom');
});

test('o id do save vem da chave em que ele está guardado', () => {
  // A chave é a identidade. Se um save guarda um `id` que não bate com a chave em
  // que está — o que acontece se o formato mudar, ou se alguém editar o storage —
  // a chave ganha, porque é nela que o "continuar" e o "apagar" procuram.
  const storage = storageFalso();
  const id = criarJogo(storage, 'Certo');
  const original = lerJogos(storage).saves[id];

  storage.setItem(
    SAVES_KEY,
    JSON.stringify({ version: 1, seq: 1, lastPlayed: id, saves: { [id]: { ...original, id: 'outro' } } })
  );

  const dados = lerJogos(storage);
  assert.equal(dados.saves[id].id, id, 'o id guardado dentro do save venceu a chave');
  assert.equal(dados.lastPlayed, id, 'o lastPlayed parou de achar o jogo');
  assert.equal(listarJogos(storage)[0].id, id);
});

test('sem storage, nada quebra', () => {
  assert.doesNotThrow(() => listarJogos(null));
  assert.doesNotThrow(() => listarJogos(storageQueLanca()));
  assert.deepEqual(listarJogos(storageQueLanca()), []);
});

// --- migração do progresso antigo -------------------------------------------

test('quem jogava antes recebe um jogo, com o progresso dele', () => {
  // Antes dos slots, o progresso era um `profile` com o `bestCave`. Sem esta
  // migração, quem tinha chegado na caverna 23 volta para a 1.
  const storage = storageFalso();
  storage.setItem(PROFILE_KEY, JSON.stringify({ bestCave: 23 }));

  const id = migrarPerfilAntigo(storage);

  assert.ok(id, 'a migração não criou jogo nenhum');
  const jogo = lerJogo(storage, id);
  assert.equal(jogo.bestCave, 23, 'a migração perdeu o progresso');
  assert.equal(listarJogos(storage).length, 1);
  assert.equal(lerJogos(storage).lastPlayed, id, 'o jogo migrado não virou o último, e o botão de continuar aponta para lugar nenhum');
});

test('a migração roda uma vez só', () => {
  // Sem esta trava, cada abertura criaria um jogo novo e a lista encheria de
  // "Jogo 1" idênticos.
  const storage = storageFalso();
  storage.setItem(PROFILE_KEY, JSON.stringify({ bestCave: 23 }));

  const primeiro = migrarPerfilAntigo(storage);
  assert.equal(migrarPerfilAntigo(storage), null, 'a migração rodou de novo');
  assert.equal(migrarPerfilAntigo(storage), null);

  assert.equal(listarJogos(storage).length, 1, 'a migração criou jogos duplicados');
  assert.equal(lerJogo(storage, primeiro).bestCave, 23);
});

test('quem nunca saiu da primeira caverna não ganha jogo migrado', () => {
  // Progresso de cave 1 não é progresso. Sem esta linha, quem jogou e morreu na
  // Mina Solar ganharia um "Jogo 1" com a mesma Mina Solar, e a lista de jogos
  // começaria com uma cópia inútil do que ele acabou de fechar.
  const storage = storageFalso();

  storage.setItem(PROFILE_KEY, JSON.stringify({ bestCave: 1 }));
  assert.equal(migrarPerfilAntigo(storage), null, 'bestCave 1 criou um jogo migrado');

  storage.setItem(PROFILE_KEY, JSON.stringify({}));
  assert.equal(migrarPerfilAntigo(storage), null, 'profile sem bestCave criou um jogo');

  assert.equal(listarJogos(storage).length, 0);
});

test('sem profile antigo, a migração não faz nada', () => {
  assert.equal(migrarPerfilAntigo(storageFalso()), null);
});

test('a migração não apaga o profile antigo', () => {
  // Ele é a fonte. Apagá-lo antes de a migração ter sucesso trocaria um bug de
  // espaço por um de perda — e uma reinstalação do navegador perderia a chave.
  const storage = storageFalso();
  storage.setItem(PROFILE_KEY, JSON.stringify({ bestCave: 40 }));

  migrarPerfilAntigo(storage);

  assert.ok(storage.crud(PROFILE_KEY), 'a migração apagou o profile de onde leu');
});

test('profile quebrado não derruba a migração', () => {
  const storage = storageFalso();
  storage.setItem(PROFILE_KEY, 'não é json');

  assert.doesNotThrow(() => migrarPerfilAntigo(storage));
  assert.equal(migrarPerfilAntigo(storage), null);
  assert.equal(listarJogos(storage).length, 0);
});
