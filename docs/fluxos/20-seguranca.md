# 20. Segurança: proteções que valem para o app inteiro

> **Status:** Pronto, com pendência externa (ajustes de senha no painel do Supabase e senha do admin).
> **Última verificação:** 2026-10-04 (varredura de segurança completa; migrações `20261003210511_…` e `20261004220000_storage_upload_limits.sql`).
> **Quem usa:** todos (proteção invisível).

## Princípio

**O banco é a última palavra.** A tela pode esconder um botão, mas a regra vale de verdade no Postgres (RLS, gatilhos, funções) ou na edge function. Qualquer pessoa pode chamar a API do Supabase direto com a chave pública que está no app, então nenhuma regra pode depender só da tela.

## Proteções e como validar cada uma

| Ameaça | Proteção | Como validar |
|---|---|---|
| Ver dados de outra pessoa | RLS em todas as tabelas | Como paciente A, `select` em tabela de B pela API → 0 linhas |
| Dados pessoais do psicólogo (CPF, Pix, e-mail, documentos) | Leitura por coluna bloqueada; o próprio lê por `get_my_psychologist_private` | `has_column_privilege('authenticated','public.psychologists','cpf','select')` = `false` |
| Virar Premium sem pagar | Gatilho `a_guard_subscriber_client_write`; sem política de inserção para o usuário | Paciente tenta gravar em `subscribers` → recusado ou ignorado |
| Psicólogo se aprovar ou se desbloquear | Gatilho `a_guard_psychologist_client_write` (também trava CRP e CPF já aprovados) | Update em `approved` pela API → valor não muda |
| Paciente se desbloquear | Gatilho `a_guard_patient_client_write` | Idem em `patients.is_blocked` |
| Pessoa não aprovada acessando a fila do SOS | Políticas exigem `psychologist_can_attend` | Conta "psicólogo" pendente → `select` em `emergency_requests` → 0 linhas |
| Gravar dados em nome de outro (funções com ID) | Funções conferem quem chama (`assert_caller_is`); originais viraram `*_unchecked`, só para o servidor | Chamar `add_patient_activity` com ID de outro → "Acesso negado" |
| Disparar rotinas automáticas | Cabeçalho `x-cron-secret` com segredo guardado no banco (`internal_secrets`) ou service role | Chamar `/functions/v1/auto-decline-appointments` com a chave pública → 401 |
| Esgotar o limite de outra pessoa | `check_rate_limit` só no servidor | `has_function_privilege('authenticated','public.check_rate_limit(text,int,int)','execute')` = `false` |
| Repetição e força bruta | Limites por pessoa: SOS 5/10 min, agendamento 10/h, suporte 3/h, chat 30/min, depoimentos 5/h, curtidas 60/min, avaliações 10/h, conversas 10/h, relatos 5/h, códigos de empresa 20/15 min | Exceder → "Muitas ações em pouco tempo" |
| Clique duplo | No app, escritas idênticas em andamento viram uma só requisição (`src/lib/requestDedupe.ts`) | Duplo clique em "Agendar" → uma só consulta |
| SQL injection | Consultas sempre parametrizadas; SQL dinâmico só em migrações, com identificadores escapados | Revisão de código (sem teste manual) |
| XSS (script injetado) | O React escapa todo texto; não há HTML cru com dado do usuário; **CSP** no app publicado bloqueia script de fora | No app publicado, `index.html` tem `Content-Security-Policy` |
| HTML injetado em e-mail | `escapeHtml` nos e-mails de suporte | Ficha 17 |
| Arquivo malicioso ou enorme | Buckets aceitam só imagem e PDF, até 10 MB; buckets privados com links assinados | Subir `.html` ou arquivo de 20 MB → recusado |
| Redirecionamento para site falso | Links de notificação só aceitam caminho do próprio app (`/...`, nunca `//site`) | Ficha 07 |
| Tipo de conta falsificado | Admin e psicólogo vêm do banco, não de `user_metadata` | Ficha 01 |
| Cancelar o SOS de outra pessoa | `emergency-cleanup` exige o login do próprio paciente | Chamada sem token → 401 |
| Senha fraca | 8+ caracteres com letras e números no app | Ficha 01 |
| Reabrir atendimento encerrado | Gatilho `prevent_reopen_finished_call` | Ficha 03 |
| Prompt injection | O app não usa IA | Não se aplica |
| Webhook falso do Stripe | Assinatura conferida com `STRIPE_WEBHOOK_SECRET` | Ficha 08 |
| TURN usado por estranhos (custo) | `ice-servers` só entrega TURN a usuário logado | Chamada sem login → resposta sem TURN |

## Conferência rápida no banco (tudo deve dar `true`)

```sql
select
  to_regclass('public.internal_secrets') is not null as segredo_rotinas,
  (select count(*) from cron.job where command like '%/functions/v1/%' and command not like '%x-cron-secret%') = 0 as rotinas_com_segredo,
  not has_function_privilege('authenticated', 'public.check_rate_limit(text,int,int)', 'execute') as limite_so_servidor,
  exists(select 1 from pg_trigger where tgname = 'a_guard_subscriber_client_write') as assinatura_protegida,
  exists(select 1 from pg_trigger where tgname = 'a_guard_psychologist_client_write') as aprovacao_protegida,
  exists(select 1 from pg_trigger where tgname = 'a_guard_patient_client_write') as bloqueio_protegido,
  not has_column_privilege('authenticated', 'public.psychologists', 'cpf', 'select') as cpf_oculto,
  exists(select 1 from pg_trigger where tgname = 'rate_limit_mensagens') as limite_chat,
  (select bool_and(file_size_limit = 10485760 and allowed_mime_types is not null) from storage.buckets
     where id in ('documents', 'psychologist-documents', 'payment-receipts')) as uploads_limitados;
```

## Onde está no código

- **Edge functions**: `supabase/functions/_shared/guards.ts` (`isTrustedCaller`, `withinRateLimit`, `escapeHtml`, `isValidEmail`, `isBoundedText`, `safeEqual`).
- **App**: `src/lib/requestDedupe.ts`, `installRequestDedupe.ts`, `contentSecurityPolicy.ts` (CSP aplicada pelo `vite.config.ts` só no build), `password.ts`, `src/contexts/AuthContext.tsx`.
- **Banco**: migrações de segurança `20261003210511_25be134c-….sql` e `20261004220000_storage_upload_limits.sql`.

## Pendências

- **Senha do admin exposta** numa migração antiga (pendência 1).
- **Painel do Supabase** (pendência 6): senha mínima 8, "Leaked password protection", "Confirm email" e verificação em duas etapas para admin.
- **Achados pequenos registrados nas fichas**: pontuação de questionário editável pelo próprio paciente (ficha 13); curtidas dos grupos expõem quem curtiu e contadores editáveis pelo autor (ficha 16).
- **Sem cabeçalhos de hospedagem** como `X-Frame-Options`: a Lovable não permite configurar. A CSP no HTML cobre scripts, mas não impede o app de ser exibido dentro de outro site.

## Como reagir a um incidente

1. **Chave vazada** (service role, Stripe, Firebase): gere uma nova no painel do serviço e troque o secret nas edge functions.
2. **Segredo das rotinas**: troque o valor com `update internal_secrets set value = '<novo valor aleatório>' where name = 'cron_secret';`. As rotinas leem na hora e as funções guardam o valor por até 5 minutos.
3. **Conta comprometida**: bloqueie pelo painel do admin e, em Authentication → Users, force a saída de todos os aparelhos.
4. **Investigar**: consulte `admin_audit_log`, `security_audit_log`, `sos_trace_events` e os logs das edge functions no Supabase.
