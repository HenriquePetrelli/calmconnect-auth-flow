# Guia de marca — Soliv

Referência curta e prática para quem for mexer na interface do Soliv depois — humano ou Claude. Reflete o estado do design system após as Fases 1-8 do plano de identidade visual (`docs/visual/plano.md`); qualquer mudança de token deve ser feita em `src/index.css` e refletida aqui.

## 1. Paleta

Todo token é HSL, com versão clara (`:root`) e escura (`.dark`) em `src/index.css`. **Nunca usar hex/rgb/hsl cru em componentes — sempre a classe Tailwind do token** (`bg-primary`, `text-sos-secondary`, etc.), verificado por `scripts/check-colors.sh`.

| Token | Uso | Light (hex aprox.) | Dark (hex aprox.) |
|---|---|---|---|
| `--primary` | Cor de marca. Botões principais, links, foco, ícones ativos. | `#7C3BED` | `#A480FA` |
| `--secondary` | Tom neutro/discreto — botões `variant="secondary"`, elementos de menor destaque. **Não é roxo** (era, até a Fase 3). | `#EAE9ED` | `#4C465D` |
| `--sos-secondary` | Laranja — **exclusivo do fluxo de SOS**, em nenhum outro lugar. | `#B3450F` | `#BD490F` |
| `--sos-primary` | Vermelho — ações de emergência de fato (ligar, confirmar crise). | `#E11414` | `#E11414` |
| `--calm` | Fundo do modo crise (tela de espera do SOS, `EmergencyVideoCall.tsx`). Mais quieto que `--background`, propositalmente diferente. | `#F4F2F8` | `#262131` |
| `--success` | Estados de sucesso, com texto branco em cima. | `#16833E` | `#1B7E3F` |
| `--warning` | Atenção — âmbar, deliberadamente distinto do laranja de SOS. | `#F59F0A` | (mais claro, mesmo tom) |
| `--destructive` | Ações destrutivas (excluir, cancelar). | `#E11414` | `#E11414` |
| `--background` / `--foreground` | Fundo/texto padrão do app. | `#F9FAFB` / `#0F1729` | `#2A2438` / branco |

### A regra do laranja

**Laranja é exclusivo do fluxo de SOS.** Não aparece em botão comum, badge, gráfico, ícone de categoria ou qualquer lugar fora de `--sos-secondary`/`--sos-soft`. Essa foi a mudança central da Fase 3: antes, o laranja era `--primary` (a cor padrão de todo o app); hoje é reservado para o único contexto em que precisa saltar aos olhos imediatamente — o botão de emergência e a tela de crise. Antes dessa mudança, o laranja padrão nem sequer passava no contraste mínimo de acessibilidade (2,78:1 com texto branco); o novo tom (`#B3450F`) passa com folga (5,54:1).

Se alguma tela nova "precisar" de laranja para chamar atenção, a resposta é não — usar `--primary` (roxo) ou `--warning` (âmbar), e se nenhum dos dois cumprir o papel, é hora de conversar antes de adicionar, não de abrir uma exceção silenciosa. `scripts/check-colors.sh` falha o build se qualquer classe de paleta laranja aparecer fora da allowlist (`scripts/sos-allowlist.txt`).

## 2. Tipografia

- **Interface (corpo, botões, títulos de tela):** Poppins, carregada via Google Fonts.
- **Wordmark ("soliv"):** El Messiri Bold, mas **não como texto ao vivo** — desde a Fase 7, é SVG (`src/components/Wordmark.tsx`), gerado a partir da fonte real. Usa `fill="currentColor"`, então sempre herda a cor do elemento pai (`text-primary`, `text-white`) e funciona em claro/escuro sem arquivo separado. Não depende de a fonte carregar em runtime.
- São propositalmente fontes diferentes — uma para o nome da marca, outra para o resto da interface. Isso é esperado, não um erro a corrigir.

## 3. Ícone e wordmark

- **Ícone:** o cérebro dividido (metade laranja com traços de vento, metade roxa com eletrocardiograma) — decisão da Fase 1: **mantido, não substituído**. Arquivo fonte: `src/assets/soliv-logo.svg` (nota técnica: não é vetor de verdade, embrulha um PNG — ver `docs/visual/07-wordmark-assets.md` se isso incomodar visualmente em tamanhos grandes no futuro).
- **Wordmark:** usar sempre `<Wordmark className="h-[Npx] text-primary" />` (ou `text-white` sobre fundo colorido sólido), nunca recriar como texto com `fontFamily` inline.
- **Tamanho mínimo:** o wordmark em SVG mantém a proporção original (≈2,87:1 largura/altura); abaixo de ~24px de altura o traço fino da fonte El Messiri começa a perder legibilidade — evitar.
- **Área de respiro:** manter pelo menos a altura do próprio elemento como margem lateral livre ao redor do ícone/wordmark, para não ficar espremido contra bordas ou outros elementos.
- **O que não fazer:** não colorir o ícone (cores fixas do próprio logo), não esticar/distorcer a proporção, não usar o wordmark em texto vivo, não recolorir o wordmark fora de `text-primary`/branco sem motivo.

## 4. Assets gerados

Favicon, `apple-touch-icon`, `manifest.json`, ícones PWA (`public/icons/`), `og-image.png`, e o material de staging para Android/iOS/Capacitor splash (`docs/visual/assets/`) — todos gerados na Fase 7 a partir do mesmo logo. Fonte reaproveitável em `assets/logo.png` (convenção do `@capacitor/assets`). Detalhes completos em `docs/visual/07-wordmark-assets.md`.

## 5. Tom de voz — resumo

Guia completo em `docs/visual/08-tom-de-voz.md`. Em 5 exemplos:

| Situação | ❌ Evitar | ✅ Preferir |
|---|---|---|
| Erro técnico | "Network request failed" | "Sem conexão com a internet. Verifique sua rede e tente novamente." |
| Sessão/link inválido | "ID da sessão não foi fornecido ou é inválido." | "Não encontramos essa chamada. Volte para o início e tente de novo." |
| Meta não concluída | "Você não completou sua meta esta semana." | (nada — silêncio é a opção certa) |
| Conquista desbloqueada | "Achievement unlocked" | "Parabéns! Você desbloqueou uma nova conquista." |
| Ninguém disponível (SOS) | "Nenhum profissional pôde atender." | "Ainda não encontramos um profissional livre. Você não está sozinho." |

Princípios: frases curtas, segunda pessoa, sem jargão clínico para o paciente, sem positividade forçada, nunca culpa/cobrança, e ainda mais enxuto na crise (verbo no presente, uma instrução por vez).

## 6. Mascote

**Não há mais mascote.** Existia uma preguiça (`src/components/mascot/`) usada em 7 telas — removida pela Fase 10 do plano, por decisão do Henrique na Fase 1 (não é para reintroduzir, nem essa espécie nem outra). Se alguma tela nova "pedir" um elemento visual amigável, a resposta não é trazer de volta um mascote — usar ilustração, ícone ou o próprio tom de voz para transmitir acolhimento.

## 7. Onde essas regras vêm de

Este guia resume decisões documentadas fase a fase em `docs/visual/`: `00-inventario.md` (Fase 0), `01-decisoes.md` (Fase 1), `02-tokens.md` e `03-regra-do-laranja.md` (Fases 2-3), `04-modo-escuro.md` (Fase 4), `05-acessibilidade.md` (Fase 5), `06-sos-modo-crise.md` (Fase 6), `07-wordmark-assets.md` (Fase 7), `08-tom-de-voz.md`/`08-microcopy-proposto.md` (Fase 8). O plano completo, com as regras invioláveis (seção 3) que valem para qualquer mudança futura na interface, está em `docs/visual/plano.md`.
