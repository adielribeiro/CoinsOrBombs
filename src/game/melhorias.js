/**
 * As melhorias compradas com relíquias, e a moeda que as paga.
 *
 * ## O que este arquivo é
 *
 * A configuração central e as regras de compra. Catálogo de dados, o mesmo carve de
 * `rewards.js` e `progression.js`: quem compra é a tela, e a tela só precisa das
 * perguntas que este arquivo responde.
 *
 * ## Por que um saldo novo, e não a coleção
 *
 * Porque hoje a coleção é **catálogo**: a tela de Informações mostra "x3 Âmbar", que é
 * o registro de quais relíquias a pessoa já achou. Gastar uma não pode apagar esse
 * registro — a pergunta "esta pessoa já viu esta relíquia?" é diferente de "quantas tem
 * para gastar?", e usar o mesmo campo para as duas é o tipo de coisa que funciona até
 * alguém precisar das duas ao mesmo tempo.
 *
 * O saldo é `relics`. A coleção continua sendo coleção, e `stats.totalRelicsFound`
 * continua sendo o histórico que nunca diminui.
 *
 * ## Por que os níveis somam às cartas, e não as substituem
 *
 * Porque as cartas continuam no fim de cada caverna, e elas dão o mesmo atributo. Se as
 * melhorias de relíquia substituíssem as cartas, a moeda perderia função e o balanceamento
 * de todo o jogo mudaria. Somando, a vida final é `2 + cartas + relíquias` e a picareta
 * vai de 1 até `PICARETA_MAXIMA + 3`.
 *
 * ## Por que os níveis são contados, e não o valor final
 *
 * Porque senão o save guarda o bônus e o carregamento soma de novo: vida 3 com nível 2
 * salvava 5, e ao abrir virava 7. Guardando o nível e recalculando sempre
 * (`vidaFinal = base + nível`), o bônus não pode ser aplicado duas vezes.
 */

/**
 * A configuração das cinco melhorias.
 *
 * Centralizada de propósito: um custo escrito na tela e outro escrito na regra divergem
 * no primeiro ajuste, e a pessoa paga o preço errado sem nenhum aviso. Aqui o custo é
 * lido dos dois lados.
 *
 * ## O benefício é uma CHAVE, e não um texto
 *
 * Porque a configuração é dado, e dado não fala. Um texto em português aqui apareceria em
 * português na tela de quem escolheu inglês, e nada reprovaria: a tela compila, o número
 * está certo e a pessoa só lê errado. Aqui mora a chave, e quem traduz é o tradutor.
 *
 * ## Por que `benefit` serve para todos os níveis
 *
 * Porque "+1 de vida máxima" é a mesma frase no nível 1 e no 3. Só o Caminho Seguro tem
 * efeito que muda de natureza — o nível 3 não é o nível 2 com um número maior — e é por
 * isso que ele tem `benefits`, uma chave por nível.
 *
 * ## `benefits` tem uma chave por nível, e não uma a mais
 *
 * Quem está no nível máximo vê "nível máximo", não a descrição do último efeito. Como
 * nenhuma tela mostra o efeito de um nível já comprado, a chave do nível 3 seria lida
 * por ninguém — e uma chave morta é uma chance de a tradução divergir sem ninguém ver.
 */
export const UPGRADES = {
  health: {
    id: 'health',
    field: 'melhoriaHealth',
    icon: '🛡️',
    costs: [3, 6, 10],
    maxLevel: 3,
    benefit: 'shop.upgrade.health.benefit'
  },
  pickaxe: {
    id: 'pickaxe',
    field: 'melhoriaPickaxe',
    icon: '⛏️',
    costs: [4, 8, 15],
    maxLevel: 3,
    benefit: 'shop.upgrade.pickaxe.benefit'
  },
  lifePotion: {
    id: 'lifePotion',
    field: 'melhoriaLifePotion',
    icon: '❤️',
    costs: [10, 15, 20],
    maxLevel: 3,
    benefit: 'shop.upgrade.lifePotion.benefit'
  },
  revealBomb: {
    id: 'revealBomb',
    field: 'melhoriaRevealBomb',
    icon: '💣',
    costs: [10, 15, 20],
    maxLevel: 3,
    benefit: 'shop.upgrade.revealBomb.benefit'
  },
  capacidade: {
    id: 'capacidade',
    field: 'melhoriaCapacidade',
    /**
     * 🧳 e nao 🎒: o 🎒 ja e o cartao "Utilitario" do lobby, e o mesmo emoji em duas
     * melhorias diferentes e confusao na hora de escolher.
     */
    icon: '🧳',
    costs: [50, 60, 80],
    maxLevel: 3,
    benefit: 'shop.upgrade.capacidade.benefit'
  },
  safePath: {
    id: 'safePath',
    field: 'melhoriaSafePath',
    icon: '🧭',
    costs: [10, 15, 20],
    maxLevel: 3,
    benefits: [
      'shop.upgrade.safePath.b1',
      'shop.upgrade.safePath.b2',
      'shop.upgrade.safePath.b3'
    ]
  }
};

/**
 * Os campos que são níveis comprados.
 *
 * Derivado da configuração, e não escrito à mão: a versão anterior era uma lista digitada ao
 * lado do objeto que ela descrevia, e o comentário dela já dizia que era derivada. Não era.
 * O preço é concreto — uma melhoria nova que ninguém lembrasse de pôr na lista aparecia na
 * tela, cobrava a pessoa, e não entrava no save permanente, porque `PERMANENTE` em
 * `saves.js` é derivado desta lista.
 *
 * Fica **depois** de `UPGRADES` porque `Object.keys` lê o objeto na hora, e a ordem das
 * declarações resolve o que era o motivo de a lista ser escrita à mão.
 */
export const UPGRADE_IDS = Object.keys(UPGRADES);

/** Os três níveis, e só três. Repetido aqui para a tela não repetir a constante. */
export const NIVEL_MAXIMO = 3;

/**
 * A configuração pelo nome do campo no save.
 *
 * Existe para quem trabalha com o **estado** e não com o id da melhoria: o save guarda
 * `melhoriaHealth`, e o `hidratarEstado` precisa saber o máximo daquele campo sem
 * reescrever a busca. A lista de campos e a de ids saem daqui, então as três listas nunca
 * discordam.
 */
export const UPGRADE_POR_CAMPO = Object.fromEntries(
  UPGRADE_IDS.map((id) => [UPGRADES[id].field, UPGRADES[id]])
);

/**
 * O custo do próximo nível, ou `null` quando acabou.
 *
 * Índice zero é o primeiro nível: com `nivel = 0`, o custo é `costs[0]`. Um `costs[2]`
 * accessed com nível 2 seria o terceiro — e o índice precisa continuar valendo depois
 * do nível máximo, que é onde `null` responde.
 */
export function custoDoProximoNivel(id, nivel) {
  const config = UPGRADES[id];
  const atual = Number.isFinite(nivel) ? nivel : 0;

  if (!config || atual >= config.maxLevel || atual >= config.costs.length) return null;

  return config.costs[atual];
}

/** O nível mais alto que a melhoria permite, ou `null` se o id não existe. */
export function nivelMaximo(id) {
  return UPGRADES[id]?.maxLevel ?? null;
}

/**
 * A chave de texto do que o **próximo** nível faz, ou `null` quando não há próximo.
 *
 * ## Por que o índice é o nível atual, e não o máximo
 *
 * Porque a tela mostra "o que o próximo dá": quem está no nível 1 de Caminho Seguro
 * precisa ler o efeito do 2, e quem está no 0 precisa do 1. Uma versão que devolvesse
 * sempre a última chave da lista mostrava a descrição do nível 3 para quem tinha zero
 * níveis comprados — a pessoa lia o efeito mais distante do que tinha, que é o
 * contrário de informar o próximo passo.
 *
 * Devolve a **chave**, e não o texto: quem traduz é o tradutor, e um texto aqui
 * apareceria na língua errada na tela de quem trocou de idioma.
 */
export function chaveDoProximoBeneficio(id, nivel) {
  const config = UPGRADES[id];
  const atual = Number.isFinite(nivel) ? nivel : 0;

  if (!config || atual >= config.maxLevel) return null;

  if (Array.isArray(config.benefits)) return config.benefits[atual] ?? null;

  return config.benefit ?? null;
}

/**
 * A chave do efeito de **um** nível, e não do próximo.
 *
 * Existe para quem já comprou e quer saber o que tem hoje. A tela de compra não usa: ela
 * mostra sempre o próximo, e no máximo mostra "nível máximo".
 */
export function chaveDoBeneficio(id, nivel) {
  const config = UPGRADES[id];
  const alvo = Number.isFinite(nivel) ? nivel : 0;

  if (!config) return null;

  if (Array.isArray(config.benefits)) return config.benefits[alvo] ?? null;

  return config.benefit ?? null;
}

/**
 * A compra de um nível, ou o motivo de não poder.
 *
 * ## Por que devolve um motivo, e não um `false`
 *
 * Porque a tela precisa de três respostas diferentes — comprou, não tem relíquia, já
 * está no máximo — e um booleano obrigaria a tela a descobrir qual das três aconteceu
 * consultando o estado de novo. Descobrir com o estado já mudado é o caminho para
 * mostrar "comprado" numa compra que não aconteceu.
 *
 * ## Por que a checagem vem antes de qualquer escrita
 *
 * Porque a compra é atômica: ou o nível sobe e as relíquias descem, ou nada acontece.
 * Validar o custo depois de debitar é o caminho para gastar sem receber — e para uma
 * pessoa que viu o saldo cair, isso é pior do que uma compra recusada.
 *
 * ## Por que `niveis` sai com o nome do CAMPO, e não com o da melhoria
 *
 * Porque quem compra espalha o resultado no estado, e o estado guarda `melhoriaHealth`,
 * não `health`. Devolver com o nome da melhoria produz uma compra que debita as
 * relíquias e **não** sobe o nível: o saldo cai, o cartão continua em "Nível 0/3" e a
 * pessoa só descobre que pagou olhando o extrato. Foi exatamente isso que aconteceu na
 * primeira versão — `upgrades: { health: 1 }` espalhado no estado escrevia uma chave que
 * nada lia, e o teste passava porque ele não espalhava: montava o estado campo por
 * campo, à mão, e conferia só o número devolvido.
 *
 * O teste que pega isso está em `test/melhorias-reliquia.test.mjs`: ele espalha o
 * resultado de verdade e pergunta o nível pelo mesmo caminho que a tela pergunta.
 *
 * @returns {{ok: true, custo: number, nivel: number, relics: number, niveis: object}
 *          |{ok: false, motivo: 'desconhecida'|'maximo'|'sem-reliquias', custo?: number}}
 */
export function comprarMelhoria(estado, id) {
  const config = UPGRADES[id];

  if (!config) return { ok: false, motivo: 'desconhecida' };

  const nivel = nivelDe(estado, id);
  const custo = custoDoProximoNivel(id, nivel);

  if (custo === null) return { ok: false, motivo: 'maximo', nivel };

  const relics = saldoDeReliquias(estado);

  if (relics < custo) return { ok: false, motivo: 'sem-reliquias', custo, nivel, relics };

  return {
    ok: true,
    custo,
    nivel: nivel + 1,
    relics: relics - custo,
    niveis: { ...niveisPorCampoDe(estado), [config.field]: nivel + 1 }
  };
}

/**
 * Os níveis de um estado, com o nome de **campo**, prontos para espalhar.
 *
 * A função espelha de `upgradesDe`, e é a que o estado usa. As duas existem porque as
 * duas perguntas são diferentes: a tela pergunta pelo id ("quanto custa o próximo nível
 * de vida?") e o save guarda pelo campo.
 */
export function niveisPorCampoDe(estado) {
  const saida = {};

  for (const id of UPGRADE_IDS) {
    saida[UPGRADES[id].field] = nivelDe(estado, id);
  }

  return saida;
}

/** As cinco melhorias, completadas com zero onde faltarem. */
export function upgradesDe(estado) {
  const base = {};

  for (const id of UPGRADE_IDS) base[id] = 0;

  for (const id of UPGRADE_IDS) {
    const bruto = estado?.[UPGRADES[id].field];
    const nivel = Number.isFinite(bruto) ? bruto : 0;

    base[id] = Math.min(Math.max(0, Math.trunc(nivel)), UPGRADES[id].maxLevel);
  }

  return base;
}

/** O nível de uma melhoria. `0` quando o save é antigo e não tem o campo. */
export function nivelDe(estado, id) {
  const config = UPGRADES[id];

  if (!config) return 0;

  const bruto = estado?.[config.field];
  const nivel = Number.isFinite(bruto) ? bruto : 0;

  return Math.min(Math.max(0, Math.trunc(nivel)), config.maxLevel);
}

/** O saldo de relíquias disponíveis. `0` quando o save é antigo. */
export function saldoDeReliquias(estado) {
  const bruto = estado?.relics;

  return Number.isFinite(bruto) && bruto > 0 ? Math.trunc(bruto) : 0;
}

/**
 * A soma de relíquias no estado, com o saldo acrescentado.
 *
 * É o que a cena devolve depois de achar uma: o catálogo e o total histórico andam
 * junto do saldo, e sem os três no mesmo lugar o saldo fica para trás na morte.
 */
export function comReliquiaEncontrada(estado) {
  return {
    ...estado,
    relics: saldoDeReliquias(estado) + 1
  };
}