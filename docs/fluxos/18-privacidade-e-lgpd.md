# 18. Privacidade e LGPD: termos, aceite, exportar e excluir dados

> **Status:** Pronto. Os documentos jurídicos estão em versão para revisão.
> **Última verificação:** 2026-09-28. Hábitos e questionários entraram na exportação e na exclusão em 2026-10-03.
> **Quem usa:** todos. Exportar e excluir conta são do paciente.

## Resumo

- **Aceite**: no cadastro, a pessoa confirma ter 18 anos ou mais, aceita Termos e Política e, se for paciente, dá o consentimento destacado para dados de saúde. Tudo fica gravado com versão e data.
- **Novo aceite**: quando a versão de um documento muda, o app pede o aceite de novo.
- **Portabilidade**: "Baixar meus dados" gera um arquivo JSON com tudo do paciente.
- **Exclusão**: "Excluir conta" apaga os dados do paciente, cancela a assinatura e arquiva os registros de atendimento que a lei obriga a guardar.

Mapa completo do que é guardado: `docs/lgpd/registro-de-tratamento.md`. Regras e decisões: `docs/lgpd/LEIA-ME.md`.

## Telas

| Rota | Tela |
|---|---|
| `/termos`, `/termos-psicologo`, `/privacidade` | Documentos públicos (gerados a partir de `docs/lgpd`) |
| Qualquer tela logada | `LegalAcceptanceGate`: pede novo aceite quando a versão muda |
| `/account-settings` | "Baixar meus dados" e "Excluir conta" (paciente) |

## Como funciona

### Exportar ("Baixar meus dados")
O app busca, **com a sessão do próprio paciente**, os dados dele. A RLS garante que só sai o que é dele. Entra no arquivo:

- perfil, humor, diário;
- plano de segurança e contatos;
- metas, conquistas, hábitos, questionários;
- depoimentos, consultas, SOS, avaliações, notificações;
- assinatura e preferências.

### Excluir conta
1. Pede a **senha atual** e a palavra **EXCLUIR**. Uma sessão aberta sozinha não basta.
2. A edge function `delete-own-account`:
   - recusa psicólogo e admin (vão pelo suporte, por causa de repasses e guarda legal);
   - recusa se houver SOS em andamento;
   - **cancela a assinatura no Stripe primeiro**; se falhar, não apaga nada;
   - arquiva os registros de atendimento (SOS, consultas, avaliações, anotações clínicas) em `care_record_archive`, sem ligação com o login;
   - apaga os dados em todas as tabelas, os arquivos e o login;
   - registra `account_self_deleted`, sem dados pessoais.
3. A rotina diária `purge-expired-care-records` apaga do arquivo o que passou de **5 anos**.

### Direito de arrependimento
Cancelamento em até 7 dias da primeira assinatura devolve o valor automaticamente (ficha 08).

## Onde está no código

- **Telas e componentes**: `src/pages/LegalDocument.tsx`, `AccountSettings.tsx`, `src/components/legal/` (`LegalAcceptanceGate`, `LegalMarkdown`), `src/components/DeleteAccountCard.tsx`.
- **Regras**: `src/lib/legal.ts` (versões), `legalGateStatus.ts`, `exportMyData.ts`.
- **Edge function**: `delete-own-account`.
- **Banco**: `legal_acceptances`, `care_record_archive`, `security_audit_log`. Funções: `archive_patient_care_records`, `purge_expired_care_records`.
- **Documentos**: `docs/lgpd/` (política, termos do paciente e do psicólogo, registro de tratamento, LEIA-ME).
- **Teste SQL**: `supabase/tests/care_records_retention.sql`.

## Como validar

### Teste manual
1. Abrir `/termos` e `/privacidade` sem login → abrem.
2. Paciente de teste → "Baixar meus dados" → o arquivo JSON tem humor, diário, hábitos etc. e nenhum dado de outra pessoa.
3. Paciente de teste com assinatura de teste → "Excluir conta" com senha errada → recusa. Com a senha certa e EXCLUIR → sai; no Stripe, a assinatura aparece cancelada; não consegue mais entrar.
4. Psicólogo tenta excluir a conta → orientado a falar com o suporte.

### Testes automáticos
`exportMyData`, `deleteAccountCard`, `legal`; teste SQL `supabase/tests/care_records_retention.sql` (só em Postgres local).

### Conferência no banco
```sql
-- Aceites de uma pessoa
select document, version, accepted_at from legal_acceptances where user_id = '<id>';

-- Arquivo de registros de atendimento (só equipe autorizada)
select record_type, occurred_at, retain_until from care_record_archive order by archived_at desc limit 20;
```

## Pendências

- **Documentos jurídicos em versão para revisão**: política, termos e itens **[DECIDIR]** no registro de tratamento precisam de revisão de um advogado antes do lançamento.

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Pedido de aceite aparece toda hora | Versão mudou, ou o aceite não está sendo gravado | `legal_acceptances` da pessoa |
| "Não foi possível excluir" | Falha ao cancelar no Stripe (proteção: nada é apagado) | Logs de `delete-own-account`; assinatura no Stripe |
