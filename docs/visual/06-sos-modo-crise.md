# Fase 6 — SOS e modo crise

Feito em 2026-09-19.

## 6a. Botão de SOS — verificação (sem correção de posição/tamanho)

**Confirmado, como a Fase 0 já apontava:** um único componente (`BottomNavigation.tsx`) renderiza o botão, usado por dois wrappers — `MainLayout.tsx` (rotas `/home`, `/chat`, `/profile`, `/appointments`, `/notifications`, `/statistics`) e `PatientBottomNav.tsx` (rotas `/journal`, `/support-groups`, `/support-group/:id`, `/breathing`, `/sounds`). Mesmo tamanho, ícone e cor em todo lugar onde aparece — nenhuma correção necessária.

**Confirmado: nunca aparece durante uma chamada.** `ConsultationCall.tsx`, `EmergencyCall.tsx`, `EmergencyVideoCall.tsx` e `ConsultationVideoCall.tsx` não usam nenhum dos dois wrappers.

**Achado, levado ao Henrique antes de agir (mudava o que é alcançável a partir de cada tela, não só estilo):** 10 telas do paciente não tinham o botão — sub-telas de sons (categoria, player, feedback), conquistas, histórico de atividade, configurações da conta, suporte, e as 3 telas de assinatura. Decisão: adicionar nas telas de conteúdo, manter de fora as transacionais. Aplicado:

| Tela | Resultado |
|---|---|
| `SoundCategory.tsx` | ✅ adicionado |
| `SoundFeedback.tsx` | ✅ adicionado |
| `Achievements.tsx` | ✅ adicionado |
| `ActivityHistory.tsx` | ✅ adicionado |
| `Support.tsx` | ✅ adicionado |
| `SoundPlayer.tsx` | ⚠️ **não adicionado** — ver nota abaixo |
| `AccountSettings.tsx` | fora do escopo aprovado (tela de configuração rápida, mesmo raciocínio das de assinatura) |
| `SubscriptionPlans/Success/Cancel.tsx` | fora do escopo aprovado, por decisão |

**Nota sobre `SoundPlayer.tsx`:** é um player em tela cheia (`h-screen overflow-hidden`, sem scroll, com um controle de "maximizar"), na mesma classe de layout apertado do `EmergencyVideoCall.tsx` — adicionar a barra fixa de navegação sem poder ver a tela renderizada (sem credenciais de teste) arrisca cobrir os controles reais do player, que já disputam o mesmo espaço vertical calculado por `flex-1 min-h-0`/`shrink-0`. Diferente das outras 5 telas (listagens/cards simples, onde só bastou reservar `pb-24`), essa precisa de olho em tela real antes de mexer. Fica pendente — ver §4.

## 6b. Proteção contra toque acidental — 🛑 aprovado por você antes de commitar

Implementado em `src/components/sos/ConfirmationModal.tsx`: era um `AlertDialog` centralizado pequeno, virou uma confirmação em **tela cheia** de verdade (fundo `bg-calm`, ícone e título grandes, botão "Sim, preciso de ajuda" em vermelho ocupando a largura toda, "Não" abaixo). Único arquivo tocado — os dois lugares que abrem essa confirmação (`MainLayout.tsx` e `PatientBottomNav.tsx`) já chamavam esse componente, nenhum dos dois precisou de mudança. Validado com screenshot real (claro e escuro, via uma rota temporária de preview, removida antes do commit) antes de pedir aprovação.

## 6c. Modo crise visual

- **`SOS.tsx` (tela de espera):** fundo trocado de `bg-background` para `bg-calm` (primeiro uso real do token criado na Fase 2). Mascote removido — a tela já tinha `<Mascot pose="hug">`, um achado da Fase 0 que motivou a decisão da Fase 1 de remover o mascote do app inteiro; antecipado aqui só para esta tela específica (o resto das 6 telas com mascote continua para a Fase 10, como planejado). CVV 188 e SAMU 192 agora **sempre visíveis e tocáveis** na tela de espera — antes só apareciam quando `availableProfessionals === 0`; o texto do plano não condicionava isso a nenhum cenário, então passou a ficar sempre presente (compacto, sem competir com o card principal de status).
- **`EmergencyVideoCall.tsx` (protegido, regra 2 da seção 3):** só trocou `bg-background` por `bg-calm` nas 14 ocorrências do arquivo (containers de loading, erro, vídeo, overlays) — nenhuma outra mudança. Diff completo abaixo.
- Já estava correto, sem mudança: sem navegação inferior no fluxo de emergência (`/sos` e `/emergency-call*` não usam nenhum dos wrappers de navegação), CVV/SAMU já usavam `tel:`, um passo principal por tela.
- Texto final de "mensagem de espera" fica para a Fase 8, como o plano já previa.

### Diff de `EmergencyVideoCall.tsx`

```diff
- bg-background          (14 ocorrências: contêineres de loading/erro/vídeo/overlays)
+ bg-calm
```
Só o token de cor mudou; nenhuma classe de layout, estrutura ou texto foi tocada. Diff completo já aplicado ao arquivo, disponível via `git diff` no commit desta fase.

## Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes)
- `npm run build`: sucesso
- Tela cheia de confirmação (6b) verificada com screenshot real (claro/escuro) antes do commit

## Arquivos alterados

`src/components/sos/ConfirmationModal.tsx`, `src/components/EmergencyVideoCall.tsx`, `src/pages/SOS.tsx`, `src/pages/SoundCategory.tsx`, `src/pages/SoundFeedback.tsx`, `src/pages/Achievements.tsx`, `src/pages/ActivityHistory.tsx`, `src/pages/Support.tsx`.

## Pendente

`SoundPlayer.tsx` sem botão de SOS — precisa de verificação visual antes de adicionar (ver nota em 6a).
