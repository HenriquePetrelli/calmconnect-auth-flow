# 14. Plano de segurança e contatos de emergência

> **Status:** Pronto.
> **Última verificação:** 2026-10-04 (plano e contatos abertos dentro da fila do SOS, sem sair dela).
> **Quem usa:** paciente (cria e consulta) e psicólogo durante um SOS que ele aceitou.

## Resumo

Plano baseado no modelo Stanley & Brown, citado pela Resolução CFP 09/2024, com cinco partes:

- sinais de alerta;
- o que fazer sozinho;
- distrações;
- ambiente seguro;
- razões para seguir.

Inclui contatos de confiança com botão de ligar. O paciente pode ter **vários planos**. O psicólogo do SOS consegue ler o plano **só durante o atendimento**, e cada leitura fica registrada.

## Telas

| Rota | Tela |
|---|---|
| `/safety-plan` | Lista de planos (título, editar, excluir com confirmação, "Cadastrar novo plano") |
| `/safety-plan/:planId` | Editar: uma parte aberta por vez, sugestões clicáveis, texto livre, contatos |
| `/safety-plan/:planId/ver` | Ler: razões em destaque, partes numeradas, contatos com "Ligar" |
| `/sos` | Botão "Meu plano": abre o plano dentro da fila, sem cancelar o pedido |
| `/home` | Card "Plano de Segurança" em "Seus recursos" |

## Como funciona

1. O paciente cria um plano e preenche as partes no ritmo dele. Salva com `save_safety_plan`.
2. Contatos (nome, relação, telefone, principal) ficam ligados ao plano e viram links `tel:`.
3. **Na crise** (fila do SOS): "Meu plano" mostra contatos, razões para seguir, o que fazer sozinho e distrações, sem sair da fila.
4. **Psicólogo no SOS**: no painel de contexto do paciente, a seção "Plano de segurança" vem fechada e só carrega ao abrir (`get_sos_safety_plan`). Só funciona para o psicólogo que **aceitou** aquele SOS e enquanto ele está em andamento. Cada leitura grava `sos_safety_plan_viewed` em `security_audit_log`.
5. CVV 188 e SAMU 192 ficam no rodapé das telas do plano.

## Regras

- O admin **nunca** lê o plano.
- O psicólogo não lê fora de um SOS ativo que ele aceitou, nem depois que o SOS termina.
- O plano entra no "Baixar meus dados" e sai na exclusão da conta (ficha 18).

## Onde está no código

- **Telas**: `src/pages/SafetyPlans.tsx`, `SafetyPlanEditor.tsx`, `SafetyPlanView.tsx`.
- **Componentes**: `src/components/sos/SafetyPlanSection.tsx`, `SosSafetyPlanDialog.tsx`, `PatientContextPanel.tsx`.
- **Regras e hooks**: `src/lib/safetyPlan.ts`, `useSafetyPlan`, `useSafetyPlans`.
- **Banco**: `safety_plans`, `emergency_contacts`, `security_audit_log`. Funções: `save_safety_plan`, `get_sos_safety_plan`.
- **Teste SQL**: `supabase/tests/safety_plan_rls.sql` (13 verificações: dono lê e edita; outro paciente, psicólogo sem SOS e SOS encerrado não leem; leitura válida fica auditada).

## Como validar

### Teste manual
1. Criar um plano com 2 razões e 1 contato → salvar → abrir em "ver" → o botão "Ligar" abre o discador.
2. Criar um segundo plano → aparecem os dois na lista.
3. No SOS, antes do aceite, abrir "Meu plano" → mostra o plano e o pedido continua na fila.
4. Psicólogo aceita o SOS → painel do paciente → abrir "Plano de segurança" → vê o plano.
5. Depois do SOS encerrado, o psicólogo não consegue mais abrir.

### Testes automáticos
`safetyPlan`, `safetyPlanPage`; teste SQL `supabase/tests/safety_plan_rls.sql` (só em Postgres local).

### Conferência no banco
```sql
select id, title, updated_at from safety_plans where patient_id = '<id>';

-- Quem leu o plano durante SOS
select created_at, user_id, record_id from security_audit_log
where action = 'sos_safety_plan_viewed' order by created_at desc limit 20;
```

## Pendências

- **Sugestão de produto** (pendência 8): plano pós-crise que o psicólogo deixa com o paciente ao fim do SOS.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Psicólogo vê "sem plano" | O paciente não criou plano, ou o SOS não está ativo e aceito por ele | `safety_plans`; status do SOS |
| Itens marcados somem ao adicionar contato | Corrigido em 2026-09-28 | Versão publicada |
