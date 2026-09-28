export const BASE_MAP_SCALE = 1.12;
export const BASE_TILE_WIDTH = Math.round(86 * BASE_MAP_SCALE);
export const BASE_TILE_HEIGHT = Math.round(44 * BASE_MAP_SCALE);

/**
 * Geometria real das variantes de chão (medida com
 * `node scripts/measure-floor.mjs`, o mesmo número nas três):
 *
 *   canvas 160x100, área opaca de y=19 a y=95
 *   losango da superfície superior: y=19..83, largura máxima 121 em y=51
 *   faces laterais (o que faz cada tile parecer um bloco empilhado): 12px
 *
 * Ou seja, o topo é um losango de 121x64 — razão 1.89, praticamente o 2:1 da
 * grade. Desenhar a arte no tamanho cheio da célula (o que o código fazia)
 * empurrava as faces laterais para dentro do vizinho e criava uma junta
 * escura grossa em cada tile: o chão virava "blocos empilhados" em vez de
 * piso contínuo.
 *
 * Estas frações alinham o losango de cima exatamente na célula. As faces
 * laterais passam a ficar sob o tile vizinho, desenhado depois na ordem de
 * profundidade.
 */
export const FLOOR_ART = {
  topWidth: 121 / 160,
  topHeight: 64 / 100,
  topOffsetY: 19 / 100,
  // Último pixel opaco do canvas. O desenho não encosta na borda: há 5% de
  // transparência acima e abaixo, e é por isso que o alinhamento não pode
  // assumir que a arte preenche o retângulo.
  opaqueTopY: 19 / 100,
  opaqueBottomY: 95 / 100
};

/** Tamanho de exibição da arte de chão para uma célula de `tileWidth`. */
export function getFloorDisplaySize(tileWidth) {
  const displayWidth = tileWidth / FLOOR_ART.topWidth;

  return {
    displayWidth,
    // Preserva a proporção do canvas (160:100) para não achatar a pedra.
    displayHeight: displayWidth * (100 / 160)
  };
}

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
