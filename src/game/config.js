export const BASE_MAP_SCALE = 1.12;
export const BASE_TILE_WIDTH = Math.round(86 * BASE_MAP_SCALE);
export const BASE_TILE_HEIGHT = Math.round(44 * BASE_MAP_SCALE);

/**
 * Largura da boca da caverna, em múltiplos da largura do tile.
 *
 * 1,05 é um pouco mais larga que o tile, e é isso que faz a entrada ler como
 * uma entrada e não como um objeto posto em cima de um quadrado. A arte é um
 * arco de 156x113, e a largura é que manda: a altura vem da proporção, senão a
 * boca fica achatada ou esticada.
 */
export const CAVE_ENTRANCE_WIDTH = 1.05;

/**
 * Proporção da boca: altura por largura, da arte já aparada.
 *
 * 156x113 é a medida de `public/assets/cave_entrance.png` depois de
 * `scripts/trim-props.mjs`. A arte de origem vinha num canvas de 168x168
 * CENTRALIZADO, com 29px de folga transparente embaixo — e como a boca é
 * ancorada na base, essa folga aparecia na tela como 12,6px de levitação.
 * Aparar resolve na origem; esta constante é a proporção do arquivo, e o teste
 * em `test/props.test.mjs` compara as duas para elas não divergirem de novo.
 */
export const CAVE_ENTRANCE_ASPECT = 113 / 156;

/**
 * Onde a base da boca da caverna assenta, em frações da altura do tile.
 *
 * As rochas assentam em 0,3, e a boca é o mesmo chão — a diferença de 0,02 dá
 * menos de 1px e some. O que não pode é a versão antiga: `setScale` com origem no
 * centro, com a arte acima da linha do chão, que deixava a boca inteira flutuando
 * porque o arco tem entulho e terra no rodapé.
 */
export const CAVE_ENTRANCE_BASE = 0.28;

/**
 * Largura da picareta na animação de golpe, em múltiplos da largura do tile.
 *
 * A picareta é um efeito passageiro por cima da rocha, não um objeto do
 * cenário. A 0,45 ela tem quase metade da largura do tile, que é o suficiente
 * para ler o golpe sem cobrir a rocha que está sendo quebrada.
 */
export const PICKAXE_DISPLAY = 0.45;

/**
 * Proporção da picareta: altura por largura, da arte já aparada (140x142).
 *
 * É quase 1, e por isso a distorção passa batida. Fica declarada mesmo assim
 * porque é o que segura o `setDisplaySize` honesto: sem isso a picareta é
 * esticada em 1,4% na horizontal sem que ninguém perceba, e o próximo a
 * redimensionar a arte perde a referência de qual era a proporção original.
 */
export const PICKAXE_ASPECT = 142 / 140;

export function getTileMetrics(renderScale = 1) {
  return {
    renderScale,
    mapScale: BASE_MAP_SCALE * renderScale,
    tileWidth: Math.round(BASE_TILE_WIDTH * renderScale),
    tileHeight: Math.round(BASE_TILE_HEIGHT * renderScale)
  };
}

export function toIso(
  col,
  row,
  originX,
  originY,
  tileWidth = BASE_TILE_WIDTH,
  tileHeight = BASE_TILE_HEIGHT
) {
  return {
    x: originX + (col - row) * (tileWidth / 2),
    y: originY + (col + row) * (tileHeight / 2)
  };
}
