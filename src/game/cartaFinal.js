/**
 * O ritmo da carta do fim: quanto tempo ela leva para subir.
 *
 * ## Por que isto mora aqui, e não no CSS
 *
 * A duração alimenta duas coisas que precisam concordar no mesmo número: a
 * animação CSS (`--finale-duracao`) e o relógio do React que devolve a pessoa ao
 * menu quando a carta acaba. Duas constantes separadas divergem, e o fim volta ao
 * menu antes ou depois de a carta terminar — que é pior do que qualquer um dos dois
 * erros, porque parece defeito.
 *
 * ## Por que ela é calculada, e não fixa
 *
 * O valor anterior era `100000`, com um comentário dizendo "cerca de 180
 * palavras". Medido na página, a carta em português tem **107** palavras e 653
 * caracteres. O número estava quase no dobro do que a carta tem, e ninguém conferiu
 * — que é o que acontece com constante solta: ela envelhece em silêncio quando o
 * texto muda.
 *
 * Calculando a partir do texto, trocar uma frase na carta acerta a duração sem
 * ninguém lembrar de mexer num número. E como a carta é traduzida, a conta é feita
 * com o **texto do idioma que está na tela**: uma tradução mais longa precisa de
 * mais tempo, e um número fixo obrigaria o tradutor a escrever curto para caber no
 * tempo do português.
 *
 * ## O ritmo alvo
 *
 * 150 palavras por minuto é a faixa baixa da leitura confortável. No valor antigo o
 * texto passava a 66 palavras por minuto, bem abaixo do que o olho acompanha sem
 * voltar a linha — e era esse o defeito que a carta tinha. A folga existe porque a
 * animação percorre duas vezes a altura da carta e o texto entra e sai da tela: o
 * tempo de leitura puro deixaria o começo e o fim sem tempo nenhum.
 */

/** A velocidade de leitura que a carta assume, em palavras por minuto. */
export const RITMO_DE_LEITURA_WPM = 150;

/**
 * A folga sobre o tempo de leitura.
 *
 * Não é enfeite: sem ela o texto entra em tela já em movimento, e a última linha
 * sai antes de ser lida.
 */
export const FOLGA_DA_CARTA = 1.25;

/**
 * Quantas palavras vale uma sílaba de alfabeto sem separação por espaço.
 *
 * Um ideograma não é uma palavra: em chinês uma palavra tem em média um e meio
 * ideogramas, e no japonês a kana é sílaba. Comparando os dez textos lado a lado, os
 * caracteres sem espaço precisam valer menos que a contagem crua para ficarem na
 * mesma faixa das línguas latinas — e 0,65 é o número que faz isso.
 */
export const PESO_POR_SILABA = 0.65;

/**
 * Alfabetos que não separam palavras com espaço.
 *
 * As faixas estão escapadas de propósito: escrever os caracteres literais aqui
 * reprovaria no `test/alfabetos.test.mjs`, que caça caractere de alfabeto errado em
 * todo o repositório — inclusive aqui, e inclusive em comentário.
 */
const SEM_ESPACO = /[\u0900-\u097f\u3005\u3007\u3041-\u3096\u30a1-\u30fa\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/gu;

/** O mesmo teste sem a flag `g`. */
const SEM_ESPACO_SIMPLES = new RegExp(SEM_ESPACO.source, 'u');

/**
 * Sinais combinantes: vogentais e acentos que se apoiam na letra anterior.
 *
 * São `\p{M}` e não uma lista de faixas, porque são muitos e variam por escrito.
 * Contá-los como sílaba erraria o hindi em quase três vezes: a mesma palavra pode
 * ter quatro sinais combinantes, e nenhum deles é uma sílaba.
 */
const COMBINANTE = /\p{M}/gu;

/**
 * O virama do devanagari, que junta duas consoantes numa sílaba só.
 *
 * `क्ष` são três caracteres e uma sílaba: as duas consoantes e o virama. Sem
 * descontar o virama, cada conjungado contaria duas palavras.
 */
const VIRAMA = /\u094d/gu;

/** O que separa palavras nos alfabetos com espaço. */
const COM_ESPACO = /[^\s]+/gu;

/**
 * Quantas palavras a carta tem, em palavras de língua latina.
 *
 * Aceita uma string ou uma lista de trechos: a carta é título, cinco parágrafos e
 * três linhas de assinatura, e passá-la uma vez só é menos frágil do que lembrar
 * de somar as partes.
 *
 * ## Por que os sinais combinantes são removidos com `replace`, e não com `filter`
 *
 * `String.prototype.test` com a flag `g` guarda o `lastIndex` entre chamadas e
 * devolve verdadeiro e falso alternado para a mesma entrada. `match` com `g` não
 * guarda. Por isso a contagem usa `match`, e o filtro usa a cópia sem `g`.
 *
 * @param {string|string[]} texto a carta inteira, ou os trechos dela
 * @returns {number} as palavras, nunca menos que 1
 */
export function contarPalavras(texto) {
  const partes = Array.isArray(texto) ? texto : [texto];
  const junto = partes.filter((parte) => typeof parte === 'string' && parte.length > 0).join(' ');

  if (junto.length === 0) return 1;

  // Os viramas são contados **antes** de remover os sinais combinantes, porque o
  // virama é um deles. Removendo primeiro, ele já teria sumido e a subtração daria
  // zero — que foi exatamente o que aconteceu na primeira versão: o conjungado
  // contava duas sílabas em vez de uma, e o hindi saía com o dobro do tempo.
  const viramas = (junto.match(VIRAMA) ?? []).length;
  const semMarcas = junto.replace(COMBINANTE, '');
  const silabas = Math.max(0, (semMarcas.match(SEM_ESPACO) ?? []).length - viramas);
  const tokens = semMarcas.match(COM_ESPACO) ?? [];

  // Um token que é só alfabeto sem espaço não é palavra separada: os caracteres
  // dele já foram contados acima como sílabas.
  const comEspaco = tokens.filter((token) => !SEM_ESPACO_SIMPLES.test(token)).length;

  return Math.max(1, Math.round(comEspaco + silabas * PESO_POR_SILABA));
}

/**
 * Quanto tempo a carta leva para subir, para aquele texto.
 *
 * @param {string|string[]} texto a carta no idioma em tela
 * @param {object} [opcoes]
 * @param {number} [opcoes.ritmo] palavras por minuto
 * @param {number} [opcoes.folga] multiplicador sobre o tempo de leitura
 * @returns {number} milissegundos
 * @throws {RangeError} se o ritmo não for um número positivo
 */
export function duracaoDaCarta(texto, opcoes = {}) {
  const ritmo = opcoes.ritmo ?? RITMO_DE_LEITURA_WPM;
  const folga = opcoes.folga ?? FOLGA_DA_CARTA;

  if (!Number.isFinite(ritmo) || ritmo <= 0) {
    throw new RangeError(`ritmo inválido: ${ritmo}. A carta não sobe nunca.`);
  }

  const palavras = contarPalavras(texto);
  const leituraMs = (palavras / ritmo) * 60_000;

  return Math.round(leituraMs * folga);
}