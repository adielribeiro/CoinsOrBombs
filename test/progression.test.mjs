import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';

import { generateMap, getBombDensity } from '../src/game/systems/mapGenerator.js';
import { findSafeRoute, getNeighbors4, isFrontierRock } from '../src/game/systems/helpers.js';
import { BIOMES, getBiomeForCave, getBiomeProgress } from '../src/game/progression.js';
import { GROUND_TEXTURE_KEYS, SOIL_BY_BIOME, groundColorAt } from '../src/game/ground.js';
import { BIOMA_INICIAL, getBackdropKey } from '../src/game/backdrops.js';

const TOTAL_CAVES = BIOMES.at(-1).endCave;
const SAMPLES_PER_CAVE = 40;

/**
 * Fonte do BootScene, lida como texto.
 *
 * O BootScene chama `this.load.image(...)`, então a lista de assets só existe
 * em runtime — não dá para importá-la e inspecionar. Ler o arquivo e procurar a
 * chave é o jeito de o teste responder "o BootScene carrega esse fundo?", que é
 * a pergunta que importa quando um bioma novo entra. A alternativa (duplicar a
 * lista de assets aqui) deixaria o teste passar com o BootScene desatualizado,
 * que é exatamente o bug que ele existe para pegar.
 */
const bootSceneSource = await readFile(
  new URL('../src/game/scenes/BootScene.js', import.meta.url),
  'utf8'
);

/**
 * Fonte do `backdrops.js`, pelo mesmo motivo do BootScene: ele virou o lugar onde
 * a lista de fundos mora, porque o boot deixou de carregar os seis.
 */
const backdropsSource = await readFile(
  new URL('../src/game/backdrops.js', import.meta.url),
  'utf8'
);

/** A rocha da saída é quebrável quando toca a região aberta alcançada a partir da entrada. */
function exitIsBreakable(map) {
  const openRegion = new Set([`${map.entry.col},${map.entry.row}`]);
  const queue = [map.entry];

  while (queue.length > 0) {
    const current = queue.shift();

    getNeighbors4(current.col, current.row, map.width, map.height).forEach((neighbor) => {
      const key = `${neighbor.col},${neighbor.row}`;
      const tile = map.tiles[neighbor.row][neighbor.col];

      if (openRegion.has(key) || tile.type === 'rock') return;

      openRegion.add(key);
      queue.push(neighbor);
    });
  }

  return getNeighbors4(map.exit.col, map.exit.row, map.width, map.height).some((neighbor) =>
    openRegion.has(`${neighbor.col},${neighbor.row}`)
  );
}

test('toda cave gerada tem a saída quebrável a partir da entrada', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    for (let attempt = 0; attempt < SAMPLES_PER_CAVE; attempt += 1) {
      const map = generateMap(cave, 1, 0);

      assert.ok(
        exitIsBreakable(map),
        `cave ${cave} (${getBiomeProgress(cave).label}) gerou saida inalcancavel na tentativa ${attempt}`
      );
    }
  }
});

test('toda cave tem rota sem bomba até a saída (a Poção Caminho Seguro sempre funciona)', () => {
  // Regressão: a busca exigia "não é rocha E não é bomba". No começo da cave
  // o único tile aberto é a entrada, então a busca nunca saía dela e a poção
  // falhava em 100% das caves (0 sucesso em 2.400 geradas).
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    for (let attempt = 0; attempt < SAMPLES_PER_CAVE; attempt += 1) {
      const map = generateMap(cave, 1, 0);
      const route = findSafeRoute(map);

      assert.ok(
        route,
        `cave ${cave} (${getBiomeProgress(cave).label}) ficou sem rota sem bomba, entao a pocao nao faria nada`
      );
    }
  }
});

test('a rota segura nunca atravessa uma bomba', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const map = generateMap(cave, 1, 0);
      const route = findSafeRoute(map);

      for (const step of route) {
        const tile = map.tiles[step.row][step.col];
        assert.notEqual(
          tile.hiddenContent,
          'bomb',
          `cave ${cave}: a rota passou por uma bomba em ${step.col},${step.row}`
        );
      }
    }
  }
});

test('a rota segura começa na entrada e termina na saída, em tiles vizinhos', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const route = findSafeRoute(map);

    assert.deepEqual(route[0], { col: map.entry.col, row: map.entry.row }, 'comeco na entrada');
    assert.deepEqual(
      route.at(-1),
      { col: map.exit.col, row: map.exit.row },
      'fim na saida'
    );

    for (let i = 1; i < route.length; i += 1) {
      const distance =
        Math.abs(route[i].col - route[i - 1].col) + Math.abs(route[i].row - route[i - 1].row);
      assert.equal(distance, 1, `degrau ${i} da rota nao e ortogonal`);
    }
  }
});

test('a rota segura atravessa rocha, que e o que a torna util', () => {
  // Se a rota so passasse por chao aberto ela seria inútil: no início da cave
  // nao existe chao aberto nenhum além da entrada.
  let comRocha = 0;

  for (let cave = 1; cave <= 20; cave += 1) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const map = generateMap(cave, 1, 0);
      const route = findSafeRoute(map);
      const atravessaRocha = route.some((step) => map.tiles[step.row][step.col].type === 'rock');
      if (atravessaRocha) comRocha += 1;
    }
  }

  assert.ok(comRocha > 0, 'a rota precisa indicar quais rochas quebrar');
});

test('a entrada é sempre um tile aberto e único', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const entrances = map.tiles.flat().filter((tile) => tile.type === 'entrance');

    assert.equal(entrances.length, 1, `cave ${cave} deveria ter exatamente 1 entrada`);
    assert.equal(map.tiles[map.entry.row][map.entry.col].type, 'entrance');
  }
});

test('a rocha da saída é fronteira quebrável, nunca um tile vazio', () => {
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    const map = generateMap(cave, 1, 0);
    const exitTile = map.tiles[map.exit.row][map.exit.col];

    assert.equal(exitTile.type, 'rock', `cave ${cave}: a saida deveria estar escondida em rocha`);
    assert.equal(exitTile.isHiddenExit, true);
    assert.ok(
      isFrontierRock(map, map.entry, exitTile),
      `cave ${cave}: a saida nao e fronteira da area aberta`
    );
  }
});

test('a curva de densidade de bomba sobe dentro do bioma e entre biomas', () => {
  // Testado na fórmula, e não na amostragem. A versão anterior media a Cave 10
  // contra a Cave 11 com 60 mapas e exigia que a segunda fosse maior: os
  // valores verdadeiros eram 0,144 e 0,148, e o erro de amostragem de uma
  // proporção nessa faixa é de cerca de 0,045. A margem é 0,004. O teste
  // reprovava de vez em quando sem que nada estivesse errado.
  const densityAt = (cave) => getBombDensity(cave, getBiomeForCave(cave));

  // Dentro do bioma a rampa é visível.
  assert.ok(
    densityAt(1) < densityAt(10),
    `cave 1 (${densityAt(1)}) deveria ser mais segura que a cave 10 (${densityAt(10)})`
  );

  // E o próximo bioma começa acima de onde o anterior fechou. Sem isto, a
  // Câmara de Cristal abria mais leve do que a Cave 40 tinha terminado.
  //
  // A Galeria de Vento fica de fora, e é a exceção que ela existe para ser: o
  // limite entre Ruínas e Vento é uma QUEDA de propósito. Incluí-la aqui faria
  // o laço contradizer a asserção seguinte.
  const wind = BIOMES.find((b) => b.id === 'wind');

  for (const biome of BIOMES.slice(1)) {
    if (biome.id === wind.id) continue;

    const anterior = BIOMES[BIOMES.indexOf(biome) - 1];

    assert.ok(
      densityAt(biome.startCave) > densityAt(anterior.endCave),
      `a cave ${biome.startCave} (${densityAt(biome.startCave)}) deveria ser mais perigosa `
        + `que a ${anterior.endCave} (${densityAt(anterior.endCave)}), que fecha ${anterior.id}`
    );
  }

  // A Galeria de Vento é o alívio proposital, e a única quebra da curva. Se ela
  // deixar de ser o alívio, o sexto bioma perde a função de estar no meio.
  const antesDoVento = BIOMES[BIOMES.indexOf(wind) - 1];

  assert.ok(
    densityAt(wind.startCave) < densityAt(antesDoVento.endCave),
    'a Galeria de Vento deveria ser o alívio, mais segura que a última cave das Ruínas'
  );
  assert.ok(
    densityAt(wind.endCave) < densityAt(BIOMES.at(-1).endCave),
    'a Câmara de Cristal encerra a progressão mais perigosa que a Galeria de Vento'
  );

  // A curva não pode passar do teto, nem no bioma de maior multiplicador.
  for (let cave = 1; cave <= TOTAL_CAVES; cave += 1) {
    assert.ok(
      densityAt(cave) <= 0.3 + 1e-9,
      `cave ${cave} com densidade ${densityAt(cave)}, acima do teto de 0,3`
    );
  }

  // E a Cave 1 precisa continuar justa: com 2 de vida por rocha, uma fração
  // alta demais mata a run por sorteio antes de qualquer decisão.
  assert.ok(densityAt(1) < 0.18, `cave 1 com ${densityAt(1)} de bomba seria injusta com 2 de vida`);
});

test('a densidade de bomba medida bate com a curva', () => {
  // A curva exata acima não prova que o gerador a usa. Esta medição roda com
  // margem larga de propósito: 0,12 contra 0,29 é a diferença que 60 amostras
  // resolvem com folga, e um erro de fator 2 na aplicação seria visível.
  const densityAt = (cave) => {
    let bombs = 0;
    let rocks = 0;
    const samples = 60;

    for (let i = 0; i < samples; i += 1) {
      const map = generateMap(cave, 1, 0);

      for (const tile of map.tiles.flat()) {
        if (tile.type !== 'rock') continue;
        rocks += 1;
        if (tile.hiddenContent === 'bomb') bombs += 1;
      }
    }

    return bombs / rocks;
  };

  const early = densityAt(1);
  const late = densityAt(TOTAL_CAVES);

  assert.ok(
    early < 0.18,
    `cave 1 medida em ${early.toFixed(3)}, acima do limite de justiça de 0,18`
  );
  assert.ok(
    late > early * 1.5,
    `a cave ${TOTAL_CAVES} (${late.toFixed(3)}) deveria ser bem mais perigosa que a cave 1 (${early.toFixed(3)})`
  );
});

test('a resistência da rocha cresce dentro do bioma e entre biomas', () => {
  const hpAt = (cave) => {
    const map = generateMap(cave, 1, 0);

    return Math.max(...map.tiles.flat().filter((t) => t.type === 'rock').map((t) => t.hp));
  };

  // Dentro do bioma a rocha endurece, e o próximo bioma começa mais duro que
  // a cave que o abriu. A segunda comparação é a que quebrou quando a faixa
  // encolheu de 20 para 10: a cave 20 passou a ser a PRIMEIRA cave de um
  // bioma, e comparar 10 com 20 media profundidades diferentes.
  assert.ok(hpAt(1) < hpAt(10), 'a cave 10 deveria ser mais dura que a cave 1');
  assert.ok(hpAt(10) < hpAt(11), 'a cave 11 deveria ser mais dura que a cave 10');
  assert.ok(hpAt(11) < hpAt(60), 'a cave 60 deveria ser a mais dura do jogo');

  // A soma de bioma e profundidade não pode zerar a vida da rocha, senão ela
  // fica inquebrável. Já aconteceu quando a difficulty vinha só da cave local:
  // a cave 51 saía com 0 de resistência.
  for (let cave = 1; cave <= 60; cave += 1) {
    assert.ok(hpAt(cave) >= 1, `cave ${cave} com rocha de ${hpAt(cave)} de resistência`);
  }
});

test('a picareta reduz a resistência da rocha', () => {
  const maxHp = (power) => {
    const map = generateMap(1, power, 0);
    return Math.max(...map.tiles.flat().filter((t) => t.type === 'rock').map((t) => t.hp));
  };

  assert.ok(maxHp(5) < maxHp(1), 'picareta nivel 5 deveria quebrar mais rapido que nivel 1');
  assert.ok(maxHp(5) >= 1, 'picareta nivel 5 nunca pode dar 0 de resistencia');
});

test('toda cave devolve o bioma correto e o total de caves coerente', () => {
  for (const biome of BIOMES) {
    const progress = getBiomeProgress(biome.startCave);

    assert.equal(progress.totalCaves, biome.endCave - biome.startCave + 1);
    assert.equal(progress.biome.id, biome.id);
  }
});

/**
 * Estrutura dos biomas, que mudou quando as faixas encolheram de 20 para 10
 * caves e os biomas Vento e Cristal entraram.
 */
test('os biomas são 10 caves, sequenciais e sem buraco entre eles', () => {
  const TOTAL = BIOMES[BIOMES.length - 1].endCave;

  BIOMES.forEach((biome, indice) => {
    const tamanho = biome.endCave - biome.startCave + 1;
    assert.equal(tamanho, 10, `${biome.id} tem ${tamanho} caves, e não 10`);

    if (indice === 0) {
      assert.equal(biome.startCave, 1, 'o primeiro bioma tem de começar na cave 1');
    } else {
      const anterior = BIOMES[indice - 1];
      assert.equal(
        biome.startCave,
        anterior.endCave + 1,
        `${biome.id} começa na ${biome.startCave}, mas a anterior termina na ${anterior.endCave}`
      );
      // O bioma abre quando a cave anterior é CONCLUÍDA.
      assert.equal(
        biome.unlockCave,
        anterior.endCave,
        `${biome.id} abre na cave ${biome.unlockCave}, e a anterior termina na ${anterior.endCave}`
      );
    }
  });

  assert.equal(TOTAL, BIOMES.length * 10, `total de ${TOTAL} caves para ${BIOMES.length} biomas`);
});

test('todo bioma tem chão, fundo e decoração próprios', () => {
  // Um bioma sem atlas de chão ou sem fundo quebraria ao entrar nele, e o
  // sintoma seria o chão ou a tela preta — o mesmo dos bugs anteriores.
  //
  // O fundo NÃO é mais carregado no boot: ele vem por bioma, em `backdrops.js`.
  // Então a afirmação mudou de "o BootScene carrega esta chave" para "a chave
  // está registrada e o arquivo existe" — que é o que ainda tem de ser verdade
  // para o bioma entrar sem cair no placeholder de textura ausente.
  const boot = bootSceneSource;
  const backdrops = backdropsSource;

  for (const biome of BIOMES) {
    assert.ok(GROUND_TEXTURE_KEYS[biome.id], `${biome.id} sem atlas de chão`);
    assert.ok(SOIL_BY_BIOME[biome.id], `${biome.id} sem material de solo`);
    assert.ok(biome.backgroundKey, `${biome.id} sem chave de fundo`);
    assert.ok(
      backdrops.includes(`'${biome.backgroundKey}'`),
      `${biome.id} tem o fundo ${biome.backgroundKey}, que o backdrops.js não `
        + `registra — e sem registro ele nunca seria pedido`
    );
    assert.ok(
      existsSync(new URL(`../public/assets/${biome.backgroundKey}.png`, import.meta.url)),
      `${biome.id} registra o fundo ${biome.backgroundKey}, mas o arquivo não `
        + `existe. O placeholder de textura ausente apareceria ao entrar nele.`
    );
    assert.ok(biome.palette.ground > 0, `${biome.id} sem cor de chão`);
    assert.ok(biome.relicId, `${biome.id} sem relíquia`);
    assert.ok(biome.primaryDeco, `${biome.id} sem decoração principal`);
    assert.ok(
      boot.includes(`'${biome.primaryDeco}'`),
      `${biome.id} usa ${biome.primaryDeco}, que o BootScene não carrega`
    );
  }
});

test('só o fundo do primeiro bioma é carregado no boot', () => {
  // Este é o teste que segura a decisão de não carregar os seis. Os fundos em 4K
  // somam 17,3 MB; carregá-los todos levaria o boot de 9,7 MB para 26,0 MB.
  // Sem esta afirmação, alguém reintroduz o laço dos seis "para simplificar" e
  // não tem nada que reclame.
  //
  // A verificação é pela chave RESOLVIDA, e não por string no fonte. O BootScene
  // pede `getBackdropKey(BIOMA_INICIAL)`, então procurar a chave literal não
  // encontraria nada — e um teste que passa por acidente é pior que um teste
  // que não existe.
  const boot = bootSceneSource;

  assert.ok(
    boot.includes('getBackdropKey(BIOMA_INICIAL)'),
    'o BootScene não pede o fundo pela função. A lista de seis voltou a ser ' +
      'escrita à mão, e o boot voltou a pesar 26 MB.'
  );

  const doBoot = getBackdropKey(BIOMA_INICIAL);
  const inicial = BIOMES.find((b) => b.id === BIOMA_INICIAL);

  assert.ok(inicial, `BIOMA_INICIAL é "${BIOMA_INICIAL}", que não é bioma nenhum`);
  assert.equal(doBoot, inicial.backgroundKey, 'o boot pede um fundo de outro bioma');

  for (const biome of BIOMES) {
    if (biome.id === BIOMA_INICIAL) continue;

    assert.ok(
      !boot.includes(`assets/${biome.backgroundKey}.png`),
      `${biome.id} tem ${biome.backgroundKey} (${(
        statSync(new URL(`../public/assets/${biome.backgroundKey}.png`, import.meta.url)).size
        / 1024 / 1024
      ).toFixed(1)} MB) e o BootScene carrega. Cada fundo entra por demanda, em ensureBackdrop.`
    );
  }
});

test('as cores de chão são distintas entre todos os biomas', () => {
  // Dois biomas com o mesmo chão não são dois biomas. O corte de 30 só falha
  // quando dois materiais realmente coincidem.
  const medias = new Map();

  for (const biome of BIOMES) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        for (let py = 0; py < 57; py += 4) {
          for (let px = 0; px < 112; px += 4) {
            const sx = (px + 0.5 - 56) / 56;
            const sy = (py + 0.5 - 28.5) / 28.5;
            if (Math.abs(sx) + Math.abs(sy) > 1) continue;
            const [pr, pg, pb] = groundColorAt(
              col + (sx + sy) / 2,
              row + (sy - sx) / 2,
              SOIL_BY_BIOME[biome.id]
            );
            r += pr; g += pg; b += pb; n += 1;
          }
        }
      }
    }

    medias.set(biome.id, [r / n, g / n, b / n]);
  }

  for (let i = 0; i < BIOMES.length; i += 1) {
    for (let j = i + 1; j < BIOMES.length; j += 1) {
      const a = medias.get(BIOMES[i].id);
      const b = medias.get(BIOMES[j].id);
      const distancia = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      assert.ok(
        distancia > 30,
        `${BIOMES[i].id} e ${BIOMES[j].id} têm chão quase igual (distância ${distancia.toFixed(1)})`
      );
    }
  }
});
