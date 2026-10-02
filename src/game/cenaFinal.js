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
 *
 * ## A vista não tem personagem
 *
 * Havia um `solo-mineiro.png` aqui: a faixa 3:1 com a tarja e o pergaminho
 * removidos, para o mineiro ficar de pé na paisagem. Saiu. O mineiro é o que o
 * jogador vê **falando**, e a vista é o que ele vê quando o mineiro já calou — a
 * paisagem sozinha é o último quadro do jogo, e um personagem recortado colado no
 * canto esquerdo só denunciava que ele foi tirado de outro arquivo. some.
 */

import { ehCaveFinal } from './progression.js';

/** A vista da boca da caverna, depois dos painéis. */
export const CENA_FINAL_ARTE = 'saida_cave.png';

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

/** Todas as imagens que a cena final usa, sem extensão e sem repetir. */
export function imagensDaCenaFinal(biomeId) {
  const nomes = new Set();

  for (const painel of paineisDaCenaFinal(biomeId)) nomes.add(painel.imagem);

  return [...nomes].sort();
}