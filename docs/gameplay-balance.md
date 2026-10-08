# Exploração, dificuldade e economia — 08/10/2026

## Diagnóstico e decisões

O gerador abria um corredor até a vizinhança da saída em todas as caves.
Esse teste confundia uma saída acessível imediatamente com uma saída alcançável
por escavação. O sistema de fronteira já permite quebrar uma pedra e avançar.
Agora o corredor aberto é apenas tutorial (caves 1–2); a partir da terceira,
a garantia é uma rota escavável sem bombas, preservando Caminho Seguro.

A vida aumenta por melhorias, mas toda bomba causava um único ponto de dano.
As variantes sinalizadas acrescentam escolha de rota e consequências limitadas.
A mochila compartilhada gera a escolha entre cura, informação e navegação,
sem aumentar preços nem apagar itens adquiridos.

Esta primeira etapa não remove relíquias, melhorias ou utilitários aleatoriamente.
O jogo não tinha durabilidade de picareta: desgaste temporário significa dois
golpes extras nas próximas três rochas iniciadas manualmente, nunca perda de nível.
Não há redução de visão, temporizadores de punição, inimigos ou recursos gráficos novos.

## Curva nas 60 caves

| Caves | Introdução | Frequência de variante por bomba |
| --- | --- | --- |
| 1–2 | Aprendizado com corredor aberto | 0% |
| 3 | Exploração com rota segura escavável | 0% |
| 4–10 | Saqueadora; veio solar opcional | 15% → 19,8% |
| 11–20 | Desgaste; gelo medicinal | 20,6% → 27,8% |
| 21–30 | Reforçada de 2 danos; veio quente | 28,6% → 35,8% |
| 31–40 | Combinação das três; selo pago de detecção | 36,6% → 43,8% |
| 41–50 | Bolsa de vento; densidade menor já existente preservada | 44,6% → 51,8% |
| 51–60 | Reforçada de 3 danos; prisma | 52,6% → 55% |

A frequência é uma fração das bombas existentes, não de todas as rochas.
Não foram aumentadas a densidade de bombas, a resistência base ou as recompensas
comuns. Dentro de cada faixa, as variantes disponíveis têm chances iguais.

## Regras de justiça

Bombas especiais mostram a marca antes da escavação: `!$`, `!⛏`, `!2` ou `!3`.
O primeiro toque explica o efeito e não causa dano. Bombas comuns continuam ocultas.
Revelar Bombas prioriza o que ainda está desconhecido: especiais sinalizadas não
consomem a revelação. Quebra automática nunca escolhe obstáculos nem bombas especiais.

- Saqueadora: 1 dano, perde 10% das moedas arredondado para cima, limitado a 12.
- Desgaste: 1 dano e dois golpes extras nas próximas três rochas manuais.
  O contador não acumula acima de três e reinicia ao entrar em outra cave.
- Reforçada: 2 danos; 3 na Câmara de Cristal. É evitável pela rota segura.

O texto permanece por mais tempo conforme seu tamanho, até nove segundos.
Marcadores usam texto e cor e são desenhados depois das rochas para não ficar ocultos.

## Obstáculos opcionais dos biomas

No máximo um por cave, a partir da 4, se houver uma rocha vazia fora da rota segura.
Nunca substitui saída, moeda, bomba ou relíquia. Nenhuma dessas recompensas adiciona
relíquias ou altera o registro que impede coletá-las repetidamente na mesma cave.

| Bioma | Obstáculo | Custo | Benefício |
| --- | --- | --- | --- |
| Solar | Veio solar | +2 golpes | 3 moedas |
| Gelo | Gelo medicinal | +2 golpes | Recupera 1 vida, até o máximo |
| Rubro | Veio quente | +1 golpe e 1 vida | 5 moedas |
| Ruínas | Selo | +1 golpe e 5 moedas | Revela até 2 bombas desconhecidas |
| Vento | Bolsa de vento | +2 golpes | Revela até 1 bomba desconhecida |
| Cristal | Prisma | +3 golpes | Revela até 2 bombas desconhecidas |

Vida e moedas são debitadas somente na conclusão. Sem recurso suficiente,
a escavação não avança; a última vida nunca pode ser gasta. Detectores não podem
ser escavados quando não restam bombas desconhecidas. O jogador pode ignorar todos.
Exemplo: nas Ruínas, gastar cinco moedas no selo pode poupar uma poção de detecção;
no bioma Rubro, trocar vida por moedas só compensa com margem para sobreviver.

## Economia e compatibilidade

Oito espaços compartilhados entre cura, detecção e Caminho Seguro. Compras e drops
respeitam o mesmo limite; usar ou vender libera espaço. Inventários antigos acima
do limite são carregados integralmente e seguem utilizáveis, mas não recebem novos
itens enquanto estiverem cheios. Nenhuma migração ou renomeação de campo de save.

Preços, chances das melhorias, moedas comuns, saldo de relíquias, distribuição de
1–3 relíquias e regras de morte/progressão permanecem. As descrições das cartas de
moedas e de quebra exibiam 1% por nível, mas aplicavam 10%; só o texto foi corrigido.

## Validação e próximos ajustes

Testes existentes de saves, controles, utilitários e geração, mais testes novos de
rotas escavadas em sequência, custos opcionais, variantes e inventário legado.
Testes da cena executam seus métodos reais com a superfície gráfica simulada em Node.
Build do Pages e auditoria de dependências são executados antes de publicar.

A prévia local no navegador não ficou disponível neste ambiente. A validação visual
completa em dispositivos reais e a calibração de diversão exigem playtests.
A prioridade é observar: rochas quebradas até a saída, consumo de cada utilitário,
mortes por bioma, saldo de moedas e frequência de escolha dos obstáculos. Oito vagas,
os custos opcionais e a frequência de variantes são valores iniciais ajustáveis.
Os testes garantem invariantes; não provam que a campanha inteira está divertida.
