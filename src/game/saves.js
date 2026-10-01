/**
 * Jogos salvos, um por slot, como no Minecraft.
 *
 * ## O que é um "jogo" aqui
 *
 * Um slot guarda a run inteira de uma pessoa: em que caverna está, moedas, bombas,
 * picareta, relíquias, coleção e estatísticas. Criar um segundo slot não apaga o
 * primeiro, e o jogador entra, escolhe qual quer continuar e joga.
 *
 * ## O que NÃO é salvo, e por quê
 *
 * Some do save o que é estado de tela, não progresso: `screen`, `inLobby`,
 * `lobbyReason`, `nextCaveAvailable`, `outcomeCave` e `lastMessage`. Ao abrir um
 * jogo, esses voltam ao padrão — a pessoa entra na caverna, não numa tela de
 * vitória que ficou aberta.
 *
 * `PERSISTENTE` é a lista que define isso, e ela é a fonte de verdade: o que não
 * está na lista não é gravado, e o que está na lista é gravado por inteiro. Uma
 * lista de campos para *não* salvar seria o contrario — bastaria o jogo ganhar um
 * campo novo e ele iria para o disco sem ninguém decidir.
 *
 * ## Por que o storage entra como argumento
 *
 * Porque assim a lógica roda no teste de verdade, com um storage falso, e o que o
 * teste afirma é o que acontece. E porque o destino não é o mesmo: no navegador
 * é `window.localStorage`, e quando o jogo estiver na Steam e no Android, cada
 * loja resolve a nuvem pela sua conta — fora daqui.
 *
 * ## O destravamento é por jogo
 *
 * Cada slot carrega o seu `bestCave`, e a trava lê o `gameState` do slot ativo. Um
 * jogo novo começa na Mina Solar, mesmo que outro slot já tenha chegado ao gelo.
 */
import {
  IMPROVEMENT_FIELDS,
  MELHORIAS_DE_PICARETA,
  PICARETA_MAXIMA,
  POCOES_CAMINHO_SEGURO_NO_DEV,
  createCollectionState,
  createImprovementState,
  createStatsState,
  createUtilityInventory,
  getBiomeForCave,
  getTotalRelics
} from './progression.js';

const SAVES_KEY = 'coinsorbombs:saves:v1';
const PROFILE_KEY = 'coinsorbombs:profile:v1';

const FORMAT_VERSION = 1;

/** Campos gravados no slot. Tudo que é estado de tela fica de fora. */
export const PERSISTENTE = [
  'cave',
  'hp',
  'maxHp',
  'coins',
  'bombs',
  'bombsRemaining',
  'pickaxeLevel',
  'pickaxePower',
  'biomeId',
  'biomeName',
  'bestCave',
  'collection',
  'stats',
  'lastRelicFound',
  'utilities',
  // A marca de jogo de teste vai para o disco junto, e não como metadado à parte,
  // por um motivo prático: é o **estado** que viaja para a cena do Phaser, e a cena
  // precisa saber que está num save de teste para não contar relíquia nem avançar
  // `bestCave`. Uma flag que mora só no registro do save exigiria mandá-la à mão
  // em cada evento, e um dia alguém esqueceria um.
  'dev',
  // As melhorias entram aqui porque elas são permanentes. Antes elas viviam só na
  // memória do `App.jsx`: o jogador escolhia "Vitalidade 2", fechava a aba, e a
  // melhoria não estava em lugar nenhum. Não basta um save de uma linha que não
  // guarda o que a pessoa conquistou.
  ...
    IMPROVEMENT_FIELDS
];

/** Limite do nome. Curto o bastante para caber na lista, longo o bastante para nomear. */
const NOME_MAX = 28;

/**
 * O instante de agora, que pode ser injetado.
 *
 * A lista de jogos é ordenada por "jogado por último", e isso vem de
 * `Date.now()`. Com o relógio real, dois jogos criados no mesmo milissegundo ficam
 * empatados, e o desempate cai no id — que é aleatório. O teste não consegue
 * afirmar nada sobre a ordem, e a lista em si pode trocar de ordem entre aberturas.
 *
 * Injetar o relógio resolve as duas coisas: o teste controla o tempo, e a ordem
 * passa a ser determinística mesmo com empates.
 */
function instanteDe(opcoes) {
  return typeof opcoes?.agora === 'function' ? opcoes.agora() : Date.now();
}

/** O storage de quem chamar. `null` sem browser, ou com o storage bloqueado. */
function storageDe(armazenamento) {
  if (armazenamento) return armazenamento;
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function lerCru(storage, chave) {
  if (!storage) return null;

  try {
    return storage.getItem(chave);
  } catch {
    return null;
  }
}

function escreverCru(storage, chave, valor) {
  if (!storage) return false;

  try {
    storage.setItem(chave, valor);
    return true;
  } catch {
    return false;
  }
}

/**
 * Identificador de slot.
 *
 * `randomUUID` quando existe, e uma combinação de hora e aleatório quando não — em
 * browser antigo e em Node. A alternativa seria um contador, e contador
 * reinicia quando a pessoa limpa o storage, o que reabastece a mesma chave com o
 * mesmo nome.
 */
function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Normaliza um nome digitado pela pessoa.
 *
 * Recorta espaços, limita o tamanho e, se sobrar nada, dá um nome padrão. Um nome
 * vazio é o caso mais comum e o mais fácil de não tratar: apareceria um card sem
 * nome na lista, e o jogador não saberia qual é o dele.
 */
export function normalizarNome(nome, indice = 0) {
  const limpo = String(nome ?? '').trim().replace(/\s+/g, ' ').slice(0, NOME_MAX);
  return limpo || `Jogo ${indice + 1}`;
}

/** O estado de tela zerado — o que um slot ganha ao ser criado. */
export function estadoInicial(cave = 1) {
  const biome = getBiomeForCave(cave);

  return {
    cave,
    hp: 2,
    maxHp: 2,
    coins: 0,
    bombs: 0,
    bombsRemaining: 0,
    pickaxeLevel: 1,
    pickaxePower: 1,
    biomeId: biome.id,
    biomeName: biome.name,
    bestCave: cave,
    collection: createCollectionState(),
    stats: createStatsState(),
    lastRelicFound: null,
    utilities: createUtilityInventory(),
    ...createImprovementState(),
    // Todo jogo começa marcado como jogo de verdade. Um save antigo, de antes do
    // modo desenvolvedor, recebe `false` — e é exatamente isso que impede que ele
    // abra com o modo ligado e leve um bestCave de teste para o jogo de verdade.
    dev: false
  };
}

/**
 * O estado inicial do modo desenvolvedor.
 *
 * Duas diferenças em relação a um jogo normal, e só duas:
 *
 * - **5 poções de Caminho Seguro**, para limpar a caverna sem medo de bomba. É o
 *   que torna o modo utilizável para testar o chão, que é o que se quer testar.
 * - **Picareta no máximo**, e não "picareta forte". O nível de melhoria vai junto,
 *   senão o HUD mostraria uma picareta no 5 que o catálogo ainda ofereceu como
 *   melhoria — e a primeira carta sorteada seria "Picareta 05", que é carta morta
 *   por definição.
 *
 * O que **não** muda: as relíquias, o `bestCave` e as estatísticas começam zerados
 * como sempre. O modo desenvolvedor não dá uma cabeça de progresso, e é justamente
 * por não dar que um save dele não pode ser aberto no jogo normal.
 */
export function estadoInicialDev(cave = 1) {
  const base = estadoInicial(cave);

  return {
    ...base,
    pickaxeLevel: PICARETA_MAXIMA,
    pickaxePower: PICARETA_MAXIMA,
    pickaxeUpgradeLevel: MELHORIAS_DE_PICARETA,
    utilities: {
      ...base.utilities,
      safePath: POCOES_CAMINHO_SEGURO_NO_DEV
    },
    dev: true
  };
}

/** Recorta o estado para o que vai para o disco. */
export function partePersistente(estado) {
  const salvo = {};

  for (const campo of PERSISTENTE) {
    if (estado && estado[campo] !== undefined) salvo[campo] = estado[campo];
  }

  return salvo;
}

/** Recoloca um estado salvo em forma, completando o que faltar. */
export function hidratarEstado(bruto, caveInicial = 1) {
  const base = estadoInicial(caveInicial ?? bruto?.cave ?? 1);
  const cave = Number.isFinite(bruto?.cave) ? bruto.cave : base.cave;

  return {
    ...base,
    ...bruto,
    cave,
    // Uma collection, stats ou utilities pela metade quebraria a tela: o jogo
    // lê as chaves direto, e uma relíquia faltando vira `undefined` no HUD.
    collection: { ...createCollectionState(), ...(bruto?.collection ?? {}) },
    stats: { ...createStatsState(), ...(bruto?.stats ?? {}) },
    utilities: { ...createUtilityInventory(), ...(bruto?.utilities ?? {}) },
    biomeId: bruto?.biomeId ?? getBiomeForCave(cave).id,
    biomeName: bruto?.biomeName ?? getBiomeForCave(cave).name,
    // Só `true` marca um save de teste. Um save antigo não tem a chave, e
    // `undefined` não pode virar "deixa passar": o ponto do bloqueio é proteger o
    // jogo de verdade, e a dúvida tem que resolver para o lado seguro.
    dev: bruto?.dev === true
  };
}

/**
 * Este save pode ser aberto com o modo desenvolvedor neste estado?
 *
 * O modo desenvolvedor é um risco para o progresso, e o risco é nos dois sentidos:
 *
 * - **Com o modo ligado, um jogo normal não abre.** O jogador testaria a cave 27
 *   nele, o `bestCave` iria para 60, as 6 relíquias seriam contadas, e o jogo
 *   "real" deixaria de valer alguma coisa. O pedido foi esse bloqueio, e é o que
 *   importa.
 * - **Com o modo desligado, um save de teste não abre.** Não foi pedido, mas é a
 *   mesma contaminação pelo outro lado: um save de teste tem 5 poções e picareta
 *   no máximo, e o que ele escrevesse em `bestCave` e nas relíquias contaminaria o
 *   registro do jogo de verdade. Permitir seria trocar um problema conhecido por
 *   outro, e o nome da regra passaria a mentir.
 *
 * Por isso a regra é de **igualdade**, e não de "não bloquear o normal". Modo
 * ligado só abre save de teste; modo desligado só abre save normal.
 */
export function saveCompativelComOModo(estado, developerMode = false) {
  // Estado ausente não abre nada. `Boolean(undefined?.dev)` dá `false`, e `false`
  // casa com o modo desligado — então um `null` seria lido como "jogo normal" e
  // passaria. Numa função cuja raison d'être é não deixar a dúvida resolver para o
  // lado errado, "não sei" tem de ser "não".
  if (!estado || typeof estado !== "object") return false;

  // Sem a variável no meio, isto seria `a === true === b`, que só funciona porque
  // `===` associa para a esquerda. Funciona, e é ilegível.
  const eDeTeste = estado.dev === true;

  return eDeTeste === Boolean(developerMode);
}

/**
 * Lê todos os jogos.
 *
 * Tolera o que vier: storage vazio, JSON quebrado, formato de outra versão. Um
 * save que não dá para ler **não pode apagar o que dá** — então um erro de
 * leitura devolve a estrutura vazia e deixa o dado no storage intacto, para a
 * próxima vez que abrir.
 */
export function lerJogos(armazenamento) {
  const storage = storageDe(armazenamento);
  const cru = lerCru(storage, SAVES_KEY);

  if (!cru) return { version: FORMAT_VERSION, seq: 0, lastPlayed: null, saves: {} };

  let dados;
  try {
    dados = JSON.parse(cru);
  } catch {
    return { version: FORMAT_VERSION, lastPlayed: null, saves: {} };
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return { version: FORMAT_VERSION, seq: 0, lastPlayed: null, saves: {} };
  }

  const saves = {};
  const brutos = dados.saves && typeof dados.saves === 'object' ? dados.saves : {};

  for (const [id, save] of Object.entries(brutos)) {
    if (!save || typeof save !== 'object') continue;
    saves[id] = { ...save, id };
  }

  return {
    version: FORMAT_VERSION,
    seq: Number.isFinite(dados.seq) ? dados.seq : 0,
    lastPlayed: dados.lastPlayed && saves[dados.lastPlayed] ? dados.lastPlayed : null,
    saves
  };
}

export function gravarJogos(armazenamento, dados) {
  const storage = storageDe(armazenamento);
  const payload = {
    version: FORMAT_VERSION,
    seq: Number.isFinite(dados?.seq) ? dados.seq : 0,
    lastPlayed: dados?.lastPlayed ?? null,
    saves: dados?.saves ?? {}
  };

  return escreverCru(storage, SAVES_KEY, JSON.stringify(payload));
}

/** Cria um jogo e devolve o id. O nome entra normalizado. */
export function criarJogo(armazenamento, nome, opcoes = {}) {
  const { cave = 1, estado = null } = opcoes;
  const dados = lerJogos(armazenamento);
  const id = novoId();
  const agora = instanteDe(opcoes);

  const novo = {
    id,
    name: normalizarNome(nome, Object.keys(dados.saves).length),
    createdAt: agora,
    updatedAt: agora,
    playedAt: agora,
    // O `bestCave` de um estado reaproveitado pode ser maior que a cave, e é
    // ele que destrava os biomas. Perder isso ao criar um jogo tiraria a
    // progressão de quem recomeça de propósito.
    state: partePersistente(hidratarEstado(estado, cave))
  };

  marcarEscrito(dados, novo);
  dados.saves[id] = novo;
  dados.lastPlayed = id;
  gravarJogos(armazenamento, dados);

  return id;
}

/** O estado persistido de um jogo, ou `null`. */
export function lerJogo(armazenamento, id) {
  const save = lerJogos(armazenamento).saves[id];
  if (!save) return null;
  return hidratarEstado(save.state);
}

/** Grava o estado de um jogo. Devolve `false` se o id não existir. */
export function gravarEstadoDoJogo(armazenamento, id, estado, opcoes = {}) {
  const dados = lerJogos(armazenamento);
  const save = dados.saves[id];
  if (!save) return false;

  const agora = instanteDe(opcoes);
  save.state = partePersistente(estado);
  save.updatedAt = agora;
  save.playedAt = agora;
  marcarEscrito(dados, save);
  dados.lastPlayed = id;

  return gravarJogos(armazenamento, dados);
}

export function renomearJogo(armazenamento, id, nome, opcoes = {}) {
  const dados = lerJogos(armazenamento);
  const save = dados.saves[id];
  if (!save) return false;

  save.name = normalizarNome(nome, 0);
  save.updatedAt = instanteDe(opcoes);
  marcarEscrito(dados, save);

  return gravarJogos(armazenamento, dados);
}

export function apagarJogo(armazenamento, id) {
  const dados = lerJogos(armazenamento);
  if (!dados.saves[id]) return false;

  delete dados.saves[id];
  if (dados.lastPlayed === id) {
    const restantes = Object.values(dados.saves).sort(compararPorRecencia);
    dados.lastPlayed = restantes[0]?.id ?? null;
  }

  return gravarJogos(armazenamento, dados);
}

/** Marca um jogo como o último jogado, sem gravar estado. */
export function marcarUltimoJogado(armazenamento, id, opcoes = {}) {
  const dados = lerJogos(armazenamento);
  if (!dados.saves[id]) return false;

  dados.lastPlayed = id;
  dados.saves[id].playedAt = instanteDe(opcoes);
  marcarEscrito(dados, dados.saves[id]);

  return gravarJogos(armazenamento, dados);
}

/**
 * Quantas relíquias o jogo tem. É o que a lista de jogos mostra.
 *
 * A conta é a mesma do HUD, e por isso vem de `getTotalRelics`: a soma das
 * quantidades, e não a contagem de tipos diferentes. As duas respostas são
 * plausíveis para "quantas relíquias", e o jogo já respondeu uma delas na tela —
 * se a lista respondesse a outra, o mesmo número diria duas coisas na mesma
 * sessão.
 */
function contarReliquias(estado) {
  return getTotalRelics(hidratarEstado(estado).collection);
}

/**
 * O que a lista de jogos mostra de cada um.
 *
 * Calculado aqui e não na tela, para a tela não saber o formato do save: se o
 * save mudar, a lista continua funcionando e o teste dela também.
 */
export function resumoDoJogo(save) {
  const estado = hidratarEstado(save?.state);
  const progresso = getBiomeForCave(estado.bestCave);

  return {
    id: save.id,
    name: save.name,
    cave: estado.cave,
    bestCave: estado.bestCave,
    // A tela de jogos precisa disto para bloquear a entrada errada e para dizer
    // POR QUE está bloqueado, em vez de só sumir com o botão.
    dev: estado.dev === true,
    biomeId: estado.biomeId,
    biomeName: estado.biomeName,
    coins: estado.coins ?? 0,
    bombs: estado.bombs ?? 0,
    relics: contarReliquias(estado),
    playedAt: save.playedAt ?? save.updatedAt ?? save.createdAt ?? 0,
    createdAt: save.createdAt ?? 0,
    // A ordem real das escritas. Não empata nunca, e não depende do relógio.
    seq: save.seq ?? 0,
    isLastPlayed: false
  };
}


/**
 * Avanca o contador de escrita e carimba o save.
 *
 * O `Date.now()` não serve para ordenar: a pessoa cria quatro jogos e clica neles
 * em sequência, e o relógio pode não andar entre os cliques. Com o empate, a
 * ordem da lista passaria a depender do id, que é aleatório, e o botão "continuar"
 * poderia apontar para um cartão que não é o primeiro da lista.
 *
 * O contador é monotonico e nunca empata: é a ordem real das escritas, e não depende
 * de o relógio ter andado.
 */
function marcarEscrito(dados, save) {
  dados.seq = (Number.isFinite(dados.seq) ? dados.seq : 0) + 1;
  save.seq = dados.seq;
  return save;
}

/**
 * Ordena dois jogos do mais recente para o mais antigo.
 *
 * É um **total**, e os dois desempates não são enfeite: sem eles, dois jogos
 * jogados no mesmo milissegundo ficam em ordem arbitrária. Aí a lista muda de
 * ordem entre uma abertura e outra sem que nada tenha sido alterado, e a pessoa
 * vê os cards trocando de lugar sozinhos.
 *
 * O desempate final é o id, que é único — então a comparação nunca devolve zero
 * para dois jogos diferentes, e a ordem é sempre a mesma.
 */
export function compararPorRecencia(a, b) {
  // O contador vem primeiro: ele é a ordem das escritas, e é total. O resto é para
  // savês antigos, gravados antes do contador existir.
  const escrito = (b?.seq ?? 0) - (a?.seq ?? 0);
  if (escrito !== 0) return escrito;

  const jogado = (b?.playedAt ?? 0) - (a?.playedAt ?? 0);
  if (jogado !== 0) return jogado;

  const criado = (b?.createdAt ?? 0) - (a?.createdAt ?? 0);
  if (criado !== 0) return criado;

  return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
}

/**
 * Todos os jogos, o mais recente primeiro, e marca qual é o último jogado.
 *
 * Ver `compararPorRecencia` para por que a ordem tem desempate.
 */
export function listarJogos(armazenamento) {
  const dados = lerJogos(armazenamento);

  return Object.values(dados.saves)
    .map(resumoDoJogo)
    .map((resumo) => ({ ...resumo, isLastPlayed: resumo.id === dados.lastPlayed }))
    .sort(compararPorRecencia);
}

/**
 * Cria o primeiro jogo a partir do progresso antigo, para ninguém perder o que já
 * tinha.
 *
 * Antes dos slots, o jogo guardava um `profile` com o `bestCave` — a mais longe
 * que a pessoa chegou. Quem chega a esta versão tem isso gravado, e sem esta
 * migração a caverna 23 voltaria a ser a 1.
 *
 * Roda uma vez: depois que existe algum jogo, ela não age mais. E não apaga o
 * `profile` antigo — ele é a fonte, e apagá-lo antes de a migração ter sucesso
 * seria trocar um bug de espaço por um de perda.
 */
export function migrarPerfilAntigo(armazenamento, { nome = null } = {}) {
  const storage = storageDe(armazenamento);
  const dados = lerJogos(armazenamento);

  // Já tem jogo: nada a fazer. Esta é a trava que impede a migração de criar um
  // segundo slot a cada abertura.
  if (Object.keys(dados.saves).length > 0) return null;

  const cru = lerCru(storage, PROFILE_KEY);
  if (!cru) return null;

  let perfil;
  try {
    perfil = JSON.parse(cru);
  } catch {
    return null;
  }

  const bestCave = Number.isFinite(perfil?.bestCave) ? perfil.bestCave : 1;

  // Progresso de cave 1 não é progresso. Sem esta linha, todo mundo que jogou e
  // morreu na Mina Solar ganharia um slot chamado "Jogo 1" com a mesma Mina Solar.
  if (bestCave <= 1) return null;

  const biome = getBiomeForCave(bestCave);

  return criarJogo(armazenamento, nome ?? `Jogo 1`, {
    cave: 1,
    estado: {
      ...estadoInicial(1),
      bestCave,
      biomeId: biome.id,
      biomeName: biome.name
    }
  });
}

export { SAVES_KEY, PROFILE_KEY, NOME_MAX, FORMAT_VERSION };
