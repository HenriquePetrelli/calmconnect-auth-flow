# 08. Assinaturas e pagamentos (Stripe)

> **Status:** Pronto, com pendência externa (confirmar que o webhook do Stripe está cadastrado).
> **Última verificação:** 2026-10-06 (varredura: cliente do Stripe nunca de outra conta pelo e-mail, prévia da troca de plano sem data manipulada, checkout sem duplicar). Antes: 2026-10-02 (revisão de ponta a ponta comparada com Calm, Headspace e Spotify). Em 2026-10-04, o gatilho de proteção de `subscribers` impede o paciente de gravar o próprio plano, e o `check-subscription` deixou de regravar o uso do mês (corrida que devolvia SOS ou consulta já usados).
> **Quem usa:** paciente.

## Resumo

| Plano | Preço | SOS por mês | Consultas por mês | Duração do SOS |
|---|---|---|---|---|
| Sem plano | R$ 0 | 0 | 0 | — |
| Plus | R$ 69,90 | 1 | 0 | 25 min |
| Premium | R$ 120,00 | 1 | 1 | 50 min |

O pagamento é pelo **Stripe Checkout**. O estado da assinatura fica em `subscribers` e é atualizado pelo **webhook** do Stripe (na hora) e pelo `check-subscription` (quando o app abre). O plano da **empresa** (ficha 10) entra no mesmo lugar e vale o maior dos dois.

## Telas

| Rota | Tela |
|---|---|
| `/subscription-plans` | Planos: assinar, trocar, cancelar, código da empresa |
| `/subscription-success`, `/subscription-cancel` | Volta do checkout |
| `/profile` | Plano atual, aviso de cartão recusado |

## Como funciona

1. **Assinar**: o app manda só o nome do plano (`plus` ou `premium`). O preço é resolvido no servidor (`create-checkout`, secrets `STRIPE_PRICE_PLUS` e `STRIPE_PRICE_PREMIUM`). Quem já assina não abre um segundo checkout.
2. **Checkout** em português, com campo de cupom e na mesma aba. A tela de sucesso **espera a confirmação do servidor** antes de dizer "ativada".
3. **Webhook** (`stripe-webhook`, assinatura conferida com `STRIPE_WEBHOOK_SECRET`): a cada evento, sincroniza o cliente inteiro direto do Stripe, então eventos fora de ordem não deixam estado errado.
4. **Trocar de plano** (`manage-subscription`, na mesma assinatura):
   - **subir** cobra só a diferença proporcional na hora, com prévia do valor; se o cartão recusar, nada muda. A data da prévia só vale se for dos últimos 15 minutos (senão o servidor usa a hora atual), para ninguém mandar uma data no fim do período e pagar quase nada;
   - **descer** vale na renovação, sem cobrança agora, e pode ser desfeito.
5. **Cancelar** (`cancel-subscription`): o plano continua até o fim do período pago (o ciclo mensal do Stripe: pago em 15/03, vale até 15/04) e não renova, com "Manter minha assinatura" para desfazer. Enquanto isso, Perfil e Planos mostram **"Plano cancelado - Plus disponível até 15/04/2026"**. No fim do período, o plano vira **Plano Grátis**: o Stripe avisa pelo webhook, e a rotina `expire-cancelled-subscriptions` (de hora em hora) encerra o plano mesmo se o aviso não chegar; com o app aberto, a tela troca sozinha na hora certa. A marca fica em `subscribers.cancel_at_period_end`, que "Manter minha assinatura" ou trocar de plano apagam na hora (migration `20261004011237_e99053e5-8384-4774-a0dc-dcb73255c4ab.sql`). **Em até 7 dias da primeira assinatura** (direito de arrependimento), acaba na hora e o valor é devolvido automaticamente.
6. **Cartão recusado na renovação** (`past_due`): o plano continua enquanto o Stripe tenta de novo, e o app pede para atualizar o cartão (portal do Stripe, `customer-portal`).
7. **Ao abrir o app**, o plano aparece na hora a partir da última consulta da sessão, e o `check-subscription` confere com o Stripe em segundo plano.

## Regras

- **O usuário não grava o próprio plano.** `subscribers` só muda por edge function (service role) ou gatilho do banco; o gatilho `a_guard_subscriber_client_write` ignora qualquer tentativa vinda do app.
- Cotas do mês contam no horário de Brasília e voltam no 1º dia do mês.
- **SOS**: marcado como usado quando a chamada começa e devolvido se a chamada cair, o psicólogo sumir ou o atendimento terminar sem a chamada conectar.
- **Consulta**: reservada no pedido (numa operação só, sem brecha para dois pedidos ao mesmo tempo) e devolvida se for recusada, expirada, cancelada com antecedência, interrompida ou não realizada. Só devolve a cota do mês em que a consulta foi pedida (`release_appointment_quota`).
- O `check-subscription` atualiza o plano, mas **não regrava** o uso do mês numa linha existente: ele muda só pelo início do SOS, pelo agendamento e pelas devoluções. A virada do mês só zera o uso se ninguém usou no mês novo enquanto a checagem rodava.
- O cliente do Stripe é ligado ao `user_id`, não ao e-mail; trocar o e-mail não perde a assinatura. Pelo e-mail, só vale um cliente antigo sem `user_id` que nenhuma outra conta usa: quem se cadastra com o e-mail antigo de outra pessoa não herda a assinatura dela (vale também no webhook e no `check-subscription`).
- Dois toques seguidos em "Assinar" abrem o mesmo checkout (chave de idempotência por pessoa, plano e minuto).
- Excluir a conta cancela a assinatura no Stripe **antes** de apagar os dados (ficha 18).

## Onde está no código

- **Telas e contexto**: `src/pages/SubscriptionPlans.tsx`, `SubscriptionSuccess.tsx`, `SubscriptionCancel.tsx`, `src/components/SubscriptionUpgradeModal.tsx`, `src/contexts/SubscriptionContext.tsx`.
- **Dados dos planos**: `src/lib/plans.ts` (textos e preços); `supabase/functions/_shared/billing.ts` (regras, com testes); `_shared/stripe.ts`.
- **Edge functions**: `create-checkout`, `check-subscription`, `manage-subscription`, `cancel-subscription`, `customer-portal`, `stripe-webhook`.
- **Banco**: `subscribers`, `security_audit_log` (reembolso por arrependimento). Funções: `can_use_sos`, `refresh_subscriber_entitlement`.

## Como validar

Use o **modo de teste do Stripe** (cartão `4242 4242 4242 4242`, qualquer data futura e CVC).

### Teste manual
1. Paciente sem plano → Planos → assinar Plus → pagar → a tela de sucesso confirma → o Perfil mostra Plus.
2. Trocar para Premium → aparece a prévia do valor proporcional → confirmar → Premium na hora.
3. Trocar de volta para Plus → aviso "vale na renovação" → o Perfil mostra a troca agendada.
4. Cancelar (depois de 7 dias) → "Seu plano vai até dd/mm" → "Manter minha assinatura" desfaz.
5. Cancelar em até 7 dias → acaba na hora e o reembolso aparece no Stripe.
6. Cartão `4000 0000 0000 0341` (recusa na renovação) → aviso para atualizar o cartão.

### Testes automáticos
`billing`, `subscriptionPlans`, `subscriptionSuccess`.

### Conferência no banco
```sql
select subscribed, subscription_tier, subscription_end, entitlement_source, organization_id,
       sos_used_this_month, appointments_used_this_month, stripe_customer_id
from subscribers where user_id = '<id>';
```
No Stripe: Developers → Webhooks → o endpoint `.../functions/v1/stripe-webhook` deve mostrar entregas recentes com sucesso.

## Pendências

- **Confirmar o webhook do Stripe**: endpoint cadastrado no painel do Stripe e `STRIPE_WEBHOOK_SECRET` nos secrets. Sem ele, cancelamentos e trocas feitos fora do app só aparecem quando o paciente abre o app.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Pagou e o plano não aparece | Webhook não chegou e o `check-subscription` ainda não rodou | Entregas do webhook no Stripe; abrir o app de novo |
| "Já existe uma assinatura" | Já assina; a troca é por "Trocar plano" | Assinaturas do cliente no Stripe |
| Paciente com duas assinaturas | Caso antigo (antes de 2026-10-02) | Aviso no app; cancelar uma no Stripe |
| Plano da empresa sumiu após cancelar o Stripe | Não deveria: vale o maior | `entitlement_source`, `organization_members` (ficha 10) |
