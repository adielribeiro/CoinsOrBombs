export const BASE_MAP_SCALE = 1.12;
export const BASE_TILE_WIDTH = Math.round(86 * BASE_MAP_SCALE);
export const BASE_TILE_HEIGHT = Math.round(44 * BASE_MAP_SCALE);

/*
 * A boca da caverna mudou de tamanho, de proporção e de quantidade: deixou de
 * ser uma arte só e passou a ter uma por bioma, e os números que vivem aqui
 * desceram para `entrances.js`.
 *
 * O que fica em `config.js` é o que não é da entrada: onde a base dela assenta.
 * A largura e a proporção são por bioma, e estão em `src/game/entrances.js`, com
 * o tamanho do arquivo ao lado para o teste comparar as três coisas.
 */

/**
 * Onde a base da boca da caverna assenta, em frações da altura do tile.
 *
 * As rochas assentam em 0,3, e a boca é o mesmo chão — a diferença de 0,02 dá
 * menos de 1px e some. O que não pode é a versão antiga: `setScale` com origem no
 * centro, com a arte acima da linha do chão, que deixava a boca inteira flutuando
 * porque o arco tem entulho e terra no rodapé.
 *
 * Com a entrada nova o rodapé é uma base de pedra assentada, e não uma linha de
 * terra: 0,28 continua sendo o ponto em que o pedestal toca o chão.
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
