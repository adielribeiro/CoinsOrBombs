/**
 * Rochas: uma folha por bioma, doze modelos cada.
 *
 * Antes eram quatro sprites pequenos, compartilhados por todos os biomas e
 * tingidos por `palette.rockHighlight`. Isso não funciona para arte pintada: o
 * tint do Phaser só MULTIPLICA, então tingir uma rocha que já é azul de um azul
 * claro não muda o matiz, só lava o contraste. É o mesmo motivo que fez o chão
 * ganhar um atlas por bioma.
 *
 * As folhas são recortadas por `scripts/slice-rocks.mjs`, que reduz cada modelo
 * para uma célula quadrada e a encaixa na base da célula. O quadrado é o que
 * garante que a arte não seja distorcida na tela — ver `ROCK_DISPLAY` no
 * comentário de uso, e o comentário do próprio script.
 */

/** Célula de saída do recorte. Tem de bater com `CELULA_SAIDA` do script. */
export const ROCK_CELL_SIZE = 176;

/** Colunas e linhas de cada folha. 4 x 3 = 12 modelos por bioma. */
export const ROCK_SHEET_COLUMNS = 4;
export const ROCK_SHEET_ROWS = 3;

/** Quantos modelos o jogo sorteia. Um por frame. */
export const ROCK_VARIANT_COUNT = ROCK_SHEET_COLUMNS * ROCK_SHEET_ROWS;

/**
 * Chave da folha de um bioma.
 *
 * A folha é a textura e o modelo é o ÍNDICE do frame, não o nome. É o mesmo
 * caminho do atlas do chão, que usa `setFrame(groundFrameIndex(col, row))`.
 *
 * A primeira tentativa desta integração montava o nome do frame
 * (`rocks_frost_3`) e passava para `this.add.image(x, y, nomeDoFrame)`. O
 * resultado em tela foi a caixa preta com um X verde, que é o placeholder de
 * textura ausente do Phaser — em 39 rochas de uma vez, sem erro no console e
 * com o build passando. Nome de frame depende de o `load.spritesheet` receber
 * `frameNames`, e aqui ele não recebe; o índice não depende de nada disso.
 */
export function getRockSheetKey(biomeId) {
  return `rocks_${biomeId}`;
}

/**
 * Índice do frame, sempre dentro da folha.
 *
 * O `mod` duplo é proposital: um índice negativo viraria frame `-1` e um índice
 * acima da contagem viraria o placeholder de novo, e nenhum dos dois estouraria
 * exceção. Aqui os dois viram um modelo válido.
 */
export function getRockFrameIndex(variant = 0) {
  const v = Number.isFinite(variant) ? Math.trunc(variant) : 0;
  return ((v % ROCK_VARIANT_COUNT) + ROCK_VARIANT_COUNT) % ROCK_VARIANT_COUNT;
}

/**
 * Lado do quadrado em que a célula é desenhada, em pixels de tile.
 *
 * A célula é quadrada de propósito. As rochas antigas eram desenhadas com
 * `setDisplaySize(largura, altura)`, que esmaga o sprite para aquela caixa e
 * ignora a proporção do desenho: o conteúdo de 82x80 aparecia em 80x45, ou
 * seja, comprimido para 56% do natural. Os modelos novos vão de 274x100
 * (laje deitada) a 344x360 (formação alta), e uma caixa única deformaria a
 * laje para uma faixa e esticaria a formação para um cilindro.
 *
 * Desenhando a célula inteira como um quadrado com escala uniforme, a
 * variedade de proporção fica dentro da célula, que é onde ela pertence: a
 * laje aparece baixa e larga, a formação aparece alta, e nenhuma é distorcida.
 */
export const ROCK_DISPLAY = 0.62;
