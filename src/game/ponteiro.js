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

/** A sensibilidade que o jogo assume, e que o menu chama de "padrão". */
export const SENSIBILIDADE_PADRAO = 1;

/** Os valores que o menu oferece. Um número solto deixaria o estado aceitar lixo. */
export const SENSIBILIDADES = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

/**
 * A velocidade do ponteiro com o analógico no fim do curso, em pixels por segundo.
 *
 * 1200 px/s atravessa uma tela de 1000px de altura em menos de um segundo — rápido
 * para quem empurra até o fim, e o empurrão leve que dá a precisão fica perto de
 * 300 px/s, que é o ritmo de quem mira.
 */
export const VELOCIDADE_MAXIMA_PX_S = 1200;

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