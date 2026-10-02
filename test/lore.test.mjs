import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { BIOMES } from '../src/game/progression.js';
import {
  CHAVE_FALANTE,
  LORE_POR_BIOMA,
  caminhoDaImagem,
  deveAbrirLore,
  imagensDaLore,
  paineisDoBioma,
  precarLore,
  proximoIndice,
  temLore
} from '../src/game/lore.js';
import { DEFAULT_LOCALE, LOCALES, getDictionary } from '../src/i18n/index.js';

/**
 * A lore de entrada do bioma.
 *
 * ## O que estes testes seguram
 *
 * Três coisas que nenhuma delas dá erro visível se quebrar:
 *
 * 1. **O arquivo da imagem existe.** Um nome errado de imagem não quebra o build,
 *    não quebra o runtime e não reclama no console — a tag `<img>` mostra o ícone
 *    de imagem quebrada e a sequência continua. Foi quase assim que o
 *    `minerador_nomal.png` do material de origem entrou: é `nomal`, sem o `r`, e
 *    ninguém ia ver até alguém abrir a Mina Solar.
 *
 * 2. **A chave de fala existe.** O mesmo silêncio do item 1, com a chave errada:
 *    o `t()` devolve `[pt-BR] lore.sunstone.p9.a` e isso aparece na tarja. A
 *    análise estática do i18n pega `t('...')` escrito no código, e as falas da lore
 *    são **dinâmicas** — vêm do catálogo. Nenhum dos dois testes veria a chave
 *    errada sozinha; este é o que olha.
 *
 * 3. **O último painel fecha.** `proximoIndice` devolvendo `indice + 1` sem o
 *    limite deixa a sequência passar do fim e renderizar um painel `undefined`.
 *    Não dá erro nenhum: é um React que desenha menos uma coisa.
 */

const raiz = fileURLToPath(new URL('../', import.meta.url));
const dicionario = getDictionary(DEFAULT_LOCALE);

/** Todos os painéis de todos os biomas, com o bioma de origem. */
const todosOsPaineis = Object.entries(LORE_POR_BIOMA).flatMap(([bioma, paineis]) =>
  paineis.map((painel, indice) => ({ bioma, painel, indice }))
);

// --- a intro abre quando, e não quando -----------------------------------

test('a intro abre na entrada do bioma e no meio dele não', () => {
  for (const bioma of BIOMES) {
    if (!temLore(bioma.id)) continue;

    assert.equal(
      deveAbrirLore(bioma.id, bioma.startCave),
      true,
      `${bioma.name}: chegar na primeira cave não abre a intro`
    );

    // Qualquer outra cave do mesmo bioma é jogo acontecendo, não chegada.
    for (const cave of [bioma.startCave + 1, Math.floor((bioma.startCave + bioma.endCave) / 2), bioma.endCave]) {
      if (cave > bioma.endCave) continue;

      assert.equal(
        deveAbrirLore(bioma.id, cave),
        false,
        `${bioma.name}: a cave ${cave} abriu a intro, e não é chegada`
      );
    }
  }
});

test('voltar ao começo do bioma depois de morrer não abre a intro', () => {
  // O recomeço da run devolve a pessoa à primeira cave do bioma em que ela morreu, e
  // essa cave é a primeira do bioma. Sem `pularLore`, o teste da primeira cave a tomava
  // como chegada e a intro abria de novo — seis painéis a cada morte, no gesto mais
  // comum que existe depois de perder.
  for (const bioma of BIOMES) {
    if (!temLore(bioma.id)) continue;

    assert.equal(
      deveAbrirLore(bioma.id, bioma.startCave, true),
      false,
      `${bioma.name}: o recomeço depois da morte abriu a intro de novo`
    );
  }
});

test('a intro de um bioma não abre ao chegar em outro', () => {
  // A cave manda, e não o bioma pedido. Se `pularLore` fosse a única guarda, um
  // destino com bioma errado passaria.
  assert.equal(deveAbrirLore('sunstone', 51), false, 'a intro do Mina Solar abriu na cave 51');
  assert.equal(deveAbrirLore('frost', 1), false, 'a intro da Gruta de Gelo abriu na cave 1');
});

test('bioma sem roteiro nunca abre intro, com ou sem pular', () => {
  for (const bioma of BIOMES) {
    if (temLore(bioma.id)) continue;

    assert.equal(deveAbrirLore(bioma.id, bioma.startCave), false, bioma.name);
    assert.equal(deveAbrirLore(bioma.id, bioma.startCave, true), false, bioma.name);
  }
});

// --- a Mina Solar tem, os outros não -------------------------------------

const COM_ROTEIRO = ['sunstone', 'frost', 'ember', 'ruins', 'wind', 'crystal'];

test('todos os seis biomas têm roteiro, e são estes', () => {
  // A lista de controle existe para que "um bioma novo entra sem roteiro" não passe em silêncio".
  // Entrar sem roteiro é o certo; o que não pode é ninguém notar que a lista
  // de controle ficou velha.
  assert.deepEqual(BIOMES.filter((biome) => temLore(biome.id)).map((biome) => biome.id), COM_ROTEIRO);

  assert.deepEqual(
    BIOMES.filter((biome) => !temLore(biome.id)).map((biome) => biome.id),
    BIOMES.filter((biome) => !COM_ROTEIRO.includes(biome.id)).map((biome) => biome.id),
    'o conjunto de biomas sem lore mudou. Um bioma novo entra sem roteiro, e isso '
      + 'é o certo — mas a lista de controle precisa saber.'
  );
});

test('bioma sem roteiro abre lista vazia, e nunca painel indefinido', () => {
  // A lista vazia é o que impede o painel em branco esperando alguém apertar
  // alguma coisa para sair. `null` aqui quebraria o `.map` da tela.
  for (const biome of BIOMES) {
    if (temLore(biome.id)) continue;

    const paineis = paineisDoBioma(biome.id);

    assert.ok(Array.isArray(paineis), `${biome.id} devolveu ${typeof paineis}`);
    assert.equal(paineis.length, 0, `${biome.id} devolveu painel sem ter roteiro`);
  }

  assert.deepEqual(paineisDoBioma('bioma-que-nao-existe'), []);
  assert.equal(temLore('bioma-que-nao-existe'), false);
});

// --- os arquivos existem -------------------------------------------------

test('toda imagem de painel existe em public/assets', async () => {
  const nomes = imagensDaLore();

  assert.ok(nomes.length > 0, 'a lista de imagens veio vazia');

  for (const nome of nomes) {
    const caminho = join(raiz, 'public', caminhoDaImagem(nome));

    await assert.doesNotReject(
      access(caminho),
      `a lore pede "${nome}", e não existe ${caminhoDaImagem(nome)} em public/assets. `
        + 'A imagem quebrada não dá erro no console — ela só não aparece.'
    );
  }
});

test('a lista de imagens não tem repetido nem extensão', () => {
  const nomes = imagensDaLore();

  assert.deepEqual(
    nomes,
    [...new Set(nomes)],
    'a lista de imagens tem nome repetido'
  );

  for (const nome of nomes) {
    assert.doesNotMatch(nome, /\.(png|jpe?g|webp)$/i, `"${nome}" tem extensão, e o catálogo guarda sem`);
  }
});

// --- as falas existem ----------------------------------------------------

test('toda chave de fala existe em todos os dez idiomas', () => {
  const chaves = new Set();

  for (const painel of todosOsPaineis) {
    assert.ok(
      painel.painel.falas.length > 0,
      `${painel.biome} painel ${painel.indice + 1} não tem fala nenhuma`
    );

    for (const chave of painel.painel.falas) chaves.add(chave);
  }

  assert.ok(chaves.size > 0, 'nenhuma fala declarada');

  for (const { id } of LOCALES) {
    const alvo = getDictionary(id);

    for (const chave of [CHAVE_FALANTE, ...chaves]) {
      assert.notEqual(
        alvo[chave],
        undefined,
        `${id} está sem "${chave}". A tela mostraria "[${id}] ${chave}" na tarja.`
      );
    }
  }
});

// --- a sequência anda e fecha --------------------------------------------

test('a sequência percorre todos os painéis e fecha uma vez só', () => {
  for (const [bioma, paineis] of Object.entries(LORE_POR_BIOMA)) {
    let indice = 0;
    const vistos = [];
    let fechadaEm = -1;

    for (let passo = 0; passo < paineis.length + 5; passo += 1) {
      const proximo = proximoIndice(paineis, indice);

      if (proximo === -1) {
        fechadaEm = passo;
        break;
      }

      assert.ok(
        proximo > indice,
        `${bioma}: o índice não avançou (${indice} -> ${proximo}). `
          + 'Um laço que não anda deixa a pessoa presa na mesma fala.'
      );

      vistos.push(proximo);
      indice = proximo;
    }

    assert.ok(fechadaEm >= 0, `${bioma}: a sequência não fechou em ${paineis.length} painéis`);
    assert.equal(
      fechadaEm,
      paineis.length - 1,
      `${bioma}: fechou depois de ${fechadaEm + 1} passos para ${paineis.length} painéis`
    );

    // `vistos` são os índices **entrados** depois do 0. O último painel é onde a
    // pessoa está quando a sequência fecha, e ele não entra na lista: foi de lá
    // que `proximoIndice` respondeu `-1`.
    assert.deepEqual(
      vistos,
      paineis.slice(1).map((_, i) => i + 1),
      `${bioma}: a ordem dos painéis não bate`
    );
    assert.equal(
      indice,
      paineis.length - 1,
      `${bioma}: fechou no painel ${indice + 1} e não no ${paineis.length}`
    );
  }
});

test('índice fora da faixa fecha, e não devolve lixo', () => {
  // A tela pode chegar aqui com um índice velho se o bioma mudar no meio da
  // sequência — por exemplo, o jogador entra no bioma e o save é reidratado. O
  // `undefined` de `paineis[indice + 1]` viraria um painel quebrado na tela.
  assert.equal(proximoIndice([], 0), -1);
  assert.equal(proximoIndice([], 99), -1);
  assert.equal(proximoIndice(undefined, 0), -1);
  assert.equal(proximoIndice(['a'], 0), -1);
  assert.equal(proximoIndice(['a', 'b'], 5), -1);
  assert.equal(proximoIndice(['a', 'b'], -1), 0);
  assert.equal(proximoIndice(['a', 'b'], undefined), 0);
});

// --- o pré-carregamento ---------------------------------------------------

test('a pré-carga pede uma imagem por expressão, e não uma por painel', () => {
  // O roteiro da Mina Solar repete `assustado` em dois painéis. Uma imagem por
  // painel criaria dois objetos para o mesmo arquivo, e o código passaria a dizer
  // que baixou duas vezes o que baixou uma.
  const criadas = [];
  const imagens = precarLore('sunstone', () => {
    const img = { src: '' };
    criadas.push(img);
    return img;
  });

  const distintos = new Set(imagens.map((img) => img.src));
  const esperadas = imagensDaLore().filter((nome) =>
    paineisDoBioma('sunstone').some((painel) => painel.imagem === nome)
  );

  assert.equal(distintos.size, esperadas.length, 'duas imagens com o mesmo src');
  assert.deepEqual(
    [...distintos].sort(),
    esperadas.map((nome) => caminhoDaImagem(nome)).sort()
  );
  assert.equal(distintos.size, 5, 'a Mina Solar mudou de expressões');

  for (const img of imagens) {
    assert.match(img.src, /^assets\/minerador_[a-z]+\.png$/, `src inesperado: ${img.src}`);
  }
});

test('a pré-carga de bioma sem roteiro não pede imagem nenhuma', () => {
  const criadas = [];
  const conta = () => { criadas.push(1); return {}; };

  // O exemplo é um id inventado, e passou a ser quando o sexto roteiro entrou.
  // Antes ele vinha da lista real de biomas sem lore, o que tinha uma
  // vantagem: o teste cobria o caso de verdade. Depois, nenhum bioma ficou sem
  // lore, e a lista real não tinha mais nada para oferecer — o teste passaria
  // parado ou reprovaria por um motivo que não é o dele.
  //
  // Um id inventado testa a mesma coisa, que é o que importa: o caminho de
  // 'bioma que não tem painel' tem de devolver lista vazia e não pedir imagem.
  assert.deepEqual(precarLore('bioma-que-nao-existe', conta), []);
  assert.deepEqual(precarLore('', conta), []);
  assert.equal(criadas.length, 0);
});

test('toda bioma real tem roteiro, e nenhum caminho ficou sem testar', () => {
  // As duas metades do mesmo contrato. O teste de cima usa id inventado para
  // não ter um bioma de verdade sobrando; este garante que a lista real está
  // toda coberta — senão um bioma novo entra sem lore e ninguém nota, porque
  // o caminho de 'sem roteiro' não tem nenhum bioma real para exercitar.
  assert.deepEqual(BIOMES.map((biome) => biome.id), COM_ROTEIRO);

  for (const { id } of LOCALES) {
    const dicionario = getDictionary(id);

    for (const bioma of COM_ROTEIRO) {
      const paineis = paineisDoBioma(bioma);
      assert.ok(paineis.length > 0, `${bioma} entrou sem painel em ${id}`);

      for (const painel of paineis) {
        for (const chave of painel.falas) {
          assert.ok(dicionario[chave], `${id} · ${chave} falta para ${bioma}`);
        }
      }
    }
  }
});

test('sem `Image` no ambiente, a pré-carga devolve lista vazia em vez de quebrar', () => {
  // Este arquivo é importado por teste em Node, onde `Image` não existe. Sem o
  // `typeof`, a chamada quebraria o `node --test` inteiro em vez de um teste só.
  assert.deepEqual(precarLore('sunstone', null), []);
});

// --- o roteiro do autor ---------------------------------------------------

test('os seis painéis da Mina Solar são os do roteiro, na ordem', () => {
  // O material de origem tem cinco expressões e seis painéis — `assustado`
  // aparece duas vezes, no começo e no fim do susto. A ordem é do roteiro e não
  // do arquivo: o mineiro estranha, se perde, pensa, cansa, estranha de novo e vai.
  // Usar cada imagem uma vez só seria trocar o texto que existe por um inventado.
  const esperado = [
    'minerador_assustado',
    'minerador_melancolico',
    'minerador_pensativo',
    'minerador_exausto',
    'minerador_assustado',
    'minerador_normal'
  ];

  assert.deepEqual(
    paineisDoBioma('sunstone').map((painel) => painel.imagem),
    esperado
  );
});

test('o texto do roteiro está intacto, palavra por palavra', () => {
  // A fala é do autor. Este teste existe para uma mudança de texto ser
  // **depropósito** — alguém ajustar um acento e não perceber que estava
  // reescrevendo uma cena. A troca de verdade é uma edição neste arquivo.
  const falas = {};

  for (const painel of paineisDoBioma('sunstone')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'lore.sunstone.p1.a': 'Que barulho foi esse??',
    'lore.sunstone.p2.a': 'É oficial! Estou perdido!',
    'lore.sunstone.p2.b': 'Sabia que não deveria ter vindo tão fundo!!',
    'lore.sunstone.p3.a': 'Pelo menos tenho meu equipamento!!',
    'lore.sunstone.p3.b': 'Agora precisa dar o fora daqui!!',
    'lore.sunstone.p4.a': 'O problema é que este lugar está cheio de Bombas!!',
    'lore.sunstone.p5.a': 'Um passo em falso e "BOOM"...',
    'lore.sunstone.p6.a': 'Bom...não vou ficar aqui pra sempre então..PARTIU!!!'
  });
});

test('os cinco painéis da Gruta de Gelo são os do roteiro, na ordem', () => {
  // Cinco painéis, não seis: o roteiro é mais curto e a regra continua sendo a
  // mesma — a ordem e as expressões são do texto. Completar com as imagens que
  // sobraram no material seria inventar cena.
  assert.deepEqual(
    paineisDoBioma('frost').map((painel) => painel.imagem),
    [
      'minerador_frio',
      'minerador_surpreso',
      'minerador_exausto',
      'minerador_pensativo',
      'minerador_normal'
    ]
  );
});

test('o texto da Gruta de Gelo está intacto, palavra por palavra', () => {
  // Mesmo motivo da Mina Solar: a fala é do autor, e uma troca de verdade é uma
  // edição neste arquivo com o texto junto.
  //
  // Três coisas foram acertadas em relação ao material de origem, e são as
  // únicas: `esse recursos` (que erria o número), `rapido` e `por ai` sem acento,
  // e `Gruta De Gelo` com D maiúsculo — que passa a bater com o nome que o jogo
  // já mostra no cartão do bioma.
  const falas = {};

  for (const painel of paineisDoBioma('frost')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'lore.frost.p1.a': 'Que frio.....',
    'lore.frost.p2.a': 'Meus mapas não mostram esse tipo de lugar, vou chamar de Gruta de Gelo.',
    'lore.frost.p3.a': 'Achei que seria mais fácil....',
    'lore.frost.p4.a': 'Bom pelo que vi não tem só bombas espalhadas por aí!!',
    'lore.frost.p4.b': 'Posso usar esses recursos que achei para me ajudar a sair daqui mais rápido!!',
    'lore.frost.p5.a': 'Vamos continuar!!'
  });
});

test('o nome do bioma no texto é o mesmo que o cartão do bioma', () => {
  // A fala nomeia a Gruta de Gelo por extenso, e o texto tem que dizer a mesma
  // coisa que a HUD. Divergir os dois é a forma mais fácil de a lore "confirmar"
  // um nome que o jogo não usa.
  const gelo = BIOMES.find((biome) => biome.id === 'frost');
  const noNome = dicionario[ gelo.nameKey ];

  assert.ok(noNome, 'o nome do bioma frost não existe no dicionário');
  assert.match(
    dicionario['lore.frost.p2.a'],
    new RegExp(noNome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `a fala nomeia a caverna de outro jeito que o cartão: "${noNome}"`
  );
});

test('os quatro painéis das Profundezas Rubras são os do roteiro, na ordem', () => {
  // Quatro painéis, o mais curto até agora. A regra segue a mesma dos outros: a
  // ordem e as expressões são do texto. `exausto`, `pensativo` e `normal` já
  // vinham de outros roteiros — a expressão nova é só `calor`.
  assert.deepEqual(
    paineisDoBioma('ember').map((painel) => painel.imagem),
    ['minerador_calor', 'minerador_exausto', 'minerador_pensativo', 'minerador_normal']
  );
});

test('o texto das Profundezas Rubras está intacto, palavra por palavra', () => {
  // Um acerto em relação ao material de origem, e um só: `Se manter` virou
  // `Se mantiver`, que é o condicional que a frase pede ("se eu mantiver esse
  // avanço, logo vou finalizar").
  //
  // Os gritos ficaram como estão: "QUENTEEEEE" e "BORAAA" são a voz do
  // roteiro, e traduzi-los para um grito contido seria trocar o personagem.
  const falas = {};

  for (const painel of paineisDoBioma('ember')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'lore.ember.p1.a': 'QUENTEEEEE....',
    'lore.ember.p2.a': 'Preciso manter o foco, ainda falta muito...',
    'lore.ember.p3.a': 'Se mantiver esse avanço logo vou finalizar!!',
    'lore.ember.p4.a': 'Dito isso....BORAAA!!'
  });
});

test('a gritaria do autor sobrevive em todos os idiomas', () => {
  // A propriedade e pontuacao de gritaria, que e contavel em qualquer idioma:
  // "Que lugar INCRIVEL!!!!" e "BORAAA!!" tem ponto e exclamacao porque o
  // mineiro esta gritando ou sufocando.
  //
  // ## Por que a lista se deriva em vez de ser escrita
  //
  // A versao anterior tinha a lista na mao, com as duas falas das Profundezas
  // Rubras. O proximo roteiro com grito — as Ruinas Abissais, que abrem com
  // "Que lugar INCRIVEL!!!!" — entraria sem ser coberto, e ninguem notaria ate
  // alguem traduzir a frase para um tom contido.
  //
  // Derivar do proprio texto resolve: toda fala de lore que tem quatro ou mais
  // marcas de pontuacao no portugues e uma fala que precisa gritar em qualquer
  // idioma. Uma falas de preciso (`ainda falta muito...`, tres pontos) fica de
  // fora sozinha, e um roteiro novo entra na cobertura sem mexer no teste.
  const MARCADORES = /[.!?]/gu;
  const MINIMO = 4;

  const gritadas = Object.entries(dicionario).filter(
    ([chave, valor]) =>
      chave.startsWith('lore.') &&
      typeof valor === 'string' &&
      (valor.match(MARCADORES) ?? []).length >= MINIMO
  );

  assert.ok(gritadas.length > 0, 'nenhuma fala de lore foi reconhecida como gritaria');

  for (const [chave, original] of gritadas) {
    for (const { id } of LOCALES) {
      const texto = getDictionary(id)[chave];
      const quantos = (texto.match(MARCADORES) ?? []).length;

      assert.ok(
        quantos >= MINIMO,
        `${id} · ${chave} tem ${quantos} marca(s) de pontuacao e o minimo e ${MINIMO}. `
          + `"${texto}" — o original grita ("${original}") e a traducao nao.`
      );
    }
  }
});

test('os quatro painéis das Ruínas Abissais são os do roteiro, na ordem', () => {
  // Duas expressões novas (`sorridente` e `furioso`); `surpreso` e `normal` já
  // vinham de outros roteiros. A ordem é a do texto: estranha o lugar, identifica
  // o que é, sonha em voltar, e decide seguir.
  assert.deepEqual(
    paineisDoBioma('ruins').map((painel) => painel.imagem),
    ['minerador_surpreso', 'minerador_normal', 'minerador_sorridente', 'minerador_furioso']
  );
});

test('o texto das Ruínas Abissais está intacto, palavra por palavra', () => {
  // Um acerto em relação ao material de origem, e um só: `ruinas` sem acento.
  const falas = {};

  for (const painel of paineisDoBioma('ruins')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'lore.ruins.p1.a': 'Que lugar INCRÍVEL!!!!',
    'lore.ruins.p2.a': 'São ruínas de alguma civilização antiga!',
    'lore.ruins.p3.a': 'Talvez algum dia eu volte para explorar mais!',
    'lore.ruins.p4.a': 'Agora preciso avançar!!'
  });
});

test('os quatro painéis da Galeria de Vento são os do roteiro, na ordem', () => {
  // Uma expressão nova, `segurando_capacete`, que é a pose certa para um painel
  // aberto com um grito de vento. As outras três já vinham de outros roteiros —
  // `furioso` fecha as Ruínas Abissais e volta aqui, com a mesma energia mas por
  // outro motivo: lá era pressa, aqui é só vento na cara.
  assert.deepEqual(
    paineisDoBioma('wind').map((painel) => painel.imagem),
    [
      'minerador_segurando_capacete',
      'minerador_pensativo',
      'minerador_exausto',
      'minerador_furioso'
    ]
  );
});

test('o texto da Galeria de Vento está intacto, palavra por palavra', () => {
  // Um acerto em relação ao material de origem, e um só: `proóxima`, que trazia o
  // acento no O. O grito de abertura fica como está nos dez idiomas, porque é ele
  // que dá o tom do bioma inteiro.
  const falas = {};

  for (const painel of paineisDoBioma('wind')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'lore.wind.p1.a': 'AHOOO...SEGURAA!!',
    'lore.wind.p2.a': 'Provavelmente essa ventania indica que a saída está próxima.',
    'lore.wind.p3.a': 'Não vejo a hora de tomar um banho!',
    'lore.wind.p4.a': 'VAMOS EM FRENTE!'
  });
});

test('os quatro painéis da Câmara de Cristal são os do roteiro, na ordem', () => {
  // Último roteiro. Nenhuma expressão nova: os quatro mineiros já eram de
  // outros biomas, e a ordem conta a história ao contrário dos outros — ele
  // chega cansado, lê a saída como próxima, estranha o lugar, e só então decide
  // que os cristais são afiados.
  assert.deepEqual(
    paineisDoBioma('crystal').map((painel) => painel.imagem),
    ['minerador_melancolico', 'minerador_exausto', 'minerador_surpreso', 'minerador_assustado']
  );
});

test('o texto da Câmara de Cristal está intacto, palavra por palavra', () => {
  // Dois acertos em relação ao material de origem, e dois só: `candado`, que
  // devia ser `cansado`, e `sáida`, com o acento no A em vez do I.
  //
  // A falta de ponto final nas duas primeiras falas fica como veio. O roteiro
  // do mineiro é telegráfico — "Acredito que a saída esteja próxima" sem ponto
  // é alguém falando de cansaço, e acrescentar pontuação seria trocar o tom.
  const falas = {};

  for (const painel of paineisDoBioma('crystal')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'lore.crystal.p1.a': 'Estou cansado chefe!',
    'lore.crystal.p2.a': 'Acredito que a saída esteja próxima',
    'lore.crystal.p3.a': 'Que lugar Sinistro!!!',
    'lore.crystal.p4.a': 'Esses cristais parecem afiados...é melhor ir com calma....'
  });
});

test('a fala cabe na tarja: nenhuma é longa demais para a parte amarela', () => {
  // A parte amarela da arte vai de 40,5% a 83% da largura da imagem, com a altura
  // útil de 48% a 73%. Traduzir para alemão e polonês estica a frase, e o texto
  // que transborda sai por cima da moldura — que parece defeito, não texto
  // comprido. O limite é generoso de propósito: 74 caracteres cabem em duas
  // linhas com folga, e nenhuma das falas atuais passa de 52.
  // ## Por que 92 e não 74
  //
  // 74 foi calibrado na Mina Solar, e era o número errado mesmo: ele media
  // caracteres, e o que a tarja tem é **linhas**. A caixa tem 42,5% da arte de
  // largura — 489px com a arte no tamanho máximo — e a fonte condensada cabe
  // uns 44 caracteres por linha. Duas linhas, que é o que a caixa aguenta
  // junto com o nome do falante, dão folga até por volta de 92.
  //
  // O número não é medido no olho. Uma fala que passasse de duas linhas
  // empurraria o conteúdo para fora da faixa creme: o navegador é quem confirma,
  // e foi ele que mostrou o `MINERADOR` atrás da borda na primeira versão.
  const LIMITE = 92;

  for (const { bioma, painel, indice } of todosOsPaineis) {
    for (const chave of painel.falas) {
      for (const { id } of LOCALES) {
        const texto = getDictionary(id)[chave];

        assert.ok(
          texto.length <= LIMITE,
          `${id} · ${chave} tem ${texto.length} caracteres e o limite é ${LIMITE}. `
            + `${bioma} painel ${indice + 1}. A tarja não vai segurar em duas linhas.`
        );
      }
    }
  }
});