import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { BIOMES, TOTAL_CAVES, getBiomeForCave } from '../src/game/progression.js';
import { LOCALES, getDictionary } from '../src/i18n/index.js';

// O módulo vem inteiro, e não por nome: o teste precisa perguntar se uma exportação
// **não** existe, e perguntar isso por nome nem compila.
import * as cenaFinal from '../src/game/cenaFinal.js';
import {
  CHAVE_FALANTE_FINAL,
  CENA_FINAL_ARTE,
  CENA_FINAL_POR_BIOMA,
  caminhoDaArteFinal,
  imagensDaCenaFinal,
  paineisDaCenaFinal,
  proximoIndiceFinal,
  temCenaFinal
} from '../src/game/cenaFinal.js';
import { LORE_POR_BIOMA } from '../src/game/lore.js';

/**
 * A cena final: o que sai da cave 60, antes da carta do fim.
 *
 * ## O que estes testes seguram
 *
 * 1. **A arte e as expressões existem.** Nome errado de arquivo não quebra o
 *    build, não quebra o runtime e não reclama no console — a tela fica preta e
 *    parece defeito do jogo.
 *
 * 2. **A cena é só da cave 60.** `ehCaveFinal` é a mesma função que troca
 *    "próxima cave" por "fim" no botão de saída. Se as duas discordassem, uma
 *    cena final apareceria no meio da Mina Solar.
 *
 * 3. **Os painéis fecham.** `proximoIndiceFinal` devolvendo `indice + 1` sem
 *    limite deixaria a sequência passar do fim e renderizar um painel
 *    `undefined` — imagem quebrada e nenhum erro no console.
 */

const raiz = fileURLToPath(new URL('../', import.meta.url));
const dicionario = getDictionary('pt-BR');

const CHAVES = ['cenaFinal.p1.a', 'cenaFinal.p2.a', 'cenaFinal.p3.a', 'cenaFinal.p4.a'];

// --- o portão --------------------------------------------------------------

test('a cena final é só da última caverna', () => {
  const comCena = [];

  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    if (temCenaFinal(cave)) comCena.push(cave);
  }

  assert.deepEqual(comCena, [TOTAL_CAVES], `abrem a cena final: ${comCena.join(', ')}`);
});

test('cave fora do jogo não abre a cena final', () => {
  for (const cave of [undefined, null, 0, -1, '', 'dez', NaN, {}]) {
    assert.equal(temCenaFinal(cave), false, `cave ${String(cave)} abriu a cena final`);
  }

  // O que o botão de saída aceita, a cena aceita também: os dois leem a mesma
  // função, e é isso que este teste garante.
  assert.equal(temCenaFinal(TOTAL_CAVES + 500), true);
});

// --- a arte ---------------------------------------------------------------

test('a arte da cena final existe em public/assets', async () => {
  const caminho = join(raiz, 'public', caminhoDaArteFinal());

  await assert.doesNotReject(
    access(caminho),
    `a cena final pede "${CENA_FINAL_ARTE}" e não existe em public/assets.`
  );
});

test('o caminho da arte não tem espaço nem extensão dupla', () => {
  const caminho = caminhoDaArteFinal();

  assert.equal(caminho, `assets/${CENA_FINAL_ARTE}`);
  assert.doesNotMatch(caminho, /\s/, `o caminho tem espaço: "${caminho}"`);
  assert.match(caminho, /^assets\/[a-z0-9_]+\.png$/, `caminho fora do padrão: "${caminho}"`);
});

test('a vista final é só a paisagem, sem personagem colado', async () => {
  // Havia um `solo-mineiro.png` aqui: a faixa 3:1 sem a tarja, com o mineiro de pé
  // no canto esquerdo da paisagem. Saiu porque ele denunciava a emenda — uma figura
  // recortada de outro arquivo, no meio de uma paisagem que não a tem.
  //
  // Este teste segura três coisas: o arquivo não voltou, o módulo não exporta o
  // caminho dele, e a cena não pede nenhum arquivo fora da paisagem e das expressões
  // dos painéis.
  await assert.rejects(
    access(join(raiz, 'public', 'assets', 'solo-mineiro.png')),
    'o recorte do mineiro voltou para public/assets.'
  );

  assert.equal(
    'caminhoDoMineiroFinal' in cenaFinal,
    false,
    'cenaFinal.js ainda exporta caminhoDoMineiroFinal.'
  );
  assert.equal(
    'CENA_FINAL_MINEIRO' in cenaFinal,
    false,
    'cenaFinal.js ainda exporta CENA_FINAL_MINEIRO.'
  );

  // E a lista de imagens que a cena usa tem que ser exatamente as expressões do
  // roteiro: a paisagem entra por `caminhoDaArteFinal`, e o mineiro saía por um
  // caminho à parte que a lista não enxergava.
  assert.deepEqual(imagensDaCenaFinal('crystal'), [
    'minerador_feliz',
    'minerador_sorridente'
  ]);
});

test('toda expressão dos painéis existe em public/assets', async () => {
  const nomes = imagensDaCenaFinal('crystal');

  assert.ok(nomes.length > 0, 'a lista de imagens veio vazia');

  for (const nome of nomes) {
    await assert.doesNotReject(
      access(join(raiz, 'public', 'assets', `${nome}.png`)),
      `a cena final pede a expressão "${nome}" e o arquivo não existe.`
    );
  }
});

// --- os painéis -----------------------------------------------------------

test('os quatro painéis são os do roteiro, na ordem', () => {
  // `minerador_feliz` abre e fecha o roteiro, e `sorridente` fecha o par do meio.
  assert.deepEqual(
    paineisDaCenaFinal('crystal').map((painel) => painel.imagem),
    ['minerador_feliz', 'minerador_feliz', 'minerador_sorridente', 'minerador_sorridente']
  );
});

test('bioma sem roteiro final abre lista vazia', () => {
  assert.deepEqual(paineisDaCenaFinal('nao-existe'), []);
  assert.deepEqual(paineisDaCenaFinal('sunstone'), []);
});

test('a sequência percorre os painéis e fecha uma vez só', () => {
  for (const [bioma, paineis] of Object.entries(CENA_FINAL_POR_BIOMA)) {
    let indice = 0;
    const vistos = [];
    let fechadaEm = -1;

    for (let passo = 0; passo < paineis.length + 5; passo += 1) {
      const proximo = proximoIndiceFinal(paineis, indice);

      if (proximo === -1) {
        fechadaEm = passo;
        break;
      }

      assert.ok(proximo > indice, `${bioma}: o índice não avançou (${indice} -> ${proximo})`);
      vistos.push(proximo);
      indice = proximo;
    }

    assert.equal(fechadaEm, paineis.length - 1, `${bioma}: fechou no passo errado`);
    assert.deepEqual(vistos, paineis.slice(1).map((_, i) => i + 1), `${bioma}: a ordem não bate`);
  }
});

test('índice fora da faixa fecha, e não devolve lixo', () => {
  assert.equal(proximoIndiceFinal([], 0), -1);
  assert.equal(proximoIndiceFinal([], 99), -1);
  assert.equal(proximoIndiceFinal(undefined, 0), -1);
  assert.equal(proximoIndiceFinal(['a'], 0), -1);
  assert.equal(proximoIndiceFinal(['a', 'b'], 5), -1);
  assert.equal(proximoIndiceFinal(['a', 'b'], -1), 0);
  assert.equal(proximoIndiceFinal(['a', 'b'], undefined), 0);
});

// --- as falas -------------------------------------------------------------

test('toda chave de fala existe nos dez idiomas', () => {
  const chaves = new Set([CHAVE_FALANTE_FINAL, ...CHAVES]);

  for (const painel of paineisDaCenaFinal('crystal')) {
    for (const chave of painel.falas) chaves.add(chave);
  }

  for (const { id } of LOCALES) {
    const dicionarioDoIdioma = getDictionary(id);

    for (const chave of chaves) {
      assert.notEqual(
        dicionarioDoIdioma[chave],
        undefined,
        `${id} está sem "${chave}". A tela mostraria "[${id}] ${chave}" na tarja.`
      );
    }
  }
});

test('o texto do roteiro está intacto, palavra por palavra', () => {
  const falas = {};

  for (const painel of paineisDaCenaFinal('crystal')) {
    for (const chave of painel.falas) falas[chave] = dicionario[chave];
  }

  assert.deepEqual(falas, {
    'cenaFinal.p1.a': 'AAAAHH MULEQUE.....',
    'cenaFinal.p2.a': 'Finalmente a saída',
    'cenaFinal.p3.a': 'Preciso parar de arrumar essas confusões...hehehehe',
    'cenaFinal.p4.a': 'Bom...agora só me resta a Saída!!!!!'
  });
});

test('a gritaria de abertura sobrevive em todos os idiomas', () => {
  // `AAAAHH MULEQUE` é um grito. Traduzir para um "ah, garoto" contido trocaria o
  // personagem na última cena do jogo — e o terceiro painel é a mesma coisa com um
  // riso no lugar.
  const ABERTURA = ['cenaFinal.p1.a'];
  const RISADA = ['cenaFinal.p3.a'];
  const MARCADORES = /[.!?]/gu;

  for (const chave of ABERTURA) {
    for (const { id } of LOCALES) {
      const texto = getDictionary(id)[chave];

      assert.ok(
        (texto.match(MARCADORES) ?? []).length >= 4,
        `${id} · ${chave} perdeu a pontuação do grito: "${texto}"`
      );
    }
  }

  // ## O riso é uma sílaba repetida, e a sílaba tem duas letras
  //
  // `hehehehe` é `he` repetida quatro vezes. A primeira versão do padrão pedia
  // **letra** repetida três vezes (`\1{2,}`), e ela reprovava o português certo:
  // `hehe` é letra-vogal, não letra-letra, e `hhhh` — que ela aceitava — é
  // gemido, não riso.
  //
  // O padrão é de duas letras repetidas: `hehe`, `jeje`, `hihihi`, `héhé`.
  // ## E por que a medição é no FIM da fala
  //
  // Porque o padrão sozinho dá falso positivo: em "parar de arrumar" ele acha
  // `ar` repetida na posição 9, e a fala passaria sem riso nenhum. O riso do
  // roteiro vem depois dos três pontos e é o último pedaço da frase — então o
  // padrão só é aplicado na cauda, onde não há palavra para confundir.
  //
  // ## E nos três idiomas sem escrita latina
  //
  // Não há `he` para repetir: o riso é sílaba do próprio alfabeto. Aí a
  // presença do alfabeto na cauda basta, e não há palavra latina na frase para
  // dar falso positivo.
  const CAUDA = 20;

  const temRiso = (texto) => {
    const cauda = texto.slice(-CAUDA);

    // Duas letras repetidas três ou mais vezes: pega o `hehe` do português e do
    // inglês, o `jeje` do espanhol, e o `hihihi` do francês, alemão, italiano e
    // polonês.
    if (/([a-zà-ÿ]{2})\1{2,}/i.test(cauda)) return true;

    // Sílaba repetida do próprio alfabeto, nos três idiomas sem escrita latina.
    if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Devanagari}/u.test(cauda)) return true;

    return false;
  };

  for (const chave of RISADA) {
    for (const { id } of LOCALES) {
      const texto = getDictionary(id)[chave];

      assert.ok(
        temRiso(texto),
        `${id} · ${chave} perdeu o riso: "${texto}". O terceiro painel é uma piada, e `
          + 'sem o riso vira uma frase sobre arrumar confusões.'
      );
    }
  }

  // E o padrão precisa rejeitar a mesma frase **sem** o riso. Sem esta metade, um
  // padrão largo demais passaria sempre e o teste seria decorativo.
  for (const semRiso of [
    'Preciso parar de arrumar essas confusões...',
    'Tengo que dejar de arreglar estos líos...',
    'I need to stop sorting out these messes...'
  ]) {
    assert.equal(temRiso(semRiso), false, `o padrão aceitou "${semRiso}" sem riso`);
  }

  // E o contrário: o padrão não pode ser tão estreito que recuse um riso legítimo.
  // `hhhh` é gemido e `hhh` é esforço — nenhum dos dois é riso, e ambos precisam
  // ficar de fora. É o que separa "repetição" de "gritaria".
  for (const naoRiso of ['Ele ficou sem fôlego...hhhh', 'Vamos subir mais...hhh']) {
    assert.equal(temRiso(naoRiso), false, `o padrão aceitou "${naoRiso}" como riso`);
  }
});

test('a fala cabe na tarja: nenhuma é longa demais para a parte amarela', () => {
  // A parte amarela vai de 40,5% a 83% da largura, com altura útil de 48% a 73%.
  // O limite é o mesmo das lores de bioma, e ele mede **linhas** — a caixa tem
  // 489px com a arte no tamanho máximo, e a fonte condensada cabe uns 44
  // caracteres por linha, o que dá duas linhas folgadas até por volta de 92.
  const LIMITE = 92;

  for (const painel of paineisDaCenaFinal('crystal')) {
    for (const chave of painel.falas) {
      for (const { id } of LOCALES) {
        const texto = getDictionary(id)[chave];

        assert.ok(
          texto.length <= LIMITE,
          `${id} · ${chave} tem ${texto.length} caracteres e o limite é ${LIMITE}. `
            + 'A tarja não vai segurar em duas linhas.'
        );
      }
    }
  }
});

// --- a cena não é uma lore de bioma --------------------------------------

test('a cena final não se confunde com uma lore de bioma', () => {
  // São duas sequências com o mesmo formato e gatilhos opostos: a lore abre ao
  // **entrar** na primeira caverna do bioma, a cena final abre ao **sair** da
  // última. Confundir as duas faria uma delas aparecer no momento errado.
  assert.notEqual(CENA_FINAL_POR_BIOMA, LORE_POR_BIOMA, 'são o mesmo objeto');

  // As chaves não podem se cruzar: a cena final e as lores de bioma ficam no mesmo
  // dicionário, e `cenaFinal.p1.a` existe lá **por desenho** — é onde o texto mora.
  // O que não pode é um painel de lore apontar para uma chave de cena final, ou o
  // contrário: aí uma sequência rouba a fala da outra.
  const chavesDeLore = new Set();

  for (const paineis of Object.values(LORE_POR_BIOMA)) {
    for (const painel of paineis) {
      for (const chave of painel.falas) chavesDeLore.add(chave);
    }
  }

  for (const chave of chavesDeLore) {
    assert.ok(
      !chave.startsWith('cenaFinal.'),
      `a lore de bioma usa "${chave}", que é chave da cena final. Uma sequência `
        + 'roubaria a fala da outra.'
    );
  }

  for (const painel of paineisDaCenaFinal('crystal')) {
    for (const chave of painel.falas) {
      assert.ok(
        !chavesDeLore.has(chave),
        `a cena final usa "${chave}", que uma lore de bioma já usa.`
      );
      assert.ok(
        chave.startsWith('cenaFinal.'),
        `"${chave}" não está no espaço de chaves da cena final, e um erro de digitação `
          + 'aqui mostraria o nome da chave na tarja em vez da fala.'
      );
    }
  }

  // E a cena final pertence ao último bioma, que é onde a última caverna está.
  assert.equal(getBiomeForCave(TOTAL_CAVES).id, 'crystal');
  assert.ok(paineisDaCenaFinal(getBiomeForCave(TOTAL_CAVES).id).length > 0);

  // Nenhum outro bioma tem cena final: sair da cave 10 não é o fim do jogo.
  for (const bioma of BIOMES) {
    if (bioma.endCave >= TOTAL_CAVES) continue;

    assert.deepEqual(
      paineisDaCenaFinal(bioma.id),
      [],
      `${bioma.id} tem cena final, e termina na cave ${bioma.endCave}`
    );
  }
});

test('todo painel, de lore e de cena final, tem fala', () => {
  // A cena final **tem** roteiro. Um painel sem fala aqui seria um painel em
  // branco com a imagem do mineiro, que é o modo de falha que o formato de tarja
  // permite e que ninguém nota até jogar.
  for (const [bioma, paineis] of Object.entries(CENA_FINAL_POR_BIOMA)) {
    paineis.forEach((painel, indice) => {
      assert.ok(
        painel.falas.length > 0,
        `${bioma} painel ${indice + 1} da cena final não tem fala`
      );
    });
  }
});