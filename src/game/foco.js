/**
 * Navegação espacial dos menus.
 *
 * ## O problema
 *
 * Todas as telas do jogo são DOM React por cima do canvas: jogos salvos,
 * configurações, seleção de bioma, pausa, idioma, loja, a carta do final. O
 * controle do Phaser move o cursor do canvas e não sabe que um `<button>` existe,
 * então o controle não consegue focar um menu por conta própria.
 *
 * A camada que resolve isto — camada de foco — é a que está aqui.
 *
 * ## Por que foco de verdade, e não um índice virtual
 *
 * A alternativa seria manter um índice e desenhar o foco à mão. É mais simples de
 * escrever e errado por dois motivos: o `Tab` do teclado passaria a andar por um
 * lugar e o controle por outro, e o leitor de tela não veria nada.
 *
 * Usando o foco real do DOM, os dois esquemas dividem o mesmo estado. Quem joga
 * de teclado, quem joga de controle e quem usa leitor de tela veem a mesma coisa,
 * e o anel de foco é `:focus-visible` — o mesmo que o navegador já faz.
 *
 * ## Por que espacial, e não em linha
 *
 * As telas não são listas. A seleção de bioma é uma grade de 2 colunas, a
 * configuração tem interruptores e linhas de texto alternadas, e a loja tem
 * linhas com dois botões. Navegar em linha faria o foco pular da coluna direita
 * para a seguinte da esquerda, e a pessoa teria de ir e voltar para atravessar a
 * tela.
 *
 * ## Por que isso é uma função pura
 *
 * Porque a parte difícil — "qual é o melhor alvo para cima, a partir daqui" — é
 * aritmética com caixas, e não depende de nada do DOM além dos retângulos. Recebendo
 * uma lista de `{ id, x, y, largura, altura }` e devolvendo um `id`, a função é
 * testável sem navegador, sem `getBoundingClientRect` e semesperar layout.
 *
 * É a mesma razão de `saves.js` receber o storage como argumento: o que a tela faz
 * fica na tela, e o que é decisão fica num módulo que se executa no teste.
 */

/** Espera antes da primeira repetição ao segurar a direção, em ms. */
export const ESPERA_REPETICAO_MS = 380;

/** Intervalo entre repetições seguintes, em ms. */
export const INTERVALO_REPETICAO_MS = 110;

/**
 * Os alvos na direção pedida, do melhor para o pior.
 *
 * A desempate é deliberado e não é "`menor distância`": é o ângulo primeiro, e
 * só depois a distância. Num menu como a seleção de bioma, o alvo duas linhas
 * acima na mesma coluna está a menos de 30px, e o alvo da coluna de cima a 300px.
 * Vence o ângulo, e a desempate da distância escolhe entre os dois quando os
 * ângulos empatam.
 *
 * Um alvo tem de estar **na direção pedida**: o centro dele precisa estar à
 * frente, e não ao lado. Sem este teste, apertar "cima" numa tela de duas linhas
 * poderia escolher o vizinho da direita, que está mais perto mas não está acima.
 */
export function ordenarPorDirecao(alvos, de, direcao, tolerancia = 12) {
  if (!de) return [...alvos];

  const centroDe = { x: de.x + de.largura / 2, y: de.y + de.altura / 2 };

  const pontuar = (alvo) => {
    const centro = { x: alvo.x + alvo.largura / 2, y: alvo.y + alvo.altura / 2 };
    const dx = centro.x - centroDe.x;
    const dy = centro.y - centroDe.y;

    let aoLongo = 0;
    let atravessado = 0;
    let sentido = 0;

    if (direcao === 'cima') {
      aoLongo = -dy;
      atravessado = Math.abs(dx);
      sentido = dy < 0 ? 1 : 0;
    } else if (direcao === 'baixo') {
      aoLongo = dy;
      atravessado = Math.abs(dx);
      sentido = dy > 0 ? 1 : 0;
    } else if (direcao === 'esquerda') {
      aoLongo = -dx;
      atravessado = Math.abs(dy);
      sentido = dx < 0 ? 1 : 0;
    } else if (direcao === 'direita') {
      aoLongo = dx;
      atravessado = Math.abs(dy);
      sentido = dx > 0 ? 1 : 0;
    }

    // Fora da direção, ou alinhado demais com o eixo errado para ser um passo.
    if (!sentido || aoLongo < tolerancia) return null;

    // A distância é o comprimento do passo, e não a "distância em linha":
    // atravessar uma coluna larga é um passo válido e não pode ser penalizado
    // como se fossem quatro.
    const comprimento = Math.hypot(aoLongo, atravessado);
    const desvio = atravessado / comprimento;

    return { alvo, comprimento, desvio };
  };

  return alvos
    .map(pontuar)
    .filter(Boolean)
    .sort((a, b) => a.desvio - b.desvio || a.comprimento - b.comprimento)
    .map((p) => p.alvo);
}

/**
 * O alvo na direção pedida, ou `null`.
 *
 * Devolve o **alvo**, e não o `id` dele. Escolher pelo `id` exigia que todo botão
 * tivesse um `id` único, e quase nenhum tem: no jogo real o `id` é `''` em todos
 * eles, e `alvos.find((alvo) => alvo.id === '')` devolvia o primeiro da lista — de
 * modo que toda direção levava ao mesmo botão. O `id` continua no alvo, para
 * relatar; escolher é pelo elemento.
 *
 * Devolve `null` em vez do alvo atual quando não há para onde ir, e quem chama
 * trata: manter o foco onde está é o certo, e trocá-lo por um vizinho aleatório é
 * pior.
 */
export function proximoAlvo(alvos, de, direcao, tolerancia) {
  const ordenados = ordenarPorDirecao(alvos, de, direcao, tolerancia);

  if (ordenados.length === 0) return null;

  return ordenados[0];
}

/**
 * O primeiro alvo da tela, para quando o foco ainda não está em lugar nenhum.
 *
 * A ordem é de leitura: cima, depois esquerda, e não a ordem do DOM. Numa grade
 * de duas colunas isso põe o foco no primeiro card, e não no último que entrou no
 * DOM.
 */
export function primeiroAlvo(alvos) {
  if (!alvos || alvos.length === 0) return null;

  return [...alvos].sort((a, b) => a.y - b.y || a.x - b.x)[0];
}

/**
 * Alvos alcançáveis agora.
 *
 * A lista muda conforme as telas abrem e fecham, e um alvo escondido que ainda
 * recebe foco é o pior bug possível de navegação: a pessoa aperta e nada acontece,
 * ou pior, o foco vai para um botão de uma tela que já não está na tela.
 */
export function alvosAlcancaveis(raiz) {
  if (!raiz || typeof raiz.querySelectorAll !== 'function') return [];

  const seletor = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const elementos = Array.from(raiz.querySelectorAll(seletor));

  return elementos
    .filter((elemento) => {
      // `offsetParent` é `null` em `display: none` e em ancestral oculto, e é
      // exatamente a checagem de "isto está na tela agora" que o CSS não dá.
      if (!elemento.offsetParent && getComputedStyle(elemento).position !== 'fixed') return false;
      if (elemento.getAttribute('aria-hidden') === 'true') return false;

      const caixa = elemento.getBoundingClientRect();

      return caixa.width > 0 && caixa.height > 0;
    })
    .map((elemento) => {
      const caixa = elemento.getBoundingClientRect();

      return {
        // O `id` é para **relatar** — o HUD e o teste — e não para escolher alvo.
        // Ele é `''` na maioria dos botões do jogo, porque quase nenhum tem `id` no
        // JSX, e usá-lo para escolher alvo fazia toda navegação cair no primeiro
        // botão da tela, qualquer que fosse a direção.
        id: elemento.dataset.focoId ?? elemento.id ?? '',
        elemento,
        x: caixa.left,
        y: caixa.top,
        largura: caixa.width,
        altura: caixa.height
      };
    });
}

/**
 * O alvo alcançado a partir de um elemento qualquer, andando para cima.
 *
 * ## Por que precisa subir
 *
 * `document.elementFromPoint` devolve o elemento mais **profundo** naquele ponto,
 * e o mais profundo quase nunca é o botão: é o `<span>` do rótulo dentro dele.
 * Só que um mouse funciona — porque o navegador entrega o clique ao ancestral
 * interativo mais próximo, e não ao nó que estava embaixo do cursor.
 *
 * Sem esta subida, o ponteiro passava por cima de todos os botões do menu e o foco
 * não ia com ele. Era o mesmo defeito do `id`, por um caminho diferente: a
 * navegação acertava o alvo e perdia na hora de usá-lo.
 *
 * ## Por que um limite de profundidade
 *
 * A caminhada para no corpo do documento, e para também depois de um número de
 * passos. Sem o limite, um DOM com ciclo de pais — que não existe num navegador
 * normal, mas existe num teste malfeito — deixaria isto rodando.
 *
 * @param {object[]} alvos a lista de `alvosAlcancaveis`
 * @param {object} elemento o nó onde o ponteiro está, ou `null`
 * @returns {object|null} o alvo, ou `null` quando não há nada embaixo
 */
export function alvoSobElemento(alvos, elemento, limite = 32) {
  if (!elemento) return null;

  let no = elemento;

  for (let passo = 0; passo < limite && no; passo += 1) {
    const achado = alvos.find((alvo) => alvo.elemento === no);

    if (achado) return achado;

    no = no.parentNode ?? no.parentElement ?? null;
  }

  return null;
}

/**
 * Decide se a direção deve repetir, e devolve o novo estado da repetição.
 *
 * Separado do objeto que a aplica de propósito: isto são três tempos — antes da
 * espera, na virada, e entre repetições — e a teste precisa dos três sem ter de
 * construir a navegação inteira.
 */
export function passoDeRepeticao(estado, agora, { espera = ESPERA_REPETICAO_MS, intervalo = INTERVALO_REPETICAO_MS } = {}) {
  // `Number.isFinite` e não `!estado?.desde`: um relógio que começa em 0 produz
  // `desde: 0`, que é falsy, e o teste de "primeira vez" dispararia a cada quadro
  // — a navegação andaria sem parar. No navegador `Date.now()` nunca é 0, o que é
  // exatamente o tipo de coisa que não se percebe até um teste rodar com
  // relógio controlado.
  if (!estado || !Number.isFinite(estado.desde)) return { repetir: true, desde: agora, repetiuEm: null };

  const desdeRepeticao = agora - estado.desde;

  if (desdeRepeticao < espera) return { repetir: false, desde: estado.desde, repetiuEm: estado.repetiuEm };

  if (!Number.isFinite(estado.repetiuEm)) return { repetir: true, desde: estado.desde, repetiuEm: agora };

  const desdeUltima = agora - estado.repetiuEm;

  if (desdeUltima < intervalo) return { repetir: false, desde: estado.desde, repetiuEm: estado.repetiuEm };

  return { repetir: true, desde: estado.desde, repetiuEm: agora };
}

/**
 * Cria o navegador de foco por controle.
 *
 * Igual ao leitor: o DOM entra como argumento e o relógio também, para o teste
 * mandar o tempo.
 */
export function criarNavegadorDeFoco({ raiz, elementoAtivo, aplicarFoco, agora } = {}) {
  const relogio = typeof agora === 'function' ? agora : () => Date.now();
  const repeticoes = { cima: null, baixo: null, esquerda: null, direita: null };

  /** O alvo com o foco agora, ou `null` se o foco estiver fora da lista. */
  const alvoAtual = () => {
    const alvos = alvosAlcancaveis(raiz);
    const ativo = typeof elementoAtivo === 'function' ? elementoAtivo() : null;
    const achado = alvos.find((alvo) => alvo.elemento === ativo);

    return achado ?? null;
  };

  return {
    alvos() {
      return alvosAlcancaveis(raiz);
    },

    /** Põe o foco no primeiro alvo, se ainda não houver nenhum. */
    focarPrimeiro() {
      const alvo = primeiroAlvo(alvosAlcancaveis(raiz));

      if (alvo?.elemento?.focus) alvo.elemento.focus();

      return alvo?.id || null;
    },

    /**
     * Move o foco na direção.
     *
     * Devolve `true` quando o foco andou. Devolver `false` é o que faz a
     * repetição parar numa borda da tela, em vez de ficar quicando.
     */
    mover(direcao) {
      const alvos = alvosAlcancaveis(raiz);
      if (alvos.length === 0) return false;

      const alvo = proximoAlvo(alvos, alvoAtual(), direcao);

      if (!alvo?.elemento?.focus) return false;

      alvo.elemento.focus();
      if (typeof aplicarFoco === 'function') aplicarFoco(alvo.elemento);

      return true;
    },

    /**
     * Move com repetição, a partir da direção dominante.
     *
     * Chamar uma vez por quadro. A primeira vez que a direção aparece, anda
     * sempre — não há espera antes do primeiro passo, porque quem aperta e quer
     * um passo quer um passo, e esperar 380ms para o primeiro passo é a sensação
     * de controle quebrado mais comum em navegação por controle.
     *
     * A direção vem como uma só, já resolvida: um menu responde a um passo por
     * vez, e decidir aqui qual das quatro vale tiraria a decisão de dentro de um
     * laço, onde ela ficaria escondida.
     */
    moverComRepeticao(direcaoDominante, agoraMs = relogio()) {
      if (!direcaoDominante) {
        for (const direcao of Object.keys(repeticoes)) repeticoes[direcao] = null;
        return false;
      }

      // A direção que mudou zera a repetição das outras. Sem isto, soltar o
      // "cima" e segurar o "baixo" direto deixaria a repetição do "baixo"
      // esperando o tempo do "cima", e o primeiro passo para baixo atrasaria.
      for (const direcao of Object.keys(repeticoes)) {
        if (direcao !== direcaoDominante) repeticoes[direcao] = null;
      }

      const passo = passoDeRepeticao(repeticoes[direcaoDominante], agoraMs);
      repeticoes[direcaoDominante] = passo;

      if (!passo.repetir) return false;

      return this.mover(direcaoDominante);
    },

    /** Ativa o alvo com foco. */
    ativar() {
      const alvo = alvoAtual();

      if (!alvo?.elemento) return false;

      alvo.elemento.click();

      return true;
    },

    /**
     * O `id` do alvo com foco, para o teste e para o HUD.
     *
     * `|| null` e não `?? null`: quase nenhum botão do jogo tem `id`, e devolver
     * `''` seria devolver um id que não identifica nada.
     */
    atual() {
      return alvoAtual()?.id || null;
    }
  };
}
