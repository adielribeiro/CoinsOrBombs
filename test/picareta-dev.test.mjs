import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MELHORIAS_DE_PICARETA,
  PICARETA_MAXIMA,
  aplicarEfeitosDasMelhorias,
  createImprovementState,
  createMelhoriasFixasState,
  improvementsDe,
  resetarMelhoriasTemporarias
} from '../src/game/progression.js';
import { estadoInicialDev } from '../src/game/saves.js';

/**
 * No modo desenvolvedor a picareta não volta atrás.
 *
 * ## O furo
 *
 * O save de teste começa com a picareta máxima **no início**, e não a cada virada
 * de bioma — o que significa que o `melhoriasFixas` dele é tudo zero. A morte copia
 * o piso por cima dos doze campos, e a primeira queda devolvia a pessoa à picareta
 * 1. O kit de teste estava se desmanchando a cada morte, que é justamente o que ele
 * existe para não acontecer.
 *
 * E a incoerência era visível: as 5 poções de Caminho Seguro **sobrevivem** à
 * morte, porque `buildResetState` carrega `utilities` adiante do inicial. Duas
 * metades do mesmo presente, uma durável e outra não.
 *
 * ## Por que só a picareta
 *
 * As outras melhorias continuam voltando ao piso no modo dev. Isso não é esquecimento:
 * é o que deixa o modo desenvolvedor servir para **testar** a mecânica de melhoria
 * temporária, que é o que se quer exercitar quando se morre de propósito.
 */

/** Um save de teste: o kit inteiro, e o piso zerado. */
function saveDeTeste(extra = {}) {
  return {
    ...estadoInicialDev(1),
    ...extra
  };
}

/** O que a regra devolve depois da morte. */
function morreu(estado) {
  return resetarMelhoriasTemporarias(estado);
}

// --- a morte não mexe na picareta do modo dev ----------------------------

test('a picareta maxima sobrevive a morte no modo desenvolvedor', () => {
  const antes = saveDeTeste();

  assert.equal(antes.pickaxeLevel, PICARETA_MAXIMA, 'o kit não começa com a picareta máxima');

  const depois = morreu(antes);

  assert.equal(
    depois.pickaxeLevel,
    PICARETA_MAXIMA,
    `a picareta caiu para ${depois.pickaxeLevel} na morte`
  );
  assert.equal(depois.pickaxePower, PICARETA_MAXIMA, 'a força da picareta caiu na morte');
  assert.equal(depois.pickaxeUpgradeLevel, MELHORIAS_DE_PICARETA);
});

test('a picareta continua maxima depois de muitas mortes', () => {
  // Uma morte prova pouco. Dez, com o estado passando por cada uma, prova a regra.
  let atual = saveDeTeste();

  for (let vez = 1; vez <= 10; vez += 1) {
    atual = morreu(atual);

    assert.equal(
      atual.pickaxeLevel,
      PICARETA_MAXIMA,
      `na ${vez}ª morte a picareta ficou no ${atual.pickaxeLevel}`
    );
  }
});

test('as outras melhorias do modo dev continuam voltando ao piso', () => {
  // A outra face da regra. Se tudo voltasse, o modo dev perderia a serventia de
  // testar a mecânica de temporária — que é o que se quer checar morrendo de
  // propósito.
  const comTemporaria = saveDeTeste({ vitalityLevel: 3, maxHp: 5, hp: 5 });

  const depois = morreu(comTemporaria);

  assert.equal(depois.vitalityLevel, 0, 'a vitalidade temporária sobreviveu no modo dev');
  assert.equal(depois.maxHp, 2);
  // E a picareta, ao lado, continua no máximo. As duas convivem.
  assert.equal(depois.pickaxeLevel, PICARETA_MAXIMA);
});

test('o modo dev mantem a picareta e zera o resto ao mesmo tempo', () => {
  const antes = saveDeTeste({
    coinBonusLevel: 2,
    coinBonusChance: 0.02,
    rockBonusLevel: 1
  });

  const depois = morreu(antes);

  assert.equal(depois.pickaxeLevel, PICARETA_MAXIMA, 'a picareta do kit foi junto');
  assert.equal(depois.coinBonusLevel, 0, 'a moeda não voltou ao piso');
  assert.equal(depois.coinBonusChance, 0, 'a chance ficou num valor que o piso não tem');
  assert.equal(depois.rockBonusLevel, 0);
});

// --- trocar de caverna ----------------------------------------------------

test('trocar de caverna nao mexe na picareta, e nao e preciso de excecao', () => {
  // O caminho da troca de bioma é `aplicarEfeitosDasMelhorias`, que recalcula a
  // partir do nível que já está no estado. O nível da picareta sobrevive sem que a
  // morte saiba de nada — e é por isso que este teste não usa a função da morte.
  const antes = saveDeTeste();

  const depois = aplicarEfeitosDasMelhorias(antes);

  assert.equal(antes.pickaxeLevel, PICARETA_MAXIMA);
  assert.equal(antes.pickaxePower, PICARETA_MAXIMA);
  assert.equal(depois.pickaxeLevel, PICARETA_MAXIMA);
  assert.equal(depois.pickaxePower, PICARETA_MAXIMA);
});

test('a excecao e so da morte: quem zera e so a morte', () => {
  // Se a exceção tivesse entrado em `aplicarEfeitosDasMelhorias`, ela vazaria para
  // todo lugar — e a frase "o nível manda" passaria a mentir para o jogo normal.
  const normal = {
    ...createImprovementState(),
    vitalityLevel: 3,
    maxHp: 5,
    hp: 5,
    melhoriasFixas: createMelhoriasFixasState()
  };

  const recalculado = aplicarEfeitosDasMelhorias(normal);

  assert.equal(recalculado.vitalityLevel, 3, 'o recálculo mexeu no nível de um jogo normal');
  assert.equal(
    improvementsDe(normal).pickaxeUpgradeLevel,
    0,
    'um jogo normal não tem picareta de graça'
  );
});

// --- o jogo normal não foi afetado ----------------------------------------

test('no jogo normal a morte continua zerando a picareta', () => {
  // A regra nova tem um contra-teste: se ela valesse para qualquer save, o jogo de
  // verdade pararia de perder as melhorias temporárias — que é a regra principal.
  const normal = {
    ...createImprovementState(),
    pickaxeUpgradeLevel: 4,
    pickaxeLevel: 5,
    pickaxePower: 5,
    maxHp: 2,
    hp: 2,
    melhoriasFixas: createMelhoriasFixasState(),
    dev: false
  };

  const depois = morreu(normal);

  assert.equal(depois.pickaxeLevel, 1, 'a picareta sobreviveu no jogo normal');
  assert.equal(depois.pickaxePower, 1);
  assert.equal(depois.pickaxeUpgradeLevel, 0);
});

test('no jogo normal a picareta FIXA continua sobrevivendo', () => {
  // O outro caminho que a exceção poderia ter quebrado: uma picareta escolhida na
  // virada de bioma é fixa, e morre não pode levar. O modo dev é que não zera nada
  // — mas só a picareta de teste, não a que o jogador comprou.
  const normal = {
    ...createImprovementState(),
    pickaxeUpgradeLevel: 3,
    pickaxeLevel: 4,
    pickaxePower: 4,
    maxHp: 2,
    hp: 2,
    melhoriasFixas: { ...createMelhoriasFixasState(), pickaxeUpgradeLevel: 3 },
    dev: false
  };

  const depois = morreu(normal);

  assert.equal(depois.pickaxeLevel, 4, 'a picareta fixa do jogo normal foi perdida');
  assert.equal(depois.pickaxePower, 4);
});

test('um save de teste sem a chave dev e jogo normal, e zera a picareta', () => {
  // Um save antigo não tem a chave. `contaProgresso` só desliga com `true`, então
  // ele conta como jogo normal — e a picareta zerada é o comportamento certo.
  const antigo = {
    ...createImprovementState(),
    pickaxeUpgradeLevel: 9,
    maxHp: 2,
    hp: 2,
    melhoriasFixas: createMelhoriasFixasState()
  };

  const depois = morreu(antigo);

  assert.equal(depois.pickaxeLevel, 1, 'um save sem a marca de teste ganhou picareta de graça');
});
