import test from 'node:test';
import assert from 'node:assert/strict';

import { BIOMES, OBJECTIVE_CATALOG, RELIC_CATALOG } from '../src/game/progression.js';
import {
  DEFAULT_LOCALE,
  LOCALES,
  createTranslator,
  detectLocale,
  getDictionary,
  isKnownLocale,
  localeKeys,
  pluralCategory,
  setLocale,
  t
} from '../src/i18n/index.js';

const chaves = localeKeys();

/**
 * Estes testes existem por causa de um modo de falha específico do i18n: uma chave
 * que ninguém traduziu não dá erro de build, não dá erro de runtime e não aparece
 * no console. Ela simplesmente mostra o nome da chave na tela — ou, pior, mostra o
 * português para quem pediu inglês e não percebeu.
 *
 * Nove idiomas traduzidos à mão é exatamente o terreno onde esse buraco cresce,
 * porque o erro só aparece quando alguém já está jogando. Chegar aqui é o
 * momento em que a chave é lembrada; chegar depois é o jogador achando.
 */
test('todo idioma tem exatamente as mesmas chaves do português', () => {
  for (const locale of LOCALES) {
    if (locale.id === DEFAULT_LOCALE) continue;

    const dicionario = getDictionary(locale.id);
    assert.ok(dicionario, `${locale.id} não tem dicionário carregado`);

    const deste = new Set(Object.keys(dicionario));
    const esperadas = new Set(chaves);

    const faltando = chaves.filter((chave) => !deste.has(chave));
    const sobrando = [...deste].filter((chave) => !esperadas.has(chave));

    assert.deepEqual(
      faltando,
      [],
      `${locale.id} está sem ${faltando.length} chave(s): ${faltando.join(', ')}`
    );
    assert.deepEqual(
      sobrando,
      [],
      `${locale.id} tem ${sobrando.length} chave(s) que o português não declara: `
        + sobrando.join(', ')
    );
  }
});

test('nenhuma mensagem de outro idioma ficou em português', () => {
  // Só os idiomas de alfabeto latino. Hindi, chinês e japonês não têm como
  // conter uma palavra portuguesa, e o padrão nem se aplica a eles.
  const LATINOS = ['en', 'es', 'fr', 'de', 'it', 'pl'];

  // Palavras que SÓ existem em português entre os nove idiomas. A lista exige
  // cuidado duas vezes: "cave" é inglesa, "idioma" e "entrada" são espanholas,
  // "configura" é começo de "configuración", e "concluido" sem acento é espanhol.
  // Cada entrada aqui tem um acento ou uma letra que nenhum dos outros idiomas
  // usa, e é por isso que o padrão não acusa tradução boa.
  const SO_PORTUGUES =
    /\b(voc[eê]|rel[ií]q|selecion|fechar|voltar|escolh|conclu[ií]d|moeda|configuraç)\b/i;

  // Rótulos curtos são deixados no idioma original de propósito: o nome do jogo,
  // o do estúdio, e as siglas do HUD. Traduzir "HP" para "PV" muda o que o
  // jogador reconhece sem acrescentar nada.
  const PERMITIDOS = new Set([
    'menu.kicker',
    'hud.cave',
    'hud.biome',
    'hud.hp',
    'biomeSelect.status.dev',
    'scene.markerIn'
  ]);

  for (const id of LATINOS) {
    const dicionario = getDictionary(id);

    for (const chave of chaves) {
      if (PERMITIDOS.has(chave)) continue;

      const entrada = dicionario[chave];
      const formas = typeof entrada === 'string' ? [entrada] : Object.values(entrada);

      for (const forma of formas) {
        assert.ok(
          forma.trim().length > 0,
          `${id} · ${chave} está vazia. Uma mensagem vazia some na tela sem `
            + `nenhum aviso.`
        );
        assert.equal(
          forma,
          forma.trim(),
          `${id} · ${chave} tem espaço sobrando nas pontas: "${forma}"`
        );
        assert.doesNotMatch(
          forma,
          SO_PORTUGUES,
          `${id} · ${chave} ainda está em português: "${forma}"`
        );
      }
    }
  }
});

test('o japonês e o chinês não têm espaço sobrando nem mensagem vazia', () => {
  // Separado do teste acima porque o padrão de português não se aplica a eles, mas
  // a checagem de forma DOES se aplica: foi um espaço no começo de
  // `settings.fullscreen` que o segurou.
  for (const id of ['hi', 'zh-CN', 'ja']) {
    const dicionario = getDictionary(id);

    for (const chave of chaves) {
      const entrada = dicionario[chave];
      const formas = typeof entrada === 'string' ? [entrada] : Object.values(entrada);

      for (const forma of formas) {
        assert.ok(forma.trim().length > 0, `${id} · ${chave} está vazia`);
        assert.equal(forma, forma.trim(), `${id} · ${chave} tem espaço sobrando: "${forma}"`);
      }
    }
  }
});

test('toda mensagem com {chave} tem o mesmo conjunto de placeholders em todos', () => {
  // Um placeholder que existe em português e não existe na tradução vira
  // `{cave}` literal na tela do jogador. E o inverso — um `{name}` a mais na
  // tradução — vira texto solto. Os dois são silenciosos.
  const placeholders = (texto) =>
    [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  for (const locale of LOCALES) {
    if (locale.id === DEFAULT_LOCALE) continue;

    const dicionario = getDictionary(locale.id);
    const referencia = getDictionary(DEFAULT_LOCALE);

    for (const chave of chaves) {
      const base = referencia[chave];
      const destino = dicionario[chave];

      const baseFormas = typeof base === 'string' ? { '': base } : base;
      const destinoFormas = typeof destino === 'string' ? { '': destino } : destino;

      const baseVariaveis = [...new Set(Object.values(baseFormas).flatMap(placeholders))].sort();
      const destinoVariaveis = [...new Set(Object.values(destinoFormas).flatMap(placeholders))].sort();

      assert.deepEqual(
        destinoVariaveis,
        baseVariaveis,
        `${locale.id} · ${chave}: placeholders diferentes. `
          + `Esperado {${baseVariaveis.join('}, {')}}, `
          + `veio {${destinoVariaveis.join('}, {')}}`
      );
    }
  }
});

test('toda forma de plural existe em todos os idiomas que precisam dela', () => {
  // O polonês só resolve para `one`, `few` e `many`; o resto resolve para `one` e
  // `other`; o chinês e o japonês só para `other`. Uma forma que falta não dá
  // erro: `t()` cai para `other` e devolve a string errada em vez da certa.
  const NECESSARIAS = {
    pl: ['one', 'few', 'many'],
    'zh-CN': ['other'],
    ja: ['other']
  };
  const PADRAO = ['one', 'other'];

  for (const locale of LOCALES) {
    if (locale.id === DEFAULT_LOCALE) continue;

    const necessarias = NECESSARIAS[locale.id] ?? PADRAO;
    const dicionario = getDictionary(locale.id);

    for (const chave of chaves) {
      const entrada = dicionario[chave];
      const formas = typeof entrada === 'string' ? PADRAO : Object.keys(entrada);

      // Só as chaves de plural têm obrigação; as de forma única aceitam uma só.
      if (typeof entrada === 'string') continue;

      for (const forma of necessarias) {
        assert.ok(
          formas.includes(forma),
          `${locale.id} · ${chave} não tem a forma "${forma}". `
            + `Asnecessárias aqui são: ${necessarias.join(', ')}`
        );
      }
    }
  }
});

test('o polonês escolhe uma, poucas e muitas', () => {
  // A regra do polonês é a única que não é "1 ou o resto", e é a que mais dá
  // para errar: com `{count}` valendo 2 o substantivo é "jaskinie", e com 5 é
  // "jaskiń". Errar a categoria entrega um substantivo na declinação errada, que
  // o leitor polonês percebe na hora.
  assert.equal(pluralCategory('pl', 1), 'one');
  assert.equal(pluralCategory('pl', 2), 'few');
  assert.equal(pluralCategory('pl', 3), 'few');
  assert.equal(pluralCategory('pl', 4), 'few');
  assert.equal(pluralCategory('pl', 5), 'many');
  assert.equal(pluralCategory('pl', 12), 'many');
  assert.equal(pluralCategory('pl', 14), 'many');
  assert.equal(pluralCategory('pl', 22), 'few');
  assert.equal(pluralCategory('pl', 25), 'many');
  assert.equal(pluralCategory('pl', 112), 'many');
  assert.equal(pluralCategory('pl', 0), 'many');
});

test('as outras línguas seguem a regra de 1 ou o resto', () => {
  for (const locale of ['en', 'es', 'de', 'it', 'pt-BR']) {
    assert.equal(pluralCategory(locale, 1), 'one');
    assert.equal(pluralCategory(locale, 0), 'other');
    assert.equal(pluralCategory(locale, 2), 'other');
  }

  // Francês trata o zero como singular, e é o idioma em que isso mais aparece numa
  // tela de contagem.
  assert.equal(pluralCategory('fr', 0), 'one');

  // Hindi junta zero e um.
  assert.equal(pluralCategory('hi', 0), 'one');
  assert.equal(pluralCategory('hi', 1), 'one');
  assert.equal(pluralCategory('hi', 2), 'other');

  // Sem plural em chinês e japonês.
  assert.equal(pluralCategory('zh-CN', 1), 'other');
  assert.equal(pluralCategory('ja', 7), 'other');
});

test('a detecção casa por prefixo, não por igualdade', () => {
  // O navegador diz `en-GB`, `pt-PT`, `zh-HK`. Sem o prefixo, todo mundo cairia
  // no português — que é exatamente o caso do jogador que não entende nada.
  assert.equal(detectLocale(['en-GB']), 'en');
  assert.equal(detectLocale(['pt-PT']), 'pt-BR');
  assert.equal(detectLocale(['pt-BR']), 'pt-BR');
  assert.equal(detectLocale(['zh-HK', 'en']), 'zh-CN');
  assert.equal(detectLocale(['zh-TW']), 'zh-CN');
  assert.equal(detectLocale(['en-US', 'pl']), 'en');

  // Francês canadense e alemão suíço entram pelo prefixo.
  assert.equal(detectLocale(['fr-CA']), 'fr');
  assert.equal(detectLocale(['de-AT']), 'de');
  assert.equal(detectLocale(['it-CH']), 'it');
  assert.equal(detectLocale(['ja']), 'ja');
  assert.equal(detectLocale(['hi-IN']), 'hi');
});

test('a detecção percorre a lista de preferências na ordem', () => {
  // Quem tem navegador em [ja, en] tem japonês: a primeira preferência é a que
  // ele pediu, e as outras são o que ele aceita.
  assert.equal(detectLocale(['ja', 'en']), 'ja');
  assert.equal(detectLocale(['ko', 'ko-KR', 'es', 'en']), 'es');
});

test('a detecção cai no português quando não há o que casar', () => {
  assert.equal(detectLocale(['ko']), DEFAULT_LOCALE);
  assert.equal(detectLocale(['ar', 'he']), DEFAULT_LOCALE);
  assert.equal(detectLocale([]), DEFAULT_LOCALE);
  assert.equal(detectLocale(null), DEFAULT_LOCALE);
  assert.equal(detectLocale([null, '', '   ']), DEFAULT_LOCALE);
});

test('o tradutor interpola e escolhe a plural pelo count', () => {
  const polaco = createTranslator('pl');

  assert.equal(polaco('menu.taglineCaves', { count: 1 }), '1 jaskinia');
  assert.equal(polaco('menu.taglineCaves', { count: 3 }), '3 jaskinie');
  assert.equal(polaco('menu.taglineCaves', { count: 5 }), '5 jaskiń');

  const ingles = createTranslator('en');
  assert.equal(ingles('lobby.nextCave'), 'Next cave');
  assert.equal(ingles('msg.coinFound', { count: 1 }), 'You found 1 coin.');
  assert.equal(ingles('msg.coinFound', { count: 4 }), 'You found 4 coins.');

  // Os dois números da descrição de melhoria: a chance e a quantidade. A plural é
  // da quantidade, então quem chama precisa mandar `count` e não `chance`.
  const recompensa = createTranslator('en')('reward.coins.description', { chance: 20, count: 2 });
  assert.equal(recompensa, '20% chance to collect +2 coins.');
});

test('uma chave desconhecida aparece com o nome, e nunca vazia', () => {
  // Devolver '' esconderia o erro da tela. Devolver a chave com o prefixo do
  // idioma deixa visível QUAL idioma está com a chave faltando.
  const faltando = createTranslator('fr')('chave.que.nao.existe');
  assert.match(faltando, /^\[fr\] chave\.que\.nao\.existe$/);
});

test('um idioma desconhecido cai no português em vez de quebrar', () => {
  assert.equal(isKnownLocale('pt-BR'), true);
  assert.equal(isKnownLocale('xx'), false);
  assert.equal(createTranslator('xx')('lobby.nextCave'), 'Próxima cave');
});

test('placeholder sem valor fica como está, para o buraco aparecer', () => {
  const ingles = createTranslator('en');
  assert.equal(ingles('biomeSelect.unlockAt'), 'Cave {n}');
  assert.equal(ingles('biomeSelect.unlockAt', { outro: 3 }), 'Cave {n}');
  assert.equal(ingles('biomeSelect.unlockAt', { n: 3 }), 'Cave 3');
});

test('o idioma em vigor é o que setLocale escolhe', () => {
  // É o caminho que a cena do Phaser usa: ela pede texto de dezenas de lugares
  // sem um `t` na mão, e depende do módulo guardar o idioma atual.
  try {
    setLocale('ja');
    assert.equal(t('lobby.nextCave'), '次の Cave');

    setLocale('de');
    assert.equal(t('lobby.nextCave'), 'Nächste Höhle');

    // Idioma inválido não fica valendo: ele volta para o padrão.
    setLocale('klingon');
    assert.equal(t('lobby.nextCave'), 'Próxima cave');
  } finally {
    setLocale(DEFAULT_LOCALE);
  }
});

test('a lista de idiomas mostra o nome no próprio idioma', () => {
  // A tela de idioma é a única em que o jogador NÃO está lendo português ainda.
  // "Alemão" não ajuda quem não sabe português a achar "Deutsch".
  for (const locale of LOCALES) {
    assert.ok(locale.nativeName?.trim(), `${locale.id} está sem nativeName`);
    assert.ok(locale.name?.trim(), `${locale.id} está sem name`);
  }

  const porNome = new Map(LOCALES.map((l) => [l.id, l.nativeName]));
  assert.equal(porNome.get('de'), 'Deutsch');
  assert.equal(porNome.get('ja'), '日本語');
  assert.equal(porNome.get('zh-CN'), '简体中文');
  assert.equal(porNome.get('hi'), 'हिन्दी');
});

test('o português cobre tudo que a tela mostra, e nenhum texto ficou solto', () => {
  // Guarda contra a chave existir no dicionário e ninguém usar. Não prova que a
  // tradução está certa — isso é revisão de quem fala a língua — mas prova que o
  // conjunto tem o tamanho que a tela pede.
  assert.ok(chaves.length > 180, `só ${chaves.length} chaves declaradas`);

  for (const prefixo of ['menu.', 'hud.', 'settings.', 'biomeSelect.', 'lobby.', 'shop.', 'pause.', 'exit.', 'language.']) {
    const doPrefixo = chaves.filter((chave) => chave.startsWith(prefixo));
    assert.ok(doPrefixo.length > 0, `nenhuma chave com o prefixo ${prefixo}`);
  }
});

test('toda chave de conteúdo aponta para uma chave que existe', () => {
  // `progression.js` guarda a chave ao lado do texto em português, e a tela usa a
  // chave. Um erro de digitação em `nameKey` não quebraria o build nem o runtime:
  // o `t()` devolveria `[pt-BR] biome.sunstne.name` e o cartão do bioma mostraria
  // aquilo no lugar do nome. Este teste é o que transforma esse silêncio em
  // falha.
  const dicionario = getDictionary(DEFAULT_LOCALE);
  const exige = (chave, onde) => {
    assert.ok(
      dicionario[chave] !== undefined,
      `${onde} aponta para "${chave}", que não existe no dicionário`
    );
  };

  for (const biome of BIOMES) {
    exige(biome.nameKey, `bioma ${biome.id}.nameKey`);
    exige(biome.rangeKey, `bioma ${biome.id}.rangeKey`);
  }

  for (const relic of Object.values(RELIC_CATALOG)) {
    exige(relic.nameKey, `relíquia ${relic.id}.nameKey`);
    exige(relic.descriptionKey, `relíquia ${relic.id}.descriptionKey`);
  }

  for (const objective of OBJECTIVE_CATALOG) {
    exige(objective.labelKey, `objetivo ${objective.id}.labelKey`);
    exige(objective.descriptionKey, `objetivo ${objective.id}.descriptionKey`);
  }
});

test('toda chave usada no código existe no dicionário', async () => {
  // O teste de conjuntos prova que os dez idiomas batem entre si. Este prova que
  // eles batem com o CÓDIGO — que nenhuma chamada `t('...')` no `App.jsx` ou no
  // `CaveScene` aponte para uma chave que ninguém declarou.
  //
  // Sem ele, uma chave errada em uma chamada nova dá o sintoma mais chato que
  // existe em i18n: a tela mostra `[pt-BR] lobby.proxmaCave` e o jogo continua
  // funcionando, sem erro de console, sem build quebrado. A detecção é por
  // análise estática do texto do arquivo, e não por importar o componente — o
  // `App.jsx` precisa de DOM e de Phaser, e puxar o React inteiro para um teste
  // de string seria caro.
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { join } = await import('node:path');

  // Sem `dirname`: o URL já termina em `/`, e `dirname` disso sobe um nível e
  // aponta para a raiz do repositório em vez de `src/`.
  const raiz = fileURLToPath(new URL('../src/', import.meta.url));
  const dicionario = getDictionary(DEFAULT_LOCALE);

  // `t('chave')` com literal, e `t(algo ? 'a' : 'b')` também: as duas formas
  // aparecem, e a segunda é a que o olho passa por cima.
  const usos = /(?:^|[^\w$])t\(\s*(?:\?|:\s*)?'([a-z][\w.]*)'/g;

  // Um piso por arquivo, calibrado no que existe hoje. Ele existe para o regex
  // não poder falhar em silêncio: se a análise estática parar de casar, o
  // caminho de chave errada deixa de ser testado e nada avisa. O número é
  // Um piso por arquivo, calibrado no que existe hoje. Ele existe para o regex
  // não poder falhar em silêncio: se a análise estática parar de casar, o
  // caminho de chave errada deixa de ser testado e nada avisa. O número é
  // deliberadamente folgado — serve de rede, não de medição.
  const MINIMO_DE_CHAVES = { 'App.jsx': 60, 'CaveScene.js': 15 };

  for (const arquivo of ['App.jsx', join('game', 'scenes', 'CaveScene.js')]) {
    // O caminho vem com separador do sistema operacional, e a chave do mapa é o
    // nome do arquivo. Sem esta linha a comparação cai no piso genérico e o
    // `App.jsx` inteiro deixaria de ter teto próprio.
    const nome = arquivo.split(/[\\/]/).pop();
    const texto = await readFile(join(raiz, arquivo), 'utf8');

    // Fora os comentários: a documentação explica o motivo usando o nome da chave,
    // e uma citação em comentário não é uma chamada.
    const semComentario = texto
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');

    const encontradas = new Set();
    let achado;
    while ((achado = usos.exec(semComentario)) !== null) {
      encontradas.add(achado[1]);
    }

    for (const chave of encontradas) {
      assert.ok(
        dicionario[chave] !== undefined,
        `${arquivo} chama t('${chave}'), que não existe no dicionário de `
          + `${DEFAULT_LOCALE}`
      );
    }

    assert.ok(
      encontradas.size >= (MINIMO_DE_CHAVES[nome] ?? 15),
      `${arquivo} só tem ${encontradas.size} chave(s) usada(s). Ou o regex parou `
        + `de casar, ou o arquivo mudou de tamanho.`
    );
  }
});

test('cada idioma traduziu o conteúdo, e não copiei o português', () => {
  // A primeira versão deste teste comparava chave a chave e falhava em cinco
  // nomes: "Mina Solar", "Núcleo Incandescente", "Explorador", "Curador" e
  // "Núcleo de Prisma" são exatamente iguais em espanhol. Não são erro de
  // tradução — são cognatos, e por isso a comparação estrita não distingue
  // "esqueci de traduzir" de "a tradução certa coincide com o original". Um
  // teste que acusa tradução boa é um teste que as pessoas learn a ignorar.
  //
  // O que este teste guarda de verdade é o outro extremo: um arquivo inteiro
  // copiado do português. Para isso, uma proporção.
  const base = getDictionary(DEFAULT_LOCALE);
  const valor = (v) => (typeof v === 'string' ? v : Object.values(v).join('|'));

  const chaves = [
    ...BIOMES.flatMap((b) => [b.nameKey, b.rangeKey]),
    ...Object.values(RELIC_CATALOG).flatMap((r) => [r.nameKey, r.descriptionKey]),
    ...OBJECTIVE_CATALOG.flatMap((o) => [o.labelKey, o.descriptionKey])
  ];

  // A faixa de caves é arábico e uma sigla em todos os idiomas, então fica de
  // fora da conta: seis chaves que nunca diferem tornariam o limiar mais fácil
  // de alcançar sem dizer nada.
  const contadas = chaves.filter((chave) => !chave.endsWith('.range'));
  const MINIMO = 0.7;

  for (const { id } of LOCALES) {
    if (id === DEFAULT_LOCALE) continue;

    const destino = getDictionary(id);
    const iguais = contadas.filter((chave) => valor(base[chave]) === valor(destino[chave]));
    const traduzidas = 1 - iguais.length / contadas.length;

    assert.ok(
      traduzidas >= MINIMO,
      `${id}: só ${(traduzidas * 100).toFixed(0)}% do conteúdo difere do `
        + `português, e o mínimo é ${(MINIMO * 100).toFixed(0)}%. `
        + `Iguais: ${iguais.join(', ')}`
    );
  }
});
