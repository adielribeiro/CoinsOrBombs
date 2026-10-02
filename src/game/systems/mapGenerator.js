import { BIOMES, createRelicContent, getBiomeForCave, getBiomeProgress } from '../progression.js';
import { getRockVariantCount } from '../rocks.js';
import { findSafeRoute, getNeighbors4, getNeighbors8 } from './helpers.js';

/**
 * Os 3 pontos percentuais que a chance de relíquia ganhou, em fração.
 *
 * Somados antes do teto, e o teto é a soma antiga mais estes 3 pontos: era 28%, e
 * passou a 31%. É o que faz o ganho valer também nas caves que já estavam no teto.
 */
export const BONUS_RELICIA = 0.03;

/** O teto da chance de relíquia, com o bônus já somado. */
export const CHANCE_MAXIMA_RELICIA = 0.28 + BONUS_RELICIA;

/**
 * Índice do modelo de rocha, escolhido dentro da folha do bioma.
 *
 * Antes isto era uma lista de CHAVES de textura, com `rock` repetido para pesar
 * o boulder redondo. Depois disso virou um número solto sorteado de 0 a 11, e
 * esse é o defeito: o número tem de ser escolhido DENTRO da folha do bioma, e
 * cada bioma tem uma contagem própria. Com os sprites individuais, frost tem 14
 * modelos e sunstone tem 12 — sortear de 0 a 13 num bioma de 12 dá um índice
 * fora da folha, e índice fora da folha é o placeholder de textura ausente.
 *
 * Por isso o sorteio mora aqui e o tile guarda só o número. O gerador não
 * conhece nome de arquivo nem folha: o `rockVariant` continua sendo dado puro.
 */
function sorteiaVarianteDeRocha(biomeId) {
  return Math.floor(Math.random() * getRockVariantCount(biomeId));
}

/**
 * Dimensões da cave. Exportado porque `GROUND_COLUMNS`/`GROUND_ROWS` no atlas
 * do chão precisam cobrir o maior mapa, e essa verificação só faz sentido
 * contra a função que define o tamanho.
 */
/**
 * Teto de tiles por lado.
 *
 * Fica abaixo das 14 colunas e 12 linhas do atlas do chão, para que nenhuma
 * célula precise repetir. A verificação está em test/ground.test.mjs.
 */
const MAX_TILES = 9;

/**
 * Teto da fração de rochas que escondem bomba.
 *
 * Acima de um terço, a cave deixa de ser um quebra-cabeça e vira sorteio: o
 * jogador não consegue ler o mapa, só pode torcer. O teto vale DEPOIS do
 * `bombMultiplier` do bioma, senão ele não é teto.
 */
const MAX_BOMB_DENSITY = 0.3;

/**
 * Fração de rochas que escondem bomba numa cave.
 *
 * Exportada porque a curva é a única parte da dificuldade que a amostragem não
 * consegue verificar. Comparar a densidade medida da Cave 10 com a da Cave 11
 * dava 0,144 contra 0,148: uma margem de 0,004 dentro de um erro de cerca de
 * 0,045 com 60 amostras. O teste passava ou falhava conforme o sorteio, e
 * reprovar ali não significava nada. Testando a fórmula, a afirmação "a cave 11
 * é mais perigosa que a 10" é exata.
 *
 * A rampa é sobre a cave GLOBAL. Com a cave local do bioma a densidade
 * reiniciava a cada bioma, e a última cave de um mundo era mais perigosa que a
 * primeira do seguinte: a Câmara de Cristal abria mais fácil do que a Cave 40
 * tinha fechado. O `bombMultiplier` do bioma entra por cima, e é ele que faz a
 * Galeria de Vento ser o alívio no meio da progressão.
 *
 * O teto é aplicado DEPOIS do multiplicador. Antes ele era aplicado antes,
 * então o limite de 0,3 não era um limite: a Câmara de Cristal passava dele e
 * chegava a 0,36.
 */
export function getBombDensity(cave = 1, biome = BIOMES[0]) {
  return Math.min(MAX_BOMB_DENSITY, (0.12 + (cave - 1) * 0.003) * biome.bombMultiplier);
}

/**
 * Dimensões da cave.
 *
 * O tamanho cresce dentro do bioma, e não com o número absoluto da cave.
 *
 * A versão anterior usava `4 + (cave - 1) / 2`, e isso crescia sem parar: com
 * 80 caves a maior cave era 43x31, um mapa impossível de ler. O problema é que
 * `cave` é global, então o sexto bioma começava já enorme.
 *
 * Agora a progressão é por bioma: as caves vão de 6x7 a 9x9 dentro de cada
 * bioma de 10, e o bioma seguinte recomeça pequeno. Isso casa com a ideia de
 * que cada bioma é um mundo próprio, e mantém o maior mapa em 9x9 — que o
 * atlas de 14x12 cobre com folga.
 */
export function getMapSize(cave) {
  const biome = getBiomeForCave(cave);
  const localCave = cave - biome.startCave;
  const step = Math.floor(localCave / 2);

  return {
    width: Math.min(MAX_TILES, 6 + step),
    height: Math.min(MAX_TILES, 7 + Math.floor(localCave / 3))
  };
}

/**
 * Resistência da rocha.
 *
 * A rampa é sobre a cave GLOBAL, não sobre a local do bioma. A versão anterior
 * usava `localCave`, e com as faixas encolhidas para 10 caves isso criava um
 * degrau para baixo a cada bioma: a rocha da Cave 10 era mais dura que a da
 * Cave 11, e o jogador sentia o mundo ficando mais fácil ao avançar. Pior, com
 * o bônus de bioma somando, a soma passava a valer 0 na Cave 51 e a rocha
 * virava inquebrável.
 *
 * São duas parcelas: a rampa global, suave e sempre crescente, e o índice do
 * bioma, que é o degrau entre um mundo e outro. É o que dá a sensação de que a
 * Câmara de Cristal é outro jogo, e não a continuação da Mina Solar.
 *
 * O total fica em 18 na Cave 60 com picareta base, e 14 com a picareta no
 * máximo. A faixa antiga de 80 caves chegava a 9, então a progressão é mais
 * longa, mas o teto continua em terreno de uma dúzia de cliques por rocha.
 */
function getRockHp(pickaxePower = 1, cave = 1, biomeIndex = 0) {
  const base = 6 - pickaxePower;
  const depthBonus = Math.floor((cave - 1) / 7);
  // Um ponto por bioma, contra um ponto a cada sete caves: o degrau de bioma
  // pesa mais do que a escadinha interna, mas não atropela a rampa.
  const biomeBonus = biomeIndex;

  return Math.max(1, base + depthBonus + biomeBonus);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createBaseTile(col, row, rockHp, biomeId = 'sunstone') {
  return {
    col,
    row,
    type: 'rock',
    hiddenContent: 'empty',
    revealed: false,
    walkable: false,
    hp: rockHp,
    // `floorVariant` e `floorTone` saíram daqui. O chão vem de um atlas de
    // superfície contínua (src/game/ground.js): escolher uma arte por tile
    // repetia a malha em cada célula, e tingir cada tile com um brilho próprio
    // recriava a mesma grade como degrau de luminância. A variação de tom mora
    // na textura e a cor vem do bioma.
    grit: pickGrit(col, row),
    rockVariant: sorteiaVarianteDeRocha(biomeId),
    isHiddenExit: false
  };
}

/**
 * Quantidade de entulho desenhado sobre a célula, em sprites.
 *
 * Hash da posição: a mesma pedra volta sempre no mesmo lugar, então o mapa não
 * "pisca" a cada redesenho.
 */
function pickGrit(col, row) {
  const hash = Math.sin(col * 39.3468 + row * 11.135) * 24634.6345;
  const noise = hash - Math.floor(hash);

  return noise < 0.4 ? 1 + Math.floor(noise * 3) : 0;
}

function getDistance(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function pickHiddenExitPosition(width, height, entry) {
  const minimumDistance = Math.max(3, Math.floor((width + height) / 2) - 1);
  const preferredCandidates = [];
  const fallbackCandidates = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (col === entry.col && row === entry.row) continue;

      const candidate = { col, row };
      const distance = getDistance(candidate, entry);

      if (distance >= minimumDistance && col >= 1) {
        preferredCandidates.push(candidate);
      } else if (distance >= 2) {
        fallbackCandidates.push(candidate);
      }
    }
  }

  return pickRandom(preferredCandidates.length > 0 ? preferredCandidates : fallbackCandidates);
}

function buildMainPath(width, height, entry, exit) {
  const path = [];
  let currentCol = entry.col;
  let currentRow = entry.row;
  let safety = width * height * 6;

  path.push(`${currentCol},${currentRow}`);

  while ((currentCol !== exit.col || currentRow !== exit.row) && safety > 0) {
    const options = [];

    if (currentCol < exit.col) {
      options.push({ col: currentCol + 1, row: currentRow });
      options.push({ col: currentCol + 1, row: currentRow });
    } else if (currentCol > exit.col) {
      options.push({ col: currentCol - 1, row: currentRow });
      options.push({ col: currentCol - 1, row: currentRow });
    }

    if (currentRow < exit.row) {
      options.push({ col: currentCol, row: currentRow + 1 });
      options.push({ col: currentCol, row: currentRow + 1 });
    } else if (currentRow > exit.row) {
      options.push({ col: currentCol, row: currentRow - 1 });
      options.push({ col: currentCol, row: currentRow - 1 });
    }

    if (currentRow > 1 && Math.random() < 0.24) {
      options.push({ col: currentCol, row: currentRow - 1 });
    }

    if (currentRow < height - 2 && Math.random() < 0.24) {
      options.push({ col: currentCol, row: currentRow + 1 });
    }

    if (currentCol > 0 && Math.random() < 0.10) {
      options.push({ col: currentCol - 1, row: currentRow });
    }

    if (currentCol < width - 1 && Math.random() < 0.10) {
      options.push({ col: currentCol + 1, row: currentRow });
    }

    const validOptions = options.filter(
      (option) =>
        option.col >= 0 &&
        option.row >= 0 &&
        option.col < width &&
        option.row < height
    );

    const next = pickRandom(validOptions.length > 0 ? validOptions : [{ col: exit.col, row: exit.row }]);

    currentCol = next.col;
    currentRow = next.row;
    path.push(`${currentCol},${currentRow}`);
    safety -= 1;
  }

  path.push(`${exit.col},${exit.row}`);

  return path;
}



/**
 * Abre o menor trecho de caminho necessário para que a rocha da saída fique
 * encostada na área já aberta.
 *
 * Sem isto, uma cave pode sair da geração com a saída cercada por rocha que
 * não é fronteira — o jogador não conseguiria nem sequer clicar nela, e a
 * run ficaria sem solução possível. O caminho para em UM vizinho da saída:
 * os outros lados continuam rocha, então a saída segue "escondida".
 */
function ensureExitReachable(mapData) {
  if (hasOpenNeighborAtExit(mapData)) return;

  const { width, height, entry, exit } = mapData;
  const path = buildMainPath(width, height, entry, exit);
  const exitNeighbors = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map((n) => `${n.col},${n.row}`)
  );

  const open = (key) => {
    const [col, row] = key.split(',').map(Number);
    const tile = mapData.tiles[row][col];

    if (tile.type === 'rock' && !tile.isHiddenExit) {
      tile.type = 'floor';
      tile.walkable = true;
      tile.revealed = true;
      tile.hp = 0;
    }
  };

  for (const key of path) {
    if (key === `${entry.col},${entry.row}`) continue;

    // Para no primeiro vizinho da saída: abre a rota, mantém o resto fechado.
    if (exitNeighbors.has(key)) {
      open(key);
      return;
    }

    open(key);
  }
}

function hasOpenNeighborAtExit(mapData) {
  const { width, height, entry, exit } = mapData;
  const openRegion = floodOpenTiles(mapData, entry);
  const exitNeighbors = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map((n) => `${n.col},${n.row}`)
  );

  for (const key of openRegion) {
    if (exitNeighbors.has(key)) return true;
  }

  return false;
}

/**
 * Garante que exista ao menos uma rota da entrada até a saída sem passar por
 * bomba, que é o que a Poção Caminho Seguro revela.
 *
 * Sem isto, ~1,5% das caves ficavam com a saída cercada por bombas e a poção
 * respondia "não encontrei rota" — um utilitário comprado por 80 moedas que
 * não fazia nada. Astrategy: pega o caminho mais curto ignorando bombas e
 * limpa só as bombas que estiverem nele. Converter apenas as bombas vizinhas
 * da saída não bastava, porque a bomba pode estar mais longe e isolar a
 * saída do resto do mapa.
 */
function ensureSafeRoute(mapData) {
  if (findSafeRoute(mapData)) return;

  const route = shortestPathIgnoringBombs(mapData);
  if (!route) return;

  for (const step of route) {
    const tile = mapData.tiles[step.row][step.col];

    if (tile.hiddenContent === 'bomb') {
      tile.hiddenContent = 'empty';
    }
  }
}

/** Caminho mais curto da entrada até a saída, sem se importar com bombas. */
function shortestPathIgnoringBombs(mapData) {
  const { width, height, entry, exit } = mapData;
  const startKey = `${entry.col},${entry.row}`;
  const cameFrom = new Map();
  const visited = new Set([startKey]);
  const queue = [entry];
  let reached = false;

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.col === exit.col && current.row === exit.row) {
      reached = true;
      break;
    }

    for (const neighbor of getNeighbors4(current.col, current.row, width, height)) {
      const key = `${neighbor.col},${neighbor.row}`;
      if (visited.has(key)) continue;

      visited.add(key);
      cameFrom.set(key, `${current.col},${current.row}`);
      queue.push(neighbor);
    }
  }

  if (!reached) return null;

  const route = [];
  let key = `${exit.col},${exit.row}`;

  while (key) {
    const [col, row] = key.split(',').map(Number);
    route.push({ col, row });
    key = cameFrom.get(key);
  }

  return route.reverse();
}

function floodOpenTiles(mapData, start) {
  const visited = new Set([`${start.col},${start.row}`]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();

    getNeighbors8(current.col, current.row, mapData.width, mapData.height).forEach((neighbor) => {
      const key = `${neighbor.col},${neighbor.row}`;

      if (visited.has(key)) return;
      if (mapData.tiles[neighbor.row][neighbor.col].type === 'rock') return;

      visited.add(key);
      queue.push(neighbor);
    });
  }

  return visited;
}

export function generateMap(cave, pickaxePower = 1, coinLuck = 0) {
  const biome = getBiomeForCave(cave);

  // `getMapSize` e `getRockHp` recebem a cave GLOBAL, não a local. A versão
  // anterior passava `localCave` para as duas, o que só funcionava porque
  // `getMapSize` usava o número absoluto. Depois que `getMapSize` passou a
  // crescer por bioma, passar a local dava sempre o tamanho da primeira cave do
  // bioma e a dificuldade parava de subir.
  //
  // `localCave` continua existindo aqui, mas só para a densidade de armadilha,
  // que é expressa em fracção de rocha e não em valor absoluto.
  const { localCave } = getBiomeProgress(cave);
  const { width, height } = getMapSize(cave);
  const entryRow = Math.floor(height / 2);

  const entry = { col: 0, row: entryRow };
  const exit = pickHiddenExitPosition(width, height, entry);
  const rockHp = getRockHp(pickaxePower, cave, BIOMES.indexOf(biome));
  const tiles = [];

  for (let row = 0; row < height; row += 1) {
    const currentRow = [];
    for (let col = 0; col < width; col += 1) {
      currentRow.push(createBaseTile(col, row, rockHp, biome.id));
    }
    tiles.push(currentRow);
  }

  tiles[entry.row][entry.col] = {
    ...createBaseTile(entry.col, entry.row, rockHp, biome.id),
    type: 'entrance',
    hiddenContent: 'empty',
    revealed: true,
    walkable: true,
    hp: 0,
    isHiddenExit: false
  };

  tiles[exit.row][exit.col] = {
    ...createBaseTile(exit.col, exit.row, rockHp, biome.id),
    type: 'rock',
    hiddenContent: 'empty',
    revealed: false,
    walkable: false,
    hp: rockHp,
    isHiddenExit: true
  };

  const pathTiles = new Set(
    buildMainPath(width, height, entry, exit).filter(
      (key) => key !== `${entry.col},${entry.row}` && key !== `${exit.col},${exit.row}`
    )
  );

  const protectedExitSides = new Set(
    getNeighbors4(exit.col, exit.row, width, height).map(
      (neighbor) => `${neighbor.col},${neighbor.row}`
    )
  );

  const baseCoinChance = 0.2 + localCave * 0.012 + coinLuck;
  const coinChance = Math.min(0.48, baseCoinChance * biome.coinMultiplier);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];
      const key = `${col},${row}`;

      if (tile.type !== 'rock') continue;

      if (
        pathTiles.has(key) &&
        !protectedExitSides.has(key) &&
        !tile.isHiddenExit &&
        Math.random() < 0.18
      ) {
        tile.type = 'floor';
        tile.walkable = true;
        tile.revealed = true;
        tile.hp = 0;
      }

      if (!tile.isHiddenExit) {
        tile.hiddenContent = Math.random() < coinChance ? 'coin' : 'empty';
      }
    }
  }

  // Densidade em vez de contagem absoluta: o número de rochas cresce ~7x da
  // Cave 1 para a Cave 20, então uma contagem fixa fazia a densidade de
  // bomba CAIR com a profundidade. A Cave 1 ficava com ~24% de chance por
  // rocha com apenas 2 de vida — a run morria por sorteio antes de qualquer
  // decisão do jogador.
  const bombDensity = getBombDensity(cave, biome);

  const bombCandidates = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const tile = tiles[row][col];

      if (tile.type !== 'rock' || tile.isHiddenExit) continue;
      bombCandidates.push(tile);
    }
  }

  for (let i = bombCandidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bombCandidates[i], bombCandidates[j]] = [bombCandidates[j], bombCandidates[i]];
  }

  const bombCount = Math.min(bombCandidates.length, Math.round(bombCandidates.length * bombDensity));
  const bombsToPlace = Math.max(1, bombCount);

  for (let i = 0; i < bombsToPlace; i += 1) {
    bombCandidates[i].hiddenContent = 'bomb';
  }

  // A chance da relíquia é a chance do bioma, mais 1% a cada 5 caves, mais o bônus.
  //
  // O bônus entra **antes** do teto de propósito: somar depois faria as caves que já
  // estavam no teto não ganharem nada, e são elas as mais difíceis. O teto é a soma
  // antiga mais o bônus, e não um número solto — os dois saem das mesmas constantes.
  const relicChance = Math.min(
    CHANCE_MAXIMA_RELICIA,
    biome.relicChance + Math.floor((localCave - 1) / 5) * 0.01 + BONUS_RELICIA
  );
  if (Math.random() < relicChance) {
    const relicCandidates = bombCandidates.filter((tile) => tile.hiddenContent === 'empty');

    if (relicCandidates.length > 0) {
      const relicTile = pickRandom(relicCandidates);
      relicTile.hiddenContent = createRelicContent(biome.relicId);
    }
  }


  const mapData = {
    width,
    height,
    entry,
    exit,
    tiles,
    biome,
    localCave
  };

  ensureExitReachable(mapData);
  ensureSafeRoute(mapData);

  return mapData;
}
