/**
 * O splash da ArchangelSoft, e a vez única em que ele aparece.
 *
 * ## O que mudou
 *
 * O splash vinha depois de 900ms de tela preta, e os dois se repetiam toda vez que
 * o jogador saía do menu principal para entrar numa cave: mais de três segundos de
 * intro para entrar no jogo, toda sessão. A complaint foi de repetitividade, e ela
 * procedia — a intro é uma coisa de primeira vez, não de cada entrada.
 *
 * Agora o splash aparece **uma vez por navegador**. A marca é salva, e depois
 * disso a entrada vai do menu direto para a caverna, sem preto e sem logo.
 *
 * ## Por que o preto vai junto
 *
 * Ele não era uma transição: ele era a cobertura entre o menu e o logo. Tirando
 * o logo, sobra um segundo e meio de tela preta antes do jogo, que é a pior das
 * duas leituras — uma pausa sem nada para ver. Ele existe junto do splash ou não
 * existe.
 *
 * ## Por que isto é um módulo e não duas funções no `App.jsx`
 *
 * Porque a regra é testável aqui e não seria lá dentro. Uma verificação sobre o
 * texto do `App.jsx` só confirma que a palavra certa está presente — foi
 * exatamente esse tipo de teste que passou enquanto o `BootScene` iterava um
 * identificador inexistente. Aqui a lógica roda de verdade, com um storage
 * falso, e o que se afirma é o que acontece: marca, lê, e o que acontece quando
 * o storage não existe.
 */

const INTRO_SEEN_KEY = 'coinsorbombs:intro-seen:v1';

/** O storage de quem chamar. `null` quando não há browser, ou ele não deixa. */
function storageDe(armazenamento) {
  if (armazenamento) return armazenamento;
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    // Modo privado com storage bloqueado: um `getItem` que lança é o jeito mais
    // comum, e ele não pode derrubar o jogo.
    return null;
  }
}

/**
 * O splash já foi mostrado neste navegador?
 *
 * `false` quando não dá para saber, e `false` é o lado que o jogo erra para o
 * lado certo: mostrar o splash de novo custa dois segundos e meio, e esconder o
 * splash de quem nunca viu tira a única coisa que ele existe para fazer.
 */
export function introJaVista(armazenamento) {
  const storage = storageDe(armazenamento);
  if (!storage) return false;

  try {
    return storage.getItem(INTRO_SEEN_KEY) === 'sim';
  } catch {
    return false;
  }
}

/** Marca o splash como visto, para as próximas entradas não mostrarem. */
export function marcarIntroVista(armazenamento) {
  const storage = storageDe(armazenamento);
  if (!storage) return false;

  try {
    storage.setItem(INTRO_SEEN_KEY, 'sim');
    return true;
  } catch {
    return false;
  }
}

/** Desmarca. Só existe para os testes e para um "ver a intro de novo". */
export function desmarcarIntroVista(armazenamento) {
  const storage = storageDe(armazenamento);
  if (!storage) return;

  try {
    storage.removeItem(INTRO_SEEN_KEY);
  } catch {
    // Sem storage não há o que desmarcar.
  }
}

export { INTRO_SEEN_KEY };
