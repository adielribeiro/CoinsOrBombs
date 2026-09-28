// Gera o fundo de caverna dos biomas sem arte pintada: Galeria de Vento e
// Câmara de Cristal.
//
//   node scripts/generate-backdrops.mjs            // recusa, e explica por quê
//   node scripts/generate-backdrops.mjs --force    // gera por cima
//
// O que este script é agora
// -------------------------
// ARTE PINTAADA. Os `cave_bg_wind.png` e `cave_bg_crystal.png` do repositório
// foram feitos à mão, e este script NÃO os regenera: por padrão ele recusa
// escrever, para não apagar duas peças que não dá para reconstituir.
//
// Ele continua aqui por dois motivos. O primeiro é histórico e concreto: foi
// ele que mediu o que dá errado. A parede que saía branca por falta de clamp
// no `smoothstep`, o chão que nunca aparecia porque `pesoChao` estava
// invertido, o moiré do chão que vinha da escala variar a cada linha, a cúpula de
// neve que vinha de `chao[px]` repetindo a perspectiva que `ombro` já fazia —
// tudo isso está descrito nos comentários daqui, com o sintoma de cada um.
//
// O segundo é que a construção establisheda aqui é a que a arte pintada segue,
// e ela está escrita em código: moldura de rocha, boca ao fundo, estalactites
// no teto, poça de luz no chão, bruma de profundidade.
//
// O que este script nunca foi
// ---------------------------
// Pincelada. A primeira versão produzia algo que lia como geometria, e a
// segunda como mosaico. A arte que está no jogo é melhor que isso, e por isso
// foi feita fora daqui.
//
// A construção original, que o script ainda reproduz:
//
//   1. Moldura de rocha escura em volta: teto, parede esquerda, parede direita.
//   2. Abertura clara no fundo, alta e irregular, que é a única fonte de luz.
//   3. Estalactites penduradas no teto, entrando dentro da abertura. Estão em
//      todas as quatro e são o que mais faz ler "caverna" em vez de "buraco".
//   4. Chão que sobe do quadro inteiro para dentro, com bruma de profundidade.
//   5. Poça de luz no chão, jogada a partir da abertura.
//   6. Ombros de rocha escura na borda inferior, em silhueta contra a luz.
//   7. Poeira no ar, e vinheta.
//
// A ordem importa: a bruma vem ANTES das rochas. Neblina que ficasse por cima
// da parede clarearia a moldura e a caverna deixaria de ter profundidade.
//
// O elemento por bioma entra no fim, e é o que separa um do outro:
// a Vento tem correntes de ar e neblina baixa; o Cristal tem cristais que
// devolvem luz em várias cores.
import { writeFile, access } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const WIDTH = 1280;
const HEIGHT = 720;

/**
 * Arte de cada bioma.
 *
 * Os valores de rocha são ESCUROS de propósito. Duas tentativas anteriores
 * deram parede clara: a primeira pintou a junta inteira para uma cor mais clara
 * e o resultado foi uma teia luminosa; a segunda, antes do clamp do
 * `smoothstep`, saturou os canais e a parede saiu cinza 148 nos três.
 */
const BIOME_ART = {
  wind: {
    // Abertura do fundo: céu pálido visto de dentro da galeria. É a imagem mais
    // clara do arquivo, como nas outras quatro, e o que dá o sentido de saída.
    distance: [148, 190, 206],
    haze: [96, 140, 156],

    // Rocha: azul-acinzentada fria, e mais lisa que a do Cristal. O vento
    // O vento poliu a pedra.
    wallDark: [17, 26, 32],
    wallLight: [52, 68, 80],

    // Chão: escuro. Nas referências o piso é pedra na sombra com uma poça de
    // luz no eixo — não um campo claro. A primeira versão tinha `floorLight`
    // quase branco e o chão virava uma cúpula de neve.
    floorDark: [26, 38, 46],
    floorLight: [104, 132, 146],

    // Cor da luz que vem da abertura e da poça no chão.
    glow: [206, 238, 250],
    // Cor de acento nas arestas da rocha.
    accent: [150, 214, 232],

    // Correntes de ar cruzando a galeria. Contidas: a primeira versão usava
    // 0,075 e as linhas viravam riscos atravessando a pedra, o que denunciava
    // o traço retilíneo mais do que denunciava o vento.
    wind: { lines: 26, strength: 0.03 },
    // Névoa baixa, rente ao chão: o que mais diz "ar em movimento".
    mist: { bands: 7, strength: 0.1 }
  },

  crystal: {
    // A Câmara é a última, então a abertura é a mais luminosa das duas — mas
    // ainda mais escura que a do Vento, porque a rocha engole mais.
    distance: [126, 168, 196],
    haze: [74, 104, 140],

    wallDark: [19, 24, 38],
    wallLight: [58, 70, 96],

    floorDark: [40, 50, 70],
    floorLight: [110, 136, 172],

    glow: [222, 244, 255],

    // A assinatura do bioma é a PRISMA. Uma cor só seria mais uma caverna
    // azul, igual à Gruta de Gelo. Vários matizes saindo de pontos diferentes é
    // o que diz "cristal" em vez de "gelo".
    prismatic: true,
    // Número de PRISMAS visíveis. Eles são agrupados em cachos, então este
    // número é por cristal, não por grupo.
    crystals: 18
  }
};

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t) {
  // O clamp é obrigatório, e não cosmético. A forma `1 - smoothstep(x)` devolve
  // valores muito negativos quando x é grande, e um `mix` com peso enorme
  // satura o canal: foi assim que a parede saiu branca uma vez.
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v * v * (3 - 2 * v);
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

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Distância de Woronói, para a rocha.
 *
 * `edge` pequeno é perto da junta entre dois blocos, que é onde a aresta
 * aparece. `edge` grande é no meio de uma face, que é chapada.
 */
function woronoi(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  let nearest = Infinity;
  let second = Infinity;
  let nearestX = 0;
  let nearestY = 0;

  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const cx = x0 + i;
      const cy = y0 + j;
      const dx = cx + 0.12 + hash2(cx, cy, seed) * 0.76 - x;
      const dy = cy + 0.12 + hash2(cx, cy, seed + 7919) * 0.76 - y;
      const d = Math.hypot(dx, dy);

      if (d < nearest) {
        second = nearest;
        nearest = d;
        nearestX = cx;
        nearestY = cy;
      } else if (d < second) {
        second = d;
      }
    }
  }

  return { nearest, edge: second - nearest, cx: nearestX, cy: nearestY };
}

/** Hash da célula do Woronói: dá um tom chapado por bloco de rocha. */
function cellTone(cx, cy, seed) {
  return hash2(cx * 7 + 13, cy * 11 + 29, seed + 97);
}

const CX = WIDTH / 2;
// O horizonte fica acima do centro: o jogador está de pé olhando para o fundo
// da caverna, e o chão ocupa a faixa de baixo.
const HORIZON = HEIGHT * 0.42;

/**
 * A silhueta da passagem, como mapas 1D.
 *
 * A primeira versão usava meia-largura por linha, e o resultado foi um
 * TRIÂNGULO de borda reta: lia como figura geométrica, não como caverna. O
 * problema não era falta de detalhe, era a FORMA — e forma reta denuncia antes
 * de textura.
 *
 * São três mapas, e cada um cuida de uma borda:
 *
 *   `topo`    por coluna. Borda de baixo do teto. Acima dela é rocha.
 *   `ombro`   por linha.   Quão larga é a passagem nesta altura. Fora dela é
 *                          rocha: é o que fecha os lados e faz os ombros
 *                          descenderem, em vez de um degrau reto.
 *   `chao`    por coluna.   Borda de cima do caminho. Abaixo dela é o chão.
 *
 * Teto e ombros são rocha; o que está dentro dos dois é a passagem, e o chão é
 * a parte de baixo dela. A polaridade importa: uma versão anterior tratava o
 * que estava abaixo da linha de ombros como rocha, e o resultado foi um chão
 * de pedra com uma bacia de luz no meio — o inverso do que existe nas quatro
 * referências.
 */
function buildPassage(seed) {
  const topo = new Float32Array(WIDTH);
  const chao = new Float32Array(WIDTH);
  const ombro = new Float32Array(HEIGHT);

  for (let px = 0; px < WIDTH; px += 1) {
    const absU = Math.min(1, Math.abs((px - CX) / CX));

    // Teto: arco alto no meio, descendo para as paredes.
    const arco = HORIZON - (HORIZON * 0.62) * Math.pow(1 - absU * 1.02, 0.7);
    // Serra de baixa frequência: a borda da boca não é arco, é quebrada.
    const serra = (fbm(px * 0.0038, 0, seed, 4, 1.2) - 0.5) * HEIGHT * 0.14;
    // Quebradura pequena, em escala de pedra.
    const quebrado = (fbm(px * 0.021, 5, seed + 3, 3, 1.4) - 0.5) * HEIGHT * 0.045;
    topo[px] = arco + serra + quebrado;

    // Chão: a linha do fundo do caminho, praticamente no horizonte.
    //
    // Ela é quase RETA de propósito, e essa é a correção de uma versão
    // anterior que a fazia subir para as laterais. A perspectiva do caminho já
    // está em `ombro`; repetir a abertura aqui desenhava o chão como uma CÚPULA
    // de neve no meio do quadro, em vez de um piso que corre para dentro.
    chao[px] = HORIZON + HEIGHT * 0.02
      + (fbm(px * 0.009, 9, seed + 7, 4, 1.3) - 0.5) * HEIGHT * 0.035;
  }

  // Ombros: a passagem é estreita no fundo e abre até quase a largura do
  // quadro no rodapé. É a perspectiva do corredor, e é o que faz o caminho
  // "correr" para dentro.
  for (let py = 0; py < HEIGHT; py += 1) {
    const v = (py - HORIZON) / (HEIGHT - HORIZON);
    // Abaixo do horizonte abre; acima, fecha num arco.
    let meia;
    if (v >= 0) {
      meia = 0.34 + (1.24 - 0.34) * Math.pow(clamp(v, 0, 1), 0.8);
    } else {
      meia = 0.34 * (1 - 0.5 * smoothstep(clamp(-v, 0, 1)));
    }

    // Irregularidade: ombro de rocha não é rampa. Duas frequências, porque
    // blocos grandes com dentes pequenos leem como entulho empilhado.
    const grande = (fbm(py * 0.004, 21, seed + 11, 3, 1.2) - 0.5) * 0.2;
    const miudeza = (fbm(py * 0.026, 31, seed + 13, 2, 1.5) - 0.5) * 0.06;
    ombro[py] = Math.max(0.08, meia * (1 + grande) + miudeza * v);
  }

  // Estalactites. Estão nas quatro referências e são o elemento que mais
  // separa "caverna" de "túnel liso". Variam de 2% a 24% da altura, e as
  // maiores ficam onde o teto é mais alto, porque é lá que pendem de verdade.
  const count = 52;

  for (let s = 0; s < count; s += 1) {
    const t = (s + hash2(s, 1, seed) * 0.85) / count;
    const px = Math.round(t * WIDTH);
    const u = Math.abs((px - CX) / CX);
    const span = Math.round(9 + hash2(s, 2, seed) * 28 * (1 - u * 0.5));
    const alturaDoTeto = clamp((HORIZON - topo[px]) / HORIZON, 0, 1);
    const comprimento = HEIGHT * (0.02 + hash2(s, 3, seed) ** 2.4 * 0.26 * alturaDoTeto);

    if (comprimento < 3) continue;

    for (let d = -span; d <= span; d += 1) {
      const x = px + d;
      if (x < 0 || x >= WIDTH) continue;
      const k = 1 - Math.abs(d) / (span + 0.001);
      // Cone com a ponta arredondada. Um cone reto é dente de serra.
      const ponta = Math.pow(k, 0.6) * comprimento;
      const arredonda = ponta * (0.8 + 0.2 * Math.cos((d / (span + 0.001)) * 1.35));
      topo[x] += arredonda;
    }
  }

  return { topo, chao, ombro };
}

/**
 * Cristais emissivos, para a Câmara de Cristal.
 *
 * Cada um é um ponto que devolve luz, com cor própria. Vários matizes
 * matizes saindo de pontos diferentes é o que separa o Cristal do Gelo: com uma
 * cor só,
 * a Câmara seria a Gruta de Gelo mais escura.
 */
/**
 * Cristais, em CACHOS.
 *
 * A primeira versão espalhou cristais isolados, e o resultado foi confete
 * neon: dezenas de prismas pequenos e soltos, que pareciam cacos de vidro
 * caindo em vez de mineral crescendo na pedra. Cristal de verdade nasce em grupo,
 * com um corpo grande e outros menores em volta, todos na mesma base.
 *
 * Cada item é um PRISMA, e a lista já vem achatada a partir dos cachos.
 */
function buildCrystals(art, seed) {
  if (!art.crystals) return [];

  const cores = [
    [255, 214, 120], // âmbar
    [150, 236, 255], // ciano
    [226, 158, 255], // violeta
    [168, 255, 206], // verde
    [255, 176, 196]  // rosa
  ];

  const cachos = Math.round(art.crystals / 3);
  const saida = [];

  for (let c = 0; c < cachos; c += 1) {
    const h1 = hash2(c, 11, seed);
    const h2 = hash2(c, 23, seed);
    const h3 = hash2(c, 31, seed);

    // Na moldura, nunca no meio da passagem: um cristal no centro taparia a
    // boca, que é o elemento mais valioso da cena.
    const lado = h1 < 0.5 ? -1 : 1;
    const u = lado * (0.5 + h2 * 0.55);
    const bx = clamp(CX + u * CX, 70, WIDTH - 70);
    // A base do cacho. Mais baixo dá mais espaço para o cristal crescer.
    const by = clamp(HORIZON + HEIGHT * (0.16 + h3 * 0.68), HORIZON, HEIGHT - 20);

    // Os cristais da parede crescem para dentro e para cima; os do chão, para
    // cima. A distinção é o que impede todos apontarem para a mesma direção.
    const naParede = by < HORIZON + HEIGHT * 0.2;
    const angBase = naParede ? (lado > 0 ? Math.PI : 0) : -Math.PI / 2;
    const corBase = cores[c % cores.length];

    // O corpo maior primeiro, e os menores em leque em volta dele.
    const quantos = 2 + Math.floor(hash2(c, 37, seed) * 3);

    for (let j = 0; j < quantos; j += 1) {
      const j1 = hash2(c * 10 + j, 41, seed);
      const j2 = hash2(c * 10 + j, 43, seed);
      const j3 = hash2(c * 10 + j, 47, seed);

      // O primeiro é o grande; os seguintes são menores e mais abertos.
      const principal = j === 0;
      const escala = principal ? 1 : 0.42 + j2 * 0.4;
      // Dispersão da base: um pouco para fora do centro do cacho.
      const espalhamento = principal ? 0 : 12 + j1 * 30;
      const dirBase = j1 * Math.PI * 2;
      const bx2 = bx + Math.cos(dirBase) * espalhamento;
      const by2 = by + Math.sin(dirBase) * espalhamento * 0.5;

      saida.push({
        x: bx2,
        y: by2,
        // Leque: o ângulo abre a partir da direção base, e o principal é o
        // mais reto. Cristal perfeitamente paralelo parece cerca.
        ang: angBase + (principal ? (j3 - 0.5) * 0.3 : (j1 - 0.5) * 1.15),
        comprimento: (58 + j3 * 96) * escala,
        raio: (13 + j2 * 16) * escala,
        cor: corBase,
        brilho: (principal ? 0.85 : 0.5) + j3 * 0.15,
        derrame: (110 + j2 * 120) * (principal ? 1.3 : 0.7)
      });
    }
  }

  return saida;
}

function render(art, seed) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const { topo, chao, ombro } = buildPassage(seed);
  const crystals = buildCrystals(art, seed);

  // A fonte de luz: a boca, logo acima do horizonte.
  const lightY = HORIZON - HEIGHT * 0.13;
  const sigmaLuz = HEIGHT * 0.19;

  for (let py = 0; py < HEIGHT; py += 1) {
    for (let px = 0; px < WIDTH; px += 1) {
      const i = (py * WIDTH + px) * 4;
      const u = (px - CX) / CX;
      const absU = Math.abs(u);

      const yTopo = topo[px];
      const yChao = chao[px];
      const meia = ombro[py];

      // ------------------------------------------------- luz
      //
      // Calculada primeiro porque é ela que ilumina rocha, chão e ar ao mesmo
      // tempo. Sem uma fonte única, cada camada se ilumina por conta própria e
      // o resultado lê como colagem.
      const dLuz = Math.hypot(px - CX, (py - lightY) * 0.85);
      const brilho = Math.exp(-(dLuz * dLuz) / (2 * sigmaLuz * sigmaLuz));

      // Distância até a borda da passagem, em pixels. Serve para iluminar o
      // chanfro e escurecer o fundo da moldura.
      const distBorda = Math.min(
        Math.abs(py - yTopo),
        Math.abs(py - yChao),
        (absU < meia ? meia - absU : 0) * CX
      );

      let r;
      let g;
      let b;

      const ehTeto = py < yTopo;
      const ehOmbro = absU > meia;

      if (ehTeto || ehOmbro) {
        // =================================================== ROCHA
        //
        // Teto, parede ou ombro. A rocha é a moldura: escura e facetada.
        //
        // A rocha é montada em DUAS escalas, e é isso que evita o mosaico.
        //
        // Com uma escala só, o Woronói ladrilha o quadro inteiro e a parede lê
        // como crazy paving: uma rede de peças do mesmo tamanho. Numa caverna
        // há massas grandes de sombra e, dentro delas, pedra quebrada. Então:
        // uma variação ampla de valor por região, e o bloco só por cima.
        const massa = fbm(u * 1.5, py * 0.0022, seed + 3, 4, 1.1);

        const escala = 9;
        const warp = (fbm(u * 3, py * 0.005, seed + 5, 3, 1.2) - 0.5) * 0.9;
        const bx = u * escala + warp;
        const by = py * 0.016 + warp;
        const bloco = woronoi(bx, by, seed + 31);

        // Núcleo da junta: um vão escuro e estreito. Não entra luz num vão, e
        // uma junta larga vira rejunte de azulejo.
        const nucleo = 1 - smoothstep(bloco.edge / 0.028);
        // Aresta: a superfície inclinada ao lado do vão, que é a que pega luz.
        const aresta = Math.max(0, (1 - smoothstep(bloco.edge / 0.11)) - nucleo);

        // Gradação dentro da face, para não ser cor chapada.
        const gradiente = 0.72 + 0.28 * fbm(bx * 0.9, by * 0.9, seed + 41, 3, 2.2);
        let tom = (0.1 + cellTone(bloco.cx, bloco.cy, seed) * 0.34) * gradiente;
        // A massa ampla é dominante: ela é a que quebra o ladrilho.
        tom *= 0.45 + massa * 0.95;

        // Chanfro: quanto mais perto da boca, mais a rocha é vista de frente e
        // mais clara. É o gradiente que dá a volta da moldura.
        const chanfro = 1 - smoothstep(distBorda / (HEIGHT * 0.2));
        tom += chanfro * 0.22;
        // Teto é mais escuro que o chão: a luz vem de baixo e de frente.
        if (ehTeto) tom *= 1 - clamp((yTopo - py) / (HEIGHT * 0.5), 0, 1) * 0.6;

        r = mix(art.wallDark[0], art.wallLight[0], tom);
        g = mix(art.wallDark[1], art.wallLight[1], tom);
        b = mix(art.wallDark[2], art.wallLight[2], tom);

        const vao = nucleo * 0.42;
        r *= 1 - vao;
        g *= 1 - vao;
        b *= 1 - vao;

        // Aresta: fio de luz quebrado por ruído. Com o fio forte e contínuo a
        // parede lia como uma rede de células fechadas.
        const quebra = 0.1 + fbm(bx * 1.1, by * 1.1, seed + 83, 3, 2.1) * 0.7;
        const fio = aresta * 0.1 * quebra;
        const ac = art.accent ?? art.wallLight;
        r = mix(r, ac[0], fio);
        g = mix(g, ac[1], fio);
        b = mix(b, ac[2], fio);

        // Banho da boca. Forte no chanfro, quase zero no fundo da moldura.
        const banho = brilho * (0.12 + chanfro * 0.26);
        r += art.glow[0] * banho;
        g += art.glow[1] * banho;
        b += art.glow[2] * banho;
      } else {
        // =================================================== PASSAGEM
        //
        // Boca em cima, caminho em baixo. Longe da luz é claro e lavado; perto
        // é escuro. É a bruma de profundidade, e é ela que dá fundo à caverna.
        //
        // A profundidade é a distância até a borda do CHÃO: quanto mais longe
        // da borda, mais fundo está o ponto na passagem.
        const acimaDoChao = clamp((yChao - py) / (HEIGHT * 0.26), 0, 1);

        // A bruma é forte longe e some perto. Sem esta queda, o chão nunca
        // aparece, porque o branco da boca cobre tudo até a borda.
        const bruma = Math.pow(acimaDoChao, 0.75) * (0.3 + brilho * 0.7);

        r = mix(art.haze[0], art.distance[0], bruma);
        g = mix(art.haze[1], art.distance[1], bruma);
        b = mix(art.haze[2], art.distance[2], bruma);

        // Granulação, para a boca não ser um campo chapado.
        const ruido = (fbm(u * 5, py * 0.006, seed + 23, 3, 2.1) - 0.5) * 0.15;
        r += ruido * 90 * bruma;
        g += ruido * 90 * bruma;
        b += ruido * 90 * bruma;

        // ------------------------------------------------- chão
        //
        // O peso CRESCE com `py`: vale 0 longe acima da linha do chão e 1
        // abaixo dela. A primeira versão fazia o oposto, `1 - smoothstep(...)`,
        // e o resultado foi o chão nunca aparecer: a partir da linha o peso já
        // era zero, e o que ocupava o rodapé do quadro era o campo de bruma
        // chapado. Um chão faltando não se parece com chão ruim; parece com
        // neblina.
        const banda = HEIGHT * 0.12;
        const pesoChao = smoothstep((py - (yChao - banda)) / banda);

        if (pesoChao > 0.002) {
          // -------------------------------------------------- perspectiva
          //
          // O chão é texturizado em COORDENADAS DE MUNDO, e não em coordenadas
          // de tela com uma escala que varia por linha.
          //
          // A versão de tela usava `escala = 3 + (1 - perto) * 13`, e como a
          // escala mudava a cada linha a malha se arrastava: o resultado eram
          // arcos concêntricos no rodapé, que pareciam ondulação de água. A
          // escala por linha é a causa de quase todo moiré em perspectiva.
          //
          // A profundidade real de um plano visto de baixo é `1 / y`, então é
          // isso que vai no lugar da escala. Monotônica e suave, sem arrasto.
          const dy = py - yChao;
          const perto = clamp(dy / Math.max(HEIGHT - yChao, 1), 0, 1);

          // Nitidez: a textura do chão DESPARECE na bruma do fundo.
          //
          // Não é sócorreção estética. Perto de `dy = 0` a profundidade
          // `1 / dy` explode, a coordenada de mundo da malha quase não muda de
          // uma linha para a seguinte, e as células achatam em listras
          // horizontais. O sintoma era um risco hatching rente ao horizonte.
          // Dissolver a textura na mesma faixa em que a bruma cobre resolve os
          // dois de uma vez, porque é o que a distância realmente faz.
          const nitidez = smoothstep(dy / (HEIGHT * 0.14));

          const prof = 1 / (dy + 26);
          const jitter = (fbm(u * 9, dy * 0.05, seed + 77, 2, 1.6) - 0.5) * 0.4;
          const blocoC = woronoi(u * prof * 26 + jitter, prof * 7 + jitter, seed + 67);
          const juntaC = (1 - smoothstep(blocoC.edge / 0.16)) * nitidez;
          const granular = fbm(u * 5, py * 0.013, seed + 71, 3, 1.4);

          // A poça de luz: o chão é mais claro no eixo da boca e escurece para
          // os lados. Está nas quatro referências e é o que dá o eixo de leitura
          // da cena — sem ela o chão é uma chapa de cor só.
          const eixo = 1 - Math.pow(clamp(absU / Math.max(meia, 0.001), 0, 1), 1.7);
          // A poça é ALONGADA no eixo do corredor: a luz vem de longe, então
          // ela deita no chão em vez de formar um círculo.
          const poco = Math.exp(
            -((u * u) / (0.06 + perto * 0.55)
              + Math.pow(dy / (HEIGHT * (0.55 + perto * 0.5)), 2) * 0.4)
          ) * 0.85;

          let k = 0.7 + (granular - 0.5) * 0.55 * nitidez - juntaC * 0.22;
          // Lateral escurece: o chão perde luz junto da parede.
          k *= 1 - Math.pow(clamp(absU / Math.max(meia, 0.001), 0, 1), 2.2) * 0.7;

          const t = perto * 0.5 + poco * 0.8;
          const cor = [
            mix(art.floorDark[0], art.floorLight[0], t),
            mix(art.floorDark[1], art.floorLight[1], t),
            mix(art.floorDark[2], art.floorLight[2], t)
          ];

          r = mix(r, cor[0] * k, pesoChao);
          g = mix(g, cor[1] * k, pesoChao);
          b = mix(b, cor[2] * k, pesoChao);
        }

        // Halo em volta da boca. Contido de propósito: o raio curto e o peso
        // baixo são o que impedem a cena de virar uma bacia de luz.
        r += art.glow[0] * brilho * 0.3;
        g += art.glow[1] * brilho * 0.3;
        b += art.glow[2] * brilho * 0.3;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  // ------------------------------------------------- elementos do bioma
  //
  // Depois do base, porque são aditivos e porque o teto já está fechado: um
  // cristal é uma coisa que existe DENTRO da passagem, não na parede.

  if (art.wind) desenhaCorrentesDeAr(data, art, seed);
  if (art.mist) desenhaNevoaBaixa(data, art, seed);
  if (art.crystals) desenhaCristais(data, crystals, seed);

  // ------------------------------------------------- poeira no ar
  poeiraNoAr(data, art, seed);

  // ------------------------------------------------- vinheta
  for (let py = 0; py < HEIGHT; py += 1) {
    for (let px = 0; px < WIDTH; px += 1) {
      const u = Math.abs((px - CX) / CX);
      const w = Math.abs((py - HEIGHT * 0.5) / (HEIGHT * 0.5));
      const vinheta = Math.min(1, Math.pow(Math.max(u * 0.92, w), 3.1));
      if (vinheta <= 0.002) continue;

      const i = (py * WIDTH + px) * 4;
      const k = 1 - vinheta * 0.78;
      data[i] *= k;
      data[i + 1] *= k;
      data[i + 2] *= k;
    }
  }

  return data;
}

/** Correntes de ar: a assinatura da Galeria de Vento. */
function desenhaCorrentesDeAr(data, art, seed) {
  const { lines, strength } = art.wind;

  for (let l = 0; l < lines; l += 1) {
    const y0 = HORIZON + (hash2(l, 3, seed) - 0.4) * HEIGHT * 0.85;
    const comprimento = WIDTH * (0.25 + hash2(l, 7, seed) * 0.6);
    const x0 = hash2(l, 11, seed) * WIDTH - comprimento * 0.35;
    const espessura = 1 + Math.floor(hash2(l, 13, seed) * 3);
    const intensidade = strength * (0.5 + hash2(l, 17, seed));
    // Ondulação: uma reta parece risco, não ar.
    const curva = (hash2(l, 19, seed) - 0.5) * 110;
    const fase = hash2(l, 23, seed) * 6.28;

    for (let s = 0; s < comprimento; s += 1) {
      const x = Math.round(x0 + s);
      if (x < 0 || x >= WIDTH) continue;
      const t = s / comprimento;
      const y = Math.round(y0 + Math.sin(t * 3.4 + fase) * curva);
      if (y < 0 || y >= HEIGHT) continue;

      // Aparece e some: uma corrente contínua é uma régua.
      const envelope = Math.sin(t * Math.PI) ** 0.6;

      for (let e = 0; e < espessura; e += 1) {
        const i = ((y + e) * WIDTH + x) * 4;
        const k = intensidade * envelope;
        data[i] = mix(data[i], art.glow[0], k);
        data[i + 1] = mix(data[i + 1], art.glow[1], k);
        data[i + 2] = mix(data[i + 2], art.glow[2], k);
      }
    }
  }
}

/** Névoa rente ao chão: o que mais diz que o ar está em movimento. */
function desenhaNevoaBaixa(data, art, seed) {
  for (let b = 0; b < art.mist.bands; b += 1) {
    const y0 = HORIZON + HEIGHT * (0.12 + hash2(b, 5, seed) * 0.62);
    const altura = HEIGHT * (0.05 + hash2(b, 9, seed) * 0.12);
    const x0 = hash2(b, 15, seed) * WIDTH * 0.5;
    const largura = WIDTH * (0.5 + hash2(b, 21, seed) * 0.6);

    for (let py = Math.max(0, Math.floor(y0)); py < Math.min(HEIGHT, y0 + altura); py += 1) {
      // Mesmo clamp do envelope horizontal, pelo mesmo motivo: `k` passa de 1
      // por arredondamento na última linha e envenena o pixel.
      const k = clamp((py - y0) / altura, 0, 1);
      // Perfil: mais grosso no meio da banda, fino nas pontas.
      const perfil = Math.pow(Math.max(0, Math.sin(k * Math.PI)), 1.3);
      const intensidade = art.mist.strength * perfil;

      for (let px = Math.max(0, Math.floor(x0)); px < Math.min(WIDTH, x0 + largura); px += 1) {
        // O clamp não é cosmético. `sin` de um `t` pouco acima de 1 é
        // negativo, e negativo elevado a fração dá `NaN`, que o `mix` passa
        // direto para o pixel. O sintoma era uma moldura de linhas pretas
        // retas no chão — a forma geométrica do retângulo da faixa, com o
        // interior envenenado.
        const t = clamp((px - x0) / largura, 0, 1);
        const env = Math.sqrt(Math.max(0, Math.sin(t * Math.PI)));
        // Ondulação horizontal, para a faixa não ser uma barra reta.
        const onda = 0.6 + 0.4 * fbm(px * 0.004, py * 0.02, seed + b, 3, 1.5);
        const peso = intensidade * env * onda;
        if (peso <= 0.002) continue;

        const i = (py * WIDTH + px) * 4;
        data[i] = mix(data[i], art.glow[0], peso);
        data[i + 1] = mix(data[i + 1], art.glow[1], peso);
        data[i + 2] = mix(data[i + 2], art.glow[2], peso);
      }
    }
  }
}

/**
 * Cristais emissivos, em duas passagens.
 *
 * A primeira versão era só um brilho radial, e o resultado foram manchas de
 * bokeh: pontos coloridos borrados, que não dizem "cristal", dizem "lente
 * suja". Cristal é uma FORMA — prisma alongado, com aresta viva e miolo
 * escuro. Por isso são prismas desenhados, e não um campo de luz.
 *
 * Passagem 1, o derrame: a luz que o cristal joga na pedra ao redor. É o que
 * coloca o cristal NA cena, e sem ele o prisma parece colado por cima.
 * Passagem 2, o corpo: o prisma em si, com a aresta acesa e o miolo escuro.
 */
function desenhaCristais(data, crystals, seed) {
  // -------------------------------------------------- 1. derrame na pedra
  for (let c = 0; c < crystals.length; c += 1) {
    const { x, y, cor, brilho, derrame } = crystals[c];

    for (let py = Math.max(0, (y - derrame * 1.6) | 0); py < Math.min(HEIGHT, y + derrame * 1.6); py += 1) {
      for (let px = Math.max(0, (x - derrame * 1.6) | 0); px < Math.min(WIDTH, x + derrame * 1.6); px += 1) {
        const d = Math.hypot(px - x, (py - y) * 0.9);
        if (d > derrame) continue;
        const peso = Math.pow(1 - d / derrame, 3) * brilho * 0.34;
        if (peso <= 0.003) continue;

        const i = (py * WIDTH + px) * 4;
        data[i] = Math.min(255, data[i] + cor[0] * peso);
        data[i + 1] = Math.min(255, data[i + 1] + cor[1] * peso);
        data[i + 2] = Math.min(255, data[i + 2] + cor[2] * peso);
      }
    }
  }

  // -------------------------------------------------- 2. corpo do prisma
  for (let c = 0; c < crystals.length; c += 1) {
    const { x, y, ang, comprimento: L, raio: R, cor, brilho } = crystals[c];

    const ax = Math.cos(ang);
    const ay = Math.sin(ang);
    const pxv = -ay;
    const pyv = ax;

    // Caixa envolvente, para não varrer o quadro inteiro por cristal.
    const raioCaixa = Math.max(L, R) + 2;
    const x0 = Math.max(0, (x - raioCaixa) | 0);
    const x1 = Math.min(WIDTH, Math.ceil(x + raioCaixa));
    const y0 = Math.max(0, (y - raioCaixa) | 0);
    const y1 = Math.min(HEIGHT, Math.ceil(y + raioCaixa));

    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        const dx = px - x;
        const dy = py - y;
        const along = dx * ax + dy * ay;
        if (along < -2 || along > L) continue;

        const perp = dx * pxv + dy * pyv;
        // Perf hexagonal: o cristal tem faces, e a face reta é o que dá a
        // aresta dura. Um losango arredondado parece vela.
        const t = clamp(along / L, 0, 1);
        const largura = R * (1 - t * t * 0.92);
        const rel = Math.abs(perp) / Math.max(largura, 0.001);
        if (rel > 1) continue;

        const i = (py * WIDTH + px) * 4;

        // Aresta viva: o brilho corre pela borda da face, não pelo centro. É o
        // inverso de um ponto de luz, e é o que faz parecer vidro.
        const aresta = Math.pow(1 - rel, 0.45);
        // Núcleo: uma faixa acesa no eixo do prisma.
        const nucleo = Math.exp(-Math.pow(perp / (largura * 0.42), 2)) * (1 - t * 0.55);
        // Faceta: a face tem dois lados com brilho diferente, senão o prisma
        // lê como tubo.
        const lado = perp >= 0 ? 1 : 0.55;
        // A base afunda na rocha.
        const base = smoothstep(t / 0.12);

        const peso = (aresta * 0.7 + nucleo * 0.85) * brilho * lado * base;
        if (peso <= 0.004) continue;

        data[i] = Math.min(255, data[i] + cor[0] * peso * 0.8);
        data[i + 1] = Math.min(255, data[i + 1] + cor[1] * peso * 0.8);
        data[i + 2] = Math.min(255, data[i + 2] + cor[2] * peso * 0.8);
      }
    }
  }
}

/** Poeira suspensa: a única coisa que dá vida a um fundo estático. */
function poeiraNoAr(data, art, seed) {
  const total = 190;

  for (let d = 0; d < total; d += 1) {
    const x = hash2(d, 1, seed) * WIDTH;
    const y = HORIZON - HEIGHT * 0.1 + hash2(d, 2, seed) * HEIGHT * 0.95;
    const r = 0.7 + hash2(d, 3, seed) * 2.1;
    // A poeira só aparece onde há luz, senão vira cinza no escuro.
    const pertoDaLuz = Math.exp(-(Math.hypot(x - CX, (y - (HORIZON - HEIGHT * 0.06)) * 0.78) ** 2) / (2 * (HEIGHT * 0.42) ** 2));
    const alfa = 0.05 + hash2(d, 4, seed) * 0.16 * pertoDaLuz;
    if (alfa <= 0.004) continue;

    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) continue;
        const d2 = Math.hypot(dx, dy);
        if (d2 > r) continue;

        const i = (py * WIDTH + px) * 4;
        const k = alfa * (1 - d2 / r);
        data[i] = mix(data[i], art.glow[0], k);
        data[i + 1] = mix(data[i + 1], art.glow[1], k);
        data[i + 2] = mix(data[i + 2], art.glow[2], k);
      }
    }
  }
}

// ------------------------------------------------- codificador de PNG

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

const SEEDS = { wind: 4211, crystal: 9077 };

// ------------------------------------------------- trava de sobrescrita
//
// Os `cave_bg_wind.png` e `cave_bg_crystal.png` do repositório são ARTE
// PINTADA, feita à mão, e não saem daqui. Este script existe porque foi ele que
// estabeleceu a construção — moldura de rocha, boca ao fundo, estalactites,
// poça de luz — que a arte pintada segue, e porque a medição das falhas
// (parede branca por falta de clamp, chão nunca desenhado por `pesoChao`
// invertido, moiré por escala variando por linha) está descrita nos comentários.
//
// Só que um script que escreve no mesmo caminho da arte é uma armadilha: rodar
// `node scripts/generate-backdrops.mjs` apagaria dois PNGs que ninguém aqui
// consegue regenerar. Por isso a escrita só acontece com `--force`, e o padrão
// é recusar.
//
//   node scripts/generate-backdrops.mjs --force   // gera por cima, e avisa
const forcar = process.argv.includes('--force');

for (const [biomeId, art] of Object.entries(BIOME_ART)) {
  const destino = `public/assets/cave_bg_${biomeId}.png`;
  const jaExiste = await access(destino).then(() => true, () => false);

  if (jaExiste && !forcar) {
    console.log(
      `${destino} ja existe e e arte pintada. Nada foi escrito.\n`
        + `  Para gerar por cima de proposito: node scripts/generate-backdrops.mjs --force\n`
        + `  Para ver o resultado sem salvar: troque o destino por outro caminho.`
    );
    continue;
  }

  if (jaExists) {
    console.log(`AVISO: sobrescrevendo ${destino}, que e arte pintada.`);
  }

  const data = render(art, SEEDS[biomeId]);
  const png = encodePng(WIDTH, HEIGHT, data);
  await writeFile(destino, png);

  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const n = data.length / 4;

  console.log(
    `cave_bg_${biomeId}.png  ${WIDTH}x${HEIGHT}  ${(png.length / 1024).toFixed(0)} KB  `
      + `cor media rgb(${(r / n).toFixed(0)},${(g / n).toFixed(0)},${(b / n).toFixed(0)})`
  );
}
