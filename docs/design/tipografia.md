# Tipografia do Soliv

Tamanhos de fonte por **papel** do texto. Ao criar uma tela, escolha o papel e use a classe da tabela, sem inventar tamanhos novos.

| Papel | Classe (Tailwind) | Tamanho | Exemplos |
|---|---|---|---|
| Título da barra superior | `text-base sm:text-lg font-semibold` | 16–18 px | `PageHeader` |
| Título principal de tela sem barra | `text-2xl font-semibold` | 24 px | login, cadastro, sessão concluída, documentos legais |
| Título de tela de estado | `text-xl font-semibold` | 20 px | assinatura ativada/cancelada, erro na chamada, "Buscando profissional" |
| Título de seção | `text-lg font-semibold` | 18 px | "Técnicas de respiração", "Playlists", painéis do admin, títulos de janela (`DialogTitle`) |
| Título de cartão ou bloco | `text-base font-semibold` | 16 px | `CardTitle` (padrão), `ExpandableCard`, "Últimos 7 dias" |
| Texto | `text-sm` | 14 px | a maior parte do app |
| Leitura longa | `text-base` | 16 px | Termos, Política, plano de segurança aberto |
| Apoio e legenda | `text-xs` | 12 px | datas, dicas abaixo de campos, rótulos de números |
| Sobretítulo | `text-xs font-semibold uppercase tracking-wide` | 12 px | "Hábitos do dia", "Identificação" |
| Números em destaque | `text-2xl` a `text-5xl font-bold tabular-nums` | 24–48 px | contador de dias, valores, cronômetro |

## Regras

- **Nada abaixo de 12 px** (`text-xs`). Tamanhos como `text-[10px]` e `text-[11px]` ficam ilegíveis no celular. Isso vale até para contadores em bolinha e selos.
- **Campos de digitação com 16 px no celular** (`text-base md:text-sm`). Com menos que isso, o iPhone dá zoom na tela ao tocar no campo. `Input` e `Textarea` já vêm assim.
- **Títulos em `font-semibold`.** `font-bold` fica para números em destaque.
- **Um tamanho por papel.** Evite subir de tamanho em telas maiores (`sm:text-xl`) só nos títulos: o app é usado sobretudo no celular, e a hierarquia deve ser a mesma em qualquer tela.
- Telas de chamada de vídeo e a respiração guiada são imersivas e podem usar tamanhos maiores para leitura à distância.
