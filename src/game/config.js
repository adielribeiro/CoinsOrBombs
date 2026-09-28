export const BASE_MAP_SCALE = 1.12;
export const BASE_TILE_WIDTH = Math.round(86 * BASE_MAP_SCALE);
export const BASE_TILE_HEIGHT = Math.round(44 * BASE_MAP_SCALE);

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
