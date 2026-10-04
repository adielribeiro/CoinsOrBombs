/**
 * O que a Poção Caminho Seguro revela além da rota, por nível.
 *
 * ## Por que este arquivo existe, e não mora na cena
 *
 * Porque a cena do Phaser não roda em Node, e uma decisão que só existe dentro dela não
 * tem teste. A escolha de quais bombas destacar, quais relíquias e qual desvio é uma
 * decisão sobre o mapa — e ela sai para cá, recebe o mapa e devolve coordenadas. A cena
 * recebe coordenadas e desenha, e é só isso que ela sabe fazer.
 *
 * ## Por que a rota entra como parâmetro, e não é recalculada aqui
 *
 * Porque `findSafeRoute` já devolve a lista ordenada de tiles da entrada até a saída, e
 * recalcular seria o dobro do trabalho pelo mesmo resultado. Todo este arquivo é uma
 * leitura dessa lista: para cada tile da rota, olhar o entorno. Nada varre o mapa inteiro,
 * e nada roda a cada frame — a função é chamada uma vez, no clique da poção.
 *
 * ## Os três níveis
 *
 * **Nível 0** é a poção de antes: revela a rota. Nada além disso.
 *
 * **Nível 1** destaca as bombas **imediatamente adjacentes** à rota. Uma casa de raio, e
 * não "as bombas da cave": o pedido era o perigo que está do lado do caminho que a pessoa
 * vai andar, e revelar tudo seria revelar o mapa inteiro.
 *
 * **Nível 2** acrescenta as relíquias perto da rota. Primeiro o que está colado nela; e
 * só quando não há nada colado, o que está a duas casas. Tentar só a primeira passada
 * deixaria a melhoria em branco na maioria das caves, e uma melhoria que não mostra nada
 * parece quebrada.
 *
 * **Nível 3** acrescenta o desvio: um caminho curto até uma relíquia e de volta para a
 * rota. É o único nível que calcula algo, e por isso é o único com limite de passo.
 */

import { getNeighbors8 } from './helpers.js';

/** Os três níveis. O mesmo número de `melhorias.js`, repetido para o arquivo não depender dele. */
export const NIVEL_MAXIMO_CAMINHO = 3;

/**
 * O quanto o desvio pode andar antes de deixar de ser "um pequeno desvio".
 *
 * Seis casas é o teto de um desvio que ainda cabe na tela. Acima disso a pessoa está
 * fazendo uma segunda rota, que é exatamente o que o nível 3 promete não fazer.
 */
export const PASSOS_MAXIMOS_DO_DESVIO = 6;

/**
 * Quantas relíquias o nível 2 destaca quando as encontra longe da rota.
 *
 * Três. A intenção é a pessoa perceber que vale um desvio pequeno, não receber um mapa de
 * relíquias — e um número alto transforma a melhoria em "revele todas".
 */
export const RELIQUIAS_NO_MAXIMO = 3;

/** A chave de um tile, que é como as listas de marca comparam posições. */
function chave(tile) {
  return `${tile.col},${tile.row}`;
}

/**
 * O tile esconde uma relíquia?
 *
 * `hiddenContent` guarda três coisas de tipos diferentes: as strings `'bomb'`, `'empty'` e
 * `'coin'`, e o objeto `{kind: 'relic', relicId}` que `createRelicContent` devolve. A
 * comparação tem que olhar o `kind`, e não truthiness — `'empty'` é truthy.
 */
export function escondeReliquia(tile) {
  const conteudo = tile?.hiddenContent;

  return typeof conteudo === 'object' && conteudo !== null && conteudo.kind === 'relic';
}

/** O tile esconde uma bomba que ninguém revelou ainda? */
export function escondeBomba(tile) {
  return tile?.hiddenContent === 'bomb' && tile?.utilityRevealBomb !== true;
}

/** Os tiles da rota, como conjunto de chaves. */
function conjuntoDaRota(rota) {
  const conjunto = new Set();

  for (const tile of rota) conjunto.add(chave(tile));

  return conjunto;
}

/** A diferença de Chebyshev entre dois tiles: o número de casas em linha reta. */
function distanciaChebyshev(a, b) {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

/**
 * Os riscos ao lado da rota: bombas a uma casa de qualquer tile do caminho.
 *
 * ## Por que oito vizinhos, e não quatro
 *
 * Porque em grade isométrica a diagonal também é um passo, e uma bomba na diagonal de um
 * tile da rota é exatamente o perigo que o nível 1 promete mostrar. Ficar nos quatro
 * vizinhos deixaria metade dos riscos reais sem marca, e a pessoa learneria a não
 * confiar no verde.
 *
 * ## Por que a própria rota é excluída
 *
 * Porque um tile da rota não está *ao lado* da rota, está **nela**. Marcar um tile da
 * rota como perigo faria a pessoa confundir a linha verde com o risco.
 */
export function perigosAoLadoDaRota(mapData, rota) {
  const naRota = conjuntoDaRota(rota);
  const vistos = new Set();
  const perigos = [];

  for (const passo of rota) {
    for (const vizinho of getNeighbors8(passo.col, passo.row, mapData.width, mapData.height)) {
      const id = chave(vizinho);

      if (naRota.has(id) || vistos.has(id)) continue;

      vistos.add(id);

      const tile = mapData.tiles[vizinho.row][vizinho.col];

      if (escondeBomba(tile)) perigos.push({ col: vizinho.col, row: vizinho.row });
    }
  }

  return perigos;
}

/**
 * As relíquias perto da rota, para o nível 2.
 *
 * ## As duas passadas
 *
 * Coladas na rota primeiro; a duas casas só quando a primeira volta vazia. Uma só
 * passada deixaria a melhoria sem efeito na maioria das caves — relíquia é rara, e uma
 * melhoria rara sem resultado é indistinguível de uma melhoria quebrada.
 *
 * ## Por que o teto
 *
 * Porque três é o número que ainda cabe na tela como sugestão. Mais que isso e o nível 2
 * deixa de ser "oportunidades de pequenos desvios" e passa a ser "revele todas".
 */
export function reliquiasPertoDaRota(mapData, rota) {
  const naRota = conjuntoDaRota(rota);
  const encontradas = [];

  for (const raio of [1, 2]) {
    const vistas = new Set();

    for (const passo of rota) {
      // A varredura é feita por raio de verdade, e não pela vizinhança de 8 filtrada por
      // distância: são duas casas em linha reta, que include as diagonais a duas casas.
      for (let offsetCol = -raio; offsetCol <= raio; offsetCol += 1) {
        for (let offsetRow = -raio; offsetRow <= raio; offsetRow += 1) {
          const distancia = Math.max(Math.abs(offsetCol), Math.abs(offsetRow));

          if (distancia !== raio) continue;

          const col = passo.col + offsetCol;
          const row = passo.row + offsetRow;

          if (col < 0 || row < 0 || col >= mapData.width || row >= mapData.height) continue;

          const id = `${col},${row}`;

          if (naRota.has(id) || vistas.has(id)) continue;

          vistas.add(id);

          const tile = mapData.tiles[row][col];

          if (escondeReliquia(tile)) encontradas.push({ col, row });
        }
      }
    }

    if (encontradas.length > 0) {
      return encontradas.slice(0, RELIQUIAS_NO_MAXIMO);
    }
  }

  return [];
}

/**
 * O caminho mais curto de um tile até uma relíquia, andando por tiles sem bomba.
 *
 * ## Por que a bomba bloqueia aqui, e só aqui
 *
 * Porque é a mesma regra de `findSafeRoute`: bomba é o único perigo que impede a
 * travessia, e a rocha é atravessável de propósito. Um desvio que passasse por cima de
 * uma bomba apontaria um caminho que mata, que é o contrário de "relativamente seguro".
 *
 * ## Por que o alvo é um teste, e não "a primeira relíquia"
 *
 * Porque a busca precisa achar **uma das relíquias da lista do nível 2**, e não qualquer
 * relíquia que apareça pelo caminho. Sem isso, a âncora poderia terminar apontando para
 * uma relíquia que nem estava na lista — e a pessoa veria uma seta para algo que o
 * nível 2 não prometeu.
 *
 * A busca começa na âncora, com `caminho` vazio, e por isso o caminho devolvido já não
 * contém o ponto de partida: o desvio é o que acontece **depois** de sair da rota.
 */
function menorCaminhoAte(mapData, inicio, alvo, limite) {
  const fila = [{ col: inicio.col, row: inicio.row, caminho: [] }];
  const vistas = new Set([chave(inicio)]);

  while (fila.length > 0) {
    const atual = fila.shift();

    if (atual.caminho.length >= limite) continue;

    for (const vizinho of getNeighbors8(atual.col, atual.row, mapData.width, mapData.height)) {
      const id = chave(vizinho);

      if (vistas.has(id)) continue;

      const tile = mapData.tiles[vizinho.row][vizinho.col];

      if (tile.hiddenContent === 'bomb') continue;

      vistas.add(id);

      const caminho = [...atual.caminho, { col: vizinho.col, row: vizinho.row }];

      if (alvo(vizinho)) return caminho;

      fila.push({ col: vizinho.col, row: vizinho.row, caminho });
    }
  }

  return null;
}

/**
 * O desvio do nível 3: um caminho curto até uma relíquia, e de volta para a rota.
 *
 * ## A ordem das âncoras é o que faz a escolha valer
 *
 * ## Por que do fim da rota para o começo
 *
 * Porque a âncora mais próxima da saída é a que menos alonga o caminho até lá: quem já
 * vai andar a rota inteira passa por ela de qualquer jeito, e desvia só para pegar a
 * relíquia. Uma âncora perto da entrada obrigaria a voltar pela rota inteira depois do
 * desvio, que é a "rota nova até a relíquia" que o pedido diz para não criar.
 *
 * E dentro da mesma âncora, a busca em largura devolve o desvio mais curto — que é o
 * segundo critério do pedido. O terceiro, "a mais próxima da rota", cai de graça: as
 * âncoras são percorridas em ordem, e a primeira que acha é a primeira da lista.
 *
 * ## Devolve `null`, e não um desvio vazio
 *
 * Porque uma cave sem relíquia perto é o caso comum, e um desenho vazio na tela parece
 * falha. `null` é o que a cena usa para não desenhar nada.
 */
export function desvioParaReliquia(mapData, rota, reliquias) {
  if (!rota.length || !reliquias.length) return null;

  const candidatos = new Set(reliquias.map(chave));

  // Do fim da rota para o começo: a âncora que menos alonga a saída vem primeiro.
  for (let indice = rota.length - 1; indice >= 0; indice -= 1) {
    const ancora = rota[indice];
    const temCandidato = getNeighbors8(ancora.col, ancora.row, mapData.width, mapData.height).some(
      (vizinho) => candidatos.has(chave(vizinho))
    );

    // A checagem é antes da busca: sem relíquia vizinha da âncora não há o que procurar,
    // e refazer a busca em largura para cada âncora seria trabalho jogado fora.
    if (!temCandidato) continue;

    const caminho = menorCaminhoAte(
      mapData,
      ancora,
      (tile) => candidatos.has(chave(tile)),
      PASSOS_MAXIMOS_DO_DESVIO
    );

    if (!caminho || caminho.length === 0) continue;

    const ultima = caminho[caminho.length - 1];

    return {
      ancora: { col: ancora.col, row: ancora.row },
      reliquia: { col: ultima.col, row: ultima.row },
      tiles: caminho
    };
  }

  return null;
}

/**
 * Tudo o que a poção revela, por nível.
 *
 * É o que a cena chama uma vez, no clique. Devolve listas **vazias** — e não `null` — nos
 * níveis que não têm aquela marca, para quem recebe poder iterar sem checar nada.
 *
 * @param {object} mapData o mapa da cave
 * @param {{col: number, row: number}[]} rota a lista de tiles da entrada até a saída
 * @param {number} nivel o nível da melhoria da poção, de 0 a 3
 */
export function marcasDoCaminhoSeguro(mapData, rota, nivel) {
  const alvo = Number.isFinite(nivel) ? Math.min(Math.max(0, Math.trunc(nivel)), NIVEL_MAXIMO_CAMINHO) : 0;
  const lista = Array.isArray(rota) ? rota : [];

  if (alvo < 1 || lista.length === 0) {
    return { perigos: [], reliquias: [], desvio: null };
  }

  const perigos = perigosAoLadoDaRota(mapData, lista);

  if (alvo < 2) return { perigos, reliquias: [], desvio: null };

  const reliquias = reliquiasPertoDaRota(mapData, lista);

  if (alvo < 3) return { perigos, reliquias, desvio: null };

  return { perigos, reliquias, desvio: desvioParaReliquia(mapData, lista, reliquias) };
}
