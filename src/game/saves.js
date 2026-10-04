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
import { NIVEL_MAXIMO, UPGRADE_IDS, UPGRADE_POR_CAMPO, UPGRADES } from './melhorias.js';
import {
  IMPROVEMENT_FIELDS,
  MELHORIAS_DE_PICARETA,
  PICARETA_MAXIMA,
  POCOES_CAMINHO_SEGURO_NO_DEV,
  createCollectionState,
  createImprovementState,
  createMelhoriasFixasState,
  createStatsState,
  createUtilityInventory,
  getBiomeForCave,
  getTotalRelics
} from './progression.js';

const SAVES_KEY = 'coinsorbombs:saves:v1';
const PROFILE_KEY = 'coinsorbombs:profile:v1';

const FORMAT_VERSION = 1;

/**
 * O que a morte e a troca de cave não podem tocar.
 *
 * Derivado da configuração das melhorias, e não escrito à mão: um campo novo em
 * `UPGRADES` entra no disco sozinho. A lista escrita à mão funciona até alguém
 * acrescentar a próxima melhoria — e o sintoma é uma melhoria que a pessoa comprou e que
 * desaparece na morte, sem erro em lugar nenhum.
 *
 * Fica **antes** de `PERSISTENTE` porque a lista de baixo a consome, e uma constante
 * usada antes da declaração morre com "Cannot access before initialization" — que é
 * exatamente o tipo de erro que só aparece quando outro arquivo importa este.
 */
export const PERMANENTE = ['relics', ...UPGRADE_IDS.map((id) => UPGRADES[id].field)];

/**
 * Os campos permanentes que são um **dicionário**, e não um número.
 *
 * ## Por que uma lista à parte
 *
 * Porque `comPermanentes` limita os números: um nível de melhoria vai até 3 e o saldo é
 * um inteiro. Passar um dicionário por esse caminho daria zero — `Number.isFinite({})` é
 * falso — e o registro das caves sumiria do estado a cada morte, que é exatamente o
 * laço de farm que o registro existe para fechar.
 *
 * A lista é curta e muda junto com a de cima; as duas entram no disco pelo mesmo
 * `PERMANENTE_OU_ESTRUTURA`.
 */
export const PERMANENTE_ESTRUTURA = ['relicasPorCave'];

/** Tudo que a morte não toca: os números e os dicionários. */
export const PERMANENTE_E_TUDO = [...PERMANENTE, ...PERMANENTE_ESTRUTURA];

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
  // O piso das melhorias fixas. Sem ele no disco, um save com uma melhoria fixa
  // voltaria do F5 sem ela — e o jogador perderia, num recarregando de página, a
  // única coisa que a escolha dele comprou.
  'melhoriasFixas',
  // As melhorias entram aqui porque elas são permanentes. Antes elas viviam só na
  // memória do `App.jsx`: o jogador escolhia "Vitalidade 2", fechava a aba, e a
  // melhoria não estava em lugar nenhum. Não basta um save de uma linha que não
  // guarda o que a pessoa conquistou.
  ...
    IMPROVEMENT_FIELDS,
  // O saldo de relíquias e as cinco melhorias compradas com elas. A lista acima é o que
  // a morte reconstrói a partir do estado inicial; estes são o que ela **não** toca,
  // porque são permanentes por decisão de jogo — uma relíquia gasta não volta, e uma
  // melhoria comprada não se perde morrendo.
  //
  // `relics` é separado da `collection` de propósito: a coleção é o catálogo "x3 Âmbar"
  // e não pode encolher quando a pessoa gasta uma. Sem separá-las, o saldo cresceria
  // contra a conta do catálogo, e nenhuma das duas mostraria a verdade.
    ...PERMANENTE_E_TUDO
];

/**
 * Relíquias com que o modo desenvolvedor começa.
 *
 * A soma dos custos das cinco melhorias dá 90. O valor é o dobro, e não o exato, porque
 * o modo também serve para testar a recusa por saldo insuficiente — e um saldo que dá
 * exatamente para comprar tudo nunca chega nesse caminho.
 */
export const RELIQUIAS_NO_DEV = 200;

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
    // O saldo e as cinco melhorias entram aqui zerados, e não só quando um save antigo é
    // hidratado. São os campos que `hidratarEstado` completa a partir deste estado, e
    // sem eles um save de antes das melhorias abria sem o campo `relics` — a leitura
    // devolvia zero por acaso, num `?? 0` dentro da função, e o próximo que aparecesse
    // leria direto do estado e receberia `undefined`.
    //
    // Vem de `comPermanentes({})`, e não de uma lista escrita aqui: os campos saem de
    // `PERMANENTE`, que por sua vez sai da configuração das melhorias. Uma lista escrita
    // à mão funciona até a próxima melhoria aparecer.
    ...comPermanentes({}),
    // O registro de relíquias por cave nasce vazio. Ele não pode faltar em save nenhum:
    // um save antigo sem o campo é lido pela cena como "esta cave nunca foi gerada", e
    // o primeiro retorno a ela seria um sorteio novo — o farm, justamente nos saves que
    // existiam antes de a proteção existir.
    relicasPorCave: {},
    ...createImprovementState(),
    // Todo jogo começa marcado como jogo de verdade. Um save antigo, de antes do
    // modo desenvolvedor, recebe `false` — e é exatamente isso que impede que ele
    // abra com o modo ligado e leve um bestCave de teste para o jogo de verdade.
    dev: false,
    // Nenhuma melhoria é fixa até o jogador escolher uma na virada de bioma. Todo
    // save nasce com o piso zerado, inclusive o de quem já morreu: as melhorias
    // temporárias morrem, as fixas é que estão no piso.
    melhoriasFixas: createMelhoriasFixasState()
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
    // A melhoria de relíquia da picareta também vai no máximo. Sem ela o modo dev
    // entrega uma picareta de 13 **por decreto** enquanto o valor derivado daria 10, e
    // a primeira vez que o estado é recalculado a picareta cai sozinha — o modo
    // desenvolvedor perdendo ferramenta no meio do teste.
    melhoriaPickaxe: NIVEL_MAXIMO,
    // Relíquias para exercitar a loja de melhorias sem ter que caçar 45 no mapa. Um
    // save de teste não conta progresso, então o saldo não vira nada real.
    relics: RELIQUIAS_NO_DEV,
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
    dev: bruto?.dev === true,
    // O piso das fixas também é completado. Um save antigo não tem a chave, e a
    // tela lê `melhoriasFixas` direto na morte — sem isto a cópia do piso seria
    // `undefined` e a morte zeraria as doze melhorias.
    melhoriasFixas: { ...createMelhoriasFixasState(), ...(bruto?.melhoriasFixas ?? {}) }
  };
}

/**
 * Só os campos permanentes, completos e limitados.
 *
 * ## Por que devolve SÓ os campos, e não o estado inteiro
 *
 * Porque quem chama espalha o resultado por cima de um estado que acabou de montar. Uma
 * função que devolvesse `...estado` inteiro traria de volta a cave, o bioma, as moedas, a
 * coleção e as estatísticas — e é o bug que `melhoriasReiniciadas` já tinha e que
 * `test/morte.test.mjs` existe para segurar.
 *
 * A primeira versão desta função começou em `{ ...estado }`, e o efeito foi o mesmo bug
 * pelo caminho oposto: `buildResetState` montava a cave do bioma, chamava
 * `melhoriasReiniciadas` e espalhava `comPermanentes` por cima — e a volta trazia a cave
 * da morte de volta, anulando a regra do recomeço. O sintoma era idêntico ao do bug
 * anterior, e por um tempo pareceu que a correção do recomeço tinha voltado a falhar.
 *
 * A lista devolvida é `PERMANENTE`, e a função não pode devolver nada fora dela. É o que
 * o teste `devolve so os campos permanentes, e nada mais` segura.
 *
 * ## Por que isto é separado da hidratação
 *
 * Porque a hidratação monta o estado de **uma run que vai começar**, e o saldo de
 * relíquias e as cinco melhorias não recomeçam: eles atravessam a morte, a troca de cave
 * e a ida ao menu. Usar a hidratação para eles resolveria o problema errado.
 *
 * ## Por que `saldoDeReliquias`, e não `?? 0` direto
 *
 * Porque o save pode vir editado à mão, e `NaN` somado a `NaN` é `NaN`: o saldo viraria
 * `NaN`, o preço da melhoria compararia `NaN < 3` como falso — que é "sem relíquia" — e
 * a pessoa veria um saldo quebrado e nenhuma melhoria comprável, sem erro no console.
 */
export function comPermanentes(estado) {
  const saida = {};

  for (const campo of PERMANENTE) {
    const bruto = estado?.[campo];
    const config = UPGRADE_POR_CAMPO[campo];

    // Um nível de melhoria é limitado ao máximo, porque um save editado com 99 não pode
    // dar vida 101. O saldo não é limitado: é um número, e a depreciação é dele.
    saida[campo] = config
      ? Number.isFinite(bruto)
        ? Math.min(Math.max(0, Math.trunc(bruto)), config.maxLevel)
        : 0
      : Number.isFinite(bruto) && bruto > 0
        ? Math.trunc(bruto)
        : 0;
  }

  // Os dicionários não passam pelo caminho dos números. O registro das caves, por
  // exemplo, é `{ "12": { total: 2, coletadas: 2 } }` — e `Number.isFinite` desse objeto
  // é falso, o que o zeraria e reabriria o laço de farm.
  for (const campo of PERMANENTE_ESTRUTURA) {
    saida[campo] = normalizaEstruturaPermanente(campo, estado?.[campo]);
  }

  return saida;
}

/**
 * Limpa um dicionário permanente de um save que veio editado à mão.
 *
 * Cada campo tem a sua própria regra, e é por isso que a lista é de **funções** e não de
 * campos: um dicionário novo precisa trazer a sua normalização junto, e um campo novo na
 * lista sem normalização passaria a atravessar o save como `undefined` — que a tela
 * trata como "não há registro" e que é justamente o estado que reabre o farm.
 */
const NORMALIZADORES_DE_ESTRUTURA = {
  relicasPorCave: (valor) => {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};

    const saida = {};

    for (const [cave, entrada] of Object.entries(valor)) {
      const numero = Number(cave);

      // Uma cave que não é número não volta a ser visitada, e uma entrada sem
      // `total` não sabe o que tem. Descartar as duas é o que mantém o registro honesto.
      if (!Number.isFinite(numero) || numero < 1) continue;
      if (!entrada || typeof entrada !== 'object') continue;

      const total = Number(entrada.total);
      const coletadas = Number(entrada.coletadas);

      if (!Number.isFinite(total) || total < 1) continue;

      saida[String(numero)] = {
        total: Math.trunc(total),
        coletadas: Number.isFinite(coletadas)
          ? Math.min(Math.trunc(Math.max(0, coletadas)), Math.trunc(total))
          : 0
      };
    }

    return saida;
  }
};

function normalizaEstruturaPermanente(campo, valor) {
  const normalizador = NORMALIZADORES_DE_ESTRUTURA[campo];

  // Um campo da lista **sem** normalizador registrado atravessa como está, desde que seja
  // um objeto. Devolver `undefined` seria pior: a tela leria "não há nada guardado", e é
  // esse estado que reabre o laço de farm.
  if (!normalizador) {
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  }

  return normalizador(valor);
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
