# Fase 7 — Wordmark, splash e assets

Feito em 2026-09-19. Reformulada pela Fase 1 (logo mantido, sem ícone novo) — a fase virou reaproveitar o logo atual nos formatos que faltam, e resolver o wordmark.

## 1. Wordmark "soliv" — texto ao vivo virou SVG

**Como foi feito:** baixei a fonte El Messiri Bold (peso 700 — o único de fato carregado hoje; `font-black`/900 pedido no CSS nunca existiu no Google Fonts para essa família, então o navegador já estava aproximando para 700) e converti a palavra "soliv" em path SVG usando `opentype.js`. Criado `src/components/Wordmark.tsx`, um componente React com `fill="currentColor"` — herda a cor do elemento pai (`text-primary`, `text-white`, etc.), então funciona em claro/escuro sem precisar de dois arquivos.

**Os 5 arquivos atualizados** (achado original da Fase 0): `MainLayout.tsx` (×2 — mobile e desktop, incluindo o spacer invisível que balanceia o header desktop), `SplashScreen.tsx`, `SignupType.tsx` (mantido como `<h1>` com `aria-label="soliv"` para acessibilidade), `PsychologistDashboard.tsx`. Removida a dependência de `fontFamily: 'El Messiri'` nos 5 lugares — **o nome do app não depende mais de a fonte carregar em runtime.**

**Validado com screenshot real** (claro e escuro, `/signup-type`) — resultado visualmente idêntico ao anterior, nítido em qualquer tamanho.

**Bônus:** como El Messiri não é mais usada em lugar nenhum (confirmado por busca no código), removida do `<link>` do Google Fonts em `index.html` — menos uma requisição de rede no carregamento do app.

## 2. Ícones e assets gerados

A partir do PNG de maior resolução embutido no `soliv-logo.svg` atual (982×864, o que existe — não há um vetor de verdade, achado já registrado na Fase 0):

| Assets | Onde ficou |
|---|---|
| Favicon (`.ico` 16/32/48 + `.svg` enxuto) | `public/favicon.ico`, `public/favicon.svg` (**843 KB → 48 KB**, era o PNG antigo embrulhado sem compressão) |
| `apple-touch-icon.png` (180×180, fundo branco opaco) | `public/apple-touch-icon.png` |
| `manifest.json` (192, 512, + maskable 192/512) | `public/manifest.json` — **criado do zero**, confirmado na Fase 0 que não existia |
| `og:image` (1200×630, logo + wordmark) | `public/og-image.png` — **criado do zero**; a Fase 0 não tinha localizado nenhum, e de fato só existia um fallback usando o favicon (quadrado, ruim para redes sociais) |
| Ícone adaptativo Android (foreground + background separados) + `mipmap-*` (mdpi→xxxhdpi) + ícone da Play Store | `docs/visual/assets/android/` — **staging**, `android/` não existe ainda (confirmado na Fase 0) |
| `AppIcon` iOS (11 tamanhos, de 20px a 1024px, fundo branco opaco) | `docs/visual/assets/ios/` — **staging**, `ios/` não existe ainda |
| Splash Capacitor claro/escuro (2732×2732) | `docs/visual/assets/splash/` — **staging**, sem projeto nativo pra receber ainda |
| `assets/logo.png` | fonte quadrada (1200×1200, ~80% de conteúdo) na raiz do projeto — convenção do `@capacitor/assets`, fica pronta para regenerar tudo automaticamente quando os projetos nativos existirem |

**Correção encontrada fora do escopo original, mas do mesmo tipo de achado da Fase 3 (laranja fora do lugar):** `theme-color` e `mask-icon color` em `index.html` ainda eram `#F97316` (o laranja antigo) — a cor da barra de status do navegador/PWA e do ícone fixado no Safari. Como são atributos HTML crus, não classes Tailwind, o `check-colors.sh` da Fase 3 não olha esse arquivo. Corrigidos para `#7C3BED` (o novo roxo de marca).

**Maskable icons:** gerados com o logo em ~60% do canvas sobre fundo roxo sólido (zona de segurança maior que os ícones "any", que usam ~82% — os primeiros podem ser recortados em círculo/squircle pelo Android/PWA, os segundos não).

**Nota técnica registrada, sem ação nesta fase (como o plano previa):** o PNG-fonte ainda não é um vetor de verdade. Ficou nítido até 512px; em tamanhos maiores (1024px do ícone da App Store, por exemplo) a qualidade já mostra alguma perda perceptível de nitidez nas bordas. Vetorizar o logo de verdade continua sendo uma tarefa à parte, com aprovação sua antes, se algum dia incomodar visualmente.

## Resultado da validação

- `npx tsc --noEmit`: limpo
- `npx vitest run`: 265/268 (mesmas 3 falhas pré-existentes)
- `npm run build`: sucesso — confirmado que `manifest.json`, ícones, favicon e `og-image.png` saem corretos em `dist/`
- Wordmark validado com screenshot real (claro/escuro)
- `manifest.json` e `favicon.ico` confirmados servindo com HTTP 200 no dev server

## Arquivos alterados/criados

**Código:** `src/components/Wordmark.tsx` (novo), `src/components/MainLayout.tsx`, `src/components/SplashScreen.tsx`, `src/pages/SignupType.tsx`, `src/pages/PsychologistDashboard.tsx`, `index.html`.

**Assets:** `public/favicon.ico`, `public/favicon.svg` (substituído), `public/apple-touch-icon.png`, `public/manifest.json` (novo), `public/og-image.png` (novo), `public/icons/*.png` (novo), `assets/logo.png` (novo), `docs/visual/assets/android/**`, `docs/visual/assets/ios/**`, `docs/visual/assets/splash/**`.
