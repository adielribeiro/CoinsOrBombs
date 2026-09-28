// Gera o fundo de caverna dos biomas novos: Galeria de Vento e Câmara de
// Cristal.
//
//   node scripts/generate-backdrops.mjs
//
// Os biomas existentes têm arte feita à mão. Estes são gerados com a mesma
// construção — parede de rocha ao redor, corredor de chão, vinheta — para que
// o bioma novo não pareça um retângulo liso ao lado dos outros.
//
// A construção é a mesma dos `cave_bg_*` existentes:
//
//   1. gradiente de fundo, do tom do bioma para quase preto no centro;
//   2. massa de parede: células grandes e irregulares, só nas bordas, como se
//      a cave fosse um recorte dentro de uma rocha muito maior;
//   3. chão: uma mancha irregular mais clara no meio, onde o jogador pisa;
//   4. fissuras e veio na parede, na cor do bioma;
//   5. vinheta forte nas bordas, para o menu e o HUD lerem em cima.
//
// O passo 2 é o que faz parecer caverna e não moldura. Uma parede desenhada
// como borda retangular lê como moldura de foto; a mesma parede com recorte
// irregular lê como buraco na rocha.
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const WIDTH = 1280;
const HEIGHT = 720;

/**
 * Arte de cada bioma.
 *
 * Os valores são ESCUROS de propósito. A primeira tentativa tinha parede clara
 * com junta branca e o resultado foi o oposto de caverna: um desenho de
 *organismo celular claro, com uma mancha cinza lisa no meio. Um fundo de
 * caverna é escuro na maior parte da tela, e a luz é uma exceção.
 */
const BIOME_ART = {
  wind: {
    // Céu ao longe, quase preto perto.
    distance: [64, 108, 118],
    nearBlack: [5, 9, 11],
    // Parede: rocha escura. Não há cor de junta — a junta é um vão escuro, e
    // a aresta ao lado é que pega a luz do bioma.
    wallDark: [16, 26, 30],
    wallLight: [40, 60, 66],
    floorDark: [30, 44, 48],
    floorLight: [58, 82, 86],
    vein: [140, 226, 240],
    windLines: 22
  },
  crystal: {
    distance: [78, 118, 140],
    nearBlack: [6, 8, 14],
    wallDark: [20, 24, 36],
    wallLight: [48, 58, 78],
    floorDark: [36, 44, 60],
    floorLight: [72, 90, 116],
    vein: [176, 244, 255],
    facets: true
  }
};

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t) {
  // O clamp é obrigatório, e não cosmético.
  //
  // A forma anterior era `1 - smoothstep(x)`, que devolve valores MUITO
  // negativos quando x é grande: com `x = edge / 0.09` e `edge` chegando a
  // 0,49, o resultado era -236. Multiplicado pelo peso da junta, o `mix()`
  // recebia um peso de -181 mil e saturava o canal em 255 — a parede saía
  // BRANCA, e o `Uint8ClampedArray` escondia o estouro.
  //
  // A parede ficava cinza 148 nos três canais, o oposto de rocha, e a causa
  // ficava a três linhas de distância do sintoma. Com o clamp, o resultado sai
  // em 0..1 e o `mix` pesa no máximo 1.
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v * v * (3 - 2 * v);
}

/** 1 no centro de uma junta, 0 longe dela. Sempre em 0..1. */
function juncao(edge, largura) {
  return 1 - smoothstep(edge / largura);
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const ux = smoothstep(x - x0);
  const uy = smoothstep(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
}

function fbm(x, y, seed, octaves, frequency) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let f = frequency;

  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * f, y * f, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    f *= 2.07;
  }

  return sum / total;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

/**
 * Distância de Woronói, usada para recortar a parede. O valor baixo é "dentro de
 * uma célula de rocha", e a borda entre células dá a junta natural do recorte.
 */
function woronoi(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  let nearest = Infinity;
  let second = Infinity;

  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const cx = x0 + i;
      const cy = y0 + j;
      const dx = cx + 0.12 + hash2(cx, cy, seed) * 0.76 - x;
      const dy = cy + 0.12 + hash2(cx, cy, seed + 7919) * 0.76 - y;
      const d = Math.hypot(dx, dy);

      if (d < nearest) { second = nearest; nearest = d; }
      else if (d < second) { second = d; }
    }
  }

  return { nearest, edge: second - nearest };
}

function render(art) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  const cx = WIDTH / 2;
  // O horizonte fica acima do centro: o jogador está de pé, olhando para o
  // fundo da caverna, e o chão ocupa a faixa de baixo.
  const cy = HEIGHT * 0.46;

  for (let py = 0; py < HEIGHT; py += 1) {
    for (let px = 0; px < WIDTH; px += 1) {
      const i = (py * WIDTH + px) * 4;
      const nx = (px - cx) / cx;
      const ny = (py - cy) / cy;

      // -------------------------------------------------- geometria
      //
      // A caverna é um corredor: as paredes vêm dos dois lados e o fundo
      // some no centro. A profundidade vem de `perspectiva`, que é a
      // distância horizontal normalizada — perto das bordas é parede próxima,
      // no centro é o fundo distante.
      const perspectiva = Math.abs(nx);

      // Ruído que quebra a simetria: parede perfeita lê como desenho técnico.
      // Ruído que quebra a simetria: parede perfeita lê como desenho técnico.
      // O peso é pequeno porque ele também define o recorte do corredor, e
      // com amplitude alta o corredor virava uma mancha de borda dupla.
      const warp = (fbm(nx * 2, ny * 2, 5, 4, 1.3) - 0.5) * 0.14;
      const larguraCorredor = 0.22 + fbm(nx * 1.4, ny * 1.4, 47, 3, 1.5) * 0.12;
      const dentro = perspectiva + warp < larguraCorredor;

      // O teto desce conforme a profundidade, para a parede fechar em cima.
      const teto = -0.55 + (fbm(nx * 2, ny * 2, 9, 3, 1.1) - 0.5) * 0.3;

      if (dentro) {
        // -------------------------------------------------- longe
        //
        // O fundo da caverna: a única região clara da imagem. É ela que dá
        // profundidade e diz para onde a galeria vai.
        const altura = smoothstep(1 - (ny - teto) / 1.6);
        const bruma = 1 - smoothstep((perspectiva / larguraCorredor) * 0.9);

        let r = mix(art.nearBlack[0], art.distance[0], bruma);
        let g = mix(art.nearBlack[1], art.distance[1], bruma);
        let b = mix(art.nearBlack[2], art.distance[2], bruma);

        // Granulação leve para o fundo não ser um campo chapado.
        const ruido = (fbm(nx * 6, ny * 6, 23, 3, 2.2) - 0.5) * 0.16;
        r = Math.max(0, r + ruido * 70 * bruma);
        g = Math.max(0, g + ruido * 70 * bruma);
        b = Math.max(0, b + ruido * 70 * bruma);

        r *= 0.55 + altura * 0.45;
        g *= 0.55 + altura * 0.45;
        b *= 0.55 + altura * 0.45;

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      } else {
        // -------------------------------------------------- parede
        //
        // Rocha escura. O Woronói dá as juntas entre blocos.
        const escala = 3.2;
        const bx = nx * escala + (fbm(nx * 3, ny * 3, 13, 3, 1.2) - 0.5) * 0.7;
        const by = ny * escala + (fbm(nx * 3, ny * 3, 17, 3, 1.2) - 0.5) * 0.7;
        const bloco = woronoi(bx, by, 31);

        // A junta tem DUAS partes, e essa distinção é o que separa rocha de
        // teia luminosa.
        //
        // A versão anterior misturava a junta inteira para uma cor mais clara
        // (`art.joint`), e o resultado foi uma malha branca desenhada sobre a
        // parede — cada fenda virava um traço de luz, e a caverna inteira
        // parecia vidro trincado em vez de pedra.
        //
        // Numa fenda de verdade, o miolo é escuro: é um vão, e não entra luz
        // nele. O que pega luz é a ARESTA ao lado, a superfície inclinada que
        // a luz de longe alcança. Então: núcleo escuro e largo, e um fio de
        // realce colado nele. É esse par que dá a leitura de bloco de pedra.
        const nucleo = 1 - smoothstep(bloco.edge / 0.055);
        const aresta = Math.max(0, (1 - smoothstep(bloco.edge / 0.16)) - nucleo);

        // Relevo do bloco: cada face da rocha com seu próprio tom.
        const relevo = fbm(bx, by, 41, 4, 2.6);
        let tom = 0.12 + relevo * 0.34;

        // Facetas do cristal: só neste bioma, polígonos duros e planos. Entra
        // como um desvio pequeno sobre o relevo, e não como metade do tom — a
        // primeira versão fazia `tom = tom * 0.55 + plano * 0.45`, e o
        // resultado era parede BRANCA, o oposto de rocha.
        if (art.facets) {
          const faceta = woronoi(bx * 1.7 + 3, by * 1.7 - 2, 77);
          const plano = 1 - smoothstep(faceta.edge / 0.05);
          tom = tom * 0.78 + plano * 0.22;
        }

        // A parede escurece com a altura: teto mais escuro que a base.
        const sobe = 1 - smoothstep((ny - teto) / 1.5);
        tom *= 1 - sobe * 0.5;

        let r = mix(art.wallDark[0], art.wallLight[0], tom);
        let g = mix(art.wallDark[1], art.wallLight[1], tom);
        let b = mix(art.wallDark[2], art.wallLight[2], tom);

        // Núcleo da junta: um vão escuro. Reduz os três canais na mesma
        // proporção, o que escurece sem puxar para a cor do bioma.
        const vao = nucleo * 0.55;
        r *= 1 - vao;
        g *= 1 - vao;
        b *= 1 - vao;

        // Aresta: o fio de luz colado no vão, e só ele na cor do bioma.
        //
        // O peso é baixo e o fio é quebrado por ruído. Com o fio forte e
        // contínuo, cada junta virava um contorno fechado, e a parede lia
        // como uma rede de células em vez de blocos de pedra. Aresta de rocha
        // é luz de raspão: aparece em um trecho e some no outro.
        const quebra = 0.35 + fbm(bx * 2.4, by * 2.4, 83, 3, 2.2) * 0.9;
        const fio = aresta * 0.17 * quebra;
        r = mix(r, art.vein[0], fio);
        g = mix(g, art.vein[1], fio);
        b = mix(b, art.vein[2], fio);

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      data[i + 3] = 255;
    }
  }

  // -------------------------------------------------- chão
  //
  // Faixa de baixo, em perspectiva: converge para o ponto de fuga. É o que
  // vende a profundidade melhor do que qualquer sombra.
  const linhaDoHorizonte = cy + HEIGHT * 0.1;
  for (let py = Math.max(0, Math.floor(linhaDoHorizonte)); py < HEIGHT; py += 1) {
    const t = (py - linhaDoHorizonte) / (HEIGHT - linhaDoHorizonte);
    const largura = 0.16 + t * 1.25;
    const cor = [
      mix(art.floorDark[0], art.floorLight[0], t * 0.85),
      mix(art.floorDark[1], art.floorLight[1], t * 0.85),
      mix(art.floorDark[2], art.floorLight[2], t * 0.85)
    ];

    for (let px = 0; px < WIDTH; px += 1) {
      const nx = (px - cx) / cx;
      if (Math.abs(nx) > largura) continue;

      // Textura de cascalho, em células que achatam com a distância.
      const escala = 2 + (1 - t) * 7;
      const bloco = woronoi(nx * escala, (py - linhaDoHorizonte) * escala * 0.42, 61);
      const junta = 1 - smoothstep(bloco.edge / 0.12);
      const granular = fbm(nx * 5, py * 0.014, 67, 3, 1.4);

      let k = 0.72 + granular * 0.5 - junta * 0.28;
      // Sombreado nas laterais: o chão escurece junto da parede.
      k *= 1 - Math.pow(Math.abs(nx) / largura, 3) * 0.5;

      const i = (py * WIDTH + px) * 4;
      data[i] = cor[0] * k;
      data[i + 1] = cor[1] * k;
      data[i + 2] = cor[2] * k;
    }
  }

  // -------------------------------------------------- assinatura do bioma
  //
  // Correntes de ar cruzando a galeria. Só a Galeria de Vento tem.
  if (art.windLines) {
    for (let linha = 0; linha < art.windLines; linha += 1) {
      const y0 = cy + (hash2(linha, 3, 91) - 0.35) * HEIGHT * 0.8;
      const comprimento = WIDTH * (0.3 + hash2(linha, 7, 93) * 0.55);
      const x0 = hash2(linha, 11, 95) * WIDTH - comprimento * 0.4;
      const espessura = 1 + Math.floor(hash2(linha, 13, 97) * 3);
      const intensidade = 0.04 + hash2(linha, 17, 99) * 0.08;
      const curva = (hash2(linha, 19, 101) - 0.5) * 70;

      for (let s = 0; s < comprimento; s += 1) {
        const x = Math.round(x0 + s);
        if (x < 0 || x >= WIDTH) continue;
        const y = Math.round(y0 + Math.sin((s / comprimento) * Math.PI) * curva);
        if (y < 0 || y >= HEIGHT) continue;

        for (let e = 0; e < espessura; e += 1) {
          const i = ((y + e) * WIDTH + x) * 4;
          data[i] = mix(data[i], art.vein[0], intensidade);
          data[i + 1] = mix(data[i + 1], art.vein[1], intensidade);
          data[i + 2] = mix(data[i + 2], art.vein[2], intensidade);
        }
      }
    }
  }

  // -------------------------------------------------- vinheta
  //
  // O menu e o HUD precisam de contraste, e a vinheta é o que separa a UI da
  // arte. Escura, e mais forte embaixo, que é onde fica a cauda do menu.
  for (let py = 0; py < HEIGHT; py += 1) {
    for (let px = 0; px < WIDTH; px += 1) {
      const nx = Math.abs((px - cx) / cx);
      const ny = Math.abs((py - cy) / cy);
      const vinheta = Math.min(1, Math.pow(Math.max(nx, ny * 1.1), 3.2));
      if (vinheta <= 0.002) continue;

      const i = (py * WIDTH + px) * 4;
      const k = 1 - vinheta * 0.72;
      data[i] *= k;
      data[i + 1] *= k;
      data[i + 2] *= k;
    }
  }

  return data;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const start = y * (stride + 1);
    raw[start] = 1;
    for (let x = 0; x < stride; x += 1) {
      const current = rgba[y * stride + x];
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
      raw[start + 1 + x] = (current - left) & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const [biomeId, art] of Object.entries(BIOME_ART)) {
  const data = render(art);
  const png = encodePng(WIDTH, HEIGHT, data);
  await writeFile(`public/assets/cave_bg_${biomeId}.png`, png);

  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const n = data.length / 4;

  console.log(
    `cave_bg_${biomeId}.png  ${WIDTH}x${HEIGHT}  ${(png.length / 1024).toFixed(0)} KB  `
      + `cor media rgb(${(r / n).toFixed(0)},${(g / n).toFixed(0)},${(b / n).toFixed(0)})`
  );
}
