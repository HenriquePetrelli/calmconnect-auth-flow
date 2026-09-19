# Fase 4 — Modo escuro

Feito em 2026-09-19. Como o próprio plano previa (o modo escuro já existia e funcionava desde antes — achado da Fase 0), esta fase foi revisão + 2 ajustes pontuais, não construção do zero.

## 1. `enableSystem` ligado

`src/App.tsx` — `ThemeProvider`:
- `enableSystem={false}` → `enableSystem` (true)
- `defaultTheme="light"` → `defaultTheme="system"`, conforme o padrão pedido pelo plano ("seguir o sistema").

## 2. Seletor de 3 estados

`src/components/ThemeToggle.tsx` reescrito: era um `Switch` binário (claro/escuro), virou um `Select` (shadcn) com três opções — Claro / Escuro / Sistema, cada uma com ícone (`Sun`/`Moon`/`Monitor`). Usado nos dois lugares que já existiam (`Profile.tsx`, `PsychologistProfile.tsx`) sem precisar mudar os imports — só o texto de descrição ao lado, que dizia "Alternar entre modo claro e escuro" e agora diz "Claro, escuro ou seguir o sistema" (e em `PsychologistProfile.tsx`, o rótulo "Modo escuro" virou "Tema do aplicativo", já que agora não é mais binário). Nenhum teste referenciava esse texto ou o componente — confirmado antes de trocar.

## 3. Fundo escuro — verificado, sem mudança necessária

O plano sugeria algo como `#121018` (bem puxado pro preto) como exemplo de "não preto puro". O `--background` atual do `.dark` (`258 22% 18%` = `#2a2438`) já não é preto puro e já é puxado para o roxo — é um pouco mais claro que o exemplo do plano, mas isso já existia antes desta fase (não foi apontado como problema na Fase 0) e as capturas de tela abaixo mostram que o resultado é confortável, sem constraste agressivo. Não alterado.

## 4. Verificação visual (com telas reais, não só leitura de código)

Sem credenciais de teste disponíveis nesta sessão, então a verificação cobriu o que dá para alcançar sem login — que por acaso é exatamente onde os dois achados mais importantes da Fase 3 (wordmark e título "Login") ficam visíveis. Rodei o dev server localmente e tirei screenshots reais via Playwright/Chromium, com `colorScheme: 'dark'` no browser (o mesmo sinal que o `enableSystem` do next-themes lê):

- **Login** (`/`) — confirmado: `<html>` recebe a classe `dark` corretamente quando o SO está em modo escuro; título "Login" em roxo legível; fundo escuro sem parecer preto puro; botão "Entrar" com bom contraste.
- **Escolha de cadastro** (`/signup-type`) — confirmado: wordmark "soliv" em roxo, nítido sobre o fundo escuro (valida diretamente o fix da Fase 3 — antes desse fix, `text-secondary` teria ficado incorreto assim que `--secondary` virasse neutro).

**Não verificado visualmente nesta sessão** (fica pendente, ver §5): as telas prioritárias que exigem login — fluxo de SOS, home do paciente, diário, plano de segurança, consultas. Risco avaliado como baixo com base em leitura de código: a cobertura por tokens semânticos já é ampla (achado da Fase 0: só 10/232 componentes usam `dark:` manualmente, o resto herda dos tokens `.dark` que já existem e são completos), e os poucos lugares com cor crua fora de token que sobreviveram à Fase 3 (ex. `HomeContent.tsx`) já tinham tratamento explícito `isDark ? ... : ...` no próprio código, ou seja, dark mode já era uma preocupação ativa de quem escreveu esses trechos.

## 5. Pendência explícita

Verificação visual real (não só leitura de código) das telas que exigem login — SOS, home, diário, plano de segurança, consultas — em modo escuro, num dispositivo ou com credenciais de teste. O próprio plano já previa esse tipo de checagem como item manual da Fase 11 ("checklist manual no aparelho Android"); registro aqui a mesma necessidade adiantada para o modo escuro especificamente, já que a Fase 4 pede revisão visual e eu só consegui cobrir uma fatia (as telas sem autenticação). Se o Henrique quiser, dá pra fechar isso agora criando um usuário de teste, ou fica para quando o app for testado no aparelho.

## 6. Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes, não relacionadas)
- `npm run build`: sucesso
- Screenshots reais via Playwright (login e signup-type, light+dark) — ver §4

## 7. Arquivos alterados

`src/App.tsx`, `src/components/ThemeToggle.tsx`, `src/pages/Profile.tsx`, `src/pages/PsychologistProfile.tsx`.
