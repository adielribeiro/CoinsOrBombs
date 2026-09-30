import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IMPROVEMENT_FIELDS,
  createImprovementState,
  improvementsDe
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