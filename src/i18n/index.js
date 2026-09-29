/**
 * Idiomas do jogo.
 *
 * O jogo falava português em tudo, e "tudo" é uma lista maior do que parece:
 * HUD, menu, configurações, seleção de bioma, lobby, loja, pausa, os avisos de
 * tela cheia, os bônus de quebra, os nomes dos biomas, das relíquias e dos
 * objetivos. Passar tudo por aqui é o que permite trocar de idioma sem tocar em
 * componente nenhum.
 *
 * ## O dicionário de `pt-BR` é a fonte da verdade
 *
 * O conjunto de chaves é o que o arquivo de português declara. Os outros nove
 * têm que ter exatamente o mesmo conjunto, e `test/i18n.test.mjs` falha se
 * faltar ou sobrar uma. Sem isso, traduzir nove idiomas vira nove-fontes de
 * buraco silencioso: a chave que ninguém traduziu não dá erro, ela mostra a
 * chave.
 *
 * ## Por que uma variável de módulo
 *
 * A cena do Phaser tem textos espalhados em `setMessage`, `notify` e `add.text`,
 * a dezenas de linhas de distância de qualquer componente React. Passar um `t`
 * por parâmetro em cada uma delas seria ruído. Então o módulo guarda o idioma
 * atual, e quem chega perto dele é que avisa.
 *
 * O idioma inicial vem do `localStorage` — e não do handshake com o React — por
 * um motivo concreto: a cena desenha o primeiro mapa em `create()`, ANTES de
 * despachar `cob-scene-ready`. Se o idioma dependesse desse despacho, o primeiro
 * mapa sairia no idioma detectado pelo navegador mesmo com o jogador tendo
 * escolhido outro, e corrigir depois seria um repaint visível no meio da run.
 *
 * ## Nada de tradução automática
 *
 * As cadeias abaixo foram escritas à mão, uma a uma. Texto de jogo tem
 * registro, e registro não sobrevive a tradução automática. Os idiomas fora do
 * alfabeto latino (hindi, chinês, japonês) e o polonês merecem revisão de quem
 * fala a língua antes de tratarem como texto de produção.
 */
import ptBR from './locales/pt-BR.js';
import en from './locales/en.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import it from './locales/it.js';
import pl from './locales/pl.js';
import hi from './locales/hi.js';
import zhCN from './locales/zh-CN.js';
import ja from './locales/ja.js';

export const SETTINGS_STORAGE_KEY = 'coinsorbombs:settings:v1';

/** Idioma de último recurso. Também é o que o navegador em português recebe. */
export const DEFAULT_LOCALE = 'pt-BR';

/**
 * A lista que o jogador vê na tela de idioma.
 *
 * `id` é o que fica salvo. `nativeName` é o nome no próprio idioma, porque a
 * lista precisa ser legível para quem não sabe português — e é a única forma de
 * "Deutsch" dizer Deutsch para quem não lê "Alemão".
 */
export const LOCALES = [
  { id: 'pt-BR', name: 'Português (Brasil)', nativeName: 'Português (Brasil)' },
  { id: 'en', name: 'Inglês', nativeName: 'English' },
  { id: 'es', name: 'Espanhol', nativeName: 'Español' },
  { id: 'fr', name: 'Francês', nativeName: 'Français' },
  { id: 'de', name: 'Alemão', nativeName: 'Deutsch' },
  { id: 'it', name: 'Italiano', nativeName: 'Italiano' },
  { id: 'pl', name: 'Polonês', nativeName: 'Polski' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { id: 'zh-CN', name: 'Chinês (simplificado)', nativeName: '简体中文' },
  { id: 'ja', name: 'Japonês', nativeName: '日本語' }
];

const DICIONARIOS = {
  'pt-BR': ptBR,
  en,
  es,
  fr,
  de,
  it,
  pl,
  hi,
  'zh-CN': zhCN,
  ja
};

const IDS = new Set(LOCALES.map((locale) => locale.id));

/** O idioma existe no jogo? Qualquer coisa fora da lista é lixo do storage. */
export function isKnownLocale(localeId) {
  return typeof localeId === 'string' && IDS.has(localeId);
}

/**
 * Categorias de plural, por idioma.
 *
 * É a regra do CLDR, e ela não é decorativa: o polonês tem quatro formas para o
 * mesmo substantivo, e escolher a errada não é "erro de estilo" — é um substantivo
 * na declinação errada, que o leitor percebe na hora. Chinês e japonês têm uma
 * forma só, e a regra existe justamente para não duplicar a mesma string quatro
 * vezes em seis idiomas.
 *
 * O recolhimento de uma forma ausente nunca vira `undefined` na tela: `t()` cai
 * para `other` e depois para a primeira forma disponível.
 */
const REGRAS_DE_PLURAL = {
  // Latim romance e germânico: 1 no singular, o resto no plural.
  'pt-BR': (n) => (n === 1 ? 'one' : 'other'),
  en: (n) => (n === 1 ? 'one' : 'other'),
  es: (n) => (n === 1 ? 'one' : 'other'),
  // Francês trata o zero como singular, e é o idioma em que isso mais aparece
  // numa tela de contagem.
  fr: (n) => (n === 0 || n === 1 ? 'one' : 'other'),
  de: (n) => (n === 1 ? 'one' : 'other'),
  it: (n) => (n === 1 ? 'one' : 'other'),
  // Hindi: 0 e 1 caem na mesma categoria.
  hi: (n) => (n === 0 || n === 1 ? 'one' : 'other'),
  // Polonês: uma, poucas (2-4, exceto 12-14) e muitas (o resto inteiro).
  pl: (n) => {
    if (n === 1) return 'one';
    const resto = n % 10;
    const centenas = n % 100;

    if (resto >= 2 && resto <= 4 && (centenas < 12 || centenas > 14)) return 'few';
    return 'many';
  },
  // Sem plural em zh e ja.
  'zh-CN': () => 'other',
  ja: () => 'other'
};

/** A chave que o idioma escolhe para este número. */
export function pluralCategory(localeId, count) {
  const regra = REGRAS_DE_PLURAL[localeId] ?? REGRAS_DE_PLURAL[DEFAULT_LOCALE];
  return regra(count);
}

/**
 * Escolhe a forma dentro de uma mensagem que é um objeto de formas.
 *
 * A ordem de queda é `categoria → other → primeira forma presente`. A última
 * etapa é o que impede `undefined` na tela quando um idioma não tem a categoria
 * pedida — e ela também é o que deixa um idioma de escrita sem plural escrever
 * `other` uma vez só em vez de quatro.
 */
function escolheForma(entrada, localeId, count) {
  if (typeof entrada === 'string') return entrada;
  if (!entrada || typeof entrada !== 'object') return null;

  const categoria = pluralCategory(localeId, count);

  if (entrada[categoria]) return entrada[categoria];
  if (entrada.other) return entrada.other;
  if (entrada.one) return entrada.one;

  return entrada[Object.keys(entrada)[0]] ?? null;
}

/** Troca `{chave}` pelo valor, e deixa o que não veio como está. */
function interpola(texto, params) {
  if (!params) return texto;

  return texto.replace(/\{(\w+)\}/g, (match, nome) => {
    if (!(nome in params)) return match;

    const valor = params[nome];
    return valor === null || valor === undefined ? match : String(valor);
  });
}

/**
 * Cria um tradutor preso a um idioma.
 *
 * Devolve uma função, e não um objeto, porque o uso é `t('chave')` em centenas de
 * lugares e um `i18n.t('chave')` em cada um deles é ruído que atrapalha a leitura
 * do componente.
 *
 * Uma chave que não existe no dicionário DEVolve a própria chave, com o prefixo
 * de idioma. Um `''` silencioso esconderia o erro; devolver a chave deixa a
 * falta visível na tela e o teste aponta o nome exato.
 */
export function createTranslator(localeId) {
  const id = isKnownLocale(localeId) ? localeId : DEFAULT_LOCALE;
  const dicionario = DICIONARIOS[id];

  return function traduz(chave, params) {
    const entrada = dicionario[chave];

    if (entrada === undefined) return `[${id}] ${chave}`;

    const forma = escolheForma(entrada, id, params?.count);

    if (forma === null) return `[${id}] ${chave}`;

    return interpola(forma, params);
  };
}

/**
 * O idioma do navegador, entre os que o jogo tem.
 *
 * Casa por PREFIXO, e não por igualdade: o navegador diz `en-GB`, `pt-PT`,
 * `zh-HK`, e o jogo tem `en`, `pt-BR`, `zh-CN`. Sem o prefixo, todo mundo cairia
 * no português — que é exatamente o caso que o jogador não entende.
 *
 * A lista de preferências inteira é varrida, na ordem: alguém com navegador em
 * `[ja, en]` tem o japonês, que é o que ele pediu primeiro.
 */
export function detectLocale(languages) {
  if (!Array.isArray(languages)) return DEFAULT_LOCALE;

  for (const bruto of languages) {
    if (typeof bruto !== 'string') continue;

    const normalizado = bruto.trim().toLowerCase().replace('_', '-');
    if (!normalizado) continue;

    if (IDS.has(normalizado)) return normalizado;

    const prefixo = normalizado.split('-')[0];
    const achado = LOCALES.find((locale) => locale.id.toLowerCase().split('-')[0] === prefixo);

    if (achado) return achado.id;
  }

  return DEFAULT_LOCALE;
}

/** O que o navegador pede, ignorando o que já foi salvo. */
export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const lista = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  return detectLocale(lista);
}

/**
 * O idioma salvo, ou o detectado.
 *
 * A ordem é o que faz a escolha do jogador vencer a detecção, e só depois disso
 * vem a detecção. Um valor salvo que não existe mais no jogo (idioma removido,
 * storage editado à mão) é descartado em vez de virar tela de chave.
 */
export function readStoredLocale(storageKey = SETTINGS_STORAGE_KEY) {
  if (typeof window === 'undefined') return detectBrowserLocale();

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const salvo = parsed?.language;

    if (isKnownLocale(salvo)) return salvo;
  } catch {
    // storage bloqueado ou JSON quebrado: cai na detecção
  }

  return detectBrowserLocale();
}

let localeAtual = readStoredLocale();

/** O idioma em vigor, para quem não recebeu um tradutor na mão. */
export function getLocale() {
  return localeAtual;
}

export function setLocale(localeId) {
  localeAtual = isKnownLocale(localeId) ? localeId : DEFAULT_LOCALE;
  return localeAtual;
}

/** O tradutor do idioma em vigor. Para o uso direto dentro da cena. */
export function t(chave, params) {
  return createTranslator(localeAtual)(chave, params);
}

/** Todas as chaves declaradas pelo dicionário de português. */
export function localeKeys() {
  return Object.keys(DICIONARIOS[DEFAULT_LOCALE]).sort();
}

/** O dicionário cru de um idioma. Usado pelos testes. */
export function getDictionary(localeId) {
  return DICIONARIOS[localeId] ?? null;
}
