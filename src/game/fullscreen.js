/**
 * Fullscreen com awareness de plataforma.
 *
 * Duas restrições que moldaram este arquivo:
 *
 * 1. `requestFullscreen()` só funciona dentro de um gesto do usuário. Como a
 *    intro do jogo roda em `setTimeout`, pedir fullscreen depois dela é
 *    sempre recusado pelo navegador. O pedido precisa sair do mesmo clique
 *    que entra na run.
 *
 * 2. iOS Safari não implementa Fullscreen API (fora do video e do iPadOS
 *    mais recente). Não dá para "fazer fullscreen" lá — o caminho real é o
 *    app instalado via PWA, que roda sem chrome de navegador. Por isso
 *    `describeFullscreenError` distingue "não suportado" de "recusado", e a
 *    UI só sugere o PWA quando é esse o caso.
 */

const REQUEST = 'requestFullscreen';
const EXIT = 'exitFullscreen';
const ELEMENT = 'fullscreenElement';
const ENABLED = 'fullscreenEnabled';
const CHANGE = 'fullscreenchange';
const WEBKIT_CHANGE = 'webkitfullscreenchange';

function doc() {
  return typeof document === 'undefined' ? null : document;
}

function el(node) {
  return node && node.nodeType === 1 ? node : (doc()?.documentElement ?? null);
}

function target() {
  const d = doc();
  if (!d) return null;
  return d[ELEMENT] ?? d.webkitFullscreenElement ?? null;
}

export function isFullscreenSupported() {
  const node = el();
  if (!node) return false;

  return Boolean(node[REQUEST] || node.webkitRequestFullscreen);
}

export function isFullscreenActive() {
  return Boolean(target());
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** iPhone/iPad, incluindo o iPadOS 13+ que se apresenta como Mac. */
export function isIosLike() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const iOSDevice = /iP(hone|ad|od)/.test(ua) || /iPhone|iPad|iPod/.test(ua);
  const iPadPretendingToBeMac = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;

  return iOSDevice || iPadPretendingToBeMac;
}

export function enterFullscreen(node) {
  const element = el(node);

  if (!element || isFullscreenActive()) return Promise.resolve(true);

  const request = element[REQUEST] || element.webkitRequestFullscreen;

  if (!request) {
    return Promise.reject(
      isIosLike()
        ? { reason: 'ios' }
        : { reason: 'unsupported' }
    );
  }

  try {
    // Navegadores antigos devolvem void em vez de Promise.
    const result = request.call(element, { navigationUI: 'hide' });
    return result && typeof result.then === 'function' ? result : Promise.resolve(true);
  } catch (error) {
    return Promise.reject({ reason: 'gesture', error });
  }
}

export function exitFullscreen() {
  const d = doc();

  if (!d || !isFullscreenActive()) return Promise.resolve(true);

  const exit = d[EXIT] || d.webkitExitFullscreen;

  if (!exit) return Promise.resolve(false);

  try {
    const result = exit.call(d);
    return result && typeof result.then === 'function' ? result : Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export function toggleFullscreen(node) {
  return isFullscreenActive() ? exitFullscreen() : enterFullscreen(node);
}

/** Assina mudanças de fullscreen (inclusive as variantes com prefixo do Safari). */
export function onFullscreenChange(handler) {
  const d = doc();
  const win = typeof window === 'undefined' ? null : window;

  if (!d) return () => {};

  const onViewport = () => handler();

  d.addEventListener(CHANGE, handler);
  d.addEventListener(WEBKIT_CHANGE, handler);
  win?.addEventListener('orientationchange', onViewport);
  win?.addEventListener('resize', onViewport);

  return () => {
    d.removeEventListener(CHANGE, handler);
    d.removeEventListener(WEBKIT_CHANGE, handler);
    win?.removeEventListener('orientationchange', onViewport);
    win?.removeEventListener('resize', onViewport);
  };
}

/**
 * Converte a falha em algo que a UI consiga explicar. Sem isto o jogador
 * só vê "algo deu errado" e não sabe que precisa girar o celular, instalar
 * o app, ou que o navegador simplesmente não permite.
 */
export function describeFullscreenError(failure) {
  const reason = failure?.reason;

  if (reason === 'ios') {
    return {
      code: 'ios',
      message:
        'No iPhone e no iPad o Safari não tem tela cheia. Adicione o jogo à Tela de Início para jogar sem a barra do navegador.'
    };
  }

  if (reason === 'unsupported') {
    return {
      code: 'unsupported',
      message: 'Este navegador não oferece tela cheia para a web. Nada foi alterado.'
    };
  }

  if (reason === 'gesture') {
    return {
      code: 'gesture',
      message: 'O navegador recusou a tela cheia. Toque em "Tela cheia" para tentar de novo.'
    };
  }

  return {
    code: 'denied',
    message: 'Não foi possível entrar em tela cheia. Use o botão de tela cheia no canto inferior.'
  };
}
