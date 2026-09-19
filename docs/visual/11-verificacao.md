# Fase 11 — Verificação final

Feito em 2026-09-19. Última fase do plano de identidade visual (`docs/visual/plano.md`) — Fases 0 a 10 concluídas.

## 1. Comandos

```bash
npx tsc --noEmit        # limpo
npx vitest run          # 265/268 (mesmas 3 falhas pré-existentes, não relacionadas, em availableTimeSlots.test.ts — presentes desde antes da Fase 0)
npm run build            # sucesso
bash scripts/check-colors.sh          # OK — regra do laranja respeitada
bash scripts/check-colors.sh --strict # falha — débito técnico pré-existente e fora de escopo (paletas de humor/respiração/som/gráfico, nunca laranja; documentado desde a Fase 3 §4)
```

Essa é a mesma baseline de testes observada em todas as 11 fases — nenhuma regressão introduzida pelo plano em nenhum momento.

## 2. Screenshots (Playwright, 390px, claro e escuro)

Em `docs/visual/screenshots/`. **Limitação desta sessão, a mesma de todas as fases anteriores:** sem credenciais de teste, só é possível alcançar as telas públicas (sem login). As 5 telas cobertas:

- `login-{light,dark}.png` — tela inicial (`/`)
- `signup-type-{light,dark}.png` — escolha de cadastro
- `patient-signup-{light,dark}.png` — cadastro do paciente
- `psychologist-signup-{light,dark}.png` — cadastro do psicólogo
- `not-found-{light,dark}.png` — 404

Todas renderizam corretamente, roxo consistente (sem vestígio de laranja fora do SOS), bom contraste em ambos os temas, sem texto cortado ou sobreposto em 390px.

**Nota observada, não é uma regressão desta fase:** o toast "Erro ao carregar estados" nos formulários de cadastro provavelmente é uma limitação de rede deste ambiente sandbox (uma chamada a uma API externa de estados/IBGE que aqui não tem saída), não um bug introduzido pelo plano — não foi tocado nenhum código relacionado a essa função em nenhuma das 11 fases.

**Não cobertas por screenshot nesta sessão** (telas atrás de login — SOS, home, chat, consultas, diário, perfil, painel do psicólogo, painel do admin): mesma limitação já registrada nas Fases 4, 5 e 6. Revisadas por leitura de código e, quando tocadas diretamente, validadas com a técnica de rota de preview temporária (Fases 6, 7, 8) — nunca só "no olho".

## 3. Checklist manual no aparelho Android

**Não executável nesta sessão** — exige um aparelho físico ou emulador Android com o app instalado, o que este ambiente não tem. Fica como o próprio plano já previa (é a única etapa do plano inteiro explicitamente marcada como manual, não automatizável). Lista para quando isso for feito:

- [ ] SOS visível e na mesma posição em todas as telas do paciente
- [ ] Nenhum laranja fora do SOS
- [ ] Modo escuro sem textos invisíveis
- [ ] Fonte do sistema no máximo não quebra o fluxo de SOS
- [ ] Ícone correto na tela inicial, na lista de apps e na splash
- [ ] CVV 188 tocável na tela de espera

Sobre os 3 primeiros itens: já verificados por código e/ou screenshot ao longo do plano (regra do laranja garantida por `check-colors.sh`; SOS consistente por construção, Fase 6a; modo escuro testado nas telas alcançáveis, Fases 4-7) — o que falta é a confirmação final num dispositivo real, não uma auditoria do zero.

## 4. Resumo do que o plano de identidade visual mudou, fase a fase

| Fase | Resultado |
|---|---|
| 0 | Inventário: 129 cores cruas, laranja era `--primary` do app inteiro, wordmark dependia de fonte em runtime, sem manifest/ícones PWA, contraste do laranja reprovava AA |
| 1 | Decisões: inversão de cores, roxo mantido, laranja escurecido para o SOS, logo mantido, mascote removido, confirmação em tela cheia, Poppins mantida |
| 2 | Tokens: `--primary` vira roxo, `--sos-secondary` vira o laranja exclusivo, `--calm` criado |
| 3 | Laranja migrado para fora de tudo que não é SOS; `--secondary` vira neutro |
| 4 | Modo escuro segue o sistema; seletor de 3 estados |
| 5 | Contraste AA corrigido em `--destructive`/`--success`/`--sos-primary`; toque de 48px; `aria-label`; `prefers-reduced-motion` |
| 6 | Confirmação em tela cheia do SOS; `bg-calm` no fluxo de emergência; SOS em mais 5 telas |
| 7 | Wordmark em SVG; favicon/manifest/ícones/splash/og:image gerados |
| 8 | Tom de voz mais acolhedor em 8 textos; acesso ao CVV/SAMU criado na home |
| 9 | Guia de marca consolidado |
| 10 | Mascote removido do app inteiro |

## 5. Pendências que ficam para depois deste plano

- `SoundPlayer.tsx` sem botão de SOS (Fase 6, layout em tela cheia, risco de cobrir controles sem visualizar).
- Fileiras de ícones densas em `PsychologistDashboard.tsx`/`AdminDashboard.tsx` abaixo de 48px de toque (Fase 5).
- Verificação visual completa das telas autenticadas em modo escuro (Fase 4).
- Vetorização de verdade do logo, se a qualidade em tamanhos grandes incomodar (Fase 7, nota técnica).
- Débito de cor crua não relacionado ao laranja — paletas de humor/respiração/som/gráfico (`scripts/check-colors.sh --strict`).
- Checklist manual no aparelho Android (esta fase, §3).

## 6. Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268
- `npm run build`: sucesso
- `bash scripts/check-colors.sh`: OK
- Screenshots: 5 telas públicas × 2 temas, em `docs/visual/screenshots/`

## Arquivos alterados

`docs/visual/screenshots/*.png` (10 arquivos, novos).
