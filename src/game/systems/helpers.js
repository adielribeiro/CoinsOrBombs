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

/**
 * A cave só é vencível quando existe caminho caminhável da entrada até um
 * vizinho da saída. O gerador usa isto para garantir que toda cave gerada é
 * terminável — sem isso, uma saída totalmente cercada por rocha maciça
 * geraria uma run impossível.
 */
export function isExitReachable(mapData) {
  if (!isExitUnlocked(mapData, mapData.exit)) return false;

  const connected = getConnectedOpenTiles(mapData, mapData.entry);

  return getNeighbors4(mapData.exit.col, mapData.exit.row, mapData.width, mapData.height).some(
    (neighbor) => connected.has(`${neighbor.col},${neighbor.row}`)
  );
}

/**
 * Rota da entrada até a saída evitando TODOS os tiles com bomba. É o que a
 * Poção Caminho Seguro revela.
 *
 * O percurso atravessa rocha de propósito: no começo da cave o único tile
 * aberto é a entrada, então exigir "não rocha" faria a busca nunca sair
 * dali. O valor da poção é exatamente dizer "quebre estas rochas, nesta
 * ordem, e nenhuma vai ter bomba" — a parte difícil do trabalho é justamente
 * atravessar a rocha.
 *
 * @returns {Array<{col: number, row: number}>|null} tiles em ordem, ou null
 *   quando nenhuma rota sem bomba existe.
 */
export function findSafeRoute(mapData) {
  const start = mapData.entry;
  const target = mapData.exit;
  const startKey = `${start.col},${start.row}`;

  const cameFrom = new Map();
  const visited = new Set([startKey]);
  const queue = [start];
  let reached = null;

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.col === target.col && current.row === target.row) {
      reached = current;
      break;
    }

    for (const neighbor of getNeighbors4(current.col, current.row, mapData.width, mapData.height)) {
      const key = `${neighbor.col},${neighbor.row}`;
      if (visited.has(key)) continue;

      // Único bloqueio real: bomba. Rocha é atravessável de propósito.
      if (mapData.tiles[neighbor.row][neighbor.col].hiddenContent === 'bomb') continue;

      visited.add(key);
      cameFrom.set(key, `${current.col},${current.row}`);
      queue.push(neighbor);
    }
  }

  if (!reached) return null;

  const route = [];
  let key = `${reached.col},${reached.row}`;

  while (key) {
    const [col, row] = key.split(',').map(Number);
    route.push({ col, row });
    key = cameFrom.get(key);
  }

  // A remontagem caminha de trás para frente (saída -> entrada); o jogo
  // precisa da ordem em que a rocha é quebrada.
  return route.reverse();
}
