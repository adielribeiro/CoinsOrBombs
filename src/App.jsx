import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGame } from './game/createGame.js';
import { duracaoDaCarta } from './game/cartaFinal.js';
import {
  UPGRADE_IDS,
  UPGRADES,
  chaveDoProximoBeneficio,
  comprarMelhoria,
  custoDoProximoNivel,
  nivelDe,
  nivelMaximo,
  saldoDeReliquias
} from './game/melhorias.js';
import {
  MARGEM_DO_PONTEIRO_PX,
  SENSIBILIDADES,
  SENSIBILIDADE_PADRAO,
  VELOCIDADES,
  VELOCIDADE_PADRAO,
  deslocamentoDoPonteiro,
  indiceDaLista,
  limitarPonteiro,
  porcentagemDaSensibilidade,
  porcentagemDaVelocidade,
  proximaSensibilidade,
  proximaVelocidade
} from './game/ponteiro.js';
import {
  describeFullscreenError,
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  isIosLike,
  isStandaloneDisplay,
  onFullscreenChange,
  toggleFullscreen
} from './game/fullscreen.js';
import { introJaVista, marcarIntroVista } from './game/intro.js';
import { BLACK_SCREEN_MS, LOGO_FADE_MS } from './game/temposDeEntrada.js';
import {
  CHAVE_FALANTE_FINAL,
  caminhoDaArteFinal,
  paineisDaCenaFinal,
  proximoIndiceFinal,
  temCenaFinal
} from './game/cenaFinal.js';
import {
  LOCALES,
  createTranslator,
  getLocale,
  readStoredLocale,
  setLocale,
  t as tNoCarregamento
} from './i18n/index.js';
import {
  BIOMES,
  RELIC_CATALOG,
  aplicarEfeitosDasMelhorias,
  cavesDoBioma,
  contaProgresso,
  ehUltimaCaveDoBioma,
  fixarMelhoriaEscolhida,
  resetarMelhoriasTemporarias,
  OPCOES_FIXAS,
  OPCOES_TEMPORARIAS,
  caveAoMorrer,
  createCollectionState,
  createImprovementState,
  createStatsState,
  createUtilityInventory,
  ehCaveFinal,
  getBiomeForCave,
  getBiomeProgress,
  getObjectiveProgressList,
  melhoriasReiniciadas,
  recomecoAposMorte,
  TOTAL_CAVES as TOTAL_CAVES_DO_JOGO,
  getTotalRelics,
  getUnlockedBiomes
} from './game/progression.js';
import {
  apagarJogo,
  comPermanentes,
  criarJogo,
  estadoInicial,
  estadoInicialDev,
  gravarEstadoDoJogo,
  lerJogo,
  listarJogos,
  marcarUltimoJogado,
  migrarPerfilAntigo,
  normalizarNome,
  renomearJogo,
  saveCompativelComOModo
} from './game/saves.js';
import { criarLeitorDeControle } from './game/gamepad.js';
import { alvoSobElemento, criarNavegadorDeFoco, passoDeRepeticao } from './game/foco.js';
import { fechaTelaDoTopo, telaDoTopo } from './game/telas.js';
import { buildRewardCatalog, getRewardVisual, pickRewardOptions, shuffle } from './game/rewards.js';
import {
  CHAVE_FALANTE,
  caminhoDaImagem,
  paineisDoBioma,
  precarLore,
  proximoIndice,
  deveAbrirLore
} from './game/lore.js';
import { getBackdropKey } from './game/backdrops.js';
import './styles/app.css';

const firstBiome = getBiomeForCave(1);

const initialState = {
  screen: 'cave',
  cave: 1,
  hp: 2,
  maxHp: 2,
  coins: 0,
  bombs: 0,
  bombsRemaining: 0,
  pickaxeLevel: 1,
  pickaxePower: 1,
  biomeId: firstBiome.id,
  biomeName: firstBiome.name,
  bestCave: 1,
  collection: createCollectionState(),
  stats: createStatsState(),
  lastRelicFound: null,
  utilities: createUtilityInventory(),
  inLobby: false,
  lobbyReason: null,
  nextCaveAvailable: null,
  outcomeCave: null,
  // Valor padrão apenas: `buildResetState` sobrescreve `lastMessage` logo abaixo.
  // A chave resolve no idioma que o módulo de i18n já carregou do storage, e isso
  // não importa justamente porque o valor nunca chega a ser exibido.
  lastMessage: tNoCarregamento('msg.intro'),
  ...createImprovementState()
};

/**
 * Utilitários da run.
 *
 * `tone` é a cor de cada um, e ela mora aqui por dois motivos. O primeiro é
 * funcional: sem um tom por item, os três botões ficam visualmente idênticos
 * e o jogador precisa ler o rótulo para saber o que é o quê. O segundo é de
 * direção: a barra usava `--ink-faint` no rótulo e `opacity: 0.3` no botão
 * inteiro, e as duas reduções se somavam — o resultado era um borrão que
 * competia com a arte do fundo em vez de informar.
 *
 * Os tons seguem o ícone: rosa para vida, âmbar para bomba, ciano para bússola.
 *
 * Isto é uma FUNÇÃO e não uma constante, por causa do `t`. Um catálogo montado
 * no carregamento do módulo resolveria nome e descrição uma vez, no idioma de
 * quem abriu o jogo, e ficaria preso nisso para sempre: trocar de idioma
 * deixaria a loja e a barra de utilitários em português com o resto da tela
 * traduzida. Resolver no render é o que faz a troca valer na hora.
 */
function buildUtilityCatalog(t) {
  return [
    {
      id: 'lifePotion',
      icon: '❤️',
      name: t('utility.lifePotion.name'),
      description: t('utility.lifePotion.description'),
      cost: 10,
      tone: '#ff5f7e'
    },
    {
      id: 'revealBomb',
      icon: '💣',
      name: t('utility.revealBomb.name'),
      description: t('utility.revealBomb.description'),
      cost: 35,
      tone: '#ffb23c'
    },
    {
      id: 'safePath',
      icon: '🧭',
      name: t('utility.safePath.name'),
      description: t('utility.safePath.description'),
      cost: 80,
      tone: '#3ddcff'
    }
  ];
}

const BIOME_ACCENT_COLORS = {
  sunstone: '#ffc26b',
  frost: '#8fd8ff',
  ember: '#ff926b',
  ruins: '#b99cff'
};

const ENTRY_PHASE = {
  MENU: 'menu',
  BLACK: 'black',
  LOGO: 'logo',
  LORE: 'lore',
  PLAYING: 'playing'
};

/* `BLACK_SCREEN_MS` e `LOGO_FADE_MS` moram em `game/temposDeEntrada.js`. A
   animação do logo é CSS e não lê nada de JavaScript, então o acoplamento entre os
   dois é só de conversa — e é testado contra a folha de estilo. */
/**
 * A versão do jogo, mostrada no rodapé do menu e usada para armar o splash.
 *
 * ## Mudar aqui rearma o splash de todo mundo
 *
 * É o único lugar que decide isso. `intro.js` guarda a **versão** em que o splash
 * foi visto, e compara com este número: enquanto os dois batem, o splash não
 * repete; quando um sobe, ele volta para todo mundo. Uma correção de arte sem
 * subir a versão deixa o logo novo invisível justamente para quem já viu o
 * antigo.
 */
const GAME_VERSION = '0.3.0';

/**
 * Os parágrafos da carta, na ordem em que sobem.
 *
 * Uma lista aqui, e não a carta inteira como uma string: o parágrafo é o que dá o
 * ritmo da rolagem, cada um precisa do seu espaço, e um texto corrido só
 * permitiria um bloco único no meio da tela. Os parágrafos também viram chaves de
 * i18n — os dez idiomas têm comprimentos diferentes, e quem decide o espaço é o
 * navegador, não o texto.
 */
const FINALE_PARAGRAFOS = ['finale.p1', 'finale.p2', 'finale.p3', 'finale.p4', 'finale.p5'];

/**
 * Tudo o que a carta mostra, na ordem em que sobe.
 *
 * A duração é calculada a partir desta lista inteira, e não só dos parágrafos: um
 * título e uma assinatura que não entrassem na conta seriam 30 segundos de carta
 * sem tempo, e o fim voltaria ao menu no meio da frase.
 */
const FINALE_TRECHOS = [
  'finale.title',
  ...FINALE_PARAGRAFOS,
  'finale.signature',
  'finale.team',
  'finale.closing'
];

const SETTINGS_STORAGE_KEY = 'coinsorbombs:settings:v1';
const PROFILE_STORAGE_KEY = 'coinsorbombs:profile:v1';

/**
 * Total de caves, derivado dos biomas.
 *
 * Estava escrito à mão no tagline do menu ("80 caves · 4 biomas"), e mentiu
 * assim que as faixas passaram de 20 para 10 caves. Agora vem da lista.
 *
 * Hoje morava aqui e foi para `progression.js`: o final do jogo precisa saber
 * qual é a última caverna das duas pontas — para mostrar a carta e para saber
 * que depois dela não existe outra — e um total que mora na tela não pode ser
 * testado sem a tela.
 */
const TOTAL_CAVES = TOTAL_CAVES_DO_JOGO;

/**
 * Configurações que o jogador escolhe.
 *
 * `reducedMotion` e `showGrid` saíram daqui junto com os interruptores. As duas
 * agora são derivadas: a animação reduzida vem de `prefers-reduced-motion` e a
 * grade fica sempre desligada. Ver `buildSceneSettings`.
 *
 * `language` não tem um valor fixo aqui, e essa é a diferença em relação às
 * outras três. As três são decisões do jogador com um padrão razoável; o idioma
 * depende de uma informação que só o navegador tem — o idioma que a pessoa lê.
 * `readStoredLocale` resolve a ordem: o que foi salvo, senão o que o navegador
 * pede, senão português. Escrever `'pt-BR'` aqui sobrescreveria a detecção com um
 * literal, e o navegador em espanhol receberia português sem nunca perguntar.
 */
const DEFAULT_SETTINGS = {
  persistProgress: true,
  autoFullscreen: true,
  developerMode: false,
  /**
   * A escala entre o empurrão do analógico e o deslocamento do ponteiro.
   *
   * `1` é o padrão e não é um número arbitrário: é a velocidade que um mouse
   * "de média" entrega. Os outros valores são de `SENSIBILIDADES`, e não uma
   * aritmética — um `+0.25` deixaria o estado guardar valores que o menu não
   * sabe mostrar.
   */
  ponteiroSensibilidade: SENSIBILIDADE_PADRAO,
  /**
   * O teto de quanto o ponteiro anda por segundo.
   *
   * Separate da sensibilidade de propósito. A sensibilidade é a resposta embaixo —
   * quanto anda com um empurrão pequeno, que é a mira fina. A velocidade é o teto:
   * quanto anda no fim do curso, que é o deslocamento longo. Se fossem um número
   * só, quem quisesse atravessar a tela depressa acabaria com a mira fina também
   * acelerada.
   */
  ponteiroVelocidade: VELOCIDADE_PADRAO
};

/**
 * Lê as configurações, descartando as chaves que deixaram de existir.
 *
 * `readStorage` faz merge com o que está salvo, e é o comportamento certo para
 *_defaults_ novos. Mas para uma chave REMOVIDA ele é o contrário do que se
 * quer: o `showGrid: true` de um jogador que tinha ligado a grade voltava do
 * navegador e entrava no estado, mesmo sem mais nenhum interruptor na tela.
 *
 * O efeito prático era o pior dos dois: a cena recebia `showGrid: true` e
 * desenhava a grade, e o jogador não tinha caminho para desligar. `buildSceneSettings`
 * já neutraliza isso, mas deixar a chave no estado é armadilha para quem for
 * mexer aqui depois — um `settings.showGrid` lido em qualquer lugar voltaria a
 * valer sem ninguém saber por quê.
 *
 * Descartar na leitura faz o `localStorage` se curar sozinho na próxima
 * gravação, e o estado passa a descrever só o que existe.
 */
const CHAVES_DE_SETTINGS_REMOVIDAS = ['reducedMotion', 'showGrid'];

function readSettings() {
  const lido = readStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const limpo = { ...lido };

  for (const chave of CHAVES_DE_SETTINGS_REMOVIDAS) {
    delete limpo[chave];
  }

  // O idioma é resolvido DEPOIS do merge, e nunca a partir dele. Um valor
  // salvo que não existe mais no jogo — idioma removido numa atualização, ou
  // storage editado à mão — é ignorado, e a detecção do navegador assume. Sem
  // isso o estado descreveria um idioma que nenhuma cadeia sabe traduzir, e o
  // `createTranslator` cairia no português calado em vez de detectar.
  limpo.language = readStoredLocale(SETTINGS_STORAGE_KEY);

  return limpo;
}

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado / storage bloqueado: o jogo segue funcionando sem persistir
  }
}
function isCoarsePointerDevice() {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;

  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * O sistema pede menos animação?
 *
 * Havia um interruptor "Reduzir animações" nas configurações, e ele saiu. A
 * opção não foi junto com o comportamento: agora quem desliga partículas, o
 * tremor da picareta e o pulso da saída é o SISTEMA, pelo
 * `prefers-reduced-motion`.
 *
 * A troca é melhor do que aoption original em dois sentidos. Primeiro, não
 * exige que o jogador saiba que existe a opção, procure no menu e ligue.
 * Segundo, respeita a preferência de quem muda o sistema inteiro, e não só
 * este site. Apagar o interruptor e manter o comportamento preso num booleano
 * salvo seria tirar a acessibilidade de quem depende dela.
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * O que vai para a cena do Phaser.
 *
 * Sai de uma função, e não dos dois `dispatchEvent` inline, porque eles já
 *eram dois lugares para manter em sincronia e era exatamente aí que a
 * divergência apareceria: um enviaria `reducedMotion` e o outro não.
 */
function buildSceneSettings(settings) {
  return {
    ...settings,
    reducedMotion: prefersReducedMotion(),
    // A grade isométrica também perdeu o interruptor. Aqui vai explícito
    // porque `readStorage` faz merge com o que está salvo: um jogador que tinha
    // ligado a grade continuaria com ela ligada, sem nenhum caminho para
    // desligar. Fixar o valor é o que neutraliza a preferência antiga.
    showGrid: false
  };
}

/**
 * A detecção antiga era só `largura <= 900 && altura > largura`, o que
 * classificava janelas de desktop estreitas como celular em retrato. Pior:
 * o gate de rotação só ficava visível abaixo de 640px de CSS, então entre
 * 641px e 900px o menu era escondido E o aviso não aparecia — tela preta
 * sem nenhum caminho para recuperar.
 */
function needsLandscapeGate() {
  if (typeof window === 'undefined') return false;
  if (!isCoarsePointerDevice()) return false;
  if (window.innerWidth <= window.innerHeight) return true;

  return window.innerWidth <= 560;
}

function tryLockLandscape() {
  if (typeof window === 'undefined') return;

  const orientationApi = window.screen?.orientation;

  if (orientationApi?.lock) {
    orientationApi.lock('landscape').catch(() => {
      // alguns navegadores bloqueiam essa chamada
    });
  }
}

function normalizeProgressState(state) {
  const maxHp = Math.max(1, state?.maxHp ?? 2);

  return {
    ...state,
    collection: { ...createCollectionState(), ...(state?.collection ?? {}) },
    stats: { ...createStatsState(), ...(state?.stats ?? {}) },
    utilities: { ...createUtilityInventory(), ...(state?.utilities ?? {}) },
    maxHp,
    hp: Math.min(maxHp, Math.max(0, state?.hp ?? maxHp)),
    biomeId: state?.biomeId ?? getBiomeForCave(state?.cave ?? 1).id,
    biomeName: state?.biomeName ?? getBiomeForCave(state?.cave ?? 1).name,
    bestCave: state?.bestCave ?? 1,
    lastRelicFound: state?.lastRelicFound ?? null
  };
}

/**
 * O estado completo de um jogo que foi acabado de carregar.
 *
 * O save traz só o progresso (`PERSISTENTE` em `saves.js`). O estado de tela vem
 * do `initialState`, e isso não é detalhe: quem abre um jogo entra na caverna
 * dele, e não numa tela de vitória que ficou aberta no momento em que salvou —
 * nem preso num lobby de derrota que ele já resolvendo.
 *
 * O `initialState` entra como base justamente por causa disso. O caminho inverso,
 * começar pelo save e completar o resto, devolveria um estado sem `screen` nem
 * `inLobby`, e o primeiro `if` da tela cairia num estado indefinido.
 */
function montarEstadoCarregado(carregado, traduzir) {
  const cave = Number.isFinite(carregado?.cave) ? carregado.cave : 1;
  const biome = getBiomeForCave(cave);

  return normalizeProgressState({
    ...initialState,
    ...carregado,
    cave,
    biomeId: carregado?.biomeId ?? biome.id,
    biomeName: carregado?.biomeName ?? biome.name,
    // A mensagem que o save traz é do instante em que ele foi gravado, e pode ser
    // uma de derrota. A de entrada é a mesma que a seleção de bioma mostrava.
    lastMessage: traduzir('msg.enterCave', {
      cave: getBiomeProgress(cave).label,
      biome: traduzir(biome.nameKey)
    })
  });
}

/**
 * A data de um save, no formato do idioma em uso.
 *
 * `Intl` e não uma data montada à mão: o formato da data muda por idioma, e a
 * forma curta é a que cabe no card. Se `Intl` não existir ou o dado vier
 * corrompido, a card segue sem data — uma data errada é pior do que nenhuma.
 */
function formatarDataDeJogo(instante, localeId) {
  if (!Number.isFinite(instante) || instante <= 0) return '';

  try {
    return new Intl.DateTimeFormat(localeId, { dateStyle: 'medium' }).format(new Date(instante));
  } catch {
    return '';
  }
}

/**
 * Já existe um jogo com esse nome?
 *
 * Comparar sem normalizar daria dois "Jogo 1" com nomes diferentes só por causa de
 * um espaço ou de maiúsculas, e a pessoa não acharia nenhum dos dois. Nomes
 * repetidos são permitidos — o Minecraft deixa —, então isto é um aviso e não um
 * bloqueio.
 */
function nomeDeJogoRepetido(lista, nome, idIgnorado = null) {
  const alvo = normalizarNome(nome, lista.length).toLocaleLowerCase();

  return lista.some((jogo) => jogo.id !== idIgnorado && jogo.name.toLocaleLowerCase() === alvo);
}

function getBiomeAccentColor(biomeId) {
  return BIOME_ACCENT_COLORS[biomeId] ?? '#8df0b0';
}

function isBiomeCompleted(biome, bestCave = 1) {
  return bestCave >= biome.endCave;
}

function isBiomeStartCave(cave = 1) {
  const biome = getBiomeForCave(cave);
  return cave === biome.startCave;
}

export default function App() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);
  const shellRef = useRef(null);
  /**
   * A seta do ponteiro dos menus.
   *
   * Vive fora do React de propósito: ele se move a cada quadro, e um `setState`
   * por quadro redesenharia a árvore inteira para mover um `div`. O nó recebe o
   * `transform` direto, e o React só sabe que ele existe.
   */
  const ponteiroRef = useRef(null);
  const stateRef = useRef(initialState);
  const entryTimeoutRef = useRef([]);
  const hudRef = useRef(null);

  const [gameState, setGameState] = useState(initialState);
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [rewardOptions, setRewardOptions] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState(null);
  /**
   * A escolha deste lobby é uma melhoria **fixa**?
   *
   * True só na última caverna do bioma, que é onde o lobby oferece 4 opções. Serve
   * para duas coisas: escrever o aviso no cartão, e decidir no momento de confirmar
   * se a melhoria entra no piso — porque uma temporária que virasse fixa por
   * acidente sobreviveria à morte, que é o oposto do que ela é.
   */
  const [rewardIsFixed, setRewardIsFixed] = useState(false);
  const [showRotateLock, setShowRotateLock] = useState(needsLandscapeGate());
  const [showUtilityShopModal, setShowUtilityShopModal] = useState(false);
  const [showExitDecision, setShowExitDecision] = useState(false);

  /**
   * A carta do final, e o relógio dela.
   *
   * O timer fica num `useRef` em vez de ser um `setTimeout` solto, porque o final
   * termina por três caminhos — a animação acabar, o botão de pular e o `Esc` — e
   * cada um precisa cancelar o mesmo relógio. Um timer criado dentro de um handler
   * não teria de quem ser cancelado, e um sobrevive ao cancelamento de outro: voltar
   * ao menu e abrir o final de novo deixaria dois timers vivos, e o mais velho
   * derrubaria a tela no meio da segunda leitura.
   *
   * O `useEffect` abaixo é a rede de segurança para o caso do componente desmontar
   * com a carta aberta.
   */
  const [showFinale, setShowFinale] = useState(false);
  const finaleTimerRef = useRef(null);

  /**
   * A cena final está aberta nos painéis?
   *
   * Era uma fase com dois valores — `'paineis'` e `'vista'` — e a tela muda saiu do
   * jogo. Sobrou uma coisa só, e uma fase com um valor é um booleanovestido de
   * string: cada `cenaFinalFase === 'x'` no código era uma chance de escrever
   * `'painel'` e ficar comparando com `null` para sempre, sem erro nenhum.
   *
   * O bioma continua aqui porque é ele que diz **quais** painéis são, e o roteiro
   * vive por bioma mesmo tendo um só preenchido.
   */
  const [cenaFinalAberta, setCenaFinalAberta] = useState(false);
  const [cenaFinalBioma, setCenaFinalBioma] = useState(null);
  const [cenaFinalIndice, setCenaFinalIndice] = useState(0);

  /** O índice por ref, para o laço de controle não depender do React. */
  const cenaFinalRef = useRef({ indice: 0 });
  const [rewardRefreshCost, setRewardRefreshCost] = useState(10);
  const [entryPhase, setEntryPhase] = useState(ENTRY_PHASE.MENU);
  const [loreBioma, setLoreBioma] = useState(null);
  const [loreIndice, setLoreIndice] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showBiomeSelect, setShowBiomeSelect] = useState(false);
  const [biomeSelectContext, setBiomeSelectContext] = useState('menu');
  const [selectedBiomeId, setSelectedBiomeId] = useState(firstBiome.id);
  /**
   * A cave escolhida dentro do bioma, só no modo desenvolvedor.
   *
   * `null` significa "a primeira cave do bioma", que é o que o jogo faz sempre.
   * Guardar `null` em vez de um número é o que mantém o comportamento normal
   * intacto sem um `if` espalhado: quem escolhe bioma começa a ver a primeira cave
   * de novo, e o botão de confirmar volta a dizer "Começar neste bioma".
   */
  const [selectedCave, setSelectedCave] = useState(null);
  const [pendingBiomeState, setPendingBiomeState] = useState(null);

  /**
   * Os jogos salvos, e o jogo em andamento.
   *
   * A migração roda dentro do inicializador em vez de um efeito, para o primeiro
   * render já mostrar o jogo migrado. Ela é idempotente — só age quando não
   * existe jogo nenhum — então rodar duas vezes, como o StrictMode faz em
   * desenvolvimento, não cria um "Jogo 1" duplicado.
   *
   * `activeSaveId` é o slot que o `gameState` atual pertence. Sem ele não há para
   * onde gravar, e é por ele que a tela de jogos sabe qual marcar como "em
   * andamento".
   */
  const [saves, setSaves] = useState(() => {
    migrarPerfilAntigo(null);
    return listarJogos(null);
  });
  const [activeSaveId, setActiveSaveId] = useState(null);
  const [showSaves, setShowSaves] = useState(false);
  const [saveNameDraft, setSaveNameDraft] = useState('');

  /**
   * A edição em andamento na lista de jogos.
   *
   * `{ tipo: 'renomear' | 'apagar', id, nome }`, ou `null`. Fica dentro da tela de
   * jogos em vez de virar outro modal: renomear é uma edição de um campo da lista,
   * e uma terceira camada por cima da lista esconderia a lista.
   */
  const [saveEdit, setSaveEdit] = useState(null);
  const [settings, setSettings] = useState(() => readSettings());
  const [hudHeight, setHudHeight] = useState(0);
  const [showLanguage, setShowLanguage] = useState(false);
  const languageModalRef = useRef(null);
  const [profile, setProfile] = useState(() => readStorage(PROFILE_STORAGE_KEY, { bestCave: 1 }));
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());
  const [fullscreenNotice, setFullscreenNotice] = useState(null);
  const [toast, setToast] = useState(null);
  const [pulsingPill, setPulsingPill] = useState(null);

  /**
   * O tradutor do componente, preso ao idioma escolhido.
   *
   * `useMemo` e não a variável de módulo do i18n porque o render precisa ler o
   * idioma NOVO já na primeira passada. Se o render usasse o idioma do módulo, a
   * troca só apareceria depois de um efeito — e nenhum efeito redesenha por si
   * só, então a tela ficaria mostrando metade em português e metade no idioma
   * novo até o jogador clicar em alguma coisa.
   *
   * O `setLocale` do efeito abaixo existe para o outro lado: a cena do Phaser
   * pede texto em dezenas de lugares sem tradutor na mão, e lê o do módulo.
   */
  const t = useMemo(() => createTranslator(settings.language), [settings.language]);
  const utilityCatalog = useMemo(() => buildUtilityCatalog(t), [t]);

  /*
   * O saldo de relíquias que a loja mostra.
   *
   * Sai do estado, e não de um contador próprio: um contador na tela contaria as compras
   * e esqueceria as relíquias achadas na caverna, e a loja mostraria um número que não é
   * o do save.
   */
  const saldoReliquias = saldoDeReliquias(gameState);

  /**
   * Quanto tempo a carta do fim leva para subir, no idioma em tela.
   *
   * Três coisas precisam deste mesmo número, e por isso ele mora num `useMemo` e
   * não numa constante de módulo: a animação CSS, o relógio que devolve a pessoa ao
   * menu, e o `animationend` que fecha a carta. Divergir entre elas faz o fim
   * voltar ao menu antes ou depois de a carta terminar.
   *
   * Depende de `t` e não de `settings.language`: `t` é o tradutor, e é dele que sai
   * o texto que será medido. Uma tradução mais longa dá uma carta mais longa — que
   * é o motivo de o cálculo existir, e não uma letra miúda.
   */
  const duracaoFinale = useMemo(() => duracaoDaCarta(FINALE_TRECHOS.map(t)), [t]);

  useEffect(() => {
    setLocale(settings.language);
  }, [settings.language]);

  /**
   * Rola a lista de idiomas até a opção que está em uso.
   *
   * A lista tem dez itens e a caixa tem altura de cerca de seis. Sem isto, quem
   * está no fim da lista — japonês e chinês ficam nas duas últimas posições —
   * abre a tela e não vê qual está marcado, a não ser que role até o fim. E o
   * que a tela precisa responder primeiro é "qual é o meu?".
   *
   * `nearest` e não `center`: em telas largas, centralizar a opção atual jogaria
   * a lista inteira para fora de vista, que é o oposto do que se quer.
   */
  useEffect(() => {
    if (!showLanguage) return;

    const selecionada = languageModalRef.current?.querySelector('.language-option.selected');
    selecionada?.scrollIntoView({ block: 'nearest' });
  }, [showLanguage, settings.language]);

  /**
   * A pausa só faz sentido com uma run em andamento. No lobby a cena já está
   * congelada atrás de uma tela de decisão, e no menu não há jogo para pausar.
   *
   * Isto fica aqui, logo abaixo dos `useState`, e não junto dos outros valores
   * derivados mais abaixo. Os efeitos que dependem de `pauseOpen` são declarados
   * ANTES deste ponto no arquivo, e um `const` lido antes da sua inicialização
   * cai na zona morta temporal: a versão anterior declarava isto na linha 1069 e
   * o efeito na 531, o que derrubava o app inteiro com "Cannot access 'pauseOpen'
   * before initialization". O sintoma era um `#root` vazio e zero botões na tela.
   */
  const pauseAvailable = entryPhase === ENTRY_PHASE.PLAYING && !gameState.inLobby;
  const pauseOpen = showPause && pauseAvailable;

  const fullscreenAvailable = isFullscreenSupported() || isStandaloneDisplay();
  const needsPwaHint = isIosLike() && !isStandaloneDisplay();

  /**
   * Pede tela cheia. Precisa ser chamado SINCRONAMENTE de dentro de um
   * handler de clique: a Fullscreen API só aceita um gesto do usuário, e a
   * intro do jogo roda em setTimeout, então pedir depois é sempre recusado.
   */
  const requestGameplayFullscreen = useCallback(() => {
    if (!settings.autoFullscreen) return;
    if (isFullscreenActive()) return;

    enterFullscreen(shellRef.current)
      .then(() => {
        // No Android, travar a orientação só funciona já em fullscreen.
        tryLockLandscape();
      })
      .catch((failure) => {
        const described = describeFullscreenError(failure);

        // Sem suporte e já em modo app, não é erro: é o estado desejado.
        if (described.code === 'unsupported' && isStandaloneDisplay()) return;

        setFullscreenNotice(described);
      });
  }, [settings.autoFullscreen]);

  const handleToggleFullscreen = useCallback(() => {
    toggleFullscreen(shellRef.current)
      .then(() => setFullscreenNotice(null))
      .catch((failure) => setFullscreenNotice(describeFullscreenError(failure)));
  }, []);

  useEffect(() => {
    return onFullscreenChange(() => {
      setIsFullscreen(isFullscreenActive());

      // Sair do fullscreen devolve o documento ao tamanho da janela: o
      // canvas precisa remedir ou fica com o ratio errado.
      window.dispatchEvent(new CustomEvent('cob-force-resize'));
    });
  }, []);

  // Toast: some sozinho, sem fila. Substitui o log de ação removido.
  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!pulsingPill) return undefined;

    const timer = window.setTimeout(() => setPulsingPill(null), 520);
    return () => window.clearTimeout(timer);
  }, [pulsingPill]);

  useEffect(() => {
    const handleToast = (event) => {
      if (event.detail?.text) setToast(event.detail);
    };

    const handlePulse = (event) => setPulsingPill(event.detail?.kind ?? null);

    window.addEventListener('cob-toast', handleToast);
    window.addEventListener('cob-pulse-pill', handlePulse);

    return () => {
      window.removeEventListener('cob-toast', handleToast);
      window.removeEventListener('cob-pulse-pill', handlePulse);
    };
  }, []);

  /**
   * As telas abertas, na forma que a pilha de `telas.js` entende.
   *
   * Este objeto é a **única** fonte da ordem de fechamento: o `Esc` e o botão
   * voltar do controle leem os dois daqui, e é o que impede que um modal novo
   * responda a um e não ao outro. Ver `telas.js` para por que a ordem mora numa
   * lista em vez de num `if`/`else`.
   */
  const telasAbertas = {
    final: showFinale,
    saida: showExitDecision,
    utilitaria: showUtilityShopModal,
    bioma: showBiomeSelect,
    jogos: showSaves,
    idioma: showLanguage,
    configuracoes: showSettings,
    informacoes: showInfoModal,
    pausa: showPause
  };

  /**
   * Fecha a tela pelo nome da pilha. Cada caso é um `setState` do próprio nome.
   *
   * É uma função comum e não um `useCallback` de propósito: `fecharFinale` é
   * declarado bem mais abaixo neste componente, e o array de dependências de um
   * `useCallback` seria avaliado no mesmo render em que `fecharFinale` ainda está
   * na zona morta temporal. Isso derruba o jogo inteiro na montagem com um
   * `ReferenceError` que não tem nada a ver com a linha que o causou. O custo de
   * não memoizar é uma função nova por render num handler de teclado — nenhum.
   */
  const fecharTelaPeloNome = (nome) => {
    if (nome === 'final') fecharFinale();
    else if (nome === 'saida') setShowExitDecision(false);
    else if (nome === 'utilitaria') setShowUtilityShopModal(false);
    else if (nome === 'bioma') setShowBiomeSelect(false);
    else if (nome === 'jogos') setShowSaves(false);
    else if (nome === 'idioma') setShowLanguage(false);
    else if (nome === 'configuracoes') setShowSettings(false);
    else if (nome === 'informacoes') setShowInfoModal(false);
    else if (nome === 'pausa') setShowPause(false);
  };

  /**
   * O pedido de pausa, e o mesmo para o `Esc` e para a engrenagem do canto.
   *
   * ## Por que um caminho só
   *
   * Porque são a mesma ação com duas entradas, e duas entradas com ações
   * ligeiramente diferentes é como se descobre que a pausa fecha um modal num lugar
   * e abre outro. O `Esc` fecha o que estiver aberto e, na falta de modal, abre a
   * pausa; a engrenagem tem de fazer o mesmo — é o que a pessoa que toca na tela
   * espera de um botão que diz "pausa".
   *
   * Na prática, durante a partida quase nunca há outro modal aberto, e a engrenagem
   * só abre a pausa. O caminho único é o que garante que isso continue verdade se
   * amanhã existir uma tela que abre por cima da partida.
   *
   * ## Por que `useCallback`
   *
   * Porque o `useEffect` do `keydown` depende dele. Sem isso, o efeito seria
   * desrebindado a cada quadro do React — o par `telasAbertas`/`fecharTelaPeloNome`
   * deste mesmo arquivo mostra o que custa.
   *
   * Em tela cheia o `Esc` pertence ao navegador, então é ignorado pelo efeito:
   * do contrário o modal fecharia junto com a tela cheia. Quem entra em tela cheia e
   * aperta `Esc` antes continua sem pausa; a engrenagem na tela faz esse papel, e é
   * por isso que ela existe.
   */
  const pedirPausa = useCallback(() => {
    if (fechaTelaDoTopo(telasAbertas, fecharTelaPeloNome)) return;

    if (pauseAvailable) setShowPause(true);
  }, [telasAbertas, fecharTelaPeloNome, pauseAvailable]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || isFullscreenActive()) return;

      pedirPausa();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pedirPausa]);

  /**
   * A pausa começa com o foco dentro dela.
   *
   * ## O problema que isto resolve
   *
   * Nenhum modal do jogo toma o foco ao abrir. Quem abre a pausa — pelo `Esc`, pelo
   * `Start` do controle, ou pela engrenagem da tela — deixa o foco onde estava, e o
   * foco pode estar em qualquer lugar: num botão do HUD, na engrenagem, no chão.
   *
   * Com o controle isso vira uma armadilha: os botões da pausa ficam no meio da tela,
   * e os alvos alcançáveis com o direcional são os da página inteira. De um botão no
   * canto inferior, `cima` e `baixo` não acham caminho para o painel — a pessoa fica
   * andando em círculo pelos botões do canto, com a pausa aberta na frente.
   *
   * ## Por que só a pausa
   *
   * Porque é a tela que o botão novo torna fácil de abrir com o foco já no canto. As
   * outras têm o mesmo defeito e a correção certa para elas é geral — cada modal
   * ganhar foco ao abrir —, e isso é mudança de sistema, não correção de botão.
   *
   * ## Por que o primeiro botão e não o painel
   *
   * Porque o painel não recebe foco e o primeiro botão é "Continuar", que é a ação
   * que a pessoa quer na maioria das vezes em que abre a pausa. Deixar o `A` em
   * "Continuar" e o `B`/`Esc` fechando é o caminho mais curto de volta ao jogo.
   */
  const pausaRef = useRef(null);

  useEffect(() => {
    if (!pauseOpen) return;

    const primeiro = pausaRef.current?.querySelector('button');

    primeiro?.focus();
  }, [pauseOpen]);

  /**
   * As teclas da lore e da cena final.
   *
   * ## `Enter` pula, `Espaço` avança, e são botões diferentes de propósito
   *
   * São duas vontades diferentes: "quero ler o resto" e "chega, me deixa
   * jogar". Juntar as duas num botão só faria quem quer ler perder o roteiro
   * inteiro, e faria quem quer pular ter que apertar seis vezes.
   *
   * ## A cena final pula para a carta
   *
   * O `Enter` e o `B`/`Quadrado` levam dos painéis direto para os créditos. Havia
   * uma tela muda no meio — a paisagem sem ninguém — e ela só custava um toque a
   * mais no fim do jogo.
   *
   * ## O efeito depende do índice, e não da função
   *
   * `avancarLore` é recriada a cada render. Depender dela rebindaria o listener
   * do `window` em cada quadro do React, e o par `telasAbertas`/`fecharTelaPeloNome`
   * do efeito do `Esc` acima mostra o que isso custa. Dependendo dos primitivos
   * que a função lê, o listener só é reamarrado quando o painel muda — que é a
   * única vez que ele precisa.
   *
   * ## `event.repeat` é ignorado
   *
   * Segurar o `Enter` dispara `keydown` a cada ~30ms. Pular a lore é idempotente,
   * então não quebraria nada, mas segurar o `Espaço` andaria os seis painéis de uma
   * vez sem a pessoa ver nenhum — que é o oposto de "avançar".
   */
  useEffect(() => {
    const naLore = entryPhase === ENTRY_PHASE.LORE;
    const nosPaineisFinais = cenaFinalAberta;

    if (!naLore && !nosPaineisFinais) return undefined;

    const handleLoreKey = (event) => {
      if (event.repeat) return;

      if (event.key === 'Enter') {
        event.preventDefault();

        if (nosPaineisFinais) {
          pularCenaFinal();
          return;
        }

        pularLore();
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();

        if (nosPaineisFinais) {
          avancarCenaFinal();
          return;
        }

        avancarLore();
      }
    };

    window.addEventListener('keydown', handleLoreKey);
    return () => window.removeEventListener('keydown', handleLoreKey);
  }, [entryPhase, loreBioma, loreIndice, cenaFinalAberta, cenaFinalIndice]);

  /** Um timer que sobrevive ao unmount derrubaria a tela depois dela ter saído. */
  useEffect(
    () => () => {
      if (finaleTimerRef.current !== null) window.clearTimeout(finaleTimerRef.current);
    },
    []
  );

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    writeStorage(SETTINGS_STORAGE_KEY, settings);

    window.dispatchEvent(new CustomEvent('cob-settings', { detail: buildSceneSettings(settings) }));
  }, [settings]);

  /**
   * Grava o progresso no jogo em andamento.
   *
   * Antes, isto escrevia um `profile` único com o `bestCave`. Agora cada jogo tem
   * o seu save, e é nele que a run inteira é gravada — moedas, relíquias, coleção
   * e estatísticas, não só a caverna mais longe.
   *
   * A dependência é o `gameState` inteiro, e não o `bestCave`: o save precisa
   * carregar a run em qualquer ponto, e um save só com a caverna mais distante
   * perderia as moedas de quem fechou uma caverna e saiu do menu.
   *
   * Gravar a cada mudança de estado é o que se espera de um save: o custo é uma
   * escrita de poucos kilobytes por ação, e a alternativa — gravar só ao sair —
   * perde tudo numa aba fechada no meio da caverna.
   */
  useEffect(() => {
    if (!settings.persistProgress) return;
    if (!activeSaveId) return;

    gravarEstadoDoJogo(null, activeSaveId, gameState);
  }, [settings.persistProgress, activeSaveId, gameState]);

  /**
   * O `profile` continua sendo escrito, com o `bestCave` do jogo em andamento.
   *
   * Ele não decide mais nada no jogo — o destravamento é por jogo, e o save de cada
   * slot carrega o seu. Fica como registro do quanto a pessoa chegou, e é a fonte
   * da migração para quem vier de uma versão sem slots.
   *
   * **Fora do modo desenvolvedor.** Este é o registro do jogo de verdade, e um save
   * de teste escreveria aqui o mesmo que escreveria no jogo normal: `bestCave: 60`
   * depois de uma passada de testes, e a pessoa perde a noção do quanto chegou
   * jogando de verdade. Ele também não pode ficar parado enquanto o `bestCave` sobe,
   * senão qualquer execução de teste baixa o registro real — e um `Math.max`
   * resolveria o primeiro caso e não o segundo.
   */
  useEffect(() => {
    if (!settings.persistProgress) return;
    if (!contaProgresso(gameState)) return;

    setProfile((current) =>
      Math.max(current.bestCave ?? 1, gameState.bestCave ?? 1) === (current.bestCave ?? 1)
        ? current
        : { ...current, bestCave: Math.max(current.bestCave ?? 1, gameState.bestCave ?? 1) }
    );
  }, [settings.persistProgress, gameState.bestCave, gameState.dev]);

  /**
   * Avisa a cena do Phaser sobre a pausa.
   *
   * O overlay é React e a cena é Phaser, então o congelamento real acontece
   * aqui: `cob-pause` é o único canal entre os dois. O efeito depende de
   * `pauseOpen` e não de `showPause`, para que sair do menu com a pausa aberta
   * (por exemplo, morrendo) não deixe a cena parada para sempre.
   */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cob-pause', { detail: { paused: pauseOpen } }));
  }, [pauseOpen]);

  /** Nunca deixa a pausa aberta sem run para pausar. */
  useEffect(() => {
    if (!showPause || pauseAvailable) return;

    setShowPause(false);
  }, [showPause, pauseAvailable]);

  useEffect(() => {
    writeStorage(PROFILE_STORAGE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    const handleViewportChange = () => {
      const needsGate = needsLandscapeGate();
      setShowRotateLock(needsGate);

      if (!needsGate) {
        tryLockLandscape();
      }
    };

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  /**
   * O Phaser usa um deslocamento fixo de câmera (50/58/74px) para centralizar
   * o mapa, mas o HUD em React quebra em 2 ou 3 linhas dependendo da
   * largura — chegando a 116px de altura. O mapa nascia embaixo do HUD.
   * Medimos o HUD real e devolvemos a altura para o renderer.
   */
  useEffect(() => {
    const node = hudRef.current;

    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const next = Math.round(entry.contentRect.height) + 20;
      setHudHeight((current) => (Math.abs(current - next) > 1 ? next : current));
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleSync = (event) => {
      if (!event.detail?.state) return;
      setGameState(normalizeProgressState(event.detail.state));
    };

    const handleCaveCleared = (event) => {
      const mergedState = normalizeProgressState({
        ...stateRef.current,
        ...(event.detail ?? {})
      });
      // São 4 opções na última caverna do bioma e 3 nas outras. A que for escolhida
      // na virada vira melhoria fixa; as outras somem na morte.
      const caveConcluida = mergedState.outcomeCave ?? mergedState.cave;
      const viradaDeBioma = ehUltimaCaveDoBioma(caveConcluida);

      setGameState(mergedState);
      setSelectedUtility(null);
      setSelectedRewardId(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(false);
      setRewardRefreshCost(10);
      setRewardOptions(
        pickRewardOptions(mergedState, t, viradaDeBioma ? OPCOES_FIXAS : OPCOES_TEMPORARIAS)
      );
      setRewardIsFixed(viradaDeBioma);
    };

    const handlePlayerDead = (event) => {
      if (!event.detail) return;

      setGameState((prev) => normalizeProgressState({ ...prev, ...event.detail }));
      setSelectedUtility(null);
      setSelectedRewardId(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(false);
      setRewardRefreshCost(10);
      setRewardOptions([]);
      // A morte não oferece escolha nenhuma, e o que for escolhido agora é
      // temporário: nada de "fixa" sobrando de uma caverna anterior.
      setRewardIsFixed(false);
    };

    const handleExitDecision = (event) => {
      if (!event.detail?.state) return;

      setGameState(normalizeProgressState(event.detail.state));
      setSelectedUtility(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(true);
    };

    window.addEventListener('cob-sync-ui', handleSync);
    window.addEventListener('cob-cave-cleared', handleCaveCleared);
    window.addEventListener('cob-player-dead', handlePlayerDead);
    window.addEventListener('cob-exit-decision', handleExitDecision);

    if (!gameRef.current && containerRef.current) {
      gameRef.current = createGame(containerRef.current, {
        getPersistentState: () => ({ ...stateRef.current, purchased: [] }),
        syncUI: (payload) => {
          window.dispatchEvent(new CustomEvent('cob-sync-ui', { detail: payload }));
        }
      });
    }

    return () => {
      window.removeEventListener('cob-sync-ui', handleSync);
      window.removeEventListener('cob-cave-cleared', handleCaveCleared);
      window.removeEventListener('cob-player-dead', handlePlayerDead);
      window.removeEventListener('cob-exit-decision', handleExitDecision);

      entryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      entryTimeoutRef.current = [];

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameState.inLobby) {
      setSelectedUtility(null);
      setShowExitDecision(false);
      return;
    }

    if (selectedUtility && (gameState.utilities?.[selectedUtility] ?? 0) <= 0) {
      setSelectedUtility(null);
    }
  }, [gameState.inLobby, gameState.utilities, selectedUtility]);

  useEffect(() => {
    if (entryPhase !== ENTRY_PHASE.PLAYING) return;
    if (!gameRef.current || !containerRef.current) return;

    const forceViewportSync = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      if (width > 0 && height > 0) {
        gameRef.current.scale.resize(width, height);
      }

      window.dispatchEvent(new CustomEvent('cob-force-resize'));
    };

    const timers = [0, 120, 320, 620].map((delay) => window.setTimeout(forceViewportSync, delay));

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [entryPhase]);

  /**
   * Entra na caverna a partir do menu.
   *
   * Sempre pede tela cheia e trava a orientação, em toda entrada — isso não tem
   * nada a ver com o splash. E o pedido precisa acontecer **aqui**, de forma
   * síncrona, dentro do clique: o Fullscreen API só aceita um pedido feito a
   * partir de um gesto do usuário, e pedir depois de um `setTimeout` é recusado.
   * Por isso a sequência de intro vive depois desta linha, e não antes.
   *
   * ## O splash só na primeira vez
   *
   * Antes, toda vez que se saía do menu vinha 900ms de tela preta e 2200ms do
   * logo da ArchangelSoft — mais de três segundos para entrar no jogo, repetidos
   * toda sessão. Agora:
   *
   * - **Primeira vez neste navegador**: preto, logo, jogo. E o sinal é salvo.
   * - **Depois disso**: direto para o jogo, sem preto e sem logo.
   *
   * O preto vai junto porque ele só existia para cobrir a troca antes do logo. Com
   * o logo fora, sobra um segundo e meio de nada — a pior das duas leituras, que é
   * pausar sem mostrar nada.
   *
   * A regra mora em `src/game/intro.js`, que é testada de verdade: o
   * `localStorage` entra como argumento, e o que se afirma é o que acontece.
   */
  /**
   * Entra no jogo, ou mostra a lore do bioma antes.
   *
   * ## Por que a lore mora aqui e não em `finalizeCaveEntry`
   *
   * A ordem importa. A splash da ArchangelSoft vem **antes** da lore: quem entra
   * pelo menu vê o logo e depois o mineiro. Se a lore fosse aberta dentro de
   * `finalizeCaveEntry`, ela apareceria por cima do logo — e, no caminho sem
   * `playIntro`, entraria antes do `cob-enter-cave` ter pintado o primeiro quadro
   * da caverna que fica logo atrás dela.
   *
   * Passar por aqui resolve as duas: `startEntrySequence` termina em
   * `irParaOJogo`, e `finalizeCaveEntry` também.
   *
   * ## Só a primeira caverna do bioma
   *
   * `isBiomeStartCave` é o filtro. Passar por isto a cada caverna repetiria a
   * mesma cena sessenta vezes, e o que resolve o mistério na segunda vista é
   * justamente o que cansa na décima.
   *
   * ## Bioma sem roteiro vai direto
   *
   * Cinco dos seis biomas não têm painel escrito. `deveAbrirLore` é o portão: sem ele,
   * a tela abriria uma sequência vazia com a imagem do mineiro e nenhuma fala, e
   * a pessoa ficaria apertando tecla para sair de um painel que não termina.
   */
  const irParaOJogo = (biomeId = stateRef.current?.biomeId, { pularLore = false } = {}) => {
    // `deveAbrirLore` decide, e não este `if`: a pergunta "isto abre a intro?" é regra
    // de jogo, e a resposta muda com o motivo da entrada — morrer no bioma não é
    // conhecê-lo de novo.
    if (deveAbrirLore(biomeId, stateRef.current?.cave ?? 1, pularLore)) {
      // Antes de mostrar o primeiro painel. As expressões pesam 12 MB e cada painel
      // é um arquivo: sem isto, o segundo painel travaria no meio da frase.
      precarLore(biomeId);

      setLoreBioma(biomeId);
      setLoreIndice(0);
      setEntryPhase(ENTRY_PHASE.LORE);
      return;
    }

    setEntryPhase(ENTRY_PHASE.PLAYING);
  };

  /**
   * Um painel adiante, ou fecha a sequência se era o último.
   *
   * `proximoIndice` é quem decide que acabou: ele devolve `-1` no último painel e
   * um índice fora da faixa. Reescrever essa conta aqui reintroduziu o painel
   * `undefined` que a função existe para impedir.
   */
  const avancarLore = () => {
    const paineis = paineisDoBioma(loreBioma);
    const proximo = proximoIndice(paineis, loreIndice);

    if (proximo === -1) {
      setEntryPhase(ENTRY_PHASE.PLAYING);
      return;
    }

    setLoreIndice(proximo);
  };

  /**
   * Pula o resto da lore e entra na caverna.
   *
   * É o `Enter` do teclado e o `B`/`Quadrado` do controle. A ideia aqui é "não
   * quero mais ver isto", e o índice não importa: a sequência é destruída e o
   * bioma continua de onde estava.
   */
  const pularLore = () => {
    setLoreBioma(null);
    setLoreIndice(0);
    setEntryPhase(ENTRY_PHASE.PLAYING);
  };

  const startEntrySequence = () => {
    if (showRotateLock) return;

    requestGameplayFullscreen();
    tryLockLandscape();

    entryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    entryTimeoutRef.current = [];

    setShowSettings(false);
    setShowInfoModal(false);

    if (introJaVista(null, GAME_VERSION)) {
      irParaOJogo();
      return;
    }

    marcarIntroVista(null, GAME_VERSION);
    setEntryPhase(ENTRY_PHASE.BLACK);

    const logoTimeout = window.setTimeout(() => {
      setEntryPhase(ENTRY_PHASE.LOGO);
    }, BLACK_SCREEN_MS);

    const playTimeout = window.setTimeout(() => {
      irParaOJogo();
    }, BLACK_SCREEN_MS + LOGO_FADE_MS);

    entryTimeoutRef.current.push(logoTimeout, playTimeout);
  };

  const syncLocalState = (nextState) => {
    stateRef.current = nextState;
    setGameState(nextState);
  };

  const buildBiomeStartState = (targetCave, customMessage = null) => {
    const baseState = stateRef.current;
    const biome = getBiomeForCave(targetCave);
    const progress = getBiomeProgress(targetCave);
    const message = customMessage ?? t('msg.enterCave', { cave: progress.label, biome: t(biome.nameKey) });

    return normalizeProgressState({
      ...initialState,
      cave: targetCave,
      biomeId: biome.id,
      biomeName: biome.name,
      coins: baseState.coins ?? 0,
      utilities: {
        ...createUtilityInventory(),
        ...(baseState.utilities ?? {})
      },
      collection: baseState.collection ?? createCollectionState(),
      stats: baseState.stats ?? createStatsState(),
      // Trocar de bioma NÃO zera as melhorias temporárias: o pedido foi que elas se
      // percam na morte, e trocar de bioma não é morrer. O que vai para cá são os
      // níveis que já estão no estado, mais o que as fixas produzem.
      ...aplicarEfeitosDasMelhorias(baseState),
      // Mesmo motivo do reinicio apos a morte: o recalculo devolve os derivados e
      // nao os niveis de reliquia. Trocar de bioma nao pode custar uma melhoria
      // comprada.
      ...comPermanentes(baseState),
      bestCave: baseState.bestCave ?? 1,
      lastRelicFound: baseState.lastRelicFound ?? null,
      lastMessage: message
    });
  };

  const finalizeCaveEntry = (nextState, { playIntro = false, pularLore = false } = {}) => {
    syncLocalState(nextState);
    window.dispatchEvent(
      new CustomEvent('cob-enter-cave', {
        detail: nextState
      })
    );

    if (playIntro) {
      startEntrySequence();
      return;
    }

    irParaOJogo(nextState.biomeId, { pularLore });
  };

  /**
   * Abre a tela de jogos.
   *
   * A lista é relida na hora, e não tirada do estado. O save é mudado fora do
   * React de propósito — a cena do Phaser grava direto no storage quando uma
   * run avança, e essa escrita não passa por nenhum `setState`. Uma lista cacheada
   * mostraria o progresso de como o jogo estava na última vez que a tela abriu.
   */
  const abrirListaDeJogos = () => {
    setSaves(listarJogos(null));
    setShowSaves(true);
    setShowSettings(false);
    setShowInfoModal(false);
    setShowBiomeSelect(false);
    setShowLanguage(false);
  };

  const fecharListaDeJogos = () => {
    setShowSaves(false);
    setSaveNameDraft('');
  };

  /**
   * Troca o jogo em andamento sem abrir a caverna.
   *
   * É o que faz o card highlighting e o botão de renomear não trocarem a run que
   * a pessoa está jogando. Abrir a caverna é `entrarNoJogo`.
   */
  const carregarJogo = (id) => {
    const carregado = lerJogo(null, id);

    if (!carregado) return;

    setActiveSaveId(id);
    marcarUltimoJogado(null, id);
    syncLocalState(montarEstadoCarregado(carregado, t));
  };

  /**
   * Entra no jogo escolhido, direto na caverna em que ele parou.
   *
   * Não passa pela seleção de bioma: o save já sabe em que caverna está, e pedir
   * de novo seria um clique a mais na ação que a pessoa mais repete.
   */
  const entrarNoJogo = (id) => {
    const carregado = lerJogo(null, id);

    if (!carregado) return;
    // Rede de proteção. A tela de jogos já desabilita o botão, mas esta função é
    // chamada de mais de um lugar, e um bloqueio que depende de a tela estar certa
    // não é um bloqueio.
    if (!saveCompativelComOModo(carregado, settings.developerMode)) return;

    setActiveSaveId(id);
    marcarUltimoJogado(null, id);
    syncLocalState(montarEstadoCarregado(carregado, t));

    setShowSaves(false);
    setSaveNameDraft('');
    setShowSettings(false);
    setSaves(listarJogos(null));

    finalizeCaveEntry(stateRef.current, { playIntro: true });
  };

  /**
   * Entra no jogo escolhido, mas pela seleção de bioma.
   *
   * É o caminho que preserva a troca de bioma a partir do menu. O jogo já está
   * carregado em `stateRef`, e `buildBiomeStartState` carrega moedas, coleção e
   * estatísticas dele para o bioma escolhido.
   */
  const trocarBiomaDoJogo = (id) => {
    const carregado = lerJogo(null, id);

    if (!carregado) return;
    if (!saveCompativelComOModo(carregado, settings.developerMode)) return;

    setActiveSaveId(id);
    marcarUltimoJogado(null, id);
    syncLocalState(montarEstadoCarregado(carregado, t));

    setShowSaves(false);
    setSaveNameDraft('');
    setSaves(listarJogos(null));

    openBiomeSelection({ context: 'menu', biomeId: carregado.biomeId });
  };

  /**
   * Cria um jogo novo com o nome digitado e entra nele.
   *
   * Um jogo novo começa na primeira caverna, e o destravamento é por jogo — então
   * a Mina Solar é a única opção. Passar pela seleção de bioma aqui mostraria uma
   * tela com uma escolha só.
   *
   * O `bestCave` do jogo em andamento é copiado para o novo. Recomeçar de
   * propósito não pode custar a progressão: o `bestCave` é o que destrava os
   * biomas, e um slot novo sem ele obrigaria a refazer as dez primeiras cavernas
   * só para chegar no gelo.
   *
   * No modo desenvolvedor o jogo nasce marcado como de teste, com o kit de teste —
   * 5 poções de Caminho Seguro e picareta no máximo. E o `bestCave` **não** é
   * herdado: copiar o progresso de um jogo de verdade para dentro de um save de
   * teste seria deixar o arquivo de rascunho com cara de jogo de verdade, e é
   * justamente o `bestCave` que a tela de jogos mostra para a pessoa decidir o que
   * abrir.
   */
  const criarEEntrar = () => {
    const herdado = stateRef.current;
    const dev = Boolean(settings.developerMode);
    const inicial = dev ? estadoInicialDev(1) : estadoInicial(1);
    const id = criarJogo(null, saveNameDraft, {
      cave: 1,
      estado: dev ? inicial : { ...inicial, bestCave: herdado.bestCave ?? 1 }
    });

    setActiveSaveId(id);
    setSaveNameDraft('');
    setShowSaves(false);
    setSaves(listarJogos(null));

    const criado = lerJogo(null, id);
    if (!criado) return;

    syncLocalState(montarEstadoCarregado(criado, t));
    finalizeCaveEntry(stateRef.current, { playIntro: true });
  };

  const renomearJogoSalvo = (id, nome) => {
    if (!renomearJogo(null, id, nome)) return;

    setSaves(listarJogos(null));
    setSaveEdit(null);
  };

  const apagarJogoSalvo = (id) => {
    if (!apagarJogo(null, id)) return;

    // O jogo apagado era o em andamento: sem save, o `gameState` vira uma run sem
    // dono. Deixar `activeSaveId` apontando para um id apagado faria toda gravação
    // seguinte falhar em silêncio.
    if (activeSaveId === id) setActiveSaveId(null);

    setSaves(listarJogos(null));
    setSaveEdit(null);
  };

  const openBiomeSelection = ({ context = 'menu', biomeId = null, pendingState = null } = {}) => {
    const fallbackCave = pendingState?.cave ?? stateRef.current.cave ?? 1;
    const resolvedBiome = BIOMES.find((biome) => biome.id === biomeId) ?? getBiomeForCave(fallbackCave);

    setSelectedBiomeId(resolvedBiome.id);
    // A cave escolhida pertence à última vez que o modal abriu. Sem este reset, a
    // cave 9 escolhida agora continuaria valendo quando a pessoa voltasse a abrir
    // o modal para outra coisa — e o jogo entraria numa cave que ela não pediu.
    setSelectedCave(null);
    setPendingBiomeState(pendingState);
    setBiomeSelectContext(context);
    setShowBiomeSelect(true);
    setShowSaves(false);
    setSaveNameDraft('');
    setShowSettings(false);
    setShowInfoModal(false);
    setShowUtilityShopModal(false);
  };

  const closeBiomeSelection = (nextContext = null) => {
    setShowBiomeSelect(false);
    setPendingBiomeState(null);

    if (nextContext) setBiomeSelectContext(nextContext);
  };

  const maybeOpenBiomeSelection = (nextState, context = 'transition') => {
    if (!isBiomeStartCave(nextState.cave)) return false;

    openBiomeSelection({
      context,
      biomeId: getBiomeForCave(nextState.cave).id,
      pendingState: nextState
    });

    return true;
  };

  /**
   * Passa um estado pronto para outra cave, sem perder o que a run acumulou.
   *
   * É o caminho do modo desenvolvedor quando se escolhe a cave depois de passar a
   * primeira do bioma. Não pode chamar `buildBiomeStartState`, porque essa função
   * reconstrói tudo a partir de `stateRef.current` — e no momento da transição o
   * estado que importa é o `pendingBiomeState`, que já carrega a melhoria que a
   * pessoa acabou de escolher. Reconstruir aqui trocaria "testar a cave 27" por
   * "perder a melhoria ao testar a cave 27".
   *
   * Só o que muda de verdade é o destino: cave, bioma e a mensagem de entrada. O
   * resto — moedas, melhorias, coleção — vai junto, porque é o mesmo jogo.
   */
  const moverParaCave = (estado, cave) => {
    const biome = getBiomeForCave(cave);

    return normalizeProgressState({
      ...estado,
      cave,
      biomeId: biome.id,
      biomeName: biome.name,
      lastMessage: t('msg.enterCave', {
        cave: getBiomeProgress(cave).label,
        biome: t(biome.nameKey)
      })
    });
  };

  const confirmBiomeSelection = () => {
    const selectedBiome = BIOMES.find((biome) => biome.id === selectedBiomeId) ?? firstBiome;
    // Fora do modo desenvolvedor não existe seletor de cave, e `selectedCave`
    // poderia carregar um valor de quando o modo estava ligado. A guarda é aqui e
    // não só no botão para que a regra valha para qualquer caminho de entrada.
    const alvo = settings.developerMode && selectedCave ? selectedCave : selectedBiome.startCave;

    if (biomeSelectContext === 'menu') {
      const nextState = buildBiomeStartState(
        alvo,
        t('msg.enterCave', {
          cave: getBiomeProgress(alvo).label,
          biome: t(getBiomeForCave(alvo).nameKey)
        })
      );

      closeBiomeSelection();
      finalizeCaveEntry(nextState, { playIntro: true });
      return;
    }

    const nextState = pendingBiomeState
      ? moverParaCave(pendingBiomeState, alvo)
      : buildBiomeStartState(alvo);

    closeBiomeSelection();
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    setRewardIsFixed(false);
    finalizeCaveEntry(nextState);
  };

  const rerollRewards = () => {
    const baseState = stateRef.current;

    if (!baseState.inLobby || baseState.lobbyReason === 'death') return;
    if (rewardOptions.length === 0) return;
    if (baseState.coins < rewardRefreshCost) return;

    const catalog = buildRewardCatalog(baseState, t);

    if (catalog.length === 0) return;

    const currentSignature = rewardOptions
      .map((item) => item.id)
      .sort()
      .join('|');

    let nextOptions = rewardOptions;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      // A mesma contagem que o lobby mostrou. Com o número escrito aqui, um "trocar"
      // na virada de bioma entregaria 3 opções num menu que prometeu 4 — e a pessoa
      // perderia uma escolha que ela já tinha pago para ter.
      const candidate = shuffle(catalog).slice(0, rewardOptions.length);
      const candidateSignature = candidate
        .map((item) => item.id)
        .sort()
        .join('|');

      nextOptions = candidate;

      if (candidateSignature !== currentSignature) {
        break;
      }
    }

    const nextState = normalizeProgressState({
      ...baseState,
      coins: baseState.coins - rewardRefreshCost,
      lastMessage: t('msg.reroll', { n: rewardRefreshCost })
    });

    syncLocalState(nextState);
    setSelectedRewardId(null);
    setRewardOptions(nextOptions);
    setRewardRefreshCost((currentCost) => currentCost * 2);
  };

  const buyUtility = (utility) => {
    const baseState = stateRef.current;

    if (!baseState.inLobby) return;
    if (baseState.coins < utility.cost) return;

    const nextState = normalizeProgressState({
      ...baseState,
      coins: baseState.coins - utility.cost,
      utilities: {
        ...createUtilityInventory(),
        ...baseState.utilities,
        [utility.id]: (baseState.utilities?.[utility.id] ?? 0) + 1
      },
      lastMessage: t('msg.utilityAdded', { name: utility.name })
    });

    syncLocalState(nextState);

    window.dispatchEvent(
      new CustomEvent('cob-buy-utility', {
        detail: {
          state: nextState,
          purchased: []
        }
      })
    );
  };

  /*
     * Compra um nível de melhoria com relíquias.
     *
     * ## A atomicidade vem da função, e não desta
     *
     * `comprarMelhoria` decide e devolve o estado pronto, ou o motivo da recusa. Aqui não
     * há uma sequência de "debita, sobe o nível, aplica o bônus" em que um passo possa
     * rodar sem o outro — e é assim que se gasta uma melhoria e não recebe, ou recebe e
     * não paga. Quem valida é a função, e ela valida antes de escrever qualquer coisa.
     *
     * ## Por que `niveis` se espalha no estado, e não `niveisDe`
     *
     * `niveis` já vem com o nome de campo (`melhoriaHealth`), que é como o estado
     * guarda. A versão anterior devolvia com o nome da melhoria (`health`), e espalhada
     * no estado ela escrevia uma chave que nada lia: o saldo caía e o nível não subia.
     *
     * ## Por que o bônus aparece na hora
     *
     * Porque quem compra vida e vê a vida continuar igual nos leva a clicar de novo. O
     * recálculo roda sobre o estado novo e devolve `maxHp` e `pickaxeLevel` — o derivado
     * vem sempre dos níveis, então não há como o bônus ser aplicado duas vezes.
     */
    const buyUpgrade = (id) => {
      const baseState = stateRef.current;
      const compra = comprarMelhoria(baseState, id);

      if (!compra.ok) return;

      const comNiveis = { ...baseState, ...compra.niveis };
      const efeitos = aplicarEfeitosDasMelhorias(comNiveis);
      const nextState = normalizeProgressState({
        ...comNiveis,
        relics: compra.relics,
        maxHp: efeitos.maxHp,
        hp: efeitos.hp,
        pickaxeLevel: efeitos.pickaxeLevel,
        pickaxePower: efeitos.pickaxePower,
        lastMessage: t('shop.relicBalance', { n: compra.relics })
      });

      syncLocalState(nextState);
    };

    const sellUtility = (utility) => {
    const baseState = stateRef.current;
    const owned = baseState.utilities?.[utility.id] ?? 0;
    const resaleValue = Math.max(1, Math.floor(utility.cost / 2));

    if (!baseState.inLobby) return;
    if (owned <= 0) return;

    const nextState = normalizeProgressState({
      ...baseState,
      coins: baseState.coins + resaleValue,
      utilities: {
        ...createUtilityInventory(),
        ...baseState.utilities,
        [utility.id]: Math.max(0, owned - 1)
      },
      lastMessage: t('msg.utilitySold', { name: utility.name, n: resaleValue })
    });

    syncLocalState(nextState);
  };

  const useUtility = (utilityId) => {
    if (gameState.inLobby) return;
    if ((gameState.utilities?.[utilityId] ?? 0) <= 0) return;

    window.dispatchEvent(
      new CustomEvent('cob-use-utility', {
        detail: { type: utilityId }
      })
    );

    setSelectedUtility(null);
  };

  const continueExploringCurrentCave = () => {
    setShowExitDecision(false);
  };

  const chooseNextCaveFromExit = () => {
    const baseState = stateRef.current;

    setShowExitDecision(false);

    window.dispatchEvent(
      new CustomEvent('cob-open-exit-lobby', {
        detail: {
          nextCave: baseState.nextCaveAvailable ?? baseState.cave + 1,
          message: t('msg.chooseNextCave')
        }
      })
    );
  };

  /**
   * some o relógio do final e leva a pessoa para a tela de título.
   *
   * Não é `backToMainMenu`. Aquela reseta a run — que é o certo para o botão "Ir
   * para o menu" da pausa, onde a pessoa está abandonando a caverna. Aqui seria o
   * contrário: quem chegou ao final acabou de terminar o jogo, e voltar ao menu
   * zerando moedas, relíquias e `bestCave` apagaria justamente o que a carta de
   * despedida acabou de comemorar. E o save é reescrito a cada mudança de estado,
   * então o reset não ficaria só na tela: iria para o disco.
   *
   * O que o menu precisa é de `entryPhase` em MENU, que liga o modo attract da
   * cena e troca a tela de título pela caverna. O estado da run não é lido por
   * nenhum dos dois, então pode ficar como está.
   */
  const fecharFinale = () => {
    if (finaleTimerRef.current !== null) {
      window.clearTimeout(finaleTimerRef.current);
      finaleTimerRef.current = null;
    }

    setShowFinale(false);
    setShowExitDecision(false);
    setShowPause(false);

    setSelectedUtility(null);
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    setEntryPhase(ENTRY_PHASE.MENU);

    window.dispatchEvent(
      new CustomEvent('cob-restart-run', {
        // O estado como está, e não um estado zerado: a cena recarrega o mapa com
        // isto, e recarregar com o estado zerado apagaria a run que a pessoa
        // terminou de completar.
        detail: { ...stateRef.current, inLobby: false, lobbyReason: null, purchased: [] }
      })
    );
  };

  /**
   * Abre a carta do final.
   *
   * O relógio é posto aqui, e não só no fim da animação, porque `onAnimationEnd`
   * não é o único caminho: quem tem `prefers-reduced-motion` ligado não tem
   * animação nenhuma, e sem este relógio a carta viraria uma parede de texto sem
   * botão de fechar. O `Esc` e o botão continuam lá nos dois casos — são eles que
   * garantem que ninguém fique preso.
   *
   * O relógio só roda sozinho quando a animação existe; com movimento reduzido, o
   * `onAnimationEnd` de quem existe chama o fechamento.
   */
  /**
   * Abre a carta do fim e arma o relógio que a fecha sozinha.
   *
   * Quem fecha a carta é o `onAnimationEnd`, e o relógio é a rede abaixo dele: se a
   * animação não rodar — aba em segundo plano no navegador que pausa animação, ou
   * alguém que desligou animação no sistema — a carta ainda volta sozinha. O botão
   * de pular e o `Esc` são a terceira rede, e existem há mais tempo que estas duas.
   *
   * ## Por que isto é uma função, e não duas linhas soltas
   *
   * O relógio morreu uma vez. A carta abriu por `sairDaVistaFinal` depois que a
   * cave 60 passou pela cena final, e `abrirFinale` deixou de ser chamado no caminho
   * que importa — o próprio `temCenaFinal` dentro dele desviava para os painéis. O
   * código do relógio continuou ali, verde, fora de qualquer execução, e nenhuma
   * falha apareceu: a carta continuava fechando pelo `onAnimationEnd`. Fechava no
   * caminho feliz e só quebrava no caminho que ninguém testava.
   */
  const abrirCartaFinal = () => {
    const prefereMenosMovimento =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setShowFinale(true);

    if (finaleTimerRef.current !== null) window.clearTimeout(finaleTimerRef.current);

    finaleTimerRef.current = prefereMenosMovimento
      ? null
      : window.setTimeout(fecharFinale, duracaoFinale + 1200);
  };

  const abrirFinale = () => {
    setShowExitDecision(false);
    setShowPause(false);

    // A cena final vem ANTES da carta, e só na cave 60. Sem este desvio, o botão
    // de saída da última caverna pulava da caverna direto para o fim do jogo, e o
    // jogador nunca via o mineiro na boca da caverna.
    //
    // Ela começa no painel 0, e o índice vive fora do React porque o laço de
    // controle lê por ref — um `useState` aqui rebindaria o listener do `window`
    // a cada painel, que é o custo que o laço foi escrito para evitar.
    if (temCenaFinal(gameState.cave)) {
      cenaFinalRef.current.indice = 0;
      setCenaFinalIndice(0);
      setCenaFinalBioma(gameState.biomeId);
      setCenaFinalAberta(true);
      return;
    }

    abrirCartaFinal();
  };

  /** A animação acabou de subir. O `+1200` do relógio cobre esse mesmo atraso. */
  const concluirFinale = (evento) => {
    if (evento?.animationName !== 'finale-subir') return;

    fecharFinale();
  };

  /**
   * Um painel adiante, ou os créditos se era o último.
   *
   * `proximoIndiceFinal` decide que acabou, pelo mesmo motivo de `avancarLore`:
   * reescrever a conta na tela reintroduz o painel `undefined` do último índice.
   */
  const avancarCenaFinal = () => {
    const paineis = paineisDaCenaFinal(cenaFinalBioma);
    const proximo = proximoIndiceFinal(paineis, cenaFinalIndice);

    if (proximo === -1) {
      sairDaCenaFinal();
      return;
    }

    cenaFinalRef.current.indice = proximo;
    setCenaFinalIndice(proximo);
  };

  /**
   * Pula os painéis e vai direto para os créditos.
   *
   * O `Enter` do teclado e o `B`/`Quadrado` do controle entram aqui.
   */
  const pularCenaFinal = () => {
    sairDaCenaFinal();
  };

  /**
   * A cena final acabou, e a carta do fim abre.
   *
   * Por `abrirCartaFinal`, e não por um `setShowFinale(true)` solto: é aqui que a
   * carta abre na prática, e o relógio que a fecha sozinha mora junto da abertura.
   * A versão anterior abria a carta direto e não armava relógio nenhum — e o
   * relógio que existia em `abrirFinale` já não rodava em lugar nenhum.
   *
   * O `setCenaFinalAberta(false)` no mesmo caminho não é dispensável: sem ele os
   * painéis ficariam por baixo da carta e reapareceriam quando ela fechasse.
   */
  const sairDaCenaFinal = () => {
    setCenaFinalAberta(false);
    abrirCartaFinal();
  };

  const [controleConectado, setControleConectado] = useState(false);
  const [controleNome, setControleNome] = useState(null);

  /**
   * Controle: lê a cada quadro e entrega para quem está em foco.
   *
   * ## Uma leitura só, num lugar só
   *
   * `getGamepads()` é consultado aqui e em mais lugar nenhum. Duas leituras por
   * quadro dariam duas bordas de clique para a mesma mão, e a segunda leria como
   * "ainda pressionado" — metade dos cliques sumiria, e não de forma constante, o
   * que é o pior tipo de bug.
   *
   * ## Para onde vai cada comando
   *
   * Com uma tela aberta, o comando vai para a navegação de menu. Sem nenhuma, ele
   * vai para a cena do Phaser, que move o cursor de tile. A divisão é o que
   * impede que o direcional mova o cursor da caverna por baixo de um modal — o
   * bug clássico de controle em jogo com HTML sobre o canvas: a pessoa mexe o
   * direcional, o cursor anda escondido, e parece quebrado.
   *
   * ## O laço lê por ref e o efeito não depende de nada
   *
   * `telasAbertas` e `fecharTelaPeloNome` são recriados a cada render, e tê-los na
   * lista de dependências recriaria o leitor também — o que zera o estado de
   * borda e faz metade dos cliques sumir.
   *
   * ## Por que `requestAnimationFrame` e não `setInterval`
   *
   * A leitura tem de acontecer no mesmo relógio que a pintura. Um `setInterval`
   * roda em 60 Hz mesmo com a aba escondida, gastando bateria para não pintar
   * nada, e pode ler duas vezes entre duas pinturas — devolvendo bordas que
   * ninguém vai ver.
   */
  const controleRef = useRef({
    telas: null,
    fechar: null,
    podePausar: false,
    lore: null,
    cenaFinal: null
  });

  /**
   * A lore entra no laço por ref, e não como tela.
   *
   * `telasAbertas` é a lista de telas do jogo — menu, pausa, lista de jogos. A lore
   * não entra nela porque **não é uma tela**: ela não abre sobre uma tela, é a
   * própria entrada na caverna, e o `Esc` não deve fechá-la. Se fosse uma tela, o
   * `Esc` fecharia a lore no meio da primeira frase, e o `fecharTelaPeloNome`
   * precisaria de um caso para isso.
   *
   * Passar as duas funções pela ref mantém o laço sem `telas` mudar, que é a razão
   * de o laço ler por ref e não por dependência.
   */
  controleRef.current = {
    telas: telasAbertas,
    fechar: fecharTelaPeloNome,
    podePausar: pauseAvailable,
    // O menu principal é navegável, e a condição é a mesma do `showMenu` declarado
    // mais abaixo. Ela está reescrita aqui de propósito: o `showMenu` ainda não
    // existe neste ponto do render, e usá-lo aqui pegaria a variável na zona morta
    // temporal — que derruba o jogo inteiro na montagem.
    menuVisivel: entryPhase === ENTRY_PHASE.MENU && !showRotateLock,
    //
    // O lobby é uma superfície navegável, e não uma tela da pilha: ele é um estado
    // da partida, não uma janela aberta sobre outra. A expressão é escrita aqui em vez
    // de usar o `showLobby` porque este bloco vem antes de onde ele é declarado.
    lobbyVisivel: entryPhase === ENTRY_PHASE.PLAYING && gameState.inLobby,
    // O laço do controle é criado uma vez e nunca recriado, então a sensibilidade
    // vem pela ref: ler `settings` direto nele congelaria no valor da montagem, e
    // mudar a sensibilidade nas configurações só valeria na próxima sessão.
    sensibilidadePonteiro: settings.ponteiroSensibilidade ?? SENSIBILIDADE_PADRAO,
    velocidadePonteiro: settings.ponteiroVelocidade ?? VELOCIDADE_PADRAO,
    lore: entryPhase === ENTRY_PHASE.LORE ? { avancar: avancarLore, pular: pularLore } : null,
    cenaFinal: cenaFinalAberta
      ? {
          indice: cenaFinalRef.current.indice,
          paineis: paineisDaCenaFinal(cenaFinalBioma),
          avancar: avancarCenaFinal,
          pular: pularCenaFinal
        }
      : null
  };

  useEffect(() => {
    const leitor = criarLeitorDeControle();
    /**
     * A navegação da superfície aberta.
     *
     * Não é `const` porque ela é **recriada por superfície**: cada tela aberta tem a
     * sua própria navegação, com a própria raiz e o próprio estado de repetição. Uma
     * navegação única para o `body` inteiro é o que deixava o foco andar por trás dos
     * modais.
     */
    let nav = criarNavegadorDeFoco({
      raiz: document.body,
      elementoAtivo: () => document.activeElement
    });

    let animacao = null;
    let conectadoAntes = null;

    /**
     * O ponteiro dos menus: onde está, se já apareceu, e quando andou pela última
     * vez.
     *
     * Vive no closure do laço e não no React pelos mesmos motivos do índice do
     * cursor da cena final: é lido e escrito a cada quadro, e um estado do React
     * custaria um redesenho por quadro.
     */
    const ponteiro = { x: 0, y: 0, visivel: false };

    /** A tela que o ponteiro viu por último, para saber quando semear de novo. */
    let telaDoPonteiroAnterior = null;

    /**
     * Um quadro do ponteiro: move, prende na borda e mostra.
     *
     * Devolve `true` quando o ponteiro andou, que é o que faz o `A` ativar o que
     * está embaixo dele em vez de um item do d-pad.
     */
    const moverPonteiro = (estado, dt, opcoes) => {
      const deslocamento = deslocamentoDoPonteiro(estado.eixo, dt, opcoes);
      const andou = Math.hypot(deslocamento.x, deslocamento.y) > 0;

      if (!andou) return false;

      const area = shellRef.current?.getBoundingClientRect();
      const limites = area
        ? { largura: area.width, altura: area.height }
        : { largura: 0, altura: 0 };

      // `getBoundingClientRect` é do viewport e o ponteiro é `fixed`, então as
      // coordenadas batem. A margem é o quanto da seta fica dentro da área: a
      // ponta aponta para o alto e à esquerda, e sem isto ela encostaria na borda
      // com o corpo para fora.
      const proxima = limitarPonteiro(
        { x: ponteiro.x - (area?.left ?? 0), y: ponteiro.y - (area?.top ?? 0) },
        deslocamento,
        limites,
        MARGEM_DO_PONTEIRO_PX
      );

      ponteiro.x = proxima.x + (area?.left ?? 0);
      ponteiro.y = proxima.y + (area?.top ?? 0);
      ponteiro.visivel = true;

      const no = ponteiroRef.current;

      if (no) {
        no.style.transform = `translate3d(${Math.round(ponteiro.x)}px, ${Math.round(ponteiro.y)}px, 0)`;

        if (no.dataset.visivel !== '1') no.dataset.visivel = '1';
      }

      return true;
    };

    /**
     * Coloca o ponteiro em cima do alvo que está com o foco.
     *
     * Sem isto, abrir um modal mostra a seta no canto oposto ao item que a pessoa
     * já escolheu — e o primeiro toque de analógico a leva embora, num pulo que
     * atravessa a tela.
     */
    const ponteiroSobre = (elemento) => {
      if (!elemento || typeof elemento.getBoundingClientRect !== 'function') return;

      const caixa = elemento.getBoundingClientRect();

      if (caixa.width <= 0 || caixa.height <= 0) return;

      ponteiro.x = caixa.left + caixa.width / 2;
      ponteiro.y = caixa.top + caixa.height / 2;

      const no = ponteiroRef.current;

      if (no) no.style.transform = `translate3d(${Math.round(ponteiro.x)}px, ${Math.round(ponteiro.y)}px, 0)`;
    };

    /**
     * O que está embaixo do ponteiro, se for algo que dá para ativar.
     *
     * Devolve `null` quando não há nada — e o foco **fica** onde está, que é o que
     * um mouse faz ao passar pelo fundo: ele não joga o foco no chão.
     */
    const alvoSobOPonteiro = () => {
      if (!ponteiro.visivel || typeof document.elementFromPoint !== 'function') return null;

      return alvoSobElemento(nav.alvos(), document.elementFromPoint(ponteiro.x, ponteiro.y));
    };

    /**
     * O d-pad mexendo na barra que está em foco.
     *
     * ## Por que isto existe
     *
     * A barra de sensibilidade e de velocidade é um `input[type=range]`, e um
     * `range` só muda por arraste ou por tecla. Sem arraste com controle, a barra
     * seria um campo morto na tela — e era exatamente esse o motivo que havia
     * Levado os dois botões no lugar dela.
     *
     * ## Por que só esquerda e direita
     *
     * Porque as duas barras são de uma dimensão só. Uma barra vertical mudaria com
     * cima e baixo, mas nenhuma existe aqui, e aceitar as duas direções num menu
     * horizontal andaria o foco sem mudar nada visível.
     *
     * ## Por que devolve `true` mesmo no fim da lista
     *
     * Porque devolver `false` no fim entrega o d-pad de volta ao menu: quem segura
     * o botão para ver o máximo viajava pelo resto das configurações, com a barra
     * parada e o foco andando. O `true` quer dizer "a barra comeu esta direção", e
     * é isso que segura o foco nela.
     *
     * ## Por que a repetição é a do menu
     *
     * `passoDeRepeticao` é o mesmo que a navegação usa, com a mesma espera e o mesmo
     * intervalo. Sem ele, cada quadro do laço era um passo, e segurar o botão levava
     * a barra de 25% a 300% em um quarto de segundo — o que faz a barra parecer um
     * botão de pular, e não um controle.
     */
    const repeticoesDaBarra = { esquerda: null, direita: null };

    const ajustarBarraEmFoco = (direcao, agoraMs = Date.now()) => {
      const focado =
        direcao === 'esquerda' || direcao === 'direita' ? document.activeElement : null;
      const ehBarra = focado?.tagName === 'INPUT' && focado.type === 'range';

      if (!ehBarra) {
        for (const lado of Object.keys(repeticoesDaBarra)) repeticoesDaBarra[lado] = null;

        return false;
      }

      const passo = passoDeRepeticao(repeticoesDaBarra[direcao], agoraMs);

      repeticoesDaBarra[direcao] = passo;

      if (!passo.repetir) return true;

      const minimo = Number(focado.min);
      const maximo = Number(focado.max);
      const tamanho = Math.abs(Number(focado.step)) || 1;

      const atual = Number(focado.value);
      const proximo =
        direcao === 'direita'
          ? Math.min(atual + tamanho, maximo)
          : Math.max(atual - tamanho, minimo);

      // No fim da lista o passo não acontece, e `true` mesmo assim: quem segura o
      // botão aqui quer ficar na barra, e não passear pelo resto das configurações.
      if (proximo === atual) return true;

      // Escrever `focado.value` direto não chega ao `onChange` do React: o React
      // guarda o último valor que ele mesmo escreveu, e ver o mesmo valor de novo
      // parece que "não mudou" — a lâmina anda e o estado não. Chamar o `setter`
      // nativo de `value` contorna essa comparação, e o evento `input` é o que o
      // React escuta.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (typeof setter === 'function') setter.call(focado, String(proximo));
      else focado.value = String(proximo);

      focado.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    };

    let ultimoQuadro = 0;

    const quadro = () => {
      const agora = Date.now();

      // O `dt` é limitado a um quarto de segundo: depois de uma aba em segundo
      // plano, o primeiro quadro pode valer segundos, e o ponteiro atravessaria a
      // tela inteira de uma vez.
      const dt = ultimoQuadro === 0 ? 0 : Math.min((agora - ultimoQuadro) / 1000, 0.25);

      ultimoQuadro = agora;

      const estado = leitor.ler();
      const atual = controleRef.current;
      const nomeDaTela = telaDoTopo(atual.telas);
      const shell = shellRef.current;

      if (estado.conectado !== conectadoAntes) {
        conectadoAntes = estado.conectado;
        setControleConectado(estado.conectado);
        setControleNome(estado.conectado ? leitor.nomeDoControle() : null);
      }

      // O ponteiro nasce em cima do item em foco, e não no canto. Abrir um modal
      // mostrava a seta do lado oposto ao botão que a pessoa já tinha escolhido, e
      // o primeiro toque de analógico a levava embora num pulo que atravessa a
      // tela inteira.
      //
      // A semeadura é dos menus. Na caverna quem nasce em cima do alvo é o cursor
      // de tile, e semear a seta por cima dele a deixaria fora da pedra que está
      // mirada.
      //
      // A chave é a **superfície** que a pessoa está vendo, e não só o nome da tela.
      // No menu principal o nome é `null` — o menu não é uma tela da pilha, é a fase
      // de entrada — e comparar `null` com o `null` inicial dava sempre falso: a
      // semeadura nunca rodava na porta de entrada do jogo, e o primeiro direcional
      // levava o foco para o segundo item em vez do primeiro.
      //
      // Menu e tela são o mesmo par para efeitos de semeadura, e é por isso que a
      // chave é uma string: `'menu'` e `'pausa'` são superfícies diferentes, e
      // trocar entre elas tem que semear.
      //
      // A raiz da navegação é a superfície aberta, e a superfície é o elemento que
      // carrega `data-tela` com o nome que a pilha já usa.
      //
      // Ela é consultada por nome, e não por classe: uma lista de classes seria um
      // segundo lugar para errar o nome, e a classe já pode mudar por estilo sem que
      // ninguém perceba. O atributo é uma afirmação, e não uma convenção.
      const raizTela = nomeDaTela ? document.querySelector(`[data-tela="${nomeDaTela}"]`) : null;
      const raizMenu = !raizTela && atual.menuVisivel ? document.querySelector('[data-tela="menu"]') : null;
      const raizLobby = !raizTela && !raizMenu && atual.lobbyVisivel ? document.querySelector('[data-tela="lobby"]') : null;
      const raizNavegacao = raizTela ?? raizMenu ?? raizLobby;
      const superficie = raizNavegacao ? raizNavegacao.getAttribute('data-tela') : null;

      if (superficie !== telaDoPonteiroAnterior) {
        telaDoPonteiroAnterior = superficie;

        if (raizNavegacao) {
          //
          // Navegar **dentro** da superfície aberta. Sem isto, a lista de alvos é a do
          // `body` inteiro, e os botões do menu continuavam focáveis por trás do modal:
          // estão no DOM e não estão escondidos no CSS, então passavam no filtro de
          // "está na tela agora". O direcional levava o foco para um botão invisível,
          // o anel aparecia em cima dele e o `A` clicava nele.
          //
          // Uma navegação nova por superfície, e não a mesma de antes com outra raiz:
          // o estado de repetição do modal não pode vazar para a tela de baixo.
          nav = criarNavegadorDeFoco({
            raiz: raizNavegacao,
            elementoAtivo: () => document.activeElement
          });

          /**
           * O foco nasce em um item **escolhido**, e não em um item que o ponteiro
           * passou por cima.
           *
           * Sem nenhum alvo em foco, `ordenarPorDirecao` devolve a lista inteira na
           * ordem do DOM e o primeiro direcional leva o foco para o primeiro item —
           * que no menu principal é a última linha, e não a primeira. E, como o
           * ponteiro também nasce semeado em `document.activeElement`, que no começo
           * de uma tela é o `body`, a seta ficava no meio da tela e o `A` do quadro
           * seguinte fechava o alvo que estivesse embaixo dela.
           */
          nav.focarPrimeiro();

          ponteiroSobre(document.activeElement);
        }
      }

      // O ponteiro anda em **todo** o jogo, e não em parte dele. Antes ele andava nos

      // O ponteiro anda em **todo** o jogo, e não em parte dele. Antes ele andava nos
      // menus e na caverna; agora anda na lore, na cena final e nos botões que
      // ficam por cima do canvas durante a partida — que são botões de verdade, e
      // que o `A` precisa acionar como o mouse aciona.
      const ponteiroAndou =
        estado.conectado &&
        moverPonteiro(estado, dt, {
          sensibilidade: atual.sensibilidadePonteiro,
          velocidade: atual.velocidadePonteiro
        });

      /**
       * O que está embaixo da seta agora, e que dá para ativar.
       *
       * É o que decide o `A` no jogo inteiro, e não só nos menus. A pergunta que
       * responde é a mesma que o mouse responde ao clicar: o que está embaixo do
       * ponteiro? Havendo algo, o `A` aciona aquilo — inclusive um botão do HUD em
       * cima do canvas, onde antes o `A` só quebrava pedra.
       *
       * Quando não há nada, o foco **fica** onde está: é o que um mouse faz ao
       * passar pelo fundo, e sem isto a seta jogaria o foco no chão e o `A`
       * perderia o alvo que a pessoa já tinha escolhido com o d-pad.
       */
      const sob = ponteiro.visivel ? alvoSobOPonteiro() : null;
      const domTemOComando = Boolean(sob?.elemento);

      /**
       * Quem decide o foco neste quadro.
       *
       * Só um pode. São dois donos do mesmo alvo — o ponteiro, que leva o foco junto
       * para que a seta tenha ação em todos os botões, e o direcional, que anda item
       * a item — e quando os dois decidem no mesmo quadro eles se anulam: o ponteiro
       * põe o foco no alvo, o direcional move, e o quadro seguinte o ponteiro devolve.
       *
       * O sintoma era o direcional **pulando um item em cada três** no menu principal,
       * com a navegação parecendo funcionar e indo sempre para o alvo errado.
       *
       * Quem está sendo usado decide. Com o direcional solto, o ponteiro manda — que
       * é o que se quer, porque aí a pessoa está apontando e o `A` aciona o que está
       * embaixo da seta.
       */
      const direcionalNoQuadro = Boolean(estado.direcoes.dominante);

      if (domTemOComando && !direcionalNoQuadro && sob.elemento !== document.activeElement) {
        sob.elemento.focus();
      }

      if (ponteiroRef.current) {
        ponteiroRef.current.style.visibility = estado.conectado ? 'visible' : 'hidden';
      }

      let foiParaOMenu = false;

      // A lore vem **antes** de `nomeDaTela`, e não depois. Durante a sequência
      // não há tela nenhuma aberta, e sem esta guarda o `B` cairia no ramo de
      // pausa ou passaria direto para a cena do Phaser — que moveria o cursor e
      // quebraria uma pedra por baixo da tarja, sem a pessoa ver nada.
      if (atual.cenaFinal) {
        // A cena final vem **antes** da lore: ela é a última sequência do jogo e
        // não pode ficar atrás de uma entrada de bioma. `B`/`Square` pulam os
        // painéis direto para os créditos.
        //
        // Havia um ramo para a tela muda aqui, lendo `cenaFinal.fase`. Quando a tela
        // saiu, o `fase` saiu com ela — e a comparação passou a ser sempre falsa, sem
        // erro nenhum: o ramo virava código morto que parecia caminho principal.
        if (estado.bordas.voltar || estado.bordas.pular) {
          foiParaOMenu = true;
          atual.cenaFinal.pular();
        } else if (estado.bordas.confirmar) {
          foiParaOMenu = true;
          atual.cenaFinal.avancar();
        }
      } else if (atual.lore) {
        // `B`/`Circle` e `Square` pulam a lore inteira. São **dois** botões
        // diferentes: `B` é o índice 1 do Xbox, `Square` é o índice 2 do
        // PlayStation, e o desenho pediu os dois. Aceitar os dois índices é o que
        // faz "B" funcionar no Xbox e "Quadrado" funcionar no PlayStation, e
        // também o que faz quem trocou de controle não ficar preso.
        if (estado.bordas.voltar || estado.bordas.pular) {
          foiParaOMenu = true;
          atual.lore.pular();
        } else if (estado.bordas.confirmar) {
          foiParaOMenu = true;
          atual.lore.avancar();
        }
      } else if (raizNavegacao) {
        //
        // A superfície aberta, e não "o menu ou alguma tela". O lobby é uma
        // superfície navegável sem ser tela da pilha, e com a guarda antiga ele não
        // entrava em ramo nenhum: o direcional ficava morto lá dentro.
        // O menu principal é uma tela como as outras, e entrou aqui pelo mesmo
        // caminho: sem ele, o laço do controle não tinha onde navegar e a porta de
        // entrada do jogo era só teclado.
        foiParaOMenu = true;

        // O ponteiro tem precedência sobre o d-pad, e não o contrário.
        //
        // A ordem é o que evita a briga: sem esta guarda, um empurrão de analógico
        // andaria a seta E o foco do menu, e cada um puxaria para o seu lado. Com
        // ela, o analógico é o ponteiro e o d-pad é o passo a passo — que é
        // também o que o desenho das teclas sugere.
        //
        // O movimento em si acontece mais acima, para todas as telas compartilharem
        // o mesmo quadro de ponteiro; aqui só se usa o booleano. O foco já seguiu a
        // seta antes dos ramos, porque é uma regra do jogo inteiro e não do menu.
        const analogoMoveu = ponteiroAndou;

        if (nomeDaTela === 'pausa' && estado.bordas.pausa) {
          atual.fechar('pausa');
        } else if (estado.bordas.voltar && nomeDaTela && !analogoMoveu) {
          atual.fechar(nomeDaTela);
        } else if (estado.bordas.confirmar) {
          // `A` é uma ação do jogo, e não uma continuação do ponteiro.
          //
          // Este ramo era o último `senão` da cadeia, depois do que exige que o
          // analógico **não** tenha andado — e os dois só podem ser verdadeiros
          // juntos, porque o `else if` é justamente a negação do primeiro. O `A`
          // então só era alcançado no quadro em que o analógico se movia.
          //
          // Na medição, `A` não abria nada em nenhuma tela de menu: só funcionava
          // quando a pessoa cutucava o analógico no mesmo quadro do aperto.
          //
          // Fica **depois** do `B` de propósito: quem aperta os dois juntos fecha a
          // tela, que é o que o `Esc` faz, em vez de ativar o item em foco.
          nav.ativar();
        } else if (!analogoMoveu) {
          // Com a barra em foco, o d-pad para os lados mexe nela e não no foco.
          // Sem esta guarda, configurar a sensibilidade andaria a seleção do menu a
          // cada passo, e a barra mudaria de posição debaixo do dedo.
          //
          // `ajustarBarraEmFoco` recebe a direção mesmo quando ela é nula, e é
          // assim que a repetição da barra zera ao soltar o botão. Sem isso, soltar
          // e apertar de novo logo em seguida perderia o primeiro passo.
          const mexeuNaBarra = ajustarBarraEmFoco(estado.direcoes.dominante, agora);

          //
          // A chamada é **sempre**, inclusive sem direção, e isso não é descuido:
          // `moverComRepeticao` tem um ramo que zera a repetição quando recebe
          // `null`, e esse ramo era código morto — a chamada estava dentro de um
          // `if (direcao)`, então nunca chegava `null`.
          //
          // O efeito era o mais difícil de ver deste tipo: `desde` e `repetiuEm`
          // sobreviviam de um aperto para o outro. O primeiro aperto partia de `null` e
          // esperava 380 ms antes de repetir, então funcionava. Depois do primeiro aperto
          // longo, todo aperto seguinte já encontrava a espera cumprida e repetia no
          // primeiro quadro — e daí em diante a cada 110 ms. Na medição, um aperto de
          // 200 ms levava o foco **dois** itens, pulando o do meio: navegação que
          // parece funcionar e vai sempre para o alvo errado.
          //
          // A barra em foco tem a mesma regra, e é por isso que o comentário de
          // `ajustarBarraEmFoco` existe: soltar zera a repetição, senão o aperto
          // seguinte perde o primeiro passo.
          if (!mexeuNaBarra) nav.moverComRepeticao(estado.direcoes.dominante);
        }
      } else if (estado.bordas.pausa || (estado.bordas.voltar && atual.podePausar)) {
        // Sem tela aberta, `voltar` também abre a pausa: é o que o `Esc` faz, e
        // os dois precisam concordar.
        //
        // Este ramo vem **antes** do do botão embaixo da seta, e a ordem é o que
        // importa. `pausa` é o `Start`/`Options`, que é uma ação do jogo inteiro e
        // não do alvo que a seta está sobre: deixar o botão na frente faria o
        // `Start` parar de funcionar em toda vez que a seta restsse em cima de um
        // botão do HUD — que é o que a seta faz quando a pessoa a leva para o
        // canto e solta.
        foiParaOMenu = true;
        setShowPause(true);
      } else if (domTemOComando) {
        // Um botão do jogo está embaixo da seta, e o `A` é dele.
        //
        // Isto é o que faltava para a seta ter ação em todas as telas: na caverna
        // o `A` ia direto para o Phaser, e a seta passava por cima de todos os
        // botões do HUD sem acionar nenhum deles. Agora o `A` responde à mesma
        // pergunta que o mouse responde ao clicar.
        if (estado.bordas.confirmar) {
          foiParaOMenu = true;
          nav.ativar();
        }
      }

      // O anel de foco. `:focus-visible` sozinho não serviria, porque o navegador
      // só o mostra em foco programático quando a última interação foi de
      // teclado — e aqui ela foi de controle, que ele não conhece.
      //
      // Ele **fica** enquanto houver controle conectado, e não só no quadro em que
      // o controle mandou alguma coisa. A versão anterior removia o atributo em
      // todo quadro sem entrada, e o anel piscava: aparecia no empurrão e sumia ao
      // soltar, num ritmo de 60 vezes por segundo. Quem joga com analógico segura
      // a direção para repetir, e o anel desaparecia justo quando ele estava
      // funcionando.
      if (shell) {
        if (!estado.conectado) shell.removeAttribute('data-controle');
        else if (foiParaOMenu) shell.setAttribute('data-controle', '1');
      }

      // A lore e a cena final viajam como `telaAberta` mesmo não sendo telas. A cena
      // usa esse campo para decidir se pode mexer no mapa — `telaAberta !== null`
      // quer dizer "tem algo na frente", e devolve o cursor para casa. Sem esta
      // linha, o direcional andaria o losango por baixo da tarja.
      //
      // E o `confirmar` vem desligado quando um botão do jogo está embaixo da seta:
      // o `A` foi para o botão, como o clique vai para o botão, e a caverna não pode
      // quebrar uma pedra ao mesmo tempo. Sem esta linha, mirar num botão do HUD e
      // apertar `A` aciona o botão **e** quebra a pedra da frente.
      const paraCena = domTemOComando
        ? { ...estado, bordas: { ...estado.bordas, confirmar: false } }
        : estado;

      window.dispatchEvent(
        new CustomEvent('cob-controle', {
          detail: {
            estado: paraCena,
            telaAberta: nomeDaTela ?? (atual.cenaFinal ? 'cenaFinal' : atual.lore ? 'lore' : null),
            /**
             * A posição da seta, para a caverna mirar.
             *
             * Vai em coordenada de viewport, que é o que o DOM dá. A cena subtrai
             * a posição do canvas e passa por `getWorldPoint` antes de inverter a
             * projeção isométrica — porque a câmera rola e tem zoom, e um pixel de
             * tela não é um pixel do mundo.
             *
             * `andou` vem separado da posição porque uma posição parada ainda
             * significa algo: a cena precisa saber se a pessoa está mirando naquele
             * tile, e não se o ponteiro passou por ele no quadro anterior.
             */
            ponteiro: { x: ponteiro.x, y: ponteiro.y, andou: ponteiroAndou },

            /**
             * O relógio do quadro.
             *
             * Vai junto porque a cena precisa de tempo **controlável** para a repetição
             * do passo em grade: `Date.now()` dentro da cena obriga aprovação por espera
             * real, e uma espera real é um teste que passa ou falha conforme o
             * computador da máquina.
             */
            agora
          }
        })
      );

      animacao = requestAnimationFrame(quadro);
    };

    animacao = requestAnimationFrame(quadro);

    return () => {
      if (animacao !== null) cancelAnimationFrame(animacao);
    };
  }, []);

  const continueToNextCave = () => {
    const baseState = stateRef.current;
    const reward = rewardOptions.find((item) => item.id === selectedRewardId);
    const targetCave = baseState.nextCaveAvailable ?? baseState.cave + 1;
    const progressedState = reward ? reward.apply(baseState) : baseState;
    const nextBiome = getBiomeForCave(targetCave);

    // Na virada de bioma a escolhida vira piso e sobrevive à morte; nas outras
    // cavernas ela é temporária e morre junto com a run. A carta declara os campos
    // que mexe, então só ela entra no piso — uma temporária antiga não vira fixa
    // por estar no mesmo estado.
    const comPiso = reward && rewardIsFixed
      ? fixarMelhoriaEscolhida(progressedState, reward.campos)
      : progressedState;

    const nextState = normalizeProgressState({
      ...comPiso,
      screen: 'cave',
      cave: targetCave,
      biomeId: nextBiome.id,
      biomeName: nextBiome.name,
      hp: comPiso.maxHp,
      bombs: 0,
      inLobby: false,
      lobbyReason: null,
      nextCaveAvailable: null,
      outcomeCave: null,
      lastMessage: reward
        ? t('msg.rewardChosen', {
            reward: reward.name,
            cave: getBiomeProgress(targetCave).label,
            biome: t(nextBiome.nameKey)
          })
        : t('msg.enterCave', {
            cave: getBiomeProgress(targetCave).label,
            biome: t(nextBiome.nameKey)
          })
    });

    if (maybeOpenBiomeSelection(nextState, 'transition')) {
      return;
    }

    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    setRewardIsFixed(false);
    finalizeCaveEntry(nextState);
  };

  const buildResetState = (targetCave = null, customMessage = null) => {
    const baseState = stateRef.current;
    // A mesma regra que a cena aplica: a primeira cave do bioma da morte. Os dois
      // caminhos precisam concordar — quando a cena responder uma coisa e a tela de
      // derrota outra, o reinício cai na cave errada sem nenhum aviso, e a correção
      // fica do lado errado do problema.
      const biomeStartCave = targetCave ?? caveAoMorrer(baseState.cave ?? 1);
    const biome = getBiomeForCave(biomeStartCave);
    const message = customMessage ?? (baseState.dev
      ? t('msg.defeatDev')
      : t('msg.defeat'));

    return normalizeProgressState({
      ...initialState,
      cave: biomeStartCave,
      biomeId: biome.id,
      biomeName: biome.name,
      coins: baseState.coins ?? 0,
      utilities: {
        ...createUtilityInventory(),
        ...(baseState.utilities ?? {})
      },
      collection: baseState.collection ?? createCollectionState(),
      stats: baseState.stats ?? createStatsState(),
      // A MORTE é o que zera as melhorias temporárias: elas voltam ao piso de
      // `melhoriasFixas`, e só as fixas sobrevivem. O recálculo devolve a vida
      // máxima e a picareta que combinam com o piso — sem ele a pessoa voltaria
      // com "Vitalidade 01" no cartão e duas de vida na HUD.
      //
      // Aqui entra `melhoriasReiniciadas`, e não `resetarMelhoriasTemporarias`. A
      // segunda devolve `...estado` inteiro, e espalhada por cima de `cave`,
      // `biomeId`, `coins`, `collection` e `stats` trazia a cave da morte de volta.
      // Foi esse o bug que fez a regra do recomeço parecer implementada e não valendo:
      // a aritmética estava certa e o resultado não.
      ...melhoriasReiniciadas(baseState),
      // O saldo de reliquias e as cinco melhorias compradas com ele atravessam a
      // morte. Entram **depois** do recalculo acima porque ele devolve so os campos
      // derivados - `maxHp`, `hp`, `pickaxeLevel`, `pickaxePower` - e nao os niveis
      // de onde veio. Sem esta linha o estado novo saia sem `relics` e sem os cinco
      // `melhoria*`.
      //
      // A falha era discreta e convincente: a vida maxima continuava certa na HUD,
      // porque o recalculo ja tinha somado o nivel de reliquia ao computar `maxHp`.
      // Quem compra vida e morre ve a vida certa, o que faz a compra parecer
      // permanente; o nivel some do save meio segundo depois e a compra se perde no
      // F5, com o saldo de volta a zero e nenhuma mensagem.
      ...comPermanentes(baseState),
      // bestCave só avança quando a cave é concluída. A versão anterior
      // fazia Math.max(bestCave, cave) também ao morrer, o que destravava
      // o próximo bioma sem nunca ter concluído nenhuma cave dele.
      bestCave: baseState.bestCave ?? 1,
      lastRelicFound: baseState.lastRelicFound ?? null,
      lastMessage: message
    });
  };

  const retryRun = () => {
    // O destino vem da regra, e a regra vem antes de qualquer decisão da interface.
    // Este botão usava `maybeOpenBiomeSelection`, que abre o seletor de bioma quando o
    // destino é a primeira cave de um bioma — e depois de uma morte o destino é
    // **sempre** isso. O seletor abria em toda morte, e a cave final passava a ser a
    // que a pessoa escolhesse nele, com uma cave já escolhida continuando valendo:
    // morrer na 2 voltava para a 2.
    //
    // Morrer não é mudar de bioma. O seletor existe para quem **concluiu** um bioma e
    // ganhou o direito de escolher o próximo, e a morte não destrava nada.
    const recomeco = recomecoAposMorte(stateRef.current.cave ?? 1);
    const nextState = buildResetState(recomeco.cave);

    setSelectedUtility(null);
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);

    if (recomeco.pedirBioma && maybeOpenBiomeSelection(nextState, 'transition')) {
      return;
    }

    // `pularLore`: a pessoa está voltando para o começo de um bioma que ela já
    // conhece, porque morreu nele. Abrir a intro de novo seriam seis painéis a cada
    // morte, no gesto mais comum que existe depois de perder.
    finalizeCaveEntry(nextState, { pularLore: true });
  };

  const backToMainMenu = () => {
    const nextState = buildResetState();

    syncLocalState(nextState);
    setSelectedUtility(null);
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
    setEntryPhase(ENTRY_PHASE.MENU);

    window.dispatchEvent(
      new CustomEvent('cob-restart-run', {
        detail: {
          ...nextState,
          purchased: []
        }
      })
    );
  };

  const showLobby = entryPhase === ENTRY_PHASE.PLAYING && gameState.inLobby;
  const showGameHud = entryPhase === ENTRY_PHASE.PLAYING && !showLobby;

  /**
   * O que a lore está mostrando agora.
   *
   * O `?? null` do painel é o que impede o painel `undefined` de chegar no JSX: se
   * `loreIndice` for um número que não existe — o que acontece se o bioma mudar no
   * meio da sequência, ou se o save for reidratado enquanto ela está na tela — o
   * `entryPhase` logo abaixo é falso e nada é desenhado. Um painel vazio some; um
   * painel com `painel.imagem` undefined quebra a imagem e polui a tela com o nome
   * da chave em vez da fala.
   */
  const paineisLore = loreBioma ? paineisDoBioma(loreBioma) : [];
  const painelLore = paineisLore[loreIndice] ?? null;
  const showLore = entryPhase === ENTRY_PHASE.LORE && painelLore !== null;

  /**
   * O painel da cena final agora, e se a tela está na fase dos painéis.
   *
   * O `?? null` é o que impede o painel `undefined` de chegar no JSX, pelo mesmo
   * motivo do `painelLore`: um índice que não existe desenharia a imagem
   * quebrada em vez de não desenhar nada.
   */
  const paineisFim = cenaFinalBioma ? paineisDaCenaFinal(cenaFinalBioma) : [];
  const painelFim = paineisFim[cenaFinalIndice] ?? null;
  const mostrarPaineisFinais = cenaFinalAberta && painelFim !== null;
  const isDeathLobby = gameState.lobbyReason === 'death';
  const resolvedOutcomeCave = gameState.outcomeCave ?? gameState.cave;
  const nextCaveNumber = gameState.nextCaveAvailable ?? gameState.cave + 1;
  const noRewardsLeft = rewardOptions.length === 0;

  const showMenu = entryPhase === ENTRY_PHASE.MENU && !showRotateLock;
  const showRotateGate = showRotateLock;

  const currentObjectives = getObjectiveProgressList(gameState);
  const unlockedBiomes = getUnlockedBiomes(gameState.bestCave ?? 1, settings.developerMode);
  const unlockedBiomeIds = new Set(unlockedBiomes.map((biome) => biome.id));
  const relicEntries = Object.values(RELIC_CATALOG);
  const totalRelics = getTotalRelics(gameState.collection);
  const activeProgress = getBiomeProgress(gameState.cave);
  const activeBiome = activeProgress.biome;
  const currentBiomeTotal = activeProgress.totalCaves;
  const nextProgress = getBiomeProgress(nextCaveNumber);
  const pendingBiome = pendingBiomeState ? getBiomeForCave(pendingBiomeState.cave) : null;
  const bestCaveProgress = getBiomeProgress(gameState.bestCave ?? 1);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cob-hud-inset', { detail: { height: hudHeight } }));
  }, [hudHeight]);

  // No menu principal o mapa é só arte de fundo: sem marcadores de "IN" e
  // "SAÍDA" aparecendo por cima da vinheta.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('cob-attract-mode', { detail: { active: entryPhase === ENTRY_PHASE.MENU } })
    );
  }, [entryPhase]);

  /**
   * Handshake com a cena do Phaser. A cena é criada depois do React montar, e
   * o jogo não começa pausado — então tudo que é enviado uma única vez no
   * mount (configurações, modo attract) se perde na primeira carga. Aqui o
   * React reenvia o estado atual sempre que a cena se anuncia.
   */
  useEffect(() => {
    const replyToScene = () => {
      window.dispatchEvent(new CustomEvent('cob-settings', { detail: buildSceneSettings(settings) }));
      window.dispatchEvent(
        new CustomEvent('cob-attract-mode', { detail: { active: entryPhase === ENTRY_PHASE.MENU } })
      );
      window.dispatchEvent(new CustomEvent('cob-hud-inset', { detail: { height: hudHeight } }));
    };

    window.addEventListener('cob-scene-ready', replyToScene);
    return () => window.removeEventListener('cob-scene-ready', replyToScene);
  }, [settings, entryPhase, hudHeight]);

  return (
    <div className="app-shell">
      <main className="game-area" ref={shellRef}>
        <div ref={containerRef} className="game-container" />

        {/*
          A seta do ponteiro. Fica aqui, e não dentro de nenhum dos menus, porque
          ela precisa sobreviver à troca de tela: quem a move está no laço do
          controle, que é um só para o jogo inteiro.
        */}
        <div
          ref={ponteiroRef}
          className="ponteiro-controle"
          aria-hidden="true"
          data-visivel="0"
        />

        {showGameHud && (
          <>
            <div className="hud-bar" ref={hudRef}>
              {/*
                Rótulos curtos em vez de emoji: no HUD de console o número é
                a informação e o texto curto diz o que é. Emoji brigava com
                a grade do tracker e com a fonte nova.
              */}
              <div className="hud-cluster">
                <div className="hud-pill">
                  <span>{t('hud.cave')}</span>
                  <strong>{activeProgress.label}</strong>
                </div>

                <div className="hud-pill hud-pill-wide">
                  <span>{t('hud.biome')}</span>
                  <strong>{t(activeBiome.nameKey)}</strong>
                </div>
              </div>

              <div className="hud-cluster hud-cluster-vitals">
                <div
                  className={`hud-pill hud-pill-heart ${pulsingPill === 'heart' ? 'pulsing' : ''}`}
                  title={t('hud.titleLife')}
                >
                  <span>{t('hud.hp')}</span>
                  <strong>
                    {gameState.hp}/{gameState.maxHp}
                  </strong>
                </div>

                <div className="hud-pill" title={t('hud.titleCoins')}>
                  <span>{t('hud.coins')}</span>
                  <strong>{gameState.coins}</strong>
                </div>

                <div
                  className={`hud-pill hud-pill-risk ${pulsingPill === 'risk' ? 'pulsing' : ''}`}
                  title={t('hud.titleBombs')}
                >
                  <span>{t('hud.bombs')}</span>
                  <strong>{gameState.bombsRemaining ?? 0}</strong>
                </div>

                {/* O saldo, e não a soma do catálogo. A soma responde "quantas relíquias
                    diferentes eu já achei?", que é pergunta da tela de Informações; a HUD
                    responde "quanto eu tenho pra gastar?", que é a pergunta de quem está no
                    meio de uma run. Com as duas no mesmo lugar, a pessoa via "RELÍQUIAS 0"
                    na HUD com 40 na loja. */}
                <div className="hud-pill" title={t('hud.titleRelics')}>
                  <span>{t('hud.relics')}</span>
                  <strong>{saldoReliquias}</strong>
                </div>

                <div className="hud-pill" title={t('hud.titlePickaxe')}>
                  <span>{t('hud.pickaxe')}</span>
                  <strong>{gameState.pickaxeLevel}</strong>
                </div>
              </div>

              <div className="utility-bar" role="group" aria-label={t('hud.utilitiesAria')}>
                {utilityCatalog.map((utility) => {
                  const count = gameState.utilities?.[utility.id] ?? 0;
                  const isSelected = selectedUtility === utility.id;

                  return (
                    <div
                      key={utility.id}
                      className={`utility-slot ${isSelected ? 'selected' : ''} ${count > 0 ? 'has-item' : 'is-empty'}`}
                      style={{ '--util-accent': utility.tone }}
                    >
                      <button
                        className="utility-icon-btn"
                        type="button"
                        onClick={() => setSelectedUtility(isSelected ? null : utility.id)}
                        disabled={count <= 0}
                        aria-pressed={isSelected}
                        aria-label={t('hud.utilityAria', { name: utility.name, count, description: utility.description })}
                        title={t('hud.utilityTitle', { name: utility.name, count })}
                      >
                        <span className="utility-icon" aria-hidden="true">
                          {utility.icon}
                        </span>
                        <span className="utility-count">x{count}</span>
                      </button>

                      {isSelected && count > 0 && (
                        <button className="utility-use-btn" type="button" onClick={() => useUtility(utility.id)}>
                          {t('hud.use')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/*
              A tela não mostra mais log de ação. O feedback da exploração é
              visual e fica no mapa: moeda subindo, explosão, relíquia,
              tremor da rocha, e o "-N" de quantos cliques faltam sobre a
              própria pedra. Texto empilhado no canto cobria o mapa.
            */}
            {/*
              Em celular não existe Esc: se o jogo entra em tela cheia, o
              jogador precisa de um caminho visível para sair.
            */}
          </>
        )}

        {/*
          Toast: não é log. Só aparece quando o jogador pediu uma ação que
          não teria efeito (vida cheia, nenhuma bomba restante) e some
          sozinha. Sem ele o clique seria um silêncio sem explicação.
        */}
        {toast && (
          <div className="toast" role="status" key={toast.id}>
            {toast.text}
          </div>
        )}

        {/*
          O aviso fica FORA do gate de gameplay de propósito: a falha de
          tela cheia acontece no clique que inicia a run, ou seja, durante a
          intro, quando o HUD ainda não existe. Dentro do gate ele nunca
          apareceria.
        */}
        {fullscreenNotice && (
          <div className="fullscreen-notice" role="status">
            <span>{t(fullscreenNotice.messageKey)}</span>
            <button
              type="button"
              onClick={() => setFullscreenNotice(null)}
              aria-label={t('fullscreen.closeNotice')}
            >
              ✕
            </button>
          </div>
        )}

        {showExitDecision && showGameHud && !showLobby && (
          <div className="exit-decision-overlay" data-tela="saida">
            <div className="exit-decision-modal">
              <div className="result-badge win">{t('exit.badge')}</div>

              <h2>{t('exit.question')}</h2>
              <p>{gameState.lastMessage}</p>

              <div className="exit-decision-actions">
                {/* Na última caverna não existe "próxima". Sem esta troca, o botão
                    levava para a caverna 61 — que `getBiomeForCave` não rejeita, ela
                    devolve o último bioma — e o jogador ficava numa caverna que
                    mostra "10/10" para sempre, sem nunca mais avançar. */}
                <button
                  className="primary-btn next-cave-btn"
                  type="button"
                  onClick={ehCaveFinal(gameState.cave) ? abrirFinale : chooseNextCaveFromExit}
                >
                  {ehCaveFinal(gameState.cave) ? t('exit.finale') : t('exit.nextCave')}
                </button>

                <button className="ghost-btn utility-lobby-btn" type="button" onClick={continueExploringCurrentCave}>
                  {t('exit.keepExploring')}
                </button>
              </div>
            </div>
          </div>
        )}

        {controleConectado && controleNome && showGameHud && (
          <span className="hud-controller">{t('hud.controller', { name: controleNome })}</span>
        )}

        {/*
          O canto inferior direito: pausa e tela cheia.

          ## Por que a engrenagem só aparece quando dá para pausar
          Porque `pauseAvailable` é exatamente a condição que decide se a pausa abre
          — o mesmo teste do `Esc` e do `Start` do controle. Usar `showGameHud` aqui
          colocaria o botão na tela em estados em que ele não faz nada, e um botão que
          não faz nada é pior do que um botão que não está.

          ## Por que um SVG e não um glifo de fonte
          Porque o glifo depende da fonte que o aparelho tem, e o desenho da engrenagem
          é o que faz a pessoa saber o que é sem ler. Duas fontes desenham "⚙" como
          engrenagem ou como emoji colorido, e o emoji vem com o fundo próprio que
          briga com o canto escuro do HUD. O SVG é o mesmo em todo aparelho.

          ## Por que o agrupamento é `pointer-events: none`
          Porque o agrupamento tem o tamanho da fileira, e o vão entre os dois botões
          cairia no agrupamento em vez de no canvas. Com o `none` no agrupamento e
          `auto` nos botões, só os botões themselves interceptam o toque.
        */}
        {(pauseAvailable || (showGameHud && fullscreenAvailable)) && (
          <div className="hud-corner-actions">
            {pauseAvailable && (
              <button
                type="button"
                className="corner-action"
                onClick={pedirPausa}
                aria-label={t('hud.pause')}
                title={t('hud.pause')}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm0 5.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z"
                  />
                  <path
                    fill="currentColor"
                    d="M10.6 2h2.8a.9.9 0 0 1 .9.8l.3 2a7.6 7.6 0 0 1 1.9 1.1l1.9-.8a.9.9 0 0 1 1.1.4l1.4 2.4a.9.9 0 0 1-.2 1.2l-1.5 1.3a7.7 7.7 0 0 1 0 2.2l1.5 1.3a.9.9 0 0 1 .2 1.2l-1.4 2.4a.9.9 0 0 1-1.1.4l-1.9-.8a7.6 7.6 0 0 1-1.9 1.1l-.3 2a.9.9 0 0 1-.9.8h-2.8a.9.9 0 0 1-.9-.8l-.3-2a7.6 7.6 0 0 1-1.9-1.1l-1.9.8a.9.9 0 0 1-1.1-.4L4.2 15a.9.9 0 0 1 .2-1.2l1.5-1.3a7.7 7.7 0 0 1 0-2.2L4.4 9a.9.9 0 0 1-.2-1.2l1.4-2.4a.9.9 0 0 1 1.1-.4l1.9.8a7.6 7.6 0 0 1 1.9-1.1l.3-2a.9.9 0 0 1 .8-.8Z"
                    opacity="0.92"
                  />
                </svg>
              </button>
            )}

            {showGameHud && fullscreenAvailable && (
              <button
                type="button"
                className={`corner-action ${isFullscreen ? 'active' : ''}`}
                onClick={handleToggleFullscreen}
                aria-pressed={isFullscreen}
                aria-label={t(isFullscreen ? 'fullscreen.exit' : 'fullscreen.enter')}
                title={t(isFullscreen ? 'fullscreen.exitWithKey' : 'fullscreen.enter')}
              >
                <span aria-hidden="true">{isFullscreen ? '⤢' : '⤡'}</span>
              </button>
            )}
          </div>
        )}

        {showLobby && (
          <div className="lobby-overlay" data-tela="lobby">
            <div className="lobby-modal lobby-modal-modern">
              <div className={`result-hero ${isDeathLobby ? 'death' : 'win'}`}>
                <div className={`result-badge ${isDeathLobby ? 'death' : 'win'}`}>
                  {t(isDeathLobby ? 'lobby.defeatBadge' : 'lobby.victoryBadge')}
                </div>

                <h1>
                  {isDeathLobby
                    ? t('lobby.defeatTitle')
                    : t('lobby.clearTitle', { cave: getBiomeProgress(resolvedOutcomeCave).label })}
                </h1>

                <p className="result-hero-message">{gameState.lastMessage}</p>

                <div className="hero-inline-summary">
                  <div className="hero-inline-item">
                    <span>🪙</span>
                    <div className="hero-inline-copy">
                      <strong>{gameState.coins}</strong>
                      <small>{t('lobby.coins')}</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>❤️</span>
                    <div className="hero-inline-copy">
                      <strong>
                        {gameState.hp}/{gameState.maxHp}
                      </strong>
                      <small>{t('lobby.life')}</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>⛏️</span>
                    <div className="hero-inline-copy">
                      <strong>Nv. {gameState.pickaxeLevel}</strong>
                      <small>{t('lobby.pickaxe')}</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>🗺️</span>
                    <div className="hero-inline-copy">
                      <strong>{getBiomeProgress(resolvedOutcomeCave).label}</strong>
                      <small>{t('hud.cave')}</small>
                    </div>
                  </div>

                  <div className="hero-inline-item">
                    <span>⬇️</span>
                    <div className="hero-inline-copy">
                      <strong>{isDeathLobby ? `1/${currentBiomeTotal}` : nextProgress.label}</strong>
                      <small>{t('lobby.next')}</small>
                    </div>
                  </div>
                </div>
              </div>

              {!isDeathLobby && (
                <>
                  <div className="lobby-section-card">
                    <div className="section-title-wrap section-title-wrap-inline">
                      <div>
                        <h2>{t('lobby.chooseUpgrade')}</h2>

                        {/* Só na virada de bioma. A frase precisa dizer POR QUE são
                            4 opções e o que elas valem: sem ela o jogador vê um selo
                            "FIXA" nos cartões e nenhuma explicação do que significa
                            ficar com a melhoria até o fim do jogo. */}
                        {rewardIsFixed ? (
                          <p className="lobby-upgrade-sub is-fixed">
                            {t('lobby.chooseUpgradeFixedSub', {
                              biome: t(getBiomeForCave(resolvedOutcomeCave).nameKey)
                            })}
                          </p>
                        ) : (
                          <p className="lobby-upgrade-sub">{t('lobby.chooseUpgradeSub')}</p>
                        )}
                      </div>

                      <button
                        className="reward-reroll-btn"
                        type="button"
                        onClick={rerollRewards}
                        disabled={noRewardsLeft || gameState.coins < rewardRefreshCost}
                      >
                        {gameState.coins >= rewardRefreshCost
                          ? t('lobby.reroll', { n: rewardRefreshCost })
                          : t('lobby.rerollMissing', { n: rewardRefreshCost - gameState.coins })}
                      </button>
                    </div>

                    {noRewardsLeft ? (
                      <p className="empty-text">{t('lobby.noUpgradesLeft')}</p>
                    ) : (
                      <div className="reward-line-grid">
                        {rewardOptions.map((reward) => {
                          const isSelected = selectedRewardId === reward.id;
                          const visual = getRewardVisual(reward.track);

                          return (
                            <button
                              key={reward.id}
                              type="button"
                              className={`reward-line-card ${visual.accent} ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedRewardId(reward.id)}
                            >
                              <div className="reward-icon-badge">{visual.icon}</div>

                              <div className="reward-card-top">
                                <strong>{reward.name}</strong>
                                {/* Só na virada de bioma. O aviso importa mais do
                                    que parece: sem ele a pessoa não tem como saber
                                    que esta escolha sobrevive à morte e as outras
                                    não — e descobre do jeito mais caro, morrendo. */}
                                {rewardIsFixed && (
                                  <span className="reward-fixed-badge">{t('reward.fixed')}</span>
                                )}
                              </div>

                              <p>{reward.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="lobby-bottom-actions">
                    <button
                      className="primary-btn next-cave-btn"
                      type="button"
                      onClick={continueToNextCave}
                      disabled={!noRewardsLeft && !selectedRewardId}
                    >
                      {t('lobby.nextCave')}
                    </button>

                    <button
                      className="ghost-btn utility-lobby-btn"
                      type="button"
                      onClick={() => setShowUtilityShopModal(true)}
                    >
                      {t('lobby.utilityShop')}
                    </button>

                    <button
                      className="ghost-btn utility-lobby-btn"
                      type="button"
                      onClick={() => setShowInfoModal(true)}
                    >
                      {t('common.info')}
                    </button>
                  </div>
                </>
              )}

              {isDeathLobby && (
                <div className="lobby-bottom-actions">
                  <button className="primary-btn next-cave-btn" type="button" onClick={retryRun}>
                    {t('lobby.retry')}
                  </button>

                  {/* A loja aparece na derrota tambem, e e o unico lugar onde a
                      pessoa pode gastar as reliquias que acabou de juntar. Antes ela
                      ficava presa aqui sem porta de saida para o saldo, e gastava
                      so depois de concluir uma caverna. */}
                  <button
                    className="ghost-btn utility-lobby-btn"
                    type="button"
                    onClick={() => setShowUtilityShopModal(true)}
                  >
                    {t('lobby.utilityShop')}
                  </button>

                  <button className="ghost-btn utility-lobby-btn" type="button" onClick={backToMainMenu}>
                    {t('lobby.mainMenu')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        /* A loja abre na derrota também.

     Sem esta guarda o modal nunca aparecia depois de morrer, e o botão que o abre só
     existia na vitória — os dois tinham de mudar juntos, e é por isso que a guarda
     mora aqui e não dentro do botão. */
{showLobby && showUtilityShopModal && (
          <div className="utility-shop-modal-overlay" data-tela="utilitaria" onClick={() => setShowUtilityShopModal(false)}>
            <div className="utility-shop-modal" onClick={(event) => event.stopPropagation()}>
              <div className="utility-shop-modal-header">
                <div>
                  <h2>{t('shop.title')}</h2>
                  <p>{t('shop.subtitle')}</p>
                </div>

                <button
                  className="utility-shop-close-btn"
                  type="button"
                  onClick={() => setShowUtilityShopModal(false)}
                >
                  {t('common.close')}
                </button>
              </div>

              <div className="utility-shop-line">
                {utilityCatalog.map((utility) => {
                  const canBuy = gameState.coins >= utility.cost;
                  const owned = gameState.utilities?.[utility.id] ?? 0;

                  return (
                    <div key={utility.id} className="utility-shop-pill">
                      <div className="utility-shop-pill-top">
                        <span className="utility-shop-pill-icon">{utility.icon}</span>
                        <div className="utility-shop-pill-text">
                          <strong>{utility.name}</strong>
                          <small>{t('shop.inBag', { n: owned })}</small>
                        </div>
                      </div>

                      <p>{utility.description}</p>

                      <div className="shop-action-row">
                        <button
                          className="shop-buy-btn"
                          type="button"
                          onClick={() => buyUtility(utility)}
                          disabled={!canBuy}
                        >
                          {t('shop.buy', { n: utility.cost })}
                        </button>

                        {!canBuy && (
                          <small className="shop-buy-note">
                            {t('shop.missing', { n: utility.cost - gameState.coins })}
                          </small>
                        )}

                        <button
                          className="shop-sell-btn"
                          type="button"
                          onClick={() => sellUtility(utility)}
                          disabled={owned <= 0}
                        >
                          {owned > 0
                            ? t('shop.sell', { n: Math.max(1, Math.floor(utility.cost / 2)) })
                            : t('shop.empty')}
                        </button>
                      </div>
                    </div>
                  );
                })}

            </div>

            <div className="shop-section">
              <div className="shop-section-head">
                <h3>{t('shop.sectionUpgrades')}</h3>
                <span className="shop-relic-balance">
                  {t('shop.relicBalance', { n: saldoReliquias })}
                </span>
              </div>

              <p className="shop-section-note">{t('shop.upgradesSubtitle')}</p>

              {/* Uma linha por melhoria, e não um cartão. Cinco cartões altos deixam
                  a seção mais longa que a tela, e o efeito de cada melhoria é uma
                  frase — que cabe ao lado do nome. O pips no meio é o nível: três
                  quadradinhos, e o que está aceso é o que a pessoa comprou. */}
              <div className="shop-upgrade-list">
                {UPGRADE_IDS.map((id) => {
                  const nivel = nivelDe(gameState, id);
                  const maximo = nivelMaximo(id);
                  const custo = custoDoProximoNivel(id, nivel);
                  const noMaximo = custo === null;
                  const podeComprar = !noMaximo && saldoReliquias >= custo;
                  const beneficio = chaveDoProximoBeneficio(id, nivel);

                  return (
                    <div
                      key={id}
                      className={`shop-upgrade-row${noMaximo ? ' no-maximo' : ''}`}
                    >
                      <span className="shop-upgrade-icon" aria-hidden="true">
                        {UPGRADES[id].icon}
                      </span>

                      <div className="shop-upgrade-info">
                        <strong>{t(`shop.upgrade.${id}.name`)}</strong>

                        {/* O benefício vem traduzido, e não a chave. Passar a chave
                            como valor de substituição imprimia `shop.upgrade.health.benefit`
                            na tela: a pessoa lia o nome do texto em vez do texto. */}
                        <p>
                          {noMaximo
                            ? t('shop.maxLevel')
                            : t('shop.upgradeNext', { benefit: beneficio ? t(beneficio) : '' })}
                        </p>
                      </div>

                      <div
                        className="shop-upgrade-pips"
                        aria-label={t('shop.level', { atual: nivel, max: maximo })}
                      >
                        {Array.from({ length: maximo }, (_, indice) => (
                          <span key={indice} className={indice < nivel ? 'aceso' : ''} />
                        ))}
                      </div>

                      <div className="shop-upgrade-action">
                        <button
                          className="shop-buy-btn"
                          type="button"
                          onClick={() => buyUpgrade(id)}
                          disabled={noMaximo || !podeComprar}
                        >
                          {noMaximo ? t('shop.maxLevel') : t('shop.buyNext', { n: custo })}
                        </button>

                        {/* A nota fica **abaixo** do botão, e não ao lado: ao lado ela
                            divide a largura com ele e o preço quebra em duas linhas. */}
                        {!podeComprar && !noMaximo && (
                          <small className="shop-buy-note">
                            {t('shop.notEnoughRelics')}
                          </small>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        )}

        {pauseOpen && (
          <div
            className="pause-overlay" data-tela="pausa"
            role="dialog"
            aria-modal="true"
            aria-label={t('pause.aria')}
            ref={pausaRef}
          >
            <div className="pause-panel">
              <span className="pause-kicker">{t('pause.kicker')}</span>

              <h2 className="pause-title">
                {t('pause.title', { biome: t(activeBiome.nameKey), cave: activeProgress.label })}
              </h2>

              <p className="pause-message">{t('pause.message')}</p>

              <div className="pause-actions">
                <button className="menu-primary-btn compact" type="button" onClick={() => setShowPause(false)}>
                  {t('pause.continue')}
                </button>

                <button
                  className="menu-secondary-btn compact"
                  type="button"
                  onClick={() => {
                    setShowPause(false);
                    backToMainMenu();
                  }}
                >
                  {t('pause.toMenu')}
                </button>
              </div>

              <span className="pause-hint">
                <kbd>Esc</kbd> {t('pause.hint')}
              </span>

              {controleConectado && (
                <span className="pause-hint pause-hint-controle">{t('pause.controllerHint')}</span>
              )}
            </div>
          </div>
        )}

        {showMenu && (
          <div className="entry-overlay menu-overlay" data-tela="menu">
            {/*
              Menu em coluna à esquerda, com itens como texto em caixa alta e
              tracking largo. A referência é a linguagem de tela de título de
              console: a arte ocupa a tela toda e a UI recua, em vez de um
              painel centralizado com botões preenchidos.
            */}
            <div className="menu-rail">
              <div className="menu-lockup">
                <span className="menu-kicker">{t('menu.kicker')}</span>
                <h1 className="menu-title">
                  Coins<span className="menu-title-or">or</span>Bombs
                </h1>
                <span className="menu-tagline">
                  {t('menu.taglineCaves', { count: TOTAL_CAVES })} ·{' '}
                  {t('menu.taglineBiomes', { count: BIOMES.length })} ·{' '}
                  {t('menu.taglineTail')}
                </span>
              </div>

              <nav className="menu-actions" aria-label={t('menu.mainAria')}>
                <button
                  className="menu-item"
                  type="button"
                  onClick={abrirListaDeJogos}
                >
                  <span className="menu-item-bar" aria-hidden="true" />
                  <span className="menu-item-label">{t('menu.enter')}</span>
                </button>

                <button
                  className="menu-item"
                  type="button"
                  onClick={() => setShowSettings(true)}
                >
                  <span className="menu-item-bar" aria-hidden="true" />
                  <span className="menu-item-label">{t('menu.settings')}</span>
                </button>

                <button
                  className="menu-item"
                  type="button"
                  onClick={() => setShowLanguage(true)}
                >
                  <span className="menu-item-bar" aria-hidden="true" />
                  <span className="menu-item-label">{t('language.title')}</span>
                </button>

                <button
                  className="menu-item"
                  type="button"
                  onClick={() => setShowInfoModal(true)}
                >
                  <span className="menu-item-bar" aria-hidden="true" />
                  <span className="menu-item-label">{t('menu.info')}</span>
                </button>
              </nav>

              <div className="menu-foot">
                <span className="menu-foot-item">v{GAME_VERSION}</span>
              </div>
            </div>
          </div>
        )}

        {showLanguage && showMenu && (
          <div className="menu-settings-backdrop" onClick={() => setShowLanguage(false)}>
            <div className="menu-settings-modal language-modal" data-tela="idioma" ref={languageModalRef} onClick={(event) => event.stopPropagation()}>
              <h2>{t('language.title')}</h2>
              <p className="language-hint">{t('language.hint')}</p>

              <div className="language-list" role="radiogroup" aria-label={t('language.title')}>
                {LOCALES.map((locale) => {
                  const ativo = locale.id === settings.language;

                  return (
                    <button
                      key={locale.id}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      className={`language-option ${ativo ? 'selected' : ''}`}
                      onClick={() => setSettings((current) => ({ ...current, language: locale.id }))}
                    >
                      <span className="language-option-native">{locale.nativeName}</span>
                      <span className="language-option-name">{locale.name}</span>
                      {ativo && <span className="language-option-mark">{t('language.current')}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="settings-actions">
                <button className="menu-primary-btn compact" type="button" onClick={() => setShowLanguage(false)}>
                  {t('common.back')}
                </button>
              </div>
            </div>
          </div>
        )}

        {entryPhase === ENTRY_PHASE.BLACK && <div className="entry-overlay intro-black-screen" />}

        {entryPhase === ENTRY_PHASE.LOGO && (
          <div className="entry-overlay splash-overlay">
            <img
              src="./assets/archangelsoft_splash.jpg"
              alt="ArchangelSoft"
              className="archangelsoft-splash"
              width="1280"
              height="1280"
            />
          </div>
        )}

        {showLore && (
          /*
           * A camada da mina. O fundo é a arte do próprio bioma — a mesma que a
           * cena do Phaser desenha — e por baixo da vinheta escura. Não é uma
           * imagem nova: é a que o `BootScene` já carregou, então ela está no
           * cache e não custa download.
           */
          <div
            className="entry-overlay lore-overlay"
            // O clique fica na camada inteira e não na arte. Com o clique preso à
            // faixa 3:1, as laterais da mina eram territory morto — a pessoa
            // clica no fundo, nada acontece, e parece quebrado. `div` e não
            // `button` de propósito: um `<button>` reage sozinho ao `Enter` e ao
            // `Espaço`, e os dois já têm dono (`Enter` pula a lore inteira,
            // `Espaço` avança um painel) — com um botão embaixo, o `Enter`
            // dispararia os dois.
            role="button"
            tabIndex={-1}
            aria-label={t('lore.dicaAvancar')}
            onClick={avancarLore}
            style={{
              // A URL vai no `backgroundImage` do estilo embutido, e **não** numa
              // variável CSS. Numa variável, o `./assets/...` resolveria contra o
              // arquivo `.css`, que depois do build mora em `/assets/` — e viraria
              // `/assets/assets/cave_bg_sunstone.png`, que dá 404 sem erro nenhum e
              // deixa a mina como fundo preto. No estilo embutido a URL resolve
              // contra o documento, igual ao `<img src>` do splash logo acima.
              backgroundImage: `url(./assets/${getBackdropKey(loreBioma)}.png)`
            }}
          >
            <div className="lore-stage">
              <div className="lore-frame">
                <img
                  className="lore-frame-img"
                  src={`./${caminhoDaImagem(painelLore.imagem)}`}
                  alt=""
                />

                {/*
                 * A caixa de texto fica em cima da parte amarelada da arte, e as
                 * porcentagens não são olho: elas vieram de medir o pixels da
                 * imagem. A faixa creme de verdade vai de 40,5% a 83% da largura
                 * e de 48,6% a 76,2% da altura; a caixa usa 50%..73% para ficar
                 * dentro com folga, porque texto encostando na moldura parece
                 * defeito de layout.
                 */}
                <div className="lore-texto">
                  <p className="lore-falante">{t(CHAVE_FALANTE)}</p>

                  {painelLore.falas.map((chave) => (
                    <p key={chave} className="lore-fala">
                      {t(chave)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="lore-rodape">
                <span className="lore-dica">{t('lore.dicaAvancar')}</span>
                <span className="lore-dica">{t('lore.dicaPular')}</span>
                <span className="lore-contador">{t('lore.painel', { n: loreIndice + 1, total: paineisLore.length })}</span>
              </div>
            </div>
          </div>
        )}

        {showSaves && (
          <div className="menu-settings-backdrop saves-backdrop" onClick={fecharListaDeJogos}>
            <div
              className="menu-settings-modal saves-modal" data-tela="jogos"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t('saves.title')}
            >
              <div className="menu-info-head saves-head">
                <div>
                  <h2>{t('saves.title')}</h2>
                  <p className="saves-subtitle">{t('saves.subtitle')}</p>
                </div>
              </div>

              <div className="saves-list" aria-label={t('saves.ariaList')}>
                {saves.length === 0 ? (
                  <div className="saves-empty">
                    <p className="saves-empty-title">{t('saves.empty')}</p>
                    <p className="saves-empty-hint">{t('saves.emptyHint')}</p>
                  </div>
                ) : (
                  saves.map((jogo) => {
                    const biome = getBiomeForCave(jogo.cave);
                    const data = formatarDataDeJogo(jogo.playedAt, getLocale());
                    const renomeando = saveEdit?.tipo === 'renomear' && saveEdit.id === jogo.id;
                    const apagando = saveEdit?.tipo === 'apagar' && saveEdit.id === jogo.id;
                    // Um jogo de teste não abre no jogo normal, e um jogo normal não
                    // abre no modo desenvolvedor. O motivo é escrito na tela: um
                    // botão que simplesmente não está lá deixa a pessoa achando que
                    // o save sumiu, e ela acaba criando um jogo novo à toa.
                    const bloqueado = !saveCompativelComOModo({ dev: jogo.dev }, settings.developerMode);

                    return (
                      <article
                        key={jogo.id}
                        className={`saves-card${jogo.id === activeSaveId ? ' is-current' : ''}${bloqueado ? ' is-blocked' : ''}`}
                      >
                        <header className="saves-card-head">
                          <h3 className="saves-card-name">{jogo.name}</h3>

                          {jogo.dev && (
                            <span className="saves-badge is-dev">{t('saves.testGame')}</span>
                          )}

                          {jogo.id === activeSaveId && !bloqueado && (
                            <span className="saves-badge">{t('saves.current')}</span>
                          )}
                        </header>

                        {bloqueado && (
                          <p className="saves-blocked">
                            {jogo.dev
                              ? t('saves.blockedNeedsStandard')
                              : t('saves.blockedNeedsDev')}
                          </p>
                        )}

                        <p className="saves-card-where">
                          {getBiomeProgress(jogo.cave).label} · {t(biome.nameKey)}
                        </p>

                        <div className="saves-card-stats">
                          <span className="saves-chip">
                            <b>{jogo.coins}</b> {t('hud.coins')}
                          </span>

                          <span className="saves-chip">
                            {t('saves.relics', { count: jogo.relics })}
                          </span>

                          {data && (
                            <span className="saves-chip is-dim" title={t('saves.playedOn', { date: data })}>
                              {data}
                            </span>
                          )}
                        </div>

                        {renomeando ? (
                          <form
                            className="saves-rename"
                            onSubmit={(event) => {
                              event.preventDefault();
                              renomearJogoSalvo(jogo.id, saveEdit.nome);
                            }}
                          >
                            <input
                              className="saves-input"
                              autoFocus
                              maxLength={28}
                              value={saveEdit.nome}
                              aria-label={t('saves.renameTitle')}
                              onChange={(event) =>
                                setSaveEdit((current) => ({ ...current, nome: event.target.value }))
                              }
                            />

                            <button className="menu-primary-btn compact" type="submit">
                              {t('saves.saveName')}
                            </button>

                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => setSaveEdit(null)}
                            >
                              {t('common.back')}
                            </button>

                            {nomeDeJogoRepetido(saves, saveEdit.nome, jogo.id) && (
                              <p className="saves-warn">{t('saves.nameTaken')}</p>
                            )}
                          </form>
                        ) : (
                          <div className="saves-card-actions">
                            <button
                              className="menu-primary-btn compact"
                              type="button"
                              onClick={() => entrarNoJogo(jogo.id)}
                              disabled={bloqueado}
                            >
                              {t('saves.play')}
                            </button>

                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => trocarBiomaDoJogo(jogo.id)}
                              disabled={bloqueado}
                            >
                              {t('biomeSelect.title.menu')}
                            </button>

                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() =>
                                setSaveEdit({ tipo: 'renomear', id: jogo.id, nome: jogo.name })
                              }
                            >
                              {t('saves.rename')}
                            </button>

                            <button
                              className="ghost-btn is-danger"
                              type="button"
                              onClick={() =>
                                setSaveEdit({ tipo: 'apagar', id: jogo.id, nome: jogo.name })
                              }
                            >
                              {t('saves.delete')}
                            </button>
                          </div>
                        )}

                        {apagando && (
                          <div className="saves-confirm" role="alertdialog" aria-label={t('saves.deleteTitle')}>
                            <p>{t('saves.deleteConfirm', { name: jogo.name })}</p>

                            <div className="saves-card-actions">
                              <button
                                className="ghost-btn"
                                type="button"
                                onClick={() => setSaveEdit(null)}
                              >
                                {t('common.back')}
                              </button>

                              <button
                                className="ghost-btn is-danger"
                                type="button"
                                onClick={() => apagarJogoSalvo(jogo.id)}
                              >
                                {t('saves.delete')}
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>

              <form
                className="saves-new"
                onSubmit={(event) => {
                  event.preventDefault();
                  criarEEntrar();
                }}
              >
                <label className="saves-new-label" htmlFor="cob-save-name">
                  {t('saves.nameLabel')}
                </label>

                <input
                  id="cob-save-name"
                  className="saves-input"
                  value={saveNameDraft}
                  maxLength={28}
                  placeholder={t('saves.namePlaceholder')}
                  onChange={(event) => setSaveNameDraft(event.target.value)}
                />

                {nomeDeJogoRepetido(saves, saveNameDraft) && (
                  <p className="saves-warn">{t('saves.nameTaken')}</p>
                )}

                <button className="menu-primary-btn" type="submit">
                  {t('saves.create')}
                </button>
              </form>
            </div>
          </div>
        )}

{mostrarPaineisFinais && (
          <div
            className="entry-overlay lore-overlay cena-final-paineis"
            role="button"
            tabIndex={-1}
            aria-label={t('cenaFinal.dica')}
            onClick={avancarCenaFinal}
          >
            {/*
              O fundo é a vista da boca da caverna, e não a arte do bioma. A cena
              final é uma coisa só: o mineiro fala **na** saída da caverna, e não
              numa sala separada que vem depois. Ver a fala contra o fundo escuro da
              Câmara de Cristal e ver a fala contra o vale com o sol entrando são
              duas cenas diferentes, e só a segunda é a última cena do jogo.

              Depois do último painel a faixa sai e sobra a paisagem — é a mesma
              imagem, sem a tarja por cima.
            */}
            <img
              className="cena-final-arte"
              src={`./${caminhoDaArteFinal()}`}
              alt=""
              aria-hidden="true"
              draggable="false"
            />

            {/* O mesmo chão e o mesmo véu da vista, para a cena não mudar de luz
                quando a tarja some. */}
            <div className="cena-final-chao" aria-hidden="true" />
            <div className="cena-final-veu" aria-hidden="true" />

            {/*
              A faixa é a arte 3:1 com a tarja de creme, e o texto cai nela pela
              mesma caixa de `.lore-texto` medida na mesma imagem.
            */}
            <div className="lore-stage">
              <div className="lore-frame">
                <img
                  className="lore-frame-img"
                  src={`./assets/${painelFim.imagem}.png`}
                  alt=""
                />

                <div className="lore-texto">
                  <p className="lore-falante">{t(CHAVE_FALANTE_FINAL)}</p>

                  {painelFim.falas.map((chave) => (
                    <p key={chave} className="lore-fala">
                      {t(chave)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="lore-rodape">
                <span className="lore-dica">{t('cenaFinal.dica')}</span>
                <span className="lore-dica">{t('lore.dicaPular')}</span>
                <span className="lore-contador">
                  {t('lore.painel', { n: cenaFinalIndice + 1, total: paineisFim.length })}
                </span>
              </div>
            </div>
          </div>
        )}

{showFinale && (
          <div
            className="finale-overlay" data-tela="final"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cob-finale-titulo"
            onClick={fecharFinale}
          >
            <img
              className="finale-art"
              src="./assets/finale.jpg"
              alt=""
              aria-hidden="true"
              draggable="false"
            />

            {/* O véu. A arte é clara no meio — é um pôr do sol — e o texto passa por
                cima dela, então sem isto o branco da letra some no brilho do céu.
                O degradê é mais forte em cima e embaixo porque é onde a carta entra
                e sai, e é onde o branco do céu encosta na borda. */}
            <div className="finale-veil" aria-hidden="true" />

            <div className="finale-roller">
              <div
                className="finale-text"
                style={{ '--finale-duracao': `${duracaoFinale}ms` }}
                onAnimationEnd={concluirFinale}
              >
                {/* O `id` existe para o `aria-labelledby` do dialog: um `aria-label`
                    com o mesmo texto do título funciona para o leitor de tela, mas
                    o Lighthouse acusa porque o nome acessível não bate com todo o
                    texto visível do elemento, que é a carta inteira. */}
                <h2 className="finale-title" id="cob-finale-titulo">
                  {t('finale.title')}
                </h2>

                {FINALE_PARAGRAFOS.map((chave) => (
                  <p key={chave} className="finale-paragrafo">
                    {t(chave)}
                  </p>
                ))}

                <p className="finale-assinatura">{t('finale.signature')}</p>
                <p className="finale-equipe">{t('finale.team')}</p>
                <p className="finale-encerramento">{t('finale.closing')}</p>
              </div>
            </div>

            <button className="finale-pular" type="button" onClick={fecharFinale}>
              {t('finale.skip')}
            </button>
          </div>
        )}

        {showBiomeSelect && (
          <div className="menu-settings-backdrop biome-select-backdrop" onClick={closeBiomeSelection}>
            <div className="menu-settings-modal biome-select-modal" data-tela="bioma" onClick={(event) => event.stopPropagation()}>
              <div className="menu-info-head biome-select-head">
                <div>
                  <h2>
                    {t(biomeSelectContext === 'menu' ? 'biomeSelect.title.menu' : 'biomeSelect.title.next')}
                  </h2>
                </div>

                <span className="biome-select-subtle">
                  {settings.developerMode
                    ? t('biomeSelect.devMode')
                    : t('biomeSelect.bestCave', { n: gameState.bestCave })}
                </span>
              </div>

              <div className="biome-select-grid">
                {BIOMES.map((biome) => {
                  const unlocked = unlockedBiomeIds.has(biome.id);
                  const completed = isBiomeCompleted(biome, gameState.bestCave ?? 1);
                  const selected = selectedBiomeId === biome.id;
                  const selectable = biomeSelectContext === 'menu' ? unlocked : pendingBiome?.id === biome.id;
                  // No modo desenvolvedor um bioma pode estar liberado sem ter
                  // sido concluído de verdade. O rótulo precisa dizer isso,
                  // senão a tela mente sobre o estado da progressão.
                  const unlockedByDev = settings.developerMode && !isBiomeCompleted(biome, gameState.bestCave ?? 1)
                    && (gameState.bestCave ?? 1) < biome.unlockCave;
                  const statusLabel = !unlocked
                    ? t('biomeSelect.status.locked')
                    : unlockedByDev
                      ? t('biomeSelect.status.dev')
                      : completed
                        ? t('biomeSelect.status.completed')
                        : selectable
                          ? t('biomeSelect.status.available')
                          : t('biomeSelect.status.visited');

                  // Só o bioma bloqueado ganha texto: é o único caso em que o
                  // jogador precisa saber o que falta. Os demais já têm badge
                  // dizendo o estado, e a frase só ocupava espaço.
                  let description = null;

                  if (!unlocked || unlockedByDev) {
                    const caveDeDesbloqueio =
                      getBiomeForCave(biome.unlockCave - 1)?.endCave ?? biome.unlockCave;
                    description = t('biomeSelect.unlockAt', { n: caveDeDesbloqueio });
                  }

                  return (
                    <button
                      key={biome.id}
                      type="button"
                      className={`biome-card ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''} ${unlockedByDev ? 'dev-unlocked' : ''} ${selected ? 'selected' : ''}`}
                      style={{ '--biome-accent': getBiomeAccentColor(biome.id) }}
                      onClick={() => {
                        if (!selectable) return;

                        setSelectedBiomeId(biome.id);
                        // A cave escolhida era do bioma anterior. Trocar de bioma
                        // sem limpar deixaria a cave 9 selecionada enquanto o
                        // cartão marcado seria o da Gruta de Gelo — e o botão
                        // entraria numa cave do bioma que ninguém escolheu.
                        setSelectedCave(null);
                      }}
                      disabled={!selectable}
                    >
                      <div className="biome-card-top">
                        <strong>{t(biome.nameKey)}</strong>
                        <span className="biome-status-badge">{statusLabel}</span>
                      </div>

                      <span className="biome-card-range">{t(biome.rangeKey)}</span>
                      {description && <p>{description}</p>}
                    </button>
                  );
                })}
              </div>

              {settings.developerMode && (() => {
                const biomaSelecionado = BIOMES.find((biome) => biome.id === selectedBiomeId) ?? firstBiome;

                return (
                  <div className="biome-dev-cave">
                    <div className="biome-dev-cave-head">
                      {/* Reaproveita `hud.cave`, que já está traduzido nos dez
                          idiomas e é a mesma palavra que a HUD mostra. Uma chave
                          nova aqui seria mais uma frase para manter em dez
                          idiomas sem acrescentar nada. */}
                      <span className="biome-dev-cave-label">{t('hud.cave')}</span>
                      <span className="biome-dev-cave-hint">
                        {t(biomaSelecionado.rangeKey)}
                      </span>
                    </div>

                    <div className="biome-dev-cave-grid">
                      {cavesDoBioma(biomaSelecionado).map((cave) => (
                        <button
                          key={cave}
                          type="button"
                          className={`biome-dev-cave-btn ${selectedCave === cave ? 'selected' : ''}`}
                          onClick={() => setSelectedCave(selectedCave === cave ? null : cave)}
                        >
                          {cave}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="biome-select-actions">
                <button className="menu-primary-btn compact" type="button" onClick={confirmBiomeSelection}>
                  {settings.developerMode && selectedCave
                    ? t('biomeSelect.enterCave', { n: selectedCave })
                    : t(biomeSelectContext === 'menu' ? 'biomeSelect.start' : 'biomeSelect.enter')}
                </button>

                <button className="menu-secondary-btn compact" type="button" onClick={closeBiomeSelection}>
                  {t(biomeSelectContext === 'menu' ? 'common.close' : 'common.back')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettings && showMenu && (
          <div className="menu-settings-backdrop" onClick={() => setShowSettings(false)}>
            <div className="menu-settings-modal" data-tela="configuracoes" onClick={(event) => event.stopPropagation()}>
              <h2>{t('settings.title')}</h2>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.autoFullscreen}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, autoFullscreen: event.target.checked }))
                  }
                />
                <span>
                  <strong>{t('settings.fullscreen')}</strong>
                  {/* Esta descrição fica porque o caso é do navegador, não da
                      opção: no iPhone o botão simplesmente não funciona, e sem
                      dizer isso o jogador acha que a configuração quebrou. */}
                  {needsPwaHint && <small>{t('settings.fullscreenPwaHint')}</small>}
                </span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.persistProgress}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, persistProgress: event.target.checked }))
                  }
                />
                <span>
                  <strong>{t('settings.rememberRun')}</strong>
                </span>
              </label>

              {/*
                Sensibilidade e velocidade são duas barras, e não dois pares de
                botões. A barra é o formato que a pessoa já conhece de qualquer
                controle de vídeo: arrastar e ver o número mudar junto.

                Sem arraste com controle, uma barra vira campo de texto que ninguém
                sabe usar — e era esse o motivo dos botões. O que faltava era o
                caminho do controle até a barra, e ele existe: com a barra em foco, o
                d-pad para os lados muda o valor. Está em `ajustarBarraEmFoco`, no
                laço do controle.

                O valor da barra é o **índice** na lista, e não o número de pixels:
                um `range` contínuo deixaria o estado guardar valores que o menu não
                consegue mostrar de volta, e `step={1}` é o que garante que a barra
                e o d-pad andem pelo mesmo caminho.
              */}
              <div className="settings-stepper">
                <strong>{t('settings.pointerSensitivity')}</strong>

                <div className="settings-stepper-row">
                  <input
                    type="range"
                    className="settings-bar"
                    min={0}
                    max={SENSIBILIDADES.length - 1}
                    step={1}
                    value={indiceDaLista(settings.ponteiroSensibilidade, SENSIBILIDADES)}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        ponteiroSensibilidade:
                          SENSIBILIDADES[Number(event.target.value)] ?? SENSIBILIDADE_PADRAO
                      }))
                    }
                  />

                  <output className="settings-stepper-value">
                    {t('settings.pointerPercent', {
                      valor: porcentagemDaSensibilidade(settings.ponteiroSensibilidade)
                    })}
                  </output>
                </div>

                <strong>{t('settings.pointerSpeed')}</strong>

                <div className="settings-stepper-row">
                  <input
                    type="range"
                    className="settings-bar"
                    min={0}
                    max={VELOCIDADES.length - 1}
                    step={1}
                    value={indiceDaLista(settings.ponteiroVelocidade, VELOCIDADES)}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        ponteiroVelocidade:
                          VELOCIDADES[Number(event.target.value)] ?? VELOCIDADE_PADRAO
                      }))
                    }
                  />

                  <output className="settings-stepper-value">
                    {t('settings.pointerPercent', {
                      valor: porcentagemDaVelocidade(settings.ponteiroVelocidade)
                    })}
                  </output>
                </div>

                <div className="settings-stepper-legends">
                  <span>{t('settings.pointerLess')}</span>
                  <span>{t('settings.pointerMore')}</span>
                </div>
              </div>

              <label className="settings-toggle settings-toggle-dev">
                <input
                  type="checkbox"
                  checked={settings.developerMode}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, developerMode: event.target.checked }))
                  }
                />
                <span>
                  <strong>{t('settings.devMode')}</strong>
                </span>
              </label>

              {settings.developerMode && (
                <p className="settings-dev-note">
                  {t('settings.devNote', { unlocked: unlockedBiomes.length, total: BIOMES.length })}
                </p>
              )}

              {/* Estas três linhas saíram: "Entrada", "Orientação recomendada" e "Melhor cave
                  registrada".

                  As duas primeiras eram resposta a perguntas que o jogador já fez no
                  sistema — se pediu menos movimento no SO, se o aparelho está deitado.
                  Repetir a resposta na tela do jogo só ocupa espaço e dá a impressão
                  de que é uma opção, quando não é: não há interruptor ao lado.

                  A terceira é o estado do jogo dentro das configurações, e é a pior
                  das três: um número que muda sozinho, numa tela de preferências,
                  parece algo que a pessoa pode mexer. Ele já aparece no HUD e na
                  tela de jogos, onde ele é fato e não promessa. */}
              <div className="settings-actions">
                <button className="menu-primary-btn compact" type="button" onClick={() => setShowSettings(false)}>
                  {t('common.close')}
                </button>

                <button
                  className="ghost-btn settings-reset-btn"
                  type="button"
                  onClick={() => {
                    // O botão reinicia o jogo em andamento, não o perfil global.
                    // Com o destravamento por jogo, o que trava e destrava é o
                    // `bestCave` do slot ativo — zerar só o `profile` deixaria os
                    // biomas liberados e o botão não faria nada visível.
                    //
                    // O slot em si sobrevive, com o nome que a pessoa deu: o botão
                    // se chama "Reiniciar progresso", e apagar o jogo inteiro é a
                    // ação da tela de jogos, com a confirmação dela.
                    //
                    // A marca de teste sobrevive também, e é o que tem de sobreviver:
                    // reiniciar um save de teste com o estado inicial **normal**
                    // produziria um save que o modo desenvolvedor recusa a abrir, e
                    // a pessoa ficaria sem poder usá-lo até criar outro.
                    if (activeSaveId) {
                      const emTeste = stateRef.current.dev === true;
                      const reiniciado = montarEstadoCarregado(
                        {
                          ...(emTeste ? estadoInicialDev(1) : estadoInicial(1)),
                          bestCave: 1
                        },
                        t
                      );

                      gravarEstadoDoJogo(null, activeSaveId, reiniciado);
                      syncLocalState(reiniciado);
                      setSaves(listarJogos(null));
                    }

                    setProfile({ bestCave: 1 });
                    // O modo desenvolvedor sobrevive ao reset: o botão se
                    // chama "Reiniciar progresso", e desligar a ferramenta de
                    // teste no meio de uma sessão seria surpresa. O idioma
                    // sobrevive pelo mesmo motivo, e por um segundo: reiniciar
                    // o progresso é sobre a run, não sobre como a pessoa lê.
                    setSettings((current) => ({
                      ...DEFAULT_SETTINGS,
                      developerMode: current.developerMode,
                      language: current.language
                    }));
                  }}
                >
                  {t('common.resetProgress')}
                </button>
              </div>
            </div>
          </div>
        )}


        {showInfoModal && (
          <div className="menu-settings-backdrop" onClick={() => setShowInfoModal(false)}>
            <div className="menu-settings-modal info-modal" data-tela="informacoes" onClick={(event) => event.stopPropagation()}>
              <h2>{t('info.title')}</h2>

              <section className="menu-info-card">
                <div className="menu-info-head">
                  <h2>{t('info.biomesUnlocked')}</h2>
                  <span>
                    {settings.developerMode
                      ? t('info.devModeBestCave', { n: gameState.bestCave })
                      : t('biomeSelect.bestCave', { n: gameState.bestCave })}
                  </span>
                </div>

                <div className="menu-chip-row">
                  {unlockedBiomes.map((biome) => (
                    <span key={biome.id} className="menu-chip">
                      {t(biome.nameKey)}
                    </span>
                  ))}
                </div>

                <div className="menu-summary-grid">
                  <div>
                    <span>{t('info.currentBiome')}</span>
                    <strong>{t(activeBiome.nameKey)}</strong>
                  </div>
                  <div>
                    <span>{t('info.currentCave')}</span>
                    <strong>{activeProgress.label}</strong>
                  </div>
                </div>
              </section>

              <section className="menu-info-card">
                <div className="menu-info-head">
                  <h2>{t('info.objectives')}</h2>
                  <span>{currentObjectives.filter((item) => item.completed).length}/{currentObjectives.length}</span>
                </div>

                <div className="objective-list compact">
                  {currentObjectives.map((objective) => (
                    <div key={objective.id} className={`objective-card ${objective.completed ? 'completed' : ''}`}>
                      <div className="objective-card-head">
                        <strong>{t(objective.labelKey)}</strong>
                        <span>
                          {Math.min(objective.value, objective.target)}/{objective.target}
                        </span>
                      </div>
                      <p>{t(objective.descriptionKey)}</p>
                      <div className="objective-progress-bar">
                        <span style={{ width: `${objective.progress * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="menu-info-card">
                <div className="menu-info-head">
                  <h2>{t('info.relics')}</h2>
                  <span>{t('info.totalRelics', { n: totalRelics })}</span>
                </div>

                <div className="relic-grid compact">
                  {relicEntries.map((relic) => (
                    <div key={relic.id} className={`relic-card ${(gameState.collection?.[relic.id] ?? 0) > 0 ? 'owned' : ''}`}>
                      <span className="relic-icon">{relic.icon}</span>
                      <strong>{t(relic.nameKey)}</strong>
                      <small>{t(relic.descriptionKey)}</small>
                      <span className="relic-count">x{gameState.collection?.[relic.id] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Fica preso no fim do scroll: este modal rola ~1000px e o
                  botão_someava abaixo da dobra. */}
              <div className="modal-actions">
                <button className="menu-primary-btn compact" type="button" onClick={() => setShowInfoModal(false)}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saiu a tarja "gire o celular", que ficava no rodapé durante a partida.

            Ela aparecia justamente no aparelho que já estava deitado — porque a trava
            de paisagem só some com `innerWidth > innerHeight` — e mandava girar um
            celular que já estava girado. É a mesma coisa que a linha "Orientação
            recomendada" das configurações, que também saiu: repetir dentro do jogo uma
            instrução que o aparelho já cumpriu só ocupa o rodapé e treme a cada
            entrada de texto.

            A trava de paisagem continua, e é outra coisa: é a que impede jogar em
            retrato, onde o mapa isométrico não cabe. Esta aqui era só um aviso. */}
        {showRotateGate && (
          <div className="rotate-lock-overlay">
            <div className="rotate-lock-card">
              <div className="rotate-lock-icon" aria-hidden="true">
                📱
              </div>
              <h2>{t('rotate.title')}</h2>
              <p>{t(entryPhase === ENTRY_PHASE.PLAYING ? 'rotate.playing' : 'rotate.menu')}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
