// Apara a arte da picareta pelo conteúdo, e mede.
//
//   node scripts/trim-props.mjs
//
// Existe pela mesma razão que o fatiador de rochas recorta: a arte de origem
// vem CENTRALIZADA num canvas quadrado, com folga transparente igual em cima e
// embaixo (medida: de 4px a 48px entre os 75 sprites de rocha). O jogo ancora
// os objetos pela BASE — `setOrigin(0.5, 1)` — então essa folga não é neutra:
// ela vira espaço vazio entre o rodapé da peça e o chão, e a peça passa a
// flutuar por um valor que depende da arte, não do jogo.
//
// A boca da caverna NÃO é tratada aqui. Ela virou uma arte por bioma, e quem corta
// as seis é `scripts/trim-entrances.mjs` — que também as reduz, porque a arte de
// origem tem 1244px de largura para uma peça que ocupa 230px na tela.
//
// Depois de aparar, o script imprime as dimensões do arquivo. O teste em
// `test/props.test.mjs` compara com o que o `CaveScene` assume, que é a forma
// de uma medição parada no código não voltar a divergir da arte.
import { writeFile } from 'node:fs/promises';

import { readPng } from './png.mjs';
import { encodePng } from './png-encode.mjs';

// A boca saiu daqui: ela virou uma arte por bioma, e quem corta as seis é
// `scripts/trim-entrances.mjs`. Este script cuida só do que ainda é peça única.
const ALVOS = [{ arquivo: 'public/assets/pickaxe_lvl1.png', nome: 'picareta' }];

// O limiar é 8, o mesmo do fatiador: a borda de uma arte pintada tem o alfa
// subindo devagar, e um limiar baixo puxa para dentro um halo quase
// invisível que, depois da reamostragem, vira franja suja.
const LIMIAR = 8;

for (const alvo of ALVOS) {
  const img = await readPng(alvo.arquivo);
  const { width: W, height: H, channels: C, data: D } = img;

  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (D[(y * W + x) * C + 3] > LIMIAR) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    console.log(`${alvo.nome}: ${alvo.arquivo} está totalmente transparente. Nada foi escrito.`);
    process.exitCode = 1;
    continue;
  }

  const largura = maxX - minX + 1;
  const altura = maxY - minY + 1;
  const saida = new Uint8ClampedArray(largura * altura * 4);

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const de = ((minY + y) * W + (minX + x)) * C;
      const para = (y * largura + x) * 4;
      saida[para] = D[de];
      saida[para + 1] = D[de + 1];
      saida[para + 2] = D[de + 2];
      saida[para + 3] = D[de + 3];
    }
  }

  await writeFile(alvo.arquivo, encodePng(largura, altura, saida));

  console.log(
    `${alvo.nome.padEnd(9)} ${alvo.arquivo}  ${W}x${H} -> ${largura}x${altura}  `
      + `folga ${minY} cima / ${H - 1 - maxY} baixo / ${minX} esq / ${W - 1 - maxX} dir  `
      + `proporcao ${(largura / altura).toFixed(4)}`
  );
}
