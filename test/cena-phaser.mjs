import { getBackdropKey } from '../src/game/backdrops.js';
import { getEntranceKey } from '../src/game/entrances.js';

const MISSING = '__MISSING';

/**
 * Uma cena falsa com o mínimo do Phaser que `ensureBackdrop` e `isArtePronta`
 * tocam.
 *
 * Existe porque o caminho de carga por bioma **não é verificável no navegador
 * deste ambiente**: a aba fica com `visibilityState === 'hidden'`, o
 * `requestAnimationFrame` é estrangulado, o `BootScene` nunca termina o preload
 * e o `CaveScene.create()` nunca registra os ouvintes. Sem cena, não há
 * `ensureBackdrop` para chamar.
 *
 * ## A parte que importa: `get`
 *
 * `textures.exists` é `list.hasOwnProperty(key)`, e `textures.get(key)` devolve
 * a textura `__MISSING` quando a chave não está na lista. A `__MISSING` é
 * exatamente a caixa preta com X verde.
 *
 * A cena falsa reproduz isso: uma chave que não está em `existentes` continua
 * "existindo" para quem só pergunta com `exists`, e devolve `__MISSING` para quem
 * pergunta com `get`. Sem essa distinção, o teste passa, o jogo desenha o X, e
 * ninguém entende por quê — que é o que aconteceu.
 *
 * O que esta cena falsa cobre é a LÓGICA, que é a parte com decisão: quando pedir,
 * quando não pedir, quando liberar o pedido, e o que acontece quando a textura não
 * é a que foi pedida. O que ela não cobre é se o Phaser realmente baixa o
 * arquivo — e isso fica registrado como o limite, não escondido.
 */
function cenaFalsa({ texturas = [] } = {}) {
  const ouvintes = new Map();
  const pedidos = [];
  const iniciados = [];

  const scene = {
    texturas: {
      existentes: new Set(texturas),
      exists(key) {
        return this.existentes.has(key);
      },
      /** Como o Phaser: chave fora da lista devolve a `__MISSING`, não `undefined`. */
      get(key) {
        if (this.existentes.has(key)) return { key };
        return { key: MISSING };
      }
    },
    load: {
      once(evento, fn) {
        if (!ouvintes.has(evento)) ouvintes.set(evento, []);
        ouvintes.get(evento).push(fn);
      },
      image(key, url) {
        pedidos.push({ key, url });
      },
      start() {
        iniciados.push(pedidos.length);
      }
    },

    // Instrumentação do teste, não da cena real.
    _pedidos: pedidos,
    _iniciados: iniciados,
    _ouvintes: ouvintes,

    /** Dispara um evento como o Phaser faria quando o arquivo chega. */
    emitir(evento) {
      for (const fn of ouvintes.get(evento) ?? []) fn();
    },

    /** Marca uma textura como carregada, como o `textures.exists` passaria a ver. */
    terTextura(key) {
      scene.texturas.existentes.add(key);
    }
  };

  return scene;
}

const arteDe = (biomaId) => [getBackdropKey(biomaId), getEntranceKey(biomaId)];

export { cenaFalsa, arteDe, MISSING };
