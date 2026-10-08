# 21. Rotinas automáticas (pg_cron)

> **Status:** Pronto.
> **Última verificação:** 2026-10-08 (nova rotina `chat-photos-cleanup`; antes, 2026-10-04: rotinas que chamam edge functions passaram a mandar o segredo `x-cron-secret`).
> **Quem usa:** ninguém diretamente; rodam sozinhas no banco.

## Lista

| Rotina | Quando | O que faz | Ficha |
|---|---|---|---|
| `finalize-stale-emergency-sessions` | A cada minuto | Expira SOS sem aceite (10 min), encerra por tempo esgotado e por abandono (10 min sem sinal) | 02 |
| `notification-push` | A cada minuto | Envia os pushes pendentes | 07 |
| `prune-stale-psychologist-presence` | A cada 2 min | Tira do "online" o psicólogo sem sinal recente | 02 |
| `appointment-reminders` | A cada 10 min | Lembretes de consulta (24 h e 1 h) | 04 |
| `expire-cancelled-subscriptions` | De hora em hora (minuto 7) | Plano do Stripe cancelado cujo período pago acabou vira plano grátis, mesmo sem o aviso do Stripe | 08 |
| `finalize-stale-appointments` | A cada 10 min | Fecha consultas vencidas: concluída se conectou, "não realizada" e devolução da cota se não | 04 |
| `habit-reminders` | A cada 15 min | Lembretes de hábitos por push | 11 |
| `auto-decline-expired-appointments` | De hora em hora | Expira pedidos de consulta sem resposta | 04 |
| `sos-followups` | De hora em hora (min 17) | Mensagem de cuidado cerca de 24 h depois do SOS | 02 |
| `psychologist-cleanup-daily` | Todo dia, 3h | Apaga cadastros de psicólogo recusados | 19 |
| `expire-organization-entitlements` | Todo dia, 3h05 | Tira o acesso de contratos de empresa vencidos | 10 |
| `expire-old-conversas` | Todo dia, 3h30 | Chat: somente leitura com 1 mês, apaga com 3 meses | 06 |
| `purge-expired-care-records` | Todo dia, 3h30 | Apaga do arquivo legal o que passou de 5 anos | 18 |
| `chat-photos-cleanup` | Todo dia, 4h40 | Chat: apaga do storage as fotos de conversas que já foram apagadas (função `chat-cleanup`) | 06 |
| `reset-weekly-goals-monday` | Segunda, 4h | Reinicia as metas da semana | 12 |
| `weekly-payment-sync` | Segunda, 9h | Atualiza os valores de repasse | 09 |
| `cleanup-quarterly-activities-weekly` | Domingo, 3h15 | Apaga atividades com mais de 3 meses do histórico | 12 |

Os horários estão em UTC, que é como o pg_cron agenda: 3h UTC é meia-noite em Brasília. A tabela `cron.job` é a fonte da verdade, porque horários podem ter sido ajustados direto no banco.

## Como funcionam

- Algumas rodam **SQL direto** (ex.: `select public.finalize_stale_appointments()`).
- Outras chamam uma **edge function** por `net.http_post`. Essas mandam o cabeçalho `x-cron-secret`, lido na hora de `internal_secrets`. A função só aceita a chamada com esse segredo (ou com a service role), então ninguém de fora consegue disparar.
- Todas são **idempotentes**: rodar duas vezes não manda aviso duplicado nem conta em dobro.

## Como validar

```sql
-- Rotinas cadastradas e ativas
select jobname, schedule, active from cron.job order by jobname;

-- Últimas execuções com erro
select j.jobname, d.status, d.start_time, d.return_message
from cron.job_run_details d join cron.job j on j.jobid = d.jobid
where d.status <> 'succeeded'
order by d.start_time desc limit 20;

-- Últimas execuções de uma rotina
select status, start_time, return_message from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'finalize-stale-appointments')
order by start_time desc limit 5;

-- As que chamam edge function mandam o segredo? (deve dar 0)
select count(*) from cron.job where command like '%/functions/v1/%' and command not like '%x-cron-secret%';
```

Para rotinas que chamam edge function, um `succeeded` no cron quer dizer só que o pedido saiu. Para ver se a função aceitou (status 200 e não 401), consulte os logs da edge function no Supabase (Edge Functions → nome → Logs) ou `select * from net._http_response order by created desc limit 20;`.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Função responde 401 para a rotina | Rotina sem o cabeçalho, ou segredo trocado sem esperar 5 min | `cron.job.command` contém `x-cron-secret`; `internal_secrets` |
| Lembretes ou pushes pararam | Rotina inativa ou com erro | `cron.job.active`; `cron.job_run_details` |
| Consultas presas "Em andamento" | `finalize-stale-appointments` sem rodar | Últimas execuções dela |
