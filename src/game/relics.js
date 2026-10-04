/**
 * A quantidade de relíquias de cada cave, e o que já foi colhido nela.
 *
 * ## Por que um módulo só para isto
 *
 * Porque a regra é uma distribuição — 40% para uma, 50% para duas, 10% para três — e uma
 * distribuição escrita dentro do gerador de mapa não tem como ser testada: o gerador
 * devolve um mapa inteiro, e o teste só poderia afirmar "saiu um mapa", que é sempre
 * verdade. Aqui a função devolve um número, e o teste pode conferir as três faixas.
 *
 * ## Por que a cave guarda o total, e não só o que sobrou
 *
 * Porque uma cave **tem** relíquias, e elas são um lugar — não uma tentativa. Sem
 * lembrar o total, voltar a uma cave de onde a pessoa levou duas de três sortearia um
 * total novo, e o "restante" poderia dar zero: a pessoa teria visto duas relíquias
 * naquela caverna e a segunda visita não teria nenhuma. Guardando o total, a segunda
 * visita devolve exatamente a que faltava.
 *
 * ## O farm infinito que isto fecha
 *
 * `refreshRun` gera o mapa em **toda** entrada numa cave, e a morte leva a pessoa de
 * volta à primeira cave do bioma. Com uma relíquia garantida por cave, morrer e recomeçar
 * seria um laço de farm: same cave, new roll, mais relíquias, para sempre. Lembrando o
 * total e descontando o que já foi colhido, a segunda visita à mesma cave não rende nada
 * novo — que é o que "nenhuma relíquia coletada pode reaparecer" quer dizer.
 */

/**
 * A distribuição, escrita como tabela e não como três comparações.
 *
 * ## Por que uma tabela, e não o `if` encadeado
 *
 * Porque os dois dizem a mesma coisa e só um deles é verificável. Com a tabela, o teste
 * percorre as três faixas e afirma os três números; com o `if`, o teste só consegue
 * repetir a implementação. E a soma é conferível: 0.40 + 0.50 + 0.10 = 1.
 */
export const DISTRIBUICAO_DE_RELQUIAS = [
  { quantidade: 3, ate: 0.1 },
  { quantidade: 2, ate: 0.6 },
  { quantidade: 1, ate: 1 }
];

/** O menor e o maior número de relíquias que uma cave tem. */
export const MINIMO_DE_RELQUIAS = 1;
export const MAXIMO_DE_RELQUIAS = 3;

/**
 * Quantas relíquias a cave tem, pelo sorteio.
 *
 * O sorteio é **um só**, e a faixa é escolhida por ele. Isso é o ponto: "uma garantida e
 * depois 50% para mais uma" daria 25% de uma e 75% de duas, que não é a distribuição
 * pedida. Um `Math.random()` só, uma faixa só.
 *
 * @param {number} sorteio o valor de `Math.random()`, injetável para o teste
 * @returns {1|2|3}
 */
export function sorteiaQuantidadeDeReliquias(sorteio = Math.random()) {
  const valor = Number.isFinite(sorteio) ? sorteio : 0;

  for (const faixa of DISTRIBUICAO_DE_RELQUIAS) {
    if (valor < faixa.ate) return faixa.quantidade;
  }

  // `DISTRIBUICAO` termina em 1, e um sorteio é sempre menor que 1 — esta linha é para
  // o caso de alguém passar 1 exato, e não para ser removida. Devolver o mínimo é a
  // resposta que não muda o jogo.
  return MINIMO_DE_RELQUIAS;
}

/**
 * O total da cave e quanto ainda está embaixo da pedra.
 *
 * Sorteia o total só na primeira visita. Depois ele é o que foi sorteado, e o que
 * falta é o total menos o que a pessoa já levou.
 *
 * @param {{total?: number, coletadas?: number}|null} estadoDaCave o que o save lembra
 * @param {number} sorteio injetável, para o teste
 * @returns {{total: number, coletadas: number, restantes: number}}
 */
export function reliquiasParaColocar(estadoDaCave, sorteio = Math.random()) {
  const totalBruto = estadoDaCave?.total;
  const coletadasBruto = estadoDaCave?.coletadas;

  const total = Number.isFinite(totalBruto)
    ? limitar(Math.trunc(totalBruto), MINIMO_DE_RELQUIAS, MAXIMO_DE_RELQUIAS)
    : sorteiaQuantidadeDeReliquias(sorteio);

  const coletadas = Number.isFinite(coletadasBruto) ? Math.max(0, Math.trunc(coletadasBruto)) : 0;

  // `coletadas` acima do total é um save editado à mão. Sem o teto, o restante seria
  // negativo e o gerador receberia um número negativo de relíquias para colocar.
  const limitadas = Math.min(coletadas, total);

  return { total, coletadas: limitadas, restantes: total - limitadas };
}

/**
 * O registro da cave depois de a pessoa levar uma relíquia.
 *
 * ## Por que ela busca a cave no registro, e não usa o registro direto
 *
 * Porque `registroDaCave(registro, cave)` devolve a **entrada** daquela cave, e é a
 * entrada que tem `total` e `coletadas`. Passando o registro inteiro, `total` seria
 * `undefined` — o registro não tem esse campo — e a função cairia no sorteio: a cave
 * perderia o total que já tinha e a próxima visita sortearia de novo. É o farm, e ele
 * nascia aqui.
 */
export function registraReliquiaColetada(registro, cave) {
  const entrada = registroDaCave(registro, cave);
  const { total, coletadas } = reliquiasParaColocar(entrada);
  const proximas = Math.min(total, coletadas + 1);

  return registraCave(registro, { total, coletadas: proximas, cave });
}

/**
 * O registro de todas as caves, com a de `cave` atualizada.
 *
 * ## Por que o mapa é clonado e não derivado
 *
 * Porque quem chama guarda o resultado no estado do React, e o estado do React não pode
 * ser mudado no lugar. Devolver o mesmo objeto com uma chave a mais seria mais barato, e
 * a mudança não apareceria na tela — que é o defeito clássico de mutar o estado.
 */
export function registraCave(registro, { total, coletadas, cave }) {
  return { ...(registro ?? {}), [String(cave)]: { total, coletadas } };
}

/** O registro de uma cave, ou `null` quando ela nunca foi gerada. */
export function registroDaCave(registro, cave) {
  const entrada = registro?.[String(cave)];

  return entrada && typeof entrada === 'object' ? entrada : null;
}

/**
 * Limpa o registro das caves que a pessoa não pode mais revisitar.
 *
 * ## Por que existe
 *
 * Porque o registro cresce a cada cave visitada, e uma save de jogo longo guarda uma
 * entrada por cave — 60 entradas, que é pouco. O problema não é o tamanho: é que uma
 * entrada que nunca mais será lida é um registro que nunca será atualizado, e um dicionário
 * com chave morta é o que faz o próximo ajuste duvidar do que ainda vale.
 *
 * A regra é `bestCave`: a pessoa só volta para caves do bioma em que está, e o save já
 * guarda até onde ela chegou.
 *
 * ## Por que isto **não** apaga o que impede o farm
 *
 * Porque apagar o registro de uma cave **reabre** o farm: a próxima visita sorteia de
 * novo. Por isso o corte é só das caves que a pessoa deixou para trás de vez — acima do
 * bioma atual —, e nunca da que ela está.
 */
export function podaReliquiasPorCave(registro, bestCave) {
  if (!registro || typeof registro !== 'object') return {};

  const limite = Number.isFinite(bestCave) ? bestCave : 0;
  const podado = {};

  for (const [cave, entrada] of Object.entries(registro)) {
    const numero = Number(cave);

    // Uma chave que não é número não é cave, e uma cave que não é número não volta a ser
    // visitada: as duas são registro morto, e registro morto é o que faz o próximo
    // ajuste duvidar do que ainda vale.
    //
    // E `>= limite`, e não `>`: o registro da cave em que a pessoa está é o que impede o
    // farm agora, e descartar o dele faria a cave render de novo no instante seguinte.
    if (Number.isFinite(numero) && numero >= limite) {
      podado[cave] = entrada;
    }
  }

  return podado;
}

/** Limita um número a um intervalo. */
function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}
