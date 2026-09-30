/**
 * Cursor de tile para o jogo por controle.
 *
 * ## Por que isto precisa existir
 *
 * O jogo se joga clicando numa pedra. Um controle não tem ponteiro, então o
 * caminho óbvio — transformar o analógico em coordenadas de mouse e deixar o
 * Phaser clicar — foi descartado. Um clique synthesized em coordenada de tela
 * erra por meio pixel, e meio pixel numa aresta de pedra isométrica é clicar na
 * pedra errada ou em nada.
 *
 * O cursor anda de tile em tile, que é a unidade em que o jogo pensa. Cada passo
 * é um movimento válido da grade, e não um palpite de pixel.
 *
 * ## A isometria impõe oito direções, não quatro
 *
 * O mapa é projetado assim, em `toIso`:
 *
 *     x = (col - row) * metadeDaLargura
 *     y = (col + row) * metadeDaAltura
 *
 * "Para cima" na tela, que é o que a pessoa pediu, não é um passo da grade: é
 * `col - 1, row - 1`. E "para a direita" é `col + 1, row - 1`. Os quatro
 * movimentos da grade e as quatro direções da tela não são o mesmo conjunto, e
 * confundir os dois é o bug que faz o cursor andar na diagonal quando a pessoa
 * pediu para subir.
 *
 * Por isso o passo é resolvido comparando ângulos de tela, e não comparando
 * `dcol` com `dx`.
 */

/** Altura do tile na base, e largura, espelhando `config.js`. */
const METRICAS_PADRAO = { tileWidth: 64, tileHeight: 32 };

/**
 * Os oito passos da grade, cada um com a direção de tela que ele produz.
 *
 * A lista está em ordem de leitura e os comentários dizem para onde cada um vai
 * na tela — que é a informação que importa quando se olha esta lista e não o
 * cálculo.
 */
export const PASSOS = [
  { dcol: 1, drow: 0, tela: 'baixo-direita' },
  { dcol: 0, drow: 1, tela: 'baixo-esquerda' },
  { dcol: -1, drow: 0, tela: 'cima-esquerda' },
  { dcol: 0, drow: -1, tela: 'cima-direita' },
  { dcol: 1, drow: 1, tela: 'baixo' },
  { dcol: 1, drow: -1, tela: 'direita' },
  { dcol: -1, drow: 1, tela: 'esquerda' },
  { dcol: -1, drow: -1, tela: 'cima' }
];

/** Para onde um passo da grade aponta na tela, em pixels. */
export function passoNaTela(passo, { tileWidth, tileHeight } = METRICAS_PADRAO) {
  return {
    x: (passo.dcol - passo.drow) * (tileWidth / 2),
    y: (passo.dcol + passo.drow) * (tileHeight / 2)
  };
}

/**
 * Os oito passos ordenados do melhor para o pior para a direção pedida.
 *
 * A comparação é o produto escalar entre a direção pedida e a direção de tela do
 * passo, com as duas normalizadas. Ordenar em vez de escolher o melhor de uma
 * vez é o que permite a borda da tela: o melhor passo pode estar fora do mapa,
 * e o segundo melhor é uma saída que a pessoa não teria escolhido mas que não a
 * deixa batendo na parede.
 *
 * `soComProgresso` deixa de fora os passos que andariam **contra** a direção
 * pedida — os de produto escalar negativo. Sem esse filtro, quem empurra para
 * cima e para a direita no canto superior direito vê o cursor escorregar para
 * cima e para a *esquerda*: um passo que não foi pedido, na direção oposta. É
 * melhor ficar parado, que é o que a pessoa espera de um analógico batendo na
 * parede.
 *
 * Devolve vazio quando a direção pedida é zero. Andar sem direção não é um passo
 * parado: é um passo com destino escolhido por acaso.
 */
export function passosOrdenados(dx, dy, metricas = METRICAS_PADRAO, { soComProgresso = false } = {}) {
  const comprimento = Math.hypot(dx ?? 0, dy ?? 0);

  if (!(comprimento > 0)) return [];

  const ux = dx / comprimento;
  const uy = dy / comprimento;

  const avaliados = PASSOS.map((passo) => {
    const tela = passoNaTela(passo, metricas);
    const tamanho = Math.hypot(tela.x, tela.y) || 1;

    return { ...passo, alinhamento: (ux * tela.x + uy * tela.y) / tamanho };
  });

  return (soComProgresso ? avaliados.filter((passo) => passo.alinhamento > 0) : avaliados).sort(
    (a, b) => b.alinhamento - a.alinhamento
  );
}

/**
 * O passo que a direção pede, sem se preocupar com a borda.
 *
 * `null` quando a direção é zero. Separar isto de `proximoTile` é o que permite
 * testar a matemática da isometria sem o mapa — e a matemática é onde o erro
 * mora.
 */
export function passoDoCursor(dx, dy, metricas = METRICAS_PADRAO) {
  const ordenados = passosOrdenados(dx, dy, metricas);

  return ordenados.length > 0 ? { dcol: ordenados[0].dcol, drow: ordenados[0].drow, tela: ordenados[0].tela } : null;
}

/** O tile está dentro do mapa? */
export function dentroDoMapa(col, row, largura, altura) {
  return col >= 0 && col < largura && row >= 0 && row < altura;
}

/**
 * O próximo tile do cursor, andando na direção pedida.
 *
 * A busca é em ordem de alinhamento e para no primeiro que cabe, considerando só
 * os passos que fazem progresso na direção pedida. Perto da borda, é isso que
 * evita o pior sintoma de um cursor: a pessoa empurra, o cursor não responde, e
 * ela conclui que o controle quebrou.
 *
 * Devolve o tile atual quando nenhum passo cabe, e `null` só quando não há tile
 * atual — que é o que diferencia "não deu para andar" de "não há cursor".
 */
export function proximoTile(col, row, dx, dy, { largura, altura, metricas = METRICAS_PADRAO } = {}) {
  const ordenados = passosOrdenados(dx, dy, metricas, { soComProgresso: true });

  if (ordenados.length === 0) return { col, row };

  if (!Number.isFinite(largura) || !Number.isFinite(altura)) return { col, row };

  for (const passo of ordenados) {
    const alvoCol = col + passo.dcol;
    const alvoRow = row + passo.drow;

    if (dentroDoMapa(alvoCol, alvoRow, largura, altura)) {
      return { col: alvoCol, row: alvoRow };
    }
  }

  return { col, row };
}

/**
 * O tile onde o cursor começa.
 *
 * A entrada é a única escolha, e ela fica no canto oposto à saída — que o gerador
 * já garante estar na coluna 0. Começar em qualquer outro lugar deixaria o
 * jogador andando o mapa inteiro para poder quebrar a primeira pedra.
 */
export function tileInicialDoCursor(entrada, largura, altura) {
  if (entrada && Number.isFinite(entrada.col) && Number.isFinite(entrada.row)) return entrada;

  const linha = Number.isFinite(altura) ? Math.floor(altura / 2) : 0;

  return { col: 0, row: Math.max(0, Math.min(linha, Math.max(0, (altura ?? 1) - 1))) };
}

/**
 * O próximo tile alcançável a partir de um tile.
 *
 * É o mesmo cálculo, mas pulando tiles que o mapa rejeita. Um cursor que *pode*
 * estar sobre chão oco não tem problema; o que incomoda é o cursor ficar preso
 * numa pedra que não dá para quebrar, sem caminho para sair — e como o jogador
 * só anda pela borda, "preso" aqui quer dizer preso de verdade.
 *
 * `podeEntrar` é o que separa as duas coisas, e entra como função para que a
 * decisão sobre o que é válido fique com o mapa, e não com o cursor.
 */
export function proximoTileValido(col, row, dx, dy, opcoes, podeEntrar) {
  const { largura, altura, metricas } = opcoes ?? {};
  const ordenados = passosOrdenados(dx, dy, metricas, { soComProgresso: true });

  if (ordenados.length === 0) return { col, row };

  for (const passo of ordenados) {
    const alvoCol = col + passo.dcol;
    const alvoRow = row + passo.drow;

    if (!dentroDoMapa(alvoCol, alvoRow, largura, altura)) continue;
    if (typeof podeEntrar === 'function' && !podeEntrar(alvoCol, alvoRow)) continue;

    return { col: alvoCol, row: alvoRow };
  }

  return { col, row };
}
