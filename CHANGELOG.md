# Changelog

Formato basado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto segue [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

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
