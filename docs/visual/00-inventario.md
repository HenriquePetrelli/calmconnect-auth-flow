# Fase 0 — Inventário da identidade visual do Soliv

> Levantamento somente-leitura, feito em 2026-09-19 diretamente no código (branch `claude/push-commit-f7u9z7`). Nenhum arquivo de produto foi alterado nesta fase, só este relatório e `docs/visual/plano.md` (seção 2 e "Correções da Fase 0").

---

## 1. Stack de estilo

- **Bundler:** Vite `^5.4.1` (`vite` no script `dev`).
- **Tailwind:** `tailwindcss ^3.4.11`, config em `tailwind.config.ts`, `darkMode: ["class"]` já ativado.
- **shadcn/ui:** `components.json` presente (`style: "default"`, `baseColor: "slate"`, `cssVariables: true`), componentes em `src/components/ui/`.
- **Tokens HSL:** `src/index.css` já tem blocos `:root` (claro, linhas 17-135) e `.dark` (escuro, linhas 137-248) completos, dentro de `@layer base`. Cabeçalho do arquivo (linha 5-8) já declara a intenção: *"Soliv Design System — Orange + Purple, Light & Dark. Inspired by Stripe (UI) + Google Meet (video)."*
- **Modo escuro / next-themes:** `next-themes ^0.3.0` já instalado e ligado em `App.tsx` (`<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>`). Existe `ThemeToggle.tsx` (switch binário claro/escuro, sem opção "sistema").

## 2. Cores em uso

```
$ grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(" src --include=*.tsx --include=*.ts --include=*.css
```
129 ocorrências fora de `src/index.css` (que concentra os tokens — esperado). Top arquivos com cor literal (hex/rgb/hsl fora do sistema de tokens):

| Arquivo | Ocorrências |
|---|---|
| `src/components/sounds/SoundAnimation.tsx` | 33 |
| `src/pages/GuidedBreathing.tsx` | 17 |
| `src/pages/HomeContent.tsx` | 16 |
| `src/pages/SoundsLibrary.tsx` | 10 |
| `src/components/mascot/palette.ts` | 9 |
| `src/components/breathing/PatternSelector.tsx` | 9 |
| `src/components/breathing/PracticeScreen.tsx` | 6 |
| `src/components/breathing/BreathingTimer.tsx` | 6 |
| `src/components/icons/LifeRingIcon.tsx` | 5 |
| `src/components/progress/MoodTrendChart.tsx` | 3 |
| `src/components/mascot/species/sloth/SlothCelebrate.tsx` | 3 |

```
$ grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke)-(orange|amber|red|purple|violet|indigo|fuchsia)-[0-9]{2,3}" src
```
**68 ocorrências** de classe de paleta Tailwind crua (fora do sistema de tokens). Concentradas em: `ConsultationHistory.tsx` (badges de status — orange/indigo/red), `Statistics.tsx` (indigo/amber), `SupportGroupDetail.tsx` (red), `toast.tsx` (red, do próprio shadcn), `MoodAccordion.tsx` / `MoodSelectionModal.tsx` / `journalMoods.tsx` (orange, seletor de humor), `CallDiagnosticsPanel.tsx` (amber).

## 3. Onde o laranja aparece

**Achado que reformula a Fase 3 inteira:** o laranja não é uma cor lateral usada "um pouco fora do SOS" — ele é a **cor `primary` (padrão) de todo o app**, e o roxo é a `secondary`. Em `src/index.css`, linha 30-35:

```css
/* Primary — Orange #F97316 */
--primary: 25 95% 53%;
```

e linha 37-38:

```css
/* Secondary — Purple #7C3AED */
--secondary: 262 83% 58%;
```

O comentário da linha 47-48 é explícito: *"Accent — subtle ORANGE tint hover surface (primary brand). Purple is reserved for explicit secondary elements only."*

Isso significa que o laranja está em: todo botão primário do app (`Button` default do shadcn usa `bg-primary`), o anel de foco (`--ring: 25 95% 53%`), a sombra `--shadow-primary`, a cor de scrollbar (`::-webkit-scrollbar-thumb`), `sidebar-primary`, `emma-primary`, `professional-primary`, `gradient-primary` e `gradient-brand` (que mistura laranja→roxo). Ou seja: **em praticamente toda tela do app.**

Separadamente, já existe um par de tokens dedicado a emergência: `--sos-primary` (vermelho, `0 84% 60%`) e `--sos-secondary` (laranja, mesmo tom do `--primary` global) e `--sos-glow`. O botão SOS de fato usa essa dupla vermelho+laranja (`--gradient-sos: linear-gradient(135deg, hsl(0 84% 60%), hsl(25 95% 53%))`), não só laranja puro.

Classificação de uso (a=SOS, b=não-SOS, c=ambíguo):

| Uso | Classe |
|---|---|
| `--sos-primary`/`--sos-secondary`/`--sos-glow`, `.sos-button` (`BottomNavigation.tsx`, `DesktopSidebar.tsx`) | (a) |
| `--primary` como cor padrão de botão/foco/sombra em **todo o resto do app** (não-SOS) | (b) — mas é o *default* do design system inteiro, não um caso isolado |
| Badges de status em `ConsultationHistory.tsx` (`orange-*` cru) | (c) — precisa ver se "pendente"/"em andamento" deve virar `warning` ou continuar com destaque |
| Seletor de humor (`MoodAccordion`, `MoodSelectionModal`, `journalMoods.tsx`) usa `orange-*` para um dos níveis de humor | (c) — é semântica de humor, não de marca nem de emergência |
| Metade laranja do logo antigo (`soliv-logo.svg`) | (a maior parte descartada — logo será substituído na Fase 7) |
| `--emma-*`, `--professional-primary` (o que são essas features? não confirmado nesta fase) | (c) — nome sugere feature específica, precisa checar uso real antes da Fase 3 |

**Implicação direta para a regra "laranja é exclusivo do SOS" (regra 5, seção 3 do plano):** hoje é tecnicamente inviável sem redesenhar a cor primária de todo o app — não é uma migração pontual, é trocar o `--primary` de laranja para roxo (ou uma terceira cor) em todo o sistema de tokens, e mover **todo** uso atual de `--primary` para outro papel. Isso muda drasticamente o escopo/estimativa da Fase 3. **Marcado para a Fase 1 (pergunta nova) — ver seção "Correções" abaixo.**

## 4. Fontes

- **Interface (`font-sans` do Tailwind):** Poppins — `fontFamily.sans: ['Poppins', 'system-ui', 'sans-serif']` em `tailwind.config.ts`.
- **Wordmark "soliv":** El Messiri, carregada via Google Fonts em `index.html` (`family=Poppins:...&family=El+Messiri:...`), aplicada com `style={{ fontFamily: "'El Messiri', sans-serif" }}` **como texto ao vivo**, não SVG, em pelo menos 5 lugares: `MainLayout.tsx` (2x), `SplashScreen.tsx`, `SignupType.tsx`, `PsychologistDashboard.tsx`.
- Confirma **S12** (fontes diferentes) e derruba **S6** (ver seção 12).

## 5. Logo e ícones

- `src/assets/soliv-logo.svg` — usado por `Logo.tsx`. **Não é um vetor de verdade**: é um `<svg>` que embrulha uma imagem PNG em base64 (`<image href="data:image/png;base64,...">`). Não escala bem, é pesado, e não é editável como vetor.
- `Logo.tsx` mostra só o ícone (`img` com esse SVG); o texto "Soliv" no componente é `sr-only` (não aparece visualmente ali — quem quer o wordmark visível usa o `style={{fontFamily: 'El Messiri'}}` direto, como no item 4).
- `public/favicon.svg` existe (não inspecionado a fundo nesta fase — provavelmente também o logo antigo).
- **Não existe `public/manifest.json`** — não há PWA manifest no projeto hoje.
- **Não existem pastas `android/` nem `ios/`** — `capacitor.config.ts` existe (config), mas os projetos nativos não foram gerados/versionados ainda. Confirma **S7**.
- Nenhum `apple-touch-icon` ou `og:image` customizado localizado em `index.html` nesta varredura rápida — a checar com mais calma na Fase 7.

## 6. Componentes do SOS

Arquivos que renderizam o botão de emergência ou fazem parte do fluxo:

| Arquivo | Papel |
|---|---|
| `src/components/BottomNavigation.tsx` | Renderiza `.sos-button` (ícone `LifeRingIcon`) — usado por `MainLayout.tsx` e `PatientBottomNav.tsx`, que por sua vez é usado em `PrivateJournal.tsx`, `SupportGroups.tsx`, `SupportGroupDetail.tsx`, `GuidedBreathing.tsx`, `SoundsLibrary.tsx`. Posição/tamanho vêm de um único componente compartilhado → **consistente por construção** (confirma S11). |
| `src/components/DesktopSidebar.tsx` | Versão desktop do botão SOS. |
| `src/components/icons/LifeRingIcon.tsx` | Ícone da boia salva-vidas (SVG custom). |
| `src/pages/SOS.tsx` | Tela de "Solicitar ajuda" (gatilho + espera). **Usa `<Mascot pose="hug">`** (ver achado crítico abaixo). |
| `src/pages/EmergencyCall.tsx` | Página das 4 rotas de emergência (ver mapa de rotas). |
| `src/components/EmergencyVideoCall.tsx` | A chamada em si — zona protegida pela regra 2. |
| `src/hooks/useEmergencySOS.ts`, `useEmergencySession.ts`, `usePsychologistEmergency.ts` | Lógica (fora do escopo visual). |

**Achado crítico:** `src/pages/SOS.tsx` linha 287 — `{!expired && <Mascot pose="hug" className="w-24 h-24" />}` — o mascote (preguiça, já implementado, ver seção 10 abaixo) **aparece na tela de espera do fluxo de emergência**, exatamente o tipo de distração que a Fase 6c e a regra 4 da Fase 10 dizem que não deveria aparecer ali. Isso precisa entrar na lista de "telas onde o mascote é proibido" já na Fase 6/10.

## 7. Modo escuro

- **Existe e está ligado**, não é "ausente ou incompleto" como a suposição original dizia. `next-themes` configurado, `ThemeToggle.tsx` funcional, blocos `:root`/`.dark` completos e paralelos em `src/index.css` (mesma cobertura de tokens nos dois).
- **Mas:** `defaultTheme="light"` e `enableSystem={false}` — o app **não segue o tema do sistema operacional**, sempre abre no claro a menos que o usuário troque manualmente. O padrão desejado pelo plano ("seguir o sistema") não está implementado.
- O toggle atual é **binário** (claro/escuro), não os 3 estados (claro/escuro/sistema) que a Fase 4 pede.
- Só **10 de 232** arquivos `.tsx` usam a variante `dark:` do Tailwind diretamente — a grande maioria do app depende só dos tokens semânticos (que já trocam sozinhos via `.dark`), o que é bom sinal de cobertura, mas **não foi verificado visualmente** nesta fase (é leitura de código, não renderização).
- Fundo escuro já não é preto puro: `--background: 258 22% 18%` (roxo-escuro), alinhado com o que a Fase 4 pede.

## 8. Contraste (WCAG)

Calculado a partir dos valores HSL exatos de `src/index.css` (fórmula de luminância relativa padrão, sem aproximação visual):

| Par | Razão | AA texto normal (4,5:1) | AA texto grande/ícone (3:1) |
|---|---|---|---|
| Claro — `secondary` (roxo) sobre `background` | 5,41:1 | ✅ | ✅ |
| Claro — `foreground` sobre `background` | 17,08:1 | ✅ | ✅ |
| **Claro — `primary-foreground` (branco) sobre `primary` (laranja)** | **2,78:1** | ❌ | ❌ |
| Claro — `secondary-foreground` (branco) sobre `secondary` (roxo) | 5,67:1 | ✅ | ✅ |
| Claro — `muted-foreground` sobre `background` | 4,63:1 | ✅ | ✅ |
| Claro — `muted-foreground` sobre `card` | 4,85:1 | ✅ | ✅ |
| Claro — `accent-foreground` sobre `accent` (hover laranja claro) | 4,50:1 | ✅ (no limite) | ✅ |
| Escuro — `foreground` sobre `background` | 14,95:1 | ✅ | ✅ |
| Escuro — `primary` sobre `background` | 7,02:1 | ✅ | ✅ |
| Escuro — `primary-foreground` sobre `primary` | 8,77:1 | ✅ | ✅ |
| Escuro — `secondary-foreground` sobre `secondary` | 6,26:1 | ✅ | ✅ |
| SOS — `sos-primary` (vermelho) sobre fundo claro | 3,61:1 | ❌ | ✅ |
| SOS — branco sobre `sos-primary` (vermelho) | 3,78:1 | ❌ | ✅ |
| **SOS — branco sobre `sos-secondary` (laranja)** | **2,78:1** | ❌ | ❌ |

**Achado crítico #1 do inventário inteiro:** texto branco sobre o laranja primário (`primary-foreground` sobre `primary`) reprova WCAG AA mesmo para texto grande — 2,78:1 contra o mínimo de 3:1. Como `primary` é a cor padrão de botão do app inteiro (shadcn `Button` variant `default`), **isso afeta o botão mais comum de toda a interface**, hoje, em produção. O mesmo problema se repete em `sos-secondary` (mesmo tom de laranja). Correção pertence à Fase 5 (ou pode ser adiantada — ver recomendação na seção "resumo").

## 9. Textos com culpa ou pressão

```
grep -rniE "perdeu|quebrou a sequência|não esqueça|você não conseguiu|falhou em|streak" src
```
**Nenhum texto de culpa encontrado.** As únicas ocorrências de "streak" são nome de campo/variável (`streak_days`) e o texto exibido é neutro: `"{statistics?.streak_days || 0} dias consecutivos"` (`Statistics.tsx`). `callBanner.ts` tem *"{peer} perdeu a conexão..."*, que é sobre queda de rede, não sobre o usuário — não é linguagem de culpa. Confirma **S9 como falsa**: a Fase 8 não vai encontrar um problema de tom de voz "grave" pré-existente nessa frente específica — ainda vale revisar o tom geral, mas não há incêndio para apagar aqui.

## 10. Mapa de telas e rotas de emergência

42 rotas em `src/App.tsx`. Fluxo de emergência confirmado (resolve **S8**):

```
/sos                                   — gatilho + tela de espera (SOS.tsx)
/emergency-call                        — EmergencyCall.tsx
/emergency-call/request/:requestId     — idem, paciente
/emergency-call/:sessionId             — idem, paciente ou psicólogo
/emergency/call/:requestId             — rota "legacy", só psicólogo (nota no próprio código)
```

Consulta agendada (não é emergência, mas também é chamada de vídeo) usa uma rota **separada**: `/consultation-call/:appointmentId` → `ConsultationCall` (não é a mesma página nem o mesmo componente de vídeo que a emergência).

Agrupamento das 42 rotas por área: paciente (home, chat, perfil, consultas, notificações, estatísticas, grupos de apoio, diário, sons, respiração, SOS, config. de conta, suporte, conquistas), psicólogo (dashboard, perfil, disponibilidade, suporte, pagamentos, notificações), admin (dashboard, notificações), emergência (4 rotas acima), consulta (1 rota), auth (`/`, `/signup-type`, `/patient-signup`, `/psychologist-signup`), assinatura (planos, sucesso, cancelamento), catch-all (`*` → NotFound).

## 11. Testes que dependem de texto

9 arquivos usam `getByText`/`toHaveTextContent` (confirma **S10 como falsa**):

```
chatModerationPanel.render.test.tsx
chatReadReceipts.render.test.tsx
consultationCallRouteAccess.test.tsx
firstTimeAvailabilityModal.test.tsx
goalSelectionModal.test.tsx
moodTrendChart.test.tsx
psychologistAvailabilityPage.test.tsx
statisticsEngagementCards.test.tsx
weeklyScheduleModal.test.tsx
```
Nenhum deles está no fluxo de SOS/emergência diretamente, mas `consultationCallRouteAccess.test.tsx` toca rotas de vídeo-chamada — checar com atenção antes de mexer em texto nessas áreas (Fases 6 e 8).

## 12. Validação das suposições

| ID | Suposição | Status | Evidência |
|---|---|---|---|
| S1 | Bundler é Vite | **Confirmada** | `package.json`: `"dev": "vite"`, `"vite": "^5.4.1"` |
| S2 | Estilo usa Tailwind | **Confirmada** | `tailwindcss ^3.4.11`, `tailwind.config.ts` completo |
| S3 | shadcn/ui com HSL em `src/index.css` | **Confirmada** | `components.json` + blocos `:root`/`.dark` em `src/index.css:17-248` |
| S4 | Modo escuro não existe/incompleto | **Falsa** | `next-themes` ligado em `App.tsx`, `ThemeToggle.tsx` funcional, tokens `.dark` completos. Existe, mas não segue o sistema (`enableSystem={false}`, `defaultTheme="light"`) e o toggle é só claro/escuro |
| S5 | Laranja usado fora do SOS | **Confirmada — e muito mais amplo do que suposto** | `--primary` (a cor padrão do app inteiro) **é** o laranja; roxo é `--secondary`. Ver seção 3 |
| S6 | Wordmark é SVG em curvas | **Falsa** | Texto ao vivo com `fontFamily: 'El Messiri'` em 5 arquivos; `Logo.tsx` usa SVG só para o ícone (que por sua vez é um PNG embrulhado, não vetor) |
| S7 | Existem `manifest.json`, `android/`, `ios/` | **Parcial** | `android/` e `ios/` realmente não existem (como a suposição já antecipava); **também não existe** `public/manifest.json` (não estava na suposição original) |
| S8 | Rotas do fluxo de emergência desconhecidas | **Resolvida** | Lista completa na seção 10 |
| S9 | Existem textos de culpa | **Falsa** | Nenhum encontrado — ver seção 9 |
| S10 | Nenhum teste compara texto exato | **Falsa** | 9 arquivos de teste, listados na seção 11 |
| S11 | Botão de SOS muda de posição/tamanho | **Falsa (confirmadamente consistente)** | Um único componente (`BottomNavigation.tsx`) renderiza o botão em todas as telas do paciente, via `MainLayout.tsx`/`PatientBottomNav.tsx` |
| S12 | Fonte da interface é diferente da do wordmark | **Confirmada** | Interface: Poppins. Wordmark: El Messiri |

## 13. Correção do plano

Ver bloco **"Correções da Fase 0"** ao final de `docs/visual/plano.md` — resume o que mudou na seção 2 (tabela de fatos) e sinaliza a pergunta nova que a Fase 1 precisa incluir por causa do achado da seção 3 deste documento (laranja = `--primary` do app inteiro, não um uso isolado).
