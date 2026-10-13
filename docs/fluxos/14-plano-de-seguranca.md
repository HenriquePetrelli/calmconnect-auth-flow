# 14. Plano de segurança e contatos de emergência

> **Status:** Pronto.
> **Última verificação:** 2026-11-01 (plano pós-crise: o psicólogo recomenda um plano no SOS ou na consulta). Antes: 2026-10-14 (varredura de funcionamento: abre sem internet, rascunho do editor, salvar sem duplicar, conflito entre aparelhos). Antes: 2026-10-04 (plano aberto dentro da fila do SOS).
> **Quem usa:** paciente (cria e consulta), psicólogo durante um SOS que ele aceitou e psicólogo que deixa um plano pós-crise (SOS ou consulta).

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
| `/safety-plan` | Lista de planos (título, selo "Recomendado por…", editar, excluir com confirmação, "Cadastrar novo plano") e a seção "Recomendados para você" |
| Chamada (psicólogo) | Botão "Plano pós-crise" (escudo) ao lado de "Contexto do paciente"; também em "Encerrar" e no desfecho do SOS |
| Histórico do psicólogo | Detalhe do atendimento mostra o plano que ele recomendou |
| `/safety-plan/:planId` | Editar: uma parte aberta por vez, sugestões clicáveis, texto livre, contatos |
| `/safety-plan/:planId/ver` | Ler: razões em destaque, partes numeradas, contatos com "Ligar" |
| `/sos` | Botão "Meu plano": abre o plano dentro da fila, sem cancelar o pedido |
| `/home` | Card "Plano de Segurança" em "Seus recursos" |

## Como funciona

1. O paciente cria um plano e preenche as partes no ritmo dele. Salva com `save_safety_plan`.
   - **Rascunho no aparelho**: o que foi escrito e ainda não salvo fica guardado; sair da tela, recarregar ou fechar e voltar recupera tudo ("Recuperamos o que você não tinha salvado"). Fechar a aba com alteração não salva faz o navegador perguntar.
   - **Plano novo sem duplicar**: o plano novo leva um id gerado no aparelho, o mesmo em todas as tentativas. Se a resposta do servidor se perder e a pessoa tocar "Salvar" de novo, o banco só atualiza.
   - **Dois aparelhos**: o banco recusa salvar por cima de uma versão mais nova ("O plano mudou em outro aparelho"), em vez de apagar sem aviso o que o outro salvou.
   - Itens de até 200 caracteres; itens vazios ou repetidos na mesma parte saem.
2. Contatos (nome, relação, telefone, principal) ficam ligados ao plano e viram links `tel:`.
3. **Na crise** (fila do SOS): "Meu plano" mostra contatos, razões para seguir, o que fazer sozinho e distrações, sem sair da fila.
3a. **Sem internet**: a lista, a leitura e o "Meu plano" do SOS mostram a última versão aberta, guardada no aparelho, com o aviso "Sem internet: mostrando a última versão salva neste aparelho". Os botões de ligar funcionam. Sem cópia no aparelho, o SOS diz "Sem internet para abrir o seu plano agora" e oferece o CVV (antes dizia "você ainda não tem um plano"). A cópia sai do aparelho ao sair da conta.
4. **Psicólogo no SOS**: no painel de contexto do paciente, a seção "Plano de segurança" vem fechada e só carrega ao abrir (`get_sos_safety_plan`). Só funciona para o psicólogo que **aceitou** aquele SOS e enquanto ele está em andamento. Cada leitura grava `sos_safety_plan_viewed` em `security_audit_log`.
5. CVV 188 e SAMU 192 ficam no rodapé das telas do plano.
6. **Plano pós-crise** (psicólogo → paciente):
   - Na chamada (SOS ou consulta), só o psicólogo vê o botão "Plano pós-crise". Abre o mesmo formulário do paciente (título e as cinco partes, sem contatos). Salva com `save_post_crisis_plan`; dá para fechar, voltar e alterar durante a chamada.
   - O plano fica como rascunho (`safety_plan_suggestions.status = 'draft'`) e o paciente não vê. Quando o atendimento termina (SOS concluído ou cancelado; consulta concluída, cancelada ou falta), vira `pending` e o paciente recebe o aviso "Seu psicólogo deixou um plano para você". O push é discreto: "Você tem uma novidade no app. Toque para abrir."
   - Rede de segurança: a rotina `deliver-post-crisis-plans` (a cada 10 min) entrega rascunhos de atendimentos que não fecharam o status.
   - O psicólogo pode deixar ou alterar o plano até 2 horas depois do fim (pelo fluxo de encerrar ou pelo histórico). Salvo depois do fim, vai direto para o paciente.
   - Em Planos de segurança, o paciente vê "Recomendados para você" com o selo "Recomendado por [nome]": **Salvar nos meus planos**, **Editar antes de salvar** ou **Agora não**. Com 10 planos, escolhe um para substituir.
   - Salvo, vira um plano comum do paciente (abre sem internet, pode editar e adicionar contatos), com o selo mantido e "editado por você" se ele mudar algo.
   - O psicólogo vê o que recomendou no histórico do atendimento, mas não se o paciente salvou, ignorou ou editou.

## Regras

- O admin **nunca** lê o plano.
- Plano pós-crise: só o psicólogo que atendeu, durante o atendimento ou até 2 h depois; pelo menos 1 item; depois que o paciente decide, não muda mais. O paciente não pode forjar o selo "Recomendado por" (o banco ignora esses campos vindos do app).
- O psicólogo não lê fora de um SOS ativo que ele aceitou, nem depois que o SOS termina.
- O plano e as recomendações recebidas entram no "Baixar meus dados" e saem na exclusão da conta (ficha 18).
- A cópia guardada no aparelho (para abrir sem internet) e os rascunhos são apagados ao sair da conta.

## Onde está no código

- **Telas**: `src/pages/SafetyPlans.tsx`, `SafetyPlanEditor.tsx`, `SafetyPlanView.tsx`.
- **Componentes**: `src/components/sos/SafetyPlanSection.tsx`, `SosSafetyPlanDialog.tsx`, `PatientContextPanel.tsx`.
- **Regras e hooks**: `src/lib/safetyPlan.ts`, `useSafetyPlan`, `useSafetyPlans`.
- **Banco**: `safety_plans`, `emergency_contacts`, `security_audit_log`. Funções: `save_safety_plan` (com `p_new_id` e `p_expected_updated_at`), `get_sos_safety_plan`, `clean_safety_plan_items`.
- **Aviso sem internet**: `src/components/safety/OfflinePlanNotice.tsx`.
- **Plano pós-crise**: `src/lib/postCrisisPlan.ts`, `src/components/calls/PostCrisisPlanDialog.tsx`, `src/components/safety/RecommendedPlans.tsx`, `RecommendedBadge.tsx`, `SafetyPlanListsForm.tsx`, `SafetyPlanSectionEditor.tsx`, `src/components/psychologist/PostCrisisPlanSummary.tsx`. Banco: `safety_plan_suggestions`, `save_post_crisis_plan`, `get_post_crisis_plan`, `accept_safety_plan_suggestion`, `dismiss_safety_plan_suggestion`, `deliver_post_crisis_plan`, `deliver_stale_post_crisis_plans`; colunas `recommended_by`, `source_suggestion_id`, `patient_edited_at` em `safety_plans`.
- **Teste SQL**: `supabase/tests/safety_plan_rls.sql` (13 verificações: dono lê e edita; outro paciente, psicólogo sem SOS e SOS encerrado não leem; leitura válida fica auditada).

## Como validar

### Teste manual
1. Criar um plano com 2 razões e 1 contato → salvar → abrir em "ver" → o botão "Ligar" abre o discador.
2. Criar um segundo plano → aparecem os dois na lista.
3. No SOS, antes do aceite, abrir "Meu plano" → mostra o plano e o pedido continua na fila.
4. Psicólogo aceita o SOS → painel do paciente → abrir "Plano de segurança" → vê o plano.
5. Depois do SOS encerrado, o psicólogo não consegue mais abrir.
6. Abrir um plano, desligar a internet, abrir de novo → mostra o plano com "Sem internet"; "Ligar" funciona.
7. Escrever no editor, sair sem salvar e voltar → o que foi escrito volta.
8. Abrir o mesmo plano em dois aparelhos, salvar num e depois no outro → o segundo avisa "O plano mudou em outro aparelho" e nada é apagado.
9. Psicólogo, na chamada: "Plano pós-crise" → preencher 2 itens → salvar. O paciente ainda não vê nada.
10. Encerrar o atendimento → o paciente recebe "Seu psicólogo deixou um plano para você" → Planos de segurança mostra "Recomendados para você" com o selo.
11. "Editar antes de salvar" → mudar o título → salvar → o plano aparece na lista com "Recomendado por…" e "editado por você".
12. Outra recomendação → "Agora não" → some da tela. Com 10 planos, "Salvar" pede qual substituir.

### Testes automáticos
`safetyPlan`, `safetyPlanPage`, `postCrisisPlan` (recomendação: salvar, editar, agora não, limite, selo, rascunho escondido, formulário do psicólogo), `safetyPlanReliability` (sem internet, rascunho, mesmo id ao tentar de novo, conflito); teste SQL `supabase/tests/safety_plan_rls.sql` (só em Postgres local).

### Conferência no banco
```sql
select id, title, updated_at from safety_plans where patient_id = '<id>';

-- Planos pós-crise
select source_type, status, psychologist_name, delivered_at, decided_at from safety_plan_suggestions
where patient_id = '<id>' order by created_at desc;

-- Quem leu o plano durante SOS
select created_at, user_id, record_id from security_audit_log
where action = 'sos_safety_plan_viewed' order by created_at desc limit 20;
```

## Pendências

- Nenhuma. O plano pós-crise (pendência 10) foi feito em 2026-11-01.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Psicólogo vê "sem plano" | O paciente não criou plano, ou o SOS não está ativo e aceito por ele | `safety_plans`; status do SOS |
| Itens marcados somem ao adicionar contato | Corrigido em 2026-09-28 | Versão publicada |
| "O plano mudou em outro aparelho" | Outro aparelho salvou depois que esta tela abriu | Abrir o plano de novo e refazer a alteração |
| "Sem internet" com plano antigo | Cópia do aparelho é a última aberta online | Abrir com internet para atualizar a cópia |
