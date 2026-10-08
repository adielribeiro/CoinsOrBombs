/**
 * Leitor de controle.
 *
 * ## O trabalho de verdade não é o controle
 *
 * Xbox, PlayStation e qualquer outro chegam no navegador pelo mesmo caminho:
 * `navigator.getGamepads()` devolve os mesmos índices de botão e eixo para todos
 * eles, porque o driver é do sistema operacional. Não existe "suportar Xbox" e
 * "suportar PlayStation" como tarefas separadas — existe ler um formato único e
 * dar nome aos botões.
 *
 * ## Por que os botões têm nome
 *
 * O índice 0 é o A do Xbox e o X do PlayStation; o 1 é B e Circle. Escrever `0`
 * espalhado pelo código amarra o jogo a um controle específico e obriga a trocar
 * tudo quando alguém jogar no outro. O nome (`confirmar`, `voltar`) é o que o
 * código usa, e a tradução para índice fica nesta tabela e em mais nenhum lugar.
 *
 * ## Borda: um clique não pode virar dois
 *
 * A navegação de menu é dirigida por *bordas* — "acabou de pressionar", não "está
 * pressionado". Sem isso, segurar o botão moveria o foco dezenas de vezes por
 * segundo, porque `getGamepads()` é consultado dezenas de vezes por segundo e o
 * estado "pressionado" não muda nenhuma delas.
 *
 * A borda vive até a próxima leitura, e nada mais precisa fazer: se `ler()` é
 * chamado uma vez por quadro, a borda dura exatamente um quadro. Foi por isso que
 * a primeira versão tinha um `consumir()` — e foi removido, porque ele resolvia um
 * problema que não existe e criava um: com ele, o primeiro consumidor marcava a
 * borda como lida e o segundo perdia o clique.
 *
 * ## Onde a repetição NÃO mora
 *
 * Segurar o direcional para correr quatro cards é o comportamento esperado em
 * qualquer console. Isso é aritmética com relógio, e ela vive em `foco.js`, ao
 * lado da navegação que a consome. Aqui fica só o que o controle disse.
 */

/** Ação nomeada para o índice de botão do Gamepad API. */
export const BOTAO = {
  confirmar: 0, // A no Xbox, X no PlayStation
  voltar: 1, // B no Xbox, Circle no PlayStation
  pular: 2, // X no Xbox, Square no PlayStation
  alternar: 3, // Y no Xbox, Triangle no PlayStation
  ombroEsquerdo: 4, // LB / L1
  ombroDireito: 5, // RB / R1
  gatilhoEsquerdo: 6, // LT / L2
  gatilhoDireito: 7, // RT / R2
  menu: 8, // Select / Share
  pausa: 9, // Start / Options
  dpadCima: 12,
  dpadBaixo: 13,
  dpadEsquerda: 14,
  dpadDireita: 15
};

/**
 * Zona morta do analógico.
 *
 * 0,28 e não 0,2 nem 0,35: analógicos com folga mecânica costumam dar entre 0,1
 * e 0,25 num centro mal centrado, e uma zona menor que isso vira uma seleção que
 * anda sozinha na tela de título — a pessoa abre o jogo e o foco já mudou antes
 * de ela tocar em qualquer coisa.
 */
export const ZONA_MORTA = 0.28;

/**
 * Aplica a zona morta e devolve o eixo normalizado.
 *
 * Devolve `{ x, y }` com cada componente entre -1 e 1, e comprimento 1 quando
 * está fora da zona morta. Normalizar o comprimento é o que faz um controle
 * digital se comportar como analógico: sem isto, uma leitura a 30% e outra a 90%
 * produziriam velocidades diferentes de navegação, e a pessoa sente a diferença
 * sem saber nomear.
 */
export function aplicarZonaMorta(x, y, zonaMorta = ZONA_MORTA) {
  const px = Number.isFinite(x) ? x : 0;
  const py = Number.isFinite(y) ? y : 0;
  const comprimento = Math.hypot(px, py);

  if (comprimento < zonaMorta) return { x: 0, y: 0 };

  return { x: px / comprimento, y: py / comprimento };
}

/** Os quatro direcionais, na ordem em que o d-pad os declara. */
export const DIRECOES = ['cima', 'baixo', 'esquerda', 'direita'];

/**
 * A direção dominante do analógico, ou `null`.
 *
 * Um menu responde a **uma** direção por passo. Empurrar o analógico na diagonal
 * não pode andar na diagonal: em grade, o caminho diagonal não leva a lugar nenhum
 * que alguém escolheria de propósito, e o foco saltaria um canto da tela.
 *
 * Vence o componente de maior módulo. A 45 graus exatos os dois empatam, e o
 * empate vai para o horizontal — que é a convenção de navegação de console, e a
 * que a pessoa espera de um empurrão levemente para o lado.
 *
 * O limiar é 0,5 do vetor já normalizado: abaixo disso o analógico está na zona
 * morta e a direção não existe.
 */
export function direcaoDominante(eixo) {
  const { x = 0, y = 0 } = eixo ?? {};

  if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return null;

  const horizontal = Math.abs(x) >= Math.abs(y);

  if (horizontal) return x > 0 ? 'direita' : 'esquerda';

  return y > 0 ? 'baixo' : 'cima';
}

/**
 * As ações de direção que o controle está pedindo neste quadro.
 *
 * `direcoes` tem **uma** direção verdadeira, e ela é a mesma de `dominante`. Não
 * é redundância: um menu responde a um passo por vez, e um conjunto com a
 * diagonal marcada ao lado da resolvida seria um convite a um consumidor futuro
 * ler a diagonal e andar na diagonal — o bug que o desempate existe para evitar.
 *
 * O d-pad é digital e já vem resolvido, e ele ganha do analógico quando os dois
 * estão apertados: ele é um clique, e ninguém empurra o analógico para o lado por
 * acidente em cima de um dedo já no direcional.
 */
export function direcoesDoQuadro(quadro) {
  const direcoes = { cima: false, baixo: false, esquerda: false, direita: false };

  if (!quadro?.conectado) return { ...direcoes, dominante: null };

  const botoes = quadro.botoes ?? {};

  let dominante = null;

  for (const direcao of DIRECOES) {
    const botao = `dpad${direcao[0].toUpperCase()}${direcao.slice(1)}`;
    if (botoes[botao]) dominante = direcao;
  }

  if (!dominante) dominante = direcaoDominante(quadro.eixo);

  if (dominante) direcoes[dominante] = true;

  return { ...direcoes, dominante };
}

/**
 * O vetor de cada direção, para quando a direção não tem intensidade.
 *
 * O analógico tem: empurrar mais longe mira mais longe. O direcional digital não tem
 * essa noção — ele é um botão, e `buttons` não guarda eixo. Um vetor unitário é a
 * unidade que o passo em grade já normaliza, então dá o mesmo passo que o analógico
 * empurrado até o fim.
 */
export const VETOR_POR_DIRECAO = {
  cima: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 }
};

/**
 * O deslocamento que este quadro pede, em tela.
 *
 * Preferimos o eixo quando ele existe, e caímos na direção quando não: é o que faz o
 * direcional digital andar o cursor da caverna. Sem esta queda, o digital aciona a
 * guarda de direção — `direcoes.dominante` vem dele — e entra no passo com um vetor
 * zerado, que não anda. O sintoma é um controle que parece quebrado e não dá erro
 * nenhum.
 *
 * `@returns {{x: number, y: number}}`
 */
export function deslocamentoDaDirecao(estado, forca = 1) {
  const x = estado?.eixo?.x ?? 0;
  const y = estado?.eixo?.y ?? 0;

  if (x !== 0 || y !== 0) return { x, y };

  const vetor = VETOR_POR_DIRECAO[estado?.direcoes?.dominante ?? ''] ?? null;

  return vetor ? { x: vetor.x * forca, y: vetor.y * forca } : { x: 0, y: 0 };
}

/**
 * Traduz um controle cru no estado de um quadro.
 *
 * Esta é a função que o teste exercita: recebe o que `getGamepads()` devolve e
 * devolve algo com nome, mais as bordas em relação ao quadro anterior.
 *
 * `anterior` é o estado do quadro passado. `agora` entra mesmo sem ser usado
 * direto, para a assinatura não mudar quando a repetição voltar para cá.
 */
export function lerQuadro({ pads = [], anterior = null } = {}) {
  const ativo = pads.find((pad) => pad && pad.connected) ?? null;
  const anteriorBotoes = anterior?.botoes ?? {};

  const botoes = {};

  for (const [acao, indice] of Object.entries(BOTAO)) {
    const botao = ativo?.buttons?.[indice];
    // `value` é o que os gatilhos analógicos reportam; `pressed` é o que os
    // demais reportam. Ler os dois pega Xbox, PlayStation e genéricos sem
    // adivinhar qual é qual.
    const bruto = botao?.value ?? (botao?.pressed ? 1 : 0);
    const valor = typeof bruto === 'number' ? bruto : bruto ? 1 : 0;

    botoes[acao] = valor > 0.5;
  }

  const bordas = {};

  for (const acao of Object.keys(botoes)) {
    if (botoes[acao] && !anteriorBotoes[acao]) bordas[acao] = true;
  }

  const eixo = aplicarZonaMorta(ativo?.axes?.[0] ?? 0, ativo?.axes?.[1] ?? 0);

  return {
    conectado: Boolean(ativo),
    botoes,
    bordas,
    eixo,
    direcoes: direcoesDoQuadro({ conectado: Boolean(ativo), botoes, eixo }),
    id: String(ativo?.id ?? '').slice(0, 80)
  };
}
/** Nomes conhecidos, para o HUD dizer o que está conectado. */
export const NOMES_CONHECIDOS = {
  'Xbox Controller': 'Xbox',
  'Xbox 360 Controller': 'Xbox 360',
  'Xbox Wireless Controller': 'Xbox',
  'DualShock 4': 'PlayStation 4',
  'DualSense Wireless Controller': 'PlayStation 5',
  '054c': 'PlayStation 5',
  '0265': 'Xbox One',
  'Pro Controller': 'Switch'
};

/**
 * Cria o leitor de controle.
 *
 * `obterPads` e `agora` entram como argumento, e o padrão é a API real — assim o
 * `App.jsx` chama `criarLeitorDeControle()` sem argumento, e o teste chama com as
 * suas fakes e exercita a lógica de verdade.
 *
 * Uma leitura por quadro é o contrato. Chamar `ler()` duas vezes no mesmo quadro
 * devolve a segunda vez sem bordas, porque o botão segue pressionado: é o
 * comportamento certo para quem chama, e o erro de quem chama duas vezes é dele.
 */
export function criarLeitorDeControle({ obterPads, agora } = {}) {
  const lerPads =
    typeof obterPads === 'function'
      ? obterPads
        : () => {
            // `getGamepads` devolve um array com buralos, e `null` onde não há
            // controle. Devolver `[]` quando a API não existe é o que permite este
            // módulo rodar no Node, sem navegador nenhum.
            if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return [];

            return Array.from(navigator.getGamepads() ?? []);
          };

  const relogio = typeof agora === 'function' ? agora : () => Date.now();

  let anterior = null;

  return {
    /** O estado deste quadro, com as bordas em relação ao anterior. */
    ler() {
      const quadro = lerQuadro({ pads: lerPads(), anterior });

      // Guardar o anterior aqui, e não deixar o chamador, é o que faz a borda
      // durar exatamente um quadro sem depender de disciplina de quem lê.
      anterior = { botoes: quadro.botoes };

      return quadro;
    },

    /** Algum controle está conectado agora? */
    conectado() {
      return lerPads().some((pad) => pad && pad.connected);
    },

    /** Como o jogo chama esse controle, para o HUD. `null` se não houver. */
    nomeDoControle() {
      const ativo = lerPads().find((pad) => pad && pad.connected) ?? null;
      if (!ativo) return null;

      return NOMES_CONHECIDOS[String(ativo.id ?? '')] ?? 'Controle';
    },

    /** Só existe para o teste confirmar que o relógio foi consultado. */
    agora() {
      return relogio();
    }
  };
}
