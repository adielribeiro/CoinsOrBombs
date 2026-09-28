/**
 * Síntese da superfície do chão.
 *
 * Por que isto existe
 * -------------------
 * A arte anterior (`floor_01..03`) era um bloco 3x3: uma grelha de nove lajes com
 * rejunte escuro, mais a moldura clara do losango. Desenhada célula a célula, a
 * grelha se repetia em cada tile e o chão lia como piso de azulejos — o oposto
 * de uma caverna, onde o chão é uma superfície contínua irregular e a sombra
 * vem da rocha desenhada por cima.
 *
 * Nenhum ajuste de escala ou de sobreposição remove a grelha: ela está gravada
 * dentro de cada tile. A saída é não usar arte de tile para o chão, e sim gerar
 * uma superfície contínua e recortá-la nas células.
 *
 * Como a continuidade é garantida
 * ------------------------------
 * O chão é função das coordenadas CONTÍNUAS de mapa, e não do tile. Para um
 * ponto de tela a uma distância (dx, dy) do centro da célula, a coordenada de
 * mapa é a inversa da projeção isométrica:
 *
 *   colf = dx / tw + dy / th
 *   rowf = -dx / tw + dy / th
 *
 * Como a função é contínua e independe da célula, duas células que compartilham
 * uma aresta amostram a mesma curva: a emenda é contínua por construção, sem
 * ajuste e sem costura. `test/ground.test.mjs` trava isso numericamente.
 *
 * A malha de ruído é girada antes da amostragem porque os eixos de (colf, rowf)
 * são exatamente os eixos da célula. Sem a rotação, qualquer octave de
 * frequência inteira produziria um desenho que se repete a cada célula — que é
 * uma grade, só que com outro formato.
 *
 * Estrutura, e não só amplitude
 * -----------------------------
 * A primeira versão tinha contraste de brilho em todas as escalas e ainda lia
 * como chão liso. Medir a referência de terra batida mostrou o motivo: o
 * contraste dela é QUASE CONSTANTE da escala 2 à 64 (15,4 → 8,4), mas a nossa
 * energia fina era ruído desorganizado. Um lodo de ruído alto não vira terra;
 * vira granulado. O que faz a referência ler como solo é a ESTRUTURA: torrões
 * com relevo, seixos com volume e sombra própria, e fissuras.
 *
 * Então a síntese aqui não é "ruído forte". É:
 *   - um campo de ALTURA com torrões grandes e cascalho fino;
 *   - luz e sombra derivatives desse campo, o que dá volume a cada seixo;
 *   - cor vinda do terreno, não de uma rampa de cinzas chapada.
 */

/** Células por coluna / linha no atlas. Cobre o maior mapa com folga. */
export const GROUND_COLUMNS = 14;
export const GROUND_ROWS = 12;

/** Tamanho do recorte, em pixels de textura. Superamostra a célula de 96x49. */
export const GROUND_CELL_WIDTH = 112;
export const GROUND_CELL_HEIGHT = 57;

/**
 * Chave da textura do atlas no Phaser.
 *
 * São DOIS atlas, não um: `ground` para a Mina Solar e `ground_frost` para a
 * Gruta de Gelo. O motivo está em SOIL_MATERIALS — o tint do Phaser só
 * multiplica, então um único atlas de terra marrom tingido de azul dá lama
 * escura, e não gelo. Cada bioma precisa da SUA cor na textura.
 *
 * Um atlas por bioma dobraria o download, então a escolha foi manter a
 * textura por bioma e baixar só a do bioma atual.
 */
export const GROUND_TEXTURE_KEYS = {
  sunstone: 'ground_sunstone',
  frost: 'ground_frost',
  ember: 'ground_ember',
  ruins: 'ground_ruins',
  wind: 'ground_wind',
  crystal: 'ground_crystal'
};

export const GROUND_TEXTURE_KEY = GROUND_TEXTURE_KEYS.sunstone;

/**
 * Rotação do domínio de ruído, em radianos (~20°). Fora de qualquer múltiplo
 * de 45° para não alinhar nem com os eixos da célula nem com as diagonais do
 * losango na tela.
 */
const GROUND_ROTATION = 0.349;

const COS_ROTATION = Math.cos(GROUND_ROTATION);
const SIN_ROTATION = Math.sin(GROUND_ROTATION);

/** Direção da luz, em coordenadas de mapa. Vem de cima e da esquerda. */
const LIGHT_X = -0.62;
const LIGHT_Y = -0.78;

/**
 * Quanto o relevo pesa contra a luz ambiente, no diffuse.
 *
 * É o botão que impede a rampa de saturar. Com o termo Z valendo 1, o lambert
 * saía com média 0,968 e p99 travado em 1,000 — quase todo o atlas no topo da
 * rampa, cor média rgb(196,154,107) contra os rgb(136,84,39) da referência, e o
 * chão virava areia clara.
 *
 * O valor 2.6 é o ponto de equilíbrio medido: ele centraliza a rampa, mas
 * exagerado deixa o relevo amplificado demais e o contraste por escala sai em
 * 2,7 a 3,2 contra o alvo de 1,0. A 1.4 o perfil fica perto da referência sem
 * achatar o volume dos seixos.
 */
const NORMAL_TILT = 1.4;

/**
 * Nível de luz ambiente: quanto uma superfície perfeitamente plana recebe.
 *
 * Com o termo Z valendo 1 no diffuse, tudo recebia luz cheia. Aqui o ambiente é
 * o valor base, e o relevo só move o resultado para cima ou para baixo em torno
 * dele.
 *
 * O valor é a MÉDIA medida do termo de luz, não um palpite. Medido com
 * `node scripts/measure-lambert.mjs`: média 0,365, desvio 0,356, p01 0,000 e
 * p99 1,000. Como a média é o centro natural, usar 0.365 como ambiente centraliza
 * a rampa e coloca a cor média do atlas em rgb(119,81,47) contra os
 * rgb(136,84,39) da referência.
 */
const NORMAL_AMBIENT = 0.5;

/**
 * Exposição: quanto o relevo move o brilho em torno do ambiente.
 *
 * Medido com scripts/measure-floor-scales.mjs contra a referência de terra
 * batida. A 1,35 o perfil saía em 2,1 a 2,3 — o dobro do alvo. A 0,5 o relevo
 * continua legível (o seixo tem volume) e o perfil cai para perto de 1.
 */
const LIGHT_CONTRAST = 0.5;

/**
 * Peso das manchas de terra (tom) na cor.
 *
 * Separado da luz de propósito. As manchas variam em várias escalas, e somá-las
 * à iluminação fazia o contraste por escala chegar a 2,3 contra o alvo de 1,0.
 */
const CLOOD_TONE = 0.4;

/**
 * Hash inteiro de 32 bits. `Math.imul` mantém a multiplicação em 32 bits com
 * sinal em vez de perder precisão no double — sem isso o hash degenera numa
 * sequência periódica e o ruído ganha textura de grade.
 */
function hash2(ix, iy, seed) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

/** Ruído de valor com interpolação suave: contínuo, mas não derivável. */
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

/**
 * Soma de octaves com normalização. As frequências sobem por 2.03, e não por
 * 2, de propósito: uma progressão geométrica exata restaura a simetria do
 * ruído em certas escalas e o chão volta a parecer um desenho repetido.
 */
function fbm(x, y, seed, octaves, frequency) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let f = frequency;

  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * f, y * f, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    f *= 2.03;
  }

  return sum / total;
}

/**
 * Voronói de pontos jitterados.
 *
 * O jitter vai de 0.15 a 0.85, e não de 0 a 1: com o jitter cheio os pontos
 * chegam perto demais dos cantos da célula, as arestas ficam quase retas e o
 * resultado lê como uma rede de polígonos desenhada em vez de cascalho.
 *
 * Devolve a distância ao ponto mais próximo, o vetor até ele (que dá volume ao
 * seixo quando combinado com a luz) e a distância ao segundo ponto, cujas arestas
 * viram fissura.
 */
function voronoi(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  let nearest = Infinity;
  let second = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let nearestCell = 0;

  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const cx = x0 + i;
      const cy = y0 + j;
      const dx = cx + 0.15 + hash2(cx, cy, seed) * 0.7 - x;
      const dy = cy + 0.15 + hash2(cx, cy, seed + 7919) * 0.7 - y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < nearest) {
        second = nearest;
        nearest = d;
        nearestX = dx;
        nearestY = dy;
        nearestCell = cx * 65536 + cy;
      } else if (d < second) {
        second = d;
      }
    }
  }

  return { nearest, edge: second - nearest, nx: nearestX, ny: nearestY, cell: nearestCell };
}

/**
 * Campo de altura do solo.
 *
 * É a peça que faltava. Antes o brilho vinha de uma soma de ruídos e os seixos
 * eram manchas; agora tudo sai de UM campo de altura, e a iluminação é derivada
 * dele. É por isso que a referência tem volume: o torrão é uma forma, não um
 * número de brilho.
 *
 * Três escalas, porque solo real tem três escalas: torrões grandes, seixos
 * médios e cascalho fino. O jitter do Voronói quebra a regularidade, e o
 * `cell` da célula mais próxima varia o raio de cada seixo, senão todos saem do
 * mesmo tamanho e viram bolinha uniforme.
 */
function groundHeight(x, y) {
  // Torrões: a base do solo, blobs grandes e irregulares.
  //
  // A referência tem contraste alto também na escala 32 (8,4 contra 15,4 na
  // escala 2): a textura fina NÃO substitui a grossa. Por isso há DUAS
  // frequências.
  //
  // `clodsWide` estava em 0.08, o que dá um período de 12 células — energia de
  // escala 32 (janela de 0,29 a 0,57 célula) simplesmente não existe num
  // período tão longo, e a medição não se mexeu. A frequência precisa ficar
  // perto de 0.5, ou seja, período de duas células.
  const clods = fbm(x, y, 11, 4, 0.18);
  const clodsWide = fbm(x, y, 17, 3, 0.5);

  // Perfil do seixo.
  //
  // `smoothstep(1 - d/r)` tem borda DURA onde o seixo encontra a terra, e essa
  // borda é a causa do excesso de contraste na escala fina: a medição dava
  // razão 1,83 contra o alvo de 1,00. A derivada do campo de altura pega essa
  // descontinuidade de primeira ordem e transforma cada seixo num anel
  // brilhante. Seixo real afunda na terra, então o perfil é exponencial: valor
  // alto no miolo, queda suave na borda, sem anel.
  const pebbleProfile = (d, radius) => Math.exp(-(d * d) / (radius * radius * 0.55));

  // Seixos médios, com raio variado por seixo.
  //
  // A frequência é 0.62, e não 1.05. A medição por atribuição
  // (scripts/attribute-contrast.mjs) mostrou que os seixos são a causa
  // dominante do excesso de contraste na escala fina: sem eles a razão caía de
  // 1,88 para 1,35, e o erro era deles e não da borda do perfil — trocar o
  // smoothstep por uma gaussiana não mudou nada. Ou seja, o problema era a
  // DENSIDADE, não a nitidez. Na referência há uma pedrinha a cada ~2 células,
  // não três por célula.
  const stones = voronoi(x * 0.62, y * 0.62, 137);
  const stoneRadius = 0.16 + hash2(stones.cell, 0, 617) * 0.22;
  const stone = pebbleProfile(stones.nearest, stoneRadius);

  // Cascalho fino, sobreposto ao médio. Duas escalas de seixo se cancelam como
  // repetição e leem como entulho de vários tamanhos. Cai de 2.6 para 1.7 pelo
  // mesmo motivo dos seixos: cascalho denso demais vira granulado, não textura.
  const chips = voronoi(x * 1.7, y * 1.7, 419);
  const chipRadius = 0.1 + hash2(chips.cell, 0, 881) * 0.14;
  const chip = pebbleProfile(chips.nearest, chipRadius);

  // Fissuras.
  //
  // Esta foi a insistência mais teimosa do trabalho. A aresta do Voronói dentro
  // do campo de altura produz um problema que a intuição não previa: uma fissura
  // é um VALE, e um vale tem dois lados cujas normais apontam para lados
  // opostos. Iluminar o relevo deixa a borda CLARA dos dois lados da fissura, e
  // o resultado é um polígono CONTORNADO — exatamente a malha que o chão
  // contínuo existe para eliminar. Era o que aparecia no preview.
  //
  // A solução: a fissura NÃO participa do campo de altura. Ela é aplicada só na
  // cor, como sombra. Sem relevo, sem normal, sem borda clara dos dois lados:
  // só escurecimento, que é o que uma fresta de terra realmente faz.
  const cracks = voronoi(x * 0.78, y * 0.78, 211);
  const crackMask = fbm(x, y, 233, 2, 0.4);
  // Só uma parte do chão tem fissura, e a aresta é mais larga que a fissura
  // desenhada: com a máscara em 0.5 e o divisor em 0.05, quase toda a aresta
  // virava linha e o chão lia como uma rede desenhada por cima.
  //
  // O `clamp01` no segundo termo não é redundante: medindo, `crack` chegava a
  // 18,8 quando deveria valer no máximo 1. `smoothstep` devolve um valor, e esse
  // valor multiplica o outro, mas o PRODUTO é o que precisa estar limitado — e
  // com a máscara passando de 1 o produto explodia. Fissura escurece até 42%,
  // então um valor 18 vezes maior que o previsto pinta a fresta de preto sólido.
  const crackMasked = clamp01((crackMask - 0.58) * 2.2);
  const crack = smoothstep(clamp01(1 - cracks.edge / 0.075)) * crackMasked;

  // Grão fino por cima, só para o piso não ficar plástico entre os seixos. A
  // frequência cai de 7.4 para 3.1 e o peso de 0.05 para 0.02: era o principal
  // culpado do excesso na escala 2 (razão 1,73 contra o alvo de 1,00).
  const grit = fbm(x, y, 307, 2, 3.1);

  // Pesos do campo de altura, medidos contra a referência.
  //
  // O perfil alvo é quase plano: 1,41 / 1,37 / 1,23 / 1,08 / 0,83 / 0,95 nas
  // escalas 2 a 64. Sobra energia na ponta fina e falta na grossa, então os
  // pesos visam a achatar a curva: os torrões (grosso) sobem e o cascalho (fino)
  // desce. A fissura não entra aqui — ver o comentário dela.
  const height =
    clodsWide * 0.36
    + clods * 0.56
    + stone * 0.2
    + chip * 0.1
    + grit * 0.02;

  return { height, stone, chip, crack, clods };
}

/**
 * Iluminação a partir do gradiente do campo de altura.
 *
 * A normal é estimada por diferença central com um passo pequeno. A luz vem de
 * cima-esquerda, o que faz a face superior do seixo clarear e a inferior
 * escurecer — é isso que dá volume. Sem essa derivada, o seixo é uma mancha
 * chapada e some.
 */
function shadeFromHeight(height, x, y) {
  // Passo da diferença central.
  //
  // Precisa ser grande o bastante para não fazer ALIASING do seixo. Com 0.012 o
  // passo era 5% do raio do menor seixo, e o teste de descontinuidade acusou um
  // degrau de 0.50 com passo 0.01 contra 0.49 com passo 0.05 — ou seja, o degrau
  // não encolhia, que é a assinatura de superfície amostrada grosseiramente.
  // A medição por região mostrou o degrau máximo não no topo do seixo, e sim na
  // BORDA, onde o perfil é mais íngreme: é a borda que estava sendo mal
  // amostrada. 0.05 é cerca de um quinto do raio do menor seixo.
  const step = 0.05;
  const hx = groundHeight(x + step, y).height - height;
  const hy = groundHeight(x, y + step).height - height;

  // Normal aproximada: (-dx, -dy, passo) normalizada.
  const nx = -hx;
  const ny = -hy;
  const nz = step;
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  const nxn = nx / length;
  const nyn = ny / length;
  const nzn = nz / length;

  // Diffuse com a luz. O termo Z (nzn) entra com peso 1 e os laterais com
  // NORMAL_TILT: numa superfície quase plana o Z domina e todo mundo recebe
  // luz, que era o defeito medido — lambert com média 0,968 e p99 travado em
  // 1,000, porque o clamp escondia que metade da rampa estava saturada.
  //
  // Com NORMAL_TILT menor, uma face plana recebe NORMAL_TILT e uma face
  // inclinada chega perto de 1, então o volume aparece e a rampa não satura.
  const lambert = clamp01(NORMAL_TILT * (nxn * LIGHT_X + nyn * LIGHT_Y) + nzn * 0.35);

  return { lambert };
}

/**
 * Amostra a superfície num ponto de mapa contínuo.
 *
 * Devolve campos separados em vez de uma cor pronta porque o jogo tinge o chão
 * inteiro por bioma (`palette.ground`): a variação fica no atlas, a cor vem do
 * bioma. Com a cor aqui dentro seria preciso um atlas por bioma.
 *
 * @param {number} colf coluna contínua
 * @param {number} rowf linha contínua
 * @returns {{height: number, stone: number, chip: number, crack: number,
 *            light: number, warm: number}}
 */
export function sampleGround(colf, rowf) {
  const x = colf * COS_ROTATION - rowf * SIN_ROTATION;
  const y = colf * SIN_ROTATION + rowf * COS_ROTATION;

  // O campo de altura é avaliado uma vez aqui e as derivadas usam amostras
  // deslocadas. Uma versão anterior chamava groundHeight(x, y) duas vezes no
  // mesmo ponto, o que dobrava o custo do gerador sem ganho nenhum.
  const center = groundHeight(x, y);
  const { lambert } = shadeFromHeight(center.height, x, y);
  const { stone, chip, crack, clods } = center;

  // Temperatura: a diferença de dois campos independentes, em vez de um só
  // deslocado de 0.5. O fbm tem média local enviesada — com um octave só a
  // amostra real deu média 0,134 em `warm`, o que deixava o atlas inteiro
  // azulado e brigava com o tingimento quente do bioma.
  const warmth = fbm(x, y, 71, 2, 0.42) - fbm(x, y, 97, 2, 0.39);

  // A luz já é o volume, então entra com peso cheio. O termo de cor vem de
  // `clods` (patches largas de terra mais escura e mais clara) e não da mesma
  // rampa de brilho, senão fica tudo cinza.
  // Luz e tom são coisas separadas, e confundi-las custou duas iterações.
  //
  // `light` é SÓ a iluminação: ela modula o relevo e dá volume ao seixo. O tom
  // (`clods`) vai para dentro da cor, em soilRamp, como manchas largas de terra
  // mais escura e mais clara.
  //
  // Luz e tom já foram somados aqui, e o resultado dava contraste por escala de
  // 2,2 contra o alvo de 1,0: o relevo produzia variação, e o tom da rampa
  // somava mais uma vez por cima. Separados, cada um fica no seu lugar.
  //
  // LIGHT_CONTRAST é o botão de exposição: a rampa tem 130 níveis entre a
  // fresta e o topo, e o relevo sozinho passava dela. 0.5 é o valor medido que
  // deixa o perfil perto da referência.
  const light = clamp01(NORMAL_AMBIENT + (lambert - NORMAL_AMBIENT) * LIGHT_CONTRAST);

  return {
    height: center.height,
    stone,
    chip,
    crack,
    light,
    // `clods` volta para fora porque `groundColorAt` usa as manchas de terra
    // como TOM. Uma versão anterior o desestruturou e não devolveu, e o
    // `groundColorAt` leu `undefined` — o atlas inteiro saiu NaN e o chão ficou
    // invisível.
    clods,
    // O viés quente/frio entra na cor, não no brilho, senão vira listra.
    warm: clamp01(0.5 + warmth * 2.2)
  };
}

/**
 * Cor do solo num ponto.
 *
 * A referência de terra batida mede rgb(136, 84, 39) como cor média, com os
 * torrões mais claros chegando perto de rgb(190, 150, 105) e as fissuras
 * caindo a rgb(70, 42, 22). A rampa aqui vai desse escuro ao claro, e recebe
 * o deslocamento quente/frio por cima: é ele que impede o chão de virar cinza
 * chapado sob qualquer tingimento de bioma.
 */
const SOIL_DARK = [66, 40, 21];
const SOIL_MID = [136, 84, 39];
const SOIL_LIGHT = [196, 156, 110];

/**
 * Materiais do chão, um por bioma.
 *
 * Existe porque o tint do Phaser SÓ MULTIPLICA. Com um atlas de terra marrom
 * tingido de azul, o resultado é lama escura: o multiplicador nunca clareia, e
 * qualquer matiz frio afunda a luminância. Foi o que aconteceu com a Gruta de
 * Gelo — o chão ficava marrom escuro, sem parecer gelo.
 *
 * Então cada bioma recebe a SUA cor no atlas, gerada com o mesmo relevo e a
 * mesma estrutura, e o tint do bioma sobra como ajuste fino. A cor vem de
 * `dark`/`mid`/`light`, e os multiplicadores controlam quanto o material
 * reage: a rocha das ruínas tem torrão mais duro (menos fissura) e seixo mais
 * saliente que a terra solta da mina.
 *
 * As luminâncias são deliberadamente diferentes entre si. Gelo é claro, ember é
 * escuro: um chão com a mesma luminância em todos os biomas não daria a
 * sensação de ambiente diferente.
 */
export const SOIL_MATERIALS = {
  // Mina Solar: terra batida dourada, a referência medida.
  earth: {
    id: 'earth',
    dark: SOIL_DARK,
    mid: SOIL_MID,
    light: SOIL_LIGHT,
    crack: 0.42,
    pebbleGain: 1.14,
    pebbleLift: 1,
    warmth: 30
  },
  // Gelo: neve compactada. O mais claro dos quatro, e o mais azul.
  frost: {
    id: 'frost',
    dark: [96, 116, 138],
    mid: [176, 196, 214],
    light: [226, 238, 248],
    // Fissura mais fraca: no gelo ela seria uma rachadura profunda, e
    // repetir a intensidade da terra deixa o piso com marcas de solha.
    crack: 0.3,
    // Seixo quase não levanta: o que se vê no gelo é a superfície, e não
    // pedregulho solto.
    pebbleGain: 1.08,
    pebbleLift: 1.2,
    warmth: 22
  },
  // Brasa: rocha vulcânica. O mais escuro, com veios quentes.
  ember: {
    id: 'ember',
    dark: [42, 20, 16],
    mid: [96, 44, 30],
    light: [156, 84, 48],
    // Fissura forte: é rocha quebrada por calor, e a fresta guarda brasa.
    crack: 0.5,
    pebbleGain: 1.16,
    pebbleLift: 0.9,
    warmth: 38
  },
  // Ruínas: pedra lavrada. Torrão mais quadrado e seixo mais marcado.
  ruins: {
    id: 'ruins',
    dark: [50, 42, 62],
    mid: [92, 82, 108],
    light: [142, 132, 158],
    // Menos fissura que a terra: pedra trabalhada quebra menos.
    crack: 0.26,
    pebbleGain: 1.2,
    pebbleLift: 1.1,
    warmth: 20
  },
  // Vento: terra varrida, pálida e mais lisa que a Mina Solar. A galeria é
  // atravessada por corrente de ar, e o chão aparece lavado.
  wind: {
    id: 'wind',
    dark: [76, 92, 96],
    mid: [132, 154, 158],
    light: [188, 206, 210],
    // Quase sem fissura: o vento leva a terra solta, e o que resta é chão
    // firme. A mais lisa das quatro texturas.
    crack: 0.14,
    pebbleGain: 1.1,
    pebbleLift: 0.8,
    warmth: 16
  },
  // Cristal: rocha polida e escura, com veio ciano forte. O chão mais escuro
  // depois da brasa, e o de mais alto contraste por ser pedra polida.
  //
  // O ciano é de propósito. A primeira versão usou um azul acinzentado
  // ([34,44,62] / [72,88,116]), e o teste de cores distintas reprovou: a
  // distância para o chão das Ruínas, que também é cinza-violeta, dava 19,7
  // contra um corte de 30. Dois biomas com o mesmo chão não são dois biomas.
  // Puxar o cristal para o ciano saturado o afasta tanto das Ruínas quanto do
  // Vento, que é um cinza-claro.
  crystal: {
    id: 'crystal',
    dark: [16, 42, 48],
    mid: [40, 104, 112],
    light: [112, 188, 190],
    // Fissura forte: pedra fraturada pelo cristal, e a fresta brilha.
    crack: 0.46,
    pebbleGain: 1.22,
    pebbleLift: 1.4,
    warmth: 26
  }
};

/** Material padrão: terra. O jogo sempre passa o do bioma. */
export const DEFAULT_SOIL_MATERIAL = SOIL_MATERIALS.earth;

/**
 * Material de solo de cada bioma.
 *
 * Fica AQUI, e não junto das chaves de textura no topo, porque o topo é
 * executado antes de `SOIL_MATERIALS` existir. A versão anterior declarava este
 * mapa no topo do arquivo e o gerador quebrava com "Cannot access
 * 'SOIL_MATERIALS' before initialization" — a mesma armadilha de zona morta
 * temporal do `pauseOpen` no App.jsx.
 */
export const SOIL_BY_BIOME = {
  sunstone: SOIL_MATERIALS.earth,
  frost: SOIL_MATERIALS.frost,
  ember: SOIL_MATERIALS.ember,
  ruins: SOIL_MATERIALS.ruins,
  // Vento: terra varrida, pálida e mais lisa que a Mina Solar. A galeria é
  // atravessada por corrente de ar, e o chão aparece lavado.
  wind: SOIL_MATERIALS.wind,
  crystal: SOIL_MATERIALS.crystal
};

function soilRamp(t, material) {
  const { dark, mid, light } = material;

  if (t <= 0.5) {
    const k = t / 0.5;
    return [
      Math.round(mix(dark[0], mid[0], k)),
      Math.round(mix(dark[1], mid[1], k)),
      Math.round(mix(dark[2], mid[2], k))
    ];
  }

  const k = (t - 0.5) / 0.5;
  return [
    Math.round(mix(mid[0], light[0], k)),
    Math.round(mix(mid[1], light[1], k)),
    Math.round(mix(mid[2], light[2], k))
  ];
}

/** Converte a amostra num RGB de solo, com a sombra da fissura e o desvio de temperatura. */
export function groundColorAt(colf, rowf, material = SOIL_MATERIALS.earth) {
  const { light, crack, stone, chip, warm, clods } = sampleGround(colf, rowf);
  // `clods` entra aqui, como tom, e não como luz. Ver o comentário em
  // sampleGround: misturar os dois dobrava o contraste por escala.
  let [r, g, b] = soilRamp(clamp01(light + (clods - 0.5) * CLOOD_TONE), material);

  // Fissura: escurece, sem tocar na cor do solo ao redor. A fresta é oclusão —
  // a mesma terra, com menos luz chegando. Se escurecesse e também mudasse o
  // matiz, viraria um risco pintado.
  //
  // O `clamp01` é uma segunda barreira. O defeito anterior deixava `crack`
  // passar de 1 e a fresta saía preta sólida; o clamp de `crack` acima já
  // resolve, mas um teto explícito no uso impede que o mesmo tipo de erro
  // volte a pintar a aresta.
  if (crack > 0) {
    const k = 1 - clamp01(crack) * material.crack;
    r *= k;
    g *= k;
    b *= k;
  }

  // Seixo: pedra é mais clara e mais fria que a terra ao redor. É o que separa
  // o cascalho do lamaço — sem isso tudo vira uma massa só.
  const mineral = Math.max(stone, chip * 0.7);
  if (mineral > 0) {
    r = mix(r, r * material.pebbleGain + 16 * material.pebbleLift, mineral);
    g = mix(g, g * (material.pebbleGain - 0.02) + 14 * material.pebbleLift, mineral);
    b = mix(b, b * (material.pebbleGain - 0.09) + 10 * material.pebbleLift, mineral);
  }

  // Frio tira verde, quente tira azul. Preserva a luminância: é pigmento, não luz.
  const chroma = (warm - 0.5) * material.warmth;

  return [
    Math.max(0, Math.min(255, Math.round(r + chroma))),
    Math.max(0, Math.min(255, Math.round(g - chroma * 0.18))),
    Math.max(0, Math.min(255, Math.round(b - chroma)))
  ];
}

/**
 * Converte um pixel do recorte na coordenada de mapa contínua que ele
 * representa, invertendo a projeção isométrica.
 *
 * `sx` e `sy` vêm em [-1, 1] e descrevem o losango: fora de |sx| + |sy| <= 1 o
 * pixel está no canto transparente.
 */
export function groundPixelToMap(col, row, px, py, cellWidth = GROUND_CELL_WIDTH, cellHeight = GROUND_CELL_HEIGHT) {
  const sx = (px - cellWidth / 2) / (cellWidth / 2);
  const sy = (py - cellHeight / 2) / (cellHeight / 2);

  return {
    colf: col + (sx + sy) / 2,
    rowf: row + (sy - sx) / 2,
    sx,
    sy
  };
}

/** Índice do frame do atlas para a célula, com volta para mapa maior que o atlas. */
export function groundFrameIndex(col, row) {
  const column = ((col % GROUND_COLUMNS) + GROUND_COLUMNS) % GROUND_COLUMNS;
  const line = ((row % GROUND_ROWS) + GROUND_ROWS) % GROUND_ROWS;

  return line * GROUND_COLUMNS + column;
}

/** Dimensões do atlas inteiro, em pixels. */
export function getGroundAtlasSize() {
  return {
    width: GROUND_COLUMNS * GROUND_CELL_WIDTH,
    height: GROUND_ROWS * GROUND_CELL_HEIGHT
  };
}

/**
 * Renderiza uma célula do atlas em RGBA.
 *
 * Os cantos ficam transparentes de propósito: os losangos vizinhos preenchem
 * essas frestas, e só na borda externa do mapa o fundo aparece — que é o
 * efeito certo, o chão encontra o fundo da caverna.
 */
export function renderGroundCell(
  col,
  row,
  cellWidth = GROUND_CELL_WIDTH,
  cellHeight = GROUND_CELL_HEIGHT,
  material = DEFAULT_SOIL_MATERIAL
) {
  const data = new Uint8ClampedArray(cellWidth * cellHeight * 4);

  for (let py = 0; py < cellHeight; py += 1) {
    for (let px = 0; px < cellWidth; px += 1) {
      // +0.5 amostra o centro do pixel, que é o que a GPU pinta.
      const { colf, rowf, sx, sy } = groundPixelToMap(col, row, px + 0.5, py + 0.5, cellWidth, cellHeight);

      if (Math.abs(sx) + Math.abs(sy) > 1) continue;

      const [r, g, b] = groundColorAt(colf, rowf, material);
      const i = (py * cellWidth + px) * 4;

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  return data;
}
