import { fromIso } from './config.js';

/**
 * O ponteiro do jogo, movido pelo analógico esquerdo.
 *
 * ## Onde a seta anda, e o que ela aciona
 *
 * Em **toda** tela. Nos menus e nos avisos tudo é DOM, e a seta é um mouse de
 * verdade: o alvo embaixo dela é o que o `A` aciona, como o mouse aciona.
 *
 * Na caverna o mundo é o canvas do Phaser, e aí a seta **mira**: o cursor de tile
 * segue o tile que está embaixo dela, e o `A` quebra a pedra mirada. A mira é por
 * tile e não por pixel, e o motivo é o mesmo que está escrito no `cursor.js`: um
 * clique em coordenada de tela erra por meio pixel, e meio pixel numa aresta de
 * pedra isométrica é clicar na pedra errada ou em nada. A precisão do jogo continua
 * sendo a do grid, que é a unidade em que o jogo pensa.
 *
 * ## Por que a sensibilidade é um número, e não um interruptor
 *
 * Um mouse tem DPI, e quem joga procura um valor que sirva para o monitor e para o
 * braço. Um analógico tem curso, e o curso é fixo. A única coisa que falta para a
 * seta "ser um mouse" é a escala entre o empurrão e o deslocamento — e essa escala
 * não é um número só.
 *
 * ## Por que são dois controles
 *
 * **Sensibilidade** é a resposta embaixo: quanto anda com um empurrão pequeno. É o
 * controle da mira fina.
 *
 * **Velocidade** é o teto: quanto anda com o analógico no fim do curso. É o
 * controle do deslocamento longo, e é o que faz atravessar a tela sem dar vinte
 * empurrões.
 *
 * Se fossem um número só, quem quisesse atravessar a tela depressa acabaria com a
 * mira fina também acelerada — e voltaria ao problema que a velocidade baixa
 * resolveu.
 *
 * ## A resposta é linear no empurrão
 *
 * Curva quadrada daria controle fino muito lento, e a seta ficaria colada na tela
 * quando se quer precisão. Linear é previsível: dobrar a escala dobra o
 * deslocamento. Quem quiser fineza usa menos empurrão, que é o que o dedo faz de
 * graça.
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

/** A sensibilidade que o jogo assume: o quanto o ponteiro responde ao empurrão. */
export const SENSIBILIDADE_PADRAO = 1;

/** A velocidade que o jogo assume: o teto de quanto o ponteiro anda por segundo. */
export const VELOCIDADE_PADRAO = 1;

/** Os valores que o menu oferece. Um número solto deixaria o estado aceitar lixo. */
export const SENSIBILIDADES = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

/** Os valores de velocidade. */
export const VELOCIDADES = [0.5, 0.75, 1, 1.5, 2];

/**
 * A velocidade do ponteiro com o analógico no fim do curso, em pixels por segundo.
 *
 * São 620, e não os 1200 da primeira versão. A primeira atravessava uma tela de
 * 1000px de altura em menos de um segundo — rápido demais para mirar: entre dois
 * botões vizinhos já passava um quarto de tela, e parar em cima de um alvo exigia
 * acertar o empurrão no meio do curso.
 */
export const VELOCIDADE_MAXIMA_PX_S = 620;

/**
 * O deslocamento do ponteiro neste quadro.
 *
 * `dt` em segundos, e a saída em pixels. Separar os dois é o que mantém a velocidade
 * igual em monitor de 60Hz e de 144Hz: somar pixels por quadro faria o ponteiro
 * andar mais rápido na tela maior.
 *
 * ## Por que sensibilidade e velocidade são dois controles, e não um
 *
 * São duas coisas de natureza diferente, e uma pessoa regula as duas em momentos
 * diferentes.
 *
 * A **sensibilidade** é a resposta embaixo: quanto anda com um empurrão pequeno. É
 * o controle da mira fina, e é o que faz assentar em cima de um alvo.
 *
 * A **velocidade** é o teto: quanto anda com o analógico no fim do curso. É o
 * controle do deslocamento longo, e é o que faz atravessar a tela sem dar vinte
 * empurrões.
 *
 * Se fossem um número só, quem quisesse atravessar a tela depressa acabaria com a
 * mira fina também acelerada — e voltaria ao problema que a velocidade baixa
 * resolveu.
 *
 * ## A conta
 *
 * A resposta é linear no empurrão (`bruto * base * sensibilidade`) e o teto corta
 * o resultado (`no máximo base * velocidade`). No padrão, com qualquer empurrão,
 * a resposta fica abaixo do teto e o resultado é o de antes: a mudança não mexe em
 * quem já estava com o padrão.
 *
 * @param {object} eixo o analógico, já fora da zona morta
 * @param {number} dt segundos desde o quadro anterior
 * @param {object} [opcoes]
 * @param {number} [opcoes.sensibilidade] 1 é o padrão
 * @param {number} [opcoes.velocidade] 1 é o padrão
 * @returns {{x: number, y: number}} pixels deste quadro
 */
export function deslocamentoDoPonteiro(eixo, dt, opcoes = {}) {
  const { x = 0, y = 0 } = eixo ?? {};

  const sensibilidade = Number.isFinite(opcoes.sensibilidade)
    ? opcoes.sensibilidade
    : SENSIBILIDADE_PADRAO;
  const velocidade = Number.isFinite(opcoes.velocidade) ? opcoes.velocidade : VELOCIDADE_PADRAO;
  const segundos = Number.isFinite(dt) && dt > 0 ? dt : 0;

  if (segundos === 0) return { x: 0, y: 0 };

  const bruto = Math.hypot(x, y);

  if (bruto === 0) return { x: 0, y: 0 };

  const resposta = bruto * VELOCIDADE_MAXIMA_PX_S * sensibilidade;
  const teto = VELOCIDADE_MAXIMA_PX_S * velocidade;
  const total = Math.min(resposta, teto);

  // Escalar o vetor pelo módulo do empurrão é o que aplica o teto: o resultado
  // tem velocidade `total`, e o `hypot` dos dois eixos dá exatamente isso.
  //
  // Normalizar pela `resposta` em vez do `bruto` seria quase a mesma divisão e
  // estaria errado: `resposta` já é uma velocidade, e usá-la como escala de um
  // componente devolve a velocidade ao quadrado. No padrão os dois caminhos dão o
  // mesmo número — é o que faz o erro passar por cima do teste mais óbvio — e é no
  // teto que eles divergem.
  //
  // E o empurrão fraco não zera: `total` é proporcional a `bruto`, então a razão dá
  // a mesma velocidade para qualquer força. A mira fina vive aí.
  const fator = total / bruto;

  return { x: x * fator * segundos, y: y * fator * segundos };
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
 * O próximo valor de uma lista, para o menu.
 *
 * ## Por que a lista e não a aritmética
 *
 * Um `atual + 0.25` permitiria chegar em `1.25`, `1.5`, `1.75`… e o estado
 * passaria a guardar valores que o menu não consegue mostrar — e que o dedo da
 * pessoa não consegue acertar de novo. Bater na ponta é o que mantém a lista
 * honesta.
 *
 * ## Por que um valor fora da lista não vira erro
 *
 * O estado vem do `localStorage`, que qualquer pessoa pode editar, e uma versão
 * antiga do jogo pode ter gravado um valor que hoje não existe. Desistir deixaria
 * a barra sem posição e o controle sem resposta nenhuma, sem aviso. Entrar pelo
 * mais próximo custa um valor errado em vez de um controle morto.
 */
function proximoValor(atual, passo, lista, padrao) {
  const valor = Number.isFinite(atual) ? atual : padrao;
  const indice = lista.indexOf(valor);
  const base = indice >= 0 ? indice + passo : lista.indexOf(padrao);

  return lista[Math.min(Math.max(base, 0), lista.length - 1)];
}

/**
 * Onde um valor está na lista, que é o que a barra mostra.
 *
 * Uma barra `range` trabalha com números, e a lista é a fonte da verdade. Convertir
 * os dois é o que impede que a barra mostre uma casa que não existe: sem esta
 * conversão, um `value` fora da lista deixaria o `input` sem posição — e um `range`
 * sem valor é um campo morto na tela.
 */
export function indiceDaLista(valor, lista) {
  const indice = lista.indexOf(valor);

  if (indice >= 0) return indice;

  // Valor fora da lista — `localStorage` editado à mão, ou um padrão antigo. Entra
  // pelo mais próximo, e não por 0: 0 é o valor mais lento das duas listas, e cair
  // nele sem querer é pior do que ficar perto do que a pessoa escolheu.
  let melhor = 0;
  let menor = Number.POSITIVE_INFINITY;

  for (let i = 0; i < lista.length; i += 1) {
    const distancia = Math.abs(lista[i] - (Number.isFinite(valor) ? valor : 1));

    if (distancia < menor) {
      menor = distancia;
      melhor = i;
    }
  }

  return melhor;
}

/**
 * O valor que um controle mostra, já preso à lista.
 *
 * Passa por `indiceDaLista` de propósito: os dois caminhos precisam cair no mesmo
 * lugar para o valor, e um "valor mais próximo" escrito duas vezes diverge na
 * primeira borda. O `padrao` é o que entra quando não há lista nenhuma.
 */
export function valorDaLista(valor, lista, padrao) {
  if (!Array.isArray(lista) || lista.length === 0) return padrao;

  return lista[indiceDaLista(valor, lista)];
}

/** A sensibilidade do passo seguinte. */
export function proximaSensibilidade(atual, passo) {
  return proximoValor(atual, passo, SENSIBILIDADES, SENSIBILIDADE_PADRAO);
}

/** A velocidade do passo seguinte. */
export function proximaVelocidade(atual, passo) {
  return proximoValor(atual, passo, VELOCIDADES, VELOCIDADE_PADRAO);
}

/** Um valor em porcentagem, que é como as barras mostram. */
export function porcentagem(valor, padrao) {
  const numero = Number.isFinite(valor) ? valor : padrao;

  return Math.round(numero * 100);
}

/** A sensibilidade em porcentagem. */
export function porcentagemDaSensibilidade(valor) {
  return porcentagem(valor, SENSIBILIDADE_PADRAO);
}

/** A velocidade em porcentagem. */
export function porcentagemDaVelocidade(valor) {
  return porcentagem(valor, VELOCIDADE_PADRAO);
}