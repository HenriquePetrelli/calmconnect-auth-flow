# Registro das operações de tratamento de dados (LGPD art. 37)

> Documento interno, montado a partir do código em 24/09/2026. Descreve o que o Soliv **de fato** coleta, onde guarda, por quanto tempo e com quem compartilha. Precisa ser revisado por quem responde juridicamente pelo app antes de servir de base para a política de privacidade. Itens marcados com **[DECIDIR]** não têm resposta no código.

## Controlador e encarregado

- Controlador: **[DECIDIR]** razão social, CNPJ, endereço.
- Encarregado (DPO) e canal do titular: **[DECIDIR]** nome e e-mail.

## Titulares

Pacientes, psicólogos, administradores.

## Dados sensíveis (art. 11)

Quase tudo o que o paciente registra é **dado pessoal sensível referente à saúde**: sintomas, humor, diário, plano de segurança, depoimentos em grupos, histórico de SOS e consultas, avaliações de atendimento. Base legal proposta: **consentimento específico e destacado** (art. 11, I) para o uso do app, e **tutela da saúde, em procedimento realizado por profissionais de saúde** (art. 11, II, "f") para o atendimento psicológico (SOS e consultas). **[DECIDIR]** com o jurídico — o cadastro hoje não tem um passo de consentimento destacado.

## Inventário

| Dado | Onde (tabela / bucket) | Titular | Finalidade | Retenção hoje |
|---|---|---|---|---|
| Nome, e-mail, senha (hash) | `auth.users`, `profiles` | todos | conta e login | até excluir a conta |
| Cidade, estado, sintomas selecionados, humor | `patients`, `patient_mood_logs` | paciente | personalizar o app; contexto para o psicólogo no SOS | até excluir a conta |
| Diário privado | `private_journals` | paciente | registro pessoal (só o paciente lê) | até excluir a conta |
| Plano de segurança e contatos de emergência (dados de **terceiros**) | `safety_plans`, `emergency_contacts` | paciente (+ contatos) | atendimento em crise; o psicólogo do SOS ativo lê, com registro em log | até excluir a conta |
| Metas, conquistas, estatísticas | `patient_weekly_goals`, `patient_achievements`, `patient_statistics` | paciente | engajamento | atividades: 3 meses (`cleanup_quarterly_activities`); o resto até excluir a conta |
| Depoimentos, curtidas e denúncias em grupos | `group_testimonials`, `group_testimonial_likes`, `group_testimonial_reports` | paciente | comunidade de apoio; moderação | até excluir a conta ou o admin remover |
| Pedidos de SOS e sessões de vídeo (metadados, sem gravação) | `emergency_requests`, `webrtc_sessions`, `participant_presence`, `sos_trace_events` | paciente, psicólogo | atendimento de emergência; diagnóstico de falhas | **[DECIDIR]** — hoje indefinida |
| Avaliação do atendimento e notas clínicas do psicólogo | `session_feedback` | paciente, psicólogo | qualidade; registro do psicólogo | **[DECIDIR]** — Resolução CFP 01/2009 pede guarda de documentos por 5 anos |
| Consultas agendadas e resumo da sessão | `appointments` | paciente, psicólogo | agendamento; registro do psicólogo | **[DECIDIR]** (mesma questão dos 5 anos) |
| Chat paciente–psicólogo | `conversas`, `mensagens` | ambos | comunicação | arquivada após 1 mês, apagada após 3 meses (`gerenciar_expiracao_conversas`) |
| Assinatura, uso de cota | `subscribers` (+ Stripe) | paciente | cobrança e limites do plano | até excluir a conta; Stripe guarda o próprio histórico fiscal |
| CPF, CRP, documentos de identidade | `psychologists`, `psychologist_registrations`, bucket `psychologist-documents` (privado) | psicólogo | verificação profissional | reprovados: apagados após 3 dias (`psychologist-cleanup`); aprovados: até excluir a conta |
| Chave PIX, repasses, comprovantes | `psychologist_payments`, `payment_logs`, bucket `payment-receipts` (privado) | psicólogo | pagamento do psicólogo | **[DECIDIR]** — obrigação fiscal (5 anos) |
| Tokens de push | `fcm_tokens` | todos | notificações | desativado no logout; apagado ao excluir a conta |
| Logs de segurança e auditoria | `security_audit_log`, `admin_audit_log`, `rate_limits` | todos | segurança, prestação de contas | **[DECIDIR]** — hoje indefinida |

## Compartilhamento (operadores)

| Operador | O quê | Por quê |
|---|---|---|
| Supabase | todo o banco, arquivos e autenticação | hospedagem da infraestrutura |
| Stripe | e-mail, dados de pagamento (o cartão fica só no Stripe) | cobrança da assinatura |
| Resend | e-mail e conteúdo de avisos (consultas, suporte) | envio de e-mails |
| Google Firebase Cloud Messaging | token do aparelho, título/texto da notificação | push |
| Google e Twilio (STUN) | endereço IP durante a chamada | estabelecer a conexão de vídeo; o áudio/vídeo vai direto entre os participantes e **não é gravado** |
| Lovable | código e build do app | hospedagem do front-end **[CONFIRMAR]** |

Transferência internacional (art. 33): todos os operadores acima processam dados fora do Brasil **[CONFIRMAR regiões e cláusulas contratuais]**.

## Direitos do titular (art. 18)

| Direito | Como é atendido hoje |
|---|---|
| Confirmação e acesso | pelo próprio app e pela exportação completa ("Baixar meus dados") |
| Correção | telas de perfil e conta |
| Eliminação | **paciente: "Excluir conta" em Alterar dados da conta** (edge function `delete-own-account`); psicólogo: via suporte |
| Portabilidade | paciente: "Baixar meus dados" (JSON com todas as tabelas dele) em Alterar dados da conta |
| Revogação do consentimento | equivale hoje à exclusão da conta |

## Segurança (art. 46)

RLS em todas as tabelas com dado pessoal; buckets de documentos e comprovantes privados com URL assinada; acesso do psicólogo ao plano de segurança limitado ao SOS ativo e auditado; admins nunca leem diário nem plano de segurança; logs verbosos desligados em produção.
