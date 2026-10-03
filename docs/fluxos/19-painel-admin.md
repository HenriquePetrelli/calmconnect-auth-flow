# 19. Painel do admin

> **Status:** Pronto, com pendência crítica (senha do admin exposta numa migração antiga).
> **Última verificação:** 2026-10-02 (painel redesenhado). As proteções do banco foram reforçadas em 2026-10-04.
> **Quem usa:** admin (conta criada à mão; ver `docs/creating-an-admin-account.md`).

## Resumo

Painel único em `/admin-dashboard`, com a seção na URL (`?secao=...`), para recarregar e voltar sem perder o lugar. No computador, o menu fica na lateral; no celular, numa gaveta.

| Grupo | Seção | O que faz |
|---|---|---|
| Geral | Visão geral | Números do app; cada cartão leva à seção |
| Pessoas | Psicólogos | Aprovar ou recusar cadastros (com documento), editar, bloquear, excluir |
| Pessoas | Pacientes | Editar, bloquear por período, excluir (cancela a assinatura) |
| Pessoas | Empresas | B2B (ficha 10) |
| Atendimento | SOS | Métricas: aceite, resolução, avaliação média, total |
| Atendimento | Chat | Métricas e metadados das conversas; arquivar (sem ver o conteúdo) |
| Moderação | Grupos de apoio | Depoimentos, curtidas e denúncias; editar e excluir |
| Moderação | Auditoria | Histórico das ações dos admins |
| Financeiro | Repasses | Sincronizar e confirmar pagamentos (ficha 09) |
| Conta | Meu perfil | Dados e senha do admin |

## Como funciona

- **Aprovação de psicólogo**:
  1. o admin recebe notificação de cadastro novo;
  2. abre o documento por link temporário assinado;
  3. aprova ou recusa com motivo (`psychologist-management`);
  4. o psicólogo recebe e-mail;
  5. cadastros recusados são apagados depois de alguns dias pela rotina `psychologist-cleanup-daily`.
- **Bloquear, editar e excluir** usam edge functions próprias (`admin-block-*`, `admin-update-*`, `admin-delete-*`). Cada uma confere se quem chama é admin e grava em `admin_audit_log`: quem, quando, em quem e detalhes.
- **Privacidade**: o admin nunca vê o conteúdo do chat, o diário, os hábitos ou o plano de segurança.

## Regras

- Admin é quem tem linha ativa em `admin_users` (`is_super_admin`). Não depende de dados que o usuário edita.
- `admin_audit_log` só é gravado pelas edge functions (service role) e só lido por admin. Ninguém edita ou apaga pelo app.

## Onde está no código

- **Tela e navegação**: `src/pages/AdminDashboard.tsx`, `src/components/admin/` (`AdminNav`, `adminNavConfig`, `PatientsPanel`, `OrganizationsPanel`, `ChatModerationPanel`, `GroupTestimonialModerationPanel`, `AuditLogPanel`, `BlockPatientModal`, `EditPatientModal`), `src/components/psychologist/PsychologistApprovalPanel.tsx`, `src/components/payments/PaymentsPanel.tsx`.
- **Hooks**: `usePsychologistManagement`, `usePatientManagement`, `useChatModeration`, `useGroupTestimonialModeration`, `useAdminAuditLog`.
- **Edge functions**: `psychologist-management`, `admin-psychologist-management`, `admin-block-patient`, `admin-block-psychologist`, `admin-update-patient`, `admin-update-psychologist`, `admin-delete-patient`, `admin-delete-psychologist`, `payment-sync`, `confirm-payment`.
- **Banco**: `admin_users`, `admin_audit_log`. Funções: `get_admin_metrics`, `get_sos_metrics`, `get_chat_usage_metrics`, `get_admin_conversas_overview`, `get_admin_group_testimonials`, `get_admin_audit_log`.

## Como validar

### Teste manual
1. Entrar como admin → vai direto para o painel, sem erro de perfil.
2. Visão geral → os números carregam; tocar em "Psicólogos pendentes" leva à seção.
3. Aprovar um psicólogo de teste → ele consegue entrar → aparece em Auditoria.
4. Bloquear um paciente por 1 dia → ele vê o aviso ao entrar → Auditoria registra o motivo e a duração.
5. Chat → vê números e participantes, sem nenhum texto de mensagem.
6. Recarregar a página numa seção → continua na mesma seção.

### Testes automáticos
`adminNav`, `chatModerationPanel.render`, `useGroupTestimonialModeration`, `confirmPayoutDialog`.

### Conferência no banco
```sql
select user_id, is_active from admin_users;
select created_at, action, target_type, target_name from admin_audit_log order by created_at desc limit 20;
```

## Pendências

- **Crítica — senha do admin exposta** (pendência 1): uma migração antiga contém a senha. Troque a senha, ative a verificação em duas etapas e, se quiser, limpe o histórico do Git.
- **Verificação em duas etapas** para admin no painel do Supabase (pendência 5).

## Problemas comuns

| Sintoma | Causa provável | O que olhar |
|---|---|---|
| Admin cai na Home de paciente | Sem linha ativa em `admin_users` | SQL acima |
| Documento do psicólogo não abre | Link assinado vencido | Reabrir o detalhe |
| Ação falha com "Admin access required" | Sessão expirada ou conta sem admin | Sair e entrar de novo |
