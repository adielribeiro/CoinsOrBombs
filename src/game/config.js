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
 * Largura da saída, em múltiplos da largura do tile.
 *
 * 0,56 é a largura do buraco que a saída usava antes, e é por aí que a peça
 * ancora: a arte nova é a saída inteira — buraco, anel de terra e escada — e ela
 * substitui o buraco desenhado, o brilho e as linhas de degrau.
 *
 * Não é a largura da escada, que eram 10,6px. Uma peça de 10,6px de largura não
 * mostra degrau nenhum, e a arte de origem tem 1003px de conteúdo: encolher isso
 * a 10,6px seria jogar fora 99% dos pixels que o pintor gastou.
 *
 * A altura vem da proporção, e por isso sobe: a arte é 1,51 de largura por altura
 * e o buraco desenhado era 2,84. Mesma largura no tile, 36px de altura contra 19.
 */
export const EXIT_LADDER_DISPLAY = 0.56;

/**
 * Proporção da saída: altura por largura, da arte já aparada.
 *
 * 160x106 é a medida de `public/assets/exit_ladder.png` depois de
 * `scripts/trim-props.mjs`, e o teste em `test/props.test.mjs` compara as duas.
 */
export const EXIT_LADDER_ASPECT = 106 / 160;

/**
 * Onde a saída assenta, em frações da altura do tile.
 *
 * 0,04 é a posição em que o buraco estava, e a peça é ancorada pelo centro, e não
 * pela base como as rochas e a boca. Isso é o que põe o buraco no chão em vez de
 * ao lado dele: o centro do buraco dentro da arte está em 0,517 da altura, e com
 * a origem em 0,5 ele fica 0,6px abaixo da linha — imperceptível, e vale menos
 * que uma constante fracionária a mais, que dependeria de onde a contagem de
 * "pixels escuros" cortou.
 */
export const EXIT_LADDER_CENTER_Y = 0.04;

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

/**
 * O inverso de `toIso`: o ponto do mapa que um pixel representa.
 *
 * ## Por que isto existe, e o que ele NÃO é
 *
 * A projeção tem duas equações e duas incógnitas, então a volta é direta:
 *
 *     (x - origem) * 2 / largura  = col - row
 *     (y - origem) * 2 / altura   = col + row
 *
 * Somando e subtraindo, `col` e `row` saem. O resultado é **contínuo**, e quem
 * decide o tile é o arredondamento — que fica para quem chama.
 *
 * ## Por que isto não torna a caverna um mouse
 *
 * Porque um clique em coordenada de tela erra por meio pixel, e meio pixel numa
 * aresta de pedra isométrica é clicar na pedra errada. Aqui o ponteiro serve para
 * **mirar** — dizer em que tile se está — e a ação continua resolvendo um tile
 * inteiro. A precisão volta a ser do grid, que é a unidade em que o jogo pensa.
 *
 * A projeção é usada para desenhar os tiles; invertê-la é o que faz o ponteiro
 * apontar para o mesmo tile que o losango marca.
 *
 * @returns {{col: number, row: number}} coordenadas contínuas, não arredondadas
 */
export function fromIso(
  x,
  y,
  originX,
  originY,
  tileWidth = BASE_TILE_WIDTH,
  tileHeight = BASE_TILE_HEIGHT
) {
  const dx = Number.isFinite(x) ? x - originX : 0;
  const dy = Number.isFinite(y) ? y - originY : 0;

  const a = (dx * 2) / tileWidth;
  const b = (dy * 2) / tileHeight;

  return { col: (a + b) / 2, row: (b - a) / 2 };
}
