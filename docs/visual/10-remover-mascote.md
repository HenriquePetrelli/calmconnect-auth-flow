# Fase 10 — Remover o mascote

Feito em 2026-09-19. Decisão da Fase 1: remover o mascote do app inteiro, não manter nem trocar de espécie. `SOS.tsx` já tinha sido corrigido na Fase 6c (era o achado que motivou a pergunta); as outras 6 telas foram tratadas nesta fase.

## Tela a tela

| Tela | Pose | Tratamento |
|---|---|---|
| `CompletionScreen.tsx` (respiração) | celebrate | Substituído por `CheckCircle` num círculo `bg-success/15` — mesmo padrão já usado em `SoundFeedback.tsx` para telas de "sessão concluída", agora consistente entre as duas. |
| `AchievementModal.tsx` (desbloqueio de conquista) | celebrate | O mascote era a figura central com o ícone da conquista específica como selo pequeno no canto. Virou o ícone da conquista **grande**, sozinho, num círculo `bg-primary/15` — mais direto, sem perder a personalização por conquista. |
| `Achievements.tsx` (estado vazio, "nenhuma conquista ainda") | thinking | Substituído por `Trophy` num círculo neutro (`bg-muted`) — remete ao conteúdo da própria tela. |
| `Notifications.tsx` (estado vazio, "nenhuma notificação") | sleep | Substituído por `BellOff` no mesmo padrão de círculo neutro. |
| `GuidedBreathing.tsx` (cabeçalho da lista de técnicas) | hug | Era pequeno (56px), decorativo, ao lado do título. Substituído por `Waves` (ícone já usado no app para o tema de respiração) num círculo `bg-primary/10`. |
| `Index.tsx` (tela de login) | wave | **Sem substituto — a wordmark ficou visível no lugar.** Esta era a única tela em que o wordmark "soliv" já existia no código só para leitor de tela (`sr-only`), nunca aparecia visualmente. Em vez de só remover e deixar o cabeçalho mais vazio, o wordmark passou a aparecer de verdade (`Wordmark` em SVG, Fase 7) — reforça a marca no primeiro contato com o app, no lugar que o mascote ocupava. Validado com screenshot real (claro/escuro). |

Em nenhum caso o layout precisou de ajuste estrutural além de trocar o elemento visual — o espaço que o mascote ocupava serviu bem para os ícones/wordmark que entraram no lugar.

## Remoção do diretório

`src/components/mascot/` removido por completo (`Mascot.tsx`, `palette.ts`, `index.ts`, `species/sloth/` com as 6 poses). Confirmado por busca ampla (`grep -rn "mascot" src -i`, incluindo nomes de arquivo individuais tipo `SlothCelebrate`) que não sobrou nenhuma referência em `src/`.

## Testes

Nenhum dos 9 arquivos de teste que comparam texto exato (`docs/visual/00-inventario.md` §11) referencia o mascote — conferido antes e depois da remoção (`grep -rln "mascot" src/test`, vazio nos dois momentos).

## Resultado direto (como o plano previa)

A tela de espera do SOS já não corre risco de "algo que distrai" — não existe mais mascote para aparecer em lugar nenhum do app. Não foi preciso nenhuma política de rotas proibidas.

## Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes)
- `npm run build`: sucesso
- `Index.tsx` (tela pública, alcançável sem login) validado com screenshot real, claro e escuro

## Arquivos alterados

`src/components/breathing/CompletionScreen.tsx`, `src/components/achievements/AchievementModal.tsx`, `src/pages/Achievements.tsx`, `src/pages/Notifications.tsx`, `src/pages/GuidedBreathing.tsx`, `src/pages/Index.tsx`, e a remoção completa de `src/components/mascot/` (10 arquivos).
