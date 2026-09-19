# Fase 1 — Decisões do Henrique

Respostas coletadas em 2026-09-19, via `AskUserQuestion` e conversa direta. Página com as opções visuais (cores + ícones) apresentada antes das perguntas 1-3: https://claude.ai/artifact/LpNozH5XASNiuDya95zjE3

## Pergunta 0 (nova, adicionada pela Fase 0) — Escopo da regra do laranja

**Decisão: opção (a), inversão completa.**

`--primary` (cor padrão de botão, foco, sombra e scrollbar de todo o app) passa a ser roxo. O que hoje é `--secondary` (o roxo do wordmark) vira a base do novo `--primary`. O laranja deixa de ser escolhível como cor de botão comum em qualquer lugar do app e fica reservado exclusivamente ao token de SOS.

**Consequência direta:** a Fase 3 ("regra do laranja") deixa de ser uma migração pontual de alguns componentes — é redefinir a cor de marca principal do design system inteiro. Tamanho da fase revisado de 3h para 3h-5h na seção 4 do plano.

## Pergunta 1 — Tom do roxo (novo `--primary`)

**Decisão: opção A — manter o tom atual.**

| | |
|---|---|
| Hex | `#7C3BED` |
| HSL | `262 83% 58%` (mesmo valor que hoje é `--secondary`) |
| Contraste (branco sobre) | 5,67:1 — passa AA texto normal |

Nenhuma mudança de tom do roxo em si — só a função do token muda (de `--secondary` para `--primary`). Reaproveita 100% do wordmark e de tudo que já usa esse roxo hoje (ex.: `text-secondary` em `MainLayout.tsx`, `SignupType.tsx` etc. — ver Fase 0 §4) sem alteração perceptível de marca.

## Pergunta 2 — Tom do laranja (exclusivo SOS)

**Decisão: opção F — mais escuro.**

| | |
|---|---|
| Hex | `#B3450F` |
| HSL | `20 85% 38%` |
| Contraste (branco sobre) | 5,54:1 — passa AA texto normal (o tom atual, `#F97316`, media 2,78:1 e reprovava mesmo para texto grande) |

Esse valor corrige a falha de contraste identificada na Fase 0 (§8) com folga confortável — importante justamente no botão que precisa ser lido sem esforço durante uma crise. Escolhido em vez de E (`#CB510B`, passa só para texto grande) e G (`#D8440E`, variante avermelhada).

**Nota para a Fase 2:** os tokens `--sos-primary` (hoje vermelho, `0 84% 60%`) e `--sos-secondary` (hoje laranja igual ao `--primary` antigo) já existem — `--sos-secondary` deve ser atualizado para este novo valor; `--sos-primary` (vermelho) não foi discutido nesta rodada e pode continuar como está, a confirmar quando a Fase 2 remapear o `--gradient-sos`.

## Pergunta 3 — Direção do ícone / logo

**Decisão: manter o logo atual (cérebro dividido laranja/roxo). Não substituir.**

Isso reverte a premissa original do plano (seção 1 dizia "logo vai ser substituído"). A seção 1 e a Fase 7 do `plano.md` foram atualizadas para refletir essa decisão. Os três conceitos de ícone novo apresentados na página (anel/"o" do wordmark, gota, duas formas se apoiando) não serão usados.

**Fica registrado, sem ação decidida ainda:** o arquivo atual do logo (`soliv-logo.svg`) não é um vetor de verdade — é uma imagem PNG embrulhada num `<svg>` (achado da Fase 0, §5). Isso não foi parte da decisão sobre TROCAR o símbolo, então continua valendo como está por enquanto; só vira relevante se a qualidade visual do logo em tamanhos grandes (splash, ícone 512px) incomodar quando esses assets forem gerados na Fase 7 — nesse caso, vetorizar as mesmas formas existentes é uma conversa separada, não uma reabertura desta decisão.

## Pergunta 4 — Proteção contra toque acidental no SOS

**Decisão: opção (c) — toque + confirmação em tela cheia.**

O toque no botão de SOS abre uma tela de confirmação antes de acionar a emergência de verdade — não aciona no primeiro toque, e não é só "segurar 1 segundo". Esta é uma mudança de **comportamento**, não só visual: a Fase 6b vai implementar exatamente isso (e só isso) e apresentar o diff antes de qualquer commit, conforme a regra 2 da seção 3 do plano.

## Pergunta 5 — Mascote

**Decisão: remover o mascote do app inteiro.**

A Fase 0 encontrou um mascote já implementado (preguiça, `src/components/mascot/`, 6 poses) em uso em 7 telas — incluindo a tela de espera do SOS (`SOS.tsx`), o que por si só já violava o espírito da Fase 6c. A decisão do Henrique não foi "manter só fora do SOS" nem "trocar de espécie" — foi remover completamente. A Fase 10 do plano foi reescrita: de "Mascote (opcional)" para "Remover o mascote", com escopo pequeno (~1h) e sem necessidade de 🛑, já que não há nada novo para aprovar.

## Pergunta 6 — Fonte da interface

**Decisão: manter Poppins.**

Nenhuma mudança. A fonte da interface (Poppins) continua diferente da fonte do wordmark (El Messiri) — isso é esperado e não foi apontado como problema pela Fase 0; são dois usos distintos (corpo da UI vs. nome da marca) e é comum ter fontes diferentes para cada papel.

---

## Resumo para quem for executar a Fase 2 em diante

- Novo `--primary`: roxo `hsl(262 83% 58%)` / `#7C3BED` (mesmo valor do atual `--secondary`).
- Novo laranja exclusivo de SOS: `hsl(20 85% 38%)` / `#B3450F` — substitui o uso de `--sos-secondary` e de qualquer `--primary` antigo que hoje aparece em contexto de SOS.
- `--secondary` (o que sobra do roxo atual) precisa de um novo papel — a Fase 2 decide se vira um tom secundário de fato, ou se é aposentado; não foi perguntado ao Henrique nesta rodada.
- Sem ícone novo — logo do cérebro continua.
- Sem mascote — remover de `src/components/mascot/` e das 7 telas que o usam.
- Fluxo de SOS ganha uma tela de confirmação antes de acionar (mudança de comportamento, não só visual — regra 2 da seção 3 se aplica: revisão linha a linha).
- Fonte da interface não muda.
