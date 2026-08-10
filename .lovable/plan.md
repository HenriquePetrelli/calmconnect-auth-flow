# Documentação viva: Visão Geral do Produto

Criar `docs/visao-geral-do-produto.md` com o resumo completo de funcionalidades e regras de negócio da Soliv, e manter esse arquivo atualizado automaticamente sempre que houver mudanças relevantes no app.

## O que será criado

`docs/visao-geral-do-produto.md`, organizado em seções:

1. Visão geral e stack (React + Vite + Supabase + Stripe)
2. Perfis e acesso — paciente, psicólogo (aprovação por CRP), admin; bloqueio administrativo
3. Fluxo SOS — fila, aceite atômico, WebRTC, timer compartilhado, reconexão, sinais de mídia/encerramento, heartbeat, timeouts server-side (cron), feedback e trace
4. Consultas agendadas — disponibilidade, aceite/recusa/reagendamento, expiração em 24h, janela de entrada de 50min
5. Modelo de negócio — planos Plus/Premium, limites de SOS, repasses e fechamento semanal
6. Funcionalidades clínicas e engajamento — humor, metas semanais, diário, conquistas, respiração guiada, sons, grupos de apoio, chat com retenção
7. Administração e manutenção — dashboard, métricas, rotinas de limpeza e retenção
8. Rodapé com data da última atualização e um resumo curto do que mudou

## Regra de manutenção contínua

- Toda vez que uma mudança alterar comportamento, regra de negócio, fluxo ou funcionalidade, o arquivo é atualizado na mesma tarefa (seção afetada + data de atualização).
- Mudanças puramente visuais/refatorações sem impacto em regra de negócio não exigem atualização.
- Essa regra será salva na memória do projeto para valer em todas as sessões futuras.

## Detalhes técnicos

- Antes de escrever, verificação das rotas em `src/App.tsx`, hooks de negócio (`src/hooks`), funções edge em `supabase/functions` e jobs de cron, para que o documento reflita o estado real do código e não apenas o histórico da conversa.
- Documento em português, sem emojis, com tabelas para limites/prazos (SOS por plano, timeouts, retenção).
