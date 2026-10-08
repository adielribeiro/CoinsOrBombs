import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Caça lixo de alfabeto nos arquivos do projeto.
 *
 * ## O bug que este teste impede
 *
 * Eu digitei caractere CJK e cirilico por engano muitas vezes em comentários
 * durante este trabalho. Já apareceram "生命", "声明", "囚", "本", "辨认" e um
 * "地板" no meio de uma frase em português no `CaveScene.js`.
 *
 * Nenhum deles quebrou o build. Um comentário com ideograma é um comentário
 * perfeito para o compilador, e o único sintoma é alguém lendo e achando estranho
 * — que é o pior tipo de bug, porque não avisa ninguém e não some sozinho.
 *
 * ## Por que a varredura é de arquivo e não de `git diff`
 *
 * O `地板` estava commitado havia semanas quando este teste foi escrito. Um teste
 * que só olha o que mudou passa por cima do que já está lá, e o que já está lá é
 * justamente o que ninguém vai revisitar.
 *
 * ## As faixas, e onde elas são permitidas
 *
 * Kana, han e hangul são sempre erro no código: o projeto não tem japonês, chinês
 * nem coreano fora das traduções. O cirílico também não aparece em lugar nenhum.
 *
 * A exceção é o diretório `src/i18n/` — os dicionários e o índice que guarda o
 * nome nativo de cada idioma, como `简体中文` e `日本語` — mais o teste que afirma
 * as traduções. Ali, han e kana são o conteúdo, e o que continua sendo erro é o
 * cirílico.
 */

const raiz = fileURLToPath(new URL('../', import.meta.url));

const IGNORAR = new Set(['node_modules', 'dist', '.git']);

const EXTENSOES = ['.js', '.jsx', '.mjs', '.css', '.md', '.html'];

const FAIXAS = [
  { nome: 'kana', de: 0x3040, ate: 0x30ff },
  { nome: 'han', de: 0x4e00, ate: 0x9fff },
  { nome: 'cirilico', de: 0x0400, ate: 0x04ff },
  { nome: 'hangul', de: 0xac00, ate: 0xd7af }
];

/**
 * Onde han, kana e hangul são conteúdo e não erro.
 *
 * Não é "tudo dentro de `src/i18n`": é o i18n **e** o teste que afirma as
 * traduções. `test/i18n.test.mjs` precisa conter `次の Cave` e `简体中文` para
 * poder provar que o tradutor devolve a coisa certa, e um teste que proíbe a
 * própria prova é um teste que obriga a apagar a prova.
 *
 * Explicitado por caminho em vez de por pasta porque a pasta `test/` tem outros
 * arquivos que são código, e a regra "teste é exceção" desligaria a verificação
 * justo onde ela importa.
 */
const COM_CONTEUDO = /^(src[\\/]i18n[\\/]|test[\\/]i18n\.test\.mjs$)/;

function traduzido(caminhoRelativo) {
  return COM_CONTEUDO.test(caminhoRelativo.replace(/\\/g, '/'));
}

/** Os caracteres proibidos numa linha, com a faixa de cada um. */
function intrusos(linha, permiteConteudo) {
  const achados = [];

  for (const caractere of linha) {
    const p = caractere.codePointAt(0);
    const faixa = FAIXAS.find((f) => p >= f.de && p <= f.ate);
    if (!faixa) continue;

    if (permiteConteudo && faixa.nome !== 'cirilico') continue;

    achados.push(`U+${p.toString(16).toUpperCase().padStart(4, '0')} (${faixa.nome})`);
  }

  return achados;
}

const arquivos = [];

async function varre(diretorio) {
  for (const entrada of await readdir(diretorio)) {
    if (IGNORAR.has(entrada)) continue;

    const caminho = join(diretorio, entrada);
    // Bundle gerado contém os dicionários traduzidos, não código-fonte autoral.
    if (relative(raiz, caminho).replace(/\\/g, "/") === "docs/game") continue;
    const info = await stat(caminho);

    if (info.isDirectory()) {
      await varre(caminho);
      continue;
    }

    if (EXTENSOES.includes(extname(entrada))) arquivos.push(caminho);
  }
}

await varre(raiz);

test('nenhum arquivo tem caractere de alfabeto estranho', async () => {
  assert.ok(arquivos.length > 20, `a varredura achou só ${arquivos.length} arquivo(s). O caminho mudou?`);

  const problemas = [];

  for (const caminho of arquivos) {
    // O próprio teste cita os caracteres que ele caça, então ele não pode se
    // reprovar por isso.
    if (caminho.endsWith('alfabetos.test.mjs')) continue;

    const relativo = relative(raiz, caminho);
    const permite = traduzido(relativo);
    const texto = await readFile(caminho, 'utf8');

    texto.split(/\r?\n/).forEach((linha, i) => {
      const achados = intrusos(linha, permite);
      if (!achados.length) return;

      problemas.push(`${relativo} L${i + 1}: ${achados.join(' ')}\n        ${linha.trim().slice(0, 100)}`);
    });
  }

  assert.deepEqual(
    problemas,
    [],
    `alfabeto errado em ${problemas.length} linha(s). Um comentário com ideograma é um `
      + 'comentário perfeito para o build, então nada mais vai avisar:\n      ' + problemas.join('\n      ')
  );
});

test('o teste não pode falhar por causa dos próprios exemplos', () => {
  // O arquivo cita "生命" e companhia na documentação. Se o teste varresse a si
  // mesmo, ele reprovaria por causa da própria lista do que caçar, e a correção
  // seria apagar a documentação — que é a única coisa que diz por que o teste
  // existe.
  const linha = 'Já apareceram "生命", "声明", "囚", "本", "辨认" e um "地板".';

  assert.ok(intrusos(linha, false).length >= 5, 'a detecção parou de funcionar');
  assert.deepEqual(
    intrusos(linha, true),
    intrusos(linha, true).filter((a) => a.includes('cirilico')),
    'dentro do i18n, kana/han/hangul têm de passar e o cirílico não'
  );
});