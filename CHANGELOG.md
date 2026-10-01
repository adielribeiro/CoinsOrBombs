# Changelog

Formato basado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto segue [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- **Melhorias fixas e temporárias, que são coisas diferentes.** São separadas pelo
  **quando** a escolha acontece:

  - **Fim de bioma** (a décima caverna): 4 opções, e a escolhida vale até o fim do
    jogo, mesmo depois de morrer e recomeçar o bioma.
  - **Todas as outras cavernas**: 3 opções, e a escolha se perde na morte.

  O estado tem **um piso**, `melhoriasFixas`, em vez de duas listas de melhorias.
  Os doze campos continuam sendo o valor efetivo — o que a HUD mostra e a cena lê,
  sem soma nenhuma — e o piso é só o mínimo que a morte devolve. Guardar
  "fixas" e "temporárias" em listas separadas seriam duas verdades para a mesma
  coisa, e alguém teria de lembrar que a picareta é a soma das duas em todo lugar
  que lê o campo. O piso também é uma cópia do resultado e não uma lista de ids:
  reconstruir os doze campos aplicando ids dependeria da ordem, porque
  `coinBonusLevel` sem `coinBonusChance` não faz nada.

  - **Cada carta declara os campos que ela mexe.** A primeira versão comparava o
    estado de antes com o de depois e promovia o que tinha subido, e um teste pegou
    que estava errado: quem ganhou moedas na terceira caverna e escolhe vitalidade
    na décima via as **duas** para o piso, porque a de moedas também difere do
    piso — só que subiu sete cavernas atrás. A temporária sobreviveria à morte
    por acidente, que é o oposto do que ela é.
  - **Trocar de bioma não zera as temporárias.** Só a morte zera, como pedido.
  - **O "Trocar · 10" respeita a contagem do lobby.** Ele tinha um 3 escrito
    dentro: na virada de bioma um "trocar" entregaria 3 opções num menu que
    prometeu 4, e a pessoa perderia uma escolha que já tinha pago.
  - **O cartão diz "FIXA"** na hora da escolha. Sem o aviso o jogador descobre a
    regra morrendo, que é a forma mais cara de descobrir.

- **A frase do fim de bioma diz o que a escolha vale.** "Parabéns, você
  finalizou o bioma **{biome}**. Como prêmio, escolha uma melhoria para te
  acompanhar até o fim do jogo." — em vez de "Escolha 1 melhoria para a próxima
  cave", que é verdade mas não diz nada. O texto só aparece na virada: a mesma
  frase em toda caverna seria mentira em 9 de cada 10. Está destacado em âmbar,
  com barra lateral, porque é o único momento em que 4 opções aparecem e o único
  em que uma delas muda o resto da partida.

- **O modo desenvolvedor não pode mais contaminar o jogo de verdade.** São três
  regras, e as três são sobre progresso. O modo dá picareta máxima e pula direto
  para a cave que a pessoa quiser: uma tarde de teste passaria por 60 cavernas
  e pelas 6 relíquias. Se isso contasse, o jogo de verdade deixaria de ter
  sentido em uma tarde — e o dano é silencioso, porque nada na tela diz que
  aquilo contou.

  - **Um jogo de teste começa com 5 poções de Caminho Seguro e picareta no
    máximo.** O nível da melhoria de picareta vai junto, senão a HUD mostraria
    picareta 5 e o catálogo ainda ofereceria "Picareta 05", que é carta morta.
    Vida e Revelar seguem zeradas: o pedido foi Caminho Seguro.
  - **Cada save guarda se nasceu no modo desenvolvedor.** A marca viaja dentro do
    estado, e não como metadado à parte, porque é o **estado** que chega à cena
    do Phaser — e a cena precisa saber que está num save de teste para não
    contar nada.
  - **O modo desenvolvedor não abre um jogo normal.** Você testaria a cave 27
    nele, o `bestCave` iria para 60 e as relíquias seriam contadas.
  - **O jogo normal não abre um jogo de teste.** Não foi pedido, e é a mesma
    contaminação pelo outro lado: um save de teste tem poções e picareta máxima, e
    o que ele escrevesse no registro do jogo de verdade contaminaria o jogo de
    verdade. A regra é de igualdade, e o card bloqueado escreve o motivo — um
    botão que simplesmente some deixa a pessoa achando que o save sumiu.
  - **Um save de teste não guarda melhor cave nem relíquias.** `bestCave` e
    `totalCavesCleared` não andam, a coleção e o contador de relíquias ficam
    zerados, e o `profile` global não é gravado. A relíquia **aparece** — o
    efeito visual é o que o modo serve para testar — só não conta.

  A regra mora em `contaProgresso`, `registrarCaveConcluida` e
  `registrarReliquiaEncontrada`, no `progression.js`. Três `if` parecidos em três
  arquivos divergem no primeiro dia em que alguém ajusta um deles, e a cena do
  Phaser não sobe em Node — com a regra fora dela, dá para **executar** o teste
  em vez de casar string do fonte.

- **O modo desenvolvedor deixa escolher a cave, e nao so o bioma.** Antes ele
  levava sempre a primeira caverna do bioma, entao chegar na cave 27 exigia
  reiniciar o progresso e avancar cave por cave -- o que anula a mao que o modo
  desenvolvedor existe para oferecer.

  - **Os numeros sao absolutos, como na HUD.** A Gruta de Gelo comeca na 11 e o
    seletor oferece 11, e nao 1. Quem esta testando a cave 27 quer o 27 na tela,
    e nao "a setima daqui".
  - **O botao de confirmar passa a dizer "Entrar na cave 9"**, e nao mais
    "Comecar neste bioma", que passaria a ser falso.
  - **Trocar de bioma troca a lista**, e limpar a cave escolhida. Sem limpar, a
    cave 9 continuaria marcada com o cartao da Gruta de Gelo selecionado.
  - **A lista de caves sai de `startCave` e `endCave`**, os mesmos numeros que

- **Corrigido: pelo controle nao dava para quebrar pedra nenhuma.** O cursor era
  filtrado para ficar somente sobre tiles **sem** pedra, e o botao de confirmar age
  sobre o tile **de baixo** do cursor -- que, por Construction, nunca era uma
  pedra. O `handleTileClick` sai na hora quando o tile nao e pedra.

  O resultado era o pior tipo de bug: nao dava erro, nao dava aviso, e nada na tela
  denunciava. O controle movia o losango pela caverna e nao quebrava nada. Agora o
  filtro so recusa tile que **nao existe**, e a borda da caverna continua decidindo
  o que pode ser quebrado, em `isFrontierRock`.

  O comentario do `proximoTileValido` descrevia a razao do filtro antigo com a
  premissseta ao avesso -- ele dizia que o filtro evitava o cursor ficar preso numa
  pedra, quando na verdade era ele que impedia o cursor de alcancar uma.

- **Corrigido: um teste que falhava em ~1,6% das execucoes.**
  `de dentro da entrada, o cursor acha uma pedra que dá para quebrar` falhou na CI
  em `ember`, com "em 96 passos o cursor não achou pedra quebrável", e passou nas
  outras nove vezes em que rodei. `generateMap` sorteia o mapa, e o teste sorteava
  **um** mapa por bioma: denunciava o sorteio, nao a regra.

  Alem disso ele media a coisa errada. Procurava uma pedra **vizinha** do cursor,
  descrevendo um jogo que nunca existiu -- e por isso passava quase sempre, mesmo
  com o controle quebrado. Passa a procurar a pedra **de baixo** do cursor, que e o
  que o botao quebra, e a usar o filtro que a cena usa de verdade.

  Com o cursor podendo ficar sobre a pedra, a mediana e 1,5 passo e o pior caso
  medido em 2400 mapas e 5, contra um orcamento de 96. O teste sorteia 20 mapas por
  bioma, e tem um contra-teste que mostra o filtro antigo quebrando o controle,
  para ninguem o reintroduzir achando que e mais seguro.
    ja decidem a que bioma uma cave pertence. Uma lista nova aqui seria uma
    quarta verdade sobre as mesmas faixas.

- **Corrigido: escolher a cave entrava na primeira do bioma.**
  `aplicarEfeitosDasMelhorias` devolvia `...estado` junto, e ela entra como
  spread no meio de um objeto literal, logo depois de `cave: targetCave` -- o
  `cave` de dentro sobrescrevia o alvo. "Mina Solar cave 9" entrava na cave 1.

  O bug era do commit anterior, o das melhorias, e ficou escondido porque morrer
  e trocar de bioma quase sempre levam a um `targetCave` igual ao `cave` atual.
  A diferenca so aparece quando alguem escolhe um destino, que e exatamente o
  que o modo desenvolvedor passou a permitir. Agora a funcao devolve so melhoria e
  o que ela produz, entao nao ha campo alheio para sobrescrever por acidente.

- **A melhoria escolhida e permanente.** Ela sobrevive a morte e ao F5. Antes as
  doze melhorias viviam so na memoria do `App.jsx`: o jogador escolhia
  "Vitalidade 1", fechava a aba, e a melhoria nao estava em lugar nenhum.
  Verifiquei no navegador antes de mexer -- o save era gravado sem nenhuma delas.

  - **A lista do que vai para o disco e derivada da fabrica, nao escrita a mao.**
    `createImprovementState` subiu para `progression.js`, ao lado das outras tres
    fabricas de estado vazio, e `IMPROVEMENT_FIELDS` sai dela. Uma lista escrita a
    mao funciona ate a proxima melhoria: o nome entra na fabrica, a lista nao sabe
    dele, e a melhoria nunca vai para o disco -- sem erro, so uma recompensa que
    desaparece.
  - **A melhoria atravessa a morte e a troca de bioma.** As duas reconstroem o
    estado a partir do inicial, e sem carregar as melhorias elas sumiam. Trocar de
    caverna e morrer sao as duas coisas que mais acontecem na run, e as duas
    levavam junto a recompensa.
  - **Um save antigo abre com as melhorias em zero**, e nao em `undefined`.

- **O lobby oferece quatro melhorias, em vez de tres.** Quatro colunas em tela
  larga e 2x2 abaixo de 900px -- com tres colunas fixas a quarta caia numa segunda
  linha orfa, e o lobby ficava com uma linha de tres e uma de um.

- **O catalogo de melhorias saiu do `App.jsx` para `src/game/rewards.js`.** Um
  teste em Node nao importa um `.jsx`, entao a regra que decide se a melhoria
  escolhida sobe o campo certo nao tinha como ser testada -- e essa regra e o
  coracao do recurso. Alem disso e dado de jogo com um tradutor injetado, nao
  codigo de tela: ele nao sabe o que e uma tela, sabe o que a proxima melhoria e.

- **Suporte a controle, do começo ao fim.** Direcional move o cursor na caverna e
  a navegação nos menus, A confirma, B volta, Start abre a pausa. Vale para Xbox,
  PlayStation e qualquer controle com mapeamento padrão — o navegador já entrega
  os mesmos índices para todos, e o que era trabalho era dar nome aos botões e
  ligar a parte que o navegador não liga sozinho.

  - **O `Esc` e o botão voltar agora leem a mesma pilha de telas** (`telas.js`).
    Antes cada um tinha sua própria cadeia de `if`, e dois lugares divergem: um
    modal novo nascia respondendo a um e não ao outro, e ninguém percebia até
    alguém com controle na mão relatar que não dava para sair daquela tela.
  - **A navegação dos menus é espacial, não em linha**, porque a seleção de bioma
    é uma grade de duas colunas: em linha o foco pularia da coluna direita para a
    seguinte da esquerda. E usa foco de verdade do DOM, o que faz o `Tab` do
    teclado e o direcional compartilharem o mesmo estado.
  - **O anel de foco aparece com controle.** `:focus-visible` sozinho não
    apareceria: o navegador só o mostra em foco programático quando a última
    interação foi de teclado, e aqui ela foi de controle, que ele não conhece. O
    shell recebe `data-controle` enquanto o controle manda no foco.
  - **O cursor é de tile, não de mouse.** Transformar o analógico em coordenada
    de tela erra por meio pixel, e meio pixel numa aresta isométrica é clicar na
    pedra errada. A isometria também torna "para cima" igual a `col - 1, row - 1`,
    então as quatro direções da tela não são os quatro movimentos da grade.
  - **Confirmar chama o mesmo caminho do clique.** Um segundo caminho para
    "quebrou uma pedra" acabaria divergindo em alguma regra, e a pessoa quebraria
    uma pedra de um jeito e não do outro, sem erro visível.
  - **O nome do controle aparece na HUD quando ele é reconhecido**, porque a falha
    típica do controle é silenciosa: se ele não for lido, nada acontece, e a
    pessoa conclui que o jogo não tem suporte.

  **Não verificado com hardware.** O laço de leitura usa `requestAnimationFrame`, e
  o ambiente onde isto foi escrito não deixa a aba do navegador visível — o rAF
  não roda e o laço não é exercitado em tela. O que está verificado: 256 testes,
  incluindo um que percorre o mapa real de todos os seis biomas com o cursor
  perguntando se ele acha pedra quebrável a partir da entrada. O que não está:
  a sensação na mão.


- **Corrigido: o jogo nao abria mais.** O commit anterior publicou uma versão
  que quebrava na tela branca com `readSettings is not defined`. A causa foi um
  bloco movido de arquivo, e a extração levou embora quatro funções que nada
  tinham a ver com o movimento: `readSettings`, `readStorage`, `writeStorage` e
  a lista de chaves removidas. Restauradas.

- **Corrigido: a melhoria sobrevivia, mas o que ela produz não.** Verifiquei no
  navegador que `vitalityLevel: 1` voltava da morte e do F5 — e a HUD mostrava
  **2 de vida**. O nível é um dos doze campos; a vida máxima que ele produz não
  é melhoria nenhuma, e vinha do `...initialState`, que tem `maxHp: 2`. O mesmo
  valia para `pickaxePower`, que é o que decide quantos cliques a rocha custa.

  Agora o nível manda e o resto é recalculado (`aplicarEfeitosDasMelhorias`).
  Guardar o derivado também não resolveria: passaria a haver duas verdades, o
  nível e o que ele produz, e elas divergiriam assim que uma fosse corrigida
  sozinha.

- **Corrigido: `setShowBiomeSelection` não existe.** Fechar a tela de bioma pelo
  botão de voltar do controle jogava `ReferenceError`. É resíduo de uma
  renomeação: o estado se chama `showBiomeSelect` desde `c5cd552`, e esta linha
  ficou para trás. Quebrou sozinho, sem ninguém tocar nela.

- **Nenhum nome usado pode estar sem definição** (`test/declaracoes.test.mjs`).
  O teste que faltava para essa clase de erro. O `npm run build` **passava** com
  o jogo quebrado: o esbuild não verifica identificador indefinido, porque para
  ele `readSettings` é um nome qualquer, e um nome que não existe só vira erro
  em tempo de execução. Os 270 testes passavam também — nenhum deles tocava
  `App.jsx`.

  O teste analisa cada arquivo com o parser do Babel e confere que todo nome
  usado tem de onde vir. Tem dois contra-testes: um que prova que ele pega um
  nome que sumiu, e outro que prova que ele **não** acusa `maxHp` em
  `{ maxHp: 2 }` nem `localStorage` em `window.localStorage`. Sem eles, um
  analisador vazio passaria em silêncio.
### Removido

- **A decoração espalhada da caverna.** Colunas nas Ruínas, cristais, lanternas,
  caixas, trilhos, pilhas de ouro, estalactites e fendas de lava saíam sorteados
  nos tiles abertos — cerca de 18% deles. São **nove sprites a menos** na tela, em
  todos os seis biomas.

  - **Eram só imagem.** `renderDecoration` colocava a arte com uma escala e uma
    profundidade, e mais nada: sem colisão, sem clique, sem efeito. Nenhuma regra
    do jogo lia `tile.deco`, então tirá-los não muda uma única chance de bomba,
    moeda ou relíquia.
  - **`deco_rubble` continua, apesar do nome.** Ele deixou de ser decoração e
    virou a textura de duas coisas que são efeito de jogo: o caco que sai da
    rocha quebrada (`spawnBreakDebris`) e o cascalho do chão (`renderGrit`).
    Apagar junto teria quebrado a animação de quebra — e a animação é justamente
    o retorno que a pessoa sente ao acertar uma pedra.
  - **O `primaryDeco` de cada bioma saiu junto.** Ele apontava para texturas que
    não existem mais, e um campo que aponta para um arquivo apagado é pior que um
    campo que não existe: ele mente sobre o que o jogo carrega.

### Adicionado

- **O final do jogo, na caverna 60.** Chegando à última caverna da Câmara de Cristal
  e clicando na Saída, o botão "Próxima cave" vira "Ver o final" e abre a carta: a
  arte do exploreiro na saída da caverna em tela cheia, com o texto subindo de baixo
  pra cima por 100 segundos. No fim, ou quando a pessoa pular, volta para a tela de
  título.

  - **Pular por botão, por `Esc` ou clicando em qualquer lugar.** O botão fica sobre
    a arte e não sobre a carta: durante a rolagem a carta ocupa a tela toda, e um
    botão dentro dela subiria junto.
  - **Quem pede menos movimento não recebe uma parede de texto que não sai.** Com
    `prefers-reduced-motion` a rolagem some, o texto fica parado e rola sozinho se
    não couber, e o botão e o `Esc` continuam funcionando — são eles que garantem
    que ninguém fique preso numa tela que só se abre sozinha.
  - **A carta é traduzida nos dez idiomas**, como o resto. São chaves separadas por
    parágrafo e não um texto único com quebra de linha, porque o parágrafo é o que dá
    o ritmo da rolagem, cada um precisa do seu espaço, e um texto corrido só
    permitiria um bloco único no meio da tela. Os comprimentos diferentes de cada
    tradução são o que ajusta a duração percebida, e quem decide o espaço é o
    navegador.

- **A caverna 60 deixou de ser um beco sem saída.** Antes, clicar na Saída da última
  caverna levava para a 61 — e `getBiomeForCave` não rejeita uma caverna fora da
  faixa, ela devolve o último bioma. O jogador entrava numa caverna que mostra
  "10/10" para sempre, sem nunca mais avançar. O final é o que responde por ela.

- **Terminar o jogo não apaga a run.** Voltar ao menu depois da carta mantém moedas,
  relíquias, coleção e `bestCave` no save. O caminho normal de "Ir para o menu"
  reseta a run de propósito — quem abandona a caverna recomeça — e não serve aqui:
  quem terminou o jogo teria as moedas e as relíquias zeradas no momento em que a
  carta de despedida acabou de comemorar as duas coisas.

- **Jogos salvos, um por slot, como no Minecraft.** Clicar em **Entrar** na tela de
  título abre a lista de jogos em vez de ir direto para a seleção de bioma. Cada
  jogo guarda a run inteira: a caverna em que a pessoa parou, moedas, bombas,
  picareta, relíquias, coleção e estatísticas. Criar um segundo jogo não apaga o
  primeiro, e **clicar num jogo já começa a jogar** — direto na caverna em que ele
  parou, sem passar pela seleção de bioma.

  - **Novo jogo é só um nome.** Clicar em "Novo jogo", digitar o nome e pronto. Um
    nome vazio ou só com espaços vira "Jogo 1", e o nome tem tamanho limitado.
  - **Cada card mostra caverna, bioma, moedas, relíquias e a data da última vez.**
    A lista vem da mais recente para a mais antiga, e o jogo em andamento fica
    marcado com a barra de acento dos biomas.
  - **Renomear e apagar, com confirmação.** Apagar mostra o nome do jogo na
    pergunta e diz que não dá para desfazer.
  - **A troca de bioma continua existindo**, como botão secundário do card. Ela é a
    única rota que existia a partir do menu, e tirá-la junto com a seleção de bioma
    na entrada seria perder uma função junto com um clique.

- **O destravamento de bioma é por jogo.** Um jogo novo começa na Mina Solar mesmo
  que outro já tenha chegado ao gelo. É a escolha de projeto, e vale registrar a
  consequência: quem cria um jogo novo joga as dez primeiras cavernas de novo antes
  de ver o gelo.

  - **Criar um jogo a partir de uma run em andamento copia o `bestCave` dela.** É o
    que impede que "começar de novo" vire uma punição invisível: o `bestCave` é o
    que destrava os biomas, e perdê-lo ao criar um slot obrigaria a refazer dez
    cavernas só para chegar ao mesmo lugar.
  - **A run continua avançando pelos salvamentos de bioma**, que já ofereciam
    escolher para onde ir em vez de obrigar a próxima caverna.

- **Quem já jogou não perde nada.** Antes dos slots, o progresso era um `profile`
  com o `bestCave`. Quem chega a esta versão recebe um jogo migrado com esse
  progresso, e a migração roda uma vez só. O `profile` antigo **não é apagado** — é
  a fonte, e apagá-lo antes de a migração ter sucesso trocaria um bug de espaço por
  um de perda.

- **O botão "Reiniciar progresso" reinicia o jogo em andamento**, não um perfil
  global. Com o destravamento por jogo, zerar só o `profile` deixava os biomas
  liberados e o botão não faria nada visível. O slot em si sobrevive, com o nome que
  a pessoa deu; apagar o jogo inteiro é a ação da tela de jogos, com a confirmação
  dela.

### Corrigido

- **A picareta vai até o nível 10, e cada nível tira um clique da pedra.** São 9
  melhorias em vez de 4, na mesma lógica de sempre: cada uma soma 1 no nível e 1
  na força. Na caverna 60, onde a picareta é testada de verdade, cada degrau tira
  exatamente um clique da pedra mais difícil — de 14 cliques com a picareta 5 para
  9 com a picareta 10.

  - **O `Math.min` do `apply` deixou de ter um `5` escrito dentro.** Ele já tinha
    divergido do catálogo uma vez: o catálogo chegou a oferecer 7 níveis com o
    `apply` ainda saturando em 5, e "Picareta 05/06/07" viraram cartas mortas —
    apareciam, eram escolhidas, e não mudavam nada na run. Nenhum teste pegou,
    porque nenhum comparava os dois tetos. Agora existem testes que aplicam cada
    carta e conferem que a força subiu, e a esticar a picareta de novo é uma linha.
  - **O modo desenvolvedor acompanha**: a picareta máxima passa a ser a 10, derivada
    da mesma constante e não escrita à mão.

- **A contagem de relíquias do card bate com a do HUD.** As duas usavam a mesma
  palavra e respondiam coisas diferentes: o HUD soma as quantidades, e o card
  contava os tipos diferentes. Com uma relíquia achada duas vezes, o card dizia "1
  relíquia" ao lado de um HUD dizendo "2". Agora as duas usam `getTotalRelics`.

### Mudado

- **O interruptor que era "Lembrar melhor cave" agora é "Lembrar meu progresso".**
  Ele controlava só o `bestCave` quando o texto foi escrito, e controla a run
  inteira agora. O texto antigo descrevia uma parte do que o botão faz.

- **O progresso é gravado no jogo em andamento, e não em um perfil único.** A
  gravação acontece a cada mudança de estado, que é o que se espera de um save: são
  poucos kilobytes por ação, e gravar só ao sair perderia tudo numa aba fechada no
  meio da caverna.

- **A leitura da lista é feita do storage a cada abertura, e não de um estado em
  cache.** O save é mudado fora do React de propósito — a cena do Phaser grava
  direto no storage quando uma run avança — e essa escrita não passa por nenhum
  `setState`.

- **O splash da ArchangelSoft aparece uma vez, e não a cada entrada.** Toda vez que
  o jogador saía do menu principal para entrar numa cave, vinha 900ms de tela preta
  e 2200ms do logo — mais de três segundos de intro, repetidos toda sessão. Agora
  o splash aparece **uma vez por navegador**, e a marca fica salva.

  - **Depois da primeira vez, a entrada é direta**: sem preto e sem logo, do menu
    para a caverna.
  - **O preto foi junto, e essa é a parte que precisava de justificativa.** Ele não
    era uma transição: era a cobertura entre o menu e o logo. Tirando o logo,
    sobra um segundo e meio de tela preta antes do jogo, que é a pior das duas
    leituras — pausar sem mostrar nada. Ele existe junto do splash ou não existe.
  - **A tela cheia e o travamento de orientação continuam em toda entrada.** Não
    têm relação com o splash, e o pedido de tela cheia precisa continuar saindo
    de dentro do clique: o Fullscreen API só aceita um pedido feito a partir de um
    gesto do usuário, e pedir depois de um `setTimeout` é recusado.
  - **A marca é um item separado do perfil e das configurações.** Um "limpar
    progresso" não devolve o splash para quem já jogou: o splash é da primeira
    abertura do jogo, não da primeira cave.
  - **Sem storage, o splash volta.** Modo privado é um custo de dois segundos e
    meio por entrada, e é melhor do que o jogo quebrar. O lado que o jogo erra é
    sempre o de mostrar o splash: escondê-lo de quem nunca viu tiraria a única
    coisa que ele existe para fazer.

  A regra mora em `src/game/intro.js` e é testada **executando** a lógica com um
  storage falso — o storage entra como argumento. Um teste que só procurasse a
  palavra no `App.jsx` confirmaria que o texto está presente, que foi exatamente o
  tipo de teste que passou enquanto o `BootScene` iterava um identificador que não
  existe.

### Adicionado

- **Fundos em 4K, um por bioma, carregados por bioma.** Os seis `cave_bg_*.png`
  passaram de 768x512 e 1536x1024 para **1672x941**, com o mesmo desenho e muito
  mais detalhe.

  Carregá-los todos no boot levava o pacote de 14,8 MB para 36,8 MB, para um fundo
  que o jogador vê um de cada vez. Então **só o fundo do bioma atual é baixado**,
  e só o primeiro entra no boot:

  | | antes | depois |
  | --- | --- | --- |
  | boot (primeira visita) | 14,8 MB | **9,7 MB** |
  | por bioma, sob demanda | — | 16,3 MB (5 fundos + 5 entradas) |
  | total em disco | 14,8 MB | 26,0 MB |

  O boot **caiu** 5,1 MB, e não subiu: o pacote antigo carregava 7,9 MB de fundo
  para mostrar um.

  - A tela de título não espera nada: o `BootScene` carrega o fundo da Mina Solar
    junto com o resto, e ela é a caverna da cave 1.
  - Enquanto o fundo do bioma não chega, o renderizador pinta a cor do bioma no
    lugar. A alternativa é o `add.image` cair no placeholder de textura ausente do
    Phaser — a caixa preta com X verde. Um retângulo da cor da caverna por meio
    segundo é melhor, e o redesenho chega no `complete`.
  - `ensureBackdrop` é uma função só, e é ela que decide entre "está pronto?" e
    "o que falta?". Quando eram dois lugares independentes, o `renderMap` passava
    pela verificação e caía no acesso seguinte sem a textura.

- **A entrada da caverna virou uma arte por bioma.** Seis bocas, com o material do
  lugar no arco, no pedestal e no entulho, em vez de uma boca única de madeira.

  | bioma | arquivo | na tela | linhas de fundo |
  | --- | --- | --- | --- |
  | sunstone | 480x404 | 115x97px | 4,0 |
  | frost | 480x415 | 115x102px | 4,2 |
  | ember | 480x419 | 115x103px | 4,2 |
  | ruins | 480x399 | 115x96px | 4,0 |
  | wind | 480x408 | 115x100px | 4,1 |
  | crystal | 480x424 | 115x105px | 4,2 |

  A entrada é a única peça alta da cena, e ela **sempre fica em `col: 0`**, na
  linha do meio — a borda esquerda do mapa, por `mapGenerator`. Por isso ela
  cresce em altura sem comer o campo de jogo. Medido em `preview-props`: cobre
  5 dos 42 tiles, e o resto do que ela esconde é fundo.

  - **A entrada passou de 1,05x para 1,2x a largura do tile.** Foi 2,4x primeiro,
    e a captura da Cave 1 mostrou por que não dá: a 2,4 a boca tapava as pedras
    de três fileiras acima do seu tile e virava o maior objeto da cena, com o
    "IN" pequeno dentro do arco. A 1,2 ela é um pouco mais larga que o tile — o
    que faz a entrada ler como entrada e não como um objeto posto em cima de um
    quadrado — e ainda deixa ver o campo de jogo. É um terço a mais que a 1,05 da
    arte única: a boca é mais detalhada hoje, e essa diferença é o que paga a
    arte por bioma.

  - **A proporção é por bioma, e isso não é detalhe.** Medida: de 0,831 (Ruínas, o
    arco mais largo) a 0,883 (Cristal, o mais alto). Com uma constante única, o
    `setDisplaySize` esticaria ou achataria cinco das seis em até 6% — e esticar
    arte é o defeito que o `setDisplaySize` já causou aqui uma vez, quando a rocha
    antiga de 82x80 era esmagada para 80x45.
  - **A arte de origem tem 1244px de largura para uma peça de 115px na tela.**
    Aparar e reduzir levou os seis arquivos de 12,6 MB para 2,3 MB, sem
    diferença visível: o alvo é 480px, o que sobrou com folga quando a entrada
    estava a 2,4x. A 1,2x o alvo seria 240px e o pacote cairia para perto de
    0,7 MB — fica de fora desta mudança porque encolher a arte agora só
   economizaria para o caso de a entrada voltar a crescer.
  - A arte chega num canvas de 1254x1254 **centralizado**, com de 65px a 92px de
    folga transparente embaixo. Como o jogo ancora pela base, essa folga vira
    levitação — foi exatamente o bug que a arte única tinha, com 12,6px.

- **12 testes de `backdrops` e `entrances`**, com uma cena falsa que substitui o
  Phaser. Eles cobrem a lógica de carga: quando pedir, quando não pedir, quando
  liberar o pedido, e o que fazer quando o arquivo falha.

  **A cena falsa existe porque o caminho de carga não é verificável no navegador
  deste ambiente**: a aba fica com `visibilityState === 'hidden'`, o
  `requestAnimationFrame` é estrangulado, o `BootScene` nunca termina o preload e
  o `CaveScene.create()` nunca registra os ouvintes. O que a cena falsa **não**
  cobre é se o Phaser realmente baixa o arquivo — e isso fica registrado como
  limite, não escondido.

  O que ela pegou: `ensureBackdrop` devolvia `true` — "já está tudo pronto" —
  para uma cena vazia, e portanto **nunca pedia a arte**. O sintoma seria o
  bioma em cinza para sempre, sem erro, sem aviso, sem placeholder. A guarda que
  decidia isso era uma cadeia de acessos numa linha só; extrair `exists` para uma
  variável antes do teste resolveu, e a forma curta está explicada no código
  porque é o único ponto do arquivo onde esse tipo de erro é silencioso.

### Corrigido

  **A cena falsa ficou dentro do próprio arquivo de teste.** Ela morou em
  `test/cena-phaser.mjs`, importada, e o comportamento foi impossível de
  explicar: o mesmo objeto devolvido por `cenaFalsa()`, com `texturas` presente em
  toda sondagem, chegava a um arquivo de teste sem `texturas` — em linhas
  consecutivas do mesmo arquivo, e de forma diferente conforme o arquivo que o
  executava. Ver a nota em "Corrigido" para o que foi descartado por causa disso.

- **Todo bioma mostrava o fundo da Mina Solar, e a entrada da caverna não
  aparecia.** Cinco dos seis mostravam ainda uma caixa preta com X verde antes da
  reserva, e nenhum erro no console dizia por quê.

  A carga por bioma saiu. O `BootScene` agora carrega **os seis fundos e as seis
  entradas**, e não há mais caminho de carga depois do boot. O que se economizava
  era 17 MB na primeira visita, contra uma tela que mostra um bioma por vez; o que
  custava era um `ensureBackdrop` que pedia a arte, chamava `start()`, e não
  recebia nenhum evento de conclusão — sem erro, sem aviso, e com a caverna errada
  na tela.

  | | antes | agora |
  | --- | --- | --- |
  | boot | 9,7 MB + 16,3 MB sob demanda | **26,0 MB** |
  | caminho de carga depois do boot | `ensureBackdrop` | nenhum |

  - **`texturaEhUsavel(scene, chave)`**, no `CaveScene`: a textura devolvida por
    `textures.get()` precisa ter a **mesma chave** que foi pedida. A `__MISSING`
    responde `__MISSING`, e é reprovada. `textures.exists()` é
    `list.hasOwnProperty(key)` — responde "sim" tanto para uma arte que carregou
    quanto para uma que nunca chegou, e por isso não serve para decidir se pode
    desenhar. A mesma barreira vale para a entrada da caverna.
  - **Reserva no fundo da Mina Solar**, com aviso. Uma caverna errada é feio; a
    caixa preta do Phaser não é jogável. E a reserva esconde a falha, então ela
    avisa no console — senão "o bioma mostrou a caverna de outro" fica
    indistinguível de "está tudo bem".
  - **A lista do boot virou uma função pura**, `listBiomeArt()`, e ela itera
    `BIOMES` usando o `backgroundKey` do próprio bioma. Com duas listas — o
    registro de chaves e a lista de biomas — elas podem discordar, e a que
    discorda é a que decide o que o jogo pede.

- **Dois erros que quebravam o boot inteiro, e que nenhum teste pegava.** O
  `BootScene` importava `BIOMES` e iterava `BIOMAS`; e depois declarava `bioma` e
  usava `biome`. Os dois são `ReferenceError`: o build passa, o `node --test`
  passa, e a tela fica preta sem mensagem útil.

  Pior: o teste que existia procurava no fonte a string
  `for (const bioma of BIOMAS)` — **exatamente a grafia errada**. O teste passou
  porque repetiu o erro.

  Por isso a lista de assets do boot é testada **executando** `listBiomeArt`, e o
  `test/boot.test.mjs` confere que os doze arquivos estão na lista, que nenhum
  fundo se repete, que a chave bate com o caminho, e que cada arquivo existe em
  disco. Isso pega a classe inteira do erro, e não só estes dois.

- **O que foi descartado no caminho.** A primeira versão do conserto trocava a
  guarda de `backdrops.js` por uma forma equivalente sem optional chaining,
  porque a versão antiga estava registrada como suspeita. Com ela, seis testes
  passaram a falhar de forma determinística — três rodadas, sempre 6 de 6 — e a
  CI, em Linux com Node 22, viu a mesma coisa. A versão antiga passou na CI de
  `ba1d2ef`, então a troca era a causa, e ela foi revertida. Com a carga por
  demanda fora, a guarda nem existe mais.

- **O jogo fala dez idiomas.** Português, inglês, espanhol, francês, alemão,
  italiano, polonês, hindi, chinês simplificado e japonês, com seletor no menu
  principal.

  A troca vale na hora, sem reiniciar, e a escolha é salva junto das outras
  configurações. Em quem nunca escolheu, o idioma é o **do navegador**:
  `readStoredLocale` devolve o que está salvo, senão o que `navigator.languages`
  pede, senão português.

  - **A detecção casa por prefixo, e não por igualdade.** O navegador diz
    `en-GB`, `pt-PT`, `zh-HK`, e o jogo tem `en`, `pt-BR`, `zh-CN`. Com igualdade
    exata, todo mundo cairia no português — que é exatamente o caso do jogador
    que não entende nada. E a lista de preferências inteira é varrida na ordem:
    navegador em `[ja, en]` é japonês.
  - **O item novo fica no menu principal, ao lado de Configurações**, abrindo uma
    tela só com a lista. A lista mostra o nome **no próprio idioma** primeiro e
    o nome em português ao lado, menor: "Alemão" não ajuda quem não lê português
    a achar "Deutsch". A tela rola até a opção em uso, senão quem está nas duas
    últimas posições abre e não vê qual está marcado.
  - **O idioma sobrevive a "Reiniciar progresso".** O botão é sobre a run, não
    sobre como a pessoa lê. O modo desenvolvedor sobrevive pelo mesmo motivo.

- **O conjunto de texto foi todo para chaves**, e a lista é de **193 chaves**:
  HUD, menu, configurações, seleção de bioma, lobby, loja, pausa, decisão de
  saída, rotação, avisos de tela cheia, mensagens de partida, mensagens de
  quebra, mensagens de utilitário, os três utilitários, as seis melhorias, os
  seis biomas, as seis relíquias e os quatro objetivos.

  `progression.js` guarda a chave ao lado do texto em português — `nameKey` ao
  lado de `name` — e a tela usa a chave. O português fica como referência para
  quem lê o código, e é a fonte da verdade do conjunto.

  - **O dicionário de português é a fonte da verdade, e não um entre dez.** O
    teste de conjunto falha se um idioma tiver chave a mais ou a menos. Sem
    isso, traduzir nove idiomas vira nove fontes de buraco silencioso: a chave
    que ninguém traduziu não dá erro, ela mostra o nome da chave.
  - **A chave que falta aparece com o nome, nunca vazia.** O `t()` devolve
    `[fr] lobby.proxmaCave`. Devolver `''` esconderia o erro; devolver a chave
    deixa o buraco visível na tela e o teste aponta o nome exato.
  - **Placeholder sem valor fica como está.** `Cave {n}` continua `Cave {n}`, e
    não vira `Cave undefined`.

- **Plural por idioma, de verdade.** Cinco chaves mudam de forma com o número,
  e o polonês é o caso que justifica o mecanismo: `one` para 1, `few` para 2 a 4
  (exceto 12 a 14) e `many` para o resto — 1 *jaskinia*, 3 *jaskinie*, 5
  *jaskiń*. Errar a categoria entrega um substantivo na declaração errada, que o
  leitor polonês percebe na hora. Chinês e japonês não têm plural, então
  declaram `other` uma vez só.

  A escolha da forma cai em cadeia: categoria → `other` → primeira forma
  presente. É o que impede `undefined` na tela quando um idioma não tem a
  categoria pedida.

  - A descrição das melhorias tem **dois** números, a chance e a quantidade, e a
    plural tem que ser da **quantidade**. Mandar `chance` no lugar trocaria
    "+2 moedas" por "+20 moedas" no polonês, porque 20 é outra categoria.

- **17 testes de i18n**, que são o que segura nove traduções à mão:
  conjuntos iguais, placeholders iguais, formas de plural presentes, texto em
  português que sobrou, mensagem vazia, espaço sobrando nas pontas, regra do
  polonês e do resto, detecção por prefixo, ordem da lista de preferências,
  interpolação, chave desconhecida, idioma desconhecido, e duas checagens de
  conteúdo: que `nameKey` de bioma, relíquia e objetivo aponta para chave
  existente, e que cada idioma traduziu pelo menos 70% do conteúdo.

### Corrigido

- **`ensureBackdrop` devolvia "está tudo pronto" para uma cena vazia**, e
  portanto **nunca pedia a arte do bioma**. O sintoma seria o bioma em cinza para
  sempre — sem erro, sem aviso, sem placeholder, porque o renderizador acreditava
  que a textura estava lá.

  A guarda que decidia isso era uma cadeia de acessos numa linha só
  (`typeof scene?.texturas?.exists !== 'function'`). Extrair `exists` para uma
  variável antes do teste resolveu, e é a forma que ficou.

  **Não consigo explicar o mecanismo, e isso é o que me preocupa.** A linha
  isolada, num arquivo de quinze linhas sem nenhuma importação, devolve o
  resultado certo. Com o mesmo texto dentro do módulo, devolvia `true`. Passei
  por `typeof` sem `?.`, por `!x !== 'function'` (que é erro de precedência de
  verdade, e compreendi depois), por `.every`, por laço explícito, e só a forma
  com a variável extraída passou. Procurei o mesmo padrão no resto do `src` e
  sobraram três ocorrências, todas de dois níveis e nenhuma no caminho de carga.

  O que fica registrado: a forma com a variável é a que está testada, e o
  comentário no código diz que é o único ponto do arquivo onde esse tipo de erro
  é silencioso. Se aparecer o mesmo sintoma em outro lugar — arte que não carrega,
  sem aviso — o primeiro lugar para olhar é uma guarda composta.

- **O HUD se sobrepunha abaixo de ~420px de largura, e a causa era
  `justify-self: center`.** O cluster de vitais era dimensionado pelo conteúdo e
  centrado na coluna; quando o conteúdo é maior que a coluna, ele transborda dos
  dois lados em vez de encolher. Medido com a janela em 400px: a coluna do meio
  media 120px e os cinco pills de vida mediam 173px, então o bloco saía 26px para
  cada lado e passava por cima do cluster da esquerda.

  Não é efeito de idioma — em português e em chinês a medição é a mesma — mas a
  correção entrou junto porque o `nowrap` dos rótulos, que era necessário para o
  pior caso do chinês, só produz o resultado certo com o `stretch`.

  - **`white-space: nowrap` no rótulo do pill.** Sem esta regra o rótulo quebrava
    quando o pill era espremido: em português "MOEDAS" virava "MOEDA / S", e em
    chinês e japonês — que não têm palavra, só ideograma — virava uma letra por
    linha. Com dez idiomas, o pior caso deixou de ser hipotético.
  - O cluster de vitais rola na horizontal quando não cabe, e a barra de rolagem
    é escondida: parece um gesto e não um controle.

- **`useMemo` não estava importado no `App.jsx`, e o build e os 107 testes
  passaram mesmo assim.** O navegador pegou: tela branca com o HUD de React por
  cima e um `ReferenceError` no console. Build e teste não pegam hook faltando
  em JSX.

- **As rochas flutuavam, e a causa não era a arte.** Era o fatiador.

  `reduzParaCelula` escrevia o conteúdo no canto (0, 0) da célula, e o
  empacotamento calculava `baseX` e `baseY` para reassentar em seguida. Essas duas
  variáveis **nunca eram lidas**: a cópia do buffer para a folha é posicional, de
  célula inteira, e ignora as coordenadas. O conteúdo ficava no topo da célula, e
  o vazio sobrando embaixo aparecia na tela como levitação — porque o sprite usa
  origem (0.5, 1), e a base da imagem é o ponto de apoio no tile.

  Medido na folha da Mina Solar antes da correção: **9 das 12 rochas não encostavam
  na base**, e a dispersão entre a mais alta e a mais baixa era de **32px** na
  tela. As três que encostavam eram as que preenchiam a célula inteira de altura.

  Isso também explica por que padronizar os sprites em 168×168 não resolveu, e
  por que não resolveria: medida nos 75 sprites, a folga transparente é
  **simétrica** — de 4px a 48px em cima e embaixo — ou seja, cada sprite está
  **centralizado** no canvas, e não apoiado numa base comum, com 44px de dispersão
  entre a base mais alta e a mais baixa. Usar o canvas como veio afundaria um
  sprite curto 46px no chão. O que faz o sprite assentar é descartar o padding,
  e o fatiador descartava — só que jogava o descarte no lado errado da célula.

- **Três das oito rochas da Galeria de Vento não apareciam.** O índice de
  empacotamento era o da pasta, e não o da contagem de peças que entraram. Os
  quatro sprites levitantes descartados ocupavam as células 0, 3, 4 e 9, e as oito
  rochas que sobraram caíam em 1, 2, 5, 6, 7, 8, 10 e 11 — com `endFrame` em 7, o
  jogo pedia as células 0, 3 e 4, que estavam **transparentes**.

  Nenhum bioma tinha o problema, porque só o Vento descarta peça. E a contagem
  declarada no código estava certa o tempo todo, o que tornava a falha mais
  difícil de enxergar: o código dizia 8, a folha tinha 12 células, e três delas
  eram buracos dentro da faixa em uso.

### Adicionado

- **A boca da caverna e a picareta ganharam arte nova**, e as duas foram trocadas
  junto com a geometria que dependia do tamanho antigo.

  A boca antiga (`entrance_frame.png`, conteúdo de 101×61) era desenhada com
  `setScale(0.54)` e origem no centro, acima da linha do chão: numa arte menor, a
  boca ficava inteira flutuando sobre o tile. Agora ela é um arco de 156×113,
  ancorado na **base** como as rochas, na mesma linha de chão, com 1,05 da largura
  do tile. `entrance_frame.png` saiu; `cave_entrance.png` entrou.

  A picareta antiga tinha 73×83 de conteúdo e a nova tem 140×142. Na escala antiga
  ela sairia com o dobro do tamanho e cobriria a rocha que está sendo quebrada —
  que é justamente o que o efeito precisa mostrar. A largura agora vem do tile
  (0,45), e não de um `setScale` sobre a arte.

  - **A arte das duas foi aparada pelo conteúdo** (`scripts/trim-props.mjs`), e
    isso não é um detalhe cosmético. Elas chegam centralizadas num canvas de
    168×168, com 29px de folga transparente embaixo na boca. Como o jogo ancora
    pela base, essa folga **é** levitação: os 29px viravam 12,6px de distância
    entre o rodapé do arco e o chão. Aparar resolve na origem, e deixa a
    proporção do arquivo ser a proporção real.
  - `CAVE_ENTRANCE_ASPECT` e `PICKAXE_ASPECT` moram em `config.js` com o nome do
    arquivo do lado, e `test/props.test.mjs` compara as duas coisas. Uma
    proporção errada não dá erro: `setDisplaySize` achata a arte em silêncio, o
    build passa, os testes passam, e o arco sai esmagado num tile que é duas
    vezes mais largo que alto.

- **`scripts/preview-props.mjs`, que compõe a camada de objetos em Node.**

  Existe porque a verificação no navegador não é confiável aqui: a aba do
  ambiente de teste fica com `document.visibilityState === 'hidden'`, o
  `requestAnimationFrame` é estrangulado, o loop do Phaser nunca dá um passo, e a
  cena fica presa em `status = 1` (started, nunca running) com a tela sem pintar.
  Nenhum erro, nenhum aviso — só a tela que não enche.

  O script monta o mesmo mapa com a mesma geometria do `CaveScene` (`toIso`,
  origem (0.5, 1), `setDisplaySize`, amostra bilinear, ordem do pintor), com as
  constantes vindas do próprio jogo, e **mede o assentamento**: para cada objeto,
  onde o pixel mais baixo deita em relação à linha de chão do seu tile. Antes da
  correção do fatiador ele acusou dispersão de 32,14px nas rochas e 12,60px na
  boca. Agora são 0,00px nos dois, e o teste trava a mesma invariante.

- **`test/props.test.mjs`**, com dez testes: a arte aparada, a proporção do código
  batendo com a do arquivo, a folga transparente, a boca maior que o tile, a boca
  e as rochas assentando na mesma linha, e a picareta não maior que a rocha.

- **Um teste nas folhas de rocha**: nenhuma célula em uso pode ficar com buraco
  embaixo, e nenhuma pode estar vazia. É a invariante do fatiador, e ela falhava
  em 9 dos 12 frames da Mina Solar sem nenhum outro teste reclamar.

### Removido

- **`describeFullscreenError` devolvia a frase pronta, e agora devolve a chave.**
  O arquivo descreve a falha do navegador e não sabe nada sobre idioma; as quatro
  mensagens eram as últimas quatro em português num jogo de dez idiomas. O teste
  que cobria isso afirmava sobre o texto em português e passou a resolver a chave,
  o que prova duas coisas de uma vez — que a chave existe e que a mensagem é
  acionável.

- **Quatro sprites de arte levitante da Galeria de Vento**: `wind_01`, `wind_04`,
  `wind_05` e `wind_10`.

  `wind_01`, `wind_05` e `wind_10` são aglomerados de rocha flutuando com vento
  ao redor. `wind_04` é uma plataforma com pedrinhas penduradas embaixo. São
  peças feitas para pairar, e numa grade isométrica — onde cada rocha assenta num
  tile e é quebrada com a picareta — uma peça flutuando não lê como arte. Lê
  como bug, e o jogador não tem como distinguir "a arte é assim" de "o jogo
  quebrou".

  A detecção é automática e está no `slice-rocks.mjs`, não foi o meu olho: uma
  rocha que senta no chão é **um** corpo conexo, e estilhaço que paira em volta é
  um segundo. Medido nos 75 sprites, a regra descarta exatamente estes 4 e
  **nenhum** dos outros 71 — crystal, ember, frost, ruins e sunstone têm zero
  peças soltas.

  **A base estreita era o critério errado, e quase custou dois sprites bons.**
  `crystal_05` (afloramento com cristais) e `ember_13` (plataforma de lava vista
  de cima) têm base de 10% e 12% da largura, e as duas são arte válida. A
  primeira hipótese foi "afunila demais na base, então equilibra numa ponta" —
  plausível na tela, e errada nos dados.

### Mudado

- **A Galeria de Vento passa a ter 8 sprites**, de 12. A contagem por bioma já
  era necessária (frost tem 14), e agora o Vento é o outro extremo.

- **As rochas agora são doze ou quatorze assuntos diferentes por bioma**, e não
  variações de pose do mesmo assunto. Vem dos sprites individuais entregues no ZIP
  `sprites_168x168_padronizadas.zip`, com um PNG por modelo, todos com o canvas em
  168×168.

  **A pasta de origem é a fonte da verdade, e não um `manifest.json` ao lado.** A
  primeira versão do fatiador lia a lista do manifest; agora ele lista o
  diretório. Um manifest ao lado da pasta que ele descreve são duas listas para
  sair de sincronia, e foi assim que um sprite novo podia chegar e nunca entrar na
  rodagem.

  **Eu estava errado na leitura anterior, e o número prova.** Eu disse que o
  jitter resolvia a variação, e chamei aquilo de remendo — mas o certo era dizer
  que não resolvia. As folhas 4x3 que eu tinha partido eram Madeiras de Poses:
  em **quatro das seis, as células 5 e 6 eram idênticas pixel a pixel**, e a
  diferença de silhueta entre pares era de 9% a 13%. Ângulo e escala sobre a
  mesma imagem continuam sendo a mesma imagem.

  Medido no material novo, comparando os contornos com o eixo y normalizado
  pela altura de cada sprite (é o que separa uma laje de uma torre):

  | bioma | folha antiga, média | sprites novos, média | mínimo antigo | mínimo novo |
  | --- | --- | --- | --- | --- |
  | sunstone | 11,5% | **20,5%** | 1,0% | 6,8% |
  | frost | 13,1% | **19,8%** | 0,0% | 9,1% |
  | ember | 9,3% | **23,6%** | 0,0% | 11,2% |
  | ruins | — | **24,8%** | — | 12,3% |
  | wind | — | **29,5%** | — | 12,7% |
  | crystal | — | **21,5%** | 0,0% | 11,2% |

  Nenhum par duplicado, em nenhum dos seis.

  - **A contagem de sprites varia por bioma**, e isso quebrou o número único.
    Com 8 a 14 modelos, sortear de 0 a 11 num bioma de 14 funciona e ninguém
    percebe: dois modelos simplesmente nunca aparecem. `ROCK_VARIANT_COUNTS`
    guarda a contagem de cada um, e há teste garantindo que todos aparecem
    mesmo jogando o bioma inteiro.
  - **A grade das folhas passou a 4x4, fixa nos seis biomas.** A versão anterior
    empacotava cada bioma no tamanho exato, e a folha saía com alturas
    diferentes — o que deixava a grade do jogo errada para os biomas que não
    tinham 12. Grade fixa, lista plana, e nenhuma aritmética por bioma no
    índice. As células sobrantes ficam transparentes, e o `endFrame` do
    BootScene corta a folha na contagem real para elas nunca virarem frame.
  - O jitter de ângulo, escala e espelhamento **continua**, mas agora como
    acréscimo sobre assuntos de verdade, e não como substituto.

  Custo: as folhas ficaram 456–641 KB, contra 331–464 KB da versão de células
  cheias. É o preço de mais arte por folha, e o pacote de boot vai de 13,9 MB
  para 14,6 MB.

- **O jitter de ângulo, escala e espelhamento**, derivado de
  (coluna, linha, variante).

  **O motivo está medido, e não é o código.** O jogo estava usando os onze ou
  doze frames certos, com regiões de recorte corretas — confirmado lendo o frame
  que cada sprite recebeu, não o que o mapa pediu. A variação não aparecia
  porque as folhas são variações do MESMO assunto. Diferença de silhueta entre
  pares de células:

  | bioma | mínimo | média | máximo |
  | --- | --- | --- | --- |
  | sunstone | 1,0% | 11,5% | 23,5% |
  | ember | 0,0% | 9,3% | 19,7% |
  | frost | 0,0% | 13,1% | 37,1% |

  E em **quatro das seis folhas as células 5 e 6 são idênticas pixel a pixel**
  (frost, ember, wind e crystal). As células 1, 4, 5, 6 e 7 ficam todas dentro
  de 3% umas das outras em toda folha. Ou seja: de doze modelos, uns sete são de
  fato diferentes, e o resto é a mesma rocha com pose ligeiramente diferente.

  Onze por cento de diferença de contorno, num sprite de 60px, é um borrão de
  6px que o olho junta com o vizinho. Ângulo, escala e espelhamento resolvem sem
  depender da arte, e é o truque padrão para tile que se repete: espelhar dobra
  a variedade de contorno de graça.

  - **O jitter é determinístico.** O mapa é redesenhado a cada rocha quebrada e
    a cada redimensionamento, então jitter sorteado a cada desenho faria as
    rochas pularem de lugar a cada repintura — pior do que nenhuma variação,
    porque parece bug. Há teste de determinismo e de distribuição.
  - **A escala multiplica, não troca.** Trocar a escala tiraria a rocha do
    losango do tile, e a grade do mapa é a única coisa que mantém a leitura.
    Há teste travando o teto de três linhas de fundo coberta.
  - A bomba revelada fica **fora** do jitter. É um marcador de jogo, e um
    marcador que gira e muda de tamanho deixa de ser um marcador.

### Corrigido

- **Zona morta temporal ao desenhar a rocha, pela segunda vez neste projeto.**

  O jitter foi escrito como `.setScale(rock.scaleX * ...)` dentro da cadeia que
  ainda estava produzindo `const rock`. Ler `rock` antes da atribuição completa
  é `ReferenceError` na primeira rocha; a exceção sobe do `renderMap` e a cena
  morre — **canvas preto com o HUD de React por cima**, sem erro de console e
  com build e 72 testes verdes.

  É a mesma classe do bug da pausa, que lia `pauseOpen` declarado depois do
  `useEffect` que o usava. O sintoma é idêntico e o custo de diagnóstico é alto,
  porque nada no build ou nos testes diz que a tela está preta.

  `publishSceneState` ganhou `rockFrames`, que separa **o que o mapa pediu** de
  **o que o sprite recebeu**. Foi essa leitura que mostrou `dados=11,
  sprites=11` — o mapa estava perfeito e ainda assim as 35 rochas eram a mesma
  imagem, porque a variação não estava no caminho do índice. Sem essa
  separação, "os frames estão certos" e "as rochas parecem diferentes" parecem
  a mesma afirmação, e não são.

### Adicionado

- **Rochas por bioma, doze modelos em cada uma.** As seis folhas
  `rocks_<bioma>.png` são recortadas por `node scripts/slice-rocks.mjs`.

  Medido nas seis folhas de entrada: todas com 1448×1086, ou seja uma grade 4×3
  de células de 362px. As 72 células estão preenchidas e nenhuma passa de 360px
  de conteúdo, sobra 1px de calha e nenhum modelo invade o vizinho. As doze
  medidas por bioma variam de 31% a 100% da altura da célula: há laje deitada e
  formação alta, e essa variedade é o que dá a variação no cenário.

  - **A célula de saída é quadrada, e é isso que impede a distorção.** A rocha
    antiga era desenhada com `setDisplaySize(largura, altura)`, que esmaga o
    sprite para aquela caixa e ignora a proporção: o conteúdo de 82×80 aparecia
    em 80×45, comprimido para 56% do natural, e isso já era um defeito. Os
    modelos novos vão de 274×100 a 344×360, e uma caixa única deformaria a laje
    para uma faixa e esticaria a formação para um cilindro. Com a célula
    quadrada e escala uniforme na tela, a variedade de proporção fica dentro da
    célula, que é onde ela pertence.
  - **O tint saiu.** Antes as quatro rochas eram compartilhadas e tingidas por
    `palette.rockHighlight`. O tint do Phaser só multiplica, e isso funciona mal
    sobre arte que já tem cor: tingir uma rocha azul de um azul claro não muda o
    matiz, só lava o contraste. É o mesmo motivo que fez o chão ganhar um atlas
    por bioma.
  - O recorte reduz de 362px para 168px por célula. A rocha ocupa cerca de 60px
    na tela, então 168 é um buffer de 2,8x: sobra para tela de alta densidade sem
    sobrar imagem invisível. Uma folha sai de 1,7–2,2 MB para 286–589 KB.
  - `ROCK_VARIANTS` deixou de ser uma lista de chaves e passou a ser um índice de
    frame. Antes `rock` aparecia duas vezes para pesar o boulder redondo; agora
    os doze modelos entram com a mesma chance, e o índice é número puro para o
    gerador não depender do nome do arquivo.
  - `rock.png` e `rock_01..03.png` saíram. Nenhuma referência ficou.

  **Um bug que só apareceu na tela.** A primeira integração passou o build e os
  66 testes e mostrou 39 caixas pretas com um X verde, que é o placeholder de
  textura ausente do Phaser. A causa foi passar o NOME do frame para
  `add.image`; `load.spritesheet` não recebe `frameNames`, então nome de frame
  não existe. O caminho certo é `setFrame` com índice, que é o que o atlas do
  chão já fazia. Nenhum erro de console, nenhum aviso, build verde.

### Corrigido

- **A afirmação de que só o atlas do bioma atual é baixado era falsa.** O
  comentário do BootScene e o CHANGELOG diziam que o laço carregava um atlas por
  jogador. O laço carrega os seis, e o mesmo vale para os seis fundos. Medido: o
  pacote de boot é de **11,5 MB** antes desta mudança e **13,9 MB** depois, com
  as folhas de rocha entrando.

  A afirmação não era inocente: ela é o que faria alguém acreditar que adicionar
  assets por bioma é de graça. Carregar por bioma na entrada é a correção de
  verdade, e é trabalho de carga assíncrona no meio da partida — não uma troca
  de linha no BootScene. Fica para decidir.

### Removido

- **Os interruptores "Reduzir animações" e "Grade isométrica"** das
  configurações.

  Tirar a opção do menu é uma coisa. Tirar o comportamento junto seria outra, e
  seria um erro nos dois casos.

  - **A animação reduzida continua, e passou a vir do sistema**, por
    `prefers-reduced-motion`. Apagar o interruptor e deixar o comportamento preso
    num booleano salvo tiraria a acessibilidade de quem depende dela. A troca é
    melhor do que a original em dois sentidos: não exige que o jogador saiba que
    a opção existe, procure no menu e ligue; e respeita a preferência de quem
    configurou o sistema inteiro, e não só este site.
  - **A grade isométrica saiu de vez.** `renderIsoGrid` foi junto, e com ele a
    propriedade `this.showGrid` e a linha que o chamava. A grade era resíduo: o
    chão passou a ser superfície contínua, e desenhar a malha por cima era
    justamente o que denunciava a grade.
  - **A chave salva foi neutralizada, e é o detalhe que importa.** `readStorage`
    faz merge com o que está no navegador, e merge é o comportamento certo para
    um default NOVO — mas para uma chave REMOVIDA é o oposto: o `showGrid: true`
    de quem tinha ligado voltava e entrava no estado, sem nenhum interruptor na
    tela para desligar. O efeito seria a grade ligada e sem caminho para sair.
    Por isso `readSettings` descarta as chaves removidas na leitura, e o
    `localStorage` se cura sozinho na gravação seguinte.
  - O payload enviado à cena sai agora de `buildSceneSettings`, e não dos dois
    `dispatchEvent` inline. Eram dois lugares para manter em sincronia, e é
    exatamente aí que a divergência apareceria: um enviaria `reducedMotion` e o
    outro não.
  - A linha "Entrada" ficou, e agora ela informa. Sem o interruptor, "Entrada:
    Reduzida" seria um fato que o jogador não pode mudar; com a media query atrás
    dela, é a resposta a uma pergunta feita no sistema e respeitada aqui.

  Verificado no navegador: o cenário perigoso foi semeado de propósito
  (`reducedMotion: true` e `showGrid: true` no `localStorage`). Depois da carga as
  duas chaves tinham desaparecido do que é gravado, a cena desenhou o mapa sem a
  grade, e com a media query simulada como `reduce` a cena recebeu
  `reducedMotion: true`.

### Mudado

- **A barra de utilitários ficou transparente, e sem os rótulos de texto.**

  Os textos `VIDA`, `DURO` e `SEGURO` saíram. O ícone já carrega o tom e a
  função — e o nome completo continua no `aria-label` e no `title` do botão,
  então nada de acessibilidade foi perdido. `shortName` foi junto, porque só
  existia para alimentar o rótulo.

  A opacidade do fundo caiu de 0,86 para 0,45, e o preenchimento dos slots
  também. A 0,86 a barra lia como painel colado na tela; a camada é a mais alta
  da tela e precisa parecer que está **sobre** o mapa, não no lugar dele.

  - **Baixar a opacidade sozinho quebrava a leitura, e isso foi medido.** Com a
    barra em 0,42, a contagem caía de 4,0 para 1,4 de contraste sobre a arte
    clara do Cristal — os três itens ficavam abaixo de AA para texto pequeno.
    Transparência e legibilidade estavam em conflito direto.
  - A saída foi resolver a legibilidade **no texto**, e não no fundo: a
    contagem e o ícone ganharam um halo escuro atrás do glifo. O halo escurece o
    fundo local em vez de clarear o texto, então o contraste volta ao do tom
    contra quase-preto — **6,7 ou mais em qualquer cenário**, contra 1,6 sem o
    halo. A barra pôde descer para 0,45 sem custo de leitura.
  - O quadradinho de fundo da contagem também saiu. Era mais uma camada de
    preenchimento empilhada sobre a barra e o slot, e é o mesmo defeito que a
    barra opaca tinha.

### Adicionado

- **A barra de utilitários ganhou uma cor por item.**

  A barra somava três reduções de uma vez: `opacity: 0.3` no botão inteiro,
  `--ink-faint` no rótulo e `--ink-dim` na contagem. O resultado era um borrão
  que competia com a arte do bioma em vez de informar — e, pior, os três botões
  ficavam visualmente idênticos, então o jogador tinha que ler o rótulo para
  saber o que era o quê.

  - **Cada utilitário tem o seu tom**, e o tom mora no catálogo em `App.jsx`, não
    no CSS: rosa para vida, âmbar para bomba, ciano para bússola. A lista já é a
    fonte de verdade, e duplicar os tons no CSS seriam duas listas para manter em
    sincronia — o mesmo motivo dos biomas.
  - **O botão nunca mais fica transparente.** O que muda é o alfa do tom, e só
    isso. O slot vazio continua legível, porque o jogador precisa ver que existe
    uma poção de vida mesmo tendo zero delas.
  - Medido o contraste do rótulo contra o fundo da barra, composto sobre a arte
    escura do bioma: **5,2 / 7,4 / 8,0**, os três em AA. Antes eram 3,2 / 2,8 /
    2,8, abaixo de AA para texto pequeno.
  - A contagem virou um quadradinho com o fundo no tom, e o ícone ganha um
    brilho curto quando há item. Continua hairline em vez de card, que é a regra
    do design.

  Não entrou gradiente preenchido nem `box-shadow` no botão: as duas coisas estão
  de fora de propósito no cabeçalho deste arquivo, porque denunciam "web".
  A cor vem de matiz e saturação, com a moldura continuando de 1px. (A
  transparência e a remoção dos rótulos são a entrada seguinte.)

### Adicionado

- **Fundos pintados da Galeria de Vento e da Câmara de Cristal.**

  Os dois biomas novos entraram com o fundo gerado por
  `scripts/generate-backdrops.mjs`, e foram substituídos por arte pintada, no
  mesmo estilo dos outros quatro.

  - `scripts/generate-backdrops.mjs` agora **recusa escrever** sem `--force`.
    Um script que grava no mesmo caminho da arte é armadilha: uma execução
    acidental apagaria dois PNGs que ninguém consegue regenerar. O script continua
    versionado porque é ele que registra, em código, a construção que a arte
    segue — e, mais importante, as medições do que deu errado: a parede branca
    por falta de clamp no `smoothstep`, o chão que nunca aparecia porque
    `pesoChao` estava invertido, o moiré do chão vindo da escala da textura
    variar a cada linha, e a cúpula de neve de `chao[px]` repetindo a
    perspectiva que `ombro` já fazia.
  - Os arquivos são 1536×1024 contra 768×512 dos outros quatro, na mesma
    proporção 3:2, então o `coverScale` do Phaser enquadra igual. O custo é o
    peso: 2,8 MB contra 0,6 MB por fundo, e o BootScene baixa o do bioma atual.

- **Dois biomas novos: Galeria de Vento e Câmara de Cristal**, e as faixas
  encolheram de 20 para 10 caves. São 6 biomas e 60 caves, era 4 e 80.

  A Galeria de Vento é o alívio no meio da progressão: ×1.12 de moeda e
  ×0.94 de bomba, o mais fácil do jogo depois da Mina Solar. A Câmara de
  Cristal é o oposto e o fim: ×0.88 de moeda, ×1.20 de bomba e a maior chance
  de relíquia (0.24). Entre os dois há uma queda proposital de dificuldade, que
  é o que faz o sexto bioma parecer um degrau e não uma continuação.

  - **Os fundos dos biomas novos chegaram gerados**, por
    `scripts/generate-backdrops.mjs`, e foram depois substituídos por arte
    pintada. Os quatro existentes são pintados, e um retângulo liso ao lado
    deles denuncia o bioma novo na hora.
  - **A Galeria de Vento tem correntes de ar** cruzando a galeria, e a Câmara de
    Cristal tem facetas planas na parede. São as assinaturas que differentiate
    os dois de uma caverna genérica.
  - O chão de cada bioma novo também é um atlas próprio (`ground_wind`,
    `ground_crystal`), porque o tint do Phaser só multiplica: tingir um atlas
    marrom de ciano daria lama, não cristal.
  - A decoração por bioma virou uma **tabela** (`DECO_BY_BIOME`) no lugar de uma
    cascata de `if (biome.id === 'x')`. Com a cascata, os biomas novos caíam
    direto no genérico e recebiam entulho de morro, que não diz nada sobre o
    lugar. Com a tabela, um bioma novo entra por dados.

- **Pausa com Esc**, com Continuar e Ir para o menu.

  A tecla Esc já fechava modais, e continuava fazendo isso: a pausa é o último
  caso da cadeia, depois de loja, seleção de bioma, configurações, informações e
  decisão de saída. No lobby e no menu ela não abre, porque não há jogo para
  pausar.

  - O overlay é React e a cena é Phaser, então o congelamento real acontece por
    um evento `cob-pause`: a cena chama `scene.pause()`, que para o `update` e o
    input. A alternativa seria um `if (this.paused) return` no fim de cada
    handler, e isso não cobre o que o Phaser despacha direto, como o timer de
    uma armadilha.
  - **"Ir para o menu" reaproveita `backToMainMenu`**, que já existia e é usado
    pelo lobby de derrota. Ela preserva moedas, melhorias e relíquias, então
    escrever um segundo caminho seria duas regras para a mesma coisa. O texto da
    dica diz o que acontece: a cave recomeça no início do bioma.
  - Se a cena morrer pausada, o `shutdown` retoma. Sem isso o overlay ficaria
    esperando um `resume` que nunca viria, e o estado do Phaser e o do React
    discordariam ao voltar ao menu.

  Um bug meu aqui valeu mais que o recurso: o `useEffect` que dispara a pausa
  lia `pauseOpen`, declarado **depois** dele no arquivo. É zona morta temporal e
  derrubava o app inteiro — `#root` vazio, zero botões, build passando e os 55
  testes passando. O sintoma era "o jogo não carregou", o mesmo do `setTint` em
  Container. Só apareceu no console do navegador. A correção foi mover a
  derivação para logo abaixo dos `useState`, antes de qualquer efeito que a
  leia.

### Removido

- **O cenário procedural por cima do fundo da caverna.** Eram ~40 pedras com
  `alpha` de 0,14 a 0,16 ao longo das bordas, mais 18 fissuras desenhadas e 34
  pontos de poeira, desenhados por cima da arte do bioma.

  Sobre uma arte de caverna completa, isso aparecia como formas fantasma
  atravessando o logo do menu: um borrão que não pertencia a lugar nenhum e só
  escurecia o fundo. `addBackdropRock` e `drawCaveCracks` saíram junto, e
  ficaram sem caller.

- **O mapa desenhado na tela de título.** O modo attract chamava `renderMap()`,
  então o menu tinha chão, rochas, entrada e saída de verdade por cima do
  fundo. Agora a tela de título mostra a arte do bioma e nada mais, que é o que
  uma tela de título de console faz. O lobby passou a usar o mesmo renderizador:
  sem mapa, a sombra de chão arredondada virava um retângulo vazio no meio da
  caverna.

- **As frases que explicavam as ações.** "começar a run", "tela cheia, grade,
  animação", "biomas, relíquias, objetivos", "React · Phaser · Vite", as
  descrições de cada interruptor das configurações e as linhas de contexto da
  pausa e da seleção de bioma. Restaram os rótulos, o número de caves e
  biomas, e o aviso de tela cheia no iPhone — esse fica porque o caso é do
  navegador, e sem ele o jogador acha que a configuração quebrou.

  O que ficou é o que o jogador não consegue deduzir sozinho: o badge de
  estado de cada bioma, e a cave que libera o bioma bloqueado.

### Corrigido

- **A dificuldade reiniciava a cada bioma.** Com as faixas encolhidas para 10
  caves, `getRockHp` e a densidade de bomba usavam a cave *local* do bioma, então
  a Cave 11 era mais fácil que a Cave 10 e a Galeria de Cristal abria mais
  leve do que a Cave 40 tinha fechado. As duas rampas agora são sobre a cave
  global, e o degrau entre biomas vem do índice do bioma por cima.

  O mesmo erro fazia a soma zerar na Cave 51, e a rocha virava **inquebrável**.
  Há teste agora para que nenhuma cave do jogo saia com 0 de resistência.

- **O teto de densidade de bomba não era teto.** `Math.min(0.3, ...)` era
  aplicado *antes* do `bombMultiplier` do bioma, então a Câmara de Cristal
  passava dele e chegava a 0,36. O clamp foi para depois do multiplicador.

- **O tamanho do mapa crescia sem parar.** `getMapSize` usava `4 + (cave - 1) / 2`,
  e com 80 caves a maior era 43×31, impossível de ler. Agora cresce *dentro* do
  bioma, de 6×7 a 9×9, e o próximo bioma recomeça pequeno. O atlas de 14×12
  passou a ter folga de verdade.

- **O chão da Câmara de Cristal era quase igual ao das Ruínas.** O teste de
  cores distintas reprovou com distância 19,7 contra um corte de 30: o cristal
  era um azul acinzentado, e as Ruínas também. Puxado para ciano saturado, que
  o afasta das Ruínas e do Vento ao mesmo tempo.

### Mudado

- **O chão passou a acompanhar o tema de cada bioma.**

  Antes os quatro biomas usavam o mesmo atlas de terra, e a diferença vinha só
  do tint. Isso não funciona: **o tint do Phaser só multiplica**, então tingir
  terra marrom de azul dava lama escura, e a Gruta de Gelo ficava com chão de
  marrom escuro em vez de neve. Medido: o chão de gelo saía com luminância 66
  contra 91 da Mina Solar.

  Agora há um atlas por bioma, com o **mesmo relevo e a mesma estrutura** e
  material diferente: cor, intensidade da fissura e quanto o seixo levanta. A
  Mina Solar é terra batida, a Gruta de Gelo é neve compactada, as Profundezas
  Rubras são rocha vulcânica e as Ruínas são pedra lavrada.

  - As luminâncias são deliberadamente diferentes: gelo tem 187 e brasa tem 60.
    Com a mesma luminância nos quatro, o chão só mudaria de matiz e não passaria
    a sensação de ambiente diferente.
  - `palette.ground` virou quase branco em todos os biomas. Ele continua sendo
    o ajuste fino, mas a cor mora na textura — e um tint escuro escureceria o
    mesmo pixel duas vezes.
  - O custo por jogador é o de **um** atlas, porque o BootScene carrega os quatro
    e o jogo baixa só o do bioma atual. No repositório são 2,26 MB.
  - `scripts/preview-biomes.mjs` monta os quatro lado a lado, e
    `scripts/png-encode.mjs` foi extraído para os scripts pararem de duplicar o
    codificador de PNG.
  - 4 testes novos: cada bioma tem cor própria, nenhum par de biomas sai
    parecido, a luminância varia, o tint é quase branco, e cada bioma tem
    textura e material.

### Adicionado

- **Modo desenvolvedor nas configurações.** Um interruptor que libera todos os
  biomas de uma vez, para pular direto para qualquer ambiente.

  Existia um problema concreto por trás: ver o chão e a paleta da Gruta de Gelo
  exigia jogar a run inteira até a Cave 20, que é exatamente o que se quer
  evitar ao testar uma textura. O caminho normal de progressão continua intacto
  — a flag só afeta `getUnlockedBiomes`.

  - A tela de seleção marca os biomas liberados assim com badge **Dev** e borda
    tracejada, e diz qual cave os libera de verdade. Um bioma que só está
    liberado pelo modo dev não pode aparecer como "Concluído", senão a tela
    mente sobre o estado da progressão.
  - O cabeçalho da seleção e o painel de informações dizem "Modo desenvolvedor"
    em vez de "Melhor cave N", porque nesse estado a melhor cave não explica
    por que os quatro estão na lista.
  - **O "Reiniciar progresso" preserva a flag.** O botão se chama
    *reiniciar progresso*, e desligar a ferramenta de teste no meio de uma
    sessão seria surpresa. As demais preferências continuam voltando ao padrão.
  - `getUnlockedBiomes` devolve uma cópia no modo dev, não o array `BIOMES`
    direto: um `sort` ou `reverse` na tela quebraria a ordem dos biomas para
    sempre.
  - `isBiomeUnlocked` foi extraído para responder à mesma pergunta em um só
    lugar, e há teste garantindo que as duas funções concordam — se divergissem,
    a tela de seleção e a de informações discordariam entre si.
  - 6 testes novos (`test/devmode.test.mjs`): o caminho normal segue o
    `unlockCave`, nenhum atalho abre bioma futuro, o modo dev libera tudo em
    qualquer cave, e as duas funções concordam.

  Verificado no navegador: ligar a flag mostra a nota com os valores derivados
  dos dados, os quatro biomas ficam clicáveis, e entrar na Gruta de Gelo na
  Cave 1 funciona com `bestCave` preservado em 1.

### Mudado

- **O chão deixou de ser liso: agora é terra de caverna, com relevo.**
  A versão anterior era matematicamente contínua e ainda lia como chão liso.
  A causa não era amplitude, era falta de estrutura.

  Medi a referência de terra batida antes de mexer em qualquer número
  (`scripts/measure-reference.mjs` e `scripts/measure-floor-scales.mjs`).
  Duas descobertas:

  1. **O contraste da referência é quase plano entre as escalas** — desvio de
     15,4 na escala 2 caindo a 8,4 na escala 64. A primeira versão do chão já
     tinha contraste alto em todas as escalas (razão 1,15 a 1,72) e mesmo assim
     lia como liso. Ou seja, **amplitude não era o problema: organização era**.
     Ruído alto não vira terra, vira granulado.
  2. **A densidade dos seixos estava errada por um fator grande.** Com
     frequência 0.95 havia uma pedrinha por célula; a referência tem várias, de
     8 a 40px numa célula de 96px.

  A síntese deixou de ser "soma de ruídos" e passou a ser um **campo de altura
  iluminado**:

  - `groundHeight` monta torrões, seixos e cascalho num campo de relevo, em
    três escalas.
  - `shadeFromHeight` tira a normal por diferença central e aplica luz de
    cima-esquerda. É o que dá volume a cada seixo: face de cima clara, base
    escura. Sem a derivada, seixo é mancha chapada e some.
  - A cor vem do solo (rgb médio 126,79,39 contra rgb(136,84,39) da referência),
    não de uma rampa de cinzas.
  - O perfil medido contra a referência ficou em **0,96 / 1,07 / 1,11 / 1,10 /
    0,97 / 0,76** nas escalas 2 a 64 — praticamente sobre a referência.

  Três bugs meus, todos achados por medição e não por olho:

  - **A fissura não podia estar no campo de altura.** Uma fissura é um vale, e
    um vale tem dois lados cujas normais apontam para lados opostos: iluminar o
    relevo deixava a borda clara dos dois lados, e o chão virava um polígono
    CONTORNADO — exatamente a malha que o chão contínuo existe para eliminar.
    Agora a fissura é aplicada só na cor, como oclusão.
  - **`crack` chegava a 18,8** porque a máscara não era limitada antes de
    multiplicar. A fresta saía preta sólida e virava o traço mais escuro da
    cena. O `clamp01` no termo da máscara resolve; há teste travando.
  - **Luz e tom estavam somados**, dando contraste por escala de 2,2 contra o
    alvo de 1,0: o relevo já produzia variação e o tom da rampa somava mais
    uma vez. Separados, cada um no seu lugar.

  Ferramentas novas, todas de medição:

  - `scripts/measure-reference.mjs` — mede contraste por escala, densidade de
    seixos e continuidade de borda de uma imagem de referência.
  - `scripts/measure-floor-scales.mjs` — compara o perfil do chão com a
    referência, em duas colunas lado a lado.
  - `scripts/attribute-contrast.mjs` — zera um termo do campo de altura por vez
    e mede o efeito. Foi ele que mostrou que a densidade dos seixos, e não a
    nitidez do perfil, era o culpado: minha primeira hipótese (a borda dura do
    `smoothstep`) estava errada, e trocar por uma gaussiana não mudou nada.
  - `scripts/measure-lambert.mjs` — imprime a distribuição do termo de luz.
  - `scripts/png.mjs` — leitor de PNG em RGBA, compartilhado.

  3 testes novos (`test/ground.test.mjs`): nenhum campo da superfície sai de
  [0,1], a fissura é rara (cobre menos de 12% do chão), e o chão é marrom de
  terra e não a rampa de cinza anterior.

  Um teste meu estava medindo a coisa errada e acusou descontinuidade onde não
  havia: media `light`, que passa por `clamp01`, então o degrau máximo travava
  em 0,50 para qualquer passo — era saturação do clamp, não salto. Passou a
  medir `height`, que não tem clamp, e o limiar foi justificado por medição
  (o salto de gradiente CAI ao refinar, que é a assinatura de continuidade).

### Corrigido

- **Tela preta em toda cave.** Regressão introduzida na mesma entrega do chão
  novo. `this.floorLayer.setTint(biome.palette.ground)` no fim do `renderMap`
  estourava um `TypeError`.

  `Phaser.GameObjects.Container` **não tem `setTint`**: os mixins dele são
  AlphaSingle, BlendMode, ComputedSize, Depth, Mask, PostPipeline, Transform e
  Visible, sem Tint. A exceção acontecia depois do fundo já desenhado, então a
  cena morre ali e sobra uma tela preta com o HUD de React intacto por cima —
  o HUD é React e o mapa é Phaser, e é por isso que a falha parecia "o jogo
  não carregou" em vez de "um método não existe".

  Confirmei no navegador: `Container.prototype.setTint` é `undefined` enquanto
  `Image.prototype.setTint` é `function`.

  O tint agora é posto em cada célula do chão, com a **mesma** cor para todas.
  Isso não ressuscita a grade: grade nasce de valor *variado* por tile, que cria
  degrau de luminância na fronteira; uma cor só é aritmeticamente o mesmo que
  tingir a camada inteira. `fallbackFloor` também foi tingido, senão o atlas
  cinza apareceria cru ao quebrar a rocha.

  - **10 testes novos** (`test/scene.test.mjs`) por verificação estática do
    código da cena, porque essa classe de falha não é pegada por build nem por
    teste de unidade: o build passava, os 36 testes passavam e o console estava
    limpo. O erro só aparecia com o jogo em execução. O teste central é "nenhum
    Container recebe `setTint`", e eu confirmei que ele falha se a linha for
    reintroduzida. Os outros checam o frame config do spritesheet, o tint
    constante do chão, a ordem do tint contra entrada/saída, e que
    `palette.ground` existe e é claro o bastante nos quatro biomas.

### Mudado

- **O chão da cave deixou de ser arte de tile e virou uma superfície
  contínua.** A grade não era efeito de estilo: estava gravada na arte.

  `floor_01..03` eram um bloco com **grelha 3x3 de nove lajes** e rejunte
  escuro, mais a moldura clara do losango. Desenhada célula a célula, a
  malha se repetia em cada tile. Encostar o losango na célula (a tentativa
  anterior) removia a junta escura entre tiles, mas a grelha de 3x3
  continuava visível dentro de cada um — nenhuma escala ou sobreposição
  remove aquilo, porque está dentro do PNG. Saiu a arte de piso; no lugar
  dela entra uma superfície gerada.

  `src/game/ground.js` sintetiza o chão como função das coordenadas
  **contínuas** de mapa, invertendo a projeção isométrica
  (`colf = dx/tw + dy/th`, `rowf = -dx/tw + dy/th`). Como a função não
  depende da célula, duas células que compartilham uma aresta amostram a
  mesma curva: a emenda é contínua por construção, sem costura e sem
  ajuste. `scripts/generate-ground.mjs` recorta essa superfície num atlas
  de 14x12 células (512 KB, 50% opaco porque os cantos ficam transparentes
  e os losangos vizinhos preenchem).

  - **Nenhuma malha de ruído alinha com a grade.** Os eixos de (colf, rowf)
    são os eixos da célula, então o domínio é girado ~20° antes da
    amostragem, e as frequências sobem por 2.03 em vez de 2 — progressão
    geométrica exata restaura simetria e o chão volta a parecer desenho
    repetido.
  - **Poças de luz, cascalho e fendas.** Ruído em várias frequências para
    manchas largas, granulação e grão; duas camadas de Voronói para seixos
    (com raio variado por seixo e volume pela direção do centro) e uma para
    fendas, mascaradas por ruído de baixa frequência para aparecerem em
    recortes e não como teia de polígonos. O jitter dos pontos do Voronói vai
    de 0.15 a 0.85: com 0 a 1 as arestas ficam retas demais.
  - **Rampa clara de propósito.** O tint do Phaser multiplica, então a cor
    final é a rampa vezes `palette.ground`; com a rampa escura o chão saía
    lamacento, sem folga para o bioma clarear.
  - **Um atlas para os quatro biomas.** A cor entra como tint na camada
    inteira, não em cada célula — tingir célula por célula criaria degraus de
    luminância exatamente na fronteira, que é a grade de novo.
  - `palette.ground` novo nos quatro biomas; `floorVariant` e `floorTone`
    saíram do gerador de mapa. A rampa de cinzas também dá variação de
    temperatura (quente/frio) balanced, para o chão não ficar cinza chapado
    sob qualquer tingimento.

- **A célula é desenhada 1px maior que o losango.** As arestas de células
  vizinhas caem em posições fracionárias (a meia-altura é 24,5px) e, sem
  essa sobreposição, o filtro bilinear deixa um fio de fundo em cada
  aresta — a grade de novo, agora fininha.

- Teto de escala do mapa de 1.16 para 1.35, porque com o chão ocupando a
  célula inteira a cave ficava pequena no meio da tela.

- **12 testes novos** (`test/ground.test.mjs`) em vez dos 7 de piso. O
  invariante central é que a aresta compartilhada amostra a mesma curva de
  mapa, verificado nas duas formas de aresta do losango e nos dois sentidos.
  Três testes medem descontinuidade do jeito certo, e vale registrar por quê,
  porque três vezes o critério ingênuo deu um alarme falso:

  - "salto pequeno entre amostras vizinhas" **acusava um degrau de 0,35 que
    não existe** (o máximo real é 0,011): comparava um ponto com outro 0,8 de
    mapa adiante. E mesmo corrigido, é o critério errado — uma fenda escura é
    legitimamente íngreme. O teste certo divide a amostragem por 2 e exige
    que o degrau encolha junto: descontinuidade não encolhe.
  - "diferença de cor entre células vizinhas" dava 10 níveis, e vinham de as
    duas amostras estarem a até 0,05 de mapa de distância. O certo é comparar
    o gradiente **atravessando** a fronteira com o gradiente **dentro** da
    célula: numa superfície contínua o primeiro é comparável ao segundo, e
    com costura seria muito maior. Medido no render: **0,16**.
  - "nenhuma célula pode ser chapada" reprovava com variação de 3,9 numa
    célula. Regionais localmente suaves são o que torna a superfície natural;
    o que denunciaria arte por tile é a repetição, e esse teste virou "o
    centro de cada célula tem cor distinta".

### Removido

- `public/assets/floor_01..03.png`, `scripts/measure-floor.mjs` e
  `test/floor.test.mjs`. A arte de piso e a medição dela deixaram de existir;
  o chão é sintetizado.

### Adicionado

- `scripts/generate-ground.mjs` gera `public/assets/ground_atlas.png`.
- `scripts/preview-ground.mjs` reproduz em Node a camada de chão exatamente
  como o jogo a desenha (posição isométrica, `setDisplaySize(tileWidth + 1,
  tileHeight + 1)`, amostragem bilinear, tint do bioma) e **mede** o salto
  através das fronteiras contra o salto dentro das células. Foi a
  ferramenta que permitiu iterar sem navegador.
- `getMapSize` passou a ser exportada: o atlas precisa cobrir o maior mapa e
  essa verificação só faz sentido contra a função que define o tamanho.

### Mudado

- **Identidade visual inteira refeita** no sentido de tela de título de console,
  no lugar de painel de web.

  - **Fontes embutidas** (396 KB, subsets latin + latin-ext): Cinzel para
    títulos, Barlow/Barlow Condensed para UI, IBM Plex Mono para números.
    `scripts/fetch-fonts.mjs` rebaixa do Google Fonts; nada de CDN, porque o
    PWA precisa da mesma cara offline. Saiu a Inter.
  - **Menu principal virou coluna à esquerda** com itens em caixa alta e
    tracking largo, separadores de 1px, barra de acento no hover, dica
    opcional à direita e versão/stack no rodapé. Saiu o painel centralizado
    com borda e os três botões de gradiente verde.
  - **HUD** como faixa de telemetria: label minúscula em caixa alta com tracking
    + numeral em monoespaçada, separado por hairlines. Emoji saiu do HUD.
  - **Botões** hairline, sem gradiente preenchido; o estado selecionado das
    melhorias virou barra de acento em vez de fundo colorido.
  - **Modais e lobby** sem `backdrop-filter` e sem sombra de card; divisórias
    de 1px e títulos em Cinzel.
  - Recolorido de toda a paleta para algo mais escuro e dessaturado, deixando a
    cor para o mapa.

- **Modo attract no menu principal**: o mapa vira arte de fundo e os
  marcadores `IN`/`SAÍDA` deixam de ser desenhados. Antes eles apareciam por
  cima da vinheta e pareciam defeito.

### Adicionado

- `Esc` fecha modais em ordem de camada e sai da tela cheia. Em tela cheia o
  Esc pertence ao navegador e o handler ignora, senão os dois acontecem
  juntos.
- Ações fixas no fim do scroll em lobby, configurações, informações e seleção de
  bioma. O modal de informações rola ~1000px numa caixa de 450px e o "Fechar"
  ficava abaixo da dobra, sem como sair pelo teclado.
- `aria-hidden` nas dicas do menu: sem isso o nome acessível do botão virava
  "Entrar começar a run".

### Corrigido

- **Corrida de inicialização React ↔ Phaser.** Os eventos de intenção de UI
  (configurações, modo attract, altura do HUD) são disparados no mount do
  React, mas a cena do Phaser só existe depois — então se perdiam na primeira
  carga. Isso significava, por exemplo, que "reduzir animações" e "grade
  isométrica" não se aplicavam até a próxima interação. A cena agora anuncia
  `cob-scene-ready` e o React reenvia o estado atual.

### Corrigido

- **A Poção Caminho Seguro nunca funcionava — em nenhuma cave.** A busca de
  rota exigia "não é rocha E não é bomba". No começo da cave o único tile
  aberto é a entrada, então a busca nunca saía dela e não alcançava a saída,
  que é uma rocha. Medido: **0 sucesso em 2.400 caves geradas**. A condição
  correta é só "não é bomba" — atravessar rocha é justamente o serviço da
  poção, que diz quais pedras quebrar sem tomar bomba. Esse comportamento foi
  introduzido ao "consertar" a rota segura na versão anterior.
- **A rota segura não aparecia.** Mesmo com a busca certa, o destaque verde era
  desenhado antes do `if (isRock)` e ficava atrás da laje. Agora é desenhado
  depois, por cima.
- **1,5% das caves ficavam sem rota possível** (saída isolada por bombas). O
  gerador agora limpa só as bombas do caminho mais curto até a saída, o que
  preserva a densidade no resto da cave. Medido: 2.400/2.400 = 100%.
- 4 novos testes travam isso: existência da rota em todas as caves, rota sem
  bomba, rota contígua da entrada à saída, e rota que de fato atravessa rocha.

### Adicionado

- Aviso rápido (toast) que aparece sozinho quando uma ação não teria efeito:
  vida cheia, nenhuma bomba restante. Não é fila nem log, e nunca acumula.
- "-N" flutuando sobre a rocha mostrando quantos cliques ainda faltam.
- Flash vermelho na rocha quando o clique não vale, explicando o porquê no
  ponto do interaction em vez de num canto da tela.
- Pulso no pill de vida e no de risco ao usar uma poção.

### Mudado

- **Removido o registro de ação da tela.** Ele empilhava uma linha por evento e
  cobria o canto do mapa. O feedback da exploração continua existindo, mas no
  próprio mapa: moeda subindo, explosão, relíquia, tremor da rocha, contagem
  de dano, e o contorno vermelho no hover de rocha inalcançável.
- Nenhum utilitário é mais bloqueado por momento da run. Enquanto o jogador
  estiver numa cave e tiver o item, usa. Quando o uso não teria efeito
  (vida cheia, nenhuma bomba sobrando) o item **não é consumido** e um aviso
  rápido explica.

### Adicionado

- **Tela cheia ao começar a run**, em desktop e Android. O pedido sai do mesmo
  clique que entra no jogo: a Fullscreen API só aceita gesto do usuário, e a
  intro roda em `setTimeout`, então pedir depois seria sempre recusado.
- Botão de sair da tela cheia no canto da tela durante a partida. Em touch não
  existe `Esc`, e sem isso quem entrasse em tela cheia ficaria preso.
- No Android, o travamento de orientação em paisagem é refeito depois que o
  pedido de tela cheia resolve — `screen.orientation.lock()` só funciona já
  em fullscreen na maioria dos aparelhos.
- `src/game/fullscreen.js` isolando a API, com detecção de plataforma e
  mensagens de erro acionáveis.
- Configuração "Tela cheia ao começar" (ligada por padrão) e detecção de PWA:
  quando o jogo já está instalado, a tela cheia é tratada como o estado
  desejado, e não como um pedido que falhou.
- 12 testes cobrindo a detecção de suporte, iOS (incluindo o iPadOS 13+ que se
  apresenta como Mac), normalização do retorno `void` de navegadores antigos,
  toggle e as quatro causas de falha.

### Corrigido

- O aviso de falha de tela cheia ficava dentro do gate de gameplay, mas a
  falha acontece na intro — o jogador nunca veria a explicação.
- `onFullscreenChange` acessava `window` sem guarda e quebrava fora do
  navegador (achado pelo teste).

## [0.2.0] — 2026-09-25

### Corrigido

- **Tela preta sem menu entre 641px e 900px de largura em retrato.** O React
  escondia o menu abaixo de 900px, mas o overlay de "gire o celular" só ficava
  visível abaixo de 640px por CSS. Não havia nada na tela e nenhuma forma de
  sair. O overlay agora é controlado só pelo React e nunca é escondido por CSS.
- **Janela de desktop estreita era tratada como celular.** A detecção era só
  `largura <= 900 && altura > largura`; agora exige `pointer: coarse`.
- **Ordenação de profundidade isométrica invertida.** Filhos de
  `Phaser.Container` são desenhados na ordem de inserção — `setDepth()` não
  tem efeito dentro deles — e o loop `row -> col` não é monotônico em Y. Uma
  grade 4x5 tinha 15 inversões, ou seja, rochas da frente eram pintadas atrás
  de tiles que deveriam ficar atrás delas. O mapa agora é ordenado por Y antes
  de ser desenhado.
- **Chão e rocha com proporção distorcida.** O chão era forçado para
  `tileWidth + 4 x tileHeight + 18`, achatando o losango isométrico e fazendo
  os tiles se sobreporem; as rochas eram forçadas para 0.75w x 1.72h, o que
  transformava a laje em uma cúpula espremida. Ambos respeitam a proporção do
  desenho agora.
- **HUD cobrindo o mapa.** O Phaser centralizava a câmera com um deslocamento
  fixo de 50/58/74px, mas o HUD em React quebrava em 2 linhas e chegava a
  116px. A altura real do HUD agora é medida e devolvida ao renderer.
- **HUD e barra de utilitários sobrepostos.** A 790px de largura o HUD
  terminava em x=625 e a barra começava em x=594. Os dois viraram uma barra
  única em grid.
- **Feedback de gameplay invisível.** `lastMessage` era escrito a cada evento
  e nunca renderizado. Existe agora um registro na tela.
- **Objetivo "Explorador" farmável.** Clicar na saída várias vezes na mesma
  cave contava a cave como concluída várias vezes.
- **Bioma destravado ao morrer.** O reset fazia `Math.max(bestCave, cave)`,
  o que liberava o próximo bioma sem nunca ter concluído uma cave dele.
- **Picareta 05/06/07 eram cartas mortas.** O poder é limitado a 5, mas o
  catálogo oferecia 7 níveis; os três últimos não mudavam nada.
- **Cascata de quebra vazando entre caves.** `time.delayedCall` continuava
  pendente depois da troca de cave e podia conceder moedas da cave anterior na
  próxima. Todos os callbacks agendados agora são cancelados no refresh.
- **Hover pendurado após redesenho.** Usar a poção dedal-duro redesenhava o
  mapa e deixava `hoveredRockTile` apontando para um sprite destruído.
- **Rota segura atravessando rocha maciça.** A busca tratava qualquer tile que
  não fosse bomba como caminhável, incluindo rochas inteiras.
- **Caves sem solução possível.** O gerador protegia os quatro lados da rocha da
  saída para mantê-la escondida, mas sem garantir que algum deles tocasse a área
  aberta. Em 4.800 caves geradas, 4.475 tinham a saída inalcançável — a run não
  tinha como terminar. `ensureExitReachable` agora abre o trecho de caminho
  até um vizinho da saída, e um teste trava o invariante.
- **`openExitDecision` definido duas vezes** na `CaveScene`; a segunda
  definição sobrescrevia a primeira silenciosamente.
- **Eventos mortos:** `cob-buy-upgrade` e `cob-next-cave` eram escutados sem
  nunca serem emitidos, e `cob-utility-found` era emitido sem escuta.
- **Duas syncs de estado por ação.** `syncUI()` disparava `cob-state` e
  `cob-sync-ui`, duplicando o render do React a cada rocha quebrada.
- **Import e função sem uso:** `isExitUnlocked` e `renderStatusBanner` (que só
  chamava o próprio clear).

### Adicionado

- Registro de exploração na tela, com as últimas mensagens.
- Contador de bombas restantes na cave, o que torna a decisão de risco
  informada em vez de cega.
- Configurações de verdade: reduzir animações, grade isométrica e lembrar
  melhor cave em `localStorage`.
- Grade isométrica opcional, com tecla de ligamento/desligamento.
- Feedback de dano e quebra: tremor da rocha e estilhaços.
- Persistência do recorde de cave e das configurações entre sessões.
- Selo de deploy, README reescrito, `LICENSE`, `CONTRIBUTING`, `CHANGELOG`,
  templates de issue e CI + GitHub Pages.
- `aria-label`, `aria-pressed` e `aria-live` nos controles do HUD.

### Mudado

- Contagem de bombas trocada por **densidade**: a Cave 1 tinha ~24% de chance de
  bomba por rocha com 2 de vida, matando a run por sorteio antes de qualquer
  decisão. Agora a densidade sobe de 12,7% na Cave 1 para 24,9% na Cave 20 —
  uma curva de dificuldade que cresce de verdade.
- Resistência das rochas passou a escalar com a profundidade do bioma (5 → 9);
  antes a Cave 20 era idêntica à Cave 1.
- Entrada de 6s para ~3s, e a splash de 5,4MB virou 156KB.
- Assets sem uso removidos (`cave_bg.png` com 2,4MB, `floor.png`), o que levou
  `public/` de ~12MB para ~2,9MB.
- `vite.config.js` passou a usar `base: './'`, então o mesmo build funciona na
  raiz, em `/CoinsOrBombs/` e em qualquer subpasta.
- Bundle separado em chunks de Phaser e React.
- Bônus de moedas agora alimenta de fato a chance de drop no gerador de mapa.
- 7 testes com `node:test` cobrindo os invariantes de geração de mapa e
  progressão, rodando no CI e no deploy.

### Corrigido em texto

- README descrevia um jogo com personagem, WASD, duas bombas e "HUD lateral com
  log" que não existem nesta versão.

[Não publicado]: https://github.com/adielribeiro/CoinsOrBombs/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/adielribeiro/CoinsOrBombs/releases/tag/v0.2.0
