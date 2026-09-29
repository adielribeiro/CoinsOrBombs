/**
 * Entradas de caverna, uma por bioma.
 *
 * A boca da caverna deixou de ser uma arte só: cada bioma tem a sua, com o
 * material do lugar no arco, no pedestal e no entulho. A arte chega em
 * 1254x1254 vinda de `cave in <bioma>.png`, e `scripts/trim-entrances.mjs` apara
 * pelo conteúdo e reduz para `largura x altura` abaixo.
 *
 * ## Por que um registro e não um `switch`
 *
 * A proporção é diferente em cada uma. Medida depois do corte: de 0,831 (Ruínas,
 * o arco mais largo) a 0,883 (Cristal, o arco mais alto). Com uma constante
 * única, `setDisplaySize` esticaria ou achataria cinco das seis em até 6% — e
 * esticar arte é o defeito que o `setDisplaySize` já causou uma vez aqui, quando
 * a rocha antiga de 82x80 era esmagada para 80x45.
 *
 * ## Onde a entrada fica
 *
 * Sempre em `col: 0`, na linha do meio, pelo `mapGenerator`. Ou seja: na borda
 * esquerda do mapa. É por isso que a entrada pode ter quatro linhas de altura sem
 * comer o campo de jogo — o que ela cobre para cima e para a direita é fundo, e o
 * chão que ela esconde é o próprio tile. Isso é medido em
 * `scripts/preview-props.mjs`, não argumento: 5 dos 42 tiles a 1,2x, e eram 7 a
 * 2,4x.
 */

/**
 * Largura da entrada, em múltiplos da largura do tile.
 *
 * Foi 2,4 e voltou para 1,2 pela mesma razão que a rocha tem teto: 2,4 é um
 * terço da largura da tela, e numa tela real a boca tapava o bioma inteiro em vez
 * de marcar a entrada dele. Na captura da Cave 1 a 2,4x ela cobria as pedras de
 * três fileiras acima do seu tile, e o "IN" ficava pequeno dentro de um arco
 * que era o maior objeto da cena.
 *
 * A 1,2 ela é um pouco mais larga que o tile, que é o que faz a entrada ler
 * como entrada e não como um objeto posto em cima de um quadrado, e ainda deixa
 * ver o campo de jogo. Um terço a mais que a 1,05 da arte única: a boca é mais
 * detalhada hoje, e essa diferença é o que paga a arte por bioma.
 */
export const ENTRANCE_DISPLAY = 1.2;

/**
 * Proporção altura por largura, e o tamanho do arquivo de cada uma.
 *
 * As duas coisas andam juntas de propósito: `largura` e `altura` existem para o
 * teste comparar com o PNG em disco, que é o que impede a proporção aqui de
 * divergir da arte sem ninguém avisar.
 */
export const ENTRANCES = {
  sunstone: { key: 'cave_entrance_sunstone', largura: 480, altura: 404, aspecto: 404 / 480 },
  frost: { key: 'cave_entrance_frost', largura: 480, altura: 415, aspecto: 415 / 480 },
  ember: { key: 'cave_entrance_ember', largura: 480, altura: 419, aspecto: 419 / 480 },
  ruins: { key: 'cave_entrance_ruins', largura: 480, altura: 399, aspecto: 399 / 480 },
  wind: { key: 'cave_entrance_wind', largura: 480, altura: 408, aspecto: 408 / 480 },
  crystal: { key: 'cave_entrance_crystal', largura: 480, altura: 424, aspecto: 424 / 480 }
};

/**
 * Idioma de último recurso.
 *
 * `sunstone` e não uma entrada genérica: a Mina Solar é o primeiro bioma, é o que
 * a tela de título mostra, e é o único que o `BootScene` carrega sem depender de
 * rede. Uma entrada "genérica" seria uma arte nova que ninguém pediu, e só
 * apareceria no primeiro bioma mesmo.
 */
const ENTRANCE_PADRAO = 'sunstone';

export function getEntranceForBiome(biomeId) {
  return ENTRANCES[biomeId] ?? ENTRANCES[ENTRANCE_PADRAO];
}

export function getEntranceKey(biomeId) {
  return getEntranceForBiome(biomeId).key;
}

export function getEntranceAspect(biomeId) {
  return getEntranceForBiome(biomeId).aspecto;
}

/** Os seis arquivos de arte, para o carregamento por bioma. */
export function listEntranceKeys() {
  return Object.values(ENTRANCES).map((entrance) => entrance.key);
}
