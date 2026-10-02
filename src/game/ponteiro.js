/**
 * O ponteiro dos menus, movido pelo analógico esquerdo.
 *
 * ## O que este módulo é, e o que ele não é
 *
 * Ele **não** transforma o analógico em mouse dentro da caverna. Aí o jogo se joga
 * clicando numa pedra, e um clique em coordenada de tela erra por meio pixel — e
 * meio pixel numa aresta de pedra isométrica é clicar na pedra errada ou em nada.
 * Isso já está escrito no `cursor.js` e a decisão continua de pé: na caverna o
 * cursor anda de tile em tile, que é a unidade em que o jogo pensa.
 *
 * Nos menus, ao contrário, tudo é DOM: um ponteiro por cima das caixas é um mouse
 * de verdade, e é o que este módulo faz.
 *
 * ## Por que a sensibilidade é um número, e não um interruptor
 *
 * Um mouse tem DPI: Sensitivity, e quem joga procura um valor que sirva para o
 * monitor e para o braço. Um analógico tem curso, e o curso é fixo. A única coisa
 * que falta para o ponteiro "ser um mouse" é a escala entre o deflection e o
 * deslocamento — que é exatamente o que a sensibilidade mede.
 *
 * ## A velocidade é linear no deflection
 *
 * Curva quadrada daria controle fino muito lento, e o ponteiro ficaria colado na
 * tela quando se quer precisão. Linear é previsível: dobrar a velocidade dobra o
 * deslocamento, e a sensibilidade faz exatamente isso. Quem quiser fineza usa
 * menos força, que é o que o dedo faz de graça.
 */

/**
 * Quanto da seta fica dentro da área do jogo, em pixels.
 *
 * O desenho da seta tem a ponta no canto superior esquerdo do próprio elemento.
 * Sem esta margem, encostar na borda da tela punha a ponta em zero e deixava o
 * resto da seta do lado de fora.
 */
export const MARGEM_DO_PONTEIRO_PX = 10;

/**
 * O tile que a seta está mirando, ou `null` se não dá para mirar.
 *
 * ## Por que a decisão mora aqui, e não na cena
 *
 * Porque a cena do Phaser não roda no Node, e uma mira que só existe dentro dela
 * não tem teste: ela ficaria correta por inspeção e erraria em silêncio. Aqui
 * ficam as três decisões — o tile existe, cabe no mapa, e é inteiro — e a cena
 * passa só o ponto que o Phaser sabe medir.
 *
 * ## O que NÃO é a mira
 *
 * Não é um clique em coordenada de tela. Um clique erra por meio pixel, e meio pixel
 * numa aresta de pedra isométrica é clicar na pedra errada ou em nada. A mira
 * **diz em que tile se está**, e a ação continua resolvendo um tile inteiro. A
 * precisão volta a ser do grid, que é a unidade em que o jogo pensa.
 *
 * @param {object} mundo o ponto do mundo, já convertido pela câmera
 * @param {object} opcoes
 * @param {{x: number, y: number}} opcoes.origem a origem da projeção isométrica
 * @param {{tileWidth: number, tileHeight: number}} opcoes.metricas
 * @param {number} opcoes.largura largura do mapa, em tiles
 * @param {number} opcoes.altura altura do mapa, em tiles
 * @param {(col: number, row: number) => boolean} opcoes.existe o que o mapa aceita
 * @returns {{col: number, row: number}|null}
 */
export function tileSobOPonteiro(mundo, { origem, metricas, largura, altura, existe }) {
  if (!Number.isFinite(mundo?.x) || !Number.isFinite(mundo?.y)) return null;
  if (!Number.isFinite(largura) || !Number.isFinite(altura)) return null;
  if (largura <= 0 || altura <= 0) return null;

  const { col, row } = fromIso(
    mundo.x,
    mundo.y,
    origem?.x ?? 0,
    origem?.y ?? 0,
    metricas?.tileWidth,
    metricas?.tileHeight
  );

  const alvoCol = Math.round(col);
  const alvoRow = Math.round(row);

  if (alvoCol < 0 || alvoCol >= largura || alvoRow < 0 || alvoRow >= altura) return null;
  if (typeof existe === 'function' && !existe(alvoCol, alvoRow)) return null;

  return { col: alvoCol, row: alvoRow };
}

import { fromIso } from './config.js';

/** A sensibilidade que o jogo assume, e que o menu chama de "padrão". */
export const SENSIBILIDADE_PADRAO = 1;

/** Os valores que o menu oferece. Um número solto deixaria o estado aceitar lixo. */
export const SENSIBILIDADES = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

/**
 * A velocidade do ponteiro com o analógico no fim do curso, em pixels por segundo.
 *
 * São 620, e não os 1200 da primeira versão. A primeira atravessava uma tela de
 * 1000px de altura em menos de um segundo — rápido demais para mirar: entre dois
 * botões vizinhos já passava um quarto de tela, e parar em cima de um alvo exigia
 * acertar o empurrão no meio do curso.
 *
 * Com 620, o curso inteiro leva quase dois segundos de ponta a ponta, e meio
 * empurrão dá o passo curto que permite assentar em cima de algo. Quem quiser
 * atravessar a tela depressa sobe a sensibilidade nas configurações — que é para
 * isso que a sensibilidade existe.
 */
export const VELOCIDADE_MAXIMA_PX_S = 620;

/**
 * O deslocamento do ponteiro neste quadro.
 *
 * `dt` em segundos, e a saída em pixels. Separar os dois é o que mantém a
 * velocidade igual em monitor de 60Hz e de 144Hz: somar pixels por quadro faria o
 * ponteiro andar mais rápido na tela maior.
 *
 * Devolve `{ x, y }` já com a escala da sensibilidade aplicada.
 */
export function deslocamentoDoPonteiro(eixo, dt, sensibilidade = SENSIBILIDADE_PADRAO) {
  const { x = 0, y = 0 } = eixo ?? {};
  const escala = Number.isFinite(sensibilidade) ? sensibilidade : SENSIBILIDADE_PADRAO;
  const segundos = Number.isFinite(dt) && dt > 0 ? dt : 0;

  if (segundos === 0) return { x: 0, y: 0 };

  const velocidade = VELOCIDADE_MAXIMA_PX_S * escala;

  return { x: x * velocidade * segundos, y: y * velocidade * segundos };
}

/**
 * A posição depois do deslocamento, presa à janela.
 *
 * Presar é o que impede o ponteiro de sumir: uma posição fora da tela não volta
 * sozinha, e quem empurrou o analógico para o canto ficaria sem cursor até soltar.
 *
 * O `margem` existe porque o ponteiro tem uma ponta que aponta para o alto e à
 * esquerda — o desenho é uma seta, e a ponta tem que poder tocar a borda.
 */
export function limitarPonteiro(posicao, deslocamento, limites, margem = 0) {
  const x = (posicao?.x ?? 0) + (deslocamento?.x ?? 0);
  const y = (posicao?.y ?? 0) + (deslocamento?.y ?? 0);

  const largura = limites?.largura ?? 0;
  const altura = limites?.altura ?? 0;

  // Janela sem tamanho não limita, e esta é a diferença entre não fazer nada e
  // fazer a coisa errada: `innerWidth` vale 0 nos quadros em que o layout ainda
  // não existe, e limitar por 0 prenderia o ponteiro no canto — de onde ele sairia
  // só quando a pessoa o levasse de volta para lá.
  if (largura <= 0 || altura <= 0) return { x, y };

  return {
    x: limitar(x, margem, largura - margem),
    y: limitar(y, margem, altura - margem)
  };
}

function limitar(valor, minimo, maximo) {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || maximo < minimo) return valor;

  return Math.min(Math.max(valor, minimo), maximo);
}

/** O ponteiro andou alguma coisa, ou é a diferença entre parado e preso? */
export function moveu(deflexao) {
  const { x = 0, y = 0 } = deflexao ?? {};

  return Math.hypot(x, y) > 0;
}

/**
 * A sensibilidade do passo seguinte, para os botões do menu.
 *
 * Devolve um valor da lista, e não um número aritmético: um `1 + 0.25` permitiria
 * chegar em `1.25`, `1.5`, `1.75`… e o estado passaria a guardar valores que o
 * menu não consegue mostrar. Bater na ponta é o que mantém a lista honesta.
 */
export function proximaSensibilidade(atual, passo) {
  const valor = Number.isFinite(atual) ? atual : SENSIBILIDADE_PADRAO;
  const indice = SENSIBILIDADES.indexOf(valor);

  // Um valor fora da lista — storage editado à mão, ou um padrão antigo — entra
  // na lista pelo mais próximo, em vez de ficar sem botão nenhum.
  const base = indice >= 0 ? indice + passo : SENSIBILIDADES.indexOf(SENSIBILIDADE_PADRAO);
  const alvo = limitar(base, 0, SENSIBILIDADES.length - 1);

  return SENSIBILIDADES[alvo];
}

/** A sensibilidade em porcentagem, que é como o menu mostra. */
export function porcentagemDaSensibilidade(valor) {
  const numero = Number.isFinite(valor) ? valor : SENSIBILIDADE_PADRAO;

  return Math.round(numero * 100);
}