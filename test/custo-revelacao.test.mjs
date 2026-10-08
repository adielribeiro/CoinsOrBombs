import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { generateMap } from '../src/game/systems/mapGenerator.js';
import {
  CUSTO_PARA_REVELAR,
  deveTentarRevelar,
  podeRevelarPorPreco,
  saldoDepoisDaRevelacao
} from '../src/game/challenges.js';
import { BIOMES } from '../src/game/progression.js';

/**
 * A melhoria de revelar bomba tem teto, e o teto nasce da renda.
 *
 * ## O defeito
 *
 * `bombRevealChance = nivelDaCarta * 0.1`, e a carta vai até 10 — o nível 10 é **100%**. A
 * revelação dispara a cada pedra quebrada, então numa caverna de 70 pedras com 22 bombas o
 * jogador via as 22 antes de encostar em qualquer uma. Não era uma melhoria: era a remoção
 * do único risco do jogo.
 *
 * Baixar o teto da carta **não resolve**, e é por isso que o limite tem de ser outro: a 30%
 * por pedra ainda saem umas 21 revelações de 22 bombas. O que faltava era teto por caverna.
 *
 * ## A propriedade que este arquivo fixa
 *
 * **A moeda de uma caverna nunca compra revelação para todas as bombas dela.** Verificada nas
 * 60 caves, comparando a renda real do mapa com a contagem real de bombas.
 *
 * É essa afirmação que impede a regressão. Se alguém subir o custo, descer a renda ou mudar
 * a chance, o teste diz qual dos três mexeu — e não é um número solto que quebrou.
 */

const ULTIMA_CAVE = BIOMES[BIOMES.length - 1].endCave;
const RAIZ = process.cwd();

// --- a regra pura ------------------------------------------------------------

test('revelar custa, e o custo é o que limita', () => {
  assert.equal(CUSTO_PARA_REVELAR, 5);
  assert.equal(podeRevelarPorPreco(4), false, 'revelou sem pagar');
  assert.equal(podeRevelarPorPreco(5), true, 'não revelou tendo pago o preço exato');
  assert.equal(podeRevelarPorPreco(0), false);
  assert.equal(podeRevelarPorPreco(undefined), false, 'sem moeda nenhuma o bônus acontece');

  // O saldo novo é função pura, e é por isso que a cobrança é verificável. Numa
  // subtração dentro da cena, apagar a linha deixaria o teste verde — foi o que a
  // conferência por mutação mostrou.
  assert.equal(saldoDepoisDaRevelacao(12), 7);
  assert.equal(saldoDepoisDaRevelacao(5), 0);
  assert.equal(saldoDepoisDaRevelacao(0), 0, 'a revelation nunca vira dívida');

  // O sorteio vem antes do bolso: quem não tem moeda não gasta o sorteio.
  assert.equal(deveTentarRevelar({ chance: 1, coins: 0 }, () => 0), false);
  assert.equal(deveTentarRevelar({ chance: 1, coins: 5 }, () => 0), true);
  assert.equal(deveTentarRevelar({ chance: 0.5, coins: 99 }, () => 0.6), false, 'a taxa falhou');
  assert.equal(deveTentarRevelar({ chance: 0, coins: 99 }, () => 0), false, 'sem taxa não há tentativa');
});

// --- a propriedade, nas 60 cavernas ------------------------------------------

test('a moeda de uma caverna nunca compra revelação para todas as bombas dela', () => {
  // Uma amostra por cave basta: a renda e a contagem de bombas saem do mapa real, e a
  // afirmação é sobre a razão entre elas, que não muda de uma amostra para outra.
  for (let cave = 1; cave <= ULTIMA_CAVE; cave += 1) {
    const mapa = generateMap(cave, 1, 0, 0);
    const tiles = mapa.tiles.flat();
    const bombas = tiles.filter((t) => t.hiddenContent === 'bomb').length;

    if (bombas === 0) continue;

    const moedas = tiles.filter((t) => t.hiddenContent === 'coin').length;
    const compraveis = Math.floor(moedas / CUSTO_PARA_REVELAR);

    assert.ok(
      compraveis < bombas,
      `cave ${cave}: ${moedas} moedas compram ${compraveis} revelações, e há ${bombas} bombas`
    );
  }
});

// --- o que a carta promete ---------------------------------------------------

test('o custo aparece na carta e no aviso, em todos os idiomas', () => {
  // A promessa que não diz o preço é uma emboscada. E o recibo também: sem o custo no aviso,
  // a moeda debitada aparece do nada e ninguém sabe o que comprou.
  const pasta = join(RAIZ, 'src', 'i18n', 'locales');
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.js'));

  assert.ok(arquivos.length >= 10, `achei ${arquivos.length} locales`);

  for (const arquivo of arquivos) {
    const texto = readFileSync(join(pasta, arquivo), 'utf8');
    const descricao = texto.match(/'reward\.bomb\.description':\s*'([^']*)'/);
    const aviso = texto.match(/'msg\.bombRevealed':\s*'([^']*)'/);

    assert.ok(descricao, `${arquivo}: sem descricao da carta`);
    assert.ok(aviso, `${arquivo}: sem aviso de revelacao`);
    assert.ok(descricao[1].includes('{cost}'), `${arquivo}: a carta nao diz o custo`);
    assert.ok(aviso[1].includes('{cost}'), `${arquivo}: o aviso nao diz quanto custou`);
  }
});

test('as cartas que mostram chance mostram a chance certa', () => {
  // Regressão de texto: `chance: nextBomb * 1` imprimia "1%" na carta cujo bônus era 10%. O
  // mesmo erro estava nas cartas de moeda e de rocha, e nenhuma delas tem teste.
  const texto = readFileSync(join(RAIZ, 'src', 'game', 'rewards.js'), 'utf8');

  assert.ok(texto.includes('chance: nextBomb * 10'), 'a carta de bomba mostra 1% em vez de 10%');
  assert.ok(texto.includes('chance: nextCoins * 10'), 'a carta de moeda mostra 1% em vez de 10%');
  assert.ok(texto.includes('chance: nextRocks * 10'), 'a carta de rocha mostra 1% em vez de 10%');
});