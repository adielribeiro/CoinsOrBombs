# Contribuindo

Obrigado por querer ajudar no CoinsOrBombs. Este é um protótipo de jogo, então
contribuições de bug, balanceamento e responsividade são tão valiosas quanto
mecânicas novas.

## Como rodar

```bash
git clone https://github.com/adielribeiro/CoinsOrBombs.git
cd CoinsOrBombs
npm install
npm run dev
```

Requer **Node 20.19+** (ou 22+). O `npm run dev` sobe em `http://localhost:5173`.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente na porta 3000 |
| `npm test` | Testes de progressão e geração de mapa (`node:test`, sem dependências) |
| `npm run pages` | Build + copia para `docs/game` (o que o Pages serve) |

## Testes

Não existe framework: os testes usam o `node:test` nativo e ficam em `test/`.
Eles cobrem os invariantes que quebram de formas silenciosas — hoje, o mais
importante é **toda cave gerada tem a saída quebrável a partir da entrada**.
Esse invariante já falhou: o gerador protegia os quatro lados da saída para
mantê-la escondida, o que em ~93% dos mapas deixava a saída cercada por rocha
que não era fronteira, produzindo runs sem solução.

Ao mexer em `mapGenerator.js`, rode `npm test`.

## Estrutura

```
src/
  App.jsx                 interface React: HUD, lobby, loja, modais
  game/
    createGame.js         instancia o Phaser e o resize responsivo
    config.js             métricas do tile isométrico
    progression.js        biomas, relíquias, objetivos (dados puros)
    scenes/
      BootScene.js        carrega as texturas
      CaveScene.js        render isométrico, input e regras da run
    systems/
      mapGenerator.js     geração procedural da cave
      helpers.js          vizinhos, alcançabilidade, rota segura
docs/                     landing page do GitHub Pages
scripts/prepare-pages.mjs build -> docs/game
```

Duas regras que valem para qualquer mudança:

1. **`progression.js` e `mapGenerator.js` são dados e lógica pura.** Não
   importem React nem Phaser neles — é o que mantém o balanceamento testável.
2. **O estado da run tem um dono só.** O Phaser manda estado para o React pelo
   evento `cob-sync-ui`; o React manda comandos para o Phaser por
   `cob-enter-cave`, `cob-use-utility`, `cob-buy-utility` e afins. Não leia nem
   escreva `metaState` de fora da `CaveScene`.

## Antes de abrir um PR

```bash
npm test && npm run build
```

O CI roda os testes, o build, o `prepare-pages` e o
`npm audit --audit-level=high`. Todos precisam passar.

## Commits

Mensagens no imperativo e no escopo do que mudou:

```
fix: ordena o mapa por Y antes de desenhar
feat: adiciona grade isométrica nas configurações
docs: corrige a descrição das bombas no README
```

## Bugs

Use o template **Bug report**. Os campos de cave, dispositivo e resolução
importam muito: a maior parte dos problemas deste projeto até agora foi de
layout em uma combinação específica de viewport.

## Balanceamento

Números de drop, vida e melhoria vivem em `progression.js` e `mapGenerator.js`.
Se você mexer neles, diga no PR o antes e o depois — o jogo é sobre risco, e
mexer no risco sem medir muda a identidade dele.
