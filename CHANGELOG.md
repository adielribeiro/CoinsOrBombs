# Changelog

Formato basado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto segue [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

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
