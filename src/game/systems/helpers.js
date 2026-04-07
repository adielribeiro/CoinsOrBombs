export function getNeighbors8(col, row, width, height) {
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;

      const nextCol = col + colOffset;
      const nextRow = row + rowOffset;

      if (nextCol >= 0 && nextRow >= 0 && nextCol < width && nextRow < height) {
        neighbors.push({ col: nextCol, row: nextRow });
      }
    }
  }

  return neighbors;
}

export function getNeighbors4(col, row, width, height) {
  const candidates = [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 }
  ];

  return candidates.filter(
    (neighbor) =>
      neighbor.col >= 0 &&
      neighbor.row >= 0 &&
      neighbor.col < width &&
      neighbor.row < height
  );
}

export function getConnectedOpenTiles(mapData, start) {
  const visited = new Set();
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.col},${current.row}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const neighbors = getNeighbors8(
      current.col,
      current.row,
      mapData.width,
      mapData.height
    );

    neighbors.forEach((neighbor) => {
      const tile = mapData.tiles[neighbor.row][neighbor.col];
      if (tile.type !== 'rock') {
        const neighborKey = `${neighbor.col},${neighbor.row}`;
        if (!visited.has(neighborKey)) {
          queue.push(neighbor);
        }
      }
    });
  }

  return visited;
}

export function isFrontierRock(mapData, start, tile) {
  if (!tile || tile.type !== 'rock') return false;

  const connectedOpenTiles = getConnectedOpenTiles(mapData, start);
  const neighbors = getNeighbors8(tile.col, tile.row, mapData.width, mapData.height);

  return neighbors.some((neighbor) =>
    connectedOpenTiles.has(`${neighbor.col},${neighbor.row}`)
  );
}

export function isExitUnlocked(mapData, exit) {
  const exitTile = mapData?.tiles?.[exit?.row]?.[exit?.col];

  if (!exitTile || exitTile.type !== 'exit') {
    return false;
  }

  const sideNeighbors = getNeighbors4(exit.col, exit.row, mapData.width, mapData.height);

  return sideNeighbors.some((neighbor) => {
    const tile = mapData.tiles[neighbor.row][neighbor.col];
    return tile.type !== 'rock';
  });
}