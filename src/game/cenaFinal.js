/**
 * A cena final: os quatro painéis que o mineiro fala ao sair da cave 60.
 *
 * ## Não é uma lore de bioma
 *
 * Ela sai da última caverna e leva para o fim do jogo, e não para outra caverna.
 * O gatilho é o botão de saída da cave 60, e não `isBiomeStartCave`: uma cena de
 * bioma abre ao **entrar** numa caverna, e esta abre ao **sair** da última. São
 * dois momentos diferentes do jogo, e o `lore.js` é sobre o primeiro.
 *
 * ## Os quatro painéis
 *
 * `minerador_feliz` abre e fecha o roteiro, e `sorridente` fecha o par do meio.
 * Nenhuma expressão é nova em relação aos outros biomas — `sorridente` já vem das
 * Ruínas Abissais. `minerador_feliz` entrou com este roteiro.
 *
 * ## A tarja vem da própria arte
 *
 * Diferente das lores de bioma, aqui a imagem é a faixa 3:1 **com a tarja**, e o
 * texto cai em cima da parte creme — a mesma caixa de `.lore-texto`, medida na
 * mesma imagem. Não há faixa separada nem fundo novo: a tela é a arte.
 *
 * A vista da boca da caverna (`saida_cave.png`) fica **depois** dos painéis, na
 * cena muda que antecede a carta do fim. É a última coisa que o jogador vê do
 * mundo, e ela é muda de propósito.
 */

import { ehCaveFinal } from './progression.js';

/** A vista da boca da caverna, depois dos painéis. */
export const CENA_FINAL_ARTE = 'saida_cave.png';

/**
 * O mineiro sozinho, para a vista da boca da caverna.
 *
 * Não é a expressão do painel: é a mesma faixa 3:1 com a tarja e o pergaminho
 * removidos, e só o quadro dourado do personagem fica. A tarja é o que denunciaria
 * a figura colada numa paisagem — o contorno dourado dela viria junto.
 *
 * O recorte foi feito no arquivo porque a coluna onde a tarja começa **varia entre
 * as expressões** (550px na `feliz`, 583px na `sorridente`), e um `clip-path` com
 * porcentagem fixa acerta uma e erra a outra. O arquivo é único para a cena, e o
 * valor é a menor coluna medida — porque perder um fio de pergaminho é melhor que
 * perder a moldura do personagem.
 */
export const CENA_FINAL_MINEIRO = 'solo-mineiro.png';

export const CENA_FINAL_POR_BIOMA = {
  crystal: [
    { imagem: 'minerador_feliz', falas: ['cenaFinal.p1.a'] },
    { imagem: 'minerador_feliz', falas: ['cenaFinal.p2.a'] },
    { imagem: 'minerador_sorridente', falas: ['cenaFinal.p3.a'] },
    { imagem: 'minerador_sorridente', falas: ['cenaFinal.p4.a'] }
  ]
};

/** Chave da pessoa que fala. Uma só: é o mineiro em todo roteiro. */
export const CHAVE_FALANTE_FINAL = 'cenaFinal.falante';

/**
 * Esta caverna tem cena final na saída?
 *
 * É a cave 60, e só ela. `ehCaveFinal` é a mesma função que o botão de saída já
 * usa para trocar "próxima cave" por "fim" — os dois caminhos não podem
 * discordar sobre qual é a última caverna, e não podem porque leem a mesma.
 */
export function temCenaFinal(cave) {
  return Boolean(ehCaveFinal(cave));
}

/** Os painéis do bioma, na ordem do roteiro. Lista vazia para quem não tem. */
export function paineisDaCenaFinal(biomeId) {
  return CENA_FINAL_POR_BIOMA[biomeId] ?? [];
}

/**
 * O índice do painel seguinte, ou `-1` quando acabou.
 *
 * Mesma regra de `lore.js`, e pelo mesmo motivo: reescrever a conta na tela
 * reintroduz o painel `undefined` do último índice.
 */
export function proximoIndiceFinal(paineis, indice) {
  const proximo = (indice ?? -1) + 1;

  return proximo >= (paineis?.length ?? 0) ? -1 : proximo;
}

/** O caminho do arquivo de um painel, do jeito que a tela e o teste esperam. */
export function caminhoDaArteFinal() {
  return `assets/${CENA_FINAL_ARTE}`;
}

/** O caminho do mineiro, sem a tarja. */
export function caminhoDoMineiroFinal() {
  return `assets/${CENA_FINAL_MINEIRO}`;
}

/** Todas as imagens que a cena final usa, sem extensão e sem repetir. */
export function imagensDaCenaFinal(biomeId) {
  const nomes = new Set();

  for (const painel of paineisDaCenaFinal(biomeId)) nomes.add(painel.imagem);

  return [...nomes].sort();
}