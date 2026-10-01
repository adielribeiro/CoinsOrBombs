/**
 * Os tempos da entrada: tela preta, logo, e o que vem depois.
 *
 * ## Por que estes números moram aqui
 *
 * Porque o logo tem uma animação em CSS, e o tempo dela precisa ser **o mesmo** que
 * o tempo que o React deixa ele na tela. A animação é uma folha de estilo e não
 * importa nada de JavaScript; o tempo é um número no `App.jsx` e a folha de estilo
 * não lê nada de JavaScript. O acoplamento é só de conversa, e conversa assim
 * desfaz sozinha: alguém arruma a animação para ficar mais bonita, esquece do
 * tempo, e o logo passa a ser cortado no meio da fade de novo — que é o bug que
 * este arquivo existe para não repetir.
 *
 * O teste em `test/tempos-de-entrada.test.mjs` lê a folha de estilo e confere. É a
 * única leitura de fonte do projeto, e ela é justificável justamente porque é a
 * única forma de verificar um número que mora em dois lugares: o resto da regra do
 * projeto é que teste executa lógica, e esta executa — ela compara dois números
 * declarados e falha quando eles deixam de concordar.
 */

/** Tela preta antes do logo. */
export const BLACK_SCREEN_MS = 900;

/** Quanto tempo o logo fica na tela. A animação do CSS tem que durar isto. */
export const LOGO_FADE_MS = 2200;

/**
 * O instante em que a animação do logo precisa estar **inteira**.
 *
 * Não é o fim: é o ponto onde a fade termina de subir. Enquanto o logo estiver
 * crescendo, ele está apagado, e meia imagem de logo é pior do que nenhuma — a
 * pessoa vê um brilho surgindo sem saber do que se trata.
 *
 * Com 25% da duração, sobe aos 550ms e segura o resto dos 1650ms. O valor é o
 * mesmo número da animação na folha de estilo, e mudar um sem o outro reprova o
 * teste.
 */
export const LOGO_ESTAVEL_EM = 550;

/** A duração da animação do logo, como a folha de estilo escreve. `2.2s` = 2200ms. */
export function milissegundosDe(css) {
  const achado = /animation:\s*splashFade\s+([\d.]+)(m?s)/.exec(css);

  if (!achado) return null;

  return Number(achado[1]) * (achado[2] === 'ms' ? 1 : 1000);
}

/** A porcentagem em que a animação chega na opacidade cheia. */
export function percentualDeEstabilidade(css) {
  const achado = /@keyframes\s+splashFade\s*\{\s*0%\s*\{[^}]*\}\s*(\d+)%\s*\{[^}]*opacity:\s*1/.exec(css);

  if (!achado) return null;

  return Number(achado[1]);
}