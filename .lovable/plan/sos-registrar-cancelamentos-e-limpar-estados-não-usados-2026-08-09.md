# SOS: registrar cancelamentos e limpar estados não usados

Duas correções na máquina de estados das solicitações de emergência.

## 1. Cancelamento vira histórico (em vez de apagar)

Hoje, quando o paciente cancela antes de um psicólogo aceitar, a linha em `emergency_requests` é **deletada** — some qualquer rastro de SOS não atendidos.

Novo comportamento:
- Cancelar passa a marcar a solicitação como `cancelled`, gravando `ended_at`, `ended_by` (o próprio paciente), `ended_by_type = 'patient'` e `end_reason` (`'cancelled_by_patient'` quando o paciente clica em Cancelar, `'abandoned'` quando ele apenas sai da tela de espera).
- A limpeza automática do servidor passa a marcar como `cancelled` com `end_reason = 'expired'` em vez de deletar, para solicitações que ficaram paradas sem aceite.
- Todas as consultas de solicitações "abertas" passam a ignorar `cancelled`, então o paciente pode abrir um novo SOS normalmente e o psicólogo não vê solicitações canceladas na lista.

## 2. Limpeza dos estados não usados

Os estados `waiting` e `rejected` aparecem em filtros mas nunca são gravados por nada no sistema. Vão ser removidos dos filtros, deixando a máquina de estados explícita:

```text
pending ──aceite──> accepted ──1º join──> in_progress ──encerramento──> completed
   │
   └──cancelamento / expiração──> cancelled
```

## Detalhes técnicos

Arquivos afetados:
- `src/hooks/useEmergencySOS.ts` — `cancelRequest(requestId, reason)` troca o `delete()` por `update()` com `status='cancelled'`, `ended_at`, `ended_by`, `ended_by_type`, `end_reason`; remove `'waiting'`/`'rejected'` do tipo `EmergencyRequest['status']`.
- `src/pages/SOS.tsx` — o cancelamento manual envia `'cancelled_by_patient'`, o cleanup de unmount envia `'abandoned'`; consulta de solicitação recente filtra só `pending`.
- `src/lib/emergencyCallGuard.ts` — `OPEN_REQUEST_STATUSES` passa a ser `['pending', 'accepted', 'in_progress']`.
- `supabase/functions/emergency-sos/index.ts` — checagem de solicitação existente usa só `pending`.
- `supabase/functions/psychologist-emergency/index.ts` — listagem (GET) filtra só `pending`.
- `supabase/functions/emergency-cleanup/index.ts` — troca o `DELETE` por `UPDATE ... SET status='cancelled', end_reason='expired'`.

Banco de dados:
- Verificar/ajustar a política de escrita em `emergency_requests` para que o paciente consiga marcar a própria solicitação como cancelada (hoje o fluxo dependia da permissão de exclusão). Se a política de atualização atual já cobrir o paciente dono da linha, nenhuma migração é necessária.

Testes:
- Ajustar/adicionar caso em `src/test/emergencySosFlow.e2e.test.ts` cobrindo: cancelar deixa a linha com `status='cancelled'`, a solicitação cancelada não aparece para o psicólogo, e um novo SOS pode ser criado logo em seguida.
