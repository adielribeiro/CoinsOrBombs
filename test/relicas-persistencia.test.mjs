import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UPGRADE_IDS,
  UPGRADES,
  comprarMelhoria,
  nivelDe,
  niveisPorCampoDe,
  saldoDeReliquias
} from '../src/game/melhorias.js';
import {
  aplicarEfeitosDasMelhorias,
  createImprovementState,
  createStatsState,
  createMelhoriasFixasState,
  melhoriasReiniciadas,
  registrarReliquiaEncontrada
} from '../src/game/progression.js';
import {
  PERMANENTE,
  PERMANENTE_E_TUDO,
  PERMANENTE_ESTRUTURA,
  comPermanentes,
  estadoInicial,
  hidratarEstado,
  partePersistente
} from '../src/game/saves.js';

/**
 * O saldo de relíquias e as cinco melhorias atravessando tudo que reconstrói o estado.
 *
 * ## O que estes testes seguram
 *
 * 1. **O saldo e as melhorias sobrevivem à morte e à troca de bioma.** Os dois caminhos
 *    montam o estado novo a partir de `estadoInicial`, que não tem nenhum dos dois, e
 *    depois espalham o que sobrevive. A lista do que sobrevive é `PERMANENTE` — e um
 *    campo que está na lista e não é espalhado não sobrevive, sem erro em lugar nenhum.
 *
 * 2. **O bônus não é aplicado duas vezes.** O save guarda o nível, e o derivado é sempre
 *    recalculado. Guardar o derivado também daria vida 5 num save com nível 2, e ao
 *    carregar viraria 7.
 *
 * 3. **Saldo, catálogo e histórico são três coisas.** O saldo esvazia ao gastar; o
 *    catálogo e o histórico só enchem.
 *
 * ## A tabela aqui é escrita à mão de propósito
 *
 * Os custos, os níveis e os saldos esperados estão escritos neste arquivo, e não
 * lidos de `UPGRADES`. Um teste que lê a mesma tabela que verifica não prova nada: ele
 * passa enquanto os dois mudam juntos, que é a situação que a mudança precisa pegar.
 */

/** O que a reconstrução da morte tem de carregar. Escrito à mão, como especificação. */
const PERMANENTES_ESPERADOS = [
  'relics',
  'melhoriaHealth',
  'melhoriaPickaxe',
  'melhoriaLifePotion',
  'melhoriaRevealBomb',
  'melhoriaSafePath',
  'melhoriaCapacidade',
  // O registro de relíquias por cave também é permanente, e por um motivo que não é
  // óbvio: ele é o que impede a mesma cave render relíquias de novo quando a pessoa morre
  // e recomeça o bioma. Perder esse registro na morte é o mesmo que permitir o farm.
  'relicasPorCave'
];

/**
 * O caminho da morte, escrito aqui do jeito que `buildResetState` faz.
 *
 * ## Por que reescrever o caminho no teste, e não importar
 *
 * Porque `buildResetState` mora dentro do componente React e não pode rodar em Node. A
 * alternativa — testar só `melhoriasReiniciadas` — foi o que deixou a falha passar: essa
 * função está correta, e o que faltava era o `...comPermanentes` **depois** dela no
 * `App.jsx`. Um teste da função isolada não enxerga um campo que ninguém espalha.
 *
 * Aqui a asserção é sobre o estado **final**, e é o estado final que importa: um `relics`
 * que some entre o recálculo e o fim da montagem não tem como ser notado por quem testa
 * a peça.
 */
function recomecoAposMorte(baseState) {
  const inicial = estadoInicial(1);

  return {
    ...inicial,
    coins: baseState.coins ?? 0,
    collection: baseState.collection,
    stats: baseState.stats,
    ...melhoriasReiniciadas(baseState),
    ...comPermanentes(baseState)
  };
}

/**
 * Um estado com saldo e melhorias compradas, montado de verdade pelas regras.
 *
 * O saldo de partida e 400. As seis melhorias ate o fim custam 19 + 27 + 45 * 3 + 190 = 371,
 * e sobrar 29 importa: um estado com saldo exatamente no fim nunca exercita a recusa,
 * e o teste que mede "comprar sem saldo" passaria em branco.
 *
 * Sao 400 e nao 371 por esse motivo. Com 200 — que era o valor quando eram cinco — a
 * sexta melhoria nunca era comprada, e os testes de morte e de troca de bioma acusavam o
 * campo novo de "voltou do maximo para 0" quando o problema era o saldo do instrumento.
 */
function estadoComMelhoriasCompradas() {
  let estado = { ...estadoInicial(1), relics: 400, ...niveisPorCampoDe({}) };

  for (const id of UPGRADE_IDS) {
    for (let n = 0; n < 3; n += 1) {
      const compra = comprarMelhoria(estado, id);

      assert.equal(compra.ok, true, `nao deu para comprar ${id} nivel ${n + 1}`);

      estado = { ...estado, ...compra.niveis, relics: compra.relics };
    }
  }

  return estado;
}

// --- o que a lista de permanentes promised, e entrega ------------------------

test('as listas de permanentes cobrem o saldo, as cinco melhorias e o registro', () => {
  // A lista é o contrato entre a regra e quem reconstrói o estado. Um campo fora dela
  // nunca é carregado, e um campo dentro dela que ninguém espalha também não.
  //
  // São duas listas porque são duas naturezas: `PERMANENTE` são números, que o
  // `comPermanentes` limita até o máximo da melhoria; `PERMANENTE_ESTRUTURA` é o
  // registro por cave, que é um dicionário. Passar o dicionário pelo caminho dos números
  // daria zero — `Number.isFinite({})` é falso — e o registro sumiria na morte, que é o
  // laço de farm que ele existe para fechar.
  assert.deepEqual(
    [...PERMANENTE_E_TUDO].sort(),
    [...PERMANENTES_ESPERADOS].sort(),
    'o conjunto de campos permanentes não é o que a lista promete'
  );

  assert.deepEqual([...PERMANENTE].sort(), [...PERMANENTE_E_TUDO].sort().filter((campo) => campo !== 'relicasPorCave'), 'um dicionário entrou na lista de números');

  for (const id of UPGRADE_IDS) {
    assert.ok(
      PERMANENTE.includes(UPGRADES[id].field),
      `${UPGRADES[id].field} nao esta em PERMANENTE`
    );
  }

  assert.ok(PERMANENTE_ESTRUTURA.includes('relicasPorCave'), 'o registro por cave nao esta na lista de dicionarios');
});

test('o saldo e os niveis sobrevem a uma morte', () => {
  const antes = estadoComMelhoriasCompradas();

  // 400 - 371 = 29. O numero vem da conta, e nao de um literal repetido aqui: um
  // literal que a configuracao mudasse junto passaria o teste sem mudar de comportamento.
  assert.equal(saldoDeReliquias(antes), 29, 'o saldo que sobrou das seis melhorias');
  assert.equal(nivelDe(antes, 'health'), 3, 'a vida nao chegou no maximo');
  assert.equal(nivelDe(antes, 'safePath'), 3, 'o caminho seguro nao chegou no maximo');

  const depois = recomecoAposMorte(antes);

  for (const id of UPGRADE_IDS) {
    assert.equal(
      nivelDe(depois, id),
      3,
      `${id} voltou do maximo para ${nivelDe(depois, id)} na morte`
    );
  }

  assert.equal(saldoDeReliquias(depois), saldoDeReliquias(antes), 'o saldo mudou na morte');
});

test('o saldo e os niveis sobrevivem a trocar de bioma', () => {
  // A troca de bioma nao passa por `melhoriasReiniciadas`: ela usa
  // `aplicarEfeitosDasMelhorias`, que nao zera nada. O teste existe porque os dois
  // caminhos reconstroem o estado e um deles ja tinha sido conferido.
  const antes = estadoComMelhoriasCompradas();

  const depois = {
    ...estadoInicial(31),
    coins: antes.coins,
    ...aplicarEfeitosDasMelhorias(antes),
    ...comPermanentes(antes)
  };

  for (const id of UPGRADE_IDS) {
    assert.equal(nivelDe(depois, id), 3, `${id} se perdeu ao trocar de bioma`);
  }

  assert.equal(saldoDeReliquias(depois), saldoDeReliquias(antes));
});

test('a vida maxima continua a mesma depois da morte, e nao volta um nivel', () => {
  // A vida da carta e a da reliquia somam. Depois da morte a carta volta ao piso das
  // fixas, e a reliquia fica: o total tem que cair **pela diferença da carta**, e nao
  // pelo numero de niveis de reliquia.
  const comCartas = {
    ...estadoInicial(1),
    relics: 20,
    vitalityLevel: 4,
    ...niveisPorCampoDe({})
  };

  const vida0 = aplicarEfeitosDasMelhorias({ ...comCartas, melhoriaHealth: 2 });
  assert.equal(vida0.maxHp, 2 + 4 + 2, 'a vida somou carta e reliquia');

  const depois = recomecoAposMorte({ ...comCartas, melhoriaHealth: 2 });
  const vida1 = aplicarEfeitosDasMelhorias(depois);

  assert.equal(vida1.maxHp, 2 + 0 + 2, `a vida ficou ${vida1.maxHp}, e a carta foi ao piso`);
});

test('o bonus nao e aplicado duas vezes ao carregar', () => {
  // O save guarda o nivel, nunca o derivado. Se guardasse os dois, vida 3 com nivel 2
  // salvaria 5 e ao carregar viraria 7.
  const estado = { ...estadoInicial(1), relics: 20, vitalityLevel: 1, ...niveisPorCampoDe({ melhoriaHealth: 2 }) };

  const vida1 = aplicarEfeitosDasMelhorias(estado);

  assert.equal(vida1.maxHp, 2 + 1 + 2, `a vida derivou ${vida1.maxHp}`);

  // A ida e volta pelo save: grava, le, e recalcula.
  const salvo = partePersistente({ ...estado, ...vida1, ...comPermanentes(estado) });
  const lido = hidratarEstado(salvo, 1);
  const vida2 = aplicarEfeitosDasMelhorias(lido);

  assert.equal(vida2.maxHp, vida1.maxHp, `a vida foi de ${vida1.maxHp} para ${vida2.maxHp}`);
  assert.equal(vida2.pickaxeLevel, aplicarEfeitosDasMelhorias(estado).pickaxeLevel);
});

// --- saldo, catalogo e historico sao tres coisas --------------------------

test('achar uma reliquia enche as tres coisas, e so uma de cada vez', () => {
  // O historico vive dentro de `stats`. Umafixture que o puser na raiz contaria de
  // zero, e a asercao de 9 + 1 reprovaria por um motivo que nao era o do teste.
  const antes = {
    ...estadoInicial(1),
    relics: 12,
    stats: { ...createStatsState(), totalRelicsFound: 9 }
  };
  const depois = registrarReliquiaEncontrada(antes, 'relicDoBioma');

  assert.equal(saldoDeReliquias(depois), 13, 'o saldo subiu um');
  assert.equal(depois.stats.totalRelicsFound, 10, 'o historico subiu um');
  assert.equal(depois.collection.relicDoBioma, 1, 'o catalogo subiu um');
});

test('gastar nao mexe no catalogo nem no historico', () => {
  let estado = { ...estadoInicial(1), relics: 0 };

  for (let n = 0; n < 12; n += 1) {
    estado = registrarReliquiaEncontrada(estado, 'relicDoBioma');
  }

  const catalogoFinal = estado.collection.relicDoBioma;
  const historicoFinal = estado.stats.totalRelicsFound;
  const saldoFinal = saldoDeReliquias(estado);

  // Gastar um nível: 12 - 3 = 9. O segundo nível da vida custa 6 e também entraria,
  // mas um gasto só já prova o que o teste mede, e uma compra recusada faria o
  // helper falhar por um motivo que não é o do teste.
  estado = comprMelhoriaSeguro(estado, 'health');

  assert.equal(
    saldoDeReliquias(estado),
    saldoFinal - 3,
    `o saldo ficou ${saldoDeReliquias(estado)}, e esperava ${saldoFinal - 3}`
  );

  assert.equal(
    estado.collection.relicDoBioma,
    catalogoFinal,
    'gastar apagou o registro de quais reliquias a pessoa achou'
  );
  assert.equal(
    estado.stats.totalRelicsFound,
    historicoFinal,
    'gastar diminuiu o historico, e ele nunca deve diminuir'
  );
});

test('o historico so enche, e nunca diminui', () => {
  let estado = { ...estadoInicial(1), relics: 30 };

  for (let n = 0; n < 4; n += 1) estado = registrarReliquiaEncontrada(estado, 'r');

  const historico = estado.stats.totalRelicsFound;

  // Compra com o saldo que sobrou: e o unico jeito de o saldo descer.
  estado = comprMelhoriaSeguro(estado, 'pickaxe');

  assert.equal(estado.stats.totalRelicsFound, historico, 'o historico caiu numa compra');
  assert.ok(historico >= 4, `o historico ficou em ${historico}, e devia contar as quatro`);
});

test('um save antigo abre com saldo zero e os cinco niveis em zero', () => {
  // O save de antes das melhorias nao tem nenhum dos campos. Sem completar com zero a
  // tela le `undefined` na comparacao do botao, e `NaN` onde deveria haver numero.
  const antigo = partePersistente({ ...estadoInicial(3), coins: 40, cave: 3 });
  const lido = hidratarEstado(antigo, 3);

  assert.equal(saldoDeReliquias(lido), 0, 'o saldo de um save antigo');
  assert.equal(lido.relics, 0, 'o campo do saldo deveria existir valendo zero');

  for (const id of UPGRADE_IDS) {
    assert.equal(lido[UPGRADES[id].field], 0, `${id} sem campo no save antigo`);
    assert.equal(nivelDe(lido, id), 0, `${id} lido como nivel`);
  }
});


test('devolve so os campos permanentes, e nada mais', () => {
  // ## O bug que este teste segura
  //
  // `comPermanentes` começou em `{ ...estado }` e devolvia o estado inteiro. Quem
  // espalha o resultado por cima de um estado recém-montado traz de volta tudo que o
  // estado novo tinha acabado de acertar: cave, bioma, moedas, coleção, estatísticas.
  //
  // Em `buildResetState` isso anulava a regra do recomeço — a pessoa voltava para a cave
  // da morte — com o mesmo sintoma do bug que `melhoriasReiniciadas` já teve, e com a
  // aritmética toda certa. Comparar as chaves é o que pega: o sintoma em si é
  // indistinguível do anterior.
  const estado = { ...estadoInicial(7), cave: 7, relics: 31, melhoriaHealth: 2, vital: 4 };
  const devolvido = comPermanentes(estado);

  assert.deepEqual(
    Object.keys(devolvido).sort(),
    [...PERMANENTES_ESPERADOS].sort(),
    'a função devolveu um campo que não é permanente, e quem espalha perde o estado novo'
  );

  assert.equal(devolvido.relics, 31);
  assert.equal(devolvido.melhoriaHealth, 2);
  assert.equal(devolvido.cave, undefined, 'a cave voltou junto com os permanentes');
  assert.equal(devolvido.vital, undefined, 'um campo alheio voltou junto');
});
test('um nivel editado nao sobrevive acima do maximo', () => {
  const editado = comPermanentes({
    relics: 999,
    melhoriaHealth: 99,
    melhoriaSafePath: -4,
    melhoriaPickaxe: 'tres'
  });

  assert.equal(editado.melhoriaHealth, 3, 'o nivel editado passou do maximo');
  assert.equal(editado.melhoriaSafePath, 0, 'o nivel negativo passou');
  assert.equal(editado.melhoriaPickaxe, 0, 'o nivel escrito como texto virou numero');
  assert.equal(editado.relics, 999, 'o saldo tem limite de nivel, e nao foi limitado');
});

test('o estado reconstruido ainda carrega as melhorias de carta', () => {
  // A recusa abaixo não pode vir de uma_fields zerada: `melhoriasReiniciadas` tem de
  // continuar devendo o que as cartas fixas deram. O teste existe para o `comPermanentes`
  // não ter tapado o outro reinício.
  const antes = {
    ...estadoInicial(1),
    relics: 30,
    ...createMelhoriasFixasState(),
    vitalityLevel: 5,
    ...niveisPorCampoDe({})
  };

  const depois = recomecoAposMorte(antes);
  const efeitos = aplicarEfeitosDasMelhorias(depois);

  assert.equal(efeitos.vitalityLevel, 0, 'a carta temporaria sobreviveu a morte');
  assert.equal(efeitos.maxHp, 2, `a vida ficou ${efeitos.maxHp}, e sem carta e sem reliquia e 2`);
});

/** Compra o primeiro nivel de vida e devolve o estado novo, recusando se nao der. */
function comprMelhoriaSeguro(estado, id) {
  const compra = comprarMelhoria(estado, id);

  if (!compra.ok) {
    // Sem saldo para a compra, o teste de "gastar nao mexe no catalogo" nao tem o que
    // medir. Falhar aqui e melhor que passar em branco.
    assert.fail(`sem saldo para comprar ${id} (motivo: ${compra.motivo})`);
  }

  return { ...estado, ...compra.niveis, relics: compra.relics };
}
