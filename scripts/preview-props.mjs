// Reproduz em Node a camada de objetos — boca da caverna, rochas e picareta —
// exatamente como o jogo a desenha, para inspecionar e medir sem depender do
// navegador.
//
//   node scripts/preview-props.mjs
//
// Existe porque a verificação visual no navegador aqui é instável: a aba do
// ambiente de teste fica com `document.visibilityState === 'hidden'`, o
// `requestAnimationFrame` é estrangulado, e o loop do Phaser nunca dá um passo.
// A cena fica presa em `status = 1` (started, nunca running) e a tela nunca
// pinta. Nestas condições o que apareceu na tela não é evidência de nada.
//
// Então a composição é feita aqui, em Node, com a mesma geometria do
// `CaveScene`: `toIso`, origem (0.5, 1), `setDisplaySize`, amostra bilinear e
// ordem do pintor por `y`. As constantes vêm do próprio jogo (`config.js`,
// `rocks.js`), e não de cópias — se a constante mudar, o preview muda junto.
//
// E o preview não é só uma imagem. No fim ele mede o que importa, que é o
// ASSENTAMENTO: para cada objeto, onde o pixel mais baixo deita em relação à
// linha do chão do seu tile. Um sprite assentado tem essa diferença perto de
// zero e constante; um que flutua tem diferença que varia de um para o outro.
import { writeFile } from 'node:fs/promises';

import {
  BASE_TILE_HEIGHT,
  BASE_TILE_WIDTH,
  CAVE_ENTRANCE_BASE,
  PICKAXE_DISPLAY,
  toIso
} from '../src/game/config.js';
import { ENTRANCE_DISPLAY, getEntranceAspect, getEntranceKey } from '../src/game/entrances.js';
import { ROCK_DISPLAY, ROCK_CELL_SIZE, ROCK_SHEET_COLUMNS, getRockVariantCount } from '../src/game/rocks.js';
import { readPng } from './png.mjs';
import { encodePng } from './png-encode.mjs';

const BIOME = process.argv[2] ?? 'sunstone';
const COLS = 7;
const ROWS = 6;

const TILE_W = BASE_TILE_WIDTH;
const TILE_H = BASE_TILE_HEIGHT;

// --- arte -----------------------------------------------------------------

const fundo = await readPng(`public/assets/cave_bg_${BIOME}.png`);
const boca = await readPng(`public/assets/${getEntranceKey(BIOME)}.png`);
const picareta = await readPng('public/assets/pickaxe_lvl1.png');
const folha = await readPng(`public/assets/rocks_${BIOME}.png`);

/** Recorta a folha de rochas: devolve o frame `indice` já isolado. */
function frameDaFolha(indice) {
  const coluna = indice % ROCK_SHEET_COLUMNS;
  const linha = Math.floor(indice / ROCK_SHEET_COLUMNS);
  const x0 = coluna * ROCK_CELL_SIZE;
  const y0 = linha * ROCK_CELL_SIZE;
  const dados = new Uint8Array(ROCK_CELL_SIZE * ROCK_CELL_SIZE * 4);

  for (let y = 0; y < ROCK_CELL_SIZE; y += 1) {
    const de = ((y0 + y) * folha.width + x0) * folha.channels;
    for (let x = 0; x < ROCK_CELL_SIZE * 4; x += 1) {
      dados[y * ROCK_CELL_SIZE * 4 + x] = folha.data[de + x];
    }
  }

  return { width: ROCK_CELL_SIZE, height: ROCK_CELL_SIZE, channels: 4, data: dados };
}

/**
 * Amostra uma textura, bilinear, como o filtro do Phaser.
 *
 * O canal de alfa é tratado por canal: os fundos de bioma são PNG de 3 canais
 * (RGB, sem alfa), e ler `q + 3` num arquivo de 3 canais não lê alfa — lê o
 * VERMELHO do pixel seguinte. Com isso o alfa sai errado, a pré-multiplicação
 * divide a cor pela cor, e o preview sai branco sem nenhum aviso.
 */
function amostra(img, u, v) {
  const temAlfa = img.channels === 4;
  const x = u * img.width - 0.5;
  const y = v * img.height - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  let r = 0, g = 0, b = 0, a = 0;

  for (let j = 0; j <= 1; j += 1) {
    for (let i = 0; i <= 1; i += 1) {
      const px = x0 + i;
      const py = y0 + j;
      const w = (i ? fx : 1 - fx) * (j ? fy : 1 - fy);
      if (w === 0) continue;
      if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;

      const q = (py * img.width + px) * img.channels;
      r += img.data[q] * w;
      g += img.data[q + 1] * w;
      b += img.data[q + 2] * w;
      a += (temAlfa ? img.data[q + 3] / 255 : 1) * w;
    }
  }

  if (a < 0.03) return null;
  return [r / a, g / a, b / a, Math.min(1, a)];
}

/** O pixel mais baixo com pixel visível, e a linha onde ele está. */
function pisoDoConteudo(img, u0, u1) {
  for (let v = 1; v >= 0; v -= 1 / (img.height * 2)) {
    for (let u = u0; u < u1; u += 1 / (img.width * 2)) {
      if (amostra(img, u, v)) return v;
    }
  }
  return null;
}

// --- geometria ------------------------------------------------------------

const origemX = Math.round((COLS + ROWS) * (TILE_W / 4) + TILE_W);
const origemY = 200;
const largura = Math.ceil((COLS + ROWS) * (TILE_W / 2) + TILE_W * 2);
const altura = Math.ceil((COLS + ROWS) * (TILE_H / 2) + 520);

const out = new Uint8ClampedArray(largura * altura * 4);

// Fundo do bioma, cobrindo a tela.
const escalaFundo = Math.max(largura / fundo.width, altura / fundo.height);
for (let py = 0; py < altura; py += 1) {
  for (let px = 0; px < largura; px += 1) {
    const c = amostra(
      fundo,
      (px / largura - 0.5) / escalaFundo + 0.5,
      (py / altura - 0.5) / escalaFundo + 0.5
    );
    const i = (py * largura + px) * 4;
    out[i] = c ? c[0] : 0x11;
    out[i + 1] = c ? c[1] : 0x14;
    out[i + 2] = c ? c[2] : 0x1c;
    out[i + 3] = 255;
  }
}

/** Desenha um tile como losango chapado, para o chão ficar legível. */
function desenhaLosango(cx, cy) {
  // Os três canais separados, e não `0x2c3646` num slot só: esse número é
  // 2.896.454, o clamp do `Uint8ClampedArray` leva a 255, e o chão inteiro sai
  // branco — que é exatamente o que aconteceu na primeira versão deste preview.
  const dentro = [0x2c, 0x36, 0x46];
  const fora = [0x23, 0x2b, 0x38];

  for (let py = -TILE_H / 2; py <= TILE_H / 2; py += 1) {
    const meia = (1 - Math.abs(py) / (TILE_H / 2)) * (TILE_W / 2);
    for (let px = -meia; px <= meia; px += 1) {
      const x = Math.round(cx + px);
      const y = Math.round(cy + py);
      if (x < 0 || y < 0 || x >= largura || y >= altura) continue;

      const i = (y * largura + x) * 4;
      const cor = Math.abs(px) / meia < 0.94 && Math.abs(py) / (TILE_H / 2) < 0.9 ? dentro : fora;
      out[i] = cor[0];
      out[i + 1] = cor[1];
      out[i + 2] = cor[2];
    }
  }
}

const entrada = { col: 0, row: 2 };
const casaPicareta = { col: 4, row: 3 };

const objetos = [];
const celulas = [];

for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    const p = toIso(col, row, origemX, origemY, TILE_W, TILE_H);
    celulas.push({ col, row, ...p });
  }
}
celulas.sort((p, q) => p.y - q.y);

for (const c of celulas) {
  desenhaLosango(c.x, c.y);

  if (c.col === entrada.col && c.row === entrada.row) {
    // Exatamente o bloco de `renderMap`, com as mesmas constantes e a proporção
    // do bioma — que agora é uma por bioma, e não uma só.
    const larguraBoca = Math.round(TILE_W * ENTRANCE_DISPLAY);
    const alturaBoca = Math.round(larguraBoca * getEntranceAspect(BIOME));
    objetos.push({
      tipo: 'boca',
      col: c.col,
      row: c.row,
      img: boca,
      largura: larguraBoca,
      altura: alturaBoca,
      // Origem (0.5, 1): a base fica em `y`, e o topo `altura` acima.
      x: c.x,
      base: c.y + TILE_H * CAVE_ENTRANCE_BASE
    });
    continue;
  }

  if (c.col === casaPicareta.col && c.row === casaPicareta.row) {
    const lado = Math.round(TILE_W * PICKAXE_DISPLAY);
    // A picareta é o efeito de golpe: sobe e desce, e não assenta no chão.
    objetos.push({
      tipo: 'picareta',
      col: c.col,
      row: c.row,
      img: picareta,
      largura: lado,
      altura: lado,
      x: c.x + TILE_W * 0.32,
      base: c.y - TILE_H * 1.3
    });
  }

  if (c.col === 0 && c.row === 4) continue; // tile vazio, para ver o chão

  const variante = (c.col * 5 + c.row * 3) % getRockVariantCount(BIOME);
  const lado = Math.round(TILE_W * ROCK_DISPLAY);
  objetos.push({
    tipo: 'rocha',
    col: c.col,
    row: c.row,
    img: frameDaFolha(variante),
    largura: lado,
    altura: lado,
    x: c.x,
    base: c.y + TILE_H * 0.3
  });
}

// Ordem do pintor: por `y`, como no `renderMap`.
//
// A picareta é a exceção, e a exceção é do jogo, não deste script: no `CaveScene`
// ela vive na `overlayLayer`, que fica ACIMA da `objectLayer`. Ordená-la por `y`
// aqui a enterraria atrás das rochas, que é justamente o oposto do que o efeito
// precisa mostrar.
objetos.sort((p, q) => {
  if (p.tipo === 'picareta') return 1;
  if (q.tipo === 'picareta') return -1;
  return p.base - q.base;
});

for (const o of objetos) {
  const esq = o.x - o.largura / 2;
  const topo = o.base - o.altura;
  const chao = o.base;

  for (let py = Math.max(0, Math.floor(topo)); py < Math.min(altura, Math.ceil(chao)); py += 1) {
    for (let px = Math.max(0, Math.floor(esq)); px < Math.min(largura, Math.ceil(esq + o.largura)); px += 1) {
      const c = amostra(o.img, (px + 0.5 - esq) / o.largura, (py + 0.5 - topo) / o.altura);
      if (!c) continue;
      // Composição source-over, para a borda macia da pintura não virar serrilha.
      const i = (py * largura + px) * 4;
      out[i] = c[0] * c[3] + out[i] * (1 - c[3]);
      out[i + 1] = c[1] * c[3] + out[i + 1] * (1 - c[3]);
      out[i + 2] = c[2] * c[3] + out[i + 2] * (1 - c[3]);
    }
  }

  // A linha do chão que este objeto deveria seguir, em vermelho.
  for (let px = Math.max(0, Math.floor(esq)); px < Math.min(largura, Math.ceil(esq + o.largura)); px += 1) {
    if (o.tipo === 'picareta') continue;
    const i = (Math.round(chao) * largura + px) * 4;
    out[i] = 255; out[i + 1] = 60; out[i + 2] = 60;
  }
}

await writeFile('props-preview.png', encodePng(largura, altura, out));

// --- medição --------------------------------------------------------------

console.log(`props-preview.png ${largura}x${altura}  (bioma ${BIOME})`);
console.log(`  tile ${TILE_W}x${TILE_H}`);
console.log(`  boca   ${Math.round(TILE_W * ENTRANCE_DISPLAY)}x${Math.round(Math.round(TILE_W * ENTRANCE_DISPLAY) * getEntranceAspect(BIOME))}  base +${(TILE_H * CAVE_ENTRANCE_BASE).toFixed(1)}px do centro  (proporcao ${getEntranceAspect(BIOME).toFixed(4)})`);
console.log(`  rocha  ${Math.round(TILE_W * ROCK_DISPLAY)}x${Math.round(TILE_W * ROCK_DISPLAY)}  base +${(TILE_H * 0.3).toFixed(1)}px do centro`);
console.log(`  picareta ${Math.round(TILE_W * PICKAXE_DISPLAY)}x${Math.round(TILE_W * PICKAXE_DISPLAY)}`);
console.log('');

// Onde o pixel mais baixo de cada objeto cai, em relação à sua base.
const assentados = { rocha: [], boca: [] };

for (const o of objetos) {
  if (o.tipo === 'picareta') continue;
  const v = pisoDoConteudo(o.img, 0, 1);
  if (v === null) continue;
  const linhaReal = o.base - o.altura + v * o.altura;
  assentados[o.tipo].push(o.base - linhaReal);
}

for (const [tipo, lista] of Object.entries(assentados)) {
  if (!lista.length) continue;
  const min = Math.min(...lista);
  const max = Math.max(...lista);
  console.log(
    `${tipo.padEnd(6)} folga entre o pixel mais baixo e a base: `
      + `min ${min.toFixed(2)}px  max ${max.toFixed(2)}px  `
      + `dispersao ${(max - min).toFixed(2)}px`
  );
}
console.log('');
console.log('  dispersao perto de 0 = todas as PECAS assentam na mesma linha.');
console.log('  dispersao alta = cada peca flutua numa altura diferente.');
console.log('');

// --- quanto a boca come do mapa ---------------------------------------------
// A boca é a única peça alta da cena, e é a que pode esconder o campo de jogo. A
// medida conta quantos TILES de chão ficam sob o pixels opacos da boca — não
// quantos a caixa de exibição cobre, que é maior que o desenho.
const bocaObj = objetos.find((o) => o.tipo === 'boca');

if (bocaObj) {
  const esq = bocaObj.x - bocaObj.largura / 2;
  const topo = bocaObj.base - bocaObj.altura;
  const mascarados = new Set();

  for (let py = Math.max(0, Math.floor(topo)); py < Math.min(altura, Math.ceil(bocaObj.base)); py += 1) {
    for (let px = Math.max(0, Math.floor(esq)); px < Math.min(largura, Math.ceil(esq + bocaObj.largura)); px += 1) {
      if (!amostra(bocaObj.img, (px + 0.5 - esq) / bocaObj.largura, (py + 0.5 - topo) / bocaObj.altura)) continue;

      // Qual tile de chão está sob este pixel? O losango do tile é o inverso do
      // mapeamento isométrico, e o teste é o mesmo do chão: o ponto precisa cair
      // dentro do losango do tile.
      for (const cell of celulas) {
        const d = { x: (px + 0.5 - cell.x) / (TILE_W / 2), y: (py + 0.5 - cell.y) / (TILE_H / 2) };
        if (Math.abs(d.x) + Math.abs(d.y) <= 1) mascarados.add(`${cell.col},${cell.row}`);
      }
    }
  }

  const total = celulas.length;
  const linhas = bocaObj.altura / (TILE_H / 2);

  console.log(`  boca: ${bocaObj.largura}x${bocaObj.altura}px, ${linhas.toFixed(1)} linhas de fundo`);
  console.log(`  tiles de chao sob o desenho da boca: ${mascarados.size} de ${total} `
    + `(${(mascarados.size / total * 100).toFixed(0)}%)`);
  console.log(`  a entrada fica em col 0, linha do meio: e a borda do mapa, entao o que`);
  console.log(`  ela cobre para cima e para a direita e fundo, nao campo de jogo.`);
}
