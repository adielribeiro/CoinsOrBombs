/**
 * A lore de entrada dos biomas: os painéis que o mineiro fala ao chegar numa.
 *
 * ## O que este arquivo é
 *
 * Dado de jogo. O mesmo carve de `rewards.js` — o catálogo fica aqui, e a tela só
 * recebe o que ela precisa desenhar. Motivo prático, como o de lá: um teste em Node
 * não importa um `.jsx`, então a regra que decide "isto tem lore?" e "qual é o
 * próximo painel?" não teria como ser testada dentro do componente. E a regra é o
 * coração do recurso: ela decide se a lore aparece antes da caverna ou some
 * num bug silencioso, que é o pior jeito de sumir.
 *
 * ## Por que só a Mina Solar
 *
 * A Mina Solar é o primeiro bioma, e é o único com roteiro pronto. Os outros cinco
 * entram no jogo **sem** lore: `temLore` devolve `false` e a tela pula direto para a
 * caverna, exatamente como o jogo fazia antes deste arquivo existir. Um bioma sem
 * roteiro não pode ser um bioma que mostra um painel em branco — daí a lista ser
 * declarativa e o painel não existir em lugar nenhum.
 *
 * ## A fala é chave de tradução, e não texto
 *
 * `falas` guarda chaves (`lore.sunstone.p2.a`), nunca o texto em português. O texto
 * mora nos dez arquivos de idioma, e é o que permite traduzir a lore sem traduzir
 * código. Um teste de paridade de chaves pega o painel que someone typou com
 * `p2` num idioma e `p1` no outro.
 *
 * ## A imagem é nome sem extensão
 *
 * `imagem: 'minerador_assustado'` vira `assets/minerador_assustado.png` na tela.
 * Sem extensão de propósito: as texturas do Phaser usam o mesmo critério, e um
 * `.png` espalhado pelo catálogo é uma chance de trocar por `.jpg` sem o build
 * reclamar. O arquivo **existe** é checado por teste, contra o disco — foi assim que
 * o `minerador_nomal.png` do material de origem quase entrou como `nomal`.
 */

/** Chave da pessoa que fala. Uma só por enquanto: é o mineiro em todo roteiro. */
export const CHAVE_FALANTE = 'lore.falante';

/**
 * Os roteiros, por bioma.
 *
 * A ordem dos painéis é a ordem em que aparecem, e a ordem é do roteiro, não do
 * alfabeto: o mineiro primeiro estranha o barulho, depois se perde, depois pensa,
 * depois cansa, depois volta a estranhar, e vai. A mesma expressão volta em dois
 * momentos (`assustado` nos painéis 1 e 5) porque é assim que o roteiro foi
 * escrito, e refazer a ordem para usar cada arquivo uma vez só seria trocar o texto
 * que existe por um texto inventado.
 *
 * ## A Gruta de Gelo é mais curta, e é assim que o roteiro é
 *
 * Cinco painéis, contra seis da Mina Solar. A regra é a mesma — a ordem e as
 * expressões são do texto, não da lista de arquivos. Completar este roteiro com
 * imagens que sobraram seria inventar cena, e foi o que a Mina Solar quase veio.
 *
 * ## As expressões são do mesmo personagem
 *
 * O material de origem mistura `mineiro_` e `minerador_` para o mesmo mineiro, e
 * o prefixo entra pelo nome de arquivo do projeto, sem exceção: `minerador_frio`,
 * `minerador_surpreso`. A mistura só existia no zip.
 */
export const LORE_POR_BIOMA = {
  sunstone: [
    { imagem: 'minerador_assustado', falas: ['lore.sunstone.p1.a'] },
    { imagem: 'minerador_melancolico', falas: ['lore.sunstone.p2.a', 'lore.sunstone.p2.b'] },
    { imagem: 'minerador_pensativo', falas: ['lore.sunstone.p3.a', 'lore.sunstone.p3.b'] },
    { imagem: 'minerador_exausto', falas: ['lore.sunstone.p4.a'] },
    { imagem: 'minerador_assustado', falas: ['lore.sunstone.p5.a'] },
    { imagem: 'minerador_normal', falas: ['lore.sunstone.p6.a'] }
  ],
  frost: [
    { imagem: 'minerador_frio', falas: ['lore.frost.p1.a'] },
    { imagem: 'minerador_surpreso', falas: ['lore.frost.p2.a'] },
    { imagem: 'minerador_exausto', falas: ['lore.frost.p3.a'] },
    { imagem: 'minerador_pensativo', falas: ['lore.frost.p4.a', 'lore.frost.p4.b'] },
    { imagem: 'minerador_normal', falas: ['lore.frost.p5.a'] }
  ],
  ember: [
    { imagem: 'minerador_calor', falas: ['lore.ember.p1.a'] },
    { imagem: 'minerador_exausto', falas: ['lore.ember.p2.a'] },
    { imagem: 'minerador_pensativo', falas: ['lore.ember.p3.a'] },
    { imagem: 'minerador_normal', falas: ['lore.ember.p4.a'] }
  ]
};

/**
 * Este bioma tem lore?
 *
 * A tela usa isto para decidir se abre a sequência. Bioma sem roteiro não abre
 * nada — e, importante, **não abre uma sequência vazia**, que ficaria um painel
 * em branco esperando o jogador apertar alguma coisa para sair.
 */
export function temLore(biomeId) {
  return (LORE_POR_BIOMA[biomeId]?.length ?? 0) > 0;
}

/**
 * Os painéis de um bioma, na ordem do roteiro.
 *
 * Lista vazia para bioma sem lore, e nunca `null` nem `undefined`: quem chama só
 * quer saber o tamanho e percorrer, e um `?? []` espalhado em três lugares é três
 * lugares para esquecer.
 */
export function paineisDoBioma(biomeId) {
  return LORE_POR_BIOMA[biomeId] ?? [];
}

/**
 * O índice do painel seguinte, ou `-1` quando acabou.
 *
 * ## Por que a função, e não um `indice + 1` na tela
 *
 * Porque a regra tem duas bordas e as duas importam. A última volta para `-1`, e
 * é esse `-1` que a tela lê como "acabou, entra na caverna" — se alguém escrever
 * `indice + 1 <= paineis.length` na tela, o último painel avança para um índice que
 * não existe e o React renderiza um painel `undefined`, com a imagem quebrada e
 * nenhum erro no console. E um índice fora da faixa precisa devolver o mesmo
 * `-1`, não o `undefined` de `paineis[indice + 1]`: a mesma tela que aguenta um
 * índice grande aguenta um índice negativo, e um `undefined` aqui vira painel
 * quebrado do mesmo jeito.
 */
export function proximoIndice(paineis, indice) {
  const proximo = (indice ?? -1) + 1;

  return proximo >= (paineis?.length ?? 0) ? -1 : proximo;
}

/**
 * Todo arquivo de imagem que a lore usa, sem extensão e sem repetir.
 *
 * Serve para o teste conferir cada nome contra os arquivos de `public/assets`, e
 * para a tela saber o que pré-carregar. Sai daqui e não de um laço no `.jsx`
 * pelas mesmas Razões de `listBiomeArt`: a lista montada em um lugar só é a que dá
 * para testar.
 */
export function imagensDaLore() {
  const nomes = new Set();

  for (const paineis of Object.values(LORE_POR_BIOMA)) {
    for (const painel of paineis) nomes.add(painel.imagem);
  }

  return [...nomes].sort();
}

/** O caminho do arquivo de um painel, do jeito que a tela e o teste esperam. */
export function caminhoDaImagem(nome) {
  return `assets/${nome}.png`;
}

/**
 * Começa a trazer as imagens de uma lore, uma vez por imagem.
 *
 * ## Por que isso não éLuxo
 *
 * As cinco expressões pesam 12 MB com o canal alfa, e cada painel é um arquivo
 * diferente. Sem pré-carregar, o primeiro painel apareceria rápido — é o que a
 * pessoa está olhando — e o segundo levaria um segundo e meio de imagem vazia no
 * meio de uma frase, que é o pior lugar possível para travar, porque a pessoa
 * está lendo.
 *
 * ## `criarImagem` entra como argumento
 *
 * Porque este arquivo é importado por teste em Node, onde `Image` não existe. Com
 * a fábrica injetada, o teste verifica quantas imagens foram pedidas e com que
 * `src`, sem navegador nenhum — e o `typeof Image` cobre o resto.
 *
 * ## Uma por imagem, e não uma por painel
 *
 * `assustado` volta em dois painéis. Pedir o mesmo arquivo duas vezes não faz
 * o navegador baixar duas vezes, mas cria dois objetos e deixa o código dizendo
 * que baixou. A lista sai sem repetido, e é a mesma função que alimenta o teste.
 */
export function precarLore(biomeId, criarImagem) {
  const cria = criarImagem ?? (typeof Image === 'undefined' ? null : () => new Image());

  if (!cria) return [];

  const nomes = new Set(paineisDoBioma(biomeId).map((painel) => painel.imagem));

  return [...nomes].map((nome) => {
    const imagem = cria();
    imagem.src = caminhoDaImagem(nome);

    return imagem;
  });
}