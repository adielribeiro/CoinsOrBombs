/**
 * O splash da ArchangelSoft, e a regra que decide quando ele aparece.
 *
 * ## O que mudou duas vezes
 *
 * O splash vinha depois de 900ms de tela preta, e os dois se repetiam toda vez que
 * o jogador saía do menu principal para entrar numa cave: mais de três segundos de
 * intro para entrar no jogo, toda sessão. A complaint foi de repetitividade, e ela
 * procedia — a intro é uma coisa de primeira vez, não de cada entrada.
 *
 * A primeira correção foi **uma vez por navegador**. Funcionou contra a
 * repetitividade e criou o outro problema: quem jogou uma vez parou de ver o logo
 * para sempre, e uma tela nova que só aparece para quem ainda não jogou é uma tela
 * que não existe para o público que importa.
 *
 * ## Onde está agora
 *
 * **Uma vez por versão do jogo.** O storage guarda a versão em que o splash foi
 * visto. Enquanto os números batem, ele não repete — a reclamação de
 * repetitividade continua resolvida. Quando a versão sobe, ele volta para todo
 * mundo, que é o que faz uma mudança de tela ser vista por quem já jogou.
 *
 * ## Por que o preto vai junto
 *
 * Ele não era uma transição: ele era a cobertura entre o menu e o logo. Tirando
 * o logo, sobra um segundo e meio de tela preta antes do jogo, que é a pior das
 * duas leituras — uma pausa sem nada para ver. Ele existe junto com o splash ou não
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

/**
 * O que o storage guarda: a versão em que o splash foi visto.
 *
 * ## Por que a versão, e não um "sim"
 *
 * Com `sim` a marca era de "use para sempre", e o efeito prático foi o oposto do
 * que se queria: quem jogou uma vez parou de ver o splash para sempre, inclusive
 * depois de três versões novas. Quem já tinha jogado e depois recebeu "a cena da
 * ArchangelSoft não sobe" tem razão nos dois lados — a cena estava lá, o storage
 * só não tinha como dizer que era outra coisa.
 *
 * Guardando a versão, o splash volta **quando o jogo muda** e não volta quando
 * a pessoa abre o jogo de novo. É o meio-termo entre as duas reclamações: a
 * repetitividade que motivou a mudança original era de sessão para sessão, e essa
 * continua resolvida.
 *
 * ## O valor antigo (`sim`) conta como "de outra versão"
 *
 * Quem já tinha `sim` gravado vai ver o splash uma última vez, e a partir daí a
 * marca vira a versão de verdade. Sem isso, quem já jogou seria o único público que
 * nunca vê o logo novo — que é justamente quem mais devia ver.
 */
export const INTRO_VISTO = 'sim';

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
 * O splash já foi mostrado **nesta versão**?
 *
 * `false` quando não dá para saber, e `false` é o lado que o jogo erra para o
 * lado certo: mostrar o splash de novo custa dois segundos e meio, e esconder o
 * splash de quem nunca viu tira a única coisa que ele existe para fazer.
 *
 * ## Sem versão, o jogo erra para o lado de mostrar
 *
 * `versaoAtual` vazio significaria que a comparação é impossível, e devolver
 * `true` esconderia o splash de todo mundo — que é o modo de falha que ninguém
 * percebe. Por isso o padrão é `'0'`, e `'0'` nunca é a versão de ninguém.
 */
export function introJaVista(armazenamento, versaoAtual) {
  const storage = storageDe(armazenamento);
  if (!storage) return false;

  const versao = String(versaoAtual ?? '').trim();
  if (!versao) return false;

  try {
    const guardado = storage.getItem(INTRO_SEEN_KEY);
    if (guardado === null) return false;

    return guardado === versao;
  } catch {
    return false;
  }
}

/** Marca o splash como visto **nesta versão**. */
export function marcarIntroVista(armazenamento, versaoAtual) {
  const storage = storageDe(armazenamento);
  if (!storage) return false;

  // A versão é normalizada na escrita, não só na leitura. Um espaço acidental em
  // `GAME_VERSION` gravaria uma marca que nunca mais casaria com a versão lida, e
  // o efeito seria o splash não voltar nunca mais — silenciosamente, porque
  // comparar strings diferentes dá `false` e `false` é o lado que mostra.
  const versao = String(versaoAtual ?? INTRO_VISTO).trim();

  try {
    storage.setItem(INTRO_SEEN_KEY, versao);
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
