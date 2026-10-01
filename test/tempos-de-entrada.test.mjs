import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  BLACK_SCREEN_MS,
  LOGO_ESTAVEL_EM,
  LOGO_FADE_MS,
  milissegundosDe,
  percentualDeEstabilidade
} from '../src/game/temposDeEntrada.js';

/**
 * O logo e o tempo que ele fica na tela não podem discordar.
 *
 * ## O bug que estes testes impedem de voltar
 *
 * A animação do logo durava 3s e o React o mantinha na tela por 2,2s. A conta dá
 * 0,71 de opacidade no instante em que o logo sumia: ele nunca aparecia inteiro,
 * numa tela que existe justamente para ser mostrada uma vez e ser notada. Quem
 * nunca viu a fade inteira não sabe que ela existe — e o sintoma é "a cena não
 * sobe", que parece absence, não corte.
 *
 * ## Por que estes testes leem a folha de estilo
 *
 * Porque é a única forma de verificar um número que mora em dois lugares. A
 * animação é CSS e o tempo é JavaScript, e nenhum dos dois lê o outro. O resto da
 * regra do projeto é que teste executa lógica em vez de casar com texto do fonte,
 * e estes testes também executam: eles convertem a duração escrita em CSS para
 * milissegundos e comparam com o número que o React usa.
 *
 * A leitura é do arquivo **compilado por nós**, não de um texto qualquer, e o alvo
 * é um número. Se a folha de estilo deixar de ter a animação, `milissegundosDe`
 * devolve `null` e o teste reprova — em vez de passar por não ter encontrado o que
 * procurar.
 */

const raiz = fileURLToPath(new URL('../', import.meta.url));

async function css() {
  return readFile(fileURLToPath(new URL('../src/styles/app.css', import.meta.url)), 'utf8');
}

test('a animação do logo dura exatamente o tempo que o React deixa ele na tela', async () => {
  const duracao = milissegundosDe(await css());

  assert.notEqual(
    duracao,
    null,
    'a folha de estilo não tem `animation: splashFade <duração>`. Sem animação o '
      + 'logo fica com o `opacity: 0` da regra estática e nunca aparece.'
  );

  assert.equal(
    duracao,
    LOGO_FADE_MS,
    `a animação dura ${duracao}ms e o logo fica ${LOGO_FADE_MS}ms na tela. `
      + 'A diferença é tempo de logo cortado — ou tempo de tela em preto depois '
      + 'que o logo já foi.'
  );
});

test('o logo fica inteiro antes de a fase terminar', async () => {
  // Esta é a asserção que pegaria o bug original. A opacidade precisa chegar a 1
  // **dentro** do tempo em que o logo está montado, com folga para o olho.
  const percentual = percentualDeEstabilidade(await css());

  assert.notEqual(percentual, null, 'a animação não tem um keyframe com `opacity: 1`');

  const sobeEm = (LOGO_FADE_MS * percentual) / 100;

  assert.equal(sobeEm, LOGO_ESTAVEL_EM, `o logo só fica inteiro aos ${sobeEm}ms`);
  assert.ok(
    sobeEm < LOGO_FADE_MS * 0.6,
    `o logo só aparece inteiro aos ${sobeEm}ms de ${LOGO_FADE_MS}ms. `
      + 'Passa mais da metade da tela subindo, e meia imagem é pior do que nenhuma.'
  );
});

test('a conversão da folha de estilo entende as duas unidades', () => {
  // O minificador escreve `2.2s` e a mão escreve `2200ms`. Se a função só
  // entendesse uma das duas, o teste passaria com `null` e o bug real ficaria
  // sem cobertura nenhuma — que é como uma checagem se torna decorativa.
  assert.equal(milissegundosDe('animation: splashFade 2.2s ease forwards'), 2200);
  assert.equal(milissegundosDe('animation: splashFade 2200ms ease forwards'), 2200);
  assert.equal(milissegundosDe('animation: splashFade 3s ease forwards'), 3000);
  assert.equal(milissegundosDe('animation: outraCoisa 2.2s ease'), null, 'casou com a animação errada');
  assert.equal(milissegundosDe('sem animação nenhuma'), null);
});

test('o percentual de estabilidade só conta o keyframe que tem `opacity: 1`', () => {
  // O `0%` também é um keyframe. Um regex que pegasse o primeiro número do
  // bloco leria `0`, e a conta daria zero — e zero "passa" numa comparação mal
  // escrita, que é o pior jeito de um teste falhar.
  assert.equal(
    percentualDeEstabilidade('@keyframes splashFade { 0% { opacity: 0 } 25% { opacity: 1 } to { opacity: 1 } }'),
    25
  );
  assert.equal(percentualDeEstabilidade('@keyframes splashFade { from { opacity: 0 } to { opacity: 1 } }'), null);
  assert.equal(percentualDeEstabilidade('@keyframes splashFade { 0% { opacity: 0 } }'), null);
});

test('a tela preta não é mais longa que a entrada inteira', () => {
  // Sanidade do orçamento: preto + logo não pode estourar, e o preto existe
  // junto com o logo (ele era a cobertura da troca). Sem logo, o preto vira uma
  // pausa sem nada para ver — que é o motivo de o `App.jsx` pular os dois juntos.
  assert.ok(BLACK_SCREEN_MS > 0, 'sem tela preta o logo entra colado no menu');
  assert.ok(
    BLACK_SCREEN_MS + LOGO_FADE_MS <= 4000,
    `a entrada dura ${BLACK_SCREEN_MS + LOGO_FADE_MS}ms antes do jogo começar`
  );
});