# 09. Repasses aos psicólogos

> **Status:** Pronto, com decisão pendente (SOS atendidos antes de 2026-10-04).
> **Última verificação:** 2026-10-04 (contagem do SOS e livro de itens sem duplicidade).
> **Quem usa:** admin (paga) e psicólogo (acompanha).

## Resumo

Cada atendimento realizado vira um item a pagar ao psicólogo:

| Atendimento | Valor | Quando entra |
|---|---|---|
| Consulta agendada | R$ 90,00 | Status `completed`, ou seja, a chamada conectou |
| SOS | R$ 50,00 | Status `completed` |

O admin paga por PIX fora do app e registra no painel com o **código E2E do PIX**. O psicólogo vê o pendente, o pago e os comprovantes.

## Telas

| Rota | Quem | Tela |
|---|---|---|
| `/admin-dashboard` → Repasses | Admin | Lista de psicólogos com valor pendente, "Sincronizar", "Confirmar pagamento" |
| `/psychologist-payments` | Psicólogo | Pendente, pago e "Repasses recebidos" (com E2E e comprovante) |

## Como funciona

1. **Contagem** (`sync_psychologist_payments`): cada consulta ou SOS concluído entra **uma única vez** num livro de itens (`payout_items`, chave única por origem), e o valor pendente é somado a partir dele. Rodar várias vezes não duplica.
2. **Quando roda**: toda segunda às 9h (rotina `weekly-payment-sync`, que chama a edge function `payment-sync`) e quando o admin toca em "Sincronizar".
3. **Pagar**: o admin faz o PIX e, no painel, toca em "Confirmar". Informa o **E2E** (32 caracteres, obrigatório) e, se quiser, o comprovante (imagem ou PDF até 5 MB).
4. **Confirmar** (`confirm-payment`): só confirma se o valor pendente ainda for o que o admin viu. Assim, dois cliques ou duas abas não pagam duas vezes, e atendimentos novos no meio do caminho não entram sem ser vistos. E2E já usado é recusado.
5. **Psicólogo** vê em "Repasses recebidos" o E2E para conferir no extrato e o comprovante (link temporário).
6. **Consulta interrompida** (ficha 04): se o psicólogo marcar antes de entrar num repasse pago, ela sai da contagem. Depois de paga, só pelo suporte.

## Regras

- Só admin confirma pagamento. O psicólogo só lê os próprios dados.
- O CPF e a chave Pix do psicólogo não são visíveis para outros usuários (ficha 20).
- SOS que o paciente redirecionou para outro psicólogo (`psychologist_unavailable`) **não** entra no repasse.

## Onde está no código

- **Telas e componentes**: `src/pages/PsychologistPayments.tsx`; em `src/components/payments/`: `PaymentsPanel`, `ConfirmPayoutDialog`, `PaymentDetailsModal`, `PayoutHistory`.
- **Hooks**: `usePayments`.
- **Edge functions**: `payment-sync` (admin ou rotina agendada), `confirm-payment`.
- **Banco**: `payout_items`, `psychologist_payments`, `payment_logs`; bucket `payment-receipts`. Função: `sync_psychologist_payments`.

## Como validar

### Teste manual
1. Concluir uma consulta (com chamada conectada) e um SOS com o mesmo psicólogo.
2. Admin → Repasses → "Sincronizar" → o psicólogo aparece com R$ 140,00 pendentes.
3. "Sincronizar" de novo → continua R$ 140,00 (não duplica).
4. "Confirmar" com E2E de 32 caracteres → o pendente zera; o psicólogo vê em "Repasses recebidos".
5. Tentar confirmar de novo com o mesmo E2E → recusado.

### Testes automáticos
`confirmPayoutDialog`.

### Conferência no banco
```sql
-- Itens de um psicólogo
select source_type, amount, occurred_at, counted_at, backfilled
from payout_items where psychologist_user_id = '<id>' order by occurred_at desc;

-- Totais
select name, total_pending_amount, total_paid_amount, scheduled_pending_count, emergency_pending_count
from psychologist_payments order by total_pending_amount desc;

-- Pagamentos registrados
select created_at, amount_paid, scheduled_count, emergency_count, details from payment_logs
where psychologist_id = '<id>' order by created_at desc;
```

## Pendências

- **SOS atendidos antes de 2026-10-04** (pendência 4): nunca foram pagos (a contagem antiga ignorava o SOS). Estão no livro com `backfilled = true` e **não** somam ao pendente. Falta decidir se serão pagos. A consulta do total está no doc de pendências.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Consulta feita não aparece no repasse | Chamada não conectou (virou `no_show`) ou a sincronização ainda não rodou | Status da consulta; "Sincronizar" |
| Valor dobrado | Não deve acontecer (chave única no livro) | `payout_items` com o mesmo `source_id` |
| "O valor pendente mudou" ao confirmar | Entrou atendimento novo depois que o admin abriu a tela | Esperado; reabrir e conferir |
| Rotina semanal não roda | Rotina sem o cabeçalho do segredo | `cron.job_run_details` do `weekly-payment-sync` (ficha 21) |
