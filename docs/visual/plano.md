# Plano de identidade visual do Soliv

> **Para o Claude que vai executar este plano:** leia o documento inteiro antes de tocar em qualquer arquivo. Execute **uma fase por sessão**, na ordem. Cada fase termina com um relatório curto e um commit. Quando uma fase tiver **🛑 PARADA**, não avance: apresente o que encontrou e espere a decisão do Henrique.
>
> **Este plano foi escrito sem acesso direto ao código.** Ele se baseia em resumos de auditorias anteriores e em prints da identidade visual. Tudo que não foi confirmado está marcado como **[S1]**, **[S2]** etc. e listado na seção 2. **Nenhuma instrução marcada com [S] deve ser executada antes de a Fase 0 confirmar a suposição.** Se a Fase 0 derrubar uma suposição, a primeira tarefa é corrigir este documento.

---

## 1. Contexto

O Soliv é um app de bem-estar mental (React + Supabase + Capacitor; bundler Vite, confirmado na Fase 0). O diferencial é o **botão de ajuda emergencial (SOS)**: o paciente em crise é conectado por vídeo a um psicólogo.

A identidade visual atual tem três peças:

- **Nome:** "soliv" em minúsculas, fonte arredondada personalizada, roxo. **Fica.**
- **Logo:** cérebro dividido, metade laranja com traços de vento, metade roxa com eletrocardiograma. **[Decisão da Fase 1: fica como está — Henrique optou por manter o logo atual, não substituir.]** A preocupação original do plano com o laranja diluir o SOS perde peso com a inversão de cores decidida (pergunta 0): o laranja do logo deixa de ser a cor primária do app de qualquer forma. Continua pendente o problema técnico do arquivo (ver `docs/visual/00-inventario.md` §5: o SVG atual embrulha um PNG, não é vetor de verdade) — fora do escopo visual/de marca, mas vale registrar para uma limpeza técnica futura se o arquivo continuar sendo usado.
- **Botão SOS:** círculo laranja com boia salva-vidas. **Fica, e ganha exclusividade** (tom ajustado na Fase 1 — ver `docs/visual/01-decisoes.md`).

### Objetivo

1. Separar **cor de marca** (roxo) de **cor funcional de emergência** (laranja).
2. Deixar o app confortável de madrugada (modo escuro) e acessível.
3. Fazer o fluxo de SOS ficar mais simples e calmo durante a crise.
4. ~~Trocar o ícone por um símbolo discreto~~ **[Fase 1: não se aplica mais — logo mantido como está.]**
5. Definir um tom de voz acolhedor e remover qualquer texto que gere culpa.
6. ~~(Opcional, por último) Introduzir um mascote com regras claras de onde pode aparecer.~~ **[Fase 1: decisão foi remover o mascote existente do app inteiro, não introduzir um novo — ver `docs/visual/01-decisoes.md`.]**

---

## 2. O que é fato e o que é suposição

### Fatos (vindos de auditorias do código, commit `9319a82`, ago/2026)

Estes podem ter mudado desde então, mas têm origem no código real.

| Fato | Origem |
|---|---|
| Stack React + Supabase + Capacitor; projeto nasceu na Lovable | auditoria técnica, roadmap |
| `EmergencyVideoCall.tsx` e `useWebRTC.ts` são os arquivos mais críticos e testados | auditoria técnica |
| Existem testes com Vitest e Playwright; não existe CI | auditoria técnica |
| Rota `/consultation-call/:appointmentId` | sessões de consulta |
| `SafetyPlanModal` mostra CVV 188 e SAMU 192; `SafetyPlanPrompt` fica na home | estado da implementação |
| `PatientContextPanel` e `PsychologistDashboard` (com aba Agenda) existem | estado da implementação, agenda |
| Existem metas semanais, conquistas (`/achievements`) e RPCs de streak | auditoria técnica |
| Nome em roxo com fonte arredondada; logo de cérebro laranja/roxo; SOS laranja com boia | prints enviados pelo Henrique |
| Bundler é Vite (`^5.4.1`); estilo é Tailwind (`^3.4.11`) com shadcn/ui (HSL em `src/index.css`, `:root`/`.dark`) | Fase 0 — `package.json`, `tailwind.config.ts`, `components.json` |
| Modo escuro **existe e funciona** (next-themes, `ThemeToggle.tsx`, tokens `.dark` completos), mas não segue o tema do sistema (`enableSystem={false}`, `defaultTheme="light"`) e o toggle é só claro/escuro | Fase 0 — `docs/visual/00-inventario.md` §7 |
| **`--primary` (a cor padrão de todo o app: botões, foco, sombra, scrollbar) é o laranja; `--secondary` é o roxo** — o laranja não é um uso isolado fora do SOS, é a cor de marca principal hoje | Fase 0 — `docs/visual/00-inventario.md` §3 |
| Wordmark "soliv" é renderizado como **texto ao vivo** com `fontFamily: 'El Messiri'` (Google Fonts) em 5 arquivos, não como SVG em curvas; `Logo.tsx` usa um SVG só de ícone, que por sua vez embrulha um PNG (não é vetor) | Fase 0 — `docs/visual/00-inventario.md` §5 |
| Fonte da interface (Poppins) é diferente da fonte do wordmark (El Messiri) | Fase 0 |
| Não existem `android/`, `ios/` **nem `public/manifest.json`** | Fase 0 — `docs/visual/00-inventario.md` §5 |
| Rotas do fluxo de emergência: `/sos`, `/emergency-call`, `/emergency-call/request/:requestId`, `/emergency-call/:sessionId`, `/emergency/call/:requestId` (legacy, só psicólogo). Consulta agendada é rota separada, `/consultation-call/:appointmentId` | Fase 0 — `docs/visual/00-inventario.md` §10 |
| Nenhum texto de culpa/pressão encontrado (metas, streaks, conquistas) | Fase 0 — `docs/visual/00-inventario.md` §9 |
| 9 arquivos de teste comparam texto exato da interface (`getByText`/`toHaveTextContent`) | Fase 0 — `docs/visual/00-inventario.md` §11 |
| O botão de SOS é renderizado por um único componente compartilhado (`BottomNavigation.tsx`) em todas as telas do paciente — posição e tamanho são consistentes por construção | Fase 0 |
| Texto branco sobre o laranja `primary` (botão padrão do app inteiro) reprova WCAG AA mesmo para texto grande (2,78:1, mínimo é 3:1) — mesmo problema em `--sos-secondary` | Fase 0 — `docs/visual/00-inventario.md` §8 |
| Já existe um mascote implementado (preguiça, `src/components/mascot/`, poses base/celebrate/hug/sleep/thinking/wave) e em uso em 7 telas, **incluindo `/sos` (pose "hug" na tela de espera do SOS)** — não existe ainda uma política de rotas proibidas | Fase 0 |

### Suposições que restam (nenhuma sobrevive sem confirmação — todas as 12 originais foram resolvidas na Fase 0; ver `docs/visual/00-inventario.md` §12 para a tabela completa com evidências)

---

## 3. Regras invioláveis

Estas regras valem para **todas** as fases.

1. **Nenhuma mudança de lógica.** Este é um trabalho visual. Não altere hooks, queries, RPCs, edge functions, migrations, rotas ou permissões. Se uma melhoria visual exigir mudar comportamento, pare e pergunte.
2. **`EmergencyVideoCall.tsx` e `useWebRTC.ts` são zona protegida.** Em `useWebRTC.ts`, nada. Em `EmergencyVideoCall.tsx`, só `className`, tokens de cor e texto visível. O diff dele deve ser revisado linha a linha e apresentado separado no relatório.
3. **Os testes existentes precisam continuar passando.** `npx vitest run` e `npx tsc --noEmit` ao fim de cada fase. Se um teste quebrar por causa de texto alterado, mostre antes de ajustar o teste.
4. **Nada de cor fixa nova.** Nenhum hex, `rgb()` ou classe de paleta crua (`orange-500`, `purple-600`, `violet-*`) em componentes. Toda cor sai de um token semântico (Fase 2).
5. **Laranja é exclusivo do SOS** — em vigor desde a Fase 3, verificado por `bash scripts/check-colors.sh`.
6. **O CVV 188 e o SAMU 192 nunca somem** de onde já aparecem (`SafetyPlanModal`, telas de emergência).
7. **Commits pequenos**, um por fase, com mensagem `visual(fase-N): …`.
8. **Na dúvida sobre gosto, pergunte.** Na dúvida sobre acessibilidade, siga o WCAG.

---

## 4. Fases

| Fase | O quê | Estimativa | Parada? |
|---|---|---|---|
| 0 | Inventário (somente leitura) | 2h | 🛑 sim — ✅ concluída |
| 1 | Decisões do Henrique | — | 🛑 sim — ✅ concluída |
| 2 | Tokens de design | 3h | não — ✅ concluída |
| 3 | Regra do laranja (inversão completa, decidida na Fase 1) + papel definitivo do `--secondary` (adiado da Fase 2) | 4h–6h | não precisou de 🛑 — ✅ concluída |
| 4 | Modo escuro (revisão + 2 ajustes, reduzida na Fase 0) | 2h | não — ✅ concluída (parcial, ver §5 de `docs/visual/04-modo-escuro.md`) |
| 5 | Acessibilidade | 3h | não — ✅ concluída (parcial, ver §2 de `docs/visual/05-acessibilidade.md`) |
| 6 | SOS e modo crise | 4h | 🛑 antes de mexer em comportamento — ✅ concluída (6b aprovada por Henrique antes do commit) |
| 7 | Wordmark, splash e assets (reduzida na Fase 1 — sem ícone novo) | 2h | 🛑 revisão do wordmark em SVG — ✅ concluída, aprovada por Henrique |
| 8 | Tom de voz e microcopy | 3h | 🛑 lista de textos |
| 9 | Guia de marca | 1h30 | não |
| 10 | Remover o mascote (reformulada na Fase 1) | 1h | não |
| 11 | Verificação final | 2h | não |

**Total revisado:** ~25h (era ~24h; Fase 3 cresceu mais uma vez por causa do `--secondary`, ver Fase 2 e `docs/visual/02-tokens.md` §5).

---

### Fase 0 — Inventário · 2h · 🛑

**Somente leitura. Não edite nenhum arquivo além do relatório.**

Gere `docs/visual/00-inventario.md` com:

1. **Stack de estilo.** Tailwind? Qual versão? `tailwind.config.*`, `src/index.css`, variáveis CSS em `:root`, shadcn/ui (`components.json`, `src/components/ui/`), `next-themes` ou similar, `darkMode` configurado?
2. **Todas as cores em uso.** Rodar e resumir (contagem por arquivo, top 20 arquivos):
   ```bash
   grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(" src --include=*.tsx --include=*.ts --include=*.css
   grep -rnoE "\b(bg|text|border|ring|from|to|via|fill|stroke)-(orange|amber|red|purple|violet|indigo|fuchsia)-[0-9]{2,3}" src | sort | uniq -c | sort -rn
   ```
3. **Onde o laranja aparece.** Lista de cada ocorrência, classificada em: (a) é SOS/emergência, (b) não é SOS, (c) ambíguo.
4. **Fontes.** Onde a fonte do wordmark é carregada, qual fonte o resto da UI usa, se há `@font-face` ou Google Fonts.
5. **Logo e ícones.** Localizar todas as versões: `public/`, `src/assets/`, favicon, `manifest.json`, `android/app/src/main/res/mipmap-*`, `ios/App/App/Assets.xcassets`, splash do Capacitor, `index.html` (`og:image`, `apple-touch-icon`).
6. **Componentes do SOS.** Todo arquivo que renderiza o botão de emergência ou faz parte do fluxo (acionar → esperar → chamada → encerramento). Anotar a posição do botão em cada tela onde aparece.
7. **Modo escuro.** Existe? Funciona? Quantos componentes têm variante `dark:`?
8. **Contraste.** Medir os 10 pares texto/fundo mais usados (roxo sobre branco, branco sobre roxo, cinza de texto secundário, texto sobre laranja). Reportar razão e se passa AA (4,5:1 texto normal, 3:1 texto grande/ícones).
9. **Textos com culpa ou pressão.** `grep` em strings com "perdeu", "quebrou", "sequência", "não esqueça", "você não", "falhou", "streak". Listar.
10. **Mapa de telas.** As ~40 rotas agrupadas por área (paciente, psicólogo, admin, emergência, consulta, grupos). Identificar os caminhos reais do fluxo de emergência **[S8]**.
11. **Testes que dependem de texto.** Listar testes que fazem `getByText`, `toHaveTextContent` ou comparam strings da interface **[S10]**.
12. **Validar as suposições.** Preencher uma tabela com S1 a S12: **confirmada**, **falsa** ou **parcial**, com a evidência (arquivo e linha, ou comando executado).
13. **Corrigir este plano.** Para cada suposição falsa ou parcial, editar a seção afetada deste documento, mover a linha para "Fatos" na seção 2 e registrar a mudança num bloco "Correções da Fase 0" no fim do arquivo. Suposições confirmadas também passam para "Fatos".

🛑 **PARADA.** Apresente: (1) a tabela de suposições, (2) o que mudou no plano por causa dela, (3) um resumo de uma tela com os números principais e os 5 problemas mais graves. Espere o Henrique.

---

### Fase 1 — Decisões do Henrique · 🛑

O Claude prepara as perguntas; o Henrique responde. Registrar as respostas em `docs/visual/01-decisoes.md`.

0. **[NOVA — adicionada pela Fase 0, prioritária] Escopo real da "regra do laranja".** A Fase 0 descobriu que `--primary` (a cor padrão de botão, foco, sombra e scrollbar do app inteiro) já é o laranja, e `--secondary` já é o roxo — não é um caso isolado, é o design system inteiro. Tornar o laranja exclusivo do SOS (regra 5 da seção 3) significa **trocar a cor primária de todo o app** de laranja para roxo (ou uma terceira cor), não só migrar alguns componentes. Três caminhos possíveis, cada um com escopo e risco diferentes:
   - **(a) Inversão completa:** `--primary` vira roxo, `--secondary` vira laranja-só-SOS (renomeado para não ser mais escolhível como cor de botão comum). Maior fidelidade ao objetivo 1 do plano, maior escopo (toda a Fase 3 cresce).
   - **(b) Nova cor de marca:** introduzir uma terceira cor (ex.: um roxo mais vivo, ou um tom neutro) como `--primary`, deixando o roxo atual como `--secondary` e o laranja isolado só em `--sos-*`. Evita reaproveitar o roxo atual em tudo, mas é mais trabalho de design.
   - **(c) Manter laranja como cor de marca, abrir mão da exclusividade do SOS:** o SOS usa uma variação clara (tom, saturação ou forma) que o distingue do laranja "comum" do resto do app, sem proibir laranja fora do botão de emergência. Menor escopo, mas não cumpre a regra 5 como está escrita hoje — exigiria reescrever essa regra.
   O Claude apresenta as 3 opções com exemplos visuais (tela de botão comum vs. botão SOS) antes do Henrique decidir; a resposta aqui determina o tamanho real da Fase 3.
1. **Roxo da marca.** Manter o tom atual do wordmark (`hsl(262 83% 58%)`, hoje `--secondary`) ou ajustar? O Claude propõe 2–3 variações com contraste medido.
2. **Laranja do SOS.** Manter o tom atual da boia (`hsl(25 95% 53%)`, hoje também `--primary` do resto do app — ver pergunta 0)? Precisa ter contraste ≥ 3:1 contra o fundo claro e o escuro — **hoje falha** (texto branco sobre esse laranja mede 2,78:1; ver `docs/visual/00-inventario.md` §8), então o tom precisa mudar de qualquer forma, independente da resposta à pergunta 0.
3. **Direção do ícone.** O Claude esboça 3 conceitos em SVG simples (ex.: forma abstrata derivada do "o" do wordmark, gota/onda, duas formas se apoiando). Critério: legível a 48px, não diz "saúde mental" nem "crise" para quem olha de fora.
4. **Proteção contra toque acidental no SOS.** Opções: (a) nenhuma, (b) segurar 1 segundo, (c) toque + confirmação em tela cheia. Decisão de produto, afeta velocidade na crise.
5. **Mascote.** Já existe um mascote implementado (preguiça, 6 poses, `src/components/mascot/`), em uso em 7 telas — **incluindo a tela de espera do SOS (`/sos`, pose "hug")**, o que a Fase 6c/10 diz que não deveria acontecer. A pergunta não é mais "sim/não construir do zero", é: manter a preguiça (e só corrigir onde ela aparece, adicionando a política de rotas proibidas — vira essencialmente a Fase 10 já pronta, só falta a política) ou substituir por outra espécie/direção? Se mantiver, a Fase 10 encolhe bastante.
6. **Fonte da interface** **[confirmado: interface usa Poppins, wordmark usa El Messiri — são diferentes]**. Manter a atual ou trocar (sugestões com bom suporte a acentos: Inter, Nunito Sans, Figtree).

---

### Fase 2 — Tokens de design · 3h · ✅ concluída

Relatório completo com todos os valores, contrastes e a justificativa de cada escolha em `docs/visual/02-tokens.md`. Resumo do que foi feito e do que mudou em relação ao plano original:

- **`--primary` virou roxo** (`262 83% 58%` light / `258 92% 74%` dark), junto com `--ring`, `--accent`/`--accent-foreground` e os gradientes que dependiam dele — conforme a decisão de inversão completa da Fase 1.
- **`--sos-secondary` virou o laranja exclusivo do SOS** (`20 85% 38%` light / `20 85% 40%` dark), corrigindo a falha de contraste encontrada na Fase 0. Tokens de apoio novos: `--sos-secondary-hover`, `--sos-secondary-active`, `--sos-secondary-foreground`, `--sos-soft`.
- **Novo token `--calm`**, fundo do modo crise (Fase 6c), que não tinha equivalente antes.
- **Correção de acoplamento não prevista no plano original:** `.sos-button` (o botão real de SOS, em `BottomNavigation.tsx`) e `LifeRingIcon.tsx` (o ícone da boia) referenciavam `--primary`/hex fixo diretamente — sem corrigir isso, o botão de emergência real ficaria roxo assim que `--primary` mudasse. Ambos foram repontados para os novos tokens `--sos-*`.
- **`--brand`/`--sos`/`--surface`/`--text`/`--danger` do texto original do plano não foram criados como tokens novos e separados.** Achado ao implementar: o projeto já tem nomes estabelecidos e usados em centenas de lugares para exatamente esses conceitos — `--primary` (agora o roxo de marca), `--sos-secondary` (laranja exclusivo do SOS), `--background`/`--card` (surface), `--foreground`/`--muted-foreground` (text), `--destructive` (danger). Duplicar esses nomes criaria dois sistemas paralelos para a mesma cor em vez de um só, o oposto do objetivo desta fase. Só foram adicionados tokens para conceitos que **não tinham** equivalente (`--calm`, `--sos-soft` e os `--sos-secondary-*` de apoio).
- **Decisão nova, coletada durante a fase (não estava no lote da Fase 1):** o que fazer com `--secondary`, que tinha o mesmo valor do novo `--primary`. Henrique escolheu virar neutro/cinza — mas a aplicação do valor foi **adiada para a Fase 3**: o token aparece em ~140 lugares (bem mais que os ~90 estimados), misturando usos que querem o roxo de marca (o wordmark, entre outros) com usos que realmente querem um tom neutro. Separar os dois é o mesmo tipo de auditoria arquivo-a-arquivo que a Fase 3 já ia fazer para o laranja — os valores-alvo (com contraste validado) já estão calculados em `docs/visual/02-tokens.md` §5, prontos para aplicar.
- Mapeado em `tailwind.config.ts`. Criado `scripts/check-colors.sh` + `scripts/sos-allowlist.txt`, prontos para entrar em CI quando o CI existir (roadmap, sessão 25). **Falha hoje, como esperado** — é o critério de aceite da Fase 3, não desta.

---

### Fase 3 — Regra do laranja + papel definitivo do `--secondary` · 4h–6h · ✅ concluída

Relatório completo em `docs/visual/03-regra-do-laranja.md`. Resumo:

- Toda ocorrência de laranja fora do SOS (classes `orange-*`, hex `#F97316`/família, RGB literal em canvas, e um token CSS morto `--professional-primary` que ninguém usa hoje) foi auditada e reclassificada — nenhuma sobrou ambígua o bastante para precisar de 🛑. A maioria virou âmbar (cor de categoria/atenção decorativa) ou `bg-primary` (onde era literalmente o antigo `--primary`, ex. banners "Recomendado").
- `amber-*` foi explicitamente excluído da regra — é a família do `--warning`, distinta do laranja de SOS de propósito, como o parágrafo abaixo sempre previu.
- Achado e removido por completo: resíduo de tokens `emma-*` (cor laranja, zero uso em qualquer tela) — sobra do template original antes de virar "Soliv".
- Papel definitivo do `--secondary` resolvido: usos que queriam o roxo de marca (wordmark, cabeçalhos sólidos com texto branco fixo, inclusive o componente compartilhado `PageHeader.tsx` usado em 19 páginas) foram migrados para `--primary` primeiro; só depois o valor de `--secondary` foi trocado para o tom neutro já calculado na Fase 2.
- `scripts/check-colors.sh` agora passa (seções 2 e 3 — regra do laranja). A seção 1 (cor crua em geral, informativa) segue mostrando paletas de humor/respiração/som/gráfico nunca-laranja, fora do escopo desta fase — fica documentado como débito técnico futuro, não bloqueia.

---

### Fase 4 — Modo escuro · 4h · ✅ concluída (parcial)

Relatório completo em `docs/visual/04-modo-escuro.md`. Resumo:

- `enableSystem` ligado e `defaultTheme="system"` em `App.tsx`. `ThemeToggle.tsx` virou um seletor de 3 estados (Claro/Escuro/Sistema, shadcn `Select`), usado sem mudança de import nos dois lugares que já existiam (`Profile.tsx`, `PsychologistProfile.tsx`).
- Fundo escuro (`#2a2438`) confirmado como já não sendo preto puro e já puxado pro roxo — sem mudança necessária.
- Verificação visual real via Playwright/Chromium (não só leitura de código) nas telas alcançáveis sem login: Login e `/signup-type`, em claro e escuro — confirmou o `<html class="dark">` sendo aplicado corretamente pelo `enableSystem`, e validou visualmente os fixes de wordmark/"Login" da Fase 3 (ambos legíveis e roxos no escuro).
- **Pendência explícita:** telas que exigem login (SOS, home, diário, plano de segurança, consultas) não foram verificadas visualmente nesta sessão — sem credenciais de teste disponíveis. Risco avaliado como baixo por leitura de código (cobertura de tokens já ampla, achado da Fase 0), mas fica registrado como item em aberto, análogo ao checklist manual que a própria Fase 11 já previa fazer num aparelho.

---

### Fase 5 — Acessibilidade · 3h · ✅ concluída (parcial)

Relatório completo com o antes/depois dos contrastes em `docs/visual/05-acessibilidade.md`. Resumo:

- Contraste AA corrigido nos tokens: `--destructive`, `--success`, `--sos-primary` (o vermelho do botão de emergência) reprovavam de forma severa (o de sucesso quase nem passava para texto grande) — todos agora ≥4,8:1. Achado bônus: `--evolution-primary` (variante não usada em nenhuma tela) tinha o mesmo problema, corrigido junto.
- Área de toque: `size="icon"` (padrão do botão compartilhado) e o botão de voltar do `PageHeader.tsx` (19 páginas) foram de 40px para 48px. **Pendência:** fileiras de 3-4 ícones nos cabeçalhos de `PsychologistDashboard.tsx`/`AdminDashboard.tsx` continuam em 36px — aumentar às cegas, sem conseguir ver a tela renderizada (sem credenciais de teste), tem risco real de quebrar layout num cabeçalho já apertado.
- Fontes já estavam em `rem` — conferido, sem mudança.
- `aria-label`: botão de SOS alinhado ao texto do plano; auditados todos os botões só-com-ícone do app, 6 sem rótulo corrigidos (inclui os 4 controles principais de uma chamada de vídeo real, em `ConsultationVideoCall.tsx`).
- Foco visível: já existia, abrangente, desde antes desta fase — conferido, sem mudança.
- `prefers-reduced-motion`: não existia, adicionado um bloco global que cobre toda animação/transição do app de uma vez (inclusive o pulsar do botão de SOS).
- Cor sozinha para estado: `ConnectionQuality.tsx` (usado dentro do `EmergencyVideoCall.tsx`) já fazia certo (ícone diferente por estado). `OnlineStatusToggle.tsx` corrigido — o indicador compacto online/offline agora distingue por forma (preenchido vs. vazado), não só cor.

---

### Fase 6 — SOS e modo crise · 4h · ✅ concluída

Relatório completo, com o diff de `EmergencyVideoCall.tsx`, em `docs/visual/06-sos-modo-crise.md`. Resumo:

**6a.** Confirmado por construção (sem correção de posição/tamanho): um único componente renderiza o botão, nunca aparece durante uma chamada. Achado levado ao Henrique antes de agir (mudava o que é alcançável, não só estilo): 10 telas do paciente não tinham o botão — decisão de adicionar nas telas de conteúdo (sons/conquistas/histórico/suporte) e manter de fora as transacionais (assinatura, configurações). Aplicado em 5 telas; `SoundPlayer.tsx` ficou pendente (layout em tela cheia, risco real de cobrir controles sem poder ver renderizado).

**6b.** 🛑 Implementado e **aprovado por Henrique antes do commit**, como o plano exigia. `ConfirmationModal.tsx` virou uma confirmação em tela cheia de verdade (era um `AlertDialog` pequeno centralizado). Validado com screenshot real antes de pedir aprovação.

**6c.** `SOS.tsx`: fundo virou `bg-calm` (primeiro uso real do token), mascote removido (antecipando só esta tela da Fase 10), CVV/SAMU agora sempre visíveis na espera (antes só apareciam sem profissional online). `EmergencyVideoCall.tsx`: só `bg-background` → `bg-calm` nas 14 ocorrências, nada mais — diff completo no relatório.

---

### Fase 7 — Wordmark, splash e assets · 2h (reduzida pela Fase 1) · ✅ concluída

Relatório completo em `docs/visual/07-wordmark-assets.md`. Resumo:

- **Wordmark "soliv" convertido de texto ao vivo (dependia de `fontFamily: 'El Messiri'` carregar via Google Fonts) para SVG de verdade**, gerado com `opentype.js` a partir da fonte real (Bold/700 — o único peso que de fato existe; `font-black`/900 nunca foi carregado). Novo componente `src/components/Wordmark.tsx` (`fill="currentColor"`, funciona em claro/escuro sem arquivo separado). Os 5 arquivos da Fase 0 atualizados. El Messiri removida do `<link>` de fontes (não é mais usada em lugar nenhum). Validado com screenshot real, aprovado por Henrique antes do commit (ponto de parada do plano).
- **Favicon** (`.ico` + `.svg`, este último de 843 KB → 48 KB), **`apple-touch-icon.png`**, **`manifest.json`** (criado do zero, confirmado que não existia), **`og-image.png`** (criado do zero — só existia um fallback quadrado usando o favicon).
- **Android/iOS**: assets gerados e deixados em `docs/visual/assets/android/` e `docs/visual/assets/ios/`, como staging (os diretórios nativos ainda não existem).
- **Splash Capacitor** (claro/escuro) gerados em `docs/visual/assets/splash/`.
- **Achado fora do escopo original, mesma família do achado da Fase 3:** `theme-color` e `mask-icon color` em `index.html` ainda eram o laranja antigo (`#F97316`) — atributos HTML crus, fora do alcance do `check-colors.sh`. Corrigidos para o roxo de marca.
- Nota técnica sobre o PNG-fonte não ser vetor de verdade permanece registrada, sem ação — ver relatório.

---

### Fase 8 — Tom de voz e microcopy · 3h · 🛑

1. Escrever `docs/visual/08-tom-de-voz.md` (uma página):
   - frases curtas, na segunda pessoa, calorosas;
   - sem jargão clínico para o paciente;
   - sem positividade forçada ("vai ficar tudo bem!");
   - nunca culpa, nunca cobrança;
   - na crise: frases ainda mais curtas, verbos no presente, uma instrução por vez.
2. **Confirmado na Fase 0: não foi encontrado texto de culpa/pressão** (metas, streaks, conquistas) — essa frente específica não tem incêndio para apagar. Ainda assim, fazer uma varredura de tom geral nas telas principais e montar uma tabela **texto atual → texto proposto → arquivo** onde houver oportunidade de deixar mais acolhedor (não só onde há "erro").
3. 🛑 Apresentar a tabela. Aplicar só após aprovação.
4. Atenção especial a: metas semanais, conquistas e sequências (streaks), mensagens de erro, tela de espera do SOS, mensagem quando ninguém atende, encerramento de chamada.

**Confirmado na Fase 0: 9 arquivos de teste comparam texto exato** (`chatModerationPanel.render.test.tsx`, `chatReadReceipts.render.test.tsx`, `consultationCallRouteAccess.test.tsx`, `firstTimeAvailabilityModal.test.tsx`, `goalSelectionModal.test.tsx`, `moodTrendChart.test.tsx`, `psychologistAvailabilityPage.test.tsx`, `statisticsEngagementCards.test.tsx`, `weeklyScheduleModal.test.tsx` — ver `docs/visual/00-inventario.md` §11). Ao mudar texto que algum deles verifica, ajustar o teste junto e mencionar no relatório.

---

### Fase 9 — Guia de marca · 1h30

`docs/visual/guia-de-marca.md`, curto e prático:

- paleta com tokens, hex e onde usar;
- **a regra do laranja**, em destaque;
- tipografia (wordmark e interface);
- ícone e wordmark: versões, tamanho mínimo, área de respiro, o que não fazer;
- resumo do tom de voz com 5 exemplos certos e errados;
- regras do mascote (se houver).

Esse documento serve para qualquer pessoa (ou Claude) que for mexer na interface depois.

---

### Fase 10 — Remover o mascote · 1h · não é mais 🛑

**Reformulada pela Fase 1: a decisão foi remover o mascote do app inteiro**, não introduzir um novo nem manter o existente. Escopo pequeno, sem necessidade de aprovação visual (não há nada novo para aprovar) — só limpeza.

O mascote (preguiça) hoje é `src/components/mascot/` (`Mascot.tsx`, `palette.ts`, `species/sloth/` com `SlothBase`, `SlothCelebrate`, `SlothHug`, `SlothSleep`, `SlothThinking`, `SlothWave`), em uso em 7 telas: `CompletionScreen.tsx` (respiração), `AchievementModal.tsx`, `SOS.tsx` (linha 287 — `<Mascot pose="hug">` na tela de espera da emergência, o achado que motivou a pergunta na Fase 1), `Achievements.tsx`, `Notifications.tsx`, `GuidedBreathing.tsx`, `Index.tsx`.

1. Remover o uso de `<Mascot .../>` nas 7 telas listadas — decidir tela a tela se o espaço fica vazio, se recebe outro elemento visual simples (ex.: um ícone), ou se o layout é ajustado para não depender da presença do mascote.
2. Remover `src/components/mascot/` do repositório (componente e todas as poses) depois de confirmar que nenhuma referência restou (`grep -rn "mascot" src --include=*.tsx --include=*.ts -i`).
3. Conferir os testes das 7 telas afetadas (cruzar com a lista de testes que dependem de texto da Fase 0, `docs/visual/00-inventario.md` §11) — nenhum deve depender da presença do mascote, mas confirmar antes de remover.
4. Resultado direto: a tela de espera do SOS (`SOS.tsx`) deixa de correr o risco descrito na Fase 6c ("sem mascote, sem nada que distraia") só por consequência desta fase — não precisa de nenhuma política de rotas proibidas, porque não existe mais mascote para aparecer em lugar nenhum.

---

### Fase 11 — Verificação final · 2h

```bash
npx tsc --noEmit
npx vitest run
npm run build          # [S1] ajustar se o bundler não for Vite
bash scripts/check-colors.sh
```

Depois:
- Playwright: screenshots das 10 telas principais em claro e escuro, em largura de celular (390px) → `docs/visual/screenshots/`.
- Checklist manual no aparelho Android:
  - [ ] SOS visível e na mesma posição em todas as telas do paciente
  - [ ] Nenhum laranja fora do SOS
  - [ ] Modo escuro sem textos invisíveis
  - [ ] Fonte do sistema no máximo não quebra o fluxo de SOS
  - [ ] Ícone correto na tela inicial, na lista de apps e na splash
  - [ ] CVV 188 tocável na tela de espera

Relatório final em `docs/visual/11-verificacao.md`.

---

## 5. Formato do relatório de cada fase

Ao fim de cada fase, responder com:

1. **O que foi feito** (3 a 6 linhas)
2. **Arquivos alterados** (lista)
3. **Diff de `EmergencyVideoCall.tsx`**, se tocado, separado
4. **Resultado de tsc / vitest / build / check-colors**
5. **O que ficou pendente ou em dúvida**
6. **Próxima fase**

---

## 6. Como começar

Colocar este arquivo em `docs/visual/plano.md` no repositório e abrir o Claude Code com:

> Leia `docs/visual/plano.md` inteiro. Execute somente a Fase 0, incluindo a validação das suposições S1 a S12 e a correção deste documento, e pare no ponto de parada.

---

## Correções da Fase 0

Feito em 2026-09-19. Relatório completo com evidências em `docs/visual/00-inventario.md`. Resumo do que mudou:

1. **Seção 2 (Fatos/Suposições):** as 12 suposições (S1-S12) foram todas resolvidas — 5 confirmadas como estavam (S1, S2, S3, S8, S12), 5 derrubadas (S4, S6, S9, S10, S11), 2 parcialmente (S5 — verdadeira mas muito maior do que suposto — e S7 — verdadeira e ainda pior, nem `manifest.json` existe). Todas movidas para a tabela de "Fatos".

2. **Achado mais importante, que muda o tamanho real do trabalho:** o laranja não é um detalhe isolado do SOS — é `--primary`, a cor padrão de botão/foco/sombra de **todo o app**. A regra 5 da seção 3 ("laranja é exclusivo do SOS") era escrita como se fosse migrar alguns componentes; na prática, ou o app troca sua cor de marca principal, ou a regra precisa ser reescrita. **Adicionada a pergunta 0 (nova, prioritária) na Fase 1**, com três caminhos possíveis. A Fase 2 e a Fase 3 ficam bloqueadas até essa resposta.

3. **Modo escuro já existe e funciona** (não estava ausente como a suposição original dizia) — só falta ligar `enableSystem` e trocar o toggle binário por um seletor de 3 estados. A Fase 4 encolheu para isso + revisão visual, como o próprio plano previa para esse cenário.

4. **Mascote já existe** (preguiça, 6 poses, em uso em 7 telas) — incluindo, hoje, dentro da tela de espera do SOS (`/sos`), o que viola o espírito da Fase 6c antes mesmo de a Fase 10 começar. A Fase 1 pergunta 5 e a Fase 10 inteira foram reformuladas: a pergunta não é mais "construir um mascote do zero", é "manter a preguiça (com política de rotas) ou trocar de espécie".

5. **Wordmark não é SVG** — é texto ao vivo com a fonte "El Messiri" carregada via Google Fonts, em 5 arquivos diferentes. O `Logo.tsx` até usa um `<svg>`, mas só para o ícone, e esse SVG embrulha uma imagem PNG em base64 (não é vetor de verdade). A Fase 7 item 4 foi atualizada para deixar isso explícito: é criação nova em ambas as frentes (ícone e wordmark), não um ajuste do que já existe.

6. **`manifest.json` não existe** (além de `android/`/`ios/`, que já eram suspeitos): a Fase 7 item 3 foi marcada como criação, não edição.

7. **Contraste:** medido diretamente dos valores HSL do código (não estimado). O achado mais sério: texto branco sobre o laranja `--primary` (o botão padrão de todo o app) reprova WCAG AA mesmo para texto grande (2,78:1, precisa de 3:1). Isso é hoje, em produção. Como a pergunta 0 da Fase 1 já vai mexer nessa cor de qualquer forma, a correção de contraste fica natural dentro dessa decisão — mas vale considerar adiantar só esse ponto específico antes da Fase 5 se o cronograma permitir, já que é uma falha de acessibilidade ativa.

8. **Nenhum texto de culpa/pressão encontrado** — a Fase 8 (item 2) foi ajustada para não presumir um problema que não existe; a revisão de tom continua valendo, só não há um "incêndio" de streak/culpa para apagar.

9. **9 testes comparam texto exato da interface** — listados explicitamente na Fase 6/Fase 8 em vez de ficarem como suposição.

10. **Rotas do fluxo de emergência**, confirmadas: `/sos`, `/emergency-call`, `/emergency-call/request/:requestId`, `/emergency-call/:sessionId`, `/emergency/call/:requestId` (legacy). Consulta agendada é rota separada (`/consultation-call/:appointmentId`) — usada em vários pontos do plano (Fase 6a, Fase 10) que antes diziam apenas "[S8]".

11. **Botão de SOS já é consistente por construção** (um único componente compartilhado) — a Fase 6a vira verificação visual, não correção de posição/tamanho.
