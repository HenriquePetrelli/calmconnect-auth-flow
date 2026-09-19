# Fase 3 — Regra do laranja + papel definitivo do `--secondary`

Feito em 2026-09-19.

## 1. Laranja: auditoria completa e reclassificação

Auditados todos os usos de laranja fora do SOS (Tailwind `orange-*`, hex `#F97316`/`#EA580C`/família, e RGB literal equivalente em canvas) — não só as classes de paleta, também acoplamentos que o `check-colors.sh` da Fase 2 não pegava (variáveis CSS customizadas usadas fora do SOS). Nenhum caso ficou ambíguo o bastante para precisar de 🛑; todos se encaixaram claramente em "não é SOS" (com uma cor de substituição óbvia) ou já eram âmbar (mantido — ver §3).

| Arquivo | Uso | Antes | Depois | Motivo |
|---|---|---|---|---|
| `ConsultationHistory.tsx` | badge status "Faltou" | `orange-*` | `slate-*` | status administrativo, não-SOS; `amber` já estava em uso para "Pendente" no mesmo componente |
| `journalMoods.tsx`, `MoodSelectionModal.tsx`, `MoodAccordion.tsx` | humor "Mal" (2/5, escala verde→azul→amarelo→?→vermelho) | `orange-*` | `rose-*` | as 3 têm a mesma escala de humor duplicada; laranja era o degrau entre amarelo e vermelho, `rose` mantém a leitura de gradiente sem usar a cor do SOS |
| `PatternSelector.tsx`, `GuidedBreathing.tsx` (técnica "Tática", categoria "Foco") | cor de categoria | `#F97316` | `#D97706` (âmbar) | uma entre 7-9 cores de categoria decorativas; âmbar já é a família usada em outros lugares do app para "atenção/intensidade" |
| `SoundsLibrary.tsx` (categorias "Meditar" e "Terapêuticos") | ícone de categoria | `#F97316` | `#D97706` | mesmo raciocínio |
| `GuidedBreathing.tsx`, `SoundsLibrary.tsx` (banner "Recomendado"/"Mais ouvido") | fundo + texto do card de destaque | `#F97316` | `bg-primary`/`text-primary-foreground` | era literalmente o antigo `--primary`; agora usa o token, não mais cor crua |
| `SoundAnimation.tsx` | gradientes decorativos do visualizador de áudio (paleta "identidade") | `rgb(249,115,22)` + soft | `rgb(217,119,6)` + soft (âmbar) | efeito puramente decorativo, sem relação com SOS; eram 8 ocorrências literais da mesma cor |
| `--professional-primary`, `--gradient-professional` (`index.css`) | variante "professional" do `ModernFeatureCard`, **não usada em nenhuma tela hoje** (achado ao auditar) | `25 95% 53%` | `262 83% 58%` (roxo, = `--primary`) | dead code, mas a definição do token continuava sendo laranja cru; corrigido para não virar armadilha se alguém reativar a variante |

Achado à parte, removido nesta fase por estar diretamente no meio da auditoria: `--emma-header`, `--emma-primary` e as demais variáveis/classes `emma-*` (`index.css` + `tailwind.config.ts`) eram laranja cru e **零 usos em qualquer `.tsx`** — resíduo do nome do template original (antes de "Soliv"), confirmando o achado da Fase 0 de que o projeto nasceu na Lovable. Removidas por completo (6 variáveis light + 6 dark + 7 classes utilitárias), não só recoloridas.

Depois disso, `bash scripts/check-colors.sh` passa limpo nas seções 2 e 3 (laranja e `-sos` fora da allowlist) — **critério de aceite desta fase**. A seção 1 (cor crua em geral) continua mostrando resultado — são paletas de humor/respiração/som/gráfico que nunca foram laranja, débito técnico pré-existente fora do escopo desta fase; ver §4.

## 2. `--secondary`: papel definitivo aplicado

Antes de mudar o valor, migrados os usos que queriam o **roxo de marca** (não um tom neutro) para `--primary`:

- **Wordmark "soliv"** — `MainLayout.tsx` (×2), `SignupType.tsx`, `SplashScreen.tsx`: `text-secondary` → `text-primary`. (`PsychologistDashboard.tsx` já usava `text-white` no wordmark, não precisou de mudança.)
- **Cabeçalhos "sólidos" com texto branco fixo** — `PsychologistDashboard.tsx` (header + tab trigger ativo), `AdminDashboard.tsx` (header + sheet mobile), `PageHeader.tsx` (componente compartilhado, usado em **19 páginas**: SOS, respiração, sons, perfil, etc.): todos tinham `bg-secondary` + texto **`text-white` hardcoded** (não `text-secondary-foreground`) nos filhos. Achado importante: se o valor de `--secondary` mudasse sem corrigir isso, esse texto branco ficaria ilegível sobre um fundo cinza-claro. Todos migrados para `bg-primary`/`text-primary-foreground` (que já é roxo saturado, mantém o texto branco legível — zero mudança visual hoje, já que `--primary` também é roxo).
- **Título "Login"** (`LoginForm.tsx`) e um link redundante em `NotFound.tsx` (que sobrescrevia sem necessidade o estilo padrão de link, que já é `text-primary` globalmente) — ajustados por consistência.

**Verificado e deixado como estava** (não precisava de mudança): `DesktopSidebar.tsx` (usa `text-secondary-foreground` de forma consistente em todos os filhos, sem branco fixo — já era seguro por construção); badges/cards com fundo suave (`bg-secondary/10`–`/20` + `text-secondary-foreground`, ex. cards de estatística em `PsychologistDashboard.tsx`/`AdminDashboard.tsx`) — o par cor/texto já é consistente e continua legível com o novo tom neutro; componentes shadcn/ui (`button.tsx`, `badge.tsx`, `progress.tsx`, `sheet.tsx`, `input.tsx`) — é literalmente o caso de uso pretendido do token "secondary" (elemento discreto).

Com os usos de marca já migrados, o valor de `--secondary` foi trocado para o tom neutro/cinza-arroxeado decidido durante a Fase 2, com os valores já calculados e validados:

| Token | Light | Dark |
|---|---|---|
| `--secondary` | `258 10% 92%` | `256 14% 32%` |
| `--secondary-foreground` | `258 20% 25%` (contraste 9,82:1) | `255 20% 92%` (contraste 7,27:1) |
| `--secondary-hover` | `258 10% 87%` (8,64:1) | `256 14% 38%` |
| `--secondary-active` | `258 10% 82%` | `256 14% 44%` |
| `--secondary-glow` | `258 10% 95%` | `256 14% 50%` |

Consequência visual esperada, já era o objetivo desta decisão: a barra de navegação inferior (`.tabs`, via `BottomNavigation.tsx`) e botões `variant="secondary"` deixam de ser roxo sólido e passam a um tom neutro/discreto — a mudança mais perceptível da fase, feita de propósito (ver a pergunta feita ao Henrique durante a Fase 2).

## 3. Âmbar não é laranja

`amber-*` (Tailwind) ficou de fora da regra de exclusividade do laranja — é a família de cor já usada para `--warning` e para estados de "atenção" em vários componentes (`ConsultationHistory.tsx` "Pendente", `CallDiagnosticsPanel.tsx`, `AppointmentForm.tsx`, `GoalCard.tsx`, `Statistics.tsx`). `scripts/check-colors.sh` foi ajustado para não sinalizar `amber-*` (antes bloqueava as duas juntas). Coerente com o texto da própria Fase 3 do plano: "`warning` deve ser amarelo/âmbar claramente distinguível do laranja do SOS."

## 4. O que fica de fora desta fase (débito técnico pré-existente)

`bash scripts/check-colors.sh` (seção 1, informativa, não bloqueia) ainda aponta ~90 ocorrências de hex/rgb/hsl cru em arquivos como `HomeContent.tsx`, `PracticeScreen.tsx`, `PatternSelector.tsx` (as outras 6 cores de categoria, nenhuma laranja), `SoundAnimation.tsx` (roxo/branco/outras cores do visualizador), `DesktopSidebar.tsx` (`dark:bg-[#2a2438]`), `chart.tsx` (cores de grid do Recharts), `OnlineStatusToggle.tsx`, e o mascote (que será removido inteiro na Fase 10, não vale corrigir cor agora). Nenhuma dessas é laranja — são paletas de humor/categoria/gráfico que não faziam parte do escopo desta fase ("regra do laranja"). Fica registrado como um possível item de limpeza futuro (a Fase 9, Guia de marca, ou uma fase extra), não bloqueia a Fase 3.

`scripts/check-colors.sh` ganhou uma flag `--strict` que também bloqueia a seção 1, pronta para quando (e se) esse débito for endereçado.

## 5. Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes, não relacionadas, em `availableTimeSlots.test.ts`)
- `npm run build`: sucesso
- `bash scripts/check-colors.sh`: **passa** (seções 2 e 3, laranja e `-sos` — critério de aceite desta fase)

## 6. Arquivos alterados

`src/index.css`, `tailwind.config.ts`, `scripts/check-colors.sh`, `src/components/BackgroundWrapper.tsx`, `src/components/LoginForm.tsx`, `src/components/MainLayout.tsx`, `src/components/PageHeader.tsx`, `src/components/SplashScreen.tsx`, `src/components/MoodAccordion.tsx`, `src/components/MoodSelectionModal.tsx`, `src/components/breathing/PatternSelector.tsx`, `src/components/journal/journalMoods.tsx`, `src/components/psychologist/ConsultationHistory.tsx`, `src/components/sounds/SoundAnimation.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/GuidedBreathing.tsx`, `src/pages/NotFound.tsx`, `src/pages/PsychologistDashboard.tsx`, `src/pages/SignupType.tsx`, `src/pages/SoundsLibrary.tsx`.
