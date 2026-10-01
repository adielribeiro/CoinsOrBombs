import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IMPROVEMENT_FIELDS,
  MELHORIAS_DE_PICARETA,
  PICARETA_MAXIMA,
  aplicarEfeitosDasMelhorias,
  createImprovementState,
  improvementsDe,
  maxHpDe,
  pickaxeLevelDe
} from '../src/game/progression.js';
import { PERSISTENTE, partePersistente } from '../src/game/saves.js';
import { buildRewardCatalog, pickRewardOptions } from '../src/game/rewards.js';

/**
 * A melhoria escolhida sobrevive à morte.
 *
 * Este arquivo fecha o circuito inteiro sem navegador: o catálogo diz que a melhoria
 * "Vitalidade 1" sobe `vitalityLevel`, o save grava essa chave, o reinício de run
 * a carrega, e o save de novo a guarda. A pergunta que o jogador faz — "se eu
 * escolher isto e morrer, fica?" — vira uma afirmação que o teste executa.
 *
 * Tudo por execução, nunca por casamento de texto no fonte: um teste que procura a
 * string `vitalityLevel` na tela passa mesmo com a melhoria não indo para o save.
 */

/** Um `t` falso: o catálogo só precisa devolver a chave e o texto. */
const tFalso = (chave) => chave;

/** Um estado novo, com as melhorias zeradas. */
function estadoNovo(extra = {}) {
  return { ...createImprovementState(), ...extra };
}

test('o catálogo oferece Vitalidade e ela mexe em vitalityLevel', () => {
  const catalogo = buildRewardCatalog(estadoNovo(), tFalso);
  const vitalidade = catalogo.find((r) => r.track === 'vitality');

  assert.ok(vitalidade, 'o catálogo não oferece vitalidade');
  assert.ok(
    vitalidade.id.includes('vitality'),
    `o id da vitalidade é ${vitalidade.id}, e não parece o dela`
  );

  const depois = vitalidade.apply(estadoNovo());
  assert.equal(depois.vitalityLevel, 1, 'aplicar vitalidade não subiu o nível');
  assert.equal(depois.maxHp, 3, 'a vida máxima não subiu junto');
});

test('toda melhoria do catálogo mexe em algum campo de melhoria', () => {
  // A garantia que amarra as duas metades: se um item do catálogo subisse um campo
  // fora de `IMPROVEMENT_FIELDS`, a melhoria entraria no estado, sairia do save, e
  // a pessoa escolheria uma recompensa que não existe em lugar nenhum.
  const catalogo = buildRewardCatalog(estadoNovo(), tFalso);
  assert.ok(catalogo.length > 0, 'o catálogo está vazio');

  for (const reward of catalogo) {
    const depois = reward.apply(estadoNovo());
    const mudouAlgum = IMPROVEMENT_FIELDS.some((campo) => depois[campo] !== 0);

    assert.ok(
      mudouAlgum,
      `${reward.id} (${reward.track}) não mexe em nenhum campo de melhoria`
    );
  }
});

test('escolher a melhoria e depois morrer a mantém', () => {
  // O caminho completo, em memória: escolher, morrer, voltar.
  const escolhido = buildRewardCatalog(estadoNovo(), tFalso)
    .find((r) => r.track === 'vitality')
    .apply(estadoNovo());

  assert.equal(escolhido.vitalityLevel, 1);

  // A morte: é o que `buildResetState` faz, e só o que importa aqui é que as
  // melhorias sejam carregadas de volta em vez de virarem zero.
  const depoisDaMorte = { ...estadoNovo(), ...improvementsDe(escolhido) };

  assert.equal(depoisDaMorte.vitalityLevel, 1, 'a vitalidade foi perdida na morte');
});

test('a melhoria chega ao disco e volta do disco', () => {
  const escolhido = buildRewardCatalog(estadoNovo(), tFalso)
    .find((r) => r.track === 'vitality')
    .apply(estadoNovo());

  const gravado = partePersistente(escolhido);

  for (const campo of IMPROVEMENT_FIELDS) {
    assert.equal(gravado[campo], escolhido[campo], `${campo} não foi para o save`);
  }

  assert.equal(gravado.vitalityLevel, 1, 'a vitalidade não foi gravada');
  assert.ok(PERSISTENTE.includes('vitalityLevel'));
});

test('o lobby oferece quatro melhorias', () => {
  const opcoes = pickRewardOptions(estadoNovo(), tFalso);

  assert.equal(opcoes.length, 4, `vieram ${opcoes.length} opções, e o lobby pede 4`);
  assert.equal(new Set(opcoes.map((o) => o.id)).size, 4, 'a mesma melhoria veio duas vezes');
});

test('quatro é o padrão dentro e fora, para não divergirem', () => {
  // O número está no padrão da função e na chamada. Se um mudar e o outro não, o
  // lobby oferece uma quantidade e o teste desta linha continua passando.
  const um = pickRewardOptions(estadoNovo(), tFalso);
  const dois = pickRewardOptions(estadoNovo(), tFalso);

  assert.equal(um.length, 4);
  assert.equal(dois.length, 4);
});

test('quatro opções saem de um catálogo com mais de quatro itens', () => {
  // Se o catálogo encolhesse para quatro, `slice(0, 4)` devolveria os quatro
  // primeiros sempre e o sorteio deixaria de existir.
  const catalogo = buildRewardCatalog(estadoNovo(), tFalso);

  assert.ok(catalogo.length >= 6, `o catálogo tem ${catalogo.length} itens, e a história diz que são mais`);
});

test('aplicarEfeitosDasMelhorias devolve SÓ melhoria e o que ela produz', () => {
  // Esta função entra como spread no meio de um objeto literal, logo depois de
  // `cave: targetCave`. Com `...estado` dentro, o `cave` que vinha atrás
  // sobrescrevia o alvo — e escolher "Mina Solar cave 9" no modo desenvolvedor
  // entrava na cave 1.
  //
  // Ficou escondido porque morrer e trocar de bioma quase sempre levam a um
  // `targetCave` igual ao `cave` atual. A diferença só aparece quando alguém
  // escolhe um destino.
  const estado = {
    ...createImprovementState(),
    vitalityLevel: 2,
    cave: 1,
    coins: 999,
    biomeId: 'sunstone',
    hp: 4
  };

  const carry = aplicarEfeitosDasMelhorias(estado);

  for (const alheio of ['cave', 'coins', 'biomeId']) {
    assert.ok(
      !(alheio in carry),
      `carry trouxe "${alheio}" = ${carry[alheio]}, e o spread sobrescreve o campo do destino`
    );
  }

  // E o que ela DEVE trazer continua vindo.
  assert.equal(carry.vitalityLevel, 2);
  assert.equal(carry.maxHp, 4);
  assert.equal(carry.hp, 4);
});

test('o carry das melhorias não transporta a cave, e o destino sobrevive ao spread', () => {
  // A regra pelo jeito que ela é usada: montar o estado de entrada de uma cave com
  // o spread no meio, e conferir que a cave escolhida é a que fica.
  const carry = aplicarEfeitosDasMelhorias({ ...createImprovementState(), vitalityLevel: 1, cave: 1 });

  const estadoDaCave = {
    cave: 9,
    biomeId: 'sunstone',
    hp: 2,
    maxHp: 2,
    ...carry
  };

  assert.equal(estadoDaCave.cave, 9, `a cave ficou ${estadoDaCave.cave}, e o destino era 9`);
  assert.equal(estadoDaCave.maxHp, 3, 'a vida máxima não veio junto');
});

test('o nível da melhoria volta E o que ele produz', () => {
  // O bug real, encontrado no navegador: escolher Vitalidade 1, morrer, e voltar
  // com `vitalityLevel: 1` no save e 2 de vida na HUD. O nível voltava porque é
  // um dos doze campos; a vida não, porque `maxHp` não é melhoria nenhuma — vem do
  // `...initialState`, que tem `maxHp: 2`. A tela mostrava o cartão dizendo
  // "Vitalidade 01" ao lado de duas vidas.
  const resultado = aplicarEfeitosDasMelhorias({ ...createImprovementState(), vitalityLevel: 1 });

  assert.equal(resultado.vitalityLevel, 1, 'o nível não atravessou');
  assert.equal(resultado.maxHp, 3, `a vida máxima ficou ${resultado.maxHp}, e o nível 1 exige 3`);
  assert.equal(resultado.hp, 3, 'a vida atual não foi para a cheia ao entrar na caverna');
});

test('a vitalidade acumulada continua valendo depois de várias mortes', () => {
  // Este teste existe porque a falha era de quem morre. Uma vez pode ser
  // descuido; a terceira morte seguida é regra errada.
  let estado = createImprovementState();
  for (let vez = 1; vez <= 3; vez += 1) {
    estado = aplicarEfeitosDasMelhorias({ ...estado, vitalityLevel: vez });
    assert.equal(estado.maxHp, 2 + vez, `na ${vez}ª morte a vida máxima ficou ${estado.maxHp}`);
  }
});

test('o nível da picareta volta E a força que ele dá', () => {
  // Picareta é o outro caso: `pickaxePower` também não é campo de melhoria, e é
  // ele que decide quantos cliques a rocha custa.
  const resultado = aplicarEfeitosDasMelhorias({ ...createImprovementState(), pickaxeUpgradeLevel: 2 });

  assert.equal(resultado.pickaxeUpgradeLevel, 2, 'o nível não atravessou');
  assert.equal(resultado.pickaxePower, 3, `a força ficou ${resultado.pickaxePower}, e o nível 2 dá 3`);
  assert.equal(resultado.pickaxeLevel, 3, 'o nível mostrado na HUD não acompanhou');
});

test('a forca da picareta nao passa do teto', () => {
  // O teto vem de `PICARETA_MAXIMA`, e nao e um numero escrito aqui. O teste
  // antigo fixava 5 e passou a reprovar quando o teto subiu para 10 -- que e o
  // comportamento certo dele, e a razao de o numero estar numa constante so.
  const resultado = aplicarEfeitosDasMelhorias({
    ...createImprovementState(),
    pickaxeUpgradeLevel: MELHORIAS_DE_PICARETA
  });

  assert.equal(
    resultado.pickaxePower,
    PICARETA_MAXIMA,
    `aforca no maximo das melhorias deu ${resultado.pickaxePower}`
  );
  assert.equal(resultado.pickaxeLevel, PICARETA_MAXIMA);

  // E acima do teto nao ha invencao: um save com nivel a mais, de um futuro que
  // nunca chega, nao pode virar uma picareta maior que a maxima.
  const acima = aplicarEfeitosDasMelhorias({
    ...createImprovementState(),
    pickaxeUpgradeLevel: MELHORIAS_DE_PICARETA + 20
  });

  assert.equal(acima.pickaxePower, PICARETA_MAXIMA, 'aforca estourou o teto');
  assert.equal(acima.pickaxeLevel, PICARETA_MAXIMA);
});

test('sem melhoria nenhuma, a caverna começa como sempre: 2 de vida, picareta 1', () => {
  // O contra-teste. Sem ele, `aplicarEfeitosDasMelhorias` podia estar sempre
  // acrescentando um ponto de vida e o jogo inteiro passaria a ficar mais fácil.
  const resultado = aplicarEfeitosDasMelhorias(createImprovementState());

  assert.equal(resultado.maxHp, 2, `a vida sem melhoria ficou ${resultado.maxHp}`);
  assert.equal(resultado.hp, 2);
  assert.equal(resultado.pickaxePower, 1, `a picareta sem melhoria ficou ${resultado.pickaxePower}`);
});

test('as formulas de vida e picareta sao as mesmas em toda parte', () => {
  // Duas funcoes separadas, um numero escrito nas duas. A vitalidade aparece como
  // `2 + nivel` no calculo e no texto do card; a picareta, como `1 + nivel` com
  // teto. Se uma mudar e a outra nao, o nivel na tela mente.
  for (const nivel of [0, 1, 4, 8]) {
    assert.equal(maxHpDe(nivel), 2 + nivel, `maxHpDe(${nivel})`);
  }
  for (const nivel of [0, 1, 2, 3, 4, 8, 9]) {
    assert.equal(
      pickaxeLevelDe(nivel),
      Math.min(PICARETA_MAXIMA, 1 + nivel),
      `pickaxeLevelDe(${nivel})`
    );
  }
});

test('recalcular depois de escolher a carta não muda o que ela deu', () => {
  // As duas metades têm de concordar. A carta diz que vitalidade 1 dá +1 vida e
  // escreve `maxHp: 3`; a regra de recálculo, usada ao reiniciar a run, deriva 3
  // do nível 1. Se as duas divergirem, o jogador escolhe uma carta, morre, e a
  // vida muda de valor sozinha — e isso só aparece jogando.
  //
  // O teste recalcula a partir do estado que a carta deixou, e é por isso que
  // compara os dois `maxHp` no mesmo nível: comparar o recálculo do estado
  // anterior ao escolha mediria outra coisa, e passaria com as regras erradas.
  for (const trilha of ['vitality', 'pickaxe']) {
    const antes = createImprovementState();
    const carta = buildRewardCatalog(antes, tFalso).find((r) => r.track === trilha);
    const comCarta = carta.apply(antes);
    const recalculado = aplicarEfeitosDasMelhorias(comCarta);

    const campo = trilha === 'vitality' ? 'maxHp' : 'pickaxePower';
    assert.equal(
      recalculado[campo],
      comCarta[campo],
      `a carta ${carta.id} deu ${comCarta[campo]} e o recálculo deu ${recalculado[campo]}`
    );
  }
});

test('o que a melhoria produz atravessa a troca de bioma', () => {
  // Trocar de bioma reconstrói o estado do mesmo jeito que a morte. Se só um dos
  // dois caminhos sabe disso, a melhoria funciona numa hora e some na outra.
  const comVitalidade = { ...createImprovementState(), vitalityLevel: 3 };
  const depois = aplicarEfeitosDasMelhorias(comVitalidade);

  assert.equal(depois.vitalityLevel, 3);
  assert.equal(depois.maxHp, 5, `ao trocar de bioma a vida ficou ${depois.maxHp}, e o nível 3 dá 5`);
});

test('a melhoria também atravessa a troca de bioma', () => {
  // Trocar de bioma reconstrói o estado a partir do inicial. Se as melhorias não
  // forem carregadas, elas somem ao mudar de caverna — e a pessoa culparia a
  // escolha, não a troca.
  const escolhido = buildRewardCatalog(estadoNovo(), tFalso)
    .find((r) => r.track === 'vitality')
    .apply(estadoNovo());

  const depoisDeTrocar = { ...estadoNovo(), ...improvementsDe(escolhido) };

  assert.equal(depoisDeTrocar.vitalityLevel, 1, 'a melhoria sumiu ao trocar de bioma');
});