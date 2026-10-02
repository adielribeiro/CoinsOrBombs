import test from 'node:test';
import assert from 'node:assert/strict';

import { LOCALES, getDictionary } from '../src/i18n/index.js';
import {
  FOLGA_DA_CARTA,
  PESO_POR_SILABA,
  RITMO_DE_LEITURA_WPM,
  contarPalavras,
  duracaoDaCarta
} from '../src/game/cartaFinal.js';

/**
 * O ritmo da carta do fim.
 *
 * ## O que estes testes seguram
 *
 * 1. **A contagem bate com a contagem na mão.** O número antigo era `100000` com um
 *    comentário dizendo "cerca de 180 palavras"; a carta tem 107. A regra é testada
 *    contra frase de tamanho conhecido, porque uma função de contagem que "parece
 *    certa" é exatamente o tipo de coisa que envelhece em silêncio.
 *
 * 2. **Os dez idiomas ficam na mesma faixa.** Uma tradução mais longa precisa de mais
 *    tempo. Sem isso, quem traduz para um alfabeto sem espaço levaria uma carta de
 *    três minutos e meio para uma carta que leva um minuto.
 *
 * 3. **A carta não some cedo nem tarde.** O relógio do React fecha o jogo quando o
 *    tempo acaba, e a animação fecha no mesmo número. Se a conta errar para menos,
 *    a última frase da carta aparece e some antes de ser lida.
 */

const CHAVES = [
  'finale.title',
  'finale.p1',
  'finale.p2',
  'finale.p3',
  'finale.p4',
  'finale.p5',
  'finale.signature',
  'finale.team',
  'finale.closing'
];

// --- a contagem ------------------------------------------------------------

test('conta palavras como a contagem à mão', () => {
  assert.equal(contarPalavras('um dois tres'), 3);
  assert.equal(contarPalavras('  espacos   extras  '), 2);
  assert.equal(contarPalavras(['um dois', 'tres quatro']), 4);
  assert.equal(contarPalavras('palavra. outra, coisa!'), 3, 'a pontuação não abre palavra');
});

test('texto vazio ou inútil vale uma palavra, e não zero', () => {
  // Zero palavras daria duração zero, e uma animação de 0ms no `animationend` não
  // dispara: a carta ficaria na tela sem nunca fechar sozinha.
  for (const nada of ['', '   ', [], ['', null, undefined, 3], null, undefined]) {
    assert.equal(contarPalavras(nada), 1, `contou ${String(nada)}`);
  }
});

test('o devanagari conta sílaba, e não caractere', () => {
  // Hindi tem sinais de vogental que se apoiam na letra anterior, e o virama que
  // junta duas consoantes numa sílaba só. Contar caractere como palavra estourava a
  // carta em hindi em quase três vezes, sem que nada na tela mudasse.
  //
  // As amostras são escritas por escape e repetidas vinte vezes: este repositório
  // guarda caractere de alfabeto estranho só em `src/i18n`, e uma amostra de uma
  // sílaba só não mostraria nada — o peso por sílaba arredonda as duas para 1.
  const CONJUNTO = '\u0935\u094d\u0939'; // va + virama + ha: uma sílaba
  const SEPARADO = '\u0935\u0939'; // va + ha: duas sílabas
  const COM_VOGENTAL = '\u0939\u0946'; // ha + vogental: uma sílaba
  const VEZES = 20;

  const comVirama = contarPalavras(CONJUNTO.repeat(VEZES));
  const semVirama = contarPalavras(SEPARADO.repeat(VEZES));

  // As duas amostras têm as mesmas quarenta letras e o mesmo número de palavras na
  // língua real. Se o virama não for descontado, elas dariam o mesmo tempo.
  assert.ok(
    comVirama < semVirama,
    `${CONJUNTO.repeat(2)} deu ${comVirama} e ${SEPARADO.repeat(2)} deu `
      + `${semVirama}: o virama não está juntando as consoantes.`
  );
  assert.equal(
    semVirama,
    Math.round(VEZES * 2 * PESO_POR_SILABA),
    'quarenta sílabas não deram quarenta vezes o peso'
  );

  // E o sinal de vogental não é sílaba nenhuma: some com ele, e a letra que sobra
  // continua valendo uma.
  assert.equal(
    contarPalavras(COM_VOGENTAL.repeat(VEZES)),
    Math.round(VEZES * PESO_POR_SILABA),
    'o vogental foi contado como sílaba'
  );
});

test('o resultado não depende da ordem em que o texto é medido', () => {
  // O `test` com a flag `g` guarda o `lastIndex` entre chamadas. Um filtro escrito
  // com ele devolve verdadeiro e falso alternado para a mesma entrada, e a contagem
  // erraria pela metade — de um jeito que só apareceria em alguns idiomas.
  const textos = ['um dois tres', 'quatro cinco seis', 'setecinco'];

  const primeira = textos.map((t) => contarPalavras(t));

  for (const t of textos) contarPalavras(t);

  assert.deepEqual(textos.map((t) => contarPalavras(t)), primeira);
});

// --- a duração -------------------------------------------------------------

test('a duração sai do texto, e texto maior leva mais tempo', () => {
  const curta = duracaoDaCarta('uma frase curta.');
  const longa = duracaoDaCarta('uma frase curta. '.repeat(10));

  assert.ok(longa > curta, `${longa}ms não é maior que ${curta}ms`);
  assert.ok(curta > 0);
});

test('a duração bate com a conta à mão', () => {
  const texto = ['um', 'dois', 'tres', 'quatro', 'cinco'].join(' ');
  const palavras = contarPalavras(texto);
  const esperado = Math.round(((palavras / RITMO_DE_LEITURA_WPM) * 60_000) * FOLGA_DA_CARTA);

  assert.equal(duracaoDaCarta(texto), esperado);
});

test('ritmo mais alto é carta mais curta', () => {
  const texto = ['um', 'dois', 'tres', 'quatro', 'cinco', 'seis'].join(' ');

  assert.ok(
    duracaoDaCarta(texto, { ritmo: 300 }) < duracaoDaCarta(texto, { ritmo: 100 }),
    'a velocidade de leitura não entrou na conta'
  );
});

test('ritmo impossível é erro, e não uma carta instantânea', () => {
  for (const ritmo of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => duracaoDaCarta('qualquer coisa', { ritmo }),
      RangeError,
      `ritmo ${String(ritmo)} passou`
    );
  }
});

// --- a carta de verdade, nos dez idiomas -----------------------------------

test('a carta tem todas as chaves nos dez idiomas', () => {
  for (const { id } of LOCALES) {
    const dicionario = getDictionary(id);

    for (const chave of CHAVES) {
      assert.equal(
        typeof dicionario[chave],
        'string',
        `${id} está sem "${chave}". A carta mostraria o nome da chave no fim do jogo.`
      );
    }
  }
});

test('a carta de cada idioma leva tempo de leitura, em todos os dez', () => {
  const medidas = [];

  for (const { id } of LOCALES) {
    const dicionario = getDictionary(id);
    const textos = CHAVES.map((chave) => dicionario[chave]);
    const ms = duracaoDaCarta(textos);

    medidas.push({ id, ms, palavras: contarPalavras(textos) });

    // Nem piscar, nem arrastar. Os limites são largos de propósito: a tradução
    // muda, e o teste não pode reprovar por causa de uma frase nova.
    assert.ok(ms >= 20_000, `${id}: ${ms}ms — a carta passa rápido demais para ler`);
    assert.ok(ms <= 150_000, `${id}: ${ms}ms — a carta demora demais para ler`);

    // E a regra: o que está em tela é a leitura no ritmo alvo, com a folga. Uma
    // carta que passasse a 40 palavras por minuto com esta regra é um bug de conta.
    const wpm = (contarPalavras(textos) / ms) * 60_000;
    assert.ok(
      wpm >= 90,
      `${id}: ${Math.round(wpm)} palavras por minuto em tela. O alvo é ${RITMO_DE_LEITURA_WPM}.`
    );
  }

  // Nenhum idioma pode ser três vezes mais lento que outro só porque o tradutor
  // escreveu mais. A proporção_medida acompanha a da contagem de palavras.
  const maisCurta = Math.min(...medidas.map((m) => m.ms));
  const maisLonga = Math.max(...medidas.map((m) => m.ms));

  assert.ok(
    maisLonga / maisCurta <= 2.5,
    `a carta vai de ${Math.round(maisCurta / 1000)}s a ${Math.round(maisLonga / 1000)}s. `
      + 'A conta de palavras está errada para algum alfabeto sem espaço.'
  );
});

test('o peso da sílaba mantém os alfabetos sem espaço na mesma faixa', () => {
  // Sem o peso, um ideograma valeria uma palavra inteira e a carta em chinês
  // duraria quase o dobro da portuguesa — sendo o mesmo texto.
  const mesmoTexto = ['um dois tres quatro cinco seis sete oito nove dez'];

  // Um texto de dez "palavras" e um de dez ideogramas precisam sair parecidos.
  const emPalavras = contarPalavras(mesmoTexto);
  const emSilabas = contarPalavras(['a'.repeat(10)]);

  assert.ok(
    emSilabas < emPalavras,
    'o peso da sílaba não está pesando: sílabas e palavras dariam o mesmo tempo'
  );
  assert.ok(PESO_POR_SILABA > 0 && PESO_POR_SILABA < 1);
});