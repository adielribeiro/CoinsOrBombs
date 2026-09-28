import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { BIOMES } from '../src/game/progression.js';
import {
  GROUND_CELL_HEIGHT,
  GROUND_CELL_WIDTH,
  GROUND_COLUMNS,
  GROUND_ROWS,
  getGroundAtlasSize
} from '../src/game/ground.js';

const sceneSource = await readFile(new URL('../src/game/scenes/CaveScene.js', import.meta.url), 'utf8');
const bootSource = await readFile(new URL('../src/game/scenes/BootScene.js', import.meta.url), 'utf8');

/**
 * Tira comentários antes de inspecionar o código.
 *
 * A documentação deste arquivo bug aparece nas próprias linhas de código, e
 * sem isso os testes accusationariam a si mesmos.
 */
const semComentario = (texto) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const scene = semComentario(sceneSource);
const boot = semComentario(bootSource);

/**
 * O bug: `this.floorLayer.setTint(biome.palette.ground)` no fim do `renderMap`.
 *
 * `Phaser.GameObjects.Container` NÃO tem `setTint`. Os mixins dele são
 * AlphaSingle, BlendMode, ComputedSize, Depth, Mask, PostPipeline, Transform e
 * Visible — Tint não está na lista. A chamada estoura um `TypeError` depois do
 * fundo já ter sido desenhado, a cena morre ali, e o resultado é uma tela preta
 * com o HUD de React intacto por cima: exatamente o que o usuário reportou.
 *
 * Estes testes existem porque o build passava, os 36 testes de `node:test`
 * passavam e não havia nenhum erro de console. O bug só aparecia com o jogo em
 * execução. A verificação estática é o que pega essa classe de falha.
 */
test('nenhum Container recebe setTint, porque Container não tem esse método', () => {
  const chamadas = [...scene.matchAll(/(\w+)\.setTint\(/g)].map((m) => m[1]);
  const containers = ['backgroundLayer', 'floorLayer', 'objectLayer', 'overlayLayer'];

  assert.ok(chamadas.length > 0, 'nenhuma chamada de setTint encontrada: o teste não está medindo nada');

  for (const alvo of chamadas) {
    assert.ok(
      !containers.includes(alvo),
      `${alvo}.setTint(...): Container não tem setTint, e a exceção derruba a cena`
    );
  }
});

test('cada célula do chão recebe o tint do bioma', () => {
  assert.match(
    scene,
    /floor\.setTint\(biome\.palette\.ground\)/,
    'a célula do chão deveria receber o tint do bioma'
  );
});

test('o chão de fallback também é tingido, senão fica cinza ao quebrar a rocha', () => {
  assert.match(
    scene,
    /fallbackFloor\.setTint\(/,
    'o chão criado ao quebrar a rocha precisa do tint, senão o atlas cinza aparece cru'
  );
});

test('o tint do chão é o mesmo para todas as células, sem termo por tile', () => {
  // Grade aparece quando o valor VARIA por tile, produzindo degrau de
  // luminância na fronteira. Aqui tem de ser uma cor só, vinda da paleta.
  const argumentos = [...scene.matchAll(/setTint\(([^)]*)\)/g)].map((m) => m[1].trim());
  const doChao = argumentos.filter((arg) => arg.includes('ground'));

  assert.ok(doChao.length > 0, 'nenhum tint de chão encontrado');

  for (const arg of doChao) {
    assert.ok(
      !/\bcol\b|\brow\b|floorTone|hash|Math\.(sin|random|floor)/.test(arg),
      `tint de chão com termo por tile: setTint(${arg}) — isso reintroduz a grade`
    );
  }
});

/**
 * A tela de título tem que mostrar a arte do bioma e nada mais.
 *
 * O bug: o guarda de `attractMode` estava só no handler do evento, e o
 * `createGame` agenda três redesenhos de resize logo depois do create. O menu
 * recebia a arte do bioma e, cerca de 300ms depois, o mapa inteiro por cima —
 * chão, rochas, entrada e saída. Era o mesmo elemento fantasma que o recurso
 * veio para remover, só que voltando depois.
 *
 * Build e testes passavam: o código estava "certo" em cada linha. Só apareceu
 * contando os objetos em cada camada, com o espelho `__cobSceneState`.
 */
test('renderMap desvia para o fundo do menu quando está em modo attract', () => {
  const corpo = scene.slice(scene.indexOf('renderMap() {'));

  assert.match(
    corpo.slice(0, 400),
    /if \(this\.attractMode[\s\S]*?renderAttractBackdrop\(\);\s*return;/,
    'renderMap deveria desviar para renderAttractBackdrop no modo attract, antes de limpar as camadas'
  );
});

test('o guarda de attract vem antes de qualquer desenho de mapa', () => {
  // Se o guarda viesse depois do `removeAll`, o desvio ainda limparia as camadas
  // e voltaria a desenhar o mapa. A ordem é o que importa, então ela é testada.
  const corpo = scene.slice(scene.indexOf('renderMap() {'));
  const guarda = corpo.indexOf('if (this.attractMode');
  const limpa = corpo.indexOf('removeAll');

  assert.ok(guarda > -1, 'nenhum guarda de attractMode no renderMap');
  assert.ok(limpa > -1, 'nenhuma limpeza de camada no renderMap');
  assert.ok(
    guarda < limpa,
    `o guarda de attractMode (posição ${guarda}) precisa vir antes da limpeza (posição ${limpa})`
  );
});

test('o fundo do menu limpa as três camadas antes de desenhar', () => {
  const corpo = scene.slice(scene.indexOf('renderAttractBackdrop() {'));
  const fim = corpo.indexOf('publishSceneState()');

  for (const camada of ['backgroundLayer', 'floorLayer', 'objectLayer']) {
    assert.match(
      corpo.slice(0, fim),
      new RegExp(`${camada}\\.removeAll\\(true\\)`),
      `${camada} não é limpa no fundo do menu: o mapa anterior ficaria visível por cima`
    );
  }
});

test('a entrada e a saída continuam por cima da cor do bioma', () => {
  // São marcadores de jogo e precisam de leitura imediata, então o tint do
  // bioma não pode sobrescrever o delas. A ordem no código importa.
  assert.match(scene, /floor\.setTint\(biome\.palette\.ground\)/);
  assert.match(scene, /floor\.setTint\(biome\.palette\.exit\)/);
  assert.match(scene, /floor\.setTint\(biome\.palette\.entrance\)/);

  const iBioma = scene.indexOf('floor.setTint(biome.palette.ground)');
  const iExit = scene.indexOf('floor.setTint(biome.palette.exit)');
  const iEntrada = scene.indexOf('floor.setTint(biome.palette.entrance)');

  assert.ok(iBioma < iExit, 'o tint do bioma é aplicado depois do da saída e apaga o marcador');
  assert.ok(iBioma < iEntrada, 'o tint do bioma é aplicado depois do da entrada e apaga o marcador');
});

test('palette.ground existe, é número e é claro o bastante', () => {
  // `palette.ground` foi inserido por script. Faltando em algum bioma, o tint
  // receberia undefined e o chão renderizaria preto — outro caminho para a
  // tela preta, e igualmente invisível ao build.
  // O número vem dos próprios dados, não de um número escrito à mão. A
  // versão anterior fixava `>= 4`, que continuaria passando com quatro biomas
  // depois de o jogo chegar a seis — a checagem dizia verificar os biomas sem
  // dizer quais.
  assert.ok(BIOMES.length >= 6, `esperava os seis biomas, e há ${BIOMES.length}`);

  for (const biome of BIOMES) {
    const ground = biome.palette?.ground;

    assert.equal(typeof ground, 'number', `bioma ${biome.id} sem palette.ground numérico`);
    assert.ok(Number.isInteger(ground), `palette.ground de ${biome.id} não é inteiro: ${ground}`);
    assert.ok(ground > 0 && ground <= 0xffffff, `palette.ground de ${biome.id} fora da faixa: ${ground}`);

    // O tint multiplica, e o atlas vai até 224 por canal. Uma cor escura
    // demais levaria o chão para perto do preto.
    const minimoCanal = Math.min((ground >> 16) & 0xff, (ground >> 8) & 0xff, ground & 0xff);
    assert.ok(
      minimoCanal > 0x90,
      `palette.ground de ${biome.id} (0x${ground.toString(16)}) escurece o chão demais`
    );
  }
});

test('todos os biomas têm cor de chão distinta', () => {
  const valores = BIOMES.map((b) => b.palette.ground);
  assert.equal(new Set(valores).size, valores.length, 'dois biomas com a mesma cor de chão');
});

test('o chão é carregado como spritesheet com o frame config do atlas', () => {
  // Frame config errado não gera erro visível: o Phaser simplesmente não acha
  // os frames e o chão não aparece. É o outro caminho para a tela preta.
  assert.match(boot, /load\.spritesheet\(/, 'o chão deveria ser carregado como spritesheet');
  assert.match(boot, /frameWidth:\s*GROUND_CELL_WIDTH/, 'frameWidth deveria vir da constante');
  assert.match(boot, /frameHeight:\s*GROUND_CELL_HEIGHT/, 'frameHeight deveria vir da constante');

  // O atlas precisa ser divisível exatamente, senão o último frame sai cortado.
  const size = getGroundAtlasSize();
  assert.equal(size.width % GROUND_CELL_WIDTH, 0, 'largura do atlas não é múltiplo do frameWidth');
  assert.equal(size.height % GROUND_CELL_HEIGHT, 0, 'altura do atlas não é múltiplo do frameHeight');
  assert.ok(GROUND_COLUMNS * GROUND_ROWS > 100, 'atlas com poucas células');
});

test('a célula do chão usa o frame da posição e 1px de sobreposição', () => {
  assert.match(
    scene,
    /setFrame\(groundFrameIndex\(col, row\)\)/,
    'o chão deveria escolher o frame pela posição da célula'
  );
  // A sobreposição de 1px cobre a fresta que o filtro bilinear deixa nas
  // arestas fracionárias (a meia-altura é 24,5px). Sem ela volta a grade,
  // agora fininha.
  assert.match(
    scene,
    /setDisplaySize\(tileWidth \+ 1, tileHeight \+ 1\)/,
    'o chão deveria ser desenhado 1px maior que a célula'
  );
});

test('as antigas floor_*.png saíram do código e do carregamento', () => {
  // Sobrar uma referência daria textura nula e célula vazia — preto por
  // célula, o mesmo sintoma.
  assert.ok(!/floor_0[123]/.test(scene), 'CaveScene ainda cita floor_0X');
  assert.ok(!/floor_0[123]/.test(boot), 'BootScene ainda carrega floor_0X');
});
