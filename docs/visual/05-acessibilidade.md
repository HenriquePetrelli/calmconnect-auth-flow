# Fase 5 — Acessibilidade

Feito em 2026-09-19.

## 1. Contraste AA — antes/depois

Corrigido nos tokens (`src/index.css`), não componente a componente, como pedia o plano. Só os pares que reprovavam foram tocados.

| Par | Uso | Antes (light/dark) | Depois (light/dark) |
|---|---|---|---|
| `--destructive-foreground` / `--destructive` | botões/badges de exclusão, erro | 3,78:1 / 3,30:1 ❌ | 4,87:1 / 4,87:1 ✅ |
| `--success-foreground` / `--success` | badges/toasts de sucesso | 2,30:1 / 1,94:1 ❌❌ | 4,84:1 / 5,10:1 ✅ |
| `--sos-primary` (branco em cima) | botão vermelho de emergência (`variant="sos"`, `ConfirmationModal.tsx`) | 3,78:1 / 3,30:1 ❌ | 4,87:1 / 4,87:1 ✅ |
| `--evolution-primary` (branco em cima) | variante "evolution" do botão/card, não usada em nenhuma tela hoje (achado ao auditar, igual `--professional-primary` na Fase 3) | 2,30:1-ish ❌ | 4,84:1 ✅ |

Os três primeiros são usos reais e visíveis — `--success`/`--destructive`/`--sos-primary` (vermelho) reprovavam de forma severa (o de sucesso quase não passava nem para texto grande). Isso é uma correção de acessibilidade ativa, não cosmética: o botão vermelho de "Ligar agora"/confirmar emergência (`ConfirmationModal.tsx`) tinha texto branco com contraste insuficiente exatamente na tela mais crítica do app.

Todos os outros pares já mapeados na Fase 0 (`--primary`, `--secondary`, `--sos-secondary`, `--warning`, `--muted-foreground`, `--accent`) já foram corrigidos ou confirmados dentro das Fases 1-3 e seguem passando AA — recalculados nesta fase como conferência, sem regressão.

## 2. Área de toque mínima 48×48px

- `components/ui/button.tsx`: `size="icon"` (default) era `h-10 w-10` (40px) — virou `h-12 w-12` (48px, igual ao já existente `icon-lg`). Afeta os ~15 usos que não sobrescrevem altura/largura via `className`.
- `PageHeader.tsx` (compartilhado por 19 páginas): botão de voltar era `h-10 w-10` — virou `h-12 w-12`, com os contêineres ao redor ajustados de `w-10` para `w-12` para não cortar.
- `.sos-button` (botão real de SOS) já era 64×64 — folga confortável acima do mínimo, sem mudança.
- `icon-sm` (`h-8 w-8` = 32px) não foi alterado — é usado propositalmente em um único lugar denso (`SoundPlayer.tsx`), crescer para 48px ali quebraria o layout do player; fica como exceção deliberada, não um esquecimento.

**Achado registrado, não corrigido nesta fase:** várias linhas de ícones em cabeçalhos (`PsychologistDashboard.tsx` e `AdminDashboard.tsx`, 3-4 botões cada, `h-9 w-9` = 36px, lado a lado num cabeçalho já apertado) ficam abaixo de 48px. Diferente do botão de voltar do `PageHeader.tsx` (um ícone isolado, fácil de crescer com segurança), essas são fileiras de 3-4 ícones apertados numa faixa que também precisa caber o nome/saudação e o wordmark centralizado — sem conseguir renderizar essas telas (ficam atrás de login, sem credenciais de teste nesta sessão, mesma limitação da Fase 4), aumentar cada ícone em 33% às cegas tem risco real de quebrar o layout em telas estreitas. Fica como pendência explícita — ver §5.

## 3. Tamanhos de fonte em `rem`

Conferido: `tailwind.config.ts` já define toda a escala tipográfica (`xs` a `6xl`) em `rem`, não em `px` — não precisou de mudança.

## 4. `aria-label`

- Botão de SOS (`BottomNavigation.tsx`): `"Botão SOS - Emergência"` → `"Pedir ajuda emergencial agora"`, o texto que o próprio plano sugeria. Nenhum teste dependia do texto anterior (conferido antes de trocar).
- Auditados todos os botões só-com-ícone (`size="icon"` sem texto visível) em busca de `aria-label` ausente. 6 encontrados e corrigidos:
  - `ConsultationVideoCall.tsx` (não é o `EmergencyVideoCall.tsx` protegido — é a chamada de consulta agendada, arquivo separado): mutar/desmutar, encerrar chamada, câmera on/off, configurações — os 4 controles principais de uma chamada de vídeo real não tinham nenhum rótulo.
  - `JournalEntryCard.tsx`: editar e excluir registro do diário.
  - `ListaConversas.tsx`: excluir conversa.
  - `PatientsPanel.tsx`: menu "mais opções", página anterior/próxima da paginação.

## 5. Foco visível

Já existia e já era abrangente (achado ao conferir, não desta fase): `src/index.css` tem um bloco global de `:focus-visible` cobrindo `button`, `a`, `[role="button"]`, `[role="link"]`, `[role="tab"]`, `[role="menuitem"]`, `[role="option"]` e qualquer `[tabindex]` não-negativo, com anel de 2 camadas (fundo + `--ring`) e um tratamento mais suave específico para inputs/textarea/select. Nenhuma mudança necessária.

## 6. `prefers-reduced-motion`

Não existia nenhum tratamento antes desta fase. Adicionado um bloco global em `src/index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Cobre de uma vez o pulsar do botão de SOS (`animate-pulse-gentle`, usado no `variant="sos"` do botão), a respiração guiada e toda transição do app — em vez de zerar/remover animações (o que poderia impedir algum componente que espere por `animationend`/`transitionend`, embora nenhum dependa disso hoje), encurta para quase-instantâneo, abordagem padrão e mais segura. Confirmado via Playwright que `matchMedia('(prefers-reduced-motion: reduce)')` é lido corretamente pelo navegador nesse contexto.

## 7. Nunca só cor para transmitir estado

- `ConnectionQuality.tsx` (usado dentro de `EmergencyVideoCall.tsx`) — **já estava correto**: cada estado (boa/regular/fraca/verificando/desconectado) tem um ícone diferente (`Wifi`/`AlertTriangle`/`WifiOff`) além da cor, não só cor. Nenhuma mudança.
- `OnlineStatusToggle.tsx` (indicador online/offline do psicólogo, versão compacta no cabeçalho) — o texto "Online"/"Offline" já existe mas fica oculto em telas estreitas (`hidden sm:inline`), sobrando só um pontinho verde vs. branco. Corrigido: agora o estado offline é um círculo **vazado** (contornado, sem preenchimento) contra o online **preenchido** — diferença de forma, não só de cor, então continua perceptível mesmo só com o pontinho visível no mobile.
- Badges de status (consultas, aprovação de psicólogo, etc.) já usam texto (“Pendente”, “Aceita”, “Faltou”…) junto da cor — conferido, sem mudança necessária.

## 8. Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes, não relacionadas)
- `npm run build`: sucesso
- `bash scripts/check-colors.sh`: continua passando (regra do laranja, inalterada nesta fase)
- Verificado via Playwright: `prefers-reduced-motion: reduce` é lido corretamente pelo browser

## 9. Arquivos alterados

`src/index.css`, `src/components/ui/button.tsx`, `src/components/PageHeader.tsx`, `src/components/BottomNavigation.tsx`, `src/components/appointments/ConsultationVideoCall.tsx`, `src/components/journal/JournalEntryCard.tsx`, `src/components/chat/ListaConversas.tsx`, `src/components/admin/PatientsPanel.tsx`, `src/components/psychologist/OnlineStatusToggle.tsx`.
