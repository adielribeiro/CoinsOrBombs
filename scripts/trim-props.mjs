// Apara a arte das peças soltas do jogo: a picareta e a escada da saída.
//
//   node scripts/trim-props.mjs
//
// Existe pela mesma razão que o fatiador de rochas recorta: a arte de origem vem
// CENTRALIZADA num canvas quadrado, com folga transparente em volta. O jogo ancora
// as peças no chão, então essa folga não é neutra — ela vira espaço vazio entre o
// rodapé da peça e o chão, e a peça passa a flutuar por um valor que depende da
// arte, não do jogo. Para a escada isso são 300px de folga acima e 292px abaixo
// num canvas de 1254px.
//
// A boca da caverna NÃO é tratada aqui. Ela virou uma arte por bioma, e quem corta
// as seis é `scripts/trim-entrances.mjs`. O recorte e a redução são os mesmos, e
// estão em `scripts/recorte.mjs`.
//
// ## Por que a escada é reduzida e a picareta não
//
// A picareta entra em 140x142 e é a arte que já está: aparela, e pronto. A escada
// entra em 1254x1254 para uma peça que ocupa 54px na tela — são 23x mais pixels do
// que o jogo mostra, e um PNG de 757 KB para um pedaço de 54x36px.
//
// Depois de aparar, o script imprime as dimensões de cada arquivo. O teste em
// `test/props.test.mjs` compara com o que o `CaveScene` assume, que é a forma de
// uma medição parada no código não voltar a divergir da arte.
import { copyFile, readFile, writeFile } from 'node:fs/promises';

import { readPng } from './png.mjs';
import { encodePng } from './png-encode.mjs';
import { recorteDoConteudo, reduzPorCaixa } from './recorte.mjs';

/**
 * As peças soltas, e de onde cada uma vem.
 *
 * `origem` ausente significa que a arte já está no lugar e é aparada no próprio
 * lugar — que é o caso da picareta. `origem` preenchida significa que a arte é
 * copiada de fora primeiro, e só depois aparada: sem a cópia, um `trim` rodado por
 * engano sobre uma arte já processada a reduziria de novo, e o PNG ficaria
 * irreprodutível.
 */
const ALVOS = [
  { arquivo: 'public/assets/pickaxe_lvl1.png', nome: 'picareta' },
  {
    nome: 'escada',
    origem: 'C:/Users/adielvale/Desktop/titles/escada saida.png',
    arquivo: 'public/assets/exit_ladder.png',
    largura: 160
  }
];

for (const alvo of ALVOS) {
  if (alvo.origem) {
    try {
      await copyFile(alvo.origem, alvo.arquivo);
    } catch {
      console.log(`${alvo.nome}: ${alvo.origem} não existe. Nada foi escrito.`);
      process.exitCode = 1;
      continue;
    }
  }

  const antes = (await readFile(alvo.arquivo)).length;
  const img = await readPng(alvo.arquivo);
  const { width: W, height: H } = img;
  const recorte = recorteDoConteudo(img);

  if (!recorte) {
    console.log(`${alvo.nome}: ${alvo.arquivo} está totalmente transparente. Nada foi escrito.`);
    process.exitCode = 1;
    continue;
  }

  let saida;
  let largura;
  let altura;

  if (alvo.largura && recorte.largura > alvo.largura) {
    largura = alvo.largura;
    const reduzida = reduzPorCaixa(img, recorte, largura);
    saida = reduzida.saida;
    altura = reduzida.alturaDestino;
  } else {
    // Sem alvo de redução, ou a arte já é menor que ele: copia o recorte cru.
    largura = recorte.largura;
    altura = recorte.altura;
    saida = new Uint8ClampedArray(largura * altura * 4);

    for (let y = 0; y < altura; y += 1) {
      for (let x = 0; x < largura; x += 1) {
        const de = ((recorte.y + y) * W + (recorte.x + x)) * img.channels;
        const para = (y * largura + x) * 4;
        saida[para] = img.data[de];
        saida[para + 1] = img.data[de + 1];
        saida[para + 2] = img.data[de + 2];
        saida[para + 3] = img.data[de + 3];
      }
    }
  }

  const png = encodePng(largura, altura, saida);
  await writeFile(alvo.arquivo, png);

  console.log(
    `${alvo.nome.padEnd(9)} ${alvo.arquivo.padEnd(32)} ${W}x${H} -> ${largura}x${altura}  `
      + `folga ${recorte.y} cima / ${H - recorte.y - recorte.altura} baixo `
      + `/ ${recorte.x} esq / ${W - recorte.x - recorte.largura} dir  `
      + `proporcao ${(largura / altura).toFixed(4)}  `
      + `${Math.round(antes / 1024)} KB -> ${Math.round(png.length / 1024)} KB`
  );
}
