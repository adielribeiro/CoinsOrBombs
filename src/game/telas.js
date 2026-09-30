/**
 * A pilha de telas do jogo.
 *
 * ## Por que isto existe
 *
 * `Esc` e o botão *voltar* do controle precisam fechar **a mesma tela, na mesma
 * ordem**. São dois caminhos para a mesma ação, escritos em lugares diferentes, e
 * dois lugares divergem: alguém acrescenta um modal e esquece um dos dois, e o
 * botão volta fica fechando uma tela atrás da que a pessoa queria.
 *
 * A ordem aqui é a ordem de empilhamento. Não é arbitrária: o topo é o que está
 * aberto por último, e o que foi aberto por último é o que a pessoa está vendo.
 *
 * ## Por que é uma função pura
 *
 * Porque a decisão ("qual tela está no topo?", "o que fechar?") é o que dá para
 * testar, e ela é uma lista. O `setState` de cada tela é o que fica na tela; a
 * ordem é o que mora aqui — e é a ordem que estava certa nos dois lugares e podia
 * estar errada em um só deles sem nenhum teste reclamar.
 */

/**
 * As telas, do topo para o fundo.
 *
 * A ordem é a ordem de empilhamento, e ela é defensiva mais do que exercida: a
 * maioria das telas se exclui — abrir a de jogos fecha a de idioma, sair da
 * pausa fecha a de idioma —, então num quadro normal há uma só. Mas a carta do
 * final é aberta a partir do modal da saída, e essa é a combinação em que a ordem
 * decide, e é a que o `abrirFinale` fecha explicitamente. A lista deixa o
 * comportamento certo definido mesmo se um dia as duas coexistirem num quadro.
 *
 * O que a lista protege de verdade é a **cobertura**: `test/telas.test.mjs`
 * afirma que toda tela que o `App.jsx` controla está aqui. É assim que um modal
 * novo não nasce sem `Esc` — sem esta lista, ele nasceria e ninguém perceberia
 * até alguém com controle na mão relatar que não dá para sair daquela tela.
 */
export const PILHA = [
  'final',
  'saida',
  'utilitaria',
  'bioma',
  'jogos',
  'idioma',
  'configuracoes',
  'informacoes',
  'pausa'
];

/**
 * O nome da tela do topo, ou `null` se não houver nenhuma aberta.
 *
 * Devolve nome e não a posição, porque quem chama precisa saber *qual* é para
 * fechar, e devolver o índice faria cada chamada-site repetir a tabela.
 */
export function telaDoTopo(abertas = {}) {
  for (const nome of PILHA) {
    if (abertas[nome]) return nome;
  }

  return null;
}

/** Existe alguma tela aberta? */
export function temTelaAberta(abertas = {}) {
  return telaDoTopo(abertas) !== null;
}

/**
 * Fecha a tela do topo e diz qual foi.
 *
 * `fechar` recebe o nome da tela. Passar a função como argumento, em vez de um
 * mapa de fechadores, é o que mantém esta função livre de React — e o teste
 * consegue então afirmar a ordem inteira sem montar componente nenhum.
 *
 * Devolve o nome fechado, ou `null` quando não havia nada para fechar.
 */
export function fechaTelaDoTopo(abertas = {}, fechar) {
  const topo = telaDoTopo(abertas);

  if (!topo) return null;
  if (typeof fechar !== 'function') return topo;

  fechar(topo);

  return topo;
}

/**
 * A entrada do jogo aceita foco de controle.
 *
 * Não é a mesma coisa que "está aberta": uma tela que mostra e não aceita nada
 * não deve segurar o direcional. Hoje coincide com a pilha inteira, e o
 * separado é para o dia em que uma tela aparecer sem ser jogável.
 */
export function aceitaControle(nomeDaTela) {
  return nomeDaTela !== null && PILHA.includes(nomeDaTela);
}
