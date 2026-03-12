# CoinsOrBombs Alpha

Protótipo inicial do jogo isométrico **CoinsOrBombs** usando **React + Phaser + Vite**.

## O que já tem
- mapa procedural simples por cave;
- visual isométrico básico;
- jogador começa na esquerda e precisa chegar na saída à direita;
- rochas quebráveis com conteúdo oculto;
- moedas, bombas e tiles vazios;
- duas bombas na run fazem o jogador voltar para a Cave 01;
- melhorias simples de picareta, bolsa e resistência;
- HUD lateral com status e log.

## Controles
- **Mouse**: clique em rochas adjacentes para quebrar; clique em chão adjacente para andar.
- **Teclado**: setas ou **WASD** para mover; se houver rocha na direção, você tenta quebrá-la.

## Rodando localmente
```bash
npm install
npm run dev
```

## Gerar build
```bash
npm run build
npm run preview
```

## Assets incluídos
- `public/assets/bomb.png`
- `public/assets/rock.png`
- `public/assets/floor.png`
- `public/assets/pickaxe_lvl1.png`

## Próximos passos sugeridos
- animação de quebra de rocha;
- tela de game over / hub entre caves;
- sistema de save local;
- novos loots, inimigos e biomas.
