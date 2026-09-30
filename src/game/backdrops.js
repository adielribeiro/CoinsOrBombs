/**
 * Fundos de caverna, um por bioma.
 *
 * ## Só os nomes
 *
 * Este arquivo começou com a carga por bioma: um `ensureBackdrop` que pedia o
 * fundo e a entrada do bioma na hora de entrar nele, com um `Set` de pedidos em
 * voo por cena, e um redesenho no evento de conclusão de cada arquivo.
 *
 * Isso não funcionou. Em cinco dos seis biomas o fundo não aparecia, a entrada
 * não aparecia, e nenhum erro no console dizia por quê. O pedido era feito, o
 * `start()` era chamado, e nenhum evento chegava — o que aparecia na tela era o
 * fundo da Mina Solar, o único que estava em cache.
 *
 * A instrumentação mostrou o ponto exato: a cena que chega no helper tem
 * `textures` como objeto, e `textures.exists` como `undefined`, enquanto a cena
 * de verdade tem `textures.exists` como função. O mesmo objeto, lendo diferente
 * em dois lugares. Não tenho explicação para isso, e não vou escrever uma que não
 * sei provar.
 *
 * Então a carga por demanda saiu, e com ela o `WeakMap` de pedidos, os ouvintes
 * de `filecomplete` e o caminho de redesenho. O `BootScene` carrega os seis
 * fundos e as seis entradas, e aqui sobra o que é de verdade bioma a bioma: a
 * chave do arquivo de cada um.
 *
 * Se um dia a carga por demanda voltar, ela precisa vir com um jeito de se
 * verificar — o sintoma é silencioso demais para confiar em "chamei e pronto".
 */
import { getEntranceKey } from './entrances.js';
import { BIOMES, getBiomeForCave } from './progression.js';

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
 * Bioma de referência, e o único que a tela de título mostra.
 *
 * A Mina Solar é a caverna da cave 1, e é o fundo que o jogo usa como reserva
 * quando a arte do bioma não está na textura: melhor uma caverna errada do que
 * a caixa preta com X verde do Phaser.
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

/** Os seis arquivos de fundo, para quem quiser carregar tudo de uma vez. */
export function listBackdropKeys() {
  return Object.values(BACKDROP_KEYS);
}

/**
 * A arte de fundo e de entrada dos seis biomas: doze arquivos, para o boot.
 *
 * ## Por que uma função, e não um laço no BootScene
 *
 * Porque o laço no `BootScene` é um `ReferenceError` esperando acontecer, e um
 * `ReferenceError` passa pelo build, passa por `node --test`, e só quebra no
 * navegador com a tela preta. Aconteceu duas vezes nesta mesma mudança: o laço
 * iterava `BIOMAS` com o `S` final, e depois declarava `bioma` e usava `biome`.
 *
 * Os testes queexistiam procuravam a string do laço no fonte do `BootScene`, e um
 * deles procurava `for (const bioma of BIOMAS)` — **a grafia errada**. O teste
 * passou porque repetiu o erro.
 *
 * Esta função é o lugar onde a lista é montada, e ela é pura: não depende de
 * Phaser, não depende de `window`, e o teste a executa de verdade. O `BootScene`
 * itera o que ela devolve, e qualquer erro de nome vira um teste vermelho.
 *
 * ## A ordem
 *
 * Fundo antes da entrada de cada bioma, porque a entrada é pequena e é o que o
 * jogador percebe primeiro. Não é criterial: o `preload` do Phaser abre tudo em
 * paralelo.
 */
export function listBiomeArt() {
  const arte = [];

  // Itera `BIOMES`, e não `BACKDROP_KEYS`. A diferença não é de estilo: com duas
  // listas, elas podem discordar, e a que discorda é a que decide o que o jogo
  // pede. Aconteceu — o boot pedia cinco fundos de seis, e o `BIOMES` do jogo tem
  // os seis, com o arquivo de cada um nomeado em `backgroundKey`.
  //
  // `biome.backgroundKey` é a fonte de verdade do nome do arquivo, e é o mesmo
  // campo que a cena usava antes de `backdrops.js` existir.
  for (const biome of BIOMES) {
    const fundo = biome.backgroundKey ?? getBackdropKey(biome.id);
    const entrada = getEntranceKey(biome.id);

    arte.push({ bioma: biome.id, papel: 'fundo', key: fundo, url: `assets/${fundo}.png` });
    arte.push({ bioma: biome.id, papel: 'entrada', key: entrada, url: `assets/${entrada}.png` });
  }

  return arte;
}
