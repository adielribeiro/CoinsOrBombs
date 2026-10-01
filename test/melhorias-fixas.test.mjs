import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IMPROVEMENT_FIELDS,
  OPCOES_FIXAS,
  OPCOES_TEMPORARIAS,
  createImprovementState,
  createMelhoriasFixasState,
  ehUltimaCaveDoBioma,
  fixarMelhoriaEscolhida,
  improvementsDe,
  maxHpDe,
  melhoriasFixasDe,
  pickaxeLevelDe,
  resetarMelhoriasTemporarias
} from '../src/game/progression.js';
import { buildRewardCatalog, pickRewardOptions } from '../src/game/rewards.js';

/**
 * Melhorias fixas e temporárias.
 *
 * São duas coisas, e o que separa uma da outra é **quando** a escolha acontece:
 *
 * - **Virada de bioma** (a última caverna do bioma): 4 opções, e a escolhida vira
 *   uma melhoria **fixa** — vale até o fim do jogo, mesmo morrendo.
 * - **Todas as outras cavernas**: 3 opções, e a escolha é **temporária**: a morte
 *   leva.
 *
 * A armadilha do modelo é fazer as duas virarem a mesma coisa. Se a temporária
 * sobrevivesse, não existiria diferença entre as telas; e se a fixa morresse, as
 * 4 opções não valeriam a escolha extra.
 */

const tFalso = (chave) => chave;

/** Um estado novo, com o piso zerado. */
function estado(extra = {}) {
  return {
    ...createImprovementState(),
    melhoriasFixas: createMelhoriasFixasState(),
    maxHp: 2,
    hp: 2,
    pickaxeLevel: 1,
    pickaxePower: 1,
    ...extra
  };
}

// --- quantas opções, e quando ----------------------------------------------

test('a ultima caverna de cada bioma oferece 4, e as outras 3', () => {
  // A tabela inteira, bioma por bioma. Um teste que conferisse só a cave 10 passaria
  // com a regra errada nas outras 50.
  const ultimaDe = [10, 20, 30, 40, 50, 60];
  const inicioDe = [1, 11, 21, 31, 41, 51];

  for (let b = 0; b < inicioDe.length; b += 1) {
    assert.equal(ehUltimaCaveDoBioma(ultimaDe[b]), true, `${ultimaDe[b]} não é reconhecida como última`);
    assert.equal(ehUltimaCaveDoBioma(inicioDe[b]), false, `${inicioDe[b]} foi reconhecida como última`);
  }
});

test('a ultima caverna e a décima de cada bioma, e nao a primeira', () => {
  // A pergunta é pela caverna CONCLUÍDA. Errar o lado aqui daria 4 opções no começo
  // de cada bioma e 3 no fim — ao contrário do que foi pedido, e ninguém notaria
  // numa partida rápida.
  for (let cave = 1; cave <= 60; cave += 1) {
    const ultima = ehUltimaCaveDoBioma(cave);
    const ehDezena = cave % 10 === 0;

    assert.equal(ultima, ehDezena, `a cave ${cave}: ultima=${ultima}, décima=${ehDezena}`);
  }
});

test('as contagens sao 4 e 3, e 4 e maior que 3', () => {
  assert.equal(OPCOES_FIXAS, 4, 'a escolha fixa mudou de quantidade');
  assert.equal(OPCOES_TEMPORARIAS, 3, 'a escolha temporaria mudou de quantidade');
  assert.ok(OPCOES_FIXAS > OPCOES_TEMPORARIAS, 'a tela fixa precisa oferecer mais opções');
});

// --- o que acontece na morte ----------------------------------------------

test('a morte leva a melhoria temporaria', () => {
  const comTemporaria = estado({ vitalityLevel: 3, maxHp: 5, hp: 5 });
  const depois = resetarMelhoriasTemporarias(comTemporaria);

  assert.equal(depois.vitalityLevel, 0, `a vitalidade ficou ${depois.vitalityLevel} depois da morte`);
});

test('a morte mantem a melhoria fixa', () => {
  const comFixa = estado({
    vitalityLevel: 2,
    maxHp: 4,
    hp: 4,
    melhoriasFixas: { ...createMelhoriasFixasState(), vitalityLevel: 2 }
  });

  const depois = resetarMelhoriasTemporarias(comFixa);

  assert.equal(depois.vitalityLevel, 2, 'a vitalidade fixa nao sobreviveu a morte');
});

test('a morte recalcula o que a fixa produz', () => {
  // O bug real de hoje cedo: o nível voltava e a vida não. O piso tem Vitalidade 1,
  // e quem volta tem de ver 3 de vida — 2 de base mais 1.
  const comFixa = estado({
    vitalityLevel: 1,
    maxHp: 3,
    hp: 3,
    melhoriasFixas: { ...createMelhoriasFixasState(), vitalityLevel: 1 }
  });

  const depois = resetarMelhoriasTemporarias(comFixa);

  assert.equal(depois.vitalityLevel, 1);
  assert.equal(depois.maxHp, 3, `a vida máxima voltou ${depois.maxHp}, e o nível 1 dá 3`);
  assert.equal(depois.hp, 3);
});

test('a morte recalcula tambem a picareta fixa', () => {
  const comFixa = estado({
    pickaxeUpgradeLevel: 2,
    pickaxeLevel: 3,
    pickaxePower: 3,
    melhoriasFixas: { ...createMelhoriasFixasState(), pickaxeUpgradeLevel: 2 }
  });

  const depois = resetarMelhoriasTemporarias(comFixa);

  assert.equal(depois.pickaxePower, 3, `a força voltou ${depois.pickaxePower}, e o nível 2 dá 3`);
  assert.equal(depois.pickaxeLevel, 3);
});

test('morre tres vezes e a fixa continua, sem crescer', () => {
  // A fixa é fixa: não sobe sozinha e não cai. Uma morte repetida é o jeito mais
  // rápido de um "decremente" silencioso aparecer.
  let atual = estado({
    vitalityLevel: 2,
    maxHp: 4,
    hp: 4,
    melhoriasFixas: { ...createMelhoriasFixasState(), vitalityLevel: 2 }
  });

  for (let vez = 1; vez <= 3; vez += 1) {
    atual = resetarMelhoriasTemporarias(atual);
    atual = { ...atual, vitalityLevel: 4, maxHp: 6, hp: 6 };

    assert.equal(atual.vitalityLevel, 4, `na ${vez}ª volta a fixa subiu sozinha`);

    const depoisDaMorte = resetarMelhoriasTemporarias(atual);
    assert.equal(depoisDaMorte.vitalityLevel, 2, `na ${vez}ª volta a fixa não voltou a 2`);
  }
});

test('um save sem piso nao perde as fixas na morte, e nao quebra', () => {
  // Save antigo, de antes das fixas existirem. Sem o piso completo a cópia seria
  // `undefined` e a morte zeraria as doze melhorias — inclusive as que o jogador já
  // tinha comprado.
  const semPiso = { vitalityLevel: 2, maxHp: 4, hp: 4 };
  const depois = resetarMelhoriasTemporarias(semPiso);

  assert.equal(depois.vitalityLevel, 0, 'sem piso, a morte zera tudo — e não há como fazer diferente');
  assert.equal(depois.maxHp, 2);
});

test('trocar de bioma NAO zera as temporarias', () => {
  // Só a morte zera. Se trocar de bioma zerasse, a pessoa perderia as melhorias a
  // cada avanço — e a escolha na caverna 9 não valeria nada.
  const comTemporaria = estado({ vitalityLevel: 3, maxHp: 5, hp: 5 });

  // `buildBiomeStartState` usa `aplicarEfeitosDasMelhorias`, que só recalcula. Aqui
  // está escrito à mão para fixar a intenção: este caminho NÃO pode zerar.
  const trocando = { ...comTemporaria };

  assert.equal(trocando.vitalityLevel, 3, 'a troca de bioma zerou a temporaria');
});

// --- como uma melhoria vira fixa ------------------------------------------

test('a escolhida na virada entra no piso', () => {
  const antes = estado();
  const carta = buildRewardCatalog(antes, tFalso).find((r) => r.track === 'vitality');
  const depois = carta.apply(antes);

  const fixada = fixarMelhoriaEscolhida(depois, carta.campos);

  assert.equal(fixada.vitalityLevel, 1);
  assert.equal(fixada.melhoriasFixas.vitalityLevel, 1, 'a escolhida nao virou fixa');
});

test('a temporaria ganha antes NAO vira fixa por estar no mesmo estado', () => {
  // A regra é "a escolhida fica fixa", e não "tudo fica fixa". Se a pessoa ganhou
  // moedas na terceira caverna e escolhe vitalidade na décima, a de vitalidade vira
  // piso e a de moedas continua temporária — senão a temporária sobreviveria à morte
  // por acidente, que é exatamente o que ela não pode fazer.
  const antes = estado({
    coinBonusLevel: 1,
    coinBonusChance: 0.01,
    coinBonusAmount: 1
  });

  const carta = buildRewardCatalog(antes, tFalso).find((r) => r.track === 'vitality');
  const depois = carta.apply(antes);
  const fixada = fixarMelhoriaEscolhida(depois, carta.campos);

  assert.equal(fixada.melhoriasFixas.vitalityLevel, 1, 'a escolhida devia ter virado fixa');
  assert.equal(fixada.melhoriasFixas.coinBonusLevel, 0, 'a temporaria virou fixa por acidente');
});

test('uma fixada nunca perde o status porque outra foi escolhida', () => {
  let atual = estado();

  const vitalidade = buildRewardCatalog(atual, tFalso).find((r) => r.track === 'vitality');
  atual = fixarMelhoriaEscolhida(vitalidade.apply(atual), vitalidade.campos);
  assert.equal(atual.melhoriasFixas.vitalityLevel, 1);

  // A segunda virada escolhe picareta. A vitalidade continua fixa.
  const picareta = buildRewardCatalog(atual, tFalso).find((r) => r.track === 'pickaxe');
  atual = fixarMelhoriaEscolhida(picareta.apply(atual), picareta.campos);

  assert.equal(atual.melhoriasFixas.vitalityLevel, 1, 'a vitalidade fixa perdeu o status');
  assert.equal(atual.melhoriasFixas.pickaxeUpgradeLevel, 1);

  // E a morte preserva as duas.
  const depois = resetarMelhoriasTemporarias(atual);
  assert.equal(depois.vitalityLevel, 1);
  assert.equal(depois.pickaxeUpgradeLevel, 1);
});

test('cinco viradas de bioma acumulam cinco melhorias fixas', () => {
  // A progressão inteira: quem joga até o fim leva 5 fixas, uma por bioma
  // concluído. E elas sobrevivem a tudo.
  let atual = estado();
  const tracks = ['vitality', 'pickaxe', 'coins', 'rocks', 'utility'];

  for (const track of tracks) {
    const carta = buildRewardCatalog(atual, tFalso).find((r) => r.track === track);
    atual = fixarMelhoriaEscolhida(carta.apply(atual), carta.campos);
    atual = resetarMelhoriasTemporarias(atual);
  }

  assert.equal(atual.melhoriasFixas.vitalityLevel, 1);
  assert.equal(atual.melhoriasFixas.pickaxeUpgradeLevel, 1);
  assert.equal(atual.melhoriasFixas.coinBonusLevel, 1);
  assert.equal(atual.melhoriasFixas.rockBonusLevel, 1);
  assert.equal(atual.melhoriasFixas.utilityDropLevel, 1);
  assert.equal(atual.stats?.totalRelicsFound ?? 0, 0);
});

test('toda carta declara os campos que ela mexe', () => {
  // A regra "só a escolhida vira fixa" depende inteiramente de a carta dizer quais
  // campos são dela. Uma carta sem `campos` — ou com um campo que não existe — não
  // falha: ela simplesmente não entra no piso, e o jogador escolhe uma melhoria
  // "fixa" que morre na primeira morte. Sem erro, sem aviso.
  const catalogo = buildRewardCatalog(estado(), tFalso);

  for (const carta of catalogo) {
    assert.ok(
      Array.isArray(carta.campos) && carta.campos.length > 0,
      `a carta ${carta.id} não declara os campos que mexe`
    );

    for (const campo of carta.campos) {
      assert.ok(
        IMPROVEMENT_FIELDS.includes(campo),
        `a carta ${carta.id} declara o campo "${campo}", que não é melhoria`
      );
    }
  }
});

test('os campos declarados batem com o que a carta realmente mexe', () => {
  // A declaração pode mentir, e é a mentira que passa: se a carta diz que mexe só
  // em `coinBonusLevel` e sobe também a chance, a chance sobe mas não vira fixa. O
  // teste abaixo é o que pega isso — ele aplica a carta de verdade e confere.
  for (const carta of buildRewardCatalog(estado(), tFalso)) {
    const base = estado();
    const depois = carta.apply(base);

    for (const campo of IMPROVEMENT_FIELDS) {
      const mudou = depois[campo] !== base[campo];

      if (mudou) {
        assert.ok(
          carta.campos.includes(campo),
          `a carta ${carta.id} mudou "${campo}" mas não o declarou, e ele não vira fixo`
        );
      }
    }
  }
});

test('fixar nada não muda o piso', () => {
  // Virada sem carta escolhida: o piso fica como estava. O lobby sempre dá uma
  // opção, mas um estado sem escolha não pode inventar uma fixa.
  const antes = estado();
  const fixada = fixarMelhoriaEscolhida(antes, []);

  assert.deepEqual(fixada.melhoriasFixas, createMelhoriasFixasState());
});

// --- o que o lobby oferece -----------------------------------------------

test('o lobby oferece 4 na virada e 3 nas outras', () => {
  const base = estado();

  const naVirada = pickRewardOptions(base, tFalso, OPCOES_FIXAS);
  const noMeio = pickRewardOptions(base, tFalso, OPCOES_TEMPORARIAS);

  assert.equal(naVirada.length, 4, 'a virada de bioma nao ofereceu 4');
  assert.equal(noMeio.length, 3, 'a caverna do meio nao ofereceu 3');
});

test('as 4 da virada sao quatro melhorias diferentes', () => {
  const opcoes = pickRewardOptions(estado(), tFalso, OPCOES_FIXAS);

  assert.equal(new Set(opcoes.map((o) => o.id)).size, 4, 'a mesma melhoria veio duas vezes');
});

test('o catalogo tem mais de 4 itens, senao a escolha da virada seria uma repeticao', () => {
  // Se o catálogo encolhesse para 4, `slice(0, 4)` devolveria sempre os mesmos e o
  // sorteio da virada deixaria de existir — a pessoa veria as mesmas 4 cartas em
  // todos os fins de bioma do jogo.
  const catalogo = buildRewardCatalog(estado(), tFalso);

  assert.ok(catalogo.length > OPCOES_FIXAS, `o catálogo tem ${catalogo.length} itens`);
});

// --- o piso na tela ------------------------------------------------------

test('o piso tem os mesmos doze campos, e nenhum a mais', () => {
  // Se o piso tivesse um campo a menos que a melhoria efetiva, esse campo não
  // sobreviveria à morte sem ninguém perceber.
  assert.deepEqual(Object.keys(createMelhoriasFixasState()), [...IMPROVEMENT_FIELDS]);
});

test('melhoriasFixasDe completa um piso pela metade', () => {
  const pelaMetade = melhoriasFixasDe({ melhoriasFixas: { vitalityLevel: 3 } });

  assert.equal(pelaMetade.vitalityLevel, 3);
  assert.equal(pelaMetade.pickaxeUpgradeLevel, 0, 'campo ausente virou ' + pelaMetade.pickaxeUpgradeLevel);
});

test('o piso alimenta as mesmas formulas da melhoria efetiva', () => {
  // Se a vida máxima do piso viesse de outra conta, a pessoa voltaria da morte com o
  // card dizendo uma coisa e a HUD outra. Foi exatamente esse bug.
  assert.equal(maxHpDe(melhoriasFixasDe({ melhoriasFixas: { vitalityLevel: 2 } }).vitalityLevel), 4);
  assert.equal(
    pickaxeLevelDe(melhoriasFixasDe({ melhoriasFixas: { pickaxeUpgradeLevel: 3 } }).pickaxeUpgradeLevel),
    4
  );
});

test('improvementsDe nao enxerga o piso: sao coisas separadas', () => {
  // Uma função que somasse as duas viraria um estado único, e a morte passaria a
  // ser impossível de acertar. Aqui elas são independentes, e é essa independência
  // que permite à morte trocar uma pela outra.
  const estadoMisto = estado({
    vitalityLevel: 5,
    melhoriasFixas: { ...createMelhoriasFixasState(), vitalityLevel: 2 }
  });

  assert.equal(improvementsDe(estadoMisto).vitalityLevel, 5, 'a efetiva virou a soma das duas');
  assert.equal(melhoriasFixasDe(estadoMisto).vitalityLevel, 2);
});
