// Recorta os sprites de rocha por bioma em um spritesheet pronto para o jogo.
//
//   node scripts/slice-rocks.mjs               // todas as folhas
//   node scripts/slice-rocks.mjs frost         // so uma, para iterar rapido
//
// De onde vem a entrada
// ---------------------
// `rocks_individuais/<bioma>/*.png`, mais o `manifest.json` ao lado. São sprites
// individuais, com tamanhos diferentes cada um, e a contagem DIVERGE por bioma:
// crystal 12, ember 13, frost 14, ruins 12, sunstone 12, wind 12.
//
// A versão anterior desta fatia consumia uma folha 4x3 e fabricava doze modelos
// por bioma. Era a entrada errada: naquela folha as células 5 e 6 eram
// idênticas pixel a pixel em quatro dos seis biomas, e a diferença de silhueta
// entre pares era de 9% a 13% — variação de pose, não de assunto. Com a arte
// certa a média sobe para 20% a 29% e não sobra nenhum par duplicado.
//
// O que entra e o que sai
// ----------------------
// Entrada: um PNG por modelo, com o fundo transparente.
//
// Saída: `public/assets/rocks_<bioma>.png`, um spritesheet de células QUADRADAS,
// empacotadas numa grade próxima da quadrada, todas com a mesma contagem de
// células para os seis biomas. Ver `CELULAS`.
//
// Por que a mesma contagem de células
// ----------------------------------
// A contagem de sprites varia por bioma, e é por isso que a folha tem células
// sobrando: 14sprites numa grade 4x4 são 16 células, e duas delas ficam
// TRANSPARENTES.
//
// A primeira versão empacotava cada bioma numa grade do tamanho exato, 3x4 ou
// 4x4 conforme a contagem. Aí a altura da folha mudava de bioma para bioma, e a
// grade do jogo — que é uma lista só, com o total de células — passava a estar
// errada para três dos seis. Ter a mesma grade em todos é o que mantém a grade
// do jogo como uma lista plana, sem nenhuma aritmética por bioma.
//
// Por que célula quadrada
// ----------------------
// Porque é a única forma de não distorcer. A célula inteira vai para um
// quadrado na tela com escala uniforme, e a variedade de proporção fica DENTRO
// da célula, que é onde ela pertence: a laje aparece baixa e larga, a torre
// aparece alta, e nenhuma é esmagada. Ver `ROCK_DISPLAY` em `../src/game/rocks.js`.
//
// Por que 176px
// -------------
// A rocha ocupa cerca de 60px na tela, então 176 é um buffer de 2,9x: sobra para
// tela de alta densidade sem sobrar imagem invisível. Com células vazias à
// direita e abaixo, a compressão é quase nula, e a folha final fica entre 100 e
// 200 KB em vez dos 331 a 464 KB da versão de células cheias.
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { readPng } from './png.mjs';
import { encodePng } from './png-encode.mjs';

/** Onde o ZIP foi descompactado. */
const ORIGEM = 'C:/Users/adielvale/AppData/Local/Temp/opencode/rocks_zip/rocks_individuais';

/**
 * Célula de saída, e a grade de empacotamento.
 *
 * 4x4 dá dezesseis células para o bioma com mais sprites (frost, com 14). A
 * folha é 4*176 por 4*176, e o `endFrame` no BootScene corta no total real de
 * cada bioma, de modo que a célula vazia nunca vira um frame usável.
 */
const CELULA = 176;
const COLUNAS = 4;
const LINHAS = 4;

const BIOMES = ['sunstone', 'frost', 'ember', 'ruins', 'wind', 'crystal'];
const apenas = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const alvos = apenas.length > 0 ? apenas : BIOMES;

const temArquivo = (caminho) => access(caminho).then(() => true, () => false);

/**
 * Recorte do conteúdo, com a área de alfa.
 *
 * O limiar é 8 e não 2: a borda de uma arte pintada tem o alfa subindo
 * lentamente, e um limiar baixo puxa para dentro um halo de pixels quase
 * transparentes que, depois da redução, vira uma franja suja em volta da rocha.
 * O conteúdo também é aparado até aqui, e é esse recorte que impede as células
 * de carregarem a moldura vazia do PNG de entrada.
 */
function recorteDoConteudo(img) {
  const { width: W, height: H, channels: C, data: D } = img;
  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (D[(y * W + x) * C + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, largura: maxX - minX + 1, altura: maxY - minY + 1 };
}

/**
 * Reduz o recorte para dentro da célula, encaixando na base.
 *
 * Bilinear com alfa na média e desmultiplicação na escrita. As duas etapas
 * importam: sem o alfa na média, a borda semi-transparente é puxada para o
 * preto e a rocha ganha um contorno escuro; sem desmultiplicar, a cor gravada é
 * a cor escurecida pela mistura com o fundo.
 */
function reduzParaCelula(img, recorte, destinoX, destinoY) {
  const { width: W, channels: C, data: D } = img;
  const saida = new Uint8ClampedArray(CELULA * CELULA * 4);

  const escala = Math.min(CELULA / recorte.largura, CELULA / recorte.altura);
  const larguraDestino = Math.max(1, Math.round(recorte.largura * escala));
  const alturaDestino = Math.max(1, Math.round(recorte.altura * escala));

  for (let y = 0; y < alturaDestino; y += 1) {
    const sy = (y + 0.5) / escala - 0.5 + recorte.y;
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    const y0c = Math.min(img.height - 1, Math.max(0, y0));
    const y1 = Math.min(img.height - 1, Math.max(0, y0 + 1));

    for (let x = 0; x < larguraDestino; x += 1) {
      const sx = (x + 0.5) / escala - 0.5 + recorte.x;
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      const x0c = Math.min(img.width - 1, Math.max(0, x0));
      const x1 = Math.min(img.width - 1, Math.max(0, x0 + 1));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (const [yy, wy] of [[y0c, 1 - fy], [y1, fy]]) {
        for (const [xx, wx] of [[x0c, 1 - fx], [x1, fx]]) {
          const peso = wy * wx;
          if (peso <= 0) continue;
          const i = (yy * W + xx) * C;
          r += D[i] * peso;
          g += D[i + 1] * peso;
          b += D[i + 2] * peso;
          a += (D[i + 3] / 255) * peso;
        }
      }

      const o = (destinoY + y) * CELULA + (destinoX + x);
      if (o < 0 || o >= CELULA * CELULA) continue;

      if (a > 0.0001) {
        saida[o * 4] = r / a;
        saida[o * 4 + 1] = g / a;
        saida[o * 4 + 2] = b / a;
      }
      saida[o * 4 + 3] = a * 255;
    }
  }

  return { saida, larguraDestino, alturaDestino };
}

/**
 * Quantas peças soltas o sprite tem, em vez de um corpo só.
 *
 * Existe porque quatro sprites da Galeria de Vento são ARTE LEVITANTE, e não
 * rocha: `wind_01`, `wind_05` e `wind_10` são aglomerados flutuando com vento
 * ao redor, e `wind_04` é uma plataforma com pedrinhas penduradas embaixo.
 * Numa grade isométrica, onde cada rocha assenta num tile, uma plataforma
 * flutuante não lê como arte — lê como bug, e o jogador não tem como
 * distinguir "a arte está assim" de "o jogo está quebrado".
 *
 * O critério é objetivo e não é o meu olho: uma rocha que senta no chão é UM
 * corpo conexo. Estilhaço que paira em volta é um segundo. Medido nos 75 sprites,
 * a regra descarta exatamente os 4 da Vento e NENHUM dos outros 71 — os cinco
 * biomas restantes têm zero peças soltas.
 *
 * A base estreita, que parecia a culpada, é o critério ERRADO: `crystal_05` e
 * `ember_13` têm base de 10% e 12% da largura e são arte válida — um
 * afloramento com cristais e uma plataforma de lava vista de cima. Descartá-los
 * por causa disso teria custado dois sprites bons para ganhar uma lista
 * limpa.
 */
function pecasSoltas(img) {
  const recorte = recorteDoConteudoAlto(img);
  if (!recorte) return 0;

  const { width: W, channels: C, data: D } = img;
  const w = recorte.largura;
  const h = recorte.altura;
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      mask[y * w + x] = D[((recorte.y + y) * W + (recorte.x + x)) * C + 3] > 40 ? 1 : 0;
    }
  }

  const vistos = new Uint8Array(w * h);
  const pilha = [];
  const tamanhos = [];

  for (let i = 0; i < w * h; i += 1) {
    if (!mask[i] || vistos[i]) continue;

    let n = 0;
    pilha.push(i);
    vistos[i] = 1;

    while (pilha.length > 0) {
      const p = pilha.pop();
      n += 1;
      const x = p % w;
      const y = (p / w) | 0;

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && !vistos[q]) {
          vistos[q] = 1;
          pilha.push(q);
        }
      }
    }

    if (n > 0) tamanhos.push(n);
  }

  const total = tamanhos.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  // A peça principal é a maior. As outras só contam acima de 0,8% do alfa
  // total, para não transformar a borda suave da pintura em "estilhaço".
  return tamanhos.slice(1).filter((t) => t > total * 0.008).length;
}

/** Recorte com limiar de alfa alto, para a análise de peças. */
function recorteDoConteudoAlto(img) {
  const { width: W, height: H, channels: C, data: D } = img;
  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (D[(y * W + x) * C + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, largura: maxX - minX + 1, altura: maxY - minY + 1 };
}

/** Converte um matiz em duas metades, para comparar contornos de verdade. */
function halvesDoContorno(img) {
  const recorte = recorteDoConteudo(img);
  if (!recorte) return null;

  const { width: W, channels: C, data: D } = img;
  const largura = recorte.largura;
  const altura = recorte.altura;
  const cima = new Uint8Array(largura * Math.max(1, altura >> 1));
  const baixo = new Uint8Array(largura * Math.max(1, altura >> 1));
  const meio = altura >> 1;

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const a = D[((recorte.y + y) * W + (recorte.x + x)) * C + 3] > 24 ? 1 : 0;
      if (y < meio) cima[y * largura + x] = a;
      else baixo[(y - meio) * largura + x] = a;
    }
  }

  return { cima, baixo, largura, altura, meio };
}

/** Distância entre dois contornos, com o eixo y normalizado pela própria altura. */
function distanciaDeContorno(a, b) {
  const lado = 64;
  const amostra = (buffer, largura, altura, destino) => {
    for (let y = 0; y < lado; y += 1) {
      for (let x = 0; x < lado; x += 1) {
        const sx = Math.min(largura - 1, Math.floor((x / lado) * largura));
        const sy = Math.min(altura - 1, Math.floor((y / lado) * altura));
        destino[y * lado + x] = buffer[sy * largura + sx];
      }
    }
  };

  const ac = new Uint8Array(lado * lado);
  const bc = new Uint8Array(lado * lado);
  amostra(a.cima, a.largura, a.meio, ac);
  amostra(b.cima, b.largura, b.meio, bc);
  let dCima = 0;
  for (let p = 0; p < lado * lado; p += 1) if (ac[p] !== bc[p]) dCima += 1;

  const ad = new Uint8Array(lado * lado);
  const bd = new Uint8Array(lado * lado);
  amostra(a.baixo, a.largura, a.altura - a.meio, ad);
  amostra(b.baixo, b.largura, b.altura - b.meio, bd);
  let dBaixo = 0;
  for (let p = 0; p < lado * lado; p += 1) if (ad[p] !== bd[p]) dBaixo += 1;

  return (dCima + dBaixo) / (2 * lado * lado) * 100;
}

await mkdir('public/assets', { recursive: true });

const temManifest = await temArquivo(`${ORIGEM}/manifest.json`);

for (const biome of alvos) {
  const destino = `public/assets/rocks_${biome}.png`;

  if (!temManifest) {
    console.log(
      `manifest.json nao encontrado em ${ORIGEM}. Descompacte o ZIP de sprites `
        + `individuais e rode de novo. Nada foi escrito.`
    );
    process.exit(1);
  }

  const manifesto = JSON.parse(await readFile(`${ORIGEM}/manifest.json`, 'utf8'));
  const lista = manifesto[biome];

  if (!Array.isArray(lista) || lista.length === 0) {
    console.log(`${biome}: o manifest.json nao lista sprites. Nada foi escrito.`);
    continue;
  }

  if (lista.length > COLUNAS * LINHAS) {
    console.log(
      `${biome}: ${lista.length} sprites, e a grade comporta ${COLUNAS * LINHAS}. `
        + `Aumente COLUNAS/LINHAS em slice-rocks.mjs. Nada foi escrito.`
    );
    continue;
  }

  const largura = COLUNAS * CELULA;
  const altura = LINHAS * CELULA;
  const saida = new Uint8ClampedArray(largura * altura * 4);
  const contornos = [];
  const medidas = [];
  const descartados = [];

  for (let i = 0; i < lista.length; i += 1) {
    const item = lista[i];
    const entrada = `${ORIGEM}/${biome}/${item.file}`;

    if (!(await temArquivo(entrada))) {
      console.log(`  ${item.file}: o manifest lista, e o arquivo nao esta la. Pulando.`);
      continue;
    }

    const img = await readPng(entrada);
    const recorte = recorteDoConteudo(img);

    if (!recorte) {
      console.log(`  ${item.file}: totalmente transparente. Pulando.`);
      continue;
    }

    // Arte levitante não vira rocha quebrável. Ver `pecasSoltas`.
    const soltos = pecasSoltas(img);
    if (soltos >= 2) {
      descartados.push({ arquivo: item.file, pecas: soltos });
      console.log(
        `  ${item.file}: arte levitante (${soltos} peças soltas) — fora, `
          + `uma peça flutuando numa grade de tiles lê como bug.`
      );
      continue;
    }

    contornos.push(halvesDoContorno(img));

    // Empacota em ordem de leitura: linha a linha, da esquerda para a direita.
    const coluna = i % COLUNAS;
    const linha = Math.floor(i / COLUNAS);

    const celula = reduzParaCelula(img, recorte, 0, 0);
    const baseX = coluna * CELULA + Math.round((CELULA - celula.larguraDestino) / 2);
    const baseY = linha * CELULA + (CELULA - celula.alturaDestino);

    for (let y = 0; y < CELULA; y += 1) {
      for (let x = 0; x < CELULA; x += 1) {
        const de = (y * CELULA + x) * 4;
        const para = ((linha * CELULA + y) * largura + coluna * CELULA + x) * 4;
        saida[para] = celula.saida[de];
        saida[para + 1] = celula.saida[de + 1];
        saida[para + 2] = celula.saida[de + 2];
        saida[para + 3] = celula.saida[de + 3];
      }
    }

    medidas.push({
      arquivo: item.file,
      origem: `${recorte.largura}x${recorte.altura}`,
      celula: `${celula.larguraDestino}x${celula.alturaDestino}`,
      alturaRelativa: celula.alturaDestino / CELULA
    });
  }

  const png = encodePng(largura, altura, saida);
  await writeFile(destino, png);

  // O menor e o maior par: o que decide se a variacao vai LER na tela.
  let min = 100;
  let max = 0;
  let soma = 0;
  let pares = 0;
  let duplicados = 0;
  for (let i = 0; i < contornos.length; i += 1) {
    for (let j = i + 1; j < contornos.length; j += 1) {
      const d = distanciaDeContorno(contornos[i], contornos[j]);
      if (d < 0.5) duplicados += 1;
      if (d < min) min = d;
      if (d > max) max = d;
      soma += d;
      pares += 1;
    }
  }

  const alturaMax = Math.max(...medidas.map((m) => m.alturaRelativa));
  const alturaMin = Math.min(...medidas.map((m) => m.alturaRelativa));

  console.log(
    `${destino}  ${largura}x${altura}  ${medidas.length} sprites`
      + (descartados.length ? `  (${lista.length - descartados.length} de ${lista.length})` : '')
      + `  ${Math.round(png.length / 1024)} KB`
  );
  console.log(
    `   altura na celula: ${(alturaMin * 100).toFixed(0)}% a ${(alturaMax * 100).toFixed(0)}%  |  `
      + `contorno entre pares: min ${min.toFixed(1)}%  media ${(soma / pares).toFixed(1)}%  `
      + `max ${max.toFixed(1)}%`
    + (duplicados ? `  [${duplicados} pares IGUAIS]` : '  [nenhum par igual]')
  );
}
