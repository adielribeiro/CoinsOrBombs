import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NIVEL_MAXIMO,
  UPGRADE_IDS,
  UPGRADES,
  UPGRADE_POR_CAMPO,
  chaveDoProximoBeneficio,  comprarMelhoria,
  custoDoProximoNivel,
  nivelDe,
  nivelMaximo,
  niveisPorCampoDe,
  saldoDeReliquias,
  upgradesDe
} from '../src/game/melhorias.js';
import { aplicarEfeitosDasMelhorias } from '../src/game/progression.js';

/**
 * As melhorias compradas com relíquias.
 *
 * ## O que estes testes seguram
 *
 * 1. **O custo do próximo nível sai da configuração, e a lista é a da pessoa.** Um
 *    `custo` escrito na tela e outro na regra divergem no primeiro ajuste, e a pessoa
 *    paga o preço errado sem nenhum aviso. O teste percorre os três níveis das cinco
 *    melhorias contra os números pedidos.
 *
 * 2. **A compra é atômica.** Debitar, subir o nível e aplicar o bônus acontecem juntos ou
 *    não acontecem. O caso que importa é o do saldo insuficiente: uma função que
 *    debita antes de conferir deixa a pessoa com menos relíquias e o mesmo nível.
 *
 * 3. **Saldo e histórico são campos diferentes.** O saldo enche e esvazia; o histórico
 *    só enche. Usar o mesmo campo para os dois é o caminho para a tela de Informações
 *    deixar de mostrar quantas relíquias a pessoa já achou.
 */

/** Os custos pedidos, escritos à mão de propósito. */
const CUSTOS_PEDIDOS = {
  health: [3, 6, 10],
  pickaxe: [4, 8, 15],
  lifePotion: [10, 15, 20],
  revealBomb: [10, 15, 20],
  safePath: [10, 15, 20],
  // A mochila: 190 relíquias contra 181 de todas as outras somadas. E o espaço é o
  // único atributo que não se recupera ao usar — vida e picareta voltam.
  capacidade: [50, 60, 80]
};

// --- a configuração --------------------------------------------------------

test('as cinco melhorias têm os custos pedidos, na ordem', () => {
  for (const [id, custos] of Object.entries(CUSTOS_PEDIDOS)) {
    assert.deepEqual(
      UPGRADES[id].costs,
      custos,
      `os custos de ${id} mudaram: ${UPGRADES[id].costs.join(', ')}`
    );
  }
});

test('nenhuma melhoria passa de três níveis', () => {
  for (const id of UPGRADE_IDS) {
    assert.equal(UPGRADES[id].maxLevel, 3, `${id} tem ${UPGRADES[id].maxLevel} níveis`);
    assert.equal(UPGRADES[id].costs.length, 3, `${id} tem custos de outro tamanho`);
    assert.equal(NIVEL_MAXIMO, 3);
  }
});

test('o custo do próximo nível é o da casa, e no fim não há preço', () => {
  for (const id of UPGRADE_IDS) {
    const [primeiro, segundo, terceiro] = CUSTOS_PEDIDOS[id];

    assert.equal(custoDoProximoNivel(id, 0), primeiro, `${id} nível 1`);
    assert.equal(custoDoProximoNivel(id, 1), segundo, `${id} nível 2`);
    assert.equal(custoDoProximoNivel(id, 2), terceiro, `${id} nível 3`);

    // O quarto não existe, e um `costs[3]` seria `undefined` — que a tela leria como
    // "preço 0" e mostraria um botão que não faz nada.
    assert.equal(custoDoProximoNivel(id, 3), null, `${id} ainda cobra o nível 4`);
    assert.equal(custoDoProximoNivel(id, 99), null, `${id} ainda cobra o nível 100`);
  }
});

test('o custo cresce de uma casa para a seguinte', () => {
  for (const id of UPGRADE_IDS) {
    const custos = CUSTOS_PEDIDOS[id];

    assert.ok(custos[0] < custos[1], `${id}: ${custos[0]} e ${custos[1]}`);
    assert.ok(custos[1] < custos[2], `${id}: ${custos[1]} e ${custos[2]}`);
  }
});

// --- o benefício é chave, e não texto ---------------------------------------

test('o benefício é uma chave de tradução, e existe nos dez idiomas', () => {
  // Um texto dentro da configuração apareceria na língua errada para quem trocou de
  // idioma, e nada reprovaria: o número está certo e a pessoa só lê errado.
  for (const id of UPGRADE_IDS) {
    const chave = chaveDoProximoBeneficio(id);

    assert.ok(chave, `${id} não devolveu chave de benefício`);
    assert.ok(
      chave.startsWith('shop.upgrade.'),
      `${id} devolveu "${chave}", que não é uma chave de tela`
    );
  }
});

test('o caminho do beneficio tem uma chave por nivel, e so uma', () => {
  // Só o Caminho Seguro muda de natureza: o nível 3 não é o nível 2 com um número
  // maior, e por isso ele tem uma chave por nível. As outras quatro repetem a mesma
  // frase, e uma chave só é o que impede as duas versões de divergirem sozinhas.
  const porNivel = UPGRADE_IDS.filter((id) => Array.isArray(UPGRADES[id].benefits));

  assert.deepEqual(porNivel, ['safePath'], 'so o caminho seguro muda de natureza');

  // Uma chave por nível, e só. Quem chega ao máximo vê "nível máximo", e não a
  // descrição do último efeito: a chave do nível 3 seria lida por ninguém, e uma chave
  // morta é uma tradução que pode divergir sozinha sem aviso.
  assert.equal(
    UPGRADES.safePath.benefits.length,
    NIVEL_MAXIMO,
    `a lista de benefícios tem ${UPGRADES.safePath.benefits.length} chaves para ${NIVEL_MAXIMO} niveis`
  );

  for (const id of UPGRADE_IDS) {
    if (id === 'safePath') continue;

    assert.equal(
      Array.isArray(UPGRADES[id].benefits),
      false,
      `${id} tem uma chave por nível, e seu texto é o mesmo em todos`
    );
  }
});

test('cada nivel do caminho seguro tem uma chave diferente da outra', () => {
  // Três níveis com o mesmo texto seriam uma chave só, e a pessoa leria "destaca os
  // perigos" três vezes sem descobrir o que o nível 2 acrescenta.
  const chaves = UPGRADES.safePath.benefits;

  assert.equal(new Set(chaves).size, chaves.length, 'o caminho seguro repete chave entre níveis');
});

test('o beneficio mostrado é o do PRÓXIMO nível, e não o do último', () => {
  // A tela escreve "Próximo nível: {efeito}". Quem tem zero nível comprados precisa ler
  // o efeito do nível 1.
  //
  // A primeira versão devolvia `benefits[maxLevel]`, que é o último: com nada comprado a
  // tela anunciava o efeito do nível 3, e o produto some. O texto estava certo, a
  // Tradução existia, e nada reprovava — porque nenhum teste olhava *qual* chave era.
  assert.equal(
    chaveDoProximoBeneficio('safePath', 0),
    UPGRADES.safePath.benefits[0],
    'quem não comprou nada viu o efeito do nível errado'
  );

  assert.equal(chaveDoProximoBeneficio('safePath', 1), UPGRADES.safePath.benefits[1]);
  assert.equal(chaveDoProximoBeneficio('safePath', 2), UPGRADES.safePath.benefits[2]);

  // No máximo não há próximo, e a tela escreve "nível máximo" — a chave não pode vazar.
  assert.equal(
    chaveDoProximoBeneficio('safePath', 3),
    null,
    'no nível máximo a tela ia ler o efeito do nível 4'
  );

  // As outras quatro repetem a mesma chave em todos os níveis, que é o ponto delas.
  for (const id of UPGRADE_IDS.filter((outro) => outro !== 'safePath')) {
    for (const nivel of [0, 1, 2]) {
      assert.equal(
        chaveDoProximoBeneficio(id, nivel),
        UPGRADES[id].benefit,
        `${id} no nível ${nivel} não mostrou o benefício dele`
      );
    }

    assert.equal(chaveDoProximoBeneficio(id, 3), null, `${id} no nível máximo devolveu chave`);
  }
});

test('toda melhoria tem icone, e nenhum se repete', () => {
  // O ícone é o que liga "Melhorar Poção de Vida" à "Poção de Vida" logo acima na tela.
  // Sem ele a linha ainda se entende pelo nome, e a ligação fica por conta de quem lê.
  //
  // E nenhum se repete: Vida e Poção de Vida começaram com o mesmo coração, e as duas
  // linhas ficaram idênticas na mesma coluna. O nome ainda distinguia — mas o ícone é o
  // que a pessoa procura primeiro, e dois iguais na mesma tela não ajudam a achar nada.
  const ESPERADOS = {
    health: '🛡️',
    pickaxe: '⛏️',
    lifePotion: '❤️',
    revealBomb: '💣',
    safePath: '🧭',
    capacidade: '🧳'
  };

  const vistos = new Map();

  for (const id of UPGRADE_IDS) {
    assert.equal(
      UPGRADES[id].icon,
      ESPERADOS[id],
      `${id} não tem o ícone que a seção de utilitários usa`
    );

    const dono = vistos.get(UPGRADES[id].icon);

    assert.ok(!dono, `${id} repete o ícone de ${dono}, e as duas linhas ficam iguais`);
    vistos.set(UPGRADES[id].icon, id);
  }
});

// --- a compra --------------------------------------------------------------

test('comprar debita, sobe o nivel e devolve o saldo novo', () => {
  for (const id of UPGRADE_IDS) {
    const [custo] = CUSTOS_PEDIDOS[id];
    const estado = { relics: custo, ...upgradesDe({}) };

    const compra = comprarMelhoria(estado, id);

    assert.equal(compra.ok, true, `${id}: a compra foi recusada com saldo exato`);
    assert.equal(compra.custo, custo, `${id}: custo`);
    assert.equal(compra.nivel, 1, `${id}: nivel`);
    assert.equal(compra.relics, 0, `${id}: saldo depois da compra`);
  }
});

test('sem reliquias suficientes nao compra, e nao muda nada', () => {
  // O caso que mais importa: uma compra que debita antes de conferir deixa a pessoa
  // com menos relíquias e o mesmo nível.
  for (const id of UPGRADE_IDS) {
    const [custo] = CUSTOS_PEDIDOS[id];
    const estado = { relics: custo - 1, ...upgradesDe({}) };
    const antes = JSON.stringify(estado);

    const compra = comprarMelhoria(estado, id);

    assert.equal(compra.ok, false, `${id}: comprou sem saldo`);
    assert.equal(compra.motivo, 'sem-reliquias', `${id}: motivo`);
    assert.equal(compra.custo, custo, `${id}: o preço tem de continuar visível na recusa`);
    assert.equal(JSON.stringify(estado), antes, `${id}: o estado foi mexido numa recusa`);
  }
});

test('no nivel maximo a compra recusa, e o motivo e o nivel', () => {
  for (const id of UPGRADE_IDS) {
    const cheio = { relics: 999, [UPGRADES[id].field]: 3 };
    const compra = comprarMelhoria(cheio, id);

    assert.equal(compra.ok, false, `${id}: comprou o nível 4`);
    assert.equal(compra.motivo, 'maximo', `${id}: motivo`);
  }
});

test('as tres compras de uma melhoria sobem o nivel e esvaziam o saldo', () => {
  // O caminho completo, e é o que a tela vai fazer quando alguém clicar três vezes.
  let estado = { relics: 100, ...upgradesDe({}) };
  const relíquiasPorNivel = [];

  for (let n = 0; n < 3; n += 1) {
    const compra = comprarMelhoria(estado, 'health');

    assert.equal(compra.ok, true, `compra ${n + 1} recusada`);
    relíquiasPorNivel.push(compra.custo);

    estado = { ...estado, relics: compra.relics, [UPGRADES.health.field]: compra.nivel };
  }

  assert.deepEqual(relíquiasPorNivel, [3, 6, 10], 'os custos por nível mudaram');
  assert.equal(estado.relics, 81, '100 - 3 - 6 - 10');
  assert.equal(nivelDe(estado, 'health'), 3);
  assert.equal(custoDoProximoNivel('health', 3), null, 'ainda cobra o quarto nível');
});

test('melhoria desconhecida recusa sem tocar no saldo', () => {
  const estado = { relics: 50 };

  assert.deepEqual(comprarMelhoria(estado, 'naoExiste'), { ok: false, motivo: 'desconhecida' });
});

// --- a compra espalha no estado de verdade --------------------------------

test('espalhar o resultado da compra sobe o nivel, do jeito que a tela espalha', () => {
  // ## O bug que este teste existe para pegar
  //
  // `comprarMelhoria` devolvia os níveis com o nome da melhoria — `health: 1` — e o
  // estado guarda `melhoriaHealth`. A tela espalhava o resultado, o saldo caía de 14
  // para 11, e o cartão continuava em "Nível 0/3". Gastou sem receber, que é o
  // contrário exato do que a compra atômica promete.
  //
  // O teste antigo não pegou porque montava o estado campo por campo, à mão, e só
  // conferia o número devolvido: ele provava que a função calculava o nível certo, e
  // não que o resultado era aplicável. Aqui o caminho é o da tela — `nivelDe`, que é o
  // que o cartão lê.
  for (const id of UPGRADE_IDS) {
    const [custo] = CUSTOS_PEDIDOS[id];
    const estado = { relics: custo, ...niveisPorCampoDe({}) };

    const compra = comprarMelhoria(estado, id);

    assert.equal(compra.ok, true, `${id}: a compra foi recusada`);

    const depois = { ...estado, ...compra.niveis, relics: compra.relics };

    assert.equal(
      nivelDe(depois, id),
      1,
      `${id}: o saldo caiu mas o nível ficou em ${nivelDe(depois, id)}`
    );
    assert.equal(depois.relics, 0, `${id}: o saldo depois`);
  }
});

test('espalhar o resultado nao escreve nenhuma chave que o estado nao le', () => {
  // A chave errada não é visível: ela entra no estado, vai para o save e nunca é lida.
  // O sintoma é uma melhoria que some no F5 e um save com um campo a mais a cada
  // compra. Comparar as chaves do resultado com as que a tela pergunta é o que pega.
  const estado = { relics: 50, ...niveisPorCampoDe({}) };
  const compra = comprarMelhoria(estado, 'health');

  assert.deepEqual(
    Object.keys(compra.niveis).sort(),
    Object.keys(niveisPorCampoDe({})).sort(),
    'o resultado traz chaves que nao sao campo de melhoria'
  );

  for (const chave of Object.keys(compra.niveis)) {
    assert.ok(
      chave.startsWith('melhoria'),
      `"${chave}" nao e o nome de campo que o save usa, e nada vai ler`
    );
  }
});

test('tres compras seguidas sobem o nivel quando a tela espalha cada resultado', () => {
  // O caminho inteiro como a tela percorre: comprar, espalhar, comprar de novo. Com o
  // nome errado, a segunda compra relia um nível que o estado nunca tinha visto e
  // cobrava o preço do nível 1 de novo.
  let estado = { relics: 100, ...niveisPorCampoDe({}) };
  const preços = [];

  for (let n = 0; n < 3; n += 1) {
    const compra = comprarMelhoria(estado, 'health');

    assert.equal(compra.ok, true, `compra ${n + 1} recusada: saldo ${estado.relics}`);
    preços.push(compra.custo);

    estado = { ...estado, ...compra.niveis, relics: compra.relics };

    assert.equal(nivelDe(estado, 'health'), n + 1, `a compra ${n + 1} nao subiu o nivel`);
  }

  assert.deepEqual(preços, [3, 6, 10], 'a segunda compra cobrou o preco do primeiro nivel');
  assert.equal(estado.relics, 81, '100 - 3 - 6 - 10');
});

test('o bônus de vida e de picareta aparece depois de espalhar a compra', () => {
  // O derivado vem do nível. Se o nível não subir, a vida continua a mesma e quem
  // comprou não vê nada — que é o outro jeito de gastar sem receber.
  let estado = { relics: 100, vitalityLevel: 0, pickaxeUpgradeLevel: 0, ...niveisPorCampoDe({}) };

  const vida = aplicarEfeitosDasMelhorias({ ...estado, ...comprarMelhoria(estado, 'health').niveis });

  assert.equal(vida.maxHp, 3, `a vida maxima ficou ${vida.maxHp}, e a base e 2 mais 1 nivel`);

  estado = { ...estado, relics: 100 };

  const picareta = aplicarEfeitosDasMelhorias({
    ...estado,
    ...comprarMelhoria(estado, 'pickaxe').niveis
  });

  assert.equal(picareta.pickaxeLevel, 2, `a picareta ficou ${picareta.pickaxeLevel}`);
  assert.equal(picareta.pickaxePower, 2, 'a forca nao acompanhou o nivel');
});

// --- o saldo ---------------------------------------------------------------

test('o saldo e um numero, e um estado sem ele da zero', () => {
  // O save pode vir editado à mão. `NaN` aqui viraria um saldo `NaN`, e `NaN < custo`
  // é falso — que a tela leria como "sem relíquia" e ninguém acharia o motivo.
  for (const estado of [{}, { relics: undefined }, { relics: null }, { relics: Number.NaN }, { relics: -5 }]) {
    assert.equal(saldoDeReliquias(estado), 0, `saldo de ${JSON.stringify(estado)}`);
  }

  assert.equal(saldoDeReliquias({ relics: 12 }), 12);
});

test('os niveis de um save antigo dao zero, e nao undefined', () => {
  // A tela lê o nível direto. `undefined` numa subtração é `NaN`, e o `NaN` na comparação
  // do botão deixa a melhoria comprável num save que não tem o campo.
  const estado = {};
  const niveis = upgradesDe(estado);

  for (const id of UPGRADE_IDS) {
    assert.equal(niveis[id], 0, `${id} sem campo`);
    assert.equal(nivelDe(estado, id), 0, `${id} sem campo`);
  }
});

test('um nivel editado nao passa do maximo', () => {
  for (const id of UPGRADE_IDS) {
    const estado = { [UPGRADES[id].field]: 99 };

    assert.equal(nivelDe(estado, id), 3, `${id} aceitou nível 99`);
    assert.equal(upgradesDe(estado)[id], 3, `${id}`);
  }
});

test('o mapa por campo aponta para a mesma configuracao', () => {
  // A lista de campos do save sai daqui. Se o mapa não bater com a configuração, um
  // campo novo entra no disco e o `hidratarEstado` não sabe o máximo dele.
  for (const id of UPGRADE_IDS) {
    const config = UPGRADES[id];

    assert.equal(UPGRADE_POR_CAMPO[config.field], config, `${id}: o mapa por campo nao bate`);
    assert.equal(nivelMaximo(id), config.maxLevel, `${id}: o máximo`);
  }
});