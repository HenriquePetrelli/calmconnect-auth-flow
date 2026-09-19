# Fase 2 — Tokens de design

Feito em 2026-09-19. Camada semântica estendida em `src/index.css` (`:root`/`.dark`) e mapeada em `tailwind.config.ts`, conforme confirmado na Fase 0: o projeto já usa Tailwind + shadcn com variáveis HSL — não foi criado um sistema paralelo.

## 1. `--primary` vira roxo (Fase 1, pergunta 0)

| Token | Antes (light) | Depois (light) | Antes (dark) | Depois (dark) |
|---|---|---|---|---|
| `--primary` | `25 95% 53%` (laranja) | `262 83% 58%` (roxo) | `27 96% 64%` | `258 92% 74%` |
| `--primary-hover` | `21 90% 48%` | `263 70% 50%` | `27 96% 58%` | `258 90% 68%` |
| `--primary-active` | `17 88% 40%` | `263 69% 42%` | `25 95% 52%` | `262 83% 60%` |
| `--primary-glow` | `27 96% 61%` | `258 90% 66%` | `32 97% 74%` | `252 95% 82%` |
| `--ring` | `25 95% 53%` | `262 83% 58%` | `27 96% 64%` | `258 92% 74%` |
| `--accent` / `--accent-foreground` | tint laranja | tint roxo | tint laranja | tint roxo |
| `--gradient-primary` / `--gradient-brand` | laranja→laranja / laranja→roxo | roxo→roxo-glow | idem | idem |

`--primary-foreground` não mudou (`0 0% 100%`, branco) — contraste sobre o novo roxo: **5,67:1**, valor já validado na Fase 1 (`01-decisoes.md`).

## 2. `--sos-secondary` vira o laranja exclusivo do SOS (Fase 1, pergunta 2)

| Token | Antes | Depois | Contraste (branco sobre) |
|---|---|---|---|
| `--sos-secondary` (light) | `25 95% 53%` | `20 85% 38%` | 2,78:1 → **5,54:1** |
| `--sos-secondary` (dark) | `25 95% 60%` | `20 85% 40%` | — → **5,10:1** |

Novos tokens de apoio, necessários para os estados do botão de SOS sem cor fixa nova (regra 4 da seção 3):
- `--sos-secondary-hover` (gradiente/hover do botão flutuante)
- `--sos-secondary-active` (traço fino do ícone, ver §4)
- `--sos-secondary-foreground` (branco — usado no lugar de `--primary-foreground` agora que o botão não referencia mais `--primary`)
- `--sos-soft` (fundo laranja suave, exclusivo do SOS — ainda sem uso; fica pronto para a Fase 6c)

## 3. Novo token: `--calm`

Fundo do modo crise (Fase 6c), que ainda não existia. Light: `258 30% 96%` (lavanda muito claro, distinto do `--background` neutro). Dark: `258 20% 16%` (um pouco mais escuro que o `--background` escuro, `258 22% 18%`, para uma sensação de "recolhimento").

## 4. Correção de acoplamento: `.sos-button` e `LifeRingIcon.tsx` dependiam de `--primary`

Achado durante a implementação, não estava no escopo original da Fase 2, mas era necessário para não quebrar o app: o botão de SOS real (`.sos-button` em `src/index.css`, renderizado por `BottomNavigation.tsx` em toda tela do paciente) usava `hsl(var(--primary))` diretamente — ao virar `--primary` roxo, o botão de emergência ficaria roxo no primeiro deploy desta fase, antes mesmo de a Fase 3 auditar o resto do app. Corrigido para usar `--sos-secondary`/`--sos-secondary-hover`/`--sos-secondary-foreground`.

Pelo mesmo motivo, `src/components/icons/LifeRingIcon.tsx` (o ícone da boia, hoje usado só no botão de SOS) tinha 4 cores em hex fixo (`#EA580C`, `#FFFFFF`, `#7C2D12`) que não acompanhariam a mudança de tom do laranja de SOS decidida na Fase 1 — ficariam com um laranja "antigo" sobre o novo fundo. Convertidas para `hsl(var(--sos-secondary))` / `hsl(var(--sos-secondary-foreground))` / `hsl(var(--sos-secondary-active))`. Sem essa correção, o ícone real do SOS teria dois tons de laranja diferentes e desalinhados entre a cor do fundo e a cor do traço.

## 5. Decisão tomada durante a fase: papel do `--secondary`

Pergunta feita ao Henrique (não fazia parte do lote original da Fase 1, surgiu ao planejar esta fase): como já era esperado, `--secondary` tinha o mesmo valor que o novo `--primary` (ambos eram o roxo `262 83% 58%`) — precisava de um papel novo.

**Decisão: vira neutro/cinza.** Mas a implementação do valor final **foi adiada para a Fase 3**, não aplicada agora. Motivo, descoberto só ao levantar todos os usos: `-secondary` aparece em **~140 ocorrências, em ~35 arquivos** — bem mais do que os "~90 lugares" estimados na Fase 0/1 — e mistura dois sentidos diferentes:

- **Quer o roxo de marca:** ex. `text-secondary` no wordmark "soliv" (`MainLayout.tsx`, `SignupType.tsx`) — se `--secondary` virasse cinza agora, o nome do app apareceria cinza.
- **Quer um tom discreto/neutro de verdade:** ex. botão `variant="secondary"` (`components/ui/button.tsx`), badges, a barra de navegação inferior (`.tabs`, hoje roxo sólido, ficaria bem mais clara/neutra).

Trocar o valor de `--secondary` sem separar esses dois grupos quebraria o wordmark e qualquer outro uso "de marca" que hoje pega carona no token errado — exatamente o tipo de auditoria arquivo-a-arquivo que a Fase 3 já vai fazer para o laranja. Por isso, nesta fase, `--secondary` **manteve o valor atual** (idêntico ao `--primary`) — sem regressão visual (nada muda hoje), só adiando a resolução final.

**Valores-alvo já calculados e com contraste validado, prontos para a Fase 3 aplicar** depois de separar os usos "marca" (que devem virar `text-primary`/`bg-primary` etc.) dos usos "neutro":

| Token | Light | Dark |
|---|---|---|
| `--secondary` | `258 10% 92%` | `256 14% 32%` |
| `--secondary-foreground` | `258 20% 25%` (contraste 9,82:1) | `255 20% 92%` (contraste 7,27:1) |
| `--secondary-hover` | `258 10% 87%` (contraste 8,64:1) | `256 14% 38%` |
| `--secondary-active` | `258 10% 82%` | `256 14% 44%` |
| `--secondary-glow` | `258 10% 95%` | `256 14% 50%` |

## 6. `scripts/check-colors.sh`

Criado, executável, com `scripts/sos-allowlist.txt` (hoje só `src/components/ui/button.tsx` e `src/components/sos/ConfirmationModal.tsx` — os únicos arquivos que legitimamente usam classes `-sos`). Verifica três coisas em `src/**/*.tsx`:

1. hex / `rgb()` / `rgba()` / `hsl()` literais (ignora `hsl(var(--...))`, que é uso correto de token);
2. classes de paleta laranja/âmbar (`bg-orange-500`, `text-amber-600`, etc.) fora da allowlist;
3. classes `-sos` (`bg-sos-primary`, etc.) fora da allowlist.

**Estado hoje: FALHA, como esperado.** 129 ocorrências de cor crua (achado da Fase 0) mais as classes de paleta laranja/âmbar em ~10 arquivos ainda não migradas — essa é a lista de trabalho da Fase 3, que é quem deve deixar o script passando limpo. Ele já está pronto para entrar em CI quando o CI existir (roadmap, sessão 25).

## 7. Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes, não relacionadas, em `availableTimeSlots.test.ts`)
- `npm run build`: sucesso
- `bash scripts/check-colors.sh`: falha esperada (documentada acima) — vira critério de aceite da Fase 3

## 8. Arquivos alterados

- `src/index.css` — tokens `:root`/`.dark` (primary, secondary — só comentário, accent, ring, sos-*, calm, gradientes) e `.sos-button`
- `tailwind.config.ts` — mapeamento de `sos.secondary-hover`, `sos.secondary-active`, `sos.secondary-foreground`, `sos.soft`, `calm`
- `src/components/icons/LifeRingIcon.tsx` — hex fixo → tokens
- `scripts/check-colors.sh` (novo)
- `scripts/sos-allowlist.txt` (novo)
