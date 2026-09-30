/**
 * Fundos de caverna, um por bioma, carregados por bioma.
 *
 * ## Por que isto existe
 *
 * Os seis fundos em 4K somam 17,3 MB. Carregá-los todos no boot levava o pacote
 * de 14,8 MB para 36,8 MB, e o jogo inteiro é "escolhe um bioma e joga" — 36,8 MB
 * na primeira visita é meio minuto de espera em 4G, para um fundo que o jogador
 * vê um de cada vez.
 *
 * Então o fundo é carregado **na entrada do bioma**, e só o primeiro entra no
 * boot. A tela de título, que é a primeira coisa que se vê, tem arte: o
 * `BootScene` carrega o fundo da Mina Solar junto com o resto.
 *
 * ## O que acontece durante a troca
 *
 * `ensureBackdrop` devolve `false` enquanto as artes não chegaram, e o
 * renderizador pinta o chão com a cor do bioma no lugar. Isso é deliberado: a
 * alternativa é deixar o sprite de fundo cair no placeholder de textura ausente
 * do Phaser, que é a caixa preta com X verde. Um retângulo da cor da caverna por
 * meio segundo é melhor que uma caixa com X, e o redesenho no `complete` dura um
 * quadro.
 */
import { getEntranceKey } from './entrances.js';
import { getBiomeForCave } from './progression.js';

/** Chave de textura de cada fundo. O nome é o do arquivo, sem extensão. */
export const BACKDROP_KEYS = {
  sunstone: 'cave_bg_sunstone',
  frost: 'cave_bg_frost',
  ember: 'cave_bg_ember',
  ruins: 'cave_bg_ruins',
  wind: 'cave_bg_wind',
  crystal: 'cave_bg_crystal'
};

/**
 * Bioma do fundo carregado no boot, e de todos os menus.
 *
 * A tela de título mostra a caverna da cave 1, que é a Mina Solar. Carregar só
 * esta resolve os dois casos: o menu aparece com arte, e o primeiro bioma que
 * alguém joga já está em cache.
 */
export const BIOMA_INICIAL = 'sunstone';

export function getBackdropKey(biomeId) {
  return BACKDROP_KEYS[biomeId] ?? BACKDROP_KEYS[BIOMA_INICIAL];
}

/**
 * Chave de fundo para uma cave, pelo mesmo caminho que o resto do jogo usa para
 * descobrir o bioma de uma cave.
 */
export function getBackdropKeyForCave(cave = 1) {
  return getBackdropKey(getBiomeForCave(cave).id);
}

/**
 * Pedidos em andamento, por cena.
 *
 * Um `Set` por cena e não um global: o `CaveScene` é criado e destruído ao longo
 * da sessão, e uma chave que ficou presa no conjunto depois do `shutdown`
 * diria para sempre que "já está carregando", sem nunca carregar.
 */
const emVoo = new WeakMap();

/**
 * O que um bioma tem carregado, e o que ainda falta.
 *
 * Fundo E entrada. A entrada entra na conta porque ela é desenhada no mesmo
 * `renderMap` e por demanda junto com o fundo; tratar as duas como um pedido só
 * evita o caso de a entrada chegar um quadro depois, o que apareceria como um
 * pedestal que surge do nada.
 *
 * Esta é a ÚNICA função que toca em `scene.textures`, e é por isso que "está
 * pronto?" e "o que falta?" não podem divergir. Quando eram dois lugares
 * independentes, o `renderMap` passava pela verificação e caía no acesso
 * seguinte sem a textura — que é o placeholder de textura ausente, sem exceção,
 * sem aviso e sem erro de console.
 *
 * A guarda extrai `exists` ANTES de testar. A forma curta
 * (`typeof scene.texturas.exists !== 'function'`) é legível e passa em leitura,
 * mas ela é o único ponto do arquivo que decide entre "está tudo pronto" e "o
 * render tem que esperar" — e um erro ali é silencioso por construção: o jogo
 * simplesmente não pede a arte, e o bioma fica em cinza para sempre. Com uma
 * variável, o teste é sobre a função extraída, e não sobre a cadeia de acessos.
 */
function estadoDoBioma(scene, biomeId) {
  const arte = [getBackdropKey(biomeId), getEntranceKey(biomeId)];
  const existe = scene?.texturas?.exists;

  // Sem motor — fora do navegador, cena de teste — não há placeholder para
  // trocar, e devolver "falta" colocaria o renderizador num laço de pedido que
  // nunca termina. Então, sem `textures`, tudo é considerado pronto.
  if (typeof existe !== 'function') {
    return { arte, faltando: [], temTexturas: false };
  }

  const faltando = [];
  for (let i = 0; i < arte.length; i += 1) {
    if (scene.texturas.exists(arte[i]) !== true) faltando.push(arte[i]);
  }

  return { arte, faltando, temTexturas: true };
}

/** Tudo que este bioma precisa já está pronto? */
export function isBackdropReady(scene, biomeId) {
  return estadoDoBioma(scene, biomeId).faltando.length === 0;
}

/**
 * Garante que as artes do bioma estão carregadas, e avisa quando ficarem.
 *
 * Devolve `true` se já está tudo pronto. Devolve `false` se está carregando agora
 * ou se acabou de começar — nos dois casos o chamador desenha o placeholder e o
 * `onReady` redesenha.
 *
 * Chamar duas vezes no mesmo bioma não abre dois pedidos: é para isso que o
 * conjunto de em voo existe. Sem ele, o `renderMap` do Phaser pode passar pelo
 * mesmo ponto duas vezes no mesmo quadro, e o placeholder piscaria.
 *
 * Os dois arquivos vão no MESMO pedido. Separar custaria um segundo ciclo de
 * rede para ganhar nada: o fundo é 2,9 MB e a entrada 380 KB, e o segundo só
 * começaria depois do primeiro.
 */
export function ensureBackdrop(scene, biomeId, onReady) {
  const faltando = estadoDoBioma(scene, biomeId).faltando;

  if (faltando.length === 0) return true;

  let pedidos = emVoo.get(scene);
  if (!pedidos) {
    pedidos = new Set();
    emVoo.set(scene, pedidos);
  }

  // Só um pedido por bioma. A chave do pedido é o bioma, não o arquivo, porque o
  // pedido cobre os dois.
  const idDoPedido = `bioma:${biomeId}`;
  if (pedidos.has(idDoPedido)) return false;

  pedidos.add(idDoPedido);

  const concluir = () => {
    pedidos.delete(idDoPedido);
    onReady?.();
  };

  // `filecomplete-image-<chave>` é o evento por arquivo do Phaser. O
  // `loaderror` é a rede: um arquivo que falha tem que liberar o pedido, senão a
  // chave fica presa em "carregando" e o placeholder nunca mais sai.
  for (let i = 0; i < faltando.length; i += 1) {
    scene.load.once(`filecomplete-image-${faltando[i]}`, concluir);
  }
  scene.load.once('loaderror', concluir);

  for (let i = 0; i < faltando.length; i += 1) {
    scene.load.image(faltando[i], `assets/${faltando[i]}.png`);
  }

  try {
    scene.load.start();
  } catch {
    // Sem loader utilizável — fora do navegador, ou a cena já encerrada. Não é
    // motivo para derrubar o render: o placeholder cobre o quadro.
    pedidos.delete(idDoPedido);
  }

  return false;
}

/** Os seis arquivos de fundo, para quem quiser carregar tudo de uma vez. */
export function listBackdropKeys() {
  return Object.values(BACKDROP_KEYS);
}
