import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '@babel/parser';

/**
 * Nenhum identificador usado pode estar sem definição.
 *
 * ## O que este teste existe para impedir
 *
 * Uma versão deste jogo foi publicada com `readSettings is not defined` na tela
 * branca. A causa foi um bloco movido de arquivo, e o garfo levou embora quatro
 * funções que não tinham nada a ver com o movimento: `readSettings`, `readStorage`,
 * `writeStorage` e a lista de chaves removidas.
 *
 * **O `npm run build` passou.** Isso é o que assusta. O esbuild não verifica
 * identificador indefinido: para ele, `readSettings` é um nome qualquer, e um nome
 * que não existe vira uma referência em tempo de execução. O build fica verde, os
 * 270 testes ficam verdes — os testes exercitam `saves.js`, que nunca precisou da
 * função — e o jogo só quebra quando alguém abre a página.
 *
 * Este teste é a verificação que faltava. Ele não confere se o jogo funciona: ele
 * confere que todo nome usado em cada arquivo tem de onde vir.
 */

/**
 * A pasta `src`, como caminho do sistema.
 *
 * Não usar `new URL(...).pathname` e tirar a barra: no Windows o `pathname` é
 * `/C:/Users/...` e a barra é o que separa a letra do resto, mas no Linux é
 * `/home/runner/...` e a barra é a **raiz** do caminho. Tirá-la transforma um
 * caminho absoluto em um relativo que não existe, e o `readdir` estoura.
 *
 * Foi exatamente o que aconteceu: os 281 testes passavam na minha máquina e a CI
 * reprovava, e a diferença era esta linha. `fileURLToPath` faz a conversão
 * corretamente nos dois sistemas, e é para isso que ela existe.
 */
const RAIZ = fileURLToPath(new URL('../src/', import.meta.url));
const ARQUIVOS_JS = /\.(jsx?|mjs)$/;

/** O que o JavaScript dá a um arquivo sem perguntar. */
const GLOBAIS = new Set([
  'Array', 'ArrayBuffer', 'BigInt', 'Boolean', 'console', 'crypto', 'Date',
  'decodeURI', 'decodeURIComponent', 'document', 'encodeURI', 'encodeURIComponent',
  'Error', 'escape', 'eval', 'fetch', 'Function', 'globalThis', 'Infinity', 'isFinite',
  'isNaN', 'JSON', 'localStorage', 'Map', 'Math', 'NaN', 'Number', 'Object',
  'parseFloat', 'parseInt', 'performance', 'Promise', 'Proxy', 'queueMicrotask',
  'Reflect', 'RegExp', 'requestAnimationFrame', 'sessionStorage', 'Set', 'String',
  // Arrays tipados: `ground.js` escreve pixel a pixel e usa `Uint8ClampedArray`.
  'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'Int8Array',
  'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'DataView',
  'structuredClone', 'Symbol', 'TextDecoder', 'TextEncoder', 'undefined', 'URL',
  'URLSearchParams', 'WeakMap', 'WeakSet', 'window', 'navigator', 'screen',
  'cancelAnimationFrame', 'CustomEvent', 'Event', 'AudioContext', 'matchMedia',
  'getComputedStyle', 'ResizeObserver', 'PointerEvent', 'KeyboardEvent', 'alert',
  'confirm', 'prompt', 'clearTimeout', 'setTimeout', 'clearInterval', 'setInterval',
  'requestIdleCallback', 'Image', 'MouseEvent', 'TouchEvent', 'location', 'history',
  'visualViewport', 'CSS', 'HTMLElement', 'DOMParser', 'FileReader', 'Blob',
  'Intl', 'process', 'global', 'require', 'module', '__dirname', '__filename'
]);

/** Arquivos gerados, que ninguém edita e o teste não precisa vigiar. */
const IGNORADOS = new Set([]);

/** Todos os arquivos de código do projeto. */
async function arquivosDeCodigo(dir = RAIZ, achados = []) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);

    if (entrada.isDirectory()) {
      await arquivosDeCodigo(caminho, achados);
      continue;
    }

    if (!ARQUIVOS_JS.test(entrada.name)) continue;
    if (IGNORADOS.has(caminho)) continue;
    achados.push(caminho);
  }

  return achados;
}

/**
 * Todo nome que o arquivo **declara** ou **importa**.
 *
 * Reúne nomes de qualquer profundidade de escopo, e é mais permissivo que o
 * necessário de propósito: um nome declarado dentro de uma função conta como
 * declarado. O custo é não pegar referência fora de escopo; o benefício é não
 * acusar o jogo de erro onde ele está certo. O que precisa pegar aqui é o caso
 * que aconteceu — o nome sumiu do arquivo inteiro — e esse pega sempre.
 */
function nomesDeclarados(arvore) {
  const nomes = new Set();

  // `coletarPadroes` vem ANTES de `push` porque `push` chama. Declaradas na
  // ordem inversa, a primeira chamada de `push` cai em uma variável ainda no TDZ e
  // o teste morre com `ReferenceError` — o mesmo tipo de erro que este teste
  // existe para pegar.
  const coletarPadroes = (padrao) => {
    if (!padrao) return;

    switch (padrao.type) {
      case 'Identifier':
        nomes.add(padrao.name);
        break;
      case 'AssignmentPattern':
        // `const { purchased = [] } = estado` declara `purchased` com o valor
        // padrão quando a propriedade falta. O nome é o da esquerda.
        coletarPadroes(padrao.left);
        break;
      case 'RestElement':
        coletarPadroes(padrao.argument);
        break;
      case 'ArrayPattern':
        for (const el of padrao.elements) coletarPadroes(el);
        break;
      case 'ObjectPattern':
        // `{ a }` — a propriedade tem `value` com o Identifier.
        // `{ a = 1 }` — o `value` é um AssignmentPattern, tratado na chamada
        //   seguinte, porque `coletarPadroes` cai no caso dele.
        // `{ ...resto }` — a propriedade é um RestElement e o nome está em
        //   `argument`, e não em `value`. Sem este `??` o resto some do conjunto
        //   e o próprio nome dele vira "usado e não declarado".
        for (const prop of padrao.properties) {
          coletarPadroes(prop.type === 'RestElement' ? prop.argument : prop.value);
        }
        break;
      default:
        break;
    }
  };

  const push = (n) => {
    if (!n) return;
    if (Array.isArray(n)) {
      for (const x of n) push(x);
      return;
    }
    if (typeof n === 'object' && typeof n.name === 'string') {
      nomes.add(n.name);
      return;
    }

    // `const [a, b] = f()` tem os dois nomes direto dentro de `elements`, sem
    // `value` nem `argument` em volta — o elemento JÁ é o Identifier. Por isso o
    // último recurso é o próprio filho: sem ele, `filho.value ?? filho.argument`
    // dá `undefined`, o `push` volta sem fazer nada, e o destruturing inteiro
    // vira "nome indefinido".
    //
    // Para `{ a }`, o elemento é um ObjectProperty e o nome está em `value`.
    // Para `{ a = 1 }`, é um AssignmentPattern e o nome está em `left`.
    if (n && typeof n === 'object' && (n.type === 'ArrayPattern' || n.type === 'ObjectPattern')) {
      const filhos = n.elements ?? n.properties ?? [];

      for (const filho of filhos) {
        if (!filho) continue;

        // ArrayPattern: o elemento já é o Identifier (`[a, b]`).
        // ObjectPattern: o elemento é um ObjectProperty, e o nome pode estar no
        // `value` (`{ a }`), no `left` de um padrão (`{ a = 1 }`) ou no
        // `argument` de um resto (`{ ...resto }`). `coletarPadroes` sabe dos
        // três, então tudo que for objeto vai por ela.
        if (filho.type === 'ObjectProperty') coletarPadroes(filho.value);
        else if (filho.type === 'ObjectPattern') coletarPadroes(filho);
        else if (filho.type === 'AssignmentPattern') coletarPadroes(filho.left);
        else if (filho.type === 'RestElement') coletarPadroes(filho.argument);
        else if (typeof filho.name === 'string') nomes.add(filho.name);
        else coletarPadroes(filho);
      }
      return;
    }
  };

  // Parâmetro e nome de destruturação também declaram. `function f(chave,
  // fallback)` declara `chave` e `fallback`; sem esta parte o teste acusa os dois
  // em toda chamada. A função está definida lá em cima, antes de `push`.

  const visitar = (no) => {
    if (!no || typeof no.type !== 'string') return;

    switch (no.type) {
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
        push(no.id);
        break;
      case 'VariableDeclarator':
        // `const { hp, biomeName } = estado` DECLARA `hp` e `biomeName`, e
        // `push` recolhe os dois porque em um ObjectPattern os nomes estão
        // dentro de `properties`. Sem este caso o teste acusa o destruturing
        // inteiro — foi o que aconteceu com `gameState`.
        push(no.id);
        break;
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        push(no.id);
        for (const p of no.params) coletarPadroes(p);
        break;
      default:
        break;
    }

    // `catch (error)` declara `error` naquele bloco. Sem isto, todo `catch` com
    // parâmetro nomeado vira "nome indefinido" — e `catch { }` sem nome, que é
    // o padrão do projeto, passa batido e esconde o problema.
    if (no.type === 'CatchClause') coletarPadroes(no.param);

    // `function f(a) {}`, `class C {}` e o método de objeto literal
    // `{ focarPrimeiro() {} }` recebem parâmetros e `superClass`. O método de
    // objeto em forma curta tem o nome em `key`, e não em `id` — sem este caso
    // o próprio nome do método virava "usado e não declarado".
    if (no.type === 'FunctionDeclaration' || no.type === 'ObjectMethod' || no.type === 'ClassMethod') {
      for (const p of no.params ?? []) coletarPadroes(p);
    }

    // O nome do método é uma chave, mas aqui ele DECLARA. Push-lo em `key` é o que
    // faz `focarPrimeiro`, `mover` e `ativar` deixarem de ser fantasmas.
    if (
      (no.type === 'ObjectMethod' || no.type === 'ClassMethod') &&
      !no.computed &&
      no.key?.type === 'Identifier'
    ) {
      nomes.add(no.key.name);
    }

    for (const chave of Object.keys(no)) {
      if (chave === 'loc' || chave === 'leadingComments' || chave === 'trailingComments') continue;

      const valor = no[chave];
      if (Array.isArray(valor)) {
        for (const filho of valor) if (filho && typeof filho.type === 'string') visitar(filho);
      } else if (valor && typeof valor.type === 'string') {
        visitar(valor);
      }
    }
  };

  // `import { a, b as c } from '...'` declara `c` no arquivo. Sem esta parte, todo
  // import vira "usado e não declarado" e o teste acusa o arquivo inteiro.
  for (const no of arvore.program.body) {
    if (no.type !== 'ImportDeclaration') continue;

    for (const spec of no.specifiers) {
      if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
        nomes.add(spec.local.name);
      } else if (spec.type === 'ImportSpecifier') {
        // `b as c` declara `c`, que é o nome que o resto do arquivo usa.
        nomes.add(spec.local.name);
      }
    }
  }

  for (const no of arvore.program.body) visitar(no);
  return nomes;
}

/** Todo nome que o arquivo **usa** como valor, e não como propriedade. */
function nomesUsados(arvore) {
  const usados = new Map(); // nome -> linha, para a mensagem de falha

  const registrar = (no, linha) => {
    if (usados.has(no.name)) return;
    usados.set(no.name, linha);
  };

  // Chave de objeto literal: `{ maxHp: 3 }` é propriedade, não referência.
  const ehChaveDePropriedade = (pai, filho) =>
    pai?.type === 'ObjectProperty' && pai.key === filho && !pai.computed;

  const visitar = (no, pai) => {
    if (!no || typeof no.type !== 'string') return;

    switch (no.type) {
      case 'Identifier':
        if (!ehChaveDePropriedade(pai, no)) registrar(no, no.loc?.start?.line ?? 0);
        break;
      case 'JSXIdentifier': {
        // `<Componente />` é um nome do arquivo. `props.Componente` não é: em
        // `<React.StrictMode>` o que o arquivo usa é `React`, e `StrictMode` é
        // uma propriedade desse objeto — que o JSX não marca como tal, por isso
        // o JSXMemberExpression abaixo trata.
        if (no.name && /^[A-Z]/.test(no.name)) registrar({ name: no.name }, no.loc?.start?.line ?? 0);
        break;
      }
      case 'JSXMemberExpression':
        // `<React.StrictMode>` usa `React`. O pedaço depois do ponto é
        // propriedade, igual ao `a.b` do JavaScript.
        visitar(no.object, no);
        return;
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        // `a.b.c` e `a?.b.c` usam `a`. O que vem depois do ponto é propriedade de
        // `a` e não um nome do arquivo: `window.localStorage`, `estado.maxHp`,
        // `state?.collection`. Sem parar aqui o teste acusa `localStorage`,
        // `maxHp`, `collection` — centenas de vezes, e ninguém lê o resultado.
        visitar(no.object, no);
        if (no.computed) visitar(no.property, no);
        return;
      case 'ObjectProperty':
      case 'ObjectMethod':
        // A chave nunca é visitada: `{ hp: 2 }` nomeia uma propriedade, e
        // `{ hp }` (atalho) tem a chave e o valor no mesmo nó, que o passo do
        // `value` abaixo trata como uso. Só a chave computada
        // (`{ [algo]: 1 }`) é uma referência de verdade.
        if (no.computed) visitar(no.key, no);
        visitar(no.value, no);
        break;
      case 'ImportSpecifier':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
        break; // o nome importado é uso E declaração
      case 'ExportSpecifier':
        break;
      case 'TSTypeReference':
      case 'TSTypeAnnotation':
        break;
      default:
        break;
    }

    for (const chave of Object.keys(no)) {
      if (chave === 'loc' || chave === 'leadingComments' || chave === 'trailingComments') continue;

      const valor = no[chave];
      if (Array.isArray(valor)) {
        for (const filho of valor) if (filho && typeof filho.type === 'string') visitar(filho, no);
      } else if (valor && typeof valor.type === 'string') {
        visitar(valor, no);
      }
    }
  };

  for (const no of arvore.program.body) visitar(no, null);
  return usados;
}

const arquivos = await arquivosDeCodigo();

test('todo nome usado em cada arquivo tem de onde vir', async () => {
  assert.ok(arquivos.length > 5, `só achei ${arquivos.length} arquivos — o teste não está olhando o código`);

  const problemas = [];

  for (const caminho of arquivos) {
    const fonte = await readFile(caminho, 'utf8');
    const relativo = caminho.slice(RAIZ.length).replace(/\\/g, '/');

    let arvore;
    try {
      arvore = parse(fonte, {
        sourceType: 'module',
        plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties'],
        errorRecovery: true
      });
    } catch (erro) {
      // O build já cobre sintaxe. Não é o trabalho deste teste.
      continue;
    }

    const declarados = nomesDeclarados(arvore);
    const usados = nomesUsados(arvore);

    for (const [nome, linha] of usados) {
      if (declarados.has(nome)) continue;
      if (GLOBAIS.has(nome)) continue;

      problemas.push(`${relativo}:${linha} — "${nome}" é usado e não é declarado nem importado`);
    }
  }

  assert.deepEqual(
    problemas,
    [],
    `nomes sem definição:\n  ${problemas.join('\n  ')}`
  );
});

test('o teste acima realmente pega um nome que sumiu', () => {
  // Sem este contra-teste, o teste principal passa a valer nada: bastava ele
  // estar silenciosamente vazio — lista de arquivos errada, plugin de JSX
  // faltando, `visit` não descendo em lugar nenhum — e nenhum nome apareceria
  // para acusar. É o mesmo teste que valida a si mesmo.
  const antes = `
    const a = 1;
    function f() { return a + naoExisteEmLugarNenhum; }
    export { f };
  `;

  const arvore = parse(antes, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  const declarados = nomesDeclarados(arvore);
  const usados = nomesUsados(arvore);

  assert.ok(declarados.has('a'), 'o contra-teste nem achou a declaração que existe');
  assert.ok(!declarados.has('naoExisteEmLugarNenhum'));
  assert.ok(usados.has('naoExisteEmLugarNenhum'), 'o contra-teste não viu o nome indefinido');
  assert.ok(usados.has('a'), 'o contra-teste não viu o nome que existe');
});

test('o contra-teste não acusa propriedade nem chave de objeto', () => {
  // Um analisador que acusasse `maxHp` em `{ maxHp: 3 }` acusaria centenas de
  // coisas no jogo inteiro e ninguém leria o resultado. Aqui a lista tem de
  // passar limpa.
  const fonte = `
    const estado = { maxHp: 2, hp: 2 };
    const total = estado.maxHp + estado.hp;
    function soma(a, b) { return a + b; }
    export { estado, total, soma };
  `;

  const arvore = parse(fonte, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  const usados = nomesUsados(arvore);

  assert.ok(!usados.has('maxHp'), 'acusou maxHp, que é só chave de objeto');
  assert.ok(!usados.has('hp'), 'acusou hp, que é só chave de objeto');
  assert.ok(usados.has('soma'), 'não viu a chamada de soma');
});
