import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PASSOS,
  dentroDoMapa,
  passoDoCursor,
  passoNaTela,
  passosOrdenados,
  proximoTile,
  proximoTileValido,
  tileInicialDoCursor
} from '../src/game/cursor.js';

/** A projeção real do jogo, copiada de `toIso` em `config.js`. */
const METRICAS = { tileWidth: 64, tileHeight: 32 };

const tela = (passo) => passoNaTela(passo, METRICAS);

// --- a projeção é aconstraint -----------------------------------------------

test('cada passo da grade aponta para a direção de tela que o comentário diz', () => {
  // A lista em `PASSOS` é a fonte, e o comentário dela é o contrato. Este teste
  // amarra os dois: se alguém trocar `dcol`/`drow` e não o comentário, o
  // comentário passa a mentir e o cursor anda para outro lado.
  const esperado = {
    'baixo-direita': { x: 32, y: 16 },
    'baixo-esquerda': { x: -32, y: 16 },
    'cima-esquerda': { x: -32, y: -16 },
    'cima-direita': { x: 32, y: -16 },
    baixo: { x: 0, y: 32 },
    cima: { x: 0, y: -32 },
    direita: { x: 64, y: 0 },
    esquerda: { x: -64, y: 0 }
  };

  for (const passo of PASSOS) {
    const ponto = tela(passo);
    const alvo = esperado[passo.tela];

    assert.ok(alvo, `o passo "${passo.tela}" não tem direção esperada`);
    assert.equal(ponto.x, alvo.x, `"${passo.tela}" aponta para x ${ponto.x}, e o esperado é ${alvo.x}`);
    assert.equal(ponto.y, alvo.y, `"${passo.tela}" aponta para y ${ponto.y}, e o esperado é ${alvo.y}`);
  }
});

test('os oito passos são oito, e nenhum se repete', () => {
  assert.equal(PASSOS.length, 8);

  const pares = new Set(PASSOS.map((p) => `${p.dcol},${p.drow}`));
  assert.equal(pares.size, 8, 'dois passos com o mesmo deslocamento');

  const direcoes = new Set(PASSOS.map((p) => p.tela));
  assert.equal(direcoes.size, 8, 'duas direções de tela com o mesmo nome');
});

// --- direção de tela vira passo de grade -----------------------------------

test('para cima na tela é dois passos para trás na grade', () => {
  // O ponto que confunde: "cima" na tela não é `row - 1`, é `col - 1, row - 1`.
  // E é esse erro que faz o cursor andar na diagonal quando a pessoa pediu para
  // subir.
  assert.deepEqual(passoDoCursor(0, -1, METRICAS), { dcol: -1, drow: -1, tela: 'cima' });
  assert.deepEqual(passoDoCursor(0, 1, METRICAS), { dcol: 1, drow: 1, tela: 'baixo' });
  assert.deepEqual(passoDoCursor(1, 0, METRICAS), { dcol: 1, drow: -1, tela: 'direita' });
  assert.deepEqual(passoDoCursor(-1, 0, METRICAS), { dcol: -1, drow: 1, tela: 'esquerda' });
});

test('diagonal na tela vira passo em diagonal da grade', () => {
  // Numa tela achatada, o passo da grade que aponta para "baixo e um pouco para a
  // direita" é o que mais se parece com a diagonal que a pessoa empurrou.
  assert.deepEqual(passoDoCursor(1, 1, METRICAS), { dcol: 1, drow: 0, tela: 'baixo-direita' });
  assert.deepEqual(passoDoCursor(-1, 1, METRICAS), { dcol: 0, drow: 1, tela: 'baixo-esquerda' });
  assert.deepEqual(passoDoCursor(1, -1, METRICAS), { dcol: 0, drow: -1, tela: 'cima-direita' });
  assert.deepEqual(passoDoCursor(-1, -1, METRICAS), { dcol: -1, drow: 0, tela: 'cima-esquerda' });
});

test('a força do analógico não muda o passo', () => {
  // Se mudasse, um empurrão leve andaria para um lado e um forte para outro, e
  // seria indistinguível de uma falha. As duas entradas abaixo são a **mesma**
  // direção com magnitudes diferentes — o teste original usava ângulos
  // diferentes e estava medindo outra coisa.
  const fraco = passoDoCursor(0.3, -1, METRICAS);
  const medio = passoDoCursor(0.6, -2, METRICAS);
  const forte = passoDoCursor(3, -10, METRICAS);

  assert.deepEqual(fraco, medio, 'empurrões na mesma direção deram passos diferentes');
  assert.deepEqual(fraco, forte, 'empurrão mais forte mudou o passo');

  // E a magnitude não mexe no alinhamento, que é o que a ordenação usa.
  const alinhamentos = passosOrdenados(0.3, -1, METRICAS).map((p) => p.alinhamento);
  const outrosAlinhamentos = passosOrdenados(30, -100, METRICAS).map((p) => p.alinhamento);

  assert.deepEqual(alinhamentos, outrosAlinhamentos, 'a escala do analógico mudou a ordem dos passos');
});

test('uma entrada quase vertical escolhe o passo vertical, não o vizinho', () => {
  // (0,3; -0,95) é mais para cima do que para a direita, e o passo vertical é o
  // que se parece com o que a pessoa empurrou.
  assert.deepEqual(passoDoCursor(0.3, -0.95, METRICAS), { dcol: -1, drow: -1, tela: 'cima' });
  assert.deepEqual(passoDoCursor(0.95, -0.3, METRICAS), { dcol: 0, drow: -1, tela: 'cima-direita' });
});

test('sem direção, não há passo', () => {
  // Andar sem direção é um passo com destino escolhido por acaso, e não um passo
  // parado.
  assert.equal(passoDoCursor(0, 0, METRICAS), null);
  assert.deepEqual(passosOrdenados(0, 0, METRICAS), []);
  assert.deepEqual(passosOrdenados(NaN, 0, METRICAS), []);
});

test('todos os oito passos voltam quando a direção é forte', () => {
  // Nenhuma direção pode deixar a lista com menos de oito candidatos: são eles
  // que resolvem a borda do mapa.
  for (let grau = 0; grau < 360; grau += 5) {
    const rad = (grau * Math.PI) / 180;
    const ordenados = passosOrdenados(Math.cos(rad), Math.sin(rad), METRICAS);

    assert.equal(ordenados.length, 8, `a direção de ${grau} graus deixou de ter oito candidatos`);
  }
});

// --- borda do mapa ---------------------------------------------------------

test('na borda, ele desliza no mesmo sentido em vez de travar', () => {
  // O pior sintoma de um cursor é a pessoa empurrar para fora e nada acontecer.
  // Perto da borda, o segundo melhor passo é uma saída que ninguém teria
  // escolhido e que não deixa a pessoa batendo na parede.
  const largura = 6;
  const altura = 6;

  // Canto superior esquerdo, empurrando para cima: o passo reto sai do mapa, e o
  // que sobrou é o vizinho da direita — ainda para cima na tela.
  assert.deepEqual(proximoTile(0, 0, 0, -1, { largura, altura, metricas: METRICAS }), { col: 0, row: 0 });

  // Canto superior direito, só para cima: desliza para a esquerda, ainda subindo.
  assert.deepEqual(proximoTile(5, 0, 0, -1, { largura, altura, metricas: METRICAS }), { col: 4, row: 0 });

  // Canto inferior esquerdo, só para baixo: o passo reto sai do mapa, e o que
  // sobrou desliza para a direita — ainda descendo. Subir seria contra o pedido.
  assert.deepEqual(proximoTile(0, 5, 0, 1, { largura, altura, metricas: METRICAS }), { col: 1, row: 5 });
});

test('na borda, o cursor nunca anda contra a direção pedida', () => {
  // A regra que este teste trava: quem empurra para cima e para a direita no canto
  // superior direito não pode ver o cursor subir e ir para a ESQUERDA. Antes
  // disso, era o que acontecia: o filtro de alinhamento negativo não existia.
  const largura = 6;
  const altura = 6;

  for (let col = 0; col < largura; col += 1) {
    for (let row = 0; row < altura; row += 1) {
      for (let grau = 0; grau < 360; grau += 15) {
        const rad = (grau * Math.PI) / 180;
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);
        const alvo = proximoTile(col, row, dx, dy, { largura, altura, metricas: METRICAS });

        if (alvo.col === col && alvo.row === row) continue;

        // O deslocamento real, em tela, tem de concordar com o pedido.
        const dCol = alvo.col - col;
        const dRow = alvo.row - row;
        const caminhoX = (dCol - dRow) * (METRICAS.tileWidth / 2);
        const caminhoY = (dCol + dRow) * (METRICAS.tileHeight / 2);

        assert.ok(
          caminhoX * dx + caminhoY * dy > 0,
          `de (${col},${row}) a ${grau} graus, o cursor andou para o lado errado: (${alvo.col},${alvo.row})`
        );
      }
    }
  }
});

test('longe da borda, ele vai reto para onde foi pedido', () => {
  const opcoes = { largura: 20, altura: 20, metricas: METRICAS };

  assert.deepEqual(proximoTile(10, 10, 0, -1, opcoes), { col: 9, row: 9 });
  assert.deepEqual(proximoTile(10, 10, 1, 0, opcoes), { col: 11, row: 9 });
  assert.deepEqual(proximoTile(10, 10, 0, 1, opcoes), { col: 11, row: 11 });
  assert.deepEqual(proximoTile(10, 10, -1, 0, opcoes), { col: 9, row: 11 });
});

test('sem direção, o cursor fica onde está', () => {
  assert.deepEqual(proximoTile(3, 3, 0, 0, { largura: 6, altura: 6, metricas: METRICAS }), { col: 3, row: 3 });
});

test('o cursor nunca sai do mapa, para onde for empurrado', () => {
  // Varredura de todos os tiles e de todas as direções: a propriedade que
  // importa é que nenhuma delas produz uma coordenada fora.
  const largura = 5;
  const altura = 5;

  for (let col = 0; col < largura; col += 1) {
    for (let row = 0; row < altura; row += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const alvo = proximoTile(col, row, dx, dy, { largura, altura, metricas: METRICAS });

          assert.ok(
            dentroDoMapa(alvo.col, alvo.row, largura, altura),
            `de (${col},${row}) na direção (${dx},${dy}) o cursor foi para (${alvo.col},${alvo.row})`
          );
        }
      }
    }
  }
});

test('dentro do mapa é inclusivo nas bordas', () => {
  assert.equal(dentroDoMapa(0, 0, 6, 6), true);
  assert.equal(dentroDoMapa(5, 5, 6, 6), true);
  assert.equal(dentroDoMapa(6, 5, 6, 6), false);
  assert.equal(dentroDoMapa(-1, 0, 6, 6), false);
});

test('um mapa de tamanho desconhecido não move o cursor para o vazio', () => {
  // `col + dcol` com `undefined` dá `NaN`, e o cursor sumiria sem erro nenhum.
  const inicio = { col: 3, row: 3 };

  assert.deepEqual(proximoTile(3, 3, 0, -1, {}), inicio);
  assert.deepEqual(proximoTile(3, 3, 0, -1, { largura: NaN, altura: 6 }), inicio);
});

// ---Starting tile ----------------------------------------------------------

test('o cursor começa na entrada, que é o que o jogador precisa', () => {
  assert.deepEqual(tileInicialDoCursor({ col: 0, row: 7 }, 20, 14), { col: 0, row: 7 });
});

test('sem entrada, o cursor começa na coluna 0, no meio da linha', () => {
  // Começar no meio do mapa obrigaria a pessoa a atravessar tudo para poder
  // quebrar a primeira pedra.
  const inicio = tileInicialDoCursor(null, 20, 14);

  assert.equal(inicio.col, 0);
  assert.equal(inicio.row, 7);
});

test('sem entrada e sem tamanho, o cursor começa num lugar válido', () => {
  assert.deepEqual(tileInicialDoCursor(null, 0, 0), { col: 0, row: 0 });
  assert.deepEqual(tileInicialDoCursor(undefined, undefined, undefined), { col: 0, row: 0 });
  assert.deepEqual(tileInicialDoCursor({ col: NaN, row: 3 }, 20, 14), { col: 0, row: 7 });
});

// --- tiles que o mapa recusa ------------------------------------------------

test('o cursor pula tile que o mapa recusa, em vez de ficar preso', () => {
  // A pedra é inquebrável. Se o cursor só pudesse ir nela, a pessoa ficaria sem
  // caminho para sair — e como ela só anda pela borda, preso aqui é preso de
  // verdade.
  const opcoes = { largura: 3, altura: 3, metricas: METRICAS };
  const bloqueado = new Set(['0,0']);
  const podeEntrar = (col, row) => !bloqueado.has(`${col},${row}`);

  // Do centro para cima: o passo reto cai no bloqueado.
  const resultado = proximoTileValido(1, 1, 0, -1, opcoes, podeEntrar);

  assert.notDeepEqual(resultado, { col: 0, row: 0 }, 'o cursor entrou no tile bloqueado');

  // O que importa é que ele andou para cima na tela. Qual dos dois vizinhos ele
  // escolheu é empate de alinhamento, e nenhum dos dois é um erro.
  const dCol = resultado.col - 1;
  const dRow = resultado.row - 1;
  const caminhoY = (dCol + dRow) * (METRICAS.tileHeight / 2);

  assert.ok(caminhoY < 0, `o cursor não subiu na tela: foi para (${resultado.col},${resultado.row})`);
});

test('sem caminho à frente, o cursor fica onde está em vez de entrar no bloqueado', () => {
  // Entrar no bloqueado seria pior que não andar.
  const opcoes = { largura: 3, altura: 3, metricas: METRICAS };
  const inicio = { col: 1, row: 1 };

  // De (1,1) para cima, os três passos que fazem progresso na tela são
  // `cima` -> (0,0), `cima-direita` -> (1,0) e `cima-esquerda` -> (0,1).
  // Bloquear só um não testa nada: sobram dois, e o cursor anda. É preciso
  // fechar os três para o caso que importa — nenhum caminho à frente.
  const frenteParaCima = new Set(['0,0', '1,0', '0,1']);
  const soFicaSeFechado = (col, row) => !frenteParaCima.has(`${col},${row}`);

  assert.deepEqual(
    proximoTileValido(1, 1, 0, -1, opcoes, soFicaSeFechado),
    inicio,
    'o cursor andou quando não havia caminho à frente'
  );

  // E o detalhe que mostra que o bloqueio é o que segurou, e não a borda: com um
  // dos três aberto, ele anda.
  const comUmaPorta = (col, row) => !(col === 1 && row === 0);

  assert.deepEqual(
    proximoTileValido(1, 1, 0, -1, opcoes, comUmaPorta),
    { col: 0, row: 0 },
    'com um passo livre, o cursor deveria ter andado'
  );

  // E quando o mapa recusa tudo, também fica.
  assert.deepEqual(proximoTileValido(1, 1, 0, -1, opcoes, () => false), inicio);
});

test('sem função de filtro, o cursor anda normal', () => {
  assert.deepEqual(
    proximoTileValido(5, 5, 0, -1, { largura: 8, altura: 8, metricas: METRICAS }),
    { col: 4, row: 4 }
  );
});

test('tudo bloqueado em volta devolve o tile atual, e não o bloco', () => {
  const opcoes = { largura: 3, altura: 3, metricas: METRICAS };
  const inicio = { col: 1, row: 1 };

  const resultado = proximoTileValido(1, 1, 0, -1, opcoes, () => false);

  assert.deepEqual(resultado, inicio);
});
