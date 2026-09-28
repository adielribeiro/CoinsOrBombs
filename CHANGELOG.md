# Changelog

Formato basado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto segue [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

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
