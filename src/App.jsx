import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGame } from './game/createGame.js';
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
  createCollectionState,
  createImprovementState,
  createStatsState,
  createUtilityInventory,
  ehCaveFinal,
  getBiomeForCave,
  getBiomeProgress,
  getBiomeStartCave,
  getObjectiveProgressList,
  TOTAL_CAVES as TOTAL_CAVES_DO_JOGO,
  getTotalRelics,
  getUnlockedBiomes
} from './game/progression.js';
import {
  apagarJogo,
  criarJogo,
  estadoInicial,
  gravarEstadoDoJogo,
  lerJogo,
  listarJogos,
  marcarUltimoJogado,
  migrarPerfilAntigo,
  normalizarNome,
  renomearJogo
} from './game/saves.js';
import { criarLeitorDeControle } from './game/gamepad.js';
import { criarNavegadorDeFoco } from './game/foco.js';
import { fechaTelaDoTopo, telaDoTopo } from './game/telas.js';
import { buildRewardCatalog, getRewardVisual, pickRewardOptions, shuffle } from './game/rewards.js';
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
  PLAYING: 'playing'
};

const BLACK_SCREEN_MS = 900;
const LOGO_FADE_MS = 2200;
const GAME_VERSION = '0.2.0';

/**
 * Quanto tempo a carta do final leva para subir.
 *
 * A carta tem cerca de 180 palavras, e isso é a métrica que importa: 100 segundos
 * dá uns 110 palavras por minuto, que é abaixo do ritmo de leitura confortável.
 * Mais rápido que isso e a pessoa precisa voltar a linha; muito mais lento e vira
 * uma espera sem informação.
 *
 * O valor está em JavaScript, e não só no CSS, porque é dele que sai o "acabou"
 * que devolve a pessoa ao menu. Se a duração vivesse só na folha de estilo, o
 * React nunca ficaria sabendo que a animação acabou.
 */
const FINAL_DURACAO_MS = 100000;

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
  developerMode: false
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
  const stateRef = useRef(initialState);
  const entryTimeoutRef = useRef([]);
  const hudRef = useRef(null);

  const [gameState, setGameState] = useState(initialState);
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [rewardOptions, setRewardOptions] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState(null);
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
  const [rewardRefreshCost, setRewardRefreshCost] = useState(10);
  const [entryPhase, setEntryPhase] = useState(ENTRY_PHASE.MENU);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showBiomeSelect, setShowBiomeSelect] = useState(false);
  const [biomeSelectContext, setBiomeSelectContext] = useState('menu');
  const [selectedBiomeId, setSelectedBiomeId] = useState(firstBiome.id);
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
   * Esc fecha o que estiver aberto, da camada mais alta para a mais baixa, e
   * na falta de qualquer modal abre a pausa.
   *
   * Em tela cheia o Esc pertence ao navegador, então é ignorado aqui — do
   * contrário o modal fecharia junto com a tela cheia. Quem entra em tela cheia
   * e aperta Esc antes continua sem pausa; o botão na tela faz esse papel.
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || isFullscreenActive()) return;

      if (fechaTelaDoTopo(telasAbertas, fecharTelaPeloNome)) return;

      if (pauseAvailable) setShowPause(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [telasAbertas, pauseAvailable]);

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
   */
  useEffect(() => {
    if (!settings.persistProgress) return;

    setProfile((current) =>
      Math.max(current.bestCave ?? 1, gameState.bestCave ?? 1) === (current.bestCave ?? 1)
        ? current
        : { ...current, bestCave: Math.max(current.bestCave ?? 1, gameState.bestCave ?? 1) }
    );
  }, [settings.persistProgress, gameState.bestCave]);

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

      setGameState(mergedState);
      setSelectedUtility(null);
      setSelectedRewardId(null);
      setShowUtilityShopModal(false);
      setShowExitDecision(false);
      setRewardRefreshCost(10);
      setRewardOptions(pickRewardOptions(mergedState, t, 4));
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
  const startEntrySequence = () => {
    if (showRotateLock) return;

    requestGameplayFullscreen();
    tryLockLandscape();

    entryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    entryTimeoutRef.current = [];

    setShowSettings(false);
    setShowInfoModal(false);

    if (introJaVista()) {
      setEntryPhase(ENTRY_PHASE.PLAYING);
      return;
    }

    marcarIntroVista();
    setEntryPhase(ENTRY_PHASE.BLACK);

    const logoTimeout = window.setTimeout(() => {
      setEntryPhase(ENTRY_PHASE.LOGO);
    }, BLACK_SCREEN_MS);

    const playTimeout = window.setTimeout(() => {
      setEntryPhase(ENTRY_PHASE.PLAYING);
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
      // As melhorias sobrevivem a morte, e o que elas produzem tambem. Sem esta
      // linha o `...initialState` acima trazia `maxHp: 2` e `pickaxePower: 1`,
      // e a pessoa voltava com o cartao dizendo Vitalidade 01 e duas de vida na
      // HUD. `aplicarEfeitosDasMelhorias` traz os niveis e recalcula o que eles
      // produzem.
      ...aplicarEfeitosDasMelhorias(baseState),
      bestCave: baseState.bestCave ?? 1,
      lastRelicFound: baseState.lastRelicFound ?? null,
      lastMessage: message
    });
  };

  const finalizeCaveEntry = (nextState, { playIntro = false } = {}) => {
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

    setEntryPhase(ENTRY_PHASE.PLAYING);
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
   */
  const criarEEntrar = () => {
    const herdado = stateRef.current;
    const id = criarJogo(null, saveNameDraft, {
      cave: 1,
      estado: { ...estadoInicial(1), bestCave: herdado.bestCave ?? 1 }
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

  const confirmBiomeSelection = () => {
    const selectedBiome = BIOMES.find((biome) => biome.id === selectedBiomeId) ?? firstBiome;

    if (biomeSelectContext === 'menu') {
      const nextState = buildBiomeStartState(
        selectedBiome.startCave,
        t('msg.enterCave', {
          cave: getBiomeProgress(selectedBiome.startCave).label,
          biome: t(selectedBiome.nameKey)
        })
      );

      closeBiomeSelection();
      finalizeCaveEntry(nextState, { playIntro: true });
      return;
    }

    const nextState = pendingBiomeState ?? buildBiomeStartState(selectedBiome.startCave);

    closeBiomeSelection();
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);
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
      const candidate = shuffle(catalog).slice(0, 3);
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
  const abrirFinale = () => {
    const prefereMenosMovimento =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setShowExitDecision(false);
    setShowPause(false);
    setShowFinale(true);

    if (finaleTimerRef.current !== null) window.clearTimeout(finaleTimerRef.current);

    finaleTimerRef.current = prefereMenosMovimento
      ? null
      : window.setTimeout(fecharFinale, FINAL_DURACAO_MS + 1200);
  };

  /** A animação acabou de subir. O `+1200` do relógio cobre esse mesmo atraso. */
  const concluirFinale = (evento) => {
    if (evento?.animationName !== 'finale-subir') return;

    fecharFinale();
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
  const controleRef = useRef({ telas: null, fechar: null, podePausar: false });

  controleRef.current = { telas: telasAbertas, fechar: fecharTelaPeloNome, podePausar: pauseAvailable };

  useEffect(() => {
    const leitor = criarLeitorDeControle();
    const nav = criarNavegadorDeFoco({
      raiz: document.body,
      elementoAtivo: () => document.activeElement
    });

    let animacao = null;
    let conectadoAntes = null;

    const quadro = () => {
      const estado = leitor.ler();
      const atual = controleRef.current;
      const nomeDaTela = telaDoTopo(atual.telas);
      const shell = shellRef.current;

      if (estado.conectado !== conectadoAntes) {
        conectadoAntes = estado.conectado;
        setControleConectado(estado.conectado);
        setControleNome(estado.conectado ? leitor.nomeDoControle() : null);
      }

      let foiParaOMenu = false;

      if (nomeDaTela) {
        foiParaOMenu = true;

        if (estado.bordas.pausa && nomeDaTela === 'pausa') {
          atual.fechar('pausa');
        } else if (estado.bordas.voltar) {
          atual.fechar(nomeDaTela);
        } else if (estado.direcoes.dominante) {
          nav.moverComRepeticao(estado.direcoes.dominante);
        } else if (estado.bordas.confirmar) {
          nav.ativar();
        }
      } else if (estado.bordas.pausa || (estado.bordas.voltar && atual.podePausar)) {
        // Sem tela aberta, `voltar` também abre a pausa: é o que o `Esc` faz, e
        // os dois precisam concordar.
        foiParaOMenu = true;
        setShowPause(true);
      }

      // O anel de foco. `:focus-visible` sozinho não serviria, porque o navegador
      // só o mostra em foco programático quando a última interação foi de
      // teclado — e aqui ela foi de controle, que ele não conhece.
      if (shell) {
        if (foiParaOMenu && estado.conectado) shell.setAttribute('data-controle', '1');
        else shell.removeAttribute('data-controle');
      }

      window.dispatchEvent(
        new CustomEvent('cob-controle', { detail: { estado, telaAberta: nomeDaTela } })
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

    const nextState = normalizeProgressState({
      ...progressedState,
      screen: 'cave',
      cave: targetCave,
      biomeId: nextBiome.id,
      biomeName: nextBiome.name,
      hp: progressedState.maxHp,
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
    finalizeCaveEntry(nextState);
  };

  const buildResetState = (targetCave = null, customMessage = null) => {
    const baseState = stateRef.current;
    const biomeStartCave = targetCave ?? getBiomeStartCave(baseState.cave ?? 1);
    const biome = getBiomeForCave(biomeStartCave);
    const message = customMessage ?? t('msg.defeat');

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
      // As melhorias sobrevivem a morte, e o que elas produzem tambem. Trocar de
      // biomac e morrer reconstroem o estado do mesmo jeito, entao as duas
      // precisam do mesmo cuidado: sem recalcular, o nivel voltava e a vida nao.
      ...aplicarEfeitosDasMelhorias(baseState),
      // bestCave só avança quando a cave é concluída. A versão anterior
      // fazia Math.max(bestCave, cave) também ao morrer, o que destravava
      // o próximo bioma sem nunca ter concluído nenhuma cave dele.
      bestCave: baseState.bestCave ?? 1,
      lastRelicFound: baseState.lastRelicFound ?? null,
      lastMessage: message
    });
  };

  const retryRun = () => {
    const nextState = buildResetState();

    setSelectedUtility(null);
    setSelectedRewardId(null);
    setShowUtilityShopModal(false);
    setShowExitDecision(false);
    setRewardRefreshCost(10);
    setRewardOptions([]);

    if (maybeOpenBiomeSelection(nextState, 'transition')) {
      return;
    }

    finalizeCaveEntry(nextState);
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
  const isDeathLobby = gameState.lobbyReason === 'death';
  const resolvedOutcomeCave = gameState.outcomeCave ?? gameState.cave;
  const nextCaveNumber = gameState.nextCaveAvailable ?? gameState.cave + 1;
  const noRewardsLeft = rewardOptions.length === 0;

  const showMenu = entryPhase === ENTRY_PHASE.MENU && !showRotateLock;
  const showRotateGate = showRotateLock;
  const isCoarsePointer = isCoarsePointerDevice();

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

                <div className="hud-pill" title={t('hud.titleRelics')}>
                  <span>{t('hud.relics')}</span>
                  <strong>{totalRelics}</strong>
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
          <div className="exit-decision-overlay">
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

        {showGameHud && fullscreenAvailable && (
          <button
            type="button"
            className={`fullscreen-toggle ${isFullscreen ? 'active' : ''}`}
            onClick={handleToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={t(isFullscreen ? 'fullscreen.exit' : 'fullscreen.enter')}
            title={t(isFullscreen ? 'fullscreen.exitWithKey' : 'fullscreen.enter')}
          >
            <span aria-hidden="true">{isFullscreen ? '⤢' : '⤡'}</span>
          </button>
        )}

        {showLobby && (
          <div className="lobby-overlay">
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
                        <p>{t('lobby.chooseUpgradeSub')}</p>
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
                              <strong>{reward.name}</strong>
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

                  <button className="ghost-btn utility-lobby-btn" type="button" onClick={backToMainMenu}>
                    {t('lobby.mainMenu')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showLobby && showUtilityShopModal && !isDeathLobby && (
          <div className="utility-shop-modal-overlay" onClick={() => setShowUtilityShopModal(false)}>
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
                          {canBuy
                            ? t('shop.buy', { n: utility.cost })
                            : t('shop.missing', { n: utility.cost - gameState.coins })}
                        </button>

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
            </div>
          </div>
        )}

        {pauseOpen && (
          <div className="pause-overlay" role="dialog" aria-modal="true" aria-label={t('pause.aria')}>
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
          <div className="entry-overlay menu-overlay">
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
            <div className="menu-settings-modal language-modal" ref={languageModalRef} onClick={(event) => event.stopPropagation()}>
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

        {showSaves && (
          <div className="menu-settings-backdrop saves-backdrop" onClick={fecharListaDeJogos}>
            <div
              className="menu-settings-modal saves-modal"
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

                    return (
                      <article
                        key={jogo.id}
                        className={`saves-card${jogo.id === activeSaveId ? ' is-current' : ''}`}
                      >
                        <header className="saves-card-head">
                          <h3 className="saves-card-name">{jogo.name}</h3>

                          {jogo.id === activeSaveId && (
                            <span className="saves-badge">{t('saves.current')}</span>
                          )}
                        </header>

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
                            >
                              {t('saves.play')}
                            </button>

                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => trocarBiomaDoJogo(jogo.id)}
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

        {showFinale && (
          <div
            className="finale-overlay"
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
                style={{ '--finale-duracao': `${FINAL_DURACAO_MS}ms` }}
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
            <div className="menu-settings-modal biome-select-modal" onClick={(event) => event.stopPropagation()}>
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
                      onClick={() => selectable && setSelectedBiomeId(biome.id)}
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

              <div className="biome-select-actions">
                <button className="menu-primary-btn compact" type="button" onClick={confirmBiomeSelection}>
                  {t(biomeSelectContext === 'menu' ? 'biomeSelect.start' : 'biomeSelect.enter')}
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
            <div className="menu-settings-modal" onClick={(event) => event.stopPropagation()}>
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

              {/* A linha ficou, e agora ela informa. Antes era o par do
                  interruptor que estava acima dela; sem o interruptor, "Entrada:
                  Reduzida" passaria a ser um fato que o jogador não pode
                  mudar. Com `prefers-reduced-motion` atrás dela, é a resposta a
                  uma pergunta que o jogador fez no sistema e que o jogo
                  respeitou. */}
              <div className="settings-line">
                <span>{t('settings.input')}</span>
                <strong>{t(prefersReducedMotion() ? 'settings.inputReduced' : 'settings.inputAnimated')}</strong>
              </div>
              <div className="settings-line">
                <span>{t('settings.orientation')}</span>
                <strong>
                  {t(isCoarsePointer ? 'settings.orientationLandscape' : 'settings.orientationLandscapeDesktop')}
                </strong>
              </div>

              <div className="settings-line">
                <span>{t('settings.bestCaveRecorded')}</span>
                <strong>
                  {gameState.bestCave ?? 1} · {bestCaveProgress.label}
                </strong>
              </div>

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
                    if (activeSaveId) {
                      const reiniciado = montarEstadoCarregado(
                        { ...estadoInicial(1), bestCave: 1 },
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
            <div className="menu-settings-modal info-modal" onClick={(event) => event.stopPropagation()}>
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

        {entryPhase === ENTRY_PHASE.PLAYING && isCoarsePointer && !showRotateLock && (
          <div className="rotate-device-hint">{t('rotate.hint')}</div>
        )}

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
